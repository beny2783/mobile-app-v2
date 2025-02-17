import { Transaction } from '../types/transaction';
import { OPENAI } from '../constants';

interface SpendingPattern {
  category: string;
  pattern: string;
  significance: number;
  recommendation?: string;
}

interface AIInsight {
  type: 'saving_opportunity' | 'spending_pattern' | 'anomaly' | 'forecast';
  title: string;
  description: string;
  impact: number;
  confidence: number;
  category?: string;
  actionable: boolean;
  action?: {
    type: 'reduce_spending' | 'set_budget' | 'review_subscription' | 'consolidate_payments';
    description: string;
  };
}

interface QuestionTemplate {
  id: string;
  category: 'savings' | 'spending' | 'budgeting' | 'patterns' | 'goals';
  question: string;
  prompt: string;
}

const PREDEFINED_QUESTIONS: QuestionTemplate[] = [
  // Spending Analysis
  {
    id: 'largest_expenses',
    category: 'spending',
    question: 'What are my largest expenses?',
    prompt:
      'Analyze the transactions to identify the top 3 largest expenses, explaining their impact on overall spending and suggesting potential areas for savings.',
  },
  {
    id: 'spending_categories',
    category: 'spending',
    question: 'How is my spending distributed across categories?',
    prompt:
      'Break down spending by category, highlighting which categories consume the most resources and comparing to typical household spending patterns.',
  },

  // Savings Opportunities
  {
    id: 'saving_opportunities',
    category: 'savings',
    question: 'Where can I save money?',
    prompt:
      'Identify specific opportunities for savings based on spending patterns, focusing on recurring expenses and areas of potential overexpenditure.',
  },
  {
    id: 'subscription_review',
    category: 'savings',
    question: 'Which subscriptions should I review?',
    prompt:
      'Analyze recurring payments and subscriptions, highlighting those that might be unnecessary or could be optimized for better value.',
  },

  // Budgeting Advice
  {
    id: 'budget_recommendations',
    category: 'budgeting',
    question: 'What should my budget look like?',
    prompt:
      'Based on income and spending patterns, suggest an optimal budget allocation across different categories, following common financial planning principles.',
  },
  {
    id: 'expense_reduction',
    category: 'budgeting',
    question: 'How can I reduce my monthly expenses?',
    prompt:
      'Analyze monthly recurring expenses and suggest specific, actionable ways to reduce costs while maintaining quality of life.',
  },

  // Spending Patterns
  {
    id: 'unusual_spending',
    category: 'patterns',
    question: 'Any unusual spending patterns?',
    prompt:
      'Identify any anomalies or unusual patterns in spending behavior, focusing on unexpected changes or potentially concerning trends.',
  },
  {
    id: 'recurring_payments',
    category: 'patterns',
    question: 'What are my recurring payments?',
    prompt:
      'List all recurring payments and subscriptions, their frequency, and total monthly impact on finances.',
  },

  // Financial Goals
  {
    id: 'savings_goal',
    category: 'goals',
    question: 'How can I save more?',
    prompt:
      'Based on current spending patterns, suggest specific strategies to increase savings, including potential amounts and timeframes.',
  },
  {
    id: 'spending_reduction',
    category: 'goals',
    question: 'How can I spend less on non-essentials?',
    prompt:
      'Identify discretionary spending patterns and suggest specific ways to reduce non-essential expenses while maintaining life satisfaction.',
  },
];

export class LocalAIService {
  private static instance: LocalAIService;
  private OPENAI_API_KEY: string;

  private constructor() {
    console.log('🔑 Initializing LocalAIService with API key:', {
      hasKey: !!OPENAI.API_KEY,
      keyPrefix: OPENAI.API_KEY ? OPENAI.API_KEY.substring(0, 10) + '...' : 'missing',
      keyLength: OPENAI.API_KEY?.length || 0,
      isValidFormat: OPENAI.API_KEY?.startsWith('sk-proj-'),
    });
    this.OPENAI_API_KEY = OPENAI.API_KEY;
  }

  public static getInstance(): LocalAIService {
    if (!LocalAIService.instance) {
      LocalAIService.instance = new LocalAIService();
    }
    return LocalAIService.instance;
  }

  async analyzeTransactions(transactions: Transaction[]): Promise<AIInsight[]> {
    try {
      console.log('🔍 Starting transaction analysis:', {
        count: transactions.length,
        dateRange: {
          earliest: new Date(
            Math.min(...transactions.map((t) => new Date(t.date).getTime()))
          ).toISOString(),
          latest: new Date(
            Math.max(...transactions.map((t) => new Date(t.date).getTime()))
          ).toISOString(),
        },
        categories: [...new Set(transactions.map((t) => t.category))],
        hasApiKey: !!this.OPENAI_API_KEY,
        keyPrefix: this.OPENAI_API_KEY ? this.OPENAI_API_KEY.substring(0, 10) + '...' : 'missing',
      });

      // First, apply statistical analysis
      console.log('📊 Starting statistical analysis...');
      const statisticalInsights = await this.generateStatisticalInsights(transactions);
      console.log('📊 Statistical insights generated:', {
        count: statisticalInsights.length,
        types: statisticalInsights.map((i) => i.type),
      });

      // Then, use OpenAI for natural language insights
      console.log('🤖 Starting AI analysis...');
      const aiInsights = await this.generateAIInsights(transactions);
      console.log('🤖 AI insights generated:', {
        count: aiInsights.length,
        types: aiInsights.map((i) => i.type),
      });

      const allInsights = [...statisticalInsights, ...aiInsights];
      console.log('✨ Total insights summary:', {
        total: allInsights.length,
        statistical: statisticalInsights.length,
        ai: aiInsights.length,
        types: allInsights.map((i) => i.type),
      });

      return allInsights;
    } catch (err) {
      console.error('❌ Error analyzing transactions:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      return [];
    }
  }

  private async generateAIInsights(transactions: Transaction[]): Promise<AIInsight[]> {
    try {
      console.log('🔍 Starting AI analysis preparation:', {
        transactionCount: transactions.length,
        apiKey: {
          exists: !!this.OPENAI_API_KEY,
          prefix: this.OPENAI_API_KEY ? this.OPENAI_API_KEY.substring(0, 10) + '...' : 'missing',
          length: this.OPENAI_API_KEY?.length || 0,
          isValidFormat: this.OPENAI_API_KEY?.startsWith('sk-proj-'),
        },
      });

      // Calculate basic stats
      const stats = {
        totalTransactions: transactions.length,
        dateRange: {
          start: transactions[0].date,
          end: transactions[transactions.length - 1].date,
        },
        totalSpent: transactions.reduce(
          (sum, t) => (t.type === 'debit' ? sum + Math.abs(t.amount) : sum),
          0
        ),
        totalIncome: transactions.reduce(
          (sum, t) => (t.type === 'credit' ? sum + t.amount : sum),
          0
        ),
        merchants: [...new Set(transactions.map((t) => t.merchant_name || t.description))].map(
          (merchant) => ({
            name: merchant,
            total: transactions
              .filter((t) => (t.merchant_name || t.description) === merchant)
              .reduce((sum, t) => sum + Math.abs(t.amount), 0),
          })
        ),
      };

      console.log('📊 Prepared transaction stats:', {
        transactionCount: stats.totalTransactions,
        dateRange: {
          start: stats.dateRange.start,
          end: stats.dateRange.end,
        },
        financials: {
          totalSpent: stats.totalSpent,
          totalIncome: stats.totalIncome,
          netFlow: stats.totalIncome - stats.totalSpent,
        },
        merchantCount: stats.merchants.length,
      });

      // Check API key
      if (!this.OPENAI_API_KEY || this.OPENAI_API_KEY.trim() === '') {
        console.warn('⚠️ No OpenAI API key available');
        return [];
      }

      console.log('🚀 Sending request to OpenAI...');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a financial analysis AI that provides specific, actionable insights about spending patterns.
CRITICAL: You must ONLY respond with a valid JSON object. DO NOT include any text before or after the JSON.

Your task is to:
1. Analyze transaction data to identify spending categories and patterns
2. Look for patterns in spending behavior
3. Identify potential savings opportunities
4. Detect recurring payments and subscriptions

The response MUST follow this EXACT structure:

{
  "analysis": "string containing 2-3 paragraphs of analysis",
  "insights": [
    {
      "type": "spending_pattern" | "saving_opportunity" | "anomaly" | "forecast",
      "title": "string",
      "description": "string",
      "impact": number,
      "confidence": number between 0 and 1,
      "category": "string",
      "actionable": boolean,
      "action": {
        "type": "reduce_spending" | "set_budget" | "review_subscription" | "consolidate_payments",
        "description": "string"
      }
    }
  ]
}

Example of VALID response:
{
  "analysis": "Based on the transaction data...",
  "insights": [{
    "type": "spending_pattern",
    "title": "High Grocery Spending at Tesco",
    "description": "Your grocery spending at Tesco shows regular patterns",
    "impact": 150,
    "confidence": 0.9,
    "category": "Groceries",
    "actionable": true,
    "action": {
      "type": "reduce_spending",
      "description": "Consider using Tesco's loyalty program and buying in bulk to reduce costs"
    }
  }]
}`,
            },
            {
              role: 'user',
              content: `Analyze these transactions and provide insights.
IMPORTANT: Your response must be ONLY a JSON object. Do not include any other text.

Transaction Data:
${JSON.stringify(transactions, null, 2)}

Guidelines for analysis field:
1. Describe overall spending patterns and trends
2. Highlight concerning areas or positive behaviors
3. Offer general recommendations
4. Use a friendly, conversational tone

Guidelines for insights array:
1. Provide 2-3 structured insights
2. Focus on the most significant patterns or opportunities
3. Include specific, actionable recommendations
4. Quantify the potential impact where possible
5. Consider recurring payments and unusual patterns

REMEMBER: Respond with ONLY a JSON object. No other text.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      // Log the data being sent to OpenAI
      console.log('📤 Data being sent to OpenAI:', {
        transactionCount: transactions.length,
        sampleTransactions: transactions.slice(0, 3),
        fields: Object.keys(transactions[0] || {}),
      });

      console.log('📡 OpenAI API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      const data = await response.json();

      // Handle API errors
      if (data.error) {
        console.error('❌ OpenAI API Error:', {
          code: data.error.code,
          type: data.error.type,
          message: data.error.message,
          details: data.error,
          requestHeaders: {
            contentType: 'application/json',
            authPrefix: 'Bearer ' + this.OPENAI_API_KEY.substring(0, 10) + '...',
          },
        });

        // If quota exceeded, return a friendly message as an insight
        if (data.error.code === 'insufficient_quota') {
          console.log('💡 Returning fallback insight due to quota limit');
          return [
            {
              type: 'forecast',
              title: 'AI Analysis Temporarily Unavailable',
              description:
                "Our AI analysis service is currently unavailable. We're still providing statistical insights based on your transaction data.",
              impact: 0,
              confidence: 1,
              actionable: false,
              category: 'SYSTEM',
            },
          ];
        }

        return [];
      }

      if (!data.choices || !data.choices[0]?.message?.content) {
        console.error('❌ Invalid OpenAI response structure:', {
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length,
          hasMessage: !!data.choices?.[0]?.message,
          hasContent: !!data.choices?.[0]?.message?.content,
          responseData: data,
        });
        return [];
      }

      const content = data.choices[0].message.content.trim();
      console.log('📝 Raw response content:', content.substring(0, 100) + '...');

      // Try to extract JSON if there's any non-JSON text
      let jsonContent = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
        console.log('🔍 Extracted JSON content:', jsonContent.substring(0, 100) + '...');
      }

      try {
        const parsed = JSON.parse(jsonContent);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Parsed response is not an object');
        }

        const insights: AIInsight[] = [];

        // Add the natural language analysis as a special insight
        if (parsed.analysis && typeof parsed.analysis === 'string') {
          console.log('✅ Found analysis in response');
          insights.push({
            type: 'forecast',
            title: 'Overall Financial Analysis',
            description: parsed.analysis,
            impact: 0,
            confidence: 0.9,
            actionable: false,
            category: 'ANALYSIS',
          });
        }

        // Add the structured insights
        if (Array.isArray(parsed.insights)) {
          console.log(`✅ Found ${parsed.insights.length} structured insights`);
          insights.push(
            ...parsed.insights.map((insight: any) => ({
              type: this.validateInsightType(insight.type),
              title: insight.title || 'Untitled Insight',
              description: insight.description || 'No description provided',
              impact: Number(insight.impact) || 0,
              confidence: Math.min(Math.max(Number(insight.confidence) || 0.5, 0), 1),
              category: insight.category,
              actionable: Boolean(insight.actionable),
              action: insight.action
                ? {
                    type: this.validateActionType(insight.action.type),
                    description: insight.action.description || 'No action description provided',
                  }
                : undefined,
            }))
          );
        }

        console.log(`✨ Successfully generated ${insights.length} total insights`);
        return insights;
      } catch (error) {
        console.error('❌ Error parsing OpenAI response:', error);
        console.error('Failed content:', jsonContent);
        return [
          {
            type: 'forecast',
            title: 'Analysis Error',
            description:
              'We encountered an error while analyzing your transactions. Our statistical insights are still available.',
            impact: 0,
            confidence: 1,
            actionable: false,
            category: 'SYSTEM',
          },
        ];
      }
    } catch (err) {
      console.error('❌ Error generating AI insights:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        type: err instanceof Error ? err.constructor.name : 'Unknown',
      });
      return [];
    }
  }

  private validateInsightType(type: string): AIInsight['type'] {
    const validTypes: AIInsight['type'][] = [
      'saving_opportunity',
      'spending_pattern',
      'anomaly',
      'forecast',
    ];
    return validTypes.includes(type as AIInsight['type'])
      ? (type as AIInsight['type'])
      : 'spending_pattern';
  }

  private validateActionType(
    type: string
  ): 'reduce_spending' | 'set_budget' | 'review_subscription' | 'consolidate_payments' {
    const validTypes = [
      'reduce_spending',
      'set_budget',
      'review_subscription',
      'consolidate_payments',
    ] as const;

    return validTypes.includes(type as (typeof validTypes)[number])
      ? (type as (typeof validTypes)[number])
      : 'reduce_spending';
  }

  private async generateStatisticalInsights(transactions: Transaction[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // 1. Most significant recurring pattern
    const recurringPatterns = this.detectRecurringTransactions(transactions);
    if (recurringPatterns.length > 0) {
      // Get the most significant pattern
      const mostSignificant = recurringPatterns.sort((a, b) => b.significance - a.significance)[0];
      insights.push(this.convertRecurringToInsights([mostSignificant])[0]);
    }

    // 2. Most significant merchant spending
    const merchantTotals: Record<string, number> = {};
    transactions.forEach((transaction) => {
      const merchant = transaction.description;
      merchantTotals[merchant] = (merchantTotals[merchant] || 0) + Math.abs(transaction.amount);
    });

    const topMerchant = Object.entries(merchantTotals).sort(([, a], [, b]) => b - a)[0];

    if (topMerchant) {
      const [merchant, total] = topMerchant;
      insights.push({
        type: 'spending_pattern',
        title: `Highest Spending: ${merchant}`,
        description: `Your largest spending category is ${merchant} with total spending of £${total.toFixed(2)}`,
        impact: total,
        confidence: 0.95,
        category: this.inferCategory(merchant, total),
        actionable: true,
        action: {
          type: 'review_subscription',
          description: `Review your spending at ${merchant} for potential savings`,
        },
      });
    }

    // 3. Most significant anomaly
    const mostSignificantAnomaly = this.findMostSignificantAnomaly(transactions);
    if (mostSignificantAnomaly) {
      insights.push(mostSignificantAnomaly);
    }

    return insights;
  }

  private findMostSignificantAnomaly(transactions: Transaction[]): AIInsight | null {
    const categoryTotals: Record<string, number[]> = {};

    interface AnomalyData {
      zScore: number;
      amount: number;
      category: string;
      transaction: Transaction;
      mean: number;
    }

    let mostSignificantAnomaly: AnomalyData | null = null;

    // Group amounts by category
    transactions.forEach((transaction) => {
      const category = transaction.category || 'UNCATEGORIZED';
      if (!categoryTotals[category]) {
        categoryTotals[category] = [];
      }
      categoryTotals[category].push(Math.abs(transaction.amount));
    });

    // Find the most significant anomaly across all categories
    Object.entries(categoryTotals).forEach(([category, amounts]) => {
      if (amounts.length < 3) return;

      const mean = amounts.reduce((a, b) => a + b) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length
      );

      amounts.forEach((amount) => {
        const zScore = (amount - mean) / stdDev;
        const currentAnomaly = mostSignificantAnomaly;
        if (
          Math.abs(zScore) > 2 &&
          (!currentAnomaly || Math.abs(zScore) > Math.abs(currentAnomaly.zScore))
        ) {
          const transaction = transactions.find(
            (t) => Math.abs(t.amount) === amount && (t.category || 'UNCATEGORIZED') === category
          );
          if (transaction) {
            mostSignificantAnomaly = {
              zScore,
              amount,
              category,
              transaction,
              mean,
            };
          }
        }
      });
    });

    if (!mostSignificantAnomaly) return null;

    const anomaly = mostSignificantAnomaly as AnomalyData;
    return {
      type: 'anomaly',
      title: `Unusual ${anomaly.category} Spending`,
      description: `Transaction of £${anomaly.amount.toFixed(2)} at ${anomaly.transaction.description} is significantly ${anomaly.amount > anomaly.mean ? 'higher' : 'lower'} than usual`,
      impact: Math.abs(anomaly.amount - anomaly.mean),
      confidence: Math.min(Math.abs(anomaly.zScore) / 4, 0.95),
      category: anomaly.category,
      actionable: true,
      action: {
        type: 'review_subscription',
        description: `Review this unusual transaction to understand the reason for the ${anomaly.amount > anomaly.mean ? 'increase' : 'decrease'}`,
      },
    };
  }

  private detectRecurringTransactions(transactions: Transaction[]): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];
    const merchantFrequency: Record<
      string,
      {
        count: number;
        amounts: number[];
        dates: Date[];
      }
    > = {};

    // Group transactions by description (since merchant_name is often empty)
    transactions.forEach((transaction) => {
      const key = transaction.description;
      if (!merchantFrequency[key]) {
        merchantFrequency[key] = { count: 0, amounts: [], dates: [] };
      }
      merchantFrequency[key].count++;
      merchantFrequency[key].amounts.push(Math.abs(transaction.amount));
      merchantFrequency[key].dates.push(new Date(transaction.date));
    });

    // Analyze patterns
    Object.entries(merchantFrequency).forEach(([merchant, data]) => {
      if (data.count >= 2) {
        // At least 2 occurrences
        const isRecurring = this.isRecurringPattern(data.amounts, data.dates);
        if (isRecurring) {
          const avgAmount = data.amounts.reduce((a, b) => a + b) / data.amounts.length;
          patterns.push({
            category: this.inferCategory(merchant, avgAmount),
            pattern: merchant,
            significance: avgAmount * data.count,
            recommendation: this.generateRecommendation(merchant, avgAmount, data.count),
          });
        }
      }
    });

    return patterns;
  }

  private isRecurringPattern(amounts: number[], dates: Date[]): boolean {
    // Check amount consistency
    const avgAmount = amounts.reduce((a, b) => a + b) / amounts.length;
    const amountVariation = amounts.some(
      (amount) => Math.abs(amount - avgAmount) / avgAmount > 0.1
    );
    if (amountVariation) return false;

    // Check date patterns (if more than 2 dates)
    if (dates.length > 2) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push(dates[i].getTime() - dates[i - 1].getTime());
      }

      // Check if intervals are consistent (within 2 days)
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const intervalVariation = intervals.some(
        (interval) => Math.abs(interval - avgInterval) > 2 * 24 * 60 * 60 * 1000
      );
      if (intervalVariation) return false;
    }

    return true;
  }

  private inferCategory(description: string, amount: number): string {
    description = description.toLowerCase();

    // Common patterns from your data
    if (description.includes('save the change')) return 'SAVINGS';
    if (description.includes('asda') || description.includes('tesco')) return 'GROCERIES';
    if (description.includes('amazon')) return 'SHOPPING';

    // Amount-based inference
    if (amount > 500) return 'MAJOR_EXPENSE';
    if (amount < 1) return 'MICRO_TRANSACTION';

    return 'UNCATEGORIZED';
  }

  private generateRecommendation(merchant: string, avgAmount: number, frequency: number): string {
    const monthlyImpact = (avgAmount * frequency * 30) / 7; // Approximate monthly impact

    if (merchant.toLowerCase().includes('save the change')) {
      return `Your automated savings average £${avgAmount.toFixed(2)} per transaction. Consider increasing this for better savings.`;
    }

    if (monthlyImpact > 100) {
      return `This recurring payment of £${avgAmount.toFixed(2)} has a significant monthly impact of ~£${monthlyImpact.toFixed(2)}. Consider reviewing for potential savings.`;
    }

    return `Regular payment of £${avgAmount.toFixed(2)} - monitor for any changes or unexpected charges.`;
  }

  private analyzeMerchantSpending(transactions: Transaction[]): AIInsight[] {
    const insights: AIInsight[] = [];
    const merchantTotals: Record<string, number> = {};

    // Calculate totals by merchant
    transactions.forEach((transaction) => {
      const merchant = transaction.description;
      merchantTotals[merchant] = (merchantTotals[merchant] || 0) + Math.abs(transaction.amount);
    });

    // Find significant merchants
    Object.entries(merchantTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3) // Top 3 merchants
      .forEach(([merchant, total]) => {
        insights.push({
          type: 'spending_pattern',
          title: `Significant Spending at ${merchant}`,
          description: `Total spending of £${total.toFixed(2)} at ${merchant}`,
          impact: total,
          confidence: 0.9,
          category: this.inferCategory(merchant, total),
          actionable: true,
          action: {
            type: 'review_subscription',
            description: `Review your spending pattern at ${merchant} for potential savings`,
          },
        });
      });

    return insights;
  }

  private detectSpendingAnomalies(transactions: Transaction[]): AIInsight[] {
    const insights: AIInsight[] = [];
    const categoryTotals: Record<string, number[]> = {};

    // Group amounts by category
    transactions.forEach((transaction) => {
      const category = transaction.category || 'UNCATEGORIZED';
      if (!categoryTotals[category]) {
        categoryTotals[category] = [];
      }
      categoryTotals[category].push(Math.abs(transaction.amount));
    });

    // Detect anomalies using Z-score
    Object.entries(categoryTotals).forEach(([category, amounts]) => {
      if (amounts.length < 3) return; // Need at least 3 transactions for meaningful analysis

      const mean = amounts.reduce((a, b) => a + b) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length
      );

      amounts.forEach((amount, index) => {
        const zScore = (amount - mean) / stdDev;
        if (Math.abs(zScore) > 2) {
          // More than 2 standard deviations
          const transaction = transactions.find(
            (t) => Math.abs(t.amount) === amount && (t.category || 'UNCATEGORIZED') === category
          );
          if (transaction) {
            insights.push({
              type: 'anomaly',
              title: `Unusual ${category} Transaction`,
              description: `Transaction of £${amount.toFixed(2)} at ${transaction.description} is unusually ${amount > mean ? 'high' : 'low'} for this category`,
              impact: Math.abs(amount - mean),
              confidence: Math.min(Math.abs(zScore) / 4, 0.95), // Scale confidence based on z-score
              category,
              actionable: true,
              action: {
                type: 'review_subscription',
                description: `Review this unusual transaction for potential issues`,
              },
            });
          }
        }
      });
    });

    return insights;
  }

  private prepareSanitizedSummary(transactions: Transaction[]): any {
    // Create a sanitized summary without personal details
    const dates = transactions.map((t) => new Date(t.date)).filter((d) => !isNaN(d.getTime())); // Filter out invalid dates

    // Sort dates to get actual range
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    const summary = {
      totalTransactions: transactions.length,
      timeRange: {
        start: startDate || new Date(),
        end: endDate || new Date(),
        durationInDays:
          startDate && endDate
            ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
      },
      categories: {} as Record<
        string,
        {
          count: number;
          totalSpent: number;
          averageTransaction: number;
          lastTransaction: string;
          transactionFrequency: string;
        }
      >,
      overview: {
        totalSpent: 0,
        totalIncome: 0,
        averageTransactionSize: 0,
        mostFrequentCategory: '',
        highestSpendingCategory: '',
      },
    };

    // Aggregate by category
    transactions.forEach((transaction) => {
      const category = transaction.category || 'Uncategorized';
      if (!summary.categories[category]) {
        summary.categories[category] = {
          count: 0,
          totalSpent: 0,
          averageTransaction: 0,
          lastTransaction: transaction.date,
          transactionFrequency: 'Unknown',
        };
      }

      const cat = summary.categories[category];
      cat.count++;
      const amount = Math.abs(transaction.amount);
      cat.totalSpent += amount;

      // Update overview totals
      if (transaction.type === 'credit') {
        summary.overview.totalIncome += amount;
      } else {
        summary.overview.totalSpent += amount;
      }

      // Track last transaction
      if (new Date(transaction.date) > new Date(cat.lastTransaction)) {
        cat.lastTransaction = transaction.date;
      }
    });

    // Calculate averages and frequencies
    Object.entries(summary.categories).forEach(([category, data]) => {
      data.averageTransaction = data.totalSpent / data.count;

      // Calculate transaction frequency if we have duration
      if (summary.timeRange.durationInDays > 0) {
        const frequency = summary.timeRange.durationInDays / data.count;
        if (frequency <= 7) {
          data.transactionFrequency = 'Multiple times per week';
        } else if (frequency <= 14) {
          data.transactionFrequency = 'Weekly';
        } else if (frequency <= 31) {
          data.transactionFrequency = 'Monthly';
        } else {
          data.transactionFrequency = 'Occasional';
        }
      }
    });

    // Find most frequent and highest spending categories
    const categories = Object.entries(summary.categories);
    if (categories.length > 0) {
      summary.overview.mostFrequentCategory = categories.reduce((a, b) =>
        a[1].count > b[1].count ? a : b
      )[0];

      summary.overview.highestSpendingCategory = categories.reduce((a, b) =>
        a[1].totalSpent > b[1].totalSpent ? a : b
      )[0];

      summary.overview.averageTransactionSize =
        (summary.overview.totalSpent + summary.overview.totalIncome) / summary.totalTransactions;
    }

    return summary;
  }

  private preparePrompt(summary: any): string {
    return `Analyze this spending summary and provide both a natural language analysis and specific insights.
Your response MUST be in valid JSON format with both an "analysis" string and an "insights" array.

Summary of transactions:
${JSON.stringify(summary, null, 2)}

Guidelines:
1. Provide a natural language analysis (2-3 paragraphs) that:
   - Describes overall spending patterns and trends
   - Highlights concerning areas or positive behaviors
   - Offers general recommendations
   - Uses a friendly, conversational tone

2. Provide 1-2 structured insights that:
   - Focus on the most significant patterns or opportunities
   - Include specific, actionable recommendations
   - Quantify the potential impact where possible

Remember: Response must be valid JSON with both "analysis" and "insights" fields.`;
  }

  private convertRecurringToInsights(patterns: SpendingPattern[]): AIInsight[] {
    return patterns.map((pattern) => ({
      type: 'spending_pattern',
      title: `Regular ${pattern.category} Spending`,
      description: `You have a recurring payment pattern for ${pattern.pattern}`,
      impact: pattern.significance,
      confidence: 0.9,
      category: pattern.category,
      actionable: true,
      action: {
        type: 'review_subscription',
        description: pattern.recommendation || 'Review this recurring payment',
      },
    }));
  }

  async analyzeSpecificQuestion(
    questionId: string,
    transactions: Transaction[]
  ): Promise<AIInsight[]> {
    try {
      const question = PREDEFINED_QUESTIONS.find((q) => q.id === questionId);
      if (!question) {
        console.error(`Question template not found for ID: ${questionId}`);
        return [
          {
            type: 'forecast',
            title: 'Analysis Unavailable',
            description: 'Sorry, this question template is not available at the moment.',
            impact: 0,
            confidence: 1,
            actionable: false,
          },
        ];
      }

      // Check if API key is valid
      if (!this.OPENAI_API_KEY || this.OPENAI_API_KEY.trim() === '') {
        console.warn('⚠️ No OpenAI API key provided');
        return this.getFallbackInsights(question);
      }

      // Limit to 50 transactions for testing
      const limitedTransactions = transactions.slice(0, 50);
      console.log('🔍 Limited transactions for testing:', {
        originalCount: transactions.length,
        limitedCount: limitedTransactions.length,
        firstTransaction: limitedTransactions[0],
        lastTransaction: limitedTransactions[limitedTransactions.length - 1],
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a financial analysis AI focusing specifically on: ${question.question}

CRITICAL: You must ONLY respond with a valid JSON object. DO NOT include any text before or after the JSON.
The response MUST follow this EXACT structure:

{
  "analysis": "string containing 2-3 paragraphs of analysis",
  "insights": [
    {
      "type": "spending_pattern" | "saving_opportunity" | "anomaly" | "forecast",
      "title": "string",
      "description": "string",
      "impact": number,
      "confidence": number between 0 and 1,
      "category": "string",
      "actionable": boolean,
      "action": {
        "type": "reduce_spending" | "set_budget" | "review_subscription" | "consolidate_payments",
        "description": "string"
      }
    }
  ]
}`,
            },
            {
              role: 'user',
              content: `${question.prompt}

IMPORTANT: Your response must be ONLY a JSON object. Do not include any other text.

Raw Transaction Data (Limited to 50 transactions for testing):
${JSON.stringify(limitedTransactions, null, 2)}

Guidelines for analysis field:
1. Describe overall spending patterns and trends
2. Highlight concerning areas or positive behaviors
3. Offer general recommendations
4. Use a friendly, conversational tone

Guidelines for insights array:
1. Provide 2-3 structured insights
2. Focus on the most significant patterns or opportunities
3. Include specific, actionable recommendations
4. Quantify the potential impact where possible
5. Consider recurring payments and unusual patterns

NOTE: This analysis is based on a limited sample of 50 transactions for testing purposes.

REMEMBER: Respond with ONLY a JSON object. No other text.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      // Log the data being sent to OpenAI
      console.log('📤 Data being sent to OpenAI:', {
        question: {
          id: question.id,
          category: question.category,
          question: question.question,
          prompt: question.prompt,
        },
        transactionCount: limitedTransactions.length,
        sampleTransactions: limitedTransactions.slice(0, 3),
      });

      const data = await response.json();

      // Handle API errors
      if (data.error) {
        console.error('❌ OpenAI API Error:', {
          code: data.error.code,
          type: data.error.type,
          message: data.error.message,
        });

        if (data.error.code === 'insufficient_quota') {
          return [
            {
              type: 'forecast',
              title: 'AI Analysis Temporarily Unavailable',
              description:
                "Our AI analysis service is currently unavailable. We're still providing statistical insights based on your transaction data.",
              impact: 0,
              confidence: 1,
              actionable: false,
            },
          ];
        }

        return this.getFallbackInsights(question);
      }

      if (!data.choices || !data.choices[0]?.message?.content) {
        console.error('❌ Invalid OpenAI response structure:', {
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length,
          hasMessage: !!data.choices?.[0]?.message,
          hasContent: !!data.choices?.[0]?.message?.content,
          responseData: data,
        });
        return this.getFallbackInsights(question);
      }

      const content = data.choices[0].message.content.trim();
      console.log('📝 Raw response content:', content.substring(0, 100) + '...');

      try {
        // Try to extract JSON if there's any non-JSON text
        let jsonContent = content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
          console.log('🔍 Extracted JSON content:', jsonContent.substring(0, 100) + '...');
        }

        const parsed = JSON.parse(jsonContent);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Parsed response is not an object');
        }

        const insights: AIInsight[] = [];

        // Add the natural language analysis as a special insight
        if (parsed.analysis && typeof parsed.analysis === 'string') {
          console.log('✅ Found analysis in response');
          insights.push({
            type: 'forecast',
            title: 'Overall Financial Analysis',
            description: parsed.analysis,
            impact: 0,
            confidence: 0.9,
            actionable: false,
            category: 'ANALYSIS',
          });
        }

        // Add the structured insights
        if (Array.isArray(parsed.insights)) {
          console.log(`✅ Found ${parsed.insights.length} structured insights`);
          insights.push(
            ...parsed.insights.map((insight: any) => ({
              type: this.validateInsightType(insight.type),
              title: insight.title || 'Untitled Insight',
              description: insight.description || 'No description provided',
              impact: Number(insight.impact) || 0,
              confidence: Math.min(Math.max(Number(insight.confidence) || 0.5, 0), 1),
              category: insight.category,
              actionable: Boolean(insight.actionable),
              action: insight.action
                ? {
                    type: this.validateActionType(insight.action.type),
                    description: insight.action.description || 'No action description provided',
                  }
                : undefined,
            }))
          );
        }

        console.log(`✨ Successfully generated ${insights.length} total insights`);
        return insights.length > 0 ? insights : this.getFallbackInsights(question);
      } catch (error) {
        console.error('❌ Error parsing OpenAI response:', error);
        console.error('Failed content:', content);
        return this.getFallbackInsights(question);
      }
    } catch (error) {
      console.error('Error analyzing specific question:', error);
      return [
        {
          type: 'forecast',
          title: 'Analysis Error',
          description:
            'We encountered an error while analyzing your question. Please try again later.',
          impact: 0,
          confidence: 1,
          actionable: false,
        },
      ];
    }
  }

  private getFallbackInsights(question: QuestionTemplate): AIInsight[] {
    // Provide basic statistical insights when AI is unavailable
    return [
      {
        type: 'forecast',
        title: 'Basic Analysis Available',
        description: `We can't provide AI-powered insights for "${question.question}" at the moment, but you can view your transaction statistics in the charts above.`,
        impact: 0,
        confidence: 1,
        actionable: false,
      },
    ];
  }
}

// Export a singleton instance
export const localAIService = LocalAIService.getInstance();
