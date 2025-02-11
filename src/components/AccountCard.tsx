import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { colors } from '../constants/theme';

interface AccountCardProps {
  name: string;
  balance: number;
  accountNumber?: string;
  sortCode?: string;
  color?: string;
  logo?: string;
  overdraftLimit?: number;
}

export default function AccountCard({
  name,
  balance,
  accountNumber,
  sortCode,
  color = colors.primary,
  logo,
  overdraftLimit,
}: AccountCardProps) {
  return (
    <Card style={[styles.card, { backgroundColor: color }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          {logo && <Image source={{ uri: logo }} style={styles.logo} />}
          <Text variant="titleMedium" style={styles.name}>
            {name}
          </Text>
        </View>

        <Text variant="headlineMedium" style={styles.balance}>
          {balance < 0 ? '-' : ''}£{Math.abs(balance).toFixed(2)}
        </Text>

        {accountNumber && sortCode && (
          <Text variant="bodySmall" style={styles.accountDetails}>
            {sortCode} • {accountNumber}
          </Text>
        )}

        {overdraftLimit && (
          <Text variant="bodySmall" style={styles.overdraft}>
            £{overdraftLimit.toFixed(0)} overdraft limit
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  name: {
    color: '#fff',
  },
  balance: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accountDetails: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  overdraft: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
});
