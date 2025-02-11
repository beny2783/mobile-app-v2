import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../services/supabase';
import { colors } from '../constants/theme';

const screenWidth = Dimensions.get('window').width;

export default function BalanceGraph() {
  const [selectedRange, setSelectedRange] = useState<7 | 30 | 90>(7);
  const [balanceData, setBalanceData] = useState<{
    labels: string[];
    datasets: { data: number[] }[];
  }>({
    labels: [],
    datasets: [{ data: [] }],
  });

  const renderDateFilters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      {[7, 30, 90].map((days) => (
        <TouchableOpacity
          key={days}
          style={[styles.filterButton, selectedRange === days && styles.filterButtonActive]}
          onPress={() => setSelectedRange(days)}
        >
          <Text style={[styles.filterText, selectedRange === days && styles.filterTextActive]}>
            {days} Days
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const fetchBalanceHistory = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, timestamp')
      .gte('timestamp', new Date(Date.now() - selectedRange * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Failed to fetch balance history:', error);
      return;
    }

    // Calculate running balance
    let balance = 0;
    const balances = data.map((t) => {
      balance += t.amount;
      return {
        balance,
        date: new Date(t.timestamp).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        }),
      };
    });

    // Group by date for daily balances
    const dailyBalances = balances.reduce((acc, curr) => {
      acc[curr.date] = curr.balance;
      return acc;
    }, {});

    setBalanceData({
      labels: Object.keys(dailyBalances).slice(-7),
      datasets: [
        {
          data: Object.values(dailyBalances).slice(-7),
          color: (opacity = 1) => `rgba(37, 157, 101, ${opacity})`, // Green color
          strokeWidth: 2,
        },
      ],
    });
  };

  useEffect(() => {
    fetchBalanceHistory();
  }, [selectedRange]);

  return (
    <View style={styles.container}>
      {renderDateFilters()}
      <LineChart
        data={balanceData}
        width={screenWidth - 40}
        height={220}
        yAxisLabel="£"
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(81, 207, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: colors.surface,
          },
          formatYLabel: (value) => `£${Math.round(Number(value) / 1000)}k`,
        }}
        bezier
        style={styles.chart}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withDots={true}
        withInnerLines={true}
        withOuterLines={false}
      />
      <View style={styles.estimates}>
        <View style={styles.estimateItem}>
          <View style={styles.dot} />
          <View>
            <Text style={styles.estimateValue}>£32K</Text>
            <Text style={styles.estimateValue}>£29K</Text>
            <Text style={styles.estimateLabel}>EST</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 20,
    backgroundColor: colors.surface,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  estimates: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  estimateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginRight: 8,
  },
  estimateValue: {
    color: colors.text.primary,
    marginBottom: 4,
  },
  estimateLabel: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
