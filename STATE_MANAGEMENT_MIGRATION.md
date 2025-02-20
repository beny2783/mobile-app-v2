# State Management Migration Guide

## Current State Analysis

### Identified Issues

1. Components with excessive local state
2. Multiple contexts causing complexity
3. No centralized state management
4. Scattered business logic

## Migration Plan

### 1. Setup Redux Toolkit Infrastructure

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

export const store = configureStore({
  reducer: {
    // Core state slices
    auth: authReducer,
    ui: uiReducer,

    // Feature slices
    budget: budgetReducer,
    accounts: accountsReducer,
    transactions: transactionsReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. Create Type-Safe Hooks

```typescript
// src/store/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 3. Feature State Migration Example (Budget)

```typescript
// src/store/slices/budget/types.ts
export interface Budget {
  id: string;
  name: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  categoryId: string;
}

export interface BudgetState {
  items: Budget[];
  loading: boolean;
  error: string | null;
  selectedBudgetId: string | null;
}

// src/store/slices/budget/slice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { BudgetState } from './types';

const initialState: BudgetState = {
  items: [],
  loading: false,
  error: null,
  selectedBudgetId: null,
};

export const fetchBudgets = createAsyncThunk(
  'budget/fetchBudgets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await budgetService.getBudgets();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    selectBudget: (state, action) => {
      state.selectedBudgetId = action.payload;
    },
    clearSelectedBudget: (state) => {
      state.selectedBudgetId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});
```

### 4. Component Migration Example

Before:

```typescript
const BudgetList = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBudgets = async () => {
      setLoading(true);
      try {
        const data = await budgetService.getBudgets();
        setBudgets(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchBudgets();
  }, []);

  // ... rest of component
};
```

After:

```typescript
const BudgetList = () => {
  const dispatch = useAppDispatch();
  const { items: budgets, loading, error } = useAppSelector((state) => state.budget);

  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  // ... rest of component
};
```

## Migration Steps

### Phase 1: Infrastructure (Week 1)

1. Install dependencies:
   ```bash
   npm install @reduxjs/toolkit react-redux
   ```
2. Set up store configuration
3. Create type-safe hooks
4. Add provider to app root

### Phase 2: Feature Migration (Weeks 2-3)

1. Identify state dependencies in each feature
2. Create state slices for each feature
3. Create async thunks for API calls
4. Add selectors for state access

### Phase 3: Component Updates (Weeks 3-4)

1. Replace useState/useContext with Redux hooks
2. Update component props if needed
3. Remove unnecessary prop drilling
4. Clean up unused context providers

### Phase 4: Testing & Validation (Week 4)

1. Add unit tests for reducers
2. Add integration tests for async actions
3. Verify state updates in components
4. Performance testing

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

- [ ] Identify state dependencies
- [ ] Create/update relevant slice
- [ ] Replace local state
- [ ] Update props interface
- [ ] Add/update tests
- [ ] Verify performance
- [ ] Remove unused code

## Common Patterns

### Loading States

```typescript
// Before
const [loading, setLoading] = useState(false);

// After
const loading = useAppSelector(selectIsLoading);
```

### Error Handling

```typescript
// Before
const [error, setError] = useState(null);

// After
const error = useAppSelector(selectError);
```

### Data Fetching

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
