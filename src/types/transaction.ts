export interface Transaction {
  id: string;
  user_id: string;
  connection_id: string;
  account_id: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  category?: string;
  merchant_name?: string;
  type: 'credit' | 'debit';
  created_at: string;
  updated_at: string;
  metadata?: {
    [key: string]: any;
  };
}
