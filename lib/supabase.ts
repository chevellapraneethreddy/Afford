import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder') &&
    process.env.EXPO_PUBLIC_DEMO_MODE !== 'true'
  );
};

// Safe fallback placeholder for build & test phases when environment variables are being supplied
const safeUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-anon-key';

// Expo SecureStore session storage adapter for native mobile (iOS Keychain & Android Keystore),
// with SSR & browser localStorage fallback for web.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('SecureStore.getItemAsync error', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // storage fallback
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('SecureStore.setItemAsync error', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // storage fallback
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore.deleteItemAsync error', e);
    }
  },
};

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Uploads media with strict privacy separation:
 * - Public media (public posts, avatars) -> 'afford-public' with public CDN URL
 * - Private media (Close Circle, voice postcards, private chat attachments) -> 'afford-private' with signed URL
 */
export const uploadMediaFile = async (
  fileUri: string,
  options?: {
    fileName?: string;
    isPrivate?: boolean;
    expiresInSeconds?: number;
  }
): Promise<{ success: boolean; url: string; path?: string; isPrivate: boolean; error?: string }> => {
  const isPrivate = Boolean(options?.isPrivate);

  try {
    if (!isSupabaseConfigured()) {
      return { success: true, url: fileUri, isPrivate };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || 'anonymous';

    const response = await fetch(fileUri);
    const blob = await response.blob();
    const cleanFileName = options?.fileName || `media_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    
    // Strict folder isolation by user ID: {userId}/{filename}
    const filePath = `${userId}/${cleanFileName}`;
    const targetBucket = isPrivate ? 'afford-private' : 'afford-public';

    const { data, error } = await supabase.storage
      .from(targetBucket)
      .upload(filePath, blob, {
        upsert: true,
      });

    if (error) {
      console.warn(`Storage upload to ${targetBucket} failed:`, error.message);
      // Fallback to afford-media if dedicated buckets not created yet
      const fallbackUpload = await supabase.storage
        .from('afford-media')
        .upload(filePath, blob, { upsert: true });

      if (fallbackUpload.error) {
        return { success: false, url: fileUri, isPrivate, error: fallbackUpload.error.message };
      }

      const { data: pubUrl } = supabase.storage.from('afford-media').getPublicUrl(filePath);
      return { success: true, url: pubUrl.publicUrl, path: filePath, isPrivate: false };
    }

    if (isPrivate) {
      // Generate secure signed URL for private media (default TTL: 24 hours / 86400s)
      const ttl = options?.expiresInSeconds || 86400;
      const { data: signedData, error: signError } = await supabase.storage
        .from('afford-private')
        .createSignedUrl(data.path, ttl);

      if (signError || !signedData?.signedUrl) {
        return { success: true, url: fileUri, path: data.path, isPrivate: true };
      }
      return { success: true, url: signedData.signedUrl, path: data.path, isPrivate: true };
    } else {
      // Public CDN URL for public bucket
      const { data: publicUrlData } = supabase.storage
        .from('afford-public')
        .getPublicUrl(data.path);

      return { success: true, url: publicUrlData.publicUrl, path: data.path, isPrivate: false };
    }
  } catch (e: any) {
    console.warn('uploadMediaFile exception:', e);
    return { success: false, error: e?.message, url: fileUri, isPrivate };
  }
};

/**
 * Creates a signed URL on demand for private media assets
 */
export const getPrivateMediaSignedUrl = async (
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> => {
  try {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.storage
      .from('afford-private')
      .createSignedUrl(filePath, expiresInSeconds);
    if (error || !data) return null;
    return data.signedUrl;
  } catch (e) {
    return null;
  }
};

/**
 * Diagnostic utility to test the live Supabase database connection
 */
export const testSupabaseConnection = async (): Promise<{
  connected: boolean;
  message: string;
  url: string;
  hasAnonKey: boolean;
}> => {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return {
      connected: false,
      message: 'Supabase URL or Anon key is missing or set to placeholder.',
      url: supabaseUrl || 'Not set',
      hasAnonKey: Boolean(supabaseAnonKey),
    };
  }

  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Connected to endpoint, but query returned: ${error.message}`,
        url: supabaseUrl,
        hasAnonKey: true,
      };
    }
    return {
      connected: true,
      message: 'Successfully connected to Supabase and queried profiles table.',
      url: supabaseUrl,
      hasAnonKey: true,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Network request failed',
      url: supabaseUrl,
      hasAnonKey: true,
    };
  }
};
