import { createClient } from '@supabase/supabase-js';
import { SUPABASE } from '../constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Create a web-compatible storage adapter
const webStorageAdapter = {
  getItem: (key: string) => {
    return Promise.resolve(localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value);
    return Promise.resolve(undefined);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    return Promise.resolve(undefined);
  },
};

// Use SecureStore for native platforms, localStorage for web
const storageAdapter =
  Platform.OS === 'web'
    ? webStorageAdapter
    : {
        getItem: (key: string) => {
          return SecureStore.getItemAsync(key);
        },
        setItem: (key: string, value: string) => {
          return SecureStore.setItemAsync(key, value);
        },
        removeItem: (key: string) => {
          return SecureStore.deleteItemAsync(key);
        },
      };

export const supabase = createClient(SUPABASE.URL || '', SUPABASE.ANON_KEY || '', {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
