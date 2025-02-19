import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { CategoryTarget, TargetPeriod } from '../../types/target';
import { LineChart } from 'react-native-chart-kit';
import { useTransactions } from '../../hooks/useTransactions';
import { formatPeriod, getTimeRemaining } from '../../utils/dateUtils';

const { width } = Dimensions.get('window');

interface CategoryDetailModalProps {
  isVisible: boolean;
  category: CategoryTarget;
  onClose: () => void;
  onUpdate: (category: string, updates: Partial<CategoryTarget>) => Promise<void>;
  onDelete: (category: string) => Promise<void>;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  isVisible,
  category,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const { transactions } = useTransactions();
  const [isEditing, setIsEditing] = useState(false);
  const [targetLimit, setTargetLimit] = useState(category.target_limit.toString());
  const [period, setPeriod] = useState<TargetPeriod>(category.period);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const periodOptions: { label: string; value: TargetPeriod }[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
  ];

  // Get spending data for the chart based on period
  const getChartData = () => {
    const periodStart = new Date(category.period_start);
    const now = new Date();
    const labels: string[] = [];
    const data: number[] = [];

    switch (category.period) {
      case 'daily':
        // Show hourly data for the current day
        for (let i = 0; i < 24; i++) {
          const hour = periodStart.getHours() + i;
          labels.push(`${hour % 24}:00`);
          const hourlySpending = transactions
            .filter(
              (t) =>
                t.transaction_category === category.category &&
                new Date(t.timestamp).getHours() === hour &&
                new Date(t.timestamp).toDateString() === periodStart.toDateString()
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
          data.push(hourlySpending);
        }
        break;

      case 'weekly':
        // Show daily data for the week
        for (let i = 0; i < 7; i++) {
          const date = new Date(periodStart);
          date.setDate(date.getDate() + i);
          labels.push(date.toLocaleDateString('en-GB', { weekday: 'short' }));
          const dailySpending = transactions
            .filter(
              (t) =>
                t.transaction_category === category.category &&
                new Date(t.timestamp).toDateString() === date.toDateString()
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
          data.push(dailySpending);
        }
        break;

      case 'monthly':
        // Show weekly data for the month
        const weeksInMonth = Math.ceil(
          (now.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        for (let i = 0; i < Math.min(weeksInMonth, 4); i++) {
          const weekStart = new Date(periodStart);
          weekStart.setDate(weekStart.getDate() + i * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          labels.push(`Week ${i + 1}`);
          const weeklySpending = transactions
            .filter(
              (t) =>
                t.transaction_category === category.category &&
                new Date(t.timestamp) >= weekStart &&
                new Date(t.timestamp) <= weekEnd
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
          data.push(weeklySpending);
        }
        break;

      case 'yearly':
        // Show monthly data for the year
        for (let i = 0; i < 12; i++) {
          const date = new Date(periodStart);
          date.setMonth(date.getMonth() + i);
          labels.push(date.toLocaleDateString('en-GB', { month: 'short' }));
          const monthlySpending = transactions
            .filter(
              (t) =>
                t.transaction_category === category.category &&
                new Date(t.timestamp).getMonth() === date.getMonth() &&
                new Date(t.timestamp).getFullYear() === date.getFullYear()
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
          data.push(monthlySpending);
        }
        break;
    }

    return {
      labels,
      datasets: [{ data }],
    };
  };

  const handleUpdate = async () => {
    const target = parseFloat(targetLimit);

    if (isNaN(target) || target <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(category.category, {
        target_limit: target,
        period,
        period_start: new Date().toISOString(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update budget target:', error);
      Alert.alert('Error', 'Failed to update budget target. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Budget Target',
      `Are you sure you want to delete the budget target for ${category.category}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(category.category);
            } catch (error) {
              console.error('Failed to delete budget target:', error);
              Alert.alert('Error', 'Failed to delete budget target. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Text style={styles.title}>{category.category}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Ionicons
                  name={isEditing ? 'close' : 'pencil'}
                  size={24}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content}>
            {/* Current Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Status</Text>
              <View style={styles.statusCard}>
                <Text style={styles.amount}>
                  £{category.current_amount.toFixed(2)} / £{category.target_limit.toFixed(2)}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(
                          (category.current_amount / category.target_limit) * 100,
                          100
                        )}%`,
                        backgroundColor:
                          category.current_amount >= category.target_limit
                            ? colors.error
                            : colors.success,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.statusText}>
                  {((category.current_amount / category.target_limit) * 100).toFixed(1)}% of{' '}
                  {formatPeriod(category.period).toLowerCase()} budget used
                </Text>
                <Text style={styles.periodText}>
                  {getTimeRemaining(category.period_start, category.period)}
                </Text>
              </View>
            </View>

            {/* Spending Trend */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spending Trend</Text>
              <LineChart
                data={getChartData()}
                width={width - 48}
                height={220}
                chartConfig={{
                  backgroundColor: colors.background,
                  backgroundGradientFrom: colors.background,
                  backgroundGradientTo: colors.background,
                  decimalPlaces: 2,
                  color: (opacity = 1) => `rgba(46, 196, 182, ${opacity})`,
                  labelColor: (opacity = 1) => colors.text.primary,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: colors.primary,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>

            {/* Budget Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Budget Settings</Text>
              {isEditing ? (
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Period</Text>
                    <View style={styles.periodContainer}>
                      {periodOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.periodOption,
                            period === option.value && styles.selectedPeriodOption,
                          ]}
                          onPress={() => setPeriod(option.value)}
                        >
                          <Text
                            style={[
                              styles.periodText,
                              period === option.value && styles.selectedPeriodText,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Target Amount (£)</Text>
                    <TextInput
                      style={styles.input}
                      value={targetLimit}
                      onChangeText={setTargetLimit}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.text.secondary}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleUpdate}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSubmitting ? 'Updating...' : 'Update Budget'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.settingsInfo}>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Period:</Text>
                    <Text style={styles.settingValue}>
                      {periodOptions.find((opt) => opt.value === category.period)?.label}
                    </Text>
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Target Amount:</Text>
                    <Text style={styles.settingValue}>£{category.target_limit.toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsInfo: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  periodOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPeriodOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  selectedPeriodText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
