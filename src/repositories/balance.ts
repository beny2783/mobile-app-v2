import { supabase } from '../services/supabase';
import { RepositoryError, RepositoryErrorCode } from './types';
import { authRepository } from './auth';
import { getTrueLayerService } from '../services/trueLayer/TrueLayerServiceSingleton';

export interface Balance {
  id: string;
  user_id: string;
  connection_id: string;
  account_id: string;
  current: number;
  available: number;
  currency: string;
  updated_at: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  connection_id: string;
  account_id: string;
  account_type: string;
  account_name: string;
  currency: string;
  balance: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface GroupedBalances {
  connection: {
    id: string;
    provider: string;
    status: string;
    created_at: string;
    updated_at: string;
    bank_name?: string;
  };
  accounts: BankAccount[];
}

export interface BalanceRepository {
  // Core balance operations
  getBalances(userId: string): Promise<Balance[]>;
  getBalancesByConnection(connectionId: string): Promise<Balance[]>;
  getGroupedBalances(): Promise<GroupedBalances[]>;
  storeBalances(userId: string, connectionId: string, balances: Balance[]): Promise<void>;

  // Bank account operations
  getBankAccounts(userId: string): Promise<BankAccount[]>;
  getBankAccountsByConnection(connectionId: string): Promise<BankAccount[]>;
  storeBankAccounts(userId: string, connectionId: string, accounts: BankAccount[]): Promise<void>;

  // Analysis operations
  getTotalBalance(userId: string): Promise<number>;
  getBalanceHistory(userId: string, days: number): Promise<{ date: string; balance: number }[]>;
}

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

  async getBalances(userId: string): Promise<Balance[]> {
    try {
      console.log('[BalanceRepository] Fetching balances for user:', userId);
      const { data, error } = await supabase.from('balances').select('*').eq('user_id', userId);

      if (error) throw this.handleError(error);

      console.log(`[BalanceRepository] Found ${data?.length || 0} balances`);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBalancesByConnection(connectionId: string): Promise<Balance[]> {
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

  async getGroupedBalances(): Promise<GroupedBalances[]> {
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

          const processedAccounts: BankAccount[] = accounts?.length
            ? accounts.map((account) => ({
                ...account,
                balance: balances?.find((b) => b.account_id === account.account_id)?.current || 0,
              }))
            : [];

          return {
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

  async getBankAccounts(userId: string): Promise<BankAccount[]> {
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

  async getBankAccountsByConnection(connectionId: string): Promise<BankAccount[]> {
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

  async getBalanceHistory(
    userId: string,
    days: number
  ): Promise<{ date: string; balance: number }[]> {
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
