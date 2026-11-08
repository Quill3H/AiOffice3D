# Nghiệm thu kỹ thuật — 08/11/2026

## Extension verified 09/11/2026 — isolated remediation branch

Base f2d9034; branch codex/v4-audit-remediation. The historical47-test/browser evidence below remains historical. Current suite: **81 tests,81 pass,0 fail,0 skip**, Node22.23.4, logs /tmp/aioffice4-slice-verified.log. Source workflow is tested through actual loopback HTTP/SQLite/filesystem with labelled model protocol doubles; **no live Muse/Kimi/local inference and no verified free API quota**. No API expense.

New acceptance evidence: six audit regressions; cloud allowlist/access/protocol/timeout/bounded fallback; persistent dispatch cap, concurrent reservation, startup UNKNOWN; manager plan schema/dependency rejection; literal-source QC rejecting fabricated quotes/citations; durable manager checkpoint; handoffs and ordered per-stage provenance; duplicate task/retry idempotency; queued source startup; source deadline/cancel; unchanged prior artifacts; two actual SIGKILL recovery tests. AWAITING_APPROVAL occurs before explicit current-version test approval; these automated approval requests are fixtures, not CEO business acceptance.

`node scripts/demo-sourced-brief.cjs` independently produces plan.json, brief.json and report.md in a new temporary workspace, prints OFFLINE_PROTOCOL_DOUBLE_NOT_LIVE and leaves approval=null. Demo does not use real external research or a live model. Example fixture URLs identify synthetic evidence only.

Deferred: API-only sourced_brief compose input; arbitrary DAG/parallel specialists; independent live semantic reviewer/retrieval/source authenticity; binary PNG/MP4 implementation (design in docs/design/BINARY_ARTIFACTS.md); capacity/long-duration stress and public deployment. UI changes only correct provider labels now that the gateway can be cloud-backed; layout and forms are preserved. No new visual/browser QA claimed.

Phạm vi: bản nền tảng local v4 trên nhánh `codex/next-generation-office`, macOS **darwin x64**, Node **v22.23.4**. Đây là kiểm thử kỹ thuật của phiên phát triển, không thay mặt người dùng nghiệm thu sản phẩm nghiệp vụ.

## Kết quả tự động

Lệnh: `npm test` → **47 tests, 47 pass, 0 fail, 0 skip**. Các test dùng Node built-ins, fixture/thư mục tạm. Bộ test lịch sử ở root không chạy.

| Bộ test | Số test | Loại bằng chứng |
| --- | ---: | --- |
| `tests/runtime.test.js` | 21 | Integration runtime/filesystem thực; một số timeout/QC failure dùng double ghi nhãn |
| `tests/http.test.js` | 8 | HTTP loopback thật + auth/session/CSRF/reader/SSE/download; provider-only test dùng double ghi nhãn |
| `tests/tools.test.js` | 16 | Tính CSV và QC thực, HTML/runtime, input bounds; protocol provider dùng local HTTP/fetch doubles |
| `tests/restart.test.js` | 1 | Tiến trình con thật, CSV tool thật, SIGKILL, mở lại SQLite, retry cùng task, approval bền vững |
| `tests/lifecycle.test.js` | 1 | Kiểm tra quy tắc nhận diện đúng command, từ chối substring/tiến trình khác |

Đã chạy thêm start → start lần hai → stop thực tế ở port **3540**, data directory `.studio/lifecycle-verification`: instance thứ hai báo đã chạy; stop xác minh đúng PID/entrypoint và dừng mềm. Không dừng dịch vụ khác theo cổng.

## Ma trận yêu cầu

| Điều kiện | Bằng chứng / kết quả |
| --- | --- |
| Task có đầu vào thực tạo kết quả phù hợp | CSV mẫu tổng doanh thu300/chi phí120, JSON/report sinh từ nguồn; file/hash kiểm tra lại |
| Thiếu/sai đầu vào | ThiếuCSV → BLOCKED; sai số cột → FAILED; loại/đường dẫn/lệnh không hợp lệ bị từ chối |
| Artifact thực, không tự DONE | Output bất biến theo UUID/attempt; chờ AWAITING_APPROVAL sau QC |
| QC từ chối sản phẩm lỗi | Sửa số tổng/report/nguồn/rỗng → NEEDS_REVISION; QC failure không được review thành DONE |
| Nhiều vai trò không sai trạng thái | Finance/Content/QC có step, dependency, thời điểm; năm task song song, tối đa hai lượt hoạt động |
| Crash/restart không mất lịch sử | SIGKILL tiến trình con, SQLite giữ nguồn/attempt/events; INTERRUPTED rồi retry v2; DONE tồn tại qua reopen |
| Retry/idempotency | Key bền vững, duplicate tạo/retry không tạo lượt thứ hai; key dùng nội dung khác → conflict |
| Hủy/timeout không có kết quả muộn | Double chậm và HTML gần giới hạn trong worker: không publish/DONE sau cancel/deadline |
| Không duyệt phiên bản cũ/tệp sửa | Version sai →409; hash sai/tệp mất/symlink bị từ chối khi đọc/approve |
| Phạm vi ghi file | DB/WAL/SHM/root/parent symlink và hardlink không được dùng; artifact root symlink bị từ chối trước khi ghi |
| Bảo vệ dữ liệu/role | Anonymous401; reader không POST; Origin/Host/CSRF/Fetch Metadata bị ràng buộc; logout đóng SSE |
| Đầu vào độc hại | Không shell/path API; route đọcfile cũ410; HTML/untrusted text không chèn vào DOM |
| Frontend theo backend | Browser thật xem RUNNING/QC/awaiting/revision/retry/approved; revision tăng ngăn HTTP cũ đè SSE mới |
| Provider/connector không có thật | NOT_CONFIGURED/NOT_CONNECTED/DISABLED, probe phải khớp model, TTL60s, model/finish_reason sai bị từ chối |
| CEO approval bắt buộc | Mọi workflow qua gate, review hiện hành có kiểm tra integrity; chữ ký số/danh tính doanh nghiệp chưa triển khai |
| Lưu QC theo từng lượt | CurrentQC + attempts[n].qc; endpoint lịch sử task riêng và nút xem toàn bộ lịch sử |
| Giới hạn tài nguyên | Queue/task/attempt/quota refusal; reservation trước ghi, HTML/QC worker; không benchmark toàn bộ sức tải |

## Browser MCP: kiểm tra UI thực

Trình duyệt Chrome thật ở **127.0.0.1:3434**, không phải mock DOM. Dữ liệu kiểm thử nằm riêng `.studio/ui-verification`.

Đã thao tác:

1. Mở trang đăng nhập từ app bên ngoài, sign-in bằng key local, không lưu key vào browser storage.
2. Giao mục tiêu CSV mẫu với ba khu vực; nhận hai artifact, mở report và nguồn gốc. Tổng300/120 khớp nguồn.
3. Yêu cầu sửa kèm nhận xét; retry giữ task ID và sinh version 2, bốn artifact gồm cả bản cũ; phê duyệt version 2. Comment ghi rõ đây là kiểm thử tự động, không phải nghiệm thu nghiệp vụ của người dùng.
4. Task cuối trên code mới kiểm tra nút toàn bộ lịch sử:11 sự kiện,1 attempt, QC PASS đọc được từ endpoint có xác thực.
5. Giao system check với brief `<img src=x onerror=window.__studioXss=1>`: `xssExecuted=false`, `injectedImages=0`; UI hiển thị literal và trạng thái chờ duyệt.
6. Kiểm tra provider chưa cấu hình vẫn NOT_CONFIGURED sau probe; bridge DISABLED. Không gửi một prompt nào đến model thật.
7. Viewport desktop 1440×1000 và mobile 390×844; `scrollWidth === innerWidth`, nav có accessible names, list view và modal đóng/xem nguồn hoạt động. Mobile dùng list-first; ảnh detail thấy đầy đủ title/close, timeline, QC.
8. Khởi động instance sạch bằng lifecycle script, data `.studio`, port3434. State trả version4.0.0, **0 task**, localProvider NOT_CONFIGURED, bridge DISABLED, roleCEO. Dữ liệu fixture không nhập vào workspace sử dụng chính.

Ảnh:

- [Desktop office — workspace sạch](screenshots/desktop-office.jpg)
- [Desktop QC/version 2 — dữ liệu kiểm thử](screenshots/desktop-qc.jpg)
- [Mobile office](screenshots/mobile-office.jpg)
- [Mobile task/QC — code cuối](screenshots/mobile-detail.jpg)

Ảnh chụp là bằng chứng bố cục và trạng thái tại thời điểm chụp, không chứng minh toàn bộ accessibility hoặc hiệu năng. Các lỗi console401 trước login là kết quả kiểm tra session chưa xác thực; lỗi403 đầu tiên khi mở trang đã được sửa bằng cách cho phép top-level navigation tới login công khai, vẫn từ chối cross-site API.

## Review độc lập và giới hạn

Review code + ảnh với context mới trả **ship trong phạm vi bản đầu có giới hạn**, không tìm thấy P0/P1 cụ thể trong tree được đọc. Ba góp ý nhỏ đã xử lý: placeholder dùng màu đạt tương phản, probe provider ghi event tăng revision, task có lịch sử riêng và QC từng attempt. Sau sửa, các test bổ sung đã qua RED→GREEN và toàn suite 47/47.

Chưa kiểm chứng: provider/model thật; suy luận, tính đúng nội dung sinh bởi model, nhiềuLLM tự phối hợp, chất lượng sáng tạo/media, full SEO, external MCP, GPU/3D nặng, vận hành public/multiuser/SSO, benchmark 500task/100 MiB, stress lâu dài. Mọi tuyên bố “AI thật” cần một lượt kiểm thử riêng sau khi người dùng cấu hình provider local được kiểm soát.

Tiến trình bản cũ vẫn LISTEN **3333** từ trước phiên làm việc; không bị dừng hoặc chuyển đổi dữ liệu. Mã/security mới chỉ có hiệu lực trong instance v4 ở **3434**. Không xem tiến trình cũ là đã được hot-patch. Báo cáo baseline ghi rõ rủi ro của bản đó.
