import { useState, useCallback, useMemo, useEffect } from 'react';
import { useServices } from '../contexts/ServiceContext';
import { useDataFetching } from './useDataFetching';
import { supabase } from '../services/supabase';
import type { Transaction } from '../types';

interface DateRange {
  from: Date;
  to: Date;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => void;
  setDateRange: (range: DateRange) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  categories: string[];
  selectedCategory: string | null;
  searchQuery: string;
  dateRange: DateRange;
  groupedTransactions: {
    title: string;
    data: Transaction[];
    totalAmount: number;
  }[];
}

export function useTransactions(): UseTransactionsResult {
  console.log('🎣 useTransactions: Hook initialized');

  const { trueLayerService } = useServices();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Log state changes
  useEffect(() => {
    console.log('🔄 useTransactions: State updated', {
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      selectedCategory,
      searchQuery,
      categoriesCount: categories.length,
    });
  }, [dateRange, selectedCategory, searchQuery, categories]);

  // Fetch transactions using our data fetching hook
  const fetchTransactions = useCallback(async () => {
    console.log('📊 useTransactions: Fetching transactions...', {
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
    });
    const result = await trueLayerService.fetchTransactions(dateRange.from, dateRange.to);
    console.log('✅ useTransactions: Fetched transactions:', {
      count: result.length,
      dateRange: {
        earliest: result.length
          ? new Date(result[result.length - 1].timestamp).toISOString()
          : 'none',
        latest: result.length ? new Date(result[0].timestamp).toISOString() : 'none',
      },
    });
    return result;
  }, [trueLayerService, dateRange]);

  const {
    data: transactions,
    loading,
    error,
    refresh,
    refreshing,
    fetch,
  } = useDataFetching<Transaction[]>([], fetchTransactions, {
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
  }, [fetch]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      console.log('🔍 useTransactions: Fetching categories...');
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ useTransactions: Auth error fetching categories:', authError);
        return;
      }

      const { data, error } = await supabase
        .from('merchant_categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user?.id}`);

      if (error) {
        console.error('❌ useTransactions: Failed to fetch categories:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ useTransactions: No categories found');
        return;
      }

      const uniqueCategories = Array.from(new Set(data.map((c) => c.category))).sort();
      console.log('🏷️ useTransactions: Found categories:', {
        count: uniqueCategories.length,
        categories: uniqueCategories,
      });
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('💥 useTransactions: Error fetching categories:', err);
    }
  }, []);

  // Call fetchCategories on mount
  useEffect(() => {
    console.log('🎣 useTransactions: Running initial category fetch');
    fetchCategories();
    return () => {
      console.log('🧹 useTransactions: Cleaning up');
    };
  }, [fetchCategories]);

  // Filter transactions based on search and category
  const filteredTransactions = useMemo(() => {
    console.log('🔍 useTransactions: Filtering transactions:', {
      total: transactions.length,
      searchQuery,
      selectedCategory,
    });

    const filtered = transactions.filter((t) => {
      const matchesSearch =
        searchQuery === '' ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.merchant_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || t.transaction_category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    console.log('✨ useTransactions: Filtered transactions:', {
      before: transactions.length,
      after: filtered.length,
      searchFiltered: searchQuery !== '',
      categoryFiltered: selectedCategory !== null,
    });

    return filtered;
  }, [transactions, searchQuery, selectedCategory]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    console.log('📊 useTransactions: Grouping transactions:', {
      filtered: filteredTransactions.length,
    });

    const groups: { [key: string]: Transaction[] } = {};

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
    const sections = Object.entries(groups).map(([date, transactions]) => ({
      title: date,
      data: transactions,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
    }));

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
  }, [filteredTransactions]);

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
    categories,
    selectedCategory,
    searchQuery,
    dateRange,
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
