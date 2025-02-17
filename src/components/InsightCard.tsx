import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { AIInsight } from '../types/insights';

interface InsightCardProps {
  insight: AIInsight;
  onCategoryPress?: (category: string) => void;
}

const getInsightColor = (type: AIInsight['type']): string => {
  switch (type) {
    case 'saving_opportunity':
      return 'rgba(46, 213, 115, 0.15)';
    case 'anomaly':
      return 'rgba(255, 71, 87, 0.15)';
    case 'forecast':
      return 'rgba(54, 123, 245, 0.15)';
    case 'spending_pattern':
    default:
      return 'rgba(255, 255, 255, 0.05)';
  }
};

const renderInsightIcon = (type: AIInsight['type']) => {
  let iconName: keyof typeof Ionicons.glyphMap = 'analytics';
  let color = colors.text.secondary;

  switch (type) {
    case 'saving_opportunity':
      iconName = 'leaf';
      color = '#2ED573';
      break;
    case 'anomaly':
      iconName = 'warning';
      color = '#FF4757';
      break;
    case 'forecast':
      iconName = 'trending-up';
      color = '#367BF5';
      break;
    case 'spending_pattern':
      iconName = 'pie-chart';
      color = colors.text.secondary;
      break;
  }

  return <Ionicons name={iconName} size={24} color={color} />;
};

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onCategoryPress }) => {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: getInsightColor(insight.type) }]}
      onPress={() => {
        if (insight.category && onCategoryPress) {
          onCategoryPress(insight.category);
        }
      }}
      disabled={!insight.category || !onCategoryPress}
    >
      <View style={styles.iconContainer}>{renderInsightIcon(insight.type)}</View>
      <View style={styles.content}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.description}>{insight.description}</Text>
        {insight.impact > 0 && (
          <Text style={styles.impact}>Potential impact: £{insight.impact.toFixed(2)}</Text>
        )}
        {insight.action && (
          <View style={styles.actionContainer}>
            <Ionicons name="arrow-forward-circle" size={16} color={colors.primary} />
            <Text style={styles.actionText}>{insight.action.description}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 8,
  },
  impact: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  actionText: {
    color: colors.primary,
    fontSize: 14,
    flex: 1,
  },
});
