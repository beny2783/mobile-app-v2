import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { colors } from '../constants/theme';
import type { Transaction } from '../types/transaction';
import type { TransactionFilters } from '../repositories/types';
import { useTransactions } from '../store/slices/transactions/hooks';
import { useAccounts } from '../store/slices/accounts/hooks';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { AppTabParamList } from '../types/navigation/index';
import CategorySelectionModal from '../components/modals/CategorySelectionModal';
import { NoBankPrompt } from '../components/NoBankPrompt';
import { useBudget } from '../store/slices/budget/hooks';
import { useAuth } from '../store/slices/auth/hooks';

// Add bank color mapping helper
const getBankColor = (bankId: string) => {
  // Generate a consistent color based on bankId
  const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#795548'];
  const index = Math.abs(bankId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return colors[index % colors.length];
};

const getMerchantIcon = (
  description: string,
  category?: string
): { name: string; type: 'ionicons' | 'material' } => {
  const lowercaseDesc = description.toLowerCase();
  const lowercaseCategory = (category || '').toLowerCase();

  // Check for common merchants and categories
  if (lowercaseDesc.includes('amazon') || lowercaseDesc.includes('amzn')) {
    return { name: 'amazon', type: 'material' };
  } else if (lowercaseDesc.includes('uber') || lowercaseDesc.includes('lyft')) {
    return { name: 'car', type: 'ionicons' };
  } else if (lowercaseDesc.includes('netflix')) {
    return { name: 'play-circle', type: 'ionicons' };
  } else if (lowercaseDesc.includes('spotify')) {
    return { name: 'musical-notes', type: 'ionicons' };
  } else if (lowercaseDesc.includes('apple')) {
    return { name: 'apple', type: 'ionicons' };
  } else if (lowercaseDesc.includes('google')) {
    return { name: 'google', type: 'material' };
  }

  // Category-based fallbacks
  if (lowercaseCategory.includes('groceries') || lowercaseCategory.includes('food')) {
    return { name: 'cart', type: 'ionicons' };
  } else if (lowercaseCategory.includes('transport')) {
    return { name: 'bus', type: 'ionicons' };
  } else if (lowercaseCategory.includes('entertainment')) {
    return { name: 'game-controller', type: 'ionicons' };
  } else if (lowercaseCategory.includes('shopping')) {
    return { name: 'bag', type: 'ionicons' };
  } else if (lowercaseCategory.includes('bills') || lowercaseCategory.includes('utilities')) {
    return { name: 'receipt', type: 'ionicons' };
  }

  // Default icon
  return { name: 'card', type: 'ionicons' };
};

export default function TransactionsScreen() {
  console.log('🏦 Rendering TransactionsScreen');
  const route = useRoute<RouteProp<AppTabParamList, 'Transactions'>>();

  // Local UI state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Redux hooks
  const {
    filteredTransactions,
    transactionGroups,
    loading,
    errors,
    filters,
    categories,
    fetch,
    updateCategory,
    updateFilters,
    reset,
    refreshCategories,
    hasConnections,
    allTransactions,
  } = useTransactions();

  const { connections } = useAccounts();
  const { fetchTargets } = useBudget();
  const { user } = useAuth();

  // Convert filters to match TransactionFilters type
  const handleFetch = (currentFilters: typeof filters) => {
    console.log('🔄 handleFetch called with filters:', currentFilters);

    const transactionFilters: TransactionFilters = {
      fromDate: new Date(currentFilters.dateRange.from),
      toDate: new Date(currentFilters.dateRange.to),
      category: currentFilters.category || undefined,
      connectionId: currentFilters.bankId || undefined,
      searchQuery: currentFilters.searchQuery || undefined,
    };

    console.log('🔄 Fetching transactions with processed filters:', transactionFilters);
    fetch(transactionFilters);
  };

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch all transactions without any date filters
        const initialFilters = {
          ...filters,
          dateRange: {
            from: new Date(0).toISOString(), // Start from Unix epoch
            to: new Date().toISOString(), // Up to now
          },
        };

        console.log('🔄 Loading initial data with no date filters:', initialFilters);
        await Promise.all([refreshCategories(), handleFetch(initialFilters)]);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadInitialData();
  }, []);

  // Refresh transactions when connections change
  useEffect(() => {
    console.log('🔄 Bank connections changed, refreshing transactions');
    handleFetch(filters);
  }, [connections, fetch, filters]);

  // Handle refresh parameter from navigation
  useEffect(() => {
    const params = route.params as { refresh?: boolean } | undefined;
    if (params?.refresh) {
      console.log('🔄 Refreshing transactions from navigation param');
      handleFetch(filters);
    }
  }, [route.params?.refresh, fetch, filters]);

  const handleLoadMore = () => {
    console.log('📜 Loading more transactions, current page:', page);
    setPage((prevPage) => prevPage + 1);
  };

  // Get paginated transactions
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredTransactions, page]);

  // Create paginated groups
  const paginatedGroups = useMemo(() => {
    const groups = new Map<string, Transaction[]>();

    paginatedTransactions.forEach((transaction) => {
      const date = new Date(transaction.timestamp).toLocaleDateString();
      const group = groups.get(date) || [];
      group.push(transaction);
      groups.set(date, group);
    });

    return Array.from(groups.entries()).map(([date, transactions]) => ({
      title: date,
      data: transactions,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      bankTotals: transactions.reduce(
        (totals, t) => {
          const bankId = t.connection_id;
          if (!totals[bankId]) {
            totals[bankId] = { amount: 0, name: t.merchant_name || 'Unknown' };
          }
          totals[bankId].amount += t.amount;
          return totals;
        },
        {} as { [key: string]: { amount: number; name: string } }
      ),
    }));
  }, [paginatedTransactions]);

  const handleCategoryPress = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsCategoryModalVisible(true);
  };

  const handleCategoryUpdate = async (newCategory: string) => {
    if (!editingTransaction) return;

    try {
      // Update the transaction category
      await updateCategory({
        transactionId: editingTransaction.id,
        category: newCategory,
      });

      // Close the modal first
      setIsCategoryModalVisible(false);
      setEditingTransaction(null);

      // Add a small delay to ensure the database trigger has completed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Refresh transactions first to get the updated categories
      await handleFetch(filters);

      // Then refresh budget data to get the updated amounts
      if (user) {
        await fetchTargets(user.id);
      }

      Alert.alert('Success', 'Transaction category updated successfully');
    } catch (error) {
      console.error('Failed to update category:', error);
      Alert.alert('Error', 'Failed to update transaction category. Please try again.');
    }
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search transactions..."
        value={filters.searchQuery}
        onChangeText={(text) => updateFilters({ searchQuery: text })}
      />
    </View>
  );

  const renderBankFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterButton, !filters.bankId && styles.filterButtonActive]}
          onPress={() => updateFilters({ bankId: null })}
        >
          <Text style={[styles.filterText, !filters.bankId && styles.filterTextActive]}>
            All Banks
          </Text>
        </TouchableOpacity>
        {connections.map((connection) => (
          <TouchableOpacity
            key={connection.id}
            style={[
              styles.filterButton,
              filters.bankId === connection.id && styles.filterButtonActive,
              { borderColor: getBankColor(connection.id) },
            ]}
            onPress={() => updateFilters({ bankId: connection.id })}
          >
            <Text
              style={[
                styles.filterText,
                filters.bankId === connection.id && styles.filterTextActive,
              ]}
            >
              {connection.provider}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCategoryFilters = () => {
    // Show loading state while categories are being fetched
    if (loading.categories) {
      return (
        <View style={styles.filterContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    // If no categories are available, show a message
    if (!categories || categories.length === 0) {
      return (
        <View style={styles.filterContainer}>
          <Text style={styles.noDataText}>No categories available</Text>
        </View>
      );
    }

    // Default categories to ensure we always have basic categorization
    const defaultCategories = [
      'Groceries',
      'Transport',
      'Bills',
      'Shopping',
      'Entertainment',
      'Income',
    ];

    // Combine default categories with loaded categories, removing duplicates
    const allCategories = Array.from(new Set([...defaultCategories, ...categories])).sort();

    return (
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, !filters.category && styles.filterButtonActive]}
            onPress={() => updateFilters({ category: null })}
          >
            <Text style={[styles.filterText, !filters.category && styles.filterTextActive]}>
              All Categories
            </Text>
          </TouchableOpacity>
          {allCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                filters.category === category && styles.filterButtonActive,
                { marginRight: 8 },
              ]}
              onPress={() => updateFilters({ category })}
            >
              <Text
                style={[
                  styles.filterText,
                  filters.category === category && styles.filterTextActive,
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

  const renderSectionHeader = ({ section }: { section: (typeof transactionGroups)[0] }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionAmount}>£{Math.abs(section.totalAmount).toFixed(2)}</Text>
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const icon = getMerchantIcon(item.description, item.transaction_category);

    return (
      <TouchableOpacity style={styles.transactionItem} onPress={() => handleCategoryPress(item)}>
        <View style={styles.transactionIcon}>
          {icon.type === 'ionicons' ? (
            <Ionicons name={icon.name as any} size={24} color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name={icon.name as any} size={24} color={colors.primary} />
          )}
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>{item.description}</Text>
          <Text style={styles.transactionCategory}>
            {item.transaction_category || 'Uncategorized'}
          </Text>
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

  // Update the loading condition to include initial load
  if ((loading.transactions && !filteredTransactions.length) || isInitialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      {renderBankFilter()}
      {renderCategoryFilters()}

      <SectionList
        sections={paginatedGroups}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        refreshControl={
          <RefreshControl
            refreshing={loading.transactions}
            onRefresh={() => {
              setPage(1);
              handleFetch(filters);
            }}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
      />

      <CategorySelectionModal
        isVisible={isCategoryModalVisible}
        onClose={() => {
          setIsCategoryModalVisible(false);
          setEditingTransaction(null);
        }}
        onConfirm={handleCategoryUpdate}
        currentCategory={editingTransaction?.transaction_category || ''}
        availableCategories={categories}
        transactionDescription={editingTransaction?.description || ''}
        isUpdating={loading.categories}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.text.primary,
  },
  listContent: {
    paddingBottom: 20,
  },
  searchContainer: {
    padding: 10,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    color: colors.text.primary,
  },
  filterContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.surface,
    marginBottom: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  filterTextActive: {
    color: colors.text.inverse,
    fontWeight: '500',
  },
  noDataText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  transactionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionTitle: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bankIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
