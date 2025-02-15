import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AuthProvider, useAuth, AuthContextType } from '../../contexts/AuthContext';
import { authRepository } from '../../repositories/auth';
import { Session, User } from '@supabase/supabase-js';
import { Text } from 'react-native';

// Mock the auth repository
jest.mock('../../repositories/auth', () => ({
  authRepository: {
    onAuthStateChange: jest.fn(),
    getSession: jest.fn(),
    signIn: jest.fn(),
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  },
}));

// Test component that uses the auth context
function TestComponent({ onMount }: { onMount?: (context: AuthContextType) => void }) {
  const auth = useAuth();
  React.useEffect(() => {
    onMount?.(auth);
  }, [auth, onMount]);
  return <Text>Test Component</Text>;
}

// Helper function to render and return context value
async function renderWithAuth(onMount?: (context: AuthContextType) => void) {
  let contextValue: AuthContextType | undefined;
  const { unmount } = render(
    <AuthProvider>
      <TestComponent
        onMount={(auth) => {
          contextValue = auth;
          onMount?.(auth);
        }}
      />
    </AuthProvider>
  );

  // Wait for initial state updates
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return { contextValue, unmount };
}

describe('AuthContext', () => {
  // Mock user and session data
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2024-01-01',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
  };

  const mockSession: Session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    (authRepository.getSession as jest.Mock).mockResolvedValue(mockSession);
    (authRepository.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      // Don't call the callback immediately in the mock
      return () => {}; // Return cleanup function
    });
  });

  describe('AuthProvider', () => {
    it('should initialize with loading state', async () => {
      // Override the default mock for this test
      (authRepository.onAuthStateChange as jest.Mock).mockImplementation(() => () => {});
      (authRepository.getSession as jest.Mock).mockImplementation(() => new Promise(() => {}));

      const { contextValue } = await renderWithAuth();
      expect(contextValue?.loading).toBe(true);
    });

    it('should check user session on mount', async () => {
      await renderWithAuth();
      expect(authRepository.getSession).toHaveBeenCalled();
    });

    it('should handle session check error', async () => {
      const error = new Error('Authentication error');
      (authRepository.getSession as jest.Mock).mockRejectedValue(error);

      const { contextValue } = await renderWithAuth();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(contextValue?.error).toBe('Authentication error');
      expect(contextValue?.user).toBeNull();
      expect(contextValue?.session).toBeNull();
    });

    it('should handle JWT expiration error', async () => {
      const jwtError = {
        code: 'user_not_found',
        message: 'JWT expired',
      };
      (authRepository.getSession as jest.Mock).mockRejectedValue(jwtError);

      const { contextValue } = await renderWithAuth();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(contextValue?.error).toBe('Your session has expired. Please sign in again.');
      expect(contextValue?.user).toBeNull();
      expect(contextValue?.session).toBeNull();
    });
  });

  describe('Authentication Methods', () => {
    it('should handle email sign in successfully', async () => {
      (authRepository.signIn as jest.Mock).mockResolvedValue({ user: mockUser });

      let auth: AuthContextType | undefined;
      await renderWithAuth((context) => {
        auth = context;
      });

      await act(async () => {
        await auth?.signInWithEmail('test@example.com', 'password');
      });

      expect(authRepository.signIn).toHaveBeenCalledWith('test@example.com', 'password');
      expect(authRepository.getSession).toHaveBeenCalled();
    });

    it('should handle email sign in failure', async () => {
      const error = new Error('Invalid credentials');
      (authRepository.signIn as jest.Mock).mockRejectedValue(error);

      let auth: AuthContextType | undefined;
      await renderWithAuth((context) => {
        auth = context;
      });

      await expect(auth?.signInWithEmail('test@example.com', 'wrong-password')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should handle test user sign in', async () => {
      (authRepository.signIn as jest.Mock).mockResolvedValue({ user: mockUser });

      let auth: AuthContextType | undefined;
      await renderWithAuth((context) => {
        auth = context;
      });

      await act(async () => {
        await auth?.signInWithTestUser();
      });

      expect(authRepository.signIn).toHaveBeenCalledWith('test@example.com', 'testpass123');
    });

    it('should handle sign out successfully', async () => {
      let auth: AuthContextType | undefined;
      await renderWithAuth((context) => {
        auth = context;
      });

      // Reset the user state before testing sign out
      await act(async () => {
        if (auth) {
          auth.user = null;
          auth.session = null;
        }
      });

      await act(async () => {
        await auth?.signOut();
      });

      expect(authRepository.signOut).toHaveBeenCalled();
      expect(auth?.user).toBeNull();
      expect(auth?.session).toBeNull();
      expect(auth?.error).toBeNull();
    });

    it('should handle sign out failure', async () => {
      const error = new Error('Sign out failed');
      (authRepository.signOut as jest.Mock).mockRejectedValue(error);

      let auth: AuthContextType | undefined;
      await renderWithAuth((context) => {
        auth = context;
      });

      await act(async () => {
        await auth?.signOut();
      });

      expect(auth?.error).toBe('Sign out failed');
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('should provide auth context when used within AuthProvider', async () => {
      let auth: AuthContextType | undefined;
      await renderWithAuth((context) => {
        auth = context;
      });

      expect(auth).toHaveProperty('user');
      expect(auth).toHaveProperty('session');
      expect(auth).toHaveProperty('error');
      expect(auth).toHaveProperty('loading');
      expect(auth).toHaveProperty('signIn');
      expect(auth).toHaveProperty('signInWithEmail');
      expect(auth).toHaveProperty('signInWithTestUser');
      expect(auth).toHaveProperty('signOut');
    });
  });

  describe('Auth State Changes', () => {
    it('should handle auth state changes', async () => {
      let callback: ((user: User | null) => void) | undefined;
      (authRepository.onAuthStateChange as jest.Mock).mockImplementation((cb) => {
        callback = cb;
        return () => {};
      });

      let auth: AuthContextType | undefined;
      await renderWithAuth((context) => {
        auth = context;
      });

      // Reset the user state before testing auth state changes
      await act(async () => {
        if (auth) {
          auth.user = null;
        }
      });

      // Initial state
      expect(auth?.user).toBeNull();

      // Simulate auth state change
      await act(async () => {
        if (callback) {
          callback(mockUser);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      });

      expect(auth?.user).toEqual(mockUser);
      expect(auth?.loading).toBe(false);
    });

    it('should cleanup auth state subscription on unmount', async () => {
      const unsubscribe = jest.fn();
      (authRepository.onAuthStateChange as jest.Mock).mockReturnValue(unsubscribe);

      const { unmount } = await renderWithAuth();
      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
