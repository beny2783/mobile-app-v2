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

// Gamification Types

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'achievement';
  criteria: ChallengeCriteria;
  reward_xp: number;
  reward_badge?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ChallengeCriteria = {
  type:
    | 'no_spend'
    | 'reduced_spending'
    | 'spending_reduction'
    | 'savings'
    | 'streak'
    | 'category_budget'
    | 'smart_shopping';
  duration?: string;
  exclude_categories?: string[];
  max_spend?: number;
  category?: string;
  time_window?: string;
  days?: string[];
  reduction_target?: number;
  min_transactions?: number;
  target?: number;
  currency?: string;
  condition?: string;
  all_categories?: boolean;
  target_savings?: number;
};

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: 'active' | 'completed' | 'failed';
  progress: Record<string, any>;
  streak_count: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  badge_name: string;
  earned_at: string;
  metadata: Record<string, any>;
}

export interface UserProgress {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  created_at: string;
  updated_at: string;
}
