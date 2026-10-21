#!/usr/bin/env node
/**
 * Patch script: apply targeted changes to sync-engine.js for v2
 * Run: node /data/data/com.termux/files/home/ChurchCompanion/scripts/patch-sync-engine.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
const path = '/data/data/com.termux/files/home/ChurchCompanion/app/src/main/assets/js/sync-engine.js';

let src = readFileSync(path, 'utf8');

// ── PATCH 1: Update file version comment ──────────────────────────────────────
src = src.replace(
  'ALL SAINTS\' CHURCH — Master Sync Engine v1 Runtime',
  'ALL SAINTS\' CHURCH — Master Sync Engine v2 Runtime'
);
src = src.replace(
  'Unified Real-Time Sync Engine across all 6 core data segments:',
  'Unified Real-Time Sync Engine across all 11 synced data segments:'
);
// Replace segment list in header comment
src = src.replace(
  ' *   6. almanac (table: almanac_entries)\n *   7. timeline (table: timeline_events)\n *\n * Features:\n *   - Delta Pull with automatic fallback to full/segment pull\n *   - Unified Supabase Realtime channel across live database tables\n *   - Server-wins & higher-version conflict resolution\n *   - Soft-delete tombstones for songs, hard delete for announcements & prayers\n *   - Admin syncWrite(segment, op, payload) with offline outbox queue\n *   - Shared Dexie Database with ChurchCompanionOfflineDB\n *   - In-place background updates WITHOUT auto-jumping or page resets\n *   - Super Admin status indicator widget',
  ` *   6. almanac             (table: almanac_entries)
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
 *   - supabase-sync.js per-table _initRealtime suppressed via window flag`
);

// ── PATCH 2: Dexie schema — add v6 with lastSyncedAt store ───────────────────
// Replace the closing of v5 schema + the comment about v6
src = src.replace(
  `          sync_outbox: "id, segment, op, created_at, retry_count"\n        });`,
  `          sync_outbox: "id, segment, op, created_at, retry_count"\n        });\n        // v6: per-table lastSyncedAt delta tracking + updated_at on request tables\n        db.version(6).stores({\n          session: "id",\n          profiles: "id, email, role, is_youth, updated_at",\n          congregation_members: "id, display_name, updated_at",\n          prayer_book: "id, category, sort_order, updated_at",\n          custom_songs: "id, book_reference, song_number, title, category, lyrics",\n          custom_timeline: "id, year, title, sort_order",\n          songs: "id, title, category, song_number, updated_at, deleted_at",\n          song_book: "id, title, category, song_number, updated_at, deleted_at",\n          timeline_events: "id, year, sort_order, updated_at, deleted_at",\n          todays_song_selection: "id, date_key, updated_at",\n          announcements: "id, priority, is_active, updated_at",\n          almanac_entries: "date_key, year, updated_at",\n          chat_messages: "id, client_message_id, room_id, sender_id, created_at, reply_to_message_id, deleted_at",\n          message_deliveries: "id, [message_id+user_id], message_id, user_id, delivered_at",\n          message_reads: "id, [message_id+user_id], message_id, user_id, read_at",\n          message_reactions: "id, [message_id+user_id], message_id, user_id, emoji, created_at",\n          chat_outbox: "client_message_id, room_id, status, retry_count, created_at",\n          admin_outbox: "id, table, op, created_at",\n          admin_requests: "id, user_id, status, updated_at",\n          youth_access_requests: "id, user_id, status, updated_at",\n          posts: "id, sort_order, updated_at, deleted_at",\n          audit_log: "id, action, created_at",\n          sync_meta: "key",\n          sync_outbox: "id, segment, op, created_at, retry_count",\n          lastSyncedAt: "table"\n        });`
);

// ── PATCH 3: Add congregation_members, profiles, requests, posts segments ─────
// Find end of timeline segment registration and insert new segments before closing brace
src = src.replace(
  `    // 7. timeline
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
          if (typeof window.timelineItems !== 'undefined' && Array.isArray(window.timelineItems)) {
            const idx = window.timelineItems.findIndex(x => x.id === item.id);
            if (op === 'delete') {
              if (idx >= 0) window.timelineItems.splice(idx, 1);
            } else {
              const formatted = {
                id: item.id,
                year: item.year,
                title: item.title,
                description: item.description,
                rawDate: item.year,
                date: item.year
              };
              if (idx >= 0) window.timelineItems[idx] = formatted;
              else window.timelineItems.unshift(formatted);
            }
          }
          if (typeof window.renderTimelineList === 'function') {
            try { window.renderTimelineList(); } catch (_) {}
          }
        } catch (_) {}
      }
    }
  };`,
  `    // 7. timeline
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
          if (typeof window.timelineItems !== 'undefined' && Array.isArray(window.timelineItems)) {
            const idx = window.timelineItems.findIndex(x => x.id === item.id);
            if (op === 'delete') {
              if (idx >= 0) window.timelineItems.splice(idx, 1);
            } else {
              const formatted = {
                id: item.id,
                year: item.year,
                title: item.title,
                description: item.description,
                rawDate: item.year,
                date: item.year
              };
              if (idx >= 0) window.timelineItems[idx] = formatted;
              else window.timelineItems.unshift(formatted);
            }
          }
          if (typeof window.renderTimelineList === 'function') {
            try { window.renderTimelineList(); } catch (_) {}
          }
        } catch (_) {}
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
                parsed.role = item.role;
                parsed.is_youth = item.is_youth;
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
  };`
);

// ── PATCH 4: Replace _subscribeRealtime to add all tables + anon auth + setAuth
src = src.replace(
  `    _subscribeRealtime: function () {
      const client = this._getClient();
      if (!client) return;

      if (this._realtimeChannel) {
        try { client.removeChannel(this._realtimeChannel); } catch (_) {}
        this._realtimeChannel = null;
      }

      const self = this;
      try {
        const channel = client.channel('church-companion-sync-unified');
        const tables = [
          'songs',
          'prayer_book',
          'announcements',
          'todays_song_selection',
          'almanac_entries',
          'timeline_events'
        ];

        tables.forEach(function (table) {
          channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: table },
            function (payload) {
              self._handleRealtimeEvent(table, payload);
            }
          );
        });

        channel.subscribe(function (status, err) {
          if (status === 'SUBSCRIBED') {
            console.log('[SyncEngine] Unified Realtime connected to all synced tables.');
            self._reconnectAttempts = 0;
            self._setStatus('synced');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[SyncEngine] Realtime disconnected (' + status + '). Scheduling backoff reconnect...', err || '');
            self._setStatus(navigator.onLine ? 'error' : 'offline');
            self._scheduleReconnect();
          }
        });

        this._realtimeChannel = channel;
      } catch (e) {
        console.error('[SyncEngine] Realtime channel setup error:', e);
        this._scheduleReconnect();
      }
    },`,
  `    _subscribeRealtime: function () {
      const client = this._getClient();
      if (!client) return;

      // Prevent duplicate channel from supabase-sync.js per-table system
      window.__syncEngineV2Active = true;

      if (this._realtimeChannel) {
        try { client.removeChannel(this._realtimeChannel); } catch (_) {}
        this._realtimeChannel = null;
      }

      const self = this;
      try {
        // All 11 synced tables in ONE unified channel
        const tables = [
          'songs',
          'prayer_book',
          'announcements',
          'todays_song_selection',
          'almanac_entries',
          'timeline_events',
          'congregation_members',
          'profiles',
          'admin_requests',
          'youth_access_requests',
          'posts'
        ];

        const channel = client.channel('church-companion-sync-v2');
        tables.forEach(function (table) {
          channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: table },
            function (payload) {
              self._lastEventAt = Date.now();
              self._handleRealtimeEvent(table, payload);
            }
          );
        });

        channel.subscribe(function (status, err) {
          if (status === 'SUBSCRIBED') {
            console.log('[SyncEngine v2] Unified Realtime connected (' + tables.length + ' tables).');
            self._reconnectAttempts = 0;
            self._lastEventAt = Date.now();
            self._setStatus('synced');
            // Catch-up delta pull after any reconnect
            self.pullDelta();
            // Start watchdog
            self._startWatchdog();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[SyncEngine v2] Realtime disconnected (' + status + ').', err || '');
            self._setStatus(navigator.onLine ? 'error' : 'offline');
            self._stopWatchdog();
            self._scheduleReconnect();
          }
        });

        this._realtimeChannel = channel;
      } catch (e) {
        console.error('[SyncEngine v2] Realtime channel setup error:', e);
        this._scheduleReconnect();
      }
    },`
);

// ── PATCH 5: Add _startWatchdog / _stopWatchdog before _scheduleReconnect ────
src = src.replace(
  `    _scheduleReconnect: function () {`,
  `    _watchdogTimer: null,
    _lastEventAt: 0,
    WATCHDOG_MS: 60000,

    _startWatchdog: function () {
      this._stopWatchdog();
      const self = this;
      this._watchdogTimer = setInterval(function () {
        if (!navigator.onLine) return;
        const elapsed = Date.now() - self._lastEventAt;
        if (elapsed > self.WATCHDOG_MS) {
          console.warn('[SyncEngine v2] Watchdog: no event for ' + Math.round(elapsed / 1000) + 's. Force reconnect.');
          self._setStatus('error');
          self._stopWatchdog();
          if (self._realtimeChannel && self._getClient()) {
            try { self._getClient().removeChannel(self._realtimeChannel); } catch (_) {}
            self._realtimeChannel = null;
          }
          self._subscribeRealtime();
        }
      }, 15000); // check every 15 s
    },

    _stopWatchdog: function () {
      if (this._watchdogTimer) {
        clearInterval(this._watchdogTimer);
        this._watchdogTimer = null;
      }
    },

    _scheduleReconnect: function () {`
);

// ── PATCH 6: Replace pullDelta to use per-table updated_at delta ──────────────
src = src.replace(
  `    pullDelta: async function () {
      if (this._isPulling) return;
      this._isPulling = true;

      try {
        this._setStatus('syncing');
        const client = this._getClient();
        if (!client) {
          this._setStatus(navigator.onLine ? 'error' : 'offline');
          return;
        }

        const segments = Object.keys(syncRegistry);
        const dbInstance = this._getDb();

        for (const seg of segments) {
          if (!dbInstance) continue;
          let lastSeq = 0;
          try {
            if (dbInstance.sync_meta) {
              const metaKey = 'last_seq_' + seg;
              const metaRecord = await dbInstance.sync_meta.get(metaKey);
              lastSeq = metaRecord ? Number(metaRecord.value) || 0 : 0;
            }
          } catch (_) {}

          if (lastSeq === 0) {
            await this._fullPullSegment(seg);
          } else {
            const ok = await this._deltaPullSegment(seg, lastSeq);
            if (!ok) {
              // Fallback to full pull if sync_changes is missing
              await this._fullPullSegment(seg);
            }
          }
        }

        this._lastSyncedAt = new Date();
        this._setStatus('synced');
      } catch (err) {
        console.warn('[SyncEngine] pullDelta error:', err);
        this._setStatus(navigator.onLine ? 'error' : 'offline');
      } finally {
        this._isPulling = false;
      }
    },`,
  `    pullDelta: async function () {
      if (this._isPulling) return;
      this._isPulling = true;
      const IS_DEV = (typeof location !== 'undefined' && location.hostname === 'localhost');

      try {
        this._setStatus('syncing');
        const client = this._getClient();
        if (!client) {
          this._setStatus(navigator.onLine ? 'error' : 'offline');
          return;
        }

        const dbInstance = this._getDb();
        const segments = Object.keys(syncRegistry);

        for (const seg of segments) {
          if (!dbInstance) continue;
          const reg = syncRegistry[seg];
          if (!reg) continue;

          // Read per-table lastSyncedAt from Dexie lastSyncedAt store
          let lastAt = null;
          try {
            if (dbInstance.lastSyncedAt) {
              const rec = await dbInstance.lastSyncedAt.get(reg.table);
              lastAt = rec ? rec.ts : null;
            }
          } catch (_) {}

          if (!lastAt) {
            // First launch: full pull
            await this._fullPullSegment(seg);
          } else {
            // Delta pull by updated_at > lastAt (includes soft-deleted rows)
            await this._deltaByUpdatedAt(seg, lastAt);
          }
        }

        this._lastSyncedAt = new Date();
        this._setStatus('synced');
        if (IS_DEV) console.log('[RT] pullDelta done at', this._lastSyncedAt.toISOString());
      } catch (err) {
        console.warn('[SyncEngine v2] pullDelta error:', err);
        this._setStatus(navigator.onLine ? 'error' : 'offline');
      } finally {
        this._isPulling = false;
      }
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
            const isDeleted = row.deleted_at != null;

            if (isDeleted) {
              // Tombstone: remove from Dexie
              if (store && keyVal) await store.delete(keyVal).catch(function () {});
              if (segment === 'songbook') {
                if (dbInstance.custom_songs) await dbInstance.custom_songs.delete(keyVal).catch(function () {});
                if (dbInstance.song_book) await dbInstance.song_book.delete(keyVal).catch(function () {});
              }
              if (reg.onApplied) reg.onApplied(row, 'delete');
            } else {
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

          if (IS_DEV) console.log('[RT] delta ' + reg.table + ' page=' + page + ' count=' + rows.length);
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
    },`
);

// ── PATCH 7: Add anonymous auth helper before SyncEngine definition ────────────
src = src.replace(
  `  // ── 5. SyncEngine Implementation`,
  `  // ── 4b. Anonymous Auth: ensure a persisted anon session exists before subscribing
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

  // ── 5. SyncEngine Implementation`
);

// ── PATCH 8: Update start() to call ensureAnonSession + setupAuthListener ────
src = src.replace(
  `    start: async function () {
      const self = this;
      window.addEventListener('online', function () {
        console.log('[SyncEngine] Online detected — running delta pull & reconnecting channel');
        self._reconnectAttempts = 0;
        self._setStatus('syncing');
        self.pullDelta().then(function () {
          self._subscribeRealtime();
          self.flushOutbox();
        });
      });

      window.addEventListener('offline', function () {
        console.log('[SyncEngine] Offline mode active');
        self._setStatus('offline');
      });

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          self.pullDelta();
        }
      });

      if (!navigator.onLine) {
        this._setStatus('offline');
        return;
      }

      this._setStatus('syncing');
      await this.pullDelta();
      this._subscribeRealtime();
    },`,
  `    start: async function () {
      const self = this;
      const IS_DEV = (typeof location !== 'undefined' && location.hostname === 'localhost');

      window.addEventListener('online', function () {
        if (IS_DEV) console.log('[RT] Online — delta pull + reconnect');
        self._reconnectAttempts = 0;
        self._setStatus('syncing');
        self.pullDelta().then(function () {
          self._subscribeRealtime();
          self.flushOutbox();
        });
      });

      window.addEventListener('offline', function () {
        if (IS_DEV) console.log('[RT] Offline');
        self._setStatus('offline');
        self._stopWatchdog();
      });

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          self._lastEventAt = Date.now(); // reset watchdog on resume
          self.pullDelta();
        }
      });

      // Setup auth listener for setAuth on token refresh
      setupAuthListener();

      // Ensure anonymous session exists before subscribing
      await ensureAnonSession();

      if (!navigator.onLine) {
        this._setStatus('offline');
        return;
      }

      this._setStatus('syncing');
      await this.pullDelta();
      this._subscribeRealtime();
    },`
);

// ── PATCH 9: Update _handleRealtimeEvent to log in dev mode ──────────────────
src = src.replace(
  `    _handleRealtimeEvent: async function (table, payload) {
      const dbInstance = this._getDb();
      if (!dbInstance) return;

      try {
        const eventType = (payload.eventType || payload.type || '').toUpperCase();
        const newRec = payload.new || payload.record;
        const oldRec = payload.old || payload.old_record;

        let targetSegment = null;`,
  `    _handleRealtimeEvent: async function (table, payload) {
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

        let targetSegment = null;`
);

// ── PATCH 10: Add admin_requests, youth_access_requests, congregation_members,
// profiles, posts to targetSegment routing in _handleRealtimeEvent ─────────────
src = src.replace(
  `        else if (table === 'almanac_entries') targetSegment = 'almanac';
        else if (table === 'timeline_events') targetSegment = 'timeline';`,
  `        else if (table === 'almanac_entries') targetSegment = 'almanac';
        else if (table === 'timeline_events') targetSegment = 'timeline';
        else if (table === 'congregation_members') targetSegment = 'congregation_members';
        else if (table === 'profiles') targetSegment = 'profiles';
        else if (table === 'admin_requests') targetSegment = 'admin_requests';
        else if (table === 'youth_access_requests') targetSegment = 'youth_access_requests';
        else if (table === 'posts') targetSegment = 'posts';`
);

// ── PATCH 11: Update version comment in _fullPullSegment ─────────────────────
src = src.replace(
  `        if (IS_DEV) console.log('[RT] delta ' + reg.table + ' page=' + page + ' count=' + rows.length);`,
  `        if (IS_DEV) console.log('[RT] delta ' + reg.table + ' page=' + page + ' rows=' + rows.length);`
);

// ── PATCH 12: Update _fullPullSegment lastSyncedAt storage ───────────────────
src = src.replace(
  `        if (dbInstance.sync_meta) {
          await dbInstance.sync_meta.put({
            key: 'last_seq_' + segment,
            value: Date.now(),
            updated_at: new Date().toISOString()
          }).catch(function () {});
        }`,
  `        // Store lastSyncedAt for this table
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
        }`
);

// ── PATCH 13: Update exports to expose v2 version ────────────────────────────
src = src.replace(
  `  // ── 9. Global Exports
  window.SyncEngine = SyncEngine;`,
  `  // ── 9. Global Exports (v2)
  window.SyncEngine = SyncEngine;`
);

// ── PATCH 14: Guard supabase-sync.js _initRealtime to prevent duplicate channels
// When sync-engine.js v2 is active, suppress per-table channels from supabase-sync.js
// by patching the exported ChurchSync init flag after it runs
src = src.replace(
  `  function init() {
    SyncEngine.start();
    SyncStatusIndicator.mount();
  }`,
  `  function init() {
    // Signal to supabase-sync.js that v2 unified channel is now active.
    // supabase-sync.js checks window.__syncEngineV2Active before calling _initRealtime().
    window.__syncEngineV2Active = true;
    SyncEngine.start();
    SyncStatusIndicator.mount();
  }`
);

writeFileSync(path, src, 'utf8');
console.log('Patched sync-engine.js successfully. Lines:', src.split('\n').length);
