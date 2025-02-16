import { useMemo } from 'react';
import { Transaction } from '../types';
import {
  getCategoryColor,
  SpendingAnalysis,
  CategoryData,
  SpendingInsight,
} from '../utils/categoryUtils';

export const useSpendingAnalysis = (
  transactions: Transaction[],
  timeRange: 'week' | 'month'
): SpendingAnalysis | null => {
  return useMemo(() => {
    if (!transactions.length) return null;

    const now = new Date();

    // Get current period's start date based on timeRange
    const currentPeriodStart = new Date(now);
    if (timeRange === 'week') {
      // Get the current day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      const currentDay = now.getDay();
      // Calculate days to subtract to get to Monday (if Sunday, subtract 6, if Monday subtract 0, etc)
      const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
      currentPeriodStart.setDate(now.getDate() - daysToSubtract);
    } else {
      currentPeriodStart.setDate(1); // Start of current month
    }
    currentPeriodStart.setHours(0, 0, 0, 0);

    // Get previous period's start date
    const previousPeriodStart = new Date(currentPeriodStart);
    if (timeRange === 'week') {
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7); // Previous week
    } else {
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1); // Previous month
    }

    // Add debug logging
    console.log('📅 Date ranges:', {
      timeRange,
      now: now.toISOString(),
      currentPeriodStart: currentPeriodStart.toISOString(),
      previousPeriodStart: previousPeriodStart.toISOString(),
    });

    // Get current period's transactions
    const currentPeriodTransactions = transactions.filter(
      (t) => new Date(t.timestamp) >= currentPeriodStart
    );

    // Get previous period's transactions
    const previousPeriodTransactions = transactions.filter(
      (t) =>
        new Date(t.timestamp) >= previousPeriodStart && new Date(t.timestamp) < currentPeriodStart
    );

    // Add transaction count logging
    console.log('📊 Transaction counts:', {
      timeRange,
      total: transactions.length,
      currentPeriod: currentPeriodTransactions.length,
      previousPeriod: previousPeriodTransactions.length,
    });

    // Calculate totals
    const currentTotal = currentPeriodTransactions.reduce((sum, t) => {
      return sum + (t.amount < 0 ? Math.abs(t.amount) : 0);
    }, 0);

    const previousTotal = previousPeriodTransactions.reduce((sum, t) => {
      return sum + (t.amount < 0 ? Math.abs(t.amount) : 0);
    }, 0);

    // Calculate percentage change
    const percentageChange = previousTotal
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

    // Group by transaction type (DEBIT/CREDIT) and category
    const transactionTypes = {
      DEBIT: {
        total: currentPeriodTransactions.reduce(
          (sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0),
          0
        ),
        transactions: currentPeriodTransactions.filter((t) => t.amount < 0),
      },
      CREDIT: {
        total: currentPeriodTransactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0),
        transactions: currentPeriodTransactions.filter((t) => t.amount > 0),
      },
    };

    const totalVolume = transactionTypes.DEBIT.total + transactionTypes.CREDIT.total;

    // Group by category (only for spending/debit transactions)
    const categories = transactionTypes.DEBIT.transactions.reduce(
      (acc, t) => {
        const category = t.transaction_category || 'Other';
        if (!acc[category]) {
          acc[category] = {
            name: category,
            amount: 0,
            color: getCategoryColor(category),
          };
        }
        acc[category].amount += Math.abs(t.amount);
        return acc;
      },
      {} as Record<string, CategoryData>
    );

    // Generate insights
    const insights: SpendingInsight[] = [];

    // Category changes
    Object.entries(categories).forEach(([category, { amount }]) => {
      const previousAmount = previousPeriodTransactions
        .filter((t) => t.transaction_category === category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      if (previousAmount) {
        const change = ((amount - previousAmount) / previousAmount) * 100;
        if (Math.abs(change) > 15) {
          insights.push({
            type: change < 0 ? 'decrease' : 'increase',
            category,
            amount: Math.abs(amount - previousAmount),
            percentage: Math.abs(Math.round(change)),
            description: `${Math.abs(Math.round(change))}% ${change < 0 ? 'decrease' : 'increase'} in ${category} spending`,
          });
        }
      }
    });

    // Unusual payments
    currentPeriodTransactions.forEach((transaction) => {
      const category = transaction.transaction_category || 'Other';
      const categoryTransactions = currentPeriodTransactions.filter(
        (t) => t.transaction_category === category
      );
      const avgAmount =
        categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) /
        categoryTransactions.length;

      if (Math.abs(transaction.amount) > avgAmount * 2 && Math.abs(transaction.amount) > 50) {
        insights.push({
          type: 'unusual',
          category,
          amount: Math.abs(transaction.amount),
          description: `Unusual payment of £${Math.abs(transaction.amount).toFixed(2)} in ${category}`,
        });
      }
    });

    return {
      total: currentTotal,
      monthlyComparison: {
        percentageChange,
        previousMonthTotal: previousTotal,
      },
      transactionTypes: {
        debit: {
          total: transactionTypes.DEBIT.total,
          percentage: totalVolume > 0 ? (transactionTypes.DEBIT.total / totalVolume) * 100 : 0,
        },
        credit: {
          total: transactionTypes.CREDIT.total,
          percentage: totalVolume > 0 ? (transactionTypes.CREDIT.total / totalVolume) * 100 : 0,
        },
      },
      categories: Object.values(categories),
      insights: insights.slice(0, 3), // Show top 3 insights
    };
  }, [transactions, timeRange]);
};
