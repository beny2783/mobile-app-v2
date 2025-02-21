import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../index';
import {
  AnalyticsState,
  CalculateSpendingAnalysisPayload,
  CalculateBalanceAnalysisPayload,
  SpendingAnalysis,
  BalanceAnalysis,
  SpendingInsight,
} from './types';
import { getCategoryColor } from '../../../utils/categoryUtils';

// Initial state
const initialState: AnalyticsState = {
  spending: {
    analysis: null,
    timeRange: 'month',
    loading: false,
    error: null,
  },
  balance: {
    analysis: null,
    timeRange: 'month',
    loading: false,
    error: null,
  },
};

// Thunks
export const calculateSpendingAnalysis = createAsyncThunk(
  'analytics/calculateSpendingAnalysis',
  async (payload: CalculateSpendingAnalysisPayload): Promise<SpendingAnalysis> => {
    const { transactions, timeRange } = payload;

    // Get current period's start date based on timeRange
    const now = new Date();
    const currentPeriodStart = new Date(now);
    if (timeRange === 'week') {
      const currentDay = now.getDay();
      const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
      currentPeriodStart.setDate(now.getDate() - daysToSubtract);
    } else {
      currentPeriodStart.setDate(1); // Start of current month
    }
    currentPeriodStart.setHours(0, 0, 0, 0);

    // Get previous period's start date
    const previousPeriodStart = new Date(currentPeriodStart);
    if (timeRange === 'week') {
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
    } else {
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    }

    // Get current period's transactions
    const currentPeriodTransactions = transactions.filter(
      (t) => new Date(t.timestamp) >= currentPeriodStart
    );

    // Get previous period's transactions
    const previousPeriodTransactions = transactions.filter(
      (t) =>
        new Date(t.timestamp) >= previousPeriodStart && new Date(t.timestamp) < currentPeriodStart
    );

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

    // Group by transaction type (DEBIT/CREDIT)
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

    // Group by category
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
      {} as Record<string, { name: string; amount: number; color: string }>
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
            description: `${Math.abs(Math.round(change))}% ${
              change < 0 ? 'decrease' : 'increase'
            } in ${category} spending`,
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
  }
);

export const calculateBalanceAnalysis = createAsyncThunk(
  'analytics/calculateBalanceAnalysis',
  async (payload: CalculateBalanceAnalysisPayload): Promise<BalanceAnalysis> => {
    const { transactions, timeRange, currentBalances } = payload;

    // Calculate current total balance
    const currentBalance = currentBalances.reduce((sum, acc) => sum + acc.balance, 0);

    // Get date range
    const now = new Date();
    const startDate = new Date(now);
    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // Calculate balance history
    const balanceHistory = transactions
      .filter((t) => new Date(t.timestamp) >= startDate)
      .reduce(
        (points, t) => {
          const date = new Date(t.timestamp).toISOString().split('T')[0];
          const existingPoint = points.find((p) => p.timestamp === date);

          if (existingPoint) {
            existingPoint.balance += t.amount;
          } else {
            points.push({
              timestamp: date,
              balance: t.amount,
            });
          }
          return points;
        },
        [] as { timestamp: string; balance: number }[]
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate balance change
    const oldestBalance = balanceHistory[0]?.balance || 0;
    const balanceChange = currentBalance - oldestBalance;
    const percentageChange = oldestBalance ? (balanceChange / oldestBalance) * 100 : 0;

    // Calculate projected balance using simple linear regression
    const projectedBalance = currentBalance + balanceChange / balanceHistory.length;

    // Determine trend
    const trend = balanceChange > 0 ? 'up' : balanceChange < 0 ? 'down' : 'stable';
    const message = `Your balance has ${
      trend === 'up' ? 'increased' : trend === 'down' ? 'decreased' : 'remained stable'
    } by ${Math.abs(percentageChange).toFixed(1)}% over the ${timeRange}`;

    return {
      currentBalance,
      balanceChange,
      percentageChange,
      projectedBalance,
      balanceHistory,
      insights: {
        trend,
        message,
      },
    };
  }
);

// Slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setSpendingTimeRange: (state, action) => {
      state.spending.timeRange = action.payload;
    },
    setBalanceTimeRange: (state, action) => {
      state.balance.timeRange = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Spending Analysis
      .addCase(calculateSpendingAnalysis.pending, (state) => {
        state.spending.loading = true;
        state.spending.error = null;
      })
      .addCase(calculateSpendingAnalysis.fulfilled, (state, action) => {
        state.spending.loading = false;
        state.spending.analysis = action.payload;
      })
      .addCase(calculateSpendingAnalysis.rejected, (state, action) => {
        state.spending.loading = false;
        state.spending.error = action.error.message || 'Failed to calculate spending analysis';
      })

      // Balance Analysis
      .addCase(calculateBalanceAnalysis.pending, (state) => {
        state.balance.loading = true;
        state.balance.error = null;
      })
      .addCase(calculateBalanceAnalysis.fulfilled, (state, action) => {
        state.balance.loading = false;
        state.balance.analysis = action.payload;
      })
      .addCase(calculateBalanceAnalysis.rejected, (state, action) => {
        state.balance.loading = false;
        state.balance.error = action.error.message || 'Failed to calculate balance analysis';
      });
  },
});

// Actions
export const { setSpendingTimeRange, setBalanceTimeRange } = analyticsSlice.actions;

// Selectors
export const selectSpendingAnalysis = (state: RootState) => state.analytics.spending;
export const selectBalanceAnalysis = (state: RootState) => state.analytics.balance;

export default analyticsSlice.reducer;
