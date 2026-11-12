export type MediaType = 'image' | 'video' | 'voice' | 'text';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  isPrivate: boolean;
  missYouNotificationsEnabled: boolean;
  streakNotificationsEnabled: boolean;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  missYouSentCount: number;
  missYouReceivedCount: number;
  dailyMissYouSentCount?: number;
  dailyMissYouReceivedCount?: number;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caption: string;
  filterName?: string;
  isCloseFriendsOnly: boolean;
  isShortVideo?: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLikedByMe?: boolean;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  comment: string;
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  isCloseFriendsOnly: boolean;
  durationSeconds: number;
  viewsCount: number;
  isViewedByMe?: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  avatarUrl?: string;
  otherUser?: UserProfile;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline?: boolean;
  lastSeenText?: string;
  streakDays?: number;
  missYouCount: number; // Lifetime Miss You gestures sent to this contact
  dailyMissYouCount?: number; // Miss You gestures sent today
  isMutualMissYou?: boolean; // True when both friends actively send Miss You gestures
  milestone?: FriendshipMilestone;
  isMuted?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string;
  mediaType: MediaType;
  isRead: boolean;
  createdAt: string;
}

export interface MissYouEvent {
  id: string;
  senderId: string;
  recipientId: string;
  conversationId?: string;
  intensityLevel: number;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  recipient?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  isToday?: boolean;
}

export interface FriendshipMilestone {
  days: 7 | 30 | 50 | 100;
  title: string;
  badge: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  description: string;
  unlockedAt?: string;
}

export interface OnThisDayMemory {
  id: string;
  originalPostId?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  yearsAgo: number;
  originalDate: string;
  location?: string;
  isCloseFriendsOnly: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

export interface ConnectionQuestion {
  id: string;
  questionText: string;
  category: 'friendship' | 'couples' | 'deep' | 'fun';
  activeDate: string;
  answeredByMe?: boolean;
  myAnswer?: string;
  partnerAnswer?: string;
  partnerUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  isPrivate: boolean;
  createdAt?: string;
}

export interface Streak {
  id: string;
  user1Id: string;
  user2Id: string;
  currentStreak: number;
  highestStreak: number;
  lastInteractionAt: string;
  expiresAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  type: 'miss_you' | 'like' | 'comment' | 'follow' | 'streak_warning' | 'message';
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface DailyPrompt {
  id: string;
  promptText: string;
  activeDate: string;
  category: string;
  myResponse?: string;
  friendsResponsesCount: number;
}

