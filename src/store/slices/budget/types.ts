import { CategoryTarget, TargetSummary } from '../../../types/target';

export interface BudgetState {
  categoryTargets: CategoryTarget[];
  targetSummary: TargetSummary | null;
  loading: boolean;
  error: string | null;
}

export interface CreateCategoryTargetInput {
  category: string;
  target_limit: number;
  current_amount: number;
  color: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_start: string;
}

export interface UpdateCategoryTargetInput {
  target_limit?: number;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_start?: string;
  color?: string;
}
