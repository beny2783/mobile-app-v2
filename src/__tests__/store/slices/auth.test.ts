import { configureStore, AnyAction } from '@reduxjs/toolkit';
import { ThunkDispatch } from 'redux-thunk';
import authReducer, {
  checkUser,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  clearError,
  setUser,
  setSession,
} from '../../../store/slices/auth/slice';
import { authRepository } from '../../../repositories/auth';
import { RootState } from '../../../store';
import { AuthState } from '../../../store/slices/auth/types';

// Mock the auth repository
jest.mock('../../../repositories/auth', () => ({
  authRepository: {
    getSession: jest.fn(),
    signIn: jest.fn(),
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  },
}));

interface TestError extends Error {
  code?: string;
}

describe('auth slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: null,
          session: null,
          loading: true,
          error: null,
        },
      },
    });
    jest.clearAllMocks();
  });

  const getAuthState = (state: any): AuthState => state.auth;

  describe('reducers', () => {
    it('should handle initial state', () => {
      expect(getAuthState(store.getState())).toEqual({
        user: null,
        session: null,
        loading: true,
        error: null,
      });
    });

    it('should handle clearError', () => {
      store.dispatch(setUser({ id: '1', email: 'test@example.com' }));
      store.dispatch(clearError());
      expect(getAuthState(store.getState()).error).toBeNull();
    });

    it('should handle setUser', () => {
      const user = { id: '1', email: 'test@example.com' };
      store.dispatch(setUser(user));
      expect(getAuthState(store.getState()).user).toEqual(user);
    });

    it('should handle setSession', () => {
      const session = { access_token: 'token', user: { id: '1', email: 'test@example.com' } };
      store.dispatch(setSession(session));
      expect(getAuthState(store.getState()).session).toEqual(session);
    });
  });

  describe('async thunks', () => {
    describe('checkUser', () => {
      it('should handle successful session check', async () => {
        const session = {
          access_token: 'token',
          user: { id: '1', email: 'test@example.com' },
        };
        (authRepository.getSession as jest.Mock).mockResolvedValueOnce(session);

        await (store.dispatch as ThunkDispatch<RootState, void, AnyAction>)(checkUser());

        expect(getAuthState(store.getState())).toEqual({
          user: session.user,
          session,
          loading: false,
          error: null,
        });
      });

      it('should handle session check failure', async () => {
        const error: TestError = new Error('Session expired');
        error.code = 'user_not_found';
        error.message = 'JWT expired';
        (authRepository.getSession as jest.Mock).mockRejectedValueOnce(error);

        await (store.dispatch as ThunkDispatch<RootState, void, AnyAction>)(checkUser());

        expect(getAuthState(store.getState())).toEqual({
          user: null,
          session: null,
          loading: false,
          error: 'Your session has expired. Please sign in again.',
        });
      });
    });

    describe('signInWithEmail', () => {
      it('should handle successful sign in', async () => {
        const session = {
          access_token: 'token',
          user: { id: '1', email: 'test@example.com' },
        };
        (authRepository.signIn as jest.Mock).mockResolvedValueOnce(undefined);
        (authRepository.getSession as jest.Mock).mockResolvedValueOnce(session);

        await (store.dispatch as ThunkDispatch<RootState, void, AnyAction>)(
          signInWithEmail({ email: 'test@example.com', password: 'password' })
        );

        expect(getAuthState(store.getState())).toEqual({
          user: session.user,
          session,
          loading: false,
          error: null,
        });
      });

      it('should handle sign in failure', async () => {
        const error = new Error('Invalid credentials');
        (authRepository.signIn as jest.Mock).mockRejectedValueOnce(error);

        await (store.dispatch as ThunkDispatch<RootState, void, AnyAction>)(
          signInWithEmail({ email: 'test@example.com', password: 'wrong' })
        );

        expect(getAuthState(store.getState())).toEqual({
          user: null,
          session: null,
          loading: false,
          error: 'Invalid credentials',
        });
      });
    });

    describe('signOut', () => {
      it('should handle successful sign out', async () => {
        // Set initial authenticated state
        store.dispatch(setUser({ id: '1', email: 'test@example.com' }));
        store.dispatch(
          setSession({ access_token: 'token', user: { id: '1', email: 'test@example.com' } })
        );

        (authRepository.signOut as jest.Mock).mockResolvedValueOnce(undefined);

        await (store.dispatch as ThunkDispatch<RootState, void, AnyAction>)(signOut());

        expect(getAuthState(store.getState())).toEqual({
          user: null,
          session: null,
          loading: false,
          error: null,
        });
      });

      it('should handle sign out failure', async () => {
        const error = new Error('Network error');
        (authRepository.signOut as jest.Mock).mockRejectedValueOnce(error);

        await (store.dispatch as ThunkDispatch<RootState, void, AnyAction>)(signOut());

        expect(getAuthState(store.getState()).error).toBe('Network error');
      });
    });
  });
});
