import { TimeRange, BalanceAnalysisData } from '../../../types/bank/analysis';

describe('Bank Analysis Type System', () => {
  describe('TimeRange Type', () => {
    it('should validate TimeRange type', () => {
      const validTimeRange: TimeRange = {
        type: 'Month',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const invalidTimeRange = {
        type: 'Quarter', // invalid type
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
      };

      expect(validTimeRange.type).toBe('Month');
      expect(['Day', 'Week', 'Month', 'Year']).toContain(validTimeRange.type);
      expect(['Day', 'Week', 'Month', 'Year']).not.toContain(invalidTimeRange.type);
    });

    it('should enforce valid date ranges', () => {
      const validTimeRange: TimeRange = {
        type: 'Week',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
      };

      expect(validTimeRange.endDate.getTime()).toBeGreaterThan(validTimeRange.startDate.getTime());
      expect(validTimeRange.endDate.getTime() - validTimeRange.startDate.getTime()).toBe(
        6 * 24 * 60 * 60 * 1000
      );
    });

    it('should handle different time range types', () => {
      const dayRange: TimeRange = {
        type: 'Day',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-01'),
      };

      const weekRange: TimeRange = {
        type: 'Week',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
      };

      const monthRange: TimeRange = {
        type: 'Month',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const yearRange: TimeRange = {
        type: 'Year',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      expect(dayRange.startDate).toEqual(dayRange.endDate);
      expect(weekRange.endDate.getDate() - weekRange.startDate.getDate()).toBe(6);
      expect(monthRange.endDate.getDate()).toBe(31);
      expect(yearRange.endDate.getMonth()).toBe(11);
    });
  });

  describe('BalanceAnalysisData Type', () => {
    it('should validate BalanceAnalysisData type', () => {
      const validAnalysisData: BalanceAnalysisData = {
        currentBalance: 1000,
        startingBalance: 800,
        moneyIn: 500,
        moneyOut: 300,
        upcomingPayments: {
          total: 200,
          items: [
            {
              amount: 200,
              date: '2024-02-01',
              description: 'Upcoming Bill',
            },
          ],
        },
        estimatedBalance: {
          amount: 800,
          date: '2024-02-01',
        },
        chartData: {
          labels: ['Jan 1', 'Jan 2'],
          current: [1000, 900],
          forecast: [900, 800],
        },
        currency: 'GBP',
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      expect(validAnalysisData.moneyIn - validAnalysisData.moneyOut).toBe(200);
      expect(validAnalysisData.chartData.labels.length).toBe(
        validAnalysisData.chartData.current.length
      );
      expect(validAnalysisData.upcomingPayments.total).toBe(
        validAnalysisData.upcomingPayments.items[0].amount
      );
    });

    it('should handle optional forecast data', () => {
      const analysisWithoutForecast: BalanceAnalysisData = {
        currentBalance: 1000,
        startingBalance: 800,
        moneyIn: 500,
        moneyOut: 300,
        upcomingPayments: {
          total: 0,
          items: [],
        },
        estimatedBalance: {
          amount: 1000,
          date: '2024-02-01',
        },
        chartData: {
          labels: ['Jan 1', 'Jan 2'],
          current: [1000, 900],
        },
        currency: 'GBP',
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      expect(analysisWithoutForecast.chartData.forecast).toBeUndefined();
      expect(analysisWithoutForecast.upcomingPayments.items).toHaveLength(0);
    });

    it('should validate chart data consistency', () => {
      const validAnalysisData: BalanceAnalysisData = {
        currentBalance: 1000,
        startingBalance: 800,
        moneyIn: 500,
        moneyOut: 300,
        upcomingPayments: {
          total: 0,
          items: [],
        },
        estimatedBalance: {
          amount: 1000,
          date: '2024-02-01',
        },
        chartData: {
          labels: ['Jan 1', 'Jan 2', 'Jan 3'],
          current: [800, 900, 1000],
          forecast: [1000, 950, 900],
        },
        currency: 'GBP',
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      expect(validAnalysisData.chartData.labels.length).toBe(
        validAnalysisData.chartData.current.length
      );
      expect(validAnalysisData.chartData.current.length).toBe(
        validAnalysisData.chartData.forecast?.length
      );
      expect(validAnalysisData.chartData.current[0]).toBe(validAnalysisData.startingBalance);
      expect(
        validAnalysisData.chartData.current[validAnalysisData.chartData.current.length - 1]
      ).toBe(validAnalysisData.currentBalance);
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure proper data consistency', () => {
      const timeRange: TimeRange = {
        type: 'Month',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const analysisData: BalanceAnalysisData = {
        currentBalance: 1000,
        startingBalance: 800,
        moneyIn: 500,
        moneyOut: 300,
        upcomingPayments: {
          total: 200,
          items: [
            {
              amount: 200,
              date: timeRange.endDate.toISOString().split('T')[0],
              description: 'End of Month Payment',
            },
          ],
        },
        estimatedBalance: {
          amount: 800,
          date: timeRange.endDate.toISOString(),
        },
        chartData: {
          labels: ['Jan 1', 'Jan 31'],
          current: [800, 1000],
          forecast: [1000, 800],
        },
        currency: 'GBP',
        lastUpdated: new Date().toISOString(),
      };

      expect(analysisData.upcomingPayments.items[0].date).toBe(
        timeRange.endDate.toISOString().split('T')[0]
      );
      expect(analysisData.chartData.current[0]).toBe(analysisData.startingBalance);
      expect(analysisData.chartData.current[1]).toBe(analysisData.currentBalance);
    });
  });
});
