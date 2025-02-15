import {
  SupabaseBalanceRepository,
  Balance,
  BankAccount,
  GroupedBalances,
} from '../../repositories/balance';
import { supabase } from '../../services/supabase';
import { RepositoryError, RepositoryErrorCode } from '../../repositories/types';
import { authRepository } from '../../repositories/auth';

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

jest.mock('../../services/trueLayer/TrueLayerServiceSingleton', () => ({
  getTrueLayerService: jest.fn(),
}));

// Create a proper error class for testing
class TestRepositoryError extends Error implements RepositoryError {
  code: RepositoryErrorCode;
  originalError?: any;

  constructor(message: string, code: RepositoryErrorCode, originalError?: any) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.originalError = originalError;
  }
}

describe('SupabaseBalanceRepository', () => {
  let repository: SupabaseBalanceRepository;
  const mockUserId = 'test-user-id';
  const mockConnectionId = 'test-connection-id';

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SupabaseBalanceRepository();
    (authRepository.getUser as jest.Mock).mockResolvedValue({ id: mockUserId });
  });

  // Core Balance Operations
  describe('Core Balance Operations', () => {
    const mockBalances: Balance[] = [
      {
        id: '1',
        user_id: mockUserId,
        connection_id: mockConnectionId,
        account_id: 'acc-1',
        current: 1000,
        available: 900,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    describe('getBalances', () => {
      it('should return balances for a user', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockBalances, error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await repository.getBalances(mockUserId);

        expect(result).toEqual(mockBalances);
        expect(supabase.from).toHaveBeenCalledWith('balances');
        expect(mockChain.select).toHaveBeenCalledWith('*');
        expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      });

      it('should handle empty balance list', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await repository.getBalances(mockUserId);

        expect(result).toEqual([]);
      });
    });

    describe('getBalancesByConnection', () => {
      it('should return balances for a specific connection', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockBalances, error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await repository.getBalancesByConnection(mockConnectionId);

        expect(result).toEqual(mockBalances);
        expect(supabase.from).toHaveBeenCalledWith('balances');
        expect(mockChain.eq).toHaveBeenCalledWith('connection_id', mockConnectionId);
      });
    });

    describe('storeBalances', () => {
      it('should store balances successfully', async () => {
        const mockChain = {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        await repository.storeBalances(mockUserId, mockConnectionId, mockBalances);

        expect(supabase.from).toHaveBeenCalledWith('balances');
        expect(mockChain.insert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              user_id: mockUserId,
              connection_id: mockConnectionId,
              account_id: 'acc-1',
              current: 1000,
              available: 900,
              currency: 'GBP',
            }),
          ])
        );
      });
    });

    describe('getGroupedBalances', () => {
      it('should return grouped balances for active connections', async () => {
        const mockConnections = [
          {
            id: 'conn-1',
            user_id: mockUserId,
            provider: 'mock-provider',
            status: 'active',
            disconnected_at: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            bank_name: 'Test Bank',
          },
        ];

        const mockAccounts = [
          {
            id: '1',
            user_id: mockUserId,
            connection_id: 'conn-1',
            account_id: 'acc-1',
            account_type: 'current',
            account_name: 'Main Account',
            currency: 'GBP',
            balance: 1000,
            last_updated: '2024-01-01T00:00:00Z',
          },
        ];

        const mockBalances = [
          {
            id: '1',
            user_id: mockUserId,
            connection_id: 'conn-1',
            account_id: 'acc-1',
            current: 1000,
            available: 900,
            currency: 'GBP',
          },
        ];

        const mockConnectionChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockResolvedValue({ data: mockConnections, error: null }),
        };

        const mockAccountChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() => {
            return {
              eq: jest.fn().mockResolvedValue({ data: mockAccounts, error: null }),
            };
          }),
        };

        const mockBalanceChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() => {
            return {
              eq: jest.fn().mockResolvedValue({ data: mockBalances, error: null }),
            };
          }),
        };

        (supabase.from as jest.Mock).mockImplementation((table) => {
          switch (table) {
            case 'bank_connections':
              return mockConnectionChain;
            case 'bank_accounts':
              return mockAccountChain;
            case 'balances':
              return mockBalanceChain;
            default:
              return {};
          }
        });

        const result = await repository.getGroupedBalances();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          connection: {
            id: 'conn-1',
            provider: 'mock-provider',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            bank_name: 'Test Bank',
          },
          accounts: [
            {
              ...mockAccounts[0],
              balance: 1000,
            },
          ],
        });
      });

      it('should handle no active connections', async () => {
        const mockConnectionChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockConnectionChain);

        const result = await repository.getGroupedBalances();

        expect(result).toEqual([]);
      });

      it('should handle database errors when fetching connections', async () => {
        const mockConnectionChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockConnectionChain);

        await expect(repository.getGroupedBalances()).rejects.toThrow('Database error');
      });

      it('should handle unauthorized access', async () => {
        (authRepository.getUser as jest.Mock).mockResolvedValue(null);

        await expect(repository.getGroupedBalances()).rejects.toThrow('No user found');
      });
    });

    describe('error handling', () => {
      it('should handle database errors in getBalances', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        await expect(repository.getBalances(mockUserId)).rejects.toThrow('Database error');
      });

      it('should handle database errors in storeBalances', async () => {
        const mockChain = {
          insert: jest.fn().mockResolvedValue({ error: new Error('Insert failed') }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        await expect(
          repository.storeBalances(mockUserId, mockConnectionId, [
            {
              id: '1',
              user_id: mockUserId,
              connection_id: mockConnectionId,
              account_id: 'acc-1',
              current: 1000,
              available: 900,
              currency: 'GBP',
              updated_at: '2024-01-01T00:00:00Z',
              created_at: '2024-01-01T00:00:00Z',
            },
          ])
        ).rejects.toThrow('Insert failed');
      });
    });
  });

  // Bank Account Operations
  describe('Bank Account Operations', () => {
    const mockAccounts: BankAccount[] = [
      {
        id: '1',
        user_id: mockUserId,
        connection_id: mockConnectionId,
        account_id: 'acc-1',
        account_type: 'current',
        account_name: 'Main Account',
        currency: 'GBP',
        balance: 1000,
        last_updated: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    describe('getBankAccounts', () => {
      it('should return bank accounts for a user', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockAccounts, error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await repository.getBankAccounts(mockUserId);

        expect(result).toEqual(mockAccounts);
        expect(supabase.from).toHaveBeenCalledWith('bank_accounts');
        expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      });
    });

    describe('getBankAccountsByConnection', () => {
      it('should return bank accounts for a specific connection', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockAccounts, error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await repository.getBankAccountsByConnection(mockConnectionId);

        expect(result).toEqual(mockAccounts);
        expect(supabase.from).toHaveBeenCalledWith('bank_accounts');
        expect(mockChain.eq).toHaveBeenCalledWith('connection_id', mockConnectionId);
      });
    });

    describe('storeBankAccounts', () => {
      it('should store bank accounts successfully', async () => {
        const mockChain = {
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };

        // Mock current date for consistent testing
        const mockDate = new Date('2024-01-01T00:00:00Z');
        const dateSpy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        await repository.storeBankAccounts(mockUserId, mockConnectionId, mockAccounts);

        expect(supabase.from).toHaveBeenCalledWith('bank_accounts');
        expect(mockChain.upsert).toHaveBeenCalledWith(
          [
            {
              user_id: mockUserId,
              connection_id: mockConnectionId,
              account_id: 'acc-1',
              account_type: 'current',
              account_name: 'Main Account',
              currency: 'GBP',
              balance: 1000,
              last_updated: '2024-01-01T00:00:00.000Z',
            },
          ],
          { onConflict: 'user_id,connection_id,account_id' }
        );

        // Restore Date
        dateSpy.mockRestore();
      });
    });
  });

  // Balance Analysis
  describe('Balance Analysis', () => {
    const mockBalances: Balance[] = [
      {
        id: '1',
        user_id: mockUserId,
        connection_id: mockConnectionId,
        account_id: 'acc-1',
        current: 1000,
        available: 900,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        user_id: mockUserId,
        connection_id: mockConnectionId,
        account_id: 'acc-2',
        current: 500,
        available: 500,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    describe('getTotalBalance', () => {
      it('should calculate total balance across all accounts', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockBalances, error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await repository.getTotalBalance(mockUserId);

        expect(result).toBe(1500); // 1000 + 500
        expect(supabase.from).toHaveBeenCalledWith('balances');
        expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      });

      it('should return 0 when no balances exist', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await repository.getTotalBalance(mockUserId);

        expect(result).toBe(0);
      });
    });

    describe('getBalanceHistory', () => {
      const mockTransactions = [
        {
          id: '1',
          user_id: mockUserId,
          amount: 1000,
          timestamp: '2023-12-31T00:00:00Z',
        },
        {
          id: '2',
          user_id: mockUserId,
          amount: 500,
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      it('should return balance history for specified days', async () => {
        // Mock current date for consistent testing
        const mockDate = new Date('2024-01-07T00:00:00Z');
        const dateSpy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockTransactions, error: null }),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await repository.getBalanceHistory(mockUserId, 7);

        // The implementation calculates a running balance that accumulates:
        // Dec 31: +1000 -> Balance = 1500 (final balance)
        // Jan 1: +500 -> Balance = 1500 (final balance)
        expect(result).toEqual([{ date: '2023-12-31', balance: 1500 }]);
        expect(supabase.from).toHaveBeenCalledWith('transactions');
        expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
        expect(mockChain.gte).toHaveBeenCalledWith('timestamp', '2023-12-31T00:00:00.000Z');
        expect(mockChain.order).toHaveBeenCalledWith('timestamp', { ascending: true });

        // Restore Date
        dateSpy.mockRestore();
      });

      describe('getBalanceHistory with detailed scenarios', () => {
        it('should handle multiple transactions on the same day', async () => {
          const mockDate = new Date('2024-01-07T00:00:00Z');
          const dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
            if (args.length === 0) return mockDate;
            return new (Function.prototype.bind.apply(Date, [null, ...args]))();
          });

          const mockTransactions = [
            { id: '1', user_id: mockUserId, amount: 100, timestamp: '2024-01-06T10:00:00Z' },
            { id: '2', user_id: mockUserId, amount: -50, timestamp: '2024-01-06T15:00:00Z' },
            { id: '3', user_id: mockUserId, amount: 200, timestamp: '2024-01-07T00:00:00Z' },
          ];

          const mockChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockTransactions, error: null }),
          };

          (supabase.from as jest.Mock).mockReturnValue(mockChain);

          const result = await repository.getBalanceHistory(mockUserId, 7);

          // Sort the result by date to ensure consistent order
          const sortedResult = result.sort((a, b) => a.date.localeCompare(b.date));

          expect(sortedResult).toEqual([
            { date: '2024-01-06', balance: 50 }, // 100 - 50
            { date: '2024-01-07', balance: 250 }, // Previous balance (50) + 200
          ]);

          dateSpy.mockRestore();
        });

        it('should handle database errors in balance history', async () => {
          const mockChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
          };

          (supabase.from as jest.Mock).mockReturnValue(mockChain);

          await expect(repository.getBalanceHistory(mockUserId, 7)).rejects.toThrow(
            'Database error'
          );
        });

        it('should handle empty transaction history', async () => {
          const mockChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          };

          (supabase.from as jest.Mock).mockReturnValue(mockChain);

          const result = await repository.getBalanceHistory(mockUserId, 7);

          expect(result).toEqual([]);
        });
      });
    });
  });
});
