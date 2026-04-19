/**
 * TabManager 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TabManager, TabNotFoundError } from '../../lib/tab-manager';
import type { TabInfo } from '../../lib/types';

// Mock chrome.tabs
const mockTabs: TabInfo[] = [
  { tabId: 1, url: 'https://example.com', title: 'Example', windowId: 1 },
  { tabId: 2, url: 'https://google.com', title: 'Google', windowId: 1 },
  { tabId: 3, url: 'https://github.com', title: 'GitHub', windowId: 2 },
];

// Mock chrome runtime
globalThis.chrome = {
  tabs: {
    query: (): Promise<any[]> => Promise.resolve(mockTabs),
  },
} as any;

describe('TabManager', () => {
  let tabManager: TabManager;

  beforeEach(() => {
    tabManager = new TabManager();
  });

  describe('refresh', () => {
    it('should load tabs from chrome.tabs.query', async () => {
      await tabManager.refresh();
      const tabs = tabManager.getAvailableTabs();
      expect(tabs.length).toBe(3);
    });
  });

  describe('selectTarget', () => {
    beforeEach(async () => {
      await tabManager.refresh();
    });

    it('should return tab by explicit tabId', () => {
      const tab = tabManager.selectTarget(1);
      expect(tab.tabId).toBe(1);
      expect(tab.url).toBe('https://example.com');
    });

    it('should throw TabNotFoundError for invalid tabId', () => {
      expect(() => tabManager.selectTarget(999)).toThrow(TabNotFoundError);
    });

    it('TabNotFoundError should contain available tabs', () => {
      try {
        tabManager.selectTarget(999);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TabNotFoundError);
        const err = error as TabNotFoundError;
        expect(err.availableTabs).toHaveLength(3);
      }
    });

    it('should return first tab when no tabId specified and no active tab', () => {
      const tab = tabManager.selectTarget();
      expect(tab).toBeDefined();
    });

    it('should return tab info', () => {
      const tab = tabManager.getTab(1);
      expect(tab?.url).toBe('https://example.com');
    });

    it('should return undefined for non-existent tab', () => {
      const tab = tabManager.getTab(999);
      expect(tab).toBeUndefined();
    });
  });
});
