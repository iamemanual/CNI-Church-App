-- ==============================================================================
-- ALL SAINTS' CHURCH — Master Sync Engine v1 Database Migration
-- Synced Segments: songbook, about_church, announcements, today_song_selection,
--                  prayer_books, almanac
-- Architecture: Single Author (Super Admin), Infinite Readers (Congregation)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Ensure / Update All 6 Synced Tables
-- Every table has:
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   version int NOT NULL DEFAULT 1
--   updated_at timestamptz NOT NULL DEFAULT now()
--   updated_by uuid NULL
--   deleted_at timestamptz NULL
-- ==============================================================================

-- 2.1 Segment: songbook -> public.songs
CREATE TABLE IF NOT EXISTS public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_reference text,
  song_number text,
  title text NOT NULL,
  category text DEFAULT 'hymn',
  lyrics text,
  composer text,
  author text,
  key_signature text,
  tempo text,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'id' AND data_type IN ('text', 'character varying')) THEN
    ALTER TABLE public.songs ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.songs ALTER COLUMN id TYPE uuid USING (
      CASE 
        WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
        ELSE md5(id)::uuid
      END
    );
    ALTER TABLE public.songs ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_songs_active ON public.songs (updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_songs_book_number ON public.songs (book_reference, song_number);

-- 2.2 Segment: about_church -> public.about_church
CREATE TABLE IF NOT EXISTS public.about_church (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_name text,
  subtitle text,
  diocese text,
  heritage_tag text,
  pastor_name text,
  pastor_badge text,
  pastor_church text,
  pastor_affiliation text,
  pastor_desc text,
  pastor_quote text,
  pastor_photo text,
  photos jsonb DEFAULT '[]'::jsonb,
  history_badge text,
  history_summary text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_about_church_active ON public.about_church (updated_at DESC) WHERE deleted_at IS NULL;

-- 2.3 Segment: announcements -> public.announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  body text,
  priority int DEFAULT 1,
  is_active boolean DEFAULT true,
  date text,
  prayer_by text,
  prayer_date text,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'id' AND data_type IN ('text', 'character varying')) THEN
    ALTER TABLE public.announcements ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.announcements ALTER COLUMN id TYPE uuid USING (
      CASE 
        WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
        ELSE md5(id)::uuid
      END
    );
    ALTER TABLE public.announcements ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements (priority DESC, updated_at DESC) WHERE deleted_at IS NULL;

-- 2.4 Segment: today_song_selection -> public.todays_song_selection
CREATE TABLE IF NOT EXISTS public.todays_song_selection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key text NOT NULL,
  song_ids jsonb DEFAULT '[]'::jsonb,
  songs jsonb DEFAULT '[]'::jsonb,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'todays_song_selection' AND column_name = 'id' AND data_type IN ('text', 'character varying')) THEN
    ALTER TABLE public.todays_song_selection ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.todays_song_selection ALTER COLUMN id TYPE uuid USING (
      CASE 
        WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
        ELSE md5(id)::uuid
      END
    );
    ALTER TABLE public.todays_song_selection ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.todays_song_selection ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_todays_song_date ON public.todays_song_selection (date_key) WHERE deleted_at IS NULL;

-- 2.5 Segment: prayer_books -> public.prayer_books
CREATE TABLE IF NOT EXISTS public.prayer_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id text,
  category text,
  title text NOT NULL,
  content text,
  sections jsonb DEFAULT '[]'::jsonb,
  sort_order int DEFAULT 0,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prayer_book') THEN
    IF NOT EXISTS (SELECT 1 FROM public.prayer_books LIMIT 1) THEN
      INSERT INTO public.prayer_books (id, book_id, category, title, content, sort_order, updated_at)
      SELECT 
        CASE 
          WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
          ELSE md5(id)::uuid
        END,
        category, category, title, content, COALESCE(sort_order, 0), COALESCE(updated_at, now())
      FROM public.prayer_book
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'prayer_books' AND column_name = 'id' AND data_type IN ('text', 'character varying')) THEN
    ALTER TABLE public.prayer_books ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.prayer_books ALTER COLUMN id TYPE uuid USING (
      CASE 
        WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
        ELSE md5(id)::uuid
      END
    );
    ALTER TABLE public.prayer_books ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

ALTER TABLE public.prayer_books ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;
ALTER TABLE public.prayer_books ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.prayer_books ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.prayer_books ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_prayer_books_active ON public.prayer_books (sort_order ASC, updated_at DESC) WHERE deleted_at IS NULL;

-- 2.6 Segment: almanac -> public.almanac_entries
CREATE TABLE IF NOT EXISTS public.almanac_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key text NOT NULL UNIQUE,
  year int,
  title text,
  liturgical_color text,
  details jsonb,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'almanac_entries' AND column_name = 'id') THEN
    ALTER TABLE public.almanac_entries ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE public.almanac_entries SET id = md5(date_key)::uuid WHERE id IS NULL;
    ALTER TABLE public.almanac_entries DROP CONSTRAINT IF EXISTS almanac_entries_pkey;
    ALTER TABLE public.almanac_entries ADD PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.almanac_entries ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_almanac_date_key ON public.almanac_entries (date_key) WHERE deleted_at IS NULL;

-- ==============================================================================
-- 3. Sync Changes Journal Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sync_changes (
  seq bigserial PRIMARY KEY,
  segment text NOT NULL,
  row_id uuid NOT NULL,
  op text NOT NULL, -- 'insert', 'update', 'delete'
  version int NOT NULL DEFAULT 1,
  changed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_changes_seq ON public.sync_changes (seq ASC);
CREATE INDEX IF NOT EXISTS idx_sync_changes_segment_seq ON public.sync_changes (segment, seq ASC);
CREATE INDEX IF NOT EXISTS idx_sync_changes_changed_at ON public.sync_changes (changed_at DESC);

-- ==============================================================================
-- 4. Triggers for Automatic Versioning & Journal Logging
-- ==============================================================================

-- Trigger function: runs BEFORE INSERT/UPDATE to advance version & updated_at
CREATE OR REPLACE FUNCTION public.fn_sync_record_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.version := COALESCE(NEW.version, 1);
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    IF NEW.updated_by IS NULL THEN
      NEW.updated_by := auth.uid();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    NEW.updated_at := now();
    IF NEW.updated_by IS NULL OR NEW.updated_by = OLD.updated_by THEN
      NEW.updated_by := COALESCE(auth.uid(), OLD.updated_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: runs AFTER INSERT/UPDATE/DELETE to log into sync_changes
CREATE OR REPLACE FUNCTION public.fn_sync_changes_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_segment text := TG_ARGV[0];
  v_op text;
  v_row_id uuid;
  v_version int;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_op := 'delete';
    v_row_id := OLD.id;
    v_version := COALESCE(OLD.version, 1);
    v_payload := jsonb_build_object('id', OLD.id);
  ELSIF NEW.deleted_at IS NOT NULL AND (OLD IS NULL OR OLD.deleted_at IS NULL) THEN
    v_op := 'delete';
    v_row_id := NEW.id;
    v_version := COALESCE(NEW.version, 1);
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_op := 'insert';
    v_row_id := NEW.id;
    v_version := COALESCE(NEW.version, 1);
    v_payload := to_jsonb(NEW);
  ELSE
    v_op := 'update';
    v_row_id := NEW.id;
    v_version := COALESCE(NEW.version, 1);
    v_payload := to_jsonb(NEW);
  END IF;

  INSERT INTO public.sync_changes (segment, row_id, op, version, changed_at, payload)
  VALUES (v_segment, v_row_id, v_op, v_version, now(), v_payload);

  RETURN NULL;
END;
$$;

-- 4.1 songbook triggers
DROP TRIGGER IF EXISTS trg_songs_before ON public.songs;
CREATE TRIGGER trg_songs_before
  BEFORE INSERT OR UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_record_before();

DROP TRIGGER IF EXISTS trg_songs_sync ON public.songs;
CREATE TRIGGER trg_songs_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_changes_trigger('songbook');

-- 4.2 about_church triggers
DROP TRIGGER IF EXISTS trg_about_church_before ON public.about_church;
CREATE TRIGGER trg_about_church_before
  BEFORE INSERT OR UPDATE ON public.about_church
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_record_before();

DROP TRIGGER IF EXISTS trg_about_church_sync ON public.about_church;
CREATE TRIGGER trg_about_church_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.about_church
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_changes_trigger('about_church');

-- 4.3 announcements triggers
DROP TRIGGER IF EXISTS trg_announcements_before ON public.announcements;
CREATE TRIGGER trg_announcements_before
  BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_record_before();

DROP TRIGGER IF EXISTS trg_announcements_sync ON public.announcements;
CREATE TRIGGER trg_announcements_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_changes_trigger('announcements');

-- 4.4 today_song_selection triggers
DROP TRIGGER IF EXISTS trg_today_song_before ON public.todays_song_selection;
CREATE TRIGGER trg_today_song_before
  BEFORE INSERT OR UPDATE ON public.todays_song_selection
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_record_before();

DROP TRIGGER IF EXISTS trg_today_song_sync ON public.todays_song_selection;
CREATE TRIGGER trg_today_song_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.todays_song_selection
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_changes_trigger('today_song_selection');

-- 4.5 prayer_books triggers
DROP TRIGGER IF EXISTS trg_prayer_books_before ON public.prayer_books;
CREATE TRIGGER trg_prayer_books_before
  BEFORE INSERT OR UPDATE ON public.prayer_books
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_record_before();

DROP TRIGGER IF EXISTS trg_prayer_books_sync ON public.prayer_books;
CREATE TRIGGER trg_prayer_books_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.prayer_books
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_changes_trigger('prayer_books');

-- 4.6 almanac triggers
DROP TRIGGER IF EXISTS trg_almanac_before ON public.almanac_entries;
CREATE TRIGGER trg_almanac_before
  BEFORE INSERT OR UPDATE ON public.almanac_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_record_before();

DROP TRIGGER IF EXISTS trg_almanac_sync ON public.almanac_entries;
CREATE TRIGGER trg_almanac_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.almanac_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_changes_trigger('almanac');

-- ==============================================================================
-- 5. Realtime Publication & Replica Identity
-- ==============================================================================
ALTER TABLE public.sync_changes REPLICA IDENTITY FULL;
ALTER TABLE public.songs REPLICA IDENTITY FULL;
ALTER TABLE public.about_church REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.todays_song_selection REPLICA IDENTITY FULL;
ALTER TABLE public.prayer_books REPLICA IDENTITY FULL;
ALTER TABLE public.almanac_entries REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_changes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.songs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.about_church; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.todays_song_selection; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_books; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.almanac_entries; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ==============================================================================
-- 6. Role-Based Security & RLS Policies
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(
    (SELECT lower(auth.jwt() ->> 'email') = 'emanualmridha2@gmail.com'),
    false
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) 
      AND (role = 'superadmin' OR lower(email) = 'emanualmridha2@gmail.com')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) 
      AND role IN ('admin', 'superadmin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO anon, authenticated;

-- Grants for API exposure
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable RLS on all 7 tables
ALTER TABLE public.sync_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_church ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todays_song_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almanac_entries ENABLE ROW LEVEL SECURITY;

-- 6.1 sync_changes: everyone can read to pull delta
DROP POLICY IF EXISTS "sync_changes_select_all" ON public.sync_changes;
CREATE POLICY "sync_changes_select_all" ON public.sync_changes
  FOR SELECT TO anon, authenticated USING (true);

-- 6.2 songs policies
DROP POLICY IF EXISTS "songs_select_active" ON public.songs;
CREATE POLICY "songs_select_active" ON public.songs
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "songs_insert_admin" ON public.songs;
CREATE POLICY "songs_insert_admin" ON public.songs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "songs_update_admin" ON public.songs;
CREATE POLICY "songs_update_admin" ON public.songs
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super_admin())
  WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "songs_delete_admin" ON public.songs;
CREATE POLICY "songs_delete_admin" ON public.songs
  FOR DELETE TO authenticated USING (public.is_admin_or_super_admin());

-- 6.3 about_church policies
DROP POLICY IF EXISTS "about_church_select_active" ON public.about_church;
CREATE POLICY "about_church_select_active" ON public.about_church
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "about_church_insert_admin" ON public.about_church;
CREATE POLICY "about_church_insert_admin" ON public.about_church
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "about_church_update_admin" ON public.about_church;
CREATE POLICY "about_church_update_admin" ON public.about_church
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super_admin())
  WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "about_church_delete_admin" ON public.about_church;
CREATE POLICY "about_church_delete_admin" ON public.about_church
  FOR DELETE TO authenticated USING (public.is_admin_or_super_admin());

-- 6.4 announcements policies
DROP POLICY IF EXISTS "announcements_select_active" ON public.announcements;
CREATE POLICY "announcements_select_active" ON public.announcements
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "announcements_insert_admin" ON public.announcements;
CREATE POLICY "announcements_insert_admin" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "announcements_update_admin" ON public.announcements;
CREATE POLICY "announcements_update_admin" ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super_admin())
  WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "announcements_delete_admin" ON public.announcements;
CREATE POLICY "announcements_delete_admin" ON public.announcements
  FOR DELETE TO authenticated USING (public.is_admin_or_super_admin());

-- 6.5 todays_song_selection policies
DROP POLICY IF EXISTS "todays_song_select_active" ON public.todays_song_selection;
CREATE POLICY "todays_song_select_active" ON public.todays_song_selection
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "todays_song_insert_admin" ON public.todays_song_selection;
CREATE POLICY "todays_song_insert_admin" ON public.todays_song_selection
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "todays_song_update_admin" ON public.todays_song_selection;
CREATE POLICY "todays_song_update_admin" ON public.todays_song_selection
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super_admin())
  WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "todays_song_delete_admin" ON public.todays_song_selection;
CREATE POLICY "todays_song_delete_admin" ON public.todays_song_selection
  FOR DELETE TO authenticated USING (public.is_admin_or_super_admin());

-- 6.6 prayer_books policies
DROP POLICY IF EXISTS "prayer_books_select_active" ON public.prayer_books;
CREATE POLICY "prayer_books_select_active" ON public.prayer_books
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "prayer_books_insert_admin" ON public.prayer_books;
CREATE POLICY "prayer_books_insert_admin" ON public.prayer_books
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "prayer_books_update_admin" ON public.prayer_books;
CREATE POLICY "prayer_books_update_admin" ON public.prayer_books
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super_admin())
  WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "prayer_books_delete_admin" ON public.prayer_books;
CREATE POLICY "prayer_books_delete_admin" ON public.prayer_books
  FOR DELETE TO authenticated USING (public.is_admin_or_super_admin());

-- 6.7 almanac_entries policies
DROP POLICY IF EXISTS "almanac_entries_select_active" ON public.almanac_entries;
CREATE POLICY "almanac_entries_select_active" ON public.almanac_entries
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "almanac_entries_insert_admin" ON public.almanac_entries;
CREATE POLICY "almanac_entries_insert_admin" ON public.almanac_entries
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "almanac_entries_update_admin" ON public.almanac_entries;
CREATE POLICY "almanac_entries_update_admin" ON public.almanac_entries
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super_admin())
  WITH CHECK (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "almanac_entries_delete_admin" ON public.almanac_entries;
CREATE POLICY "almanac_entries_delete_admin" ON public.almanac_entries
  FOR DELETE TO authenticated USING (public.is_admin_or_super_admin());

-- Seed initial about_church profile row if empty
INSERT INTO public.about_church (
  id,
  church_name,
  subtitle,
  diocese,
  heritage_tag,
  pastor_name,
  pastor_badge,
  pastor_church,
  pastor_affiliation,
  pastor_desc,
  pastor_quote,
  pastor_photo,
  photos,
  history_badge,
  history_summary
)
SELECT 
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'CNI Church of North India',
  'Diocese of Patna',
  'Andaman & Nicobar Islands',
  'Heritage Sanctuary Established',
  'Rev. Linda',
  'Presbyter-in-Charge',
  'All Saints'' Church, Prothrapur',
  'Church of North India (CNI)',
  'Serving God and the congregation with faith.',
  '"Shepherd the flock of God which is among you, serving as overseers, not by compulsion but willingly." — 1 Peter 5:2',
  '',
  '[{"url":"church_bg.jpg","caption":"All Saints'' Church Sanctuary","sub":"Main Church Building & Sacred Grounds • Prothrapur"}]'::jsonb,
  'Century of Grace',
  'Established under the Diocese, serving believers across the islands.'
WHERE NOT EXISTS (SELECT 1 FROM public.about_church);
