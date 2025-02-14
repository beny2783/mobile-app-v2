import { supabase } from '../../supabase';
import { ITrueLayerTransactionService } from '../types';
import { Transaction } from '../../../types';
import { ITrueLayerApiService } from '../types';
import { ITrueLayerStorageService } from '../types';

export class TrueLayerTransactionService implements ITrueLayerTransactionService {
  constructor(
    private apiService: ITrueLayerApiService,
    private storageService: ITrueLayerStorageService
  ) {
    console.log('💸 Initializing TrueLayerTransactionService');
  }

  async processTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    // Enrich transactions with additional data and processing
    const processedTransactions = transactions.map((transaction) => ({
      ...transaction,
      processed_at: new Date().toISOString(),
    }));

    return processedTransactions;
  }

  async categorizeTransactions(transactions: Transaction[]): Promise<Transaction[]> {
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
    const token = await this.storageService.getStoredToken(userId);
    if (!token) throw new Error('No valid token available');

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Fetch transactions from API
    const transactions = await this.apiService.fetchTransactions(token, fromDate);

    // Process and categorize transactions
    const processedTransactions = await this.processTransactions(transactions);
    const categorizedTransactions = await this.categorizeTransactions(processedTransactions);

    // Store the transactions
    await this.storageService.storeTransactions(userId, categorizedTransactions);
  }
}
