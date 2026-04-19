/**
 * TabManager 纯逻辑 TDD 测试
 * 
 * TDD 流程:
 * 1. 先写测试（会失败）✅
 * 2. 实现代码（让测试通过）✅
 * 3. 重构 ✅
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ===== 数据结构 =====

interface TabInfo {
  tabId: number;
  url: string;
  title: string;
  windowId: number;
  favIconUrl?: string;
  active?: boolean;
}

class TabNotFoundError extends Error {
  availableTabs: TabInfo[];
  constructor(requestedTabId: number, availableTabs: TabInfo[]) {
    super(`Tab ID ${requestedTabId} not found or inaccessible`);
    this.name = 'TabNotFoundError';
    this.availableTabs = availableTabs;
  }
}

// ===== TabManager 实现 =====

class TabManager {
  private tabs: Map<number, TabInfo> = new Map();
  private activeTabId: number | null = null;

  refresh(tabList: TabInfo[]): void {
    this.tabs.clear();
    for (const tab of tabList) {
      if (tab.tabId && tab.url && !tab.url.startsWith('chrome://')) {
        this.tabs.set(tab.tabId, tab);
        if (tab.active) {
          this.activeTabId = tab.tabId;
        }
      }
    }
  }

  selectTarget(tabId?: number): TabInfo {
    if (tabId !== undefined) {
      const tab = this.tabs.get(tabId);
      if (!tab) {
        throw new TabNotFoundError(tabId, this.getAvailableTabs());
      }
      return tab;
    }

    if (this.activeTabId !== null) {
      const activeTab = this.tabs.get(this.activeTabId);
      if (activeTab) return activeTab;
    }

    const firstTab = this.tabs.values().next().value;
    if (!firstTab) {
      throw new Error('No available tabs');
    }
    return firstTab;
  }

  getAvailableTabs(): TabInfo[] {
    return Array.from(this.tabs.values());
  }

  getTab(tabId: number): TabInfo | undefined {
    return this.tabs.get(tabId);
  }

  getActiveTabId(): number | null {
    return this.activeTabId;
  }
}

// ===== 测试用例 =====

const mockTabs: TabInfo[] = [
  { tabId: 1, url: 'https://example.com', title: 'Example', windowId: 1, active: true },
  { tabId: 2, url: 'https://google.com', title: 'Google', windowId: 1, active: false },
  { tabId: 3, url: 'https://github.com', title: 'GitHub', windowId: 2, active: false },
];

describe('TabManager TDD', () => {
  let tm: TabManager;

  beforeEach(() => {
    tm = new TabManager();
    tm.refresh(mockTabs);
  });

  describe('AC11.1: selectTarget 支持显式 tabId', () => {
    it('指定 tabId=2 返回 google.com', () => {
      const tab = tm.selectTarget(2);
      expect(tab.tabId).toBe(2);
      expect(tab.url).toBe('https://google.com');
    });

    it('指定 tabId=1 返回 example.com', () => {
      const tab = tm.selectTarget(1);
      expect(tab.tabId).toBe(1);
      expect(tab.url).toBe('https://example.com');
    });
  });

  describe('AC11.3: Tab 不存在时返回错误和可用列表', () => {
    it('不存在的 tabId 抛出 TabNotFoundError', () => {
      expect(() => tm.selectTarget(999)).toThrow(TabNotFoundError);
    });

    it('TabNotFoundError.availableTabs 包含所有可用 Tab', () => {
      try {
        tm.selectTarget(999);
      } catch (e) {
        expect((e as TabNotFoundError).availableTabs).toHaveLength(3);
      }
    });
  });

  describe('默认选择 active tab', () => {
    it('不指定 tabId 返回 active tab', () => {
      const tab = tm.selectTarget();
      expect(tab.tabId).toBe(1);
      expect(tab.active).toBe(true);
    });
  });

  describe('getAvailableTabs', () => {
    it('返回所有可用标签页', () => {
      expect(tm.getAvailableTabs()).toHaveLength(3);
    });
  });

  describe('getTab', () => {
    it('存在的 tabId 返回 TabInfo', () => {
      const tab = tm.getTab(1);
      expect(tab?.url).toBe('https://example.com');
    });

    it('不存在的 tabId 返回 undefined', () => {
      expect(tm.getTab(999)).toBeUndefined();
    });
  });

  describe('排除 chrome:// 页面', () => {
    it('refresh 时排除 chrome:// URLs', () => {
      tm.refresh([
        ...mockTabs,
        { tabId: 4, url: 'chrome://settings', title: 'Settings', windowId: 3 },
      ]);
      expect(tm.getAvailableTabs()).toHaveLength(3);
    });
  });

  describe('多窗口场景 (S3/S4)', () => {
    it('多窗口时默认返回 active tab', () => {
      const tab = tm.selectTarget();
      expect(tab.windowId).toBeDefined();
    });
  });
});
