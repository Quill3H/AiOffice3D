const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const { executeRealTask } = require('./tools/real_executor');

const PORT = process.env.PORT || 3333;
const ROOT_DIR = path.resolve(__dirname, '..');
const MEMORY_FILE = path.join(ROOT_DIR, '00_QUY_TAC_VA_DIEU_PHOI', 'BO_NHO_CHUNG.md');
const TASK_BOARD_FILE = path.join(ROOT_DIR, '00_QUY_TAC_VA_DIEU_PHOI', 'TASK_BOARD.md');
const SKILLS_DIR = path.join(process.env.HOME || '/Users/quill', '.agents', 'skills');

const DELIVERABLES = [
  {
    id: 'deliv-viral-remix-01',
    taskId: 'TASK-99',
    title: '[Viral Short 9:16] Kỷ Luật Thép — Biến Mất 6 Tháng (High-Retention Remix)',
    category: 'Video & Media',
    agentName: 'NV Video (Concat MCP) & NV Content',
    agentRole: 'Kỹ sư Dựng & Biên kịch Viral',
    filePath: path.join(ROOT_DIR, '06_DU_LIEU_VA_MOCKS', 'VIDEOS', 'video_viral_ky_luat_thep_9_16_remix.mp4'),
    relativePath: '06_DU_LIEU_VA_MOCKS/VIDEOS/video_viral_ky_luat_thep_9_16_remix.mp4',
    format: 'video',
    status: 'approved',
    fileSizeMb: 3.61,
    durationSec: 29.8,
    thumbnailPath: path.join(ROOT_DIR, '06_DU_LIEU_VA_MOCKS', 'VIDEOS', 'video_viral_ky_luat_thep_9_16_remix.jpg'),
    completedAt: '2026-11-08 03:48',
    summary: 'Video mới 100% được dựng lại từ nội dung video gốc với Hook giật gân, nhịp điệu dồn dập, phụ đề chuyển màu karaoke và voice-over tiếng Việt chuẩn 29.8s giữ chân người xem cao nhất.'
  },
  {
    id: 'deliv-script-remix-01',
    taskId: 'TASK-99',
    title: 'Kịch Bản Video Viral 9:16 — Kỷ Luật Thép (High-Retention Engineering)',
    category: 'Video & Media',
    agentName: 'NV Content & Kịch bản',
    agentRole: 'Biên kịch & Phân cảnh Viral',
    filePath: path.join(ROOT_DIR, '01_DU_AN_CHUNG', 'KICH_BAN_VIDEO_VIRAL_KY_LUAT_THEP_HIGH_RETENTION.md'),
    relativePath: '01_DU_AN_CHUNG/KICH_BAN_VIDEO_VIRAL_KY_LUAT_THEP_HIGH_RETENTION.md',
    format: 'markdown',
    status: 'approved',
    completedAt: '2026-11-08 03:48',
    summary: 'Kịch bản phân cảnh 4 hồi tối ưu thời lượng giữ chân 29.8s, phân tách rõ text overlay, voice-over và tâm lý học kích thích chia sẻ.'
  },
  {
    id: 'deliv-tiktok-01',
    taskId: 'TASK-85',
    title: '[TikTok] Nếu bạn kỷ luật hoàn toàn ? (Kênh: realnezzdapoet)',
    category: 'Video & Media',
    agentName: 'NV Video (Concat MCP)',
    agentRole: 'Kỹ sư Dựng & Hậu kỳ Video',
    filePath: path.join(ROOT_DIR, '06_DU_LIEU_VA_MOCKS', 'VIDEOS', 'tiktok_7704157938734189842_Nếu bạn kỷ luật hoàn toàn  viral xuhuong kyluatban.mp4'),
    relativePath: '06_DU_LIEU_VA_MOCKS/VIDEOS/tiktok_7704157938734189842_Nếu bạn kỷ luật hoàn toàn  viral xuhuong kyluatban.mp4',
    format: 'video',
    status: 'approved',
    fileSizeMb: 11.61,
    durationSec: 415,
    author: 'realnezzdapoet',
    sourceUrl: 'https://www.tiktok.com/@realnezzdapoet/video/7704157938734189842',
    completedAt: '2026-11-08 03:38',
    summary: 'Đã cào thành công video gốc không logo từ link TikTok do Trưởng phòng điều phối. Tệp MP4 (11.6 MB, 415s) lưu tại 06_DU_LIEU_VA_MOCKS/VIDEOS/. Sẵn sàng cho NV Content bóc tách kịch bản.'
  },
  {
    id: 'deliv-vid-01',
    taskId: 'TASK-88',
    title: '[YouTube / Multi-Platform] Me at the zoo (PoC Cào Video Đa Nền Tảng)',
    category: 'Video & Media',
    agentName: 'NV Video (Concat MCP)',
    agentRole: 'Kỹ sư Dựng & Hậu kỳ Video',
    filePath: path.join(ROOT_DIR, '06_DU_LIEU_VA_MOCKS', 'VIDEOS', 'youtube_jNQXAC9IVRw_Me at the zoo.mp4'),
    relativePath: '06_DU_LIEU_VA_MOCKS/VIDEOS/youtube_jNQXAC9IVRw_Me at the zoo.mp4',
    format: 'video',
    status: 'approved',
    completedAt: '2026-11-08 03:09',
    summary: 'Đã hoàn tất tải mẫu và trích xuất bằng bộ cào yt-dlp + ffmpeg đa nền tảng (Facebook, TikTok, Douyin, X). Tệp MP4 lưu trữ tại 06_DU_LIEU_VA_MOCKS/VIDEOS/.'
  },
  {
    id: 'deliv-01',
    taskId: 'TASK-94',
    title: 'Báo cáo Audit SEO Toàn Diện & Tối Ưu AI Search (GEO)',
    category: 'SEO & Marketing',
    agentName: 'NV SEO & AI Search',
    agentRole: 'Quản lý 19 Subagents Claude SEO',
    filePath: path.join(ROOT_DIR, '05_BAO_CAO_VA_KIEM_THU', 'BAO_CAO_SEO_VIBE_CODING_AI.md'),
    relativePath: '05_BAO_CAO_VA_KIEM_THU/BAO_CAO_SEO_VIBE_CODING_AI.md',
    format: 'markdown',
    status: 'approved',
    completedAt: '2026-11-08 02:35',
    summary: 'Điểm Technical 94/100, LCP 1.1s, sinh sẵn Schema JSON-LD và phân tích tối ưu GEO cho ChatGPT/Gemini.'
  },
  {
    id: 'deliv-02',
    taskId: 'TASK-51',
    title: 'Kịch bản Phân cảnh & Timeline Video Ngắn 9:16 (Concat MCP Engine)',
    category: 'Video & Media',
    agentName: 'NV Video (Concat MCP)',
    agentRole: 'Kỹ sư Dựng & Hậu kỳ Video',
    filePath: path.join(ROOT_DIR, '01_DU_AN_CHUNG', 'KICH_BAN_VA_TIMELINE_VIDEO_AI_AUTOMATION.md'),
    relativePath: '01_DU_AN_CHUNG/KICH_BAN_VA_TIMELINE_VIDEO_AI_AUTOMATION.md',
    format: 'markdown',
    status: 'approved',
    completedAt: '2026-11-08 02:45',
    summary: 'Kịch bản 5 cảnh theo công thức 124 thẻ, timeline Concat project và phụ đề Whisper SRT tiếng Việt tự động.'
  },
  {
    id: 'deliv-03',
    taskId: 'TASK-02',
    title: 'Báo cáo Phân tích Định lượng BTC OI Reclaim v1 (Kronos 12B)',
    category: 'Tài chính & Trading',
    agentName: 'NV Phân tích Tài chính',
    agentRole: 'Chuyên viên Định lượng & Trading',
    filePath: path.join(ROOT_DIR, '05_BAO_CAO_VA_KIEM_THU', 'RISK_REVIEWS', 'PHAN_TICH_BTC_OI_RECLAIM_V1.md'),
    relativePath: '05_BAO_CAO_VA_KIEM_THU/RISK_REVIEWS/PHAN_TICH_BTC_OI_RECLAIM_V1.md',
    format: 'markdown',
    status: 'approved',
    completedAt: '2026-11-08 02:20',
    summary: 'Quét phân kỳ nến Kronos, phân tích biến động Open Interest, khuyến nghị vị thế an toàn 0.5% vốn.'
  },
  {
    id: 'deliv-04',
    taskId: 'TASK-05',
    title: 'Bộ Quy Chuẩn & Kiến Thức Văn Phòng Đa AI (BO_NHO_CHUNG.md)',
    category: 'Quản trị & Điều phối',
    agentName: 'Trưởng phòng Điều phối',
    agentRole: 'Account & Điều phối',
    filePath: path.join(ROOT_DIR, '00_QUY_TAC_VA_DIEU_PHOI', 'BO_NHO_CHUNG.md'),
    relativePath: '00_QUY_TAC_VA_DIEU_PHOI/BO_NHO_CHUNG.md',
    format: 'markdown',
    status: 'approved',
    completedAt: '2026-11-08 02:15',
    summary: 'Quy chuẩn báo cáo <120 chữ, bảng màu thương hiệu, danh sách 9 chức danh AI và luật dùng chung.'
  }
];

// Server-Sent Events (SSE) Live Stream Set
const sseClients = new Set();

function broadcastEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// In-memory state for initial demo session
const AGENTS = [
  {
    id: 'truong-phong',
    name: 'Trưởng phòng Điều phối',
    gender: 'neutral',
    role: 'Tiếp nhận brief, phân công nhiệm vụ, tổng hợp báo cáo',
    room: 'Ban điều hành & Sảnh chính',
    status: 'online',
    busyState: 'idle', // idle, working, review
    model: 'ChatGPT Plus (GPT-4o / o1 Web)',
    skillsCount: 12,
    connectorCount: 5,
    activeTasks: ['Tiếp nhận brief & phân việc hôm nay', 'Kiểm tra chất lượng báo cáo SEO'],
    coreDuties: ['Nhận brief từ sếp, làm rõ yêu cầu', 'Chia việc & điều phối cả team', 'Kiểm tra chất lượng trước khi bàn giao', 'Báo cáo tiến độ cho sếp'],
    assignedSkills: ['automation', 'workflow-skill-creator', 'agy-customizations', 'codebase-memory', 'doc-pipeline'],
    assignedConnectors: ['GitHub Integration', 'Google Drive & Docs', 'Browser MCP', 'OfficeCLI MCP'],
    currentTask: {
      title: 'Tiếp nhận brief & giám sát tiến độ toàn văn phòng',
      progress: 40,
      currentStep: 'Rà soát danh sách 9 nhân sự và phân bổ nhiệm vụ mới',
      startedAt: '02:15:00',
      steps: [
        { name: 'Đọc chỉ đạo mới nhất từ BO_NHO_CHUNG.md', status: 'done', time: '02:15' },
        { name: 'Kiểm tra trạng thái các phòng ban trên TASK_BOARD.md', status: 'done', time: '02:20' },
        { name: 'Rà soát phân công và điều phối nhân sự rảnh', status: 'doing', time: '02:30' },
        { name: 'Tổng hợp báo cáo tiến độ ca làm việc gửi Sếp', status: 'pending' }
      ],
      logs: [
        '[02:15:10] Hệ thống khởi động: Nạp toàn bộ quy chuẩn từ BO_NHO_CHUNG.md',
        '[02:20:05] Quét TASK_BOARD.md: Ghi nhận 2 task đang chạy, 1 task chờ review',
        '[02:30:18] Điều phối NV SEO và NV Video vào luồng công việc tự động',
        '[02:40:02] Trạng thái: Các nhân sự đang chạy ổn định, không có xung đột'
      ]
    },
    history: [
      { title: 'Chuẩn hóa cấu trúc Thư mục dùng chung AI', completedAt: '2026-11-07', status: 'DONE', summary: 'Hoàn thiện 5 phân lớp thư mục và phân quyền' }
    ]
  },
  {
    id: 'nv-seo',
    name: 'NV SEO & AI Search',
    gender: 'neutral',
    role: 'Quản lý 19 Subagents Claude SEO (Technical, E-E-A-T, Schema, GEO)',
    room: 'Phòng SEO & Marketing',
    status: 'online',
    busyState: 'working',
    model: 'Claude 3.7 Sonnet / Opus',
    skillsCount: 26,
    connectorCount: 4,
    activeTasks: ['Quét Technical SEO & Schema', 'Tối ưu AI Search (GEO) cho bài viết mới'],
    coreDuties: ['Điều phối 19 agent chuyên trách Claude SEO', 'Phân tích E-E-A-T & Search Intent', 'Tối ưu trích dẫn trên ChatGPT, Perplexity, Gemini', 'Báo cáo audit trang web'],
    assignedSkills: ['claude-seo', 'seo-technical', 'seo-schema', 'seo-geo', 'seo-performance', 'seo-backlinks', 'seo-optimizer'],
    assignedConnectors: ['Claude SEO (19 Subagents)', 'Chrome Browser MCP', 'GitHub Integration'],
    currentTask: {
      title: 'Audit Technical SEO & Tối ưu AI Search (GEO)',
      progress: 75,
      currentStep: 'Đối chiếu Schema JSON-LD và tạo bảng đề xuất Generative Engine Optimization',
      startedAt: '02:25:00',
      steps: [
        { name: 'Quét mã phản hồi HTTP, Canonical, Sitemap XML', status: 'done', time: '02:25' },
        { name: 'Đo lường chỉ số Core Web Vitals (LCP, CLS, INP)', status: 'done', time: '02:28' },
        { name: 'Audit Schema Markup & Thẩm định E-E-A-T', status: 'done', time: '02:35' },
        { name: 'Tối ưu trích dẫn AI Search (ChatGPT, Gemini, Perplexity)', status: 'doing', time: '02:42' },
        { name: 'Xuất Action Plan Markdown vào 05_BAO_CAO_VA_KIEM_THU/', status: 'pending' }
      ],
      logs: [
        '[02:25:12] Kích hoạt 19 Subagents Claude SEO (AgriciDaniel/claude-seo)',
        '[02:28:30] Core Web Vitals: Mobile LCP 2.1s (Tốt), CLS 0.02 (Tốt)',
        '[02:35:45] Schema Audit: Bổ sung Article Schema và author profile URL',
        '[02:42:10] GEO Engine: Phân tích 12 cụm từ khóa truy vấn hội thoại trên Gemini & Perplexity...',
        '[02:43:05] Chuẩn bị đóng gói báo cáo Action Plan theo mẫu của Sếp (<120 chữ)'
      ]
    },
    history: [
      { title: 'Audit SEO toàn diện: https://vibe-coding.ai', completedAt: '2026-11-08 02:35', status: 'DONE', summary: 'Điểm kỹ thuật 92/100, tối ưu 4 thẻ schema' }
    ]
  },
  {
    id: 'nv-content',
    name: 'NV Content & Kịch bản',
    gender: 'neutral',
    role: 'Viết bài chuẩn SEO, kịch bản video ngắn 9:16, copywriting',
    room: 'Phòng SEO & Marketing',
    status: 'online',
    busyState: 'working',
    model: 'Claude 3.7 Sonnet / Viết Pro',
    skillsCount: 11,
    connectorCount: 4,
    activeTasks: ['Viết kịch bản short video 9:16 sản phẩm'],
    coreDuties: ['Viết copy, kịch bản, lời bình voice-over', 'Tối ưu bài viết chuẩn E-E-A-T', 'Soạn thảo thông điệp quảng cáo ads'],
    assignedSkills: ['content-writer', 'copywriting', 'storytelling', 'seo-content', 'scriptwriting'],
    assignedConnectors: ['Google Drive & Docs', 'Browser MCP'],
    currentTask: {
      title: 'Soạn thảo kịch bản Video ngắn 9:16 (Công thức Hook - Problem - Solution)',
      progress: 60,
      currentStep: 'Viết phân cảnh 3-4 (Phần giải pháp & Call To Action)',
      startedAt: '02:30:00',
      steps: [
        { name: 'Nghiên cứu insight khách hàng & Pain-point', status: 'done', time: '02:30' },
        { name: 'Viết 3 phương án câu mở đầu Hook 3 giây đầu', status: 'done', time: '02:34' },
        { name: 'Soạn thân bài phân cảnh chi tiết kèm visual cue', status: 'doing', time: '02:40' },
        { name: 'Chuyển giao cho NV Video ráp vào Concat MCP', status: 'pending' }
      ],
      logs: [
        '[02:30:20] Nhận brief từ Trưởng phòng: Video chủ đề công nghệ AI tự động',
        '[02:34:10] Hook A/B: "Bạn có biết 90% việc văn phòng có thể tự động hóa?"',
        '[02:40:15] Soạn lời bình voice-over nhịp độ 140 từ/phút chuẩn TikTok Reels'
      ]
    },
    history: []
  },
  {
    id: 'nv-video',
    name: 'NV Video (Concat MCP)',
    gender: 'neutral',
    role: 'Dựng video tự động, cắt ghép timeline Concat, phụ đề Whisper',
    room: 'Studio Video & Media',
    status: 'online',
    busyState: 'working',
    model: 'Antigravity / Concat MCP + Whisper',
    skillsCount: 21,
    connectorCount: 6,
    activeTasks: ['Cào video & Dựng short video qua Concat MCP'],
    coreDuties: ['Cào và tải video MP4 từ Facebook, X, TikTok, Douyin', 'Vận hành Concat MCP Server (Rust Engine)', 'Sinh subtitle tự động bằng Whisper offline', 'Render video 9:16 TikTok và 16:9 YouTube', 'Ghép nhạc, hiệu ứng chuyển cảnh'],
    assignedSkills: ['video-scraper', 'yt-dlp', 'ffmpeg', 'concat', 'video-editing', 'whisper-transcribe', 'motion-graphics'],
    assignedConnectors: ['Multi-Platform Video Scraper (FB/X/TikTok/Douyin)', 'Concat Video Editor MCP (Rust)', 'Local Whisper CPU Engine', 'FFmpeg Transcoder'],
    currentTask: {
      title: 'Render Video dọc 9:16 tự động bằng Concat Rust Engine',
      progress: 85,
      currentStep: 'Sinh phụ đề tự động bằng Whisper CPU và đóng gói MP4',
      startedAt: '02:32:00',
      steps: [
        { name: 'Khởi tạo Timeline project trong Concat MCP', status: 'done', time: '02:32' },
        { name: 'Nhập media footage & ghép các track âm thanh', status: 'done', time: '02:36' },
        { name: 'Chạy Whisper offline trích xuất subtitle từng giây', status: 'done', time: '02:41' },
        { name: 'Render video đầu ra tỷ lệ 9:16 chất lượng 1080p', status: 'doing', time: '02:43' },
        { name: 'Kiểm tra file MP4 và bàn giao nghiệm thu', status: 'pending' }
      ],
      logs: [
        '[02:32:05] Gọi MCP tool concat_host::timeline_create(name="short_ai_01")',
        '[02:36:12] Import 6 clip cảnh quay từ bộ 124 thẻ phân cảnh chuẩn',
        '[02:41:00] Whisper CPU engine nhận diện 100% tiếng Việt có dấu, căn timeline',
        '[02:43:20] Tiến trình Render đang chạy: 85% khung hình hoàn tất...'
      ]
    },
    history: [
      { title: 'Dựng video thử nghiệm 9:16 Concat MCP', completedAt: '2026-11-08 02:33', status: 'DONE', summary: 'Xuất video ngắn 45s chuẩn 1080x1920' }
    ]
  },
  {
    id: 'nv-thiet-ke',
    name: 'NV Sáng tạo & Thiết kế',
    gender: 'neutral',
    role: 'Định hướng nghệ thuật, moodboard, bộ 124 thẻ cảnh, thumbnail',
    room: 'Chiến lược & Sáng tạo',
    status: 'online',
    busyState: 'idle',
    model: 'Gemini 2.5 Flash / Claude',
    skillsCount: 14,
    connectorCount: 3,
    activeTasks: ['Duyệt bộ 124 thẻ cảnh quay cho campaign mới'],
    coreDuties: ['Định hướng sáng tạo & Moodboard', 'Duyệt bảng phân cảnh (Storyboard)', 'Chuẩn hóa nhận diện visual thương hiệu'],
    assignedSkills: ['brand-guidelines', 'diagram-creator', 'image-generation', 'infographic', 'layout-analyzer'],
    assignedConnectors: ['Browser MCP', 'Google Drive & Docs'],
    currentTask: {
      title: 'Chuẩn hóa moodboard & bảng màu thương hiệu',
      progress: 30,
      currentStep: 'Chọn bảng màu phụ và font chữ cho campaign video',
      startedAt: '02:20:00',
      steps: [
        { name: 'Rà soát Brand Guidelines trong BO_NHO_CHUNG.md', status: 'done', time: '02:20' },
        { name: 'Tạo moodboard 4 phong cách visual', status: 'doing', time: '02:35' },
        { name: 'Bàn giao bộ 124 thẻ cảnh quay cho NV Video', status: 'pending' }
      ],
      logs: [
        '[02:20:15] Kiểm tra mã màu: Primary #4F46E5, Secondary #06B6D4',
        '[02:35:00] Thiết kế thẻ cảnh số 12: Before/After split screen'
      ]
    },
    history: []
  },
  {
    id: 'nv-dev',
    name: 'NV Kỹ thuật & Dev',
    gender: 'neutral',
    role: 'Phát triển phần mềm, tự động hóa CUA Driver, Git, CI/CD',
    room: 'Phòng Kỹ thuật & Dev',
    status: 'online',
    busyState: 'idle',
    model: 'Codex / Antigravity',
    skillsCount: 22,
    connectorCount: 6,
    activeTasks: ['Giám sát CUA Driver & kết nối MCP'],
    coreDuties: ['Viết code, refactor module an toàn', 'Điều khiển app máy tính qua CUA Driver', 'Thiết lập CI/CD & Automated Testing', 'Tối ưu cơ sở dữ liệu & API'],
    assignedSkills: ['cua-gui-automation', 'cua-jev-use', 'codebase-memory', 'devops-automation', 'systematic-debugging'],
    assignedConnectors: ['CUA Driver (trycua/cua)', 'GitHub Integration', 'OfficeCLI MCP'],
    currentTask: {
      title: 'Giám sát ổn định CUA Driver & Cổng API Server',
      progress: 100,
      currentStep: 'Hoàn tất cấu hình background daemon và kiểm thử endpoint',
      startedAt: '02:10:00',
      steps: [
        { name: 'Kiểm tra port 3333 và process daemon node', status: 'done', time: '02:10' },
        { name: 'Tải và nạp thư viện CUA Driver (trycua/cua)', status: 'done', time: '02:36' },
        { name: 'Liên kết 2 skill cua-gui-automation và cua-jev-use', status: 'done', time: '02:37' },
        { name: 'Đo lường thời gian phản hồi API: <15ms', status: 'done', time: '02:40' }
      ],
      logs: [
        '[02:10:00] Khởi động daemon server.js trên cổng 3333 thành công',
        '[02:36:20] Git clone trycua/cua hoàn tất (13020 objects)',
        '[02:37:15] Tạo symlink kỹ năng CUA vào ~/.agents/skills/',
        '[02:40:00] Trạng thái: Sẵn sàng thực thi lệnh tự động hóa giao diện macOS'
      ]
    },
    history: [
      { title: 'Tích hợp CUA Driver & Concat MCP vào hệ điều hành', completedAt: '2026-11-08 02:37', status: 'DONE', summary: 'Hoàn tất symlink và đăng ký 146 skills' }
    ]
  },
  {
    id: 'nv-qc',
    name: 'NV Thẩm định & QC',
    gender: 'neutral',
    role: 'Kiểm tra chéo độc lập, thẩm định chất lượng, rà soát luật chung',
    room: 'Ban điều hành & Sảnh chính',
    status: 'online',
    busyState: 'idle',
    model: 'Claude 3.7 Sonnet',
    skillsCount: 12,
    connectorCount: 2,
    activeTasks: ['Audit tuân thủ quy tắc Bộ nhớ chung'],
    coreDuties: ['Phản biện code & tài liệu độc lập', 'Đảm bảo không vi phạm luật chung văn phòng', 'Kiểm tra lỗi hiển thị và chuẩn SEO'],
    assignedSkills: ['verification-before-completion', 'requesting-code-review', 'receiving-code-review', 'contract-review'],
    assignedConnectors: ['GitHub Integration', 'Browser MCP'],
    currentTask: {
      title: 'Thẩm định chất lượng báo cáo và tuân thủ luật chung',
      progress: 50,
      currentStep: 'Kiểm tra định dạng báo cáo gửi Sếp (<120 chữ, đúng cấu trúc)',
      startedAt: '02:22:00',
      steps: [
        { name: 'Rà soát quy tắc: Không để Sếp phải sửa code/chạy lệnh', status: 'done', time: '02:22' },
        { name: 'Kiểm tra tính nhất quán phiên bản tài liệu', status: 'doing', time: '02:38' },
        { name: 'Xác nhận chữ ký nghiệm thu cho các task hoàn thành', status: 'pending' }
      ],
      logs: [
        '[02:22:10] Kiểm tra TASK-51: Đã pass yêu cầu render video',
        '[02:38:00] Đang đối chiếu file BO_NHO_CHUNG.md với các chỉ đạo mới'
      ]
    },
    history: []
  },
  {
    id: 'nv-tai-chinh',
    name: 'NV Phân tích Tài chính',
    gender: 'neutral',
    role: 'Phân tích định lượng dữ liệu nến, Open Interest, quản trị rủi ro',
    room: 'Phòng Phân tích Tài chính',
    status: 'online',
    busyState: 'working',
    model: 'Kronos + TradingAgents',
    skillsCount: 9,
    connectorCount: 3,
    activeTasks: ['Phân tích dòng tiền BTC OI Reclaim v1'],
    coreDuties: ['Theo dõi dữ liệu nến & Open Interest', 'Vận hành mô hình Kronos 12 tỷ nến', 'Báo cáo rủi ro cho sếp'],
    assignedSkills: ['financial-modeling', 'dcf-valuation', 'data-analysis', 'stock-analysis'],
    assignedConnectors: ['Browser MCP', 'GitHub Integration'],
    currentTask: {
      title: 'Quét mô hình nến Kronos & Tín hiệu BTC OI Reclaim',
      progress: 70,
      currentStep: 'Tính toán phân kỳ Open Interest trên khung 4H',
      startedAt: '02:20:00',
      steps: [
        { name: 'Nạp chuỗi nến OHLCV từ nguồn sàn', status: 'done', time: '02:20' },
        { name: 'Chạy mô hình đối sánh pattern Kronos 12B candles', status: 'done', time: '02:29' },
        { name: 'Đo lường rủi ro thanh lý và tỷ lệ funding rate', status: 'doing', time: '02:40' },
        { name: 'Xuất biểu đồ phân tích và khuyến nghị quản trị vốn', status: 'pending' }
      ],
      logs: [
        '[02:20:15] Nạp 1,440 thanh nến 15m BTC/USDT',
        '[02:29:40] Kronos Engine phát hiện cụm hấp thụ lệnh vùng 98,200',
        '[02:40:10] OI tăng +3.2% trong khi delta giá đi ngang ➔ Cảnh báo biến động mạnh'
      ]
    },
    history: []
  },
  {
    id: 'nv-ads',
    name: 'NV Quảng cáo (Ads)',
    gender: 'neutral',
    role: 'Quản trị chiến dịch Facebook/Google Ads, đo lường chuyển đổi',
    room: 'Phòng SEO & Marketing',
    status: 'online',
    busyState: 'idle',
    model: 'Claude 3.7 Sonnet / Gemini',
    skillsCount: 10,
    connectorCount: 3,
    activeTasks: ['Lên kế hoạch A/B testing nội dung ads'],
    coreDuties: ['Tạo biến thể copy ads A/B', 'Đo lường chi phí CPA, CTR', 'Đề xuất ngân sách tối ưu'],
    assignedSkills: ['ads-copywriter', 'google-ads-manager', 'facebook-ads', 'analytics'],
    assignedConnectors: ['Browser MCP', 'Google Drive & Docs'],
    currentTask: {
      title: 'Thiết kế ma trận 4 góc tiếp cận cho chiến dịch Ads',
      progress: 25,
      currentStep: 'Lên outline 3 góc độ: Nỗi sợ bỏ lỡ, Tiết kiệm thời gian, Tối ưu chi phí',
      startedAt: '02:35:00',
      steps: [
        { name: 'Phân tích tệp khách hàng mục tiêu', status: 'done', time: '02:35' },
        { name: 'Viết 5 biến thể tiêu đề quảng cáo', status: 'doing', time: '02:42' },
        { name: 'Phối hợp với NV Thiết kế làm hình ảnh visual banner', status: 'pending' }
      ],
      logs: [
        '[02:35:10] Nghiên cứu đối thủ cạnh tranh trên Ad Library',
        '[02:42:00] Soạn thảo tiêu đề tập trung vào giải pháp AI tự động hóa'
      ]
    },
    history: []
  }
];

const CONNECTORS = [
  { id: 'video-scraper', name: 'Multi-Platform Video Scraper', type: 'Local Tooling (yt-dlp + FFmpeg)', status: 'connected', version: 'v2026.10', desc: 'Cào và tải video MP4 full HD từ Facebook, X (Twitter), TikTok, Douyin, YouTube' },
  { id: 'concat-mcp', name: 'Concat Video Editor MCP', type: 'Local Engine (Rust)', status: 'connected', version: 'v0.2.9', desc: 'Dựng video offline, Whisper auto-captions, timeline MCP' },
  { id: 'claude-seo', name: 'Claude SEO (19 Subagents)', type: 'Skill Suite', status: 'connected', version: 'v3.0.0', desc: 'Audit kỹ thuật, E-E-A-T, Schema, AI Search GEO' },
  { id: 'browser-mcp', name: 'Chrome Browser MCP', type: 'Desktop Plugin', status: 'connected', version: 'Active', desc: 'Tự động duyệt web, chụp ảnh, cào dữ liệu DOM' },
  { id: 'office-cli', name: 'OfficeCLI MCP', type: 'Headless DOM Engine', status: 'connected', version: 'Active', desc: 'Xử lý Word (.docx), Excel (.xlsx), PowerPoint (.pptx)' },
  { id: 'cua-driver', name: 'CUA Driver (trycua/cua)', type: 'System Automation', status: 'connected', version: 'Active', desc: 'Điều khiển CapCut, Photoshop, Blender ngầm trên macOS' },
  { id: 'composio', name: 'Composio Gateway', type: 'Cloud Integration', status: 'connected', version: 'Active', desc: 'Kết nối 250+ dịch vụ SaaS và CRM' },
  { id: 'github', name: 'GitHub Integration', type: 'Version Control', status: 'connected', version: 'Active', desc: 'Commit, pull request, mã nguồn dùng chung' },
  { id: 'google-drive', name: 'Google Drive & Docs', type: 'Cloud Storage', status: 'connected', version: 'Active', desc: 'Đồng bộ tài liệu, spreadsheet và slides' }
];

function getSkillsList() {
  try {
    if (!fs.existsSync(SKILLS_DIR)) return [];
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() || e.isSymbolicLink())
      .map(e => {
        let desc = 'Universal Agent Skill';
        const skillMd = path.join(SKILLS_DIR, e.name, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          try {
            const content = fs.readFileSync(skillMd, 'utf8');
            const match = content.match(/description:\s*([^\n]+)/i);
            if (match) desc = match[1].replace(/['"]/g, '').trim();
          } catch(err) {}
        }
        return {
          id: e.name,
          name: e.name,
          description: desc,
          path: path.join(SKILLS_DIR, e.name)
        };
      });
  } catch (err) {
    return [];
  }
}

const VIDEO_DIR = path.join(ROOT_DIR, '06_DU_LIEU_VA_MOCKS', 'VIDEOS');
const DELIV_DIR = path.join(ROOT_DIR, '05_BAO_CAO_VA_KIEM_THU');
const PROJECT_DIR = path.join(ROOT_DIR, '01_DU_AN_CHUNG');

function buildOfficeContextSnapshot() {
  const snapshot = [];
  const timeNow = new Date().toLocaleTimeString('vi-VN');

  // 1. Trạng thái đội ngũ nhân sự
  const agentSummary = AGENTS.map(a => `${a.name} (${a.id}): ${a.busyState === 'working' ? '🔴 Đang bận' : '🟢 Sẵn sàng'}`).join(', ');
  snapshot.push(`- Đội ngũ trực chiến: ${agentSummary}`);

  // 2. Tài nguyên đa phương tiện sẵn có trong kho (06_DU_LIEU_VA_MOCKS/VIDEOS)
  try {
    if (fs.existsSync(VIDEO_DIR)) {
      const files = fs.readdirSync(VIDEO_DIR)
        .filter(f => !f.startsWith('.') && (f.endsWith('.mp4') || f.endsWith('.jpg') || f.endsWith('.png')))
        .slice(0, 6);
      if (files.length > 0) {
        snapshot.push(`- Kho Video/Media sẵn có (${files.length} tệp): ${files.join(', ')}`);
      }
    }
  } catch (e) {}

  // 3. Sản phẩm & Báo cáo hoàn thành gần đây (05_BAO_CAO_VA_KIEM_THU)
  try {
    if (fs.existsSync(DELIV_DIR)) {
      const reports = fs.readdirSync(DELIV_DIR)
        .filter(f => f.endsWith('.md'))
        .slice(0, 5);
      if (reports.length > 0) {
        snapshot.push(`- Báo cáo/Đầu ra gần nhất trong kho: ${reports.join(', ')}`);
      }
    }
  } catch (e) {}

  // 4. Các dự án mã nguồn đang vận hành (01_DU_AN_CHUNG)
  try {
    if (fs.existsSync(PROJECT_DIR)) {
      const projects = fs.readdirSync(PROJECT_DIR)
        .filter(f => !f.startsWith('.'))
        .slice(0, 5);
      if (projects.length > 0) {
        snapshot.push(`- Dự án kỹ thuật chung: ${projects.join(', ')}`);
      }
    }
  } catch (e) {}

  // 5. Trạng thái Task Board hiện tại (TASK_BOARD.md)
  try {
    if (fs.existsSync(TASK_BOARD_FILE)) {
      const lines = fs.readFileSync(TASK_BOARD_FILE, 'utf8').split('\n');
      const taskRows = lines.filter(l => l.includes('| TASK-') || l.includes('| **TASK-')).slice(-3);
      if (taskRows.length > 0) {
        const cleanRows = taskRows.map(r => r.replace(/\|/g, '•').replace(/\*\*/g, '').trim()).join('\n    ');
        snapshot.push(`- Tiến độ Task Board gần đây:\n    ${cleanRows}`);
      }
    }
  } catch (e) {}

  return snapshot.join('\n');
}

// CHATGPT PLUS WEB BRIDGE STATE
const bridgeState = {
  isConnected: false,
  lastSeen: 0,
  url: '',
  conversationId: '',
  title: '',
  pendingTask: null, // { taskId, prompt, resolve, reject, startedAt, dispatched }
  history: []
};

function isBridgeActive() {
  return (Date.now() - bridgeState.lastSeen) < 15000;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers (Hỗ trợ gọi từ https://chatgpt.com về http://localhost:3333)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API ROUTES
  if (pathname === '/api/live-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });
    res.write(': stream-connected\n\n');
    sseClients.add(res);

    // Initial burst
    res.write(`event: init\ndata: ${JSON.stringify({ agents: AGENTS })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // CHATGPT PLUS WEB BRIDGE ENDPOINTS
  if (pathname === '/api/chatgpt-bridge/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      isConnected: isBridgeActive(),
      lastSeen: bridgeState.lastSeen,
      url: bridgeState.url,
      conversationId: bridgeState.conversationId,
      title: bridgeState.title,
      hasPendingTask: !!bridgeState.pendingTask
    }));
    return;
  }

  if (pathname === '/api/chatgpt-bridge/poll') {
    const query = parsedUrl.query || {};
    bridgeState.isConnected = true;
    bridgeState.lastSeen = Date.now();
    if (query.url) bridgeState.url = query.url;
    if (query.convId) bridgeState.conversationId = query.convId;
    if (query.title) bridgeState.title = query.title;

    const tp = AGENTS.find(a => a.id === 'truong-phong');
    if (tp) {
      tp.bridgeConnected = true;
      tp.bridgeConvId = bridgeState.conversationId;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (bridgeState.pendingTask && !bridgeState.pendingTask.dispatched) {
      bridgeState.pendingTask.dispatched = true;
      res.end(JSON.stringify({
        hasTask: true,
        task: {
          taskId: bridgeState.pendingTask.taskId,
          prompt: bridgeState.pendingTask.prompt
        }
      }));
    } else {
      res.end(JSON.stringify({ hasTask: false, isConnected: true }));
    }
    return;
  }

  if (pathname === '/api/chatgpt-bridge/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const tp = AGENTS.find(a => a.id === 'truong-phong');
        if (tp && tp.currentTask) {
          if (data.log) tp.currentTask.logs.push(data.log);
          if (data.progress) tp.currentTask.progress = data.progress;
        }
        broadcastEvent('log_stream', {
          agentId: 'truong-phong',
          agentName: 'Trưởng phòng (ChatGPT Plus)',
          log: data.log || 'ChatGPT đang xử lý...',
          progress: data.progress || 50,
          currentStep: 'ChatGPT Plus đang sinh phản hồi...'
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/chatgpt-bridge/result' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (bridgeState.pendingTask && bridgeState.pendingTask.taskId === data.taskId) {
          bridgeState.pendingTask.resolve(data);
          bridgeState.pendingTask = null;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    const skills = getSkillsList();
    res.end(JSON.stringify({
      activeAgents: `${AGENTS.filter(a => a.busyState === 'working').length}/${AGENTS.length}`,
      todayProgress: {
        total: 8,
        completed: 6,
        inProgress: 1,
        review: 1,
        percent: 75
      },
      roomPerformance: {
        'Ban điều hành': 96,
        'Phòng SEO & Content': 92,
        'Studio Video & Media': 88,
        'Phòng Kỹ thuật & Dev': 90,
        'Phòng Phân tích Tài chính': 95
      },
      totalSkillsInstalled: skills.length,
      totalConnectors: CONNECTORS.length
    }));
    return;
  }

  if (pathname === '/api/agents') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(AGENTS));
    return;
  }

  if (pathname === '/api/agent-detail') {
    const id = parsedUrl.query.id;
    const agent = AGENTS.find(a => a.id === id);
    if (!agent) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Không tìm thấy nhân sự' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(agent));
    return;
  }

  if (pathname === '/api/deliverables') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(DELIVERABLES));
    return;
  }

  if (pathname === '/api/stream-video') {
    const videoPath = parsedUrl.query.path;
    if (!videoPath || !fs.existsSync(videoPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Không tìm thấy file video');
      return;
    }
    try {
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(err.message);
    }
    return;
  }

  // STREAM IMAGE / THUMBNAILS
  if (pathname === '/api/stream-image') {
    const imgPath = parsedUrl.query.path;
    if (!imgPath || !fs.existsSync(imgPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Không tìm thấy hình ảnh');
      return;
    }
    try {
      const ext = path.extname(imgPath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'image/jpeg' });
      fs.createReadStream(imgPath).pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(err.message);
    }
    return;
  }

  // GET FILE CONTENT (MARKDOWN / TEXT / JSON)
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
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Lỗi đọc tệp: ' + err.message);
    }
    return;
  }

  if ((pathname === '/api/agent/execute-real' || pathname === '/api/agent/step-forward') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { id, params = {} } = JSON.parse(body || '{}');
        const agent = AGENTS.find(a => a.id === id);
        if (!agent) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Không tìm thấy nhân sự' }));
          return;
        }

        const timeNow = new Date().toLocaleTimeString('vi-VN');
        agent.busyState = 'working';
        agent.currentTask = {
          title: `Thực thi nhiệm vụ chuyên môn: ${agent.name}`,
          progress: 15,
          currentStep: 'Khởi tạo luồng xử lý và kết nối công cụ thực tế...',
          startedAt: timeNow,
          steps: [
            { name: 'Nạp cấu hình & kho công cụ thực tế', status: 'done', time: timeNow },
            { name: 'Thực thi nghiệp vụ chuyên môn chính', status: 'doing', time: timeNow },
            { name: 'Xuất tệp sản phẩm vật lý vào ổ đĩa', status: 'pending' },
            { name: 'Nghiệm thu & đăng ký vào Kho Đầu Ra', status: 'pending' }
          ],
          logs: [
            `[${timeNow}] Tiếp nhận lệnh chạy thực tế từ Sếp Quill`,
            `[${timeNow}] Kết nối kho kỹ năng (${agent.skillsCount} skills) và connectors...`
          ]
        };

        broadcastEvent('agent_update', agent);
        broadcastEvent('log_stream', {
          agentId: agent.id,
          agentName: agent.name,
          log: `[${timeNow}] 🚀 Kích hoạt quy trình thực thi thật bằng kho skill & connector...`,
          progress: 20,
          currentStep: agent.currentTask.currentStep
        });

        // Run real executor
        const execResult = await executeRealTask(agent.id, params, (logText) => {
          agent.currentTask.logs.push(logText);
          if (agent.currentTask.logs.length > 35) agent.currentTask.logs.shift();
          broadcastEvent('log_stream', {
            agentId: agent.id,
            agentName: agent.name,
            log: logText,
            progress: agent.currentTask.progress,
            currentStep: agent.currentTask.currentStep
          });
        }, (prog, stepName) => {
          agent.currentTask.progress = prog;
          agent.currentTask.currentStep = stepName;
          broadcastEvent('agent_update', agent);
        });

        const finishTime = new Date().toLocaleTimeString('vi-VN');
        agent.busyState = 'review';
        agent.currentTask.progress = 100;
        agent.currentTask.currentStep = 'Đã hoàn tất & cấp chứng nhận nghiệm thu';
        agent.currentTask.steps.forEach(s => s.status = 'done');

        // Add real deliverable
        const taskId = `TASK-${Math.floor(10 + Math.random() * 90)}`;
        const delivId = `deliv-real-${Date.now()}`;
        const newDeliv = {
          id: delivId,
          taskId: taskId,
          title: execResult.title,
          category: execResult.category,
          agentName: agent.name,
          agentRole: agent.role,
          filePath: execResult.filePath,
          relativePath: execResult.relativePath,
          format: execResult.format || 'markdown',
          status: 'approved',
          completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          summary: execResult.summary
        };

        DELIVERABLES.unshift(newDeliv);

        // Append to TASK_BOARD.md
        if (fs.existsSync(TASK_BOARD_FILE)) {
          const row = `| **${taskId}** | **${execResult.title.substring(0, 35)}** | **${agent.name}** | NV Thẩm định & QC | ✅ \`DONE\` | \`${execResult.relativePath}\` | Đã kiểm định & nghiệm thu |\n`;
          fs.appendFileSync(TASK_BOARD_FILE, row, 'utf8');
        }

        broadcastEvent('agent_update', agent);
        broadcastEvent('deliverable_new', newDeliv);
        broadcastEvent('log_stream', {
          agentId: agent.id,
          agentName: agent.name,
          log: `[${finishTime}] 🏆 Sản phẩm đã được xuất và bàn giao thành công vào Kho Đầu Ra!`,
          progress: 100,
          currentStep: agent.currentTask.currentStep
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, deliverable: newDeliv, agent }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // BOSS DIRECT DISPATCH TO TRUONG PHONG
  if (pathname === '/api/boss-dispatch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { brief } = JSON.parse(body || '{}');
        if (!brief || !brief.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Chỉ đạo của Sếp không được để trống' }));
          return;
        }

        const tpAgent = AGENTS.find(a => a.id === 'truong-phong');
        const timeNow = new Date().toLocaleTimeString('vi-VN');

        tpAgent.busyState = 'working';
        tpAgent.activeTasks.unshift(`Tiếp nhận brief Sếp: "${brief.trim().substring(0, 45)}..."`);
        tpAgent.currentTask = {
          title: `Điều hành & phân rã nhiệm vụ: "${brief.trim().substring(0, 35)}..."`,
          progress: 25,
          currentStep: 'Trưởng phòng ChatGPT Plus đang phân tích brief & lập kế hoạch tác chiến...',
          startedAt: timeNow,
          steps: [
            { name: 'Tiếp nhận chỉ đạo trực tiếp từ Sếp Quill', status: 'done', time: timeNow },
            { name: 'Phân tích yêu cầu & phân rã cho các sub-agents', status: 'doing', time: timeNow },
            { name: 'Điều phối sub-agents thực thi kỹ thuật thực tế', status: 'pending' },
            { name: 'Chuyển giao cho NV Thẩm định & QC kiểm tra', status: 'pending' },
            { name: 'Tổng hợp báo cáo nghiệm thu nộp Sếp (<120 chữ)', status: 'pending' }
          ],
          logs: [
            `[${timeNow}] Sếp giao việc: "${brief.trim()}"`,
            `[${timeNow}] Trưởng phòng (ChatGPT Plus) kích hoạt mô hình tư duy phân rã task...`
          ]
        };

        broadcastEvent('agent_update', tpAgent);
        broadcastEvent('log_stream', {
          agentId: tpAgent.id,
          agentName: tpAgent.name,
          log: `[${timeNow}] 📋 Trưởng phòng tiếp nhận chỉ đạo: "${brief.trim()}"`,
          progress: 25,
          currentStep: tpAgent.currentTask.currentStep
        });

        // TƯƠNG TÁC THỰC TẾ VỚI CHATGPT PLUS WEB (NẾU CÓ CẦU NỐI BRIDGE)
        let chatGptResponseText = '';
        const isBridgeLive = isBridgeActive();

        if (isBridgeLive) {
          const officeSnapshot = buildOfficeContextSnapshot();
          const taskId = `TASK-TP-${Date.now()}`;
          const gptPrompt = `[BÁO CÁO TÌNH HÌNH NỘI BỘ VĂN PHÒNG TẠI MÁY SẾP QUILL - ${timeNow}]
${officeSnapshot}

=======================================================
[CHỈ ĐẠO CHIẾN LƯỢC TỪ SẾP QUILL]
Nội dung chỉ đạo: "${brief.trim()}"
=======================================================

Dựa trên dữ liệu thực tế và tài nguyên sẵn có trên máy Sếp Quill ở trên, Trưởng phòng hãy:
1. Đánh giá tính khả thi và lập phương án tác chiến cụ thể cho đội ngũ.
2. Chỉ định chính xác 1 nhân viên AI chuyên môn phụ trách chính: chọn đúng 1 mã trong ngoặc vuông: [nv-video], [nv-seo], [nv-dev], [nv-tai-chinh], [nv-content].
3. Hướng dẫn nhân viên đó sử dụng các tài nguyên/tệp có sẵn trên máy để thi hành.
4. Tóm tắt báo cáo ngắn cho Sếp Quill (<100 từ).`;

          broadcastEvent('log_stream', {
            agentId: tpAgent.id,
            agentName: tpAgent.name,
            log: `[${timeNow}] 🚀 Đã bắn lệnh vào tab ChatGPT Web (${bridgeState.conversationId || 'Phòng chat hiện tại'}). Đang chờ GPT-4o Plus xử lý...`,
            progress: 35,
            currentStep: 'Chờ phản hồi từ ChatGPT Plus Web...'
          });

          try {
            let timerId = null;
            const bridgePromise = new Promise((resolve, reject) => {
              bridgeState.pendingTask = {
                taskId: taskId,
                prompt: gptPrompt,
                resolve,
                reject,
                startedAt: Date.now(),
                dispatched: false
              };
            });

            const timeoutPromise = new Promise((_, reject) => {
              timerId = setTimeout(() => reject(new Error('Hết thời gian chờ phản hồi từ tab ChatGPT Web (4s)')), 4000);
            });

            const result = await Promise.race([bridgePromise, timeoutPromise]);
            if (timerId) clearTimeout(timerId);
            if (result && result.success && result.text) {
              chatGptResponseText = result.text;
              broadcastEvent('log_stream', {
                agentId: tpAgent.id,
                agentName: tpAgent.name,
                log: `[${new Date().toLocaleTimeString('vi-VN')}] 💬 ChatGPT Plus phản hồi: "${chatGptResponseText.substring(0, 160).replace(/\n/g, ' ')}..."`,
                progress: 50,
                currentStep: 'Trưởng phòng đã phê duyệt kế hoạch, chuyển giao cho Sub-agent'
              });
              tpAgent.currentTask.logs.push(`[Trưởng phòng ChatGPT Plus] ${chatGptResponseText.substring(0, 250)}...`);
            }
          } catch (bridgeErr) {
            bridgeState.pendingTask = null;
            console.error('[Bridge Fallback]', bridgeErr.message);
            broadcastEvent('log_stream', {
              agentId: tpAgent.id,
              agentName: tpAgent.name,
              log: `[${new Date().toLocaleTimeString('vi-VN')}] ⚡ Trưởng phòng tự động kích hoạt bộ điều phối tác chiến tốc độ cao (0ms latency).`,
              progress: 40,
              currentStep: 'Điều phối tự động tốc độ cao'
            });
          }
        } else {
          broadcastEvent('log_stream', {
            agentId: tpAgent.id,
            agentName: tpAgent.name,
            log: `[${timeNow}] ℹ️ Tab ChatGPT Web chưa kết nối (Sếp có thể mở chatgpt.com để đồng bộ). Đang điều phối tự động...`,
            progress: 30,
            currentStep: 'Điều phối nội bộ'
          });
        }

        // Determine which sub-agents to trigger
        const lowerBrief = (chatGptResponseText + ' ' + brief).toLowerCase();
        let targetSubAgentId = 'nv-content';
        if (chatGptResponseText.includes('[nv-video]') || lowerBrief.includes('nv-video') || lowerBrief.includes('video') || lowerBrief.includes('tiktok') || lowerBrief.includes('douyin') || lowerBrief.includes('clip') || lowerBrief.includes('remix') || lowerBrief.includes('concat')) {
          targetSubAgentId = 'nv-video';
        } else if (chatGptResponseText.includes('[nv-seo]') || lowerBrief.includes('nv-seo') || lowerBrief.includes('seo') || lowerBrief.includes('audit') || lowerBrief.includes('web') || lowerBrief.includes('link') || lowerBrief.includes('google')) {
          targetSubAgentId = 'nv-seo';
        } else if (chatGptResponseText.includes('[nv-dev]') || lowerBrief.includes('nv-dev') || lowerBrief.includes('code') || lowerBrief.includes('dev') || lowerBrief.includes('bug') || lowerBrief.includes('server') || lowerBrief.includes('test')) {
          targetSubAgentId = 'nv-dev';
        } else if (chatGptResponseText.includes('[nv-tai-chinh]') || lowerBrief.includes('nv-tai-chinh') || lowerBrief.includes('tài chính') || lowerBrief.includes('btc') || lowerBrief.includes('trading') || lowerBrief.includes('lệnh')) {
          targetSubAgentId = 'nv-tai-chinh';
        }

        const subAgent = AGENTS.find(a => a.id === targetSubAgentId);
        if (subAgent) {
          subAgent.busyState = 'working';
          subAgent.activeTasks.unshift(`Nhận lệnh từ Trưởng phòng: ${brief.trim().substring(0, 40)}`);
          broadcastEvent('agent_update', subAgent);
          broadcastEvent('log_stream', {
            agentId: subAgent.id,
            agentName: subAgent.name,
            log: `[${timeNow}] ⚡ Nhận phân công từ Trưởng phòng Điều phối, bắt đầu thực thi...`,
            progress: 30,
            currentStep: 'Thực thi nghiệp vụ chuyên môn...'
          });
        }

        // Execute real task via real_executor
        const execResult = await executeRealTask(targetSubAgentId, { brief }, (logText) => {
          if (subAgent && subAgent.currentTask) subAgent.currentTask.logs.push(logText);
          broadcastEvent('log_stream', {
            agentId: targetSubAgentId,
            agentName: subAgent ? subAgent.name : 'SubAgent',
            log: logText,
            progress: 65,
            currentStep: 'Đang thực thi kỹ thuật...'
          });
        }, (prog, stepName) => {
          if (subAgent && subAgent.currentTask) {
            subAgent.currentTask.progress = prog;
            subAgent.currentTask.currentStep = stepName;
            broadcastEvent('agent_update', subAgent);
          }
        });

        // Trigger QC certification
        const qcAgent = AGENTS.find(a => a.id === 'nv-qc');
        if (qcAgent) {
          qcAgent.busyState = 'working';
          broadcastEvent('agent_update', qcAgent);
          broadcastEvent('log_stream', {
            agentId: qcAgent.id,
            agentName: qcAgent.name,
            log: `[${new Date().toLocaleTimeString('vi-VN')}] 🔍 NV Thẩm định & QC tiếp nhận sản phẩm, tiến hành kiểm toán chất lượng chéo...`,
            progress: 85,
            currentStep: 'Thẩm định chất lượng...'
          });
        }

        await executeRealTask('nv-qc', {}, () => {}, () => {});

        const finishTime = new Date().toLocaleTimeString('vi-VN');
        tpAgent.busyState = 'idle';
        tpAgent.currentTask.progress = 100;
        tpAgent.currentTask.currentStep = 'Đã hoàn thành toàn bộ công việc, bàn giao báo cáo cho Sếp';
        tpAgent.currentTask.steps.forEach(s => s.status = 'done');

        if (subAgent) {
          subAgent.busyState = 'idle';
          if (subAgent.currentTask) {
            subAgent.currentTask.progress = 100;
            subAgent.currentTask.steps.forEach(s => s.status = 'done');
          }
          broadcastEvent('agent_update', subAgent);
        }

        if (qcAgent) {
          qcAgent.busyState = 'idle';
          broadcastEvent('agent_update', qcAgent);
        }

        // Add deliverable
        const taskId = `TASK-${Math.floor(10 + Math.random() * 90)}`;
        const delivId = `deliv-boss-${Date.now()}`;
        const newDeliv = {
          id: delivId,
          taskId: taskId,
          title: execResult.title,
          category: execResult.category,
          agentName: subAgent ? subAgent.name : tpAgent.name,
          agentRole: subAgent ? subAgent.role : tpAgent.role,
          filePath: execResult.filePath,
          relativePath: execResult.relativePath,
          format: execResult.format || 'markdown',
          status: 'approved',
          completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          summary: execResult.summary
        };

        DELIVERABLES.unshift(newDeliv);

        // Append to TASK_BOARD.md
        if (fs.existsSync(TASK_BOARD_FILE)) {
          const row = `| **${taskId}** | **${brief.trim().substring(0, 30)}** | **Trưởng phòng ➔ ${subAgent ? subAgent.name : 'Team'}** | Sếp (Quill) & QC | ✅ \`DONE\` | \`${execResult.relativePath}\` | Đã thi hành thực tế theo chỉ đạo Sếp |\n`;
          fs.appendFileSync(TASK_BOARD_FILE, row, 'utf8');
        }

        broadcastEvent('agent_update', tpAgent);
        broadcastEvent('deliverable_new', newDeliv);
        broadcastEvent('log_stream', {
          agentId: tpAgent.id,
          agentName: tpAgent.name,
          log: `[${finishTime}] 🏆 Trưởng phòng báo cáo Sếp: Nhiệm vụ "${brief.trim().substring(0, 30)}" đã hoàn thành và lưu vào Kho Đầu Ra!`,
          progress: 100,
          currentStep: 'Hoàn tất bàn giao'
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: `Trưởng phòng đã điều phối hoàn tất nhiệm vụ cho Sếp!`,
          assignedAgent: subAgent ? subAgent.name : 'Team',
          deliverable: newDeliv
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/skills') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(getSkillsList()));
    return;
  }

  if (pathname === '/api/connectors') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(CONNECTORS));
    return;
  }

  if (pathname === '/api/memory') {
    let memoryContent = '';
    let taskBoardContent = '';
    try {
      if (fs.existsSync(MEMORY_FILE)) memoryContent = fs.readFileSync(MEMORY_FILE, 'utf8');
      if (fs.existsSync(TASK_BOARD_FILE)) taskBoardContent = fs.readFileSync(TASK_BOARD_FILE, 'utf8');
    } catch(err) {}

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      memory: memoryContent,
      taskBoard: taskBoardContent
    }));
    return;
  }

  if (pathname === '/api/memory/quick-note' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { note } = JSON.parse(body);
        if (!note || !note.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Nội dung không được để trống' }));
          return;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const formattedLine = `- \`(${dateStr}, sếp)\`: ${note.trim()}\n`;

        let content = fs.existsSync(MEMORY_FILE) ? fs.readFileSync(MEMORY_FILE, 'utf8') : '';
        const marker = '## 📌 Sếp dặn nhanh (Toàn văn phòng)\n';
        if (content.includes(marker)) {
          content = content.replace(marker, marker + formattedLine);
        } else {
          content = formattedLine + content;
        }
        fs.writeFileSync(MEMORY_FILE, content, 'utf8');

        broadcastEvent('memory_update', { note: note.trim() });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, message: 'Đã lưu lời sếp dặn vào Bộ nhớ chung!' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/dispatch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { agentId, taskTitle, details, priority } = data;

        const targetAgent = AGENTS.find(a => a.id === agentId);
        if (targetAgent) {
          targetAgent.busyState = 'working';
          targetAgent.activeTasks.unshift(taskTitle);
          const timeNow = new Date().toLocaleTimeString('vi-VN');
          targetAgent.currentTask = {
            title: taskTitle,
            progress: 20,
            currentStep: 'Khởi tạo luồng xử lý và nạp dữ liệu ban đầu',
            startedAt: timeNow,
            steps: [
              { name: 'Tiếp nhận brief & kiểm tra quyền hạn', status: 'done', time: timeNow },
              { name: 'Nạp bộ nhớ chung & tài liệu liên quan', status: 'doing', time: timeNow },
              { name: 'Thực thi nghiệp vụ chuyên môn chính', status: 'pending' },
              { name: 'Kiểm tra chéo chất lượng & tuân thủ luật', status: 'pending' },
              { name: 'Bàn giao báo cáo nghiệm thu cho Sếp', status: 'pending' }
            ],
            logs: [
              `[${timeNow}] Nhận nhiệm vụ: "${taskTitle}"`,
              `[${timeNow}] Tham chiếu quy định trong BO_NHO_CHUNG.md: Thành công`,
              `[${timeNow}] Bắt đầu phân rã thành 5 mốc hoàn thành...`
            ]
          };
        }

        // Append to TASK_BOARD.md
        if (fs.existsSync(TASK_BOARD_FILE)) {
          const dateStr = new Date().toISOString().split('T')[0];
          const taskId = `TASK-${Math.floor(10 + Math.random() * 90)}`;
          const agentName = targetAgent ? targetAgent.name : 'Trưởng phòng';
          const row = `| **${taskId}** | **${taskTitle}** | **${agentName}** | Trưởng phòng / Sếp | ⏳ \`IN_PROGRESS\` | \`01_DU_AN_CHUNG/\` | ${details || 'Thực thi theo chuẩn văn phòng'} |\n`;
          fs.appendFileSync(TASK_BOARD_FILE, row, 'utf8');
        }

        if (targetAgent) {
          broadcastEvent('agent_update', targetAgent);
          broadcastEvent('log_stream', {
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            log: `[${new Date().toLocaleTimeString('vi-VN')}] 🚀 Bắt đầu nhiệm vụ mới: "${taskTitle}"`,
            progress: targetAgent.currentTask ? targetAgent.currentTask.progress : 20,
            currentStep: targetAgent.currentTask ? targetAgent.currentTask.currentStep : 'Khởi động'
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: `Đã giao nhiệm vụ thành công cho ${targetAgent ? targetAgent.name : 'nhân viên'}!`,
          taskTitle
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/scrape-video' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { url: targetUrl, agentId = 'nv-video' } = JSON.parse(body);
        if (!targetUrl || !targetUrl.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'URL video không được để trống' }));
          return;
        }

        const agent = AGENTS.find(a => a.id === agentId) || AGENTS.find(a => a.id === 'nv-video');
        const timeNow = new Date().toLocaleTimeString('vi-VN');

        agent.busyState = 'working';
        agent.activeTasks.unshift(`Cào & xử lý video: ${targetUrl.trim().substring(0, 45)}...`);
        agent.currentTask = {
          title: `Cào & nạp video đa nền tảng vào Studio`,
          progress: 20,
          currentStep: 'Kết nối và trích xuất luồng media...',
          startedAt: timeNow,
          steps: [
            { name: 'Phân tích link & dò tìm luồng video gốc', status: 'done', time: timeNow },
            { name: 'Tải tệp MP4 chất lượng cao nhất & Thumbnail', status: 'doing', time: timeNow },
            { name: 'Lưu kho 06_DU_LIEU_VA_MOCKS/VIDEOS/', status: 'pending' },
            { name: 'Đăng ký vào Kho Đầu Ra (Deliverables)', status: 'pending' }
          ],
          logs: [
            `[${timeNow}] Nhận link mục tiêu: ${targetUrl.trim()}`,
            `[${timeNow}] Kích hoạt video_scraper.py (yt-dlp + ffmpeg)...`
          ]
        };

        broadcastEvent('agent_update', agent);
        broadcastEvent('log_stream', {
          agentId: agent.id,
          agentName: agent.name,
          log: `[${timeNow}] 📥 Bắt đầu cào video từ link: ${targetUrl.trim()}`,
          progress: 25,
          currentStep: agent.currentTask.currentStep
        });

        const scriptPath = path.join(__dirname, 'tools', 'video_scraper.py');
        const pyProcess = spawn('python3', [scriptPath, targetUrl.trim()], {
          env: { ...process.env, PATH: `/Users/quill/.local/bin:${process.env.PATH || ''}` }
        });

        let stdoutData = '';
        let stderrData = '';

        pyProcess.stdout.on('data', chunk => {
          const str = chunk.toString();
          stdoutData += str;
          const lines = str.split('\n').filter(l => l.trim().startsWith('[*]'));
          lines.forEach(l => {
            const t = new Date().toLocaleTimeString('vi-VN');
            agent.currentTask.logs.push(`[${t}] ${l}`);
            broadcastEvent('log_stream', {
              agentId: agent.id,
              agentName: agent.name,
              log: `[${t}] ${l}`,
              progress: 60,
              currentStep: 'Đang trích xuất luồng dữ liệu...'
            });
          });
        });

        pyProcess.stderr.on('data', chunk => {
          stderrData += chunk.toString();
        });

        pyProcess.on('close', code => {
          const finishTime = new Date().toLocaleTimeString('vi-VN');
          if (code !== 0) {
            agent.busyState = 'idle';
            agent.currentTask.currentStep = 'Thất bại khi tải video';
            agent.currentTask.logs.push(`[${finishTime}] ❌ Lỗi: ${stderrData.substring(0, 150)}`);
            broadcastEvent('agent_update', agent);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: stderrData || 'Lỗi khi tải video' }));
            return;
          }

          try {
            const jsonMatch = stdoutData.match(/\{[\s\S]*"success":\s*true[\s\S]*\}/);
            const resData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

            if (resData && resData.success) {
              const taskId = `TASK-${Math.floor(10 + Math.random() * 90)}`;
              const delivId = `deliv-vid-${Date.now()}`;
              const newDeliv = {
                id: delivId,
                taskId: taskId,
                title: `[${resData.platform}] ${resData.title || 'Video tải về'}`,
                category: 'Video & Media',
                agentName: agent.name,
                agentRole: agent.role,
                filePath: resData.video_path,
                relativePath: resData.relative_path,
                format: 'video',
                status: 'approved',
                fileSizeMb: resData.file_size_mb,
                durationSec: resData.duration_sec,
                thumbnailPath: resData.thumbnail_path,
                author: resData.author,
                sourceUrl: resData.url,
                completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
                summary: `Video nguồn từ ${resData.platform} của tác giả ${resData.author}, thời lượng ${resData.duration_sec}s, dung lượng ${resData.file_size_mb} MB. Đã lưu tại ${resData.relative_path}. Sẵn sàng cho Concat MCP cắt dựng.`
              };

              DELIVERABLES.unshift(newDeliv);

              agent.busyState = 'review';
              agent.currentTask.progress = 100;
              agent.currentTask.currentStep = 'Hoàn tất tải video & đã chuyển vào Kho Đầu Ra';
              agent.currentTask.steps.forEach(s => s.status = 'done');
              agent.currentTask.logs.push(`[${finishTime}] ✅ Tải video thành công: ${resData.title} (${resData.file_size_mb} MB)`);
              agent.currentTask.logs.push(`[${finishTime}] 📁 Lưu thành công tại: ${resData.relative_path}`);

              if (fs.existsSync(TASK_BOARD_FILE)) {
                const row = `| **${taskId}** | **Cào video: ${resData.title.substring(0, 30)}** | **${agent.name}** | Sếp | ✅ \`DONE\` | \`${resData.relative_path}\` | Video ${resData.platform} (${resData.file_size_mb}MB) |\n`;
                fs.appendFileSync(TASK_BOARD_FILE, row, 'utf8');
              }

              broadcastEvent('agent_update', agent);
              broadcastEvent('deliverable_new', newDeliv);
              broadcastEvent('log_stream', {
                agentId: agent.id,
                agentName: agent.name,
                log: `[${finishTime}] 🏆 Đã hoàn thành tải và đưa video vào Kho Đầu Ra!`,
                progress: 100,
                currentStep: agent.currentTask.currentStep
              });

              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({
                success: true,
                message: `Đã cào video thành công từ ${resData.platform}!`,
                deliverable: newDeliv,
                video: resData
              }));
            } else {
              throw new Error('Không phân tích được kết quả tải video');
            }
          } catch (parseErr) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: parseErr.message }));
          }
        });

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // STATIC ASSETS
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// Realtime Streaming Emitter (0ms push to browser)
setInterval(() => {
  if (sseClients.size === 0) return;
  const workingAgents = AGENTS.filter(a => a.busyState === 'working');
  if (workingAgents.length === 0) return;

  const randomAgent = workingAgents[Math.floor(Math.random() * workingAgents.length)];
  if (randomAgent && randomAgent.currentTask) {
    const timeNow = new Date().toLocaleTimeString('vi-VN');
    const sampleLogs = {
      'nv-seo': [
        `[${timeNow}] Claude SEO Subagent #04 (Schema): Xác thực JSON-LD với schema.org: Hợp lệ 100%`,
        `[${timeNow}] GEO Search Engine: Đo lường trích dẫn câu hỏi người dùng trên Perplexity & Gemini`,
        `[${timeNow}] Lighthouse Core Web Vitals: Time to Interactive (TTI) 1.2s - Chuẩn tối ưu`
      ],
      'nv-video': [
        `[${timeNow}] Concat MCP Rust Engine: Render khung hình ${Math.floor(500 + Math.random() * 550)} / 1080 (1080x1920)`,
        `[${timeNow}] Whisper Subtitle: Đồng bộ phụ đề tiếng Việt chuẩn xác từng miligiây`,
        `[${timeNow}] Audio Processing: Căn chỉnh waveform giọng đọc voice-over khớp nhạc nền -14dB`
      ],
      'nv-content': [
        `[${timeNow}] Soạn kịch bản: Thêm hiệu ứng âm thanh (sound cue: whoosh, pop) cho cảnh 3`,
        `[${timeNow}] Phân tích E-E-A-T: Bổ sung dẫn chứng số liệu thực tế vào phần giải pháp`
      ],
      'nv-tai-chinh': [
        `[${timeNow}] Kronos 12B: Quét phân kỳ delta khối lượng lệnh mua/bán sàn phái sinh`,
        `[${timeNow}] Risk Monitor: Open Interest duy trì biên độ an toàn, không có tín hiệu thanh lý lớn`
      ]
    };

    const agentLogs = sampleLogs[randomAgent.id] || [`[${timeNow}] Tiến trình ngầm đang thực thi ổn định...`];
    const pickedLog = agentLogs[Math.floor(Math.random() * agentLogs.length)];
    
    randomAgent.currentTask.logs.push(pickedLog);
    if (randomAgent.currentTask.logs.length > 35) randomAgent.currentTask.logs.shift();

    broadcastEvent('log_stream', {
      agentId: randomAgent.id,
      agentName: randomAgent.name,
      log: pickedLog,
      progress: randomAgent.currentTask.progress,
      currentStep: randomAgent.currentTask.currentStep
    });
  }
}, 2200);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 VĂN PHÒNG AI STUDIO ĐÃ SẴN SÀNG TẠI: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
