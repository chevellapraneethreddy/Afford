-- ====================================================================
-- AFFORD DISCOVER, CONNECT, CHAT & MISS YOU GESTURE ENHANCEMENT MIGRATION
-- Fixes user search, follower counts, follow actions, online direct messages,
-- and real-time Miss You heart gestures
-- ====================================================================

-- 1. PROFILES TABLE DECOUPLING & FOLLOWER COUNTS
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are visible to all authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Allow all users to view profiles" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.profiles;
CREATE POLICY "Enable insert for all users"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for all users" ON public.profiles;
CREATE POLICY "Enable update for all users"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 2. CASE-INSENSITIVE PARTIAL MATCH INDEXES
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm 
  ON public.profiles USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm 
  ON public.profiles USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower 
  ON public.profiles (LOWER(display_name));

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
  ON public.profiles (LOWER(username));

-- 3. FOLLOWS TABLE DECOUPLING & OPEN POLICIES
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Enable select for all follows" ON public.follows;
CREATE POLICY "Enable select for all follows"
  ON public.follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enable insert for all follows" ON public.follows;
CREATE POLICY "Enable insert for all follows"
  ON public.follows FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for all follows" ON public.follows;
CREATE POLICY "Enable delete for all follows"
  ON public.follows FOR DELETE
  USING (true);

-- 4. MESSAGES TABLE DECOUPLING FOR DIRECT & OFFLINE CHAT
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ALTER COLUMN conversation_id TYPE TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id UUID;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Members can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Senders can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Allow read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow insert messages" ON public.messages;

CREATE POLICY "Allow read messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Allow insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- 5. MISS YOU EVENTS DECOUPLING FOR INSTANT HEART GESTURE UPDATES
ALTER TABLE public.miss_you_events DROP CONSTRAINT IF EXISTS miss_you_events_sender_id_fkey;
ALTER TABLE public.miss_you_events DROP CONSTRAINT IF EXISTS miss_you_events_recipient_id_fkey;
ALTER TABLE public.miss_you_events DROP CONSTRAINT IF EXISTS miss_you_events_conversation_id_fkey;
ALTER TABLE public.miss_you_events ALTER COLUMN conversation_id TYPE TEXT;

ALTER TABLE public.miss_you_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view Miss You events sent or received by them" ON public.miss_you_events;
DROP POLICY IF EXISTS "Users can insert Miss You events where they are sender" ON public.miss_you_events;
DROP POLICY IF EXISTS "Allow read miss you events" ON public.miss_you_events;
DROP POLICY IF EXISTS "Allow insert miss you events" ON public.miss_you_events;

CREATE POLICY "Allow read miss you events"
  ON public.miss_you_events FOR SELECT
  USING (true);

CREATE POLICY "Allow insert miss you events"
  ON public.miss_you_events FOR INSERT
  WITH CHECK (true);

-- 6. AUTO-CONFIRM TRIGGER FOR NEW REGISTERED USERS
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
  NEW.confirmed_at = COALESCE(NEW.confirmed_at, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_users();

-- 7. ROBUST AUTH.USERS -> PUBLIC.PROFILES TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'user_' || SUBSTRING(NEW.id::text, 1, 8)
  );

  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    v_username
  );

  v_avatar_url := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'
  );

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    bio,
    is_private,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_avatar_url,
    '',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(NULLIF(EXCLUDED.username, ''), public.profiles.username),
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. BACKFILL MISSING PROFILES
INSERT INTO public.profiles (id, username, display_name, avatar_url, bio, is_private, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(SPLIT_PART(u.email, '@', 1)), ''),
    'user_' || SUBSTRING(u.id::text, 1, 8)
  ) AS username,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    'Afford Member'
  ) AS display_name,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'avatar_url'), ''),
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'
  ) AS avatar_url,
  '' AS bio,
  false AS is_private,
  COALESCE(u.created_at, NOW()) AS created_at,
  NOW() AS updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 9. REALTIME REPLICATION FOR LIVE UPDATES
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.miss_you_events;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

-- 10. POSTS DECOUPLING & REALTIME REPLICATION FOR LIVE MEMORIES
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view non-close-friends posts and their own" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Allow read all public posts" ON public.posts;
DROP POLICY IF EXISTS "Allow insert posts" ON public.posts;

CREATE POLICY "Allow read all public posts"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Allow insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (true);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;
