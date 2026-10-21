/**
 * ============================================================================
 * ALL SAINTS' CHURCH — Master Sync Engine v1 Status Indicator
 * ============================================================================
 * Small, non-blocking "Synced / Offline / Syncing…" status badge.
 * Shown to Super Admin ONLY.
 * Theme: Soft Velvet Purple & Liquid Glassmorphism (unobtrusive & non-blocking).
 * ============================================================================
 */

import { SyncStatus } from './types';
import { SyncEngine } from './SyncEngine';

export class SyncStatusIndicator {
  private static instance: SyncStatusIndicator | null = null;
  private container: HTMLElement | null = null;
  private textEl: HTMLElement | null = null;
  private dotEl: HTMLElement | null = null;
  private unbindEngine: (() => void) | null = null;

  public static mount(): SyncStatusIndicator {
    if (!SyncStatusIndicator.instance) {
      SyncStatusIndicator.instance = new SyncStatusIndicator();
      SyncStatusIndicator.instance.init();
    }
    return SyncStatusIndicator.instance;
  }

  private init(): void {
    if (typeof document === 'undefined') return;

    // Check if already in DOM
    if (document.getElementById('syncEngineStatusIndicator')) {
      this.container = document.getElementById('syncEngineStatusIndicator');
      this.textEl = document.getElementById('syncEngineStatusText');
      this.dotEl = document.getElementById('syncEngineStatusDot');
    } else {
      this.render();
    }

    this.checkVisibility();

    // Listen to SyncEngine status updates
    this.unbindEngine = SyncEngine.getInstance().onStatusChange((status) => {
      this.updateState(status);
    });

    // Recheck visibility on auth session change
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => this.checkVisibility());
      window.addEventListener('church:auth:changed', () => this.checkVisibility());
    }
  }

  private isSuperAdmin(): boolean {
    if (typeof window === 'undefined') return false;
    const session = (window as any).currentAuthSession;
    if (!session) return false;
    const email = (session.email || '').toLowerCase().trim();
    const role = (session.role || '').toLowerCase().trim();
    return email === 'emanualmridha2@gmail.com' || role === 'superadmin';
  }

  public checkVisibility(): void {
    if (!this.container) return;
    if (this.isSuperAdmin()) {
      this.container.style.display = 'inline-flex';
    } else {
      this.container.style.display = 'none';
    }
  }

  private render(): void {
    const el = document.createElement('div');
    el.id = 'syncEngineStatusIndicator';
    el.style.cssText = `
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 10px);
      right: 14px;
      z-index: 9999;
      display: none;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(18, 11, 28, 0.72);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Plus Jakarta Sans', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
      color: rgba(255, 255, 255, 0.88);
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
      transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    `;

    const dot = document.createElement('span');
    dot.id = 'syncEngineStatusDot';
    dot.style.cssText = `
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      display: inline-block;
      transition: background 0.3s ease;
    `;

    const text = document.createElement('span');
    text.id = 'syncEngineStatusText';
    text.textContent = 'Synced';

    el.appendChild(dot);
    el.appendChild(text);

    el.addEventListener('click', () => {
      // Manual on-demand delta pull trigger on click
      SyncEngine.getInstance().pullDelta();
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Re-syncing cloud journal 🔄');
      }
    });

    document.body.appendChild(el);
    this.container = el;
    this.dotEl = dot;
    this.textEl = text;
  }

  public updateState(status: SyncStatus): void {
    if (!this.container || !this.dotEl || !this.textEl) return;
    this.checkVisibility();

    switch (status) {
      case 'synced':
        this.dotEl.style.background = '#10b981'; // Green
        this.dotEl.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.6)';
        this.textEl.textContent = 'Synced';
        this.container.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        break;
      case 'syncing':
        this.dotEl.style.background = '#f59e0b'; // Amber
        this.dotEl.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.6)';
        this.textEl.textContent = 'Syncing…';
        this.container.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        break;
      case 'offline':
        this.dotEl.style.background = '#6b7280'; // Gray
        this.dotEl.style.boxShadow = 'none';
        this.textEl.textContent = 'Offline';
        this.container.style.borderColor = 'rgba(107, 114, 128, 0.3)';
        break;
      case 'error':
        this.dotEl.style.background = '#ef4444'; // Red
        this.dotEl.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
        this.textEl.textContent = 'Sync Error';
        this.container.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        break;
    }
  }

  public destroy(): void {
    if (this.unbindEngine) {
      this.unbindEngine();
      this.unbindEngine = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}

// Auto-mount on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SyncStatusIndicator.mount());
  } else {
    setTimeout(() => SyncStatusIndicator.mount(), 100);
  }
}
