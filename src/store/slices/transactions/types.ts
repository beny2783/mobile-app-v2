import { EntityState } from '@reduxjs/toolkit';
import {
  BaseTransaction,
  DatabaseTransaction,
  Transaction,
  TransactionFilters,
  MerchantCategory,
} from '../../../types/transaction';

export interface TransactionState {
  // Normalized transaction data
  transactions: EntityState<Transaction, string>;

  // Categories
  categories: string[];
  merchantCategories: MerchantCategory[];

  // Filters and UI state
  filters: {
    dateRange: {
      from: string;
      to: string;
    };
    category: string | null;
    bankId: string | null;
    searchQuery: string;
  };

  // Loading states
  loading: {
    transactions: boolean;
    categories: boolean;
    sync: boolean;
  };

  // Error states
  errors: {
    transactions: string | null;
    categories: string | null;
    sync: string | null;
  };

  // Sync metadata
  lastSyncTime: {
    [connectionId: string]: string | null;
  };

  // Pattern detection
  patterns: {
    recurring: {
      pattern: string;
      amount: number;
      frequency: number; // in days
    }[];
    seasonal: {
      month: number;
      adjustment: number;
    }[];
    scheduled: {
      amount: number;
      date: string;
    }[];
  };
}

// Action Payloads
export interface FetchTransactionsPayload {
  filters: TransactionFilters;
}

export interface UpdateTransactionCategoryPayload {
  transactionId: string;
  category: string;
}

export interface SyncTransactionsPayload {
  connectionId: string;
  fromDate: string;
  toDate: string;
}

export interface SetFiltersPayload {
  dateRange?: {
    from: string;
    to: string;
  };
  category?: string | null;
  bankId?: string | null;
  searchQuery?: string;
}

// Thunk Results
export interface SyncTransactionsResult {
  connectionId: string;
  syncedTransactions: number;
  lastSyncTime: string;
}

// Selectors Input
export interface TransactionSelectionCriteria extends TransactionFilters {
  includePatterns?: boolean;
  includeTotals?: boolean;
}

// Selector Results
export interface TransactionGroup {
  title: string;
  data: Transaction[];
  totalAmount: number;
  bankTotals: {
    [bankId: string]: {
      amount: number;
      name: string;
    };
  };
}

export interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  categoryBreakdown: {
    [category: string]: {
      count: number;
      total: number;
      percentage: number;
    };
  };
}
