import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import accountsReducer from './slices/accountsSlice';
import authReducer from './slices/auth/slice';
import budgetReducer from './slices/budget/slice';
import uiReducer from './slices/ui.slice';
import trueLayerReducer from './slices/trueLayerSlice';

export const store = configureStore({
  reducer: {
    // Core state slices
    auth: authReducer,
    ui: uiReducer,

    // Feature slices
    accounts: accountsReducer,
    budget: budgetReducer,
    trueLayer: trueLayerReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
