import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DatabaseBankAccount } from '../types/bank/database';
import { colors } from '../constants/theme';

interface AccountListProps {
  accounts: DatabaseBankAccount[];
}

export default function AccountList({ accounts }: AccountListProps) {
  return (
    <View style={styles.container}>
      {accounts.map((account) => (
        <View key={account.id} style={styles.accountItem}>
          <View style={styles.accountHeader}>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{account.account_name}</Text>
              <Text style={styles.accountType}>{account.account_type}</Text>
            </View>
          </View>

          <View style={styles.balanceContainer}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balance}>
                {new Intl.NumberFormat('en-GB', {
                  style: 'currency',
                  currency: account.currency || 'GBP',
                }).format(account.balance || 0)}
              </Text>
            </View>
          </View>

          <Text style={styles.updated}>
            Last updated: {new Date(account.last_updated).toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  accountItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountType: {
    color: colors.text.secondary,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  balanceContainer: {
    marginTop: 8,
  },
  balanceItem: {
    marginBottom: 8,
  },
  balanceLabel: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 4,
  },
  balance: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
  },
  updated: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
