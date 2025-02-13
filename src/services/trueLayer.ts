import { TRUELAYER } from '../constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { EncryptionService } from './encryption';
import type { Transaction } from '../types';

interface TrueLayerConfig {
  clientId: string;
  redirectUri: string;
  enableMock?: boolean;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export class TrueLayerService {
  private baseUrl: string;
  private loginUrl: string;
  private clientId: string;
  private redirectUri: string;
  private encryption: EncryptionService;
  private categoriesLogged = false;

  constructor(config: TrueLayerConfig) {
    this.clientId = config.clientId;
    this.redirectUri = Platform.select({
      ios: 'spendingtracker://auth/callback', // Matches TrueLayer dashboard
      android: 'spendingtracker://auth/callback', // Matches TrueLayer dashboard
      default: 'http://localhost:19006/auth/callback', // Matches TrueLayer dashboard
    });

    // Log the actual redirect URI being used
    console.log('TrueLayer redirect URI:', this.redirectUri);

    this.baseUrl = __DEV__ ? 'https://auth.truelayer-sandbox.com' : 'https://auth.truelayer.com';
    this.loginUrl = __DEV__
      ? 'https://login-api.truelayer-sandbox.com'
      : 'https://login-api.truelayer.com';
    this.encryption = new EncryptionService();
    console.log('TrueLayer Service Initialized:', {
      baseUrl: this.baseUrl,
      loginUrl: this.loginUrl,
      isDev: __DEV__,
      redirectUri: this.redirectUri,
      configProvided: {
        clientId: config.clientId ? 'provided' : 'missing',
        redirectUri: config.redirectUri,
      },
    });
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri, // This should match exactly
      scope: 'info accounts balance cards transactions',
      providers: 'mock',
      enable_mock: 'true',
      disable_providers: 'true',
      enable_oauth_providers: 'false',
      enable_open_banking_providers: 'false',
      enable_credentials_sharing_providers: 'false',
      test_provider: 'mock',
      debug: 'true',
    });

    const authUrl = `${this.baseUrl}/?${params.toString()}`;
    console.log('Final Auth URL:', authUrl);
    return authUrl;
  }

  async exchangeCode(code: string): Promise<any> {
    try {
      console.log('🔄 Starting token exchange with code:', code.substring(0, 4) + '...');

      const timestamp = Date.now();
      console.log('⏱️ Token exchange timing:', {
        timestamp,
        timeLimit: '5 minutes',
      });

      // Log exact values for debugging
      console.log('🔑 Auth Configuration:', {
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        baseUrl: this.baseUrl,
        isDev: __DEV__,
      });

      // Make token exchange request directly to TrueLayer
      const tokenUrl = `${this.baseUrl}/connect/token`;
      const requestBody = {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: TRUELAYER.CLIENT_SECRET,
        code,
        redirect_uri: this.redirectUri,
      };

      console.log('📤 TrueLayer request:', {
        url: tokenUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          'X-Debug': 'true',
          'X-TL-Environment': 'sandbox',
        },
        body: {
          ...requestBody,
          client_secret: '[REDACTED]',
          code: code.substring(0, 10) + '...',
        },
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          'X-Debug': 'true',
          'X-TL-Environment': 'sandbox',
        },
        body: new URLSearchParams(requestBody).toString(),
      });

      const responseText = await response.text();
      console.log('📥 Raw TrueLayer response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      });

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Failed to parse response:', error);
        throw new Error(`Invalid response format: ${responseText}`);
      }

      if (!response.ok) {
        console.error('❌ Token exchange failed:', {
          status: response.status,
          error: data.error,
          description: data.error_description,
          request: {
            redirect_uri: this.redirectUri,
            client_id: this.clientId.substring(0, 10) + '...',
          },
        });
        throw new Error(data.error_description || data.error || 'Token exchange failed');
      }

      // Store tokens in database
      const connectionId = await this.storeTokens(data);
      console.log('✅ Connection established with ID:', connectionId);

      return data;
    } catch (error) {
      console.error('💥 Token exchange error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Update getStoredToken method
  async getStoredToken(): Promise<string | null> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('No authenticated user found');
    }

    // Get the most recent active bank connection
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'truelayer')
      .eq('status', 'active')
      .is('disconnected_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to fetch bank connection:', error);
      return null;
    }

    if (!data || new Date(data.expires_at) < new Date()) {
      console.log('No valid token found or token expired');
      return null;
    }

    try {
      return this.encryption.decrypt(data.encrypted_access_token);
    } catch (error) {
      console.error('Failed to decrypt token:', error);
      return null;
    }
  }

  async refreshTokenIfNeeded(): Promise<string> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('No authenticated user found');
    }

    // Get active connection
    const { data, error } = await supabase
      .from('bank_connections')
      .select('encrypted_access_token, encrypted_refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'truelayer')
      .eq('status', 'active')
      .is('disconnected_at', null)
      .not('encrypted_access_token', 'is', null) // Only check access token
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.log('No active bank connection found');
      throw new Error('No active bank connection');
    }
    if (!data) throw new Error('No bank connection found');

    // Check if token is expired or about to expire (within 5 minutes)
    const expiryDate = new Date(data.expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiryDate.getTime() - now.getTime() > fiveMinutes) {
      return this.encryption.decrypt(data.encrypted_access_token);
    }

    // Token needs refresh
    const refreshToken = this.encryption.decrypt(data.encrypted_refresh_token);
    const { SUPABASE } = await import('../constants');

    const response = await fetch(`${SUPABASE.URL}/functions/v1/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE.ANON_KEY}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokenResponse = await response.json();

    // Update stored tokens
    const encryptedAccessToken = this.encryption.encrypt(tokenResponse.access_token);
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? this.encryption.encrypt(tokenResponse.refresh_token)
      : data.encrypted_refresh_token;

    const { error: updateError } = await supabase
      .from('bank_connections')
      .update({
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000),
      })
      .eq('provider', 'truelayer');

    if (updateError) throw updateError;

    return tokenResponse.access_token;
  }

  async fetchTransactions(fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No authenticated user found');

      // Check if user has any active bank connections
      const { data: connections, error: connectionsError } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .not('encrypted_access_token', 'is', null) // Only check for access token
        .order('created_at', { ascending: false })
        .limit(1);

      if (connectionsError) {
        console.error('Failed to check bank connections:', connectionsError);
        throw new Error('Failed to check bank connections');
      }

      if (!connections || connections.length === 0) {
        console.log('No active bank connections found');
        return [];
      }

      // Log the found connection for debugging
      console.log('Found active connection:', {
        id: connections[0].id,
        status: connections[0].status,
        has_access_token: !!connections[0].encrypted_access_token,
        created_at: connections[0].created_at,
      });

      // Get fresh data from API
      console.log('🔄 Fetching transactions from API...');
      const freshTransactions = await this.fetchTransactionsFromAPI(fromDate, toDate);

      // Get merchant categories (both system-wide and user-specific)
      const { data: categories } = await supabase
        .from('merchant_categories')
        .select('merchant_pattern, category')
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      // Transform and categorize transactions
      const transformedTransactions = freshTransactions.map((t) => {
        // Find matching category
        const searchText = `${t.description} ${t.merchant_name || ''}`.toUpperCase();
        const matchingCategory = categories?.find((cat) =>
          searchText.includes(cat.merchant_pattern.toUpperCase())
        );

        return {
          user_id: user.id,
          transaction_id: t.transaction_id,
          account_id: t.account_id || 'default',
          timestamp: new Date(t.timestamp).toISOString(),
          description: t.description,
          amount: t.amount,
          currency: t.currency,
          transaction_type: t.transaction_type,
          transaction_category: matchingCategory?.category || 'Uncategorized',
          merchant_name: t.description, // Use description as merchant_name
        } satisfies Transaction & { user_id: string };
      });

      // Store in database
      console.log('💾 Attempting to store transactions:', {
        count: transformedTransactions.length,
        sample: transformedTransactions[0],
      });

      const { error: insertError } = await supabase
        .from('transactions')
        .upsert(transformedTransactions, {
          onConflict: 'user_id,transaction_id',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('💥 Failed to store transactions:', {
          error: insertError,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });
        return freshTransactions;
      }

      console.log('✅ Successfully stored transactions:', {
        count: transformedTransactions.length,
      });

      return transformedTransactions;
    } catch (error) {
      console.error('💥 Failed to fetch transactions:', error);
      throw error;
    }
  }

  private async fetchTransactionsFromAPI(fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
    try {
      console.log('🔄 Getting valid token...');
      let accessToken: string;
      try {
        accessToken = await this.refreshTokenIfNeeded();
      } catch (error) {
        console.log('No active bank connection or token available');
        return [];
      }

      const { SUPABASE } = await import('../constants');

      console.log('🔄 Calling fetch-transactions function...');
      const response = await fetch(`${SUPABASE.URL}/functions/v1/fetch-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE.ANON_KEY}`,
        },
        body: JSON.stringify({
          access_token: accessToken,
          from_date: fromDate?.toISOString(),
          to_date: toDate?.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('💥 Fetch transactions failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to fetch transactions: ${errorText}`);
      }

      const { transactions } = await response.json();

      // Log raw transaction structure
      console.log('📝 Raw transaction from API:', {
        sample: transactions[0],
        keys: Object.keys(transactions[0]),
        description: transactions[0]?.description,
      });

      // Transform transactions to match our schema
      const transformedTransactions = transactions.map((t: any) => {
        const transformed: Transaction = {
          transaction_id: t.transaction_id,
          account_id: t.account_id || t.account?.account_id || 'default',
          timestamp: t.timestamp,
          description: t.description,
          amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount,
          currency: t.currency,
          transaction_type: t.transaction_type,
          transaction_category: t.transaction_category || 'Uncategorized',
          merchant_name: t.description, // Use description directly as merchant_name
        };

        return transformed;
      });

      console.log('✅ Transformed transaction:', {
        sample: transformedTransactions[0],
        total: transformedTransactions.length,
      });

      return transformedTransactions;
    } catch (error) {
      console.error('💥 Failed to fetch transactions:', error);
      throw error;
    }
  }

  async disconnectBank(connectionId: string): Promise<void> {
    try {
      console.log('🔄 Disconnecting bank connection:', connectionId);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No authenticated user found');
      }

      // First update the connection status to prevent any new transactions
      const { error: updateError } = await supabase
        .from('bank_connections')
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString(),
          encrypted_access_token: null,
          encrypted_refresh_token: null,
        })
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('💥 Failed to update connection status:', updateError);
        throw new Error('Failed to disconnect bank');
      }

      // Then delete all transactions for this user
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('💥 Failed to delete transactions:', deleteError);
        throw new Error('Failed to delete transactions');
      }

      console.log('✅ Bank disconnected and transactions cleared successfully');
    } catch (error) {
      console.error('💥 Failed to disconnect bank:', error);
      throw error;
    }
  }

  private async storeTokens(tokens: TokenResponse): Promise<string> {
    try {
      console.log('💾 Storing tokens in database...');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No authenticated user found');

      // Create new active connection first
      const { data, error } = await supabase
        .from('bank_connections')
        .insert({
          user_id: user.id,
          provider: 'truelayer',
          encrypted_access_token: this.encryption.encrypt(tokens.access_token),
          encrypted_refresh_token: tokens.refresh_token
            ? this.encryption.encrypt(tokens.refresh_token)
            : null,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000),
          status: 'active',
          disconnected_at: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to store tokens:', error);
        throw error;
      }

      // Then deactivate any other active connections
      const { error: deactivateError } = await supabase
        .from('bank_connections')
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('id', data.id); // Don't deactivate the one we just created

      if (deactivateError) {
        console.error('Failed to deactivate old connections:', deactivateError);
        // Don't throw here, as the new connection is already created
      }

      console.log('✅ Tokens stored successfully. Connection ID:', data.id);

      // Verify we can retrieve the token
      const testToken = await this.getStoredToken();
      if (!testToken) {
        console.error('Failed to verify stored token');
        throw new Error('Token verification failed');
      }

      return data.id;
    } catch (error) {
      console.error('💥 Failed to store tokens:', error);
      throw error;
    }
  }

  async getBalances() {
    try {
      let accessToken: string;
      try {
        accessToken = await this.refreshTokenIfNeeded();
      } catch (error) {
        return { accounts: { results: [] }, balances: [] };
      }

      const { SUPABASE } = await import('../constants');

      const response = await fetch(`${SUPABASE.URL}/functions/v1/fetch-balances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE.ANON_KEY}`,
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch balances:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to fetch balances: ${errorText}`);
      }

      const { accounts, balances } = await response.json();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No authenticated user found');

      // Get current active connection
      const { data: connection } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .single();

      if (!connection) throw new Error('No active connection found');

      // First store account information
      const accountRecords = accounts.results.map((account: any) => ({
        user_id: user.id,
        connection_id: connection.id,
        account_id: account.account_id,
        account_type: account.account_type,
        account_name: account.display_name,
        currency: account.currency,
        last_updated: new Date().toISOString(),
      }));

      const { error: accountError } = await supabase.from('bank_accounts').upsert(accountRecords, {
        onConflict: 'user_id,connection_id,account_id',
      });

      if (accountError) {
        console.error('Failed to store account records:', accountError);
        throw accountError;
      }

      // Store balance information
      const balanceRecords = accounts.results.map((account: any, index: number) => {
        const balance = balances[index];
        return {
          user_id: user.id,
          connection_id: connection.id,
          account_id: account.account_id,
          current: balance.current,
          available: balance.available,
          currency: balance.currency,
        };
      });

      const { error: balanceError } = await supabase.from('balances').upsert(balanceRecords, {
        onConflict: 'user_id,connection_id,account_id',
      });

      if (balanceError) {
        console.error('Failed to store balance records:', balanceError);
        throw balanceError;
      }

      return {
        accounts,
        balances,
      };
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      throw error;
    }
  }

  async getTransactionHistory(days: number = 30) {
    try {
      const token = await this.getStoredToken();
      if (!token) throw new Error('No access token found');

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const response = await fetch(
        `${this.loginUrl}/data/v1/accounts/${accountId}/transactions?from=${fromDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const transactions = await response.json();
      return transactions.results;
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      throw error;
    }
  }
}
