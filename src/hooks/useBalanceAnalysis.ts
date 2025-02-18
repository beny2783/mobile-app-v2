import { useMemo } from 'react';
import { DatabaseTransaction } from '../types/transaction';
import { TimeRange, BalanceAnalysisData } from '../types/bank/analysis';
import { BalancePoint } from '../types/bank/balance';
import { getTimeRange, formatDate } from '../utils/balanceUtils';
import { useTransactionPatterns } from './useTransactionPatterns';

interface AccountBalance {
  connection_id: string;
  balance: number;
}

interface ExtendedBalancePoint extends BalancePoint {
  isSignificant?: boolean;
}

export const useBalanceAnalysis = (
  transactions: DatabaseTransaction[],
  timeRangeType: TimeRange['type'] = 'Month',
  accountBalances: AccountBalance[] = []
): BalanceAnalysisData | null => {
  const { recurringTransactions, recurringPayments, scheduledTransactions, seasonalPatterns } =
    useTransactionPatterns(transactions);

  return useMemo(() => {
    if (!transactions.length) return null;

    const timeRange = getTimeRange(timeRangeType);
    const { startDate, endDate } = timeRange;

    // Get unique account IDs
    const accountIds = [...new Set(transactions.map((t) => t.connection_id))];

    // Sort all transactions by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Get current total balance from account balances
    const currentTotalBalance = accountBalances.reduce((sum, acc) => sum + acc.balance, 0);

    // Calculate initial balance for each account by subtracting all transactions in the period
    const periodTransactions = sortedTransactions.filter(
      (t) => new Date(t.timestamp) >= startDate && new Date(t.timestamp) <= endDate
    );

    const totalTransactionsInPeriod = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
    const startingBalance = currentTotalBalance - totalTransactionsInPeriod;

    // Track running balance starting from the initial balance
    let runningBalance = startingBalance;
    const dailyBalances = new Map<string, ExtendedBalancePoint>();

    // Add initial balance point
    dailyBalances.set(startDate.toISOString().split('T')[0], {
      balance: startingBalance,
      date: startDate.toISOString(),
      isSignificant: true,
    });

    // Process transactions day by day
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayTransactions = periodTransactions.filter(
        (t) => new Date(t.timestamp).toISOString().split('T')[0] === dateKey
      );

      // Update running balance
      dayTransactions.forEach((t) => {
        runningBalance += t.amount;
      });

      // Check if there were significant changes
      const dayTotal = dayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const isSignificant = dayTotal > 1000 || dayTransactions.length > 0;

      dailyBalances.set(dateKey, {
        balance: runningBalance,
        date: currentDate.toISOString(),
        isSignificant,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Convert to sorted array of points
    const allPoints = Array.from(dailyBalances.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate money in/out only for the selected period
    const moneyIn = periodTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const moneyOut = Math.abs(
      periodTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    );

    // Calculate upcoming payments
    const upcomingPayments = calculateUpcomingPayments(
      recurringPayments,
      scheduledTransactions,
      endDate
    );

    return {
      currentBalance: currentTotalBalance,
      startingBalance,
      moneyIn,
      moneyOut,
      chartData: {
        labels: allPoints.map((p) => formatDate(new Date(p.date))),
        current: allPoints.map((p) => p.balance),
        forecast: [], // Remove estimation for now
      },
      upcomingPayments: {
        total: upcomingPayments.total,
        items: [], // TODO: Add detailed payment items
      },
      estimatedBalance: {
        amount: currentTotalBalance,
        date: endDate.toISOString(),
      },
      currency: 'GBP',
      lastUpdated: new Date().toISOString(),
    };
  }, [
    transactions,
    timeRangeType,
    accountBalances,
    recurringTransactions,
    recurringPayments,
    scheduledTransactions,
    seasonalPatterns,
  ]);
};

// Helper function to select appropriate chart points
function selectChartPoints(
  points: ExtendedBalancePoint[],
  timeRangeType: TimeRange['type']
): ExtendedBalancePoint[] {
  const targetPoints = timeRangeType === 'Month' ? 30 : 52; // Daily for month, weekly for year

  // Always include significant points
  const significantPoints = points.filter((p) => p.isSignificant);

  // Calculate how many regular points we need
  const remainingPoints = targetPoints - significantPoints.length;

  if (remainingPoints <= 0) {
    // If we have too many significant points, keep the most important ones
    return significantPoints
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, targetPoints);
  }

  // Distribute remaining points evenly
  const step = Math.max(1, Math.floor(points.length / remainingPoints));
  const regularPoints = points
    .filter((p) => !p.isSignificant)
    .filter((_, i) => i % step === 0)
    .slice(0, remainingPoints);

  // Combine and sort by date
  return [...significantPoints, ...regularPoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

// Helper function to calculate estimated balance
function calculateEstimatedBalance(
  currentBalance: number,
  targetDate: Date,
  recurringTransactions: Array<{ pattern: RegExp; amount: number; frequency: number }>,
  recurringPayments: Array<{ pattern: RegExp; amount: number; frequency: number }>,
  scheduledTransactions: Array<{ amount: number; date: Date }>,
  seasonalPatterns: Array<{ month: number; adjustment: number }>
): { amount: number; confidence: number } {
  let estimatedAmount = currentBalance;
  let confidence = 1.0;

  // Add scheduled transactions
  scheduledTransactions
    .filter((t) => t.date <= targetDate)
    .forEach((t) => {
      estimatedAmount += t.amount;
    });

  // Calculate expected recurring transactions
  const daysUntilTarget = Math.ceil(
    (targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  // Add recurring income
  recurringTransactions.forEach((rt) => {
    const expectedOccurrences = Math.floor(daysUntilTarget / rt.frequency);
    estimatedAmount += rt.amount * expectedOccurrences;
    confidence *= 0.95; // Reduce confidence slightly for each prediction
  });

  // Subtract recurring payments
  recurringPayments.forEach((rp) => {
    const expectedOccurrences = Math.floor(daysUntilTarget / rp.frequency);
    estimatedAmount -= Math.abs(rp.amount) * expectedOccurrences;
    confidence *= 0.95;
  });

  // Apply seasonal adjustments
  const targetMonth = targetDate.getMonth();
  const seasonalAdjustment = seasonalPatterns.find((sp) => sp.month === targetMonth);
  if (seasonalAdjustment) {
    estimatedAmount *= 1 + seasonalAdjustment.adjustment;
    confidence *= 0.9;
  }

  return {
    amount: estimatedAmount,
    confidence: Math.max(0.3, confidence), // Never go below 30% confidence
  };
}

// Helper function to calculate upcoming payments
function calculateUpcomingPayments(
  recurringPayments: Array<{ pattern: RegExp; amount: number; frequency: number }>,
  scheduledTransactions: Array<{ amount: number; date: Date }>,
  targetDate: Date
): { total: number; recurring: number; scheduled: number } {
  const now = new Date();
  const daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate recurring payments
  const recurringTotal = recurringPayments.reduce((sum, rp) => {
    const expectedOccurrences = Math.floor(daysUntilTarget / rp.frequency);
    return sum + Math.abs(rp.amount) * expectedOccurrences;
  }, 0);

  // Calculate scheduled payments
  const scheduledTotal = scheduledTransactions
    .filter((t) => t.amount < 0 && t.date <= targetDate)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    recurring: recurringTotal,
    scheduled: scheduledTotal,
    total: recurringTotal + scheduledTotal,
  };
}
