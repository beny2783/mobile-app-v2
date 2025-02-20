import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { signInWithEmail, signInWithGoogle, signOut, checkUser, clearError } from './slice';
import {
  selectUser,
  selectSession,
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
} from './selectors';
import type { SignInWithEmailPayload } from './types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const session = useAppSelector(selectSession);
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const handleSignInWithEmail = useCallback(
    async (credentials: SignInWithEmailPayload) => {
      try {
        await dispatch(signInWithEmail(credentials)).unwrap();
      } catch (error) {
        throw error;
      }
    },
    [dispatch]
  );

  const handleSignInWithGoogle = useCallback(async () => {
    try {
      await dispatch(signInWithGoogle()).unwrap();
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleSignOut = useCallback(async () => {
    try {
      await dispatch(signOut()).unwrap();
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleCheckUser = useCallback(async () => {
    try {
      await dispatch(checkUser()).unwrap();
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    signInWithEmail: handleSignInWithEmail,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    checkUser: handleCheckUser,
    clearError: handleClearError,
  };
};
