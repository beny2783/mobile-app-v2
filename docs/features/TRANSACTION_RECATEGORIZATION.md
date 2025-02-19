# Transaction Recategorization Feature

## Overview

Allow users to manually update the category of any transaction in their transaction list. This feature helps users maintain accurate spending categorization when the automatic categorization is incorrect. The system learns from user preferences to improve future categorization.

## Current Implementation

- Transactions are automatically categorized based on merchant patterns
- Categories are stored in `merchant_categories` table
- Transaction categories are stored in `transactions.transaction_category`
- Repository method `updateTransactionCategory` exists but needs updating

## UI/UX Requirements

### Transaction List Item Updates

- Add category edit functionality to each transaction item
- Visual indicator that category is editable (e.g., small edit icon)
- Maintain current transaction information display:
  - Date
  - Description
  - Amount
  - Current category

### Category Selection Modal

- Full-screen modal with semi-transparent background
- List of available categories
- Current category highlighted
- Smooth entrance/exit animations
- Clear confirmation and cancel actions
- Options for update scope (single/all/future)

### User Flow

1. User views transaction list
2. User taps category on transaction
3. Modal slides up with category options
4. User selects new category
5. User chooses update scope:
   - Update single transaction
   - Update all similar transactions
   - Update and remember for future transactions
6. User confirms selection
7. Modal slides down
8. Transaction(s) update with new category
9. Success feedback shown briefly

## Technical Implementation

### 1. Component Structure

```typescript
interface TransactionCategoryModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (category: string, updateScope: UpdateScope) => Promise<void>;
  currentCategory: string;
  availableCategories: string[];
  transactionDescription: string;
}

enum UpdateScope {
  SINGLE = 'single',
  ALL_SIMILAR = 'all_similar',
  REMEMBER_FUTURE = 'remember_future',
}
```

### 2. State Management

```typescript
interface CategoryUpdateOptions {
  updatePattern?: boolean;
  updateSimilarTransactions?: boolean;
}

const handleCategoryUpdate = async (newCategory: string, updateScope: UpdateScope) => {
  const options: CategoryUpdateOptions = {
    updatePattern: updateScope === UpdateScope.REMEMBER_FUTURE,
    updateSimilarTransactions: updateScope === UpdateScope.ALL_SIMILAR,
  };

  await repository.updateTransactionCategory(editingTransaction.id, newCategory, options);
};
```

### 3. Learning System Implementation

The system learns from user categorization preferences in three ways:

1. **Single Transaction Update**

   - Updates only the selected transaction
   - Maintains unique categorization for special cases

2. **Similar Transaction Update**

   - Updates all transactions with the same merchant name
   - Ensures consistency across user's transaction history
   - Useful for bulk correction of miscategorized transactions

3. **Pattern Learning**
   - Creates or updates merchant patterns in `merchant_categories`
   - Applies to future transactions automatically
   - Builds personalized categorization rules

```typescript
interface MerchantPattern {
  category: string;
  merchant_pattern: string;
  user_id: string;
  confidence: number;
  last_used: string;
}
```

### 4. Database Schema Updates

```sql
-- Add new columns to merchant_categories
ALTER TABLE merchant_categories
ADD COLUMN confidence DECIMAL DEFAULT 1.0,
ADD COLUMN last_used TIMESTAMP WITH TIME ZONE,
ADD COLUMN update_count INTEGER DEFAULT 0;
```

### 5. Repository Updates

```typescript
async updateTransactionCategory(
  transactionId: string,
  newCategory: string,
  options: CategoryUpdateOptions = {}
): Promise<void> {
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('transaction_id', transactionId)
    .single();

  // Update current transaction
  await supabase
    .from('transactions')
    .update({
      transaction_category: newCategory,
      transaction_type: newCategory
    })
    .eq('transaction_id', transactionId);

  // Update pattern for future transactions
  if (options.updatePattern) {
    await updateMerchantPattern(transaction, newCategory);
  }

  // Update similar transactions
  if (options.updateSimilarTransactions) {
    await updateSimilarTransactions(transaction, newCategory);
  }
}
```

## Error Handling

### Types of Errors

1. Network errors during update
2. Database errors
3. Invalid category selections
4. Concurrent updates
5. Pattern conflicts

### Error Handling Strategy

```typescript
try {
  setIsUpdating(true);
  await repository.updateTransactionCategory(editingTransaction.id, newCategory, options);
  await refresh();
  showSuccessMessage('Category updated successfully');
} catch (error) {
  showErrorMessage('Failed to update category');
  console.error('Category update failed:', error);
} finally {
  setIsUpdating(false);
}
```

## Performance Considerations

- Optimize category list rendering for large lists
- Implement proper loading states
- Cache category data when possible
- Minimize database queries
- Batch similar transaction updates
- Index merchant patterns for quick lookup

## Security Considerations

- Ensure users can only update their own transactions
- Validate category values server-side
- Maintain audit trail of category changes
- Use proper SQL injection prevention
- Rate limit pattern updates

## Future Enhancements

1. Category suggestions based on transaction patterns
2. Bulk category updates
3. Category update history
4. Custom category creation
5. Category rules management
6. Machine learning for pattern recognition
7. Confidence scoring for automatic categorization
8. User feedback on automatic categorization
9. Category update analytics
10. Pattern sharing between users (opt-in)

## Dependencies

- React Native Modal
- Supabase Client
- React Navigation
- Existing repository methods

## Timeline

1. Repository updates (2 days)
2. Database schema updates (1 day)
3. UI Component development (2-3 days)
4. Learning system implementation (2-3 days)
5. Integration and testing (2-3 days)
6. Bug fixes and refinements (1-2 days)
7. Documentation and code review (1 day)

Total estimated time: 11-15 days

## Rollout Strategy

1. Implement feature behind feature flag
2. Test with small user group
3. Gather feedback and metrics
4. Monitor pattern learning accuracy
5. Refine based on feedback
6. Gradual rollout to all users
7. Monitor system performance
8. Collect usage analytics

## Success Metrics

1. Reduction in manual categorization needs
2. Increase in categorization accuracy
3. User satisfaction with automatic categorization
4. Pattern learning effectiveness
5. System performance metrics
