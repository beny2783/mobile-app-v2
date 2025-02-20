import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import authReducer from '../../store/slices/auth/slice';
import AuthScreen from '../../screens/AuthScreen';
import { authRepository } from '../../repositories/auth';

jest.mock('../../repositories/auth');

describe('Auth Flow Integration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <NavigationContainer>{component}</NavigationContainer>
      </Provider>
    );
  };

  it('should show loading state during authentication', async () => {
    const { getByText, queryByText } = renderWithProviders(<AuthScreen />);

    // Mock a slow auth response
    (authRepository.signInWithGoogle as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    // Click sign in button
    fireEvent.press(getByText('Sign in with Google'));

    // Verify loading state
    expect(queryByText('Sign in with Google')).toBeDisabled();

    // Wait for auth to complete
    await waitFor(() => {
      expect(queryByText('Sign in with Google')).not.toBeDisabled();
    });
  });

  it('should display error message on auth failure', async () => {
    const { getByText, findByText } = renderWithProviders(<AuthScreen />);

    // Mock auth failure
    (authRepository.signInWithGoogle as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to authenticate')
    );

    // Click sign in button
    fireEvent.press(getByText('Sign in with Google'));

    // Verify error message appears
    expect(await findByText('Failed to authenticate')).toBeTruthy();
  });

  it('should handle successful authentication', async () => {
    const { getByText } = renderWithProviders(<AuthScreen />);

    const mockUser = { id: '1', email: 'test@example.com' };
    const mockSession = { access_token: 'token', user: mockUser };

    // Mock successful auth
    (authRepository.signInWithGoogle as jest.Mock).mockResolvedValueOnce(undefined);
    (authRepository.getSession as jest.Mock).mockResolvedValueOnce(mockSession);

    // Click sign in button
    fireEvent.press(getByText('Sign in with Google'));

    // Verify auth state updated
    await waitFor(() => {
      expect(store.getState().auth.user).toEqual(mockUser);
      expect(store.getState().auth.session).toEqual(mockSession);
    });
  });

  it('should handle test user authentication in dev mode', async () => {
    const { getByText } = renderWithProviders(<AuthScreen />);

    const mockUser = { id: '1', email: 'test@example.com' };
    const mockSession = { access_token: 'token', user: mockUser };

    // Mock successful auth
    (authRepository.signIn as jest.Mock).mockResolvedValueOnce(undefined);
    (authRepository.getSession as jest.Mock).mockResolvedValueOnce(mockSession);

    // Click test user sign in button
    fireEvent.press(getByText('Sign in as Test User'));

    // Verify auth state updated
    await waitFor(() => {
      expect(store.getState().auth.user).toEqual(mockUser);
      expect(store.getState().auth.session).toEqual(mockSession);
    });
  });
});
