'use strict';

(() => {
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const node = (tag, className = '', value) => {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (value !== undefined && value !== null) result.textContent = String(value);
    return result;
  };
  const list = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.entries(value).map(([id, entry]) => typeof entry === 'object' && entry ? { id, ...entry } : { id, name: id, status: entry }) : [];
  const text = value => value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  const statuses = {
    QUEUED: 'Đang chờ', RUNNING: 'Đang thực hiện', BLOCKED: 'Thiếu điều kiện', INTERRUPTED: 'Bị gián đoạn', FAILED: 'Thực thi lỗi', CANCELLED: 'Đã hủy', NEEDS_REVISION: 'Cần chỉnh sửa', AWAITING_APPROVAL: 'Chờ CEO duyệt', DONE: 'Đã hoàn tất',
    AVAILABLE: 'Khả dụng', WORKING: 'Đang làm việc', UNAVAILABLE: 'Chưa khả dụng', NOT_CONNECTED: 'Chưa kết nối', DISABLED: 'Đã tắt', READY: 'Sẵn sàng', CONNECTED: 'Đã kết nối', CONFIGURED: 'Đã cấu hình', UNKNOWN: 'Chưa xác minh', UNCONFIGURED: 'Chưa cấu hình', NOT_CONFIGURED: 'Chưa cấu hình', DISCOVERED: 'Đã ghi nhận', PASS: 'Đạt', FAIL: 'Chưa đạt', UNVERIFIED: 'Cần người kiểm tra', SKIPPED: 'Đã bỏ qua', PENDING: 'Đang chờ', COMPLETED: 'Đã hoàn thành', SUCCEEDED: 'Thực thi thành công', QC_REJECTED: 'QC yêu cầu sửa'
  };
  const kindNames = { data_analysis: 'Phân tích CSV', html_audit: 'Kiểm tra HTML', system_check: 'Kiểm tra hệ thống', sourced_brief: 'Brief có nguồn', ai_draft: 'Soạn thảo AI', auto: 'Tự xác định' };
  const modeNames = { RULE_ENGINE: 'Bộ điều phối theo quy tắc', DETERMINISTIC_TOOL: 'Công cụ xác định', AI_PROVIDER: 'Mô hình đã cấu hình', HYBRID: 'Điều phối theo quy trình' };
  const dimensionNames = { technical: 'Kỹ thuật', format: 'Định dạng', source: 'Nguồn', data: 'Dữ liệu', aesthetic: 'Thẩm mỹ', approval: 'Phê duyệt', integrity: 'Toàn vẹn tệp', provenance: 'Nguồn đầu vào', correctness: 'Độ chính xác', completeness: 'Độ đầy đủ', numeric_correctness: 'Đối chiếu số liệu', input_provenance: 'Nguồn đầu vào', artifact_integrity: 'Toàn vẹn tệp', semantic_quality: 'Chất lượng nội dung', aesthetics: 'Chất lượng thẩm mỹ', safety: 'An toàn', content: 'Nội dung', evidence: 'Bằng chứng' };
  const initials = { manager: 'QL', seo: 'SE', content: 'ND', video: 'VI', design: 'TK', development: 'PT', qc: 'QC', finance: 'TC', advertising: 'QCá' };
  const roleNames = { manager: 'Điều phối', seo: 'SEO & AI Search', content: 'Nội dung', video: 'Video & Media', design: 'Thiết kế', development: 'Dev & Automation', qc: 'Kiểm soát chất lượng', finance: 'Dữ liệu & Tài chính', advertising: 'Quảng cáo' };
  const toolNames = { route_brief: 'Phân loại mục tiêu theo quy tắc', dependency_queue: 'Điều phối thứ tự công việc', csv_statistics: 'Tính thống kê dữ liệu CSV', evidence_report: 'Đóng gói báo cáo có căn cứ', ai_draft: 'Soạn bản nháp với mô hình đã cấu hình', html_audit: 'Kiểm tra mã HTML đã cung cấp', system_check: 'Kiểm tra hệ thống cục bộ', independent_audit: 'Đối chiếu bằng chứng độc lập' };
  const activeStatuses = new Set(['QUEUED', 'RUNNING']);
  const attentionStatuses = new Set(['BLOCKED', 'INTERRUPTED', 'FAILED', 'NEEDS_REVISION']);
  let state = { agents: [], tasks: [], artifacts: [], events: [], providers: [], skills: [], connectors: [], legacy: [] };
  let session = null;
  let stream = null;
  let poll = null;
  let refreshPromise = null;
  let selectedAgent = 'manager';
  let selectedTask = null;
  let detailFingerprint = '';
  let officeView = 'space';
  let noticeTimer;
  let createRequest = null;
  const retryKeys = new Map();

  const date = value => {
    if (!value) return 'Chưa ghi nhận';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? text(value) : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
  };
  const bytes = value => !Number.isFinite(Number(value)) ? 'Chưa ghi nhận' : Number(value) < 1024 ? `${value} B` : Number(value) < 1048576 ? `${(Number(value) / 1024).toFixed(1)} KB` : `${(Number(value) / 1048576).toFixed(1)} MB`;
  const shortId = id => text(id).slice(0, 8);
  const ordered = values => [...values].sort((a, b) => new Date(b.createdAt || b.at || b.updatedAt || 0) - new Date(a.createdAt || a.at || a.updatedAt || 0));
  const statusLabel = value => statuses[value] || text(value) || 'Chưa xác minh';
  function badge(status) { return node('span', `status-badge status-${text(status).replace(/[^a-zA-Z_]/g, '').toLowerCase() || 'unknown'}`, statusLabel(status)); }
  function button(label, className, handler) { const b = node('button', className, label); b.type = 'button'; if (handler) b.addEventListener('click', handler); return b; }
  function empty(title, description, action) {
    const box = node('div', 'empty-state');
    const mark = node('div', 'empty-mark'); mark.setAttribute('aria-hidden', 'true'); mark.append(node('i'), node('i'), node('i'));
    box.append(mark, node('h3', '', title), node('p', '', description));
    if (action) box.append(action);
    return box;
  }
  function showNotice(message) {
    clearTimeout(noticeTimer); $('#notice').textContent = message; $('#notice').hidden = false;
    noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 6500);
  }
  function showGlobalError(message) { $('#global-error-text').textContent = message; $('#global-error').hidden = false; }
  function errorIn(element, error) { element.textContent = error.message || text(error); element.hidden = false; }
  function connection(label, good) {
    $('#connection-label').textContent = label;
    $('#connection-dot').classList.toggle('offline', !good);
    if (good) $('#last-sync').textContent = `Cập nhật ${new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())}`;
  }
  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    if (options.method && options.method !== 'GET' && session?.csrfToken) headers.set('X-CSRF-Token', session.csrfToken);
    let response;
    try { response = await fetch(path, { credentials: 'same-origin', ...options, headers }); }
    catch { throw new Error('Không kết nối được máy chủ cục bộ. Kiểm tra máy chủ rồi thử lại.'); }
    if (!response.ok) {
      let info; try { info = await response.json(); } catch { info = {}; }
      const error = new Error(text(info.error) || `Yêu cầu chưa thành công (HTTP ${response.status}).`);
      error.code = info.code; error.status = response.status;
      if (response.status === 401 && path !== '/api/session') signedOut();
      throw error;
    }
    if (response.status === 204) return null;
    return response.json();
  }
  function signedOut() {
    session = null; stream?.close(); stream = null; clearInterval(poll); poll = null;
    $$('dialog[open]').forEach(d => d.close());
    $('#studio').hidden = true; $('#login-screen').hidden = false;
  }
  async function signedIn(info) {
    session = info; $('#access-token').value = ''; $('#login-error').hidden = true;
    $('#login-screen').hidden = true; $('#studio').hidden = false;
    const reader = info.role !== 'admin';
    $('#role-label').textContent = reader ? 'Chỉ đọc' : 'CEO';
    $('#new-task-button').disabled = reader;
    $$('input,textarea,select,button', $('#task-form')).forEach(control => { control.disabled = reader; });
    $('#probe-button').disabled = reader;
    $('#approval-note').textContent = reader ? 'Bạn đang dùng quyền chỉ đọc. Cần khóa quản trị để giao việc hoặc phê duyệt.' : 'Kết quả luôn chờ CEO phê duyệt trước khi hoàn tất.';
    route();
    await refresh(true); startLive();
  }
  async function refresh(force = false) {
    if (!session) return;
    if (refreshPromise) { await refreshPromise; if (!force || !session) return; }
    const request = (async () => {
      try { acceptState(await api('/api/state')); $('#global-error').hidden = true; connection(stream?.readyState === 1 ? 'Đồng bộ trực tiếp' : 'Đã kết nối cục bộ', true); }
      catch (error) { if (session) { showGlobalError(error.message); connection('Mất kết nối', false); } }
    })();
    refreshPromise = request;
    try { await request; } finally { if (refreshPromise === request) refreshPromise = null; }
  }
  function acceptState(next) {
    if (!next || typeof next !== 'object') return;
    if (Number.isFinite(state.revision) && Number.isFinite(next.revision) && next.revision < state.revision) return;
    state = { ...next, ...Object.fromEntries(['agents', 'tasks', 'artifacts', 'events', 'providers', 'skills', 'connectors', 'legacy'].map(key => [key, list(next[key])])) };
    render();
  }
  function startLive() {
    stream?.close(); clearInterval(poll);
    stream = new EventSource('/api/events');
    stream.addEventListener('open', () => { connection('Đồng bộ trực tiếp', true); refresh(); });
    stream.addEventListener('state', event => {
      try { const next = JSON.parse(event.data); if (next && Array.isArray(next.tasks)) acceptState(next); else refresh(); connection('Đồng bộ trực tiếp', true); } catch { refresh(); }
    });
    stream.addEventListener('error', () => { if (session) connection('Đang kết nối lại', false); });
    poll = setInterval(() => { if (session && document.visibilityState === 'visible') refresh(); }, 15000);
  }
  function route() {
    const id = location.hash.slice(1).split('?')[0];
    const current = ['office', 'tasks', 'library', 'settings'].includes(id) ? id : 'office';
    $$('.page').forEach(page => { page.hidden = page.id !== `${current}-page`; });
    $$('.nav-link').forEach(link => { const active = link.dataset.route === current; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    const titles = { office: 'Văn phòng', tasks: 'Công việc', library: 'Kho kết quả', settings: 'Năng lực & kết nối' };
    $('#page-title').textContent = titles[current]; document.title = `${titles[current]} · Văn Phòng AI Studio`;
  }
  function goCompose() {
    if (!session || session.role !== 'admin') return;
    location.hash = 'office'; route();
    $('#task-brief').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    $('#task-brief').focus({ preventScroll: true });
  }
  function updateFields() {
    const kind = $('#task-kind').value;
    $('#csv-field').hidden = kind !== 'data_analysis'; $('#html-field').hidden = kind !== 'html_audit'; $('#context-field').hidden = kind !== 'ai_draft'; $('#auto-field').hidden = kind !== 'auto'; $('#provider-field').hidden = !['ai_draft', 'auto'].includes(kind);
    $('#draft-agent-field').hidden = kind !== 'ai_draft';
  }
  function agentTasks(id) { return state.tasks.filter(task => list(task.steps).some(step => step.agentId === id)); }
  function agentState(agent) {
    const jobs = agentTasks(agent.id).filter(task => activeStatuses.has(task.status) && list(task.steps).some(step => step.agentId === agent.id && step.status === 'RUNNING'));
    if (jobs.length || agent.status === 'WORKING') return { tone: 'working', label: 'Đang thực hiện', jobs };
    if (agent.status === 'AVAILABLE') return { tone: 'available', label: 'Có công cụ khả dụng', jobs };
    return { tone: 'unavailable', label: agent.status === 'UNAVAILABLE' ? 'Cần mô hình đã kết nối' : statusLabel(agent.status), jobs };
  }
  function render() {
    const approvals = state.tasks.filter(task => task.status === 'AWAITING_APPROVAL').length;
    $('#approval-count').textContent = approvals; $('#approval-count').hidden = approvals === 0;
    renderStaff(); renderActivity(); renderTasks(); renderLibrary(); renderSettings();
    if ($('#task-dialog').open && selectedTask) renderTaskDetail();
  }
  function renderStaff() {
    const space = $('#staff-spatial'); const staffList = $('#list-view'); space.replaceChildren(); staffList.replaceChildren();
    $('#staff-count').textContent = `${state.agents.length} vị trí chuyên môn`;
    const running = state.tasks.filter(task => task.status === 'RUNNING').length;
    $('#active-work-count').textContent = running ? `${running} công việc đang thực hiện` : 'Chưa có công việc đang chạy';
    state.agents.forEach((agent, index) => {
      const presence = agentState(agent);
      const spot = button('', `staff-spot position-${/^[a-z]+$/.test(agent.id) ? agent.id : 'other'} spot-${index % 9} ${presence.tone}${agent.id === selectedAgent ? ' selected' : ''}`, () => selectAgent(agent.id));
      spot.dataset.agentId = agent.id; spot.setAttribute('aria-pressed', String(agent.id === selectedAgent)); spot.setAttribute('aria-label', `${agent.name || agent.id}: ${presence.label}. Xem năng lực.`);
      const graphic = node('span', 'desk-graphic'); graphic.setAttribute('aria-hidden', 'true');
      const desk = node('span', 'desk-surface'); desk.append(node('i', 'monitor'), node('i', 'keyboard'), node('i', 'desk-note'));
      const chair = node('span', 'desk-chair'); const person = node('span', 'desk-person'); person.append(node('i', 'person-head'), node('i', 'person-body'));
      graphic.append(desk, chair, person);
      const label = node('span', 'staff-nameplate'); label.append(node('strong', '', roleNames[agent.id] || agent.name || agent.id), node('span', `presence ${presence.tone}`, presence.label)); spot.append(graphic, label); space.append(spot);
      const row = button('', `staff-list-row${agent.id === selectedAgent ? ' selected' : ''}`, () => selectAgent(agent.id)); row.dataset.agentId = agent.id; row.setAttribute('aria-pressed', String(agent.id === selectedAgent));
      const info = node('span', 'staff-list-info'); info.append(node('strong', '', agent.name || agent.id), node('span', '', agent.department || modeNames[agent.mode] || 'Chuyên môn'));
      row.append(node('span', `staff-avatar ${presence.tone}`, initials[agent.id] || text(agent.name).slice(0, 2)), info, node('span', `presence ${presence.tone}`, presence.label), node('span', 'staff-row-arrow', '→')); staffList.append(row);
    });
    if (!state.agents.length) staffList.append(empty('Chưa có thông tin nhân sự', 'Kết nối máy chủ để tải danh mục công cụ và các vị trí chuyên môn.'));
    renderAgentDetail();
  }
  function selectAgent(id) {
    const keepFocus = document.activeElement?.dataset.agentId === id;
    selectedAgent = id; renderStaff();
    if (keepFocus) $$(officeView === 'space' ? '.staff-spot' : '.staff-list-row').find(control => control.dataset.agentId === id)?.focus({ preventScroll: true });
    if (matchMedia('(max-width: 1050px)').matches) $('#staff-detail').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
  }
  function renderAgentDetail() {
    const area = $('#staff-detail'); area.replaceChildren();
    const agent = state.agents.find(item => item.id === selectedAgent) || state.agents[0];
    if (!agent) { area.append(node('h2', '', 'Gặp đội ngũ của bạn'), node('p', 'quiet', 'Thông tin nhân sự sẽ xuất hiện khi máy chủ kết nối.')); return; }
    const presence = agentState(agent); const heading = node('div', 'agent-detail-heading'); const info = node('div'); info.append(node('h2', '', agent.name || agent.id), node('p', 'quiet', agent.department || 'Nhân sự chuyên môn')); heading.append(node('span', `staff-avatar ${presence.tone}`, initials[agent.id] || agent.id.slice(0, 2)), info);
    area.append(heading, node('span', `presence ${presence.tone}`, presence.label));
    if (agent.description) area.append(node('p', 'agent-description', agent.description));
    area.append(node('h3', '', 'Năng lực thực thi'));
    const capabilities = list(agent.capabilities); const tools = list(agent.tools); const ul = node('ul', 'capability-points');
    (capabilities.length ? capabilities : tools).forEach(capability => ul.append(node('li', '', typeof capability === 'string' ? toolNames[capability] || capability : capability.name || capability.id || text(capability))));
    if (!ul.children.length) ul.append(node('li', '', 'Chưa ghi nhận công cụ được cấp.')); area.append(ul);
    if (agent.mode) area.append(node('p', 'mode-note', modeNames[agent.mode] || agent.mode));
    list(agent.limitations).filter(limit => limit !== agent.description).forEach(limit => area.append(node('p', 'limit-note', limit)));
    if (presence.jobs.length) presence.jobs.forEach(task => area.append(button(task.brief, 'agent-job text-button', () => openTask(task.id))));
    if (!['manager', 'qc'].includes(agent.id) && session?.role === 'admin') area.append(button('Giao bản nháp cho nhân sự này →', 'text-button', () => { $('#task-kind').value = 'ai_draft'; $('#task-agent').value = agent.id; updateFields(); goCompose(); }));
    area.append(button('Xem toàn bộ năng lực →', 'text-button', () => { location.hash = 'settings'; }));
  }
  function setOfficeView(view) {
    officeView = view; $('#space-view').hidden = view !== 'space'; $('#list-view').hidden = view !== 'list';
    $$('[data-office-view]').forEach(control => { const selected = control.dataset.officeView === view; control.classList.toggle('selected', selected); control.setAttribute('aria-pressed', String(selected)); });
  }
  function renderActivity() {
    const feed = $('#office-activity'); feed.replaceChildren();
    const events = ordered(state.events).slice(0, 5);
    if (!events.length) { feed.append(empty('Văn phòng sẵn sàng nhận việc đầu tiên', 'Bắt đầu bằng dữ liệu CSV, mã HTML hoặc một lần kiểm tra hệ thống. Mỗi bước thực hiện sẽ được ghi lại tại đây.', button('Giao công việc đầu tiên →', 'text-button', goCompose))); return; }
    events.forEach(event => {
      const row = node('div', 'activity-row'); const info = node('div', 'activity-message');
      info.append(node('p', '', event.message || event.type || 'Sự kiện công việc'));
      const agent = state.agents.find(a => a.id === event.agentId);
      const meta = node('span', 'quiet', agent?.name || (event.taskId ? `Công việc ${shortId(event.taskId)}` : 'Hệ thống'));
      info.append(meta); row.append(node('span', `activity-point ${event.type === 'ERROR' ? 'error' : ''}`), info, node('time', '', date(event.at)));
      if (event.taskId) { row.classList.add('clickable'); const b = button('Mở', 'text-button', () => openTask(event.taskId)); b.setAttribute('aria-label', `Mở công việc ${shortId(event.taskId)}`); row.append(b); }
      feed.append(row);
    });
  }
  function filteredTasks() {
    const query = $('#task-search').value.trim().toLocaleLowerCase('vi-VN'); const filter = $('#task-filter').value;
    return ordered(state.tasks).filter(task => (!query || `${task.brief} ${task.id}`.toLocaleLowerCase('vi-VN').includes(query)) && (filter === 'all' || filter === 'active' && activeStatuses.has(task.status) || filter === 'attention' && attentionStatuses.has(task.status) || filter === task.status));
  }
  function renderTasks() {
    const board = $('#task-board'); board.replaceChildren(); const tasks = filteredTasks(); $('#task-total').textContent = `${tasks.length} công việc`;
    if (!tasks.length) {
      board.classList.add('is-empty'); board.append(empty(state.tasks.length ? 'Không có công việc phù hợp' : 'Mục tiêu đầu tiên bắt đầu từ bạn', state.tasks.length ? 'Thử từ khóa khác hoặc chọn tất cả trạng thái.' : 'Giao một nhiệm vụ có đầu vào cụ thể. Bạn sẽ thấy các bước thực thi, kết quả và kiểm tra chất lượng ở đây.', state.tasks.length ? null : button('Giao việc →', 'button primary', goCompose))); return;
    }
    board.classList.remove('is-empty');
    const lanes = [ { title: 'Đang thực hiện', statuses: ['QUEUED', 'RUNNING'], tone: 'active' }, { title: 'Chờ CEO duyệt', statuses: ['AWAITING_APPROVAL'], tone: 'review' }, { title: 'Cần xử lý', statuses: [...attentionStatuses], tone: 'attention' }, { title: 'Đã kết thúc', statuses: ['DONE', 'CANCELLED'], tone: 'done' } ];
    lanes.forEach(lane => {
      const section = node('section', `task-lane lane-${lane.tone}`); const items = tasks.filter(t => lane.statuses.includes(t.status)); const head = node('div', 'lane-heading'); head.append(node('h2', '', lane.title), node('span', 'lane-count', items.length)); section.append(head);
      if (!items.length) section.append(node('p', 'lane-empty', 'Chưa có công việc'));
      items.forEach(task => {
        const card = button('', 'task-card', () => openTask(task.id)); card.dataset.taskId = task.id;
        const top = node('div', 'task-card-top'); top.append(node('span', 'task-kind', kindNames[task.kind] || task.kind), badge(task.status));
        const steps = list(task.steps); const completed = steps.filter(s => ['DONE', 'COMPLETED'].includes(s.status)).length;
        card.append(top, node('h3', '', task.brief), node('p', 'task-card-progress', `${completed}/${steps.length} bước hoàn thành`));
        if (task.error) card.append(node('p', 'task-card-error', text(task.error)));
        const meta = node('div', 'task-card-meta'); meta.append(node('span', '', `Phiên bản ${task.version ?? '—'}`), node('time', '', date(task.updatedAt || task.createdAt))); card.append(meta); section.append(card);
      }); board.append(section);
    });
  }
  function artifactsFor(task) {
    const map = new Map(); [...state.artifacts.filter(a => a.taskId === task.id), ...list(task.artifacts)].forEach(artifact => { if (artifact.id) map.set(artifact.id, artifact); }); return ordered([...map.values()]);
  }
  function artifactRow(artifact, compact = false) {
    const row = node('div', `artifact-row${compact ? ' compact' : ''}`); const info = node('div', 'artifact-info'); const name = button(artifact.name || artifact.id, 'artifact-name', () => previewArtifact(artifact)); info.append(name);
    const task = state.tasks.find(t => t.id === artifact.taskId);
    const meta = compact ? `Phiên bản ${artifact.version ?? '—'} · ${bytes(artifact.size)} · ${date(artifact.createdAt)}` : `${task?.brief || `Công việc ${shortId(artifact.taskId)}`} · Phiên bản ${artifact.version ?? '—'}`;
    info.append(node('p', 'quiet', meta)); const actions = node('div', 'artifact-actions'); actions.append(button('Xem', 'text-button', () => previewArtifact(artifact)));
    const download = node('a', 'text-button', 'Tải xuống ↓'); download.href = `/api/artifacts/${encodeURIComponent(artifact.id)}`; download.setAttribute('download', ''); actions.append(download);
    row.append(node('span', 'file-symbol', text(artifact.name).split('.').pop().toUpperCase().slice(0, 4) || 'TỆP'), info);
    if (!compact) { const details = node('div', 'artifact-size'); details.append(node('span', '', bytes(artifact.size)), node('time', 'quiet', date(artifact.createdAt))); row.append(details); }
    row.append(actions); return row;
  }
  function renderLibrary() {
    const area = $('#artifact-library'); area.replaceChildren(); const query = $('#artifact-search').value.trim().toLocaleLowerCase('vi-VN');
    const artifacts = ordered(state.artifacts).filter(a => !query || `${a.name} ${state.tasks.find(t => t.id === a.taskId)?.brief || ''} ${a.taskId}`.toLocaleLowerCase('vi-VN').includes(query));
    $('#artifact-total').textContent = `${artifacts.length} tệp kết quả`;
    if (!artifacts.length) { area.append(empty(state.artifacts.length ? 'Không tìm thấy tệp phù hợp' : 'Kết quả có nguồn, có phiên bản', state.artifacts.length ? 'Thử tìm bằng một phần tên tệp hoặc mục tiêu công việc.' : 'Các tệp từ lần thực thi thực tế sẽ xuất hiện ở đây. Phiên bản cũ được giữ để đối chiếu.')); return; }
    const table = node('div', 'artifact-table'); artifacts.forEach(a => table.append(artifactRow(a))); area.append(table);
  }
  function openTask(id) {
    const task = state.tasks.find(t => t.id === id); if (!task) { showNotice('Không tìm thấy công việc trong trạng thái hiện tại.'); refresh(); return; }
    selectedTask = id; detailFingerprint = ''; renderTaskDetail(); if (!$('#task-dialog').open) $('#task-dialog').showModal();
  }
  function detailSection(title) { const section = node('section', 'detail-section'); section.append(node('h3', '', title)); return section; }
  function facts(entries) { const dl = node('dl', 'facts'); entries.forEach(([label, value]) => { const group = node('div'); group.append(node('dt', '', label), node('dd', '', text(value) || 'Chưa ghi nhận')); dl.append(group); }); return dl; }
  function renderTaskDetail() {
    const task = state.tasks.find(t => t.id === selectedTask); if (!task) return;
    const fingerprint = JSON.stringify({ task, artifacts: artifactsFor(task), events: state.events.filter(e => e.taskId === task.id) }); if (fingerprint === detailFingerprint) return; detailFingerprint = fingerprint;
    const area = $('#task-detail-content'); const previousComment = $('#review-comment', area)?.value || ''; const focusOnComment = document.activeElement?.id === 'review-comment'; const selectionStart = focusOnComment ? document.activeElement.selectionStart : null;
    const previousVersion = $('#review-form', area)?.dataset.version;
    area.replaceChildren(); $('#detail-title').textContent = task.brief; $('#detail-id').textContent = `Công việc ${shortId(task.id)} · ${kindNames[task.kind] || task.kind}`;
    const overview = node('div', 'detail-overview'); overview.append(badge(task.status), node('span', 'quiet', `Phiên bản ${task.version ?? '—'} · Tạo ${date(task.createdAt)}`), button('Xem đầu vào', 'text-button', () => previewSource(task))); area.append(overview);
    overview.append(button('Xem toàn bộ lịch sử', 'text-button', () => previewSource(task, true)));
    if (task.error) area.append(node('p', 'detail-error', text(task.error)));
    if (task.blockedReasons) list(task.blockedReasons).forEach(reason => area.append(node('p', 'detail-error', text(reason))));
    if (task.revision) { const revision = detailSection('Yêu cầu chỉnh sửa'); revision.append(node('p', '', typeof task.revision === 'object' ? task.revision.comment || text(task.revision) : task.revision)); area.append(revision); }
    if (task.approval) { const approval = detailSection('Phê duyệt đã ghi nhận'); approval.append(node('p', '', typeof task.approval === 'object' ? task.approval.comment || `Ghi nhận ${date(task.approval.at || task.approval.approvedAt)}` : task.approval)); area.append(approval); }
    const columns = node('div', 'detail-columns'); const main = node('div'); const side = node('div');
    const stepsSection = detailSection('Quy trình thực hiện'); const steps = list(task.steps); const timeline = node('ol', 'step-timeline');
    if (!steps.length) stepsSection.append(node('p', 'quiet', 'Máy chủ chưa ghi nhận bước thực thi.'));
    steps.forEach((step, index) => {
      const item = node('li', `step-item step-${text(step.status).toLowerCase()}`); item.append(node('span', 'step-number', index + 1)); const body = node('div', 'step-body'); const head = node('div', 'step-heading'); head.append(node('strong', '', step.title || step.id), badge(step.status)); body.append(head);
      const agent = state.agents.find(a => a.id === step.agentId); body.append(node('p', 'quiet', [agent?.name || step.agentId, modeNames[step.mode] || step.mode, step.tool].filter(Boolean).join(' · ')));
      if (list(step.dependsOn).length) body.append(node('p', 'step-dependency', `Phụ thuộc: ${list(step.dependsOn).map(id => steps.find(s => s.id === id)?.title || id).join(', ')}`));
      if (step.startedAt || step.finishedAt) body.append(node('p', 'step-time', `${step.startedAt ? `Bắt đầu ${date(step.startedAt)}` : ''}${step.finishedAt ? ` · Kết thúc ${date(step.finishedAt)}` : ''}`));
      if (step.error) body.append(node('p', 'form-error', text(step.error))); item.append(body); timeline.append(item);
    }); stepsSection.append(timeline); main.append(stepsSection);
    const qcSection = detailSection('Kiểm tra chất lượng');
    if (!task.qc) qcSection.append(node('p', 'quiet', 'Chưa có kết quả QC. Công việc chỉ hoàn tất sau kiểm tra và phê duyệt.'));
    else {
      if (task.qc.verdict) qcSection.append(badge(task.qc.verdict));
      const checks = list(task.qc.checks || task.qc.dimensions);
      checks.forEach(check => { const row = node('div', 'qc-check'); const head = node('div', 'qc-check-head'); head.append(node('strong', '', dimensionNames[check.dimension] || check.dimension || check.name || check.id || 'Tiêu chí kiểm tra'), badge(check.status || 'UNVERIFIED')); row.append(head, node('p', '', text(check.detail || check.reason || check.evidence || 'Chưa có chi tiết bằng chứng.'))); qcSection.append(row); });
      if (!checks.length) qcSection.append(node('p', 'quiet', 'Chưa có tiêu chí kiểm tra chi tiết.'));
      list(task.qc.defects).forEach(defect => qcSection.append(node('p', 'detail-error', text(defect)))); list(task.qc.limitations).forEach(limit => qcSection.append(node('p', 'limit-note', text(limit))));
    }
    main.append(qcSection);
    const artifactSection = detailSection('Tệp kết quả & phiên bản'); const artifacts = artifactsFor(task); if (!artifacts.length) artifactSection.append(node('p', 'quiet', 'Chưa có tệp kết quả.')); artifacts.forEach(a => artifactSection.append(artifactRow(a, true))); side.append(artifactSection);
    const attemptsSection = detailSection('Các lần thực thi'); const attempts = list(task.attempts);
    if (!attempts.length) attemptsSection.append(node('p', 'quiet', 'Chưa ghi nhận lần thực thi.'));
    [...attempts].reverse().forEach(attempt => { const block = node('div', 'attempt'); const heading = node('div', 'attempt-heading'); heading.append(node('strong', '', `Lần ${attempt.number ?? '—'}`), badge(attempt.status)); block.append(heading, facts([['Cơ chế', modeNames[attempt.mode] || attempt.mode], ['Nhà cung cấp', attempt.provider || 'Không dùng mô hình'], ['Mô hình', attempt.model || 'Không áp dụng'], ['Bắt đầu', date(attempt.startedAt)], ['Kết thúc', attempt.finishedAt ? date(attempt.finishedAt) : 'Chưa kết thúc']])); if (attempt.error) block.append(node('p', 'form-error', text(attempt.error))); attemptsSection.append(block); }); side.append(attemptsSection); columns.append(main, side); area.append(columns);
    const history = detailSection('Nhật ký có dấu thời gian'); const events = ordered(state.events.filter(e => e.taskId === task.id)); if (!events.length) history.append(node('p', 'quiet', 'Chưa ghi nhận sự kiện.'));
    events.forEach(event => { const row = node('div', 'history-row'); row.append(node('time', '', date(event.at)), node('p', '', event.message || event.type)); history.append(row); }); area.append(history);
    const actions = node('section', 'review-section'); const error = node('p', 'form-error'); error.id = 'detail-action-error'; error.setAttribute('role', 'alert'); error.hidden = true;
    if (session?.role !== 'admin') actions.append(node('p', 'quiet', 'Bạn có quyền xem. Cần đăng nhập quản trị để duyệt hoặc điều chỉnh công việc.'));
    else if (task.status === 'AWAITING_APPROVAL') {
      actions.append(node('h3', '', 'Quyết định của CEO'), node('p', 'quiet', `Phê duyệt áp dụng cho phiên bản ${task.version}. Hãy xem tệp kết quả và các tiêu chí QC trước khi quyết định.`));
      if (previousVersion && previousVersion !== String(task.version)) actions.append(node('p', 'limit-note', 'Phiên bản đã thay đổi. Nội dung mới nhất đang được hiển thị; kiểm tra lại trước khi duyệt.'));
      const form = node('form', 'review-form'); form.id = 'review-form'; form.dataset.version = task.version; const label = node('label', '', 'Nhận xét / yêu cầu chỉnh sửa'); label.htmlFor = 'review-comment'; const comment = node('textarea'); comment.id = 'review-comment'; comment.rows = 3; comment.maxLength = 8000; comment.placeholder = 'Nêu rõ nội dung cần điều chỉnh nếu yêu cầu sửa…'; comment.value = previousComment;
      const controls = node('div', 'review-actions'); const approve = node('button', 'button primary', 'Phê duyệt kết quả'); approve.type = 'submit'; const revise = button('Yêu cầu chỉnh sửa', 'button secondary', () => reviewTask(task, 'revise', form)); controls.append(approve, revise); form.append(label, comment, controls); form.addEventListener('submit', event => { event.preventDefault(); reviewTask(task, 'approve', form); }); actions.append(form);
    } else if (['FAILED', 'INTERRUPTED', 'BLOCKED', 'NEEDS_REVISION'].includes(task.status)) {
      actions.append(node('h3', '', 'Công việc cần xử lý'), node('p', 'quiet', task.status === 'BLOCKED' ? 'Kiểm tra điều kiện đầu vào hoặc kết nối. Thử lại giữ nguyên yêu cầu ban đầu; muốn đổi đầu vào, hãy giao một nhiệm vụ mới.' : 'Thử lại tạo lần thực thi mới và giữ các kết quả trước đó.'), button('Thử thực thi lại', 'button primary', () => retryTask(task)));
      if (task.status === 'BLOCKED') actions.append(button('Hủy công việc', 'button secondary cancel-action', () => cancelTask(task)));
    } else if (activeStatuses.has(task.status)) actions.append(node('p', 'quiet', 'Bạn có thể dừng công việc. Các lần thực thi đã ghi nhận được giữ lại.'), button('Hủy công việc', 'button secondary', () => cancelTask(task)));
    else if (task.status === 'DONE') actions.append(node('p', 'approval-complete', 'Kết quả đã được phê duyệt. Các tệp và nhật ký được giữ để đối chiếu.'));
    actions.append(error); area.append(actions);
    if (focusOnComment && $('#review-comment')) { $('#review-comment').focus({ preventScroll: true }); $('#review-comment').setSelectionRange(selectionStart, selectionStart); }
  }
  async function reviewTask(task, action, form) {
    const error = $('#detail-action-error'); error.hidden = true; const comment = $('#review-comment', form).value.trim();
    if (action === 'revise' && !comment) { errorIn(error, new Error('Hãy ghi nội dung cần chỉnh sửa để văn phòng có căn cứ thực hiện.')); $('#review-comment', form).focus(); return; }
    $$('button', form).forEach(b => { b.disabled = true; });
    try { await api(`/api/tasks/${encodeURIComponent(task.id)}/review`, { method: 'POST', body: JSON.stringify({ action, version: Number(form.dataset.version), comment }) }); showNotice(action === 'approve' ? 'Đã phê duyệt phiên bản kết quả.' : 'Đã ghi nhận yêu cầu chỉnh sửa. Có thể thử lại để tạo lần thực thi mới.'); await refresh(true); }
    catch (failure) { await refresh(true); const freshError = $('#detail-action-error'); if (freshError) errorIn(freshError, failure); }
    finally { if (form.isConnected) $$('button', form).forEach(b => { b.disabled = false; }); }
  }
  async function retryTask(task) {
    const area = $('#task-detail-content'); $$('button', area).forEach(b => { b.disabled = true; });
    if (!retryKeys.has(task.id)) retryKeys.set(task.id, crypto.randomUUID());
    try { await api(`/api/tasks/${encodeURIComponent(task.id)}/retry`, { method: 'POST', headers: { 'Idempotency-Key': retryKeys.get(task.id) }, body: '{}' }); retryKeys.delete(task.id); showNotice('Đã gửi yêu cầu thực thi lại.'); await refresh(true); }
    catch (error) { if ($('#detail-action-error')) errorIn($('#detail-action-error'), error); }
    finally { $$('button', area).forEach(b => { b.disabled = false; }); }
  }
  async function cancelTask(task) {
    const area = $('#task-detail-content'); $$('button', area).forEach(b => { b.disabled = true; });
    try { await api(`/api/tasks/${encodeURIComponent(task.id)}/cancel`, { method: 'POST', body: '{}' }); showNotice('Đã hủy công việc. Lịch sử thực thi được giữ lại.'); await refresh(true); }
    catch (error) { await refresh(true); if ($('#detail-action-error')) errorIn($('#detail-action-error'), error); }
    finally { $$('button', area).forEach(b => { b.disabled = false; }); }
  }
  async function previewArtifact(artifact) {
    $('#preview-title').textContent = artifact.name || artifact.id; $('#preview-meta').textContent = `Phiên bản ${artifact.version ?? '—'} · ${bytes(artifact.size)}${artifact.sha256 ? ` · SHA256 ${artifact.sha256}` : ''}`;
    $('#preview-download').href = `/api/artifacts/${encodeURIComponent(artifact.id)}`; $('#preview-download').hidden = false; $('#preview-content').textContent = 'Đang tải bản xem trước…'; if (!$('#preview-dialog').open) $('#preview-dialog').showModal();
    const requestedId = artifact.id; $('#preview-dialog').dataset.artifactId = requestedId;
    try {
      const response = await fetch(`/api/artifacts/${encodeURIComponent(requestedId)}?preview=1`, { credentials: 'same-origin' });
      if (!response.ok) { let failure; try { failure = await response.json(); } catch { failure = {}; } if (response.status === 401) signedOut(); throw new Error(text(failure.error) || `Không đọc được tệp (HTTP ${response.status}).`); }
      const content = await response.text(); if ($('#preview-dialog').dataset.artifactId === requestedId) $('#preview-content').textContent = content;
    } catch (error) { if ($('#preview-dialog').dataset.artifactId === requestedId) $('#preview-content').textContent = error.message || 'Không kết nối được máy chủ để xem tệp.'; }
  }
  async function previewSource(task, history = false) {
    const key = `${history ? 'history' : 'source'}:${task.id}`;
    $('#preview-dialog').dataset.artifactId = key;
    $('#preview-title').textContent = `${history ? 'Toàn bộ lịch sử & QC từng lượt' : 'Đầu vào'} · ${shortId(task.id)}`;
    $('#preview-meta').textContent = history ? 'Nhật ký riêng của task và bằng chứng từng lượt · Chỉ đọc' : 'Yêu cầu gốc được lưu trên máy chủ · Chỉ đọc';
    $('#preview-download').hidden = true;
    $('#preview-content').textContent = 'Đang đọc đầu vào đã lưu…';
    if (!$('#preview-dialog').open) $('#preview-dialog').showModal();
    try {
      const source = await api(`/api/tasks/${encodeURIComponent(task.id)}/${history ? 'history' : 'source'}`);
      if ($('#preview-dialog').dataset.artifactId === key) {
        $('#preview-content').textContent = JSON.stringify(source, null, 2);
        $('#preview-meta').textContent = history ? 'Nhật ký riêng và QC mỗi lượt; không bị giới hạn bởi 300 sự kiện gần nhất của văn phòng.' : `Yêu cầu gốc được lưu trên máy chủ${source.sha256 ? ` · SHA256 ${source.sha256}` : ''}`;
      }
    } catch (error) { if ($('#preview-dialog').dataset.artifactId === key) $('#preview-content').textContent = error.message; }
  }
  function inventoryItem(item, type) {
    const row = node('div', 'inventory-row'); const info = node('div', 'inventory-info'); info.append(node('h3', '', item.name || item.title || item.id || item.key));
    if (item.description || item.detail) info.append(node('p', '', text(item.description || item.detail)));
    const status = item.status || (item.available === true ? 'AVAILABLE' : item.available === false ? 'UNAVAILABLE' : 'UNKNOWN');
    const meta = [item.kind, item.model, item.mode ? modeNames[item.mode] || item.mode : null].filter(Boolean); if (meta.length) info.append(node('p', 'quiet', meta.join(' · ')));
    if (item.error || item.reason) info.append(node('p', 'limit-note', text(item.error || item.reason)));
    if (type === 'skill') info.append(node('p', 'quiet', 'Danh mục kỹ năng · Không tự cấp quyền thực thi'));
    row.append(info, badge(status)); return row;
  }
  function renderSettings() {
    const providers = $('#provider-list'); providers.replaceChildren(); if (!state.providers.length) providers.append(node('p', 'inventory-empty', 'Chưa có nhà cung cấp mô hình được cấu hình. Các công cụ xác định vẫn có thể hoạt động.')); state.providers.forEach(p => providers.append(inventoryItem(p)));
    const select = $('#task-provider'); const selected = select.value; select.replaceChildren(node('option', '', 'Theo cấu hình máy chủ')); select.firstChild.value = '';
    state.providers.filter(p => p.kind !== 'LEGACY_WEB_BRIDGE' && p.status !== 'DISABLED').forEach(p => { const option = node('option', '', `${p.name || p.id} · ${statusLabel(p.status)}`); option.value = p.id; select.append(option); }); if ([...select.options].some(o => o.value === selected)) select.value = selected;
    const specialistSelect = $('#task-agent'); const selectedSpecialist = specialistSelect.value || 'content'; specialistSelect.replaceChildren();
    state.agents.filter(agent => !['manager', 'qc'].includes(agent.id)).forEach(agent => { const option = node('option', '', roleNames[agent.id] || agent.name || agent.id); option.value = agent.id; specialistSelect.append(option); }); if ([...specialistSelect.options].some(option => option.value === selectedSpecialist)) specialistSelect.value = selectedSpecialist;
    const capabilities = $('#capability-list'); capabilities.replaceChildren(); state.agents.forEach(agent => {
      const row = inventoryItem(agent); const info = $('.inventory-info', row); const tags = node('div', 'tool-tags'); list(agent.tools).forEach(tool => tags.append(node('span', 'tool-tag', typeof tool === 'string' ? tool : tool.name || tool.id))); info.append(tags); list(agent.limitations).filter(limit => limit !== agent.description).forEach(limit => info.append(node('p', 'limit-note', text(limit)))); capabilities.append(row);
    });
    [['#connector-list', state.connectors, 'Chưa có kết nối bên ngoài được xác minh.', 'connector'], ['#skill-list', state.skills, 'Chưa ghi nhận kỹ năng từ máy chủ.', 'skill']].forEach(([selector, items, message, type]) => { const area = $(selector); area.replaceChildren(); if (!items.length) area.append(node('p', 'inventory-empty', message)); items.forEach(item => area.append(inventoryItem(item, type))); });
    const legacy = $('#legacy-list'); legacy.replaceChildren(); if (!state.legacy.length) legacy.append(node('p', 'inventory-empty', 'Chưa có tài liệu kế thừa trong danh mục cho phép.')); state.legacy.forEach(item => { const row = inventoryItem(item); if (item.available && item.key) $('.inventory-info', row).append(button('Đọc tài liệu tham khảo →', 'text-button', () => previewLegacy(item))); legacy.append(row); });
  }
  async function previewLegacy(item) {
    $('#preview-title').textContent = item.name || item.key; $('#preview-meta').textContent = 'Tài liệu kế thừa · Chỉ đọc · Chưa kiểm chứng'; $('#preview-download').hidden = true; $('#preview-content').textContent = 'Đang đọc tài liệu…'; if (!$('#preview-dialog').open) $('#preview-dialog').showModal();
    try { const response = await fetch(`/api/legacy/${encodeURIComponent(item.key)}`, { credentials: 'same-origin' }); if (!response.ok) throw new Error(`Không đọc được tài liệu (HTTP ${response.status}).`); const content = await response.text(); $('#preview-content').textContent = content; }
    catch (error) { $('#preview-content').textContent = error.message; }
  }

  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); const control = $('#login-submit'); control.disabled = true; control.textContent = 'Đang mở văn phòng…'; $('#login-error').hidden = true;
    try { const info = await api('/api/session', { method: 'POST', body: JSON.stringify({ token: $('#access-token').value.trim() }) }); await signedIn(info); }
    catch (error) { errorIn($('#login-error'), error); }
    finally { control.disabled = false; control.textContent = 'Vào văn phòng →'; }
  });
  $('#logout-button').addEventListener('click', async () => { try { await api('/api/session', { method: 'DELETE' }); signedOut(); $('#access-token').focus(); } catch (error) { showGlobalError(error.message); } });
  $('#task-form').addEventListener('submit', async event => {
    event.preventDefault(); if (session?.role !== 'admin') return;
    const brief = $('#task-brief').value.trim(); if (!brief) return;
    const kind = $('#task-kind').value; const input = {};
    if (kind === 'data_analysis') input.csv = $('#task-csv').value;
    if (kind === 'html_audit') input.html = $('#task-html').value;
    if (kind === 'ai_draft') { input.context = $('#task-context').value; if ($('#task-agent').value) input.agentId = $('#task-agent').value; }
    if (kind === 'auto') { const value = $('#task-auto').value; if (value.trim().startsWith('<')) input.html = value; else if (value.includes('\n') && /[,;\t]/.test(value.split('\n')[0])) input.csv = value; else input.context = value; }
    const request = { brief, kind, input }; if (['ai_draft', 'auto'].includes(kind) && $('#task-provider').value) request.providerId = $('#task-provider').value;
    const body = JSON.stringify(request); if (!createRequest || createRequest.body !== body) createRequest = { body, key: crypto.randomUUID() };
    const control = $('#submit-task'); control.disabled = true; control.textContent = 'Đang gửi mục tiêu…'; $('#task-error').hidden = true;
    try { const task = await api('/api/tasks', { method: 'POST', headers: { 'Idempotency-Key': createRequest.key }, body }); createRequest = null; showNotice('Đã giao việc. Văn phòng sẽ ghi lại từng bước thực hiện.'); await refresh(true); if (task?.id) openTask(task.id); }
    catch (error) { errorIn($('#task-error'), error); }
    finally { control.disabled = session?.role !== 'admin'; control.textContent = 'Giao việc cho văn phòng →'; }
  });
  $('#sample-csv-button').addEventListener('click', () => { $('#task-csv').value = 'khu_vuc,doanh_thu,chi_phi\nHà Nội,120,78\nĐà Nẵng,95,61\nTP.HCM,160,102\nCần Thơ,72,48'; if (!$('#task-brief').value.trim()) $('#task-brief').value = 'Phân tích dữ liệu mẫu: thống kê doanh thu và chi phí, chỉ ra những điểm cần chú ý.'; showNotice('Đã điền dữ liệu mẫu. Chưa tạo công việc; bấm Giao việc khi bạn sẵn sàng.'); });
  $('#probe-button').addEventListener('click', async () => { const control = $('#probe-button'); control.disabled = true; control.textContent = 'Đang kiểm tra…'; try { await api('/api/providers/probe', { method: 'POST', body: '{}' }); await refresh(true); showNotice('Đã cập nhật trạng thái model; probe chưa xác minh quota miễn phí.'); } catch (error) { showGlobalError(error.message); } finally { control.disabled = session?.role !== 'admin'; control.textContent = 'Kiểm tra provider mặc định'; } });
  $('#task-kind').addEventListener('change', updateFields); $('#new-task-button').addEventListener('click', goCompose); $('#refresh-button').addEventListener('click', refresh);
  $$('[data-office-view]').forEach(control => control.addEventListener('click', () => setOfficeView(control.dataset.officeView)));
  $('#task-search').addEventListener('input', renderTasks); $('#task-filter').addEventListener('change', renderTasks); $('#artifact-search').addEventListener('input', renderLibrary);
  $$('.close-dialog').forEach(control => control.addEventListener('click', () => control.closest('dialog').close()));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } }));
  $('#task-dialog').addEventListener('close', () => { selectedTask = null; detailFingerprint = ''; });
  window.addEventListener('hashchange', route); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && session) refresh(); });
  updateFields(); setOfficeView(matchMedia('(max-width: 760px)').matches ? 'list' : officeView);
  api('/api/session').then(info => signedIn(info)).catch(error => { signedOut(); if (error.status !== 401) errorIn($('#login-error'), error); });
})();
