import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';

if (!EXPO_PUBLIC_SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!EXPO_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY');

export const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
  },
});
