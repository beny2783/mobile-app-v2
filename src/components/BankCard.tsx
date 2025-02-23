import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAccounts } from '../store/slices/accounts/hooks';
import { useAppSelector } from '../store/hooks';
import { selectAccountsByConnection } from '../store/slices/accountsSlice';
import { colors } from '../constants/theme';
import AccountList from './AccountList';
import { formatCurrency } from '../utils/formatters';
import { BankConnection } from '../types/bank';

interface BankCardProps {
  bankName: string;
  connectionId: string;
}

export default function BankCard({ bankName, connectionId }: BankCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { disconnectBankConnection, loadAccountsByConnection, accountsLoading } = useAccounts();

  const accounts = useAppSelector((state) => selectAccountsByConnection(state, connectionId));

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  }, [accounts]);

  const toggleExpand = useCallback(async () => {
    if (!isExpanded && accounts.length === 0) {
      await loadAccountsByConnection(connectionId);
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, accounts.length, loadAccountsByConnection, connectionId]);

  const handleOptionsPress = useCallback(async () => {
    try {
      await disconnectBankConnection(connectionId);
    } catch (error) {
      console.error('Failed to disconnect bank:', error);
    }
  }, [disconnectBankConnection, connectionId]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.bankName}>{bankName}</Text>
          <Text style={styles.balance}>{formatCurrency(totalBalance)}</Text>
        </View>
        <TouchableOpacity onPress={handleOptionsPress} style={styles.optionsButton}>
          <Text style={styles.optionsText}>•••</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {accountsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading accounts...</Text>
            </View>
          ) : (
            <AccountList accounts={accounts} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  bankName: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  balance: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
  },
  optionsButton: {
    padding: 12,
    marginLeft: 16,
  },
  optionsText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
  },
  content: {
    marginTop: 16,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
});
