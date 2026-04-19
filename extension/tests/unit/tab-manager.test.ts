/**
 * TabManager TDD Tests
 * 
 * TDD 流程:
 * 1. 先写测试（会失败）
 * 2. 实现 TabManager
 * 3. 测试通过后重构
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ===== 测试数据 =====

const mockTabs = [
  { tabId: 1, url: 'https://example.com', title: 'Example', windowId: 1, active: true },
  { tabId: 2, url: 'https://google.com', title: 'Google', windowId: 1, active: false },
  { tabId: 3, url: 'https://github.com', title: 'GitHub', windowId: 2, active: false },
];

// ===== Mock chrome API =====

const chrome = {
  tabs: {
    query: (): Promise<any[]> => Promise.resolve(mockTabs),
  },
  runtime: {
    lastError: null,
  },
} as any;

(globalThis as any).chrome = chrome;

// ===== 测试用例 =====

describe('TabManager TDD', () => {
  let TabManager: any;

  beforeEach(async () => {
    // 动态导入（模拟 TDD：此时 TabManager 可能还不存在）
    const mod = await import('../../lib/tab-manager');
    TabManager = mod.TabManager;
  });

  describe('Step 1: 测试 refresh() - 先写测试', () => {
    it('refresh() 应该加载标签页列表', async () => {
      const tm = new TabManager();
      await tm.refresh();
      
      const tabs = tm.getAvailableTabs();
      expect(tabs).toHaveLength(3);
    });

    it('refresh() 应该排除 chrome:// 内部页面', async () => {
      const tm = new TabManager();
      await tm.refresh();
      
      const tabs = tm.getAvailableTabs();
      const hasInternal = tabs.some((t: any) => t.url.startsWith('chrome://'));
      expect(hasInternal).toBe(false);
    });
  });

  describe('Step 2: 测试 selectTarget() - 选择目标标签页', () => {
    it('指定 tabId 时应该返回对应标签页', async () => {
      const tm = new TabManager();
      await tm.refresh();
      
      const tab = tm.selectTarget(2);
      expect(tab.tabId).toBe(2);
      expect(tab.url).toBe('https://google.com');
    });

    it('不指定 tabId 时应该返回 active 标签页', async () => {
      const tm = new TabManager();
      await tm.refresh();
      
      const tab = tm.selectTarget();
      expect(tab.tabId).toBe(1); // tabId=1 是 active=true
    });

    it('指定不存在的 tabId 应该抛出 TabNotFoundError', async () => {
      const tm = new TabManager();
      await tm.refresh();
      
      expect(() => tm.selectTarget(999)).toThrow();
    });

    it('TabNotFoundError 应该包含 availableTabs', async () => {
      const tm = new TabManager();
      await tm.refresh();
      
      try {
        tm.selectTarget(999);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.availableTabs).toBeDefined();
        expect(Array.isArray(error.availableTabs)).toBe(true);
      }
    });
  });

  describe('Step 3: 测试 getTab() - 获取单个标签页', () => {
    it('存在的 tabId 应该返回 TabInfo', async () => {
      const tm = new TabManager();
      await tm.refresh();
      
      const tab = tm.getTab(1);
      expect(tab).toBeDefined();
      expect(tab?.url).toBe('https://example.com');
    });

    it('不存在的 tabId 应该返回 undefined', async () => {
      const tm = new TabManager();
      await tm.refresh();
      
      const tab = tm.getTab(999);
      expect(tab).toBeUndefined();
    });
  });
});
