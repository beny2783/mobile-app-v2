import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/auth/slice';
import uiReducer from './slices/ui.slice';
import budgetReducer from './slices/budget/slice';

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  budget: budgetReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
