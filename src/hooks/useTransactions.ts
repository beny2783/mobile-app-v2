import { useState, useCallback, useMemo, useEffect } from 'react';
import { useServices } from '../contexts/ServiceContext';
import { useDataFetching } from './useDataFetching';
import { supabase } from '../services/supabase';
import { useBankConnections } from './useBankConnections';
import type { DatabaseTransaction } from '../types/transaction';
import type { BankConnectionWithAccounts } from '../types/bank/connection';
import { authRepository } from '../repositories/auth';
import { createTransactionRepository } from '../repositories/transaction';
import { ITrueLayerApiService } from '../services/trueLayer/types';
import { BankConnection } from '../types/bank/connection';

interface DateRange {
  from: Date;
  to: Date;
}

interface MerchantCategory {
  category: string;
  merchant_pattern: string;
}

interface UseTransactionsResult {
  transactions: DatabaseTransaction[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => void;
  setDateRange: (range: DateRange) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedBank: (bankId: string | null) => void;
  categories: string[];
  selectedCategory: string | null;
  selectedBank: string | null;
  searchQuery: string;
  dateRange: DateRange;
  bankConnections: BankConnectionWithAccounts[];
  groupedTransactions: {
    title: string;
    data: DatabaseTransaction[];
    totalAmount: number;
    bankTotals: { [key: string]: { amount: number; name: string } };
  }[];
}

export function useTransactions(): UseTransactionsResult {
  console.log('🎣 useTransactions: Hook initialized');

  const { trueLayerService } = useServices();
  const { connections } = useBankConnections();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [merchantCategories, setMerchantCategories] = useState<MerchantCategory[]>([]);

  // Create repository instance with type assertion
  const repository = useMemo(
    () => createTransactionRepository(trueLayerService as unknown as ITrueLayerApiService),
    [trueLayerService]
  );

  // Log state changes
  useEffect(() => {
    console.log('🔄 useTransactions: State updated', {
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      selectedCategory,
      selectedBank,
      searchQuery,
      categoriesCount: categories.length,
    });
  }, [dateRange, selectedCategory, selectedBank, searchQuery, categories]);

  // Fetch transactions using our data fetching hook
  const fetchTransactions = useCallback(async () => {
    console.log('📊 useTransactions: Fetching transactions...', {
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      activeConnections: connections.length,
    });

    const allTransactions = [];
    for (const connection of connections) {
      try {
        console.log(`🏦 Fetching transactions for bank connection: ${connection.id}`);
        const connectionTransactions = await repository.getTransactions({
          connectionId: connection.id,
          fromDate: dateRange.from,
          toDate: dateRange.to,
        });
        console.log(
          `✅ Fetched ${connectionTransactions.length} transactions for connection ${connection.id}`
        );
        allTransactions.push(...connectionTransactions);
      } catch (error) {
        console.error(`❌ Failed to fetch transactions for connection ${connection.id}:`, error);
      }
    }

    // Sort all transactions by date (newest first)
    allTransactions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log('✅ useTransactions: Fetched all transactions:', {
      totalCount: allTransactions.length,
      dateRange: {
        earliest: allTransactions.length
          ? new Date(allTransactions[allTransactions.length - 1].timestamp).toISOString()
          : 'none',
        latest: allTransactions.length
          ? new Date(allTransactions[0].timestamp).toISOString()
          : 'none',
      },
    });
    return allTransactions;
  }, [repository, dateRange, connections]);

  const {
    data: transactions,
    loading,
    error,
    refresh,
    refreshing,
    fetch,
  } = useDataFetching<DatabaseTransaction[]>([], fetchTransactions, {
    retryOnError: true,
    onSuccess: (data) => {
      console.log('✨ useTransactions: Data fetching succeeded', {
        transactionCount: data.length,
      });
    },
    onError: (error) => {
      console.error('❌ useTransactions: Data fetching failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Initial data fetch
  useEffect(() => {
    console.log('🎣 useTransactions: Running initial transaction fetch');
    fetch();
  }, [fetch, connections]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      console.log('🔍 useTransactions: Fetching categories...');
      const fetchedCategories = await repository.getCategories();
      console.log('🏷️ useTransactions: Found categories:', {
        count: fetchedCategories.length,
        categories: fetchedCategories,
      });
      setCategories(fetchedCategories);
    } catch (err) {
      console.error('💥 useTransactions: Error fetching categories:', err);
    }
  }, [repository]);

  // Call fetchCategories on mount
  useEffect(() => {
    console.log('🎣 useTransactions: Running initial category fetch');
    fetchCategories();
    return () => {
      console.log('🧹 useTransactions: Cleaning up');
    };
  }, [fetchCategories]);

  // Filter transactions based on search, category, and bank
  const filteredTransactions = useMemo(() => {
    console.log('🔍 useTransactions: Filtering transactions:', {
      total: transactions.length,
      searchQuery,
      selectedCategory,
      selectedBank,
    });

    const filtered = transactions.filter((t) => {
      const matchesSearch =
        searchQuery === '' ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.merchant_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || t.transaction_category === selectedCategory;
      const matchesBank = !selectedBank || t.connection_id === selectedBank;

      return matchesSearch && matchesCategory && matchesBank;
    });

    console.log('✨ useTransactions: Filtered transactions:', {
      before: transactions.length,
      after: filtered.length,
      searchFiltered: searchQuery !== '',
      categoryFiltered: selectedCategory !== null,
      bankFiltered: selectedBank !== null,
    });

    return filtered;
  }, [transactions, searchQuery, selectedCategory, selectedBank]);

  const totals = connections.reduce(
    (acc, connection) => {
      const connectionTotal = connection.bank_accounts?.[0]?.count || 0;
      return {
        ...acc,
        [connection.id]: {
          total: connectionTotal,
          bank_name: connection.provider_name || connection.provider,
        },
      };
    },
    {} as Record<string, { total: number; bank_name: string }>
  );

  // Group transactions by date with bank totals
  const groupedTransactions = useMemo(() => {
    console.log('📊 useTransactions: Grouping transactions:', {
      filtered: filteredTransactions.length,
    });

    const groups: { [key: string]: DatabaseTransaction[] } = {};

    // Sort transactions by date (newest first)
    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Group by date
    sortedTransactions.forEach((transaction) => {
      const date = new Date(transaction.timestamp).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(transaction);
    });

    // Convert to sections with totals
    const sections = Object.entries(groups).map(([date, transactions]) => {
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

      // Calculate per-bank totals
      const bankTotals = transactions.reduce(
        (totals, t) => {
          const bankId = t.connection_id;
          const bank = connections.find((c) => c.id === bankId);
          if (!totals[bankId]) {
            totals[bankId] = {
              amount: 0,
              name: bank?.provider_name || bank?.provider || 'Unknown Bank',
            };
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

    console.log('✨ useTransactions: Grouped into sections:', {
      sectionCount: sections.length,
      totalTransactions: sections.reduce((sum, s) => sum + s.data.length, 0),
      dateRange: sections.length
        ? {
            earliest: sections[sections.length - 1].title,
            latest: sections[0].title,
          }
        : 'none',
    });

    return sections;
  }, [filteredTransactions, connections]);

  // Log when the hook returns new values
  const result = {
    transactions: filteredTransactions,
    loading,
    error,
    refreshing,
    refresh,
    setDateRange,
    setSearchQuery,
    setSelectedCategory,
    setSelectedBank,
    categories,
    selectedCategory,
    selectedBank,
    searchQuery,
    dateRange,
    bankConnections: connections,
    groupedTransactions,
  };

  useEffect(() => {
    console.log('🔄 useTransactions: Returning updated state:', {
      transactionCount: filteredTransactions.length,
      loading,
      error: error || 'none',
      refreshing,
      categoriesCount: categories.length,
      groupedSectionsCount: groupedTransactions.length,
    });
  }, [filteredTransactions, loading, error, refreshing, categories, groupedTransactions]);

  return result;
}
