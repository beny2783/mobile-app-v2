export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  criteria: ChallengeCriteria;
  reward_xp: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChallengeCriteria {
  type:
    | 'no_spend'
    | 'reduced_spending'
    | 'savings'
    | 'streak'
    | 'category_budget'
    | 'smart_shopping';
  max_spend?: number;
  exclude_categories?: string[];
  reduction_target?: number;
  savings_target?: number;
  streak_target?: number;
  category_budgets?: Record<string, number>;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: 'active' | 'completed' | 'failed';
  progress: Record<string, any>;
  streak_count: number;
  started_at: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  transaction_id: string;
  account_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: 'credit' | 'debit';
  transaction_category: string;
  merchant_name: string;
}
