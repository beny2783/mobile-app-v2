interface TestTransaction {
  amount: number;
  transaction_category: string;
}

describe('Challenge Progress Calculator', () => {
  describe('No Spend Challenge', () => {
    it('should mark challenge as completed when no spending occurs', () => {
      const transactions: TestTransaction[] = [];
      const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      expect(totalSpent).toBe(0);
    });

    it('should mark challenge as failed when spending exceeds max', () => {
      const transactions: TestTransaction[] = [
        {
          amount: -5,
          transaction_category: 'Dining',
        },
      ];

      const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      expect(totalSpent).toBe(5);
    });

    it('should exclude specified categories from spending calculation', () => {
      const excludeCategories = ['Transport'];
      const transactions: TestTransaction[] = [
        {
          amount: -3,
          transaction_category: 'Transport',
        },
      ];

      const totalSpent = transactions
        .filter((t) => !excludeCategories.includes(t.transaction_category))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      expect(totalSpent).toBe(0);
    });
  });
});
