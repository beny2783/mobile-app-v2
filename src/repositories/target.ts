import { supabase } from '../services/supabase';
import { RepositoryError, RepositoryErrorCode, TargetRepository } from './types';
import { authRepository } from './auth';
import {
  Target,
  CategoryTarget,
  TargetAchievement,
  DailySpending,
  TargetSummary,
  CreateTargetInput,
  UpdateTargetInput,
  CreateCategoryTargetInput,
  UpdateCategoryTargetInput,
  CreateTargetAchievementInput,
  CreateDailySpendingInput,
  UpdateDailySpendingInput,
} from '../types/target';

export class SupabaseTargetRepository implements TargetRepository {
  constructor() {
    console.log('[TargetRepository] Initialized');
  }

  private handleError(
    error: any,
    code: RepositoryErrorCode = RepositoryErrorCode.STORAGE_FAILED
  ): never {
    console.error('[TargetRepository] Error:', error);
    const repoError = new Error(error.message || 'Repository operation failed') as RepositoryError;
    repoError.code = code;
    repoError.statusCode = error.status || 500;
    repoError.originalError = error;
    throw repoError;
  }

  // Core target operations
  async getTargets(userId: string): Promise<Target[]> {
    try {
      const { data, error } = await supabase.from('targets').select('*').eq('user_id', userId);

      if (error) throw this.handleError(error);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTargetById(targetId: string): Promise<Target | null> {
    try {
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('id', targetId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw this.handleError(error);
      }
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createTarget(target: CreateTargetInput): Promise<Target> {
    try {
      const { data, error } = await supabase.from('targets').insert([target]).select().single();

      if (error) throw this.handleError(error);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateTarget(targetId: string, target: UpdateTargetInput): Promise<Target> {
    try {
      const { data, error } = await supabase
        .from('targets')
        .update(target)
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw this.handleError(error);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteTarget(targetId: string): Promise<void> {
    try {
      const { error } = await supabase.from('targets').delete().eq('id', targetId);

      if (error) throw this.handleError(error);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Category target operations
  async getCategoryTargets(userId: string): Promise<CategoryTarget[]> {
    try {
      const { data, error } = await supabase
        .from('category_targets')
        .select('*')
        .eq('user_id', userId);

      if (error) throw this.handleError(error);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCategoryTargetByCategory(
    userId: string,
    category: string
  ): Promise<CategoryTarget | null> {
    try {
      const { data, error } = await supabase
        .from('category_targets')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw this.handleError(error);
      }
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCategoryTarget(target: CreateCategoryTargetInput): Promise<CategoryTarget> {
    try {
      const { data, error } = await supabase
        .from('category_targets')
        .insert([target])
        .select()
        .single();

      if (error) throw this.handleError(error);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCategoryTarget(
    userId: string,
    category: string,
    target: UpdateCategoryTargetInput
  ): Promise<CategoryTarget> {
    try {
      const { data, error } = await supabase
        .from('category_targets')
        .update(target)
        .eq('user_id', userId)
        .eq('category', category)
        .select()
        .single();

      if (error) throw this.handleError(error);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCategoryTarget(userId: string, category: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('category_targets')
        .delete()
        .eq('user_id', userId)
        .eq('category', category);

      if (error) throw this.handleError(error);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Achievement operations
  async getAchievements(userId: string): Promise<TargetAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('target_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });

      if (error) throw this.handleError(error);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAchievementsByTarget(targetId: string): Promise<TargetAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('target_achievements')
        .select('*')
        .eq('target_id', targetId)
        .order('achieved_at', { ascending: false });

      if (error) throw this.handleError(error);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createAchievement(achievement: CreateTargetAchievementInput): Promise<TargetAchievement> {
    try {
      const { data, error } = await supabase
        .from('target_achievements')
        .insert([achievement])
        .select()
        .single();

      if (error) throw this.handleError(error);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Daily spending operations
  async getDailySpending(userId: string, startDate: Date, endDate: Date): Promise<DailySpending[]> {
    try {
      const { data, error } = await supabase
        .from('daily_spending')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: true });

      if (error) throw this.handleError(error);
      return data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createDailySpending(spending: CreateDailySpendingInput): Promise<DailySpending> {
    try {
      const { data, error } = await supabase
        .from('daily_spending')
        .insert([spending])
        .select()
        .single();

      if (error) throw this.handleError(error);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateDailySpending(
    userId: string,
    date: string,
    spending: UpdateDailySpendingInput
  ): Promise<DailySpending> {
    try {
      const { data, error } = await supabase
        .from('daily_spending')
        .update(spending)
        .eq('user_id', userId)
        .eq('date', date)
        .select()
        .single();

      if (error) throw this.handleError(error);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Summary operations
  async getTargetSummary(userId: string): Promise<TargetSummary> {
    try {
      // Get monthly spending target
      const { data: spendingTarget, error: spendingError } = await supabase
        .from('targets')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'spending')
        .eq('period', 'monthly')
        .single();

      if (spendingError && spendingError.code !== 'PGRST116') throw this.handleError(spendingError);

      // Get monthly savings target
      const { data: savingsTarget, error: savingsError } = await supabase
        .from('targets')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'saving')
        .eq('period', 'monthly')
        .single();

      if (savingsError && savingsError.code !== 'PGRST116') throw this.handleError(savingsError);

      // Get category targets
      const categoryTargets = await this.getCategoryTargets(userId);

      // Get recent achievements
      const achievements = await this.getAchievements(userId);

      // Get trend data for the last 7 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data: trendData, error: trendError } = await supabase
        .from('daily_spending')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true });

      if (trendError) throw this.handleError(trendError);

      return {
        monthlySpendingLimit: spendingTarget?.amount || 0,
        currentSpending: spendingTarget?.current_amount || 0,
        savingsGoal: savingsTarget?.amount || 0,
        currentSavings: savingsTarget?.current_amount || 0,
        categoryTargets,
        trendData: {
          labels: trendData.map((d) =>
            new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' })
          ),
          spending: trendData.map((d) => d.amount),
          target: trendData.map(() => (spendingTarget?.amount || 0) / 30), // Daily target
        },
        achievements: achievements.slice(0, 3).map((a) => ({
          title: a.title,
          description: a.description,
          icon: a.icon,
          color: a.color,
        })),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

// Export a factory function
export const createTargetRepository = (): TargetRepository => {
  return new SupabaseTargetRepository();
};
