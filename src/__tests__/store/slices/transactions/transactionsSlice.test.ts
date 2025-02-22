import { configureStore, Action, ThunkAction, AnyAction, Reducer } from '@reduxjs/toolkit';
import transactionsReducer, {
  detectTransactionPatterns,
  selectTransactionPatterns,
  selectTransactionPatternsLoading,
  selectTransactionPatternsError,
} from '../../../../store/slices/transactions/transactionsSlice';
import type { Transaction, DatabaseTransaction } from '../../../../types/transaction/index';
import type { TransactionState } from '../../../../store/slices/transactions/types';
import type { TransactionFilters } from '../../../../repositories/types';
import type { RootState } from '../../../../store';
import type { Session, User } from '@supabase/supabase-js';
import type { TrueLayerError } from '../../../../services/trueLayer/types';
import type { BankConnectionWithAccounts } from '../../../../types/bank/connection';
import type { DatabaseBankAccount } from '../../../../types/bank/database';
import type { CategoryTarget, TargetSummary } from '../../../../types/target';
import type { SpendingAnalysis, BalanceAnalysis } from '../../../../store/slices/analytics/types';

// Create mock state types that match the actual state interfaces
interface MockAuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface MockUIState {
  isLoading: boolean;
  globalError: string | null;
}

interface MockAccountsState {
  connections: {
    items: Record<string, BankConnectionWithAccounts>;
    loading: boolean;
    error: TrueLayerError | null;
  };
  accounts: {
    items: Record<string, DatabaseBankAccount>;
    byConnection: Record<string, string[]>;
    loading: boolean;
    error: TrueLayerError | null;
  };
  status: {
    lastSync: string | null;
    isRefreshing: boolean;
  };
}

interface MockBudgetState {
  categoryTargets: CategoryTarget[];
  targetSummary: TargetSummary | null;
  loading: boolean;
  error: string | null;
}

interface MockTrueLayerState {
  loading: boolean;
  error: string | null;
}

interface MockAnalyticsState {
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

type MockRootState = {
  auth: MockAuthState;
  ui: MockUIState;
  accounts: MockAccountsState;
  budget: MockBudgetState;
  trueLayer: MockTrueLayerState;
  transactions: TransactionState;
  analytics: MockAnalyticsState;
};

// Create a mock store type that matches the actual store structure
type MockStore = ReturnType<
  typeof configureStore<{
    auth: MockAuthState;
    ui: MockUIState;
    accounts: MockAccountsState;
    budget: MockBudgetState;
    trueLayer: MockTrueLayerState;
    transactions: TransactionState;
    analytics: MockAnalyticsState;
  }>
>;

describe('Transaction Pattern Detection', () => {
  const mockStore = configureStore({
    reducer: {
      auth: (() => ({
        user: null,
        session: null,
        loading: false,
        error: null,
      })) as Reducer<MockAuthState>,
      ui: (() => ({
        isLoading: false,
        globalError: null,
      })) as Reducer<MockUIState>,
      accounts: (() => ({
        connections: {
          items: {},
          loading: false,
          error: null,
        },
        accounts: {
          items: {},
          byConnection: {},
          loading: false,
          error: null,
        },
        status: {
          lastSync: null,
          isRefreshing: false,
        },
      })) as Reducer<MockAccountsState>,
      budget: (() => ({
        categoryTargets: [],
        targetSummary: {
          monthlySpendingLimit: 2000,
          currentSpending: 1500,
          savingsGoal: 500,
          currentSavings: 300,
          categoryTargets: [],
          trendData: {
            labels: [],
            spending: [],
            target: [],
          },
          achievements: [],
        },
        loading: false,
        error: null,
      })) as Reducer<MockBudgetState>,
      trueLayer: (() => ({
        loading: false,
        error: null,
      })) as Reducer<MockTrueLayerState>,
      transactions: transactionsReducer,
      analytics: (() => ({
        spending: {
          analysis: {
            total: 1500,
            monthlyComparison: {
              percentageChange: 10,
              previousMonthTotal: 1350,
            },
            transactionTypes: {
              debit: {
                total: 1500,
                percentage: 75,
              },
              credit: {
                total: 500,
                percentage: 25,
              },
            },
            categories: [],
            insights: [],
          },
          timeRange: 'month',
          loading: false,
          error: null,
        },
        balance: {
          analysis: {
            currentBalance: 5000,
            balanceChange: 500,
            percentageChange: 10,
            projectedBalance: 5500,
            balanceHistory: [],
            insights: {
              trend: 'up',
              message: 'Your balance has increased by 10% over the month',
            },
          },
          timeRange: 'month',
          loading: false,
          error: null,
        },
      })) as Reducer<MockAnalyticsState>,
    },
  }) as MockStore;

  beforeEach(() => {
    mockStore.dispatch({ type: 'RESET_STATE' });
  });

  describe('detectTransactionPatterns', () => {
    it('should detect recurring transactions', async () => {
      // Setup recurring transaction data with all required properties
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          transaction_id: 'txn1',
          description: 'Netflix Subscription',
          amount: -9.99,
          timestamp: '2024-01-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Netflix',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          metadata: {},
        },
        {
          id: '2',
          transaction_id: 'txn2',
          description: 'Netflix Subscription',
          amount: -9.99,
          timestamp: '2024-02-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Netflix',
          created_at: '2024-02-01',
          updated_at: '2024-02-01',
          metadata: {},
        },
        {
          id: '3',
          transaction_id: 'txn3',
          description: 'Netflix Subscription',
          amount: -9.99,
          timestamp: '2024-03-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Netflix',
          created_at: '2024-03-01',
          updated_at: '2024-03-01',
          metadata: {},
        },
      ];

      // Add transactions to store
      mockStore.dispatch({
        type: 'transactions/fetchTransactions/fulfilled',
        payload: mockTransactions,
      });

      // Detect patterns
      await mockStore.dispatch(detectTransactionPatterns());

      // Get results
      const state = mockStore.getState();
      const patterns = selectTransactionPatterns(state);

      // Assertions
      expect(patterns.recurringPayments).toHaveLength(1);
      expect(patterns.recurringPayments[0]).toMatchObject({
        amount: -9.99,
        frequency: 30, // ~30 days between transactions
      });
      expect(patterns.recurringPayments[0].pattern.toString()).toContain('netflix subscription');
    });

    it('should detect seasonal patterns', async () => {
      // Setup seasonal transaction data
      const mockTransactions: Transaction[] = [
        // Summer spending (higher)
        {
          id: '1',
          transaction_id: 'txn1',
          description: 'Summer Activity',
          amount: -100,
          timestamp: '2023-06-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Summer Venue',
          created_at: '2023-06-01',
          updated_at: '2023-06-01',
          metadata: {},
        },
        {
          id: '2',
          transaction_id: 'txn2',
          description: 'Summer Activity',
          amount: -120,
          timestamp: '2023-07-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Summer Venue',
          created_at: '2023-07-01',
          updated_at: '2023-07-01',
          metadata: {},
        },
        {
          id: '3',
          transaction_id: 'txn3',
          description: 'Summer Activity',
          amount: -110,
          timestamp: '2023-08-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Summer Venue',
          created_at: '2023-08-01',
          updated_at: '2023-08-01',
          metadata: {},
        },
        // Winter spending (lower)
        {
          id: '4',
          transaction_id: 'txn4',
          description: 'Winter Activity',
          amount: -50,
          timestamp: '2023-12-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Winter Venue',
          created_at: '2023-12-01',
          updated_at: '2023-12-01',
          metadata: {},
        },
        {
          id: '5',
          transaction_id: 'txn5',
          description: 'Winter Activity',
          amount: -40,
          timestamp: '2024-01-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Winter Venue',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          metadata: {},
        },
        {
          id: '6',
          transaction_id: 'txn6',
          description: 'Winter Activity',
          amount: -45,
          timestamp: '2024-02-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'entertainment',
          merchant_name: 'Winter Venue',
          created_at: '2024-02-01',
          updated_at: '2024-02-01',
          metadata: {},
        },
      ];

      // Add transactions to store
      mockStore.dispatch({
        type: 'transactions/fetchTransactions/fulfilled',
        payload: mockTransactions,
      });

      // Detect patterns
      await mockStore.dispatch(detectTransactionPatterns());

      // Get results
      const state = mockStore.getState();
      const patterns = selectTransactionPatterns(state);

      // Assertions
      expect(patterns.seasonalPatterns).toHaveLength(2); // Summer and winter patterns
      expect(patterns.seasonalPatterns).toContainEqual(
        expect.objectContaining({
          month: expect.any(Number),
          adjustment: expect.any(Number),
        })
      );
    });

    it('should detect scheduled transactions', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const mockTransactions: Transaction[] = [
        {
          id: '1',
          transaction_id: 'txn1',
          description: 'Future Payment',
          amount: -50,
          timestamp: '2024-01-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'scheduled',
          transaction_category: 'bills',
          merchant_name: 'Utility Company',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          metadata: {
            scheduled_date: futureDate.toISOString(),
          },
        },
      ];

      // Add transactions to store
      mockStore.dispatch({
        type: 'transactions/fetchTransactions/fulfilled',
        payload: mockTransactions,
      });

      // Detect patterns
      await mockStore.dispatch(detectTransactionPatterns());

      // Get results
      const state = mockStore.getState();
      const patterns = selectTransactionPatterns(state);

      // Assertions
      expect(patterns.scheduledTransactions).toHaveLength(1);
      expect(patterns.scheduledTransactions[0]).toMatchObject({
        amount: -50,
        date: expect.any(Date),
      });
    });

    it('should handle loading states correctly', async () => {
      // Before detection
      expect(selectTransactionPatternsLoading(mockStore.getState())).toBe(false);

      // Start detection
      const detectionPromise = mockStore.dispatch(detectTransactionPatterns());
      expect(selectTransactionPatternsLoading(mockStore.getState())).toBe(true);

      // After detection
      await detectionPromise;
      expect(selectTransactionPatternsLoading(mockStore.getState())).toBe(false);
      expect(selectTransactionPatternsError(mockStore.getState())).toBe(null);
    });

    it('should handle empty transaction list', async () => {
      // Add empty transaction list
      mockStore.dispatch({
        type: 'transactions/fetchTransactions/fulfilled',
        payload: [],
      });

      // Detect patterns
      await mockStore.dispatch(detectTransactionPatterns());

      // Get results
      const state = mockStore.getState();
      const patterns = selectTransactionPatterns(state);

      // Assertions
      expect(patterns.recurringTransactions).toHaveLength(0);
      expect(patterns.recurringPayments).toHaveLength(0);
      expect(patterns.scheduledTransactions).toHaveLength(0);
      expect(patterns.seasonalPatterns).toHaveLength(0);
    });

    it('should handle irregular transactions correctly', async () => {
      // Setup transactions with irregular intervals
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          transaction_id: 'txn1',
          description: 'Irregular Payment',
          amount: -50,
          timestamp: '2024-01-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'misc',
          merchant_name: 'Various',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          metadata: {},
        },
        {
          id: '2',
          transaction_id: 'txn2',
          description: 'Irregular Payment',
          amount: -50,
          timestamp: '2024-01-15', // Irregular interval
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'misc',
          merchant_name: 'Various',
          created_at: '2024-01-15',
          updated_at: '2024-01-15',
          metadata: {},
        },
        {
          id: '3',
          transaction_id: 'txn3',
          description: 'Irregular Payment',
          amount: -50,
          timestamp: '2024-02-10', // Irregular interval
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'misc',
          merchant_name: 'Various',
          created_at: '2024-02-10',
          updated_at: '2024-02-10',
          metadata: {},
        },
      ];

      mockStore.dispatch({
        type: 'transactions/fetchTransactions/fulfilled',
        payload: mockTransactions,
      });

      await mockStore.dispatch(detectTransactionPatterns());

      const state = mockStore.getState();
      const patterns = selectTransactionPatterns(state);

      // Should not detect as recurring due to irregular intervals
      expect(patterns.recurringPayments).toHaveLength(0);
    });

    it('should handle varying amounts in recurring transactions', async () => {
      // Setup transactions with similar but not exact amounts
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          transaction_id: 'txn1',
          description: 'Utility Bill',
          amount: -98.5,
          timestamp: '2024-01-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'utilities',
          merchant_name: 'Utility Co',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          metadata: {},
        },
        {
          id: '2',
          transaction_id: 'txn2',
          description: 'Utility Bill',
          amount: -102.75,
          timestamp: '2024-02-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'utilities',
          merchant_name: 'Utility Co',
          created_at: '2024-02-01',
          updated_at: '2024-02-01',
          metadata: {},
        },
        {
          id: '3',
          transaction_id: 'txn3',
          description: 'Utility Bill',
          amount: -95.25,
          timestamp: '2024-03-01',
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'utilities',
          merchant_name: 'Utility Co',
          created_at: '2024-03-01',
          updated_at: '2024-03-01',
          metadata: {},
        },
      ];

      mockStore.dispatch({
        type: 'transactions/fetchTransactions/fulfilled',
        payload: mockTransactions,
      });

      await mockStore.dispatch(detectTransactionPatterns());

      const state = mockStore.getState();
      const patterns = selectTransactionPatterns(state);

      // Should detect as recurring with average amount
      expect(patterns.recurringPayments).toHaveLength(1);
      expect(patterns.recurringPayments[0]).toMatchObject({
        amount: expect.closeTo(-98.83, 0.01), // Average of the three amounts
        frequency: 30,
      });
    });

    it('should handle error cases gracefully', async () => {
      // Setup invalid transaction data
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          transaction_id: 'txn1',
          description: 'Invalid Transaction',
          amount: -50,
          timestamp: 'invalid-date', // Invalid date
          currency: 'GBP',
          connection_id: 'conn1',
          user_id: 'user1',
          transaction_type: 'debit',
          transaction_category: 'misc',
          merchant_name: 'Various',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          metadata: {},
        },
      ];

      mockStore.dispatch({
        type: 'transactions/fetchTransactions/fulfilled',
        payload: mockTransactions,
      });

      await mockStore.dispatch(detectTransactionPatterns());

      const state = mockStore.getState();
      const error = selectTransactionPatternsError(state);

      // Should handle the error gracefully
      expect(error).not.toBeNull();
      expect(error).toContain('Failed to detect patterns');
    });
  });
});
