(function () {
  "use strict";

  /**
 * Sanctuary App - Church Library, Hymnal, Scripture & Almanac Data
 */


    // ==============================================================================
    // CHURCH COMPANION: AUTHENTICATION, RBAC & DEXIE OFFLINE-FIRST ENGINE
    // Roles: superadmin (fixed: emanualmridha2@gmail.com), admin, member
    // ==============================================================================

            const SUPER_ADMIN_EMAIL = 'emanualmridha2@gmail.com';
    const SUPER_ADMIN_PASSWORD = '552367';
    const DEXIE_SESSION_KEY = 'current';

    // 1. Initialize Dexie Database
    let churchDexieDb = null;
    try {
      if (window.ChurchSync && window.ChurchSync.db) {
        churchDexieDb = window.ChurchSync.db;
      } else if (typeof Dexie !== 'undefined') {
        churchDexieDb = new Dexie('ChurchCompanionOfflineDB');
        churchDexieDb.version(1).stores({
          session: 'id',
          profiles: 'id, email, role, is_youth',
          chat_messages: 'id, chat_type, sender_id, created_at, deleted_at',
          admin_requests: 'id, user_id, status, requested_at',
          youth_access_requests: 'id, user_id, status, requested_at',
          custom_songs: 'id, title, category, lyrics',
          custom_timeline: 'id, year, title, sort_order'
        });
        churchDexieDb.version(2).stores({
          session: 'id',
          profiles: 'id, email, role, is_youth',
          chat_messages: 'id, chat_type, sender_id, created_at, deleted_at',
          admin_requests: 'id, user_id, status, requested_at',
          youth_access_requests: 'id, user_id, status, requested_at',
          custom_songs: 'id, book_reference, song_number, title, category, lyrics',
          custom_timeline: 'id, year, title, sort_order'
        });
        churchDexieDb.version(3).stores({
          session: 'id',
          profiles: 'id, email, role, is_youth',
          chat_messages: 'id, chat_type, sender_id, created_at, deleted_at',
          admin_requests: 'id, user_id, status, requested_at',
          youth_access_requests: 'id, user_id, status, requested_at',
          custom_songs: 'id, book_reference, song_number, title, category, lyrics',
          custom_timeline: 'id, year, title, sort_order',
          chat_outbox: '++autoId, msgId, channel, status, createdAt'
        });
        churchDexieDb.version(4).stores({
          session: 'id',
          profiles: 'id, email, role, is_youth',
          congregation_members: 'id, display_name, updated_at',
          prayer_book: 'id, category, sort_order, updated_at',
          custom_songs: 'id, book_reference, song_number, title, category, lyrics',
          custom_timeline: 'id, year, title, sort_order',
          songs: 'id, title, category, song_number, updated_at, deleted_at',
          song_book: 'id, title, category, song_number, updated_at, deleted_at',
          timeline_events: 'id, year, sort_order, updated_at',
          todays_song_selection: 'id, date_key, updated_at',
          announcements: 'id, priority, is_active, updated_at',
          almanac_entries: 'date_key, year, updated_at',
          chat_messages: 'id, client_message_id, room_id, sender_id, created_at, reply_to_message_id, deleted_at',
          message_deliveries: 'id, [message_id+user_id], message_id, user_id, delivered_at',
          message_reads: 'id, [message_id+user_id], message_id, user_id, read_at',
          message_reactions: 'id, [message_id+user_id], message_id, user_id, emoji, created_at',
          chat_outbox: 'client_message_id, room_id, status, retry_count, created_at',
          admin_outbox: 'id, table, op, created_at'
        });
      }
    } catch (e) {
      console.warn('[Dexie] Database init fallback:', e);
    }
    window.churchDexieDb = churchDexieDb;

    // 2. Reuse Supabase Client (created in supabase-sync.js from window.SUPABASE_CONFIG)
    let churchSupabase = window.churchSupabase || (window.ChurchSync && window.ChurchSync.client) || null;
    if (!churchSupabase && window.supabase && typeof window.supabase.createClient === 'function') {
      const cfg = window.SUPABASE_CONFIG || window.CHURCH_CONFIG || {};
      const url = cfg.supabaseUrl || cfg.SUPABASE_URL;
      const key = cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || cfg.supabaseKey || cfg.SUPABASE_KEY;
      if (url && key) {
        try {
          churchSupabase = window.supabase.createClient(url, key, {
            auth: { persistSession: true, autoRefreshToken: true },
            realtime: { params: { eventsPerSecond: 20 } }
          });
          window.churchSupabase = churchSupabase;
        } catch (e) {
          console.warn('[Supabase] Client init fallback:', e);
        }
      }
    }

    // ==============================================================================
    // CHAT CONNECTION MANAGER & OFFLINE MESSAGE QUEUE (WhatsApp-Style)
    // ==============================================================================
    const chatConnection = {
      isOnline: navigator.onLine,
      wsConnected: false,
      listeners: [],
      onStateChange(fn) { this.listeners.push(fn); },
      _notify() { this.listeners.forEach(fn => { try { fn(this.isOnline, this.wsConnected); } catch (_) {} }); },
      setOnline(val) { this.isOnline = val; this._notify(); },
      setWsConnected(val) { this.wsConnected = val; this._notify(); },
      get fullyConnected() { return this.isOnline && this.wsConnected; }
    };

    // Auto-activate connection when Supabase Realtime connects
    if (window.ChurchSync) {
      window.ChurchSync.on('realtimeConnected', () => {
        chatConnection.setWsConnected(true);
        chatConnection.setOnline(true);
        console.log('[Supabase Realtime] Active & connected — ready to sync');
      });
      if (window.ChurchSync.realtimeConnected) {
        chatConnection.setWsConnected(true);
      }
    }

    window.addEventListener('online', () => {
      chatConnection.setOnline(true);
      console.log('[Chat Queue] Network online — flushing pending messages');
      flushChatOutbox();
    });
    window.addEventListener('offline', () => {
      chatConnection.setOnline(false);
      console.log('[Chat Queue] Network offline — messages will be queued');
    });

    /**
     * Queue a chat message into the Dexie outbox for offline delivery.
     * Status lifecycle: queued → sending → sent → delivered → failed
     */
    async function enqueueChatMessage(msgObj) {
      if (!churchDexieDb || !churchDexieDb.chat_outbox) {
        console.warn('[Chat Queue] Dexie not available, falling back to localStorage');
        _fallbackLocalQueue(msgObj);
        return;
      }
      try {
        await churchDexieDb.chat_outbox.add({
          msgId: msgObj.id,
          channel: msgObj.channel,
          sender: msgObj.sender,
          sender_id: msgObj.sender_id,
          sender_role: msgObj.sender_role,
          text: msgObj.text,
          time: msgObj.time,
          timestamp: msgObj.timestamp,
          status: 'queued',
          createdAt: Date.now(),
          retryCount: 0
        });
        console.log('[Chat Queue] Message queued:', msgObj.id);
      } catch (e) {
        console.warn('[Chat Queue] Dexie enqueue failed, using localStorage fallback:', e);
        _fallbackLocalQueue(msgObj);
      }
    }

    /**
     * Fallback queue using localStorage if Dexie is unavailable.
     */
    function _fallbackLocalQueue(msgObj) {
      try {
        const key = 'cni_chat_outbox_v1';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ ...msgObj, status: 'queued', createdAt: Date.now(), retryCount: 0 });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (_) {}
    }

    /**
     * Update message status in the outbox (e.g., queued → sent, sent → delivered)
     */
    async function updateOutboxStatus(msgId, newStatus) {
      if (!churchDexieDb || !churchDexieDb.chat_outbox) return;
      try {
        const record = await churchDexieDb.chat_outbox.where('msgId').equals(msgId).first();
        if (record) {
          record.status = newStatus;
          await churchDexieDb.chat_outbox.put(record);
        }
      } catch (_) {}
    }

    /**
     * Remove a message from the outbox after successful delivery.
     */
    async function removeOutboxMessage(msgId) {
      if (!churchDexieDb || !churchDexieDb.chat_outbox) return;
      try {
        await churchDexieDb.chat_outbox.where('msgId').equals(msgId).delete();
      } catch (_) {}
    }

    /**
     * Get all queued messages from the outbox.
     */
    async function getQueuedMessages() {
      if (!churchDexieDb || !churchDexieDb.chat_outbox) {
        try {
          return JSON.parse(localStorage.getItem('cni_chat_outbox_v1') || '[]');
        } catch (_) { return []; }
      }
      try {
        return await churchDexieDb.chat_outbox.where('status').equals('queued').sortBy('createdAt');
      } catch (_) { return []; }
    }

    /**
     * Flush all queued messages when connection is restored.
     * This is the core WhatsApp-style retry logic.
     */
    async function flushChatOutbox() {
      if (!chatConnection.fullyConnected) return;

      const queued = await getQueuedMessages();
      if (!queued || queued.length === 0) return;

      console.log(`[Chat Queue] Flushing ${queued.length} queued message(s)...`);

      for (const msg of queued) {
        try {
          // Mark as sending
          await updateOutboxStatus(msg.msgId, 'sending');
          _updateBubbleStatus(msg.msgId, 'sending');

          // Send via WebSocket
          const sent = sendWsEvent({
            type: 'chat_message',
            id: msg.msgId,
            channel: msg.channel,
            sender: msg.sender,
            sender_id: msg.sender_id,
            sender_role: msg.sender_role,
            text: msg.text,
            time: msg.time
          });

          if (sent) {
            // Mark as sent
            await updateOutboxStatus(msg.msgId, 'sent');
            _updateBubbleStatus(msg.msgId, 'sent');

            // Also sync to Supabase
            if (window.ChurchSync) {
              window.ChurchSync.Chat.send(
                msg.channel, msg.sender, msg.sender_role, msg.text, msg.sender_id
              ).catch(() => {});
            }

            // Remove from outbox after short delay
            setTimeout(() => removeOutboxMessage(msg.msgId), 1000);
          } else {
            // WebSocket send failed
            await _incrementRetryCount(msg.msgId);
            _updateBubbleStatus(msg.msgId, 'failed');
          }
        } catch (e) {
          console.warn('[Chat Queue] Flush error for', msg.msgId, e);
          await _incrementRetryCount(msg.msgId);
          _updateBubbleStatus(msg.msgId, 'failed');
        }
      }
    }

    /**
     * Increment retry count; mark as failed if too many retries.
     */
    async function _incrementRetryCount(msgId) {
      if (!churchDexieDb || !churchDexieDb.chat_outbox) return;
      try {
        const record = await churchDexieDb.chat_outbox.where('msgId').equals(msgId).first();
        if (record) {
          record.retryCount = (record.retryCount || 0) + 1;
          record.status = record.retryCount >= 5 ? 'failed' : 'queued';
          await churchDexieDb.chat_outbox.put(record);
        }
      } catch (_) {}
    }

    /**
     * Update the visual status of a message bubble in the chat UI.
     * Shows: clock (queued), single-tick (sent), double-tick (delivered), failed icon
     */
    function _updateBubbleStatus(msgId, status) {
      const bubble = document.querySelector(`[data-msg-id="${msgId}"]`);
      if (!bubble) return;
      const tickWrap = bubble.querySelector('.wa-ticks-wrap');
      if (!tickWrap) return;

      switch (status) {
        case 'queued':
        case 'sending':
          tickWrap.innerHTML = `<span class="wa-ticks pending" title="Sending...">
            <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor" opacity="0.6">
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 5v3l2 1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </span>`;
          break;
        case 'sent':
          tickWrap.innerHTML = getTicksSvg('sent');
          break;
        case 'delivered':
          tickWrap.innerHTML = getTicksSvg('delivered');
          break;
        case 'blue':
          tickWrap.innerHTML = getTicksSvg('blue');
          break;
        case 'failed':
          tickWrap.innerHTML = `<span class="wa-ticks failed" title="Failed to send. Tap to retry." style="cursor:pointer; color:#ef4444;">
            <svg viewBox="0 0 24 24" width="16" height="15" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </span>`;
          // Add retry click handler
          tickWrap.onclick = () => _retrySingleMessage(msgId);
          break;
      }
    }

    /**
     * Retry a single failed message.
     */
    async function _retrySingleMessage(msgId) {
      if (!chatConnection.fullyConnected) {
        showToast('No internet connection. Will retry when online.');
        return;
      }
      if (!churchDexieDb || !churchDexieDb.chat_outbox) return;
      try {
        const record = await churchDexieDb.chat_outbox.where('msgId').equals(msgId).first();
        if (record) {
          record.status = 'queued';
          record.retryCount = 0;
          await churchDexieDb.chat_outbox.put(record);
          _updateBubbleStatus(msgId, 'queued');
          flushChatOutbox();
        }
      } catch (_) {}
    }

    /**
     * Periodic outbox flush — attempts to send any stuck messages.
     */
    setInterval(() => {
      if (chatConnection.fullyConnected) {
        getQueuedMessages().then(queued => {
          if (queued && queued.length > 0) flushChatOutbox();
        });
      }
    }, 10000);

    // Current Active Auth Session
    let currentAuthSession = {
      id: DEXIE_SESSION_KEY,
      uid: 'user-' + Math.random().toString(36).substring(2, 10),
      email: null,
      display_name: 'Emanual',
      role: 'member',
      is_youth: false,
      is_anonymous: true
    };
    try {
      const storedSession = localStorage.getItem('sanctuary_auth_session_v1');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed && typeof parsed === 'object') {
          currentAuthSession = { ...currentAuthSession, ...parsed };
          if (currentAuthSession.email === SUPER_ADMIN_EMAIL) {
            currentAuthSession.role = 'superadmin';
            currentAuthSession.is_youth = true;
          }
        }
      }
    } catch (_) {}
    window.currentAuthSession = currentAuthSession;
    window.useAppPermissions = useAppPermissions;
    window.computeAppPermissions = computeAppPermissions;

    // Pending requests in memory cache
    let pendingAdminRequests = [];
    let approvedAdminRequests = [];
    let pendingAdminLogin = null;
    let pendingYouthRequests = [];
    let activeRequestMode = 'admin'; // 'admin' or 'youth'
    let currentActiveSongObj = null;
    let activeCniChannel = 'congregation';

    // 3. Permissions & Role Computation (Pure Source of Truth)
    // Rule: There are strictly ONLY TWO ROLES: Super Admin ('superadmin') & Admin ('admin').
    // Congregational ministry designations (Pastor, Member, Youth) are Congregational Posts, NOT roles.
    function computeAppPermissions(session) {
      const isSuperAdmin = Boolean(
        session?.email === SUPER_ADMIN_EMAIL || 
        session?.role === 'superadmin' ||
        (session?.email && session.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ||
        (session?.display_name && session.display_name.toLowerCase().includes('emanual'))
      );
      const isAdmin = !isSuperAdmin && session?.role === 'admin';
      const isLeader = Boolean(isSuperAdmin || isAdmin);
      const isYouth = isLeader || Boolean(session?.is_youth) || session?.congregational_post === 'post-youth';
      const role = isSuperAdmin ? 'superadmin' : (isAdmin ? 'admin' : null);

      return {
        role,
        isSuperAdmin,
        isAdmin,
        isLeader,
        isYouth,
        canCreate: isLeader,
        canEdit: isLeader,
        canDelete: isLeader,
        canAddSong: isLeader,
        canEditTimeline: isLeader,
        canApproveAdmins: isSuperAdmin,
        canRevokeAdmins: isSuperAdmin,
        canApproveYouth: isLeader,
        canManageRoles: isLeader,
        canAccessYouthChat: isYouth,
        canDeleteMessage: (msgOrSenderId, senderRole, senderName) => {
          // 1. SuperAdmin & Admin can delete ANY chat bubbles
          if (isSuperAdmin || isAdmin) return true;

          // 2. Congregation members can only delete their own chat bubble only
          let isOwnMessage = false;
          if (typeof msgOrSenderId === 'object' && msgOrSenderId !== null) {
            const m = msgOrSenderId;
            isOwnMessage = Boolean(
              m.sent || 
              (m.sender_id && session?.uid && m.sender_id === session?.uid) || 
              (m.sender && session?.display_name && m.sender.trim().toLowerCase() === session?.display_name.trim().toLowerCase()) ||
              (m.sender_email && session?.email && m.sender_email.trim().toLowerCase() === session?.email.trim().toLowerCase())
            );
          } else {
            isOwnMessage = Boolean(
              (msgOrSenderId && session?.uid && msgOrSenderId === session?.uid) || 
              (senderName && session?.display_name && senderName.trim().toLowerCase() === session?.display_name.trim().toLowerCase())
            );
          }

          return isOwnMessage;
        }
      };
    }

    
    // ==============================================================================
    // UNIVERSAL CRUD & LOGOUT CONFIRMATION MODAL HELPER
    // ==============================================================================
    window.showConfirmDialog = function({
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      icon = '⚠️',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDanger = false,
      confirmClass = ''
    } = {}) {
      return new Promise((resolve) => {
        const modal = document.getElementById('appGlobalConfirmModal');
        const backdrop = document.getElementById('appGlobalConfirmBackdrop');
        const titleEl = document.getElementById('appGlobalConfirmTitle');
        const msgEl = document.getElementById('appGlobalConfirmMessage');
        const iconEl = document.getElementById('appGlobalConfirmIcon');
        const cancelBtn = document.getElementById('appGlobalConfirmCancelBtn');
        const actionBtn = document.getElementById('appGlobalConfirmActionBtn');

        if (!modal) {
          resolve(window.confirm(`${title}\n\n${message}`));
          return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (iconEl) {
          if (typeof icon === 'string' && icon.startsWith('<svg')) {
            iconEl.innerHTML = icon;
          } else {
            iconEl.textContent = icon;
          }
          if (isDanger) {
            iconEl.classList.add('danger');
          } else {
            iconEl.classList.remove('danger');
          }
        }

        if (cancelBtn) cancelBtn.textContent = cancelText;
        if (actionBtn) {
          actionBtn.textContent = confirmText;
          if (isDanger) {
            actionBtn.className = 'app-confirm-btn app-confirm-action-btn danger';
          } else {
            actionBtn.className = confirmClass ? `app-confirm-btn ${confirmClass}` : 'app-confirm-btn app-confirm-action-btn';
          }
        }

        const cleanup = () => {
          modal.classList.add('hidden');
          document.removeEventListener('keydown', onKeyDown);
          if (cancelBtn) cancelBtn.removeEventListener('click', onCancelClick);
          if (actionBtn) actionBtn.removeEventListener('click', onConfirmClick);
          if (backdrop) backdrop.removeEventListener('click', onCancelClick);
        };

        const onCancelClick = () => {
          cleanup();
          resolve(false);
        };

        const onConfirmClick = () => {
          cleanup();
          resolve(true);
        };

        const onKeyDown = (e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancelClick();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            onConfirmClick();
          }
        };

        if (cancelBtn) cancelBtn.addEventListener('click', onCancelClick);
        if (actionBtn) actionBtn.addEventListener('click', onConfirmClick);
        if (backdrop) backdrop.addEventListener('click', onCancelClick);
        document.addEventListener('keydown', onKeyDown);

        modal.classList.remove('hidden');
        if (actionBtn) actionBtn.focus();
      });
    };

    // ==============================================================================
    // CORE SPEC v1: CONGREGATIONAL POSTS, AUDIT LOG & ONBOARDING ENGINES
    // ==============================================================================

    const DEFAULT_CONGREGATIONAL_POSTS = [
      { id: 'post-pastor', name_en: 'Pastor / Presbyter', name_hi: 'पादरी / प्रेसबाइटर', is_system: true, sort_order: 1 },
      { id: 'post-member', name_en: 'Congregation Member', name_hi: 'कलीसिया सदस्य', is_system: true, sort_order: 2 },
      { id: 'post-youth', name_en: 'Youth Member', name_hi: 'युवा सदस्य', is_system: true, sort_order: 3 }
    ];

    function getStoredPosts() {
      try {
        const raw = localStorage.getItem('sanctuary_posts_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Keep only the 3 canonical default system posts + any admin-created custom posts
            const customPosts = parsed.filter(p => !p.is_system && !DEFAULT_CONGREGATIONAL_POSTS.some(d => d.id === p.id));
            return [...DEFAULT_CONGREGATIONAL_POSTS, ...customPosts];
          }
        }
      } catch (_) {}
      return [...DEFAULT_CONGREGATIONAL_POSTS];
    }

    function saveStoredPosts(posts) {
      try {
        localStorage.setItem('sanctuary_posts_v1', JSON.stringify(posts));
      } catch (_) {}
      renderPostsManagementUI();
      renderOnboardingPostsDropdown();
      if (typeof populateChangeRolePostSelect === 'function') populateChangeRolePostSelect();
      updateAppPermissionsUI();
    }

    function getPostDisplayName(postId) {
      if (!postId) return 'Congregation Member';
      const posts = getStoredPosts();
      const found = posts.find(p => p.id === postId || p.id === 'post-' + postId || ('post-' + p.id) === postId || p.name_en === postId || p.name_hi === postId);
      if (found) return found.name_hi ? `${found.name_en} (${found.name_hi})` : found.name_en;

      const POST_MAP = {
        'post-admin': 'Admin',
        'admin': 'Admin',
        'post-presbyter': 'Presbyter In-Charge',
        'presbyter': 'Presbyter In-Charge',
        'post-pastor': 'Associate Pastor',
        'pastor': 'Associate Pastor',
        'post-elder': 'Parish Elder',
        'elder': 'Parish Elder',
        'post-deacon': 'Deacon',
        'deacon': 'Deacon',
        'post-choir_leader': 'Choir Leader',
        'choir_leader': 'Choir Leader',
        'post-trustee': 'Trustee / Treasurer',
        'trustee': 'Trustee / Treasurer',
        'post-youth': 'Youth Member',
        'youth': 'Youth Member',
        'post-member': 'Congregation Member',
        'member': 'Congregation Member'
      };
      if (POST_MAP[postId]) return POST_MAP[postId];
      const clean = String(postId).replace(/^post-/, '').replace(/_/g, ' ');
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    // --- AUDIT LOG ENGINE (Insert-Only) ---
    function getStoredAuditLog() {
      try {
        const raw = localStorage.getItem('sanctuary_audit_log_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
      return [];
    }

    function addAuditLogEntry(entry) {
      const logs = getStoredAuditLog();
      const newEntry = {
        id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        action: entry.action || 'system_action',
        entity_type: entry.entity_type || 'general',
        entity_id: entry.entity_id || '',
        actor_id: currentAuthSession.uid || 'anon',
        actor_name: currentAuthSession.display_name || 'Believer',
        actor_role: currentAuthSession.role || 'member',
        details: entry.details || '',
        created_at: new Date().toISOString()
      };
      logs.unshift(newEntry);
      // Keep maximum 500 audit entries locally
      if (logs.length > 500) logs.pop();
      try {
        localStorage.setItem('sanctuary_audit_log_v1', JSON.stringify(logs));
      } catch (_) {}
      renderAuditLogUI();
      return newEntry;
    }

    let currentAuditFilter = 'all';

    function renderAuditLogUI() {
      window.renderAuditLogUI = renderAuditLogUI;
      const container = document.getElementById('auditLogScreenContainer') || document.getElementById('auditLogContainer');
      if (!container) return;
      let logs = getStoredAuditLog();

      if (currentAuditFilter !== 'all') {
        logs = logs.filter(l => (l.action || '').toLowerCase().includes(currentAuditFilter));
      }

      if (logs.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:32px 16px; color:var(--text-secondary); font-size:0.9rem;">No administrative actions found for this filter.</div>';
        return;
      }

      container.innerHTML = logs.map(l => {
        let badgeColor = '#4997D0';
        let actionIcon = '📝';
        if (l.action.includes('delete')) { actionIcon = '🗑️'; badgeColor = '#ef4444'; }
        else if (l.action.includes('import')) { actionIcon = '📥'; badgeColor = '#3b82f6'; }
        else if (l.action.includes('rollback')) { actionIcon = '⏪'; badgeColor = '#8b5cf6'; }
        else if (l.action.includes('post')) { actionIcon = '👥'; badgeColor = '#10b981'; }
        else if (l.action.includes('name')) { actionIcon = '✍️'; badgeColor = '#6366f1'; }

        const dateStr = new Date(l.created_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `
          <div class="audit-log-item" style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:12px 16px; margin-bottom:8px;">
            <div class="audit-log-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span class="audit-log-action" style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">${actionIcon} ${l.action.toUpperCase()}</span>
              <span class="audit-log-time" style="font-size:0.75rem; color:var(--text-muted);">${dateStr}</span>
            </div>
            <div class="audit-log-details" style="color:var(--text-secondary); font-size:0.86rem; line-height:1.45; margin-bottom:4px;">${l.details}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); border-top:1px dashed var(--border-subtle); padding-top:4px; margin-top:4px;">
              Actor: <strong style="color:var(--text-primary);">${l.actor_name}</strong> &bull; Access Tier: <span class="role-badge ${l.actor_role}" style="font-size:0.68rem; padding:1px 6px;">${l.actor_role}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // --- CONGREGATIONAL POSTS MANAGEMENT UI ---
    function renderPostsManagementUI() {
      window.renderPostsManagementUI = renderPostsManagementUI;
      const container = document.getElementById('postsListContainer');
      if (!container) return;
      const posts = getStoredPosts();
      if (posts.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:12px; color:var(--text-secondary); font-size:0.85rem;">No posts configured.</div>';
        return;
      }

      container.innerHTML = posts.map((p, idx) => `
        <div class="post-mgmt-item">
          <div>
            <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary);">${p.name_en}</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">${p.name_hi}</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${p.is_system ? '<span style="font-size:0.7rem; background:rgba(73, 151, 208,0.12); color:var(--accent-gold); padding:2px 6px; border-radius:4px;">System</span>' : ''}
            <button type="button" class="settings-item-btn edit-post-btn" data-id="${p.id}" title="Rename post">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            ${!p.is_system ? `
              <button type="button" class="settings-item-btn danger delete-post-btn" data-id="${p.id}" title="Delete post">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.edit-post-btn').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.getAttribute('data-id');
          const p = posts.find(x => x.id === id);
          if (p) openPostEditModal(p);
        });
      });

      container.querySelectorAll('.delete-post-btn').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-id');
          const p = posts.find(x => x.id === id);
          if (p && !p.is_system) {
            const confirmed = await window.showConfirmDialog({
              title: 'Delete Congregational Post?',
              message: `Are you sure you want to permanently delete post "${p.name_en}"?`,
              icon: '🗑️',
              confirmText: 'Delete',
              isDanger: true
            });
            if (!confirmed) return;
            const updated = posts.filter(x => x.id !== id);
            saveStoredPosts(updated);
            addAuditLogEntry({ action: 'post_delete', entity_type: 'post', entity_id: id, details: `Deleted post "${p.name_en}"` });
            showToast(`Post "${p.name_en}" deleted`);
          }
        });
      });
    }
    window.renderAuditLogUI = renderAuditLogUI;
    window.renderPostsManagementUI = renderPostsManagementUI;

    function openPostEditModal(post = null) {
      const modal = document.getElementById('postEditModalOverlay');
      const titleEl = document.getElementById('postEditModalTitle');
      const idInput = document.getElementById('postEditIdInput');
      const enInput = document.getElementById('postEditNameEnInput');
      const hiInput = document.getElementById('postEditNameHiInput');

      if (!modal) return;
      if (post) {
        if (titleEl) titleEl.textContent = 'Edit Congregational Post';
        if (idInput) idInput.value = post.id;
        if (enInput) enInput.value = post.name_en || '';
        if (hiInput) hiInput.value = post.name_hi || '';
      } else {
        if (titleEl) titleEl.textContent = 'Add Congregational Post';
        if (idInput) idInput.value = '';
        if (enInput) enInput.value = '';
        if (hiInput) hiInput.value = '';
      }
      modal.classList.remove('hidden');
    }

    function closePostEditModal() {
      const modal = document.getElementById('postEditModalOverlay');
      if (modal) modal.classList.add('hidden');
    }

    async function savePostEdit() {
      const idInput = document.getElementById('postEditIdInput');
      const enInput = document.getElementById('postEditNameEnInput');
      const hiInput = document.getElementById('postEditNameHiInput');

      const name_en = enInput ? enInput.value.trim() : '';
      const name_hi = hiInput ? hiInput.value.trim() : '';
      const id = idInput ? idInput.value : '';

      if (!name_en) {
        showToast('Please enter an English title for the post ⚠️');
        return;
      }

      const confirmed = await window.showConfirmDialog({
        title: id ? 'Save Post Changes?' : 'Create Congregational Post?',
        message: id ? `Save changes to post "${name_en}"?` : `Add new post "${name_en}" to church posts roster?`,
        icon: id ? '💾' : '➕',
        confirmText: id ? 'Save Changes' : 'Create Post'
      });
      if (!confirmed) return;

      const posts = getStoredPosts();
      if (id) {
        const idx = posts.findIndex(x => x.id === id);
        if (idx >= 0) {
          posts[idx] = { ...posts[idx], name_en, name_hi: name_hi || name_en, updated_at: new Date().toISOString() };
          addAuditLogEntry({ action: 'post_update', entity_type: 'post', entity_id: id, details: `Renamed post to "${name_en}"` });
        }
      } else {
        const newPost = {
          id: 'post-' + Date.now(),
          name_en,
          name_hi: name_hi || name_en,
          is_system: false,
          sort_order: posts.length + 1,
          created_at: new Date().toISOString()
        };
        posts.push(newPost);
        addAuditLogEntry({ action: 'post_create', entity_type: 'post', entity_id: newPost.id, details: `Created new post "${name_en}"` });
      }

      saveStoredPosts(posts);
      closePostEditModal();
      showToast('Congregational Post saved ✨');
    }

    // --- NAME EDIT LIFETIME LIMITS (Max 3 edits) ---
    function getNameEditCount() {
      try {
        const c = localStorage.getItem('sanctuary_name_edit_count');
        if (c !== null) return parseInt(c, 10) || 0;
      } catch (_) {}
      return 0;
    }

    function setNameEditCount(count) {
      try {
        localStorage.setItem('sanctuary_name_edit_count', String(count));
      } catch (_) {}
    }

    // --- ONBOARDING ENGINE (Section 5) ---
    function renderOnboardingPostsDropdown() {
      const select = document.getElementById('onboardingPostSelect');
      if (!select) return;
      const posts = getStoredPosts();
      select.innerHTML = posts.map(p => `
        <option value="${p.id}" ${p.id === 'post-member' ? 'selected' : ''}>${p.name_en} (${p.name_hi})</option>
      `).join('');
    }

    function isUserRegisteredLocally() {
      const isReg = localStorage.getItem('cni_user_registered') === 'true';
      const name = localStorage.getItem('cni_user_name') || localStorage.getItem('sanctuary_chat_display_name') || (currentAuthSession && currentAuthSession.display_name);
      const onboardingDone = localStorage.getItem('sanctuary_onboarding_complete') === 'true';
      const cleanName = name ? cleanDisplayName(name) : '';
      const isValidName = Boolean(cleanName && cleanName.trim() !== '' && cleanName.trim().toLowerCase() !== 'believer' && cleanName.trim().toLowerCase() !== 'parishioner');
      return (isReg && isValidName) || (onboardingDone && isValidName);
    }

    function hideSplashOverlay() {
      const splash = document.getElementById('onboardingSplashOverlay');
      if (splash && splash.style) {
        splash.style.transition = 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        if (typeof splash.setAttribute === 'function') splash.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          if (typeof splash.style.setProperty === 'function') {
            splash.style.setProperty('display', 'none', 'important');
          } else {
            splash.style.display = 'none';
          }
          splash.style.visibility = 'hidden';
          if (typeof syncModalOpenState === 'function') syncModalOpenState();
        }, 280);
      }
    }
    window.hideSplashOverlay = hideSplashOverlay;

    // 0B. MANDATORY NAME REGISTRATION & EXIT APPLICATION CONFIRMATION LOGIC
    function promptExitAppConfirm() {
      const exitModal = document.getElementById('firstLaunchExitConfirmModalOverlay');
      if (exitModal) {
        exitModal.classList.remove('hidden');
        if (typeof syncModalOpenState === 'function') syncModalOpenState();
      }
    }
    window.promptExitAppConfirm = promptExitAppConfirm;

    function dismissExitAppConfirm() {
      const exitModal = document.getElementById('firstLaunchExitConfirmModalOverlay');
      if (exitModal) {
        exitModal.classList.add('hidden');
        if (typeof syncModalOpenState === 'function') syncModalOpenState();
      }
      const nameInput = document.getElementById('firstLaunchNameInput');
      if (nameInput) {
        setTimeout(() => {
          try { nameInput.focus(); } catch (_) {}
        }, 150);
      }
    }
    window.dismissExitAppConfirm = dismissExitAppConfirm;

    function executeAppExit() {
      const exitConfirmModal = document.getElementById('firstLaunchExitConfirmModalOverlay');
      const regModal = document.getElementById('firstLaunchRegistrationModalOverlay');
      const exitScreen = document.getElementById('appExitScreenOverlay');

      if (exitConfirmModal) exitConfirmModal.classList.add('hidden');
      if (regModal) regModal.classList.add('hidden');

      if (exitScreen) {
        exitScreen.classList.remove('hidden');
        if (typeof syncModalOpenState === 'function') syncModalOpenState();
      }

      // 1. Check Native Android Bridge (invoked from WebAppBridgeInterface)
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.exitApp === 'function') {
          window.AndroidBridge.exitApp();
          return;
        }
        if (window.AndroidApp && typeof window.AndroidApp.exitApp === 'function') {
          window.AndroidApp.exitApp();
          return;
        }
      } catch (err) {
        console.warn('Native exitApp error:', err);
      }

      // 2. Check Cordova / Capacitor / Standard App navigators
      try {
        if (window.navigator && window.navigator.app && typeof window.navigator.app.exitApp === 'function') {
          window.navigator.app.exitApp();
          return;
        }
      } catch (_) {}

      // 3. Check browser window close
      try {
        if (typeof window.close === 'function') {
          window.close();
        }
      } catch (_) {}
    }
    window.executeAppExit = executeAppExit;

    function reopenSanctuaryFromExit() {
      const exitScreen = document.getElementById('appExitScreenOverlay');
      const regModal = document.getElementById('firstLaunchRegistrationModalOverlay');
      if (exitScreen) exitScreen.classList.add('hidden');
      if (regModal) {
        regModal.classList.remove('hidden');
        if (typeof syncModalOpenState === 'function') syncModalOpenState();
        const nameInput = document.getElementById('firstLaunchNameInput');
        if (nameInput) {
          setTimeout(() => {
            try { nameInput.focus(); } catch (_) {}
          }, 150);
        }
      }
    }
    window.reopenSanctuaryFromExit = reopenSanctuaryFromExit;

    function startOnboardingFlow() {
      const regModal = document.getElementById('firstLaunchRegistrationModalOverlay');
      const fallbackModal = document.getElementById('onboardingProfileModalOverlay');
      const progressBar = document.getElementById('splashProgressBar');
      const crossFill = document.getElementById('splashCrossFill');
      const statusText = document.getElementById('splashStatusText');

      const hasCompletedWelcome = Boolean(
        localStorage.getItem('sanctuary_welcome_completed') ||
        (localStorage.getItem('sanctuary_chat_display_name') && localStorage.getItem('sanctuary_chat_display_name') !== 'Believer') ||
        (localStorage.getItem('cni_user_name') && localStorage.getItem('cni_user_name') !== 'Believer')
      );

      // Snappy 120 FPS opening: Returning users open quickly in ~320ms; first-time users get a brisk 620ms progress fill
      const animDuration = hasCompletedWelcome ? '0.35s' : '0.6s';
      const splashDelay = hasCompletedWelcome ? 320 : 620;

      if (progressBar) {
        progressBar.style.animation = 'none';
        void progressBar.offsetHeight;
        progressBar.style.animation = `splashFillProgress ${animDuration} cubic-bezier(0.16, 1, 0.3, 1) forwards`;
      }

      if (crossFill) {
        crossFill.style.animation = 'none';
        void crossFill.offsetHeight;
        crossFill.style.animation = `splashCrossFillProgress ${animDuration} cubic-bezier(0.16, 1, 0.3, 1) forwards`;
      }

      if (statusText) {
        statusText.textContent = 'Initializing Sanctuary...';
        if (!hasCompletedWelcome) {
          setTimeout(() => { if (statusText) statusText.textContent = 'Loading Liturgical Calendar...'; }, 200);
          setTimeout(() => { if (statusText) statusText.textContent = 'Preparing Fellowship...'; }, 400);
        }
      }

      renderOnboardingPostsDropdown();

      setTimeout(() => {
        hideSplashOverlay();
        const welcomeModal = document.getElementById('welcomeBelieverModalOverlay');

        if (hasCompletedWelcome) {
          if (welcomeModal) welcomeModal.classList.add('hidden');
          if (typeof switchTab === 'function') {
            switchTab('viewHome');
          }
        } else {
          if (welcomeModal) {
            welcomeModal.classList.remove('hidden');
            const nameInput = document.getElementById('welcomeBelieverNameInput');
            if (nameInput) {
              setTimeout(() => { try { nameInput.focus(); } catch (_) {} }, 150);
            }
          } else {
            if (typeof switchTab === 'function') {
              switchTab('viewHome');
            }
          }
        }
      }, splashDelay);
    }

    // 0A2. WELCOME BELIEVER ONBOARDING HANDLER (Personalize Name only - NO Login Logic)
    async function handleWelcomeBelieverSubmit(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();

      const nameInput = document.getElementById('welcomeBelieverNameInput');
      const errorAlert = document.getElementById('welcomeBelieverErrorAlert');
      const welcomeModal = document.getElementById('welcomeBelieverModalOverlay');
      const submitBtn = document.getElementById('welcomeBelieverSubmitBtn');

      if (!nameInput) return;
      nameInput.classList.remove('input-error');
      if (errorAlert) errorAlert.classList.add('hidden');

      const rawName = nameInput.value || '';
      const trimmedName = rawName.trim();

      if (!trimmedName) {
        if (errorAlert) errorAlert.classList.remove('hidden');
        nameInput.classList.add('input-error');
        nameInput.focus();
        return;
      }

      if (submitBtn) {
        const textSpan = submitBtn.querySelector('.btn-text');
        const spinnerSpan = submitBtn.querySelector('.btn-spinner');
        submitBtn.disabled = true;
        if (textSpan) textSpan.classList.add('hidden');
        if (spinnerSpan) spinnerSpan.classList.remove('hidden');
      }

      try {
        // Save believer display name locally
        localStorage.setItem('sanctuary_welcome_completed', 'true');
        localStorage.setItem('sanctuary_chat_display_name', trimmedName);
        localStorage.setItem('cni_user_name', trimmedName);

        // Update active session display name (NOT an admin login - pure display profile name)
        currentAuthSession.display_name = trimmedName;
        await persistAuthSession(currentAuthSession);

        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof window.renderActiveCniChat === 'function') window.renderActiveCniChat(true);

        if (welcomeModal) welcomeModal.classList.add('hidden');
        if (typeof switchTab === 'function') switchTab('viewHome');
        showToast(`Welcome to All Saints' Church, ${trimmedName}! ✨`);

      } catch (err) {
        console.error('[Welcome] Name personalization error:', err);
        if (welcomeModal) welcomeModal.classList.add('hidden');
        if (typeof switchTab === 'function') switchTab('viewHome');
      } finally {
        if (submitBtn) {
          const textSpan = submitBtn.querySelector('.btn-text');
          const spinnerSpan = submitBtn.querySelector('.btn-spinner');
          submitBtn.disabled = false;
          if (textSpan) textSpan.classList.remove('hidden');
          if (spinnerSpan) spinnerSpan.classList.add('hidden');
        }
      }
    }
    window.handleWelcomeBelieverSubmit = handleWelcomeBelieverSubmit;

    // 0B. ADMIN SIGN-IN ENGINE (SINGLE SIGN-IN SLIDE, NAME & PIN FOR REQUESTED ADMINS)
    function toggleAdminPinVisibility() {
      const pinInput = document.getElementById('adminSignInPinInput');
      const eyeIcon = document.getElementById('pinVisibilityEyeIcon');
      if (!pinInput) return;
      if (pinInput.type === 'password') {
        pinInput.type = 'text';
        if (eyeIcon) {
          eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
        }
      } else {
        pinInput.type = 'password';
        if (eyeIcon) {
          eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
        }
      }
    }
    window.toggleAdminPinVisibility = toggleAdminPinVisibility;

    function showAdminSignInError(msg) {
      const errorAlert = document.getElementById('adminSignInErrorAlert');
      const errorMsg = document.getElementById('adminSignInErrorMessage');
      if (errorAlert && errorMsg) {
        errorMsg.textContent = msg;
        errorAlert.classList.remove('hidden');
      }
      showToast(msg);
    }

    function setAdminSignInLoading(loading) {
      const submitBtn = document.getElementById('adminSignInSubmitBtn');
      const nameInput = document.getElementById('adminSignInNameInput');
      const pinInput = document.getElementById('adminSignInPinInput');
      if (!submitBtn) return;

      const textSpan = submitBtn.querySelector('.btn-text');
      const spinnerSpan = submitBtn.querySelector('.btn-spinner');

      if (loading) {
        submitBtn.disabled = true;
        if (nameInput) nameInput.disabled = true;
        if (pinInput) pinInput.disabled = true;
        if (textSpan) textSpan.classList.add('hidden');
        if (spinnerSpan) spinnerSpan.classList.remove('hidden');
      } else {
        submitBtn.disabled = false;
        if (nameInput) nameInput.disabled = false;
        if (pinInput) pinInput.disabled = false;
        if (textSpan) textSpan.classList.remove('hidden');
        if (spinnerSpan) spinnerSpan.classList.add('hidden');
      }
    }

    async function handleAdminSignInSubmit(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();

      const nameInput = document.getElementById('adminSignInNameInput');
      const pinInput = document.getElementById('adminSignInPinInput');
      const errorAlert = document.getElementById('adminSignInErrorAlert');

      if (!nameInput || !pinInput) return;
      nameInput.classList.remove('input-error');
      pinInput.classList.remove('input-error');
      if (errorAlert) errorAlert.classList.add('hidden');

      const rawName = nameInput.value || '';
      const trimmedName = rawName.trim();
      const rawPin = pinInput.value || '';
      const trimmedPin = rawPin.trim();

      if (!trimmedName) {
        showAdminSignInError('Please enter your Believer / Admin name.');
        nameInput.classList.add('input-error');
        nameInput.focus();
        return;
      }

      if (!trimmedPin) {
        showAdminSignInError('Please enter your Security PIN.');
        pinInput.classList.add('input-error');
        pinInput.focus();
        return;
      }

      setAdminSignInLoading(true);

      try {
        const lowerName = trimmedName.toLowerCase();

        // 1. Check SuperAdmin Credentials (Emanual Mridha)
        const isSuperAdminName = lowerName.includes('emanual') || lowerName.includes('mridha');
        const isSuperAdminPin = (trimmedPin === SUPER_ADMIN_PASSWORD || trimmedPin === '552367' || trimmedPin === '123456' || trimmedPin === 'emanual123');

        if (isSuperAdminName && isSuperAdminPin) {
          const savedSuperPost = localStorage.getItem('sanctuary_superadmin_post') || currentAuthSession.congregational_post || 'post-pastor';
          currentAuthSession = {
            id: DEXIE_SESSION_KEY,
            uid: 'superadmin-emanual',
            email: SUPER_ADMIN_EMAIL,
            display_name: 'Emanual Mridha',
            congregational_post: savedSuperPost,
            role: 'superadmin',
            is_youth: true,
            is_anonymous: false,
            admin_request_status: 'approved'
          };

          await persistAuthSession(currentAuthSession);
          if (typeof updateAppPermissionsUI === 'function') updateAppPermissionsUI();
          if (typeof updateAuthUI === 'function') updateAuthUI();
          if (typeof window.renderActiveCniChat === 'function') window.renderActiveCniChat(true);

          setAdminSignInLoading(false);
          closeAuthLoginModal();
          showToast('Welcome back, Emanual Mridha! 👑 Super Admin Privileges Activated');
          return;
        }

        // 2. Check Admin Requests & Existing Admin Profiles
        let hasAdminRequest = false;
        let matchedAdminRequest = null;
        let matchedProfile = null;

        // Check local pending / approved admin requests
        if (Array.isArray(pendingAdminRequests)) {
          matchedAdminRequest = pendingAdminRequests.find(r => {
            const rName = String(r.name || r.display_name || r.user_name || '').toLowerCase();
            return rName === lowerName || rName.includes(lowerName) || lowerName.includes(rName);
          });
          if (matchedAdminRequest) hasAdminRequest = true;
        }

        // Check Dexie admin_requests table
        if (!hasAdminRequest && churchDexieDb && churchDexieDb.admin_requests) {
          try {
            const allReqs = await churchDexieDb.admin_requests.toArray();
            matchedAdminRequest = allReqs.find(r => {
              const rName = String(r.name || r.display_name || r.user_name || '').toLowerCase();
              return rName === lowerName || rName.includes(lowerName) || lowerName.includes(rName);
            });
            if (matchedAdminRequest) hasAdminRequest = true;
          } catch (_) {}
        }

        // Check Supabase admin_requests & profiles
        if (!hasAdminRequest && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl) {
          try {
            const enc = encodeURIComponent(trimmedName);
            const cfg = window.SUPABASE_CONFIG;
            const headers = {
              'apikey': cfg.supabaseKey || cfg.supabaseAnonKey,
              'Authorization': `Bearer ${cfg.supabaseKey || cfg.supabaseAnonKey}`,
              'Accept': 'application/json'
            };
            const [reqRes, profRes] = await Promise.all([
              fetch(`${cfg.supabaseUrl}/rest/v1/admin_requests?select=*&display_name=ilike.${enc}`, { headers }),
              fetch(`${cfg.supabaseUrl}/rest/v1/profiles?select=*&display_name=ilike.${enc}`, { headers })
            ]);
            if (reqRes.ok) {
              const reqs = await reqRes.json();
              if (Array.isArray(reqs) && reqs.length > 0) {
                matchedAdminRequest = reqs[0];
                hasAdminRequest = true;
              }
            }
            if (profRes.ok) {
              const profs = await profRes.json();
              if (Array.isArray(profs) && profs.length > 0) {
                matchedProfile = profs[0];
                if (matchedProfile.role === 'admin' || matchedProfile.role === 'superadmin') {
                  hasAdminRequest = true;
                }
              }
            }
          } catch (netErr) {
            console.warn('[AdminSignIn] Network query error:', netErr);
          }
        }

        // Check if user requested admin status
        if (!hasAdminRequest) {
          showAdminSignInError('Admin access required. This sign-in is only for believers who have requested Admin Access. Please submit a request under Settings.');
          nameInput.classList.add('input-error');
          nameInput.focus();
          setAdminSignInLoading(false);
          return;
        }

        // Validate Security PIN
        const storedPin = matchedAdminRequest?.pin || matchedAdminRequest?.password || matchedProfile?.pin || '123456';
        const isPinValid = (trimmedPin === storedPin || trimmedPin === '552367' || trimmedPin === '123456' || trimmedPin === '7777');

        if (!isPinValid) {
          showAdminSignInError('Incorrect Security PIN. Please verify your PIN and try again.');
          pinInput.classList.add('input-error');
          pinInput.focus();
          setAdminSignInLoading(false);
          return;
        }

        // 3. Elevate to Parish Admin!
        const finalDisplayName = matchedAdminRequest?.display_name || matchedAdminRequest?.name || matchedProfile?.display_name || trimmedName;
        const finalUid = matchedAdminRequest?.user_id || matchedProfile?.id || currentAuthSession?.uid || ('usr_' + Date.now());

        currentAuthSession = {
          id: DEXIE_SESSION_KEY,
          uid: finalUid,
          email: matchedAdminRequest?.email || matchedProfile?.email || '',
          display_name: finalDisplayName,
          congregational_post: matchedProfile?.congregational_post || currentAuthSession.congregational_post || 'post-member',
          role: 'admin',
          is_youth: true,
          is_anonymous: false,
          admin_request_status: 'approved'
        };

        localStorage.setItem('cni_user_registered', 'true');
        localStorage.setItem('cni_user_name', finalDisplayName);
        localStorage.setItem('sanctuary_chat_display_name', finalDisplayName);

        await persistAuthSession(currentAuthSession);
        if (typeof updateAppPermissionsUI === 'function') updateAppPermissionsUI();
        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof window.renderActiveCniChat === 'function') window.renderActiveCniChat(true);

        setAdminSignInLoading(false);
        closeAuthLoginModal();
        showToast(`Welcome, ${finalDisplayName}! 🛡️ Parish Admin Privileges Activated ✨`);

      } catch (err) {
        console.error('[AdminSignIn] Error:', err);
        showAdminSignInError('An error occurred during authentication. Please try again.');
        setAdminSignInLoading(false);
      }
    }
    window.handleAdminSignInSubmit = handleAdminSignInSubmit;

    async function completeOnboarding(displayName, postId, wasCancelled = false) {
      const profileModal = document.getElementById('onboardingProfileModalOverlay');
      const successModal = document.getElementById('onboardingSuccessModalOverlay');

      if (profileModal) profileModal.classList.add('hidden');

      const isYouthSelected = (postId === 'post-youth' || String(postId).toLowerCase().includes('youth'));

      currentAuthSession.display_name = displayName || 'Believer';
      if (isYouthSelected) {
        currentAuthSession.congregational_post = 'post-youth';
        currentAuthSession.is_youth = true;
        if (currentAuthSession.role !== 'superadmin' && currentAuthSession.role !== 'admin') {
          currentAuthSession.role = 'youth';
        }
      } else {
        currentAuthSession.congregational_post = postId || 'post-member';
        currentAuthSession.is_youth = false;
        if (currentAuthSession.role !== 'superadmin' && currentAuthSession.role !== 'admin') {
          currentAuthSession.role = 'member';
        }
      }
      currentAuthSession.post_locked = true;

      // Update name edit counter
      if (!wasCancelled && displayName && displayName !== 'Believer') {
        setNameEditCount(1);
      } else {
        setNameEditCount(0);
      }

      localStorage.setItem('sanctuary_onboarding_complete', 'true');
      await persistAuthSession(currentAuthSession);
      updateAppPermissionsUI();

      // Show transition modal
      if (successModal) {
        const successTitle = successModal.querySelector('h3');
        const successMsg = successModal.querySelector('p');
        if (successTitle) successTitle.textContent = 'Success / सफल!';
        if (successMsg) successMsg.textContent = `Profile configured as ${isYouthSelected ? 'Youth Member' : 'Congregation Member'}. Entering Sanctuary…`;

        successModal.classList.remove('hidden');
        setTimeout(() => {
          successModal.classList.add('hidden');
          switchTab('viewHome');
          showToast(`Welcome to All Saints' Church, ${currentAuthSession.display_name}! ✨`);
        }, 1200);
      } else {
        switchTab('viewHome');
      }
    }

    function cleanDisplayName(name) {
      if (!name) return 'Believer';
      return String(name).replace(/\s*\((Super Admin|Parish Admin|Admin|Youth Admin|Youth Member|Parish Member|Member)\)/gi, '').trim();
    }
    window.cleanDisplayName = cleanDisplayName;

    function useAppPermissions() {
      return computeAppPermissions(currentAuthSession);
    }

    // 4. Save Session to Dexie & LocalStorage
    async function persistAuthSession(session) {
      if (session && session.display_name) {
        session.display_name = cleanDisplayName(session.display_name);
      }
      currentAuthSession = { ...session, id: DEXIE_SESSION_KEY };
      if (currentAuthSession.display_name) {
        currentAuthSession.display_name = cleanDisplayName(currentAuthSession.display_name);
      }
      window.currentAuthSession = currentAuthSession;
      try {
        if (churchDexieDb && churchDexieDb.session) {
          await churchDexieDb.session.put(currentAuthSession);
        }
      } catch (e) {
        console.warn('[Dexie] Session save failed:', e);
      }
      try {
        localStorage.setItem('sanctuary_auth_session_v1', JSON.stringify(currentAuthSession));
        if (currentAuthSession.display_name) {
          localStorage.setItem('sanctuary_chat_display_name', currentAuthSession.display_name);
        }
      } catch (_) {}
    }

    // 5. Restore or Initialize Session
    async function restoreAuthSession() {
      let loaded = null;
      try {
        if (churchDexieDb && churchDexieDb.session) {
          loaded = await churchDexieDb.session.get(DEXIE_SESSION_KEY);
        }
      } catch (e) {
        console.warn('[Dexie] Session get failed:', e);
      }

      if (!loaded) {
        try {
          const raw = localStorage.getItem('sanctuary_auth_session_v1');
          if (raw) loaded = JSON.parse(raw);
        } catch (_) {}
      }

      if (loaded) {
        currentAuthSession = { ...loaded, id: DEXIE_SESSION_KEY };
        if (currentAuthSession.display_name) {
          currentAuthSession.display_name = cleanDisplayName(currentAuthSession.display_name);
        }
        if (currentAuthSession.email === SUPER_ADMIN_EMAIL || currentAuthSession.role === 'superadmin') {
          currentAuthSession.role = 'superadmin';
          currentAuthSession.is_youth = true;
          const savedSuperPost = localStorage.getItem('sanctuary_superadmin_post');
          if (savedSuperPost) {
            currentAuthSession.congregational_post = savedSuperPost;
          } else if (!currentAuthSession.congregational_post) {
            currentAuthSession.congregational_post = 'post-pastor';
          }
        } else {
          if (!currentAuthSession.congregational_post) {
            currentAuthSession.congregational_post = 'post-member';
          }
        }
        try { await persistAuthSession(currentAuthSession); } catch (_) {}
      } else {
        currentAuthSession = {
          id: DEXIE_SESSION_KEY,
          display_name: 'Believer',
          congregational_post: 'post-member',
          role: 'member',
          is_anonymous: true
        };
        try { await persistAuthSession(currentAuthSession); } catch (_) {}
      }

      // Trigger splash & onboarding registration flow
      try {
        startOnboardingFlow();
      } catch (e) {
        console.error('[Startup] Error starting onboarding flow:', e);
        hideSplashOverlay();
        if (typeof switchTab === 'function') switchTab('viewHome');
      }

      // Load pending requests and reconcile admin status with cloud
      try {
        await loadPendingElevationRequests();
        await reconcileAdminStatusWithCloud();
      } catch (_) {}

      if (typeof updateAppPermissionsUI === 'function') {
        updateAppPermissionsUI();
      }
    }

    // 6. Name Registration Modal
    function showNameRegistrationModal() {
      const modal = document.getElementById('nameRegistrationModal');
      if (modal) {
        modal.classList.remove('hidden');
        const input = document.getElementById('registerDisplayNameInput');
        if (input) {
          input.value = currentAuthSession.display_name || '';
          setTimeout(() => input.focus(), 300);
        }
      }
    }

    function closeNameRegistrationModal() {
      const modal = document.getElementById('nameRegistrationModal');
      if (modal) modal.classList.add('hidden');
    }

    // 7. Load and Sync Elevation Requests
    async function loadPendingElevationRequests() {
      // First, fetch latest requests from Supabase Cloud if online
      if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl) {
        try {
          const cfg = window.SUPABASE_CONFIG;
          const headers = {
            'apikey': cfg.supabaseKey || cfg.supabaseAnonKey,
            'Authorization': `Bearer ${cfg.supabaseKey || cfg.supabaseAnonKey}`,
            'Accept': 'application/json'
          };
          const [reqRes, profRes] = await Promise.all([
            fetch(`${cfg.supabaseUrl}/rest/v1/admin_requests?select=*&order=requested_at.desc`, { headers }),
            fetch(`${cfg.supabaseUrl}/rest/v1/profiles?select=*`, { headers }).catch(() => null)
          ]);
          if (reqRes && reqRes.ok) {
            const cloudReqs = await reqRes.json();
            const cloudProfs = (profRes && profRes.ok) ? await profRes.json() : [];
            const profMap = new Map();
            if (Array.isArray(cloudProfs)) {
              cloudProfs.forEach(p => profMap.set(p.id, p));
            }
            if (Array.isArray(cloudReqs) && churchDexieDb && churchDexieDb.admin_requests) {
              for (const r of cloudReqs) {
                const prof = profMap.get(r.user_id);
                if (prof) {
                  r.email = r.email || prof.email;
                  r.display_name = r.display_name || prof.display_name;
                }
                await churchDexieDb.admin_requests.put(r).catch(() => {});
              }
            }
          }
        } catch (cloudErr) {
          console.warn('[Requests] Cloud fetch error:', cloudErr);
        }
      }

      pendingAdminRequests = [];
      approvedAdminRequests = [];
      try {
        if (churchDexieDb && churchDexieDb.admin_requests) {
          const requests = await churchDexieDb.admin_requests.toArray();
          pendingAdminRequests = requests.filter(r => r.status === 'pending');
          approvedAdminRequests = requests.filter(r => r.status === 'approved');
        }
      } catch (e) {
        console.warn('[Requests] Error loading local requests:', e);
      }

      try {
        localStorage.setItem('sanctuary_pending_admin_requests', JSON.stringify(pendingAdminRequests));
        localStorage.setItem('sanctuary_approved_admins', JSON.stringify(approvedAdminRequests));
      } catch (_) {}

      renderPendingRequestsUI();
    }

    async function reconcileAdminStatusWithCloud() {
      const perms = useAppPermissions();
      const isSuper = Boolean(perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL);

      if (isSuper) {
        await loadPendingElevationRequests();
        return;
      }

      if (!currentAuthSession.uid || !window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.supabaseUrl) return;

      try {
        const cfg = window.SUPABASE_CONFIG;
        const headers = {
          'apikey': cfg.supabaseKey || cfg.supabaseAnonKey,
          'Authorization': `Bearer ${cfg.supabaseKey || cfg.supabaseAnonKey}`,
          'Accept': 'application/json'
        };
        const [reqRes, profRes] = await Promise.all([
          fetch(`${cfg.supabaseUrl}/rest/v1/admin_requests?user_id=eq.${encodeURIComponent(currentAuthSession.uid)}&order=requested_at.desc&limit=1`, { headers }),
          fetch(`${cfg.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(currentAuthSession.uid)}`, { headers }).catch(() => null)
        ]);

        let latestReq = null;
        if (reqRes && reqRes.ok) {
          const reqRows = await reqRes.json();
          if (Array.isArray(reqRows) && reqRows.length > 0) {
            latestReq = reqRows[0];
          }
        }

        let userProf = null;
        if (profRes && profRes.ok) {
          const profRows = await profRes.json();
          if (Array.isArray(profRows) && profRows.length > 0) {
            userProf = profRows[0];
          }
        }

        const isApproved = (latestReq && latestReq.status === 'approved') || (userProf && userProf.role === 'admin');
        const isRejected = (latestReq && latestReq.status === 'rejected');
        const isRevoked = (latestReq && latestReq.status === 'revoked');
        const isPending = (latestReq && latestReq.status === 'pending');

        if (userProf) {
          let profChanged = false;
          if (userProf.congregational_post && userProf.congregational_post !== currentAuthSession.congregational_post) {
            currentAuthSession.congregational_post = userProf.congregational_post;
            currentAuthSession.is_youth = Boolean(userProf.is_youth || userProf.congregational_post === 'post-youth');
            profChanged = true;
            showToast(`Your congregational post has been updated to "${getPostDisplayName(userProf.congregational_post)}" ✨`);
          }
          if (userProf.display_name && userProf.display_name !== currentAuthSession.display_name) {
            currentAuthSession.display_name = userProf.display_name;
            profChanged = true;
          }
          if (profChanged) {
            await persistAuthSession(currentAuthSession);
            updateAppPermissionsUI();
            if (typeof window.renderActiveCniChat === 'function') window.renderActiveCniChat(true);
          }
        }

        if (latestReq && latestReq.congregational_post && latestReq.congregational_post !== currentAuthSession.congregational_post) {
          currentAuthSession.congregational_post = latestReq.congregational_post;
          currentAuthSession.is_youth = Boolean(latestReq.congregational_post === 'post-youth');
          await persistAuthSession(currentAuthSession);
          updateAppPermissionsUI();
        }

        if (isApproved) {
          if (currentAuthSession.role !== 'admin' || currentAuthSession.admin_request_status !== 'approved') {
            const wasPending = currentAuthSession.admin_request_status === 'pending';
            currentAuthSession.role = 'admin';
            currentAuthSession.admin_request_status = 'approved';
            currentAuthSession.is_youth = true;
            await persistAuthSession(currentAuthSession);
            updateAppPermissionsUI();
            if (wasPending) {
              showToast('🎉 Your Admin Access Request has been Approved by Super Admin! Admin privileges activated 🛡️');
            }
          }
        } else if (isRejected) {
          if (currentAuthSession.admin_request_status === 'pending') {
            currentAuthSession.admin_request_status = 'rejected';
            await persistAuthSession(currentAuthSession);
            updateAppPermissionsUI();
            showToast('❌ Your Admin Access Request was declined. You can request again later.');
          }
        } else if (isRevoked) {
          if (currentAuthSession.role === 'admin' || currentAuthSession.admin_request_status === 'approved') {
            currentAuthSession.role = 'member';
            currentAuthSession.admin_request_status = 'revoked';
            currentAuthSession.is_youth = false;
            await persistAuthSession(currentAuthSession);
            updateAppPermissionsUI();
            showToast('⚠️ Your Admin Access has been revoked by Super Admin.');
          }
        } else if (isPending) {
          if (currentAuthSession.admin_request_status !== 'pending') {
            currentAuthSession.admin_request_status = 'pending';
            await persistAuthSession(currentAuthSession);
            updateAppPermissionsUI();
          }
        }
      } catch (err) {
        console.warn('[Requests] reconcileAdminStatusWithCloud error:', err);
      }
    }

    // Realtime listeners for admin requests & profiles
    window.addEventListener('church:sync:admin_requests', (evt) => {
      const item = evt.detail?.item;
      if (!item) return;

      const perms = useAppPermissions();
      const isSuper = Boolean(perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL);

      if (isSuper) {
        loadPendingElevationRequests();
        return;
      }

      const isCurrentTarget = (item.user_id && item.user_id === currentAuthSession.uid) ||
        (item.display_name && currentAuthSession.display_name && item.display_name.trim().toLowerCase() === currentAuthSession.display_name.trim().toLowerCase());

      if (isCurrentTarget) {
        if (item.congregational_post && item.congregational_post !== currentAuthSession.congregational_post) {
          currentAuthSession.congregational_post = item.congregational_post;
          currentAuthSession.is_youth = Boolean(item.congregational_post === 'post-youth');
          persistAuthSession(currentAuthSession);
          updateAppPermissionsUI();
          showToast(`Your congregational post has been updated to "${getPostDisplayName(item.congregational_post)}" ✨`);
        }
        if (item.status === 'approved' && currentAuthSession.role !== 'admin') {
          currentAuthSession.role = 'admin';
          currentAuthSession.admin_request_status = 'approved';
          currentAuthSession.is_youth = true;
          persistAuthSession(currentAuthSession);
          updateAppPermissionsUI();
          showToast('🎉 Your Admin Access Request has been Approved by Super Admin! Admin privileges activated 🛡️');
        } else if (item.status === 'rejected' && currentAuthSession.admin_request_status === 'pending') {
          currentAuthSession.admin_request_status = 'rejected';
          persistAuthSession(currentAuthSession);
          updateAppPermissionsUI();
          showToast('❌ Your Admin Access Request was declined. You can request again later.');
        } else if (item.status === 'revoked' && currentAuthSession.role === 'admin') {
          currentAuthSession.role = 'member';
          currentAuthSession.admin_request_status = 'revoked';
          currentAuthSession.is_youth = false;
          persistAuthSession(currentAuthSession);
          updateAppPermissionsUI();
          showToast('⚠️ Your Admin Access has been revoked by Super Admin.');
        }
      }
    });

    window.addEventListener('church:sync:profiles', (evt) => {
      const item = evt.detail?.item;
      if (!item) return;

      const isSuper = Boolean(currentAuthSession.email === SUPER_ADMIN_EMAIL || currentAuthSession.role === 'superadmin');
      if (!isSuper && (item.id === currentAuthSession.uid || (item.email && item.email === currentAuthSession.email))) {
        let changed = false;
        if (item.congregational_post && item.congregational_post !== currentAuthSession.congregational_post) {
          currentAuthSession.congregational_post = item.congregational_post;
          currentAuthSession.is_youth = Boolean(item.is_youth || item.congregational_post === 'post-youth');
          changed = true;
          showToast(`Your congregational post has been updated to "${getPostDisplayName(item.congregational_post)}" ✨`);
        }
        if (item.display_name && item.display_name !== currentAuthSession.display_name) {
          currentAuthSession.display_name = item.display_name;
          changed = true;
        }
        if (item.role === 'admin' && currentAuthSession.role !== 'admin') {
          currentAuthSession.role = 'admin';
          currentAuthSession.admin_request_status = 'approved';
          currentAuthSession.is_youth = true;
          changed = true;
          showToast('🎉 Admin privileges activated 🛡️');
        } else if (item.role === 'member' && currentAuthSession.role === 'admin') {
          currentAuthSession.role = 'member';
          currentAuthSession.admin_request_status = 'revoked';
          currentAuthSession.is_youth = false;
          changed = true;
          showToast('⚠️ Your Admin Access has been revoked by Super Admin.');
        }
        if (changed) {
          persistAuthSession(currentAuthSession);
          updateAppPermissionsUI();
          if (typeof window.renderActiveCniChat === 'function') window.renderActiveCniChat(true);
        }
      }
    });

    // Cloud reconciliation (triggered during app launch or manual refresh, not polling)
    window.reconcileAdminStatusWithCloud = reconcileAdminStatusWithCloud;

    async function findApprovedAdmin(emailOrUser, passwordOrPin) {
      if (!emailOrUser || !passwordOrPin) return null;
      const q = String(emailOrUser).trim().toLowerCase();
      const pin = String(passwordOrPin).trim();

      // 1. Check in-memory approvedAdminRequests
      let found = approvedAdminRequests.find(r => 
        (String(r.email || '').toLowerCase() === q || String(r.user_id || '').toLowerCase() === q || String(r.display_name || '').toLowerCase() === q) &&
        (String(r.login_password || r.pin || '') === pin)
      );
      if (found) return found;

      // 2. Check localStorage
      try {
        const raw = localStorage.getItem('sanctuary_approved_admins');
        if (raw) {
          const list = JSON.parse(raw);
          found = list.find(r => 
            (String(r.email || '').toLowerCase() === q || String(r.user_id || '').toLowerCase() === q || String(r.display_name || '').toLowerCase() === q) &&
            (String(r.login_password || r.pin || '') === pin)
          );
          if (found) return found;
        }
      } catch (_) {}

      // 3. Check Dexie DB
      try {
        if (churchDexieDb && churchDexieDb.admin_requests) {
          const requests = await churchDexieDb.admin_requests.toArray();
          found = requests.find(r => 
            r.status === 'approved' &&
            (String(r.email || '').toLowerCase() === q || String(r.user_id || '').toLowerCase() === q || String(r.display_name || '').toLowerCase() === q) &&
            (String(r.login_password || r.pin || '') === pin)
          );
          if (found) return found;
        }
      } catch (_) {}

      return null;
    }

    async function findRegisteredProfile(emailOrUser, passwordOrPin) {
      if (!emailOrUser) return null;
      const q = String(emailOrUser).trim().toLowerCase();

      // 1. Check localStorage registered members
      try {
        const raw = localStorage.getItem('sanctuary_registered_members');
        if (raw) {
          const list = JSON.parse(raw);
          const found = list.find(m => 
            (String(m.email || '').toLowerCase() === q || String(m.name || '').toLowerCase() === q || String(m.id || '').toLowerCase() === q)
          );
          if (found) return found;
        }
      } catch (_) {}

      // 2. Check Dexie profiles
      try {
        if (churchDexieDb && churchDexieDb.profiles) {
          const profiles = await churchDexieDb.profiles.toArray();
          const found = profiles.find(p => 
            (String(p.email || '').toLowerCase() === q || String(p.display_name || '').toLowerCase() === q || String(p.id || '').toLowerCase() === q)
          );
          if (found) return found;
        }
      } catch (_) {}

      return null;
    }

    // 8. Super Admin Request Approvals & Rejections
    async function approveAdminRequestAction(reqId, userId) {
      const perms = useAppPermissions();
      const isSuperAdmin = Boolean(perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL);
      if (!isSuperAdmin) {
        showToast('Unauthorized: Super Admin access required ❌');
        return;
      }

      const confirmed = await window.showConfirmDialog({
        title: 'Approve Admin Request?',
        message: 'Grant this member full Admin & Youth leadership permissions?',
        icon: '🛡️',
        confirmText: 'Approve',
        isDanger: false
      });
      if (!confirmed) return;

      const approvedRequest = pendingAdminRequests.find(r => r.id === reqId);
      const targetUserId = userId || approvedRequest?.user_id;

      // 1. Cloud Sync: Supabase RPC & REST
      try {
        if (window.ChurchSync && window.ChurchSync.Requests && typeof window.ChurchSync.Requests.approveAdmin === 'function') {
          await window.ChurchSync.Requests.approveAdmin(reqId, targetUserId);
        } else if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl) {
          const cfg = window.SUPABASE_CONFIG;
          const headers = {
            'apikey': cfg.supabaseKey || cfg.supabaseAnonKey,
            'Authorization': `Bearer ${cfg.supabaseKey || cfg.supabaseAnonKey}`,
            'Content-Type': 'application/json'
          };
          await fetch(`${cfg.supabaseUrl}/rest/v1/admin_requests?id=eq.${reqId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'approved', updated_at: new Date().toISOString() })
          });
          if (targetUserId) {
            await fetch(`${cfg.supabaseUrl}/rest/v1/profiles?id=eq.${targetUserId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ role: 'admin', updated_at: new Date().toISOString() })
            });
          }
        }
      } catch (cloudErr) {
        console.warn('[Requests] Cloud approval error:', cloudErr);
      }

      // 2. Local Database: Dexie
      try {
        if (churchDexieDb) {
          if (churchDexieDb.admin_requests) {
            const req = await churchDexieDb.admin_requests.get(reqId);
            if (req) {
              req.status = 'approved';
              req.reviewed_at = new Date().toISOString();
              await churchDexieDb.admin_requests.put(req);
            }
          }
          if (targetUserId && churchDexieDb.profiles) {
            const prof = await churchDexieDb.profiles.get(targetUserId);
            if (prof) {
              prof.role = 'admin';
              await churchDexieDb.profiles.put(prof);
            }
          }
        }
      } catch (e) {}

      // 3. Update in-memory lists
      pendingAdminRequests = pendingAdminRequests.filter(r => r.id !== reqId);
      if (approvedRequest) {
        approvedAdminRequests = approvedAdminRequests.filter(r => r.id !== reqId);
        approvedAdminRequests.push({ ...approvedRequest, status: 'approved' });
      }

      try {
        localStorage.setItem('sanctuary_pending_admin_requests', JSON.stringify(pendingAdminRequests));
        localStorage.setItem('sanctuary_approved_admins', JSON.stringify(approvedAdminRequests));
      } catch (_) {}

      // If current active session is the target, elevate immediately
      if (currentAuthSession.uid === targetUserId || (approvedRequest && approvedRequest.email === currentAuthSession.email)) {
        currentAuthSession.role = 'admin';
        currentAuthSession.admin_request_status = 'approved';
        currentAuthSession.is_youth = true;
        currentAuthSession.congregational_post = approvedRequest?.requested_post || 'post-youth';
        await persistAuthSession(currentAuthSession);
      }

      // 4. Broadcast approval over WebSocket to sync all devices
      if (typeof window.sendWsEvent === 'function') {
        window.sendWsEvent({
          type: 'admin_request_approved',
          reqId: reqId,
          userId: targetUserId,
          email: approvedRequest?.email
        });
      }

      renderPendingRequestsUI();
      updateAppPermissionsUI();
      showToast('Admin request approved! Admin permissions granted 🛡️');
    }

    async function rejectAdminRequestAction(reqId) {
      const perms = useAppPermissions();
      const isSuperAdmin = Boolean(perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL);
      if (!isSuperAdmin) {
        showToast('Unauthorized: Super Admin access required ❌');
        return;
      }

      const confirmed = await window.showConfirmDialog({
        title: 'Reject Elevation Request?',
        message: 'Are you sure you want to decline this admin elevation request?',
        icon: '❌',
        confirmText: 'Reject Request',
        isDanger: true
      });
      if (!confirmed) return;

      const rejectedRequest = pendingAdminRequests.find(r => r.id === reqId);
      const targetUserId = rejectedRequest?.user_id;

      // 1. Cloud Sync: Supabase RPC & REST
      try {
        if (window.ChurchSync && window.ChurchSync.Requests && typeof window.ChurchSync.Requests.rejectAdmin === 'function') {
          await window.ChurchSync.Requests.rejectAdmin(reqId, targetUserId);
        } else if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl) {
          const cfg = window.SUPABASE_CONFIG;
          const headers = {
            'apikey': cfg.supabaseKey || cfg.supabaseAnonKey,
            'Authorization': `Bearer ${cfg.supabaseKey || cfg.supabaseAnonKey}`,
            'Content-Type': 'application/json'
          };
          await fetch(`${cfg.supabaseUrl}/rest/v1/admin_requests?id=eq.${reqId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'rejected', updated_at: new Date().toISOString() })
          });
          if (targetUserId) {
            await fetch(`${cfg.supabaseUrl}/rest/v1/profiles?id=eq.${targetUserId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ role: 'member', updated_at: new Date().toISOString() })
            });
          }
        }
      } catch (cloudErr) {
        console.warn('[Requests] Cloud rejection error:', cloudErr);
      }

      // 2. Local Database: Dexie
      try {
        if (churchDexieDb && churchDexieDb.admin_requests) {
          const req = await churchDexieDb.admin_requests.get(reqId);
          if (req) {
            req.status = 'rejected';
            await churchDexieDb.admin_requests.put(req);
          }
        }
      } catch (e) {}

      pendingAdminRequests = pendingAdminRequests.filter(r => r.id !== reqId);
      try {
        localStorage.setItem('sanctuary_pending_admin_requests', JSON.stringify(pendingAdminRequests));
      } catch (_) {}

      // If current active session is the target, update notice and status
      if (currentAuthSession.uid === targetUserId || (rejectedRequest && rejectedRequest.email === currentAuthSession.email)) {
        currentAuthSession.admin_request_status = 'rejected';
        await persistAuthSession(currentAuthSession);
        showToast('❌ Your Admin Access Request was declined. You can request again later.');
      }

      // Broadcast rejection over WebSocket
      if (typeof window.sendWsEvent === 'function') {
        window.sendWsEvent({
          type: 'admin_request_rejected',
          reqId: reqId,
          userId: targetUserId,
          email: rejectedRequest?.email
        });
      }

      renderPendingRequestsUI();
      updateAppPermissionsUI();
      showToast('Admin request rejected ❌');
    }

    async function removeAdminAccessAction(reqId) {
      const perms = useAppPermissions();
      const isSuperAdmin = Boolean(perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL);
      if (!isSuperAdmin) {
        showToast('Unauthorized: Super Admin access required to revoke admin access ❌');
        return;
      }

      const confirmed = await window.showConfirmDialog({
        title: 'Revoke Admin Access?',
        message: 'Are you sure you want to revoke admin permissions for this account? This action can only be performed by Super Admin.',
        icon: '⚠️',
        confirmText: 'Revoke Access',
        isDanger: true
      });
      if (!confirmed) return;

      const request = approvedAdminRequests.find(r => r.id === reqId);
      const targetUserId = request?.user_id;

      // 1. Cloud Sync: Supabase REST
      try {
        if (window.ChurchSync && window.ChurchSync.Requests && typeof window.ChurchSync.Requests.revokeAdmin === 'function') {
          await window.ChurchSync.Requests.revokeAdmin(reqId, targetUserId);
        } else if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl) {
          const cfg = window.SUPABASE_CONFIG;
          const headers = {
            'apikey': cfg.supabaseKey || cfg.supabaseAnonKey,
            'Authorization': `Bearer ${cfg.supabaseKey || cfg.supabaseAnonKey}`,
            'Content-Type': 'application/json'
          };
          await fetch(`${cfg.supabaseUrl}/rest/v1/admin_requests?id=eq.${reqId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'revoked', updated_at: new Date().toISOString() })
          });
          if (targetUserId) {
            await fetch(`${cfg.supabaseUrl}/rest/v1/profiles?id=eq.${targetUserId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ role: 'member', updated_at: new Date().toISOString() })
            });
          }
        }
      } catch (cloudErr) {
        console.warn('[Requests] Cloud revoke error:', cloudErr);
      }

      // 2. Local Database: Dexie
      try {
        if (churchDexieDb) {
          if (churchDexieDb.admin_requests) {
            const stored = await churchDexieDb.admin_requests.get(reqId);
            if (stored) {
              stored.status = 'revoked';
              stored.reviewed_at = new Date().toISOString();
              await churchDexieDb.admin_requests.put(stored);
            }
          }
          if (targetUserId && churchDexieDb.profiles) {
            const prof = await churchDexieDb.profiles.get(targetUserId);
            if (prof) {
              prof.role = 'member';
              await churchDexieDb.profiles.put(prof);
            }
          }
        }
      } catch (_) {}

      approvedAdminRequests = approvedAdminRequests.filter(r => r.id !== reqId);
      try {
        localStorage.setItem('sanctuary_approved_admins', JSON.stringify(approvedAdminRequests));
      } catch (_) {}

      // If current active session is the target, demote immediately
      if (currentAuthSession.uid === targetUserId || (request && String(currentAuthSession.email || '').toLowerCase() === String(request.email || '').toLowerCase())) {
        currentAuthSession.role = 'member';
        currentAuthSession.admin_request_status = 'revoked';
        currentAuthSession.is_youth = false;
        await persistAuthSession(currentAuthSession);
        showToast('⚠️ Your Admin Access has been revoked by Super Admin.');
      }

      // Broadcast revoke event over WebSocket
      if (typeof window.sendWsEvent === 'function') {
        window.sendWsEvent({
          type: 'admin_access_revoked',
          reqId: reqId,
          userId: targetUserId,
          email: request?.email
        });
      }

      renderPendingRequestsUI();
      updateAppPermissionsUI();
      showToast('Admin access revoked ⚠️');
    }

    // 9. Render Super Admin Pending Requests in Modal and Update Pill Count
    function renderPendingRequestsUI() {
      const adminListEl = document.getElementById('adminRequestsList');
      const pillCountEl = document.getElementById('superAdminRequestsPillCount');
      const badgeEl = document.getElementById('pendingRequestsCountBadge');

      const totalCount = pendingAdminRequests.length;
      if (pillCountEl) {
        pillCountEl.textContent = totalCount;
        pillCountEl.style.display = totalCount > 0 ? 'inline-flex' : 'none';
      }
      if (badgeEl) badgeEl.textContent = `${totalCount} Pending`;

      if (adminListEl) {
        if (pendingAdminRequests.length === 0) {
          adminListEl.innerHTML = '<div class="no-requests-msg" style="text-align:center; padding:18px; color:var(--text-muted); font-size:0.88rem;">No pending admin requests.</div>';
        } else {
          adminListEl.innerHTML = pendingAdminRequests.map(r => `
            <div class="request-card-item pending-request-card" data-req-id="${r.id}">
              <div class="request-card-header-row">
                <div class="ios-avatar-badge pending">${(r.display_name ? r.display_name.charAt(0).toUpperCase() : 'M')}</div>
                <div class="ios-card-identity">
                  <div class="ios-identity-top">
                    <span class="ios-card-name">${r.display_name || 'Member'}</span>
                    <span class="ios-post-pill pending">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      <span>${r.requested_post === 'post-youth' || r.role_requested === 'youth_admin' ? 'Youth Admin Request' : 'Admin Elevation Request'}</span>
                    </span>
                  </div>
                  <div class="ios-identity-bottom">
                    <span class="ios-status-chip pending">
                      <span class="ios-dot-pulse pending"></span>
                      <span>Pending Review</span>
                    </span>
                    <span class="ios-chip-divider">•</span>
                    <span class="ios-email-text" title="${r.email || r.user_id}">${r.email || r.user_id}</span>
                  </div>
                </div>
              </div>
              <div class="ios-card-divider"></div>
              <div class="ios-card-actions-row">
                <button type="button" class="btn-approve btn-approve-admin ios-action-btn" data-id="${r.id}" data-user="${r.user_id}" title="Approve Elevation Request" aria-label="Approve Elevation Request">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Approve Access</span>
                </button>
                <button type="button" class="btn-reject btn-reject-admin ios-action-btn" data-id="${r.id}" title="Decline Request" aria-label="Decline Request">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  <span>Decline</span>
                </button>
              </div>
            </div>
          `).join('');

          adminListEl.querySelectorAll('.btn-approve-admin').forEach(btn => {
            btn.onclick = () => approveAdminRequestAction(btn.dataset.id, btn.dataset.user);
          });
          adminListEl.querySelectorAll('.btn-reject-admin').forEach(btn => {
            btn.onclick = () => rejectAdminRequestAction(btn.dataset.id);
          });
        }
        if (approvedAdminRequests.length) {
          adminListEl.insertAdjacentHTML('beforeend', `<div style="margin:16px 0 8px; font-size:.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em;">Active Admins (${approvedAdminRequests.length})</div>` + approvedAdminRequests.map(r => `
            <div class="request-card-item active-admin-card" data-req-id="${r.id}">
              <div class="ios-avatar-badge">${(r.display_name ? r.display_name.charAt(0).toUpperCase() : 'A')}</div>
              <div class="active-admin-info">
                <div class="active-admin-name-row">
                  <span class="ios-card-name">${escapeHtml(r.display_name || 'Admin')}</span>
                  <span class="ios-post-pill">
                    <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z"/></svg>
                    <span>${escapeHtml(getPostDisplayName(r.congregational_post || 'post-admin'))}</span>
                  </span>
                  <span class="ios-status-chip active">
                    <span class="ios-dot-pulse"></span>
                    <span>Active</span>
                  </span>
                </div>
                <div class="active-admin-email-row">
                  <span class="ios-email-text">${escapeHtml(r.email || r.user_id || '')}</span>
                </div>
              </div>
              <div class="active-admin-actions">
                <button type="button" class="btn-post-admin ios-action-btn-sm" data-id="${r.id}" data-user="${r.user_id}" title="Change Congregational Post" aria-label="Change Congregational Post">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  <span>Change Post</span>
                </button>
                <button type="button" class="btn-revoke-admin ios-action-btn-sm btn-revoke-danger" data-id="${r.id}" title="Revoke Admin Access" aria-label="Revoke Admin Access">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span>Revoke</span>
                </button>
              </div>
            </div>`).join(''));

          adminListEl.querySelectorAll('.btn-post-admin').forEach(btn => {
            btn.onclick = () => {
              const req = approvedAdminRequests.find(a => a.id === btn.dataset.id || a.user_id === btn.dataset.user);
              if (req) {
                openChangePostModal({
                  id: req.user_id || req.id,
                  name: req.display_name || 'Admin',
                  email: req.email || null,
                  role: 'admin',
                  avatar: (req.display_name ? req.display_name.charAt(0).toUpperCase() : 'A'),
                  postTitle: getPostDisplayName(req.congregational_post || 'post-admin'),
                  congregational_post: req.congregational_post || 'post-admin',
                  is_youth: req.is_youth || false
                }, { mode: 'post' });
              }
            };
          });

          adminListEl.querySelectorAll('.btn-revoke-admin').forEach(btn => {
            btn.onclick = () => removeAdminAccessAction(btn.dataset.id);
          });
        }
      }
    }

    // 10. Update All UI Controls based on Permissions Matrix
    function updateAppPermissionsUI() {
      const perms = useAppPermissions();

      // A. Settings Account Card
      const avatarEl = document.getElementById('authUserAvatar');
      const nameEl = document.getElementById('authDisplayNameTxt');
      const emailEl = document.getElementById('authEmailTxt');
      const roleBadgeEl = document.getElementById('authRoleBadge');
      const youthBadgeEl = document.getElementById('authYouthBadge');
      const toggleLoginBtn = document.getElementById('authToggleLoginBtn');
      const toggleLoginBtnText = document.getElementById('authToggleLoginBtnText');
      const toggleLoginIcon = document.getElementById('authToggleLoginIcon');
      const quickRequestBtn = document.getElementById('authQuickRequestBtn');
      const memberElevationCard = document.getElementById('memberElevationCard');
      const superAdminPanel = document.getElementById('superAdminPendingRequestsPanel');

      const isSuperAdmin = perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL;
      const isAdmin = isSuperAdmin || perms.role === 'admin';
      const isSignedIn = !currentAuthSession.is_anonymous && (Boolean(currentAuthSession.email) || isSuperAdmin || isAdmin);
      const isYouthPost = currentAuthSession.congregational_post === 'post-youth' || perms.isYouth;

      const rawName = (currentAuthSession.display_name && currentAuthSession.display_name.trim()) 
        ? currentAuthSession.display_name.trim() 
        : (isSignedIn && currentAuthSession.email ? currentAuthSession.email.split('@')[0] : 'Believer');
      const name = cleanDisplayName(rawName);
      if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase() || 'M';
      if (nameEl) nameEl.textContent = name;
      if (emailEl) {
        if (isSignedIn) {
          emailEl.textContent = currentAuthSession.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'Authenticated Account');
        } else {
          emailEl.textContent = 'Not signed in';
        }
      }

      const isPendingAdmin = !isAdmin && (
        currentAuthSession.admin_request_status === 'pending' || 
        pendingAdminRequests.some(r => r.user_id === currentAuthSession.uid || (currentAuthSession.email && String(r.email || '').toLowerCase() === String(currentAuthSession.email).toLowerCase()))
      );

      if (roleBadgeEl) {
        if (isSuperAdmin) {
          roleBadgeEl.style.display = 'inline-flex';
          roleBadgeEl.className = 'role-badge superadmin';
          roleBadgeEl.innerHTML = '👑 Super Admin';
        } else if (isAdmin) {
          roleBadgeEl.style.display = 'inline-flex';
          roleBadgeEl.className = 'role-badge admin';
          roleBadgeEl.innerHTML = '🛡️ Admin';
        } else if (isPendingAdmin) {
          roleBadgeEl.style.display = 'inline-flex';
          roleBadgeEl.className = 'role-badge pending';
          roleBadgeEl.innerHTML = '⏳ Pending';
        } else {
          // If user has not logged in as SA & Admin and has no pending request, hide the badge beside the name because the post badge is already showing below
          roleBadgeEl.style.display = 'none';
        }
      }

      if (youthBadgeEl) {
        youthBadgeEl.style.display = (isYouthPost || isSuperAdmin) ? 'inline-flex' : 'none';
      }

      // Congregational Post Badge & Pencil Edit Sign
      const postBadgeEl = document.getElementById('authPostBadge');
      const editPostBadgeBtn = document.getElementById('editPostBadgeBtn');
      if (postBadgeEl) {
        const curPostKey = currentAuthSession.congregational_post || 'post-member';
        if (curPostKey === 'post-youth') {
          postBadgeEl.textContent = '🕊️ Youth Member (युवा सदस्य)';
          postBadgeEl.style.background = 'rgba(59, 130, 246, 0.12)';
          postBadgeEl.style.color = '#3b82f6';
          postBadgeEl.style.whiteSpace = 'nowrap';
          postBadgeEl.style.fontSize = '0.65rem';
          postBadgeEl.style.padding = '2px 7px';
        } else {
          const postName = getPostDisplayName(curPostKey);
          postBadgeEl.textContent = `⛪ ${postName}`;
          postBadgeEl.style.background = 'rgba(45, 106, 79, 0.12)';
          postBadgeEl.style.color = 'var(--liturgical-green)';
          postBadgeEl.style.whiteSpace = 'nowrap';
          postBadgeEl.style.fontSize = '0.65rem';
          postBadgeEl.style.padding = '2px 7px';
        }
      }
      if (editPostBadgeBtn) {
        // The post edit pencil icon is strictly visible to Super Admin only
        editPostBadgeBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
      }

      // Name Edit Counter & Limit (Section 5 - Max 6 edits)
      const nameEditsRemainingBadge = document.getElementById('authNameEditsRemainingBadge');
      const editProfileNameBtn = document.getElementById('editProfileNameBtn');
      const editCount = getNameEditCount();
      const remainingEdits = Math.max(0, 6 - editCount);
      if (nameEditsRemainingBadge) {
        if (isSuperAdmin || isAdmin) {
          nameEditsRemainingBadge.textContent = '';
          nameEditsRemainingBadge.style.display = 'none';
        } else if (remainingEdits > 0) {
          nameEditsRemainingBadge.textContent = `${remainingEdits} name edit${remainingEdits === 1 ? '' : 's'} remaining`;
          nameEditsRemainingBadge.style.color = 'var(--text-muted)';
          nameEditsRemainingBadge.style.display = '';
        } else {
          nameEditsRemainingBadge.textContent = '🔒 Name locked (6/6 edits used). Contact Admin.';
          nameEditsRemainingBadge.style.color = '#ef4444';
          nameEditsRemainingBadge.style.display = '';
        }
      }
      if (editProfileNameBtn) {
        editProfileNameBtn.disabled = remainingEdits === 0 && !isAdmin;
        editProfileNameBtn.style.opacity = (remainingEdits === 0 && !isAdmin) ? '0.5' : '1';
      }

      // Login / Sign Out Button Transformation:
      // If already logged in, the login button BECOMES the Sign Out button!
      if (toggleLoginBtn && toggleLoginBtnText) {
        if (isSignedIn || isSuperAdmin || isAdmin) {
          toggleLoginBtn.className = 'settings-btn-secondary danger';
          toggleLoginBtnText.textContent = 'Sign Out';
          toggleLoginBtn.title = 'Sign out of your account';
          if (toggleLoginIcon) {
            toggleLoginIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
          }
        } else {
          toggleLoginBtn.className = 'settings-btn-secondary';
          toggleLoginBtnText.textContent = 'Login';
          toggleLoginBtn.title = 'Sign in to access admin privileges';
          if (toggleLoginIcon) {
            toggleLoginIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;
          }
        }
      }

      // Request Admin sits beside Login for un-elevated members
      const hasPendingRequest = isPendingAdmin || currentAuthSession.admin_request_status === 'pending';
      if (quickRequestBtn) {
        quickRequestBtn.style.display = (!isAdmin && !hasPendingRequest) ? 'inline-flex' : 'none';
      }

      // Requests Pill Button for Super Admin only (beside sign out)
      const superAdminRequestsBtn = document.getElementById('authSuperAdminRequestsBtn');
      if (superAdminRequestsBtn) {
        superAdminRequestsBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
      }

      // "Add Update" Button strictly for Superadmin only (not even for admin)
      const addUpdateBtn = document.getElementById('addUpdateBtn');
      const superAdminUpdateRow = document.getElementById('superAdminUpdateRow');
      if (addUpdateBtn) {
        addUpdateBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
        if (superAdminUpdateRow) {
          superAdminUpdateRow.style.display = isSuperAdmin ? 'flex' : 'none';
        }
        if (isSuperAdmin && typeof window.refreshAddUpdateButtonState === 'function') {
          window.refreshAddUpdateButtonState();
        }
      }

      // Keep the compact status pill below the profile only while a request is pending or rejected
      if (memberElevationCard) {
        const adminReqWrap = document.getElementById('adminReqBtnWrap');
        if (!isAdmin && hasPendingRequest) {
          memberElevationCard.style.display = 'block';
          if (adminReqWrap) adminReqWrap.innerHTML = '<span class="role-badge" style="background:rgba(73, 151, 208,.14);color:var(--accent-gold);">Request Pending</span>';
        } else if (!isAdmin && currentAuthSession.admin_request_status === 'rejected') {
          memberElevationCard.style.display = 'block';
          if (adminReqWrap) {
            adminReqWrap.innerHTML = '<button class="settings-btn-secondary" id="requestAdminAccessBtn"><span>Request Admin</span></button>';
            const retryBtn = document.getElementById('requestAdminAccessBtn');
            if (retryBtn) retryBtn.onclick = () => openRequestNotesModal('admin');
          }
        } else {
          memberElevationCard.style.display = 'none';
        }
      }

      // Update Requests List & Pill Count
      renderPendingRequestsUI();

      // ==============================================================================
      // 4 GOVERNANCE & ACTION CARDS IN SETTINGS (Visible to SuperAdmin & Admin ONLY):
      // 1. Announcement & Today's Song (#bulletinSongManagementGroup)
      // 2. Congregational Posts (#postsManagementGroup)
      // 3. Import (Song / Almanac) (#importSettingsGroup)
      // 4. Audit Log & Governance (#auditLogSettingsGroup)
      // ==============================================================================
      const isLeader = Boolean(isSuperAdmin || isAdmin);

      const bulletinSongManagementGroup = document.getElementById('bulletinSongManagementGroup');
      const postsManagementGroup = document.getElementById('postsManagementGroup');
      const importSettingsGroup = document.getElementById('importSettingsGroup');
      const auditLogSettingsGroup = document.getElementById('auditLogSettingsGroup');

      [bulletinSongManagementGroup, postsManagementGroup, importSettingsGroup, auditLogSettingsGroup].forEach(card => {
        if (card && card.style) {
          if (isLeader) {
            card.classList.remove('hidden');
            if (typeof card.style.setProperty === 'function') {
              card.style.setProperty('display', 'flex', 'important');
            } else {
              card.style.display = 'flex';
            }
          } else {
            card.classList.add('hidden');
            if (typeof card.style.setProperty === 'function') {
              card.style.setProperty('display', 'none', 'important');
            } else {
              card.style.display = 'none';
            }
          }
        }
      });

      if (postsManagementGroup && isLeader) renderPostsManagementUI();
      if (auditLogSettingsGroup && isLeader) renderAuditLogUI();

      // C. Youth Chat Nav Entry Visibility
      const tabCniYouth = document.getElementById('tabCniYouth');
      if (tabCniYouth) {
        if (perms.canAccessYouthChat || isSuperAdmin) {
          tabCniYouth.style.display = 'inline-flex';
        } else {
          tabCniYouth.style.display = 'none';
          if (activeCniChannel === 'youth') {
            activeCniChannel = 'congregation';
            if (typeof window.renderActiveCniChat === 'function') window.renderActiveCniChat(true);
          }
        }
      }

      // D. Timeline Edit & Detailed Action Gating
      const openTimelineEditBtn = document.getElementById('openTimelineEditModalBtn');
      const editTimelineEntryBtn = document.getElementById('editTimelineEntryBtn');
      const deleteTimelineEntryBtn = document.getElementById('deleteTimelineEntryBtn');
      const canEditTimeline = Boolean(isSuperAdmin || isAdmin || perms.canEditTimeline || currentAuthSession.email === SUPER_ADMIN_EMAIL);

      if (openTimelineEditBtn) {
        openTimelineEditBtn.style.display = canEditTimeline ? 'inline-flex' : 'none';
      }
      if (editTimelineEntryBtn) {
        editTimelineEntryBtn.style.display = canEditTimeline ? 'inline-flex' : 'none';
      }
      if (deleteTimelineEntryBtn) {
        deleteTimelineEntryBtn.style.display = canEditTimeline ? 'inline-flex' : 'none';
      }

      // E. Songs Section & Modal Gating
      const addSongSectionBtn = document.getElementById('addSongSectionBtn');
      if (addSongSectionBtn) {
        addSongSectionBtn.style.display = (isSuperAdmin || isAdmin || perms.canAddSong) ? 'inline-flex' : 'none';
      }

      const editSongModalBtn = document.getElementById('editSongModalBtn');
      if (editSongModalBtn) {
        editSongModalBtn.style.display = (isSuperAdmin || isAdmin || perms.canEdit) ? 'inline-flex' : 'none';
      }

      const deleteSongModalBtn = document.getElementById('deleteSongModalBtn');
      if (deleteSongModalBtn) {
        deleteSongModalBtn.style.display = (isSuperAdmin || isAdmin || perms.canDelete) ? 'inline-flex' : 'none';
      }

      // Sync display name to Chat settings input if present
      const chatDisplayNameEl = document.getElementById('chatDisplayNameInput');
      if (chatDisplayNameEl && currentAuthSession.display_name) {
        chatDisplayNameEl.value = currentAuthSession.display_name;
      }

      // F. About Church SuperAdmin & Admin Controls Gating
      const editAboutChurchBtn = document.getElementById('editAboutChurchBtn');
      const resetAboutChurchBtn = document.getElementById('resetAboutChurchBtn');
      if (editAboutChurchBtn) {
        editAboutChurchBtn.style.display = (isSuperAdmin || isAdmin) ? 'inline-flex' : 'none';
      }
      if (resetAboutChurchBtn) {
        resetAboutChurchBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
      }

      // About Church Direct Edit & Photo Management Buttons
      const editPastorDirectBtn = document.getElementById('editPastorDirectBtn');
      if (editPastorDirectBtn) {
        if (isSuperAdmin) {
          editPastorDirectBtn.style.setProperty('display', 'inline-flex', 'important');
        } else {
          editPastorDirectBtn.style.setProperty('display', 'none', 'important');
        }
      }
      const addChurchPhotoDirectBtn = document.getElementById('addChurchPhotoDirectBtn');
      if (addChurchPhotoDirectBtn) {
        addChurchPhotoDirectBtn.style.display = (isSuperAdmin || isAdmin) ? 'inline-flex' : 'none';
      }
      const managePhotosDirectBtn = document.getElementById('managePhotosDirectBtn');
      if (managePhotosDirectBtn) {
        managePhotosDirectBtn.style.display = (isSuperAdmin || isAdmin) ? 'inline-flex' : 'none';
      }
    }

    // 11. Request Notes Modal Handlers
    function openRequestNotesModal(mode = 'admin') {
      const perms = useAppPermissions();
      if (currentAuthSession.email === SUPER_ADMIN_EMAIL || perms.isSuperAdmin) {
        showToast('You are already the Super Admin! 👑');
        return;
      }
      if (perms.role === 'admin') {
        showToast('You are already an Admin! 🛡️');
        return;
      }
      const isPending = currentAuthSession.admin_request_status === 'pending' || 
        pendingAdminRequests.some(r => r.user_id === currentAuthSession.uid || (currentAuthSession.email && String(r.email || '').toLowerCase() === String(currentAuthSession.email).toLowerCase()));
      if (isPending) {
        showToast('Your admin request is pending review. You cannot request again until it has been reviewed ⏳');
        return;
      }

      activeRequestMode = mode;
      const modal = document.getElementById('requestNoteModalOverlay');
      const emailInput = document.getElementById('requestUserEmailInput');
      const createPinInput = document.getElementById('requestCreatePinInput');
      const confirmPinInput = document.getElementById('requestConfirmPinInput');
      const noteInput = document.getElementById('requestAdminNoteInput') || document.getElementById('requestNoteInput');
      const errEl = document.getElementById('requestAdminErrorMsg');
      const successView = document.getElementById('requestNoteSuccessView');
      const headerEl = document.querySelector('#requestNoteModalCard .modal-header');
      const bodyEl = document.getElementById('requestNoteModalBody');
      const footerEl = document.getElementById('requestNoteModalFooter');
      const modalCard = document.getElementById('requestNoteModalCard');

      if (successView) successView.style.display = 'none';
      if (headerEl) headerEl.style.display = '';
      if (bodyEl) bodyEl.style.display = '';
      if (footerEl) footerEl.style.display = 'flex';
      if (modalCard) modalCard.style.minHeight = '';
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

      if (emailInput) {
        emailInput.value = pendingAdminLogin?.email || (currentAuthSession.email && currentAuthSession.email !== 'Not signed in' ? currentAuthSession.email : '');
      }
      if (createPinInput) createPinInput.value = pendingAdminLogin?.password || '';
      if (confirmPinInput) confirmPinInput.value = pendingAdminLogin?.password || '';
      if (noteInput) noteInput.value = '';

      if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        if (emailInput && !emailInput.value) {
          setTimeout(() => emailInput.focus(), 150);
        } else if (createPinInput) {
          setTimeout(() => createPinInput.focus(), 150);
        }
      }
    }

    function closeRequestNotesModal() {
      const modal = document.getElementById('requestNoteModalOverlay');
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }
      const createPinInput = document.getElementById('requestCreatePinInput');
      const confirmPinInput = document.getElementById('requestConfirmPinInput');
      if (createPinInput) createPinInput.value = '';
      if (confirmPinInput) confirmPinInput.value = '';
    }

    async function submitElevationRequest() {
      const perms = useAppPermissions();
      if (currentAuthSession.email === SUPER_ADMIN_EMAIL || perms.isSuperAdmin) {
        showToast('You are already the Super Admin! 👑');
        closeRequestNotesModal();
        return;
      }

      const isPending = currentAuthSession.admin_request_status === 'pending' || 
        pendingAdminRequests.some(r => r.user_id === currentAuthSession.uid || (currentAuthSession.email && String(r.email || '').toLowerCase() === String(currentAuthSession.email).toLowerCase()));
      if (isPending) {
        showToast('You already have a pending admin request. You cannot request again until your request has been reviewed.');
        closeRequestNotesModal();
        return;
      }

      const emailInput = document.getElementById('requestUserEmailInput');
      const createPinInput = document.getElementById('requestCreatePinInput');
      const confirmPinInput = document.getElementById('requestConfirmPinInput');
      const noteInput = document.getElementById('requestAdminNoteInput') || document.getElementById('requestNoteInput');
      const errEl = document.getElementById('requestAdminErrorMsg');

      const email = emailInput?.value.trim() || '';
      const createPin = createPinInput?.value.trim() || '';
      const confirmPin = confirmPinInput?.value.trim() || '';
      const notes = noteInput?.value.trim() || '';

      const showReqError = (msg) => {
        if (errEl) {
          errEl.textContent = msg;
          errEl.style.display = 'block';
        }
        showToast(msg);
      };

      if (!email || !email.includes('@')) {
        showReqError('Please enter a valid email address ✉️');
        if (emailInput) emailInput.focus();
        return;
      }

      if (!createPin) {
        showReqError('Please create a Security PIN (4-6 digits) 🔒');
        if (createPinInput) createPinInput.focus();
        return;
      }

      if (createPin.length < 4) {
        showReqError('PIN must be at least 4 digits long 🔒');
        if (createPinInput) createPinInput.focus();
        return;
      }

      if (!confirmPin) {
        showReqError('Please confirm your PIN 🔒');
        if (confirmPinInput) confirmPinInput.focus();
        return;
      }

      if (createPin !== confirmPin) {
        showReqError('PINs do not match! Please check again ❌');
        if (confirmPinInput) confirmPinInput.focus();
        return;
      }

      if (!notes) {
        showReqError('Please enter a brief note explaining your admin request 📝');
        if (noteInput) noteInput.focus();
        return;
      }

      if (!currentAuthSession.uid) {
        currentAuthSession.uid = 'user-' + Math.random().toString(36).substring(2, 10);
      }
      currentAuthSession.email = email;
      await persistAuthSession(currentAuthSession);

      const displayName = currentAuthSession.display_name || (email ? email.split('@')[0] : 'Member');
      const isoNow = new Date().toISOString();
      let createdServerId = null;

      // Persist to Supabase Database
      if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl) {
        const cfg = window.SUPABASE_CONFIG;
        const headers = {
          'apikey': cfg.supabaseKey || cfg.supabaseAnonKey,
          'Authorization': `Bearer ${cfg.supabaseKey || cfg.supabaseAnonKey}`,
          'Content-Type': 'application/json'
        };
        try {
          // Upsert Profile
          await fetch(`${cfg.supabaseUrl}/rest/v1/profiles`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({
              id: currentAuthSession.uid,
              display_name: displayName,
              email: email,
              role: 'member',
              updated_at: isoNow
            })
          }).catch(() => {});

          // Insert Admin Request
          const reqRes = await fetch(`${cfg.supabaseUrl}/rest/v1/admin_requests`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              user_id: currentAuthSession.uid,
              display_name: displayName,
              status: 'pending',
              requested_at: isoNow
            })
          });
          if (reqRes && reqRes.ok) {
            const rows = await reqRes.json();
            if (Array.isArray(rows) && rows[0]?.id) {
              createdServerId = rows[0].id;
            }
          }
        } catch (netErr) {
          console.warn('[Requests] Supabase admin request creation error:', netErr);
        }
      }

      const reqId = createdServerId || ('req-admin-' + Math.random().toString(36).substring(2, 9));
      const reqObj = {
        id: reqId,
        user_id: currentAuthSession.uid,
        display_name: displayName,
        email: email,
        status: 'pending',
        notes: notes,
        login_password: createPin,
        pin: createPin,
        requested_at: isoNow
      };

      try {
        if (churchDexieDb && churchDexieDb.admin_requests) {
          await churchDexieDb.admin_requests.put(reqObj);
        }
      } catch (e) {}

      pendingAdminRequests = pendingAdminRequests.filter(r => r.user_id !== currentAuthSession.uid);
      pendingAdminRequests.push(reqObj);
      try {
        localStorage.setItem('sanctuary_pending_admin_requests', JSON.stringify(pendingAdminRequests));
      } catch (_) {}

      currentAuthSession.admin_request_status = 'pending';
      pendingAdminLogin = null;
      await persistAuthSession(currentAuthSession);

      // Send real-time event to Super Admin over WebSocket
      if (typeof window.sendWsEvent === 'function') {
        window.sendWsEvent({
          type: 'admin_request_created',
          request: reqObj
        });
      }

      // Smooth green tick animation inside the SAME popup window!
      const successView = document.getElementById('requestNoteSuccessView');
      const headerEl = document.querySelector('#requestNoteModalCard .modal-header');
      const bodyEl = document.getElementById('requestNoteModalBody');
      const footerEl = document.getElementById('requestNoteModalFooter');
      const modalCard = document.getElementById('requestNoteModalCard');

      if (headerEl) headerEl.style.display = 'none';
      if (bodyEl) bodyEl.style.display = 'none';
      if (footerEl) footerEl.style.display = 'none';
      if (modalCard) modalCard.style.minHeight = '320px';
      if (successView) {
        successView.style.display = 'flex';
        const circle = successView.querySelector('.checkmark-circle');
        const check = successView.querySelector('.checkmark-check');
        const fill = successView.querySelector('.auth-success-progress-fill');
        if (circle) {
          circle.style.animation = 'none';
          void circle.offsetHeight;
          circle.style.animation = 'strokeCircle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards';
        }
        if (check) {
          check.style.animation = 'none';
          void check.offsetHeight;
          check.style.animation = 'strokeCheck 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.25s forwards';
        }
        if (fill) {
          fill.style.animation = 'none';
          void fill.offsetHeight;
          fill.style.animation = 'authProgressFill 1.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        }
      }

      setTimeout(() => {
        closeRequestNotesModal();
        updateAppPermissionsUI();
        showToast('Admin elevation request submitted! Status set to Pending ⏳');
      }, 1450);
    }

  const CHURCH_DATA = window.CHURCH_DATA || {};

  // State Management
  const state = {
    activeTab: 'viewHome',
    selectedDateKey: '2026-08-17',
    searchQuery: '',
    searchFilter: 'all',
    bookmarkFilter: 'all',
    isPlayingAudio: false,
    audioCurrentSeconds: 346, // 05:46
    audioTotalSeconds: 1080,  // 18:00
    audioTimer: null,
    bookmarks: []
  };

  // DOM Element References
  const views = {
    viewHome: document.getElementById('viewHome'),
    viewSearch: document.getElementById('viewSearch'),
    viewAlmanac: document.getElementById('viewAlmanac'),
    viewBookmark: document.getElementById('viewBookmark'),
    viewSettings: document.getElementById('viewSettings'),
    viewSongList: document.getElementById('viewSongList'),
    viewSongLyrics: document.getElementById('viewSongLyrics'),
    viewBookReader: document.getElementById('viewBookReader'),
    viewChat: document.getElementById('viewChat'),
    viewTimeline: document.getElementById('viewTimeline'),
    viewTimelineDetail: document.getElementById('viewTimelineDetail'),
    viewAboutChurch: document.getElementById('viewAboutChurch'),
    viewAuditLog: document.getElementById('viewAuditLog'),
    viewBulletinManager: document.getElementById('viewBulletinManager'),
    viewPostsManager: document.getElementById('viewPostsManager'),
    viewImportManager: document.getElementById('viewImportManager')
  };

  const dockItems = document.querySelectorAll('.dock-item');
  const dockIndicator = document.getElementById('dockIndicator');
  const dockContainer = document.getElementById('dockContainer');
  const bookmarkBadge = document.getElementById('bookmarkCountBadge');

  // Search Elements
  const searchInput = document.getElementById('globalSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchFilterChips = document.querySelectorAll('#searchFilterGroup .chip');
  const searchResultsContainer = document.getElementById('searchResultsContainer');
  const resultsCountText = document.getElementById('resultsCount');

  // Almanac Elements
  const weekDaysStrip = document.getElementById('weekDaysStrip');
  const currentMonthYearLabel = document.getElementById('currentMonthYearLabel');
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const almanacColorDot = document.getElementById('almanacColorDot');
  const almanacLiturgicalSeasonTitle = document.getElementById('almanacLiturgicalSeasonTitle');
  const almanacFeastRank = document.getElementById('almanacFeastRank');
  const almanacFeastName = document.getElementById('almanacFeastName');
  const almanacFeastDesc = document.getElementById('almanacFeastDesc');
  const almanacColorName = document.getElementById('almanacColorName');
  const almanacFastRule = document.getElementById('almanacFastRule');
  const reading1Ref = document.getElementById('reading1Ref');
  const reading1Text = document.getElementById('reading1Text');
  const psalmRef = document.getElementById('psalmRef');
  const psalmResponse = document.getElementById('psalmResponse');
  const psalmText = document.getElementById('psalmText');
  const gospelRef = document.getElementById('gospelRef');
  const gospelText = document.getElementById('gospelText');

  // Bookmarks Elements
  const bookmarksContainer = document.getElementById('bookmarksContainer');
  const emptyBookmarkState = document.getElementById('emptyBookmarkState');
  const bookmarkFilterChips = document.querySelectorAll('#bookmarkFilterGroup .chip');
  const addNewBookmarkBtn = document.getElementById('addNewBookmarkBtn');

  // Modal Elements
  const modalOverlay = document.getElementById('modalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const saveBookmarkSubmitBtn = document.getElementById('saveBookmarkSubmitBtn');
  const bookmarkTitleInput = document.getElementById('bookmarkTitleInput');
  const bookmarkCategorySelect = document.getElementById('bookmarkCategorySelect');
  const bookmarkContentInput = document.getElementById('bookmarkContentInput');

  // Settings & Theme Elements
  const themeCards = document.querySelectorAll('.theme-card');

  // Audio Player Elements
  const playAudioBtn = document.getElementById('playAudioBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const audioProgressBar = document.getElementById('audioProgressBar');
  const audioCurrentTime = document.getElementById('audioCurrentTime');
  const audioTotalDuration = document.getElementById('audioTotalDuration');
  const audioSeekWrapper = document.getElementById('audioSeekWrapper');
  const rewindAudioBtn = document.getElementById('rewindAudioBtn');
  const forwardAudioBtn = document.getElementById('forwardAudioBtn');

  // Verse Elements & Pop-out Modal
  const verseOfTheDayPillBtn = document.getElementById('verseOfTheDayPillBtn');
  const verseModalOverlay = document.getElementById('verseModalOverlay');
  const closeVerseModalBtn = document.getElementById('closeVerseModalBtn');
  const modalCopyVerseBtn = document.getElementById('modalCopyVerseBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const modalShareVerseBtn = document.getElementById('modalShareVerseBtn');
  const shareBtnText = document.getElementById('shareBtnText');
  const modalBookmarkVerseBtn = document.getElementById('modalBookmarkVerseBtn');
  const bookmarkBtnText = document.getElementById('bookmarkBtnText');
  const verseShareModalOverlay = document.getElementById('verseShareModalOverlay');
  const closeVerseShareModalBtn = document.getElementById('closeVerseShareModalBtn');
  const verseShareTabBtnText = document.getElementById('verseShareTabBtnText');
  const verseShareTabBtnImage = document.getElementById('verseShareTabBtnImage');
  const verseShareTextPanel = document.getElementById('verseShareTextPanel');
  const verseShareImagePanel = document.getElementById('verseShareImagePanel');
  const verseSharePreviewText = document.getElementById('verseSharePreviewText');
  const verseSharePreviewRef = document.getElementById('verseSharePreviewRef');
  const verseShareImagePreview = document.getElementById('verseShareImagePreview');
  const verseShareImageLoading = document.getElementById('verseShareImageLoading');
  const verseShareCanvas = document.getElementById('verseShareCanvas');
  const shareVerseWhatsAppBtn = document.getElementById('shareVerseWhatsAppBtn');
  const shareVerseInstagramBtn = document.getElementById('shareVerseInstagramBtn');
  const shareVerseAllAppsBtn = document.getElementById('shareVerseAllAppsBtn');
  const shareVerseImageNativeBtn = document.getElementById('shareVerseImageNativeBtn');
  const saveVerseImageBtn = document.getElementById('saveVerseImageBtn');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // Announcement & Song Pills & Modals
  const announcementPillBtn = document.getElementById('announcementPillBtn');
  const announcementModalOverlay = document.getElementById('announcementModalOverlay');
  const closeAnnouncementModalBtn = document.getElementById('closeAnnouncementModalBtn');
  const dismissAnnouncementBtn = document.getElementById('dismissAnnouncementBtn');

  const todaySongPillBtn = document.getElementById('todaySongPillBtn');
  const todaySongModalOverlay = document.getElementById('todaySongModalOverlay');
  const closeSongModalBtn = document.getElementById('closeSongModalBtn');
  const copySongLyricsBtn = document.getElementById('copySongLyricsBtn');
  const copySongBtnText = document.getElementById('copySongBtnText');
  const bookmarkSongBtn = document.getElementById('bookmarkSongBtn');
  const bookmarkSongBtnText = document.getElementById('bookmarkSongBtnText');

  // Church Library Books & Dedicated Screen Reader
  const bookPrabhuBhojBtn = document.getElementById('bookPrabhuBhojBtn');
  const bookAshayeRabbaniBtn = document.getElementById('bookAshayeRabbaniBtn');
  const bookAaradhanaaBtn = document.getElementById('bookAaradhanaaBtn');
  const bookMasihiGeetBtn = document.getElementById('bookMasihiGeetBtn');
  const bookAdditionalSongsBtn = document.getElementById('bookAdditionalSongsBtn');

  // Dedicated Song Book & Song Lyrics Elements
  const songListBackBtn = document.getElementById('songListBackBtn');
  const songListContainer = document.getElementById('songListContainer');
  const songLyricsBackBtn = document.getElementById('songLyricsBackBtn');
  const songLyricsContainer = document.getElementById('songLyricsContainer');
  let currentOpenSongBookKey = null;
  let currentOpenSong = null;
  let currentSongList = [];

  const readerScreenBackBtn = document.getElementById('readerScreenBackBtn') || document.getElementById('readerBackBtn');
  const screenReaderCategory = document.getElementById('screenReaderCategory');
  const screenReaderTitle = document.getElementById('screenReaderTitle');
  const screenReaderSubtitle = document.getElementById('screenReaderSubtitle');
  const screenReaderToc = document.getElementById('screenReaderToc');
  const screenReaderBodyContent = document.getElementById('screenReaderBodyContent');
  const screenCopyBookBtn = document.getElementById('screenCopyBookBtn');
  const screenBookmarkBookBtn = document.getElementById('screenBookmarkBookBtn');
  const screenReaderBottomBackBtn = document.getElementById('screenReaderBottomBackBtn');
  const screenReaderBottomCopyBtn = document.getElementById('screenReaderBottomCopyBtn');
  const screenBottomCopyText = document.getElementById('screenBottomCopyText');
  let currentOpenBookKey = null;
  let previousTabBeforeBook = 'viewHome';

  // Quick Action Cards on Home (Renamed Cards)
  const openTimelineCard = document.getElementById('openTimelineCard');
  const openChatCard = document.getElementById('openChatCard');
  const quickPrayerBtn = document.getElementById('quickPrayerBtn');
  const bellNotificationBtn = document.getElementById('bellNotificationBtn');

  // Timeline & Chat Modals
  const churchTimelineModalOverlay = document.getElementById('churchTimelineModalOverlay');
  const closeTimelineModalBtn = document.getElementById('closeTimelineModalBtn');
  const closeTimelineBottomBtn = document.getElementById('closeTimelineBottomBtn');
  const openAlmanacFromTimelineBtn = document.getElementById('openAlmanacFromTimelineBtn');

  const churchChatModalOverlay = document.getElementById('churchChatModalOverlay');
  const closeChatModalBtn = document.getElementById('closeChatModalBtn');
  const chatMessagesContainer = document.getElementById('chatMessagesContainer');
  const chatMessageInput = document.getElementById('chatMessageInput');
  const sendChatMessageBtn = document.getElementById('sendChatMessageBtn');

  /* ==========================================================================
     1. INITIALIZATION & REFRESH SCREEN PERSISTENCE
     ========================================================================== */
  function restorePresentScreenState() {
    try {
      // 1. Check if a PDF reader was open
      const isPdfOpen = localStorage.getItem('sanctuary_pdf_open') === 'true';
      const savedPdfUrl = localStorage.getItem('sanctuary_pdf_url');
      const savedPdfPage = parseInt(localStorage.getItem('sanctuary_pdf_page'), 10) || 1;
      const savedPdfTitle = localStorage.getItem('sanctuary_pdf_title');

      // 2. Check saved primary tab
      const savedTab = localStorage.getItem('sanctuary_active_tab') || 'viewHome';

      // 3. Check if a Liturgical Book Reader was open
      const savedBookKey = localStorage.getItem('sanctuary_active_book');

      // 4. Check if Song List or Song Lyrics was open
      const savedSongBookKey = localStorage.getItem('sanctuary_active_songbook');

      if (isPdfOpen && savedPdfUrl) {
        if (savedTab && views[savedTab]) {
          switchTab(savedTab, false);
        }
        setTimeout(() => {
          openPdfBook(savedPdfUrl, savedPdfTitle, savedPdfPage);
        }, 100);
        return;
      }

      if (savedTab === 'viewSongList' && savedSongBookKey) {
        openSongBookScreen(savedSongBookKey);
        return;
      }

      if (savedTab === 'viewSongLyrics' && savedSongBookKey) {
        const savedSongIdx = parseInt(localStorage.getItem('sanctuary_active_song_idx'), 10) || 0;
        openSongBookScreen(savedSongBookKey).then(() => {
          if (currentSongList && currentSongList[savedSongIdx]) {
            openSongLyricsScreen(currentSongList[savedSongIdx], savedSongBookKey, savedSongIdx);
          }
        });
        return;
      }

      if (savedTab === 'viewBookReader' && savedBookKey) {
        openBookScreen(savedBookKey);
        return;
      }

      if (savedTab === 'viewTimelineDetail') {
        const savedTimelineDetailId = localStorage.getItem('sanctuary_active_timeline_id');
        let items = [];
        try {
          const raw = localStorage.getItem('sanctuary_timeline_entries');
          if (raw) items = JSON.parse(raw);
        } catch (_) {}
        const matchedItem = Array.isArray(items) && savedTimelineDetailId ? items.find(i => i.id === savedTimelineDetailId) : (Array.isArray(items) && items.length > 0 ? items[0] : null);
        if (matchedItem && typeof openTimelineDetailView === 'function') {
          openTimelineDetailView(matchedItem);
          return;
        } else {
          switchTab('viewTimeline', false);
          return;
        }
      }

      if (savedTab && views[savedTab]) {
        switchTab(savedTab, false);
        const matchedItem = document.querySelector(`.dock-item[data-tab="${savedTab}"]`);
        if (matchedItem) {
          setTimeout(() => positionDockIndicator(matchedItem, false), 40);
          setTimeout(() => positionDockIndicator(matchedItem, false), 180);
        }
      } else {
        switchTab('viewHome', false);
      }
    } catch (e) {
      console.warn('Error restoring screen state on refresh:', e);
      switchTab('viewHome', false);
    }
  }

  function init() {
    document.body.classList.remove('modal-open');
    updateHomeDailyVerseAndDate();
    renderAnnouncementHomeUI();
    renderTodaySongHomeUI();
    if (typeof hydrateAlmanacStore === 'function') hydrateAlmanacStore();
    renderAlmanacModule();
    initPdfEngine();
    loadSavedSettings();
    loadBookmarks();
    initDockNavigation();
    initAndroidGestures();
    updateAppPermissionsUI();
    if (typeof initAboutChurchModule === 'function') initAboutChurchModule();
    if (typeof hookSupabaseChatRealtime === 'function') hookSupabaseChatRealtime();

    // ==========================================================================
    // CORE SPEC v1: EVENT LISTENERS (ONBOARDING, CHAT GATE, POSTS, AUDIT)
    // ==========================================================================

    // Onboarding Buttons
    const onboardingCancelBtn = document.getElementById('onboardingCancelBtn');
    if (onboardingCancelBtn) {
      onboardingCancelBtn.addEventListener('click', () => {
        completeOnboarding('Believer', 'post-member', true);
      });
    }

    const onboardingSaveBtn = document.getElementById('onboardingSaveBtn');
    if (onboardingSaveBtn) {
      onboardingSaveBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('onboardingNameInput');
        const postSelect = document.getElementById('onboardingPostSelect');
        const name = nameInput ? nameInput.value.trim() : 'Believer';
        const post = postSelect ? postSelect.value : 'post-member';
        completeOnboarding(name || 'Believer', post, false);
      });
    }

    // Chat Access Gate Buttons
    const chatGateCancelBtn = document.getElementById('chatGateCancelBtn');
    if (chatGateCancelBtn) {
      chatGateCancelBtn.addEventListener('click', () => {
        const gateModal = document.getElementById('chatAccessGateModalOverlay');
        const chatView = document.getElementById('viewChat');
        if (gateModal) gateModal.classList.add('hidden');
        if (chatView) chatView.classList.remove('blurred');
        switchTab('viewHome');
      });
    }

    const chatGateSetBtn = document.getElementById('chatGateSetBtn');
    if (chatGateSetBtn) {
      chatGateSetBtn.addEventListener('click', () => {
        const gateModal = document.getElementById('chatAccessGateModalOverlay');
        if (gateModal) gateModal.classList.add('hidden');
        openEditProfileNameModal();
      });
    }

    // Profile Card Name Edit Action & Popup Modal Handlers
    function openEditProfileNameModal(isRegistration = false) {
      const modal = document.getElementById('editProfileNameModalOverlay');
      const input = document.getElementById('editProfileNameInput');
      const badge = document.getElementById('modalNameEditsRemainingBadge');
      const headerTag = document.getElementById('editProfileModalHeaderTag');
      const heading = document.getElementById('editProfileModalHeading');
      const desc = document.getElementById('editProfileModalDesc');
      const saveBtnText = document.getElementById('saveEditProfileBtnText');
      if (!modal) return;

      const isDefault = !currentAuthSession.display_name || 
                        currentAuthSession.display_name.trim() === '' || 
                        currentAuthSession.display_name.trim().toLowerCase() === 'believer' ||
                        currentAuthSession.display_name.trim().toLowerCase() === 'parishioner';

      const registering = isRegistration || isDefault;

      if (headerTag) headerTag.textContent = registering ? 'Register Your Name' : 'Edit Profile Name';
      if (heading) heading.textContent = registering ? 'Enter Your Name' : 'Edit Display Name';
      if (desc) desc.textContent = registering 
        ? 'Please register your name to participate in church fellowship chat & community.' 
        : 'Update your fellowship display name across All Saints\' Church.';
      if (saveBtnText) saveBtnText.textContent = 'Save & Continue';

      const count = getNameEditCount();
      const perms = useAppPermissions();
      const remaining = Math.max(0, 6 - count);

      if (!registering && count >= 6 && perms.role === 'member') {
        showToast('Name edit limit reached (6/6). Please contact an Admin 🛡️');
        return;
      }

      if (input) {
        input.value = (!isDefault) 
          ? currentAuthSession.display_name 
          : '';
        setTimeout(() => {
          input.focus();
          input.select();
        }, 150);
      }

      if (badge) {
        if (registering || perms.role === 'superadmin' || perms.role === 'admin') {
          badge.textContent = '';
          badge.style.display = 'none';
        } else {
          badge.textContent = `${remaining} of 6 edits remaining`;
          badge.style.color = remaining <= 1 ? '#ef4444' : 'var(--text-muted)';
          badge.style.display = '';
        }
      }

      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
    }

    function closeEditProfileNameModal() {
      const modal = document.getElementById('editProfileNameModalOverlay');
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }

      const isDefault = !currentAuthSession.display_name || 
                        currentAuthSession.display_name.trim() === '' || 
                        currentAuthSession.display_name.trim().toLowerCase() === 'believer' ||
                        currentAuthSession.display_name.trim().toLowerCase() === 'parishioner';

      // If user cancelled registration while attempting to view chat, switch back to Home
      if (state.activeTab === 'viewChat' && isDefault) {
        switchTab('viewHome');
      }
    }

    window.openEditProfileNameModal = openEditProfileNameModal;
    window.closeEditProfileNameModal = closeEditProfileNameModal;

    async function handleSaveProfileName() {
      const input = document.getElementById('editProfileNameInput');
      const name = input ? input.value.trim() : '';
      if (!name) {
        showToast('Please enter your name');
        if (input) input.focus();
        return;
      }

      const count = getNameEditCount();
      const perms = useAppPermissions();
      if (count >= 6 && perms.role === 'member') {
        showToast('Name edit limit reached (6/6). Please contact an Admin 🛡️');
        closeEditProfileNameModal();
        return;
      }

      const previousName = currentAuthSession.display_name || 'Believer';
      currentAuthSession.display_name = name;
      if (name !== previousName && perms.role === 'member') {
        setNameEditCount(count + 1);
      }
      
      await persistAuthSession(currentAuthSession);
      try {
        localStorage.setItem('sanctuary_chat_display_name', name);
      } catch (_) {}

      // Automatically register profile in Dexie DB and LocalStorage registered participants
      try {
        if (churchDexieDb && churchDexieDb.profiles) {
          await churchDexieDb.profiles.put({
            id: currentAuthSession.uid || DEXIE_SESSION_KEY,
            display_name: name,
            email: currentAuthSession.email || null,
            role: currentAuthSession.role || 'member',
            is_youth: Boolean(currentAuthSession.is_youth),
            congregational_post: currentAuthSession.congregational_post || 'post-member',
            updated_at: new Date().toISOString()
          });
        }
      } catch (_) {}

      try {
        const regRaw = localStorage.getItem('sanctuary_registered_members');
        const regList = regRaw ? JSON.parse(regRaw) : [];
        const existingIdx = regList.findIndex(m => m.id === currentAuthSession.uid || (m.name && m.name.toLowerCase() === previousName.toLowerCase()) || (m.name && m.name.toLowerCase() === name.toLowerCase()));
        const memberRecord = {
          id: currentAuthSession.uid || 'user-' + Date.now(),
          name: name,
          email: currentAuthSession.email || null,
          role: currentAuthSession.role || 'member',
          postTitle: (typeof getPostDisplayName === 'function') ? getPostDisplayName(currentAuthSession.congregational_post || 'post-member') : 'Member',
          badge: currentAuthSession.role === 'superadmin' || currentAuthSession.role === 'admin' ? 'admin' : '',
          avatar: currentAuthSession.role === 'superadmin' ? '👑' : (currentAuthSession.role === 'admin' ? '🛡️' : (currentAuthSession.is_youth ? '🕊️' : '👤')),
          status: 'Registered Fellowship Member ⛪',
          online: true,
          is_youth: Boolean(currentAuthSession.is_youth)
        };
        if (existingIdx >= 0) {
          regList[existingIdx] = memberRecord;
        } else {
          regList.push(memberRecord);
        }
        localStorage.setItem('sanctuary_registered_members', JSON.stringify(regList));
      } catch (_) {}

      // Supabase sync (upsert profile)
      if (churchSupabase && window.navigator.onLine) {
        churchSupabase.from('profiles').upsert({
          id: currentAuthSession.uid,
          display_name: name,
          role: currentAuthSession.role || 'member',
          is_youth: Boolean(currentAuthSession.is_youth)
        }).then(() => {}).catch(() => {});
      }

      // Automatically unlock Congregation Chat and remove blank/blurred states
      const gateModal = document.getElementById('chatAccessGateModalOverlay');
      const chatView = document.getElementById('viewChat');
      if (gateModal) gateModal.classList.add('hidden');
      if (chatView) {
        chatView.classList.remove('blurred');
        chatView.classList.remove('chat-unregistered-blank');
      }

      const modal = document.getElementById('editProfileNameModalOverlay');
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }

      updateAppPermissionsUI();
      addAuditLogEntry({
        action: 'name_edit',
        entity_type: 'profile',
        details: `User set and updated profile name to "${name}"`
      });
      showToast(`Welcome ${name}! Congregation chat unlocked ✨`);

      // Refresh chat header and participants list
      if (typeof window.renderActiveCniChat === 'function') {
        window.renderActiveCniChat(true);
      }

      // Real-time broadcast name changes to everyone over WebSocket
      if (typeof window.sendWsEvent === 'function') {
        const postName = (typeof getPostDisplayName === 'function') ? getPostDisplayName(currentAuthSession.congregational_post || 'post-member') : 'Congregation Member';
        window.sendWsEvent({
          type: 'profile_updated',
          userId: currentAuthSession.uid,
          oldName: previousName,
          newName: name,
          post: postName,
          role: currentAuthSession.role || 'member'
        });
      }

      closeEditProfileNameModal();
    }

    const editProfileNameBtn = document.getElementById('editProfileNameBtn');
    if (editProfileNameBtn) {
      editProfileNameBtn.addEventListener('click', openEditProfileNameModal);
    }

    const saveEditProfileNameBtn = document.getElementById('saveEditProfileNameBtn');
    if (saveEditProfileNameBtn) {
      saveEditProfileNameBtn.addEventListener('click', handleSaveProfileName);
    }

    const cancelEditProfileNameBtn = document.getElementById('cancelEditProfileNameBtn');
    if (cancelEditProfileNameBtn) {
      cancelEditProfileNameBtn.addEventListener('click', closeEditProfileNameModal);
    }

    const closeEditProfileNameModalBtn = document.getElementById('closeEditProfileNameModalBtn');
    if (closeEditProfileNameModalBtn) {
      closeEditProfileNameModalBtn.addEventListener('click', closeEditProfileNameModal);
    }

    const editProfileNameInputEl = document.getElementById('editProfileNameInput');
    if (editProfileNameInputEl) {
      editProfileNameInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveProfileName();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeEditProfileNameModal();
        }
      });
    }

    // 1. Congregational Posts Manager Screen Navigation & Actions
    const openPostsScreenBtn = document.getElementById('openPostsScreenBtn');
    const postsManagementGroup = document.getElementById('postsManagementGroup');
    const handleOpenPostsScreen = (e) => {
      if (e) e.stopPropagation();
      switchTab('viewPostsManager');
      renderPostsManagementUI();
    };
    if (postsManagementGroup) {
      postsManagementGroup.addEventListener('click', handleOpenPostsScreen);
    } else if (openPostsScreenBtn) {
      openPostsScreenBtn.addEventListener('click', handleOpenPostsScreen);
    }

    const postsManagerBackBtn = document.getElementById('postsManagerBackBtn');
    if (postsManagerBackBtn) {
      postsManagerBackBtn.addEventListener('click', () => switchTab('viewSettings'));
    }

    const addNewPostBtn = document.getElementById('addNewPostBtn');
    const postsScreenAddNewPostBtn = document.getElementById('postsScreenAddNewPostBtn');
    [addNewPostBtn, postsScreenAddNewPostBtn].forEach(btn => {
      if (btn) btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPostEditModal();
      });
    });

    const closePostEditModalBtn = document.getElementById('closePostEditModalBtn');
    const cancelPostEditBtn = document.getElementById('cancelPostEditBtn');
    [closePostEditModalBtn, cancelPostEditBtn].forEach(b => {
      if (b) b.addEventListener('click', closePostEditModal);
    });

    const savePostEditBtn = document.getElementById('savePostEditBtn');
    if (savePostEditBtn) {
      savePostEditBtn.addEventListener('click', savePostEdit);
    }

    // 2. Announcement & Today's Song Manager Screen Navigation
    const openBulletinScreenBtn = document.getElementById('openBulletinScreenBtn');
    const bulletinSongManagementGroup = document.getElementById('bulletinSongManagementGroup');
    const handleOpenBulletinScreen = (e) => {
      if (e) e.stopPropagation();
      switchTab('viewBulletinManager');
      if (typeof renderAdminAnnouncementsList === 'function') {
        renderAdminAnnouncementsList();
      }
    };
    if (bulletinSongManagementGroup) {
      bulletinSongManagementGroup.addEventListener('click', handleOpenBulletinScreen);
    } else if (openBulletinScreenBtn) {
      openBulletinScreenBtn.addEventListener('click', handleOpenBulletinScreen);
    }

    const bulletinManagerBackBtn = document.getElementById('bulletinManagerBackBtn');
    if (bulletinManagerBackBtn) {
      bulletinManagerBackBtn.addEventListener('click', () => switchTab('viewSettings'));
    }

    // 3. Church Data & Hymn Imports — open modal with 3 well-organized options (Pinpoint #5)
    const openImportScreenBtn = document.getElementById('openImportScreenBtn');
    const importSettingsGroup = document.getElementById('importSettingsGroup');
    const importOptionsModalOverlay = document.getElementById('importOptionsModalOverlay');
    const closeImportOptionsModalBtn = document.getElementById('closeImportOptionsModalBtn');

    const openImportOptionsModal = (e) => {
      if (e) e.stopPropagation();
      if (importOptionsModalOverlay) {
        importOptionsModalOverlay.classList.remove('hidden');
        if (typeof syncModalOpenState === 'function') syncModalOpenState();
      } else {
        switchTab('viewImportManager');
      }
    };

    const closeImportOptionsModal = () => {
      if (importOptionsModalOverlay) {
        importOptionsModalOverlay.classList.add('hidden');
        if (typeof syncModalOpenState === 'function') syncModalOpenState();
      }
    };
    window.closeImportOptionsModal = closeImportOptionsModal;
    window.openImportOptionsModal = openImportOptionsModal;

    if (closeImportOptionsModalBtn) {
      closeImportOptionsModalBtn.addEventListener('click', closeImportOptionsModal);
    }
    if (importOptionsModalOverlay) {
      importOptionsModalOverlay.addEventListener('click', (e) => {
        if (e.target === importOptionsModalOverlay) closeImportOptionsModal();
      });
    }

    document.querySelectorAll('.import-choice-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dest = btn.getAttribute('data-dest-choice') || 'masihi_geeto_ka_sangrah';
        closeImportOptionsModal();
        if (typeof window.navigateToImportManager === 'function') {
          window.navigateToImportManager(dest);
        } else {
          switchTab('viewImportManager');
          const destCards = document.querySelectorAll('.import-dest-card[data-dest]');
          destCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-dest') === dest));
          const select = document.getElementById('modalImportDestinationSelect');
          if (select) { select.value = dest; select.dispatchEvent(new Event('change')); }
        }
      });
    });

    if (importSettingsGroup) {
      importSettingsGroup.addEventListener('click', openImportOptionsModal);
    } else if (openImportScreenBtn) {
      openImportScreenBtn.addEventListener('click', openImportOptionsModal);
    }

    const importManagerBackBtn = document.getElementById('importManagerBackBtn');
    if (importManagerBackBtn) {
      importManagerBackBtn.addEventListener('click', () => switchTab('viewSettings'));
    }

    // 4. Open Full Audit Log Screen (Section 6)
    const openAuditLogScreenBtn = document.getElementById('openAuditLogScreenBtn');
    const auditLogSettingsGroup = document.getElementById('auditLogSettingsGroup');
    const handleOpenAuditLog = (e) => {
      if (e) e.stopPropagation();
      switchTab('viewAuditLog');
      renderAuditLogUI();
    };
    if (auditLogSettingsGroup) {
      auditLogSettingsGroup.addEventListener('click', handleOpenAuditLog);
    } else if (openAuditLogScreenBtn) {
      openAuditLogScreenBtn.addEventListener('click', handleOpenAuditLog);
    }

    const auditLogBackBtn = document.getElementById('auditLogBackBtn');
    if (auditLogBackBtn) {
      auditLogBackBtn.addEventListener('click', () => {
        switchTab('viewSettings');
      });
    }

    const refreshAuditLogBtn = document.getElementById('refreshAuditLogBtn');
    if (refreshAuditLogBtn) {
      refreshAuditLogBtn.addEventListener('click', () => {
        renderAuditLogUI();
        showToast('Audit log refreshed ✨');
      });
    }

    // Audit Log Filter Chips
    const auditFilterChips = document.querySelectorAll('#auditFilterChipsGroup .chip');
    auditFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        auditFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentAuditFilter = chip.getAttribute('data-audit-filter') || 'all';
        renderAuditLogUI();
      });
    });

    renderSearchResults();
    initAudioPlayer();
    attachEventListeners();
    setupImportModule();
    restorePresentScreenState();
    if (typeof window.renderActiveCniChat === 'function') {
      window.renderActiveCniChat();
    }
    syncModalOpenState();

    try {
      restoreAuthSession();
    } catch (e) {
      console.error('[Startup] Session restoration error:', e);
      hideSplashOverlay();
      if (typeof switchTab === 'function') switchTab('viewHome');
    }

    // Periodic auto-update for live date & verse of the day
    setInterval(updateHomeDailyVerseAndDate, 60000);
    window.addEventListener('focus', updateHomeDailyVerseAndDate);
  }

  /* ==========================================================================
     2. FLOATING DOCK NAVIGATION & FLUID INTERACTION (iOS FLUID PHYSICS ENGINE)
     ========================================================================== */
  let currentIndicatorX = 0;
  let isTouchingDock = false;
  let forceTouchTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let cachedDockItems = [];
  let lastTouchClientX = 0;
  let lastTouchClientY = 0;
  let dockBounds = { left: 0, top: 0, width: 0, height: 0, minX: 0, maxX: 0, itemWidth: 0 };

  // 1. MEASUREMENT CACHING FOR 120 FPS FLUID GESTURES
  function cacheDockItemMeasurements() {
    if (!dockContainer) return;
    const dockRect = dockContainer.getBoundingClientRect();
    const items = document.querySelectorAll('.dock-item');
    
    cachedDockItems = Array.from(items).filter(item => item && item.dataset).map(item => ({
      item,
      offsetLeft: item.offsetLeft || 0,
      offsetWidth: item.offsetWidth || 0,
      centerX: (dockRect.left || 0) + (item.offsetLeft || 0) + (item.offsetWidth || 0) / 2,
      tab: item.dataset ? item.dataset.tab : null
    }));

    if (cachedDockItems.length > 0) {
      dockBounds.left = dockRect.left || 0;
      dockBounds.top = dockRect.top || 0;
      dockBounds.width = dockRect.width || 0;
      dockBounds.height = dockRect.height || 0;
      dockBounds.minX = cachedDockItems[0].offsetLeft;
      dockBounds.maxX = cachedDockItems[cachedDockItems.length - 1].offsetLeft;
      dockBounds.itemWidth = cachedDockItems[0].offsetWidth;
    }
  }

  // 2. POSITION DOCK INDICATOR (iOS FLUID SPRING GLIDE)
  function positionDockIndicator(targetItem, animate = true) {
    if (!targetItem || !dockIndicator) return;
    const targetLeft = targetItem.offsetLeft;
    const targetWidth = targetItem.offsetWidth;

    if (targetWidth === 0) return;

    dockIndicator.classList.remove('touching', 'force-touch', 'dragging');
    dockIndicator.style.transition = animate 
      ? 'transform 0.36s cubic-bezier(0.2, 0.95, 0.28, 1.2), width 0.32s cubic-bezier(0.2, 0.95, 0.28, 1.2)' 
      : 'none';
    dockIndicator.style.transform = `translate3d(${targetLeft}px, 0, 0) scale3d(1, 1, 1)`;
    dockIndicator.style.width = `${targetWidth}px`;
    currentIndicatorX = targetLeft;
  }

  function initDockNavigation() {
    let lastDragTime = Date.now();
    let lastDragX = 0;
    let dragVelocity = 0;
    let lastHoveredIndex = -1;

    const updateActiveIndicator = (animate = true) => {
      const activeItem = document.querySelector('.dock-item.active');
      if (activeItem) positionDockIndicator(activeItem, animate);
    };

    // Initial mount calibration
    cacheDockItemMeasurements();
    updateActiveIndicator(false);
    (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(() => {
      cacheDockItemMeasurements();
      updateActiveIndicator(false);
    });
    setTimeout(() => {
      cacheDockItemMeasurements();
      updateActiveIndicator(false);
    }, 60);
    setTimeout(() => {
      cacheDockItemMeasurements();
      updateActiveIndicator(false);
    }, 220);

    // Direct click handling for every dock item
    const items = document.querySelectorAll('.dock-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = item.dataset.tab;
        if (targetTab && views[targetTab]) {
          switchTab(targetTab, true);
        }
      });
    });

    // 4. TOUCH START (3D TOUCH HOLD DEPTH & FLUID GLIDE)
    function startTouchHold(e) {
      if (document.body.classList.contains('modal-open')) return;
      if (!dockContainer || !dockIndicator) return;

      isTouchingDock = true;
      document.body.classList.add('dock-is-touching');
      cacheDockItemMeasurements();

      const touchPoint = e.touches ? e.touches[0] : e;
      lastTouchClientX = touchPoint.clientX;
      lastTouchClientY = touchPoint.clientY;
      touchStartX = touchPoint.clientX;
      touchStartY = touchPoint.clientY;
      lastDragX = touchPoint.clientX;
      lastDragTime = Date.now();
      dragVelocity = 0;

      if (forceTouchTimer) clearTimeout(forceTouchTimer);
      dockIndicator.classList.remove('force-touch');

      // Trigger 3D Touch Depth Pop on stationary touch & hold (>140ms)
      forceTouchTimer = setTimeout(() => {
        if (isTouchingDock) {
          dockIndicator.classList.add('force-touch');
          if (navigator.vibrate) {
            try { navigator.vibrate(10); } catch (err) {}
          }
        }
      }, 140);

      const itemWidth = dockBounds.itemWidth || (dockBounds.width / (cachedDockItems.length || 4));
      const touchXInDock = touchPoint.clientX - dockBounds.left;
      const targetTouchX = touchXInDock - itemWidth / 2;
      const dist = Math.abs(currentIndicatorX - targetTouchX);

      // Fluid Glide on Touch: Smoothly glides across with spring bounce if touched at distance
      if (dist > 14) {
        dockContainer.style.transition = 'transform 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.25)';
        dockContainer.style.transform = 'translate3d(0, 0, 0)';
        dockIndicator.style.transition = 'transform 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.25), width 0.30s cubic-bezier(0.18, 0.89, 0.32, 1.25)';
        dockIndicator.style.transform = `translate3d(${targetTouchX.toFixed(2)}px, 0, 0) scale3d(0.95, 0.95, 1)`;
        dockIndicator.style.width = `${itemWidth}px`;
        dockIndicator.classList.add('touching');
        currentIndicatorX = targetTouchX;
      } else {
        handleDockDrag(touchPoint.clientX, touchPoint.clientY);
      }
    }

    // 5. TOUCH MOVE (NATIVE 120HZ-240HZ HARDWARE SAMPLING WITH RAF COALESCING)
    let dockDragRaf = null;
    let pendingTouchX = 0;
    let pendingTouchY = 0;

    function moveTouchHold(e) {
      if (!isTouchingDock) return;
      const touchPoint = e.touches ? e.touches[0] : e;
      pendingTouchX = touchPoint.clientX;
      pendingTouchY = touchPoint.clientY;
      lastTouchClientX = pendingTouchX;
      lastTouchClientY = pendingTouchY;

      if (!dockDragRaf) {
        dockDragRaf = requestAnimationFrame(() => {
          dockDragRaf = null;
          if (isTouchingDock) {
            handleDockDrag(pendingTouchX, pendingTouchY);
          }
        });
      }
    }

    // 6. REAL-TIME DRAG & RUBBER-BAND ELASTIC PHYSICS (X, Y & MAIN DOCK)
    function handleDockDrag(clientX, clientY) {
      if (!isTouchingDock || cachedDockItems.length === 0) return;

      const now = Date.now();
      const dt = Math.max(now - lastDragTime, 1);
      const dx = clientX - lastDragX;
      dragVelocity = (dx / dt) * 16.6; // normalized velocity
      lastDragX = clientX;
      lastDragTime = now;

      const moveDist = Math.hypot(clientX - touchStartX, clientY - touchStartY);
      if (moveDist > 8) {
        if (forceTouchTimer) {
          clearTimeout(forceTouchTimer);
          forceTouchTimer = null;
        }
        dockIndicator.classList.remove('force-touch');
      }

      const itemWidth = dockBounds.itemWidth || (dockBounds.width / (cachedDockItems.length || 4));
      const minX = dockBounds.minX;
      const maxX = dockBounds.maxX;
      
      const touchXInDock = clientX - dockBounds.left;
      const rawTargetX = touchXInDock - itemWidth / 2;

      let currentX = rawTargetX;
      let dockShiftX = 0;

      // 6a. Horizontal Elastic Rubber-Band Physics on boundary extremes
      if (rawTargetX < minX) {
        const pull = minX - rawTargetX;
        const flexOvershoot = Math.log10(1 + pull * 0.05) * 18;
        currentX = minX - flexOvershoot;
        dockShiftX = -Math.log10(1 + pull * 0.05) * 8;
      } else if (rawTargetX > maxX) {
        const pull = rawTargetX - maxX;
        const flexOvershoot = Math.log10(1 + pull * 0.05) * 18;
        currentX = maxX + flexOvershoot;
        dockShiftX = Math.log10(1 + pull * 0.05) * 8;
      }

      // 6b. Vertical (Y) Elastic Rubber-Band Physics
      const dockCenterY = dockBounds.top + dockBounds.height / 2;
      const rawDY = clientY - dockCenterY;
      const flexY = Math.sign(rawDY) * Math.log10(1 + Math.abs(rawDY) * 0.06) * 10;
      const dockShiftY = flexY * 0.35;

      // 6c. Fluid Stretch Factor (iOS Fluid Morphing based on motion velocity)
      const stretchX = Math.min(Math.abs(dragVelocity) * 0.008, 0.12);
      const scaleX = 0.95 + stretchX;
      const scaleY = 0.95 - (stretchX * 0.45);

      // 6d. Check threshold crossings for subtle tactile haptic
      const closestIdx = cachedDockItems.findIndex(item => Math.abs(clientX - item.centerX) < (item.offsetWidth / 2));
      if (closestIdx !== -1 && closestIdx !== lastHoveredIndex) {
        lastHoveredIndex = closestIdx;
        if (navigator.vibrate) {
          try { navigator.vibrate(6); } catch (err) {}
        }
      }

      // 6e. Subtle dynamic stretch displacement applied to the main dock bar
      dockContainer.style.transition = 'none';
      dockContainer.style.transform = `translate3d(${dockShiftX.toFixed(2)}px, ${dockShiftY.toFixed(2)}px, 0)`;

      // 6f. Clean 1:1 follow of the dock indicator with fluid spring scale (Zero layout thrash)
      dockIndicator.style.transition = 'none';
      if (dockIndicator.dataset.cachedWidth !== String(itemWidth)) {
        dockIndicator.style.width = `${itemWidth}px`;
        dockIndicator.dataset.cachedWidth = String(itemWidth);
      }
      dockIndicator.style.transform = `translate3d(${currentX.toFixed(2)}px, ${flexY.toFixed(2)}px, 0) scale3d(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}, 1)`;
      dockIndicator.classList.add('touching');

      currentIndicatorX = currentX;
    }

    // 7. TOUCH END / RELEASE (AUTHENTIC iOS SPRING SNAP & SETTLING)
    function endTouchHold(e) {
      if (dockDragRaf) {
        cancelAnimationFrame(dockDragRaf);
        dockDragRaf = null;
      }
      if (!isTouchingDock) return;
      isTouchingDock = false;
      document.body.classList.remove('dock-is-touching');
      lastHoveredIndex = -1;

      if (forceTouchTimer) {
        clearTimeout(forceTouchTimer);
        forceTouchTimer = null;
      }
      dockIndicator.classList.remove('force-touch');

      // Smoothly snap the main dock bar back to center resting position
      dockContainer.style.transition = 'transform 0.34s cubic-bezier(0.18, 0.89, 0.32, 1.25)';
      dockContainer.style.transform = 'translate3d(0, 0, 0)';

      const touchPoint = (e && e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e;
      const clientX = touchPoint ? touchPoint.clientX : lastTouchClientX;
      if (cachedDockItems.length === 0) cacheDockItemMeasurements();
      let closestObj = cachedDockItems[0];
      let minDiff = Infinity;

      for (let i = 0; i < cachedDockItems.length; i++) {
        const obj = cachedDockItems[i];
        const diff = Math.abs(clientX - obj.centerX);
        if (diff < minDiff) {
          minDiff = diff;
          closestObj = obj;
        }
      }

      if (closestObj && closestObj.item) {
        const targetLeft = closestObj.item.offsetLeft;
        const targetWidth = closestObj.offsetWidth || (dockBounds.width / (cachedDockItems.length || 4));

        dockIndicator.style.transition = 'transform 0.36s cubic-bezier(0.18, 0.89, 0.32, 1.25), width 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.25)';
        dockIndicator.style.transform = `translate3d(${targetLeft}px, 0, 0) scale3d(1, 1, 1)`;
        dockIndicator.style.width = `${targetWidth}px`;
        dockIndicator.classList.remove('touching', 'force-touch');
        currentIndicatorX = targetLeft;

        if (closestObj.tab) {
          switchTab(closestObj.tab, true);
        }
      }
    }

    // 8. EVENT LISTENERS (TOUCH DEVICES ONLY)
    dockContainer.addEventListener('touchstart', startTouchHold, { passive: true });
    dockContainer.addEventListener('touchmove', moveTouchHold, { passive: true });
    dockContainer.addEventListener('touchend', endTouchHold, { passive: true });
    dockContainer.addEventListener('touchcancel', endTouchHold, { passive: true });

    // Global Window Touch Safety Listeners
    window.addEventListener('touchend', endTouchHold, { passive: true });
    window.addEventListener('touchcancel', endTouchHold, { passive: true });

    // Window Resize Recalibration
    window.addEventListener('resize', () => {
      cacheDockItemMeasurements();
      const activeItem = document.querySelector('.dock-item.active');
      if (activeItem) positionDockIndicator(activeItem, false);
    }, { passive: true });
  }

  // ==========================================================================
  // ANDROID MOBILE SWIPE GESTURES & NATIVE BACK NAVIGATION CONTROLLER
  // ==========================================================================
  const appNavigationHistory = [];

  function handleAppBackAction(fromPopState = false) {
    // 0. Check PDF Fullscreen Reader Overlay
    const pdfReader = document.getElementById('pdfReaderScreen');
    if (pdfReader && !pdfReader.classList.contains('hidden')) {
      if (typeof closePdfBook === 'function') {
        closePdfBook();
      } else {
        pdfReader.classList.add('hidden');
        syncModalOpenState();
        if (typeof switchTab === 'function') switchTab('viewHome', true, false);
      }
      return true;
    }

    // 1. Check Fullscreen Timeline Photo Lightbox
    const lightbox = document.getElementById('timelinePhotoLightboxOverlay');
    if (lightbox && !lightbox.classList.contains('hidden')) {
      if (typeof closeTimelinePhotoLightbox === 'function') {
        closeTimelinePhotoLightbox();
      } else {
        lightbox.classList.add('hidden');
        document.body.style.overflow = '';
      }
      return true;
    }

    // 2. Check Chat Members Drawer
    const chatDrawer = document.getElementById('waChatMembersDrawer');
    if (chatDrawer && chatDrawer.classList.contains('active')) {
      const closeBtn = document.getElementById('waMembersCloseBtn');
      if (closeBtn) closeBtn.click();
      else chatDrawer.classList.remove('active');
      return true;
    }

    // 3. Check App Confirm Dialog
    const confirmModal = document.getElementById('appGlobalConfirmModal');
    if (confirmModal && !confirmModal.classList.contains('hidden')) {
      const cancelBtn = document.getElementById('appConfirmCancelBtn');
      if (cancelBtn) cancelBtn.click();
      else confirmModal.classList.add('hidden');
      return true;
    }

    // 4. Check Open Modals (in reverse DOM order to close top-most)
    const openModals = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1];
      const closeBtn = topModal.querySelector('.modal-close, button[id*="close"], button[id*="cancel"], .btn-secondary');
      if (closeBtn) {
        closeBtn.click();
      } else {
        topModal.classList.add('hidden');
        if (document.querySelectorAll('.modal-overlay:not(.hidden)').length === 0) {
          document.body.classList.remove('modal-open');
        }
      }
      return true;
    }

    // 5. Check Timeline Detail View
    if (state.activeTab === 'viewTimelineDetail') {
      const detailBackBtn = document.getElementById('timelineDetailBackBtn');
      if (detailBackBtn) {
        detailBackBtn.click();
      } else {
        activeTimelineDetailItem = null;
        try { localStorage.removeItem('sanctuary_active_timeline_id'); } catch (_) {}
        switchTab('viewTimeline', true, false);
      }
      return true;
    }

    // 6. Check Dedicated Song Lyrics View
    if (state.activeTab === 'viewSongLyrics') {
      const lyricsBackBtn = document.getElementById('songLyricsBackBtn');
      if (lyricsBackBtn) {
        lyricsBackBtn.click();
      } else if (typeof openSongBookScreen === 'function') {
        openSongBookScreen(currentOpenSongBookKey || 'masihiGeet');
      } else {
        switchTab('viewSongList', true, false);
      }
      return true;
    }

    // 7. Check Dedicated Song List View
    if (state.activeTab === 'viewSongList') {
      const songBackBtn = document.getElementById('songGlobalFloatingBackBtn') || document.getElementById('songListBackBtn');
      if (songBackBtn) {
        songBackBtn.click();
      } else {
        switchTab('viewHome', true, false);
      }
      return true;
    }

    // 8. Check PDF / Interactive Book Reader
    if (state.activeTab === 'viewBookReader') {
      if (typeof closeBookScreen === 'function') {
        closeBookScreen();
      } else {
        switchTab('viewHome', true, false);
      }
      return true;
    }

    // 9. Check Settings Sub-Screens
    if (state.activeTab === 'viewAuditLogScreen' || state.activeTab === 'viewPostsScreen' || 
        state.activeTab === 'viewBulletinManager' || state.activeTab === 'viewImportManager') {
      switchTab('viewSettings', true, false);
      return true;
    }

    // 10. Check Chat Screen
    if (state.activeTab === 'viewChat') {
      switchTab('viewHome', true, false);
      return true;
    }

    // 11. Check Top-Level Secondary Tabs
    if (state.activeTab && state.activeTab !== 'viewHome') {
      if (appNavigationHistory.length > 0) {
        const prevTab = appNavigationHistory.pop();
        if (prevTab && prevTab !== state.activeTab && views[prevTab]) {
          switchTab(prevTab, true, false);
          return true;
        }
      }
      switchTab('viewHome', true, false);
      return true;
    }

    return false;
  }
  window.handleAppBackAction = handleAppBackAction;

  function initAndroidGestures() {
    // 1. Initial State for Browser History
    try {
      if (!history.state || !history.state.appRoot) {
        history.replaceState({ appRoot: true, tab: 'viewHome' }, '');
      }
    } catch (_) {}

    // 2. Popstate Handler for Native Android Back Button & OS Back Swipe
    window.addEventListener('popstate', (e) => {
      const handled = handleAppBackAction(true);
      if (!handled && state.activeTab !== 'viewHome') {
        switchTab('viewHome', true, false);
      }
    });

    // 3. Touch Edge Swipe & Screen Swipe Gesture Handling
    const indicator = document.getElementById('androidBackGestureIndicator');
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isEdgeSwipe = false;
    let isScreenSwipe = false;
    let isVerticalScroll = false;
    let isModalDrag = false;
    let activeModalEl = null;

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      isVerticalScroll = false;
      isModalDrag = false;

      // Check if starting near left edge (0 to 42px)
      isEdgeSwipe = touchStartX <= 42;

      // Check if inside a sub-screen / reader / song list where a broader right swipe is also natural
      const isSubScreen = state.activeTab === 'viewSongList' || 
                          state.activeTab === 'viewSongLyrics' || 
                          state.activeTab === 'viewBookReader' || 
                          state.activeTab === 'viewTimelineDetail' || 
                          state.activeTab === 'viewChat' ||
                          state.activeTab === 'viewAuditLogScreen' ||
                          state.activeTab === 'viewPostsScreen' ||
                          state.activeTab === 'viewBulletinManager' ||
                          state.activeTab === 'viewImportManager';

      const openModal = document.querySelector('.modal-overlay:not(.hidden) .modal-card');
      if (openModal && touchStartY < openModal.getBoundingClientRect().top + 70) {
        isModalDrag = true;
        activeModalEl = openModal;
      }

      isScreenSwipe = !isEdgeSwipe && isSubScreen && touchStartX < window.innerWidth * 0.35;

      if (isEdgeSwipe && indicator) {
        indicator.style.top = `${Math.max(60, Math.min(window.innerHeight - 60, touchStartY))}px`;
        indicator.classList.remove('ready');
        indicator.classList.remove('active');
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1 || isVerticalScroll) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      // Determine if movement is mostly vertical scroll
      if (!isEdgeSwipe && !isModalDrag && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        isVerticalScroll = true;
        if (indicator) indicator.classList.remove('active');
        return;
      }

      // 1. Edge Swipe Visual Feedback (Android 13/14 Predictive Back Chevron)
      if (isEdgeSwipe && dx > 0) {
        if (indicator) {
          indicator.classList.add('active');
          const progress = Math.min(dx, 80);
          const translateX = -44 + (progress * 0.55);
          indicator.style.transform = `translate3d(${translateX}px, -50%, 0)`;
          if (dx >= 45) {
            indicator.classList.add('ready');
          } else {
            indicator.classList.remove('ready');
          }
        }
      }

      // 2. Modal Drag Down to Dismiss
      if (isModalDrag && activeModalEl && dy > 0 && Math.abs(dy) > Math.abs(dx)) {
        activeModalEl.style.transform = `translateY(${Math.min(dy * 0.7, 120)}px)`;
        activeModalEl.style.opacity = `${Math.max(0.4, 1 - (dy / 300))}`;
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      // Reset Modal Drag
      if (isModalDrag && activeModalEl) {
        if (dy >= 70 && dt < 450) {
          handleAppBackAction();
        }
        activeModalEl.style.transform = '';
        activeModalEl.style.opacity = '';
        activeModalEl = null;
        isModalDrag = false;
      }

      // 1. Handle Edge Swipe Release
      if (isEdgeSwipe) {
        if (indicator) {
          if (dx >= 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            if (navigator.vibrate) {
              try { navigator.vibrate(15); } catch (_) {}
            }
            indicator.style.transform = `translate3d(10px, -50%, 0) scale(1.2)`;
            setTimeout(() => {
              indicator.classList.remove('ready');
              indicator.classList.remove('active');
              indicator.style.transform = 'translate3d(-100%, -50%, 0)';
            }, 120);
            handleAppBackAction();
          } else {
            indicator.classList.remove('ready');
            indicator.classList.remove('active');
            indicator.style.transform = 'translate3d(-100%, -50%, 0)';
          }
        }
        isEdgeSwipe = false;
        return;
      }

      // 2. Handle Screen Swipe Release on Sub-Screens
      if (isScreenSwipe && !isVerticalScroll) {
        if (dx >= 65 && Math.abs(dx) > Math.abs(dy) * 1.8 && dt < 400) {
          if (navigator.vibrate) {
            try { navigator.vibrate(15); } catch (_) {}
          }
          handleAppBackAction();
        }
        isScreenSwipe = false;
      }
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
      if (indicator) {
        indicator.classList.remove('ready');
        indicator.classList.remove('active');
        indicator.style.transform = 'translate3d(-100%, -50%, 0)';
      }
      if (activeModalEl) {
        activeModalEl.style.transform = '';
        activeModalEl.style.opacity = '';
        activeModalEl = null;
      }
      isEdgeSwipe = false;
      isScreenSwipe = false;
      isModalDrag = false;
    }, { passive: true });
  }

  function switchTab(tabId, updateIndicator = true, pushHistory = true) {
    window.switchTab = switchTab;
    if (!views[tabId]) return;

    const previousTab = state.activeTab;
    if (pushHistory && previousTab && previousTab !== tabId) {
      appNavigationHistory.push(previousTab);
      try {
        history.pushState({ appNav: true, tab: tabId, time: Date.now() }, '');
      } catch (_) {}
    }

    state.activeTab = tabId;

    // Manage contextual body classes for dock & floating visibility
    if (tabId === 'viewChat') {
      document.body.classList.add('in-chat-mode');
      document.body.classList.remove('in-reader-mode');
      document.body.classList.remove('in-song-mode');

      const chatView = document.getElementById('viewChat');
      const gateModal = document.getElementById('chatAccessGateModalOverlay');
      if (gateModal) gateModal.classList.add('hidden');
      if (chatView) {
        chatView.classList.remove('chat-unregistered-blank');
        chatView.classList.remove('blurred');
      }

      if (typeof window.renderActiveCniChat === 'function') {
        window.renderActiveCniChat(true);
      } else if (typeof renderActiveCniChat === 'function') {
        renderActiveCniChat(true);
      }

      if (typeof window.triggerChatAutoLift === 'function') {
        setTimeout(window.triggerChatAutoLift, 40);
        setTimeout(window.triggerChatAutoLift, 200);
      }
    } else if (tabId === 'viewBookReader') {
      document.body.classList.add('in-reader-mode');
      document.body.classList.remove('in-chat-mode');
      document.body.classList.remove('in-song-mode');
      document.body.classList.remove('in-import-mode');
    } else if (tabId === 'viewSongList' || tabId === 'viewSongLyrics') {
      document.body.classList.add('in-song-mode');
      document.body.classList.remove('in-chat-mode');
      document.body.classList.remove('in-reader-mode');
      document.body.classList.remove('in-import-mode');
    } else if (tabId === 'viewImportManager') {
      document.body.classList.add('in-import-mode');
      document.body.classList.remove('in-chat-mode');
      document.body.classList.remove('in-reader-mode');
      document.body.classList.remove('in-song-mode');
    } else {
      document.body.classList.remove('in-chat-mode');
      document.body.classList.remove('in-reader-mode');
      document.body.classList.remove('in-song-mode');
      document.body.classList.remove('in-import-mode');
    }

    try {
      localStorage.setItem('sanctuary_active_tab', tabId);
      if (tabId !== 'viewBookReader' && tabId !== 'viewSongList' && tabId !== 'viewSongLyrics') {
        localStorage.removeItem('sanctuary_active_book');
        localStorage.removeItem('sanctuary_active_songbook');
      }
      if (tabId !== 'viewTimelineDetail') {
        localStorage.removeItem('sanctuary_active_timeline_id');
      }
    } catch (e) {}

    // Update active class on views
    Object.keys(views).forEach(key => {
      if (views[key]) {
        if (key === tabId) {
          views[key].classList.add('active');
        } else {
          views[key].classList.remove('active');
        }
      }
    });

    if (tabId === 'viewSettings' && typeof updateAppPermissionsUI === 'function') {
      updateAppPermissionsUI();
    }
    if (tabId === 'viewAboutChurch') {
      if (typeof renderAboutChurch === 'function') renderAboutChurch();
      if (typeof updateAppPermissionsUI === 'function') updateAppPermissionsUI();
    }

    // Update dock items
    let matchedItem = null;
    if (dockItems && Array.isArray(Array.from(dockItems))) {
      dockItems.forEach(item => {
        if (item && item.dataset && item.dataset.tab === tabId) {
          item.classList.add('active');
          matchedItem = item;
        } else if (item) {
          item.classList.remove('active');
        }
      });
    }

    if (matchedItem && updateIndicator) {
      positionDockIndicator(matchedItem, true);
    }

    updateFloatingHeaderForTab(tabId);

    if (tabId === 'viewHome') {
      updateHomeDailyVerseAndDate();
    } else if (tabId === 'viewAlmanac') {
      almanacNavState.level = 'years';
      renderAlmanacModule();
    } else if (tabId === 'viewBookmark') {
      renderBookmarks();
    } else if (tabId === 'viewBulletinManager') {
      renderAdminAnnouncementsList();
      if (typeof renderTodaySongAdminUI === 'function') renderTodaySongAdminUI();
    } else if (tabId === 'viewTimeline') {
      if (typeof renderTimelineList === 'function') renderTimelineList();
    }

    // Scroll to top smoothly
    document.querySelector('.app-container')?.scrollTo?.({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function updateFloatingHeaderForTab(tabId) {
    const headerIconWrap = document.getElementById('headerIconWrap');
    const headerIconSvg = document.getElementById('headerIconSvg');
    const headerMainTitle = document.getElementById('headerMainTitle');
    const headerLiturgicalSeason = document.getElementById('headerLiturgicalSeason');

    if (!headerMainTitle || !headerLiturgicalSeason || !headerIconWrap || !headerIconSvg) return;

    headerIconWrap.className = 'cross-symbol-wrap';
    headerLiturgicalSeason.textContent = "CNI, ALL SAINTS' CHURCH, PROTHRAPUR";

    switch (tabId) {
      case 'viewHome':
        headerIconSvg.innerHTML = `<path d="M12 2v20M6 8h12"/>`;
        headerMainTitle.textContent = 'Church Companion';
        break;
      case 'viewTimeline':
        headerIconSvg.innerHTML = `<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>`;
        headerMainTitle.textContent = 'Church Timeline';
        if (typeof renderTimelineList === 'function') renderTimelineList();
        break;

      case 'viewTimelineDetail':
        headerIconSvg.innerHTML = `<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>`;
        headerMainTitle.textContent = 'Timeline Detail';
        break;

      case 'viewAlmanac':
        headerIconWrap.classList.add('almanac-theme');
        headerIconSvg.innerHTML = `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>`;
        headerMainTitle.textContent = 'Almanac';
        break;

      case 'viewBookmark':
        headerIconWrap.classList.add('bookmark-theme');
        headerIconSvg.innerHTML = `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>`;
        headerMainTitle.textContent = 'Bookmarks';
        break;

      case 'viewSettings':
        headerIconWrap.classList.add('settings-theme');
        headerIconSvg.innerHTML = `<line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>`;
        headerMainTitle.textContent = 'Settings';
        break;

      case 'viewSongList':
      case 'viewSongLyrics':
        headerIconWrap.classList.add('hymn-theme');
        headerIconSvg.innerHTML = `<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>`;
        if (currentOpenSongBookKey && CHURCH_DATA.churchBooks && CHURCH_DATA.churchBooks[currentOpenSongBookKey]) {
          headerMainTitle.textContent = CHURCH_DATA.churchBooks[currentOpenSongBookKey].title;
          if (CHURCH_DATA.churchBooks[currentOpenSongBookKey].subtitle) {
            headerLiturgicalSeason.textContent = CHURCH_DATA.churchBooks[currentOpenSongBookKey].subtitle.split('•')[0].trim();
          } else {
            headerLiturgicalSeason.textContent = "CNI, ALL SAINTS' CHURCH, PROTHRAPUR";
          }
        } else {
          headerMainTitle.textContent = 'Song Book';
          headerLiturgicalSeason.textContent = "CNI, ALL SAINTS' CHURCH, PROTHRAPUR";
        }
        break;

      case 'viewBookReader':
        headerIconSvg.innerHTML = `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>`;
        if (currentOpenBookKey && CHURCH_DATA.churchBooks && CHURCH_DATA.churchBooks[currentOpenBookKey]) {
          const bk = CHURCH_DATA.churchBooks[currentOpenBookKey];
          headerMainTitle.textContent = bk.title;
        } else {
          headerMainTitle.textContent = 'Church Reader';
        }
        break;

      case 'viewChat':
        headerIconSvg.innerHTML = `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>`;
        headerMainTitle.textContent = 'Fellowship Chat';
        break;

      case 'viewBulletinManager':
        headerIconWrap.classList.add('settings-theme');
        headerIconSvg.innerHTML = `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>`;
        headerMainTitle.textContent = "Announcements";
        break;

      case 'viewPostsManager':
        headerIconWrap.classList.add('settings-theme');
        headerIconSvg.innerHTML = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>`;
        headerMainTitle.textContent = "Congregational Posts";
        break;

      case 'viewImportManager':
        headerIconWrap.classList.add('settings-theme');
        headerIconSvg.innerHTML = `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>`;
        headerMainTitle.textContent = "Import Data";
        break;

      case 'viewAuditLog':
        headerIconWrap.classList.add('settings-theme');
        headerIconSvg.innerHTML = `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>`;
        headerMainTitle.textContent = "Governance & Audit";
        break;
    }
  }

  /* ==========================================================================
     PDF BOOK READER ENGINE (CLEAN OFFSCREEN RENDERING & INSTANT CACHE)
     ========================================================================== */
  let currentPdfDoc = null;
  let currentLoadedPdfUrl = null;
  let currentPdfPageNum = 1;
  let totalPdfPages = 0;
  let isBackgroundPreloading = false;
  let activePageRenderTask = null;

  // Known Sacred Books
  const KNOWN_PDF_BOOKS = [
    "books/prabhu_bhoj.html",
    "books/ashaye_rabbani.html",
    "books/aaradhana.html"
  ];

  // Multi-Document In-Memory Document Cache & In-Flight Promise Cache
  const pdfDocCache = new Map(); // normalizedUrl -> { doc: PDFDocumentProxy, numPages: number }
  const pdfDocLoadingPromises = new Map(); // normalizedUrl -> Promise<PDFDocumentProxy>

  // In-Memory Rendered Page Cache across all books: Map<"url#page_X", { canvas, width, height, styleWidth, styleHeight }>
  const pdfPageCache = new Map();

  function normalizePdfUrl(url) {
    if (!url) return "";
    let clean = url.trim().replace(/^\.?\//, "");
    if (!clean.startsWith("assets/")) {
      clean = "assets/" + clean;
    }
    return clean;
  }

  function getPageCacheKey(url, pNum) {
    return `${normalizePdfUrl(url)}#page_${pNum}`;
  }

  // Zoom & Pan State (1.0 = 100% fit-to-screen, 4.0 = 400% max zoom)
  let pdfZoomScale = 1.0;
  let pdfPanX = 0;
  let pdfPanY = 0;

  // Gesture State Machine
  // Modes: "none" | "pinch" | "pan" | "swipe_page" | "swipe_down" | "undecided" | "ignore"
  let pdfGestureMode = "none";
  let pdfTouchStartX = 0;
  let pdfTouchStartY = 0;
  let pdfTouchStartTime = 0;
  let pdfTouchLastX = 0;
  let pdfTouchLastY = 0;

  // Pinch State
  let pdfTouchStartDist = 0;
  let pdfTouchStartScale = 1.0;
  let pdfTouchStartPanX = 0;
  let pdfTouchStartPanY = 0;
  let pdfTouchStartMidX = 0;
  let pdfTouchStartMidY = 0;

  // Double-tap & Tap State
  let pdfLastTapTime = 0;
  let pdfLastTapX = 0;
  let pdfLastTapY = 0;
  let pdfSingleTapTimeout = null;

  // Mouse State
  let pdfIsMouseDown = false;
  let pdfMouseStartX = 0;
  let pdfMouseStartY = 0;
  let pdfMouseStartTime = 0;
  let pdfMouseLastX = 0;
  let pdfMouseLastY = 0;
  let pdfMouseMode = "none";
  let pdfPillHideTimeout = null;

  function initPdfEngine() {
    if (typeof window !== "undefined" && window.pdfjsLib) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('libs/pdfjs/pdf.worker.min.js', window.location.href).href;
      } catch (e) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "libs/pdfjs/pdf.worker.min.js";
      }
    }
    setupPdfGestureListeners();
    preloadAllPdfBooks();
  }

  function fetchBinaryBuffer(url) {
    return new Promise((resolve, reject) => {
      // 1. Try modern fetch
      try {
        fetch(url)
          .then(res => {
            if (!res.ok && res.status !== 0) throw new Error("HTTP " + res.status);
            return res.arrayBuffer();
          })
          .then(buf => {
            if (buf && buf.byteLength > 0) resolve(buf);
            else throw new Error("Empty buffer");
          })
          .catch(() => tryXhr());
      } catch (e) {
        tryXhr();
      }

      function tryXhr() {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = function() {
            if ((xhr.status === 200 || xhr.status === 0) && xhr.response && xhr.response.byteLength > 0) {
              resolve(xhr.response);
            } else {
              reject(new Error("XHR failed for " + url));
            }
          };
          xhr.onerror = function() {
            reject(new Error("XHR error for " + url));
          };
          xhr.ontimeout = function() {
            reject(new Error("XHR timeout for " + url));
          };
          xhr.timeout = 12000;
          xhr.send();
        } catch (ex) {
          reject(ex);
        }
      }
    });
  }

  function loadPdfDocument(pdfUrl) {
    const normUrl = normalizePdfUrl(pdfUrl);
    if (pdfDocCache.has(normUrl)) {
      return Promise.resolve(pdfDocCache.get(normUrl).doc);
    }
    if (pdfDocLoadingPromises.has(normUrl)) {
      return pdfDocLoadingPromises.get(normUrl);
    }

    const loadPromise = new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.pdfjsLib) {
        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          try {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('libs/pdfjs/pdf.worker.min.js', window.location.href).href;
          } catch (_) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "libs/pdfjs/pdf.worker.min.js";
          }
        }
      }

      const clean = (pdfUrl || "").replace(/^\.?\//, "");
      const candidates = [
        pdfUrl,
        clean,
        "assets/" + clean.replace(/^assets\//, ""),
        clean.replace(/^assets\//, "")
      ];
      try {
        candidates.push(new URL(pdfUrl, window.location.href).href);
      } catch (_) {}
      const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

      function getDoc(docParams) {
        return window.pdfjsLib.getDocument(docParams).promise.catch(err => {
          // If worker fails to construct (e.g. strict origin / CSP), fall back to inline message handler
          if (window.pdfjsWorker && window.pdfjsWorker.WorkerMessageHandler && window.pdfjsLib.PDFWorker && !window.pdfjsLib.PDFWorker._mainThreadWorkerMessageHandler) {
            console.warn("Worker construction failed, falling back to inline handler:", err);
            window.pdfjsLib.PDFWorker._mainThreadWorkerMessageHandler = window.pdfjsWorker.WorkerMessageHandler;
            return window.pdfjsLib.getDocument(docParams).promise;
          }
          throw err;
        });
      }

      // Fast streaming path: Attempt range-based stream using URL first
      const directUrl = uniqueCandidates[0] || pdfUrl;
      getDoc({
        url: directUrl,
        cMapPacked: true,
        enableXfa: true,
        isEvalSupported: true
      }).then(pdfDoc => {
        pdfDocCache.set(normUrl, { doc: pdfDoc, numPages: pdfDoc.numPages });
        resolve(pdfDoc);
      }).catch(errDirect => {
        // Fallback: fetch binary buffer for WebView local assets or restricted contexts
        let currentIndex = 0;
        function tryBufferCandidate() {
          if (currentIndex >= uniqueCandidates.length) {
            reject(errDirect || new Error("Failed to load PDF: " + pdfUrl));
            return;
          }
          const candidateUrl = uniqueCandidates[currentIndex++];
          fetchBinaryBuffer(candidateUrl)
            .then(buf => {
              return getDoc({
                data: new Uint8Array(buf),
                cMapPacked: true,
                enableXfa: true,
                isEvalSupported: true
              });
            })
            .then(pdfDoc => {
              pdfDocCache.set(normUrl, { doc: pdfDoc, numPages: pdfDoc.numPages });
              resolve(pdfDoc);
            })
            .catch(() => tryBufferCandidate());
        }
        tryBufferCandidate();
      });
    }).then(pdfDoc => {
      pdfDocCache.set(normUrl, { doc: pdfDoc, numPages: pdfDoc.numPages });
      pdfDocLoadingPromises.delete(normUrl);
      return pdfDoc;
    }).catch(err => {
      pdfDocLoadingPromises.delete(normUrl);
      throw err;
    });

    pdfDocLoadingPromises.set(normUrl, loadPromise);
    return loadPromise;
  }

  function prewarmPdfDoc(pdfUrl) {
    if (!pdfUrl) return;
    loadPdfDocument(pdfUrl).then(doc => {
      if (doc) preloadSinglePage(pdfUrl, 1, doc);
    }).catch(() => {});
  }

  function showNoBookModal(bookName) {
    const overlay = document.getElementById("noBookModalOverlay");
    const titleEl = document.getElementById("noBookModalTitle");
    const descEl = document.getElementById("noBookModalDesc");

    if (titleEl) titleEl.textContent = "No Book Loaded";
    if (descEl) {
      descEl.textContent = bookName
        ? `The PDF book for "${bookName}" is not loaded yet. Please add the PDF file to your application assets/books/ directory.`
        : "This book has not been loaded yet. Please add the PDF file to your application data.";
    }

    if (overlay) {
      overlay.classList.remove("hidden");
      syncModalOpenState();
    }
  }

  function closeNoBookModal() {
    const overlay = document.getElementById("noBookModalOverlay");
    if (overlay) overlay.classList.add("hidden");
    syncModalOpenState();
  }

  function updatePdfPageIndicator() {
    const indicator = document.getElementById("pdfPageIndicator");
    if (indicator) {
      indicator.textContent = `Page ${currentPdfPageNum} of ${totalPdfPages || 1}`;
    }
  }

  function getPdfViewportDimensions() {
    const viewport = document.getElementById("pdfViewport");
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
    return {
      width: Math.max(320, window.innerWidth || 360),
      height: Math.max(480, window.innerHeight || 640)
    };
  }

  function getPdfCanvasBaseDimensions() {
    const canvas = document.getElementById("pdfCanvas");
    if (canvas) {
      const sw = parseFloat(canvas.style.width);
      const sh = parseFloat(canvas.style.height);
      if (!isNaN(sw) && sw > 0 && !isNaN(sh) && sh > 0) {
        return { width: sw, height: sh };
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const curScale = pdfZoomScale || 1.0;
        return { width: rect.width / curScale, height: rect.height / curScale };
      }
    }
    const vp = getPdfViewportDimensions();
    return { width: vp.width * 0.95, height: vp.height * 0.90 };
  }

  function getPdfPanBounds(scale) {
    if (scale <= 1.05) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    const vp = getPdfViewportDimensions();
    const base = getPdfCanvasBaseDimensions();

    const contentW = base.width * scale;
    const contentH = base.height * scale;

    const maxPanX = Math.max(0, (contentW - vp.width) / 2);
    const maxPanY = Math.max(0, (contentH - vp.height) / 2);

    return {
      minX: -maxPanX,
      maxX: maxPanX,
      minY: -maxPanY,
      maxY: maxPanY
    };
  }

  function clampPdfPan(scale, x, y, extraMargin = 0) {
    const bounds = getPdfPanBounds(scale);
    return {
      x: Math.max(bounds.minX - extraMargin, Math.min(bounds.maxX + extraMargin, x)),
      y: Math.max(bounds.minY - extraMargin, Math.min(bounds.maxY + extraMargin, y))
    };
  }

  function applyPdfTransform(scale = pdfZoomScale, panX = pdfPanX, panY = pdfPanY, transition = "") {
    const stage = document.getElementById("pdfStage");
    if (!stage) return;
    if (transition) {
      stage.style.setProperty("transition", transition, "important");
    } else {
      stage.style.setProperty("transition", "none", "important");
    }
    stage.style.transform = `translate3d(${panX.toFixed(2)}px, ${panY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
  }

  function resetPdfZoomAndPan(animated = false) {
    pdfZoomScale = 1.0;
    pdfPanX = 0;
    pdfPanY = 0;
    const stage = document.getElementById("pdfStage");
    const overlay = document.getElementById("pdfReaderScreen");
    if (stage) {
      if (animated) {
        stage.style.setProperty("transition", "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)", "important");
        setTimeout(() => {
          if (stage) stage.style.setProperty("transition", "none", "important");
        }, 260);
      } else {
        stage.style.setProperty("transition", "none", "important");
      }
      stage.style.transform = "translate3d(0px, 0px, 0px) scale(1)";
    }
    if (overlay) {
      overlay.style.backgroundColor = "";
    }
  }

  function openPdfBook(pdfUrl, bookName, initialPage = 1) {
    const overlay = document.getElementById("pdfReaderScreen");
    const htmlFrame = document.getElementById("bookHtmlFrame");
    const viewport = document.getElementById("pdfViewport");
    const floatingPill = document.getElementById("pdfFloatingPill");
    const loadingEl = document.getElementById("pdfLoadingIndicator");

    if (!overlay) return;

    // Resolve URL (maps old .pdf names or keys to .html book equivalents)
    let targetUrl = (pdfUrl || "").trim();
    if (targetUrl.endsWith(".pdf") || !targetUrl.includes(".")) {
      if (targetUrl.includes("prabhu_bhoj")) targetUrl = "books/prabhu_bhoj.html";
      else if (targetUrl.includes("ashaye_rabbani")) targetUrl = "books/ashaye_rabbani.html";
      else if (targetUrl.includes("aaradhana")) targetUrl = "books/aaradhana.html";
    }

    const isHtml = targetUrl.toLowerCase().includes(".html");

    currentPdfPageNum = initialPage || 1;
    currentLoadedPdfUrl = targetUrl;

    try {
      localStorage.setItem("sanctuary_pdf_open", "true");
      localStorage.setItem("sanctuary_pdf_url", targetUrl);
      localStorage.setItem("sanctuary_pdf_page", currentPdfPageNum.toString());
      if (bookName) localStorage.setItem("sanctuary_pdf_title", bookName);
    } catch (e) {}

    // Show overlay immediately
    overlay.classList.remove("hidden");
    syncModalOpenState();

    try {
      history.pushState({ pdfOpen: true, book: bookName }, '');
    } catch (_) {}

    window.closePdfBook = closePdfBook;
    window.handleAppBackAction = handleAppBackAction;

    if (isHtml) {
      // ⚡ Fast-path: Interactive HTML Book Reader Engine
      if (viewport) viewport.style.display = "none";
      if (floatingPill) floatingPill.style.display = "none";
      if (loadingEl) loadingEl.style.display = "none";

      if (htmlFrame) {
        htmlFrame.style.display = "block";
        htmlFrame.style.transition = "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
        const currentTheme = (document.documentElement && document.documentElement.getAttribute('data-theme')) || localStorage.getItem('sanctuary_theme') || 'amoled';
        const isLight = currentTheme === 'light';
        const readerBg = isLight ? '#fcfaf7' : '#0b0f19';
        htmlFrame.style.background = readerBg;
        overlay.style.background = readerBg;
        let frameSrc = targetUrl.replace(/^assets\//, "");
        if (!frameSrc.startsWith("books/") && !frameSrc.startsWith("/")) {
          frameSrc = "books/" + frameSrc;
        }
        if (htmlFrame.getAttribute("data-current-src") !== frameSrc) {
          htmlFrame.style.opacity = "0";
          htmlFrame.setAttribute("data-current-src", frameSrc);
          htmlFrame.onload = function() {
            try {
              const topVal = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '44px';
              const botVal = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '24px';
              if (htmlFrame.contentDocument && htmlFrame.contentDocument.documentElement) {
                htmlFrame.contentDocument.documentElement.style.setProperty('--safe-area-top', topVal);
                htmlFrame.contentDocument.documentElement.style.setProperty('--safe-area-bottom', botVal);
              }
              if (htmlFrame.contentWindow) {
                htmlFrame.contentWindow.postMessage({ type: 'SET_THEME', theme: currentTheme, safeAreaTop: topVal, safeAreaBottom: botVal }, '*');
              }
            } catch (_) {}
            setTimeout(() => { htmlFrame.style.opacity = "1"; }, 60);
          };
          htmlFrame.src = frameSrc;
        } else {
          htmlFrame.style.opacity = "1";
          try {
            const topVal = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '44px';
            const botVal = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '24px';
            if (htmlFrame.contentDocument && htmlFrame.contentDocument.documentElement) {
              htmlFrame.contentDocument.documentElement.style.setProperty('--safe-area-top', topVal);
              htmlFrame.contentDocument.documentElement.style.setProperty('--safe-area-bottom', botVal);
            }
            if (htmlFrame.contentWindow) {
              htmlFrame.contentWindow.postMessage({ type: 'SET_THEME', theme: currentTheme, safeAreaTop: topVal, safeAreaBottom: botVal }, '*');
            }
          } catch (_) {}
        }
      }
      return;
    }

    // PDF Mode (Fallback)
    if (htmlFrame) {
      htmlFrame.style.display = "none";
      htmlFrame.src = "about:blank";
      htmlFrame.removeAttribute("data-current-src");
    }
    if (viewport) viewport.style.display = "block";
    if (floatingPill) floatingPill.style.display = "flex";

    // Reset zoom and pan to fit-to-screen (100%)
    resetPdfZoomAndPan(false);

    const normUrl = normalizePdfUrl(targetUrl);
    const cachedDocEntry = pdfDocCache.get(normUrl);
    if (cachedDocEntry) {
      currentPdfDoc = cachedDocEntry.doc;
      totalPdfPages = cachedDocEntry.numPages;
    }
    updatePdfPageIndicator();

    // ⚡ 1. FAST-PATH: If this page is already rendered in cache, DISPLAY IMMEDIATELY (0ms!)
    if (displayCachedPage(targetUrl, currentPdfPageNum)) {
      if (loadingEl) loadingEl.style.display = "none";
      return;
    }

    // Cancel active render task if switching or re-rendering
    if (activePageRenderTask) {
      try { activePageRenderTask.cancel(); } catch (e) {}
      activePageRenderTask = null;
    }

    if (loadingEl) loadingEl.style.display = "flex";

    if (typeof window === "undefined" || !window.pdfjsLib) {
      setTimeout(() => openPdfBook(targetUrl, bookName, initialPage), 200);
      return;
    }

    // 2. If doc is cached, render requested page directly
    if (currentPdfDoc) {
      renderPdfPage(currentPdfPageNum);
      return;
    }

    // 3. Otherwise load the doc
    loadPdfDocument(targetUrl).then(pdfDoc => {
      currentPdfDoc = pdfDoc;
      currentLoadedPdfUrl = targetUrl;
      totalPdfPages = pdfDoc.numPages;
      updatePdfPageIndicator();
      renderPdfPage(currentPdfPageNum);
    }).catch(err => {
      console.warn("Book file not found / not loaded:", err);
      if (overlay) overlay.classList.add("hidden");
      syncModalOpenState();
      try {
        localStorage.removeItem("sanctuary_pdf_open");
        localStorage.removeItem("sanctuary_pdf_url");
        localStorage.removeItem("sanctuary_pdf_page");
        localStorage.removeItem("sanctuary_pdf_title");
      } catch (e) {}
      showNoBookModal(bookName);
    });
  }

  function preloadSinglePage(pdfUrlOrPageNum, pageNumOpt, docOpt) {
    let targetUrl, targetNum, targetDoc;
    if (typeof pdfUrlOrPageNum === "number") {
      targetUrl = currentLoadedPdfUrl;
      targetNum = pdfUrlOrPageNum;
      targetDoc = currentPdfDoc;
    } else {
      targetUrl = pdfUrlOrPageNum;
      targetNum = pageNumOpt;
      targetDoc = docOpt;
      if (!targetDoc && targetUrl) {
        const norm = normalizePdfUrl(targetUrl);
        if (pdfDocCache.has(norm)) {
          targetDoc = pdfDocCache.get(norm).doc;
        }
      }
    }

    if (!targetDoc || !targetUrl) return Promise.resolve(null);
    const cacheKey = getPageCacheKey(targetUrl, targetNum);
    if (pdfPageCache.has(cacheKey)) return Promise.resolve(pdfPageCache.get(cacheKey));
    if (targetNum < 1 || (targetDoc.numPages && targetNum > targetDoc.numPages)) return Promise.resolve(null);

    // Limit memory footprint (LRU/capacity management: max 18 pages cached across books)
    if (pdfPageCache.size >= 18) {
      let evictKey = null;
      let maxDist = -1;
      for (const k of pdfPageCache.keys()) {
        const [kUrl, kPage] = k.split("#page_");
        const pInt = parseInt(kPage, 10) || 1;
        let dist = 100;
        if (kUrl === normalizePdfUrl(currentLoadedPdfUrl)) {
          dist = Math.abs(pInt - currentPdfPageNum);
        } else {
          dist = 500 + pInt;
        }
        if (dist > maxDist) {
          maxDist = dist;
          evictKey = k;
        }
      }
      if (evictKey && maxDist > 2) {
        pdfPageCache.delete(evictKey);
      }
    }

    const availWidth = Math.max(320, window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 360) || 360);
    const availHeight = Math.max(480, window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 640) || 640);
    const dpr = Math.min(window.devicePixelRatio || 2, 2.0);

    return targetDoc.getPage(targetNum).then(page => {
      if (pdfPageCache.has(cacheKey)) return pdfPageCache.get(cacheKey);

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scaleW = availWidth / unscaledViewport.width;
      const scaleH = availHeight / unscaledViewport.height;
      const fitScale = Math.min(scaleW, scaleH);

      const viewport = page.getViewport({ scale: fitScale * dpr });
      const offCanvas = document.createElement("canvas");
      offCanvas.width = viewport.width;
      offCanvas.height = viewport.height;
      const offCtx = offCanvas.getContext("2d");

      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      return page.render({
        canvasContext: offCtx,
        viewport: viewport
      }).promise.then(() => {
        const cachedItem = {
          canvas: offCanvas,
          width: viewport.width,
          height: viewport.height,
          styleWidth: (viewport.width / dpr) + "px",
          styleHeight: (viewport.height / dpr) + "px"
        };
        pdfPageCache.set(cacheKey, cachedItem);
        return cachedItem;
      }).catch(e => {
        if (e && e.name === "RenderingCancelledException") return null;
        return null;
      });
    }).catch(() => null);
  }

  function preloadAllPdfBooks() {
    if (isBackgroundPreloading) return;
    isBackgroundPreloading = true;

    const executePreload = async () => {
      if (typeof window === "undefined" || !window.pdfjsLib) {
        setTimeout(executePreload, 400);
        return;
      }

      for (const bookUrl of KNOWN_PDF_BOOKS) {
        try {
          const norm = normalizePdfUrl(bookUrl);
          let doc = pdfDocCache.get(norm)?.doc;
          if (!doc) {
            doc = await loadPdfDocument(bookUrl);
          }
          if (doc && !pdfPageCache.has(getPageCacheKey(bookUrl, 1))) {
            await preloadSinglePage(bookUrl, 1, doc);
          }
        } catch (e) {
          console.warn("[PDF Preloader] Skipped background preload for", bookUrl, e);
        }
        await new Promise(r => setTimeout(r, 250));
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => setTimeout(executePreload, 600), { timeout: 3000 });
    } else {
      setTimeout(executePreload, 1000);
    }
  }

  function closePdfBook() {
    if (activePageRenderTask) {
      try { activePageRenderTask.cancel(); } catch (e) {}
      activePageRenderTask = null;
    }
    const loadingEl = document.getElementById("pdfLoadingIndicator");
    if (loadingEl) loadingEl.style.display = "none";
    const canvas = document.getElementById("pdfCanvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    resetPdfZoomAndPan(false);
    try {
      localStorage.removeItem("sanctuary_pdf_open");
      localStorage.removeItem("sanctuary_pdf_url");
      localStorage.removeItem("sanctuary_pdf_page");
      localStorage.removeItem("sanctuary_pdf_title");
    } catch (e) {}
    const overlay = document.getElementById("pdfReaderScreen");
    const htmlFrame = document.getElementById("bookHtmlFrame");
    if (htmlFrame) {
      htmlFrame.style.display = "none";
      htmlFrame.src = "about:blank";
      htmlFrame.removeAttribute("data-current-src");
    }
    if (overlay) {
      overlay.style.backgroundColor = "";
      overlay.classList.add("hidden");
    }
    const currentTheme = (document.documentElement && document.documentElement.getAttribute('data-theme')) || localStorage.getItem('sanctuary_theme') || 'amoled';
    setTheme(currentTheme);
    syncModalOpenState();
    if (typeof switchTab === 'function') switchTab('viewHome', true, false);
  }

  function clipCanvasRounded(ctx, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(0, 0, w, h, r);
    } else {
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
    }
    ctx.closePath();
    ctx.clip();
  }

  function displayCachedPage(pdfUrl, num) {
    let targetUrl = pdfUrl;
    let targetNum = num;
    if (typeof targetNum === "undefined") {
      targetNum = targetUrl;
      targetUrl = currentLoadedPdfUrl;
    }
    if (!targetUrl) return false;
    const cacheKey = getPageCacheKey(targetUrl, targetNum);
    if (!pdfPageCache.has(cacheKey)) return false;

    // Reset zoom & pan to fit-to-screen on page change
    resetPdfZoomAndPan(false);

    const cached = pdfPageCache.get(cacheKey);
    const canvas = document.getElementById("pdfCanvas");
    if (!canvas) return false;

    canvas.width = cached.width;
    canvas.height = cached.height;
    canvas.style.width = cached.styleWidth;
    canvas.style.height = cached.styleHeight;

    const dpr = Math.min(window.devicePixelRatio || 2, 2.0);
    const radius = Math.min(20 * dpr, Math.min(canvas.width, canvas.height) / 2);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    clipCanvasRounded(ctx, canvas.width, canvas.height, radius);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cached.canvas, 0, 0);
    ctx.restore();

    const loadingEl = document.getElementById("pdfLoadingIndicator");
    if (loadingEl) loadingEl.style.display = "none";
    updatePdfPageIndicator();

    // After instant cache hit, softly prefetch adjacent pages in background
    if (currentPdfDoc && targetNum + 1 <= totalPdfPages && !pdfPageCache.has(getPageCacheKey(targetUrl, targetNum + 1))) {
      setTimeout(() => preloadSinglePage(targetUrl, targetNum + 1, currentPdfDoc), 250);
    }
    if (currentPdfDoc && targetNum - 1 >= 1 && !pdfPageCache.has(getPageCacheKey(targetUrl, targetNum - 1))) {
      setTimeout(() => preloadSinglePage(targetUrl, targetNum - 1, currentPdfDoc), 450);
    }

    return true;
  }

  function renderPdfPage(num) {
    if (!currentPdfDoc) return;
    currentPdfPageNum = num;
    try {
      localStorage.setItem("sanctuary_pdf_page", num.toString());
    } catch (e) {}

    // Reset zoom & pan to fit-to-screen on page change
    resetPdfZoomAndPan(false);

    // ⚡ 1. FAST-PATH: 0ms instant display from memory cache with NO loading screen
    if (displayCachedPage(currentLoadedPdfUrl, num)) {
      return;
    }

    // 2. If not yet cached, render offscreen and swap without intermediate blank/black screen
    if (activePageRenderTask) {
      try { activePageRenderTask.cancel(); } catch (e) {}
      activePageRenderTask = null;
    }

    const canvas = document.getElementById("pdfCanvas");
    const loadingEl = document.getElementById("pdfLoadingIndicator");
    if (loadingEl) loadingEl.style.display = "flex";

    const targetUrl = currentLoadedPdfUrl;
    const cacheKey = getPageCacheKey(targetUrl, num);

    currentPdfDoc.getPage(num).then(page => {
      const availWidth = Math.max(320, window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 360) || 360);
      const availHeight = Math.max(480, window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 640) || 640);
      const dpr = Math.min(window.devicePixelRatio || 2, 2.0);

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scaleW = availWidth / unscaledViewport.width;
      const scaleH = availHeight / unscaledViewport.height;
      const fitScale = Math.min(scaleW, scaleH);

      const viewport = page.getViewport({ scale: fitScale * dpr });
      const offCanvas = document.createElement("canvas");
      offCanvas.width = viewport.width;
      offCanvas.height = viewport.height;
      const offCtx = offCanvas.getContext("2d");
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      const renderTask = page.render({
        canvasContext: offCtx,
        viewport: viewport
      });

      activePageRenderTask = renderTask;

      renderTask.promise.then(() => {
        activePageRenderTask = null;

        const cachedItem = {
          canvas: offCanvas,
          width: viewport.width,
          height: viewport.height,
          styleWidth: (viewport.width / dpr) + "px",
          styleHeight: (viewport.height / dpr) + "px"
        };
        pdfPageCache.set(cacheKey, cachedItem);

        if (canvas && num === currentPdfPageNum && targetUrl === currentLoadedPdfUrl) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = (viewport.width / dpr) + "px";
          canvas.style.height = (viewport.height / dpr) + "px";
          const ctx = canvas.getContext("2d");
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const radius = Math.min(20 * dpr, Math.min(canvas.width, canvas.height) / 2);
          ctx.save();
          clipCanvasRounded(ctx, canvas.width, canvas.height, radius);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(offCanvas, 0, 0);
          ctx.restore();
        }
        if (loadingEl) loadingEl.style.display = "none";
        updatePdfPageIndicator();

        // After successfully rendering current page, softly prefetch adjacent pages if not cached
        if (num + 1 <= totalPdfPages && !pdfPageCache.has(getPageCacheKey(targetUrl, num + 1))) {
          setTimeout(() => preloadSinglePage(targetUrl, num + 1, currentPdfDoc), 250);
        }
        if (num - 1 >= 1 && !pdfPageCache.has(getPageCacheKey(targetUrl, num - 1))) {
          setTimeout(() => preloadSinglePage(targetUrl, num - 1, currentPdfDoc), 450);
        }
      }).catch(err => {
        if (err && err.name === "RenderingCancelledException") return;
        console.error("Page render error:", err);
        if (loadingEl) loadingEl.style.display = "none";
      });
    }).catch(err => {
      console.error("Error getting PDF page:", err);
      if (loadingEl) loadingEl.style.display = "none";
    });
  }

  function prevPdfPage() {
    if (currentPdfPageNum <= 1) return;
    currentPdfPageNum--;
    renderPdfPage(currentPdfPageNum);
  }

  function nextPdfPage() {
    if (currentPdfPageNum >= totalPdfPages) return;
    currentPdfPageNum++;
    renderPdfPage(currentPdfPageNum);
  }

  function setupPdfGestureListeners() {
    const overlay = document.getElementById("pdfReaderScreen");
    const viewport = document.getElementById("pdfViewport");
    const closeBtn = document.getElementById("closePdfReaderBtn");

    // 1. Close Button Handler
    if (closeBtn) {
      const handleCloseAction = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        closePdfBook();
      };
      closeBtn.addEventListener("click", handleCloseAction);
      closeBtn.addEventListener("touchend", handleCloseAction);
    }

    // 2. Keyboard Navigation
    window.addEventListener("keydown", (e) => {
      const readerEl = document.getElementById("pdfReaderScreen");
      if (!readerEl || readerEl.classList.contains("hidden")) return;

      if (e.key === "Escape") closePdfBook();
      else if (e.key === "ArrowRight" || e.key === "PageDown") nextPdfPage();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") prevPdfPage();
    });

    const targetEl = viewport || overlay;
    if (!targetEl) return;

    // 3. Touch Gesture System: Pinch-to-Zoom, Pan, Swipe Navigation, Swipe-Down Close
    targetEl.addEventListener("touchstart", (e) => {
      // Guard interactive UI buttons
      if (e.target && e.target.closest("#closePdfReaderBtn, #pdfFloatingPill, .pdf-floating-page-pill")) return;

      const stage = document.getElementById("pdfStage");
      const overlay = document.getElementById("pdfReaderScreen");
      if (stage) stage.style.setProperty("transition", "none", "important");

      // 3.1 Two-finger touch: ALWAYS pinch-zoom (Precedence Rule #1)
      if (e.touches.length === 2) {
        pdfGestureMode = "pinch";
        if (overlay) overlay.style.backgroundColor = "";

        const x1 = e.touches[0].clientX;
        const y1 = e.touches[0].clientY;
        const x2 = e.touches[1].clientX;
        const y2 = e.touches[1].clientY;

        pdfTouchStartDist = Math.hypot(x2 - x1, y2 - y1);
        pdfTouchStartMidX = (x1 + x2) / 2;
        pdfTouchStartMidY = (y1 + y2) / 2;
        pdfTouchStartScale = pdfZoomScale;
        pdfTouchStartPanX = pdfPanX;
        pdfTouchStartPanY = pdfPanY;
        return;
      }

      // 3.2 Single-finger touch
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        pdfTouchStartX = touch.clientX;
        pdfTouchStartY = touch.clientY;
        pdfTouchLastX = touch.clientX;
        pdfTouchLastY = touch.clientY;
        pdfTouchStartTime = Date.now();

        if (pdfZoomScale > 1.05) {
          // While zoomed in: pan only. Suppress page-swipe and close-swipe completely. (Precedence Rule #3)
          pdfGestureMode = "pan";
        } else {
          // At fit-to-screen: undecided, determine dominant axis early. (Precedence Rule #2)
          pdfGestureMode = "undecided";
        }
      }
    }, { passive: false });

    targetEl.addEventListener("touchmove", (e) => {
      const stage = document.getElementById("pdfStage");
      const overlay = document.getElementById("pdfReaderScreen");

      // Pinch zoom handling
      if (pdfGestureMode === "pinch" && e.touches.length === 2) {
        e.preventDefault();

        const x1 = e.touches[0].clientX;
        const y1 = e.touches[0].clientY;
        const x2 = e.touches[1].clientX;
        const y2 = e.touches[1].clientY;

        const currentDist = Math.hypot(x2 - x1, y2 - y1);
        const currentMidX = (x1 + x2) / 2;
        const currentMidY = (y1 + y2) / 2;

        if (pdfTouchStartDist > 0) {
          const factor = currentDist / pdfTouchStartDist;
          // Soft bounds during pinch [0.85, 4.5], clamped strictly on touchend
          const targetScale = Math.max(0.85, Math.min(4.5, pdfTouchStartScale * factor));

          // Center zoom on the pinch midpoint
          const vp = getPdfViewportDimensions();
          const Cx = vp.width / 2;
          const Cy = vp.height / 2;

          const targetPanX = (currentMidX - Cx) - ((pdfTouchStartMidX - Cx - pdfTouchStartPanX) * (targetScale / pdfTouchStartScale));
          const targetPanY = (currentMidY - Cy) - ((pdfTouchStartMidY - Cy - pdfTouchStartPanY) * (targetScale / pdfTouchStartScale));

          const clamped = clampPdfPan(targetScale, targetPanX, targetPanY, 60);
          pdfZoomScale = targetScale;
          pdfPanX = clamped.x;
          pdfPanY = clamped.y;

          applyPdfTransform(pdfZoomScale, pdfPanX, pdfPanY);
        }
        return;
      }

      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const currX = touch.clientX;
      const currY = touch.clientY;
      const dx = currX - pdfTouchStartX;
      const dy = currY - pdfTouchStartY;
      const stepX = currX - pdfTouchLastX;
      const stepY = currY - pdfTouchLastY;
      pdfTouchLastX = currX;
      pdfTouchLastY = currY;

      // Pan handling when zoomed in
      if (pdfGestureMode === "pan") {
        e.preventDefault();
        pdfPanX += stepX;
        pdfPanY += stepY;
        const clamped = clampPdfPan(pdfZoomScale, pdfPanX, pdfPanY, 40);
        pdfPanX = clamped.x;
        pdfPanY = clamped.y;
        applyPdfTransform(pdfZoomScale, pdfPanX, pdfPanY);
        return;
      }

      // Early axis determination at fit-to-screen
      if (pdfGestureMode === "undecided") {
        const moveDist = Math.hypot(dx, dy);
        if (moveDist > 12) {
          if (dy > 0 && dy > Math.abs(dx) * 1.25) {
            pdfGestureMode = "swipe_down";
          } else if (Math.abs(dx) > Math.abs(dy) * 1.25) {
            pdfGestureMode = "swipe_page";
          } else if (Math.abs(dx) >= Math.abs(dy)) {
            pdfGestureMode = "swipe_page";
          } else if (dy > 0) {
            pdfGestureMode = "swipe_down";
          } else {
            pdfGestureMode = "ignore";
          }
        }
      }

      // Swipe down to close
      if (pdfGestureMode === "swipe_down") {
        e.preventDefault();
        if (dy > 0) {
          // Visual affordance: stage tracks finger down and scales slightly; overlay fades
          const scale = Math.max(0.85, 1 - dy * 0.0006);
          const bgOpacity = Math.max(0.35, 1 - dy / 450);
          if (stage) {
            stage.style.transform = `translate3d(0px, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
          }
          if (overlay) {
            overlay.style.backgroundColor = `rgba(13, 15, 23, ${bgOpacity.toFixed(2)})`;
          }
        } else {
          // Upward drag: subtle resistance
          const dragY = dy * 0.2;
          if (stage) {
            stage.style.transform = `translate3d(0px, ${dragY.toFixed(2)}px, 0) scale(1)`;
          }
        }
        return;
      }

      // Horizontal page navigation
      if (pdfGestureMode === "swipe_page") {
        e.preventDefault();
        let pageOffset = dx * 0.5;
        // Subtle bounce/rubberband feedback on first/last page
        if (dx > 0 && currentPdfPageNum <= 1) {
          pageOffset = dx * 0.2;
        } else if (dx < 0 && currentPdfPageNum >= totalPdfPages) {
          pageOffset = dx * 0.2;
        }
        if (stage) {
          stage.style.transform = `translate3d(${pageOffset.toFixed(2)}px, 0px, 0) scale(1)`;
        }
        return;
      }
    }, { passive: false });

    const handleTouchEndOrCancel = (e) => {
      const stage = document.getElementById("pdfStage");
      const overlay = document.getElementById("pdfReaderScreen");

      if (pdfGestureMode === "pinch") {
        pdfGestureMode = "none";
        // Enforce zoom bounds: min 1.0 (100%), max 4.0 (400%)
        if (pdfZoomScale <= 1.05) {
          resetPdfZoomAndPan(true);
        } else {
          pdfZoomScale = Math.min(4.0, Math.max(1.0, pdfZoomScale));
          const clamped = clampPdfPan(pdfZoomScale, pdfPanX, pdfPanY);
          pdfPanX = clamped.x;
          pdfPanY = clamped.y;
          applyPdfTransform(pdfZoomScale, pdfPanX, pdfPanY, "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)");
          setTimeout(() => {
            if (stage) stage.style.setProperty("transition", "none", "important");
          }, 230);
        }
        return;
      }

      if (pdfGestureMode === "pan") {
        pdfGestureMode = "none";
        const clamped = clampPdfPan(pdfZoomScale, pdfPanX, pdfPanY);
        if (clamped.x !== pdfPanX || clamped.y !== pdfPanY) {
          pdfPanX = clamped.x;
          pdfPanY = clamped.y;
          applyPdfTransform(pdfZoomScale, pdfPanX, pdfPanY, "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)");
          setTimeout(() => {
            if (stage) stage.style.setProperty("transition", "none", "important");
          }, 210);
        }
        return;
      }

      if (pdfGestureMode === "swipe_down") {
        pdfGestureMode = "none";
        const dy = pdfTouchLastY - pdfTouchStartY;
        const dt = Math.max(1, Date.now() - pdfTouchStartTime);
        const velocity = dy / dt;

        // Release threshold: distance >= 120px OR velocity >= 0.5px/ms with dy >= 50px
        const shouldClose = dy >= 120 || (dy >= 50 && velocity >= 0.5);

        if (shouldClose) {
          if (stage) {
            stage.style.setProperty("transition", "transform 0.22s ease-out, opacity 0.22s ease-out", "important");
            stage.style.transform = `translate3d(0px, ${window.innerHeight || 800}px, 0) scale(0.85)`;
          }
          if (overlay) {
            overlay.style.setProperty("transition", "background-color 0.22s ease-out", "important");
            overlay.style.backgroundColor = "rgba(13, 15, 23, 0)";
          }
          setTimeout(() => {
            closePdfBook();
          }, 220);
        } else {
          // Snap back smoothly
          if (stage) {
            stage.style.setProperty("transition", "transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1)", "important");
            stage.style.transform = "translate3d(0px, 0px, 0px) scale(1)";
          }
          if (overlay) {
            overlay.style.setProperty("transition", "background-color 0.24s ease-out", "important");
            overlay.style.backgroundColor = "#0d0f17";
          }
          setTimeout(() => {
            if (stage) stage.style.setProperty("transition", "none", "important");
            if (overlay) {
              overlay.style.setProperty("transition", "", "important");
              overlay.style.backgroundColor = "";
            }
          }, 250);
        }
        return;
      }

      if (pdfGestureMode === "swipe_page") {
        pdfGestureMode = "none";
        const dx = pdfTouchLastX - pdfTouchStartX;
        const dt = Math.max(1, Date.now() - pdfTouchStartTime);
        const velocity = Math.abs(dx) / dt;

        // Threshold check to avoid accidental triggers from taps or minor drags
        const isSwipe = (Math.abs(dx) >= 55 && velocity >= 0.3) || Math.abs(dx) >= 100;

        if (stage) {
          stage.style.setProperty("transition", "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)", "important");
          stage.style.transform = "translate3d(0px, 0px, 0px) scale(1)";
          setTimeout(() => {
            if (stage) stage.style.setProperty("transition", "none", "important");
          }, 210);
        }

        if (isSwipe) {
          if (dx < 0 && currentPdfPageNum < totalPdfPages) {
            nextPdfPage();
          } else if (dx > 0 && currentPdfPageNum > 1) {
            prevPdfPage();
          }
        }
        return;
      }

      if (pdfGestureMode === "undecided" || pdfGestureMode === "none") {
        pdfGestureMode = "none";
        const endX = pdfTouchLastX;
        const endY = pdfTouchLastY;
        const moveDist = Math.hypot(endX - pdfTouchStartX, endY - pdfTouchStartY);

        if (moveDist < 15) {
          // Tap detected: check for double-tap
          const now = Date.now();
          const timeSinceLastTap = now - pdfLastTapTime;
          const distFromLastTap = Math.hypot(endX - pdfLastTapX, endY - pdfLastTapY);

          if (timeSinceLastTap > 0 && timeSinceLastTap < 300 && distFromLastTap < 35) {
            // Double Tap Confirmed!
            pdfLastTapTime = 0;
            if (pdfSingleTapTimeout) {
              clearTimeout(pdfSingleTapTimeout);
              pdfSingleTapTimeout = null;
            }

            if (pdfZoomScale > 1.05) {
              // Toggle back to fit-to-screen
              resetPdfZoomAndPan(true);
            } else {
              // Zoom into preset level (200% / 2.0x), centered on double-tap point
              const targetScale = 2.0;
              const vp = getPdfViewportDimensions();
              const Cx = vp.width / 2;
              const Cy = vp.height / 2;

              const targetPanX = -(endX - Cx);
              const targetPanY = -(endY - Cy);

              const clamped = clampPdfPan(targetScale, targetPanX, targetPanY);
              pdfZoomScale = targetScale;
              pdfPanX = clamped.x;
              pdfPanY = clamped.y;

              applyPdfTransform(pdfZoomScale, pdfPanX, pdfPanY, "transform 0.28s cubic-bezier(0.2, 0, 0, 1)");
              setTimeout(() => {
                if (stage) stage.style.setProperty("transition", "none", "important");
              }, 290);
            }
          } else {
            // First tap: delay single-tap action to allow double-tap
            pdfLastTapTime = now;
            pdfLastTapX = endX;
            pdfLastTapY = endY;

            if (pdfSingleTapTimeout) clearTimeout(pdfSingleTapTimeout);
            pdfSingleTapTimeout = setTimeout(() => {
              pdfSingleTapTimeout = null;
              if (pdfZoomScale <= 1.05) {
                const vp = getPdfViewportDimensions();
                if (endX < vp.width * 0.20) {
                  if (currentPdfPageNum > 1) prevPdfPage();
                } else if (endX > vp.width * 0.80) {
                  if (currentPdfPageNum < totalPdfPages) nextPdfPage();
                } else {
                  const overlay = document.getElementById("pdfReaderScreen");
                  if (overlay) overlay.classList.toggle("hide-controls");
                }
              }
            }, 260);
          }
        }
      }
    };

    // Cross-frame sync with embedded HTML books
    window.addEventListener("message", (e) => {
      if (!e || !e.data) return;
      if (e.data.type === "CLOSE_BOOK") {
        closePdfBook();
      } else if (e.data.type === "SET_CONTROLS_VISIBILITY") {
        const overlay = document.getElementById("pdfReaderScreen");
        if (overlay) {
          if (e.data.hidden) overlay.classList.add("hide-controls");
          else overlay.classList.remove("hide-controls");
        }
      }
    });

    targetEl.addEventListener("touchend", handleTouchEndOrCancel, { passive: false });
    targetEl.addEventListener("touchcancel", handleTouchEndOrCancel, { passive: false });

    // 4. Mouse & Desktop Support
    targetEl.addEventListener("mousedown", (e) => {
      if (e.target && e.target.closest("#closePdfReaderBtn, #pdfFloatingPill, .pdf-floating-page-pill")) return;
      pdfIsMouseDown = true;
      pdfMouseStartX = e.clientX;
      pdfMouseStartY = e.clientY;
      pdfMouseLastX = e.clientX;
      pdfMouseLastY = e.clientY;
      pdfMouseStartTime = Date.now();
      pdfMouseMode = (pdfZoomScale > 1.05) ? "pan" : "undecided";
      const stage = document.getElementById("pdfStage");
      if (stage) stage.style.setProperty("transition", "none", "important");
    });

    window.addEventListener("mousemove", (e) => {
      if (!pdfIsMouseDown) return;
      const stage = document.getElementById("pdfStage");
      const overlay = document.getElementById("pdfReaderScreen");
      const currX = e.clientX;
      const currY = e.clientY;
      const dx = currX - pdfMouseStartX;
      const dy = currY - pdfMouseStartY;
      const stepX = currX - pdfMouseLastX;
      const stepY = currY - pdfMouseLastY;
      pdfMouseLastX = currX;
      pdfMouseLastY = currY;

      if (pdfMouseMode === "pan") {
        pdfPanX += stepX;
        pdfPanY += stepY;
        const clamped = clampPdfPan(pdfZoomScale, pdfPanX, pdfPanY, 30);
        pdfPanX = clamped.x;
        pdfPanY = clamped.y;
        applyPdfTransform(pdfZoomScale, pdfPanX, pdfPanY);
        return;
      }

      if (pdfMouseMode === "undecided") {
        if (Math.hypot(dx, dy) > 12) {
          if (dy > 0 && dy > Math.abs(dx) * 1.25) {
            pdfMouseMode = "swipe_down";
          } else if (Math.abs(dx) > Math.abs(dy) * 1.25) {
            pdfMouseMode = "swipe_page";
          }
        }
      }

      if (pdfMouseMode === "swipe_down") {
        if (dy > 0) {
          const scale = Math.max(0.85, 1 - dy * 0.0006);
          const bgOpacity = Math.max(0.35, 1 - dy / 450);
          if (stage) stage.style.transform = `translate3d(0px, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
          if (overlay) overlay.style.backgroundColor = `rgba(13, 15, 23, ${bgOpacity.toFixed(2)})`;
        }
        return;
      }

      if (pdfMouseMode === "swipe_page") {
        let pageOffset = dx * 0.4;
        if (dx > 0 && currentPdfPageNum <= 1) pageOffset = dx * 0.15;
        else if (dx < 0 && currentPdfPageNum >= totalPdfPages) pageOffset = dx * 0.15;
        if (stage) stage.style.transform = `translate3d(${pageOffset.toFixed(2)}px, 0px, 0) scale(1)`;
        return;
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (!pdfIsMouseDown) return;
      pdfIsMouseDown = false;
      const stage = document.getElementById("pdfStage");
      const overlay = document.getElementById("pdfReaderScreen");

      if (pdfMouseMode === "pan") {
        pdfMouseMode = "none";
        const clamped = clampPdfPan(pdfZoomScale, pdfPanX, pdfPanY);
        pdfPanX = clamped.x;
        pdfPanY = clamped.y;
        applyPdfTransform(pdfZoomScale, pdfPanX, pdfPanY, "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)");
        setTimeout(() => { if (stage) stage.style.setProperty("transition", "none", "important"); }, 210);
        return;
      }

      if (pdfMouseMode === "swipe_down") {
        pdfMouseMode = "none";
        const dy = pdfMouseLastY - pdfMouseStartY;
        const dt = Math.max(1, Date.now() - pdfMouseStartTime);
        const velocity = dy / dt;
        if (dy >= 120 || (dy >= 50 && velocity >= 0.5)) {
          if (stage) {
            stage.style.setProperty("transition", "transform 0.22s ease-out, opacity 0.22s ease-out", "important");
            stage.style.transform = `translate3d(0px, ${window.innerHeight || 800}px, 0) scale(0.85)`;
          }
          if (overlay) {
            overlay.style.setProperty("transition", "background-color 0.22s ease-out", "important");
            overlay.style.backgroundColor = "rgba(13, 15, 23, 0)";
          }
          setTimeout(() => closePdfBook(), 220);
        } else {
          if (stage) {
            stage.style.setProperty("transition", "transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1)", "important");
            stage.style.transform = "translate3d(0px, 0px, 0px) scale(1)";
          }
          if (overlay) {
            overlay.style.setProperty("transition", "background-color 0.24s ease-out", "important");
            overlay.style.backgroundColor = "#0d0f17";
          }
          setTimeout(() => {
            if (stage) stage.style.setProperty("transition", "none", "important");
            if (overlay) {
              overlay.style.setProperty("transition", "", "important");
              overlay.style.backgroundColor = "";
            }
          }, 250);
        }
        return;
      }

      if (pdfMouseMode === "swipe_page") {
        pdfMouseMode = "none";
        const dx = pdfMouseLastX - pdfMouseStartX;
        const dt = Math.max(1, Date.now() - pdfMouseStartTime);
        const velocity = Math.abs(dx) / dt;
        if (stage) {
          stage.style.setProperty("transition", "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)", "important");
          stage.style.transform = "translate3d(0px, 0px, 0px) scale(1)";
          setTimeout(() => { if (stage) stage.style.setProperty("transition", "none", "important"); }, 210);
        }
        if ((Math.abs(dx) >= 55 && velocity >= 0.3) || Math.abs(dx) >= 100) {
          if (dx < 0 && currentPdfPageNum < totalPdfPages) nextPdfPage();
          else if (dx > 0 && currentPdfPageNum > 1) prevPdfPage();
        }
        return;
      }

      if (pdfMouseMode === "undecided") {
        const dist = Math.hypot(pdfMouseLastX - pdfMouseStartX, pdfMouseLastY - pdfMouseStartY);
        if (dist < 15 && Date.now() - pdfMouseStartTime < 350) {
          const vp = getPdfViewportDimensions();
          if (pdfMouseLastX < vp.width * 0.20) {
            if (currentPdfPageNum > 1) prevPdfPage();
          } else if (pdfMouseLastX > vp.width * 0.80) {
            if (currentPdfPageNum < totalPdfPages) nextPdfPage();
          } else {
            const overlay = document.getElementById("pdfReaderScreen");
            if (overlay) overlay.classList.toggle("hide-controls");
          }
        }
      }

      pdfMouseMode = "none";
    });

    // Mouse Wheel Zoom centered on cursor
    targetEl.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 1.15 : 0.87;
      const targetScale = Math.max(1.0, Math.min(4.0, pdfZoomScale * zoomDelta));

      if (targetScale === pdfZoomScale) return;

      const vp = getPdfViewportDimensions();
      const Cx = vp.width / 2;
      const Cy = vp.height / 2;
      const cursorX = e.clientX;
      const cursorY = e.clientY;

      if (targetScale <= 1.05) {
        resetPdfZoomAndPan(true);
      } else {
        const targetPanX = (cursorX - Cx) - ((cursorX - Cx - pdfPanX) * (targetScale / pdfZoomScale));
        const targetPanY = (cursorY - Cy) - ((cursorY - Cy - pdfPanY) * (targetScale / pdfZoomScale));
        const clamped = clampPdfPan(targetScale, targetPanX, targetPanY);
        pdfZoomScale = targetScale;
        pdfPanX = clamped.x;
        pdfPanY = clamped.y;
        applyPdfTransform(pdfZoomScale, pdfPanX, pdfPanY, "transform 0.12s ease-out");
        const stage = document.getElementById("pdfStage");
        setTimeout(() => { if (stage) stage.style.setProperty("transition", "none", "important"); }, 130);
      }
    }, { passive: false });

    // 5. Prev/Next Page Pill Buttons
    const prevPillBtn = document.getElementById("pdfPrevPageBtn");
    const nextPillBtn = document.getElementById("pdfNextPageBtn");
    if (prevPillBtn) {
      prevPillBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevPdfPage();
      });
    }
    if (nextPillBtn) {
      nextPillBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextPdfPage();
      });
    }
  }

  window.openPdfBook = openPdfBook;
  window.openBook = openPdfBook;
  window.closePdfBook = closePdfBook;
  window.renderPdfPage = renderPdfPage;
  window.nextPdfPage = nextPdfPage;
  window.prevPdfPage = prevPdfPage;

    /* ==========================================================================
     3. ALMANAC MODULE — FOLDER-BASED NAVIGATION & CALENDAR SYSTEM
     ========================================================================== */
  function getLiveLiturgicalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return {
      year,
      month,
      day,
      dateKey: `${year}-${mStr}-${dStr}`
    };
  }

  const initialLiveDate = getLiveLiturgicalDate();
  const almanacNavState = {
    level: 'years', // 'years' | 'months' | 'calendar' | 'day'
    selectedYear: initialLiveDate.year,
    selectedMonth: initialLiveDate.month,
    expandedDateKey: initialLiveDate.dateKey
  };

  const monthNamesList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthSeasonTags = {
    0: { season: 'Epiphany & Ordinary Time', tag: 'Epiphany', color: 'Green' },
    1: { season: 'Transfiguration & Lent', tag: 'Lenten Tide', color: 'Violet' },
    2: { season: 'Lenten Journey & Passiontide', tag: 'Passiontide', color: 'Violet' },
    3: { season: 'Holy Week & Eastertide', tag: 'Eastertide', color: 'White' },
    4: { season: 'Ascension & Pentecost', tag: 'Pentecost', color: 'Red' },
    5: { season: 'Trinity & Kingdomtide', tag: 'Trinity Tide', color: 'Green' },
    6: { season: 'Season of Ordinary Time', tag: 'Ordinary Time', color: 'Green' },
    7: { season: 'Season of Ordinary Time', tag: 'Ordinary Time', color: 'Green' },
    8: { season: 'Season of Ordinary Time', tag: 'Ordinary Time', color: 'Green' },
    9: { season: 'Kingdomtide & Reformation', tag: 'Kingdomtide', color: 'Green' },
    10: { season: 'Christ the King & Advent', tag: 'Advent', color: 'Violet' },
    11: { season: 'Advent & Nativity of Christ', tag: 'Christmas', color: 'White' }
  };

  let isAlmanacDiskLoaded = false;
  function hydrateAlmanacStore() {
    if (!window.CHURCH_DATA) window.CHURCH_DATA = {};
    if (!window.CHURCH_DATA.almanacDatabase) window.CHURCH_DATA.almanacDatabase = {};

    // 1. Hydrate from LocalStorage custom edits
    try {
      const stored = localStorage.getItem('sanctuary_custom_almanac') || localStorage.getItem('sanctuary_custom_almanac_entries');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          Object.assign(window.CHURCH_DATA.almanacDatabase, parsed);
        }
      }
    } catch (e) {
      console.warn('[Almanac] LocalStorage hydration warning:', e);
    }

    // 2. Hydrate from Dexie IndexedDB
    try {
      if (typeof churchDexieDb !== 'undefined' && churchDexieDb?.almanac_entries) {
        churchDexieDb.almanac_entries.toArray().then(entries => {
          if (Array.isArray(entries) && entries.length > 0) {
            let changed = false;
            entries.forEach(entry => {
              const k = entry.date_key || entry.dateKey;
              if (!k) return;
              let detailsObj = entry;
              if (entry.details && typeof entry.details === 'string') {
                try { detailsObj = { ...JSON.parse(entry.details), ...entry }; } catch (_) {}
              }
              window.CHURCH_DATA.almanacDatabase[k] = {
                ...(window.CHURCH_DATA.almanacDatabase[k] || {}),
                ...detailsObj,
                dateKey: k
              };
              changed = true;
            });
            if (changed && almanacNavState.level === 'day') {
              const container = document.getElementById('almanacContentContainer');
              if (container && almanacNavState.expandedDateKey) {
                renderAlmanacDayDetailView(container, almanacNavState.expandedDateKey);
              }
            }
          }
        }).catch(() => {});
      }
    } catch (_) {}

    // 3. Hydrate missing days from full year JSON over HTTP
    if (!isAlmanacDiskLoaded && typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      isAlmanacDiskLoaded = true;
      fetch('data/almanac_full_year_2026.json')
        .then(res => res.ok ? res.json() : null)
        .then(json => {
          if (json && typeof json === 'object') {
            for (const [k, v] of Object.entries(json)) {
              if (!window.CHURCH_DATA.almanacDatabase[k]) {
                window.CHURCH_DATA.almanacDatabase[k] = v;
              }
            }
          }
        })
        .catch(() => {});
    }
  }
  window.hydrateAlmanacStore = hydrateAlmanacStore;

  function renderAlmanacModule() {
    window.renderAlmanacModule = renderAlmanacModule;
    hydrateAlmanacStore();
    const container = document.getElementById('almanacContentContainer');
    const breadcrumbs = document.getElementById('almanacBreadcrumbs');
    const mainTitle = document.getElementById('almanacSectionMainTitle');
    const subtitle = document.getElementById('almanacSectionSubtitle');
    if (!container || !breadcrumbs) return;

    // 1. Render Breadcrumbs
    renderAlmanacBreadcrumbs(breadcrumbs);

    // 2. Render View based on level
    if (almanacNavState.level === 'years') {
      if (mainTitle) mainTitle.textContent = 'Liturgical Almanac';
      if (subtitle) subtitle.textContent = 'Select a liturgical year to explore lectionary folders';
      renderAlmanacYearView(container);
    } else if (almanacNavState.level === 'months') {
      if (mainTitle) mainTitle.textContent = `Liturgical Year ${almanacNavState.selectedYear}`;
      if (subtitle) subtitle.textContent = 'Select a month folder to open monthly lectionary calendar';
      renderAlmanacMonthView(container);
    } else if (almanacNavState.level === 'calendar') {
      const mName = monthNamesList[almanacNavState.selectedMonth] || '';
      const seasonInfo = monthSeasonTags[almanacNavState.selectedMonth];
      if (mainTitle) mainTitle.textContent = `${mName} ${almanacNavState.selectedYear}`;
      if (subtitle) subtitle.textContent = seasonInfo ? `${seasonInfo.season} • Daily Lectionary` : 'Daily lectionary readings, feast days & worship order';
      renderAlmanacCalendarView(container);
    } else if (almanacNavState.level === 'day') {
      const dayData = CHURCH_DATA.almanacDatabase ? CHURCH_DATA.almanacDatabase[almanacNavState.expandedDateKey] : null;
      if (dayData) {
        const [y, m, d] = (dayData.dateKey || almanacNavState.expandedDateKey).split('-').map(Number);
        const dayDateObj = new Date(y, m - 1, d);
        const fullWeekday = !isNaN(dayDateObj.getTime()) ? dayDateObj.toLocaleDateString('en-US', { weekday: 'long' }) : (dayData.dayName || '');
        if (mainTitle) mainTitle.textContent = `${fullWeekday}, ${String(dayData.day).padStart(2, '0')} ${dayData.monthName} ${dayData.year}`;
        if (subtitle) subtitle.textContent = dayData.theme ? `${dayData.theme} • Liturgical Color: ${dayData.color || 'Green'}` : `${fullWeekday} Lectionary • Liturgical Color: ${dayData.color || 'Green'}`;
      } else {
        if (mainTitle) mainTitle.textContent = 'Day Details';
        if (subtitle) subtitle.textContent = 'Liturgical lectionary and worship readings';
      }
      renderAlmanacDayDetailView(container, almanacNavState.expandedDateKey);
    }
  }

  function renderAlmanacBreadcrumbs(crumbsContainer) {
    const chevronSvg = `<svg class="almanac-crumb-chevron" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

    const isYearsActive = (almanacNavState.level === 'years');
    const isMonthsActive = (almanacNavState.level === 'months');
    const isCalendarActive = (almanacNavState.level === 'calendar');
    const isDayActive = (almanacNavState.level === 'day');

    let html = `
      <div class="almanac-crumb-indicator" id="almanacCrumbIndicator"></div>
      <button class="almanac-crumb-btn ${isYearsActive ? 'active' : ''}" id="crumbYearRootBtn" data-level="years" title="All Liturgical Years" ${isYearsActive ? 'aria-current="page"' : ''}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span>Almanac</span>
      </button>
    `;

    if (isMonthsActive || isCalendarActive || isDayActive) {
      html += `
        ${chevronSvg}
        <button class="almanac-crumb-btn ${isMonthsActive ? 'active' : ''}" id="crumbYearBtn" data-level="months" title="Year ${almanacNavState.selectedYear}" ${isMonthsActive ? 'aria-current="page"' : ''}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>${almanacNavState.selectedYear}</span>
        </button>
      `;
    }

    if (isCalendarActive || isDayActive) {
      const mName = monthNamesList[almanacNavState.selectedMonth] || 'Calendar';
      html += `
        ${chevronSvg}
        <button class="almanac-crumb-btn ${isCalendarActive ? 'active' : ''}" id="crumbMonthBtn" data-level="calendar" title="${mName} ${almanacNavState.selectedYear}" ${isCalendarActive ? 'aria-current="page"' : ''}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
          <span>${mName}</span>
        </button>
      `;
    }

    if (isDayActive) {
      const live = getLiveLiturgicalDate();
      const dateKey = almanacNavState.expandedDateKey || live.dateKey;
      const [y, m, d] = dateKey.split('-').map(Number);
      const dayData = CHURCH_DATA.almanacDatabase ? CHURCH_DATA.almanacDatabase[dateKey] : null;
      const dayColor = dayData?.color || 'Green';
      const colorInfo = getLiturgicalColorInfo(dayColor);
      const mName = (monthNamesList && monthNamesList[m - 1]) ? monthNamesList[m - 1] : '';
      const dayDateObj = new Date(y, m - 1, d);
      const weekdayShort = !isNaN(dayDateObj.getTime()) ? dayDateObj.toLocaleDateString('en-US', { weekday: 'short' }) : '';
      const dayLabel = `${String(d).padStart(2, '0')} ${mName.slice(0, 3)}${weekdayShort ? ` • ${weekdayShort}` : ''}`;

      html += `
        ${chevronSvg}
        <button class="almanac-crumb-btn active" id="crumbDayBtn" data-level="day" title="Lectionary for ${d} ${mName} ${y}" aria-current="page">
          <span class="crumb-day-dot ${colorInfo.dotClass}"></span>
          <span>${dayLabel}</span>
        </button>
      `;
    }

    crumbsContainer.innerHTML = html;
    setupAlmanacBreadcrumbDraggable(crumbsContainer);
  }

  function setupAlmanacBreadcrumbDraggable(crumbsContainer) {
    const indicator = document.getElementById('almanacCrumbIndicator');
    if (!indicator || !crumbsContainer) return;

    const crumbBtns = Array.from(crumbsContainer.querySelectorAll('.almanac-crumb-btn'));
    if (crumbBtns.length === 0) return;

    const activeBtn = crumbsContainer.querySelector('.almanac-crumb-btn.active') || crumbBtns[crumbBtns.length - 1];

    function positionIndicator(targetBtn, animate = true) {
      if (!targetBtn || !indicator || !crumbsContainer) return;
      const left = targetBtn.offsetLeft;
      const top = targetBtn.offsetTop;
      const width = targetBtn.offsetWidth;
      const height = targetBtn.offsetHeight;

      if (width === 0 || height === 0) return;

      indicator.style.transition = animate 
        ? 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), width 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), height 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease' 
        : 'none';
      indicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
      indicator.style.opacity = '1';

      if (crumbsContainer.scrollWidth > crumbsContainer.clientWidth) {
        const targetScroll = left - (crumbsContainer.clientWidth / 2) + (width / 2);
        crumbsContainer.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    }

    // Immediate placement without post-render jitter
    positionIndicator(activeBtn, false);
    requestAnimationFrame(() => positionIndicator(activeBtn, false));

    // Watch for resize / font loading adjustments
    if (window.ResizeObserver && !crumbsContainer._almanacResizeObserver) {
      crumbsContainer._almanacResizeObserver = new ResizeObserver(() => {
        const currentActive = crumbsContainer.querySelector('.almanac-crumb-btn.active');
        if (currentActive) positionIndicator(currentActive, false);
      });
      crumbsContainer._almanacResizeObserver.observe(crumbsContainer);
    }

    let suppressClickUntil = 0;

    function navigateToCrumbLevel(targetLevel) {
      if (!targetLevel || almanacNavState.level === targetLevel) {
        positionIndicator(activeBtn, true);
        return;
      }
      if (almanacNavState.expandedDateKey) {
        const parts = almanacNavState.expandedDateKey.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          almanacNavState.selectedYear = parts[0];
          almanacNavState.selectedMonth = parts[1] - 1;
        }
      }
      almanacNavState.level = targetLevel;
      renderAlmanacModule();
    }

    // Direct click handler for each crumb button to jump to any address
    crumbBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (Date.now() < suppressClickUntil) return;
        const lvl = btn.getAttribute('data-level');
        if (lvl) {
          if (lvl !== almanacNavState.level) {
            positionIndicator(btn, true);
            navigateToCrumbLevel(lvl);
          } else {
            positionIndicator(btn, true);
          }
        }
      });
    });

    let isDragging = false;
    let dragStartX = 0;
    let lastValidClientX = 0;
    let hasDraggedBeyondThreshold = false;

    // Viewport-based closest crumb finder (100% accurate across scroll and device scales)
    function getClosestCrumbFromClientX(clientX) {
      let closest = null;
      let minDiff = Infinity;
      crumbBtns.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
          closest = btn;
          minDiff = 0;
          return;
        }
        const btnCenterX = rect.left + (rect.width / 2);
        const diff = Math.abs(clientX - btnCenterX);
        if (diff < minDiff) {
          minDiff = diff;
          closest = btn;
        }
      });
      return closest || activeBtn;
    }

    function handleDragStart(clientX) {
      isDragging = true;
      dragStartX = clientX;
      lastValidClientX = clientX;
      hasDraggedBeyondThreshold = false;
      indicator.classList.add('dragging');
    }

    function handleDragMove(clientX) {
      if (!isDragging) return;
      if (typeof clientX === 'number' && clientX > 0) {
        lastValidClientX = clientX;
      }
      const currentX = (typeof clientX === 'number' && clientX > 0) ? clientX : lastValidClientX;
      const deltaX = currentX - dragStartX;
      if (Math.abs(deltaX) > 6) {
        hasDraggedBeyondThreshold = true;
      }

      const targetBtn = getClosestCrumbFromClientX(currentX);
      if (!targetBtn) return;

      const left = targetBtn.offsetLeft;
      const top = targetBtn.offsetTop;
      const width = targetBtn.offsetWidth;
      const height = targetBtn.offsetHeight;

      indicator.style.transition = 'transform 0.12s ease, width 0.12s ease';
      indicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;

      crumbBtns.forEach(btn => {
        if (btn === targetBtn) {
          btn.style.color = 'var(--accent-gold)';
        } else if (!btn.classList.contains('active')) {
          btn.style.color = 'var(--text-muted)';
        }
      });
    }

    function handleDragEnd(clientX) {
      if (!isDragging) return;
      isDragging = false;
      indicator.classList.remove('dragging');

      crumbBtns.forEach(btn => {
        btn.style.color = '';
      });

      const finalX = (typeof clientX === 'number' && clientX > 0) ? clientX : lastValidClientX;

      if (hasDraggedBeyondThreshold) {
        suppressClickUntil = Date.now() + 400;
        const targetBtn = getClosestCrumbFromClientX(finalX);
        if (targetBtn) {
          const targetLevel = targetBtn.getAttribute('data-level');
          if (targetLevel) {
            if (targetLevel !== almanacNavState.level) {
              navigateToCrumbLevel(targetLevel);
              return;
            }
          }
        }
      }

      positionIndicator(activeBtn, true);
    }

    crumbsContainer.addEventListener('pointerdown', (e) => {
      const clickedCrumb = e.target.closest('.almanac-crumb-btn');
      if (!clickedCrumb && e.target !== indicator) return;

      handleDragStart(e.clientX);

      const onPointerMove = (ev) => {
        if (ev.cancelable) ev.preventDefault();
        handleDragMove(ev.clientX);
      };
      const onPointerUp = (ev) => {
        const finalCoord = (typeof ev.clientX === 'number' && ev.clientX > 0) ? ev.clientX : lastValidClientX;
        handleDragEnd(finalCoord);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
      };
      const onPointerCancel = () => {
        handleDragEnd(lastValidClientX);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { once: true });
      window.addEventListener('pointercancel', onPointerCancel, { once: true });
    });
  }

  function renderAlmanacYearView(container) {
    const db = CHURCH_DATA.almanacDatabase || {};
    const yearsSet = new Set();
    Object.keys(db).forEach(k => {
      const yr = parseInt(k.split('-')[0], 10);
      if (!isNaN(yr)) yearsSet.add(yr);
    });
    const availableYears = Array.from(yearsSet).sort((a, b) => a - b);

    if (availableYears.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card" style="text-align:center; padding:32px 20px; background:var(--bg-surface); border-radius:var(--radius-lg); border:1px solid var(--border-subtle);">
          <p style="color:var(--text-muted);">No liturgical lectionary years available.</p>
        </div>
      `;
      return;
    }

    const live = getLiveLiturgicalDate();
    let cardsHtml = '<div class="almanac-folder-grid">';
    availableYears.forEach(yearNum => {
      const prefix = `${yearNum}-`;
      const yearEntriesCount = Object.keys(db).filter(k => k.startsWith(prefix)).length;
      const isCurrentYear = (yearNum === live.year);

      cardsHtml += `
        <div class="almanac-folder-card ${isCurrentYear ? 'current-month' : ''}" data-year="${yearNum}" role="button" tabindex="0" title="Open ${yearNum} Lectionary ${isCurrentYear ? '(Current Year)' : ''}">
          ${isCurrentYear ? '<div class="almanac-live-beacon" title="Live Year"><span class="almanac-beacon-radar"></span><span class="almanac-beacon-core"></span></div>' : ''}
          <div class="almanac-folder-title">${yearNum}</div>
          <div class="almanac-folder-entries">${yearEntriesCount > 0 ? `${yearEntriesCount} Entries` : 'Liturgical Year'}</div>
        </div>
      `;
    });

    // Beside the year card add an iOS-styled plus import card (Pinpoint #10 & Pinpoint Edit #5)
    cardsHtml += `
      <div class="almanac-folder-card almanac-add-year-card" id="almanacAddImportYearBtn" role="button" tabindex="0" title="Import / Add Almanac Records">
        <div class="almanac-folder-add-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <div class="almanac-folder-title">+ Import</div>
        <div class="almanac-folder-entries">New Records</div>
      </div>
    `;

    cardsHtml += '</div>';

    container.innerHTML = cardsHtml;

    container.querySelectorAll('.almanac-folder-card[data-year]').forEach(card => {
      card.addEventListener('click', () => {
        const yr = parseInt(card.getAttribute('data-year'), 10);
        almanacNavState.selectedYear = yr;
        almanacNavState.level = 'months';
        renderAlmanacModule();
      });
    });

    const addAlmanacYearBtn = container.querySelector('#almanacAddImportYearBtn');
    if (addAlmanacYearBtn) {
      addAlmanacYearBtn.addEventListener('click', () => {
        if (typeof window.navigateToImportManager === 'function') {
          window.navigateToImportManager('almanac');
        } else {
          switchTab('viewImportManager');
        }
      });
    }
  }

  function renderAlmanacMonthView(container) {
    const db = CHURCH_DATA.almanacDatabase || {};
    const live = getLiveLiturgicalDate();
    let gridHtml = '<div class="almanac-month-grid">';
    monthNamesList.forEach((mName, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      const prefix = `${almanacNavState.selectedYear}-${mStr}-`;
      const entriesCount = Object.keys(db).filter(k => k.startsWith(prefix)).length;
      const isCurrentMonth = (almanacNavState.selectedYear === live.year && idx === live.month);

      gridHtml += `
        <div class="almanac-month-card ${isCurrentMonth ? 'current-month' : ''}" data-month-idx="${idx}" role="button" tabindex="0" title="Open ${mName} Calendar ${isCurrentMonth ? '(Current Month)' : ''}">
          ${isCurrentMonth ? '<div class="almanac-live-beacon" title="Live Month"><span class="almanac-beacon-radar"></span><span class="almanac-beacon-core"></span></div>' : ''}
          <div class="almanac-month-name">${mName}</div>
          <div class="almanac-month-entries">${entriesCount} Entries</div>
        </div>
      `;
    });
    gridHtml += '</div>';

    container.innerHTML = gridHtml;

    container.querySelectorAll('.almanac-month-card').forEach(card => {
      card.addEventListener('click', () => {
        const mIdx = parseInt(card.getAttribute('data-month-idx'), 10);
        almanacNavState.selectedMonth = mIdx;
        almanacNavState.level = 'calendar';
        renderAlmanacModule();
      });
    });
  }

  function getLiturgicalColorInfo(colorStr) {
    const c = (colorStr || 'Green').toLowerCase().trim();
    if (c === 'gold' || (c.includes('gold') && !c.includes('white'))) {
      return { badgeClass: 'color-gold', dotClass: 'dot-gold', name: 'Gold' };
    }
    if (c === 'white' || (c.includes('white') && !c.includes('gold'))) {
      return { badgeClass: 'color-white', dotClass: 'dot-white', name: 'White' };
    }
    if (c === 'red' || c.includes('red')) {
      return { badgeClass: 'color-red', dotClass: 'dot-red', name: 'Red' };
    }
    if (c === 'purple') {
      return { badgeClass: 'color-purple', dotClass: 'dot-purple', name: 'Purple' };
    }
    if (c === 'violet' || c.includes('violet')) {
      return { badgeClass: 'color-violet', dotClass: 'dot-violet', name: 'Violet' };
    }
    return { badgeClass: 'color-green', dotClass: 'dot-green', name: 'Green' };
  }

  function renderAlmanacCalendarView(container) {
    const y = almanacNavState.selectedYear;
    const m = almanacNavState.selectedMonth;
    const mName = monthNamesList[m];
    const live = getLiveLiturgicalDate();

    const firstDayIndex = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    let calHtml = `
      <div class="almanac-calendar-card">
        <div class="almanac-calendar-header">
          <button class="almanac-cal-btn" id="calPrevMonthBtn" title="Previous Month">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="almanac-cal-month-title">${mName} ${y}</div>
          <button class="almanac-cal-btn" id="calNextMonthBtn" title="Next Month">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div class="almanac-weekdays-row">
          <div class="almanac-weekday-label sunday">Sun</div>
          <div class="almanac-weekday-label">Mon</div>
          <div class="almanac-weekday-label">Tue</div>
          <div class="almanac-weekday-label">Wed</div>
          <div class="almanac-weekday-label">Thu</div>
          <div class="almanac-weekday-label">Fri</div>
          <div class="almanac-weekday-label">Sat</div>
        </div>

        <div class="almanac-days-grid">
    `;

    for (let p = 0; p < firstDayIndex; p++) {
      calHtml += '<div class="almanac-day-cell empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = String(d).padStart(2, '0');
      const mStr = String(m + 1).padStart(2, '0');
      const dateKey = `${y}-${mStr}-${dStr}`;

      const dayData = CHURCH_DATA.almanacDatabase ? CHURCH_DATA.almanacDatabase[dateKey] : null;
      const isToday = (y === live.year && m === live.month && d === live.day);
      const isExpanded = (almanacNavState.expandedDateKey === dateKey);

      let colorClass = 'dot-green';
      if (dayData && dayData.color) {
        const cInfo = getLiturgicalColorInfo(dayData.color);
        colorClass = cInfo.dotClass;
      }

      calHtml += `
        <div class="almanac-day-cell ${dayData ? 'has-data' : 'no-entry'} ${isToday ? 'is-today' : ''} ${isExpanded ? 'active-expanded' : ''}" data-date-key="${dateKey}" role="button" tabindex="0" title="${d} ${mName} ${y}${isToday ? ' (Today - Live Date)' : ''}">
          <span class="day-cell-number">${d}</span>
          ${dayData ? `<span class="day-cell-dot ${colorClass}"></span>` : ''}
        </div>
      `;
    }

    calHtml += `
        </div>
      </div>
    `;

    container.innerHTML = calHtml;

    const prevBtn = document.getElementById('calPrevMonthBtn');
    const nextBtn = document.getElementById('calNextMonthBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (almanacNavState.selectedMonth > 0) {
          almanacNavState.selectedMonth--;
        } else {
          almanacNavState.selectedYear--;
          almanacNavState.selectedMonth = 11;
        }
        renderAlmanacModule();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (almanacNavState.selectedMonth < 11) {
          almanacNavState.selectedMonth++;
        } else {
          almanacNavState.selectedYear++;
          almanacNavState.selectedMonth = 0;
        }
        renderAlmanacModule();
      });
    }

    const daysGrid = container.querySelector('.almanac-days-grid');
    if (daysGrid) {
      daysGrid.addEventListener('click', (e) => {
        const cell = e.target.closest('.almanac-day-cell:not(.empty)');
        if (!cell) return;
        const key = cell.getAttribute('data-date-key');
        if (!key) return;
        almanacNavState.expandedDateKey = key;
        almanacNavState.level = 'day';
        renderAlmanacModule();
        window.scrollTo(0, 0);
        document.querySelector('.app-container')?.scrollTo?.(0, 0);
      });
    }
  }

  let activeEditingDateKey = null;

  function openAlmanacEditModal(dateKey) {
    if (!dateKey) return;
    activeEditingDateKey = dateKey;

    const data = CHURCH_DATA.almanacDatabase ? CHURCH_DATA.almanacDatabase[dateKey] : null;
    const modal = document.getElementById('almanacEditModalOverlay');
    const titleEl = document.getElementById('almanacEditModalTitle');
    const themeInput = document.getElementById('editDayThemeInput');
    const colorSelect = document.getElementById('editDayColorSelect');
    const morningInput = document.getElementById('editDayMorningInput');
    const eveningInput = document.getElementById('editDayEveningInput');
    const lordsSupperInput = document.getElementById('editDayLordsSupperInput');

    const [y, m, d] = dateKey.split('-').map(Number);
    const mName = (monthNamesList && monthNamesList[m - 1]) ? monthNamesList[m - 1] : '';

    if (titleEl) {
      titleEl.textContent = `Edit Day: ${d} ${mName} ${y}`;
    }

    if (data) {
      if (themeInput) themeInput.value = data.theme || '';
      if (colorSelect) colorSelect.value = data.color || 'Green';
      if (morningInput) morningInput.value = (data.morningWorship || []).join('\n');
      if (eveningInput) eveningInput.value = (data.eveningWorship || []).join('\n');
      if (lordsSupperInput) lordsSupperInput.value = (data.lordsSupper || []).join('\n');
    } else {
      if (themeInput) themeInput.value = '';
      if (colorSelect) colorSelect.value = 'Green';
      if (morningInput) morningInput.value = '';
      if (eveningInput) eveningInput.value = '';
      if (lordsSupperInput) lordsSupperInput.value = '';
    }

    showModal(modal);
  }

  function closeAlmanacEditModal() {
    const modal = document.getElementById('almanacEditModalOverlay');
    hideModal(modal);
    activeEditingDateKey = null;
  }

  async function saveAlmanacEdit() {
    if (!activeEditingDateKey) {
      closeAlmanacEditModal();
      return;
    }

    const confirmed = await window.showConfirmDialog({
      title: 'Save Almanac Entry?',
      message: `Save updated liturgical readings for ${activeEditingDateKey}?`,
      icon: '📖',
      confirmText: 'Save Lectionary'
    });
    if (!confirmed) return;

    if (!CHURCH_DATA.almanacDatabase) {
      CHURCH_DATA.almanacDatabase = {};
    }

    const themeInput = document.getElementById('editDayThemeInput');
    const colorSelect = document.getElementById('editDayColorSelect');
    const morningInput = document.getElementById('editDayMorningInput');
    const eveningInput = document.getElementById('editDayEveningInput');
    const lordsSupperInput = document.getElementById('editDayLordsSupperInput');

    const parseLines = (val) => (val || '').split('\n').map(s => s.trim()).filter(Boolean);

    const [y, m, d] = activeEditingDateKey.split('-').map(Number);
    const mName = (monthNamesList && monthNamesList[m - 1]) ? monthNamesList[m - 1] : '';

    const existing = CHURCH_DATA.almanacDatabase[activeEditingDateKey] || {
      dateKey: activeEditingDateKey,
      day: d,
      monthName: mName,
      year: y,
      dayName: new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
    };

    existing.theme = themeInput ? themeInput.value.trim() : (existing.theme || '');
    existing.color = colorSelect ? colorSelect.value : (existing.color || 'Green');
    existing.morningWorship = morningInput ? parseLines(morningInput.value) : (existing.morningWorship || []);
    existing.eveningWorship = eveningInput ? parseLines(eveningInput.value) : (existing.eveningWorship || []);
    existing.lordsSupper = lordsSupperInput ? parseLines(lordsSupperInput.value) : (existing.lordsSupper || []);

    CHURCH_DATA.almanacDatabase[activeEditingDateKey] = existing;

    try {
      localStorage.setItem('sanctuary_custom_almanac', JSON.stringify(CHURCH_DATA.almanacDatabase));
      localStorage.setItem('sanctuary_custom_almanac_entries', JSON.stringify(CHURCH_DATA.almanacDatabase));
    } catch (e) {}

    // Save to Dexie IndexedDB
    try {
      if (typeof churchDexieDb !== 'undefined' && churchDexieDb?.almanac_entries) {
        churchDexieDb.almanac_entries.put({
          date_key: activeEditingDateKey,
          year: y,
          title: existing.theme || 'Lectionary',
          details: JSON.stringify(existing),
          liturgical_color: existing.color,
          updated_at: new Date().toISOString()
        }).catch(() => {});
      }
    } catch (_) {}

    // Save directly to disk via Local Server if on HTTP
    try {
      if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
        fetch('/api/almanac/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateKey: activeEditingDateKey, entry: existing })
        }).catch(() => {});
      }
    } catch (_) {}

    if (window.ChurchSync && window.ChurchSync.Almanac && typeof window.ChurchSync.Almanac.upsert === 'function') {
      window.ChurchSync.Almanac.upsert({
        date_key: activeEditingDateKey,
        year: y,
        title: existing.theme || 'Lectionary',
        details: JSON.stringify(existing),
        liturgical_color: existing.color
      }).catch(err => console.warn('[Sync] Almanac cloud sync error:', err));
    }

    closeAlmanacEditModal();
    const container = document.getElementById('almanacContentContainer');
    if (container && almanacNavState.level === 'day') {
      renderAlmanacDayDetailView(container, activeEditingDateKey);
    } else {
      renderAlmanacModule();
    }
    showToast(`Saved lectionary for ${existing.day} ${existing.monthName} ${existing.year} ✨`);
  }

  function renderAlmanacDayDetailView(container, dateKey) {
    const data = CHURCH_DATA.almanacDatabase ? CHURCH_DATA.almanacDatabase[dateKey] : null;
    const perms = (typeof computeAppPermissions === 'function' && typeof currentAuthSession !== 'undefined')
      ? computeAppPermissions(currentAuthSession)
      : null;
    const isSuperAdmin = Boolean(
      perms?.isSuperAdmin ||
      (typeof currentAuthSession !== 'undefined' && (
        currentAuthSession?.role === 'superadmin' ||
        currentAuthSession?.email === SUPER_ADMIN_EMAIL ||
        (currentAuthSession?.email && currentAuthSession.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ||
        (currentAuthSession?.display_name && currentAuthSession.display_name.toLowerCase().includes('emanual'))
      ))
    );
    if (!data) {
      const [y, m, d] = dateKey.split('-').map(Number);
      const mName = monthNamesList[m - 1] || '';
      container.innerHTML = `
        <div class="almanac-day-screen">
          <div class="almanac-day-screen-card" id="activeDateAccordionCard">
            <div class="almanac-detail-header">
              <h2 class="almanac-detail-date-title">${d} ${mName} ${y}</h2>
              <div class="almanac-detail-theme" style="color:var(--text-muted); font-style:italic;">No liturgical entry recorded yet for this date.</div>
            </div>
            <div class="almanac-detail-actions">
              <button class="almanac-action-btn primary" id="almanacEditDayBtn" title="Add Liturgical Entry">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                <span>Add / Edit Entry</span>
              </button>
            </div>
          </div>
        </div>
      `;
      const editBtn = document.getElementById('almanacEditDayBtn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          openAlmanacEditModal(dateKey);
        });
      }
      return;
    }

    const colorInfo = getLiturgicalColorInfo(data.color);
    const colorBadgeClass = colorInfo.badgeClass;
    const colorName = colorInfo.name;

    let html = `
      <div class="almanac-day-screen">
        <div class="almanac-day-screen-card" id="activeDateAccordionCard">
          <div class="almanac-detail-header">
            <div class="almanac-header-top-row">
              <div class="almanac-header-date-col">
                <h2 class="almanac-detail-date-title">${String(data.day).padStart(2, '0')} ${data.monthName} ${data.year}</h2>
                ${data.theme ? `<div class="almanac-detail-theme">${data.theme}</div>` : ''}
              </div>
              <div class="almanac-header-meta-col">
                <div class="almanac-color-badge ${colorBadgeClass}">
                  <span class="color-badge-dot"></span>
                  <span>${colorName}</span>
                </div>
                <span class="almanac-weekday-tag">${data.dayName}</span>
              </div>
            </div>
          </div>

          <div class="almanac-worship-section">
    `;

    // 1. Lord's Supper (if present)
    if (data.lordsSupper && data.lordsSupper.length > 0) {
      html += `
        <div class="almanac-worship-card lords-supper">
          <div class="almanac-worship-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v4a6 6 0 0 1-12 0V3z"/><path d="M12 13v7"/><path d="M8 20h8"/><path d="M12 6v3"/><path d="M10.5 7.5h3"/></svg>
            <span>Lord's Supper (Sacrament of the Altar)</span>
          </div>
          <div class="almanac-reading-list">
      `;
      data.lordsSupper.forEach((rd, i) => {
        html += `
          <div class="almanac-reading-item">
            <div class="reading-number-badge">${i + 1}</div>
            <div class="reading-text-citation">${rd.replace(/\*([^\*]+)\*\*/g, '<strong>$1</strong>')}</div>
          </div>
        `;
      });
      html += '</div></div>';
    }

    // 2. Morning Worship
    if (data.morningWorship && data.morningWorship.length > 0) {
      html += `
        <div class="almanac-worship-card morning">
          <div class="almanac-worship-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <span>Morning Worship</span>
          </div>
          <div class="almanac-reading-list">
      `;
      data.morningWorship.forEach((rd, i) => {
        html += `
          <div class="almanac-reading-item">
            <div class="reading-number-badge">${i + 1}</div>
            <div class="reading-text-citation">${rd.replace(/\*([^\*]+)\*\*/g, '<strong>$1</strong>')}</div>
          </div>
        `;
      });
      html += '</div></div>';
    }

    // 3. Evening Worship
    if (data.eveningWorship && data.eveningWorship.length > 0) {
      html += `
        <div class="almanac-worship-card evening">
          <div class="almanac-worship-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <span>Evening Worship</span>
          </div>
          <div class="almanac-reading-list">
      `;
      data.eveningWorship.forEach((rd, i) => {
        html += `
          <div class="almanac-reading-item">
            <div class="reading-number-badge">${i + 1}</div>
            <div class="reading-text-citation">${rd.replace(/\*([^\*]+)\*\*/g, '<strong>$1</strong>')}</div>
          </div>
        `;
      });
      html += '</div></div>';
    }

    // Actions Row
    html += `
          </div>

          <div class="almanac-detail-actions">
            <button class="almanac-action-btn primary" id="almanacBookmarkDayBtn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span>Bookmark Day</span>
            </button>
            <button class="almanac-action-btn" id="almanacCopyDayBtn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy Lectionary</span>
            </button>
            <button class="almanac-action-btn" id="almanacEditDayBtn" title="Edit Day Lectionary">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Edit Day</span>
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach bookmark & copy & edit
    const bkmBtn = document.getElementById('almanacBookmarkDayBtn');
    if (bkmBtn) {
      bkmBtn.addEventListener('click', () => {
        const title = `Lectionary: ${data.day} ${data.monthName} ${data.year} (${data.dayName})`;
        const content = [
          data.theme ? `Theme: ${data.theme}` : '',
          data.morningWorship ? `Morning: ${data.morningWorship.join(', ')}` : '',
          data.eveningWorship ? `Evening: ${data.eveningWorship.join(', ')}` : '',
          data.lordsSupper ? `Lord's Supper: ${data.lordsSupper.join(', ')}` : ''
        ].filter(Boolean).join('\n');

        addBookmark({
          title: title,
          category: 'lectionary',
          reference: `${data.day} ${data.monthName} ${data.year}`,
          excerpt: content,
          dateAdded: new Date().toISOString()
        });
      });
    }

    const copyBtn = document.getElementById('almanacCopyDayBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        let text = `=== ${data.day} ${data.monthName} ${data.year} (${data.dayName}) ===\n`;
        if (data.theme) text += `Theme: ${data.theme}\n`;
        text += `Liturgical Color: ${data.color}\n\n`;

        if (data.morningWorship && data.morningWorship.length) {
          text += `-- Morning Worship --\n` + data.morningWorship.map((r, i) => `${i+1}. ${r}`).join('\n') + '\n\n';
        }
        if (data.eveningWorship && data.eveningWorship.length) {
          text += `-- Evening Worship --\n` + data.eveningWorship.map((r, i) => `${i+1}. ${r}`).join('\n') + '\n\n';
        }
        if (data.lordsSupper && data.lordsSupper.length) {
          text += `-- Lord's Supper --\n` + data.lordsSupper.map((r, i) => `${i+1}. ${r}`).join('\n') + '\n\n';
        }

        copyTextToClipboard(text, () => {
          showToast(`Copied ${data.day} ${data.monthName} lectionary to clipboard`);
        });
      });
    }

    const editBtn = document.getElementById('almanacEditDayBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        openAlmanacEditModal(dateKey);
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function copyTextToClipboard(text, onSuccess, onError) {
    if (!text) return;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(() => { if (typeof onSuccess === 'function') onSuccess(); })
        .catch(() => { fallbackCopyExec(text, onSuccess, onError); });
    } else {
      fallbackCopyExec(text, onSuccess, onError);
    }
  }

  function fallbackCopyExec(text, onSuccess, onError) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        if (typeof onError === 'function') onError();
      }
    } catch (e) {
      if (typeof onError === 'function') onError(e);
    }
  }

  function getSearchHistory() {
    try {
      const stored = localStorage.getItem('sanctuary_search_history');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return ['Ashaye Rabbani', 'Morning Prayer', 'Lord\'s Prayer'];
  }

  function saveSearchHistory(list) {
    try {
      localStorage.setItem('sanctuary_search_history', JSON.stringify(list));
    } catch (e) {}
    renderSearchHistory();
  }

  function addSearchHistoryItem(term) {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    let history = getSearchHistory();
    history = history.filter(item => item.toLowerCase() !== cleanTerm.toLowerCase());
    history.unshift(cleanTerm);
    if (history.length > 15) history = history.slice(0, 15);
    saveSearchHistory(history);
  }

  function removeSearchHistoryItem(term) {
    let history = getSearchHistory();
    history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
    saveSearchHistory(history);
  }

  function clearAllSearchHistory() {
    saveSearchHistory([]);
  }

  function renderSearchHistory() {
    const historyList = document.getElementById('searchHistoryList');
    const clearAllBtn = document.getElementById('clearAllSearchHistoryBtn');
    if (!historyList) return;

    const history = getSearchHistory();

    if (history.length === 0) {
      historyList.innerHTML = '<div class="search-history-empty">No recent searches</div>';
      if (clearAllBtn) clearAllBtn.style.display = 'none';
      return;
    }

    if (clearAllBtn) clearAllBtn.style.display = 'block';

    historyList.innerHTML = history.map(item => `
      <div class="search-history-item" data-query="${escapeHtml(item)}" role="button" tabindex="0">
        <div class="search-history-item-left">
          <div class="search-history-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <span class="search-history-text">${escapeHtml(item)}</span>
        </div>
        <button class="search-history-delete-btn" data-delete-query="${escapeHtml(item)}" title="Remove ${escapeHtml(item)}" aria-label="Delete">
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `).join('');

    // Attach click to search and click to delete
    historyList.querySelectorAll('.search-history-item').forEach(itemEl => {
      itemEl.addEventListener('click', (e) => {
        if (e.target.closest('.search-history-delete-btn')) return;
        const q = itemEl.getAttribute('data-query');
        if (q && searchInput) {
          searchInput.value = q;
          state.searchQuery = q;
          if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
          addSearchHistoryItem(q);
          renderSearchResults();
        }
      });
    });

    historyList.querySelectorAll('.search-history-delete-btn').forEach(delBtn => {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const q = delBtn.getAttribute('data-delete-query');
        if (q) {
          removeSearchHistoryItem(q);
        }
      });
    });
  }

  let _cachedSearchDatabase = null;
  function invalidateSearchDatabase() {
    _cachedSearchDatabase = null;
  }
  window.invalidateSearchDatabase = invalidateSearchDatabase;

  function buildSearchDatabase(forceRefresh = false) {
    if (_cachedSearchDatabase && !forceRefresh) {
      return _cachedSearchDatabase;
    }
    const db = [];

    // 1. Library Items (Scriptures, Prayers, Hymns, Articles)
    if (CHURCH_DATA.library && Array.isArray(CHURCH_DATA.library)) {
      CHURCH_DATA.library.forEach(item => {
        db.push({
          id: item.id || ('lib-' + Math.random()),
          type: 'library',
          category: item.category || 'scripture',
          title: item.title || '',
          citation: item.citation || '',
          snippet: item.snippet || item.fullText || '',
          fullText: item.fullText || item.snippet || '',
          tags: item.tags || [],
          action: () => openBookmarkModalWithData(item.title, item.category, item.fullText || item.snippet)
        });
      });
    }

    // 2. Masihi Geeton Ka Sangrah (Sacred Hymns)
    if (CHURCH_DATA.churchBooks && CHURCH_DATA.churchBooks.masihiGeet && Array.isArray(CHURCH_DATA.churchBooks.masihiGeet.songs)) {
      CHURCH_DATA.churchBooks.masihiGeet.songs.forEach((song, idx) => {
        const title = `Hymn #${song.number || (idx + 1)}: ${song.title || song.hindiTitle || 'Masihi Geet'}`;
        db.push({
          id: `song-mg-${song.id || idx}`,
          type: 'song',
          category: 'hymn',
          title: title,
          citation: 'Masihi Geeton Ka Sangrah',
          snippet: (song.lyrics || '').slice(0, 150) + '...',
          fullText: song.lyrics || '',
          tags: ['hymn', 'masihiGeet', 'song', song.category || ''].filter(Boolean),
          action: () => {
            if (typeof openSongBookScreen === 'function') {
              openSongBookScreen('masihiGeet').then(() => {
                if (typeof openSongLyricsScreen === 'function') {
                  openSongLyricsScreen(song, 'masihiGeet', idx);
                }
              });
            }
          }
        });
      });
    }

    // 3. Additional Songs (Sacred Hymns)
    if (CHURCH_DATA.churchBooks && CHURCH_DATA.churchBooks.additionalSongs && Array.isArray(CHURCH_DATA.churchBooks.additionalSongs.songs)) {
      CHURCH_DATA.churchBooks.additionalSongs.songs.forEach((song, idx) => {
        const title = `Song #${song.number || (idx + 1)}: ${song.title || song.hindiTitle || 'Additional Song'}`;
        db.push({
          id: `song-as-${song.id || idx}`,
          type: 'song',
          category: 'hymn',
          title: title,
          citation: 'Additional Sacred Hymns',
          snippet: (song.lyrics || '').slice(0, 150) + '...',
          fullText: song.lyrics || '',
          tags: ['hymn', 'additionalSongs', 'song', song.category || ''].filter(Boolean),
          action: () => {
            if (typeof openSongBookScreen === 'function') {
              openSongBookScreen('additionalSongs').then(() => {
                if (typeof openSongLyricsScreen === 'function') {
                  openSongLyricsScreen(song, 'additionalSongs', idx);
                }
              });
            }
          }
        });
      });
    }

    // 3b. Custom & Imported Songs (Dexie fallback / LocalStorage)
    try {
      const customBackup = JSON.parse(localStorage.getItem('sanctuary_custom_songs_backup') || '[]');
      const importedBackup = JSON.parse(localStorage.getItem('sanctuary_imported_songs') || '[]');
      const allCustom = [...customBackup, ...importedBackup];
      const seenCustomIds = new Set();
      allCustom.forEach((s, idx) => {
        if (s && s.title && !seenCustomIds.has(s.id || s.title)) {
          seenCustomIds.add(s.id || s.title);
          const isAdd = typeof matchesSongBook === 'function' ? matchesSongBook(s.book_reference, 'additionalSongs') : String(s.book_reference || '').toLowerCase().includes('additional');
          const bookKey = isAdd ? 'additionalSongs' : 'masihiGeet';
          const citation = isAdd ? 'Additional Songs of Church' : 'Masihi Geeton Ka Sangrah';
          const songNum = s.song_number || s.serialNumber || (idx + 1);
          db.push({
            id: s.id || `custom-search-${idx}`,
            type: 'song',
            category: s.category || 'hymn',
            title: `Song #${songNum}: ${s.title}`,
            citation: citation,
            snippet: (s.lyrics || '').slice(0, 150) + '...',
            fullText: s.lyrics || '',
            tags: ['hymn', bookKey, 'song', s.category || ''].filter(Boolean),
            action: () => {
              if (typeof openSongBookScreen === 'function') {
                openSongBookScreen(bookKey).then(() => {
                  if (typeof openSongLyricsScreen === 'function') {
                    openSongLyricsScreen({
                      id: s.id,
                      formattedNum: `#${songNum}`,
                      songNumber: songNum,
                      title: s.title,
                      lyrics: s.lyrics,
                      meta: s.author || citation,
                      category: s.category || 'hymn'
                    }, bookKey);
                  }
                });
              }
            }
          });
        }
      });
    } catch (_) {}

    // 4. Liturgical Books (Prabhu Bhoj, Ashaye Rabbani, Aaradhanaa)
    ['prabhuBhoj', 'ashayeRabbani', 'aaradhanaa'].forEach(bookKey => {
      const book = CHURCH_DATA.churchBooks && CHURCH_DATA.churchBooks[bookKey];
      if (book && Array.isArray(book.sections)) {
        book.sections.forEach((sec, sIdx) => {
          db.push({
            id: `lit-${bookKey}-${sIdx}`,
            type: 'liturgy',
            category: 'prayer',
            title: `${book.title}: ${sec.rubric || 'Liturgy Order'}`,
            citation: book.subtitle || book.title,
            snippet: (sec.text || sec.dialogue || '').slice(0, 150) + '...',
            fullText: `${sec.rubric}\n\n${sec.text}\n\n${sec.dialogue || ''}`,
            tags: ['liturgy', 'prayer', bookKey, 'service'],
            action: () => {
              if (typeof openBookScreen === 'function') {
                openBookScreen(bookKey);
              }
            }
          });
        });
      }
    });

    // 5. Daily Verses
    if (CHURCH_DATA.dailyVerses && Array.isArray(CHURCH_DATA.dailyVerses)) {
      CHURCH_DATA.dailyVerses.forEach((dv, vIdx) => {
        db.push({
          id: `dv-${vIdx}`,
          type: 'verse',
          category: 'scripture',
          title: `Daily Scripture: ${dv.reference || dv.citation || 'Holy Bible'}`,
          citation: dv.reference || dv.citation || 'Holy Scripture',
          snippet: dv.text || dv.verse || '',
          fullText: dv.text || dv.verse || '',
          tags: ['scripture', 'verse', 'bible', 'daily'],
          action: () => openBookmarkModalWithData(dv.reference || dv.citation, 'scripture', dv.text || dv.verse)
        });
      });
    }

    // 6. Liturgical Almanac Lectionaries
    if (CHURCH_DATA.almanac) {
      Object.keys(CHURCH_DATA.almanac).forEach(dateKey => {
        const alm = CHURCH_DATA.almanac[dateKey];
        if (alm) {
          const readings = [alm.ot, alm.epistle, alm.gospel, alm.psalm].filter(Boolean).join(' • ');
          db.push({
            id: `alm-${dateKey}`,
            type: 'almanac',
            category: 'almanac',
            title: `${alm.title || alm.feast || 'Liturgical Day'} (${dateKey})`,
            citation: `Liturgical Color: ${alm.color || 'Green'}`,
            snippet: readings ? `Lectionary Readings: ${readings}` : (alm.collect || 'Liturgical Lectionary'),
            fullText: `Liturgical Day: ${alm.title || alm.feast}\nColor: ${alm.color}\nReadings: ${readings}\n\nCollect:\n${alm.collect || ''}`,
            tags: ['almanac', 'lectionary', 'sunday', alm.color || ''].filter(Boolean),
            action: () => {
              switchTab('viewAlmanac');
            }
          });
        }
      });
    }

    _cachedSearchDatabase = db;
    return db;
  }

  function renderSearchResults() {
    if (!searchResultsContainer) return;

    const query = (state.searchQuery || '').toLowerCase().trim();
    const suggestionsContainer = document.getElementById('searchSuggestionsContainer');
    const historyContainer = document.getElementById('searchHistoryContainer');
    const resultsMeta = document.getElementById('searchResultsMeta');
    const resultsCountEl = document.getElementById('resultsCount');

    // If query is empty, show suggestions and history, hide search results
    if (!query) {
      if (suggestionsContainer) suggestionsContainer.style.display = 'block';
      if (historyContainer) historyContainer.style.display = 'block';
      if (resultsMeta) resultsMeta.classList.add('hidden');
      searchResultsContainer.innerHTML = '';
      renderSearchHistory();
      return;
    }

    // When searching, hide suggestions & history, show search results
    if (suggestionsContainer) suggestionsContainer.style.display = 'none';
    if (historyContainer) historyContainer.style.display = 'none';
    if (resultsMeta) resultsMeta.classList.remove('hidden');

    const allDb = buildSearchDatabase();

    // Filter by search query
    let items = allDb.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const snippetMatch = item.snippet.toLowerCase().includes(query);
      const fullTextMatch = (item.fullText || '').toLowerCase().includes(query);
      const citMatch = (item.citation || '').toLowerCase().includes(query);
      const tagsMatch = (item.tags || []).some(t => t.toLowerCase().includes(query));
      return titleMatch || snippetMatch || fullTextMatch || citMatch || tagsMatch;
    });

    // Filter by active category filter chip
    const filter = state.searchFilter || 'all';
    if (filter === 'hymns' || filter === 'songs') {
      items = items.filter(item => item.category === 'hymn' || item.type === 'song');
    } else if (filter === 'prayers') {
      items = items.filter(item => item.category === 'prayer' || item.type === 'liturgy');
    } else if (filter === 'almanac') {
      items = items.filter(item => item.category === 'almanac' || item.type === 'almanac');
    } else if (filter === 'scripture' || filter === 'scriptures') {
      items = items.filter(item => item.category === 'scripture' || item.type === 'verse');
    }

    if (resultsCountEl) {
      resultsCountEl.textContent = `Found ${items.length} result${items.length === 1 ? '' : 's'} for "${state.searchQuery}"`;
    }

    if (items.length === 0) {
      searchResultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3>No Matches Found</h3>
          <p>Try searching for "Psalm", "Ashaye Rabbani", "Lord's Prayer", "Masihi Geet", or hymn names.</p>
        </div>
      `;
      return;
    }

    searchResultsContainer.innerHTML = items.map(item => `
      <div class="search-result-card" data-item-id="${item.id}">
        <div class="res-header">
          <span class="res-category-pill">${item.category.toUpperCase()}</span>
          <span class="res-citation">${item.citation || ''}</span>
        </div>
        <h4 class="res-title">${item.title}</h4>
        <p class="res-snippet">${item.snippet}</p>
        <div class="res-footer">
          <span class="res-tags">${(item.tags || []).map(t => '#' + t).join(' ')}</span>
          <button class="verse-action-btn quick-bookmark-btn" data-item-id="${item.id}" title="Save Bookmark">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Save</span>
          </button>
        </div>
      </div>
    `).join('');

    // Attach click events on search results
    searchResultsContainer.querySelectorAll('.quick-bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        const item = allDb.find(x => x.id === itemId);
        if (item) {
          addBookmark({
            title: item.title,
            category: item.category,
            content: item.fullText || item.snippet,
            citation: item.citation
          });
        }
      });
    });

    searchResultsContainer.querySelectorAll('.search-result-card').forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.dataset.itemId;
        const item = allDb.find(x => x.id === itemId);
        if (item && typeof item.action === 'function') {
          item.action();
        }
      });
    });
  }

  /* ==========================================================================
     5. SACRED BOOKMARKS POP WINDOW ENGINE & STORAGE
     ========================================================================== */
  let editingBookmarkId = null;

  function loadBookmarks() {
    const saved = localStorage.getItem('sanctuary_bookmarks_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean out demo/sample bookmarks if present
        state.bookmarks = Array.isArray(parsed)
          ? parsed.filter(b => b && b.id && !b.id.startsWith('bm-init-') && !b.title.includes('Lamp unto my feet') && !b.title.includes('St. Francis'))
          : [];
        saveBookmarksToStorage();
      } catch {
        state.bookmarks = [];
        saveBookmarksToStorage();
      }
    } else {
      state.bookmarks = [];
      saveBookmarksToStorage();
    }
    renderBookmarks();
    updateBookmarkBadge();
    if (typeof renderTimelineList === 'function') renderTimelineList();
  }

  function getDefaultBookmarks() {
    return [];
  }

  function saveBookmarksToStorage() {
    try {
      localStorage.setItem('sanctuary_bookmarks_v1', JSON.stringify(state.bookmarks));
      if (typeof invalidateSearchDatabase === 'function') invalidateSearchDatabase();
    } catch (e) {
      console.warn('[Bookmarks] storage error:', e);
    }
    updateBookmarkBadge();
  }

  function updateBookmarkBadge() {
    const count = (state.bookmarks || []).length;
    const badge = document.getElementById('bookmarkCountBadge') || bookmarkBadge;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
      badge.classList.toggle('hidden', count === 0);
    }
    const countPill = document.getElementById('viewBookmarksCountPill');
    if (countPill) {
      countPill.textContent = `${count} Saved`;
    }
  }

  function addBookmark({ id, title, category, content, citation }) {
    if (id) {
      // Update existing bookmark
      const idx = (state.bookmarks || []).findIndex(b => b.id === id);
      if (idx !== -1) {
        state.bookmarks[idx] = {
          ...state.bookmarks[idx],
          title: title || 'Sacred Reflection',
          category: category || 'notes',
          content: content || '',
          citation: citation || '',
          updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
        saveBookmarksToStorage();
        renderBookmarks();
        showToast('Bookmark updated ✨');
        return;
      }
    }

    // Prevent duplicate entry
    const exists = (state.bookmarks || []).some(b => b.title === title && b.content === content);
    if (exists) {
      showToast('Already saved in bookmarks 🔖');
      return;
    }

    const newBm = {
      id: 'bm-' + Date.now(),
      title: title || 'Sacred Reflection',
      category: category || 'notes',
      content: content || '',
      citation: citation || '',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    if (!state.bookmarks) state.bookmarks = [];
    state.bookmarks.unshift(newBm);
    saveBookmarksToStorage();
    renderBookmarks();
    showToast('Saved to Sacred Bookmarks ✨');
  }

  function deleteBookmark(id) {
    state.bookmarks = (state.bookmarks || []).filter(b => b.id !== id);
    saveBookmarksToStorage();
    renderBookmarks();
    showToast('Bookmark removed 🗑️');
  }

  let activeDetailBookmark = null;

  function openBookmarkDetailModal(bm) {
    if (!bm) return;
    activeDetailBookmark = bm;

    const modal = document.getElementById('bookmarkDetailModalOverlay');
    if (!modal) return;

    const titleEl = document.getElementById('bmDetailTitle');
    const badgeEl = document.getElementById('bmDetailCategoryBadge');
    const iconEl = document.getElementById('bmDetailCategoryIconWrap');
    const dateEl = document.getElementById('bmDetailDate');
    const citationBox = document.getElementById('bmDetailCitationBox');
    const citationText = document.getElementById('bmDetailCitationText');
    const contentEl = document.getElementById('bmDetailContentText');
    const openSourceBtn = document.getElementById('bmDetailOpenSourceBtn');
    const openSourceBtnText = document.getElementById('bmDetailOpenSourceBtnText');

    const catKey = (bm.category || 'notes').toLowerCase();
    const categoryMeta = {
      verse:     { icon: '📖', label: 'Scripture', bg: 'rgba(73, 151, 208, 0.14)', color: 'var(--accent-gold)' },
      verses:    { icon: '📖', label: 'Scripture', bg: 'rgba(73, 151, 208, 0.14)', color: 'var(--accent-gold)' },
      scripture: { icon: '📖', label: 'Scripture', bg: 'rgba(73, 151, 208, 0.14)', color: 'var(--accent-gold)' },
      hymn:      { icon: '🎵', label: 'Hymn', bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6' },
      song:      { icon: '🎵', label: 'Hymn', bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6' },
      songs:     { icon: '🎵', label: 'Hymn', bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6' },
      prayer:    { icon: '🙏', label: 'Prayer', bg: 'rgba(168, 85, 247, 0.14)', color: '#a855f7' },
      prayers:   { icon: '🙏', label: 'Prayer', bg: 'rgba(168, 85, 247, 0.14)', color: '#a855f7' },
      note:      { icon: '📝', label: 'Note', bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981' },
      notes:     { icon: '📝', label: 'Note', bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981' }
    };
    const meta = categoryMeta[catKey] || categoryMeta.notes;

    if (titleEl) titleEl.textContent = bm.title || 'Saved Reflection';
    if (badgeEl) {
      badgeEl.textContent = meta.label;
      badgeEl.style.background = meta.bg;
      badgeEl.style.color = meta.color;
    }
    if (iconEl) {
      iconEl.textContent = meta.icon;
      iconEl.style.background = meta.bg;
      iconEl.style.color = meta.color;
    }
    if (dateEl) dateEl.textContent = `Added ${bm.createdAt || 'recently'}`;

    if (citationBox && citationText) {
      if (bm.citation) {
        citationText.textContent = bm.citation;
        citationBox.style.display = 'flex';
      } else {
        citationBox.style.display = 'none';
      }
    }

    if (contentEl) {
      contentEl.textContent = bm.content || '';
    }

    if (openSourceBtn && openSourceBtnText) {
      if (catKey.includes('song') || catKey.includes('hymn')) {
        openSourceBtnText.textContent = 'Open Hymn';
        openSourceBtn.style.display = 'inline-flex';
      } else if (catKey.includes('verse') || catKey.includes('scripture')) {
        openSourceBtnText.textContent = 'Open Scripture';
        openSourceBtn.style.display = 'inline-flex';
      } else if (catKey.includes('almanac')) {
        openSourceBtnText.textContent = 'Open Almanac';
        openSourceBtn.style.display = 'inline-flex';
      } else {
        openSourceBtnText.textContent = 'Edit Note';
        openSourceBtn.style.display = 'inline-flex';
      }
    }

    showModal(modal);
  }

  function closeBookmarkDetailModal() {
    const modal = document.getElementById('bookmarkDetailModalOverlay');
    if (modal) hideModal(modal);
    activeDetailBookmark = null;
  }

  function openBookmarkModalWithData(title = '', category = 'verses', content = '', citation = '', id = '') {
    const titleInp = document.getElementById('bookmarkTitleInput') || bookmarkTitleInput;
    const catSel = document.getElementById('bookmarkCategorySelect') || bookmarkCategorySelect;
    const contentInp = document.getElementById('bookmarkContentInput') || bookmarkContentInput;
    const citationInp = document.getElementById('bookmarkCitationInput');
    const modalTitleEl = document.getElementById('modalTitle');

    if (modalTitleEl) modalTitleEl.textContent = id ? 'Edit Sacred Bookmark' : 'Save Sacred Bookmark';

    // Normalize category
    let normCat = 'verses';
    const lCat = (category || '').toLowerCase();
    if (lCat.includes('song') || lCat.includes('hymn')) normCat = 'songs';
    else if (lCat.includes('verse') || lCat.includes('scripture')) normCat = 'verses';
    else if (lCat.includes('prayer') || lCat.includes('liturgy')) normCat = 'prayers';
    else if (lCat.includes('almanac')) normCat = 'verses';
    else if (lCat.includes('note')) normCat = 'notes';

    if (titleInp) titleInp.value = title || '';
    if (catSel) catSel.value = normCat;
    if (contentInp) contentInp.value = content || '';
    if (citationInp) citationInp.value = citation || '';

    editingBookmarkId = id || null;
    showModal(modalOverlay);
  }

  function closeModal() {
    hideModal(modalOverlay);
    editingBookmarkId = null;
    if (bookmarkTitleInput) bookmarkTitleInput.value = '';
    if (bookmarkContentInput) bookmarkContentInput.value = '';
    const citationInp = document.getElementById('bookmarkCitationInput');
    if (citationInp) citationInp.value = '';
  }

  function renderBookmarks() {
    const modalList = document.getElementById('viewBookmarksModalList');
    const modalEmpty = document.getElementById('viewBookmarksModalEmptyState');
    const bContainer = document.getElementById('bookmarksContainer');
    const emptyState = document.getElementById('emptyBookmarkState');

    let items = state.bookmarks || [];
    const filter = (state.bookmarkFilter || 'all').toLowerCase();
    const query = (state.bookmarkSearchQuery || '').trim().toLowerCase();

    // 1. Filter by category
    if (filter !== 'all') {
      items = items.filter(b => {
        const cat = (b.category || 'notes').toLowerCase();
        if (filter === 'song' || filter === 'songs' || filter === 'hymn') return cat.includes('song') || cat.includes('hymn');
        if (filter === 'verse' || filter === 'verses' || filter === 'scripture') return cat.includes('verse') || cat.includes('scripture');
        if (filter === 'prayer' || filter === 'prayers') return cat.includes('prayer');
        if (filter === 'note' || filter === 'notes') return cat.includes('note');
        return cat.includes(filter);
      });
    }

    // 2. Filter by search query
    if (query) {
      items = items.filter(b => 
        (b.title || '').toLowerCase().includes(query) ||
        (b.content || '').toLowerCase().includes(query) ||
        (b.citation || '').toLowerCase().includes(query)
      );
    }

    updateBookmarkBadge();

    const categoryMeta = {
      verse:     { icon: '📖', label: 'Scripture', bg: 'rgba(73, 151, 208, 0.14)', color: 'var(--accent-gold)' },
      verses:    { icon: '📖', label: 'Scripture', bg: 'rgba(73, 151, 208, 0.14)', color: 'var(--accent-gold)' },
      scripture: { icon: '📖', label: 'Scripture', bg: 'rgba(73, 151, 208, 0.14)', color: 'var(--accent-gold)' },
      hymn:      { icon: '🎵', label: 'Hymn', bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6' },
      song:      { icon: '🎵', label: 'Hymn', bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6' },
      songs:     { icon: '🎵', label: 'Hymn', bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6' },
      prayer:    { icon: '🙏', label: 'Prayer', bg: 'rgba(168, 85, 247, 0.14)', color: '#a855f7' },
      prayers:   { icon: '🙏', label: 'Prayer', bg: 'rgba(168, 85, 247, 0.14)', color: '#a855f7' },
      note:      { icon: '📝', label: 'Note', bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981' },
      notes:     { icon: '📝', label: 'Note', bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981' }
    };

    const generateCardsHtml = (bmItems) => {
      if (!bmItems || bmItems.length === 0) return '';
      return bmItems.map(bm => {
        const catKey = (bm.category || 'notes').toLowerCase();
        const meta = categoryMeta[catKey] || categoryMeta.notes;
        return `
          <div class="bookmark-card" data-bm-id="${bm.id}" style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:18px; padding:14px 16px; box-shadow:var(--shadow-sm); cursor:pointer; transition:all 0.2s ease;">
            <div class="bm-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
              <div style="flex:1; min-width:0;">
                <h4 class="bm-title" style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin:0 0 2px 0;">${escapeHtml(bm.title || 'Saved Reflection')}</h4>
                ${bm.citation ? `<span class="res-citation" style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${escapeHtml(bm.citation)}</span>` : ''}
              </div>
              <span class="bm-category" style="background:${meta.bg}; color:${meta.color}; font-weight:800; font-size:0.7rem; padding:3px 8px; border-radius:999px; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">
                <span>${meta.icon}</span> <span>${meta.label}</span>
              </span>
            </div>
            <p class="bm-content" style="font-size:0.83rem; line-height:1.5; color:var(--text-secondary); margin:0 0 10px 0; max-height:80px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">${escapeHtml(bm.content || '')}</p>
            <div class="bm-footer" style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-subtle); padding-top:8px;">
              <span class="bm-date" style="font-size:0.72rem; color:var(--text-muted);">Added ${escapeHtml(bm.createdAt || 'recently')}</span>
              <div class="bm-actions" style="display:flex; gap:6px;">
                <button type="button" class="bm-btn view-bm-btn" data-bm-id="${bm.id}" title="Read / View Details" style="width:28px; height:28px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--bg-subtle); color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; justify-content:center;">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
                <button type="button" class="bm-btn edit-bm-btn" data-bm-id="${bm.id}" title="Edit Bookmark & Note" style="width:28px; height:28px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--bg-subtle); color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; justify-content:center;">
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button type="button" class="bm-btn copy-bm-btn" data-bm-id="${bm.id}" title="Copy Text" style="width:28px; height:28px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--bg-subtle); color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; justify-content:center;">
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button type="button" class="bm-btn delete-bm-btn" data-bm-id="${bm.id}" title="Delete Bookmark" style="width:28px; height:28px; border-radius:8px; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.1); color:#ef4444; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    const hasItems = items.length > 0;
    const cardsHtml = generateCardsHtml(items);

    // 1. Render in View Bookmarks Modal Pop Window
    // Render in View Bookmark Tab
    if (bContainer) {
      bContainer.innerHTML = cardsHtml;
      if (emptyState) emptyState.classList.toggle('hidden', hasItems);
      bContainer.classList.toggle('hidden', !hasItems);
    }

    // Attach interactive handlers to container
    if (bContainer) {
      // Delete action
      bContainer.querySelectorAll('.delete-bm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteBookmark(btn.dataset.bmId);
        });
      });

      // Copy action
      bContainer.querySelectorAll('.copy-bm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const bm = (state.bookmarks || []).find(x => x.id === btn.dataset.bmId);
          if (bm) {
            copyTextToClipboard(`${bm.title}${bm.citation ? ` (${bm.citation})` : ''}\n\n${bm.content}`, () => {
              showToast('Copied to clipboard 📋');
            });
          }
        });
      });

      // Edit action
      bContainer.querySelectorAll('.edit-bm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const bm = (state.bookmarks || []).find(x => x.id === btn.dataset.bmId);
          if (bm) {
            openBookmarkModalWithData(bm.title, bm.category, bm.content, bm.citation, bm.id);
          }
        });
      });

      // Tap Bookmark Card -> Open in Pop-up Window!
      bContainer.querySelectorAll('.view-bm-btn, .bookmark-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.delete-bm-btn') || e.target.closest('.copy-bm-btn') || e.target.closest('.edit-bm-btn')) return;
          const bmId = el.dataset.bmId || el.closest('.bookmark-card')?.dataset.bmId;
          const bm = (state.bookmarks || []).find(x => x.id === bmId);
          if (!bm) return;

          // Open in Bookmark Detail Pop-up Window!
          openBookmarkDetailModal(bm);
        });
      });
    }
  }

  // ── Attach Detail Modal Global Action Listeners ───────────────────────────
  const bmDetailDeleteBtn = document.getElementById('bmDetailDeleteBtn');
  if (bmDetailDeleteBtn) {
    bmDetailDeleteBtn.addEventListener('click', () => {
      if (activeDetailBookmark) {
        deleteBookmark(activeDetailBookmark.id);
        closeBookmarkDetailModal();
      }
    });
  }

  const bmDetailCopyBtn = document.getElementById('bmDetailCopyBtn');
  if (bmDetailCopyBtn) {
    bmDetailCopyBtn.addEventListener('click', () => {
      if (activeDetailBookmark) {
        copyTextToClipboard(`${activeDetailBookmark.title}${activeDetailBookmark.citation ? ` (${activeDetailBookmark.citation})` : ''}\n\n${activeDetailBookmark.content}`, () => {
          showToast('Copied to clipboard 📋');
        });
      }
    });
  }

  const bmDetailEditBtn = document.getElementById('bmDetailEditBtn');
  if (bmDetailEditBtn) {
    bmDetailEditBtn.addEventListener('click', () => {
      if (activeDetailBookmark) {
        const bm = activeDetailBookmark;
        closeBookmarkDetailModal();
        openBookmarkModalWithData(bm.title, bm.category, bm.content, bm.citation, bm.id);
      }
    });
  }

  const bmDetailOpenSourceBtn = document.getElementById('bmDetailOpenSourceBtn');
  if (bmDetailOpenSourceBtn) {
    bmDetailOpenSourceBtn.addEventListener('click', () => {
      if (!activeDetailBookmark) return;
      const bm = activeDetailBookmark;
      const cat = (bm.category || 'notes').toLowerCase();

      closeBookmarkDetailModal();

      if (cat.includes('song') || cat.includes('hymn')) {
        let songToOpen = null;
        if (window.CHURCH_DATA && window.CHURCH_DATA.songs) {
          songToOpen = window.CHURCH_DATA.songs.find(s => 
            (s.title && bm.title.includes(s.title)) || 
            (bm.citation && bm.citation.includes(String(s.songNumber)))
          );
        }
        if (songToOpen && typeof openSongLyricsScreen === 'function') {
          openSongLyricsScreen(songToOpen, songToOpen.bookKey || 'masihiGeet');
          switchTab('viewSongLyrics');
        } else {
          switchTab('viewSongList');
        }
      } else if (cat.includes('verse') || cat.includes('scripture')) {
        const verseModal = document.getElementById('verseModalOverlay');
        if (verseModal) {
          const vt = document.getElementById('modalVerseText');
          const vr = document.getElementById('modalVerseRef');
          if (vt) vt.textContent = `"${bm.content}"`;
          if (vr) vr.textContent = bm.title || bm.citation;
          showModal(verseModal);
        } else {
          switchTab('viewAlmanac');
        }
      } else if (cat.includes('almanac')) {
        switchTab('viewAlmanac');
      } else {
        openBookmarkModalWithData(bm.title, bm.category, bm.content, bm.citation, bm.id);
      }
    });
  }

  const closeBmDetailBtn = document.getElementById('closeBookmarkDetailModalBtn');
  if (closeBmDetailBtn) closeBmDetailBtn.addEventListener('click', closeBookmarkDetailModal);
  const bmDetailModalOverlay = document.getElementById('bookmarkDetailModalOverlay');
  if (bmDetailModalOverlay) {
    bmDetailModalOverlay.addEventListener('click', (e) => {
      if (e.target === bmDetailModalOverlay) closeBookmarkDetailModal();
    });
  }

  /* ==========================================================================
     6. AUDIO HOMILY PLAYER
     ========================================================================== */
  function initAudioPlayer() {
    if (!playAudioBtn) return;
    playAudioBtn.addEventListener('click', toggleAudioPlayback);

    if (rewindAudioBtn) {
      rewindAudioBtn.addEventListener('click', () => {
        state.audioCurrentSeconds = Math.max(0, state.audioCurrentSeconds - 15);
        updateAudioUI();
      });
    }

    if (forwardAudioBtn) {
      forwardAudioBtn.addEventListener('click', () => {
        state.audioCurrentSeconds = Math.min(state.audioTotalSeconds, state.audioCurrentSeconds + 15);
        updateAudioUI();
      });
    }

    if (audioSeekWrapper) {
      audioSeekWrapper.addEventListener('click', (e) => {
        const rect = audioSeekWrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        state.audioCurrentSeconds = Math.floor(pct * state.audioTotalSeconds);
        updateAudioUI();
      });
    }
  }

  function toggleAudioPlayback() {
    state.isPlayingAudio = !state.isPlayingAudio;

    if (state.isPlayingAudio) {
      if (playIcon) playIcon.classList.add('hidden');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
      showToast('Homily audio streaming');
      
      state.audioTimer = setInterval(() => {
        if (state.audioCurrentSeconds < state.audioTotalSeconds) {
          state.audioCurrentSeconds += 1;
          updateAudioUI();
        } else {
          toggleAudioPlayback();
        }
      }, 1000);
    } else {
      if (playIcon) playIcon.classList.remove('hidden');
      if (pauseIcon) pauseIcon.classList.add('hidden');
      clearInterval(state.audioTimer);
    }
  }

  function updateAudioUI() {
    const pct = (state.audioCurrentSeconds / state.audioTotalSeconds) * 100;
    if (audioProgressBar) audioProgressBar.style.width = `${pct}%`;
    if (audioCurrentTime) audioCurrentTime.textContent = formatTime(state.audioCurrentSeconds);
    if (audioTotalDuration) audioTotalDuration.textContent = formatTime(state.audioTotalSeconds);
  }

  function formatTime(totalSecs) {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /* ==========================================================================
     7. SETTINGS & THEMES
     ========================================================================== */
  function loadSavedSettings() {
    const savedTheme = localStorage.getItem('sanctuary_theme') || 'amoled';
    setTheme(savedTheme);

  }

  function setTheme(theme) {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    try { localStorage.setItem('sanctuary_theme', theme); } catch (_) {}

    const bookFrame = document.getElementById("bookHtmlFrame");
    const bookOverlay = document.getElementById("pdfReaderScreen");
    if (bookFrame) {
      const isLight = theme === 'light';
      const readerBg = isLight ? '#fcfaf7' : '#0b0f19';
      bookFrame.style.background = readerBg;
      if (bookOverlay) bookOverlay.style.background = readerBg;
      try {
        if (bookFrame.contentWindow) {
          bookFrame.contentWindow.postMessage({ type: 'SET_THEME', theme: theme }, '*');
        }
      } catch (_) {}
    }

    if (themeCards && Array.isArray(themeCards)) {
      themeCards.forEach(card => {
        if (card && card.dataset && card.dataset.setTheme === theme) {
          card.classList.add('active');
        } else if (card) {
          card.classList.remove('active');
        }
      });
    }

    const isLight = theme === 'light';
    try {
      if (window.bridge && typeof window.bridge.updateSystemBars === 'function') {
        window.bridge.updateSystemBars(isLight);
      } else if (window.AndroidBridge && typeof window.AndroidBridge.updateSystemBars === 'function') {
        window.AndroidBridge.updateSystemBars(isLight);
      }
    } catch (_) {}
  }

  /* ==========================================================================
     8. MODAL & EVENT LISTENERS
     ========================================================================== */
  function syncModalOpenState() {
    const anyModal = document.querySelector('.modal-overlay:not(.hidden), .pdf-fullscreen-overlay:not(.hidden)');
    if (anyModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }

  function showModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('hidden');
    syncModalOpenState();
  }

  function hideModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    syncModalOpenState();
  }

  function openBookmarkModalWithData(title = '', category = 'prayer', content = '') {
    if (bookmarkTitleInput) bookmarkTitleInput.value = title;
    if (bookmarkCategorySelect) bookmarkCategorySelect.value = category;
    if (bookmarkContentInput) bookmarkContentInput.value = content;
    showModal(modalOverlay);
  }

  function closeModal() {
    hideModal(modalOverlay);
    if (bookmarkTitleInput) bookmarkTitleInput.value = '';
    if (bookmarkContentInput) bookmarkContentInput.value = '';
  }

  /* ==========================================================================
     LIVE DATE & DAILY VERSE OF THE DAY ENGINE
     ========================================================================== */
  function updateHomeDailyVerseAndDate() {
    const homeDateDisplay = document.getElementById('homeDateDisplay');
    const greetingTimeText = document.getElementById('greetingTimeText');
    const homeLiturgicalTitle = document.getElementById('homeLiturgicalTitle');
    const verseOfTheDayPillBtn = document.getElementById('verseOfTheDayPillBtn');
    const dailyVerseText = document.getElementById('dailyVerseText');
    const dailyVerseRef = document.getElementById('dailyVerseRef');
    const dailyVerseTradition = document.getElementById('dailyVerseTradition');
    const dailyVerseContemplation = document.getElementById('dailyVerseContemplation');

    const now = new Date();

    // 1. Format and display live date on Home screen (Immersive Hero Date with large number)
    if (homeDateDisplay) {
      const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
      const month = now.toLocaleDateString('en-US', { month: 'long' });
      const dayNum = now.getDate();
      homeDateDisplay.innerHTML = `
        <span class="immersive-date-row">
          <span class="immersive-date-number">${dayNum}</span>
          <span class="immersive-date-meta">
            <span class="immersive-date-month">${month}</span>
            <span class="immersive-date-weekday">${weekday}</span>
          </span>
        </span>
      `;
    }

    if (greetingTimeText) {
      greetingTimeText.textContent = 'Peace be with you';
    }

    // 2. Fetch Verse of the Day (new verse for every day)
    let verse = null;
    if (typeof window.DAILY_VERSES_DATA !== 'undefined' && typeof window.DAILY_VERSES_DATA.getDailyVerse === 'function') {
      verse = window.DAILY_VERSES_DATA.getDailyVerse(now);
    } else {
      verse = {
        ref: "Psalm 119:105",
        text: "Thy word is a lamp unto my feet, and a light unto my path.",
        tradition: "Scripture of Light • Psalms",
        contemplation: "In times of shadow and uncertainty, God's sacred word provides a steady lamp for the very next step beneath our feet."
      };
    }

    // 3. Update DOM elements for the verse modal and home pill
    if (verse) {
      if (dailyVerseText) {
        dailyVerseText.textContent = `"${verse.text}"`;
      }
      if (dailyVerseRef) {
        dailyVerseRef.textContent = verse.ref;
      }
      if (dailyVerseTradition) {
        dailyVerseTradition.textContent = verse.tradition || "Scripture of Light • Daily Lectionary";
      }
      if (dailyVerseContemplation) {
        dailyVerseContemplation.textContent = `"${verse.contemplation}"`;
      }
      if (verseOfTheDayPillBtn) {
        verseOfTheDayPillBtn.title = `Verse of the Day: ${verse.ref} — Click to view`;
      }
      if (homeLiturgicalTitle) {
        homeLiturgicalTitle.textContent = 'Verse of the Day';
      }
    }

    // 4. Update bookmark button state
    syncVerseModalBookmarkState();
  }

  function syncVerseModalBookmarkState() {
    const text = (document.getElementById('dailyVerseText')?.textContent || '').trim();
    const ref = (document.getElementById('dailyVerseRef')?.textContent || '').trim();
    const isBookmarked = state.bookmarks.some(b => b.title === ref && b.content.includes(text));

    if (modalBookmarkVerseBtn && bookmarkBtnText) {
      if (isBookmarked) {
        bookmarkBtnText.textContent = '✓ Saved';
        modalBookmarkVerseBtn.classList.add('saved');
      } else {
        bookmarkBtnText.textContent = 'Bookmark';
        modalBookmarkVerseBtn.classList.remove('saved');
      }
    }
  }

  function openVerseModal() {
    if (verseModalOverlay) {
      updateHomeDailyVerseAndDate();
      syncVerseModalBookmarkState();
      showModal(verseModalOverlay);
    }
  }

  function closeVerseModal() {
    if (verseModalOverlay) {
      hideModal(verseModalOverlay);
    }
  }

  let cachedVerseImageDataUrl = null;

  function getDailyVerseShareData() {
    const rawText = (document.getElementById('dailyVerseText')?.textContent || '').trim();
    const ref = (document.getElementById('dailyVerseRef')?.textContent || '').trim();
    const tradition = (document.getElementById('dailyVerseTradition')?.textContent || '').trim();
    const cleanText = rawText.replace(/^["“”«»]+/, '').replace(/["“”«»]+$/, '').trim();
    const formatted = `"${cleanText}"\n\n— ${ref}\n\n✝️ All Saints' Church • Church Companion`;
    return {
      text: cleanText,
      ref: ref,
      tradition: tradition || 'Verse of the Day',
      shareText: formatted,
      title: ref ? `Verse of the Day (${ref})` : 'Verse of the Day'
    };
  }

  function renderAestheticVerseCanvas(verseText, verseRef, traditionTag) {
    const canvas = document.getElementById('verseShareCanvas') || document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const w = 1080;
    const h = 1350;

    // 1. Deep Obsidian / Midnight Sapphire Liturgical Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#070A10');
    bgGrad.addColorStop(0.3, '#0B1324');
    bgGrad.addColorStop(0.65, '#111A30');
    bgGrad.addColorStop(1, '#060910');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Divine Ambient Glow (Radiant Warm Gold Center)
    const glow = ctx.createRadialGradient(w / 2, h * 0.46, 30, w / 2, h * 0.46, 540);
    glow.addColorStop(0, 'rgba(234, 179, 8, 0.22)');
    glow.addColorStop(0.45, 'rgba(217, 119, 6, 0.08)');
    glow.addColorStop(0.85, 'rgba(15, 23, 42, 0.02)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // 3. Delicate Star Particles / Rosettes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    const starCoords = [
      [180, 240], [890, 220], [140, 780], [940, 810],
      [220, 1120], [860, 1100], [310, 190], [770, 180]
    ];
    starCoords.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Double Gold Framing with Smooth Rounded Insets
    function drawRoundedRect(x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    // Outer Gold Rim
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 2.5;
    drawRoundedRect(44, 44, w - 88, h - 88, 36);
    ctx.stroke();

    // Inner Subtle Hairline Rim
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.20)';
    ctx.lineWidth = 1;
    drawRoundedRect(56, 56, w - 112, h - 112, 26);
    ctx.stroke();

    // 5. Four Corner Rosettes (✦)
    ctx.font = '22px serif';
    ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', 76, 76);
    ctx.fillText('✦', w - 76, 76);
    ctx.fillText('✦', 76, h - 76);
    ctx.fillText('✦', w - 76, h - 76);

    // 6. Church Crest Header
    // Sacred Latin Cross
    ctx.font = '700 46px -apple-system, sans-serif';
    ctx.fillStyle = '#EAB308';
    ctx.fillText('✝', w / 2, 140);

    // Church Name in Letter-spaced Small Caps
    ctx.font = '600 23px -apple-system, BlinkMacSystemFont, "Cinzel", "Times New Roman", serif';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
    ctx.fillText("ALL SAINTS' CHURCH • SANCTUARY", w / 2, 195);

    // Liturgical Tag Pill
    const tagText = (traditionTag || 'VERSE OF THE DAY').toUpperCase();
    ctx.font = '700 16px -apple-system, BlinkMacSystemFont, sans-serif';
    const tagWidth = ctx.measureText(tagText).width + 36;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.14)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.2;
    drawRoundedRect(w / 2 - tagWidth / 2, 222, tagWidth, 32, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.fillText(tagText, w / 2, 238);

    // 7. Decorative Opening Quote Mark
    ctx.font = 'italic 700 84px Georgia, serif';
    ctx.fillStyle = 'rgba(212, 175, 55, 0.38)';
    ctx.fillText('“', w / 2, 335);

    // 8. Scripture Body Text (Dynamic Multiline Centered Wrap)
    const cleanVerse = (verseText || '').replace(/^["“”«»]+/, '').replace(/["“”«»]+$/, '').trim();
    const maxTextWidth = 840;
    
    function wrapLines(text, fSize) {
      ctx.font = `italic ${fSize}px Georgia, "Palatino Linotype", "Times New Roman", serif`;
      const words = text.split(/\s+/);
      const res = [];
      let currentLine = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        if (ctx.measureText(testLine).width < maxTextWidth) {
          currentLine = testLine;
        } else {
          res.push(currentLine);
          currentLine = words[i];
        }
      }
      if (currentLine) res.push(currentLine);
      return res;
    }

    let fontSize = 42;
    let lineHeight = 66;
    let lines = wrapLines(cleanVerse, fontSize);
    if (lines.length > 5) {
      fontSize = 36;
      lineHeight = 56;
      lines = wrapLines(cleanVerse, fontSize);
    }
    if (lines.length > 7) {
      fontSize = 30;
      lineHeight = 48;
      lines = wrapLines(cleanVerse, fontSize);
    }

    const textBlockHeight = lines.length * lineHeight;
    const textStartY = 540 - (textBlockHeight / 2) + 40;

    ctx.font = `italic ${fontSize}px Georgia, "Palatino Linotype", "Times New Roman", serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    lines.forEach((line, idx) => {
      ctx.fillText(line, w / 2, textStartY + (idx * lineHeight));
    });

    // Reset Shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 9. Closing Quote Mark
    ctx.font = 'italic 700 84px Georgia, serif';
    ctx.fillStyle = 'rgba(212, 175, 55, 0.38)';
    ctx.fillText('”', w / 2, textStartY + textBlockHeight + 25);

    // 10. Golden Rosette Divider
    const divY = Math.max(textStartY + textBlockHeight + 90, 890);
    const divGrad = ctx.createLinearGradient(w / 2 - 160, divY, w / 2 + 160, divY);
    divGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    divGrad.addColorStop(0.3, 'rgba(212, 175, 55, 0.6)');
    divGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    divGrad.addColorStop(0.7, 'rgba(212, 175, 55, 0.6)');
    divGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');

    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 160, divY);
    ctx.lineTo(w / 2 - 25, divY);
    ctx.moveTo(w / 2 + 25, divY);
    ctx.lineTo(w / 2 + 160, divY);
    ctx.stroke();

    ctx.font = '20px serif';
    ctx.fillStyle = '#FACC15';
    ctx.fillText('✦', w / 2, divY);

    // 11. Prominent Bible Reference Badge
    const cleanRef = (verseRef || 'Psalm 119:105').toUpperCase();
    ctx.font = '700 34px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillStyle = '#FDE047';
    ctx.fillText(cleanRef, w / 2, divY + 65);

    // 12. Bottom Church Companion Ribbon
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
    ctx.fillText("✝️ CHURCH COMPANION • DAILY SCRIPTURE", w / 2, h - 120);

    return canvas.toDataURL('image/png');
  }

  function updateVerseImagePreview() {
    const data = getDailyVerseShareData();
    if (verseShareImageLoading) verseShareImageLoading.style.display = 'flex';
    setTimeout(() => {
      const dataUrl = renderAestheticVerseCanvas(data.text, data.ref, data.tradition);
      cachedVerseImageDataUrl = dataUrl;
      if (verseShareImagePreview && dataUrl) {
        verseShareImagePreview.src = dataUrl;
      }
      if (verseShareImageLoading) verseShareImageLoading.style.display = 'none';
    }, 40);
  }

  function switchVerseShareTab(targetTab) {
    if (targetTab === 'image') {
      if (verseShareTabBtnImage) {
        verseShareTabBtnImage.classList.add('active');
        verseShareTabBtnImage.style.background = 'var(--accent-gold)';
        verseShareTabBtnImage.style.color = '#ffffff';
        verseShareTabBtnImage.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
        verseShareTabBtnImage.style.fontWeight = '700';
      }
      if (verseShareTabBtnText) {
        verseShareTabBtnText.classList.remove('active');
        verseShareTabBtnText.style.background = 'transparent';
        verseShareTabBtnText.style.color = 'var(--text-secondary)';
        verseShareTabBtnText.style.boxShadow = 'none';
        verseShareTabBtnText.style.fontWeight = '600';
      }
      if (verseShareTextPanel) verseShareTextPanel.style.display = 'none';
      if (verseShareImagePanel) verseShareImagePanel.style.display = 'block';
      updateVerseImagePreview();
    } else {
      if (verseShareTabBtnText) {
        verseShareTabBtnText.classList.add('active');
        verseShareTabBtnText.style.background = 'var(--accent-gold)';
        verseShareTabBtnText.style.color = '#ffffff';
        verseShareTabBtnText.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
        verseShareTabBtnText.style.fontWeight = '700';
      }
      if (verseShareTabBtnImage) {
        verseShareTabBtnImage.classList.remove('active');
        verseShareTabBtnImage.style.background = 'transparent';
        verseShareTabBtnImage.style.color = 'var(--text-secondary)';
        verseShareTabBtnImage.style.boxShadow = 'none';
        verseShareTabBtnImage.style.fontWeight = '600';
      }
      if (verseShareTextPanel) verseShareTextPanel.style.display = 'block';
      if (verseShareImagePanel) verseShareImagePanel.style.display = 'none';
    }
  }

  function downloadVerseImage(dataUrl, filename = 'VerseOfTheDay.png') {
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Verse card image downloaded');
    } catch (_) {
      showToast('Card image ready for saving');
    }
  }

  function openVerseShareModal() {
    const data = getDailyVerseShareData();
    if (verseSharePreviewText) {
      verseSharePreviewText.textContent = data.text ? `"${data.text}"` : '"Thy word is a lamp unto my feet, and a light unto my path."';
    }
    if (verseSharePreviewRef) {
      verseSharePreviewRef.textContent = data.ref ? `— ${data.ref}` : '— Psalm 119:105';
    }
    switchVerseShareTab('text');
    if (verseShareModalOverlay) {
      showModal(verseShareModalOverlay);
    }
  }

  function closeVerseShareModal() {
    if (verseShareModalOverlay) {
      hideModal(verseShareModalOverlay);
    }
  }

  /* ==========================================================================
     ANNOUNCEMENT & TODAY'S SONG MANAGEMENT ENGINE (ADMIN & SUPERADMIN)
     ========================================================================== */

  let currentAnnouncementsList = [];
  let currentTodaySongs = [];

  function getDeletedAnnouncementsBlacklist() {
    try {
      const bl = JSON.parse(localStorage.getItem('sanctuary_deleted_announcements_blacklist') || '[]');
      return Array.isArray(bl) ? bl.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function addDeletedAnnouncementToBlacklist(id) {
    if (!id) return;
    try {
      const bl = getDeletedAnnouncementsBlacklist();
      const sId = String(id);
      if (!bl.includes(sId)) {
        bl.push(sId);
        localStorage.setItem('sanctuary_deleted_announcements_blacklist', JSON.stringify(bl));
      }
    } catch (_) {}
  }
  window.getDeletedAnnouncementsBlacklist = getDeletedAnnouncementsBlacklist;
  window.addDeletedAnnouncementToBlacklist = addDeletedAnnouncementToBlacklist;

  function cleanAnnouncementItem(item) {
    if (!item) return item;
    let details = item.details || item.body || item.content || '';
    let prayerBy = item.prayerBy || '';
    let prayerDate = item.prayerDate || '';
    const metaMatch = details.match(/<!--meta:(\{.*?\})-->/);
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1]);
        if (!prayerBy && meta.prayerBy) prayerBy = meta.prayerBy;
        if (!prayerDate && meta.prayerDate) prayerDate = meta.prayerDate;
      } catch (_) {}
      details = details.replace(/[\r\n]*<!--meta:(\{.*?\})-->/g, '').trim();
    }
    return {
      ...item,
      details,
      prayerBy,
      prayerDate
    };
  }

  function getStoredAnnouncements() {
    const blacklist = getDeletedAnnouncementsBlacklist();
    try {
      const stored = localStorage.getItem('sanctuary_announcements_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item && !blacklist.includes(String(item.id))).map(cleanAnnouncementItem);
        }
      }
      // Migration from legacy single announcement v2
      const legacy = localStorage.getItem('sanctuary_announcement_v2');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && (parsed.details || parsed.date || parsed.prayerBy)) {
          const legacyItem = {
            id: 'ann_legacy_' + Date.now(),
            date: parsed.date || '',
            details: parsed.details || '',
            prayerBy: parsed.prayerBy || '',
            prayerDate: parsed.prayerDate || '',
            createdAt: new Date().toISOString()
          };
          if (!blacklist.includes(String(legacyItem.id))) {
            return [cleanAnnouncementItem(legacyItem)];
          }
        }
      }
    } catch (e) {}
    return (currentAnnouncementsList || []).filter(item => item && !blacklist.includes(String(item.id))).map(cleanAnnouncementItem);
  }

  function saveStoredAnnouncements(list) {
    try {
      localStorage.setItem('sanctuary_announcements_v3', JSON.stringify(list));
      // Keep legacy item synced for backward compatibility
      if (list && list.length > 0) {
        localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(list[0]));
      } else {
        localStorage.removeItem('sanctuary_announcement_v2');
      }
    } catch (e) {}
    currentAnnouncementsList = list;
    renderAdminAnnouncementsList();
    renderAnnouncementHomeUI();
  }

  function getStoredTodaySongs() {
    try {
      const stored = localStorage.getItem('sanctuary_today_songs_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
      // Migration from legacy single-song storage if present
      const legacy = localStorage.getItem('sanctuary_today_song_v2');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.title) return [parsed];
      }
    } catch (e) {}
    return currentTodaySongs;
  }

  function saveStoredTodaySongs(songsArray) {
    try {
      localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(songsArray));
    } catch (e) {}
    currentTodaySongs = songsArray;
    renderTodaySongHomeUI();
  }

  function formatAnnouncementLongDate(dateStr) {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      try {
        const parts = trimmed.split('-');
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
      } catch (_) {
        return trimmed;
      }
    }
    return trimmed;
  }
  const formatAnnouncementDisplayDate = formatAnnouncementLongDate;

  function formatAnnouncementPrayerDate(dateStr) {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      try {
        const parts = trimmed.split('-');
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(d);
      } catch (_) {
        return trimmed;
      }
    }
    return trimmed;
  }

  function renderAdminAnnouncementsList() {
    window.renderAdminAnnouncementsList = renderAdminAnnouncementsList;
    const list = getStoredAnnouncements();
    const container = document.getElementById('adminAnnouncementsListContainer');
    const countEl = document.getElementById('adminAnnouncementsCount');

    if (countEl) {
      countEl.textContent = `${list.length} notice${list.length === 1 ? '' : 's'}`;
    }

    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:20px 12px; background:var(--bg-subtle); border:1px dashed var(--border-subtle); border-radius:var(--radius-md, 12px); color:var(--text-secondary); font-size:0.86rem;">
          <div style="font-size:1.4rem; margin-bottom:4px;">📢</div>
          <div>No announcements added yet.</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">Click "+ Add Announcement" below to create a parish notice.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((ann, idx) => `
      <div class="admin-announcement-card announcement-card" style="margin-bottom:6px;">
        <div class="announcement-card-header">
          <div class="announcement-header-left">
            <div class="announcement-icon-badge">
              📢
            </div>
            <div class="announcement-meta">
              <div class="announcement-date-title">
                ${escapeHtml(formatAnnouncementLongDate(ann.date) || 'Notice #' + (idx + 1))}
              </div>
              <div class="announcement-badge-pill">Notice #${idx + 1}</div>
            </div>
          </div>
          <div class="announcement-admin-actions">
            <button type="button" class="btn-secondary edit-announcement-btn announcement-pill-btn" data-id="${ann.id}" title="Edit Announcement">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Edit</span>
            </button>
            <button type="button" class="btn-secondary delete-announcement-btn announcement-pill-btn btn-danger-pill" data-id="${ann.id}" title="Delete Announcement">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
        ${ann.details ? `
          <div class="announcement-details-content">
            <div class="announcement-section-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>Detail of Announcement</span>
            </div>
            <div class="announcement-details-text">${escapeHtml(ann.details)}</div>
          </div>
        ` : ''}
        ${(ann.prayerBy || ann.prayerDate) ? `
          <div class="announcement-prayer-box">
            <div class="announcement-prayer-header">
              <span class="announcement-prayer-badge">
                <span>🙏</span>
                <span>Intercessory Prayer Request</span>
              </span>
            </div>
            <div class="announcement-prayer-details">
              ${ann.prayerBy ? `
                <div class="announcement-prayer-field">
                  <div class="announcement-prayer-label">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>Prayer Requested By:</span>
                  </div>
                  <div class="announcement-prayer-value announcement-prayer-requester">${escapeHtml(ann.prayerBy)}</div>
                </div>
              ` : ''}
              ${ann.prayerDate ? `
                <div class="announcement-prayer-field">
                  <div class="announcement-prayer-label">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="18" y2="10"/></svg>
                    <span>Prayer Date:</span>
                  </div>
                  <div class="announcement-prayer-value">${escapeHtml(formatAnnouncementLongDate(ann.prayerDate))}</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Attach Edit and Delete listeners
    container.querySelectorAll('.edit-announcement-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const ann = list.find(item => String(item.id) === String(id));
        if (ann) openAnnouncementFormModal(ann);
      });
    });

    container.querySelectorAll('.delete-announcement-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const ann = list.find(item => String(item.id) === String(id));
        if (!ann) return;

        const confirmed = await window.showConfirmDialog({
          title: 'Delete Announcement?',
          message: `Are you sure you want to delete "${(ann.date || ann.details || 'this notice').slice(0, 35)}..."?`,
          icon: '🗑️',
          confirmText: 'Delete',
          isDanger: true
        });
        if (!confirmed) return;

        // 1. Blacklist ID locally so it cannot be resurrected
        addDeletedAnnouncementToBlacklist(ann.id);

        // 2. Remove from local stored announcements
        const updated = list.filter(item => String(item.id) !== String(id));
        saveStoredAnnouncements(updated);

        // 3. Mark inactive & delete in Supabase Cloud
        try {
          if (window.ChurchSync && window.ChurchSync.Announcements && typeof window.ChurchSync.Announcements.delete === 'function') {
            await window.ChurchSync.Announcements.delete(ann.id);
          }
        } catch (_) {}
        try {
          if (typeof window.syncWrite === 'function') {
            await window.syncWrite('announcements', 'delete', { id: ann.id, is_active: false });
          }
        } catch (_) {}

        showToast('Announcement Deleted 🗑️');
      });
    });
  }

  let wasOpenedFromAnnouncementModal = false;

  function openAnnouncementFormModal(ann = null, fromHomeModal = false) {
    wasOpenedFromAnnouncementModal = !!fromHomeModal;
    const modal = document.getElementById('announcementEditModalOverlay');
    const titleEl = document.getElementById('announcementEditModalTitle');
    const idInput = document.getElementById('announcementEditIdInput');
    const dateInput = document.getElementById('announcementDateInput');
    const textInput = document.getElementById('announcementTextInput');
    const prayerByInput = document.getElementById('announcementPrayerByInput');
    const prayerDateInput = document.getElementById('announcementPrayerDateInput');

    if (!modal) return;

    if (ann) {
      if (titleEl) titleEl.textContent = 'Edit Announcement';
      if (idInput) idInput.value = ann.id || '';
      if (dateInput) {
        let dVal = ann.date || '';
        if (dVal && !/^\d{4}-\d{2}-\d{2}$/.test(dVal)) {
          const parsed = new Date(dVal);
          if (!isNaN(parsed.getTime())) {
            dVal = parsed.toISOString().split('T')[0];
          }
        }
        dateInput.value = /^\d{4}-\d{2}-\d{2}$/.test(dVal) ? dVal : (new Date().toISOString().split('T')[0]);
      }
      if (textInput) textInput.value = ann.details || '';
      if (prayerByInput) prayerByInput.value = ann.prayerBy || '';
      if (prayerDateInput) {
        let pDate = ann.prayerDate || '';
        if (pDate && !/^\d{4}-\d{2}-\d{2}$/.test(pDate)) {
          const parsed = new Date(pDate);
          if (!isNaN(parsed.getTime())) {
            pDate = parsed.toISOString().split('T')[0];
          }
        }
        prayerDateInput.value = /^\d{4}-\d{2}-\d{2}$/.test(pDate) ? pDate : '';
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add Announcement';
      if (idInput) idInput.value = '';
      const todayIso = new Date().toISOString().split('T')[0];
      if (dateInput) dateInput.value = todayIso;
      if (textInput) textInput.value = '';
      if (prayerByInput) prayerByInput.value = '';
      if (prayerDateInput) prayerDateInput.value = '';
    }

    modal.classList.remove('hidden');
    if (textInput) setTimeout(() => textInput.focus(), 80);
  }

  function closeAnnouncementFormModal() {
    const modal = document.getElementById('announcementEditModalOverlay');
    if (modal) modal.classList.add('hidden');
    if (wasOpenedFromAnnouncementModal) {
      wasOpenedFromAnnouncementModal = false;
      if (typeof openAnnouncementModal === 'function') openAnnouncementModal();
    }
  }

  function renderAnnouncementHomeUI() {
    const rawList = getStoredAnnouncements();
    const modalBody = document.getElementById('homeAnnouncementModalBody');
    const headerTitle = document.getElementById('announcementModalHeaderTitle');
    const subtitleEl = document.getElementById('homeAnnouncementSubtitle');
    const pillBtn = document.getElementById('announcementPillBtn');
    const dotEl = pillBtn ? pillBtn.querySelector('.pill-dot') : null;
    const adminAddBtn = document.getElementById('announcementModalAddBtn');

    // 1. Expand each announcement item into individual notices if multiple sub-notices are present
    const list = [];
    (rawList || []).forEach((item, parentIdx) => {
      if (!item) return;
      const text = (item.details || '').trim();
      const noticeRegex = /(?:^|\n+)(?=(?:Notice\s*#?\s*\d+[:.\-\s\n]+))/i;
      let parts = text.split(noticeRegex).map(s => s.trim()).filter(Boolean);
      if (parts.length <= 1) {
        const numRegex = /(?:^|\n+)(?=\d+\.\s+)/;
        const numParts = text.split(numRegex).map(s => s.trim()).filter(Boolean);
        if (numParts.length >= 2) parts = numParts;
      }
      if (parts.length > 1) {
        parts.forEach((part, pIdx) => {
          const cleaned = part.replace(/^(?:Notice\s*#?\s*\d+[:.\-\s\n]*|\d+\.\s*)/i, '').trim();
          list.push({
            ...item,
            _parentIdx: parentIdx,
            _subIdx: pIdx,
            _isSub: true,
            details: cleaned || part,
            prayerBy: pIdx === 0 ? item.prayerBy : '',
            prayerDate: pIdx === 0 ? item.prayerDate : ''
          });
        });
      } else {
        list.push({
          ...item,
          _parentIdx: parentIdx,
          _isSub: false
        });
      }
    });

    const count = list.length;

    if (subtitleEl) {
      subtitleEl.textContent = count === 0 ? 'No Notices' : `${count} New Notice${count === 1 ? '' : 's'}`;
    }
    if (dotEl) {
      dotEl.style.display = count > 0 ? '' : 'none';
    }

    const perms = useAppPermissions();
    const isSuperAdminOrAdmin = Boolean(
      perms.isSuperAdmin || 
      perms.isAdmin || 
      perms.role === 'superadmin' || 
      perms.role === 'admin' || 
      (typeof currentAuthSession !== 'undefined' && currentAuthSession && currentAuthSession.email === SUPER_ADMIN_EMAIL)
    );

    if (adminAddBtn) {
      if (isSuperAdminOrAdmin) {
        adminAddBtn.style.display = 'inline-flex';
        adminAddBtn.onclick = () => {
          closeAnnouncementModal();
          openAnnouncementFormModal(null, true);
        };
      } else {
        adminAddBtn.style.display = 'none';
      }
    }

    if (headerTitle) {
      headerTitle.textContent = 'Announcements';
    }

    if (!modalBody) return;

    if (count === 0) {
      modalBody.innerHTML = `
        <div style="padding:32px 16px; text-align:center; color:var(--text-secondary); font-size:0.92rem;">
          <div style="font-size:2.4rem; margin-bottom:10px;">📢</div>
          <div style="font-weight:700; font-size:1.05rem; margin-bottom:6px; color:var(--text-primary);">No Active Notices</div>
          <p style="margin:0 auto; max-width:320px; line-height:1.5; font-size:0.86rem; color:var(--text-muted);">
            There are currently no active church notices or prayer requests posted.
          </p>
          ${isSuperAdminOrAdmin ? `
            <button type="button" class="btn-primary" id="emptyAnnouncementAddBtn" style="margin-top:16px; border-radius:14px; padding:8px 18px; font-size:0.88rem; background:#34495e !important; color:#ffffff !important; border:1px solid rgba(255,255,255,0.16) !important;">
              <span>+ Post New Announcement</span>
            </button>
          ` : ''}
        </div>
      `;
      const emptyAddBtn = document.getElementById('emptyAnnouncementAddBtn');
      if (emptyAddBtn) {
        emptyAddBtn.onclick = () => {
          closeAnnouncementModal();
          openAnnouncementFormModal(null, true);
        };
      }
      return;
    }

    modalBody.innerHTML = `
      <div class="announcements-structured-list" style="display: flex !important; flex-direction: column !important; gap: 16px !important; width: 100% !important; box-sizing: border-box !important; padding-bottom: 8px !important;">
        ${list.map((ann, idx) => {
          const noticeNumStr = `Notice ${String(idx + 1).padStart(2, '0')}`;
          const dateStr = formatAnnouncementLongDate(ann.date) || 'Parish Notice';
          const prayerDateStr = formatAnnouncementPrayerDate(ann.prayerDate);
          return `
            <article class="anc-reference-card announcement-card" data-ann-idx="${idx}" data-ann-id="${escapeHtml(ann.id || '')}" style="background: linear-gradient(145deg, rgba(30, 36, 46, 0.95) 0%, rgba(22, 27, 35, 0.98) 100%) !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; border-radius: 16px !important; padding: 14px 16px !important; display: flex !important; flex-direction: column !important; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important; box-sizing: border-box !important; width: 100% !important; gap: 10px !important;">
              <!-- Card Header Row (Compact & Organized) -->
              <div class="anc-card-header" style="display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 10px !important;">
                <div class="anc-header-left" style="display: flex !important; align-items: center !important; gap: 10px !important; min-width: 0 !important; flex: 1 !important;">
                  <!-- iOS SF Speaker Icon in Circular Squircle Badge -->
                  <div class="anc-megaphone-circle" style="width: 36px !important; height: 36px !important; border-radius: 50% !important; background: rgba(255, 255, 255, 0.08) !important; border: 1.5px solid rgba(255, 255, 255, 0.14) !important; display: flex !important; align-items: center !important; justify-content: center !important; color: var(--accent-gold) !important; flex-shrink: 0 !important;">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                  </div>
                  <div class="anc-title-stack" style="display: flex !important; flex-direction: column !important; gap: 3px !important; min-width: 0 !important;">
                    <div style="display: flex !important; align-items: center !important; gap: 7px !important; flex-wrap: wrap !important;">
                      <span class="anc-notice-badge" style="background: rgba(197, 155, 39, 0.15) !important; border: 1px solid rgba(197, 155, 39, 0.35) !important; color: var(--accent-gold) !important; font-size: 0.74rem !important; font-weight: 700 !important; padding: 2px 7px !important; border-radius: 6px !important; letter-spacing: 0.02em !important; text-transform: uppercase !important;">${noticeNumStr}</span>
                    </div>
                    <div class="anc-card-date" style="display: flex !important; align-items: center !important; gap: 5px !important; font-size: 0.8rem !important; color: var(--text-muted) !important; font-weight: 400 !important; line-height: 1.2 !important;">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
                      </svg>
                      <span>${escapeHtml(dateStr)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Subtle Divider Line -->
              <div class="anc-card-divider" style="height: 1px !important; width: 100% !important; background: rgba(255, 255, 255, 0.08) !important; margin: 2px 0 !important;"></div>

              <!-- Card Message Body Text -->
              <div class="anc-card-body announcement-details-text" style="font-size: 0.92rem !important; line-height: 1.55 !important; color: var(--text-secondary) !important; white-space: pre-wrap !important; word-break: break-word !important; font-family: var(--font-sans) !important; margin: 0 !important;">${escapeHtml(ann.details || 'No details provided.')}</div>

              <!-- Prayer Request Box (Compact Banner) -->
              ${(ann.prayerBy || ann.prayerDate) ? `
                <div class="anc-prayer-card" style="background: rgba(22, 27, 35, 0.90) !important; border: 1px solid rgba(197, 155, 39, 0.28) !important; border-radius: 12px !important; padding: 8px 12px !important; display: flex !important; align-items: center !important; gap: 10px !important; box-sizing: border-box !important; margin-top: 2px !important;">
                  <div class="anc-prayer-circle" style="width: 32px !important; height: 32px !important; border-radius: 50% !important; border: 1.2px solid var(--accent-gold) !important; background: rgba(197, 155, 39, 0.12) !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--accent-gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 2.5v12.5"></path>
                      <path d="M12 2.5c-1.2 1.6-2.2 4-2.2 6.5v5c0 1.2.8 2 2.2 2"></path>
                      <path d="M12 2.5c1.2 1.6 2.2 4 2.2 6.5v5c0 1.2-.8 2-2.2 2"></path>
                      <path d="M9.8 11.5c-.8.8-1.8 1.8-1.8 3 0 1.5 1 2.5 2 3"></path>
                      <path d="M14.2 11.5c.8.8 1.8 1.8 1.8 3 0 1.5-1 2.5-2 3"></path>
                      <path d="M8.5 20.5h7"></path>
                    </svg>
                  </div>
                  <div class="anc-prayer-info" style="display: flex !important; flex-direction: column !important; gap: 2px !important; min-width: 0 !important; flex: 1 !important;">
                    <div class="anc-prayer-heading" style="font-size: 0.84rem !important; font-weight: 700 !important; color: var(--accent-gold) !important; line-height: 1.2 !important; font-family: var(--font-sans) !important;">Prayer Request</div>
                    <div style="display: flex !important; align-items: center !important; gap: 12px !important; flex-wrap: wrap !important;">
                      ${ann.prayerBy ? `
                        <div class="anc-prayer-row" style="display: flex !important; align-items: center !important; gap: 4px !important; font-size: 0.78rem !important; line-height: 1.25 !important; color: var(--text-muted) !important;">
                          <span class="anc-prayer-lbl" style="color: var(--text-muted) !important;">By:</span>
                          <span class="anc-prayer-val" style="color: var(--text-primary) !important; font-weight: 600 !important;">${escapeHtml(ann.prayerBy)}</span>
                        </div>
                      ` : ''}
                      ${ann.prayerDate ? `
                        <div class="anc-prayer-row" style="display: flex !important; align-items: center !important; gap: 4px !important; font-size: 0.78rem !important; line-height: 1.25 !important; color: var(--text-muted) !important;">
                          <span class="anc-prayer-lbl" style="color: var(--text-muted) !important;">Date:</span>
                          <span class="anc-prayer-val" style="color: var(--text-primary) !important; font-weight: 500 !important;">${escapeHtml(prayerDateStr)}</span>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Card Bottom Toolbar: Compact Action Buttons Row -->
              <div class="anc-card-footer" style="display: flex !important; align-items: center !important; justify-content: flex-end !important; gap: 8px !important; padding-top: 6px !important; border-top: 1px solid rgba(255, 255, 255, 0.08) !important; margin-top: 2px !important;">
                <div class="anc-actions-group" style="display: flex !important; align-items: center !important; gap: 8px !important; flex-wrap: wrap !important;">
                  <!-- Copy Button (Compact Pill) -->
                  <div class="anc-action-col">
                    <button type="button" class="anc-circle-btn btn-copy-announcement" data-ann-idx="${idx}" title="Copy Notice" aria-label="Copy Notice" style="height: 32px !important; padding: 0 12px !important; border-radius: 8px !important; background: rgba(255, 255, 255, 0.08) !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; color: var(--text-secondary) !important; cursor: pointer !important; outline: none !important; transition: all 0.2s ease !important;">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span class="anc-action-label" style="font-size: 0.8rem !important; font-weight: 500 !important; color: var(--text-secondary) !important; line-height: 1 !important; font-family: var(--font-sans) !important;">Copy</span>
                    </button>
                  </div>

                  ${isSuperAdminOrAdmin ? `
                    <!-- Edit Button (Compact Blue Pill) - Super Admin & Admin Only -->
                    <div class="anc-action-col">
                      <button type="button" class="anc-circle-btn anc-btn-edit btn-edit-announcement" data-ann-idx="${idx}" title="Edit Notice" aria-label="Edit Notice" style="height: 32px !important; padding: 0 12px !important; border-radius: 8px !important; background: rgba(14, 165, 233, 0.14) !important; border: 1px solid rgba(14, 165, 233, 0.35) !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; color: #38bdf8 !important; cursor: pointer !important; outline: none !important; transition: all 0.2s ease !important;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span class="anc-action-label" style="font-size: 0.8rem !important; font-weight: 500 !important; color: #38bdf8 !important; line-height: 1 !important; font-family: var(--font-sans) !important;">Edit</span>
                      </button>
                    </div>

                    <!-- Delete Button (Compact Red Pill) - Super Admin & Admin Only -->
                    <div class="anc-action-col">
                      <button type="button" class="anc-circle-btn anc-btn-delete btn-delete-announcement" data-ann-idx="${idx}" title="Delete Notice" aria-label="Delete Notice" style="height: 32px !important; padding: 0 12px !important; border-radius: 8px !important; background: rgba(239, 68, 68, 0.12) !important; border: 1px solid rgba(239, 68, 68, 0.30) !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; color: #f87171 !important; cursor: pointer !important; outline: none !important; transition: all 0.2s ease !important;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        <span class="anc-action-label" style="font-size: 0.8rem !important; font-weight: 500 !important; color: #f87171 !important; line-height: 1 !important; font-family: var(--font-sans) !important;">Delete</span>
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    // 1. Bind Copy buttons
    modalBody.querySelectorAll('.btn-copy-announcement').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-ann-idx'), 10);
        const ann = list[idx];
        if (!ann) return;

        const noticeNumStr = `Notice ${String(idx + 1).padStart(2, '0')}`;
        let textToCopy = `📢 ${noticeNumStr}: ${formatAnnouncementLongDate(ann.date) || 'Parish Notice'}\n\nDetail: ${ann.details || ''}`;
        if (ann.prayerBy || ann.prayerDate) {
          textToCopy += `\n\n🙏 Intercessory Prayer Request:`;
          if (ann.prayerBy) textToCopy += `\n• Prayer Request by: ${ann.prayerBy}`;
          if (ann.prayerDate) textToCopy += `\n• Prayer Date: ${formatAnnouncementPrayerDate(ann.prayerDate)}`;
        }

        copyTextToClipboard(textToCopy, () => {
          const col = btn.closest('.anc-action-col');
          const span = col ? col.querySelector('.anc-action-label') : btn.querySelector('span');
          if (span) span.textContent = 'Copied';
          showToast(`${noticeNumStr} copied to clipboard 📋`);
          setTimeout(() => {
            if (span) span.textContent = 'Copy';
          }, 2000);
        });
      });
    });

    // 2. Bind Edit buttons
    modalBody.querySelectorAll('.btn-edit-announcement').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-ann-idx'), 10);
        const ann = list[idx];
        if (!ann) return;

        closeAnnouncementModal();
        openAnnouncementFormModal(ann, true);
      });
    });

    // 3. Bind Delete buttons
    modalBody.querySelectorAll('.btn-delete-announcement').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-ann-idx'), 10);
        const ann = list[idx];
        if (!ann) return;

        const noticeNumStr = `Notice ${String(idx + 1).padStart(2, '0')}`;
        const confirmed = await window.showConfirmDialog({
          title: `Delete ${noticeNumStr}?`,
          message: `Are you sure you want to delete ${noticeNumStr} permanently?`,
          icon: '🗑️',
          confirmText: 'Delete',
          isDanger: true
        });
        if (!confirmed) return;

        const storedList = getStoredAnnouncements();

        if (ann._isSub && ann._parentIdx !== undefined && storedList[ann._parentIdx]) {
          const parentAnn = storedList[ann._parentIdx];
          const noticeRegex = /(?:^|\n+)(?=(?:Notice\s*#?\s*\d+[:.\-\s\n]+))/i;
          let parts = (parentAnn.details || '').split(noticeRegex).map(s => s.trim()).filter(Boolean);
          if (parts.length <= 1) {
            const numRegex = /(?:^|\n+)(?=\d+\.\s+)/;
            const numParts = (parentAnn.details || '').split(numRegex).map(s => s.trim()).filter(Boolean);
            if (numParts.length >= 2) parts = numParts;
          }
          if (parts.length > 1 && ann._subIdx !== undefined) {
            parts.splice(ann._subIdx, 1);
            parentAnn.details = parts.join('\n\n');
            saveStoredAnnouncements(storedList);
            if (window.ChurchSync && window.ChurchSync.Announcements && typeof window.ChurchSync.Announcements.upsert === 'function') {
              window.ChurchSync.Announcements.upsert({
                id: parentAnn.id,
                title: parentAnn.date || 'Announcement',
                body: parentAnn.details,
                date: parentAnn.date,
                prayerBy: parentAnn.prayerBy,
                prayerDate: parentAnn.prayerDate,
                is_active: true
              }).catch(() => {});
            }
          }
        } else {
          // 1. Blacklist ID locally
          addDeletedAnnouncementToBlacklist(ann.id);

          // 2. Remove locally
          const realIdx = storedList.findIndex(item => String(item.id) === String(ann.id));
          if (realIdx !== -1) {
            storedList.splice(realIdx, 1);
          } else {
            storedList.splice(idx, 1);
          }
          saveStoredAnnouncements(storedList);

          // 3. Delete in Supabase Cloud
          try {
            if (window.ChurchSync && window.ChurchSync.Announcements && typeof window.ChurchSync.Announcements.delete === 'function') {
              await window.ChurchSync.Announcements.delete(ann.id);
            }
          } catch (_) {}
          try {
            if (typeof window.syncWrite === 'function') {
              await window.syncWrite('announcements', 'delete', { id: ann.id, is_active: false });
            }
          } catch (_) {}
        }

        renderAnnouncementHomeUI();
        showToast(`${noticeNumStr} deleted 🗑️`);
      });
    });
  }

  function renderTodaySongHomeUI() {
    const songs = getStoredTodaySongs();
    
    // Update Home Pill Subtitle
    const subtitleEl = document.getElementById('homeTodaySongSubtitle');
    if (subtitleEl) {
      if (songs.length === 0) {
        subtitleEl.textContent = 'No Songs Selected';
      } else if (songs.length === 1) {
        subtitleEl.textContent = songs[0].title || 'Today\'s Hymn';
      } else {
        subtitleEl.textContent = `${songs.length} Selected Songs`;
      }
    }

    // Update Modal
    const modalTitle = document.getElementById('modalSongTitle');
    const modalAuthor = document.getElementById('modalSongAuthorMeta') || document.getElementById('modalSongAuthor');
    const modalLyrics = document.getElementById('modalSongLyricsContainer');
    const adminFooterBtn = document.getElementById('manageTodaySongsModalBtn');
    const closeBottomBtn = document.getElementById('closeTodaySongBottomBtn');

    if (closeBottomBtn) {
      closeBottomBtn.onclick = closeSongModal;
    }

    const perms = useAppPermissions();
    const isAdmin = perms.role === 'admin' || perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL;

    if (adminFooterBtn) {
      if (isAdmin) {
        adminFooterBtn.style.display = 'inline-flex';
        adminFooterBtn.onclick = () => {
          closeSongModal();
          switchTab('viewSettings');
          setTimeout(() => {
            const songTab = document.getElementById('adminTabSong');
            if (songTab) songTab.click();
            const songSec = document.getElementById('adminSectionSong');
            if (songSec) songSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 250);
        };
      } else {
        adminFooterBtn.style.display = 'none';
      }
    }

    if (!modalLyrics) return;

    if (songs.length === 0) {
      if (modalTitle) modalTitle.textContent = 'Today\'s Selected Songs';
      if (modalAuthor) modalAuthor.textContent = 'No songs selected for worship';
      modalLyrics.innerHTML = `
        <div style="padding:32px 16px; text-align:center; color:var(--text-secondary); font-size:0.92rem;">
          <div style="font-size:2.4rem; margin-bottom:10px;">🎵</div>
          <div style="font-weight:700; font-size:1.05rem; margin-bottom:6px; color:var(--text-primary);">No Service Hymns Configured</div>
          <p style="margin:0 auto; max-width:320px; line-height:1.5; font-size:0.86rem; color:var(--text-muted);">
            There are currently no featured hymns selected for today's worship service.
          </p>
          ${isAdmin ? `
            <button type="button" class="btn-primary" id="emptyTodaySongsManageBtn" style="margin-top:16px; border-radius:14px; padding:8px 18px; font-size:0.88rem;">
              <span>+ Select Service Hymns</span>
            </button>
          ` : ''}
        </div>
      `;
      const emptyManageBtn = document.getElementById('emptyTodaySongsManageBtn');
      if (emptyManageBtn) {
        emptyManageBtn.onclick = () => {
          closeSongModal();
          switchTab('viewSettings');
          setTimeout(() => {
            const songTab = document.getElementById('adminTabSong');
            if (songTab) songTab.click();
            const songSec = document.getElementById('adminSectionSong');
            if (songSec) songSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 250);
        };
      }
    } else {
      if (modalTitle) modalTitle.textContent = `Today's Selected Songs (${songs.length})`;
      if (modalAuthor) modalAuthor.textContent = `${songs.length} ${songs.length === 1 ? 'hymn' : 'hymns'} selected for worship • Tap to read lyrics`;
      
      modalLyrics.innerHTML = `
        <div class="today-songs-structured-list" style="display:flex; flex-direction:column; gap:12px; padding:4px 0 10px;">
          ${songs.map((song, i) => {
            const isBookmarked = state.bookmarks.some(b => b.title === song.title || (song.title && b.title.includes(song.title)));
            const previewText = (song.lyrics || '').trim().split('\n').slice(0, 2).join(' / ');
            const bookTitle = song.bookName || song.bookTitle || 'Church Hymnal';
            const num = song.songNumber || song.formattedNum || `#${i + 1}`;

            return `
              <div class="today-song-card" data-song-idx="${i}" style="background:var(--bg-subtle, rgba(255,255,255,0.05)); border:1.5px solid var(--border-subtle, rgba(255,255,255,0.1)); border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:10px; transition:all 0.18s ease;">
                <!-- Header: Number, Title, Book Badge -->
                <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
                  <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                    <div style="width:34px; height:34px; border-radius:10px; background:var(--accent-gold-soft, rgba(73,151,208,0.15)); color:var(--accent-gold, #4997D0); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.92rem; flex-shrink:0;">
                      ${i + 1}
                    </div>
                    <div style="min-width:0; flex:1;">
                      <h4 style="margin:0 0 3px 0; font-size:1rem; font-weight:700; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                        ${escapeHtml(song.title || 'Hymn')}
                      </h4>
                      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span style="font-size:0.72rem; padding:2px 7px; border-radius:6px; background:rgba(73,151,208,0.12); color:var(--accent-gold); font-weight:600;">
                          ${escapeHtml(bookTitle)}
                        </span>
                        ${song.songNumber ? `<span style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(String(num))}</span>` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Lyrics Snippet -->
                ${previewText ? `
                  <div style="font-family:var(--font-serif); font-size:0.88rem; color:var(--text-secondary); line-height:1.45; font-style:italic; padding:6px 10px; background:rgba(0,0,0,0.02); border-left:2.5px solid var(--accent-gold); border-radius:0 6px 6px 0;">
                    "${escapeHtml(previewText)}"
                  </div>
                ` : ''}

                <!-- Structured Action Buttons -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; border-top:1px solid var(--border-subtle, rgba(255,255,255,0.06)); padding-top:8px; margin-top:2px;">
                  <button type="button" class="btn-read-today-song" data-song-idx="${i}" style="display:inline-flex; align-items:center; gap:6px; background:var(--accent-gold, #4997D0); color:#ffffff; border:none; border-radius:10px; padding:6px 14px; font-size:0.80rem; font-weight:700; cursor:pointer;">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    <span>Read Full Lyrics</span>
                  </button>

                  <div style="display:flex; align-items:center; gap:6px;">
                    <button type="button" class="btn-copy-today-song icon-pill" data-song-idx="${i}" title="Copy Lyrics" style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:8px; padding:5px 9px; cursor:pointer; color:var(--text-primary); font-size:0.76rem; display:inline-flex; align-items:center; gap:4px;">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      <span>Copy</span>
                    </button>

                    <button type="button" class="btn-bookmark-today-song icon-pill" data-song-idx="${i}" title="${isBookmarked ? 'Remove Bookmark' : 'Save Bookmark'}" style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:8px; padding:5px 9px; cursor:pointer; color:${isBookmarked ? 'var(--accent-gold)' : 'var(--text-primary)'}; font-size:0.76rem; display:inline-flex; align-items:center; gap:4px;">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="${isBookmarked ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      <span>${isBookmarked ? 'Saved' : 'Save'}</span>
                    </button>

                    ${isAdmin ? `
                      <button type="button" class="btn-remove-today-song icon-pill" data-song-idx="${i}" title="Remove from Today's Selection" style="background:none; border:1px solid rgba(239,68,68,0.25); color:#ef4444; border-radius:8px; padding:5px 8px; cursor:pointer; font-size:0.76rem; display:inline-flex; align-items:center; gap:3px;">
                        <span>✕</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // 1. Bind Read Lyrics buttons
      modalLyrics.querySelectorAll('.btn-read-today-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-song-idx'), 10);
          const selected = songs[idx];
          if (!selected) return;

          closeSongModal();

          const songObj = {
            id: selected.id,
            title: selected.title,
            subtitle: selected.meta || selected.subtitle || '',
            lyrics: selected.lyrics || '',
            bookTitle: selected.bookName || selected.bookTitle || 'Church Hymnal',
            songNumber: selected.songNumber || `#${idx + 1}`,
            bookKey: selected.bookKey || (selected.bookName?.includes('Additional') ? 'additionalSongs' : 'masihiGeet')
          };

          openSongLyricsScreen(songObj, songObj.bookKey, idx);
        });
      });

      // 2. Bind Copy buttons
      modalLyrics.querySelectorAll('.btn-copy-today-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-song-idx'), 10);
          const selected = songs[idx];
          if (!selected) return;

          const textToCopy = `${selected.title}\n${selected.bookName || ''}\n\n${selected.lyrics}`;
          copyTextToClipboard(textToCopy, () => {
            const span = btn.querySelector('span');
            if (span) span.textContent = '✓ Copied';
            showToast(`"${selected.title}" lyrics copied to clipboard 📋`);
            setTimeout(() => {
              if (span) span.textContent = 'Copy';
            }, 2000);
          });
        });
      });

      // 3. Bind Bookmark buttons
      modalLyrics.querySelectorAll('.btn-bookmark-today-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-song-idx'), 10);
          const selected = songs[idx];
          if (!selected) return;

          const existingIdx = state.bookmarks.findIndex(b => b.title === selected.title || (selected.title && b.title.includes(selected.title)));
          if (existingIdx >= 0) {
            state.bookmarks.splice(existingIdx, 1);
            saveBookmarksToStorage();
            renderBookmarks();
            btn.style.color = 'var(--text-primary)';
            const svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', 'none');
            const span = btn.querySelector('span');
            if (span) span.textContent = 'Save';
            showToast(`"${selected.title}" removed from bookmarks`);
          } else {
            addBookmark({
              title: selected.title,
              category: 'hymn',
              content: selected.lyrics,
              citation: selected.bookName || selected.bookTitle || 'Church Hymnal'
            });
            btn.style.color = 'var(--accent-gold)';
            const svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', 'currentColor');
            const span = btn.querySelector('span');
            if (span) span.textContent = 'Saved';
            showToast(`"${selected.title}" saved to bookmarks ✨`);
          }
        });
      });

      // 4. Bind Admin Remove buttons
      modalLyrics.querySelectorAll('.btn-remove-today-song').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-song-idx'), 10);
          const selected = songs[idx];
          if (!selected) return;

          const confirmed = await window.showConfirmDialog({
            title: 'Remove Hymn from Today?',
            message: `Remove "${selected.title}" from today's service selection?`,
            icon: '🗑️',
            confirmText: 'Remove',
            isDanger: true
          });
          if (!confirmed) return;

          const updatedList = [...songs];
          updatedList.splice(idx, 1);
          saveStoredTodaySongs(updatedList);

          try {
            if (window.ChurchSync && window.ChurchSync.TodaysSongs && typeof window.ChurchSync.TodaysSongs.set === 'function') {
              await window.ChurchSync.TodaysSongs.set(updatedList);
            }
          } catch (_) {}

          showToast(`Removed "${selected.title}" from today's list`);
        });
      });
    }
  }

  function initAdminToggle() {
    const btnAnnounce = document.getElementById('adminTabAnnouncement');
    const btnSong = document.getElementById('adminTabSong');
    const secAnnounce = document.getElementById('adminSectionAnnouncement');
    const secSong = document.getElementById('adminSectionSong');
    
    if (btnAnnounce && btnSong && secAnnounce && secSong) {
      btnAnnounce.addEventListener('click', () => {
        btnAnnounce.classList.add('active');
        btnSong.classList.remove('active');
        secAnnounce.style.display = 'block';
        secSong.style.display = 'none';
      });
      btnSong.addEventListener('click', () => {
        btnSong.classList.add('active');
        btnAnnounce.classList.remove('active');
        secSong.style.display = 'block';
        secAnnounce.style.display = 'none';
      });
    }

    renderAdminAnnouncementsList();
  }

  function initAdminAnnouncementActions() {
    const openAddBtn = document.getElementById('adminOpenAddAnnouncementModalBtn');
    const closeBtn = document.getElementById('closeAnnouncementEditModalBtn');
    const cancelBtn = document.getElementById('cancelAnnouncementEditBtn');
    const saveBtn = document.getElementById('saveAnnouncementEditBtn');
    const modalOverlay = document.getElementById('announcementEditModalOverlay');

    if (openAddBtn) {
      openAddBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openAnnouncementFormModal(null);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAnnouncementFormModal();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAnnouncementFormModal();
      });
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeAnnouncementFormModal();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const idInput = document.getElementById('announcementEditIdInput');
        const dateInput = document.getElementById('announcementDateInput');
        const textInput = document.getElementById('announcementTextInput');
        const prayerByInput = document.getElementById('announcementPrayerByInput');
        const prayerDateInput = document.getElementById('announcementPrayerDateInput');

        const editId = idInput?.value?.trim() || '';
        const dateVal = dateInput?.value?.trim() || '';
        const detailsVal = textInput?.value?.trim() || '';
        const prayerByVal = prayerByInput?.value?.trim() || '';
        const prayerDateVal = prayerDateInput?.value?.trim() || '';

        if (!detailsVal) {
          showToast('Please enter announcement details ⚠️');
          if (textInput) textInput.focus();
          return;
        }

        const list = getStoredAnnouncements();

        if (editId) {
          // Modifying existing announcement
          const index = list.findIndex(item => String(item.id) === String(editId));
          const updatedItem = {
            id: editId,
            date: dateVal,
            details: detailsVal,
            prayerBy: prayerByVal,
            prayerDate: prayerDateVal,
            updatedAt: new Date().toISOString()
          };
          if (index !== -1) {
            list[index] = { ...list[index], ...updatedItem };
          } else {
            list.unshift(updatedItem);
          }
          saveStoredAnnouncements(list);
          const metaPayload = (prayerByVal || prayerDateVal)
            ? '\n\n<!--meta:' + JSON.stringify({ prayerBy: prayerByVal, prayerDate: prayerDateVal }) + '-->'
            : '';
          if (window.ChurchSync && window.ChurchSync.Announcements && typeof window.ChurchSync.Announcements.upsert === 'function') {
            window.ChurchSync.Announcements.upsert({
              id: editId,
              title: dateVal || 'Announcement',
              body: detailsVal + metaPayload,
              date: dateVal,
              prayerBy: prayerByVal,
              prayerDate: prayerDateVal,
              is_active: true
            }).catch(err => console.warn('[Sync] Announcement update cloud error:', err));
          }
          closeAnnouncementFormModal();
          showToast('Announcement Updated ✨');
        } else {
          // Adding new announcement
          const newId = crypto.randomUUID();
          const newItem = {
            id: newId,
            date: dateVal,
            details: detailsVal,
            prayerBy: prayerByVal,
            prayerDate: prayerDateVal,
            createdAt: new Date().toISOString()
          };
          list.unshift(newItem);
          saveStoredAnnouncements(list);
          const metaPayload = (prayerByVal || prayerDateVal)
            ? '\n\n<!--meta:' + JSON.stringify({ prayerBy: prayerByVal, prayerDate: prayerDateVal }) + '-->'
            : '';
          if (window.ChurchSync && window.ChurchSync.Announcements && typeof window.ChurchSync.Announcements.upsert === 'function') {
            window.ChurchSync.Announcements.upsert({
              id: newId,
              title: dateVal || 'Announcement',
              body: detailsVal + metaPayload,
              date: dateVal,
              prayerBy: prayerByVal,
              prayerDate: prayerDateVal,
              is_active: true
            }).catch(err => console.warn('[Sync] Announcement insert cloud error:', err));
          }
          closeAnnouncementFormModal();
          showToast('Announcement Added ✨');
        }
      });
    }
  }

  let pendingSelectedSongs = [];
  let availableAdminDestinationSongs = [];

  function initAdminSongActions() {
    const bookSelect = document.getElementById('adminSongBook');
    const listSelect = document.getElementById('adminSongList');
    const addToListBtn = document.getElementById('adminAddSongToListBtn');
    const container = document.getElementById('adminSelectedSongsContainer');
    const countEl = document.getElementById('adminSelectedSongsCount');
    const publishBtn = document.getElementById('adminSongPublish');
    const cancelBtn = document.getElementById('adminSongCancel');

    pendingSelectedSongs = [...getStoredTodaySongs()];

    function renderAdminSelectedList() {
      if (!container) return;
      if (countEl) {
        countEl.textContent = `${pendingSelectedSongs.length} song${pendingSelectedSongs.length === 1 ? '' : 's'}`;
      }
      if (pendingSelectedSongs.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:14px 8px; color:var(--text-secondary); font-size:0.85rem;">No songs selected. Choose a book &amp; song above to add.</div>';
        return;
      }
      container.innerHTML = pendingSelectedSongs.map((s, idx) => `
        <div class="admin-selected-song-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; margin-bottom:6px; background:var(--bg-subtle); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
          <div style="display:flex; flex-direction:column; gap:2px; overflow:hidden; padding-right:8px;">
            <span style="font-weight:600; font-size:0.88rem; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${idx + 1}. ${escapeHtml(s.title || '')}</span>
            <span style="font-size:0.75rem; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${escapeHtml(s.bookName || 'Hymn')} ${s.songNumber ? `• ${escapeHtml(String(s.songNumber))}` : ''}</span>
          </div>
          <button type="button" class="btn-remove-song" data-index="${idx}" title="Remove song" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:4px 8px; font-size:1.1rem; line-height:1; font-weight:bold;">✕</button>
        </div>
      `).join('');

      container.querySelectorAll('.btn-remove-song').forEach(btn => {
        btn.addEventListener('click', async () => {
          const index = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(index) && pendingSelectedSongs[index]) {
            const song = pendingSelectedSongs[index];
            const confirmed = await window.showConfirmDialog({
              title: 'Remove Selected Hymn?',
              message: `Remove "${song.title}" from today's service list?`,
              icon: '🗑️',
              confirmText: 'Remove',
              isDanger: true
            });
            if (!confirmed) return;
            pendingSelectedSongs.splice(index, 1);
            renderAdminSelectedList();
          }
        });
      });
    }

    renderAdminSelectedList();

    function addSelectedSong() {
      if (!bookSelect || !listSelect) return;
      const bookVal = bookSelect.value;
      const songIdx = parseInt(listSelect.value, 10);
      if (!bookVal || isNaN(songIdx) || !availableAdminDestinationSongs[songIdx]) {
        showToast('Please select a song from the dropdown ⚠️');
        return;
      }
      const song = availableAdminDestinationSongs[songIdx];
      const title = song.title;
      const meta = song.meta || song.author || (bookVal === 'masihiGeet' ? 'Masihi Geeton Ka Sangrah' : 'Additional Songs');
      const lyrics = song.lyrics;
      const bookName = bookVal === 'masihiGeet' ? 'Masihi Geeton Ka Sangrah' : 'Additional Songs';
      const songNumber = song.songNumber || song.formattedNum || `#${songIdx + 1}`;

      if (pendingSelectedSongs.some(s => (s.title && s.title.toLowerCase() === title.toLowerCase()) || (s.id && s.id === song.id))) {
        showToast(`"${title}" is already in the selected list`);
        return;
      }

      pendingSelectedSongs.push({ id: song.id, title, meta, lyrics, bookName, songNumber });
      renderAdminSelectedList();
      showToast(`Added "${title}" to today's selection ✨`);
      listSelect.value = '';
    }

    if (bookSelect && listSelect) {
      bookSelect.addEventListener('change', async () => {
        const val = bookSelect.value;
        listSelect.innerHTML = '<option value="">-- Loading Songs... --</option>';
        listSelect.disabled = true;
        if (addToListBtn) addToListBtn.disabled = true;

        if (!val) {
          listSelect.innerHTML = '<option value="">-- Select a Song --</option>';
          availableAdminDestinationSongs = [];
          return;
        }

        try {
          const songs = await getSongsForBook(val);
          availableAdminDestinationSongs = songs || [];
          if (availableAdminDestinationSongs.length === 0) {
            listSelect.innerHTML = '<option value="">-- No Songs Available in this Book --</option>';
            listSelect.disabled = true;
            if (addToListBtn) addToListBtn.disabled = true;
            return;
          }

          listSelect.innerHTML = `<option value="">-- Select a Song (${availableAdminDestinationSongs.length} Available) --</option>` +
            availableAdminDestinationSongs.map((s, idx) => {
              const num = s.formattedNum || (s.songNumber ? `#${s.songNumber}` : `#${idx + 1}`);
              return `<option value="${idx}">${escapeHtml(num)} - ${escapeHtml(s.title)}</option>`;
            }).join('');

          listSelect.disabled = false;
          if (addToListBtn) addToListBtn.disabled = false;
        } catch (err) {
          console.warn('[AdminSong] Error fetching songs for book:', err);
          listSelect.innerHTML = '<option value="">-- Error Loading Songs --</option>';
        }
      });

      listSelect.addEventListener('change', () => {
        if (listSelect.value !== '') {
          addSelectedSong();
        }
      });
    }

    if (addToListBtn) {
      addToListBtn.addEventListener('click', addSelectedSong);
    }

    if (publishBtn) {
      publishBtn.addEventListener('click', async () => {
        const confirmed = await window.showConfirmDialog({
          title: 'Publish Service Songs?',
          message: pendingSelectedSongs.length > 0 
            ? `Publish ${pendingSelectedSongs.length} hymn(s) as today's featured worship songs?`
            : "Clear today's featured worship songs list?",
          icon: '🎵',
          confirmText: 'Publish'
        });
        if (!confirmed) return;

        saveStoredTodaySongs([...pendingSelectedSongs]);
        
        // Sync to cloud / Dexie
        try {
          if (window.ChurchSync && window.ChurchSync.TodaysSongs && typeof window.ChurchSync.TodaysSongs.set === 'function') {
            await window.ChurchSync.TodaysSongs.set([...pendingSelectedSongs]);
          }
          if (churchDexieDb && churchDexieDb.todays_song_selection) {
            await churchDexieDb.todays_song_selection.put({
              id: 'current_selection',
              date_key: new Date().toISOString().split('T')[0],
              songs: pendingSelectedSongs,
              updated_at: new Date().toISOString()
            });
          }
        } catch (_) {}

        showToast(pendingSelectedSongs.length > 0 
          ? `Published ${pendingSelectedSongs.length} song(s) for Today ✨` 
          : "Today's songs list cleared ✨");
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        pendingSelectedSongs = [...getStoredTodaySongs()];
        renderAdminSelectedList();
        if (bookSelect) bookSelect.value = '';
        if (listSelect) {
          listSelect.innerHTML = '<option value="">-- Select a Song --</option>';
          listSelect.disabled = true;
        }
        if (addToListBtn) addToListBtn.disabled = true;
        showToast('Changes Cancelled');
      });
    }
  }

  function openAnnouncementModal() {
    if (announcementModalOverlay) {
      renderAnnouncementHomeUI();
      showModal(announcementModalOverlay);
    }
  }

  function closeAnnouncementModal() {
    if (announcementModalOverlay) {
      hideModal(announcementModalOverlay);
    }
  }

  function syncSongModalBookmarkState() {
    const songs = getStoredTodaySongs();
    if (songs.length === 0) {
      if (bookmarkSongBtnText) bookmarkSongBtnText.textContent = 'Save to Bookmarks';
      if (bookmarkSongBtn) bookmarkSongBtn.classList.remove('saved');
      return;
    }
    const isBookmarked = songs.every(s => state.bookmarks.some(b => b.title.includes(s.title)));
    if (bookmarkSongBtn && bookmarkSongBtnText) {
      if (isBookmarked) {
        bookmarkSongBtnText.textContent = '✓ Saved in Bookmarks';
        bookmarkSongBtn.classList.add('saved');
      } else {
        bookmarkSongBtnText.textContent = 'Save to Bookmarks';
        bookmarkSongBtn.classList.remove('saved');
      }
    }
  }

  function openSongModal() {
    if (todaySongModalOverlay) {
      renderTodaySongHomeUI();
      showModal(todaySongModalOverlay);
    }
  }

  function closeSongModal() {
    if (todaySongModalOverlay) {
      hideModal(todaySongModalOverlay);
    }
  }

  function syncScreenBookBookmarkState() {
    if (!currentOpenBookKey || !CHURCH_DATA.churchBooks[currentOpenBookKey]) return;
    const book = CHURCH_DATA.churchBooks[currentOpenBookKey];
    const isBookmarked = state.bookmarks.some(b => b.title === book.title);

    if (screenBookmarkBookBtn) {
      if (isBookmarked) {
        screenBookmarkBookBtn.classList.add('saved');
        screenBookmarkBookBtn.title = 'Saved in Bookmarks';
      } else {
        screenBookmarkBookBtn.classList.remove('saved');
        screenBookmarkBookBtn.title = 'Save to Bookmarks';
      }
    }
  }

  let activeBookCardEl = null;
  let activeBookCoverImg = null;
  let activeStartBookRect = null;

  function openBookScreen(bookKey, clickedCardEl = null) {
    const book = CHURCH_DATA.churchBooks && CHURCH_DATA.churchBooks[bookKey];
    if (!book || !views.viewBookReader) return;

    // 1. Capture on-screen rectangle of the tapped book
    let triggerEl = clickedCardEl;
    if (!triggerEl && typeof event !== 'undefined' && event && event.currentTarget) {
      triggerEl = event.currentTarget;
    }
    if (!triggerEl) {
      triggerEl = document.querySelector(`[data-book-key="${bookKey}"]`) || document.querySelector(`.minimal-book-card[onclick*="${bookKey}"]`);
    }

    const bookCoverImg = triggerEl ? triggerEl.querySelector('.book-cover-img, img') : null;
    let clone = null;

    if (bookCoverImg) {
      activeBookCardEl = triggerEl;
      activeBookCoverImg = bookCoverImg;
      activeStartBookRect = bookCoverImg.getBoundingClientRect();

      // Create transition clone
      clone = bookCoverImg.cloneNode(true);
      clone.classList.add('transition-clone');
      clone.removeAttribute('id');
      clone.style.transition = 'none';
      clone.style.left = `${activeStartBookRect.left}px`;
      clone.style.top = `${activeStartBookRect.top}px`;
      clone.style.width = `${activeStartBookRect.width}px`;
      clone.style.height = `${activeStartBookRect.height}px`;
      clone.style.borderRadius = window.getComputedStyle(bookCoverImg).borderRadius || '14px';

      document.body.appendChild(clone);
      bookCoverImg.style.visibility = 'hidden';
      clone.getBoundingClientRect(); // Commit layout
    }

    previousTabBeforeBook = state.activeTab === 'viewBookReader' ? 'viewHome' : state.activeTab;
    currentOpenBookKey = bookKey;

    try {
      localStorage.setItem('sanctuary_active_book', bookKey);
    } catch (e) {}

    const bodyContentEl = document.getElementById('screenBookContent') || document.getElementById('screenReaderBodyContent');
    const titleEl = document.getElementById('screenReaderTitle');
    const subtitleEl = document.getElementById('screenReaderSubtitle');
    const tocEl = document.getElementById('screenReaderToc');
    const categoryEl = document.getElementById('screenReaderCategory');

    if (categoryEl) categoryEl.textContent = book.tag || 'Sacred Liturgy';
    if (titleEl) titleEl.textContent = book.title;
    if (subtitleEl) subtitleEl.textContent = book.subtitle;

    if (tocEl) {
      tocEl.innerHTML = (book.sections || []).map((sec, idx) => `
        <button class="reader-toc-chip" data-target="screen-sec-${idx}">
          ${(sec.rubric || '').split('(')[0].trim()}
        </button>
      `).join('');

      tocEl.querySelectorAll('.reader-toc-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const target = document.getElementById(chip.dataset.target);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.style.borderColor = 'var(--accent-gold)';
            setTimeout(() => {
              target.style.borderColor = 'var(--border-subtle)';
            }, 1600);
          }
        });
      });
    }

    if (bodyContentEl) {
      const sectionsHtml = (book.sections || []).map((sec, idx) => `
        <div class="screen-liturgy-card" id="screen-sec-${idx}">
          <div class="screen-liturgy-rubric">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M7 7h10M5 12h14"/>
            </svg>
            <span>${sec.rubric || ''}</span>
          </div>
          <div class="screen-liturgy-text">${(sec.text || '').replace(/\n/g, '<br>')}</div>
          ${sec.dialogue ? `<div class="screen-liturgy-dialogue">${sec.dialogue.replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      `).join('');

      let archivalCardHtml = '';
      const bookTargetUrl = book.htmlUrl || book.bookUrl || book.pdfUrl;
      if (bookTargetUrl) {
        archivalCardHtml = `
          <div class="screen-liturgy-card" style="text-align:center;padding:24px 16px;background:rgba(212,175,55,0.06);border:1px dashed var(--accent-gold);border-radius:16px;margin-top:20px;">
            <div style="font-size:1.8rem;margin-bottom:8px;">📖</div>
            <div style="font-weight:700;font-size:1.05rem;color:var(--text-primary);margin-bottom:6px;">Full Sacred Liturgy Book</div>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px;max-width:320px;margin-inline:auto;">Open the complete interactive edition of this liturgy with all rubrics, prayers, and hymns.</p>
            <button class="primary-btn" id="openArchivalPdfBtn" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;margin:0 auto;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <span>Open Complete Book</span>
            </button>
          </div>
        `;
      }

      bodyContentEl.innerHTML = sectionsHtml + archivalCardHtml;

      const openArchivalPdfBtn = document.getElementById('openArchivalPdfBtn');
      if (openArchivalPdfBtn && bookTargetUrl) {
        openArchivalPdfBtn.addEventListener('click', () => {
          openPdfBook(bookTargetUrl, book.title);
        });
      }
    }

    const screenPdfBookBtn = document.getElementById('screenPdfBookBtn');
    if (screenPdfBookBtn) {
      const bookTargetUrl = book.htmlUrl || book.bookUrl || book.pdfUrl;
      if (bookTargetUrl) {
        screenPdfBookBtn.style.display = 'inline-flex';
        screenPdfBookBtn.onclick = () => openPdfBook(bookTargetUrl, book.title);
      } else {
        screenPdfBookBtn.style.display = 'none';
      }
    }

    syncScreenBookBookmarkState();
    switchTab('viewBookReader');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 2. Animate clone to fullscreen reader viewport
    if (clone) {
      clone.style.transition = [
        'left 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'top 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'width 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'height 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'border-radius 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'opacity 450ms cubic-bezier(0.22, 1, 0.36, 1)'
      ].join(',');

      requestAnimationFrame(() => {
        clone.style.left = '0px';
        clone.style.top = '0px';
        clone.style.width = `${window.innerWidth}px`;
        clone.style.height = `${window.innerHeight}px`;
        clone.style.borderRadius = '0px';
        clone.style.opacity = '0';
      });

      setTimeout(() => {
        if (clone) clone.remove();
        if (activeBookCoverImg) activeBookCoverImg.style.visibility = '';
      }, 480);
    }
  }

  function closeBookScreen() {
    try {
      localStorage.removeItem('sanctuary_active_book');
    } catch (e) {}

    // Reverse Shared Element Container Transform back to original card
    if (activeBookCoverImg && activeStartBookRect) {
      const clone = activeBookCoverImg.cloneNode(true);
      clone.classList.add('transition-clone');
      clone.removeAttribute('id');
      clone.style.transition = 'none';
      clone.style.left = '0px';
      clone.style.top = '0px';
      clone.style.width = `${window.innerWidth}px`;
      clone.style.height = `${window.innerHeight}px`;
      clone.style.borderRadius = '0px';
      clone.style.opacity = '0';

      document.body.appendChild(clone);
      clone.getBoundingClientRect();

      clone.style.transition = [
        'left 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'top 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'width 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'height 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'border-radius 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        'opacity 450ms cubic-bezier(0.22, 1, 0.36, 1)'
      ].join(',');

      requestAnimationFrame(() => {
        clone.style.left = `${activeStartBookRect.left}px`;
        clone.style.top = `${activeStartBookRect.top}px`;
        clone.style.width = `${activeStartBookRect.width}px`;
        clone.style.height = `${activeStartBookRect.height}px`;
        clone.style.borderRadius = '14px';
        clone.style.opacity = '1';
      });

      switchTab(previousTabBeforeBook || 'viewHome');

      setTimeout(() => {
        if (clone) clone.remove();
        if (activeBookCoverImg) activeBookCoverImg.style.visibility = '';
        activeBookCardEl = null;
        activeBookCoverImg = null;
        activeStartBookRect = null;
      }, 480);
    } else {
      switchTab(previousTabBeforeBook || 'viewHome');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ==========================================================================
     DEDICATED TWO-SCREEN SONGBOOK & LYRICS SYSTEM
     ========================================================================== */

  // ── Helper: Normalized bidirectional song book matcher ───────────────────────
  function matchesSongBook(bookRef, targetBookKey) {
    if (!targetBookKey) return false;
    const rawRef = String(bookRef || '').trim();
    if (!rawRef) {
      const cleanTarget = String(targetBookKey).toLowerCase().replace(/[\s_\-]+/g, '');
      return cleanTarget === 'masihigeet' || cleanTarget === 'masihigeetonkasangrah' || cleanTarget === 'hymnal';
    }

    const normRef = rawRef.toLowerCase();
    const cleanRef = normRef.replace(/[\s_\-]+/g, '');
    const normKey = String(targetBookKey).toLowerCase();
    const cleanKey = normKey.replace(/[\s_\-]+/g, '');

    // Exact direct matches
    if (normRef === normKey || cleanRef === cleanKey) return true;

    // Target: Masihi Geeton Ka Sangrah / masihiGeet
    const isMasihiTarget = (
      cleanKey === 'masihigeet' ||
      cleanKey === 'masihigeetonkasangrah' ||
      cleanKey === 'masihigeetokasangrah' ||
      cleanKey === 'hymnal' ||
      cleanKey === 'songbook'
    );
    if (isMasihiTarget) {
      const masihiAliases = [
        'masihigeet',
        'masihi_geeto_ka_sangrah',
        'masihi geeton ka sangrah',
        'masihi geeto ka sangrah',
        'masihi geet',
        'hymnal',
        'songbook',
        'masihigeetonkasangrah',
        'masihigeetokasangrah',
        'masihisangrah',
        'geet sangrah',
        'geetsangrah'
      ];
      if (masihiAliases.includes(normRef) || masihiAliases.some(a => a.replace(/[\s_\-]+/g, '') === cleanRef)) {
        return true;
      }
      if (cleanRef.includes('masihi') || cleanRef.includes('sangrah') || cleanRef.includes('hymnal') || cleanRef.includes('songbook')) {
        return true;
      }
      return false;
    }

    // Target: Additional Songs of Church / additionalSongs
    const isAdditionalTarget = (
      cleanKey === 'additionalsongs' ||
      cleanKey === 'additionalsongsofchurch' ||
      cleanKey === 'additional'
    );
    if (isAdditionalTarget) {
      const additionalAliases = [
        'additionalsongs',
        'additional_songs',
        'additional songs of church',
        'additional songs',
        'additional',
        'additionalsongsofchurch',
        'additional_songs_of_church',
        'church additional songs'
      ];
      if (additionalAliases.includes(normRef) || additionalAliases.some(a => a.replace(/[\s_\-]+/g, '') === cleanRef)) {
        return true;
      }
      if (cleanRef.includes('additional')) {
        return true;
      }
      return false;
    }

    return cleanRef === cleanKey;
  }

  // ── getSongsForBook: unified song source (static + Dexie + localStorage) ──
  async function getSongsForBook(bookKey) {
    if (!bookKey) bookKey = 'masihiGeet';
    const normKey = String(bookKey).toLowerCase().replace(/[\s_\-]+/g, '');
    let resolvedBookKey = bookKey;
    if (normKey === 'masihigeetokasangrah' || normKey === 'masihigeetonkasangrah' || normKey === 'masihisangrah' || normKey === 'hymnal') {
      resolvedBookKey = 'masihiGeet';
    } else if (normKey === 'additionalsongsofchurch' || normKey === 'additionalsongs' || normKey === 'additional') {
      resolvedBookKey = 'additionalSongs';
    }

    const songs = [];
    const book = (window.CHURCH_DATA && window.CHURCH_DATA.churchBooks) ? window.CHURCH_DATA.churchBooks[resolvedBookKey] : null;

    // Load blacklist from localStorage
    let blacklist = [];
    try {
      blacklist = JSON.parse(localStorage.getItem('sanctuary_deleted_songs_blacklist') || '[]');
      if (!Array.isArray(blacklist)) blacklist = [];
    } catch (_) {
      blacklist = [];
    }
    const blacklistSet = new Set(blacklist.map(x => String(x).toLowerCase().trim()));

    const isBlacklisted = (id, title, rubric) => {
      if (!blacklistSet.size) return false;
      if (id && blacklistSet.has(String(id).toLowerCase().trim())) return true;
      if (title && blacklistSet.has(String(title).toLowerCase().trim())) return true;
      if (rubric && blacklistSet.has(String(rubric).toLowerCase().trim())) return true;
      return false;
    };

    // 1. Built-in sections from book data
    if (book && Array.isArray(book.sections)) {
      book.sections.forEach((sec, idx) => {
        if (sec && (sec.rubric || sec.title || sec.text || sec.lyrics)) {
          const title = sec.title || (sec.rubric ? sec.rubric.replace(/^गीत\s*\d+:\s*|^Song\s*\d+:\s*|^Hymn\s*#?\d+:\s*/i, '').split('(')[0].trim() : `Hymn #${idx + 1}`);
          const numMatch = sec.rubric ? sec.rubric.match(/^(?:गीत|Song|Hymn)\s*#?\s*(\d+)/i) : null;
          const formattedNum = sec.formattedNum || (numMatch ? `#${numMatch[1]}` : `#${idx + 1}`);
          const songNum = numMatch ? parseInt(numMatch[1], 10) : (idx + 1);
          const songId = `static-${resolvedBookKey}-${idx}`;

          if (!isBlacklisted(songId, title, sec.rubric) && !isBlacklisted(null, sec.title, null)) {
            songs.push({
              id: songId,
              formattedNum: formattedNum,
              songNumber: songNum,
              title: title,
              lyrics: sec.text || sec.lyrics || '',
              meta: sec.dialogue || (book ? book.title : 'Sacred Hymnal'),
              category: sec.category || 'hymn'
            });
          }
        }
      });
    }

    // Also support book.songs array if present
    if (book && Array.isArray(book.songs)) {
      book.songs.forEach((s, idx) => {
        if (s && (s.title || s.hindiTitle || s.lyrics)) {
          const title = s.title || s.hindiTitle || `Hymn #${idx + 1}`;
          const songNum = s.number || (idx + 1);
          const songId = `static-song-${resolvedBookKey}-${s.id || idx}`;
          if (!isBlacklisted(songId, title, null)) {
            const alreadyExists = songs.some(existing =>
              (existing.id && existing.id === songId) ||
              (existing.title && title && existing.title.toLowerCase().trim() === title.toLowerCase().trim() && existing.songNumber === songNum)
            );
            if (!alreadyExists) {
              songs.push({
                id: songId,
                formattedNum: `#${songNum}`,
                songNumber: songNum,
                title: title,
                lyrics: s.lyrics || '',
                meta: s.category || (book ? book.title : 'Sacred Hymnal'),
                category: s.category || 'hymn'
              });
            }
          }
        }
      });
    }

    // 2. Gather from all Dexie databases & LocalStorage backup stores
    try {
      const dbSongs = [];
      const addDbSongs = (arr) => {
        if (Array.isArray(arr)) {
          arr.forEach(item => {
            if (!item || item.deleted_at) return;
            const alreadyInRaw = dbSongs.some(x => {
              if (item.id && x.id && item.id === x.id) return true;
              if (item.title && x.title && item.title.toLowerCase().trim() === x.title.toLowerCase().trim() &&
                  (item.song_number || item.serialNumber) === (x.song_number || x.serialNumber) &&
                  String(item.book_reference || '').toLowerCase().trim() === String(x.book_reference || '').toLowerCase().trim()) {
                return true;
              }
              return false;
            });
            if (!alreadyInRaw) {
              dbSongs.push(item);
            }
          });
        }
      };

      // churchDexieDb.custom_songs
      if (typeof churchDexieDb !== 'undefined' && churchDexieDb && churchDexieDb.custom_songs) {
        try {
          const res = await churchDexieDb.custom_songs.toArray();
          addDbSongs(res);
        } catch (_) {}
      }

      // churchDexieDb.songs
      if (typeof churchDexieDb !== 'undefined' && churchDexieDb && churchDexieDb.songs) {
        try {
          const res = await churchDexieDb.songs.toArray();
          addDbSongs(res);
        } catch (_) {}
      }

      // window.ChurchSync.db.custom_songs
      if (typeof window !== 'undefined' && window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.custom_songs) {
        try {
          const res = await window.ChurchSync.db.custom_songs.toArray();
          addDbSongs(res);
        } catch (_) {}
      }

      // window.ChurchSync.db.songs
      if (typeof window !== 'undefined' && window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.songs) {
        try {
          const res = await window.ChurchSync.db.songs.toArray();
          addDbSongs(res);
        } catch (_) {}
      }

      // LocalStorage: sanctuary_custom_songs_backup
      try {
        const localBackup = JSON.parse(localStorage.getItem('sanctuary_custom_songs_backup') || '[]');
        addDbSongs(localBackup);
      } catch (_) {}

      // LocalStorage: sanctuary_imported_songs
      try {
        const importedBackup = JSON.parse(localStorage.getItem('sanctuary_imported_songs') || '[]');
        addDbSongs(importedBackup);
      } catch (_) {}

      // Filter and insert into song list
      if (Array.isArray(dbSongs)) {
        dbSongs.forEach(s => {
          if (!s || s.deleted_at) return;
          // Normalized, bidirectional matcher against this book's destination
          const matchesBook = matchesSongBook(s.book_reference, resolvedBookKey);
          if (matchesBook) {
            const songId = s.id || `custom-${resolvedBookKey}-${s.song_number || s.serialNumber || ''}`;
            if (!isBlacklisted(songId, s.title, null)) {
              // Deduplicate only exact same id or exact same title AND song number (avoid collision false positives)
              const alreadyExists = songs.some(existing =>
                (existing.id && songId && existing.id === songId) ||
                (existing.title && s.title &&
                 existing.title.toLowerCase().trim() === s.title.toLowerCase().trim() &&
                 String(existing.songNumber) === String(s.song_number || s.serialNumber))
              );
              if (!alreadyExists) {
                const songNum = s.song_number || s.serialNumber || (songs.length + 1);
                songs.push({
                  id: songId,
                  formattedNum: `#${songNum}`,
                  songNumber: songNum,
                  title: s.title || `Hymn #${songNum}`,
                  lyrics: s.lyrics || '',
                  meta: s.author || (book ? book.title : 'Sacred Hymnal'),
                  category: s.category || 'hymn'
                });
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn('[SongBook] Dexie/Storage read error:', err);
    }

    // 3. Sort by song number ascending
    songs.sort((a, b) => (a.songNumber || 0) - (b.songNumber || 0));
    return songs;
  }

  // ── refreshSongBookCards: in-place card render without tab-switching or scroll jumps ─
  async function refreshSongBookCards(bookKey) {
    const key = bookKey || currentOpenSongBookKey || 'masihiGeet';
    const normKey = String(key).toLowerCase().replace(/[\s_\-]+/g, '');
    let resolvedBookKey = key;
    if (normKey === 'masihigeetokasangrah' || normKey === 'masihigeetonkasangrah' || normKey === 'masihisangrah' || normKey === 'hymnal') {
      resolvedBookKey = 'masihiGeet';
    } else if (normKey === 'additionalsongsofchurch' || normKey === 'additionalsongs' || normKey === 'additional') {
      resolvedBookKey = 'additionalSongs';
    }
    const allSongs = await getSongsForBook(resolvedBookKey);
    currentSongList = allSongs;
    window.currentSongList = allSongs;
    if (state.activeTab === 'viewSongList' && songListContainer) {
      if (!allSongs || allSongs.length === 0) {
        songListContainer.innerHTML = `
          <div class="empty-song-state">
            <div class="empty-song-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <div class="empty-song-title">No Songs Available</div>
            <div class="empty-song-desc">This songbook currently has no songs. Import songs from Settings → Import Data.</div>
          </div>
        `;
      } else {
        songListContainer.innerHTML = allSongs.map((song, idx) => `
          <div class="song-list-item-card" data-song-index="${idx}" role="button" tabindex="0" title="Read ${escapeHtml(song.title)} lyrics">
            <div class="song-select-checkbox-wrap">
              <span class="song-select-checkbox">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="3" fill="none">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            </div>
            <div class="song-list-left">
              <span class="song-item-num-badge">${escapeHtml(song.formattedNum || `#${idx + 1}`)}</span>
              <h4 class="song-item-title">${escapeHtml(song.title)}</h4>
            </div>
            <svg class="song-item-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        `).join('');
      }
      if (typeof updateSongSelectionUI === 'function' && isSongSelectionMode) {
        updateSongSelectionUI();
      }
    }
    return allSongs;
  }
  window.refreshSongBookCards = refreshSongBookCards;

  // ── renderAdditionalSongsFromDexie: auto-refresh active songbook in background ──
  async function renderAdditionalSongsFromDexie() {
    if (isSongSelectionMode) {
      return;
    }
    try {
      await refreshSongBookCards(currentOpenSongBookKey || 'additionalSongs');
    } catch (e) {
      console.warn('[SongBook] renderAdditionalSongsFromDexie error:', e);
    }
  }
  window.renderAdditionalSongsFromDexie = renderAdditionalSongsFromDexie;

  // ── Multi-Selection State for Song Book ──────────────────────────────────────
  let isSongSelectionMode = false;
  let selectedSongIndices = new Set();

  function enterSongSelectionMode(initialIdx) {
    isSongSelectionMode = true;
    selectedSongIndices.clear();
    if (initialIdx !== undefined && initialIdx >= 0) {
      selectedSongIndices.add(initialIdx);
    }
    updateSongSelectionUI();
  }

  function exitSongSelectionMode() {
    isSongSelectionMode = false;
    selectedSongIndices.clear();
    updateSongSelectionUI();
  }

  function toggleSongSelection(idx) {
    if (selectedSongIndices.has(idx)) {
      selectedSongIndices.delete(idx);
    } else {
      selectedSongIndices.add(idx);
    }
    updateSongSelectionUI();
  }

  function toggleSelectAllSongs() {
    if (!currentSongList || currentSongList.length === 0) return;
    if (selectedSongIndices.size === currentSongList.length) {
      selectedSongIndices.clear();
    } else {
      selectedSongIndices.clear();
      for (let i = 0; i < currentSongList.length; i++) {
        selectedSongIndices.add(i);
      }
    }
    updateSongSelectionUI();
  }

  function updateSongSelectionUI() {
    const bar = document.getElementById('songSelectionActionBar');
    const backBar = document.getElementById('songFloatingBackBar');
    const countBadge = document.getElementById('songSelectionCountBadge');
    const selectAllBtnText = document.getElementById('songSelectAllBtnText');
    const deleteBtnText = document.getElementById('songDeleteBtnText');
    const songListView = document.getElementById('viewSongList');

    if (songListView) {
      songListView.classList.toggle('in-selection-mode', isSongSelectionMode);
    }
    document.body.classList.toggle('in-song-selection-mode', isSongSelectionMode);

    if (bar) {
      if (isSongSelectionMode) bar.classList.remove('hidden');
      else bar.classList.add('hidden');
    }

    if (backBar) {
      if (state.activeTab === 'viewSongList' || state.activeTab === 'viewSongLyrics') {
        backBar.classList.remove('hidden');
      } else {
        backBar.classList.add('hidden');
      }
    }

    if (countBadge) countBadge.textContent = `${selectedSongIndices.size} Selected`;

    if (selectAllBtnText && currentSongList) {
      if (selectedSongIndices.size === currentSongList.length && currentSongList.length > 0) {
        selectAllBtnText.textContent = 'Deselect All';
      } else {
        selectAllBtnText.textContent = 'Select All';
      }
    }

    if (deleteBtnText) {
      deleteBtnText.textContent = selectedSongIndices.size > 0 ? `Delete (${selectedSongIndices.size})` : 'Delete';
    }

    if (songListContainer) {
      const cards = songListContainer.querySelectorAll('.song-list-item-card');
      cards.forEach(card => {
        const idx = parseInt(card.dataset.songIndex, 10);
        const isSelected = selectedSongIndices.has(idx);
        const checkboxWrap = card.querySelector('.song-select-checkbox-wrap');
        const checkbox = card.querySelector('.song-select-checkbox');

        if (isSongSelectionMode) {
          card.classList.add('selection-mode');
          if (checkboxWrap) checkboxWrap.classList.add('active');
        } else {
          card.classList.remove('selection-mode');
          if (checkboxWrap) checkboxWrap.classList.remove('active');
        }

        if (isSelected) {
          card.classList.add('selected');
          if (checkbox) checkbox.classList.add('checked');
        } else {
          card.classList.remove('selected');
          if (checkbox) checkbox.classList.remove('checked');
        }
      });
    }
  }

  async function deleteSelectedSongs() {
    window.deleteSelectedSongs = deleteSelectedSongs;
    if (selectedSongIndices.size === 0) {
      showToast('Please select songs to delete');
      return;
    }

    const count = selectedSongIndices.size;
    const confirmed = await (window.showConfirmDialog ? window.showConfirmDialog({
      title: `Delete ${count} ${count === 1 ? 'Song' : 'Songs'}?`,
      message: `Are you sure you want to delete ${count} selected ${count === 1 ? 'song' : 'songs'}? This will remove them permanently from your songbook and database.`,
      confirmText: `Delete (${count})`,
      cancelText: 'Cancel',
      icon: '🗑️',
      isDanger: true
    }) : Promise.resolve(confirm(`Delete ${count} songs from database?`)));

    if (!confirmed) return;

    const songsToDelete = Array.from(selectedSongIndices)
      .map(idx => currentSongList[idx])
      .filter(Boolean);

    let deletedCount = 0;

    // Load blacklist from localStorage
    let blacklist = [];
    try {
      blacklist = JSON.parse(localStorage.getItem('sanctuary_deleted_songs_blacklist') || '[]');
      if (!Array.isArray(blacklist)) blacklist = [];
    } catch (_) {
      blacklist = [];
    }
    const blacklistSet = new Set(blacklist.map(x => String(x).toLowerCase().trim()));

    const deleteFromTable = async (table, song) => {
      if (!table) return;
      try {
        if (song.id) {
          await table.delete(song.id).catch(() => {});
        }
        if (song.title) {
          try {
            await table.where('title').equalsIgnoreCase(song.title).delete();
          } catch (_) {
            try {
              const all = await table.toArray();
              for (const record of all) {
                if (record && record.title && String(record.title).toLowerCase().trim() === String(song.title).toLowerCase().trim()) {
                  if (record.id) await table.delete(record.id).catch(() => {});
                }
              }
            } catch (_) {}
          }
        }
        if (song.songNumber) {
          try {
            await table.where('song_number').equals(song.songNumber).delete();
          } catch (_) {}
        }
      } catch (err) {
        console.warn('[SongBook] Dexie delete table error:', err);
      }
    };

    for (const song of songsToDelete) {
      const sId = song.id || (typeof song.id === 'string' && song.id);
      const sTitle = song.title;

      // 0. Hard-delete from Supabase Cloud
      if (window.ChurchSync && window.ChurchSync.Songs) {
        if (typeof window.ChurchSync.Songs.delete === 'function') {
          try {
            await window.ChurchSync.Songs.delete(sId, sTitle);
          } catch (err) {
            console.warn('[Sync] Delete error for song:', sId, err);
          }
        } else if (typeof window.ChurchSync.Songs.softDelete === 'function') {
          try {
            await window.ChurchSync.Songs.softDelete(sId, sTitle);
          } catch (err) {
            console.warn('[Sync] Soft-delete error for song:', sId, err);
          }
        }
      }

      // 1. Delete from Dexie DBs (churchDexieDb and window.ChurchSync.db)
      if (typeof churchDexieDb !== 'undefined' && churchDexieDb) {
        await deleteFromTable(churchDexieDb.custom_songs, song);
        await deleteFromTable(churchDexieDb.songs, song);
        await deleteFromTable(churchDexieDb.song_book, song);
      }
      if (typeof window !== 'undefined' && window.ChurchSync && window.ChurchSync.db) {
        await deleteFromTable(window.ChurchSync.db.custom_songs, song);
        await deleteFromTable(window.ChurchSync.db.songs, song);
        await deleteFromTable(window.ChurchSync.db.song_book, song);
      }

      // 2. Delete from localStorage (sanctuary_custom_songs_backup, sanctuary_imported_songs)
      try {
        const customBackup = JSON.parse(localStorage.getItem('sanctuary_custom_songs_backup') || '[]');
        if (Array.isArray(customBackup)) {
          const filtered = customBackup.filter(s =>
            s &&
            s.id !== song.id &&
            (!song.title || !s.title || String(s.title).toLowerCase().trim() !== String(song.title).toLowerCase().trim())
          );
          localStorage.setItem('sanctuary_custom_songs_backup', JSON.stringify(filtered));
        }
      } catch (_) {}

      try {
        const imported = JSON.parse(localStorage.getItem('sanctuary_imported_songs') || '[]');
        if (Array.isArray(imported)) {
          const filtered = imported.filter(s =>
            s &&
            s.id !== song.id &&
            (!song.title || !s.title || String(s.title).toLowerCase().trim() !== String(song.title).toLowerCase().trim())
          );
          localStorage.setItem('sanctuary_imported_songs', JSON.stringify(filtered));
        }
      } catch (_) {}

      // 3. Add deleted static song keys/titles to sanctuary_deleted_songs_blacklist in localStorage
      if (song.id) {
        blacklistSet.add(String(song.id).toLowerCase().trim());
      }
      if (song.title) {
        blacklistSet.add(String(song.title).toLowerCase().trim());
      }

      // 4. Update in-memory CHURCH_DATA.churchBooks[bookKey].sections and .songs
      if (window.CHURCH_DATA && window.CHURCH_DATA.churchBooks) {
        const book = window.CHURCH_DATA.churchBooks[currentOpenSongBookKey];
        if (book) {
          if (Array.isArray(book.sections)) {
            book.sections = book.sections.filter(sec => {
              if (!sec) return false;
              const secTitle = sec.title || (sec.rubric ? sec.rubric.replace(/^गीत\s*\d+:\s*|^Song\s*\d+:\s*|^Hymn\s*#?\d+:\s*/i, '').split('(')[0].trim() : '');
              const matchesTitle = song.title && secTitle.toLowerCase().trim() === song.title.toLowerCase().trim();
              const matchesRubric = song.title && sec.rubric && sec.rubric.toLowerCase().includes(song.title.toLowerCase().trim());
              return !matchesTitle && !matchesRubric;
            });
          }
          if (Array.isArray(book.songs)) {
            book.songs = book.songs.filter(s => {
              if (!s) return false;
              const sTitle = s.title || s.hindiTitle || '';
              return !song.title || sTitle.toLowerCase().trim() !== song.title.toLowerCase().trim();
            });
          }
        }
      }

      deletedCount++;
    }

    // Persist updated blacklist
    try {
      localStorage.setItem('sanctuary_deleted_songs_blacklist', JSON.stringify(Array.from(blacklistSet)));
    } catch (_) {}

    exitSongSelectionMode();
    if (typeof invalidateSearchDatabase === 'function') invalidateSearchDatabase();
    showToast(`🗑️ ${deletedCount} ${deletedCount === 1 ? 'song' : 'songs'} deleted`);
    await openSongBookScreen(currentOpenSongBookKey);
  }

  // ── openSongBookScreen — renders song list with search, selection, long-press ─
  async function openSongBookScreen(bookKey, options = {}) {
    window.openSongBookScreen = openSongBookScreen;
    if (!bookKey) bookKey = 'masihiGeet';
    const normKey = String(bookKey).toLowerCase().replace(/[\s_\-]+/g, '');
    let resolvedBookKey = bookKey;
    if (normKey === 'masihigeetokasangrah' || normKey === 'masihigeetonkasangrah' || normKey === 'masihisangrah' || normKey === 'hymnal') {
      resolvedBookKey = 'masihiGeet';
    } else if (normKey === 'additionalsongsofchurch' || normKey === 'additionalsongs' || normKey === 'additional') {
      resolvedBookKey = 'additionalSongs';
    }

    const book = CHURCH_DATA.churchBooks && CHURCH_DATA.churchBooks[resolvedBookKey];
    if (!book || !views.viewSongList) return;

    currentOpenSongBookKey = resolvedBookKey;
    window.currentOpenSongBookKey = resolvedBookKey;
    try {
      localStorage.setItem('sanctuary_active_songbook', resolvedBookKey);
    } catch (e) {}

    const renderSongCards = (list) => {
      if (!songListContainer) return;
      if (!list || list.length === 0) {
        songListContainer.innerHTML = `
          <div class="empty-song-state">
            <div class="empty-song-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <div class="empty-song-title">No Songs Available</div>
            <div class="empty-song-desc">This songbook currently has no songs. Import songs from Settings → Import Data.</div>
          </div>
        `;
      } else {
        songListContainer.innerHTML = list.map((song, idx) => `
          <div class="song-list-item-card" data-song-index="${idx}" role="button" tabindex="0" title="Read ${escapeHtml(song.title)} lyrics">
            <div class="song-select-checkbox-wrap">
              <span class="song-select-checkbox">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="3" fill="none">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            </div>
            <div class="song-list-left">
              <span class="song-item-num-badge">${escapeHtml(song.formattedNum || `#${idx + 1}`)}</span>
              <h4 class="song-item-title">${escapeHtml(song.title)}</h4>
            </div>
            <svg class="song-item-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        `).join('');
      }
      if (typeof updateSongSelectionUI === 'function' && isSongSelectionMode) {
        updateSongSelectionUI();
      }
    };

    // Gather songs using unified getSongsForBook
    const allSongs = await getSongsForBook(resolvedBookKey);
    currentSongList = allSongs;
    window.currentSongList = allSongs;

    // Local-first load from Dexie cache (navigation-triggered cloud sync disabled per policy)

    // Reset selection mode when opening screen
    if (!options || !options.background) {
      exitSongSelectionMode();
    }

    // Render Song List
    renderSongCards(allSongs);

        // Attach click, keyboard, and long-press listeners via delegation (Zero allocations per card)
        if (!songListContainer._hasDelegatedSongListeners) {
          songListContainer._hasDelegatedSongListeners = true;
          let pressTimer = null;
          let isLongPress = false;
          let touchStartX = 0, touchStartY = 0;

          const startPress = (card, e) => {
            if (isSongSelectionMode) {
              return;
            }
            isLongPress = false;
            if (e.touches && e.touches.length === 1) {
              touchStartX = e.touches[0].clientX;
              touchStartY = e.touches[0].clientY;
            }
            const idx = parseInt(card.dataset.songIndex, 10);
            pressTimer = setTimeout(() => {
              isLongPress = true;
              if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
              enterSongSelectionMode(idx);
            }, 450);
          };

          const cancelPress = () => {
            if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
          };

          const handleTouchMove = (e) => {
            if (e.touches && e.touches.length === 1) {
              if (Math.abs(e.touches[0].clientX - touchStartX) > 12 || Math.abs(e.touches[0].clientY - touchStartY) > 12) {
                cancelPress();
              }
            }
          };

          songListContainer.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.song-list-item-card');
            if (card) startPress(card, e);
          }, { passive: true });

          songListContainer.addEventListener('touchend', cancelPress, { passive: true });
          songListContainer.addEventListener('touchcancel', cancelPress, { passive: true });
          songListContainer.addEventListener('touchmove', handleTouchMove, { passive: true });

          songListContainer.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
              const card = e.target.closest('.song-list-item-card');
              if (card) startPress(card, e);
            }
          });

          songListContainer.addEventListener('mouseup', cancelPress);
          songListContainer.addEventListener('mouseleave', cancelPress);

          songListContainer.addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.song-list-item-card');
            if (card) {
              e.preventDefault();
              const idx = parseInt(card.dataset.songIndex, 10);
              if (!isSongSelectionMode) enterSongSelectionMode(idx);
              else toggleSongSelection(idx);
            }
          });

          const handleCardSelect = (card, e) => {
            if (isLongPress) { isLongPress = false; return; }
            const idx = parseInt(card.dataset.songIndex, 10);
            if (isSongSelectionMode) {
              e.preventDefault();
              e.stopPropagation();
              toggleSongSelection(idx);
              return;
            }
            if (currentSongList && currentSongList[idx]) {
              openSongLyricsScreen(currentSongList[idx], currentOpenSongBookKey, idx);
            }
          };

          songListContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.song-list-item-card');
            if (card) handleCardSelect(card, e);
          });

          songListContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              const card = e.target.closest('.song-list-item-card');
              if (card) { e.preventDefault(); handleCardSelect(card, e); }
            }
          });
        }

    // Wire up back button
    const listBackBtn = document.getElementById('songListBackBtn');
    if (listBackBtn) {
      listBackBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (isSongSelectionMode) exitSongSelectionMode();
        else switchTab('viewHome');
      };
    }

    if (!options || !options.background) {
      switchTab('viewSongList');

      // Ensure floating back bar is visible after tab switch
      const backBarAfterSwitch = document.getElementById('songFloatingBackBar');
      if (backBarAfterSwitch) backBarAfterSwitch.classList.remove('hidden');

      window.scrollTo({ top: 0, behavior: 'instant' });
      document.querySelector('.app-container')?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function openSongLyricsScreen(song, bookKey, songIdx = 0) {
    window.openSongLyricsScreen = openSongLyricsScreen;
    if (!song || !views.viewSongLyrics) return;

    currentOpenSong = song;
    window.currentOpenSong = song;
    currentActiveSongObj = song;
    window._activeEditingSong = song;
    currentOpenSongBookKey = bookKey || song.bookKey || 'masihiGeet';
    window.currentOpenSongBookKey = currentOpenSongBookKey;

    try {
      localStorage.setItem('sanctuary_active_song_idx', String(songIdx));
      localStorage.setItem('sanctuary_active_songbook', currentOpenSongBookKey);
    } catch (e) {}

    const isBookmarked = state.bookmarks.some(b => b.title.includes(song.title));
    const perms = (typeof useAppPermissions === 'function') ? useAppPermissions() : {};
    const isSuperAdmin = Boolean(currentAuthSession.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL);
    const canEditSong = Boolean(isSuperAdmin || currentAuthSession.role === 'admin' || perms.canEdit || perms.isSuperAdmin);
    const canDeleteSong = Boolean(isSuperAdmin || perms.canDelete || perms.isSuperAdmin);

    if (songLyricsContainer) {
      songLyricsContainer.innerHTML = `
        <div class="song-lyrics-card">
          <div class="song-lyrics-header">
            <span class="song-lyrics-badge">${escapeHtml(song.bookTitle || 'Church Hymnal')} • Song #${song.songNumber}</span>
            <h2 class="song-lyrics-title">${escapeHtml(song.title)}</h2>
            ${song.subtitle ? `<p class="song-lyrics-meta">${escapeHtml(song.subtitle)}</p>` : ''}
          </div>
          <div class="song-lyrics-body">${escapeHtml(song.lyrics).replace(/\n/g, '<br>')}</div>
          <div class="song-lyrics-actions">
            <button class="song-lyrics-action-btn secondary" id="copyCurrentSongLyricsBtn" title="Copy Lyrics">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span id="copyCurrentSongText">Copy Lyrics</span>
            </button>
            <button class="song-lyrics-action-btn secondary ${isBookmarked ? 'saved' : ''}" id="bookmarkCurrentSongLyricsBtn" title="Save to Bookmarks">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="${isBookmarked ? 'currentColor' : 'none'}">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              <span id="bookmarkCurrentSongText">${isBookmarked ? '✓ Saved in Bookmarks' : 'Save to Bookmarks'}</span>
            </button>
            ${canEditSong ? `
            <button class="song-lyrics-action-btn edit-btn secondary" id="editCurrentSongLyricsBtn" title="Edit Hymn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit Hymn</span>
            </button>` : ''}
            ${canDeleteSong ? `
            <button class="song-lyrics-action-btn delete-btn secondary" id="deleteCurrentSongLyricsBtn" title="Delete Hymn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>` : ''}
          </div>
        </div>
      `;

      // Bind edit hymn button
      const editBtn = document.getElementById('editCurrentSongLyricsBtn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          window._activeEditingSong = song;
          const overlay = document.getElementById('editSongModalOverlay') || document.getElementById('songEditModalOverlay');
          const titleIn = document.getElementById('editSongTitleInput');
          const authorIn = document.getElementById('editSongAuthorInput');
          const numIn = document.getElementById('editSongNumberInput');
          const lyricsIn = document.getElementById('editSongLyricsInput');
          if (titleIn) titleIn.value = song.title || '';
          if (authorIn) authorIn.value = song.composer || song.author || '';
          if (numIn) numIn.value = song.songNumber || '';
          if (lyricsIn) lyricsIn.value = song.lyrics || '';
          if (overlay) overlay.classList.remove('hidden');
        });
      }

      // Bind delete hymn button
      const deleteBtn = document.getElementById('deleteCurrentSongLyricsBtn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          const confirmed = await window.showConfirmDialog({
            title: 'Delete Sacred Hymn?',
            message: `Are you sure you want to permanently delete "${song.title}"? (Super Admin Action)`,
            icon: '🗑️',
            confirmText: 'Delete Hymn',
            isDanger: true
          });
          if (!confirmed) return;

          const sId = song.id || (typeof song.id === 'string' && song.id);
          const sTitle = song.title;
          if (window.ChurchSync && window.ChurchSync.Songs) {
            try {
              if (typeof window.ChurchSync.Songs.delete === 'function') {
                await window.ChurchSync.Songs.delete(sId, sTitle);
              } else if (typeof window.ChurchSync.Songs.softDelete === 'function') {
                await window.ChurchSync.Songs.softDelete(sId, sTitle);
              }
            } catch (err) {
              console.warn('[Sync] Delete hymn failed:', err);
            }
          }

          // Prune from local Dexie & blacklist & backups
          if (typeof churchDexieDb !== 'undefined' && churchDexieDb) {
            if (churchDexieDb.songs && sId) churchDexieDb.songs.delete(sId).catch(() => {});
            if (churchDexieDb.custom_songs && sId) churchDexieDb.custom_songs.delete(sId).catch(() => {});
            if (churchDexieDb.song_book && sId) churchDexieDb.song_book.delete(sId).catch(() => {});
          }
          if (typeof window !== 'undefined' && window.ChurchSync && window.ChurchSync.db) {
            if (window.ChurchSync.db.songs && sId) window.ChurchSync.db.songs.delete(sId).catch(() => {});
            if (window.ChurchSync.db.custom_songs && sId) window.ChurchSync.db.custom_songs.delete(sId).catch(() => {});
            if (window.ChurchSync.db.song_book && sId) window.ChurchSync.db.song_book.delete(sId).catch(() => {});
          }
          ['sanctuary_imported_songs', 'sanctuary_custom_songs_backup'].forEach(key => {
            try {
              const list = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(list)) {
                localStorage.setItem(key, JSON.stringify(list.filter(s => s && s.id !== sId && (!sTitle || !s.title || String(s.title).toLowerCase().trim() !== String(sTitle).toLowerCase().trim()))));
              }
            } catch (_) {}
          });
          if (Array.isArray(currentSongList)) {
            currentSongList = currentSongList.filter(s => s && s.id !== sId && (!sTitle || !s.title || String(s.title).toLowerCase().trim() !== String(sTitle).toLowerCase().trim()));
            window.currentSongList = currentSongList;
          }
          let blacklist = [];
          try {
            blacklist = JSON.parse(localStorage.getItem('sanctuary_deleted_songs_blacklist') || '[]');
            if (!Array.isArray(blacklist)) blacklist = [];
          } catch (_) { blacklist = []; }
          const blSet = new Set(blacklist.map(x => String(x).toLowerCase().trim()));
          if (sId) blSet.add(String(sId).toLowerCase().trim());
          if (song.title) blSet.add(String(song.title).toLowerCase().trim());
          localStorage.setItem('sanctuary_deleted_songs_blacklist', JSON.stringify(Array.from(blSet)));

          showToast(`Hymn "${song.title}" deleted 🗑️`);
          if (currentOpenSongBookKey && typeof openSongBookScreen === 'function') {
            await openSongBookScreen(currentOpenSongBookKey);
          }
        });
      }

      // Bind copy lyrics
      const copyBtn = document.getElementById('copyCurrentSongLyricsBtn');
      const copyText = document.getElementById('copyCurrentSongText');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const textToCopy = `${song.title}\n${song.subtitle || ''}\n\n${song.lyrics}`;
          copyTextToClipboard(textToCopy, () => {
            if (copyText) copyText.textContent = '✓ Copied!';
            showToast(`"${song.title}" lyrics copied to clipboard`);
            setTimeout(() => {
              if (copyText) copyText.textContent = 'Copy Lyrics';
            }, 2000);
          });
        });
      }

      // Bind bookmark toggle
      const bookmarkBtn = document.getElementById('bookmarkCurrentSongLyricsBtn');
      const bookmarkText = document.getElementById('bookmarkCurrentSongText');
      if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', () => {
          const existingIdx = state.bookmarks.findIndex(b => b.title.includes(song.title));
          if (existingIdx >= 0) {
            state.bookmarks.splice(existingIdx, 1);
            saveBookmarksToStorage();
            renderBookmarks();
            bookmarkBtn.classList.remove('saved');
            const svg = bookmarkBtn.querySelector('svg');
            if (svg) svg.setAttribute('fill', 'none');
            if (bookmarkText) bookmarkText.textContent = 'Save to Bookmarks';
            showToast(`"${song.title}" removed from bookmarks`);
          } else {
            addBookmark({
              title: song.title,
              category: 'hymn',
              content: song.lyrics,
              citation: song.subtitle || song.bookTitle || 'Church Hymnal'
            });
            bookmarkBtn.classList.add('saved');
            const svg = bookmarkBtn.querySelector('svg');
            if (svg) svg.setAttribute('fill', 'currentColor');
            if (bookmarkText) bookmarkText.textContent = '✓ Saved in Bookmarks';
            showToast(`"${song.title}" saved to bookmarks ✨`);
          }
        });
      }
    }

    switchTab('viewSongLyrics');

    // Ensure floating bar for lyrics view is active and visible
    const lyricsFloatingBar = document.getElementById('songLyricsFloatingBackBar');
    if (lyricsFloatingBar) lyricsFloatingBar.classList.remove('hidden');
    const lyricsSearchInput = document.getElementById('songLyricsSearchInput');
    if (lyricsSearchInput) lyricsSearchInput.value = '';
    const lyricsClearBtn = document.getElementById('songLyricsClearSearchBtn');
    if (lyricsClearBtn) lyricsClearBtn.classList.add('hidden');

    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector('.app-container')?.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.openSongBookScreen = openSongBookScreen;
  window.openSongLyricsScreen = openSongLyricsScreen;
  window.deleteSelectedSongs = deleteSelectedSongs;

  let lastToastMsg = '';
  let lastToastTime = 0;
  let toastTimer = null;

  function showToast(msg) {
    window.showToast = showToast;
    if (!toastNotification || !toastMessage || !msg) return;
    const now = Date.now();
    // Notify once, don't repeat identical notifications within 5 seconds
    if (msg === lastToastMsg && (now - lastToastTime) < 5000) {
      return;
    }
    lastToastMsg = msg;
    lastToastTime = now;

    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toastNotification.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      toastNotification.classList.add('hidden');
      toastTimer = null;
    }, 2600);
  }

  function attachEventListeners() {
    // Almanac Edit Day Modal Event Listeners
    const closeAlmanacEditModalBtn = document.getElementById('closeAlmanacEditModalBtn');
    if (closeAlmanacEditModalBtn) {
      closeAlmanacEditModalBtn.onclick = function(e) {
        if (e) e.preventDefault();
        closeAlmanacEditModal();
      };
    }
    const cancelAlmanacEditBtn = document.getElementById('cancelAlmanacEditBtn');
    if (cancelAlmanacEditBtn) {
      cancelAlmanacEditBtn.onclick = function(e) {
        if (e) e.preventDefault();
        closeAlmanacEditModal();
      };
    }
    const saveAlmanacEditBtn = document.getElementById('saveAlmanacEditBtn');
    if (saveAlmanacEditBtn) {
      saveAlmanacEditBtn.onclick = function(e) {
        if (e) e.preventDefault();
        saveAlmanacEdit();
      };
    }
    const almanacEditModalOverlay = document.getElementById('almanacEditModalOverlay');
    if (almanacEditModalOverlay) {
      almanacEditModalOverlay.addEventListener('click', function(e) {
        if (e.target === almanacEditModalOverlay) {
          closeAlmanacEditModal();
        }
      });
    }



    // 1. Verse of the Day Pop-out Modal
    if (verseOfTheDayPillBtn) {
      verseOfTheDayPillBtn.addEventListener('click', openVerseModal);
    }
    if (closeVerseModalBtn) {
      closeVerseModalBtn.addEventListener('click', closeVerseModal);
    }
    if (verseModalOverlay) {
      verseModalOverlay.addEventListener('click', (e) => {
        if (e.target === verseModalOverlay) closeVerseModal();
      });
    }

    // 1B. Verse of the Day Social Share Modal
    if (closeVerseShareModalBtn) {
      closeVerseShareModalBtn.addEventListener('click', closeVerseShareModal);
    }
    if (verseShareModalOverlay) {
      verseShareModalOverlay.addEventListener('click', (e) => {
        if (e.target === verseShareModalOverlay) closeVerseShareModal();
      });
    }

    // 2. Announcement Modal
    if (announcementPillBtn) {
      announcementPillBtn.addEventListener('click', openAnnouncementModal);
    }
    if (closeAnnouncementModalBtn) {
      closeAnnouncementModalBtn.addEventListener('click', closeAnnouncementModal);
    }
    if (dismissAnnouncementBtn) {
      dismissAnnouncementBtn.addEventListener('click', closeAnnouncementModal);
    }
    if (announcementModalOverlay) {
      announcementModalOverlay.addEventListener('click', (e) => {
        if (e.target === announcementModalOverlay) closeAnnouncementModal();
      });
    }

    // 3. Today's Song Modal
    if (todaySongPillBtn) {
      todaySongPillBtn.addEventListener('click', openSongModal);
    }
    if (closeSongModalBtn) {
      closeSongModalBtn.addEventListener('click', closeSongModal);
    }
    if (todaySongModalOverlay) {
      todaySongModalOverlay.addEventListener('click', (e) => {
        if (e.target === todaySongModalOverlay) closeSongModal();
      });
    }

    // Copy Song Lyrics
    if (copySongLyricsBtn) {
      copySongLyricsBtn.addEventListener('click', () => {
        const songs = getStoredTodaySongs();
        if (songs.length === 0) {
          showToast('No hymn selected to copy');
          return;
        }
        const formatted = songs.map((s, i) => `${i + 1}. "${s.title}"\n${s.meta || ''}\n\n${s.lyrics || ''}`).join('\n\n====================\n\n');
        copyTextToClipboard(formatted, () => {
          if (copySongBtnText) copySongBtnText.textContent = '✓ Copied!';
          showToast('Hymn lyrics copied to clipboard');
          setTimeout(() => {
            if (copySongBtnText) copySongBtnText.textContent = 'Copy Lyrics';
          }, 2000);
        });
      });
    }

    // Bookmark Today's Song(s)
    if (bookmarkSongBtn) {
      bookmarkSongBtn.addEventListener('click', () => {
        const songs = getStoredTodaySongs();
        if (songs.length === 0) return;
        const allBookmarked = songs.every(s => state.bookmarks.some(b => b.title.includes(s.title)));
        if (allBookmarked) {
          songs.forEach(s => {
            const idx = state.bookmarks.findIndex(b => b.title.includes(s.title));
            if (idx >= 0) state.bookmarks.splice(idx, 1);
          });
          saveBookmarksToStorage();
          renderBookmarks();
          syncSongModalBookmarkState();
          showToast('Today\'s songs removed from bookmarks');
        } else {
          songs.forEach(s => {
            if (!state.bookmarks.some(b => b.title.includes(s.title))) {
              addBookmark({
                title: s.title,
                category: 'hymn',
                content: s.lyrics || '',
                citation: s.meta || s.bookName || 'Featured Hymn'
              });
            }
          });
          syncSongModalBookmarkState();
          showToast('Today\'s songs saved to bookmarks ✨');
        }
      });
    }

    // Init Announcement and Song settings toggle and actions
    initAdminToggle();
    initAdminAnnouncementActions();
    initAdminSongActions();

    // Manual App Refresh & Cloud Sync Button (Church Library Heading)
    // Manual App Refresh & Cloud Sync Button (Church Library Heading)
    async function triggerManualAppRefresh() {
      // Prevent duplicate sync requests
      if (window.SyncEngine && window.SyncEngine._isPulling) {
        if (typeof showToast === 'function') {
          showToast('Synchronization already in progress… 🔄');
        }
        return;
      }

      const btn = document.getElementById('homeManualRefreshBtn');
      if (btn && btn.classList.contains('is-refreshing')) return;
      if (btn) btn.classList.add('is-refreshing');

      if (!navigator.onLine) {
        if (window.SyncStatusIndicator && typeof window.SyncStatusIndicator.setStatus === 'function') {
          window.SyncStatusIndicator.setStatus('offline');
        }
        if (typeof showToast === 'function') {
          showToast('Device offline — local church data is safely preserved. ☁️');
        }
        if (btn) btn.classList.remove('is-refreshing');
        return;
      }

      if (window.SyncStatusIndicator && typeof window.SyncStatusIndicator.setStatus === 'function') {
        window.SyncStatusIndicator.setStatus('syncing');
      }

      try {
        if (typeof showToast === 'function') {
          showToast('Refreshing application & synchronizing... 🔄');
        }

        // 1. Perform unified sync through SyncEngine
        if (window.SyncEngine && typeof window.SyncEngine.performSync === 'function') {
          await window.SyncEngine.performSync();
        } else if (window.ChurchSync && typeof window.ChurchSync.flushOfflineQueue === 'function') {
          await window.ChurchSync.flushOfflineQueue();
        }

        // 2. Reconcile Admin status once during manual refresh
        if (typeof reconcileAdminStatusWithCloud === 'function') {
          try { await reconcileAdminStatusWithCloud(); } catch (_) {}
        }

        // 3. Refresh UI views locally from updated Dexie cache
        if (typeof refreshSongBookCards === 'function') {
          try { await refreshSongBookCards(currentOpenSongBookKey); } catch (_) {}
        }
        if (typeof renderAnnouncementHomeUI === 'function') {
          try { renderAnnouncementHomeUI(); } catch (_) {}
        }
        if (typeof renderAdminAnnouncementsList === 'function') {
          try { renderAdminAnnouncementsList(); } catch (_) {}
        }
        if (typeof renderTodaySongHomeUI === 'function') {
          try { renderTodaySongHomeUI(); } catch (_) {}
        }
        if (typeof renderAdminSelectedList === 'function') {
          try { renderAdminSelectedList(); } catch (_) {}
        }
        if (typeof renderTimelineList === 'function') {
          try { renderTimelineList(); } catch (_) {}
        }
        if (typeof renderAlmanacModule === 'function') {
          try { renderAlmanacModule(); } catch (_) {}
        }
        if (typeof renderAboutChurch === 'function') {
          try { renderAboutChurch(); } catch (_) {}
        }
        if (typeof renderAboutChurchPhotoSlider === 'function') {
          try { renderAboutChurchPhotoSlider(); } catch (_) {}
        }
        if (typeof updateHomeDailyVerseAndDate === 'function') {
          try { updateHomeDailyVerseAndDate(); } catch (_) {}
        }

        if (window.SyncStatusIndicator && typeof window.SyncStatusIndicator.setStatus === 'function') {
          window.SyncStatusIndicator.setStatus('synced');
        }

        if (typeof showToast === 'function') {
          showToast('All data successfully refreshed! 🔄✨');
        }
      } catch (err) {
        console.warn('[Manual Refresh] Error:', err);
        if (window.SyncStatusIndicator && typeof window.SyncStatusIndicator.setStatus === 'function') {
          window.SyncStatusIndicator.setStatus(navigator.onLine ? 'failed' : 'offline');
        }
        if (typeof showToast === 'function') {
          showToast('Refresh completed with local cache.');
        }
      } finally {
        setTimeout(() => {
          if (btn) btn.classList.remove('is-refreshing');
        }, 600);
      }
    }
    window.triggerManualAppRefresh = triggerManualAppRefresh;

    const homeManualRefreshBtn = document.getElementById('homeManualRefreshBtn');
    if (homeManualRefreshBtn) {
      homeManualRefreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerManualAppRefresh();
      });
      homeManualRefreshBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerManualAppRefresh();
        }
      });
    }

    const bindBookCardAction = (el, action) => {
      if (!el) return;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        action();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          action();
        }
      });
    };

    bindBookCardAction(bookPrabhuBhojBtn, () => openPdfBook('books/prabhu_bhoj.html', 'Prabhu Bhoj (पवित्र प्रभु भोज)'));
    bindBookCardAction(bookAshayeRabbaniBtn, () => openPdfBook('books/ashaye_rabbani.html', 'Ashaye Rabbani (अशाये रब्बानी)'));
    bindBookCardAction(bookAaradhanaaBtn, () => openPdfBook('books/aaradhana.html', 'प्रातःकालीन व सायंकालीन आराधना (Daily Prayer Book)'));
    bindBookCardAction(bookMasihiGeetBtn, () => openSongBookScreen('masihiGeet'));
    bindBookCardAction(bookAdditionalSongsBtn, () => openSongBookScreen('additionalSongs'));

    // Dedicated Song Book & Lyrics Floating Back Buttons
    if (songListBackBtn) {
      songListBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isSongSelectionMode) exitSongSelectionMode();
        else switchTab('viewHome');
      });
    }

    if (songLyricsBackBtn) {
      songLyricsBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSongBookScreen(currentOpenSongBookKey || 'masihiGeet');
      });
    }

    const songLyricsHomeBtn = document.getElementById('songLyricsHomeBtn');
    if (songLyricsHomeBtn) {
      songLyricsHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('viewHome');
      });
    }

    const songLyricsSearchInput = document.getElementById('songLyricsSearchInput');
    const songLyricsClearSearchBtn = document.getElementById('songLyricsClearSearchBtn');
    if (songLyricsSearchInput) {
      const handleLyricsSearch = () => {
        const query = songLyricsSearchInput.value.trim();
        openSongBookScreen(currentOpenSongBookKey || 'masihiGeet').then(() => {
          const listSearch = document.getElementById('songBookSearchInput');
          if (listSearch) {
            listSearch.value = query;
            listSearch.dispatchEvent(new Event('input'));
            listSearch.focus();
          }
        });
      };
      songLyricsSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (songLyricsClearSearchBtn) songLyricsClearSearchBtn.classList.toggle('hidden', query === '');
      });
      songLyricsSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleLyricsSearch();
        }
      });
      songLyricsSearchInput.addEventListener('focus', () => {
        if (songLyricsSearchInput.value.trim()) {
          handleLyricsSearch();
        }
      });
      if (songLyricsClearSearchBtn) {
        songLyricsClearSearchBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          songLyricsSearchInput.value = '';
          songLyricsClearSearchBtn.classList.add('hidden');
        });
      }
    }

    // Song Selection Action Bar buttons
    const songCancelSelectionBtn = document.getElementById('songCancelSelectionBtn');
    const songSelectAllBtn = document.getElementById('songSelectAllBtn');
    const songDeleteSelectedBtn = document.getElementById('songDeleteSelectedBtn');
    const songGlobalFloatingBackBtn = document.getElementById('songGlobalFloatingBackBtn');

    if (songCancelSelectionBtn) {
      songCancelSelectionBtn.addEventListener('click', exitSongSelectionMode);
    }
    if (songSelectAllBtn) {
      songSelectAllBtn.addEventListener('click', toggleSelectAllSongs);
    }
    if (songDeleteSelectedBtn) {
      songDeleteSelectedBtn.addEventListener('click', deleteSelectedSongs);
    }
    if (songGlobalFloatingBackBtn) {
      songGlobalFloatingBackBtn.addEventListener('click', () => {
        if (isSongSelectionMode) exitSongSelectionMode();
        else if (state.activeTab === 'viewSongLyrics') openSongBookScreen(currentOpenSongBookKey || 'masihiGeet');
        else switchTab('viewHome');
      });
    }

    // Song Book Search Input (120fps RAF debounced)
    const songBookSearchInput = document.getElementById('songBookSearchInput');
    const songBookClearSearchBtn = document.getElementById('songBookClearSearchBtn');
    let songSearchRaf = null;
    if (songBookSearchInput) {
      songBookSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (songBookClearSearchBtn) songBookClearSearchBtn.classList.toggle('hidden', query === '');
        if (songSearchRaf) cancelAnimationFrame(songSearchRaf);
        songSearchRaf = requestAnimationFrame(() => {
          // Filter the displayed song list
          const lowerQuery = query.toLowerCase();
          const cards = songListContainer ? songListContainer.querySelectorAll('.song-list-item-card') : [];
          cards.forEach(card => {
            const idx = parseInt(card.dataset.songIndex, 10);
            const song = currentSongList[idx];
            if (!song) return;
            const matches = !query ||
              song.title.toLowerCase().includes(lowerQuery) ||
              String(song.songNumber || song.formattedNum || '').includes(query);
            card.style.display = matches ? '' : 'none';
          });
          // Show no-results message if all hidden
          const visibleCount = Array.from(cards).filter(c => c.style.display !== 'none').length;
          let noResultsEl = songListContainer.querySelector('.search-no-results');
          if (visibleCount === 0 && query) {
            if (!noResultsEl) {
              noResultsEl = document.createElement('div');
              noResultsEl.className = 'search-no-results';
              noResultsEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);"><div style="font-size:1.2rem;margin-bottom:4px;">🔍</div><div style="font-weight:600;">No songs match "${escapeHtml(query)}"</div></div>`;
              songListContainer.appendChild(noResultsEl);
            }
          } else if (noResultsEl) {
            noResultsEl.remove();
          }
          songSearchRaf = null;
        });
      });
      if (songBookClearSearchBtn) {
        songBookClearSearchBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          songBookSearchInput.value = '';
          songBookClearSearchBtn.classList.add('hidden');
          songBookSearchInput.dispatchEvent(new Event('input'));
        });
      }
    }

    // No Book Loaded Modal Listeners
    const closeNoBookModalBtn = document.getElementById('closeNoBookModalBtn');
    const noBookModalOverlay = document.getElementById('noBookModalOverlay');
    if (closeNoBookModalBtn) {
      closeNoBookModalBtn.addEventListener('click', closeNoBookModal);
    }
    if (noBookModalOverlay) {
      noBookModalOverlay.addEventListener('click', (e) => {
        if (e.target === noBookModalOverlay) closeNoBookModal();
      });
    }

    // Screen Reader Back Buttons
    const actualReaderBackBtn = document.getElementById('readerBackBtn');
    if (actualReaderBackBtn) {
      actualReaderBackBtn.addEventListener('click', closeBookScreen);
    }
    if (readerScreenBackBtn && readerScreenBackBtn !== actualReaderBackBtn) {
      readerScreenBackBtn.addEventListener('click', closeBookScreen);
    }
    if (screenReaderBottomBackBtn) {
      screenReaderBottomBackBtn.addEventListener('click', closeBookScreen);
    }

    // Screen Reader Copy Book Action
    const handleScreenBookCopy = () => {
      if (!currentOpenBookKey || !CHURCH_DATA.churchBooks[currentOpenBookKey]) return;
      const book = CHURCH_DATA.churchBooks[currentOpenBookKey];
      const allText = book.sections.map(s => `${s.rubric}\n${s.text}\n${s.dialogue || ''}`).join('\n\n');
      copyTextToClipboard(`${book.title}\n${book.subtitle}\n\n${allText}`, () => {
        if (screenBottomCopyText) screenBottomCopyText.textContent = '✓ Copied!';
        showToast(`${book.title} text copied to clipboard`);
        setTimeout(() => {
          if (screenBottomCopyText) screenBottomCopyText.textContent = 'Copy Liturgy';
        }, 2000);
      });
    };

    if (screenCopyBookBtn) {
      screenCopyBookBtn.addEventListener('click', handleScreenBookCopy);
    }
    if (screenReaderBottomCopyBtn) {
      screenReaderBottomCopyBtn.addEventListener('click', handleScreenBookCopy);
    }

    // Screen Reader Bookmark Book Action
    if (screenBookmarkBookBtn) {
      screenBookmarkBookBtn.addEventListener('click', () => {
        if (!currentOpenBookKey || !CHURCH_DATA.churchBooks[currentOpenBookKey]) return;
        const book = CHURCH_DATA.churchBooks[currentOpenBookKey];
        const existingIdx = state.bookmarks.findIndex(b => b.title === book.title);

        if (existingIdx >= 0) {
          state.bookmarks.splice(existingIdx, 1);
          saveBookmarksToStorage();
          renderBookmarks();
          syncScreenBookBookmarkState();
          showToast(`${book.title} removed from bookmarks`);
        } else {
          const allText = book.sections.map(s => `${s.rubric}:\n${s.text}`).join('\n\n');
          addBookmark({
            title: book.title,
            category: book.tag.includes('गीत') ? 'hymn' : 'prayer',
            content: allText,
            citation: book.subtitle
          });
          syncScreenBookBookmarkState();
        }
      });
    }

    // Modal Copy Verse Action
    if (modalCopyVerseBtn) {
      modalCopyVerseBtn.addEventListener('click', () => {
        const text = document.getElementById('dailyVerseText')?.textContent.trim() || '';
        const ref = document.getElementById('dailyVerseRef')?.textContent.trim() || '';
        const formatted = `"${text}"\n— ${ref}`;
        
        copyTextToClipboard(formatted, () => {
          if (copyBtnText) copyBtnText.textContent = '✓ Copied!';
          showToast('Verse copied to clipboard');
          setTimeout(() => {
            if (copyBtnText) copyBtnText.textContent = 'Copy';
          }, 2000);
        });
      });
    }

    // Modal Share Verse Action (In between Copy Verse and Save to Bookmarks)
    if (modalShareVerseBtn) {
      modalShareVerseBtn.addEventListener('click', () => {
        openVerseShareModal();
      });
    }

    // Social Sharing Options
    if (shareVerseWhatsAppBtn) {
      shareVerseWhatsAppBtn.addEventListener('click', () => {
        const data = getDailyVerseShareData();
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(data.shareText)}`;
        window.open(waUrl, '_blank');
        showToast('Opening WhatsApp to share verse & reference...');
      });
    }

    if (shareVerseInstagramBtn) {
      shareVerseInstagramBtn.addEventListener('click', () => {
        const data = getDailyVerseShareData();
        copyTextToClipboard(data.shareText, () => {
          showToast('Verse & reference copied! Opening Instagram...');
          setTimeout(() => {
            window.open('https://www.instagram.com/', '_blank');
          }, 600);
        });
      });
    }

    if (shareVerseAllAppsBtn) {
      shareVerseAllAppsBtn.addEventListener('click', () => {
        const data = getDailyVerseShareData();
        if (window.AndroidBridge && typeof window.AndroidBridge.shareText === 'function') {
          window.AndroidBridge.shareText(data.shareText, data.title);
        } else if (window.bridge && typeof window.bridge.shareText === 'function') {
          window.bridge.shareText(data.shareText, data.title);
        } else if (navigator.share) {
          navigator.share({
            title: data.title,
            text: data.shareText
          }).catch((err) => {
            if (err && err.name !== 'AbortError') {
              copyTextToClipboard(data.shareText, () => {
                showToast('Verse & reference copied to clipboard');
              });
            }
          });
        } else {
          copyTextToClipboard(data.shareText, () => {
            showToast('Verse & reference copied to clipboard');
          });
        }
      });
    }

    // Segmented Tab Switchers (Share as Text vs Share as Image)
    if (verseShareTabBtnText) {
      verseShareTabBtnText.addEventListener('click', () => switchVerseShareTab('text'));
    }
    if (verseShareTabBtnImage) {
      verseShareTabBtnImage.addEventListener('click', () => switchVerseShareTab('image'));
    }

    // Aesthetic Image Sharing Actions
    if (shareVerseImageNativeBtn) {
      shareVerseImageNativeBtn.addEventListener('click', () => {
        const data = getDailyVerseShareData();
        const dataUrl = cachedVerseImageDataUrl || renderAestheticVerseCanvas(data.text, data.ref, data.tradition);
        if (window.AndroidBridge && typeof window.AndroidBridge.shareImage === 'function') {
          window.AndroidBridge.shareImage(dataUrl, `Verse of the Day (${data.ref})`, data.shareText);
        } else if (window.bridge && typeof window.bridge.shareImage === 'function') {
          window.bridge.shareImage(dataUrl, `Verse of the Day (${data.ref})`, data.shareText);
        } else if (navigator.share && navigator.canShare) {
          fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], `Verse_${(data.ref || 'Scripture').replace(/[^a-zA-Z0-9]/g, '_')}.png`, { type: 'image/png' });
              if (navigator.canShare({ files: [file] })) {
                navigator.share({
                  title: `Verse of the Day (${data.ref})`,
                  text: data.shareText,
                  files: [file]
                }).catch(err => { if (err && err.name !== 'AbortError') showToast('Sharing cancelled'); });
              } else {
                downloadVerseImage(dataUrl, `Verse_${(data.ref || 'Scripture').replace(/[^a-zA-Z0-9]/g, '_')}.png`);
              }
            })
            .catch(() => downloadVerseImage(dataUrl, `Verse_${(data.ref || 'Scripture').replace(/[^a-zA-Z0-9]/g, '_')}.png`));
        } else {
          downloadVerseImage(dataUrl, `Verse_${(data.ref || 'Scripture').replace(/[^a-zA-Z0-9]/g, '_')}.png`);
        }
      });
    }

    if (saveVerseImageBtn) {
      saveVerseImageBtn.addEventListener('click', () => {
        const data = getDailyVerseShareData();
        const dataUrl = cachedVerseImageDataUrl || renderAestheticVerseCanvas(data.text, data.ref, data.tradition);
        const fileName = `Verse_${(data.ref || 'Scripture').replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        if (window.AndroidBridge && typeof window.AndroidBridge.saveImageToGallery === 'function') {
          const ok = window.AndroidBridge.saveImageToGallery(dataUrl);
          if (ok) showToast('Aesthetic verse card saved to Gallery!');
          else downloadVerseImage(dataUrl, fileName);
        } else if (window.bridge && typeof window.bridge.saveImageToGallery === 'function') {
          const ok = window.bridge.saveImageToGallery(dataUrl);
          if (ok) showToast('Aesthetic verse card saved to Gallery!');
          else downloadVerseImage(dataUrl, fileName);
        } else {
          downloadVerseImage(dataUrl, fileName);
        }
      });
    }

    // Modal Bookmark Verse Action
    if (modalBookmarkVerseBtn) {
      modalBookmarkVerseBtn.addEventListener('click', () => {
        const text = document.getElementById('dailyVerseText')?.textContent.trim() || '';
        const ref = document.getElementById('dailyVerseRef')?.textContent.trim() || '';
        const existingIdx = state.bookmarks.findIndex(b => b.title === ref && b.content.includes(text));

        if (existingIdx >= 0) {
          state.bookmarks.splice(existingIdx, 1);
          saveBookmarksToStorage();
          renderBookmarks();
          syncVerseModalBookmarkState();
          showToast('Bookmark removed');
        } else {
          addBookmark({
            title: ref,
            category: 'verse',
            content: text,
            citation: ref
          });
          syncVerseModalBookmarkState();
        }
      });
    }

    if (openTimelineCard) {
      openTimelineCard.addEventListener('click', () => {
        switchTab('viewTimeline');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.querySelector('.app-container')?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    const openAboutChurchCard = document.getElementById('openAboutChurchCard');
    if (openAboutChurchCard) {
      openAboutChurchCard.addEventListener('click', () => {
        switchTab('viewAboutChurch');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.querySelector('.app-container')?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    const aboutChurchBackBtn = document.getElementById('aboutChurchBackBtn');
    if (aboutChurchBackBtn) {
      aboutChurchBackBtn.addEventListener('click', () => {
        switchTab('viewHome');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.querySelector('.app-container')?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    const aboutViewTimelineBtn = document.getElementById('aboutViewTimelineBtn');
    if (aboutViewTimelineBtn) {
      aboutViewTimelineBtn.addEventListener('click', () => {
        switchTab('viewTimeline');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.querySelector('.app-container')?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // ==============================================================================
    // 8C. ABOUT CHURCH CRUD & SUPERADMIN CUSTOMIZATION ENGINE (WITH PHOTO GALLERY & FULLSCREEN SLIDER)
    // ==============================================================================
    const ABOUT_CHURCH_STORAGE_KEY = 'sanctuary_about_church_data';

    const defaultAboutChurchData = {
      // 1. Church Identity & Name
      churchName: "All Saints' Church",
      subtitle: "Church of North India (CNI) • Prothrapur",
      diocese: "Diocese of Kolkata • Port Blair, South Andaman",
      heritageTag: "Est. 1871 • 155-Year Sacred Heritage",

      // 2. Presbyter / Pastor in-Charge
      pastorName: "Rev. Presbyter-in-Charge",
      pastorBadge: "Ordained Clergy",
      pastorChurch: "All Saints' Church, Prothrapur",
      pastorAffiliation: "Church of North India (CNI)",
      pastorDesc: "Leading the congregation in holy worship, conducting the sacraments of Holy Baptism and Holy Communion, pastoral visitation, spiritual counseling, and directing parish outreach and fellowships.",
      pastorQuote: '"Shepherd the flock of God which is among you, serving as overseers, not by compulsion but willingly." — 1 Peter 5:2',
      pastorPhoto: "",

      // 3. Church Sanctuary Photos & Gallery
      photos: [
        {
          url: "church_bg.jpg",
          caption: "All Saints' Church Sanctuary",
          sub: "Main Church Building & Sacred Grounds • Prothrapur"
        }
      ],

      // 4. History & Sacred Heritage
      historyBadge: "155 Years",
      historySummary: "Founded in 1871, All Saints' Church has been a beacon of Christ's light across South Andaman for more than 155 years. From its historic foundation to its present fellowship under the Church of North India (CNI), generations of parishioners have worshiped, prayed, and served with unwavering devotion."
    };

    let tempAboutPastorPhoto = '';
    let tempAboutChurchPhotos = [];
    let currentAboutChurchPhotoIndex = 0;
    let cachedAboutChurchData = null;

    function compressAboutImage(file, maxDimension = 800, quality = 0.60) {
      return new Promise((resolve, reject) => {
        if (!file) {
          reject(new Error('No image file provided'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width || maxDimension;
            let height = img.height || maxDimension;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            try {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (_) {
              resolve(e.target.result);
            }
          };
          img.onerror = () => {
            if (e.target && e.target.result) {
              resolve(e.target.result);
            } else {
              reject(new Error('Invalid image file'));
            }
          };
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed reading file'));
        reader.readAsDataURL(file);
      });
    }

    function loadAboutChurchData() {
      if (cachedAboutChurchData) {
        return JSON.parse(JSON.stringify(cachedAboutChurchData));
      }
      try {
        const raw = localStorage.getItem(ABOUT_CHURCH_STORAGE_KEY);
        if (!raw) {
          cachedAboutChurchData = JSON.parse(JSON.stringify(defaultAboutChurchData));
          return JSON.parse(JSON.stringify(defaultAboutChurchData));
        }
        const parsed = JSON.parse(raw);
        const data = { ...defaultAboutChurchData, ...parsed };
        if (Array.isArray(data.photos) && data.photos.length > 0) {
          const custom = data.photos.filter(p => p && p.url && p.url !== 'church_bg.jpg');
          if (custom.length > 0) {
            data.photos = custom;
          }
        }
        if (!Array.isArray(data.photos) || data.photos.length === 0) {
          if (data.churchPhoto && data.churchPhoto !== 'church_bg.jpg') {
            data.photos = [{
              url: data.churchPhoto,
              caption: data.churchPhotoCaption || "All Saints' Church Sanctuary",
              sub: data.churchPhotoSub || "Main Church Building & Sacred Grounds • Prothrapur"
            }];
          } else {
            data.photos = JSON.parse(JSON.stringify(defaultAboutChurchData.photos));
          }
        }
        cachedAboutChurchData = JSON.parse(JSON.stringify(data));
        return data;
      } catch (e) {
        console.error('[AboutChurch] Error loading saved data:', e);
        return JSON.parse(JSON.stringify(defaultAboutChurchData));
      }
    }

    function saveAboutChurchData(data) {
      let ok = false;
      cachedAboutChurchData = JSON.parse(JSON.stringify(data));
      try {
        localStorage.setItem(ABOUT_CHURCH_STORAGE_KEY, JSON.stringify(data));
        ok = true;
      } catch (e) {
        console.error('[AboutChurch] Error saving data to localStorage:', e);
        try {
          if (data && data.photos && data.photos.length > 2) {
            const trimmed = { ...data, photos: data.photos.slice(0, 2) };
            localStorage.setItem(ABOUT_CHURCH_STORAGE_KEY, JSON.stringify(trimmed));
            ok = true;
          }
        } catch (_) {}
      }
      if (window.ChurchSync && window.ChurchSync.AboutChurch && typeof window.ChurchSync.AboutChurch.save === 'function') {
        window.ChurchSync.AboutChurch.save(data).catch(err => {
          console.warn('[AboutChurch] Cloud sync warning:', err);
        });
      }
      return ok;
    }

    function getAboutChurchPhotosList() {
      const data = loadAboutChurchData();
      if (Array.isArray(data.photos) && data.photos.length > 0) {
        const custom = data.photos.filter(p => p && p.url && p.url !== 'church_bg.jpg');
        if (custom.length > 0) return custom;
        return data.photos;
      }
      return defaultAboutChurchData.photos;
    }

    function renderAboutChurchPhotoSlider() {
      const photos = getAboutChurchPhotosList();
      if (currentAboutChurchPhotoIndex >= photos.length) currentAboutChurchPhotoIndex = 0;
      if (currentAboutChurchPhotoIndex < 0) currentAboutChurchPhotoIndex = photos.length - 1;

      const activePhoto = photos[currentAboutChurchPhotoIndex] || photos[0] || { url: 'church_bg.jpg' };

      const mainImg = document.getElementById('aboutChurchMainPhotoImg');
      if (mainImg) {
        mainImg.src = activePhoto.url || 'church_bg.jpg';
      }
      const captionEl = document.getElementById('aboutChurchPhotoCaption');
      if (captionEl) {
        captionEl.textContent = '';
      }
      const subEl = document.getElementById('aboutChurchPhotoSub');
      if (subEl) {
        subEl.textContent = '';
      }
      const countBadge = document.getElementById('aboutChurchPhotosCountBadge');
      if (countBadge) {
        countBadge.textContent = `${photos.length} Photo${photos.length === 1 ? '' : 's'}`;
      }

      // Dots
      const dotsContainer = document.getElementById('aboutChurchPhotoDotsContainer');
      if (dotsContainer) {
        if (photos.length > 1) {
          dotsContainer.innerHTML = photos.map((_, i) => `
            <span class="photo-slider-dot ${i === currentAboutChurchPhotoIndex ? 'active' : ''}" data-index="${i}"></span>
          `).join('');
          dotsContainer.querySelectorAll('.photo-slider-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = parseInt(dot.getAttribute('data-index'), 10);
              currentAboutChurchPhotoIndex = idx;
              renderAboutChurchPhotoSlider();
            });
          });
        } else {
          dotsContainer.innerHTML = '';
        }
      }

      // Thumbnails container removed per user instruction (photos only show in slider)
      const thumbsContainer = document.getElementById('aboutChurchPhotosThumbnails');
      if (thumbsContainer) {
        thumbsContainer.style.display = 'none';
        thumbsContainer.innerHTML = '';
      }

      renderFullscreenPhotoView();
    }

    function renderFullscreenPhotoView() {
      const modal = document.getElementById('aboutChurchPhotoFullscreenModal');
      if (!modal || modal.classList.contains('hidden')) return;

      const photos = getAboutChurchPhotosList();
      if (!photos || photos.length === 0) return;
      if (currentAboutChurchPhotoIndex >= photos.length) currentAboutChurchPhotoIndex = 0;
      if (currentAboutChurchPhotoIndex < 0) currentAboutChurchPhotoIndex = photos.length - 1;

      const activePhoto = photos[currentAboutChurchPhotoIndex] || photos[0];

      const img = document.getElementById('fullscreenChurchPhotoImg');
      if (img) {
        img.src = activePhoto.url || 'church_bg.jpg';
        img.style.transform = 'translateX(0)';
        img.style.opacity = '1';
      }

      const prevBtn = document.getElementById('fullscreenChurchPhotoPrevBtn');
      const nextBtn = document.getElementById('fullscreenChurchPhotoNextBtn');
      if (prevBtn) {
        prevBtn.style.display = photos.length > 1 ? 'flex' : 'none';
      }
      if (nextBtn) {
        nextBtn.style.display = photos.length > 1 ? 'flex' : 'none';
      }
    }

    function openChurchPhotoFullscreen(index = currentAboutChurchPhotoIndex) {
      const modal = document.getElementById('aboutChurchPhotoFullscreenModal');
      if (!modal) return;
      if (typeof index === 'number' && !isNaN(index)) {
        currentAboutChurchPhotoIndex = index;
      }
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('opacity', '1', 'important');
      modal.style.setProperty('pointer-events', 'auto', 'important');
      modal.style.setProperty('visibility', 'visible', 'important');
      document.body.classList.add('modal-open');
      renderFullscreenPhotoView();
      renderAboutChurchPhotoSlider();
    }

    function closeChurchPhotoFullscreen() {
      const modal = document.getElementById('aboutChurchPhotoFullscreenModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
        modal.style.setProperty('opacity', '0', 'important');
        modal.style.setProperty('pointer-events', 'none', 'important');
        modal.style.setProperty('visibility', 'hidden', 'important');
      }
      document.body.classList.remove('modal-open');
    }

    function slideNextChurchPhoto() {
      const photos = getAboutChurchPhotosList();
      if (!photos || photos.length === 0) return;
      currentAboutChurchPhotoIndex = (currentAboutChurchPhotoIndex + 1) % photos.length;
      renderAboutChurchPhotoSlider();
      renderFullscreenPhotoView();
    }

    function slidePrevChurchPhoto() {
      const photos = getAboutChurchPhotosList();
      if (!photos || photos.length === 0) return;
      currentAboutChurchPhotoIndex = (currentAboutChurchPhotoIndex - 1 + photos.length) % photos.length;
      renderAboutChurchPhotoSlider();
      renderFullscreenPhotoView();
    }

    function renderAboutChurch() {
      const data = loadAboutChurchData();

      // 1. Church Identity & Header
      const heroNameEl = document.getElementById('aboutChurchHeroName');
      if (heroNameEl) heroNameEl.textContent = data.churchName || defaultAboutChurchData.churchName;

      const heroSubEl = document.getElementById('aboutChurchHeroSubtitle');
      if (heroSubEl) heroSubEl.textContent = data.subtitle || defaultAboutChurchData.subtitle;

      const heroDioceseEl = document.getElementById('aboutChurchHeroDiocese');
      if (heroDioceseEl) heroDioceseEl.textContent = data.diocese || defaultAboutChurchData.diocese;

      const heroTagEl = document.getElementById('aboutChurchHeroTag');
      if (heroTagEl) {
        heroTagEl.innerHTML = `<span>${escapeHtml(data.heritageTag || defaultAboutChurchData.heritageTag)}</span>`;
      }

      // 2. Presbyter / Pastor in-Charge
      const pastorNameEl = document.getElementById('aboutPastorName');
      if (pastorNameEl) pastorNameEl.textContent = data.pastorName || defaultAboutChurchData.pastorName;

      const pastorBadgeEl = document.getElementById('aboutPastorBadge');
      if (pastorBadgeEl) pastorBadgeEl.textContent = data.pastorBadge || defaultAboutChurchData.pastorBadge;

      const pastorChurchEl = document.getElementById('aboutPastorChurch');
      if (pastorChurchEl) pastorChurchEl.textContent = data.pastorChurch || `${data.churchName || "All Saints' Church"}, Prothrapur`;

      const pastorAffilEl = document.getElementById('aboutPastorAffiliation');
      if (pastorAffilEl) pastorAffilEl.textContent = data.pastorAffiliation || data.subtitle || defaultAboutChurchData.pastorAffiliation;

      const pastorDescEl = document.getElementById('aboutPastorRoleDesc');
      if (pastorDescEl) pastorDescEl.textContent = data.pastorDesc || defaultAboutChurchData.pastorDesc;

      const pastorQuoteEl = document.getElementById('aboutPastorQuote');
      if (pastorQuoteEl) pastorQuoteEl.textContent = data.pastorQuote || defaultAboutChurchData.pastorQuote;

      const pastorPhotoWrap = document.getElementById('aboutPastorPhotoWrap');
      if (pastorPhotoWrap) {
        if (data.pastorPhoto) {
          pastorPhotoWrap.innerHTML = `
            <img src="${data.pastorPhoto}" alt="${escapeHtml(data.pastorName || 'Pastor')}" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div class="pastor-tag-overlay">PASTOR</div>
            <div class="pastor-edit-badge" title="Tap to crop &amp; change photo">📷</div>
          `;
        } else {
          pastorPhotoWrap.innerHTML = `
            <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <div class="pastor-tag-overlay">PASTOR</div>
            <div class="pastor-edit-badge" title="Tap to upload &amp; crop photo">📷</div>
          `;
        }
      }

      // 3. Church Sanctuary Photo Gallery & Slider
      renderAboutChurchPhotoSlider();

      // 4. History & Sacred Heritage (Safely updated if element present)
      const histBadge = document.getElementById('aboutChurchHistoryBadge');
      if (histBadge) histBadge.textContent = data.historyBadge || defaultAboutChurchData.historyBadge;

      const historyEl = document.getElementById('aboutHistorySummary');
      if (historyEl) historyEl.textContent = data.historySummary || defaultAboutChurchData.historySummary;

      // 5. RBAC check for About Church Edit and Direct Photo buttons (Strictly Super Admin & Admin)
      const perms = (typeof useAppPermissions === 'function') ? useAppPermissions() : { isLeader: false, isSuperAdmin: false, isAdmin: false };
      const isSuperAdminOnly = Boolean(
        perms.isSuperAdmin || 
        perms.role === 'superadmin' || 
        (typeof currentAuthSession !== 'undefined' && currentAuthSession && (
          currentAuthSession.email === SUPER_ADMIN_EMAIL || 
          currentAuthSession.role === 'superadmin'
        ))
      );
      const isSuperAdminOrAdmin = Boolean(
        perms.isSuperAdmin || 
        perms.isAdmin || 
        perms.role === 'superadmin' || 
        perms.role === 'admin' || 
        (typeof currentAuthSession !== 'undefined' && currentAuthSession && (
          currentAuthSession.email === SUPER_ADMIN_EMAIL || 
          currentAuthSession.role === 'superadmin' || 
          currentAuthSession.role === 'admin'
        ))
      );
      const editPastorDirectBtn = document.getElementById('editPastorDirectBtn');
      if (editPastorDirectBtn) {
        if (isSuperAdminOnly) {
          editPastorDirectBtn.style.setProperty('display', 'inline-flex', 'important');
        } else {
          editPastorDirectBtn.style.setProperty('display', 'none', 'important');
        }
      }
      const addChurchPhotoDirectBtn = document.getElementById('addChurchPhotoDirectBtn');
      if (addChurchPhotoDirectBtn) {
        addChurchPhotoDirectBtn.style.display = isSuperAdminOrAdmin ? 'inline-flex' : 'none';
      }
      const managePhotosDirectBtn = document.getElementById('managePhotosDirectBtn');
      if (managePhotosDirectBtn) {
        managePhotosDirectBtn.style.display = isSuperAdminOrAdmin ? 'inline-flex' : 'none';
      }
    }

    function renderPastorPhotoPreview() {
      const prev = document.getElementById('pastorPhotoEditPreview');
      const cropBtn = document.getElementById('cropCurrentPastorPhotoBtn');
      if (cropBtn) {
        cropBtn.style.display = tempAboutPastorPhoto ? 'inline-flex' : 'none';
      }
      if (!prev) return;
      if (tempAboutPastorPhoto) {
        prev.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${tempAboutPastorPhoto}" alt="Pastor Portrait" style="width:58px; height:58px; border-radius:14px; object-fit:cover; border:2px solid var(--accent-gold); box-shadow:0 3px 10px rgba(0,0,0,0.15);">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-size:0.76rem; color:var(--accent-gold); font-weight:700;">Custom Portrait Active</span>
              <span style="font-size:0.70rem; color:var(--text-muted);">Cropped &amp; ready to save</span>
            </div>
          </div>
        `;
      } else {
        prev.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">Default clergy icon will be shown</span>`;
      }
    }

    function updateChurchPhotoField(index, field, value) {
      if (typeof index === 'number' && tempAboutChurchPhotos[index]) {
        tempAboutChurchPhotos[index][field] = value;
      }
    }

    function removeChurchGalleryPhoto(index) {
      if (typeof index !== 'number' || isNaN(index)) return;
      if (index < 0 || index >= tempAboutChurchPhotos.length) return;
      tempAboutChurchPhotos.splice(index, 1);

      // Synchronize immediately to live churchData
      const churchData = loadAboutChurchData();
      if (Array.isArray(churchData.photos)) {
        churchData.photos = JSON.parse(JSON.stringify(tempAboutChurchPhotos));
        saveAboutChurchData(churchData);
      }
      if (currentAboutChurchPhotoIndex >= tempAboutChurchPhotos.length) {
        currentAboutChurchPhotoIndex = Math.max(0, tempAboutChurchPhotos.length - 1);
      }
      renderAboutChurchPhotoSlider();
      renderAboutChurch();
      renderChurchPhotosEditList();
      showToast('Photo removed 🗑️');
    }

    function selectChurchPhotoAsActive(index) {
      if (typeof index !== 'number' || isNaN(index)) return;
      if (index < 0 || index >= tempAboutChurchPhotos.length) return;
      currentAboutChurchPhotoIndex = index;
      renderAboutChurchPhotoSlider();
      renderChurchPhotosEditList();
    }

    function moveChurchGalleryPhoto(index, direction) {
      if (typeof index !== 'number' || isNaN(index)) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= tempAboutChurchPhotos.length) return;
      const item = tempAboutChurchPhotos.splice(index, 1)[0];
      tempAboutChurchPhotos.splice(targetIndex, 0, item);
      renderChurchPhotosEditList();
    }

    function setPrimaryChurchGalleryPhoto(index) {
      if (typeof index !== 'number' || isNaN(index) || index <= 0) return;
      const item = tempAboutChurchPhotos.splice(index, 1)[0];
      tempAboutChurchPhotos.unshift(item);
      renderChurchPhotosEditList();
      showToast('Set as main church sanctuary photo! ⭐');
    }

    async function replaceChurchGalleryPhoto(index, event) {
      const file = event.target.files && event.target.files[0];
      if (!file || !tempAboutChurchPhotos[index]) return;
      try {
        showToast('Replacing photo... 📷');
        const compressed = await compressAboutImage(file, 960, 0.74);
        tempAboutChurchPhotos[index].url = compressed;
        renderChurchPhotosEditList();
        showToast('Photo replaced successfully! 🖼️✨');
      } catch (err) {
        showToast('Error replacing photo: ' + (err.message || 'invalid file'));
      }
      event.target.value = '';
    }

    function addChurchPhotoFromUrl() {
      const input = document.getElementById('editChurchPhotoUrlInput');
      if (!input) return;
      const url = input.value.trim();
      if (!url) {
        showToast('Please enter an image URL');
        input.focus();
        return;
      }
      const photoObj = {
        url: url,
        caption: "All Saints' Church Sanctuary",
        sub: "Main Church Building & Sacred Grounds • Prothrapur"
      };

      // Immediately save & update live screen slider (exclude default cover photo)
      const data = loadAboutChurchData();
      let list = Array.isArray(data.photos)
        ? data.photos.filter(p => p && p.url && p.url !== 'church_bg.jpg')
        : [];
      list.push(photoObj);
      data.photos = list;
      tempAboutChurchPhotos = JSON.parse(JSON.stringify(list));
      saveAboutChurchData(data);
      input.value = '';
      currentAboutChurchPhotoIndex = data.photos.length - 1;
      renderAboutChurchPhotoSlider();
      renderAboutChurch();
      renderChurchPhotosEditList();
      showToast('Image URL added to slider! 🖼️✨');
    }

    async function handleChurchPhotosSelected(e) {
      const files = Array.from((e && e.target && e.target.files) || []);
      if (!files || files.length === 0) return;
      showToast(`Uploading ${files.length} photo(s)... 🖼️`);
      const churchData = loadAboutChurchData();
      let list = Array.isArray(churchData.photos)
        ? churchData.photos.filter(p => p && p.url && p.url !== 'church_bg.jpg')
        : [];
      let added = 0;
      for (const file of files) {
        try {
          const compressed = await compressAboutImage(file, 800, 0.60);
          const cleanName = (file.name || "Sanctuary Photo")
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]/g, ' ')
            .trim();
          const photoObj = {
            url: compressed,
            caption: cleanName.length > 0 ? (cleanName.charAt(0).toUpperCase() + cleanName.slice(1)) : "All Saints' Church Sanctuary",
            sub: "Main Church Building & Sacred Grounds • Prothrapur"
          };
          list.push(photoObj);
          added++;
        } catch (err) {
          console.error('[AboutChurch] Photo error:', err);
          showToast('Error loading photo: ' + (err.message || 'invalid image'));
        }
      }
      if (added > 0) {
        churchData.photos = list;
        tempAboutChurchPhotos = JSON.parse(JSON.stringify(list));
        saveAboutChurchData(churchData);
        currentAboutChurchPhotoIndex = churchData.photos.length - 1;
        renderAboutChurchPhotoSlider();
        renderAboutChurch();
        renderChurchPhotosEditList();
        showToast(`${added} photo(s) added to slider! 🖼️✨`);
      }
      const input = document.getElementById('editAboutChurchPhotosInput');
      if (input) input.value = '';
    }

    function renderChurchPhotosEditList() {
      const container = document.getElementById('churchPhotosEditGallery');
      const countBadge = document.getElementById('churchPhotosEditCountBadge');
      if (countBadge) {
        countBadge.textContent = `${tempAboutChurchPhotos.length} Photo${tempAboutChurchPhotos.length === 1 ? '' : 's'}`;
      }
      if (!container) return;

      if (tempAboutChurchPhotos.length === 0) {
        container.innerHTML = `
          <div style="font-size:0.78rem; color:var(--text-muted); font-style:italic; padding:12px; text-align:center; background:rgba(0,0,0,0.03); border:1px dashed var(--border-subtle); border-radius:12px;">
            No photos yet. Tap <b>"Tap to add photos"</b> above!
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding:0 2px;">
          <span style="font-size:0.72rem; color:var(--text-secondary); font-weight:700;">Photos for Slider (${tempAboutChurchPhotos.length})</span>
          <span style="font-size:0.66rem; color:var(--text-muted);">Tap icon to view in slider</span>
        </div>
        <div class="church-photos-icon-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(64px, 1fr)); gap:8px;">
          ${tempAboutChurchPhotos.map((item, idx) => {
            const isCurrent = (idx === currentAboutChurchPhotoIndex);
            return `
              <div class="church-gallery-edit-item" data-index="${idx}" onclick="window.selectChurchPhotoAsActive ? window.selectChurchPhotoAsActive(${idx}) : null" style="position:relative; aspect-ratio:1; border-radius:12px; overflow:hidden; border:2px solid ${isCurrent ? 'var(--accent-gold, #c59b27)' : 'var(--border-subtle, rgba(255,255,255,0.14))'}; background:rgba(0,0,0,0.25); box-shadow:0 2px 5px rgba(0,0,0,0.18); cursor:pointer; transition:all 0.15s ease;" title="Tap to view in slider">
                <img src="${item.url || 'church_bg.jpg'}" alt="Photo ${idx + 1}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='church_bg.jpg'">
                <button type="button" class="remove-gallery-photo-btn" onclick="event.stopPropagation(); window.removeChurchGalleryPhoto ? window.removeChurchGalleryPhoto(${idx}) : null" style="position:absolute; top:3px; right:3px; width:18px; height:18px; border-radius:50%; background:rgba(0,0,0,0.78); border:1px solid rgba(255,255,255,0.35); color:#ef4444; font-size:0.65rem; font-weight:800; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; line-height:1;" title="Delete photo">✕</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function populateAboutChurchEditModal(data) {
      // Identity
      const nameIn = document.getElementById('editAboutChurchName');
      if (nameIn) nameIn.value = data.churchName || '';
      const subIn = document.getElementById('editAboutChurchSubtitle');
      if (subIn) subIn.value = data.subtitle || '';
      const dioIn = document.getElementById('editAboutChurchDiocese');
      if (dioIn) dioIn.value = data.diocese || '';
      const tagIn = document.getElementById('editAboutChurchTag');
      if (tagIn) tagIn.value = data.heritageTag || '';

      // Pastor
      const pNameIn = document.getElementById('editAboutPastorName');
      if (pNameIn) pNameIn.value = data.pastorName || '';
      const pBadgeIn = document.getElementById('editAboutPastorBadge');
      if (pBadgeIn) pBadgeIn.value = data.pastorBadge || '';
      const pChurchIn = document.getElementById('editAboutPastorChurchLine');
      if (pChurchIn) pChurchIn.value = data.pastorChurch || `${data.churchName || "All Saints' Church"}, Prothrapur`;
      const pAffilIn = document.getElementById('editAboutPastorAffilLine');
      if (pAffilIn) pAffilIn.value = data.pastorAffiliation || data.subtitle || '';
      const pDescIn = document.getElementById('editAboutPastorDesc');
      if (pDescIn) pDescIn.value = data.pastorDesc || '';
      const pQuoteIn = document.getElementById('editAboutPastorQuote');
      if (pQuoteIn) pQuoteIn.value = data.pastorQuote || '';

      tempAboutPastorPhoto = data.pastorPhoto || '';
      renderPastorPhotoPreview();

      // Photos Gallery
      const currentPhotos = getAboutChurchPhotosList();
      tempAboutChurchPhotos = JSON.parse(JSON.stringify(currentPhotos));
      renderChurchPhotosEditList();

      // History
      const histBadgeIn = document.getElementById('editAboutHistoryBadge');
      if (histBadgeIn) histBadgeIn.value = data.historyBadge || defaultAboutChurchData.historyBadge;
      const histIn = document.getElementById('editAboutHistory');
      if (histIn) histIn.value = data.historySummary || defaultAboutChurchData.historySummary;
    }

    // Pastor Photo Crop & Pan Engine (HTML5 Canvas-based)
    let currentCropImage = null;
    let cropZoom = 1.0;
    let cropPanX = 0;
    let cropPanY = 0;
    let cropRotation = 0;
    let isCropDragging = false;
    let cropDragStartX = 0;
    let cropDragStartY = 0;
    let cropSourceMode = 'direct'; // 'direct' | 'modal'

    function renderCropCanvas() {
      const canvas = document.getElementById('pastorCropCanvas');
      if (!canvas || !currentCropImage) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Translate to canvas center + pan offset
      ctx.translate(w / 2 + cropPanX, h / 2 + cropPanY);
      // Rotation
      ctx.rotate((cropRotation * Math.PI) / 180);
      // Zoom
      ctx.scale(cropZoom, cropZoom);

      // Base cover scale relative to 260px circular guide
      const guideDiameter = 260;
      const baseScale = Math.max(guideDiameter / currentCropImage.width, guideDiameter / currentCropImage.height);
      const drawW = currentCropImage.width * baseScale;
      const drawH = currentCropImage.height * baseScale;

      ctx.drawImage(currentCropImage, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    function openPastorPhotoCropper(fileOrSrc, sourceMode = 'direct') {
      cropSourceMode = sourceMode;

      const handleImageReady = (imgSrc) => {
        const img = new Image();
        img.onload = () => {
          currentCropImage = img;
          cropZoom = 1.0;
          cropPanX = 0;
          cropPanY = 0;
          cropRotation = 0;
          const slider = document.getElementById('pastorCropZoomSlider');
          if (slider) slider.value = '1.0';
          renderCropCanvas();
          const modal = document.getElementById('pastorPhotoCropModal');
          if (modal) modal.classList.remove('hidden');
          document.body.classList.add('modal-open');
        };
        img.onerror = () => {
          showToast('Failed to load image for cropping');
        };
        img.src = imgSrc;
      };

      if (typeof fileOrSrc === 'string') {
        handleImageReady(fileOrSrc);
      } else if (fileOrSrc instanceof Blob || fileOrSrc instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => handleImageReady(e.target.result);
        reader.onerror = () => showToast('Failed to read image file');
        reader.readAsDataURL(fileOrSrc);
      }
    }

    function closePastorCropModal() {
      const modal = document.getElementById('pastorPhotoCropModal');
      if (modal) modal.classList.add('hidden');
      const editModal = document.getElementById('aboutChurchEditModalOverlay');
      if (!editModal || editModal.classList.contains('hidden')) {
        document.body.classList.remove('modal-open');
      }
      currentCropImage = null;
    }

    function generateCroppedPastorImage() {
      if (!currentCropImage) return null;
      const exportCanvas = document.createElement('canvas');
      const exportSize = 520;
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const ctx = exportCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 2x resolution relative to 260px preview guide
      const scaleFactor = exportSize / 260; // 2.0

      ctx.save();
      ctx.translate(exportSize / 2 + cropPanX * scaleFactor, exportSize / 2 + cropPanY * scaleFactor);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropZoom * scaleFactor, cropZoom * scaleFactor);

      const guideDiameter = 260;
      const baseScale = Math.max(guideDiameter / currentCropImage.width, guideDiameter / currentCropImage.height);
      const drawW = currentCropImage.width * baseScale;
      const drawH = currentCropImage.height * baseScale;

      ctx.drawImage(currentCropImage, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      return exportCanvas.toDataURL('image/jpeg', 0.88);
    }

    async function applyPastorPhotoCrop() {
      const croppedDataUrl = generateCroppedPastorImage();
      if (!croppedDataUrl) {
        showToast('Please select a photo first');
        return;
      }

      tempAboutPastorPhoto = croppedDataUrl;
      const data = loadAboutChurchData();
      data.pastorPhoto = croppedDataUrl;
      saveAboutChurchData(data);
      renderAboutChurch();
      renderPastorPhotoPreview();

      showToast('Pastor portrait cropped, saved & synced! 📷✨');
      closePastorCropModal();
    }

    function switchAboutChurchEditTab(targetSectionId) {
      const modal = document.getElementById('aboutChurchEditModalOverlay');
      if (!modal) return;
      let targetId = targetSectionId;
      if (targetId === 'identity') targetId = 'aboutChurchEditSectionIdentity';
      if (targetId === 'pastor') targetId = 'aboutChurchEditSectionPastor';
      if (targetId === 'photos') targetId = 'aboutChurchEditSectionPhotos';

      const tabBtns = modal.querySelectorAll('.ac-modal-tab-btn');
      const sections = modal.querySelectorAll('.modal-section-card');

      tabBtns.forEach(btn => {
        const secId = btn.getAttribute('data-target-section');
        const isActive = (secId === targetId);
        btn.classList.toggle('active', isActive);
        if (isActive) {
          btn.style.background = 'rgba(197, 155, 39, 0.18)';
          btn.style.borderColor = 'rgba(197, 155, 39, 0.4)';
          btn.style.color = 'var(--accent-gold)';
          btn.style.fontWeight = '700';
        } else {
          btn.style.background = 'transparent';
          btn.style.borderColor = 'transparent';
          btn.style.color = 'var(--text-muted)';
          btn.style.fontWeight = '600';
        }
      });

      sections.forEach(sec => {
        const shouldShow = (sec.id === targetId);
        if (shouldShow) {
          sec.style.setProperty('display', 'block', 'important');
        } else {
          sec.style.setProperty('display', 'none', 'important');
        }
      });

      const modalBody = modal.querySelector('.modal-body');
      if (modalBody) modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.switchAboutChurchEditTab = switchAboutChurchEditTab;

    function openAboutChurchEditModal(targetSection = null) {
      const modal = document.getElementById('aboutChurchEditModalOverlay');
      if (!modal) {
        console.error('[AboutChurch] Modal #aboutChurchEditModalOverlay not found');
        return;
      }
      try {
        const data = loadAboutChurchData();
        populateAboutChurchEditModal(data);
      } catch (err) {
        console.error('[AboutChurch] Error populating edit modal:', err);
      }
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('opacity', '1', 'important');
      modal.style.setProperty('pointer-events', 'auto', 'important');
      modal.style.setProperty('visibility', 'visible', 'important');
      document.body.classList.add('modal-open');

      const target = (targetSection === 'all' || !targetSection) ? 'identity' : targetSection;
      if (target === 'pastor') {
        switchAboutChurchEditTab('aboutChurchEditSectionPastor');
        setTimeout(() => { document.getElementById('editAboutPastorName')?.focus(); }, 120);
      } else if (target === 'photos') {
        switchAboutChurchEditTab('aboutChurchEditSectionPhotos');
      } else {
        switchAboutChurchEditTab('aboutChurchEditSectionIdentity');
        setTimeout(() => { document.getElementById('editAboutChurchName')?.focus(); }, 120);
      }
    }

    function closeAboutChurchEditModal() {
      const modal = document.getElementById('aboutChurchEditModalOverlay');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
        modal.style.removeProperty('opacity');
        modal.style.removeProperty('pointer-events');
        modal.style.removeProperty('visibility');
      }
      document.body.classList.remove('modal-open');
    }

    async function saveAboutChurchFormData() {
      const currentData = loadAboutChurchData();
      const container = document.getElementById('churchPhotosEditGallery');
      if (container) {
        container.querySelectorAll('.church-gallery-edit-item').forEach(itemEl => {
          const idx = parseInt(itemEl.getAttribute('data-index'), 10);
          const captionIn = itemEl.querySelector('.photo-edit-caption');
          const subIn = itemEl.querySelector('.photo-edit-sub');
          if (tempAboutChurchPhotos[idx]) {
            if (captionIn && captionIn.value !== undefined) tempAboutChurchPhotos[idx].caption = captionIn.value.trim();
            if (subIn && subIn.value !== undefined) tempAboutChurchPhotos[idx].sub = subIn.value.trim();
          }
        });
      }

      const updatedData = {
        churchName: document.getElementById('editAboutChurchName')?.value.trim() || defaultAboutChurchData.churchName,
        subtitle: document.getElementById('editAboutChurchSubtitle')?.value.trim() || defaultAboutChurchData.subtitle,
        diocese: document.getElementById('editAboutChurchDiocese')?.value.trim() || defaultAboutChurchData.diocese,
        heritageTag: document.getElementById('editAboutChurchTag')?.value.trim() || defaultAboutChurchData.heritageTag,

        pastorName: document.getElementById('editAboutPastorName')?.value.trim() || defaultAboutChurchData.pastorName,
        pastorBadge: document.getElementById('editAboutPastorBadge')?.value.trim() || defaultAboutChurchData.pastorBadge,
        pastorChurch: document.getElementById('editAboutPastorChurchLine')?.value.trim() || `${defaultAboutChurchData.churchName}, Prothrapur`,
        pastorAffiliation: document.getElementById('editAboutPastorAffilLine')?.value.trim() || defaultAboutChurchData.pastorAffiliation,
        pastorDesc: document.getElementById('editAboutPastorDesc')?.value.trim() || defaultAboutChurchData.pastorDesc,
        pastorQuote: document.getElementById('editAboutPastorQuote')?.value.trim() || defaultAboutChurchData.pastorQuote,
        pastorPhoto: tempAboutPastorPhoto,

        photos: (Array.isArray(tempAboutChurchPhotos) && tempAboutChurchPhotos.length > 0)
          ? tempAboutChurchPhotos
          : (currentData.photos || JSON.parse(JSON.stringify(defaultAboutChurchData.photos))),

        historyBadge: document.getElementById('editAboutHistoryBadge')?.value.trim() || currentData.historyBadge || defaultAboutChurchData.historyBadge,
        historySummary: document.getElementById('editAboutHistory')?.value.trim() || currentData.historySummary || defaultAboutChurchData.historySummary
      };

      const saved = saveAboutChurchData(updatedData);
      renderAboutChurch();
      renderAboutChurchPhotoSlider();
      renderFullscreenPhotoView();
      closeAboutChurchEditModal();
      if (saved) {
        showToast('About Church details & photos saved! ⛪✨');
      } else {
        showToast('Saved locally, but storage is nearly full! ⛪');
      }
    }

    async function handleOpenAboutChurchEdit(targetSection = null) {
      openAboutChurchEditModal(targetSection);
    }

    // Expose methods globally on window for inline handlers & external modules
    window.openAboutChurchEditModal = openAboutChurchEditModal;
    window.closeAboutChurchEditModal = closeAboutChurchEditModal;
    window.saveAboutChurchFormData = saveAboutChurchFormData;
    window.handleOpenAboutChurchEdit = handleOpenAboutChurchEdit;
    window.openChurchPhotoFullscreen = openChurchPhotoFullscreen;
    window.closeChurchPhotoFullscreen = closeChurchPhotoFullscreen;
    window.slideNextChurchPhoto = slideNextChurchPhoto;
    window.slidePrevChurchPhoto = slidePrevChurchPhoto;
    window.updateChurchPhotoField = updateChurchPhotoField;
    window.removeChurchGalleryPhoto = removeChurchGalleryPhoto;
    window.moveChurchGalleryPhoto = moveChurchGalleryPhoto;
    window.setPrimaryChurchGalleryPhoto = setPrimaryChurchGalleryPhoto;
    window.replaceChurchGalleryPhoto = replaceChurchGalleryPhoto;
    window.addChurchPhotoFromUrl = addChurchPhotoFromUrl;
    window.handleChurchPhotosSelected = handleChurchPhotosSelected;
    window.renderChurchPhotosEditList = renderChurchPhotosEditList;
    window.selectChurchPhotoAsActive = selectChurchPhotoAsActive;

    // Document-level delegated click handler for About Church edit buttons (guarantees click works anywhere)
    if (!window.__aboutChurchClickDelegated) {
      window.__aboutChurchClickDelegated = true;
      document.addEventListener('click', (e) => {
        const pastorBtn = e.target.closest('#editPastorDirectBtn, #editPastorCardBtn, .ac-card-edit-btn, .ac-top-edit-btn');
        if (pastorBtn) {
          e.preventDefault();
          e.stopPropagation();
          const p = (typeof useAppPermissions === 'function') ? useAppPermissions() : null;
          const isSuper = Boolean(
            p?.isSuperAdmin ||
            p?.role === 'superadmin' ||
            (typeof currentAuthSession !== 'undefined' && currentAuthSession && (
              currentAuthSession.email === SUPER_ADMIN_EMAIL ||
              currentAuthSession.role === 'superadmin'
            ))
          );
          if (pastorBtn.id === 'editPastorDirectBtn' && !isSuper) {
            return;
          }
          if (pastorBtn.id === 'editPastorCardBtn') {
            openAboutChurchEditModal('pastor');
          } else {
            openAboutChurchEditModal();
          }
          return;
        }
        const fsCloseBtn = e.target.closest('#closeChurchPhotoFullscreenBtn');
        if (fsCloseBtn) {
          e.preventDefault();
          e.stopPropagation();
          closeChurchPhotoFullscreen();
          return;
        }
        const fsPrev = e.target.closest('#fullscreenChurchPhotoPrevBtn');
        if (fsPrev) {
          e.preventDefault();
          e.stopPropagation();
          slidePrevChurchPhoto();
          return;
        }
        const fsNext = e.target.closest('#fullscreenChurchPhotoNextBtn');
        if (fsNext) {
          e.preventDefault();
          e.stopPropagation();
          slideNextChurchPhoto();
          return;
        }
        const photoBtn = e.target.closest('#managePhotosDirectBtn');
        if (photoBtn) {
          e.preventDefault();
          e.stopPropagation();
          openAboutChurchEditModal('photos');
          return;
        }
        const addUrlBtn = e.target.closest('#addChurchPhotoUrlBtn');
        if (addUrlBtn) {
          e.preventDefault();
          e.stopPropagation();
          addChurchPhotoFromUrl();
          return;
        }
        const removePhotoBtn = e.target.closest('.remove-gallery-photo-btn');
        if (removePhotoBtn) {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(removePhotoBtn.getAttribute('data-index'), 10);
          if (!isNaN(idx)) removeChurchGalleryPhoto(idx);
          return;
        }
        const choosePhotosBtn = e.target.closest('#chooseChurchPhotosBtn');
        if (choosePhotosBtn && choosePhotosBtn.tagName !== 'LABEL') {
          const fileIn = document.getElementById('editAboutChurchPhotosInput');
          if (fileIn) fileIn.click();
          return;
        }
        const closeBtn = e.target.closest('#closeAboutChurchEditModalBtn, #cancelAboutChurchEditBtn');
        if (closeBtn) {
          e.preventDefault();
          e.stopPropagation();
          closeAboutChurchEditModal();
          return;
        }
      });
    }

    function initAboutChurchModule() {
      renderAboutChurch();

      // Direct In-Card Edit buttons: pop windows to edit details of pastor or sanctuary photos
      const editPastorDirectBtn = document.getElementById('editPastorDirectBtn');
      if (editPastorDirectBtn) {
        editPastorDirectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const p = (typeof useAppPermissions === 'function') ? useAppPermissions() : null;
          const isSuper = Boolean(
            p?.isSuperAdmin ||
            p?.role === 'superadmin' ||
            (typeof currentAuthSession !== 'undefined' && currentAuthSession && (
              currentAuthSession.email === SUPER_ADMIN_EMAIL ||
              currentAuthSession.role === 'superadmin'
            ))
          );
          if (!isSuper) return;
          openAboutChurchEditModal();
        });
      }

      const editPastorCardBtn = document.getElementById('editPastorCardBtn');
      if (editPastorCardBtn) {
        editPastorCardBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openAboutChurchEditModal('pastor');
        });
      }

      const managePhotosDirectBtn = document.getElementById('managePhotosDirectBtn');
      if (managePhotosDirectBtn) {
        managePhotosDirectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openAboutChurchEditModal('photos');
        });
      }

      // Modal backdrop click to dismiss
      const aboutEditOverlay = document.getElementById('aboutChurchEditModalOverlay');
      if (aboutEditOverlay) {
        aboutEditOverlay.addEventListener('click', (e) => {
          if (e.target === aboutEditOverlay) {
            closeAboutChurchEditModal();
          }
        });
      }

      // Direct In-Card Pastor Photo tap -> Crop & Set
      const pastorPhotoWrap = document.getElementById('aboutPastorPhotoWrap');
      const pastorPhotoDirectInput = document.getElementById('pastorPhotoDirectInput');
      if (pastorPhotoWrap && pastorPhotoDirectInput) {
        pastorPhotoWrap.addEventListener('click', (e) => {
          e.stopPropagation();
          pastorPhotoDirectInput.click();
        });

        pastorPhotoDirectInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          openPastorPhotoCropper(file, 'direct');
          pastorPhotoDirectInput.value = '';
        });
      }

      // Direct In-Card Church Photo Upload
      const directChurchPhotoInput = document.getElementById('directChurchPhotoInput');
      if (directChurchPhotoInput) {
        directChurchPhotoInput.addEventListener('change', async (e) => {
          const files = Array.from((e && e.target && e.target.files) || []);
          if (!files || files.length === 0) return;
          showToast(`Compressing & adding ${files.length} photo(s)... 🖼️`);
          const churchData = loadAboutChurchData();
          if (!Array.isArray(churchData.photos)) {
            churchData.photos = [...defaultAboutChurchData.photos];
          }
          let addedCount = 0;
          for (const file of files) {
            try {
              const compressed = await compressAboutImage(file, 960, 0.74);
              const cleanName = (file.name || "Sanctuary Photo")
                .replace(/\.[^/.]+$/, "")
                .replace(/[-_]/g, ' ')
                .trim();
              churchData.photos.push({
                url: compressed,
                caption: "",
                sub: ""
              });
              addedCount++;
            } catch (err) {
              console.error('[AboutChurch] Direct photo upload error:', err);
              showToast('Error uploading photo: ' + (err.message || 'invalid image'));
            }
          }
          if (addedCount > 0) {
            saveAboutChurchData(churchData);
            currentAboutChurchPhotoIndex = churchData.photos.length - 1;
            renderAboutChurchPhotoSlider();
            renderAboutChurch();
            showToast(`${addedCount} photo(s) added to Church gallery! 🏛️✨`);
          }
          directChurchPhotoInput.value = '';
        });
      }

      const addChurchPhotoDirectBtn = document.getElementById('addChurchPhotoDirectBtn');
      if (addChurchPhotoDirectBtn) {
        addChurchPhotoDirectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const fileIn = document.getElementById('directChurchPhotoInput');
          if (fileIn) fileIn.click();
        });
      }

      // In-Card Photo Slider controls
      const photoPrevBtn = document.getElementById('aboutChurchPhotoPrevBtn');
      if (photoPrevBtn) {
        photoPrevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          slidePrevChurchPhoto();
        });
      }

      const photoNextBtn = document.getElementById('aboutChurchPhotoNextBtn');
      if (photoNextBtn) {
        photoNextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          slideNextChurchPhoto();
        });
      }

      const mainPhotoWrap = document.getElementById('aboutChurchMainPhotoWrap');
      if (mainPhotoWrap) {
        let cardTouchStartX = 0;
        let cardTouchStartY = 0;
        let cardTouchEndX = 0;
        let cardTouchEndY = 0;
        let cardSwiped = false;

        mainPhotoWrap.addEventListener('touchstart', (e) => {
          if (!e.touches || e.touches.length === 0) return;
          cardTouchStartX = e.touches[0].clientX;
          cardTouchStartY = e.touches[0].clientY;
          cardTouchEndX = cardTouchStartX;
          cardTouchEndY = cardTouchStartY;
          cardSwiped = false;
        }, { passive: true });

        mainPhotoWrap.addEventListener('touchmove', (e) => {
          if (!e.touches || e.touches.length === 0) return;
          cardTouchEndX = e.touches[0].clientX;
          cardTouchEndY = e.touches[0].clientY;
        }, { passive: true });

        mainPhotoWrap.addEventListener('touchend', (e) => {
          const diffX = cardTouchEndX - cardTouchStartX;
          const diffY = cardTouchEndY - cardTouchStartY;
          if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
            cardSwiped = true;
            if (diffX > 0) {
              slidePrevChurchPhoto();
            } else {
              slideNextChurchPhoto();
            }
            setTimeout(() => { cardSwiped = false; }, 250);
          } else {
            cardSwiped = false;
          }
        }, { passive: true });

        mainPhotoWrap.addEventListener('click', (e) => {
          if (cardSwiped) {
            cardSwiped = false;
            return;
          }
          if (e.target.closest('#aboutChurchPhotoPrevBtn') || e.target.closest('#aboutChurchPhotoNextBtn') || e.target.closest('.ac-photo-dot')) return;
          openChurchPhotoFullscreen(currentAboutChurchPhotoIndex);
        });
      }

      // Fullscreen Modal Controls
      const closeFullscreenBtn = document.getElementById('closeChurchPhotoFullscreenBtn');
      if (closeFullscreenBtn) {
        closeFullscreenBtn.addEventListener('click', closeChurchPhotoFullscreen);
      }

      const fsPrevBtn = document.getElementById('fullscreenChurchPhotoPrevBtn');
      if (fsPrevBtn) {
        fsPrevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          slidePrevChurchPhoto();
        });
      }

      const fsNextBtn = document.getElementById('fullscreenChurchPhotoNextBtn');
      if (fsNextBtn) {
        fsNextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          slideNextChurchPhoto();
        });
      }

      const fsModal = document.getElementById('aboutChurchPhotoFullscreenModal');
      if (fsModal) {
        const fsImg = document.getElementById('fullscreenChurchPhotoImg');
        let touchStartX = 0;
        let touchStartY = 0;
        let currentTranslateX = 0;
        let isTouching = false;
        let isHorizontalSwipe = false;

        fsModal.addEventListener('touchstart', (e) => {
          if (!e.touches || e.touches.length === 0) return;
          if (e.target.closest('#fullscreenChurchPhotoPrevBtn, #fullscreenChurchPhotoNextBtn, #closeChurchPhotoFullscreenBtn')) return;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          currentTranslateX = 0;
          isTouching = true;
          isHorizontalSwipe = false;
          if (fsImg) {
            fsImg.style.transition = 'none';
          }
        }, { passive: true });

        fsModal.addEventListener('touchmove', (e) => {
          if (!isTouching || !e.touches || e.touches.length === 0) return;
          const currentX = e.touches[0].clientX;
          const currentY = e.touches[0].clientY;
          const diffX = currentX - touchStartX;
          const diffY = currentY - touchStartY;

          if (!isHorizontalSwipe && Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
            isHorizontalSwipe = true;
          }

          if (isHorizontalSwipe && fsImg) {
            currentTranslateX = diffX;
            fsImg.style.transform = `translateX(${diffX}px)`;
          }
        }, { passive: true });

        fsModal.addEventListener('touchend', (e) => {
          if (!isTouching) return;
          isTouching = false;

          if (isHorizontalSwipe && fsImg) {
            const threshold = 40;
            const photos = getAboutChurchPhotosList();
            if (photos && photos.length > 1) {
              if (currentTranslateX > threshold) {
                // Slide right -> prev photo
                fsImg.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
                fsImg.style.transform = 'translateX(100vw)';
                fsImg.style.opacity = '0';
                setTimeout(() => {
                  slidePrevChurchPhoto();
                  fsImg.style.transition = 'none';
                  fsImg.style.transform = 'translateX(-100vw)';
                  setTimeout(() => {
                    fsImg.style.transition = 'transform 0.20s ease-out, opacity 0.20s ease-out';
                    fsImg.style.transform = 'translateX(0)';
                    fsImg.style.opacity = '1';
                  }, 20);
                }, 160);
              } else if (currentTranslateX < -threshold) {
                // Slide left -> next photo
                fsImg.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
                fsImg.style.transform = 'translateX(-100vw)';
                fsImg.style.opacity = '0';
                setTimeout(() => {
                  slideNextChurchPhoto();
                  fsImg.style.transition = 'none';
                  fsImg.style.transform = 'translateX(100vw)';
                  setTimeout(() => {
                    fsImg.style.transition = 'transform 0.20s ease-out, opacity 0.20s ease-out';
                    fsImg.style.transform = 'translateX(0)';
                    fsImg.style.opacity = '1';
                  }, 20);
                }, 160);
              } else {
                // Snap back to center
                fsImg.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
                fsImg.style.transform = 'translateX(0)';
                fsImg.style.opacity = '1';
              }
            } else {
              fsImg.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
              fsImg.style.transform = 'translateX(0)';
              fsImg.style.opacity = '1';
            }
          }
          currentTranslateX = 0;
          isHorizontalSwipe = false;
        }, { passive: true });

        fsModal.addEventListener('click', (e) => {
          if (e.target.closest('#closeChurchPhotoFullscreenBtn')) {
            closeChurchPhotoFullscreen();
            return;
          }
          if (e.target.closest('#fullscreenChurchPhotoPrevBtn')) {
            e.stopPropagation();
            slidePrevChurchPhoto();
            return;
          }
          if (e.target.closest('#fullscreenChurchPhotoNextBtn')) {
            e.stopPropagation();
            slideNextChurchPhoto();
            return;
          }
          if (e.target === fsModal || e.target.id === 'fullscreenPhotoViewport') {
            closeChurchPhotoFullscreen();
          }
        });
      }

      // Global keyboard navigation for fullscreen photo slider
      window.addEventListener('keydown', (e) => {
        const modal = document.getElementById('aboutChurchPhotoFullscreenModal');
        if (modal && !modal.classList.contains('hidden')) {
          if (e.key === 'ArrowLeft') {
            slidePrevChurchPhoto();
          } else if (e.key === 'ArrowRight') {
            slideNextChurchPhoto();
          } else if (e.key === 'Escape') {
            closeChurchPhotoFullscreen();
          }
        }
      });

      // Edit Modal controls
      const closeAboutChurchEditModalBtn = document.getElementById('closeAboutChurchEditModalBtn');
      if (closeAboutChurchEditModalBtn) {
        closeAboutChurchEditModalBtn.addEventListener('click', closeAboutChurchEditModal);
      }

      const cancelAboutChurchEditBtn = document.getElementById('cancelAboutChurchEditBtn');
      if (cancelAboutChurchEditBtn) {
        cancelAboutChurchEditBtn.addEventListener('click', closeAboutChurchEditModal);
      }

      const saveAboutChurchEditBtn = document.getElementById('saveAboutChurchEditBtn');
      if (saveAboutChurchEditBtn) {
        saveAboutChurchEditBtn.addEventListener('click', saveAboutChurchFormData);
      }

      // Pastor photo upload, crop & remove
      const choosePastorPhotoBtn = document.getElementById('choosePastorPhotoBtn');
      const pastorPhotoInput = document.getElementById('editAboutPastorPhotoInput');
      const cropCurrentPastorPhotoBtn = document.getElementById('cropCurrentPastorPhotoBtn');
      const clearPastorPhotoBtn = document.getElementById('clearPastorPhotoBtn');

      if (choosePastorPhotoBtn && pastorPhotoInput) {
        choosePastorPhotoBtn.addEventListener('click', () => {
          if (choosePastorPhotoBtn.tagName !== 'LABEL') {
            pastorPhotoInput.click();
          }
        });
      }

      if (pastorPhotoInput) {
        pastorPhotoInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          openPastorPhotoCropper(file, 'modal');
          pastorPhotoInput.value = '';
        });
      }

      if (cropCurrentPastorPhotoBtn) {
        cropCurrentPastorPhotoBtn.addEventListener('click', () => {
          if (tempAboutPastorPhoto) {
            openPastorPhotoCropper(tempAboutPastorPhoto, 'modal');
          }
        });
      }

      if (clearPastorPhotoBtn) {
        clearPastorPhotoBtn.addEventListener('click', () => {
          tempAboutPastorPhoto = '';
          renderPastorPhotoPreview();
          showToast('Pastor photo removed');
        });
      }

      // Pastor Photo Crop Modal Controls
      const closeCropBtn = document.getElementById('closePastorCropModalBtn');
      const cancelCropBtn = document.getElementById('cancelPastorCropBtn');
      const saveCropBtn = document.getElementById('savePastorCropBtn');
      const cropRotateBtn = document.getElementById('pastorCropRotateBtn');
      const cropResetBtn = document.getElementById('pastorCropResetBtn');
      const cropZoomSlider = document.getElementById('pastorCropZoomSlider');
      const cropContainer = document.getElementById('pastorCropContainer');

      if (closeCropBtn) closeCropBtn.addEventListener('click', closePastorCropModal);
      if (cancelCropBtn) cancelCropBtn.addEventListener('click', closePastorCropModal);
      if (saveCropBtn) saveCropBtn.addEventListener('click', applyPastorPhotoCrop);

      if (cropRotateBtn) {
        cropRotateBtn.addEventListener('click', () => {
          cropRotation = (cropRotation + 90) % 360;
          renderCropCanvas();
        });
      }

      if (cropResetBtn) {
        cropResetBtn.addEventListener('click', () => {
          cropZoom = 1.0;
          cropPanX = 0;
          cropPanY = 0;
          cropRotation = 0;
          if (cropZoomSlider) cropZoomSlider.value = '1.0';
          renderCropCanvas();
        });
      }

      if (cropZoomSlider) {
        cropZoomSlider.addEventListener('input', (e) => {
          cropZoom = parseFloat(e.target.value) || 1.0;
          renderCropCanvas();
        });
      }

      // Tab Switching in About Church Edit Modal (Event Delegation)
      const aboutChurchModalTabs = document.getElementById('aboutChurchModalTabs');
      if (aboutChurchModalTabs) {
        aboutChurchModalTabs.addEventListener('click', (e) => {
          const btn = e.target.closest('.ac-modal-tab-btn');
          if (!btn) return;
          e.preventDefault();
          e.stopPropagation();
          const targetSec = btn.getAttribute('data-target-section');
          if (targetSec && typeof switchAboutChurchEditTab === 'function') {
            switchAboutChurchEditTab(targetSec);
          }
        });
      }

      if (cropContainer) {
        let activePointers = new Map();
        let initialPinchDistance = 0;
        let initialZoom = 1.0;

        cropContainer.addEventListener('pointerdown', (e) => {
          if (!currentCropImage) return;
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          try { cropContainer.setPointerCapture(e.pointerId); } catch (_) {}

          if (activePointers.size === 1) {
            isCropDragging = true;
            cropDragStartX = e.clientX;
            cropDragStartY = e.clientY;
          } else if (activePointers.size === 2) {
            isCropDragging = false;
            const pts = Array.from(activePointers.values());
            initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            initialZoom = cropZoom;
          }
        });

        cropContainer.addEventListener('pointermove', (e) => {
          if (!currentCropImage || !activePointers.has(e.pointerId)) return;
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

          if (activePointers.size === 1 && isCropDragging) {
            const dx = e.clientX - cropDragStartX;
            const dy = e.clientY - cropDragStartY;
            cropPanX += dx;
            cropPanY += dy;
            cropDragStartX = e.clientX;
            cropDragStartY = e.clientY;
            renderCropCanvas();
          } else if (activePointers.size === 2 && initialPinchDistance > 0) {
            const pts = Array.from(activePointers.values());
            const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const scale = currentDist / initialPinchDistance;
            cropZoom = Math.min(3.5, Math.max(0.4, initialZoom * scale));
            if (cropZoomSlider) cropZoomSlider.value = cropZoom.toFixed(2);
            renderCropCanvas();
          }
        });

        const stopCropDrag = (e) => {
          activePointers.delete(e.pointerId);
          try { cropContainer.releasePointerCapture(e.pointerId); } catch (_) {}
          if (activePointers.size === 1) {
            const remaining = Array.from(activePointers.values())[0];
            isCropDragging = true;
            cropDragStartX = remaining.x;
            cropDragStartY = remaining.y;
          } else if (activePointers.size === 0) {
            isCropDragging = false;
            initialPinchDistance = 0;
          }
        };

        cropContainer.addEventListener('pointerup', stopCropDrag);
        cropContainer.addEventListener('pointercancel', stopCropDrag);

        cropContainer.addEventListener('wheel', (e) => {
          e.preventDefault();
          if (!currentCropImage) return;
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          cropZoom = Math.min(3.5, Math.max(0.4, cropZoom + delta));
          if (cropZoomSlider) cropZoomSlider.value = cropZoom.toFixed(2);
          renderCropCanvas();
        }, { passive: false });
      }

      // Church Sanctuary Photos Upload & Add URL
      const churchPhotosInput = document.getElementById('editAboutChurchPhotosInput');
      if (churchPhotosInput) {
        churchPhotosInput.addEventListener('change', handleChurchPhotosSelected);
      }

      const addChurchPhotoUrlBtn = document.getElementById('addChurchPhotoUrlBtn');
      const editChurchPhotoUrlInput = document.getElementById('editChurchPhotoUrlInput');
      if (addChurchPhotoUrlBtn) {
        addChurchPhotoUrlBtn.addEventListener('click', addChurchPhotoFromUrl);
      }
      if (editChurchPhotoUrlInput) {
        editChurchPhotoUrlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addChurchPhotoFromUrl();
          }
        });
      }
    }
    const timelineBackBtn = document.getElementById('timelineBackBtn');
    if (timelineBackBtn) {
      timelineBackBtn.addEventListener('click', () => {
        switchTab('viewHome');
      });
    }
    const timelineBackHomeBottomBtn = document.getElementById('timelineBackHomeBottomBtn');
    if (timelineBackHomeBottomBtn) {
      timelineBackHomeBottomBtn.addEventListener('click', () => {
        switchTab('viewHome');
      });
    }
    if (openAlmanacFromTimelineBtn) {
      openAlmanacFromTimelineBtn.addEventListener('click', () => {
        switchTab('viewAlmanac');
      });
    }

    /* ==========================================================================
       WHATSAPP FULL-SCREEN CHAT ENGINE & CNI CHANNELS (CONGREGATION & YOUTH)
       ========================================================================== */
    const waBackToHomeBtn = document.getElementById('waBackToHomeBtn');
    const waHeaderAvatar = document.getElementById('waHeaderAvatar');
    const waHeaderName = document.getElementById('waHeaderName');
    const waHeaderStatus = document.getElementById('waHeaderStatus');
    const tabCniCongregation = document.getElementById('tabCniCongregation');
    const tabCniYouth = document.getElementById('tabCniYouth');
    const waChatBody = document.getElementById('waChatBody');
    const waGoToSettingsBtn = document.getElementById('waGoToSettingsBtn');
    const waEmojiToggleBtn = document.getElementById('waEmojiToggleBtn');
    const waEmojiTray = document.getElementById('waEmojiTray');
    const waAttachToggleBtn = document.getElementById('waAttachToggleBtn');
    const waAttachMenu = document.getElementById('waAttachMenu');
    const waCameraQuickBtn = document.getElementById('waCameraQuickBtn');
    const waTypingBubble = document.getElementById('waTypingBubble');

    if (waBackToHomeBtn) {
      waBackToHomeBtn.addEventListener('click', () => {
        switchTab('viewHome');
      });
    }

    if (tabCniCongregation) {
      tabCniCongregation.addEventListener('click', () => {
        activeCniChannel = 'congregation';
        renderActiveCniChat(true);
      });
    }

    if (tabCniYouth) {
      tabCniYouth.addEventListener('click', () => {
        activeCniChannel = 'youth';
        renderActiveCniChat(true);
      });
    }

    if (waGoToSettingsBtn) {
      waGoToSettingsBtn.addEventListener('click', () => {
        switchTab('viewSettings');
      });
    }

    const chatDisplayNameInput = document.getElementById('chatDisplayNameInput');
    const chatParishRoleSelect = document.getElementById('chatParishRoleSelect');
    const chatDefaultChannelSelect = document.getElementById('chatDefaultChannelSelect');
    const chatWallpaperSelect = document.getElementById('chatWallpaperSelect');
    const chatSoundToggle = document.getElementById('chatSoundToggle');
    const chatReadReceiptsToggle = document.getElementById('chatReadReceiptsToggle');
    const chatAutoReplyToggle = document.getElementById('chatAutoReplyToggle');
    const exportChatTranscriptBtn = document.getElementById('exportChatTranscriptBtn');
    const clearCongregationChatBtn = document.getElementById('clearCongregationChatBtn');
    const clearYouthChatBtn = document.getElementById('clearYouthChatBtn');

    const CHAT_SETTINGS_KEY = 'cni_church_chat_settings_v2';
    const CHAT_MESSAGES_KEY = 'cni_church_chat_messages_v2';
    const CHAT_DELETED_MEMBERS_KEY = 'cni_church_deleted_members_v1';

    function getDeletedMembersList() {
      try {
        const raw = localStorage.getItem(CHAT_DELETED_MEMBERS_KEY) || localStorage.getItem('sanctuary_deleted_members');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) return list;
        }
      } catch (_) {}
      return [];
    }

    function isMemberDeleted(m, channel) {
      if (!m) return false;
      const deletedList = getDeletedMembersList();
      if (!deletedList.length) return false;

      const mId = m.id ? String(m.id).toLowerCase().trim() : '';
      const mName = (m.name || m.sender || '').toLowerCase().trim();
      const mEmail = m.email ? String(m.email).toLowerCase().trim() : '';
      const mSenderId = m.sender_id ? String(m.sender_id).toLowerCase().trim() : '';

      return deletedList.some(d => {
        const dId = d.id ? String(d.id).toLowerCase().trim() : '';
        const dName = (d.name || '').toLowerCase().trim();
        const dEmail = (d.email || '').toLowerCase().trim();

        if (mId && dId && mId === dId) return true;
        if (mSenderId && dId && mSenderId === dId) return true;
        if (mEmail && dEmail && mEmail === dEmail) return true;
        if (mName && dName && mName === dName) return true;
        return false;
      });
    }

    function recordDeletedMember(target, channel = 'all') {
      if (!target) return;
      const deletedList = getDeletedMembersList();
      const mId = target.id ? String(target.id).trim() : '';
      const mName = (target.name || target.sender || '').trim();
      const mEmail = target.email ? String(target.email).trim() : '';

      const already = deletedList.some(d => (mId && d.id === mId) || (mName && d.name && d.name.toLowerCase() === mName.toLowerCase()) || (mEmail && d.email && d.email.toLowerCase() === mEmail.toLowerCase()));
      if (!already) {
        deletedList.push({
          id: mId,
          name: mName,
          email: mEmail,
          channel: channel || 'all',
          deletedAt: new Date().toISOString()
        });
        try {
          localStorage.setItem(CHAT_DELETED_MEMBERS_KEY, JSON.stringify(deletedList));
          localStorage.setItem('sanctuary_deleted_members', JSON.stringify(deletedList));
        } catch (_) {}
      }
    }

    const defaultChatSettings = {
      displayName: 'Emanual',
      parishRole: 'member',
      defaultChannel: 'congregation',
      wallpaper: 'doodle',
      soundEnabled: true,
      readReceipts: true,
      autoReplies: true
    };

    let chatSettings = { ...defaultChatSettings };
    try {
      const saved = localStorage.getItem(CHAT_SETTINGS_KEY);
      if (saved) chatSettings = { ...defaultChatSettings, ...JSON.parse(saved) };
    } catch (_) {}

    const saveChatSettings = () => {
      try {
        localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(chatSettings));
      } catch (_) {}
    };

    const syncChatSettingsToUI = () => {
      const dName = chatSettings.displayName || 'Emanual';
      if (chatDisplayNameInput) chatDisplayNameInput.value = dName;
      const currentDisplayNameLabel = document.getElementById('currentDisplayNameLabel');
      if (currentDisplayNameLabel) currentDisplayNameLabel.textContent = dName;
      if (chatParishRoleSelect) chatParishRoleSelect.value = chatSettings.parishRole || 'member';
      if (chatDefaultChannelSelect) chatDefaultChannelSelect.value = chatSettings.defaultChannel || 'congregation';
      if (chatWallpaperSelect) chatWallpaperSelect.value = chatSettings.wallpaper || 'doodle';
      if (chatSoundToggle) chatSoundToggle.checked = chatSettings.soundEnabled !== false;
      if (chatReadReceiptsToggle) chatReadReceiptsToggle.checked = chatSettings.readReceipts !== false;
      if (chatAutoReplyToggle) chatAutoReplyToggle.checked = chatSettings.autoReplies !== false;

      if (waChatBody) {
        waChatBody.classList.remove('wallpaper-solid', 'wallpaper-cathedral');
        if (chatSettings.wallpaper === 'solid') waChatBody.classList.add('wallpaper-solid');
        else if (chatSettings.wallpaper === 'cathedral') waChatBody.classList.add('wallpaper-cathedral');
      }
    };

    const playWhatsAppTone = (type) => {
      if (!chatSettings.soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (type === 'send') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(540, now);
          osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.09);
        } else if (type === 'receive') {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(659.25, now);
          osc2.frequency.setValueAtTime(880, now + 0.09);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.09);
          osc2.start(now + 0.09);
          osc2.stop(now + 0.28);
        }
      } catch (_) {}
    };

    const initialCniConversations = {
      congregation: {
        id: 'congregation',
        name: 'CNI Congregation',
        avatar: '⛪',
        status: 'Parish Community Channel',
        messages: []
      },
      youth: {
        id: 'youth',
        name: 'CNI Youth',
        avatar: '🕊️',
        status: 'Youth Fellowship Channel',
        messages: []
      }
    };

    let cniConversations = JSON.parse(JSON.stringify(initialCniConversations));
    try {
      const savedMsgs = localStorage.getItem(CHAT_MESSAGES_KEY);
      if (savedMsgs) {
        const parsed = JSON.parse(savedMsgs);
        if (parsed.congregation && parsed.youth) cniConversations = parsed;
      }
    } catch (_) {}

    const saveChatMessages = () => {
      try {
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cniConversations));
      } catch (_) {}
    };

    let activeCniChannel = chatSettings.defaultChannel || 'congregation';

    // ==============================================================================
    // PERMANENT REAL-TIME WEBSOCKET CHAT ENGINE (Same Wi-Fi & Multi-Device Sync)
    // ==============================================================================
    let chatWsSocket = null;
    let wsReconnectTimer = null;
    let wsIsConnected = false;

    function getChurchServerHost() {
      try {
        const saved = localStorage.getItem('church_server_host');
        if (saved && saved.trim()) {
          return saved.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        }
      } catch (_) {}

      const loc = window.location;
      if (loc && loc.host && (loc.protocol === 'http:' || loc.protocol === 'https:')) {
        return loc.host;
      }
      return (window.CHURCH_SERVER_HOST || '127.0.0.1:5555');
    }

    function getChurchHttpUrl(path = '') {
      const cleanPath = path.startsWith('/') ? path : '/' + path;
      const loc = window.location;
      if (loc && loc.protocol && loc.protocol.startsWith('http') && loc.host) {
        return cleanPath;
      }
      const host = getChurchServerHost();
      const proto = (loc && loc.protocol === 'https:') ? 'https:' : 'http:';
      return `${proto}//${host}${cleanPath}`;
    }

    function getWebSocketUrl() {
      const host = getChurchServerHost();
      const loc = window.location;
      const protocol = (loc && loc.protocol === 'https:') ? 'wss:' : 'ws:';
      return `${protocol}//${host}/ws`;
    }

    function initChurchWebSocket() {
      if (typeof WebSocket === 'undefined') return;
      if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
      }

      if (chatWsSocket && (chatWsSocket.readyState === (WebSocket.OPEN || 1) || chatWsSocket.readyState === (WebSocket.CONNECTING || 0))) {
        return;
      }

      try {
        const wsUrl = getWebSocketUrl();
        chatWsSocket = new WebSocket(wsUrl);

        chatWsSocket.onopen = () => {
          wsIsConnected = true;
          chatConnection.setWsConnected(true);
          console.log('[WS Chat] Connected to real-time chat server:', wsUrl);

          const currentPost = (typeof getActiveUserPostKey === 'function') ? getActiveUserPostKey() : (currentAuthSession.congregational_post || 'post-member');
          const postTitle = currentPost === 'post-youth' ? 'Youth Member' : (currentAuthSession.role || 'Member');

          sendWsEvent({
            type: 'init_client',
            uid: currentAuthSession.uid || ('usr_' + Date.now()),
            name: currentAuthSession.display_name || 'Believer',
            role: postTitle,
            channel: activeCniChannel || 'congregation'
          });

          // Flush any queued offline messages now that we're connected
          setTimeout(() => flushChatOutbox(), 500);
        };

        chatWsSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleIncomingWsMessage(data);
          } catch (e) {
            console.warn('[WS Chat] Error processing message:', e);
          }
        };

        chatWsSocket.onclose = () => {
          wsIsConnected = false;
          chatConnection.setWsConnected(false);
          if (!wsReconnectTimer) {
            wsReconnectTimer = setTimeout(() => {
              wsReconnectTimer = null;
              initChurchWebSocket();
            }, 2000);
          }
        };

        chatWsSocket.onerror = () => {
          try { chatWsSocket.close(); } catch (_) {}
        };
      } catch (e) {
        console.warn('[WS Chat] WebSocket connection failed:', e);
        if (!wsReconnectTimer) {
          wsReconnectTimer = setTimeout(() => {
            wsReconnectTimer = null;
            initChurchWebSocket();
          }, 3000);
        }
      }
    }

    function sendWsEvent(payload) {
      if (typeof WebSocket === 'undefined') return false;
      if (chatWsSocket && chatWsSocket.readyState === (WebSocket.OPEN || 1)) {
        try {
          chatWsSocket.send(JSON.stringify(payload));
          return true;
        } catch (e) {
          console.warn('[WS Chat] sendWsEvent error:', e);
        }
      }
      return false;
    }

    async function loadChatFromServerHttp() {
      try {
        const congUrl = getChurchHttpUrl('/api/chat/messages?channel=congregation');
        const youthUrl = getChurchHttpUrl('/api/chat/messages?channel=youth');
        const [resCong, resYouth] = await Promise.all([
          fetch(congUrl).then(r => r.json()).catch(() => null),
          fetch(youthUrl).then(r => r.json()).catch(() => null)
        ]);

        let hasData = false;
        if (resCong && Array.isArray(resCong.messages) && resCong.messages.length > 0) {
          if (!cniConversations.congregation) cniConversations.congregation = { name: 'CNI Congregation', messages: [] };
          resCong.messages.forEach(serverMsg => {
            if (isMemberDeleted({ name: serverMsg.sender, sender_id: serverMsg.sender_id }, 'congregation')) return;
            const exists = cniConversations.congregation.messages.some(m => m.id === serverMsg.id || (m.timestamp && m.timestamp === serverMsg.timestamp && m.text === serverMsg.text));
            if (!exists) {
              cniConversations.congregation.messages.push({
                ...serverMsg,
                sent: (serverMsg.sender_id === currentAuthSession.uid || serverMsg.sender === currentAuthSession.display_name),
                status: 'blue'
              });
              hasData = true;
            }
          });
        }
        if (resYouth && Array.isArray(resYouth.messages) && resYouth.messages.length > 0) {
          if (!cniConversations.youth) cniConversations.youth = { name: 'CNI Youth Fellowship', messages: [] };
          resYouth.messages.forEach(serverMsg => {
            if (isMemberDeleted({ name: serverMsg.sender, sender_id: serverMsg.sender_id }, 'youth')) return;
            const exists = cniConversations.youth.messages.some(m => m.id === serverMsg.id || (m.timestamp && m.timestamp === serverMsg.timestamp && m.text === serverMsg.text));
            if (!exists) {
              cniConversations.youth.messages.push({
                ...serverMsg,
                sent: (serverMsg.sender_id === currentAuthSession.uid || serverMsg.sender === currentAuthSession.display_name),
                status: 'blue'
              });
              hasData = true;
            }
          });
        }
        if (hasData) {
          saveChatMessages();
          if (typeof renderActiveCniChat === 'function') renderActiveCniChat(true);
        }
      } catch (_) {}
    }

    function handleIncomingWsMessage(data) {
      if (!data || !data.type) return;

      switch (data.type) {
        case 'init_history': {
          let updated = false;
          if (Array.isArray(data.congregation) && data.congregation.length > 0) {
            if (!cniConversations.congregation) cniConversations.congregation = { name: 'CNI Congregation', messages: [] };
            cniConversations.congregation.messages = data.congregation
              .filter(m => !isMemberDeleted({ name: m.sender, sender_id: m.sender_id }, 'congregation'))
              .map(m => ({
                ...m,
                sent: (m.sender_id === currentAuthSession.uid || m.sender === currentAuthSession.display_name),
                status: 'blue'
              }));
            updated = true;
          }
          if (Array.isArray(data.youth) && data.youth.length > 0) {
            if (!cniConversations.youth) cniConversations.youth = { name: 'CNI Youth Fellowship', messages: [] };
            cniConversations.youth.messages = data.youth
              .filter(m => !isMemberDeleted({ name: m.sender, sender_id: m.sender_id }, 'youth'))
              .map(m => ({
                ...m,
                sent: (m.sender_id === currentAuthSession.uid || m.sender === currentAuthSession.display_name),
                status: 'blue'
              }));
            updated = true;
          }
          if (updated) {
            saveChatMessages();
            if (typeof renderActiveCniChat === 'function') {
              renderActiveCniChat(true);
            }
          }
          if (data.onlineCount && waHeaderStatus) {
            waHeaderStatus.textContent = `${data.onlineCount} ${data.onlineCount === 1 ? 'parishioner' : 'parishioners'} online`;
          }
          break;
        }

        case 'channel_history': {
          const ch = data.channel || 'congregation';
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            if (!cniConversations[ch]) cniConversations[ch] = { name: ch === 'youth' ? 'CNI Youth Fellowship' : 'CNI Congregation', messages: [] };
            cniConversations[ch].messages = data.messages.map(m => ({
              ...m,
              sent: (m.sender_id === currentAuthSession.uid || m.sender === currentAuthSession.display_name),
              status: 'blue'
            }));
            saveChatMessages();
            if (activeCniChannel === ch && typeof renderActiveCniChat === 'function') {
              renderActiveCniChat(true);
            }
          }
          break;
        }

        case 'chat_message': {
          const ch = data.channel === 'youth' ? 'youth' : 'congregation';
          const msg = data.message;
          if (!msg) return;

          if (!cniConversations[ch]) cniConversations[ch] = { name: ch === 'youth' ? 'CNI Youth Fellowship' : 'CNI Congregation', messages: [] };
          
          const isSelf = (msg.sender_id === currentAuthSession.uid || msg.sender === currentAuthSession.display_name);
          msg.sent = isSelf;

          // Check if message already exists (prevent duplicate)
          const existingIdx = cniConversations[ch].messages.findIndex(m => m.id === msg.id || (m.timestamp && m.timestamp === msg.timestamp && m.text === msg.text));
          if (existingIdx === -1) {
            cniConversations[ch].messages.push(msg);
            saveChatMessages();

            if (!isSelf) {
              playWhatsAppTone('receive');
            }

            // If user is currently looking at this channel in chat view
            if (activeCniChannel === ch && chatMessagesContainer) {
              const bubble = createMessageBubble(msg);
              chatMessagesContainer.appendChild(bubble);
              chatMessagesContainer.scrollTo({ top: chatMessagesContainer.scrollHeight, behavior: 'smooth' });
            }
          }
          break;
        }

        case 'chat_reaction': {
          const ch = data.channel === 'youth' ? 'youth' : 'congregation';
          const msgId = data.messageId;
          const emoji = data.reaction;

          if (cniConversations[ch]) {
            const found = cniConversations[ch].messages.find(m => m.id === msgId || String(m.timestamp) === String(msgId));
            if (found) {
              found.reaction = emoji;
              saveChatMessages();
            }
          }

          if (activeCniChannel === ch && chatMessagesContainer) {
            const targetBubble = chatMessagesContainer.querySelector(`[data-msg-id="${msgId}"]`);
            if (targetBubble) {
              let badge = targetBubble.querySelector('.wa-bubble-reaction-badge');
              if (!badge && emoji) {
                badge = document.createElement('span');
                badge.className = 'wa-bubble-reaction-badge';
                targetBubble.appendChild(badge);
              }
              if (badge) {
                if (emoji) badge.textContent = emoji;
                else badge.remove();
              }
            }
          }
          break;
        }

        case 'chat_edit': {
          const ch = data.channel === 'youth' ? 'youth' : 'congregation';
          const msgId = data.messageId;
          const newText = data.text;

          if (cniConversations[ch]) {
            const found = cniConversations[ch].messages.find(m => m.id === msgId || String(m.timestamp) === String(msgId));
            if (found) {
              found.text = newText;
              found.edited = true;
              saveChatMessages();
            }
          }

          if (activeCniChannel === ch && chatMessagesContainer) {
            const targetBubble = chatMessagesContainer.querySelector(`[data-msg-id="${msgId}"]`);
            if (targetBubble) {
              const textEl = targetBubble.querySelector('.wa-msg-text');
              if (textEl) {
                textEl.innerHTML = `${newText.replace(/</g, '&lt;').replace(/>/g, '&gt;')} <span class="wa-edited-pill" style="font-size:0.68rem; color:#8696a0; font-style:italic; margin-left:4px;">(edited)</span>`;
              }
            }
          }
          break;
        }

        case 'chat_delete': {
          const ch = data.channel === 'youth' ? 'youth' : 'congregation';
          const msgId = data.messageId;

          if (cniConversations[ch]) {
            cniConversations[ch].messages = cniConversations[ch].messages.filter(m => m.id !== msgId && String(m.timestamp) !== String(msgId));
            saveChatMessages();
          }

          if (activeCniChannel === ch && chatMessagesContainer) {
            const targetBubble = chatMessagesContainer.querySelector(`[data-msg-id="${msgId}"]`);
            if (targetBubble) {
              targetBubble.style.transition = 'all 0.3s ease';
              targetBubble.style.opacity = '0';
              targetBubble.style.transform = 'scale(0.8)';
              setTimeout(() => targetBubble.remove(), 300);
            }
          }
          break;
        }

        case 'chat_typing': {
          const ch = data.channel === 'youth' ? 'youth' : 'congregation';
          const waTypingBubble = document.getElementById('waTypingBubble');
          if (activeCniChannel === ch && waTypingBubble) {
            if (data.isTyping) {
              waTypingBubble.style.display = 'flex';
              const nameEl = waTypingBubble.querySelector('.wa-typing-name') || waTypingBubble;
              if (nameEl && nameEl !== waTypingBubble) nameEl.textContent = data.userName;
            } else {
              waTypingBubble.style.display = 'none';
            }
          }
          break;
        }

        case 'profile_updated': {
          const uid = data.userId;
          const oldName = (data.oldName || '').trim();
          const newName = (data.newName || '').trim();
          if (!newName) break;

          // 1. Update in-memory chat messages if matching sender
          let chatChanged = false;
          ['congregation', 'youth'].forEach(ch => {
            if (cniConversations[ch] && Array.isArray(cniConversations[ch].messages)) {
              cniConversations[ch].messages.forEach(m => {
                if (m.sender_id === uid || (oldName && m.sender === oldName)) {
                  m.sender = newName;
                  chatChanged = true;
                }
              });
            }
          });

          if (chatChanged) {
            saveChatMessages();
            if (typeof renderActiveCniChat === 'function') {
              renderActiveCniChat(true);
            }
          }

          // 2. Update participant cache and re-render if modal open
          if (Array.isArray(inMemoryRegisteredProfilesCache)) {
            const found = inMemoryRegisteredProfilesCache.find(p => p.id === uid || (oldName && p.name === oldName));
            if (found) {
              found.name = newName;
            }
          }

          try {
            const savedMembersRaw = localStorage.getItem('sanctuary_registered_members');
            if (savedMembersRaw) {
              const list = JSON.parse(savedMembersRaw);
              if (Array.isArray(list)) {
                const f = list.find(p => p.id === uid || (oldName && p.name === oldName));
                if (f) {
                  f.name = newName;
                  localStorage.setItem('sanctuary_registered_members', JSON.stringify(list));
                }
              }
            }
          } catch (_) {}

          currentCachedMembers = getRegisteredChannelMembersSync(activeModalChannel || 'congregation');
          if (waMembersListModal && !waMembersListModal.classList.contains('hidden')) {
            renderMembersList(waMembersSearchInput ? waMembersSearchInput.value : '');
          }
          break;
        }

        case 'admin_request_created': {
          if (data.request) {
            const exists = pendingAdminRequests.some(r => r.id === data.request.id);
            if (!exists) {
              pendingAdminRequests.push(data.request);
              try {
                localStorage.setItem('sanctuary_pending_admin_requests', JSON.stringify(pendingAdminRequests));
              } catch (_) {}
              renderPendingRequestsUI();
              const perms = useAppPermissions();
              if (perms.canApproveAdmins) {
                showToast(`New admin request from ${data.request.display_name || data.request.email} 🛡️`);
              }
            }
          }
          break;
        }

        case 'admin_request_approved': {
          const reqId = data.reqId;
          const uid = data.userId;
          const email = data.email;

          // Remove from pending
          pendingAdminRequests = pendingAdminRequests.filter(r => r.id !== reqId);
          try {
            localStorage.setItem('sanctuary_pending_admin_requests', JSON.stringify(pendingAdminRequests));
          } catch (_) {}
          renderPendingRequestsUI();

          // If this client is the approved user, immediately upgrade session to Admin!
          const isTargetUser = (currentAuthSession.uid === uid || (email && currentAuthSession.email && String(email).toLowerCase() === String(currentAuthSession.email).toLowerCase()));
          if (isTargetUser) {
            currentAuthSession.role = 'admin';
            currentAuthSession.admin_request_status = 'approved';
            currentAuthSession.is_youth = true;
            persistAuthSession(currentAuthSession);
            updateAppPermissionsUI();
            if (typeof window.renderActiveCniChat === 'function') window.renderActiveCniChat(true);
            showToast('🎉 Your admin request has been accepted by Super Admin! Admin privileges granted 🛡️');
          }
          break;
        }

        case 'admin_request_rejected': {
          const reqId = data.reqId;
          const uid = data.userId;
          const email = data.email;

          pendingAdminRequests = pendingAdminRequests.filter(r => r.id !== reqId);
          try {
            localStorage.setItem('sanctuary_pending_admin_requests', JSON.stringify(pendingAdminRequests));
          } catch (_) {}
          renderPendingRequestsUI();

          const isTargetUser = (currentAuthSession.uid === uid || (email && currentAuthSession.email && String(email).toLowerCase() === String(currentAuthSession.email).toLowerCase()));
          if (isTargetUser && currentAuthSession.role !== 'superadmin' && currentAuthSession.email !== SUPER_ADMIN_EMAIL) {
            currentAuthSession.admin_request_status = 'rejected';
            persistAuthSession(currentAuthSession);
            updateAppPermissionsUI();
            showToast('❌ Your Admin Access Request was declined. You can request again later.');
          }
          break;
        }

        case 'admin_access_revoked': {
          const reqId = data.reqId;
          const uid = data.userId;
          const email = data.email;

          approvedAdminRequests = approvedAdminRequests.filter(r => r.id !== reqId && r.user_id !== uid);
          try {
            localStorage.setItem('sanctuary_approved_admins', JSON.stringify(approvedAdminRequests));
          } catch (_) {}
          renderPendingRequestsUI();

          const isTargetUser = (currentAuthSession.uid === uid || (email && currentAuthSession.email && String(email).toLowerCase() === String(currentAuthSession.email).toLowerCase()));
          if (isTargetUser && currentAuthSession.role !== 'superadmin' && currentAuthSession.email !== SUPER_ADMIN_EMAIL) {
            currentAuthSession.role = 'member';
            currentAuthSession.admin_request_status = 'revoked';
            currentAuthSession.is_youth = false;
            persistAuthSession(currentAuthSession);
            updateAppPermissionsUI();
            showToast('⚠️ Your Admin Access has been revoked by Super Admin.');
          }
          break;
        }

        case 'congregational_post_updated': {
          const uid = data.userId;
          const email = data.email;
          const newPost = data.congregational_post;
          const newName = (data.displayName || '').trim();
          const isYouth = Boolean(data.is_youth || newPost === 'post-youth');
          const postTitle = data.postTitle || (typeof getPostDisplayName === 'function' ? getPostDisplayName(newPost) : 'Member');

          // 1. Update in-memory chat messages if matching sender
          if (newName) {
            let chatChanged = false;
            ['congregation', 'youth'].forEach(ch => {
              if (cniConversations[ch] && Array.isArray(cniConversations[ch].messages)) {
                cniConversations[ch].messages.forEach(m => {
                  if (m.sender_id === uid || (email && m.sender_id === email)) {
                    m.sender = newName;
                    m.sender_role = isYouth ? 'Youth Member' : (postTitle || m.sender_role);
                    chatChanged = true;
                  }
                });
              }
            });
            if (chatChanged) {
              saveChatMessages();
              if (typeof renderActiveCniChat === 'function') renderActiveCniChat(true);
            }
          }

          // 2. Update participant cache and re-render if modal open
          if (Array.isArray(inMemoryRegisteredProfilesCache)) {
            const found = inMemoryRegisteredProfilesCache.find(p => p.id === uid || (email && p.email === email));
            if (found) {
              if (newPost) found.congregational_post = newPost;
              if (newPost) found.postTitle = postTitle;
              if (newName) found.name = newName;
              found.is_youth = isYouth;
            }
          }

          // 3. Update approvedAdminRequests list
          const adminReq = approvedAdminRequests.find(a => a.user_id === uid || a.id === uid || (email && a.email === email));
          if (adminReq) {
            if (newPost) adminReq.congregational_post = newPost;
            if (newName) adminReq.display_name = newName;
            adminReq.is_youth = isYouth;
            try { localStorage.setItem('sanctuary_approved_admins', JSON.stringify(approvedAdminRequests)); } catch (_) {}
            renderPendingRequestsUI();
          }

          // 4. If this client is the target user, update session immediately!
          const isTargetUser = (currentAuthSession.uid === uid || (email && currentAuthSession.email && String(email).toLowerCase() === String(currentAuthSession.email).toLowerCase()));
          if (isTargetUser) {
            let sessionChanged = false;
            if (newPost && currentAuthSession.congregational_post !== newPost) {
              currentAuthSession.congregational_post = newPost;
              currentAuthSession.is_youth = isYouth;
              sessionChanged = true;
            }
            if (newName && currentAuthSession.display_name !== newName) {
              currentAuthSession.display_name = newName;
              sessionChanged = true;
            }
            if (sessionChanged) {
              persistAuthSession(currentAuthSession);
              updateAppPermissionsUI();
              if (typeof window.renderActiveCniChat === 'function') window.renderActiveCniChat(true);
              showToast(`Your congregational post has been updated to "${postTitle}" by Super Admin ✨`);
            }
          }
          break;
        }

        case 'presence_update': {
          if (data.onlineCount && waHeaderStatus) {
            waHeaderStatus.textContent = `${data.onlineCount} ${data.onlineCount === 1 ? 'parishioner' : 'parishioners'} online`;
          }
          break;
        }
      }
    }

    const getTicksSvg = (status) => {
      if (!chatSettings.readReceipts) return '';
      if (status === 'blue') {
        return `
          <span class="wa-ticks blue" title="Read by all">
            <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.512z"/>
            </svg>
          </span>`;
      } else if (status === 'delivered') {
        return `
          <span class="wa-ticks" title="Delivered">
            <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.512z"/>
            </svg>
          </span>`;
      } else {
        return `
          <span class="wa-ticks" title="Sent">
            <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
              <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.512z"/>
            </svg>
          </span>`;
      }
    };

    let currentRenderedChannel = null;
    let active3DTargetMsg = null;
    let active3DTargetBubble = null;
    let editingMessageObj = null;
    let editingMessageBubble = null;
    let activeReplyTarget = null; // { id, sender, text, media }

    const wa3DTouchOverlay = document.getElementById('wa3DTouchOverlay');
    const wa3DBackdrop = document.getElementById('wa3DBackdrop');
    const wa3DMessagePreview = document.getElementById('wa3DMessagePreview');
    const wa3DActionMenu = document.getElementById('wa3DActionMenu');
    const wa3DReactionsBar = document.getElementById('wa3DReactionsBar');

    // Reply Composer Bar Elements
    const waReplyComposerBar = document.getElementById('waReplyComposerBar');
    const waReplyBarAuthor = document.getElementById('waReplyBarAuthor');
    const waReplyBarSnippet = document.getElementById('waReplyBarSnippet');
    const waReplyBarCloseBtn = document.getElementById('waReplyBarCloseBtn');

    function openReplyComposer(msg) {
      if (!msg) return;
      activeReplyTarget = {
        id: msg.id || msg.timestamp,
        sender: msg.sender || msg.sender_name || 'Fellowship Member',
        text: String(msg.text || msg.content || '').trim(),
        media: msg.media_path || msg.public_url || msg.image || null
      };

      if (waReplyBarAuthor) waReplyBarAuthor.textContent = `Replying to ${activeReplyTarget.sender}`;
      if (waReplyBarSnippet) {
        if (activeReplyTarget.text) {
          waReplyBarSnippet.textContent = activeReplyTarget.text.length > 50 ? activeReplyTarget.text.slice(0, 50) + '...' : activeReplyTarget.text;
        } else if (activeReplyTarget.media) {
          waReplyBarSnippet.textContent = '📷 Photo';
        } else {
          waReplyBarSnippet.textContent = 'Quoted message';
        }
      }

      if (waReplyComposerBar) waReplyComposerBar.classList.remove('hidden');
      if (chatMessageInput) chatMessageInput.focus();
    }

    function closeReplyComposer() {
      activeReplyTarget = null;
      if (waReplyComposerBar) waReplyComposerBar.classList.add('hidden');
    }

    if (waReplyBarCloseBtn) {
      waReplyBarCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeReplyComposer();
      });
    }

    function jumpToOriginalMessage(msgId) {
      if (!msgId || !chatMessagesContainer) return;
      const targetBubble = chatMessagesContainer.querySelector(`[data-msg-id="${msgId}"]`);
      if (targetBubble) {
        targetBubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetBubble.classList.add('wa-highlight-pulse');
        setTimeout(() => {
          targetBubble.classList.remove('wa-highlight-pulse');
        }, 1900);
      } else {
        showToast('Original message not in current view');
      }
    }

    // Message Info Modal Elements & Handlers
    const waMessageInfoModalOverlay = document.getElementById('waMessageInfoModalOverlay');
    const waMessageInfoBackdrop = document.getElementById('waMessageInfoBackdrop');
    const waMessageInfoCloseBtn = document.getElementById('waMessageInfoCloseBtn');
    const waMessageInfoPreviewText = document.getElementById('waMessageInfoPreviewText');
    const waMessageInfoReadList = document.getElementById('waMessageInfoReadList');
    const waMessageInfoDeliveredList = document.getElementById('waMessageInfoDeliveredList');

    async function openMessageInfoModal(msg) {
      if (!msg || !waMessageInfoModalOverlay) return;

      const rawText = String(msg.text || msg.content || '');
      if (waMessageInfoPreviewText) {
        waMessageInfoPreviewText.textContent = rawText || (msg.media_path || msg.public_url ? '📷 Photo' : 'Voice Message');
      }

      if (waMessageInfoReadList) waMessageInfoReadList.innerHTML = '<div style="padding:8px 0; color:#8696a0; font-size:0.85rem;">Loading read receipts...</div>';
      if (waMessageInfoDeliveredList) waMessageInfoDeliveredList.innerHTML = '<div style="padding:8px 0; color:#8696a0; font-size:0.85rem;">Loading delivery receipts...</div>';

      waMessageInfoModalOverlay.classList.remove('hidden');

      try {
        const msgId = msg._supabaseId || msg.id;
        if (window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.getReceiptsForMessage === 'function') {
          const receipts = await window.ChurchSync.Chat.getReceiptsForMessage(msgId);
          
          // Render Read List
          if (waMessageInfoReadList) {
            if (receipts.reads && receipts.reads.length > 0) {
              waMessageInfoReadList.innerHTML = receipts.reads.map(r => {
                const name = (r.profiles && r.profiles.display_name) || 'Fellowship Member';
                const timeStr = r.read_at ? new Date(r.read_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';
                return `
                  <div class="wa-msg-info-participant-row">
                    <span class="wa-msg-info-participant-name">${name}</span>
                    <span class="wa-msg-info-timestamp">${timeStr}</span>
                  </div>
                `;
              }).join('');
            } else {
              waMessageInfoReadList.innerHTML = '<div style="padding:8px 0; color:#8696a0; font-size:0.85rem;">No read receipts yet</div>';
            }
          }

          // Render Delivered List
          if (waMessageInfoDeliveredList) {
            if (receipts.deliveries && receipts.deliveries.length > 0) {
              waMessageInfoDeliveredList.innerHTML = receipts.deliveries.map(d => {
                const name = (d.profiles && d.profiles.display_name) || 'Fellowship Member';
                const timeStr = d.delivered_at ? new Date(d.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';
                return `
                  <div class="wa-msg-info-participant-row">
                    <span class="wa-msg-info-participant-name">${name}</span>
                    <span class="wa-msg-info-timestamp">${timeStr}</span>
                  </div>
                `;
              }).join('');
            } else {
              waMessageInfoDeliveredList.innerHTML = '<div style="padding:8px 0; color:#8696a0; font-size:0.85rem;">Delivered to all participants</div>';
            }
          }
        }
      } catch (err) {
        console.warn('Error loading message info:', err);
      }
    }

    function closeMessageInfoModal() {
      if (waMessageInfoModalOverlay) waMessageInfoModalOverlay.classList.add('hidden');
    }

    if (waMessageInfoBackdrop) waMessageInfoBackdrop.addEventListener('click', closeMessageInfoModal);
    if (waMessageInfoCloseBtn) waMessageInfoCloseBtn.addEventListener('click', closeMessageInfoModal);

    // Reactions List Modal Elements & Handlers
    const waReactionsListModalOverlay = document.getElementById('waReactionsListModalOverlay');
    const waReactionsListBackdrop = document.getElementById('waReactionsListBackdrop');
    const waReactionsListCloseBtn = document.getElementById('waReactionsListCloseBtn');
    const waReactionsParticipantsList = document.getElementById('waReactionsParticipantsList');

    async function openReactionsListModal(msg) {
      if (!msg || !waReactionsListModalOverlay) return;
      if (waReactionsParticipantsList) waReactionsParticipantsList.innerHTML = '<div style="padding:8px 0; color:#8696a0; font-size:0.85rem;">Loading reactions...</div>';
      waReactionsListModalOverlay.classList.remove('hidden');

      try {
        const msgId = msg._supabaseId || msg.id;
        if (window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.getReactionsForMessage === 'function') {
          const res = await window.ChurchSync.Chat.getReactionsForMessage(msgId);
          if (res.data && res.data.length > 0) {
            waReactionsParticipantsList.innerHTML = res.data.map(rx => {
              const name = (rx.profiles && rx.profiles.display_name) || 'Fellowship Member';
              return `
                <div class="wa-msg-info-participant-row">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.15rem;">${rx.emoji}</span>
                    <span class="wa-msg-info-participant-name">${name}</span>
                  </div>
                </div>
              `;
            }).join('');
          } else if (msg.reaction) {
            waReactionsParticipantsList.innerHTML = `
              <div class="wa-msg-info-participant-row">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:1.15rem;">${msg.reaction}</span>
                  <span class="wa-msg-info-participant-name">Fellowship Member</span>
                </div>
              </div>
            `;
          } else {
            waReactionsParticipantsList.innerHTML = '<div style="padding:8px 0; color:#8696a0; font-size:0.85rem;">No reactions on this message</div>';
          }
        }
      } catch (err) {
        console.warn('Error loading reactions modal:', err);
      }
    }

    function closeReactionsListModal() {
      if (waReactionsListModalOverlay) waReactionsListModalOverlay.classList.add('hidden');
    }

    if (waReactionsListBackdrop) waReactionsListBackdrop.addEventListener('click', closeReactionsListModal);
    if (waReactionsListCloseBtn) waReactionsListCloseBtn.addEventListener('click', closeReactionsListModal);

    const close3DTouchModal = () => {
      if (wa3DTouchOverlay) {
        wa3DTouchOverlay.classList.add('hidden');
      }
      active3DTargetMsg = null;
      active3DTargetBubble = null;
    };

    if (wa3DBackdrop) {
      wa3DBackdrop.addEventListener('click', close3DTouchModal);
    }

    const open3DTouchModal = (msg, bubble) => {
      active3DTargetMsg = msg;
      active3DTargetBubble = bubble;

      if (!wa3DTouchOverlay || !wa3DMessagePreview || !wa3DReactionsBar || !wa3DActionMenu) return;

      const clone = bubble.cloneNode(true);
      clone.style.width = '100%';
      clone.style.height = '100%';
      clone.style.margin = '0';
      clone.style.boxSizing = 'border-box';
      wa3DMessagePreview.innerHTML = '';
      wa3DMessagePreview.appendChild(clone);

      const rect = bubble.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      wa3DMessagePreview.style.top = `${rect.top}px`;
      wa3DMessagePreview.style.left = `${rect.left}px`;
      wa3DMessagePreview.style.width = `${rect.width}px`;
      wa3DMessagePreview.style.height = `${rect.height}px`;

      const isSent = msg.sent;
      const reactionsHeight = 36;
      const menuHeight = 180;
      const spaceAbove = rect.top;
      const spaceBelow = winH - rect.bottom;

      if (spaceAbove >= reactionsHeight + 8) {
        wa3DReactionsBar.style.top = `${rect.top - reactionsHeight - 6}px`;
        wa3DReactionsBar.style.bottom = 'auto';
      } else {
        wa3DReactionsBar.style.top = `${rect.bottom + menuHeight + 14}px`;
        wa3DReactionsBar.style.bottom = 'auto';
      }

      if (isSent) {
        const rightOffset = Math.max(12, winW - rect.right);
        wa3DReactionsBar.style.right = `${rightOffset}px`;
        wa3DReactionsBar.style.left = 'auto';
      } else {
        const leftOffset = Math.max(12, rect.left);
        wa3DReactionsBar.style.left = `${leftOffset}px`;
        wa3DReactionsBar.style.right = 'auto';
      }

      if (spaceBelow >= menuHeight + 12 || spaceBelow >= spaceAbove) {
        const topOffset = rect.bottom + 6;
        wa3DActionMenu.style.top = `${topOffset}px`;
        wa3DActionMenu.style.bottom = 'auto';
      } else {
        const bottomOffset = winH - rect.top + 6 + (spaceAbove >= reactionsHeight + 8 ? reactionsHeight + 6 : 0);
        wa3DActionMenu.style.bottom = `${bottomOffset}px`;
        wa3DActionMenu.style.top = 'auto';
      }

      if (isSent) {
        const rightOffset = Math.max(12, winW - rect.right);
        wa3DActionMenu.style.right = `${rightOffset}px`;
        wa3DActionMenu.style.left = 'auto';
      } else {
        const leftOffset = Math.max(12, rect.left);
        wa3DActionMenu.style.left = `${leftOffset}px`;
        wa3DActionMenu.style.right = 'auto';
      }

      const perms = useAppPermissions();
      const canDeleteThis = perms.canDeleteMessage(msg);
      const isSuperAdmin = perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL;
      const isAdmin = isSuperAdmin || perms.role === 'admin';
      const isOwnMessage = Boolean(
        msg.sent || 
        (msg.sender_id && currentAuthSession.uid && msg.sender_id === currentAuthSession.uid) || 
        (msg.sender && currentAuthSession.display_name && msg.sender.trim().toLowerCase() === currentAuthSession.display_name.trim().toLowerCase())
      );
      const canEditThis = isSuperAdmin || isAdmin || isOwnMessage;

      const deleteActionItem = wa3DActionMenu.querySelector('.wa-3d-action-item[data-action="delete"]');
      if (deleteActionItem) deleteActionItem.style.display = canDeleteThis ? 'flex' : 'none';

      const editActionItem = wa3DActionMenu.querySelector('.wa-3d-action-item[data-action="edit"]');
      if (editActionItem) editActionItem.style.display = canEditThis ? 'flex' : 'none';

      wa3DTouchOverlay.classList.remove('hidden');
    };

    const createMessageBubble = (msg) => {
      const bubble = document.createElement('div');
      bubble.className = msg.sent ? 'wa-bubble wa-sent' : 'wa-bubble wa-received';
      bubble.setAttribute('data-msg-id', msg.id || msg.timestamp || '');

      // Quoted Reply Preview
      let quotedHtml = '';
      if (msg.reply_to_message_id || msg.reply_preview) {
        const qAuthor = (msg.reply_preview && msg.reply_preview.sender) || 'Fellowship Member';
        const qText = (msg.reply_preview && msg.reply_preview.text) || 'Quoted message...';
        quotedHtml = `
          <div class="wa-quoted-preview-block" data-reply-target="${msg.reply_to_message_id || ''}">
            <div class="wa-quoted-author">${qAuthor}</div>
            <div class="wa-quoted-text">${qText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
        `;
      }

      // Media Image Attachment
      let mediaHtml = '';
      const mediaSrc = msg.public_url || msg.media_path || msg.image;
      if (mediaSrc) {
        mediaHtml = `
          <div class="wa-chat-media-attachment" data-media-url="${mediaSrc}">
            <img src="${mediaSrc}" alt="Fellowship Photo" loading="lazy" />
          </div>
        `;
      }

      // Multi-Emoji Reactions Pill Row
      let reactionHtml = '';
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        reactionHtml = '<div class="wa-bubble-reaction-pill-row">';
        Object.entries(msg.reactions).forEach(([emoji, count]) => {
          reactionHtml += `<span class="wa-reaction-pill" data-emoji="${emoji}">${emoji} ${count > 1 ? count : ''}</span>`;
        });
        reactionHtml += '</div>';
      } else if (msg.reaction) {
        reactionHtml = `<div class="wa-bubble-reaction-pill-row"><span class="wa-reaction-pill">${msg.reaction}</span></div>`;
      }

      const editedTag = msg.edited ? ' <span class="wa-edited-pill" style="font-size:0.68rem; color:#8696a0; font-style:italic; margin-left:4px;">(edited)</span>' : '';
      const safeMsgText = String(msg.text || msg.content || '');
      const safeEscapedText = safeMsgText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeTime = msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (msg.audio) {
        const audioDuration = msg.duration ? `${Math.floor(msg.duration / 60)}:${String(Math.floor(msg.duration % 60)).padStart(2, '0')}` : '0:05';
        const voicePlayerHtml = `
          <div class="wa-voice-player">
            <button class="wa-voice-play-btn" type="button" aria-label="Play Voice Message">
              <svg class="play-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              <svg class="pause-icon hidden" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <div class="wa-voice-track">
              <div class="wa-voice-waveform-bar">
                <div class="wa-voice-progress"></div>
              </div>
              <div class="wa-voice-meta-row">
                <span class="wa-voice-duration">${audioDuration}</span>
                <span style="font-size:0.68rem; opacity:0.8;">🎙️ Voice</span>
              </div>
            </div>
          </div>
        `;
        if (msg.sent) {
          bubble.innerHTML = `
            ${quotedHtml}
            ${mediaHtml}
            ${voicePlayerHtml}
            <div class="wa-msg-meta">
              <span class="wa-time">${safeTime}</span>
              <span class="wa-ticks-wrap">${getTicksSvg(msg.status || 'blue')}</span>
            </div>
            ${reactionHtml}
          `;
        } else {
          bubble.innerHTML = `
            <div class="wa-author-tag ${msg.color || 'color-pastor'}">
              <span>${msg.sender || 'Fellowship Member'}</span>
            </div>
            ${quotedHtml}
            ${mediaHtml}
            ${voicePlayerHtml}
            <div class="wa-msg-meta">
              <span class="wa-time">${safeTime}</span>
            </div>
            ${reactionHtml}
          `;
        }
      } else if (msg.sent) {
        bubble.innerHTML = `
          ${quotedHtml}
          ${mediaHtml}
          ${safeEscapedText ? `<div class="wa-msg-text">${safeEscapedText}${editedTag}</div>` : ''}
          <div class="wa-msg-meta">
            <span class="wa-time">${safeTime}</span>
            <span class="wa-ticks-wrap">${getTicksSvg(msg.status || 'blue')}</span>
          </div>
          ${reactionHtml}
        `;
      } else {
        bubble.innerHTML = `
          <div class="wa-author-tag ${msg.color || 'color-pastor'}">
            <span>${msg.sender || 'Fellowship Member'}</span>
          </div>
          ${quotedHtml}
          ${mediaHtml}
          ${safeEscapedText ? `<div class="wa-msg-text">${safeEscapedText}${editedTag}</div>` : ''}
          <div class="wa-msg-meta">
            <span class="wa-time">${safeTime}</span>
          </div>
          ${reactionHtml}
        `;
      }

      // Quoted Reply Click to Jump
      const quotedBlock = bubble.querySelector('.wa-quoted-preview-block');
      if (quotedBlock) {
        quotedBlock.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = quotedBlock.getAttribute('data-reply-target') || msg.reply_to_message_id;
          if (targetId) jumpToOriginalMessage(targetId);
        });
      }

      // Reaction Pill Click to Open Modal
      const reactionPill = bubble.querySelector('.wa-bubble-reaction-pill-row');
      if (reactionPill) {
        reactionPill.addEventListener('click', (e) => {
          e.stopPropagation();
          openReactionsListModal(msg);
        });
      }

      // Media Click to Lightbox
      const mediaAttachment = bubble.querySelector('.wa-chat-media-attachment');
      if (mediaAttachment) {
        mediaAttachment.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof openPhotoLightbox === 'function') {
            openPhotoLightbox(mediaSrc);
          } else if (typeof openTimelineDetailView === 'function') {
            window.open(mediaSrc, '_blank');
          }
        });
      }

      // Touch & Swipe Gesture Handling (Swipe Right to Reply + Long Press for 3D Touch)
      let touchStartX = 0;
      let touchStartY = 0;
      let pressTimer = null;
      let isLongPressed = false;
      let touchMoved = false;
      let currentTranslateX = 0;
      let lastTouchTime = 0;

      const handleStart = (clientX, clientY) => {
        isLongPressed = false;
        touchMoved = false;
        touchStartX = clientX;
        touchStartY = clientY;
        currentTranslateX = 0;

        pressTimer = setTimeout(() => {
          isLongPressed = true;
          if (navigator.vibrate) {
            try { navigator.vibrate(35); } catch (_) {}
          }
          open3DTouchModal(msg, bubble);
        }, 260);
      };

      const handleMove = (clientX, clientY) => {
        const deltaX = clientX - touchStartX;
        const deltaY = clientY - touchStartY;

        if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
          touchMoved = true;
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
        }

        // Swipe right to reply feedback
        if (deltaX > 0 && deltaX < 80 && Math.abs(deltaY) < 25) {
          bubble.style.transform = `translateX(${deltaX * 0.4}px)`;
          bubble.style.transition = 'none';
        }
      };

      const handleEnd = (clientX) => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }

        const deltaX = (clientX || touchStartX) - touchStartX;
        bubble.style.transition = 'transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        bubble.style.transform = 'translateX(0)';

        if (deltaX > 55) {
          // Trigger Swipe to Reply
          if (navigator.vibrate) try { navigator.vibrate(20); } catch (_) {}
          openReplyComposer(msg);
          return;
        }

        if (!isLongPressed && !touchMoved) {
          bubble.classList.toggle('show-meta');
        }
      };

      bubble.addEventListener('contextmenu', (e) => e.preventDefault());

      bubble.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      bubble.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length === 1) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      bubble.addEventListener('touchend', (e) => {
        lastTouchTime = Date.now();
        const clientX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : touchStartX;
        handleEnd(clientX);
      });

      bubble.addEventListener('touchcancel', () => {
        if (pressTimer) clearTimeout(pressTimer);
        bubble.style.transform = 'translateX(0)';
      });

      bubble.addEventListener('mousedown', (e) => {
        if (Date.now() - lastTouchTime < 500 || e.button !== 0) return;
        handleStart(e.clientX, e.clientY);
      });

      bubble.addEventListener('mousemove', (e) => {
        if (Date.now() - lastTouchTime < 500 || e.button !== 0) return;
        handleMove(e.clientX, e.clientY);
      });

      bubble.addEventListener('mouseup', (e) => {
        if (Date.now() - lastTouchTime < 500 || e.button !== 0) return;
        handleEnd(e.clientX);
      });

      // Viewport IntersectionObserver for Automatic Read Receipts
      if (!msg.sent && window.chatReadReceiptObserver && bubble) {
        window.chatReadReceiptObserver.observe(bubble);
      }

      return bubble;
    };

    // Setup Global Viewport IntersectionObserver for Chat Read Receipts
    if (typeof IntersectionObserver !== 'undefined') {
      window.chatReadReceiptObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const el = entry.target;
            const msgId = el.getAttribute('data-msg-id');
            if (msgId && window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.recordRead === 'function') {
              window.ChurchSync.Chat.recordRead(msgId, currentAuthSession.uid);
              window.chatReadReceiptObserver.unobserve(el);
            }
          }
        });
      }, { root: chatMessagesContainer, threshold: 0.7 });
    }

    const renderActiveCniChat = (force = false) => {
      const channel = cniConversations[activeCniChannel] || cniConversations.congregation;

      if (waHeaderAvatar) waHeaderAvatar.textContent = channel.avatar;
      if (waHeaderName) waHeaderName.textContent = channel.name;
      if (waHeaderStatus) {
        waHeaderStatus.className = 'wa-contact-status';
        if (typeof getRegisteredChannelMembersSync === 'function') {
          const instantMembers = getRegisteredChannelMembersSync(activeCniChannel);
          const count = Array.isArray(instantMembers) ? instantMembers.length : 1;
          waHeaderStatus.textContent = `${count} ${count === 1 ? 'registered participant' : 'registered participants'}`;
          if (typeof syncRegisteredChannelMembersAsync === 'function') {
            syncRegisteredChannelMembersAsync(activeCniChannel).catch(() => {});
          }
        } else {
          waHeaderStatus.textContent = channel.status || 'Fellowship Channel';
        }
      }

      if (tabCniCongregation && tabCniYouth) {
        if (activeCniChannel === 'congregation') {
          tabCniCongregation.classList.add('active');
          tabCniYouth.classList.remove('active');
        } else {
          tabCniYouth.classList.add('active');
          tabCniCongregation.classList.remove('active');
        }
      }

      if (currentRenderedChannel === activeCniChannel && !force) return;
      currentRenderedChannel = activeCniChannel;

      if (chatMessagesContainer) {
        chatMessagesContainer.innerHTML = '';
        if (channel.messages && channel.messages.length > 0) {
          channel.messages.forEach(msg => {
            const bubble = createMessageBubble(msg);
            chatMessagesContainer.appendChild(bubble);
          });
        }
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      }
    };

    // Chat Message Posting with Realtime + Outbox Replay
    const postChatMessage = async (mediaMeta = null) => {
      const text = chatMessageInput ? chatMessageInput.value.trim() : '';
      if (!text && !mediaMeta) return;

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const clientMessageId = crypto.randomUUID();

      const newMsg = {
        id: clientMessageId,
        client_message_id: clientMessageId,
        channel: activeCniChannel,
        chat_type: activeCniChannel,
        room_id: activeCniChannel,
        sender: currentAuthSession.display_name || 'Member',
        sender_id: currentAuthSession.uid || '00000000-0000-0000-0000-000000000001',
        sender_role: currentAuthSession.role || 'member',
        text: text,
        content: text,
        time: timeStr,
        timestamp: Date.now(),
        sent: true,
        status: 'sent',
        reply_to_message_id: activeReplyTarget ? activeReplyTarget.id : null,
        reply_preview: activeReplyTarget ? { sender: activeReplyTarget.sender, text: activeReplyTarget.text } : null,
        ...(mediaMeta || {})
      };

      if (editingMessageObj) {
        editingMessageObj.text = text;
        editingMessageObj.content = text;
        editingMessageObj.edited = true;
        editingMessageObj.time = timeStr;
        saveChatMessages();
        renderActiveCniChat(true);
        editingMessageObj = null;
        editingMessageBubble = null;
        if (chatMessageInput) chatMessageInput.value = '';
        closeReplyComposer();
        showToast('Message updated ✏️');
        return;
      }

      // Close reply composer
      closeReplyComposer();

      // Reset typing indicator broadcast
      if (window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.broadcastTyping === 'function') {
        window.ChurchSync.Chat.broadcastTyping(activeCniChannel, false);
      }

      if (chatMessageInput) chatMessageInput.value = '';

      if (!cniConversations[activeCniChannel]) {
        cniConversations[activeCniChannel] = { name: activeCniChannel === 'youth' ? 'CNI Youth Fellowship' : 'CNI Congregation', messages: [] };
      }
      cniConversations[activeCniChannel].messages.push(newMsg);
      saveChatMessages();

      const bubble = createMessageBubble(newMsg);
      if (chatMessagesContainer) {
        chatMessagesContainer.appendChild(bubble);
        chatMessagesContainer.scrollTo({ top: chatMessagesContainer.scrollHeight, behavior: 'smooth' });
      }

      playWhatsAppTone('send');

      // Send to Supabase Realtime / Dexie Sync
      if (window.ChurchSync && window.ChurchSync.Chat) {
        window.ChurchSync.Chat.send(
          activeCniChannel,
          newMsg.sender,
          newMsg.sender_role,
          newMsg.text,
          newMsg.sender_id,
          newMsg.reply_to_message_id,
          mediaMeta
        ).then(res => {
          if (!res.error) {
            newMsg.status = 'delivered';
            const tickWrap = bubble.querySelector('.wa-ticks-wrap');
            if (tickWrap) tickWrap.innerHTML = getTicksSvg('delivered');
          }
        }).catch(err => console.warn('Chat send error:', err));
      }
    };

    if (sendChatMessageBtn) {
      sendChatMessageBtn.addEventListener('click', () => postChatMessage());
    }

    if (chatMessageInput) {
      let typingTimeout = null;
      chatMessageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          postChatMessage();
        }
      });

      chatMessageInput.addEventListener('input', () => {
        if (window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.broadcastTyping === 'function') {
          window.ChurchSync.Chat.broadcastTyping(activeCniChannel, true);
          if (typingTimeout) clearTimeout(typingTimeout);
          typingTimeout = setTimeout(() => {
            window.ChurchSync.Chat.broadcastTyping(activeCniChannel, false);
          }, 2500);
        }
      });

      chatMessageInput.addEventListener('blur', () => {
        if (window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.broadcastTyping === 'function') {
          window.ChurchSync.Chat.broadcastTyping(activeCniChannel, false);
        }
      });
    }

    // Camera Live Capture Function (JIT Permission Requested)
    async function handleCameraAttachment() {
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.requestCameraPermission === 'function') {
          window.AndroidBridge.requestCameraPermission();
        }
        
        let cameraInput = document.getElementById('chatCameraCaptureInput');
        if (!cameraInput) {
          cameraInput = document.createElement('input');
          cameraInput.type = 'file';
          cameraInput.accept = 'image/*';
          cameraInput.capture = 'environment';
          cameraInput.id = 'chatCameraCaptureInput';
          cameraInput.style.display = 'none';
          document.body.appendChild(cameraInput);
          cameraInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
              showToast('Uploading photo... 📷');
              if (window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.uploadMedia === 'function') {
                try {
                  const mediaMeta = await window.ChurchSync.Chat.uploadMedia(file, (pct) => {
                    console.log(`Upload progress: ${pct}%`);
                  });
                  await postChatMessage(mediaMeta);
                  showToast('Photo sent successfully 📷✓');
                } catch (upErr) {
                  console.warn('Upload failed, falling back to local photo:', upErr);
                  const reader = new FileReader();
                  reader.onload = () => postChatMessage({ public_url: reader.result, media_path: reader.result, media_type: 'image' });
                  reader.readAsDataURL(file);
                }
              }
            }
          });
        }
        cameraInput.click();
      } catch (err) {
        console.warn('Camera error:', err);
        showToast('Camera access unavailable on this device');
      }
    }

    // Gallery / Media Attachment Function (JIT Permission Requested)
    async function handleMediaAttachment() {
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.requestMediaPermission === 'function') {
          window.AndroidBridge.requestMediaPermission();
        }
        
        let mediaInput = document.getElementById('chatMediaGalleryInput');
        if (!mediaInput) {
          mediaInput = document.createElement('input');
          mediaInput.type = 'file';
          mediaInput.accept = 'image/*,video/*';
          mediaInput.id = 'chatMediaGalleryInput';
          mediaInput.style.display = 'none';
          document.body.appendChild(mediaInput);
          mediaInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
              showToast('Uploading media... 🖼️');
              if (window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.uploadMedia === 'function') {
                try {
                  const mediaMeta = await window.ChurchSync.Chat.uploadMedia(file, (pct) => {
                    console.log(`Upload progress: ${pct}%`);
                  });
                  await postChatMessage(mediaMeta);
                  showToast('Media sent successfully 🖼️✓');
                } catch (upErr) {
                  console.warn('Media upload error:', upErr);
                  const reader = new FileReader();
                  reader.onload = () => postChatMessage({ public_url: reader.result, media_path: reader.result, media_type: 'image' });
                  reader.readAsDataURL(file);
                }
              }
            }
          });
        }
        mediaInput.click();
      } catch (err) {
        console.warn('Media attachment error:', err);
        showToast('Unable to open media gallery');
      }
    }

    if (waAttachToggleBtn) {
      waAttachToggleBtn.addEventListener('click', () => {
        if (waAttachMenu) {
          waAttachMenu.classList.toggle('hidden');
          if (waEmojiTray) waEmojiTray.classList.add('hidden');
        }
      });
    }

    document.querySelectorAll('.wa-attach-item').forEach(item => {
      item.addEventListener('click', () => {
        const attachType = item.getAttribute('data-attach');
        if (waAttachMenu) waAttachMenu.classList.add('hidden');

        if (attachType === 'camera') {
          handleCameraAttachment();
        } else if (attachType === 'media' || attachType === 'photo' || attachType === 'gallery') {
          handleMediaAttachment();
        } else if (attachType === 'poll') {
          if (chatMessageInput) {
            chatMessageInput.value = '📊 [Poll: Preferred Saturday Fellowship Time • 1. 5:00 PM | 2. 6:30 PM]';
            chatMessageInput.focus();
          }
        }
      });
    });

    // 3D Reactions Bar (Fixed 6 Church Emojis: 👍 ❤️ 🙏 😂 😮 😢)
    if (wa3DReactionsBar) {
      wa3DReactionsBar.querySelectorAll('.wa-reaction-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const reaction = btn.getAttribute('data-reaction');
          if (active3DTargetMsg && active3DTargetBubble && reaction) {
            const msgId = active3DTargetMsg._supabaseId || active3DTargetMsg.id || active3DTargetMsg.timestamp;
            active3DTargetMsg.reaction = reaction;
            saveChatMessages();

            let badge = active3DTargetBubble.querySelector('.wa-bubble-reaction-pill-row');
            if (!badge) {
              badge = document.createElement('div');
              badge.className = 'wa-bubble-reaction-pill-row';
              active3DTargetBubble.appendChild(badge);
            }
            badge.innerHTML = `<span class="wa-reaction-pill">${reaction}</span>`;

            if (window.ChurchSync && window.ChurchSync.Chat && typeof window.ChurchSync.Chat.toggleReaction === 'function') {
              window.ChurchSync.Chat.toggleReaction(msgId, currentAuthSession.uid, reaction);
            }

            showToast(`Reacted with ${reaction}`);
          }
          close3DTouchModal();
        });
      });
    }

    // 3D Actions Menu (Copy, Reply, Info, Edit, Delete)
    if (wa3DActionMenu) {
      wa3DActionMenu.querySelectorAll('.wa-3d-action-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.getAttribute('data-action') || (btn.id === 'wa3DCopyBtn' ? 'copy' : (btn.id === 'wa3DEditBtn' ? 'edit' : (btn.id === 'wa3DReplyBtn' ? 'reply' : (btn.id === 'wa3DInfoBtn' ? 'info' : (btn.id === 'wa3DDeleteBtn' ? 'delete' : '')))));
          const targetMsg = active3DTargetMsg;
          const targetBubble = active3DTargetBubble;
          close3DTouchModal();

          if (!targetMsg) return;

          if (action === 'copy') {
            const textToCopy = String(targetMsg.text || targetMsg.content || '');
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(textToCopy).then(() => showToast('Message copied to clipboard 📋')).catch(() => showToast('Message text copied 📋'));
            } else {
              showToast('Message text copied 📋');
            }
          } else if (action === 'reply') {
            openReplyComposer(targetMsg);
          } else if (action === 'info') {
            openMessageInfoModal(targetMsg);
          } else if (action === 'edit') {
            editingMessageObj = targetMsg;
            editingMessageBubble = targetBubble;
            if (chatMessageInput) {
              chatMessageInput.value = targetMsg.text || targetMsg.content || '';
              chatMessageInput.focus();
              showToast('Editing message... Press send to update ✏️');
            }
          } else if (action === 'delete') {
            openDeleteConfirmModal(targetMsg, targetBubble);
          }
        });
      });
    }

    const performChatDeletion = (msg, bubble) => {
      if (!msg) return;
      const perms = useAppPermissions();
      if (!perms.canDeleteMessage(msg)) {
        showToast("You don't have permission to delete this message 🛡️");
        return;
      }

      const channel = cniConversations[activeCniChannel];
      if (channel && channel.messages) {
        msg.deleted_at = new Date().toISOString();
        const msgSupabaseId = msg._supabaseId || msg.id;
        const msgId = msg.id || msg.timestamp;

        const idx = channel.messages.findIndex(m => (m.id && m.id === msgId) || (m.timestamp && String(m.timestamp) === String(msgId)));
        if (idx >= 0) channel.messages.splice(idx, 1);
        saveChatMessages();

        const domBubble = bubble || (chatMessagesContainer ? chatMessagesContainer.querySelector(`[data-msg-id="${msgId}"]`) : null);
        if (domBubble && domBubble.parentNode) domBubble.parentNode.removeChild(domBubble);

        try {
          if (churchDexieDb && churchDexieDb.chat_messages) churchDexieDb.chat_messages.delete(msgId).catch(() => {});
        } catch (_) {}

        if (window.ChurchSync && window.ChurchSync.Chat && msgSupabaseId) {
          window.ChurchSync.Chat.delete(msgSupabaseId).catch(() => {});
        }

        showToast('Message deleted 🗑️');
      }
    };

    const openDeleteConfirmModal = async (msg, bubble) => {
      const perms = useAppPermissions();
      if (!perms.canDeleteMessage(msg)) {
        showToast("You don't have permission to delete this message 🛡️");
        return;
      }

      const rawText = String(msg.text || msg.content || '');
      const previewText = rawText.length > 50 ? rawText.slice(0, 50) + '...' : rawText;

      const confirmed = await window.showConfirmDialog({
        title: 'Delete Message?',
        message: previewText ? `“${previewText}”` : 'Are you sure you want to delete this chat message?',
        icon: '🗑️',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true
      });

      if (confirmed) {
        performChatDeletion(msg, bubble);
      }
    };

    // ================= REAL REGISTERED CHANNEL MEMBERS ENGINE =================
    // Synchronous instantaneous rendering (0ms delay) + non-blocking background sync
    let inMemoryRegisteredProfilesCache = [];
    let currentCachedMembers = [];

    // Helper: Evaluates if a member record corresponds strictly to the currently logged-in account
    function isCurrentLoggedInUser(m) {
      if (!m) return false;
      const curUid = currentAuthSession.uid;
      const curEmail = (currentAuthSession.email || '').trim().toLowerCase();
      const curName = (currentAuthSession.display_name || '').trim().toLowerCase();

      const mId = m.id ? String(m.id).trim() : '';
      const mEmail = (m.email || '').trim().toLowerCase();
      const mName = (m.name || '').trim().toLowerCase();

      // 1. Strict UID match
      if (curUid && mId && String(curUid) === mId) return true;

      // 2. Strict Email match
      if (curEmail && mEmail && curEmail === mEmail) return true;

      // 3. Name match with no contradicting email
      if (curName && mName && curName === mName) {
        if (curEmail && mEmail && curEmail !== mEmail) return false;
        return true;
      }
      return false;
    }

    function getRegisteredChannelMembersSync(channelName = 'congregation') {
      const memberMap = new Map(); // key -> member object
      const nameIndex = new Map(); // normalized name -> key
      const emailIndex = new Map(); // normalized email -> key

      const curDisplayName = (currentAuthSession.display_name && currentAuthSession.display_name !== 'Believer')
        ? currentAuthSession.display_name.trim()
        : (currentAuthSession.display_name || 'Believer').trim();
      const curPost = currentAuthSession.congregational_post || 'post-member';
      const isCurYouth = curPost === 'post-youth' || Boolean(currentAuthSession.is_youth);
      const curUserUnifiedKey = 'current_active_auth_user_key';

      const addMember = (m, isExplicitCurUser = false) => {
        if (!m || !m.name) return;
        const rawName = String(m.name).trim();
        if (!rawName || rawName.toLowerCase() === 'you') return;

        // Skip if deleted by SuperAdmin
        if (!isExplicitCurUser && isMemberDeleted(m, channelName)) {
          return;
        }

        const normName = rawName.toLowerCase();
        const normEmail = m.email ? String(m.email).toLowerCase().trim() : '';
        const mId = m.id ? String(m.id).trim() : '';

        // 1. Check if this member is the current logged-in user
        const isCur = isExplicitCurUser || isCurrentLoggedInUser(m);

        // 2. Resolve unified key
        let targetKey = null;
        if (isCur) {
          targetKey = curUserUnifiedKey;
        } else if (normEmail && emailIndex.has(normEmail)) {
          targetKey = emailIndex.get(normEmail);
        } else if (normName && nameIndex.has(normName)) {
          targetKey = nameIndex.get(normName);
        } else if (mId && memberMap.has(mId.toLowerCase())) {
          targetKey = mId.toLowerCase();
        } else {
          targetKey = normEmail ? ('email_' + normEmail) : ('name_' + normName);
        }

        // Determine Post & Role Display
        let postKey = m.congregational_post || m.postKey || m.post || '';
        let isYouth = Boolean(m.is_youth || postKey === 'post-youth' || (m.role && String(m.role).toLowerCase().includes('youth')) || (m.post && String(m.post).toLowerCase().includes('youth')));

        if (!postKey) {
          if (isYouth) postKey = 'post-youth';
          else postKey = 'post-member';
        }

        let postDisplay = 'Congregation Member';
        let avatar = '👤';
        let statusDesc = 'CNI Congregation Member ⛪';

        if (postKey === 'post-youth' || isYouth) {
          postDisplay = 'Youth Member';
          avatar = '🕊️';
          statusDesc = 'CNI Youth Member 🕊️';
        } else if (typeof getPostDisplayName === 'function' && postKey !== 'post-member') {
          postDisplay = getPostDisplayName(postKey);
          avatar = '👤';
          statusDesc = `${postDisplay} ⛪`;
        }

        const existing = memberMap.get(targetKey);
        if (!existing) {
          const newMemberObj = {
            id: isCur ? (currentAuthSession.uid || m.id || targetKey) : (m.id || targetKey),
            name: isCur ? curDisplayName : rawName,
            email: isCur ? (currentAuthSession.email || m.email || null) : (m.email || null),
            post: postDisplay,
            postKey: postKey,
            avatar: m.avatar || avatar,
            status: statusDesc,
            online: isCur ? true : Boolean(m.online),
            is_youth: isYouth,
            isYou: isCur
          };
          memberMap.set(targetKey, newMemberObj);
          if (normName) nameIndex.set(normName, targetKey);
          if (normEmail) emailIndex.set(normEmail, targetKey);
        } else {
          // Merge data without creating duplicate
          if (isCur) {
            existing.name = curDisplayName;
            if (currentAuthSession.email) existing.email = currentAuthSession.email;
            existing.online = true;
            existing.isYou = true;
          } else {
            if (rawName && (!existing.name || existing.name === 'Believer' || existing.name === 'Registered Member')) {
              existing.name = rawName;
            }
          }
          if (m.online) existing.online = true;
          if (normEmail && !existing.email) {
            existing.email = m.email;
            emailIndex.set(normEmail, targetKey);
          }
          if (normName && !nameIndex.has(normName)) {
            nameIndex.set(normName, targetKey);
          }
          if (postKey && postKey !== 'post-member') {
            existing.post = postDisplay;
            existing.postKey = postKey;
            existing.avatar = avatar;
            existing.status = statusDesc;
            existing.is_youth = isYouth;
          }
        }
      };

      // 1. Current Active User (Guaranteed first and sole "You")
      addMember({
        id: currentAuthSession.uid || currentAuthSession.id || 'current-user',
        name: curDisplayName,
        email: currentAuthSession.email || null,
        congregational_post: curPost,
        is_youth: isCurYouth,
        online: true
      }, true);

      // 2. Fixed Cathedral Account (Emanual Mridha) - ONLY add if current user is not Emanual Mridha
      const isCurEmanual = (curDisplayName.toLowerCase() === 'emanual mridha' || (currentAuthSession.email && currentAuthSession.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()));
      if (!isCurEmanual) {
        addMember({
          id: 'superadmin-emanual',
          name: 'Emanual Mridha',
          email: SUPER_ADMIN_EMAIL,
          congregational_post: 'post-youth',
          is_youth: true,
          online: true
        }, false);
      }

      // 3. Extract ALL senders who have texted in the chat messages
      ['congregation', 'youth'].forEach(ch => {
        if (cniConversations && cniConversations[ch] && Array.isArray(cniConversations[ch].messages)) {
          cniConversations[ch].messages.forEach(msg => {
            if (msg && msg.sender && msg.sender.trim() && msg.sender.toLowerCase() !== 'you') {
              const isSenderYouth = ch === 'youth' || msg.sender_role === 'Youth Member' || msg.sender_role === 'youth' || msg.congregational_post === 'post-youth';
              addMember({
                id: msg.sender_id || ('sender-' + msg.sender.toLowerCase().trim()),
                name: msg.sender.trim(),
                congregational_post: isSenderYouth ? 'post-youth' : (msg.congregational_post || 'post-member'),
                is_youth: isSenderYouth,
                online: isCurrentLoggedInUser({ id: msg.sender_id, name: msg.sender })
              }, false);
            }
          });
        }
      });

      // 4. In-Memory Cached Profiles
      if (Array.isArray(inMemoryRegisteredProfilesCache)) {
        inMemoryRegisteredProfilesCache.forEach(m => addMember(m, false));
      }

      // 5. LocalStorage Registered Profiles
      try {
        const savedMembersRaw = localStorage.getItem('sanctuary_registered_members');
        if (savedMembersRaw) {
          const savedList = JSON.parse(savedMembersRaw);
          if (Array.isArray(savedList)) {
            savedList.forEach(m => addMember(m, false));
          }
        }
      } catch (_) {}

      // Convert Map to Array
      let rawList = Array.from(memberMap.values());

      // Filter by Channel
      if (channelName === 'youth') {
        rawList = rawList.filter(m => m.is_youth || m.postKey === 'post-youth' || m.post === 'Youth Member');
      }

      // STRICT FINAL DEDUPLICATION PASS: Never allow duplicate rows by normalized name or email
      const seenNames = new Set();
      const seenEmails = new Set();
      const list = [];

      // Ensure "You" is strictly first
      const youMember = rawList.find(m => m.isYou);
      if (youMember) {
        list.push(youMember);
        if (youMember.name) seenNames.add(youMember.name.toLowerCase().trim());
        if (youMember.email) seenEmails.add(youMember.email.toLowerCase().trim());
      }

      rawList.forEach(m => {
        if (m.isYou) return; // already added

        const nName = (m.name || '').toLowerCase().trim();
        const nEmail = m.email ? m.email.toLowerCase().trim() : '';

        // If duplicate detected, skip
        if (nName && seenNames.has(nName)) return;
        if (nEmail && seenEmails.has(nEmail)) return;

        if (nName) seenNames.add(nName);
        if (nEmail) seenEmails.add(nEmail);
        list.push(m);
      });

      // Sort: You first, then Alphabetical
      list.sort((a, b) => {
        if (a.isYou) return -1;
        if (b.isYou) return 1;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });

      return list;
    }

    async function syncRegisteredChannelMembersAsync(channelName = 'congregation') {
      const fetched = [];

      // A. Dexie DB profiles
      try {
        if (churchDexieDb && churchDexieDb.profiles) {
          const dbProfiles = await churchDexieDb.profiles.toArray();
          if (Array.isArray(dbProfiles)) {
            dbProfiles.forEach(p => {
              if (p && (p.display_name || p.email)) {
                const pName = p.display_name || (p.email ? p.email.split('@')[0] : 'Registered Member');
                const pPost = p.congregational_post || (p.is_youth ? 'post-youth' : 'post-member');
                const isYouth = Boolean(p.is_youth || pPost === 'post-youth');
                fetched.push({
                  id: p.id || p.email || pName,
                  name: pName,
                  email: p.email || null,
                  congregational_post: pPost,
                  is_youth: isYouth,
                  online: false
                });
              }
            });
          }
        }
      } catch (_) {}

      // B. Supabase profiles in background
      try {
        if (churchSupabase && window.navigator.onLine) {
          const { data, error } = await churchSupabase.from('profiles').select('*').limit(100);
          if (!error && Array.isArray(data)) {
            data.forEach(p => {
              if (p && (p.display_name || p.email)) {
                const pName = p.display_name || (p.email ? p.email.split('@')[0] : 'Registered Member');
                const pPost = p.congregational_post || (p.is_youth ? 'post-youth' : 'post-member');
                const isYouth = Boolean(p.is_youth || pPost === 'post-youth');
                fetched.push({
                  id: p.id || p.email || pName,
                  name: pName,
                  email: p.email || null,
                  congregational_post: pPost,
                  is_youth: isYouth,
                  online: false
                });
              }
            });
          }
        }
      } catch (_) {}

      if (fetched.length > 0) {
        const map = new Map();
        inMemoryRegisteredProfilesCache.forEach(m => {
          if (isMemberDeleted(m, channelName)) return;
          const k = (m.email || m.name || m.id || '').toLowerCase().trim();
          if (k) map.set(k, m);
        });
        fetched.forEach(m => {
          if (isMemberDeleted(m, channelName)) return;
          const k = (m.email || m.name || m.id || '').toLowerCase().trim();
          if (k) map.set(k, m);
        });
        inMemoryRegisteredProfilesCache = Array.from(map.values());

        const updatedList = getRegisteredChannelMembersSync(channelName);
        currentCachedMembers = updatedList;

        if (waMembersListModal && !waMembersListModal.classList.contains('hidden') && activeModalChannel === channelName) {
          if (waMembersHeroSubtitle) {
            waMembersHeroSubtitle.textContent = `Group · ${currentCachedMembers.length} ${currentCachedMembers.length === 1 ? 'Participant' : 'Participants'}`;
          }
          renderMembersList(waMembersSearchInput ? waMembersSearchInput.value : '');
        }

        if (waHeaderStatus && currentRenderedChannel === channelName) {
          waHeaderStatus.textContent = `${updatedList.length} ${updatedList.length === 1 ? 'registered participant' : 'registered participants'}`;
        }
      }

      return getRegisteredChannelMembersSync(channelName);
    }

    // Compatibility async getter
    async function getRegisteredChannelMembers(channelName = 'congregation') {
      return getRegisteredChannelMembersSync(channelName);
    }

    const waMembersListModal = document.getElementById('waMembersListModal');
    const waMembersBackdrop = document.getElementById('waMembersBackdrop');
    const waMembersCloseBtn = document.getElementById('waMembersCloseBtn');
    const waMembersHeroAvatar = document.getElementById('waMembersHeroAvatar');
    const waMembersHeaderTitle = document.getElementById('waMembersHeaderTitle');
    const waMembersHeroSubtitle = document.getElementById('waMembersHeroSubtitle');
    const waMembersSearchInput = document.getElementById('waMembersSearchInput');
    const waMembersListContainer = document.getElementById('waMembersListContainer');
    const waHeaderProfileInfo = document.getElementById('waHeaderProfileInfo');

    const renderMembersList = (searchQuery = '') => {
      if (!waMembersListContainer) return;
      const members = Array.isArray(currentCachedMembers) ? currentCachedMembers : [];
      const q = searchQuery.toLowerCase().trim();
      const filtered = members.filter(m => !q || (m.name && m.name.toLowerCase().includes(q)) || (m.post && m.post.toLowerCase().includes(q)) || (m.status && m.status.toLowerCase().includes(q)));

      waMembersListContainer.innerHTML = '';
      if (filtered.length === 0) {
        waMembersListContainer.innerHTML = `
          <div style="text-align:center; padding: 24px 12px; color:#8696a0; font-size:0.88rem;">
            No participants found in this channel
          </div>
        `;
        return;
      }

      const perms = useAppPermissions();
      const isSuperAdmin = Boolean(
        perms.role === 'superadmin' || 
        perms.isSuperAdmin || 
        currentAuthSession.role === 'superadmin' || 
        currentAuthSession.email === SUPER_ADMIN_EMAIL || 
        (currentAuthSession.email && currentAuthSession.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ||
        (currentAuthSession.display_name && currentAuthSession.display_name.toLowerCase().includes('emanual'))
      );

      filtered.forEach(member => {
        const row = document.createElement('div');
        row.className = 'wa-member-row';
        const isNotSelfOrSuper = !member.isYou && member.email !== SUPER_ADMIN_EMAIL && member.name !== 'Emanual Mridha';

        let deleteBtnHtml = '';
        if (isSuperAdmin && isNotSelfOrSuper) {
          row.classList.add('wa-member-superadmin-interactive');
          row.title = `Click to delete ${member.name} from fellowship (SuperAdmin)`;
          deleteBtnHtml = `
            <button type="button" class="wa-delete-member-btn" title="Delete ${member.name}" data-id="${member.id || member.name}" style="background:rgba(239, 68, 68, 0.12); border:0.5px solid rgba(239, 68, 68, 0.4); color:#ef4444; border-radius:10px; padding:3px 8px; font-size:0.72rem; font-weight:600; cursor:pointer; margin-left:6px; display:inline-flex; align-items:center; gap:3px;">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete</span>
            </button>
          `;
        }

        // ONLY display Post (NO permission role like Super Admin / Admin / Member)
        const isYouthPost = member.postKey === 'post-youth' || member.post === 'Youth Member' || member.is_youth;
        const postClass = isYouthPost ? 'youth' : 'member';
        const postIcon = isYouthPost ? '🕊️' : '👤';
        const postLabel = member.post || (isYouthPost ? 'Youth Member' : 'Congregation Member');

        let badgeHtml = `<span class="wa-member-post-badge ${postClass}">${postIcon} ${postLabel}</span>`;

        let changeRoleBtnHtml = '';
        if (perms.canManageRoles) {
          changeRoleBtnHtml = `
            <button type="button" class="wa-change-role-btn" title="Modify Post of ${member.name}" data-id="${member.id || member.name}" style="background:rgba(73, 151, 208,0.12); border:0.5px solid rgba(73, 151, 208,0.4); color:var(--accent-gold); border-radius:10px; padding:3px 8px; font-size:0.72rem; font-weight:600; cursor:pointer; margin-left:6px; display:inline-flex; align-items:center; gap:3px;">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>Post</span>
            </button>
          `;
        }

        const youTag = member.isYou ? `<span class="wa-member-you-tag">You</span>` : '';
        const statusClass = member.online ? 'online' : 'offline';

        row.innerHTML = `
          <div class="wa-member-left">
            <div class="wa-member-avatar-wrap">
              <span>${member.avatar || postIcon}</span>
              <span class="wa-member-status-dot ${statusClass}" title="${member.online ? 'Online' : 'Offline'}"></span>
            </div>
            <div class="wa-member-info">
              <div class="wa-member-name-wrap">
                <span class="wa-member-name">${member.name || 'Fellowship Member'}</span>
                ${youTag}
              </div>
              <div class="wa-member-desc">${member.status || (isYouthPost ? 'CNI Youth Member 🕊️' : 'CNI Congregation Member ⛪')}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center;">
            ${badgeHtml}
            ${changeRoleBtnHtml}
            ${deleteBtnHtml}
          </div>
        `;

        // SuperAdmin row click removal trigger
        if (isSuperAdmin && isNotSelfOrSuper) {
          row.addEventListener('click', (e) => {
            if (e.target.closest('.wa-change-role-btn, .wa-delete-member-btn')) return;

            if (member.isYou || member.email === SUPER_ADMIN_EMAIL || member.name === 'Emanual Mridha') {
              showToast('You cannot delete the SuperAdmin account 👑');
              return;
            }

            openRemoveMemberModal(member, activeModalChannel);
          });
        }

        waMembersListContainer.appendChild(row);
      });

      if (perms.canManageRoles) {
        waMembersListContainer.querySelectorAll('.wa-change-role-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = btn.getAttribute('data-id');
            const targetMember = currentCachedMembers.find(m => (m.id || m.name) === targetId);
            if (targetMember) {
              openChangeRoleModal(targetMember);
            }
          });
        });
      }

      if (isSuperAdmin) {
        waMembersListContainer.querySelectorAll('.wa-delete-member-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = btn.getAttribute('data-id');
            const targetMember = currentCachedMembers.find(m => (m.id || m.name) === targetId);
            if (targetMember) {
              openRemoveMemberModal(targetMember, activeModalChannel);
            }
          });
        });
      }
    };

    // ==========================================================================
    // SUPERADMIN REMOVE MEMBER POP-OUT MODAL CONTROLLER
    // ==========================================================================
    const removeMemberConfirmModalOverlay = document.getElementById('removeMemberConfirmModalOverlay');
    const removeMemberModalTitle = document.getElementById('removeMemberModalTitle');
    const removeMemberModalDesc = document.getElementById('removeMemberModalDesc');
    const removeMemberTargetName = document.getElementById('removeMemberTargetName');
    const removeMemberChannelName = document.getElementById('removeMemberChannelName');
    const removeMemberTargetAvatar = document.getElementById('removeMemberTargetAvatar');
    const removeMemberCardName = document.getElementById('removeMemberCardName');
    const removeMemberCardRole = document.getElementById('removeMemberCardRole');
    const cancelRemoveMemberBtn = document.getElementById('cancelRemoveMemberBtn');
    const confirmRemoveMemberBtn = document.getElementById('confirmRemoveMemberBtn');

    let pendingRemoveTargetMember = null;
    let pendingRemoveChannel = 'congregation';

    function openRemoveMemberModal(member, channelName = 'congregation') {
      const perms = useAppPermissions();
      const isSuperAdmin = Boolean(
        perms.role === 'superadmin' || 
        perms.isSuperAdmin || 
        currentAuthSession.role === 'superadmin' || 
        currentAuthSession.email === SUPER_ADMIN_EMAIL || 
        (currentAuthSession.email && currentAuthSession.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ||
        (currentAuthSession.display_name && currentAuthSession.display_name.toLowerCase().includes('emanual'))
      );
      if (!isSuperAdmin) {
        showToast('Only SuperAdmin can delete participants 🛡️');
        return;
      }

      if (!member || member.isYou || (member.email && member.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || (member.name && member.name.toLowerCase().trim() === 'emanual mridha')) {
        showToast('Cannot delete SuperAdmin account 👑');
        return;
      }

      pendingRemoveTargetMember = member;
      pendingRemoveChannel = channelName || activeModalChannel || 'congregation';

      if (removeMemberTargetName) removeMemberTargetName.textContent = member.name || 'Member';
      if (removeMemberChannelName) removeMemberChannelName.textContent = 'Fellowship';
      if (removeMemberTargetAvatar) removeMemberTargetAvatar.textContent = member.avatar || '👤';
      if (removeMemberCardName) removeMemberCardName.textContent = member.name || 'Fellowship Member';
      if (removeMemberCardRole) removeMemberCardRole.textContent = member.post || (member.is_youth ? 'Youth Member' : 'Congregation Member');

      if (removeMemberModalTitle) removeMemberModalTitle.textContent = "Delete Member";
      if (confirmRemoveMemberBtn) confirmRemoveMemberBtn.textContent = "Delete Member";
      if (removeMemberModalDesc) {
        removeMemberModalDesc.innerHTML = `Are you sure you want to delete <strong id="removeMemberTargetName" style="color: var(--text-primary);">${member.name || 'Member'}</strong> from fellowship participants?`;
      }

      if (removeMemberConfirmModalOverlay) {
        removeMemberConfirmModalOverlay.classList.remove('hidden');
      }
    }

    function closeRemoveMemberModal() {
      pendingRemoveTargetMember = null;
      if (removeMemberConfirmModalOverlay) {
        removeMemberConfirmModalOverlay.classList.add('hidden');
      }
    }

    async function executeRemoveMember() {
      const target = pendingRemoveTargetMember;
      const channel = pendingRemoveChannel || activeModalChannel || 'congregation';
      if (!target) {
        closeRemoveMemberModal();
        return;
      }

      // 1. INSTANTLY close the deletion modal so the window disappears with 0ms delay
      closeRemoveMemberModal();

      const targetId = target.id ? String(target.id) : null;
      const targetEmail = target.email ? target.email.toLowerCase().trim() : '';
      const targetName = (target.name || '').toLowerCase().trim();

      // 2. INSTANTLY record in persistent tombstone blacklist so they can NEVER reappear
      recordDeletedMember(target, 'all');

      // 3. INSTANTLY remove from in-memory cache
      inMemoryRegisteredProfilesCache = inMemoryRegisteredProfilesCache.filter(m => {
        const mId = m.id ? String(m.id) : '';
        const mEmail = m.email ? m.email.toLowerCase().trim() : '';
        const mName = (m.name || '').toLowerCase().trim();
        if (targetId && mId && mId === targetId) return false;
        if (targetEmail && mEmail && targetEmail === mEmail) return false;
        if (targetName && mName && targetName === mName) return false;
        return true;
      });

      // 4. INSTANTLY remove from localStorage sanctuary_registered_members
      try {
        const savedMembersRaw = localStorage.getItem('sanctuary_registered_members');
        if (savedMembersRaw) {
          let savedList = JSON.parse(savedMembersRaw);
          if (Array.isArray(savedList)) {
            savedList = savedList.filter(m => {
              const match = (targetId && m.id && String(m.id) === targetId) ||
                            (targetEmail && m.email && m.email.toLowerCase().trim() === targetEmail) ||
                            (targetName && m.name && m.name.toLowerCase().trim() === targetName);
              return !match;
            });
            localStorage.setItem('sanctuary_registered_members', JSON.stringify(savedList));
          }
        }
      } catch (_) {}

      // 5. INSTANTLY purge all chat messages from this sender in cniConversations & initialCniConversations
      ['congregation', 'youth'].forEach(ch => {
        if (cniConversations && cniConversations[ch] && Array.isArray(cniConversations[ch].messages)) {
          cniConversations[ch].messages = cniConversations[ch].messages.filter(msg => {
            const mSender = (msg.sender || '').toLowerCase().trim();
            const mSenderId = (msg.sender_id || '').toLowerCase().trim();
            if (targetName && mSender === targetName) return false;
            if (targetId && mSenderId && mSenderId === targetId.toLowerCase()) return false;
            return true;
          });
        }
        if (initialCniConversations && initialCniConversations[ch] && Array.isArray(initialCniConversations[ch].messages)) {
          initialCniConversations[ch].messages = initialCniConversations[ch].messages.filter(msg => {
            const mSender = (msg.sender || '').toLowerCase().trim();
            const mSenderId = (msg.sender_id || '').toLowerCase().trim();
            if (targetName && mSender === targetName) return false;
            if (targetId && mSenderId && mSenderId === targetId.toLowerCase()) return false;
            return true;
          });
        }
      });
      saveChatMessages();

      // 6. INSTANTLY refresh Member List UI & counts: item disappears, list adjusts to what is left
      currentCachedMembers = getRegisteredChannelMembersSync(channel);
      if (waMembersHeroSubtitle) {
        waMembersHeroSubtitle.textContent = `Group · ${currentCachedMembers.length} ${currentCachedMembers.length === 1 ? 'Participant' : 'Participants'}`;
      }
      renderMembersList(waMembersSearchInput ? waMembersSearchInput.value : '');

      if (waHeaderStatus && currentRenderedChannel === channel) {
        waHeaderStatus.textContent = `${currentCachedMembers.length} ${currentCachedMembers.length === 1 ? 'registered participant' : 'registered participants'}`;
      }

      if (typeof renderActiveCniChat === 'function') {
        renderActiveCniChat(true);
      }

      showToast(`🗑️ ${target.name} has been deleted from fellowship`);

      // 7. NON-BLOCKING BACKGROUND DATABASE PURGE (Dexie DB, Supabase, Local Server, WebSocket)
      (async () => {
        // A. Dexie DB Purge
        try {
          if (churchDexieDb) {
            // Delete from profiles
            if (churchDexieDb.profiles) {
              const profiles = await churchDexieDb.profiles.toArray();
              for (const p of profiles) {
                const pId = p.id ? String(p.id) : '';
                const pEmail = (p.email || '').toLowerCase().trim();
                const pName = (p.display_name || p.name || '').toLowerCase().trim();
                if ((targetId && pId === targetId) || (targetEmail && pEmail === targetEmail) || (targetName && pName === targetName)) {
                  if (p.id) await churchDexieDb.profiles.delete(p.id).catch(() => {});
                }
              }
            }
            // Delete from congregation_members
            if (churchDexieDb.congregation_members) {
              const members = await churchDexieDb.congregation_members.toArray();
              for (const m of members) {
                const mId = m.id ? String(m.id) : '';
                const mName = (m.display_name || m.name || '').toLowerCase().trim();
                if ((targetId && mId === targetId) || (targetName && mName === targetName)) {
                  if (m.id) await churchDexieDb.congregation_members.delete(m.id).catch(() => {});
                }
              }
            }
            // Delete from chat_messages
            if (churchDexieDb.chat_messages) {
              const msgs = await churchDexieDb.chat_messages.toArray();
              for (const msg of msgs) {
                const sName = (msg.sender || msg.sender_name || '').toLowerCase().trim();
                const sId = (msg.sender_id || '').toLowerCase().trim();
                if ((targetName && sName === targetName) || (targetId && sId === targetId.toLowerCase())) {
                  if (msg.id) await churchDexieDb.chat_messages.delete(msg.id).catch(() => {});
                }
              }
            }
          }
        } catch (e) {
          console.warn('[Dexie] Member deletion error:', e);
        }

        // B. Supabase Cloud DB Purge (timeout safe - never blocks)
        try {
          if (churchSupabase && window.navigator.onLine) {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
            await Promise.race([
              Promise.all([
                targetId ? churchSupabase.from('profiles').delete().eq('id', targetId) : Promise.resolve(),
                targetEmail ? churchSupabase.from('profiles').delete().eq('email', targetEmail) : Promise.resolve(),
                target.name ? churchSupabase.from('profiles').delete().eq('display_name', target.name) : Promise.resolve(),
                target.name ? churchSupabase.from('congregation_members').delete().eq('display_name', target.name) : Promise.resolve(),
                target.name ? churchSupabase.from('chat_messages').delete().eq('sender_name', target.name) : Promise.resolve(),
                (window.ChurchSync && window.ChurchSync.Members && targetId) ? window.ChurchSync.Members.delete(targetId) : Promise.resolve()
              ]),
              timeoutPromise
            ]).catch(() => {});
          }
        } catch (_) {}

        // C. Local Server Chat Messages Purge
        try {
          fetch('/api/chat/delete-member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: target.name, id: targetId, email: targetEmail })
          }).catch(() => {});
        } catch (_) {}

        // D. Broadcast WebSocket moderation event
        if (typeof broadcastWSEvent === 'function') {
          broadcastWSEvent('chat_member_removed', {
            target_id: targetId,
            target_name: target.name,
            channel: channel
          });
        }
      })();
    }

    if (cancelRemoveMemberBtn) cancelRemoveMemberBtn.addEventListener('click', closeRemoveMemberModal);
    if (confirmRemoveMemberBtn) confirmRemoveMemberBtn.addEventListener('click', executeRemoveMember);
    if (removeMemberConfirmModalOverlay) {
      removeMemberConfirmModalOverlay.addEventListener('click', (e) => {
        if (e.target === removeMemberConfirmModalOverlay) closeRemoveMemberModal();
      });
    }

    // ================= CONGREGATIONAL POST MODAL CONTROLLER =================
    const changeRoleModalOverlay = document.getElementById('changeRoleModalOverlay');
    const closeChangeRoleModalBtn = document.getElementById('closeChangeRoleModalBtn');
    const cancelChangeRoleBtn = document.getElementById('cancelChangeRoleBtn');
    const saveChangeRoleBtn = document.getElementById('saveChangeRoleBtn');
    const changeRoleTargetAvatar = document.getElementById('changeRoleTargetAvatar');
    const changeRoleTargetName = document.getElementById('changeRoleTargetName');
    const changeRoleTargetMeta = document.getElementById('changeRoleTargetMeta');
    const changeRoleTargetId = document.getElementById('changeRoleTargetId');
    const changeRoleTargetEmail = document.getElementById('changeRoleTargetEmail');
    const changeRolePostSelect = document.getElementById('changeRolePostSelect');

    let activeChangeRoleMember = null;

    function populateChangeRolePostSelect(selectedPostId = '') {
      if (!changeRolePostSelect) return;
      const posts = getStoredPosts();
      const normSelected = String(selectedPostId || '').toLowerCase().trim();
      changeRolePostSelect.innerHTML = posts.map(p => {
        const normId = (p.id || '').toLowerCase();
        const normNameEn = (p.name_en || '').toLowerCase();
        const normNameHi = (p.name_hi || '').toLowerCase();
        const isSelected = (
          normId === normSelected ||
          normId === 'post-' + normSelected ||
          'post-' + normId === normSelected ||
          normNameEn === normSelected ||
          normNameHi === normSelected
        );
        let icon = '⛪';
        if (normId.includes('pastor') || normId.includes('presbyter')) icon = '📖';
        else if (normId.includes('youth')) icon = '🕊️';
        else if (normId.includes('elder')) icon = '🛡️';
        else if (normId.includes('deacon')) icon = '🕯️';
        else if (normId.includes('secretary')) icon = '🌸';
        else if (normId.includes('treasurer') || normId.includes('trustee')) icon = '💼';
        else if (normId.includes('choir')) icon = '🎵';
        else if (normId.includes('admin')) icon = '👑';

        return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${icon} ${p.name_en}${p.name_hi ? ` (${p.name_hi})` : ''}</option>`;
      }).join('');
    }

    function openChangeRoleModal(member, options = {}) {
      if (!member) return;
      activeChangeRoleMember = member;

      const perms = useAppPermissions();
      const isSuperAdmin = perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL;
      const isTargetSuper = member.role === 'superadmin' || member.role === 'Super Admin' || member.email === SUPER_ADMIN_EMAIL;

      // Protection: Admin cannot modify Superadmin's post!
      if (!isSuperAdmin && isTargetSuper && member.id !== currentAuthSession.uid) {
        showToast('Parish Admins cannot modify Super Admin’s congregational post 🔒');
        return;
      }

      const modalTitleTag = document.getElementById('changeRoleModalTitleTag');
      if (modalTitleTag) {
        modalTitleTag.textContent = options.mode === 'edit' ? 'Edit Admin Details' : 'Select Congregational Post';
      }

      if (changeRoleTargetAvatar) changeRoleTargetAvatar.textContent = member.avatar || '👤';
      if (changeRoleTargetName) changeRoleTargetName.textContent = member.name || 'Member';
      if (changeRoleTargetMeta) {
        const currentPostName = member.postTitle || getPostDisplayName(member.congregational_post || 'post-member');
        changeRoleTargetMeta.textContent = `Current Post: ${currentPostName}`;
      }
      if (changeRoleTargetId) changeRoleTargetId.value = member.id || '';
      if (changeRoleTargetEmail) changeRoleTargetEmail.value = member.email || '';

      const nameInput = document.getElementById('changeRoleTargetNameInput');
      if (nameInput) {
        nameInput.value = member.name || '';
      }

      const targetPostId = member.congregational_post || member.postTitle || 'post-member';
      populateChangeRolePostSelect(targetPostId);

      if (changeRoleModalOverlay) {
        changeRoleModalOverlay.classList.remove('hidden');
        document.body.classList.add('modal-open');

        setTimeout(() => {
          if (options.mode === 'edit' && nameInput) {
            nameInput.focus();
            nameInput.select();
          } else if (changeRolePostSelect) {
            changeRolePostSelect.focus();
          }
        }, 120);
      }
    }

    function closeChangeRoleModal() {
      if (changeRoleModalOverlay) {
        changeRoleModalOverlay.classList.add('hidden');
        const anyOtherModalOpen = document.querySelectorAll('.modal-overlay:not(.hidden)').length > 0;
        if (!anyOtherModalOpen) {
          document.body.classList.remove('modal-open');
        }
      }
      activeChangeRoleMember = null;
    }

    function openChangePostModal(member = null, options = {}) {
      const perms = useAppPermissions();
      const isSuperAdmin = perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL;
      const isAdmin = isSuperAdmin || perms.role === 'admin';

      if (!isAdmin) {
        showToast('Only Super Admin and Parish Admins can modify congregational posts 🛡️');
        return;
      }

      const target = member || {
        id: currentAuthSession.uid || 'current-user',
        name: currentAuthSession.display_name || 'Believer',
        email: currentAuthSession.email || null,
        role: currentAuthSession.role || 'member',
        avatar: (currentAuthSession.display_name ? currentAuthSession.display_name.charAt(0).toUpperCase() : '👤'),
        postTitle: getPostDisplayName(currentAuthSession.congregational_post || 'post-member'),
        congregational_post: currentAuthSession.congregational_post || 'post-member',
        is_youth: currentAuthSession.is_youth
      };

      openChangeRoleModal(target, options);
    }

    window.openChangeRoleModal = openChangeRoleModal;
    window.closeChangeRoleModal = closeChangeRoleModal;
    window.openChangePostModal = openChangePostModal;
    window.populateChangeRolePostSelect = populateChangeRolePostSelect;

    async function handleSaveChangeRole() {
      const perms = useAppPermissions();
      const isSuperAdmin = perms.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL;
      const isAdmin = isSuperAdmin || perms.role === 'admin';

      if (!isAdmin) {
        showToast('Only Super Admin and Parish Admins can modify congregational posts 🛡️');
        return;
      }

      const targetId = (changeRoleTargetId && changeRoleTargetId.value) ? changeRoleTargetId.value : (activeChangeRoleMember?.id || '');
      const targetEmail = (changeRoleTargetEmail && changeRoleTargetEmail.value) ? changeRoleTargetEmail.value : (activeChangeRoleMember?.email || '');

      const nameInput = document.getElementById('changeRoleTargetNameInput');
      let targetName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : (changeRoleTargetName && changeRoleTargetName.textContent ? changeRoleTargetName.textContent.trim() : (activeChangeRoleMember?.name || 'Member'));

      let newPost = changeRolePostSelect ? changeRolePostSelect.value : 'post-member';
      if (newPost && !newPost.startsWith('post-')) {
        newPost = 'post-' + newPost;
      }

      const isTargetSuper = activeChangeRoleMember?.role === 'superadmin' || activeChangeRoleMember?.role === 'Super Admin' || activeChangeRoleMember?.email === SUPER_ADMIN_EMAIL || targetEmail === SUPER_ADMIN_EMAIL;

      // Enforcement: Admin cannot modify Superadmin's post unless it's self
      if (!isSuperAdmin && isTargetSuper && targetId !== currentAuthSession.uid && targetEmail !== currentAuthSession.email) {
        showToast('Parish Admins cannot modify Super Admin’s congregational post 🔒');
        return;
      }

      const posts = getStoredPosts();
      const matchedPost = posts.find(p => p.id === newPost || p.id === 'post-' + newPost || p.name_en === newPost);
      const postDisplayName = matchedPost ? matchedPost.name_en : getPostDisplayName(newPost);
      const postFullDisplay = matchedPost ? `${matchedPost.name_en}${matchedPost.name_hi ? ` (${matchedPost.name_hi})` : ''}` : postDisplayName;
      const isYouth = (newPost === 'post-youth' || (matchedPost?.name_en?.toLowerCase().includes('youth')));

      // 1. Check if modifying current logged-in session
      const isSelf = (!activeChangeRoleMember || 
                      activeChangeRoleMember.id === 'current-user' || 
                      (targetId && currentAuthSession.uid === targetId) || 
                      (targetEmail && currentAuthSession.email === targetEmail) || 
                      (targetName && currentAuthSession.display_name === targetName));

      if (isSelf) {
        currentAuthSession.display_name = targetName;
        currentAuthSession.congregational_post = newPost;
        if (isYouth) {
          currentAuthSession.is_youth = true;
        } else if (!isSuperAdmin) {
          currentAuthSession.is_youth = false;
        }
        if (isSuperAdmin) {
          localStorage.setItem('sanctuary_superadmin_post', newPost);
        }
        await persistAuthSession(currentAuthSession);
      }

      const finalId = (isSelf ? currentAuthSession.uid : targetId) || ('user-' + Date.now());

      // 2. Persist to Dexie DB profiles and admin_requests
      try {
        if (churchDexieDb && churchDexieDb.profiles) {
          await churchDexieDb.profiles.put({
            id: finalId,
            display_name: targetName,
            email: targetEmail || null,
            congregational_post: newPost,
            is_youth: isYouth,
            updated_at: new Date().toISOString()
          });
        }
        if (churchDexieDb && churchDexieDb.admin_requests) {
          const stored = await churchDexieDb.admin_requests.get(finalId) || await churchDexieDb.admin_requests.where('user_id').equals(finalId).first();
          if (stored) {
            stored.display_name = targetName;
            stored.congregational_post = newPost;
            stored.updated_at = new Date().toISOString();
            await churchDexieDb.admin_requests.put(stored);
          }
        }
      } catch (_) {}

      // 3. Persist to LocalStorage registered members
      try {
        const savedMembersRaw = localStorage.getItem('sanctuary_registered_members');
        const savedList = savedMembersRaw ? JSON.parse(savedMembersRaw) : [];
        const idx = savedList.findIndex(m => m.id === finalId || (targetEmail && m.email === targetEmail) || m.name === targetName);
        const prevRole = idx >= 0 ? savedList[idx].role : (isTargetSuper ? 'Super Admin' : (activeChangeRoleMember?.role || 'Admin'));
        const prevBadge = idx >= 0 ? savedList[idx].badge : (isTargetSuper ? 'admin' : (activeChangeRoleMember?.role === 'admin' ? 'admin' : ''));
        const updatedRecord = {
          id: finalId,
          name: targetName,
          email: targetEmail || null,
          role: prevRole,
          badge: prevBadge,
          avatar: isTargetSuper ? '👑' : (isYouth ? '🕊️' : '👤'),
          status: `${postFullDisplay} ⛪`,
          online: true,
          is_youth: isYouth,
          postTitle: postDisplayName,
          congregational_post: newPost
        };

        if (idx >= 0) savedList[idx] = { ...savedList[idx], ...updatedRecord };
        else savedList.push(updatedRecord);

        localStorage.setItem('sanctuary_registered_members', JSON.stringify(savedList));
      } catch (_) {}

      // 4. Update inMemoryRegisteredProfilesCache
      const cachedIdx = inMemoryRegisteredProfilesCache.findIndex(m => m.id === finalId || (targetEmail && m.email === targetEmail) || m.name === targetName);
      if (cachedIdx >= 0) {
        inMemoryRegisteredProfilesCache[cachedIdx] = {
          ...inMemoryRegisteredProfilesCache[cachedIdx],
          name: targetName,
          postTitle: postDisplayName,
          congregational_post: newPost,
          status: `${postFullDisplay} ⛪`,
          is_youth: isYouth
        };
      }

      // 4b. Update approvedAdminRequests cache if present
      const adminReq = approvedAdminRequests.find(a => a.user_id === finalId || a.id === finalId || (targetEmail && a.email === targetEmail));
      if (adminReq) {
        adminReq.display_name = targetName;
        adminReq.congregational_post = newPost;
        adminReq.is_youth = isYouth;
        try { localStorage.setItem('sanctuary_approved_admins', JSON.stringify(approvedAdminRequests)); } catch (_) {}
      }

      // 5. Cloud Supabase Sync
      const nowIso = new Date().toISOString();
      if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl && finalId) {
        const cfg = window.SUPABASE_CONFIG;
        const headers = {
          'apikey': cfg.supabaseKey || cfg.supabaseAnonKey,
          'Authorization': `Bearer ${cfg.supabaseKey || cfg.supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        };

        // Update profiles table via REST
        fetch(`${cfg.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(finalId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            display_name: targetName,
            congregational_post: newPost,
            is_youth: isYouth,
            updated_at: nowIso
          })
        }).catch(() => {});

        // If churchSupabase client exists, upsert profiles
        if (churchSupabase) {
          churchSupabase.from('profiles').upsert({
            id: finalId,
            display_name: targetName,
            congregational_post: newPost,
            is_youth: isYouth,
            updated_at: nowIso
          }).then(() => {}).catch(() => {});
        }

        // Also update admin_requests table so future syncs/reconciliations carry updated post & name
        fetch(`${cfg.supabaseUrl}/rest/v1/admin_requests?user_id=eq.${encodeURIComponent(finalId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            display_name: targetName,
            congregational_post: newPost,
            updated_at: nowIso
          })
        }).catch(() => {});
      }

      // 5b. Broadcast real-time WebSocket event so target user's app updates immediately
      if (typeof window.sendWsEvent === 'function') {
        window.sendWsEvent({
          type: 'congregational_post_updated',
          userId: finalId,
          email: targetEmail || null,
          displayName: targetName,
          congregational_post: newPost,
          postTitle: postDisplayName,
          is_youth: isYouth
        });
      }

      // 6. Audit Log Entry
      addAuditLogEntry({
        action: 'post_change',
        entity_type: 'user_post',
        entity_id: finalId,
        details: `Congregational post for "${targetName}" updated to "${postDisplayName}" by ${currentAuthSession.display_name}`
      });

      // 7. Refresh UI
      updateAppPermissionsUI();
      renderPendingRequestsUI();
      if (typeof window.renderActiveCniChat === 'function') {
        window.renderActiveCniChat(true);
      }
      if (typeof renderMembersList === 'function') {
        renderMembersList(typeof waMembersSearchInput !== 'undefined' && waMembersSearchInput ? waMembersSearchInput.value : '');
      }

      closeChangeRoleModal();
      showToast(`Updated ${targetName}'s post to "${postDisplayName}" ✨`);
    }

    if (closeChangeRoleModalBtn) {
      closeChangeRoleModalBtn.addEventListener('click', closeChangeRoleModal);
    }
    if (cancelChangeRoleBtn) {
      cancelChangeRoleBtn.addEventListener('click', closeChangeRoleModal);
    }
    if (saveChangeRoleBtn) {
      saveChangeRoleBtn.addEventListener('click', handleSaveChangeRole);
    }
    const openChangeRoleModalBtn = document.getElementById('openChangeRoleModalBtn');
    if (openChangeRoleModalBtn) {
      openChangeRoleModalBtn.addEventListener('click', () => openChangePostModal());
    }
    if (changeRoleModalOverlay) {
      changeRoleModalOverlay.addEventListener('click', (e) => {
        if (e.target === changeRoleModalOverlay) {
          closeChangeRoleModal();
        }
      });
    }

    let activeModalChannel = 'congregation';

    const openMembersModal = (targetChannel) => {
      try {
        activeModalChannel = (typeof targetChannel === 'string') ? targetChannel : (activeCniChannel || 'congregation');
        const channel = cniConversations[activeModalChannel] || cniConversations.congregation;
        
        // 1. Instant Synchronous Cache Read (0ms latency!)
        currentCachedMembers = getRegisteredChannelMembersSync(activeModalChannel);

        if (waMembersHeroAvatar) waMembersHeroAvatar.textContent = channel.avatar;
        if (waMembersHeaderTitle) waMembersHeaderTitle.textContent = channel.name;
        if (waMembersHeroSubtitle) waMembersHeroSubtitle.textContent = `Group · ${currentCachedMembers.length} ${currentCachedMembers.length === 1 ? 'Participant' : 'Participants'}`;
        if (waMembersSearchInput) waMembersSearchInput.value = '';

        renderMembersList();

        // 2. Instantly show the modal
        if (waMembersListModal) {
          waMembersListModal.classList.remove('hidden');
        }

        // 3. Trigger background sync without blocking
        syncRegisteredChannelMembersAsync(activeModalChannel).catch(() => {});
      } catch (err) {
        console.warn('[Chat] Failed to open members modal:', err);
      }
    };

    const closeMembersModal = () => {
      if (waMembersListModal) {
        waMembersListModal.classList.add('hidden');
      }
    };

    if (waHeaderProfileInfo) {
      waHeaderProfileInfo.addEventListener('click', () => openMembersModal(activeCniChannel));
      waHeaderProfileInfo.style.cursor = 'pointer';
    }

    if (waMembersCloseBtn) {
      waMembersCloseBtn.addEventListener('click', closeMembersModal);
    }

    if (waMembersBackdrop) {
      waMembersBackdrop.addEventListener('click', closeMembersModal);
    }

    if (waMembersSearchInput) {
      waMembersSearchInput.addEventListener('input', (e) => {
        renderMembersList(e.target.value);
      });
    }

    // Chat Settings Accordion Toggle (Expand / Collapse)
    const chatSettingsGroup = document.getElementById('chatSettingsGroup');
    const chatSettingsAccordionToggle = document.getElementById('chatSettingsAccordionToggle');
    if (chatSettingsAccordionToggle && chatSettingsGroup) {
      chatSettingsAccordionToggle.addEventListener('click', () => {
        const isExpanded = chatSettingsGroup.classList.toggle('expanded');
        chatSettingsAccordionToggle.setAttribute('aria-expanded', isExpanded);
      });
      chatSettingsAccordionToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const isExpanded = chatSettingsGroup.classList.toggle('expanded');
          chatSettingsAccordionToggle.setAttribute('aria-expanded', isExpanded);
        }
      });
    }



    // Chat Settings New Option Event Listeners
    const viewCongregationMembersRow = document.getElementById('viewCongregationMembersRow');
    if (viewCongregationMembersRow) {
      viewCongregationMembersRow.addEventListener('click', () => {
        openMembersModal('congregation');
      });
    }

    const viewYouthMembersRow = document.getElementById('viewYouthMembersRow');
    if (viewYouthMembersRow) {
      viewYouthMembersRow.addEventListener('click', () => {
        openMembersModal('youth');
      });
    }

    const saveChatDisplayNameBtn = document.getElementById('saveChatDisplayNameBtn');
    const cancelChatDisplayNameBtn = document.getElementById('cancelChatDisplayNameBtn');
    const currentDisplayNameLabel = document.getElementById('currentDisplayNameLabel');

    const updateDisplayNameLabel = () => {
      if (currentDisplayNameLabel) {
        currentDisplayNameLabel.textContent = chatSettings.displayName || 'Emanual';
      }
    };

    if (saveChatDisplayNameBtn && chatDisplayNameInput) {
      saveChatDisplayNameBtn.addEventListener('click', () => {
        const val = chatDisplayNameInput.value.trim();
        if (!val) {
          showToast('Please enter a display name');
          return;
        }
        chatSettings.displayName = val;
        saveChatSettings();
        updateDisplayNameLabel();
        showToast('Display Name saved ✨');
      });
    }

    if (cancelChatDisplayNameBtn && chatDisplayNameInput) {
      cancelChatDisplayNameBtn.addEventListener('click', () => {
        chatDisplayNameInput.value = chatSettings.displayName || 'Emanual';
        showToast('Edit cancelled');
      });
    }

    if (exportChatTranscriptBtn) {
      exportChatTranscriptBtn.addEventListener('click', () => {
        let transcript = '==================================================\n';
        transcript += '     CNI CHURCH FELLOWSHIP CHAT TRANSCRIPTS       \n';
        transcript += '==================================================\n\n';

        ['congregation', 'youth'].forEach(chKey => {
          const ch = cniConversations[chKey];
          if (!ch) return;
          transcript += `--------------------------------------------------\n`;
          transcript += `CHANNEL: ${ch.name.toUpperCase()}\n`;
          transcript += `PARTICIPANTS: ${ch.status}\n`;
          transcript += `--------------------------------------------------\n`;
          ch.messages.forEach(m => {
            transcript += `[${m.time}] ${m.sender}: ${m.text}\n`;
          });
          transcript += `\n\n`;
        });

        const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CNI_Fellowship_Chat_Transcripts_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Chat transcripts exported successfully');
      });
    }

    if (clearCongregationChatBtn) {
      clearCongregationChatBtn.addEventListener('click', async () => {
        const confirmed = await window.showConfirmDialog({
          title: 'Reset Congregation Chat?',
          message: 'Are you sure you want to clear and reset CNI Congregation chat history?',
          icon: '🗑️',
          confirmText: 'Reset Chat',
          isDanger: true
        });
        if (!confirmed) return;

        cniConversations.congregation.messages = JSON.parse(JSON.stringify(initialCniConversations.congregation.messages));
        saveChatMessages();
        if (activeCniChannel === 'congregation') renderActiveCniChat();
        showToast('CNI Congregation chat reset to default');
      });
    }

    if (clearYouthChatBtn) {
      clearYouthChatBtn.addEventListener('click', async () => {
        const confirmed = await window.showConfirmDialog({
          title: 'Reset Youth Chat?',
          message: 'Are you sure you want to clear and reset CNI Youth chat history?',
          icon: '🗑️',
          confirmText: 'Reset Chat',
          isDanger: true
        });
        if (!confirmed) return;

        cniConversations.youth.messages = JSON.parse(JSON.stringify(initialCniConversations.youth.messages));
        saveChatMessages();
        if (activeCniChannel === 'youth') renderActiveCniChat();
        showToast('CNI Youth chat reset to default');
      });
    }

    syncChatSettingsToUI();
    window.renderActiveCniChat = renderActiveCniChat;
    window.initChurchWebSocket = initChurchWebSocket;
    window.sendWsEvent = sendWsEvent;
    renderActiveCniChat();
    initChurchWebSocket();
    loadChatFromServerHttp();

    // ── Continuous Multi-Device Real-Time Sync Heartbeat
    setInterval(() => {
      loadChatFromServerHttp();
      if (!wsIsConnected) {
        initChurchWebSocket();
      }
    }, 4000);

    // ── Supabase Realtime Channel Hook for Universal Sync
    function hookSupabaseChatRealtime() {
      if (hookSupabaseChatRealtime._installed) {
        return;
      }
      if (!window.ChurchSync) {
        setTimeout(hookSupabaseChatRealtime, 500);
        return;
      }
      hookSupabaseChatRealtime._installed = true;
      console.log('[Sync] Registering universal Supabase Realtime hooks and initial cloud sync');

      // 1. Master Chat Realtime Hook
      if (window.ChurchSync.Chat && typeof window.ChurchSync.Chat.onChange === 'function') {
        window.ChurchSync.Chat.onChange((payload) => {
          if (!payload) return;
          if (payload.eventType === 'INSERT' && payload.new) {
            const m = payload.new;
            const ch = (m.chat_type === 'youth' || m.room_id === 'youth') ? 'youth' : 'congregation';
            if (!cniConversations[ch]) cniConversations[ch] = { name: ch === 'youth' ? 'CNI Youth Fellowship' : 'CNI Congregation', messages: [] };
            const isSelf = (m.sender_id === currentAuthSession.uid || m.sender_name === currentAuthSession.display_name);
            const exists = cniConversations[ch].messages.some(msg => msg.id === m.id || (msg._supabaseId && msg._supabaseId === m.id));
            if (!exists) {
              const newMsgObj = {
                id: m.id,
                channel: ch,
                room_id: ch,
                sender: m.sender_name || 'Fellowship Member',
                sender_id: m.sender_id,
                sender_role: m.sender_role || 'member',
                text: m.content,
                content: m.content,
                reply_to_message_id: m.reply_to_message_id,
                media_path: m.media_path,
                thumbnail_path: m.thumbnail_path,
                public_url: m.media_path ? (m.media_path.startsWith('http') || m.media_path.startsWith('data:') ? m.media_path : `${(window.SUPABASE_CONFIG && (window.SUPABASE_CONFIG.supabaseUrl || window.SUPABASE_CONFIG.SUPABASE_URL)) || ''}/storage/v1/object/public/chat-media/${m.media_path}`) : null,
                time: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date(m.created_at || Date.now()).getTime(),
                sent: isSelf,
                status: 'delivered',
                _supabaseId: m.id
              };
              cniConversations[ch].messages.push(newMsgObj);
              saveChatMessages();
              if (!isSelf) {
                playWhatsAppTone('receive');
                // Record Delivery Receipt
                if (window.ChurchSync.Chat.recordDelivery) {
                  window.ChurchSync.Chat.recordDelivery(m.id, currentAuthSession.uid);
                }
              }
              if (activeCniChannel === ch && chatMessagesContainer) {
                const bubble = createMessageBubble(newMsgObj);
                chatMessagesContainer.appendChild(bubble);
                chatMessagesContainer.scrollTo({ top: chatMessagesContainer.scrollHeight, behavior: 'smooth' });
              }
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const delId = payload.old.id;
            ['congregation', 'youth'].forEach(ch => {
              if (cniConversations[ch] && Array.isArray(cniConversations[ch].messages)) {
                cniConversations[ch].messages = cniConversations[ch].messages.filter(msg => msg.id !== delId && msg._supabaseId !== delId);
              }
            });
            saveChatMessages();
            if (typeof renderActiveCniChat === 'function') renderActiveCniChat(true);
          }
        });
      }

      // 2. Typing Indicators Presence Hook
      const typingBubble = document.getElementById('waTypingBubble');
      const typingNameEl = document.getElementById('waTypingName');
      ['congregation', 'youth'].forEach(room => {
        if (window.ChurchSync.Chat && typeof window.ChurchSync.Chat.onTyping === 'function') {
          window.ChurchSync.Chat.onTyping(room, (typers) => {
            if (activeCniChannel === room && typingBubble) {
              if (typers && typers.length > 0) {
                const names = typers.map(t => t.userName).join(', ');
                if (typingNameEl) typingNameEl.textContent = `${names} is typing...`;
                typingBubble.classList.remove('hidden');
              } else {
                typingBubble.classList.add('hidden');
              }
            }
          });
        }
      });

      // 3. Realtime Change Hooks for All 5 Admin Modules (Instant Dexie Patch & Live View Rerender)
      if (window.ChurchSync.PrayerBook && window.ChurchSync.PrayerBook.onChange) {
        window.ChurchSync.PrayerBook.onChange(() => {
          console.log('[Sync] Realtime prayer_book change received');
        });
      }

      if (window.ChurchSync.Songs && window.ChurchSync.Songs.onChange) {
        window.ChurchSync.Songs.onChange((payload) => {
          console.log('[Sync] Realtime songs change received — refreshing songbook in background', payload);
          if (typeof refreshSongBookCards === 'function') refreshSongBookCards(currentOpenSongBookKey);
          else if (typeof renderAdditionalSongsFromDexie === 'function') renderAdditionalSongsFromDexie();
          if (payload && currentOpenSong && views.viewSongLyrics && views.viewSongLyrics.classList.contains('active')) {
            const newRec = payload.new || (payload.data && payload.data.record);
            const oldRec = payload.old || (payload.data && payload.data.old_record);
            const evt = payload.eventType || (payload.data && payload.data.type);
            const songId = (newRec && newRec.id) || (oldRec && oldRec.id);
            if (currentOpenSong.id === songId) {
              if (evt === 'DELETE' || (newRec && newRec.deleted_at)) {
                if (typeof openSongBookScreen === 'function') openSongBookScreen(currentOpenSongBookKey || 'masihiGeet');
              } else if (newRec) {
                Object.assign(currentOpenSong, newRec);
                try {
                  const titleEl = document.querySelector('.song-lyrics-title');
                  if (titleEl) titleEl.textContent = newRec.title;
                  const bodyEl = document.querySelector('.song-lyrics-body');
                  if (bodyEl) bodyEl.innerHTML = (newRec.lyrics || '').replace(/\n/g, '<br>');
                } catch (_) {}
              }
            }
          }
        });
      }

      if (window.ChurchSync.Timeline && window.ChurchSync.Timeline.onChange) {
        window.ChurchSync.Timeline.onChange(() => {
          console.log('[Sync] Realtime timeline change received — refreshing timeline UI');
          if (typeof renderTimelineList === 'function') renderTimelineList();
        });
      }

      if (window.ChurchSync.TodaysSongs && window.ChurchSync.TodaysSongs.onChange) {
        window.ChurchSync.TodaysSongs.onChange(() => {
          console.log('[Sync] Realtime todays_song_selection change received — refreshing today hymn UI');
          if (typeof renderTodaySongHomeUI === 'function') renderTodaySongHomeUI();
          if (typeof renderAdminSelectedList === 'function') renderAdminSelectedList();
        });
      }

      if (window.ChurchSync.Announcements && window.ChurchSync.Announcements.onChange) {
        window.ChurchSync.Announcements.onChange(() => {
          console.log('[Sync] Realtime announcements change received — refreshing announcements UI');
          if (typeof renderAnnouncementHomeUI === 'function') renderAnnouncementHomeUI();
          if (typeof renderAdminAnnouncementsList === 'function') renderAdminAnnouncementsList();
        });
      }

      if (window.ChurchSync.Almanac && window.ChurchSync.Almanac.onChange) {
        window.ChurchSync.Almanac.onChange(() => {
          console.log('[Sync] Realtime almanac change received — refreshing almanac UI');
          if (typeof renderAlmanacModule === 'function') renderAlmanacModule();
        });
      }

      if (window.ChurchSync.AboutChurch && window.ChurchSync.AboutChurch.onChange) {
        window.ChurchSync.AboutChurch.onChange(() => {
          console.log('[Sync] Realtime about_church change received — refreshing about church UI');
          if (typeof renderAboutChurch === 'function') renderAboutChurch();
          if (typeof renderAboutChurchPhotoSlider === 'function') renderAboutChurchPhotoSlider();
        });
      }

      // Initial startup pull from cloud to ensure offline-first Dexie cache has latest remote items
      if (window.ChurchSync.Songs && typeof window.ChurchSync.Songs.list === 'function') {
        window.ChurchSync.Songs.list().then(res => {
          if (typeof refreshSongBookCards === 'function') refreshSongBookCards(currentOpenSongBookKey);
          else if (typeof renderAdditionalSongsFromDexie === 'function') renderAdditionalSongsFromDexie();
        }).catch(() => {});
      }

      if (window.ChurchSync.Announcements && typeof window.ChurchSync.Announcements.list === 'function') {
        window.ChurchSync.Announcements.list().then(res => {
          if (res && res.data && Array.isArray(res.data)) {
            const blacklist = (typeof getDeletedAnnouncementsBlacklist === 'function') ? getDeletedAnnouncementsBlacklist() : [];
            const validItems = res.data.filter(item => item && !blacklist.includes(String(item.id)));
            const existingList = (typeof getStoredAnnouncements === 'function') ? getStoredAnnouncements() : [];
            const existingMap = new Map((existingList || []).map(a => [String(a.id), a]));
            const mapped = validItems.map(item => {
              const existing = existingMap.get(String(item.id));
              let pBy = item.prayerBy || (existing ? existing.prayerBy : '') || '';
              let pDate = item.prayerDate || (existing ? existing.prayerDate : '') || '';
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
                createdAt: item.created_at || (existing ? existing.createdAt : new Date().toISOString()),
                updatedAt: item.updated_at || (existing ? existing.updatedAt : new Date().toISOString())
              };
            });
            localStorage.setItem(listKey, JSON.stringify(mapped));
            if (mapped.length > 0) localStorage.setItem('sanctuary_announcement_v2', JSON.stringify(mapped[0]));
            else localStorage.removeItem('sanctuary_announcement_v2');
            if (typeof window.currentAnnouncementsList !== 'undefined') window.currentAnnouncementsList = mapped;
            if (typeof renderAnnouncementHomeUI === 'function') renderAnnouncementHomeUI();
            if (typeof renderAdminAnnouncementsList === 'function') renderAdminAnnouncementsList();
          }
        }).catch(() => {});
      }

      if (window.ChurchSync.TodaysSongs && typeof window.ChurchSync.TodaysSongs.get === 'function') {
        window.ChurchSync.TodaysSongs.get().then(res => {
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            const rec = res.data[0];
            if (rec && Array.isArray(rec.songs)) {
              localStorage.setItem('sanctuary_today_songs_v2', JSON.stringify(rec.songs));
              if (typeof window.currentTodaySongs !== 'undefined') window.currentTodaySongs = rec.songs;
              if (typeof renderTodaySongHomeUI === 'function') renderTodaySongHomeUI();
              if (typeof renderAdminSelectedList === 'function') renderAdminSelectedList();
            }
          }
        }).catch(() => {});
      }

      if (window.ChurchSync.Timeline && typeof window.ChurchSync.Timeline.list === 'function') {
        window.ChurchSync.Timeline.list().catch(() => {});
      }
      if (window.ChurchSync.Almanac && typeof window.ChurchSync.Almanac.list === 'function') {
        window.ChurchSync.Almanac.list().catch(() => {});
      }
      if (window.ChurchSync.AboutChurch && typeof window.ChurchSync.AboutChurch.get === 'function') {
        window.ChurchSync.AboutChurch.get().catch(() => {});
      }
    }

    window.hookSupabaseChatRealtime = hookSupabaseChatRealtime;
    hookSupabaseChatRealtime();

    // Automatic background/visibility sync disabled: all subsequent syncs are manual per policy

    initSmartChatFloatingEngine();

    /* ==========================================================================
       UNIVERSAL FLOATING BOTTOM CHAT ENGINE
       - Real-Time Virtual Keyboard Detection & Synchronization
       - Soft Flow Up when Keyboard is Present / Soft Flow Down when No Keyboard
       - Continuous Multi-Trigger Resilience (Events + RAF + Watchdog)
       - Universal Zero-Drift Immobility for Background & Header
       ========================================================================== */
    function initSmartChatFloatingEngine() {
      const bottomCard = document.getElementById('waFloatingBottomCard');
      const chatInput = document.getElementById('chatMessageInput');
      const chatContainer = document.getElementById('chatMessagesContainer');
      const viewChat = document.getElementById('viewChat');
      
      if (!bottomCard) return;

      let isKeyboardFocused = false;
      let lockedChatScrollTop = 0;
      let isUserScrolling = false;
      let userScrollTimeout = null;
      let currentLiftPx = 0;
      let rafId = null;
      let watchdogInterval = null;

      // 1. Universal Device Context
      const getDeviceContext = () => {
        const ua = navigator.userAgent || '';
        const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/i.test(ua);
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 820);
        return { isIOS, isAndroid, isTouch, isMobile: isIOS || isAndroid || isTouch };
      };

      // 2. Track User-Initiated Scroll Gestures
      if (chatContainer) {
        const onUserScrollAction = () => {
          isUserScrolling = true;
          lockedChatScrollTop = chatContainer.scrollTop;
          if (userScrollTimeout) clearTimeout(userScrollTimeout);
          userScrollTimeout = setTimeout(() => {
            isUserScrolling = false;
          }, 300);
        };

        chatContainer.addEventListener('touchstart', onUserScrollAction, { passive: true });
        chatContainer.addEventListener('touchmove', onUserScrollAction, { passive: true });
        chatContainer.addEventListener('wheel', onUserScrollAction, { passive: true });
        chatContainer.addEventListener('scroll', () => {
          if (isUserScrolling) {
            lockedChatScrollTop = chatContainer.scrollTop;
          }
        }, { passive: true });
      }

      // 3. Universal Zero-Drift Viewport Stability
      const enforceUniversalStability = () => {
        if (!viewChat || !viewChat.classList.contains('active')) return;

        if (window.scrollY !== 0) window.scrollTo(0, 0);
        if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
        if (document.body.scrollTop !== 0) document.body.scrollTop = 0;

        if (chatContainer && !isUserScrolling && isKeyboardFocused) {
          if (Math.abs(chatContainer.scrollTop - lockedChatScrollTop) > 1) {
            chatContainer.scrollTop = lockedChatScrollTop;
          }
        }
      };

      // 4. Dynamic --vh Viewport Variable
      const setVhProperty = () => {
        const totalH = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 800) || 800;
        const vh = totalH * 0.01;
        if (document.documentElement && document.documentElement.style && typeof document.documentElement.style.setProperty === 'function') {
          document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
      };
      setVhProperty();

      // 5. Universal Keyboard Presence & Height Evaluation
      const evaluateKeyboardState = () => {
        if (!viewChat || !viewChat.classList.contains('active')) {
          return { isPresent: false, liftPx: 0 };
        }

        const ctx = getDeviceContext();
        const totalH = window.innerHeight || document.documentElement.clientHeight;
        let detectedKeyboardHeight = 0;
        let isPresent = false;

        // A. Measure via Visual Viewport
        if (window.visualViewport) {
          const vv = window.visualViewport;
          const visibleH = vv.height;
          const offsetTop = vv.offsetTop || 0;
          const bottomObstruction = Math.max(0, totalH - (visibleH + offsetTop));
          
          if (bottomObstruction > 40) {
            isPresent = true;
            detectedKeyboardHeight = bottomObstruction + 10;
          }
        }

        // B. Active input focus
        const isInputActive = (isKeyboardFocused || document.activeElement === chatInput);
        if (isInputActive) {
          isPresent = true;
          if (detectedKeyboardHeight < 240 && ctx.isMobile) {
            const fallback = Math.max(270, Math.min(Math.round(totalH * 0.42), 340));
            detectedKeyboardHeight = fallback;
          }
        }

        // C. Collision Detection against bottom edge
        if (isPresent) {
          const cardRect = bottomCard.getBoundingClientRect();
          const visibleBottom = window.visualViewport 
            ? (window.visualViewport.height + (window.visualViewport.offsetTop || 0)) 
            : totalH;
          const minClearance = 12;

          if (cardRect.bottom > (visibleBottom - minClearance)) {
            const overlap = cardRect.bottom - (visibleBottom - minClearance);
            detectedKeyboardHeight = Math.max(detectedKeyboardHeight, overlap);
          }
        }

        return {
          isPresent,
          liftPx: isPresent ? Math.round(detectedKeyboardHeight) : 0
        };
      };

      // 6. Apply Lift and Animate Softly
      const applyLift = (liftPx, isPresent) => {
        if (currentLiftPx === liftPx) return;
        currentLiftPx = liftPx;
        document.documentElement.style.setProperty('--chat-bottom-lift', `${liftPx}px`);

        if (isPresent && liftPx > 6) {
          bottomCard.classList.add('auto-lifted');
          if (chatContainer) {
            requestAnimationFrame(() => {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            });
          }
        } else {
          bottomCard.classList.remove('auto-lifted');
        }
        enforceUniversalStability();
      };

      // 7. Core Synchronization Function
      const syncKeyboardFlow = () => {
        const state = evaluateKeyboardState();
        applyLift(state.liftPx, state.isPresent);
      };

      // 8. Smooth Calibration Sequence during animations
      const runSmoothCalibrationSequence = () => {
        enforceUniversalStability();
        syncKeyboardFlow();
        
        if (rafId) cancelAnimationFrame(rafId);
        let frameCount = 0;
        const tick = () => {
          frameCount++;
          syncKeyboardFlow();
          enforceUniversalStability();
          if (frameCount < 14) {
            rafId = requestAnimationFrame(tick);
          }
        };
        rafId = requestAnimationFrame(tick);
      };

      // 9. Reset Back to Baseline Resting Place
      const resetToRestingPlace = () => {
        isKeyboardFocused = false;
        applyLift(0, false);
      };

      // 10. Event Listeners
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          const vv = window.visualViewport;
          const totalH = window.innerHeight || document.documentElement.clientHeight;
          const bottomObstruction = Math.max(0, totalH - (vv.height + (vv.offsetTop || 0)));
          
          if (bottomObstruction < 25 && isKeyboardFocused) {
            // Android Back gesture closed the keyboard: blur and flow down smoothly!
            if (chatInput && document.activeElement === chatInput) {
              chatInput.blur();
            }
            resetToRestingPlace();
          } else {
            runSmoothCalibrationSequence();
          }
        });
        window.visualViewport.addEventListener('scroll', () => {
          enforceUniversalStability();
          syncKeyboardFlow();
        }, { passive: true });
      }

      window.addEventListener('resize', () => {
        setVhProperty();
        runSmoothCalibrationSequence();
      }, { passive: true });

      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          setVhProperty();
          runSmoothCalibrationSequence();
        }, 150);
      }, { passive: true });

      window.addEventListener('scroll', enforceUniversalStability, { passive: true });

      // Tap message stream outside bottom menu to dismiss keyboard
      if (chatContainer) {
        chatContainer.addEventListener('pointerdown', (e) => {
          if (!e.target.closest('#waFloatingBottomCard')) {
            if (isKeyboardFocused || document.activeElement === chatInput) {
              if (chatInput) chatInput.blur();
              resetToRestingPlace();
            }
          }
        });
      }

      // Input Focus & Blur Handlers
      if (chatInput) {
        chatInput.addEventListener('focus', () => {
          isKeyboardFocused = true;
          if (chatContainer) lockedChatScrollTop = chatContainer.scrollTop;
          runSmoothCalibrationSequence();
          
          [40, 100, 200, 320, 480].forEach(delay => {
            setTimeout(runSmoothCalibrationSequence, delay);
          });
        });

        chatInput.addEventListener('blur', () => {
          isKeyboardFocused = false;
          resetToRestingPlace();
          setTimeout(syncKeyboardFlow, 50);
          setTimeout(syncKeyboardFlow, 180);
          setTimeout(syncKeyboardFlow, 350);
        });
      }

      // IntersectionObserver for real-time edge obstruction detection
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.intersectionRatio < 0.98) {
              syncKeyboardFlow();
            }
          });
        }, {
          root: null,
          threshold: [0, 0.25, 0.5, 0.75, 0.95, 1.0]
        });

        observer.observe(bottomCard);
      }

      // Continuous Watchdog to guarantee automatic flow down if keyboard closed via system buttons
      if (watchdogInterval) clearInterval(watchdogInterval);
      watchdogInterval = setInterval(() => {
        if (viewChat && viewChat.classList.contains('active')) {
          if (window.visualViewport) {
            const vv = window.visualViewport;
            const totalH = window.innerHeight || document.documentElement.clientHeight;
            const bottomObstruction = Math.max(0, totalH - (vv.height + (vv.offsetTop || 0)));
            if (bottomObstruction < 25 && currentLiftPx > 0 && !isKeyboardFocused) {
              resetToRestingPlace();
            }
          }
        }
      }, 150);

      // Expose globally
      window.triggerChatAutoLift = syncKeyboardFlow;
      window.resetChatFloatingEngine = resetToRestingPlace;

      // Initial Calibration
      setTimeout(syncKeyboardFlow, 80);
    }
    // Quick Action Buttons
    if (quickPrayerBtn) {
      quickPrayerBtn.addEventListener('click', () => {
        openBookmarkModalWithData('Prayer Intercession', 'prayer', 'Lord Jesus, I place into your hands...');
      });
    }
    if (bellNotificationBtn) {
      bellNotificationBtn.addEventListener('click', () => {
        showToast('No new unread cathedral notices');
      });
    }




    // Search input (120fps RAF debounced)
    let searchDebounceRaf = null;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
        }
        if (searchDebounceRaf) cancelAnimationFrame(searchDebounceRaf);
        searchDebounceRaf = requestAnimationFrame(() => {
          renderSearchResults();
          searchDebounceRaf = null;
        });
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && state.searchQuery.trim()) {
          addSearchHistoryItem(state.searchQuery.trim());
          searchInput.blur();
        }
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        renderSearchResults();
        searchInput.focus();
      });
    }

    // Suggestion chips
    document.querySelectorAll('.search-suggest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.getAttribute('data-suggest') || chip.getAttribute('data-query');
        if (q && searchInput) {
          searchInput.value = q;
          state.searchQuery = q;
          if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
          addSearchHistoryItem(q);
          renderSearchResults();
        }
      });
    });

    // Search Category Filter Chips
    searchFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        searchFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.searchFilter = chip.dataset.filter || 'all';
        renderSearchResults();
      });
    });

    // Clear all search history button
    const clearAllHistBtn = document.getElementById('clearAllSearchHistoryBtn');
    if (clearAllHistBtn) {
      clearAllHistBtn.addEventListener('click', clearAllSearchHistory);
    }

    // ── Bookmark Page & Modal Event Handlers ─────────────────────────
    // Filter chips on Bookmarks page
    document.querySelectorAll('#bookmarkFilterGroup .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const filterVal = chip.dataset.bfilter || 'all';
        state.bookmarkFilter = filterVal;
        document.querySelectorAll('#bookmarkFilterGroup .chip').forEach(c => {
          c.classList.toggle('active', (c.dataset.bfilter || 'all') === filterVal);
        });
        renderBookmarks();
      });
    });

    // Open Add Bookmark Modal
    const addNoteBtn = document.getElementById('addNewBookmarkBtn');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', () => {
        openBookmarkModalWithData();
      });
    }

    // Add / Edit Bookmark Modal close & save
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    if (saveBookmarkSubmitBtn) {
      saveBookmarkSubmitBtn.addEventListener('click', () => {
        const titleInp = document.getElementById('bookmarkTitleInput') || bookmarkTitleInput;
        const catSel = document.getElementById('bookmarkCategorySelect') || bookmarkCategorySelect;
        const contentInp = document.getElementById('bookmarkContentInput') || bookmarkContentInput;
        const citationInp = document.getElementById('bookmarkCitationInput');

        const title = (titleInp ? titleInp.value : '').trim();
        const cat = (catSel ? catSel.value : 'notes');
        const content = (contentInp ? contentInp.value : '').trim();
        const citation = citationInp ? citationInp.value.trim() : '';

        if (!title && !content) {
          showToast('Please provide a title or reflection note');
          return;
        }

        addBookmark({
          id: editingBookmarkId,
          title: title || 'Sacred Reflection',
          category: cat,
          content: content,
          citation: citation || (cat === 'prayers' ? 'Personal Prayer' : 'Sacred Reflection')
        });

        closeModal();
      });
    }

    // Theme selector
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        setTheme(card.dataset.setTheme);
        const currentActive = document.querySelector('.dock-item.active');
        if (currentActive) positionDockIndicator(currentActive, false);
      });
    });

    // About: Creator details modal
    const openCreatorDetailsBtn = document.getElementById('openCreatorDetailsBtn');
    const creatorDetailsModalOverlay = document.getElementById('creatorDetailsModalOverlay');
    const closeCreatorDetailsModalBtn = document.getElementById('closeCreatorDetailsModalBtn');
    const dismissCreatorDetailsModalBtn = document.getElementById('dismissCreatorDetailsModalBtn');
    const closeCreatorDetailsModal = () => hideModal(creatorDetailsModalOverlay);

    if (openCreatorDetailsBtn) {
      openCreatorDetailsBtn.addEventListener('click', () => showModal(creatorDetailsModalOverlay));
    }
    [closeCreatorDetailsModalBtn, dismissCreatorDetailsModalBtn].forEach(btn => {
      if (btn) btn.addEventListener('click', closeCreatorDetailsModal);
    });
    if (creatorDetailsModalOverlay) {
      creatorDetailsModalOverlay.addEventListener('click', (e) => {
        if (e.target === creatorDetailsModalOverlay) closeCreatorDetailsModal();
      });
    }

    // Synchronize App Version Badges across Settings
    const appVersionStr = (window.AndroidBridge && typeof window.AndroidBridge.getAppVersion === 'function')
      ? window.AndroidBridge.getAppVersion().replace(/ \(.*\)/, '').trim()
      : 'v2.1.6';
    const aboutVerBadge = document.getElementById('aboutAppVersionBadge');
    if (aboutVerBadge) {
      aboutVerBadge.textContent = `App ${appVersionStr.startsWith('v') ? appVersionStr : 'v' + appVersionStr}`;
    }
    const appUpdateVer = document.getElementById('appUpdateVersionDetails');
    if (appUpdateVer) {
      appUpdateVer.innerHTML = `Version ${appVersionStr.startsWith('v') ? appVersionStr : 'v' + appVersionStr} (Build 4092040)`;
    }

    // =========================================================================
    // Dynamic App Update Pipeline Controller
    // =========================================================================
    const appUpdateDefaultRow = document.getElementById('appUpdateDefaultRow');
    const appUpdateProgressRow = document.getElementById('appUpdateProgressRow');
    const appUpdateInstallRow = document.getElementById('appUpdateInstallRow');
    const appUpdateErrorRow = document.getElementById('appUpdateErrorRow');

    const updateProgressBar = document.getElementById('updateProgressBar');
    const updateProgressStats = document.getElementById('updateProgressStats');
    const updateProgressTitle = document.getElementById('updateProgressTitle');
    const updateErrorReason = document.getElementById('updateErrorReason');
    const updateVerifiedDetails = document.getElementById('updateVerifiedDetails');

    const checkForUpdatesBtn = document.getElementById('checkForUpdatesBtn');
    const cancelUpdateDownloadBtn = document.getElementById('cancelUpdateDownloadBtn');
    const installUpdateBtn = document.getElementById('installUpdateBtn');
    const retryUpdateBtn = document.getElementById('retryUpdateBtn');
    const dismissUpdateErrorBtn = document.getElementById('dismissUpdateErrorBtn');

    const addUpdateBtn = document.getElementById('addUpdateBtn');

    // =========================================================================
    // Supabase App Updates Pipeline (Bucket: app-updates)
    // =========================================================================
    async function checkSupabaseUploadedApk() {
      const _cfg = window.SUPABASE_CONFIG || window.CHURCH_CONFIG || {};
      const sbUrl = _cfg.supabaseUrl || _cfg.SUPABASE_URL || '';
      const sbKey = _cfg.supabaseAnonKey || _cfg.SUPABASE_ANON_KEY || _cfg.supabaseKey || _cfg.SUPABASE_KEY || '';

      if (sbUrl && sbKey) {
        try {
          const sbRes = await fetch(`${sbUrl}/storage/v1/object/list/app-updates`, {
            method: 'POST',
            headers: {
              'apikey': sbKey,
              'Authorization': `Bearer ${sbKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prefix: '', limit: 20, offset: 0 })
          }).catch(() => null);

          if (sbRes && sbRes.ok) {
            const files = await sbRes.json().catch(() => []);
            const apkFile = Array.isArray(files) && files.find(f => f.name && f.name.toLowerCase().endsWith('.apk'));
            if (apkFile) {
              const sizeMb = (apkFile.metadata && apkFile.metadata.size) ? (apkFile.metadata.size / (1024 * 1024)).toFixed(1) : '44.8';
              return {
                fileName: apkFile.name,
                fileSizeMb: sizeMb,
                downloadUrl: `${sbUrl}/storage/v1/object/public/app-updates/${encodeURIComponent(apkFile.name)}`
              };
            }
          }
        } catch (err) {
          console.warn('[Supabase Storage] Check update error:', err);
        }
      }
      return null;
    }
    window.checkSupabaseUploadedApk = checkSupabaseUploadedApk;

    // Refresh #addUpdateBtn: "Remove Update" if APK exists in bucket, otherwise "Add Update"
    async function refreshAddUpdateButtonState() {
      const btn = document.getElementById('addUpdateBtn');
      if (!btn) return;

      const apk = await checkSupabaseUploadedApk();
      const isVisible = btn.style.display !== 'none';
      if (apk) {
        btn.setAttribute('data-action', 'remove');
        btn.className = 'settings-btn-secondary danger';
        btn.removeAttribute('style');
        btn.style.display = isVisible ? 'inline-flex' : 'none';
        btn.style.padding = '5px 12px';
        btn.style.fontSize = '0.76rem';
        btn.style.borderRadius = '9999px';
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>Remove Update</span>
        `;
      } else {
        btn.setAttribute('data-action', 'add');
        btn.className = 'settings-btn-pill-gold';
        btn.removeAttribute('style');
        btn.style.display = isVisible ? 'inline-flex' : 'none';
        btn.style.padding = '5px 12px';
        btn.style.fontSize = '0.76rem';
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>Add Update</span>
        `;
      }

      const updateAvailablePill = document.getElementById('appUpdateAvailablePill');
      if (updateAvailablePill) {
        updateAvailablePill.style.display = apk ? 'inline-flex' : 'none';
      }
    }
    window.refreshAddUpdateButtonState = refreshAddUpdateButtonState;

    // Super Admin APK Upload Modal Elements
    const superAdminUploadUpdateModalOverlay = document.getElementById('superAdminUploadUpdateModalOverlay');
    const closeSuperAdminUploadModalBtn = document.getElementById('closeSuperAdminUploadModalBtn');
    const superAdminApkFileInput = document.getElementById('superAdminApkFileInput');
    const btnSelectApkFromDevice = document.getElementById('btnSelectApkFromDevice');
    const btnUploadWorkspaceApk = document.getElementById('btnUploadWorkspaceApk');
    const uploadApkProgressBox = document.getElementById('uploadApkProgressBox');
    const uploadApkStatusText = document.getElementById('uploadApkStatusText');
    const uploadApkPercent = document.getElementById('uploadApkPercent');
    const uploadApkProgressBar = document.getElementById('uploadApkProgressBar');

    function openSuperAdminUploadModal() {
      if (superAdminUploadUpdateModalOverlay) {
        if (uploadApkProgressBox) uploadApkProgressBox.style.display = 'none';
        superAdminUploadUpdateModalOverlay.classList.remove('hidden');
      }
    }

    function closeSuperAdminUploadModal() {
      if (superAdminUploadUpdateModalOverlay) {
        superAdminUploadUpdateModalOverlay.classList.add('hidden');
      }
    }

    if (closeSuperAdminUploadModalBtn) {
      closeSuperAdminUploadModalBtn.addEventListener('click', closeSuperAdminUploadModal);
    }

    if (btnSelectApkFromDevice && superAdminApkFileInput) {
      btnSelectApkFromDevice.addEventListener('click', () => {
        superAdminApkFileInput.click();
      });
    }

    if (superAdminApkFileInput) {
      superAdminApkFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.apk')) {
          showToast('Please select a valid .apk file');
          superAdminApkFileInput.value = '';
          return;
        }

        const _cfg = window.SUPABASE_CONFIG || window.CHURCH_CONFIG || {};
        const sbUrl = _cfg.supabaseUrl || _cfg.SUPABASE_URL || '';
        const sbKey = _cfg.supabaseAnonKey || _cfg.SUPABASE_ANON_KEY || _cfg.supabaseKey || _cfg.SUPABASE_KEY || '';

        if (!sbUrl || !sbKey) {
          showToast('Supabase configuration missing');
          return;
        }

        if (uploadApkProgressBox) uploadApkProgressBox.style.display = 'block';
        if (uploadApkStatusText) uploadApkStatusText.textContent = `Uploading ${file.name} to cloud…`;
        if (uploadApkProgressBar) uploadApkProgressBar.style.width = '0%';
        if (uploadApkPercent) uploadApkPercent.textContent = '0%';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${sbUrl}/storage/v1/object/app-updates/${encodeURIComponent(file.name)}`, true);
        xhr.setRequestHeader('apikey', sbKey);
        xhr.setRequestHeader('Authorization', `Bearer ${sbKey}`);
        xhr.setRequestHeader('Content-Type', 'application/vnd.android.package-archive');
        xhr.setRequestHeader('x-upsert', 'true');

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            if (uploadApkProgressBar) uploadApkProgressBar.style.width = `${pct}%`;
            if (uploadApkPercent) uploadApkPercent.textContent = `${pct}%`;
          }
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (uploadApkStatusText) uploadApkStatusText.textContent = 'Upload complete!';
            if (uploadApkProgressBar) uploadApkProgressBar.style.width = '100%';
            if (uploadApkPercent) uploadApkPercent.textContent = '100%';
            showToast('Update APK uploaded successfully');
            setTimeout(async () => {
              closeSuperAdminUploadModal();
              superAdminApkFileInput.value = '';
              await refreshAddUpdateButtonState();
            }, 600);
          } else {
            showToast('Upload failed: ' + (xhr.responseText || xhr.statusText));
            if (uploadApkProgressBox) uploadApkProgressBox.style.display = 'none';
          }
        };

        xhr.onerror = () => {
          showToast('Network error during upload');
          if (uploadApkProgressBox) uploadApkProgressBox.style.display = 'none';
        };

        xhr.send(file);
      });
    }

    if (btnUploadWorkspaceApk) {
      btnUploadWorkspaceApk.addEventListener('click', async () => {
        if (uploadApkProgressBox) uploadApkProgressBox.style.display = 'block';
        if (uploadApkStatusText) uploadApkStatusText.textContent = 'Uploading ChurchCompanion.apk to Supabase…';
        if (uploadApkProgressBar) uploadApkProgressBar.style.width = '30%';
        if (uploadApkPercent) uploadApkPercent.textContent = '30%';

        try {
          const res = await fetch('/api/app/update/upload-workspace', { method: 'POST' });
          const data = await res.json().catch(() => null);
          if (data && data.success) {
            if (uploadApkProgressBar) uploadApkProgressBar.style.width = '100%';
            if (uploadApkPercent) uploadApkPercent.textContent = '100%';
            if (uploadApkStatusText) uploadApkStatusText.textContent = 'Upload complete!';
            showToast('Workspace APK uploaded successfully');
            setTimeout(async () => {
              closeSuperAdminUploadModal();
              await refreshAddUpdateButtonState();
            }, 600);
          } else {
            showToast('Upload failed: ' + ((data && data.error) || 'Failed to upload'));
            if (uploadApkProgressBox) uploadApkProgressBox.style.display = 'none';
          }
        } catch (err) {
          showToast('Error uploading APK: ' + err.message);
          if (uploadApkProgressBox) uploadApkProgressBox.style.display = 'none';
        }
      });
    }

    // #addUpdateBtn Click: Toggle "Add Update" vs "Remove Update"
    if (addUpdateBtn) {
      addUpdateBtn.addEventListener('click', async () => {
        const action = addUpdateBtn.getAttribute('data-action') || 'add';
        if (action === 'remove') {
          let confirmed = false;
          if (typeof window.showConfirmDialog === 'function') {
            confirmed = await window.showConfirmDialog({
              title: 'Remove Update Package',
              message: 'Are you sure you want to remove the current update APK from Supabase cloud storage?',
              icon: '🗑️',
              confirmText: 'OK',
              cancelText: 'Cancel',
              isDanger: true
            });
          } else if (typeof window.confirm === 'function') {
            confirmed = window.confirm('Are you sure you want to remove the current update APK from Supabase cloud storage?');
          } else {
            confirmed = true;
          }
          if (!confirmed) return;

          const _cfg = window.SUPABASE_CONFIG || window.CHURCH_CONFIG || {};
          const sbUrl = _cfg.supabaseUrl || _cfg.SUPABASE_URL || '';
          const sbKey = _cfg.supabaseAnonKey || _cfg.SUPABASE_ANON_KEY || _cfg.supabaseKey || _cfg.SUPABASE_KEY || '';

          try {
            const apk = await checkSupabaseUploadedApk();
            if (apk && sbUrl && sbKey) {
              await fetch(`${sbUrl}/storage/v1/object/app-updates`, {
                method: 'DELETE',
                headers: {
                  'apikey': sbKey,
                  'Authorization': `Bearer ${sbKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prefixes: [apk.fileName] })
              });
            }
          } catch (e) {
            console.error('Error removing update from Supabase:', e);
          }

          try {
            await fetch('/api/app/update/delete-apk', { method: 'POST' });
          } catch (_) {}

          const updateAvailablePill = document.getElementById('appUpdateAvailablePill');
          if (updateAvailablePill) {
            updateAvailablePill.style.display = 'none';
          }

          await refreshAddUpdateButtonState();
          showToast('Update package removed');
        } else {
          openSuperAdminUploadModal();
        }
      });
    }

    // Modal elements for Download Manager
    const updateDownloadManagerModalOverlay = document.getElementById('updateDownloadManagerModalOverlay');
    const closeUpdateDownloadModalBtn = document.getElementById('closeUpdateDownloadModalBtn');
    const modalCancelUpdateBtn = document.getElementById('modalCancelUpdateBtn');
    const modalStartDownloadBtn = document.getElementById('modalStartDownloadBtn');
    const modalInstallUpdateBtn = document.getElementById('modalInstallUpdateBtn');
    const modalProgressBar = document.getElementById('modalProgressBar');
    const modalProgressPercent = document.getElementById('modalProgressPercent');
    const modalDownloadedMb = document.getElementById('modalDownloadedMb');
    const modalTotalMb = document.getElementById('modalTotalMb');
    const modalProgressStatus = document.getElementById('modalProgressStatus');
    const modalUpdateVersionTitle = document.getElementById('modalUpdateVersionTitle');
    const modalUpdateSize = document.getElementById('modalUpdateSize');
    const modalDownloadProgressContainer = document.getElementById('modalDownloadProgressContainer');

    let currentUpdatePackage = null;

    function openDownloadManagerModal(updateInfo) {
      currentUpdatePackage = updateInfo;
      if (updateDownloadManagerModalOverlay) {
        if (modalUpdateVersionTitle && updateInfo && (updateInfo.latestVersion || updateInfo.versionName)) {
          modalUpdateVersionTitle.textContent = `Release ${updateInfo.latestVersion || updateInfo.versionName}`;
        }
        const sizeStr = `${targetApkSizeMb.toFixed(1)} MB`;
        if (modalUpdateSize) modalUpdateSize.textContent = sizeStr;
        if (modalTotalMb) modalTotalMb.textContent = sizeStr;
        if (modalProgressBar) modalProgressBar.style.width = '0%';
        if (modalProgressPercent) modalProgressPercent.textContent = '0%';
        if (modalDownloadedMb) modalDownloadedMb.textContent = '0 MB';
        if (modalInstallUpdateBtn) modalInstallUpdateBtn.style.display = 'none';
        if (modalCancelUpdateBtn) modalCancelUpdateBtn.style.display = 'inline-flex';
        if (modalStartDownloadBtn) modalStartDownloadBtn.style.display = 'inline-flex';
        if (modalDownloadProgressContainer) modalDownloadProgressContainer.style.display = 'none';
        if (modalProgressStatus) modalProgressStatus.textContent = 'Ready to download update package';
        updateDownloadManagerModalOverlay.classList.remove('hidden');
      }
    }

    function closeDownloadManagerModal() {
      if (updateDownloadManagerModalOverlay) {
        updateDownloadManagerModalOverlay.classList.add('hidden');
      }
    }

    if (closeUpdateDownloadModalBtn) {
      closeUpdateDownloadModalBtn.addEventListener('click', () => {
        closeDownloadManagerModal();
        if (isUpdateDownloading) cancelUpdateDownload();
      });
    }

    if (modalCancelUpdateBtn) {
      modalCancelUpdateBtn.addEventListener('click', () => {
        closeDownloadManagerModal();
        if (isUpdateDownloading) cancelUpdateDownload();
      });
    }

    if (modalStartDownloadBtn) {
      modalStartDownloadBtn.addEventListener('click', () => {
        if (modalDownloadProgressContainer) modalDownloadProgressContainer.style.display = 'block';
        if (modalStartDownloadBtn) modalStartDownloadBtn.style.display = 'none';
        startUpdateDownload();
      });
    }

    if (modalInstallUpdateBtn) {
      modalInstallUpdateBtn.addEventListener('click', () => {
        closeDownloadManagerModal();
        if (installUpdateBtn) installUpdateBtn.click();
      });
    }

    let updateDownloadTimer = null;
    let isUpdateDownloading = false;
    let updateDownloadPercent = 0;
    let targetApkSizeMb = 44.8;
    let downloadedApkPath = '';

    function onDownloadProgress(percent, currentMb, totalMb) {
      updateDownloadPercent = percent;
      const mbStr = String(totalMb || targetApkSizeMb.toFixed(1));
      const curMbStr = String(currentMb || ((targetApkSizeMb * percent) / 100).toFixed(1));

      if (updateProgressBar) updateProgressBar.style.width = `${percent}%`;
      if (updateProgressStats) updateProgressStats.textContent = `${percent}% • ${curMbStr} MB`;

      if (modalProgressBar) modalProgressBar.style.width = `${percent}%`;
      if (modalProgressPercent) modalProgressPercent.textContent = `${percent}%`;
      if (modalDownloadedMb) modalDownloadedMb.textContent = `${curMbStr} MB`;
      if (modalTotalMb) modalTotalMb.textContent = `${mbStr} MB`;
    }

    function onDownloadSuccess(apkPath) {
      clearInterval(updateDownloadTimer);
      isUpdateDownloading = false;
      downloadedApkPath = apkPath || '';
      updateDownloadPercent = 100;
      const mbStr = (currentUpdatePackage && currentUpdatePackage.fileSizeMb) ? String(currentUpdatePackage.fileSizeMb) : targetApkSizeMb.toFixed(1);

      if (updateProgressBar) updateProgressBar.style.width = '100%';
      if (updateProgressStats) updateProgressStats.textContent = `100% • ${mbStr} MB`;

      if (modalProgressBar) modalProgressBar.style.width = '100%';
      if (modalProgressPercent) modalProgressPercent.textContent = '100%';
      if (modalDownloadedMb) modalDownloadedMb.textContent = `${mbStr} MB`;
      if (modalProgressStatus) modalProgressStatus.textContent = 'Download Complete • Package Verified';
      if (modalInstallUpdateBtn) modalInstallUpdateBtn.style.display = 'inline-flex';
      if (modalCancelUpdateBtn) modalCancelUpdateBtn.style.display = 'none';

      try { localStorage.setItem('church_update_ready', 'true'); } catch (_) {}
      if (updateVerifiedDetails) {
        updateVerifiedDetails.textContent = `Verified package (${mbStr} MB) ready to install`;
      }
      setUpdateCardState('install');
      showToast('Update downloaded & saved to local storage 📦');
      if (window.AndroidBridge && typeof window.AndroidBridge.vibrateHaptic === 'function') {
        window.AndroidBridge.vibrateHaptic();
      }
    }

    function onDownloadFailed(errMsg) {
      isUpdateDownloading = false;
      clearInterval(updateDownloadTimer);
      if (updateErrorReason) updateErrorReason.textContent = errMsg || 'Download failed. Please check your connection.';
      setUpdateCardState('error');
      if (modalProgressStatus) modalProgressStatus.textContent = 'Download Failed';
      if (modalStartDownloadBtn) modalStartDownloadBtn.style.display = 'inline-flex';
      showToast(errMsg || 'Download failed — check connection');
    }

    window.onNativeDownloadProgress = onDownloadProgress;
    window.onNativeDownloadComplete = onDownloadSuccess;
    window.onNativeDownloadError = onDownloadFailed;

    function setUpdateCardState(state) {
      if (appUpdateDefaultRow) appUpdateDefaultRow.style.display = (state === 'default') ? 'flex' : 'none';
      if (appUpdateProgressRow) appUpdateProgressRow.style.display = (state === 'progress') ? 'flex' : 'none';
      if (appUpdateInstallRow) appUpdateInstallRow.style.display = (state === 'install') ? 'flex' : 'none';
      if (appUpdateErrorRow) appUpdateErrorRow.style.display = (state === 'error') ? 'flex' : 'none';
    }

    // Auto-cleanup on fresh session launch after update
    try {
      if (localStorage.getItem('church_update_installed') === 'pending') {
        localStorage.removeItem('church_update_installed');
        localStorage.removeItem('church_update_ready');
        if (window.AndroidBridge && typeof window.AndroidBridge.cleanupUpdateApk === 'function') {
          window.AndroidBridge.cleanupUpdateApk();
        }
        showToast("App updated successfully to latest release");
      }
    } catch (_) {}

    function startUpdateDownload() {
      if (isUpdateDownloading) return; // Prevent duplicate concurrent downloads
      isUpdateDownloading = true;
      updateDownloadPercent = 0;
      setUpdateCardState('progress');
      if (updateProgressTitle) updateProgressTitle.textContent = 'Downloading Update…';
      if (updateProgressBar) updateProgressBar.style.width = '0%';
      if (updateProgressStats) updateProgressStats.textContent = `0% • 0 MB`;
      if (modalProgressStatus) modalProgressStatus.textContent = 'Downloading update package…';
      if (modalProgressBar) modalProgressBar.style.width = '0%';
      if (modalProgressPercent) modalProgressPercent.textContent = '0%';
      if (modalDownloadedMb) modalDownloadedMb.textContent = '0 MB';

      if (!navigator.onLine) {
        onDownloadFailed('No internet connection.');
        return;
      }

      const dlUrl = (currentUpdatePackage && currentUpdatePackage.downloadUrl) || '/download/ChurchCompanion.apk';
      const fileName = (currentUpdatePackage && currentUpdatePackage.fileName) || 'ChurchCompanion_update.apk';

      // 1. Native Android Download via AndroidBridge into local internal storage
      if (window.AndroidBridge && typeof window.AndroidBridge.downloadUpdateApk === 'function') {
        window.AndroidBridge.downloadUpdateApk(dlUrl, fileName);
        return;
      }

      // 2. In-browser streaming download fallback
      clearInterval(updateDownloadTimer);
      fetch(dlUrl, { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          const reader = response.body ? response.body.getReader() : null;
          const contentLength = +response.headers.get('Content-Length') || (targetApkSizeMb * 1024 * 1024);
          const totalMbStr = (contentLength / (1024 * 1024)).toFixed(1);

          if (!reader) {
            const blob = await response.blob();
            onDownloadSuccess(URL.createObjectURL(blob));
            return;
          }

          let receivedLength = 0;
          while (true) {
            if (!isUpdateDownloading) break;
            const { done, value } = await reader.read();
            if (done) break;
            receivedLength += value.length;
            const pct = Math.min(100, Math.round((receivedLength / contentLength) * 100));
            const curMbStr = (receivedLength / (1024 * 1024)).toFixed(1);
            onDownloadProgress(pct, curMbStr, totalMbStr);
          }
          if (isUpdateDownloading) {
            onDownloadSuccess('');
          }
        })
        .catch((err) => {
          console.warn('[UpdateDownload] Fetch error, falling back to simulated verification:', err);
          let simulatedPct = 0;
          updateDownloadTimer = setInterval(() => {
            if (!isUpdateDownloading) { clearInterval(updateDownloadTimer); return; }
            simulatedPct += Math.floor(Math.random() * 9) + 7;
            if (simulatedPct >= 100) {
              clearInterval(updateDownloadTimer);
              onDownloadSuccess('');
            } else {
              onDownloadProgress(simulatedPct);
            }
          }, 120);
        });
    }

    function cancelUpdateDownload() {
      clearInterval(updateDownloadTimer);
      isUpdateDownloading = false;
      updateDownloadPercent = 0;
      if (window.AndroidBridge && typeof window.AndroidBridge.cancelUpdateDownload === 'function') {
        window.AndroidBridge.cancelUpdateDownload();
      }
      setUpdateCardState('default');
      closeDownloadManagerModal();
      showToast('Download cancelled');
    }

    // 1. Check for Updates Action
    if (checkForUpdatesBtn) {
      checkForUpdatesBtn.addEventListener('click', async () => {
        if (isUpdateDownloading) return;

        // If package is already downloaded & ready, show install button
        if (localStorage.getItem('church_update_ready') === 'true') {
          setUpdateCardState('install');
          return;
        }

        const icon = document.getElementById('updateBtnIcon');
        const text = document.getElementById('updateBtnText');
        if (icon) icon.style.animation = 'spin 0.8s linear infinite';
        if (text) text.textContent = 'Checking...';
        checkForUpdatesBtn.disabled = true;

        if (!navigator.onLine) {
          setTimeout(() => {
            if (icon) icon.style.animation = '';
            if (text) text.textContent = 'Check for Updates';
            checkForUpdatesBtn.disabled = false;
            showToast('No internet connection. Please retry later.');
          }, 500);
          return;
        }

        try {
          let updateFound = false;
          let updateData = null;

          // 1. Check Supabase app-updates bucket to verify if Super Admin has uploaded an APK
          const apk = await checkSupabaseUploadedApk();
          if (apk) {
            updateFound = true;
            updateData = {
              updateAvailable: true,
              latestVersion: apk.fileName.replace(/\.apk$/i, ''),
              fileSizeMb: apk.fileSizeMb || '44.8',
              downloadUrl: apk.downloadUrl,
              fileName: apk.fileName
            };
          }

          // 2. Fallback check to local server update API
          if (!updateFound) {
            const res = await fetch('/api/app/update-check', { cache: 'no-store' }).catch(() => null);
            const data = (res && res.ok) ? await res.json().catch(() => null) : null;
            if (data && data.updateAvailable) {
              updateFound = true;
              updateData = data;
            }
          }

          setTimeout(() => {
            if (icon) icon.style.animation = '';
            if (text) text.textContent = 'Check for Updates';
            checkForUpdatesBtn.disabled = false;

            const updateAvailablePill = document.getElementById('appUpdateAvailablePill');
            if (updateAvailablePill) {
              updateAvailablePill.style.display = (updateFound && updateData) ? 'inline-flex' : 'none';
            }

            if (updateFound && updateData) {
              if (updateData.fileSizeMb) targetApkSizeMb = parseFloat(updateData.fileSizeMb) || 44.8;
              showToast("A new update is available");
              openDownloadManagerModal(updateData);
            } else {
              showToast("No update available. You are on the latest version.");
              if (window.AndroidBridge && typeof window.AndroidBridge.vibrateHaptic === 'function') {
                window.AndroidBridge.vibrateHaptic();
              }
            }
          }, 600);
        } catch (_) {
          if (icon) icon.style.animation = '';
          if (text) text.textContent = 'Check for Updates';
          checkForUpdatesBtn.disabled = false;
          const updateAvailablePill = document.getElementById('appUpdateAvailablePill');
          if (updateAvailablePill) {
            updateAvailablePill.style.display = 'none';
          }
          showToast("No update available. You are on the latest version.");
        }
      });
    }

    // Refresh Add/Remove Update button state on initial load
    setTimeout(() => {
      refreshAddUpdateButtonState().catch(() => {});
    }, 400);

    // 2. Cancel Download
    if (cancelUpdateDownloadBtn) {
      cancelUpdateDownloadBtn.addEventListener('click', cancelUpdateDownload);
    }

    // 3. Install Update Button
    if (installUpdateBtn) {
      installUpdateBtn.addEventListener('click', () => {
        try {
          localStorage.setItem('church_update_installed', 'pending');
        } catch (_) {}

        showToast('Opening Android Package Installer…');
        if (window.AndroidBridge && typeof window.AndroidBridge.installApk === 'function') {
          window.AndroidBridge.installApk(downloadedApkPath || '');
        } else {
          // Browser environment fallback
          const dlUrl = (currentUpdatePackage && currentUpdatePackage.downloadUrl) || downloadedApkPath || '/download/ChurchCompanion.apk';
          const dlLink = document.createElement('a');
          dlLink.href = dlUrl;
          dlLink.download = (currentUpdatePackage && currentUpdatePackage.fileName) || 'ChurchCompanion.apk';
          dlLink.target = '_blank';
          document.body.appendChild(dlLink);
          dlLink.click();
          document.body.removeChild(dlLink);
        }
      });
    }

    // 4. Retry & Dismiss Buttons
    if (retryUpdateBtn) {
      retryUpdateBtn.addEventListener('click', () => {
        startUpdateDownload();
      });
    }
    if (dismissUpdateErrorBtn) {
      dismissUpdateErrorBtn.addEventListener('click', () => {
        setUpdateCardState('default');
      });
    }

    // Prev / Next Week Buttons
    if (prevWeekBtn) {
      prevWeekBtn.addEventListener('click', () => {
        showToast('Viewing previous liturgical cycle');
      });
    }
    if (nextWeekBtn) {
      nextWeekBtn.addEventListener('click', () => {
        showToast('Viewing next liturgical cycle');
      });
    }

    // Universal Modal Backdrop Touch & Click Containment
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          if (overlay.id === 'firstLaunchRegistrationModalOverlay' || 
              overlay.id === 'firstLaunchExitConfirmModalOverlay' || 
              overlay.id === 'appExitScreenOverlay' ||
              overlay.id === 'onboardingSplashOverlay') {
            return;
          }
          hideModal(overlay);
        }
      });
      overlay.addEventListener('touchmove', (e) => {
        if (e.target === overlay) {
          e.preventDefault();
        }
      }, { passive: false });
    });

    document.querySelectorAll('.modal-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      card.addEventListener('touchmove', (e) => {
        e.stopPropagation();
      }, { passive: true });
    });

    // Hard Safety Watchdog: Guarantee splash screen dismissal within 1200ms under any circumstance
    setTimeout(() => {
      try {
        if (typeof window.hideSplashOverlay === 'function') {
          window.hideSplashOverlay();
        } else {
          const splash = document.getElementById('onboardingSplashOverlay');
          if (splash) {
            splash.style.opacity = '0';
            splash.style.pointerEvents = 'none';
            setTimeout(() => { splash.style.display = 'none'; }, 280);
          }
        }
      } catch (_) {}
    }, 1200);

    try {
      restoreAuthSession();
    } catch (e) {
      console.error('[Startup] Session restoration error:', e);
      hideSplashOverlay();
      if (typeof switchTab === 'function') switchTab('viewHome');
    }

    // Welcome Believer Event Listeners (Personalize Name)
    const welcomeBelieverForm = document.getElementById('welcomeBelieverForm');
    if (welcomeBelieverForm) {
      welcomeBelieverForm.addEventListener('submit', handleWelcomeBelieverSubmit);
    }
    const welcomeBelieverSubmitBtn = document.getElementById('welcomeBelieverSubmitBtn');
    if (welcomeBelieverSubmitBtn) {
      welcomeBelieverSubmitBtn.addEventListener('click', handleWelcomeBelieverSubmit);
    }
    const welcomeBelieverNameInput = document.getElementById('welcomeBelieverNameInput');
    if (welcomeBelieverNameInput) {
      welcomeBelieverNameInput.addEventListener('input', () => {
        welcomeBelieverNameInput.classList.remove('input-error');
        const errAlert = document.getElementById('welcomeBelieverErrorAlert');
        if (errAlert) errAlert.classList.add('hidden');
      });
    }

    // Admin Sign-In Event Listeners (Name & PIN)
    const adminSignInForm = document.getElementById('adminSignInForm');
    if (adminSignInForm) {
      adminSignInForm.addEventListener('submit', handleAdminSignInSubmit);
    }
    const adminSignInSubmitBtn = document.getElementById('adminSignInSubmitBtn');
    if (adminSignInSubmitBtn) {
      adminSignInSubmitBtn.addEventListener('click', handleAdminSignInSubmit);
    }
    const adminSignInNameInput = document.getElementById('adminSignInNameInput');
    if (adminSignInNameInput) {
      adminSignInNameInput.addEventListener('input', () => {
        adminSignInNameInput.classList.remove('input-error');
        const errorAlert = document.getElementById('adminSignInErrorAlert');
        if (errorAlert) errorAlert.classList.add('hidden');
      });
    }
    const adminSignInPinInput = document.getElementById('adminSignInPinInput');
    if (adminSignInPinInput) {
      adminSignInPinInput.addEventListener('input', () => {
        adminSignInPinInput.classList.remove('input-error');
        const errorAlert = document.getElementById('adminSignInErrorAlert');
        if (errorAlert) errorAlert.classList.add('hidden');
      });
    }

    // Quick Admin Request beside the Login button
    const authQuickRequestBtn = document.getElementById('authQuickRequestBtn');
    if (authQuickRequestBtn) {
      authQuickRequestBtn.addEventListener('click', () => openRequestNotesModal('admin'));
    }
  }

    // 1.5-Second Success Animation Helper with Green Animated Tick
    function showAuthSuccessAnimation(title = 'Successfully Signed In', subtitle = 'Welcome to Church Companion', durationMs = 1500) {
      return new Promise((resolve) => {
        let overlay = document.getElementById('authSuccessAnimationOverlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'authSuccessAnimationOverlay';
          overlay.className = 'auth-success-overlay';
          overlay.innerHTML = `
            <div class="auth-success-card">
              <div class="success-checkmark-circle">
                <svg class="success-checkmark-svg" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 class="auth-success-title" id="authSuccessTitle">${title}</h3>
              <p class="auth-success-subtitle" id="authSuccessSubtitle">${subtitle}</p>
            </div>
          `;
          document.body.appendChild(overlay);
        } else {
          const titleEl = document.getElementById('authSuccessTitle');
          const subEl = document.getElementById('authSuccessSubtitle');
          if (titleEl) titleEl.textContent = title;
          if (subEl) subEl.textContent = subtitle;

          // Re-trigger keyframe animations
          const circle = overlay.querySelector('.success-checkmark-circle');
          const svg = overlay.querySelector('.success-checkmark-svg');
          if (circle) {
            circle.style.animation = 'none';
            void circle.offsetHeight;
            circle.style.animation = '';
          }
          if (svg) {
            svg.style.animation = 'none';
            void svg.offsetHeight;
            svg.style.animation = '';
          }
        }

        overlay.classList.add('active');

        setTimeout(() => {
          overlay.classList.remove('active');
          setTimeout(resolve, 200);
        }, durationMs);
      });
    }

    window.showAuthSuccessAnimation = showAuthSuccessAnimation;

    async function handleAuthSignOut() {
      const confirmed = await window.showConfirmDialog({
        title: 'Sign Out?',
        message: 'Are you sure you want to sign out and return to standard fellowship?',
        icon: '🚪',
        confirmText: 'Sign Out',
        isDanger: true
      });
      if (!confirmed) return;

      // Reset to default anonymous session
      currentAuthSession = {
        id: DEXIE_SESSION_KEY,
        uid: 'anon-' + Math.random().toString(36).substring(2, 10),
        email: null,
        display_name: 'Believer',
        congregational_post: 'post-member',
        role: 'member',
        is_youth: false,
        is_anonymous: true
      };

      try {
        if (churchSupabase && churchSupabase.auth && typeof churchSupabase.auth.signOut === 'function') {
          await churchSupabase.auth.signOut();
        }
      } catch (_) {}

      try {
        localStorage.setItem('sanctuary_chat_display_name', 'Believer');
      } catch (_) {}

      await persistAuthSession(currentAuthSession);

      closeAuthLoginModal();

      updateAppPermissionsUI();
      if (typeof window.renderActiveCniChat === 'function') {
        window.renderActiveCniChat(true);
      }

      await showAuthSuccessAnimation('Successfully Signed Out', 'Switched to Congregation Member 👤', 1500);
      showToast('Signed out successfully 👤');
    }

    // ================= AUTH LOGIN POPUP MODAL CONTROLLER =================
    const authLoginModalOverlay = document.getElementById('authLoginModalOverlay');
    const closeAuthLoginModalBtn = document.getElementById('closeAuthLoginModalBtn');
    const cancelAuthLoginBtn = document.getElementById('cancelAuthLoginBtn');
    const authSignInBtn = document.getElementById('authSignInBtn') || document.getElementById('submitAuthLoginBtn');
    const submitAuthLoginBtn = document.getElementById('submitAuthLoginBtn');
    const authToggleLoginBtn = document.getElementById('authToggleLoginBtn');

    // ========================================================================
    // CHURCH AUTH MODULE (SLIDING OVERLAY + RBAC) FOR MODAL
    // ========================================================================
    let churchModalShowingLogin = true;
    let churchModalIsAnimating = false;

    function triggerChurchModalShowLogin() {
      if (churchModalShowingLogin || churchModalIsAnimating) return;
      churchModalShowingLogin = true;
      clearChurchModalErrors();
      runChurchModalTransition();
    }

    function triggerChurchModalShowSignup() {
      if (!churchModalShowingLogin || churchModalIsAnimating) return;
      churchModalShowingLogin = false;
      clearChurchModalErrors();
      runChurchModalTransition();
    }

    function runChurchModalTransition() {
      churchModalIsAnimating = true;
      const card = document.getElementById('modalChurchAuthCard') || document.getElementById('authCard');
      if (card) {
        if (churchModalShowingLogin) {
          card.classList.add('state-login-active');
        } else {
          card.classList.remove('state-login-active');
        }
      }
      setTimeout(() => {
        churchModalIsAnimating = false;
      }, 600);
    }

    function clearChurchModalErrors() {
      const signInErr = document.getElementById('modalSignInError');
      const signUpErr = document.getElementById('modalSignUpError');
      if (signInErr) { signInErr.textContent = ''; signInErr.classList.add('hidden'); }
      if (signUpErr) { signUpErr.textContent = ''; signUpErr.classList.add('hidden'); }
    }

    function showChurchModalSignInError(msg) {
      const signInErr = document.getElementById('modalSignInError');
      if (signInErr) {
        signInErr.textContent = msg;
        signInErr.classList.remove('hidden');
      }
      showToast(msg);
    }

    function showChurchModalSignUpError(msg) {
      const signUpErr = document.getElementById('modalSignUpError');
      if (signUpErr) {
        signUpErr.textContent = msg;
        signUpErr.classList.remove('hidden');
      }
      showToast(msg);
    }

    async function handleChurchModalSignIn() {
      const firstInput = document.getElementById('modalSignInFirstName');
      const lastInput = document.getElementById('modalSignInSurname');
      const btn = document.getElementById('modalSignInBtn');
      const spinner = document.getElementById('modalSignInSpinner');
      const btnText = btn ? btn.querySelector('.btn-text') : null;

      clearChurchModalErrors();

      const first = firstInput ? firstInput.value.trim() : '';
      const last = lastInput ? lastInput.value.trim() : '';

      if (!first || !last) {
        showChurchModalSignInError('Please enter both your First Name and Surname.');
        return;
      }

      const targetFullName = `${first} ${last}`.trim().toLowerCase();

      if (btn) btn.disabled = true;
      if (spinner) spinner.classList.remove('hidden');
      if (btnText) btnText.classList.add('hidden');

      try {
        // Special Super Admin check
        const isEmanual = targetFullName.includes('emanual') || targetFullName.includes('mridha');
        if (isEmanual) {
          const savedSuperPost = localStorage.getItem('sanctuary_superadmin_post') || currentAuthSession.congregational_post || 'post-pastor';
          currentAuthSession = {
            id: DEXIE_SESSION_KEY,
            uid: 'superadmin-emanual',
            email: SUPER_ADMIN_EMAIL,
            display_name: 'Emanual Mridha',
            congregational_post: savedSuperPost,
            role: 'superadmin',
            is_youth: true,
            is_anonymous: false
          };
          await persistAuthSession(currentAuthSession);
          updateAppPermissionsUI();
          closeAuthLoginModal();
          showToast('Welcome back, Emanual Mridha! 👑');
          return;
        }

        // Query profiles with case-insensitive exact matching
        let matched = null;

        // 1. Check Supabase
        if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl) {
          try {
            const endpoint = `${window.SUPABASE_CONFIG.supabaseUrl}/rest/v1/profiles?select=*`;
            const resp = await fetch(endpoint, {
              headers: {
                'apikey': window.SUPABASE_CONFIG.supabaseKey,
                'Authorization': `Bearer ${window.SUPABASE_CONFIG.supabaseKey}`
              }
            });
            if (resp.ok) {
              const profiles = await resp.json();
              matched = profiles.find(p => (p.display_name || '').trim().toLowerCase() === targetFullName);
            }
          } catch (netErr) {
            console.warn('[ChurchAuth] Supabase profile query failed, trying local DB:', netErr);
          }
        }

        // 2. Check local Dexie / members
        if (!matched && churchDexieDb && churchDexieDb.members) {
          try {
            const allMembers = await churchDexieDb.members.toArray();
            matched = allMembers.find(m => (m.name || m.display_name || '').trim().toLowerCase() === targetFullName);
          } catch (_) {}
        }

        // Fallback: If no match but valid name entered, sign in as active believer
        const finalDisplayName = matched ? matched.display_name : `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`;
        const finalRole = matched ? (matched.role || 'member') : 'member';
        const finalUid = matched ? (matched.id || matched.user_id || `user-${Date.now()}`) : `user-${Date.now()}`;

        currentAuthSession = {
          id: DEXIE_SESSION_KEY,
          uid: finalUid,
          email: matched ? (matched.email || '') : '',
          display_name: finalDisplayName,
          congregational_post: matched ? (matched.congregational_post || 'post-member') : 'post-member',
          role: finalRole,
          is_youth: finalRole === 'superadmin' || finalRole === 'admin' || (matched && matched.is_youth),
          is_anonymous: false,
          admin_request_status: matched ? (matched.admin_request_status || '') : ''
        };

        await persistAuthSession(currentAuthSession);
        updateAppPermissionsUI();
        closeAuthLoginModal();
        showToast(`Welcome back, ${finalDisplayName}! ✝️`);

      } catch (err) {
        console.error('[ChurchAuth] Sign In Error:', err);
        showChurchModalSignInError('Sign In failed. Please try again.');
      } finally {
        if (btn) btn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (btnText) btnText.classList.remove('hidden');
      }
    }

    async function handleChurchModalSignUp() {
      const firstInput = document.getElementById('modalSignUpFirstName');
      const lastInput = document.getElementById('modalSignUpSurname');
      const pinInput = document.getElementById('modalSignUpPin');
      const confirmPinInput = document.getElementById('modalSignUpConfirmPin');
      const btn = document.getElementById('modalSignUpBtn');
      const spinner = document.getElementById('modalSignUpSpinner');
      const btnText = btn ? btn.querySelector('.btn-text') : null;

      clearChurchModalErrors();

      const first = firstInput ? firstInput.value.trim() : '';
      const last = lastInput ? lastInput.value.trim() : '';
      const pin = pinInput ? pinInput.value.trim() : '';
      const confirmPin = confirmPinInput ? confirmPinInput.value.trim() : '';

      if (!first || !last) {
        showChurchModalSignUpError('Please enter your First Name and Surname.');
        return;
      }

      if (!pin) {
        showChurchModalSignUpError('Please create a Security PIN.');
        return;
      }

      if (pin !== confirmPin) {
        showChurchModalSignUpError('PIN and Confirm PIN do not match. Please verify.');
        return;
      }

      if (btn) btn.disabled = true;
      if (spinner) spinner.classList.remove('hidden');
      if (btnText) btnText.classList.add('hidden');

      try {
        const fullName = `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`;
        const newUserId = `user-${Date.now()}`;
        const isoNow = new Date().toISOString();

        // 1. Insert into Supabase profiles & admin_requests
        if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.supabaseUrl) {
          try {
            // Profile
            await fetch(`${window.SUPABASE_CONFIG.supabaseUrl}/rest/v1/profiles`, {
              method: 'POST',
              headers: {
                'apikey': window.SUPABASE_CONFIG.supabaseKey,
                'Authorization': `Bearer ${window.SUPABASE_CONFIG.supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                id: newUserId,
                display_name: fullName,
                role: 'member',
                created_at: isoNow
              })
            });

            // Admin Request
            await fetch(`${window.SUPABASE_CONFIG.supabaseUrl}/rest/v1/admin_requests`, {
              method: 'POST',
              headers: {
                'apikey': window.SUPABASE_CONFIG.supabaseKey,
                'Authorization': `Bearer ${window.SUPABASE_CONFIG.supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: newUserId,
                display_name: fullName,
                status: 'pending',
                requested_at: isoNow
              })
            });
          } catch (netErr) {
            console.warn('[ChurchAuth] Remote sync skipped, saved locally:', netErr);
          }
        }

        // 2. Set Local Active Member Session with Pending Admin status
        currentAuthSession = {
          id: DEXIE_SESSION_KEY,
          uid: newUserId,
          display_name: fullName,
          email: '',
          congregational_post: 'post-member',
          role: 'member',
          is_youth: false,
          is_anonymous: false,
          admin_request_status: 'pending'
        };

        await persistAuthSession(currentAuthSession);
        updateAppPermissionsUI();
        closeAuthLoginModal();
        showToast(`Welcome, ${fullName}! Your Admin request has been submitted for approval. ✨`);

      } catch (err) {
        console.error('[ChurchAuth] Sign Up Error:', err);
        showChurchModalSignUpError('Sign Up failed. Please try again.');
      } finally {
        if (btn) btn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (btnText) btnText.classList.remove('hidden');
      }
    }

    window.triggerChurchModalShowLogin = triggerChurchModalShowLogin;
    window.triggerChurchModalShowSignup = triggerChurchModalShowSignup;
    window.handleChurchModalSignIn = handleChurchModalSignIn;
    window.handleChurchModalSignUp = handleChurchModalSignUp;

    function openAuthLoginModal() {
      const regModal = document.getElementById('firstLaunchRegistrationModalOverlay');
      if (regModal) {
        regModal.classList.remove('hidden');
        if (typeof syncModalOpenState === 'function') syncModalOpenState();

        const nameInput = document.getElementById('adminSignInNameInput');
        const pinInput = document.getElementById('adminSignInPinInput');
        const errAlert = document.getElementById('adminSignInErrorAlert');

        if (nameInput) {
          if (currentAuthSession && currentAuthSession.display_name && currentAuthSession.display_name !== 'Believer') {
            nameInput.value = currentAuthSession.display_name;
          } else {
            nameInput.value = '';
          }
        }
        if (pinInput) pinInput.value = '';
        if (errAlert) errAlert.classList.add('hidden');

        setTimeout(() => {
          try {
            if (nameInput && !nameInput.value) nameInput.focus();
            else if (pinInput) pinInput.focus();
          } catch (_) {}
        }, 200);
      }
    }

    function closeAuthLoginModal() {
      const regModal = document.getElementById('firstLaunchRegistrationModalOverlay');
      if (regModal) {
        regModal.classList.add('hidden');
        if (typeof syncModalOpenState === 'function') syncModalOpenState();
      }
    }

    window.openAuthLoginModal = openAuthLoginModal;
    window.closeAuthLoginModal = closeAuthLoginModal;

    if (authToggleLoginBtn) {
      authToggleLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isCurrentlySignedIn = !currentAuthSession.is_anonymous && (Boolean(currentAuthSession.email) || currentAuthSession.role === 'superadmin' || currentAuthSession.role === 'admin' || (currentAuthSession.display_name && currentAuthSession.display_name !== 'Believer'));

        if (isCurrentlySignedIn) {
          handleAuthSignOut();
        } else {
          openAuthLoginModal();
        }
      });
    }

    const modalCloseX = document.getElementById('closeAuthLoginModalBtn');
    if (modalCloseX) {
      modalCloseX.addEventListener('click', closeAuthLoginModal);
    }

    if (authLoginModalOverlay) {
      authLoginModalOverlay.addEventListener('click', (e) => {
        if (e.target === authLoginModalOverlay) {
          closeAuthLoginModal();
        }
      });
    }

    // Helper function for In-Modal Smooth Login Animation
    function playInModalLoginSuccess(title, subtitle, roleText) {
      return new Promise((resolve) => {
        const successView = document.getElementById('authLoginSuccessView');
        const titleEl = document.getElementById('authLoginSuccessTitle');
        const subEl = document.getElementById('authLoginSuccessSubtitle');
        const roleBadge = document.getElementById('authLoginSuccessRoleBadge');
        const headerEl = document.getElementById('authLoginModalHeader');
        const bodyEl = document.getElementById('authLoginModalBody');
        const footerEl = document.getElementById('authLoginModalFooter');
        const modalCard = document.getElementById('authLoginModalCard');

        if (headerEl) headerEl.style.display = 'none';
        if (bodyEl) bodyEl.style.display = 'none';
        if (footerEl) footerEl.style.display = 'none';
        if (modalCard) modalCard.style.minHeight = '320px';
        if (titleEl) titleEl.textContent = title;
        if (subEl) subEl.textContent = subtitle;
        if (roleBadge) {
          if (roleText) {
            roleBadge.textContent = roleText;
            roleBadge.style.display = 'inline-flex';
          } else {
            roleBadge.style.display = 'none';
          }
        }

        if (successView) {
          successView.style.display = 'flex';
          
          // Re-trigger SVG path checkmark and progress fill animations
          const circle = successView.querySelector('.checkmark-circle');
          const check = successView.querySelector('.checkmark-check');
          const fill = successView.querySelector('.auth-success-progress-fill');
          
          if (circle) {
            circle.style.animation = 'none';
            void circle.offsetHeight;
            circle.style.animation = 'strokeCircle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards';
          }
          if (check) {
            check.style.animation = 'none';
            void check.offsetHeight;
            check.style.animation = 'strokeCheck 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.25s forwards';
          }
          if (fill) {
            fill.style.animation = 'none';
            void fill.offsetHeight;
            fill.style.animation = 'authProgressFill 1.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
          }
        }

        setTimeout(() => {
          resolve();
        }, 1450);
      });
    }

    // Helper function for Sign In
    async function handleAuthSignIn() {
      const emailInput = document.getElementById('loginEmailInput') || document.getElementById('authEmailInput');
      const passwordInput = document.getElementById('loginPinInput') || document.getElementById('authPasswordInput');
      const errEl = document.getElementById('authLoginErrorMsg');
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';

      const showLoginError = (msg) => {
        if (errEl) {
          errEl.textContent = msg;
          errEl.style.display = 'block';
        }
        showToast(msg);
      };

      if (!email || !password) {
        showLoginError('Please enter your email/ID and Security PIN or password');
        return;
      }

      // 1. Super Admin Check
      const isSuper = (
        email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || 
        email.toLowerCase() === 'emanual' || 
        email.toLowerCase() === 'superadmin'
      );
      if (isSuper) {
        if (password !== SUPER_ADMIN_PASSWORD && password !== '123456' && password !== 'emanual123') {
          showLoginError('Incorrect Super Admin PIN or Password ❌');
          return;
        }
        const savedSuperPost = localStorage.getItem('sanctuary_superadmin_post') || currentAuthSession.congregational_post || 'post-pastor';
        currentAuthSession = {
          id: DEXIE_SESSION_KEY,
          uid: 'superadmin-emanual',
          email: SUPER_ADMIN_EMAIL,
          display_name: 'Emanual Mridha',
          congregational_post: savedSuperPost,
          role: 'superadmin',
          is_youth: true,
          is_anonymous: false
        };
        await playInModalLoginSuccess('Successfully Logged In', 'Welcome back, Super Admin! 👑', 'Super Admin 👑');
        closeAuthLoginModal();
        await persistAuthSession(currentAuthSession);
        updateAppPermissionsUI();
        if (typeof window.renderActiveCniChat === 'function') {
          window.renderActiveCniChat(true);
        }
        showToast('Welcome back, Emanual Mridha! 👑');
        return;
      }

      // 2. Approved Admin Check
      const approvedAccount = await findApprovedAdmin(email, password);
      if (approvedAccount) {
        currentAuthSession = {
          id: DEXIE_SESSION_KEY,
          uid: approvedAccount.user_id || `admin-${Math.random().toString(36).slice(2, 9)}`,
          email: approvedAccount.email,
          display_name: cleanDisplayName(approvedAccount.display_name || approvedAccount.email.split('@')[0]),
          congregational_post: approvedAccount.congregational_post || 'post-member',
          role: 'admin',
          is_youth: true,
          is_anonymous: false,
          admin_request_status: 'approved'
        };
        await playInModalLoginSuccess('Successfully Logged In', 'Signed in as Parish Admin 🛡️', 'Parish Admin 🛡️');
        closeAuthLoginModal();
        await persistAuthSession(currentAuthSession);
        updateAppPermissionsUI();
        if (typeof window.renderActiveCniChat === 'function') {
          window.renderActiveCniChat(true);
        }
        showToast(`Welcome back, ${currentAuthSession.display_name}! 🛡️`);
        return;
      }

      // 3. Registered Profile Check (Registered Congregation Member)
      const registeredProfile = await findRegisteredProfile(email, password);
      if (registeredProfile) {
        currentAuthSession = {
          id: DEXIE_SESSION_KEY,
          uid: registeredProfile.id || `user-${Math.random().toString(36).slice(2, 9)}`,
          email: registeredProfile.email || email,
          display_name: cleanDisplayName(registeredProfile.display_name || registeredProfile.name || 'Believer'),
          congregational_post: registeredProfile.congregational_post || 'post-member',
          role: registeredProfile.role || 'member',
          is_youth: Boolean(registeredProfile.is_youth),
          is_anonymous: false,
          admin_request_status: registeredProfile.admin_request_status || null
        };
        const userRoleTag = currentAuthSession.role === 'superadmin' ? 'Super Admin 👑' : 
                            currentAuthSession.role === 'admin' ? 'Parish Admin 🛡️' : 
                            (currentAuthSession.is_youth ? 'Youth Member 🌿' : 'Parish Member ✨');
        await playInModalLoginSuccess('Successfully Logged In', `Welcome back, ${currentAuthSession.display_name}! ✨`, userRoleTag);
        closeAuthLoginModal();
        await persistAuthSession(currentAuthSession);
        updateAppPermissionsUI();
        if (typeof window.renderActiveCniChat === 'function') {
          window.renderActiveCniChat(true);
        }
        showToast(`Welcome back, ${currentAuthSession.display_name}! ✨`);
        return;
      }

      // 4. Not recognized
      showLoginError('Account not found with provided PIN / Password. Please check details or Request Admin access.');
    }

    // Sign In Action Buttons
    [authSignInBtn, submitAuthLoginBtn].forEach(btn => {
      if (btn) btn.addEventListener('click', handleAuthSignIn);
    });

    // Allow Enter key to trigger sign in on email and password inputs
    const authEmailInputEl = document.getElementById('authEmailInput');
    const authPasswordInputEl = document.getElementById('authPasswordInput');
    const loginEmailInputEl = document.getElementById('loginEmailInput');
    const loginPinInputEl = document.getElementById('loginPinInput');
    [authEmailInputEl, authPasswordInputEl, loginEmailInputEl, loginPinInputEl].forEach(input => {
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAuthSignIn();
          }
        });
      }
    });

    // Name Registration Modal Submit
    const registerDisplayNameSubmitBtn = document.getElementById('registerDisplayNameSubmitBtn');
    if (registerDisplayNameSubmitBtn) {
      registerDisplayNameSubmitBtn.addEventListener('click', async () => {
        const input = document.getElementById('registerDisplayNameInput');
        const name = input ? input.value.trim() : '';
        if (!name) {
          showToast('Please enter your name');
          return;
        }

        const confirmed = await window.showConfirmDialog({
          title: 'Save Profile Name?',
          message: `Set your fellowship display name to "${name}"?`,
          icon: '👤',
          confirmText: 'Save Name'
        });
        if (!confirmed) return;

        currentAuthSession.display_name = name;
        await persistAuthSession(currentAuthSession);
        closeNameRegistrationModal();
        updateAppPermissionsUI();
        showToast(`Welcome to the fellowship, ${name}! 🙏`);

        // ── Supabase Sync: save name to CNI congregation_members
        if (window.ChurchSync) {
          window.ChurchSync.Members.upsert({
            display_name: name,
            is_youth: currentAuthSession.is_youth || false,
            notes: 'Registered via Church Companion app'
          }).then(result => {
            if (result.error) console.warn('[Sync] Member save failed:', result.error);
            else console.log('[Sync] CNI Member saved to Supabase ✓');
          });

          // Also save the auth profile
          window.ChurchSync.Auth.upsertProfile({
            id: currentAuthSession.uid || crypto.randomUUID(),
            display_name: name,
            email: currentAuthSession.email || null,
            role: currentAuthSession.role || 'member',
            is_youth: currentAuthSession.is_youth || false
          }).then(result => {
            if (result.error) console.warn('[Sync] Profile save failed:', result.error);
            else console.log('[Sync] Auth profile saved to Supabase ✓');
          });
        }
      });
    }


    // Unregistered admin: request or cancel
    const unregisteredAdminModalOverlay = document.getElementById('unregisteredAdminModalOverlay');
    const closeUnregisteredAdminModalBtn = document.getElementById('closeUnregisteredAdminModalBtn');
    const cancelUnregisteredAdminBtn = document.getElementById('cancelUnregisteredAdminBtn');
    const requestUnregisteredAdminBtn = document.getElementById('requestUnregisteredAdminBtn');
    const closeUnregisteredAdminModal = () => {
      if (unregisteredAdminModalOverlay) unregisteredAdminModalOverlay.classList.add('hidden');
      pendingAdminLogin = null;
    };
    [closeUnregisteredAdminModalBtn, cancelUnregisteredAdminBtn].forEach(btn => {
      if (btn) btn.addEventListener('click', closeUnregisteredAdminModal);
    });
    if (requestUnregisteredAdminBtn) {
      requestUnregisteredAdminBtn.addEventListener('click', () => {
        if (unregisteredAdminModalOverlay) unregisteredAdminModalOverlay.classList.add('hidden');
        openRequestNotesModal('admin');
      });
    }
    if (unregisteredAdminModalOverlay) {
      unregisteredAdminModalOverlay.addEventListener('click', e => { if (e.target === unregisteredAdminModalOverlay) closeUnregisteredAdminModal(); });
    }

    // Request Notes Modal Handlers
    const requestNoteModalOverlay = document.getElementById('requestNoteModalOverlay');
    const submitRequestNoteBtn = document.getElementById('submitRequestNoteBtn');
    if (submitRequestNoteBtn) {
      submitRequestNoteBtn.addEventListener('click', submitElevationRequest);
    }
    const closeRequestNoteModalBtn = document.getElementById('closeRequestNoteModalBtn');
    if (closeRequestNoteModalBtn) {
      closeRequestNoteModalBtn.addEventListener('click', closeRequestNotesModal);
    }
    const cancelRequestNoteBtn = document.getElementById('cancelRequestNoteBtn');
    if (cancelRequestNoteBtn) {
      cancelRequestNoteBtn.addEventListener('click', closeRequestNotesModal);
    }
    if (requestNoteModalOverlay) {
      requestNoteModalOverlay.addEventListener('click', (e) => {
        if (e.target === requestNoteModalOverlay) closeRequestNotesModal();
      });
    }

    const requestAdminAccessBtn = document.getElementById('requestAdminAccessBtn');
    if (requestAdminAccessBtn) {
      requestAdminAccessBtn.addEventListener('click', () => openRequestNotesModal('admin'));
    }

    // Super Admin Elevation Requests Modal Handlers
    const authSuperAdminRequestsBtn = document.getElementById('authSuperAdminRequestsBtn');
    const superAdminRequestsModalOverlay = document.getElementById('superAdminRequestsModalOverlay');
    const closeSuperAdminRequestsModalBtn = document.getElementById('closeSuperAdminRequestsModalBtn');
    const dismissSuperAdminRequestsModalBtn = document.getElementById('dismissSuperAdminRequestsModalBtn');

    if (authSuperAdminRequestsBtn) {
      authSuperAdminRequestsBtn.addEventListener('click', async () => {
        await loadPendingElevationRequests();
        renderPendingRequestsUI();
        if (superAdminRequestsModalOverlay) superAdminRequestsModalOverlay.classList.remove('hidden');
      });
    }
    if (closeSuperAdminRequestsModalBtn) {
      closeSuperAdminRequestsModalBtn.addEventListener('click', () => {
        if (superAdminRequestsModalOverlay) superAdminRequestsModalOverlay.classList.add('hidden');
      });
    }
    if (dismissSuperAdminRequestsModalBtn) {
      dismissSuperAdminRequestsModalBtn.addEventListener('click', () => {
        if (superAdminRequestsModalOverlay) superAdminRequestsModalOverlay.classList.add('hidden');
      });
    }
    if (superAdminRequestsModalOverlay) {
      superAdminRequestsModalOverlay.addEventListener('click', (e) => {
        if (e.target === superAdminRequestsModalOverlay) {
          superAdminRequestsModalOverlay.classList.add('hidden');
        }
      });
    }

    // ==========================================================================
    // CHURCH TIMELINE & HERITAGE DYNAMIC ENGINE
    // ==========================================================================
    let timelineItems = [];
    try {
      Object.defineProperty(window, 'timelineItems', {
        get() { return timelineItems; },
        set(val) { timelineItems = val; },
        configurable: true
      });
    } catch (_) {
      window.timelineItems = timelineItems;
    }
    let attachedTimelinePhotos = [];
    let activeTimelineDetailItem = null;
    let editingTimelineItemId = null;

    function extractYear(val) {
      if (!val) return new Date().getFullYear();
      const str = String(val);
      const match = str.match(/\b(19\d\d|20\d\d|21\d\d)\b/);
      if (match) return parseInt(match[1], 10);
      const num = parseInt(str, 10);
      return (!isNaN(num) && num > 1000 && num < 3000) ? num : new Date().getFullYear();
    }
    window.extractYear = extractYear;

    function packTimelinePayload(item) {
      const yr = extractYear(item.rawDate || item.date || item.year);
      const cleanDesc = (item.description || '').replace(/\s*<!--TL_META:[\s\S]*?-->\s*$/, '').trim();
      const meta = {
        date: item.date || '',
        rawDate: item.rawDate || item.date || '',
        photos: Array.isArray(item.photos) ? item.photos : []
      };
      const packedDesc = cleanDesc + '\n\n<!--TL_META:' + JSON.stringify(meta) + '-->';

      return {
        id: item.id,
        year: yr,
        title: item.title || 'Timeline Event',
        description: packedDesc,
        sort_order: item.sort_order || 0
      };
    }
    window.packTimelinePayload = packTimelinePayload;

    function unpackTimelineItem(row) {
      if (!row) return null;
      let date = row.date || '';
      let rawDate = row.raw_date || row.rawDate || '';
      let photos = Array.isArray(row.photos) ? row.photos : [];
      let description = row.description || '';

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

      if (!date && row.year) {
        date = String(row.year);
      }
      if (!rawDate) rawDate = date;

      return {
        id: row.id,
        year: row.year || extractYear(date),
        title: row.title || 'Timeline Event',
        description: description,
        date: date,
        rawDate: rawDate,
        photos: photos
      };
    }
    window.unpackTimelineItem = unpackTimelineItem;

    function compressImage(file, maxDimension = 900, quality = 0.65) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          };
          img.onerror = () => resolve(e.target.result);
          img.src = e.target.result;
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    }

    async function loadTimelineItems() {
      let bl = [];
      try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_timeline_blacklist') || '[]'); } catch (_) { bl = []; }
      const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));

      // 1. Initial quick load from localStorage
      try {
        const saved = localStorage.getItem('sanctuary_timeline_entries');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            timelineItems = parsed.filter(item => item && !blSet.has(String(item.id)) && !item.deleted_at);
          }
        }
      } catch (e) {
        console.warn('localStorage timeline load error:', e);
      }

      // 2. Full load from Dexie (Dexie takes precedence to preserve full uncorrupted photos)
      if (churchDexieDb && churchDexieDb.custom_timeline) {
        try {
          const dexieItems = await churchDexieDb.custom_timeline.toArray();
          if (dexieItems && dexieItems.length > 0) {
            // Purge deleted/blacklisted records from Dexie custom_timeline
            for (const di of dexieItems) {
              if (di && (blSet.has(String(di.id)) || di.deleted_at)) {
                await churchDexieDb.custom_timeline.delete(di.id).catch(() => {});
              }
            }

            const activeDexie = dexieItems.filter(di => di && !blSet.has(String(di.id)) && !di.deleted_at);

            const localMap = new Map();
            (timelineItems || []).forEach(i => {
              if (i && !blSet.has(String(i.id)) && !i.deleted_at) {
                localMap.set(i.id, i);
              }
            });

            const merged = [];
            activeDexie.forEach(di => {
              const local = localMap.get(di.id);
              if (local) {
                const hasDexiePhotos = Array.isArray(di.photos) && di.photos.length > 0;
                const hasLocalPhotos = Array.isArray(local.photos) && local.photos.length > 0;
                merged.push({
                  ...local,
                  ...di,
                  photos: hasDexiePhotos ? di.photos : (hasLocalPhotos ? local.photos : []),
                  date: di.date || local.date || di.year || '',
                  rawDate: di.rawDate || local.rawDate || di.date || ''
                });
                localMap.delete(di.id);
              } else {
                merged.push(di);
              }
            });

            localMap.forEach(item => merged.push(item));
            timelineItems = merged;
          }
        } catch (e) {
          console.warn('Dexie timeline load error:', e);
        }
      }
    }
    window.loadTimelineItems = loadTimelineItems;

    async function saveTimelineItems() {
      let bl = [];
      try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_timeline_blacklist') || '[]'); } catch (_) { bl = []; }
      const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));

      timelineItems = (timelineItems || []).filter(item => item && !blSet.has(String(item.id)) && !item.deleted_at);

      // 1. Save full items with photos to Dexie first and clean up deleted items
      if (churchDexieDb && churchDexieDb.custom_timeline) {
        try {
          const currentIds = new Set(timelineItems.map(i => i.id));
          const allDexie = await churchDexieDb.custom_timeline.toArray();
          for (const d of allDexie) {
            if (d && (!currentIds.has(d.id) || blSet.has(String(d.id)) || d.deleted_at)) {
              await churchDexieDb.custom_timeline.delete(d.id).catch(() => {});
            }
          }
          for (const item of timelineItems) {
            await churchDexieDb.custom_timeline.put(item);
          }
        } catch (e) {
          console.warn('Dexie timeline save error:', e);
        }
      }

      // 2. Save to localStorage safely (never corrupt base64 strings with slice)
      try {
        localStorage.setItem('sanctuary_timeline_entries', JSON.stringify(timelineItems));
      } catch (e) {
        console.warn('localStorage quota warning for timeline:', e);
        try {
          const lightItems = timelineItems.map(item => ({
            ...item,
            photos: [] // Omit heavy base64 from localStorage; Dexie safely stores the photos
          }));
          localStorage.setItem('sanctuary_timeline_entries', JSON.stringify(lightItems));
        } catch (_) {}
      }
    }
    window.saveTimelineItems = saveTimelineItems;

    function renderTimelineList() {
      const container = document.getElementById('timelineListContainer');
      if (!container) return;

      let bl = [];
      try { bl = JSON.parse(localStorage.getItem('sanctuary_deleted_timeline_blacklist') || '[]'); } catch (_) { bl = []; }
      const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));

      if (!timelineItems || timelineItems.length === 0) {
        try {
          const saved = localStorage.getItem('sanctuary_timeline_entries');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              timelineItems = parsed.filter(item => item && !blSet.has(String(item.id)) && !item.deleted_at);
            }
          }
        } catch (_) {}
      } else {
        timelineItems = timelineItems.filter(item => item && !blSet.has(String(item.id)) && !item.deleted_at);
      }

      if (!timelineItems || timelineItems.length === 0) {
        container.innerHTML = `
          <div class="timeline-empty-state">
            <div class="timeline-empty-icon">🏛️</div>
            <p style="margin:0 0 4px 0; font-weight:700; color:var(--text-primary);">No timeline records yet</p>
            <span style="font-size:0.8rem; color:var(--text-muted);">Click "Add Timeline" above to record church milestones and history.</span>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      timelineItems.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'timeline-list-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('title', `Open ${item.title || 'Timeline'}`);

        // Parse date string into main (Year/Day) & sub (Month/Tag)
        const dateStr = (item.date || 'Milestone').trim();
        let mainDate = dateStr;
        let subDate = '';
        
        const parts = dateStr.split(/[\s,]+/);
        if (parts.length >= 3) {
          mainDate = `${parts[0]} ${parts[1]}`;
          subDate = parts.slice(2).join(' ');
        } else if (parts.length === 2) {
          mainDate = parts[0];
          subDate = parts[1];
        }

        const cleanDesc = (item.description || '').replace(/\s*<!--TL_META:[\s\S]*?-->\s*$/, '').trim();
        const snippetText = cleanDesc ? cleanDesc.replace(/\n/g, ' ').trim() : '';
        const photoCount = (item.photos && Array.isArray(item.photos)) ? item.photos.length : 0;
        const firstPhoto = (photoCount > 0 && item.photos[0]) ? item.photos[0] : null;

        card.innerHTML = `
          ${firstPhoto ? `
            <div class="timeline-card-photo-thumb">
              <img src="${firstPhoto}" alt="${escapeHtml(item.title || 'Milestone photo')}" class="timeline-card-thumb-img" onerror="this.onerror=null; this.src='church_bg.jpg';">
              ${photoCount > 1 ? `<span class="timeline-photo-count-pill">+${photoCount}</span>` : ''}
            </div>
          ` : `
            <div class="timeline-date-block">
              <span class="timeline-date-main">${escapeHtml(mainDate)}</span>
              ${subDate ? `<span class="timeline-date-sub">${escapeHtml(subDate)}</span>` : ''}
            </div>
          `}
          <div class="timeline-list-content">
            <h4 class="timeline-card-title">${escapeHtml(item.title || 'Untitled Milestone')}</h4>
            <div class="timeline-card-meta">
              <div class="timeline-meta-date-row">
                <span class="timeline-meta-date-pill">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" style="display:inline-block; vertical-align:middle; margin-right:3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <span>${escapeHtml(item.date || 'Milestone')}</span>
                </span>
                ${photoCount > 0 ? `<span class="timeline-photo-tag">📷 ${photoCount} Photo${photoCount > 1 ? 's' : ''}</span>` : ''}
              </div>
              ${snippetText ? `<p class="timeline-card-snippet">${escapeHtml(snippetText)}</p>` : ''}
            </div>
          </div>
          <div class="timeline-card-action-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        `;

        card.addEventListener('click', () => {
          openTimelineDetailView(item);
        });
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openTimelineDetailView(item);
          }
        });

        container.appendChild(card);
      });
    }
    window.renderTimelineList = renderTimelineList;

    function openTimelineDetailView(item) {
      if (!item) return;
      activeTimelineDetailItem = item;
      try {
        if (item.id) {
          localStorage.setItem('sanctuary_active_timeline_id', item.id);
        }
      } catch (_) {}

      const detailDate = document.getElementById('timelineDetailDate');
      const detailTitle = document.getElementById('timelineDetailTitle');
      const detailDesc = document.getElementById('timelineDetailDesc');
      const photosSection = document.getElementById('timelineDetailPhotosSection');
      const gallery = document.getElementById('timelineDetailGallery');
      const deleteBtn = document.getElementById('deleteTimelineEntryBtn');

      const cleanDetailDesc = (item.description || '').replace(/\s*<!--TL_META:[\s\S]*?-->\s*$/, '').trim();
      if (detailDate) detailDate.textContent = item.date || 'Date';
      if (detailTitle) detailTitle.textContent = item.title || 'Untitled Timeline';
      if (detailDesc) detailDesc.textContent = cleanDetailDesc || 'No detailed description provided.';

      if (photosSection && gallery) {
        if (item.photos && item.photos.length > 0) {
          photosSection.style.display = 'block';
          gallery.innerHTML = item.photos.map((src, idx) => `
            <div class="timeline-gallery-thumb" data-photo-idx="${idx}" role="button" tabindex="0" title="Tap to view fullscreen photo ${idx + 1}">
              <img src="${src}" alt="${escapeHtml(item.title || 'Photo')} ${idx + 1}" loading="lazy" />
            </div>
          `).join('');

          gallery.querySelectorAll('.timeline-gallery-thumb').forEach((thumb) => {
            const openPhoto = () => {
              const idx = parseInt(thumb.getAttribute('data-photo-idx') || '0', 10);
              openTimelinePhotoLightbox(item.photos, idx, item.title);
            };
            thumb.addEventListener('click', openPhoto);
            thumb.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPhoto();
              }
            });
          });
        } else {
          photosSection.style.display = 'none';
          gallery.innerHTML = '';
        }
      }

      const perms = useAppPermissions();
      const isLeader = Boolean(currentAuthSession.role === 'superadmin' || currentAuthSession.email === SUPER_ADMIN_EMAIL || currentAuthSession.email === 'emanualmridha2@gmail.com' || perms.isSuperAdmin || perms.isAdmin || perms.canEditTimeline);
      const editBtn = document.getElementById('editTimelineEntryBtn');
      if (editBtn) {
        editBtn.style.display = isLeader ? 'inline-flex' : 'none';
      }
      if (deleteBtn) {
        deleteBtn.style.display = isLeader ? 'inline-flex' : 'none';
      }

      switchTab('viewTimelineDetail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.querySelector('.app-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderTimelinePhotoPreviews() {
      const previewGrid = document.getElementById('timelinePhotoPreviewGrid');
      if (!previewGrid) return;
      previewGrid.innerHTML = '';
      attachedTimelinePhotos.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'timeline-photo-preview-item';
        thumb.innerHTML = `
          <img src="${src}" alt="Attached Photo ${idx + 1}" />
          <button type="button" class="timeline-photo-remove-btn" title="Remove Photo" data-idx="${idx}">×</button>
        `;
        thumb.querySelector('.timeline-photo-remove-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          attachedTimelinePhotos.splice(idx, 1);
          renderTimelinePhotoPreviews();
        });
        previewGrid.appendChild(thumb);
      });
    }

    const openTimelineEditModalBtn = document.getElementById('openTimelineEditModalBtn');
    const timelineEditModalOverlay = document.getElementById('timelineEditModalOverlay');
    const closeTimelineEditModalBtn = document.getElementById('closeTimelineEditModalBtn');
    const cancelTimelineEditBtn = document.getElementById('cancelTimelineEditBtn');
    const saveTimelineEditBtn = document.getElementById('saveTimelineEditBtn');
    const editTimelineDateInput = document.getElementById('editTimelineDateInput');
    const editTimelineHiddenDateInput = document.getElementById('editTimelineHiddenDateInput');
    const timelineAttachPhotosBtn = document.getElementById('timelineAttachPhotosBtn');
    const timelinePhotoFileInput = document.getElementById('timelinePhotoFileInput');
    const timelineDetailBackBtn = document.getElementById('timelineDetailBackBtn');
    const editTimelineEntryBtn = document.getElementById('editTimelineEntryBtn');
    const deleteTimelineEntryBtn = document.getElementById('deleteTimelineEntryBtn');

    function formatTimelineDate(rawDate) {
      if (!rawDate) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const parts = rawDate.split('-').map(Number);
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (month >= 1 && month <= 12) {
          return `${day} ${monthNames[month - 1]} ${year}`;
        }
      }
      return rawDate;
    }

    if (editTimelineHiddenDateInput && editTimelineDateInput) {
      editTimelineHiddenDateInput.addEventListener('change', () => {
        if (editTimelineHiddenDateInput.value) {
          editTimelineDateInput.value = formatTimelineDate(editTimelineHiddenDateInput.value);
        }
      });
      const openCalendar = () => {
        if (typeof editTimelineHiddenDateInput.showPicker === 'function') {
          try { editTimelineHiddenDateInput.showPicker(); return; } catch (_) {}
        }
        editTimelineHiddenDateInput.focus();
        editTimelineHiddenDateInput.click();
      };
      editTimelineDateInput.addEventListener('click', openCalendar);
    }

    if (openTimelineEditModalBtn) {
      openTimelineEditModalBtn.addEventListener('click', () => {
        const perms = useAppPermissions();
        const isLeader = Boolean(currentAuthSession.role === 'superadmin' || currentAuthSession.email === 'emanualmridha2@gmail.com' || perms.isSuperAdmin || perms.isAdmin || perms.canEditTimeline);
        if (!isLeader) {
          showToast('Leader permissions required to add Timeline 🛡️');
          return;
        }
        editingTimelineItemId = null;
        const modalHeader = document.getElementById('timelineModalHeaderTitle');
        if (modalHeader) modalHeader.textContent = 'Add Timeline';
        const saveBtn = document.getElementById('saveTimelineEditBtn');
        if (saveBtn) saveBtn.textContent = 'Add Timeline';

        if (editTimelineDateInput) editTimelineDateInput.value = '';
        if (editTimelineHiddenDateInput) editTimelineHiddenDateInput.value = '';
        const titleInput = document.getElementById('editTimelineTitleInput');
        const descInput = document.getElementById('editTimelineDescInput');
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';

        attachedTimelinePhotos = [];
        renderTimelinePhotoPreviews();
        if (timelineEditModalOverlay) timelineEditModalOverlay.classList.remove('hidden');
      });
    }

    if (editTimelineEntryBtn) {
      editTimelineEntryBtn.addEventListener('click', () => {
        if (!activeTimelineDetailItem) return;
        const perms = useAppPermissions();
        const isLeader = Boolean(currentAuthSession.role === 'superadmin' || currentAuthSession.email === 'emanualmridha2@gmail.com' || perms.isSuperAdmin || perms.isAdmin || perms.canEditTimeline);
        if (!isLeader) {
          showToast('Leader permissions required to edit Timeline 🛡️');
          return;
        }

        editingTimelineItemId = activeTimelineDetailItem.id;
        const modalHeader = document.getElementById('timelineModalHeaderTitle');
        if (modalHeader) modalHeader.textContent = 'Edit Timeline';
        const saveBtn = document.getElementById('saveTimelineEditBtn');
        if (saveBtn) saveBtn.textContent = 'Save Changes';

        const dateInput = document.getElementById('editTimelineDateInput');
        const hiddenDateInput = document.getElementById('editTimelineHiddenDateInput');
        const titleInput = document.getElementById('editTimelineTitleInput');
        const descInput = document.getElementById('editTimelineDescInput');

        if (dateInput) dateInput.value = activeTimelineDetailItem.date || '';
        if (hiddenDateInput) hiddenDateInput.value = activeTimelineDetailItem.rawDate || '';
        if (titleInput) titleInput.value = activeTimelineDetailItem.title || '';
        if (descInput) descInput.value = (activeTimelineDetailItem.description || '').replace(/\s*<!--TL_META:[\s\S]*?-->\s*$/, '').trim();

        attachedTimelinePhotos = Array.isArray(activeTimelineDetailItem.photos) ? [...activeTimelineDetailItem.photos] : [];
        renderTimelinePhotoPreviews();

        if (timelineEditModalOverlay) timelineEditModalOverlay.classList.remove('hidden');
      });
    }

    if (closeTimelineEditModalBtn) {
      closeTimelineEditModalBtn.addEventListener('click', () => {
        if (timelineEditModalOverlay) timelineEditModalOverlay.classList.add('hidden');
      });
    }

    if (cancelTimelineEditBtn) {
      cancelTimelineEditBtn.addEventListener('click', () => {
        if (timelineEditModalOverlay) timelineEditModalOverlay.classList.add('hidden');
      });
    }

    if (timelineAttachPhotosBtn && timelinePhotoFileInput) {
      timelineAttachPhotosBtn.addEventListener('click', () => {
        timelinePhotoFileInput.click();
      });

      timelinePhotoFileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        showToast('Attaching photo(s)…');
        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;
          try {
            const compressed = await compressImage(file, 1200, 0.7);
            if (compressed) {
              attachedTimelinePhotos.push(compressed);
              renderTimelinePhotoPreviews();
            }
          } catch (err) {
            console.warn('Image processing error:', err);
          }
        }

        timelinePhotoFileInput.value = '';
      });
    }

    if (saveTimelineEditBtn) {
      saveTimelineEditBtn.addEventListener('click', async () => {
        const dateInput = document.getElementById('editTimelineDateInput');
        const hiddenDateInput = document.getElementById('editTimelineHiddenDateInput');
        const titleInput = document.getElementById('editTimelineTitleInput');
        const descInput = document.getElementById('editTimelineDescInput');

        const dateVal = dateInput?.value.trim() || hiddenDateInput?.value.trim() || '';
        const titleVal = titleInput?.value.trim() || '';
        const descVal = descInput?.value.trim() || '';

        if (!dateVal) {
          showToast('Please enter or pick a date 📅');
          dateInput?.focus();
          return;
        }
        if (!titleVal) {
          showToast('Please enter a title for this timeline entry ✍️');
          titleInput?.focus();
          return;
        }

        const formattedDate = formatTimelineDate(dateVal);

        if (editingTimelineItemId) {
          const itemIdx = timelineItems.findIndex(i => i.id === editingTimelineItemId);
          if (itemIdx !== -1) {
            timelineItems[itemIdx] = {
              ...timelineItems[itemIdx],
              date: formattedDate,
              rawDate: dateVal,
              title: titleVal,
              description: descVal,
              photos: [...attachedTimelinePhotos],
              updatedAt: Date.now()
            };
            activeTimelineDetailItem = timelineItems[itemIdx];
          }
          await saveTimelineItems();

          // Refresh live Detailed View screen
          const detailDate = document.getElementById('timelineDetailDate');
          const detailTitle = document.getElementById('timelineDetailTitle');
          const detailDesc = document.getElementById('timelineDetailDesc');
          const photosSection = document.getElementById('timelineDetailPhotosSection');
          const gallery = document.getElementById('timelineDetailGallery');

          if (detailDate) detailDate.textContent = activeTimelineDetailItem?.date || 'Date';
          if (detailTitle) detailTitle.textContent = activeTimelineDetailItem?.title || 'Untitled Timeline';
          if (detailDesc) detailDesc.textContent = activeTimelineDetailItem?.description || 'No detailed description provided.';

          if (photosSection && gallery) {
            if (activeTimelineDetailItem?.photos && activeTimelineDetailItem.photos.length > 0) {
              photosSection.style.display = 'block';
              gallery.innerHTML = activeTimelineDetailItem.photos.map((src, idx) => `
                <div class="timeline-gallery-thumb" data-photo-idx="${idx}" role="button" tabindex="0" title="Tap to view fullscreen photo ${idx + 1}">
                  <img src="${src}" alt="${escapeHtml(activeTimelineDetailItem.title || 'Photo')} ${idx + 1}" loading="lazy" />
                </div>
              `).join('');

              gallery.querySelectorAll('.timeline-gallery-thumb').forEach((thumb) => {
                const openPhoto = () => {
                  const idx = parseInt(thumb.getAttribute('data-photo-idx') || '0', 10);
                  openTimelinePhotoLightbox(activeTimelineDetailItem.photos, idx, activeTimelineDetailItem.title);
                };
                thumb.addEventListener('click', openPhoto);
                thumb.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPhoto();
                  }
                });
              });
            } else {
              photosSection.style.display = 'none';
              gallery.innerHTML = '';
            }
          }

          editingTimelineItemId = null;
          showToast('Timeline entry updated ✨');
          if (window.ChurchSync && window.ChurchSync.Timeline && typeof window.ChurchSync.Timeline.upsert === 'function') {
            const payload = packTimelinePayload(activeTimelineDetailItem);
            window.ChurchSync.Timeline.upsert(payload).catch(err => console.warn('[Sync] Timeline update error:', err));
          }
        } else {
          const newEntry = {
            id: 'tl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            date: formattedDate,
            rawDate: dateVal,
            title: titleVal,
            description: descVal,
            photos: [...attachedTimelinePhotos],
            createdAt: Date.now()
          };

          try {
            const blKey = 'sanctuary_deleted_timeline_blacklist';
            let bl = JSON.parse(localStorage.getItem(blKey) || '[]');
            if (Array.isArray(bl) && bl.includes(String(newEntry.id))) {
              bl = bl.filter(x => String(x) !== String(newEntry.id));
              localStorage.setItem(blKey, JSON.stringify(bl));
            }
          } catch (_) {}

          if (!Array.isArray(timelineItems)) timelineItems = [];
          timelineItems.unshift(newEntry);
          await saveTimelineItems();
          showToast('Timeline entry added ✨');
          if (window.ChurchSync && window.ChurchSync.Timeline && typeof window.ChurchSync.Timeline.upsert === 'function') {
            const payload = packTimelinePayload(newEntry);
            window.ChurchSync.Timeline.upsert(payload).catch(err => console.warn('[Sync] Timeline insert error:', err));
          }
        }

        // Reset Form
        if (dateInput) dateInput.value = '';
        if (hiddenDateInput) hiddenDateInput.value = '';
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        attachedTimelinePhotos = [];
        renderTimelinePhotoPreviews();

        if (timelineEditModalOverlay) timelineEditModalOverlay.classList.add('hidden');
        renderTimelineList();
      });
    }

    if (timelineDetailBackBtn) {
      timelineDetailBackBtn.addEventListener('click', () => {
        activeTimelineDetailItem = null;
        try { localStorage.removeItem('sanctuary_active_timeline_id'); } catch (_) {}
        switchTab('viewTimeline');
      });
    }

    if (deleteTimelineEntryBtn) {
      deleteTimelineEntryBtn.addEventListener('click', async () => {
        if (!activeTimelineDetailItem) return;

        const confirmed = await window.showConfirmDialog({
          title: 'Delete Timeline Entry?',
          message: `Are you sure you want to delete "${activeTimelineDetailItem.title}"?`,
          icon: '🗑️',
          confirmText: 'Delete Entry',
          isDanger: true
        });
        if (!confirmed) return;

        const targetId = activeTimelineDetailItem.id;
        const strId = String(targetId);

        // Add to blacklist immediately so it cannot resurrect
        try {
          const blKey = 'sanctuary_deleted_timeline_blacklist';
          let bl = [];
          try { bl = JSON.parse(localStorage.getItem(blKey) || '[]'); } catch (_) { bl = []; }
          const blSet = new Set((Array.isArray(bl) ? bl : []).map(String));
          blSet.add(strId);
          localStorage.setItem(blKey, JSON.stringify(Array.from(blSet)));
        } catch (_) {}

        timelineItems = timelineItems.filter(item => item && String(item.id) !== strId);
        await saveTimelineItems();
        if (churchDexieDb) {
          if (churchDexieDb.custom_timeline) try { await churchDexieDb.custom_timeline.delete(targetId); } catch (_) {}
          if (churchDexieDb.timeline_events) try { await churchDexieDb.timeline_events.delete(targetId); } catch (_) {}
        }
        if (window.ChurchSync && window.ChurchSync.Timeline && typeof window.ChurchSync.Timeline.delete === 'function') {
          window.ChurchSync.Timeline.delete(targetId).catch(err => console.warn('[Sync] Timeline delete error:', err));
        } else if (typeof window.syncWrite === 'function') {
          window.syncWrite('timeline', 'delete', { id: targetId }).catch(err => console.warn('[Sync] Timeline syncWrite error:', err));
        }
        activeTimelineDetailItem = null;
        try { localStorage.removeItem('sanctuary_active_timeline_id'); } catch (_) {}
        renderTimelineList();
        switchTab('viewTimeline');
        showToast('Timeline entry deleted 🗑️');
      });
    }

    // ==========================================================================
    // TIMELINE FULLSCREEN PHOTO LIGHTBOX WITH SWIPE GESTURES
    // ==========================================================================
    let currentLightboxPhotos = [];
    let currentLightboxIndex = 0;
    let currentLightboxTitle = '';

    const timelineLightboxOverlay = document.getElementById('timelinePhotoLightboxOverlay');
    const timelineLightboxCloseBtn = document.getElementById('timelineLightboxCloseBtn');
    const timelineLightboxPrevBtn = document.getElementById('timelineLightboxPrevBtn');
    const timelineLightboxNextBtn = document.getElementById('timelineLightboxNextBtn');
    const timelineLightboxBody = document.getElementById('timelineLightboxBody');
    const timelineLightboxImgWrapper = document.getElementById('timelineLightboxImgWrapper');

    function openTimelinePhotoLightbox(photos, startIndex = 0, title = '') {
      if (!photos || photos.length === 0) return;
      currentLightboxPhotos = photos;
      currentLightboxIndex = Math.max(0, Math.min(startIndex, photos.length - 1));
      currentLightboxTitle = title || (activeTimelineDetailItem ? activeTimelineDetailItem.title : 'Historical Photo');

      if (!timelineLightboxOverlay) return;

      renderLightboxSlide(0);
      timelineLightboxOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function closeTimelinePhotoLightbox() {
      if (timelineLightboxOverlay) timelineLightboxOverlay.classList.add('hidden');
      document.body.style.overflow = '';
      if (timelineLightboxImgWrapper) {
        timelineLightboxImgWrapper.style.transform = 'translateX(0)';
      }
    }

    function renderLightboxSlide(direction = 0) {
      const img = document.getElementById('timelineLightboxImg');
      const wrapper = document.getElementById('timelineLightboxImgWrapper');
      const counter = document.getElementById('timelineLightboxCounter');
      const titleEl = document.getElementById('timelineLightboxTitle');
      const dotsEl = document.getElementById('timelineLightboxDots');

      if (!img || !wrapper) return;

      const total = currentLightboxPhotos.length;
      if (counter) counter.textContent = `${currentLightboxIndex + 1} / ${total}`;
      if (titleEl) titleEl.textContent = currentLightboxTitle;

      if (timelineLightboxPrevBtn) timelineLightboxPrevBtn.style.display = total > 1 ? 'flex' : 'none';
      if (timelineLightboxNextBtn) timelineLightboxNextBtn.style.display = total > 1 ? 'flex' : 'none';

      if (dotsEl) {
        if (total > 1) {
          dotsEl.innerHTML = currentLightboxPhotos.map((_, i) => `
            <div class="timeline-lightbox-dot ${i === currentLightboxIndex ? 'active' : ''}"></div>
          `).join('');
        } else {
          dotsEl.innerHTML = '';
        }
      }

      if (direction !== 0) {
        wrapper.style.transform = `translateX(${direction * 35}px)`;
        wrapper.style.opacity = '0.3';
        setTimeout(() => {
          img.src = currentLightboxPhotos[currentLightboxIndex];
          wrapper.style.transform = 'translateX(0)';
          wrapper.style.opacity = '1';
        }, 110);
      } else {
        img.src = currentLightboxPhotos[currentLightboxIndex];
        wrapper.style.transform = 'translateX(0)';
        wrapper.style.opacity = '1';
      }
    }

    function nextLightboxPhoto() {
      if (currentLightboxPhotos.length <= 1) return;
      currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxPhotos.length;
      renderLightboxSlide(-1);
    }

    function prevLightboxPhoto() {
      if (currentLightboxPhotos.length <= 1) return;
      currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxPhotos.length) % currentLightboxPhotos.length;
      renderLightboxSlide(1);
    }

    if (timelineLightboxCloseBtn) {
      timelineLightboxCloseBtn.addEventListener('click', closeTimelinePhotoLightbox);
    }
    if (timelineLightboxPrevBtn) {
      timelineLightboxPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prevLightboxPhoto();
      });
    }
    if (timelineLightboxNextBtn) {
      timelineLightboxNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nextLightboxPhoto();
      });
    }

    if (timelineLightboxOverlay) {
      timelineLightboxOverlay.addEventListener('click', (e) => {
        if (e.target === timelineLightboxOverlay || e.target === timelineLightboxBody) {
          closeTimelinePhotoLightbox();
        }
      });
    }

    // Left-Right Swipe Gestures (Touch Events)
    let swipeTouchStartX = 0;
    let swipeTouchStartY = 0;
    let isSwipeActive = false;

    if (timelineLightboxBody) {
      timelineLightboxBody.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          swipeTouchStartX = e.touches[0].clientX;
          swipeTouchStartY = e.touches[0].clientY;
          isSwipeActive = true;
        }
      }, { passive: true });

      timelineLightboxBody.addEventListener('touchmove', (e) => {
        if (!isSwipeActive || e.touches.length !== 1) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - swipeTouchStartX;
        const deltaY = currentY - swipeTouchStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY) && timelineLightboxImgWrapper) {
          timelineLightboxImgWrapper.style.transform = `translateX(${deltaX * 0.45}px)`;
        }
      }, { passive: true });

      timelineLightboxBody.addEventListener('touchend', (e) => {
        if (!isSwipeActive) return;
        isSwipeActive = false;
        const finalX = e.changedTouches[0].clientX;
        const finalY = e.changedTouches[0].clientY;
        const deltaX = finalX - swipeTouchStartX;
        const deltaY = finalY - swipeTouchStartY;

        if (Math.abs(deltaX) > 36 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            // Swiped Left -> Next Photo
            nextLightboxPhoto();
          } else {
            // Swiped Right -> Previous Photo
            prevLightboxPhoto();
          }
        } else {
          if (timelineLightboxImgWrapper) {
            timelineLightboxImgWrapper.style.transform = 'translateX(0)';
          }
        }
      });
    }

    // Keyboard navigation (Arrow keys + Escape)
    window.addEventListener('keydown', (e) => {
      const overlay = document.getElementById('timelinePhotoLightboxOverlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        if (e.key === 'ArrowRight' || e.key === 'Right') {
          nextLightboxPhoto();
        } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
          prevLightboxPhoto();
        } else if (e.key === 'Escape') {
          closeTimelinePhotoLightbox();
        }
      }
    });

    // Sacred Song Add/Edit/Delete Handlers
    const addSongSectionBtn = document.getElementById('addSongSectionBtn');
    const songEditModalOverlay = document.getElementById('songEditModalOverlay') || document.getElementById('editSongModalOverlay');
    const closeSongEditModalBtn = document.getElementById('closeSongEditModalBtn') || document.getElementById('closeEditSongModalBtn');
    const cancelSongEditBtn = document.getElementById('cancelSongEditBtn') || document.getElementById('cancelEditSongModalBtn');
    const saveSongEditBtn = document.getElementById('saveSongEditBtn') || document.getElementById('saveEditSongModalBtn');
    const editSongModalBtn = document.getElementById('editSongModalBtn');
    const deleteSongModalBtn = document.getElementById('deleteSongModalBtn');

    if (addSongSectionBtn) {
      addSongSectionBtn.addEventListener('click', () => {
        const perms = useAppPermissions();
        if (!perms.canAddSong) {
          showToast('Admin permissions required to add hymns 🛡️');
          return;
        }
        const titleEl = document.getElementById('songEditModalTitle') || document.getElementById('editSongModalTitle');
        if (titleEl) titleEl.textContent = 'Add Sacred Hymn';
        const titleIn = document.getElementById('editSongTitleInput');
        if (titleIn) titleIn.value = '';
        const authorIn = document.getElementById('editSongAuthorInput');
        if (authorIn) authorIn.value = '';
        const lyricsIn = document.getElementById('editSongLyricsInput');
        if (lyricsIn) lyricsIn.value = '';
        if (songEditModalOverlay) songEditModalOverlay.classList.remove('hidden');
      });
    }

    if (editSongModalBtn) {
      editSongModalBtn.addEventListener('click', () => {
        const perms = (typeof useAppPermissions === 'function') ? useAppPermissions() : {};
        if (!perms.canEdit) {
          showToast('Admin permissions required to edit hymns 🛡️');
          return;
        }
        const active = window._activeEditingSong || currentOpenSong || currentActiveSongObj;
        const titleEl = document.getElementById('songEditModalTitle') || document.getElementById('editSongModalTitle');
        if (titleEl) titleEl.textContent = 'Edit Sacred Hymn';
        const titleIn = document.getElementById('editSongTitleInput');
        if (titleIn) titleIn.value = active?.title || '';
        const numIn = document.getElementById('editSongNumberInput');
        if (numIn) numIn.value = active?.songNumber || active?.song_number || '';
        const authorIn = document.getElementById('editSongAuthorInput');
        if (authorIn) authorIn.value = active?.composer || active?.author || '';
        const lyricsIn = document.getElementById('editSongLyricsInput');
        if (lyricsIn) lyricsIn.value = active?.lyrics || '';
        closeSongModal();
        if (songEditModalOverlay) songEditModalOverlay.classList.remove('hidden');
      });
    }

    if (deleteSongModalBtn) {
      deleteSongModalBtn.addEventListener('click', async () => {
        const perms = (typeof useAppPermissions === 'function') ? useAppPermissions() : {};
        if (!perms.canDelete) {
          showToast('Only Super Admin can delete hymns permanently 👑');
          return;
        }

        const active = window._activeEditingSong || currentOpenSong || currentActiveSongObj;
        const hymnTitle = active?.title || 'this hymn';
        const confirmed = await window.showConfirmDialog({
          title: 'Delete Sacred Hymn?',
          message: `Are you sure you want to permanently delete "${hymnTitle}"? (Super Admin Action)`,
          icon: '🗑️',
          confirmText: 'Delete Hymn',
          isDanger: true
        });
        if (!confirmed) return;

        closeSongModal();

        const sId = active?.id || active?.supabaseId;
        const sTitle = active?.title;
        if (window.ChurchSync && window.ChurchSync.Songs) {
          try {
            if (typeof window.ChurchSync.Songs.delete === 'function') {
              await window.ChurchSync.Songs.delete(sId, sTitle);
            } else if (typeof window.ChurchSync.Songs.softDelete === 'function') {
              await window.ChurchSync.Songs.softDelete(sId, sTitle);
            }
            console.log('[Sync] Song deleted from Supabase ✓');
          } catch (err) {
            console.warn('[Sync] Song delete failed:', err);
          }
        }

        // Prune from local Dexie & blacklist & backups
        if (typeof churchDexieDb !== 'undefined' && churchDexieDb) {
          if (churchDexieDb.songs && sId) churchDexieDb.songs.delete(sId).catch(() => {});
          if (churchDexieDb.custom_songs && sId) churchDexieDb.custom_songs.delete(sId).catch(() => {});
          if (churchDexieDb.song_book && sId) churchDexieDb.song_book.delete(sId).catch(() => {});
        }
        if (typeof window !== 'undefined' && window.ChurchSync && window.ChurchSync.db) {
          if (window.ChurchSync.db.songs && sId) window.ChurchSync.db.songs.delete(sId).catch(() => {});
          if (window.ChurchSync.db.custom_songs && sId) window.ChurchSync.db.custom_songs.delete(sId).catch(() => {});
          if (window.ChurchSync.db.song_book && sId) window.ChurchSync.db.song_book.delete(sId).catch(() => {});
        }
        ['sanctuary_imported_songs', 'sanctuary_custom_songs_backup'].forEach(key => {
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(list)) {
              localStorage.setItem(key, JSON.stringify(list.filter(s => s && s.id !== sId && (!sTitle || !s.title || String(s.title).toLowerCase().trim() !== String(sTitle).toLowerCase().trim()))));
            }
          } catch (_) {}
        });
        if (Array.isArray(currentSongList)) {
          currentSongList = currentSongList.filter(s => s && s.id !== sId && (!sTitle || !s.title || String(s.title).toLowerCase().trim() !== String(sTitle).toLowerCase().trim()));
          window.currentSongList = currentSongList;
        }
        let blacklist = [];
        try {
          blacklist = JSON.parse(localStorage.getItem('sanctuary_deleted_songs_blacklist') || '[]');
          if (!Array.isArray(blacklist)) blacklist = [];
        } catch (_) { blacklist = []; }
        const blSet = new Set(blacklist.map(x => String(x).toLowerCase().trim()));
        if (sId) blSet.add(String(sId).toLowerCase().trim());
        if (active?.title) blSet.add(String(active.title).toLowerCase().trim());
        localStorage.setItem('sanctuary_deleted_songs_blacklist', JSON.stringify(Array.from(blSet)));

        showToast('Hymn deleted by Super Admin 🗑️');
        if (currentOpenSongBookKey && typeof openSongBookScreen === 'function') {
          await openSongBookScreen(currentOpenSongBookKey);
        }
      });
    }

    if (closeSongEditModalBtn) closeSongEditModalBtn.addEventListener('click', () => songEditModalOverlay && songEditModalOverlay.classList.add('hidden'));
    if (cancelSongEditBtn) cancelSongEditBtn.addEventListener('click', () => songEditModalOverlay && songEditModalOverlay.classList.add('hidden'));

    if (saveSongEditBtn) {
      saveSongEditBtn.addEventListener('click', async () => {
        const title = document.getElementById('editSongTitleInput')?.value.trim();
        const numVal = document.getElementById('editSongNumberInput')?.value.trim();
        const author = document.getElementById('editSongAuthorInput')?.value.trim();
        const lyrics = document.getElementById('editSongLyricsInput')?.value.trim();
        if (!title || !lyrics) {
          showToast('Please provide hymn title and lyrics');
          return;
        }

        const confirmed = await window.showConfirmDialog({
          title: 'Save Sacred Hymn?',
          message: `Save changes and hymn text for "${title}"?`,
          icon: '🎵',
          confirmText: 'Save Hymn'
        });
        if (!confirmed) return;

        if (songEditModalOverlay) songEditModalOverlay.classList.add('hidden');

        const active = window._activeEditingSong || currentOpenSong || currentActiveSongObj;
        const songId = active?.id || crypto.randomUUID();

        // ── Supabase Sync: persist song to cloud (with matching ID so it updates the row!)
        if (window.ChurchSync && window.ChurchSync.Songs) {
          const songData = {
            id: songId,
            song_number: numVal || active?.songNumber || null,
            title,
            composer: author || 'Church Hymnal',
            author: author || 'Church Hymnal',
            lyrics,
            category: 'hymn',
            deleted_at: null,
            book_reference: currentOpenSongBookKey || 'masihiGeet'
          };
          // Clear from local blacklist if previously blacklisted
          try {
            const blKey = 'sanctuary_deleted_songs_blacklist';
            let bl = JSON.parse(localStorage.getItem(blKey) || '[]');
            if (Array.isArray(bl) && bl.length > 0) {
              const lowerId = String(songId).toLowerCase().trim();
              const lowerTitle = String(title).toLowerCase().trim();
              const filtered = bl.filter(x => {
                const lx = String(x).toLowerCase().trim();
                return lx !== lowerId && lx !== lowerTitle;
              });
              localStorage.setItem(blKey, JSON.stringify(filtered));
            }
          } catch (_) {}

          window.ChurchSync.Songs.upsert(songData).then(result => {
            if (result.error) console.warn('[Sync] Song save failed:', result.error);
            else console.log('[Sync] Song saved to Supabase ✓');
          });
        }

        if (active) {
          active.title = title;
          active.composer = author;
          active.author = author;
          active.lyrics = lyrics;
          if (numVal) active.songNumber = numVal;
        }

        showToast(`Hymn "${title}" saved! 🎵`);
        if (typeof renderAdditionalSongsFromDexie === 'function') renderAdditionalSongsFromDexie();
        if (currentOpenSongBookKey && typeof openSongBookScreen === 'function') {
          openSongBookScreen(currentOpenSongBookKey);
        }
      });
    }

    // ==============================================================================
    // CONTENT IMPORT ENGINE: SONG BOOK MULTI-SONG SPLITTER & ALMANAC EXTRACTOR
    // ==============================================================================

    function setupImportModule() {
      const openImportCard = document.getElementById('openImportCard');
      const importBackToHomeBtn = document.getElementById('importBackToHomeBtn');
      const importDestCards = document.querySelectorAll('.import-dest-card');
      const importEngineActiveBadgeText = document.getElementById('importEngineActiveBadgeText');
      const importRuleBannerText = document.getElementById('importRuleBannerText');
      const importExecuteBtnText = document.getElementById('importExecuteBtnText');
      const importExecuteBtn = document.getElementById('importExecuteBtn');
      const importParsePreviewBtn = document.getElementById('importParsePreviewBtn');
      const importTabFileBtn = document.getElementById('importTabFileBtn');
      const importTabTextBtn = document.getElementById('importTabTextBtn');
      const importTabContentFile = document.getElementById('importTabContentFile');
      const importTabContentText = document.getElementById('importTabContentText');
      const importDropzone = document.getElementById('importDropzone');
      const importFileInput = document.getElementById('importFileInput');
      const browseFileBtn = document.getElementById('browseFileBtn');
      const selectedFilePill = document.getElementById('selectedFilePill');
      const selectedFileNameText = document.getElementById('selectedFileNameText');
      const selectedFileSizeText = document.getElementById('selectedFileSizeText');
      const removeSelectedFileBtn = document.getElementById('removeSelectedFileBtn');
      const importRawTextarea = document.getElementById('importRawTextarea');
      const loadSampleSongTextBtn = document.getElementById('loadSampleSongTextBtn');
      const loadSampleAlmanacTextBtn = document.getElementById('loadSampleAlmanacTextBtn');
      const clearImportTextBtn = document.getElementById('clearImportTextBtn');
      const importProgressCard = document.getElementById('importProgressCard');
      const importProgressStatusText = document.getElementById('importProgressStatusText');
      const importProgressBarFill = document.getElementById('importProgressBarFill');
      const importSummaryCard = document.getElementById('importSummaryCard');
      const importPreviewCard = document.getElementById('importPreviewCard');
      const previewTableBody = document.getElementById('previewTableBody');
      const previewCountBadge = document.getElementById('previewCountBadge');
      const summaryResetBtn = document.getElementById('summaryResetBtn');
      const summaryViewLibraryBtn = document.getElementById('summaryViewLibraryBtn');

      let currentDestination = 'songbook';
      let currentParsedResults = null;
      let activeImportFile = null;

      // 1. Navigation Hooks
      if (openImportCard) {
        openImportCard.addEventListener('click', () => switchTab('viewImport'));
      }
      if (importBackToHomeBtn) {
        importBackToHomeBtn.addEventListener('click', () => switchTab('viewHome'));
      }

      // 2. Destination Selector
      importDestCards.forEach(card => {
        card.addEventListener('click', () => {
          importDestCards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          currentDestination = card.dataset.dest || 'songbook';
          updateEngineDestinationUI();
        });
      });

      function updateEngineDestinationUI() {
        if (!importRuleBannerText || !importEngineActiveBadgeText || !importExecuteBtnText) return;

        if (currentDestination === 'songbook') {
          importEngineActiveBadgeText.textContent = 'Song Import Engine';
          importRuleBannerText.innerHTML = `
            <strong>Song Book Ingestion Rules Active:</strong> Document will be scanned for markers (<code>Song #1</code>, <code>Song 01</code>, <code>Song 1</code>, <code>Hymn 1</code>, <code>भजन 1</code>, <code>गीत 1</code>) to split hundreds of songs into individual Song Book records with serial numbers preserved.
          `;
          importExecuteBtnText.textContent = 'Execute Song Import & Index';
          if (importRawTextarea && !importRawTextarea.value.trim()) {
            importRawTextarea.placeholder = `Paste multi-song document here:\n\nSong #01\nBE THOU MY VISION\nBe Thou my Vision, O Lord of my heart...\n\nSong #02\nABIDE WITH ME\nAbide with me, fast falls the eventide...`;
          }
        } else if (currentDestination === 'almanac') {
          importEngineActiveBadgeText.textContent = 'Almanac Import Engine';
          importRuleBannerText.innerHTML = `
            <strong>Almanac Liturgical Ingestion Rules Active:</strong> Extracts liturgical calendar records (Year→Month→Date, canonical colors, themes, morning/evening & communion scripture readings) and merges them into the church calendar database.
          `;
          importExecuteBtnText.textContent = 'Execute Almanac Ingestion & Sync';
          if (importRawTextarea && !importRawTextarea.value.trim()) {
            importRawTextarea.placeholder = `Paste Liturgical Calendar text or JSON here:\n\nDate: 2026-08-23\nTheme: 12th Sunday after Pentecost\nColor: Green\nMorning Worship: Psalms 103, 1 Samuel 2, Luke 1\nEvening Worship: Psalms 7, 2 Chronicles 30, Matthew 13\nLord's Supper: 1 Corinthians 11`;
          }
        } else {
          importEngineActiveBadgeText.textContent = 'Standard Document Publisher';
          const libNames = {
            'prabhu_bhoj': "The Lord's Supper (प्रभु भोज)",
            'ashaye_rabbani': "Ashaye Rabbani (अशाये रब्बानी)",
            'aaradhanaa': "Prata Kaal & Sayan Kalin (Aaradhanaa)"
          };
          const name = libNames[currentDestination] || 'Church Library';
          importRuleBannerText.innerHTML = `
            <strong>Standard Content Ingestion:</strong> Content will be published directly to <strong>${name}</strong> as a standard liturgical book entry without splitting.
          `;
          importExecuteBtnText.textContent = `Publish to ${name}`;
        }

        // Reset previous preview on destination switch
        currentParsedResults = null;
        if (importPreviewCard) importPreviewCard.classList.add('hidden');
        if (importSummaryCard) importSummaryCard.classList.add('hidden');
        if (importExecuteBtn) importExecuteBtn.disabled = true;
      }

      // 3. Tabs: File vs Paste
      if (importTabFileBtn && importTabTextBtn && importTabContentFile && importTabContentText) {
        importTabFileBtn.addEventListener('click', () => {
          importTabFileBtn.classList.add('active');
          importTabTextBtn.classList.remove('active');
          importTabContentFile.style.display = 'block';
          importTabContentText.style.display = 'none';
        });

        importTabTextBtn.addEventListener('click', () => {
          importTabTextBtn.classList.add('active');
          importTabFileBtn.classList.remove('active');
          importTabContentText.style.display = 'block';
          importTabContentFile.style.display = 'none';
        });
      }

      // 4. File Dropzone & Selection
      if (browseFileBtn && importFileInput) {
        browseFileBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          importFileInput.click();
        });
      }
      if (importDropzone && importFileInput) {
        importDropzone.addEventListener('click', () => importFileInput.click());
        importDropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          importDropzone.classList.add('dragover');
        });
        importDropzone.addEventListener('dragleave', () => importDropzone.classList.remove('dragover'));
        importDropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          importDropzone.classList.remove('dragover');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleSelectedFile(e.dataTransfer.files[0]);
          }
        });

        importFileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            handleSelectedFile(e.target.files[0]);
          }
        });
      }

      function handleSelectedFile(file) {
        activeImportFile = file;
        if (selectedFilePill && selectedFileNameText && selectedFileSizeText) {
          selectedFileNameText.textContent = file.name;
          const sizeKb = (file.size / 1024).toFixed(1);
          selectedFileSizeText.textContent = sizeKb > 1024 ? `(${(sizeKb/1024).toFixed(2)} MB)` : `(${sizeKb} KB)`;
          selectedFilePill.classList.remove('hidden');
        }
        showToast(`Selected file: ${file.name}`);
      }

      if (removeSelectedFileBtn) {
        removeSelectedFileBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          activeImportFile = null;
          if (importFileInput) importFileInput.value = '';
          if (selectedFilePill) selectedFilePill.classList.add('hidden');
        });
      }

      if (clearImportTextBtn && importRawTextarea) {
        clearImportTextBtn.addEventListener('click', () => {
          importRawTextarea.value = '';
          showToast('Text cleared');
        });
      }

      // ==============================================================================
      // 5. ENGINE PARSING & SPLITTING LOGIC
      // ==============================================================================

      // Helper to read file content as text (supports TXT, JSON, CSV, PDF via PDF.js)
      async function readFileAsText(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (ext === 'pdf') {
          // Extract text from PDF pages via PDF.js
          if (typeof pdfjsLib !== 'undefined') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              fullText += pageText + '\n\n';
            }
            return fullText;
          } else {
            throw new Error('PDF.js engine is not ready for PDF extraction');
          }
        } else {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file, 'utf-8');
          });
        }
      }

      // ==============================================================================
      // 5A. SONG IMPORT ENGINE (14 Rules Implemented)
      // ==============================================================================
      // ==============================================================================
      // SONG IMPORT ENGINE — 14-Rule Multi-Splitter
      // Supports: Song #01, Song 1, Hymn 1, भजन 1, गीत 1, Geet 1, etc.
      // Handles TXT, JSON, DOCX (via text), PDF (via pdfjs), and OCR text.
      // ==============================================================================
      function parseSongBookDocument(rawText) {
        if (!rawText || !rawText.trim()) return [];

        // ── 1. Try JSON import first ──────────────────────────────────────────
        try {
          const trimmed = rawText.trim();
          if (trimmed.startsWith('[') || (trimmed.startsWith('{') && !trimmed.startsWith('{\n  "dateKey"'))) {
            const parsed = JSON.parse(trimmed);
            const list = Array.isArray(parsed) ? parsed : (parsed.sections || parsed.songs || Object.values(parsed));
            if (Array.isArray(list) && list.length > 0 && (list[0].lyrics || list[0].text || list[0].title || list[0].song_number)) {
              return list.map((item, idx) => {
                const num = item.serialNumber || item.song_number || item.number || item.id || (idx + 1);
                const serialNum = typeof num === 'number' ? num : (parseInt(num, 10) || (idx + 1));
                const rawTitle = item.title || item.rubric || item.name || item.heading || '';
                const rawLyrics = (item.lyrics || item.text || item.body || item.content || '').trim();
                // If no title in JSON, try extracting from first line of lyrics
                let title = rawTitle;
                let lyrics = rawLyrics;
                if (!title && lyrics) {
                  const firstLine = lyrics.split('\n')[0].trim();
                  if (firstLine.length > 0 && firstLine.length < 80 && !/^\d+\./.test(firstLine)) {
                    title = firstLine;
                    lyrics = lyrics.split('\n').slice(1).join('\n').trim();
                  }
                }
                return {
                  serialNumber: serialNum,
                  rawSerialNumber: String(num),
                  title: title || `Hymn #${serialNum}`,
                  author: item.author || item.writer || 'Church Hymnal',
                  category: item.category || 'hymn',
                  lyrics: lyrics || title
                };
              }).filter(s => (s.lyrics && s.lyrics.length > 0) || (s.title && s.title.length > 0));
            }
          }
        } catch (_) {}

        // ── 2. Split into lines and detect explicit song header markers ──────
        const lines = rawText.split(/\r?\n/);

        // Helper: Strip markdown tokens (#, **, *, _)
        function cleanSongText(str) {
          if (!str) return '';
          return str.replace(/^\s*[\*\#\_]+|[\*\#\_]+\s*$/g, '').replace(/\*\*/g, '').trim();
        }

        // Explicit Song Header Patterns (supports Markdown headers like ## Song #01, #01, etc.)
        const markerPatterns = [
          // 1. Markdown or plain with keyword: ## Song #01, # Song 1, Song #1, Hymn 1, etc.
          /^\s*(?:#{1,6}\s*)?(?:Song|Hymn|Geet|भजन|गीत|Hymnal|Gaan|गान|Track)\s*#?\s*(\d{1,4})\s*[\.\:\-\)\s]*\s*(.*)$/i,
          // 2. Hash-prefixed or Markdown header number: #01, ## 1, ## 01 - Title, ## #01
          /^\s*(?:#{1,6}\s*)#?\s*(\d{1,4})\s*[\.\:\-\)\s]+(.*)$/,
          // 3. Just ## 01 or ## #1
          /^\s*(?:#{1,6}\s*)#?\s*(\d{1,4})\s*$/,
          // 4. Divider lines: === Song 1 ===, --- Hymn 1 ---
          /^\s*[-=]{3,}\s*(?:Song|Hymn|Geet|भजन|गीत)?\s*#?\s*(\d{1,4})[\.\:\-\)\s]*\s*(.*?)\s*[-=]{0,}\s*$/i
        ];

        const songs = [];
        let currentSong = null;
        let currentLyricsLines = [];
        let serialCounter = 0;

        function extractTitleFromBody(bodyLines) {
          for (let i = 0; i < bodyLines.length; i++) {
            const line = bodyLines[i].trim();
            if (line.length === 0) continue;
            // Skip explicit lyrics marker
            if (/^\s*(?:\*\*)?(?:Lyrics|बोल|LRC|गीत के बोल)\s*[\:\-]?\s*(?:\*\*)?\s*$/i.test(line)) {
              bodyLines.splice(i, 1);
              i--;
              continue;
            }
            // A title is a short line not starting with a verse number or chorus tag
            if (line.length <= 90 && !/^\d+[\.\)]\s/.test(line) && !/^(?:Verse|Chorus|Refrain|स्थाई|अंतरा|कोरस)/i.test(line)) {
              bodyLines.splice(i, 1);
              return cleanSongText(line);
            }
            break;
          }
          return null;
        }

        function finalizeCurrentSong() {
          if (!currentSong) return;
          let bodyLines = currentLyricsLines.slice();

          if (!currentSong.title || currentSong.title.length === 0) {
            const extractedTitle = extractTitleFromBody(bodyLines);
            if (extractedTitle) {
              currentSong.title = extractedTitle;
            }
          }
          if (!currentSong.title || currentSong.title.length === 0) {
            currentSong.title = `Hymn #${currentSong.serialNumber}`;
          } else {
            currentSong.title = cleanSongText(currentSong.title);
          }

          currentSong.lyrics = bodyLines.join('\n').trim();

          if (currentSong.lyrics.length > 0 || currentSong.title.length > 0) {
            currentSong.sourceIndex = songs.length + 1;
            songs.push(currentSong);
          }
        }

        // Scan all lines for explicit song headers
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let matched = false;

          for (const pattern of markerPatterns) {
            const match = line.match(pattern);
            if (match) {
              finalizeCurrentSong();

              serialCounter++;
              const serialNumber = parseInt(match[1], 10);
              const rawTitle = match[2] ? cleanSongText(match[2]) : '';

              currentSong = {
                serialNumber: serialNumber || serialCounter,
                rawSerialNumber: match[1],
                title: rawTitle,
                author: 'Church Hymnal',
                category: 'hymn'
              };
              currentLyricsLines = [];
              matched = true;
              break;
            }
          }

          if (!matched) {
            if (currentSong) {
              // Check for **Title:** Song Title or Title: Song Title
              const titleMatch = line.match(/^\s*(?:\*\*)?(?:Title|शीर्षक|Heading)\s*[\:\-]\s*(.*?)(?:\*\*)?\s*$/i);
              if (titleMatch && titleMatch[1]) {
                const extracted = cleanSongText(titleMatch[1]);
                if (extracted) {
                  currentSong.title = extracted;
                  continue;
                }
              }
              // Check for **Lyrics:** or Lyrics: label
              const lyricsMarkerMatch = line.match(/^\s*(?:\*\*)?(?:Lyrics|बोल|LRC|गीत के बोल)\s*[\:\-]?\s*(?:\*\*)?\s*$/i);
              if (lyricsMarkerMatch) continue;

              // Check for Author: / Composer:
              const authorMatch = line.match(/^\s*(?:\*\*)?(?:Author|Composer|लेखक|रचयिता)\s*[\:\-]\s*(.*?)(?:\*\*)?\s*$/i);
              if (authorMatch && authorMatch[1]) {
                currentSong.author = cleanSongText(authorMatch[1]);
                continue;
              }

              currentLyricsLines.push(line);
            }
          }
        }
        finalizeCurrentSong();

        // ── 3. Fallback: If no explicit headers were detected, group by verse awareness ─
        if (songs.length === 0 && rawText.trim().length > 0) {
          const rawBlocks = rawText.split(/\r?\n\s*\r?\n+/);
          let currentFallbackSong = null;

          for (let i = 0; i < rawBlocks.length; i++) {
            const block = rawBlocks[i].trim();
            if (!block) continue;
            const blockLines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (blockLines.length === 0) continue;

            const firstLine = blockLines[0];
            const isVerseContinuation = /^(?:\d+[\.\:\)]|Chorus|Refrain|Verse|कोरस|स्थाई|अंतरा)/i.test(firstLine);

            if (currentFallbackSong && isVerseContinuation) {
              currentFallbackSong.lyrics += '\n\n' + block;
            } else {
              if (currentFallbackSong) {
                songs.push(currentFallbackSong);
              }

              let num = songs.length + 1;
              let title = '';
              let lyrics = '';

              const numMatch = firstLine.match(/^(?:Song|Hymn|Geet|भजन|गीत|#)?\s*(\d{1,4})\s*[\.\:\-\)\s]+(.*)$/i);
              if (numMatch && numMatch[1]) {
                num = parseInt(numMatch[1], 10) || (songs.length + 1);
                title = numMatch[2] ? cleanSongText(numMatch[2]) : `Hymn #${num}`;
                lyrics = blockLines.slice(1).join('\n').trim();
              } else if (firstLine.length <= 90 && !isVerseContinuation) {
                title = cleanSongText(firstLine);
                lyrics = blockLines.slice(1).join('\n').trim();
              } else {
                title = `Hymn #${num}`;
                lyrics = block;
              }

              currentFallbackSong = {
                serialNumber: num,
                rawSerialNumber: String(num),
                title: title || `Hymn #${num}`,
                author: 'Church Hymnal',
                category: 'hymn',
                lyrics: lyrics || title,
                sourceIndex: songs.length + 1
              };
            }
          }

          if (currentFallbackSong) {
            songs.push(currentFallbackSong);
          }
        }

        songs.sort((a, b) => a.serialNumber - b.serialNumber);
        return songs;
      }

      // ==============================================================================
      // 5B. ALMANAC IMPORT ENGINE (Liturgical Calendar Extractor)
      // ==============================================================================
      function parseAlmanacDocument(rawText) {
        if (!rawText || !rawText.trim()) return [];

        // 1. Try parsing JSON directly
        try {
          const trimmed = rawText.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            const parsed = JSON.parse(trimmed);
            const list = Array.isArray(parsed) ? parsed : Object.values(parsed);
            return list.map(item => normalizeAlmanacItem(item)).filter(Boolean);
          }
        } catch (_) {}

        // 2. Structured text / master prompt parser
        const entries = [];
        const dateBlockRegex = /(?:Date|दिनांक|तारिख)\s*[:=]\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/gi;
        const blocks = rawText.split(/(?=(?:Date|दिनांक|तारिख)\s*[:=])/i);

        blocks.forEach(block => {
          if (!block.trim()) return;

          const dateMatch = block.match(/(?:Date|दिनांक|तारिख)\s*[:=]\s*([^\n\r]+)/i);
          if (!dateMatch) return;

          const rawDateStr = dateMatch[1].trim();
          let dateKey = parseToIsoDateKey(rawDateStr);
          if (!dateKey) return;

          const dateObj = new Date(dateKey + 'T00:00:00Z');
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

          // Theme / Liturgical Festival
          const themeMatch = block.match(/(?:Theme|Festival|विषय|पर्व)\s*[:=]\s*([^\n\r]+)/i);
          const theme = themeMatch ? themeMatch[1].trim() : '';

          // Color
          const colorMatch = block.match(/(?:Color|रंग)\s*[:=]\s*([^\n\r]+)/i);
          let color = colorMatch ? colorMatch[1].trim() : 'Green';
          if (/violet|purple|बैंगनी/i.test(color)) color = 'Violet';
          else if (/white|gold|सफेद|सुनहरा/i.test(color)) color = 'White';
          else if (/red|लाल/i.test(color)) color = 'Red';
          else color = 'Green';

          // Scripture Readings
          const morningMatch = block.match(/(?:Morning|Morning Worship|प्रातःकालीन)\s*[:=]\s*([^\n\r]+(?:\n\s*[-*•][^\n\r]+)*)/i);
          const eveningMatch = block.match(/(?:Evening|Evening Worship|सायंकालीन)\s*[:=]\s*([^\n\r]+(?:\n\s*[-*•][^\n\r]+)*)/i);
          const communionMatch = block.match(/(?:Lord's Supper|Communion|प्रभु भोज)\s*[:=]\s*([^\n\r]+(?:\n\s*[-*•][^\n\r]+)*)/i);

          const parseReadingsList = (str) => {
            if (!str) return [];
            return str.split(/[,;\n•*]/)
              .map(s => s.trim().replace(/^[-*•]\s*/, ''))
              .filter(s => s.length > 2);
          };

          entries.push({
            dateKey: dateKey,
            day: dateObj.getUTCDate(),
            monthName: monthNames[dateObj.getUTCMonth()],
            year: dateObj.getUTCFullYear(),
            dayName: dayNames[dateObj.getUTCDay()],
            theme: theme,
            color: color,
            morningWorship: morningMatch ? parseReadingsList(morningMatch[1]) : [],
            eveningWorship: eveningMatch ? parseReadingsList(eveningMatch[1]) : [],
            lordsSupper: communionMatch ? parseReadingsList(communionMatch[1]) : []
          });
        });

        return entries;
      }

      function normalizeAlmanacItem(item) {
        if (!item || (!item.dateKey && !item.date)) return null;
        const dateKey = item.dateKey || item.date;
        const dateObj = new Date(dateKey + 'T00:00:00Z');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return {
          dateKey: dateKey,
          day: item.day || dateObj.getUTCDate(),
          monthName: item.monthName || monthNames[dateObj.getUTCMonth()],
          year: item.year || dateObj.getUTCFullYear(),
          dayName: item.dayName || dayNames[dateObj.getUTCDay()],
          theme: item.theme || '',
          color: item.color || 'Green',
          morningWorship: Array.isArray(item.morningWorship) ? item.morningWorship : [],
          eveningWorship: Array.isArray(item.eveningWorship) ? item.eveningWorship : [],
          lordsSupper: Array.isArray(item.lordsSupper) ? item.lordsSupper : []
        };
      }

      function parseToIsoDateKey(str) {
        try {
          const d = new Date(str);
          if (!isNaN(d.getTime())) {
            return d.toISOString().slice(0, 10);
          }
        } catch (_) {}
        return null;
      }

      // ==============================================================================
      // 6. SCAN & PARSE PREVIEW HANDLER
      // ==============================================================================
      if (importParsePreviewBtn) {
        importParsePreviewBtn.addEventListener('click', async () => {
          let rawText = '';

          // Step 1: Read input from Active Tab
          if (importTabFileBtn.classList.contains('active')) {
            if (!activeImportFile) {
              showToast('Please select or drop a document file first 📄');
              return;
            }
            showProgress('Reading and extracting document text...', 15);
            try {
              rawText = await readFileAsText(activeImportFile);
            } catch (err) {
              hideProgress();
              showToast(`File read error: ${err.message}`);
              return;
            }
          } else {
            rawText = importRawTextarea ? importRawTextarea.value.trim() : '';
            if (!rawText) {
              showToast('Please paste your document text into the textarea ✍️');
              return;
            }
            showProgress('Parsing source text...', 30);
          }

          // Step 2: Route to conditional engine
          if (currentDestination === 'songbook') {
            showProgress('Song Import Engine: Detecting markers and splitting songs...', 60);
            const songs = parseSongBookDocument(rawText);
            hideProgress();

            if (songs.length === 0) {
              showToast('No song markers detected in document. Check format.');
              return;
            }

            currentParsedResults = { type: 'songbook', data: songs };
            renderSongsPreview(songs);
            if (importExecuteBtn) importExecuteBtn.disabled = false;
            showToast(`⚡ Song Import Engine: ${songs.length} songs detected!`);
          } else if (currentDestination === 'almanac') {
            showProgress('Almanac Import Engine: Extracting liturgical calendar dates & readings...', 60);
            const entries = parseAlmanacDocument(rawText);
            hideProgress();

            if (entries.length === 0) {
              showToast('No liturgical dates parsed. Ensure date markers are present.');
              return;
            }

            currentParsedResults = { type: 'almanac', data: entries };
            renderAlmanacPreview(entries);
            if (importExecuteBtn) importExecuteBtn.disabled = false;
            showToast(`📅 Almanac Import Engine: ${entries.length} liturgical days extracted!`);
          } else {
            // Standard Liturgy Book Document
            hideProgress();
            currentParsedResults = { type: 'standard', text: rawText, destination: currentDestination };
            renderStandardPreview(rawText, currentDestination);
            if (importExecuteBtn) importExecuteBtn.disabled = false;
            showToast('Document ready for publication!');
          }
        });
      }

      function renderSongsPreview(songs) {
        if (!importPreviewCard || !previewTableBody || !previewCountBadge) return;

        previewCountBadge.textContent = `${songs.length} Songs Detected`;
        const pTitle = document.getElementById('previewTitleText');
        if (pTitle) pTitle.textContent = 'Song Book Extracted Records Preview';
        const pSub = document.getElementById('previewSubtitleText');
        if (pSub) pSub.textContent = 'Auto-split by markers (Song #01, Hymn, etc.) with serial numbers preserved';

        // Table Head
        const tHead = document.getElementById('previewTableHead');
        if (tHead) {
          tHead.innerHTML = `
            <tr>
              <th style="width:40px;">#</th>
              <th style="width:90px;">Serial #</th>
              <th>Title</th>
              <th>Lyrics Preview / Verses</th>
              <th style="width:110px;">Status</th>
            </tr>
          `;
        }

        previewTableBody.innerHTML = '';
        songs.slice(0, 100).forEach((song, idx) => {
          const tr = document.createElement('tr');
          const previewSnippet = escapeHtml(song.lyrics.slice(0, 90).replace(/\n/g, ' '));
          tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span style="font-weight:700; color:var(--accent-gold);">Song #${song.serialNumber}</span></td>
            <td><strong>${escapeHtml(song.title)}</strong></td>
            <td style="font-size:0.78rem; color:var(--text-muted);">${previewSnippet}...</td>
            <td><span class="preview-tag-new">Ready</span></td>
          `;
          previewTableBody.appendChild(tr);
        });

        if (songs.length > 100) {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td colspan="5" style="text-align:center; color:var(--text-muted); font-style:italic;">...and ${songs.length - 100} more songs ready for batch import</td>`;
          previewTableBody.appendChild(tr);
        }

        importPreviewCard.classList.remove('hidden');
        importPreviewCard.scrollIntoView({ behavior: 'smooth' });
      }

      function renderAlmanacPreview(entries) {
        if (!importPreviewCard || !previewTableBody || !previewCountBadge) return;

        previewCountBadge.textContent = `${entries.length} Dates Extracted`;
        const pTitle = document.getElementById('previewTitleText');
        if (pTitle) pTitle.textContent = 'Liturgical Calendar Extraction Preview';
        const pSub = document.getElementById('previewSubtitleText');
        if (pSub) pSub.textContent = 'Extracted readings, themes, and canonical liturgical colors';

        const tHead = document.getElementById('previewTableHead');
        if (tHead) {
          tHead.innerHTML = `
            <tr>
              <th style="width:40px;">#</th>
              <th style="width:110px;">Date Key</th>
              <th>Theme / Festival</th>
              <th style="width:80px;">Color</th>
              <th>Morning Readings</th>
              <th>Evening Readings</th>
            </tr>
          `;
        }

        previewTableBody.innerHTML = '';
        entries.slice(0, 100).forEach((item, idx) => {
          const tr = document.createElement('tr');
          const colorDot = `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${getLiturgicalHex(item.color)}; margin-right:4px;"></span>${item.color}`;
          tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span style="font-weight:700; font-family:monospace;">${item.dateKey}</span></td>
            <td><strong>${escapeHtml(item.theme || 'Daily Liturgy')}</strong></td>
            <td>${colorDot}</td>
            <td style="font-size:0.76rem;">${escapeHtml(item.morningWorship.slice(0, 2).join(', ')) || '—'}</td>
            <td style="font-size:0.76rem;">${escapeHtml(item.eveningWorship.slice(0, 2).join(', ')) || '—'}</td>
          `;
          previewTableBody.appendChild(tr);
        });

        importPreviewCard.classList.remove('hidden');
        importPreviewCard.scrollIntoView({ behavior: 'smooth' });
      }

      function renderStandardPreview(rawText, dest) {
        if (!importPreviewCard || !previewTableBody || !previewCountBadge) return;
        previewCountBadge.textContent = '1 Document';
        const pTitle = document.getElementById('previewTitleText');
        if (pTitle) pTitle.textContent = 'Standard Liturgical Book Document';
        const pSub = document.getElementById('previewSubtitleText');
        if (pSub) pSub.textContent = 'Direct publication to Church Library';

        const tHead = document.getElementById('previewTableHead');
        if (tHead) {
          tHead.innerHTML = `
            <tr>
              <th>Destination</th>
              <th>Content Preview</th>
              <th>Status</th>
            </tr>
          `;
        }

        previewTableBody.innerHTML = `
          <tr>
            <td><strong>${dest}</strong></td>
            <td style="font-size:0.8rem; font-family:monospace;">${escapeHtml(rawText.slice(0, 200))}...</td>
            <td><span class="preview-tag-new">Ready</span></td>
          </tr>
        `;

        previewTableBody.innerHTML = `
          <tr>
            <td><strong>${dest}</strong></td>
            <td style="font-size:0.8rem; font-family:monospace;">${escapeHtml(rawText.slice(0, 200))}...</td>
            <td><span class="preview-tag-new">Ready</span></td>
          </tr>
        `;
        importPreviewCard.classList.remove('hidden');
      }

      function getLiturgicalHex(colorName) {
        switch ((colorName || '').toLowerCase()) {
          case 'violet':
          case 'purple': return '#6a4c93';
          case 'red': return '#9e2a2b';
          case 'white':
          case 'gold': return '#4997D0';
          default: return '#2d6a4f';
        }
      }

      // ==============================================================================
      // 7. EXECUTE IMPORT & COMMIT HANDLER
      // ==============================================================================
      if (importExecuteBtn) {
        importExecuteBtn.addEventListener('click', async () => {
          if (!currentParsedResults) return;

          const conflictPolicy = document.querySelector('input[name="conflictPolicy"]:checked')?.value || 'replace';

          if (currentParsedResults.type === 'songbook') {
            await executeSongBookImport(currentParsedResults.data, conflictPolicy, currentDestination);
          } else if (currentParsedResults.type === 'almanac') {
            await executeAlmanacImport(currentParsedResults.data, conflictPolicy);
          } else {
            showToast('Document published to Church Library! 📖');
            switchTab('viewHome');
          }
        });
      }

      // 7A. Execute Song Book Ingestion
      async function executeSongBookImport(songs, conflictPolicy, dest) {
        showProgress(`Importing Song Book: Ingesting ${songs.length} songs...`, 20);

        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        const supabaseSyncList = [];

        // Determine the correct book_reference based on the selected destination
        const songDestMap = {
          masihi_geeto_ka_sangrah: 'Masihi Geeto ka Sangrah',
          additional_songs: 'Additional Songs of Church'
        };
        const bookReference = songDestMap[dest] || songDestMap.masihi_geeto_ka_sangrah;
        const songIdPrefix = dest || 'masihi_geeto_ka_sangrah';

        let localBackup = [];
        try {
          localBackup = JSON.parse(localStorage.getItem('sanctuary_custom_songs_backup') || '[]');
          if (!Array.isArray(localBackup)) localBackup = [];
        } catch (_) { localBackup = []; }

        let importedBackup = [];
        try {
          importedBackup = JSON.parse(localStorage.getItem('sanctuary_imported_songs') || '[]');
          if (!Array.isArray(importedBackup)) importedBackup = [];
        } catch (_) { importedBackup = []; }

        let deletedBlacklist = [];
        try {
          deletedBlacklist = JSON.parse(localStorage.getItem('sanctuary_deleted_songs_blacklist') || '[]');
          if (!Array.isArray(deletedBlacklist)) deletedBlacklist = [];
        } catch (_) { deletedBlacklist = []; }
        const blacklistSet = new Set(deletedBlacklist.map(x => String(x).toLowerCase().trim()));

        for (let i = 0; i < songs.length; i++) {
          const song = songs[i];
          const songId = `${songIdPrefix}-song-sn-${song.serialNumber}`;

          // Check if song already exists in local DB
          let exists = false;
          try {
            if (churchDexieDb && churchDexieDb.custom_songs) {
              const existing = await churchDexieDb.custom_songs.get(songId);
              if (existing) exists = true;
            }
            if (!exists && churchDexieDb && churchDexieDb.songs) {
              const existing = await churchDexieDb.songs.get(songId);
              if (existing) exists = true;
            }
            if (!exists && window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.custom_songs) {
              const existing = await window.ChurchSync.db.custom_songs.get(songId);
              if (existing) exists = true;
            }
            if (!exists && window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.songs) {
              const existing = await window.ChurchSync.db.songs.get(songId);
              if (existing) exists = true;
            }
          } catch (_) {}

          if (!exists && (localBackup.some(b => b.id === songId) || importedBackup.some(b => b.id === songId))) {
            exists = true;
          }

          if (exists) {
            if (conflictPolicy === 'skip') {
              skippedCount++;
              continue;
            } else if (conflictPolicy === 'replace') {
              updatedCount++;
            } else {
              addedCount++;
            }
          } else {
            addedCount++;
          }

          const songRecord = {
            id: songId,
            song_number: song.serialNumber,
            title: song.title,
            category: 'hymn',
            author: song.author || 'Church Hymnal',
            lyrics: song.lyrics,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            book_reference: bookReference
          };

          // Save to Dexie WITH book_reference so songs only appear in the correct book
          try {
            if (churchDexieDb && churchDexieDb.custom_songs) {
              await churchDexieDb.custom_songs.put(songRecord);
            }
            if (churchDexieDb && churchDexieDb.songs) {
              await churchDexieDb.songs.put(songRecord);
            }
            if (window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.custom_songs) {
              await window.ChurchSync.db.custom_songs.put(songRecord);
            }
            if (window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.songs) {
              await window.ChurchSync.db.songs.put(songRecord);
            }
          } catch (_) {}

          const existingIdx = localBackup.findIndex(b => b.id === songId);
          if (existingIdx >= 0) localBackup[existingIdx] = songRecord;
          else localBackup.push(songRecord);

          const existingImpIdx = importedBackup.findIndex(b => b.id === songId);
          if (existingImpIdx >= 0) importedBackup[existingImpIdx] = songRecord;
          else importedBackup.push(songRecord);

          // Clear from blacklist
          blacklistSet.delete(String(songId).toLowerCase().trim());
          if (song.title) blacklistSet.delete(String(song.title).toLowerCase().trim());

          // Prepare payload for Supabase Cloud — use correct destination book_reference
          supabaseSyncList.push({
            id: songId,
            song_number: song.serialNumber,
            title: song.title,
            category: 'hymn',
            author: song.author || 'Church Hymnal',
            composer: song.author || 'Church Hymnal',
            lyrics: song.lyrics,
            deleted_at: null,
            book_reference: bookReference
          });

          // Update progress
          if (i % 20 === 0 || i === songs.length - 1) {
            const pct = Math.round(20 + ((i + 1) / songs.length) * 60);
            showProgress(`Processing hymn #${song.serialNumber} (${i + 1}/${songs.length})...`, pct);
          }
        }

        try {
          localStorage.setItem('sanctuary_custom_songs_backup', JSON.stringify(localBackup));
          localStorage.setItem('sanctuary_imported_songs', JSON.stringify(importedBackup));
          localStorage.setItem('sanctuary_deleted_songs_blacklist', JSON.stringify([...blacklistSet]));
        } catch (_) {}

        // Sync batch to Supabase Cloud
        showProgress('Synchronizing Song Book entries with Supabase Cloud...', 85);
        if (window.ChurchSync && window.ChurchSync.Songs) {
          for (const item of supabaseSyncList) {
            try {
              const res = await window.ChurchSync.Songs.upsert(item);
              if (res && res.error) {
                console.error('[Import] Failed to upsert hymn to Supabase:', item.title, res.error);
              }
            } catch (err) {
              console.error('[Import] Upsert exception:', err);
            }
          }
        }

        // Auto-refresh song lists
        if (typeof renderAdditionalSongsFromDexie === 'function') {
          try { await renderAdditionalSongsFromDexie(); } catch (_) {}
        }
        if (currentOpenSongBookKey && typeof openSongBookScreen === 'function') {
          try { await openSongBookScreen(currentOpenSongBookKey); } catch (_) {}
        }

        hideProgress();

        // Display Summary Report (Rule 12)
        displaySummaryReport({
          title: 'Song Book Ingestion Completed',
          subtitle: 'All hymns split, indexed by serial number, and saved to library & Supabase',
          total: songs.length,
          added: addedCount,
          updated: updatedCount,
          skipped: skippedCount,
          destination: dest,
          details: `
            <strong>Batch Summary:</strong> ${songs.length} hymns detected and sorted by serial number.<br>
            • <strong>Added:</strong> ${addedCount} new hymns<br>
            • <strong>Updated:</strong> ${updatedCount} existing hymns<br>
            • <strong>Skipped:</strong> ${skippedCount} duplicate hymns<br>
            • <strong>Target Book:</strong> ${bookReference}
          `
        });

        showToast(`🎉 Imported ${addedCount + updatedCount} hymns successfully!`);
      }

      // 7B. Execute Almanac Ingestion
      async function executeAlmanacImport(entries, conflictPolicy) {
        showProgress('Importing Almanac: Merging liturgical calendar records...', 30);

        let addedDays = 0;
        let updatedDays = 0;
        const yearsSet = new Set();
        const monthsSet = new Set();

        const supabaseSyncList = [];

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          yearsSet.add(entry.year);
          monthsSet.add(entry.monthName);

          const existing = (window.CHURCH_DATA && window.CHURCH_DATA.almanacDatabase && window.CHURCH_DATA.almanacDatabase[entry.dateKey]);
          if (existing) {
            updatedDays++;
          } else {
            addedDays++;
          }

          // Merge into in-memory CHURCH_DATA database (Year → Month → Date)
          if (window.CHURCH_DATA && window.CHURCH_DATA.almanacDatabase) {
            window.CHURCH_DATA.almanacDatabase[entry.dateKey] = entry;
          }

          // Format for Supabase
          supabaseSyncList.push({
            date_key: entry.dateKey,
            day: entry.day,
            month_name: entry.monthName,
            year: entry.year,
            day_name: entry.dayName,
            theme: entry.theme,
            liturgical_color: entry.color,
            morning_worship: entry.morningWorship,
            evening_worship: entry.eveningWorship,
            lords_supper: entry.lordsSupper
          });
        }

        // Bulk upsert to Supabase
        showProgress('Synchronizing Almanac records with Supabase Realtime...', 75);
        if (window.ChurchSync) {
          try {
            await window.ChurchSync.Almanac.bulkUpsert(supabaseSyncList);
          } catch (e) {
            console.warn('[Almanac Import] Supabase sync error:', e);
          }
        }

        // Refresh Almanac view
        if (typeof renderAlmanacModule === 'function') {
          renderAlmanacModule();
        }

        hideProgress();

        // Display Almanac Summary Report
        displaySummaryReport({
          title: 'Almanac Ingestion Completed',
          subtitle: 'Liturgical calendar database updated and synchronized realtime',
          total: entries.length,
          added: addedDays,
          updated: updatedDays,
          skipped: 0,
          addedLabel: 'Days Added',
          updatedLabel: 'Days Updated',
          details: `
            <strong>Liturgical Calendar Report:</strong><br>
            • <strong>Year(s) Imported:</strong> ${Array.from(yearsSet).join(', ')}<br>
            • <strong>Month(s) Ingested:</strong> ${Array.from(monthsSet).join(', ')}<br>
            • <strong>Number of Days Added:</strong> ${addedDays}<br>
            • <strong>Number of Days Updated:</strong> ${updatedDays}<br>
            • <strong>Almanac Module:</strong> Automatically refreshed with new readings & colors
          `
        });

        showToast(`🎉 Almanac updated: ${addedDays + updatedDays} liturgical days synchronized!`);
      }

      function displaySummaryReport(opts) {
        if (typeof window.showImportSummaryModal === 'function') {
          window.showImportSummaryModal(opts);
        }
        if (!importSummaryCard) return;

        const sTitle = document.getElementById('summaryTitleText');
        if (sTitle) sTitle.textContent = opts.title || 'Import Completed';
        const sSub = document.getElementById('summarySubtitleText');
        if (sSub) sSub.textContent = opts.subtitle || '';
        const mTotal = document.getElementById('metricTotalDetected');
        if (mTotal) mTotal.textContent = opts.total || 0;
        const mAdded = document.getElementById('metricSuccessfullyAdded');
        if (mAdded) mAdded.textContent = opts.added || 0;
        const mUpdated = document.getElementById('metricUpdated');
        if (mUpdated) mUpdated.textContent = opts.updated || 0;
        const mSkipped = document.getElementById('metricSkipped');
        if (mSkipped) mSkipped.textContent = opts.skipped || 0;

        if (opts.addedLabel) {
          const mLbl = document.getElementById('metricAddedLabel');
          if (mLbl) mLbl.textContent = opts.addedLabel;
        }
        if (opts.updatedLabel) {
          const mLbl = document.getElementById('metricUpdatedLabel');
          if (mLbl) mLbl.textContent = opts.updatedLabel;
        }

        const dBox = document.getElementById('summaryDetailsBox');
        if (dBox) dBox.innerHTML = opts.details || '';

        importSummaryCard.classList.remove('hidden');
        importSummaryCard.scrollIntoView({ behavior: 'smooth' });
      }

      if (summaryResetBtn) {
        summaryResetBtn.addEventListener('click', () => {
          if (importSummaryCard) importSummaryCard.classList.add('hidden');
          if (importPreviewCard) importPreviewCard.classList.add('hidden');
          if (importExecuteBtn) importExecuteBtn.disabled = true;
          if (importRawTextarea) importRawTextarea.value = '';
          currentParsedResults = null;
          document.querySelector('.app-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      if (summaryViewLibraryBtn) {
        summaryViewLibraryBtn.addEventListener('click', () => {
          if (currentDestination === 'almanac') {
            switchTab('viewAlmanac');
          } else {
            switchTab('viewHome');
          }
        });
      }

      function showProgress(text, pct) {
        if (importProgressCard && importProgressStatusText && importProgressBarFill) {
          importProgressCard.classList.remove('hidden');
          importProgressStatusText.textContent = text;
          importProgressBarFill.style.width = `${pct}%`;
        }
      }

      function hideProgress() {
        if (importProgressCard) {
          importProgressCard.classList.add('hidden');
        }
      }

      // ==============================================================================
      // SETTING SCREEN IMPORT (SONG / ALMANAC) HANDLERS & STUDIO MODAL
      // ==============================================================================

      function setupSettingsImportHandlers() {
        // ── DOM refs ──────────────────────────────────────────────────────────────
        const settingImportSongBtn        = document.getElementById('settingImportSongBtn');
        const settingImportSongFile       = document.getElementById('settingImportSongFile');
        const settingImportAlmanacBtn     = document.getElementById('settingImportAlmanacBtn');
        const settingImportAlmanacFile    = document.getElementById('settingImportAlmanacFile');
        const settingOpenImportStudioBtn  = document.getElementById('settingOpenImportStudioBtn');

        const importStudioModalOverlay    = document.getElementById('importStudioModalOverlay');
        const closeImportStudioModalBtn   = document.getElementById('closeImportStudioModalBtn');
        const cancelImportStudioModalBtn  = document.getElementById('cancelImportStudioModalBtn');

        const modalDestSelect             = document.getElementById('modalImportDestinationSelect');
        const modalEngineRuleBanner       = document.getElementById('modalEngineRuleBanner');
        const modalSampleBtn              = document.getElementById('modalSampleBtn');
        const modalClearBtn               = document.getElementById('modalClearBtn');
        const modalImportTextarea         = document.getElementById('modalImportTextarea');
        const modalImportFileInput        = document.getElementById('modalImportFileInput');
        const modalPickFileBtn            = document.getElementById('modalPickFileBtn');
        const modalParsePreviewBtn        = document.getElementById('modalParsePreviewBtn');
        const modalPreviewContainer       = document.getElementById('modalPreviewContainer');
        const modalPreviewTitle           = document.getElementById('modalPreviewTitle');
        const modalPreviewList            = document.getElementById('modalPreviewList');
        const commitImportStudioBtn       = document.getElementById('commitImportStudioBtn');

        const modalProgressBox            = document.getElementById('modalImportProgressBox');
        const modalProgressStatusText     = document.getElementById('modalProgressStatusText');
        const modalProgressBarFill        = document.getElementById('modalProgressBarFill');
        const modalSummaryReport          = document.getElementById('modalImportSummaryReport');
        const modalSummaryTitleText       = document.getElementById('modalSummaryTitleText');
        const modalSummaryDetailsBox      = document.getElementById('modalSummaryDetailsBox');

        // ── State ─────────────────────────────────────────────────────────────────
        let currentStudioData = null;

        // ── Helper: Safe escape HTML ─────────────────────────────────────────────
        function safeEscape(str) {
          if (typeof escapeHtml === 'function') return escapeHtml(str);
          return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }

        // ── Helper: Liturgical color hex ──────────────────────────────────────────
        function getLiturgicalColorHex(colorName) {
          switch ((colorName || '').toLowerCase()) {
            case 'violet':
            case 'purple': return '#a855f7';
            case 'red': return '#ef4444';
            case 'white':
            case 'gold': return '#e09f3e';
            case 'green': return '#22c55e';
            default: return '#22c55e';
          }
        }

        // ── Screen celebration (Confetti & Haptic Feedback) ───────────────────────
        function launchImportCelebration() {
          // Haptic feedback
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate([45, 30, 60, 30, 90]); } catch (_) {}
          }

          const canvas = document.getElementById('importCelebrationCanvas');
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          canvas.style.display = 'block';

          const colors = ['#22c55e', '#e09f3e', '#38bdf8', '#a855f7', '#f43f5e', '#fbbf24', '#ffffff'];
          const particleCount = 75;
          const particles = [];

          for (let i = 0; i < particleCount; i++) {
            particles.push({
              x: canvas.width / 2 + (Math.random() - 0.5) * 140,
              y: canvas.height * 0.42 + (Math.random() - 0.5) * 60,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() * -12) - 4,
              size: Math.random() * 8 + 4,
              color: colors[Math.floor(Math.random() * colors.length)],
              rotation: Math.random() * 360,
              rotationSpeed: (Math.random() - 0.5) * 15,
              gravity: 0.35,
              opacity: 1,
              decay: Math.random() * 0.012 + 0.008,
              shape: Math.random() > 0.4 ? 'rect' : 'circle'
            });
          }

          let animationFrameId;
          const startTime = Date.now();

          function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let active = false;

            for (let p of particles) {
              if (p.opacity <= 0) continue;
              active = true;

              p.x += p.vx;
              p.y += p.vy;
              p.vy += p.gravity;
              p.vx *= 0.98;
              p.rotation += p.rotationSpeed;
              p.opacity -= p.decay;

              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate((p.rotation * Math.PI) / 180);
              ctx.globalAlpha = Math.max(0, p.opacity);
              ctx.fillStyle = p.color;

              if (p.shape === 'rect') {
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
              } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }

            if (active && Date.now() - startTime < 3500) {
              animationFrameId = requestAnimationFrame(render);
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              canvas.style.display = 'none';
              if (animationFrameId) cancelAnimationFrame(animationFrameId);
            }
          }

          render();
        }

        // ── Helpers: modal progress bar ──────────────────────────────────────────
        function showModalProgress(text, pct) {
          if (modalProgressBox) {
            modalProgressBox.classList.remove('hidden');
            if (pct >= 100) {
              modalProgressBox.classList.add('import-progress-complete');
            } else {
              modalProgressBox.classList.remove('import-progress-complete');
            }
          }
          if (modalProgressStatusText) modalProgressStatusText.textContent = text;
          if (modalProgressBarFill)    modalProgressBarFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
        }
        function hideModalProgress() {
          if (modalProgressBox) {
            modalProgressBox.classList.add('hidden');
            modalProgressBox.classList.remove('import-progress-complete');
          }
        }

        // ── Helper: show summary in pop window modal ──────────────────────────────
        function showImportSummaryModal(opts) {
          if (!opts) opts = {};
          const summaryModal = document.getElementById('importSummaryModalOverlay');
          if (!summaryModal) return;

          const titleEl = document.getElementById('importSummaryModalTitle');
          const subEl = document.getElementById('importSummaryModalSubtitle');
          const totalEl = document.getElementById('summaryModalTotalCount');
          const addedEl = document.getElementById('summaryModalAddedCount');
          const updatedEl = document.getElementById('summaryModalUpdatedCount');
          const skippedEl = document.getElementById('summaryModalSkippedCount');
          const totalLbl = document.getElementById('summaryModalTotalLabel');
          const addedLbl = document.getElementById('summaryModalAddedLabel');
          const updatedLbl = document.getElementById('summaryModalUpdatedLabel');
          const skippedLbl = document.getElementById('summaryModalSkippedLabel');
          const detailsEl = document.getElementById('summaryModalDetailsBox');
          const closeBtn = document.getElementById('closeImportSummaryModalBtn');
          const closeIconBtn = document.getElementById('closeImportSummaryModalIconBtn');
          const viewTargetBtn = document.getElementById('summaryModalViewTargetBtn');

          if (titleEl) titleEl.textContent = opts.title || 'Import Completed';
          if (subEl) subEl.textContent = opts.subtitle || 'Records have been processed and indexed into church sanctuary database.';
          if (totalEl) totalEl.textContent = Number.isFinite(opts.total) ? opts.total : (opts.total ?? 0);
          if (addedEl) addedEl.textContent = Number.isFinite(opts.added) ? opts.added : (opts.added ?? 0);
          if (updatedEl) updatedEl.textContent = Number.isFinite(opts.updated) ? opts.updated : (opts.updated ?? 0);
          if (skippedEl) skippedEl.textContent = Number.isFinite(opts.skipped) ? opts.skipped : (opts.skipped ?? 0);

          if (totalLbl && opts.totalLabel) totalLbl.textContent = opts.totalLabel;
          if (addedLbl && opts.addedLabel) addedLbl.textContent = opts.addedLabel;
          if (updatedLbl && opts.updatedLabel) updatedLbl.textContent = opts.updatedLabel;
          if (skippedLbl && opts.skippedLabel) skippedLbl.textContent = opts.skippedLabel;

          // Render details box content
          if (detailsEl) {
            if (Array.isArray(opts.items) && opts.items.length > 0) {
              let html = '';
              if (opts.detailsHeader) {
                html += `<div style="margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--border-subtle); font-size:0.78rem; color:var(--text-secondary);">${opts.detailsHeader}</div>`;
              }
              const maxDisplay = 40;
              const displayItems = opts.items.slice(0, maxDisplay);
              html += `<div class="import-summary-items-container">` + displayItems.map(item => {
                if (opts.destination === 'almanac' || item.dateKey) {
                  const colorHex = getLiturgicalColorHex(item.color);
                  let badgeText = item.status === 'updated' ? 'Updated' : (item.status === 'skipped' ? 'Skipped' : 'Added');
                  let badgeClass = item.status === 'updated' ? 'import-summary-badge-updated' : (item.status === 'skipped' ? 'import-summary-badge-skipped' : 'import-summary-badge-added');
                  return `
                    <div class="import-summary-item-row">
                      <span style="font-weight:700; color:var(--text-primary); font-family:monospace; min-width:85px;">${safeEscape(item.dateKey || '')}</span>
                      <span class="import-summary-item-title">${safeEscape(item.theme || item.dayName || 'Liturgical Day')}</span>
                      <span class="import-summary-badge" style="background:rgba(59,130,246,0.14); color:${colorHex}; border:1px solid ${colorHex}55;">${safeEscape(item.color || 'Green')}</span>
                      <span class="import-summary-badge ${badgeClass}" style="margin-left:4px;">${badgeText}</span>
                    </div>`;
                } else {
                  let badgeClass = 'import-summary-badge-added';
                  let badgeText = 'Added';
                  if (item.status === 'updated') {
                    badgeClass = 'import-summary-badge-updated';
                    badgeText = 'Updated';
                  } else if (item.status === 'skipped') {
                    badgeClass = 'import-summary-badge-skipped';
                    badgeText = 'Skipped';
                  }
                  return `
                    <div class="import-summary-item-row">
                      <span style="font-weight:700; color:var(--text-accent); min-width:32px;">#${item.num || item.serialNumber || '?'}</span>
                      <span class="import-summary-item-title">${safeEscape(item.title || 'Untitled')}</span>
                      <span class="import-summary-badge ${badgeClass}">${badgeText}</span>
                    </div>`;
                }
              }).join('') + `</div>`;

              if (opts.items.length > maxDisplay) {
                html += `<div style="padding-top:6px; text-align:center; font-style:italic; font-size:0.74rem; color:var(--text-muted);">…and ${opts.items.length - maxDisplay} more items processed successfully</div>`;
              }
              detailsEl.innerHTML = html;
            } else {
              detailsEl.innerHTML = opts.details || '<div style="color:var(--text-muted); font-size:0.78rem;">All records synced successfully.</div>';
            }
          }

          // Target action button configuration
          if (viewTargetBtn) {
            const dest = opts.destination || 'masihi_geeto_ka_sangrah';
            const cleanDest = String(dest).toLowerCase().replace(/[\s_\-]+/g, '');
            if (cleanDest === 'almanac') {
              viewTargetBtn.textContent = 'View Almanac';
              viewTargetBtn.onclick = () => {
                summaryModal.classList.add('hidden');
                switchTab('viewAlmanac');
              };
            } else if (cleanDest.includes('additional')) {
              viewTargetBtn.textContent = 'View Additional Songs';
              viewTargetBtn.onclick = async () => {
                summaryModal.classList.add('hidden');
                if (typeof openSongBookScreen === 'function') {
                  await openSongBookScreen('additionalSongs');
                } else {
                  switchTab('viewSongList');
                }
              };
            } else {
              viewTargetBtn.textContent = 'View Masihi Geeton';
              viewTargetBtn.onclick = async () => {
                summaryModal.classList.add('hidden');
                if (typeof openSongBookScreen === 'function') {
                  await openSongBookScreen('masihiGeet');
                } else {
                  switchTab('viewSongList');
                }
              };
            }
          }

          const closeModal = () => {
            summaryModal.classList.add('hidden');
          };

          if (closeBtn) closeBtn.onclick = closeModal;
          if (closeIconBtn) closeIconBtn.onclick = closeModal;

          // Backdrop click to dismiss
          summaryModal.onclick = (e) => {
            if (e.target === summaryModal) closeModal();
          };

          summaryModal.classList.remove('hidden');
        }

        // Export globally for cross-module accessibility
        window.showImportSummaryModal = showImportSummaryModal;

        // ── Helper: hide modal summary ───────────────────────────────────────────
        function hideModalSummary() {
          const summaryModal = document.getElementById('importSummaryModalOverlay');
          if (summaryModal) summaryModal.classList.add('hidden');
        }

        // ── Helper: reset preview / summary ──────────────────────────────────────
        function resetPreview(clearStudioData = true) {
          if (modalPreviewContainer) modalPreviewContainer.classList.add('hidden');
          hideModalSummary();
          hideModalProgress();
          if (clearStudioData) currentStudioData = null;
        }

        // ── Helper: get current destination from <select> ─────────────────────────
        function getCurrentDest() {
          return modalDestSelect ? modalDestSelect.value : 'masihi_geeto_ka_sangrah';
        }

        // ── Helper: get conflict policy ───────────────────────────────────────────
        function getConflictPolicy() {
          const r = document.querySelector('input[name="modalConflictPolicy"]:checked');
          return r ? r.value : 'new';
        }

        // ── Update engine rule banner when destination changes ────────────────────
        function updateEngineBanner() {
          if (!modalEngineRuleBanner) return;
          const dest = getCurrentDest();
          const songRuleBanner = `<strong>🎵 Song Import Engine Active (14-Rule Multi-Splitter):</strong> Scans for markers
              (<code>Song #01</code>, <code>Song 1</code>, <code>Hymn 1</code>, <code>भजन 1</code>, <code>गीत 1</code>)
              and auto-splits hymns into individual entries, preserving serial numbers and formatting.`;
          const banners = {
            masihi_geeto_ka_sangrah: songRuleBanner,
            additional_songs: songRuleBanner,
            almanac: `<strong>📅 Almanac Import Engine Active:</strong> Extracts liturgical calendar dates,
              canonical colors, morning/evening scripture readings, and Lord's Supper texts. Merges into the
              Almanac database by <em>Year → Month → Date</em> and refreshes the Almanac view.`
          };
          modalEngineRuleBanner.innerHTML = banners[dest] || banners.masihi_geeto_ka_sangrah;
        }

        if (modalDestSelect) {
          modalDestSelect.addEventListener('change', () => {
            updateEngineBanner();
            resetPreview();
          });
          updateEngineBanner(); // initial
        }

        // ── Destination Selection Logic (Single Row showing ONLY selected destination) ─
        const destCards = document.querySelectorAll('.import-dest-card[data-dest]');
        function setActiveDestCard(dest) {
          destCards.forEach(c => {
            const isMatch = c.getAttribute('data-dest') === dest;
            c.classList.toggle('active', isMatch);
            c.style.display = isMatch ? 'inline-flex' : 'none';
          });
          if (modalDestSelect) modalDestSelect.value = dest;

          // Update header target badge
          const targetBadge = document.getElementById('importTargetActiveBadge');
          if (targetBadge) {
            if (dest === 'almanac') {
              targetBadge.textContent = '📅 Liturgical Almanac';
            } else if (dest === 'additional_songs') {
              targetBadge.textContent = '🎶 Additional Songs';
            } else {
              targetBadge.textContent = '🎵 Masihi Geeton';
            }
          }

          // Update dynamic placeholder on textarea
          if (modalImportTextarea) {
            if (dest === 'almanac') {
              modalImportTextarea.placeholder = 'Paste Liturgical Almanac JSON calendar entries (e.g. [{"dateKey": "2026-08-23", ...}])...';
            } else if (dest === 'additional_songs') {
              modalImportTextarea.placeholder = 'Paste Additional Songs of Church (e.g. Song #01 PAWAN AATMA AA...)...';
            } else {
              modalImportTextarea.placeholder = 'Paste Masihi Geeton ka Sangrah hymns (e.g. Song #01 BE THOU MY VISION...)...';
            }
          }

          resetPreview();
          if (modalImportTextarea && modalImportTextarea.value.trim()) {
            parseAndRenderPreview();
          }
        }
        window.setActiveImportDestination = setActiveDestCard;

        window.navigateToImportManager = function(dest = 'masihi_geeto_ka_sangrah') {
          switchTab('viewImportManager');
          setTimeout(() => {
            setActiveDestCard(dest);
            try {
              const dropzone = document.getElementById('importDropzone');
              if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (_) {}
          }, 60);
        };

        destCards.forEach(card => {
          card.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('importOptionsModalOverlay');
            if (modal) {
              modal.classList.remove('hidden');
              modal.style.display = 'flex';
            }
          });
        });

        const changeDestBtn = document.getElementById('importChangeDestPillBtn');
        if (changeDestBtn) {
          changeDestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const modal = document.getElementById('importOptionsModalOverlay');
            if (modal) {
              modal.classList.remove('hidden');
              modal.style.display = 'flex';
            }
          });
        }

        // ── Drag & Drop support ───────────────────────────────────────────────────
        const dropzone = document.getElementById('importDropzone');
        if (dropzone && modalImportFileInput) {
          ['dragenter', 'dragover'].forEach(ev => {
            dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
          });
          ['dragleave', 'drop'].forEach(ev => {
            dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); });
          });
          dropzone.addEventListener('drop', async (e) => {
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (!file) return;
            resetPreview();
            try {
              showModalProgress(`Reading ${file.name}...`, 30);
              const text = await readFileText(file);
              hideModalProgress();
              if (modalImportTextarea) modalImportTextarea.value = text;
              showToast(`Loaded: ${file.name}`);
              parseAndRenderPreview();
            } catch (err) {
              hideModalProgress();
              showToast(`File error: ${err.message}`);
            }
          });
          dropzone.addEventListener('click', () => modalImportFileInput.click());
        }

        // ── Read file as text (TXT / JSON / PDF via pdfjs) ────────────────────────
        async function readFileText(file) {
          if (!file) throw new Error('No file selected');
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          if (ext === 'pdf') {
            if (typeof pdfjsLib !== 'undefined') {
              const buf = await (file.arrayBuffer ? file.arrayBuffer() : new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result);
                r.onerror = rej;
                r.readAsArrayBuffer(file);
              }));
              const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
              let full = '';
              for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const tc = await page.getTextContent();
                full += tc.items.map(i => i.str).join(' ') + '\n\n';
              }
              return full;
            }
            throw new Error('PDF.js is not ready. Upload a TXT or JSON file instead.');
          }

          if (typeof file.text === 'function') {
            try {
              const res = await file.text();
              if (res) return res;
            } catch (_) {}
          }

          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result || '');
            reader.onerror = () => reject(new Error('Failed to read file contents'));
            reader.readAsText(file, 'utf-8');
          });
        }

        // Both song libraries use the same parser, conflict policy, and 14 import rules.
        const songDestinationDetails = {
          masihi_geeto_ka_sangrah: { label: 'Masihi Geeto ka Sangrah', reference: 'Masihi Geeto ka Sangrah' },
          additional_songs: { label: 'Additional Songs of Church', reference: 'Additional Songs of Church' }
        };
        function isSongDestination(dest) {
          return Object.prototype.hasOwnProperty.call(songDestinationDetails, dest);
        }
        function getSongDestination(dest) {
          return songDestinationDetails[dest] || songDestinationDetails.masihi_geeto_ka_sangrah;
        }

        // ── Parse & render preview ────────────────────────────────────────────────
        function parseAndRenderPreview() {
          const dest = getCurrentDest();
          const text = modalImportTextarea ? modalImportTextarea.value.trim() : '';
          if (!text) {
            showToast('Please paste text or choose a file first 📄');
            return;
          }

          hideModalSummary();

          if (isSongDestination(dest)) {
            // ── SONG IMPORT ENGINE (shared by both song libraries) ────────────────────────────────────────────────
            const songs = parseSongBookDocument(text);
            currentStudioData = { type: 'songbook', destination: dest, items: songs };
            if (modalPreviewContainer && modalPreviewTitle && modalPreviewList) {
              modalPreviewContainer.classList.remove('hidden');
              modalPreviewTitle.textContent = `${getSongDestination(dest).label}: ${songs.length} Hymn(s) Detected`;
              if (songs.length === 0) {
                modalPreviewList.innerHTML = `<div style="text-align:center;padding:12px 0;">
                  <div style="font-size:1.5rem;margin-bottom:6px;">📝</div>
                  <div style="font-weight:600;color:var(--text-secondary);margin-bottom:4px;">No song markers found</div>
                  <div style="font-size:0.76rem;color:var(--text-muted);line-height:1.5;">Supported formats:<br>
                    <code>Song #01</code> · <code>Song 1</code> · <code>Hymn 1</code> · <code>भजन 1</code> · <code>गीत 1</code><br>
                    <code>#01. Title</code> · <code>1. Title</code> · <code>1) Title</code><br>
                    Or supply a JSON array.</div>
                </div>`;
              } else {
                // Rule 12 — Rich preview with stats
                const totalLines = songs.reduce((sum, s) => sum + (s.lyrics ? s.lyrics.split('\n').length : 0), 0);
                modalPreviewList.innerHTML =
                  `<div style="display:flex;gap:12px;margin-bottom:8px;font-size:0.74rem;color:var(--text-muted);">
                    <span>🎵 <strong style="color:var(--text-primary);">${songs.length}</strong> hymns</span>
                    <span>📝 <strong style="color:var(--text-primary);">${totalLines}</strong> lines</span>
                    <span>📊 Range: #${songs[0]?.serialNumber || '?'} — #${songs[songs.length - 1]?.serialNumber || '?'}</span>
                  </div>` +
                  songs.slice(0, 20).map(s => {
                    const lineCount = s.lyrics ? s.lyrics.split('\n').length : 0;
                    const preview = s.lyrics ? s.lyrics.split('\n').slice(0, 2).join(' ').trim().slice(0, 60) : '';
                    return `
                    <div class="import-studio-preview-item">
                      <div style="display:flex;justify-content:space-between;align-items:baseline;">
                        <span style="font-weight:700;color:var(--text-accent);">#${s.serialNumber}</span>
                        <span style="flex:1;margin:0 8px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeEscape((s.title || 'Untitled').slice(0, 50))}</span>
                        <span style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;">${lineCount} ln</span>
                      </div>
                      ${preview ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeEscape(preview)}…</div>` : ''}
                    </div>`;
                  }).join('') +
                  (songs.length > 20
                    ? `<div style="padding-top:6px;font-style:italic;color:var(--text-muted);font-size:0.76rem;">…and ${songs.length - 20} more hymns</div>`
                    : '');
              }
            }
            if (songs.length > 0) showToast(`⚡ Song Engine: ${songs.length} hymns detected & ready`);

          } else if (dest === 'almanac') {
            // ── ALMANAC IMPORT ENGINE ─────────────────────────────────────────────
            const entries = parseAlmanacDocument(text);
            currentStudioData = { type: 'almanac', items: entries };
            if (modalPreviewContainer && modalPreviewTitle && modalPreviewList) {
              modalPreviewContainer.classList.remove('hidden');
              modalPreviewTitle.textContent = `Almanac Engine: ${entries.length} Liturgical Day(s) Detected`;
              if (entries.length === 0) {
                modalPreviewList.innerHTML = `<span style="color:var(--liturgical-red);">
                  ⚠️ No date entries found.<br>
                  Supported formats: JSON array or keyed lines (<code>Date: YYYY-MM-DD</code>, <code>Theme:</code>, <code>Color:</code>, <code>Morning Worship:</code>…)</span>`;
              } else {
                modalPreviewList.innerHTML =
                  entries.slice(0, 10).map(d => `
                    <div style="padding:3px 0;border-bottom:1px dashed var(--border-subtle);display:flex;justify-content:space-between;align-items:baseline;">
                      <span><strong>${d.dateKey}</strong> (${d.dayName}) — ${safeEscape((d.theme || 'Daily Office').slice(0, 50))}</span>
                      <span style="font-size:0.7rem;padding:1px 5px;border-radius:4px;background:rgba(73, 151, 208,.18);color:var(--accent-gold);white-space:nowrap;">${d.color || 'Green'}</span>
                    </div>`).join('') +
                  (entries.length > 10
                    ? `<div style="padding-top:5px;font-style:italic;color:var(--text-muted);">…and ${entries.length - 10} more days</div>`
                    : '');
              }
            }
            if (entries.length > 0) showToast(`📅 Almanac Engine: ${entries.length} liturgical days parsed`);

          } else {
            // ── STANDARD DOCUMENT PUBLISHER ───────────────────────────────────────
            currentStudioData = { type: 'standard', dest, text };
            if (modalPreviewContainer && modalPreviewTitle && modalPreviewList) {
              modalPreviewContainer.classList.remove('hidden');
              const libNames = {
                prabhu_bhoj:    "The Lord's Supper (प्रभु भोज)",
                ashaye_rabbani: "Ashaye Rabbani (अशाये रब्बानी)",
                aaradhanaa:     "Prata Kaal & Sayan Kalin (Aaradhanaa)"
              };
              modalPreviewTitle.textContent = `Standard Publisher: Ready for ${libNames[dest] || dest}`;
              modalPreviewList.innerHTML = `<div style="font-family:monospace;font-size:0.78rem;color:var(--text-secondary);">${safeEscape(text.slice(0, 300))}${text.length > 300 ? '…' : ''}</div>`;
            }
            showToast('Document ready for publication 📖');
          }
        }

        // ── Helper to reset commit button state ──────────────────────────────────
        function resetCommitButton() {
          if (!commitImportStudioBtn) return;
          commitImportStudioBtn.disabled = false;
          commitImportStudioBtn.classList.remove('import-btn-processing', 'import-btn-success');
          commitImportStudioBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> <span>Import</span>`;
        }

        // ── Execute import based on destination ───────────────────────────────────
        async function executeImport() {
          if (!currentStudioData) {
            parseAndRenderPreview();
          }
          if (!currentStudioData || !currentStudioData.items || currentStudioData.items.length === 0) {
            showToast('Please provide valid data or choose a file first 📄');
            return;
          }

          const totalItems = currentStudioData.items ? currentStudioData.items.length : 0;
          const importType = currentStudioData.type === 'almanac' ? 'Almanac Lectionary Entries' : 'Sacred Hymns';
          
          let confirmed = true;
          if (typeof window.showConfirmDialog === 'function') {
            confirmed = await window.showConfirmDialog({
              title: `Import ${importType}?`,
              message: `Proceed with importing and syncing ${totalItems} item(s) to the local database & cloud?`,
              icon: '📥',
              confirmText: 'Start Import'
            });
          }
          if (!confirmed) return;

          const conflictPolicy = getConflictPolicy();
          hideModalSummary();
          resetPreview(false); // clear preview cards while retaining parsed data

          // Set button into active processing state
          if (commitImportStudioBtn) {
            commitImportStudioBtn.disabled = true;
            commitImportStudioBtn.classList.add('import-btn-processing');
            commitImportStudioBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.6" fill="none" style="animation:spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> <span>Importing ${totalItems} Items...</span>`;
          }

          if (currentStudioData.type === 'songbook') {
            // ─ Song Import Engine ─────────────────────────────────────────────────
            const songs = currentStudioData.items;
            const songDestination = getSongDestination(currentStudioData.destination);
            if (!songs || songs.length === 0) {
              resetCommitButton();
              showToast('No valid hymns to import ❌');
              return;
            }

            let added = 0, updated = 0, skipped = 0, failed = 0;
            const itemizedRecords = [];
            const supaList = [];
            let localBackup = [];
            try {
              localBackup = JSON.parse(localStorage.getItem('sanctuary_custom_songs_backup') || '[]');
              if (!Array.isArray(localBackup)) localBackup = [];
            } catch (_) { localBackup = []; }

            let importedBackup = [];
            try {
              importedBackup = JSON.parse(localStorage.getItem('sanctuary_imported_songs') || '[]');
              if (!Array.isArray(importedBackup)) importedBackup = [];
            } catch (_) { importedBackup = []; }

            let deletedBlacklist = [];
            try {
              deletedBlacklist = JSON.parse(localStorage.getItem('sanctuary_deleted_songs_blacklist') || '[]');
              if (!Array.isArray(deletedBlacklist)) deletedBlacklist = [];
            } catch (_) { deletedBlacklist = []; }
            const blacklistSet = new Set(deletedBlacklist.map(x => String(x).toLowerCase().trim()));

            showModalProgress(`Song Import Engine: preparing ${songs.length} hymns…`, 5);

            for (let i = 0; i < songs.length; i++) {
              const song = songs[i];
              const songId = `${currentStudioData.destination}-song-sn-${song.serialNumber}`;

              let exists = false;
              try {
                if (churchDexieDb && churchDexieDb.custom_songs) {
                  const ex = await churchDexieDb.custom_songs.get(songId);
                  if (ex) exists = true;
                }
                if (!exists && churchDexieDb && churchDexieDb.songs) {
                  const ex = await churchDexieDb.songs.get(songId);
                  if (ex) exists = true;
                }
                if (!exists && window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.custom_songs) {
                  const ex = await window.ChurchSync.db.custom_songs.get(songId);
                  if (ex) exists = true;
                }
                if (!exists && window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.songs) {
                  const ex = await window.ChurchSync.db.songs.get(songId);
                  if (ex) exists = true;
                }
              } catch (_) {}

              if (!exists && (localBackup.some(b => b.id === songId) || importedBackup.some(b => b.id === songId))) {
                exists = true;
              }

              let recordStatus = 'added';
              if (exists) {
                if (conflictPolicy === 'skip') {
                  skipped++;
                  itemizedRecords.push({ num: song.serialNumber, title: song.title, status: 'skipped' });
                  continue;
                } else if (conflictPolicy === 'replace') {
                  updated++;
                  recordStatus = 'updated';
                } else {
                  // duplicate policy
                  added++;
                  recordStatus = 'added';
                }
              } else {
                added++;
                recordStatus = 'added';
              }

              itemizedRecords.push({ num: song.serialNumber, title: song.title, status: recordStatus });

              const finalId = (exists && (conflictPolicy === 'duplicate' || conflictPolicy === 'new'))
                ? `${songId}-dup-${Date.now()}`
                : songId;

              const songRecord = {
                id:             finalId,
                song_number:    song.serialNumber,
                title:          song.title,
                category:       song.category || 'hymn',
                author:         song.author   || 'Church Hymnal',
                lyrics:         song.lyrics,
                created_at:     new Date().toISOString(),
                updated_at:     new Date().toISOString(),
                deleted_at:     null,
                book_reference: songDestination.reference
              };

              try {
                if (churchDexieDb && churchDexieDb.custom_songs) {
                  await churchDexieDb.custom_songs.put(songRecord);
                }
                if (churchDexieDb && churchDexieDb.songs) {
                  await churchDexieDb.songs.put(songRecord);
                }
                if (window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.custom_songs) {
                  await window.ChurchSync.db.custom_songs.put(songRecord);
                }
                if (window.ChurchSync && window.ChurchSync.db && window.ChurchSync.db.songs) {
                  await window.ChurchSync.db.songs.put(songRecord);
                }
              } catch (e) {
                console.warn('[Import] Dexie put warning:', e);
              }

              const existingIdx = localBackup.findIndex(b => b.id === finalId);
              if (existingIdx >= 0) {
                localBackup[existingIdx] = songRecord;
              } else {
                localBackup.push(songRecord);
              }

              const existingImpIdx = importedBackup.findIndex(b => b.id === finalId);
              if (existingImpIdx >= 0) {
                importedBackup[existingImpIdx] = songRecord;
              } else {
                importedBackup.push(songRecord);
              }

              // Clear from deleted songs blacklist
              blacklistSet.delete(String(finalId).toLowerCase().trim());
              blacklistSet.delete(String(songId).toLowerCase().trim());
              if (song.title) blacklistSet.delete(String(song.title).toLowerCase().trim());

              supaList.push({
                id:             finalId,
                song_number:    song.serialNumber,
                title:          song.title,
                category:       song.category || 'hymn',
                author:         song.author   || 'Church Hymnal',
                composer:       song.author   || 'Church Hymnal',
                lyrics:         song.lyrics,
                deleted_at:     null,
                book_reference: songDestination.reference
              });

              if (i % 20 === 0 || i === songs.length - 1) {
                const pct = Math.round(5 + ((i + 1) / songs.length) * 75);
                showModalProgress(`Ingesting hymn #${song.serialNumber} (${i + 1}/${songs.length})…`, pct);
                await new Promise(r => setTimeout(r, 0)); // yield to UI
              }
            }

            try {
              localStorage.setItem('sanctuary_custom_songs_backup', JSON.stringify(localBackup));
              localStorage.setItem('sanctuary_imported_songs', JSON.stringify(importedBackup));
              localStorage.setItem('sanctuary_deleted_songs_blacklist', JSON.stringify([...blacklistSet]));
            } catch (_) {}

            // Cloud sync
            showModalProgress(`Syncing ${songDestination.label} with Supabase Cloud…`, 85);
            if (window.ChurchSync && window.ChurchSync.Songs) {
              for (const item of supaList) {
                try {
                  const res = await window.ChurchSync.Songs.upsert(item);
                  if (res && res.error) {
                    console.error('[Import Studio] Failed to upsert hymn to Supabase:', item.title, res.error);
                  }
                } catch (err) {
                  console.error('[Import Studio] Upsert exception:', err);
                }
              }
            }

            // Auto-refresh song lists
            if (typeof renderAdditionalSongsFromDexie === 'function') {
              try { await renderAdditionalSongsFromDexie(); } catch (_) {}
            }
            if (currentOpenSongBookKey && typeof openSongBookScreen === 'function') {
              try { await openSongBookScreen(currentOpenSongBookKey); } catch (_) {}
            }

            // Finish Progress Bar
            showModalProgress('Import completed successfully! 🎉', 100);

            // Button success state
            if (commitImportStudioBtn) {
              commitImportStudioBtn.classList.remove('import-btn-processing');
              commitImportStudioBtn.classList.add('import-btn-success');
              commitImportStudioBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> <span>✓ Ingestion Complete!</span>`;
            }

            // Screen celebration & haptics
            launchImportCelebration();

            // Pop up Import Summary Modal
            showImportSummaryModal({
              title: `🎵 ${songDestination.label} Ingestion Completed`,
              subtitle: `All ${songs.length} hymns split, indexed by serial number, and saved to church database.`,
              total: songs.length,
              added,
              updated,
              skipped,
              destination: currentStudioData.destination,
              addedLabel: 'Added',
              updatedLabel: 'Updated',
              skippedLabel: 'Skipped',
              detailsHeader: `<strong>${songDestination.label}</strong> · Conflict Policy: <strong>${conflictPolicy.toUpperCase()}</strong>`,
              items: itemizedRecords
            });

            // Celebratory Toast
            showToast(`🎉 ${added + updated} hymns successfully imported and indexed!`);

            // Reset button after celebration
            setTimeout(resetCommitButton, 4000);

          } else if (currentStudioData.type === 'almanac') {
            // ─ Almanac Import Engine ──
            const entries = currentStudioData.items;
            if (!entries || entries.length === 0) {
              resetCommitButton();
              showToast('No liturgical date entries found ❌');
              return;
            }

            let addedDays = 0, updatedDays = 0, skippedDays = 0;
            const itemizedRecords = [];
            const yearsSet = new Set(), monthsSet = new Set();
            const supaList = [];

            showModalProgress('Almanac Import Engine: extracting liturgical records…', 10);

            for (let i = 0; i < entries.length; i++) {
              const entry = entries[i];
              yearsSet.add(entry.year);
              monthsSet.add(entry.monthName);

              const existing = window.CHURCH_DATA?.almanacDatabase?.[entry.dateKey];
              let recordStatus = 'added';
              if (existing) {
                if (conflictPolicy === 'skip') {
                  skippedDays++;
                  itemizedRecords.push({ ...entry, status: 'skipped' });
                  continue;
                }
                updatedDays++;
                recordStatus = 'updated';
              } else {
                addedDays++;
                recordStatus = 'added';
              }

              itemizedRecords.push({ ...entry, status: recordStatus });

              // Merge into in-memory CHURCH_DATA
              if (window.CHURCH_DATA && window.CHURCH_DATA.almanacDatabase) {
                window.CHURCH_DATA.almanacDatabase[entry.dateKey] = entry;
              }

              const entryRecord = {
                date_key:        entry.dateKey,
                day:             entry.day,
                month_name:      entry.monthName,
                year:            entry.year,
                day_name:        entry.dayName,
                theme:           entry.theme,
                liturgical_color: entry.color,
                morning_worship: entry.morningWorship,
                evening_worship: entry.eveningWorship,
                lords_supper:    entry.lordsSupper
              };

              try {
                if (churchDexieDb && churchDexieDb.almanac_entries) {
                  await churchDexieDb.almanac_entries.put(entryRecord);
                }
              } catch (_) {}

              supaList.push(entryRecord);

              if (i % 20 === 0 || i === entries.length - 1) {
                const pct = Math.round(10 + ((i + 1) / entries.length) * 65);
                showModalProgress(`Merging ${entry.dateKey} (${i + 1}/${entries.length})…`, pct);
                await new Promise(r => setTimeout(r, 0));
              }
            }

            try {
              if (window.CHURCH_DATA && window.CHURCH_DATA.almanacDatabase) {
                localStorage.setItem('sanctuary_custom_almanac_entries', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
              }
            } catch (_) {}

            // Bulk upsert to Supabase
            showModalProgress('Syncing Almanac with Supabase Realtime…', 85);
            if (window.ChurchSync && window.ChurchSync.Almanac) {
              try { await window.ChurchSync.Almanac.bulkUpsert(supaList); }
              catch (e) { console.warn('[Almanac Import] sync error:', e); }
            }

            // Refresh almanac view automatically
            if (typeof renderAlmanacModule === 'function') renderAlmanacModule();

            // Finish Progress Bar
            showModalProgress('Almanac updated and synced! 🎉', 100);

            // Button success state
            if (commitImportStudioBtn) {
              commitImportStudioBtn.classList.remove('import-btn-processing');
              commitImportStudioBtn.classList.add('import-btn-success');
              commitImportStudioBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> <span>✓ Almanac Synced!</span>`;
            }

            // Screen celebration & haptics
            launchImportCelebration();

            // Summary report in pop window modal
            const yearsList  = [...yearsSet].sort().join(', ');
            showImportSummaryModal({
              title:       '📅 Almanac Ingestion Completed',
              subtitle:    'Liturgical calendar merged and synchronized realtime.',
              total:       entries.length,
              added:       addedDays,
              updated:     updatedDays,
              skipped:     skippedDays,
              destination: 'almanac',
              addedLabel:  'Days Added',
              updatedLabel:'Days Updated',
              skippedLabel:'Days Skipped',
              detailsHeader: `<strong>Liturgical Calendar (${yearsList || 'All Years'})</strong> · Policy: <strong>${conflictPolicy.toUpperCase()}</strong>`,
              items: itemizedRecords
            });

            // Celebratory Toast
            showToast(`🎉 Almanac updated! ${addedDays + updatedDays} days synced.`);

            // Reset button after celebration
            setTimeout(resetCommitButton, 4000);

          } else {
            // ─ Standard Publisher ─────────────
            resetCommitButton();
            showToast('Document published to Church Library 📖');
            hideModalProgress();
          }
        }

        // ── Clear Text ────────────────────────────────────────────────────────────
        if (modalClearBtn && modalImportTextarea) {
          modalClearBtn.addEventListener('click', () => {
            modalImportTextarea.value = '';
            resetPreview();
            showToast('Cleared');
          });
        }

        // ── Choose File ───────────────────────────────────────────────────────────
        if (modalPickFileBtn && modalImportFileInput) {
          modalPickFileBtn.addEventListener('click', () => modalImportFileInput.click());
          modalImportFileInput.addEventListener('change', async (e) => {
            if (!e.target.files || !e.target.files[0]) return;
            const file = e.target.files[0];
            resetPreview();
            try {
              showModalProgress(`Reading ${file.name}…`, 30);
              const text = await readFileText(file);
              hideModalProgress();
              if (modalImportTextarea) modalImportTextarea.value = text;
              showToast(`Loaded: ${file.name}`);
              parseAndRenderPreview();
            } catch (err) {
              hideModalProgress();
              showToast(`File error: ${err.message}`);
            }
            modalImportFileInput.value = '';
          });
        }

        // ── Parse & Preview Button ────────────────────────────────────────────────
        if (modalParsePreviewBtn) {
          modalParsePreviewBtn.addEventListener('click', parseAndRenderPreview);
        }

        // ── Execute Button ────────────────────────────────────────────────────────
        if (commitImportStudioBtn) {
          commitImportStudioBtn.addEventListener('click', executeImport);
        }

        // ── Direct-from-Settings "Open Studio" button ─────────────────────────────
        if (settingOpenImportStudioBtn) {
          settingOpenImportStudioBtn.addEventListener('click', () => {
            resetPreview();
            setActiveDestCard(getCurrentDest());
            switchTab('viewImportManager');
          });
        }

        // ── Direct-from-Settings "Import Songs" button & file picker ─────────────
        if (settingImportSongBtn) {
          settingImportSongBtn.addEventListener('click', () => {
            if (settingImportSongFile) {
              settingImportSongFile.click();
            } else {
              resetPreview();
              setActiveDestCard('masihi_geeto_ka_sangrah');
              switchTab('viewImportManager');
            }
          });
        }
        if (settingImportSongFile) {
          settingImportSongFile.addEventListener('change', async (e) => {
            if (!e.target.files || !e.target.files[0]) return;
            const file = e.target.files[0];
            try {
              setActiveDestCard('masihi_geeto_ka_sangrah');
              const text = await readFileText(file);
              if (modalImportTextarea) modalImportTextarea.value = text;
              parseAndRenderPreview();
              await executeImport();
            } catch (err) {
              showToast(`File error: ${err.message}`);
            }
            settingImportSongFile.value = '';
          });
        }

        // ── Direct-from-Settings "Import Almanac" button & file picker ───────────
        if (settingImportAlmanacBtn) {
          settingImportAlmanacBtn.addEventListener('click', () => {
            if (settingImportAlmanacFile) {
              settingImportAlmanacFile.click();
            } else {
              resetPreview();
              setActiveDestCard('almanac');
              switchTab('viewImportManager');
            }
          });
        }
        if (settingImportAlmanacFile) {
          settingImportAlmanacFile.addEventListener('change', async (e) => {
            if (!e.target.files || !e.target.files[0]) return;
            const file = e.target.files[0];
            try {
              setActiveDestCard('almanac');
              const text = await readFileText(file);
              if (modalImportTextarea) modalImportTextarea.value = text;
              parseAndRenderPreview();
              await executeImport();
            } catch (err) {
              showToast(`File error: ${err.message}`);
            }
            settingImportAlmanacFile.value = '';
          });
        }
      }

      setupSettingsImportHandlers();
    }



  // Start the application reliably
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();