import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { LineChart } from 'react-native-chart-kit';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');

// Mock data
const mockTargets = {
  monthlySpendingLimit: 2000,
  currentSpending: 1450,
  savingsGoal: 500,
  currentSavings: 350,
  categoryTargets: [
    { category: 'Groceries', limit: 400, current: 320, color: '#00BCD4', min: 200, max: 800 },
    { category: 'Entertainment', limit: 200, current: 180, color: '#9C27B0', min: 100, max: 500 },
    { category: 'Transport', limit: 150, current: 145, color: '#2196F3', min: 50, max: 300 },
    { category: 'Shopping', limit: 300, current: 280, color: '#4CAF50', min: 100, max: 600 },
  ],
  trendData: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    spending: [100, 220, 150, 280, 190, 250, 260],
    target: [200, 200, 200, 200, 200, 200, 200],
  },
  achievements: [
    { title: 'Under Budget', description: '3 weeks in a row', icon: 'trophy', color: '#FFD700' },
    { title: 'Smart Saver', description: 'Saved £150 this week', icon: 'star', color: '#4CAF50' },
    {
      title: 'On Track',
      description: 'All category targets met',
      icon: 'checkmark-circle',
      color: '#2196F3',
    },
  ],
};

interface CategoryTarget {
  category: string;
  limit: number;
  current: number;
  color: string;
  min: number;
  max: number;
}

export const TargetView: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [selectedPoint, setSelectedPoint] = useState<{
    value: number;
    target: number;
    date: string;
    index: number;
  } | null>(null);
  const [categoryTargets, setCategoryTargets] = useState(mockTargets.categoryTargets);
  const [editingTarget, setEditingTarget] = useState<string | null>(null);

  const formatAmount = (amount: number) => `£${amount.toFixed(2)}`;
  const calculateProgress = (current: number, target: number) => (current / target) * 100;

  const handleDataPointClick = (value: number, index: number) => {
    const target = mockTargets.trendData.target[index];
    setSelectedPoint({
      value,
      target,
      date: mockTargets.trendData.labels[index],
      index,
    });
  };

  const handleTargetChange = (category: string, newLimit: number): void => {
    setCategoryTargets((prev) =>
      prev.map((target) =>
        target.category === category ? { ...target, limit: Math.round(newLimit) } : target
      )
    );
  };

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
                : `${formatAmount(mockTargets.currentSpending)} / ${formatAmount(mockTargets.monthlySpendingLimit)}`}
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
                          mockTargets.currentSpending,
                          mockTargets.monthlySpendingLimit
                        )
                  }%`,
                  backgroundColor: selectedPoint
                    ? selectedPoint.value > selectedPoint.target
                      ? '#F44336'
                      : '#4CAF50'
                    : mockTargets.currentSpending > mockTargets.monthlySpendingLimit
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
              : `${formatAmount(mockTargets.monthlySpendingLimit - mockTargets.currentSpending)} remaining`}
          </Text>
        </View>
      </View>

      {/* Spending Trend */}
      <View style={styles.trendSection}>
        <Text style={styles.sectionTitle}>Spending Trend</Text>
        <View style={styles.chartWrapper}>
          <LineChart
            data={{
              labels: mockTargets.trendData.labels,
              datasets: [
                {
                  data: mockTargets.trendData.spending,
                  color: (opacity = 1) => `rgba(46, 196, 182, ${opacity})`,
                  strokeWidth: 2,
                },
                {
                  data: mockTargets.trendData.target,
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
                      (selectedPoint.index / (mockTargets.trendData.labels.length - 1)) -
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
        <Text style={styles.sectionTitle}>Category Targets</Text>
        {categoryTargets.map((target, index) => (
          <View key={index} style={styles.categoryCard}>
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
                    {calculateProgress(target.current, target.limit).toFixed(0)}% of limit used
                  </Text>
                </View>
              </View>
              <View style={styles.categoryAmountContainer}>
                <Text style={styles.categoryAmount}>
                  {formatAmount(target.current)} / {formatAmount(target.limit)}
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
                    width: `${calculateProgress(target.current, target.limit)}%`,
                    backgroundColor: target.color,
                  },
                ]}
              />
            </View>

            {editingTarget === target.category && (
              <View style={styles.sliderContainer}>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>{formatAmount(target.min)}</Text>
                  <Text style={styles.sliderLabel}>{formatAmount(target.max)}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={target.min}
                  maximumValue={target.max}
                  value={target.limit}
                  onValueChange={(value) => handleTargetChange(target.category, value)}
                  minimumTrackTintColor={target.color}
                  maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
                  thumbTintColor={target.color}
                />
                <View style={styles.sliderHint}>
                  <Text style={styles.sliderHintText}>
                    Drag to adjust target • {formatAmount(target.limit)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Achievements */}
      <View style={styles.achievements}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <View style={styles.achievementsList}>
          {mockTargets.achievements.map((achievement, index) => (
            <View key={index} style={styles.achievementCard}>
              <View style={[styles.achievementIcon, { backgroundColor: `${achievement.color}33` }]}>
                <Ionicons name={achievement.icon as any} size={24} color={achievement.color} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
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
    alignItems: 'flex-start',
    marginBottom: 8,
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
});
