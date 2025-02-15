import { ChallengeProgressCalculator } from '../../services/challenges/progress-calculator';
import type { Challenge, UserChallenge, Transaction } from '../../types/challenges';

describe('ChallengeProgressCalculator', () => {
  let calculator: ChallengeProgressCalculator;

  const mockUserChallenge: UserChallenge = {
    id: 'test-user-challenge',
    user_id: 'test-user',
    challenge_id: 'test-challenge',
    status: 'active',
    started_at: '2024-01-01T00:00:00Z',
    progress: {},
    streak_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    calculator = new ChallengeProgressCalculator();
  });

  describe('No Spend Challenge', () => {
    const mockNoSpendChallenge: Challenge = {
      id: 'test-challenge',
      name: 'No Spend Challenge',
      description: 'Avoid spending in specific categories',
      type: 'daily',
      criteria: {
        type: 'no_spend',
        exclude_categories: ['bills', 'groceries'],
        max_spend: 50,
      },
      reward_xp: 100,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should mark challenge as completed when no spending in tracked categories', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T00:00:00Z',
          description: 'Test Bill Payment',
          amount: -50,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'bills',
          merchant_name: 'Utility Company',
        },
        {
          transaction_id: '2',
          account_id: 'test-account',
          timestamp: '2024-01-03T00:00:00Z',
          description: 'Grocery Shopping',
          amount: -30,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'groceries',
          merchant_name: 'Local Supermarket',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockNoSpendChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.total_spent).toBe(0);
    });

    it('should mark challenge as failed when spending exceeds max_spend', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T00:00:00Z',
          description: 'Entertainment Purchase',
          amount: -60,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Cinema',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockNoSpendChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.progress.total_spent).toBe(60);
    });

    it('should handle empty transaction list', () => {
      const result = calculator.calculateProgress(mockUserChallenge, mockNoSpendChallenge, []);

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.total_spent).toBe(0);
    });
  });

  describe('Reduced Spending Challenge', () => {
    const mockReducedSpendingChallenge: Challenge = {
      id: 'test-challenge',
      name: 'Reduced Dining Spending',
      description: 'Reduce dining spending',
      type: 'weekly',
      criteria: {
        type: 'reduced_spending',
        reduction_target: 0.2, // 20% reduction target
        max_spend: 150,
      },
      reward_xp: 200,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should mark challenge as completed when spending is under max_spend', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z', // Within time window
          description: 'Lunch',
          amount: -25,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'dining',
          merchant_name: 'Restaurant',
        },
        {
          transaction_id: '2',
          account_id: 'test-account',
          timestamp: '2024-01-02T19:00:00Z', // Within time window
          description: 'Dinner',
          amount: -45,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'dining',
          merchant_name: 'Restaurant',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockReducedSpendingChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.category_spent).toBe(70); // 25 + 45
    });

    it('should mark challenge as failed when spending exceeds max_spend', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z',
          description: 'Expensive Lunch',
          amount: -120,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'dining',
          merchant_name: 'Fancy Restaurant',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockReducedSpendingChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.progress.category_spent).toBe(120);
    });

    it('should ignore transactions outside time window', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T10:00:00Z', // Outside time window
          description: 'Early Breakfast',
          amount: -200,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'dining',
          merchant_name: 'Cafe',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockReducedSpendingChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.category_spent).toBe(0);
    });
  });

  describe('Savings Challenge', () => {
    const mockSavingsChallenge: Challenge = {
      id: 'test-challenge',
      name: 'Monthly Savings Goal',
      description: 'Save £500 this month',
      type: 'monthly',
      criteria: {
        type: 'savings',
        savings_target: 500,
      },
      reward_xp: 300,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should mark challenge as completed when savings target is reached', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z',
          description: 'Salary',
          amount: 300,
          currency: 'GBP',
          transaction_type: 'credit',
          transaction_category: 'income',
          merchant_name: 'Employer',
        },
        {
          transaction_id: '2',
          account_id: 'test-account',
          timestamp: '2024-01-15T12:00:00Z',
          description: 'Bonus',
          amount: 250,
          currency: 'GBP',
          transaction_type: 'credit',
          transaction_category: 'income',
          merchant_name: 'Employer',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockSavingsChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.total_saved).toBe(550);
    });

    it('should not mark challenge as completed when savings target is not reached', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z',
          description: 'Small Bonus',
          amount: 100,
          currency: 'GBP',
          transaction_type: 'credit',
          transaction_category: 'income',
          merchant_name: 'Employer',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockSavingsChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(false); // Savings challenges can't fail
      expect(result.progress.total_saved).toBe(100);
    });

    it('should ignore debit transactions', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z',
          description: 'Savings',
          amount: 600,
          currency: 'GBP',
          transaction_type: 'credit',
          transaction_category: 'income',
          merchant_name: 'Transfer',
        },
        {
          transaction_id: '2',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:01:00Z',
          description: 'Shopping',
          amount: -100,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'shopping',
          merchant_name: 'Store',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockSavingsChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.total_saved).toBe(600); // Should only count the credit transaction
    });
  });

  describe('Helper Functions', () => {
    it('should correctly identify weekend transactions', () => {
      // Saturday
      const saturday = new Date('2024-01-06');
      // Sunday
      const sunday = new Date('2024-01-07');
      // Monday
      const monday = new Date('2024-01-08');

      // @ts-ignore - accessing private method for testing
      expect(calculator['isWeekendTransaction'](saturday)).toBe(true);
      // @ts-ignore - accessing private method for testing
      expect(calculator['isWeekendTransaction'](sunday)).toBe(true);
      // @ts-ignore - accessing private method for testing
      expect(calculator['isWeekendTransaction'](monday)).toBe(false);
    });

    it('should correctly check consecutive days', () => {
      const day1 = new Date('2024-01-01');
      const day2 = new Date('2024-01-02');
      const day3 = new Date('2024-01-03');

      // @ts-ignore - accessing private method for testing
      expect(calculator['isConsecutiveDay'](day1, day2)).toBe(true);
      // @ts-ignore - accessing private method for testing
      expect(calculator['isConsecutiveDay'](day1, day3)).toBe(false);
    });

    it('should correctly check time windows', () => {
      const date = new Date('2024-01-01T14:30:00Z'); // 2:30 PM

      // @ts-ignore - accessing private method for testing
      expect(calculator['isWithinTimeWindow'](date, '14:00-15:00')).toBe(true);
      // @ts-ignore - accessing private method for testing
      expect(calculator['isWithinTimeWindow'](date, '15:00-16:00')).toBe(false);
      // @ts-ignore - accessing private method for testing
      expect(calculator['isWithinTimeWindow'](date)).toBe(true); // No time window specified
    });
  });

  describe('Unknown Challenge Type', () => {
    const mockUnknownChallenge: Challenge = {
      id: 'test-challenge',
      name: 'Unknown Challenge',
      description: 'Challenge with unknown type',
      type: 'daily',
      criteria: {
        type: 'unknown_type' as any,
      },
      reward_xp: 100,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should return default progress for unknown challenge type', () => {
      const result = calculator.calculateProgress(mockUserChallenge, mockUnknownChallenge, []);

      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(false);
      expect(result.progress.total_spent).toBe(0);
    });
  });

  describe('Spending Reduction Challenge', () => {
    const mockSpendingReductionChallenge: Challenge = {
      id: 'test-challenge',
      name: 'Weekend Spending Reduction',
      description: 'Reduce weekend spending',
      type: 'weekly',
      criteria: {
        type: 'reduced_spending',
        reduction_target: 0.2, // 20% reduction target
        max_spend: 150,
      },
      reward_xp: 200,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should calculate spending reduction progress correctly', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-06T12:00:00Z', // Saturday
          description: 'Weekend Shopping',
          amount: -80,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'shopping',
          merchant_name: 'Mall',
        },
        {
          transaction_id: '2',
          account_id: 'test-account',
          timestamp: '2024-01-07T14:00:00Z', // Sunday
          description: 'Weekend Dining',
          amount: -40,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'dining',
          merchant_name: 'Restaurant',
        },
        {
          transaction_id: '3',
          account_id: 'test-account',
          timestamp: '2024-01-07T19:00:00Z', // Sunday
          description: 'Weekend Entertainment',
          amount: -30,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Cinema',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockSpendingReductionChallenge,
        transactions
      );

      expect(result.progress.current_spending).toBeDefined();
      expect(result.progress.historical_average).toBeDefined();
      expect(result.progress.reduction_percentage).toBeDefined();
      expect(result.isCompleted).toBeDefined();
      expect(result.isFailed).toBeDefined();
    });
  });

  describe('Category Budget Challenge', () => {
    const mockCategoryBudgetChallenge: Challenge = {
      id: 'test-challenge',
      name: 'Category Budget Challenge',
      description: 'Stay within budget for all categories',
      type: 'monthly',
      criteria: {
        type: 'category_budget',
        category_budgets: {
          Groceries: 400,
          Dining: 200,
          Transport: 150,
        },
      },
      reward_xp: 300,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should track spending by category and mark as completed when under budget', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z',
          description: 'Grocery Shopping',
          amount: -300,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'Groceries',
          merchant_name: 'Supermarket',
        },
        {
          transaction_id: '2',
          account_id: 'test-account',
          timestamp: '2024-01-03T19:00:00Z',
          description: 'Dinner',
          amount: -150,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'Dining',
          merchant_name: 'Restaurant',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockCategoryBudgetChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.category_spending).toBeDefined();
      expect(result.progress.category_spending.Groceries).toBe(300);
      expect(result.progress.category_spending.Dining).toBe(150);
    });

    it('should mark as failed when any category exceeds budget', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z',
          description: 'Big Grocery Shop',
          amount: -450,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'Groceries',
          merchant_name: 'Supermarket',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockCategoryBudgetChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.progress.category_spending.Groceries).toBe(450);
    });
  });

  describe('Smart Shopping Challenge', () => {
    const mockSmartShoppingChallenge: Challenge = {
      id: 'test-challenge',
      name: 'Smart Shopping Challenge',
      description: 'Save money through refunds and discounts',
      type: 'monthly',
      criteria: {
        type: 'smart_shopping',
        savings_target: 100,
      },
      reward_xp: 200,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should track refunds and mark as completed when target reached', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z',
          description: 'Item Return',
          amount: 60,
          currency: 'GBP',
          transaction_type: 'credit',
          transaction_category: 'Refunds',
          merchant_name: 'Store',
        },
        {
          transaction_id: '2',
          account_id: 'test-account',
          timestamp: '2024-01-03T14:00:00Z',
          description: 'Price Match Refund',
          amount: 50,
          currency: 'GBP',
          transaction_type: 'credit',
          transaction_category: 'Refunds',
          merchant_name: 'Store',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockSmartShoppingChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.saved_amount).toBe(110);
      expect(result.progress.transaction_count).toBe(2);
    });

    it('should not mark as completed when minimum transactions not met', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: '2024-01-02T12:00:00Z',
          description: 'Big Refund',
          amount: 150,
          currency: 'GBP',
          transaction_type: 'credit',
          transaction_category: 'Refunds',
          merchant_name: 'Store',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        mockSmartShoppingChallenge,
        transactions
      );

      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(false);
      expect(result.progress.saved_amount).toBe(150);
      expect(result.progress.transaction_count).toBe(1);
    });
  });

  describe('Streak Challenge', () => {
    const mockStreakChallenge: Challenge = {
      id: 'test-challenge',
      name: 'Daily Streak Challenge',
      description: 'Maintain a daily streak',
      type: 'daily',
      criteria: {
        type: 'streak',
        streak_target: 7,
      },
      reward_xp: 150,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should track consecutive days correctly', () => {
      const mockUserChallengeWithStreak: UserChallenge = {
        ...mockUserChallenge,
        progress: {
          streak_count: 6,
          last_streak_date: '2024-01-06T00:00:00Z',
        },
      };

      // Mock current date to be the next day
      const mockDate = new Date('2024-01-07T00:00:00Z');
      const dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
        if (args.length === 0) return mockDate;
        return new (Function.prototype.bind.apply(Date, [null, ...args]))();
      });

      const result = calculator.calculateProgress(
        mockUserChallengeWithStreak,
        mockStreakChallenge,
        []
      );

      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.streak_count).toBe(7);
      expect(result.progress.last_streak_date).toBeDefined();

      dateSpy.mockRestore();
    });

    it('should reset streak when day is missed', () => {
      const mockUserChallengeWithStreak: UserChallenge = {
        ...mockUserChallenge,
        progress: {
          streak_count: 5,
          last_streak_date: '2024-01-05T00:00:00Z',
        },
      };

      // Mock current date to be two days later
      const mockDate = new Date('2024-01-07T00:00:00Z');
      const dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
        if (args.length === 0) return mockDate;
        return new (Function.prototype.bind.apply(Date, [null, ...args]))();
      });

      const result = calculator.calculateProgress(
        mockUserChallengeWithStreak,
        mockStreakChallenge,
        []
      );

      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.progress.streak_count).toBe(0);
      expect(result.progress.last_streak_date).toBeDefined();

      dateSpy.mockRestore();
    });
  });
});
