/**
 * VĂN PHÒNG AI STUDIO - CHATGPT PLUS BRIDGE CONTENT SCRIPT (v1.0.1)
 * Hoạt động qua Background Service Worker để miễn nhiễm 100% với CSP của chatgpt.com
 */

(function () {
  console.log('🚀 [Văn Phòng AI Studio] ChatGPT Bridge v1.0.1 đang khởi chạy...');

  let isExecutingTask = false;
  let statusBadge = null;

  // Helper gửi message qua background service worker
  function sendExtensionMessage(type, data) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ type, data }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(res || { success: false });
            }
          });
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      } else {
        // Fallback fetch trực tiếp (dành cho console snippet / userscript)
        const baseUrl = 'http://localhost:3333/api/chatgpt-bridge';
        if (type === 'POLL') {
          const { url, convId, title } = data || {};
          fetch(`${baseUrl}/poll?url=${encodeURIComponent(url || '')}&convId=${encodeURIComponent(convId || '')}&title=${encodeURIComponent(title || '')}`)
            .then(r => r.json())
            .then(d => resolve({ success: true, data: d }))
            .catch(e => resolve({ success: false, error: e.message }));
        } else if (type === 'LOG') {
          fetch(`${baseUrl}/log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
            .then(r => r.json())
            .then(d => resolve({ success: true, data: d }))
            .catch(e => resolve({ success: false, error: e.message }));
        } else if (type === 'RESULT') {
          fetch(`${baseUrl}/result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
            .then(r => r.json())
            .then(d => resolve({ success: true, data: d }))
            .catch(e => resolve({ success: false, error: e.message }));
        }
      }
    });
  }

  // 1. Tạo huy hiệu nổi
  function createFloatingBadge() {
    if (document.getElementById('van-phong-ai-badge')) return;

    statusBadge = document.createElement('div');
    statusBadge.id = 'van-phong-ai-badge';
    statusBadge.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 2147483647 !important;
      background: #0f172a !important;
      border: 1px solid rgba(245, 158, 11, 0.6) !important;
      color: #f8fafc !important;
      padding: 10px 16px !important;
      border-radius: 16px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 12px !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(245, 158, 11, 0.3) !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      transition: all 0.3s ease !important;
      cursor: pointer !important;
    `;

    statusBadge.innerHTML = `
      <div id="vpai-dot" style="width: 10px !important; height: 10px !important; border-radius: 50% !important; background: #94a3b8 !important;"></div>
      <div>
        <div style="font-weight: 800 !important; color: #fbbf24 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important;">VĂN PHÒNG AI STUDIO</div>
        <div id="vpai-status-text" style="color: #94a3b8 !important; font-size: 11px !important; font-weight: 500 !important;">Đang kiểm tra kết nối Dashboard...</div>
      </div>
    `;

    statusBadge.onclick = () => {
      window.open('http://localhost:3333', '_blank');
    };

    const targetParent = document.body || document.documentElement;
    if (targetParent) {
      targetParent.appendChild(statusBadge);
    }
  }

  function updateBadge(status, text) {
    createFloatingBadge();
    const dot = document.getElementById('vpai-dot');
    const label = document.getElementById('vpai-status-text');
    if (!dot || !label) return;

    if (status === 'connected') {
      dot.style.background = '#10b981';
      dot.style.boxShadow = '0 0 10px #10b981';
      label.style.color = '#34d399';
      label.innerText = text || 'Đã liên kết Trưởng phòng';
    } else if (status === 'working') {
      dot.style.background = '#f59e0b';
      dot.style.boxShadow = '0 0 10px #f59e0b';
      label.style.color = '#fbbf24';
      label.innerText = text || 'Đang nhận lệnh & sinh câu trả lời...';
    } else {
      dot.style.background = '#ef4444';
      dot.style.boxShadow = 'none';
      label.style.color = '#f87171';
      label.innerText = text || 'Chưa bật Dashboard (:3333)';
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
    if (!inputEl) {
      console.error('[Văn Phòng AI] Không tìm thấy ô nhập liệu');
      return false;
    }

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
      await sendExtensionMessage('LOG', {
        taskId: task.taskId,
        log: `[ChatGPT Tab] Đã nhận chỉ đạo Sếp, đang tự động nạp vào ô chat Trưởng phòng...`,
        progress: 35
      });

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

      await sendExtensionMessage('LOG', {
        taskId: task.taskId,
        log: `[ChatGPT Tab] Đã bấm Gửi, Trưởng phòng ChatGPT Plus đang sinh phản hồi...`,
        progress: 50
      });

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
          await sendExtensionMessage('LOG', {
            taskId: task.taskId,
            log: `[ChatGPT Tab] Trưởng phòng đang viết: "${currentText.slice(-60).replace(/\n/g, ' ')}..."`,
            progress: 65
          });
        }

        if (!stillGenerating && startedGenerating && currentText.length > 20) break;
      }

      const finalText = getLatestAssistantResponse() || lastText;

      await sendExtensionMessage('RESULT', {
        taskId: task.taskId,
        success: true,
        text: finalText,
        conversationInfo: getConversationInfo()
      });

      updateBadge('connected', 'Hoàn tất! Sẵn sàng nhận lệnh mới');
    } catch (err) {
      console.error('[Văn Phòng AI] Lỗi:', err);
      updateBadge('connected', 'Gặp lỗi: ' + err.message);
      await sendExtensionMessage('RESULT', {
        taskId: task.taskId,
        success: false,
        error: err.message
      });
    } finally {
      isExecutingTask = false;
    }
  }

  async function pollDashboard() {
    if (isExecutingTask) return;

    try {
      const conv = getConversationInfo();
      const res = await sendExtensionMessage('POLL', conv);

      if (res && res.success && res.data) {
        const data = res.data;
        const shortId = (conv.conversationId && conv.conversationId !== 'current-chat') 
          ? conv.conversationId.substring(0, 10) + '...' 
          : 'Tab Hiện Tại';
        updateBadge('connected', `Đã liên kết: ${shortId}`);

        if (data.hasTask && data.task && !isExecutingTask) {
          console.log('[Văn Phòng AI] Nhận task mới từ Sếp Quill:', data.task);
          executeTask(data.task);
        }
      } else {
        updateBadge('disconnected', 'Chưa kết nối Dashboard (:3333)');
      }
    } catch (err) {
      updateBadge('disconnected', 'Lỗi kết nối Dashboard');
    }
  }

  function start() {
    createFloatingBadge();
    setInterval(pollDashboard, 1500);
    pollDashboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
