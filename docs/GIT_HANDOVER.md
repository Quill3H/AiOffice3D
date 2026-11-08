# Git handover — v4 local office

- Branch: `codex/next-generation-office`.
- Baseline/main lúc bắt đầu: `aee38ba` (`aee38ba fix(script): ensure background process persists with disown`). Working tree ban đầu sạch.
- Commit bàn giao: xem `git rev-parse HEAD`; SHA cụ thể được cung cấp trong tin nhắn bàn giao cùng nhánh này.
- Chưa push, chưa tạo PR, chưa merge main, chưa xóa branch/lịch sử.

## File chính

- Thay `server.js` bằng entrypoint mới; lõi ở `src/store.js`, `src/engine.js`, `src/http.js`.
- Tools, workers, QC và provider ở `src/tools.js`, `src/tool-worker.js`, `src/work.js`, `src/work-worker.js`, `src/qc.js`, `src/providers.js`.
- Thay `public/index.html`; thêm `public/app.js`, `public/style.css`, `PRODUCT.md`, `DESIGN.md`.
- `package.json` không có dependency ngoài; start/stop gọi `tools/lifecycle.js`.
- Test mới trong `tests/`, gồm child fixture thật cho crash.
- README, API, auditbaseline, design/plan, engineering/acceptance/handover và ảnh trong `docs/`.
- Mã/tool/test cũ giữ trong Git và các tệp lịch sử; runtime mới không import hoặc chạy executor cũ.

## Kiểm thử

`npm test`:47/47, không skip. Node 22.23.4/darwinx64. Browser MCP: CSV→QC→revision→v2→approval; source/history, XSSliteral, providerunconfigured; desktop/mobile. Start/stop thật thử trên cổng 3540. Chi tiết ở `ACCEPTANCE.md`.

## Dữ liệu và trạng thái bàn giao

Bảnv4 đang chạy loopback3434 bằng lifecycle script, data chính `.studio/` ban đầu không có task. `.studio/ui-verification` giữ dữ liệu mẫu đã đánh dấu kiểm thử; `.studio/lifecycle-verification` giữ fixture vòng đời đã dừng. Cả `.studio/` cùng key/DB/log/artifact không vào Git.

Tiến trình cũ3333 không bị dừng. Không thay nội dung tài liệu nghiệp vụ ở thư mục cha, không nhập seed approval cũ, không dùng bộ test lịch sử ghi đè dữ liệu. Đăng nhập bản mới bằng `.studio/access-token`; không gửi khóa lên Git hoặc dịch vụ ngoài.

## Rollback an toàn

1. Dùng `./stop.sh` với đúng STUDIO_DATA_DIR để dừng bản v4 và giữ lịch sử.
2. Sao chép toàn bộ data directory đã dừng sang backup riêng có quyền hạn chế; giữ cả fixture nếu cần bằng chứng.
3. Giữ nhánh hiện hành. Có thể tạo checkout riêng từ baseline aee38ba để đối chiếu, không reset-hard/clean/ghi đè workspace.
4. Không chạy serverbaseline như phương án an toàn mặc định vì có các lỗ hổng đã ghi. Rollbackcode không phục hồi dữ liệu bên ngoài repo; không bật script cũ kill -9 theo cổng.

## Chủ dự án cần duyệt trước merge

Phạm vi bản đầu giới hạn, Node >=22.13, bridge cũ tắt, legacy chỉ đọc, cổng và instance chuyển đổi, giới hạn dữ liệu và năng lực tool cụ thể. Bật model/provider, quyền công cụ/mạng ngoài, phát sinh chi phí hoặc public deploy cần quyết định riêng. Không có sự phê duyệt nào được suy ra từ kết quả test 47/47.
