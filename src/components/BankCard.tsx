import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAccounts } from '../hooks/useAccounts';
import { useAppSelector } from '../store/hooks';
import { selectAccountsByConnection } from '../store/slices/accountsSlice';
import { colors } from '../constants/theme';
import AccountList from './AccountList';
import { formatCurrency } from '../utils/formatters';

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
            <Text style={styles.loadingText}>Loading accounts...</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankName: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  balance: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  optionsButton: {
    padding: 8,
  },
  optionsText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  content: {
    marginTop: 16,
  },
  loadingText: {
    padding: 16,
    alignItems: 'center',
  },
});
