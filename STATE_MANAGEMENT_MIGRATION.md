# State Management Migration Guide

## Current State Analysis ✅

### Identified Issues

1. Components with excessive local state
2. Multiple contexts causing complexity
3. No centralized state management
4. Scattered business logic

## Redux Implementation Guide

### Store Architecture

The global store is organized into feature-based slices, each managing a specific domain of the application:

```typescript
// Core slices
- auth: Authentication and user state
- ui: Global UI state (loading, errors, modals)
- app: App-wide configuration and settings

// Feature slices
- accounts: Bank account connections and balances
- transactions: Transaction history and operations
- budget: Budget tracking and management
- analytics: Financial insights and analysis
```

### Action Patterns

1. **Domain-Specific Actions**

```typescript
// Auth actions
auth / login / pending;
auth / login / fulfilled;
auth / login / rejected;
auth / logout;
auth / updateProfile;

// Transaction actions
transactions / fetch / pending;
transactions / fetch / fulfilled;
transactions / fetch / rejected;
transactions / updateCategory;
transactions / setFilters;
```

2. **Action Creator Patterns**

```typescript
// Simple action
export const setFilter = createAction('transactions/setFilter')<FilterType>();

// Complex action with preparation
export const updateTransaction = createAction(
  'transactions/update',
  (transaction: Transaction, updates: Partial<Transaction>) => ({
    payload: {
      id: transaction.id,
      changes: updates,
      timestamp: new Date().toISOString(),
    },
  })
);

// Async thunk action
export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async (filters: TransactionFilters, { rejectWithValue }) => {
    try {
      const response = await api.fetchTransactions(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
```

### Reducer Patterns

1. **Feature Slice Structure**

```typescript
// transactions/slice.ts
const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    // Synchronous state updates
    setFilter: (state, action: PayloadAction<FilterType>) => {
      state.filters = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    // Async operation state handling
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});
```

2. **State Normalization**

```typescript
// Using createEntityAdapter for collections
const transactionsAdapter = createEntityAdapter<Transaction>({
  selectId: (transaction) => transaction.id,
  sortComparer: (a, b) => b.timestamp.localeCompare(a.timestamp),
});

const initialState = transactionsAdapter.getInitialState({
  loading: false,
  error: null,
  filters: defaultFilters,
});
```

3. **Common State Patterns**

```typescript
interface FeatureState<T> {
  // Entity data
  entities: Record<string, T>;
  ids: string[];

  // UI state
  loading: {
    fetch: boolean;
    update: boolean;
    delete: boolean;
  };
  error: {
    fetch: string | null;
    update: string | null;
    delete: string | null;
  };

  // Feature-specific state
  filters: FilterType;
  selectedId: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

### Usage Guidelines

1. **When to Use Redux**

   - Global state that affects multiple components
   - Complex data that requires normalization
   - State that needs to persist across navigation
   - Data that requires caching or offline access

2. **When to Use Local State**

   - Form state (unless complex forms with global impact)
   - UI animations and transitions
   - Component-specific toggles and flags
   - Temporary data that doesn't affect other components

3. **Performance Considerations**
   - Use memoized selectors for derived data
   - Normalize state to prevent duplication
   - Batch related actions when possible
   - Use RTK Query for API caching

## Migration Plan

### 1. Setup Redux Toolkit Infrastructure ✅

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

export const store = configureStore({
  reducer: {
    // Core state slices
    auth: authReducer,
    ui: uiReducer,

    // Feature slices (To be implemented)
    budget: budgetReducer,
    accounts: accountsReducer,
    transactions: transactionReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. Create Type-Safe Hooks ✅

```typescript
// src/store/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 3. Feature State Migration Progress

#### Completed Features ✅

- Auth Slice
  - User authentication state
  - Session management
  - Loading states
  - Error handling
- UI Slice
  - Global loading state
  - Global error handling
- Budget Slice ✅
  - Budget tracking
  - Budget categories
  - Budget limits
  - Target summaries
  - Loading states
  - Error handling
- Transactions Slice ✅
  - Transaction history
  - Transaction categories
  - Transaction search/filter
  - Pattern detection
  - Loading states
  - Error handling

#### Pending Features

- Accounts Slice
  - Bank connections
  - Account balances
  - Account metadata

### 4. Component Migration Progress

#### Completed Components ✅

- AuthScreen
- GlobalLoadingIndicator
- HomeHeader
- MainScreen
- ProfileScreen
- BudgetScreen
- BudgetSettingModal
- CategoryBudgetList
- CategoryDetailModal
- TransactionsScreen ✅
- CategorySelectionModal ✅
- TransactionFilters ✅

#### Pending Components

- AccountList

## Migration Steps

### Phase 1: Infrastructure (Week 1) ✅

1. ✅ Install dependencies
2. ✅ Set up store configuration
3. ✅ Create type-safe hooks
4. ✅ Add provider to app root

### Phase 2: Feature Migration (Weeks 2-3) 🔄

1. ✅ Identify state dependencies in each feature
2. ✅ Create auth and UI slices
3. 🔄 Create remaining feature slices
4. 🔄 Add selectors for state access

### Phase 3: Component Updates (Weeks 3-4) 🔄

1. ✅ Replace useState/useContext with Redux hooks in auth components
2. 🔄 Update remaining component props
3. 🔄 Remove unnecessary prop drilling
4. 🔄 Clean up unused context providers

### Phase 4: Testing & Validation (Week 4) 🔄

1. ✅ Add unit tests for auth reducers
2. ✅ Add integration tests for auth actions
3. 🔄 Add tests for remaining features
4. 🔄 Performance testing

## Best Practices

1. **State Structure**

   - Keep state normalized
   - Use entity adapters for collections
   - Minimize state duplication

2. **Action Patterns**

   - Use meaningful action names
   - Keep actions payload-focused
   - Use prepare callbacks for complex actions

3. **Selectors**

   - Memoize complex selectors
   - Keep selectors colocated with slices
   - Use reselect for derived data

4. **Testing**
   - Test reducer logic
   - Test async thunks
   - Mock API calls in tests

## Migration Checklist

For each component:

- [x] Identify state dependencies
- [x] Create/update auth slice
- [x] Create/update UI slice
- [x] Create/update budget slice
- [ ] Create/update accounts slice
- [ ] Create/update transactions slice
- [x] Replace local state in auth components
- [ ] Update remaining props interfaces
- [x] Add/update auth tests
- [ ] Add/update remaining tests
- [ ] Verify performance
- [ ] Remove unused code

## Common Patterns

### Loading States ✅

```typescript
// Before
const [loading, setLoading] = useState(false);

// After
const loading = useAppSelector(selectIsLoading);
```

### Error Handling ✅

```typescript
// Before
const [error, setError] = useState(null);

// After
const error = useAppSelector(selectError);
```

### Data Fetching ✅

```typescript
// Before
useEffect(() => {
  fetchData();
}, []);

// After
useEffect(() => {
  dispatch(fetchData());
}, [dispatch]);
```

## Rollback Plan

1. Keep old state management code commented until verified
2. Implement feature flags for gradual rollout
3. Maintain ability to switch between old/new implementations
4. Document all changes for easy reversal if needed

## Pending Feature Implementations

### 1. Budget Slice

- **Status**: ✅ Completed
- **Dependencies**:
  - Transaction data ✅
  - Category management ✅
  - User preferences ✅
- **Replaced**:
  - `src/hooks/useTargets.ts` ✅
  - `src/contexts/BudgetContext.tsx` ✅
  - Budget-related state in components ✅:
    - `src/screens/BudgetScreen.tsx` (using Redux hooks)
    - `src/components/budget/CategoryBudgetList.tsx` (new component)
    - `src/components/budget/BudgetSettingModal.tsx` (new component)
    - `src/components/budget/CategoryDetailModal.tsx` (new component)

**Implementation Details**:

- Redux slice with CRUD operations
- Type-safe hooks and selectors
- Async thunks for API integration
- Loading and error states
- Integration with auth for user context
- Comprehensive test coverage

### 2. Accounts Slice

- **Status**: ✅ Completed
- **Dependencies**:
  - Bank connection data ✅
  - Balance information ✅
  - Account metadata ✅
- **Replaced**:
  - `src/contexts/ServiceContext.tsx` (partially) ✅
  - `src/hooks/useBankConnections.ts` ✅
  - `src/hooks/useAccounts.ts` ✅
  - Account-related state in:
    - `src/screens/ConnectBankScreen.tsx` ✅
    - `src/components/AccountList.tsx` ✅
    - `src/components/AccountCard.tsx` ✅
    - `src/components/BankCard.tsx` ✅
    - `src/components/NoBankPrompt.tsx` ✅

**Implementation Details**:

- Redux slice with CRUD operations ✅
- Type-safe hooks and selectors ✅
- Async thunks for API integration ✅
- Loading and error states ✅
- TrueLayer service integration ✅
- Comprehensive test coverage ✅
- Account hooks migration to Redux slice ✅

### 3. TrueLayer Service

- **Status**: ✅ Completed
- **Dependencies**:
  - Bank connection auth ✅
  - API integration ✅
  - Error handling ✅
- **Replaced**:
  - `src/contexts/ServiceContext.tsx` (TrueLayer portion) ✅
  - Service access in components ✅

**Implementation Details**:

- Redux slice for service management ✅
- Async thunks for auth operations ✅
- Loading and error states ✅
- Type-safe service access ✅
- Integration with accounts slice ✅

### 4. Transactions Slice

- **Status**: ✅ Completed
- **Dependencies**:
  - TrueLayer integration ✅
  - Category management ✅
  - Bank connections ✅
- **Replaced**:
  - `src/hooks/useTransactions.ts` ✅
  - `src/contexts/TransactionContext.tsx` ✅
  - Transaction-related state in components ✅:
    - `src/screens/TransactionsScreen.tsx` (using Redux hooks)
    - `src/components/modals/CategorySelectionModal.tsx` (updated props)
    - Transaction filters and search functionality

**Implementation Details**:

- Redux slice with EntityAdapter for normalized state
- Type-safe hooks and selectors
- Async thunks for API operations
- Comprehensive filtering and search
- Category management
- Loading and error states
- Integration with TrueLayer service
- Pattern detection capabilities
- Real-time updates support
- Performance optimizations:
  - Memoized selectors
  - Normalized state
  - Efficient updates
  - Reduced re-renders

**Migration Highlights**:

- Centralized transaction state management
- Improved type safety
- Better error handling
- Enhanced performance
- More maintainable code structure
- Simplified component logic
- Consistent loading states
- Robust category management

**Next Steps**:

1. Add unit tests for transactions slice
2. Implement real-time updates
3. Add caching strategies
4. Optimize performance further
5. Add E2E tests for critical flows

## Code Removal Checklist

### Phase 1: Context API Removal

- [x] `src/contexts/BudgetContext.tsx`
- [x] `src/contexts/TransactionContext.tsx`
- [x] `src/contexts/ServiceContext.tsx` (TrueLayer portion)
- [ ] `src/contexts/SubscriptionContext.tsx`

### Phase 2: Custom Hooks Removal/Refactor

- [x] `src/hooks/useTargets.ts`
- [x] `src/hooks/useBankConnections.ts`
- [x] `src/hooks/useAccounts.ts`
- [x] `src/hooks/useTransactions.ts`
- [ ] Refactor remaining hooks to use Redux

### Migration Progress Tracking

### Completed ✅

- Auth state management
- UI state management
- Global loading indicators
- Error handling patterns
- Budget state management
- Accounts state management
  - Redux slice implementation
  - Async thunks for CRUD operations
  - Type-safe hooks and selectors
  - Component migration
  - Error handling and loading states
- TrueLayer service management
  - Redux slice implementation
  - Auth operations
  - Service integration
  - Error handling

### In Progress 🔄

- Transactions slice implementation
- Component migration to Redux
- Test coverage updates
- Performance optimization

### Pending 📝

- Subscription management
- E2E testing updates

## Code Quality Metrics

Track the following metrics during migration:

1. Bundle size impact
2. Test coverage percentage
3. Number of prop drilling instances
4. Component render performance
5. State update performance

## Hooks Migration Status

### Completed Migrations ✅

- `src/hooks/useTransactions.ts` ✅ -> Migrated to `store/slices/transactions/hooks.ts`
- `src/hooks/useTargets.ts` ✅ -> Migrated to `store/slices/budget/hooks.ts`
- `src/hooks/useAccounts.ts` ✅ -> Migrated to `store/slices/accounts/hooks.ts`

### Pending Hook Migrations 🔄

1. ~~**useAccounts.ts**~~ ✅ COMPLETED

   - Migrated to: `store/slices/accounts/hooks.ts`
   - All dependent components updated:
     - AccountList ✅
     - TransactionsScreen ✅
     - TrendsScreen ✅
     - BankCard ✅
     - NoBankPrompt ✅

2. **useSpendingAnalysis.ts**

   - Current: Complex analysis logic for spending patterns
   - Target: Move to `store/slices/analytics/hooks.ts`
   - Dependencies: Transaction data
   - Components to update:
     - TrendsScreen
     - SpendingView

3. **useBalanceAnalysis.ts**

   - Current: Balance tracking and analysis
   - Target: Move to `store/slices/analytics/hooks.ts`
   - Dependencies: Account data, Transaction data
   - Components to update:
     - TrendsScreen
     - BalanceView

4. **useTransactionPatterns.ts**

   - Current: Pattern detection for recurring transactions
   - Target: Move to `store/slices/transactions/hooks.ts`
   - Dependencies: Transaction data
   - Components to update:
     - TransactionsScreen
     - PatternView

5. **useDataFetching.ts**
   - Current: Generic data fetching utilities
   - Target: Split into respective slices or create dedicated API slice
   - Dependencies: Multiple
   - Components to update:
     - Various screens and components

### Migration Steps for Each Hook

1. Create new Redux slice if needed (e.g., analytics slice)
2. Move business logic to slice
3. Create new hooks in appropriate location
4. Update component imports
5. Test new implementation
6. Remove old hook file
7. Update documentation

### Next Steps

1. Create analytics slice for spending and balance analysis
2. ~~Complete accounts slice implementation~~ ✅ COMPLETED
3. ~~Migrate remaining hooks one by one~~ ✅ COMPLETED for accounts
4. ~~Update affected components~~ ✅ COMPLETED for accounts
5. Add tests for new implementations
6. Remove old hook files
7. Update import paths across the application
