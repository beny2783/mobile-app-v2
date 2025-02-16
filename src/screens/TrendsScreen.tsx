import React, { useState } from 'react';
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
import { useTransactions } from '../hooks/useTransactions';
import { useSpendingAnalysis } from '../hooks/useSpendingAnalysis';
import { useBalanceAnalysis } from '../hooks/useBalanceAnalysis';
import { SpendingView } from '../components/SpendingView';
import { BalanceView } from '../components/BalanceView';
import { TargetView } from '../components/TargetView';
import { getTimeRange } from '../utils/balanceUtils';
import { createBalanceRepository } from '../repositories/balance';

type TabType = 'Balance' | 'Spending' | 'Target';

// Initialize repository once, outside component
const balanceRepository = createBalanceRepository();

interface BankAccount {
  id: string;
  user_id: string;
  connection_id: string;
  account_id: string;
  account_name: string;
  account_type: string;
  currency: string;
  balance: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
  bank_connection: {
    id: string;
    bank_name?: string;
  };
}

export default function TrendsScreen() {
  const [timeRangeType, setTimeRangeType] = useState<'Month' | 'Year'>('Month');
  const [activeTab, setActiveTab] = useState<TabType>('Balance');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const { transactions, loading, error, refreshing, refresh, bankConnections } = useTransactions();
  const [spendingTimeRange, setSpendingTimeRange] = useState<'week' | 'month'>('month');

  // Fetch bank accounts
  React.useEffect(() => {
    const fetchBankAccounts = async () => {
      console.log('🏦 Fetching bank accounts...');
      try {
        const groupedBalances = await balanceRepository.getGroupedBalances();
        console.log(`✅ Found ${groupedBalances.length} bank connections`);

        // Flatten accounts from all connections
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
      }
    };
    fetchBankAccounts();
  }, []);

  // Initialize selected accounts if empty
  React.useEffect(() => {
    console.log('🔄 Account Selection State:', {
      currentSelected: Array.from(selectedAccounts),
      availableAccounts: bankAccounts.map((acc) => ({
        account_name: acc.account_name,
        connection_id: acc.connection_id,
      })),
    });

    if (selectedAccounts.size === 0 && bankAccounts.length > 0) {
      const newSelectedAccounts = new Set(bankAccounts.map((acc) => acc.connection_id));
      console.log('🔄 Initializing selected accounts:', Array.from(newSelectedAccounts));
      setSelectedAccounts(newSelectedAccounts);
    }
  }, [bankAccounts]);

  const filteredTransactions = transactions.filter((t) => {
    return selectedAccounts.has(t.connection_id);
  });

  const spendingAnalysis = useSpendingAnalysis(filteredTransactions, spendingTimeRange);
  const balanceAnalysis = useBalanceAnalysis(
    filteredTransactions,
    timeRangeType,
    bankAccounts
      .filter((acc) => selectedAccounts.has(acc.connection_id))
      .map((acc) => ({
        connection_id: acc.connection_id,
        balance: acc.balance,
      }))
  );
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

  if (!spendingAnalysis || !balanceAnalysis) {
    return (
      <View style={styles.centered}>
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
            onTimeRangeChange={setTimeRangeType}
          />
        )}
        {activeTab === 'Spending' && (
          <SpendingView
            data={spendingAnalysis}
            timeRange={spendingTimeRange}
            onTimeRangeChange={setSpendingTimeRange}
          />
        )}
        {activeTab === 'Target' && <TargetView />}
      </ScrollView>
      {renderAccountSelector()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A2F',
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
