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
} from 'react-native';
import { colors } from '../constants/theme';
import { Transaction } from '../types';
import { useTransactions } from '../hooks/useTransactions';

interface TransactionSection {
  title: string;
  data: Transaction[];
  totalAmount: number;
}

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
    categories,
    selectedCategory,
    searchQuery,
    dateRange,
    groupedTransactions,
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
});
