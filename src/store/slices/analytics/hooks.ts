import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  selectSpendingAnalysis,
  selectBalanceAnalysis,
  calculateSpendingAnalysis,
  calculateBalanceAnalysis,
  setSpendingTimeRange,
  setBalanceTimeRange,
} from './analyticsSlice';
import type { Transaction } from '../../../types/transaction';
import type { BalanceAnalysisData, TimeRange } from '../../../types/bank/analysis';

export const useSpendingAnalysis = () => {
  const dispatch = useAppDispatch();
  const { analysis, timeRange, loading, error } = useAppSelector(selectSpendingAnalysis);

  const calculate = useCallback(
    (transactions: Transaction[]) => {
      dispatch(calculateSpendingAnalysis({ transactions, timeRange }));
    },
    [dispatch, timeRange]
  );

  const updateTimeRange = useCallback(
    (newTimeRange: 'week' | 'month') => {
      dispatch(setSpendingTimeRange(newTimeRange));
    },
    [dispatch]
  );

  return {
    analysis,
    timeRange,
    loading,
    error,
    calculate,
    updateTimeRange,
  };
};

export const useBalanceAnalysis = () => {
  const dispatch = useAppDispatch();
  const { analysis, timeRange, loading, error } = useAppSelector(selectBalanceAnalysis);

  const calculate = useCallback(
    (
      transactions: Transaction[],
      currentBalances: { connection_id: string; balance: number }[]
    ) => {
      dispatch(calculateBalanceAnalysis({ transactions, timeRange, currentBalances }));
    },
    [dispatch, timeRange]
  );

  const updateTimeRange = useCallback(
    (newTimeRange: 'week' | 'month' | 'year') => {
      dispatch(setBalanceTimeRange(newTimeRange));
    },
    [dispatch]
  );

  // Transform Redux state to component format
  const transformedAnalysis: BalanceAnalysisData | null = analysis
    ? {
        currentBalance: analysis.currentBalance,
        startingBalance: analysis.currentBalance - analysis.balanceChange,
        moneyIn: analysis.balanceHistory.reduce((sum, point) => {
          const change = point.balance;
          return sum + (change > 0 ? change : 0);
        }, 0),
        moneyOut: Math.abs(
          analysis.balanceHistory.reduce((sum, point) => {
            const change = point.balance;
            return sum + (change < 0 ? change : 0);
          }, 0)
        ),
        upcomingPayments: {
          total: 0, // We don't have this data in Redux yet
          items: [], // We don't have this data in Redux yet
        },
        estimatedBalance: {
          amount: analysis.projectedBalance,
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        },
        chartData: {
          labels: analysis.balanceHistory.map((point) => point.timestamp),
          current: analysis.balanceHistory.map((point) => point.balance),
          forecast: [], // Optional field, can be undefined
        },
        currency: 'GBP', // Default to GBP since we're UK-focused
        lastUpdated: new Date().toISOString(),
      }
    : null;

  return {
    analysis: transformedAnalysis,
    timeRange,
    loading,
    error,
    calculate,
    updateTimeRange,
  };
};
