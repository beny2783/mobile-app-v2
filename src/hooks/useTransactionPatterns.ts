import { useMemo } from 'react';
import { Transaction } from '../types';

interface TransactionPattern {
  pattern: RegExp;
  amount: number;
  frequency: number; // in days
}

interface SeasonalPattern {
  month: number;
  adjustment: number;
}

interface ScheduledTransaction {
  amount: number;
  date: Date;
}

interface TransactionPatterns {
  recurringTransactions: TransactionPattern[];
  recurringPayments: TransactionPattern[];
  scheduledTransactions: ScheduledTransaction[];
  seasonalPatterns: SeasonalPattern[];
}

export const useTransactionPatterns = (transactions: Transaction[]): TransactionPatterns => {
  return useMemo(() => {
    if (!transactions.length) {
      return {
        recurringTransactions: [],
        recurringPayments: [],
        scheduledTransactions: [],
        seasonalPatterns: [],
      };
    }

    // Group transactions by description
    const transactionGroups = new Map<string, Transaction[]>();
    transactions.forEach((t) => {
      const key = t.description.toLowerCase();
      const group = transactionGroups.get(key) || [];
      group.push(t);
      transactionGroups.set(key, group);
    });

    const patterns: TransactionPatterns = {
      recurringTransactions: [],
      recurringPayments: [],
      scheduledTransactions: [],
      seasonalPatterns: [],
    };

    // Analyze each group for patterns
    transactionGroups.forEach((group, description) => {
      if (group.length < 2) return; // Need at least 2 transactions to identify a pattern

      // Sort by date
      const sortedGroup = [...group].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Calculate average interval between transactions
      const intervals: number[] = [];
      for (let i = 1; i < sortedGroup.length; i++) {
        const interval = Math.floor(
          (new Date(sortedGroup[i].timestamp).getTime() -
            new Date(sortedGroup[i - 1].timestamp).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        intervals.push(interval);
      }

      const averageInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
      const intervalVariance =
        intervals.reduce((sum, i) => sum + Math.pow(i - averageInterval, 2), 0) / intervals.length;

      // Check if the pattern is regular enough (low variance)
      const isRegular = intervalVariance < averageInterval * 0.2; // 20% variance threshold

      if (isRegular) {
        const averageAmount = group.reduce((sum, t) => sum + t.amount, 0) / group.length;
        const pattern: TransactionPattern = {
          pattern: new RegExp(escapeRegExp(description), 'i'),
          amount: averageAmount,
          frequency: Math.round(averageInterval),
        };

        if (averageAmount > 0) {
          patterns.recurringTransactions.push(pattern);
        } else {
          patterns.recurringPayments.push(pattern);
        }
      }
    });

    // Analyze seasonal patterns
    const monthlyAverages = new Map<number, number[]>();
    transactions.forEach((t) => {
      const month = new Date(t.timestamp).getMonth();
      const amounts = monthlyAverages.get(month) || [];
      amounts.push(t.amount);
      monthlyAverages.set(month, amounts);
    });

    // Calculate seasonal adjustments
    const overallAverage = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;
    monthlyAverages.forEach((amounts, month) => {
      const monthlyAverage = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const adjustment = (monthlyAverage - overallAverage) / overallAverage;

      // Only include significant seasonal patterns (>10% difference)
      if (Math.abs(adjustment) > 0.1) {
        patterns.seasonalPatterns.push({
          month,
          adjustment,
        });
      }
    });

    // Identify scheduled future transactions
    const now = new Date();
    const scheduledTransactions = transactions
      .filter((t) => t.scheduled_date && new Date(t.scheduled_date) > now)
      .map((t) => ({
        amount: t.amount,
        date: new Date(t.scheduled_date!),
      }));

    patterns.scheduledTransactions = scheduledTransactions;

    return patterns;
  }, [transactions]);
};

// Helper function to escape special characters in string for RegExp
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
