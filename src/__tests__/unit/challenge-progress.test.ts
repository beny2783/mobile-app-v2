import { ChallengeProgressCalculator } from '../../services/challenges/progress-calculator';
import { Challenge, UserChallenge, Transaction } from '../../types/challenges';

describe('ChallengeProgressCalculator', () => {
  let calculator: ChallengeProgressCalculator;
  const baseDate = new Date('2024-01-15T12:00:00Z');
  const mockUserChallenge: UserChallenge = {
    id: 'user-challenge-1',
    challenge_id: '1',
    user_id: 'test-user',
    started_at: baseDate.toISOString(),
    status: 'active',
    progress: {},
    streak_count: 0,
    created_at: baseDate.toISOString(),
    updated_at: baseDate.toISOString(),
  };

  beforeEach(() => {
    calculator = new ChallengeProgressCalculator();
  });

  describe('No Spend Challenge', () => {
    const noSpendChallenge: Challenge = {
      id: '1',
      name: 'No Spend Challenge',
      description: 'Avoid spending in dining',
      type: 'daily',
      criteria: {
        type: 'no_spend',
        exclude_categories: ['groceries', 'bills'],
        max_spend: 0,
      },
      reward_xp: 100,
      active: true,
      created_at: baseDate.toISOString(),
      updated_at: baseDate.toISOString(),
    };

    it('should return completed when no spending in category', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          description: 'Grocery Shopping',
          amount: -50,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'groceries',
          merchant_name: 'Supermarket',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        noSpendChallenge,
        transactions
      );
      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.total_spent).toBe(0);
    });

    it('should return failed when spending in category', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          description: 'Restaurant Dinner',
          amount: -30,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'dining',
          merchant_name: 'Restaurant',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        noSpendChallenge,
        transactions
      );
      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.progress.total_spent).toBe(30);
    });
  });

  describe('Reduced Spending Challenge', () => {
    const reducedSpendingChallenge: Challenge = {
      id: '2',
      name: 'Reduced Shopping Challenge',
      description: 'Reduce shopping expenses',
      type: 'weekly',
      criteria: {
        type: 'reduced_spending',
        reduction_target: 0.2,
        max_spend: 100,
      },
      reward_xp: 200,
      active: true,
      created_at: baseDate.toISOString(),
      updated_at: baseDate.toISOString(),
    };

    it('should return completed when spending is below target', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          description: 'Clothing Store',
          amount: -80,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'shopping',
          merchant_name: 'Fashion Store',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        reducedSpendingChallenge,
        transactions
      );
      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.category_spent).toBe(80);
    });

    it('should return failed when spending exceeds target', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          description: 'Electronics Store',
          amount: -120,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'shopping',
          merchant_name: 'Tech Store',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        reducedSpendingChallenge,
        transactions
      );
      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.progress.category_spent).toBe(120);
    });
  });

  describe('Edge Cases', () => {
    const noSpendChallenge: Challenge = {
      id: '1',
      name: 'No Spend Challenge',
      description: 'Avoid spending in dining',
      type: 'daily',
      criteria: {
        type: 'no_spend',
        exclude_categories: ['groceries', 'bills'],
        max_spend: 0,
      },
      reward_xp: 100,
      active: true,
      created_at: baseDate.toISOString(),
      updated_at: baseDate.toISOString(),
    };

    it('should handle transactions outside challenge date range', () => {
      const transactions: Transaction[] = [
        {
          transaction_id: '1',
          account_id: 'test-account',
          timestamp: new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          description: 'Before Start',
          amount: -50,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'dining',
          merchant_name: 'Restaurant',
        },
        {
          transaction_id: '2',
          account_id: 'test-account',
          timestamp: new Date(baseDate.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'After End',
          amount: -30,
          currency: 'GBP',
          transaction_type: 'debit',
          transaction_category: 'dining',
          merchant_name: 'Restaurant',
        },
      ];

      const result = calculator.calculateProgress(
        mockUserChallenge,
        noSpendChallenge,
        transactions
      );
      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.total_spent).toBe(0);
    });

    it('should handle empty transaction list', () => {
      const result = calculator.calculateProgress(mockUserChallenge, noSpendChallenge, []);
      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.total_spent).toBe(0);
    });
  });
});
