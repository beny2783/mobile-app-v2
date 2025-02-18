import type { Challenge, UserChallenge, Transaction } from '../../types/challenges';

export interface ProgressResult {
  isCompleted: boolean;
  isFailed: boolean;
  progress: {
    total_spent: number;
    [key: string]: any;
  };
}

export class ChallengeProgressCalculator {
  /**
   * Calculate progress for a specific challenge
   */
  calculateProgress(
    userChallenge: UserChallenge,
    challenge: Challenge,
    transactions: Transaction[]
  ): ProgressResult {
    switch (challenge.criteria.type) {
      case 'no_spend':
        return this.calculateNoSpendProgress(challenge, transactions);
      case 'reduced_spending':
        return this.calculateReducedSpendingProgress(challenge.criteria, transactions);
      case 'savings':
        return this.calculateSavingsProgress(challenge.criteria, transactions);
      case 'streak':
        return this.calculateStreakProgress(userChallenge, challenge.criteria);
      case 'category_budget':
        return this.calculateCategoryBudgetProgress(transactions);
      case 'smart_shopping':
        return this.calculateSmartShoppingProgress(challenge.criteria, transactions);
      default:
        // Default response for unknown challenge types
        return {
          isCompleted: false,
          isFailed: false,
          progress: { total_spent: 0 },
        };
    }
  }

  private calculateNoSpendProgress(
    challenge: Challenge,
    transactions: Transaction[]
  ): ProgressResult {
    const excludeCategories = challenge.criteria.exclude_categories || [];
    const maxSpend = challenge.criteria.max_spend || 0;

    const totalSpent = transactions
      .filter((t) => !excludeCategories.includes(t.transaction_category))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      isCompleted: totalSpent === 0,
      isFailed: totalSpent > maxSpend,
      progress: {
        total_spent: totalSpent,
      },
    };
  }

  private calculateReducedSpendingProgress(
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ProgressResult {
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

    return {
      isCompleted,
      isFailed,
      progress: {
        ...progress,
      },
    };
  }

  private calculateSpendingReductionProgress(
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ProgressResult {
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

    return {
      isCompleted,
      isFailed,
      progress: {
        ...progress,
      },
    };
  }

  private calculateSavingsProgress(
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ProgressResult {
    const totalSaved = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const progress = { total_saved: totalSaved };
    const isCompleted = totalSaved >= (criteria.target || 0);
    const isFailed = false; // Savings challenges can't fail, only complete

    return {
      isCompleted,
      isFailed,
      progress: {
        ...progress,
      },
    };
  }

  private calculateStreakProgress(
    userChallenge: UserChallenge,
    criteria: ChallengeCriteria
  ): ProgressResult {
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

    return {
      isCompleted,
      isFailed,
      progress: {
        ...progress,
      },
    };
  }

  private calculateCategoryBudgetProgress(transactions: Transaction[]): ProgressResult {
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
      isCompleted: allCategoriesUnderBudget,
      isFailed: !allCategoriesUnderBudget,
      progress: { category_spending: spendingByCategory },
    };
  }

  private calculateSmartShoppingProgress(
    criteria: ChallengeCriteria,
    transactions: Transaction[]
  ): ProgressResult {
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

    return {
      isCompleted,
      isFailed,
      progress: {
        ...progress,
      },
    };
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
