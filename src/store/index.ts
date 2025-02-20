import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import uiReducer from './slices/ui.slice';
import authReducer from './slices/auth/slice';
import budgetReducer from './slices/budget/slice';

// We'll add reducers as we create them
const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    budget: budgetReducer,
    // Other reducers will be added here as we create them
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
