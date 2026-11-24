-- ==============================================================================
-- AFFORD: UNLOCK STORIES & STORY VIEWS REALTIME AND RLS POLICIES
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. DROP RESTRICTIVE FOREIGN KEY CONSTRAINTS ON STORIES
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;
ALTER TABLE public.story_views DROP CONSTRAINT IF EXISTS story_views_story_id_fkey;
ALTER TABLE public.story_views DROP CONSTRAINT IF EXISTS story_views_viewer_id_fkey;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- 3. DROP OLD/RESTRICTIVE POLICIES
DROP POLICY IF EXISTS "Users can view unexpired stories if authorized" ON public.stories;
DROP POLICY IF EXISTS "Users can insert their own stories" ON public.stories;
DROP POLICY IF EXISTS "Allow read stories" ON public.stories;
DROP POLICY IF EXISTS "Allow insert stories" ON public.stories;
DROP POLICY IF EXISTS "Allow update stories" ON public.stories;
DROP POLICY IF EXISTS "Allow delete stories" ON public.stories;

DROP POLICY IF EXISTS "Users can record their story views" ON public.story_views;
DROP POLICY IF EXISTS "Story creators can view who saw their stories" ON public.story_views;
DROP POLICY IF EXISTS "Allow all story_views read" ON public.story_views;
DROP POLICY IF EXISTS "Allow all story_views insert" ON public.story_views;

-- 4. CREATE PERMISSIVE POLICIES FOR STORIES (AUTHENTICATED & ANON)
CREATE POLICY "Allow read stories" ON public.stories
  FOR SELECT
  USING (true);

CREATE POLICY "Allow insert stories" ON public.stories
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update stories" ON public.stories
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow delete stories" ON public.stories
  FOR DELETE
  USING (true);

-- 5. CREATE PERMISSIVE POLICIES FOR STORY_VIEWS
CREATE POLICY "Allow all story_views read" ON public.story_views
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all story_views insert" ON public.story_views
  FOR INSERT
  WITH CHECK (true);

-- 6. ADD STORIES TO SUPABASE REALTIME REPLICATION
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;
