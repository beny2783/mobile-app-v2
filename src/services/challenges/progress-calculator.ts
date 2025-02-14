import type { Challenge, UserChallenge, Transaction, ChallengeCriteria } from '../../types';

export interface ChallengeProgress {
  progress: Record<string, any>;
  isCompleted: boolean;
  isFailed: boolean;
}

export class ChallengeProgressCalculator {
  /**
   * Calculate progress for a specific challenge
   */
  calculateProgress(
    userChallenge: UserChallenge,
    challenge: Challenge,
    transactions: Transaction[]
  ): ChallengeProgress {
    const criteria = challenge.criteria;
    const progress = { ...userChallenge.progress };
    let isCompleted = false;
    let isFailed = false;

    switch (criteria.type) {
      case 'no_spend':
        return this.calculateNoSpendProgress(userChallenge, criteria, transactions);
      case 'reduced_spending':
        return this.calculateReducedSpendingProgress(criteria, transactions);
      case 'spending_reduction':
        return this.calculateSpendingReductionProgress(criteria, transactions);
      case 'savings':
        return this.calculateSavingsProgress(criteria, transactions);
      case 'streak':
        return this.calculateStreakProgress(userChallenge, criteria);
      case 'category_budget':
        return this.calculateCategoryBudgetProgress(transactions);
      case 'smart_shopping':
        return this.calculateSmartShoppingProgress(criteria, transactions);
      default:
        return { progress, isCompleted, isFailed };
    }
  }

  private calculateNoSpendProgress(
    userChallenge: UserChallenge,
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ChallengeProgress {
    const nonEssentialSpending = transactions
      .filter(
        (t) =>
          !criteria.exclude_categories?.includes(t.transaction_category) &&
          new Date(t.timestamp) >= new Date(userChallenge.started_at)
      )
      .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

    const progress = { total_spent: nonEssentialSpending };
    const isCompleted = nonEssentialSpending <= (criteria.max_spend || 0);
    const isFailed = nonEssentialSpending > (criteria.max_spend || 0);

    return { progress, isCompleted, isFailed };
  }

  private calculateReducedSpendingProgress(
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ChallengeProgress {
    const spending = transactions
      .filter(
        (t) =>
          t.transaction_category === criteria.category &&
          this.isWithinTimeWindow(new Date(t.timestamp), criteria.time_window)
      )
      .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

    const progress = { category_spent: spending };
    const isCompleted = spending <= (criteria.max_spend || 0);
    const isFailed = spending > (criteria.max_spend || 0);

    return { progress, isCompleted, isFailed };
  }

  private calculateSpendingReductionProgress(
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ChallengeProgress {
    const currentSpending = transactions
      .filter((t) => this.isWeekendTransaction(new Date(t.timestamp)))
      .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

    // Note: Historical average would typically come from a database query
    // For this example, we'll use a simplified version
    const historicalAverage = 100; // This should be calculated from historical data

    const reductionPercentage = ((historicalAverage - currentSpending) / historicalAverage) * 100;

    const progress = {
      historical_average: historicalAverage,
      current_spending: currentSpending,
      reduction_percentage: reductionPercentage,
    };

    const isCompleted = reductionPercentage >= (criteria.reduction_target || 0) * 100;
    const isFailed =
      transactions.length >= (criteria.min_transactions || 1) &&
      reductionPercentage < (criteria.reduction_target || 0) * 100;

    return { progress, isCompleted, isFailed };
  }

  private calculateSavingsProgress(
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ChallengeProgress {
    const totalSaved = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const progress = { total_saved: totalSaved };
    const isCompleted = totalSaved >= (criteria.target || 0);
    const isFailed = false; // Savings challenges can't fail, only complete

    return { progress, isCompleted, isFailed };
  }

  private calculateStreakProgress(
    userChallenge: UserChallenge,
    criteria: ChallengeCriteria
  ): ChallengeProgress {
    const today = new Date();
    const streakDate = new Date(
      userChallenge.progress.last_streak_date || userChallenge.started_at
    );
    const progress = { ...userChallenge.progress };

    if (this.isConsecutiveDay(streakDate, today)) {
      progress.streak_count = (progress.streak_count || 0) + 1;
      progress.last_streak_date = today.toISOString();
    } else {
      progress.streak_count = 0;
      progress.last_streak_date = today.toISOString();
    }

    const targetDays = criteria.days ? criteria.days.length : 30;
    const isCompleted = (progress.streak_count || 0) >= targetDays;
    const isFailed = !this.isConsecutiveDay(streakDate, today);

    return { progress, isCompleted, isFailed };
  }

  private calculateCategoryBudgetProgress(transactions: Transaction[]): ChallengeProgress {
    const spendingByCategory: Record<string, number> = {};
    const budgets = this.getCategoryBudgets();
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

    return {
      progress: { category_spending: spendingByCategory },
      isCompleted: allCategoriesUnderBudget,
      isFailed: !allCategoriesUnderBudget,
    };
  }

  private calculateSmartShoppingProgress(
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ChallengeProgress {
    const savedAmount = transactions
      .filter((t) => t.amount > 0 && t.transaction_category === 'Refunds')
      .reduce((sum, t) => sum + t.amount, 0);

    const progress = {
      saved_amount: savedAmount,
      transaction_count: transactions.length,
    };

    const isCompleted =
      savedAmount >= (criteria.target_savings || 0) &&
      transactions.length >= (criteria.min_transactions || 0);
    const isFailed = false; // Smart shopping challenges can't fail, only complete

    return { progress, isCompleted, isFailed };
  }

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

  private isWeekendTransaction(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  }

  private isConsecutiveDay(date1: Date, date2: Date): boolean {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  private getCategoryBudgets(): Record<string, number> {
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
}
