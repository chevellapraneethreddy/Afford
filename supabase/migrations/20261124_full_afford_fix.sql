-- ====================================================================
-- AFFORD UNIFIED SYSTEM REPAIR MIGRATION
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/aqmntovbkteirfzkqvtc/sql)
-- ====================================================================

-- 1. CREATE AFFORD-MEDIA STORAGE BUCKET FOR VIDEOS & PHOTOS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('afford-media', 'afford-media', true, 104857600, null)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600;

DROP POLICY IF EXISTS "Public can view afford-media" ON storage.objects;
CREATE POLICY "Public can view afford-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'afford-media');

DROP POLICY IF EXISTS "Public can upload afford-media" ON storage.objects;
CREATE POLICY "Public can upload afford-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'afford-media');

DROP POLICY IF EXISTS "Public can update afford-media" ON storage.objects;
CREATE POLICY "Public can update afford-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'afford-media');

DROP POLICY IF EXISTS "Public can delete afford-media" ON storage.objects;
CREATE POLICY "Public can delete afford-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'afford-media');

-- 2. BREAK RLS RECURSION ON CONVERSATION_MEMBERS & MESSAGES
DROP POLICY IF EXISTS "Members can view members in their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Public can view conversation_members" ON public.conversation_members;
CREATE POLICY "Public can view conversation_members"
ON public.conversation_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert membership" ON public.conversation_members;
DROP POLICY IF EXISTS "Public can insert conversation_members" ON public.conversation_members;
CREATE POLICY "Public can insert conversation_members"
ON public.conversation_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Members can leave or delete their own membership" ON public.conversation_members;
DROP POLICY IF EXISTS "Public can delete conversation_members" ON public.conversation_members;
CREATE POLICY "Public can delete conversation_members"
ON public.conversation_members FOR DELETE USING (true);

-- 3. UNLOCK MESSAGES TABLE
DROP POLICY IF EXISTS "Members can read messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Public can read messages" ON public.messages;
CREATE POLICY "Public can read messages"
ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Public can insert messages" ON public.messages;
CREATE POLICY "Public can insert messages"
ON public.messages FOR INSERT WITH CHECK (true);

-- Add optional recipient_id column to messages if missing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. UNLOCK CONVERSATIONS TABLE
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON public.conversations;
DROP POLICY IF EXISTS "Public can view conversations" ON public.conversations;
CREATE POLICY "Public can view conversations"
ON public.conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public can create conversations" ON public.conversations;
CREATE POLICY "Public can create conversations"
ON public.conversations FOR INSERT WITH CHECK (true);

-- 5. UNLOCK MISS_YOU_EVENTS & NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view Miss You events sent or received by them" ON public.miss_you_events;
DROP POLICY IF EXISTS "Public can view miss_you_events" ON public.miss_you_events;
CREATE POLICY "Public can view miss_you_events"
ON public.miss_you_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert Miss You events where they are sender" ON public.miss_you_events;
DROP POLICY IF EXISTS "Public can insert miss_you_events" ON public.miss_you_events;
CREATE POLICY "Public can insert miss_you_events"
ON public.miss_you_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public can view notifications" ON public.notifications;
CREATE POLICY "Public can view notifications"
ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users or system can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public can insert notifications" ON public.notifications;
CREATE POLICY "Public can insert notifications"
ON public.notifications FOR INSERT WITH CHECK (true);

-- 6. UNLOCK FOLLOWS TABLE
DROP POLICY IF EXISTS "Users can view all follows" ON public.follows;
CREATE POLICY "Public can view follows"
ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Public can follow others"
ON public.follows FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
CREATE POLICY "Public can unfollow others"
ON public.follows FOR DELETE USING (true);

-- 7. UNLOCK POSTS & STORIES FOR PUBLIC MANAGE & CLEAN UP CORRUPT ROWS
DROP POLICY IF EXISTS "Public can view posts" ON public.posts;
CREATE POLICY "Public can view posts" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can insert posts" ON public.posts;
CREATE POLICY "Public can insert posts" ON public.posts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete posts" ON public.posts;
CREATE POLICY "Public can delete posts" ON public.posts FOR DELETE USING (true);
DROP POLICY IF EXISTS "Public can update posts" ON public.posts;
CREATE POLICY "Public can update posts" ON public.posts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can view stories" ON public.stories;
CREATE POLICY "Public can view stories" ON public.stories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can insert stories" ON public.stories;
CREATE POLICY "Public can insert stories" ON public.stories FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete stories" ON public.stories;
CREATE POLICY "Public can delete stories" ON public.stories FOR DELETE USING (true);

-- Clean up any corrupt rows with local device paths or 'File not found'
DELETE FROM public.posts WHERE media_url LIKE '%RmlsZSBub3QgZm91bmQ%' OR media_url LIKE 'file:%';
DELETE FROM public.stories WHERE media_url LIKE '%RmlsZSBub3QgZm91bmQ%' OR media_url LIKE 'file:%';
