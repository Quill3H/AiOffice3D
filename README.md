# VĂN PHÒNG AI STUDIO v3.0 (MULTI-AGENT VERIFIED PLATFORM)

Nền tảng điều phối đa tác nhân AI (Multi-Agent Swarm) có thể kiểm chứng, vận hành ổn định và tạo sản phẩm thực tế theo thời gian thực.

---

## 🌟 TỔNG QUAN HỆ THỐNG

Văn Phòng AI Studio v3.0 chuyển đổi mô hình từ một Dashboard hiển thị hoạt động sang một nền tảng điều hành Multi-Agent hoàn chỉnh:
- **Dashboard thời gian thực:** Web UI trực quan tại `http://localhost:3333`, kết nối qua kênh Server-Sent Events (SSE LIVE) kèm cơ chế đo độ trễ thực tế ($p_{50}, p_{95}, p_{99}$).
- **Cầu nối ChatGPT Plus Web Bridge v1.2.0:** Giao thức Handshake 2 chiều giữa Dashboard và tab ChatGPT Web (`chatgpt.com`), quản trị qua Port dài hạn, message ACK, Correlation ID và Dynamic Watchdog Timer (lên tới 120s), loại bỏ hoàn toàn tình trạng mất kết nối giả khi chuyển tab.
- **Quy trình thi hành có kiểm chứng (Verifiable Execution):** 100% nhiệm vụ tạo ra artifact vật lý có thật (video MP4 render qua FFmpeg chuẩn -14 LUFS, báo cáo Markdown, phân tích SEO HTTP probe thực tế), tuyệt đối không mock, không phát log mô phỏng.
- **Kiểm toán chất lượng độc lập (NV QC Auditor):** Bộ tiêu chuẩn 4 tiêu chí nghiêm ngặt, tự động chấm điểm và phát hiện lỗi kỹ thuật. Đối với sản phẩm sáng tạo (Creative Deliverables), quy trình bắt buộc qua cổng phê duyệt thẩm mỹ cuối cùng của Sếp trước khi chuyển sang trạng thái `DONE`.

---

## 🏛️ MA TRẬN NHÂN SỰ & PHÒNG BAN

| Nhân viên | Vai trò chuyên môn | Công cụ / Động cơ thực thi | Sản phẩm thực tế |
| :--- | :--- | :--- | :--- |
| **Trưởng phòng Điều phối** | Phân tích brief của Sếp, điều phối & giao việc | ChatGPT Plus Web Bridge / Quy tắc chuẩn | Kế hoạch tác chiến & phân rã sub-agent |
| **NV Video & Media** | Kỹ sư Dựng & Hậu kỳ Video Viral 9:16 | FFmpeg, yt-dlp, Concat MCP | Video MP4 dọc 1080x1920, âm thanh -14 LUFS |
| **NV SEO & AI Search** | Chuyên viên Audit Technical SEO & Search AI | HTTP Probe, cURL, Schema Validator | Báo cáo Audit SEO, Core Web Vitals, Schema |
| **NV Kỹ thuật & Dev** | Phát triển phần mềm, DevOps & SRE | Node.js, Git, Bash, CI/CD Engine | Báo cáo Benchmark, kiểm thử sức khỏe hệ thống |
| **NV Thẩm định & QC** | Kiểm toán chất lượng độc lập | `qc_auditor.js` (4 tiêu chí chấm điểm) | Báo cáo kiểm toán, phán quyết PASS/REJECT |

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY

### 1. Yêu cầu môi trường
- **Hệ điều hành:** macOS / Linux.
- **Node.js:** v18.0 trở lên.
- **Công cụ hỗ trợ (tùy chọn cho render video):** `ffmpeg`, `yt-dlp`.

### 2. Khởi động Studio
```bash
# Cấp quyền thực thi và khởi chạy server
chmod +x start.sh stop.sh
./start.sh
```
Truy cập Dashboard tại: [http://localhost:3333](http://localhost:3333)

Để dừng server:
```bash
./stop.sh
```

### 3. Cài đặt Chrome Extension (ChatGPT Web Bridge)
1. Mở Google Chrome, truy cập: `chrome://extensions/`
2. Bật chế độ **Developer mode** (góc trên bên phải).
3. Nhấp **Load unpacked** và chọn thư mục: `tools/chatgpt_bridge_extension/`.
4. Mở tab cuộc trò chuyện Trưởng phòng trên ChatGPT Web (`https://chatgpt.com/`). Huy hiệu nổi màu xanh lục sẽ hiển thị trạng thái `ĐÃ LIÊN KẾT TRƯỞNG PHÒNG`.

---

## 🧪 BỘ KIỂM THỬ TỰ ĐỘNG HÓA (TEST SUITES)

Hệ thống được bảo vệ bởi 2 bộ test suite kiểm chứng độc lập:

```bash
# 1. Kiểm thử trọn vẹn cầu nối ChatGPT Plus Web Bridge & QC Synchronization (10/10 PASS)
node test_bridge_e2e.js

# 2. Kiểm thử nghiệm thu toàn diện hệ thống (10/10 PASS)
node test_verification_suite.js
```

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN

```text
VAN_PHONG_AI_STUDIO/
├── server.js                      # Core HTTP & SSE Server, State Machine, Task Board Sync
├── start.sh / stop.sh             # Scripts quản lý tiến trình an toàn
├── public/                        # Giao diện Dashboard Glassmorphism hiện đại
│   └── index.html                 # Single Page Application Dashboard
├── tools/                         # Bộ công cụ thi hành & kiểm toán
│   ├── chatgpt_bridge_extension/  # Chrome Extension Manifest V3 kết nối ChatGPT Plus
│   ├── chatgpt_bridge.user.js     # Userscript Tampermonkey tương đương
│   ├── real_executor.js           # Bộ thực thi kỹ thuật tạo artifact thực tế
│   └── qc_auditor.js              # Động cơ kiểm toán chất lượng độc lập
├── docs/                          # Hồ sơ kiểm toán & báo cáo nghiệm thu
│   ├── BAO_CAO_KIEM_TOAN_VAN_PHONG_AI.md
│   ├── BAO_CAO_FIX_CHATGPT_BRIDGE.md
│   └── KET_QUA_KIEM_THU_CHATGPT_BRIDGE.json
├── test_bridge_e2e.js             # E2E Bridge & QC Lifecycle Test Suite
└── test_verification_suite.js     # System Acceptance Test Suite
```

---

## 🔒 BẢO MẬT & MINH BẠCH
- Tuân thủ Manifest V3: Giới hạn origin nghiêm ngặt trên `localhost:3333` và `chatgpt.com`.
- Zero Security Bypass: Không can thiệp bộ nhớ trình duyệt, không bypass token, không spoof danh tính.
- Minh bạch 100%: Luôn định danh rõ nguồn gốc quyết định (`CHATGPT_PLUS_WEB` vs `RULE_ENGINE_FALLBACK`).
