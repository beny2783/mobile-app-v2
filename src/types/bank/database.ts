import { Balance, BankAccount as BaseBankAccount } from './balance';

/**
 * Database-specific balance record that extends the core Balance type
 */
export interface DatabaseBalance extends Balance {
  id: string;
  user_id: string;
  connection_id: string;
  created_at: string;
}

/**
 * Database-specific bank account record
 */
export interface DatabaseBankAccount extends BaseBankAccount {
  id: string;
  user_id: string;
  connection_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database-specific grouped balances with connection details
 */
export interface DatabaseGroupedBalances {
  connection: {
    id: string;
    provider: string;
    status: string;
    created_at: string;
    updated_at: string;
    bank_name?: string;
  };
  accounts: DatabaseBankAccount[];
}
