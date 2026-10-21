-- ==============================================================================
-- ALL SAINTS' CHURCH — Core Real-Time Sync v2 Database Migration (Bulletproof)
-- Safe to re-run (fully idempotent). Paste into Supabase SQL Editor and click RUN.
-- Project: eqwgrxcitwoyickthfpd  |  Generated: 2026-10-15
-- ==============================================================================

-- ── 0. Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Create Tables and Ensure Columns (RUNS FIRST so all tables exist) ────────

-- 1.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email        text,
  display_name text,
  role         text DEFAULT 'member',
  is_youth     boolean DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz NULL
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email        text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role         text DEFAULT 'member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_youth     boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at   timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_updated ON public.profiles (updated_at DESC);

-- 1.2 songs
CREATE TABLE IF NOT EXISTS public.songs (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title         text NOT NULL,
  lyrics        text,
  category      text DEFAULT 'hymn',
  song_number   text,
  book_reference text DEFAULT 'masihiGeet',
  composer      text,
  author        text,
  key_signature text,
  tempo         text,
  version       int NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid,
  deleted_at    timestamptz NULL
);
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS title         text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS lyrics        text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS category      text DEFAULT 'hymn';
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS song_number   text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS book_reference text DEFAULT 'masihiGeet';
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS composer      text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS author        text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS key_signature text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS tempo         text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS version       int NOT NULL DEFAULT 1;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS created_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS updated_by   uuid;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS deleted_at   timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_songs_updated  ON public.songs (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_active   ON public.songs (updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_songs_book_num ON public.songs (book_reference, song_number);

-- 1.3 prayer_book
CREATE TABLE IF NOT EXISTS public.prayer_book (
  id         text PRIMARY KEY,
  category   text,
  title      text,
  content    text,
  sort_order int DEFAULT 0,
  version    int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS category   text;
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS title      text;
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS content    text;
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS version    int NOT NULL DEFAULT 1;
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.prayer_book ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_prayer_book_updated ON public.prayer_book (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_book_active  ON public.prayer_book (sort_order, updated_at DESC) WHERE deleted_at IS NULL;

-- 1.4 announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title      text,
  body       text,
  priority   int DEFAULT 1,
  is_active  boolean DEFAULT true,
  date       text,
  version    int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS title      text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS body       text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS priority   int DEFAULT 1;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_active  boolean DEFAULT true;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS date       text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS version    int NOT NULL DEFAULT 1;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_updated ON public.announcements (priority DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_active  ON public.announcements (priority DESC, updated_at DESC) WHERE deleted_at IS NULL;

-- 1.5 todays_song_selection
CREATE TABLE IF NOT EXISTS public.todays_song_selection (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date_key   text NOT NULL,
  song_ids   jsonb DEFAULT '[]'::jsonb,
  songs      jsonb DEFAULT '[]'::jsonb,
  version    int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS date_key   text;
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS song_ids   jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS songs      jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS version    int NOT NULL DEFAULT 1;
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_today_song_date_key ON public.todays_song_selection (date_key);
CREATE INDEX IF NOT EXISTS idx_today_song_updated ON public.todays_song_selection (updated_at DESC);

-- 1.6 almanac_entries
CREATE TABLE IF NOT EXISTS public.almanac_entries (
  id               text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date_key         text NOT NULL UNIQUE,
  year             int,
  title            text,
  liturgical_color text,
  details          jsonb,
  version          int NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid,
  deleted_at       timestamptz NULL
);
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS date_key         text;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS year             int;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS title            text;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS liturgical_color text;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS details          jsonb;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS version          int NOT NULL DEFAULT 1;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS created_at       timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS updated_by       uuid;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS deleted_at       timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_almanac_date_key ON public.almanac_entries (date_key);
CREATE INDEX IF NOT EXISTS idx_almanac_updated  ON public.almanac_entries (updated_at DESC);

-- 1.7 timeline_events
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year        int,
  title       text NOT NULL,
  description text,
  sort_order  int DEFAULT 0,
  version     int NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid,
  deleted_at  timestamptz NULL
);
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS year        int;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS title       text;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS sort_order  int DEFAULT 0;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS version     int NOT NULL DEFAULT 1;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS updated_by  uuid;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS deleted_at  timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_updated ON public.timeline_events (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_year    ON public.timeline_events (sort_order, year);

-- 1.8 congregation_members
CREATE TABLE IF NOT EXISTS public.congregation_members (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  display_name text,
  email        text,
  phone        text,
  is_youth     boolean DEFAULT false,
  notes        text,
  version      int NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid,
  deleted_at   timestamptz NULL
);
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS email        text;
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS phone        text;
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS is_youth     boolean DEFAULT false;
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS notes        text;
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS version      int NOT NULL DEFAULT 1;
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS created_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS updated_by   uuid;
ALTER TABLE public.congregation_members ADD COLUMN IF NOT EXISTS deleted_at   timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_members_updated ON public.congregation_members (updated_at DESC);

-- 1.9 admin_requests
CREATE TABLE IF NOT EXISTS public.admin_requests (
  id             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        text NOT NULL,
  status         text NOT NULL DEFAULT 'pending',
  requested_post text,
  version        int NOT NULL DEFAULT 1,
  requested_at   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz NULL
);
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS user_id        text;
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS status         text NOT NULL DEFAULT 'pending';
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS requested_post text;
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS version        int NOT NULL DEFAULT 1;
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS requested_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS created_at     timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS deleted_at     timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_admin_requests_user   ON public.admin_requests (user_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_updated ON public.admin_requests (updated_at DESC);

-- 1.10 youth_access_requests
CREATE TABLE IF NOT EXISTS public.youth_access_requests (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      text NOT NULL,
  status       text NOT NULL DEFAULT 'pending',
  version      int NOT NULL DEFAULT 1,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz NULL
);
ALTER TABLE public.youth_access_requests ADD COLUMN IF NOT EXISTS user_id      text;
ALTER TABLE public.youth_access_requests ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'pending';
ALTER TABLE public.youth_access_requests ADD COLUMN IF NOT EXISTS version      int NOT NULL DEFAULT 1;
ALTER TABLE public.youth_access_requests ADD COLUMN IF NOT EXISTS requested_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.youth_access_requests ADD COLUMN IF NOT EXISTS created_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.youth_access_requests ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.youth_access_requests ADD COLUMN IF NOT EXISTS deleted_at   timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_youth_requests_user    ON public.youth_access_requests (user_id, status);
CREATE INDEX IF NOT EXISTS idx_youth_requests_updated ON public.youth_access_requests (updated_at DESC);

-- 1.11 posts
CREATE TABLE IF NOT EXISTS public.posts (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title      text,
  body       text,
  author_id  text,
  sort_order int DEFAULT 0,
  version    int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS title      text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS body       text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_id  text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS version    int NOT NULL DEFAULT 1;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_posts_updated ON public.posts (updated_at DESC);

-- ── 2. GRANT Permissions (RUNS EARLY to immediately eliminate 401 errors) ─────

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ── 3. Helper Functions (Robust PL/pgSQL with text-casting) ─────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_uid text, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = _uid::text
      AND lower(COALESCE(role::text, '')) = lower(_role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_uid uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
STABLE
AS $$
BEGIN
  RETURN public.has_role(_uid::text, _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
STABLE
AS $$
DECLARE
  v_email text;
  v_uid text;
BEGIN
  BEGIN
    v_email := lower(auth.jwt() ->> 'email');
  EXCEPTION WHEN OTHERS THEN
    v_email := null;
  END;

  BEGIN
    v_uid := (auth.uid())::text;
  EXCEPTION WHEN OTHERS THEN
    v_uid := null;
  END;

  IF v_email = 'emanualmridha2@gmail.com' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (
      (v_uid IS NOT NULL AND id::text = v_uid) OR
      (v_email IS NOT NULL AND lower(COALESCE(email::text, '')) = v_email) OR
      lower(COALESCE(email::text, '')) = 'emanualmridha2@gmail.com'
    )
    AND lower(COALESCE(role::text, '')) = 'superadmin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
STABLE
AS $$
DECLARE
  v_uid text;
BEGIN
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  BEGIN
    v_uid := (auth.uid())::text;
  EXCEPTION WHEN OTHERS THEN
    v_uid := null;
  END;

  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.has_role(v_uid, 'admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO anon, authenticated, service_role;

-- ── 4. Triggers on All 11 Tables ───────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'songs','prayer_book','announcements','todays_song_selection',
    'almanac_entries','timeline_events','congregation_members',
    'profiles','admin_requests','youth_access_requests','posts'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_set_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', tbl, tbl);
  END LOOP;
END
$$;

-- ── 5. Replica Identity FULL on All 11 Tables ──────────────────────────────────

ALTER TABLE public.songs                  REPLICA IDENTITY FULL;
ALTER TABLE public.prayer_book            REPLICA IDENTITY FULL;
ALTER TABLE public.announcements          REPLICA IDENTITY FULL;
ALTER TABLE public.todays_song_selection  REPLICA IDENTITY FULL;
ALTER TABLE public.almanac_entries        REPLICA IDENTITY FULL;
ALTER TABLE public.timeline_events        REPLICA IDENTITY FULL;
ALTER TABLE public.congregation_members   REPLICA IDENTITY FULL;
ALTER TABLE public.profiles               REPLICA IDENTITY FULL;
ALTER TABLE public.admin_requests         REPLICA IDENTITY FULL;
ALTER TABLE public.youth_access_requests  REPLICA IDENTITY FULL;
ALTER TABLE public.posts                  REPLICA IDENTITY FULL;

-- ── 6. Realtime Publication (Safe Idempotent Loop) ─────────────────────────────

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'songs','prayer_book','announcements','todays_song_selection',
    'almanac_entries','timeline_events','congregation_members',
    'profiles','admin_requests','youth_access_requests','posts'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END
$$;

-- ── 7. Enable RLS and Open SELECT Policies ────────────────────────────────────

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'songs','prayer_book','announcements','todays_song_selection',
    'almanac_entries','timeline_events','congregation_members',
    'profiles','admin_requests','youth_access_requests','posts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_select_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_select_active', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);', tbl || '_select_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_admin_all', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl || '_admin_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_anon_write', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl || '_anon_write', tbl);
  END LOOP;
END
$$;

-- ── 8. RPCs for Admin/Youth Request Approvals ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_admin_request(target_request_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id
  FROM public.admin_requests
  WHERE id::text = target_request_id::text AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  UPDATE public.admin_requests
  SET status = 'approved', updated_at = now()
  WHERE id::text = target_request_id::text;

  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE id::text = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_admin_request(target_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  PERFORM public.approve_admin_request(target_request_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_admin_request(target_request_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  UPDATE public.admin_requests
  SET status = 'rejected', updated_at = now()
  WHERE id::text = target_request_id::text AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_admin_request(target_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  PERFORM public.reject_admin_request(target_request_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_youth_request(target_request_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id
  FROM public.youth_access_requests
  WHERE id::text = target_request_id::text AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  UPDATE public.youth_access_requests
  SET status = 'approved', updated_at = now()
  WHERE id::text = target_request_id::text;

  UPDATE public.profiles
  SET is_youth = true, updated_at = now()
  WHERE id::text = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_youth_request(target_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  PERFORM public.approve_youth_request(target_request_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_youth_request(target_request_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  UPDATE public.youth_access_requests
  SET status = 'rejected', updated_at = now()
  WHERE id::text = target_request_id::text AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_youth_request(target_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  PERFORM public.reject_youth_request(target_request_id::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_admin_request(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_admin_request(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_admin_request(text)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_admin_request(uuid)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_youth_request(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_youth_request(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_youth_request(text)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_youth_request(uuid)  TO anon, authenticated, service_role;

-- ── 9. Force Immediate Schema Reload in PostgREST ──────────────────────────────
NOTIFY pgrst, 'reload schema';
