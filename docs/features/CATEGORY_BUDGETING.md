# Category Budgeting Feature

## Overview

The Category Budgeting feature allows users to set and track budgets based on their transaction categories. This feature integrates with the existing transaction categorization system to provide meaningful budget tracking and insights.

## Core Functionality

### 1. Budget Setting

- Users can set monthly budgets for any transaction category
- Budgets are linked to the same categories used in transaction categorization
- Default categories include:
  - Bills & Utilities
  - Transport
  - Shopping
  - Groceries
  - Food & Drink
  - Entertainment
  - Health
  - Other

### 2. Budget Tracking

- Real-time tracking of spending against category budgets
- Visual indicators of budget status:
  - Green: Under budget (<80%)
  - Yellow: Approaching budget (80-100%)
  - Red: Over budget (>100%)
- Progress bars showing:
  - Amount spent vs budget
  - Percentage of budget used
  - Days remaining in the period

### 3. Insights and Analytics

- Month-over-month category spending comparisons
- Spending trend analysis
- Alerts for:
  - Categories approaching budget limits
  - Unusual spending patterns
  - Categories without set budgets but with regular transactions

## Technical Implementation

### Existing Infrastructure

#### Database Tables

1. **category_targets**

```sql
CREATE TABLE category_targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category TEXT NOT NULL,
    target_limit DECIMAL NOT NULL CHECK (target_limit >= 0),
    current_amount DECIMAL NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    color TEXT NOT NULL,
    min_limit DECIMAL NOT NULL CHECK (min_limit >= 0),
    max_limit DECIMAL NOT NULL CHECK (max_limit >= min_limit),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_user_category UNIQUE(user_id, category)
);
```

2. **merchant_categories** (for transaction categorization)

```sql
CREATE TABLE merchant_categories (
    id UUID DEFAULT uuid_generate_v4() NOT NULL,
    merchant_pattern TEXT NOT NULL,
    category TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(merchant_pattern, user_id)
);
```

#### TypeScript Interfaces

```typescript
interface CategoryTarget {
  id: string;
  user_id: string;
  category: string;
  target_limit: number;
  current_amount: number;
  color: string;
  min_limit: number;
  max_limit: number;
  created_at: string;
  updated_at: string;
}

interface CategoryBudgetSummary {
  category: string;
  budgetAmount: number;
  currentSpending: number;
  percentageUsed: number;
  transactions: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}
```

### Repository Methods

The `TargetRepository` interface provides methods for:

- `getCategoryTargets(userId: string): Promise<CategoryTarget[]>`
- `getCategoryTargetByCategory(userId: string, category: string): Promise<CategoryTarget | null>`
- `createCategoryTarget(target: CreateCategoryTargetInput): Promise<CategoryTarget>`
- `updateCategoryTarget(userId: string, category: string, target: UpdateCategoryTargetInput): Promise<CategoryTarget>`
- `deleteCategoryTarget(userId: string, category: string): Promise<void>`

## UI Components

### 1. Category Budget List

- List of all categories with:
  - Category name and icon
  - Current spending / Budget amount
  - Progress bar
  - Trend indicator
- Quick actions:
  - Set/Edit budget
  - View transactions
  - View detailed analytics

### 2. Budget Setting Modal

- Category selection (from existing merchant categories)
- Budget amount input with:
  - Minimum limit
  - Target limit
  - Maximum limit
- Color selection for visual identification
- Suggested amount based on historical spending

### 3. Category Detail View

- Detailed spending breakdown
- Transaction list filtered by category
- Monthly trend chart
- Budget adjustment controls

## User Flow

1. **Initial Setup**

   - User navigates to Target page
   - Views list of transaction categories
   - Sets budgets for desired categories

2. **Regular Usage**

   - Monitor category spending
   - Receive notifications for budget thresholds
   - Adjust budgets as needed
   - View spending insights

3. **Budget Adjustment**
   - Click on category to view details
   - Adjust budget based on insights
   - Set min/max limits for flexibility

## Integration Points

### 1. Transaction System

- Uses existing merchant categorization
- Updates category spending in real-time
- Maintains category mapping consistency

### 2. Notification System

- Budget threshold alerts
- Weekly spending summaries
- Trend notifications

### 3. Analytics System

- Spending pattern analysis
- Budget vs actual comparisons
- Category-specific insights

## Implementation Phases

### Phase 1: Core Budgeting

- Implement budget setting UI using existing infrastructure
- Add real-time spending tracking
- Create basic budget vs actual visualizations

### Phase 2: Enhanced Insights

- Add trend analysis
- Implement notification system
- Create detailed analytics views

### Phase 3: Smart Features

- Add AI-powered suggestions
- Implement predictive analytics
- Add social comparison features

## Success Metrics

1. **User Engagement**

   - Number of categories with budgets set
   - Frequency of budget adjustments
   - Time spent reviewing budgets

2. **Budget Effectiveness**

   - Percentage of categories within budget
   - Reduction in overspending
   - Budget adjustment patterns

3. **User Satisfaction**
   - Feature usage statistics
   - User feedback and ratings
   - Support ticket analysis
