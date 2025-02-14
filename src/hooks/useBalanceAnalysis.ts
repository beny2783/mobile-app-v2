import { useMemo } from 'react';
import { Transaction } from '../types';
import { BalanceData, TimeRange, getTimeRange } from '../utils/balanceUtils';

export const useBalanceAnalysis = (
  transactions: Transaction[],
  timeRangeType: 'Month' | 'Year' = 'Month'
): BalanceData | null => {
  return useMemo(() => {
    if (!transactions.length) return null;

    const timeRange = getTimeRange(timeRangeType);
    const { startDate, endDate } = timeRange;

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Filter transactions within time range
    const rangeTransactions = sortedTransactions.filter(
      (t) => new Date(t.timestamp) >= startDate && new Date(t.timestamp) <= endDate
    );

    // Calculate running balance
    let runningBalance = 0;
    const balancePoints = rangeTransactions.map((t) => {
      runningBalance += t.amount;
      return {
        balance: runningBalance,
        date: new Date(t.timestamp),
      };
    });

    // Calculate money in/out
    const moneyIn = rangeTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const moneyOut = Math.abs(
      rangeTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    );

    // Get chart data points (5 evenly spaced points)
    const step = Math.max(1, Math.floor(balancePoints.length / 5));
    const chartPoints = balancePoints.filter((_, i) => i % step === 0).slice(-5);

    // Estimate future balance based on average daily change
    const totalDays = Math.max(
      1,
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const averageDailyChange = (runningBalance - balancePoints[0]?.balance || 0) / totalDays;
    const daysUntilEnd = Math.floor(
      (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const estimatedEndBalance = runningBalance + averageDailyChange * daysUntilEnd;

    // Calculate upcoming payments (recurring negative transactions)
    const upcomingTotal = Math.abs(
      rangeTransactions
        .filter(
          (t) =>
            t.amount < 0 &&
            new Date(t.timestamp) >= new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
        )
        .reduce((sum, t) => sum + t.amount, 0)
    );

    return {
      currentBalance: runningBalance,
      startingBalance: balancePoints[0]?.balance || 0,
      moneyIn,
      moneyOut,
      chartData: {
        current: chartPoints.map((p) => p.balance),
        estimated: [estimatedEndBalance],
        labels: chartPoints.map((p) => p.date.toISOString()),
      },
      upcomingPayments: {
        total: upcomingTotal,
        date: endDate.toISOString(),
      },
      estimatedBalance: {
        amount: estimatedEndBalance,
        date: endDate.toISOString(),
      },
    };
  }, [transactions, timeRangeType]);
};
