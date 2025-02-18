import { BalancePoint } from './balance';

/**
 * Time range for balance analysis
 */
export interface TimeRange {
  type: 'Day' | 'Week' | 'Month' | 'Year';
  startDate: Date;
  endDate: Date;
}

/**
 * Extended balance data for analysis and visualization
 */
export interface BalanceAnalysisData {
  currentBalance: number;
  startingBalance: number;
  moneyIn: number;
  moneyOut: number;
  upcomingPayments: {
    total: number;
    items: Array<{
      amount: number;
      date: string;
      description: string;
    }>;
  };
  estimatedBalance: {
    amount: number;
    date: string;
  };
  chartData: {
    labels: string[];
    current: number[];
    forecast?: number[];
  };
  currency: string;
  lastUpdated: string;
}
