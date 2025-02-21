import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './slices/auth/slice';
import uiReducer from './slices/ui.slice';
import accountsReducer from './slices/accountsSlice';
import budgetReducer from './slices/budget/slice';
import trueLayerReducer from './slices/trueLayerSlice';
import transactionsReducer from './slices/transactions/transactionsSlice';

export const store = configureStore({
  reducer: {
    // Core state slices
    auth: authReducer,
    ui: uiReducer,

    // Feature slices
    accounts: accountsReducer,
    budget: budgetReducer,
    trueLayer: trueLayerReducer,
    transactions: transactionsReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
