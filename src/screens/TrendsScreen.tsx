import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const MOCK_DATA = {
  currentBalance: 30089.6,
  startingBalance: 31309.66,
  moneyIn: 450.0,
  moneyOut: 1670.06,
  upcomingPayments: 843.52,
  estimatedBalance: 29246.08,
  chartData: {
    current: [31309, 31200, 30800, 30400, 30089],
    estimated: [30089, 29800, 29500, 29246],
  },
};

export default function TrendsScreen() {
  const [timeRange, setTimeRange] = useState('Month');

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.accountsText}>4 accounts</Text>
        <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
      </View>
      <TouchableOpacity style={styles.periodSelector}>
        <Text style={styles.periodText}>This month</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['Balance', 'Spending', 'Target'].map((tab) => (
        <TouchableOpacity key={tab} style={[styles.tab, tab === 'Balance' && styles.activeTab]}>
          <Ionicons
            name={
              tab === 'Balance'
                ? 'stats-chart-outline'
                : tab === 'Spending'
                  ? 'pie-chart-outline'
                  : 'flag-outline'
            }
            size={20}
            color={tab === 'Balance' ? colors.primary : colors.text.secondary}
          />
          <Text style={[styles.tabText, tab === 'Balance' && styles.activeTabText]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBalanceOverview = () => (
    <View style={styles.balanceContainer}>
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceTitle}>This month</Text>
        <Text style={styles.balanceAmount}>£{MOCK_DATA.currentBalance.toFixed(2)}</Text>
        <Text style={styles.balanceSubtitle}>Today's Balance</Text>
      </View>
      <View style={styles.chartWrapper}>
        <LineChart
          data={{
            labels: [],
            datasets: [
              {
                data: MOCK_DATA.chartData.current,
                color: (opacity = 1) => `rgba(46, 196, 182, ${opacity})`,
                strokeWidth: 2,
              },
              {
                data: MOCK_DATA.chartData.estimated,
                color: (opacity = 1) => `rgba(46, 196, 182, ${opacity * 0.5})`,
                strokeWidth: 1,
                strokeDashArray: [5, 5],
              },
            ],
          }}
          width={width - 32}
          height={180}
          withHorizontalLabels={false}
          withVerticalLabels={false}
          withDots={false}
          chartConfig={{
            backgroundColor: '#0A1A2F',
            backgroundGradientFrom: '#0A1A2F',
            backgroundGradientTo: '#0A1A2F',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(46, 196, 182, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          bezier
          style={styles.chart}
        />
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabel}>1 Feb</Text>
          <Text style={styles.chartLabel}>28 Feb</Text>
        </View>
      </View>
      <View style={styles.timeSelector}>
        <TouchableOpacity
          style={[styles.timeButton, timeRange === 'Month' && styles.activeTimeButton]}
          onPress={() => setTimeRange('Month')}
        >
          <Text style={styles.timeButtonText}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeButton, timeRange === 'Year' && styles.activeTimeButton]}
          onPress={() => setTimeRange('Year')}
        >
          <Text style={styles.timeButtonText}>Year</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBreakdown = () => (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>Breakdown</Text>
      <View style={styles.breakdownItem}>
        <View style={styles.breakdownLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="play" size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.breakdownLabel}>Starting balance</Text>
            <Text style={styles.breakdownDate}>On 1st Feb</Text>
          </View>
        </View>
        <Text style={styles.positiveAmount}>+£{MOCK_DATA.startingBalance.toFixed(2)}</Text>
      </View>
      <View style={styles.breakdownItem}>
        <View style={styles.breakdownLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="add" size={20} color="#FFF" />
          </View>
          <Text style={styles.breakdownLabel}>Total money in</Text>
        </View>
        <Text style={styles.positiveAmount}>+£{MOCK_DATA.moneyIn.toFixed(2)}</Text>
      </View>
      <View style={styles.breakdownItem}>
        <View style={styles.breakdownLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#F44336' }]}>
            <Ionicons name="remove" size={20} color="#FFF" />
          </View>
          <Text style={styles.breakdownLabel}>Total money out</Text>
        </View>
        <Text style={styles.amount}>£{MOCK_DATA.moneyOut.toFixed(2)}</Text>
      </View>
      <View style={styles.breakdownItem}>
        <View style={styles.breakdownLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#9E9E9E' }]}>
            <Ionicons name="calendar-outline" size={20} color="#FFF" />
          </View>
          <Text style={styles.breakdownLabel}>Total upcoming</Text>
        </View>
        <Text style={styles.amount}>£{MOCK_DATA.upcomingPayments.toFixed(2)}</Text>
      </View>
      <View style={styles.breakdownItem}>
        <View style={styles.breakdownLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
            <Ionicons name="calculator-outline" size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.breakdownLabel}>Estimated balance</Text>
            <Text style={styles.breakdownDate}>On 28th Feb</Text>
          </View>
        </View>
        <Text style={styles.amount}>£{MOCK_DATA.estimatedBalance.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderHelp = () => (
    <View style={styles.helpContainer}>
      <TouchableOpacity style={styles.helpButton}>
        <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
        <View style={styles.helpContent}>
          <Text style={styles.helpTitle}>Get help</Text>
          <Text style={styles.helpSubtitle}>Answer your questions about Trends</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.helpButton}>
        <Ionicons name="bulb-outline" size={24} color={colors.primary} />
        <View style={styles.helpContent}>
          <Text style={styles.helpTitle}>Share your thoughts</Text>
          <Text style={styles.helpSubtitle}>Help shape the future of Trends</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      {renderBalanceOverview()}
      {renderBreakdown()}
      {renderHelp()}
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
  balanceContainer: {
    padding: 16,
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceTitle: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceSubtitle: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  chartWrapper: {
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  chartLabel: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  timeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 4,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTimeButton: {
    backgroundColor: '#FFF',
  },
  timeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownContainer: {
    padding: 16,
  },
  breakdownTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownLabel: {
    color: '#FFF',
    fontSize: 16,
  },
  breakdownDate: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  amount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  positiveAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
  helpContainer: {
    padding: 16,
    gap: 12,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  helpSubtitle: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
