/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v2 Runtime
 * ============================================================================
 * Unified Real-Time Sync Engine across all 11 synced data segments:
 *   1. songbook (table: songs)
 *   2. about_church (table: prayer_book, row: about_church_profile)
 *   3. announcements (table: announcements)
 *   4. today_song_selection (table: todays_song_selection)
 *   5. prayer_books (table: prayer_book)
 *   6. almanac             (table: almanac_entries)
 *   7. timeline            (table: timeline_events)
 *   8. congregation_members(table: congregation_members)
 *   9. profiles/roles      (table: profiles)
 *   10. requests           (tables: admin_requests, youth_access_requests)
 *   11. posts              (table: posts)
 *
 * v2 Improvements:
 *   - Anonymous sign-in before any realtime subscription (RLS-safe for all)
 *   - setAuth called on TOKEN_REFRESHED / SIGNED_IN — sessions never go stale
 *   - Watchdog: force-reconnect if 60 s of silence while SUBSCRIBED
 *   - Per-table lastSyncedAt delta by updated_at (no sync_changes dependency)
 *   - All 11 segments in single unified channel; no duplicate per-table channels
 *   - Dexie v6 schema: lastSyncedAt store + updated_at indexes on request tables
 *   - supabase-sync.js per-table _initRealtime suppressed via window flag
 * ============================================================================
 */

(function () {
  'use strict';

  // ── 1. Unified Shared Dexie Database
  function getSharedDexie() {
    if (typeof window !== 'undefined') {
      if (window.churchDexieDb) return window.churchDexieDb;
      if (window.ChurchSync && window.ChurchSync.db) return window.ChurchSync.db;
    }
    if (typeof Dexie !== 'undefined') {
      try {
        const db = new Dexie('ChurchCompanionOfflineDB');
        db.version(5).stores({
          session: "id",
          profiles: "id, email, role, is_youth",
          congregation_members: "id, display_name, updated_at",
          prayer_book: "id, category, sort_order, updated_at",
          custom_songs: "id, book_reference, song_number, title, category, lyrics",
          custom_timeline: "id, year, title, sort_order",
          songs: "id, title, category, song_number, updated_at, deleted_at",
          song_book: "id, title, category, song_number, updated_at, deleted_at",
          timeline_events: "id, year, sort_order, updated_at",
          todays_song_selection: "id, date_key, updated_at",
          announcements: "id, priority, is_active, updated_at",
          almanac_entries: "date_key, year, updated_at",
          chat_messages: "id, client_message_id, room_id, sender_id, created_at, reply_to_message_id, deleted_at",
          message_deliveries: "id, [message_id+user_id], message_id, user_id, delivered_at",
          message_reads: "id, [message_id+user_id], message_id, user_id, read_at",
          message_reactions: "id, [message_id+user_id], message_id, user_id, emoji, created_at",
          chat_outbox: "client_message_id, room_id, status, retry_count, created_at",
          admin_outbox: "id, table, op, created_at",
          admin_requests: "id, user_id, status, requested_at",
          youth_access_requests: "id, user_id, status, requested_at",
          posts: "id, sort_order, updated_at",
          audit_log: "id, action, created_at",
          sync_meta: "key",
          sync_outbox: "id, segment, op, created_at, retry_count"
        });
        // v6: per-table lastSyncedAt delta tracking + updated_at on request tables
        db.version(6).stores({
          session: "id",
          profiles: "id, email, role, is_youth, updated_at",
          congregation_members: "id, display_name, updated_at",
          prayer_book: "id, category, sort_order, updated_at",
          custom_songs: "id, book_reference, song_number, title, category, lyrics",
          custom_timeline: "id, year, title, sort_order",
          songs: "id, title, category, song_number, updated_at, deleted_at",
          song_book: "id, title, category, song_number, updated_at, deleted_at",
          timeline_events: "id, year, sort_order, updated_at, deleted_at",
          todays_song_selection: "id, date_key, updated_at",
          announcements: "id, priority, is_active, updated_at",
          almanac_entries: "date_key, year, updated_at",
          chat_messages: "id, client_message_id, room_id, sender_id, created_at, reply_to_message_id, deleted_at",
          message_deliveries: "id, [message_id+user_id], message_id, user_id, delivered_at",
          message_reads: "id, [message_id+user_id], message_id, user_id, read_at",
          message_reactions: "id, [message_id+user_id], message_id, user_id, emoji, created_at",
          chat_outbox: "client_message_id, room_id, status, retry_count, created_at",
          admin_outbox: "id, table, op, created_at",
          admin_requests: "id, user_id, status, updated_at",
          youth_access_requests: "id, user_id, status, updated_at",
          posts: "id, sort_order, updated_at, deleted_at",
          audit_log: "id, action, created_at",
          sync_meta: "key",
          sync_outbox: "id, segment, op, created_at, retry_count",
          lastSyncedAt: "table"
        });
        if (typeof window !== 'undefined') window.churchDexieDb = db;
        return db;
      } catch (e) {
        console.warn('[SyncEngine] Dexie init error:', e);
      }
    }
    return null;
  }

  const syncDb = getSharedDexie();

  // ── 2. Role Gating Helpers
  function getActiveSession() {
    if (typeof window !== 'undefined' && window.currentAuthSession) {
      return window.currentAuthSession;
    }
    try {
      const stored = localStorage.getItem('sanctuary_auth_session_v1');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return null;
  }

  function canWrite() {
    // Universal sync mode: allow any user action triggered via the app to synchronize across devices
    return true;
  }

  function isSuperAdmin() {
    const session = getActiveSession();
    if (!session) return true;
    const email = (session.email || '').toLowerCase().trim();
    const role = (session.role || '').toLowerCase().trim();
    return email === 'emanualmridha2@gmail.com' || role === 'superadmin';
  }

  // Direct UI DOM Fallback Helpers
  function _updateAnnouncementDOMFallback(list) {
    try {
      if (!Array.isArray(list)) {
        try {
          list = JSON.parse(localStorage.getItem('sanctuary_announcements_v3') || '[]');
        } catch (_) { list = []; }
      }
      let bl = [];
      try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_announcements_blacklist') || '[]'); } catch (_) { bl = []; }
      const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
      const activeList = (Array.isArray(list) ? list : []).filter(function (a) { return a && !blSet.has(String(a.id)); });
      const count = activeList.length;

      const subtitleEl = document.getElementById('homeAnnouncementSubtitle');
      if (subtitleEl) {
        subtitleEl.textContent = count === 0 ? 'No Notices' : (count + ' New Notice' + (count === 1 ? '' : 's'));
      }
      const pillBtn = document.getElementById('announcementPillBtn');
      const dotEl = pillBtn ? pillBtn.querySelector('.pill-dot') : null;
      if (dotEl) {
        dotEl.style.display = count > 0 ? '' : 'none';
      }
    } catch (_) {}
  }

  function _updateTodaySongDOMFallback(songs) {
    try {
      if (!Array.isArray(songs)) {
        try {
          songs = JSON.parse(localStorage.getItem('sanctuary_today_songs_v2') || '[]');
        } catch (_) { songs = []; }
      }
      const activeSongs = Array.isArray(songs) ? songs : [];
      const subtitleEl = document.getElementById('homeTodaySongSubtitle');
      if (subtitleEl) {
        if (activeSongs.length === 0) {
          subtitleEl.textContent = 'No Songs Selected';
        } else if (activeSongs.length === 1) {
          subtitleEl.textContent = activeSongs[0].title || "Today's Hymn";
        } else {
          subtitleEl.textContent = activeSongs.length + ' Selected Songs';
        }
      }
    } catch (_) {}
  }

  // ── 3. Merge Algorithm (Server wins, higher version wins, tombstones delete)
  function defaultRecordMerge(local, incoming, op) {
    if (op === 'delete' || (incoming && incoming.deleted_at)) {
      return null; // Tombstone: delete from local store
    }
    if (local) {
      const localVersion = Number(local.version) || 0;
      const incomingVersion = Number(incoming.version) || 0;
      if (incomingVersion < localVersion) {
        return local; // Incoming is stale; keep local
      }
      if (incomingVersion === localVersion) {
        const localTime = new Date(local.updated_at || 0).getTime();
        const incomingTime = new Date(incoming.updated_at || 0).getTime();
        if (incomingTime <= localTime) {
          return local;
        }
      }
    }
    return incoming;
  }

  // ── 4. Registry Configuration for the Core Synced Segments
  const syncRegistry = {
    // 1. songbook
    songbook: {
      segment: 'songbook',
      table: 'songs',
      storeName: 'songs',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        const merged = defaultRecordMerge(local, incoming, op);
        if (merged) {
          merged.composer = merged.composer || merged.author || 'Church Hymnal';
          merged.author = merged.author || merged.composer;
          merged.book_reference = merged.book_reference || 'masihiGeet';
        }
        return merged;
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:songbook', { detail: { item, op } }));

        // Purge local blacklist & localStorage backups on delete so deleted songs don't resurrect
        if (op === 'delete' && item) {
          try {
            const sId = item.id || item.date_key;
            const sTitle = item.title;

            const blKey = 'sanctuary_deleted_songs_blacklist';
            let bl = [];
            try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
            if (!Array.isArray(bl)) bl = [];
            const blSet = new Set(bl.map(x => String(x).toLowerCase().trim()));
            if (sId) blSet.add(String(sId).toLowerCase().trim());
            if (sTitle) blSet.add(String(sTitle).toLowerCase().trim());
            localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));

            ['sanctuary_custom_songs_backup', 'sanctuary_imported_songs'].forEach(key => {
              try {
                let list = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(list)) {
                  list = list.filter(s => s && s.id !== sId && (!sTitle || !s.title || String(s.title).toLowerCase().trim() !== String(sTitle).toLowerCase().trim()));
                  localStorage.setItem(key, JSON.stringify(list));
                }
              } catch (_) {}
            });

            if (Array.isArray(window.currentSongList)) {
              window.currentSongList = window.currentSongList.filter(s => s && s.id !== sId && (!sTitle || !s.title || String(s.title).toLowerCase().trim() !== String(sTitle).toLowerCase().trim()));
            }

            if (window.churchDexieDb) {
              if (sId) {
                if (window.churchDexieDb.songs) window.churchDexieDb.songs.delete(sId).catch(function () {});
                if (window.churchDexieDb.custom_songs) window.churchDexieDb.custom_songs.delete(sId).catch(function () {});
                if (window.churchDexieDb.song_book) window.churchDexieDb.song_book.delete(sId).catch(function () {});
              }
              if (sTitle) {
                const purgeByTitle = function (tbl) {
                  if (!tbl) return;
                  try {
                    tbl.where('title').equalsIgnoreCase(sTitle).delete().catch(function () {
                      tbl.toArray().then(function (arr) {
                        arr.forEach(function (r) {
                          if (r && r.title && String(r.title).toLowerCase().trim() === String(sTitle).toLowerCase().trim()) {
                            if (r.id) tbl.delete(r.id).catch(function () {});
                          }
                        });
                      }).catch(function () {});
                    });
                  } catch (_) {}
                };
                purgeByTitle(window.churchDexieDb.songs);
                purgeByTitle(window.churchDexieDb.custom_songs);
                purgeByTitle(window.churchDexieDb.song_book);
              }
            }
          } catch (purgeErr) {
            console.warn('[SyncEngine] Song deletion local purge error:', purgeErr);
          }
        }

        // Refresh without tab-switching or scroll jumps
        if (typeof window.refreshSongBookCards === 'function') {
          try { window.refreshSongBookCards(window.currentOpenSongBookKey); } catch (_) {}
        } else if (typeof window.renderAdditionalSongsFromDexie === 'function') {
          try { window.renderAdditionalSongsFromDexie(); } catch (_) {}
        }

        // Live update active lyric view in-place if currently open
        if (window.currentOpenSong && (window.currentOpenSong.id === item.id || (window.currentOpenSong.title && window.currentOpenSong.title === item.title))) {
          if (op === 'delete') {
            if (typeof window.showToast === 'function') window.showToast('The open hymn was removed on another device');
          } else {
            Object.assign(window.currentOpenSong, item);
            try {
              const titleEl = document.querySelector('.song-lyrics-title');
              if (titleEl) titleEl.textContent = item.title;
              const bodyEl = document.querySelector('.song-lyrics-body');
              if (bodyEl) bodyEl.innerHTML = (item.lyrics || '').replace(/\n/g, '<br>');
            } catch (_) {}
          }
        }
      }
    },

    // 2. about_church (stored in prayer_book table with id: 'about_church_profile')
    about_church: {
      segment: 'about_church',
      table: 'prayer_book',
      storeName: 'prayer_book',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        try {
          let profileData = null;
          if (item && item.content) {
            profileData = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          } else if (item && item.church_name) {
            profileData = {
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
          } else if (item && item.churchName) {
            profileData = item;
          }
          if (profileData) {
            localStorage.setItem('sanctuary_about_church_data', JSON.stringify(profileData));
            if (typeof window.renderAboutChurch === 'function') {
              try { window.renderAboutChurch(); } catch (_) {}
            }
            if (typeof window.renderAboutChurchPhotoSlider === 'function') {
              try { window.renderAboutChurchPhotoSlider(); } catch (_) {}
            }
          }
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('church:sync:about_church', { detail: { item, op } }));
      }
    },

    // 3. announcements
    announcements: {
      segment: 'announcements',
      table: 'announcements',
      storeName: 'announcements',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:announcements', { detail: { item, op } }));
        try {
          const listKey = 'sanctuary_announcements_v3';
          let list = JSON.parse(localStorage.getItem(listKey) || '[]');
          if (!Array.isArray(list)) list = [];
          const isDel = (op === 'delete' || !item || item.deleted_at != null || item.is_active === false || item.is_deleted === true);
          const annId = item ? (item.id || item.date_key) : null;
          const strId = annId ? String(annId) : null;

          if (isDel) {
            if (strId) {
              try {
                const blKey = 'sanctuary_deleted_announcements_blacklist';
                let bl = [];
                try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
                const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
                blSet.add(strId);
                localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
              } catch (_) {}
              if (typeof window.addDeletedAnnouncementToBlacklist === 'function') {
                try { window.addDeletedAnnouncementToBlacklist(annId); } catch (_) {}
              }
            }
            list = list.filter(function (x) { return String(x.id) !== strId; });
          } else {
            if (strId) {
              let bl = [];
              try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_announcements_blacklist') || '[]'); } catch (_) { bl = []; }
              if (Array.isArray(bl) && bl.map(String).includes(strId)) {
                return; // Blacklisted: do not resurrect
              }
            }
            const idx = list.findIndex(function (x) { return String(x.id) === strId; });
            const uiItem = {
              id: item.id,
              date: item.date || item.title || '',
              details: item.body || item.details || item.content || '',
              prayerBy: item.prayer_by || item.prayerBy || '',
              prayerDate: item.prayer_date || item.prayerDate || '',
              createdAt: item.created_at || item.updated_at || new Date().toISOString(),
              updatedAt: item.updated_at || new Date().toISOString()
            };
            if (idx >= 0) list[idx] = Object.assign({}, list[idx], uiItem);
            else list.unshift(uiItem);
          }
          localStorage.setItem(listKey, JSON.stringify(list));
          if (list.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(list[0]));
          else localStorage.removeItem('sanctuary_announcement_v2');

          if (typeof window.currentAnnouncementsList !== 'undefined') window.currentAnnouncementsList = list;
          if (typeof window.renderAnnouncementHomeUI === 'function') {
            try { window.renderAnnouncementHomeUI(); } catch (_) {}
          }
          if (typeof window.renderAdminAnnouncementsList === 'function') {
            try { window.renderAdminAnnouncementsList(); } catch (_) {}
          }
          _updateAnnouncementDOMFallback(list);
        } catch (_) {}
      }
    },

    // 4. today_song_selection (single row per date)
    today_song_selection: {
      segment: 'today_song_selection',
      table: 'todays_song_selection',
      storeName: 'todays_song_selection',
      primaryKey: 'date_key',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:today_song_selection', { detail: { item, op } }));
        try {
          const isDel = (op === 'delete' || !item || item.deleted_at != null || item.is_active === false);
          const songsList = (isDel || !Array.isArray(item.songs)) ? [] : item.songs;
          localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(songsList));
          if (typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = songsList;
          if (typeof window.renderTodaySongHomeUI === 'function') {
            try { window.renderTodaySongHomeUI(); } catch (_) {}
          }
          if (typeof window.renderAdminSelectedList === 'function') {
            try { window.renderAdminSelectedList(); } catch (_) {}
          }
          _updateTodaySongDOMFallback(songsList);
        } catch (_) {}
      }
    },

    // 5. prayer_books
    prayer_books: {
      segment: 'prayer_books',
      table: 'prayer_book',
      storeName: 'prayer_book',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:prayer_books', { detail: { item, op } }));
        if (typeof window.renderPrayerBookContent === 'function') {
          try { window.renderPrayerBookContent(); } catch (_) {}
        }
      }
    },

    // 6. almanac
    almanac: {
      segment: 'almanac',
      table: 'almanac_entries',
      storeName: 'almanac_entries',
      primaryKey: 'date_key',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:almanac', { detail: { item, op } }));
        try {
          if (!window.CHURCH_DATA) window.CHURCH_DATA = {};
          if (!window.CHURCH_DATA.almanacDatabase) window.CHURCH_DATA.almanacDatabase = {};
          if (op === 'delete') {
            delete window.CHURCH_DATA.almanacDatabase[item.date_key];
          } else {
            let parsedDetails = null;
            if (item.details) {
              try { parsedDetails = typeof item.details === 'string' ? JSON.parse(item.details) : item.details; } catch (_) {}
            }
            window.CHURCH_DATA.almanacDatabase[item.date_key] = Object.assign(
              {},
              window.CHURCH_DATA.almanacDatabase[item.date_key] || {},
              parsedDetails || { dateKey: item.date_key, year: item.year, theme: item.title, color: item.liturgical_color }
            );
          }
          localStorage.setItem('sanctuary_custom_almanac', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
          if (typeof window.renderAlmanacModule === 'function') {
            try { window.renderAlmanacModule(); } catch (_) {}
          }
        } catch (_) {}
      }
    },

    // 7. timeline
    timeline: {
      segment: 'timeline',
      table: 'timeline_events',
      storeName: 'timeline_events',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:timeline', { detail: { item, op } }));
        try {
          const tId = item ? (item.id || item.date_key) : null;
          const strId = tId ? String(tId) : null;

          if (op === 'delete' || (item && item.deleted_at)) {
            if (strId) {
              const blKey = 'sanctuary_deleted_timeline_blacklist';
              let bl = [];
              try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
              const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
              blSet.add(strId);
              localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
            }

            if (typeof window.timelineItems !== 'undefined' && Array.isArray(window.timelineItems)) {
              window.timelineItems = window.timelineItems.filter(x => x && String(x.id) !== strId);
            }
            try {
              const listKey = 'sanctuary_timeline_entries';
              let list = JSON.parse(localStorage.getItem(listKey) || '[]');
              if (Array.isArray(list)) {
                list = list.filter(x => x && String(x.id) !== strId);
                localStorage.setItem(listKey, JSON.stringify(list));
              }
            } catch (_) {}

            if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.custom_timeline && tId) {
              window.churchDexieDb.custom_timeline.delete(tId).catch(function () {});
            }
            const dbInst = SyncEngine._getDb();
            if (dbInst) {
              if (dbInst.custom_timeline && tId) dbInst.custom_timeline.delete(tId).catch(function () {});
              if (dbInst.timeline_events && tId) dbInst.timeline_events.delete(tId).catch(function () {});
            }
            if (typeof window.saveTimelineItems === 'function') {
              window.saveTimelineItems().catch(function () {});
            }
          } else {
            // Check if item is currently in deleted blacklist
            if (strId) {
              const blKey = 'sanctuary_deleted_timeline_blacklist';
              let bl = [];
              try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
              if (Array.isArray(bl) && bl.map(String).includes(strId)) {
                return;
              }
            }

            if (typeof window.timelineItems !== 'undefined' && Array.isArray(window.timelineItems)) {
              const idx = window.timelineItems.findIndex(x => x.id === item.id);
              const existing = idx >= 0 ? window.timelineItems[idx] : null;

              // Unpack metadata if embedded in description or use global unpacker
              let date = item.date || '';
              let rawDate = item.raw_date || item.rawDate || '';
              let photos = (Array.isArray(item.photos) && item.photos.length > 0) ? item.photos : [];
              let description = item.description || '';

              const metaMatch = description.match(/<!--TL_META:([\s\S]*?)-->/);
              if (metaMatch) {
                try {
                  const parsed = JSON.parse(metaMatch[1]);
                  if (parsed && typeof parsed === 'object') {
                    if (!date && parsed.date) date = parsed.date;
                    if (!rawDate && parsed.rawDate) rawDate = parsed.rawDate;
                    if ((!photos || photos.length === 0) && Array.isArray(parsed.photos)) photos = parsed.photos;
                  }
                } catch (_) {}
                description = description.replace(/\s*<!--TL_META:[\s\S]*?-->\s*$/, '').trim();
              }

              var isYearOnly = function (s) { return /^\d{4}$/.test(String(s || '').trim()); };
              // Preserve existing local fields if incoming lacks them
              if ((!date || isYearOnly(date)) && existing && existing.date && !isYearOnly(existing.date)) date = existing.date;
              if (!rawDate && existing && (existing.rawDate || existing.date)) rawDate = existing.rawDate || existing.date;
              if ((!photos || photos.length === 0) && existing && Array.isArray(existing.photos)) photos = existing.photos;

              if (!date || isYearOnly(date)) {
                var yrVal = date || (item.year ? String(item.year) : '2026');
                date = '12 July ' + yrVal;
              }
              if (!rawDate) rawDate = date;

              const formatted = {
                id: item.id,
                year: item.year || (existing && existing.year) || (date ? String(date).slice(0, 4) : '2026'),
                title: item.title || (existing && existing.title) || 'Timeline Event',
                description: description,
                rawDate: rawDate,
                date: date,
                photos: photos || []
              };

              if (idx >= 0) window.timelineItems[idx] = formatted;
              else window.timelineItems.unshift(formatted);

              if (typeof window.saveTimelineItems === 'function') {
                window.saveTimelineItems().catch(function () {});
              }
            }
          }
          if (typeof window.renderTimelineList === 'function') {
            try { window.renderTimelineList(); } catch (_) {}
          }
        } catch (e) {
          console.warn('[SyncEngine] Timeline onApplied error:', e);
        }
      }
    },

    // 8. congregation_members
    congregation_members: {
      segment: 'congregation_members',
      table: 'congregation_members',
      storeName: 'congregation_members',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:congregation_members', { detail: { item, op } }));
        if (typeof window.renderMembersList === 'function') {
          try { window.renderMembersList(); } catch (_) {}
        }
      }
    },

    // 9. profiles (user roles — live upgrade without re-login)
    profiles: {
      segment: 'profiles',
      table: 'profiles',
      storeName: 'profiles',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:profiles', { detail: { item, op } }));
        // If this is the current user's profile, refresh permissions live
        try {
          const session = getActiveSession();
          if (session && item && item.id === session.uid && op !== 'delete') {
            // Update cached session role so useAppPermissions() reflects immediately
            const stored = localStorage.getItem('sanctuary_auth_session_v1');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.uid === item.id) {
                if (item.role) parsed.role = item.role;
                if (typeof item.is_youth !== 'undefined') parsed.is_youth = item.is_youth;
                if (item.congregational_post) parsed.congregational_post = item.congregational_post;
                if (item.display_name) parsed.display_name = item.display_name;
                localStorage.setItem('sanctuary_auth_session_v1', JSON.stringify(parsed));
                window.currentAuthSession = parsed;
              }
            }
            window.dispatchEvent(new CustomEvent('church:auth:changed', { detail: item }));
          }
        } catch (_) {}
      }
    },

    // 10. admin_requests (live approval notification)
    admin_requests: {
      segment: 'admin_requests',
      table: 'admin_requests',
      storeName: 'admin_requests',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:admin_requests', { detail: { item, op } }));
        if (typeof window.renderAdminRequestsList === 'function') {
          try { window.renderAdminRequestsList(); } catch (_) {}
        }
      }
    },

    // 10b. youth_access_requests
    youth_access_requests: {
      segment: 'youth_access_requests',
      table: 'youth_access_requests',
      storeName: 'youth_access_requests',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:youth_access_requests', { detail: { item, op } }));
        if (typeof window.renderYouthRequestsList === 'function') {
          try { window.renderYouthRequestsList(); } catch (_) {}
        }
      }
    },

    // 11. posts
    posts: {
      segment: 'posts',
      table: 'posts',
      storeName: 'posts',
      primaryKey: 'id',
      merge: function (local, incoming, op) {
        return defaultRecordMerge(local, incoming, op);
      },
      onApplied: function (item, op) {
        window.dispatchEvent(new CustomEvent('church:sync:posts', { detail: { item, op } }));
        if (typeof window.renderPostsList === 'function') {
          try { window.renderPostsList(); } catch (_) {}
        }
      }
    }
  };

  // ── 4b. Anonymous Auth: ensure a persisted anon session exists before subscribing
  async function ensureAnonSession() {
    const client = (typeof window !== 'undefined' && (window.churchSupabase || (window.ChurchSync && window.ChurchSync.client))) || null;
    if (!client) return;
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        // No session — sign in anonymously so anon RLS and realtime both work
        const { error } = await client.auth.signInAnonymously();
        if (error) {
          console.warn('[SyncEngine v2] Anonymous sign-in warning:', error.message);
        } else {
          console.log('[SyncEngine v2] Anonymous session established.');
        }
      }
    } catch (e) {
      console.warn('[SyncEngine v2] ensureAnonSession error:', e);
    }
  }

  // ── 4c. Call setAuth on every token refresh so realtime never goes stale
  function setupAuthListener() {
    const client = (typeof window !== 'undefined' && (window.churchSupabase || (window.ChurchSync && window.ChurchSync.client))) || null;
    if (!client || !client.auth) return;
    try {
      client.auth.onAuthStateChange(function (event, session) {
        const IS_DEV = (typeof location !== 'undefined' && location.hostname === 'localhost');
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const token = session && session.access_token;
          if (token && client.realtime) {
            client.realtime.setAuth(token);
            if (IS_DEV) console.log('[RT] setAuth called on', event);
          }
          // Refresh permissions if this is the current user's session
          window.dispatchEvent(new CustomEvent('church:auth:changed', { detail: { event, session } }));
        }
      });
    } catch (e) {
      console.warn('[SyncEngine v2] setupAuthListener error:', e);
    }
  }

  // ── Session Sync Guard (Ensures strictly ONE automatic sync per app session on launch)
  const SESSION_LAUNCH_SYNC_KEY = '__church_app_session_synced';
  function hasSessionSynced() {
    if (typeof window !== 'undefined' && window.__churchAppSessionSynced) return true;
    try {
      return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_LAUNCH_SYNC_KEY) === 'true';
    } catch (_) {
      return false;
    }
  }

  function markSessionSynced() {
    if (typeof window !== 'undefined') window.__churchAppSessionSynced = true;
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_LAUNCH_SYNC_KEY, 'true');
    } catch (_) {}
  }

  // ── 5. SyncEngine Implementation
  const SyncEngine = {
    _status: 'idle',
    _lastSyncedAt: null,
    _realtimeChannel: null,
    _reconnectTimeout: null,
    _reconnectAttempts: 0,
    _isPulling: false,
    _idleTransitionTimer: null,
    _listeners: [],

    MAX_BACKOFF_MS: 30000,
    BASE_BACKOFF_MS: 1000,

    get status() {
      return this._status;
    },

    get lastSyncedAt() {
      return this._lastSyncedAt;
    },

    onStatusChange: function (callback) {
      this._listeners.push(callback);
      try { callback(this._status, this._lastSyncedAt); } catch (_) {}
      const self = this;
      return function () {
        self._listeners = self._listeners.filter(function (cb) { return cb !== callback; });
      };
    },

    _setStatus: function (newStatus) {
      if (this._status !== newStatus) {
        this._status = newStatus;
        const self = this;
        this._listeners.forEach(function (cb) {
          try { cb(self._status, self._lastSyncedAt); } catch (_) {}
        });
      }
    },

    _getClient: function () {
      return (typeof window !== 'undefined' && (window.churchSupabase || (window.ChurchSync && window.ChurchSync.client))) || null;
    },

    _getDb: function () {
      return syncDb || getSharedDexie();
    },

    start: async function () {
      const self = this;
      const IS_DEV = (typeof location !== 'undefined' && location.hostname === 'localhost');

      // Network listeners: update indicator safely without triggering automatic background syncs
      window.addEventListener('online', function () {
        if (IS_DEV) console.log('[SyncEngine] Network online — waiting for user-initiated sync.');
        if (self._status === 'offline') {
          self._setStatus('idle');
        }
      });

      window.addEventListener('offline', function () {
        if (IS_DEV) console.log('[SyncEngine] Network offline — local data preserved.');
        self._setStatus('offline');
      });

      // Setup auth listener for setAuth on token refresh
      setupAuthListener();

      // Ensure anonymous session exists before sync operations
      await ensureAnonSession();

      // Guard: Perform exactly ONE automatic Supabase sync per app session on launch.
      // Prevent duplicate launch syncs caused by re-renders, navigation, or script re-execution.
      if (hasSessionSynced()) {
        if (IS_DEV) console.log('[SyncEngine] Single launch sync already completed for this session. Automatic sync disabled.');
        this._setStatus(navigator.onLine ? 'idle' : 'offline');
        return;
      }

      // Mark launch sync as initiated for this session
      markSessionSynced();

      if (!navigator.onLine) {
        if (IS_DEV) console.log('[SyncEngine] Offline at app launch — preserving existing local data.');
        this._setStatus('offline');
        return;
      }

      if (IS_DEV) console.log('[SyncEngine] Performing single automatic launch sync for session...');
      await this.performSync({ isLaunch: true });

      // After launch sync completes, strictly disable all automatic synchronization:
      // no background sync, no polling, no Realtime subscriptions, no periodic refreshes,
      // no navigation-triggered syncs, and no automatic retries.
      this._stopWatchdog();
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }
      this._unsubscribeRealtime();
    },

    stop: function () {
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }
      this._stopWatchdog();
      this._unsubscribeRealtime();
      this._setStatus('offline');
    },

    /**
     * Unified Manual & Launch Sync Method
     * - Deduplicates concurrent calls
     * - Safely catches network/HTTP errors without wiping local Dexie data
     * - Accurately updates Status Indicator states:
     *     Yellow blinking = Syncing
     *     Green blinking  = Sync Successful (then transitions to Gray = Idle after 3.5s)
     *     Red blinking    = Offline / Failed
     *     Gray            = Idle
     */
    performSync: async function (options) {
      options = options || {};
      // Prevent duplicate sync requests
      if (this._isPulling) {
        console.log('[SyncEngine] Sync already in progress — skipping duplicate request.');
        return false;
      }

      if (!navigator.onLine) {
        console.warn('[SyncEngine] Offline — skipping remote sync and preserving local cache.');
        this._setStatus('offline');
        return false;
      }

      this._isPulling = true;
      this._setStatus('syncing');
      const IS_DEV = (typeof location !== 'undefined' && location.hostname === 'localhost');

      try {
        const client = this._getClient();
        if (!client) {
          throw new Error('Supabase client unavailable');
        }

        // 1. Flush offline outbox safely
        try {
          await this.flushOutbox();
        } catch (outboxErr) {
          console.warn('[SyncEngine] Non-fatal outbox flush error:', outboxErr);
        }

        // 2. Pull remote updates for all registered segments
        const dbInstance = this._getDb();
        const segments = Object.keys(syncRegistry);

        for (const seg of segments) {
          if (!dbInstance) continue;
          const reg = syncRegistry[seg];
          if (!reg) continue;

          let lastAt = null;
          try {
            if (dbInstance.lastSyncedAt) {
              const rec = await dbInstance.lastSyncedAt.get(reg.table);
              lastAt = rec ? rec.ts : null;
            }
          } catch (_) {}

          if (!lastAt) {
            await this._fullPullSegment(seg);
          } else {
            await this._deltaByUpdatedAt(seg, lastAt);
          }
        }

        this._lastSyncedAt = new Date();
        // Green blinking = Sync Successful
        this._setStatus('synced');
        if (IS_DEV) console.log('[SyncEngine] Sync completed successfully at', this._lastSyncedAt.toISOString());

        // Settle from Green blinking to Gray = Idle after 3.5s
        const self = this;
        if (this._idleTransitionTimer) clearTimeout(this._idleTransitionTimer);
        this._idleTransitionTimer = setTimeout(function () {
          if (self._status === 'synced') {
            self._setStatus('idle');
          }
        }, 3500);

        return true;
      } catch (err) {
        console.error('[SyncEngine] Sync failed safely (local data preserved):', err);
        // Red blinking = Offline/Failed
        this._setStatus(navigator.onLine ? 'failed' : 'offline');
        return false;
      } finally {
        this._isPulling = false;
      }
    },

    pullDelta: async function () {
      return this.performSync();
    },

    // Delta pull by updated_at (no sync_changes table required)
    _deltaByUpdatedAt: async function (segment, sinceIso) {
      const reg = syncRegistry[segment];
      const dbInstance = this._getDb();
      if (!reg || !dbInstance) return;
      const client = this._getClient();
      if (!client) return;
      const IS_DEV = (typeof location !== 'undefined' && location.hostname === 'localhost');

      const pkField = reg.primaryKey || 'id';
      let page = 0;
      const pageSize = 200;
      let maxUpdatedAt = sinceIso;

      try {
        while (true) {
          let query = client
            .from(reg.table)
            .select('*')
            .gt('updated_at', sinceIso)
            .order('updated_at', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          const res = await query;
          if (res.error) {
            console.warn('[SyncEngine v2] delta pull error for ' + reg.table + ':', res.error);
            break;
          }
          const rows = res.data;
          if (!rows || rows.length === 0) break;

          const store = dbInstance[reg.storeName];
          for (const row of rows) {
            const keyVal = row[pkField] || row.date_key;
            const local = (store && keyVal) ? await store.get(keyVal).catch(function () {}) : undefined;
            const isDeleted = (row.deleted_at != null || row.is_active === false || row.is_deleted === true);

            if (isDeleted) {
              // Tombstone: remove from Dexie
              if (store && keyVal) await store.delete(keyVal).catch(function () {});
              if (segment === 'songbook') {
                let delTitle = row.title;
                if (!delTitle && local && local.title) delTitle = local.title;
                if (delTitle) {
                  const delByTitle = async function (tbl) {
                    if (!tbl) return;
                    try {
                      await tbl.where('title').equalsIgnoreCase(delTitle).delete();
                    } catch (_) {
                      try {
                        const all = await tbl.toArray();
                        for (const r of all) {
                          if (r && r.title && String(r.title).toLowerCase().trim() === String(delTitle).toLowerCase().trim()) {
                            if (r.id) await tbl.delete(r.id).catch(function () {});
                          }
                        }
                      } catch (_) {}
                    }
                  };
                  await delByTitle(store);
                  await delByTitle(dbInstance.custom_songs);
                  await delByTitle(dbInstance.song_book);
                  if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb) {
                    await delByTitle(window.churchDexieDb.songs);
                    await delByTitle(window.churchDexieDb.custom_songs);
                    await delByTitle(window.churchDexieDb.song_book);
                  }
                }
                if (dbInstance.custom_songs) await dbInstance.custom_songs.delete(keyVal).catch(function () {});
                if (dbInstance.song_book) await dbInstance.song_book.delete(keyVal).catch(function () {});
                if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb) {
                  if (window.churchDexieDb.songs) await window.churchDexieDb.songs.delete(keyVal).catch(function () {});
                  if (window.churchDexieDb.custom_songs) await window.churchDexieDb.custom_songs.delete(keyVal).catch(function () {});
                  if (window.churchDexieDb.song_book) await window.churchDexieDb.song_book.delete(keyVal).catch(function () {});
                }
              }
              if (segment === 'timeline') {
                if (dbInstance.custom_timeline) await dbInstance.custom_timeline.delete(keyVal).catch(function () {});
                if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.custom_timeline) {
                  await window.churchDexieDb.custom_timeline.delete(keyVal).catch(function () {});
                }
              }
              if (segment === 'announcements') {
                if (dbInstance.announcements) await dbInstance.announcements.delete(keyVal).catch(function () {});
                if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.announcements) {
                  await window.churchDexieDb.announcements.delete(keyVal).catch(function () {});
                }
              }
              if (segment === 'today_song_selection') {
                if (dbInstance.todays_song_selection) await dbInstance.todays_song_selection.delete(keyVal).catch(function () {});
                if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.todays_song_selection) {
                  await window.churchDexieDb.todays_song_selection.delete(keyVal).catch(function () {});
                }
              }
              if (reg.onApplied) reg.onApplied(row, 'delete');
            } else {
              // Active record: check blacklist first
              if (segment === 'announcements' && keyVal) {
                let bl = [];
                try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_announcements_blacklist') || '[]'); } catch (_) { bl = []; }
                if (Array.isArray(bl) && bl.map(String).includes(String(keyVal))) {
                  continue; // Blacklisted: do not resurrect
                }
              }
              if (segment === 'timeline' && keyVal) {
                let bl = [];
                try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_timeline_blacklist') || '[]'); } catch (_) { bl = []; }
                if (Array.isArray(bl) && bl.map(String).includes(String(keyVal))) {
                  continue;
                }
              }
              if (segment === 'songbook') {
                let bl = [];
                try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_songs_blacklist') || '[]'); } catch (_) { bl = []; }
                const blSet = new Set((Array.isArray(bl) ? bl : []).map(function (x) { return String(x).toLowerCase().trim(); }));
                const kLower = String(keyVal).toLowerCase().trim();
                const tLower = row.title ? String(row.title).toLowerCase().trim() : '';
                if (blSet.has(kLower) || (tLower && blSet.has(tLower))) {
                  continue;
                }
              }

              const merged = reg.merge(local, row, 'update');
              if (merged) {
                if (store) await store.put(merged).catch(function () {});
                if (segment === 'songbook') {
                  if (dbInstance.custom_songs) await dbInstance.custom_songs.put(merged).catch(function () {});
                  if (dbInstance.song_book) await dbInstance.song_book.put(merged).catch(function () {});
                }
                if (reg.onApplied) reg.onApplied(merged, 'update');
              }
            }
            if (row.updated_at > maxUpdatedAt) maxUpdatedAt = row.updated_at;
          }

          if (IS_DEV) console.log('[RT] delta ' + reg.table + ' page=' + page + ' rows=' + rows.length);
          if (rows.length < pageSize) break;
          page++;
        }

        // Persist updated lastSyncedAt
        if (dbInstance.lastSyncedAt && maxUpdatedAt !== sinceIso) {
          await dbInstance.lastSyncedAt.put({ table: reg.table, ts: maxUpdatedAt }).catch(function () {});
        }
      } catch (e) {
        console.warn('[SyncEngine v2] _deltaByUpdatedAt error for ' + segment + ':', e);
      }
    },

    _fullPullSegment: async function (segment) {
      const reg = syncRegistry[segment];
      const dbInstance = this._getDb();
      if (!reg || !dbInstance) return;
      const client = this._getClient();
      if (!client) return;

      try {
        let query = client.from(reg.table).select('*');
        if (segment === 'songbook') {
          query = query.is('deleted_at', null);
        } else if (segment === 'timeline') {
          query = query.is('deleted_at', null);
        } else if (segment === 'about_church') {
          query = query.eq('id', 'about_church_profile');
        } else if (segment === 'announcements') {
          query = query.eq('is_active', true).is('deleted_at', null);
        }

        const res = await query;
        if (res.error) {
          console.warn('[SyncEngine] Pull warning for ' + reg.table + ':', res.error);
          return;
        }

        let data = res.data;
        if (segment === 'timeline' && Array.isArray(data)) {
          let bl = [];
          try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_timeline_blacklist') || '[]'); } catch (_) { bl = []; }
          const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
          data = data.filter(it => it && !it.deleted_at && !blSet.has(String(it.id)));

          const activeIds = new Set(data.map(function (it) { return String(it.id); }));
          const pruneTimeline = async function (tbl) {
            if (!tbl) return;
            try {
              const all = await tbl.toArray();
              for (const item of all) {
                if (item && item.id && !activeIds.has(String(item.id))) {
                  await tbl.delete(item.id).catch(function () {});
                }
              }
            } catch (_) {}
          };
          await pruneTimeline(dbInstance.timeline_events);
          await pruneTimeline(dbInstance.custom_timeline);
          if (typeof window !== 'undefined' && window.churchDexieDb) {
            await pruneTimeline(window.churchDexieDb.timeline_events);
            await pruneTimeline(window.churchDexieDb.custom_timeline);
          }
          try {
            const listKey = 'sanctuary_timeline_entries';
            let list = JSON.parse(localStorage.getItem(listKey) || '[]');
            if (Array.isArray(list)) {
              list = list.filter(function (it) { return it && activeIds.has(String(it.id)); });
              localStorage.setItem(listKey, JSON.stringify(list));
              if (typeof window.timelineItems !== 'undefined') window.timelineItems = list;
            }
          } catch (_) {}
        }

        if (segment === 'announcements') {
          let bl = [];
          try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_announcements_blacklist') || '[]'); } catch (_) { bl = []; }
          const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
          data = (Array.isArray(data) ? data : []).filter(it => it && !it.deleted_at && it.is_active !== false && !blSet.has(String(it.id)));

          const activeIds = new Set(data.map(function (a) { return String(a.id); }));
          const pruneAnnouncements = async function (tbl) {
            if (!tbl) return;
            try {
              const all = await tbl.toArray();
              for (const item of all) {
                if (item && item.id && !activeIds.has(String(item.id))) {
                  await tbl.delete(item.id).catch(function () {});
                }
              }
            } catch (_) {}
          };
          await pruneAnnouncements(dbInstance[reg.storeName]);
          if (typeof window !== 'undefined' && window.churchDexieDb) {
            await pruneAnnouncements(window.churchDexieDb.announcements);
          }

          try {
            const listKey = 'sanctuary_announcements_v3';
            let list = JSON.parse(localStorage.getItem(listKey) || '[]');
            if (Array.isArray(list)) {
              list = list.filter(function (it) { return it && activeIds.has(String(it.id)); });
              localStorage.setItem(listKey, JSON.stringify(list));
              if (list.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(list[0]));
              else localStorage.removeItem('sanctuary_announcement_v2');
              if (typeof window.currentAnnouncementsList !== 'undefined') window.currentAnnouncementsList = list;
              _updateAnnouncementDOMFallback(list);
            }
          } catch (_) {}
        }

        if (segment === 'today_song_selection') {
          const row = (Array.isArray(data) && data.length > 0) ? data[0] : null;
          const songsList = (row && Array.isArray(row.songs) && !row.deleted_at && row.is_active !== false) ? row.songs : [];
          localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(songsList));
          if (typeof window !== 'undefined' && typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = songsList;
          _updateTodaySongDOMFallback(songsList);
        }

        if (segment === 'songbook' && Array.isArray(data)) {
          const activeIds = new Set(data.map(function (s) { return String(s.id).toLowerCase().trim(); }));
          const activeTitles = new Set(data.map(function (s) { return String(s.title || '').toLowerCase().trim(); }));

          const pruneStore = async function (tbl) {
            if (!tbl) return;
            try {
              const allLocal = await tbl.toArray();
              for (const item of allLocal) {
                if (!item) continue;
                const itemIdStr = item.id ? String(item.id).toLowerCase().trim() : '';
                const itemTitleStr = item.title ? String(item.title).toLowerCase().trim() : '';
                const isRemoteOrCustom = itemIdStr.startsWith('masihi_geeto_ka_sangrah-') ||
                                         itemIdStr.startsWith('additional_songs-') ||
                                         itemIdStr.startsWith('custom-') ||
                                         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemIdStr) ||
                                         item.book_reference || item.created_at || item.updated_at;
                if (isRemoteOrCustom && !activeIds.has(itemIdStr) && !activeTitles.has(itemTitleStr)) {
                  if (item.id) await tbl.delete(item.id).catch(function () {});
                  else if (item.title) await tbl.where('title').equalsIgnoreCase(item.title).delete().catch(function () {});
                }
              }
            } catch (_) {}
          };

          const store = dbInstance[reg.storeName];
          await pruneStore(store);
          await pruneStore(dbInstance.custom_songs);
          await pruneStore(dbInstance.song_book);
          if (typeof window !== 'undefined' && window.churchDexieDb) {
            await pruneStore(window.churchDexieDb.songs);
            await pruneStore(window.churchDexieDb.custom_songs);
            await pruneStore(window.churchDexieDb.song_book);
          }

          ['sanctuary_imported_songs', 'sanctuary_custom_songs_backup'].forEach(function (storageKey) {
            try {
              const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
              if (Array.isArray(list) && list.length > 0) {
                const pruned = list.filter(function (item) {
                  if (!item) return false;
                  const idStr = item.id ? String(item.id).toLowerCase().trim() : '';
                  const titleStr = item.title ? String(item.title).toLowerCase().trim() : '';
                  return activeIds.has(idStr) || activeTitles.has(titleStr);
                });
                localStorage.setItem(storageKey, JSON.stringify(pruned));
              }
            } catch (_) {}
          });

          if (typeof window !== 'undefined' && Array.isArray(window.currentSongList)) {
            window.currentSongList = window.currentSongList.filter(function (s) {
              if (!s) return false;
              const sIdStr = s.id ? String(s.id).toLowerCase().trim() : '';
              const sTitleStr = s.title ? String(s.title).toLowerCase().trim() : '';
              if (sIdStr.startsWith('static-')) return true;
              return activeIds.has(sIdStr) || activeTitles.has(sTitleStr);
            });
          }
        }

        if (Array.isArray(data) && data.length > 0) {
          const store = dbInstance[reg.storeName];
          if (store) {
            try {
              await dbInstance.transaction('rw', store, async function () {
                await store.bulkPut(data);
              });
            } catch (dexErr) {
              for (const row of data) {
                try { await store.put(row); } catch (_) {}
              }
            }
          }

          // Mirror songs to custom_songs and song_book
          if (segment === 'songbook') {
            if (dbInstance.custom_songs) try { await dbInstance.custom_songs.bulkPut(data); } catch (_) {}
            if (dbInstance.song_book) try { await dbInstance.song_book.bulkPut(data); } catch (_) {}
          }

          data.forEach(function (item) {
            if (reg.onApplied) reg.onApplied(item, 'insert');
          });
        }

        if (segment === 'songbook') {
          if (typeof window !== 'undefined' && typeof window.refreshSongBookCards === 'function') {
            try { window.refreshSongBookCards(window.currentOpenSongBookKey); } catch (_) {}
          } else if (typeof window !== 'undefined' && typeof window.renderAdditionalSongsFromDexie === 'function') {
            try { window.renderAdditionalSongsFromDexie(); } catch (_) {}
          }
        }

        // Store lastSyncedAt for this table
        const nowIso = new Date().toISOString();
        if (dbInstance.lastSyncedAt) {
          await dbInstance.lastSyncedAt.put({ table: reg.table, ts: nowIso }).catch(function () {});
        }
        // Also update legacy sync_meta for backwards compat
        if (dbInstance.sync_meta) {
          await dbInstance.sync_meta.put({
            key: 'last_seq_' + segment,
            value: Date.now(),
            updated_at: nowIso
          }).catch(function () {});
        }
      } catch (e) {
        console.warn('[SyncEngine] _fullPullSegment exception for ' + segment + ':', e);
      }
    },

    _deltaPullSegment: async function (segment, lastSeq) {
      const reg = syncRegistry[segment];
      const dbInstance = this._getDb();
      if (!reg || !dbInstance) return false;
      const client = this._getClient();
      if (!client) return false;

      try {
        // Attempt delta pull via sync_changes table if installed
        const res = await client
          .from('sync_changes')
          .select('*')
          .eq('segment', segment)
          .gt('seq', lastSeq)
          .order('seq', { ascending: true })
          .limit(200);

        if (res.error) {
          // Table does not exist (PGRST205 / 404)
          return false;
        }

        const changes = res.data;
        if (!Array.isArray(changes) || changes.length === 0) return true;

        let maxSeq = lastSeq;
        const store = dbInstance[reg.storeName];

        for (const change of changes) {
          const op = (change.op || 'update').toLowerCase();
          const rowId = change.row_id;
          maxSeq = Math.max(maxSeq, Number(change.seq));

          if (op === 'delete') {
            if (store) await store.delete(rowId);
            if (reg.onApplied) reg.onApplied({ id: rowId }, 'delete');
          } else {
            let record = change.payload;
            if (!record || !record.id) {
              const rowRes = await client
                .from(reg.table)
                .select('*')
                .eq('id', rowId)
                .maybeSingle();
              record = rowRes.data;
            }

            if (record) {
              const local = store ? await store.get(rowId) : undefined;
              const merged = reg.merge(local, record, op);

              if (merged === null) {
                if (store) await store.delete(rowId);
                if (reg.onApplied) reg.onApplied(record, 'delete');
              } else if (merged) {
                if (store) await store.put(merged);
                if (reg.onApplied) reg.onApplied(merged, op);
              }
            }
          }
        }

        if (dbInstance.sync_meta) {
          await dbInstance.sync_meta.put({
            key: 'last_seq_' + segment,
            value: maxSeq,
            updated_at: new Date().toISOString()
          }).catch(function () {});
        }
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Realtime Subscriptions & Background Polling Management
     * Strictly disabled post-launch: all subsequent synchronization must be triggered manually.
     */
    _unsubscribeRealtime: function () {
      const client = this._getClient();
      if (this._realtimeChannel && client) {
        try { client.removeChannel(this._realtimeChannel); } catch (_) {}
        this._realtimeChannel = null;
      }
    },

    _subscribeRealtime: function () {
      // Disabled by policy: all subsequent synchronization is strictly user-triggered.
      this._unsubscribeRealtime();
    },

    _watchdogTimer: null,
    _lastEventAt: 0,
    WATCHDOG_MS: 300000,

    _startWatchdog: function () {
      // Disabled by policy: no background polling or watchdog intervals.
      this._stopWatchdog();
    },

    _stopWatchdog: function () {
      if (this._watchdogTimer) {
        clearInterval(this._watchdogTimer);
        this._watchdogTimer = null;
      }
    },

    _scheduleReconnect: function () {
      // Disabled by policy: no automatic retries; all retries must be user-triggered.
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }
    },

    _handleRealtimeEvent: async function (table, payload) {
      const dbInstance = this._getDb();
      if (!dbInstance) return;
      const IS_DEV = (typeof location !== 'undefined' && location.hostname === 'localhost');

      try {
        const eventType = (payload.eventType || payload.type || '').toUpperCase();
        const newRec = payload.new || payload.record;
        const oldRec = payload.old || payload.old_record;

        if (IS_DEV) {
          const recId = (newRec && (newRec.id || newRec.date_key)) || (oldRec && (oldRec.id || oldRec.date_key));
          console.log('[RT] event table=' + table + ' type=' + eventType + ' id=' + recId);
        }

        let targetSegment = null;
        if (table === 'songs') targetSegment = 'songbook';
        else if (table === 'prayer_book') {
          if ((newRec && (newRec.id === 'about_church_profile' || newRec.category === 'about_church')) ||
              (oldRec && (oldRec.id === 'about_church_profile' || oldRec.category === 'about_church'))) {
            targetSegment = 'about_church';
          } else {
            targetSegment = 'prayer_books';
          }
        } else if (table === 'announcements') targetSegment = 'announcements';
        else if (table === 'todays_song_selection') targetSegment = 'today_song_selection';
        else if (table === 'almanac_entries') targetSegment = 'almanac';
        else if (table === 'timeline_events') targetSegment = 'timeline';
        else if (table === 'congregation_members') targetSegment = 'congregation_members';
        else if (table === 'profiles') targetSegment = 'profiles';
        else if (table === 'admin_requests') targetSegment = 'admin_requests';
        else if (table === 'youth_access_requests') targetSegment = 'youth_access_requests';
        else if (table === 'posts') targetSegment = 'posts';

        const entry = syncRegistry[targetSegment];
        if (!entry) return;

        const store = dbInstance[entry.storeName];
        const isDeleteEvent = eventType === 'DELETE' || Boolean(newRec && (newRec.deleted_at != null || newRec.is_active === false || newRec.is_deleted === true));

        if (isDeleteEvent) {
          const delId = (newRec && (newRec.id || newRec.date_key)) || (oldRec && (oldRec.id || oldRec.date_key));
          let delTitle = (newRec && newRec.title) || (oldRec && oldRec.title);

          // Resolve title before deletion if missing
          if (!delTitle && delId && store) {
            try {
              const localRec = await store.get(delId);
              if (localRec && localRec.title) delTitle = localRec.title;
            } catch (_) {}
          }
          if (!delTitle && delId && dbInstance && dbInstance.songs) {
            try {
              const localSong = await dbInstance.songs.get(delId);
              if (localSong && localSong.title) delTitle = localSong.title;
            } catch (_) {}
          }

          if (delId && store) await store.delete(delId).catch(function () {});
          if (table === 'songs') {
            if (delId) {
              if (dbInstance.custom_songs) await dbInstance.custom_songs.delete(delId).catch(function () {});
              if (dbInstance.song_book) await dbInstance.song_book.delete(delId).catch(function () {});
              if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb) {
                if (window.churchDexieDb.songs) await window.churchDexieDb.songs.delete(delId).catch(function () {});
                if (window.churchDexieDb.custom_songs) await window.churchDexieDb.custom_songs.delete(delId).catch(function () {});
                if (window.churchDexieDb.song_book) await window.churchDexieDb.song_book.delete(delId).catch(function () {});
              }
            }
            if (delTitle) {
              const delByTitle = async function (tbl) {
                if (!tbl) return;
                try {
                  await tbl.where('title').equalsIgnoreCase(delTitle).delete();
                } catch (_) {
                  try {
                    const all = await tbl.toArray();
                    for (const r of all) {
                      if (r && r.title && String(r.title).toLowerCase().trim() === String(delTitle).toLowerCase().trim()) {
                        if (r.id) await tbl.delete(r.id).catch(function () {});
                      }
                    }
                  } catch (_) {}
                }
              };
              await delByTitle(store);
              await delByTitle(dbInstance.custom_songs);
              await delByTitle(dbInstance.song_book);
              if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb) {
                await delByTitle(window.churchDexieDb.songs);
                await delByTitle(window.churchDexieDb.custom_songs);
                await delByTitle(window.churchDexieDb.song_book);
              }
            }
          }
          if (table === 'timeline_events' && delId) {
            if (dbInstance.custom_timeline) await dbInstance.custom_timeline.delete(delId).catch(function () {});
            if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.custom_timeline) {
              await window.churchDexieDb.custom_timeline.delete(delId).catch(function () {});
            }
          }
          if (table === 'announcements' && delId) {
            if (dbInstance.announcements) await dbInstance.announcements.delete(delId).catch(function () {});
            if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.announcements) {
              await window.churchDexieDb.announcements.delete(delId).catch(function () {});
            }
          }
          if (table === 'todays_song_selection') {
            const dateKey = (newRec && newRec.date_key) || (oldRec && oldRec.date_key) || delId;
            if (dateKey && dbInstance.todays_song_selection) {
              await dbInstance.todays_song_selection.delete(dateKey).catch(function () {});
            }
            if (dateKey && typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.todays_song_selection) {
              await window.churchDexieDb.todays_song_selection.delete(dateKey).catch(function () {});
            }
          }

          if (entry.onApplied) entry.onApplied((newRec || oldRec || { id: delId, title: delTitle, date_key: delId }), 'delete');
        } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (newRec) {
            const keyVal = newRec.id || newRec.date_key;
            if (table === 'timeline_events' && keyVal) {
              let bl = [];
              try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_timeline_blacklist') || '[]'); } catch (_) { bl = []; }
              if (Array.isArray(bl) && bl.map(String).includes(String(keyVal))) {
                return;
              }
            }
            if (table === 'announcements' && keyVal) {
              let bl = [];
              try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_announcements_blacklist') || '[]'); } catch (_) { bl = []; }
              if (Array.isArray(bl) && bl.map(String).includes(String(keyVal))) {
                return;
              }
            }
            const local = (store && keyVal) ? await store.get(keyVal).catch(function () {}) : undefined;
            const merged = entry.merge(local, newRec, eventType.toLowerCase());

            if (merged === null) {
              if (store && keyVal) await store.delete(keyVal).catch(function () {});
              if (entry.onApplied) entry.onApplied(newRec, 'delete');
            } else if (merged) {
              if (store) await store.put(merged).catch(function () {});
              if (table === 'songs') {
                if (dbInstance.custom_songs) await dbInstance.custom_songs.put(merged).catch(function () {});
                if (dbInstance.song_book) await dbInstance.song_book.put(merged).catch(function () {});
              }
              if (entry.onApplied) entry.onApplied(merged, eventType.toLowerCase());
            }
          }
        }

        // Bridge event to ChurchSync emitter so app.js onChange listeners are invoked
        if (typeof window !== 'undefined' && window.ChurchSync && typeof window.ChurchSync.emit === 'function') {
          try {
            window.ChurchSync.emit(table + ':change', payload);
            if (table === 'songs') {
              window.ChurchSync.emit('song_book:change', payload);
            }
            window.ChurchSync.emit('anyChange', { table, payload });
          } catch (_) {}
        }

        this._lastSyncedAt = new Date();
        this._setStatus('synced');
      } catch (err) {
        console.warn('[SyncEngine] Realtime event process warning for ' + table + ':', err);
      }
    },

    /**
     * Flush offline Dexie outbox
     */
    flushOutbox: async function () {
      const dbInstance = this._getDb();
      if (!dbInstance || !dbInstance.sync_outbox || !navigator.onLine) return;
      const client = this._getClient();
      if (!client) return;

      try {
        const items = await dbInstance.sync_outbox.toArray();
        if (!items || items.length === 0) return;

        console.log('[SyncEngine] Flushing ' + items.length + ' queued writes from outbox...');
        for (const item of items) {
          const reg = syncRegistry[item.segment];
          if (!reg) {
            await dbInstance.sync_outbox.delete(item.id);
            continue;
          }

          try {
            if (item.op === 'delete') {
              const delId = item.payload.id || item.payload.date_key || item.payload;
              if (reg.table === 'songs') {
                await client.from(reg.table).delete().eq('id', delId);
                if (item.payload && item.payload.title) {
                  await client.from(reg.table).delete().eq('title', item.payload.title).catch(function () {});
                }
              } else if (reg.table === 'almanac_entries') {
                await client.from(reg.table).delete().eq('date_key', delId);
              } else {
                await client.from(reg.table).delete().eq('id', delId);
              }
            } else {
              const onConflictKey = reg.primaryKey || 'id';
              await client.from(reg.table).upsert(item.payload, { onConflict: onConflictKey });
            }
            await dbInstance.sync_outbox.delete(item.id);
          } catch (writeErr) {
            console.warn('[SyncEngine] Outbox item replay error:', writeErr);
          }
        }
      } catch (e) {
        console.warn('[SyncEngine] flushOutbox exception:', e);
      }
    }
  };

  // ── 6. Admin syncWrite Abstraction
  async function syncWrite(segment, op, payload) {
    const reg = syncRegistry[segment];
    if (!reg) {
      return { success: false, error: new Error('Unknown segment: ' + segment) };
    }

    const dbInstance = SyncEngine._getDb();
    const store = (dbInstance && reg.storeName) ? dbInstance[reg.storeName] : null;
    const isOnline = navigator.onLine;
    const client = SyncEngine._getClient();

    // Segment payload adapters
    let remotePayload = payload;
    let targetTable = reg.table;
    let onConflictKey = reg.primaryKey || 'id';

    if (segment === 'about_church') {
      const aboutContent = payload.raw_data || payload;
      const contentJson = typeof aboutContent === 'string' ? aboutContent : JSON.stringify(aboutContent);
      remotePayload = {
        id: 'about_church_profile',
        category: 'about_church',
        title: aboutContent.churchName || 'CNI Church of North India',
        content: contentJson,
        sort_order: 1,
        updated_at: new Date().toISOString()
      };
      targetTable = 'prayer_book';
      onConflictKey = 'id';
      try {
        localStorage.setItem('sanctuary_about_church_data', contentJson);
      } catch (_) {}
    } else if (segment === 'today_song_selection') {
      if (!remotePayload.date_key) {
        remotePayload.date_key = new Date().toISOString().split('T')[0];
      }
      if (!remotePayload.id) {
        remotePayload.id = '00000000-0000-0000-0000-' + remotePayload.date_key.replace(/-/g, '').padStart(12, '0');
      }
      remotePayload.updated_at = new Date().toISOString();
      onConflictKey = 'date_key';
      try {
        localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(remotePayload.songs || []));
      } catch (_) {}
    } else if (segment === 'almanac' && Array.isArray(payload)) {
      return handleAlmanacBulkImport(payload, isOnline, client, dbInstance);
    } else {
      if (op !== 'delete' && !remotePayload.id && !remotePayload.date_key) {
        remotePayload.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now());
      }
      if (op !== 'delete') {
        remotePayload.updated_at = remotePayload.updated_at || new Date().toISOString();
      }
    }

    // Optimistic write to local Dexie
    if (store) {
      try {
        if (op === 'delete') {
          const delId = remotePayload.id || remotePayload.date_key || remotePayload;
          let delTitle = remotePayload.title;

          if (segment === 'songbook') {
            if (!delTitle && delId) {
              try {
                const rec = await store.get(delId);
                if (rec && rec.title) delTitle = rec.title;
              } catch (_) {}
            }
            if (delId) {
              await store.delete(delId).catch(function () {});
              if (dbInstance.custom_songs) await dbInstance.custom_songs.delete(delId).catch(function () {});
              if (dbInstance.song_book) await dbInstance.song_book.delete(delId).catch(function () {});
              if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb) {
                if (window.churchDexieDb.songs) await window.churchDexieDb.songs.delete(delId).catch(function () {});
                if (window.churchDexieDb.custom_songs) await window.churchDexieDb.custom_songs.delete(delId).catch(function () {});
                if (window.churchDexieDb.song_book) await window.churchDexieDb.song_book.delete(delId).catch(function () {});
              }
            }
            if (delTitle) {
              const delByTitle = async function (tbl) {
                if (!tbl) return;
                try {
                  await tbl.where('title').equalsIgnoreCase(delTitle).delete();
                } catch (_) {
                  try {
                    const all = await tbl.toArray();
                    for (const r of all) {
                      if (r && r.title && String(r.title).toLowerCase().trim() === String(delTitle).toLowerCase().trim()) {
                        if (r.id) await tbl.delete(r.id).catch(function () {});
                      }
                    }
                  } catch (_) {}
                }
              };
              await delByTitle(store);
              await delByTitle(dbInstance.custom_songs);
              await delByTitle(dbInstance.song_book);
              if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb) {
                await delByTitle(window.churchDexieDb.songs);
                await delByTitle(window.churchDexieDb.custom_songs);
                await delByTitle(window.churchDexieDb.song_book);
              }
            }
          } else if (segment === 'timeline') {
            await store.delete(delId).catch(function () {});
            if (dbInstance.custom_timeline) await dbInstance.custom_timeline.delete(delId).catch(function () {});
            if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.custom_timeline) {
              await window.churchDexieDb.custom_timeline.delete(delId).catch(function () {});
            }
          } else if (segment === 'announcements') {
            const strId = String(delId);
            try {
              const blKey = 'sanctuary_deleted_announcements_blacklist';
              let bl = [];
              try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
              const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
              blSet.add(strId);
              localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
            } catch (_) {}
            if (typeof window.addDeletedAnnouncementToBlacklist === 'function') {
              try { window.addDeletedAnnouncementToBlacklist(delId); } catch (_) {}
            }
            await store.delete(delId).catch(function () {});
            if (dbInstance.announcements) await dbInstance.announcements.delete(delId).catch(function () {});
            if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.announcements) {
              await window.churchDexieDb.announcements.delete(delId).catch(function () {});
            }
          } else if (segment === 'today_song_selection') {
            const dateKey = remotePayload.date_key || delId;
            await store.delete(dateKey).catch(function () {});
            if (dbInstance.todays_song_selection) await dbInstance.todays_song_selection.delete(dateKey).catch(function () {});
            if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.todays_song_selection) {
              await window.churchDexieDb.todays_song_selection.delete(dateKey).catch(function () {});
            }
          } else {
            await store.delete(delId).catch(function () {});
          }

          if (reg.onApplied) reg.onApplied({ id: delId, title: delTitle, date_key: delId }, 'delete');
        } else {
          await store.put(remotePayload);
          if (segment === 'songbook') {
            if (dbInstance.custom_songs) await dbInstance.custom_songs.put(remotePayload).catch(function () {});
            if (dbInstance.song_book) await dbInstance.song_book.put(remotePayload).catch(function () {});
          }
          if (reg.onApplied) reg.onApplied(remotePayload, op);
        }
      } catch (dexErr) {
        console.warn('[syncWrite] Local optimistic write warning:', dexErr);
      }
    }

    // If offline or client unavailable, queue into Dexie outbox
    if (!isOnline || !client) {
      await queueOutbox(segment, op, remotePayload, dbInstance);
      return { success: true, data: remotePayload, queuedOffline: true };
    }

    // Remote write to Supabase
    try {
      let result = null;
      if (op === 'delete') {
        const delId = remotePayload.id || remotePayload.date_key || remotePayload;
        const delTitle = remotePayload.title;
        const nowIso = new Date().toISOString();
        const pkCol = (targetTable === 'almanac_entries' || (targetTable === 'todays_song_selection' && (remotePayload.date_key || /^\d{4}-\d{2}-\d{2}$/.test(String(delId))))) ? 'date_key' : 'id';

        if (targetTable === 'songs') {
          // Complete hard DELETE from Supabase cloud
          let delQuery = client.from('songs').delete();
          if (delId) {
            delQuery = delQuery.eq('id', delId);
          } else if (delTitle) {
            delQuery = delQuery.eq('title', delTitle);
          }
          const res = await delQuery.select();
          if (res.error) {
            console.warn('[syncWrite] Hard delete songs error:', res.error);
            // Fallback soft delete if delete permission is restricted
            const softRes = await client.from('songs').update({ deleted_at: nowIso, updated_at: nowIso }).eq('id', delId).select().maybeSingle().catch(function () {});
            result = (softRes && softRes.data) || { id: delId, deleted_at: nowIso };
          } else {
            result = (res.data && res.data[0]) || { id: delId, title: delTitle };
          }
          if (delTitle && delId && delTitle !== delId) {
            client.from('songs').delete().eq('title', delTitle).then(function () {}).catch(function () {});
          }
        } else {
          // Complete hard DELETE from Supabase backend database for all tables to free database space
          let delQuery = client.from(targetTable).delete().eq(pkCol, delId);
          const res = await delQuery.select();
          if (res.error) {
            console.warn('[syncWrite] Remote hard delete failed for ' + targetTable + ':', res.error);
            const updatePayload = { deleted_at: nowIso, updated_at: nowIso };
            if (targetTable === 'announcements' || segment === 'announcements') {
              updatePayload.is_active = false;
            }
            const softRes = await client
              .from(targetTable)
              .update(updatePayload)
              .eq(pkCol, delId)
              .select()
              .maybeSingle()
              .catch(function () {});
            result = (softRes && softRes.data) || { [pkCol]: delId, deleted_at: nowIso };
          } else {
            result = (res.data && res.data[0]) || { [pkCol]: delId };
          }
        }
      } else {
        const res = await client.from(targetTable).upsert(remotePayload, { onConflict: onConflictKey }).select().maybeSingle();
        if (res.error) throw res.error;
        result = res.data || remotePayload;

        if (segment === 'announcements') {
          triggerOneSignalAnnouncementPush(remotePayload);
        }
      }

      // Bridge event to ChurchSync emitter so app.js onChange listeners are invoked immediately on the writing device too
      if (typeof window !== 'undefined' && window.ChurchSync && typeof window.ChurchSync.emit === 'function') {
        try {
          const evType = op === 'delete' ? 'DELETE' : (op === 'insert' ? 'INSERT' : 'UPDATE');
          const payloadData = op === 'delete'
            ? { eventType: evType, old: { id: remotePayload.id || remotePayload.date_key || remotePayload, title: remotePayload.title } }
            : { eventType: evType, new: result };
          window.ChurchSync.emit(targetTable + ':change', payloadData);
          if (targetTable === 'songs') {
            window.ChurchSync.emit('song_book:change', payloadData);
          }
          window.ChurchSync.emit('anyChange', { table: targetTable, payload: payloadData });
        } catch (_) {}
      }

      return { success: true, data: result };
    } catch (netErr) {
      console.warn('[syncWrite] Remote write error, queuing to outbox:', netErr);
      await queueOutbox(segment, op, remotePayload, dbInstance);
      return { success: true, data: remotePayload, queuedOffline: true, error: netErr };
    }
  }

  async function handleAlmanacBulkImport(entries, isOnline, client, dbInstance) {
    const nowIso = new Date().toISOString();
    const normalized = entries.map(function (e) {
      return Object.assign({}, e, {
        date_key: e.date_key,
        year: e.year || (e.date_key ? Number(e.date_key.split('-')[0]) : 2026),
        updated_at: e.updated_at || nowIso
      });
    });

    if (dbInstance && dbInstance.almanac_entries) {
      try {
        await dbInstance.transaction('rw', dbInstance.almanac_entries, async function () {
          await dbInstance.almanac_entries.bulkPut(normalized);
        });
      } catch (e) {
        console.warn('[syncWrite] Almanac bulk Dexie write warning:', e);
      }
    }

    if (typeof window !== 'undefined' && window.CHURCH_DATA) {
      if (!window.CHURCH_DATA.almanacDatabase) window.CHURCH_DATA.almanacDatabase = {};
      normalized.forEach(function (e) {
        window.CHURCH_DATA.almanacDatabase[e.date_key] = e;
      });
      try {
        localStorage.setItem('sanctuary_custom_almanac', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
      } catch (_) {}
    }

    if (typeof window !== 'undefined' && typeof window.renderAlmanacModule === 'function') {
      try { window.renderAlmanacModule(); } catch (_) {}
    }

    if (!isOnline || !client) {
      await queueOutbox('almanac', 'insert', normalized, dbInstance);
      return { success: true, count: normalized.length, queuedOffline: true };
    }

    try {
      const res = await client.from('almanac_entries').upsert(normalized, { onConflict: 'date_key' });
      if (res.error) throw res.error;
      return { success: true, count: normalized.length };
    } catch (e) {
      console.warn('[syncWrite] Almanac remote batch failed, queued offline:', e);
      await queueOutbox('almanac', 'insert', normalized, dbInstance);
      return { success: true, count: normalized.length, queuedOffline: true, error: e };
    }
  }

  async function queueOutbox(segment, op, payload, dbInstance) {
    const dbInst = dbInstance || SyncEngine._getDb();
    if (!dbInst || !dbInst.sync_outbox) return;

    try {
      await dbInst.sync_outbox.put({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('outbox-' + Date.now()),
        segment: segment,
        op: op,
        payload: payload,
        created_at: Date.now(),
        retry_count: 0
      });
      console.log('[syncWrite] Queued write for ' + segment + ' (' + op + ') to offline outbox.');
    } catch (e) {
      console.warn('[syncWrite] queueOutbox error:', e);
    }
  }

  function triggerOneSignalAnnouncementPush(announcement) {
    try {
      const title = announcement.title || 'Church Announcement';
      const body = announcement.body || announcement.details || 'New announcement posted';

      if (window.plugins && window.plugins.OneSignal && window.plugins.OneSignal.postNotification) {
        window.plugins.OneSignal.postNotification({
          contents: { en: body },
          headings: { en: '📢 ' + title },
          included_segments: ['All']
        });
      }
      if (window.OneSignal && typeof window.OneSignal.sendSelfNotification === 'function') {
        window.OneSignal.sendSelfNotification(title, body, window.location.href);
      }
    } catch (_) {}
  }

  // ── 7. useSync & subscribeSync Reactive Data Hooks
  function useSync(segment) {
    const reg = syncRegistry[segment];
    const dbInstance = SyncEngine._getDb();
    const store = (dbInstance && reg) ? dbInstance[reg.storeName] : null;

    return {
      get data() {
        return store ? store.toArray() : Promise.resolve([]);
      },
      get loading() {
        return SyncEngine.status === 'syncing';
      },
      get lastSyncedAt() {
        return SyncEngine.lastSyncedAt;
      }
    };
  }

  function subscribeSync(segment, callback) {
    const reg = syncRegistry[segment];
    if (!reg) return function () {};

    const dbInstance = SyncEngine._getDb();
    const store = dbInstance ? dbInstance[reg.storeName] : null;
    let active = true;

    async function emitLatest() {
      if (!active) return;
      try {
        const records = store ? await store.toArray() : [];
        callback({
          data: records,
          loading: SyncEngine.status === 'syncing',
          lastSyncedAt: SyncEngine.lastSyncedAt
        });
      } catch (e) {
        console.warn('[subscribeSync] Emit error for ' + segment + ':', e);
      }
    }

    emitLatest();

    const unbind = SyncEngine.onStatusChange(function () {
      emitLatest();
    });

    const handler = function () {
      emitLatest();
    };

    window.addEventListener('church:sync:' + segment, handler);

    return function () {
      active = false;
      unbind();
      window.removeEventListener('church:sync:' + segment, handler);
    };
  }

  // ── 8. Super Admin Sync Status Indicator Widget (Live Cloud Sync Pill Companion)
  const SyncStatusIndicator = {
    container: null,
    textEl: null,
    iconWrap: null,
    lastSyncingTimestamp: 0,
    currentStatus: 'idle',
    _pendingSyncedTimer: null,
    _pulseTimer: null,

    mount: function () {
      this.container = document.getElementById('syncEngineStatusIndicator');
      if (!this.container) return;
      this.iconWrap = this.container.querySelector('.sync-pill-icon-wrap');

      const self = this;
      if (this.container) {
        this.container.addEventListener('click', async function (e) {
          e.preventDefault();

          // Prevent duplicate sync requests
          if (SyncEngine._isPulling || self.currentStatus === 'syncing') {
            if (typeof window.showToast === 'function') {
              window.showToast('Cloud Sync: Synchronization already in progress… 🔄');
            }
            return;
          }

          if (!navigator.onLine) {
            self.setStatus('offline');
            if (typeof window.showToast === 'function') {
              window.showToast('You are currently offline. Local church data is preserved. ☁️');
            }
            return;
          }

          if (typeof window.triggerManualAppRefresh === 'function') {
            await window.triggerManualAppRefresh();
          } else {
            await SyncEngine.performSync();
          }
        });

        this.container.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            self.container.click();
          }
        });
      }

      this.checkVisibility();

      SyncEngine.onStatusChange(function (status) {
        self.updateState(status);
      });

      window.addEventListener('storage', function () { self.checkVisibility(); });
      window.addEventListener('church:auth:changed', function () { self.checkVisibility(); });

      // Apply initial state based on network
      this.setStatus(navigator.onLine ? (SyncEngine.status || 'idle') : 'offline');
    },

    blinkOnce: function () {
      if (!this.container) return;
      const self = this;
      if (this._pulseTimer) clearTimeout(this._pulseTimer);
      this.container.classList.remove('is-just-synced');
      void this.container.offsetWidth; // Force CSS animation restart
      this.container.classList.add('is-just-synced');
      this._pulseTimer = setTimeout(function () {
        if (self.container) self.container.classList.remove('is-just-synced');
      }, 500);
    },

    checkVisibility: function () {
      if (!this.container) return;
      if (canWrite() || isSuperAdmin()) {
        this.container.style.display = 'inline-flex';
      } else {
        this.container.style.display = 'none';
      }
    },

    updateState: function (status) {
      if (!this.container) return;
      this.checkVisibility();
      this.setStatus(status);
    },

    setStatus: function (status) {
      let norm = status;
      if (norm === 'processed' || norm === 'success') norm = 'synced';
      if (norm === 'processing') norm = 'syncing';
      if (norm === 'error') norm = 'failed';

      this.currentStatus = norm;
      if (!this.container) return;

      this.container.setAttribute('data-status', norm);

      let labelText = 'Idle (Tap to sync)';
      switch (norm) {
        case 'syncing':
          labelText = 'Syncing in progress…';
          break;
        case 'offline':
          labelText = 'Offline (Saved locally)';
          break;
        case 'failed':
          labelText = 'Sync Failed (Tap to retry)';
          break;
        case 'synced':
          labelText = 'Sync Successful';
          break;
        case 'idle':
        default:
          labelText = 'Idle (Tap to sync)';
          break;
      }
      this.container.setAttribute('title', `Cloud Sync: ${labelText}`);
      this.container.setAttribute('aria-label', `Cloud Sync Status: ${labelText}`);
    }
  };

  // ── 9. Global Exports (v2)
  window.SyncEngine = SyncEngine;
  window.syncDb = syncDb;
  window.syncRegistry = syncRegistry;
  window.syncWrite = syncWrite;
  window.canSyncWrite = canWrite;
  window.useSync = useSync;
  window.subscribeSync = subscribeSync;
  window.SyncStatusIndicator = SyncStatusIndicator;

  // Initialize on load
  function init() {
    // Signal to supabase-sync.js that v2 unified channel is now active.
    // supabase-sync.js checks window.__syncEngineV2Active before calling _initRealtime().
    window.__syncEngineV2Active = true;
    SyncEngine.start();
    SyncStatusIndicator.mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
})();
