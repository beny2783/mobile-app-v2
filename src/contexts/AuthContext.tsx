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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign in flow...');
      await WebBrowser.warmUpAsync();

      const redirectUrl = Platform.select({
        ios: 'spendingtracker://auth/callback',
        android: 'spendingtracker://auth/callback',
        default: 'http://localhost:19006/auth/callback',
      });

      console.log('Using redirect URL:', redirectUrl);

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

      if (error) throw error;
      console.log('Sign in response:', data);

      if (Platform.OS !== 'web' && data?.url) {
        try {
          const authUrl = data.url;
          console.log('Opening auth URL:', authUrl);

          const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl, {
            showInRecents: true,
            preferEphemeralSession: true,
          });

          if (result.type === 'success') {
            // Parse the URL to get the access token
            const url = new URL(result.url);
            const params = new URLSearchParams(url.hash.substring(1));
            const access_token = params.get('access_token');

            if (access_token) {
              // Set the session with the token
              const {
                data: { session },
                error: sessionError,
              } = await supabase.auth.setSession({
                access_token,
                refresh_token: params.get('refresh_token') || '',
              });

              if (sessionError) throw sessionError;
              console.log('Session established:', !!session);
            }
          }

          await WebBrowser.coolDownAsync();
        } catch (error) {
          console.error('WebBrowser error:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
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
      value={{ session: null, user, loading, signIn, signOut, signInWithGoogle }}
    >
      {console.log('AuthProvider rendering', { loading, user })}
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
