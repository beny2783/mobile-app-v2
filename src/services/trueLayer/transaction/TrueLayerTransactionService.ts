import { supabase } from '../../supabase';
import { ITrueLayerTransactionService } from '../types';
import { DatabaseTransaction } from '../../../types/transaction';
import { ITrueLayerApiService } from '../types';
import { ITrueLayerStorageService } from '../types';
import { Logger } from '../../../utils/logger';
import { TrueLayerClient, TrueLayerTransaction, ProcessedTransaction } from '../types';

export class TrueLayerTransactionService implements ITrueLayerTransactionService {
  private log = new Logger('TrueLayerTransactionService', '💸');

  constructor(
    private apiService: ITrueLayerApiService,
    private storageService: ITrueLayerStorageService,
    private readonly client: TrueLayerClient
  ) {
    this.log.info('Initializing TrueLayerTransactionService');
  }

  async processTransactions(
    transactions: TrueLayerTransaction[],
    connectionId: string
  ): Promise<ProcessedTransaction[]> {
    return transactions.map((transaction) => ({
      ...transaction,
      connection_id: transaction.connection_id || connectionId,
      id: transaction.id || this.generateTransactionId(transaction, connectionId),
      processed_at: new Date().toISOString(),
    }));
  }

  private generateTransactionId(transaction: TrueLayerTransaction, connectionId: string): string {
    return `${connectionId}_${new Date(transaction.timestamp).getTime()}`;
  }

  async categorizeTransactions(
    transactions: DatabaseTransaction[]
  ): Promise<DatabaseTransaction[]> {
    const { data: categories } = await supabase
      .from('merchant_categories')
      .select('merchant_pattern, category');

    if (!categories) return transactions;

    return transactions.map((transaction) => {
      const matchingCategory = categories.find((category) =>
        new RegExp(category.merchant_pattern, 'i').test(transaction.description || '')
      );

      return {
        ...transaction,
        transaction_category: matchingCategory?.category || 'Uncategorized',
      };
    });
  }

  async updateTransactionHistory(userId: string, days: number = 30): Promise<void> {
    // Get all active connections for the user
    const { data: connections, error: connError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .is('disconnected_at', null);

    if (connError) throw new Error('Failed to fetch bank connections');
    if (!connections?.length) throw new Error('No active bank connections found');

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Update transactions for each connection
    for (const connection of connections) {
      try {
        const token = await this.storageService.getStoredToken(userId, connection.id);
        if (!token) continue;

        // Fetch transactions from API
        const transactions = await this.apiService.fetchTransactions(token, fromDate);

        // Process and categorize transactions
        const processedTransactions = await this.processTransactions(transactions, connection.id);
        const categorizedTransactions = await this.categorizeTransactions(processedTransactions);

        // Store the transactions
        await this.storageService.storeTransactions(userId, categorizedTransactions);
      } catch (error) {
        console.error(`Failed to update transactions for connection ${connection.id}:`, error);
        // Continue with other connections even if one fails
        continue;
      }
    }
  }
}
