-- ====================================================================
-- AFFORD SOCIAL APP: COMPLETE PRODUCTION DATABASE SCHEMA WITH RLS
-- Run this complete script in your Supabase project SQL Editor.
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('image', 'video', 'voice', 'text');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  is_private BOOLEAN DEFAULT false,
  miss_you_notifications_enabled BOOLEAN DEFAULT true,
  streak_notifications_enabled BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- 4. FRIENDSHIPS & RELATIONSHIPS
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status friendship_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
  CONSTRAINT self_friendship_check CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_users ON public.friendships(user_id, friend_id);

-- 5. FOLLOWS TABLE (For public creators & discover)
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
  CONSTRAINT self_follow_check CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- 6. CLOSE FRIENDS TABLE (Close Circle)
CREATE TABLE IF NOT EXISTS public.close_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_close_friend UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_close_friends_user ON public.close_friends(user_id);

-- 7. BLOCKS & REPORTS
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  content_id UUID,
  reason TEXT NOT NULL,
  status report_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CONVERSATIONS & CHAT
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group BOOLEAN DEFAULT false,
  name TEXT,
  avatar_url TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  CONSTRAINT unique_conversation_member UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON public.conversation_members(conversation_id);

-- 9. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type media_type DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SIGNATURE FEATURE: MISS YOU GESTURE EVENTS
CREATE TABLE IF NOT EXISTS public.miss_you_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  intensity_level INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_miss_you_distinct CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_miss_you_recipient ON public.miss_you_events(recipient_id);
CREATE INDEX IF NOT EXISTS idx_miss_you_pair ON public.miss_you_events(sender_id, recipient_id, created_at DESC);

-- View with security_invoker = on so Row Level Security is strictly respected
CREATE OR REPLACE VIEW public.miss_you_counts
WITH (security_invoker = on) AS
SELECT 
  sender_id,
  recipient_id,
  COUNT(*) as total_miss_yous,
  MAX(created_at) as last_sent_at
FROM public.miss_you_events
GROUP BY sender_id, recipient_id;

-- 11. FRIEND STREAKS
CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 1,
  highest_streak INT DEFAULT 1,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_streak_pair UNIQUE (user1_id, user2_id),
  CONSTRAINT check_streak_order CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_streaks_users ON public.streaks(user1_id, user2_id);

-- 12. POSTS (PHOTO, VIDEO, SHORT CLIPS)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type media_type NOT NULL DEFAULT 'image',
  thumbnail_url TEXT,
  caption TEXT,
  filter_name TEXT,
  is_close_friends_only BOOLEAN DEFAULT false,
  is_short_video BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_short_video ON public.posts(is_short_video, created_at DESC);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_post_like UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at ASC);

-- 13. STORIES & MOMENTS (24-HOUR AUTO-EXPIRING)
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type media_type NOT NULL DEFAULT 'image',
  caption TEXT,
  is_close_friends_only BOOLEAN DEFAULT false,
  duration_seconds INT DEFAULT 6,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_active ON public.stories(user_id, expires_at);

CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_story_view UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- 15. DAILY CONNECTION PROMPTS
CREATE TABLE IF NOT EXISTS public.daily_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  active_date DATE UNIQUE NOT NULL,
  category TEXT DEFAULT 'relationships',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prompt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.daily_prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  media_url TEXT,
  is_shared_with_friends BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_daily_response UNIQUE (prompt_id, user_id)
);

-- 16. AUTO-CREATE PROFILE ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Afford Member'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17. HELPER FUNCTION TO BREAK RLS RECURSION ON CONVERSATIONS & MEMBERS
CREATE OR REPLACE FUNCTION public.is_member_of_conversation(conv_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miss_you_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_responses ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are visible to all authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are visible to all authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- CONVERSATIONS & MEMBERS
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT
  USING (public.is_member_of_conversation(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Members can view members in their conversations" ON public.conversation_members;
CREATE POLICY "Members can view members in their conversations"
  ON public.conversation_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.is_member_of_conversation(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert membership" ON public.conversation_members;
CREATE POLICY "Users can insert membership"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    public.is_member_of_conversation(conversation_id, auth.uid())
  );

-- MESSAGES
DROP POLICY IF EXISTS "Members can read messages in their conversations" ON public.messages;
CREATE POLICY "Members can read messages in their conversations"
  ON public.messages FOR SELECT
  USING (public.is_member_of_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Members can insert messages in their conversations" ON public.messages;
CREATE POLICY "Members can insert messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    public.is_member_of_conversation(conversation_id, auth.uid())
  );

-- MISS YOU EVENTS
DROP POLICY IF EXISTS "Users can view Miss You events sent or received by them" ON public.miss_you_events;
CREATE POLICY "Users can view Miss You events sent or received by them"
  ON public.miss_you_events FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can insert Miss You events where they are sender" ON public.miss_you_events;
CREATE POLICY "Users can insert Miss You events where they are sender"
  ON public.miss_you_events FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- POSTS POLICIES
DROP POLICY IF EXISTS "Users can view non-close-friends posts and their own" ON public.posts;
CREATE POLICY "Users can view non-close-friends posts and their own"
  ON public.posts FOR SELECT
  USING (
    auth.uid() = user_id OR
    (NOT is_close_friends_only AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = posts.user_id AND (NOT is_private OR EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE ((user_id = auth.uid() AND friend_id = posts.user_id) OR (user_id = posts.user_id AND friend_id = auth.uid()))
        AND status = 'accepted'
      ))
    )) OR
    (is_close_friends_only AND EXISTS (
      SELECT 1 FROM public.close_friends
      WHERE user_id = posts.user_id AND friend_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- STORIES POLICIES
DROP POLICY IF EXISTS "Users can view unexpired stories if authorized" ON public.stories;
CREATE POLICY "Users can view unexpired stories if authorized"
  ON public.stories FOR SELECT
  USING (
    expires_at > NOW() AND (
      auth.uid() = user_id OR
      (NOT is_close_friends_only) OR
      (is_close_friends_only AND EXISTS (
        SELECT 1 FROM public.close_friends
        WHERE user_id = stories.user_id AND friend_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "Users can insert their own stories" ON public.stories;
CREATE POLICY "Users can insert their own stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can read only their own notifications" ON public.notifications;
CREATE POLICY "Users can read only their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications read status" ON public.notifications;
CREATE POLICY "Users can update their own notifications read status"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('afford-media', 'afford-media', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
DROP POLICY IF EXISTS "Public can view afford-media" ON storage.objects;
CREATE POLICY "Public can view afford-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'afford-media');

DROP POLICY IF EXISTS "Authenticated users can upload afford-media" ON storage.objects;
CREATE POLICY "Authenticated users can upload afford-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'afford-media' AND auth.role() = 'authenticated');

-- REALTIME PUBLICATION SETUP
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.miss_you_events;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.streaks;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;
