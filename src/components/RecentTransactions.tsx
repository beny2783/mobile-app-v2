import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { useTransactions } from '../store/slices/transactions/hooks';
import { Transaction } from '../types/transaction';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getBankColor = (bankId: string) => {
  const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#795548'];
  const index = Math.abs(bankId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return colors[index % colors.length];
};

const getMerchantIcon = (description: string, category?: string) => {
  // Default icon mapping based on common transaction descriptions
  const iconMap: { [key: string]: { type: 'ionicons' | 'material'; name: string } } = {
    UBER: { type: 'ionicons', name: 'car' },
    AMAZON: { type: 'ionicons', name: 'cart' },
    NETFLIX: { type: 'ionicons', name: 'film' },
    SPOTIFY: { type: 'ionicons', name: 'musical-notes' },
    TESCO: { type: 'ionicons', name: 'basket' },
    SAINSBURY: { type: 'ionicons', name: 'basket' },
    ASDA: { type: 'ionicons', name: 'basket' },
    TFL: { type: 'ionicons', name: 'train' },
  };

  // Check if description matches any known merchant
  const upperDesc = description.toUpperCase();
  for (const [key, value] of Object.entries(iconMap)) {
    if (upperDesc.includes(key)) {
      return value;
    }
  }

  // Category-based fallback icons
  const categoryIcons: { [key: string]: { type: 'ionicons' | 'material'; name: string } } = {
    Shopping: { type: 'ionicons', name: 'cart' },
    Transport: { type: 'ionicons', name: 'train' },
    Bills: { type: 'ionicons', name: 'document-text' },
    Entertainment: { type: 'ionicons', name: 'film' },
    Groceries: { type: 'ionicons', name: 'basket' },
    Income: { type: 'ionicons', name: 'trending-up' },
  };

  if (category && categoryIcons[category]) {
    return categoryIcons[category];
  }

  // Default icon
  return { type: 'ionicons', name: 'card' };
};

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
};

export const RecentTransactions = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { filteredTransactions, loading, fetch, filters, errors } = useTransactions();

  // Fetch transactions on mount
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        // Fetch all transactions without any date filters
        const initialFilters = {
          ...filters,
          dateRange: {
            from: new Date(0).toISOString(), // Start from Unix epoch
            to: new Date().toISOString(), // Up to now
          },
        };
        await fetch(initialFilters);
      } catch (error) {
        console.error('Failed to load transactions:', error);
      }
    };

    loadTransactions();
  }, []);

  const navigateToTransactions = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'AppTabs',
        params: {
          screen: 'Transactions',
        },
      })
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const icon = getMerchantIcon(item.description, item.transaction_category);

    return (
      <TouchableOpacity style={styles.transactionItem} onPress={navigateToTransactions}>
        <View style={styles.transactionIcon}>
          {icon.type === 'ionicons' ? (
            <Ionicons name={icon.name as any} size={24} color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name={icon.name as any} size={24} color={colors.primary} />
          )}
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>{item.description}</Text>
          <View style={styles.transactionSubtitle}>
            <Text style={styles.transactionCategory}>
              {item.transaction_category || 'Uncategorized'}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.transactionAmount}>
          <Text
            style={[styles.amountText, { color: item.amount < 0 ? colors.error : colors.success }]}
          >
            £{Math.abs(item.amount).toFixed(2)}
          </Text>
          <View
            style={[styles.bankIndicator, { backgroundColor: getBankColor(item.connection_id) }]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Get the 10 most recent transactions
  const recentTransactions = [...filteredTransactions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  if (loading.transactions && !filteredTransactions.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Transactions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

  if (errors.transactions) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Transactions</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading transactions</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetch(filters)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!loading.transactions && !filteredTransactions.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Transactions</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Transactions</Text>
        <TouchableOpacity style={styles.viewAllButton} onPress={navigateToTransactions}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  viewAllButton: {
    padding: 8,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionTitle: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 2,
  },
  transactionSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionCategory: {
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  bankIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
