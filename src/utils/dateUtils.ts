import { TargetPeriod } from '../types/target';

export const formatPeriod = (period: TargetPeriod): string => {
  switch (period) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Unknown';
  }
};

export const getTimeRemaining = (periodStart: string, period: TargetPeriod): string => {
  const start = new Date(periodStart);
  const now = new Date();
  const end = new Date(start);

  switch (period) {
    case 'daily':
      end.setDate(start.getDate() + 1);
      break;
    case 'weekly':
      end.setDate(start.getDate() + 7);
      break;
    case 'monthly':
      end.setMonth(start.getMonth() + 1);
      break;
    case 'yearly':
      end.setFullYear(start.getFullYear() + 1);
      break;
  }

  const remainingMs = end.getTime() - now.getTime();
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

  if (remainingMs <= 0) {
    return 'Period ended';
  }

  switch (period) {
    case 'daily':
      return `${remainingHours} hours remaining`;
    case 'weekly':
    case 'monthly':
    case 'yearly':
      return `${remainingDays} days remaining`;
  }
};
