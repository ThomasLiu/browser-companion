# Browser Companion

Chrome Extension 使 AI Agent 能够通过 WebSocket/JSON-RPC 控制用户的 Chrome 浏览器。

## 架构

```
AI Agent (WebSocket Server: ws://localhost:9223)
    ↑ JSON-RPC
Chrome Extension (WebSocket Client)
    ↓ CDP
目标网页
```

### 核心组件

| 组件 | 技术 | 说明 |
|------|------|------|
| Chrome Extension | TypeScript, MV3 | 核心扩展，运行在 Chrome |
| Background Service Worker | TypeScript | WebSocket Client，CDP 桥接 |
| Side Panel UI | HTML/CSS/JS | 6 个 Tab 的可视化面板 |
| Python SDK | Python 3.10+ | AI Agent 集成 SDK |
| TypeScript SDK | TypeScript | Node.js Agent 用 |

## 安装

### 1. 加载 Extension

```bash
# 构建
cd extension && npm install && npm run build

# 在 Chrome 中:
# 1. 打开 chrome://extensions
# 2. 开启 "Developer mode"
# 3. 点击 "Load unpacked"，选择 extension/dist/
```

### 2. 启动 Chrome 调试模式

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --load-extension=$(pwd)/extension/dist

# Linux
google-chrome --remote-debugging-port=9222 --load-extension=$(pwd)/extension/dist

# Windows
start chrome --remote-debugging-port=9222 --load-extension="%CD%\extension\dist"
```

### 3. AI Agent 启动 WebSocket Server

Extension 会主动连接 `ws://localhost:9223`。你需要启动一个 WebSocket server 来接收命令。

Python 示例:

```python
import asyncio
import json
from browser_companion import BrowserCompanion

async def main():
    async with BrowserCompanion() as bc:
        # 连接 Extension
        await bc.navigate("https://example.com")
        
        # 获取页面快照
        result = await bc.snapshot()
        print(result.data)

if __name__ == "__main__":
    asyncio.run(main())
```

## 命令

Extension 支持以下 JSON-RPC 命令:

| 命令 | 参数 | 说明 |
|------|------|------|
| `navigate` | `{url: string, tabId?: number}` | 导航到 URL |
| `snapshot` | `{tabId?: number}` | 获取 DOM 快照 |
| `screenshot` | `{tabId?: number}` | 截图 |
| `evaluate` | `{expression: string}` | 执行 JavaScript |
| `click` | `{selector: string}` | 点击元素 |
| `type` | `{selector: string, text: string}` | 输入文本 |
| `scroll` | `{x: number, y: number}` | 滚动页面 |
| `ping` | `{}` | 测试连接 |

## 开发

```bash
# Extension 开发
cd extension
npm install
npm run dev      # 监听模式
npm test         # 单元测试

# Python SDK 开发
cd agent-sdk/python
pip install -e ".[dev]"
pytest           # 测试
```

## 测试

```bash
# 单元测试
cd extension && npm test
cd agent-sdk/python && pytest

# E2E 测试 (需要 Chrome 运行)
npx playwright test
```

## Roadmap

- [x] MVP: 基础骨架和命令
- [ ] v2.0: 多窗口智能选择
- [ ] 多 Chrome 实例支持
- [ ] Incognito 支持

## License

MIT
