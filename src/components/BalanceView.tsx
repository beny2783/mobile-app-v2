import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../utils/balanceUtils';
import { colors } from '../constants/theme';
import { TimeRange, BalanceAnalysisData } from '../types/bank/analysis';

const { width } = Dimensions.get('window');

interface BalanceViewProps {
  data: BalanceAnalysisData;
  timeRange: TimeRange;
  onTimeRangeChange: (type: TimeRange['type']) => void;
}

export const BalanceView: React.FC<BalanceViewProps> = ({ data, timeRange, onTimeRangeChange }) => {
  useEffect(() => {
    console.log('🏦 BalanceView - Using new types:');
    console.log('Data:', {
      currentBalance: data.currentBalance,
      startingBalance: data.startingBalance,
      timeRange: {
        type: timeRange.type,
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
      },
    });
  }, [data, timeRange]);

  const [selectedPoint, setSelectedPoint] = useState<{
    value: number;
    date: string;
    index: number;
  } | null>(null);

  const handleDataPointClick = (value: number, date: string, index: number) => {
    setSelectedPoint({ value, date, index });
  };

  return (
    <View style={styles.container}>
      {/* Balance Overview */}
      <View style={styles.header}>
        <Text style={styles.title}>This {timeRange.type.toLowerCase()}</Text>
        <Text style={styles.amount}>{formatCurrency(data.currentBalance)}</Text>
        <Text style={styles.subtitle}>
          {selectedPoint
            ? `Balance on ${formatDate(new Date(selectedPoint.date))}`
            : "Today's Balance"}
        </Text>
      </View>

      {/* Balance Chart */}
      <View style={styles.chartWrapper}>
        <LineChart
          data={{
            labels: data.chartData.labels.map((d) => formatDate(new Date(d))),
            datasets: [
              {
                data: data.chartData.current,
                color: (opacity = 1) => `rgba(46, 196, 182, ${opacity})`,
                strokeWidth: 2,
              },
            ],
          }}
          width={width - 32}
          height={180}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          withDots={true}
          withShadow={false}
          chartConfig={{
            backgroundColor: '#0A1A2F',
            backgroundGradientFrom: '#0A1A2F',
            backgroundGradientTo: '#0A1A2F',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(46, 196, 182, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#2EC4B6',
              fill: '#0A1A2F',
            },
            propsForLabels: {
              fontSize: 10,
            },
          }}
          bezier
          style={styles.chart}
          onDataPointClick={({ value, dataset, getColor, index }) => {
            handleDataPointClick(value, data.chartData.labels[index], index);
          }}
        />
        {selectedPoint && (
          <View
            style={[
              styles.tooltip,
              {
                top: 40,
                left:
                  (width - 32) * (selectedPoint.index / (data.chartData.labels.length - 1)) - 40,
              },
            ]}
          >
            <Text style={styles.tooltipText}>{formatCurrency(selectedPoint.value)}</Text>
            <Text style={styles.tooltipDate}>{formatDate(new Date(selectedPoint.date))}</Text>
          </View>
        )}
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
          <Text style={styles.amount}>{formatCurrency(data.startingBalance)}</Text>
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
          <Text style={styles.negativeAmount}>{formatCurrency(data.moneyOut)}</Text>
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
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  chartWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  tooltipDate: {
    color: 'rgba(0, 0, 0, 0.6)',
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
  },
  breakdownContainer: {
    gap: 16,
  },
  breakdownTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownLabel: {
    color: '#FFF',
    fontSize: 14,
  },
  breakdownDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  positiveAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  negativeAmount: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
});
