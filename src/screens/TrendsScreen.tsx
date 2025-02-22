import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { useTransactions } from '../store/slices/transactions/hooks';
import { useAccounts } from '../store/slices/accounts/hooks';
import { useSpendingAnalysis } from '../store/slices/analytics/hooks';
import { useBalanceAnalysis } from '../store/slices/analytics/hooks';
import { SpendingView } from '../components/SpendingView';
import { BalanceView } from '../components/BalanceView';
import { TargetView } from '../components/TargetView';
import { getTimeRange } from '../utils/balanceUtils';
import { createBalanceRepository } from '../repositories/balance';
import { DatabaseBankAccount } from '../types/bank/database';
import type { TimeRange } from '../types/bank/analysis';
import LoadingOverlay from '../components/LoadingOverlay';
import type { Transaction } from '../types/transaction/index';
import { NoBankPrompt } from '../components/NoBankPrompt';

type TabType = 'Balance' | 'Spending' | 'Target';

// Initialize repository once, outside component
const balanceRepository = createBalanceRepository();

interface ExtendedBankAccount extends DatabaseBankAccount {
  bank_connection: {
    id: string;
    bank_name?: string;
  };
}

export default function TrendsScreen() {
  // Local UI state
  const [activeTab, setActiveTab] = useState<TabType>('Balance');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [bankAccounts, setBankAccounts] = useState<ExtendedBankAccount[]>([]);
  const [isLoadingBankAccounts, setIsLoadingBankAccounts] = useState(true);

  // Redux hooks
  const {
    allTransactions: transactions = [],
    loading: isLoadingTransactions,
    errors,
    fetch: fetchTransactions,
  } = useTransactions();

  const {
    connections,
    loadConnections: fetchAccounts,
    connectionsLoading: isLoadingAccounts,
  } = useAccounts();

  // Analytics hooks with proper typing
  const {
    analysis: spendingAnalysis,
    timeRange: spendingTimeRange,
    loading: isLoadingSpending,
    error: spendingError,
    calculate: calculateSpending,
    updateTimeRange: updateSpendingTimeRange,
  } = useSpendingAnalysis();

  const {
    analysis: balanceAnalysis,
    timeRange: balanceTimeRange,
    loading: isLoadingBalance,
    error: balanceError,
    calculate: calculateBalance,
    updateTimeRange: updateBalanceTimeRange,
  } = useBalanceAnalysis();

  // Fetch bank accounts
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('Loading initial data...');
      setIsLoadingBankAccounts(true);

      try {
        // First load connections
        await fetchAccounts();

        if (!connections || connections.length === 0) {
          console.log('No bank connections found');
          setIsLoadingBankAccounts(false);
          return;
        }

        // Then load balances
        const groupedBalances = await balanceRepository.getGroupedBalances();

        const accounts = groupedBalances.flatMap((group) =>
          group.accounts.map((account) => ({
            ...account,
            bank_connection: {
              id: group.connection.id,
              bank_name: group.connection.bank_name,
            },
          }))
        );

        setBankAccounts(accounts);

        // Select all accounts by default
        const accountIds = new Set(accounts.map((acc) => acc.connection_id));
        setSelectedAccounts(accountIds);

        // Finally fetch transactions
        const fromDate = new Date();
        fromDate.setDate(1); // Start of current month
        const toDate = new Date();

        await fetchTransactions({
          fromDate,
          toDate,
        });
      } catch (err) {
        console.error('Error loading initial data:', err);
        setBankAccounts([]);
        setSelectedAccounts(new Set());
      } finally {
        setIsLoadingBankAccounts(false);
      }
    };

    // Only load initial data if we don't have accounts yet and have connections
    if (!bankAccounts.length && connections?.length > 0) {
      loadInitialData();
    }
  }, [connections]); // Only depend on connections

  // Filter transactions based on selected accounts
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => t?.connection_id && selectedAccounts.has(t.connection_id))
      .map((t) => ({
        ...t,
        user_id: t.user_id || t.id,
        type: t.transaction_type?.toLowerCase() === 'credit' ? 'credit' : 'debit',
        created_at: t.created_at || t.timestamp,
      }));
  }, [transactions, selectedAccounts]);

  // Update analytics when filtered transactions or account balances change
  useEffect(() => {
    if (filteredTransactions.length > 0 && bankAccounts.length > 0) {
      const selectedAccountBalances = bankAccounts
        .filter((acc) => selectedAccounts.has(acc.connection_id))
        .map((acc) => ({
          connection_id: acc.connection_id,
          balance: acc.balance,
        }));

      calculateSpending(filteredTransactions);
      calculateBalance(filteredTransactions, selectedAccountBalances);
    }
  }, [filteredTransactions, bankAccounts, selectedAccounts]);

  const toggleAccount = (connectionId: string) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(connectionId)) {
      newSelected.delete(connectionId);
    } else {
      newSelected.add(connectionId);
    }
    setSelectedAccounts(newSelected);
  };

  // Render functions
  const renderAccountSelector = () => (
    <Modal
      visible={showAccountSelector}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAccountSelector(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowAccountSelector(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Accounts</Text>
          <ScrollView>
            {bankAccounts.map((account) => (
              <TouchableOpacity
                key={account.connection_id}
                style={styles.accountItem}
                onPress={() => toggleAccount(account.connection_id)}
              >
                <Text style={styles.accountName}>{account.account_name}</Text>
                <View style={styles.checkbox}>
                  {selectedAccounts.has(account.connection_id) && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderContent = () => {
    // Only show loading if we're loading bank accounts or initial transactions
    const isLoading =
      isLoadingBankAccounts ||
      (isLoadingTransactions?.transactions && !bankAccounts.length) ||
      isLoadingAccounts;

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!connections || connections.length === 0) {
      return <NoBankPrompt />;
    }

    switch (activeTab) {
      case 'Balance':
        return (
          <BalanceView
            data={balanceAnalysis}
            timeRange={balanceTimeRange}
            onTimeRangeChange={updateBalanceTimeRange}
            loading={isLoadingBalance}
            error={balanceError}
          />
        );
      case 'Spending':
        return (
          <SpendingView
            data={spendingAnalysis!}
            timeRange={spendingTimeRange}
            onTimeRangeChange={updateSpendingTimeRange}
            transactions={filteredTransactions}
            loading={isLoadingSpending}
            error={spendingError}
          />
        );
      case 'Target':
        return <TargetView />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trends</Text>
        <TouchableOpacity onPress={() => setShowAccountSelector(true)}>
          <Ionicons name="filter" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {(['Balance', 'Spending', 'Target'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderAccountSelector()}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: 'rgba(46, 196, 182, 0.1)',
  },
  tabText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  modalContent: {
    backgroundColor: '#0A1A2F',
    marginTop: 60,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  accountName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
