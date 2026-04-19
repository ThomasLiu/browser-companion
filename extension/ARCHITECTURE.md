# Architecture Decision: WebSocket Bridge

## 问题
Chrome Extension Service Worker 无法直接创建 TCP/WebSocket Server (`net` 模块不可用)。

## 解决方案：扩展主动连接 AI Agent

```
AI Agent (启动 WebSocket Server: ws://localhost:9223)
    ↑ 连接
Chrome Extension (作为 Client 连接 AI Agent)
    ↓ CDP
目标网页
```

### 理由
1. **Extension 可以作为 WebSocket Client** — `chrome.sockets.tcp` 可以连接 TCP
2. **更安全** — Extension 只连出去，不暴露端口
3. **AI Agent 通常是服务端** — LangChain、AutoGPT 等都是 agent 启动 server

### 端口配置
- AI Agent 监听: `ws://localhost:9223`（AI Agent 启动）
- Extension 连接: `ws://localhost:9223`（Extension 作为 client）

### 后续支持
如果确实需要 Extension 作为 server：
- 提供可选的 Native Messaging Host (一小段 native 代码)
- 或要求用户安装轻量级 bridge helper

## Updated AC

原 AC4 调整为：
- AC4.1: Extension 尝试连接 ws://localhost:9223
- AC4.2: AI Agent 发送命令可被 Extension 接收并执行
- AC4.3: 断连后自动重连
