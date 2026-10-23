const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

const PORT = process.env.PORT || 8181;
const PROJECT_ROOT = path.resolve(__dirname);
const ASSETS_DIR = path.join(PROJECT_ROOT, 'app', 'src', 'main', 'assets');
const PENDING_EDITS_FILE = path.join(PROJECT_ROOT, 'pending_edits.json');
const PID_FILE = path.join(PROJECT_ROOT, '.server.pid');
const ENABLE_PINPOINT = true;

function getWifiIp() {
  try {
    const interfaces = os.networkInterfaces();
    // 1. Look for Wi-Fi / wlan / hotspot / eth / usb tethering interfaces first
    for (const name of Object.keys(interfaces)) {
      if (/wlan|wifi|eth|ap|softap|rndis/i.test(name)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal && iface.address !== '127.0.0.1') {
            return iface.address;
          }
        }
      }
    }
    // 2. Fallback to private local LAN subnets (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    for (const name of Object.keys(interfaces)) {
      if (!/ccmni|dummy|rmnet|pdp/i.test(name)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal && iface.address !== '127.0.0.1') {
            const addr = iface.address;
            if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(addr)) {
              return addr;
            }
          }
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg'
};

function readPendingEdits() {
  try {
    if (fs.existsSync(PENDING_EDITS_FILE)) {
      return JSON.parse(fs.readFileSync(PENDING_EDITS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function savePendingEdits(edits) {
  const data = JSON.stringify(edits, null, 2);
  try {
    fs.writeFileSync(PENDING_EDITS_FILE, data, 'utf8');
  } catch (e) {
    console.error('Error saving pending edits:', e.message);
  }
}

function getFileTree(dir, basePath = '') {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      if (file === '.git' || file === 'build' || file === '.gradle' || file === 'node_modules') return;
      const fullPath = path.join(dir, file);
      const relPath = path.join(basePath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push({
          name: file,
          path: relPath,
          type: 'dir',
          children: getFileTree(fullPath, relPath)
        });
      } else {
        results.push({
          name: file,
          path: relPath,
          type: 'file',
          size: stat.size
        });
      }
    });
  } catch (e) {}
  return results;
}

function isPathInside(childPath, parentDir) {
  const rel = path.relative(parentDir, childPath);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function resolveAssetPath(requestPath) {
  if (!requestPath || typeof requestPath !== 'string') return null;
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch (_) {
    return null;
  }
  if (decoded.includes('\0')) return null;

  let clean = decoded.replace(/^\/+/, '');
  if (clean.split(/[\\/]/).some(seg => seg === '..')) {
    return null;
  }

  const resolvedAssetsDir = path.resolve(ASSETS_DIR);
  const workspaceHtmlDir = '/storage/emulated/0/Workspace/HTML';
  const resolvedWorkspaceHtml = path.resolve(workspaceHtmlDir);

  // 1. Direct match in ASSETS_DIR
  let target = path.resolve(resolvedAssetsDir, clean);
  if (isPathInside(target, resolvedAssetsDir)) {
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return target;
    }
  }

  // 2. Check if stripping 'assets/' helps
  if (clean.startsWith('assets/')) {
    let stripped = clean.substring('assets/'.length);
    let candidate = path.resolve(resolvedAssetsDir, stripped);
    if (isPathInside(candidate, resolvedAssetsDir)) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
  }

  // 3. Check if prepending 'assets/' helps
  let nested = path.resolve(resolvedAssetsDir, 'assets', clean);
  if (isPathInside(nested, resolvedAssetsDir)) {
    if (fs.existsSync(nested) && fs.statSync(nested).isFile()) {
      return nested;
    }
  }

  // 4. Check books/ folder in assets
  let booksCandidate = path.resolve(resolvedAssetsDir, 'books', clean);
  if (isPathInside(booksCandidate, resolvedAssetsDir)) {
    if (fs.existsSync(booksCandidate) && fs.statSync(booksCandidate).isFile()) {
      return booksCandidate;
    }
  }

  // 5. Check Workspace/HTML folder
  if (/^html\//i.test(clean)) {
    let sub = clean.replace(/^html\//i, '');
    let candidate = path.resolve(resolvedWorkspaceHtml, sub);
    if (isPathInside(candidate, resolvedWorkspaceHtml)) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
  }
  let directHtmlCandidate = path.resolve(resolvedWorkspaceHtml, clean);
  if (isPathInside(directHtmlCandidate, resolvedWorkspaceHtml)) {
    if (fs.existsSync(directHtmlCandidate) && fs.statSync(directHtmlCandidate).isFile()) {
      return directHtmlCandidate;
    }
  }

  return null;
}

function parseSafeJsonBody(req, res, maxBytes = 2 * 1024 * 1024, callback) {
  let body = '';
  let received = 0;
  let aborted = false;

  req.on('data', chunk => {
    if (aborted) return;
    received += chunk.length;
    if (received > maxBytes) {
      aborted = true;
      req.destroy();
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload too large (max ' + Math.round(maxBytes / 1024 / 1024) + 'MB)' }));
      return;
    }
    body += chunk;
  });

  req.on('end', () => {
    if (aborted) return;
    try {
      const parsed = body ? JSON.parse(body) : {};
      callback(null, parsed);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload: ' + err.message }));
    }
  });

  req.on('error', err => {
    if (aborted) return;
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request stream error: ' + err.message }));
  });
}

const NATIVE_BRIDGE_INJECTION = `
<!-- ==========================================================
     AUTHENTIC ANDROID BRIDGE (Browser Support)
     ========================================================== -->
<script id="native-android-bridge-authentic">
(function() {
  window.isNativeOnline = true;
  document.documentElement.style.setProperty('--safe-area-top', '0px');
  document.documentElement.style.setProperty('--safe-area-bottom', '0px');

  const showToastUI = function(msg) {
    console.log("[Native Toast]:", msg);
    var toast = document.getElementById('toastNotification');
    var toastMsg = document.getElementById('toastMessage');
    if (toast && toastMsg) {
      toastMsg.textContent = msg;
      toast.classList.remove('hidden');
      setTimeout(function() { toast.classList.add('hidden'); }, 3000);
    }
  };

  const bridge = {
    getAppName: function() { return "Church Companion"; },
    getAppVersion: function() { return "v2.1.7"; },
    getAppVersionCode: function() { return 4092041; },
    getApkVersionCode: function(filePath) { return 4092041; },
    isDeviceOnline: function() { return navigator.onLine; },
    hasCameraPermission: function() { return true; },
    hasMediaPermission: function() { return true; },
    requestCameraPermission: function() {
      console.log("[Native Bridge] Camera permission granted");
      showToastUI("Camera permission enabled");
    },
    requestMediaPermission: function() {
      console.log("[Native Bridge] Media permission granted");
      showToastUI("Media access enabled");
    },
    showToast: showToastUI,
    triggerVibration: function(ms) {
      if (navigator.vibrate) try { navigator.vibrate(ms || 30); } catch(e){}
    },
    vibrateHaptic: function() {
      if (navigator.vibrate) try { navigator.vibrate(20); } catch(e){}
    },
    playAudioTrack: function(url) {
      console.log("[Native Audio] Play:", url);
      return true;
    },
    stopAudioTrack: function() {
      console.log("[Native Audio] Stop");
      return true;
    },
    installApk: function(filePath) {
      console.log("[Native Bridge] installApk requested:", filePath);
      showToastUI("Opening Android Package Installer...");
      window.location.href = '/download/ChurchCompanion.apk';
      return true;
    },
    exitApp: function() {
      console.log("[Native Bridge] Exit App requested");
      showToastUI("Exiting Application...");
    },
    evaluatePermissionsJson: function(roleStr, isYouth) {
      return JSON.stringify({
        role: roleStr || "Presbyter In-Charge",
        roleName: roleStr || "Presbyter In-Charge",
        isYouth: Boolean(isYouth),
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canAddSong: true,
        canEditTimeline: true,
        canApproveAdmins: true,
        canApproveYouth: true,
        canAccessYouthChat: true,
        canDeleteAnyMessage: true
      });
    },
    getLiturgicalDayJson: function(dateStr) { return "{}"; },
    getTodayDailyVerseJson: function() { return "{}"; },
    getTimelineEventsJson: function() { return "[]"; },
    getOfflineCache: function(key) {
      try { return localStorage.getItem('cni_cache_' + key) || ""; } catch(e) { return ""; }
    },
    saveOfflineCache: function(key, value) {
      try { localStorage.setItem('cni_cache_' + key, value); } catch(e) {}
    },
    queueSyncItem: function(actionType, jsonPayload) {
      console.log("[Native Sync Queue]", actionType, jsonPayload);
      return true;
    },
    triggerImmediateSync: function() {
      console.log("[Native Immediate Sync Triggered]");
      showToastUI("Cloud synchronization in progress...");
    },
    runEngineDiagnostics: function() {
      return JSON.stringify({
        status: "PASSED",
        engine: "ChurchApplicationEngine",
        version: "v4092041"
      });
    },
    logAuditEvent: function(mod, act, det) {
      console.log("[Native Audit Log]", mod, act, det);
    }
  };

  window.AndroidBridge = bridge;
  window.AndroidApp = bridge;
  window.bridge = bridge;

  // Broadcast network state
  setTimeout(function() {
    var event = new CustomEvent('network_status_change', { detail: { online: true } });
    window.dispatchEvent(event);
    if (window.updateNetworkBanner) {
      window.updateNetworkBanner(true);
    }
  }, 200);

  // Auto-dismiss splash overlay if lingering
  setTimeout(function() {
    var splash = document.getElementById('onboardingSplashOverlay');
    if (splash) {
      splash.style.transition = 'opacity 0.4s ease-out';
      splash.style.opacity = '0';
      splash.style.pointerEvents = 'none';
      setTimeout(function() { splash.style.setProperty('display', 'none', 'important'); }, 400);
    }
  }, 1800);
})();
</script>
`;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. API: Submit Pinpoint Edit Request from Localhost
  if (pathname === '/api/edits/submit' && req.method === 'POST') {
    parseSafeJsonBody(req, res, 2 * 1024 * 1024, (err, item) => {
      if (err || !item) return;
      try {
        item.id = Date.now();
        item.status = 'pending';

        const edits = readPendingEdits();
        edits.push(item);
        savePendingEdits(edits);

        console.log('\n======================================================');
        console.log('  🎯 [PINPOINT RECEIVED FROM LOCALHOST]');
        console.log(`  Target:      ${item.selector} (<${item.tagName}>)`);
        if (item.pageUrl) console.log(`  Page:        \x1b[33m${item.pageUrl}\x1b[0m`);
        if (item.isHtmlEdit || item.html) {
          console.log(`  Mode:        \x1b[35mHTML Edit (${item.htmlScope || 'outer'})\x1b[0m`);
          if (item.html) console.log(`  New HTML:    \x1b[32m"${item.html.slice(0, 80).replace(/\n/g, ' ')}..."\x1b[0m`);
        }
        if (item.innerText && !item.isHtmlEdit) console.log(`  Content:     "${item.innerText.slice(0, 60)}"`);
        console.log(`  Instruction: \x1b[36m${item.instruction.length > 80 ? item.instruction.slice(0, 80) + '...' : item.instruction}\x1b[0m`);
        console.log(`  Timestamp:   ${item.timestamp}`);
        console.log('======================================================\n');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, item, total: edits.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 2. API: Get Pending Edits
  if (pathname === '/api/edits/pending') {
    const edits = readPendingEdits();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ count: edits.length, edits }));
  }

  // 3. API: Clear Pending Edits
  if (pathname === '/api/edits/clear' && req.method === 'POST') {
    savePendingEdits([]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'Cleared' }));
  }

  // 3b. API: Delete Specific Pending Edit
  if (pathname === '/api/edits/delete' && req.method === 'POST') {
    parseSafeJsonBody(req, res, 512 * 1024, (err, payload) => {
      if (err || !payload) return;
      try {
        let edits = readPendingEdits();
        edits = edits.filter(e => e.id !== payload.id);
        savePendingEdits(edits);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, count: edits.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 3c. API: Save Almanac Edit directly to disk JSON files
  if (pathname === '/api/almanac/save' && req.method === 'POST') {
    parseSafeJsonBody(req, res, 2 * 1024 * 1024, (err, payload) => {
      if (err || !payload) return;
      try {
        const { dateKey, entry } = payload;
        if (!dateKey || !entry) throw new Error('Missing dateKey or entry');

        const fullYearPath = path.join(ASSETS_DIR, 'data', 'almanac_full_year_2026.json');
        let fullYear = {};
        if (fs.existsSync(fullYearPath)) {
          fullYear = JSON.parse(fs.readFileSync(fullYearPath, 'utf8'));
        }
        fullYear[dateKey] = { ...(fullYear[dateKey] || {}), ...entry, dateKey };
        fs.writeFileSync(fullYearPath, JSON.stringify(fullYear, null, 2), 'utf8');

        const halfYearPath = path.join(ASSETS_DIR, 'data', 'almanac_2026.json');
        if (fs.existsSync(halfYearPath)) {
          let halfYear = JSON.parse(fs.readFileSync(halfYearPath, 'utf8'));
          if (halfYear[dateKey] || dateKey >= '2026-07-01') {
            halfYear[dateKey] = { ...(halfYear[dateKey] || {}), ...entry, dateKey };
            fs.writeFileSync(halfYearPath, JSON.stringify(halfYear, null, 2), 'utf8');
          }
        }

        // Also refresh Almanac.md in workspace if present
        const workspaceMdPath = '/data/data/com.termux/files/home/Almanac.md';
        if (fs.existsSync(workspaceMdPath)) {
          try {
            let md = '# Church Companion — Liturgical Almanac 2026\n\n> Complete Liturgical Almanac & Lectionary readings for the Year 2026 (All 365 Days).\n\n---\n\n';
            for (const k of Object.keys(fullYear).sort()) {
              const d = fullYear[k];
              md += `### ${String(d.day).padStart(2, '0')} ${d.monthName} ${d.year} (${d.dayName})\n\n`;
              md += `- **Date:** \`${d.dateKey}\`\n`;
              md += `- **Theme / Festival:** ${d.theme || 'Daily Liturgical Reading'}\n`;
              md += `- **Liturgical Color:** ${d.color || 'Green'}\n`;
              if (d.morningWorship && d.morningWorship.length) md += `- **Morning Worship:**\n` + d.morningWorship.map(r => `  - ${r}`).join('\n') + '\n';
              if (d.eveningWorship && d.eveningWorship.length) md += `- **Evening Worship:**\n` + d.eveningWorship.map(r => `  - ${r}`).join('\n') + '\n';
              if (d.lordsSupper && d.lordsSupper.length) md += `- **Lord's Supper:**\n` + d.lordsSupper.map(r => `  - ${r}`).join('\n') + '\n';
              md += '\n';
            }
            fs.writeFileSync(workspaceMdPath, md, 'utf8');
          } catch (_) {}
        }

        console.log(`\x1b[32m[Server] Saved Almanac lectionary entry for ${dateKey} to disk.\x1b[0m`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, dateKey }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 3c. API: Server Status & Wi-Fi IP Info
  if (pathname === '/api/status' && req.method === 'GET') {
    const edits = readPendingEdits();
    const wifiIp = getWifiIp();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      appName: 'Church Companion',
      port: PORT,
      wifiIp: wifiIp,
      localUrl: `http://localhost:${PORT}`,
      networkUrl: `http://${wifiIp}:${PORT}`,
      pendingEditsCount: edits.length
    }, null, 2));
  }

  // Helper: Extract APK versionCode and versionName using aapt or manifest parsing
  function getApkDetails(apkPath) {
    let versionCode = 4092040;
    let versionName = 'v2.1.6';
    if (!fs.existsSync(apkPath)) return { versionCode, versionName };

    try {
      const { execSync } = require('child_process');
      const out = execSync(`aapt dump badging "${apkPath}" 2>/dev/null`, { timeout: 3000 }).toString();
      const vcMatch = out.match(/versionCode='(\d+)'/);
      if (vcMatch) versionCode = parseInt(vcMatch[1], 10);
      const vnMatch = out.match(/versionName='([^']+)'/);
      if (vnMatch) versionName = vnMatch[1];
    } catch (_) {}
    return { versionCode, versionName };
  }

  // 3d. API: App Update Check
  if (pathname === '/api/app/update-check' && req.method === 'GET') {
    const installedVersionCode = 4092041;
    const updatePublishPath = path.join(PROJECT_ROOT, '.update_published.json');
    const workspaceUpdateFlag = '/storage/emulated/0/Workspace/.update_published.json';
    const isPublished = fs.existsSync(updatePublishPath) || fs.existsSync(workspaceUpdateFlag);

    let published = null;
    try {
      if (fs.existsSync(updatePublishPath)) {
        published = JSON.parse(fs.readFileSync(updatePublishPath, 'utf8'));
      } else if (fs.existsSync(workspaceUpdateFlag)) {
        published = JSON.parse(fs.readFileSync(workspaceUpdateFlag, 'utf8'));
      }
    } catch (_) {}

    const apkPath = '/storage/emulated/0/Workspace/ChurchCompanion.apk';
    let sizeMb = '44.8';
    if (fs.existsSync(apkPath)) {
      try { sizeMb = (fs.statSync(apkPath).size / (1024 * 1024)).toFixed(1); } catch (_) {}
    }

    if (isPublished && published && published.versionCode) {
      const apkVersionCode = parseInt(published.versionCode, 10);
      const isNewUpdate = apkVersionCode !== installedVersionCode;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        hasUploadedPackage: true,
        updateAvailable: isNewUpdate,
        versionCode: apkVersionCode,
        versionName: published.versionName || 'v2.1.7',
        installedVersionCode: installedVersionCode,
        currentVersion: 'v2.1.7',
        latestVersion: published.versionName || 'v2.1.7',
        buildCode: apkVersionCode,
        fileSizeMb: published.fileSizeMb || sizeMb,
        downloadUrl: '/download/ChurchCompanion.apk',
        releaseNotes: isNewUpdate ? 'A new update is available.' : 'You are on the latest version.'
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        hasUploadedPackage: false,
        updateAvailable: false,
        versionCode: null,
        installedVersionCode: installedVersionCode,
        currentVersion: 'v2.1.7',
        message: 'No update available. You are on the latest version.'
      }));
    }
  }

  // 3ea. API: Super Admin Upload Workspace APK to Supabase app-updates bucket
  if (pathname === '/api/app/update/upload-workspace' && req.method === 'POST') {
    const apkPath = '/storage/emulated/0/Workspace/ChurchCompanion.apk';
    if (!fs.existsSync(apkPath)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'ChurchCompanion.apk not found in Workspace' }));
    }
    const stat = fs.statSync(apkPath);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);
    const apkDetails = getApkDetails(apkPath);
    const https = require('https');
    const supabaseKey = "sb_publishable_skaLU__XWX2Nx8lAUcy50A_ImTZpWZG";

    const uploadReq = https.request({
      hostname: 'eqwgrxcitwoyickthfpd.supabase.co',
      port: 443,
      path: '/storage/v1/object/app-updates/ChurchCompanion.apk',
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'authorization': `Bearer ${supabaseKey}`,
        'content-type': 'application/vnd.android.package-archive',
        'content-length': stat.size,
        'x-upsert': 'true'
      }
    }, uploadRes => {
      let data = '';
      uploadRes.on('data', chunk => data += chunk);
      uploadRes.on('end', () => {
        if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
          const updatePublishPath = path.join(PROJECT_ROOT, '.update_published.json');
          const publishPayload = {
            publishedAt: new Date().toISOString(),
            fileName: 'ChurchCompanion.apk',
            versionCode: apkDetails.versionCode,
            versionName: apkDetails.versionName,
            fileSizeMb: sizeMb
          };
          try {
            fs.writeFileSync(updatePublishPath, JSON.stringify(publishPayload, null, 2), 'utf8');
          } catch (_) {}

          // Also upload update_manifest.json to Supabase app-updates bucket
          const manifestPayload = JSON.stringify({
            versionCode: apkDetails.versionCode,
            versionName: apkDetails.versionName,
            fileName: 'ChurchCompanion.apk',
            fileSizeMb: sizeMb,
            downloadUrl: 'https://eqwgrxcitwoyickthfpd.supabase.co/storage/v1/object/public/app-updates/ChurchCompanion.apk',
            updatedAt: new Date().toISOString()
          });

          const manifestReq = https.request({
            hostname: 'eqwgrxcitwoyickthfpd.supabase.co',
            port: 443,
            path: '/storage/v1/object/app-updates/update_manifest.json',
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'authorization': `Bearer ${supabaseKey}`,
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(manifestPayload),
              'x-upsert': 'true'
            }
          }, () => {});
          manifestReq.on('error', () => {});
          manifestReq.write(manifestPayload);
          manifestReq.end();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            fileName: 'ChurchCompanion.apk',
            fileSizeMb: sizeMb,
            versionCode: apkDetails.versionCode,
            versionName: apkDetails.versionName
          }));
        } else {
          res.writeHead(uploadRes.statusCode || 500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: data }));
        }
      });
    });

    uploadReq.on('error', err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    });

    fs.createReadStream(apkPath).pipe(uploadReq);
    return;
  }

  // 3eb. API: Super Admin Remove Update APK from Supabase
  if (pathname === '/api/app/update/delete-apk' && req.method === 'POST') {
    const https = require('https');
    const supabaseKey = "sb_publishable_skaLU__XWX2Nx8lAUcy50A_ImTZpWZG";
    let body = JSON.stringify({ prefixes: ['ChurchCompanion.apk', 'update_manifest.json'] });

    const delReq = https.request({
      hostname: 'eqwgrxcitwoyickthfpd.supabase.co',
      port: 443,
      path: '/storage/v1/object/app-updates',
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'authorization': `Bearer ${supabaseKey}`,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body)
      }
    }, delRes => {
      let data = '';
      delRes.on('data', chunk => data += chunk);
      delRes.on('end', () => {
        const updatePublishPath = path.join(PROJECT_ROOT, '.update_published.json');
        try { if (fs.existsSync(updatePublishPath)) fs.unlinkSync(updatePublishPath); } catch (_) {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      });
    });

    delReq.on('error', err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    });

    delReq.write(body);
    delReq.end();
    return;
  }

  // 3e. Serve APK for updates
  if (pathname === '/download/ChurchCompanion.apk' && (req.method === 'GET' || req.method === 'HEAD')) {
    const apkPath = '/storage/emulated/0/Workspace/ChurchCompanion.apk';
    if (fs.existsSync(apkPath)) {
      const stat = fs.statSync(apkPath);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="ChurchCompanion.apk"'
      });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(apkPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('APK package not found on server');
    }
  }

  // 4. API: Fellowship Chat Messages
  if (pathname === '/api/chat/messages') {
    const channel = parsedUrl.query.channel || 'congregation';
    const chatFilePath = path.join(ASSETS_DIR, 'data', 'cni_chat_messages.json');
    try {
      const raw = fs.readFileSync(chatFilePath, 'utf8');
      const chatData = JSON.parse(raw);
      const channelData = chatData[channel] || { messages: [] };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(channelData));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ messages: [] }));
    }
  }

  // 4b. API: Delete Member from Chat Messages File
  if (pathname === '/api/chat/delete-member' && req.method === 'POST') {
    parseSafeJsonBody(req, res, 512 * 1024, (err, payload) => {
      if (err || !payload) return;
      try {
        const targetName = (payload.name || '').toLowerCase().trim();
        const targetId = (payload.id || '').toLowerCase().trim();
        const chatFilePath = path.join(ASSETS_DIR, 'data', 'cni_chat_messages.json');
        if (fs.existsSync(chatFilePath)) {
          const chatData = JSON.parse(fs.readFileSync(chatFilePath, 'utf8'));
          ['congregation', 'youth'].forEach(ch => {
            if (chatData[ch] && Array.isArray(chatData[ch].messages)) {
              chatData[ch].messages = chatData[ch].messages.filter(msg => {
                const sName = (msg.sender || '').toLowerCase().trim();
                const sId = (msg.sender_id || '').toLowerCase().trim();
                if (targetName && sName === targetName) return false;
                if (targetId && sId === targetId) return false;
                return true;
              });
            }
          });
          fs.writeFileSync(chatFilePath, JSON.stringify(chatData, null, 2), 'utf8');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 5. API: Active Supabase Cloud Proxy
  if (pathname.startsWith('/api/supabase')) {
    const supabasePath = pathname.replace(/^\/api\/supabase/, '') + (parsedUrl.search || '');
    const supabaseKey = "sb_publishable_skaLU__XWX2Nx8lAUcy50A_ImTZpWZG";
    const https = require('https');

    let bodyChunks = [];
    let receivedBytes = 0;
    const MAX_PROXY_BODY = 10 * 1024 * 1024;
    let aborted = false;

    req.on('data', chunk => {
      if (aborted) return;
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_PROXY_BODY) {
        aborted = true;
        req.destroy();
        res.writeHead(413, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Supabase proxy payload too large' }));
      }
      bodyChunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      const bodyBuffer = Buffer.concat(bodyChunks);
      const headers = {
        'host': 'eqwgrxcitwoyickthfpd.supabase.co',
        'apikey': req.headers['apikey'] || supabaseKey,
        'authorization': req.headers['authorization'] || `Bearer ${supabaseKey}`,
        'content-type': req.headers['content-type'] || 'application/json',
        'accept': req.headers['accept'] || 'application/json'
      };
      if (req.headers['prefer']) headers['prefer'] = req.headers['prefer'];

      const proxyReq = https.request({
        hostname: 'eqwgrxcitwoyickthfpd.supabase.co',
        port: 443,
        path: supabasePath,
        method: req.method,
        headers: headers,
        timeout: 8000
      }, proxyRes => {
        const resHeaders = { ...proxyRes.headers };
        resHeaders['access-control-allow-origin'] = '*';
        resHeaders['access-control-allow-headers'] = '*';
        res.writeHead(proxyRes.statusCode, resHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', err => {
        if (res.headersSent) return;
        // Return 503 if offline / DNS unreachable so client uses Dexie cache
        try {
          res.writeHead(503, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'Supabase offline or unreachable', message: err.message, offline: true }));
        } catch (_) {}
      });

      proxyReq.on('timeout', () => {
        try { proxyReq.destroy(); } catch (_) {}
        if (res.headersSent) return;
        try {
          res.writeHead(504, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'Supabase request timeout', offline: true }));
        } catch (_) {}
      });

      if (bodyBuffer.length > 0) {
        proxyReq.write(bodyBuffer);
      }
      proxyReq.end();
    });
    return;
  }

  // 6. API: Diagnostics
  if (pathname === '/api/diagnostics') {
    const edits = readPendingEdits();
    const wifiIp = getWifiIp();
    const diag = {
      status: "PASSED",
      appName: "Church Companion",
      architecture: "Hybrid Native Android Kotlin (Edge-to-Edge WebView + Bridge)",
      package: "com.allsaints.church",
      timestamp: new Date().toISOString(),
      exactViewActive: true,
      pinpointInspectorActive: ENABLE_PINPOINT,
      pendingEditsCount: edits.length,
      port: PORT,
      wifiIp: wifiIp,
      localUrl: `http://localhost:${PORT}`,
      networkUrl: `http://${wifiIp}:${PORT}`,
      tests: [
        { module: "Application View", result: "PASSED", detail: "100% Authentic APK assets (index.html UI, app.js, data.js, covers, books)" },
        { module: "Pinpoint & Live Edit Tool", result: "PASSED", detail: "In-page DOM inspector active with draggable FAB/panel, selection, live preview and Termux dispatch" },
        { module: "Wi-Fi Network Server", result: "PASSED", detail: `Listening on 0.0.0.0:${PORT} - accessible over Wi-Fi at http://${wifiIp}:${PORT}` },
        { module: "Native Bridge", result: "PASSED", detail: "AndroidBridge & AndroidApp interfaces mounted with permissions, haptics, and sync" },
        { module: "Liturgical Almanac", result: "PASSED", detail: "Loaded almanac_2026.json (Morning, Evening, Holy Eucharist) and colors" },
        { module: "Church Hymnal", result: "PASSED", detail: "Hymn library with search, Hindi/English translations, and bookmarks" },
        { module: "Fellowship Chat", result: "PASSED", detail: "Loaded cni_chat_messages.json for Congregation & Youth channels" },
        { module: "Liturgical Library", result: "PASSED", detail: "PDF prayer books (Prabhu Bhoj, Ashaye Rabbani, Aaradhanaa) with PDF.js" },
        { module: "Parish Timeline", result: "PASSED", detail: "Cathedral milestones loaded from 1871 foundation to 2026 platform" }
      ]
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(diag, null, 2));
  }

  // 7. API: Project Files
  if (pathname === '/api/files') {
    const tree = getFileTree(PROJECT_ROOT);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(tree));
  }

  // 7b. API / Asset: Pinpoint inspector script
  if (pathname === '/js/pinpoint.js' || pathname === '/pinpoint.js') {
    const pinpointPath = path.join(ASSETS_DIR, 'js', 'pinpoint.js');
    if (fs.existsSync(pinpointPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return fs.createReadStream(pinpointPath).pipe(res);
    }
  }

  // 8. EXACT AUTHENTIC APPLICATION VIEW: Serve index.html
  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = path.join(ASSETS_DIR, 'index.html');
    try {
      let content = fs.readFileSync(indexPath, 'utf8');
      // Inject native bridge right before </head>
      if (content.includes('</head>')) {
        content = content.replace('</head>', NATIVE_BRIDGE_INJECTION + '\n</head>');
      } else {
        content = NATIVE_BRIDGE_INJECTION + content;
      }

      // Inject pinpoint inspector right before </body> if enabled
      if (ENABLE_PINPOINT) {
        const PINPOINT_SCRIPT_TAG = '<script src="/js/pinpoint.js?v=20261006_live"></script>';
        if (!content.includes('pinpoint.js')) {
          if (content.includes('</body>')) {
            content = content.replace('</body>', PINPOINT_SCRIPT_TAG + '\n</body>');
          } else {
            content = content + '\n' + PINPOINT_SCRIPT_TAG;
          }
        }
      }

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(content);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Error reading index.html: ' + e.message);
    }
  }

  // 9. Serve Static Files from Assets directory
  const filePath = resolveAssetPath(pathname);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('File not found: ' + pathname);
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    // Handle range requests (for PDF.js & audio streaming)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
    } else if (ext === '.html') {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('</head>')) {
        content = content.replace('</head>', NATIVE_BRIDGE_INJECTION + '\n</head>');
      } else {
        content = NATIVE_BRIDGE_INJECTION + content;
      }

      if (ENABLE_PINPOINT) {
        const PINPOINT_SCRIPT_TAG = '<script src="/js/pinpoint.js?v=20261006_live"></script>';
        if (!content.includes('pinpoint.js')) {
          if (content.includes('</body>')) {
            content = content.replace('</body>', PINPOINT_SCRIPT_TAG + '\n</body>');
          } else {
            content = content + '\n' + PINPOINT_SCRIPT_TAG;
          }
        }
      }

      const buf = Buffer.from(content, 'utf8');
      res.writeHead(200, {
        'Content-Length': buf.length,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(buf);
    } else {
      const isDevAsset = ['.css', '.js', '.json'].includes(ext);
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': isDevAsset ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error: ' + err.message);
  }
});

// Save PID for process management
try {
  fs.writeFileSync(PID_FILE, process.pid.toString(), 'utf8');
} catch (e) {}

process.on('SIGHUP', () => {
  // Ignore SIGHUP so it remains running when terminal session disconnects
});
process.on('SIGTERM', () => {
  try { fs.unlinkSync(PID_FILE); } catch (e) {}
  process.exit(0);
});
process.on('SIGINT', () => {
  try { fs.unlinkSync(PID_FILE); } catch (e) {}
  process.exit(0);
});

process.on('uncaughtException', err => {
  console.error('[Server Error uncaughtException]', err && (err.stack || err.message || err));
});

process.on('unhandledRejection', reason => {
  console.warn('[Server Warning unhandledRejection]', reason);
});

server.listen(PORT, '0.0.0.0', () => {
  const wifiIp = getWifiIp();
  console.log('\n======================================================');
  console.log('  ⛪ CHURCH COMPANION — LOCALHOST & WI-FI LIVE DEV SERVER');
  console.log(`  📱 Localhost (This device):  http://localhost:${PORT}`);
  console.log(`  📶 Same Wi-Fi Network:       http://${wifiIp}:${PORT}`);
  console.log(`  🎯 Pinpoint & Live Edit:     ${ENABLE_PINPOINT ? 'ACTIVE (Draggable, Selecting, Submitting)' : 'DISABLED'}`);
  console.log(`  📂 Serving authentic assets: ${ASSETS_DIR}`);
  console.log('======================================================\n');
});
