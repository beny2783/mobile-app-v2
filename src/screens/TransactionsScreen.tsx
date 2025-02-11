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
} from 'react-native';
import { TrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';
import { colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
  transaction_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  merchant_name?: string;
}

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
  const [searchQuery, setSearchQuery] = useState('');

  const trueLayer = new TrueLayerService({
    clientId: TRUELAYER.CLIENT_ID || '',
    redirectUri: TRUELAYER.REDIRECT_URI || '',
  });

  const fetchTransactions = async () => {
    try {
      setError(null);
      console.log('🔄 Fetching transactions...', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      });

      // First fetch - should hit TrueLayer API
      const data = await trueLayer.fetchTransactions(dateRange.from, dateRange.to);
      console.log('✅ First fetch complete:', data.length, 'transactions');
      setTransactions(data);

      // Second fetch - should hit cache
      const cachedData = await trueLayer.fetchTransactions(dateRange.from, dateRange.to);
      console.log(
        '✅ Second fetch complete (should be from cache):',
        cachedData.length,
        'transactions'
      );
    } catch (error) {
      console.error('💥 Failed to fetch transactions:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Group transactions by date and calculate totals
  const groupedTransactions: TransactionSection[] = React.useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};

    // Filter transactions by search query first
    const filteredTransactions = transactions.filter((t) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        t.description.toLowerCase().includes(searchLower) ||
        (t.merchant_name?.toLowerCase() || '').includes(searchLower)
      );
    });

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
  }, [transactions, searchQuery]);

  useEffect(() => {
    fetchTransactions();
  }, [dateRange]);

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

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <Text style={styles.merchantName}>{item.merchant_name || item.description}</Text>
        <Text style={[styles.amount, { color: item.amount < 0 ? colors.error : colors.success }]}>
          {item.currency} {Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
      <Text style={styles.date}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      <Text style={styles.category}>{item.transaction_category}</Text>
    </View>
  );

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
    backgroundColor: '#fff',
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
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  date: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  category: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    textTransform: 'capitalize',
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
    backgroundColor: '#fff',
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
  },
});
