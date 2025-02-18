import { DatabaseTransaction } from '../../types/transaction';
import {
  TrueLayerError,
  TrueLayerErrorCode,
  ITrueLayerApiService,
  TokenResponse,
  BalanceResponse,
  TrueLayerConfig,
} from './types';
import { authRepository } from '../../repositories/auth';
import { TRUELAYER } from '../../constants';
import { TrueLayerApiService } from './api/TrueLayerApiService';
import { TrueLayerStorageService } from './storage/TrueLayerStorageService';
import { TrueLayerTransactionService } from './transaction/TrueLayerTransactionService';

class TrueLayerServiceSingleton implements ITrueLayerApiService {
  private static instance: TrueLayerServiceSingleton | null = null;
  private apiService: TrueLayerApiService;
  private storageService: TrueLayerStorageService;
  private transactionService: TrueLayerTransactionService;

  protected constructor(config: TrueLayerConfig) {
    console.log('🔍 TrueLayer Service Creation: Using NEW implementation with separated services');
    this.storageService = new TrueLayerStorageService();
    this.apiService = new TrueLayerApiService(config, this.storageService);
    this.transactionService = new TrueLayerTransactionService(this.apiService, this.storageService);
  }

  public static getInstance(): TrueLayerServiceSingleton {
    if (!TrueLayerServiceSingleton.instance) {
      TrueLayerServiceSingleton.instance = new TrueLayerServiceSingleton({
        clientId: TRUELAYER.CLIENT_ID || '',
        redirectUri: TRUELAYER.REDIRECT_URI,
      });
    }
    return TrueLayerServiceSingleton.instance;
  }

  getAuthUrl(): string {
    return this.apiService.getAuthUrl();
  }

  async exchangeToken(code: string): Promise<TokenResponse> {
    return this.apiService.exchangeToken(code);
  }

  async fetchTransactions(
    token: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<DatabaseTransaction[]> {
    return this.apiService.fetchTransactions(token, fromDate, toDate);
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
      const transactions = await this.apiService.fetchTransactions(token, fromDate, toDate);

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

  async fetchBalances(token: string): Promise<BalanceResponse> {
    return this.apiService.fetchBalances(token);
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return this.apiService.refreshToken(refreshToken);
  }

  async disconnectBank(connectionId: string): Promise<void> {
    await this.storageService.disconnectBank(connectionId);
  }
}

// Export singleton instance
export const getTrueLayerService = (): ITrueLayerApiService => {
  return TrueLayerServiceSingleton.getInstance();
};
