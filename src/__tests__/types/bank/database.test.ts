import {
  DatabaseBalance,
  DatabaseBankAccount,
  DatabaseGroupedBalances,
} from '../../../types/bank/database';
import { Balance, BankAccount } from '../../../types/bank/balance';

describe('Bank Database Type System', () => {
  describe('DatabaseBalance Type', () => {
    it('should extend Balance type with database fields', () => {
      const baseBalance: Balance = {
        account_id: 'acc-123',
        current: 1000,
        available: 900,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const validDatabaseBalance: DatabaseBalance = {
        ...baseBalance,
        id: 'bal-123',
        user_id: 'user-123',
        connection_id: 'conn-123',
        created_at: '2024-01-01T00:00:00Z',
      };

      const invalidDatabaseBalance = {
        ...baseBalance,
        // missing required database fields
      };

      expect(validDatabaseBalance.id).toBeDefined();
      expect(validDatabaseBalance.user_id).toBeDefined();
      expect(validDatabaseBalance.connection_id).toBeDefined();
      expect(Object.keys(invalidDatabaseBalance).length).toBeLessThan(
        Object.keys(validDatabaseBalance).length
      );
    });

    it('should maintain Balance type constraints', () => {
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

      expect(validDatabaseBalance.current).toBeGreaterThan(validDatabaseBalance.available);
      expect(typeof validDatabaseBalance.current).toBe('number');
      expect(typeof validDatabaseBalance.available).toBe('number');
    });
  });

  describe('DatabaseBankAccount Type', () => {
    it('should extend BankAccount type with database fields', () => {
      const baseBankAccount: BankAccount = {
        account_id: 'acc-123',
        account_type: 'current',
        account_name: 'Main Account',
        balance: 1000,
        currency: 'GBP',
        last_updated: '2024-01-01T00:00:00Z',
      };

      const validDatabaseAccount: DatabaseBankAccount = {
        ...baseBankAccount,
        id: 'dbacc-123',
        user_id: 'user-123',
        connection_id: 'conn-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const invalidDatabaseAccount = {
        ...baseBankAccount,
        // missing required database fields
      };

      expect(validDatabaseAccount.id).toBeDefined();
      expect(validDatabaseAccount.user_id).toBeDefined();
      expect(validDatabaseAccount.connection_id).toBeDefined();
      expect(Object.keys(invalidDatabaseAccount).length).toBeLessThan(
        Object.keys(validDatabaseAccount).length
      );
    });

    it('should maintain BankAccount type constraints', () => {
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

      expect(typeof validDatabaseAccount.balance).toBe('number');
      expect(validDatabaseAccount.account_type).toBeDefined();
      expect(validDatabaseAccount.account_name).toBeDefined();
    });
  });

  describe('DatabaseGroupedBalances Type', () => {
    it('should validate DatabaseGroupedBalances type', () => {
      const validGroupedBalances: DatabaseGroupedBalances = {
        connection: {
          id: 'conn-123',
          provider: 'truelayer',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          bank_name: 'Test Bank',
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

      expect(validGroupedBalances.connection.provider).toBe('truelayer');
      expect(validGroupedBalances.accounts).toHaveLength(1);
      expect(validGroupedBalances.accounts[0].connection_id).toBe(
        validGroupedBalances.connection.id
      );
    });

    it('should handle optional bank_name field', () => {
      const validGroupedBalances: DatabaseGroupedBalances = {
        connection: {
          id: 'conn-123',
          provider: 'truelayer',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        accounts: [],
      };

      expect(validGroupedBalances.connection.bank_name).toBeUndefined();
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure proper type hierarchy between Balance types', () => {
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

      expect(databaseBalance.current).toBe(balance.current);
      expect(databaseBalance.available).toBe(balance.available);
      expect(databaseBalance.currency).toBe(balance.currency);
    });

    it('should ensure proper type hierarchy between BankAccount types', () => {
      const bankAccount: BankAccount = {
        account_id: 'acc-123',
        account_type: 'current',
        account_name: 'Main Account',
        balance: 1000,
        currency: 'GBP',
        last_updated: '2024-01-01T00:00:00Z',
      };

      const databaseAccount: DatabaseBankAccount = {
        ...bankAccount,
        id: 'dbacc-123',
        user_id: 'user-123',
        connection_id: 'conn-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(databaseAccount.balance).toBe(bankAccount.balance);
      expect(databaseAccount.account_type).toBe(bankAccount.account_type);
      expect(databaseAccount.currency).toBe(bankAccount.currency);
    });
  });
});
