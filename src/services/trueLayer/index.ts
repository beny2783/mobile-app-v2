import { TrueLayerApiService } from './api/TrueLayerApiService';
import { TrueLayerStorageService } from './storage/TrueLayerStorageService';
import { TrueLayerTransactionService } from './transaction/TrueLayerTransactionService';
import { TrueLayerConfig } from './types';
import { Transaction } from '../../types';
import { supabase } from '../supabase';

export class TrueLayerService {
  private apiService: TrueLayerApiService;
  private storageService: TrueLayerStorageService;
  private transactionService: TrueLayerTransactionService;

  constructor(config: TrueLayerConfig) {
    this.apiService = new TrueLayerApiService(config);
    this.storageService = new TrueLayerStorageService();
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
      const processedTransactions = await this.transactionService.processTransactions(transactions);

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
}
