import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface SummaryCardProps {
  title: string;
  amount: number;
  isJoint?: boolean;
  isSpending?: boolean;
  sharedWith?: Array<{
    initial: string;
    color?: string;
  }>;
}

function SummaryCard({ title, amount, isJoint, isSpending, sharedWith }: SummaryCardProps) {
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  // Split amount into whole and decimal parts for alignment
  const [whole, decimal] = formattedAmount.split('.');

  return (
    <View style={styles.card}>
      {/* Bank icon */}
      <View style={styles.bankIcon}>
        <Ionicons
          name="business-outline"
          size={14}
          color={colors.text.secondary}
          style={styles.bankIconImage}
        />
      </View>

      {/* Amount with decimal alignment */}
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>
          {isSpending ? '-' : ''}
          {whole}
        </Text>
        <Text style={styles.amountDecimal}>.{decimal}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>

      {/* Shared indicators */}
      {(isJoint || sharedWith) && (
        <View style={styles.sharedIndicators}>
          <View style={[styles.indicator, styles.primaryIndicator]}>
            <Ionicons name="person" size={14} color={colors.text.primary} />
          </View>
          {sharedWith?.map((person, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                person.color ? { backgroundColor: person.color } : styles.secondaryIndicator,
              ]}
            >
              <Text style={styles.indicatorText}>{person.initial}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface SummaryCardsProps {
  personalBalance: number;
  jointBalance?: number;
  monthlySpend: number;
  sharedWith?: Array<{
    initial: string;
    color?: string;
  }>;
}

export default function SummaryCards({
  personalBalance,
  jointBalance,
  monthlySpend,
  sharedWith,
}: SummaryCardsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <SummaryCard title="Personal balance" amount={personalBalance} />

      {jointBalance !== undefined && (
        <SummaryCard title="Joint balance" amount={jointBalance} isJoint sharedWith={sharedWith} />
      )}

      <SummaryCard title="Spent this month" amount={monthlySpend} isSpending />
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = width * 0.75;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: cardWidth,
    minHeight: 120,
    position: 'relative',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -1,
  },
  amountDecimal: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text.primary,
    opacity: 0.8,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
    opacity: 0.8,
  },
  sharedIndicators: {
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryIndicator: {
    backgroundColor: colors.primary,
  },
  secondaryIndicator: {
    backgroundColor: '#FF6B6B',
  },
  indicatorText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  bankIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankIconImage: {
    opacity: 0.5,
  },
});
