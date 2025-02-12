import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../constants/theme';
import { supabase } from '../services/supabase';

interface Balance {
  balance_id: string;
  user_id: string;
  account_id: string;
  balance: number;
  currency: string;
  account_name: string;
  created_at: string;
}

export default function TotalBalance() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error: fetchError } = await supabase
          .from('balances')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setBalances(data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch balance data:', err);
        setError('Failed to load balance data');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  // Calculate total balance
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.label}>
        Total Balance
      </Text>
      <Text variant="displayLarge" style={styles.balance}>
        {formatCurrency(totalBalance)}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Last updated:{' '}
        {balances[0]?.created_at ? new Date(balances[0].created_at).toLocaleString() : 'Never'}
      </Text>

      {balances.length > 0 && (
        <View style={styles.breakdown}>
          {balances.map((balance) => (
            <View key={balance.balance_id} style={styles.breakdownItem}>
              <Text variant="titleMedium" style={styles.breakdownLabel}>
                {balance.account_name}
              </Text>
              <Text
                variant="titleLarge"
                style={[
                  styles.amount,
                  { color: balance.balance >= 0 ? colors.success : colors.error },
                ]}
              >
                {formatCurrency(balance.balance)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colors.error,
    textAlign: 'center',
  },
  label: {
    color: colors.text.primary,
    marginBottom: 8,
  },
  balance: {
    color: colors.text.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: 24,
  },
  breakdown: {
    marginTop: 20,
  },
  breakdownItem: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    color: colors.text.primary,
    flex: 1,
  },
  amount: {
    fontWeight: 'bold',
  },
});
