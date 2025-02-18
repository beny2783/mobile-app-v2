import { BankAccount } from './balance';

export interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  status: 'active' | 'inactive' | 'error';
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  expires_at: string;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
  disconnected_at: string | null;
}

export interface BankConnectionWithAccounts extends BankConnection {
  account_count?: number;
  last_sync_status?: 'pending' | 'needs_update' | 'success';
  bank_accounts?: { count: number }[];
}
