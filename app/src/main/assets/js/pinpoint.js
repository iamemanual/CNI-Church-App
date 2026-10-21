// ==========================================================================
// 🎯 Church Companion — Live Pinpoint, Select & Drag Inspector (v3.5 Mobile-Ready)
// ==========================================================================
// Provides:
// - Seamless mobile touch & desktop mouse support with zero ghost clicks
// - Responsive floating panel & bottom-sheet positioning for phones
// - Touch & pointer drag mobility that never scrolls page or obstructs UI
// - Interception of touchstart/touchend to prevent underlying app navigation in pick mode
// - Real-time finger-following highlight frame with tag name & dimensions
// - DOM hierarchy navigation (⬆️ Parent, ⬇️ Child, ⬅️ Prev, ➡️ Next)
// - Instant live browser preview and rollback
// - Direct dispatch to Termux over localhost and local Wi-Fi
// ==========================================================================

(function() {
  'use strict';

  // Pinpoint feature flag: enabled
  const PINPOINT_ENABLED = true;

  // Cleanup any active Pinpoint inspector DOM nodes
  try {
    const existingRoot = document.getElementById('pinpointRoot');
    if (existingRoot) existingRoot.remove();
    const highlight = document.getElementById('pinpointHighlightOverlay');
    if (highlight) highlight.remove();
    const banner = document.getElementById('pinpointPickBanner');
    if (banner) banner.remove();
    const fab = document.getElementById('pinpointFab');
    if (fab) fab.remove();
    const panel = document.getElementById('pinpointPanel');
    if (panel) panel.remove();
  } catch (_) {}

  if (!PINPOINT_ENABLED) {
    return;
  }

  if (window.__CHURCH_PINPOINT_INITIALIZED__) {
    console.log('[Pinpoint] Already initialized.');
    return;
  }
  window.__CHURCH_PINPOINT_INITIALIZED__ = true;

  let isPicking = false;
  let hoveredEl = null;
  let selectedEl = null;
  let originalStyles = new Map();
  let originalText = null;
  let originalOuterHtml = null;
  let originalInnerHtml = null;
  let activeTab = 'quick'; // 'quick' | 'html'
  let htmlScope = 'outer'; // 'outer' | 'inner'
  let serverWifiIp = null;
  let serverPort = window.location.port || '8181';

  // ------------------------------------------------------------------------
  // 1. INJECT MASTER STYLES (Adaptive Mobile & Desktop)
  // ------------------------------------------------------------------------
  const STYLES = `
    #pinpointRoot {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #f1f5f9;
    }

    /* Draggable Floating Badge Button */
    .pinpoint-fab {
      pointer-events: auto !important;
      position: fixed;
      bottom: calc(var(--safe-area-bottom, 20px) + 90px);
      right: 16px;
      z-index: 2147483647 !important;
      display: flex;
      align-items: center;
      gap: 7px;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      color: #f8fafc;
      padding: 10px 16px;
      border-radius: 9999px;
      border: 2px solid #f59e0b;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.65), 0 0 16px rgba(245, 158, 11, 0.45);
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      font-size: 13px;
      font-weight: 700;
      transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
    }
    .pinpoint-fab:active {
      transform: scale(0.96);
    }
    .pinpoint-fab.dragging {
      transform: scale(1.06);
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.8), 0 0 24px rgba(245, 158, 11, 0.7);
      border-color: #fde047;
    }
    .pinpoint-drag-grip {
      color: #f59e0b;
      font-size: 14px;
      font-weight: 900;
      opacity: 0.85;
      cursor: grab;
      padding-right: 2px;
    }
    .pinpoint-badge {
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 9999px;
      margin-left: 2px;
    }

    /* Active Picking Top Banner */
    .pinpoint-pick-banner {
      pointer-events: auto !important;
      display: none;
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #b45309, #d97706);
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 9999px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(245, 158, 11, 0.6);
      border: 1.5px solid #fef3c7;
      font-weight: 800;
      font-size: 13px;
      z-index: 2147483647 !important;
      align-items: center;
      gap: 12px;
      user-select: none;
      -webkit-user-select: none;
      animation: bannerPulse 1.8s infinite;
    }
    @keyframes bannerPulse {
      0%, 100% { box-shadow: 0 8px 25px rgba(0, 0, 0, 0.7), 0 0 16px rgba(245, 158, 11, 0.5); }
      50% { box-shadow: 0 12px 35px rgba(0, 0, 0, 0.8), 0 0 28px rgba(245, 158, 11, 0.85); }
    }
    .pinpoint-cancel-pick-btn {
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
    }

    /* Floating Inspector Modal Panel */
    .pinpoint-panel {
      pointer-events: auto !important;
      display: none;
      position: fixed;
      bottom: calc(var(--safe-area-bottom, 20px) + 140px);
      right: 18px;
      width: min(440px, calc(100vw - 28px));
      max-height: 80vh;
      background: #0f172a;
      border: 2px solid #f59e0b;
      border-radius: 18px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 158, 11, 0.25);
      overflow: hidden;
      flex-direction: column;
      z-index: 2147483647 !important;
      animation: pinFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes pinFadeIn {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .pinpoint-header {
      background: #020617;
      padding: 12px 16px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: grab;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .pinpoint-header:active {
      cursor: grabbing;
    }
    .pinpoint-title-wrap {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .pinpoint-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #f59e0b;
      letter-spacing: 0.02em;
    }
    .pinpoint-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pinpoint-btn-icon {
      background: transparent;
      border: none;
      color: #94a3b8;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
    }
    .pinpoint-btn-icon:hover {
      background: #1e293b;
      color: #fff;
    }

    /* Wi-Fi banner in panel */
    .pinpoint-wifi-banner {
      background: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 6px 14px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #cbd5e1;
    }
    .pinpoint-wifi-link {
      color: #38bdf8;
      font-family: monospace;
      font-size: 11.5px;
      text-decoration: none;
    }
    .pinpoint-copy-ip-btn {
      background: #334155;
      color: #cbd5e1;
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
      font-weight: 600;
    }

    /* Modal Body */
    .pinpoint-body {
      padding: 14px 16px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      max-height: calc(80vh - 105px);
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: #e2e8f0;
    }

    .pinpoint-pick-toggle {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      border: 1px solid #3b82f6;
      padding: 12px 16px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }
    .pinpoint-pick-toggle:active {
      transform: scale(0.98);
    }

    .pinpoint-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pinpoint-section-label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .pinpoint-hierarchy-bar {
      display: flex;
      gap: 6px;
      background: #090d16;
      padding: 6px;
      border-radius: 8px;
      border: 1px solid #1e293b;
    }
    .pinpoint-nav-btn {
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 6px 4px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .pinpoint-nav-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .pinpoint-selector-display {
      font-family: monospace;
      font-size: 11.5px;
      color: #38bdf8;
      background: #090d16;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      word-break: break-all;
    }

    .pinpoint-current-text {
      font-size: 12px;
      color: #f1f5f9;
      background: #090d16;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      max-height: 65px;
      overflow-y: auto;
      word-break: break-word;
      line-height: 1.4;
    }

    .pinpoint-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .pinpoint-chip {
      background: #334155;
      border: 1px solid #475569;
      color: #cbd5e1;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .pinpoint-chip:hover {
      background: #475569;
      color: #fff;
      border-color: #f59e0b;
    }

    .pinpoint-input {
      width: 100%;
      box-sizing: border-box;
      background: #020617;
      border: 1.5px solid #334155;
      border-radius: 10px;
      color: #f8fafc;
      padding: 10px 12px;
      font-size: 13px;
      resize: vertical;
      min-height: 75px;
      outline: none;
      font-family: inherit;
      line-height: 1.4;
    }
    .pinpoint-input:focus {
      border-color: #f59e0b;
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
    }

    /* Mode Switcher Tabs */
    .pinpoint-mode-tabs {
      display: flex;
      background: #090d16;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      gap: 4px;
    }
    .pinpoint-mode-tab {
      flex: 1;
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .pinpoint-mode-tab:hover {
      color: #f1f5f9;
    }
    .pinpoint-mode-tab.active {
      background: #1e293b;
      color: #f59e0b;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }

    /* HTML Editor Section */
    .pinpoint-html-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pinpoint-html-scope-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #090d16;
      padding: 4px 8px;
      border-radius: 8px;
      border: 1px solid #1e293b;
    }
    .pinpoint-scope-group {
      display: flex;
      gap: 4px;
    }
    .pinpoint-scope-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.12s;
    }
    .pinpoint-scope-btn.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
    }
    .pinpoint-html-badge {
      font-size: 10px;
      color: #64748b;
      font-family: monospace;
    }

    .pinpoint-html-tools-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    .pinpoint-html-tool-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 10.5px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.12s;
    }
    .pinpoint-html-tool-btn:hover {
      background: #334155;
      color: #f59e0b;
    }
    .pinpoint-tag-chip {
      background: #090d16;
      border: 1px solid #1e293b;
      color: #38bdf8;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-family: monospace;
      cursor: pointer;
    }
    .pinpoint-tag-chip:hover {
      border-color: #38bdf8;
      color: #7dd3fc;
    }

    .pinpoint-html-editor {
      width: 100%;
      box-sizing: border-box;
      background: #020617;
      border: 1.5px solid #334155;
      border-radius: 8px;
      color: #38bdf8;
      padding: 10px 12px;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      line-height: 1.5;
      resize: vertical;
      min-height: 140px;
      max-height: 280px;
      outline: none;
      tab-size: 2;
      white-space: pre;
      overflow-wrap: normal;
      overflow-x: auto;
    }
    .pinpoint-html-editor:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }

    /* HTML View Only Mode (Only Show HTML Editor in HTML View) */
    .pinpoint-panel.pinpoint-html-view-only .pinpoint-wifi-banner,
    .pinpoint-panel.pinpoint-html-view-only .pinpoint-mode-tabs,
    .pinpoint-panel.pinpoint-html-view-only #pinpointQuickSection,
    .pinpoint-panel.pinpoint-html-view-only .pinpoint-edits-list {
      display: none !important;
    }
    .pinpoint-panel.pinpoint-html-view-only #pinpointHtmlSection {
      display: flex !important;
    }
    .pinpoint-panel.pinpoint-html-view-only .pinpoint-html-editor {
      min-height: 200px;
      max-height: 420px;
    }
    .pinpoint-panel.pinpoint-html-view-only {
      border-color: #38bdf8;
      box-shadow: 0 16px 45px rgba(0, 0, 0, 0.8), 0 0 25px rgba(56, 189, 248, 0.35);
    }

    .pinpoint-actions {
      display: flex;
      gap: 8px;
    }
    .btn-preview {
      flex: 1;
      background: #475569;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-submit {
      flex: 1.4;
      background: linear-gradient(135deg, #16a34a, #15803d);
      color: white;
      border: none;
      padding: 10px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.35);
    }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .pinpoint-sub-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-copy {
      background: transparent;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 5px 9px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
    }
    .pinpoint-status {
      font-size: 11.5px;
      color: #22c55e;
      font-weight: 700;
    }

    .pinpoint-edits-list {
      border-top: 1px solid #1e293b;
      padding-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pinpoint-edit-item {
      background: #020617;
      padding: 8px 10px;
      border-radius: 8px;
      border-left: 3px solid #f59e0b;
      font-size: 11.5px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    /* Highlight overlay */
    #pinpointHighlightOverlay {
      position: fixed;
      pointer-events: none !important;
      z-index: 2147483646 !important;
      border: 2.5px dashed #f59e0b;
      background: rgba(245, 158, 11, 0.18);
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.5);
      border-radius: 6px;
      display: none;
      transition: all 0.06s ease-out;
    }
    #pinpointHighlightTag {
      pointer-events: none !important;
      position: absolute;
      top: -24px;
      left: 0;
      background: #f59e0b;
      color: #020617;
      font-size: 10.5px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .pinpoint-selected-element {
      outline: 3px solid #38bdf8 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.65) !important;
    }

    /* Responsive Mobile Overrides (< 600px) */
    @media (max-width: 600px) {
      .pinpoint-fab {
        bottom: calc(var(--safe-area-bottom, 16px) + 84px);
        right: 14px;
        padding: 9px 15px;
        font-size: 12.5px;
      }
      .pinpoint-panel {
        bottom: 10px !important;
        left: 8px !important;
        right: 8px !important;
        width: calc(100vw - 16px) !important;
        max-height: 82vh !important;
        border-radius: 16px;
      }
      .pinpoint-body {
        max-height: calc(82vh - 95px) !important;
        padding: 12px !important;
        gap: 10px !important;
      }
      .pinpoint-header {
        padding: 10px 14px !important;
      }
      .pinpoint-title {
        font-size: 12.5px !important;
      }
      .pinpoint-pick-banner {
        width: calc(100vw - 24px);
        max-width: 360px;
        justify-content: space-between;
        font-size: 12px;
        padding: 8px 14px;
        top: 10px;
      }
    }
  `;

  // ------------------------------------------------------------------------
  // 2. INJECT MARKUP
  // ------------------------------------------------------------------------
  const MARKUP = `
    <!-- Highlight overlay -->
    <div id="pinpointHighlightOverlay">
      <div id="pinpointHighlightTag">&lt;div&gt;</div>
    </div>

    <!-- Active Picking Mode Banner -->
    <div id="pinpointPickBanner" class="pinpoint-pick-banner">
      <span>🎯 Tap Any Element to Pinpoint</span>
      <button id="pinpointCancelPickBtn" class="pinpoint-cancel-pick-btn" type="button">✕ Cancel</button>
    </div>

    <!-- Draggable Floating Action Button -->
    <div id="pinpointFab" class="pinpoint-fab" title="Tap to inspect, or drag ⠿ to move">
      <span class="pinpoint-drag-grip">⠿</span>
      <span>🎯 Pinpoint &amp; Edit</span>
      <span id="pinpointCountBadge" class="pinpoint-badge" style="display:none;">0</span>
    </div>

    <!-- Draggable Floating Inspector Panel -->
    <div id="pinpointPanel" class="pinpoint-panel">
      <!-- Drag Header -->
      <div id="pinpointHeader" class="pinpoint-header" title="Drag to move panel">
        <div class="pinpoint-title-wrap">
          <span style="color:#f59e0b; font-size:14px;">⠿</span>
          <div class="pinpoint-title">⛪ Church Companion Inspector</div>
        </div>
        <div class="pinpoint-header-actions">
          <button id="pinpointResetPosBtn" class="pinpoint-btn-icon" type="button" title="Reset position">↺</button>
          <button id="pinpointCloseBtn" class="pinpoint-btn-icon" type="button" title="Close">&times;</button>
        </div>
      </div>

      <!-- Wi-Fi Banner -->
      <div class="pinpoint-wifi-banner">
        <span>📶 Wi-Fi: <a id="pinpointWifiLink" class="pinpoint-wifi-link" href="#" target="_blank">Detecting...</a></span>
        <button id="pinpointCopyIpBtn" class="pinpoint-copy-ip-btn" type="button">Copy URL</button>
      </div>

      <!-- Inspector Body -->
      <div class="pinpoint-body">
        <button id="pinpointPickToggle" class="pinpoint-pick-toggle" type="button">
          <span>🔍 Tap Any Element to Pinpoint</span>
        </button>
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <button id="pinpointQuickBody" class="pinpoint-nav-btn" type="button" style="padding: 7px 8px; font-weight: 700; background: #0f2338; border-color: #0284c7; color: #38bdf8;" title="Select <body>">🏷️ Select &lt;body&gt;</button>
          <button id="pinpointQuickHtml" class="pinpoint-nav-btn" type="button" style="padding: 7px 8px; font-weight: 700; background: #1a162b; border-color: #8b5cf6; color: #c4b5fd;" title="Select <html>">🏷️ Select &lt;html&gt;</button>
        </div>

        <div id="pinpointDetailsCard" class="pinpoint-card" style="display: none;">
          <div class="pinpoint-section-label">
            <span>Selected Element</span>
            <span id="pinpointDimensions" style="font-size: 10px; color: #38bdf8;"></span>
          </div>

          <!-- Hierarchy navigation -->
          <div class="pinpoint-hierarchy-bar" style="flex-wrap: wrap; gap: 4px;">
            <button id="pinpointNavParent" class="pinpoint-nav-btn" type="button">⬆️ Parent</button>
            <button id="pinpointNavChild" class="pinpoint-nav-btn" type="button">⬇️ Child</button>
            <button id="pinpointNavPrev" class="pinpoint-nav-btn" type="button">⬅️ Prev</button>
            <button id="pinpointNavNext" class="pinpoint-nav-btn" type="button">➡️ Next</button>
            <button id="pinpointSelectBody" class="pinpoint-nav-btn" type="button" title="Select <body>">🏷️ &lt;body&gt;</button>
            <button id="pinpointSelectHtml" class="pinpoint-nav-btn" type="button" title="Select <html>">🏷️ &lt;html&gt;</button>
          </div>

          <div id="pinpointSelectorDisplay" class="pinpoint-selector-display"></div>

          <!-- Mode Switcher Tabs -->
          <div class="pinpoint-mode-tabs">
            <button id="pinpointTabQuick" class="pinpoint-mode-tab active" type="button">✏️ Text &amp; Style</button>
            <button id="pinpointTabHtml" class="pinpoint-mode-tab" type="button">📝 Edit HTML</button>
          </div>

          <!-- Tab 1: Text & Style Mode -->
          <div id="pinpointQuickSection" style="display: flex; flex-direction: column; gap: 10px;">
            <div class="pinpoint-section-label">Current Content</div>
            <div id="pinpointCurrentText" class="pinpoint-current-text"></div>

            <!-- Quick chips -->
            <div class="pinpoint-section-label">Quick Suggestions</div>
            <div class="pinpoint-chips-row">
              <button class="pinpoint-chip" type="button" data-prefix="Change text to: ">✏️ Text</button>
              <button class="pinpoint-chip" type="button" data-prefix="Change style: background to #..., color to #...">🎨 Style</button>
              <button class="pinpoint-chip" type="button" data-prefix="Add margin-top: 16px; padding: 12px;">📐 Spacing</button>
              <button class="pinpoint-chip" type="button" data-prefix="Change font size to 18px and make bold">🔤 Font</button>
              <button class="pinpoint-chip" type="button" data-prefix="Hide this element on mobile">👁️ Hide</button>
            </div>

            <div class="pinpoint-section-label">Instruction for AI</div>
            <textarea id="pinpointInstructionInput" class="pinpoint-input" placeholder="Type changes (e.g. 'Make card smaller', 'Change color to gold', 'Add margin')..."></textarea>
          </div>

          <!-- Tab 2: Direct HTML Editor Mode -->
          <div id="pinpointHtmlSection" class="pinpoint-html-section" style="display: none;">
            <div class="pinpoint-html-scope-bar">
              <div class="pinpoint-scope-group">
                <button id="pinpointScopeOuter" class="pinpoint-scope-btn active" type="button" title="Edit entire element tag and contents">outerHTML</button>
                <button id="pinpointScopeInner" class="pinpoint-scope-btn" type="button" title="Edit only inside contents of element">innerHTML</button>
              </div>
              <span id="pinpointHtmlStats" class="pinpoint-html-badge">0 lines, 0 chars</span>
            </div>

            <!-- HTML Quick Snippets & Tools -->
            <div class="pinpoint-html-tools-bar">
              <button id="pinpointBtnFormatHtml" class="pinpoint-html-tool-btn" type="button" title="Auto-format and indent HTML">✨ Format</button>
              <button id="pinpointBtnCopyHtml" class="pinpoint-html-tool-btn" type="button" title="Copy HTML to clipboard">📋 Copy</button>
              <button id="pinpointBtnResetHtml" class="pinpoint-html-tool-btn" type="button" title="Reset to original HTML">↺ Reset</button>
              <span style="border-left: 1px solid #334155; height: 14px; margin: 0 2px;"></span>
              <button class="pinpoint-tag-chip" type="button" data-insert="&lt;span class=&quot;&quot;&gt;&lt;/span&gt;">&lt;span&gt;</button>
              <button class="pinpoint-tag-chip" type="button" data-insert="&lt;div class=&quot;&quot;&gt;&lt;/div&gt;">&lt;div&gt;</button>
              <button class="pinpoint-tag-chip" type="button" data-insert="&lt;strong&gt;&lt;/strong&gt;">&lt;strong&gt;</button>
              <button class="pinpoint-tag-chip" type="button" data-insert="&lt;p&gt;&lt;/p&gt;">&lt;p&gt;</button>
              <button class="pinpoint-tag-chip" type="button" data-insert="class=&quot;&quot;">class</button>
              <button class="pinpoint-tag-chip" type="button" data-insert="style=&quot;&quot;">style</button>
            </div>

            <textarea id="pinpointHtmlEditor" class="pinpoint-html-editor" spellcheck="false" autocapitalize="none" autocomplete="off" placeholder="Edit HTML source here..."></textarea>
          </div>

          <div class="pinpoint-actions">
            <button id="pinpointBtnPreview" class="btn-preview" type="button">👁️ Test Live</button>
            <button id="pinpointBtnSubmit" class="btn-submit" type="button">🚀 Send to Termux</button>
          </div>

          <div class="pinpoint-sub-actions">
            <button id="pinpointBtnCopy" class="btn-copy" type="button">📋 Copy Command</button>
            <button id="pinpointBtnRevert" class="btn-copy" type="button" style="display:none;">↩️ Revert</button>
            <span id="pinpointStatusMsg" class="pinpoint-status"></span>
          </div>
        </div>

        <!-- Pending Edits Queue -->
        <div class="pinpoint-edits-list">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="pinpoint-section-label">Pending Edits in Queue</span>
            <button id="pinpointClearAllBtn" type="button" style="background:none; border:none; color:#ef4444; font-size:11px; font-weight:700; cursor:pointer;">Clear All</button>
          </div>
          <div id="pinpointRecentList" style="max-height: 130px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
            <span style="color:#64748b; font-size:11px; font-style:italic;">No edits recorded yet. Tap any element above.</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Insert into document
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.id = 'pinpointRoot';
  wrapper.innerHTML = MARKUP;
  document.body.appendChild(wrapper);

  // References
  const fab = document.getElementById('pinpointFab');
  const panel = document.getElementById('pinpointPanel');
  const header = document.getElementById('pinpointHeader');
  const closeBtn = document.getElementById('pinpointCloseBtn');
  const resetPosBtn = document.getElementById('pinpointResetPosBtn');
  const pickToggle = document.getElementById('pinpointPickToggle');
  const pickBanner = document.getElementById('pinpointPickBanner');
  const cancelPickBtn = document.getElementById('pinpointCancelPickBtn');
  const detailsCard = document.getElementById('pinpointDetailsCard');
  const selectorDisplay = document.getElementById('pinpointSelectorDisplay');
  const currentText = document.getElementById('pinpointCurrentText');
  const dimensionsDisplay = document.getElementById('pinpointDimensions');
  const instructionInput = document.getElementById('pinpointInstructionInput');
  const tabQuick = document.getElementById('pinpointTabQuick');
  const tabHtml = document.getElementById('pinpointTabHtml');
  const quickSection = document.getElementById('pinpointQuickSection');
  const htmlSection = document.getElementById('pinpointHtmlSection');
  const scopeOuter = document.getElementById('pinpointScopeOuter');
  const scopeInner = document.getElementById('pinpointScopeInner');
  const htmlStats = document.getElementById('pinpointHtmlStats');
  const btnFormatHtml = document.getElementById('pinpointBtnFormatHtml');
  const btnCopyHtml = document.getElementById('pinpointBtnCopyHtml');
  const btnResetHtml = document.getElementById('pinpointBtnResetHtml');
  const htmlEditor = document.getElementById('pinpointHtmlEditor');
  const btnPreview = document.getElementById('pinpointBtnPreview');
  const btnSubmit = document.getElementById('pinpointBtnSubmit');
  const btnCopy = document.getElementById('pinpointBtnCopy');
  const btnRevert = document.getElementById('pinpointBtnRevert');
  const statusMsg = document.getElementById('pinpointStatusMsg');
  const recentList = document.getElementById('pinpointRecentList');
  const badge = document.getElementById('pinpointCountBadge');
  const clearAllBtn = document.getElementById('pinpointClearAllBtn');
  const highlightOverlay = document.getElementById('pinpointHighlightOverlay');
  const highlightTag = document.getElementById('pinpointHighlightTag');
  const wifiLink = document.getElementById('pinpointWifiLink');
  const copyIpBtn = document.getElementById('pinpointCopyIpBtn');

  const navParent = document.getElementById('pinpointNavParent');
  const navChild = document.getElementById('pinpointNavChild');
  const navPrev = document.getElementById('pinpointNavPrev');
  const navNext = document.getElementById('pinpointNavNext');
  const selectBodyBtn = document.getElementById('pinpointSelectBody');
  const selectHtmlBtn = document.getElementById('pinpointSelectHtml');
  const quickBodyBtn = document.getElementById('pinpointQuickBody');
  const quickHtmlBtn = document.getElementById('pinpointQuickHtml');

  // ------------------------------------------------------------------------
  // 3. RELIABLE DRAGGING & TAP ENGINE (No Ghost Clicks on Mobile)
  // ------------------------------------------------------------------------
  function makeDraggable(element, handle, storageKey, onTap) {
    let startX = 0, startY = 0;
    let initLeft = 0, initTop = 0;
    let isDown = false;
    let hasMoved = false;
    let startTime = 0;
    let lastTapTimestamp = 0;

    function restorePosition() {
      // On narrow mobile screens, let CSS handle default position unless explicitly valid
      if (window.innerWidth <= 600 && element === panel) {
        element.style.left = '';
        element.style.top = '';
        element.style.right = '';
        element.style.bottom = '';
        return;
      }

      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const pos = JSON.parse(saved);
          if (typeof pos.left === 'number' && typeof pos.top === 'number') {
            const elW = element.offsetWidth || 180;
            const elH = element.offsetHeight || 50;
            const maxL = Math.max(10, window.innerWidth - elW - 10);
            const maxT = Math.max(10, window.innerHeight - elH - 10);

            if (pos.left >= 0 && pos.left <= maxL && pos.top >= 0 && pos.top <= maxT) {
              element.style.left = pos.left + 'px';
              element.style.top = pos.top + 'px';
              element.style.right = 'auto';
              element.style.bottom = 'auto';
            } else {
              localStorage.removeItem(storageKey);
              element.style.left = '';
              element.style.top = '';
              element.style.right = '';
              element.style.bottom = '';
            }
          }
        }
      } catch(e) {}
    }

    restorePosition();
    window.addEventListener('resize', restorePosition);

    function onDown(e) {
      // Don't drag if tapping interactive buttons inside the handle
      if (e.target && e.target.closest('button, a, input, textarea') && e.target !== handle) {
        return;
      }

      // Ignore synthetic mousedown after touch
      if (e.type === 'mousedown' && Date.now() - lastTapTimestamp < 650) {
        return;
      }

      isDown = true;
      hasMoved = false;
      startTime = Date.now();

      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;

      const rect = element.getBoundingClientRect();
      initLeft = rect.left;
      initTop = rect.top;

      if (e.type === 'touchstart') {
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp, { passive: false });
        window.addEventListener('touchcancel', onUp, { passive: false });
      } else {
        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
      }
    }

    function onMove(e) {
      if (!isDown) return;
      const point = e.touches ? e.touches[0] : e;
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;
      const dist = Math.hypot(dx, dy);

      if (dist > 8) {
        hasMoved = true;
        element.classList.add('dragging');
        if (e.cancelable) e.preventDefault();

        const elW = element.offsetWidth || 180;
        const elH = element.offsetHeight || 50;
        const maxL = Math.max(10, window.innerWidth - elW - 10);
        const maxT = Math.max(10, window.innerHeight - elH - 10);
        const newL = Math.min(Math.max(10, initLeft + dx), maxL);
        const newT = Math.min(Math.max(10, initTop + dy), maxT);

        element.style.left = newL + 'px';
        element.style.top = newT + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
      }
    }

    function onUp(e) {
      if (!isDown) return;
      isDown = false;
      element.classList.remove('dragging');

      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);

      const elapsed = Date.now() - startTime;
      if (hasMoved) {
        const rect = element.getBoundingClientRect();
        try {
          localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));
        } catch(e) {}
      } else if (onTap && elapsed < 500) {
        lastTapTimestamp = Date.now();
        if (e.cancelable) e.preventDefault();
        onTap();
      }
    }

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
  }

  // Bind draggable FAB with tap handler
  makeDraggable(fab, fab, 'pinpoint_fab_pos_v3', () => {
    togglePanel();
  });

  // Bind draggable Panel Header
  makeDraggable(panel, header, 'pinpoint_panel_pos_v3', null);

  function resetPositions() {
    localStorage.removeItem('pinpoint_fab_pos_v3');
    localStorage.removeItem('pinpoint_panel_pos_v3');
    fab.style.left = '';
    fab.style.top = '';
    fab.style.right = '';
    fab.style.bottom = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
  }

  resetPosBtn.addEventListener('click', resetPositions);
  resetPosBtn.addEventListener('touchend', (e) => {
    if (e.cancelable) e.preventDefault();
    resetPositions();
  });

  // ------------------------------------------------------------------------
  // 4. SELECTOR & HIGHLIGHT LOGIC
  // ------------------------------------------------------------------------
  function getUniqueSelector(el) {
    if (!el) return '';
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'body';
    if (el.id) return '#' + el.id;

    let path = [];
    let curr = el;
    while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.body && curr !== document.documentElement) {
      if (curr.id) {
        path.unshift('#' + curr.id);
        break;
      }
      let selector = curr.nodeName.toLowerCase();
      if (curr.classList && curr.classList.length > 0) {
        const meaningful = Array.from(curr.classList).filter(c => !c.startsWith('pinpoint-'));
        if (meaningful.length > 0) {
          selector += '.' + meaningful.slice(0, 2).join('.');
        }
      }
      let sibling = curr;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName === curr.nodeName) nth++;
      }
      if (nth > 1) selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      curr = curr.parentNode;
    }
    return path.join(' > ');
  }

  function updateHighlight(el) {
    if (!el || el.closest('#pinpointRoot')) {
      highlightOverlay.style.display = 'none';
      return;
    }
    const rect = el.getBoundingClientRect();
    highlightOverlay.style.display = 'block';
    if (el === document.documentElement) {
      highlightOverlay.style.top = '0px';
      highlightOverlay.style.left = '0px';
      highlightOverlay.style.width = window.innerWidth + 'px';
      highlightOverlay.style.height = window.innerHeight + 'px';
    } else {
      highlightOverlay.style.top = rect.top + 'px';
      highlightOverlay.style.left = rect.left + 'px';
      highlightOverlay.style.width = rect.width + 'px';
      highlightOverlay.style.height = rect.height + 'px';
    }

    const tag = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const w = el === document.documentElement ? window.innerWidth : Math.round(rect.width);
    const h = el === document.documentElement ? window.innerHeight : Math.round(rect.height);
    highlightTag.textContent = `<${tag}${id}> (${w}×${h})`;
  }

  // ------------------------------------------------------------------------
  // 5. SELECTION & PANEL CONTROL
  // ------------------------------------------------------------------------
  function togglePanel(open) {
    const isShowing = panel.style.display === 'flex';
    const shouldOpen = open !== undefined ? open : !isShowing;
    panel.style.display = shouldOpen ? 'flex' : 'none';
    if (!shouldOpen && isPicking) {
      stopPicking();
    }
  }

  function startPicking() {
    isPicking = true;
    panel.style.display = 'none';
    pickBanner.style.display = 'flex';
    document.body.style.cursor = 'crosshair';
  }

  function stopPicking() {
    isPicking = false;
    pickBanner.style.display = 'none';
    highlightOverlay.style.display = 'none';
    document.body.style.cursor = '';
    hoveredEl = null;
  }

  function selectElement(el) {
    if (!el || el.closest('#pinpointRoot')) return;

    if (selectedEl) {
      selectedEl.classList.remove('pinpoint-selected-element');
    }
    selectedEl = el;
    selectedEl.classList.add('pinpoint-selected-element');

    if (navigator.vibrate) try { navigator.vibrate(35); } catch(e) {}

    const selector = getUniqueSelector(el);
    const rect = el.getBoundingClientRect();
    const text = el.innerText ? el.innerText.trim() : (el.value || el.alt || el.title || '<No direct text>');

    selectorDisplay.textContent = selector;
    currentText.textContent = text.length > 150 ? text.slice(0, 150) + '...' : text;
    dimensionsDisplay.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;

    // Cache original state
    originalStyles.clear();
    originalStyles.set('backgroundColor', el.style.backgroundColor);
    originalStyles.set('color', el.style.color);
    originalStyles.set('fontSize', el.style.fontSize);
    originalStyles.set('display', el.style.display);
    originalStyles.set('opacity', el.style.opacity);
    originalText = el.innerText;
    originalOuterHtml = el.outerHTML;
    originalInnerHtml = el.innerHTML;
    updateHtmlEditorContent();

    detailsCard.style.display = 'flex';
    statusMsg.textContent = '';
    btnRevert.style.display = 'none';

    updateHierarchyNav();
    stopPicking();
    togglePanel(true);

    // On desktop, auto-focus input. On mobile touch, don't force keyboard jump
    if (!('ontouchstart' in window) && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      setTimeout(() => { try { instructionInput.focus(); } catch(e) {} }, 100);
    }
  }

  function updateHierarchyNav() {
    if (!selectedEl) return;
    navParent.disabled = !selectedEl.parentElement;
    navChild.disabled = !selectedEl.firstElementChild;
    navPrev.disabled = !selectedEl.previousElementSibling;
    navNext.disabled = !selectedEl.nextElementSibling;
  }

  // Hierarchy Navigation
  navParent.addEventListener('click', () => {
    if (selectedEl && selectedEl.parentElement) {
      selectElement(selectedEl.parentElement);
    }
  });
  navChild.addEventListener('click', () => {
    if (selectedEl && selectedEl.firstElementChild) {
      selectElement(selectedEl.firstElementChild);
    }
  });
  navPrev.addEventListener('click', () => {
    if (selectedEl && selectedEl.previousElementSibling) {
      selectElement(selectedEl.previousElementSibling);
    }
  });
  navNext.addEventListener('click', () => {
    if (selectedEl && selectedEl.nextElementSibling) {
      selectElement(selectedEl.nextElementSibling);
    }
  });

  if (selectBodyBtn) {
    selectBodyBtn.addEventListener('click', () => selectElement(document.body));
  }
  if (selectHtmlBtn) {
    selectHtmlBtn.addEventListener('click', () => selectElement(document.documentElement));
  }
  if (quickBodyBtn) {
    quickBodyBtn.addEventListener('click', () => selectElement(document.body));
  }
  if (quickHtmlBtn) {
    quickHtmlBtn.addEventListener('click', () => selectElement(document.documentElement));
  }

  // Quick Chips
  document.querySelectorAll('.pinpoint-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      instructionInput.value = chip.getAttribute('data-prefix');
      instructionInput.focus();
    });
  });

  // ------------------------------------------------------------------------
  // HTML EDITOR ENGINE & HELPERS
  // ------------------------------------------------------------------------
  function formatHtml(html) {
    if (!html) return '';
    var tab = '  ';
    var formatted = '';
    var indent = 0;
    var clean = html.replace(/>\s*</g, '><').trim();
    var parts = clean.split(/(<[^>]+>)/g).filter(Boolean);
    parts.forEach(function (part) {
      if (part.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        formatted += '\n' + tab.repeat(indent) + part;
      } else if (part.startsWith('<') && !part.endsWith('/>') && !isVoidTag(part) && !part.startsWith('<!')) {
        formatted += (formatted ? '\n' : '') + tab.repeat(indent) + part;
        indent++;
      } else if (part.startsWith('<')) {
        formatted += (formatted ? '\n' : '') + tab.repeat(indent) + part;
      } else {
        var text = part.trim();
        if (text) {
          formatted += (formatted && formatted.endsWith('>') ? '\n' + tab.repeat(indent) : '') + text;
        }
      }
    });
    return formatted || html;
  }

  function isVoidTag(tag) {
    return /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(tag);
  }

  function insertAtCursor(textarea, text) {
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }

  function updateHtmlStats() {
    if (!htmlStats || !htmlEditor) return;
    const val = htmlEditor.value || '';
    const lines = val ? val.split('\n').length : 0;
    const chars = val ? val.length : 0;
    htmlStats.textContent = `${lines} lines, ${chars} chars`;
  }

  function updateHtmlEditorContent() {
    if (!selectedEl || !htmlEditor) return;
    const content = htmlScope === 'outer' ? (selectedEl.outerHTML || '') : (selectedEl.innerHTML || '');
    htmlEditor.value = formatHtml(content);
    updateHtmlStats();
  }

  // Mode Switcher (Quick Text & Style vs Direct HTML)
  if (tabQuick && tabHtml) {
    tabQuick.addEventListener('click', () => switchTab('quick'));
    tabHtml.addEventListener('click', () => switchTab('html'));
  }

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'quick') {
      tabQuick.classList.add('active');
      tabHtml.classList.remove('active');
      if (quickSection) quickSection.style.display = 'flex';
      if (htmlSection) htmlSection.style.display = 'none';
      if (btnPreview) btnPreview.textContent = '👁️ Test Live';
    } else {
      tabHtml.classList.add('active');
      tabQuick.classList.remove('active');
      if (quickSection) quickSection.style.display = 'none';
      if (htmlSection) htmlSection.style.display = 'flex';
      if (btnPreview) btnPreview.textContent = '👁️ Test HTML Live';
      updateHtmlEditorContent();
    }
  }

  // HTML Scope Controls (outerHTML vs innerHTML)
  if (scopeOuter && scopeInner) {
    scopeOuter.addEventListener('click', () => setHtmlScope('outer'));
    scopeInner.addEventListener('click', () => setHtmlScope('inner'));
  }

  function setHtmlScope(scope) {
    htmlScope = scope;
    if (scope === 'outer') {
      scopeOuter.classList.add('active');
      scopeInner.classList.remove('active');
    } else {
      scopeInner.classList.add('active');
      scopeOuter.classList.remove('active');
    }
    updateHtmlEditorContent();
  }

  // HTML Tools: Format, Copy, Reset
  if (btnFormatHtml) {
    btnFormatHtml.addEventListener('click', () => {
      if (!htmlEditor) return;
      htmlEditor.value = formatHtml(htmlEditor.value);
      updateHtmlStats();
    });
  }

  if (btnCopyHtml) {
    btnCopyHtml.addEventListener('click', () => {
      if (!htmlEditor) return;
      navigator.clipboard.writeText(htmlEditor.value).then(() => {
        statusMsg.textContent = '📋 HTML Copied!';
        setTimeout(() => { if (statusMsg.textContent === '📋 HTML Copied!') statusMsg.textContent = ''; }, 2000);
      });
    });
  }

  if (btnResetHtml) {
    btnResetHtml.addEventListener('click', () => {
      if (!selectedEl) return;
      const original = htmlScope === 'outer' ? originalOuterHtml : originalInnerHtml;
      htmlEditor.value = formatHtml(original || '');
      updateHtmlStats();
    });
  }

  // Tag Chips insertion
  document.querySelectorAll('.pinpoint-tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!htmlEditor) return;
      const snippet = chip.getAttribute('data-insert') || '';
      insertAtCursor(htmlEditor, snippet);
      updateHtmlStats();
    });
  });

  if (htmlEditor) {
    htmlEditor.addEventListener('input', updateHtmlStats);
    htmlEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        insertAtCursor(htmlEditor, '  ');
        updateHtmlStats();
      }
    });
  }

  // Panel Control Buttons
  closeBtn.addEventListener('click', () => togglePanel(false));
  closeBtn.addEventListener('touchend', (e) => {
    if (e.cancelable) e.preventDefault();
    togglePanel(false);
  });

  pickToggle.addEventListener('click', () => startPicking());
  pickToggle.addEventListener('touchend', (e) => {
    if (e.cancelable) e.preventDefault();
    startPicking();
  });

  cancelPickBtn.addEventListener('click', () => stopPicking());
  cancelPickBtn.addEventListener('touchend', (e) => {
    if (e.cancelable) e.preventDefault();
    stopPicking();
  });

  // ------------------------------------------------------------------------
  // 6. EVENT INTERCEPTION (Universal Mobile Touch & Desktop Mouse Picking)
  // ------------------------------------------------------------------------
  let pickTouchStartX = 0;
  let pickTouchStartY = 0;
  let pickTouchMoved = false;

  // Touch Picking on Mobile (Capture Phase to prevent app navigation/clicks)
  function handlePickTouchStart(e) {
    if (!isPicking) return;
    if (e.target && e.target.closest('#pinpointRoot')) return;

    // Intercept event before app components (cards, song view, tabs) react
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (e.touches && e.touches[0]) {
      pickTouchStartX = e.touches[0].clientX;
      pickTouchStartY = e.touches[0].clientY;
      pickTouchMoved = false;

      const target = document.elementFromPoint(pickTouchStartX, pickTouchStartY);
      if (target && !target.closest('#pinpointRoot')) {
        hoveredEl = target;
        updateHighlight(target);
      }
    }
  }

  function handlePickTouchMove(e) {
    if (!isPicking) return;
    if (e.target && e.target.closest('#pinpointRoot')) return;

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (e.touches && e.touches[0]) {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (Math.hypot(x - pickTouchStartX, y - pickTouchStartY) > 8) {
        pickTouchMoved = true;
      }
      const target = document.elementFromPoint(x, y);
      if (target && !target.closest('#pinpointRoot')) {
        hoveredEl = target;
        updateHighlight(target);
      }
    }
  }

  function handlePickTouchEnd(e) {
    if (!isPicking) return;
    if (e.target && e.target.closest('#pinpointRoot')) return;

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    let x = pickTouchStartX;
    let y = pickTouchStartY;
    if (e.changedTouches && e.changedTouches[0]) {
      x = e.changedTouches[0].clientX;
      y = e.changedTouches[0].clientY;
    }

    if (highlightOverlay) highlightOverlay.style.display = 'none';

    const target = document.elementFromPoint(x, y);
    if (target && !target.closest('#pinpointRoot')) {
      selectElement(target);
    } else if (hoveredEl && !hoveredEl.closest('#pinpointRoot')) {
      selectElement(hoveredEl);
    }
  }

  window.addEventListener('touchstart', handlePickTouchStart, { capture: true, passive: false });
  window.addEventListener('touchmove', handlePickTouchMove, { capture: true, passive: false });
  window.addEventListener('touchend', handlePickTouchEnd, { capture: true, passive: false });

  // Mouse Picking on Desktop
  window.addEventListener('click', (e) => {
    if (!isPicking) return;
    if (e.target && e.target.closest('#pinpointRoot')) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    selectElement(e.target);
  }, true);

  window.addEventListener('pointerdown', (e) => {
    if (!isPicking) return;
    if (e.target && e.target.closest('#pinpointRoot')) return;
    e.stopPropagation();
  }, true);

  window.addEventListener('pointermove', (e) => {
    if (!isPicking) return;
    if (e.pointerType === 'mouse') {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target && !target.closest('#pinpointRoot')) {
        hoveredEl = target;
        updateHighlight(target);
      }
    }
  }, { passive: true });

  // ------------------------------------------------------------------------
  // 7. LIVE PREVIEW ENGINE
  // ------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function applyHtmlLivePreview() {
    if (!selectedEl || !htmlEditor) return;
    const newHtml = htmlEditor.value.trim();
    if (!newHtml) {
      alert('Please enter HTML code to test.');
      return;
    }

    try {
      if (htmlScope === 'outer') {
        if (selectedEl === document.documentElement || selectedEl === document.body) {
          const temp = document.createElement('div');
          temp.innerHTML = newHtml;
          const newEl = temp.firstElementChild;
          if (newEl) {
            Array.from(newEl.attributes).forEach(attr => {
              selectedEl.setAttribute(attr.name, attr.value);
            });
            selectedEl.innerHTML = newEl.innerHTML;
          } else {
            selectedEl.innerHTML = newHtml;
          }
          updateHighlight(selectedEl);
        } else {
          const temp = document.createElement('div');
          temp.innerHTML = newHtml;
          const newEl = temp.firstElementChild;
          if (!newEl) {
            alert('Invalid HTML markup: outerHTML requires a valid root element tag.');
            return;
          }
          selectedEl.replaceWith(newEl);
          selectedEl = newEl;
          selectedEl.classList.add('pinpoint-selected-element');
          updateHighlight(selectedEl);
        }
      } else {
        selectedEl.innerHTML = newHtml;
        updateHighlight(selectedEl);
      }

      btnRevert.style.display = 'inline-block';
      statusMsg.textContent = '✓ HTML applied live!';
      setTimeout(() => { if (statusMsg.textContent === '✓ HTML applied live!') statusMsg.textContent = ''; }, 3000);
    } catch (e) {
      alert('Error testing HTML live: ' + e.message);
    }
  }

  btnPreview.addEventListener('click', () => {
    if (!selectedEl) return;

    if (activeTab === 'html') {
      applyHtmlLivePreview();
      return;
    }

    const instruction = instructionInput.value.trim();
    if (!instruction) {
      alert('Please enter an instruction or select a quick suggestion.');
      return;
    }

    const lower = instruction.toLowerCase();
    if (lower.startsWith('change text to:') || lower.startsWith('change text to')) {
      const newText = instruction.replace(/^change text to:?\s*/i, '').replace(/^["']|["']$/g, '');
      selectedEl.innerText = newText;
    } else if (lower.includes('gold') || lower.includes('#f59e0b')) {
      selectedEl.style.color = '#f59e0b';
    } else if (lower.includes('maroon') || lower.includes('#800000')) {
      selectedEl.style.color = '#800000';
    } else if (lower.startsWith('hide') || lower.includes('remove') || lower.includes('display: none')) {
      selectedEl.style.opacity = '0.25';
      selectedEl.style.textDecoration = 'line-through';
    } else if (lower.includes('margin') || lower.includes('padding')) {
      selectedEl.style.margin = '16px';
      selectedEl.style.padding = '12px';
    } else {
      selectedEl.style.outline = '3px solid #22c55e';
    }

    btnRevert.style.display = 'inline-block';
    statusMsg.textContent = 'Preview updated!';
    setTimeout(() => { if (statusMsg.textContent === 'Preview updated!') statusMsg.textContent = ''; }, 3000);
  });

  btnRevert.addEventListener('click', () => {
    if (!selectedEl) return;
    if (selectedEl === document.documentElement || selectedEl === document.body) {
      if (originalInnerHtml !== null) selectedEl.innerHTML = originalInnerHtml;
    } else if (originalOuterHtml !== null && selectedEl.parentElement) {
      try {
        const temp = document.createElement('div');
        temp.innerHTML = originalOuterHtml;
        const restored = temp.firstElementChild;
        if (restored) {
          selectedEl.replaceWith(restored);
          selectedEl = restored;
          selectedEl.classList.add('pinpoint-selected-element');
          updateHighlight(selectedEl);
        }
      } catch (_) {}
    }
    if (originalText !== null && selectedEl !== document.documentElement && selectedEl !== document.body) {
      selectedEl.innerText = originalText;
    }
    originalStyles.forEach((val, prop) => {
      selectedEl.style[prop] = val;
    });
    updateHtmlEditorContent();
    btnRevert.style.display = 'none';
    statusMsg.textContent = 'Preview reverted.';
    setTimeout(() => { if (statusMsg.textContent === 'Preview reverted.') statusMsg.textContent = ''; }, 2000);
  });

  // ------------------------------------------------------------------------
  // 8. SEND TO TERMUX API
  // ------------------------------------------------------------------------
  btnSubmit.addEventListener('click', async () => {
    if (!selectedEl) return;
    const isHtmlMode = activeTab === 'html';
    const htmlValue = htmlEditor ? htmlEditor.value.trim() : '';
    const hasHtmlChanged = isHtmlMode || (originalOuterHtml && htmlValue && htmlValue !== formatHtml(originalOuterHtml) && htmlValue !== formatHtml(originalInnerHtml));
    
    let instruction = instructionInput.value.trim();
    if (hasHtmlChanged && !instruction) {
      instruction = `Replace ${htmlScope === 'outer' ? 'outerHTML' : 'innerHTML'} of ${getUniqueSelector(selectedEl)} with:\n${htmlValue}`;
    }

    if (!instruction && !hasHtmlChanged) {
      alert('Please specify your edit instruction or modify the HTML.');
      return;
    }

    const payload = {
      selector: getUniqueSelector(selectedEl),
      tagName: selectedEl.tagName,
      idAttr: selectedEl.id || null,
      className: selectedEl.className || null,
      innerText: selectedEl.innerText ? selectedEl.innerText.trim().slice(0, 160) : '',
      instruction: instruction,
      isHtmlEdit: hasHtmlChanged,
      htmlScope: hasHtmlChanged ? htmlScope : null,
      html: hasHtmlChanged ? htmlValue : null,
      originalHtml: hasHtmlChanged ? (htmlScope === 'outer' ? originalOuterHtml : originalInnerHtml) : null,
      pageUrl: window.location.pathname || '/',
      timestamp: new Date().toLocaleString()
    };

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Submitting...';

    try {
      const res = await fetch('/api/edits/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        statusMsg.textContent = hasHtmlChanged ? '🚀 HTML dispatched to Termux!' : '🚀 Dispatched to Termux!';
        instructionInput.value = '';
        if (navigator.vibrate) try { navigator.vibrate([40, 60, 40]); } catch(e) {}
        fetchPendingEdits();
        setTimeout(() => { statusMsg.textContent = ''; }, 3500);
      } else {
        alert('Server error: ' + (data.error || 'Failed to submit'));
      }
    } catch(err) {
      alert('Network error connecting to local server: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '🚀 Send to Termux';
    }
  });

  btnCopy.addEventListener('click', () => {
    if (!selectedEl) return;
    const selector = getUniqueSelector(selectedEl);
    let cmd = '';
    if (activeTab === 'html') {
      const htmlValue = htmlEditor ? htmlEditor.value.trim() : '';
      cmd = `Target: ${selector} (${htmlScope === 'outer' ? 'outerHTML' : 'innerHTML'})\nHTML:\n${htmlValue}`;
    } else {
      const instruction = instructionInput.value.trim();
      cmd = `Target: ${selector}\nInstruction: ${instruction}`;
    }
    navigator.clipboard.writeText(cmd).then(() => {
      statusMsg.textContent = '📋 Copied!';
      setTimeout(() => { statusMsg.textContent = ''; }, 2000);
    });
  });

  // ------------------------------------------------------------------------
  // 9. QUEUE FETCH & SERVER STATUS
  // ------------------------------------------------------------------------
  async function fetchPendingEdits() {
    try {
      const res = await fetch('/api/edits/pending');
      const data = await res.json();
      const edits = data.edits || [];

      if (edits.length > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = edits.length;
        recentList.innerHTML = edits.map((item, i) => `
          <div class="pinpoint-edit-item">
            <div style="font-weight:700; color:#38bdf8; display:flex; justify-content:space-between; align-items:center;">
              <span>#${i + 1} ${escapeHtml(item.selector)}</span>
              ${item.isHtmlEdit ? '<span style="background:#0284c7; color:#fff; font-size:9px; padding:1px 5px; border-radius:3px;">HTML (' + (item.htmlScope || 'outer') + ')</span>' : ''}
            </div>
            <div style="color:#e2e8f0; font-size:11.5px; max-height:48px; overflow:hidden; text-overflow:ellipsis; white-space:pre-line;">${escapeHtml(item.instruction)}</div>
            <div style="color:#64748b; font-size:10px;">${escapeHtml(item.timestamp || '')}</div>
          </div>
        `).join('');
      } else {
        badge.style.display = 'none';
        recentList.innerHTML = '<span style="color:#64748b; font-size:11px; font-style:italic;">No edits recorded yet. Tap any element above.</span>';
      }
    } catch(e) {}
  }

  clearAllBtn.addEventListener('click', async () => {
    if (!confirm('Clear all pending edits from Termux queue?')) return;
    try {
      await fetch('/api/edits/clear', { method: 'POST' });
      fetchPendingEdits();
    } catch(e) {}
  });

  async function fetchServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data && data.wifiIp) {
        serverWifiIp = data.wifiIp;
        serverPort = data.port || serverPort;
        const netUrl = `http://${serverWifiIp}:${serverPort}`;
        wifiLink.textContent = netUrl;
        wifiLink.href = netUrl;
      } else {
        wifiLink.textContent = window.location.origin;
        wifiLink.href = window.location.origin;
      }
    } catch(e) {
      wifiLink.textContent = window.location.origin;
      wifiLink.href = window.location.origin;
    }
  }

  copyIpBtn.addEventListener('click', () => {
    const url = wifiLink.href || window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      copyIpBtn.textContent = 'Copied!';
      setTimeout(() => { copyIpBtn.textContent = 'Copy URL'; }, 2000);
    });
  });

  // ------------------------------------------------------------------------
  // 10. INITIALIZATION
  // ------------------------------------------------------------------------
  fetchServerStatus();
  fetchPendingEdits();
  setInterval(fetchPendingEdits, 4000);

  window.ChurchPinpoint = {
    start: startPicking,
    stop: stopPicking,
    toggle: togglePanel,
    select: selectElement
  };
})();
