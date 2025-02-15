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

export interface Balance {
  account_id: string;
  currency: string;
  available: number;
  current: number;
  last_updated?: string;
}

export interface Account {
  account_id: string;
  account_type: string;
  display_name?: string;
  currency: string;
}

export interface BalanceResponse {
  accounts: {
    results: Account[];
  };
  balances: Balance[];
}

export interface ITrueLayerApiService {
  getAuthUrl(): string;
  exchangeToken(code: string): Promise<TokenResponse>;
  fetchTransactions(token: string, fromDate?: Date, toDate?: Date): Promise<Transaction[]>;
  fetchTransactionsForConnection(
    connectionId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<Transaction[]>;
  fetchBalances(token: string): Promise<BalanceResponse>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
}

export interface ITrueLayerStorageService {
  storeTokens(userId: string, tokens: TokenResponse): Promise<string>;
  getStoredToken(userId: string, connectionId: string): Promise<string | null>;
  storeTransactions(userId: string, transactions: Transaction[]): Promise<void>;
  storeBalances(userId: string, connectionId: string, balances: any): Promise<void>;
  getActiveConnection(userId: string, connectionId?: string): Promise<BankConnection | null>;
  disconnectBank(connectionId: string): Promise<void>;
}

export interface ITrueLayerTransactionService {
  processTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  categorizeTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  updateTransactionHistory(userId: string, days?: number): Promise<void>;
}

export class TrueLayerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'TrueLayerError';
  }
}

export enum TrueLayerErrorCode {
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  FETCH_ACCOUNTS_FAILED = 'FETCH_ACCOUNTS_FAILED',
  FETCH_TRANSACTIONS_FAILED = 'FETCH_TRANSACTIONS_FAILED',
  FETCH_BALANCES_FAILED = 'FETCH_BALANCES_FAILED',
  NO_ACTIVE_CONNECTION = 'NO_ACTIVE_CONNECTION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  STORAGE_FAILED = 'STORAGE_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
