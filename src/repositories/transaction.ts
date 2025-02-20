import { Transaction, DatabaseTransaction } from '../types/transaction';
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

      // Debug: Log the Supabase client auth state
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log(
        '[TransactionRepository] Supabase auth session:',
        session ? 'Session exists' : 'No session',
        'Access token:',
        session?.access_token ? 'Present' : 'Missing'
      );

      // First get user-specific patterns
      let userPatterns: MerchantCategory[] = [];
      if (user) {
        const { data: userSpecific, error: userError } = await supabase
          .from('merchant_categories')
          .select('category, merchant_pattern')
          .eq('user_id', user.id);

        if (userError) {
          console.error('[TransactionRepository] Error fetching user patterns:', userError);
          throw this.handleError(userError);
        }
        userPatterns = userSpecific || [];
      }

      // Then get system patterns
      const { data: systemPatterns, error: systemError } = await supabase
        .from('merchant_categories')
        .select('category, merchant_pattern')
        .is('user_id', null);

      if (systemError) {
        console.error('[TransactionRepository] Error fetching system patterns:', systemError);
        throw this.handleError(systemError);
      }

      // Combine patterns, giving precedence to user patterns
      const userPatternSet = new Set(userPatterns.map((p) => p.merchant_pattern));
      const systemPatternsFiltered = (systemPatterns || []).filter(
        (p) => !userPatternSet.has(p.merchant_pattern)
      );

      this.merchantCategories = [...userPatterns, ...systemPatternsFiltered];

      console.log(
        '[TransactionRepository] Merchant categories loaded:',
        this.merchantCategories.map((c) => ({
          category: c.category,
          pattern: c.merchant_pattern,
        }))
      );
      console.log(
        `[TransactionRepository] Found ${this.merchantCategories.length} merchant categories`
      );
      return this.merchantCategories;
    } catch (error) {
      console.error('[TransactionRepository] Failed to fetch merchant categories:', error);
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

  categorizeTransaction(transaction: DatabaseTransaction): string {
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

    // Don't use CREDIT/DEBIT as categories as they don't indicate the transaction purpose
    const defaultCategory = 'Uncategorized';
    const transactionType = transaction.transaction_type?.toUpperCase();
    if (!transactionType || transactionType === 'CREDIT' || transactionType === 'DEBIT') {
      return defaultCategory;
    }

    return transaction.transaction_type || defaultCategory;
  }

  async getTransactions(filters: TransactionFilters): Promise<DatabaseTransaction[]> {
    try {
      console.log('[TransactionRepository] Fetching transactions with filters:', filters);

      // Get current user
      const user = await authRepository.getUser();
      if (!user) {
        throw this.handleError(new Error('No authenticated user found'));
      }

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id) // Filter by user_id
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

  async getTransactionById(transactionId: string): Promise<DatabaseTransaction | null> {
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

  async storeTransactions(transactions: DatabaseTransaction[]): Promise<void> {
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

      // First, get the current transaction to ensure it exists
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (fetchError) {
        console.error('[TransactionRepository] Failed to fetch transaction:', fetchError);
        throw this.handleError(fetchError);
      }

      if (!transaction) {
        throw this.handleError(new Error('Transaction not found'));
      }

      // Get the current user
      const user = await authRepository.getUser();
      if (!user) {
        throw this.handleError(new Error('No authenticated user found'));
      }

      const merchantPattern = transaction.merchant_name || transaction.description;
      if (merchantPattern) {
        console.log(`[TransactionRepository] Processing merchant pattern: "${merchantPattern}"`);

        // Use the atomic update_merchant_pattern function
        const { error: updateError } = await supabase.rpc('update_merchant_pattern', {
          p_merchant_pattern: merchantPattern,
          p_category: category,
          p_user_id: user.id,
        });

        if (updateError) {
          console.error('[TransactionRepository] Pattern update failed:', {
            error: updateError,
            errorMessage: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
          });
          throw this.handleError(updateError);
        }

        // Verify final state
        const { data: finalPatterns, error: verifyError } = await supabase
          .from('merchant_categories')
          .select('*')
          .eq('merchant_pattern', merchantPattern)
          .eq('user_id', user.id);

        if (verifyError) {
          console.error('[TransactionRepository] Final verification failed:', verifyError);
        } else {
          console.log('[TransactionRepository] Final state:', {
            patternCount: finalPatterns?.length || 0,
            patterns: finalPatterns,
          });
          if (finalPatterns && finalPatterns.length > 1) {
            console.error('[TransactionRepository] Warning: Found multiple patterns after update');
          }
        }

        // Update all matching transactions
        const { data: updatedTransactions, error: bulkUpdateError } = await supabase
          .from('transactions')
          .update({
            transaction_category: category,
            transaction_type: category,
          })
          .eq('user_id', user.id)
          .eq('merchant_name', merchantPattern)
          .select();

        if (bulkUpdateError) {
          console.error('[TransactionRepository] Transaction update failed:', bulkUpdateError);
          throw this.handleError(bulkUpdateError);
        } else {
          console.log('[TransactionRepository] Updated transactions:', {
            count: updatedTransactions?.length || 0,
          });
        }

        // Also update transactions matching the description
        const { data: updatedByDesc, error: descUpdateError } = await supabase
          .from('transactions')
          .update({
            transaction_category: category,
            transaction_type: category,
          })
          .eq('user_id', user.id)
          .eq('description', merchantPattern)
          .select();

        if (descUpdateError) {
          console.error(
            '[TransactionRepository] Description-based update failed:',
            descUpdateError
          );
          throw this.handleError(descUpdateError);
        } else {
          console.log('[TransactionRepository] Updated transactions by description:', {
            count: updatedByDesc?.length || 0,
          });
        }
      }

      // Refresh merchant categories cache
      await this.getMerchantCategories();

      console.log('[TransactionRepository] Category update completed');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async syncTransactions(connectionId: string, fromDate: Date, toDate: Date): Promise<void> {
    try {
      console.log(`[TransactionRepository] Syncing transactions for connection ${connectionId}`);

      const user = await authRepository.getUser();
      if (!user) {
        throw this.handleError(new Error('No authenticated user found'));
      }

      const transactions = await this.trueLayerService.fetchTransactionsForConnection(
        connectionId,
        fromDate,
        toDate
      );

      // Convert API transactions to database transactions
      const dbTransactions: DatabaseTransaction[] = transactions.map((t) => ({
        id: t.id,
        user_id: user.id,
        connection_id: connectionId,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        merchant_name: t.merchant_name,
        timestamp: t.timestamp,
        transaction_type: t.transaction_type,
        transaction_category: t.transaction_category,
        scheduled_date: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      await this.storeTransactions(dbTransactions);

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
