import { TrueLayerTransactionService } from '../../../../services/trueLayer/transaction/TrueLayerTransactionService';
import { supabase } from '../../../../services/supabase';
import { Transaction, DatabaseTransaction } from '../../../../types';
import {
  ITrueLayerApiService,
  ITrueLayerStorageService,
} from '../../../../services/trueLayer/types';

// Interface for the processed transaction returned by the service
type ProcessedDatabaseTransaction = DatabaseTransaction & {
  processed_at: string;
};

// Mock dependencies
jest.mock('../../../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('TrueLayerTransactionService', () => {
  let service: TrueLayerTransactionService;
  let mockApiService: jest.Mocked<ITrueLayerApiService>;
  let mockStorageService: jest.Mocked<ITrueLayerStorageService>;

  const mockUserId = 'test-user-id';
  const mockConnectionId = 'test-connection-id';

  const mockDatabaseTransaction: DatabaseTransaction = {
    id: 'test-id',
    user_id: mockUserId,
    connection_id: mockConnectionId,
    timestamp: '2024-01-01T00:00:00Z',
    description: 'Test Transaction',
    amount: 100,
    currency: 'GBP',
    transaction_type: 'debit',
    transaction_category: 'shopping',
    merchant_name: 'Test Store',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    scheduled_date: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize mock API service
    mockApiService = {
      getAuthUrl: jest.fn(),
      exchangeToken: jest.fn(),
      fetchTransactions: jest.fn(),
      fetchTransactionsForConnection: jest.fn(),
      fetchBalances: jest.fn(),
      refreshToken: jest.fn(),
    };

    // Initialize mock storage service
    mockStorageService = {
      storeTokens: jest.fn(),
      getStoredToken: jest.fn(),
      storeTransactions: jest.fn(),
      storeBalances: jest.fn(),
      getActiveConnection: jest.fn(),
      disconnectBank: jest.fn(),
    };

    service = new TrueLayerTransactionService(mockApiService, mockStorageService);
  });

  describe('processTransactions', () => {
    it('should process transactions and add processed_at timestamp', async () => {
      const result = await service.processTransactions([mockDatabaseTransaction]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockDatabaseTransaction,
        scheduled_date: null,
      });
      const processedTransaction = result[0] as ProcessedDatabaseTransaction;
      expect(processedTransaction.processed_at).toBeDefined();
      expect(new Date(processedTransaction.processed_at).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle empty transaction list', async () => {
      const result = await service.processTransactions([]);
      expect(result).toEqual([]);
    });

    it('should use provided connection_id when transaction has none', async () => {
      const transactionWithoutConnection = {
        ...mockDatabaseTransaction,
        connection_id: '',
      };

      const result = await service.processTransactions([transactionWithoutConnection]);

      expect(result).toHaveLength(1);
      expect(result[0].connection_id).toBe(mockConnectionId);
    });

    it('should keep existing connection_id when present', async () => {
      const result = await service.processTransactions([mockDatabaseTransaction]);

      expect(result).toHaveLength(1);
      expect(result[0].connection_id).toBe(mockDatabaseTransaction.connection_id);
      expect((result[0] as any).processed_at).toBeDefined();
    });

    it('should create unique id when not present', async () => {
      const transactionWithoutId = {
        ...mockDatabaseTransaction,
        id: '',
      };

      const result = await service.processTransactions([transactionWithoutId]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(
        `${mockConnectionId}_${new Date(transactionWithoutId.timestamp).getTime()}`
      );
    });

    it('should process multiple transactions', async () => {
      const transactions = [
        mockDatabaseTransaction,
        { ...mockDatabaseTransaction, id: 'id-2' },
        { ...mockDatabaseTransaction, id: 'id-3' },
      ];

      const result = await service.processTransactions(transactions);

      expect(result).toHaveLength(3);
      result.forEach((transaction, index) => {
        expect(transaction).toMatchObject(transactions[index]);
        const processedTransaction = transaction as ProcessedDatabaseTransaction;
        expect(processedTransaction.processed_at).toBeDefined();
        expect(new Date(processedTransaction.processed_at).getTime()).toBeLessThanOrEqual(
          Date.now()
        );
      });
    });
  });

  describe('categorizeTransactions', () => {
    const mockCategories = [
      { merchant_pattern: 'STORE|SHOP', category: 'Shopping' },
      { merchant_pattern: 'SUPERMARKET|GROCERY', category: 'Groceries' },
    ];

    it('should categorize transactions based on merchant patterns', async () => {
      const mockChain = {
        select: jest.fn().mockResolvedValue({ data: mockCategories, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const transactions = [
        { ...mockDatabaseTransaction, description: 'STORE PURCHASE' },
        { ...mockDatabaseTransaction, description: 'GROCERY MART' },
      ];

      const result = await service.categorizeTransactions(transactions);

      expect(result).toHaveLength(2);
      expect(result[0].transaction_category).toBe('Shopping');
      expect(result[1].transaction_category).toBe('Groceries');
    });

    it('should fallback to Uncategorized when no pattern matches', async () => {
      const mockChain = {
        select: jest.fn().mockResolvedValue({ data: mockCategories, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const transactions = [{ ...mockDatabaseTransaction, description: 'UNKNOWN PURCHASE' }];

      const result = await service.categorizeTransactions(transactions);

      expect(result[0].transaction_category).toBe('Uncategorized');
    });

    it('should handle database errors gracefully', async () => {
      const mockChain = {
        select: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.categorizeTransactions([mockDatabaseTransaction]);

      expect(result).toEqual([mockDatabaseTransaction]);
    });
  });

  describe('updateTransactionHistory', () => {
    const mockConnections = [
      { id: mockConnectionId, user_id: mockUserId, status: 'active', disconnected_at: null },
    ];

    beforeEach(() => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: mockConnections, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);
    });

    it('should update transaction history for active connections', async () => {
      mockStorageService.getStoredToken.mockResolvedValue('test-token');
      mockApiService.fetchTransactions.mockResolvedValue([mockDatabaseTransaction]);
      mockStorageService.storeTransactions.mockResolvedValue();

      await service.updateTransactionHistory(mockUserId);

      expect(mockStorageService.getStoredToken).toHaveBeenCalledWith(mockUserId, mockConnectionId);
      const fetchTransactionsCalls = mockApiService.fetchTransactions.mock.calls;
      expect(fetchTransactionsCalls.length).toBe(1);
      expect(fetchTransactionsCalls[0][0]).toBe('test-token');
      expect(fetchTransactionsCalls[0][1]).toBeInstanceOf(Date);
      expect(mockStorageService.storeTransactions).toHaveBeenCalledWith(
        mockUserId,
        expect.arrayContaining([expect.objectContaining(mockDatabaseTransaction)])
      );
    });

    it('should use custom days parameter', async () => {
      mockStorageService.getStoredToken.mockResolvedValue('test-token');
      mockApiService.fetchTransactions.mockResolvedValue([mockDatabaseTransaction]);

      const customDays = 60;
      await service.updateTransactionHistory(mockUserId, customDays);

      const fetchTransactionsCalls = mockApiService.fetchTransactions.mock.calls;
      expect(fetchTransactionsCalls.length).toBe(1);
      expect(fetchTransactionsCalls[0][0]).toBe('test-token');
      const fromDate = fetchTransactionsCalls[0][1] as Date;
      expect(fromDate).toBeInstanceOf(Date);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - customDays);
      expect(fromDate.getDate()).toBe(expectedDate.getDate());
    });

    it('should handle missing token for connection', async () => {
      mockStorageService.getStoredToken.mockResolvedValue(null);

      await service.updateTransactionHistory(mockUserId);

      expect(mockApiService.fetchTransactions).not.toHaveBeenCalled();
      expect(mockStorageService.storeTransactions).not.toHaveBeenCalled();
    });

    it('should handle no active connections', async () => {
      const mockEmptyChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockEmptyChain);

      await expect(service.updateTransactionHistory(mockUserId)).rejects.toThrow(
        'No active bank connections found'
      );
    });
  });
});
