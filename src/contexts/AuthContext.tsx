import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { authRepository } from '../repositories/auth';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithTestUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

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
    const unsubscribe = authRepository.onAuthStateChange((newUser) => {
      console.log('[AuthContext] Auth state changed, updating user:', newUser?.id ?? 'No user');
      setUser(newUser);
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
      console.log(
        '[AuthContext] Session check complete:',
        session ? 'Session found' : 'No session'
      );
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('[AuthContext] Error checking session:', error);
    } finally {
      console.log('[AuthContext] Finished initial session check');
      setLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] Attempting sign in...');
    try {
      await authRepository.signIn(email, password);
      console.log('[AuthContext] Sign in successful');
    } catch (error) {
      console.error('[AuthContext] Sign in failed:', error);
      throw error;
    }
  };

  // Development helper function
  const signInWithTestUser = async () => {
    console.log('[AuthContext] Attempting test user sign in...');
    await signIn('test@example.com', 'testpass123');
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

  const value = {
    session,
    user,
    loading,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithTestUser,
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
