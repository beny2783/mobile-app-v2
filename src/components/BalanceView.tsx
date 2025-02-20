import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart, DataPoint } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../utils/balanceUtils';
import { colors } from '../constants/theme';
import { TimeRange, BalanceAnalysisData } from '../types/bank/analysis';

const { width } = Dimensions.get('window');

interface CustomDataPoint extends DataPoint {
  date: string;
  label: string;
}

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

  useEffect(() => {
    console.log('🏦 Chart Data:', {
      labels: data.chartData.labels,
      data: data.chartData.current,
      timeRange: {
        type: timeRange.type,
        startDate: timeRange.startDate.toISOString(),
        endDate: timeRange.endDate.toISOString(),
      },
    });
  }, [data, timeRange]);

  const [selectedPoint, setSelectedPoint] = useState<CustomDataPoint | null>(null);

  // Transform data for the chart
  const chartData: CustomDataPoint[] = data.chartData.current.map((value, index) => ({
    value,
    label: data.chartData.labels[index],
    date: (() => {
      const date = new Date(timeRange.startDate);
      date.setDate(date.getDate() + index);
      return date.toISOString();
    })(),
    showDataPoint: true,
  }));

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
          data={chartData}
          height={220}
          width={width - 64}
          hideDataPoints={false}
          spacing={40}
          color="#2EC4B6"
          thickness={3}
          startFillColor="rgba(46, 196, 182, 0.1)"
          endFillColor="rgba(46, 196, 182, 0.01)"
          initialSpacing={20}
          endSpacing={20}
          noOfSections={6}
          yAxisColor="rgba(255,255,255,0.1)"
          xAxisColor="rgba(255,255,255,0.1)"
          yAxisTextStyle={{ color: 'white', fontSize: 12 }}
          xAxisTextStyle={{
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '500',
          }}
          yAxisLabelSuffix=""
          yAxisLabelPrefix="£"
          rulesColor="rgba(255,255,255,0.1)"
          rulesType="solid"
          yAxisTextNumberOfLines={1}
          yAxisLabelWidth={60}
          hideOrigin={true}
          maxValue={Math.ceil(Math.max(...data.chartData.current) * 1.05)}
          minValue={Math.floor(Math.min(...data.chartData.current) * 0.95)}
          xAxisLabelsVerticalShift={10}
          formatXLabel={(label: string) => {
            const date = new Date(label);
            return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
          }}
          dataPointsHeight={6}
          dataPointsWidth={6}
          dataPointsColor="#2EC4B6"
          dataPointsShape="circle"
          onPress={(point: DataPoint) => {
            if (point.date && point.label) {
              setSelectedPoint(point as CustomDataPoint);
            }
          }}
          curved
          renderTooltip={(point: DataPoint) => {
            if (!selectedPoint || selectedPoint.value !== point.value || !point.date) return null;
            return (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>{formatCurrency(point.value)}</Text>
                <Text style={styles.tooltipDate}>{formatDate(new Date(point.date))}</Text>
              </View>
            );
          }}
        />
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeSelector}>
        <TouchableOpacity
          style={[styles.timeButton, timeRange.type === 'Month' && styles.activeTimeButton]}
          onPress={() => onTimeRangeChange('Month')}
        >
          <Text
            style={[
              styles.timeButtonText,
              timeRange.type === 'Month' && styles.activeTimeButtonText,
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeButton, timeRange.type === 'Year' && styles.activeTimeButton]}
          onPress={() => onTimeRangeChange('Year')}
        >
          <Text
            style={[
              styles.timeButtonText,
              timeRange.type === 'Year' && styles.activeTimeButtonText,
            ]}
          >
            Year
          </Text>
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
    marginBottom: 24,
    backgroundColor: '#0A1A2F',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 120,
  },
  tooltipText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
  activeTimeButtonText: {
    color: '#0A1A2F',
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
