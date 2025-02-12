import React, { useEffect, useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { colors } from '../constants/theme';

interface BankAccount {
  id: string;
  user_id: string;
  connection_id: string;
  account_id: string;
  account_type: string;
  account_name: string;
  currency: string;
  balance: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export default function BalancesScreen() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // First, check the bank connection
      const { data: connection, error: connectionError } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .single();

      if (connectionError) {
        console.error('Error fetching bank connection:', connectionError);
        throw connectionError;
      }

      // Then fetch accounts for this connection
      const { data, error: fetchError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('connection_id', connection.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching accounts:', fetchError);
        throw fetchError;
      }

      setAccounts(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts');
      setAccounts([]); // Clear accounts on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
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

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Balance</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(totalBalance, accounts[0]?.currency || 'GBP')}
        </Text>
      </View>

      {accounts.map((account) => (
        <Card key={account.id} style={styles.card}>
          <Card.Content>
            <View style={styles.accountHeader}>
              <View style={styles.accountInfo}>
                <Text variant="titleMedium" style={styles.accountName}>
                  {account.account_name}
                </Text>
                <Text variant="bodySmall" style={styles.accountType}>
                  {account.account_type}
                </Text>
              </View>
            </View>

            <View style={styles.balanceContainer}>
              <View style={styles.balanceItem}>
                <Text variant="bodySmall" style={styles.balanceLabel}>
                  Balance
                </Text>
                <Text variant="headlineMedium" style={styles.balance}>
                  {formatCurrency(account.balance || 0, account.currency)}
                </Text>
              </View>
            </View>

            <Text variant="bodySmall" style={styles.updated}>
              Last updated: {new Date(account.last_updated || account.updated_at).toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
      ))}

      {accounts.length === 0 && (
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
  card: {
    margin: 16,
    elevation: 4,
    backgroundColor: colors.surface,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  accountType: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    color: colors.text.secondary,
    marginBottom: 4,
  },
  balance: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  updated: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
  },
  totalContainer: {
    padding: 24,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  totalLabel: {
    color: colors.text.inverse,
    fontSize: 16,
    marginBottom: 8,
  },
  totalAmount: {
    color: colors.text.inverse,
    fontSize: 32,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
