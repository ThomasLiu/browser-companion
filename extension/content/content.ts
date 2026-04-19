/**
 * Content Script
 * 
 * 运行在每个页面上下文，用于辅助 DOM 操作
 * 与 background.js 通过 chrome.runtime 通信
 */

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_DOM_SNAPSHOT':
      sendResponse(getSnapshot());
      break;
    case 'EVALUATE':
      try {
        const result = eval(message.expression);
        sendResponse({ success: true, result });
      } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
      }
      break;
  }
  return true; // 异步响应
});

/**
 * 获取简化的 DOM 快照
 */
function getSnapshot(): any {
  const elements: any[] = [];
  let refIndex = 1;

  function traverse(node: Node): void {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as Element;
    const tagName = el.tagName?.toLowerCase();
    if (!tagName || tagName === 'script' || tagName === 'style') return;

    const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'button'];
    const isInteractive = interactiveTags.includes(tagName);

    if (isInteractive || el.children.length === 0) {
      elements.push({
        ref: `@e${refIndex++}`,
        tagName,
        text: el.textContent?.slice(0, 100).trim() ?? '',
        attributes: getRelevantAttributes(el),
        interactive: isInteractive,
      });
    }

    for (const child of Array.from(el.children)) {
      traverse(child);
    }
  }

  traverse(document.body);
  return { elements, url: location.href };
}

/**
 * 获取相关属性（排除 aria-* 和事件处理器）
 */
function getRelevantAttributes(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('on') && !attr.name.startsWith('aria-')) {
      const name = attr.name.toLowerCase();
      if (['id', 'class', 'name', 'type', 'placeholder', 'href', 'src', 'alt', 'title'].includes(name)) {
        attrs[name] = attr.value;
      }
    }
  }
  return attrs;
}

console.log('[BrowserCompanion Content] Loaded');
