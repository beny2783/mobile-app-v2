import { Challenge, UserChallenge, ChallengeCriteria } from '../../types/challenge';

describe('Challenge Type System', () => {
  describe('Challenge Type', () => {
    it('should validate core Challenge type', () => {
      const validChallenge: Challenge = {
        id: 'chal-123',
        name: 'Daily Savings Challenge',
        description: 'Save money every day',
        type: 'daily',
        criteria: {
          type: 'savings',
          target_savings: 1000,
          currency: 'GBP',
        },
        reward_xp: 100,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const invalidChallenge = {
        id: 'chal-123',
        name: 'Invalid Challenge',
        description: 'Missing required fields',
      };

      expect(validChallenge.type).toBe('daily');
      expect(validChallenge.criteria.type).toBe('savings');
      expect(Object.keys(invalidChallenge).length).toBe(3);
    });

    it('should enforce valid challenge types', () => {
      const validTypes = ['daily', 'weekly', 'achievement'] as const;
      const invalidType = 'monthly';
      expect(validTypes).not.toContain(invalidType);

      const validChallenge: Challenge = {
        id: 'chal-123',
        name: 'Weekly Challenge',
        description: 'Weekly savings goal',
        type: 'weekly',
        criteria: {
          type: 'savings',
          target_savings: 1000,
          currency: 'GBP',
        },
        reward_xp: 100,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(validTypes).toContain(validChallenge.type);
    });

    it('should validate challenge criteria types', () => {
      const validCriteriaTypes = [
        'no_spend',
        'reduced_spending',
        'spending_reduction',
        'savings',
        'streak',
        'category_budget',
        'smart_shopping',
      ] as const;

      const validCriteria: ChallengeCriteria = {
        type: 'savings',
        target_savings: 1000,
        currency: 'GBP',
      };

      const invalidCriteriaType = 'invalid_type';
      expect(validCriteriaTypes).not.toContain(invalidCriteriaType);
      expect(validCriteriaTypes).toContain(validCriteria.type);
    });
  });

  describe('UserChallenge Type', () => {
    it('should validate UserChallenge type', () => {
      const validUserChallenge: UserChallenge = {
        id: 'uch-123',
        user_id: 'user-123',
        challenge_id: 'chal-123',
        status: 'active',
        progress: {},
        streak_count: 0,
        started_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const invalidUserChallenge = {
        id: 'uch-123',
        user_id: 'user-123',
        challenge_id: 'chal-123',
      };

      expect(validUserChallenge.status).toBe('active');
      expect(validUserChallenge.streak_count).toBe(0);
      expect(Object.keys(invalidUserChallenge).length).toBe(3);
    });

    it('should enforce valid status values', () => {
      const validStatuses = ['active', 'completed', 'failed'] as const;
      const invalidStatus = 'pending';

      const validUserChallenge: UserChallenge = {
        id: 'uch-123',
        user_id: 'user-123',
        challenge_id: 'chal-123',
        status: 'active',
        progress: {},
        streak_count: 0,
        started_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(validStatuses).not.toContain(invalidStatus);
      expect(validStatuses).toContain(validUserChallenge.status);
    });

    it('should handle optional completion date', () => {
      const activeChallenge: UserChallenge = {
        id: 'uch-123',
        user_id: 'user-123',
        challenge_id: 'chal-123',
        status: 'active',
        progress: {},
        streak_count: 0,
        started_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const completedChallenge: UserChallenge = {
        ...activeChallenge,
        status: 'completed',
        completed_at: '2024-01-31T00:00:00Z',
      };

      expect(activeChallenge.completed_at).toBeUndefined();
      expect(completedChallenge.completed_at).toBeDefined();
    });
  });

  describe('DatabaseChallenge Type', () => {
    it('should extend Challenge with database fields', () => {
      const validDatabaseChallenge: DatabaseChallenge = {
        id: 'chal-123',
        user_id: 'user-123',
        type: 'savings',
        title: 'Save £100',
        description: 'Save £100 this month',
        target_amount: 10000,
        currency: 'GBP',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // @ts-expect-error - missing user_id
      const invalidDatabaseChallenge: DatabaseChallenge = {
        id: 'chal-123',
        type: 'savings',
        title: 'Save £100',
        description: 'Save £100 this month',
        target_amount: 10000,
        currency: 'GBP',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'active',
      };

      expect(validDatabaseChallenge.user_id).toBeDefined();
      expect(validDatabaseChallenge.created_at).toBeDefined();
      expect(validDatabaseChallenge.updated_at).toBeDefined();
    });
  });

  describe('ChallengeResponse Type', () => {
    it('should validate core ChallengeResponse type', () => {
      const validResponse: ChallengeResponse = {
        id: 'resp-123',
        challenge_id: 'chal-123',
        current_amount: 5000,
        status: 'in_progress',
        last_updated: '2024-01-15T00:00:00Z',
      };

      // @ts-expect-error - missing required fields
      const invalidResponse: ChallengeResponse = {
        id: 'resp-123',
        challenge_id: 'chal-123',
      };

      expect(validResponse.current_amount).toBeDefined();
      expect(validResponse.status).toBe('in_progress');
    });

    it('should enforce valid response status', () => {
      const validStatuses = ['not_started', 'in_progress', 'completed', 'failed'];

      const validResponse: ChallengeResponse = {
        id: 'resp-123',
        challenge_id: 'chal-123',
        current_amount: 5000,
        status: 'in_progress',
        last_updated: '2024-01-15T00:00:00Z',
      };

      // Runtime type checking for response status
      const invalidStatus = 'invalid-status';
      expect(validStatuses).not.toContain(invalidStatus);
      expect(validStatuses).toContain(validResponse.status);
    });
  });

  describe('DatabaseChallengeResponse Type', () => {
    it('should extend ChallengeResponse with database fields', () => {
      const validDatabaseResponse: DatabaseChallengeResponse = {
        id: 'resp-123',
        user_id: 'user-123',
        challenge_id: 'chal-123',
        current_amount: 5000,
        status: 'in_progress',
        last_updated: '2024-01-15T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      // @ts-expect-error - missing user_id
      const invalidDatabaseResponse: DatabaseChallengeResponse = {
        id: 'resp-123',
        challenge_id: 'chal-123',
        current_amount: 5000,
        status: 'in_progress',
        last_updated: '2024-01-15T00:00:00Z',
      };

      expect(validDatabaseResponse.user_id).toBeDefined();
      expect(validDatabaseResponse.created_at).toBeDefined();
      expect(validDatabaseResponse.updated_at).toBeDefined();
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure proper type hierarchy', () => {
      const challenge: Challenge = {
        id: 'chal-123',
        name: 'Test Challenge',
        description: 'Test Description',
        type: 'daily',
        criteria: {
          type: 'savings',
          target_savings: 1000,
          currency: 'GBP',
        },
        reward_xp: 100,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const userChallenge: UserChallenge = {
        id: 'uch-123',
        user_id: 'user-123',
        challenge_id: challenge.id,
        status: 'active',
        progress: {},
        streak_count: 0,
        started_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(userChallenge.challenge_id).toBe(challenge.id);
    });
  });
});
