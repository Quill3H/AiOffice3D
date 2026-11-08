# V4 gateway and sourced-brief slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix six reproduced defects and make CEO brief → model manager → model specialist → independent source QC → explicit CEO approval verifiable without claiming live-model access.

**Architecture:** Retain Node native, SQLite task/attempt/event storage, bounded queue, immutable artifacts and existing workflows. Add a small provider gateway and one constrained extractive workflow; do not build an arbitrary agent framework. QC independently checks submitted source excerpts; truth, relevance and source authenticity remain human-reviewed.

**Tech Stack:** Node >=22.13, CommonJS, node:sqlite, fetch, node:test; no new packages.

**Spec:** PRODUCT.md, DESIGN.md, docs/API.md, docs/ACCEPTANCE.md, docs/reviews/2026-11-09-v4-audit.md and CEO technical-review request.

## Global Constraints

- Base f2d9034f801365eeadf09a5c4e463d2a825ccba7; isolated codex branch; no merge, publish, deletion or artifact overwrite.
- CEO confirms Meta Muse https://ai.meta.com/muse/ and API test budget 0 VND, only verified free quota. Remote generation defaults disabled; a subscription is not API authorization.
- Preserve native implementation, old endpoint contracts and CEO version gate. Do not execute generated code or fetch model-supplied URLs.
- Source files, hashes and real test results distinguish supplied evidence, protocol doubles and live inference.

## Review Focus

- Restart after a reserved cloud call: reservation survives and is not silently spent again (Task 2).
- Caller cancellation must not fall through to another provider or poison a healthy connection (Tasks 1–2).
- Source text containing instructions or fabricated source IDs cannot bypass exact-excerpt QC (Task 3).
- Concurrent requests and duplicate task keys must preserve bounds and generate only one attempt (Tasks 1, 3, 5).
- Newer schemas, malformed model plans and unknown binary formats fail closed without modifying existing outputs (Tasks 1, 3–4).

## Task 1 — Six narrow audit fixes

**Files:** src/store.js, src/http.js, src/providers.js, src/tools.js, src/qc.js, src/engine.js, new src/limits.js; tests/audit-regressions.test.js.

**Interfaces:** Existing public APIs unchanged. A shared MAX_BRIEF_BYTES=82000 covers 12000-character brief + 8000-character revision and prefix; context remains 100000 UTF-8 bytes and is validated before queuing AI work.

- [ ] Add/watch RED for each A01–A06 repro; two REDs already observed for future schema and concurrent login.
- [ ] Guard future schema before DDL; reserve login attempt before await; compare JSON number semantics; align UTF-8 limits; distinguish caller abort; recognize exact HTML tag names in producer and independent scanner.
- [ ] Run new regressions and full suite; commit only fixes/tests with observed results.

## Task 2 — A: provider gateway, access and spending bounds

**Files:** new src/gateway.js, src/gateway-config.js; modify src/store.js, src/http.js, src/engine.js; new tests/gateway.test.js; docs/API.md.

**Interfaces:** Gateway implements status(), statuses(), probe(providerId?), generate({brief,context,signal,providerId,call:{taskId,attemptId,phase}}). Adapters implement LocalProvider-compatible generate/probe/status; cloud adapters use configured exact HTTPS /v1 endpoint and env key reference, never request payload endpoints. Only official Muse api.meta.ai and Kimi api.moonshot.ai/api.moonshot.cn hosts; explicit model ID required. Native fetch uses bounded response, redirect:error, timeout and strict model/finish checks.

**API contract:** POST /api/providers/probe accepts optional {providerId}; GET /api/state lists adapters and sanitized connection/budget status. POST tasks providerId selects configured route. Existing local-only behavior stays default. No endpoint accepts secrets.

**Persist:** additive SQLite table provider_calls: unique call ID, task/attempt/phase, provider/model, RESERVED/SUCCEEDED/FAILED/UNKNOWN, timestamp, usage. Per-workspace configured remoteCallLimit is an additional cap, not proof of free billing; remote generation also requires explicit verified-free operator setting. Reserve atomically before dispatch, retain reservation on failure/crash. No cost or free-quota claim without provider evidence.

- [ ] RED tests: missing credentials, rejected endpoint/model mismatch, outage→bounded fallback, cancellation→no fallback, timeout, malformed/truncated response, persisted call cap and restart ambiguity.
- [ ] Implement at most one dispatch per configured provider per call, at most 3 providers; no fallback for malformed successful output, caller abort or exhausted budget. Default remoteCallLimit=0. Suppress provider error bodies/keys in public state.
- [ ] GREEN focused tests and existing provider/HTTP suite; commit. Real access only if key and verified-free quota exist, otherwise record NOT_CONFIGURED/UNVERIFIED.

## Task 3 — B/C: sourced-brief vertical slice

**Files:** new src/sourced-brief.js, src/source-qc.js; modify src/engine.js, src/work.js, src/qc.js; new tests/sourced-brief.test.js; docs/API.md and docs/ACCEPTANCE.md.

**API contract:** POST /api/tasks {kind:'sourced_brief',brief,providerId?,input:{sources:[{id,title,url,text}]}} with ordinary Idempotency-Key. 1–5 unique sources, HTTPS URLs without credentials, each <=20000 UTF-8 bytes and total <=60000; no remote fetch. Preserve supplied text and hash. Existing source/history/artifact/review endpoints remain authoritative.

**Manager output:** strict JSON {steps:[{id,agentId:'content'|'seo'|'development',title,dependsOn:[]}]}, 1–3 sequential steps, exact earlier-step dependency; no commands, URLs, provider or paths accepted. Store manager artifact and provenance before specialist handoff. Specialist output strict JSON {claims:[{sourceId,quote}]} with 1–8 literal nonempty excerpts <=2000 bytes each, known source IDs; each planned step executes with prior structured handoffs. No model-written factual prose outside excerpts in this initial scope.

**Persist:** attempt.plan, ordered handoffs, provider provenance/usage and source manifests; immutable plan.json, brief.json and report.md; per-stage events manager/specialist/QC. Reuse task/attempt cancellation, dependency gates, bounded retries, deadline, queue and CEO approval. Never rerun interrupted attempt automatically.

**QC contract:** a separate module reads disk artifacts and independently validates plan schema/dependencies, every handoff/claim, exact quote inclusion, source IDs/URL/title/hash, complete report reconstruction and stage provenance. Factual truth/source authenticity/relevance remain UNVERIFIED. Fabricated quote or citation => NEEDS_REVISION. PASS means bounded extractive checks passed, never automatic DONE.

- [ ] RED: complete double-backed workflow waits for approval, malformed plan makes zero specialist calls, fabricated quote rejected, dependency handoffs preserved, retry retains old artifacts, duplicate key no extra model calls, cancellation/outage bounded.
- [ ] Implement stages and independent QC without changing deterministic workflows. Use explicit protocol-double fixtures, no fake live badges.
- [ ] GREEN focused suite and all regressions; commit. Provide a runnable API example and evidence identifying doubles vs actual models.

## Task 4 — D: binary infrastructure boundary

**Files:** new docs/design/BINARY_ARTIFACTS.md; future src/artifacts.js and tests/artifacts.test.js only after media-producing workflow is authorized.

**API/data design:** Buffer/Uint8Array bytes; allowlisted extension/MIME; PNG signature/IHDR/dimensions plus decoder validation, MP4 ftyp/container/codec/duration via separately approved decoder; streaming temporary wx file, bounded bytes, fsync, atomic registry publication, SHA-256, no overwrite. Store bytes/mime/sha/dimensions/duration/validation status with artifact ID. GET /api/artifacts/:id/download streams correct MIME + attachment; inline media restricted to verified formats. Failed decoding cannot claim content QC.

- [ ] Document migration/API/files/regressions/acceptance for PNG and MP4: spoofed MIME, polyglot, truncation, zip/decompression bomb, quota concurrent reservation, cancellation, crash orphan, streaming hash mismatch. Preserve orphans, no automatic deletion.
- [ ] Keep binary implementation deferred in this slice: no media producer exists, current 2MiB text limit remains explicit. Do not mark D implemented.

## Task 5 — E: verification and independent review

**Files:** tests above plus existing tests/runtime.test.js, tests/http.test.js, tests/restart.test.js, tests/tools.test.js, tests/lifecycle.test.js; docs/reviews/2026-11-09-remediation-results.md.

- [ ] Run node --test focused RED/GREEN per change, then npm test using isolated temporary data and authorized loopback fixtures; include real SIGKILL restart test.
- [ ] Independently review complete branch against base, fix confirmed material findings with regressions, rerun affected/full suite after changes.
- [ ] Record actual counts/logs, commit list, no-real-model limitation, remaining binary/general-DAG/semantic-QC limits and CEO decisions. Verify original checkout and main untouched; no push/merge.

Acceptance: all six repros green; old suite green; gateway and sourced-brief tests green with persisted provenance/cap; approved status only via explicit current-version CEO request; zero cloud spend and no live-inference claim absent evidence.
