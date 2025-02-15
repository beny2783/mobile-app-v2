import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
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

  // Debug logging
  useEffect(() => {
    console.log('AuthProvider state:', { loading, user });
  }, [loading, user]);

  useEffect(() => {
    // Use Supabase's onAuthStateChange instead of window listeners
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Initial session check
    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  // Development helper function
  const signInWithTestUser = async () => {
    await signIn('test@example.com', 'testpass123');
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign in flow...');

      // Make sure WebBrowser is ready
      try {
        await WebBrowser.warmUpAsync();
      } catch (error) {
        console.error('Failed to warm up WebBrowser:', error);
      }

      // Set up the redirect URL based on environment
      const redirectUrl = Platform.select({
        web: __DEV__
          ? 'http://127.0.0.1:54321/auth/v1/callback'
          : 'https://cquppesxfqkkrppakopn.supabase.co/auth/v1/callback',
        default: 'spendingtracker://auth/callback',
      });

      console.log('Using redirect URL:', redirectUrl);

      // Start the OAuth flow
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

      if (error) {
        console.error('OAuth initialization error:', error);
        throw error;
      }

      if (!data?.url) {
        console.error('No OAuth URL received');
        throw new Error('Failed to get authentication URL');
      }

      console.log('Received OAuth URL:', data.url);

      // Open the authentication URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
        showInRecents: true,
        preferEphemeralSession: true,
      });

      console.log('Auth session result:', result);

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

        console.log('Tokens extracted:', {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
        });

        if (access_token) {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || '',
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }

          console.log('Session established:', !!session);
          return;
        } else {
          console.error('No access token found in response');
          throw new Error('No access token received');
        }
      } else if (result.type === 'cancel') {
        console.log('Auth session cancelled by user');
        throw new Error('Authentication cancelled');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      try {
        await WebBrowser.coolDownAsync();
      } catch (error) {
        console.error('Failed to cool down WebBrowser:', error);
      }
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session: null,
        user,
        loading,
        signIn,
        signOut,
        signInWithGoogle,
        signInWithTestUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
