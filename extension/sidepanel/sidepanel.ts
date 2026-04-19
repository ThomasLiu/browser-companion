/**
 * Side Panel 主逻辑
 */

import { initializeUI, updateConnectionStatus } from './tabs/shared.ts';

// 初始化 UI
document.addEventListener('DOMContentLoaded', () => {
  initializeUI();
  
  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'connection_status') {
      updateConnectionStatus(message.status);
    }
  });
  
  // Tab 切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = (tab as HTMLElement).dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });
});

function switchTab(tabId: string): void {
  // 更新 tab 样式
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabId}"]`)?.classList.add('active');
  
  // 更新内容显示
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
}
