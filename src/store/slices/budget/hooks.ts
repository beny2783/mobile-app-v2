import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  fetchCategoryTargets,
  fetchTargetSummary,
  createCategoryTarget,
  updateCategoryTarget,
  deleteCategoryTarget,
  clearError,
} from './slice';
import type { CreateCategoryTargetInput, UpdateCategoryTargetInput } from './types';

export const useBudgetState = () => {
  return useAppSelector((state) => state.budget);
};

export const useBudgetActions = () => {
  const dispatch = useAppDispatch();

  const fetchTargets = useCallback(
    async (userId: string) => {
      return await dispatch(fetchCategoryTargets(userId)).unwrap();
    },
    [dispatch]
  );

  const fetchSummary = useCallback(
    async (userId: string) => {
      return await dispatch(fetchTargetSummary(userId)).unwrap();
    },
    [dispatch]
  );

  const createTarget = useCallback(
    async (target: CreateCategoryTargetInput) => {
      return await dispatch(createCategoryTarget(target)).unwrap();
    },
    [dispatch]
  );

  const updateTarget = useCallback(
    async (userId: string, category: string, updates: UpdateCategoryTargetInput) => {
      return await dispatch(updateCategoryTarget({ userId, category, updates })).unwrap();
    },
    [dispatch]
  );

  const deleteTarget = useCallback(
    async (userId: string, category: string) => {
      return await dispatch(deleteCategoryTarget({ userId, category })).unwrap();
    },
    [dispatch]
  );

  const resetError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    fetchTargets,
    fetchSummary,
    createTarget,
    updateTarget,
    deleteTarget,
    resetError,
  };
};

export const useBudget = () => {
  const state = useBudgetState();
  const actions = useBudgetActions();

  return {
    ...state,
    ...actions,
  };
};
