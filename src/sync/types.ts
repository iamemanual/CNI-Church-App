/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v1 Types
 * ============================================================================
 */

export type SyncedSegment =
  | 'songbook'
  | 'about_church'
  | 'announcements'
  | 'today_song_selection'
  | 'prayer_books'
  | 'almanac';

export type SyncOp = 'insert' | 'update' | 'delete';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface BaseSyncedRecord {
  id: string; // uuid
  version: number;
  updated_at: string;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface SongRecord extends BaseSyncedRecord {
  book_reference?: string;
  song_number?: string;
  title: string;
  category?: string;
  lyrics?: string;
  composer?: string;
  author?: string;
  key_signature?: string;
  tempo?: string;
}

export interface AboutChurchRecord extends BaseSyncedRecord {
  church_name?: string;
  subtitle?: string;
  diocese?: string;
  heritage_tag?: string;
  pastor_name?: string;
  pastor_badge?: string;
  pastor_church?: string;
  pastor_affiliation?: string;
  pastor_desc?: string;
  pastor_quote?: string;
  pastor_photo?: string;
  photos?: Array<{ url: string; caption?: string; sub?: string }>;
  history_badge?: string;
  history_summary?: string;
  raw_data?: Record<string, any>;
}

export interface AnnouncementRecord extends BaseSyncedRecord {
  title?: string;
  body?: string;
  details?: string;
  priority?: number;
  is_active?: boolean;
  date?: string;
  prayer_by?: string;
  prayer_date?: string;
}

export interface TodaySongSelectionRecord extends BaseSyncedRecord {
  date_key: string;
  song_ids: string[];
  songs: any[];
}

export interface PrayerBookRecord extends BaseSyncedRecord {
  book_id?: string;
  category?: string;
  title: string;
  content?: string;
  sections?: any[];
  sort_order?: number;
}

export interface AlmanacEntryRecord extends BaseSyncedRecord {
  date_key: string;
  year?: number;
  title?: string;
  liturgical_color?: string;
  details?: any;
}

export interface SyncChangeRecord {
  seq: number;
  segment: SyncedSegment;
  row_id: string;
  op: SyncOp;
  version: number;
  changed_at: string;
  payload?: any;
}

export interface SyncOutboxItem {
  id: string;
  segment: SyncedSegment;
  op: SyncOp;
  payload: any;
  created_at: number;
  retry_count: number;
  error?: string;
}

export interface SyncRegistryEntry<T extends BaseSyncedRecord = any> {
  segment: SyncedSegment;
  table: string;
  storeName: string;
  primaryKey: string;
  merge: (local: T | undefined, incoming: T, op: SyncOp) => Promise<T | null>;
  onApplied?: (item: T, op: SyncOp) => void;
}

export interface SyncStateEvent {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error?: Error | null;
  pendingOutboxCount: number;
}
