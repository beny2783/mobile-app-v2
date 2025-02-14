import React from 'react';
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
} from 'react-native';
import { colors } from '../constants/theme';
import { Transaction } from '../types';
import { useTransactions } from '../hooks/useTransactions';
import { useBankConnections } from '../hooks/useBankConnections';
import { Ionicons } from '@expo/vector-icons';

interface TransactionSection {
  title: string;
  data: Transaction[];
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

export default function TransactionsScreen() {
  console.log('🏦 Rendering TransactionsScreen');

  const {
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
    groupedTransactions,
    bankConnections,
    transactions: filteredTransactions,
  } = useTransactions();

  const setDateFilter = (days: number) => {
    console.log('📅 Setting date filter:', { days });
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

  const renderBankFilter = () => {
    if (!bankConnections.length) return null;

    return (
      <View style={styles.bankFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bankContainer}
          contentContainerStyle={styles.bankContent}
        >
          <TouchableOpacity
            style={[styles.bankButton, !selectedBank && styles.bankButtonActive]}
            onPress={() => setSelectedBank(null)}
          >
            <View style={styles.bankButtonContent}>
              <View style={[styles.bankIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="business" size={16} color="#FFF" />
              </View>
              <View style={styles.bankButtonTextContainer}>
                <Text style={[styles.bankButtonText, !selectedBank && styles.bankButtonTextActive]}>
                  All Banks
                </Text>
                <Text style={styles.bankTransactionCount}>
                  {filteredTransactions.length} transactions
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          {bankConnections.map((connection) => {
            const bankColor = getBankColor(connection.id);
            const transactionCount = filteredTransactions.filter(
              (t: Transaction) => t.connection_id === connection.id
            ).length;

            return (
              <TouchableOpacity
                key={connection.id}
                style={[
                  styles.bankButton,
                  selectedBank === connection.id && styles.bankButtonActive,
                  { borderColor: selectedBank === connection.id ? bankColor : colors.border },
                ]}
                onPress={() => setSelectedBank(connection.id)}
              >
                <View style={styles.bankButtonContent}>
                  <View style={[styles.bankIcon, { backgroundColor: bankColor }]}>
                    <Text style={styles.bankInitial}>
                      {(connection.bank_name || 'Bank')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.bankButtonTextContainer}>
                    <Text
                      style={[
                        styles.bankButtonText,
                        selectedBank === connection.id && styles.bankButtonTextActive,
                      ]}
                    >
                      {connection.bank_name || 'Bank'}
                    </Text>
                    <Text style={styles.bankTransactionCount}>{transactionCount} transactions</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderCategoryFilters = () => {
    console.log('🎨 Rendering category filters:', {
      categories: categories.length,
      selected: selectedCategory,
    });

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
      <View style={styles.sectionHeaderTop}>
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
      {Object.keys(section.bankTotals).length > 1 && (
        <View style={styles.bankTotals}>
          {Object.entries(section.bankTotals).map(([bankId, { amount, name }]) => (
            <Text key={bankId} style={styles.bankTotal}>
              {name}: {amount < 0 ? '-' : '+'}
              {section.data[0].currency} {Math.abs(amount).toFixed(2)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const bank = bankConnections.find((conn) => conn.id === item.connection_id);
    const bankColor = bank ? getBankColor(bank.id) : colors.primary;

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.description} numberOfLines={2}>
              {item.description || 'Unknown Transaction'}
            </Text>
            <View style={styles.transactionMeta}>
              <Text style={styles.transactionCategory}>{item.transaction_category}</Text>
              {bankConnections.length > 1 && (
                <View style={styles.bankTag}>
                  <View style={[styles.bankDot, { backgroundColor: bankColor }]} />
                  <Text style={[styles.bankName, { color: bankColor }]}>
                    {bank?.bank_name || 'Unknown Bank'}
                  </Text>
                </View>
              )}
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
        keyExtractor={(item) => `${item.connection_id || 'default'}-${item.transaction_id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
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
  bankFilterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bankContainer: {
    backgroundColor: colors.surface,
    minHeight: 50,
  },
  bankContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
  },
  bankButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  bankButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  bankButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankTotals: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankTotal: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankName: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  bankButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  bankIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankInitial: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bankButtonTextContainer: {
    flex: 1,
  },
  bankTransactionCount: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  bankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  bankDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
