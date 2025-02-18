import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { authRepository } from '../repositories/auth';

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  error: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithTestUser: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug logging for state changes
  useEffect(() => {
    console.log('[AuthContext] State updated:', {
      loading,
      isAuthenticated: !!user,
      userId: user?.id,
      sessionExists: !!session,
    });
  }, [loading, user, session]);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth provider...');
    // Initial session check
    checkUser();

    // Subscribe to auth state changes
    console.log('[AuthContext] Setting up auth state change subscription');
    const unsubscribe = authRepository.onAuthStateChange(async (newUser) => {
      console.log('[AuthContext] Auth state changed, updating user:', newUser?.id ?? 'No user');
      setUser(newUser);
      if (newUser) {
        // If we have a user, get their session
        const session = await authRepository.getSession();
        setSession(session);
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth provider...');
      unsubscribe();
    };
  }, []);

  async function checkUser() {
    console.log('[AuthContext] Checking current user session...');
    try {
      const session = await authRepository.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setError(null);
    } catch (error: any) {
      console.error('[AuthContext] Error checking session:', error);
      // If the token is invalid, clear the session and user state
      if (error.code === 'user_not_found' && error.message.includes('JWT')) {
        setSession(null);
        setUser(null);
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(error.message || 'Authentication error');
      }
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[AuthContext] Attempting email sign in...');
    try {
      await authRepository.signIn(email, password);
      await checkUser();
      setError(null); // Clear any previous errors on success
    } catch (error: any) {
      console.error('[AuthContext] Email sign in failed:', error);
      setError(error.message || 'Sign in failed');
      throw error;
    }
  };

  const signInWithTestUser = async () => {
    console.log('[AuthContext] Attempting test user sign in...');
    try {
      await signInWithEmail('test@example.com', 'testpass123');
      setError(null); // Clear any previous errors on success
    } catch (error: any) {
      console.error('[AuthContext] Test user sign in failed:', error);
      setError(error.message || 'Test user sign in failed');
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    console.log('[AuthContext] Initiating Google sign in...');
    try {
      await authRepository.signInWithGoogle();
      console.log('[AuthContext] Google sign in completed');
    } catch (error) {
      console.error('[AuthContext] Google sign in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Initiating sign out...');
    try {
      await authRepository.signOut();
      console.log('[AuthContext] Sign out completed');
    } catch (error) {
      console.error('[AuthContext] Sign out failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    session,
    user,
    error,
    loading,
    signIn: async () => {
      try {
        await authRepository.signInWithGoogle();
        await checkUser();
      } catch (error: any) {
        setError(error.message || 'Sign in failed');
      }
    },
    signInWithEmail,
    signInWithTestUser,
    signOut: async () => {
      try {
        await authRepository.signOut();
        setSession(null);
        setUser(null);
        setError(null);
      } catch (error: any) {
        setError(error.message || 'Sign out failed');
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
