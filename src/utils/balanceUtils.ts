import { TimeRange } from '../types/bank/analysis';
import { BalanceData } from '../types/bank/balance';

export const getTimeRange = (type: TimeRange['type']): TimeRange => {
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

export const formatDate = (date: Date, format: 'chart' | 'full' = 'full'): string => {
  try {
    if (!date || isNaN(date.getTime())) {
      return '';
    }

    if (format === 'chart') {
      return date.getDate().toString();
    }

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
};

export type { BalanceData, TimeRange };
