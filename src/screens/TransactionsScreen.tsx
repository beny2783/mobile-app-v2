import React, { useEffect, useState } from 'react';
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
import { DatabaseTransaction } from '../types/transaction';
import { useTransactions } from '../hooks/useTransactions';
import type { UseTransactionsResult } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { AppTabParamList } from '../types/navigation/index';
import CategorySelectionModal from '../components/modals/CategorySelectionModal';
import { createTransactionRepository } from '../repositories/transaction';
import { getTrueLayerApiService } from '../store/slices/trueLayerSlice';
import type { ITrueLayerApiService } from '../services/trueLayer/types';
import { createTargetRepository } from '../repositories/target';

interface TransactionSection {
  title: string;
  data: DatabaseTransaction[];
  totalAmount: number;
  bankTotals: { [key: string]: { amount: number; name: string } };
}

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
  const trueLayerService = getTrueLayerApiService();

  // Add state for category editing
  const [editingTransaction, setEditingTransaction] = useState<DatabaseTransaction | null>(null);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  // Add new state for tracking selected time period
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<7 | 30 | 90>(30);

  const result = useTransactions() as UseTransactionsResult;
  const {
    transactions: filteredTransactions,
    loading,
    error,
    refresh,
    refreshing,
    categories,
    groupedTransactions,
    setDateRange,
    setSearchQuery,
    setSelectedCategory,
    setSelectedBank,
    selectedCategory,
    selectedBank,
    searchQuery,
    dateRange,
  } = result;

  const { connections } = useAccounts();

  // Create repository instance
  const repository = createTransactionRepository(
    trueLayerService as unknown as ITrueLayerApiService
  );

  // Add effect to refresh transactions when connections change
  useEffect(() => {
    console.log('🔄 Bank connections changed, refreshing transactions');
    refresh();
  }, [connections, refresh]);

  // Handle refresh parameter from navigation
  useEffect(() => {
    const params = route.params as { refresh?: boolean } | undefined;
    console.log('🔄 TransactionsScreen: Navigation params received:', {
      params,
      shouldRefresh: params?.refresh,
    });

    if (params?.refresh) {
      console.log('🔄 Refreshing transactions from navigation param');
      refresh();
    }
  }, [route.params?.refresh, refresh]);

  useEffect(() => {
    console.log('📊 TransactionsScreen: Data state updated:', {
      transactionCount: filteredTransactions.length,
      loading,
      error,
      refreshing,
      hasFilters: {
        category: selectedCategory !== null,
        bank: selectedBank !== null,
        search: searchQuery !== '',
      },
    });
  }, [
    filteredTransactions,
    loading,
    error,
    refreshing,
    selectedCategory,
    selectedBank,
    searchQuery,
  ]);

  const handleCategoryPress = (transaction: DatabaseTransaction) => {
    setEditingTransaction(transaction);
    setIsCategoryModalVisible(true);
  };

  const handleCategoryUpdate = async (newCategory: string) => {
    if (!editingTransaction) return;

    setIsUpdatingCategory(true);
    try {
      await repository.updateTransactionCategory(
        editingTransaction.transaction_id || editingTransaction.id,
        newCategory
      );

      await refresh();
      setIsCategoryModalVisible(false);
      setEditingTransaction(null);
      Alert.alert('Success', 'Transaction category updated successfully');
    } catch (error) {
      console.error('Failed to update category:', error);
      Alert.alert('Error', 'Failed to update transaction category. Please try again.');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleTimePeriodChange = (days: 7 | 30 | 90) => {
    setSelectedTimePeriod(days);
    setDateRange({
      from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      to: new Date(),
    });
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search transactions..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>
  );

  const renderDateFilter = () => (
    <View style={styles.dateFilterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.dateFilterButton,
            styles.timeRangeButton,
            selectedTimePeriod === 7 && styles.timeRangeButtonActive,
          ]}
          onPress={() => handleTimePeriodChange(7)}
        >
          <Text
            style={[styles.dateFilterText, selectedTimePeriod === 7 && styles.dateFilterTextActive]}
          >
            7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.dateFilterButton,
            styles.timeRangeButton,
            selectedTimePeriod === 30 && styles.timeRangeButtonActive,
          ]}
          onPress={() => handleTimePeriodChange(30)}
        >
          <Text
            style={[
              styles.dateFilterText,
              selectedTimePeriod === 30 && styles.dateFilterTextActive,
            ]}
          >
            30 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.dateFilterButton,
            styles.timeRangeButton,
            selectedTimePeriod === 90 && styles.timeRangeButtonActive,
          ]}
          onPress={() => handleTimePeriodChange(90)}
        >
          <Text
            style={[
              styles.dateFilterText,
              selectedTimePeriod === 90 && styles.dateFilterTextActive,
            ]}
          >
            90 Days
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderBankFilter = () => {
    if (!connections.length) return null;

    return (
      <View style={styles.bankFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.bankFilterButton, !selectedBank && styles.bankFilterButtonActive]}
            onPress={() => setSelectedBank(null)}
          >
            <View style={[styles.bankIcon, { backgroundColor: colors.primary }]}>
              <Text style={styles.bankInitial}>A</Text>
            </View>
            <Text
              style={[
                styles.bankName,
                !selectedBank && styles.bankNameActive,
                { color: colors.primary },
              ]}
            >
              All Banks
            </Text>
          </TouchableOpacity>
          {connections.map((connection) => {
            const bankColor = getBankColor(connection.id);
            const transactionCount = filteredTransactions.filter(
              (t) => t.connection_id === connection.id
            ).length;

            return (
              <TouchableOpacity
                key={connection.id}
                style={[
                  styles.bankFilterButton,
                  selectedBank === connection.id && styles.bankFilterButtonActive,
                ]}
                onPress={() => setSelectedBank(connection.id)}
              >
                <View style={[styles.bankIcon, { backgroundColor: bankColor }]}>
                  <Text style={styles.bankInitial}>
                    {(connection.provider || 'Bank')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.bankFilterInfo}>
                  <Text
                    style={[
                      styles.bankName,
                      selectedBank === connection.id && styles.bankNameActive,
                      { color: bankColor },
                    ]}
                  >
                    {connection.provider || 'Bank'}
                  </Text>
                  <Text style={styles.bankTransactionCount}>{transactionCount} transactions</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderCategoryFilters = () => {
    if (!categories.length) return null;

    return (
      <View style={styles.categoryFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.categoryButton, !selectedCategory && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={styles.categoryButtonText}>All Categories</Text>
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
              <Text style={styles.categoryButtonText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: TransactionSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionTotal}>
        Total: {section.data[0]?.currency} {Math.abs(section.totalAmount).toFixed(2)}
      </Text>
    </View>
  );

  const renderTransaction = ({ item }: { item: DatabaseTransaction }) => {
    const bank = connections.find((conn) => conn.id === item.connection_id);
    const bankColor = bank ? getBankColor(bank.id) : colors.primary;
    const merchantIcon = getMerchantIcon(item.description, item.transaction_category);

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <View style={styles.merchantContainer}>
              <View style={styles.iconContainer}>
                {merchantIcon.type === 'ionicons' ? (
                  <Ionicons name={merchantIcon.name as any} size={24} color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons
                    name={merchantIcon.name as any}
                    size={24}
                    color={colors.primary}
                  />
                )}
              </View>
              <View style={styles.descriptionContainer}>
                <Text style={styles.description} numberOfLines={2}>
                  {item.description || 'Unknown Transaction'}
                </Text>
                <View style={styles.transactionMeta}>
                  <TouchableOpacity
                    onPress={() => handleCategoryPress(item)}
                    style={styles.categoryButton}
                  >
                    <Text style={styles.transactionCategory}>{item.transaction_category}</Text>
                    <Ionicons
                      name="pencil"
                      size={12}
                      color={colors.text.secondary}
                      style={styles.editIcon}
                    />
                  </TouchableOpacity>
                  {connections.length > 1 && (
                    <View style={styles.bankTag}>
                      <View style={[styles.bankDot, { backgroundColor: bankColor }]} />
                      <Text style={[styles.bankName, { color: bankColor }]}>
                        {bank?.provider || 'Unknown Bank'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
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
      {renderBankFilter()}
      {renderCategoryFilters()}
      <SectionList
        sections={groupedTransactions}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions found</Text>}
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
        isUpdating={isUpdatingCategory}
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
  searchContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateFilterContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  timeRangeButton: {
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  dateFilterText: {
    color: colors.text.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  dateFilterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  bankFilterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
  },
  bankFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
  },
  bankFilterButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  bankIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bankInitial: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bankName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  bankNameActive: {
    color: colors.primary,
  },
  bankFilterInfo: {
    flex: 1,
  },
  bankTransactionCount: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  categoryFilterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
  },
  categoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: 4,
  },
  editIcon: {
    marginLeft: 2,
  },
  bankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  bankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    margin: 16,
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    margin: 16,
  },
  merchantContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  descriptionContainer: {
    flex: 1,
  },
});
