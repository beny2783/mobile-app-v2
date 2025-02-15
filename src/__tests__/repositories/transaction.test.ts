import { SupabaseTransactionRepository } from '../../repositories/transaction';
import { supabase } from '../../services/supabase';
import { authRepository } from '../../repositories/auth';
import { Transaction } from '../../types';
import {
  TransactionFilters,
  RepositoryErrorCode,
  MerchantCategory,
} from '../../repositories/types';
import { ITrueLayerApiService, TokenResponse } from '../../services/trueLayer/types';

// Mock dependencies
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../repositories/auth', () => ({
  authRepository: {
    getUser: jest.fn(),
  },
}));

// Mock TrueLayer API service
const mockTrueLayerService: jest.Mocked<ITrueLayerApiService> = {
  getAuthUrl: jest.fn(),
  exchangeToken: jest.fn(),
  fetchTransactions: jest.fn(),
  fetchTransactionsForConnection: jest.fn(),
  fetchBalances: jest.fn(),
  refreshToken: jest.fn(),
};

describe('SupabaseTransactionRepository', () => {
  let repository: SupabaseTransactionRepository;
  const mockUserId = 'test-user-id';
  const mockConnectionId = 'test-connection-id';

  const mockTransaction: Transaction = {
    transaction_id: 'test-transaction-id',
    account_id: 'test-account-id',
    connection_id: 'test-connection-id',
    timestamp: '2024-01-01T00:00:00Z',
    description: 'Test Transaction',
    amount: 100,
    currency: 'GBP',
    transaction_type: 'debit',
    transaction_category: 'Shopping',
    merchant_name: 'Test Store',
  };

  const mockMerchantCategories = [
    { category: 'Shopping', merchant_pattern: 'STORE|SHOP' },
    { category: 'Groceries', merchant_pattern: 'SUPERMARKET|GROCERY' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SupabaseTransactionRepository(mockTrueLayerService);
    (authRepository.getUser as jest.Mock).mockResolvedValue({ id: mockUserId });
  });

  describe('getMerchantCategories', () => {
    it('should fetch merchant categories successfully', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        data: mockMerchantCategories,
        error: null,
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await repository.getMerchantCategories();

      expect(result).toEqual(mockMerchantCategories);
      expect(supabase.from).toHaveBeenCalledWith('merchant_categories');
      expect(mockChain.select).toHaveBeenCalledWith('category, merchant_pattern');
    });

    it('should handle database errors', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        data: null,
        error: { message: 'Repository operation failed' },
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(repository.getMerchantCategories()).rejects.toThrow(
        'Repository operation failed'
      );
      expect(supabase.from).toHaveBeenCalledWith('merchant_categories');
      expect(mockChain.select).toHaveBeenCalledWith('category, merchant_pattern');
    });
  });

  describe('getTransactions', () => {
    beforeEach(() => {
      // Mock auth repository to return a user
      (authRepository.getUser as jest.Mock).mockResolvedValue({ id: 'test-user-id' });
    });

    it('should return transactions for a given date range', async () => {
      const mockTransaction = {
        transaction_id: 'test-transaction-id',
        account_id: 'test-account-id',
        connection_id: 'test-connection-id',
        timestamp: '2024-01-01T00:00:00Z',
        description: 'Test Transaction',
        amount: 100,
        currency: 'GBP',
        transaction_type: 'debit',
        transaction_category: 'Shopping',
        merchant_name: 'Test Store',
        user_id: 'test-user-id',
      };

      const mockTransactionsChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        data: [mockTransaction],
        error: null,
      };

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'transactions') {
          return mockTransactionsChain;
        }
        if (table === 'merchant_categories') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            data: mockMerchantCategories,
            error: null,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          data: [],
          error: null,
        };
      });

      const filters: TransactionFilters = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
      };

      const result = await repository.getTransactions(filters);

      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(mockTransactionsChain.select).toHaveBeenCalled();
      expect(mockTransactionsChain.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
      if (filters.fromDate) {
        expect(mockTransactionsChain.gte).toHaveBeenCalledWith(
          'timestamp',
          filters.fromDate.toISOString()
        );
      }
      if (filters.toDate) {
        expect(mockTransactionsChain.lte).toHaveBeenCalledWith(
          'timestamp',
          filters.toDate.toISOString()
        );
      }
      expect(mockTransactionsChain.order).toHaveBeenCalledWith('timestamp', { ascending: false });
      expect(result).toEqual([mockTransaction]);
    });

    it('should handle errors when fetching transactions', async () => {
      const mockError = new Error('Repository operation failed');
      const mockTransactionsChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        data: null,
        error: { message: 'Repository operation failed' },
      };

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'transactions') {
          return mockTransactionsChain;
        }
        if (table === 'merchant_categories') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            data: mockMerchantCategories,
            error: null,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          data: [],
          error: null,
        };
      });

      const filters: TransactionFilters = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
      };

      await expect(repository.getTransactions(filters)).rejects.toThrow(
        'Repository operation failed'
      );
      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(mockTransactionsChain.select).toHaveBeenCalled();
      expect(mockTransactionsChain.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
      if (filters.fromDate) {
        expect(mockTransactionsChain.gte).toHaveBeenCalledWith(
          'timestamp',
          filters.fromDate.toISOString()
        );
      }
      if (filters.toDate) {
        expect(mockTransactionsChain.lte).toHaveBeenCalledWith(
          'timestamp',
          filters.toDate.toISOString()
        );
      }
      expect(mockTransactionsChain.order).toHaveBeenCalledWith('timestamp', { ascending: false });
    });
  });

  describe('getTransactionById', () => {
    it('should fetch a single transaction by ID', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await repository.getTransactionById(mockTransaction.transaction_id);

      expect(result).toEqual(mockTransaction);
      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(mockChain.eq).toHaveBeenCalledWith('transaction_id', mockTransaction.transaction_id);
    });

    it('should return null for non-existent transaction', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await repository.getTransactionById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('storeTransactions', () => {
    it('should store transactions successfully', async () => {
      const mockChain = {
        upsert: jest.fn().mockReturnValue({ data: null, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await repository.storeTransactions([mockTransaction]);

      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(mockChain.upsert).toHaveBeenCalledWith([mockTransaction], {
        onConflict: 'transaction_id',
        ignoreDuplicates: false,
      });
    });

    it('should handle storage errors', async () => {
      const mockChain = {
        upsert: jest.fn().mockResolvedValue({ error: { message: 'Repository operation failed' } }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(repository.storeTransactions([mockTransaction])).rejects.toThrow(
        'Repository operation failed'
      );
    });
  });

  describe('updateTransactionCategory', () => {
    it('should update transaction category successfully', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await repository.updateTransactionCategory(mockTransaction.transaction_id, 'groceries');

      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(mockChain.update).toHaveBeenCalledWith({ transaction_category: 'groceries' });
      expect(mockChain.eq).toHaveBeenCalledWith('transaction_id', mockTransaction.transaction_id);
    });
  });

  describe('syncTransactions', () => {
    const mockFromDate = new Date('2024-01-01');
    const mockToDate = new Date('2024-01-31');

    it('should sync transactions successfully', async () => {
      mockTrueLayerService.fetchTransactionsForConnection.mockResolvedValue([mockTransaction]);

      const mockStoreChain = {
        upsert: jest.fn().mockReturnValue({ data: null, error: null }),
      };

      const mockUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({ data: null, error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'transactions') return mockStoreChain;
        if (table === 'bank_connections') return mockUpdateChain;
        return {};
      });

      await repository.syncTransactions(mockConnectionId, mockFromDate, mockToDate);

      expect(mockTrueLayerService.fetchTransactionsForConnection).toHaveBeenCalledWith(
        mockConnectionId,
        mockFromDate,
        mockToDate
      );
      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(supabase.from).toHaveBeenCalledWith('bank_connections');
      expect(mockStoreChain.upsert).toHaveBeenCalled();
      expect(mockUpdateChain.update).toHaveBeenCalled();
    });

    it('should handle sync errors', async () => {
      mockTrueLayerService.fetchTransactionsForConnection.mockRejectedValue(
        new Error('Sync failed')
      );

      await expect(
        repository.syncTransactions(mockConnectionId, mockFromDate, mockToDate)
      ).rejects.toThrow('Sync failed');
    });
  });

  describe('categorizeTransaction', () => {
    beforeEach(async () => {
      const mockCategoriesChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        data: [
          { category: 'Shopping', merchant_pattern: 'STORE|SHOP' },
          { category: 'Groceries', merchant_pattern: 'SUPERMARKET|GROCERY' },
        ],
        error: null,
      };

      (supabase.from as jest.Mock).mockReturnValue(mockCategoriesChain);
      await repository.getMerchantCategories();
    });

    it('should categorize transaction based on description', () => {
      const transaction = {
        ...mockTransaction,
        description: 'STORE PURCHASE',
        merchant_name: '',
        transaction_category: 'uncategorized',
      };

      const category = repository.categorizeTransaction(transaction);
      expect(category).toBe('Shopping');
    });

    it('should categorize transaction based on merchant name', () => {
      const transaction = {
        ...mockTransaction,
        description: '',
        merchant_name: 'SUPERMARKET',
        transaction_category: 'uncategorized',
      };

      const category = repository.categorizeTransaction(transaction);
      expect(category).toBe('Groceries');
    });

    it('should fallback to transaction type if no category match', () => {
      const transaction = {
        ...mockTransaction,
        description: 'UNMATCHED TRANSACTION',
        merchant_name: 'UNMATCHED MERCHANT',
        transaction_type: 'debit',
        transaction_category: 'uncategorized',
      };

      const category = repository.categorizeTransaction(transaction);
      expect(category).toBe(transaction.transaction_type);
    });

    it('should fallback to Other if no category match and no transaction type', () => {
      const transaction = {
        ...mockTransaction,
        description: 'UNMATCHED TRANSACTION',
        merchant_name: 'UNMATCHED MERCHANT',
        transaction_type: '',
        transaction_category: 'uncategorized',
      };

      const category = repository.categorizeTransaction(transaction);
      expect(category).toBe('Other');
    });
  });
});
