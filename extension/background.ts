/**
 * Background Service Worker
 * 
 * 职责:
 * 1. 启动 WebSocket 服务 (ws://localhost:9223)
 * 2. 接收 AI Agent 的 JSON-RPC 命令
 * 3. 转发给 CDP (Chrome DevTools Protocol)
 * 4. 返回结果给 AI Agent
 */

import { WebSocketServer, WebSocket } from './lib/ws-bridge.ts';
import { CdpClient } from './lib/cdp.ts';
import { TabManager } from './lib/tab-manager.ts';
import { CommandRouter } from './lib/command-router.ts';
import { Logger } from './lib/logger.ts';

// 全局状态
let wsServer: WebSocketServer | null = null;
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
  
  // 启动 WebSocket 服务
  startWebSocketServer(DEFAULT_WS_PORT);
}

/**
 * 连接 Chrome DevTools Protocol
 */
async function connectCdp(): Promise<void> {
  try {
    // 通过 chrome.debugger API 连接
    const targets = await chrome.debugger.getTargets();
    const tab = tabManager.selectTarget(targets);
    
    if (!tab) {
      console.warn('[BrowserCompanion] No available tabs to debug');
      return;
    }
    
    await chrome.debugger.attach(tab.tabId, '1.3');
    cdpClient = new CdpClient(tab.tabId);
    console.log(`[BrowserCompanion] Connected to tab: ${tab.tabId} (${tab.url})`);
    
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
 * 启动 WebSocket 服务
 */
function startWebSocketServer(port: number): void {
  if (wsServer) {
    wsServer.close();
  }
  
  wsServer = new WebSocketServer(port, handleWebSocketMessage);
  console.log(`[BrowserCompanion] WebSocket server started at ws://localhost:${port}`);
}

/**
 * 处理 WebSocket 消息
 */
async function handleWebSocketMessage(
  ws: WebSocket,
  message: string
): Promise<void> {
  let parsed: any;
  
  try {
    parsed = JSON.parse(message);
  } catch {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' }
    }));
    return;
  }
  
  // 路由命令
  const result = await commandRouter.route(parsed, cdpClient);
  
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: parsed.id,
    result
  }));
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
