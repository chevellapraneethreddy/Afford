-- ====================================================================
-- AFFORD SECURITY PATCH: HARDENED RLS, VIEW SECURITY & STORAGE POLICIES
-- Run this in Supabase SQL Editor to apply production-grade security.
-- ====================================================================

-- 1. SECURE THE MISS_YOU_COUNTS VIEW (Fix unrestricted public exposure)
-- Setting security_invoker = on ensures the view respects Row Level Security of miss_you_events
ALTER VIEW IF EXISTS public.miss_you_counts SET (security_invoker = on);

-- 2. HARDENED SECURITY DEFINER FUNCTION WITH EMPTY SEARCH PATH
-- Breaks RLS recursion on conversation_members and eliminates search_path hijacking vulnerabilities
CREATE OR REPLACE FUNCTION public.is_member_of_conversation(conv_id UUID, check_user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = check_user_id
  );
END;
$$;

-- Restrict function execution permissions to authenticated users only
REVOKE ALL ON FUNCTION public.is_member_of_conversation(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_member_of_conversation(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(UUID, UUID) TO service_role;

-- 3. HARDENED CONVERSATION_MEMBERS RLS POLICIES
DROP POLICY IF EXISTS "Members can view members in their conversations" ON public.conversation_members;
CREATE POLICY "Members can view members in their conversations"
  ON public.conversation_members FOR SELECT
  USING (
    user_id = (SELECT auth.uid()) OR
    public.is_member_of_conversation(conversation_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert membership" ON public.conversation_members;
CREATE POLICY "Users can insert membership"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id OR
    public.is_member_of_conversation(conversation_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Members can leave or delete their own membership" ON public.conversation_members;
CREATE POLICY "Members can leave or delete their own membership"
  ON public.conversation_members FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- 4. HARDENED CONVERSATIONS RLS POLICIES
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT
  USING (public.is_member_of_conversation(id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Members can update conversation metadata" ON public.conversations;
CREATE POLICY "Members can update conversation metadata"
  ON public.conversations FOR UPDATE
  USING (public.is_member_of_conversation(id, (SELECT auth.uid())));

-- 5. HARDENED MESSAGES RLS POLICIES
DROP POLICY IF EXISTS "Members can read messages in their conversations" ON public.messages;
CREATE POLICY "Members can read messages in their conversations"
  ON public.messages FOR SELECT
  USING (public.is_member_of_conversation(conversation_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can insert messages in their conversations" ON public.messages;
CREATE POLICY "Members can insert messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = sender_id AND
    public.is_member_of_conversation(conversation_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Senders can delete their own messages" ON public.messages;
CREATE POLICY "Senders can delete their own messages"
  ON public.messages FOR DELETE
  USING ((SELECT auth.uid()) = sender_id);

-- 6. HARDENED MISS YOU EVENTS RLS POLICIES
DROP POLICY IF EXISTS "Users can view Miss You events sent or received by them" ON public.miss_you_events;
CREATE POLICY "Users can view Miss You events sent or received by them"
  ON public.miss_you_events FOR SELECT
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = recipient_id);

DROP POLICY IF EXISTS "Users can insert Miss You events where they are sender" ON public.miss_you_events;
CREATE POLICY "Users can insert Miss You events where they are sender"
  ON public.miss_you_events FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = sender_id);

-- 7. STORAGE BUCKETS: SEPARATE PUBLIC MEDIA AND PRIVATE MEDIA
-- Public media (avatars, discover posts, public moments)
INSERT INTO storage.buckets (id, name, public)
VALUES ('afford-public', 'afford-public', true)
ON CONFLICT (id) DO NOTHING;

-- Private media (Close Circle stories, private posts, voice postcards, chat attachments)
INSERT INTO storage.buckets (id, name, public)
VALUES ('afford-private', 'afford-private', false)
ON CONFLICT (id) DO NOTHING;

-- Backward compatibility for afford-media
INSERT INTO storage.buckets (id, name, public)
VALUES ('afford-media', 'afford-media', true)
ON CONFLICT (id) DO NOTHING;

-- 8. STORAGE RLS: FOLDER ISOLATION AND OVERWRITE PROTECTION
-- A user can only upload/modify files inside their own user ID folder: {bucket}/{user_id}/*

-- afford-public: Anyone can read, only owner can upload/update/delete in their folder
DROP POLICY IF EXISTS "Public read on afford-public" ON storage.objects;
CREATE POLICY "Public read on afford-public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'afford-public');

DROP POLICY IF EXISTS "Users can upload to their own folder in afford-public" ON storage.objects;
CREATE POLICY "Users can upload to their own folder in afford-public"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'afford-public' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update their own files in afford-public" ON storage.objects;
CREATE POLICY "Users can update their own files in afford-public"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'afford-public' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete their own files in afford-public" ON storage.objects;
CREATE POLICY "Users can delete their own files in afford-public"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'afford-public' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- afford-private: ONLY owner or authenticated recipients can read (via signed URLs or RLS)
DROP POLICY IF EXISTS "Users can read own private media" ON storage.objects;
CREATE POLICY "Users can read own private media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'afford-private' AND
    auth.role() = 'authenticated' AND
    (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      auth.role() = 'service_role'
    )
  );

DROP POLICY IF EXISTS "Users can upload to their own folder in afford-private" ON storage.objects;
CREATE POLICY "Users can upload to their own folder in afford-private"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'afford-private' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete their own files in afford-private" ON storage.objects;
CREATE POLICY "Users can delete their own files in afford-private"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'afford-private' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- afford-media legacy bucket folder isolation
DROP POLICY IF EXISTS "Public can view afford-media" ON storage.objects;
CREATE POLICY "Public can view afford-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'afford-media');

DROP POLICY IF EXISTS "Authenticated users can upload afford-media" ON storage.objects;
CREATE POLICY "Authenticated users can upload afford-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'afford-media' AND
    auth.role() = 'authenticated'
  );

-- 9. NOTIFICATIONS INSERT POLICY FOR SENDER ACTIONS (Miss You gestures, likes, comments)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (actor_id = (SELECT auth.uid()) OR user_id = (SELECT auth.uid()))
  );

