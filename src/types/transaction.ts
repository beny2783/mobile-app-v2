export interface Transaction {
  id: string;
  user_id: string;
  transaction_id: string;
  account_id?: string;
  connection_id: string;
  timestamp: string;
  date?: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  merchant_name: string | null;
  created_at: string;
  updated_at?: string;
}
