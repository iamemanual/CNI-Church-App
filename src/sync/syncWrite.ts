/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v1 Admin Write Abstraction
 * ============================================================================
 * Admin writes go through syncWrite(segment, op, payload):
 *   1. Role validation: Super Admin or Admin only. Members are blocked.
 *   2. Online: writes straight to Supabase Cloud REST.
 *   3. Offline / Error: queues in Dexie `sync_outbox` and auto-flushes on reconnect.
 *   4. Optimistically updates Dexie immediately.
 *   5. Handles special cases:
 *      - today_song_selection: single row per date (upsert on date_key)
 *      - announcements: trigger OneSignal push on insert if configured
 *      - almanac: bulk imports written in batch and applied in single transaction
 * ============================================================================
 */

import { SyncedSegment, SyncOp, SyncOutboxItem } from './types';
import { syncDb } from './db';
import { syncRegistry } from './syncRegistry';

/**
 * Verify whether the current active session has write permission (Super Admin or Admin).
 */
export function canWrite(): boolean {
  if (typeof window === 'undefined') return false;
  const session = (window as any).currentAuthSession;
  if (!session) return false;

  const email = (session.email || '').toLowerCase().trim();
  const role = (session.role || '').toLowerCase().trim();
  const displayName = (session.display_name || '').toLowerCase().trim();

  return (
    email === 'emanualmridha2@gmail.com' ||
    role === 'superadmin' ||
    role === 'admin' ||
    displayName.includes('emanual')
  );
}

/**
 * Master Admin Write entrypoint.
 */
export async function syncWrite<T = any>(
  segment: SyncedSegment,
  op: SyncOp,
  payload: any
): Promise<{ success: boolean; data?: T; error?: any; queuedOffline?: boolean }> {
  // 1. Role Verification: Guard write path
  if (!canWrite()) {
    const err = new Error('Permission denied: Congregation members are read-only subscribers.');
    console.error('[syncWrite]', err.message);
    if (typeof window !== 'undefined' && typeof (window as any).showToast === 'function') {
      (window as any).showToast('Read-only: Super Admin permissions required');
    }
    return { success: false, error: err };
  }

  const reg = syncRegistry[segment];
  if (!reg) {
    return { success: false, error: new Error(`Unknown synced segment: ${segment}`) };
  }

  const tableStore = (syncDb as any)[reg.storeName];

  // 2. Normalize and prepare payload
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const client = typeof window !== 'undefined' ? ((window as any).churchSupabase || (window as any).ChurchSync?.client) : null;

  // Handle special case: today_song_selection (single row per date)
  if (segment === 'today_song_selection') {
    if (!payload.date_key) {
      payload.date_key = new Date().toISOString().split('T')[0];
    }
    if (!payload.id) {
      // Deterministic UUID for the date key or current
      payload.id = '00000000-0000-0000-0000-' + payload.date_key.replace(/-/g, '').padStart(12, '0');
    }
  }

  // Handle special case: almanac bulk imports
  if (segment === 'almanac' && Array.isArray(payload)) {
    return handleAlmanacBulkImport(payload, isOnline, client);
  }

  // Ensure UUID on new records
  if (op === 'insert' && !payload.id) {
    payload.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now());
  }

  payload.updated_at = new Date().toISOString();

  // 3. Optimistic Dexie Update (instant UI feedback)
  if (tableStore) {
    try {
      if (op === 'delete') {
        const delId = payload.id || payload;
        await tableStore.delete(delId);
        if (reg.onApplied) reg.onApplied({ id: delId } as any, 'delete');
      } else {
        await tableStore.put(payload);
        if (reg.onApplied) reg.onApplied(payload, op);
      }
    } catch (dbErr) {
      console.warn('[syncWrite] Optimistic Dexie write warning:', dbErr);
    }
  }

  // 4. If offline or no client, queue into Dexie outbox
  if (!isOnline || !client) {
    await queueOutbox(segment, op, payload);
    return { success: true, data: payload, queuedOffline: true };
  }

  // 5. Online Supabase Execution
  try {
    let result: any = null;

    if (op === 'insert') {
      const { data, error } = await client
        .from(reg.table)
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) throw error;
      result = data || payload;

      // Special case: Announcements OneSignal push notification
      if (segment === 'announcements') {
        triggerOneSignalAnnouncementPush(payload);
      }
    } else if (op === 'update') {
      const { data, error } = await client
        .from(reg.table)
        .update(payload)
        .eq('id', payload.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      result = data || payload;
    } else if (op === 'delete') {
      const delId = payload.id || payload;
      // Soft delete: set deleted_at to now()
      const { data, error } = await client
        .from(reg.table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', delId)
        .select()
        .maybeSingle();

      if (error) throw error;
      result = data || { id: delId };
    }

    return { success: true, data: result };
  } catch (netErr) {
    console.warn('[syncWrite] Remote write failed, queuing into offline outbox:', netErr);
    await queueOutbox(segment, op, payload);
    return { success: true, data: payload, queuedOffline: true, error: netErr };
  }
}

/**
 * Handle Almanac bulk imports in a single Dexie transaction and single Supabase batch.
 */
async function handleAlmanacBulkImport(
  entries: any[],
  isOnline: boolean,
  client: any
): Promise<{ success: boolean; count: number; error?: any; queuedOffline?: boolean }> {
  const nowIso = new Date().toISOString();
  const normalized = entries.map(e => ({
    ...e,
    id: e.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
    updated_at: e.updated_at || nowIso,
    version: Number(e.version) || 1
  }));

  // Apply batch in a single Dexie transaction
  try {
    await syncDb.transaction('rw', syncDb.almanac_entries, async () => {
      await syncDb.almanac_entries.bulkPut(normalized);
    });
  } catch (dexErr) {
    console.warn('[syncWrite] Almanac bulk Dexie write error:', dexErr);
  }

  // Update in-memory database and UI
  if (typeof window !== 'undefined') {
    if (!(window as any).CHURCH_DATA) (window as any).CHURCH_DATA = {};
    if (!(window as any).CHURCH_DATA.almanacDatabase) (window as any).CHURCH_DATA.almanacDatabase = {};
    normalized.forEach(item => {
      let parsed = item.details;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (_) {}
      }
      (window as any).CHURCH_DATA.almanacDatabase[item.date_key] = {
        ...((window as any).CHURCH_DATA.almanacDatabase[item.date_key] || {}),
        ...(parsed || { dateKey: item.date_key, year: item.year, theme: item.title, color: item.liturgical_color })
      };
    });
    try {
      localStorage.setItem('sanctuary_custom_almanac', JSON.stringify((window as any).CHURCH_DATA.almanacDatabase));
    } catch (_) {}
    if (typeof (window as any).renderAlmanacModule === 'function') {
      try { (window as any).renderAlmanacModule(); } catch (_) {}
    }
  }

  if (!isOnline || !client) {
    await queueOutbox('almanac', 'insert', normalized);
    return { success: true, count: normalized.length, queuedOffline: true };
  }

  try {
    const { error } = await client
      .from('almanac_entries')
      .upsert(normalized, { onConflict: 'date_key' });

    if (error) throw error;
    return { success: true, count: normalized.length };
  } catch (err) {
    console.warn('[syncWrite] Almanac remote batch failed, queued offline:', err);
    await queueOutbox('almanac', 'insert', normalized);
    return { success: true, count: normalized.length, queuedOffline: true, error: err };
  }
}

/**
 * Queue an operation into Dexie `sync_outbox` for replay on reconnect.
 */
async function queueOutbox(segment: SyncedSegment, op: SyncOp, payload: any): Promise<void> {
  try {
    const item: SyncOutboxItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('outbox-' + Date.now()),
      segment,
      op,
      payload,
      created_at: Date.now(),
      retry_count: 0
    };
    await syncDb.sync_outbox.put(item);
    console.log(`[syncWrite] Queued ${op} on ${segment} to Dexie outbox.`);
  } catch (e) {
    console.error('[syncWrite] Failed to write to sync_outbox:', e);
  }
}

/**
 * Flush all pending items from Dexie `sync_outbox` upon reconnect.
 */
export async function flushOutbox(): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) return;

  const client = typeof window !== 'undefined' ? ((window as any).churchSupabase || (window as any).ChurchSync?.client) : null;
  if (!client) return;

  try {
    const items = await syncDb.sync_outbox.orderBy('created_at').toArray();
    if (items.length === 0) return;

    console.log(`[syncWrite] Flushing ${items.length} queued items from outbox...`);

    for (const item of items) {
      const reg = syncRegistry[item.segment];
      if (!reg) {
        await syncDb.sync_outbox.delete(item.id);
        continue;
      }

      try {
        if (item.op === 'insert' || item.op === 'update') {
          if (Array.isArray(item.payload)) {
            await client.from(reg.table).upsert(item.payload);
          } else {
            await client.from(reg.table).upsert(item.payload);
          }
        } else if (item.op === 'delete') {
          const delId = item.payload.id || item.payload;
          await client
            .from(reg.table)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', delId);
        }

        // Successfully replayed: remove from outbox
        await syncDb.sync_outbox.delete(item.id);
      } catch (replayErr) {
        console.warn(`[syncWrite] Outbox replay failed for item ${item.id}:`, replayErr);
        await syncDb.sync_outbox.update(item.id, {
          retry_count: (item.retry_count || 0) + 1,
          error: String(replayErr)
        });
      }
    }
  } catch (err) {
    console.error('[syncWrite] Outbox flush exception:', err);
  }
}

/**
 * Trigger OneSignal push notification for newly inserted announcements.
 */
function triggerOneSignalAnnouncementPush(announcement: any): void {
  try {
    if (typeof window === 'undefined') return;
    const title = announcement.title || 'Church Announcement';
    const body = announcement.body || announcement.details || 'New announcement posted';

    // 1. Native OneSignal Cordova / Capacitor Plugin
    if ((window as any).plugins && (window as any).plugins.OneSignal) {
      (window as any).plugins.OneSignal.postNotification?.({
        contents: { en: body },
        headings: { en: `📢 ${title}` },
        included_segments: ['All']
      });
    }

    // 2. Web OneSignal SDK
    if ((window as any).OneSignal && typeof (window as any).OneSignal.sendSelfNotification === 'function') {
      (window as any).OneSignal.sendSelfNotification(title, body, window.location.href);
    }
  } catch (e) {
    console.warn('[syncWrite] OneSignal push trigger exception:', e);
  }
}

// Expose flush outbox globally for reconnect events
if (typeof window !== 'undefined') {
  (window as any).syncWriteFlushOutbox = flushOutbox;
}
