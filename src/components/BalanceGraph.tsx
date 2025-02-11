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
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(128, 128, 128, ${opacity * 0.2})`,
          labelColor: (opacity = 1) => `rgba(128, 128, 128, ${opacity})`,
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#fff',
            ...(Platform.OS === 'web'
              ? {
                  onResponderMove: undefined,
                  onResponderGrant: undefined,
                  onResponderRelease: undefined,
                }
              : {}),
          },
          propsForGrid: {
            strokeDasharray: '5, 5',
          },
          style: {
            borderRadius: 16,
          },
          propsForVerticalLabels: {
            ...(Platform.OS === 'web'
              ? {
                  onResponderMove: undefined,
                  onResponderGrant: undefined,
                  onResponderRelease: undefined,
                }
              : {}),
          },
          propsForHorizontalLabels: {
            ...(Platform.OS === 'web'
              ? {
                  onResponderMove: undefined,
                  onResponderGrant: undefined,
                  onResponderRelease: undefined,
                }
              : {}),
          },
        }}
        bezier
        style={styles.chart}
        withVerticalLines={true}
        withHorizontalLines={true}
        withDots={true}
        withShadow={false}
        withInnerLines={true}
        fromZero={false}
        formatYLabel={(value) => `£${parseInt(value).toLocaleString()}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
});
