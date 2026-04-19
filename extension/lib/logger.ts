/**
 * Logger - 记录命令执行日志
 * 
 * 存储在 chrome.storage.local
 * 支持按类型过滤和导出
 */

import type { LogEntry, CommandResult } from './types.ts';

const MAX_LOGS = 1000;

export class Logger {
  private cache: LogEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /** 加载历史日志 */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get('commandLogs');
      if (stored.commandLogs) {
        this.cache = stored.commandLogs;
      }
    } catch (error) {
      console.error('[Logger] Failed to load from storage:', error);
    }
  }

  /** 保存到 storage */
  private async saveToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({ commandLogs: this.cache });
    } catch (error) {
      console.error('[Logger] Failed to save to storage:', error);
    }
  }

  /** 记录日志 */
  async log(entry: Omit<LogEntry, 'id'> & { id: string }): Promise<void> {
    this.cache.unshift(entry as LogEntry); // 最近的在前面
    
    // 限制数量
    if (this.cache.length > MAX_LOGS) {
      this.cache = this.cache.slice(0, MAX_LOGS);
    }

    await this.saveToStorage();
  }

  /** 获取日志 */
  getLogs(type?: 'console' | 'network' | 'command'): LogEntry[] {
    if (!type || type === 'command') {
      return this.cache;
    }
    return this.cache.filter(log => log.method === type);
  }

  /** 清空日志 */
  async clear(): Promise<void> {
    this.cache = [];
    await chrome.storage.local.remove('commandLogs');
  }

  /** 导出为 JSONL */
  exportJsonl(): string {
    return this.cache
      .map(entry => JSON.stringify(entry))
      .join('\n');
  }
}
