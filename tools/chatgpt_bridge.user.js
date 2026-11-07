// ==UserScript==
// @name         Văn Phòng AI Studio - ChatGPT Plus Bridge (v1.2.0)
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Cầu nối tự động hóa hai chiều (Handshake, Heartbeat, ACK, Watchdog) giữa Dashboard Văn Phòng AI Studio (localhost:3333) và tab ChatGPT Web Plus
// @author       Sếp Quill & Antigravity
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  console.log('[Văn Phòng AI Userscript] Kích hoạt cầu nối ChatGPT Plus v1.2.0...');

  const BRIDGE_API_BASE = 'http://localhost:3333/api/chatgpt-bridge';
  let isExecutingTask = false;
  let statusBadge = null;
  let activeSessionId = null;

  function httpReq(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = `${BRIDGE_API_BASE}${path}`;
      if (typeof GM_xmlhttpRequest !== 'undefined') {
        GM_xmlhttpRequest({
          method,
          url,
          headers: { 'Content-Type': 'application/json' },
          data: data ? JSON.stringify(data) : null,
          onload: (res) => {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (e) {
              resolve({ ok: true, raw: res.responseText });
            }
          },
          onerror: (err) => reject(err)
        });
      } else {
        fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: data ? JSON.stringify(data) : null
        })
          .then(r => r.json())
          .then(resolve)
          .catch(reject);
      }
    });
  }

  function createFloatingBadge() {
    if (document.getElementById('van-phong-ai-badge')) return;

    statusBadge = document.createElement('div');
    statusBadge.id = 'van-phong-ai-badge';
    statusBadge.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid rgba(245, 158, 11, 0.5);
      color: #f8fafc;
      padding: 10px 16px;
      border-radius: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 158, 11, 0.25);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
      cursor: pointer;
    `;

    statusBadge.innerHTML = `
      <div id="vpai-dot" style="width: 10px; height: 10px; border-radius: 50%; background: #94a3b8;"></div>
      <div>
        <div style="font-weight: 700; color: #fbbf24; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Văn Phòng AI Studio v3.0</div>
        <div id="vpai-status-text" style="color: #94a3b8; font-size: 11px;">Đang kết nối Dashboard...</div>
      </div>
    `;

    statusBadge.onclick = () => {
      window.open('http://localhost:3333', '_blank');
    };

    document.body.appendChild(statusBadge);
  }

  function updateBadge(status, text) {
    if (!statusBadge) createFloatingBadge();
    const dot = document.getElementById('vpai-dot');
    const label = document.getElementById('vpai-status-text');
    if (!dot || !label) return;

    if (status === 'connected') {
      dot.style.background = '#10b981';
      dot.style.boxShadow = '0 0 10px #10b981';
      label.style.color = '#34d399';
      label.innerText = text || 'Đã liên kết Trưởng phòng (Handshake OK)';
    } else if (status === 'working') {
      dot.style.background = '#f59e0b';
      dot.style.boxShadow = '0 0 10px #f59e0b';
      label.style.color = '#fbbf24';
      label.innerText = text || 'Đang xử lý & truyền thông tin...';
    } else {
      dot.style.background = '#ef4444';
      dot.style.boxShadow = 'none';
      label.style.color = '#f87171';
      label.innerText = text || 'Mất kết nối Dashboard (:3333)';
    }
  }

  function getConversationInfo() {
    const url = window.location.href;
    const match = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    return {
      url: url,
      conversationId: match ? match[1] : 'current-chat',
      title: document.title || 'ChatGPT'
    };
  }

  function findPromptInput() {
    return document.querySelector('#prompt-textarea') ||
           document.querySelector('div[contenteditable="true"]') ||
           document.querySelector('textarea[data-id="root"]') ||
           document.querySelector('textarea');
  }

  async function injectText(text) {
    const inputEl = findPromptInput();
    if (!inputEl) return false;

    inputEl.focus();
    let success = false;
    try {
      success = document.execCommand('insertText', false, text);
    } catch (e) {
      success = false;
    }

    if (!success || (inputEl.textContent || inputEl.value || '').trim().length === 0) {
      if (inputEl.tagName.toLowerCase() === 'textarea') {
        inputEl.value = text;
      } else {
        inputEl.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
      }
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  }

  function findSendButton() {
    return document.querySelector('button[data-testid="send-button"]') ||
           document.querySelector('button[aria-label="Send prompt"]') ||
           document.querySelector('button[aria-label="Send message"]') ||
           document.querySelector('button[aria-label="Gửi lời nhắc"]') ||
           document.querySelector('button[aria-label="Gửi tin nhắn"]') ||
           document.querySelector('button[data-testid="fruitjuice-send-button"]') ||
           document.querySelector('form button[type="submit"]');
  }

  function isStopButtonVisible() {
    return !!(
      document.querySelector('button[data-testid="stop-button"]') ||
      document.querySelector('button[aria-label*="Stop"]') ||
      document.querySelector('button[aria-label*="Dừng"]') ||
      document.querySelector('.result-streaming')
    );
  }

  function getLatestAssistantResponse() {
    const assistantNodes = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (assistantNodes.length > 0) {
      const lastNode = assistantNodes[assistantNodes.length - 1];
      return (lastNode.innerText || lastNode.textContent || '').trim();
    }
    return '';
  }

  async function executeTask(task) {
    if (isExecutingTask) return;
    isExecutingTask = true;

    const correlationId = task.correlationId || `CORR-${task.taskId}`;

    // Send ACK immediately
    await httpReq('POST', '/ack', {
      taskId: task.taskId,
      correlationId: correlationId,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: Date.now()
    }).catch(() => {});

    updateBadge('working', 'Đã nhận lệnh (ACK). Đang nhập chỉ đạo...');

    try {
      await httpReq('POST', '/log', {
        taskId: task.taskId,
        correlationId: correlationId,
        status: 'PROCESSING',
        log: `[ChatGPT Tab] Đã nhận chỉ đạo Sếp (Correlation: ${correlationId}), đang điền vào ô chat Trưởng phòng...`,
        progress: 35
      }).catch(() => {});

      const injected = await injectText(task.prompt);
      if (!injected) throw new Error('Không thể điền prompt vào ô chat');

      await new Promise(r => setTimeout(r, 600));

      const sendBtn = findSendButton();
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        const inputEl = findPromptInput();
        if (inputEl) {
          inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        }
      }

      await httpReq('POST', '/log', {
        taskId: task.taskId,
        correlationId: correlationId,
        status: 'PROCESSING',
        log: `[ChatGPT Tab] Đã bấm Gửi, Trưởng phòng ChatGPT Plus đang sinh phản hồi...`,
        progress: 50
      }).catch(() => {});

      let startedGenerating = false;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 400));
        if (isStopButtonVisible()) {
          startedGenerating = true;
          break;
        }
      }

      updateBadge('working', 'Trưởng phòng Plus đang suy nghĩ...');

      let lastText = '';
      let sameTextCount = 0;
      const maxWaitSeconds = 180;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitSeconds * 1000) {
        await new Promise(r => setTimeout(r, 1000));
        const currentText = getLatestAssistantResponse();
        const stillGenerating = isStopButtonVisible();

        if (currentText && currentText === lastText && !stillGenerating) {
          sameTextCount++;
          if (sameTextCount >= 2) break;
        } else {
          sameTextCount = 0;
        }

        lastText = currentText;

        if (stillGenerating && currentText.length > 30) {
          await httpReq('POST', '/log', {
            taskId: task.taskId,
            correlationId: correlationId,
            status: 'PROCESSING',
            log: `[ChatGPT Tab] Trưởng phòng đang viết: "${currentText.slice(-60).replace(/\n/g, ' ')}..."`,
            progress: Math.min(85, 50 + Math.floor(currentText.length / 30))
          }).catch(() => {});
        }

        if (!stillGenerating && startedGenerating && currentText.length > 20) break;
      }

      const finalText = getLatestAssistantResponse() || lastText;

      await httpReq('POST', '/result', {
        taskId: task.taskId,
        correlationId: correlationId,
        status: 'RESPONSE_RECEIVED',
        success: true,
        text: finalText,
        conversationInfo: getConversationInfo(),
        completedAt: Date.now()
      });

      updateBadge('connected', 'Hoàn tất! Sẵn sàng nhận lệnh mới');
    } catch (err) {
      console.error('[Văn Phòng AI] Lỗi:', err);
      updateBadge('connected', 'Gặp lỗi: ' + err.message);

      await httpReq('POST', '/result', {
        taskId: task.taskId,
        correlationId: correlationId,
        status: 'FAILED',
        success: false,
        error: err.message
      }).catch(() => {});
    } finally {
      isExecutingTask = false;
    }
  }

  async function performHandshake() {
    try {
      const conv = getConversationInfo();
      const res = await httpReq('POST', '/handshake', {
        clientVersion: '1.2.0-userscript',
        url: conv.url,
        conversationId: conv.conversationId,
        title: conv.title,
        timestamp: Date.now()
      });
      if (res && res.ok && res.sessionId) {
        activeSessionId = res.sessionId;
        const shortId = (conv.conversationId && conv.conversationId !== 'current-chat')
          ? conv.conversationId.substring(0, 10) + '...'
          : 'Tab Hiện Tại';
        updateBadge('connected', `Đã liên kết: ${shortId}`);
        return true;
      }
      updateBadge('disconnected', 'Handshake chưa thành công');
      return false;
    } catch (e) {
      updateBadge('disconnected', 'Mất kết nối Dashboard (:3333)');
      return false;
    }
  }

  async function pollDashboard() {
    if (isExecutingTask) return;
    try {
      const conv = getConversationInfo();
      const res = await httpReq('GET', `/poll?url=${encodeURIComponent(conv.url)}&convId=${encodeURIComponent(conv.conversationId)}&title=${encodeURIComponent(conv.title)}&sessionId=${encodeURIComponent(activeSessionId || '')}`);
      if (res && res.hasTask && res.task && !isExecutingTask) {
        executeTask(res.task);
      }
    } catch (e) {}
  }

  function start() {
    createFloatingBadge();
    performHandshake().then(() => {
      setInterval(pollDashboard, 1500);
      setInterval(() => {
        const conv = getConversationInfo();
        httpReq('POST', '/heartbeat', { ...conv, sessionId: activeSessionId }).catch(() => {});
      }, 5000);
    });

    window.addEventListener('popstate', performHandshake);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
