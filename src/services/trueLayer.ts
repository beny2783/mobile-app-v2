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
      ios: 'spendingtracker://auth/callback',
      android: 'spendingtracker://auth/callback',
      default: 'http://localhost:19006/auth/callback',
    });

    // Log the actual redirect URI being used
    console.log('TrueLayer redirect URI:', this.redirectUri);

    // Always use production endpoints when using production credentials
    const isProd = !this.clientId.startsWith('sandbox-');
    this.baseUrl = isProd ? 'https://auth.truelayer.com' : 'https://auth.truelayer-sandbox.com';
    this.loginUrl = isProd ? 'https://api.truelayer.com' : 'https://api.truelayer-sandbox.com';

    this.encryption = new EncryptionService();
    console.log('TrueLayer Service Initialized:', {
      baseUrl: this.baseUrl,
      loginUrl: this.loginUrl,
      isProd,
      redirectUri: this.redirectUri,
      configProvided: {
        clientId: config.clientId ? 'provided' : 'missing',
        redirectUri: config.redirectUri,
      },
    });
  }

  getAuthUrl(): string {
    // Use production settings when using production credentials
    const isProd = !this.clientId.startsWith('sandbox-');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'info accounts balance cards transactions',
      providers: isProd ? 'uk-ob-all uk-oauth-all' : 'mock',
      enable_mock: (!isProd).toString(),
      enable_oauth_providers: isProd.toString(),
      enable_open_banking_providers: isProd.toString(),
      enable_credentials_sharing_providers: 'false',
    });

    // For sandbox, we need these specific parameters
    if (!isProd) {
      params.append('disable_providers', 'true');
      params.append('test_provider', 'mock');
      params.append('mock_provider', 'mock'); // Explicitly request mock provider
    }

    const authUrl = `${this.baseUrl}/?${params.toString()}`;
    console.log('🔗 Generated TrueLayer Auth URL:', {
      url: authUrl,
      isProd,
      redirectUri: this.redirectUri,
      baseUrl: this.baseUrl,
      isSandbox: !isProd,
      mockEnabled: !isProd,
    });
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
        isProd: !this.clientId.startsWith('sandbox-'),
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
          'X-TL-Environment': !this.clientId.startsWith('sandbox-') ? 'live' : 'sandbox',
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
          'X-TL-Environment': !this.clientId.startsWith('sandbox-') ? 'live' : 'sandbox',
        },
        body: new URLSearchParams(requestBody).toString(),
      });

      const responseText = await response.text();
      console.log('📥 Raw TrueLayer response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
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

      // Initialize the connection by fetching initial data
      await this.initializeConnection(connectionId);

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

  private async initializeConnection(connectionId: string): Promise<void> {
    try {
      console.log('🔄 Initializing connection:', connectionId);

      // Fetch both transactions and balances concurrently
      await Promise.all([
        this.fetchAndStoreInitialTransactions(connectionId),
        this.fetchAndStoreInitialBalances(connectionId),
      ]);

      console.log('✅ Connection initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize connection:', error);
      throw error;
    }
  }

  private async fetchAndStoreInitialTransactions(connectionId: string): Promise<void> {
    try {
      console.log('📥 Fetching initial transactions...');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      // Get fresh data from API
      const freshTransactions = await this.fetchTransactionsFromAPI();

      // Get merchant categories
      const { data: categories } = await supabase
        .from('merchant_categories')
        .select('merchant_pattern, category')
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      // Transform and categorize transactions
      const transformedTransactions = freshTransactions.map((t) => {
        const searchText = `${t.description} ${t.merchant_name || ''}`.toUpperCase();
        const matchingCategory = categories?.find((cat) =>
          searchText.includes(cat.merchant_pattern.toUpperCase())
        );

        return {
          user_id: user.id,
          connection_id: connectionId,
          transaction_id: t.transaction_id,
          account_id: t.account_id || 'default',
          timestamp: new Date(t.timestamp).toISOString(),
          description: t.description,
          amount: t.amount,
          currency: t.currency,
          transaction_type: t.transaction_type,
          transaction_category: matchingCategory?.category || 'Uncategorized',
          merchant_name: t.description,
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
        throw insertError;
      }

      console.log('✅ Initial transactions stored:', transformedTransactions.length);
    } catch (error) {
      console.error('❌ Failed to fetch initial transactions:', error);
      throw error;
    }
  }

  private async fetchAndStoreInitialBalances(connectionId: string): Promise<void> {
    try {
      console.log('💰 Fetching initial balances...');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      // Fetch balances from TrueLayer
      const balanceResults = await this.getBalances();
      console.log('Raw balance data:', JSON.stringify(balanceResults, null, 2));

      if (!balanceResults || !Array.isArray(balanceResults) || balanceResults.length === 0) {
        throw new Error('No balance results found');
      }

      // Process each connection's data
      for (const connectionData of balanceResults) {
        if (!connectionData?.accounts?.results) continue;

        // Create or update bank accounts
        for (const account of connectionData.accounts.results) {
          // Find matching balance - balances are now directly in the array
          const balance = connectionData.balances.find((b) => b.account_id === account.account_id);
          if (!balance) {
            console.log(`No balance data found for account ${account.account_id}`);
            continue;
          }

          // Create or update bank account
          const { error: accountError } = await supabase.from('bank_accounts').upsert(
            {
              user_id: user.id,
              connection_id: connectionId,
              account_id: account.account_id,
              account_type: account.account_type,
              account_name: account.display_name || account.account_type,
              currency: balance.currency,
              balance: balance.current,
              last_updated: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,connection_id,account_id',
            }
          );

          if (accountError) {
            console.error('Error creating bank account:', accountError);
            throw accountError;
          }
        }

        // Create balance records
        const balanceRecords = connectionData.accounts.results.map((account) => {
          // Find matching balance - balances are now directly in the array
          const balance = connectionData.balances.find((b) => b.account_id === account.account_id);
          return {
            user_id: user.id,
            connection_id: connectionId,
            account_id: account.account_id,
            current: balance?.current || 0,
            available: balance?.available || 0,
            currency: balance?.currency || account.currency,
          };
        });

        console.log(`Inserting ${balanceRecords.length} balance records...`);
        const { error: balanceError } = await supabase.from('balances').insert(balanceRecords);

        if (balanceError) {
          console.error('Error inserting balances:', balanceError);
          throw balanceError;
        }

        // Update connection metadata
        await supabase
          .from('bank_connections')
          .update({
            last_sync: new Date().toISOString(),
            bank_name: connectionData.connection.bank_name,
          })
          .eq('id', connectionId);
      }

      console.log('✅ Initial balances stored successfully');
    } catch (error) {
      console.error('❌ Failed to fetch initial balances:', error);
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

  private async fetchTransactionsFromAPI(fromDate?: Date, toDate?: Date): Promise<any[]> {
    try {
      const token = await this.refreshTokenIfNeeded();
      if (!token) throw new Error('No valid token available');

      // Get accounts first
      const accountsResponse = await fetch(`${this.loginUrl}/data/v1/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!accountsResponse.ok) {
        console.error('Failed to fetch accounts:', {
          status: accountsResponse.status,
          statusText: accountsResponse.statusText,
        });
        throw new Error('Failed to fetch accounts');
      }

      const accountsData = await accountsResponse.json();
      const transactions = [];

      // Fetch transactions for each account
      for (const account of accountsData.results || []) {
        const transactionsResponse = await fetch(
          `${this.loginUrl}/data/v1/accounts/${account.account_id}/transactions${
            fromDate ? `?from=${fromDate.toISOString()}` : ''
          }${toDate ? `&to=${toDate.toISOString()}` : ''}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (!transactionsResponse.ok) {
          console.error(`Failed to fetch transactions for account ${account.account_id}:`, {
            status: transactionsResponse.status,
            statusText: transactionsResponse.statusText,
          });
          continue;
        }

        const transactionsData = await transactionsResponse.json();
        if (transactionsData.results) {
          transactions.push(...transactionsData.results);
        }
      }

      return transactions;
    } catch (error) {
      console.error('💥 Fetch transactions failed:', error);
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

      // Delete transactions only for this connection
      const { error: deleteTransactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('connection_id', connectionId);

      if (deleteTransactionsError) {
        console.error('💥 Failed to delete transactions:', deleteTransactionsError);
        throw new Error('Failed to delete transactions');
      }

      // Delete balances for this connection
      const { error: deleteBalancesError } = await supabase
        .from('balances')
        .delete()
        .eq('user_id', user.id)
        .eq('connection_id', connectionId);

      if (deleteBalancesError) {
        console.error('💥 Failed to delete balances:', deleteBalancesError);
        throw new Error('Failed to delete balances');
      }

      // Delete bank accounts for this connection
      const { error: deleteAccountsError } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('connection_id', connectionId);

      if (deleteAccountsError) {
        console.error('💥 Failed to delete bank accounts:', deleteAccountsError);
        throw new Error('Failed to delete bank accounts');
      }

      console.log('✅ Bank disconnected and related data cleared successfully');
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

      // Create new active connection
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
      console.log('🔄 Starting balance fetch...');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('❌ No authenticated user found:', userError);
        throw new Error('No authenticated user found');
      }

      console.log('👤 User authenticated:', user.id);

      // Get all active connections
      const { data: connections, error: connectionError } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .not('encrypted_access_token', 'is', null)
        .order('created_at', { ascending: false });

      if (connectionError) {
        console.error('❌ Error fetching bank connections:', connectionError);
        throw new Error('Failed to fetch bank connections');
      }

      if (!connections || connections.length === 0) {
        console.log('ℹ️ No active bank connections found');
        return { accounts: { results: [] }, balances: [] };
      }

      console.log(`🔗 Found ${connections.length} active connections`);

      // Fetch balances for each connection
      const allResults = await Promise.all(
        connections.map(async (connection) => {
          try {
            console.log(`📊 Processing connection ${connection.id}...`);

            // Decrypt the access token
            const token = this.encryption.decrypt(connection.encrypted_access_token);
            if (!token) {
              console.error('❌ No valid token for connection:', connection.id);
              return null;
            }

            // Get accounts for this connection
            console.log(`📊 Fetching accounts for connection ${connection.id}...`);
            const accountsResponse = await fetch(`${this.loginUrl}/data/v1/accounts`, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
            });

            if (!accountsResponse.ok) {
              const errorText = await accountsResponse.text();
              console.error(`❌ Failed to fetch accounts for connection ${connection.id}:`, {
                status: accountsResponse.status,
                error: errorText,
              });
              return null;
            }

            const accountsData = await accountsResponse.json();
            console.log(
              `📝 Found ${accountsData.results?.length || 0} accounts for connection ${connection.id}`
            );

            if (!accountsData.results || accountsData.results.length === 0) {
              console.warn(`⚠️ No accounts found for connection ${connection.id}`);
              return null;
            }

            // Fetch balances for each account
            const balances = [];
            for (const account of accountsData.results) {
              try {
                console.log(`💰 Fetching balance for account ${account.account_id}...`);
                const balanceResponse = await fetch(
                  `${this.loginUrl}/data/v1/accounts/${account.account_id}/balance`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: 'application/json',
                    },
                  }
                );

                if (!balanceResponse.ok) {
                  console.error(`❌ Failed to fetch balance for account ${account.account_id}:`, {
                    status: balanceResponse.status,
                    statusText: balanceResponse.statusText,
                  });
                  continue;
                }

                const balanceData = await balanceResponse.json();
                console.log(`💰 Raw balance data for account ${account.account_id}:`, {
                  results: balanceData.results,
                  firstResult: balanceData.results?.[0],
                  current: balanceData.results?.[0]?.current,
                  available: balanceData.results?.[0]?.available,
                  currency: balanceData.results?.[0]?.currency,
                });

                if (balanceData.results?.[0]) {
                  const balance = {
                    account_id: account.account_id,
                    ...balanceData.results[0],
                  };
                  console.log(`💰 Processed balance for account ${account.account_id}:`, {
                    current: balance.current,
                    available: balance.available,
                    currency: balance.currency,
                  });
                  balances.push(balance);
                }
              } catch (error) {
                console.error(
                  `❌ Error fetching balance for account ${account.account_id}:`,
                  error
                );
              }
            }

            console.log(`📊 Got ${balances.length} balances for connection ${connection.id}`);

            return {
              accounts: accountsData,
              balances,
              connection: {
                id: connection.id,
                provider: connection.provider,
                status: connection.status,
                created_at: connection.created_at,
                updated_at: connection.updated_at,
                bank_name: connection.bank_name || 'My Bank',
              },
            };
          } catch (error) {
            console.error(`💥 Error processing connection ${connection.id}:`, error);
            return null;
          }
        })
      );

      // Filter out failed connections and combine results
      const validResults = allResults.filter(Boolean);
      console.log(`📊 Successfully processed ${validResults.length} connections`);

      // If no valid results, return empty data structure
      if (validResults.length === 0) {
        return { accounts: { results: [] }, balances: [] };
      }

      return validResults;
    } catch (error) {
      console.error('💥 Failed to fetch balances:', error);
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

  async fetchAndStoreBalances() {
    try {
      console.log('Fetching balances...');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No authenticated user found');

      // Get current active connection
      const { data: connection } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .single();

      if (!connection) throw new Error('No active connection found');

      console.log('Found active connection:', connection.id);

      // Fetch balances from TrueLayer
      const balanceResults = await this.getBalances();
      console.log('Raw balance data:', JSON.stringify(balanceResults, null, 2));

      if (!balanceResults || !Array.isArray(balanceResults) || balanceResults.length === 0) {
        console.log('No balance results found');
        return;
      }

      // Process each connection's data
      for (const connectionData of balanceResults) {
        if (!connectionData?.accounts?.results) {
          console.log('Invalid connection data structure');
          continue;
        }

        // Create or update bank accounts
        for (const account of connectionData.accounts.results) {
          // Find matching balance
          const balance = connectionData.balances.find((b) => b.account_id === account.account_id);

          if (!balance) {
            console.log(`No balance data found for account ${account.account_id}`);
            continue;
          }

          // Create or update bank account
          console.log(`💳 Creating/updating bank account for ${account.account_id}:`, {
            account_type: account.account_type,
            display_name: account.display_name,
            balance_current: balance.current,
            balance_available: balance.available,
            currency: balance.currency,
          });

          const { error: accountError } = await supabase.from('bank_accounts').upsert(
            {
              user_id: user.id,
              connection_id: connection.id,
              account_id: account.account_id,
              account_type: account.account_type,
              account_name: account.display_name || account.account_type,
              currency: balance.currency,
              balance: balance.current,
              last_updated: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,connection_id,account_id',
            }
          );

          if (accountError) {
            console.error('❌ Error creating bank account:', {
              error: accountError,
              account_id: account.account_id,
              balance: balance.current,
            });
            throw accountError;
          }

          console.log(`✅ Successfully updated bank account ${account.account_id}`);
        }

        // Create balance records
        const balanceRecords = connectionData.accounts.results.map((account) => {
          const balance = connectionData.balances.find((b) => b.account_id === account.account_id);
          return {
            user_id: user.id,
            connection_id: connection.id,
            account_id: account.account_id,
            current: balance?.current || 0,
            available: balance?.available || 0,
            currency: balance?.currency || account.currency,
          };
        });

        console.log(`Inserting ${balanceRecords.length} balance records...`);
        const { error: balanceError } = await supabase.from('balances').insert(balanceRecords);

        if (balanceError) {
          console.error('Error inserting balances:', balanceError);
          throw balanceError;
        }

        // Update connection metadata
        await supabase
          .from('bank_connections')
          .update({
            last_sync: new Date().toISOString(),
            bank_name: connectionData.connection.bank_name,
          })
          .eq('id', connection.id);
      }

      console.log('Successfully stored balances');
    } catch (error) {
      console.error('Error in fetchAndStoreBalances:', error);
      throw error;
    }
  }
}
