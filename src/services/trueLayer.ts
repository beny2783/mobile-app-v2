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
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  merchant_name?: string;
}

export class TrueLayerService {
  private config: TrueLayerConfig;
  private baseUrl: string;
  private loginUrl: string;
  private encryption: EncryptionService;

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

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No authenticated user found');
      }

      // Encrypt tokens before storing
      const encryptedAccessToken = this.encryption.encrypt(tokenResponse.access_token);
      console.log('🔐 Access token encrypted');

      const encryptedRefreshToken = tokenResponse.refresh_token
        ? this.encryption.encrypt(tokenResponse.refresh_token)
        : null;
      console.log(
        '🔐 Refresh token encrypted:',
        encryptedRefreshToken ? '(present)' : '(not provided)'
      );

      // Store encrypted tokens in Supabase
      console.log('💾 Storing tokens in database...');
      const { error, data } = await supabase
        .from('bank_connections')
        .insert({
          user_id: user.id,
          provider: 'truelayer',
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database storage failed:', error);
        throw error;
      }

      console.log('✅ Tokens stored successfully. Connection ID:', data.id);

      // Verify we can retrieve and decrypt
      const storedToken = await this.getStoredToken();
      console.log('🔍 Token retrieval test:', storedToken ? 'successful' : 'failed');

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

    // Get the most recent bank connection
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'truelayer')
      .order('created_at', { ascending: false }) // Order by most recent
      .limit(1) // Get only one row
      .single();

    if (error) {
      console.error('Failed to fetch bank connection:', error);
      throw error;
    }

    if (!data || new Date(data.expires_at) < new Date()) {
      console.log('No valid token found or token expired');
      return null;
    }

    try {
      // Decrypt token before returning
      return this.encryption.decrypt(data.encrypted_access_token);
    } catch (error) {
      console.error('Failed to decrypt token:', error);
      return null;
    }
  }

  async refreshTokenIfNeeded(): Promise<string> {
    const { data, error } = await supabase
      .from('bank_connections')
      .select('encrypted_access_token, encrypted_refresh_token, expires_at')
      .eq('provider', 'truelayer')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
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
      console.log('🔄 Getting valid token...');
      const accessToken = await this.refreshTokenIfNeeded();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }
      console.log('✅ Got valid token');

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
      console.log('✅ Fetched transactions:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('💥 Failed to fetch transactions:', error);
      throw error;
    }
  }
}
