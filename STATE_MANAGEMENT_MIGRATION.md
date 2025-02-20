# State Management Migration Guide

## Current State Analysis ✅

### Identified Issues

1. Components with excessive local state
2. Multiple contexts causing complexity
3. No centralized state management
4. Scattered business logic

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

#### Pending Features

- Budget Slice
  - Budget tracking
  - Budget categories
  - Budget limits
- Accounts Slice
  - Bank connections
  - Account balances
  - Account metadata
- Transactions Slice
  - Transaction history
  - Transaction categories
  - Transaction search/filter

### 4. Component Migration Progress

#### Completed Components ✅

- AuthScreen
- GlobalLoadingIndicator
- HomeHeader
- MainScreen
- ProfileScreen

#### Pending Components

- BudgetList
- TransactionList
- AccountList
- CategorySelectionModal
- TransactionFilters

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
- [ ] Create/update budget slice
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

- **Status**: 🔄 In Progress
- **Dependencies**:
  - Transaction data
  - Category management
  - User preferences
- **Will Replace**:
  - `src/hooks/useTargets.ts`
  - `src/contexts/BudgetContext.tsx`
  - Budget-related state in components:
    - `src/components/BudgetList.tsx`
    - `src/components/BudgetCard.tsx`
    - `src/screens/BudgetScreen.tsx`

### 2. Accounts Slice

- **Status**: 📝 Planned
- **Dependencies**:
  - Bank connection data
  - Balance information
  - Account metadata
- **Will Replace**:
  - `src/contexts/ServiceContext.tsx` (partially)
  - `src/hooks/useBankConnections.ts`
  - Account-related state in:
    - `src/screens/ConnectBankScreen.tsx`
    - `src/components/AccountList.tsx`
    - `src/components/AccountCard.tsx`

### 3. Transactions Slice

- **Status**: 📝 Planned
- **Dependencies**:
  - Transaction history
  - Categories
  - Search/filter preferences
- **Will Replace**:
  - `src/services/trueLayer/transaction/TrueLayerTransactionService.ts`
  - `src/contexts/TransactionContext.tsx`
  - Transaction-related state in:
    - `src/screens/TransactionsScreen.tsx`
    - `src/components/TransactionList.tsx`
    - `src/components/TransactionFilters.tsx`

### 4. Subscription Management

- **Status**: 📝 Planned
- **Dependencies**:
  - User subscription status
  - Feature flags
  - Payment processing
- **Will Replace**:
  - `src/contexts/SubscriptionContext.tsx`
  - Subscription-related state in:
    - `src/screens/SubscriptionScreen.tsx`
    - `src/components/SubscriptionCard.tsx`

## Code Removal Checklist

### Phase 1: Context API Removal

- [ ] `src/contexts/BudgetContext.tsx`
- [ ] `src/contexts/TransactionContext.tsx`
- [ ] `src/contexts/ServiceContext.tsx`
- [ ] `src/contexts/SubscriptionContext.tsx`

### Phase 2: Custom Hooks Removal/Refactor

- [ ] `src/hooks/useTargets.ts`
- [ ] `src/hooks/useBankConnections.ts`
- [ ] `src/hooks/useTransactions.ts`
- [ ] Refactor remaining hooks to use Redux

### Phase 3: Service Layer Updates

- [ ] Refactor `TrueLayerTransactionService` to work with Redux
- [ ] Update repository patterns to support Redux integration
- [ ] Remove redundant state management in services

### Phase 4: Component Cleanup

- [ ] Remove local state management from all feature components
- [ ] Clean up prop drilling in component tree
- [ ] Remove unused prop interfaces
- [ ] Update component tests to use Redux store

## Migration Progress Tracking

### Completed ✅

- Auth state management
- UI state management
- Global loading indicators
- Error handling patterns

### In Progress 🔄

- Budget slice implementation
- Component migration to Redux
- Test coverage updates

### Pending 📝

- Accounts slice implementation
- Transactions slice implementation
- Subscription management
- Performance optimization
- E2E testing updates

## Code Quality Metrics

Track the following metrics during migration:

1. Bundle size impact
2. Test coverage percentage
3. Number of prop drilling instances
4. Component render performance
5. State update performance
