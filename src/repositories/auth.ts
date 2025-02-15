import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../services/supabase';

export interface AuthError extends Error {
  status?: number;
  code?: string;
}

export interface AuthRepository {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

class SupabaseAuthRepository implements AuthRepository {
  async getSession(): Promise<Session | null> {
    console.log('[AuthRepository] Getting session...');
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw this.handleError(error);
      console.log('[AuthRepository] Session retrieved:', session ? 'Valid session' : 'No session');
      return session;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    console.log('[AuthRepository] Attempting sign in for email:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw this.handleError(error);
      console.log('[AuthRepository] Sign in successful');
    } catch (error) {
      console.error('[AuthRepository] Sign in failed');
      throw this.handleError(error);
    }
  }

  async signInWithGoogle(): Promise<void> {
    console.log('[AuthRepository] Starting Google sign in flow...');
    try {
      await WebBrowser.warmUpAsync();
      console.log('[AuthRepository] WebBrowser warmed up');

      const redirectUrl = Platform.select({
        web: __DEV__
          ? 'http://127.0.0.1:54321/auth/v1/callback'
          : 'https://cquppesxfqkkrppakopn.supabase.co/auth/v1/callback',
        default: 'spendingtracker://auth/callback',
      });

      console.log('[AuthRepository] Using redirect URL:', redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw this.handleError(error);
      console.log('[AuthRepository] Google sign in flow completed successfully');
    } catch (error) {
      console.error('[AuthRepository] Google sign in failed');
      throw this.handleError(error);
    }
  }

  async signOut(): Promise<void> {
    console.log('[AuthRepository] Attempting sign out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw this.handleError(error);
      console.log('[AuthRepository] Sign out successful');
    } catch (error) {
      console.error('[AuthRepository] Sign out failed');
      throw this.handleError(error);
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    console.log('[AuthRepository] Setting up auth state change listener');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(
        '[AuthRepository] Auth state changed:',
        session ? 'User authenticated' : 'User signed out'
      );
      callback(session?.user ?? null);
    });
    return () => {
      console.log('[AuthRepository] Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }

  private handleError(error: any): AuthError {
    console.error('[AuthRepository] Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    const authError = new Error(error.message || 'Authentication error') as AuthError;
    authError.status = error.status;
    authError.code = error.code;
    return authError;
  }
}

// Export a singleton instance
export const authRepository = new SupabaseAuthRepository();
