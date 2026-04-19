/**
 * Shared UI utilities for Side Panel tabs
 */

export function initializeUI(): void {
  console.log('[SidePanel] Initialized');
}

export function updateConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (!dot || !text) return;
  
  dot.className = 'status-dot ' + status;
  const statusMap = {
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
  };
  text.textContent = statusMap[status] || status;
}

export function renderLogEntry(entry: any): string {
  return `
    <div class="log-entry" style="padding: 8px; border-bottom: 1px solid #333;">
      <div style="display:flex; justify-content:space-between; color:#888; font-size:11px;">
        <span>[${entry.level}]</span>
        <span>${new Date(entry.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style="color:#fff; margin-top:4px;">${entry.method}</div>
      <div style="color:#888; font-size:12px; margin-top:2px;">${JSON.stringify(entry.params)}</div>
      ${entry.result.success === false ? `<div style="color:#f44336; font-size:12px; margin-top:4px;">Error: ${entry.result.error}</div>` : ''}
    </div>
  `;
}
