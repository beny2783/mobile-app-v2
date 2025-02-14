import { Transaction } from '../../types';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface TrueLayerConfig {
  clientId: string;
  redirectUri: string;
  enableMock?: boolean;
}

export interface TrueLayerApiConfig {
  baseUrl: string;
  loginUrl: string;
  clientId: string;
  redirectUri: string;
}

export interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  status: string;
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  expires_at: Date;
  disconnected_at?: Date;
  last_sync?: Date;
  bank_name?: string;
}

export interface ITrueLayerApiService {
  getAuthUrl(): string;
  exchangeToken(code: string): Promise<TokenResponse>;
  fetchTransactions(token: string, fromDate?: Date, toDate?: Date): Promise<Transaction[]>;
  fetchBalances(token: string): Promise<any>; // TODO: Define proper balance types
  refreshToken(refreshToken: string): Promise<TokenResponse>;
}

export interface ITrueLayerStorageService {
  storeTokens(userId: string, tokens: TokenResponse): Promise<string>;
  getStoredToken(userId: string): Promise<string | null>;
  storeTransactions(userId: string, transactions: Transaction[]): Promise<void>;
  storeBalances(userId: string, connectionId: string, balances: any): Promise<void>;
  getActiveConnection(userId: string): Promise<BankConnection | null>;
  disconnectBank(connectionId: string): Promise<void>;
}

export interface ITrueLayerTransactionService {
  processTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  categorizeTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  updateTransactionHistory(userId: string, days?: number): Promise<void>;
}
