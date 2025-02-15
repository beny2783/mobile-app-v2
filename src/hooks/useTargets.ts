import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createTargetRepository } from '../repositories/target';
import {
  Target,
  CategoryTarget,
  TargetAchievement,
  DailySpending,
  TargetSummary,
  CreateTargetInput,
  UpdateTargetInput,
  CreateCategoryTargetInput,
  UpdateCategoryTargetInput,
  CreateTargetAchievementInput,
  CreateDailySpendingInput,
  UpdateDailySpendingInput,
} from '../types/target';

const targetRepository = createTargetRepository();

interface UseTargetsResult {
  // Core target operations
  targets: Target[];
  isLoading: boolean;
  error: Error | null;
  refreshTargets: () => Promise<void>;
  createTarget: (target: CreateTargetInput) => Promise<Target>;
  updateTarget: (targetId: string, target: UpdateTargetInput) => Promise<Target>;
  deleteTarget: (targetId: string) => Promise<void>;

  // Category target operations
  categoryTargets: CategoryTarget[];
  createCategoryTarget: (target: CreateCategoryTargetInput) => Promise<CategoryTarget>;
  updateCategoryTarget: (
    category: string,
    target: UpdateCategoryTargetInput
  ) => Promise<CategoryTarget>;
  deleteCategoryTarget: (category: string) => Promise<void>;

  // Achievement operations
  achievements: TargetAchievement[];
  createAchievement: (achievement: CreateTargetAchievementInput) => Promise<TargetAchievement>;

  // Daily spending operations
  dailySpending: DailySpending[];
  createDailySpending: (spending: CreateDailySpendingInput) => Promise<DailySpending>;
  updateDailySpending: (date: string, spending: UpdateDailySpendingInput) => Promise<DailySpending>;

  // Summary operations
  targetSummary: TargetSummary | null;
  refreshSummary: () => Promise<void>;
}

export function useTargets(): UseTargetsResult {
  const { user } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [categoryTargets, setCategoryTargets] = useState<CategoryTarget[]>([]);
  const [achievements, setAchievements] = useState<TargetAchievement[]>([]);
  const [dailySpending, setDailySpending] = useState<DailySpending[]>([]);
  const [targetSummary, setTargetSummary] = useState<TargetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Core target operations
  const refreshTargets = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const fetchedTargets = await targetRepository.getTargets(user.id);
      setTargets(fetchedTargets);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch targets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createTarget = useCallback(
    async (target: CreateTargetInput): Promise<Target> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const newTarget = await targetRepository.createTarget({
          ...target,
          user_id: user.id,
        });
        setTargets((prev) => [...prev, newTarget]);
        return newTarget;
      } catch (err) {
        console.error('Failed to create target:', err);
        throw err;
      }
    },
    [user]
  );

  const updateTarget = useCallback(
    async (targetId: string, target: UpdateTargetInput): Promise<Target> => {
      try {
        const updatedTarget = await targetRepository.updateTarget(targetId, target);
        setTargets((prev) => prev.map((t) => (t.id === targetId ? updatedTarget : t)));
        return updatedTarget;
      } catch (err) {
        console.error('Failed to update target:', err);
        throw err;
      }
    },
    []
  );

  const deleteTarget = useCallback(async (targetId: string): Promise<void> => {
    try {
      await targetRepository.deleteTarget(targetId);
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
    } catch (err) {
      console.error('Failed to delete target:', err);
      throw err;
    }
  }, []);

  // Category target operations
  const refreshCategoryTargets = useCallback(async () => {
    if (!user) return;

    try {
      const fetchedCategoryTargets = await targetRepository.getCategoryTargets(user.id);
      setCategoryTargets(fetchedCategoryTargets);
    } catch (err) {
      console.error('Failed to fetch category targets:', err);
    }
  }, [user]);

  const createCategoryTarget = useCallback(
    async (target: CreateCategoryTargetInput): Promise<CategoryTarget> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const newTarget = await targetRepository.createCategoryTarget({
          ...target,
          user_id: user.id,
        });
        setCategoryTargets((prev) => [...prev, newTarget]);
        return newTarget;
      } catch (err) {
        console.error('Failed to create category target:', err);
        throw err;
      }
    },
    [user]
  );

  const updateCategoryTarget = useCallback(
    async (category: string, target: UpdateCategoryTargetInput): Promise<CategoryTarget> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const updatedTarget = await targetRepository.updateCategoryTarget(
          user.id,
          category,
          target
        );
        setCategoryTargets((prev) =>
          prev.map((t) => (t.category === category ? updatedTarget : t))
        );
        return updatedTarget;
      } catch (err) {
        console.error('Failed to update category target:', err);
        throw err;
      }
    },
    [user]
  );

  const deleteCategoryTarget = useCallback(
    async (category: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      try {
        await targetRepository.deleteCategoryTarget(user.id, category);
        setCategoryTargets((prev) => prev.filter((t) => t.category !== category));
      } catch (err) {
        console.error('Failed to delete category target:', err);
        throw err;
      }
    },
    [user]
  );

  // Achievement operations
  const refreshAchievements = useCallback(async () => {
    if (!user) return;

    try {
      const fetchedAchievements = await targetRepository.getAchievements(user.id);
      setAchievements(fetchedAchievements);
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    }
  }, [user]);

  const createAchievement = useCallback(
    async (achievement: CreateTargetAchievementInput): Promise<TargetAchievement> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const newAchievement = await targetRepository.createAchievement({
          ...achievement,
          user_id: user.id,
        });
        setAchievements((prev) => [...prev, newAchievement]);
        return newAchievement;
      } catch (err) {
        console.error('Failed to create achievement:', err);
        throw err;
      }
    },
    [user]
  );

  // Daily spending operations
  const refreshDailySpending = useCallback(async () => {
    if (!user) return;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const fetchedSpending = await targetRepository.getDailySpending(user.id, startDate, endDate);
      setDailySpending(fetchedSpending);
    } catch (err) {
      console.error('Failed to fetch daily spending:', err);
    }
  }, [user]);

  const createDailySpending = useCallback(
    async (spending: CreateDailySpendingInput): Promise<DailySpending> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const newSpending = await targetRepository.createDailySpending({
          ...spending,
          user_id: user.id,
        });
        setDailySpending((prev) => [...prev, newSpending]);
        return newSpending;
      } catch (err) {
        console.error('Failed to create daily spending:', err);
        throw err;
      }
    },
    [user]
  );

  const updateDailySpending = useCallback(
    async (date: string, spending: UpdateDailySpendingInput): Promise<DailySpending> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const updatedSpending = await targetRepository.updateDailySpending(user.id, date, spending);
        setDailySpending((prev) => prev.map((s) => (s.date === date ? updatedSpending : s)));
        return updatedSpending;
      } catch (err) {
        console.error('Failed to update daily spending:', err);
        throw err;
      }
    },
    [user]
  );

  // Summary operations
  const refreshSummary = useCallback(async () => {
    if (!user) return;

    try {
      const summary = await targetRepository.getTargetSummary(user.id);
      setTargetSummary(summary);
    } catch (err) {
      console.error('Failed to fetch target summary:', err);
    }
  }, [user]);

  // Initial data loading
  useEffect(() => {
    if (user) {
      refreshTargets();
      refreshCategoryTargets();
      refreshAchievements();
      refreshDailySpending();
      refreshSummary();
    }
  }, [
    user,
    refreshTargets,
    refreshCategoryTargets,
    refreshAchievements,
    refreshDailySpending,
    refreshSummary,
  ]);

  return {
    // Core target operations
    targets,
    isLoading,
    error,
    refreshTargets,
    createTarget,
    updateTarget,
    deleteTarget,

    // Category target operations
    categoryTargets,
    createCategoryTarget,
    updateCategoryTarget,
    deleteCategoryTarget,

    // Achievement operations
    achievements,
    createAchievement,

    // Daily spending operations
    dailySpending,
    createDailySpending,
    updateDailySpending,

    // Summary operations
    targetSummary,
    refreshSummary,
  };
}
