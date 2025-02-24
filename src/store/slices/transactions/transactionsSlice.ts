import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  createSelector,
  PayloadAction,
} from '@reduxjs/toolkit';
import type { RootState } from '../../index';
import {
  TransactionState,
  FetchTransactionsPayload,
  UpdateTransactionCategoryPayload,
  SyncTransactionsPayload,
  SetFiltersPayload,
  SyncTransactionsResult,
  TransactionGroup,
  TransactionStats,
  TransactionSelectionCriteria,
  TransactionPatterns,
  TransactionPattern,
  SeasonalPattern,
  ScheduledTransaction,
} from './types';
import type { Transaction, DatabaseTransaction, BaseTransaction } from '../../../types/transaction';
import { createTransactionRepository } from '../../../repositories/transaction';
import { getTrueLayerApiService } from '../trueLayerSlice';
import { escapeRegExp } from '../../../utils/stringUtils';
import { selectConnections } from '../accountsSlice';
import type { BankConnection } from '../../../types/bank/connection';

// Create entity adapter
const transactionsAdapter = createEntityAdapter<Transaction, string>({
  selectId: (transaction) => transaction.id,
  sortComparer: (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
});

// Initial state
const initialState: TransactionState = {
  transactions: transactionsAdapter.getInitialState(),
  categories: [],
  merchantCategories: [],
  filters: {
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
    category: null,
    bankId: null,
    searchQuery: '',
  },
  loading: {
    transactions: false,
    categories: false,
    sync: false,
    patterns: false,
  },
  errors: {
    transactions: null,
    categories: null,
    sync: null,
    patterns: null,
  },
  lastSyncTime: {},
  patterns: {
    recurringTransactions: [],
    recurringPayments: [],
    scheduledTransactions: [],
    seasonalPatterns: [],
  },
};

// Thunks
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (payload: FetchTransactionsPayload, { getState, dispatch }) => {
    const state = getState() as RootState;
    const connections = selectConnections(state);

    // If no connections, return empty array
    if (!connections || connections.length === 0) {
      return [];
    }

    const repository = createTransactionRepository(getTrueLayerApiService());
    const transactions = await repository.getTransactions(payload.filters);
    return transactions;
  }
);

export const syncTransactions = createAsyncThunk<SyncTransactionsResult, SyncTransactionsPayload>(
  'transactions/syncTransactions',
  async (payload, { getState, dispatch }) => {
    const repository = createTransactionRepository(getTrueLayerApiService());
    await repository.syncTransactions(
      payload.connectionId,
      new Date(payload.fromDate),
      new Date(payload.toDate)
    );

    const transactions = await repository.getTransactions({
      connectionId: payload.connectionId,
      fromDate: new Date(payload.fromDate),
      toDate: new Date(payload.toDate),
    });

    return {
      connectionId: payload.connectionId,
      syncedTransactions: transactions.length,
      lastSyncTime: new Date().toISOString(),
    };
  }
);

export const fetchCategories = createAsyncThunk(
  'transactions/fetchCategories',
  async (_, { getState }) => {
    const repository = createTransactionRepository(getTrueLayerApiService());
    const [categories, merchantCategories] = await Promise.all([
      repository.getCategories(),
      repository.getMerchantCategories(),
    ]);
    return { categories, merchantCategories };
  }
);

export const updateTransactionCategory = createAsyncThunk(
  'transactions/updateCategory',
  async (payload: UpdateTransactionCategoryPayload, { getState }) => {
    const repository = createTransactionRepository(getTrueLayerApiService());
    await repository.updateTransactionCategory(payload.transactionId, payload.category);
    return payload;
  }
);

// Add new thunk for pattern detection
export const detectTransactionPatterns = createAsyncThunk(
  'transactions/detectPatterns',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const transactions = selectAllTransactions(state) as DatabaseTransaction[]; // Cast to DatabaseTransaction for scheduled_date access

    // Group transactions by description
    const transactionGroups = new Map<string, Transaction[]>();
    transactions.forEach((t) => {
      const key = t.description.toLowerCase();
      const group = transactionGroups.get(key) || [];
      group.push(t);
      transactionGroups.set(key, group);
    });

    const patterns: TransactionPatterns = {
      recurringTransactions: [],
      recurringPayments: [],
      scheduledTransactions: [],
      seasonalPatterns: [],
    };

    // Analyze each group for patterns
    transactionGroups.forEach((group, description) => {
      if (group.length < 2) return;

      // Sort by date
      const sortedGroup = [...group].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Calculate average interval between transactions
      const intervals: number[] = [];
      for (let i = 1; i < sortedGroup.length; i++) {
        const interval = Math.floor(
          (new Date(sortedGroup[i].timestamp).getTime() -
            new Date(sortedGroup[i - 1].timestamp).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        intervals.push(interval);
      }

      const averageInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
      const intervalVariance =
        intervals.reduce((sum, i) => sum + Math.pow(i - averageInterval, 2), 0) / intervals.length;

      // Check if the pattern is regular enough (low variance)
      const isRegular = intervalVariance < averageInterval * 0.2; // 20% variance threshold

      if (isRegular) {
        const averageAmount = group.reduce((sum, t) => sum + t.amount, 0) / group.length;
        const pattern: TransactionPattern = {
          pattern: new RegExp(escapeRegExp(description), 'i'),
          amount: averageAmount,
          frequency: Math.round(averageInterval),
        };

        if (averageAmount > 0) {
          patterns.recurringTransactions.push(pattern);
        } else {
          patterns.recurringPayments.push(pattern);
        }
      }
    });

    // Analyze seasonal patterns
    const monthlyAverages = new Map<number, number[]>();
    transactions.forEach((t) => {
      const month = new Date(t.timestamp).getMonth();
      const amounts = monthlyAverages.get(month) || [];
      amounts.push(t.amount);
      monthlyAverages.set(month, amounts);
    });

    // Calculate seasonal adjustments
    const overallAverage = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;
    monthlyAverages.forEach((amounts, month) => {
      const monthlyAverage = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const adjustment = (monthlyAverage - overallAverage) / overallAverage;

      // Only include significant seasonal patterns (>10% difference)
      if (Math.abs(adjustment) > 0.1) {
        patterns.seasonalPatterns.push({
          month,
          adjustment,
        });
      }
    });

    // Identify scheduled future transactions
    const now = new Date();
    const scheduledTransactions = transactions
      .filter((t) => t.scheduled_date && new Date(t.scheduled_date) > now)
      .map((t) => ({
        amount: t.amount,
        date: new Date(t.scheduled_date!),
      }));

    patterns.scheduledTransactions = scheduledTransactions;

    return patterns;
  }
);

// Slice
const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<SetFiltersPayload>) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearErrors: (state) => {
      state.errors = initialState.errors;
    },
  },
  extraReducers: (builder) => {
    // Fetch Transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading.transactions = true;
        state.errors.transactions = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading.transactions = false;
        transactionsAdapter.setAll(state.transactions, action.payload);
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading.transactions = false;
        state.errors.transactions = action.error.message || 'Failed to fetch transactions';
      })

      // Sync Transactions
      .addCase(syncTransactions.pending, (state) => {
        state.loading.sync = true;
        state.errors.sync = null;
      })
      .addCase(syncTransactions.fulfilled, (state, action) => {
        state.loading.sync = false;
        state.lastSyncTime[action.payload.connectionId] = action.payload.lastSyncTime;
      })
      .addCase(syncTransactions.rejected, (state, action) => {
        state.loading.sync = false;
        state.errors.sync = action.error.message || 'Failed to sync transactions';
      })

      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading.categories = true;
        state.errors.categories = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = action.payload.categories;
        state.merchantCategories = action.payload.merchantCategories;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading.categories = false;
        state.errors.categories = action.error.message || 'Failed to fetch categories';
      })

      // Update Transaction Category
      .addCase(updateTransactionCategory.fulfilled, (state, action) => {
        const { transactionId, category } = action.payload;

        // First, find the transaction that was directly updated
        const transaction = state.transactions.entities[transactionId];
        if (!transaction) return;

        // Get the merchant pattern to match other transactions
        const merchantPattern = transaction.merchant_name || transaction.description;

        // Update all transactions with matching merchant_name or description
        Object.values(state.transactions.entities).forEach((t) => {
          if (!t) return;
          if (t.merchant_name === merchantPattern || t.description === merchantPattern) {
            t.transaction_category = category;
          }
        });
      })

      // Pattern Detection
      .addCase(detectTransactionPatterns.pending, (state) => {
        state.loading.patterns = true;
        state.errors.patterns = null;
      })
      .addCase(detectTransactionPatterns.fulfilled, (state, action) => {
        state.loading.patterns = false;
        state.patterns = action.payload;
      })
      .addCase(detectTransactionPatterns.rejected, (state, action) => {
        state.loading.patterns = false;
        state.errors.patterns = action.error.message || 'Failed to detect patterns';
      });
  },
});

// Actions
export const { setFilters, resetFilters, clearErrors } = transactionsSlice.actions;

// Selectors
const selectTransactionsState = (state: RootState) => state.transactions;

export const {
  selectAll: selectAllTransactions,
  selectById: selectTransactionById,
  selectIds: selectTransactionIds,
} = transactionsAdapter.getSelectors((state: RootState) => state.transactions.transactions);

export const selectTransactionFilters = createSelector(
  [selectTransactionsState],
  (state) => state.filters
);

export const selectTransactionLoading = createSelector(
  [selectTransactionsState],
  (state) => state.loading
);

export const selectTransactionErrors = createSelector(
  [selectTransactionsState],
  (state) => state.errors
);

export const selectCategories = createSelector(
  [selectTransactionsState],
  (state) => state.categories
);

export const selectMerchantCategories = createSelector(
  [selectTransactionsState],
  (state) => state.merchantCategories
);

export const selectFilteredTransactions = createSelector(
  [selectAllTransactions, selectTransactionFilters],
  (transactions, filters) => {
    console.log('🔍 Filtering transactions:', {
      totalTransactions: transactions.length,
      categoryFilter: filters.category,
      transactionCategories: transactions.map((t) => ({
        id: t.id,
        category: t.transaction_category,
      })),
    });

    return transactions.filter((t: Transaction) => {
      const matchesSearch =
        !filters.searchQuery ||
        t.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (t.merchant_name?.toLowerCase() || '').includes(filters.searchQuery.toLowerCase());

      const matchesCategory = !filters.category || t.transaction_category === filters.category;

      console.log('🏷️ Transaction category check:', {
        transactionId: t.id,
        transactionCategory: t.transaction_category,
        filterCategory: filters.category,
        matches: matchesCategory,
      });

      const matchesBank = !filters.bankId || t.connection_id === filters.bankId;
      const matchesDateRange =
        new Date(t.timestamp) >= new Date(filters.dateRange.from) &&
        new Date(t.timestamp) <= new Date(filters.dateRange.to);

      return matchesSearch && matchesCategory && matchesBank && matchesDateRange;
    });
  }
);

export const selectTransactionGroups = createSelector(
  [selectFilteredTransactions],
  (transactions): TransactionGroup[] => {
    const groups = new Map<string, Transaction[]>();

    transactions.forEach((transaction: Transaction) => {
      const date = new Date(transaction.timestamp).toLocaleDateString();
      const group = groups.get(date) || [];
      group.push(transaction);
      groups.set(date, group);
    });

    return Array.from(groups.entries()).map(([date, transactions]) => {
      const totalAmount = transactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const bankTotals = transactions.reduce(
        (totals, t: Transaction) => {
          const bankId = t.connection_id;
          if (!totals[bankId]) {
            totals[bankId] = { amount: 0, name: t.merchant_name || 'Unknown' };
          }
          totals[bankId].amount += t.amount;
          return totals;
        },
        {} as { [key: string]: { amount: number; name: string } }
      );

      return {
        title: date,
        data: transactions,
        totalAmount,
        bankTotals,
      };
    });
  }
);

export const selectTransactionStats = createSelector(
  [selectFilteredTransactions],
  (transactions): TransactionStats => {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const averageAmount = totalAmount / totalTransactions;

    const categoryBreakdown = transactions.reduce(
      (breakdown: TransactionStats['categoryBreakdown'], t: Transaction) => {
        const category = t.transaction_category || 'Uncategorized';
        if (!breakdown[category]) {
          breakdown[category] = { count: 0, total: 0, percentage: 0 };
        }
        breakdown[category].count++;
        breakdown[category].total += t.amount;
        return breakdown;
      },
      {} as TransactionStats['categoryBreakdown']
    );

    // Calculate percentages
    Object.entries(categoryBreakdown).forEach(([_, category]) => {
      category.percentage = (category.count / totalTransactions) * 100;
    });

    return {
      totalTransactions,
      totalAmount,
      averageAmount,
      categoryBreakdown,
    };
  }
);

export const selectTransactionPatterns = (state: RootState) => state.transactions.patterns;
export const selectTransactionPatternsLoading = (state: RootState) =>
  state.transactions.loading.patterns;
export const selectTransactionPatternsError = (state: RootState) =>
  state.transactions.errors.patterns;

export default transactionsSlice.reducer;
