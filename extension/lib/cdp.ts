/**
 * CDP Client - Chrome DevTools Protocol 封装
 * 
 * 使用 chrome.debugger API 与目标标签页通信
 */

import type { TabInfo, SnapshotResult, SnapshotElement, NavigateParams } from './types.ts';

export class CdpClient {
  private tabId: string;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(tabId: string) {
    this.tabId = tabId;
    this.setupListeners();
  }

  private setupListeners(): void {
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (source.tabId !== this.tabId) return;
      const handlers = this.eventHandlers.get(method);
      if (handlers) {
        handlers.forEach(h => h(params));
      }
    });
  }

  /** 发送 CDP 命令并等待响应 */
  private async sendCommand<T = any>(method: string, params?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(this.tabId, method, params, (result, error) => {
        if (error) {
          reject(new Error(`CDP ${method} failed: ${error.message}`));
        } else {
          resolve(result as T);
        }
      });
    });
  }

  /** 监听 CDP 事件 */
  on(method: string, handler: Function): () => void {
    if (!this.eventHandlers.has(method)) {
      this.eventHandlers.set(method, new Set());
    }
    this.eventHandlers.get(method)!.add(handler);
    return () => this.eventHandlers.get(method)?.delete(handler);
  }

  /** 导航到 URL */
  async navigate(params: NavigateParams): Promise<{ url: string; title: string }> {
    const { url, waitUntil = 'load' } = params;
    
    return new Promise((resolve, reject) => {
      // 监听页面加载完成
      const onLoad = (source: any, method: string, loadParams: any) => {
        if (method === 'Page.loadEventFired') {
          chrome.debugger.onEvent.removeListener(onLoad);
          resolve({ url, title: loadParams.timestamp?.toString() ?? url });
        }
      };
      chrome.debugger.onEvent.addListener(onLoad);

      chrome.debugger.sendCommand(this.tabId, 'Page.navigate', { url }, (result, error) => {
        if (error) {
          chrome.debugger.onEvent.removeListener(onLoad);
          reject(new Error(`Navigate failed: ${error.message}`));
        }
      });
    });
  }

  /** 获取 DOM Snapshot */
  async snapshot(): Promise<SnapshotResult> {
    // 获取文档
    const doc = await this.sendCommand<{ root: any }>('DOM.getDocument', { depth: -1 });
    
    // 获取快照元素
    const elements = await this.buildSnapshot(doc.root, 0);
    
    // 计算 token 数量（粗略估算）
    const totalTokens = elements.reduce((sum, el) => {
      return sum + el.text.split(/\s+/).length + el.tagName.length;
    }, 0);

    return {
      elements,
      totalTokens,
      tabId: parseInt(this.tabId),
      url: '', // TODO: 从 tab info 获取
    };
  }

  /** 递归构建快照 */
  private async buildSnapshot(node: any, depth: number): Promise<SnapshotElement[]> {
    if (depth > 10) return []; // 限制深度

    const elements: SnapshotElement[] = [];
    
    // 检查是否是可交互元素
    const tagName = node.nodeName?.toLowerCase() ?? '';
    const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details'];
    const isInteractive = interactiveTags.includes(tagName);

    if (tagName && (isInteractive || node.childNodeCount === 0)) {
      const ref = `@e${elements.length + 1}`;
      elements.push({
        ref,
        tagName,
        text: this.extractText(node),
        attributes: this.extractAttributes(node),
        interactive: isInteractive,
      });
    }

    // 递归处理子节点
    if (node.children) {
      for (const child of node.children) {
        elements.push(...await this.buildSnapshot(child, depth + 1));
      }
    }

    return elements;
  }

  private extractText(node: any): string {
    const textContent = node.textContent ?? '';
    return textContent.slice(0, 200).trim(); // 限制长度
  }

  private extractAttributes(node: any): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (node.attributes) {
      for (const attr of node.attributes) {
        if (attr.name && !attr.name.startsWith('aria-')) {
          attrs[attr.name] = attr.value ?? '';
        }
      }
    }
    return attrs;
  }

  /** 执行 JavaScript */
  async evaluate<T = any>(expression: string): Promise<T> {
    const result = await this.sendCommand<{ result: any }>('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    return result.result?.value ?? result.result;
  }

  /** 截图 */
  async screenshot(): Promise<string> {
    const result = await this.sendCommand<{ data: string }>('Page.captureScreenshot', {
      format: 'png',
      quality: 80,
    });
    return `data:image/png;base64,${result.data}`;
  }

  /** 鼠标点击 */
  async click(selector: string): Promise<void> {
    // 先获取元素位置
    const { x, y } = await this.getElementCenter(selector);
    await this.sendCommand('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
    await this.sendCommand('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
  }

  /** 获取元素中心坐标 */
  private async getElementCenter(selector: string): Promise<{ x: number; y: number }> {
    const result = await this.evaluate<{ x: number; y: number }>(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error('Element not found: ' + ${JSON.stringify(selector)});
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `);
    return result;
  }

  /** 启用 Console 日志捕获 */
  async enableConsoleLog(): Promise<void> {
    await this.sendCommand('Log.enable');
  }

  /** 启用 Network 捕获 */
  async enableNetworkCapture(): Promise<void> {
    await this.sendCommand('Network.enable');
  }
}
