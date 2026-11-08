# Next Generation Office Implementation Plan

> **For agentic workers:** Use executing-plans for the core; independent audit and UI tasks may be delegated via dispatching-parallel-agents. Write failure assertions before behavioral implementation.

**Goal:** Deliver a secure, durable local office with a real analysis → QC → CEO acceptance workflow.

**Architecture:** Modular Node runtime over built-in SQLite, bounded tools and immutable artifacts; no execution through the legacy monolith. Vanilla spatial frontend consumes authenticated snapshots/SSE.

**Tech Stack:** Node >=22.13, node:sqlite, node:test, worker_threads, HTML/CSS/JS; no external packages.

**Spec:** docs/superpowers/specs/2026-11-08-next-generation-office-design.md

## Global Constraints
- No merge main, paid service calls, public bind, deletion of user data or overwriting old artifacts.
- Distinguish deterministic tools, AI provider and test doubles. Never fabricate progress, scores, connectivity or model quality.
- Node >=22.13; macOS Intel; data local to ignored .studio directory.

## Review Focus
- Concurrent scheduler/retry/review must not mark cancelled or stale-version tasks DONE.
- Restart must retain events, approval and output integrity; interrupted execution needs explicit retry.
- Invalid CSV, model output and malicious HTML must not become successful deliverables.
- Symlinks, CSRF, DNS-rebinding Host and reader credentials cannot bypass filesystem/authorization boundaries.
- Legacy user documents remain untouched; connector/skill presence never implies connection.

### Task 1: Durable execution and evidence
Files: src/store.js, src/engine.js, src/tools.js, src/tool-worker.js, src/qc.js, src/providers.js, tests/runtime.test.js.
Interfaces: Store(dataDir) persists tasks/attempts/events; Engine({store,...}) creates, runs, retries, cancels, reviews and snapshots tasks. Artifact ID resolves only through registry.
- [x] Write failing node:test cases for real CSV computation, missing data, independent QC, revision/version acceptance, retry/concurrency, cancellation/timeout, persistence and artifact integrity.
- [x] Run `node --test tests/runtime.test.js`; record RED.
- [x] Implement bounded execution, immutable files, transactional metadata and independently recomputed QC.
- [x] Run runtime suite; expect all pass.

### Task 2: Secure HTTP entry point
Files: server.js, src/http.js, tests/http.test.js, package.json, .gitignore, start.sh, stop.sh.
Interfaces: createStudio({dataDir,port,provider}) returns server, engine, listen(), close(); exact API contract in docs/API.md.
- [x] Write failing HTTP tests for auth, reader, CSRF/origin/host, download integrity, body limit, old routes disabled.
- [x] Run HTTP suite; record RED.
- [x] Implement loopback transport, auth/session, allowlisted files, SSE and safe process ownership scripts.
- [x] Run both suites; expect all pass.

### Task 3: Truthful office UI
Files: public/index.html, public/app.js, public/style.css, PRODUCT.md, DESIGN.md.
Interfaces: GET /api/state; POST /api/tasks; POST /api/tasks/:id/{retry,cancel,review}; GET /api/artifacts/:id; GET /api/events; GET/POST /api/session.
- [x] Build office/list views, composer, task detail, QC/approvals, artifacts and capability settings against the contract.
- [x] Verify actual local UI through Browser MCP, including create/review/download and small viewport. Capture evidence.

### Task 4: Review and delivery
Files: docs/LEGACY_AUDIT_2026-11-08.md, docs/ENGINEERING_REPORT.md, docs/ACCEPTANCE.md, README.md.
- [x] Independent whole-branch review; fix material findings with regression tests.
- [x] Run `npm test`, browser checks and syntax checks. Label test doubles and real provider availability.
- [x] Commit code/docs on development branch, record SHA and safe rollback. Leave merge for user approval.

## Execution ledger

Baseline aee38ba; native core implementation, independent audit/frontend/tools tasks, final fresh-context code/UI review. Technical choices were delegated by the user; no separate design approval inferred.

Tasks 1–3 complete: RED observed for missing runtime/HTTP modules and regression assertions; implemented and verified. Task 4 complete at handover: 47/47 tests, real browser flow and screenshot evidence, start/stop smoke test, local commit on the development branch; no merge/push.

Rulings: dependency-free Node 22 built-in SQLite chosen for local Intel use; deterministic CSV workflow first; legacy bridge disabled rather than advertised as connected; parent business data read-only; real provider evaluation remains conditional on configuration. These boundaries and their implications are reported in ENGINEERING_REPORT.md.
