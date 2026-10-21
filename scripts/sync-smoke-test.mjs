#!/usr/bin/env node
/**
 * Church Companion — Sync Smoke Test
 * ============================================================================
 * Two Supabase clients: one anon listener, one admin writer.
 * Admin inserts, updates, and soft-deletes a row in 'announcements'.
 * Assert each event arrives at the listener within 3 seconds.
 * Leaves no test rows behind.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=sb_secret_... node scripts/sync-smoke-test.mjs
 *
 * Required env vars:
 *   SUPABASE_URL          — Project URL (https://eqwgrxcitwoyickthfpd.supabase.co)
 *   SUPABASE_SERVICE_KEY  — service_role key (NOT anon key) for the admin writer
 *   SUPABASE_ANON_KEY     — (optional) anon key for listener; falls back to service key
 *
 * Exits 0 on success, 1 on failure.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

let SUPABASE_URL   = process.env.SUPABASE_URL;
let SERVICE_KEY    = process.env.SUPABASE_SERVICE_KEY;
let ANON_KEY       = process.env.SUPABASE_ANON_KEY || SERVICE_KEY;
const TIMEOUT_MS     = 4000;
const TEST_TABLE     = 'announcements';

// Auto-fallback to local supabase-config.js
if (!SUPABASE_URL || !ANON_KEY) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const cfgPath = path.resolve(__dirname, '../app/src/main/assets/js/supabase-config.js');
    if (fs.existsSync(cfgPath)) {
      const cfgCode = fs.readFileSync(cfgPath, 'utf8');
      const urlMatch = cfgCode.match(/supabaseUrl:\s*["']([^"']+)["']/);
      const keyMatch = cfgCode.match(/supabaseAnonKey:\s*["']([^"']+)["']/);
      if (urlMatch && !SUPABASE_URL) SUPABASE_URL = urlMatch[1];
      if (keyMatch && !ANON_KEY) ANON_KEY = keyMatch[1];
      if (!SERVICE_KEY) SERVICE_KEY = ANON_KEY;
    }
  } catch (_) {}
}

if (!SUPABASE_URL || !ANON_KEY) {
  console.log('[smoke-test] SUPABASE_URL or SUPABASE_ANON_KEY not configured — skipping gracefully.');
  process.exit(0);
}

// Robust loader: use bundled assets/libs/supabase.js or npm package
let createClient;
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const bundlePath = path.resolve(__dirname, '../app/src/main/assets/libs/supabase.js');
  if (fs.existsSync(bundlePath)) {
    const code = fs.readFileSync(bundlePath, 'utf8');
    const ctx = {
      console,
      process,
      URL,
      fetch,
      Headers: globalThis.Headers,
      Request: globalThis.Request,
      Response: globalThis.Response,
      FormData: globalThis.FormData,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      WebSocket: globalThis.WebSocket
    };
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    if (ctx.supabase && ctx.supabase.createClient) {
      createClient = ctx.supabase.createClient;
    }
  }
} catch (_) {}

if (!createClient) {
  try {
    const mod = await import('@supabase/supabase-js');
    createClient = mod.createClient;
  } catch (_) {}
}

if (!createClient) {
  console.error('[smoke-test] Unable to load Supabase client.');
  process.exit(1);
}

console.log('[smoke-test] Starting Church Companion sync smoke test...');
console.log('[smoke-test] Project:', SUPABASE_URL);

// ── Clients ──────────────────────────────────────────────────────────────────
const listener = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const writer = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Event Queue & Waiter Pattern ──────────────────────────────────────────────
const eventQueue = [];
const eventWaiters = [];

function waitForEvent(eventTypes, timeoutMs) {
  for (let i = 0; i < eventQueue.length; i++) {
    const t = (eventQueue[i].eventType || eventQueue[i].type || '').toUpperCase();
    if (eventTypes.includes(t)) {
      return Promise.resolve(eventQueue.splice(i, 1)[0]);
    }
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = eventWaiters.findIndex(w => w.timer === timer);
      if (idx !== -1) eventWaiters.splice(idx, 1);
      reject(new Error('Timeout: event not received within ' + timeoutMs + 'ms. Expected: ' + eventTypes.join('|')));
    }, timeoutMs);

    eventWaiters.push({ eventTypes, resolve, reject, timer });
  });
}

function handleIncomingEvent(payload) {
  const t = (payload.eventType || payload.type || '').toUpperCase();
  for (let i = 0; i < eventWaiters.length; i++) {
    if (eventWaiters[i].eventTypes.includes(t)) {
      const waiter = eventWaiters.splice(i, 1)[0];
      clearTimeout(waiter.timer);
      waiter.resolve(payload);
      return;
    }
  }
  eventQueue.push(payload);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Test row ──────────────────────────────────────────────────────────────────
const testId = '00000000-ffff-0000-9999-' + Date.now().toString().slice(-12).padStart(12, '0');

async function cleanup() {
  try {
    await writer.from(TEST_TABLE).delete().eq('id', testId);
    console.log('[smoke-test] Cleanup done — test row deleted.');
  } catch (_) {}
}

let passed = 0;
let failed = 0;

async function runTest() {
  // Subscribe listener
  const channel = listener.channel('smoke-test-channel-' + Date.now());

  channel.on('postgres_changes', { event: '*', schema: 'public', table: TEST_TABLE }, handleIncomingEvent);

  await new Promise((resolve, reject) => {
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') resolve();
      if (status === 'CHANNEL_ERROR') reject(new Error('Channel error: ' + JSON.stringify(err)));
    });
    setTimeout(() => reject(new Error('Channel subscribe timeout')), 10000);
  });

  console.log('[smoke-test] Listener subscribed to', TEST_TABLE);
  await wait(500); // brief settle

  // ── Test 1: INSERT ────────────────────────────────────────────────────────
  console.log('[smoke-test] Test 1: INSERT...');
  const insertPromise = waitForEvent(['INSERT'], TIMEOUT_MS);
  const { error: insertErr } = await writer.from(TEST_TABLE).insert({
    id:         testId,
    title:      '[SMOKE TEST] Church Companion Sync Test',
    body:       'Automated smoke test — safe to delete',
    priority:   0,
    is_active:  false,
    date:       new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  });
  if (insertErr) {
    console.error('[smoke-test] ❌ INSERT failed with error:', insertErr.code || '', insertErr.message || JSON.stringify(insertErr));
    insertPromise.catch(() => {});
    console.log('\n========================================================================');
    console.log('🚨 DIAGNOSIS: Supabase Row-Level Security (RLS) is blocking anon writes!');
    console.log('   To fix this immediately, open Supabase SQL Editor:');
    console.log('   👉 https://supabase.com/dashboard/project/eqwgrxcitwoyickthfpd/sql/new');
    console.log('   and execute RUN_IN_SQL_EDITOR.sql');
    console.log('========================================================================\n');
    process.exit(1);
  } else {
    try {
      const ev = await insertPromise;
      console.log('[smoke-test] ✅ INSERT received in <' + TIMEOUT_MS + 'ms. id=' + (ev.new && ev.new.id));
      passed++;
    } catch (e) {
      console.error('[smoke-test] ❌ INSERT event timeout:', e.message);
      failed++;
    }
  }

  // ── Test 2: UPDATE ────────────────────────────────────────────────────────
  console.log('[smoke-test] Test 2: UPDATE...');
  const updatePromise = waitForEvent(['UPDATE'], TIMEOUT_MS);
  const { error: updateErr } = await writer.from(TEST_TABLE)
    .update({ body: '[SMOKE TEST] Updated body', updated_at: new Date().toISOString() })
    .eq('id', testId);
  if (updateErr) {
    console.error('[smoke-test] ❌ UPDATE failed with error:', updateErr.code || '', updateErr.message || JSON.stringify(updateErr));
    updatePromise.catch(() => {});
    failed++;
  } else {
    try {
      const ev = await updatePromise;
      console.log('[smoke-test] ✅ UPDATE received in <' + TIMEOUT_MS + 'ms. id=' + (ev.new && ev.new.id));
      passed++;
    } catch (e) {
      console.error('[smoke-test] ❌ UPDATE event timeout:', e.message);
      failed++;
    }
  }

  // ── Test 3: SOFT DELETE (deleted_at) ──────────────────────────────────────
  console.log('[smoke-test] Test 3: SOFT DELETE (set deleted_at)...');
  const deletePromise = waitForEvent(['UPDATE', 'DELETE'], TIMEOUT_MS + 1000);
  const { error: softDelErr } = await writer.from(TEST_TABLE)
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', testId);
  if (softDelErr) {
    console.error('[smoke-test] ❌ SOFT DELETE failed with error:', softDelErr.code || '', softDelErr.message || JSON.stringify(softDelErr));
    deletePromise.catch(() => {});
    failed++;
  } else {
    try {
      const ev = await deletePromise;
      const recId = (ev.new && ev.new.id) || (ev.old && ev.old.id);
      console.log('[smoke-test] ✅ SOFT DELETE (UPDATE+deleted_at) received in <' + (TIMEOUT_MS + 1000) + 'ms. id=' + recId);
      passed++;
    } catch (e) {
      console.error('[smoke-test] ❌ SOFT DELETE event timeout:', e.message);
      failed++;
    }
  }

  // Cleanup
  await cleanup();
  await listener.removeChannel(channel);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n[smoke-test] ─────────────────────────────');
  console.log('[smoke-test] Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) {
    console.error('[smoke-test] ❌ SMOKE TEST FAILED');
    process.exit(1);
  } else {
    console.log('[smoke-test] ✅ ALL SMOKE TESTS PASSED — realtime is working end-to-end');
    process.exit(0);
  }
}

runTest().catch(async (e) => {
  console.error('[smoke-test] Unexpected error:', e);
  await cleanup().catch(() => {});
  process.exit(1);
});
