import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createTargetRepository } from '../../../repositories/target';
import type { BudgetState, CreateCategoryTargetInput, UpdateCategoryTargetInput } from './types';
import type { CategoryTarget } from '../../../types/target';

const targetRepository = createTargetRepository();

const initialState: BudgetState = {
  categoryTargets: [],
  targetSummary: null,
  loading: false,
  error: null,
};

// Async Thunks
export const fetchCategoryTargets = createAsyncThunk(
  'budget/fetchCategoryTargets',
  async (userId: string, { rejectWithValue }) => {
    try {
      console.log('[BudgetSlice] Fetching category targets for user:', userId);
      const targets = await targetRepository.getCategoryTargets(userId);
      console.log('[BudgetSlice] Fetched targets:', {
        count: targets.length,
        targets: targets.map((t) => ({
          category: t.category,
          amount: t.current_amount,
          limit: t.target_limit,
        })),
      });
      return targets;
    } catch (error: any) {
      console.error('[BudgetSlice] Error fetching targets:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTargetSummary = createAsyncThunk(
  'budget/fetchTargetSummary',
  async (userId: string, { rejectWithValue }) => {
    try {
      console.log('[BudgetSlice] Fetching target summary for user:', userId);
      const summary = await targetRepository.getTargetSummary(userId);
      console.log('[BudgetSlice] Fetched summary:', summary);
      return summary;
    } catch (error: any) {
      console.error('[BudgetSlice] Error fetching summary:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const createCategoryTarget = createAsyncThunk(
  'budget/createCategoryTarget',
  async (target: CreateCategoryTargetInput, { rejectWithValue }) => {
    try {
      console.log('[BudgetSlice] Creating category target:', target);
      const newTarget = await targetRepository.createCategoryTarget(target);
      console.log('[BudgetSlice] Created target:', newTarget);
      return newTarget;
    } catch (error: any) {
      console.error('[BudgetSlice] Error creating target:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const updateCategoryTarget = createAsyncThunk(
  'budget/updateCategoryTarget',
  async (
    {
      userId,
      category,
      updates,
    }: { userId: string; category: string; updates: UpdateCategoryTargetInput },
    { rejectWithValue }
  ) => {
    try {
      console.log('[BudgetSlice] Updating category target:', { category, updates });
      const updatedTarget = await targetRepository.updateCategoryTarget(userId, category, updates);
      console.log('[BudgetSlice] Updated target:', updatedTarget);
      return updatedTarget;
    } catch (error: any) {
      console.error('[BudgetSlice] Error updating target:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCategoryTarget = createAsyncThunk(
  'budget/deleteCategoryTarget',
  async ({ userId, category }: { userId: string; category: string }, { rejectWithValue }) => {
    try {
      console.log('[BudgetSlice] Deleting category target:', { userId, category });
      await targetRepository.deleteCategoryTarget(userId, category);
      console.log('[BudgetSlice] Deleted target:', category);
      return category;
    } catch (error: any) {
      console.error('[BudgetSlice] Error deleting target:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Slice
export const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Category Targets
    builder
      .addCase(fetchCategoryTargets.pending, (state) => {
        console.log('[BudgetSlice] fetchCategoryTargets.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryTargets.fulfilled, (state, action) => {
        console.log('[BudgetSlice] fetchCategoryTargets.fulfilled:', {
          targetsCount: action.payload.length,
          targets: action.payload.map((t) => ({ category: t.category, amount: t.current_amount })),
        });
        state.loading = false;
        state.categoryTargets = action.payload;
      })
      .addCase(fetchCategoryTargets.rejected, (state, action) => {
        console.log('[BudgetSlice] fetchCategoryTargets.rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Target Summary
    builder
      .addCase(fetchTargetSummary.pending, (state) => {
        console.log('[BudgetSlice] fetchTargetSummary.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTargetSummary.fulfilled, (state, action) => {
        console.log('[BudgetSlice] fetchTargetSummary.fulfilled:', action.payload);
        state.loading = false;
        state.targetSummary = action.payload;
      })
      .addCase(fetchTargetSummary.rejected, (state, action) => {
        console.log('[BudgetSlice] fetchTargetSummary.rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Category Target
    builder
      .addCase(createCategoryTarget.pending, (state) => {
        console.log('[BudgetSlice] createCategoryTarget.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategoryTarget.fulfilled, (state, action) => {
        console.log('[BudgetSlice] createCategoryTarget.fulfilled:', action.payload);
        state.loading = false;
        state.categoryTargets.push(action.payload);
      })
      .addCase(createCategoryTarget.rejected, (state, action) => {
        console.log('[BudgetSlice] createCategoryTarget.rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Category Target
    builder
      .addCase(updateCategoryTarget.pending, (state) => {
        console.log('[BudgetSlice] updateCategoryTarget.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategoryTarget.fulfilled, (state, action) => {
        console.log('[BudgetSlice] updateCategoryTarget.fulfilled:', action.payload);
        state.loading = false;
        state.categoryTargets = state.categoryTargets.map((target) =>
          target.category === action.payload.category ? action.payload : target
        );
      })
      .addCase(updateCategoryTarget.rejected, (state, action) => {
        console.log('[BudgetSlice] updateCategoryTarget.rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Category Target
    builder
      .addCase(deleteCategoryTarget.pending, (state) => {
        console.log('[BudgetSlice] deleteCategoryTarget.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategoryTarget.fulfilled, (state, action) => {
        console.log('[BudgetSlice] deleteCategoryTarget.fulfilled:', action.payload);
        state.loading = false;
        state.categoryTargets = state.categoryTargets.filter(
          (target) => target.category !== action.payload
        );
      })
      .addCase(deleteCategoryTarget.rejected, (state, action) => {
        console.log('[BudgetSlice] deleteCategoryTarget.rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = budgetSlice.actions;
export default budgetSlice.reducer;
