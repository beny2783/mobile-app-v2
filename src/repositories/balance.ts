import { supabase } from '../services/supabase';
import { RepositoryError, RepositoryErrorCode } from './types';
import { authRepository } from './auth';
import { getTrueLayerService } from '../services/trueLayer/TrueLayerServiceSingleton';
import {
  DatabaseBalance,
  DatabaseBankAccount,
  DatabaseGroupedBalances,
} from '../types/bank/database';
import { Balance, BankAccount, BalancePoint } from '../types/bank/balance';

export interface BalanceRepository {
  // Core balance operations
  getBalances(userId: string): Promise<DatabaseBalance[]>;
  getBalancesByConnection(connectionId: string): Promise<DatabaseBalance[]>;
  getGroupedBalances(): Promise<DatabaseGroupedBalances[]>;
  storeBalances(userId: string, connectionId: string, balances: Balance[]): Promise<void>;

  // Bank account operations
  getBankAccounts(userId: string): Promise<DatabaseBankAccount[]>;
  getBankAccountsByConnection(connectionId: string): Promise<DatabaseBankAccount[]>;
  storeBankAccounts(userId: string, connectionId: string, accounts: BankAccount[]): Promise<void>;

  // Analysis operations
  getTotalBalance(userId: string): Promise<number>;
  getBalanceHistory(userId: string, days: number): Promise<BalancePoint[]>;
}

// Re-export types for backward compatibility
export type { DatabaseBalance as Balance };
export type { DatabaseBankAccount as BankAccount };
export type { DatabaseGroupedBalances as GroupedBalances };

export class SupabaseBalanceRepository implements BalanceRepository {
  private trueLayerService = getTrueLayerService();

  constructor() {
    console.log('[BalanceRepository] Initialized');
  }

  private handleError(
    error: any,
    code: RepositoryErrorCode = RepositoryErrorCode.STORAGE_FAILED
  ): never {
    console.error('[BalanceRepository] Error:', error);
    const repoError = new Error(error.message || 'Repository operation failed') as RepositoryError;
    repoError.code = code;
    repoError.originalError = error;
    throw repoError;
  }

  async getBalances(userId: string): Promise<DatabaseBalance[]> {
    try {
      console.log('[BalanceRepository] Fetching balances for user:', userId);
      const { data, error } = await supabase.from('balances').select('*').eq('user_id', userId);

      if (error) throw this.handleError(error);

      console.log(`[BalanceRepository] Found ${data?.length || 0} balances`);
      console.log(
        '🏦 Sample balance (new DatabaseBalance type):',
        data?.[0]
          ? {
              id: data[0].id,
              account_id: data[0].account_id,
              current: data[0].current,
              available: data[0].available,
              currency: data[0].currency,
              user_id: data[0].user_id,
              connection_id: data[0].connection_id,
            }
          : 'No balances found'
      );

      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBalancesByConnection(connectionId: string): Promise<DatabaseBalance[]> {
    try {
      console.log('[BalanceRepository] Fetching balances for connection:', connectionId);
      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .eq('connection_id', connectionId);

      if (error) throw this.handleError(error);

      console.log(`[BalanceRepository] Found ${data?.length || 0} balances for connection`);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGroupedBalances(): Promise<DatabaseGroupedBalances[]> {
    try {
      const user = await authRepository.getUser();
      if (!user)
        throw this.handleError(new Error('No user found'), RepositoryErrorCode.UNAUTHORIZED);

      console.log('[BalanceRepository] Fetching grouped balances for user:', user.id);

      // Get active bank connections
      const { data: connections, error: connectionError } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null);

      if (connectionError) throw this.handleError(connectionError);

      if (!connections || connections.length === 0) {
        console.log('[BalanceRepository] No active connections found');
        return [];
      }

      // For each connection, get accounts and balances
      const groupedResults = await Promise.all(
        connections.map(async (connection) => {
          const [{ data: accounts }, { data: balances }] = await Promise.all([
            supabase
              .from('bank_accounts')
              .select('*')
              .eq('connection_id', connection.id)
              .eq('user_id', user.id),
            supabase
              .from('balances')
              .select('*')
              .eq('connection_id', connection.id)
              .eq('user_id', user.id),
          ]);

          const processedAccounts: DatabaseBankAccount[] = accounts?.length
            ? accounts.map((account) => ({
                ...account,
                balance: balances?.find((b) => b.account_id === account.account_id)?.current || 0,
              }))
            : [];

          const result: DatabaseGroupedBalances = {
            connection: {
              id: connection.id,
              provider: connection.provider,
              status: connection.status,
              created_at: connection.created_at,
              updated_at: connection.updated_at,
              bank_name: connection.bank_name || 'Connected Bank',
            },
            accounts: processedAccounts,
          };

          console.log('🏦 Grouped Balance (new DatabaseGroupedBalances type):', {
            connectionId: result.connection.id,
            provider: result.connection.provider,
            accountCount: result.accounts.length,
            sampleAccount: result.accounts[0]
              ? {
                  id: result.accounts[0].id,
                  account_id: result.accounts[0].account_id,
                  balance: result.accounts[0].balance,
                  currency: result.accounts[0].currency,
                }
              : 'No accounts',
          });

          return result;
        })
      );

      console.log(`[BalanceRepository] Processed ${groupedResults.length} connections`);
      return groupedResults;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async storeBalances(userId: string, connectionId: string, balances: Balance[]): Promise<void> {
    try {
      console.log(`[BalanceRepository] Storing ${balances.length} balances`);

      const balanceRecords = balances.map((balance) => ({
        user_id: userId,
        connection_id: connectionId,
        account_id: balance.account_id,
        current: balance.current,
        available: balance.available,
        currency: balance.currency,
      }));

      const { error } = await supabase.from('balances').insert(balanceRecords);
      if (error) throw this.handleError(error);

      console.log('[BalanceRepository] Successfully stored balances');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBankAccounts(userId: string): Promise<DatabaseBankAccount[]> {
    try {
      console.log('[BalanceRepository] Fetching bank accounts for user:', userId);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId);

      if (error) throw this.handleError(error);

      console.log(`[BalanceRepository] Found ${data?.length || 0} bank accounts`);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBankAccountsByConnection(connectionId: string): Promise<DatabaseBankAccount[]> {
    try {
      console.log('[BalanceRepository] Fetching bank accounts for connection:', connectionId);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('connection_id', connectionId);

      if (error) throw this.handleError(error);

      console.log(`[BalanceRepository] Found ${data?.length || 0} bank accounts for connection`);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async storeBankAccounts(
    userId: string,
    connectionId: string,
    accounts: BankAccount[]
  ): Promise<void> {
    try {
      console.log(`[BalanceRepository] Storing ${accounts.length} bank accounts`);

      const accountRecords = accounts.map((account) => ({
        user_id: userId,
        connection_id: connectionId,
        account_id: account.account_id,
        account_type: account.account_type,
        account_name: account.account_name,
        currency: account.currency,
        balance: account.balance,
        last_updated: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('bank_accounts')
        .upsert(accountRecords, { onConflict: 'user_id,connection_id,account_id' });

      if (error) throw this.handleError(error);

      console.log('[BalanceRepository] Successfully stored bank accounts');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTotalBalance(userId: string): Promise<number> {
    try {
      console.log('[BalanceRepository] Calculating total balance for user:', userId);
      const { data, error } = await supabase
        .from('balances')
        .select('current')
        .eq('user_id', userId);

      if (error) throw this.handleError(error);

      const total = (data || []).reduce((sum, balance) => sum + (balance.current || 0), 0);
      console.log('[BalanceRepository] Total balance calculated:', total);
      return total;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBalanceHistory(userId: string, days: number): Promise<BalancePoint[]> {
    try {
      console.log('[BalanceRepository] Fetching balance history for user:', userId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw this.handleError(error);

      // Calculate running balance for each day
      const dailyBalances = new Map<string, number>();
      let runningBalance = 0;

      transactions?.forEach((transaction) => {
        const date = new Date(transaction.timestamp).toISOString().split('T')[0];
        runningBalance += transaction.amount;
        dailyBalances.set(date, runningBalance);
      });

      const history = Array.from(dailyBalances.entries()).map(([date, balance]) => ({
        date,
        balance,
      }));

      console.log(`[BalanceRepository] Generated balance history with ${history.length} points`);
      return history;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const createBalanceRepository = (): BalanceRepository => {
  return new SupabaseBalanceRepository();
};
