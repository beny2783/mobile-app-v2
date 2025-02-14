import { useMemo } from 'react';
import { Transaction } from '../types';
import {
  getCategoryColor,
  SpendingAnalysis,
  CategoryData,
  SpendingInsight,
} from '../utils/categoryUtils';

export const useSpendingAnalysis = (transactions: Transaction[]): SpendingAnalysis | null => {
  return useMemo(() => {
    if (!transactions.length) return null;

    // Get current month's transactions
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthTransactions = transactions.filter(
      (t) => new Date(t.timestamp) >= currentMonthStart
    );

    // Get previous month's transactions
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthTransactions = transactions.filter(
      (t) =>
        new Date(t.timestamp) >= previousMonthStart && new Date(t.timestamp) < currentMonthStart
    );

    // Calculate totals
    const currentTotal = Math.abs(currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0));
    const previousTotal = Math.abs(previousMonthTransactions.reduce((sum, t) => sum + t.amount, 0));
    const percentageChange = previousTotal
      ? ((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100
      : 0;

    // Group by category
    const categories = currentMonthTransactions.reduce(
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
      const previousAmount = previousMonthTransactions
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
    currentMonthTransactions.forEach((transaction) => {
      const category = transaction.transaction_category || 'Other';
      const categoryTransactions = currentMonthTransactions.filter(
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
      categories: Object.values(categories),
      insights: insights.slice(0, 3), // Show top 3 insights
    };
  }, [transactions]);
};
