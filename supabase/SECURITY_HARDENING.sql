-- ==============================================================================
-- 🛡️ CHURCH COMPANION — DATABASE SECURITY HARDENING MIGRATION
-- Run this script in the Supabase SQL Editor to enforce production-grade security.
-- ==============================================================================

-- ── 1. Re-Enable Row Level Security (RLS) on all 15 Tables ────────────────────
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'songs','prayer_book','announcements','todays_song_selection',
    'almanac_entries','timeline_events','congregation_members',
    'profiles','admin_requests','youth_access_requests','posts',
    'chat_messages','message_deliveries','message_reads','message_reactions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    
    -- Drop legacy overly-permissive policies
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_permissive_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_anon_all', tbl);
  END LOOP;
END
$$;

-- ── 2. Revoke Dangerous Full Schema Permissions from Anonymous Users ──────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Grant minimal necessary schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ── 3. Public Read-Only Policies for Parish Resources ─────────────────────────
-- Songs, Prayers, Announcements, Almanac & Timeline can be read by any parishioner/guest
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'songs','prayer_book','announcements','todays_song_selection',
    'almanac_entries','timeline_events'
  ]
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_public_read', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);', tbl || '_public_read', tbl);
  END LOOP;
END
$$;

-- ── 4. Authenticated & Role-Based Policies for Sensitive Tables ───────────────

-- A. Profiles: Anyone authenticated can read member list, but users can only update their own profile
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated 
USING (id::text = auth.uid()::text OR public.is_super_admin())
WITH CHECK (id::text = auth.uid()::text OR public.is_super_admin());

-- B. Congregation Members Directory
GRANT SELECT ON public.congregation_members TO authenticated;
DROP POLICY IF EXISTS members_read_auth ON public.congregation_members;
CREATE POLICY members_read_auth ON public.congregation_members FOR SELECT TO authenticated USING (true);

-- C. Admin Requests & Youth Requests: Users can insert requests, only Admins can approve/delete
GRANT SELECT, INSERT ON public.admin_requests TO authenticated;
GRANT SELECT, INSERT ON public.youth_access_requests TO authenticated;

DROP POLICY IF EXISTS admin_requests_read ON public.admin_requests;
CREATE POLICY admin_requests_read ON public.admin_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS admin_requests_insert ON public.admin_requests;
CREATE POLICY admin_requests_insert ON public.admin_requests FOR INSERT TO authenticated WITH CHECK (true);

-- D. Chat Messages: Authenticated parishioners can read and post messages
GRANT SELECT, INSERT ON public.chat_messages TO authenticated, anon;
DROP POLICY IF EXISTS chat_read ON public.chat_messages;
CREATE POLICY chat_read ON public.chat_messages FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS chat_insert ON public.chat_messages;
CREATE POLICY chat_insert ON public.chat_messages FOR INSERT TO authenticated, anon WITH CHECK (content IS NOT NULL AND length(content) > 0);

-- ── 5. Hardened RPC Security Functions ─────────────────────────────────────────

-- Secure superadmin verification based on authenticated session or verified profile
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
STABLE
AS $$
BEGIN
  -- 1. Check if auth user email matches super admin
  IF (auth.jwt() ->> 'email') = 'emanualmridha2@gmail.com' THEN
    RETURN true;
  END IF;

  -- 2. Check if verified profile role is superadmin
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id::text = auth.uid()::text AND role = 'superadmin'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Secure role check
CREATE OR REPLACE FUNCTION public.has_role(_uid text, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
STABLE
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id::text = _uid AND role = _role
  );
END;
$$;

-- Admin Approval: STRICTLY require caller to be super admin or admin
CREATE OR REPLACE FUNCTION public.approve_admin_request(target_request_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_user_id text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only Super Admin can approve admin requests.';
  END IF;

  SELECT user_id::text INTO v_user_id
  FROM public.admin_requests
  WHERE id::text = target_request_id::text;

  UPDATE public.admin_requests
  SET status = 'approved', updated_at = now()
  WHERE id::text = target_request_id::text;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'admin', updated_at = now()
    WHERE id::text = v_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_admin_request(target_request_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only Super Admin can reject admin requests.';
  END IF;

  UPDATE public.admin_requests
  SET status = 'rejected', updated_at = now()
  WHERE id::text = target_request_id::text;
END;
$$;

-- Revoke dangerous RPC execution from anonymous callers
REVOKE EXECUTE ON FUNCTION public.approve_admin_request(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_admin_request(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_admin_request(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_admin_request(text) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.has_role(text, text) TO authenticated, service_role, anon;

-- ── 6. Reload PostgREST Schema Cache ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
