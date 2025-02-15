import React, { useEffect, useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { colors } from '../constants/theme';
import BankCard from '../components/BankCard';
import { createBalanceRepository, GroupedBalances } from '../repositories/balance';

// Initialize repository once, outside component
const balanceRepository = createBalanceRepository();
console.log('🏦 BalancesScreen: Balance repository initialized');

export default function BalancesScreen() {
  const [groupedAccounts, setGroupedAccounts] = useState<GroupedBalances[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      console.log('🏦 BalancesScreen: Fetching grouped balances...');
      const groupedBalances = await balanceRepository.getGroupedBalances();
      console.log(`✅ BalancesScreen: Found ${groupedBalances.length} bank connections`);

      // Log details for each bank connection
      groupedBalances.forEach((group) => {
        console.log(`🏦 BalancesScreen: Bank "${group.connection.bank_name}":`, {
          accountCount: group.accounts.length,
          totalBalance: group.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0),
          lastUpdated: group.accounts[0]?.last_updated || 'Unknown',
        });
      });

      setGroupedAccounts(groupedBalances);
      setError(null);
    } catch (err) {
      console.error('❌ BalancesScreen: Error fetching accounts:', err);
      setError('Failed to load accounts');
      setGroupedAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const onRefresh = () => {
    console.log('🔄 BalancesScreen: Refreshing data...');
    setRefreshing(true);
    fetchAccounts();
  };

  // Calculate total balance across all accounts
  const totalBalance = groupedAccounts.reduce(
    (total, group) =>
      total + group.accounts.reduce((sum, account) => sum + (account.balance || 0), 0),
    0
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Balance</Text>
        <Text style={styles.totalAmount}>
          {new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
          }).format(totalBalance)}
        </Text>
      </View>

      {groupedAccounts.map((group) => (
        <BankCard
          key={group.connection.id}
          bankName={group.connection.bank_name || 'Connected Bank'}
          accounts={group.accounts}
          onRefresh={onRefresh}
        />
      ))}

      {groupedAccounts.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No accounts found</Text>
          <Text style={styles.emptySubtext}>Connect a bank account to see your balances</Text>
        </View>
      )}
    </ScrollView>
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
  error: {
    color: colors.error,
    textAlign: 'center',
    margin: 16,
  },
  totalContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
