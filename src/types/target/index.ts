// Target period and type enums to match database
export type TargetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TargetType = 'spending' | 'saving';

// Base target interface matching the targets table
export interface Target {
  id: string;
  user_id: string;
  type: TargetType;
  amount: number;
  current_amount: number;
  period: TargetPeriod;
  category?: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

// Category target interface matching the category_targets table
export interface CategoryTarget {
  id: string;
  user_id: string;
  category: string;
  target_limit: number;
  current_amount: number;
  color: string;
  period: TargetPeriod;
  period_start: string;
  created_at: string;
  updated_at: string;
}

// Target achievement interface matching the target_achievements table
export interface TargetAchievement {
  id: string;
  user_id: string;
  target_id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  achieved_at: string;
  created_at: string;
}

// Daily spending interface matching the daily_spending table
export interface DailySpending {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

// Interface for target summary data used in the UI
export interface TargetSummary {
  monthlySpendingLimit: number;
  currentSpending: number;
  savingsGoal: number;
  currentSavings: number;
  categoryTargets: CategoryTarget[];
  trendData: {
    labels: string[];
    spending: number[];
    target: number[];
  };
  achievements: {
    title: string;
    description: string;
    icon: string;
    color: string;
  }[];
}

// Input types for creating/updating targets
export type CreateTargetInput = Omit<Target, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTargetInput = Partial<Omit<Target, 'id' | 'created_at' | 'updated_at'>>;

export type CreateCategoryTargetInput = Omit<
  CategoryTarget,
  'id' | 'created_at' | 'updated_at' | 'user_id'
>;
export type UpdateCategoryTargetInput = Partial<
  Omit<CategoryTarget, 'id' | 'created_at' | 'updated_at'>
>;

export type CreateTargetAchievementInput = Omit<TargetAchievement, 'id' | 'created_at'>;

export type CreateDailySpendingInput = Omit<DailySpending, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDailySpendingInput = Partial<
  Omit<DailySpending, 'id' | 'created_at' | 'updated_at'>
>;
