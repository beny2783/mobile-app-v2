import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../constants/theme';
import { createBalanceRepository, GroupedBalances } from '../repositories/balance';

// Initialize repository once, outside component
const balanceRepository = createBalanceRepository();
console.log('💰 TotalBalance: Balance repository initialized');

export default function TotalBalance() {
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTotalBalance = async () => {
    try {
      console.log('💰 TotalBalance: Fetching grouped balances...');
      const groupedBalances = await balanceRepository.getGroupedBalances();
      console.log(`✅ TotalBalance: Found ${groupedBalances.length} bank connections`);

      // Calculate total balance and log details for each bank
      const total = groupedBalances.reduce((sum, group) => {
        const bankTotal = group.accounts.reduce((bankSum, acc) => bankSum + (acc.balance || 0), 0);
        console.log(
          `💰 TotalBalance: Bank "${group.connection.bank_name}": £${bankTotal.toFixed(2)}`
        );
        return sum + bankTotal;
      }, 0);

      console.log(`💰 TotalBalance: Total balance across all banks: £${total.toFixed(2)}`);
      setTotalBalance(total);
      setError(null);
    } catch (err) {
      console.error('❌ TotalBalance: Error fetching total balance:', err);
      setError('Failed to load total balance');
      setTotalBalance(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotalBalance();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.amount}>
        {new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
        }).format(totalBalance)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  loading: {
    textAlign: 'center',
    color: colors.text.secondary,
  },
  error: {
    textAlign: 'center',
    color: colors.error,
  },
});
