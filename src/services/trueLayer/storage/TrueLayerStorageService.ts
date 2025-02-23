import { supabase } from '../../supabase';
import { EncryptionService } from '../../encryption';
import {
  ITrueLayerStorageService,
  TokenResponse,
  BankConnection,
  TrueLayerError,
  TrueLayerErrorCode,
  BalanceResponse,
  BankAccount,
} from '../types';
import { DatabaseTransaction } from '../../../types/transaction';
import type { TrueLayerBalance } from '../../../types/bank/balance';
import { authRepository } from '../../../repositories/auth';

export class TrueLayerStorageService implements ITrueLayerStorageService {
  private encryption: EncryptionService;

  constructor() {
    console.log('💾 Initializing TrueLayerStorageService');
    this.encryption = new EncryptionService();
  }

  async storeTokens(userId: string, tokens: TokenResponse): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('bank_connections')
        .insert({
          user_id: userId,
          provider: 'truelayer',
          encrypted_access_token: this.encryption.encrypt(tokens.access_token),
          encrypted_refresh_token: tokens.refresh_token
            ? this.encryption.encrypt(tokens.refresh_token)
            : null,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000),
          status: 'active',
          disconnected_at: null,
        })
        .select()
        .single();

      if (error) {
        throw new TrueLayerError(
          'Failed to store tokens',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          error
        );
      }

      return data.id;
    } catch (error) {
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to store tokens',
        TrueLayerErrorCode.STORAGE_FAILED,
        undefined,
        error
      );
    }
  }

  async getStoredToken(userId: string, connectionId: string): Promise<string | null> {
    try {
      const connection = await this.getActiveConnection(userId, connectionId);
      if (!connection) {
        throw new TrueLayerError(
          'No active connection found',
          TrueLayerErrorCode.NO_ACTIVE_CONNECTION
        );
      }

      try {
        return this.encryption.decrypt(connection.encrypted_access_token);
      } catch (error) {
        throw new TrueLayerError(
          'Failed to decrypt token',
          TrueLayerErrorCode.ENCRYPTION_FAILED,
          undefined,
          error
        );
      }
    } catch (error) {
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to get stored token',
        TrueLayerErrorCode.STORAGE_FAILED,
        undefined,
        error
      );
    }
  }

  async storeTransactions(userId: string, transactions: DatabaseTransaction[]): Promise<void> {
    try {
      console.log(`💾 Storing ${transactions.length} transactions for user ${userId}`);

      // Map transactions to records, using their own connection_id
      const transactionRecords = transactions.map((transaction) => ({
        user_id: userId,
        connection_id: transaction.connection_id,
        transaction_id: transaction.id,
        timestamp: transaction.timestamp,
        description: transaction.description || '',
        amount: transaction.amount,
        currency: transaction.currency,
        transaction_type: transaction.transaction_type || 'unknown',
        transaction_category: transaction.transaction_category || 'Uncategorized',
        merchant_name: transaction.merchant_name || null,
      }));

      const { error } = await supabase.from('transactions').upsert(transactionRecords, {
        onConflict: 'user_id,transaction_id',
      });

      if (error) {
        console.error('❌ Failed to store transactions:', error);
        throw new TrueLayerError(
          'Failed to store transactions',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          error
        );
      }

      // Get unique connection IDs from the transactions
      const connectionIds = [...new Set(transactions.map((t) => t.connection_id))];

      // Update last_sync for each connection
      for (const connectionId of connectionIds) {
        const { error: updateError } = await supabase
          .from('bank_connections')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', connectionId);

        if (updateError) {
          console.error(
            `❌ Failed to update last_sync for connection ${connectionId}:`,
            updateError
          );
        }
      }

      console.log('✅ Successfully stored all transactions');
    } catch (error) {
      console.error('❌ Failed to store transactions:', error);
      throw new TrueLayerError(
        'Failed to store transactions',
        TrueLayerErrorCode.STORAGE_FAILED,
        undefined,
        error
      );
    }
  }

  async storeBalances(
    userId: string,
    connectionId: string,
    balances: BalanceResponse
  ): Promise<void> {
    try {
      console.log('💾 Storing balances for connection:', connectionId);

      // Store each balance in the response
      for (const balance of balances.results) {
        const { data: existingBalance, error: fetchError } = await supabase
          .from('balances')
          .select('id')
          .eq('user_id', userId)
          .eq('connection_id', connectionId)
          .eq('account_id', balance.account_id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new TrueLayerError(
            'Failed to check existing balance',
            TrueLayerErrorCode.STORAGE_FAILED,
            undefined,
            fetchError
          );
        }

        const balanceData = {
          user_id: userId,
          connection_id: connectionId,
          account_id: balance.account_id,
          current: balance.current,
          available: balance.available,
          currency: balance.currency,
          updated_at: balance.update_timestamp,
        };

        if (existingBalance) {
          // Update existing balance
          const { error: updateError } = await supabase
            .from('balances')
            .update(balanceData)
            .eq('id', existingBalance.id);

          if (updateError) {
            throw new TrueLayerError(
              'Failed to update balance',
              TrueLayerErrorCode.STORAGE_FAILED,
              undefined,
              updateError
            );
          }
        } else {
          // Insert new balance
          const { error: insertError } = await supabase.from('balances').insert([balanceData]);

          if (insertError) {
            throw new TrueLayerError(
              'Failed to insert balance',
              TrueLayerErrorCode.STORAGE_FAILED,
              undefined,
              insertError
            );
          }
        }
      }

      console.log('✅ Successfully stored balances');
    } catch (error) {
      console.error('❌ Failed to store balances:', error);
      throw error instanceof TrueLayerError
        ? error
        : new TrueLayerError(
            'Failed to store balances',
            TrueLayerErrorCode.STORAGE_FAILED,
            undefined,
            error
          );
    }
  }

  async getActiveConnection(userId: string, connectionId?: string): Promise<BankConnection | null> {
    try {
      let query = supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .not('encrypted_access_token', 'is', null);

      // If connectionId is provided, get that specific connection
      if (connectionId) {
        query = query.eq('id', connectionId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw new TrueLayerError(
          'Failed to get active connection',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          error
        );
      }

      return data as BankConnection;
    } catch (error) {
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to get active connection',
        TrueLayerErrorCode.STORAGE_FAILED,
        undefined,
        error
      );
    }
  }

  async disconnectBank(connectionId: string): Promise<void> {
    try {
      console.log('🔌 TrueLayerStorage: Disconnecting bank connection:', connectionId);

      const user = await authRepository.getUser();
      if (!user) {
        throw new TrueLayerError('User not authenticated', TrueLayerErrorCode.UNAUTHORIZED);
      }

      const { data, error } = await supabase.rpc('disconnect_bank', {
        p_connection_id: connectionId,
        p_user_id: user.id,
      });

      if (error) {
        console.error('❌ TrueLayerStorage: Disconnect failed:', error);
        throw new TrueLayerError(
          'Failed to disconnect bank',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          error
        );
      }

      // Log the deletion results
      if (data) {
        console.log('📊 Initial record counts:', data.counts.initial_counts);
        console.log('📊 Final record counts:', data.counts.final_counts);

        // Verify all counts are zero
        const finalCounts = data.counts.final_counts;
        const allZero = Object.values(finalCounts).every((count) => count === 0);

        if (!allZero) {
          console.error('⚠️ Warning: Not all records were deleted:', finalCounts);
        }
      }

      console.log('✅ TrueLayerStorage: Bank disconnected successfully');
    } catch (error) {
      console.error('❌ TrueLayerStorage: Disconnect error:', error);
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to disconnect bank',
        TrueLayerErrorCode.STORAGE_FAILED,
        undefined,
        error
      );
    }
  }

  async storeBankAccounts(
    userId: string,
    connectionId: string,
    accounts: BankAccount[]
  ): Promise<void> {
    try {
      console.log(`🏦 Storing ${accounts.length} bank accounts...`);

      // First verify the connection exists and belongs to the user
      const { data: connection, error: connectionError } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .single();

      if (connectionError || !connection) {
        console.error('❌ Bank connection not found or unauthorized:', connectionError);
        throw new TrueLayerError(
          'Bank connection not found or unauthorized',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          connectionError
        );
      }

      // Delete existing accounts for this connection to avoid conflicts
      const { error: deleteError } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('connection_id', connectionId);

      if (deleteError) {
        console.error('❌ Failed to clean up existing accounts:', deleteError);
        throw new TrueLayerError(
          'Failed to clean up existing accounts',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          deleteError
        );
      }

      // Map accounts to records
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

      // Insert new accounts
      const { error: insertError } = await supabase.from('bank_accounts').insert(accountRecords);

      if (insertError) {
        console.error('❌ Failed to store bank accounts:', insertError);
        throw new TrueLayerError(
          'Failed to store bank accounts',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          insertError
        );
      }

      console.log('✅ Bank accounts stored successfully');
    } catch (error) {
      console.error('❌ Failed to store bank accounts:', error);
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to store bank accounts',
        TrueLayerErrorCode.STORAGE_FAILED,
        undefined,
        error
      );
    }
  }
}
