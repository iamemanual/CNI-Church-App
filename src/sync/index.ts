/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v1
 * ============================================================================
 * Unified export of Sync Engine modules:
 *   - SyncEngine (runtime orchestrator)
 *   - syncRegistry (segment-to-table mappings & merge rules)
 *   - syncWrite (admin offline outbox & remote writer)
 *   - useSync & subscribeSync (reactive data hooks)
 *   - SyncStatusIndicator (Super Admin status badge)
 *   - syncDb (offline Dexie database)
 * ============================================================================
 */

export * from './types';
export * from './db';
export * from './syncRegistry';
export * from './SyncEngine';
export * from './syncWrite';
export * from './useSync';
export * from './statusIndicator';

import { SyncEngine } from './SyncEngine';
import { syncRegistry } from './syncRegistry';
import { syncWrite, canWrite, flushOutbox } from './syncWrite';
import { useSync, subscribeSync } from './useSync';
import { SyncStatusIndicator } from './statusIndicator';
import { syncDb } from './db';

// Attach default global runtime on window
if (typeof window !== 'undefined') {
  const engine = SyncEngine.getInstance();
  (window as any).SyncEngine = engine;
  (window as any).syncRegistry = syncRegistry;
  (window as any).syncWrite = syncWrite;
  (window as any).canSyncWrite = canWrite;
  (window as any).flushSyncOutbox = flushOutbox;
  (window as any).useSync = useSync;
  (window as any).subscribeSync = subscribeSync;
  (window as any).syncDb = syncDb;
  (window as any).SyncStatusIndicator = SyncStatusIndicator;

  // Auto-start engine
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      engine.start();
      SyncStatusIndicator.mount();
    });
  } else {
    setTimeout(() => {
      engine.start();
      SyncStatusIndicator.mount();
    }, 100);
  }
}
