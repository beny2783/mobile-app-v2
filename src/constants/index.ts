import { Platform } from 'react-native';

export const APP_NAME = 'Spending Tracker';

export const SUPABASE = {
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
} as const;

console.log('Supabase Config:', {
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + '...',
});

export const TRUELAYER = {
  CLIENT_ID: process.env.EXPO_PUBLIC_TRUELAYER_CLIENT_ID || '',
  CLIENT_SECRET: process.env.EXPO_PUBLIC_TRUELAYER_CLIENT_SECRET || '',
  REDIRECT_URI: Platform.select({
    ios: 'spendingtracker://auth/callback',
    android: 'spendingtracker://auth/callback',
    default: 'http://localhost:19006/auth/callback',
  }),
} as const;

// Theme colors
export const colors = {
  primary: '#007AFF',
  background: '#FFFFFF',
  text: '#000000',
  error: '#FF3B30',
  success: '#34C759',
  gray: '#8E8E93',
} as const;

export const OPENAI = {
  API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
} as const;

// Add debug logging
if (__DEV__) {
  console.log('Constants loaded:', {
    APP_NAME,
    SUPABASE: {
      URL: SUPABASE.URL,
      ANON_KEY: SUPABASE.ANON_KEY?.slice(0, 10) + '...',
    },
    TRUELAYER: {
      CLIENT_ID: TRUELAYER.CLIENT_ID ? 'provided' : 'missing',
      REDIRECT_URI: TRUELAYER.REDIRECT_URI,
    },
    OPENAI: {
      hasApiKey: !!OPENAI.API_KEY,
      keyPrefix: OPENAI.API_KEY ? OPENAI.API_KEY.substring(0, 7) + '...' : 'missing',
    },
  });
}

if (__DEV__) {
  console.log('🔧 Environment validation:', {
    SUPABASE: {
      hasUrl: !!SUPABASE.URL,
      hasAnonKey: !!SUPABASE.ANON_KEY,
      urlPrefix: SUPABASE.URL?.substring(0, 20) + '...',
    },
    TRUELAYER: {
      hasClientId: !!TRUELAYER.CLIENT_ID,
      hasClientSecret: !!TRUELAYER.CLIENT_SECRET,
      redirectUri: TRUELAYER.REDIRECT_URI,
      platform: Platform.OS,
    },
    OPENAI: {
      hasApiKey: !!OPENAI.API_KEY,
      keyPrefix: OPENAI.API_KEY ? OPENAI.API_KEY.substring(0, 7) + '...' : 'missing',
    },
    ENV: {
      isDev: __DEV__,
      platform: Platform.OS,
      version: Platform.Version,
    },
  });
}
