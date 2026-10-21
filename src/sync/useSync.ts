/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v1 Reactive Data Hook
 * ============================================================================
 * useSync(segment) returns:
 *   { data, loading, lastSyncedAt }
 *
 * Backed by Dexie reactive live querying & custom sync event dispatchers.
 * Replaces direct REST calls for all six synced segments:
 *   - songbook
 *   - about_church
 *   - announcements
 *   - today_song_selection
 *   - prayer_books
 *   - almanac
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { SyncedSegment } from './types';
import { syncDb } from './db';
import { syncRegistry } from './syncRegistry';
import { SyncEngine } from './SyncEngine';

export interface UseSyncResult<T = any> {
  data: T[];
  loading: boolean;
  lastSyncedAt: Date | null;
}

/**
 * React Hook for reactive synced segment data.
 */
export function useSync<T = any>(segment: SyncedSegment): UseSyncResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(
    SyncEngine.getInstance().lastSyncedAt
  );

  useEffect(() => {
    let isMounted = true;
    const reg = syncRegistry[segment];
    if (!reg) {
      setLoading(false);
      return;
    }

    const tableStore = (syncDb as any)[reg.storeName];

    // 1. Initial read from local Dexie database
    const loadFromDexie = async () => {
      try {
        if (tableStore) {
          const records = await tableStore.toArray();
          if (isMounted) {
            setData(records);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn(`[useSync] Dexie read warning for ${segment}:`, err);
        if (isMounted) setLoading(false);
      }
    };

    loadFromDexie();

    // 2. Subscribe to SyncEngine status / timestamp updates
    const unsubscribeEngine = SyncEngine.getInstance().onStatusChange((_, timestamp) => {
      if (isMounted) setLastSyncedAt(timestamp);
    });

    // 3. Subscribe to reactive segment change events
    const eventHandler = () => {
      loadFromDexie();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(`church:sync:${segment}`, eventHandler);
    }

    // 4. Dexie live query subscription (if dexie liveQuery / observable is active)
    let observableSub: any = null;
    if (tableStore && typeof (tableStore as any).hook === 'function') {
      const hookFn = () => {
        loadFromDexie();
      };
      tableStore.hook('creating', hookFn);
      tableStore.hook('updating', hookFn);
      tableStore.hook('deleting', hookFn);
      observableSub = () => {
        try {
          tableStore.hook('creating').unsubscribe(hookFn);
          tableStore.hook('updating').unsubscribe(hookFn);
          tableStore.hook('deleting').unsubscribe(hookFn);
        } catch (_) {}
      };
    }

    return () => {
      isMounted = false;
      unsubscribeEngine();
      if (typeof window !== 'undefined') {
        window.removeEventListener(`church:sync:${segment}`, eventHandler);
      }
      if (observableSub) observableSub();
    };
  }, [segment]);

  return { data, loading, lastSyncedAt };
}

/**
 * Vanilla JavaScript / Non-React Observable Subscriber
 * Used directly by Vanilla SPA / Android WebView scripts.
 */
export function subscribeSync<T = any>(
  segment: SyncedSegment,
  callback: (result: UseSyncResult<T>) => void
): () => void {
  const reg = syncRegistry[segment];
  if (!reg) return () => {};

  const tableStore = (syncDb as any)[reg.storeName];
  let isActive = true;

  const emitLatest = async () => {
    if (!isActive) return;
    try {
      const records = tableStore ? await tableStore.toArray() : [];
      callback({
        data: records,
        loading: false,
        lastSyncedAt: SyncEngine.getInstance().lastSyncedAt
      });
    } catch (e) {
      console.warn(`[subscribeSync] Error reading ${segment}:`, e);
    }
  };

  // Immediate initial emit
  emitLatest();

  // Listen to engine updates and segment events
  const unbindEngine = SyncEngine.getInstance().onStatusChange((_, timestamp) => {
    emitLatest();
  });

  const eventHandler = () => {
    emitLatest();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(`church:sync:${segment}`, eventHandler);
  }

  return () => {
    isActive = false;
    unbindEngine();
    if (typeof window !== 'undefined') {
      window.removeEventListener(`church:sync:${segment}`, eventHandler);
    }
  };
}

// Expose on window for runtime consumers
if (typeof window !== 'undefined') {
  (window as any).useSync = useSync;
  (window as any).subscribeSync = subscribeSync;
}
