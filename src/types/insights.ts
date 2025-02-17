export interface AIInsight {
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
