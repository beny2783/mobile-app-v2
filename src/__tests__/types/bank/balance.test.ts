import {
  Balance,
  BankAccount,
  TrueLayerBalance,
  BalanceResponse,
  GroupedBalances,
  BalancePoint,
  AccountBalance,
  BalanceData,
} from '../../../types/bank/balance';

describe('Bank Balance Type System', () => {
  describe('Balance Type', () => {
    it('should validate core Balance type', () => {
      const validBalance: Balance = {
        account_id: 'acc-123',
        current: 1000,
        available: 900,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const invalidBalance = {
        account_id: 'acc-123',
        current: 1000,
        // missing required fields
      };

      expect(validBalance.current).toBeGreaterThan(validBalance.available);
      expect(Object.keys(invalidBalance).length).toBeLessThan(Object.keys(validBalance).length);
    });

    it('should enforce numeric balance values', () => {
      const validBalance: Balance = {
        account_id: 'acc-123',
        current: 1000.5,
        available: 900.25,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const invalidBalanceValues = {
        ...validBalance,
        current: '1000.50', // should be number
        available: '900.25', // should be number
      };

      expect(typeof validBalance.current).toBe('number');
      expect(typeof validBalance.available).toBe('number');
      expect(typeof invalidBalanceValues.current).toBe('string');
    });
  });

  describe('BankAccount Type', () => {
    it('should validate BankAccount type', () => {
      const validAccount: BankAccount = {
        account_id: 'acc-123',
        account_type: 'current',
        account_name: 'Main Account',
        balance: 1000,
        currency: 'GBP',
        last_updated: '2024-01-01T00:00:00Z',
      };

      const invalidAccount = {
        account_id: 'acc-123',
        balance: 1000,
        // missing required fields
      };

      expect(validAccount.account_type).toBeDefined();
      expect(validAccount.account_name).toBeDefined();
      expect(Object.keys(invalidAccount).length).toBeLessThan(Object.keys(validAccount).length);
    });
  });

  describe('TrueLayer Types', () => {
    it('should validate TrueLayerBalance type', () => {
      const validTrueLayerBalance: TrueLayerBalance = {
        account_id: 'acc-123',
        current: 1000,
        available: 900,
        currency: 'GBP',
        update_timestamp: '2024-01-01T00:00:00Z',
      };

      const validResponse: BalanceResponse = {
        results: [validTrueLayerBalance],
        status: 'succeeded',
      };

      expect(validResponse.status).toBe('succeeded');
      expect(validResponse.results).toHaveLength(1);
      expect(validResponse.results[0].currency).toBe('GBP');
    });

    it('should enforce valid status values', () => {
      const validStatuses = ['succeeded', 'failed', 'pending'] as const;

      const validResponse: BalanceResponse = {
        results: [],
        status: 'succeeded',
      };

      const invalidStatus = 'processing';
      expect(validStatuses).not.toContain(invalidStatus);
      expect(validStatuses).toContain(validResponse.status);
    });
  });

  describe('GroupedBalances Type', () => {
    it('should validate GroupedBalances type', () => {
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

      expect(validGroupedBalances.accounts).toHaveLength(1);
      expect(validGroupedBalances.provider_name).toBeDefined();
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
      expect(validBalancePoint.transactions![0].amount).toBeLessThan(0);
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

      expect(validBalanceData.current).toBeLessThan(validBalanceData.projected);
      expect(validBalanceData.history).toHaveLength(1);
      expect(validBalanceData.forecast).toHaveLength(1);
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure proper type hierarchy', () => {
      const bankAccount: BankAccount = {
        account_id: 'acc-123',
        account_type: 'current',
        account_name: 'Main Account',
        balance: 1000,
        currency: 'GBP',
        last_updated: '2024-01-01T00:00:00Z',
      };

      const accountBalance: AccountBalance = {
        ...bankAccount,
        account_id: bankAccount.account_id,
        balance: bankAccount.balance,
        currency: bankAccount.currency,
        account_name: bankAccount.account_name,
        account_type: bankAccount.account_type,
        last_updated: bankAccount.last_updated,
      };

      expect(accountBalance.account_id).toBe(bankAccount.account_id);
      expect(accountBalance.balance).toBe(bankAccount.balance);
    });

    it('should handle currency consistency', () => {
      const balance: Balance = {
        account_id: 'acc-123',
        current: 1000,
        available: 900,
        currency: 'GBP',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const bankAccount: BankAccount = {
        account_id: balance.account_id,
        account_type: 'current',
        account_name: 'Main Account',
        balance: balance.current,
        currency: balance.currency,
        last_updated: balance.updated_at,
      };

      expect(bankAccount.currency).toBe(balance.currency);
      expect(bankAccount.balance).toBe(balance.current);
    });
  });
});
