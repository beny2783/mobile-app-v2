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
import { LoadingSpinner } from '../components/LoadingSpinner';
import LoadingOverlay from '../components/LoadingOverlay';
import type { Transaction } from '../types/transaction/index';
import type { DatabaseTransaction } from '../types/transaction';
import type { BaseTransaction } from '../types/transaction/index';
import { NoBankPrompt } from '../components/NoBankPrompt';
import { TimeRangeSelector } from '../components/TimeRangeSelector';

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
  // 1. All hooks must be called before any conditional returns
  const [timeRangeType, setTimeRangeType] = useState<TimeRange['type']>('Month');
  const [activeTab, setActiveTab] = useState<TabType>('Balance');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [bankAccounts, setBankAccounts] = useState<ExtendedBankAccount[]>([]);
  const [isLoadingBankAccounts, setIsLoadingBankAccounts] = useState(true);
  const [spendingTimeRange, setSpendingTimeRange] = useState<'week' | 'month'>('month');

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
  const refreshing = isLoadingTransactions;
  const error = errors.transactions;

  const {
    analysis: spendingAnalysis,
    updateTimeRange: updateSpendingTimeRange,
    calculate: calculateSpending,
  } = useSpendingAnalysis();

  const {
    analysis: balanceAnalysis,
    updateTimeRange: updateBalanceTimeRange,
    calculate: calculateBalance,
    loading: isLoadingAnalysis,
  } = useBalanceAnalysis();

  // Fetch bank accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      console.log('🏦 Fetching bank accounts...');
      setIsLoadingBankAccounts(true);
      try {
        const groupedBalances = await balanceRepository.getGroupedBalances();
        console.log(`✅ Found ${groupedBalances.length} bank connections`);

        const accounts = groupedBalances.flatMap((group) =>
          group.accounts.map((account) => ({
            ...account,
            bank_connection: {
              id: group.connection.id,
              bank_name: group.connection.bank_name,
            },
          }))
        );

        console.log(
          '🏦 Accounts:',
          accounts.map((acc) => ({
            account_name: acc.account_name,
            connection_id: acc.connection_id,
            account_type: acc.account_type,
          }))
        );

        setBankAccounts(accounts);
      } catch (err) {
        console.error('❌ Error fetching bank accounts:', err);
      } finally {
        setIsLoadingBankAccounts(false);
      }
    };
    fetchBankAccounts();
  }, []);

  // Fetch initial transactions
  useEffect(() => {
    console.log('🔄 Fetching initial transactions...');
    const fetchInitialTransactions = async () => {
      try {
        const fromDate = new Date();
        fromDate.setDate(1); // Start of current month
        const toDate = new Date();

        await fetchTransactions({
          fromDate,
          toDate,
        });
        console.log('✅ Initial transactions fetched');
      } catch (err) {
        console.error('❌ Error fetching initial transactions:', err);
      }
    };
    fetchInitialTransactions();
  }, []); // Only run on mount

  // Initialize selected accounts
  useEffect(() => {
    if (selectedAccounts.size === 0 && bankAccounts.length > 0) {
      const newSelectedAccounts = new Set(bankAccounts.map((acc) => acc.connection_id));
      console.log('🔄 Initializing selected accounts:', Array.from(newSelectedAccounts));
      setSelectedAccounts(newSelectedAccounts);
    }
  }, [bankAccounts, selectedAccounts]);

  // Filter and transform transactions
  const filteredTransactions = useMemo(() => {
    return (transactions || [])
      .filter((t) => {
        if (!t || !t.connection_id) {
          console.log('Filtering out transaction:', {
            reason: 'missing required fields',
            transaction: t,
          });
          return false;
        }
        if (bankAccounts.length > 0 && !selectedAccounts.has(t.connection_id)) {
          console.log('Filtering out transaction:', {
            reason: 'account not selected',
            transaction: t,
          });
          return false;
        }
        return true;
      })
      .map((t) => {
        const transformedTransaction = {
          ...t,
          user_id: t.user_id || t.id,
          connection_id: t.connection_id,
          timestamp: t.timestamp,
          type: t.transaction_type?.toLowerCase() === 'credit' ? 'credit' : 'debit',
          created_at: t.created_at || t.timestamp,
        };
        return transformedTransaction;
      });
  }, [transactions, bankAccounts, selectedAccounts]);

  // Debug logging for filtered transactions
  useEffect(() => {
    if (filteredTransactions.length > 0) {
      console.log('Filtered Transactions Sample:', {
        count: filteredTransactions.length,
        first: filteredTransactions[0],
        last: filteredTransactions[filteredTransactions.length - 1],
      });
    } else {
      console.log('No filtered transactions available');
    }
  }, [filteredTransactions]);

  // Update time range handlers
  const handleSpendingTimeRangeChange = (newRange: 'week' | 'month') => {
    setSpendingTimeRange(newRange);
    updateSpendingTimeRange(newRange);
  };

  const handleBalanceTimeRangeChange = (type: 'Day' | 'Week' | 'Month' | 'Year') => {
    setTimeRangeType(type);
    // Convert the type to match the analytics slice format
    const range = type.toLowerCase() as 'week' | 'month' | 'year';
    updateBalanceTimeRange(range);
  };

  // Update useEffect to calculate analytics when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      calculateSpending(transactions);
      calculateBalance(
        transactions,
        bankAccounts
          .filter((acc) => selectedAccounts.has(acc.connection_id))
          .map((acc) => ({
            connection_id: acc.connection_id,
            balance: acc.balance,
          }))
      );
    }
  }, [transactions, bankAccounts, selectedAccounts, calculateSpending, calculateBalance]);

  const timeRange = getTimeRange(timeRangeType);

  const toggleAccount = (connectionId: string) => {
    console.log(`Toggling account with connection_id: ${connectionId}`);
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(connectionId)) {
      console.log(`Removing account: ${connectionId}`);
      newSelected.delete(connectionId);
    } else {
      console.log(`Adding account: ${connectionId}`);
      newSelected.add(connectionId);
    }
    console.log('New selected accounts:', Array.from(newSelected));
    setSelectedAccounts(newSelected);
  };

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
        <View style={styles.accountSelectorContainer}>
          <View style={styles.accountSelectorHeader}>
            <Text style={styles.accountSelectorTitle}>Select Accounts</Text>
            <TouchableOpacity onPress={() => setShowAccountSelector(false)}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          {bankAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={styles.accountItem}
              onPress={() => toggleAccount(account.connection_id)}
            >
              <View style={styles.accountItemLeft}>
                <Text style={styles.accountName}>{account.account_name}</Text>
                <Text style={styles.accountType}>{account.account_type}</Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  selectedAccounts.has(account.connection_id) && styles.checkboxSelected,
                ]}
              >
                {selectedAccounts.has(account.connection_id) && (
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerLeft} onPress={() => setShowAccountSelector(true)}>
        <Text style={styles.accountsText}>
          {selectedAccounts.size} {selectedAccounts.size === 1 ? 'account' : 'accounts'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.periodSelector}>
        <Text style={styles.periodText}>This {timeRangeType.toLowerCase()}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['Balance', 'Spending', 'Target'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab as TabType)}
        >
          <Ionicons
            name={
              tab === 'Balance'
                ? 'stats-chart-outline'
                : tab === 'Spending'
                  ? 'pie-chart-outline'
                  : 'flag-outline'
            }
            size={20}
            color={activeTab === tab ? colors.primary : colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render functions
  const renderContent = () => {
    if (error) {
      return (
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.errorText}>Error loading transactions</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTransactions({})}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Check for no bank accounts first, but only after initial loading
    if (!isLoadingBankAccounts && bankAccounts.length === 0) {
      return <NoBankPrompt />;
    }

    // Then check loading states
    if (isLoadingBankAccounts || (refreshing && !transactions.length)) {
      return (
        <View style={[styles.container, styles.centered]}>
          <LoadingOverlay visible={true} message="Loading..." />
          <Text style={styles.loadingText}>Loading your financial data...</Text>
        </View>
      );
    }

    if (!spendingAnalysis || !balanceAnalysis) {
      return (
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.error}>No transaction data available</Text>
        </View>
      );
    }

    return (
      <>
        <ScrollView style={styles.container}>
          {renderHeader()}
          {renderTabs()}
          {activeTab === 'Balance' && (
            <BalanceView
              data={balanceAnalysis}
              timeRange={timeRange}
              onTimeRangeChange={handleBalanceTimeRangeChange}
            />
          )}
          {activeTab === 'Spending' && (
            <SpendingView
              data={spendingAnalysis}
              timeRange={spendingTimeRange}
              onTimeRangeChange={handleSpendingTimeRangeChange}
              transactions={filteredTransactions}
            />
          )}
          {activeTab === 'Target' && <TargetView />}
        </ScrollView>
        {renderAccountSelector()}
      </>
    );
  };

  // Final render
  return renderContent();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  periodSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  periodText: {
    color: '#FFF',
    fontSize: 14,
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
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  comingSoonText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  error: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  accountSelectorContainer: {
    backgroundColor: '#0A1A2F',
    marginTop: 60,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  accountSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountSelectorTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  accountItemLeft: {
    flex: 1,
  },
  accountName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  accountType: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.secondary,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  errorText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
});
