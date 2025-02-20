import { Challenge, Transaction, ChallengeProgress } from '../types';

export class ChallengeProgressCalculator {
  calculateProgress(challenge: Challenge, transactions: Transaction[]): ChallengeProgress {
    const relevantTransactions = transactions.filter(
      (tx) =>
        tx.category === challenge.category &&
        tx.date >= challenge.start_date &&
        tx.date <= challenge.end_date
    );

    const categorySpent = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    const totalSpent = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    const isCompleted = categorySpent <= challenge.target_amount;
    const isFailed = categorySpent > challenge.target_amount;

    return {
      isCompleted,
      isFailed,
      progress: {
        category_spent: categorySpent,
        total_spent: totalSpent,
      },
    };
  }
}
