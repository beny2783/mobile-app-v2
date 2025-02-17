import { Transaction } from '../types/transaction';
import { supabase } from './supabase';

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
  impact: number; // Estimated financial impact
  confidence: number; // AI confidence score (0-1)
  category?: string;
  actionable: boolean;
  action?: {
    type: 'reduce_spending' | 'set_budget' | 'review_subscription' | 'consolidate_payments';
    description: string;
  };
}

export class AIService {
  private static instance: AIService;
  private OPENAI_API_KEY: string;

  private constructor() {
    // Initialize with your OpenAI API key
    this.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async analyzeTransactions(transactions: Transaction[]): Promise<AIInsight[]> {
    try {
      // Prepare the data for OpenAI
      const prompt = this.prepareTransactionPrompt(transactions);

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are a financial analysis AI that provides specific, actionable insights about spending patterns.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      return this.parseAIResponse(data);
    } catch (error) {
      console.error('Error analyzing transactions:', error);
      return [];
    }
  }

  private prepareTransactionPrompt(transactions: Transaction[]): string {
    // Group transactions by category
    const categoryGroups = transactions.reduce<Record<string, Transaction[]>>(
      (groups, transaction) => {
        const category = transaction.category || 'Uncategorized';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(transaction);
        return groups;
      },
      {}
    );

    // Create a summary of spending patterns
    const summary = Object.entries(categoryGroups)
      .map(([category, transactions]) => {
        const total = transactions.reduce(
          (sum: number, t: Transaction) => sum + Math.abs(t.amount),
          0
        );
        const count = transactions.length;
        return `Category: ${category}\nTotal Spent: £${total.toFixed(2)}\nTransaction Count: ${count}`;
      })
      .join('\n\n');

    return `Please analyze these spending patterns and provide specific insights and recommendations:

${summary}

Focus on:
1. Unusual spending patterns
2. Potential saving opportunities
3. Subscription patterns
4. Spending forecasts
5. Budget recommendations

Provide specific, actionable insights that can help improve financial health.`;
  }

  private parseAIResponse(response: any): AIInsight[] {
    try {
      // Parse the OpenAI response and convert it to structured insights
      const content = response.choices[0].message.content;

      // Use regex or parsing logic to extract structured insights
      // This is a simplified example - you'd want more robust parsing
      const insights = content.split('\n\n').map((insight: string) => {
        const lines = insight.split('\n');
        const type = this.determineInsightType(lines[0]);
        const action = this.extractAction(lines);

        return {
          type,
          title: lines[0],
          description: lines[1] || '',
          impact: this.extractImpact(lines),
          confidence: 0.8, // You could make this more sophisticated
          actionable: true,
          action,
        };
      });

      return insights;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }

  private determineInsightType(title: string): AIInsight['type'] {
    if (title.toLowerCase().includes('save')) return 'saving_opportunity';
    if (title.toLowerCase().includes('pattern')) return 'spending_pattern';
    if (title.toLowerCase().includes('unusual')) return 'anomaly';
    if (title.toLowerCase().includes('predict') || title.toLowerCase().includes('forecast'))
      return 'forecast';
    return 'spending_pattern';
  }

  private extractImpact(lines: string[]): number {
    // Extract financial impact from the insight text
    // This is a simplified example
    const impactLine = lines.find((line) => line.includes('£') || line.includes('$'));
    if (!impactLine) return 0;

    const match = impactLine.match(/[£$]\d+(\.\d{2})?/);
    return match ? parseFloat(match[0].substring(1)) : 0;
  }

  private extractAction(lines: string[]): AIInsight['action'] | undefined {
    // Extract actionable recommendation
    const actionLine = lines.find(
      (line) =>
        line.toLowerCase().includes('recommend') ||
        line.toLowerCase().includes('should') ||
        line.toLowerCase().includes('could')
    );

    if (!actionLine) return undefined;

    return {
      type: this.determineActionType(actionLine),
      description: actionLine,
    };
  }

  private determineActionType(action: string): AIInsight['action']['type'] {
    if (action.toLowerCase().includes('budget')) return 'set_budget';
    if (action.toLowerCase().includes('subscription')) return 'review_subscription';
    if (action.toLowerCase().includes('consolidate')) return 'consolidate_payments';
    return 'reduce_spending';
  }

  // Additional methods for specific analyses
  async detectAnomalies(transactions: Transaction[]): Promise<AIInsight[]> {
    // Implement anomaly detection logic
    return [];
  }

  async generateSavingsSuggestions(transactions: Transaction[]): Promise<AIInsight[]> {
    // Implement savings suggestions logic
    return [];
  }

  async forecastSpending(transactions: Transaction[]): Promise<AIInsight[]> {
    // Implement spending forecast logic
    return [];
  }
}

// Export a singleton instance
export const aiService = AIService.getInstance();
