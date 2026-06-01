-- Wrap auth.uid() / auth.role() calls in (select ...) for RLS policies that
-- re-evaluate them per row. See Supabase docs:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Behavior is unchanged; this is purely a planner optimization that lets
-- Postgres evaluate auth.* once per query instead of once per row.

-- ---------------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated write access" ON public.blog_posts;
CREATE POLICY "Authenticated write access" ON public.blog_posts
  FOR ALL TO public
  USING ((select auth.role()) = 'authenticated');

-- ---------------------------------------------------------------------------
-- character_assignments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all character_assignments" ON public.character_assignments;
CREATE POLICY "Admins can read all character_assignments" ON public.character_assignments
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

DROP POLICY IF EXISTS "Users can create assignments for their mysteries" ON public.character_assignments;
CREATE POLICY "Users can create assignments for their mysteries" ON public.character_assignments
  FOR INSERT TO public
  WITH CHECK (mystery_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete assignments for their mysteries" ON public.character_assignments;
CREATE POLICY "Users can delete assignments for their mysteries" ON public.character_assignments
  FOR DELETE TO public
  USING (mystery_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update assignments for their mysteries" ON public.character_assignments;
CREATE POLICY "Users can update assignments for their mysteries" ON public.character_assignments
  FOR UPDATE TO public
  USING (mystery_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view assignments for their mysteries" ON public.character_assignments;
CREATE POLICY "Users can view assignments for their mysteries" ON public.character_assignments
  FOR SELECT TO public
  USING (mystery_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- contact_messages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all contact messages" ON public.contact_messages;
CREATE POLICY "Admins can read all contact messages" ON public.contact_messages
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages" ON public.contact_messages
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all conversations" ON public.conversations;
CREATE POLICY "Admins can read all conversations" ON public.conversations
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT TO public
  USING ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- guest_feedback
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all guest_feedback" ON public.guest_feedback;
CREATE POLICY "Admins can read all guest_feedback" ON public.guest_feedback
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

-- ---------------------------------------------------------------------------
-- intake_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own intake_profile" ON public.intake_profiles;
CREATE POLICY "Users can view own intake_profile" ON public.intake_profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Users can insert own messages" ON public.messages
  FOR INSERT TO public
  WITH CHECK (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT TO public
  USING (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- mystery_characters
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all mystery_characters" ON public.mystery_characters;
CREATE POLICY "Admins can read all mystery_characters" ON public.mystery_characters
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

DROP POLICY IF EXISTS "Users can manage own characters" ON public.mystery_characters;
CREATE POLICY "Users can manage own characters" ON public.mystery_characters
  FOR ALL TO public
  USING (package_id IN (
    SELECT mp.id
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE c.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view own characters" ON public.mystery_characters;
CREATE POLICY "Users can view own characters" ON public.mystery_characters
  FOR SELECT TO public
  USING (package_id IN (
    SELECT mp.id
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE c.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- mystery_feedback
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all mystery_feedback" ON public.mystery_feedback;
CREATE POLICY "Admins can read all mystery_feedback" ON public.mystery_feedback
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

DROP POLICY IF EXISTS "Users can view own feedback" ON public.mystery_feedback;
CREATE POLICY "Users can view own feedback" ON public.mystery_feedback
  FOR SELECT TO public
  USING ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- mystery_packages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all mystery_packages" ON public.mystery_packages;
CREATE POLICY "Admins can read all mystery_packages" ON public.mystery_packages
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

DROP POLICY IF EXISTS "Users can insert own packages" ON public.mystery_packages;
CREATE POLICY "Users can insert own packages" ON public.mystery_packages
  FOR INSERT TO public
  WITH CHECK (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update own packages" ON public.mystery_packages;
CREATE POLICY "Users can update own packages" ON public.mystery_packages
  FOR UPDATE TO public
  USING (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view own packages" ON public.mystery_packages;
CREATE POLICY "Users can view own packages" ON public.mystery_packages
  FOR SELECT TO public
  USING (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- profiles
-- (preserves existing column references exactly: SELECT/UPDATE use `id`,
--  DELETE/INSERT use `user_id`. This migration does not normalize that —
--  it is a pre-existing inconsistency outside the scope of this perf fix.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO public
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO public
  USING ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- speed_round_responses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own speed_round_responses" ON public.speed_round_responses;
CREATE POLICY "Users can view own speed_round_responses" ON public.speed_round_responses
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- speed_round_sessions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own speed_round_sessions" ON public.speed_round_sessions;
CREATE POLICY "Users can view own speed_round_sessions" ON public.speed_round_sessions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
