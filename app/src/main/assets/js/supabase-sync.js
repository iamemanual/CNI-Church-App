/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Supabase Real-Time Sync & WhatsApp-Style Chat Engine v3
 * ============================================================================
 * Production real-time synchronization, Dexie offline-first cache, outbox replay,
 * delivery/read receipts, typing presence, reactions, media uploads, and RLS.
 * ============================================================================
 */

(function () {
  "use strict";

  const _cfg = (window.SUPABASE_CONFIG || window.CHURCH_CONFIG || {});
  const PROXY_BASE = "/api/supabase";
  const SUPABASE_URL = _cfg.supabaseUrl || _cfg.SUPABASE_URL || "";
  const REALTIME_KEY = _cfg.supabaseAnonKey || _cfg.SUPABASE_ANON_KEY || _cfg.supabaseKey || _cfg.SUPABASE_KEY || "";

  // Single Supabase Client instance shared across application
  let _supabaseClient = null;
  if (typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function" && SUPABASE_URL && REALTIME_KEY) {
    try {
      _supabaseClient = window.supabase.createClient(SUPABASE_URL, REALTIME_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
        realtime: { params: { eventsPerSecond: 20 } }
      });
      window.churchSupabase = _supabaseClient;
      console.log(`[Supabase] Startup: URL=${SUPABASE_URL} | Client created: true`);
    } catch (err) {
      console.error(`[Supabase] Startup: URL=${SUPABASE_URL} | Client created: false`, err);
    }
  } else {
    console.warn(`[Supabase] Startup: URL=${SUPABASE_URL || "none"} | Client created: false`);
  }

  // ── 1. Dexie Offline Database Schema (v4)
  let db = null;
  try {
    if (typeof Dexie !== "undefined") {
      db = new Dexie("ChurchCompanionOfflineDB");
      db.version(1).stores({
        session: "id",
        profiles: "id, email, role, is_youth",
        chat_messages: "id, chat_type, sender_id, created_at, deleted_at",
        admin_requests: "id, user_id, status, requested_at",
        youth_access_requests: "id, user_id, status, requested_at",
        custom_songs: "id, title, category, lyrics",
        custom_timeline: "id, year, title, sort_order"
      });
      db.version(2).stores({
        session: "id",
        profiles: "id, email, role, is_youth",
        chat_messages: "id, chat_type, sender_id, created_at, deleted_at",
        admin_requests: "id, user_id, status, requested_at",
        youth_access_requests: "id, user_id, status, requested_at",
        custom_songs: "id, book_reference, song_number, title, category, lyrics",
        custom_timeline: "id, year, title, sort_order"
      });
      db.version(3).stores({
        session: "id",
        profiles: "id, email, role, is_youth",
        chat_messages: "id, chat_type, sender_id, created_at, deleted_at",
        admin_requests: "id, user_id, status, requested_at",
        youth_access_requests: "id, user_id, status, requested_at",
        custom_songs: "id, book_reference, song_number, title, category, lyrics",
        custom_timeline: "id, year, title, sort_order",
        chat_outbox: "++autoId, msgId, channel, status, createdAt"
      });
      db.version(4).stores({
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
        audit_log: "id, action, created_at"
      });
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
      window.churchDexieDb = db;
    }
  } catch (err) {
    console.warn("[Sync Engine] Dexie init error:", err);
  }

  // ── Internal State
  const _state = {
    online: navigator.onLine,
    realtimeConnected: false,
    realtimeClient: _supabaseClient,
    channels: {},
    presenceChannels: {},
    outboxProcessing: false,
    listeners: {}
  };

  // ── Event Emitter
  function _on(event, fn) {
    if (!_state.listeners[event]) _state.listeners[event] = [];
    _state.listeners[event].push(fn);
  }
  function _emit(event, data) {
    (_state.listeners[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error("[Sync] Listener error:", e); }
    });
  }

  // ── Connectivity Handler (Automatic sync disabled: all subsequent syncs are manual)
  window.addEventListener("online", () => {
    _state.online = true;
    console.log("[Sync Engine] Connection restored — online status active.");
    _emit("online");
  });

  window.addEventListener("offline", () => {
    _state.online = false;
    _state.realtimeConnected = false;
    console.log("[Sync Engine] Connection lost — switching to local Dexie cache");
    _emit("offline");
  });

  function _getProxyBase() {
    const loc = window.location;
    if (loc && loc.protocol && loc.protocol.startsWith("http") && loc.host) {
      return PROXY_BASE;
    }
    const savedHost = localStorage.getItem("church_server_host") || "127.0.0.1:5555";
    return "http://" + savedHost + PROXY_BASE;
  }

  // ── REST Transport (Direct Supabase Cloud with Proxy Fallback)
  async function _rest(method, table, params = {}, body = null) {
    const qs = new URLSearchParams();
    if (params.select) qs.set("select", params.select);
    if (params.filter) {
      Object.entries(params.filter).forEach(([k, v]) => qs.set(k, v));
    }
    if (params.order) qs.set("order", params.order);
    if (params.limit) qs.set("limit", params.limit);
    if (params.on_conflict) qs.set("on_conflict", params.on_conflict);

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (params.prefer) headers["Prefer"] = params.prefer;

    // Direct cloud transport (prioritized for Android standalone APK / WebView)
    if (SUPABASE_URL && REALTIME_KEY) {
      const directHeaders = {
        ...headers,
        "apikey": REALTIME_KEY,
        "Authorization": "Bearer " + REALTIME_KEY
      };
      const directUrl = SUPABASE_URL + "/rest/v1/" + table + (qs.toString() ? "?" + qs.toString() : "");
      try {
        const res = await fetch(directUrl, {
          method,
          headers: directHeaders,
          body: body ? JSON.stringify(body) : null
        });
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        if (!res.ok) {
          console.warn(`[Sync Engine] Supabase REST ${method} ${table} error ${res.status}:`, json);
          return { error: json || { message: "HTTP " + res.status }, data: null };
        }
        return { data: json, error: null };
      } catch (directErr) {
        console.warn(`[Sync Engine] Direct cloud request failed for ${table}:`, directErr);
      }
    }

    // Local proxy fallback (for local development server if running)
    const proxyBase = _getProxyBase();
    const proxyPath = proxyBase + "/rest/v1/" + table + (qs.toString() ? "?" + qs.toString() : "");
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(proxyPath, opts);
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        return { error: json || { message: "HTTP " + res.status }, data: null };
      }
      return { data: json, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  }

  // ── RPC transport (Direct Supabase Cloud with Proxy Fallback)
  async function _rpc(fnName, args = {}) {
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    if (SUPABASE_URL && REALTIME_KEY) {
      const directHeaders = {
        ...headers,
        "apikey": REALTIME_KEY,
        "Authorization": "Bearer " + REALTIME_KEY
      };
      const directUrl = SUPABASE_URL + "/rest/v1/rpc/" + fnName;
      try {
        const res = await fetch(directUrl, {
          method: "POST",
          headers: directHeaders,
          body: JSON.stringify(args)
        });
        const json = await res.json();
        return { data: json, error: res.ok ? null : json };
      } catch (directErr) {
        console.warn(`[Sync Engine] Direct RPC failed for ${fnName}:`, directErr);
      }
    }

    const proxyBase = _getProxyBase();
    const proxyPath = proxyBase + "/rest/v1/rpc/" + fnName;
    try {
      const res = await fetch(proxyPath, {
        method: "POST",
        headers,
        body: JSON.stringify(args)
      });
      const json = await res.json();
      return { data: json, error: res.ok ? null : json };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  }

  // ── 2. Unified Realtime Manager (Single Persistent Connection)
  // NOTE: Guarded — sync-engine.js v2 takes over when window.__syncEngineV2Active is set.
  function _initRealtime() {
    // If SyncEngine v2 is active, skip per-table channels to prevent duplicates
    if (typeof window !== 'undefined' && window.__syncEngineV2Active) {
      console.log('[Sync Engine v3] _initRealtime skipped — SyncEngine v2 unified channel is active.');
      return;
    }
    if (!_state.realtimeClient) {
      _state.realtimeClient = window.churchSupabase || _supabaseClient;
    }
    if (!_state.realtimeClient) {
      console.warn("[Sync Engine] Supabase client not available — realtime disabled");
      return;
    }

    try {
      Object.values(_state.channels).forEach(ch => {
        try { _state.realtimeClient.removeChannel(ch); } catch (_) {}
      });
      Object.values(_state.presenceChannels).forEach(pch => {
        try { _state.realtimeClient.removeChannel(pch); } catch (_) {}
      });

      const tablesToSync = [
        "prayer_book",
        "songs",
        "timeline_events",
        "todays_song_selection",
        "announcements",
        "chat_messages",
        "message_deliveries",
        "message_reads",
        "message_reactions",
        "congregation_members",
        "profiles",
        "almanac_entries",
        "admin_requests",
        "youth_access_requests"
      ];

      function _subscribeChannel(table) {
        if (!_state.realtimeClient) return;

        // Clean up previous channel instance if any
        if (_state.channels[table]) {
          try { _state.realtimeClient.removeChannel(_state.channels[table]); } catch (_) {}
          delete _state.channels[table];
        }

        const channel = _state.realtimeClient
          .channel("rt:" + table)
          .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: table
          }, async (payload) => {
            // 1. Immediately patch Dexie local cache
            await _patchDexieCache(table, payload);
            // 2. Emit granular and global event
            _emit(table + ":change", payload);
            // Redirect song_book to songs for backwards-compatibility
            if (table === "songs") {
              _emit("song_book:change", payload);
            }
            _emit("anyChange", { table, payload });
          })
          .subscribe((status, err) => {
            if (status === "SUBSCRIBED") {
              _state.realtimeConnected = true;
              _emit("realtimeConnected", { table });
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              console.warn(`[Sync Engine] Realtime channel status '${status}' on table '${table}':`, err || "");
              _state.realtimeConnected = false;
              _emit("realtimeDisconnected", { table, status });
              setTimeout(() => {
                console.log(`[Sync Engine] Re-subscribing table '${table}' after 5s...`);
                _subscribeChannel(table);
              }, 5000);
            }
          });

        _state.channels[table] = channel;
      }

      tablesToSync.forEach(table => {
        _subscribeChannel(table);
      });

      // Presence Channels for Congregation & Youth typing indicators
      _initPresenceChannel("congregation");
      _initPresenceChannel("youth");

      console.log("[Sync Engine] Realtime channels active for all 9 core tables + Presence");
    } catch (e) {
      console.error("[Sync Engine] Realtime initialization error:", e);
    }
  }

  // ── Presence for Debounced Typing Indicators
  function _initPresenceChannel(room) {
    if (!_state.realtimeClient) return;
    try {
      const pChannel = _state.realtimeClient.channel("presence:chat:" + room, {
        config: { presence: { key: (window.currentAuthSession && window.currentAuthSession.uid) || crypto.randomUUID() } }
      });

      pChannel.on("presence", { event: "sync" }, () => {
        const state = pChannel.presenceState();
        const activeTypers = [];
        const currentUid = window.currentAuthSession && window.currentAuthSession.uid;

        Object.values(state).forEach(presences => {
          presences.forEach(p => {
            if (p.isTyping && p.userId !== currentUid) {
              activeTypers.push({ userId: p.userId, userName: p.userName || "Someone", room });
            }
          });
        });

        _emit("typing:" + room, activeTypers);
      });

      pChannel.subscribe(async (status, err) => {
        if (status === "SUBSCRIBED") {
          _state.presenceChannels[room] = pChannel;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(`[Sync Engine] Presence channel status '${status}' for room '${room}':`, err || "");
          setTimeout(() => {
            _initPresenceChannel(room);
          }, 5000);
        }
      });
    } catch (e) {
      console.warn("[Sync Engine] Presence init error for " + room + ":", e);
    }
  }

  // Broadcast typing state over Presence (No DB writes!)
  function broadcastTyping(room, isTyping) {
    const pChannel = _state.presenceChannels[room];
    if (!pChannel) return;
    const user = window.currentAuthSession || {};
    try {
      pChannel.track({
        isTyping: !!isTyping,
        userId: user.uid || "anon",
        userName: user.display_name || "Member",
        updatedAt: Date.now()
      });
    } catch (e) {
      console.warn("[Sync] Error tracking typing presence:", e);
    }
  }

  // ── Helper: Purge song from all localStorage caches, Dexie databases, and add to deletion blacklist
  function _purgeLocalSong(id, title) {
    try {
      // 1. Blacklist
      const blKey = 'sanctuary_deleted_songs_blacklist';
      let bl = [];
      try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
      if (!Array.isArray(bl)) bl = [];
      const blSet = new Set(bl.map(x => String(x).toLowerCase().trim()));
      if (id) blSet.add(String(id).toLowerCase().trim());
      if (title) blSet.add(String(title).toLowerCase().trim());
      localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));

      // 2. Custom songs backup
      const cbKey = 'sanctuary_custom_songs_backup';
      let cb = [];
      try { cb = JSON.parse(localStorage.getItem(cbKey) || '[]'); } catch (_) { cb = []; }
      if (Array.isArray(cb)) {
        localStorage.setItem(cbKey, JSON.stringify(cb.filter(s => s && s.id !== id && (!title || !s.title || String(s.title).toLowerCase().trim() !== String(title).toLowerCase().trim()))));
      }

      // 3. Imported songs backup
      const ibKey = 'sanctuary_imported_songs';
      let ib = [];
      try { ib = JSON.parse(localStorage.getItem(ibKey) || '[]'); } catch (_) { ib = []; }
      if (Array.isArray(ib)) {
        localStorage.setItem(ibKey, JSON.stringify(ib.filter(s => s && s.id !== id && (!title || !s.title || String(s.title).toLowerCase().trim() !== String(title).toLowerCase().trim()))));
      }

      // 4. Dexie tables purge
      const purgeTableSync = (tbl) => {
        if (!tbl) return;
        try {
          if (id) tbl.delete(id).catch(() => {});
          if (title) {
            tbl.where('title').equalsIgnoreCase(title).delete().catch(() => {
              tbl.toArray().then(arr => {
                arr.forEach(r => {
                  if (r && r.title && String(r.title).toLowerCase().trim() === String(title).toLowerCase().trim()) {
                    if (r.id) tbl.delete(r.id).catch(() => {});
                  }
                });
              }).catch(() => {});
            });
          }
        } catch (_) {}
      };
      if (db) {
        purgeTableSync(db.songs);
        purgeTableSync(db.custom_songs);
        purgeTableSync(db.song_book);
      }
      if (typeof window !== "undefined" && window.churchDexieDb) {
        purgeTableSync(window.churchDexieDb.songs);
        purgeTableSync(window.churchDexieDb.custom_songs);
        purgeTableSync(window.churchDexieDb.song_book);
      }

      // 5. In-memory currentSongList
      if (typeof window !== "undefined" && Array.isArray(window.currentSongList)) {
        window.currentSongList = window.currentSongList.filter(s =>
          s && s.id !== id && (!title || !s.title || String(s.title).toLowerCase().trim() !== String(title).toLowerCase().trim())
        );
      }
    } catch (e) {
      console.warn('[Sync] _purgeLocalSong error:', e);
    }
  }

  // ── 2B. Direct UI DOM Fallback Helpers
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
      const activeList = (Array.isArray(list) ? list : []).filter(a => a && !blSet.has(String(a.id)));
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

  // ── 3. Dexie Local Cache Patching from Realtime
  async function _patchDexieCache(table, payload) {
    if (!db || !payload) return;
    try {
      const storeName = db[table] ? table : (table === "song_book" ? "songs" : null);
      if (!storeName || !db[storeName]) return;

      const eventType = payload.eventType || (payload.data && payload.data.type) || payload.type;
      const newRec = payload.new || (payload.data && payload.data.record) || payload.record;
      const oldRec = payload.old || (payload.data && payload.data.old_record) || payload.old_record;

      if (eventType === "INSERT" || eventType === "UPDATE") {
        if (newRec) {
          // Check for soft delete on songs
          if (table === "songs" && (newRec.deleted_at != null || newRec.is_active === false || newRec.is_deleted === true)) {
            if (newRec.id) {
              await db.songs.delete(newRec.id).catch(() => {});
              if (db.song_book) await db.song_book.delete(newRec.id).catch(() => {});
              if (db.custom_songs) await db.custom_songs.delete(newRec.id).catch(() => {});
              if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb) {
                if (window.churchDexieDb.songs) await window.churchDexieDb.songs.delete(newRec.id).catch(() => {});
                if (window.churchDexieDb.custom_songs) await window.churchDexieDb.custom_songs.delete(newRec.id).catch(() => {});
                if (window.churchDexieDb.song_book) await window.churchDexieDb.song_book.delete(newRec.id).catch(() => {});
              }
              _purgeLocalSong(newRec.id, newRec.title);
              // Background non-jumping songbook UI refresh
              if (typeof window.refreshSongBookCards === "function") {
                try { window.refreshSongBookCards(window.currentOpenSongBookKey); } catch (_) {}
              } else if (typeof window.renderAdditionalSongsFromDexie === "function") {
                try { window.renderAdditionalSongsFromDexie(); } catch (_) {}
              }
              if (window.currentOpenSong && (window.currentOpenSong.id === newRec.id || (window.currentOpenSong.title && window.currentOpenSong.title === newRec.title))) {
                if (typeof window.showToast === "function") window.showToast("The current hymn was removed on another device 🗑️");
              }
            }
            return;
          }

          // Check for soft delete on timeline_events
          if (table === "timeline_events" && (newRec.deleted_at != null || newRec.is_active === false || newRec.is_deleted === true)) {
            if (newRec.id) {
              const strId = String(newRec.id);
              try {
                const blKey = 'sanctuary_deleted_timeline_blacklist';
                let bl = [];
                try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
                const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
                blSet.add(strId);
                localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
              } catch (_) {}

              if (db.timeline_events) await db.timeline_events.delete(newRec.id).catch(() => {});
              if (db.custom_timeline) await db.custom_timeline.delete(newRec.id).catch(() => {});
              if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb) {
                if (window.churchDexieDb.timeline_events) await window.churchDexieDb.timeline_events.delete(newRec.id).catch(() => {});
                if (window.churchDexieDb.custom_timeline) await window.churchDexieDb.custom_timeline.delete(newRec.id).catch(() => {});
              }
              try {
                const listKey = 'sanctuary_timeline_entries';
                let list = JSON.parse(localStorage.getItem(listKey) || '[]');
                if (Array.isArray(list)) {
                  list = list.filter(item => item && String(item.id) !== strId);
                  localStorage.setItem(listKey, JSON.stringify(list));
                }
              } catch (_) {}
              if (typeof window.timelineItems !== 'undefined' && Array.isArray(window.timelineItems)) {
                window.timelineItems = window.timelineItems.filter(x => x && String(x.id) !== strId);
              }
              if (typeof window.saveTimelineItems === "function") {
                try { await window.saveTimelineItems(); } catch (_) {}
              }
              if (typeof window.renderTimelineList === "function") {
                try { window.renderTimelineList(); } catch (_) {}
              }
            }
            return;
          }

          // Check for soft delete on announcements
          if (table === "announcements" && (newRec.deleted_at != null || newRec.is_active === false || newRec.is_deleted === true)) {
            const delId = newRec.id;
            if (delId) {
              const strId = String(delId);
              try {
                const blKey = 'sanctuary_deleted_announcements_blacklist';
                let bl = [];
                try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
                const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
                blSet.add(strId);
                localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
              } catch (_) {}
              if (typeof window !== "undefined" && typeof window.addDeletedAnnouncementToBlacklist === "function") {
                try { window.addDeletedAnnouncementToBlacklist(delId); } catch (_) {}
              }

              if (db.announcements) await db.announcements.delete(delId).catch(() => {});
              if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb && window.churchDexieDb.announcements) {
                await window.churchDexieDb.announcements.delete(delId).catch(() => {});
              }

              let list = [];
              try {
                const listKey = 'sanctuary_announcements_v3';
                list = JSON.parse(localStorage.getItem(listKey) || '[]');
                if (Array.isArray(list)) {
                  list = list.filter(item => item && String(item.id) !== strId);
                  localStorage.setItem(listKey, JSON.stringify(list));
                  if (list.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(list[0]));
                  else localStorage.removeItem('sanctuary_announcement_v2');
                }
              } catch (_) {}

              if (typeof window.currentAnnouncementsList !== 'undefined' && Array.isArray(window.currentAnnouncementsList)) {
                window.currentAnnouncementsList = window.currentAnnouncementsList.filter(x => x && String(x.id) !== strId);
              }
              if (typeof window.renderAnnouncementHomeUI === "function") try { window.renderAnnouncementHomeUI(); } catch (_) {}
              if (typeof window.renderAdminAnnouncementsList === "function") try { window.renderAdminAnnouncementsList(); } catch (_) {}
              _updateAnnouncementDOMFallback(list);
            }
            return;
          }

          // Check for empty or soft delete on todays_song_selection
          if (table === "todays_song_selection" && (newRec.deleted_at != null || newRec.is_active === false || !Array.isArray(newRec.songs) || newRec.songs.length === 0)) {
            try {
              localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify([]));
              if (typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = [];
              if (typeof window.renderTodaySongHomeUI === "function") try { window.renderTodaySongHomeUI(); } catch (_) {}
              if (typeof window.renderAdminSelectedList === "function") try { window.renderAdminSelectedList(); } catch (_) {}
              _updateTodaySongDOMFallback([]);
            } catch (_) {}
            return;
          }

          if (table === "songs") {
            newRec.author = newRec.author || newRec.composer || "Church Hymnal";
            newRec.composer = newRec.composer || newRec.author;
            newRec.book_reference = newRec.book_reference || "masihiGeet";
            try {
              const blKey = 'sanctuary_deleted_songs_blacklist';
              let bl = JSON.parse(localStorage.getItem(blKey) || '[]');
              if (Array.isArray(bl) && bl.length > 0) {
                const lowerId = String(newRec.id || '').toLowerCase().trim();
                const lowerTitle = String(newRec.title || '').toLowerCase().trim();
                const filtered = bl.filter(x => {
                  const lx = String(x).toLowerCase().trim();
                  return lx !== lowerId && lx !== lowerTitle;
                });
                localStorage.setItem(blKey, JSON.stringify(filtered));
              }
            } catch (_) {}
          }
          await db[storeName].put(newRec);
          if (table === "songs") {
            if (db.song_book) try { await db.song_book.put(newRec); } catch (_) {}
            if (db.custom_songs) try { await db.custom_songs.put(newRec); } catch (_) {}
            if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb && window.churchDexieDb.songs) {
              try { await window.churchDexieDb.songs.put(newRec); } catch (_) {}
            }
            if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb && window.churchDexieDb.custom_songs) {
              try { await window.churchDexieDb.custom_songs.put(newRec); } catch (_) {}
            }
            // Background non-jumping songbook UI refresh
            if (typeof window.refreshSongBookCards === "function") {
              try { window.refreshSongBookCards(window.currentOpenSongBookKey); } catch (_) {}
            } else if (typeof window.renderAdditionalSongsFromDexie === "function") {
              try { window.renderAdditionalSongsFromDexie(); } catch (_) {}
            }
            // Update active open song in view in-place without switching tabs
            if (window.currentOpenSong && (window.currentOpenSong.id === newRec.id || (window.currentOpenSong.title && window.currentOpenSong.title === newRec.title))) {
              Object.assign(window.currentOpenSong, newRec);
              try {
                const titleEl = document.querySelector('.song-lyrics-title');
                if (titleEl) titleEl.textContent = newRec.title;
                const bodyEl = document.querySelector('.song-lyrics-body');
                if (bodyEl) bodyEl.innerHTML = (newRec.lyrics || '').replace(/\n/g, '<br>');
              } catch (_) {}
            }
          } else if (table === "todays_song_selection") {
            try {
              const list = Array.isArray(newRec.songs) ? newRec.songs : [];
              localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(list));
              if (typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = list;
              if (typeof window.renderTodaySongHomeUI === "function") try { window.renderTodaySongHomeUI(); } catch (_) {}
              if (typeof window.renderAdminSelectedList === "function") try { window.renderAdminSelectedList(); } catch (_) {}
              _updateTodaySongDOMFallback(list);
            } catch (_) {}
          } else if (table === "announcements") {
            try {
              const strId = String(newRec.id);
              let bl = [];
              try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_announcements_blacklist') || '[]'); } catch (_) { bl = []; }
              if (Array.isArray(bl) && bl.map(String).includes(strId)) {
                return; // Blacklisted: do not resurrect
              }

              const listKey = 'sanctuary_announcements_v3';
              let list = JSON.parse(localStorage.getItem(listKey) || '[]');
              if (!Array.isArray(list)) list = [];
              const idx = list.findIndex(item => String(item.id) === strId);
              const uiItem = {
                id: newRec.id,
                date: newRec.date || newRec.title || '',
                details: newRec.body || newRec.content || newRec.details || '',
                prayerBy: newRec.prayerBy || newRec.prayer_by || '',
                prayerDate: newRec.prayerDate || newRec.prayer_date || '',
                createdAt: newRec.created_at || newRec.createdAt || new Date().toISOString(),
                updatedAt: newRec.updated_at || newRec.updatedAt || new Date().toISOString()
              };
              if (idx !== -1) {
                list[idx] = { ...list[idx], ...uiItem };
              } else {
                list.unshift(uiItem);
              }
              localStorage.setItem(listKey, JSON.stringify(list));
              if (list.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(list[0]));
              if (typeof window.currentAnnouncementsList !== 'undefined') window.currentAnnouncementsList = list;
              if (typeof window.renderAnnouncementHomeUI === "function") try { window.renderAnnouncementHomeUI(); } catch (_) {}
              if (typeof window.renderAdminAnnouncementsList === "function") try { window.renderAdminAnnouncementsList(); } catch (_) {}
              _updateAnnouncementDOMFallback(list);
            } catch (_) {}
          } else if (table === "timeline_events") {
            try {
              if (newRec && newRec.id) {
                if (newRec.deleted_at) return;
                const strId = String(newRec.id);
                let bl = [];
                try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_timeline_blacklist') || '[]'); } catch (_) { bl = []; }
                if (Array.isArray(bl) && bl.map(String).includes(strId)) {
                  // Ignore blacklisted/deleted item
                  return;
                }

                if (typeof window.timelineItems !== "undefined" && Array.isArray(window.timelineItems)) {
                  const idx = window.timelineItems.findIndex(x => x.id === newRec.id);
                  const existing = idx >= 0 ? window.timelineItems[idx] : null;

                  let date = newRec.date || '';
                  let rawDate = newRec.raw_date || newRec.rawDate || '';
                  let photos = (Array.isArray(newRec.photos) && newRec.photos.length > 0) ? newRec.photos : [];
                  let description = newRec.description || '';

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

                  if (!date && existing && existing.date) date = existing.date;
                  if (!rawDate && existing && (existing.rawDate || existing.date)) rawDate = existing.rawDate || existing.date;
                  if ((!photos || photos.length === 0) && existing && Array.isArray(existing.photos)) photos = existing.photos;

                  if (!date) date = newRec.year ? String(newRec.year) : '2026';
                  if (!rawDate) rawDate = date;

                  const item = {
                    id: newRec.id,
                    year: newRec.year || (existing && existing.year) || (date ? String(date).slice(0, 4) : '2026'),
                    title: newRec.title || (existing && existing.title) || 'Timeline Event',
                    description: description,
                    rawDate: rawDate,
                    date: date,
                    photos: photos || []
                  };

                  if (idx >= 0) window.timelineItems[idx] = item;
                  else window.timelineItems.unshift(item);

                  if (typeof window.saveTimelineItems === "function") {
                    window.saveTimelineItems().catch(() => {});
                  }
                }
              }
            } catch (_) {}
            if (typeof window.renderTimelineList === "function") {
              try { window.renderTimelineList(); } catch (_) {}
            }
          } else if (table === "almanac_entries") {
            try {
              if (newRec && newRec.date_key) {
                let parsedDetails = null;
                if (newRec.details) {
                  try { parsedDetails = typeof newRec.details === "string" ? JSON.parse(newRec.details) : newRec.details; } catch (_) {}
                }
                if (window.CHURCH_DATA) {
                  if (!window.CHURCH_DATA.almanacDatabase) window.CHURCH_DATA.almanacDatabase = {};
                  window.CHURCH_DATA.almanacDatabase[newRec.date_key] = {
                    ...(window.CHURCH_DATA.almanacDatabase[newRec.date_key] || {}),
                    ...(parsedDetails || { dateKey: newRec.date_key, year: newRec.year, theme: newRec.title, color: newRec.liturgical_color })
                  };
                  try {
                    localStorage.setItem('sanctuary_custom_almanac', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
                    localStorage.setItem('sanctuary_custom_almanac_entries', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
                  } catch (_) {}
                }
                if (typeof window.renderAlmanacModule === "function") {
                  try { window.renderAlmanacModule(); } catch (_) {}
                }
              }
            } catch (err) {
              console.warn("[Sync] Almanac patch error:", err);
            }
          } else if (table === "prayer_book") {
            if (newRec && (newRec.id === "about_church_profile" || newRec.category === "about_church")) {
              try {
                const parsed = typeof newRec.content === "string" ? JSON.parse(newRec.content) : newRec.content;
                if (parsed && typeof parsed === "object") {
                  localStorage.setItem("sanctuary_about_church_data", JSON.stringify(parsed));
                  if (typeof window.renderAboutChurch === "function") {
                    try { window.renderAboutChurch(); } catch (_) {}
                  }
                  if (typeof window.renderAboutChurchPhotoSlider === "function") {
                    try { window.renderAboutChurchPhotoSlider(); } catch (_) {}
                  }
                }
              } catch (e) {
                console.warn("[Sync] About Church patch error:", e);
              }
            }
          }
        }
      } else if (eventType === "DELETE") {
        const delId = (oldRec && (oldRec.id || oldRec.date_key)) || (newRec && (newRec.id || newRec.date_key));
        let delTitle = (oldRec && oldRec.title) || (newRec && newRec.title);

        if (delId && storeName && db[storeName]) {
          if (!delTitle && table === "songs") {
            try {
              const rec = await db[storeName].get(delId);
              if (rec && rec.title) delTitle = rec.title;
            } catch (_) {}
          }
          await db[storeName].delete(delId).catch(() => {});
        }

        if (table === "songs") {
          if (delId) {
            if (db.song_book) try { await db.song_book.delete(delId); } catch (_) {}
            if (db.custom_songs) try { await db.custom_songs.delete(delId); } catch (_) {}
            if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb) {
              if (window.churchDexieDb.songs) try { await window.churchDexieDb.songs.delete(delId); } catch (_) {}
              if (window.churchDexieDb.custom_songs) try { await window.churchDexieDb.custom_songs.delete(delId); } catch (_) {}
              if (window.churchDexieDb.song_book) try { await window.churchDexieDb.song_book.delete(delId); } catch (_) {}
            }
          }
          _purgeLocalSong(delId, delTitle);
          // Background non-jumping songbook UI refresh
          if (typeof window.refreshSongBookCards === "function") {
            try { window.refreshSongBookCards(window.currentOpenSongBookKey); } catch (_) {}
          } else if (typeof window.renderAdditionalSongsFromDexie === "function") {
            try { window.renderAdditionalSongsFromDexie(); } catch (_) {}
          }
          if (window.currentOpenSong && (window.currentOpenSong.id === delId || (delTitle && window.currentOpenSong.title === delTitle))) {
            if (typeof window.showToast === "function") window.showToast("The current hymn was removed on another device 🗑️");
          }
        } else if (table === "announcements") {
          try {
            const strId = String(delId);
            try {
              const blKey = 'sanctuary_deleted_announcements_blacklist';
              let bl = [];
              try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
              const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
              blSet.add(strId);
              localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
            } catch (_) {}
            if (typeof window !== "undefined" && typeof window.addDeletedAnnouncementToBlacklist === "function") {
              try { window.addDeletedAnnouncementToBlacklist(delId); } catch (_) {}
            }
            if (db.announcements && delId) await db.announcements.delete(delId).catch(() => {});
            if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb && window.churchDexieDb.announcements && delId) {
              await window.churchDexieDb.announcements.delete(delId).catch(() => {});
            }

            const listKey = 'sanctuary_announcements_v3';
            let list = JSON.parse(localStorage.getItem(listKey) || '[]');
            if (Array.isArray(list)) {
              list = list.filter(item => String(item.id) !== strId);
              localStorage.setItem(listKey, JSON.stringify(list));
              if (list.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(list[0]));
              else localStorage.removeItem('sanctuary_announcement_v2');
              if (typeof window.currentAnnouncementsList !== 'undefined') window.currentAnnouncementsList = list;
              if (typeof window.renderAnnouncementHomeUI === "function") try { window.renderAnnouncementHomeUI(); } catch (_) {}
              if (typeof window.renderAdminAnnouncementsList === "function") try { window.renderAdminAnnouncementsList(); } catch (_) {}
              _updateAnnouncementDOMFallback(list);
            }
          } catch (_) {}
        } else if (table === "todays_song_selection") {
          try {
            localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify([]));
            if (typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = [];
            if (typeof window.renderTodaySongHomeUI === "function") try { window.renderTodaySongHomeUI(); } catch (_) {}
            if (typeof window.renderAdminSelectedList === "function") try { window.renderAdminSelectedList(); } catch (_) {}
            _updateTodaySongDOMFallback([]);
          } catch (_) {}
        } else if (table === "timeline_events") {
          try {
            if (delId) {
              const strId = String(delId);
              try {
                const blKey = 'sanctuary_deleted_timeline_blacklist';
                let bl = [];
                try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
                const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
                blSet.add(strId);
                localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
              } catch (_) {}

              if (db.timeline_events) await db.timeline_events.delete(delId).catch(() => {});
              if (db.custom_timeline) await db.custom_timeline.delete(delId).catch(() => {});
              if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb) {
                if (window.churchDexieDb.timeline_events) await window.churchDexieDb.timeline_events.delete(delId).catch(() => {});
                if (window.churchDexieDb.custom_timeline) await window.churchDexieDb.custom_timeline.delete(delId).catch(() => {});
              }

              try {
                const listKey = 'sanctuary_timeline_entries';
                let list = JSON.parse(localStorage.getItem(listKey) || '[]');
                if (Array.isArray(list)) {
                  list = list.filter(item => item && String(item.id) !== strId);
                  localStorage.setItem(listKey, JSON.stringify(list));
                }
              } catch (_) {}

              if (typeof window.timelineItems !== "undefined" && Array.isArray(window.timelineItems)) {
                window.timelineItems = window.timelineItems.filter(x => x && String(x.id) !== strId);
              }
              if (typeof window.saveTimelineItems === "function") {
                try { await window.saveTimelineItems(); } catch (_) {}
              }
            }
          } catch (_) {}
          if (typeof window.renderTimelineList === "function") {
            try { window.renderTimelineList(); } catch (_) {}
          }
        } else if (delId) {
          const dKey = delId;
          await db[storeName].delete(dKey).catch(() => {});
          if (table === "almanac_entries" && window.CHURCH_DATA && window.CHURCH_DATA.almanacDatabase) {
            delete window.CHURCH_DATA.almanacDatabase[dKey];
            try {
              localStorage.setItem('sanctuary_custom_almanac', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
              localStorage.setItem('sanctuary_custom_almanac_entries', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
            } catch (_) {}
            if (typeof window.renderAlmanacModule === "function") {
              try { window.renderAlmanacModule(); } catch (_) {}
            }
          }
        }
      }
    } catch (e) {
      console.warn("[Sync] Dexie cache patch error for " + table + ":", e);
    }
  }

  // ── 4. Outbox Replay & Idempotency
  async function _flushOutboxes() {
    if (_state.outboxProcessing) return;
    _state.outboxProcessing = true;

    try {
      // 1. Flush Chat Outbox
      if (db && db.chat_outbox) {
        const queuedChat = await db.chat_outbox.where("status").anyOf("queued", "failed").toArray();
        for (const item of queuedChat) {
          try {
            await db.chat_outbox.update(item.client_message_id, { status: "sending", last_attempt_at: Date.now() });
            const res = await _rest("POST", "chat_messages", { prefer: "resolution=merge-duplicates,return=representation" }, item.payload);
            if (!res.error) {
              await db.chat_outbox.update(item.client_message_id, { status: "sent" });
              setTimeout(() => {
                try { db.chat_outbox.delete(item.client_message_id); } catch (_) {}
              }, 1500);
            } else {
              console.error("[Sync] Chat outbox failed for:", item.client_message_id, "Full error:", JSON.stringify(res.error));
              const count = (item.retry_count || 0) + 1;
              await db.chat_outbox.update(item.client_message_id, { status: "failed", retry_count: count });
            }
          } catch (err) {
            console.error("[Sync] Chat outbox exception for:", item.client_message_id, err);
            const count = (item.retry_count || 0) + 1;
            await db.chat_outbox.update(item.client_message_id, { status: "failed", retry_count: count });
          }
        }
      }

      // 2. Flush Admin Outbox
      if (db && db.admin_outbox) {
        const queuedAdmin = await db.admin_outbox.toArray();
        for (const item of queuedAdmin) {
          try {
            let res = null;
            if (item.op === "upsert") {
              res = await _rest("POST", item.table, { prefer: "resolution=merge-duplicates" }, item.payload);
            } else if (item.op === "delete") {
              res = await _rest("DELETE", item.table, { filter: item.payload });
            } else if (item.op === "update") {
              res = await _rest("PATCH", item.table, { filter: (item.payload && item.payload.filter) || {} }, (item.payload && item.payload.data) || {});
            }
            if (!res || !res.error) {
              await db.admin_outbox.delete(item.id);
            } else {
              console.error("[Sync] Admin outbox replay error for item:", JSON.stringify(item), "Full error response:", JSON.stringify(res.error));
            }
          } catch (err) {
            console.error("[Sync] Admin outbox replay exception for item:", JSON.stringify(item), err);
          }
        }
      }
    } finally {
      _state.outboxProcessing = false;
    }
  }

  // ── 5. Chat Module (WhatsApp-Style v3)
  const Chat = {
    async load(room = "congregation", limit = 50, beforeCreatedAt = null) {
      const filter = {
        "room_id": "eq." + room,
        "deleted_at": "is.null"
      };
      if (beforeCreatedAt) {
        filter["created_at"] = "lt." + beforeCreatedAt;
      }

      const res = await _rest("GET", "chat_messages", {
        select: "id,client_message_id,room_id,chat_type,sender_id,sender_name,sender_role,content,reply_to_message_id,media_path,thumbnail_path,media_type,media_size,media_width,media_height,duration_ms,reaction,created_at",
        filter: filter,
        order: "created_at.desc",
        limit: String(limit)
      });

      if (res.data && Array.isArray(res.data)) {
        res.data.reverse(); // Chronological ordering
        if (db && db.chat_messages) {
          try { await db.chat_messages.bulkPut(res.data); } catch (_) {}
        }
      }
      return res;
    },

    async send(room, senderName, senderRole, content, senderId, replyToId = null, mediaMeta = null) {
      const clientMessageId = crypto.randomUUID();
      const nowIso = new Date().toISOString();

      const payload = {
        id: clientMessageId,
        client_message_id: clientMessageId,
        room_id: room,
        chat_type: room,
        sender_id: senderId || (window.currentAuthSession && window.currentAuthSession.uid) || "00000000-0000-0000-0000-000000000001",
        sender_name: senderName || (window.currentAuthSession && window.currentAuthSession.display_name) || "Member",
        sender_role: senderRole || (window.currentAuthSession && window.currentAuthSession.role) || "member",
        content: content || "",
        reply_to_message_id: replyToId || null,
        created_at: nowIso,
        deleted_at: null,
        ...(mediaMeta || {})
      };

      // Optimistic local Dexie caching
      if (db) {
        try {
          await db.chat_messages.put(payload);
          await db.chat_outbox.put({
            client_message_id: clientMessageId,
            room_id: room,
            payload: payload,
            status: _state.online ? "sending" : "queued",
            retry_count: 0,
            last_attempt_at: Date.now(),
            created_at: Date.now()
          });
        } catch (_) {}
      }

      if (!_state.online) {
        return { data: payload, error: null, offline: true };
      }

      const result = await _rest("POST", "chat_messages",
        { prefer: "resolution=merge-duplicates,return=representation" },
        payload
      );

      if (!result.error) {
        if (db && db.chat_outbox) {
          try { await db.chat_outbox.delete(clientMessageId); } catch (_) {}
        }
        _emit("chat:sent", result.data);
      }
      return result;
    },

    // Delivery & Read Receipts
    async recordDelivery(messageId, userId) {
      if (!messageId || !userId) return;
      const payload = {
        id: crypto.randomUUID(),
        message_id: messageId,
        user_id: userId,
        delivered_at: new Date().toISOString()
      };
      if (db && db.message_deliveries) {
        try { await db.message_deliveries.put(payload); } catch (_) {}
      }
      if (_state.online) {
        return _rest("POST", "message_deliveries", { prefer: "resolution=ignore-duplicates" }, payload);
      }
    },

    async recordRead(messageId, userId) {
      if (!messageId || !userId) return;
      const payload = {
        id: crypto.randomUUID(),
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString()
      };
      if (db && db.message_reads) {
        try { await db.message_reads.put(payload); } catch (_) {}
      }
      if (_state.online) {
        return _rest("POST", "message_reads", { prefer: "resolution=ignore-duplicates" }, payload);
      }
    },

    async getReceiptsForMessage(messageId) {
      const deliveries = await _rest("GET", "message_deliveries", {
        select: "user_id,delivered_at,profiles(display_name,email)",
        filter: { "message_id": "eq." + messageId }
      });
      const reads = await _rest("GET", "message_reads", {
        select: "user_id,read_at,profiles(display_name,email)",
        filter: { "message_id": "eq." + messageId }
      });

      return {
        deliveries: deliveries.data || [],
        reads: reads.data || []
      };
    },

    // Reactions (Church Emojis: 👍 ❤️ 🙏 😂 😮 😢)
    async toggleReaction(messageId, userId, emoji) {
      if (!messageId || !userId) return;
      const existing = await _rest("GET", "message_reactions", {
        select: "id,emoji",
        filter: { "message_id": "eq." + messageId, "user_id": "eq." + userId }
      });

      if (existing.data && existing.data.length > 0) {
        const cur = existing.data[0];
        if (cur.emoji === emoji) {
          // Remove reaction
          return _rest("DELETE", "message_reactions", { filter: { "id": "eq." + cur.id } });
        } else {
          // Replace reaction
          return _rest("PATCH", "message_reactions", { filter: { "id": "eq." + cur.id } }, { emoji, created_at: new Date().toISOString() });
        }
      } else {
        // Add reaction
        const rec = {
          id: crypto.randomUUID(),
          message_id: messageId,
          user_id: userId,
          emoji: emoji,
          created_at: new Date().toISOString()
        };
        return _rest("POST", "message_reactions", { prefer: "return=representation" }, rec);
      }
    },

    async getReactionsForMessage(messageId) {
      return _rest("GET", "message_reactions", {
        select: "emoji,user_id,created_at,profiles(display_name)",
        filter: { "message_id": "eq." + messageId }
      });
    },

    // Media Upload Pipeline to Supabase Storage bucket 'chat-media'
    async uploadMedia(file, onProgress) {
      if (!file) throw new Error("No file specified");
      const ext = file.name ? file.name.split(".").pop() : "jpg";
      const fileName = Date.now() + "_" + Math.random().toString(36).substring(2, 8) + "." + ext;
      const filePath = "uploads/" + fileName;

      const formData = new FormData();
      formData.append("cacheControl", "3600");
      formData.append("file", file);

      const uploadUrl = SUPABASE_URL + "/storage/v1/object/chat-media/" + filePath;

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("apikey", REALTIME_KEY);
        xhr.setRequestHeader("Authorization", "Bearer " + REALTIME_KEY);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(pct);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const publicUrl = SUPABASE_URL + "/storage/v1/object/public/chat-media/" + filePath;
            resolve({
              media_path: filePath,
              public_url: publicUrl,
              media_type: file.type && file.type.startsWith("video") ? "video" : "image",
              media_size: file.size
            });
          } else {
            // Local base64 fallback
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                media_path: reader.result,
                public_url: reader.result,
                media_type: file.type && file.type.startsWith("video") ? "video" : "image",
                media_size: file.size
              });
            };
            reader.onerror = () => reject(new Error("Failed to read media locally"));
            reader.readAsDataURL(file);
          }
        };

        xhr.onerror = () => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              media_path: reader.result,
              public_url: reader.result,
              media_type: file.type && file.type.startsWith("video") ? "video" : "image",
              media_size: file.size
            });
          };
          reader.onerror = () => reject(new Error("Upload network error"));
          reader.readAsDataURL(file);
        };

        xhr.send(formData);
      });
    },

    async delete(messageId) {
      if (!messageId) return;
      if (db && db.chat_messages) {
        try { await db.chat_messages.delete(messageId); } catch (_) {}
      }
      return _rest("DELETE", "chat_messages", { filter: { "id": "eq." + messageId } });
    },
    broadcastTyping,
    onNew(fn) { _on("chat_messages:change", fn); },
    onChange(fn) { _on("chat_messages:change", fn); },
    onTyping(room, fn) { _on("typing:" + room, fn); }
  };

  // ── 6. Prayer Book Module
  const PrayerBook = {
    async list(category = null) {
      const filter = category ? { "category": "eq." + category } : {};
      const res = await _rest("GET", "prayer_book", {
        select: "*",
        filter,
        order: "sort_order.asc",
        limit: "200"
      });
      if (res.data && Array.isArray(res.data) && db && db.prayer_book) {
        try { await db.prayer_book.bulkPut(res.data); } catch (_) {}
      } else if (res.error && db && db.prayer_book) {
        // Offline fallback to local Dexie cache
        try {
          const local = await db.prayer_book.toArray();
          const filtered = category ? local.filter(p => p.category === category) : local;
          return { data: filtered, error: null };
        } catch (_) {}
      }
      return res;
    },
    async upsert(item) {
      if (!item.id) item.id = crypto.randomUUID();
      item.updated_at = new Date().toISOString();
      if (db && db.prayer_book) try { await db.prayer_book.put(item); } catch (_) {}
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const op = item.id ? "update" : "insert";
          const result = await window.syncWrite("prayer_books", op, item);
          if (result && result.success) {
            _emit("prayer_book:saved", result.data || item);
            return { data: result.data || item, error: null };
          }
        } catch (_) {}
      }
      const res = await _rest("POST", "prayer_book", { prefer: "resolution=merge-duplicates,return=representation" }, item);
      if (!res.error) {
        _state.online = true;
        _emit("prayer_book:saved", res.data || item);
      }
      return res;
    },
    async delete(id) {
      if (db && db.prayer_book) try { await db.prayer_book.delete(id); } catch (_) {}
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const result = await window.syncWrite("prayer_books", "delete", { id });
          if (result && result.success) return { data: result.data || { id }, error: null };
        } catch (_) {}
      }
      return _rest("DELETE", "prayer_book", { filter: { "id": "eq." + id } });
    },
    onChange(fn) { _on("prayer_book:change", fn); }
  };

  // ── 7. Songs / Song Book Module
  const Songs = {
    async list(options = {}) {
      const res = await _rest("GET", "songs", {
        select: "*",
        filter: { "deleted_at": "is.null" },
        order: "song_number.asc,title.asc",
        ...(options.limit ? { limit: String(options.limit) } : {})
      });
      if (res.data && Array.isArray(res.data)) {
        const activeIds = new Set(res.data.map(s => String(s.id).toLowerCase().trim()));
        const activeTitles = new Set(res.data.map(s => String(s.title || '').toLowerCase().trim()));

        // Clean local blacklist of songs that are truly active
        try {
          const blKey = 'sanctuary_deleted_songs_blacklist';
          let bl = JSON.parse(localStorage.getItem(blKey) || '[]');
          if (Array.isArray(bl) && bl.length > 0) {
            const filtered = bl.filter(x => {
              const lx = String(x).toLowerCase().trim();
              return !activeIds.has(lx) && !activeTitles.has(lx);
            });
            localStorage.setItem(blKey, JSON.stringify(filtered));
          }
        } catch (_) {}

        // Reconcile / prune local Dexie stores: evict songs that were deleted remotely
        const pruneStaleDexieSongs = async (tbl) => {
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
                if (item.id) await tbl.delete(item.id).catch(() => {});
                else if (item.title) await tbl.where('title').equalsIgnoreCase(item.title).delete().catch(() => {});
              }
            }
          } catch (_) {}
        };

        if (db) {
          await pruneStaleDexieSongs(db.songs);
          await pruneStaleDexieSongs(db.song_book);
          await pruneStaleDexieSongs(db.custom_songs);
        }
        if (typeof window !== "undefined" && window.churchDexieDb) {
          await pruneStaleDexieSongs(window.churchDexieDb.songs);
          await pruneStaleDexieSongs(window.churchDexieDb.custom_songs);
          await pruneStaleDexieSongs(window.churchDexieDb.song_book);
        }

        // Prune stale localStorage backups
        ['sanctuary_imported_songs', 'sanctuary_custom_songs_backup'].forEach(storageKey => {
          try {
            const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (Array.isArray(list) && list.length > 0) {
              const pruned = list.filter(item => {
                if (!item) return false;
                const idStr = item.id ? String(item.id).toLowerCase().trim() : '';
                const titleStr = item.title ? String(item.title).toLowerCase().trim() : '';
                return activeIds.has(idStr) || activeTitles.has(titleStr);
              });
              localStorage.setItem(storageKey, JSON.stringify(pruned));
            }
          } catch (_) {}
        });

        // Prune in-memory currentSongList
        if (typeof window !== "undefined" && Array.isArray(window.currentSongList)) {
          window.currentSongList = window.currentSongList.filter(s => {
            if (!s) return false;
            const sIdStr = s.id ? String(s.id).toLowerCase().trim() : '';
            const sTitleStr = s.title ? String(s.title).toLowerCase().trim() : '';
            if (sIdStr.startsWith('static-')) return true;
            return activeIds.has(sIdStr) || activeTitles.has(sTitleStr);
          });
        }

        const normalized = res.data.map(s => ({
          ...s,
          author: s.author || s.composer || "Church Hymnal",
          composer: s.composer || s.author || "Church Hymnal",
          book_reference: s.book_reference || "masihiGeet"
        }));
        if (db && db.songs) try { await db.songs.bulkPut(normalized); } catch (_) {}
        if (db && db.song_book) try { await db.song_book.bulkPut(normalized); } catch (_) {}
        if (db && db.custom_songs) try { await db.custom_songs.bulkPut(normalized); } catch (_) {}
        if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb) {
          if (window.churchDexieDb.songs) try { await window.churchDexieDb.songs.bulkPut(normalized); } catch (_) {}
          if (window.churchDexieDb.custom_songs) try { await window.churchDexieDb.custom_songs.bulkPut(normalized); } catch (_) {}
        }
        res.data = normalized;
        if (typeof window.refreshSongBookCards === "function") {
          try { window.refreshSongBookCards(window.currentOpenSongBookKey); } catch (_) {}
        } else if (typeof window.renderAdditionalSongsFromDexie === "function") {
          try { window.renderAdditionalSongsFromDexie(); } catch (_) {}
        }
      } else if (res.error && db && db.songs) {
        // Offline fallback to local Dexie cache
        try {
          const local = await db.songs.toArray();
          const active = local.filter(s => !s.deleted_at);
          if (active.length > 0) return { data: active, error: null };
        } catch (_) {}
      }

      return res;
    },
    async upsert(songData) {
      if (!songData.title || !songData.lyrics) return { error: { message: "title and lyrics required" } };
      const songId = songData.id || crypto.randomUUID();
      const nowIso = new Date().toISOString();

      const remotePayload = {
        id: songId,
        title: songData.title,
        lyrics: songData.lyrics,
        category: songData.category || "hymn",
        song_number: (songData.song_number !== undefined && songData.song_number !== null) ? String(songData.song_number) : null,
        composer: songData.composer || songData.author || "Church Hymnal",
        book_reference: songData.book_reference || "masihiGeet",
        updated_at: songData.updated_at || nowIso,
        deleted_at: songData.deleted_at || null
      };
      if (songData.key_signature) remotePayload.key_signature = songData.key_signature;
      if (songData.tempo) remotePayload.tempo = songData.tempo;

      try {
        const blKey = 'sanctuary_deleted_songs_blacklist';
        let bl = JSON.parse(localStorage.getItem(blKey) || '[]');
        if (Array.isArray(bl) && bl.length > 0) {
          const lowerId = String(songId).toLowerCase().trim();
          const lowerTitle = String(songData.title).toLowerCase().trim();
          const filtered = bl.filter(x => {
            const lx = String(x).toLowerCase().trim();
            return lx !== lowerId && lx !== lowerTitle;
          });
          localStorage.setItem(blKey, JSON.stringify(filtered));
        }
      } catch (_) {}

      const localRecord = {
        ...remotePayload,
        author: remotePayload.composer
      };

      if (db && db.songs) try { await db.songs.put(localRecord); } catch (_) {}
      if (db && db.song_book) try { await db.song_book.put(localRecord); } catch (_) {}
      if (db && db.custom_songs) try { await db.custom_songs.put(localRecord); } catch (_) {}
      if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb) {
        if (window.churchDexieDb.songs) try { await window.churchDexieDb.songs.put(localRecord); } catch (_) {}
        if (window.churchDexieDb.custom_songs) try { await window.churchDexieDb.custom_songs.put(localRecord); } catch (_) {}
      }

      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        const op = songData.id ? "update" : "insert";
        const result = await window.syncWrite("songbook", op, remotePayload);
        if (result.success) {
          _emit("songs:saved", result.data);
          _emit("songs:change", { eventType: op.toUpperCase(), new: localRecord });
          _emit("song_book:change", { eventType: op.toUpperCase(), new: localRecord });
          return { data: result.data || localRecord, error: null };
        }
        return { data: localRecord, error: result.error };
      }

      const res = await _rest("POST", "songs", { prefer: "resolution=merge-duplicates,return=representation" }, remotePayload);
      if (!res.error) {
        _state.online = true;
        _emit("songs:saved", res.data);
        _emit("songs:change", { eventType: "INSERT", new: localRecord });
        _emit("song_book:change", { eventType: "INSERT", new: localRecord });
      }
      return res;
    },
    async delete(songId, songTitle) {
      return this.softDelete(songId, songTitle);
    },
    async softDelete(songId, songTitle) {
      if (!songTitle && db && db.songs) {
        try {
          const existing = await db.songs.get(songId);
          if (existing && existing.title) songTitle = existing.title;
        } catch (_) {}
      }
      if (!songTitle && typeof window !== "undefined" && window.churchDexieDb && window.churchDexieDb.songs) {
        try {
          const existing = await window.churchDexieDb.songs.get(songId);
          if (existing && existing.title) songTitle = existing.title;
        } catch (_) {}
      }

      // Purge locally from Dexie and caches
      _purgeLocalSong(songId, songTitle);

      // Perform cloud deletion via syncWrite
      let syncResult = null;
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          syncResult = await window.syncWrite("songbook", "delete", { id: songId, title: songTitle });
        } catch (err) {
          console.warn("[Sync] syncWrite delete failed:", err);
        }
      }

      // Ensure direct cloud deletion via REST API (hard DELETE)
      if (songId) {
        try {
          await _rest("DELETE", "songs", { filter: { "id": "eq." + songId } });
        } catch (_) {}
      }
      if (songTitle) {
        try {
          await _rest("DELETE", "songs", { filter: { "title": "eq." + songTitle } });
        } catch (_) {}
      }

      _emit("songs:change", { eventType: "DELETE", old: { id: songId, title: songTitle } });
      _emit("song_book:change", { eventType: "DELETE", old: { id: songId, title: songTitle } });

      return { data: { id: songId, title: songTitle }, error: null };
    },
    onChange(fn) { _on("songs:change", fn); }
  };

  // ── 8. Church Timeline Events Module
  const Timeline = {
    async list() {
      const res = await _rest("GET", "timeline_events", {
        select: "*",
        filter: { "deleted_at": "is.null" },
        order: "sort_order.asc,year.asc"
      });
      if (res.data && Array.isArray(res.data)) {
        let bl = [];
        try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_timeline_blacklist') || '[]'); } catch (_) { bl = []; }
        const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));

        const activeItems = res.data.filter(it => it && !it.deleted_at && !blSet.has(String(it.id)));

        if (db && db.timeline_events) {
          try {
            await db.timeline_events.clear();
            await db.timeline_events.bulkPut(activeItems);
          } catch (_) {}
        }
        try {
          const listKey = 'sanctuary_timeline_entries';
          let localList = JSON.parse(localStorage.getItem(listKey) || '[]');
          if (!Array.isArray(localList)) localList = [];
          localList = localList.filter(l => l && !blSet.has(String(l.id)) && !l.deleted_at);

          const merged = [];
          activeItems.forEach(item => {
            const local = localList.find(l => l && l.id === item.id);
            if (local) {
              merged.push({ ...local, title: item.title, description: item.description, year: item.year, date: item.year });
            } else {
              merged.push({
                id: item.id,
                year: item.year,
                title: item.title,
                description: item.description,
                rawDate: item.year,
                date: item.year
              });
            }
          });
          localStorage.setItem(listKey, JSON.stringify(merged));
          if (typeof window.timelineItems !== 'undefined') {
            window.timelineItems = merged;
          }
          if (typeof window.churchDexieDb !== 'undefined' && window.churchDexieDb && window.churchDexieDb.custom_timeline) {
            try {
              await window.churchDexieDb.custom_timeline.clear();
              await window.churchDexieDb.custom_timeline.bulkPut(merged);
            } catch (_) {}
          }
          if (typeof window.renderTimelineList === 'function') {
            try { window.renderTimelineList(); } catch (_) {}
          }
        } catch (_) {}
      }
      return res;
    },
    async upsert(item) {
      if (!item.id) item.id = crypto.randomUUID();
      item.updated_at = new Date().toISOString();
      if (db && db.timeline_events) try { await db.timeline_events.put(item); } catch (_) {}
      const res = await _rest("POST", "timeline_events", { prefer: "resolution=merge-duplicates,return=representation" }, item);
      if (!res.error) {
        _state.online = true;
        _emit("timeline:saved", res.data);
      } else {
        if (db && db.admin_outbox) {
          try { await db.admin_outbox.put({ id: crypto.randomUUID(), table: "timeline_events", op: "upsert", payload: item, created_at: Date.now() }); } catch (_) {}
        }
      }
      return res;
    },
    async delete(id) {
      if (!id) return { data: null, error: null };
      const strId = String(id);
      try {
        const blKey = 'sanctuary_deleted_timeline_blacklist';
        let bl = [];
        try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
        const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
        blSet.add(strId);
        localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
      } catch (_) {}

      if (db && db.timeline_events) try { await db.timeline_events.delete(id); } catch (_) {}
      if (db && db.custom_timeline) try { await db.custom_timeline.delete(id); } catch (_) {}
      if (typeof window.churchDexieDb !== "undefined" && window.churchDexieDb) {
        if (window.churchDexieDb.timeline_events) try { await window.churchDexieDb.timeline_events.delete(id); } catch (_) {}
        if (window.churchDexieDb.custom_timeline) try { await window.churchDexieDb.custom_timeline.delete(id); } catch (_) {}
      }
      try {
        const listKey = 'sanctuary_timeline_entries';
        let localList = JSON.parse(localStorage.getItem(listKey) || '[]');
        if (Array.isArray(localList)) {
          localList = localList.filter(it => it && String(it.id) !== strId);
          localStorage.setItem(listKey, JSON.stringify(localList));
        }
        if (typeof window.timelineItems !== 'undefined' && Array.isArray(window.timelineItems)) {
          window.timelineItems = window.timelineItems.filter(it => it && String(it.id) !== strId);
        }
        if (typeof window.saveTimelineItems === 'function') {
          try { await window.saveTimelineItems(); } catch (_) {}
        }
        if (typeof window.renderTimelineList === 'function') {
          try { window.renderTimelineList(); } catch (_) {}
        }
      } catch (_) {}

      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const result = await window.syncWrite("timeline", "delete", { id });
          if (result && result.success) return { data: result.data || { id }, error: null };
        } catch (_) {}
      }
      const res = await _rest("DELETE", "timeline_events", { filter: { "id": "eq." + id } });
      if (res.error && db && db.admin_outbox) {
        try { await db.admin_outbox.put({ id: crypto.randomUUID(), table: "timeline_events", op: "delete", payload: { "id": "eq." + id }, created_at: Date.now() }); } catch (_) {}
      }
      return res;
    },
    onChange(fn) { _on("timeline_events:change", fn); }
  };

  // ── 9. Today's Song Selection Module
  const TodaysSongs = {
    async get(dateKey) {
      const key = dateKey || new Date().toISOString().split("T")[0];
      const res = await _rest("GET", "todays_song_selection", {
        select: "*",
        filter: { "date_key": "eq." + key }
      });
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const rec = res.data[0];
        const songsList = (rec && Array.isArray(rec.songs)) ? rec.songs : [];
        try {
          localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(songsList));
          if (typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = songsList;
          if (typeof window.renderTodaySongHomeUI === "function") try { window.renderTodaySongHomeUI(); } catch (_) {}
          if (typeof window.renderAdminSelectedList === "function") try { window.renderAdminSelectedList(); } catch (_) {}
          _updateTodaySongDOMFallback(songsList);
        } catch (_) {}
      } else if (res && res.data && Array.isArray(res.data) && res.data.length === 0) {
        try {
          localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify([]));
          if (typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = [];
          if (typeof window.renderTodaySongHomeUI === "function") try { window.renderTodaySongHomeUI(); } catch (_) {}
          if (typeof window.renderAdminSelectedList === "function") try { window.renderAdminSelectedList(); } catch (_) {}
          _updateTodaySongDOMFallback([]);
        } catch (_) {}
      } else if (res.error && db && db.todays_song_selection) {
        // Fallback to local Dexie/Storage
        try {
          const raw = localStorage.getItem('sanctuary_today_songs_v2');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) return { data: [{ date_key: key, songs: list }], error: null };
          }
        } catch (_) {}
      }
      return res;
    },
    async set(songsArray) {
      const todayKey = new Date().toISOString().split("T")[0];
      return this.upsert({
        id: "00000000-0000-0000-0000-" + todayKey.replace(/-/g, "").padStart(12, "0"),
        date_key: todayKey,
        song_ids: (songsArray || []).map(s => s.id || s.title),
        songs: songsArray || []
      });
    },
    async upsert(selectionData) {
      if (!selectionData.date_key) selectionData.date_key = new Date().toISOString().split("T")[0];
      if (!selectionData.id) selectionData.id = "00000000-0000-0000-0000-" + selectionData.date_key.replace(/-/g, "").padStart(12, "0");
      selectionData.updated_at = new Date().toISOString();

      const songList = selectionData.songs || [];
      if (db && db.todays_song_selection) try { await db.todays_song_selection.put(selectionData); } catch (_) {}
      try {
        localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(songList));
        if (typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = songList;
        if (typeof window.renderTodaySongHomeUI === "function") try { window.renderTodaySongHomeUI(); } catch (_) {}
        if (typeof window.renderAdminSelectedList === "function") try { window.renderAdminSelectedList(); } catch (_) {}
        _updateTodaySongDOMFallback(songList);
      } catch (_) {}

      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const res = await window.syncWrite("today_song_selection", "update", selectionData);
          if (res && res.success) {
            _emit("todays_song:saved", res.data || selectionData);
            _emit("todays_song_selection:change", { eventType: "UPDATE", new: res.data || selectionData });
            return { data: res.data || selectionData, error: null };
          }
        } catch (_) {}
      }

      const res = await _rest("POST", "todays_song_selection", { prefer: "resolution=merge-duplicates,return=representation", on_conflict: "date_key" }, selectionData);
      if (!res.error) {
        _state.online = true;
        _emit("todays_song:saved", res.data || selectionData);
      }
      return res;
    },
    onChange(fn) { _on("todays_song_selection:change", fn); }
  };

  // ── 10. Announcements / Bulletins Module
  const Announcements = {
    async list(activeOnly = true) {
      const filter = activeOnly ? { "is_active": "eq.true", "deleted_at": "is.null" } : { "deleted_at": "is.null" };
      const res = await _rest("GET", "announcements", {
        select: "*",
        filter,
        order: "priority.desc,created_at.desc"
      });
      if (res.data && Array.isArray(res.data)) {
        if (db && db.announcements) {
          try { await db.announcements.bulkPut(res.data); } catch (_) {}
        }
        try {
          const listKey = 'sanctuary_announcements_v3';
          let localList = [];
          try {
            const rawStored = localStorage.getItem(listKey);
            if (rawStored) localList = JSON.parse(rawStored);
          } catch (_) {}
          const localMap = new Map((localList || []).map(a => [String(a.id), a]));
          const mapped = res.data.map(item => {
            const local = localMap.get(String(item.id));
            let pBy = item.prayerBy || (local ? local.prayerBy : '') || '';
            let pDate = item.prayerDate || (local ? local.prayerDate : '') || '';
            let bodyClean = item.body || item.content || item.details || '';
            const metaMatch = bodyClean.match(/<!--meta:(\{.*?\})-->/);
            if (metaMatch) {
              try {
                const parsedMeta = JSON.parse(metaMatch[1]);
                if (parsedMeta.prayerBy) pBy = parsedMeta.prayerBy;
                if (parsedMeta.prayerDate) pDate = parsedMeta.prayerDate;
                bodyClean = bodyClean.replace(/[\r\n]*<!--meta:(\{.*?\})-->/, '');
              } catch (_) {}
            }
            return {
              id: item.id,
              date: item.date || item.title || '',
              details: bodyClean,
              prayerBy: pBy,
              prayerDate: pDate,
              createdAt: item.created_at || (local ? local.createdAt : new Date().toISOString()),
              updatedAt: item.updated_at || (local ? local.updatedAt : new Date().toISOString())
            };
          });
          localStorage.setItem(listKey, JSON.stringify(mapped));
          if (mapped.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(mapped[0]));
          else localStorage.removeItem('sanctuary_announcement_v2');
          if (typeof window.currentAnnouncementsList !== 'undefined') window.currentAnnouncementsList = mapped;
          if (typeof window.renderAnnouncementHomeUI === "function") try { window.renderAnnouncementHomeUI(); } catch (_) {}
          if (typeof window.renderAdminAnnouncementsList === "function") try { window.renderAdminAnnouncementsList(); } catch (_) {}
          _updateAnnouncementDOMFallback(mapped);
        } catch (_) {}
      } else if (res.error && db && db.announcements) {
        // Offline fallback to local Dexie cache
        try {
          const local = await db.announcements.toArray();
          const filtered = activeOnly ? local.filter(a => a.is_active !== false && !a.deleted_at) : local.filter(a => !a.deleted_at);
          if (filtered.length > 0) return { data: filtered, error: null };
        } catch (_) {}
      }
      return res;
    },
    async upsert(announcement) {
      if (!announcement.id) announcement.id = crypto.randomUUID();
      announcement.updated_at = new Date().toISOString();
      const bodyText = announcement.body || announcement.content || "";
      const remotePayload = {
        id: announcement.id,
        title: announcement.title || "Announcement",
        body: bodyText,
        priority: announcement.priority !== undefined ? Number(announcement.priority) : 1,
        is_active: announcement.is_active !== undefined ? !!announcement.is_active : true,
        date: announcement.date || new Date().toISOString().split("T")[0],
        updated_at: announcement.updated_at,
        deleted_at: null
      };

      if (db && db.announcements) try { await db.announcements.put(remotePayload); } catch (_) {}

      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const op = announcement.id ? "update" : "insert";
          const res = await window.syncWrite("announcements", op, remotePayload);
          if (res && res.success) {
            _emit("announcements:saved", res.data || remotePayload);
            _emit("announcements:change", { eventType: op.toUpperCase(), new: res.data || remotePayload });
            return { data: res.data || remotePayload, error: null };
          }
        } catch (_) {}
      }

      const res = await _rest("POST", "announcements", { prefer: "resolution=merge-duplicates,return=representation" }, remotePayload);
      if (!res.error) {
        _state.online = true;
        _emit("announcements:saved", res.data || remotePayload);
      }
      return res;
    },
    async delete(id) {
      if (!id) return { data: null, error: null };
      const strId = String(id);

      // 1. Blacklist immediately
      try {
        const blKey = 'sanctuary_deleted_announcements_blacklist';
        let bl = [];
        try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
        const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
        blSet.add(strId);
        localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
      } catch (_) {}
      if (typeof window !== "undefined" && typeof window.addDeletedAnnouncementToBlacklist === "function") {
        try { window.addDeletedAnnouncementToBlacklist(id); } catch (_) {}
      }

      // 2. Remove locally from Dexie and caches
      if (db && db.announcements) try { await db.announcements.delete(id); } catch (_) {}
      if (typeof window !== "undefined" && window.churchDexieDb && window.churchDexieDb.announcements) {
        try { await window.churchDexieDb.announcements.delete(id); } catch (_) {}
      }

      let remaining = [];
      try {
        const listKey = 'sanctuary_announcements_v3';
        let list = JSON.parse(localStorage.getItem(listKey) || '[]');
        if (Array.isArray(list)) {
          remaining = list.filter(item => item && String(item.id) !== strId);
          localStorage.setItem(listKey, JSON.stringify(remaining));
          if (remaining.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(remaining[0]));
          else localStorage.removeItem('sanctuary_announcement_v2');
        }
      } catch (_) {}

      if (typeof window.currentAnnouncementsList !== 'undefined' && Array.isArray(window.currentAnnouncementsList)) {
        window.currentAnnouncementsList = window.currentAnnouncementsList.filter(x => x && String(x.id) !== strId);
      }
      if (typeof window.renderAnnouncementHomeUI === "function") try { window.renderAnnouncementHomeUI(); } catch (_) {}
      if (typeof window.renderAdminAnnouncementsList === "function") try { window.renderAdminAnnouncementsList(); } catch (_) {}
      _updateAnnouncementDOMFallback(remaining);

      // 3. Sync to Supabase via syncWrite
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const res = await window.syncWrite("announcements", "delete", { id, is_active: false });
          if (res && res.success) {
            _emit("announcements:change", { eventType: "DELETE", old: { id } });
            return { data: res.data || { id }, error: null };
          }
        } catch (_) {}
      }

      // 4. Fallback direct hard DELETE from backend database
      const res = await _rest("DELETE", "announcements", { filter: { "id": "eq." + id } });
      _emit("announcements:change", { eventType: "DELETE", old: { id } });
      return res;
    },
    onChange(fn) { _on("announcements:change", fn); }
  };

  // ── 11. CNI Congregation Members
  const Members = {
    async list(options = {}) {
      return _rest("GET", "congregation_members", {
        select: "*",
        order: "display_name.asc",
        ...(options.limit ? { limit: String(options.limit) } : {})
      });
    },
    async upsert(memberData) {
      if (!memberData.display_name) return { error: { message: "display_name required" } };
      if (!memberData.id) memberData.id = crypto.randomUUID();
      memberData.updated_at = new Date().toISOString();

      if (!_state.online) {
        if (db && db.admin_outbox) await db.admin_outbox.put({ id: crypto.randomUUID(), table: "congregation_members", op: "upsert", payload: memberData, created_at: Date.now() });
        return { data: memberData, error: null, offline: true };
      }
      const res = await _rest("POST", "congregation_members", { prefer: "resolution=merge-duplicates,return=representation" }, memberData);
      if (!res.error) _emit("members:saved", res.data);
      return res;
    },
    async delete(memberId) {
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const res = await window.syncWrite("congregation_members", "delete", { id: memberId });
          if (res && res.success) return { data: res.data || { id: memberId }, error: null };
        } catch (_) {}
      }
      if (!_state.online) {
        if (db && db.admin_outbox) await db.admin_outbox.put({ id: crypto.randomUUID(), table: "congregation_members", op: "delete", payload: { "id": "eq." + memberId }, created_at: Date.now() });
        return { data: null, error: null, offline: true };
      }
      return _rest("DELETE", "congregation_members", { filter: { "id": "eq." + memberId } });
    },
    onChange(fn) { _on("congregation_members:change", fn); }
  };

  // ── 12. Profiles & Auth
  const Auth = {
    async getProfile(userId) {
      return _rest("GET", "profiles", { select: "*", filter: { "id": "eq." + userId } });
    },
    async upsertProfile(profileData) {
      if (!profileData.id) return { error: { message: "id required" } };
      profileData.updated_at = new Date().toISOString();
      return _rest("POST", "profiles", { prefer: "resolution=merge-duplicates,return=representation" }, profileData);
    },
    async listAll() {
      return _rest("GET", "profiles", { select: "*", order: "created_at.desc" });
    },
    onChange(fn) { _on("profiles:change", fn); }
  };

  // ── 13. Almanac Entries
  const Almanac = {
    async get(dateKey) {
      const res = await _rest("GET", "almanac_entries", { select: "*", filter: { "date_key": "eq." + dateKey } });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res;
      }
      if (window.CHURCH_DATA && window.CHURCH_DATA.almanacDatabase && window.CHURCH_DATA.almanacDatabase[dateKey]) {
        return { data: [window.CHURCH_DATA.almanacDatabase[dateKey]], error: null };
      }
      return res;
    },
    async list(year = null) {
      const yr = year || new Date().getFullYear();
      const res = await _rest("GET", "almanac_entries", {
        select: "*",
        filter: { "date_key": "like." + yr + "%" },
        order: "date_key.asc",
        limit: "400"
      });
      if (res.data && Array.isArray(res.data)) {
        if (!window.CHURCH_DATA) window.CHURCH_DATA = {};
        if (!window.CHURCH_DATA.almanacDatabase) window.CHURCH_DATA.almanacDatabase = {};
        res.data.forEach(entry => {
          let parsedDetails = null;
          if (entry.details) {
            try { parsedDetails = typeof entry.details === "string" ? JSON.parse(entry.details) : entry.details; } catch (_) {}
          }
          window.CHURCH_DATA.almanacDatabase[entry.date_key] = {
            ...(window.CHURCH_DATA.almanacDatabase[entry.date_key] || {}),
            ...(parsedDetails || { dateKey: entry.date_key, year: entry.year, theme: entry.title, color: entry.liturgical_color })
          };
        });
        try {
          localStorage.setItem('sanctuary_custom_almanac', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
          localStorage.setItem('sanctuary_custom_almanac_entries', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
        } catch (_) {}
        if (typeof window.renderAlmanacModule === "function") {
          try { window.renderAlmanacModule(); } catch (_) {}
        }
      } else if (res.error) {
        // Fallback to local storage
        try {
          const raw = localStorage.getItem('sanctuary_custom_almanac');
          if (raw) {
            const parsed = JSON.parse(raw);
            const list = Object.values(parsed);
            if (list.length > 0) return { data: list, error: null };
          }
        } catch (_) {}
      }
      return res;
    },
    async getRange(yearMonth) {
      return _rest("GET", "almanac_entries", { select: "*", filter: { "date_key": "like." + yearMonth + "%" }, order: "date_key.asc" });
    },
    async upsert(entryData) {
      if (!entryData.date_key) return { error: { message: "date_key required" } };
      entryData.updated_at = new Date().toISOString();
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const res = await window.syncWrite("almanac", "insert", entryData);
          if (res && res.success) return { data: res.data || entryData, error: null };
        } catch (_) {}
      }
      return _rest("POST", "almanac_entries", { prefer: "resolution=merge-duplicates,return=representation", on_conflict: "date_key" }, entryData);
    },
    async bulkUpsert(entries) {
      if (!Array.isArray(entries) || entries.length === 0) return { data: [], error: null };
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const res = await window.syncWrite("almanac", "insert", entries);
          if (res && res.success) return { data: res.data || entries, error: null };
        } catch (_) {}
      }
      const nowIso = new Date().toISOString();
      const payload = entries.map(e => ({
        ...e,
        updated_at: e.updated_at || nowIso
      }));
      return _rest("POST", "almanac_entries", { prefer: "resolution=merge-duplicates,return=representation", on_conflict: "date_key" }, payload);
    },
    async delete(dateKey) {
      if (!dateKey) return { error: { message: "date_key required" } };
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const res = await window.syncWrite("almanac", "delete", { id: dateKey, date_key: dateKey });
          if (res && res.success) return { data: res.data || { id: dateKey }, error: null };
        } catch (_) {}
      }
      if (db && db.almanac_entries) try { await db.almanac_entries.delete(dateKey); } catch (_) {}
      return _rest("DELETE", "almanac_entries", { filter: { "date_key": "eq." + dateKey } });
    },
    onChange(fn) { _on("almanac_entries:change", fn); }
  };

  // ── 14. Requests
  const Requests = {
    async listAdmin(status = 'pending') {
      const filter = status ? { "status": "eq." + status } : {};
      return _rest("GET", "admin_requests", { select: "*", filter, order: "requested_at.desc" });
    },
    async listYouth() {
      return _rest("GET", "youth_access_requests", { select: "*", filter: { "status": "eq.pending" }, order: "requested_at.desc" });
    },
    async createAdminRequest(data) {
      const payload = {
        user_id: data.user_id,
        display_name: data.display_name || data.name || 'Member',
        status: 'pending',
        requested_at: new Date().toISOString()
      };
      if (data.id) payload.id = data.id;
      return _rest("POST", "admin_requests", { prefer: "return=representation" }, payload);
    },
    async approveAdmin(requestId, userId) {
      let rpcRes = null;
      try {
        rpcRes = await _rpc("approve_admin_request", { target_request_id: requestId });
      } catch (err) {
        console.warn("[Requests] approve_admin_request RPC error:", err);
      }
      const reqUpdate = { status: "approved", updated_at: new Date().toISOString() };
      await _rest("PATCH", "admin_requests", { filter: { "id": "eq." + requestId } }, reqUpdate).catch(() => {});
      if (userId) {
        const profUpdate = { role: "admin", updated_at: new Date().toISOString() };
        await _rest("PATCH", "profiles", { filter: { "id": "eq." + userId } }, profUpdate).catch(() => {});
      }
      return rpcRes || { success: true };
    },
    async rejectAdmin(requestId, userId) {
      let rpcRes = null;
      try {
        rpcRes = await _rpc("reject_admin_request", { target_request_id: requestId });
      } catch (err) {
        console.warn("[Requests] reject_admin_request RPC error:", err);
      }
      const reqUpdate = { status: "rejected", updated_at: new Date().toISOString() };
      await _rest("PATCH", "admin_requests", { filter: { "id": "eq." + requestId } }, reqUpdate).catch(() => {});
      if (userId) {
        const profUpdate = { role: "member", updated_at: new Date().toISOString() };
        await _rest("PATCH", "profiles", { filter: { "id": "eq." + userId } }, profUpdate).catch(() => {});
      }
      return rpcRes || { success: true };
    },
    async revokeAdmin(requestId, userId) {
      const reqUpdate = { status: "revoked", updated_at: new Date().toISOString() };
      const res = await _rest("PATCH", "admin_requests", { filter: { "id": "eq." + requestId } }, reqUpdate).catch(() => {});
      if (userId) {
        const profUpdate = { role: "member", updated_at: new Date().toISOString() };
        await _rest("PATCH", "profiles", { filter: { "id": "eq." + userId } }, profUpdate).catch(() => {});
      }
      return res || { success: true };
    },
    async approveYouth(requestId) { return _rpc("approve_youth_request", { target_request_id: requestId }); },
    async rejectYouth(requestId)  { return _rpc("reject_youth_request", { target_request_id: requestId }); },
    onChange(fn) {
      _on("admin_requests:change", fn);
      _on("youth_access_requests:change", fn);
    }
  };

  // ── 15. Posts & Audit Log
  const Posts = {
    async list() { return _rest("GET", "posts", { select: "*", order: "sort_order.asc" }); },
    async upsert(p) { p.updated_at = new Date().toISOString(); return _rest("POST", "posts", { prefer: "resolution=merge-duplicates,return=representation" }, p); },
    async delete(id) {
      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const res = await window.syncWrite("posts", "delete", { id });
          if (res && res.success) return { data: res.data || { id }, error: null };
        } catch (_) {}
      }
      return _rest("DELETE", "posts", { filter: { "id": "eq." + id } });
    },
    onChange(fn) { _on("posts:change", fn); }
  };

  const AuditLog = {
    async list(limit = 100) { return _rest("GET", "audit_log", { select: "*", order: "created_at.desc", limit: String(limit) }); },
    async add(entry) { entry.created_at = new Date().toISOString(); return _rest("POST", "audit_log", { prefer: "return=representation" }, entry); }
  };

  // ── 16. About Church Module (stored in prayer_book table under id 'about_church_profile')
  const AboutChurch = {
    async get() {
      const res = await _rest("GET", "prayer_book", {
        select: "*",
        filter: { "id": "eq.about_church_profile" },
        limit: "1"
      });
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const row = res.data[0];
        let profileData = null;
        if (row.content) {
          try { profileData = typeof row.content === "string" ? JSON.parse(row.content) : row.content; } catch (_) {}
        }
        if (!profileData && row.church_name) {
          profileData = { ...row };
        }
        if (profileData) {
          localStorage.setItem("sanctuary_about_church_data", JSON.stringify(profileData));
          if (typeof window.renderAboutChurch === "function") try { window.renderAboutChurch(); } catch (_) {}
          if (typeof window.renderAboutChurchPhotoSlider === "function") try { window.renderAboutChurchPhotoSlider(); } catch (_) {}
          return { data: profileData, error: null };
        }
      } else if (res.error) {
        try {
          const raw = localStorage.getItem("sanctuary_about_church_data");
          if (raw) return { data: JSON.parse(raw), error: null };
        } catch (_) {}
      }
      return res;
    },
    async save(aboutData) {
      if (!aboutData || typeof aboutData !== "object") return { error: { message: "Invalid aboutData" } };
      const contentJson = JSON.stringify(aboutData);
      const prayerBookPayload = {
        id: "about_church_profile",
        category: "about_church",
        title: aboutData.churchName || "CNI Church of North India",
        content: contentJson,
        sort_order: 1,
        updated_at: new Date().toISOString()
      };

      if (db && db.prayer_book) try { await db.prayer_book.put(prayerBookPayload); } catch (_) {}
      localStorage.setItem("sanctuary_about_church_data", contentJson);
      if (typeof window.renderAboutChurch === "function") try { window.renderAboutChurch(); } catch (_) {}
      if (typeof window.renderAboutChurchPhotoSlider === "function") try { window.renderAboutChurchPhotoSlider(); } catch (_) {}

      if (typeof window !== "undefined" && typeof window.syncWrite === "function") {
        try {
          const res = await window.syncWrite("about_church", "update", aboutData);
          if (res && res.success) {
            _emit("about_church:saved", res.data || aboutData);
            _emit("prayer_book:change", { eventType: "UPDATE", new: prayerBookPayload });
            return { data: res.data || aboutData, error: null };
          }
        } catch (_) {}
      }

      const res = await _rest("POST", "prayer_book", {
        prefer: "resolution=merge-duplicates,return=representation"
      }, prayerBookPayload);
      if (!res.error) {
        _state.online = true;
        _emit("about_church:saved", res.data || aboutData);
        _emit("prayer_book:change", { eventType: "UPDATE", new: prayerBookPayload });
      }
      return res;
    },
    onChange(fn) {
      _on("about_church:change", fn);
      _on("prayer_book:change", (payload) => {
        if (!payload) return;
        const rec = payload.new || (payload.data && payload.data.record) || payload.record;
        if (rec && (rec.id === "about_church_profile" || rec.category === "about_church")) {
          try {
            const parsed = typeof rec.content === "string" ? JSON.parse(rec.content) : rec.content;
            fn(parsed);
          } catch (_) {
            fn(rec);
          }
        }
      });
    }
  };

  // ── Init (All background automatic syncing/realtime handled strictly by unified SyncEngine)
  async function init() {
    console.log("[Sync Engine] Initializing Church Companion Real-Time Engine v3 (Manual-First Policy Active)...");
    _emit("ready", { online: _state.online });
  }

  // ── Export window.ChurchSync
  window.ChurchSync = {
    client: _supabaseClient,
    db,
    Chat,
    PrayerBook,
    Songs,
    SongBook: Songs,
    Timeline,
    TodaysSongs,
    Announcements,
    Members,
    Auth,
    Almanac,
    AboutChurch,
    Requests,
    Posts,
    AuditLog,

    on: _on,
    emit: _emit,
    flushOfflineQueue: _flushOutboxes,
    get online() { return _state.online; },
    get realtimeConnected() { return _state.realtimeConnected; },
    init
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 100);
  }
})();
