// ==UserScript==
// @name         Văn Phòng AI Studio - ChatGPT Plus Bridge
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Cầu nối tự động hóa giữa Dashboard Văn Phòng AI Studio (localhost:3333) và tab ChatGPT Web Plus
// @author       Sếp Quill & Antigravity
// @match        https://chatgpt.com/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  console.log('[Văn Phòng AI Userscript] Đang kích hoạt cầu nối ChatGPT Plus...');

  const BRIDGE_API_BASE = 'http://localhost:3333/api/chatgpt-bridge';
  let isExecutingTask = false;
  let statusBadge = null;

  function createFloatingBadge() {
    if (document.getElementById('van-phong-ai-badge')) return;

    statusBadge = document.createElement('div');
    statusBadge.id = 'van-phong-ai-badge';
    statusBadge.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #f8fafc;
      padding: 10px 16px;
      border-radius: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(245, 158, 11, 0.2);
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
        <div style="font-weight: 700; color: #fbbf24; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Văn Phòng AI Studio</div>
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
      dot.style.boxShadow = '0 0 8px #10b981';
      label.style.color = '#34d399';
      label.innerText = text || 'Đã liên kết Trưởng phòng';
    } else if (status === 'working') {
      dot.style.background = '#f59e0b';
      dot.style.boxShadow = '0 0 8px #f59e0b';
      label.style.color = '#fbbf24';
      label.innerText = text || 'Đang nhận lệnh & viết bài...';
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

    if (!success) {
      if (inputEl.tagName.toLowerCase() === 'textarea') {
        inputEl.value = text;
      } else {
        inputEl.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
      }
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  }

  function findSendButton() {
    return document.querySelector('button[data-testid="send-button"]') ||
           document.querySelector('button[aria-label="Send prompt"]') ||
           document.querySelector('button[aria-label="Gửi lời nhắc"]') ||
           document.querySelector('button[data-testid="fruitjuice-send-button"]') ||
           document.querySelector('form button[type="submit"]');
  }

  function isStopButtonVisible() {
    return !!(
      document.querySelector('button[data-testid="stop-button"]') ||
      document.querySelector('button[aria-label="Stop generating"]') ||
      document.querySelector('button[aria-label="Dừng tạo"]') ||
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
    updateBadge('working', 'Đang nhập chỉ đạo của Sếp...');

    try {
      await fetch(`${BRIDGE_API_BASE}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          log: `[ChatGPT Tab] Đã nhận chỉ đạo Sếp, đang tự động nạp vào ô chat Trưởng phòng...`,
          progress: 35
        })
      }).catch(() => {});

      const injected = await injectText(task.prompt);
      if (!injected) throw new Error('Không thể điền prompt vào ô chat ChatGPT');

      await new Promise(r => setTimeout(r, 600));

      const sendBtn = findSendButton();
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        const inputEl = findPromptInput();
        if (inputEl) {
          inputEl.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
        }
      }

      await fetch(`${BRIDGE_API_BASE}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          log: `[ChatGPT Tab] Đã bấm Gửi, Trưởng phòng ChatGPT Plus đang sinh phản hồi...`,
          progress: 50
        })
      }).catch(() => {});

      let startedGenerating = false;
      for (let i = 0; i < 15; i++) {
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
        await new Promise(r => setTimeout(r, 800));
        const currentText = getLatestAssistantResponse();
        const stillGenerating = isStopButtonVisible();

        if (currentText && currentText === lastText && !stillGenerating) {
          sameTextCount++;
          if (sameTextCount >= 2) break;
        } else {
          sameTextCount = 0;
        }

        lastText = currentText;

        if (stillGenerating && currentText.length > 50) {
          await fetch(`${BRIDGE_API_BASE}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: task.taskId,
              log: `[ChatGPT Tab] Trưởng phòng đang viết: "${currentText.slice(-60).replace(/\n/g, ' ')}..."`,
              progress: 65
            })
          }).catch(() => {});
        }

        if (!stillGenerating && startedGenerating && currentText.length > 20) break;
      }

      const finalText = getLatestAssistantResponse() || lastText;

      await fetch(`${BRIDGE_API_BASE}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          success: true,
          text: finalText,
          conversationInfo: getConversationInfo()
        })
      });

      updateBadge('connected', 'Hoàn tất! Sẵn sàng nhận lệnh mới');
    } catch (err) {
      console.error('[Văn Phòng AI] Lỗi:', err);
      updateBadge('connected', 'Gặp lỗi: ' + err.message);
      await fetch(`${BRIDGE_API_BASE}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          success: false,
          error: err.message
        })
      }).catch(() => {});
    } finally {
      isExecutingTask = false;
    }
  }

  async function pollDashboard() {
    if (isExecutingTask) return;

    try {
      const conv = getConversationInfo();
      const res = await fetch(`${BRIDGE_API_BASE}/poll?url=${encodeURIComponent(conv.url)}&convId=${encodeURIComponent(conv.conversationId)}&title=${encodeURIComponent(conv.title)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      updateBadge('connected', `Đã liên kết: ${conv.conversationId.substring(0, 12)}...`);

      if (data.hasTask && data.task && !isExecutingTask) {
        console.log('[Văn Phòng AI] Nhận task mới từ Sếp Quill:', data.task);
        executeTask(data.task);
      }
    } catch (err) {
      updateBadge('disconnected', 'Chưa kết nối Dashboard (:3333)');
    }
  }

  setTimeout(() => {
    createFloatingBadge();
    setInterval(pollDashboard, 1500);
    pollDashboard();
  }, 1000);
})();
