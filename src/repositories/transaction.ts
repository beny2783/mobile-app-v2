import { Transaction } from '../types';
import { supabase } from '../services/supabase';
import { ITrueLayerApiService } from '../services/trueLayer/types';
import {
  TransactionFilters,
  TransactionRepository,
  RepositoryError,
  RepositoryErrorCode,
  MerchantCategory,
} from './types';
import { authRepository } from './auth';

export class SupabaseTransactionRepository implements TransactionRepository {
  private merchantCategories: MerchantCategory[] = [];

  constructor(private trueLayerService: ITrueLayerApiService) {
    console.log('[TransactionRepository] Initialized');
  }

  private handleError(
    error: any,
    code: RepositoryErrorCode = RepositoryErrorCode.STORAGE_FAILED
  ): never {
    console.error('[TransactionRepository] Error:', error);
    const repoError = new Error(error.message || 'Repository operation failed') as RepositoryError;
    repoError.code = code;
    repoError.statusCode = error.status || 500;
    repoError.originalError = error;
    throw repoError;
  }

  async getMerchantCategories(): Promise<MerchantCategory[]> {
    try {
      console.log('[TransactionRepository] Fetching merchant categories');

      const user = await authRepository.getUser();
      console.log('[TransactionRepository] Fetching categories for user:', user?.id);

      let query = supabase.from('merchant_categories').select('category, merchant_pattern');

      if (user) {
        query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) throw this.handleError(error);

      this.merchantCategories = data || [];
      console.log(
        `[TransactionRepository] Found ${this.merchantCategories.length} merchant categories`
      );
      return this.merchantCategories;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const categories = await this.getMerchantCategories();
      const uniqueCategories = Array.from(new Set(categories.map((c) => c.category))).sort();
      console.log(`[TransactionRepository] Returning ${uniqueCategories.length} unique categories`);
      return uniqueCategories;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  categorizeTransaction(transaction: Transaction): string {
    const description = (transaction.description || '').toUpperCase();
    const merchantName = (transaction.merchant_name || '').toUpperCase();

    // Try to match against merchant patterns
    for (const { category, merchant_pattern } of this.merchantCategories) {
      const patterns = merchant_pattern.split('|');
      if (
        patterns.some(
          (pattern) =>
            description.includes(pattern.toUpperCase()) ||
            merchantName.includes(pattern.toUpperCase())
        )
      ) {
        return category;
      }
    }

    return transaction.transaction_type || 'Other';
  }

  async getTransactions(filters: TransactionFilters): Promise<Transaction[]> {
    try {
      console.log('[TransactionRepository] Fetching transactions with filters:', filters);

      let query = supabase
        .from('transactions')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (filters.fromDate) {
        query = query.gte('timestamp', filters.fromDate.toISOString());
      }
      if (filters.toDate) {
        query = query.lte('timestamp', filters.toDate.toISOString());
      }
      if (filters.category) {
        query = query.eq('transaction_category', filters.category);
      }
      if (filters.connectionId) {
        query = query.eq('connection_id', filters.connectionId);
      }
      if (filters.searchQuery) {
        query = query.or(
          `description.ilike.%${filters.searchQuery}%,merchant_name.ilike.%${filters.searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw this.handleError(error);

      // Ensure merchant categories are loaded
      if (this.merchantCategories.length === 0) {
        await this.getMerchantCategories();
      }

      // Apply categorization to transactions
      const transactions = data || [];
      const categorizedTransactions = transactions.map((t) => ({
        ...t,
        transaction_category: this.categorizeTransaction(t),
      }));

      // Log summary of categorization
      const categoryCount = categorizedTransactions.reduce(
        (acc, t) => {
          acc[t.transaction_category] = (acc[t.transaction_category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log(
        `[TransactionRepository] Categorization summary:`,
        Object.entries(categoryCount)
          .map(([category, count]) => `${category}: ${count}`)
          .join(', ')
      );

      console.log(`[TransactionRepository] Found ${categorizedTransactions.length} transactions`);
      return categorizedTransactions;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      console.log('[TransactionRepository] Fetching transaction by ID:', transactionId);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw this.handleError(error);
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async storeTransactions(transactions: Transaction[]): Promise<void> {
    try {
      console.log(`[TransactionRepository] Storing ${transactions.length} transactions`);

      const { error } = await supabase.from('transactions').upsert(transactions, {
        onConflict: 'transaction_id',
        ignoreDuplicates: false,
      });

      if (error) throw this.handleError(error);

      console.log('[TransactionRepository] Successfully stored transactions');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateTransactionCategory(transactionId: string, category: string): Promise<void> {
    try {
      console.log(
        `[TransactionRepository] Updating category for transaction ${transactionId} to ${category}`
      );

      const { error } = await supabase
        .from('transactions')
        .update({ transaction_category: category })
        .eq('transaction_id', transactionId);

      if (error) throw this.handleError(error);

      console.log('[TransactionRepository] Successfully updated transaction category');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async syncTransactions(connectionId: string, fromDate: Date, toDate: Date): Promise<void> {
    try {
      console.log(`[TransactionRepository] Syncing transactions for connection ${connectionId}`);

      const transactions = await this.trueLayerService.fetchTransactionsForConnection(
        connectionId,
        fromDate,
        toDate
      );

      await this.storeTransactions(transactions);

      // Update last sync time
      const { error } = await supabase
        .from('bank_connections')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', connectionId);

      if (error) throw this.handleError(error);

      console.log('[TransactionRepository] Successfully synced transactions');
    } catch (error) {
      throw this.handleError(error, RepositoryErrorCode.SYNC_FAILED);
    }
  }

  async getLastSyncTime(connectionId: string): Promise<Date | null> {
    try {
      console.log(`[TransactionRepository] Getting last sync time for connection ${connectionId}`);

      const { data, error } = await supabase
        .from('bank_connections')
        .select('last_sync')
        .eq('id', connectionId)
        .single();

      if (error) throw this.handleError(error);

      return data?.last_sync ? new Date(data.last_sync) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteTransactionsByConnectionId(connectionId: string): Promise<void> {
    try {
      console.log(`[TransactionRepository] Deleting transactions for connection ${connectionId}`);

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('connection_id', connectionId);

      if (error) throw this.handleError(error);

      console.log('[TransactionRepository] Successfully deleted transactions');
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

// Export a factory function instead of a singleton to allow dependency injection
export const createTransactionRepository = (
  trueLayerService: ITrueLayerApiService
): TransactionRepository => {
  return new SupabaseTransactionRepository(trueLayerService);
};
