export const getCategoryColor = (category: string): string => {
  // Define a consistent color palette for categories
  const colorMap: { [key: string]: string } = {
    Bills: '#FF9800',
    Transport: '#2196F3',
    Shopping: '#4CAF50',
    Entertainment: '#9C27B0',
    Groceries: '#00BCD4',
    Dining: '#F44336',
    Health: '#E91E63',
    Travel: '#3F51B5',
    Other: '#607D8B',
  };

  return colorMap[category] || colorMap['Other'];
};

export interface CategoryData {
  name: string;
  amount: number;
  color: string;
}

export interface SpendingInsight {
  type: 'increase' | 'decrease' | 'unusual';
  category?: string;
  amount?: number;
  percentage?: number;
  description: string;
}

export interface SpendingAnalysis {
  total: number;
  monthlyComparison: {
    percentageChange: number;
    previousMonthTotal: number;
  };
  categories: CategoryData[];
  insights: SpendingInsight[];
}
