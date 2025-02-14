import { TRUELAYER } from '../../../constants';
import { SUPABASE } from '../../../constants';
import { Platform } from 'react-native';
import {
  ITrueLayerApiService,
  TrueLayerConfig,
  TokenResponse,
  TrueLayerApiConfig,
  TrueLayerError,
  TrueLayerErrorCode,
  BalanceResponse,
} from '../types';
import { Transaction } from '../../../types';

export class TrueLayerApiService implements ITrueLayerApiService {
  private config: TrueLayerApiConfig;

  constructor(config: TrueLayerConfig) {
    console.log('📡 Initializing TrueLayerApiService');
    const isProd = !config.clientId.startsWith('sandbox-');
    this.config = {
      baseUrl: isProd ? 'https://auth.truelayer.com' : 'https://auth.truelayer-sandbox.com',
      loginUrl: isProd ? 'https://api.truelayer.com' : 'https://api.truelayer-sandbox.com',
      clientId: config.clientId,
      redirectUri: Platform.select({
        ios: 'spendingtracker://auth/callback',
        android: 'spendingtracker://auth/callback',
        default: 'http://localhost:19006/auth/callback',
      }),
    };
  }

  getAuthUrl(): string {
    const isProd = !this.config.clientId.startsWith('sandbox-');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'info accounts balance cards transactions',
      providers: isProd ? 'uk-ob-all uk-oauth-all' : 'mock',
      enable_mock: (!isProd).toString(),
      enable_oauth_providers: isProd.toString(),
      enable_open_banking_providers: isProd.toString(),
      enable_credentials_sharing_providers: 'false',
    });

    if (!isProd) {
      params.append('disable_providers', 'true');
      params.append('test_provider', 'mock');
      params.append('mock_provider', 'mock');
    }

    return `${this.config.baseUrl}/?${params.toString()}`;
  }

  async exchangeToken(code: string): Promise<TokenResponse> {
    const tokenUrl = `${this.config.baseUrl}/connect/token`;
    try {
      const requestBody = {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: TRUELAYER.CLIENT_SECRET,
        code,
        redirect_uri: this.config.redirectUri,
      };

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          'X-Debug': 'true',
          'X-TL-Environment': !this.config.clientId.startsWith('sandbox-') ? 'live' : 'sandbox',
        },
        body: new URLSearchParams(requestBody).toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new TrueLayerError(
          error.error_description || error.error || 'Token exchange failed',
          TrueLayerErrorCode.TOKEN_EXCHANGE_FAILED,
          response.status,
          error
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to exchange token',
        TrueLayerErrorCode.TOKEN_EXCHANGE_FAILED,
        undefined,
        error
      );
    }
  }

  async fetchTransactions(token: string, fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
    try {
      const accounts = await this.fetchAccounts(token);
      const transactions: Transaction[] = [];

      for (const account of accounts) {
        try {
          const transactionsResponse = await fetch(
            `${this.config.loginUrl}/data/v1/accounts/${account.account_id}/transactions${
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
            throw new TrueLayerError(
              `Failed to fetch transactions for account ${account.account_id}`,
              TrueLayerErrorCode.FETCH_TRANSACTIONS_FAILED,
              transactionsResponse.status
            );
          }

          const data = await transactionsResponse.json();
          if (data.results) {
            transactions.push(...data.results);
          }
        } catch (error) {
          console.error(`Error fetching transactions for account ${account.account_id}:`, error);
          // Continue with other accounts even if one fails
          continue;
        }
      }

      return transactions;
    } catch (error) {
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to fetch transactions',
        TrueLayerErrorCode.FETCH_TRANSACTIONS_FAILED,
        undefined,
        error
      );
    }
  }

  async fetchBalances(token: string): Promise<BalanceResponse> {
    try {
      const accounts = await this.fetchAccounts(token);
      const balances = [];

      for (const account of accounts) {
        try {
          const balanceResponse = await fetch(
            `${this.config.loginUrl}/data/v1/accounts/${account.account_id}/balance`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
            }
          );

          if (!balanceResponse.ok) {
            throw new TrueLayerError(
              `Failed to fetch balance for account ${account.account_id}`,
              TrueLayerErrorCode.FETCH_BALANCES_FAILED,
              balanceResponse.status
            );
          }

          const balanceData = await balanceResponse.json();
          if (balanceData.results?.[0]) {
            balances.push({
              account_id: account.account_id,
              ...balanceData.results[0],
            });
          }
        } catch (error) {
          console.error(`Error fetching balance for account ${account.account_id}:`, error);
          // Continue with other accounts even if one fails
          continue;
        }
      }

      return {
        accounts: { results: accounts },
        balances,
      };
    } catch (error) {
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to fetch balances',
        TrueLayerErrorCode.FETCH_BALANCES_FAILED,
        undefined,
        error
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await fetch(`${SUPABASE.URL}/functions/v1/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE.ANON_KEY}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new TrueLayerError(
          'Failed to refresh token',
          TrueLayerErrorCode.TOKEN_REFRESH_FAILED,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to refresh token',
        TrueLayerErrorCode.TOKEN_REFRESH_FAILED,
        undefined,
        error
      );
    }
  }

  private async fetchAccounts(token: string): Promise<any[]> {
    try {
      const accountsResponse = await fetch(`${this.config.loginUrl}/data/v1/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!accountsResponse.ok) {
        throw new TrueLayerError(
          'Failed to fetch accounts',
          TrueLayerErrorCode.FETCH_ACCOUNTS_FAILED,
          accountsResponse.status
        );
      }

      const accountsData = await accountsResponse.json();
      return accountsData.results || [];
    } catch (error) {
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to fetch accounts',
        TrueLayerErrorCode.FETCH_ACCOUNTS_FAILED,
        undefined,
        error
      );
    }
  }
}
