/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v1 Dexie Database Layer
 * ============================================================================
 */

import Dexie, { Table } from 'dexie';
import {
  SongRecord,
  AboutChurchRecord,
  AnnouncementRecord,
  TodaySongSelectionRecord,
  PrayerBookRecord,
  AlmanacEntryRecord,
  SyncOutboxItem
} from './types';

export interface SyncMetaItem {
  key: string;
  value: any;
  updated_at: string;
}

export class SyncEngineDB extends Dexie {
  songs!: Table<SongRecord, string>;
  about_church!: Table<AboutChurchRecord, string>;
  announcements!: Table<AnnouncementRecord, string>;
  todays_song_selection!: Table<TodaySongSelectionRecord, string>;
  prayer_books!: Table<PrayerBookRecord, string>;
  almanac_entries!: Table<AlmanacEntryRecord, string>;
  sync_meta!: Table<SyncMetaItem, string>;
  sync_outbox!: Table<SyncOutboxItem, string>;

  constructor() {
    super('ChurchCompanionSyncDB');

    this.version(1).stores({
      songs: 'id, book_reference, song_number, title, category, version, updated_at, deleted_at',
      about_church: 'id, version, updated_at, deleted_at',
      announcements: 'id, priority, is_active, version, updated_at, deleted_at',
      todays_song_selection: 'id, date_key, version, updated_at, deleted_at',
      prayer_books: 'id, book_id, category, sort_order, version, updated_at, deleted_at',
      almanac_entries: 'id, date_key, year, version, updated_at, deleted_at',
      sync_meta: 'key',
      sync_outbox: 'id, segment, op, created_at, retry_count'
    });
  }
}

// Global singleton instance
export const syncDb = new SyncEngineDB();
