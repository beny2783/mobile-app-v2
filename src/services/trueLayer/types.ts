import { Balance, BankAccount, BalanceResponse } from '../../types/bank/balance';
import { BankConnection } from '../../types/bank/connection';
import { DatabaseGroupedBalances } from '../../types/bank/database';
import { DatabaseTransaction } from '../../types/transaction';

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

export interface ITrueLayerApiService {
  getAuthUrl(): string;
  exchangeToken(code: string): Promise<TokenResponse>;
  fetchTransactions(token: string, fromDate?: Date, toDate?: Date): Promise<DatabaseTransaction[]>;
  fetchTransactionsForConnection(
    connectionId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<DatabaseTransaction[]>;
  fetchBalances(token: string): Promise<BalanceResponse>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
}

export interface ITrueLayerStorageService {
  storeTokens(userId: string, tokens: TokenResponse): Promise<string>;
  getStoredToken(userId: string, connectionId: string): Promise<string | null>;
  storeTransactions(userId: string, transactions: DatabaseTransaction[]): Promise<void>;
  storeBalances(userId: string, connectionId: string, balances: BalanceResponse): Promise<void>;
  getActiveConnection(
    userId: string,
    connectionId?: string
  ): Promise<DatabaseGroupedBalances['connection'] | null>;
  disconnectBank(connectionId: string): Promise<void>;
}

export interface ITrueLayerTransactionService {
  processTransactions(
    transactions: TrueLayerTransaction[],
    connectionId: string
  ): Promise<ProcessedTransaction[]>;
}

export interface TrueLayerClient {
  exchangeCode(code: string): Promise<void>;
  getTransactions(connectionId: string): Promise<TrueLayerTransaction[]>;
}

export interface TrueLayerTransaction {
  id?: string;
  connection_id?: string;
  timestamp: string;
  amount: number;
  currency: string;
  description: string;
}

export interface ProcessedTransaction extends TrueLayerTransaction {
  id: string;
  connection_id: string;
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

export { Balance, BankAccount, BankConnection, BalanceResponse };
