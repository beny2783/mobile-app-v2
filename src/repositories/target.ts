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
  TargetPeriod,
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
  private async recalculateTargetAmounts(targets: CategoryTarget[]): Promise<CategoryTarget[]> {
    try {
      const user = await authRepository.getUser();
      if (!user) throw new Error('User not authenticated');

      const updatedTargets = await Promise.all(
        targets.map(async (target) => {
          const currentAmount = await this.calculateCategoryTargetAmount(
            user.id,
            target.category,
            target.period_start,
            target.period
          );

          if (currentAmount !== target.current_amount) {
            console.log('[TargetRepository] Updating target amount:', {
              category: target.category,
              oldAmount: target.current_amount,
              newAmount: currentAmount,
            });

            const { data: updatedTarget, error } = await supabase
              .from('category_targets')
              .update({ current_amount: currentAmount })
              .eq('id', target.id)
              .select()
              .single();

            if (error) throw this.handleError(error);
            return updatedTarget;
          }

          return target;
        })
      );

      return updatedTargets;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCategoryTargets(userId: string): Promise<CategoryTarget[]> {
    try {
      const { data, error } = await supabase
        .from('category_targets')
        .select('*')
        .eq('user_id', userId);

      if (error) throw this.handleError(error);

      // Recalculate amounts for all targets
      const targets = data || [];
      return await this.recalculateTargetAmounts(targets);
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

  private async calculateCategoryTargetAmount(
    userId: string,
    category: string,
    periodStart: string,
    period: TargetPeriod
  ): Promise<number> {
    try {
      // Normalize the period start date to the beginning of the period
      const now = new Date();
      let periodStartDate = new Date(now);
      let periodEndDate: Date;

      // Calculate period boundaries
      switch (period) {
        case 'daily':
          // Start from beginning of current day
          periodStartDate.setHours(0, 0, 0, 0);
          periodEndDate = new Date(periodStartDate);
          periodEndDate.setDate(periodEndDate.getDate() + 1);
          break;
        case 'weekly':
          // Start from beginning of current week (assuming Monday is first day)
          const day = periodStartDate.getDay();
          const diff = periodStartDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
          periodStartDate = new Date(periodStartDate.setDate(diff));
          periodStartDate.setHours(0, 0, 0, 0);
          periodEndDate = new Date(periodStartDate);
          periodEndDate.setDate(periodEndDate.getDate() + 7);
          break;
        case 'monthly':
          // Start from beginning of current month
          periodStartDate.setDate(1);
          periodStartDate.setHours(0, 0, 0, 0);
          periodEndDate = new Date(periodStartDate);
          periodEndDate.setMonth(periodEndDate.getMonth() + 1);
          break;
        case 'yearly':
          // Start from beginning of current year
          periodStartDate = new Date(periodStartDate.getFullYear(), 0, 1);
          periodEndDate = new Date(periodStartDate);
          periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
          break;
      }

      console.log('[TargetRepository] Calculating amount for period:', {
        category,
        periodStart: periodStartDate,
        periodEnd: periodEndDate,
        period,
      });

      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_category', category)
        .gte('timestamp', periodStartDate.toISOString())
        .lt('timestamp', periodEndDate.toISOString());

      if (error) throw this.handleError(error);

      const total = data?.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0) || 0;
      console.log('[TargetRepository] Calculated amount:', {
        category,
        total,
        transactionCount: data?.length,
        firstTransaction: data?.[0],
        lastTransaction: data?.[data?.length - 1],
      });

      return total;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCategoryTarget(target: CreateCategoryTargetInput): Promise<CategoryTarget> {
    try {
      const user = await authRepository.getUser();
      if (!user) throw new Error('User not authenticated');

      // First create the target
      const { data: newTarget, error: createError } = await supabase
        .from('category_targets')
        .insert([{ ...target, user_id: user.id }])
        .select()
        .single();

      if (createError) throw this.handleError(createError);

      // Calculate initial amount based on existing transactions
      const currentAmount = await this.calculateCategoryTargetAmount(
        user.id,
        target.category,
        newTarget.period_start,
        target.period
      );

      // Update the target with the calculated amount if it's not zero
      if (currentAmount > 0) {
        const { data: updatedTarget, error: updateError } = await supabase
          .from('category_targets')
          .update({ current_amount: currentAmount })
          .eq('id', newTarget.id)
          .select()
          .single();

        if (updateError) throw this.handleError(updateError);
        return updatedTarget;
      }

      return newTarget;
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

  async recategorizeTransactions(): Promise<void> {
    try {
      const user = await authRepository.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get all transactions
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) throw this.handleError(fetchError);
      if (!transactions) return;

      console.log('[TargetRepository] Recategorizing transactions:', {
        total: transactions.length,
        uncategorized: transactions.filter(
          (t) => !t.transaction_category || t.transaction_category === 'Uncategorized'
        ).length,
      });

      // Get merchant patterns
      const { data: patterns, error: patternsError } = await supabase
        .from('merchant_categories')
        .select('*');

      if (patternsError) throw this.handleError(patternsError);
      if (!patterns) return;

      // Update transactions in batches
      const batchSize = 100;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const updates = batch.map((transaction) => {
          const description = (transaction.description || '').toUpperCase();
          const merchantName = (transaction.merchant_name || '').toUpperCase();

          // Find matching pattern
          const matchingPattern = patterns.find((pattern) => {
            const patternParts = pattern.merchant_pattern.split('|');
            return patternParts.some(
              (p) => description.includes(p.toUpperCase()) || merchantName.includes(p.toUpperCase())
            );
          });

          return {
            id: transaction.id,
            transaction_category: matchingPattern?.category || 'Uncategorized',
          };
        });

        // Update transactions that have a new category
        const toUpdate = updates.filter(
          (u) =>
            u.transaction_category !== 'Uncategorized' &&
            u.transaction_category !== batch.find((t) => t.id === u.id)?.transaction_category
        );

        if (toUpdate.length > 0) {
          const { error: updateError } = await supabase.from('transactions').upsert(toUpdate);

          if (updateError) throw this.handleError(updateError);
          console.log(
            `[TargetRepository] Updated ${toUpdate.length} transactions in batch ${i / batchSize + 1}`
          );
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

// Export a factory function
export const createTargetRepository = (): TargetRepository => {
  return new SupabaseTargetRepository();
};
