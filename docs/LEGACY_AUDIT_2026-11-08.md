# Kiểm toán bản gốc Văn Phòng AI Studio — 08/11/2026

## Phạm vi và giới hạn bằng chứng

Kiểm toán tĩnh theo commit gốc `aee38ba5d5b6b8915dfe407686886033d52d695d`. Mọi số dòng bên dưới thuộc **commit này**, lấy bằng `git show HEAD:<file>` trước khi thay mã nguồn; không phải số dòng của bản thiết kế lại. Đã đọc toàn bộ `server.js`, `public/index.html`, các công cụ ứng dụng được Git quản lý trong `tools/`, hai bộ test, `start.sh`, `stop.sh`, README và bốn hồ sơ trong `docs/`.

Không chạy server gốc, không gọi endpoint tác vụ, không chạy hai bộ test có tác dụng ghi dữ liệu, không tải/render video, không gửi nội dung vào ChatGPT. Vì vậy, các kết luận phân biệt rõ hành vi được mã nguồn triển khai với khả năng đã được kiểm chứng khi chạy. `tools/cua/` là checkout bên thứ ba được `.gitignore:3` loại khỏi repository; không có lời gọi tới checkout này trong luồng ứng dụng đã đọc và không kiểm toán toàn bộ dự án CUA riêng.

## 1. Phát hiện cần khắc phục

| Mức | Phát hiện trong bản gốc | Bằng chứng và hệ quả |
| --- | --- | --- |
| P0 | Đọc tùy ý tệp trên máy | `server.js:951–1033` nhận đường dẫn trực tiếp cho video, ảnh và văn bản, không có root allowlist, realpath/symlink guard hay quyền truy cập. `server.js:1713–1731` cũng không kiểm tra đường dẫn static đã chuẩn hóa nằm trong `public/`. |
| P0 | Chèn lệnh shell qua tham số HTTP | `tools/real_executor.js:43–54` đưa `params.url` vào chuỗi `execSync(curl …)`. `tools/qc_auditor.js:24–38` đưa `filePath` vào chuỗi shell `ffprobe`/`ffmpeg`; đường dẫn có thể đi từ `params.filePath` hoặc `params.deliverable` qua `real_executor.js:422–431`. Dấu ngoặc kép không vô hiệu hóa shell expansion. Không thử khai thác trong kiểm toán. |
| P0 | API không xác thực và mở cho origin bất kỳ | `server.js:534–538` trả CORS `*` và cho phép Private Network; không có kiểm tra Origin, Host, token hay quyền người dùng trước endpoint ghi. `server.js:1735` gọi `listen(PORT)` không giới hạn host loopback. Cấu hình này cho phép bên truy cập được cổng đọc dữ liệu và gửi lệnh ghi/tải/render/phê duyệt. |
| P1 | Chèn HTML/JavaScript vào giao diện | Brief, log, metadata và nội dung Markdown được đưa vào `innerHTML`: `public/index.html:1025`, `1121–1235`, `1284–1299`, `1352`, `1513`, `1681–1690`. Không thấy sanitizer hoặc CSP. Bridge còn chèn prompt vào `inputEl.innerHTML` tại `tools/chatgpt_bridge_extension/content.js:197` và userscript `:153`. |
| P1 | QC thất bại vẫn có thể thành sản phẩm đã duyệt | `/api/agent/execute-real` chọn `finalStatus` chỉ theo `isCreative`, bỏ qua `qcAudit.verdict` (`server.js:1439–1450`), rồi ghi Task Board DONE với sản phẩm kỹ thuật (`1478–1479`). API phê duyệt không kiểm tra trạng thái chuyển tiếp hay QC (`883–942`); request_revision/reject cũng không xóa `bossApproved` cũ. |
| P1 | Ghi đè tài liệu và video gốc | Executor ghi vào tên cố định trong thư mục cha bằng `writeFileSync`, ví dụ SEO `real_executor.js:70–108`, content `250–277`, finance `372–398`; renderer dùng `ffmpeg -y` vào tên cố định (`render_viral_video.py:18–20`, `123–137`). Import module đã có tác dụng tạo thư mục (`real_executor.js:18–20`, `qc_auditor.js:20–22`). |
| P1 | Không có phục hồi trạng thái bền vững | Agents, deliverables, bridge và idempotency đều ở RAM (`server.js:50–222`, `239–422`, `485–502`). Restart nạp lại seed, mất task/approval/deliverable vừa tạo; Task Board còn trên đĩa nhưng không được nạp làm state. Lỗi ghi Task Board bị nuốt (`504–520`). |
| P1 | Đồng thời và idempotency không an toàn | Có đúng một `bridgeState.pendingTask`; dispatch mới ghi đè task đang chờ (`1131–1141`). Không có hàng đợi/lock cho executor hoặc file đích. Cache chỉ được ghi sau khi xong (`1331–1332`), nên không chặn hai request đang chạy; khóa chỉ gồm 40 ký tự đầu brief và taskId (`1049–1064`), TTL 4s và không dọn cache. Task ID ngẫu nhiên chỉ có 90 giá trị (`1066`, `1457`), có thể đè dòng Task Board cùng ID. |
| P1 | Tải mạng không có ràng buộc đích | SEO cho phép URL tùy ý và curl theo redirect (`real_executor.js:43–54`). Scraper `urlopen` trước khi phân loại host (`video_scraper.py:37–47`, `65–78`) và chấp nhận Universal (`:63`); không chặn loopback/private network/redirect. `yt-dlp` nhận URL không có dấu `--` ngăn tùy chọn (`:73–79`, `105–114`). |
| P1 | Event loop bị chặn; giới hạn tài nguyên thiếu | Curl/render/QC chạy `execSync` trên luồng HTTP (`real_executor.js:54`, `143`, `306–307`; `qc_auditor.js:27`, `38`). Render/QC không có timeout tại lớp này. Body POST nối chuỗi không giới hạn (ví dụ `server.js:612–613`); SSE không có giới hạn client/backpressure (`227–235`, `547–562`). Không có worker isolation/cancellation/rate limit. |
| P1 | Dọn trạng thái lỗi không đầy đủ | Catch của boss-dispatch chỉ reset trưởng phòng (`server.js:1375–1382`), không reset subagent/QC. Các biến `taskId`/`cleanBrief` khai báo trong try nhưng dùng `typeof` từ catch ngoài scope nên không đồng bộ lỗi vào Task Board. Các catch của agent/scraper cũng chỉ reset trưởng phòng (`1486–1493`, `1699–1706`), có thể để nhân viên bận mãi. |
| P2 | Video Range và lỗi stream chưa được kiểm tra | `server.js:963–976` không xác thực Range hữu hạn/thứ tự/giới hạn hoặc trả 416. Các read stream không gắn `error` handler (`968–983`, `1009`); lỗi async không được catch đồng bộ bao phủ. |
| P1 | Start/stop có thể giết dịch vụ khác | `start.sh:7–10` và `stop.sh:2–4` tìm bất kỳ tiến trình LISTEN cổng 3333 rồi `kill -9`, không xác minh executable, cwd hay PID ownership. Startup chỉ kiểm tra PID sau 1s (`start.sh:19–25`), không xác minh health/instance của Studio. |

## 2. Điều gì thực sự được triển khai

| Thành phần | Hành vi có trong mã | Giới hạn, mô phỏng hoặc tuyên bố chưa được chứng minh |
| --- | --- | --- |
| HTTP/SSE | Node HTTP phục vụ UI/API và phát sự kiện thật; có thu duration HTTP, RAM và event-loop lag (`server.js:16–45`, `524–588`). | Không phải hệ thống agent LLM độc lập. Các duration là thời gian server đến response finish, không đo độ trễ SSE đầu cuối. Khi chưa có mẫu vẫn trả số giả `p50:2`, `p95:8`, `p99:15` (`35–36`); status luôn healthy (`571`). |
| Kho skills | Đọc tên thư mục/symlink và description của `~/.agents/skills` (`server.js:424–449`). | Không kiểm tra skill load được, tương thích hay có quyền chạy. Số skill/connector gán cho từng nhân viên là seed tĩnh (`239–410`). |
| Connectors và models | Có danh mục tĩnh chín connector và chín nhân viên. | Mọi connector seed đều `connected` (`server.js:412–422`); UI hiển thị Online vô điều kiện (`public/index.html:1560–1575`). Không có gọi Google Drive, GitHub, Composio, CUA, Claude SEO, Kronos hay Concat MCP trong executor. `nv-thiet-ke`, `nv-ads` được quảng bá nhưng không có nhánh executor; rơi vào INVALID_AGENT (`real_executor.js:531–532`). |
| SEO | Có chạy curl HEAD thực sự khi được gọi và ghi Markdown. | Chỉ một HTTP probe; không crawl nội dung, chạy Lighthouse/CWV, kiểm tra canonical/SSL, schema hay GEO. Điểm 92, CWV tốt, 12 Q&A và các nhãn ĐẠT được viết sẵn (`real_executor.js:73–105`). Khi curl lỗi, thời gian 180ms được gán cố định và vẫn trả exitCode 0 (`61–65`, `122`). Boss brief không được parse URL vào `params.url` (`server.js:1233`), nên thường luôn audit URL mặc định. |
| Content và timeline | Ghi một kịch bản cố định, JSON timeline và ba câu SRT cố định (`real_executor.js:183–240`, `244–293`). | Không dùng brief để tạo nội dung, không chạy Whisper hay Concat. Nhãn REAL chỉ chứng minh ghi tệp; không chứng minh sinh nội dung bằng AI, lời bình đã đo thời lượng hoặc khớp nguồn video. |
| Video | Python gọi FFmpeg/ffprobe thực sự; renderer lấy một video nguồn cố định, chồng text, loudnorm và xuất thumbnail (`render_viral_video.py:18–20`, `42–46`, `72–153`). | Mọi brief video dùng cùng nguồn/chủ đề/29.8s, không phải dựng tổng quát theo yêu cầu. Không đo loudness đầu ra để xác nhận -14 LUFS. Nhánh TTS vẫn dùng video nguồn làm input hình, nên thiếu nguồn không được khắc phục (`123–126`). Dữ liệu metadata duration trong executor gán cố định (`real_executor.js:173`). |
| Scraper | Dùng urllib và yt-dlp/ffmpeg dưới dạng argv, không qua shell (`video_scraper.py:37–47`, `73–129`). | Chưa xác minh tất cả nền tảng hiện hoạt động. Có thể nhận nhầm file cũ: chọn bằng title glob rồi fallback MP4 mới nhất toàn kho; kết quả vẫn success true khi không có file (`139–170`). API đăng ký approved không chạy QC (`server.js:1653–1674`). |
| DevOps | Đọc heap và chạy `yt-dlp --version`, `ffmpeg -version` (`real_executor.js:301–313`). | Không chạy test dự án, network benchmark, kiểm tra memory leak hay CI/CD. Mẫu báo cáo vẫn ghi công cụ sẵn sàng, SSE ổn định và đạt ngay cả khi CLI lỗi; exitCode luôn 0 (`320–362`). |
| Tài chính | Ghi mẫu Markdown đánh dấu RULE_BASED_ANALYSIS/FALLBACK_RULE (`real_executor.js:366–414`). | Không nạp nến/OI, không chạy Kronos/TradingAgents, không tính tín hiệu. Giá 98,200 và funding +0.01% là dữ liệu viết sẵn; không được dùng như báo cáo thị trường hiện hành hoặc khuyến nghị có căn cứ. |
| QC | Kiểm tra tồn tại/kích thước, ffprobe, volumedetect và cấu trúc Markdown; lưu audit JSON/MD (`qc_auditor.js:84–218`, `237–272`). | Không xác minh nguồn dữ liệu/nội dung, không có JSON schema validator dù header tuyên bố có. Timeline bị khai báo format markdown (`real_executor.js:232`) nên vào kiểm tra Markdown; generic format được cộng điểm mặc định (`qc_auditor.js:214–218`). |

Các điểm QC không phải thẩm định độc lập của một model hoặc người khác: cùng tiến trình gọi hàm heuristic. Lỗi sine 110Hz, TTS robotic và thẩm mỹ bị áp sẵn cho ID `deliv-viral-remix-01` (`qc_auditor.js:140–168`), không phát hiện qua phổ âm. Video khác được cộng 20 điểm thẩm mỹ và lời khen font rõ mà không xem hình; lỗi volumedetect trả null vẫn có thể đi nhánh 25 điểm âm thanh (`34–48`, `147–167`). Tỷ lệ 9:16 đủ nhận trọn điểm nhãn “1080p” dù không kiểm tra tối thiểu 1080x1920 (`121–124`). Markdown chỉ cần có `|` hoặc code block để được 25 điểm “dẫn chứng” (`204–211`).

Deliverables seed gán sẵn status, điểm QC, ngày và cả “Sếp đã nghiệm thu” (`server.js:50–222`), không đối chiếu hồ sơ ký duyệt hoặc file khi khởi động. Banner lặp lại lời phê duyệt/95 điểm viết sẵn (`public/index.html:464–501`). Preview còn tự điền `90/100 [PASSED]` nếu thiếu QC, và tuyên bố đã kiểm tra integrity khi không có defects (`1289–1298`). Room performance là các hằng số (`server.js:842–848`). Đây là các ghi nhận legacy chưa có bằng chứng xác nhận mới, không được nhập thành sự kiện duyệt hợp lệ.

## 3. Giao thức ChatGPT bridge và yêu cầu chuyển đổi

Luồng gốc: extension service worker gửi HANDSHAKE POST metadata tới `/api/chatgpt-bridge/handshake`; server cấp sessionId. Content script heartbeat mỗi 5s, poll mỗi 1.5s. Server phát một `{taskId, correlationId, prompt}` duy nhất, client ACK, gửi LOG/PROCESSING, điền prompt/bấm gửi bằng DOM rồi POST RESULT. Server tối đa 120s, inactivity 45s; timeout thì chuyển bộ định tuyến từ khóa (`server.js:611–825`, `1103–1216`; extension `background.js:90–188`, `content.js:237–458`). Userscript dùng cùng endpoint qua GM_xmlhttpRequest (`tools/chatgpt_bridge.user.js:24–51`, `190–355`).

Các lỗi giao thức cần sửa trước khi bật bridge mới:

- Server không kiểm tra sessionId/tabId/conversationId trên heartbeat, poll, ACK, LOG, RESULT; chỉ cần taskId **hoặc** correlationId khớp (`server.js:656–825`). Poll tự tạo trạng thái connected kể cả chưa handshake. Bất kỳ client truy cập được cổng có thể giành task, giả progress/result hoặc ngắt kết nối.
- Không có chọn một tab/hội thoại đích; mọi tab match ChatGPT đều poll. Nhiều tab cùng sử dụng global state; đóng một tab cũng ngắt task chung (`server.js:679–694`). Port disconnect còn xóa session trước onRemoved, nên tín hiệu đóng tab có thể bị bỏ qua (`background.js:43–62`).
- Content gửi `conversationId` nhưng background POLL destructure `convId`, nên metadata hội thoại trong query bị rỗng (`content.js:157–164`, `407–411`; `background.js:152–153`). Heartbeat vẫn có thể cập nhật metadata riêng.
- Đọc assistant cuối cùng mà không lưu số message/nội dung trước khi gửi; nếu gửi thất bại có thể nhận lại câu trả lời cũ như mới. Hết vòng 180s vẫn gửi success true, kể cả rỗng/chưa hoàn tất (`content.js:294–349`; userscript `238–291`). Thời hạn client 180s không khớp server 120s.
- Heartbeat không reset `pendingTask.lastActivityAt`; chỉ ACK/LOG reset (`server.js:656–675`, `712–714`, `774–776`). Đợi suy nghĩ không có text có thể bị timeout sau 45s dù heartbeat còn sống. Không có cancel/retry lease, task dispatched chỉ giao một lần.
- Permissions `alarms`/`storage` có trong manifest nhưng background không lập alarm hoặc lưu session bền vững. Các timer task vẫn chạy trong content script; không có bằng chứng loại bỏ mọi throttling/discard như báo cáo cũ tuyên bố.

Hợp đồng mới nên có phiên bản rõ ràng, pairing token, chỉ chấp nhận origin/client được phép, lease gắn một tab/hội thoại, taskId+correlationId+sessionId cùng khớp, schema và chuyển trạng thái hợp lệ. Lưu task trước khi giao; một worker chỉ nhận một lease; ACK/result lặp phải idempotent. Unknown/stale/wrong-session result phải báo lỗi rõ, không trả ok giả. Reconnect không được tự gửi lại prompt đã gửi; cần trạng thái uncertain để người dùng đối chiếu. Không tự động bật extension gốc với API mới không tương thích. Duy trì bridge disabled/manual-handoff cho tới khi có kiểm thử DOM thực và người dùng đã cấu hình hội thoại.

## 4. Phân loại hai bộ test và hồ sơ cũ

`test_verification_suite.js` là hỗn hợp integration smoke tests và kiểm tra hàm, **không phải bộ kiểm chứng đủ mười yêu cầu trong header**:

- Test 1, 4, 6, 7 gọi endpoint ghi/tạo artifact/phê duyệt trên server cổng 3333; test 2 và 5 gọi auditor ghi hồ sơ vào thư mục cha. Không cách ly fixture hoặc dọn tác dụng phụ (`74–198`, `268–269`).
- Test 3 chỉ thử ID agent sai, không thử process timeout/recovery hay trạng thái server khi lỗi (`113–126`).
- Test 5 dựa đúng ID bị gán lỗi cố định, không chứng minh phát hiện lỗi âm học và không kiểm tra transition ở server (`144–158`).
- Test 6 gửi tuần tự sau khi lệnh đầu xong, không kiểm tra duplicate đang chạy (`163–180`). Test 8 chỉ chạy sáu GET song song, không có hai tác vụ ghi đồng thời (`200–213`).
- Không có restart/crash test dù header ghi có. Test 9 chỉ kiểm tra có field benchmark và p50 > 0; test 10 chỉ nhận gói SSE đầu tiên, không đo phân phối độ trễ event thực (`218–258`).
- In cứng “(100%)” bất kể số pass (`264`); failed assertions được ghi dữ liệu, không đặt exit code thất bại (`273`).

`test_bridge_e2e.js` là **HTTP protocol simulation + integration artifact smoke test**, không phải end-to-end với Chrome/ChatGPT. Nó tự đóng vai extension, tự handshake/poll/ACK/LOG và tự gửi văn bản phản hồi giả chứa `[nv-dev]` (`63–141`); không cài/chạy extension, không mở DOM ChatGPT, không chứng minh tài khoản Plus hoặc model đang dùng. B01–B06 thử happy path nhưng không thử token/session sai, stale result hoặc nhiều tab. B07 chủ động disconnect rồi dispatch, không chờ timeout thật (`166–178`). B08 thực sự yêu cầu renderer ghi đè video cố định và B10 tự phê duyệt thay người dùng (`180–204`). Không kiểm tra Task Board đúng dù tên test nói có; lỗi toàn suite bị catch rồi vẫn ghi số test đã chạy, không bảo đảm đủ 10 hay exit code khác 0 (`206–222`).

Bốn hồ sơ cũ được giữ như chứng cứ lịch sử, không phải xác nhận bản mới. `docs/BAO_CAO_KIEM_TOAN_VAN_PHONG_AI.md:34–42` gán REAL cho Design/Ads không có implementation; `:93–104` khẳng định loại bỏ 100% duplicate và có lock nhưng code không có in-flight lock. `docs/BAO_CAO_FIX_CHATGPT_BRIDGE.md:18–33` khẳng định không còn mất kết nối nền và không bao giờ timeout giả vượt quá những gì code bảo đảm. Bản kết quả acceptance lưu p95 **518ms**, p99 **605ms** (`docs/KET_QUA_KIEM_THU_ACCEPTANCE_TESTS.json:77–96`), không tương đương phân phối SRE nhanh được nêu chung trong báo cáo. Các JSON 10/10 chỉ ghi lại pass của các kiểm tra hạn chế nói trên.

## 5. Phụ thuộc dữ liệu và cách bảo toàn

Root nghiệp vụ là **thư mục cha Studio**, không phải repository (`server.js:11–14`; `real_executor.js:12–16`; hai Python script tính parent.parent.parent). Các đường dẫn còn có tên người dùng và Unicode tổ hợp; không đổi tên/chuẩn hóa đường dẫn dữ liệu tại chỗ. Metadata được kiểm tra chỉ đọc trong phiên kiểm toán cho thấy:

| Dữ liệu bên ngoài repository | Hiện diện lúc kiểm tra |
| --- | --- |
| `00_QUY_TAC_VA_DIEU_PHOI/BO_NHO_CHUNG.md` | Có, 4.435 bytes |
| `00_QUY_TAC_VA_DIEU_PHOI/TASK_BOARD.md` | Có, 8.939 bytes |
| `01_DU_AN_CHUNG/` | Có, 7 mục trực tiếp |
| `05_BAO_CAO_VA_KIEM_THU/` | Có, 13 mục trực tiếp |
| `05_BAO_CAO_VA_KIEM_THU/RISK_REVIEWS/` | Có, 1 mục trực tiếp |
| `05_BAO_CAO_VA_KIEM_THU/QC_AUDITS/` | Có, 66 mục trực tiếp |
| `06_DU_LIEU_VA_MOCKS/VIDEOS/` | Có, 6 mục trực tiếp |

Các số mục chỉ là inventory, không chứng minh chất lượng/nội dung/approval của từng file. Không đọc lại toàn văn bộ nhớ và tài liệu nghiệp vụ trong kiểm toán này. Thư mục dữ liệu cha và checkout `tools/cua/` không được bảo vệ bởi commit app; rollback Git không phục hồi dữ liệu ngoài repo. Không sử dụng hướng dẫn `git reset --hard` trong báo cáo cũ (`BAO_CAO_KIEM_TOAN_VAN_PHONG_AI.md:188–196`) để bảo toàn các chỉnh sửa hiện có.

Hướng chuyển đổi an toàn:

1. Ghi lại commit gốc và tạo snapshot riêng của code, cùng manifest file/hash cho dữ liệu cần bảo vệ; giữ backup ngoài nơi app có quyền ghi. Không chạy script cũ để tạo snapshot.
2. Lưu task/event/artifact/approval mới trong data root riêng. Mỗi run có thư mục và ID duy nhất; output mới không trùng tên file legacy; ghi atomic và log append có version. Runtime mới không tự sửa BO_NHO_CHUNG.md/TASK_BOARD.md hoặc file legacy khi startup/test.
3. Import legacy dưới dạng nguồn chỉ đọc có provenance/hash và trạng thái **chưa xác minh**. Không biến seed “approved”, comment “Sếp nghiệm thu” hoặc pass của test tự động thành approval mới. Chỉ nhận approval qua hành động có chủ thể, timestamp và artifact version/hash cụ thể.
4. Phục vụ artifact qua ID đã đăng ký, root allowlist và kiểm tra realpath; không nhận absolute path từ browser. Không thực thi shell từ brief/URL/path. Các công cụ mạng/render phải opt-in, giới hạn tài nguyên và hoạt động trong run directory.
5. Test mới dùng temporary root và fixture tổng hợp, không cần tài khoản trả phí hoặc gọi dịch vụ ngoài. Phân loại protocol simulation riêng với kiểm thử Chrome/ChatGPT thực; bổ sung in-flight duplicate, concurrent writes, crash/restart, stale/wrong-session, file traversal/symlink và không ghi vào dữ liệu gốc.
6. Thay lifecycle scripts bằng PID ownership + graceful shutdown và health check. Giữ branch riêng; không merge `main` hoặc bật dịch vụ trả phí trong công việc thiết kế lại này.

**Kết luận:** bản gốc có HTTP/SSE, công cụ CLI và ghi artifact thực, nhưng chất lượng/năng lực của chín “AI agents”, độ độc lập QC, dữ liệu thị trường, connector online và nghiệm thu tự động bị mô tả quá mức. Bản mới cần trình bày đúng năng lực đang có, lưu bằng chứng cho mỗi chuyển trạng thái và bảo toàn toàn bộ dữ liệu legacy trước khi cho phép thi hành tác vụ.
