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

    const token = await this.storageService.getStoredToken(user.id);
    if (!token) throw new Error('No valid token available');

    const transactions = await this.apiService.fetchTransactions(token, fromDate, toDate);
    const processedTransactions = await this.transactionService.processTransactions(transactions);
    return this.transactionService.categorizeTransactions(processedTransactions);
  }

  async disconnectBank(connectionId: string): Promise<void> {
    await this.storageService.disconnectBank(connectionId);
  }

  private async initializeConnection(userId: string, connectionId: string): Promise<void> {
    const token = await this.storageService.getStoredToken(userId);
    if (!token) throw new Error('No valid token available');

    // Fetch both initial transactions and balances
    const [transactions, balances] = await Promise.all([
      this.apiService.fetchTransactions(token),
      this.apiService.fetchBalances(token),
    ]);

    // Process and store the data
    await Promise.all([
      this.transactionService
        .processTransactions(transactions)
        .then((processedTransactions) =>
          this.storageService.storeTransactions(userId, processedTransactions)
        ),
      this.storageService.storeBalances(userId, connectionId, balances),
    ]);
  }
}
