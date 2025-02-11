import { TRUELAYER } from '../constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { EncryptionService } from './encryption';

interface TrueLayerConfig {
  clientId: string;
  redirectUri: string;
  enableMock?: boolean;
}

interface Transaction {
  transaction_id: string;
  account_id?: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category?: string;
  merchant_name?: string;
}

export class TrueLayerService {
  private config: TrueLayerConfig;
  private baseUrl: string;
  private loginUrl: string;
  private encryption: EncryptionService;
  private categoriesLogged = false;

  constructor(config: TrueLayerConfig) {
    this.config = config;
    this.encryption = new EncryptionService();
    // Use sandbox environment for development
    if (__DEV__) {
      this.baseUrl = 'https://auth.truelayer-sandbox.com';
      this.loginUrl = 'https://login-api.truelayer-sandbox.com';
    } else {
      this.baseUrl = 'https://auth.truelayer.com';
      this.loginUrl = 'https://login-api.truelayer.com';
    }
    console.log('TrueLayer Service Initialized:', {
      baseUrl: this.baseUrl,
      loginUrl: this.loginUrl,
      isDev: __DEV__,
      configProvided: {
        clientId: config.clientId ? 'provided' : 'missing',
        redirectUri: config.redirectUri ? 'provided' : 'missing',
      },
    });
  }

  getAuthUrl(): string {
    console.log('Building Auth URL with config:', {
      clientId: this.config.clientId ? 'provided' : 'missing',
      redirectUri: this.config.redirectUri,
      baseUrl: this.baseUrl,
    });

    // For sandbox testing, use their test bank
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'info accounts balance cards transactions',
      providers: 'mock', // Changed to just 'mock'
      enable_mock: 'true',
      disable_providers: 'true', // Added this to force mock provider
      enable_oauth_providers: 'false',
      enable_open_banking_providers: 'false', // Changed to false
      enable_credentials_sharing_providers: 'false',
      test_provider: 'mock', // Added test provider
    });

    if (__DEV__) {
      params.append('debug', 'true');
    }

    const url = `${this.baseUrl}/?${params.toString()}`;
    console.log('Final Auth URL:', url);
    return url;
  }

  async exchangeCode(code: string): Promise<any> {
    try {
      console.log('🔄 Starting token exchange with code:', code.substring(0, 4) + '...');

      const tokenResponse = await this.fetchTokens(code);
      console.log('✅ Token exchange successful:', {
        access_token: tokenResponse.access_token ? '(present)' : '(missing)',
        refresh_token: tokenResponse.refresh_token ? '(present)' : '(missing)',
        expires_in: tokenResponse.expires_in,
        token_type: tokenResponse.token_type,
      });

      // Use storeTokens method instead of direct database insert
      const connectionId = await this.storeTokens(tokenResponse);
      console.log('✅ Connection established with ID:', connectionId);

      return tokenResponse;
    } catch (error) {
      console.error('💥 Token exchange error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async fetchTokens(code: string) {
    const { SUPABASE } = await import('../constants');

    const response = await fetch(`${SUPABASE.URL}/functions/v1/exchange-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE.ANON_KEY}`,
      },
      body: JSON.stringify({ code }),
    });

    const responseText = await response.text();
    console.log('Token response:', responseText);

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${responseText}`);
    }

    return JSON.parse(responseText);
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
          merchant_name: t.merchant_name || null,
        };
      });

      // Store in database
      const { error: insertError } = await supabase
        .from('transactions')
        .upsert(transformedTransactions, {
          onConflict: 'user_id,transaction_id',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('💥 Failed to store transactions:', insertError);
        return freshTransactions;
      }

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
      });

      // Transform transactions to match our schema
      const transformedTransactions = transactions.map((t: any) => ({
        transaction_id: t.transaction_id,
        account_id: t.account_id || t.account?.account_id || 'default',
        timestamp: t.timestamp,
        description: t.description,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount,
        currency: t.currency,
        transaction_type: t.transaction_type,
        transaction_category: t.transaction_category || 'Uncategorized',
        merchant_name: t.merchant_name,
      }));

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

      // First update the connection status
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

      // Then delete associated transactions
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('💥 Failed to delete transactions:', deleteError);
        throw new Error('Failed to delete transactions');
      }

      console.log('✅ Bank disconnected successfully');
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
}
