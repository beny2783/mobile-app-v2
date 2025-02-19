# Transaction Recategorization Feature

## Overview

Allow users to manually update the category of any transaction in their transaction list. This feature helps users maintain accurate spending categorization when the automatic categorization is incorrect.

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

### User Flow

1. User views transaction list
2. User taps category on transaction
3. Modal slides up with category options
4. User selects new category
5. User confirms selection
6. Modal slides down
7. Transaction updates with new category
8. Success feedback shown briefly

## Technical Implementation

### 1. Component Structure

```typescript
// New Components
interface TransactionCategoryModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (category: string) => Promise<void>;
  currentCategory: string;
  availableCategories: string[];
  transactionDescription: string;
}

interface TransactionListItemProps {
  transaction: DatabaseTransaction;
  onCategoryPress: () => void;
  // ... existing props
}
```

### 2. State Management

```typescript
// In TransactionsScreen
const [editingTransaction, setEditingTransaction] = useState<DatabaseTransaction | null>(null);
const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

const handleCategoryPress = (transaction: DatabaseTransaction) => {
  setEditingTransaction(transaction);
  setIsCategoryModalVisible(true);
};

const handleCategoryUpdate = async (newCategory: string) => {
  if (!editingTransaction) return;

  try {
    await repository.updateTransactionCategory(editingTransaction.id, newCategory);
    await refresh();
    // Show success feedback
  } catch (error) {
    // Show error feedback
  }

  setIsCategoryModalVisible(false);
  setEditingTransaction(null);
};
```

### 3. Repository Updates

```typescript
// In SupabaseTransactionRepository
async updateTransactionCategory(transactionId: string, category: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ transaction_category: category })
      .eq('id', transactionId);

    if (error) throw this.handleError(error);
  } catch (error) {
    throw this.handleError(error);
  }
}
```

### 4. Styling

```typescript
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  categoryItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedCategory: {
    backgroundColor: '#f0f0f0',
  },
  // ... additional styles
});
```

## Error Handling

### Types of Errors

1. Network errors during update
2. Database errors
3. Invalid category selections
4. Concurrent updates

### Error Handling Strategy

```typescript
const handleCategoryUpdate = async (newCategory: string) => {
  try {
    setIsUpdating(true);
    await repository.updateTransactionCategory(editingTransaction.id, newCategory);
    await refresh();
    showSuccessMessage('Category updated successfully');
  } catch (error) {
    showErrorMessage('Failed to update category');
    console.error('Category update failed:', error);
  } finally {
    setIsUpdating(false);
  }
};
```

## Testing Plan

### Unit Tests

```typescript
describe('TransactionCategoryModal', () => {
  it('should display all available categories', () => {
    // Test implementation
  });

  it('should highlight current category', () => {
    // Test implementation
  });

  it('should call onConfirm with selected category', () => {
    // Test implementation
  });
});

describe('updateTransactionCategory', () => {
  it('should update transaction category in database', () => {
    // Test implementation
  });

  it('should handle errors appropriately', () => {
    // Test implementation
  });
});
```

### Integration Tests

- Test full update flow
- Verify UI updates
- Test error scenarios
- Verify data persistence

## Performance Considerations

- Optimize category list rendering for large lists
- Implement proper loading states
- Cache category data when possible
- Minimize database queries

## Security Considerations

- Ensure users can only update their own transactions
- Validate category values server-side
- Maintain audit trail of category changes
- Use proper SQL injection prevention

## Future Enhancements

1. Category suggestions based on transaction patterns
2. Bulk category updates
3. Category update history
4. Custom category creation
5. Category rules management

## Dependencies

- React Native Modal
- Supabase Client
- React Navigation
- Existing repository methods

## Timeline

1. Repository updates (1 day)
2. UI Component development (2-3 days)
3. Integration and testing (2 days)
4. Bug fixes and refinements (1-2 days)
5. Documentation and code review (1 day)

Total estimated time: 7-9 days

## Rollout Strategy

1. Implement feature behind feature flag
2. Test with small user group
3. Gather feedback and metrics
4. Refine based on feedback
5. Full rollout to all users
