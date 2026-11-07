document.addEventListener('DOMContentLoaded', async () => {
  const dashStatusEl = document.getElementById('dash-status');
  const tabStatusEl = document.getElementById('tab-status');
  const openDashBtn = document.getElementById('open-dash-btn');

  openDashBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3333' });
  });

  // Kiểm tra kết nối tới server
  try {
    const res = await fetch('http://localhost:3333/api/chatgpt-bridge/status', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      dashStatusEl.innerHTML = '<span class="status-dot dot-online"></span>Đang chạy (:3333)';
      if (data.isConnected) {
        tabStatusEl.innerHTML = `<span class="status-dot dot-online"></span>${data.conversationId.substring(0, 10)}...`;
      } else {
        tabStatusEl.innerHTML = '<span style="color:#f59e0b;">Chưa mở tab chat</span>';
      }
    } else {
      dashStatusEl.innerHTML = '<span class="status-dot dot-offline"></span>Lỗi phản hồi';
    }
  } catch (e) {
    dashStatusEl.innerHTML = '<span class="status-dot dot-offline"></span>Chưa bật server';
  }
});
