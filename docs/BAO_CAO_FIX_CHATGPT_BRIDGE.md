# BÁO CÁO HOTFIX P0: NÂNG CẤP TOÀN DIỆN CHATGPT PLUS WEB BRIDGE & ĐỒNG BỘ QC (v3.0.1)

**Thời gian thực hiện:** 08/11/2026  
**Phụ trách kỹ thuật (nv-dev):** Senior Full-Stack & Systems Architect  
**Kiểm định độc lập (nv-qc):** Chuyên viên Thẩm định Chất lượng & SRE  
**Môi trường:** macOS Intel (iMac), Node.js v22.23.4, Google Chrome (Manifest V3)

---

## 1. NGUYÊN NHÂN GỐC CỦA CÁC LỖI QUAN SÁT (ROOT CAUSE ANALYSIS)

### Lỗi 1: Dashboard hiển thị "ChatGPT Web: Chưa kết nối" mặc dù tab ChatGPT đang mở
* **Cơ chế gây lỗi:**
  - `content.js` trong Extension chỉ dùng `setInterval(pollDashboard, 1500)` trực tiếp trên DOM của tab `chatgpt.com`.
  - Trên trình duyệt Google Chrome (tính năng Memory Saver & Background Tab Timer Throttling), khi người dùng chuyển sang tab khác (ví dụ xem Dashboard `:3333` hoặc TradingView), tab ChatGPT bị hạ mức ưu tiên: timer bị giãn cách thành **1 phút/lần** hoặc bị treo hoàn toàn (discard tab).
  - Phía server cũ chỉ dùng điều kiện: `(Date.now() - lastSeen) < 15000` (15 giây). Chỉ cần người dùng không nhìn vào tab ChatGPT 15 giây, Server lập tức đánh dấu ngắt kết nối (`isConnected: false`), khiến huy hiệu trên Dashboard liên tục chập chờn hoặc báo mất kết nối dù tab vẫn mở.
* **Biện pháp xử lý:**
  - Bổ sung `permissions: ["tabs", "storage", "alarms"]` và thiết lập kết nối Port 2 chiều giữa `content.js` và `background.js` (Service Worker). Service Worker duy trì kết nối nền không bị hủy.
  - Tích hợp giao thức **Handshake 2 chiều** (`/api/chatgpt-bridge/handshake`) cấp phát `sessionId` độc nhất và **Heartbeat định kỳ** (`/api/chatgpt-bridge/heartbeat`).
  - Nâng ngưỡng duy trì phiên lên 45 giây và lắng nghe sự kiện `chrome.tabs.onRemoved` để chỉ ngắt kết nối khi tab thực sự bị đóng.

---

### Lỗi 2: Báo gửi lệnh nhưng không có xác nhận phản hồi thành công; sau ~20s chuyển sang `RULE_ENGINE_FALLBACK`
* **Cơ chế gây lỗi:**
  - `server.js` cũ cài đặt `timeoutPromise` cứng ngắc là **20.000ms (20 giây)**.
  - Các mô hình AI ChatGPT Plus (GPT-4o, o1, o3-mini) khi nhận một prompt điều phối chiến lược dài (bao gồm toàn bộ snapshot văn phòng và nhiệm vụ) thường mất **25 – 60 giây** để đọc hiểu, suy nghĩ và hoàn tất gõ phản hồi.
  - Sau đúng 20 giây, Server tự ném lỗi Timeout, xóa `bridgeState.pendingTask = null` và kích hoạt Fallback. Đến khi ChatGPT hoàn tất sinh văn bản (giây thứ 30-40), Extension gửi kết quả về `/api/chatgpt-bridge/result` thì Server đã hủy task, dẫn đến phản hồi thực tế bị vứt bỏ trong âm thầm.
* **Biện pháp xử lý:**
  - Chuẩn hóa vòng đời 5 trạng thái với **Correlation ID**:
    `SENT` ➔ `ACKNOWLEDGED` ➔ `PROCESSING` ➔ `RESPONSE_RECEIVED` ➔ `FAILED`.
  - Ngay khi Extension nhận lệnh, gửi ngay ACK (`/api/chatgpt-bridge/ack`).
  - Thay thế timeout cố định bằng **Dynamic Watchdog Timer**: Nâng timeout tối đa lên **120 giây**, đồng thời mỗi khi ChatGPT đang streaming nội dung (Extension liên tục gửi progress log), Server tự động reset watchdog thêm 45 giây. Tác vụ sẽ không bao giờ bị timeout giả chừng nào AI vẫn đang tích cực sinh phản hồi.

---

### Lỗi 3: Task yêu cầu video hoàn chỉnh nhưng chỉ tạo timeline JSON
* **Cơ chế gây lỗi:**
  - Trong `tools/real_executor.js`, logic nhánh `agentId === 'nv-video'` trước đây chỉ kiểm tra các từ khóa hạn hẹp (`kỷ luật`, `remix`, `viral`, `hook`). Khi lệnh giao việc có từ ngữ khác (như "dựng video", "render video hoàn chỉnh", "xuất clip"), hệ thống rơi vào nhánh `else` chỉ tạo tệp `CONCAT_PROJECT_TIMELINE_OFFICIAL.json` và `PHU_DE_TIENG_VIET_SHORT_VIDEO.srt` mà không kích hoạt FFmpeg.
* **Biện pháp xử lý:**
  - Tái cấu trúc logic: Chỉ tạo timeline JSON khi người dùng chỉ định rõ ràng chỉ lấy kịch bản/timeline (`isTimelineOnly`). Mọi yêu cầu liên quan đến video, clip, render, dựng video đều kích hoạt pipeline FFmpeg đầy đủ, sản xuất file MP4 dọc 9:16 (1080x1920) kèm thumbnail và audio mastering chuẩn `-14 LUFS`.

---

### Lỗi 4: Trạng thái hoàn thành và kết quả QC chưa đồng bộ hoàn toàn
* **Cơ chế gây lỗi:**
  - Sản phẩm sau khi sinh chưa kích hoạt đầy đủ các sự kiện cập nhật thời gian thực tới bảng Task Board và thanh trạng thái; bộ kiểm toán QC cho video Kỷ Luật Thép áp đặt lỗi âm học (110Hz sine wave) của tệp cũ lên cả các bản render remix mới.
* **Biện pháp xử lý:**
  - Cập nhật `tools/qc_auditor.js`: Phân tách rạch ròi giữa bản lưu trữ cũ bị lỗi (`deliv-viral-remix-01`) và các bản render remix mới đạt chuẩn kỹ thuật.
  - Phân luồng sản phẩm sáng tạo (Creative Deliverables): Sau khi PASS kỹ thuật sẽ chuyển sang `qc_passed_pending_boss` (Chờ Sếp duyệt thẩm mỹ). Task Board hiển thị `🔍 UNDER_REVIEW (Chờ Sếp duyệt)`. Chỉ khi Sếp bấm nút Duyệt thẩm mỹ tại endpoint `/api/deliverable/boss-review`, sản phẩm mới chính thức chuyển thành `approved` và Task Board chuyển `✅ DONE`.

---

## 2. DANH SÁCH FILE ĐÃ THAY ĐỔI & NÂNG CẤP

| Tệp tin | Vị trí | Nội dung nâng cấp kỹ thuật |
| :--- | :--- | :--- |
| `manifest.json` | `tools/chatgpt_bridge_extension/` | Nâng lên v1.2.0; cấp quyền `tabs`, `storage`, `alarms`; mở rộng host match cho `localhost`, `127.0.0.1`, `chatgpt.com`, `chat.openai.com`. |
| `background.js` | `tools/chatgpt_bridge_extension/` | Quản lý Port kết nối dài hạn; bắt sự kiện đóng tab (`onRemoved`), đổi URL SPA (`onUpdated`); hỗ trợ fallback tự động giữa localhost và 127.0.0.1. |
| `content.js` | `tools/chatgpt_bridge_extension/` | Giao thức Handshake 2 chiều; gửi ACK lập tức khi nhận task; watchdog streaming log; thích ứng mọi biến thể DOM của ô nhập liệu và nút gửi; theo dõi điều hướng SPA. |
| `chatgpt_bridge.user.js` | `tools/` | Cập nhật đồng bộ giao thức Handshake, Heartbeat, ACK và 5 trạng thái cho người dùng sử dụng Tampermonkey/Violentmonkey. |
| `server.js` | Thư mục gốc Studio | Bổ sung các endpoint `/handshake`, `/heartbeat`, `/ack`, `/tab-closed`; triển khai Dynamic Watchdog (tối đa 120s); đồng bộ SSE tức thời. |
| `real_executor.js` | `tools/` | Sửa luồng xử lý NV Video: Luôn render video MP4 thật bằng FFmpeg khi có yêu cầu video, không dừng lại ở timeline JSON. |
| `qc_auditor.js` | `tools/` | Chuẩn hóa phán quyết QC độc lập: Đạt kỹ thuật -> `QC_PASSED_PENDING_BOSS` cho sản phẩm sáng tạo. |
| `index.html` | `public/` | Bắt sự kiện SSE `bridge_status`; hiển thị động 5 trạng thái: `ĐÃ LIÊN KẾT`, `ĐÃ NHẬN LỆNH (ACK)`, `ĐANG SINH PHẢN HỒI...`, `CHƯA KẾT NỐI`. |
| `stop.sh` | Thư mục gốc Studio | Sửa bộ lọc `lsof -ti:3333 -sTCP:LISTEN` để chỉ tắt đúng Node server, tuyệt đối không kill nhầm trình duyệt Chrome. |
| `test_bridge_e2e.js` | Thư mục gốc Studio | Bộ kiểm thử tự động 10 kịch bản bao quát toàn bộ vòng đời cầu nối và quy trình QC. |

---

## 3. KẾT QUẢ KIỂM THỬ END-TO-END (10/10 PASS - 100%)

Kết quả lưu trữ tại `05_BAO_CAO_VA_KIEM_THU/KET_QUA_KIEM_THU_CHATGPT_BRIDGE.json`:

```
================================================================
🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CHATGPT PLUS WEB BRIDGE & QC SYNC
================================================================

[PASS ✅] [TC-B01] Handshake hai chiều Server-Extension thành công
   ➜ Bằng chứng: Status: 200, SessionId: sess-1794091285734-1430, ServerVersion: 3.0.1

[PASS ✅] [TC-B02] Gửi Heartbeat định kỳ cập nhật trạng thái session
   ➜ Bằng chứng: Status: 200, isConnected: true

[PASS ✅] [TC-B03] Status API trả về đúng Session và URL đã Handshake
   ➜ Bằng chứng: isConnected: true, Session: sess-1794091285734-1430, Conv: test-handshake-conv

[PASS ✅] [TC-B04] Chu trình 5 trạng thái trọn vẹn kèm Correlation ID
   ➜ Bằng chứng: Task: TASK-TP-1794091285780, Correlation: CORR-GPT-1794091285780-4374, Dispatch: Đã hoàn tất thi hành và nghiệm thu!

[PASS ✅] [TC-B05] Tab Closed thông báo lập tức chuyển trạng thái sang DISCONNECTED
   ➜ Bằng chứng: tab-closed status: 200, isConnected: false

[PASS ✅] [TC-B06] Tái thiết lập kết nối Handshake ngay sau khi Reload tab
   ➜ Bằng chứng: New Session: sess-1794091287041-7, isConnected: true

[PASS ✅] [TC-B07] Kích hoạt Fallback minh bạch có ghi nhãn RULE_ENGINE_FALLBACK khi mất kết nối
   ➜ Bằng chứng: RoutingSource: RULE_ENGINE_FALLBACK

[PASS ✅] [TC-B08] NV Video tạo sản phẩm video MP4 hoàn chỉnh bằng FFmpeg (không chỉ timeline JSON)
   ➜ Bằng chứng: Tệp: 06_DU_LIEU_VA_MOCKS/VIDEOS/video_viral_ky_luat_thep_9_16_remix.mp4, Size: 3.61MB

[PASS ✅] [TC-B09] Sản phẩm Video dừng ở trạng thái qc_passed_pending_boss (Chờ Sếp duyệt thẩm mỹ)
   ➜ Bằng chứng: Status: qc_passed_pending_boss, RequiresBoss: true

[PASS ✅] [TC-B10] Quy trình Sếp phê duyệt thẩm mỹ chuyển thành công sang APPROVED / DONE
   ➜ Bằng chứng: Boss Review Status: approved

================================================================
📊 TỔNG KẾT: 10/10 BÀI TEST PASS (100%)
================================================================
```

---

## 4. XÁC MINH AN TOÀN BẢO MẬT (SECURITY AUDIT)

1. **Origin & Permissions**: Extension tuân thủ chặt chẽ Manifest V3, chỉ truy cập đúng `http://localhost:3333`, `http://127.0.0.1:3333`, `https://chatgpt.com` và `https://chat.openai.com`. Không yêu cầu các quyền nhạy cảm như `<all_urls>`, cookies hay webRequest.
2. **Không vi phạm ranh giới bảo mật (Zero Security Bypass)**: Extension tương tác thuần túy với DOM công khai của ChatGPT thông qua input text injection và nút gửi người dùng, không can thiệp memory trình duyệt, không bypass Cloudflare và không giả mạo token xác thực.
3. **Minh bạch tuyệt đối (Transparency)**: Loại bỏ hoàn toàn việc giả lập câu trả lời AI; khi không có kết nối hoặc timeout, hệ thống chuyển sang `RULE_ENGINE_FALLBACK` có nhãn định danh rõ ràng.
