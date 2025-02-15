import { TrueLayerTransactionService } from '../../../../services/trueLayer/transaction/TrueLayerTransactionService';
import { supabase } from '../../../../services/supabase';
import { Transaction } from '../../../../types';
import {
  ITrueLayerApiService,
  ITrueLayerStorageService,
} from '../../../../services/trueLayer/types';

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

  const mockTransaction: Transaction = {
    transaction_id: 'test-transaction-id',
    account_id: 'test-account-id',
    connection_id: mockConnectionId,
    timestamp: '2024-01-01T00:00:00Z',
    description: 'Test Transaction',
    amount: 100,
    currency: 'GBP',
    transaction_type: 'debit',
    transaction_category: 'shopping',
    merchant_name: 'Test Store',
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
      const result = await service.processTransactions([mockTransaction]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockTransaction,
        processed_at: expect.any(String),
      } as Transaction & { processed_at: string });

      const processedTransaction = result[0] as Transaction & { processed_at: string };
      expect(new Date(processedTransaction.processed_at).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle empty transaction list', async () => {
      const result = await service.processTransactions([]);

      expect(result).toEqual([]);
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
        { ...mockTransaction, description: 'STORE PURCHASE' },
        { ...mockTransaction, description: 'GROCERY MART' },
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

      const transactions = [{ ...mockTransaction, description: 'UNKNOWN PURCHASE' }];

      const result = await service.categorizeTransactions(transactions);

      expect(result[0].transaction_category).toBe('Uncategorized');
    });

    it('should handle database errors gracefully', async () => {
      const mockChain = {
        select: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.categorizeTransactions([mockTransaction]);

      expect(result).toEqual([mockTransaction]);
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
      mockApiService.fetchTransactions.mockResolvedValue([mockTransaction]);
      mockStorageService.storeTransactions.mockResolvedValue();

      await service.updateTransactionHistory(mockUserId);

      expect(mockStorageService.getStoredToken).toHaveBeenCalledWith(mockUserId, mockConnectionId);
      expect(mockApiService.fetchTransactions).toHaveBeenCalledWith('test-token', expect.any(Date));
      expect(mockStorageService.storeTransactions).toHaveBeenCalledWith(
        mockUserId,
        expect.arrayContaining([
          expect.objectContaining({
            ...mockTransaction,
            processed_at: expect.any(String),
          } as Transaction & { processed_at: string }),
        ])
      );
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

    it('should continue processing other connections if one fails', async () => {
      const mockMultipleConnections = [
        { id: 'conn-1', user_id: mockUserId, status: 'active', disconnected_at: null },
        { id: 'conn-2', user_id: mockUserId, status: 'active', disconnected_at: null },
      ];

      const mockMultipleChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: mockMultipleConnections, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockMultipleChain);

      mockStorageService.getStoredToken
        .mockResolvedValueOnce('token-1')
        .mockResolvedValueOnce('token-2');

      mockApiService.fetchTransactions
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce([mockTransaction]);

      await service.updateTransactionHistory(mockUserId);

      expect(mockStorageService.storeTransactions).toHaveBeenCalledTimes(1);
      expect(mockStorageService.storeTransactions).toHaveBeenCalledWith(
        mockUserId,
        expect.arrayContaining([
          expect.objectContaining({
            ...mockTransaction,
            processed_at: expect.any(String),
          } as Transaction & { processed_at: string }),
        ])
      );
    });

    it('should use custom days parameter', async () => {
      mockStorageService.getStoredToken.mockResolvedValue('test-token');
      mockApiService.fetchTransactions.mockResolvedValue([mockTransaction]);

      const customDays = 60;
      await service.updateTransactionHistory(mockUserId, customDays);

      const expectedFromDate = new Date();
      expectedFromDate.setDate(expectedFromDate.getDate() - customDays);

      expect(mockApiService.fetchTransactions).toHaveBeenCalledWith('test-token', expect.any(Date));

      const calls = mockApiService.fetchTransactions.mock.calls;
      if (calls.length > 0 && calls[0].length > 1) {
        const actualFromDate = calls[0][1] as Date;
        expect(actualFromDate.getDate()).toBe(expectedFromDate.getDate());
      }
    });
  });
});
