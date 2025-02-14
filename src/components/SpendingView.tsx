import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from '../utils/categoryUtils';
import { colors } from '../constants/theme';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SpendingViewProps {
  data: SpendingAnalysis;
}

export const SpendingView: React.FC<SpendingViewProps> = ({ data }) => {
  return (
    <View style={styles.container}>
      {/* Monthly Overview */}
      <View style={styles.header}>
        <Text style={styles.title}>This month</Text>
        <Text style={styles.amount}>£{data.total.toFixed(2)}</Text>
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonText}>
            {data.monthlyComparison.percentageChange >= 0 ? '+' : ''}
            {data.monthlyComparison.percentageChange.toFixed(1)}% vs last month
          </Text>
          <Ionicons
            name={data.monthlyComparison.percentageChange >= 0 ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={data.monthlyComparison.percentageChange >= 0 ? '#F44336' : '#4CAF50'}
          />
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.chartWrapper}>
        <PieChart
          data={data.categories.map((category) => ({
            name: category.name,
            amount: category.amount,
            color: category.color,
            legendFontColor: '#FFF',
            legendFontSize: 12,
          }))}
          width={width - 32}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Category List */}
      <View style={styles.categoryList}>
        {data.categories.map((category, index) => (
          <View key={index} style={styles.categoryItem}>
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>
            <Text style={styles.categoryAmount}>£{category.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Insights */}
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Spending Insights</Text>
        {data.insights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <View style={styles.insightIconContainer}>
              <Ionicons
                name={
                  insight.type === 'decrease'
                    ? 'trending-down'
                    : insight.type === 'increase'
                      ? 'trending-up'
                      : 'alert-circle'
                }
                size={24}
                color={
                  insight.type === 'decrease'
                    ? '#4CAF50'
                    : insight.type === 'increase'
                      ? '#F44336'
                      : '#FFC107'
                }
              />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.description}</Text>
              {insight.amount && (
                <Text style={styles.insightDetails}>£{insight.amount.toFixed(2)}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
  },
  amount: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comparisonText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  chartWrapper: {
    marginBottom: 16,
  },
  categoryList: {
    marginTop: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    color: '#FFF',
    fontSize: 16,
  },
  categoryAmount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  insightsContainer: {
    marginTop: 32,
  },
  insightsTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  insightDetails: {
    color: colors.text.secondary,
    fontSize: 14,
  },
});
