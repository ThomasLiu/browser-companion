"""
Browser Companion Python SDK

AI Agent 通过这个 SDK 连接 Chrome Extension，控制浏览器。

使用方式:
    from browser_companion import BrowserCompanion
    
    async with BrowserCompanion() as bc:
        await bc.navigate("https://example.com")
        snapshot = await bc.snapshot()
        print(snapshot)
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class CommandResult:
    """命令执行结果"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    tab_id: Optional[int] = None
    duration: Optional[float] = None


@dataclass
class SnapshotElement:
    """DOM 快照元素"""
    ref: str
    tag_name: str
    text: str
    attributes: dict
    interactive: bool


@dataclass
class SnapshotResult:
    """DOM 快照结果"""
    elements: list[SnapshotElement]
    total_tokens: int
    tab_id: int
    url: str


class BrowserCompanion:
    """
    Python SDK for Browser Companion Chrome Extension.
    
    AI Agent 通过 WebSocket 连接 Chrome Extension，发送 JSON-RPC 命令。
    """
    
    def __init__(self, host: str = "localhost", port: int = 9223, timeout: float = 30.0):
        self.host = host
        self.port = port
        self.timeout = timeout
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None
        self._request_id = 0
        self._connected = False
    
    async def __aenter__(self):
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()
    
    async def connect(self) -> None:
        """连接到 Chrome Extension WebSocket 服务"""
        logger.info(f"Connecting to ws://{self.host}:{self.port}")
        self._reader, self._writer = await asyncio.open_connection(
            self.host, self.port
        )
        self._connected = True
        logger.info("Connected")
    
    async def disconnect(self) -> None:
        """断开连接"""
        if self._writer:
            self._writer.close()
            await self._writer.wait_closed()
        self._connected = False
        logger.info("Disconnected")
    
    @property
    def is_connected(self) -> bool:
        return self._connected
    
    async def _send(self, method: str, params: Optional[dict] = None) -> CommandResult:
        """发送 JSON-RPC 请求"""
        if not self._connected:
            raise ConnectionError("Not connected")
        
        self._request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
            "params": params or {},
        }
        
        # 发送请求
        data = json.dumps(request).encode() + b"\n"
        self._writer.write(data)
        await self._writer.drain()
        
        # 等待响应
        try:
            response_line = await asyncio.wait_for(
                self._reader.readline(), timeout=self.timeout
            )
            response = json.loads(response_line.decode())
            
            if "error" in response:
                return CommandResult(
                    success=False,
                    error=response["error"].get("message", "Unknown error"),
                )
            
            return CommandResult(
                success=True,
                data=response.get("result"),
                duration=response.get("duration"),
            )
        except asyncio.TimeoutError:
            return CommandResult(success=False, error=f"Request timeout after {self.timeout}s")
    
    # ---- Browser Commands ----
    
    async def ping(self) -> CommandResult:
        """测试连接是否正常"""
        return await self._send("ping")
    
    async def navigate(self, url: str, tab_id: Optional[int] = None) -> CommandResult:
        """
        导航到指定 URL
        
        Args:
            url: 目标 URL
            tab_id: 可选，指定 Tab ID
        """
        return await self._send("navigate", {"url": url, "tabId": tab_id})
    
    async def snapshot(self, tab_id: Optional[int] = None) -> CommandResult:
        """
        获取 DOM 快照
        
        Returns:
            CommandResult with data as SnapshotResult
        """
        result = await self._send("snapshot", {"tabId": tab_id})
        if result.success and result.data:
            # 转换为 SnapshotResult
            data = result.data
            elements = [
                SnapshotElement(
                    ref=el["ref"],
                    tag_name=el["tagName"],
                    text=el["text"],
                    attributes=el.get("attributes", {}),
                    interactive=el.get("interactive", False),
                )
                for el in data.get("elements", [])
            ]
            result.data = SnapshotResult(
                elements=elements,
                total_tokens=data.get("totalTokens", 0),
                tab_id=data.get("tabId", 0),
                url=data.get("url", ""),
            )
        return result
    
    async def screenshot(self, tab_id: Optional[int] = None) -> CommandResult:
        """截图"""
        return await self._send("screenshot", {"tabId": tab_id})
    
    async def evaluate(self, expression: str, tab_id: Optional[int] = None) -> CommandResult:
        """
        执行 JavaScript 表达式
        
        Args:
            expression: JavaScript 代码
            tab_id: 可选，指定 Tab ID
        """
        return await self._send("evaluate", {"expression": expression, "tabId": tab_id})
    
    async def click(self, selector: str, tab_id: Optional[int] = None) -> CommandResult:
        """
        点击元素
        
        Args:
            selector: CSS 选择器
            tab_id: 可选，指定 Tab ID
        """
        return await self._send("click", {"selector": selector, "tabId": tab_id})
    
    async def type_text(self, selector: str, text: str, tab_id: Optional[int] = None) -> CommandResult:
        """
        输入文本
        
        Args:
            selector: CSS 选择器
            text: 要输入的文本
            tab_id: 可选，指定 Tab ID
        """
        return await self._send("type", {"selector": selector, "text": text, "tabId": tab_id})
    
    async def scroll(self, x: int, y: int, tab_id: Optional[int] = None) -> CommandResult:
        """
        滚动页面
        
        Args:
            x: X 坐标
            y: Y 坐标
            tab_id: 可选，指定 Tab ID
        """
        return await self._send("scroll", {"x": x, "y": y, "tabId": tab_id})
    
    async def get_console_logs(self) -> CommandResult:
        """获取 Console 日志"""
        return await self._send("console")
    
    async def get_network_requests(self) -> CommandResult:
        """获取 Network 请求记录"""
        return await self._send("network")
