import { supabase } from '../../supabase';
import { EncryptionService } from '../../encryption';
import {
  ITrueLayerStorageService,
  TokenResponse,
  BankConnection,
  TrueLayerError,
  TrueLayerErrorCode,
} from '../types';
import { Transaction } from '../../../types';

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

  async getStoredToken(userId: string): Promise<string | null> {
    try {
      const connection = await this.getActiveConnection(userId);
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

  async storeTransactions(userId: string, transactions: Transaction[]): Promise<void> {
    try {
      console.log(`💾 Storing ${transactions.length} transactions for user ${userId}`);

      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new TrueLayerError(
          'No active connection found',
          TrueLayerErrorCode.NO_ACTIVE_CONNECTION
        );
      }

      const transactionRecords = transactions.map((transaction) => ({
        user_id: userId,
        connection_id: connection.id,
        transaction_id: transaction.transaction_id,
        account_id: transaction.account_id || 'default',
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

      // Update last_sync on the connection
      const { error: updateError } = await supabase
        .from('bank_connections')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', connection.id);

      if (updateError) {
        console.error('❌ Failed to update last_sync:', updateError);
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

  async storeBalances(userId: string, connectionId: string, balanceData: any): Promise<void> {
    const { accounts, balances } = balanceData;

    // Update bank accounts
    for (const account of accounts.results) {
      const balance = balances.find((b: any) => b.account_id === account.account_id);
      if (!balance) continue;

      const { error: accountError } = await supabase.from('bank_accounts').upsert(
        {
          user_id: userId,
          connection_id: connectionId,
          account_id: account.account_id,
          account_type: account.account_type,
          account_name: account.display_name || account.account_type,
          currency: balance.currency,
          balance: balance.current,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,connection_id,account_id',
        }
      );

      if (accountError) throw accountError;
    }

    // Store balance records
    const balanceRecords = balances.map((balance: any) => ({
      user_id: userId,
      connection_id: connectionId,
      account_id: balance.account_id,
      current: balance.current,
      available: balance.available,
      currency: balance.currency,
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

  async getActiveConnection(userId: string): Promise<BankConnection | null> {
    try {
      const { data, error } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .not('encrypted_access_token', 'is', null)
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
      ];

      const results = await Promise.all(updates);
      const errors = results.filter((result) => result.error);

      if (errors.length > 0) {
        throw new TrueLayerError(
          'Failed to disconnect bank',
          TrueLayerErrorCode.STORAGE_FAILED,
          undefined,
          errors[0].error
        );
      }
    } catch (error) {
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
