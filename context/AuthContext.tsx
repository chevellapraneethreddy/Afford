import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
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
  toggleLikePost: (postId: string) => void;
  addPostComment: (postId: string, comment: string) => void;
  createPost: (mediaUrl: string, caption: string, isCloseFriends: boolean, filterName?: string, mediaType?: 'image' | 'video') => void;
  createStory: (mediaUrl: string, caption?: string, isCloseFriends?: boolean) => void;
  sendMessage: (conversationId: string, content: string, mediaType?: 'text' | 'image' | 'voice', mediaUrl?: string) => void;
  sendMissYouGesture: (recipientId: string, conversationId?: string) => Promise<{ success: boolean; newCount: number }>;
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
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(CURRENT_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());

  // Application State
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
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
        ]);

        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedPosts) setPosts(JSON.parse(savedPosts));
        if (savedStories) setStories(JSON.parse(savedStories));
        if (savedConvs) setConversations(JSON.parse(savedConvs));
        if (savedMsgs) setMessages(JSON.parse(savedMsgs));
        if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
        if (savedPrompt) setDailyPrompt(JSON.parse(savedPrompt));
        if (savedHistory) setMissYouHistory(JSON.parse(savedHistory));
        if (savedQuestions) setConnectionQuestions(JSON.parse(savedQuestions));
      } catch (err) {
        console.warn('Failed to load cached application state', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Supabase real-time subscription when configured
  useEffect(() => {
    if (!isConfigured) return;

    // Listen to auth state changes from Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch or create profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

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
            followersCount: 0,
            followingCount: 0,
            missYouSentCount: liveSentCount,
            missYouReceivedCount: liveReceivedCount,
            createdAt: profile.created_at,
          };
          setUser(loadedUser);
          AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loadedUser));
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
          const livePosts: Post[] = dbPosts.map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            user: {
              id: p.user_id,
              username: 'member',
              displayName: 'Afford Member',
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
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

    // Realtime channel for messages and miss you signals
    const realtimeChannel = supabase
      .channel('afford_live_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const newMsg = payload.new;
          if (newMsg) {
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
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'miss_you_events' },
        (payload: any) => {
          const event = payload.new;
          if (event && user && event.recipient_id === user.id) {
            // New incoming Miss You signal received in real time with duplicate prevention
            setNotifications((prev) => {
              if (prev.some((n) => n.id === `notif_realtime_${event.id}`)) return prev;
              const incomingNotif: NotificationItem = {
                id: `notif_realtime_${event.id}`,
                userId: user.id,
                actor: {
                  id: event.sender_id,
                  username: 'friend',
                  displayName: 'Someone who misses you',
                  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
                },
                type: 'miss_you',
                title: 'Someone misses you ❤️',
                body: 'A friend sent you a Miss You signal!',
                isRead: false,
                createdAt: 'Just now',
              };
              const updated = [incomingNotif, ...prev];
              AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
              return updated;
            });

            // Increment received counter
            setUser((u) => {
              if (!u) return null;
              const next = { ...u, missYouReceivedCount: (u.missYouReceivedCount || 0) + 1 };
              AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
              return next;
            });

            // Also update conversation's lastMessage and unread count
            setConversations((prev) => {
              const updated = prev.map((c) => {
                if (
                  (event.conversation_id && c.id === event.conversation_id) ||
                  (c.otherUser && c.otherUser.id === event.sender_id)
                ) {
                  return {
                    ...c,
                    lastMessage: '❤️ Sent you a Miss You signal',
                    lastMessageAt: 'Just now',
                    unreadCount: (c.unreadCount || 0) + 1,
                  };
                }
                return c;
              });
              AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      authListener?.subscription.unsubscribe();
      supabase.removeChannel(realtimeChannel);
    };
  }, [isConfigured]);

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (isConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    // Demo/Offline flow
    const demoUser: UserProfile = {
      ...CURRENT_USER,
      username: email.split('@')[0] || 'alex_rivera',
    };
    setUser(demoUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
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
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUserProfile));
      }
      return { success: true };
    }

    // Demo/Offline flow
    const newUser: UserProfile = {
      ...CURRENT_USER,
      id: `usr_${Date.now()}`,
      username: username.toLowerCase().replace(/\s+/g, '_'),
      displayName: name,
    };
    setUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    return { success: true };
  };

  const signOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));

    if (isConfigured) {
      await supabase.from('profiles').update({
        display_name: updated.displayName,
        bio: updated.bio,
        avatar_url: updated.avatarUrl,
        is_private: updated.isPrivate,
        miss_you_notifications_enabled: updated.missYouNotificationsEnabled,
        streak_notifications_enabled: updated.streakNotificationsEnabled,
      }).eq('id', user.id);
    }
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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
      return updated;
    });
  };

  const createPost = (
    mediaUrl: string,
    caption: string,
    isCloseFriends: boolean,
    filterName?: string,
    mediaType: 'image' | 'video' = 'image'
  ) => {
    if (!user) return;
    const newPost: Post = {
      id: `post_${Date.now()}`,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
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
      AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
      return updated;
    });

    if (isConfigured) {
      supabase.from('posts').insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption,
        filter_name: filterName,
        is_close_friends_only: isCloseFriends,
      });
    }
  };

  const createStory = (mediaUrl: string, caption?: string, isCloseFriends: boolean = false) => {
    if (!user) return;
    const newStory: Story = {
      id: `story_${Date.now()}`,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      mediaUrl,
      mediaType: 'image',
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
      AsyncStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(updated));
      return updated;
    });

    if (isConfigured) {
      supabase.from('stories').insert({
        user_id: user.id,
        media_url: mediaUrl,
        caption,
        is_close_friends_only: isCloseFriends,
      });
    }
  };

  const sendMessage = (
    conversationId: string,
    content: string,
    mediaType: 'text' | 'image' | 'voice' = 'text',
    mediaUrl?: string
  ) => {
    if (!user) return;
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
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
      AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
      return updated;
    });

    // Update conversation preview
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: mediaType === 'voice' ? '🎙️ Voice Postcard' : mediaType === 'image' ? '📷 Photo' : content,
            lastMessageAt: 'Just now',
          };
        }
        return c;
      });
      AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      return updated;
    });

    if (isConfigured) {
      supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        media_type: mediaType,
        media_url: mediaUrl,
      });
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

    // Record previous count for rollback in case of network failure
    let prevConversationCount = 0;
    const targetConv = conversations.find(
      (c) =>
        (conversationId && c.id === conversationId) ||
        (c.otherUser && c.otherUser.id === recipientId)
    );
    prevConversationCount = targetConv?.missYouCount || 0;
    let newCount = prevConversationCount + 1;

    // 1. Optimistic update of local conversation state
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (
          (conversationId && c.id === conversationId) ||
          (c.otherUser && c.otherUser.id === recipientId)
        ) {
          const nextCount = (c.missYouCount || 0) + 1;
          const nextDaily = (c.dailyMissYouCount || 0) + 1;
          const nextStreak = (c.streakDays || 0) + 1;
          newCount = nextCount;
          return {
            ...c,
            missYouCount: nextCount,
            dailyMissYouCount: nextDaily,
            isMutualMissYou: true,
            streakDays: nextStreak,
            milestone: getFriendshipMilestone(nextStreak),
            lastMessage: '❤️ Sent a Miss You signal',
            lastMessageAt: 'Just now',
          };
        }
        return c;
      });
      AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
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
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      return updatedUser;
    });

    // 3. Prepend to Miss You history
    const recipientFriend = INITIAL_FRIENDS.find((f) => f.id === recipientId);
    const newHistoryItem: MissYouEvent = {
      id: `myh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      senderId: user.id,
      recipientId,
      conversationId,
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
      AsyncStorage.setItem(STORAGE_KEYS.MISS_YOU_HISTORY, JSON.stringify(updated));
      return updated;
    });

    // 4. Check for newly unlocked friendship milestone
    const prevStreakDays = targetConv?.streakDays || 0;
    const nextStreakDays = prevStreakDays + 1;
    const oldMilestone = getFriendshipMilestone(prevStreakDays);
    const newMilestone = getFriendshipMilestone(nextStreakDays);
    if (newMilestone && (!oldMilestone || newMilestone.days !== oldMilestone.days)) {
      if (recipientFriend) {
        setMilestoneCelebration({ milestone: newMilestone, friend: recipientFriend });
      }
    }

    // 5. Create local Miss You notification preview
    const newNotif: NotificationItem = {
      id: `notif_missyou_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: recipientId,
      actor: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      type: 'miss_you',
      title: 'Someone misses you ❤️',
      body: `${user.displayName} sent you a Miss You signal!`,
      isRead: false,
      createdAt: 'Just now',
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    });

    // 6. Real database synchronization via Supabase
    if (isConfigured) {
      try {
        const isUUID = (str?: string) =>
          str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

        // Only send to Supabase if both sender and recipient have valid database UUIDs
        if (isUUID(user.id) && isUUID(recipientId)) {
          // A. Insert into public.miss_you_events
          const { error: eventError } = await supabase.from('miss_you_events').insert({
            sender_id: user.id,
            recipient_id: recipientId,
            conversation_id: isUUID(conversationId) ? conversationId : null,
            intensity_level: 1,
          });

          if (eventError) {
            throw eventError;
          }

          // B. Insert into public.notifications for recipient
          try {
            await supabase.from('notifications').insert({
              user_id: recipientId,
              actor_id: user.id,
              type: 'miss_you',
              title: 'Someone misses you ❤️',
              body: `${user.displayName} sent you a Miss You signal!`,
            });
          } catch (notifErr) {
            console.warn('Supabase notification non-fatal warning:', notifErr);
          }

          // C. Fetch authoritative count from public.miss_you_events
          const { count: dbCount, error: countErr } = await supabase
            .from('miss_you_events')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', user.id)
            .eq('recipient_id', recipientId);

          const authoritativeCount = (!countErr && typeof dbCount === 'number') ? dbCount : newCount;

          // Sync local conversation count if authoritative count differs
          if (authoritativeCount !== newCount) {
            setConversations((prev) =>
              prev.map((c) => {
                if (
                  (conversationId && c.id === conversationId) ||
                  (c.otherUser && c.otherUser.id === recipientId)
                ) {
                  return { ...c, missYouCount: authoritativeCount };
                }
                return c;
              })
            );
          }

          return { success: true, newCount: authoritativeCount };
        } else {
          // For seed/mock friend profiles (non-UUID), persist locally and return success
          return { success: true, newCount };
        }
      } catch (e: any) {
        console.warn('Supabase miss you event sync failed:', e?.message || e);
        // Roll back optimistic updates on failure
        setMissYouHistory((prev) => prev.filter((ev) => ev.id !== newHistoryItem.id));
        setConversations((prev) => {
          const rolledBack = prev.map((c) => {
            if (
              (conversationId && c.id === conversationId) ||
              (c.otherUser && c.otherUser.id === recipientId)
            ) {
              return {
                ...c,
                missYouCount: prevConversationCount,
                dailyMissYouCount: Math.max(0, (c.dailyMissYouCount || 1) - 1),
                streakDays: prevStreakDays,
                milestone: oldMilestone,
              };
            }
            return c;
          });
          AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(rolledBack));
          return rolledBack;
        });

        setUser((u) => {
          if (!u) return null;
          const rolledBackUser: UserProfile = {
            ...u,
            missYouSentCount: Math.max(0, (u.missYouSentCount || 1) - 1),
            dailyMissYouSentCount: Math.max(0, (u.dailyMissYouSentCount || 1) - 1),
          };
          AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(rolledBackUser));
          return rolledBackUser;
        });

        return { success: false, newCount: prevConversationCount };
      }
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
            : { id: ev.sender_id, username: 'friend', displayName: 'Afford Friend', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' },
          recipient: !isSentByMe
            ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
            : friend
            ? { id: friend.id, username: friend.username, displayName: friend.displayName, avatarUrl: friend.avatarUrl }
            : { id: ev.recipient_id, username: 'friend', displayName: 'Afford Friend', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' },
          isToday,
        };
      });

      setMissYouHistory(mapped);
      AsyncStorage.setItem(STORAGE_KEYS.MISS_YOU_HISTORY, JSON.stringify(mapped));
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
      AsyncStorage.setItem(STORAGE_KEYS.CONNECTION_QUESTIONS, JSON.stringify(updated));
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
    setFollowingIds((prev) => {
      const isFollowing = prev.includes(targetUserId);
      const updated = isFollowing ? prev.filter((id) => id !== targetUserId) : [...prev, targetUserId];
      AsyncStorage.setItem(STORAGE_KEYS.FOLLOWING, JSON.stringify(updated));
      return updated;
    });
  };

  const submitDailyPrompt = (response: string) => {
    const updated: DailyPrompt = {
      ...dailyPrompt,
      myResponse: response,
      friendsResponsesCount: dailyPrompt.friendsResponsesCount + 1,
    };
    setDailyPrompt(updated);
    AsyncStorage.setItem(STORAGE_KEYS.PROMPT, JSON.stringify(updated));
  };

  const markNotificationsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
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
        toggleLikePost,
        addPostComment,
        createPost,
        createStory,
        sendMessage,
        sendMissYouGesture,
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

