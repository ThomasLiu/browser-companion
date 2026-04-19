/**
 * Background Service Worker
 * 
 * 职责:
 * 1. 连接 AI Agent 的 WebSocket Server (ws://localhost:9223)
 * 2. 接收 AI Agent 的 JSON-RPC 命令
 * 3. 转发给 CDP (Chrome DevTools Protocol)
 * 4. 返回结果给 AI Agent
 */

import { WebSocketClient } from './lib/ws-client';
import { CdpClient } from './lib/cdp';
import { TabManager } from './lib/tab-manager';
import { CommandRouter } from './lib/command-router';
import { Logger } from './lib/logger';

// 全局状态
let wsClient: WebSocketClient | null = null;
let cdpClient: CdpClient | null = null;
let tabManager: TabManager;
let commandRouter: CommandRouter;
let logger: Logger;

// 端口配置
const DEFAULT_WS_PORT = 9223;

/**
 * 初始化 Service Worker
 */
export async function initialize(): Promise<void> {
  console.log('[BrowserCompanion] Initializing...');
  
  tabManager = new TabManager();
  logger = new Logger();
  commandRouter = new CommandRouter(tabManager, logger);
  
  // 连接 CDP
  await connectCdp();
  
  // 连接 AI Agent WebSocket Server
  startWebSocketClient(DEFAULT_WS_PORT);
}

/**
 * 连接 Chrome DevTools Protocol
 */
async function connectCdp(): Promise<void> {
  try {
    // 刷新 Tab 列表
    await tabManager.refresh();
    const targets = tabManager.getAvailableTabs();
    const tab = tabManager.selectTarget(); // 默认 active tab
    
    if (!tab) {
      console.warn('[BrowserCompanion] No available tabs to debug');
      return;
    }
    
    await chrome.debugger.attach(String(tab.tabId), '1.3');
    cdpClient = new CdpClient(String(tab.tabId));
    console.log(`[BrowserCompanion] Connected to tab: ${tab.tabId} (${tab.url})`);
    
    // 启用 Console 和 Network 捕获
    await cdpClient.enableConsoleLog();
    await cdpClient.enableNetworkCapture();
    
    // 监听调试目标变化
    chrome.debugger.onDetach.addListener((reason) => {
      console.warn('[BrowserCompanion] CDP detached:', reason);
      reconnectCdp();
    });
  } catch (error) {
    console.error('[BrowserCompanion] Failed to connect CDP:', error);
  }
}

/**
 * 重新连接 CDP
 */
async function reconnectCdp(): Promise<void> {
  console.log('[BrowserCompanion] Reconnecting CDP in 2s...');
  setTimeout(() => connectCdp(), 2000);
}

/**
 * 连接 AI Agent WebSocket Server
 */
function startWebSocketClient(port: number): void {
  if (wsClient) {
    wsClient.disconnect();
  }
  
  wsClient = new WebSocketClient(port);
  
  wsClient.onStatusChange((status) => {
    // 通知 Side Panel 连接状态变化
    chrome.runtime.sendMessage({ type: 'connection_status', status });
    console.log(`[BrowserCompanion] WebSocket status: ${status}`);
  });
  
  wsClient.onMessage(async (message) => {
    // 路由 JSON-RPC 命令
    const result = await commandRouter.route(message, cdpClient);
    
    // 发送响应
    wsClient?.send({
      jsonrpc: '2.0',
      id: message.id,
      result,
    });
  });
  
  wsClient.connect().catch((error) => {
    console.error('[BrowserCompanion] WebSocket connection failed:', error);
  });
  
  console.log(`[BrowserCompanion] WebSocket client connecting to ws://localhost:${port}`);
}

// 生命周期
chrome.runtime.onInstalled.addListener(() => {
  console.log('[BrowserCompanion] Extension installed');
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[BrowserCompanion] Extension startup');
  initialize();
});

// 立即初始化
initialize();
