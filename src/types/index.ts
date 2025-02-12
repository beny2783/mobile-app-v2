export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile extends User {
  updated_at: string;
}

export interface Transaction {
  transaction_id: string;
  account_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  merchant_name?: string;
}

export type AppTabParamList = {
  ConnectBank: undefined;
  Balances: undefined;
  Transactions: undefined;
  Profile: undefined;
  Callback: { url: string } | undefined;
};
