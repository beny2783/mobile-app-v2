import { getTrueLayerService } from '../trueLayer/TrueLayerServiceSingleton';
import { supabase } from '../supabase';
import { authRepository } from '../../repositories/auth';
import { TrueLayerError, TrueLayerErrorCode } from '../trueLayer/types';
import type { BankConnection, BankConnectionWithAccounts } from '../../types/bank/connection';
import type { DatabaseBankAccount } from '../../types/bank/database';

// Add missing error code
const FETCH_CONNECTIONS_FAILED = TrueLayerErrorCode.FETCH_ACCOUNTS_FAILED;

export class AccountsAdapter {
  private trueLayerService = getTrueLayerService();

  async getConnections(): Promise<BankConnectionWithAccounts[]> {
    console.log('📊 AccountsAdapter: Fetching bank connections...');
    const user = await authRepository.getUser();
    if (!user) throw new TrueLayerError('Authentication required', TrueLayerErrorCode.UNAUTHORIZED);

    const { data: connections, error: dbError } = await supabase
      .from('bank_connections')
      .select(
        `
        *,
        bank_accounts:bank_accounts(count)
      `
      )
      .eq('user_id', user.id)
      .eq('status', 'active')
      .is('disconnected_at', null)
      .not('encrypted_access_token', 'is', null)
      .order('created_at', { ascending: false });

    if (dbError) {
      throw new TrueLayerError(
        'Failed to fetch connections',
        FETCH_CONNECTIONS_FAILED,
        undefined,
        dbError
      );
    }

    console.log(`✅ AccountsAdapter: Found ${connections?.length || 0} active connections`);
    return this.transformConnections(connections as BankConnectionWithAccounts[]);
  }

  async disconnectBank(connectionId: string): Promise<void> {
    console.log('🔌 AccountsAdapter: Disconnecting bank:', connectionId);
    try {
      // Use storage service directly since it's not in the API interface
      const storageService = (this.trueLayerService as any).storageService;
      if (!storageService?.disconnectBank) {
        throw new TrueLayerError(
          'Disconnect functionality not available',
          TrueLayerErrorCode.STORAGE_FAILED
        );
      }
      await storageService.disconnectBank(connectionId);
      console.log('✅ AccountsAdapter: Bank disconnected successfully');
    } catch (error) {
      console.error('❌ AccountsAdapter: Failed to disconnect bank:', error);
      throw error;
    }
  }

  async getAccountsByConnection(connectionId: string): Promise<DatabaseBankAccount[]> {
    console.log('🏦 AccountsAdapter: Fetching accounts for connection:', connectionId);
    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('connection_id', connectionId);

    if (error) {
      throw new TrueLayerError(
        'Failed to fetch accounts',
        TrueLayerErrorCode.FETCH_ACCOUNTS_FAILED,
        undefined,
        error
      );
    }

    console.log(`✅ AccountsAdapter: Found ${accounts?.length || 0} accounts`);
    return accounts || [];
  }

  private transformConnections(
    connections: BankConnectionWithAccounts[]
  ): BankConnectionWithAccounts[] {
    return connections.map((conn) => {
      let last_sync_status: 'pending' | 'needs_update' | 'success';

      if (!conn.last_sync) {
        last_sync_status = 'pending';
      } else if (new Date(conn.last_sync) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        last_sync_status = 'needs_update';
      } else {
        last_sync_status = 'success';
      }

      return {
        ...conn,
        last_sync_status,
        account_count: conn.bank_accounts?.[0]?.count || 0,
      };
    });
  }
}

// Export a singleton instance
export const accountsAdapter = new AccountsAdapter();
