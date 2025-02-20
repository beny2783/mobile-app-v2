import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { LineChart } from 'react-native-chart-kit';
import Slider from '@react-native-community/slider';
import { useBudget } from '../store/slices/budget/hooks';
import { CategoryTarget } from '../types/target';

const { width } = Dimensions.get('window');

export const TargetView: React.FC = () => {
  const {
    categoryTargets,
    targetSummary,
    loading,
    error,
    createTarget,
    updateTarget,
    deleteTarget,
  } = useBudget();

  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [selectedPoint, setSelectedPoint] = useState<{
    value: number;
    target: number;
    date: string;
    index: number;
  } | null>(null);
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newTarget, setNewTarget] = useState({
    category: '',
    target_limit: 200,
    min_limit: 0,
    max_limit: 1000,
    color: '#4CAF50',
  });

  const formatAmount = (amount: number) => `£${amount.toFixed(2)}`;
  const calculateProgress = (current: number, target: number) => (current / target) * 100;

  const handleDataPointClick = (value: number, index: number) => {
    if (!targetSummary) return;

    const target = targetSummary.trendData.target[index];
    setSelectedPoint({
      value,
      target,
      date: targetSummary.trendData.labels[index],
      index,
    });
  };

  const handleTargetChange = async (category: string, newLimit: number): Promise<void> => {
    try {
      await updateTarget(category, { target_limit: Math.round(newLimit) });
    } catch (err) {
      console.error('Failed to update category target:', err);
    }
  };

  const handleCreateTarget = async () => {
    try {
      await createTarget({
        category: newTarget.category,
        target_limit: newTarget.target_limit,
        min_limit: newTarget.min_limit,
        max_limit: newTarget.max_limit,
        color: newTarget.color,
        current_amount: 0,
      });
      setIsCreateModalVisible(false);
      setNewTarget({
        category: '',
        target_limit: 200,
        min_limit: 0,
        max_limit: 1000,
        color: '#4CAF50',
      });
    } catch (err) {
      console.error('Failed to create category target:', err);
    }
  };

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

  if (!targetSummary) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No target data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Time Range Selector */}
      <View style={styles.timeSelector}>
        <TouchableOpacity
          style={[styles.timeButton, timeRange === 'week' && styles.activeTimeButton]}
          onPress={() => setTimeRange('week')}
        >
          <Text
            style={[styles.timeButtonText, timeRange === 'week' && styles.activeTimeButtonText]}
          >
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeButton, timeRange === 'month' && styles.activeTimeButton]}
          onPress={() => setTimeRange('month')}
        >
          <Text
            style={[styles.timeButtonText, timeRange === 'month' && styles.activeTimeButtonText]}
          >
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overall Progress */}
      <View style={styles.overallProgress}>
        <Text style={styles.sectionTitle}>Overall Progress</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {selectedPoint ? `Spending on ${selectedPoint.date}` : 'Spending Limit'}
            </Text>
            <Text style={styles.progressAmount}>
              {selectedPoint
                ? `${formatAmount(selectedPoint.value)} / ${formatAmount(selectedPoint.target)}`
                : `${formatAmount(targetSummary.currentSpending)} / ${formatAmount(targetSummary.monthlySpendingLimit)}`}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${
                    selectedPoint
                      ? calculateProgress(selectedPoint.value, selectedPoint.target)
                      : calculateProgress(
                          targetSummary.currentSpending,
                          targetSummary.monthlySpendingLimit
                        )
                  }%`,
                  backgroundColor: selectedPoint
                    ? selectedPoint.value > selectedPoint.target
                      ? '#F44336'
                      : '#4CAF50'
                    : targetSummary.currentSpending > targetSummary.monthlySpendingLimit
                      ? '#F44336'
                      : '#4CAF50',
                },
              ]}
            />
          </View>
          <Text style={styles.progressSubtext}>
            {selectedPoint
              ? `${formatAmount(Math.abs(selectedPoint.target - selectedPoint.value))} ${
                  selectedPoint.value > selectedPoint.target ? 'over' : 'under'
                } target`
              : `${formatAmount(targetSummary.monthlySpendingLimit - targetSummary.currentSpending)} remaining`}
          </Text>
        </View>
      </View>

      {/* Spending Trend */}
      <View style={styles.trendSection}>
        <Text style={styles.sectionTitle}>Spending Trend</Text>
        <View style={styles.chartWrapper}>
          <LineChart
            data={{
              labels: targetSummary.trendData.labels,
              datasets: [
                {
                  data: targetSummary.trendData.spending,
                  color: (opacity = 1) => `rgba(46, 196, 182, ${opacity})`,
                  strokeWidth: 2,
                },
                {
                  data: targetSummary.trendData.target,
                  color: (opacity = 1) => `rgba(244, 67, 54, ${opacity * 0.5})`,
                  strokeWidth: 1,
                  strokeDashArray: [5, 5],
                },
              ],
            }}
            width={width - 32}
            height={180}
            chartConfig={{
              backgroundColor: '#0A1A2F',
              backgroundGradientFrom: '#0A1A2F',
              backgroundGradientTo: '#0A1A2F',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: selectedPoint ? '4' : '6',
                strokeWidth: '2',
                stroke: '#2EC4B6',
                fill: '#0A1A2F',
              },
              propsForLabels: {
                fontSize: 10,
              },
            }}
            bezier
            style={styles.chart}
            onDataPointClick={({ value, dataset, getColor, index }) => {
              handleDataPointClick(value, index);
            }}
          />
          {selectedPoint && (
            <View
              style={[
                styles.tooltip,
                {
                  left:
                    (width - 32) *
                      (selectedPoint.index / (targetSummary.trendData.labels.length - 1)) -
                    40,
                  backgroundColor:
                    selectedPoint.value > selectedPoint.target
                      ? 'rgba(244, 67, 54, 0.9)'
                      : 'rgba(76, 175, 80, 0.9)',
                },
              ]}
            >
              <Text style={styles.tooltipText}>{formatAmount(selectedPoint.value)}</Text>
              <Text style={styles.tooltipDate}>{selectedPoint.date}</Text>
              <Text style={styles.tooltipTarget}>Target: {formatAmount(selectedPoint.target)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Category Targets */}
      <View style={styles.categoryTargets}>
        <View style={styles.categoryHeader}>
          <Text style={styles.sectionTitle}>Category Targets</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsCreateModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        {categoryTargets.map((target: CategoryTarget) => (
          <View key={target.id} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() =>
                setEditingTarget(editingTarget === target.category ? null : target.category)
              }
            >
              <View style={styles.categoryTitleContainer}>
                <View style={[styles.categoryDot, { backgroundColor: target.color }]} />
                <View>
                  <Text style={styles.categoryTitle}>{target.category}</Text>
                  <Text style={styles.categorySubtext}>
                    {calculateProgress(target.current_amount, target.target_limit).toFixed(0)}% of
                    limit used
                  </Text>
                </View>
              </View>
              <View style={styles.categoryAmountContainer}>
                <Text style={styles.categoryAmount}>
                  {formatAmount(target.current_amount)} / {formatAmount(target.target_limit)}
                </Text>
                <Ionicons
                  name={editingTarget === target.category ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#FFF"
                />
              </View>
            </TouchableOpacity>

            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${calculateProgress(target.current_amount, target.target_limit)}%`,
                    backgroundColor: target.color,
                  },
                ]}
              />
            </View>

            {editingTarget === target.category && (
              <View style={styles.sliderContainer}>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>{formatAmount(0)}</Text>
                  <Text style={styles.sliderLabel}>{formatAmount(target.target_limit * 2)}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={target.target_limit * 2}
                  value={target.target_limit}
                  onValueChange={(value) => handleTargetChange(target.category, value)}
                  minimumTrackTintColor={target.color}
                  maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
                  thumbTintColor={target.color}
                />
                <View style={styles.sliderHint}>
                  <Text style={styles.sliderHintText}>
                    Drag to adjust target • {formatAmount(target.target_limit)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Achievements */}
      {targetSummary.achievements && targetSummary.achievements.length > 0 && (
        <View style={styles.achievements}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <View style={styles.achievementsList}>
            {targetSummary.achievements.map(
              (
                achievement: {
                  category: string;
                  percentage: number;
                  color: string;
                  icon: string;
                  title: string;
                  description: string;
                },
                index: number
              ) => (
                <View key={index} style={styles.achievementCard}>
                  <View
                    style={[styles.achievementIcon, { backgroundColor: `${achievement.color}33` }]}
                  >
                    <Ionicons name={achievement.icon as any} size={24} color={achievement.color} />
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  </View>
                </View>
              )
            )}
          </View>
        </View>
      )}

      {/* Create Target Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCreateModalVisible}
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Target</Text>
            <TextInput
              style={styles.input}
              placeholder="Category Name"
              placeholderTextColor="#666"
              value={newTarget.category}
              onChangeText={(text) => setNewTarget({ ...newTarget, category: text })}
            />
            <View style={styles.sliderContainer}>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>{formatAmount(newTarget.min_limit)}</Text>
                <Text style={styles.sliderLabel}>{formatAmount(newTarget.max_limit)}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={newTarget.min_limit}
                maximumValue={newTarget.max_limit}
                value={newTarget.target_limit}
                onValueChange={(value) =>
                  setNewTarget({ ...newTarget, target_limit: Math.round(value) })
                }
                minimumTrackTintColor={newTarget.color}
                maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
                thumbTintColor={newTarget.color}
              />
              <Text style={styles.sliderHintText}>
                Target Amount: {formatAmount(newTarget.target_limit)}
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsCreateModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateTarget}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 4,
    margin: 16,
    marginBottom: 8,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTimeButton: {
    backgroundColor: '#FFF',
  },
  timeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTimeButtonText: {
    color: '#0A1A2F',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  overallProgress: {
    padding: 16,
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  progressAmount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtext: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 8,
  },
  trendSection: {
    padding: 16,
  },
  chartWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  categoryTargets: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  categoryAmountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  categoryTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmount: {
    color: '#FFF',
    fontSize: 14,
  },
  categorySubtext: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  achievements: {
    padding: 16,
    paddingBottom: 32,
  },
  achievementsList: {
    gap: 8,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  achievementDescription: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  tooltip: {
    position: 'absolute',
    top: 20,
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipDate: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
    textAlign: 'center',
  },
  tooltipTarget: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
    textAlign: 'center',
  },
  sliderContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sliderLabel: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderHint: {
    alignItems: 'center',
    marginTop: 4,
  },
  sliderHintText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
