# 🛠️ How to Fix Supabase SQL Sync in Church Companion

## 🔍 Root Cause of the Sync Failure
The mobile & web apps connect using the **publishable anon key** (`sb_publishable_...`).
When testing writes directly against the database:
- **SELECT** requests succeed (`HTTP 200 OK`).
- **INSERT, UPDATE, DELETE & UPSERT** requests fail with:
  ```json
  {"code":"42501","message":"new row violates row-level security policy for table \"...\""}
  ```
Because PostgreSQL has Row-Level Security (RLS) active without write policies for the `anon` role, any local write (adding hymns, editing announcements, saving liturgical lectionary notes, updating today's songs) gets rejected and stuck in the local offline outbox. Furthermore, chat tables (`chat_messages`, etc.) do not yet exist, and Realtime websocket publication is not active for the tables.

---

## ⚡ The Solution: 3 Quick Steps

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard:
   👉 **[https://supabase.com/dashboard/project/eqwgrxcitwoyickthfpd/sql/new](https://supabase.com/dashboard/project/eqwgrxcitwoyickthfpd/sql/new)**
2. Click **New query**.

### Step 2: Copy and Paste the Fix Script
1. Open [`RUN_IN_SQL_EDITOR.sql`](RUN_IN_SQL_EDITOR.sql) in this directory.
2. Select all and copy the entire contents.
3. Paste it into the query window in Supabase SQL Editor.
4. Click the green **RUN** button (or press `Ctrl + Enter` / `Cmd + Enter`).

### Step 3: Verify the Fix
In your Termux terminal, run:
```bash
node /storage/emulated/0/Workspace/ChurchCompanion/scripts/sync-smoke-test.mjs
```
Or test a write via curl/node:
```bash
node -e '
fetch("https://eqwgrxcitwoyickthfpd.supabase.co/rest/v1/announcements", {
  method: "POST",
  headers: {
    "apikey": "sb_publishable_skaLU__XWX2Nx8lAUcy50A_ImTZpWZG",
    "Authorization": "Bearer sb_publishable_skaLU__XWX2Nx8lAUcy50A_ImTZpWZG",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({ title: "Test Connection", body: "Sync works!", priority: 1, is_active: false })
}).then(async r => console.log("Status:", r.status, await r.text())).catch(console.error);
'
```
Once status returns `201 Created` or `200 OK`, full two-way live synchronization will immediately start working across all your devices and browser tabs!
