import { Transaction } from '../types';

export interface TransactionFilters {
  fromDate?: Date;
  toDate?: Date;
  category?: string;
  connectionId?: string;
  searchQuery?: string;
}

export interface MerchantCategory {
  category: string;
  merchant_pattern: string;
}

export interface TransactionRepository {
  // Core transaction operations
  getTransactions(filters: TransactionFilters): Promise<Transaction[]>;
  getTransactionById(transactionId: string): Promise<Transaction | null>;
  storeTransactions(transactions: Transaction[]): Promise<void>;

  // Category operations
  getCategories(): Promise<string[]>;
  getMerchantCategories(): Promise<MerchantCategory[]>;
  categorizeTransaction(transaction: Transaction): string;
  updateTransactionCategory(transactionId: string, category: string): Promise<void>;

  // Sync operations
  syncTransactions(connectionId: string, fromDate: Date, toDate: Date): Promise<void>;
  getLastSyncTime(connectionId: string): Promise<Date | null>;

  // Cleanup operations
  deleteTransactionsByConnectionId(connectionId: string): Promise<void>;
}

export interface RepositoryError extends Error {
  code: string;
  statusCode?: number;
  originalError?: any;
}

export enum RepositoryErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SYNC_FAILED = 'SYNC_FAILED',
  STORAGE_FAILED = 'STORAGE_FAILED',
  INVALID_DATA = 'INVALID_DATA',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}
