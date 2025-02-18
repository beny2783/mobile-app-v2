import {
  Balance,
  BankAccount,
  TrueLayerBalance,
  BalanceResponse,
  GroupedBalances,
  BalancePoint,
  AccountBalance,
  BalanceData,
} from '../../types/bank/balance';
import {
  DatabaseBalance,
  DatabaseBankAccount,
  DatabaseGroupedBalances,
} from '../../types/bank/database';
import { BankConnection, BankConnectionWithAccounts } from '../../types/bank/connection';

describe('Bank Type System', () => {
  describe('Balance Types', () => {
    it('should validate core Balance type', () => {
      const validBalance: Balance = {
        account_id: 'acc-123',
        current: 1000,
        available: 900,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(validBalance.current).toBeGreaterThan(validBalance.available);
    });

    it('should validate DatabaseBalance type', () => {
      const validDatabaseBalance: DatabaseBalance = {
        id: 'bal-123',
        user_id: 'user-123',
        connection_id: 'conn-123',
        account_id: 'acc-123',
        current: 1000,
        available: 900,
        currency: 'GBP',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // @ts-expect-error - missing required fields
      const invalidDatabaseBalance: DatabaseBalance = {
        account_id: 'acc-123',
        current: 1000,
        available: 900,
        currency: 'GBP',
      };

      expect(validDatabaseBalance.user_id).toBeDefined();
    });

    it('should validate TrueLayer-specific balance types', () => {
      const validTrueLayerBalance: TrueLayerBalance = {
        current: 1000,
        available: 900,
        currency: 'GBP',
        update_timestamp: '2024-01-01T00:00:00Z',
      };

      const validBalanceResponse: BalanceResponse = {
        results: [validTrueLayerBalance],
        status: 'succeeded',
      };

      expect(validBalanceResponse.status).toBe('succeeded');
    });
  });

  describe('Bank Account Types', () => {
    it('should validate BankAccount type', () => {
      const validBankAccount: BankAccount = {
        account_id: 'acc-123',
        account_type: 'current',
        account_name: 'Main Account',
        balance: 1000,
        currency: 'GBP',
        last_updated: '2024-01-01T00:00:00Z',
      };

      // @ts-expect-error - missing required fields
      const invalidBankAccount: BankAccount = {
        account_id: 'acc-123',
        balance: 1000,
      };

      expect(validBankAccount.account_type).toBeDefined();
    });

    it('should validate DatabaseBankAccount type', () => {
      const validDatabaseAccount: DatabaseBankAccount = {
        id: 'dbacc-123',
        user_id: 'user-123',
        connection_id: 'conn-123',
        account_id: 'acc-123',
        account_type: 'current',
        account_name: 'Main Account',
        balance: 1000,
        currency: 'GBP',
        last_updated: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(validDatabaseAccount.user_id).toBeDefined();
      expect(validDatabaseAccount.connection_id).toBeDefined();
    });
  });

  describe('Bank Connection Types', () => {
    it('should validate BankConnection type', () => {
      const validConnection: BankConnection = {
        id: 'conn-123',
        user_id: 'user-123',
        provider: 'truelayer',
        status: 'active',
        encrypted_access_token: 'encrypted-token',
        encrypted_refresh_token: 'encrypted-refresh',
        expires_at: '2024-01-01T00:00:00Z',
        last_sync: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        disconnected_at: null,
      };

      // Test invalid status at runtime
      const invalidConnection = {
        ...validConnection,
        status: 'not-a-valid-status',
      };

      expect(validConnection.status).toBe('active');
      expect(['active', 'inactive', 'error']).not.toContain(invalidConnection.status);
    });

    it('should validate BankConnectionWithAccounts type', () => {
      const validConnectionWithAccounts: BankConnectionWithAccounts = {
        id: 'conn-123',
        user_id: 'user-123',
        provider: 'truelayer',
        status: 'active',
        encrypted_access_token: 'encrypted-token',
        encrypted_refresh_token: 'encrypted-refresh',
        expires_at: '2024-01-01T00:00:00Z',
        last_sync: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        disconnected_at: null,
        account_count: 2,
        last_sync_status: 'success',
        bank_accounts: [{ count: 2 }],
      };

      expect(validConnectionWithAccounts.account_count).toBe(2);
      expect(validConnectionWithAccounts.last_sync_status).toBe('success');
    });
  });

  describe('Balance Analysis Types', () => {
    it('should validate BalancePoint type', () => {
      const validBalancePoint: BalancePoint = {
        date: '2024-01-01',
        balance: 1000,
        transactions: [
          {
            id: 'trans-123',
            amount: -50,
            description: 'Test Transaction',
          },
        ],
      };

      expect(validBalancePoint.transactions).toBeDefined();
    });

    it('should validate BalanceData type', () => {
      const validBalanceData: BalanceData = {
        current: 1000,
        projected: 1200,
        history: [
          {
            date: '2024-01-01',
            balance: 1000,
          },
        ],
        forecast: [
          {
            date: '2024-01-02',
            balance: 1200,
          },
        ],
        currency: 'GBP',
        last_updated: '2024-01-01T00:00:00Z',
      };

      expect(validBalanceData.history).toHaveLength(1);
      expect(validBalanceData.forecast).toHaveLength(1);
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure proper type hierarchy', () => {
      const balance: Balance = {
        account_id: 'acc-123',
        current: 1000,
        available: 900,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const databaseBalance: DatabaseBalance = {
        ...balance,
        id: 'bal-123',
        user_id: 'user-123',
        connection_id: 'conn-123',
        created_at: '2024-01-01T00:00:00Z',
      };

      // @ts-expect-error - Cannot assign Balance to DatabaseBalance
      const invalidDbBalance: DatabaseBalance = balance;

      expect(databaseBalance.id).toBeDefined();
    });

    it('should ensure grouped balances contain correct types', () => {
      const validGroupedBalances: GroupedBalances = {
        connection_id: 'conn-123',
        provider_name: 'Test Bank',
        accounts: [
          {
            account_id: 'acc-123',
            account_type: 'current',
            account_name: 'Main Account',
            balance: 1000,
            currency: 'GBP',
            last_updated: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const validDatabaseGroupedBalances: DatabaseGroupedBalances = {
        connection: {
          id: 'conn-123',
          provider: 'truelayer',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        accounts: [
          {
            id: 'dbacc-123',
            user_id: 'user-123',
            connection_id: 'conn-123',
            account_id: 'acc-123',
            account_type: 'current',
            account_name: 'Main Account',
            balance: 1000,
            currency: 'GBP',
            last_updated: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      // @ts-expect-error - Cannot assign GroupedBalances to DatabaseGroupedBalances
      const invalidDbGrouped: DatabaseGroupedBalances = validGroupedBalances;

      expect(validDatabaseGroupedBalances.accounts[0].user_id).toBeDefined();
    });
  });
});
