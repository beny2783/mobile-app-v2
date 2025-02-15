import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../constants/theme';
import { supabase } from '../services/supabase';
import { authRepository } from '../repositories/auth';

interface Balance {
  id: string;
  user_id: string;
  connection_id: string;
  account_id: string;
  current: number;
  available: number;
  currency: string;
  created_at: string;
  updated_at: string;
  account_name?: string;
  bank_name?: string;
}

export default function TotalBalance() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const user = await authRepository.getUser();
        if (!user) return;

        // Get all active connections
        const { data: connections, error: connectionError } = await supabase
          .from('bank_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .is('disconnected_at', null);

        if (connectionError) {
          console.error('Error fetching bank connections:', connectionError);
          throw connectionError;
        }

        if (!connections || connections.length === 0) {
          setBalances([]);
          return;
        }

        // Fetch balances and accounts for all connections
        const allBalances: Balance[] = [];

        for (const connection of connections) {
          const [
            { data: connectionBalances, error: balancesError },
            { data: accounts, error: accountsError },
          ] = await Promise.all([
            supabase
              .from('balances')
              .select('*')
              .eq('user_id', user.id)
              .eq('connection_id', connection.id),
            supabase
              .from('bank_accounts')
              .select('*')
              .eq('user_id', user.id)
              .eq('connection_id', connection.id),
          ]);

          if (balancesError) throw balancesError;
          if (accountsError) throw accountsError;

          // Combine balances with account names for this connection
          const combinedBalances = (connectionBalances || []).map((balance) => {
            const account = accounts?.find((a) => a.account_id === balance.account_id);
            return {
              ...balance,
              account_name: account?.account_name || 'Unknown Account',
              bank_name: connection.bank_name || 'Connected Bank',
            };
          });

          allBalances.push(...combinedBalances);
        }

        setBalances(allBalances);
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

  // Calculate total balance using current balance
  const totalBalance = balances.reduce((sum, b) => sum + (b.current || 0), 0);

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
        {balances[0]?.updated_at ? new Date(balances[0].updated_at).toLocaleString() : 'Never'}
      </Text>

      {balances.length > 0 && (
        <View style={styles.breakdown}>
          {balances.map((balance) => (
            <View key={balance.id} style={styles.breakdownItem}>
              <Text variant="titleMedium" style={styles.breakdownLabel}>
                {balance.account_name}
              </Text>
              <Text
                variant="titleLarge"
                style={[
                  styles.amount,
                  { color: balance.current >= 0 ? colors.success : colors.error },
                ]}
              >
                {formatCurrency(balance.current || 0)}
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
