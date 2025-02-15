import { TrueLayerApiService } from './api/TrueLayerApiService';
import { TrueLayerStorageService } from './storage/TrueLayerStorageService';
import { TrueLayerTransactionService } from './transaction/TrueLayerTransactionService';
import { TrueLayerConfig, TrueLayerError, TrueLayerErrorCode } from './types';
import { Transaction } from '../../types';
import { supabase } from '../supabase';
import { authRepository } from '../../repositories/auth';

export class TrueLayerService {
  protected apiService: TrueLayerApiService;
  protected storageService: TrueLayerStorageService;
  protected transactionService: TrueLayerTransactionService;

  constructor(config: TrueLayerConfig) {
    this.storageService = new TrueLayerStorageService();
    this.apiService = new TrueLayerApiService(config, this.storageService);
    this.transactionService = new TrueLayerTransactionService(this.apiService, this.storageService);
  }

  getAuthUrl(): string {
    return this.apiService.getAuthUrl();
  }

  async exchangeCode(code: string): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('No authenticated user found');

    const tokens = await this.apiService.exchangeToken(code);
    const connectionId = await this.storageService.storeTokens(user.id, tokens);

    // Initialize connection by fetching initial data
    await this.initializeConnection(user.id, connectionId);
  }

  async fetchTransactions(fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('No authenticated user found');

    // Get all active connections for the user
    const { data: connections, error: connError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .is('disconnected_at', null);

    if (connError) throw new Error('Failed to fetch bank connections');
    if (!connections?.length) throw new Error('No active bank connections found');

    // Fetch and merge transactions from all connections
    const allTransactions: Transaction[] = [];
    for (const connection of connections) {
      try {
        const token = await this.storageService.getStoredToken(user.id, connection.id);
        if (!token) continue;

        const transactions = await this.apiService.fetchTransactions(token, fromDate, toDate);
        const processedTransactions = await this.transactionService.processTransactions(
          transactions.map((t) => ({ ...t, connection_id: connection.id }))
        );
        allTransactions.push(...processedTransactions);
      } catch (error) {
        console.error(`Failed to fetch transactions for connection ${connection.id}:`, error);
        // Continue with other connections even if one fails
        continue;
      }
    }

    return this.transactionService.categorizeTransactions(allTransactions);
  }

  async disconnectBank(connectionId: string): Promise<void> {
    await this.storageService.disconnectBank(connectionId);
  }

  private async initializeConnection(userId: string, connectionId: string): Promise<void> {
    try {
      const token = await this.storageService.getStoredToken(userId, connectionId);
      if (!token) throw new Error('No valid token available');

      // First fetch and store balances to ensure accounts are created
      console.log('📊 Fetching initial balances...');
      const balances = await this.apiService.fetchBalances(token);
      await this.storageService.storeBalances(userId, connectionId, balances);

      // Then fetch and store transactions
      console.log('💳 Fetching initial transactions...');
      const transactions = await this.apiService.fetchTransactions(token);

      // Add connection_id to transactions and make transaction_id unique
      const transactionsWithConnection = transactions.map((t) => ({
        ...t,
        connection_id: connectionId,
        transaction_id: `${connectionId}_${t.transaction_id}`,
      }));

      const processedTransactions = await this.transactionService.processTransactions(
        transactionsWithConnection
      );

      console.log(`📝 Storing ${processedTransactions.length} transactions...`);
      await this.storageService.storeTransactions(userId, processedTransactions);

      console.log('✅ Bank connection initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize bank connection:', error);
      // Clean up the connection if initialization fails
      await this.storageService.disconnectBank(connectionId);
      throw error;
    }
  }

  async fetchTransactionsForConnection(
    connectionId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<Transaction[]> {
    try {
      console.log(`🔄 Fetching transactions for connection ${connectionId}`);

      // Get the stored token for this connection
      const user = await authRepository.getUser();
      if (!user) {
        throw new TrueLayerError('No authenticated user found', TrueLayerErrorCode.UNAUTHORIZED);
      }

      const token = await this.storageService.getStoredToken(user.id, connectionId);
      if (!token) {
        throw new TrueLayerError(
          'No token found for connection',
          TrueLayerErrorCode.NO_ACTIVE_CONNECTION
        );
      }

      // Fetch transactions using the token
      const transactions = await this.apiService.fetchTransactions(token, fromDate, toDate);

      // Add connection_id to each transaction and make transaction_id unique
      const transactionsWithConnection = transactions.map((t: Transaction) => ({
        ...t,
        connection_id: connectionId,
        transaction_id: `${connectionId}_${t.transaction_id}`,
      }));

      console.log(
        `✅ Fetched ${transactionsWithConnection.length} transactions for connection ${connectionId}`
      );
      return transactionsWithConnection;
    } catch (error) {
      console.error(`❌ Failed to fetch transactions for connection ${connectionId}:`, error);
      if (error instanceof TrueLayerError) throw error;
      throw new TrueLayerError(
        'Failed to fetch transactions for connection',
        TrueLayerErrorCode.FETCH_TRANSACTIONS_FAILED,
        undefined,
        error
      );
    }
  }
}
