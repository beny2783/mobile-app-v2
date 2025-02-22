import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart, DataPoint } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/balanceUtils';
import { colors } from '../constants/theme';
import { TimeRange, BalanceAnalysisData } from '../types/bank/analysis';

const { width } = Dimensions.get('window');

interface CustomDataPoint extends DataPoint {
  date: string;
  label: string;
}

interface BalanceViewProps {
  data: BalanceAnalysisData | null;
  timeRange: 'week' | 'month' | 'year';
  onTimeRangeChange: (range: 'week' | 'month' | 'year') => void;
  loading?: boolean;
  error?: string | null;
}

// Helper function to format date string
const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

export const BalanceView: React.FC<BalanceViewProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  loading = false,
  error = null,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<CustomDataPoint | null>(null);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>No balance data available</Text>
      </View>
    );
  }

  // Transform data for the chart with proper typing
  const chartData: CustomDataPoint[] = data.chartData.current.map((value, index) => ({
    value,
    date: data.chartData.labels[index],
    label: formatDateLabel(data.chartData.labels[index]),
  }));

  const handlePointPress = (point: DataPoint) => {
    setSelectedPoint(point as CustomDataPoint);
  };

  return (
    <View style={styles.container}>
      <View style={styles.timeSelector}>
        {(['week', 'month', 'year'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.timeButton, timeRange === range && styles.activeTimeButton]}
            onPress={() => onTimeRangeChange(range)}
          >
            <Text
              style={[styles.timeButtonText, timeRange === range && styles.activeTimeButtonText]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.label}>Current Balance</Text>
        <Text style={styles.balance}>{formatCurrency(data.currentBalance)}</Text>
        <View style={styles.changeContainer}>
          <Text
            style={[
              styles.changeText,
              data.currentBalance > data.startingBalance
                ? styles.positiveChange
                : styles.negativeChange,
            ]}
          >
            {formatCurrency(data.currentBalance - data.startingBalance)}
          </Text>
          <Text style={styles.changePeriod}>this {timeRange}</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={width - 32}
          height={220}
          yAxisLabelSuffix="£"
          hideDataPoints
          curved
          color={colors.primary}
          thickness={2}
          startFillColor={`${colors.primary}33`}
          endFillColor="transparent"
          initialSpacing={16}
          endSpacing={16}
          onPress={handlePointPress}
          containerStyle={styles.chartContainer}
          formatXLabel={(label) => formatDateLabel(label)}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Money In</Text>
          <Text style={styles.statValue}>{formatCurrency(data.moneyIn)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Money Out</Text>
          <Text style={styles.statValue}>{formatCurrency(data.moneyOut)}</Text>
        </View>
      </View>

      {data.upcomingPayments.total > 0 && (
        <View style={styles.upcomingContainer}>
          <Text style={styles.upcomingTitle}>Upcoming Payments</Text>
          <Text style={styles.upcomingAmount}>{formatCurrency(data.upcomingPayments.total)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF4444', // Explicit error color
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  timeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    margin: 16,
    marginBottom: 24,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTimeButton: {
    backgroundColor: colors.primary,
  },
  timeButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTimeButtonText: {
    color: colors.text.inverse,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 4,
  },
  balance: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '600',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  positiveChange: {
    color: '#4CAF50', // Explicit success color
  },
  negativeChange: {
    color: '#F44336', // Explicit error color
  },
  changePeriod: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  chartContainer: {
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  upcomingContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upcomingTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  upcomingAmount: {
    color: '#F44336', // Explicit error color
    fontSize: 16,
    fontWeight: '600',
  },
});
