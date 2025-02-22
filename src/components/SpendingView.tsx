import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  FlatList,
  TouchableWithoutFeedback,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SpendingAnalysis } from '../utils/categoryUtils';
import { colors } from '../constants/theme';
import { localAIService } from '../services/LocalAIService';
import { Transaction } from '../types/transaction';
import { QuestionCards } from './QuestionCards';
import type { AIInsight } from '../types/transaction/insights';
import { InsightCard } from './InsightCard';

const { width } = Dimensions.get('window');

interface SpendingViewProps {
  data: SpendingAnalysis;
  timeRange: 'week' | 'month';
  onTimeRangeChange: (range: 'week' | 'month') => void;
  transactions: Transaction[];
  loading?: boolean;
  error?: string | null;
}

export const SpendingView: React.FC<SpendingViewProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  transactions,
  loading = false,
  error = null,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPieSection, setSelectedPieSection] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // Animation values
  const categoryDetailsHeight = useRef(new Animated.Value(0)).current;
  const categoryDetailsFade = useRef(new Animated.Value(0)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAIInsights();
  }, [transactions]);

  const loadAIInsights = async () => {
    if (!transactions.length) return;

    setLoadingInsights(true);
    try {
      const insights = await localAIService.analyzeTransactions(transactions);
      setAiInsights(insights);
    } catch (error) {
      console.error('Error loading AI insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const animateOverlay = (show: boolean) => {
    Animated.spring(overlayAnimation, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      mass: 1,
      stiffness: 200,
    }).start();
  };

  const handleCategoryPress = (category: string, index?: number) => {
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

    if (isDeselecting) {
      animateOverlay(false);
    } else {
      animateOverlay(true);
    }

    setSelectedCategory(isDeselecting ? null : category);
    setSelectedPieSection(isDeselecting ? null : (index ?? null));
  };

  // Handle pie chart section press
  const handlePiePress = (index: number) => {
    const category = data.categories[index];
    handleCategoryPress(category.name, index);
    animateOverlay(true);
  };

  const handleChartPress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const chartWidth = width - 32; // Total width minus padding
    const chartHeight = 220;

    // Adjust for the actual pie chart position and size
    const pieSize = Math.min(chartWidth, chartHeight) * 0.8; // Pie typically takes 80% of the container
    const pieRadius = pieSize / 2;

    // The pie chart's center point (accounting for padding)
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;

    // Calculate distance from center
    const dx = locationX - centerX;
    const dy = locationY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only process if touch is within the pie chart radius
    // Add a small buffer (1.1) to make edge touches more forgiving
    if (distance <= pieRadius * 1.1) {
      // Calculate angle in radians
      // Adjust by -Math.PI/2 to align with the pie chart's starting position (top)
      let angle = Math.atan2(dy, dx) + Math.PI / 2;
      if (angle < 0) angle += 2 * Math.PI;

      // Convert angle to degrees and normalize
      let degrees = (angle * 180) / Math.PI;
      if (degrees < 0) degrees += 360;

      // Calculate total for percentage calculations
      const total = data.categories.reduce((sum, cat) => sum + cat.amount, 0);
      let currentAngle = 0;

      // Add some debugging information
      console.log('Touch detected:', {
        x: locationX,
        y: locationY,
        distance,
        degrees,
        isWithinRadius: distance <= pieRadius * 1.1,
      });

      // Find the matching section
      for (let i = 0; i < data.categories.length; i++) {
        const sectionPercentage = data.categories[i].amount / total;
        const sectionAngle = sectionPercentage * 360;

        if (degrees <= currentAngle + sectionAngle) {
          // Add some debugging information
          console.log('Section found:', {
            index: i,
            category: data.categories[i].name,
            startAngle: currentAngle,
            endAngle: currentAngle + sectionAngle,
            touchAngle: degrees,
          });

          handlePiePress(i);
          break;
        }
        currentAngle += sectionAngle;
      }
    } else {
      // If we're outside the pie radius and something is selected, deselect it
      if (selectedPieSection !== null) {
        handleCategoryPress(data.categories[selectedPieSection].name);
      }
    }
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

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getMockTransactions = (category: string): Transaction[] => {
    return [
      {
        id: '1',
        transaction_id: 'mock-txn-1',
        amount: -25.5,
        timestamp: '2024-03-15',
        description: 'Local Store',
        user_id: 'test',
        connection_id: 'test',
        currency: 'GBP',
        transaction_type: 'debit',
        transaction_category: category,
        merchant_name: 'Local Store',
        created_at: '2024-03-15',
        updated_at: '2024-03-15',
      },
      {
        id: '2',
        transaction_id: 'mock-txn-2',
        amount: -32.8,
        timestamp: '2024-03-14',
        description: 'Online Shop',
        user_id: 'test',
        connection_id: 'test',
        currency: 'GBP',
        transaction_type: 'debit',
        transaction_category: category,
        merchant_name: 'Online Shop',
        created_at: '2024-03-14',
        updated_at: '2024-03-14',
      },
      {
        id: '3',
        transaction_id: 'mock-txn-3',
        amount: -18.99,
        timestamp: '2024-03-12',
        description: 'Service Provider',
        user_id: 'test',
        connection_id: 'test',
        currency: 'GBP',
        transaction_type: 'debit',
        transaction_category: category,
        merchant_name: 'Service Provider',
        created_at: '2024-03-12',
        updated_at: '2024-03-12',
      },
    ];
  };

  const getMerchantIcon = (
    description: string,
    category?: string
  ): { name: string; type: 'ionicons' | 'material' } => {
    const lowercaseDesc = description.toLowerCase();
    const lowercaseCategory = (category || '').toLowerCase();

    // Check for common merchants and categories
    if (lowercaseDesc.includes('amazon') || lowercaseDesc.includes('amzn')) {
      return { name: 'amazon', type: 'material' };
    } else if (lowercaseDesc.includes('uber') || lowercaseDesc.includes('lyft')) {
      return { name: 'car', type: 'ionicons' };
    } else if (lowercaseDesc.includes('netflix')) {
      return { name: 'play-circle', type: 'ionicons' };
    } else if (lowercaseDesc.includes('spotify')) {
      return { name: 'musical-notes', type: 'ionicons' };
    } else if (lowercaseDesc.includes('apple')) {
      return { name: 'apple', type: 'ionicons' };
    } else if (lowercaseDesc.includes('google')) {
      return { name: 'google', type: 'material' };
    }

    // Category-based fallbacks
    if (lowercaseCategory.includes('groceries') || lowercaseCategory.includes('food')) {
      return { name: 'cart', type: 'ionicons' };
    } else if (lowercaseCategory.includes('transport')) {
      return { name: 'bus', type: 'ionicons' };
    } else if (lowercaseCategory.includes('entertainment')) {
      return { name: 'game-controller', type: 'ionicons' };
    } else if (lowercaseCategory.includes('shopping')) {
      return { name: 'bag', type: 'ionicons' };
    } else if (lowercaseCategory.includes('bills') || lowercaseCategory.includes('utilities')) {
      return { name: 'receipt', type: 'ionicons' };
    }

    // Default icon
    return { name: 'card', type: 'ionicons' };
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const merchantIcon = getMerchantIcon(item.description);

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={styles.merchantContainer}>
            <View style={styles.iconContainer}>
              {merchantIcon.type === 'ionicons' ? (
                <Ionicons name={merchantIcon.name as any} size={20} color={colors.primary} />
              ) : (
                <MaterialCommunityIcons
                  name={merchantIcon.name as any}
                  size={20}
                  color={colors.primary}
                />
              )}
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.transactionMerchant}>{item.description}</Text>
              <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.transactionAmount}>{formatAmount(item.amount)}</Text>
      </View>
    );
  };

  const renderInsightIcon = (type: string) => {
    switch (type) {
      case 'saving_opportunity':
        return <Ionicons name="trending-down" size={24} color="#4CAF50" />;
      case 'anomaly':
        return <Ionicons name="alert-circle" size={24} color="#FFC107" />;
      case 'forecast':
        return <Ionicons name="analytics" size={24} color="#2196F3" />;
      default:
        return <Ionicons name="trending-up" size={24} color="#F44336" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'saving_opportunity':
        return '#4CAF5033';
      case 'anomaly':
        return '#FFC10733';
      case 'forecast':
        return '#2196F333';
      default:
        return '#F4433633';
    }
  };

  const handleQuestionSelect = async (questionId: string) => {
    setLoadingInsights(true);
    try {
      const newInsights = await localAIService.analyzeSpecificQuestion(questionId, transactions);
      setInsights(newInsights);
    } catch (err) {
      console.error('Error analyzing question:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Add loading and error states
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>No spending data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <QuestionCards onSelectQuestion={handleQuestionSelect} />

      {loadingInsights && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing your transactions...</Text>
        </View>
      )}

      {insights.length > 0 && (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>AI Insights</Text>
          <ScrollView>
            {insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Time Range Selector */}
      <View style={styles.timeSelector}>
        <TouchableOpacity
          style={[styles.timeButton, timeRange === 'week' && styles.activeTimeButton]}
          onPress={() => onTimeRangeChange('week')}
        >
          <Text
            style={[styles.timeButtonText, timeRange === 'week' && styles.activeTimeButtonText]}
          >
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeButton, timeRange === 'month' && styles.activeTimeButton]}
          onPress={() => onTimeRangeChange('month')}
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

      {/* Transaction Types */}
      {data.transactionTypes && (
        <View style={styles.transactionTypes}>
          {/* Debit Transactions */}
          <TouchableOpacity
            style={[styles.transactionTypeItem, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}
          >
            <View style={styles.transactionTypeLeft}>
              <Text style={styles.transactionTypeName}>DEBIT</Text>
              <Text style={styles.transactionTypePercentage}>
                {data.transactionTypes.debit.percentage.toFixed(1)}% of total
              </Text>
            </View>
            <Text style={styles.transactionTypeAmount}>
              {formatAmount(data.transactionTypes.debit.total)}
            </Text>
          </TouchableOpacity>

          {/* Credit Transactions */}
          <TouchableOpacity
            style={[styles.transactionTypeItem, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}
          >
            <View style={styles.transactionTypeLeft}>
              <Text style={styles.transactionTypeName}>CREDIT</Text>
              <Text style={styles.transactionTypePercentage}>
                {data.transactionTypes.credit.percentage.toFixed(1)}% of total
              </Text>
            </View>
            <Text style={[styles.transactionTypeAmount, { color: '#4CAF50' }]}>
              {formatAmount(data.transactionTypes.credit.total)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Breakdown */}
      <View style={styles.chartWrapper}>
        <TouchableWithoutFeedback onPress={handleChartPress}>
          <View>
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
        </TouchableWithoutFeedback>
        {selectedPieSection !== null && (
          <Animated.View
            style={[
              styles.selectedCategoryOverlay,
              {
                opacity: overlayAnimation,
                transform: [
                  {
                    scale: overlayAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.selectedCategoryName}>
              {data.categories[selectedPieSection].name}
            </Text>
            <Text style={styles.selectedCategoryAmount}>
              {formatAmount(data.categories[selectedPieSection].amount)}
            </Text>
            <Text style={styles.selectedCategoryPercentage}>
              {((data.categories[selectedPieSection].amount / data.total) * 100).toFixed(1)}% of
              total
            </Text>
          </Animated.View>
        )}
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
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </Animated.View>
            )}
          </View>
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
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: 12,
    fontSize: 16,
  },
  selectedCategoryOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -50 }],
    width: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 26, 47, 0.9)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCategoryName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedCategoryAmount: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedCategoryPercentage: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  transactionTypes: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  transactionTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  transactionTypeLeft: {
    flex: 1,
  },
  transactionTypeName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  transactionTypePercentage: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  transactionTypeAmount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  merchantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  merchantInfo: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
});
