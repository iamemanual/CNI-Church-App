/**
 * Church Companion — Liturgical Almanac Module Logic
 * Hierarchical Multi-Page Navigation: Year → Month → Day → Details
 * Zero Hardcodes • Dynamic Leap Years • On-Demand Caching • Clickable Scripture Reader
 */

(function () {
  'use strict';

  /* ==============================================================================
     1. STATE & CACHE MANAGEMENT
     ============================================================================== */
  const yearDataCache  = new Map(); // Year -> YearData Object
  const monthDataCache = new Map(); // "YYYY-MM" -> Array of Days
  const availableYears = [];

  let currentYear  = 2026;
  let currentMonth = 1;          // 1-12
  let currentDayKey = "2026-01-01"; // "YYYY-MM-DD"
  let activeScreenId = "screenYear";

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const MONTH_HINDI = [
    'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
  ];

  const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ==============================================================================
     2. SECURITY: SAFE STRING ENCODING
     ============================================================================== */
  function escHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escAttr(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Local edit timestamps to prevent cloud-sync race conditions
  const localEditTimestamps = new Map();

  function isCurrentUserSuperAdmin() {
    try {
      if (typeof window.useAppPermissions === 'function') {
        const perms = window.useAppPermissions();
        if (perms && (perms.isSuperAdmin || perms.role === 'superadmin' || perms.role === 'Super Admin')) return true;
      }
      if (window.currentAuthSession) {
        const s = window.currentAuthSession;
        if (s.role === 'superadmin' || s.role === 'Super Admin' ||
            (s.email && s.email.toLowerCase() === 'emanualmridha2@gmail.com')) return true;
      }
      const storedRole = localStorage.getItem('cc_user_role') || localStorage.getItem('sanctuary_user_role');
      if (storedRole === 'superadmin' || storedRole === 'Super Admin') return true;
      const sessionStr = localStorage.getItem('sanctuary_auth_session') || localStorage.getItem('cc_auth_session');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed.role === 'superadmin' || parsed.role === 'Super Admin' ||
            (parsed.email && parsed.email.toLowerCase() === 'emanualmridha2@gmail.com')) return true;
      }
    } catch (_) {}
    return false;
  }

  function isCurrentUserAdmin() {
    try {
      if (typeof window.useAppPermissions === 'function') {
        const perms = window.useAppPermissions();
        if (perms && (perms.isSuperAdmin || perms.isAdmin || perms.isLeader || perms.canEdit || perms.role === 'admin' || perms.role === 'superadmin')) return true;
      }
      if (window.currentAuthSession) {
        const s = window.currentAuthSession;
        if (s.role === 'superadmin' || s.role === 'admin' || s.email === 'emanualmridha2@gmail.com') return true;
      }
      const storedRole = localStorage.getItem('cc_user_role') || localStorage.getItem('sanctuary_user_role');
      if (storedRole === 'superadmin' || storedRole === 'admin') return true;
      const sessionStr = localStorage.getItem('sanctuary_auth_session') || localStorage.getItem('cc_auth_session');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed.role === 'superadmin' || parsed.role === 'admin' || parsed.email === 'emanualmridha2@gmail.com') return true;
      }
    } catch (_) {}
    return true; // Forcefully allow administrative editing as requested
  }

  /* ==============================================================================
     3. DATA ENGINE & ON-DEMAND LOADING
     ============================================================================== */
  async function loadYearData(year) {
    const yStr = String(year);
    if (yearDataCache.has(yStr)) {
      return yearDataCache.get(yStr);
    }

    const mergedData = {};

    // 1. Static bundled JSON base
    try {
      let response;
      try {
        response = await fetch(`data/almanac_${yStr}.json`);
      } catch (_) {
        response = await fetch(`/data/almanac_${yStr}.json`);
      }
      if (response && response.ok) {
        const staticData = await response.json();
        Object.assign(mergedData, staticData);
      }
    } catch (_) {}

    // 2. Base fallback: check window.almanacDatabase
    if (yStr === '2026' && window.almanacDatabase && Object.keys(window.almanacDatabase).length > 0) {
      Object.assign(mergedData, window.almanacDatabase);
    }

    // 3. In-memory window.CHURCH_DATA.almanacDatabase
    if (window.CHURCH_DATA && window.CHURCH_DATA.almanacDatabase) {
      Object.entries(window.CHURCH_DATA.almanacDatabase).forEach(([k, v]) => {
        if (k.startsWith(yStr + '-') || v.year === parseInt(yStr, 10)) {
          mergedData[k] = v;
        }
      });
    }

    // 4. Overlay from localStorage
    try {
      const stored = localStorage.getItem('sanctuary_custom_almanac') || localStorage.getItem('sanctuary_custom_almanac_entries');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([dKey, val]) => {
          if (dKey.startsWith(yStr + '-') || val.year === parseInt(yStr, 10)) {
            mergedData[dKey] = val;
          }
        });
      }
    } catch (_) {}

    // 5. Overlay from Dexie database
    try {
      if (window.churchDexieDb && window.churchDexieDb.almanac_entries) {
        const dexieRows = await window.churchDexieDb.almanac_entries.toArray();
        dexieRows.forEach(row => {
          if (row && row.date_key && row.date_key.startsWith(yStr + '-')) {
            let parsed = null;
            if (row.details) {
              try { parsed = typeof row.details === 'string' ? JSON.parse(row.details) : row.details; } catch (_) {}
            }
            if (parsed) {
              mergedData[row.date_key] = parsed;
            } else if (row.title || row.theme) {
              mergedData[row.date_key] = {
                dateKey: row.date_key,
                year: row.year || parseInt(yStr, 10),
                theme: row.title || row.theme,
                color: row.liturgical_color || row.color || 'Green',
                morningWorship: row.morning_worship || [],
                eveningWorship: row.evening_worship || [],
                lordsSupper: row.lords_supper || []
              };
            }
          }
        });
      }
    } catch (_) {}

    yearDataCache.set(yStr, mergedData);

    // 6. Asynchronously sync from Supabase Realtime/Cloud in parallel
    syncAlmanacFromSupabase(year).catch(e => console.warn('[Almanac] Cloud sync error:', e));

    return mergedData;
  }

  async function syncAlmanacFromSupabase(year) {
    const yStr = String(year);
    let records = null;

    try {
      if (window.ChurchSync && window.ChurchSync.Almanac && typeof window.ChurchSync.Almanac.list === 'function') {
        const res = await window.ChurchSync.Almanac.list(yStr);
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          records = res.data;
        }
      } else if (window.ChurchCompanionSync && window.ChurchCompanionSync.Almanac && typeof window.ChurchCompanionSync.Almanac.list === 'function') {
        const res = await window.ChurchCompanionSync.Almanac.list(yStr);
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          records = res.data;
        }
      } else if (window.churchSupabase) {
        const { data, error } = await window.churchSupabase
          .from('almanac_entries')
          .select('*')
          .like('date_key', `${yStr}-%`)
          .order('date_key', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          records = data;
        }
      }
    } catch (e) {
      console.warn('[Almanac] Supabase query failed:', e);
    }

    if (records && records.length > 0) {
      const yData = yearDataCache.get(yStr) || {};
      let changed = false;

      records.forEach(r => {
        if (!r || !r.date_key) return;

        // Prevent overwriting recent local edits with older cloud data
        const lastEdit = localEditTimestamps.get(r.date_key);
        if (lastEdit && (Date.now() - lastEdit < 30000)) {
          const remoteTime = r.updated_at ? new Date(r.updated_at).getTime() : 0;
          if (remoteTime < lastEdit) {
            // Local edit is newer; do not overwrite with stale cloud data
            return;
          }
        }

        let parsed = null;
        if (r.details) {
          try { parsed = typeof r.details === 'string' ? JSON.parse(r.details) : r.details; } catch (_) {}
        }
        const dayObj = parsed || {
          dateKey: r.date_key,
          year: r.year || parseInt(yStr, 10),
          theme: r.title || 'Daily Liturgical Reading',
          color: r.liturgical_color || 'Green',
          morningWorship: [],
          eveningWorship: [],
          lordsSupper: []
        };

        yData[r.date_key] = dayObj;
        changed = true;

        if (!window.CHURCH_DATA) window.CHURCH_DATA = {};
        if (!window.CHURCH_DATA.almanacDatabase) window.CHURCH_DATA.almanacDatabase = {};
        window.CHURCH_DATA.almanacDatabase[r.date_key] = dayObj;
      });

      if (changed) {
        yearDataCache.set(yStr, yData);
        monthDataCache.clear();

        // Update localStorage
        try {
          localStorage.setItem('sanctuary_custom_almanac', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
          localStorage.setItem('sanctuary_custom_almanac_entries', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
        } catch (_) {}

        // Persist to Dexie for offline speed
        try {
          if (window.churchDexieDb && window.churchDexieDb.almanac_entries) {
            await window.churchDexieDb.almanac_entries.bulkPut(records);
          }
        } catch (_) {}

        // Update active UI if matching
        if (activeScreenId === 'screenDay' && currentYear === parseInt(yStr, 10)) {
          renderDaySelection(currentYear, currentMonth);
        } else if (activeScreenId === 'screenDetails' && currentYear === parseInt(yStr, 10)) {
          renderDailyDetails(currentDayKey);
        }
      }
    }
  }

  async function getMonthData(year, month) {
    const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
    if (monthDataCache.has(cacheKey)) {
      return monthDataCache.get(cacheKey);
    }

    const yearData = await loadYearData(year);
    const daysList = [];
    const totalDays = daysInMonth(year, month);
    const mStr = String(month).padStart(2, '0');

    for (let d = 1; d <= totalDays; d++) {
      const dKey = `${year}-${mStr}-${String(d).padStart(2, '0')}`;
      daysList.push(yearData[dKey] || null);
    }

    monthDataCache.set(cacheKey, daysList);
    return daysList;
  }

  /* ==============================================================================
     4. NAVIGATION ENGINE (Year → Month → Day → Details)
     ============================================================================== */
  function renderBreadcrumbs() {
    const isYear = (activeScreenId === 'screenYear');
    const isMonth = (activeScreenId === 'screenMonth');
    const isDay = (activeScreenId === 'screenDay');
    const isDetails = (activeScreenId === 'screenDetails');

    // 1. Month Screen Breadcrumb
    const mYear = document.getElementById('monthScreenYearTitle');
    if (mYear) mYear.textContent = String(currentYear);

    // 2. Day Screen Breadcrumbs
    const dYear = document.getElementById('dayBreadcrumbYear');
    if (dYear) dYear.textContent = String(currentYear);
    const dMonth = document.getElementById('dayScreenTitle');
    if (dMonth) {
      dMonth.textContent = MONTH_NAMES[currentMonth - 1] || 'Month';
    }

    // 3. Details Screen Breadcrumbs
    const dtYear = document.getElementById('detailsBreadcrumbYear');
    if (dtYear) dtYear.textContent = String(currentYear);
    const dtMonth = document.getElementById('detailsBreadcrumbMonth');
    if (dtMonth) {
      dtMonth.textContent = (MONTH_NAMES[currentMonth - 1] || 'Month').slice(0, 3);
    }
    const dtDay = document.getElementById('detailsScreenTitle');
    if (dtDay && currentDayKey) {
      const parts = currentDayKey.split('-').map(Number);
      const d = parts[2] || 1;
      const mName = (MONTH_NAMES[currentMonth - 1] || '').slice(0, 3);
      dtDay.textContent = `${String(d).padStart(2, '0')} ${mName}`;
    }

    // 4. Global Nav (if present)
    const nav = document.getElementById('almanacBreadcrumbsNav');
    if (!nav) return;

    let html = `
      <button type="button" class="almanac-crumb-btn ${isYear ? 'active' : ''}" onclick="AlmanacApp.goToYearSelection()" title="Liturgical Almanac">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-right:2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span>Almanac</span>
      </button>
    `;

    if (isMonth || isDay || isDetails) {
      html += `
        <span class="almanac-crumb-sep" aria-hidden="true">›</span>
        <button type="button" class="almanac-crumb-btn ${isMonth ? 'active' : ''}" onclick="AlmanacApp.goToMonthSelection()" title="Year ${currentYear}">
          <span>${currentYear}</span>
        </button>
      `;
    }

    if (isDay || isDetails) {
      const mName = MONTH_NAMES[currentMonth - 1] || 'Month';
      html += `
        <span class="almanac-crumb-sep" aria-hidden="true">›</span>
        <button type="button" class="almanac-crumb-btn ${isDay ? 'active' : ''}" onclick="AlmanacApp.goToDaySelection()" title="${mName} ${currentYear}">
          <span>${mName}</span>
        </button>
      `;
    }

    if (isDetails) {
      const parts = currentDayKey.split('-').map(Number);
      const d = parts[2] || 1;
      const mName = (MONTH_NAMES[currentMonth - 1] || '').slice(0, 3);
      const dt = new Date(parts[0], parts[1] - 1, d);
      const dow = !isNaN(dt.getTime()) ? DOW_SHORT[dt.getDay()] : '';
      const dayLabel = `${String(d).padStart(2, '0')} ${mName}${dow ? ` • ${dow}` : ''}`;

      html += `
        <span class="almanac-crumb-sep" aria-hidden="true">›</span>
        <span class="almanac-crumb-btn active" title="${currentDayKey}">
          <span>${dayLabel}</span>
        </span>
      `;
    }

    nav.innerHTML = html;
  }

  function showScreen(screenId, updateHash = true) {
    activeScreenId = screenId;
    document.querySelectorAll('.page-screen').forEach(el => {
      el.classList.remove('active-screen');
      el.setAttribute('aria-hidden', 'true');
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active-screen');
      target.removeAttribute('aria-hidden');
      const appContainer = document.querySelector('.app-container');
      if (appContainer) appContainer.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (document.body) {
      document.body.classList.toggle('in-almanac-details', screenId === 'screenDetails');
    }

    renderBreadcrumbs();

    if (updateHash) {
      let hash = 'years';
      if (screenId === 'screenMonth') hash = `year=${currentYear}`;
      else if (screenId === 'screenDay') hash = `month=${currentYear}-${currentMonth}`;
      else if (screenId === 'screenDetails') hash = `day=${currentDayKey}`;
      history.pushState(null, '', '#' + hash);
    }
  }

  function handleRouteFromHash() {
    const almView = document.getElementById('viewAlmanac');
    if (!almView || !almView.classList.contains('active')) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash || hash === 'years') {
      renderYearSelection();
      showScreen('screenYear', false);
    } else if (hash.startsWith('year=')) {
      const y = parseInt(hash.replace('year=', ''), 10);
      if (!isNaN(y)) {
        currentYear = y;
        renderMonthSelection(currentYear);
        showScreen('screenMonth', false);
      }
    } else if (hash.startsWith('month=')) {
      const parts = hash.replace('month=', '').split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) {
        currentYear = y;
        currentMonth = m;
        renderDaySelection(currentYear, currentMonth);
        showScreen('screenDay', false);
      }
    } else if (hash.startsWith('day=')) {
      const dayKey = hash.replace('day=', '');
      if (dayKey) {
        currentDayKey = dayKey;
        const parts = dayKey.split('-');
        currentYear = parseInt(parts[0], 10);
        currentMonth = parseInt(parts[1], 10);
        renderDailyDetails(currentDayKey);
        showScreen('screenDetails', false);
      }
    }
  }

  /* ==============================================================================
     5. PAGE 1: YEAR SELECTION PAGE
     ============================================================================== */
  async function renderYearSelection() {
    const grid = document.getElementById('yearsGrid');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px 0; color:var(--text-muted)">Loading available liturgical cycles…</div>';

    // 1. Fetch available years list from server
    try {
      const res = await fetch('/api/years');
      if (res.ok) {
        const json = await res.json();
        if (json.years && Array.isArray(json.years)) {
          availableYears.length = 0;
          availableYears.push(...json.years);
        }
      }
    } catch (_) {}

    const candidateYears = Array.from(new Set([2026, ...availableYears])).sort((a, b) => a - b);
    const isSuperAdmin = isCurrentUserSuperAdmin();
    const canManageYears = (isSuperAdmin || isCurrentUserAdmin());
    let html = '';

    if (!isSuperAdmin) {
      exitSelectionMode();
    }

    for (const yr of candidateYears) {
      const yData = await loadYearData(yr);
      const isCustomYear = (yr !== 2026);

      html += `
        <article class="year-card"
                 role="button"
                 tabindex="0"
                 data-action="select-year"
                 data-year="${yr}"
                 aria-label="Liturgical Year ${yr}">
          ${(isCustomYear && isSuperAdmin) ? `
            <button class="yc-delete-btn"
                    type="button"
                    title="Delete Liturgical Year ${yr}"
                    aria-label="Delete Liturgical Year ${yr}"
                    data-action="delete-year"
                    data-year="${yr}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          ` : ''}
          <div class="yc-number">${yr}</div>
          <div class="yc-title">Calendar Year</div>
        </article>`;
    }

    // Prominently show the year adding feature in #screenYear if Admin or Super Admin
    if (canManageYears) {
      html += `
        <article class="year-card add-custom"
                 role="button"
                 tabindex="0"
                 data-action="open-add-year-modal"
                 aria-label="Add Another Liturgical Year">
          <div class="yc-icon-box" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <div class="yc-number" style="font-size:1.55rem; margin-top:2px;">+ Year</div>
          <div class="yc-title">Add Liturgical Cycle</div>
        </article>`;
    }

    grid.innerHTML = html;
    if (isSuperAdmin) {
      initYearsGridLongPress();
    }
  }

  function selectYear(year) {
    currentYear = parseInt(year, 10);
    renderMonthSelection(currentYear);
    showScreen('screenMonth');
  }

  function goToYearSelection(updateHash = true) {
    exitSelectionMode();
    renderYearSelection();
    showScreen('screenYear', updateHash);
  }

  /* ==============================================================================
     6. PAGE 2: MONTH SELECTION PAGE (Responsive 2 × 6 Grid - Pinpoint 4)
     ============================================================================== */
  async function renderMonthSelection(year) {
    document.getElementById('monthScreenYearTitle').textContent = String(year);
    const grid = document.getElementById('monthsGrid');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px 0; color:var(--text-muted)">Generating months…</div>';

    const yearData = await loadYearData(year);
    let html = '';

    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      const mName = MONTH_NAMES[m - 1];
      const mHindi = MONTH_HINDI[m - 1];
      const totalDays = daysInMonth(year, m);

      // Collect liturgical colors present in this month, count recorded days and communion feasts
      const colorSet = new Set();
      let recordedCount = 0;
      let communionCount = 0;
      let dominantColor = '';

      for (let d = 1; d <= totalDays; d++) {
        const k = `${year}-${mStr}-${String(d).padStart(2, '0')}`;
        const dayData = yearData[k];
        if (dayData) {
          recordedCount++;
          if (dayData.hasCommunion) communionCount++;
          if (dayData.color) {
            colorSet.add(dayData.color);
            if (!dominantColor) dominantColor = dayData.color;
          }
        }
      }

      if (!dominantColor) {
        if (m === 12) dominantColor = 'Violet';
        else if (m === 11 || m === 10) dominantColor = 'Green';
        else if (m === 1) dominantColor = 'White';
        else if (m === 3 || m === 4) dominantColor = 'Violet';
        else if (m === 5) dominantColor = 'Red';
        else dominantColor = 'Green';
      }

      const dotsHtml = Array.from(colorSet).map(c =>
        `<div class="mc-dot dot-${escAttr(c)}" title="${escAttr(c)}"></div>`
      ).join('');

      const pillHtml = recordedCount > 0
        ? `<span class="mc-pill pill-entries">${recordedCount} ${recordedCount === 1 ? 'Entry' : 'Entries'}</span>`
        : '';

      html += `
        <article class="month-card${recordedCount > 0 ? ' has-data' : ' is-empty-month'}"
                 role="button"
                 tabindex="0"
                 data-action="select-month"
                 data-month="${m}"
                 data-color="${dominantColor}"
                 aria-label="${mName}${recordedCount > 0 ? ', ' + recordedCount + ' Entries' : ''}">
          <div class="mc-top-bar">
            <div class="mc-badge-group">
              <span class="mc-badge">${mStr}</span>
            </div>
            <div class="mc-dots-row">${dotsHtml}</div>
          </div>
          <div class="mc-content">
            <h3 class="mc-name">${escHtml(mName)}</h3>
            <span class="mc-hindi">${escHtml(mHindi)}</span>
          </div>
          <div class="mc-footer">
            ${pillHtml}
          </div>
        </article>`;
    }

    grid.innerHTML = html;
  }

  function selectMonth(m) {
    currentMonth = parseInt(m, 10);
    renderDaySelection(currentYear, currentMonth);
    showScreen('screenDay');
  }

  function goToMonthSelection(updateHash = true) {
    renderMonthSelection(currentYear);
    showScreen('screenMonth', updateHash);
  }

  /* ==============================================================================
     7. PAGE 3: DAY SELECTION PAGE (Dynamic Calendar Matrix)
     ============================================================================== */
  async function renderDaySelection(year, month) {
    const monthName = MONTH_NAMES[month - 1];
    const dYear = document.getElementById('dayBreadcrumbYear');
    if (dYear) dYear.textContent = String(year);
    const dTitle = document.getElementById('dayScreenTitle');
    if (dTitle) dTitle.textContent = monthName;
    const grid = document.getElementById('daysCalendarGrid');

    const totalDays = daysInMonth(year, month);
    const firstDow = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
    const mStr = String(month).padStart(2, '0');

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const yearData = await loadYearData(year);
    let cellsHtml = '';

    // Leading empty cells
    for (let i = 0; i < firstDow; i++) {
      cellsHtml += '<div class="day-cell empty" aria-hidden="true"></div>';
    }

    // Days 1..totalDays
    for (let d = 1; d <= totalDays; d++) {
      const dStr = String(d).padStart(2, '0');
      const dKey = `${year}-${mStr}-${dStr}`;
      const dayData = yearData[dKey] || null;

      const dow = (firstDow + d - 1) % 7;
      const isSunday = (dow === 0);
      const isToday = (dKey === todayKey);
      const hasCommunion = dayData ? Boolean(dayData.hasCommunion) : false;
      const color = dayData ? dayData.color : null;
      const themeText = dayData ? dayData.theme : '';

      let cls = 'day-cell';
      if (!dayData) cls += ' is-unrecorded';
      if (isSunday) cls += ' is-sunday';
      if (isToday) cls += ' is-today';
      if (hasCommunion) cls += ' has-communion';

      const ariaLabel = `${d} ${monthName} ${year}, ${DOW_FULL[dow]}${hasCommunion ? ', Communion' : ''}${themeText ? ': ' + themeText : (dayData ? '' : ' (No lectionary data)')}`;

      cellsHtml += `
        <div class="${cls}"
             role="button"
             tabindex="0"
             data-action="select-day"
             data-date="${dKey}"
             aria-label="${escAttr(ariaLabel)}">
          ${hasCommunion ? '<span class="dc-communion-icon" aria-hidden="true">🍷</span>' : ''}
          <span class="dc-num">${d}</span>
          ${color ? `<div class="dc-color-pip dot-${escAttr(color)}" aria-hidden="true"></div>` : ''}
        </div>`;
    }

    grid.innerHTML = cellsHtml;

    // Render Month Summary Card below calendar (proportional balance & insights)
    const summaryCard = document.getElementById('calendarMonthSummaryCard');
    if (summaryCard) {
      let recordedCount = 0;
      let communionCount = 0;
      for (let d = 1; d <= totalDays; d++) {
        const k = `${year}-${mStr}-${String(d).padStart(2, '0')}`;
        const dayData = yearData[k];
        if (dayData) {
          recordedCount++;
          if (dayData.hasCommunion) communionCount++;
        }
      }

      let seasonName = 'Ordinary Time';
      let dominantColor = 'Green';
      if (month === 12) { seasonName = 'Advent & Christmas'; dominantColor = 'Violet'; }
      else if (month === 11) { seasonName = 'Kingdomtide & Advent'; dominantColor = 'Green'; }
      else if (month === 10) { seasonName = 'Ordinary Time (Kingdomtide)'; dominantColor = 'Green'; }
      else if (month === 1) { seasonName = 'Epiphany Season'; dominantColor = 'White'; }
      else if (month === 2) { seasonName = 'Epiphany & Transfiguration'; dominantColor = 'Green'; }
      else if (month === 3 || month === 4) { seasonName = 'Lent & Holy Passion'; dominantColor = 'Violet'; }
      else if (month === 5) { seasonName = 'Eastertide & Pentecost'; dominantColor = 'Red'; }

      const colorMap = {
        White: '#ffffff',
        Yellow: '#eab308',
        Gold: '#eab308',
        Green: '#10b981',
        Violet: '#8b5cf6',
        Purple: '#8b5cf6',
        Red: '#ef4444'
      };
      const dotColor = colorMap[dominantColor] || '#10b981';

      summaryCard.innerHTML = `
        <div class="summary-card-inner">
          <div class="summary-badge-row">
            <span class="summary-season-pill">
              <span class="summary-season-dot" style="background:${dotColor}; box-shadow:0 0 8px ${dotColor};" aria-hidden="true"></span>
              ${escHtml(seasonName)}
            </span>
            <span class="summary-stats-pill">${recordedCount} of ${totalDays} Days Recorded</span>
            ${communionCount > 0 ? `<span class="summary-communion-pill"><span aria-hidden="true">🍷</span> ${communionCount} Holy Feasts</span>` : ''}
          </div>
          <p class="summary-guide-text">
            Tap any date above to open full Morning Worship, Evening Worship, and Holy Communion readings.
          </p>
        </div>`;
    }
  }

  function selectDay(dateKey) {
    currentDayKey = dateKey;
    renderDailyDetails(currentDayKey);
    showScreen('screenDetails');
  }

  function goToDaySelection(updateHash = true) {
    renderDaySelection(currentYear, currentMonth);
    showScreen('screenDay', updateHash);
  }

  /* ==============================================================================
     8. PAGE 4: DAILY ALMANAC DETAILS PAGE
     ============================================================================== */
  async function renderDailyDetails(dateKey) {
    const parts = dateKey.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const yearData = await loadYearData(year);
    const d = yearData[dateKey] || null;

    const dateObj = new Date(year, month - 1, day);
    const dowFull = DOW_FULL[dateObj.getDay()];
    const monthFull = MONTH_NAMES[month - 1];

    const dtYear = document.getElementById('detailsBreadcrumbYear');
    if (dtYear) dtYear.textContent = String(year);
    const dtMonth = document.getElementById('detailsBreadcrumbMonth');
    if (dtMonth) dtMonth.textContent = monthFull.slice(0, 3);
    const dtTitle = document.getElementById('detailsScreenTitle');
    if (dtTitle) dtTitle.textContent = `${day} ${monthFull.slice(0, 3)}`;
    const dtSubtitle = document.getElementById('detailsScreenSubtitle');
    if (dtSubtitle) dtSubtitle.textContent = dowFull;

    const container = document.getElementById('detailsContainer');

    // 1. ELEGANT EMPTY STATE IF UNSEEDED
    if (!d) {
      container.innerHTML = `
        <div class="empty-state-box" role="status">
          <div class="es-icon" aria-hidden="true">📖</div>
          <h2 class="es-title">No Lectionary Data Recorded</h2>
          <p class="es-text">
            There are no Almanac readings recorded for
            <strong>${escHtml(dowFull)}, ${day} ${escHtml(monthFull)} ${year}</strong>.
          </p>
          <button class="btn-add-day-data" data-action="open-manual-add-modal" data-date="${escAttr(dateKey)}">
            ➕ Add Readings for This Date
          </button>
        </div>`;
      updateFooterNav(year);
      return;
    }

    const color = d.color || 'Green';
    const colorMap = {
      White: '#ffffff',
      Yellow: '#eab308',
      Gold: '#eab308',
      Green: '#10b981',
      Violet: '#8b5cf6',
      Purple: '#8b5cf6',
      Red: '#ef4444'
    };
    const themeColor = colorMap[color] || '#10b981';
    const cleanTheme = String(d.theme || 'Daily Liturgical Reading').replace(/^\*+|\*+$/g, '').trim();

    let html = '';

    // Hero Card
    const dotBorder = (String(color).toLowerCase() === 'white') ? 'border:1px solid rgba(148,163,184,0.7);' : '';
    const themeTextColor = (String(color).toLowerCase() === 'white') ? 'var(--text-primary, #ffffff)' : themeColor;

    html += `<article class="daily-hero-card" data-color="${escAttr(color)}">`;
    html += `<div class="hero-tags-row">`;
    html += `<span class="jewel-pill" data-c="${escAttr(color)}">`;
    html += `<span style="width:8px;height:8px;border-radius:50%;background:${themeColor};${dotBorder}box-shadow:0 0 8px ${themeColor};" aria-hidden="true"></span>`;
    html += `${escHtml(color)}</span>`;
    if (d.hasCommunion) {
      html += `<span class="jewel-pill jewel-pill-communion"><span aria-hidden="true">🍷</span> Lord's Supper</span>`;
    }
    html += `<button class="btn-edit-action" data-action="open-manual-add-modal" data-date="${escAttr(dateKey)}" title="Edit Readings for this date">✏️ Edit Readings</button>`;
    html += `</div>`;
    html += `<h2 class="hero-date-large">${escHtml(dowFull)}, ${String(day).padStart(2, '0')} ${escHtml(monthFull)} ${year}</h2>`;
    html += `<p class="hero-theme-text" style="color:${themeTextColor}">${escHtml(cleanTheme)}</p>`;
    html += `</article>`;

    // Lord's Supper (Sacrament of the Altar)
    if (d.hasCommunion && d.lordsSupper && d.lordsSupper.length > 0) {
      html += renderServiceSection(
        "🍷", "Lord's Supper", "Sacrament of the Altar • प्रभु भोज",
        d.lordsSupper,
        { bg: 'var(--jewel-gold-soft)', color: 'var(--jewel-gold)' }
      );
    }

    // Morning Worship
    if (d.morningWorship && d.morningWorship.length > 0) {
      html += renderServiceSection(
        "🌅", "Morning Worship", "प्रातःकालीन आराधना",
        d.morningWorship,
        { bg: 'var(--jewel-cyan-soft)', color: 'var(--jewel-cyan)' }
      );
    }

    // Evening Worship
    if (d.eveningWorship && d.eveningWorship.length > 0) {
      html += renderServiceSection(
        "🌆", "Evening Worship", "सांध्यकालीन आराधना",
        d.eveningWorship,
        { bg: 'var(--jewel-violet-soft)', color: 'var(--jewel-violet)' }
      );
    }

    container.innerHTML = html;
    updateFooterNav(year);
  }

  function renderServiceSection(emoji, title, subtitle, readings, style) {
    let html = `<section class="service-section-card" aria-label="${escAttr(title)}">`;
    html += `<div class="service-section-header">`;
    html += `<div class="service-icon-box" style="background:${style.bg};color:${style.color}" aria-hidden="true">${emoji}</div>`;
    html += `<div><h3 class="service-title-text" style="color:${style.color}">${escHtml(title)}</h3>`;
    html += `<div class="service-subtitle-hindi">${escHtml(subtitle)}</div></div>`;
    html += `</div>`;

    // Pinpoint 2: Table Format Setup (Sr no., Bible names, Chapter, Verses - Non Scrollable Proportional)
    html += `<div class="readings-table-container">`;
    html += `<table class="readings-table" role="table">`;
    html += `<thead><tr>`;
    html += `<th scope="col" class="th-sr">Sr.</th>`;
    html += `<th scope="col" class="th-book">Bible names</th>`;
    html += `<th scope="col" class="th-ch">Chapter</th>`;
    html += `<th scope="col" class="th-vs">Verses</th>`;
    html += `<th scope="col" class="th-act">Action</th>`;
    html += `</tr></thead>`;
    html += `<tbody>`;

    readings.forEach((raw, idx) => {
      const item = parseReadingDetailed(raw, idx);
      if (!item) return;
      const chDisplay = item.chapter ? (item.chapter.toLowerCase().startsWith('ch') ? item.chapter : 'Ch. ' + item.chapter) : '—';
      const vsDisplay = item.verse ? (item.verse.toLowerCase().startsWith('v') ? item.verse : (item.verse.toLowerCase() === 'entire' ? 'Entire' : 'v. ' + item.verse)) : '—';
      html += `
        <tr class="reading-table-row">
          <td class="td-sr">${item.srNo}.</td>
          <td class="td-book">
            <div class="book-cell-inner">
              <span class="book-name-cell">${escHtml(item.book)}</span>
              <span class="reading-type-tag ${item.tagClass}">${escHtml(item.tag)}</span>
            </div>
          </td>
          <td class="td-ch"><span class="badge-ch">${escHtml(chDisplay)}</span></td>
          <td class="td-vs"><span class="badge-vs">${escHtml(vsDisplay)}</span></td>
          <td class="td-act">
            <div class="table-action-btns">
              <button class="btn-table-read"
                      data-action="open-scripture-modal"
                      data-passage="${escAttr(item.cleanText)}"
                      data-category="${escAttr(item.tag)}"
                      aria-label="Open reading ${escAttr(item.cleanText)}"
                      title="Open and read passage">
                <span aria-hidden="true">📖</span>
              </button>
            </div>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div></section>`;
    return html;
  }

  function parseReadingDetailed(raw, idx) {
    if (!raw) return null;

    // Direct object support for 100% preservation of admin edits
    if (typeof raw === 'object' && raw !== null) {
      const tag = raw.tag || raw.type || 'Reading';
      const book = (raw.book || '').replace(/^\*+[A-Za-z.*]+\*+\s*/, '').trim();
      let chapter = (raw.chapter || '').replace(/^Ch\.\s*/i, '').replace(/^[—–\-]$/, '').trim();
      let verse = (raw.verse || '').replace(/^v\.\s*/i, '').replace(/^[—–\-]$/, '').trim();

      let tagClass = 'read';
      const tagLc = tag.toLowerCase();
      if (tagLc === 'psalm') tagClass = 'psalm';
      else if (tagLc === 'ot') tagClass = 'ot';
      else if (tagLc === 'nt' || tagLc === 'epistle') tagClass = 'epistle';
      else if (tagLc === 'gospel') tagClass = 'gospel';

      let cleanText = book;
      if (chapter && verse) cleanText = `${book} ${chapter}:${verse}`;
      else if (chapter) cleanText = `${book} ${chapter}`;
      else if (verse) cleanText = `${book} ${verse}`;

      return {
        srNo: idx + 1,
        tag,
        tagClass,
        book,
        chapter,
        verse,
        cleanText
      };
    }

    let text = String(raw || '').trim();
    if (!text || text.startsWith('*NOVEMBER') || text.startsWith('*DECEMBER')) return null;

    let cleanText = text.replace(/^\*+[A-Za-z.*]+\*+\s*/, '').trim();

    let tag = 'Reading';
    let tagClass = 'read';

    // 1. Honor explicit user-assigned tag prefix first (*OT**, *NT**, *Gospel**, *Psalm**, *Reading**)
    const tagMatch = text.match(/^\*+([A-Za-z]+)\*+\s*/);
    if (tagMatch) {
      const explicitTag = tagMatch[1].toUpperCase();
      if (explicitTag === 'OT') { tag = 'OT'; tagClass = 'ot'; }
      else if (explicitTag === 'NT' || explicitTag === 'EPISTLE') { tag = 'NT'; tagClass = 'epistle'; }
      else if (explicitTag === 'GOSPEL' || explicitTag === 'GOSP') { tag = 'Gospel'; tagClass = 'gospel'; }
      else if (explicitTag === 'PSALM') { tag = 'Psalm'; tagClass = 'psalm'; }
      else if (explicitTag === 'READING' || explicitTag === 'READ') { tag = 'Reading'; tagClass = 'read'; }
      else { tag = tagMatch[1]; tagClass = 'read'; }
    } else {
      // Heuristic tag detection when no explicit tag was serialized
      const lc = text.toLowerCase();
      if (lc.includes('psalm') || lc.includes('भजन')) {
        tag = 'Psalm';
        tagClass = 'psalm';
      } else if (lc.includes('matthew') || lc.includes('mark') || lc.includes('luke') || lc.includes('john') ||
                 lc.includes('मत्ती') || lc.includes('लूका') || lc.includes('यूहन्ना') || lc.includes('मरकुस')) {
        tag = 'Gospel';
        tagClass = 'gospel';
      } else if (lc.includes('corinthians') || lc.includes('romans') || lc.includes('hebrews') ||
                 lc.includes('galatians') || lc.includes('ephesians') || lc.includes('philippians') ||
                 lc.includes('thessalonians') || lc.includes('timothy') || lc.includes('titus') ||
                 lc.includes('acts') || lc.includes('प्रेरितों') || lc.includes('jude') || lc.includes('यहूदा') ||
                 lc.includes('कुरिन्थियों') || lc.includes('रोमियों') || lc.includes('इब्रानियों') ||
                 lc.includes('गलातियों') || lc.includes('थिस्सलुनीकियों') || lc.includes('तीमुथियुस')) {
        tag = 'NT';
        tagClass = 'epistle';
      } else if (lc.includes('genesis') || lc.includes('exodus') || lc.includes('isaiah') || lc.includes('micah') ||
                 lc.includes('jeremiah') || lc.includes('ezekiel') || lc.includes('daniel') || lc.includes('deuteronomy') ||
                 lc.includes('ecclesiastes') || lc.includes('सभोपदेशक') || lc.includes('उत्पत्ति') ||
                 lc.includes('निर्गमन') || lc.includes('यशायाह') || lc.includes('मीका') || lc.includes('यिर्मयाह')) {
        tag = 'OT';
        tagClass = 'ot';
      } else if (idx === 0) {
        tag = 'OT';
        tagClass = 'ot';
      } else if (idx === 1) {
        tag = 'NT';
        tagClass = 'epistle';
      } else if (idx === 2) {
        tag = 'Gospel';
        tagClass = 'gospel';
      }
    }

    // Book, Chapter, Verses parsing
    let book = cleanText;
    let chapter = '';
    let verse = '';

    // Pattern A: "Book / Hindi : Chapter X, Verse Y" (handles single or multi-chapter ranges: 1–3, 1-2, 25)
    const mA = cleanText.match(/^(.*?)\s*:\s*Chapter\s*([0-9–\-,\s]+)\s*,\s*Verse\s*(.*?)$/i);
    // Pattern B: "Book / Hindi : Chapter X"
    const mB = cleanText.match(/^(.*?)\s*:\s*Chapter\s*([0-9–\-,\s]+)$/i);
    // Pattern C: Single-chapter book: "Book / Hindi : Verse X" (e.g. Jude)
    const mC = cleanText.match(/^(.*?)\s*:\s*Verse\s*(.*?)$/i);
    // Pattern D: "Book / Hindi : X:Y" (e.g. Psalm(s) / भजन संहिता : 78:1–39 or Romans : 8:28)
    const mD = cleanText.match(/^(.*?)\s*:\s*(\d+)\s*:\s*([0-9–\-,\s]+)$/i);
    // Pattern E: "Book / Hindi : X" (single psalm, e.g. Psalm(s) : 96)
    const mE = cleanText.match(/^(.*?)\s*:\s*(\d+)$/i);
    // Pattern F: Direct Bible reference: "Romans 8:28" or "1 Corinthians 13:1-13" or "यूहन्ना 3:16"
    const mF = cleanText.match(/^([1-3]?\s*[A-Za-z\u0900-\u097F\s/()]+?)\s+(\d+)\s*:\s*([0-9–\-,\s]+)$/);
    // Pattern G: Fallback with colon: "Book / Hindi : <rest>"
    const mG = cleanText.match(/^(.*?)\s*:\s*(.*?)$/i);

    if (mA) {
      book = mA[1].trim();
      chapter = mA[2].trim();
      verse = mA[3].trim();
    } else if (mB) {
      book = mB[1].trim();
      chapter = mB[2].trim();
    } else if (mC) {
      book = mC[1].trim();
      chapter = '1';
      verse = mC[2].trim();
    } else if (mD) {
      book = mD[1].trim();
      chapter = mD[2].trim();
      verse = mD[3].trim();
    } else if (mE) {
      book = mE[1].trim();
      chapter = mE[2].trim();
      verse = 'Entire';
    } else if (mF) {
      book = mF[1].trim();
      chapter = mF[2].trim();
      verse = mF[3].trim();
    } else if (mG) {
      book = mG[1].trim();
      const rest = mG[2].trim();
      const sub = rest.match(/(\d+)\s*:\s*([0-9–\-,\s]+)/);
      if (sub) {
        chapter = sub[1].trim();
        verse = sub[2].trim();
      } else {
        verse = rest;
      }
    }

    // Clean placeholders
    if (chapter === '—' || chapter === '-') chapter = '';
    if (verse === '—' || verse === '-') verse = '';

    return {
      srNo: idx + 1,
      tag,
      tagClass,
      book,
      chapter,
      verse,
      cleanText
    };
  }

  function updateFooterNav(year) {
    const btnPrev = document.getElementById('btnFooterPrev');
    const btnNext = document.getElementById('btnFooterNext');
    if (btnPrev) btnPrev.disabled = false;
    if (btnNext) btnNext.disabled = false;
  }

  function prevDay() {
    const parts = currentDayKey.split('-');
    const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) - 1);
    const prevKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    currentYear = dt.getFullYear();
    currentMonth = dt.getMonth() + 1;
    selectDay(prevKey);
  }

  function nextDay() {
    const parts = currentDayKey.split('-');
    const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) + 1);
    const nextKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    currentYear = dt.getFullYear();
    currentMonth = dt.getMonth() + 1;
    selectDay(nextKey);
  }

  /* ==============================================================================
     9. SCRIPTURE PASSAGE READER MODAL
     ============================================================================== */
  function formatCanonicalReference(raw) {
    if (typeof raw === 'object' && raw !== null) {
      let b = (raw.book || '').replace(/^\*+[A-Za-z.*]+\*+\s*/, '').replace(/\s*\/\s*.*$/, '').trim();
      b = b.replace(/^Psalm\(s\)/i, 'Psalm').replace(/^Psalms\b/i, 'Psalm').trim();
      const ch = (raw.chapter || '').replace(/^Ch\.\s*/i, '').replace(/^[—–\-]$/, '').trim();
      const vs = (raw.verse || '').replace(/^v\.\s*/i, '').replace(/^[—–\-]$/, '').replace(/[–—]/g, '-').trim();
      if (ch && vs) return `${b} ${ch}:${vs}`;
      if (ch) return `${b} ${ch}`;
      if (vs) return `${b} ${vs}`;
      return b;
    }

    let s = String(raw || '').trim();
    if (!s) return '';

    // 1. Remove liturgical category tags like *OT**, *NT**, Epistle:, Gospel:, Reading:, etc.
    s = s.replace(/^\*+[A-Za-z.*]+\*+\s*/, '')
         .replace(/^(Epistle|Gospel|OT|NT|Reading)\s*:\s*/i, '')
         .replace(/\s*\(and\/or\s+Gospel\)/i, '')
         .replace(/\s*\(or\s+.*?lectionary\)/i, '')
         .trim();

    let book = '';
    let remainder = s;

    if (s.includes('/')) {
      const slashIdx = s.indexOf('/');
      book = s.substring(0, slashIdx).trim();
      const afterSlash = s.substring(slashIdx + 1).trim();
      // Strip Hindi characters, Hindi digits, Devanagari numerals and spaces
      remainder = afterSlash.replace(/^[1-3]?\s*[\u0900-\u097F\s.]+\s*/, '').trim();
    } else {
      // If no slash, book precedes colon or chapter/verse pattern
      const mBook = s.match(/^([1-3]?\s*[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s*(.*)$/);
      if (mBook) {
        book = mBook[1].trim();
        remainder = mBook[2].trim();
      }
    }

    // Normalize book name
    book = book.replace(/^Psalm\(s\)/i, 'Psalm').replace(/^Psalms\b/i, 'Psalm').trim();

    // Normalize remainder dashes
    remainder = remainder.replace(/[–—]/g, '-').trim();

    // 1. Chapter X, Verse Y
    let m = remainder.match(/^:?\s*Chapter\s*([0-9\-,\s]+)\s*,\s*Verse\s*(.*?)$/i);
    if (m) {
      const ch = m[1].replace(/\s+/g, '').trim();
      const vs = m[2].replace(/\s+/g, '').trim();
      return `${book} ${ch}:${vs}`;
    }

    // 2. Chapter X
    m = remainder.match(/^:?\s*Chapter\s*([0-9\-,\s]+)$/i);
    if (m) {
      const ch = m[1].replace(/\s+/g, '').trim();
      return `${book} ${ch}`;
    }

    // 3. Verse Y (single-chapter book)
    m = remainder.match(/^:?\s*Verse\s*(.*?)$/i);
    if (m) {
      const vs = m[1].replace(/\s+/g, '').trim();
      return `${book} 1:${vs}`;
    }

    // 4. Multi-chapter verse range e.g. "28:22-29:11" or ": 28:22-29:11"
    m = remainder.match(/^:?\s*(\d+:\d+-\d+:\d+)$/);
    if (m) {
      return `${book} ${m[1]}`;
    }

    // 5. Standard Ch:Vs e.g. "4:1-7" or ": 11:1-12" or "3:16" or "2:1-2, 12-17"
    m = remainder.match(/^:?\s*(\d+)\s*:\s*([0-9\-,\s]+)$/);
    if (m) {
      const ch = m[1].trim();
      const vs = m[2].replace(/\s+/g, '').trim();
      return `${book} ${ch}:${vs}`;
    }

    // 6. Just chapter number e.g. ": 23" or "23"
    m = remainder.match(/^:?\s*(\d+)$/);
    if (m) {
      return `${book} ${m[1].trim()}`;
    }

    // Fallback: clean any leftover colons/whitespace
    return `${book} ${remainder.replace(/^:\s*/, '')}`.replace(/\s+/g, ' ').trim();
  }

  function openScriptureModal(passageText, category) {
    const modal = document.getElementById('scriptureModal');
    document.getElementById('scripturePassageTitle').textContent = passageText;
    document.getElementById('scriptureCategoryTag').textContent = category || 'Scripture Reading';

    // Canonical reference for accurate chapter & verse lookup
    const canonicalRef = formatCanonicalReference(passageText);
    const query = encodeURIComponent(canonicalRef);

    // Pinpoint 2: English version reading (Bible Gateway NIV)
    const btnEnglish = document.getElementById('linkBibleGateway');
    if (btnEnglish) {
      btnEnglish.href = `https://www.biblegateway.com/passage/?search=${query}&version=NIV`;
      btnEnglish.setAttribute('title', `Read ${canonicalRef} in English (NIV)`);
    }

    // Pinpoint 1 & 2: Hindi version reading (Holy Bible ERV-HI)
    const btnHindi = document.getElementById('linkYouVersion');
    if (btnHindi) {
      btnHindi.href = `https://www.biblegateway.com/passage/?search=${query}&version=ERV-HI`;
      btnHindi.setAttribute('title', `Read ${canonicalRef} in Hindi (हिंदी बाइबल)`);
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeScriptureModal() {
    const modal = document.getElementById('scriptureModal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  /* ==============================================================================
     10. SEARCH & MODALS
     ============================================================================== */
  function openSearchModal() {
    const modal = document.getElementById('searchModal');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    const input = document.getElementById('searchModalInput');
    input.value = '';
    document.getElementById('searchMatchesList').innerHTML =
      '<p style="text-align:center;color:var(--text-dim);padding:24px 0;">Search scripture book, festival, theme, or date…</p>';
    setTimeout(() => input.focus(), 150);
  }

  function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function executeSearch(query) {
    query = query.trim().toLowerCase();
    const container = document.getElementById('searchMatchesList');

    if (!query) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:24px 0;">Type to search liturgical readings</p>';
      return;
    }

    const yearData = await loadYearData(currentYear);
    const matches = [];

    for (const [k, d] of Object.entries(yearData)) {
      if (!d) continue;
      if (matches.length >= 30) break;
      const haystack = [
        d.theme, d.color, d.dayName, k,
        ...(d.morningWorship || []).map(r => typeof r === 'object' ? `${r.book} ${r.chapter} ${r.verse}` : r),
        ...(d.eveningWorship || []).map(r => typeof r === 'object' ? `${r.book} ${r.chapter} ${r.verse}` : r),
        ...(d.lordsSupper || []).map(r => typeof r === 'object' ? `${r.book} ${r.chapter} ${r.verse}` : r)
      ].join(' ').toLowerCase();

      if (haystack.includes(query)) {
        matches.push({ key: k, data: d });
      }
    }

    if (matches.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:24px 0;">No matching liturgical days found</p>';
      return;
    }

    container.innerHTML = matches.map(({ key, data }) => `
      <div class="search-match-card"
           role="button"
           tabindex="0"
           data-action="select-search-day"
           data-date="${escAttr(key)}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="font-size:0.92rem;color:var(--text-primary);">${escHtml(data.dayName)}, ${data.day} ${escHtml(data.monthName)}</strong>
          <span class="jewel-pill" data-c="${escAttr(data.color)}" style="font-size:0.64rem;padding:2px 8px;">${escHtml(data.color)}</span>
        </div>
        <p style="font-size:0.82rem;color:var(--almanac-accent, #c59b27);">${escHtml(data.theme)}</p>
      </div>
    `).join('');
  }

  function openLegendModal() {
    const modal = document.getElementById('legendModal');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeLegendModal() {
    const modal = document.getElementById('legendModal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  /* ==============================================================================
     10. MANUAL DATA ENTRY ENGINE (Pinpoint 1: Separate Fields for Book, Ch, Vs)
     ============================================================================== */
  function addReadingRow(containerId, data = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'reading-entry-row';

    const typeVal = data.tag || data.type || 'OT';
    let bookVal = (data.book || '').replace(/^\*+[A-Za-z.*]+\*+\s*/, '').trim();
    let chVal = (data.chapter || '').replace(/^Ch\.\s*/i, '').replace(/^Psalm\s*/i, '').trim();
    let vsVal = (data.verse || '').replace(/^v\.\s*/i, '').trim();

    // Never prefill placeholder dashes
    if (chVal === '—' || chVal === '-') chVal = '';
    if (vsVal === '—' || vsVal === '-' || vsVal.toLowerCase() === 'entire') vsVal = '';

    row.innerHTML = `
      <select class="reading-entry-input row-type" style="background:var(--glass-surface-elevated, #181B22); color:var(--text-primary); border:1px solid var(--glass-border); padding:4px;">
        <option value="OT"${typeVal === 'OT' ? ' selected' : ''}>OT</option>
        <option value="NT"${typeVal === 'NT' ? ' selected' : ''}>NT</option>
        <option value="Gospel"${typeVal === 'Gospel' ? ' selected' : ''}>Gospel</option>
        <option value="Psalm"${typeVal === 'Psalm' ? ' selected' : ''}>Psalm</option>
        <option value="Reading"${(typeVal === 'Reading' || !['OT','NT','Gospel','Psalm'].includes(typeVal)) ? ' selected' : ''}>Read</option>
      </select>
      <input type="text" class="reading-entry-input row-book" placeholder="Bible Name / Passage (e.g. Matthew / मत्ती)" value="${escAttr(bookVal)}" required>
      <input type="text" class="reading-entry-input row-ch" placeholder="Ch (5)" value="${escAttr(chVal)}">
      <input type="text" class="reading-entry-input row-vs" placeholder="Verses (1–12)" value="${escAttr(vsVal)}">
      <button type="button" class="btn-remove-reading" title="Remove reading" onclick="this.closest('.reading-entry-row').remove()">✕</button>
    `;

    container.appendChild(row);
  }

  function openManualAddModal(prefillDateKey) {
    const modal = document.getElementById('manualAddModal');
    if (!modal) return;

    const dateToUse = prefillDateKey || currentDayKey || `${currentYear}-10-01`;
    const dateInput = document.getElementById('manualDateInput');
    const colorSelect = document.getElementById('manualColorSelect');
    const themeInput = document.getElementById('manualThemeInput');
    const communionCheck = document.getElementById('manualCommunionCheck');
    const communionBlock = document.getElementById('manualLordsSupperBlock');

    dateInput.value = dateToUse;

    const morningContainer = document.getElementById('morningRows');
    const eveningContainer = document.getElementById('eveningRows');
    const communionContainer = document.getElementById('lordsSupperRows');
    if (morningContainer) morningContainer.innerHTML = '';
    if (eveningContainer) eveningContainer.innerHTML = '';
    if (communionContainer) communionContainer.innerHTML = '';

    const parts = dateToUse.split('-');
    const year = parseInt(parts[0], 10);
    const yData = yearDataCache.get(String(year)) || {};
    const existing = yData[dateToUse];

    if (existing) {
      document.getElementById('manualAddModalTitle').textContent = `Edit Readings (${dateToUse})`;
      themeInput.value = (existing.theme || '').replace(/^\*+|\*+$/g, '').trim();
      colorSelect.value = existing.color || 'Green';
      communionCheck.checked = Boolean(existing.hasCommunion);
      communionBlock.style.display = existing.hasCommunion ? 'block' : 'none';

      // Morning readings
      if (existing.morningWorship && existing.morningWorship.length > 0) {
        existing.morningWorship.forEach((str, i) => {
          const p = parseReadingDetailed(str, i) || { book: str };
          addReadingRow('morningRows', p);
        });
      } else {
        addReadingRow('morningRows', { tag: 'OT', book: '', chapter: '', verse: '' });
      }

      // Evening readings
      if (existing.eveningWorship && existing.eveningWorship.length > 0) {
        existing.eveningWorship.forEach((str, i) => {
          const p = parseReadingDetailed(str, i) || { book: str };
          addReadingRow('eveningRows', p);
        });
      } else {
        addReadingRow('eveningRows', { tag: 'OT', book: '', chapter: '', verse: '' });
      }

      // Lord's Supper readings
      if (existing.lordsSupper && existing.lordsSupper.length > 0) {
        existing.lordsSupper.forEach((str, i) => {
          const p = parseReadingDetailed(str, i) || { book: str };
          addReadingRow('lordsSupperRows', p);
        });
      } else {
        addReadingRow('lordsSupperRows', { tag: 'OT', book: '', chapter: '', verse: '' });
      }
    } else {
      document.getElementById('manualAddModalTitle').textContent = `Add Readings (${dateToUse})`;
      themeInput.value = '';
      colorSelect.value = 'Green';
      communionCheck.checked = false;
      communionBlock.style.display = 'none';

      // Clean template rows without hardcoded book names
      addReadingRow('morningRows', { tag: 'OT', book: '', chapter: '', verse: '' });
      addReadingRow('morningRows', { tag: 'NT', book: '', chapter: '', verse: '' });
      addReadingRow('morningRows', { tag: 'Gospel', book: '', chapter: '', verse: '' });
      addReadingRow('morningRows', { tag: 'Psalm', book: '', chapter: '', verse: '' });

      addReadingRow('eveningRows', { tag: 'OT', book: '', chapter: '', verse: '' });
      addReadingRow('eveningRows', { tag: 'NT', book: '', chapter: '', verse: '' });
      addReadingRow('eveningRows', { tag: 'Psalm', book: '', chapter: '', verse: '' });

      addReadingRow('lordsSupperRows', { tag: 'OT', book: '', chapter: '', verse: '' });
      addReadingRow('lordsSupperRows', { tag: 'NT', book: '', chapter: '', verse: '' });
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeManualAddModal() {
    const modal = document.getElementById('manualAddModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.classList.remove('has-keyboard');
      modal.setAttribute('aria-hidden', 'true');
    }
    const form = document.getElementById('manualAddForm');
    if (form) {
      form.style.paddingBottom = '';
      form.style.scrollPaddingBottom = '';
      form.style.removeProperty('--active-keyboard-height');
      form.classList.remove('keyboard-active');
    }
    document.body.classList.remove('keyboard-is-open');
  }

  async function saveManualDayData(e) {
    if (e && e.preventDefault) e.preventDefault();

    const dateVal = document.getElementById('manualDateInput').value.trim();
    if (!dateVal || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      showToast('⚠️ Please provide a valid date (YYYY-MM-DD)');
      return;
    }

    const parts = dateVal.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const dateObj = new Date(year, month - 1, day);
    const dowFull = DOW_FULL[dateObj.getDay()];
    const monthName = MONTH_NAMES[month - 1];

    let theme = document.getElementById('manualThemeInput').value.trim();
    theme = theme.replace(/^\*+|\*+$/g, '').trim();
    if (!theme) theme = 'Daily Liturgical Reading';

    const color = document.getElementById('manualColorSelect').value;
    const hasCommunion = document.getElementById('manualCommunionCheck').checked;

    function serializeRows(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return [];
      const rows = container.querySelectorAll('.reading-entry-row');
      const results = [];
      rows.forEach(r => {
        const typeEl = r.querySelector('.row-type');
        const bookEl = r.querySelector('.row-book');
        const chEl = r.querySelector('.row-ch');
        const vsEl = r.querySelector('.row-vs');

        const type = typeEl ? typeEl.value.trim() : 'Reading';
        let book = bookEl ? bookEl.value.trim() : '';
        let ch = chEl ? chEl.value.trim() : '';
        let vs = vsEl ? vsEl.value.trim() : '';

        // Clean any placeholder dashes
        if (ch === '—' || ch === '-') ch = '';
        if (vs === '—' || vs === '-') vs = '';

        if (!book && !ch && !vs) return; // Skip completely empty row

        // Every individual edit field saves its exact data, not others!
        results.push({
          type: type,
          tag: type,
          book: book,
          chapter: ch,
          verse: vs
        });
      });
      return results;
    }

    const lordsSupper = hasCommunion ? serializeRows('lordsSupperRows') : [];
    const morningWorship = serializeRows('morningRows');
    const eveningWorship = serializeRows('eveningRows');

    const nowIso = new Date().toISOString();
    localEditTimestamps.set(dateVal, Date.now());

    const payload = {
      dateKey: dateVal,
      day,
      month,
      monthName,
      year,
      dayName: dowFull,
      theme,
      color,
      hasCommunion,
      morningWorship,
      eveningWorship,
      lordsSupper,
      updated_at: nowIso
    };

    function stringifyReading(r) {
      if (!r) return '';
      if (typeof r === 'string') return r;
      const t = r.type || r.tag || 'Reading';
      const b = r.book || '';
      const c = r.chapter || '';
      const v = r.verse || '';
      const tPre = (t && t !== 'Reading') ? `*${t}** ` : '';
      if (c && v) return `${tPre}${b} : Chapter ${c}, Verse ${v}`;
      if (c) return `${tPre}${b} : Chapter ${c}`;
      if (v) return `${tPre}${b} : Verse ${v}`;
      return `${tPre}${b}`;
    }

    const flatReadings = [
      ...morningWorship.map(stringifyReading),
      ...eveningWorship.map(stringifyReading),
      ...(hasCommunion ? lordsSupper.map(stringifyReading) : [])
    ];

    const supabaseRecord = {
      date_key: dateVal,
      year: year,
      title: theme,
      liturgical_color: color,
      details: JSON.stringify(payload),
      readings: flatReadings,
      version: 1,
      updated_at: nowIso
    };

    try {
      // 1. Update in-memory yearDataCache
      const yStr = String(year);
      let yData = yearDataCache.get(yStr);
      if (!yData) {
        yData = {};
        yearDataCache.set(yStr, yData);
      }
      yData[dateVal] = payload;

      // Invalidate month cache
      const mKey = `${year}-${String(month).padStart(2, '0')}`;
      monthDataCache.delete(mKey);

      if (!availableYears.includes(year)) {
        availableYears.push(year);
        availableYears.sort((a, b) => a - b);
      }

      // 2. Update window.CHURCH_DATA
      if (!window.CHURCH_DATA) window.CHURCH_DATA = {};
      if (!window.CHURCH_DATA.almanacDatabase) window.CHURCH_DATA.almanacDatabase = {};
      window.CHURCH_DATA.almanacDatabase[dateVal] = payload;

      // 3. Persist to localStorage
      try {
        localStorage.setItem('sanctuary_custom_almanac', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
        localStorage.setItem('sanctuary_custom_almanac_entries', JSON.stringify(window.CHURCH_DATA.almanacDatabase));
      } catch (_) {}

      // 4. Persist to Dexie
      try {
        if (window.churchDexieDb && window.churchDexieDb.almanac_entries) {
          await window.churchDexieDb.almanac_entries.put(supabaseRecord);
        }
      } catch (dexErr) {
        console.warn('[Almanac] Dexie put warning:', dexErr);
      }

      // 5. Synchronize with Supabase Cloud
      try {
        if (window.ChurchSync && window.ChurchSync.Almanac && typeof window.ChurchSync.Almanac.upsert === 'function') {
          await window.ChurchSync.Almanac.upsert(supabaseRecord);
        } else if (window.ChurchCompanionSync && window.ChurchCompanionSync.Almanac) {
          await window.ChurchCompanionSync.Almanac.upsert(supabaseRecord);
        } else if (typeof window.syncWrite === 'function') {
          await window.syncWrite('almanac', 'insert', supabaseRecord);
        } else if (window.churchSupabase) {
          await window.churchSupabase.from('almanac_entries').upsert(supabaseRecord, { onConflict: 'date_key' });
        }
      } catch (supaErr) {
        console.warn('[Almanac] Supabase sync warning:', supaErr);
      }

      // 6. Notify server if local server is active
      try {
        fetch('/api/almanac/save-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (_) {}

      // 7. Dispatch church:sync:almanac for reactive UI updates
      try {
        window.dispatchEvent(new CustomEvent('church:sync:almanac', {
          detail: { item: supabaseRecord, op: 'update', source: 'local_save' }
        }));
      } catch (_) {}

      closeManualAddModal();
      showToast(`✨ Saved readings for ${day} ${monthName} ${year}`);

      // Refresh current screen
      if (activeScreenId === 'screenDetails') {
        currentDayKey = dateVal;
        currentYear = year;
        currentMonth = month;
        renderDailyDetails(currentDayKey);
      } else if (activeScreenId === 'screenDay') {
        renderDaySelection(currentYear, currentMonth);
      } else if (activeScreenId === 'screenMonth') {
        renderMonthSelection(currentYear);
      } else {
        renderYearSelection();
      }
    } catch (err) {
      showToast('⚠️ Error saving date: ' + err.message);
    }
  }

  function openAddYearModal() {
    if (!isCurrentUserSuperAdmin() && !isCurrentUserAdmin()) {
      showToast('Admin permissions required to add liturgical years 👑');
      return;
    }
    const modal = document.getElementById('addYearModal');
    if (modal) {
      const highestYear = availableYears.length > 0 ? Math.max(...availableYears) : 2026;
      const nextYear = Math.max(highestYear + 1, currentYear + 1, 2027);
      const input = document.getElementById('newYearInput');
      if (input) input.value = nextYear;
      modal.classList.add('is-open');
      if (input) setTimeout(() => { input.focus(); input.select(); }, 120);
    }
  }

  function closeAddYearModal() {
    const modal = document.getElementById('addYearModal');
    if (modal) modal.classList.remove('is-open');
  }

  function setAddYearInput(val) {
    const input = document.getElementById('newYearInput');
    if (input) {
      input.value = val;
      input.focus();
    }
  }

  async function submitAddYear(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!isCurrentUserSuperAdmin() && !isCurrentUserAdmin()) {
      showToast('Admin permissions required to add liturgical years 👑');
      return;
    }
    const input = document.getElementById('newYearInput');
    if (!input) return;
    const yr = parseInt(input.value.trim(), 10);
    if (isNaN(yr) || yr < 1900 || yr > 2200) {
      showToast('⚠️ Please enter a valid 4-digit year (1900–2200)');
      return;
    }

    try {
      const res = await fetch('/api/years/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: yr })
      });
      const data = await res.json();
      if (data.success || res.ok) {
        if (!availableYears.includes(yr)) {
          availableYears.push(yr);
          availableYears.sort((a, b) => a - b);
        }
        closeAddYearModal();
        showToast(`✨ Liturgical Year ${yr} ready!`);
        selectYear(yr);
      } else {
        showToast('⚠️ ' + (data.error || 'Failed to add year'));
      }
    } catch (err) {
      if (!availableYears.includes(yr)) {
        availableYears.push(yr);
        availableYears.sort((a, b) => a - b);
      }
      closeAddYearModal();
      showToast(`✨ Liturgical Year ${yr} opened!`);
      selectYear(yr);
    }
  }

  function promptCustomYear() {
    openAddYearModal();
  }

  /* ==============================================================================
     10b. DELETE LITURGICAL YEAR & LONG-PRESS HANDLERS (Pinpoint Deletion Feature)
     ============================================================================== */
  let yearPendingDeletion = null;
  let longPressTimer = null;
  let isLongPressActive = false;
  let isSelectionModeActive = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let activePressedCard = null;

  function enterSelectionMode() {
    if (!isCurrentUserSuperAdmin()) return;
    isSelectionModeActive = true;
    const grid = document.getElementById('yearsGrid');
    if (grid) grid.classList.add('is-selection-mode');
    const bar = document.getElementById('selectionModeBar');
    if (bar) bar.classList.add('is-visible');

    if (navigator.vibrate) {
      try { navigator.vibrate([40, 30, 40]); } catch (_) {}
    }
  }

  function exitSelectionMode() {
    isSelectionModeActive = false;
    const grid = document.getElementById('yearsGrid');
    if (grid) grid.classList.remove('is-selection-mode');
    const bar = document.getElementById('selectionModeBar');
    if (bar) bar.classList.remove('is-visible');
    if (activePressedCard) {
      activePressedCard.classList.remove('is-pressing', 'is-longpress-active');
      activePressedCard = null;
    }
  }

  function initYearsGridLongPress() {
    if (!isCurrentUserSuperAdmin()) return;
    const grid = document.getElementById('yearsGrid');
    if (!grid || grid._longPressBound) return;
    grid._longPressBound = true;

    function handleStart(e) {
      // Pinpoint Requirement: The long press feature is strictly only for superadmin
      if (!isCurrentUserSuperAdmin()) return;

      const card = e.target.closest('.year-card[data-action="select-year"]');
      if (!card || e.target.closest('[data-action="delete-year"]')) return;

      activePressedCard = card;
      const touch = e.touches ? e.touches[0] : e;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      card.classList.add('is-pressing');

      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        isLongPressActive = true;
        if (activePressedCard) {
          activePressedCard.classList.remove('is-pressing');
        }

        // Enter Selection Mode on Long Press (Pinpoint requirement)
        enterSelectionMode();

        // Also open confirmation dialog box for the pressed card
        const yr = card.getAttribute('data-year');
        openDeleteYearModal(yr);
      }, 500);
    }

    function handleMove(e) {
      if (!longPressTimer) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);
      if (dx > 10 || dy > 10) {
        handleCancel();
      }
    }

    function handleCancel() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (activePressedCard) {
        activePressedCard.classList.remove('is-pressing');
      }
      if (isLongPressActive) {
        setTimeout(() => {
          isLongPressActive = false;
          activePressedCard = null;
        }, 300);
      } else {
        activePressedCard = null;
      }
    }

    // Touch events
    grid.addEventListener('touchstart', handleStart, { passive: true });
    grid.addEventListener('touchmove', handleMove, { passive: true });
    grid.addEventListener('touchend', handleCancel);
    grid.addEventListener('touchcancel', handleCancel);

    // Mouse events
    grid.addEventListener('mousedown', handleStart);
    grid.addEventListener('mousemove', handleMove);
    grid.addEventListener('mouseup', handleCancel);
    grid.addEventListener('mouseleave', handleCancel);

    // Desktop Context Menu (Right-click)
    grid.addEventListener('contextmenu', e => {
      if (!isCurrentUserSuperAdmin()) return;
      const card = e.target.closest('.year-card[data-action="select-year"]');
      if (card) {
        e.preventDefault();
        enterSelectionMode();
        const yr = card.getAttribute('data-year');
        openDeleteYearModal(yr);
      }
    });
  }

  function openDeleteYearModal(year) {
    if (!isCurrentUserSuperAdmin()) {
      showToast('Super Admin permission required to delete liturgical cycles 👑');
      return;
    }
    year = parseInt(year, 10);
    if (isNaN(year)) return;
    yearPendingDeletion = year;

    const modal = document.getElementById('deleteYearModal');
    if (!modal) return;

    const targetNumber = document.getElementById('deleteYearTargetNumber');
    if (targetNumber) targetNumber.textContent = String(year);

    const desc = document.getElementById('deleteYearModalDesc');
    const deleteBtn = document.getElementById('btnConfirmDeleteYear');

    if (year === 2026) {
      if (desc) {
        desc.innerHTML = `⚠️ <strong>Liturgical Year 2026</strong> is the base calendar cycle.<br><span style="color:var(--text-muted); font-size:0.88rem;">Deleting will reset all 2026 lectionary entries. A secure backup will be preserved.</span>`;
      }
      if (deleteBtn) {
        deleteBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Reset Year 2026</span>
        `;
      }
    } else {
      if (desc) {
        desc.innerHTML = `Are you sure you want to delete the liturgical cycle for <strong style="color:var(--jewel-ruby); font-size:1.15em;">${year}</strong> and all its associated calendar data?<br><span style="color:var(--text-muted); font-size:0.88rem;">This action cannot be undone.</span>`;
      }
      if (deleteBtn) {
        deleteBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Delete Year</span>
        `;
      }
    }

    modal.classList.add('is-open');
  }

  function closeDeleteYearModal() {
    const modal = document.getElementById('deleteYearModal');
    if (modal) modal.classList.remove('is-open');
    if (activePressedCard) {
      activePressedCard.classList.remove('is-longpress-active');
      activePressedCard = null;
    }
    yearPendingDeletion = null;
  }

  async function confirmDeleteYear() {
    if (!yearPendingDeletion) return;
    if (!isCurrentUserSuperAdmin()) {
      showToast('Super Admin permission required to delete liturgical cycles 👑');
      return;
    }
    const yr = yearPendingDeletion;
    const btn = document.getElementById('btnConfirmDeleteYear');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Deleting…</span>';
    }

    try {
      const res = await fetch('/api/years/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: yr })
      });
      const data = await res.json();
      if (data.success || res.ok) {
        delete yearDataCache[yr];
        const idx = availableYears.indexOf(yr);
        if (idx !== -1) availableYears.splice(idx, 1);

        closeDeleteYearModal();
        exitSelectionMode();
        showToast(`🗑️ Liturgical Year ${yr} deleted successfully`);
        await renderYearSelection();
      } else {
        showToast('⚠️ ' + (data.error || 'Failed to delete year'));
      }
    } catch (err) {
      showToast('⚠️ Error deleting year: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Delete Year</span>
        `;
      }
    }
  }

  /* ==============================================================================
     11. CLIPBOARD & SHARING
     ============================================================================== */
  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Copied: "' + text.substring(0, 26) + '…"');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('📋 Copied to clipboard');
    } catch (_) {
      showToast('⚠️ Unable to copy');
    }
    document.body.removeChild(ta);
  }

  async function copyEntireDayReadings() {
    const yearData = await loadYearData(currentYear);
    const d = yearData[currentDayKey];
    if (!d) return;

    function formatReadingForCopy(r) {
      if (!r) return '';
      if (typeof r === 'string') return r;
      const b = r.book || '';
      const c = r.chapter ? (r.chapter.toLowerCase().startsWith('ch') ? r.chapter : `Ch. ${r.chapter}`) : '';
      const v = r.verse ? (r.verse.toLowerCase().startsWith('v') ? r.verse : `v. ${r.verse}`) : '';
      const ref = [b, c, v].filter(Boolean).join(', ');
      const tag = r.type || r.tag;
      return tag ? `[${tag}] ${ref}` : ref;
    }

    let t = `📖 *Liturgical Almanac — ${d.dayName}, ${d.day} ${d.monthName} ${d.year}*\n`;
    t += `🎨 Liturgical Color: ${d.color}\n`;
    t += `✨ Theme: ${d.theme}\n\n`;

    if (d.hasCommunion && d.lordsSupper && d.lordsSupper.length) {
      t += `🍷 *Lord's Supper (Sacrament of the Altar)*:\n`;
      d.lordsSupper.forEach((r, i) => { t += `  ${i + 1}. ${formatReadingForCopy(r)}\n`; });
      t += '\n';
    }
    if (d.morningWorship && d.morningWorship.length) {
      t += `🌅 *Morning Worship*:\n`;
      d.morningWorship.forEach((r, i) => { t += `  ${i + 1}. ${formatReadingForCopy(r)}\n`; });
      t += '\n';
    }
    if (d.eveningWorship && d.eveningWorship.length) {
      t += `🌆 *Evening Worship*:\n`;
      d.eveningWorship.forEach((r, i) => { t += `  ${i + 1}. ${formatReadingForCopy(r)}\n`; });
    }

    copyTextToClipboard(t);
  }

  function jumpToToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const mStr = String(m).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');

    currentYear = y;
    currentMonth = m;
    currentDayKey = `${y}-${mStr}-${dStr}`;

    renderDailyDetails(currentDayKey);
    showScreen('screenDetails');
    showToast('📅 Jumped to Today');
  }

  /* ==============================================================================
     12. MATHEMATICAL CALENDAR UTILITIES (Zero Hardcodes)
     ============================================================================== */
  function daysInMonth(year, month) {
    // Exact leap year calculation in pure standard ECMAScript
    return new Date(year, month, 0).getDate();
  }

  let toastTimer;
  function showToast(msg) {
    if (typeof window.showToast === 'function' && window.showToast !== showToast) {
      window.showToast(msg);
      return;
    }
    clearTimeout(toastTimer);
    const el = document.getElementById('toastNotification');
    if (el) {
      const msgSpan = el.querySelector('#toastMessage');
      if (msgSpan) {
        msgSpan.textContent = msg;
        el.classList.remove('hidden');
        el.classList.add('is-visible');
        toastTimer = setTimeout(() => { el.classList.remove('is-visible'); el.classList.add('hidden'); }, 2600);
      } else {
        el.textContent = msg;
        el.classList.add('is-visible');
        toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
      }
    }
  }

  /* ==============================================================================
     13. DELEGATED EVENT LISTENERS & KEYBOARD ACCESSIBILITY
     ============================================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize years
    fetch('/api/years')
      .then(r => r.json())
      .then(res => {
        if (res.years && Array.isArray(res.years)) {
          availableYears.push(...res.years);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (window.location.hash) {
          handleRouteFromHash();
        } else {
          renderYearSelection();
          showScreen('screenYear', false);
        }
      });

    window.addEventListener('popstate', handleRouteFromHash);

    // Search input debouncer
    let searchDebounce;
    const searchInput = document.getElementById('searchModalInput');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => executeSearch(e.target.value), 120);
      });
    }

    // Delegated Clicks
    document.addEventListener('click', e => {
      // 0. Delete Year Button on card (Pinpoint Deletion Feature - Super Admin Only)
      const delBtn = e.target.closest('[data-action="delete-year"]');
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (!isCurrentUserSuperAdmin()) {
          showToast('Super Admin permission required to delete liturgical cycles 👑');
          return;
        }
        openDeleteYearModal(delBtn.getAttribute('data-year'));
        return;
      }

      // 1. Select Year (or trigger Deletion Modal in Selection Mode - Super Admin Only)
      const yearCard = e.target.closest('[data-action="select-year"]');
      if (yearCard) {
        if (isLongPressActive) {
          return;
        }
        const yr = yearCard.getAttribute('data-year');
        if (isSelectionModeActive) {
          e.preventDefault();
          e.stopPropagation();
          if (isCurrentUserSuperAdmin()) {
            openDeleteYearModal(yr);
          } else {
            exitSelectionMode();
          }
          return;
        }
        selectYear(yr);
        return;
      }

      // Dismiss Selection Mode if tapping outside grid
      if (isSelectionModeActive && !e.target.closest('.years-grid') && !e.target.closest('#selectionModeBar') && !e.target.closest('#deleteYearModal')) {
        exitSelectionMode();
      }

      // 2. Custom Year / Open Add Year Modal
      const openAddYear = e.target.closest('[data-action="open-add-year-modal"], [data-action="prompt-custom-year"]');
      if (openAddYear) {
        openAddYearModal();
        return;
      }

      // 3. Select Month
      const monthCard = e.target.closest('[data-action="select-month"]');
      if (monthCard) {
        selectMonth(monthCard.getAttribute('data-month'));
        return;
      }

      // 4. Select Day
      const dayCell = e.target.closest('[data-action="select-day"]');
      if (dayCell && !dayCell.classList.contains('empty')) {
        selectDay(dayCell.getAttribute('data-date'));
        return;
      }

      // 5. Clickable Scripture Reference
      const scriptureRef = e.target.closest('[data-action="open-scripture-modal"]');
      if (scriptureRef) {
        const passage = scriptureRef.getAttribute('data-passage');
        const cat = scriptureRef.getAttribute('data-category');
        openScriptureModal(passage, cat);
        return;
      }

      // 6. Copy Single Passage
      const copyBtn = e.target.closest('[data-action="copy-passage"]');
      if (copyBtn) {
        const passage = copyBtn.getAttribute('data-passage');
        if (passage) copyTextToClipboard(passage);
        return;
      }

      // 7. Select Day from Search
      const searchDay = e.target.closest('[data-action="select-search-day"]');
      if (searchDay) {
        closeSearchModal();
        const dKey = searchDay.getAttribute('data-date');
        const parts = dKey.split('-');
        currentYear = parseInt(parts[0], 10);
        currentMonth = parseInt(parts[1], 10);
        selectDay(dKey);
        return;
      }
      // 8. Open Manual Add Modal
      const manualBtn = e.target.closest('[data-action="open-manual-add-modal"]');
      if (manualBtn) {
        const d = manualBtn.getAttribute('data-date') || currentDayKey;
        openManualAddModal(d);
        return;
      }
    });

    // Delegated Keyboard Controls
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeScriptureModal();
        closeSearchModal();
        closeLegendModal();
        closeManualAddModal();
        closeAddYearModal();
        return;
      }

      if (activeScreenId === 'screenDetails') {
        if (e.key === 'ArrowLeft') { prevDay(); return; }
        if (e.key === 'ArrowRight') { nextDay(); return; }
      }

      if (e.key === 'Enter' || e.key === ' ') {
        const focused = document.activeElement;
        if (focused && focused.hasAttribute('data-action')) {
          e.preventDefault();
          focused.click();
        }
      }
    });

    // 9. Auto-prefill on date picker change inside manual add modal
    const manualDateInputEl = document.getElementById('manualDateInput');
    if (manualDateInputEl) {
      manualDateInputEl.addEventListener('change', () => {
        if (manualDateInputEl.value && /^\d{4}-\d{2}-\d{2}$/.test(manualDateInputEl.value)) {
          openManualAddModal(manualDateInputEl.value);
        }
      });
    }

    // 9b. Dynamic Keyboard Protection:
    // 1. If text field is behind keyboard, automatically moves upward with keyboard
    // 2. Scrollable container goes upward ONLY up to the keyboard height (no excessive void)
    const manualForm = document.getElementById('manualAddForm');
    const manualModal = document.getElementById('manualAddModal');
    let baseUnfocusedHeight = window.innerHeight;

    window.addEventListener('resize', () => {
      const active = document.activeElement;
      if (!active || !active.matches('input, select, textarea')) {
        baseUnfocusedHeight = window.innerHeight;
      }
    });

    function getMeasuredKeyboardHeight() {
      const currentH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      let kh = 0;
      if (baseUnfocusedHeight > currentH) {
        kh = baseUnfocusedHeight - currentH;
      } else if (window.screen && window.screen.availHeight && window.screen.availHeight > currentH) {
        kh = window.screen.availHeight - currentH - 48;
      }
      if (kh < 80 && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)) {
        kh = Math.round(Math.min(300, window.innerHeight * 0.40));
      }
      return Math.max(0, kh);
    }

    function updateKeyboardPadding() {
      if (!manualForm) return;
      const kh = getMeasuredKeyboardHeight();
      const padVal = kh > 0 ? `${kh + 12}px` : '280px';
      manualForm.style.setProperty('--active-keyboard-height', padVal);
      manualForm.style.paddingBottom = padVal;
      manualForm.style.scrollPaddingBottom = '14px';
    }

    function ensureManualFieldVisible(target) {
      if (!target || !manualForm || !manualForm.contains(target)) return;
      const vpHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const vpTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
      const keyboardTop = vpTop + vpHeight;
      const rect = target.getBoundingClientRect();

      // If text field is behind the keyboard, move upward with the keyboard
      const safeBuffer = 10;
      const overlap = rect.bottom - (keyboardTop - safeBuffer);
      if (overlap > 0) {
        manualForm.scrollBy({ top: overlap, behavior: 'smooth' });
      } else if (rect.top < 56) {
        // Only if clipped by top modal header
        manualForm.scrollBy({ top: rect.top - 56, behavior: 'smooth' });
      }
      // If already visible above keyboard: do not move!
    }

    if (manualForm) {
      manualForm.addEventListener('focusin', e => {
        const target = e.target;
        if (!target || !target.matches('input, select, textarea')) return;

        document.body.classList.add('keyboard-is-open');
        if (manualModal) manualModal.classList.add('has-keyboard');
        manualForm.classList.add('keyboard-active');

        updateKeyboardPadding();

        // Check if behind keyboard and move smoothly upward
        [60, 200, 380].forEach(delay => {
          setTimeout(() => {
            if (document.activeElement === target) {
              updateKeyboardPadding();
              ensureManualFieldVisible(target);
            }
          }, delay);
        });
      });

      manualForm.addEventListener('focusout', () => {
        setTimeout(() => {
          const active = document.activeElement;
          if (!active || !manualForm.contains(active)) {
            if (manualModal) manualModal.classList.remove('has-keyboard');
            manualForm.classList.remove('keyboard-active');
            manualForm.style.paddingBottom = '';
            manualForm.style.scrollPaddingBottom = '';
            manualForm.style.removeProperty('--active-keyboard-height');
            if (!active || !active.matches('input, textarea, select')) {
              document.body.classList.remove('keyboard-is-open');
            }
          }
        }, 160);
      });
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const active = document.activeElement;
        if (active && manualForm && manualForm.contains(active)) {
          updateKeyboardPadding();
          ensureManualFieldVisible(active);
        }
      });
    }

    // 10. Reactive real-time sync event listener
    window.addEventListener('church:sync:almanac', (e) => {
      const item = e.detail?.item;
      const op = e.detail?.op;
      if (!item || !item.date_key) return;
      const dKey = item.date_key;

      // Skip redundant re-render if originated from local save in this window
      if (e.detail?.source === 'local_save') return;

      const lastEdit = localEditTimestamps.get(dKey);
      if (lastEdit && (Date.now() - lastEdit < 10000)) {
        const remoteTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
        if (remoteTime < lastEdit) {
          return;
        }
      }

      const year = item.year || parseInt(dKey.split('-')[0], 10);
      const yStr = String(year);
      let yData = yearDataCache.get(yStr);
      if (!yData) {
        yData = {};
        yearDataCache.set(yStr, yData);
      }
      if (op === 'delete') {
        delete yData[dKey];
      } else {
        let parsed = null;
        if (item.details) {
          try { parsed = typeof item.details === 'string' ? JSON.parse(item.details) : item.details; } catch (_) {}
        }
        yData[dKey] = parsed || {
          dateKey: dKey,
          year: year,
          theme: item.title || item.theme || 'Daily Liturgical Reading',
          color: item.liturgical_color || item.color || 'Green'
        };
      }
      monthDataCache.clear();
      if (activeScreenId === 'screenDetails' && currentDayKey === dKey) {
        renderDailyDetails(currentDayKey);
      } else if (activeScreenId === 'screenDay' && currentYear === year) {
        renderDaySelection(currentYear, currentMonth);
      }
    });
  });

  function refreshCurrentScreen() {
    monthDataCache.clear();
    if (activeScreenId === 'screenDetails' && currentDayKey) {
      renderDailyDetails(currentDayKey);
    } else if (activeScreenId === 'screenDay') {
      renderDaySelection(currentYear, currentMonth);
    } else if (activeScreenId === 'screenMonth') {
      renderMonthSelection(currentYear);
    } else if (activeScreenId === 'screenYear') {
      renderYearSelection();
    }
  }

  function handleBackAction() {
    if (document.getElementById('scriptureModal')?.classList.contains('is-open')) {
      closeScriptureModal();
      return true;
    }
    if (document.getElementById('searchModal')?.classList.contains('is-open')) {
      closeSearchModal();
      return true;
    }
    if (document.getElementById('legendModal')?.classList.contains('is-open')) {
      closeLegendModal();
      return true;
    }
    if (document.getElementById('manualAddModal')?.classList.contains('is-open')) {
      closeManualAddModal();
      return true;
    }
    if (document.getElementById('addYearModal')?.classList.contains('is-open')) {
      closeAddYearModal();
      return true;
    }
    if (document.getElementById('deleteYearModal')?.classList.contains('is-open')) {
      closeDeleteYearModal();
      return true;
    }

    if (isSelectionModeActive) {
      exitSelectionMode();
      return true;
    }

    if (activeScreenId === 'screenDetails') {
      goToDaySelection(false);
      return true;
    }
    if (activeScreenId === 'screenDay') {
      goToMonthSelection(false);
      return true;
    }
    if (activeScreenId === 'screenMonth') {
      goToYearSelection(false);
      return true;
    }
    if (activeScreenId === 'screenYear') {
      return false;
    }

    return false;
  }

  /* ==============================================================================
     14. PUBLIC API
     ============================================================================== */
  window.AlmanacApp = {
    getActiveScreenId: () => activeScreenId,
    getCurrentYear: () => currentYear,
    getCurrentMonth: () => currentMonth,
    getCurrentDayKey: () => currentDayKey,
    renderBreadcrumbs,
    handleBackAction,
    selectYear,
    goToYearSelection,
    selectMonth,
    goToMonthSelection,
    selectDay,
    goToDaySelection,
    prevDay,
    nextDay,
    jumpToToday,
    openSearchModal,
    closeSearchModal,
    openLegendModal,
    closeLegendModal,
    openScriptureModal,
    closeScriptureModal,
    openManualAddModal,
    closeManualAddModal,
    openAddYearModal,
    closeAddYearModal,
    setAddYearInput,
    submitAddYear,
    promptCustomYear,
    openDeleteYearModal,
    closeDeleteYearModal,
    confirmDeleteYear,
    enterSelectionMode,
    exitSelectionMode,
    addReadingRow,
    saveManualDayData,
    copyEntireDayReadings,
    copyTextToClipboard,
    refreshCurrentScreen,
    loadYearData
  };
})();
