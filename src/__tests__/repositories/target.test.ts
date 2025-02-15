import { SupabaseTargetRepository } from '../../repositories/target';
import { supabase } from '../../services/supabase';
import { RepositoryErrorCode } from '../../repositories/types';
import {
  Target,
  CategoryTarget,
  TargetAchievement,
  DailySpending,
  CreateTargetInput,
  CreateCategoryTargetInput,
} from '../../types/target';

interface MockChain {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  order: jest.Mock;
  single: jest.Mock;
}

// Mock Supabase client
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('SupabaseTargetRepository', () => {
  let repository: SupabaseTargetRepository;
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    repository = new SupabaseTargetRepository();
    jest.clearAllMocks();
  });

  describe('getTargets', () => {
    it('should return targets for a user', async () => {
      const mockTargets: Target[] = [
        {
          id: '1',
          user_id: mockUserId,
          type: 'spending',
          amount: 1000,
          current_amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockTargets, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await repository.getTargets(mockUserId);

      expect(result).toEqual(mockTargets);
      expect(supabase.from).toHaveBeenCalledWith('targets');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should handle errors when fetching targets', async () => {
      const mockError = { message: 'Database error' };
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(repository.getTargets(mockUserId)).rejects.toThrow();
    });
  });

  describe('getCategoryTargets', () => {
    it('should return category targets for a user', async () => {
      const mockCategoryTargets: CategoryTarget[] = [
        {
          id: '1',
          user_id: mockUserId,
          category: 'Groceries',
          target_limit: 500,
          current_amount: 300,
          color: '#4CAF50',
          min_limit: 0,
          max_limit: 1000,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockCategoryTargets, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await repository.getCategoryTargets(mockUserId);

      expect(result).toEqual(mockCategoryTargets);
      expect(supabase.from).toHaveBeenCalledWith('category_targets');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });
  });

  describe('createCategoryTarget', () => {
    it('should create a new category target', async () => {
      const mockInput: CreateCategoryTargetInput = {
        category: 'Entertainment',
        target_limit: 200,
        current_amount: 0,
        color: '#2196F3',
        min_limit: 0,
        max_limit: 500,
      };

      const mockCreatedTarget: CategoryTarget = {
        ...mockInput,
        id: '1',
        user_id: mockUserId,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedTarget, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await repository.createCategoryTarget(mockInput);

      expect(result).toEqual(mockCreatedTarget);
      expect(supabase.from).toHaveBeenCalledWith('category_targets');
      expect(mockChain.insert).toHaveBeenCalledWith([mockInput]);
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
    });
  });

  describe('updateCategoryTarget', () => {
    it('should update an existing category target', async () => {
      const category = 'Entertainment';
      const mockUpdate = {
        target_limit: 300,
      };

      const mockUpdatedTarget: CategoryTarget = {
        id: '1',
        user_id: mockUserId,
        category,
        target_limit: 300,
        current_amount: 150,
        color: '#2196F3',
        min_limit: 0,
        max_limit: 500,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const mockChain = {
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedTarget, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await repository.updateCategoryTarget(mockUserId, category, mockUpdate);

      expect(result).toEqual(mockUpdatedTarget);
      expect(supabase.from).toHaveBeenCalledWith('category_targets');
      expect(mockChain.update).toHaveBeenCalledWith(mockUpdate);
      expect(mockChain.eq).toHaveBeenCalledTimes(2);
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
    });
  });

  describe('getTargetSummary', () => {
    it('should return a complete target summary', async () => {
      const mockSpendingTarget: Target = {
        id: '1',
        user_id: mockUserId,
        type: 'spending',
        amount: 2000,
        current_amount: 1500,
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const mockCategoryTargets: CategoryTarget[] = [
        {
          id: '1',
          user_id: mockUserId,
          category: 'Groceries',
          target_limit: 500,
          current_amount: 300,
          color: '#4CAF50',
          min_limit: 0,
          max_limit: 1000,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockAchievements: TargetAchievement[] = [
        {
          id: '1',
          user_id: mockUserId,
          target_id: '1',
          title: 'Under Budget',
          description: 'Stayed under budget this month',
          icon: 'trophy',
          color: '#FFD700',
          achieved_at: '2024-01-31',
          created_at: '2024-01-31',
        },
      ];

      const mockDailySpending: DailySpending[] = [
        {
          id: '1',
          user_id: mockUserId,
          date: '2024-01-01',
          amount: 50,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      // Mock spending target query
      const mockSpendingChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSpendingTarget, error: null }),
      };

      // Mock savings target query
      const mockSavingsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      // Mock category targets query
      const mockCategoryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockCategoryTargets, error: null }),
      };

      // Mock achievements query
      const mockAchievementsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAchievements, error: null }),
      };

      // Mock daily spending query
      const mockSpendingDataChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockDailySpending,
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSpendingChain) // First call for spending target
        .mockReturnValueOnce(mockSavingsChain) // Second call for savings target
        .mockReturnValueOnce(mockCategoryChain) // Third call for category targets
        .mockReturnValueOnce(mockAchievementsChain) // Fourth call for achievements
        .mockReturnValueOnce(mockSpendingDataChain); // Fifth call for daily spending

      const result = await repository.getTargetSummary(mockUserId);

      expect(result).toMatchObject({
        monthlySpendingLimit: mockSpendingTarget.amount,
        currentSpending: mockSpendingTarget.current_amount,
        categoryTargets: mockCategoryTargets,
        trendData: {
          labels: mockDailySpending.map((d) =>
            new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' })
          ),
          spending: mockDailySpending.map((d) => d.amount),
          target: mockDailySpending.map(() => mockSpendingTarget.amount / 30),
        },
        achievements: mockAchievements.slice(0, 3).map((a) => ({
          title: a.title,
          description: a.description,
          icon: a.icon,
          color: a.color,
        })),
      });

      // Verify the spending target query
      expect(mockSpendingChain.select).toHaveBeenCalledWith('*');
      expect(mockSpendingChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockSpendingChain.eq).toHaveBeenCalledWith('type', 'spending');
      expect(mockSpendingChain.eq).toHaveBeenCalledWith('period', 'monthly');
      expect(mockSpendingChain.single).toHaveBeenCalled();

      // Verify the savings target query
      expect(mockSavingsChain.select).toHaveBeenCalledWith('*');
      expect(mockSavingsChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockSavingsChain.eq).toHaveBeenCalledWith('type', 'saving');
      expect(mockSavingsChain.eq).toHaveBeenCalledWith('period', 'monthly');
      expect(mockSavingsChain.single).toHaveBeenCalled();
    });
  });
});
