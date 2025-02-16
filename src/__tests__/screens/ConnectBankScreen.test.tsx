import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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
  };

  const mockBankConnections = {
    connections: [],
    loading: false,
    error: null,
    refresh: jest.fn(),
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
      // Wait for all promises to resolve
      await Promise.resolve();
    });

    expect(mockTrueLayerService.getAuthUrl).toHaveBeenCalled();
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      'mock-auth-url',
      'spendingtracker://auth/callback'
    );
  });

  it('handles bank connection cancellation', async () => {
    const mockAuthResult = { type: 'cancel' };
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(mockAuthResult);

    const { getByText } = render(<ConnectBankScreen />);

    await act(async () => {
      fireEvent.press(getByText('Connect Bank'));
      // Wait for all promises to resolve
      await Promise.resolve();
    });

    expect(getByText('Bank connection cancelled or failed')).toBeTruthy();
  });
});
