import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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

type TabType = 'Balance' | 'Spending' | 'Target';

export default function TrendsScreen() {
  const [timeRangeType, setTimeRangeType] = useState<'Month' | 'Year'>('Month');
  const [activeTab, setActiveTab] = useState<TabType>('Balance');
  const { transactions, loading, error, refreshing, refresh, bankConnections } = useTransactions();

  const spendingAnalysis = useSpendingAnalysis(transactions);
  const balanceAnalysis = useBalanceAnalysis(transactions, timeRangeType);
  const timeRange = getTimeRange(timeRangeType);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.accountsText}>{bankConnections.length} accounts</Text>
        <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
      </View>
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
      {activeTab === 'Spending' && <SpendingView data={spendingAnalysis} />}
      {activeTab === 'Target' && <TargetView />}
    </ScrollView>
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
});
