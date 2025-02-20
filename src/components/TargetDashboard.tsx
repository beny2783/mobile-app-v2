import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useBudget } from '../store/slices/budget/hooks';
import { TargetType, TargetPeriod } from '../types/target';
import { Card } from './Card';
import { colors } from '../theme';

export const TargetDashboard: React.FC = () => {
  const { categoryTargets, targetSummary, loading, error } = useBudget();

  const [isAddingTarget, setIsAddingTarget] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Summary Section */}
      {targetSummary && (
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Monthly Overview</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Spending Limit</Text>
              <Text style={styles.summaryValue}>
                £{targetSummary.monthlySpendingLimit.toFixed(2)}
              </Text>
              <Text style={styles.summaryProgress}>
                {(
                  (targetSummary.currentSpending / targetSummary.monthlySpendingLimit) *
                  100
                ).toFixed(1)}
                %
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Savings Goal</Text>
              <Text style={styles.summaryValue}>£{targetSummary.savingsGoal.toFixed(2)}</Text>
              <Text style={styles.summaryProgress}>
                {((targetSummary.currentSavings / targetSummary.savingsGoal) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Category Targets Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Targets</Text>
        {categoryTargets.map((target) => (
          <Card key={target.id} style={styles.targetCard}>
            <View style={styles.targetHeader}>
              <Text style={styles.targetCategory}>{target.category}</Text>
              <Text style={styles.targetAmount}>
                £{target.current_amount.toFixed(2)} / £{target.target_limit.toFixed(2)}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min((target.current_amount / target.target_limit) * 100, 100)}%`,
                    backgroundColor: target.color,
                  },
                ]}
              />
            </View>
          </Card>
        ))}
      </View>

      {/* Active Targets Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Targets</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsAddingTarget(true)}>
            <Text style={styles.addButtonText}>+ Add Target</Text>
          </TouchableOpacity>
        </View>
        {targets.map((target) => (
          <Card key={target.id} style={styles.targetCard}>
            <View style={styles.targetHeader}>
              <Text style={styles.targetType}>{target.type}</Text>
              <TouchableOpacity onPress={() => deleteTarget(target.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.targetAmount}>
              £{target.current_amount.toFixed(2)} / £{target.amount.toFixed(2)}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min((target.current_amount / target.amount) * 100, 100)}%`,
                    backgroundColor: target.type === 'saving' ? colors.success : colors.warning,
                  },
                ]}
              />
            </View>
            <Text style={styles.targetPeriod}>
              {target.period} • {new Date(target.end_date).toLocaleDateString()}
            </Text>
          </Card>
        ))}
      </View>

      {/* Recent Achievements Section */}
      {targetSummary?.achievements && targetSummary.achievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          {targetSummary.achievements.map((achievement, index) => (
            <Card
              key={index}
              style={[styles.achievementCard, { borderLeftColor: achievement.color }]}
            >
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementDescription}>{achievement.description}</Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryProgress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  targetCard: {
    marginBottom: 12,
    padding: 16,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetType: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  targetAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 20,
    color: colors.error,
    fontWeight: 'bold',
  },
  achievementCard: {
    marginBottom: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
