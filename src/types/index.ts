export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile extends User {
  updated_at: string;
}

export interface Transaction {
  id: string;
  connection_id: string;
  amount: number;
  currency: string;
  description: string;
  merchant_name?: string;
  timestamp: string;
  transaction_type?: string;
  transaction_category?: string;
  scheduled_date?: string; // Date string for scheduled future transactions
  category: string;
  date: string;
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
  type: 'reduced_spending';
  target_amount: number;
  category: string;
  start_date: string;
  end_date: string;
}

export interface ChallengeProgress {
  isCompleted: boolean;
  isFailed: boolean;
  progress: {
    category_spent: number;
    total_spent: number;
  };
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

// Re-export all types from their respective domains
export * from './auth';
export * from './bank';
export * from './transaction';
export * from './challenge';
export * from './shared';
export * from './navigation';
export * from './target';
