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
      const data = await trueLayer.fetchTransactions(dateRange.from, dateRange.to);
      console.log('✅ Fetched transactions:', data.length);
      setTransactions(data);
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

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort(
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
  }, [transactions]);

  useEffect(() => {
    fetchTransactions();
  }, [dateRange]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const setDateFilter = (days: number) => {
    setDateRange({
      from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      to: new Date(),
    });
  };

  const renderDateFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          dateRange.from.getTime() === Date.now() - 7 * 24 * 60 * 60 * 1000 &&
            styles.filterButtonActive,
        ]}
        onPress={() => setDateFilter(7)}
      >
        <Text style={styles.filterText}>7 Days</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          dateRange.from.getTime() === Date.now() - 30 * 24 * 60 * 60 * 1000 &&
            styles.filterButtonActive,
        ]}
        onPress={() => setDateFilter(30)}
      >
        <Text style={styles.filterText}>30 Days</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          dateRange.from.getTime() === Date.now() - 90 * 24 * 60 * 60 * 1000 &&
            styles.filterButtonActive,
        ]}
        onPress={() => setDateFilter(90)}
      >
        <Text style={styles.filterText}>90 Days</Text>
      </TouchableOpacity>
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
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.text.primary,
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
});
