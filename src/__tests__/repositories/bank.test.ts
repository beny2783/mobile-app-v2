import { TrueLayerService } from '../../services/trueLayer';
import { TrueLayerApiService } from '../../services/trueLayer/api/TrueLayerApiService';
import { TrueLayerStorageService } from '../../services/trueLayer/storage/TrueLayerStorageService';
import { TrueLayerTransactionService } from '../../services/trueLayer/transaction/TrueLayerTransactionService';
import { supabase } from '../../services/supabase';
import {
  TokenResponse,
  BankConnection,
  TrueLayerError,
  TrueLayerErrorCode,
  BalanceResponse,
  TrueLayerConfig,
} from '../../services/trueLayer/types';
import { Transaction } from '../../types';

// Mock Supabase client
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock EncryptionService
jest.mock('../../services/encryption', () => ({
  EncryptionService: jest.fn().mockImplementation(() => ({
    encrypt: jest.fn((value) => `encrypted_${value}`),
    decrypt: jest.fn((value) => value.replace('encrypted_', '')),
  })),
}));

// Mock TrueLayer service
const mockTrueLayerService = {
  getAuthUrl: jest.fn(),
  exchangeToken: jest.fn(),
  fetchTransactionsForConnection: jest.fn(),
  disconnectBank: jest.fn(),
};

jest.mock('../../services/trueLayer', () => ({
  TrueLayerService: jest.fn().mockImplementation(() => mockTrueLayerService),
}));

describe('TrueLayerService', () => {
  let service: typeof mockTrueLayerService;
  const mockUserId = 'test-user-id';
  const mockConfig = {
    clientId: 'test-client-id',
    redirectUri: 'test-redirect-uri',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = mockTrueLayerService;
  });

  describe('getAuthUrl', () => {
    it('should return the correct auth URL with all required parameters for production', () => {
      const mockProdConfig = {
        clientId: 'prod-client-id',
        redirectUri: 'test-redirect-uri',
      };
      const mockProdAuthUrl =
        'https://auth.truelayer.com/?response_type=code&client_id=prod-client-id&redirect_uri=test-redirect-uri&scope=info accounts balance cards transactions&providers=uk-ob-all uk-oauth-all&enable_mock=false&enable_oauth_providers=true&enable_open_banking_providers=true&enable_credentials_sharing_providers=false';
      service.getAuthUrl.mockReturnValue(mockProdAuthUrl);

      const authUrl = service.getAuthUrl();

      expect(authUrl).toBe(mockProdAuthUrl);
      expect(authUrl).toContain('scope=info accounts balance cards transactions');
      expect(authUrl).toContain('providers=uk-ob-all uk-oauth-all');
      expect(authUrl).toContain('enable_mock=false');
      expect(service.getAuthUrl).toHaveBeenCalled();
    });

    it('should return the correct auth URL with sandbox parameters for development', () => {
      const mockSandboxConfig = {
        clientId: 'sandbox-client-id',
        redirectUri: 'test-redirect-uri',
      };
      const mockSandboxAuthUrl =
        'https://auth.truelayer-sandbox.com/?response_type=code&client_id=sandbox-client-id&redirect_uri=test-redirect-uri&scope=info accounts balance cards transactions&providers=mock&enable_mock=true&disable_providers=true&test_provider=mock&mock_provider=mock';
      service.getAuthUrl.mockReturnValue(mockSandboxAuthUrl);

      const authUrl = service.getAuthUrl();

      expect(authUrl).toBe(mockSandboxAuthUrl);
      expect(authUrl).toContain('scope=info accounts balance cards transactions');
      expect(authUrl).toContain('providers=mock');
      expect(authUrl).toContain('enable_mock=true');
      expect(service.getAuthUrl).toHaveBeenCalled();
    });
  });

  describe('exchangeToken', () => {
    const mockCode = 'test-auth-code';

    it('should exchange auth code for tokens with refresh token and store them', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };

      service.exchangeToken.mockResolvedValue(mockTokenResponse);

      const result = await service.exchangeToken(mockCode);

      expect(result).toEqual(mockTokenResponse);
      expect(result.refresh_token).toBeDefined();
      expect(result.expires_in).toBeGreaterThan(0);
      expect(service.exchangeToken).toHaveBeenCalledWith(mockCode);
    });

    it('should handle token exchange without refresh token', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'test-access-token',
        expires_in: 3600,
      };

      service.exchangeToken.mockResolvedValue(mockTokenResponse);

      const result = await service.exchangeToken(mockCode);

      expect(result).toEqual(mockTokenResponse);
      expect(result.refresh_token).toBeUndefined();
      expect(service.exchangeToken).toHaveBeenCalledWith(mockCode);
    });

    it('should handle token exchange with immediate expiry', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 0,
      };

      service.exchangeToken.mockResolvedValue(mockTokenResponse);

      const result = await service.exchangeToken(mockCode);

      expect(result).toEqual(mockTokenResponse);
      expect(result.expires_in).toBe(0);
      expect(service.exchangeToken).toHaveBeenCalledWith(mockCode);
    });

    it('should handle invalid auth code', async () => {
      service.exchangeToken.mockRejectedValue(
        new TrueLayerError('Invalid authorization code', TrueLayerErrorCode.TOKEN_EXCHANGE_FAILED)
      );

      await expect(service.exchangeToken('invalid-code')).rejects.toThrow(TrueLayerError);
      await expect(service.exchangeToken('invalid-code')).rejects.toThrow(
        'Invalid authorization code'
      );
    });

    it('should handle rate limit exceeded', async () => {
      service.exchangeToken.mockRejectedValue(
        new TrueLayerError('Rate limit exceeded', TrueLayerErrorCode.RATE_LIMIT_EXCEEDED)
      );

      await expect(service.exchangeToken(mockCode)).rejects.toThrow(TrueLayerError);
      await expect(service.exchangeToken(mockCode)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      service.exchangeToken.mockRejectedValue(
        new TrueLayerError('Network error', TrueLayerErrorCode.TOKEN_EXCHANGE_FAILED)
      );

      await expect(service.exchangeToken(mockCode)).rejects.toThrow(TrueLayerError);
    });
  });

  describe('fetchTransactionsForConnection', () => {
    const mockConnectionId = 'test-connection-id';
    const mockTransactions: Transaction[] = [
      {
        transaction_id: '1',
        account_id: 'test-account',
        connection_id: mockConnectionId,
        timestamp: '2024-01-01T00:00:00Z',
        description: 'Test Transaction',
        amount: 100,
        currency: 'GBP',
        transaction_type: 'debit',
        transaction_category: 'shopping',
        merchant_name: 'Test Store',
      },
    ];

    it('should fetch and process transactions for a connection with date range', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');
      service.fetchTransactionsForConnection.mockResolvedValue(mockTransactions);

      const result = await service.fetchTransactionsForConnection(
        mockConnectionId,
        fromDate,
        toDate
      );

      expect(result).toEqual(mockTransactions);
      expect(service.fetchTransactionsForConnection).toHaveBeenCalledWith(
        mockConnectionId,
        fromDate,
        toDate
      );
    });

    it('should fetch transactions without date range', async () => {
      service.fetchTransactionsForConnection.mockResolvedValue(mockTransactions);

      const result = await service.fetchTransactionsForConnection(mockConnectionId);

      expect(result).toEqual(mockTransactions);
      expect(service.fetchTransactionsForConnection).toHaveBeenCalledWith(mockConnectionId);
    });

    it('should handle empty transaction list', async () => {
      service.fetchTransactionsForConnection.mockResolvedValue([]);

      const result = await service.fetchTransactionsForConnection(mockConnectionId);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should handle unauthorized access', async () => {
      service.fetchTransactionsForConnection.mockRejectedValue(
        new TrueLayerError('Unauthorized access', TrueLayerErrorCode.UNAUTHORIZED)
      );

      await expect(service.fetchTransactionsForConnection(mockConnectionId)).rejects.toThrow(
        TrueLayerError
      );
      await expect(service.fetchTransactionsForConnection(mockConnectionId)).rejects.toThrow(
        'Unauthorized access'
      );
    });

    it('should handle inactive connection', async () => {
      service.fetchTransactionsForConnection.mockRejectedValue(
        new TrueLayerError('No active connection found', TrueLayerErrorCode.NO_ACTIVE_CONNECTION)
      );

      await expect(service.fetchTransactionsForConnection(mockConnectionId)).rejects.toThrow(
        TrueLayerError
      );
      await expect(service.fetchTransactionsForConnection(mockConnectionId)).rejects.toThrow(
        'No active connection found'
      );
    });

    it('should handle rate limiting', async () => {
      service.fetchTransactionsForConnection.mockRejectedValue(
        new TrueLayerError('Rate limit exceeded', TrueLayerErrorCode.RATE_LIMIT_EXCEEDED)
      );

      await expect(service.fetchTransactionsForConnection(mockConnectionId)).rejects.toThrow(
        TrueLayerError
      );
      await expect(service.fetchTransactionsForConnection(mockConnectionId)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });

  describe('disconnectBank', () => {
    const mockConnectionId = 'test-connection-id';

    it('should successfully disconnect a bank connection', async () => {
      service.disconnectBank.mockResolvedValue(undefined);

      await service.disconnectBank(mockConnectionId);

      expect(service.disconnectBank).toHaveBeenCalledWith(mockConnectionId);
    });

    it('should handle disconnection of already disconnected bank', async () => {
      service.disconnectBank.mockRejectedValue(
        new TrueLayerError(
          'Connection already disconnected',
          TrueLayerErrorCode.NO_ACTIVE_CONNECTION
        )
      );

      await expect(service.disconnectBank(mockConnectionId)).rejects.toThrow(TrueLayerError);
      await expect(service.disconnectBank(mockConnectionId)).rejects.toThrow(
        'Connection already disconnected'
      );
    });

    it('should handle disconnection with pending transactions', async () => {
      service.disconnectBank.mockRejectedValue(
        new TrueLayerError(
          'Cannot disconnect: pending transactions exist',
          TrueLayerErrorCode.STORAGE_FAILED
        )
      );

      await expect(service.disconnectBank(mockConnectionId)).rejects.toThrow(TrueLayerError);
      await expect(service.disconnectBank(mockConnectionId)).rejects.toThrow(
        'Cannot disconnect: pending transactions exist'
      );
    });

    it('should handle unauthorized disconnection attempt', async () => {
      service.disconnectBank.mockRejectedValue(
        new TrueLayerError(
          'Unauthorized to disconnect this connection',
          TrueLayerErrorCode.UNAUTHORIZED
        )
      );

      await expect(service.disconnectBank(mockConnectionId)).rejects.toThrow(TrueLayerError);
      await expect(service.disconnectBank(mockConnectionId)).rejects.toThrow(
        'Unauthorized to disconnect this connection'
      );
    });

    it('should handle invalid connection ID', async () => {
      service.disconnectBank.mockRejectedValue(
        new TrueLayerError('Invalid connection ID', TrueLayerErrorCode.STORAGE_FAILED)
      );

      await expect(service.disconnectBank('invalid-id')).rejects.toThrow(TrueLayerError);
      await expect(service.disconnectBank('invalid-id')).rejects.toThrow('Invalid connection ID');
    });
  });
});
