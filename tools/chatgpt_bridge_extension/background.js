/**
 * VĂN PHÒNG AI STUDIO - CHATGPT BRIDGE SERVICE WORKER
 * Chạy ngầm trong Extension, hoàn toàn không bị chặn bởi Content Security Policy (CSP) của chatgpt.com
 */

const API_BASE = 'http://localhost:3333/api/chatgpt-bridge';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'POLL') {
    const { url, convId, title } = request.data || {};
    const pollUrl = `${API_BASE}/poll?url=${encodeURIComponent(url || '')}&convId=${encodeURIComponent(convId || '')}&title=${encodeURIComponent(title || '')}`;
    
    fetch(pollUrl)
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    
    return true; // Báo hiệu phản hồi bất đồng bộ (async response)
  }

  if (request.type === 'LOG') {
    fetch(`${API_BASE}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data)
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === 'RESULT') {
    fetch(`${API_BASE}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data)
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === 'STATUS') {
    fetch(`${API_BASE}/status`)
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
