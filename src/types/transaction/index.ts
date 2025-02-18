// Core transaction interface that all transaction types must implement
export interface BaseTransaction {
  id: string;
  amount: number;
  currency: string;
  description: string;
  merchant_name?: string;
  transaction_category?: string;
  metadata?: {
    [key: string]: any;
  };
}

// Transaction type used in the database/API layer
export interface DatabaseTransaction extends BaseTransaction {
  user_id: string;
  connection_id: string;
  timestamp: string;
  transaction_type?: string;
  scheduled_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Transaction type used in the UI/analysis layer - extends DatabaseTransaction to ensure compatibility
export interface Transaction extends DatabaseTransaction {
  // Additional UI-specific fields
  processed_at?: string;
  display_name?: string;
}

// Re-export transaction types from existing locations
export type {
  TransactionFilters,
  MerchantCategory,
  TransactionRepository,
} from '../../repositories/types';

export type {
  TransactionPattern,
  SeasonalPattern,
  ScheduledTransaction,
  TransactionPatterns,
} from '../../hooks/useTransactionPatterns';

// Re-export insights
export * from './insights';
