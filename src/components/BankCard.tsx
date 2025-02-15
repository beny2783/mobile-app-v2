import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { BankAccount } from '../repositories/balance';

interface BankCardProps {
  bankName: string;
  accounts: BankAccount[];
  onRefresh?: () => void;
}

export default function BankCard({ bankName, accounts, onRefresh }: BankCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  const currency = accounts[0]?.currency || 'GBP';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const rotate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7}>
        <Card.Content>
          {/* Bank Header */}
          <View style={styles.header}>
            <View style={styles.bankInfo}>
              <Text variant="titleLarge" style={styles.bankName}>
                {bankName}
              </Text>
              <Text variant="bodySmall" style={styles.accountCount}>
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text variant="titleLarge" style={styles.totalBalance}>
                {formatCurrency(totalBalance)}
              </Text>
              <Animated.View style={{ transform: [{ rotate }] }}>
                <IconButton
                  icon={() => (
                    <Ionicons name="chevron-down" size={24} color={colors.text.primary} />
                  )}
                />
              </Animated.View>
            </View>
          </View>

          {/* Expandable Account List */}
          {isExpanded && (
            <View style={styles.accountsList}>
              {accounts.map((account) => (
                <View key={account.id} style={styles.accountItem}>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountInfo}>
                      <Text variant="titleMedium" style={styles.accountName}>
                        {account.account_name}
                      </Text>
                      <Text variant="bodySmall" style={styles.accountType}>
                        {account.account_type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.balanceContainer}>
                    <View style={styles.balanceItem}>
                      <Text variant="bodySmall" style={styles.balanceLabel}>
                        Balance
                      </Text>
                      <Text variant="titleMedium" style={styles.balance}>
                        {formatCurrency(account.balance || 0)}
                      </Text>
                    </View>
                  </View>

                  <Text variant="bodySmall" style={styles.updated}>
                    Last updated: {new Date(account.last_updated).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  accountCount: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalBalance: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  accountsList: {
    marginTop: 16,
  },
  accountItem: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  accountType: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 16,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    color: colors.text.secondary,
    marginBottom: 4,
  },
  balance: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  updated: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
