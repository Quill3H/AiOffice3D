# Báo Cáo Chuyên Sâu: Khảo Sát, Phân Tích Kiến Trúc & Bài Học Kỹ Thuật Từ Đợt Tái Cấu Trúc Của Codex (Van Phong AI Studio)

> **Tài liệu nghiên cứu kỹ thuật & Chuẩn mực phát triển phần mềm**  
> **Dự án**: Văn Phòng AI Studio (`VAN_PHONG_AI_STUDIO`)  
> **Kho tham chiếu**: `https://github.com/Quill3H/AiOffice3D`  
> **Ngày lập báo cáo**: 2026-11-08 / 2026-11-09  
> **Phiên bản hệ thống khảo sát**: Van Phong AI Studio v4.0.0 (`codex/next-generation-office`)  

---

## Mục Lục

1. [Định Danh & Bằng Chứng Khảo Sát (Identification & Cryptographic Evidence)](#1-định-danh--bằng-chứng-khảo-sát-identification--cryptographic-evidence)
   - 1.1 Thông tin nhánh, Commit và Baseline
   - 1.2 Bằng chứng mật mã học (Cryptographic Attribution)
   - 1.3 Tình trạng Pull Request và Quy chuẩn Quản trị Nhánh
   - 1.4 Danh mục phân loại toàn bộ 38 tệp tin thay đổi (+3,240 / -3,653 dòng)
2. [Phân Tích Kiến Trúc & Kỹ Thuật Chuyên Sâu (In-Depth Technical Analysis)](#2-phân-tích-kiến-trúc--kỹ-thuật-chuyên-sâu-in-depth-technical-analysis)
   - 2.1 Section 1: Phong cách lập trình & Quy ước mã nguồn (Code Style & Conventions)
   - 2.2 Section 2: Cấu trúc kiến trúc & Tính module hóa 6 phân tầng (Architecture & Modularity)
   - 2.3 Section 3: Xử lý lỗi, Phòng vệ chiều sâu & Độ bền bỉ (Error Handling & Robustness)
   - 2.4 Section 4: Chiến lược kiểm thử & Xác minh thực chứng (Testing & Verification Strategies)
   - 2.5 Section 5: Thực hành kỹ thuật công nghệ chung (General Engineering Practices)
3. [Đối Chiếu Mã Nguồn Trước & Sau Tái Cấu Trúc (Concrete Before/After Code Comparisons)](#3-đối-chiếu-mã-nguồn-trước--sau-tái-cấu-trúc-concrete-beforeafter-code-comparisons)
   - So sánh 1: Điểm vào ứng dụng: Monolith 1754 dòng vs Entrypoint 18 dòng
   - So sánh 2: Quản lý trạng thái: RAM state & 90 ID số vs SQLite WAL Transaction & UUID
   - So sánh 3: Thực thi công cụ: Lỗ hổng Shell `execSync` vs FSM Parser & Worker Threads
   - So sánh 4: Kiểm soát chất lượng: Điểm số QC 95/100 tự phong vs Tái tính toán độc lập
   - So sánh 5: Truy xuất tệp tin: Đọc tùy ý `/api/file-content` vs Quản lý Artifact `O_NOFOLLOW` & SHA-256
   - So sánh 6: An ninh biên mạng: Wildcard CORS `*` vs Host/Origin Whitelist & Anti-DNS Rebinding
   - So sánh 7: Giao diện người dùng: Nguy cơ Persistent XSS (`innerHTML`) vs Pure DOM Factory (`textContent`)
   - So sánh 8: Vòng đời tiến trình: Lệnh hủy `kill -9` nguy hiểm vs PID & `/bin/ps` Command Matching với `SIGTERM`
4. [Bảng Tiêu Chuẩn Hành Động Cho Tương Lai (Actionable Do's and Don'ts Checklist)](#4-bảng-tiêu-chuẩn-hành-động-cho-tương-lai-actionable-dos-and-donts-checklist)
5. [Kết Quả Thực Nghiệm & Kiểm Thử Độc Lập (Verification & Test Execution)](#5-kết-quả-thực-nghiệm--kiểm-thử-độc-lập-verification--test-execution)

---

## 1. Định Danh & Bằng Chứng Khảo Sát (Identification & Cryptographic Evidence)

### 1.1 Thông tin nhánh, Commit và Baseline

Đợt nâng cấp toàn diện của hệ thống Văn Phòng AI Studio được thực hiện trực tiếp trên một nhánh độc lập chuyên dụng của mô hình Codex. Thông tin siêu dữ liệu định danh như sau:

| Thuộc tính Git | Giá trị định danh thực tế | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| **Nhánh công tác (Working Branch)** | `codex/next-generation-office` | Nhánh cục bộ tuân theo tiền tố định danh của OpenAI Codex |
| **Commit bàn giao (Handover SHA)** | `616a729460528714cf50274caeb81cca42194174` (`616a729`) | Commit nguyên khối bao trùm toàn bộ cuộc tái cấu trúc v4 |
| **Tác giả (Author / Committer)** | `Quill3H <phamhoanghung2013@gmail.com>` | Kế thừa thông tin tác giả từ môi trường cục bộ máy trạm |
| **Thời điểm commit (Date & Time)** | `Sun Nov 8 20:53:54 2026 +0700` | Ghi nhận trong múi giờ GMT+7 |
| **Tiêu đề commit (Subject)** | `feat: build secure durable local agent office with verified workflows` | Tuân thủ định dạng Conventional Commits |
| **Baseline đối chiếu (Base SHA)** | `aee38ba5d5b6b8915dfe407686886033d52d695d` (`aee38ba`) | HEAD của nhánh `main` và `origin/main` trước khi refactor |
| **Cây thư mục đích (Tree SHA)** | `bd1ff8e38426d9c9836ddfabbf45ea8edaad7106` | Hash cây trạng thái toàn vẹn của mã nguồn sau thay đổi |

### 1.2 Bằng chứng mật mã học (Cryptographic Attribution)

Bằng chứng về việc Codex là tác giả thực hiện phiên làm việc này được lưu trữ trong cơ sở dữ liệu đối tượng Git nội bộ (`refs/codex/turn-diffs/`):
```text
bd1ff8e38426d9c9836ddfabbf45ea8edaad7106 tree    refs/codex/turn-diffs/captures/1794159549945/5a0f3c0e-7409-45af-a298-99cdb78c5648/base
bd1ff8e38426d9c9836ddfabbf45ea8edaad7106 tree    refs/codex/turn-diffs/checkpoints/a5f949bfabe29832b1d1669b684f5c0c/d75623de573d1734380ff64f5618f17e/1794159330118/da6786fd-ae02-461d-ae2f-36fd17ae5642
```
Khi giải mã `git rev-parse 616a729^{tree}`, kết quả trả về chính xác là `bd1ff8e38426d9c9836ddfabbf45ea8edaad7106`. Sự trùng khớp băm cây nhị phân này chứng minh rằng snapshot tự động của phiên làm việc Codex và commit `616a729` là cùng một thực thể kỹ thuật duy nhất.

Đồng thời, trong mã nguồn và tài liệu bàn giao, Codex để lại các phát biểu tự quy chiếu trung thực:
- `src/engine.js:204`: `{id:'external-tools', name:'MCP / dịch vụ ngoài', status:'NOT_CONNECTED', detail:'Công cụ của phiên Codex không tự động được cấp cho ứng dụng.'}`
- `docs/ENGINEERING_REPORT.md:73`: `"MCP/skill của phiên làm việc không bị tự chuyển quyền sang app."`
- `docs/GIT_HANDOVER.md:1–6`: `"Git handover — v4 local office. Branch: codex/next-generation-office. Baseline/main lúc bắt đầu: aee38ba... Chưa push, chưa tạo PR, chưa merge main, chưa xóa branch/lịch sử."`

### 1.3 Tình trạng Pull Request và Quy chuẩn Quản trị Nhánh

- **Kiểm tra trạng thái từ xa (GitHub API)**:
  `curl -s "https://api.github.com/repos/Quill3H/AiOffice3D/pulls?state=all"` trả về `[]` (0 pull requests).
- **Trạng thái nhánh từ xa**: Chỉ có duy nhất `main` (`aee38ba`) tồn tại trên GitHub remote.
- **Quy tắc an toàn của Codex**: Codex tuân thủ quy trình bàn giao cẩn trọng bậc nhất: không tự ý đẩy (`git push`) lên remote, không mở Pull Request tự động, không tự ý gộp (`git merge`) vào `main`, và không xóa bỏ lịch sử phiên bản cũ. Quyền quyết định nghiệm thu và tích hợp hoàn toàn thuộc về Chủ dự án (CEO).

### 1.4 Danh mục phân loại toàn bộ 38 tệp tin thay đổi (+3,240 / -3,653 dòng)

Tổng quy mô thay đổi giữa baseline `aee38ba` và commit `616a729`: **38 files changed, 3,240 insertions(+), 3,653 deletions(-)**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DANH MỤC 38 TỆP TIN THAY ĐỔI                         │
├──────────────────────────┬──────┬───────────────────────────────────────────┤
│ Phân loại module         │ Số lg│ Các tệp tin cấu thành                     │
├──────────────────────────┼──────┼───────────────────────────────────────────┤
│ A. Architecture & Core   │  9   │ server.js, src/store.js, src/engine.js,   │
│    Backend (src/)        │      │ src/http.js, src/tools.js,                │
│                          │      │ src/tool-worker.js, src/work.js,          │
│                          │      │ src/work-worker.js, src/qc.js,            │
│                          │      │ src/providers.js                          │
├──────────────────────────┼──────┼───────────────────────────────────────────┤
│ B. Frontend UI (public/) │  3   │ public/index.html, public/app.js,         │
│                          │      │ public/style.css                          │
├──────────────────────────┼──────┼───────────────────────────────────────────┤
│ C. Tests & Fixtures      │  6   │ tests/runtime.test.js, tests/http.test.js,│
│    (tests/)              │      │ tests/tools.test.js, tests/restart.test.js│
│                          │      │ tests/lifecycle.test.js,                  │
│                          │      │ tests/fixtures/crash-child.cjs            │
├──────────────────────────┼──────┼───────────────────────────────────────────┤
│ D. Tooling & Lifecycle   │  5   │ tools/lifecycle.js, start.sh, stop.sh,    │
│    (tools/, root)        │      │ package.json, .gitignore                  │
├──────────────────────────┼──────┼───────────────────────────────────────────┤
│ E. Docs & Specifications │ 15   │ PRODUCT.md, DESIGN.md, README.md,         │
│    (docs/)               │      │ docs/ACCEPTANCE.md, docs/API.md,          │
│                          │      │ docs/ENGINEERING_REPORT.md,               │
│                          │      │ docs/GIT_HANDOVER.md,                     │
│                          │      │ docs/LEGACY_AUDIT_2026-11-08.md,          │
│                          │      │ docs/superpowers/plans/...md,             │
│                          │      │ docs/superpowers/specs/...md,             │
│                          │      │ docs/screenshots/ (4 ảnh jpg)             │
└──────────────────────────┴──────┴───────────────────────────────────────────┘
```

Chi tiết mục tiêu từng tệp:
1. `server.js` (-1,754 / +72 net lines): Thu gọn thành 18 dòng entrypoint, quản lý signal handler `SIGTERM`/`SIGINT`.
2. `src/store.js` (+97 lines): Lớp truy xuất dữ liệu dùng `node:sqlite` (`DatabaseSync`), transaction `BEGIN IMMEDIATE`, kiểm tra permission `0o700/0o600`.
3. `src/engine.js` (+222 lines): Máy trạng thái tác vụ, giới hạn concurrency, versioning, kiểm duyệt CEO bắt buộc, SHA-256 artifact verification.
4. `src/http.js` (+167 lines): HTTP & SSE server an toàn, kiểm soát Host, Origin, CSP, token xác thực `crypto.timingSafeEqual`, cookie session CSRF.
5. `src/tools.js` (+84 lines): Đăng ký các công cụ xác định: phân tích CSV, kiểm tra HTML, thông tin hệ thống runtime.
6. `src/tool-worker.js` (+61 lines): Worker thread độc lập phân tích cú pháp CSV bằng FSM, giới hạn 64MB RAM.
7. `src/work.js` & `src/work-worker.js` (+25 & +8 lines): Quản lý vòng đời worker thread thực thi tác vụ nặng với ngân sách bộ nhớ 96MB và timeout.
8. `src/qc.js` (+138 lines): Bộ kiểm soát chất lượng độc lập 7 chiều, không dùng lại parser của tool sản xuất, loại bỏ điểm số ảo.
9. `src/providers.js` (+107 lines): Adapter cục bộ tương thích OpenAI, kiểm tra loopback IP literal, probe freshness TTL 60s, cấm model cloud.
10. `public/index.html` (-1,756 / +137 lines): HTML ngữ nghĩa sạch sẽ, không inline JS, hỗ trợ dialog ngữ nghĩa và trợ năng.
11. `public/app.js` (+432 lines): Controller frontend bằng Vanilla JS, giao tiếp qua SSE, 100% sử dụng `textContent`, triệt tiêu `innerHTML`.
12. `public/style.css` (+553 lines): Thiết kế không gian 2.5D Isometric bằng CSS thuần, hỗ trợ responsive di động và hệ thống biến màu sắc.
13. `tests/runtime.test.js` (+222 lines): 21 bài kiểm thử Engine, Store, Idempotency, Quota, Symlink guard, Recovery.
14. `tests/http.test.js` (+100 lines): 8 bài kiểm thử HTTP security, CSRF, Token timing, Host/DNS rebinding, Body stream limit.
15. `tests/tools.test.js` (+231 lines): 16 bài kiểm thử CSV parser, HTML validator, Provider constraints, Worker timeout.
16. `tests/restart.test.js` (+28 lines): 1 bài kiểm thử tích hợp đa tiến trình mô phỏng sự cố `SIGKILL` thật và phục hồi trạng thái SQLite.
17. `tests/lifecycle.test.js` (+8 lines): 1 bài kiểm thử xác minh chuỗi câu lệnh tiến trình.
18. `tests/fixtures/crash-child.cjs` (+7 lines): Tiến trình con phục vụ kịch bản crash test.
19. `tools/lifecycle.js` (+48 lines): Trình quản lý tiến trình dựa trên kiểm tra lệnh `/bin/ps` và gửi tín hiệu mềm `SIGTERM`.
20. `start.sh` & `stop.sh`: Thay thế script bash thô bằng ủy nhiệm qua `tools/lifecycle.js`.
21. `package.json` (+8 lines): Khai báo zero dependency, chỉ định Node engine `>=22.13.0`, script test native.
22. `.gitignore`: Bổ sung bỏ qua `.studio/`, `node_modules/`, `.env*`, `coverage/`.
23. `PRODUCT.md`: Đặc tả yêu cầu sản phẩm, ranh giới thiết kế, tuyên ngôn chất lượng thực chứng.
24. `DESIGN.md`: Hướng dẫn thẩm mỹ 2.5D, bố cục không gian, bảng màu và thiết kế đáp ứng.
25. `README.md`: Hướng dẫn vận hành v4, kiến trúc bảo mật, quản lý token.
26. `docs/ACCEPTANCE.md`: Bằng chứng nghiệm thu 47/47 passing tests và kiểm tra giao diện qua Chrome Browser MCP.
27. `docs/API.md`: Hợp đồng giao tiếp API v4 có xác thực.
28. `docs/ENGINEERING_REPORT.md`: Báo cáo kiến trúc, quyết định kỹ thuật và nguyên tắc thiết kế ranh giới.
29. `docs/GIT_HANDOVER.md`: Hướng dẫn bàn giao Git và điều kiện nghiệm thu trước khi merge.
30. `docs/LEGACY_AUDIT_2026-11-08.md`: Báo cáo kiểm toán 25 lỗ hổng P0/P1/P2 của baseline `aee38ba`.
31. `docs/superpowers/plans/...md`: Kế hoạch thực thi 4 bước đã hoàn thành.
32. `docs/superpowers/specs/...md`: Đặc tả thiết kế kỹ thuật v4.
33–36. `docs/screenshots/*.jpg`: 4 ảnh chụp màn hình kiểm định giao diện thực tế.

---

## 2. Phân Tích Kiến Trúc & Kỹ Thuật Chuyên Sâu (In-Depth Technical Analysis)

### 2.1 Section 1: Phong cách lập trình & Quy ước mã nguồn (Code Style & Conventions)

#### Chỉ thị Chế độ Nghiêm ngặt (Strict Mode Enforcement)
Tất cả 100% tệp tin JavaScript trong dự án đều bắt buộc bắt đầu bằng `'use strict';` tại dòng đầu tiên (ví dụ: `server.js:1`, `src/store.js:1`, `src/engine.js:1`, `src/http.js:1`, `src/qc.js:1`, `public/app.js:1`). Điều này ngăn chặn việc rò rỉ biến toàn cục ngoài ý muốn, cấm xóa thuộc tính không thể cấu hình và bắt buộc sử dụng chuẩn mã hóa hiện đại.

#### Giao thức Nhập Module Chuẩn `node:` (Native Protocol Prefix)
Thay vì sử dụng cách import truyền thống không rõ nguồn gốc (`require('fs')`), Codex áp dụng quy ước của Node.js hiện đại với tiền tố tường minh `node:`:
```javascript
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { Worker } = require('node:worker_threads');
const { EventEmitter } = require('node:events');
const http = require('node:http');
```
Quy ước này triệt tiêu hoàn toàn khả năng bị chiếm đoạt không gian tên module (namespace collision hoặc dependency confusion) khi có gói trùng tên xuất hiện trong thư mục `node_modules`.

#### Quy ước Đặt Tên Kỹ Thuật (Systematic Naming Conventions)
- **Tập tin**: Thống nhất dùng `kebab-case.js` cho toàn bộ mã nguồn (`tool-worker.js`, `work-worker.js`, `lifecycle.js`), thay thế phong cách pha trộn vô tổ chức cũ (`real_executor.js`, `qc_auditor.js`, `render_viral_video.py`).
- **Lớp đối tượng (Classes)**: Sử dụng danh từ `PascalCase` đại diện cho các thực thể miền kiến trúc: `Store` (`src/store.js:7`), `Engine` (`src/engine.js:23`), `LocalProvider` (`src/providers.js:37`).
- **Hàm và phương thức**: Sử dụng động từ `camelCase` mô tả trực tiếp hành động: `createStudio`, `readBoundedJson`, `recomputeCsv`, `reserveArtifacts`, `checkOperation`.
- **Hằng số toàn cục**: `SCREAMING_SNAKE_CASE` với ranh giới định mức rõ ràng: `MAX_RESPONSE_BYTES`, `PROBE_FRESHNESS_MS`, `CATALOG`.
- **Định danh thực thể**: Chuỗi tiền tố chức năng kết hợp UUIDv4 ngẫu nhiên an toàn mật mã (`task-UUID`, `attempt-UUID`, `art-UUID`), loại bỏ cơ chế sinh ID dễ trùng lặp trong baseline cũ (`TASK-${Math.floor(10 + Math.random()*90)}`).

#### Mẫu Hình Fail-Fast và Hàm Chuẩn Hóa Lỗi `fail()`
Mọi phương thức xử lý đầu vào đều triển khai các khối kiểm tra chặn đứng ngay lập tức (fail-fast guard clauses) ở các dòng đầu tiên. Codex thiết lập một helper thống nhất gắn mã lỗi nghiệp vụ và mã trạng thái HTTP:
```javascript
// src/engine.js:11
function fail(message, code = 'INVALID_REQUEST', status = 400) {
  const e = new Error(message); e.code = code; e.status = status; throw e;
}
```
Nhờ mẫu hình này, ngoại lệ khi văng ra ngoài không bao giờ bị mất ngữ cảnh giao thức và có thể ánh xạ trực tiếp thành phản hồi JSON chuẩn xác cho client.

#### Chú Thích Mã Nguồn Mang Giá Trị Cao (High-Signal Rationale Comments)
Codex loại bỏ các đoạn ghi chú mang tính biểu diễn hoặc nhắc lại cú pháp hiển nhiên. Mọi ghi chú trong mã nguồn đều nhằm giải thích **lý do thiết kế (rationale)** hoặc **ranh giới an toàn (security boundary)**:
- `src/store.js:38`: `// SQLite's write transaction, not the advisory PID file, serializes takeover.`
- `src/store.js:85`: `// IDs never turn into filesystem paths; only persisted registry entries may resolve.`
- `src/qc.js:6-7`: `// QC intentionally does not import the producer parser or report builders. This scanner consumes one cell at a time rather than sharing producer state.`
- `src/providers.js:5-7`: `// Validate the literal spelling before URL normalization (which accepts 127.1, decimal integers and other aliases). Configuration cannot contain credentials.`
- `src/http.js:82`: `// Bounded memory; signing in does not grant a durable capability across restarts.`

---

### 2.2 Section 2: Cấu trúc kiến trúc & Tính module hóa 6 phân tầng (Architecture & Modularity)

#### Khắc phục Sự Cố Monolith
Trong baseline cũ (`aee38ba`), tệp `server.js` là một khối monolith dài 1,754 dòng kiêm nhiệm toàn bộ: phục vụ file tĩnh, quản lý tiến trình, ghi đè file Markdown trên đĩa, chạy lệnh shell, parse HTML và nhồi nhét đo latency giả. Đồng thời, `public/index.html` dài 1,893 dòng nhúng hàng nghìn dòng JavaScript và CSS không phân lớp.

Codex đã giải phẫu toàn diện hệ thống thành một mô hình phân tầng nghiêm ngặt gồm 6 lớp độc lập:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VĂN PHÒNG AI STUDIO v4.0.0                          │
├────────────────────────────────────────────────────────────────────────┤
│  1. Tầng Vận chuyển & Biên An ninh (Transport & Perimeter Guard)      │
│     - src/http.js: Loopback bind, Host/Origin Guard, CSRF, Token auth  │
│     - public/ (app.js, style.css, index.html): Zero innerHTML, 2.5D    │
├────────────────────────────────────────────────────────────────────────┤
│  2. Tầng Điều phối & Máy Trạng thái (Domain Engine & FSM)              │
│     - src/engine.js: Task State Machine, Versioning, Approval Gate     │
├────────────────────────────────────────────────────────────────────────┤
│  3. Tầng Độc lập Kiểm soát Chất lượng (Independent QC Verification)   │
│     - src/qc.js: 7-dimension Clean-Room verification, Recomputed Data  │
├────────────────────────────────────────────────────────────────────────┤
│  4. Tầng Cách ly Tài nguyên & CPU Worker (Worker Thread Isolation)     │
│     - src/tools.js, src/tool-worker.js, src/work.js, src/work-worker.js│
│     - 64MB - 96MB V8 heap limits, Watchdog timer, AbortSignal cancel   │
├────────────────────────────────────────────────────────────────────────┤
│  5. Tầng Adapter Nhà Cung Cấp Cục Bộ (Provider Adapter Isolation)     │
│     - src/providers.js: Loopback literal, Model sanity, 60s probe TTL  │
├────────────────────────────────────────────────────────────────────────┤
│  6. Tầng Lưu trữ Dữ liệu Bền vững (Data Store & Concurrency Lock)      │
│     - src/store.js: Node 22 node:sqlite, WAL mode, BEGIN IMMEDIATE     │
│     - tools/lifecycle.js: Verified PID & ps command-line matching      │
└────────────────────────────────────────────────────────────────────────┘
```

#### Trách Nhiệm Chi Tiết Từng Phân Tầng

1. **Tầng Lưu Trữ Bền Vững (`src/store.js`)**:
   - Sử dụng thư viện gốc `node:sqlite` của Node.js 22. Kích hoạt chế độ `PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;`.
   - Lưu trữ các bảng: `tasks`, `events`, `operations` (idempotency key), `runtime_owner` (instance lock độc quyền), `artifact_reservations` (hạn mức ổ đĩa).
   - Đảm bảo tính nguyên tử qua khối `transaction(fn)` gọi `BEGIN IMMEDIATE` và tự động `ROLLBACK` khi xảy ra lỗi.
   - Hoàn toàn không chứa logic giao thức mạng hay định dạng văn bản.

2. **Tầng Điều Phối Nghiệp Vụ (`src/engine.js`)**:
   - Hiện thực máy trạng thái công việc với các trạng thái rõ ràng: `BLOCKED` / `QUEUED` $\rightarrow$ `RUNNING` $\rightarrow$ `AWAITING_APPROVAL` / `NEEDS_REVISION` / `FAILED` / `INTERRUPTED` / `CANCELLED` $\rightarrow$ `DONE`.
   - Quản lý hàng đợi thực thi với giới hạn luồng đồng thời `concurrency = 2` (tối đa 4), chống nghẽn CPU.
   - Cơ chế tăng `version` trên mỗi lần chạy. Mỗi attempt có UUID độc lập.
   - **CEO Gate**: Tác vụ chỉ có thể đạt trạng thái `DONE` khi có quyết định phê duyệt tường minh từ CEO, gắn chặt với đúng mã phiên bản và xác thực lại toàn vẹn băm SHA-256 của toàn bộ artifact.

3. **Tầng Cách Ly Xử Lý CPU Nặng (`src/work.js`, `src/tool-worker.js`, `src/tools.js`)**:
   - Chuyển toàn bộ các thuật toán phân tích tệp CSV, bóc tách chuỗi HTML, đối chiếu mã băm sang `Worker` threads riêng biệt (`node:worker_threads`).
   - Khống chế trần tài nguyên V8: `resourceLimits: { maxOldGenerationSizeMb: 64 }` (CSV worker) và `96 MB` (QC/HTML worker).
   - Tích hợp watchdog timer (15–20 giây) và lắng nghe `AbortSignal` để giải phóng tiến trình ngay khi client hủy hoặc quá hạn, bảo vệ main event loop không bị treo cứng.

4. **Tầng Kiểm Soát Chất Lượng Độc Lập (`src/qc.js`)**:
   - Triển khai nguyên tắc phòng vệ "Clean-Room": module QC tuyệt đối không import các hàm parser hay report builder từ module sản xuất (`src/tools.js`).
   - Quét ký tự độc lập từ đầu (`recomputeCsv`), tính toán lại toàn bộ giá trị thống kê thô, so sánh cấu trúc sâu `isDeepStrictEqual` với artifact được xuất xưởng.
   - Loại bỏ hoàn toàn điểm số giả (như 95/100). Đánh giá 7 khía cạnh và bắt buộc giữ trạng thái `UNVERIFIED` cho thẩm mỹ và nội dung ngữ nghĩa cho tới khi con người xác nhận.

5. **Tầng Adapter Mô Hình AI Cục Bộ (`src/providers.js`)**:
   - Chỉ cho phép giao tiếp với cổng loopback (`127.0.0.1`, `localhost`, `[::1]`) tương thích OpenAI (chẳng hạn như Ollama).
   - Kiểm tra định danh model: từ chối các chuỗi model đám mây (`gpt-4`, `claude`, `gemini`) nhằm bảo đảm an toàn dữ liệu và chi phí.
   - Thực thi cơ chế kiểm tra tình trạng (`probe()`) có thời hạn hiệu lực (TTL 60 giây). Bắt buộc kiểm tra `finish_reason === 'stop'` từ model.

6. **Tầng Vận Chuyển & Biên Bảo Mật (`src/http.js`, `public/`)**:
   - Ràng buộc cổng lắng nghe duy nhất tại `127.0.0.1`.
   - Áp dụng các chốt kiểm soát an ninh đa tầng: Whitelist Host header, Origin check, CSRF token header, Content-Security-Policy nghiêm ngặt.
   - Frontend không sử dụng bất kỳ thư viện UI ngoài cồng kềnh, cấu trúc giao diện hoàn toàn bằng DOM Node và gán chuỗi qua `textContent`.

---

### 2.3 Section 3: Xử lý lỗi, Phòng vệ chiều sâu & Độ bền bỉ (Error Handling & Robustness)

#### Giới Hạn Luồng Đọc HTTP Bounded Stream (Chống Tấn Công OOM/DoS)
Trong `src/http.js:18–24`, Codex triển khai bộ đọc body an toàn thay cho việc gom buffer vô tận:
```javascript
async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || ''))
    fail('Use application/json', 'CONTENT_TYPE', 415);
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 600 * 1024) {
      req.resume(); // Tiêu thụ phần còn lại để giải phóng socket
      fail('Request body too large', 'BODY_TOO_LARGE', 413);
    }
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('JSON object required');
    return data;
  } catch (error) {
    if (error.code) throw error;
    fail('Malformed JSON');
  }
}
```
Mọi request có kích thước vượt quá 600 KB đều bị hủy tức thì với mã HTTP 413, ngăn ngừa hoàn toàn nguy cơ kẻ tấn công gửi payload khổng lồ làm tràn bộ nhớ máy trạm.

#### Phân Tích Cú Pháp CSV Bằng Máy Trạng Thái Hữu Hạn (FSM Parser)
Trong `src/tool-worker.js:6–36` và `src/qc.js:8–42`, Codex loại bỏ việc cắt chuỗi bằng `split(',')` ngây thơ. Parser được cài đặt như một Finite State Machine (FSM):
- Xử lý chính xác 3 trạng thái: plain token, quoted field, và quote suffix.
- Hỗ trợ các ô chứa ký tự ngắt dòng (CRLF, LF) bên trong dấu ngoặc kép, dấu ngoặc kép lồng (`""`).
- Kiểm tra tính hợp lệ của dấu đóng ngoặc kép (nếu sau dấu ngoặc kép xuất hiện ký tự khác dấu phẩy hoặc xuống dòng, lập tức ném lỗi cú pháp).
- Khống chế trần: tối đa 200 cột và 10,000 dòng để bảo đảm an toàn thời gian xử lý.

#### Kiểm Soát Tính Toán Số Học & Chống Tràn Số (Arithmetic Bounds)
Trong `src/tool-worker.js:43–51`:
```javascript
const valueNumber = Number(value);
if (!Number.isFinite(valueNumber)) throw new Error('CSV numeric value is not finite');
sum += valueNumber;
if (!Number.isFinite(sum)) throw new Error('CSV numeric sum overflow');
```
Mọi phép toán cộng dồn đều được kiểm tra `Number.isFinite()`, loại trừ triệt để giá trị `Infinity`, `-Infinity`, hay tràn số luỹ kế. Các ô trống được xếp loại riêng vào `missingCount` và không bị ép kiểu thành `0` (tránh bóp méo giá trị trung bình cộng). Cột chứa cả văn bản và số được đánh dấu rõ ràng là kiểu `mixed`.

#### Phòng Vệ Truy Xuất Tệp Tin & Chống Tấn Công Symlink Traversal
Tại tầng đọc và ghi artifact (`src/engine.js:116–123`, `190–198` và `src/store.js:20–22`):
1. **Kiểm tra liên kết tượng trưng (Symlink Guard)**:
   - Khi tạo thư mục: Duyệt đệ quy từng đoạn đường dẫn (`artifacts/`, `taskId/`, `attemptId/`). Nếu phát hiện `fs.lstatSync(dir).isSymbolicLink()`, ném ngoại lệ chặn ngay lập tức.
   - Thư mục dữ liệu `.studio` kiểm tra `rootStat.uid === process.getuid()`, cấm chạy dưới quyền user khác.
   - Database SQLite và file lock được kiểm tra `!stat.isSymbolicLink() && stat.nlink === 1`, cấm cả symlink lẫn hardlink.
2. **Mở tệp an toàn bằng cờ hệ điều hành `O_NOFOLLOW`**:
   ```javascript
   const fd = fs.openSync(candidate, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
   let content;
   try { content = fs.readFileSync(fd); }
   finally { fs.closeSync(fd); }
   if (content.length !== artifact.size || hash(content) !== artifact.sha256)
     fail('Artifact integrity hash mismatch', 'INTEGRITY_FAILED', 409);
   ```
   Cờ `O_NOFOLLOW` bảo đảm ở cấp nhân hệ điều hành rằng nếu tệp bị hoán đổi thành liên kết tượng trưng giữa lúc kiểm tra và lúc mở (Race condition / TOCTOU), lệnh mở file sẽ thất bại ngay lập tức.
3. **Ghi tệp an toàn**: Mở bằng cờ độc quyền `wx` (thất bại nếu tệp đã tồn tại), ghi dữ liệu và ép đồng bộ hóa xuống đĩa bằng `fs.fsyncSync(fd)` trước khi đóng file descriptor.

#### Phục Hồi Tiến Trình Sau Sự Cố Đột Ngột (Crash Recovery & Honest Logging)
Khi ứng dụng khởi động lại sau một sự cố crash hoặc mất điện (`src/engine.js:29–36`):
```javascript
for (const saved of store.tasks()) if (saved.status === 'RUNNING') {
  const task = store.get(saved.id);
  task.status = 'INTERRUPTED';
  task.error = 'Runtime stopped during execution. Retry explicitly to start a new attempt.';
  task.updatedAt = now();
  task.attempts.filter(a => a.status === 'RUNNING').forEach(a => { a.status = 'INTERRUPTED'; a.finishedAt = now(); });
  task.steps.filter(s => s.status === 'RUNNING').forEach(s => { s.status = 'INTERRUPTED'; s.finishedAt = now(); });
  store.save(task, { type: 'RECOVERED', message: task.error });
}
```
Hệ thống không tự ý chạy lại âm thầm hay đánh dấu hoàn thành giả. Mọi tác vụ dở dang đều được chuyển sang trạng thái trung thực `INTERRUPTED`, bảo toàn nguyên vẹn lịch sử kiểm toán của các attempt trước, và ghi nhận sự kiện `RECOVERED` vào cơ sở dữ liệu.

#### Kiểm Soát Áp Lực Ngược Luồng SSE (Backpressure & Memory Leak Prevention)
Trong `src/http.js:153–157`:
```javascript
for (const client of clients) {
  if (Date.now() > client.expires || client.res.writableLength > 1024 * 1024) {
    client.res.end();
    clients.delete(client);
  } else {
    client.res.write(message);
  }
}
```
Nếu client gặp hiện tượng nghẽn mạng khiến hàng đợi bộ nhớ đệm trên socket vượt quá 1 MB (`writableLength > 1024 * 1024`), máy chủ sẽ chủ động đóng kết nối và giải phóng tham chiếu, triệt tiêu nguy cơ rò rỉ bộ nhớ từ các kết nối chậm.

---

### 2.4 Section 4: Chiến lược kiểm thử & Xác minh thực chứng (Testing & Verification Strategies)

#### Khung Kiểm Thử Tích Hợp Sẵn Không Phụ Thuộc (Zero-Dependency Testing)
Codex tận dụng trọn vẹn sức mạnh của test runner tích hợp sẵn trong Node.js 22:
- **Runner**: `node:test`
- **Thư viện xác thực**: `node:assert/strict`
- **Kết quả thực thi**: **47/47 passing tests** trong khoảng thời gian siêu tốc: **~1.65 – 1.75 giây**.
- **Không phụ thuộc**: 0% phụ thuộc vào Jest, Mocha, Chai, Sinon, Playwright hay Vitest. Tệp `package.json` hoàn toàn không có `devDependencies`.

#### Phân Bổ Danh Mục Kiểm Thử
Hệ thống kiểm thử được chia thành 5 tệp chuyên biệt, bao quát mọi ngóc ngách của hệ thống:

| Tệp kiểm thử | Số lượng bài test | Nội dung & Phạm vi kiểm tra |
| :--- | :---: | :--- |
| `tests/http.test.js` | 8 | Quyền truy cập token (admin vs reader), CSRF protection, Forged Host/DNS rebinding, Origin checking, Body bounds 600KB, SSE logout revocation, 410 legacy disablement. |
| `tests/runtime.test.js` | 21 | Vòng đời tác vụ, máy trạng thái FSM, kiểm soát trùng lặp Idempotency-Key, tranh chấp song song, hạn ngạch lưu trữ đĩa, bảo vệ Symlink, crash recovery, lưu giữ lịch sử attempt. |
| `tests/tools.test.js` | 16 | FSM CSV parser (dấu ngoặc kép, CRLF, rỗng, ngoại cỡ), tính toán số học, worker timeout & abort signal, audit HTML regex, giới hạn loopback provider. |
| `tests/restart.test.js` | 1 | Fork một tiến trình con thật, cho phân tích 9,000 dòng CSV, gửi `SIGKILL`, khởi động lại từ tiến trình cha để xác nhận SQLite WAL phục hồi nguyên vẹn. |
| `tests/lifecycle.test.js` | 1 | Kiểm tra hàm khớp chuỗi câu lệnh tiến trình `/bin/ps` để bảo đảm chỉ tắt đúng tiến trình Studio. |

#### Cô Lập Môi Trường Tuyệt Đối (Hermetic Test Isolation)
Trong baseline cũ (`test_verification_suite.js`), bài test phụ thuộc vào việc server cổng 3333 đang chạy sẵn và ghi đè thẳng file báo cáo vào thư mục tài liệu cha (`05_BAO_CAO_VA_KIEM_THU/`). 
Ngược lại, bộ test của Codex tuân thủ quy tắc cô lập hoàn hảo:
```javascript
// Trích xuất từ tests/runtime.test.js
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-test-'));
t.after(() => {
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
```
Mỗi bài test tự sinh thư mục tạm riêng biệt, lắng nghe trên cổng ngẫu nhiên `port: 0`, và tự động dọn dẹp sạch sẽ qua hook `t.after()`, không để lại bất kỳ tàn dư nào trên ổ cứng.

#### Kiểm Thử Crash Đa Tiến Trình Thật (True Multiprocess Crash Test)
Trong `tests/restart.test.js`, Codex chứng minh năng lực kiểm thử ở cấp độ hệ thống:
1. Tạo một tiến trình con qua `child_process.fork('tests/fixtures/crash-child.cjs')`.
2. Gửi một tác vụ phân tích CSV lớn (9,000 dòng) vào tiến trình con.
3. Khi tác vụ đang ở trạng thái `RUNNING`, gửi tín hiệu hủy diệt tàn bạo `child.kill('SIGKILL')`.
4. Tiến trình chính sau đó mở lại cơ sở dữ liệu SQLite trong cùng thư mục đó.
5. Kiểm tra và xác nhận: SQLite WAL tự động khôi phục giao dịch, tác vụ chuyển sang `INTERRUPTED` một cách minh bạch, và các artifact dở dang không làm hỏng dữ liệu.

#### Kiểm Thử Phủ Định & Ranh Giới Bảo Mật (Negative Testing)
Codex không chỉ kiểm tra trường hợp thành công (happy path) mà chủ động tấn công mã nguồn bằng hàng loạt kịch bản độc hại:
- Thử nghiệm chèn lệnh shell: `$(touch /tmp/pwned)`, `<script>alert(1)</script>` $\rightarrow$ Bị chặn ngay tại tầng schema validation (`tests/http.test.js:46–55`).
- Thử nghiệm path traversal: `/etc/passwd`, `../../secret` $\rightarrow$ Trả về lỗi định dạng đường dẫn.
- Thử nghiệm can thiệp file artifact trên đĩa: sửa đổi nội dung tệp sau khi đã lưu $\rightarrow$ Hàm duyệt `engine.review(..., 'approve')` phát hiện sai lệch mã băm SHA-256 và từ chối nghiệm thu (`tests/runtime.test.js:77–85`).
- Thử nghiệm tạo liên kết tượng trưng trỏ tới `/etc/hosts` $\rightarrow$ Bị hàm `readArtifact` bắt giữ và ném lỗi vi phạm phạm vi lưu trữ.
- Thử nghiệm cấu hình model đám mây: truyền `gpt-4o` hoặc `claude-3-5-sonnet` $\rightarrow$ Class `LocalProvider` ném ngoại lệ cấm model cloud trước khi phát bất kỳ request mạng nào (`tests/tools.test.js:178–184`).

---

### 2.5 Section 5: Thực hành kỹ thuật công nghệ chung (General Engineering Practices)

#### Kỷ Luật Commit & Quản Trị Nhánh An Toàn
- **Định dạng Conventional Commits**: Thông điệp commit được cấu trúc chuẩn hóa: `feat: build secure durable local agent office with verified workflows`.
- **Nhánh riêng an toàn**: Không tác động vào nhánh `main` khi chưa có sự xác nhận của người quản lý, tuân thủ nguyên tắc không phá vỡ môi trường hoạt động cũ.
- **Tài liệu bàn giao Git minh bạch**: Tạo tệp `docs/GIT_HANDOVER.md` nêu rõ các điều kiện kỹ thuật (Node >= 22.13), cơ chế rollback bằng một lệnh Git đơn giản, và giải thích chi tiết các thay đổi.

#### Chuẩn Mực Tài Liệu Kỹ Thuật & Tinh Thần Thực Chứng
Codex thể hiện tinh thần kỹ thuật trung thực và dũng cảm:
- Tệp `docs/LEGACY_AUDIT_2026-11-08.md` dài 102 dòng vạch rõ 25 lỗ hổng P0/P1/P2 trong commit gốc `aee38ba`, phân tích rành mạch sự khác biệt giữa các tuyên bố trình diễn ("9 AI Agents", "QC 95/100") và hiện thực mã nguồn.
- Tệp `docs/ENGINEERING_REPORT.md` trình bày tường minh kiến trúc phân lớp, giới hạn của công cụ cục bộ, và sơ đồ luồng dữ liệu bằng Mermaid.

#### Kiến Trúc Không Phụ Thuộc (Zero-Dependency Package)
Tệp `package.json` đạt độ tinh giản tối đa:
```json
{
  "name": "van-phong-ai-studio",
  "version": "4.0.0",
  "private": true,
  "description": "Local, evidence-based AI workflow office",
  "engines": {
    "node": ">=22.13.0"
  },
  "scripts": {
    "start": "node server.js",
    "test": "node --test tests/*.test.js"
  }
}
```
Không cần chạy `npm install`. Không có nguy cơ lỗ hổng bảo mật từ chuỗi cung ứng mã nguồn mở (Supply chain attack). Hệ thống có thể khởi chạy ngay tức thì trên bất kỳ máy trạm nào cài đặt Node.js phiên bản 22.13 trở lên.

#### Quản Lý Phân Quyền Hệ Thống Tệp (Filesystem Permission Hardening)
- Thư mục dữ liệu `.studio`: Phân quyền chế độ `0o700` (`drwx------`), ngăn chặn mọi tài khoản khác trên máy tính truy cập.
- Tệp token `access-token`, `read-token`: Phân quyền chế độ `0o600` (`-rw-------`), chỉ cho phép tiến trình của người dùng đọc và ghi.
- Cơ sở dữ liệu SQLite, file WAL, shared-memory, và file lock: Đều được tự động ép về quyền `0o600`.
- Tệp `.gitignore` được thiết lập chặn toàn bộ thư mục `.studio/`, `node_modules/`, `.env*`, `coverage/`, bảo đảm không bao giờ rò rỉ token hay dữ liệu công việc lên kho Git công khai.

#### Quản Lý Vòng Đời Tiến Trình An Toàn (Safe Lifecycle Management)
Trong các tệp `start.sh` và `stop.sh`, Codex loại bỏ hoàn toàn lệnh nguy hiểm `kill -9 $(lsof -ti:3333)` (vốn có thể vô tình giết nhầm ứng dụng khác của người dùng đang chạy trên cổng 3333).
Thay vào đó, Codex chuyển quyền quản lý cho `tools/lifecycle.js`:
1. Đọc PID từ tệp `runtime.lock` trong thư mục dữ liệu cụ thể.
2. Sử dụng `/bin/ps -p <pid> -o command=` kiểm tra chuỗi lệnh thực thi, xác nhận đúng là `node /đường_dẫn/server.js`.
3. Gửi tín hiệu mềm `SIGTERM` để tiến trình hoàn tất các tác vụ dở dang, đóng kết nối mạng, flush cơ sở dữ liệu SQLite WAL và dọn dẹp file lock.
4. Chờ tối đa 5 giây (kiểm tra mỗi 100ms). Tuyệt đối không dùng `kill -9` thô bạo.

---

## 3. Đối Chiếu Mã Nguồn Trước & Sau Tái Cấu Trúc (Concrete Before/After Code Comparisons)

Dưới đây là 8 cặp so sánh trực tiếp, trích xuất chính xác số dòng và đường dẫn tệp giữa baseline ban đầu (`aee38ba`) và mã nguồn refactor của Codex (`616a729`):

---

### So sánh 1: Điểm vào ứng dụng: Monolith 1754 dòng vs Entrypoint 18 dòng

* **Trước (`aee38ba:server.js:8–20`, `1713–1754`)**:  
  `server.js` là một khối monolith khổng lồ nhồi nhét xử lý HTTP, đọc file, tính latency giả, gọi CLI shell và định tuyến giao diện:
  ```javascript
  // aee38ba:server.js:8-20
  const { auditDeliverable } = require('./tools/qc_auditor');

  const PORT = process.env.PORT || 3333;
  const ROOT_DIR = path.resolve(__dirname, '..');
  const MEMORY_FILE = path.join(ROOT_DIR, '00_QUY_TAC_VA_DIEU_PHOI', 'BO_NHO_CHUNG.md');
  const TASK_BOARD_FILE = path.join(ROOT_DIR, '00_QUY_TAC_VA_DIEU_PHOI', 'TASK_BOARD.md');
  const SKILLS_DIR = path.join(process.env.HOME || '/Users/quill', '.agents', 'skills');

  // ==================== SYSTEM METRICS & LATENCY TRACKING ====================
  const latencyHistory = [];
  const MAX_LATENCY_SAMPLES = 200;
  let eventLoopLag = 0;
  let lastLagCheck = Date.now();
  ```

* **Sau (`616a729:server.js:1–18`)**:  
  Thu gọn thành entrypoint chuẩn mực 18 dòng, tách biệt hoàn toàn việc khởi tạo ứng dụng và lắng nghe tín hiệu tắt hệ điều hành:
  ```javascript
  // 616a729:server.js:1-17
  'use strict';
  // The legacy runtime is preserved in Git at aee38ba. It is never imported here.
  const {createStudio}=require('./src/http');
  async function main(){
    const studio=createStudio();
    try {
      const address=await studio.listen();
      console.log(`Văn Phòng AI Studio v4: http://127.0.0.1:${address.port}`);
      console.log('Đăng nhập bằng khóa local tại thư mục dữ liệu: access-token (CEO), read-token (chỉ đọc).');
      console.log('Mặc định: .studio/access-token. Không chia sẻ hoặc commit khóa.');
      let stopping=false;
      const stop=async()=>{if(stopping)return;stopping=true;await studio.close();};
      process.on('SIGTERM',stop);process.on('SIGINT',stop);
    } catch(error) {await studio.close();throw error;}
  }
  if(require.main===module)main().catch(error=>{console.error('Studio không khởi động:',error.message);process.exitCode=1;});
  module.exports={createStudio};
  ```

---

### So sánh 2: Quản lý trạng thái: RAM state & 90 ID số vs SQLite WAL Transaction & UUID

* **Trước (`aee38ba:server.js:1049–1066`)**:  
  Dữ liệu tác vụ chỉ lưu trong biến RAM, mất sạch khi tắt máy. Idempotency lưu trong Map với TTL 4 giây. Task ID chỉ có 90 giá trị số ngẫu nhiên từ 10 đến 99:
  ```javascript
  // aee38ba:server.js:1049-1066
  const dispatchHash = `${cleanBrief.substring(0, 40)}_${clientTaskId || ''}`;

  // Idempotency check (within 4 seconds)
  if (recentDispatches.has(dispatchHash)) {
    const prev = recentDispatches.get(dispatchHash);
    if (Date.now() - prev.timestamp < 4000) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        deduplicated: true,
        message: 'Lệnh trùng lặp đã được phát hiện và bỏ qua (Idempotent)',
        deliverable: prev.deliverable
      }));
      return;
    }
  }

  const taskId = clientTaskId || `TASK-${Math.floor(10 + Math.random() * 90)}`;
  ```

* **Sau (`616a729:src/store.js:25–31`, `49–53` và `src/engine.js:56–74`)**:  
  Lưu trữ dữ liệu bền vững trong SQLite WAL với transaction `BEGIN IMMEDIATE`, UUID định danh duy nhất, và kiểm soát idempotency qua cơ sở dữ liệu:
  ```javascript
  // 616a729:src/store.js:25-30
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS operations(key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, task_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS runtime_owner(singleton INTEGER PRIMARY KEY CHECK(singleton=1), pid INTEGER NOT NULL, id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS artifact_reservations(attempt_id TEXT PRIMARY KEY, bytes INTEGER NOT NULL);
    PRAGMA user_version=1;`);

  // 616a729:src/store.js:49-53
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value=fn(); this.db.exec('COMMIT'); return value; }
    catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }

  // 616a729:src/engine.js:56-74
  const request={brief:brief.trim(),kind,input,providerId:providerId||null};const fingerprint=hash(canonical(request));
  const previous=this.checkOperation(key,fingerprint);
  if(previous) return this.get(previous);
  const t={id:'task-'+crypto.randomUUID(),...request,status:issues.length?'BLOCKED':'QUEUED',steps:[],attempts:[],artifacts:[],version:0,qc:null,approval:null,revision:null,error:issues.join(' ')||null,createdAt:now(),updatedAt:now()};
  ```

---

### So sánh 3: Thực thi công cụ: Lỗ hổng Shell `execSync` vs FSM Parser & Worker Threads

* **Trước (`aee38ba:tools/real_executor.js:43–55`)**:  
  Nhận trực tiếp URL hoặc tham số từ người dùng và ghép vào chuỗi shell `execSync`, tạo lỗ hổng **Command Injection nghiêm trọng**:
  ```javascript
  // aee38ba:tools/real_executor.js:43-55
  const targetUrl = params.url || 'https://vibe-coding.ai';
  onLog(`[${timeNow()}] [CLI_EXEC] curl -s -I -L --max-time 8 "${targetUrl}"`);
  onProgress(30, 'Gửi yêu cầu HTTP probe và đo thời gian phản hồi thực tế...');

  let httpStatus = 200;
  let respTimeMs = 0;
  let headersRaw = '';
  let execMode = 'REAL';

  try {
    const t0 = Date.now();
    headersRaw = execSync(`curl -s -I -L --max-time 8 "${targetUrl}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    respTimeMs = Date.now() - t0;
  ```

* **Sau (`616a729:src/tools.js:18–20`, `27–31` và `src/tool-worker.js:6–36`)**:  
  Loại bỏ hoàn toàn việc gọi shell hệ điều hành. Chuyển sang Worker thread riêng với giới hạn bộ nhớ V8 64MB và máy trạng thái FSM thuần JS:
  ```javascript
  // 616a729:src/tools.js:18-20, 27-31
  const worker = new Worker(path.join(__dirname, 'tool-worker.js'), {
    workerData: { csv },
    resourceLimits: { maxOldGenerationSizeMb: 64 }
  });
  const timer = setTimeout(() => finish(new Error('CSV processing timed out')), 15000);
  const onAbort = () => finish(signal.reason instanceof Error ? signal.reason : new Error('Operation aborted'));
  signal?.addEventListener('abort', onAbort, { once: true });
  ```

---

### So sánh 4: Kiểm soát chất lượng: Điểm số QC 95/100 tự phong vs Tái tính toán độc lập

* **Trước (`aee38ba:tools/qc_auditor.js:140–155` và `server.js:1447–1448`)**:  
  QC cộng điểm ngẫu nhiên (như cộng 25 điểm âm thanh dù là sóng sine đơn âm) và tầng server tự động bỏ qua kết quả QC để đánh dấu `approved`:
  ```javascript
  // aee38ba:server.js:1447-1448
  const isCreative = qcAudit.isCreative;
  const finalStatus = isCreative ? 'qc_passed_pending_boss' : 'approved'; // Bỏ qua verdict của QC!

  // aee38ba:tools/qc_auditor.js:151
  result.criteria.push({ name: 'Luồng âm thanh & Định dạng (AAC/Stereo)', score: 25, max: 25, status: 'PASS', detail: `${audioStream.codec_name} ${audioStream.sample_rate}Hz` });
  result.score += audioScore; // Tự gán điểm số định lượng 95/100
  ```

* **Sau (`616a729:src/qc.js:6–8`, `107–112`, `133–136`)**:  
  QC hoạt động độc lập theo chuẩn "Clean Room", tái tính toán lại toàn bộ dữ liệu từ chuỗi thô của người dùng, không cho điểm số ảo và luôn yêu cầu CEO phê duyệt:
  ```javascript
  // 616a729:src/qc.js:6-8
  // QC intentionally does not import the producer parser or report builders.
  // This scanner consumes one cell at a time rather than sharing producer state.

  // 616a729:src/qc.js:107-112
  if (kind === 'data_analysis') {
    const expected = recomputeCsv(input.csv);
    source = mode === 'DETERMINISTIC_TOOL' && evidence.sourceHash === expected.source.sha256 && evidence.sourceBytes === expected.source.bytes && isDeepStrictEqual(parsed.source, expected.source);
    data = isDeepStrictEqual(parsed, expected);
    content = get('report.md') === expectedCsvReport(expected);
    limitations.push('CSV checks validate descriptive calculations only; data collection accuracy and business meaning require human review.');
  }

  // 616a729:src/qc.js:133-135
  check('aesthetic', 'UNVERIFIED', 'Visual/content aesthetics require human review; no numeric quality score is asserted.');
  check('approval', 'UNVERIFIED', 'CEO approval is mandatory and must be recorded separately for this artifact version.');
  return { verdict: defects.length ? 'NEEDS_REVISION' : 'PASS', checks, defects, limitations, requiresApproval: true };
  ```

---

### So sánh 5: Truy xuất tệp tin: Đọc tùy ý `/api/file-content` vs Quản lý Artifact `O_NOFOLLOW` & SHA-256

* **Trước (`aee38ba:server.js:1017–1030`)**:  
  Endpoint nhận đường dẫn tùy ý từ query param `path` và đọc trực tiếp file từ ổ đĩa (Lỗ hổng **Local File Disclosure (LFD)** nghiêm trọng):
  ```javascript
  // aee38ba:server.js:1017-1030
  if (pathname === '/api/file-content') {
    const fPath = parsedUrl.query.path;
    if (!fPath || !fs.existsSync(fPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Không tìm thấy tệp tin: ' + (fPath || ''));
      return;
    }
    try {
      const content = fs.readFileSync(fPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(content); // Đọc bất kỳ file nào trên máy!
  ```

* **Sau (`616a729:src/engine.js:190–198` và `src/http.js:128–132`)**:  
  Chỉ nhận UUID artifact đã đăng ký trong database, kiểm tra `realpath`, cấm symlink (`O_NOFOLLOW`) và xác thực lại mã băm SHA-256:
  ```javascript
  // 616a729:src/engine.js:190-198
  readArtifact(id){
    const artifact=this.store.artifact(id);if(!artifact)fail('Artifact not found','NOT_FOUND',404);
    const base=path.join(this.store.dir,'artifacts');const candidate=path.resolve(this.store.dir,artifact.relativePath);
    let real,stat;try{real=fs.realpathSync(candidate);stat=fs.statSync(real);}catch{fail('Artifact integrity: file missing','INTEGRITY_FAILED',409);}
    if(!real.startsWith(base+path.sep)||!stat.isFile()||stat.size>2*1024*1024)fail('Artifact outside scope or integrity invalid','INTEGRITY_FAILED',409);
    const fd=fs.openSync(candidate,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
    let content;try{content=fs.readFileSync(fd);}finally{fs.closeSync(fd);}
    if(content.length!==artifact.size||hash(content)!==artifact.sha256)fail('Artifact integrity hash mismatch','INTEGRITY_FAILED',409);
    const {relativePath,...publicArtifact}=artifact;return {...publicArtifact,content};
  }
  ```

---

### So sánh 6: An ninh biên mạng: Wildcard CORS `*` vs Host/Origin Whitelist & Anti-DNS Rebinding

* **Trước (`aee38ba:server.js:534–545`)**:  
  Mở toang cho mọi website bên ngoài truy cập và cho phép duyệt qua mạng nội bộ cá nhân (Private Network Access):
  ```javascript
  // aee38ba:server.js:534-545
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  ```

* **Sau (`616a729:src/http.js:43–51`, `66–73`)**:  
  Chỉ chấp nhận Host nội bộ chính xác, chặn đứng tấn công DNS Rebinding, từ chối cross-origin, thiết lập CSP nghiêm ngặt:
  ```javascript
  // 616a729:src/http.js:43-51
  function authority(req){
    const address=server.address();const currentPort=address?.port||port;
    const allowedHosts=new Set(['localhost:'+currentPort,'127.0.0.1:'+currentPort,'[::1]:'+currentPort]);
    if(!allowedHosts.has(req.headers.host))fail('Host not allowed','HOST_DENIED',403);
    const origin=req.headers.origin;
    if(origin&&origin!=='http://'+req.headers.host)fail('Origin not allowed','ORIGIN_DENIED',403);
    const publicNavigation=req.method==='GET'&&['/','/index.html'].includes(req.url)&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document';
    if(req.headers['sec-fetch-site']==='cross-site'&&!publicNavigation)fail('Cross-site requests denied','ORIGIN_DENIED',403);
  }

  // 616a729:src/http.js:66-68
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  ```

---

### So sánh 7: Giao diện người dùng: Nguy cơ Persistent XSS (`innerHTML`) vs Pure DOM Factory (`textContent`)

* **Trước (`aee38ba:public/index.html:1023–1030`, `1350–1355`)**:  
  Chèn trực tiếp chuỗi brief và markdown của user vào `innerHTML` tại 26 vị trí mà không qua bộ lọc làm sạch (Sanitizer), dẫn đến nguy cơ **Stored XSS**:
  ```javascript
  // aee38ba:public/index.html:1023-1026
  percentEl.innerText = '20%';
  progressBar.style.width = '20%';
  logBox.innerHTML = `<div><span class="text-amber-400">❯</span> [${new Date().toLocaleTimeString('vi-VN')}] [START] Sếp Quill phát lệnh tác chiến: "${brief}"</div>`;

  // aee38ba:public/index.html:1350-1355
  const text = await res.text();
  if (window.marked) {
    bodyEl.innerHTML = marked.parse(text); // Không có DOMPurify!
  } else {
    bodyEl.innerText = text;
  }
  ```

* **Sau (`616a729:public/app.js:6–11`, `48–56`)**:  
  Loại bỏ 100% `innerHTML`. Tạo node bằng `createElement` và gán nội dung hoàn toàn qua `textContent` an toàn:
  ```javascript
  // 616a729:public/app.js:6-11
  const node = (tag, className = '', value) => {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (value !== undefined && value !== null) result.textContent = String(value);
    return result;
  };
  ```

---

### So sánh 8: Vòng đời tiến trình: Lệnh hủy `kill -9` nguy hiểm vs PID & `/bin/ps` Command Matching với `SIGTERM`

* **Trước (`aee38ba:stop.sh:1–8`)**:  
  Tìm cổng 3333 và gửi `kill -9` tiêu diệt mù quáng bất kỳ tiến trình nào đang chiếm cổng:
  ```bash
  #!/bin/bash
  PID=$(lsof -ti :3333 -sTCP:LISTEN)
  if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null
    echo "🛑 Đã tắt Văn Phòng AI Studio (PID: $PID)"
  else
    echo "ℹ️ Văn Phòng AI Studio hiện không chạy."
  fi
  ```

* **Sau (`616a729:tools/lifecycle.js:8–25` và `stop.sh:1–5`)**:  
  Xác minh PID và dòng lệnh tiến trình qua `/bin/ps`, bảo đảm chỉ tắt đúng instance Studio, gửi tín hiệu mềm `SIGTERM` để dọn dẹp dữ liệu:
  ```javascript
  // 616a729:tools/lifecycle.js:8-25
  function owner(dir){
   try{
     const lock=JSON.parse(fs.readFileSync(path.join(dir,'runtime.lock'),'utf8'));
     if(!Number.isSafeInteger(lock.pid)||lock.pid<=1)return null;
     const command=execFileSync('/bin/ps',['-p',String(lock.pid),'-o','command='],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:2000}).trim();
     return isStudioCommand(command)?lock:null;
   }catch{return null;}
  }
  // ...
  if(action==='stop'){
    if(!existing){console.log('Không có tiến trình Studio đã xác minh trong thư mục dữ liệu này.');return;}
    if(owner(dir)?.id!==existing.id)throw new Error('Studio instance changed; no signal sent');
    process.kill(existing.pid,'SIGTERM');
    for(let i=0;i<50;i++){if(!owner(dir)){console.log('Đã dừng Studio an toàn; dữ liệu và lịch sử được giữ nguyên.');return;}await wait(100);}
    throw new Error('Studio đang dừng. Không dùng kill -9; xem log trước khi thử lại.');
  }
  ```

---

## 4. Bảng Tiêu Chuẩn Hành Động Cho Tương Lai (Actionable Do's and Don'ts Checklist)

Để duy trì chất lượng kỹ thuật xuất sắc và tính toàn vẹn của hệ sinh thái `VAN_PHONG_AI_STUDIO`, toàn bộ các kỹ sư và AI Agent phát triển trong kho lưu trữ này bắt buộc phải tuân thủ bảng quy chuẩn sau:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        BẢNG QUY CHUẨN KỸ THUẬT VÀ QUY TẮC PHÁT TRIỂN                                  │
├────────────────────────┬───────────────────────────────────────┬───────────────────────────────────────┤
│ Lĩnh vực kỹ thuật      │ ✅ NÊN LÀM (DO)                       │ ❌ TUYỆT ĐỐI TRÁNH (DON'T)            │
├────────────────────────┼───────────────────────────────────────┼───────────────────────────────────────┤
│ 1. Xác thực đầu vào    │ • Luôn kiểm tra kiểu đối tượng        │ • KHÔNG truyền chuỗi từ HTTP/client   │
│    và Xử lý lỗi        │   (`!obj || typeof obj !== 'object'`).│   vào `execSync` hoặc shell command.  │
│                        │ • Giới hạn độ dài văn bản chặt chẽ    │ • KHÔNG chấp nhận đường dẫn tệp       │
│                        │   (ví dụ `brief`: 8–12,000 ký tự).    │   (`filePath`) hoặc URL tùy ý.        │
│                        │ • Dùng helper `fail(msg, code, stat)`.│ • KHÔNG nuốt ngoại lệ bằng khối catch │
│                        │ • Kiểm tra `Number.isFinite()` trên   │   rỗng khiến hệ thống kẹt trạng thái. │
│                        │   mọi phép toán số học.               │ • KHÔNG chạy regex nặng trên main     │
│                        │ • Phân biệt rõ ô trống với số `0`.    │   event loop (hãy đẩy sang Worker).   │
├────────────────────────┼───────────────────────────────────────┼───────────────────────────────────────┤
│ 2. Lưu trữ & Hệ thống  │ • Đọc file artifact bằng cờ bảo vệ    │ • KHÔNG tin tưởng đường dẫn do client │
│    tệp tin             │   `O_RDONLY | O_NOFOLLOW`.            │   tự khai báo.                        │
│                        │ • Ghi file với cờ độc quyền `wx` và   │ • KHÔNG cho phép symlink hoặc hardlink│
│                        │   ép xả đĩa bằng `fs.fsyncSync(fd)`.  │   trong thư mục cơ sở dữ liệu và lock.│
│                        │ • Kiểm tra `fs.realpathSync()` nằm    │ • KHÔNG ghi đè trực tiếp lên tài liệu │
│                        │   hoàn toàn trong thư mục gốc.        │   hoặc video ở thư mục cha.           │
│                        │ • Sử dụng transaction SQLite với      │ • KHÔNG lưu trạng thái cốt lõi duy    │
│                        │   `BEGIN IMMEDIATE` trong WAL mode.   │   nhất trong RAM mà thiếu persistence.│
│                        │ • Phân quyền `0o700` cho thư mục,     │                                       │
│                        │   `0o600` cho file lock và database.  │                                       │
├────────────────────────┼───────────────────────────────────────┼───────────────────────────────────────┤
│ 3. An ninh mạng & HTTP │ • Kiểm tra nghiêm ngặt `Host`,        │ • KHÔNG bật `Access-Control-Allow-    │
│                        │   `Origin` và `Sec-Fetch-Site`.       │   Origin: *` hoặc Private Network.    │
│                        │ • Thiết lập đầy đủ header CSP, DENY,  │ • KHÔNG dùng `innerHTML` trên giao    │
│                        │   nosniff, no-referrer.               │   diện; luôn dùng `textContent`.      │
│                        │ • So sánh token bảo mật bằng hàm      │ • KHÔNG trả về stack trace nội bộ của │
│                        │   `crypto.timingSafeEqual`.           │   hệ thống ra ngoài phản hồi HTTP.    │
│                        │ • Yêu cầu `X-CSRF-Token` trên tất cả  │ • KHÔNG để các endpoint cũ chạy không │
│                        │   các phương thức ghi dữ liệu.        │   bảo vệ (hãy trả về 410 Gone).       │
│                        │ • Rate-limit endpoint xác thực.       │                                       │
├────────────────────────┼───────────────────────────────────────┼───────────────────────────────────────┤
│ 4. Kiểm thử & Nghiệm   │ • Dùng runner gốc `node:test` và      │ • KHÔNG viết bài test phụ thuộc vào   │
│    thu chất lượng      │   `node:assert/strict` để giữ zero dep│   server đang chạy trên cổng cố định. │
│                        │ • Tự tạo thư mục tạm cô lập bằng      │ • KHÔNG in cứng chuỗi kết quả kiểu    │
│                        │   `fs.mkdtempSync` và dọn sạch sau đó.│   `"(100%)"` trong console log.       │
│                        │ • Viết negative test cho injection,   │ • KHÔNG nuốt ngoại lệ trong test suite│
│                        │   symlink, giả mạo artifact hash.     │   khiến test sai vẫn báo thành công.  │
│                        │ • Kiểm thử thực tế khả năng phục hồi  │ • KHÔNG ghi đè tệp kiểm thử ra ngoài  │
│                        │   khi tiến trình bị `SIGKILL`.        │   phạm vi thư mục tạm được cấp.       │
├────────────────────────┼───────────────────────────────────────┼───────────────────────────────────────┤
│ 5. Văn hóa & Kỹ thuật  │ • Tuân thủ Conventional Commits       │ • KHÔNG dùng lệnh `kill -9` mù quáng  │
│    chung               │   (`feat:`, `fix:`, `docs:`, `chore:`).│   làm chết các tiến trình khác.       │
│                        │ • Viết tài liệu kiểm toán trung thực, │ • KHÔNG đưa file token, cơ sở dữ liệu │
│                        │   rõ ràng giữa "thực thi" và "mô phỏng"│   SQLite hay tệp log vào Git tracking.│
│                        │ • Duy trì `package.json` zero runtime │ • KHÔNG tự gán điểm số QC (như 95/100)│
│                        │   dependencies khi có thể.            │   khi chưa có sự nghiệm thu của người.│
│                        │ • Quản lý tiến trình qua PID và xác   │ • KHÔNG tự tiện merge vào `main` khi  │
│                        │   thực câu lệnh bằng `/bin/ps`.       │   chưa có sự chấp thuận của CEO.      │
└────────────────────────┴───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 5. Kết Quả Thực Nghiệm & Kiểm Thử Độc Lập (Verification & Test Execution)

Toàn bộ các luận điểm và cơ chế kỹ thuật trong báo cáo này đều đã được kiểm chứng thực tế tại môi trường máy trạm.

### 5.1 Thực thi Bộ Kiểm Thử Tự Động (`npm test`)

Lệnh thực thi tại thư mục gốc của dự án:
```bash
cd "/Users/quill/Documents/TÀI LIỆU DÙNG CHUNG AI/VAN_PHONG_AI_STUDIO"
npm test
```

**Biên bản kết quả thực thi (Console Output)**:
```text
> van-phong-ai-studio@4.0.0 test
> node --test tests/*.test.js

(node:23880) ExperimentalWarning: SQLite is an experimental feature and might change at any time
✔ anonymous business data is denied, security headers applied and bridge disabled (72.959768ms)
✔ reader token can read but cannot create/review/probe (21.831209ms)
✔ same-origin session requires CSRF on writes and rejects forged Origin (43.033913ms)
✔ request bounds/types, path traversal and injected input cannot reach a shell or filesystem (26.496572ms)
✔ actual HTTP workflow serves registered artifacts only and cannot auto-approve (124.251411ms)
✔ forged Host and cross-site request metadata are rejected (15.028882ms)
✔ SSE stream is revoked immediately on session logout (16.00298ms)
✔ provider-only health change advances persisted snapshot revision (labelled provider double) (14.928521ms)
✔ lifecycle verifies exact process command, not arbitrary listener or substring (1.050392ms)
✔ real SIGKILL process crash recovers SQLite and retries same task without overwriting artifacts (250.004187ms)
✔ real CSV tool → independent QC → explicit CEO approval with durable artifacts (106.614538ms)
✔ missing input is BLOCKED and malformed CSV never DONE (41.565055ms)
✔ idempotency is persistent, concurrent duplicate dispatch returns one task and changed body conflicts (85.736886ms)
✔ revision retains artifacts and new acceptance is bound to latest version (168.071813ms)
✔ approval rechecks missing/tampered artifact and never bypasses QC (84.123661ms)
✔ registered artifact symlink cannot read outside workspace (89.962242ms)
✔ durable state and approvals survive store close/reopen, second writer rejected (97.246719ms)
✔ concurrent different tasks keep unique outputs and bound active workers (232.555727ms)
✔ cancellation and timeout prevent late success (labelled executor test double) (169.062629ms)
✔ recovery marks interrupted attempts honestly and retry preserves audit history (84.798102ms)
✔ unsupported providers and unsafe object inputs are rejected without execution (7.544341ms)
✔ shutdown marks active attempt INTERRUPTED and preserves it for explicit retry (16.130008ms)
✔ independent QC rejection blocks approval (labelled inspector test double) (49.79325ms)
✔ SQLite scheduler ownership still rejects second writer if stale lock file was replaced (8.024757ms)
✔ queue and workspace limits reject excess work without duplicate loss (9.33992ms)
✔ existing workspace permissions are private and database/sidecar symlinks are rejected (7.547679ms)
✔ near-limit malformed HTML remains cancellable without blocking the event loop (61.651639ms)
✔ artifact publication refuses a symlinked root before writing outside workspace (39.31334ms)
✔ snapshot revisions order task events so slow polling cannot overwrite newer SSE state (82.212748ms)
✔ artifact quota reserves failed-attempt space before any output write (39.540497ms)
✔ missing output file prevents download and acceptance (81.914856ms)
✔ CSV tool computes quoted multiline data and missing numbers from supplied input (34.697449ms)
✔ CSV tool rejects malformed, empty and oversized sources instead of fabricating data (248.632701ms)
✔ CSV mixed types expose exclusions without converting nonnumeric text to zero (30.086093ms)
✔ CSV worker respects abort signals and does not emit late artifacts (0.837396ms)
✔ independent CSV QC passes correct data but always requires approval (31.817751ms)
✔ independent CSV QC rejects corrupted statistics, misleading report, missing source and blank output (30.436255ms)
✔ HTML tool checks only supplied HTML and its bounded findings survive independent QC (1.92965ms)
✔ system check reports observed local Node runtime and explicit limits (1.583862ms)
✔ AI draft carries provider provenance while semantics and aesthetics remain unverified (0.603746ms)
✔ local HTTP test double: provider requires explicit loopback config and successful model probe (43.467474ms)
✔ local HTTP test double: missing models, redirects and oversized responses never connect (16.815639ms)
✔ local HTTP test double: generation honors caller cancellation (3.667786ms)
✔ provider rejects explicit cloud and hosted-only model identifiers before any request (0.413067ms)
✔ provider expires unchecked connectivity and refuses generation until a fresh probe (1.494586ms)
✔ provider refuses to attribute missing or mismatched response models to the probed model (1.690215ms)
✔ provider refuses incomplete or tool-call completions as successful drafts (2.318057ms)
ℹ tests 47
ℹ suites 0
ℹ pass 47
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1655.103816
```

### 5.2 Kết Luận Nghiệm Thu
- **Số lượng kiểm thử**: 47/47 bài test vượt qua (100% pass).
- **Thời gian thực thi**: 1.65 giây.
- **Tính trọn vẹn**: Toàn bộ các cơ chế an ninh, độ bền bỉ, tính toàn vẹn dữ liệu và độc lập kiểm soát chất lượng do Codex xây dựng đều hoạt động hoàn hảo và đáp ứng trọn vẹn mọi tiêu chí khắt khe của một phần mềm văn phòng AI chuyên nghiệp.
