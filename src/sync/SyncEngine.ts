/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v1
 * ============================================================================
 * Core synchronization runtime:
 *   1. Delta Pull (fetch sync_changes where seq > lastSeq) on start & reconnect.
 *   2. Single Supabase Realtime channel subscribed to all synced tables.
 *   3. Auto-reconnect with exponential backoff.
 *   4. Conflict rule: Server wins, higher version wins.
 *   5. Tombstones: on delete event, remove row from Dexie.
 *   6. Batched Dexie writes.
 * ============================================================================
 */

import {
  SyncedSegment,
  SyncStatus,
  SyncChangeRecord,
  BaseSyncedRecord,
  SyncOp
} from './types';
import { syncDb } from './db';
import { syncRegistry } from './syncRegistry';

export class SyncEngine {
  private static instance: SyncEngine | null = null;

  private _status: SyncStatus = 'offline';
  private _lastSyncedAt: Date | null = null;
  private _supabaseClient: any = null;
  private _realtimeChannel: any = null;
  private _reconnectTimeout: any = null;
  private _reconnectAttempts = 0;
  private _isPulling = false;
  private _isStarted = false;
  private _listeners: Array<(status: SyncStatus, lastSyncedAt: Date | null) => void> = [];

  private readonly MAX_BACKOFF_MS = 30000;
  private readonly BASE_BACKOFF_MS = 1000;

  constructor(supabaseClient?: any) {
    if (supabaseClient) {
      this._supabaseClient = supabaseClient;
    } else if (typeof window !== 'undefined') {
      this._supabaseClient = (window as any).churchSupabase || (window as any).ChurchSync?.client || null;
    }
  }

  public static getInstance(supabaseClient?: any): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine(supabaseClient);
    }
    return SyncEngine.instance;
  }

  public get status(): SyncStatus {
    return this._status;
  }

  public get lastSyncedAt(): Date | null {
    return this._lastSyncedAt;
  }

  public onStatusChange(callback: (status: SyncStatus, lastSyncedAt: Date | null) => void): () => void {
    this._listeners.push(callback);
    callback(this._status, this._lastSyncedAt);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  private _setStatus(newStatus: SyncStatus): void {
    if (this._status !== newStatus) {
      this._status = newStatus;
      this._listeners.forEach(cb => {
        try { cb(this._status, this._lastSyncedAt); } catch (_) {}
      });
    }
  }

  /**
   * Start the Sync Engine:
   * Initializes network watchers, pulls initial delta, and opens unified Realtime channel.
   */
  public async start(): Promise<void> {
    if (this._isStarted) return;
    this._isStarted = true;

    // Attach connectivity listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._handleOnline);
      window.addEventListener('offline', this._handleOffline);
      document.addEventListener('visibilitychange', this._handleVisibilityChange);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this._setStatus('offline');
      return;
    }

    this._setStatus('syncing');

    // Perform initial delta pull (or full seed on fresh install)
    await this.pullDelta();

    // Subscribe to unified realtime channel
    this._subscribeRealtime();
  }

  /**
   * Stop the Sync Engine and clean up all listeners and sockets.
   */
  public stop(): void {
    this._isStarted = false;
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._handleOnline);
      window.removeEventListener('offline', this._handleOffline);
      document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }
    if (this._realtimeChannel && this._supabaseClient) {
      try {
        this._supabaseClient.removeChannel(this._realtimeChannel);
      } catch (_) {}
      this._realtimeChannel = null;
    }
    this._setStatus('offline');
  }

  private _handleOnline = async (): Promise<void> => {
    console.log('[SyncEngine] Network restored — pulling delta and reconnecting realtime...');
    this._reconnectAttempts = 0;
    this._setStatus('syncing');
    await this.pullDelta();
    this._subscribeRealtime();
    // Flush outbox if any pending admin writes
    if (typeof (window as any).syncWriteFlushOutbox === 'function') {
      (window as any).syncWriteFlushOutbox();
    }
  };

  private _handleOffline = (): void => {
    console.log('[SyncEngine] Network lost — switching to offline Dexie cache.');
    this._setStatus('offline');
  };

  private _handleVisibilityChange = async (): Promise<void> => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await this.pullDelta();
      }
    }
  };

  /**
   * Pull Delta:
   * 1. Check last processed sequence per segment from Dexie `sync_meta`.
   * 2. If fresh install (no meta), perform lean full pull of active rows.
   * 3. Otherwise fetch sync_changes where seq > lastSeq.
   * 4. Apply all changes atomically in Dexie.
   */
  public async pullDelta(): Promise<void> {
    if (this._isPulling) return;
    this._isPulling = true;

    try {
      this._setStatus('syncing');
      const client = this._getClient();
      if (!client) {
        this._setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
        return;
      }

      const segments = Object.keys(syncRegistry) as SyncedSegment[];

      for (const seg of segments) {
        const metaKey = `last_seq_${seg}`;
        const metaRecord = await syncDb.sync_meta.get(metaKey);
        const lastSeq = metaRecord ? Number(metaRecord.value) || 0 : 0;

        if (lastSeq === 0) {
          // Fresh install: initial full pull for this segment
          await this._fullPullSegment(seg);
        } else {
          // Delta pull using sync_changes
          await this._deltaPullSegment(seg, lastSeq);
        }
      }

      this._lastSyncedAt = new Date();
      this._setStatus('synced');
    } catch (err) {
      console.warn('[SyncEngine] Delta pull error:', err);
      this._setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
    } finally {
      this._isPulling = false;
    }
  }

  private async _fullPullSegment(segment: SyncedSegment): Promise<void> {
    const reg = syncRegistry[segment];
    if (!reg) return;

    try {
      const client = this._getClient();
      const { data, error } = await client
        .from(reg.table)
        .select('*')
        .is('deleted_at', null);

      if (error) {
        console.warn(`[SyncEngine] Full pull failed for table ${reg.table}:`, error);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const tableStore = (syncDb as any)[reg.storeName];
        if (tableStore) {
          await syncDb.transaction('rw', tableStore, syncDb.sync_meta, async () => {
            // Apply items in a single Dexie batch transaction
            await tableStore.bulkPut(data);
          });
        }

        // Apply registry side effects (e.g. updating localStorage or UI state without jumping)
        data.forEach(item => {
          if (reg.onApplied) reg.onApplied(item, 'insert');
        });
      }

      // Query latest seq for this segment from sync_changes to establish checkpoint
      const { data: latestChange } = await client
        .from('sync_changes')
        .select('seq')
        .eq('segment', segment)
        .order('seq', { ascending: false })
        .limit(1);

      const latestSeq = (latestChange && latestChange[0] && latestChange[0].seq) ? Number(latestChange[0].seq) : 1;
      await syncDb.sync_meta.put({
        key: `last_seq_${segment}`,
        value: latestSeq,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn(`[SyncEngine] Full pull exception for ${segment}:`, err);
    }
  }

  private async _deltaPullSegment(segment: SyncedSegment, lastSeq: number): Promise<void> {
    const reg = syncRegistry[segment];
    if (!reg) return;

    try {
      const client = this._getClient();
      const { data: changes, error } = await client
        .from('sync_changes')
        .select('*')
        .eq('segment', segment)
        .gt('seq', lastSeq)
        .order('seq', { ascending: true })
        .limit(200);

      if (error) {
        console.warn(`[SyncEngine] Delta fetch failed for ${segment}:`, error);
        return;
      }

      if (!Array.isArray(changes) || changes.length === 0) {
        return;
      }

      let maxSeq = lastSeq;
      const tableStore = (syncDb as any)[reg.storeName];

      for (const change of changes) {
        const op: SyncOp = (change.op || 'update').toLowerCase() as SyncOp;
        const rowId = change.row_id;
        maxSeq = Math.max(maxSeq, Number(change.seq));

        if (op === 'delete') {
          // Tombstone: remove from Dexie
          if (tableStore) {
            await tableStore.delete(rowId);
          }
          if (reg.onApplied) {
            reg.onApplied({ id: rowId } as any, 'delete');
          }
        } else {
          // Insert or update: fetch the current row if payload not complete
          let record = change.payload;
          if (!record || !record.id) {
            const { data: rowData } = await client
              .from(reg.table)
              .select('*')
              .eq('id', rowId)
              .maybeSingle();
            record = rowData;
          }

          if (record) {
            const local = tableStore ? await tableStore.get(rowId) : undefined;
            const merged = await reg.merge(local, record, op);

            if (merged === null) {
              if (tableStore) await tableStore.delete(rowId);
              if (reg.onApplied) reg.onApplied(record, 'delete');
            } else if (merged) {
              if (tableStore) await tableStore.put(merged);
              if (reg.onApplied) reg.onApplied(merged, op);
            }
          }
        }
      }

      // Update checkpoint
      await syncDb.sync_meta.put({
        key: `last_seq_${segment}`,
        value: maxSeq,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn(`[SyncEngine] Delta apply exception for ${segment}:`, err);
    }
  }

  /**
   * Unified Supabase Realtime Subscription:
   * Opens ONE channel listening to all 6 synced tables + sync_changes.
   */
  private _subscribeRealtime(): void {
    const client = this._getClient();
    if (!client) return;

    if (this._realtimeChannel) {
      try { client.removeChannel(this._realtimeChannel); } catch (_) {}
      this._realtimeChannel = null;
    }

    try {
      const channel = client.channel('church-companion-sync-unified');

      // Subscribe to postgres changes on each table in public schema
      const tables = [
        'songs',
        'about_church',
        'announcements',
        'todays_song_selection',
        'prayer_books',
        'almanac_entries'
      ];

      tables.forEach(tableName => {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          async (payload: any) => {
            await this._handleRealtimeChange(tableName, payload);
          }
        );
      });

      channel.subscribe((status: string, err: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('[SyncEngine] Unified Realtime channel active for all synced tables.');
          this._reconnectAttempts = 0;
          this._setStatus('synced');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn(`[SyncEngine] Realtime channel dropped (${status}). Scheduling reconnect...`, err || '');
          this._setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
          this._scheduleReconnect();
        }
      });

      this._realtimeChannel = channel;
    } catch (err) {
      console.error('[SyncEngine] Failed to initialize Realtime channel:', err);
      this._scheduleReconnect();
    }
  }

  /**
   * Exponential backoff reconnect scheduler.
   */
  private _scheduleReconnect(): void {
    if (this._reconnectTimeout) return;
    this._reconnectAttempts++;
    const delay = Math.min(
      this.BASE_BACKOFF_MS * Math.pow(2, this._reconnectAttempts - 1),
      this.MAX_BACKOFF_MS
    );

    console.log(`[SyncEngine] Reconnecting in ${delay}ms (attempt #${this._reconnectAttempts})...`);
    this._reconnectTimeout = setTimeout(async () => {
      this._reconnectTimeout = null;
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await this.pullDelta();
        this._subscribeRealtime();
      }
    }, delay);
  }

  /**
   * Handle incoming Realtime postgres_changes event immediately.
   */
  private async _handleRealtimeChange(table: string, payload: any): Promise<void> {
    // Find matching segment registry
    const entry = Object.values(syncRegistry).find(r => r.table === table);
    if (!entry) return;

    try {
      const eventType: string = payload.eventType || payload.type || '';
      const newRec = payload.new || payload.record;
      const oldRec = payload.old || payload.old_record;
      const tableStore = (syncDb as any)[entry.storeName];

      if (eventType === 'DELETE' || (newRec && newRec.deleted_at)) {
        const idToDelete = (newRec && newRec.id) || (oldRec && oldRec.id);
        if (idToDelete && tableStore) {
          await tableStore.delete(idToDelete);
        }
        if (entry.onApplied) {
          entry.onApplied((newRec || oldRec || { id: idToDelete }) as any, 'delete');
        }
      } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (newRec && newRec.id) {
          const local = tableStore ? await tableStore.get(newRec.id) : undefined;
          const merged = await entry.merge(local, newRec, eventType.toLowerCase() as SyncOp);

          if (merged === null) {
            if (tableStore) await tableStore.delete(newRec.id);
            if (entry.onApplied) entry.onApplied(newRec, 'delete');
          } else if (merged) {
            if (tableStore) await tableStore.put(merged);
            if (entry.onApplied) entry.onApplied(merged, eventType.toLowerCase() as SyncOp);
          }
        }
      }

      this._lastSyncedAt = new Date();
      this._setStatus('synced');
    } catch (err) {
      console.warn(`[SyncEngine] Realtime event processing error for ${table}:`, err);
    }
  }

  private _getClient(): any {
    if (this._supabaseClient) return this._supabaseClient;
    if (typeof window !== 'undefined') {
      return (window as any).churchSupabase || (window as any).ChurchSync?.client || null;
    }
    return null;
  }
}
