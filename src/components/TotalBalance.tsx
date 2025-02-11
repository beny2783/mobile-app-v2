import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import { colors } from '../constants/theme';

export default function TotalBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, currency')
        .order('currency');

      if (error) throw error;

      // Group by currency and sum amounts
      const balances = data.reduce(
        (acc, curr) => {
          acc[curr.currency] = (acc[curr.currency] || 0) + curr.amount;
          return acc;
        },
        {} as Record<string, number>
      );

      // For now, just show the first currency's balance
      // TODO: Handle multiple currencies better
      const [firstCurrency] = Object.keys(balances);
      if (firstCurrency) {
        setBalance(balances[firstCurrency]);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setError('Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
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

  if (balance === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.noData}>No transaction data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Current Balance</Text>
      <Text style={[styles.balance, { color: balance >= 0 ? colors.success : colors.error }]}>
        £{Math.abs(balance).toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  error: {
    color: colors.error,
    textAlign: 'center',
  },
  noData: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
