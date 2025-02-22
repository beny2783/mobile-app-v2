import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { selectConnections } from '../accountsSlice';
import {
  selectAllTransactions,
  selectTransactionById,
  selectTransactionFilters,
  selectTransactionLoading,
  selectTransactionErrors,
  selectCategories,
  selectMerchantCategories,
  selectFilteredTransactions,
  selectTransactionGroups,
  selectTransactionStats,
  selectTransactionPatterns,
  fetchTransactions,
  syncTransactions,
  fetchCategories,
  updateTransactionCategory,
  setFilters,
  resetFilters,
  clearErrors,
  detectTransactionPatterns,
} from './transactionsSlice';
import type {
  SetFiltersPayload,
  UpdateTransactionCategoryPayload,
  SyncTransactionsPayload,
} from './types';
import type { TransactionFilters } from '../../../types/transaction';
import type { BankConnection } from '../../../types/bank/connection';

export const useTransactions = () => {
  const dispatch = useAppDispatch();
  const connections = useAppSelector(selectConnections);
  const allTransactions = useAppSelector(selectAllTransactions);
  const filteredTransactions = useAppSelector(selectFilteredTransactions);
  const transactionGroups = useAppSelector(selectTransactionGroups);
  const stats = useAppSelector(selectTransactionStats);
  const patterns = useAppSelector(selectTransactionPatterns);
  const filters = useAppSelector(selectTransactionFilters);
  const loading = useAppSelector(selectTransactionLoading);
  const errors = useAppSelector(selectTransactionErrors);
  const categories = useAppSelector(selectCategories);
  const merchantCategories = useAppSelector(selectMerchantCategories);

  const fetch = useCallback(
    (filters: TransactionFilters) => {
      if (connections && connections.length > 0) {
        dispatch(fetchTransactions({ filters }));
      }
    },
    [dispatch, connections]
  );

  const sync = useCallback(
    (payload: SyncTransactionsPayload) => {
      dispatch(syncTransactions(payload));
    },
    [dispatch]
  );

  const updateCategory = useCallback(
    (payload: UpdateTransactionCategoryPayload) => {
      dispatch(updateTransactionCategory(payload));
    },
    [dispatch]
  );

  const updateFilters = useCallback(
    (payload: SetFiltersPayload) => {
      dispatch(setFilters(payload));
    },
    [dispatch]
  );

  const reset = useCallback(() => {
    dispatch(resetFilters());
  }, [dispatch]);

  const clearAllErrors = useCallback(() => {
    dispatch(clearErrors());
  }, [dispatch]);

  const refreshCategories = useCallback(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const detectPatterns = useCallback(() => {
    dispatch(detectTransactionPatterns());
  }, [dispatch]);

  return {
    // State
    allTransactions,
    filteredTransactions,
    transactionGroups,
    stats,
    patterns,
    filters,
    loading,
    errors,
    categories,
    merchantCategories,
    hasConnections: connections && connections.length > 0,

    // Actions
    fetch,
    sync,
    updateCategory,
    updateFilters,
    reset,
    clearAllErrors,
    refreshCategories,
    detectPatterns,
  };
};

export const useTransaction = (id: string) => {
  const transaction = useAppSelector((state) => selectTransactionById(state, id));
  const dispatch = useAppDispatch();

  const updateCategory = useCallback(
    (category: string) => {
      if (transaction) {
        dispatch(updateTransactionCategory({ transactionId: transaction.id, category }));
      }
    },
    [dispatch, transaction]
  );

  return {
    transaction,
    updateCategory,
  };
};
