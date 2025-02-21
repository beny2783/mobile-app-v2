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
    gap: 16,
  },
  accountItem: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 16,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 4,
  },
  balance: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  updated: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
