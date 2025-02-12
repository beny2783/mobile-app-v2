import React, { useEffect, useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { colors } from '../constants/theme';
import BankCard from '../components/BankCard';

interface BankAccount {
  id: string;
  user_id: string;
  connection_id: string;
  account_id: string;
  account_type: string;
  account_name: string;
  currency: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
  current: number;
  available: number;
}

interface BankConnection {
  id: string;
  provider: string;
  status: string;
  created_at: string;
}

interface GroupedAccounts {
  connection: BankConnection;
  accounts: BankAccount[];
}

export default function BalancesScreen() {
  const [groupedAccounts, setGroupedAccounts] = useState<GroupedAccounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // First, get active bank connections
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

      // For each connection, fetch accounts and balances
      const accountsPromises = connections.map(async (connection) => {
        const { data: accounts, error: accountsError } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('connection_id', connection.id);

        if (accountsError) {
          console.error('Error fetching accounts:', accountsError);
          throw accountsError;
        }

        const { data: balances, error: balancesError } = await supabase
          .from('balances')
          .select('*')
          .eq('user_id', user.id)
          .eq('connection_id', connection.id);

        if (balancesError) {
          console.error('Error fetching balances:', balancesError);
          throw balancesError;
        }

        // Combine accounts with their balances
        const accountsWithBalances = accounts.map((account) => {
          const balance = balances?.find((b) => b.account_id === account.account_id);
          return {
            ...account,
            current: balance?.current || 0,
            available: balance?.available || 0,
          };
        });

        return {
          connection,
          accounts: accountsWithBalances,
        };
      });

      const groupedResults = await Promise.all(accountsPromises);
      setGroupedAccounts(groupedResults);
      setError(null);
    } catch (err) {
      console.error('Error fetching accounts:', err);
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
    setRefreshing(true);
    fetchAccounts();
  };

  const formatBankName = (connection: BankConnection) => {
    // In production, this would use the actual bank name from the provider
    // For now, we'll use a placeholder
    return 'My Bank';
  };

  // Calculate total balance across all accounts
  const totalBalance = groupedAccounts.reduce(
    (total, group) =>
      total + group.accounts.reduce((sum, account) => sum + (account.current || 0), 0),
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
          bankName={formatBankName(group.connection)}
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
