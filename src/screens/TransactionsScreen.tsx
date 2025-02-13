import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { TrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';
import { colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { Transaction } from '../types';
import { ChallengeTrackingService } from '../services/challengeTracking';

interface TransactionSection {
  title: string;
  data: Transaction[];
  totalAmount: number;
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const challengeTracking = React.useMemo(() => new ChallengeTrackingService(), []);

  const trueLayer = new TrueLayerService({
    clientId: TRUELAYER.CLIENT_ID || '',
    redirectUri: TRUELAYER.REDIRECT_URI || '',
  });

  // Add effect to clear transactions when no active connection exists
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) return;

        const { data: connections } = await supabase
          .from('bank_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .is('disconnected_at', null)
          .not('encrypted_access_token', 'is', null)
          .limit(1);

        if (!connections || connections.length === 0) {
          console.log('No active connections, clearing transactions');
          setTransactions([]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();
  }, []);

  // Update fetchTransactions to clear data if no active connection
  const fetchTransactions = async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await trueLayer.fetchTransactions(dateRange.from, dateRange.to);

      // If no data returned and no error, assume no active connection
      if (data.length === 0) {
        setTransactions([]);
      } else {
        setTransactions(data);

        // Update challenge progress with new transactions
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await challengeTracking.updateChallengeProgress(user.id, data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setError('Failed to load transactions');
      setTransactions([]); // Clear transactions on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log('🔍 Starting category fetch...');

      // First check if we're authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        return;
      }
      console.log('👤 Authenticated as:', user?.id);

      // Then fetch categories
      const { data, error } = await supabase
        .from('merchant_categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user?.id}`);

      console.log('🔄 Query completed');
      console.log('❌ Error:', error);
      console.log('📦 Data:', data);
      console.log('🔍 Query details:', {
        sql: `SELECT * FROM merchant_categories WHERE user_id IS NULL OR user_id = '${user?.id}'`,
        rowCount: data?.length || 0,
      });

      if (error) {
        console.error('Failed to fetch categories:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No data returned from categories query');
        return;
      }

      // Get unique categories
      const uniqueCategories = Array.from(new Set(data.map((c) => c.category))).sort();
      console.log('🏷️ Unique categories:', uniqueCategories);
      console.log('📊 Total unique categories:', uniqueCategories.length);
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('💥 Error in fetchCategories:', err);
    }
  };

  // First get filtered transactions
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        searchQuery === '' ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.merchant_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || t.transaction_category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, selectedCategory]);

  // Then use filteredTransactions for grouping
  const groupedTransactions: TransactionSection[] = React.useMemo(() => {
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
    return Object.entries(groups).map(([date, transactions]) => ({
      title: date,
      data: transactions,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
    }));
  }, [filteredTransactions]); // Only depend on filteredTransactions

  // Fetch transactions when date range changes
  useEffect(() => {
    fetchTransactions();
  }, [dateRange]);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const setDateFilter = (days: number) => {
    const now = new Date();
    setDateRange({
      from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
      to: now,
    });
  };

  const renderDateFilter = () => {
    const getDaysDiff = (from: Date, to: Date) =>
      Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));

    return (
      <View style={styles.filterContainer}>
        {[7, 30, 90].map((days) => {
          const isActive = getDaysDiff(dateRange.from, dateRange.to) === days;
          return (
            <TouchableOpacity
              key={days}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => setDateFilter(days)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {days} Days
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search transactions..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  const renderCategoryFilters = () => {
    console.log('🎨 Rendering categories:', categories);
    console.log('🎯 Selected category:', selectedCategory);

    if (categories.length === 0) {
      console.log('⚠️ No categories available');
      return null;
    }

    return (
      <View style={{ backgroundColor: '#fff' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          <TouchableOpacity
            style={[styles.categoryButton, !selectedCategory && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                !selectedCategory && styles.categoryButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.categoryButtonTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: TransactionSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionDate}>{section.title}</Text>
      <Text
        style={[
          styles.sectionTotal,
          { color: section.totalAmount < 0 ? colors.error : colors.success },
        ]}
      >
        {section.data[0].currency} {Math.abs(section.totalAmount).toFixed(2)}
      </Text>
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => {
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.description} numberOfLines={2}>
              {item.description || 'Unknown Transaction'}
            </Text>
            <Text style={styles.transactionCategory}>{item.transaction_category}</Text>
          </View>
          <Text style={[styles.amount, { color: item.amount < 0 ? colors.error : colors.success }]}>
            {item.currency} {Math.abs(item.amount).toFixed(2)}
          </Text>
        </View>
        <Text style={styles.date}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      {renderDateFilter()}
      {renderCategoryFilters()}
      <SectionList
        sections={groupedTransactions}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.transaction_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionCard: {
    backgroundColor: colors.surface,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  date: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  categoryContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 60,
    zIndex: 1,
  },
  categoryContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  categoryButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  categoryButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    margin: 16,
  },
  emptyText: {
    textAlign: 'center',
    margin: 16,
    color: colors.text.secondary,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.text.primary,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionTotal: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text.primary,
  },
  transactionCategory: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
});
