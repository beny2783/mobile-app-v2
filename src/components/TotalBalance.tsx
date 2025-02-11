import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../constants/theme';
import { TrueLayerService } from '../services/trueLayer';

export default function TotalBalance() {
  const [balanceData, setBalanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const trueLayer = new TrueLayerService({
          clientId: TRUELAYER.CLIENT_ID,
          redirectUri: TRUELAYER.REDIRECT_URI,
        });

        const data = await trueLayer.getBalances();
        setBalanceData(data);
      } catch (error) {
        console.error('Failed to fetch balance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <ActivityIndicator />;
  }

  // Calculate totals
  const totalBalance = balanceData?.balances.reduce((sum: number, b: any) => sum + b.current, 0);

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.label}>
        This month
      </Text>
      <Text variant="displayLarge" style={styles.balance}>
        £{totalBalance?.toFixed(2)}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Today's Balance
      </Text>

      <View style={styles.breakdown}>
        <View style={styles.breakdownItem}>
          <Text variant="titleMedium" style={styles.breakdownLabel}>
            Starting balance
          </Text>
          <Text variant="titleLarge" style={styles.positiveAmount}>
            +£31,322.73
          </Text>
          <Text variant="bodySmall" style={styles.dateLabel}>
            On 1st Feb
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text variant="titleMedium" style={styles.breakdownLabel}>
            Total money in
          </Text>
          <Text variant="titleLarge" style={styles.positiveAmount}>
            +£450.00
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.text.primary,
    marginBottom: 8,
  },
  balance: {
    color: colors.text.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: 24,
  },
  breakdown: {
    marginTop: 20,
  },
  breakdownItem: {
    marginBottom: 20,
  },
  breakdownLabel: {
    color: colors.text.primary,
    marginBottom: 4,
  },
  positiveAmount: {
    color: colors.success,
    marginBottom: 4,
  },
  dateLabel: {
    color: colors.text.secondary,
  },
});
