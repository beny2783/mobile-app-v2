import { BankConnection, BankConnectionWithAccounts } from '../../../types/bank/connection';

describe('Bank Connection Type System', () => {
  describe('BankConnection Type', () => {
    it('should validate core BankConnection type', () => {
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

      const invalidConnection = {
        id: 'conn-123',
        user_id: 'user-123',
        // missing required fields
      };

      expect(validConnection.status).toBe('active');
      expect(Object.keys(invalidConnection).length).toBeLessThan(
        Object.keys(validConnection).length
      );
    });

    it('should enforce valid status values', () => {
      const validStatuses = ['active', 'inactive', 'error'] as const;

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

      const invalidStatus = 'disconnected';
      expect(validStatuses).not.toContain(invalidStatus);
      expect(validStatuses).toContain(validConnection.status);
    });

    it('should handle optional fields correctly', () => {
      const minimalConnection: BankConnection = {
        id: 'conn-123',
        user_id: 'user-123',
        provider: 'truelayer',
        status: 'active',
        encrypted_access_token: null,
        encrypted_refresh_token: null,
        expires_at: '2024-01-01T00:00:00Z',
        last_sync: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        disconnected_at: null,
      };

      expect(minimalConnection.encrypted_access_token).toBeNull();
      expect(minimalConnection.encrypted_refresh_token).toBeNull();
      expect(minimalConnection.last_sync).toBeNull();
      expect(minimalConnection.disconnected_at).toBeNull();
    });
  });

  describe('BankConnectionWithAccounts Type', () => {
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
      expect(validConnectionWithAccounts.bank_accounts![0].count).toBe(2);
    });

    it('should enforce valid sync status values', () => {
      const validSyncStatuses = ['pending', 'needs_update', 'success'] as const;

      const validConnection: BankConnectionWithAccounts = {
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
        last_sync_status: 'success',
      };

      const invalidSyncStatus = 'failed';
      expect(validSyncStatuses).not.toContain(invalidSyncStatus);
      expect(validSyncStatuses).toContain(validConnection.last_sync_status!);
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure proper type hierarchy', () => {
      const baseConnection: BankConnection = {
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

      const connectionWithAccounts: BankConnectionWithAccounts = {
        ...baseConnection,
        account_count: 2,
        last_sync_status: 'success',
        bank_accounts: [{ count: 2 }],
      };

      expect(connectionWithAccounts.id).toBe(baseConnection.id);
      expect(connectionWithAccounts.status).toBe(baseConnection.status);
      expect(connectionWithAccounts.account_count).toBeDefined();
    });

    it('should handle sync status transitions', () => {
      const connection: BankConnectionWithAccounts = {
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
        last_sync_status: 'pending',
      };

      // Simulate sync status transitions
      const updatedConnection: BankConnectionWithAccounts = {
        ...connection,
        last_sync: '2024-01-01T00:00:01Z',
        last_sync_status: 'success',
      };

      expect(connection.last_sync_status).toBe('pending');
      expect(updatedConnection.last_sync_status).toBe('success');
      expect(updatedConnection.last_sync).toBeDefined();
    });
  });
});
