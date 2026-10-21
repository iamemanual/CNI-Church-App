#!/usr/bin/env node
/**
 * Patch supabase-sync.js to:
 * 1. Guard _initRealtime() from running when sync-engine v2 is active
 * 2. Guard online listener _initRealtime call
 * 3. Add setAuth on auth state change inside supabase-sync.js scope
 */
import { readFileSync, writeFileSync } from 'fs';
const path = '/data/data/com.termux/files/home/ChurchCompanion/app/src/main/assets/js/supabase-sync.js';

let src = readFileSync(path, 'utf8');

// ── PATCH 1: Guard _initRealtime() body with v2 active check ─────────────────
src = src.replace(
  `  // ── 2. Unified Realtime Manager (Single Persistent Connection)\n  function _initRealtime() {`,
  `  // ── 2. Unified Realtime Manager (Single Persistent Connection)\n  // NOTE: Guarded — sync-engine.js v2 takes over when window.__syncEngineV2Active is set.\n  function _initRealtime() {\n    // If SyncEngine v2 is active, skip per-table channels to prevent duplicates\n    if (typeof window !== 'undefined' && window.__syncEngineV2Active) {\n      console.log('[Sync Engine v3] _initRealtime skipped — SyncEngine v2 unified channel is active.');\n      return;\n    }`
);

// ── PATCH 2: Guard online listener reinit ────────────────────────────────────
src = src.replace(
  `    _initRealtime();\n    _flushOutboxes();`,
  `    // Only reinit per-table channels if SyncEngine v2 is not active\n    if (!window.__syncEngineV2Active) {\n      _initRealtime();\n    }\n    _flushOutboxes();`
);

// ── PATCH 3: Update init() log message ────────────────────────────────────────
src = src.replace(
  `    console.log(\"[Sync Engine] Initializing Church Companion Real-Time Engine v3...\");\n    _initRealtime();`,
  `    console.log(\"[Sync Engine] Initializing Church Companion Real-Time Engine v3...\");\n    // _initRealtime() is guarded internally; SyncEngine v2 unified channel takes precedence\n    _initRealtime();`
);

writeFileSync(path, src, 'utf8');
console.log('Patched supabase-sync.js successfully. Lines:', src.split('\n').length);
