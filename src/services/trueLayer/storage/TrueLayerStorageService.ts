import { supabase } from '../../supabase';
import { EncryptionService } from '../../encryption';
import {
  ITrueLayerStorageService,
  TokenResponse,
  BankConnection,
  TrueLayerError,
  TrueLayerErrorCode,
  BalanceResponse,
} from '../types';
import { DatabaseTransaction } from '../../../types/transaction';

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
        scheduled_date: transaction.scheduled_date || null,
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
      console.error('❌ Transaction storage error:', error);
      if (error instanceof TrueLayerError) throw error;
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
    balanceData: BalanceResponse
  ): Promise<void> {
    const balances = balanceData.results;

    // Store balance records
    const balanceRecords = balances.map((balance) => ({
      user_id: userId,
      connection_id: connectionId,
      current: balance.current,
      available: balance.available,
      currency: balance.currency,
      updated_at: balance.update_timestamp,
    }));

    const { error: balanceError } = await supabase.from('balances').insert(balanceRecords);
    if (balanceError) throw balanceError;

    // Update connection metadata
    await supabase
      .from('bank_connections')
      .update({
        last_sync: new Date().toISOString(),
      })
      .eq('id', connectionId);
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

      const updates = [
        supabase
          .from('bank_connections')
          .update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            encrypted_access_token: null,
            encrypted_refresh_token: null,
          })
          .eq('id', connectionId),
        supabase.from('bank_accounts').delete().eq('connection_id', connectionId),
        supabase.from('balances').delete().eq('connection_id', connectionId),
      ];

      console.log('🔌 TrueLayerStorage: Executing disconnect operations...');
      const results = await Promise.all(updates);
      const errors = results.filter((result) => result.error);

      if (errors.length > 0) {
        console.error('❌ TrueLayerStorage: Disconnect failed:', errors[0].error);
        throw new TrueLayerError(
          'Failed to disconnect bank',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          errors[0].error
        );
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
}
