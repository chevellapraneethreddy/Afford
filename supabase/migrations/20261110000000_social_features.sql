-- ====================================================================
-- AFFORD SOCIAL FEATURES MIGRATION
-- Enhancements for Miss You History, Mutual Bonds, Daily Counts & Connection Questions
-- ====================================================================

-- 1. DAILY MISS YOU COUNTS VIEW
-- Respects Row Level Security by enabling security_invoker = on
CREATE OR REPLACE VIEW public.daily_miss_you_counts
WITH (security_invoker = on) AS
SELECT 
  sender_id,
  recipient_id,
  COUNT(*) as today_count,
  MAX(created_at) as last_sent_at
FROM public.miss_you_events
WHERE created_at >= CURRENT_DATE
GROUP BY sender_id, recipient_id;

-- 2. MUTUAL MISS YOU PAIRS VIEW
-- Identifies reciprocal connections where both users have sent signals
CREATE OR REPLACE VIEW public.mutual_miss_you_pairs
WITH (security_invoker = on) AS
SELECT 
  a.sender_id as user1_id,
  a.recipient_id as user2_id,
  COUNT(a.id) as user1_sent,
  (
    SELECT COUNT(*) 
    FROM public.miss_you_events b 
    WHERE b.sender_id = a.recipient_id AND b.recipient_id = a.sender_id
  ) as user2_sent
FROM public.miss_you_events a
GROUP BY a.sender_id, a.recipient_id
HAVING (
  SELECT COUNT(*) 
  FROM public.miss_you_events b 
  WHERE b.sender_id = a.recipient_id AND b.recipient_id = a.sender_id
) > 0;

-- 3. ENHANCE PROMPT_RESPONSES FOR PRIVATE COUPLE/FRIEND ANSWERS
ALTER TABLE public.prompt_responses 
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Policy to view private prompt responses
DROP POLICY IF EXISTS "Users can view relevant prompt responses" ON public.prompt_responses;
CREATE POLICY "Users can view relevant prompt responses"
  ON public.prompt_responses FOR SELECT
  USING (
    user_id = (SELECT auth.uid()) OR
    partner_id = (SELECT auth.uid()) OR
    is_shared_with_friends = true
  );

-- Policy to insert prompt responses
DROP POLICY IF EXISTS "Users can insert their own prompt responses" ON public.prompt_responses;
CREATE POLICY "Users can insert their own prompt responses"
  ON public.prompt_responses FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

