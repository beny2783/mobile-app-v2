import { supabase } from './supabase';
import type { Challenge, ChallengeCriteria, UserChallenge, Transaction } from '../types';

interface UserChallengeWithChallenge extends UserChallenge {
  challenge: Challenge;
}

interface ChallengeProgress {
  progress: Record<string, any>;
  isCompleted: boolean;
  isFailed: boolean;
}

export class ChallengeTrackingService {
  constructor() {}

  /**
   * Get all active challenges for a user
   */
  async getActiveChallenges(userId: string): Promise<UserChallengeWithChallenge[]> {
    // First, get user challenges
    const { data: userChallenges, error: userChallengesError } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (userChallengesError) {
      console.error('Error fetching user challenges:', userChallengesError);
      throw userChallengesError;
    }

    // Then, get the challenges
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('*');

    if (challengesError) {
      console.error('Error fetching challenges:', challengesError);
      throw challengesError;
    }

    // Combine the data
    return userChallenges.map((uc) => ({
      ...uc,
      challenge: challenges.find((c) => c.id === uc.challenge_id),
    })) as UserChallengeWithChallenge[];
  }

  /**
   * Start a new challenge for a user
   */
  async startChallenge(userId: string, challengeId: string): Promise<UserChallenge> {
    // Check if user is eligible for this challenge
    const { data: eligibilityData, error: eligibilityError } = await supabase.rpc(
      'is_challenge_eligible',
      {
        p_user_id: userId,
        p_challenge_id: challengeId,
      }
    );

    if (eligibilityError) throw eligibilityError;
    if (!eligibilityData) throw new Error('User is not eligible for this challenge');

    // Start the challenge
    const { data, error } = await supabase
      .from('user_challenges')
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        status: 'active',
        progress: {},
        streak_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update challenge progress based on new transactions
   */
  async updateChallengeProgress(userId: string, transactions: Transaction[]): Promise<void> {
    const activeChallenges = await this.getActiveChallenges(userId);

    for (const userChallenge of activeChallenges) {
      const progress = await this.calculateProgress(
        userChallenge,
        userChallenge.challenge,
        transactions
      );

      if (progress.isCompleted) {
        await this.completeChallenge(userChallenge.id, progress.progress);
      } else if (progress.isFailed) {
        await this.failChallenge(userChallenge.id, progress.progress);
      } else {
        await this.updateProgress(userChallenge.id, progress.progress);
      }
    }
  }

  /**
   * Calculate progress for a specific challenge
   */
  private async calculateProgress(
    userChallenge: UserChallenge,
    challenge: Challenge,
    transactions: Transaction[]
  ): Promise<ChallengeProgress> {
    const criteria = challenge.criteria;
    const progress = { ...userChallenge.progress };
    let isCompleted = false;
    let isFailed = false;

    switch (criteria.type) {
      case 'no_spend':
        const nonEssentialSpending = transactions
          .filter(
            (t) =>
              !criteria.exclude_categories?.includes(t.transaction_category) &&
              new Date(t.timestamp) >= new Date(userChallenge.started_at)
          )
          .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

        progress.total_spent = nonEssentialSpending;
        isCompleted = nonEssentialSpending <= (criteria.max_spend || 0);
        isFailed = nonEssentialSpending > (criteria.max_spend || 0);
        break;

      case 'reduced_spending':
        const reducedSpending = transactions
          .filter(
            (t) =>
              t.transaction_category === criteria.category &&
              this.isWithinTimeWindow(new Date(t.timestamp), criteria.time_window)
          )
          .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

        progress.category_spent = reducedSpending;
        isCompleted = reducedSpending <= (criteria.max_spend || 0);
        isFailed = reducedSpending > (criteria.max_spend || 0);
        break;

      case 'spending_reduction':
        // Get historical average for comparison
        const { data: historicalData } = await supabase
          .from('transactions')
          .select('amount, timestamp')
          .eq('user_id', userChallenge.user_id)
          .eq('transaction_category', criteria.category || '')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const historicalAverage =
          (historicalData || []).reduce(
            (sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0),
            0
          ) / (historicalData?.length || 1);

        const currentSpending = transactions
          .filter((t) => this.isWeekendTransaction(new Date(t.timestamp)))
          .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

        progress.historical_average = historicalAverage;
        progress.current_spending = currentSpending;
        progress.reduction_percentage =
          ((historicalAverage - currentSpending) / historicalAverage) * 100;

        isCompleted = progress.reduction_percentage >= (criteria.reduction_target || 0) * 100;
        isFailed =
          transactions.length >= (criteria.min_transactions || 1) &&
          progress.reduction_percentage < (criteria.reduction_target || 0) * 100;
        break;

      case 'savings':
        const totalSaved = transactions
          .filter((t) => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);

        progress.total_saved = totalSaved;
        isCompleted = totalSaved >= (criteria.target || 0);
        break;

      case 'streak':
        // Update streak count based on transaction patterns
        const today = new Date();
        const streakDate = new Date(progress.last_streak_date || userChallenge.started_at);

        if (this.isConsecutiveDay(streakDate, today)) {
          progress.streak_count = (progress.streak_count || 0) + 1;
          progress.last_streak_date = today.toISOString();
        } else {
          progress.streak_count = 0;
          progress.last_streak_date = today.toISOString();
        }

        isCompleted = (progress.streak_count || 0) >= (criteria.days || 30);
        isFailed = !this.isConsecutiveDay(streakDate, today);
        break;

      case 'category_budget':
        const budgets = await this.getCategoryBudgets(userChallenge.user_id);
        const spendingByCategory: Record<string, number> = {};
        let allCategoriesUnderBudget = true;

        for (const [category, budget] of Object.entries(budgets)) {
          const spent = transactions
            .filter((t) => t.transaction_category === category)
            .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

          spendingByCategory[category] = spent;
          if (spent > budget) {
            allCategoriesUnderBudget = false;
          }
        }

        progress.category_spending = spendingByCategory;
        isCompleted = allCategoriesUnderBudget;
        isFailed = !allCategoriesUnderBudget;
        break;

      case 'smart_shopping':
        const savedAmount = transactions
          .filter((t) => t.amount > 0 && t.transaction_category === 'Refunds')
          .reduce((sum, t) => sum + t.amount, 0);

        progress.saved_amount = savedAmount;
        progress.transaction_count = transactions.length;

        isCompleted =
          savedAmount >= (criteria.target_savings || 0) &&
          transactions.length >= (criteria.min_transactions || 0);
        break;
    }

    return { progress, isCompleted, isFailed };
  }

  /**
   * Complete a challenge and award rewards
   */
  private async completeChallenge(
    challengeId: string,
    finalProgress: Record<string, any>
  ): Promise<void> {
    const { data: challengeData } = await supabase
      .from('user_challenges')
      .update({
        status: 'completed',
        progress: finalProgress,
        completed_at: new Date().toISOString(),
      })
      .eq('id', challengeId)
      .select('*, challenge:challenges(*)')
      .single();

    if (!challengeData) return;

    // Award XP
    await supabase.rpc('update_user_xp', {
      p_user_id: challengeData.user_id,
      p_xp_earned: (challengeData.challenge as Challenge).reward_xp,
    });

    // Award badge if applicable
    const challenge = challengeData.challenge as Challenge;
    if (challenge.reward_badge) {
      await supabase.rpc('check_and_award_achievement', {
        p_user_id: challengeData.user_id,
        p_badge_name: challenge.reward_badge,
        p_metadata: finalProgress,
      });
    }
  }

  /**
   * Mark a challenge as failed
   */
  private async failChallenge(
    challengeId: string,
    finalProgress: Record<string, any>
  ): Promise<void> {
    await supabase
      .from('user_challenges')
      .update({
        status: 'failed',
        progress: finalProgress,
        completed_at: new Date().toISOString(),
      })
      .eq('id', challengeId);
  }

  /**
   * Update challenge progress
   */
  private async updateProgress(challengeId: string, progress: Record<string, any>): Promise<void> {
    await supabase.from('user_challenges').update({ progress }).eq('id', challengeId);
  }

  /**
   * Helper function to check if a transaction time is within a specified window
   */
  private isWithinTimeWindow(date: Date, timeWindow?: string): boolean {
    if (!timeWindow) return true;

    const [start, end] = timeWindow.split('-');
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const transactionHour = date.getHours();
    const transactionMinute = date.getMinutes();

    const transactionTime = transactionHour * 60 + transactionMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return transactionTime >= startTime && transactionTime <= endTime;
  }

  /**
   * Helper function to check if a transaction occurred on a weekend
   */
  private isWeekendTransaction(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  }

  /**
   * Helper function to check if two dates are consecutive days
   */
  private isConsecutiveDay(date1: Date, date2: Date): boolean {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  /**
   * Helper function to get category budgets for a user
   */
  private async getCategoryBudgets(userId: string): Promise<Record<string, number>> {
    // This would typically come from a user_budgets table
    // For now, return some default values
    return {
      Groceries: 400,
      Dining: 200,
      Transport: 150,
      Shopping: 300,
      Entertainment: 200,
    };
  }

  /**
   * Get available challenges that the user can start
   */
  async getAvailableChallenges(userId: string): Promise<Challenge[]> {
    try {
      // Get all active challenges
      const { data: userChallenges, error: userChallengesError } = await supabase
        .from('user_challenges')
        .select('challenge_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (userChallengesError) throw userChallengesError;

      // Get all challenges that are:
      // 1. Active in the system
      // 2. Not currently active for the user
      const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .not('id', 'in', `(${(userChallenges || []).map((c) => c.challenge_id).join(',')})`);

      if (challengesError) throw challengesError;

      return challenges || [];
    } catch (error) {
      console.error('Failed to fetch available challenges:', error);
      throw error;
    }
  }
}
