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
} from './types';
import { Transaction } from '../../../types/transaction';
import { createTransactionRepository } from '../../../repositories/transaction';
import { getTrueLayerApiService } from '../trueLayerSlice';

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
  },
  errors: {
    transactions: null,
    categories: null,
    sync: null,
  },
  lastSyncTime: {},
  patterns: {
    recurring: [],
    seasonal: [],
    scheduled: [],
  },
};

// Thunks
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (payload: FetchTransactionsPayload, { getState, dispatch }) => {
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
        const transaction = state.transactions.entities[transactionId];
        if (transaction) {
          transaction.transaction_category = category;
        }
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
    return transactions.filter((t: Transaction) => {
      const matchesSearch =
        !filters.searchQuery ||
        t.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (t.merchant_name?.toLowerCase() || '').includes(filters.searchQuery.toLowerCase());

      const matchesCategory = !filters.category || t.transaction_category === filters.category;
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

export default transactionsSlice.reducer;
