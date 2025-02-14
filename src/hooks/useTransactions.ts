import { useState, useCallback, useMemo, useEffect } from 'react';
import { useServices } from '../contexts/ServiceContext';
import { useDataFetching } from './useDataFetching';
import { supabase } from '../services/supabase';
import { useBankConnections } from './useBankConnections';
import type { Transaction } from '../types';
import type { BankConnection } from '../services/trueLayer/types';

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
  setSelectedBank: (bankId: string | null) => void;
  categories: string[];
  selectedCategory: string | null;
  selectedBank: string | null;
  searchQuery: string;
  dateRange: DateRange;
  bankConnections: BankConnection[];
  groupedTransactions: {
    title: string;
    data: Transaction[];
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

      console.log('👤 useTransactions: User status:', {
        isAuthenticated: !!user,
        userId: user?.id,
      });

      // Query for both system categories and user categories if user exists
      let query = supabase.from('merchant_categories').select('category');

      if (user) {
        console.log(
          '🔍 useTransactions: Querying for system and user categories with user:',
          user.id
        );
        query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
      } else {
        console.log('🔍 useTransactions: Querying only system categories');
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ useTransactions: Failed to fetch categories:', error);
        return;
      }

      console.log('📊 useTransactions: Raw category data:', data);

      if (!data || data.length === 0) {
        console.log('⚠️ useTransactions: No categories found. Inserting defaults...');

        // Only proceed if we have a user
        if (!user) {
          console.log('❌ useTransactions: Cannot insert default categories without a user');
          return;
        }

        const defaultCategories = [
          {
            merchant_pattern:
              'DIRECT DEBIT|BILL PAYMENT|COUNCIL TAX|VODAFONE|EE|VIRGIN|BRITISH GAS|WATER',
            category: 'Bills',
          },
          { merchant_pattern: 'UBER|TRAINLINE|TFL|SHELL|BP|ESSO', category: 'Transport' },
          { merchant_pattern: 'AMAZON|PAYPAL|EBAY|ASOS', category: 'Shopping' },
          {
            merchant_pattern: 'TESCO|SAINSBURY|ASDA|WAITROSE|LIDL|ALDI|M&S',
            category: 'Groceries',
          },
          {
            merchant_pattern: 'DELIVEROO|JUST EAT|UBER EATS|COSTA|STARBUCKS|PRET|MCDONALDS',
            category: 'Food & Drink',
          },
          {
            merchant_pattern: 'SPOTIFY|NETFLIX|APPLE.COM/BILL|DISNEY PLUS|PRIME VIDEO|CINEMA',
            category: 'Entertainment',
          },
          { merchant_pattern: 'PHARMACY|GYM|FITNESS|PURE GYM', category: 'Health' },
        ];

        // Insert categories as user-specific categories
        const { data: insertedData, error: insertError } = await supabase
          .from('merchant_categories')
          .insert(
            defaultCategories.map((cat) => ({
              ...cat,
              user_id: user.id, // Set user_id to the current user's ID
            }))
          )
          .select('category');

        if (insertError) {
          console.error('❌ useTransactions: Failed to insert default categories:', insertError);
          return;
        }

        console.log('✅ useTransactions: Successfully inserted default categories:', insertedData);

        // Use the inserted categories
        if (insertedData) {
          const uniqueCategories = Array.from(new Set(insertedData.map((c) => c.category))).sort();
          setCategories(uniqueCategories);
          return;
        }
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

  // Group transactions by date with bank totals
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
              name: bank?.bank_name || 'Unknown Bank',
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
