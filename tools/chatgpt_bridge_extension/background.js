/**
 * VĂN PHÒNG AI STUDIO - CHATGPT BRIDGE SERVICE WORKER (v1.2.0)
 * Chịu trách nhiệm:
 * - Handshake 2 chiều & Heartbeat với Dashboard (:3333)
 * - Quản lý vòng đời Tab ChatGPT (Open, SPA Navigate, Reload, Close)
 * - Định tuyến thông điệp an toàn, tránh bị CSP và tab discarding chặn
 */

const API_BASE = 'http://localhost:3333/api/chatgpt-bridge';
const API_BASE_FALLBACK = 'http://127.0.0.1:3333/api/chatgpt-bridge';

let activeSessions = new Map(); // tabId -> { sessionId, convId, url, title }

// Helper gửi request tới server với fallback tự động
async function callServerApi(endpoint, options = {}) {
  const method = options.method || 'GET';
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const fetchOptions = { method, headers };
  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (errPrimary) {
    try {
      const resFallback = await fetch(`${API_BASE_FALLBACK}${endpoint}`, fetchOptions);
      if (!resFallback.ok) throw new Error(`HTTP ${resFallback.status}`);
      return await resFallback.json();
    } catch (errSecondary) {
      throw new Error(`Server unreachable: ${errPrimary.message} / ${errSecondary.message}`);
    }
  }
}

// 1. Lắng nghe Port giữ kết nối lâu dài từ Content Script
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chatgpt-bridge-port') {
    const tabId = port.sender && port.sender.tab ? port.sender.tab.id : null;

    port.onDisconnect.addListener(() => {
      if (tabId && activeSessions.has(tabId)) {
        // Tab port ngắt kết nối (reload hoặc đóng)
        activeSessions.delete(tabId);
      }
    });
  }
});

// 2. Bắt sự kiện tab bị đóng -> Thông báo ngay cho server
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeSessions.has(tabId)) {
    const session = activeSessions.get(tabId);
    activeSessions.delete(tabId);

    // Gửi tín hiệu tab closed ngay lập tức
    callServerApi('/tab-closed', {
      method: 'POST',
      body: { tabId, sessionId: session.sessionId, conversationId: session.convId }
    }).catch(() => {});
  }
});

// 3. Bắt sự kiện điều hướng SPA trong ChatGPT
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && (changeInfo.url.includes('chatgpt.com') || changeInfo.url.includes('chat.openai.com'))) {
    if (activeSessions.has(tabId)) {
      const session = activeSessions.get(tabId);
      session.url = changeInfo.url;
      const match = changeInfo.url.match(/\/c\/([a-zA-Z0-9-]+)/);
      session.convId = match ? match[1] : session.convId;

      // Heartbeat cập nhật URL mới
      callServerApi('/heartbeat', {
        method: 'POST',
        body: {
          tabId,
          sessionId: session.sessionId,
          url: session.url,
          conversationId: session.convId,
          title: tab.title || ''
        }
      }).catch(() => {});
    }
  }
});

// 4. Lắng nghe thông điệp từ Content Script & Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : (request.data && request.data.tabId);

  // A. HANDSHAKE HAI CHIỀU
  if (request.type === 'HANDSHAKE') {
    const payload = {
      clientVersion: '1.2.0',
      tabId,
      url: request.data.url,
      conversationId: request.data.conversationId,
      title: request.data.title,
      timestamp: Date.now()
    };

    callServerApi('/handshake', { method: 'POST', body: payload })
      .then(res => {
        if (res.ok && res.sessionId) {
          activeSessions.set(tabId, {
            sessionId: res.sessionId,
            convId: request.data.conversationId,
            url: request.data.url,
            title: request.data.title
          });
        }
        sendResponse({ success: true, data: res });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  // B. HEARTBEAT ĐỊNH KỲ
  if (request.type === 'HEARTBEAT') {
    const session = activeSessions.get(tabId) || {};
    const payload = {
      tabId,
      sessionId: session.sessionId || request.data.sessionId,
      url: request.data.url,
      conversationId: request.data.conversationId,
      title: request.data.title,
      timestamp: Date.now()
    };

    callServerApi('/heartbeat', { method: 'POST', body: payload })
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  // C. MESSAGE ACKNOWLEDGEMENT (Xác nhận nhận task)
  if (request.type === 'ACK') {
    callServerApi('/ack', { method: 'POST', body: request.data })
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  // D. POLL NHẬN TASK
  if (request.type === 'POLL') {
    const { url, convId, title, sessionId } = request.data || {};
    const pollUrl = `/poll?url=${encodeURIComponent(url || '')}&convId=${encodeURIComponent(convId || '')}&title=${encodeURIComponent(title || '')}&tabId=${tabId || ''}&sessionId=${encodeURIComponent(sessionId || '')}`;

    callServerApi(pollUrl)
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  // E. LOG STREAM & PROGRESS
  if (request.type === 'LOG') {
    callServerApi('/log', { method: 'POST', body: request.data })
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  // F. RESULT (Hoàn thành task)
  if (request.type === 'RESULT') {
    callServerApi('/result', { method: 'POST', body: request.data })
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  // G. STATUS
  if (request.type === 'STATUS') {
    callServerApi('/status')
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }
});
