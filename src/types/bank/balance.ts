/**
 * Core balance types for the banking system
 */

/**
 * Represents a basic balance record
 */
export interface Balance {
  account_id: string;
  current: number;
  available: number;
  currency: string;
  updated_at: string;
}

/**
 * Represents a bank account
 */
export interface BankAccount {
  account_id: string;
  account_type: string;
  account_name: string;
  balance: number;
  currency: string;
  last_updated: string;
}

/**
 * Balance information specific to TrueLayer's API
 */
export interface TrueLayerBalance {
  account_id: string;
  current: number;
  available: number;
  currency: string;
  update_timestamp: string;
}

/**
 * Response structure from TrueLayer's balance endpoint
 */
export interface BalanceResponse {
  results: TrueLayerBalance[];
  status: 'succeeded' | 'failed' | 'pending';
}

/**
 * Represents balances grouped by bank connection
 */
export interface GroupedBalances {
  connection_id: string;
  provider_name: string;
  accounts: Array<BankAccount>;
}

/**
 * Balance data point for historical analysis
 */
export interface BalancePoint {
  date: string;
  balance: number;
  transactions?: Array<{
    id: string;
    amount: number;
    description: string;
  }>;
}

/**
 * Account balance with additional metadata
 */
export interface AccountBalance extends BankAccount {
  account_id: string;
  balance: number;
  currency: string;
  account_name: string;
  account_type: string;
  last_updated: string;
}

/**
 * Balance data for analysis and forecasting
 */
export interface BalanceData {
  current: number;
  projected: number;
  history: BalancePoint[];
  forecast: BalancePoint[];
  currency: string;
  last_updated: string;
}

// Re-export from existing locations to maintain backward compatibility
export type { Balance as CoreBalance } from '../../repositories/balance';
export type { Balance as ProviderBalance } from '../../services/trueLayer/types';
