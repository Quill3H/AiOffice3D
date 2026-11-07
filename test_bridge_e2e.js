/**
 * TEST SUITE: CHATGPT PLUS WEB BRIDGE & QC/DELIVERABLE SYNCHRONIZATION (v3.0.1)
 * Kiểm định toàn diện:
 * 1. Handshake hai chiều (ClientVersion, SessionId, ServerVersion)
 * 2. Heartbeat định kỳ & Session Tracking
 * 3. Vòng đời Task 5 trạng thái: SENT -> ACKNOWLEDGED -> PROCESSING -> RESPONSE_RECEIVED
 * 4. Nhận diện Correlation ID độc nhất
 * 5. Xử lý Tab Closed & Phục hồi kết nối khi Reload
 * 6. Timeout an toàn & Fallback minh bạch (không giả mạo AI)
 * 7. Kiểm định NV Video: Yêu cầu video -> Xuất file MP4 thật (không chỉ dừng lại ở timeline JSON)
 * 8. Đồng bộ QC và Cổng phê duyệt Sếp đối với sản phẩm sáng tạo
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVER_PORT = 3333;
const BASE_URL = `http://localhost:${SERVER_PORT}`;

function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runBridgeTestSuite() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CHATGPT PLUS WEB BRIDGE & QC SYNC');
  console.log('================================================================\n');

  const results = [];
  function record(id, name, passed, evidence) {
    results.push({ id, name, passed, evidence, timestamp: new Date().toISOString() });
    console.log(`[${passed ? 'PASS ✅' : 'FAIL ❌'}] [${id}] ${name}`);
    console.log(`   ➜ Bằng chứng: ${evidence}\n`);
  }

  try {
    // TC-B01: Handshake hai chiều
    const hsRes = await makeRequest('POST', '/api/chatgpt-bridge/handshake', {
      clientVersion: '1.2.0',
      tabId: 9999,
      url: 'https://chatgpt.com/g/g-p-6aef88d7325881918294fdfa5a201d48-truong-phong-ai-studio/c/test-handshake-conv',
      conversationId: 'test-handshake-conv',
      title: 'Hội thoại kiểm thử Handshake'
    });
    const hsOk = hsRes.status === 200 && hsRes.data.ok === true && !!hsRes.data.sessionId;
    record('TC-B01', 'Handshake hai chiều Server-Extension thành công', hsOk,
      `Status: ${hsRes.status}, SessionId: ${hsRes.data.sessionId}, ServerVersion: ${hsRes.data.serverVersion}`);
    const activeSessionId = hsRes.data.sessionId;

    // TC-B02: Heartbeat định kỳ
    const hbRes = await makeRequest('POST', '/api/chatgpt-bridge/heartbeat', {
      sessionId: activeSessionId,
      tabId: 9999,
      conversationId: 'test-handshake-conv',
      url: 'https://chatgpt.com/c/test-handshake-conv'
    });
    const hbOk = hbRes.status === 200 && hbRes.data.ok === true && hbRes.data.isConnected === true;
    record('TC-B02', 'Gửi Heartbeat định kỳ cập nhật trạng thái session', hbOk,
      `Status: ${hbRes.status}, isConnected: ${hbRes.data.isConnected}`);

    // TC-B03: Kiểm tra trạng thái Status API
    const stRes = await makeRequest('GET', '/api/chatgpt-bridge/status');
    const stOk = stRes.status === 200 && stRes.data.isConnected === true && stRes.data.sessionId === activeSessionId;
    record('TC-B03', 'Status API trả về đúng Session và URL đã Handshake', stOk,
      `isConnected: ${stRes.data.isConnected}, Session: ${stRes.data.sessionId}, Conv: ${stRes.data.conversationId}`);

    // TC-B04: Flow 5 trạng thái với Correlation ID (SENT -> ACKNOWLEDGED -> PROCESSING -> RESPONSE_RECEIVED)
    const testTaskId = `TASK-E2E-${Date.now()}`;
    const testCorrelationId = `CORR-E2E-${Date.now()}`;

    // Khởi tạo dispatch ngầm qua boss-dispatch endpoint
    const dispatchPromise = makeRequest('POST', '/api/boss-dispatch', {
      brief: 'Kiểm thử phản hồi Trưởng phòng ChatGPT với mã ' + testCorrelationId,
      room: 'Ban điều hành'
    });

    // Chờ 500ms cho server đặt pendingTask
    await new Promise(r => setTimeout(r, 600));

    // Extension Poll nhận task
    const pollRes = await makeRequest('GET', `/api/chatgpt-bridge/poll?convId=test-handshake-conv&sessionId=${activeSessionId}`);
    const pollHasTask = pollRes.data.hasTask === true && !!pollRes.data.task;
    const taskData = pollRes.data.task || {};

    // Extension gửi ACK
    const ackRes = await makeRequest('POST', '/api/chatgpt-bridge/ack', {
      taskId: taskData.taskId,
      correlationId: taskData.correlationId || testCorrelationId,
      status: 'ACKNOWLEDGED'
    });

    // Extension gửi LOG/PROCESSING
    const logRes = await makeRequest('POST', '/api/chatgpt-bridge/log', {
      taskId: taskData.taskId,
      correlationId: taskData.correlationId || testCorrelationId,
      status: 'PROCESSING',
      log: '[E2E-TEST] ChatGPT Plus đã phân tích xong chỉ đạo và chỉ định [nv-dev] thực hiện.',
      progress: 60
    });

    // Extension gửi RESULT (RESPONSE_RECEIVED)
    const resultRes = await makeRequest('POST', '/api/chatgpt-bridge/result', {
      taskId: taskData.taskId,
      correlationId: taskData.correlationId || testCorrelationId,
      status: 'RESPONSE_RECEIVED',
      success: true,
      text: 'Trưởng phòng đã phê duyệt kế hoạch. Phân công [nv-dev] thực hiện kiểm thử tự động hóa.',
      completedAt: Date.now()
    });

    // Đợi dispatch hoàn tất
    const finalDispatch = await dispatchPromise;
    const flowOk = pollHasTask && ackRes.data && ackRes.data.ok && logRes.data && logRes.data.ok && resultRes.data && resultRes.data.ok && finalDispatch.status === 200;
    record('TC-B04', 'Chu trình 5 trạng thái trọn vẹn kèm Correlation ID', flowOk,
      `Task: ${taskData.taskId}, Correlation: ${taskData.correlationId}, Dispatch: ${finalDispatch.data ? (finalDispatch.data.message || 'OK') : 'N/A'}`);

    // TC-B05: Báo Tab Closed -> Chuyển ngay sang DISCONNECTED
    const closeRes = await makeRequest('POST', '/api/chatgpt-bridge/tab-closed', {
      tabId: 9999,
      sessionId: activeSessionId
    });
    const postCloseSt = await makeRequest('GET', '/api/chatgpt-bridge/status');
    const closeOk = closeRes.data.ok === true && postCloseSt.data.isConnected === false;
    record('TC-B05', 'Tab Closed thông báo lập tức chuyển trạng thái sang DISCONNECTED', closeOk,
      `tab-closed status: ${closeRes.status}, isConnected: ${postCloseSt.data.isConnected}`);

    // TC-B06: Phục hồi kết nối sau Reload (Re-handshake)
    const reHandshake = await makeRequest('POST', '/api/chatgpt-bridge/handshake', {
      clientVersion: '1.2.0',
      tabId: 9999,
      url: 'https://chatgpt.com/g/g-p-6aef88d7325881918294fdfa5a201d48-truong-phong-ai-studio/c/reloaded-chat',
      conversationId: 'reloaded-chat',
      title: 'Tab đã reload'
    });
    const reSt = await makeRequest('GET', '/api/chatgpt-bridge/status');
    const reloadOk = reHandshake.data.ok && reSt.data.isConnected === true && reSt.data.conversationId === 'reloaded-chat';
    record('TC-B06', 'Tái thiết lập kết nối Handshake ngay sau khi Reload tab', reloadOk,
      `New Session: ${reHandshake.data.sessionId}, isConnected: ${reSt.data.isConnected}`);

    // TC-B07: Timeout & Fallback minh bạch khi ngắt kết nối
    // Đặt bridge sang disconnect
    await makeRequest('POST', '/api/chatgpt-bridge/tab-closed', { tabId: 9999 });
    const fallbackDispatch = await makeRequest('POST', '/api/boss-dispatch', {
      brief: 'Kiểm thử fallback khi tab đóng: Audit Technical SEO cho hệ thống',
      room: 'Phòng SEO & Content'
    });
    const fallbackOk = fallbackDispatch.status === 200 && 
                       fallbackDispatch.data && 
                       fallbackDispatch.data.deliverable && 
                       fallbackDispatch.data.deliverable.routingSource === 'RULE_ENGINE_FALLBACK';
    record('TC-B07', 'Kích hoạt Fallback minh bạch có ghi nhãn RULE_ENGINE_FALLBACK khi mất kết nối', fallbackOk,
      `RoutingSource: ${fallbackDispatch.data && fallbackDispatch.data.deliverable ? fallbackDispatch.data.deliverable.routingSource : 'N/A'}`);

    // TC-B08: Task yêu cầu Video hoàn chỉnh -> Phải xuất file MP4 thật (Khắc phục lỗi chỉ sinh JSON)
    const videoDispatch = await makeRequest('POST', '/api/boss-dispatch', {
      brief: 'Dựng video hoàn chỉnh viral ngắn 9:16 Kỷ Luật Thép với audio chuẩn và hook 3s',
      room: 'Studio Video & Media'
    });
    const videoDeliv = videoDispatch.data ? videoDispatch.data.deliverable : null;
    const isVideoMp4 = videoDeliv && videoDeliv.format === 'video' && videoDeliv.filePath.endsWith('.mp4');
    const fileExists = isVideoMp4 && fs.existsSync(videoDeliv.filePath) && fs.statSync(videoDeliv.filePath).size > 100000;
    record('TC-B08', 'NV Video tạo sản phẩm video MP4 hoàn chỉnh bằng FFmpeg (không chỉ timeline JSON)', fileExists,
      `Tệp: ${videoDeliv ? videoDeliv.relativePath : 'N/A'}, Size: ${videoDeliv ? videoDeliv.fileSizeMb : 0}MB`);

    // TC-B09: Sản phẩm Creative (Video) dừng ở trạng thái chờ Sếp duyệt thẩm mỹ
    const isCreativeGated = videoDeliv && videoDeliv.status === 'qc_passed_pending_boss' && videoDeliv.requiresBossApproval === true;
    record('TC-B09', 'Sản phẩm Video dừng ở trạng thái qc_passed_pending_boss (Chờ Sếp duyệt thẩm mỹ)', isCreativeGated,
      `Status: ${videoDeliv ? videoDeliv.status : 'N/A'}, RequiresBoss: ${videoDeliv ? videoDeliv.requiresBossApproval : false}`);

    // TC-B10: Sếp duyệt thẩm mỹ -> Chuyển thành approved / DONE và cập nhật Task Board
    const bossApproveRes = await makeRequest('POST', '/api/deliverable/boss-review', {
      deliverableId: videoDeliv.id,
      action: 'approve',
      comment: 'Sếp duyệt âm thanh và visual video remix đạt chuẩn.'
    });
    const approveOk = bossApproveRes.status === 200 && bossApproveRes.data.deliverable && bossApproveRes.data.deliverable.status === 'approved';
    record('TC-B10', 'Quy trình Sếp phê duyệt thẩm mỹ chuyển thành công sang APPROVED / DONE', approveOk,
      `Boss Review Status: ${bossApproveRes.data.deliverable ? bossApproveRes.data.deliverable.status : 'N/A'}`);

  } catch (err) {
    console.error('Lỗi kiểm thử:', err);
  }

  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log('================================================================');
  console.log(`📊 TỔNG KẾT: ${passCount}/${totalCount} BÀI TEST PASS (${Math.round((passCount/totalCount)*100)}%)`);
  console.log('================================================================');

  // Ghi kết quả kiểm thử vào file báo cáo
  const outPath = path.join(__dirname, '..', '05_BAO_CAO_VA_KIEM_THU', 'KET_QUA_KIEM_THU_CHATGPT_BRIDGE.json');
  fs.writeFileSync(outPath, JSON.stringify({ summary: { total: totalCount, passed: passCount }, tests: results }, null, 2), 'utf8');
  console.log(`\n💾 Đã lưu kết quả tại: ${outPath}`);
}

runBridgeTestSuite();
