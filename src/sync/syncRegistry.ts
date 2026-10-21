/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v1 Registry
 * ============================================================================
 * Maps each synced segment to its Supabase table, Dexie store, and merge rules.
 * Rules:
 *   1. Server wins, higher version wins.
 *   2. Ignore stale events (incoming version <= local version).
 *   3. Tombstones: on delete or deleted_at != null, remove from Dexie.
 * ============================================================================
 */

import {
  SyncedSegment,
  SyncRegistryEntry,
  SyncOp,
  BaseSyncedRecord,
  SongRecord,
  AboutChurchRecord,
  AnnouncementRecord,
  TodaySongSelectionRecord,
  PrayerBookRecord,
  AlmanacEntryRecord
} from './types';
import { syncDb } from './db';

/**
 * Standard merge algorithm: Server wins, higher version wins.
 * If op === 'delete' or deleted_at is set, returns null (indicating tombstone deletion).
 */
export async function defaultRecordMerge<T extends BaseSyncedRecord>(
  local: T | undefined,
  incoming: T,
  op: SyncOp
): Promise<T | null> {
  // Tombstone check
  if (op === 'delete' || incoming.deleted_at) {
    return null;
  }

  // If record exists locally, ensure higher version wins
  if (local) {
    const localVersion = Number(local.version) || 0;
    const incomingVersion = Number(incoming.version) || 0;

    if (incomingVersion < localVersion) {
      // Incoming is older than local state; ignore stale update
      return local;
    }

    if (incomingVersion === localVersion) {
      // Tie-breaker: server updated_at wins if newer
      const localTime = new Date(local.updated_at || 0).getTime();
      const incomingTime = new Date(incoming.updated_at || 0).getTime();
      if (incomingTime <= localTime) {
        return local;
      }
    }
  }

  return incoming;
}

export const syncRegistry: Record<SyncedSegment, SyncRegistryEntry> = {
  // ── 1. Songbook Segment
  songbook: {
    segment: 'songbook',
    table: 'songs',
    storeName: 'songs',
    primaryKey: 'id',
    merge: async (local: SongRecord | undefined, incoming: SongRecord, op: SyncOp) => {
      const merged = await defaultRecordMerge(local, incoming, op);
      if (merged) {
        merged.composer = merged.composer || merged.author || 'Church Hymnal';
        merged.author = merged.author || merged.composer;
        merged.book_reference = merged.book_reference || 'masihiGeet';
      }
      return merged;
    },
    onApplied: (item: SongRecord, op: SyncOp) => {
      if (typeof window !== 'undefined') {
        // Dispatch UI reactive notification without triggering page jump
        window.dispatchEvent(new CustomEvent('church:sync:songbook', { detail: { item, op } }));
        if (typeof (window as any).refreshSongBookCards === 'function') {
          try { (window as any).refreshSongBookCards((window as any).currentOpenSongBookKey); } catch (_) {}
        } else if (typeof (window as any).renderAdditionalSongsFromDexie === 'function') {
          try { (window as any).renderAdditionalSongsFromDexie(); } catch (_) {}
        }

        // Live update active lyrics view if currently open
        const curOpen = (window as any).currentOpenSong;
        if (curOpen && (curOpen.id === item.id || (curOpen.title && curOpen.title === item.title))) {
          if (op === 'delete') {
            if (typeof (window as any).showToast === 'function') {
              (window as any).showToast('The open hymn was removed on another device');
            }
          } else {
            Object.assign(curOpen, item);
            try {
              const titleEl = document.querySelector('.song-lyrics-title');
              if (titleEl) titleEl.textContent = item.title;
              const bodyEl = document.querySelector('.song-lyrics-body');
              if (bodyEl) bodyEl.innerHTML = (item.lyrics || '').replace(/\n/g, '<br>');
            } catch (_) {}
          }
        }
      }
    }
  },

  // ── 2. About Church Segment
  about_church: {
    segment: 'about_church',
    table: 'about_church',
    storeName: 'about_church',
    primaryKey: 'id',
    merge: async (local: AboutChurchRecord | undefined, incoming: AboutChurchRecord, op: SyncOp) => {
      return defaultRecordMerge(local, incoming, op);
    },
    onApplied: (item: AboutChurchRecord, op: SyncOp) => {
      if (typeof window !== 'undefined') {
        try {
          const profileData = {
            churchName: item.church_name,
            subtitle: item.subtitle,
            diocese: item.diocese,
            heritageTag: item.heritage_tag,
            pastorName: item.pastor_name,
            pastorBadge: item.pastor_badge,
            pastorChurch: item.pastor_church,
            pastorAffiliation: item.pastor_affiliation,
            pastorDesc: item.pastor_desc,
            pastorQuote: item.pastor_quote,
            pastorPhoto: item.pastor_photo,
            photos: item.photos || [],
            historyBadge: item.history_badge,
            historySummary: item.history_summary,
            ...(item.raw_data || {})
          };
          localStorage.setItem('sanctuary_about_church_data', JSON.stringify(profileData));
        } catch (_) {}

        window.dispatchEvent(new CustomEvent('church:sync:about_church', { detail: { item, op } }));
        if (typeof (window as any).renderAboutChurch === 'function') {
          try { (window as any).renderAboutChurch(); } catch (_) {}
        }
        if (typeof (window as any).renderAboutChurchPhotoSlider === 'function') {
          try { (window as any).renderAboutChurchPhotoSlider(); } catch (_) {}
        }
      }
    }
  },

  // ── 3. Announcements Segment
  announcements: {
    segment: 'announcements',
    table: 'announcements',
    storeName: 'announcements',
    primaryKey: 'id',
    merge: async (local: AnnouncementRecord | undefined, incoming: AnnouncementRecord, op: SyncOp) => {
      return defaultRecordMerge(local, incoming, op);
    },
    onApplied: (item: AnnouncementRecord, op: SyncOp) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('church:sync:announcements', { detail: { item, op } }));
        try {
          const listKey = 'sanctuary_announcements_v3';
          let list = JSON.parse(localStorage.getItem(listKey) || '[]');
          if (!Array.isArray(list)) list = [];
          if (op === 'delete') {
            list = list.filter((x: any) => String(x.id) !== String(item.id));
          } else {
            const idx = list.findIndex((x: any) => String(x.id) === String(item.id));
            const uiItem = {
              id: item.id,
              date: item.date || item.title || '',
              details: item.body || item.details || '',
              prayerBy: item.prayer_by || '',
              prayerDate: item.prayer_date || '',
              createdAt: item.updated_at,
              updatedAt: item.updated_at
            };
            if (idx >= 0) list[idx] = { ...list[idx], ...uiItem };
            else list.unshift(uiItem);
          }
          localStorage.setItem(listKey, JSON.stringify(list));
          if (list.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(list[0]));
          else localStorage.removeItem('sanctuary_announcement_v2');

          if (typeof (window as any).currentAnnouncementsList !== 'undefined') {
            (window as any).currentAnnouncementsList = list;
          }
          if (typeof (window as any).renderAnnouncementHomeUI === 'function') {
            try { (window as any).renderAnnouncementHomeUI(); } catch (_) {}
          }
          if (typeof (window as any).renderAdminAnnouncementsList === 'function') {
            try { (window as any).renderAdminAnnouncementsList(); } catch (_) {}
          }
        } catch (_) {}
      }
    }
  },

  // ── 4. Today's Song Selection Segment (Single Row Per Date)
  today_song_selection: {
    segment: 'today_song_selection',
    table: 'todays_song_selection',
    storeName: 'todays_song_selection',
    primaryKey: 'id',
    merge: async (local: TodaySongSelectionRecord | undefined, incoming: TodaySongSelectionRecord, op: SyncOp) => {
      return defaultRecordMerge(local, incoming, op);
    },
    onApplied: (item: TodaySongSelectionRecord, op: SyncOp) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('church:sync:today_song_selection', { detail: { item, op } }));
        try {
          const songsList = Array.isArray(item.songs) ? item.songs : [];
          localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(songsList));
          if (typeof (window as any).currentTodaySongs !== 'undefined') {
            (window as any).currentTodaySongs = songsList;
          }
          if (typeof (window as any).renderTodaySongHomeUI === 'function') {
            try { (window as any).renderTodaySongHomeUI(); } catch (_) {}
          }
          if (typeof (window as any).renderAdminSelectedList === 'function') {
            try { (window as any).renderAdminSelectedList(); } catch (_) {}
          }
        } catch (_) {}
      }
    }
  },

  // ── 5. Prayer Books Segment
  prayer_books: {
    segment: 'prayer_books',
    table: 'prayer_books',
    storeName: 'prayer_books',
    primaryKey: 'id',
    merge: async (local: PrayerBookRecord | undefined, incoming: PrayerBookRecord, op: SyncOp) => {
      return defaultRecordMerge(local, incoming, op);
    },
    onApplied: (item: PrayerBookRecord, op: SyncOp) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('church:sync:prayer_books', { detail: { item, op } }));
        if (typeof (window as any).renderPrayerBookContent === 'function') {
          try { (window as any).renderPrayerBookContent(); } catch (_) {}
        }
      }
    }
  },

  // ── 6. Almanac Segment (Supports Atomic Batch Merge)
  almanac: {
    segment: 'almanac',
    table: 'almanac_entries',
    storeName: 'almanac_entries',
    primaryKey: 'id',
    merge: async (local: AlmanacEntryRecord | undefined, incoming: AlmanacEntryRecord, op: SyncOp) => {
      return defaultRecordMerge(local, incoming, op);
    },
    onApplied: (item: AlmanacEntryRecord, op: SyncOp) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('church:sync:almanac', { detail: { item, op } }));
        try {
          if (!(window as any).CHURCH_DATA) (window as any).CHURCH_DATA = {};
          if (!(window as any).CHURCH_DATA.almanacDatabase) (window as any).CHURCH_DATA.almanacDatabase = {};
          if (op === 'delete') {
            delete (window as any).CHURCH_DATA.almanacDatabase[item.date_key];
          } else {
            let parsedDetails = null;
            if (item.details) {
              try {
                parsedDetails = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
              } catch (_) {}
            }
            (window as any).CHURCH_DATA.almanacDatabase[item.date_key] = {
              ...((window as any).CHURCH_DATA.almanacDatabase[item.date_key] || {}),
              ...(parsedDetails || { dateKey: item.date_key, year: item.year, theme: item.title, color: item.liturgical_color })
            };
          }
          localStorage.setItem('sanctuary_custom_almanac', JSON.stringify((window as any).CHURCH_DATA.almanacDatabase));
          if (typeof (window as any).renderAlmanacModule === 'function') {
            try { (window as any).renderAlmanacModule(); } catch (_) {}
          }
        } catch (_) {}
      }
    }
  }
};
