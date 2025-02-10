export const APP_NAME = 'Spending Tracker';

export const SUPABASE = {
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

console.log('Supabase Config:', {
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + '...',
});

export const TRUELAYER = {
  CLIENT_ID: process.env.EXPO_PUBLIC_TRUELAYER_CLIENT_ID,
  CLIENT_SECRET: process.env.EXPO_PUBLIC_TRUELAYER_CLIENT_SECRET,
  REDIRECT_URI: process.env.EXPO_PUBLIC_TRUELAYER_REDIRECT_URI,
};
