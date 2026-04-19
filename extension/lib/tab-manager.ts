/**
 * Tab Manager - 管理 Chrome 标签页选择策略
 * 
 * 场景处理：
 * - S1/S2: 单窗口多 Tab → 默认 active tab
 * - S3/S4: 多窗口 → 默认最后活跃 Tab
 * - S6: Tab 不存在 → 返回错误
 */

import type { TabInfo } from './types';

export class TabManager {
  private tabs: Map<number, TabInfo> = new Map();
  private activeTabId: number | null = null;

  /** 刷新标签页列表 */
  async refresh(): Promise<void> {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        this.tabs.clear();
        for (const tab of tabs) {
          if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
            this.tabs.set(tab.id, {
              tabId: tab.id,
              url: tab.url,
              title: tab.title ?? '',
              windowId: tab.windowId,
              favIconUrl: tab.favIconUrl,
            });
            if (tab.active) {
              this.activeTabId = tab.id;
            }
          }
        }
        resolve();
      });
    });
  }

  /**
   * 选择目标标签页
   * 
   * 策略：
   * - 指定 tabId → 直接使用
   * - 未指定 → 使用 active tab
   * - Tab 不存在 → 抛出错误
   */
  selectTarget(tabId?: number): TabInfo {
    if (tabId !== undefined) {
      const tab = this.tabs.get(tabId);
      if (!tab) {
        throw new TabNotFoundError(tabId, this.getAvailableTabs());
      }
      return tab;
    }

    // 默认使用 active tab
    if (this.activeTabId !== null) {
      const activeTab = this.tabs.get(this.activeTabId);
      if (activeTab) return activeTab;
    }

    // 兜底：返回第一个可用 Tab
    const firstTab = this.tabs.values().next().value;
    if (!firstTab) {
      throw new Error('No available tabs');
    }
    return firstTab;
  }

  /** 获取所有可用标签页 */
  getAvailableTabs(): TabInfo[] {
    return Array.from(this.tabs.values());
  }

  /** 获取 Tab 信息 */
  getTab(tabId: number): TabInfo | undefined {
    return this.tabs.get(tabId);
  }

  /** 获取当前 active Tab ID */
  getActiveTabId(): number | null {
    return this.activeTabId;
  }
}

/**
 * Tab 未找到错误
 */
export class TabNotFoundError extends Error {
  public availableTabs: TabInfo[];

  constructor(requestedTabId: number, availableTabs: TabInfo[]) {
    super(`Tab ID ${requestedTabId} not found or inaccessible`);
    this.name = 'TabNotFoundError';
    this.availableTabs = availableTabs;
  }
}
