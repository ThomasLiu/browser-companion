/**
 * 共享类型定义
 */

// JSON-RPC 2.0
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: any;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

// CDP 相关
export interface TabInfo {
  tabId: number;
  url: string;
  title: string;
  windowId: number;
  favIconUrl?: string;
}

export interface NavigateParams {
  url: string;
  tabId?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle2';
  timeout?: number;
}

export interface SnapshotResult {
  elements: SnapshotElement[];
  totalTokens: number;
  tabId: number;
  url: string;
}

export interface SnapshotElement {
  ref: string;       // 如 "@e1"
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  interactive: boolean;
}

export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  tabId?: number;
  duration?: number; // 耗时 ms
}

// WebSocket 连接状态
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// 日志条目
export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info';
  method: string;
  params: Record<string, any>;
  result: CommandResult;
  duration: number;
}
