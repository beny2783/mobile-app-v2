import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from '../utils/categoryUtils';
import { colors } from '../constants/theme';

const { width } = Dimensions.get('window');

interface SpendingViewProps {
  data: SpendingAnalysis;
}

interface Transaction {
  id: number;
  amount: number;
  date: string;
  merchant: string;
}

export const SpendingView: React.FC<SpendingViewProps> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('month');
  const [selectedPieSection, setSelectedPieSection] = useState<number | null>(null);

  // Animation values
  const categoryDetailsHeight = useRef(new Animated.Value(0)).current;
  const categoryDetailsFade = useRef(new Animated.Value(0)).current;

  const handleCategoryPress = (category: string) => {
    const isDeselecting = selectedCategory === category;

    // Animate the details section
    Animated.parallel([
      Animated.timing(categoryDetailsHeight, {
        toValue: isDeselecting ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(categoryDetailsFade, {
        toValue: isDeselecting ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

    setSelectedCategory(isDeselecting ? null : category);
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return { name: 'trending-up' as const, color: '#F44336' };
    if (change < 0) return { name: 'trending-down' as const, color: '#4CAF50' };
    return { name: 'remove' as const, color: '#9E9E9E' };
  };

  const formatAmount = (amount: number) => {
    return `£${Math.abs(amount).toFixed(2)}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${Math.abs(percentage).toFixed(1)}%`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getMockTransactions = (category: string): Transaction[] => {
    return [
      { id: 1, amount: -25.5, date: '2024-03-15', merchant: 'Local Store' },
      { id: 2, amount: -32.8, date: '2024-03-14', merchant: 'Online Shop' },
      { id: 3, amount: -18.99, date: '2024-03-12', merchant: 'Service Provider' },
    ];
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionMerchant}>{item.merchant}</Text>
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.transactionAmount}>{formatAmount(item.amount)}</Text>
    </View>
  );

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

      {/* Monthly Overview */}
      <View style={styles.header}>
        <Text style={styles.title}>Total Spending</Text>
        <Text style={styles.amount}>{formatAmount(data.total)}</Text>
        <View style={styles.comparisonContainer}>
          <Ionicons
            name={getChangeIcon(data.monthlyComparison.percentageChange).name}
            size={16}
            color={getChangeIcon(data.monthlyComparison.percentageChange).color}
          />
          <Text
            style={[
              styles.comparisonText,
              { color: getChangeIcon(data.monthlyComparison.percentageChange).color },
            ]}
          >
            {formatPercentage(data.monthlyComparison.percentageChange)} vs last {timeRange}
          </Text>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.chartWrapper}>
        <PieChart
          data={data.categories.map((category, index) => ({
            name: category.name,
            amount: category.amount,
            color: selectedPieSection === index ? category.color : `${category.color}99`,
            legendFontColor: '#FFF',
            legendFontSize: 12,
          }))}
          width={width - 32}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          hasLegend={false}
        />
      </View>

      {/* Category List */}
      <View style={styles.categoryList}>
        {data.categories.map((category, index) => (
          <View key={index}>
            <TouchableOpacity
              style={[
                styles.categoryItem,
                selectedCategory === category.name && styles.selectedCategoryItem,
              ]}
              onPress={() => handleCategoryPress(category.name)}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryPercentage}>
                    {((category.amount / data.total) * 100).toFixed(1)}% of total
                  </Text>
                </View>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>{formatAmount(category.amount)}</Text>
                <Ionicons
                  name={selectedCategory === category.name ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#FFF"
                />
              </View>
            </TouchableOpacity>

            {selectedCategory === category.name && (
              <Animated.View
                style={[
                  styles.categoryDetailsContainer,
                  {
                    maxHeight: categoryDetailsHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 500],
                    }),
                    opacity: categoryDetailsFade,
                  },
                ]}
              >
                <View style={styles.categoryStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Average Transaction</Text>
                    <Text style={styles.statValue}>{formatAmount(category.amount / 5)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Monthly Budget</Text>
                    <Text style={styles.statValue}>{formatAmount(category.amount * 1.2)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Transactions</Text>
                    <Text style={styles.statValue}>5</Text>
                  </View>
                </View>

                <Text style={styles.recentTransactionsTitle}>Recent Transactions</Text>
                <FlatList
                  data={getMockTransactions(category.name)}
                  renderItem={renderTransaction}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              </Animated.View>
            )}
          </View>
        ))}
      </View>

      {/* Insights */}
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Spending Insights</Text>
        {data.insights.map((insight, index) => (
          <TouchableOpacity
            key={index}
            style={styles.insightCard}
            onPress={() => {
              if (insight.category) {
                handleCategoryPress(insight.category);
              }
            }}
          >
            <View
              style={[
                styles.insightIconContainer,
                { backgroundColor: insight.type === 'decrease' ? '#4CAF5033' : '#F4433633' },
              ]}
            >
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
                <Text style={styles.insightDetails}>
                  {formatAmount(insight.amount)}
                  {insight.percentage && ` • ${formatPercentage(insight.percentage)} change`}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  comparisonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartWrapper: {
    marginBottom: 24,
    alignItems: 'center',
  },
  categoryList: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 2,
  },
  selectedCategoryItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryPercentage: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  categoryAmount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryDetailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  categoryStats: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  recentTransactionsTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    padding: 16,
    paddingBottom: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionMerchant: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  insightsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  insightsTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  insightDetails: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
