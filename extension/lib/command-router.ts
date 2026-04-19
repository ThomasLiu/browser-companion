/**
 * Command Router - 路由 JSON-RPC 命令到对应处理函数
 * 
 * 支持的命令：
 * - navigate: 导航到 URL
 * - snapshot: 获取 DOM 快照
 * - screenshot: 截图
 * - evaluate: 执行 JavaScript
 * - click: 点击元素
 * - type: 输入文本
 * - scroll: 滚动页面
 * - console: 获取 Console 日志
 * - network: 获取 Network 请求
 */

import type { JsonRpcRequest, CommandResult } from './types';
import type { CdpClient } from './cdp';
import type { TabManager } from './tab-manager';
import type { Logger } from './logger';
import { TabNotFoundError } from './tab-manager';

export class CommandRouter {
  private tabManager: TabManager;
  private logger: Logger;

  constructor(tabManager: TabManager, logger: Logger) {
    this.tabManager = tabManager;
    this.logger = logger;
  }

  /**
   * 路由命令
   */
  async route(request: JsonRpcRequest, cdpClient: CdpClient | null): Promise<CommandResult> {
    const { method, params = {} } = request;
    const startTime = Date.now();

    // 刷新 Tab 列表
    await this.tabManager.refresh();

    // 查找目标 Tab
    let targetTab;
    try {
      targetTab = this.tabManager.selectTarget(params.tabId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tab selection failed',
        data: error instanceof TabNotFoundError ? { availableTabs: error.availableTabs } : undefined,
      };
    }

    // 检查 CDP 连接
    if (!cdpClient) {
      return {
        success: false,
        error: 'Chrome debugger not connected',
        tabId: targetTab.tabId,
      };
    }

    // 路由到具体处理函数
    let result: CommandResult;
    try {
      switch (method) {
        case 'navigate':
          result = await this.handleNavigate(cdpClient, params);
          break;
        case 'snapshot':
          result = await this.handleSnapshot(cdpClient, targetTab.tabId);
          break;
        case 'screenshot':
          result = await this.handleScreenshot(cdpClient);
          break;
        case 'evaluate':
          result = await this.handleEvaluate(cdpClient, params);
          break;
        case 'click':
          result = await this.handleClick(cdpClient, params);
          break;
        case 'type':
          result = await this.handleType(cdpClient, params);
          break;
        case 'scroll':
          result = await this.handleScroll(cdpClient, params);
          break;
        case 'console':
          result = await this.handleConsole(params);
          break;
        case 'network':
          result = await this.handleNetwork(params);
          break;
        case 'ping':
          result = { success: true, data: { pong: true, timestamp: Date.now() } };
          break;
        default:
          result = { success: false, error: `Unknown method: ${method}` };
      }
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        tabId: targetTab.tabId,
      };
    }

    // 记录日志
    result.duration = Date.now() - startTime;
    result.tabId = targetTab.tabId;
    await this.logger.log({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level: result.success ? 'info' : 'error',
      method,
      params,
      result,
      duration: result.duration,
    });

    return result;
  }

  // ---- 命令处理函数 ----

  private async handleNavigate(cdpClient: CdpClient, params: any): Promise<CommandResult> {
    const { url, waitUntil = 'load' } = params;
    const result = await cdpClient.navigate({ url, waitUntil });
    return {
      success: true,
      data: result,
    };
  }

  private async handleSnapshot(cdpClient: CdpClient, tabId: number): Promise<CommandResult> {
    const result = await cdpClient.snapshot();
    result.tabId = tabId;
    return {
      success: true,
      data: result,
    };
  }

  private async handleScreenshot(cdpClient: CdpClient): Promise<CommandResult> {
    const data = await cdpClient.screenshot();
    return {
      success: true,
      data: { screenshot: data },
    };
  }

  private async handleEvaluate(cdpClient: CdpClient, params: any): Promise<CommandResult> {
    const { expression } = params;
    const result = await cdpClient.evaluate(expression);
    return {
      success: true,
      data: result,
    };
  }

  private async handleClick(cdpClient: CdpClient, params: any): Promise<CommandResult> {
    const { selector } = params;
    await cdpClient.click(selector);
    return { success: true };
  }

  private async handleType(cdpClient: CdpClient, params: any): Promise<CommandResult> {
    const { selector, text } = params;
    // 使用 evaluate 来触发 input 事件
    await cdpClient.evaluate(`
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('Element not found');
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) nativeInputValueSetter.call(el, ${JSON.stringify(text)});
      else if (nativeTextAreaValueSetter) nativeTextAreaValueSetter.call(el, ${JSON.stringify(text)});
      else el.value = ${JSON.stringify(text)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    `);
    return { success: true };
  }

  private async handleScroll(cdpClient: CdpClient, params: any): Promise<CommandResult> {
    const { x, y } = params;
    await cdpClient.evaluate(`window.scrollTo(${x}, ${y})`);
    return { success: true };
  }

  private async handleConsole(params: any): Promise<CommandResult> {
    // Console 日志由 Logger 存储，这里只是返回
    const logs = this.logger.getLogs('console');
    return { success: true, data: logs };
  }

  private async handleNetwork(params: any): Promise<CommandResult> {
    // Network 日志由 Logger 存储，这里只是返回
    const requests = this.logger.getLogs('network');
    return { success: true, data: requests };
  }
}

// 重新导出 TabNotFoundError
export { TabNotFoundError } from './tab-manager';
