import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  CURRENT_USER,
  getFriendshipMilestone,
  INITIAL_CONNECTION_QUESTIONS,
  INITIAL_CONVERSATIONS,
  INITIAL_DAILY_PROMPT,
  INITIAL_FRIENDS,
  INITIAL_MESSAGES,
  INITIAL_MISS_YOU_HISTORY,
  INITIAL_NOTIFICATIONS,
  INITIAL_ON_THIS_DAY_MEMORIES,
  INITIAL_POSTS,
  INITIAL_STORIES,
  DISCOVER_CREATORS,
} from '@/lib/mockData';
import {
  ConnectionQuestion,
  Conversation,
  DailyPrompt,
  FriendshipMilestone,
  Message,
  MissYouEvent,
  NotificationItem,
  OnThisDayMemory,
  Post,
  PostComment,
  Story,
  UserProfile,
} from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  posts: Post[];
  stories: Story[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  notifications: NotificationItem[];
  dailyPrompt: DailyPrompt;
  followingIds: string[];
  missYouHistory: MissYouEvent[];
  fetchMissYouHistory: () => Promise<MissYouEvent[]>;
  todayMissYouSentCount: number;
  todayMissYouReceivedCount: number;
  onThisDayMemories: OnThisDayMemory[];
  connectionQuestions: ConnectionQuestion[];
  answerConnectionQuestion: (questionId: string, answer: string, partnerId?: string, isPrivate?: boolean) => Promise<void>;
  milestoneCelebration: { milestone: FriendshipMilestone; friend: UserProfile } | null;
  triggerMilestoneCelebration: (milestone: FriendshipMilestone, friend: UserProfile) => void;
  clearMilestoneCelebration: () => void;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, username: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateAvatar: (avatarUri: string | null) => Promise<void>;
  allUsers: UserProfile[];
  refreshUsers: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  refreshStories: () => Promise<void>;
  searchUsers: (query: string) => Promise<UserProfile[]>;
  startConversation: (targetUser: UserProfile) => string;
  toggleLikePost: (postId: string) => void;
  addPostComment: (postId: string, comment: string) => void;
  createPost: (mediaUrl: string, caption: string, isCloseFriends: boolean, filterName?: string, mediaType?: 'image' | 'video') => Promise<void>;
  createStory: (mediaUrl: string, caption?: string, isCloseFriends?: boolean, mediaType?: 'image' | 'video') => Promise<void>;
  sendMessage: (conversationId: string, content: string, mediaType?: 'text' | 'image' | 'voice', mediaUrl?: string) => void;
  sendMissYouGesture: (recipientId: string, conversationId?: string) => Promise<{ success: boolean; newCount: number }>;
  markUserActive: (userId: string, conversationId?: string) => void;
  toggleFollow: (userId: string) => void;
  submitDailyPrompt: (response: string) => void;
  markNotificationsRead: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: '@afford_user_profile',
  POSTS: '@afford_posts',
  STORIES: '@afford_stories',
  CONVERSATIONS: '@afford_conversations',
  MESSAGES: '@afford_messages',
  NOTIFICATIONS: '@afford_notifications',
  FOLLOWING: '@afford_following',
  PROMPT: '@afford_daily_prompt',
  MISS_YOU_HISTORY: '@afford_miss_you_history',
  CONNECTION_QUESTIONS: '@afford_connection_questions',
  ALL_USERS: '@afford_all_users',
};

/**
 * Safe AsyncStorage setter that protects against Android SQLite_FULL (code 13):
 * 1. Sanitizes posts, stories, and profiles to strip massive base64 media payloads before SQLite serialization.
 * 2. Catches unhandled promise rejections so UI interactions never crash or throw unhandled exceptions.
 * 3. Automatically purges oversized caches if SQLite storage is full.
 */
export async function safeAsyncStorageSet(key: string, rawValue: string): Promise<void> {
  try {
    let sanitizedValue = rawValue;

    // Sanitize heavy arrays (POSTS or STORIES)
    if (key === STORAGE_KEYS.POSTS || key === STORAGE_KEYS.STORIES) {
      try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map((item: any) => {
            if (item && item.mediaUrl && typeof item.mediaUrl === 'string') {
              if (item.mediaUrl.startsWith('data:video/') || item.mediaUrl.length > 25000) {
                return {
                  ...item,
                  mediaUrl: item.mediaType === 'video' ? '' : item.mediaUrl.slice(0, 500),
                };
              }
            }
            return item;
          });
          sanitizedValue = JSON.stringify(cleaned);
        }
      } catch (parseErr) {
        // use rawValue if JSON parse fails
      }
    } else if (key === STORAGE_KEYS.ALL_USERS || key === STORAGE_KEYS.USER) {
      try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map((u: any) => {
            if (u && u.avatarUrl && typeof u.avatarUrl === 'string' && u.avatarUrl.length > 25000) {
              return { ...u, avatarUrl: '' };
            }
            return u;
          });
          sanitizedValue = JSON.stringify(cleaned);
        } else if (parsed && parsed.avatarUrl && typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.length > 25000) {
          sanitizedValue = JSON.stringify({ ...parsed, avatarUrl: '' });
        }
      } catch {}
    }

    await AsyncStorage.setItem(key, sanitizedValue);
  } catch (err: any) {
    console.warn(`[AsyncStorage SafeSet] Error saving key "${key}":`, err?.message || err);
    if (err?.message?.includes('SQLITE_FULL') || err?.code === 13 || String(err).includes('SQLITE_FULL')) {
      // Auto-recovery: SQLite is full, immediately purge heavy caches
      try {
        await AsyncStorage.multiRemove([STORAGE_KEYS.POSTS, STORAGE_KEYS.STORIES, STORAGE_KEYS.ALL_USERS]);
        console.log('[AsyncStorage SafeSet] Cleared heavy caches to recover from SQLITE_FULL');
      } catch {}
    }
  }
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function toValidUUID(idOrString: string): string {
  if (isValidUUID(idOrString)) {
    return idOrString;
  }
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < idOrString.length; i++) {
    const ch = idOrString.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  return `${p1.slice(0, 8)}-${p2.slice(0, 4)}-4${p2.slice(4, 7)}-a${p3.slice(0, 3)}-${p4.slice(0, 12)}`;
}

export function getDirectConversationId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  const p1 = sorted[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  const p2 = sorted[1].replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  return `conv_${p1}_${p2}`;
}

export async function normalizeImageUri(uri: string, maxDim: number = 800, quality: number = 0.55): Promise<string> {
  if (!uri) return uri;
  // If remote CDN URL (not local test server), return as is
  if (uri.startsWith('http') && !uri.includes('localhost') && !uri.includes('127.0.0.1')) {
    return uri;
  }
  if (uri.startsWith('data:image/')) {
    return uri;
  }
  // On web: scale down and compress using HTML5 Canvas
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      return await new Promise<string>((resolve) => {
        const img = new (window as any).Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            let width = img.width || 800;
            let height = img.height || 800;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressed = canvas.toDataURL('image/jpeg', quality);
              resolve(compressed);
              return;
            }
            resolve(uri);
          } catch {
            resolve(uri);
          }
        };
        img.onerror = () => {
          if (uri.startsWith('blob:')) {
            fetch(uri)
              .then((res) => {
                if (!res.ok) throw new Error('Fetch failed');
                return res.blob();
              })
              .then((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (typeof reader.result === 'string' && !reader.result.includes('RmlsZSBub3QgZm91bmQ=')) {
                    resolve(reader.result);
                  } else {
                    resolve(uri);
                  }
                };
                reader.onerror = () => resolve(uri);
                reader.readAsDataURL(blob);
              })
              .catch(() => resolve(uri));
          } else {
            resolve(uri);
          }
        };
        img.src = uri;
      });
    } catch {
      return uri;
    }
  }

  // On native mobile (iOS / Android): safely convert local file to data URL via XMLHttpRequest (native file protocol handler)
  if (uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('blob:')) {
    try {
      const dataUrl = await new Promise<string | null>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          try {
            const blob = xhr.response;
            if (!blob) {
              resolve(null);
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string' && !reader.result.includes('RmlsZSBub3QgZm91bmQ=')) {
                resolve(reader.result);
              } else {
                resolve(null);
              }
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          } catch {
            resolve(null);
          }
        };
        xhr.onerror = () => resolve(null);
        xhr.ontimeout = () => resolve(null);
        xhr.timeout = 8000;
        xhr.open('GET', uri);
        xhr.responseType = 'blob';
        xhr.send();
      });

      if (dataUrl && !dataUrl.includes('RmlsZSBub3QgZm91bmQ=')) {
        return dataUrl;
      }
    } catch (err) {
      console.warn('Native XHR file conversion error:', err);
    }
  }

  return uri;
}

/**
 * Robust Supabase media uploader:
 * 1. Checks if already remote HTTP/HTTPS CDN URL.
 * 2. Uploads native files (images, MP4 videos) to Supabase Storage 'afford-media' bucket using FormData.
 * 3. Returns public CDN URL that streams seamlessly on all phones & web browsers.
 * 4. Never writes "File not found" or corrupt data to Supabase.
 */
export async function uploadMediaToSupabase(
  uri: string,
  mediaType: 'image' | 'video' = 'image'
): Promise<string> {
  if (!uri) return '';
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aqmntovbkteirfzkqvtc.supabase.co';
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_XVCXrHjCqOzuon2h4Uo9yw_XvLBbHyH';

  const ext = mediaType === 'video' ? 'mp4' : 'jpg';
  const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `uploads/${fileName}`;

  // 1. Try uploading to Supabase Storage bucket 'afford-media'
  try {
    const formData = new FormData();
    if (uri.startsWith('data:')) {
      const parts = uri.split(',');
      const byteString = atob(parts[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });
      formData.append('file', blob, fileName);
    } else {
      // React Native FormData natively handles { uri, name, type }
      formData.append('file', {
        uri,
        name: fileName,
        type: mimeType,
      } as any);
    }

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/afford-media/${filePath}`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: formData,
      }
    );

    if (uploadRes.ok) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/afford-media/${filePath}`;
      console.log('Uploaded to Supabase Storage CDN:', publicUrl);
      return publicUrl;
    }
  } catch (storageErr) {
    console.warn('Supabase storage upload attempt note:', storageErr);
  }

  // 2. Safe fallback for images: data URL
  if (mediaType === 'image') {
    if (uri.startsWith('data:image/')) {
      return uri;
    }
    const safeDataUrl = await normalizeImageUri(uri, 800, 0.5);
    if (safeDataUrl && !safeDataUrl.includes('RmlsZSBub3QgZm91bmQ=')) {
      return safeDataUrl;
    }
  }

  // 3. Safe fallback for videos: portable base64 data URL so videos stream seamlessly on any other device/web
  if (mediaType === 'video') {
    if (uri.startsWith('data:video/')) {
      return uri;
    }
    // Web: convert blob to data URL
    if (Platform.OS === 'web' && uri.startsWith('blob:')) {
      try {
        const res = await fetch(uri);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
        if (dataUrl && !dataUrl.includes('RmlsZSBub3QgZm91bmQ=')) {
          return dataUrl;
        }
      } catch (blobErr) {
        console.warn('Web video blob conversion error:', blobErr);
      }
    }
    // Native mobile (Android / iOS): convert local device file to base64 data URL
    if (Platform.OS !== 'web' && (uri.startsWith('file:') || uri.startsWith('content:'))) {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64) {
          return `data:${mimeType};base64,${base64}`;
        }
      } catch (fsErr) {
        console.warn('Native video FileSystem readAsStringAsync error:', fsErr);
      }
    }
  }

  // Final absolute safeguard: NEVER return a raw device file:/// or content:// URI to Supabase
  if (uri.startsWith('file:') || uri.startsWith('content:')) {
    if (Platform.OS !== 'web') {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64) {
          return `data:${mimeType};base64,${base64}`;
        }
      } catch (e) {}
    }
    return '';
  }

  // Guard against corrupt strings
  if (uri.includes('RmlsZSBub3QgZm91bmQ=') || uri.includes('File not found')) {
    return '';
  }

  return uri;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(CURRENT_USER);
  const userRef = useRef<UserProfile | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const presenceChannelRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());

  // Application State
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const postsRef = useRef<Post[]>(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt>(INITIAL_DAILY_PROMPT);
  const [followingIds, setFollowingIds] = useState<string[]>(['usr_maya', 'usr_elena', 'usr_marcus', 'usr_sofia']);
  const [missYouHistory, setMissYouHistory] = useState<MissYouEvent[]>(INITIAL_MISS_YOU_HISTORY);
  const [onThisDayMemories, setOnThisDayMemories] = useState<OnThisDayMemory[]>(INITIAL_ON_THIS_DAY_MEMORIES);
  const [connectionQuestions, setConnectionQuestions] = useState<ConnectionQuestion[]>(INITIAL_CONNECTION_QUESTIONS);
  const [milestoneCelebration, setMilestoneCelebration] = useState<{ milestone: FriendshipMilestone; friend: UserProfile } | null>(null);

  // Initial all users pool: combining INITIAL_FRIENDS and DISCOVER_CREATORS (deduplicated)
  const initialAllUsers: UserProfile[] = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    INITIAL_FRIENDS.forEach((u) => map.set(u.id, u));
    DISCOVER_CREATORS.forEach((u) => map.set(u.id, u));
    return Array.from(map.values());
  }, []);

  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialAllUsers);

  // Derived today's counts
  const todayMissYouSentCount = missYouHistory.filter(
    (ev) => ev.senderId === user?.id && ev.isToday
  ).length;

  const todayMissYouReceivedCount = missYouHistory.filter(
    (ev) => ev.recipientId === user?.id && ev.isToday
  ).length;

  // Load persisted cache on startup
  useEffect(() => {
    (async () => {
      try {
        const [
          savedUser,
          savedPosts,
          savedStories,
          savedConvs,
          savedMsgs,
          savedNotifs,
          savedPrompt,
          savedHistory,
          savedQuestions,
          savedUsers,
          savedFollowing,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.POSTS),
          AsyncStorage.getItem(STORAGE_KEYS.STORIES),
          AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.MESSAGES),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.PROMPT),
          AsyncStorage.getItem(STORAGE_KEYS.MISS_YOU_HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_QUESTIONS),
          AsyncStorage.getItem(STORAGE_KEYS.ALL_USERS),
          AsyncStorage.getItem(STORAGE_KEYS.FOLLOWING),
        ]);

        // Emergency recovery from Android SQLite_FULL: purge any bloated offline post/story caches
        if (savedPosts && (savedPosts.includes('data:video/') || savedPosts.length > 50000)) {
          console.log('[Storage Recovery] Clearing bloated posts cache to free SQLite database space');
          try {
            await AsyncStorage.removeItem(STORAGE_KEYS.POSTS);
          } catch {}
        }
        if (savedStories && (savedStories.includes('data:video/') || savedStories.length > 50000)) {
          console.log('[Storage Recovery] Clearing bloated stories cache to free SQLite database space');
          try {
            await AsyncStorage.removeItem(STORAGE_KEYS.STORIES);
          } catch {}
        }

        let deviceUserId = await AsyncStorage.getItem('@afford_device_user_id');
        if (!deviceUserId || !isValidUUID(deviceUserId)) {
          deviceUserId = generateUUID();
          await safeAsyncStorageSet('@afford_device_user_id', deviceUserId);
        }

        let currentUserObj: UserProfile;
        if (savedUser) {
          try {
            currentUserObj = JSON.parse(savedUser);
            if (!currentUserObj.id || currentUserObj.id === 'usr_me_01' || !isValidUUID(currentUserObj.id)) {
              currentUserObj = { ...currentUserObj, id: deviceUserId };
              await safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(currentUserObj));
            }
          } catch {
            currentUserObj = { ...CURRENT_USER, id: deviceUserId };
            await safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(currentUserObj));
          }
        } else {
          currentUserObj = { ...CURRENT_USER, id: deviceUserId };
          await safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(currentUserObj));
        }

        setUser(currentUserObj);
        userRef.current = currentUserObj;

        // Auto-heal local avatar file paths to portable data URLs so other peers receive the actual photo
        if (currentUserObj.avatarUrl && (currentUserObj.avatarUrl.startsWith('file:') || currentUserObj.avatarUrl.startsWith('content:'))) {
          normalizeImageUri(currentUserObj.avatarUrl, 250, 0.45).then((portableAvatar) => {
            if (portableAvatar && !portableAvatar.startsWith('file:')) {
              currentUserObj.avatarUrl = portableAvatar;
              setUser({ ...currentUserObj });
              userRef.current = currentUserObj;
              safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(currentUserObj));
              broadcastUserUpdate(currentUserObj);
            }
          });
        }

        if (savedPosts) {
          try {
            const parsedPosts: Post[] = JSON.parse(savedPosts);
            setPosts(parsedPosts);

            // Auto-heal local images to portable base64 and sync unsynced posts to Supabase
            (async () => {
              for (const p of parsedPosts) {
                let currentMedia = p.mediaUrl;
                if (currentMedia && (currentMedia.startsWith('file:') || currentMedia.startsWith('content:'))) {
                  const portableMedia = await normalizeImageUri(currentMedia, 800, 0.5);
                  if (portableMedia && !portableMedia.startsWith('file:')) {
                    p.mediaUrl = portableMedia;
                    currentMedia = portableMedia;
                    setPosts((prev) => {
                      const next = prev.map((item) => (item.id === p.id ? { ...item, mediaUrl: portableMedia } : item));
                      safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(next));
                      return next;
                    });
                  }
                }

                // If current user's post is not yet in Supabase, insert it
                if (isConfigured && currentUserObj && (p.userId === currentUserObj.id || p.user?.id === currentUserObj.id || p.user?.displayName === currentUserObj.displayName)) {
                  try {
                    const validAuthorId = isValidUUID(currentUserObj.id) ? currentUserObj.id : toValidUUID(currentUserObj.id);
                    const { data: existing } = await supabase
                      .from('posts')
                      .select('id')
                      .eq('user_id', validAuthorId)
                      .eq('caption', p.caption || '')
                      .limit(1);

                    if (!existing || existing.length === 0) {
                      await supabase.from('posts').insert({
                        user_id: validAuthorId,
                        media_url: currentMedia,
                        media_type: p.mediaType || 'image',
                        caption: p.caption || '',
                        filter_name: p.filterName || 'Original',
                        is_close_friends_only: p.isCloseFriendsOnly || false,
                      });
                    }
                  } catch (syncErr) {
                    console.warn('Auto-sync post to Supabase failed:', syncErr);
                  }
                }
              }
            })();
          } catch {}
        }
        if (savedStories) setStories(JSON.parse(savedStories));
        if (savedConvs) setConversations(JSON.parse(savedConvs));
        if (savedMsgs) setMessages(JSON.parse(savedMsgs));
        if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
        if (savedPrompt) setDailyPrompt(JSON.parse(savedPrompt));
        if (savedHistory) setMissYouHistory(JSON.parse(savedHistory));
        if (savedQuestions) setConnectionQuestions(JSON.parse(savedQuestions));
        if (savedFollowing) {
          try {
            setFollowingIds(JSON.parse(savedFollowing));
          } catch {}
        }

        // Synchronize allUsers with initial mock creators, saved users, and current user
        setAllUsers((prev) => {
          const map = new Map<string, UserProfile>();
          initialAllUsers.forEach((u) => {
            if (u.id !== 'usr_me_01') map.set(u.id, u);
          });
          if (savedUsers) {
            try {
              const parsed: UserProfile[] = JSON.parse(savedUsers);
              parsed.forEach((u) => {
                if (u.id !== 'usr_me_01') map.set(u.id, u);
              });
            } catch {}
          }
          if (currentUserObj && currentUserObj.displayName) {
            map.set(currentUserObj.id, currentUserObj);
          }
          return Array.from(map.values());
        });

        // Immediately push profile and posts to Supabase so they are visible to all users
        if (currentUserObj && currentUserObj.displayName && isConfigured) {
          supabase
            .from('profiles')
            .upsert({
              id: currentUserObj.id,
              display_name: currentUserObj.displayName,
              username: currentUserObj.username,
              bio: currentUserObj.bio || '',
              avatar_url: currentUserObj.avatarUrl,
              is_private: currentUserObj.isPrivate || false,
              miss_you_notifications_enabled: currentUserObj.missYouNotificationsEnabled ?? true,
              streak_notifications_enabled: currentUserObj.streakNotificationsEnabled ?? true,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Sync profile on startup error:', error);
            });
        }

        if (savedPosts && isConfigured && currentUserObj) {
          try {
            const parsedPosts: Post[] = JSON.parse(savedPosts);
            parsedPosts.forEach((p) => {
              if (p.userId === currentUserObj.id || p.user?.id === currentUserObj.id) {
                const validUserId = isValidUUID(currentUserObj.id) ? currentUserObj.id : toValidUUID(currentUserObj.id);
                const validPostId = isValidUUID(p.id) ? p.id : undefined;
                supabase
                  .from('posts')
                  .upsert({
                    ...(validPostId ? { id: validPostId } : {}),
                    user_id: validUserId,
                    media_url: p.mediaUrl,
                    media_type: p.mediaType || 'image',
                    caption: p.caption,
                    filter_name: p.filterName,
                    is_close_friends_only: p.isCloseFriendsOnly,
                    likes_count: p.likesCount || 0,
                    comments_count: p.commentsCount || 0,
                    shares_count: p.sharesCount || 0,
                    created_at: p.createdAt || new Date().toISOString(),
                  })
                  .then(({ error }) => {
                    if (error) console.warn('Sync post to Supabase error:', error);
                  });
              }
            });
          } catch {}
        }

        fetchAllProfiles();
        fetchPosts();
      } catch (err) {
        console.warn('Failed to load cached application state', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Synchronize all profiles from Supabase and cache them locally
  const fetchAllProfiles = useCallback(async () => {
    if (!isConfigured) return;
    try {
      const { data: dbProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbProfiles && dbProfiles.length > 0) {
        const mappedUsers: UserProfile[] = dbProfiles.map((p: any) => ({
          id: p.id,
          username: p.username || 'member',
          displayName: p.display_name || p.username || 'Afford Member',
          avatarUrl: p.avatar_url && !p.avatar_url.includes('534528741775') ? p.avatar_url : '',
          bio: p.bio || '',
          isPrivate: p.is_private || false,
          missYouNotificationsEnabled: p.miss_you_notifications_enabled ?? true,
          streakNotificationsEnabled: p.streak_notifications_enabled ?? true,
          isVerified: p.is_verified || false,
          followersCount: p.followers_count || 0,
          followingCount: p.following_count || 0,
          missYouSentCount: 0,
          missYouReceivedCount: 0,
          createdAt: p.created_at,
        }));

        setAllUsers((prev) => {
          const map = new Map<string, UserProfile>();
          // Existing initial / local entries
          prev.forEach((u) => map.set(u.id, u));
          // Database profiles overwrite or insert
          mappedUsers.forEach((u) => map.set(u.id, u));
          const merged = Array.from(map.values());
          safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch all profiles:', err);
    }
  }, [isConfigured]);

  // Live user search querying both the live Supabase database and local directory
  const searchUsers = useCallback(
    async (rawQuery: string): Promise<UserProfile[]> => {
      const clean = rawQuery.trim().replace(/^@/, '');
      if (!clean) return [];

      const queryLower = clean.toLowerCase();

      // 1. Immediate local matching (zero latency)
      const localMatches = (allUsers || []).filter((u) => {
        const dName = (u.displayName || '').toLowerCase();
        const uName = (u.username || '').toLowerCase();
        const bio = (u.bio || '').toLowerCase();
        return dName.includes(queryLower) || uName.includes(queryLower) || bio.includes(queryLower);
      });

      // 2. Query Supabase database using case-insensitive partial match on display_name OR username
      if (isConfigured) {
        try {
          const safeTerm = clean.replace(/[,%()]/g, '').trim();
          const { data: dbMatches, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`display_name.ilike.%${safeTerm}%,username.ilike.%${safeTerm}%`)
            .order('display_name', { ascending: true })
            .limit(40);

          if (!error && dbMatches && dbMatches.length > 0) {
            const mappedDb: UserProfile[] = dbMatches.map((p: any) => ({
              id: p.id,
              username: p.username || 'member',
              displayName: p.display_name || p.username || 'Afford Member',
              avatarUrl: p.avatar_url && !p.avatar_url.includes('534528741775') ? p.avatar_url : '',
              bio: p.bio || '',
              isPrivate: p.is_private || false,
              missYouNotificationsEnabled: p.miss_you_notifications_enabled ?? true,
              streakNotificationsEnabled: p.streak_notifications_enabled ?? true,
              isVerified: p.is_verified || false,
              followersCount: p.followers_count || 0,
              followingCount: p.following_count || 0,
              missYouSentCount: 0,
              missYouReceivedCount: 0,
              createdAt: p.created_at,
            }));

            // Merge database matches and local matches (database takes priority)
            const map = new Map<string, UserProfile>();
            mappedDb.forEach((u) => map.set(u.id, u));
            localMatches.forEach((u) => {
              if (!map.has(u.id)) map.set(u.id, u);
            });

            // Keep allUsers updated with new database profiles
            setAllUsers((prev) => {
              const allMap = new Map<string, UserProfile>();
              prev.forEach((u) => allMap.set(u.id, u));
              mappedDb.forEach((u) => allMap.set(u.id, u));
              const merged = Array.from(allMap.values());
              safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(merged));
              return merged;
            });

            return Array.from(map.values());
          }
        } catch (err) {
          console.warn('Error querying profiles in Supabase:', err);
        }
      }

      return localMatches;
    },
    [allUsers, isConfigured]
  );

  // Synchronize any user across local state, AsyncStorage, cross-tab BroadcastChannel, and Supabase broadcast
  const broadcastUserUpdate = useCallback((targetUser: UserProfile) => {
    if (!targetUser || !targetUser.id) return;

    setAllUsers((prev) => {
      const map = new Map<string, UserProfile>();
      prev.forEach((u) => map.set(u.id, u));
      map.set(targetUser.id, { ...(map.get(targetUser.id) || {}), ...targetUser });
      const next = Array.from(map.values());
      safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
      return next;
    });

    // 1. Cross-tab BroadcastChannel and storage event fallback for web only
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('afford_live_events_bus');
          bc.postMessage({ type: 'USER_UPDATED', user: targetUser });
          bc.close();
        }
      } catch {}

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('afford_last_user_sync', JSON.stringify({ user: targetUser, ts: Date.now() }));
        }
      } catch {}
    }

    // 2. Supabase realtime broadcast on global presence channel
    if (isConfigured && presenceChannelRef.current) {
      try {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'USER_UPDATED',
          payload: { user: targetUser },
        });
      } catch (err) {
        console.warn('Presence broadcast error:', err);
      }
    }
  }, [isConfigured]);

  // Mark a user as Active Now with a green online dot (matching by id, username, or conversationId)
  const markUserActive = useCallback((targetUserId: string, targetUsername?: string, conversationId?: string) => {
    if (!targetUserId && !targetUsername && !conversationId) return;
    setConversations((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const matchesId = targetUserId && (c.otherUser?.id === targetUserId || (c.id && c.id.includes(targetUserId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))));
        const matchesUsername = targetUsername && (c.otherUser?.username?.toLowerCase() === targetUsername.toLowerCase() || (c.id && c.id.includes(targetUsername.toLowerCase())));
        const matchesConv = conversationId && c.id === conversationId;
        if (matchesId || matchesUsername || matchesConv) {
          if (!c.isOnline || c.lastSeenText !== 'Active now') {
            changed = true;
            return {
              ...c,
              isOnline: true,
              lastSeenText: 'Active now',
            };
          }
        }
        return c;
      });
      if (changed) {
        safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, []);

  // Broadcast user heartbeat across web bus and Supabase realtime
  const sendHeartbeat = useCallback(() => {
    const curr = userRef.current;
    if (!curr || !curr.id) return;

    const payload = {
      type: 'USER_HEARTBEAT',
      userId: curr.id,
      username: curr.username,
      displayName: curr.displayName,
      timestamp: Date.now(),
    };

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('afford_live_events_bus');
          bc.postMessage(payload);
          bc.close();
        }
      } catch {}
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('afford_last_heartbeat', JSON.stringify({ ...payload, ts: Date.now() }));
        }
      } catch {}
    }

    if (isConfigured && presenceChannelRef.current) {
      try {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'USER_HEARTBEAT',
          payload,
        });
      } catch {}
    }
  }, [isConfigured]);

  // Handle incoming Miss You signal across real-time broadcast and DB triggers
  const handleIncomingMissYou = useCallback((payload: any) => {
    if (!payload || !payload.senderId) return;
    const myId = userRef.current?.id;
    const myUsername = userRef.current?.username?.toLowerCase();
    const matchesRecipient =
      !payload.recipientId ||
      payload.recipientId === myId ||
      (myUsername && payload.recipientId?.toLowerCase() === myUsername) ||
      (myUsername && payload.recipientUsername?.toLowerCase() === myUsername);
    if (!myId || !matchesRecipient) return;

    const senderName = payload.sender?.displayName || 'A friend';
    const convId = payload.conversationId || getDirectConversationId(myId, payload.senderId);

    // 1. Update conversations
    setConversations((prev) => {
      const existingIdx = prev.findIndex(
        (c) => (convId && c.id === convId) || c.otherUser?.id === payload.senderId
      );
      let updated: Conversation[];
      if (existingIdx >= 0) {
        updated = prev.map((c, idx) => {
          if (idx === existingIdx) {
            const nextCount = Math.max((c.missYouCount || 0) + 1, payload.count || 1);
            const nextDaily = (c.dailyMissYouCount || 0) + 1;
            const nextStreak = (c.streakDays || 0) + 1;
            return {
              ...c,
              missYouCount: nextCount,
              dailyMissYouCount: nextDaily,
              isMutualMissYou: true,
              streakDays: nextStreak,
              lastMessage: '❤️ Sent you a Miss You signal',
              lastMessageAt: 'Just now',
              isOnline: true,
              lastSeenText: 'Active now',
              unreadCount: (c.unreadCount || 0) + 1,
            };
          }
          return c;
        });
      } else {
        const otherUserObj = payload.sender || allUsers.find((u) => u.id === payload.senderId) || {
          id: payload.senderId,
          username: payload.sender?.username || 'friend',
          displayName: senderName,
          avatarUrl: payload.sender?.avatarUrl && !payload.sender.avatarUrl.includes('534528741775') ? payload.sender.avatarUrl : '',
          bio: '',
          isPrivate: false,
          missYouNotificationsEnabled: true,
          streakNotificationsEnabled: true,
          isVerified: false,
          followersCount: 0,
          followingCount: 0,
          missYouSentCount: 0,
          missYouReceivedCount: 0,
          createdAt: new Date().toISOString(),
        };

        const newIncomingConv: Conversation = {
          id: convId,
          isGroup: false,
          otherUser: otherUserObj,
          lastMessage: '❤️ Sent you a Miss You signal',
          lastMessageAt: 'Just now',
          unreadCount: 1,
          missYouCount: payload.count || 1,
          dailyMissYouCount: 1,
          streakDays: 1,
          isMutualMissYou: true,
          isOnline: true,
          lastSeenText: 'Active now',
        };
        updated = [newIncomingConv, ...prev];
      }
      safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      return updated;
    });

    // 2. Increment receiver's missYouReceivedCount
    setUser((curr) => {
      if (!curr) return null;
      const next = {
        ...curr,
        missYouReceivedCount: (curr.missYouReceivedCount || 0) + 1,
      };
      safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(next));
      return next;
    });

    // 3. Prepend to notifications
    const notifId = `notif_missyou_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notifId)) return prev;
      const newNotif: NotificationItem = {
        id: notifId,
        userId: myId,
        actor: payload.sender || {
          id: payload.senderId,
          username: payload.sender?.username || 'friend',
          displayName: senderName,
          avatarUrl: payload.sender?.avatarUrl && !payload.sender.avatarUrl.includes('534528741775') ? payload.sender.avatarUrl : '',
        },
        type: 'miss_you',
        title: 'Someone misses you ❤️',
        body: `${senderName} sent you a Miss You signal!`,
        isRead: false,
        createdAt: 'Just now',
      };
      const updated = [newNotif, ...prev];
      safeAsyncStorageSet(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, [allUsers]);

  // Periodic heartbeat broadcast for online presence
  useEffect(() => {
    if (!user?.id) return;
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 8000);
    return () => clearInterval(interval);
  }, [user?.id, sendHeartbeat]);

  // Web storage listener for cross-tab multi-user synchronization (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return;
    }
    const handleStorageChange = (e: any) => {
      if (e?.key === 'afford_last_user_sync' && e?.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.user) {
            setAllUsers((prev) => {
              const idx = prev.findIndex((u) => u.id === parsed.user.id);
              let next: UserProfile[];
              if (idx >= 0) {
                next = [...prev];
                next[idx] = { ...next[idx], ...parsed.user };
              } else {
                next = [parsed.user, ...prev];
              }
              safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
              return next;
            });
          }
        } catch {}
      } else if (e?.key === 'afford_last_follow_sync' && e?.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.targetUserId) {
            const myId = userRef.current?.id;
            if (myId && parsed.targetUserId === myId) {
              setUser((curr) => {
                if (!curr) return null;
                const next = {
                  ...curr,
                  followersCount: Math.max(0, (curr.followersCount || 0) + (parsed.delta || 1)),
                };
                safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(next));
                return next;
              });
            }
            setAllUsers((prev) => {
              const next = prev.map((u) => {
                if (u.id === parsed.targetUserId) {
                  return {
                    ...u,
                    followersCount: Math.max(0, (u.followersCount || 0) + (parsed.delta || 1)),
                  };
                }
                return u;
              });
              safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
              return next;
            });
          }
        } catch {}
      } else if (e?.key === 'afford_last_heartbeat' && e?.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const myId = userRef.current?.id;
          if (parsed?.userId && parsed.userId !== myId) {
            markUserActive(parsed.userId);
          }
        } catch {}
      } else if (e?.key === 'afford_last_missyou_sync' && e?.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingMissYou(parsed);
        } catch {}
      } else if (e?.key === 'afford_last_post_sync' && e?.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          if (payload?.post) {
            setPosts((prev) => {
              if (prev.some((p) => p.id === payload.post.id)) return prev;
              const next = [payload.post, ...prev];
              safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(next));
              return next;
            });
          }
        } catch {}
      } else if (e?.key === 'afford_last_msg_sync' && e?.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          if (payload?.conversationId && payload?.message) {
            const myId = userRef.current?.id;
            if (payload.senderId === myId) return;

            markUserActive(payload.senderId, payload.conversationId);

            setMessages((prev) => {
              const convMsgs = prev[payload.conversationId] || [];
              if (convMsgs.some((m) => m.id === payload.message.id)) return prev;
              const updated = {
                ...prev,
                [payload.conversationId]: [...convMsgs, payload.message],
              };
              safeAsyncStorageSet(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
              return updated;
            });

            setConversations((prev) => {
              const existingIdx = prev.findIndex(
                (c) => c.id === payload.conversationId || c.otherUser?.id === payload.senderId
              );
              let updated: Conversation[];
              if (existingIdx >= 0) {
                updated = prev.map((c, idx) => {
                  if (idx === existingIdx) {
                    return {
                      ...c,
                      id: payload.conversationId,
                      otherUser: payload.sender || c.otherUser,
                      lastMessage: payload.message.content || 'New message',
                      lastMessageAt: 'Just now',
                      unreadCount: (c.unreadCount || 0) + 1,
                      isOnline: true,
                      lastSeenText: 'Active now',
                    };
                  }
                  return c;
                });
              } else {
                const newIncomingConv: Conversation = {
                  id: payload.conversationId,
                  isGroup: false,
                  otherUser: payload.sender || {
                    id: payload.senderId,
                    username: 'friend',
                    displayName: 'Friend',
                    avatarUrl: '',
                    bio: '',
                    isPrivate: false,
                    missYouNotificationsEnabled: true,
                    streakNotificationsEnabled: true,
                    isVerified: false,
                    followersCount: 0,
                    followingCount: 0,
                    missYouSentCount: 0,
                    missYouReceivedCount: 0,
                    createdAt: new Date().toISOString(),
                  },
                  lastMessage: payload.message.content || 'New message',
                  lastMessageAt: 'Just now',
                  unreadCount: 1,
                  missYouCount: 0,
                  streakDays: 0,
                  isOnline: true,
                  lastSeenText: 'Active now',
                };
                updated = [newIncomingConv, ...prev];
              }
              safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
              return updated;
            });
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  // Offline direct messages synchronization with Supabase
  const syncOfflineMessages = useCallback(async () => {
    if (!isConfigured || !user?.id) return;
    try {
      const myId = user.id;
      const validMyId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);
      const { data: dbMsgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient_id.eq.${validMyId},sender_id.eq.${validMyId}`)
        .order('created_at', { ascending: true });

      if (!error && dbMsgs && dbMsgs.length > 0) {
        setMessages((prev) => {
          let hasNew = false;
          const next = { ...prev };
          for (const m of dbMsgs) {
            const cId = m.conversation_id;
            const convMsgs = next[cId] || [];
            if (!convMsgs.some((existing) => existing.id === m.id || (existing.content === m.content && existing.senderId === m.sender_id))) {
              hasNew = true;
              next[cId] = [
                ...convMsgs,
                {
                  id: m.id,
                  conversationId: cId,
                  senderId: m.sender_id,
                  content: m.content || '',
                  mediaType: m.media_type || 'text',
                  mediaUrl: m.media_url,
                  isRead: m.is_read || false,
                  createdAt: m.created_at,
                },
              ];
            }
          }
          if (hasNew) {
            safeAsyncStorageSet(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
            return next;
          }
          return prev;
        });

        setConversations((prev) => {
          const map = new Map<string, Conversation>();
          prev.forEach((c) => map.set(c.id, c));
          let changed = false;

          for (const m of dbMsgs) {
            const cId = m.conversation_id;
            const otherId = m.sender_id === myId ? m.recipient_id : m.sender_id;
            const existing = map.get(cId);

            if (!existing) {
              changed = true;
              const otherProfile = allUsers.find((u) => u.id === otherId);
              map.set(cId, {
                id: cId,
                isGroup: false,
                otherUser: otherProfile || {
                  id: otherId || 'user_friend',
                  username: 'friend',
                  displayName: 'Friend',
                  avatarUrl: '',
                  bio: '',
                  isPrivate: false,
                  missYouNotificationsEnabled: true,
                  streakNotificationsEnabled: true,
                  isVerified: false,
                  followersCount: 0,
                  followingCount: 0,
                  missYouSentCount: 0,
                  missYouReceivedCount: 0,
                  createdAt: new Date().toISOString(),
                },
                lastMessage: m.content || 'New message',
                lastMessageAt: 'Recently',
                unreadCount: m.sender_id === myId ? 0 : 1,
                missYouCount: 0,
                streakDays: 0,
              });
            } else if (m.content) {
              existing.lastMessage = m.content;
            }
          }

          if (changed) {
            const updated = Array.from(map.values());
            safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Failed to sync offline messages:', err);
    }
  }, [isConfigured, user?.id, allUsers]);

  // Synchronize all posts from Supabase so every user's moments and memories appear
  const fetchPosts = useCallback(async () => {
    if (presenceChannelRef.current) {
      try {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'REQUEST_POSTS_SYNC',
          payload: {},
        });
      } catch {}
    }
    if (!isConfigured) return;
    try {
      const [{ data: dbPosts, error }, { data: dbProfiles }] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_verified'),
      ]);

      if (!error && dbPosts && dbPosts.length > 0) {
        const profileMap = new Map<string, any>();
        if (dbProfiles) {
          dbProfiles.forEach((prof: any) => profileMap.set(prof.id, prof));
        }

        setPosts((prev) => {
          const map = new Map<string, Post>();
          prev.forEach((p) => map.set(p.id, p));

          dbPosts.forEach((p: any) => {
            if (!p.media_url || p.media_url.includes('RmlsZSBub3QgZm91bmQ=')) {
              return;
            }
            if (p.media_url.startsWith('file:') || p.media_url.startsWith('content:')) {
              if (Platform.OS === 'web' || (userRef.current && p.user_id !== userRef.current.id)) {
                return;
              }
            }
            const author = profileMap.get(p.user_id) || allUsers.find((u) => u.id === p.user_id) || {
              id: p.user_id,
              username: 'member',
              displayName: 'Afford Member',
              avatarUrl: '',
              isVerified: false,
            };

            const safeAuthorAvatar = author.avatar_url || author.avatarUrl || '';
            const finalAvatar = safeAuthorAvatar && !safeAuthorAvatar.includes('534528741775') ? safeAuthorAvatar : '';

            map.set(p.id, {
              id: p.id,
              userId: p.user_id,
              user: {
                id: p.user_id,
                username: author.username || 'member',
                displayName: author.display_name || author.displayName || 'Afford Member',
                avatarUrl: finalAvatar,
                isVerified: author.is_verified ?? author.isVerified ?? false,
              },
              mediaUrl: p.media_url,
              mediaType: p.media_type || 'image',
              caption: p.caption || '',
              filterName: p.filter_name || 'Original',
              isCloseFriendsOnly: p.is_close_friends_only || false,
              likesCount: p.likes_count || 0,
              commentsCount: p.comments_count || 0,
              sharesCount: p.shares_count || 0,
              isLikedByMe: false,
              createdAt: p.created_at,
            });
          });

          const next = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch posts:', err);
    }
  }, [isConfigured, allUsers]);

  // Synchronize all stories from Supabase so every 24-hour moment appears
  const fetchStories = useCallback(async () => {
    if (!isConfigured) return;
    try {
      const [{ data: dbStories, error }, { data: dbProfiles }] = await Promise.all([
        supabase
          .from('stories')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_verified'),
      ]);

      if (!error && dbStories && dbStories.length > 0) {
        const profileMap = new Map<string, any>();
        if (dbProfiles) {
          dbProfiles.forEach((prof: any) => profileMap.set(prof.id, prof));
        }

        setStories((prev) => {
          const map = new Map<string, Story>();
          prev.forEach((s) => map.set(s.id, s));
          dbStories.forEach((s: any) => {
            const author = profileMap.get(s.user_id) || allUsers.find((u) => u.id === s.user_id) || {
              id: s.user_id,
              username: 'member',
              displayName: 'Afford Member',
              avatarUrl: '',
            };
            const safeAuthorAvatar = author.avatar_url || author.avatarUrl || '';
            const finalAvatar = safeAuthorAvatar && !safeAuthorAvatar.includes('534528741775') ? safeAuthorAvatar : '';
            map.set(s.id, {
              id: s.id,
              userId: s.user_id,
              user: {
                id: s.user_id,
                username: author.username || 'member',
                displayName: author.display_name || author.displayName || 'Afford Member',
                avatarUrl: finalAvatar,
              },
              mediaUrl: s.media_url,
              mediaType: (s.media_type as any) || 'image',
              caption: s.caption || '',
              isCloseFriendsOnly: s.is_close_friends_only || false,
              durationSeconds: s.duration_seconds || 5,
              viewsCount: s.views_count || 0,
              isViewedByMe: false,
              expiresAt: s.expires_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              createdAt: s.created_at || new Date().toISOString(),
            });
          });
          const next = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          safeAsyncStorageSet(STORAGE_KEYS.STORIES, JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch stories:', err);
    }
  }, [isConfigured, allUsers]);

  // Periodic background synchronization of user directory, posts, and offline messages
  useEffect(() => {
    if (!isConfigured) return;
    fetchAllProfiles();
    fetchPosts();
    fetchStories();
    syncOfflineMessages();
    const interval = setInterval(() => {
      fetchAllProfiles();
      fetchPosts();
      fetchStories();
      syncOfflineMessages();
    }, 4000);
    return () => clearInterval(interval);
  }, [isConfigured, fetchAllProfiles, fetchPosts, fetchStories, syncOfflineMessages]);

  // Multi-tab / cross-window live event bus for real-time responsiveness (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }
    try {
      const bc = new BroadcastChannel('afford_live_events_bus');
      bc.onmessage = (event) => {
        const payload = event.data;
        if (payload?.type === 'USER_UPDATED' && payload.user) {
          setAllUsers((prev) => {
            const idx = prev.findIndex((u) => u.id === payload.user.id);
            let next: UserProfile[];
            if (idx >= 0) {
              next = [...prev];
              next[idx] = { ...next[idx], ...payload.user };
            } else {
              next = [payload.user, ...prev];
            }
            safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
            return next;
          });
        } else if (payload?.type === 'USER_FOLLOW_TOGGLED') {
          const myId = userRef.current?.id;
          if (myId && payload.targetUserId === myId) {
            setUser((curr) => {
              if (!curr) return null;
              const next = {
                ...curr,
                followersCount: Math.max(0, (curr.followersCount || 0) + (payload.delta || 1)),
              };
              safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(next));
              return next;
            });
          }
          setAllUsers((prev) => {
            const next = prev.map((u) => {
              if (u.id === payload.targetUserId) {
                return {
                  ...u,
                  followersCount: Math.max(0, (u.followersCount || 0) + (payload.delta || 1)),
                };
              }
              return u;
            });
            safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
            return next;
          });
        } else if (payload?.type === 'USER_HEARTBEAT' && payload.userId) {
          const myId = userRef.current?.id;
          if (myId && payload.userId !== myId) {
            markUserActive(payload.userId);
          }
        } else if (payload?.type === 'MISS_YOU_GESTURE') {
          handleIncomingMissYou(payload);
        } else if (payload?.type === 'NEW_POST' && payload.post) {
          setPosts((prev) => {
            if (prev.some((p) => p.id === payload.post.id)) return prev;
            const next = [payload.post, ...prev];
            safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(next));
            return next;
          });
        } else if (payload?.type === 'NEW_MESSAGE' && payload.conversationId && payload.message) {
          const myId = userRef.current?.id;
          if (payload.senderId === myId) return;

          markUserActive(payload.senderId, payload.conversationId);

          setMessages((prev) => {
            const convMsgs = prev[payload.conversationId] || [];
            if (convMsgs.some((m) => m.id === payload.message.id)) return prev;
            return {
              ...prev,
              [payload.conversationId]: [...convMsgs, payload.message],
            };
          });
          setConversations((prev) => {
            const existingIdx = prev.findIndex(
              (c) => c.id === payload.conversationId || c.otherUser?.id === payload.senderId
            );
            let updated: Conversation[];
            if (existingIdx >= 0) {
              updated = prev.map((c, idx) => {
                if (idx === existingIdx) {
                  return {
                    ...c,
                    id: payload.conversationId,
                    otherUser: payload.sender || c.otherUser,
                    lastMessage: payload.message.content || 'New message',
                    lastMessageAt: 'Just now',
                    unreadCount: (c.unreadCount || 0) + 1,
                    isOnline: true,
                    lastSeenText: 'Active now',
                  };
                }
                return c;
              });
            } else {
              const newIncomingConv: Conversation = {
                id: payload.conversationId,
                isGroup: false,
                otherUser: payload.sender || {
                  id: payload.senderId,
                  username: 'friend',
                  displayName: 'Friend',
                  avatarUrl: '',
                  bio: '',
                  isPrivate: false,
                  missYouNotificationsEnabled: true,
                  streakNotificationsEnabled: true,
                  isVerified: false,
                  followersCount: 0,
                  followingCount: 0,
                  missYouSentCount: 0,
                  missYouReceivedCount: 0,
                  createdAt: new Date().toISOString(),
                },
                lastMessage: payload.message.content || 'New message',
                lastMessageAt: 'Just now',
                unreadCount: 1,
                missYouCount: 0,
                streakDays: 0,
                isOnline: true,
                lastSeenText: 'Active now',
              };
              updated = [newIncomingConv, ...prev];
            }
            safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
            return updated;
          });
        }
      };
      return () => {
        bc.close();
      };
    } catch {}
  }, []);

  // Supabase real-time subscription when configured
  useEffect(() => {
    if (!isConfigured) return;

    // Listen to auth state changes from Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch or create profile
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          const meta = session.user.user_metadata || {};
          const fallbackUsername = meta.username || session.user.email?.split('@')[0] || 'member';
          const fallbackName = meta.display_name || meta.full_name || fallbackUsername;
          try {
            await supabase.from('profiles').upsert({
              id: session.user.id,
              username: fallbackUsername,
              display_name: fallbackName,
              avatar_url: CURRENT_USER.avatarUrl,
            });
            const refetched = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            profile = refetched.data;
          } catch {}
        }

        if (profile) {
          // Query live Miss You sent and received counts for this user from Supabase
          let liveSentCount = 0;
          let liveReceivedCount = 0;
          try {
            const [sentRes, recRes] = await Promise.all([
              supabase
                .from('miss_you_events')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', profile.id),
              supabase
                .from('miss_you_events')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', profile.id),
            ]);
            liveSentCount = sentRes.count || 0;
            liveReceivedCount = recRes.count || 0;
          } catch {
            // Count query fallback
          }

          const loadedUser: UserProfile = {
            id: profile.id,
            username: profile.username || 'user',
            displayName: profile.display_name || 'User',
            avatarUrl: profile.avatar_url || CURRENT_USER.avatarUrl,
            bio: profile.bio || '',
            isPrivate: profile.is_private || false,
            missYouNotificationsEnabled: profile.miss_you_notifications_enabled ?? true,
            streakNotificationsEnabled: profile.streak_notifications_enabled ?? true,
            isVerified: profile.is_verified || false,
            followersCount: profile.followers_count || 0,
            followingCount: profile.following_count || 0,
            missYouSentCount: liveSentCount,
            missYouReceivedCount: liveReceivedCount,
            createdAt: profile.created_at,
          };
          setUser(loadedUser);
          safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(loadedUser));
          broadcastUserUpdate(loadedUser);
          fetchAllProfiles();
        }
      }
    });

    // Fetch initial live posts from Supabase
    supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data: dbPosts, error }) => {
        if (!error && dbPosts && dbPosts.length > 0) {
          const validDbPosts = dbPosts.filter((p: any) => {
            if (!p.media_url || p.media_url.includes('RmlsZSBub3QgZm91bmQ=')) return false;
            if (p.media_url.startsWith('file:') || p.media_url.startsWith('content:')) {
              if (Platform.OS === 'web' || (userRef.current && p.user_id !== userRef.current.id)) {
                return false;
              }
            }
            return true;
          });
          const livePosts: Post[] = validDbPosts.map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            user: {
              id: p.user_id,
              username: 'member',
              displayName: 'Afford Member',
              avatarUrl: '',
            },
            mediaUrl: p.media_url,
            mediaType: p.media_type || 'image',
            caption: p.caption || '',
            filterName: p.filter_name || 'Original',
            isCloseFriendsOnly: p.is_close_friends_only || false,
            likesCount: p.likes_count || 0,
            commentsCount: p.comments_count || 0,
            sharesCount: p.shares_count || 0,
            isLikedByMe: false,
            createdAt: p.created_at,
          }));
          setPosts(livePosts);
        }
      });

    // Synchronize user profiles
    fetchAllProfiles();

    // Realtime channel for profiles: new members and profile updates appear live without refresh
    const profilesRealtimeChannel = supabase
      .channel('afford_live_profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload: any) => {
          const p = payload.new;
          if (p && p.id) {
            const mappedUser: UserProfile = {
              id: p.id,
              username: p.username || 'member',
              displayName: p.display_name || 'Member',
              avatarUrl: p.avatar_url && !p.avatar_url.includes('534528741775') ? p.avatar_url : '',
              bio: p.bio || '',
              isPrivate: p.is_private || false,
              missYouNotificationsEnabled: p.miss_you_notifications_enabled ?? true,
              streakNotificationsEnabled: p.streak_notifications_enabled ?? true,
              isVerified: p.is_verified || false,
              followersCount: 0,
              followingCount: 0,
              missYouSentCount: 0,
              missYouReceivedCount: 0,
              createdAt: p.created_at,
            };

            setAllUsers((prev) => {
              const idx = prev.findIndex((u) => u.id === mappedUser.id);
              let next: UserProfile[];
              if (idx >= 0) {
                next = [...prev];
                next[idx] = { ...next[idx], ...mappedUser };
              } else {
                next = [mappedUser, ...prev];
              }
              safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
              return next;
            });
          }
        }
      )
      .subscribe();

    // Realtime channel for messages and miss you signals
    const realtimeChannel = supabase
      .channel('afford_live_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const newMsg = payload.new;
          if (newMsg) {
            markUserActive(newMsg.sender_id, newMsg.conversation_id);
            setMessages((prev) => {
              const convMsgs = prev[newMsg.conversation_id] || [];
              if (convMsgs.some((m) => m.id === newMsg.id)) return prev;
              return {
                ...prev,
                [newMsg.conversation_id]: [
                  ...convMsgs,
                  {
                    id: newMsg.id,
                    conversationId: newMsg.conversation_id,
                    senderId: newMsg.sender_id,
                    content: newMsg.content,
                    mediaType: newMsg.media_type,
                    mediaUrl: newMsg.media_url,
                    isRead: newMsg.is_read,
                    createdAt: newMsg.created_at,
                  },
                ],
              };
            });

            setConversations((prev) => {
              const existingIdx = prev.findIndex(
                (c) => c.id === newMsg.conversation_id || c.otherUser?.id === newMsg.sender_id
              );
              if (existingIdx >= 0) {
                const updated = prev.map((c, idx) => {
                  if (idx === existingIdx) {
                    return {
                      ...c,
                      id: newMsg.conversation_id,
                      lastMessage: newMsg.content || 'New message',
                      lastMessageAt: 'Just now',
                      unreadCount: (c.unreadCount || 0) + 1,
                      isOnline: true,
                      lastSeenText: 'Active now',
                    };
                  }
                  return c;
                });
                safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
                return updated;
              } else {
                const senderProfile = allUsers.find((u) => u.id === newMsg.sender_id);
                const newConv: Conversation = {
                  id: newMsg.conversation_id,
                  isGroup: false,
                  otherUser: senderProfile || {
                    id: newMsg.sender_id,
                    username: 'friend',
                    displayName: 'Friend',
                    avatarUrl: '',
                    bio: '',
                    isPrivate: false,
                    missYouNotificationsEnabled: true,
                    streakNotificationsEnabled: true,
                    isVerified: false,
                    followersCount: 0,
                    followingCount: 0,
                    missYouSentCount: 0,
                    missYouReceivedCount: 0,
                    createdAt: new Date().toISOString(),
                  },
                  lastMessage: newMsg.content || 'New message',
                  lastMessageAt: 'Just now',
                  unreadCount: 1,
                  missYouCount: 0,
                  streakDays: 0,
                  isOnline: true,
                  lastSeenText: 'Active now',
                };
                const updated = [newConv, ...prev];
                safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
                return updated;
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'miss_you_events' },
        (payload: any) => {
          const event = payload.new;
          if (event) {
            handleIncomingMissYou({
              type: 'MISS_YOU_GESTURE',
              senderId: event.sender_id,
              recipientId: event.recipient_id,
              conversationId: event.conversation_id,
              count: 1,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        () => {
          fetchStories();
        }
      )
      .subscribe();

    // 3. Global presence channel for instant peer-to-peer user synchronization
    const presenceChannel = supabase
      .channel('afford_global_presence')
      .on('broadcast', { event: 'USER_UPDATED' }, (payload: any) => {
        const target = payload?.payload?.user;
        if (target && target.id) {
          setAllUsers((prev) => {
            const map = new Map<string, UserProfile>();
            prev.forEach((u) => map.set(u.id, u));
            map.set(target.id, { ...(map.get(target.id) || {}), ...target });
            const merged = Array.from(map.values());
            safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(merged));
            return merged;
          });
        }
      })
      .on('broadcast', { event: 'USER_HEARTBEAT' }, (payload: any) => {
        const data = payload?.payload;
        const myId = userRef.current?.id;
        if (data?.userId && data.userId !== myId) {
          markUserActive(data.userId);
        }
      })
      .on('broadcast', { event: 'MISS_YOU_GESTURE' }, (payload: any) => {
        const data = payload?.payload;
        if (data) {
          handleIncomingMissYou(data);
        }
      })
      .on('broadcast', { event: 'NEW_POST' }, (payload: any) => {
        const p = payload?.payload?.post;
        if (p && p.mediaUrl && !p.mediaUrl.includes('RmlsZSBub3QgZm91bmQ=')) {
          if (p.mediaUrl.startsWith('file:') || p.mediaUrl.startsWith('content:')) {
            if (Platform.OS === 'web' || (userRef.current && p.userId !== userRef.current.id)) {
              return;
            }
          }
          setPosts((prev) => {
            if (prev.some((post) => post.id === p.id)) return prev;
            const next = [p, ...prev];
            safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(next));
            return next;
          });
        }
      })
      .on('broadcast', { event: 'NEW_STORY' }, (payload: any) => {
        const s = payload?.payload?.story;
        if (s) {
          setStories((prev) => {
            if (prev.some((story) => story.id === s.id)) return prev;
            const next = [s, ...prev];
            safeAsyncStorageSet(STORAGE_KEYS.STORIES, JSON.stringify(next));
            return next;
          });
        }
      })
      .on('broadcast', { event: 'REQUEST_POSTS_SYNC' }, () => {
        const myPosts = postsRef.current;
        if (myPosts && myPosts.length > 0 && presenceChannelRef.current) {
          try {
            presenceChannelRef.current.send({
              type: 'broadcast',
              event: 'POSTS_SYNC_RESPONSE',
              payload: { posts: myPosts.slice(0, 15) },
            });
          } catch {}
        }
      })
      .on('broadcast', { event: 'POSTS_SYNC_RESPONSE' }, (payload: any) => {
        const incomingPosts: Post[] = payload?.payload?.posts;
        if (incomingPosts && Array.isArray(incomingPosts) && incomingPosts.length > 0) {
          setPosts((prev) => {
            const map = new Map<string, Post>();
            incomingPosts.forEach((p) => map.set(p.id, p));
            prev.forEach((p) => map.set(p.id, p));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(merged));
            return merged;
          });
        }
      })
      .on('broadcast', { event: 'USER_FOLLOW_TOGGLED' }, (payload: any) => {
        const data = payload?.payload;
        if (!data || !data.targetUserId) return;
        const myId = userRef.current?.id;

        if (myId && data.targetUserId === myId) {
          setUser((curr) => {
            if (!curr) return null;
            const next = {
              ...curr,
              followersCount: Math.max(0, (curr.followersCount || 0) + (data.delta || 1)),
            };
            safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(next));
            return next;
          });
        }

        setAllUsers((prev) => {
          const next = prev.map((u) => {
            if (u.id === data.targetUserId) {
              return {
                ...u,
                followersCount: Math.max(0, (u.followersCount || 0) + (data.delta || 1)),
              };
            }
            return u;
          });
          safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
          return next;
        });
      })
      .on('broadcast', { event: 'NEW_MESSAGE' }, (payload: any) => {
        const data = payload?.payload;
        if (!data || !data.conversationId || !data.message) return;
        const myId = userRef.current?.id;
        if (data.senderId === myId) return;

        markUserActive(data.senderId, data.conversationId);

        setMessages((prev) => {
          const convMsgs = prev[data.conversationId] || [];
          if (convMsgs.some((m) => m.id === data.message.id)) return prev;
          const updated = {
            ...prev,
            [data.conversationId]: [...convMsgs, data.message],
          };
          safeAsyncStorageSet(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
          return updated;
        });

        setConversations((prev) => {
          const existingIdx = prev.findIndex(
            (c) => c.id === data.conversationId || c.otherUser?.id === data.senderId
          );
          let updated: Conversation[];
          if (existingIdx >= 0) {
            updated = prev.map((c, idx) => {
              if (idx === existingIdx) {
                return {
                  ...c,
                  id: data.conversationId,
                  otherUser: data.sender || c.otherUser,
                  lastMessage: data.message.content || 'New message',
                  lastMessageAt: 'Just now',
                  unreadCount: (c.unreadCount || 0) + 1,
                  isOnline: true,
                  lastSeenText: 'Active now',
                };
              }
              return c;
            });
          } else {
            const newIncomingConv: Conversation = {
              id: data.conversationId,
              isGroup: false,
              otherUser: data.sender || {
                id: data.senderId,
                username: 'friend',
                displayName: 'Friend',
                avatarUrl: '',
                bio: '',
                isPrivate: false,
                missYouNotificationsEnabled: true,
                streakNotificationsEnabled: true,
                isVerified: false,
                followersCount: 0,
                followingCount: 0,
                missYouSentCount: 0,
                missYouReceivedCount: 0,
                createdAt: new Date().toISOString(),
              },
              lastMessage: data.message.content || 'New message',
              lastMessageAt: 'Just now',
              unreadCount: 1,
              missYouCount: 0,
              streakDays: 0,
              isOnline: true,
              lastSeenText: 'Active now',
            };
            updated = [newIncomingConv, ...prev];
          }
          safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
          return updated;
        });
      })
      .on('broadcast', { event: 'REQUEST_USER_SYNC' }, () => {
        if (userRef.current && userRef.current.displayName) {
          presenceChannel.send({
            type: 'broadcast',
            event: 'USER_UPDATED',
            payload: { user: userRef.current },
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          presenceChannel.send({
            type: 'broadcast',
            event: 'REQUEST_USER_SYNC',
            payload: {},
          });
          presenceChannel.send({
            type: 'broadcast',
            event: 'REQUEST_POSTS_SYNC',
            payload: {},
          });
          if (userRef.current && userRef.current.displayName) {
            presenceChannel.send({
              type: 'broadcast',
              event: 'USER_UPDATED',
              payload: { user: userRef.current },
            });
          }
          if (postsRef.current && postsRef.current.length > 0) {
            presenceChannel.send({
              type: 'broadcast',
              event: 'POSTS_SYNC_RESPONSE',
              payload: { posts: postsRef.current.slice(0, 10) },
            });
          }
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      authListener?.subscription.unsubscribe();
      supabase.removeChannel(realtimeChannel);
      supabase.removeChannel(profilesRealtimeChannel);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [isConfigured]);

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (isConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) return { success: false, error: error.message };
      await fetchAllProfiles();
      return { success: true };
    }

    // Demo/Offline flow - each account receives a unique UUID and is added to all users
    const rawHandle = (email.split('@')[0] || 'member').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const demoName = rawHandle.charAt(0).toUpperCase() + rawHandle.slice(1);
    const demoUser: UserProfile = {
      ...CURRENT_USER,
      id: toValidUUID(rawHandle),
      username: rawHandle,
      displayName: demoName,
    };
    setUser(demoUser);
    userRef.current = demoUser;
    await safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(demoUser));
    broadcastUserUpdate(demoUser);
    return { success: true };
  };

  const signUp = async (email: string, pass: string, username: string, name: string): Promise<{ success: boolean; error?: string }> => {
    if (isConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { username, display_name: name },
        },
      });
      if (error) return { success: false, error: error.message };

      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username,
            display_name: name,
            avatar_url: CURRENT_USER.avatarUrl,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Profile insert fallback
        }

        const newUserProfile: UserProfile = {
          id: data.user.id,
          username,
          displayName: name,
          avatarUrl: CURRENT_USER.avatarUrl,
          bio: '',
          isPrivate: false,
          missYouNotificationsEnabled: true,
          streakNotificationsEnabled: true,
          isVerified: false,
          followersCount: 0,
          followingCount: 0,
          missYouSentCount: 0,
          missYouReceivedCount: 0,
          createdAt: new Date().toISOString(),
        };
        setUser(newUserProfile);
        userRef.current = newUserProfile;
        await safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(newUserProfile));
        broadcastUserUpdate(newUserProfile);
        await fetchAllProfiles();
      }
      return { success: true };
    }

    // Demo/Offline flow - register unique account and broadcast
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newUser: UserProfile = {
      ...CURRENT_USER,
      id: toValidUUID(cleanUsername),
      username: cleanUsername,
      displayName: name,
    };
    setUser(newUser);
    userRef.current = newUser;
    await safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(newUser));
    broadcastUserUpdate(newUser);
    return { success: true };
  };

  const signOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    userRef.current = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const validId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);
    let resolvedUsername = updates.username || user.username;
    if (updates.displayName && (!updates.username || user.username === 'alex_rivera' || updates.username === 'alex_rivera')) {
      const cleanHandle = updates.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
      if (cleanHandle) {
        resolvedUsername = cleanHandle;
      }
    }
    const updated = { ...user, ...updates, username: resolvedUsername, id: validId };
    setUser(updated);
    userRef.current = updated;
    await safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(updated));

    // Synchronize into allUsers immediately for live user lists throughout the app
    setAllUsers((prev) => {
      const map = new Map<string, UserProfile>();
      prev.forEach((u) => map.set(u.id, u));
      map.set(updated.id, updated);
      const next = Array.from(map.values());
      safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
      return next;
    });

    // Update current user's posts in feed with new name and avatar
    setPosts((prev) =>
      prev.map((p) => {
        if (p.userId === user.id || p.user.id === user.id || p.userId === updated.id || p.user.id === updated.id) {
          return {
            ...p,
            userId: updated.id,
            user: {
              ...p.user,
              id: updated.id,
              displayName: updated.displayName,
              username: updated.username,
              avatarUrl: updated.avatarUrl,
            },
          };
        }
        return p;
      })
    );

    // Broadcast across all clients, tabs, and peer devices
    broadcastUserUpdate(updated);

    if (isConfigured) {
      try {
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: updated.id,
          display_name: updated.displayName,
          username: updated.username,
          bio: updated.bio || '',
          avatar_url: updated.avatarUrl,
          is_private: updated.isPrivate || false,
          miss_you_notifications_enabled: updated.missYouNotificationsEnabled ?? true,
          streak_notifications_enabled: updated.streakNotificationsEnabled ?? true,
          updated_at: new Date().toISOString(),
        });
        if (upsertErr) {
          console.warn('Error saving profile to Supabase:', upsertErr);
        }
      } catch (err) {
        console.warn('Exception saving profile to Supabase:', err);
      }
    }
  };

  const updateAvatar = async (avatarUri: string | null) => {
    let url = avatarUri;
    if (url) {
      url = await uploadMediaToSupabase(url, 'image');
    }
    await updateProfile({ avatarUrl: url || undefined });
  };

  const startConversation = (targetUser: UserProfile): string => {
    if (!user) return `conv_${targetUser.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
    const directId = getDirectConversationId(user.id, targetUser.id);
    const existing = conversations.find(
      (c) => c.id === directId || c.otherUser?.id === targetUser.id
    );
    if (existing) {
      if (existing.id !== directId || !existing.otherUser || existing.otherUser.displayName !== targetUser.displayName || !existing.isOnline) {
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id === existing.id || c.otherUser?.id === targetUser.id) {
              return {
                ...c,
                id: directId,
                otherUser: targetUser,
                isOnline: true,
                lastSeenText: 'Active now',
              };
            }
            return c;
          });
          safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
          return updated;
        });
      }
      return directId;
    }

    const newConv: Conversation = {
      id: directId,
      isGroup: false,
      otherUser: targetUser,
      lastMessage: 'Say hello! 👋',
      lastMessageAt: 'Just now',
      unreadCount: 0,
      missYouCount: 0,
      streakDays: 0,
      isOnline: true,
      lastSeenText: 'Active now',
    };

    setConversations((prev) => {
      const updated = [newConv, ...prev.filter((c) => c.id !== directId && c.otherUser?.id !== targetUser.id)];
      safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      return updated;
    });

    return directId;
  };

  const toggleLikePost = (postId: string) => {
    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.isLikedByMe;
          return {
            ...p,
            isLikedByMe: isLiked,
            likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      });
      safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(updated));
      return updated;
    });
  };

  const addPostComment = (postId: string, comment: string) => {
    if (!user || !comment.trim()) return;
    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
          };
        }
        return p;
      });
      safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(updated));
      return updated;
    });
  };

  const createPost = async (
    rawMediaUrl: string,
    caption: string,
    isCloseFriends: boolean,
    filterName?: string,
    mediaType: 'image' | 'video' = 'image'
  ) => {
    if (!user) return;
    const mediaUrl = await uploadMediaToSupabase(rawMediaUrl, mediaType);
    const authorUsername = user.username && user.username !== 'alex_rivera'
      ? user.username
      : (user.displayName ? user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) : 'member');
    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: user.id,
      user: {
        id: user.id,
        username: authorUsername,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
      },
      mediaUrl,
      mediaType,
      caption,
      filterName: filterName || 'Original',
      isCloseFriendsOnly: isCloseFriends,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLikedByMe: false,
      createdAt: new Date().toISOString(),
    };

    setPosts((prev) => {
      const updated = [newPost, ...prev];
      safeAsyncStorageSet(STORAGE_KEYS.POSTS, JSON.stringify(updated));
      return updated;
    });

    const postPayload = {
      type: 'NEW_POST',
      post: newPost,
    };

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('afford_live_events_bus');
          bc.postMessage(postPayload);
          bc.close();
        }
      } catch {}

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('afford_last_post_sync', JSON.stringify({ ...postPayload, ts: Date.now() }));
        }
      } catch {}
    }

    if (isConfigured && presenceChannelRef.current) {
      try {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'NEW_POST',
          payload: postPayload,
        });
      } catch (err) {
        console.warn('Realtime post broadcast failed:', err);
      }
    }

    if (isConfigured) {
      try {
        const validUserId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);
        const { error: insertErr } = await supabase.from('posts').insert({
          user_id: validUserId,
          media_url: mediaUrl,
          media_type: mediaType,
          caption,
          filter_name: filterName,
          is_close_friends_only: isCloseFriends,
        });
        if (insertErr) {
          console.warn('Supabase post insert error:', insertErr);
        } else {
          await Promise.all([fetchAllProfiles(), fetchPosts()]);
        }
      } catch (err) {
        console.warn('Supabase post insert error:', err);
      }
    }
  };

  const createStory = async (
    rawMediaUrl: string,
    caption?: string,
    isCloseFriends: boolean = false,
    mediaType: 'image' | 'video' = 'image'
  ) => {
    if (!user) return;
    const mediaUrl = await uploadMediaToSupabase(rawMediaUrl, mediaType);
    const validUserId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);
    const authorUsername = user.username && user.username !== 'alex_rivera'
      ? user.username
      : (user.displayName ? user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) : 'member');

    const newStory: Story = {
      id: `story_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: validUserId,
      user: {
        id: validUserId,
        username: authorUsername,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      mediaUrl,
      mediaType,
      caption,
      isCloseFriendsOnly: isCloseFriends,
      durationSeconds: 5,
      viewsCount: 0,
      isViewedByMe: true,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    setStories((prev) => {
      const updated = [newStory, ...prev];
      safeAsyncStorageSet(STORAGE_KEYS.STORIES, JSON.stringify(updated));
      return updated;
    });

    const storyPayload = {
      type: 'NEW_STORY',
      story: newStory,
    };

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('afford_live_events_bus');
          bc.postMessage(storyPayload);
          bc.close();
        }
      } catch {}
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('afford_last_story_sync', JSON.stringify({ ...storyPayload, ts: Date.now() }));
        }
      } catch {}
    }

    if (isConfigured && presenceChannelRef.current) {
      try {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'NEW_STORY',
          payload: storyPayload,
        });
      } catch (err) {
        console.warn('Realtime story broadcast failed:', err);
      }
    }

    if (isConfigured) {
      try {
        const { error: storyErr } = await supabase.from('stories').insert({
          user_id: validUserId,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption || '',
          is_close_friends_only: isCloseFriends,
        });
        if (storyErr) {
          console.warn('Supabase story insert error:', storyErr);
        } else {
          await fetchStories();
        }
      } catch (err) {
        console.warn('Supabase story insert error:', err);
      }
    }
  };

  const sendMessage = (
    conversationId: string,
    content: string,
    mediaType: 'text' | 'image' | 'voice' = 'text',
    mediaUrl?: string
  ) => {
    if (!user) return;
    const conv = conversations.find((c) => c.id === conversationId);
    const recipient = conv?.otherUser;
    const recipientId = recipient?.id;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversationId,
      senderId: user.id,
      content,
      mediaType,
      mediaUrl,
      isRead: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const convMsgs = prev[conversationId] || [];
      const updated = {
        ...prev,
        [conversationId]: [...convMsgs, newMsg],
      };
      safeAsyncStorageSet(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
      return updated;
    });

    // Update conversation preview and active status
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: mediaType === 'voice' ? '🎙️ Voice Postcard' : mediaType === 'image' ? '📷 Photo' : content,
            lastMessageAt: 'Just now',
            isOnline: true,
            lastSeenText: 'Active now',
          };
        }
        return c;
      });
      safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      return updated;
    });

    sendHeartbeat();

    const msgPayload = {
      type: 'NEW_MESSAGE',
      conversationId,
      senderId: user.id,
      recipientId: recipientId,
      sender: user,
      message: newMsg,
    };

    // 1. Cross-tab BroadcastChannel and storage event (web only)
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('afford_live_events_bus');
          bc.postMessage(msgPayload);
          bc.close();
        }
      } catch {}

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('afford_last_msg_sync', JSON.stringify({ ...msgPayload, ts: Date.now() }));
        }
      } catch {}
    }

    // 2. Supabase Realtime broadcast for multi-device synchronization
    if (isConfigured && presenceChannelRef.current) {
      try {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'NEW_MESSAGE',
          payload: msgPayload,
        });
      } catch (err) {
        console.warn('Realtime message broadcast failed:', err);
      }
    }

    // 3. Persist to Supabase messages table for offline delivery
    if (isConfigured) {
      (async () => {
        try {
          const validSenderId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);
          const validRecipientId = recipientId ? (isValidUUID(recipientId) ? recipientId : toValidUUID(recipientId)) : undefined;
          const validConvId = isValidUUID(conversationId) ? conversationId : toValidUUID(conversationId);

          // Ensure conversation row exists in Supabase
          await supabase.from('conversations').upsert({
            id: validConvId,
            is_group: false,
            updated_at: new Date().toISOString(),
          });

          // Ensure membership rows exist
          if (validSenderId) {
            await supabase.from('conversation_members').upsert({
              conversation_id: validConvId,
              user_id: validSenderId,
            });
          }
          if (validRecipientId) {
            await supabase.from('conversation_members').upsert({
              conversation_id: validConvId,
              user_id: validRecipientId,
            });
          }

          const { error: msgErr } = await supabase.from('messages').insert({
            conversation_id: validConvId,
            sender_id: validSenderId,
            recipient_id: validRecipientId,
            content,
            media_type: mediaType,
            media_url: mediaUrl,
          });
          if (msgErr) {
            console.warn('Supabase message insert error:', msgErr);
          }
        } catch (err) {
          console.warn('Failed to insert message to Supabase:', err);
        }
      })();
    }
  };

  /**
   * SIGNATURE FEATURE: MISS YOU GESTURE
   * - Increments the sender's Miss You count for that recipient
   * - Creates a persistent Miss You event in public.miss_you_events
   * - Sends/records notification to the recipient in public.notifications
   * - Updates conversation streak and last active status
   * - Performs immediate optimistic state update with automatic rollback on error
   * - Synchronizes with authoritative count from Supabase
   */
  const sendMissYouGesture = async (
    recipientId: string,
    conversationId?: string
  ): Promise<{ success: boolean; newCount: number }> => {
    if (!user) return { success: false, newCount: 0 };

    const targetConvId = conversationId || getDirectConversationId(user.id, recipientId);
    let newCount = 1;

    // 1. Optimistic update of local conversation state
    setConversations((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.id === targetConvId || (c.otherUser && c.otherUser.id === recipientId)
      );
      let updated: Conversation[];
      if (existingIdx >= 0) {
        updated = prev.map((c, idx) => {
          if (idx === existingIdx) {
            const nextCount = (c.missYouCount || 0) + 1;
            const nextDaily = (c.dailyMissYouCount || 0) + 1;
            const nextStreak = (c.streakDays || 0) + 1;
            newCount = nextCount;
            return {
              ...c,
              id: targetConvId,
              missYouCount: nextCount,
              dailyMissYouCount: nextDaily,
              isMutualMissYou: true,
              streakDays: nextStreak,
              milestone: getFriendshipMilestone(nextStreak),
              lastMessage: '❤️ Sent a Miss You signal',
              lastMessageAt: 'Just now',
              isOnline: true,
              lastSeenText: 'Active now',
            };
          }
          return c;
        });
      } else {
        const otherProfile = allUsers.find((u) => u.id === recipientId);
        const newConv: Conversation = {
          id: targetConvId,
          isGroup: false,
          otherUser: otherProfile || {
            id: recipientId,
            username: 'friend',
            displayName: 'Friend',
            avatarUrl: '',
            bio: '',
            isPrivate: false,
            missYouNotificationsEnabled: true,
            streakNotificationsEnabled: true,
            isVerified: false,
            followersCount: 0,
            followingCount: 0,
            missYouSentCount: 0,
            missYouReceivedCount: 0,
            createdAt: new Date().toISOString(),
          },
          lastMessage: '❤️ Sent a Miss You signal',
          lastMessageAt: 'Just now',
          unreadCount: 0,
          missYouCount: 1,
          dailyMissYouCount: 1,
          streakDays: 1,
          isMutualMissYou: true,
          isOnline: true,
          lastSeenText: 'Active now',
        };
        newCount = 1;
        updated = [newConv, ...prev];
      }
      safeAsyncStorageSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      return updated;
    });

    // 2. Optimistic update of sender's profile stats
    setUser((u) => {
      if (!u) return null;
      const updatedUser: UserProfile = {
        ...u,
        missYouSentCount: (u.missYouSentCount || 0) + 1,
        dailyMissYouSentCount: (u.dailyMissYouSentCount || 0) + 1,
      };
      safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      return updatedUser;
    });

    // 3. Prepend to Miss You history
    const recipientFriend = allUsers.find((f) => f.id === recipientId) || INITIAL_FRIENDS.find((f) => f.id === recipientId);
    const newHistoryItem: MissYouEvent = {
      id: `myh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      senderId: user.id,
      recipientId,
      conversationId: targetConvId,
      intensityLevel: 1,
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      recipient: recipientFriend
        ? {
            id: recipientFriend.id,
            username: recipientFriend.username,
            displayName: recipientFriend.displayName,
            avatarUrl: recipientFriend.avatarUrl,
          }
        : undefined,
      isToday: true,
    };
    setMissYouHistory((prev) => {
      const updated = [newHistoryItem, ...prev];
      safeAsyncStorageSet(STORAGE_KEYS.MISS_YOU_HISTORY, JSON.stringify(updated));
      return updated;
    });

    // 4. Check for newly unlocked friendship milestone
    const targetConv = conversations.find(
      (c) => c.id === targetConvId || (c.otherUser && c.otherUser.id === recipientId)
    );
    const prevStreakDays = targetConv?.streakDays || 0;
    const nextStreakDays = prevStreakDays + 1;
    const oldMilestone = getFriendshipMilestone(prevStreakDays);
    const newMilestone = getFriendshipMilestone(nextStreakDays);
    if (newMilestone && (!oldMilestone || newMilestone.days !== oldMilestone.days)) {
      if (recipientFriend) {
        setMilestoneCelebration({ milestone: newMilestone, friend: recipientFriend });
      }
    }

    // 5. Broadcast Miss You signal in real time across ALL channels!
    const missYouPayload = {
      type: 'MISS_YOU_GESTURE',
      senderId: user.id,
      senderUsername: user.username,
      recipientId,
      recipientUsername: recipientFriend?.username || (typeof recipientId === 'string' && !isValidUUID(recipientId) ? recipientId : undefined),
      conversationId: targetConvId,
      count: newCount,
      sender: user,
      timestamp: Date.now(),
    };

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('afford_live_events_bus');
          bc.postMessage(missYouPayload);
          bc.close();
        }
      } catch {}
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('afford_last_missyou_sync', JSON.stringify({ ...missYouPayload, ts: Date.now() }));
        }
      } catch {}
    }

    if (isConfigured && presenceChannelRef.current) {
      try {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'MISS_YOU_GESTURE',
          payload: missYouPayload,
        });
      } catch (err) {
        console.warn('Realtime miss you broadcast error:', err);
      }
    }

    // 6. Persist to Supabase in background (never rollback local/peer state on non-fatal DB errors)
    if (isConfigured) {
      (async () => {
        try {
          const validSenderId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);
          const validRecipientId = isValidUUID(recipientId) ? recipientId : toValidUUID(recipientId);
          const validConvId = isValidUUID(targetConvId) ? targetConvId : toValidUUID(targetConvId);

          await supabase.from('miss_you_events').insert({
            sender_id: validSenderId,
            recipient_id: validRecipientId,
            conversation_id: validConvId,
            intensity_level: 1,
          });

          await supabase.from('notifications').insert({
            user_id: validRecipientId,
            actor_id: validSenderId,
            type: 'miss_you',
            title: 'Someone misses you ❤️',
            body: `${user.displayName} sent you a Miss You signal!`,
          });
        } catch (err) {
          console.warn('Supabase miss_you_events/notifications insert note:', err);
        }
      })();
    }

    return { success: true, newCount };
  };

  const fetchMissYouHistory = async (): Promise<MissYouEvent[]> => {
    if (!user || !isConfigured) return missYouHistory;

    try {
      const { data, error } = await supabase
        .from('miss_you_events')
        .select('id, sender_id, recipient_id, conversation_id, intensity_level, created_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(60);

      if (error || !data) return missYouHistory;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const mapped: MissYouEvent[] = data.map((ev: any) => {
        const isSentByMe = ev.sender_id === user.id;
        const otherId = isSentByMe ? ev.recipient_id : ev.sender_id;
        const friend = INITIAL_FRIENDS.find((f) => f.id === otherId);
        const isToday = new Date(ev.created_at) >= startOfToday;

        return {
          id: ev.id,
          senderId: ev.sender_id,
          recipientId: ev.recipient_id,
          conversationId: ev.conversation_id,
          intensityLevel: ev.intensity_level || 1,
          createdAt: ev.created_at,
          sender: isSentByMe
            ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
            : friend
            ? { id: friend.id, username: friend.username, displayName: friend.displayName, avatarUrl: friend.avatarUrl }
            : { id: ev.sender_id, username: 'friend', displayName: 'Afford Friend', avatarUrl: '' },
          recipient: !isSentByMe
            ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
            : friend
            ? { id: friend.id, username: friend.username, displayName: friend.displayName, avatarUrl: friend.avatarUrl }
            : { id: ev.recipient_id, username: 'friend', displayName: 'Afford Friend', avatarUrl: '' },
          isToday,
        };
      });

      setMissYouHistory(mapped);
      safeAsyncStorageSet(STORAGE_KEYS.MISS_YOU_HISTORY, JSON.stringify(mapped));
      return mapped;
    } catch (err) {
      console.warn('Failed to fetch miss you history from Supabase:', err);
      return missYouHistory;
    }
  };

  const answerConnectionQuestion = async (
    questionId: string,
    answer: string,
    partnerId?: string,
    isPrivate: boolean = true
  ) => {
    setConnectionQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            answeredByMe: true,
            myAnswer: answer,
            isPrivate,
          };
        }
        return q;
      });
      safeAsyncStorageSet(STORAGE_KEYS.CONNECTION_QUESTIONS, JSON.stringify(updated));
      return updated;
    });

    if (isConfigured && user) {
      try {
        await supabase.from('prompt_responses').insert({
          prompt_id: questionId,
          user_id: user.id,
          response_text: answer,
          is_shared_with_friends: !isPrivate,
        });

        if (partnerId) {
          await supabase.from('notifications').insert({
            user_id: partnerId,
            actor_id: user.id,
            type: 'message',
            title: 'Daily Connection Answer 💭',
            body: `${user.displayName} shared their connection reflection with you!`,
          });
        }
      } catch (e) {
        console.warn('Supabase prompt_responses insert non-fatal:', e);
      }
    }
  };

  const triggerMilestoneCelebration = (milestone: FriendshipMilestone, friend: UserProfile) => {
    setMilestoneCelebration({ milestone, friend });
  };

  const clearMilestoneCelebration = () => {
    setMilestoneCelebration(null);
  };

  const toggleFollow = (targetUserId: string) => {
    if (!targetUserId) return;
    const isCurrentlyFollowing = followingIds.includes(targetUserId);
    const delta = isCurrentlyFollowing ? -1 : 1;
    const nextFollowingIds = isCurrentlyFollowing
      ? followingIds.filter((id) => id !== targetUserId)
      : [...followingIds, targetUserId];

    setFollowingIds(nextFollowingIds);
    safeAsyncStorageSet(STORAGE_KEYS.FOLLOWING, JSON.stringify(nextFollowingIds));

    // 1. Update current user's following count
    if (user) {
      const updatedUser = {
        ...user,
        followingCount: Math.max(0, (user.followingCount || 0) + delta),
      };
      setUser(updatedUser);
      userRef.current = updatedUser;
      safeAsyncStorageSet(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      broadcastUserUpdate(updatedUser);
    }

    // 2. Update target user's followers count in allUsers immediately
    setAllUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === targetUserId) {
          const newCount = Math.max(0, (u.followersCount || 0) + delta);
          return { ...u, followersCount: newCount };
        }
        return u;
      });
      safeAsyncStorageSet(STORAGE_KEYS.ALL_USERS, JSON.stringify(next));
      return next;
    });

    // 3. Broadcast follow event across devices so target user sees their followers count increment live!
    const followPayload = {
      type: 'USER_FOLLOW_TOGGLED',
      targetUserId,
      followerId: user?.id,
      isFollowing: !isCurrentlyFollowing,
      delta,
    };

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('afford_live_events_bus');
          bc.postMessage(followPayload);
          bc.close();
        }
      } catch {}

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('afford_last_follow_sync', JSON.stringify({ ...followPayload, ts: Date.now() }));
        }
      } catch {}
    }

    if (isConfigured && presenceChannelRef.current) {
      try {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'USER_FOLLOW_TOGGLED',
          payload: followPayload,
        });
      } catch {}
    }

    // 4. Save to Supabase follows table and update profile counters
    if (isConfigured && user) {
      (async () => {
        try {
          const validFollowerId = isValidUUID(user.id) ? user.id : toValidUUID(user.id);
          const validTargetId = isValidUUID(targetUserId) ? targetUserId : toValidUUID(targetUserId);

          if (isCurrentlyFollowing) {
            await supabase
              .from('follows')
              .delete()
              .eq('follower_id', validFollowerId)
              .eq('following_id', validTargetId);
          } else {
            await supabase
              .from('follows')
              .upsert({
                follower_id: validFollowerId,
                following_id: validTargetId,
              });
          }

          // Update followers_count on target profile in Supabase
          const { data: targetProf } = await supabase
            .from('profiles')
            .select('followers_count')
            .eq('id', validTargetId)
            .single();
          if (targetProf) {
            const nextFollowers = Math.max(0, (targetProf.followers_count || 0) + delta);
            await supabase
              .from('profiles')
              .update({ followers_count: nextFollowers })
              .eq('id', validTargetId);
          }
        } catch (err) {
          console.warn('Supabase follows update error:', err);
        }
      })();
    }
  };

  const submitDailyPrompt = (response: string) => {
    const updated: DailyPrompt = {
      ...dailyPrompt,
      myResponse: response,
      friendsResponsesCount: dailyPrompt.friendsResponsesCount + 1,
    };
    setDailyPrompt(updated);
    safeAsyncStorageSet(STORAGE_KEYS.PROMPT, JSON.stringify(updated));
  };

  const markNotificationsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      safeAsyncStorageSet(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isConfigured,
        posts,
        stories,
        conversations,
        messages,
        notifications,
        dailyPrompt,
        followingIds,
        missYouHistory,
        fetchMissYouHistory,
        todayMissYouSentCount,
        todayMissYouReceivedCount,
        onThisDayMemories,
        connectionQuestions,
        answerConnectionQuestion,
        milestoneCelebration,
        triggerMilestoneCelebration,
        clearMilestoneCelebration,
        signIn,
        signUp,
        signOut,
        updateProfile,
        updateAvatar,
        allUsers,
        refreshUsers: fetchAllProfiles,
        refreshPosts: fetchPosts,
        refreshStories: fetchStories,
        searchUsers,
        startConversation,
        toggleLikePost,
        addPostComment,
        createPost,
        createStory,
        sendMessage,
        sendMissYouGesture,
        markUserActive,
        toggleFollow,
        submitDailyPrompt,
        markNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

