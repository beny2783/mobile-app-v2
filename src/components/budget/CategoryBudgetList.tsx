import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { CategoryTarget, TargetPeriod } from '../../types/target';
import { formatPeriod, getTimeRemaining } from '../../utils/dateUtils';

interface CategoryBudgetListProps {
  categoryTargets: CategoryTarget[];
  onCategoryPress: (category: CategoryTarget) => void;
}

const getPeriodEndDate = (periodStart: string, period: TargetPeriod): Date => {
  console.log('[CategoryBudgetList] Calculating period end date for:', { periodStart, period });
  const start = new Date(periodStart);
  const end = (() => {
    switch (period) {
      case 'daily':
        return new Date(start.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(new Date(start).setMonth(start.getMonth() + 1));
      case 'yearly':
        return new Date(new Date(start).setFullYear(start.getFullYear() + 1));
    }
  })();
  console.log('[CategoryBudgetList] Calculated end date:', end);
  return end;
};

export const CategoryBudgetList: React.FC<CategoryBudgetListProps> = ({
  categoryTargets,
  onCategoryPress,
}) => {
  // Log when component receives new data
  React.useEffect(() => {
    console.log('[CategoryBudgetList] Received category targets:', categoryTargets);
  }, [categoryTargets]);

  const renderItem = ({ item }: ListRenderItemInfo<CategoryTarget>) => {
    console.log('[CategoryBudgetList] Rendering category:', item.category);
    const percentageUsed = (item.current_amount / item.target_limit) * 100;
    console.log('[CategoryBudgetList] Category usage:', {
      category: item.category,
      current: item.current_amount,
      target: item.target_limit,
      percentage: percentageUsed,
    });

    const progressColor =
      percentageUsed >= 100 ? colors.error : percentageUsed >= 80 ? colors.warning : colors.success;

    return (
      <TouchableOpacity style={styles.categoryCard} onPress={() => onCategoryPress(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryInfo}>
            <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
            <View style={styles.categoryTextContainer}>
              <Text style={styles.categoryName}>{item.category}</Text>
              <Text style={styles.subtext}>
                {formatPeriod(item.period)} budget •{' '}
                {getTimeRemaining(item.period_start, item.period)}
              </Text>
              <Text style={styles.subtext}>{percentageUsed.toFixed(1)}% of budget used</Text>
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>
              £{item.current_amount.toFixed(2)} / £{item.target_limit.toFixed(2)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(percentageUsed, 100)}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={categoryTargets}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No budget targets set</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to create your first budget target
          </Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    marginTop: 4,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
    marginRight: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
