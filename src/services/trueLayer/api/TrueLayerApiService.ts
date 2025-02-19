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
  ITrueLayerStorageService,
  BankAccount,
} from '../types';
import { DatabaseTransaction } from '../../../types/transaction';
import { authRepository } from '../../../repositories/auth';

export class TrueLayerApiService implements ITrueLayerApiService {
  private config: TrueLayerApiConfig;

  constructor(
    config: TrueLayerConfig,
    private storageService: ITrueLayerStorageService
  ) {
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

  async fetchTransactionsForConnection(
    connectionId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<DatabaseTransaction[]> {
    try {
      console.log(`🔄 Fetching transactions for connection ${connectionId}`);

      // Get the stored token for this connection
      const user = await authRepository.getUser();
      if (!user) {
        throw new TrueLayerError('No authenticated user found', TrueLayerErrorCode.UNAUTHORIZED);
      }

      const token = await this.storageService.getStoredToken(user.id, connectionId);
      if (!token) {
        throw new TrueLayerError(
          'No token found for connection',
          TrueLayerErrorCode.NO_ACTIVE_CONNECTION
        );
      }

      // Fetch transactions using the token
      const transactions = await this.fetchTransactions(token, fromDate, toDate);

      // Add connection_id to each transaction
      const transactionsWithConnection = transactions.map((t: DatabaseTransaction) => ({
        ...t,
        connection_id: connectionId,
      }));

      console.log(
        `✅ Fetched ${transactionsWithConnection.length} transactions for connection ${connectionId}`
      );
      return transactionsWithConnection;
    } catch (error) {
      console.error(`❌ Failed to fetch transactions for connection ${connectionId}:`, error);
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to fetch transactions for connection',
        TrueLayerErrorCode.FETCH_TRANSACTIONS_FAILED,
        undefined,
        error
      );
    }
  }

  async fetchTransactions(
    token: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<DatabaseTransaction[]> {
    try {
      const accounts = await this.fetchAccounts(token);
      const transactions: DatabaseTransaction[] = [];

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
            // Transform TrueLayer transactions to DatabaseTransactions
            const dbTransactions = data.results.map((t: any) => ({
              id: t.transaction_id,
              amount: t.amount,
              currency: t.currency,
              description: t.description,
              merchant_name: t.merchant_name,
              timestamp: t.timestamp,
              transaction_type: t.transaction_type,
              transaction_category: t.transaction_category,
              account_id: account.account_id,
              user_id: '', // Will be set by the storage service
              connection_id: '', // Will be set by the caller
              scheduled_date: undefined,
            }));
            transactions.push(...dbTransactions);
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
            const balance = balanceData.results[0];
            balances.push({
              account_id: account.account_id,
              current: balance.current,
              available: balance.available,
              currency: balance.currency,
              update_timestamp: balance.update_timestamp || new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Error fetching balance for account ${account.account_id}:`, error);
          // Continue with other accounts even if one fails
          continue;
        }
      }

      return {
        results: balances,
        status: balances.length > 0 ? 'succeeded' : 'failed',
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

  private async fetchAccounts(token: string): Promise<BankAccount[]> {
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
      return (accountsData.results || []).map((account: any) => ({
        account_id: account.account_id,
        account_type: account.account_type,
        account_name: account.display_name || account.account_type,
        balance: account.balance || 0,
        currency: account.currency,
        last_updated: new Date().toISOString(),
      }));
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
