import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getTrueLayerService } from '../../services/trueLayer/TrueLayerServiceSingleton';
import type { RootState } from '../index';
import type { ITrueLayerApiService } from '../../services/trueLayer/types';

interface TrueLayerState {
  loading: boolean;
  error: string | null;
}

const initialState: TrueLayerState = {
  loading: false,
  error: null,
};

// Initialize service
const trueLayerService = getTrueLayerService();

// Async Thunks
export const getAuthUrl = createAsyncThunk('trueLayer/getAuthUrl', async () => {
  return trueLayerService.getAuthUrl();
});

export const exchangeCode = createAsyncThunk('trueLayer/exchangeCode', async (code: string) => {
  await trueLayerService.exchangeCode(code);
});

const trueLayerSlice = createSlice({
  name: 'trueLayer',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAuthUrl.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAuthUrl.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(getAuthUrl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get auth URL';
      })
      .addCase(exchangeCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exchangeCode.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exchangeCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to exchange code';
      });
  },
});

// Export actions
export const { clearError } = trueLayerSlice.actions;

// Export selectors
export const selectTrueLayerLoading = (state: RootState) => state.trueLayer.loading;
export const selectTrueLayerError = (state: RootState) => state.trueLayer.error;

// Export service for repositories
export const getTrueLayerApiService = (): ITrueLayerApiService => trueLayerService;

export default trueLayerSlice.reducer;
