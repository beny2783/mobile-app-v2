import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { BalanceData, TimeRange, formatCurrency, formatDate } from '../utils/balanceUtils';
import { colors } from '../constants/theme';

const { width } = Dimensions.get('window');

interface BalanceViewProps {
  data: BalanceData;
  timeRange: TimeRange;
  onTimeRangeChange: (type: 'Month' | 'Year') => void;
}

export const BalanceView: React.FC<BalanceViewProps> = ({ data, timeRange, onTimeRangeChange }) => {
  return (
    <View style={styles.container}>
      {/* Balance Overview */}
      <View style={styles.header}>
        <Text style={styles.title}>This {timeRange.type.toLowerCase()}</Text>
        <Text style={styles.amount}>{formatCurrency(data.currentBalance)}</Text>
        <Text style={styles.subtitle}>Today's Balance</Text>
      </View>

      {/* Balance Chart */}
      <View style={styles.chartWrapper}>
        <LineChart
          data={{
            labels: [],
            datasets: [
              {
                data: data.chartData.current,
                color: (opacity = 1) => `rgba(46, 196, 182, ${opacity})`,
                strokeWidth: 2,
              },
              {
                data: data.chartData.estimated,
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
          <Text style={styles.chartLabel}>{formatDate(timeRange.startDate)}</Text>
          <Text style={styles.chartLabel}>{formatDate(timeRange.endDate)}</Text>
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeSelector}>
        <TouchableOpacity
          style={[styles.timeButton, timeRange.type === 'Month' && styles.activeTimeButton]}
          onPress={() => onTimeRangeChange('Month')}
        >
          <Text style={styles.timeButtonText}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeButton, timeRange.type === 'Year' && styles.activeTimeButton]}
          onPress={() => onTimeRangeChange('Year')}
        >
          <Text style={styles.timeButtonText}>Year</Text>
        </TouchableOpacity>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>Breakdown</Text>

        {/* Starting Balance */}
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="play" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.breakdownLabel}>Starting balance</Text>
              <Text style={styles.breakdownDate}>On {formatDate(timeRange.startDate)}</Text>
            </View>
          </View>
          <Text style={styles.positiveAmount}>{formatCurrency(data.startingBalance)}</Text>
        </View>

        {/* Money In */}
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="add" size={20} color="#FFF" />
            </View>
            <Text style={styles.breakdownLabel}>Total money in</Text>
          </View>
          <Text style={styles.positiveAmount}>{formatCurrency(data.moneyIn)}</Text>
        </View>

        {/* Money Out */}
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#F44336' }]}>
              <Ionicons name="remove" size={20} color="#FFF" />
            </View>
            <Text style={styles.breakdownLabel}>Total money out</Text>
          </View>
          <Text style={styles.amount}>{formatCurrency(data.moneyOut)}</Text>
        </View>

        {/* Upcoming */}
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#9E9E9E' }]}>
              <Ionicons name="calendar-outline" size={20} color="#FFF" />
            </View>
            <Text style={styles.breakdownLabel}>Total upcoming</Text>
          </View>
          <Text style={styles.amount}>{formatCurrency(data.upcomingPayments.total)}</Text>
        </View>

        {/* Estimated Balance */}
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="calculator-outline" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.breakdownLabel}>Estimated balance</Text>
              <Text style={styles.breakdownDate}>
                On {formatDate(new Date(data.estimatedBalance.date))}
              </Text>
            </View>
          </View>
          <Text style={styles.amount}>{formatCurrency(data.estimatedBalance.amount)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
  },
  amount: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
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
    marginBottom: 24,
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
    marginTop: 8,
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
});
