/**
 * WebSocket Client (Extension 作为 Client 连接 AI Agent)
 * 
 * Extension 主动连接到 AI Agent 的 WebSocket Server
 */

import type { JsonRpcRequest, JsonRpcResponse, ConnectionStatus } from './types.ts';

type MessageHandler = (msg: JsonRpcResponse) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private port: number;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
  private reconnectTimer: number | null = null;
  private pendingRequests: Map<string | number, (resp: JsonRpcResponse) => void> = new Map();
  private status: ConnectionStatus = 'disconnected';

  constructor(port = 9223) {
    this.port = port;
  }

  /** 连接 WebSocket Server */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setStatus('connecting');
      
      try {
        this.ws = new WebSocket(`ws://localhost:${this.port}`);
        
        this.ws.onopen = () => {
          console.log(`[WS-Client] Connected to ws://localhost:${this.port}`);
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onclose = (event) => {
          console.log(`[WS-Client] Disconnected:`, event.code, event.reason);
          this.setStatus('disconnected');
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[WS-Client] Error:', error);
          this.setStatus('error');
          reject(error);
        };

        this.ws.onmessage = (event) => {
          let resp: JsonRpcResponse;
          try {
            resp = JSON.parse(event.data);
          } catch {
            console.error('[WS-Client] Failed to parse message:', event.data);
            return;
          }

          // 检查是否有待处理的请求
          const reqId = resp.id;
          if (reqId !== undefined && this.pendingRequests.has(reqId as string | number)) {
            const handler = this.pendingRequests.get(reqId)!;
            this.pendingRequests.delete(reqId);
            handler(resp);
            return;
          }

          // 广播给所有监听器
          this.messageHandlers.forEach(h => h(resp));
        };
      } catch (error) {
        this.setStatus('error');
        reject(error);
      }
    });
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // 阻止重连
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** 发送消息并等待响应 */
  send(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // 存储待处理的响应
      if (request.id !== undefined) {
        this.pendingRequests.set(request.id, resolve);
        
        // 超时处理 (30s)
        setTimeout(() => {
          if (this.pendingRequests.has(request.id as string | number)) {
            this.pendingRequests.delete(request.id);
            reject(new Error(`Request ${request.id} timeout`));
          }
        }, 30000);
      }

      this.ws.send(JSON.stringify(request));
    });
  }

  /** 发送消息（不等待响应） */
  sendNoWait(request: JsonRpcRequest): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS-Client] Cannot send, not connected');
      return;
    }
    this.ws.send(JSON.stringify(request));
  }

  /** 监听消息 */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /** 监听状态变化 */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusHandlers.forEach(h => h(status));
  }

  /** 处理断开后的重连逻辑 */
  private handleDisconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS-Client] Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelays[this.reconnectAttempts] ?? 4000;
    console.log(`[WS-Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay) as unknown as number;
  }
}
