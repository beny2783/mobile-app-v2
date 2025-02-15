import { TrueLayerConfig, TrueLayerError, TrueLayerErrorCode } from './types';
import { Transaction } from '../../types';
import { authRepository } from '../../repositories/auth';
import { TRUELAYER } from '../../constants';
import { TrueLayerService as BaseTrueLayerService } from './index';

class TrueLayerServiceSingleton extends BaseTrueLayerService {
  private static instance: TrueLayerServiceSingleton | null = null;

  protected constructor(config: TrueLayerConfig) {
    console.log('🔍 TrueLayer Service Creation: Using NEW implementation with separated services');
    super(config);
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

  override async fetchTransactionsForConnection(
    connectionId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<Transaction[]> {
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
      const transactionsWithConnection = transactions.map((t: Transaction) => ({
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
}

// Export a function to get the singleton instance
export const getTrueLayerService = () => TrueLayerServiceSingleton.getInstance();
