import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import ConnectBankScreen from '../../screens/ConnectBankScreen';
import { useServices } from '../../contexts/ServiceContext';
import { useBankConnections } from '../../hooks/useBankConnections';
import * as WebBrowser from 'expo-web-browser';

jest.mock('../../contexts/ServiceContext');
jest.mock('../../hooks/useBankConnections');
jest.mock('expo-web-browser');

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: {},
  }),
}));

describe('ConnectBankScreen', () => {
  const mockTrueLayerService = {
    getAuthUrl: jest.fn().mockReturnValue('mock-auth-url'),
    exchangeCode: jest.fn().mockResolvedValue(undefined),
  };

  const mockBankConnections = {
    connections: [],
    loading: false,
    error: null,
    refresh: jest.fn().mockResolvedValue(undefined),
    disconnectBank: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useServices as jest.Mock).mockReturnValue({ trueLayerService: mockTrueLayerService });
    (useBankConnections as jest.Mock).mockReturnValue(mockBankConnections);
  });

  it('renders connect bank button', () => {
    const { getByText } = render(<ConnectBankScreen />);
    expect(getByText('Connect Bank')).toBeTruthy();
  });

  it('handles successful bank connection', async () => {
    const mockAuthResult = {
      type: 'success',
      url: 'spendingtracker://auth/callback?code=test-code',
    };
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(mockAuthResult);

    const { getByText } = render(<ConnectBankScreen />);

    await act(async () => {
      fireEvent.press(getByText('Connect Bank'));
    });

    await waitFor(() => {
      expect(mockTrueLayerService.getAuthUrl).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        'mock-auth-url',
        'spendingtracker://auth/callback'
      );
    });

    await waitFor(() => {
      expect(mockTrueLayerService.exchangeCode).toHaveBeenCalledWith('test-code');
    });

    await waitFor(() => {
      expect(mockBankConnections.refresh).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Transactions', { refresh: true });
    });
  });

  it('handles bank connection cancellation', async () => {
    const mockAuthResult = { type: 'cancel' };
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(mockAuthResult);

    const { getByText } = render(<ConnectBankScreen />);

    await act(async () => {
      fireEvent.press(getByText('Connect Bank'));
    });

    await waitFor(() => {
      expect(getByText('Bank connection cancelled or failed')).toBeTruthy();
    });
  });

  it('handles code exchange failure', async () => {
    const mockAuthResult = {
      type: 'success',
      url: 'spendingtracker://auth/callback?code=invalid-code',
    };
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(mockAuthResult);
    mockTrueLayerService.exchangeCode.mockRejectedValueOnce(new Error('Exchange failed'));

    const { getByText } = render(<ConnectBankScreen />);

    await act(async () => {
      fireEvent.press(getByText('Connect Bank'));
    });

    await waitFor(() => {
      expect(mockTrueLayerService.exchangeCode).toHaveBeenCalledWith('invalid-code');
    });

    await waitFor(() => {
      expect(getByText('Failed to complete bank connection')).toBeTruthy();
    });
  });

  it('handles bank disconnection', async () => {
    const mockConnection = {
      id: 'test-connection',
      bank_name: 'Test Bank',
      provider: 'test',
      account_count: 1,
      last_sync_status: 'success',
      last_sync: new Date().toISOString(),
    };

    (useBankConnections as jest.Mock).mockReturnValue({
      ...mockBankConnections,
      connections: [mockConnection],
    });

    const { getByText } = render(<ConnectBankScreen />);

    await act(async () => {
      fireEvent.press(getByText('Disconnect'));
    });

    await waitFor(() => {
      expect(mockBankConnections.disconnectBank).toHaveBeenCalledWith('test-connection');
    });
  });
});
