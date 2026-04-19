"""
Browser Companion Python SDK Tests
"""

import pytest
from browser_companion.client import BrowserCompanion, CommandResult, SnapshotElement, SnapshotResult


class TestCommandResult:
    """测试 CommandResult 数据类"""
    
    def test_command_result_success(self):
        result = CommandResult(success=True, data={"url": "https://example.com"})
        assert result.success is True
        assert result.data["url"] == "https://example.com"
        assert result.error is None
    
    def test_command_result_error(self):
        result = CommandResult(success=False, error="Tab not found")
        assert result.success is False
        assert result.error == "Tab not found"
        assert result.data is None


class TestSnapshotResult:
    """测试 SnapshotResult 数据类"""
    
    def test_snapshot_element(self):
        el = SnapshotElement(
            ref="@e1",
            tag_name="button",
            text="Click me",
            attributes={"class": "btn"},
            interactive=True,
        )
        assert el.ref == "@e1"
        assert el.tag_name == "button"
        assert el.text == "Click me"
        assert el.interactive is True
    
    def test_snapshot_result(self):
        elements = [
            SnapshotElement("@e1", "button", "Submit", {}, True),
            SnapshotElement("@e2", "input", "", {"type": "text"}, True),
        ]
        result = SnapshotResult(
            elements=elements,
            total_tokens=10,
            tab_id=1,
            url="https://example.com",
        )
        assert len(result.elements) == 2
        assert result.total_tokens == 10
        assert result.tab_id == 1


class TestBrowserCompanionAPI:
    """测试 BrowserCompanion SDK API 接口"""
    
    def test_api_has_navigate(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'navigate')
    
    def test_api_has_snapshot(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'snapshot')
    
    def test_api_has_screenshot(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'screenshot')
    
    def test_api_has_evaluate(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'evaluate')
    
    def test_api_has_click(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'click')
    
    def test_api_has_type_text(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'type_text')
    
    def test_api_has_scroll(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'scroll')
    
    def test_api_has_ping(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'ping')
    
    def test_api_has_get_console_logs(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'get_console_logs')
    
    def test_api_has_get_network_requests(self):
        bc = BrowserCompanion()
        assert hasattr(bc, 'get_network_requests')
    
    def test_default_port(self):
        bc = BrowserCompanion()
        assert bc.port == 9223
        assert bc.host == "localhost"
    
    def test_custom_port(self):
        bc = BrowserCompanion(host="192.168.1.1", port=9333)
        assert bc.host == "192.168.1.1"
        assert bc.port == 9333


class TestNavigateParams:
    """测试 navigate 方法参数"""
    
    def test_navigate_requires_url(self):
        bc = BrowserCompanion()
        import inspect
        sig = inspect.signature(bc.navigate)
        params = list(sig.parameters.keys())
        assert "url" in params
    
    def test_navigate_accepts_tab_id(self):
        bc = BrowserCompanion()
        import inspect
        sig = inspect.signature(bc.navigate)
        params = sig.parameters
        assert "tab_id" in params
        assert params["tab_id"].default is None


class TestSnapshotParams:
    """测试 snapshot 方法参数"""
    
    def test_snapshot_accepts_tab_id(self):
        bc = BrowserCompanion()
        import inspect
        sig = inspect.signature(bc.snapshot)
        params = sig.parameters
        assert "tab_id" in params
