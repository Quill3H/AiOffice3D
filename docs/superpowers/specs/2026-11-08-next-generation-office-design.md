# Văn Phòng AI Studio: local execution office

## Authority and intent
The user's attached master prompt authorizes autonomous technical choices, implementation, tests and commits. No main merge, paid calls, Internet exposure, deletion of user data, or overwriting old artifacts. This design is the implementer's choice under that authority, not a claim of separate user design approval.

## Current evidence
Baseline aee38ba is a dependency-free Node monolith with a card dashboard, writable parent-directory documents, unauthenticated APIs, wildcard CORS, absolute-path file reads, synchronous shell interpolation, static staff/model/connector claims, in-memory execution and numeric QC based partly on formatting. The independent legacy audit records precise evidence. Existing parent-directory documents remain untouched.

## Alternatives and choice
1. Patch the monolith: quick security edits, but retains coupled state, untrustworthy execution/QC and fixed output paths.
2. Replace the active entry point with a small modular local runtime, retaining old sources in Git and old data as read-only legacy references. Chosen: dependency-free, testable and reversible.
3. New React/3D framework/service stack: more installation and rendering cost, with little benefit to reliable local execution. Deferred.

## Architecture
Node >=22.13 (built-in SQLite), vanilla HTML/CSS/JS, no install or cloud cost. Modules: transactional SQLite store; bounded workflow engine; registered deterministic tools; independent evidence-based QC; optional configured local OpenAI-compatible provider; secure HTTP/SSE transport. Work runs in worker threads where CPU processing can grow. UUID identity, idempotency-key/request fingerprint, task-local immutable artifacts with SHA256, version-bound approvals, durable steps/attempts/events. SQLite WAL and a single-writer lock prevent two schedulers opening the same workspace. Interrupted tasks become INTERRUPTED, require explicit retry, and keep their attempts/artifacts. Queued tasks resume. Cancellation aborts workers/provider calls and prevents late completion.

## First working workflows
CEO supplies a natural-language goal plus CSV input. A clearly labelled RULE_ENGINE manager creates dependent data-analysis → evidence report → independent QC steps. CSV statistics are computed from the submitted rows, not a stock report. The QC independently recomputes numeric results, verifies content/checksums and input provenance; it never invents a score. All work awaits CEO acceptance; rejection creates a revision request, retry creates a new attempt/version, old versions remain. Invalid/missing data is blocked or rejected, never DONE. Offline HTML checks and local runtime inventory provide bounded additional specialist tools. Text drafting may use a configured local model, with exact provider/model provenance; semantic and aesthetic QC remain explicitly unverified pending human review. No automatic API spend or arbitrary model-generated commands.

## Product and capabilities
Lightweight 2.5D office as an optional view of the same backend state; list view works on small screens. Eight requested specialisms plus manager have exact tool grants and availability. Unavailable media generation, ad publication, full SEO crawling, external connectors and Web Bridge show NOT_CONNECTED/UNAVAILABLE, never fake readiness. Bridge extension is retained as legacy, disabled in the runtime until a secure pairing adapter is implemented. A skill's presence is metadata, not permission to execute it or proof its tools/connectors work.

UI: CEO task composer, spatial office, selectable personnel, task board/detail, dependency timeline, real attempt/events, artifact library with plaintext previews/downloads, QC dimensions and approve/request-revision controls, provider/skill/connector inventory. No simulated tasks/progress. Empty states teach the first workflow. No GPU/canvas dependency. All untrusted text uses textContent; no raw HTML/Markdown rendering.

## Security boundary
Bind 127.0.0.1 only. Persistent random admin and read-only tokens in ignored mode-600 files; explicit sign-in, HttpOnly SameSite=Strict session cookie, CSRF header, exact Origin/Host checks. All business APIs and downloads authenticated; reader role cannot mutate. Bounded JSON bodies, input lengths and provider responses, no shell execution in active runtime, no arbitrary file/path/URL endpoint, artifacts served by registered ID after realpath confinement and checksum validation. CSP and no remote assets. Local provider URL is configuration-only and loopback-only, redirects forbidden; cloud calls disabled. Shared legacy data read only through explicit fixed file allowlist and never treated as new verified work.

## Acceptance evidence
Node built-in unit/integration tests use temporary workspaces and do not call old mutating APIs. Real offline computation from supplied CSV; invalid input, corrupt artifact, missing artifact, approval bypass, revisions, concurrent dispatch, retry deduplication, cancellation, timeout, restart and lock conflict tested. HTTP tests cover anonymous/reader/CSRF/origin/host/body/path injection and disabled bridge. Provider tests use labelled local test doubles, not evidence of actual model quality. Browser MCP opens isolated test port, performs login/create/review/artifact flow and checks desktop/mobile. Real provider verification is conditional on actual local availability and reported separately.

## Limits and handover
The complete general-purpose autonomous company in the vision needs future specialist tool integrations and real provider evaluation. This release must deliver a truthful, usable end-to-end foundation rather than claim those integrations exist. README, engineering/acceptance report, UI evidence, branch/SHA and rollback instructions accompany code. Old tests retained as legacy and no longer advertised as current acceptance.
