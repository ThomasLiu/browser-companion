/**
 * Playwright E2E Test Configuration
 * 
 * 运行方式: npx playwright test
 * 
 * 注意: E2E 测试需要:
 * 1. Chrome Extension 已加载到 chrome://extensions
 * 2. Chrome 开启了调试端口 (--remote-debugging-port=9222)
 * 3. AI Agent 已启动 WebSocket Server (ws://localhost:9223)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:9223',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // 使用已安装的 Chrome
        launchOptions: {
          // 不自动启动 Chrome，假设已有 Chrome 运行
          args: [
            '--disable-extensions',
            '--no-sandbox',
          ],
        },
      },
      testMatch: /.*\.e2e\.spec\.ts/,
    },
  ],

  webServer: {
    // 不启动 webServer，假设 AI Agent 已启动
    command: 'echo "AI Agent should be running"',
    port: 9223,
    reuseExistingServer: true,
  },
});
