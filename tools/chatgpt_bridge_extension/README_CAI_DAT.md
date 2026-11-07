# HƯỚNG DẪN KẾT NỐI CHATGPT PLUS WEB VỚI VĂN PHÒNG AI STUDIO

Cầu nối này cho phép bạn **sử dụng tài khoản ChatGPT Plus Web ($20/tháng)** trực tiếp làm bộ não điều hành cho **Trưởng phòng**, gửi mọi chỉ đạo từ Dashboard vào thẳng **1 phòng chat cố định trên ChatGPT Web**, hoàn toàn không tốn tiền mua token OpenAI API!

---

## 🚀 3 Bước kích hoạt nhanh (khoảng 30 giây)

### Bước 1: Mở trang quản lý Tiện ích mở rộng trên Chrome
1. Mở trình duyệt Chrome (hoặc Edge / Cốc Cốc / Brave).
2. Nhập vào thanh địa chỉ:
   ```text
   chrome://extensions
   ```
3. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer Mode)** ở góc trên bên phải màn hình.

---

### Bước 2: Nạp Extension Bridge vào Chrome
1. Nhấn nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
2. Chọn đúng thư mục sau:
   ```text
   /Users/quill/Documents/TÀI LIỆU DÙNG CHUNG AI/VAN_PHONG_AI_STUDIO/tools/chatgpt_bridge_extension
   ```
3. Bạn sẽ thấy tiện ích **"Văn Phòng AI Studio - ChatGPT Plus Bridge"** xuất hiện trong danh sách.

---

### Bước 3: Mở Tab ChatGPT Web của Trưởng phòng
1. Truy cập [https://chatgpt.com](https://chatgpt.com).
2. Mở đúng **đoạn chat mà bạn đã tạo riêng cho Trưởng phòng** (ví dụ: `chatgpt.com/c/67xxx-xxxx...`).
3. Nhìn xuống góc dưới bên phải màn hình ChatGPT, bạn sẽ thấy huy hiệu:
   ```text
   🟢 VĂN PHÒNG AI STUDIO
   Đã liên kết Trưởng phòng
   ```

---

## 🎯 Cách hoạt động khi bạn phát lệnh từ Dashboard

1. Mở Dashboard Văn Phòng AI tại: [http://localhost:3333](http://localhost:3333).
2. Tại mục **"Bàn Điều Hành Trưởng Phòng"**, huy hiệu sẽ chuyển sang:
   `🟢 ChatGPT Plus Web: ĐÃ LIÊN KẾT (c/xxxx...)`
3. Bạn nhập chỉ đạo (ví dụ: *"Dựng video 9:16 Kỷ Luật Thép với hook dồn dập và audit SEO"*), rồi nhấn **Phát Lệnh Tác Chiến Cho Trưởng Phòng**.
4. **Hệ thống sẽ tự động:**
   - Đẩy nội dung chỉ đạo vào ô chat ChatGPT Web trên tab bạn đang mở.
   - Nhấn gửi và chờ mô hình ChatGPT Plus (GPT-4o) viết câu trả lời.
   - Trích xuất kế hoạch phân rã và nhân viên phụ trách được chỉ định.
   - Bắn log trực tiếp về màn hình Dashboard.
   - Điều phối Sub-agent kỹ thuật thực thi và chuyển sang QC nghiệm thu!

---

## 💡 Lưu ý quan trọng
- Khi làm việc, bạn chỉ cần giữ tab ChatGPT đó mở trên trình duyệt.
- Bạn hoặc Trưởng phòng có thể xem lại toàn bộ lịch sử trao đổi bất kỳ lúc nào ngay trên giao diện web của ChatGPT.
