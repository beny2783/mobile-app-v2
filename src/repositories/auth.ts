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
  getUser(): Promise<User | null>;
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

  async getUser(): Promise<User | null> {
    console.log('[AuthRepository] Getting current user...');
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw this.handleError(error);
      console.log('[AuthRepository] User retrieved:', user ? 'User found' : 'No user');
      return user;
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

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw this.handleError(error);

      if (!data?.url) {
        console.error('[AuthRepository] No OAuth URL received');
        throw new Error('Failed to get authentication URL');
      }

      console.log('[AuthRepository] Opening auth session with URL:', data.url);

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
        showInRecents: true,
        preferEphemeralSession: true,
      });

      console.log('[AuthRepository] Auth session result:', result.type);

      if (result.type === 'success' && result.url) {
        // Parse the URL and extract tokens
        const url = new URL(result.url);
        let params: URLSearchParams;

        // Check both hash and search parameters
        if (url.hash) {
          params = new URLSearchParams(url.hash.substring(1));
        } else {
          params = url.searchParams;
        }

        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        console.log('[AuthRepository] Tokens extracted:', {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
        });

        if (access_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || '',
          });

          if (sessionError) {
            console.error('[AuthRepository] Session error:', sessionError);
            throw this.handleError(sessionError);
          }

          console.log('[AuthRepository] Google sign in flow completed successfully');
        } else {
          console.error('[AuthRepository] No access token found in response');
          throw new Error('No access token received');
        }
      } else if (result.type === 'cancel') {
        console.log('[AuthRepository] Auth session cancelled by user');
        throw new Error('Authentication cancelled');
      }
    } catch (error) {
      console.error('[AuthRepository] Google sign in failed:', error);
      throw this.handleError(error);
    } finally {
      try {
        await WebBrowser.coolDownAsync();
      } catch (error) {
        console.error('[AuthRepository] Failed to cool down WebBrowser:', error);
      }
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
    console.error('[AuthRepository] Error details:', error);
    const authError = new Error(error.message || 'Authentication failed') as AuthError;
    authError.status = error.status;
    authError.code = error.code;

    // If the error is due to an invalid token, sign out the user
    if (error.code === 'user_not_found' && error.message.includes('JWT')) {
      console.log('[AuthRepository] Invalid token detected, signing out...');
      this.signOut().catch((err) => {
        console.error('[AuthRepository] Error during auto sign-out:', err);
      });
    }

    return authError;
  }
}

// Export a singleton instance
export const authRepository = new SupabaseAuthRepository();
