import { ChallengeProgressCalculator } from '../../services/challenges/progress-calculator';
import { Challenge, UserChallenge, Transaction } from '../../types';

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
      type: 'reduced_spending',
      target_amount: 0,
      category: 'dining',
      start_date: baseDate.toISOString(),
      end_date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };

    it('should return completed when no spending in category', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          connection_id: 'test-connection',
          amount: -50,
          currency: 'GBP',
          description: 'Grocery Shopping',
          merchant_name: 'Supermarket',
          timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          transaction_type: 'debit',
          transaction_category: 'groceries',
          category: 'groceries',
          date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
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
          id: '1',
          connection_id: 'test-connection',
          amount: -30,
          currency: 'GBP',
          description: 'Restaurant Dinner',
          merchant_name: 'Restaurant',
          timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          transaction_type: 'debit',
          transaction_category: 'dining',
          category: 'dining',
          date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
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
    const challenge: Challenge = {
      id: '1',
      type: 'reduced_spending',
      target_amount: 100,
      category: 'groceries',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    };

    it('should return completed when spending is below target', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          connection_id: 'test-connection',
          amount: 80,
          currency: 'GBP',
          description: 'Grocery Shopping',
          timestamp: '2024-01-15T12:00:00Z',
          category: 'groceries',
          date: '2024-01-15',
        },
      ];

      const result = calculator.calculateProgress(mockUserChallenge, challenge, transactions);
      expect(result.isCompleted).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.progress.category_spent).toBe(80);
    });

    it('should return failed when spending exceeds target', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          connection_id: 'test-connection',
          amount: 120,
          currency: 'GBP',
          description: 'Grocery Shopping',
          timestamp: '2024-01-15T12:00:00Z',
          category: 'groceries',
          date: '2024-01-15',
        },
      ];

      const result = calculator.calculateProgress(mockUserChallenge, challenge, transactions);
      expect(result.isCompleted).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.progress.category_spent).toBe(120);
    });
  });

  describe('Edge Cases', () => {
    const noSpendChallenge: Challenge = {
      id: '1',
      type: 'reduced_spending',
      target_amount: 0,
      category: 'dining',
      start_date: baseDate.toISOString(),
      end_date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };

    it('should handle transactions outside challenge date range', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          connection_id: 'test-connection',
          amount: 120,
          currency: 'GBP',
          description: 'Grocery Shopping',
          timestamp: '2023-12-31T12:00:00Z',
          category: 'groceries',
          date: '2023-12-31',
        },
        {
          id: '2',
          connection_id: 'test-connection',
          amount: 80,
          currency: 'GBP',
          description: 'Grocery Shopping',
          timestamp: '2024-02-01T12:00:00Z',
          category: 'groceries',
          date: '2024-02-01',
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
