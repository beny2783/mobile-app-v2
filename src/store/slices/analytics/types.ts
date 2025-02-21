import { Transaction } from '../../../types/transaction';

export interface CategoryData {
  name: string;
  amount: number;
  color: string;
}

export interface SpendingInsight {
  type: 'increase' | 'decrease' | 'unusual';
  category: string;
  amount: number;
  percentage?: number;
  description: string;
}

export interface SpendingAnalysis {
  total: number;
  monthlyComparison: {
    percentageChange: number;
    previousMonthTotal: number;
  };
  transactionTypes: {
    debit: {
      total: number;
      percentage: number;
    };
    credit: {
      total: number;
      percentage: number;
    };
  };
  categories: CategoryData[];
  insights: SpendingInsight[];
}

export interface BalancePoint {
  timestamp: string;
  balance: number;
}

export interface BalanceAnalysis {
  currentBalance: number;
  balanceChange: number;
  percentageChange: number;
  projectedBalance: number;
  balanceHistory: BalancePoint[];
  insights: {
    trend: 'up' | 'down' | 'stable';
    message: string;
  };
}

export interface AnalyticsState {
  spending: {
    analysis: SpendingAnalysis | null;
    timeRange: 'week' | 'month';
    loading: boolean;
    error: string | null;
  };
  balance: {
    analysis: BalanceAnalysis | null;
    timeRange: 'week' | 'month' | 'year';
    loading: boolean;
    error: string | null;
  };
}

// Action Payloads
export interface CalculateSpendingAnalysisPayload {
  transactions: Transaction[];
  timeRange: 'week' | 'month';
}

export interface CalculateBalanceAnalysisPayload {
  transactions: Transaction[];
  timeRange: 'week' | 'month' | 'year';
  currentBalances: {
    connection_id: string;
    balance: number;
  }[];
}
