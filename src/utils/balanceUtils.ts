export interface BalanceData {
  currentBalance: number;
  startingBalance: number;
  moneyIn: number;
  moneyOut: number;
  chartData: {
    current: number[];
    estimated: number[];
    labels: string[];
  };
  upcomingPayments: {
    total: number;
    recurring: number;
    scheduled: number;
    date: string;
  };
  estimatedBalance: {
    amount: number;
    confidence: number;
    date: string;
  };
}

export interface TimeRange {
  type: 'Month' | 'Year';
  startDate: Date;
  endDate: Date;
}

export const getTimeRange = (type: 'Month' | 'Year'): TimeRange => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), type === 'Month' ? now.getMonth() : 0, 1);
  const endDate = new Date(
    now.getFullYear(),
    type === 'Month' ? now.getMonth() + 1 : 11,
    type === 'Month' ? 0 : 31
  );

  return {
    type,
    startDate,
    endDate,
  };
};

export const formatCurrency = (amount: number): string => {
  return `£${Math.abs(amount).toFixed(2)}`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};
