import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import CallbackScreen from '../../screens/CallbackScreen';
import { getTrueLayerService } from '../../services/trueLayer';

jest.mock('../../services/trueLayer');

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

const createMockRoute = (params = {}) => ({
  params,
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => createMockRoute({}),
}));

describe('CallbackScreen', () => {
  const mockTrueLayerService = {
    exchangeCode: jest.fn().mockResolvedValue({
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getTrueLayerService as jest.Mock).mockReturnValue(mockTrueLayerService);
  });

  it('renders loading indicator', () => {
    const { getByTestId } = render(<CallbackScreen />);
    expect(getByTestId('callback-loading-indicator')).toBeTruthy();
  });

  it('handles successful code exchange', async () => {
    const mockUrl = 'spendingtracker://auth/callback?code=test-code';
    jest
      .spyOn(require('@react-navigation/native'), 'useRoute')
      .mockReturnValue(createMockRoute({ url: mockUrl }));

    mockTrueLayerService.exchangeCode.mockResolvedValue({
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    });

    render(<CallbackScreen />);

    await waitFor(() => {
      expect(mockTrueLayerService.exchangeCode).toHaveBeenCalledWith('test-code');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Home', { success: true });
    });
  });

  it('handles missing URL in params', async () => {
    jest
      .spyOn(require('@react-navigation/native'), 'useRoute')
      .mockReturnValue(createMockRoute({}));

    render(<CallbackScreen />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ConnectBank', {
        error: 'Missing callback URL',
      });
    });
  });

  it('handles code exchange failure', async () => {
    const mockUrl = 'spendingtracker://auth/callback?code=invalid-code';
    jest
      .spyOn(require('@react-navigation/native'), 'useRoute')
      .mockReturnValue(createMockRoute({ url: mockUrl }));

    const mockError = new Error('Failed to exchange code');
    mockTrueLayerService.exchangeCode.mockRejectedValue(mockError);

    render(<CallbackScreen />);

    await waitFor(() => {
      expect(mockTrueLayerService.exchangeCode).toHaveBeenCalledWith('invalid-code');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Home', {
        error: 'Failed to exchange code',
      });
    });
  });

  it('handles TrueLayer error response', async () => {
    const mockUrl =
      'spendingtracker://auth/callback?error=access_denied&error_description=User+cancelled';
    jest
      .spyOn(require('@react-navigation/native'), 'useRoute')
      .mockReturnValue(createMockRoute({ url: mockUrl }));

    render(<CallbackScreen />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Home', {
        error: 'User cancelled',
      });
    });
  });

  it('handles malformed callback URL', async () => {
    const mockUrl = 'invalid-url';
    jest
      .spyOn(require('@react-navigation/native'), 'useRoute')
      .mockReturnValue(createMockRoute({ url: mockUrl }));

    render(<CallbackScreen />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ConnectBank', {
        error: 'Invalid URL: invalid-url',
      });
    });
  });
});
