import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { BankAccount } from '../repositories/balance';

interface BankCardProps {
  bankName: string;
  accounts: BankAccount[];
  onRefresh?: () => void;
  onDisconnect?: () => void;
  connectionId?: string;
}

export default function BankCard({
  bankName,
  accounts,
  onRefresh,
  onDisconnect,
  connectionId,
}: BankCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

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

    // Animate rotation and content
    Animated.parallel([
      Animated.spring(animation, {
        toValue,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.timing(contentOpacity, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  };

  const handleOptionsPress = () => {
    // Add touch feedback
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Disconnect Bank'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
          title: bankName,
          message: 'Choose an action',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Alert.alert('Disconnect Bank', `Are you sure you want to disconnect ${bankName}?`, [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Disconnect',
                style: 'destructive',
                onPress: onDisconnect,
              },
            ]);
          }
        }
      );
    });
  };

  const rotate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnimation }] }]}>
      <Card style={[styles.card, isExpanded && styles.cardExpanded]}>
        <TouchableOpacity onPress={toggleExpand} activeOpacity={0.9} style={styles.touchable}>
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
                <View style={styles.actions}>
                  <IconButton
                    icon={() => (
                      <Ionicons name="ellipsis-horizontal" size={24} color={colors.text.primary} />
                    )}
                    onPress={handleOptionsPress}
                  />
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <IconButton
                      icon={() => (
                        <Ionicons name="chevron-down" size={24} color={colors.text.primary} />
                      )}
                    />
                  </Animated.View>
                </View>
              </View>
            </View>

            {/* Expandable Account List */}
            <Animated.View
              style={[
                styles.accountsList,
                {
                  opacity: contentOpacity,
                  transform: [
                    {
                      translateY: contentOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {isExpanded &&
                accounts.map((account) => (
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
            </Animated.View>
          </Card.Content>
        </TouchableOpacity>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    margin: 16,
  },
  card: {
    elevation: 4,
    backgroundColor: colors.surface,
    transform: [{ scale: 1 }],
  },
  cardExpanded: {
    transform: [{ scale: 1.02 }],
  },
  touchable: {
    overflow: 'hidden',
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
