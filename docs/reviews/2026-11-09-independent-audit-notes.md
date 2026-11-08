# v4 baseline audit — 2026-11-09

Baseline supplied by the coordinator: `f2d9034f801365eeadf09a5c4e463d2a825ccba7`. This is a pre-remediation audit, not product acceptance. No P0 was demonstrated. One P1 and five P2 defects were reproduced.

## Scope and evidence

Read `PRODUCT.md`, `DESIGN.md`, `docs/API.md`, `docs/ACCEPTANCE.md`, every active `src/*.js`, `server.js`, `tools/lifecycle.js`, `public/app.js`, the relevant form markup, and the active tests. The coordinator reports the authorized baseline suite as 47/47 passing; the historical root test scripts were not run. No legacy tools, source changes, credentials or real model/provider calls were used by this reviewer. Reviewer reproductions imported the baseline modules into throwaway Node scripts and used temporary data directories; the AI cases used explicitly labelled protocol/provider doubles.

The coordinator independently added `tests/audit-regressions.test.js` and reported its two tests failing against this baseline. Those findings are identified below; this reviewer also inspected their test source.

## Confirmed defects

### P1 — Refuse a newer database schema before any mutation

`src/store.js:24-31` opens SQLite, executes schema DDL, and unconditionally writes `PRAGMA user_version=1` without first rejecting a newer version. Opening a future-version workspace can therefore silently downgrade its schema marker and write through incompatible storage assumptions. No newer schema implementation was exercised, so actual record corruption was not demonstrated.

Coordinator reproduction: initialize an isolated workspace, close it, set `PRAGMA user_version=99`, then construct `Store` again. Startup succeeds and changes the marker to 1. The regression must require startup refusal and preservation of version 99, its tables and data.

### P2 — Parallel login requests bypass the failed-attempt bucket

`src/http.js:76-80` obtains a new bucket before `await body(req)` but only stores it after a failure. Requests with overlapping incomplete bodies can all obtain independent `{count:0}` objects. The intended ten-failure limit does not cover that burst.

Coordinator reproduction: open twenty requests, flush all headers, then release all invalid-key bodies together. Baseline returns twenty 401s; expected is ten 401s and ten 429s. Use an isolated server/data directory and raw loopback HTTP requests, as in `tests/audit-regressions.test.js:21-35`.

### P2 — Valid custom HTML elements become invented links/headings/metadata, with QC PASS

`src/tools.js:43-47` uses `\b` after HTML tag names. A hyphen creates a word boundary, so `<a-box>` is counted as `<a>`, `<h1-card>` as `<h1>`, and `<meta-card>` as `<meta>`. The separate scanner repeats this prefix error in `src/qc.js:65-75`, allowing incorrect data and content to PASS QC.

Minimal source:

```html
<a-scene><a-box></a-box></a-scene><h1-card>Card</h1-card><meta-card name="description" content="Not metadata"></meta-card>
```

Real `executeTool({kind:'html_audit',input:{html}})` reports `h1Count:1`, `linkCount:2`, `linksWithoutHref:2`, and description `Not metadata`; real `audit({...result,kind:'html_audit',input:{html}})` returns PASS. These are valid custom-element names; the documented limitation about malformed markup does not account for this input. The smallest regression expects all three counts to be zero, description empty, and rejects a forged report containing the old counts.

### P2 — Signed zero makes correct CSV output fail independent QC

`src/qc.js:55,110` computes signed-zero statistics and compares them to parsed JSON with `isDeepStrictEqual`. JSON serialization normalizes `-0` to `0`; strict comparison distinguishes them. Thus a valid CSV can never pass even though its persisted numbers follow JSON's representation.

Minimal source: `value\n-0`. A real engine execution returns NEEDS_REVISION with the data dimension FAIL and numeric output `{sum:0,min:0,max:0,mean:0}`. The smallest regression runs this source through the real producer and actual QC, expects PASS/AWAITING_APPROVAL, and retains rejection of a materially changed statistic. Normalize the JSON numeric representation rather than weakening all structured comparisons.

### P2 — Accepted AI inputs/revision instructions can exceed the later execution bound

`src/engine.js:48,51,112,180` accepts a brief of up to 12,000 UTF-16 code units, arbitrary input strings up to 500,000 code units, and an 8,000-character revision; it concatenates the revision into the brief. `src/tools.js:71-72` and `src/providers.js:87-88` instead require a 10,000-byte brief and 100,000-byte context. A task or review can be accepted despite having no valid execution path.

Reproduced with a connected provider double: a 9,000-byte ASCII brief produces a valid draft and passes actual QC; an accepted 2,000-character revision then retries into FAILED with `Brief source exceeds 10000 byte size limit`, before the provider is called again. The revision cannot be edited in that failed state. A direct accepted AI brief of 10,001 ASCII characters has the same mismatch. Regression should cover both initial input and combined revision, including multibyte Vietnamese text, and require coherent validation at the API boundary without consuming a doomed attempt.

### P2 — CEO cancellation falsely disconnects a freshly probed provider

`src/engine.js:173` aborts with `new Error('Cancelled by CEO')`. `src/providers.js:100-102` exempts only errors named `AbortError`, so caller cancellation is treated as a provider failure. A healthy provider becomes NOT_CONNECTED with error `Cancelled by CEO`; subsequent AI creation is BLOCKED until another probe. The existing test only covers `controller.abort()` with its default DOM AbortError.

Minimal protocol double: return a valid model list for probe; for generation, reject with `signal.reason` on abort. After a successful probe, call `generate`, then abort the caller controller with `new Error('Cancelled by CEO')`. Baseline status changes from CONNECTED to NOT_CONNECTED. Regression should use the exact engine cancellation reason and keep the fresh probe valid, while genuine HTTP/protocol failures still invalidate readiness. This finding concerns false status and the unnecessary recovery step, not late output: cancellation did prevent publication.

## Non-defects and limits

- The proposed immediate-retry scheduler race was disproved. A synchronous `change` listener retried a task immediately on FAILED while it remained in `active`; the old attempt's `finally` removed its active entry and scheduled again. The test reached attempt 2 with two executions. Do not add a speculative scheduler fix.
- Configured loopback models only, disabled legacy bridge, deterministic CSV/HTML/system tools, and explicit provider probing are intentional boundaries. The specialist roles share a bounded workflow; autonomous model planning, rich role-specific agents, cloud providers, connectors and video production are missing future capabilities, not regressions against the current product contract.
- AI semantic/factual quality, aesthetic quality and business acceptance remain explicitly UNVERIFIED. A technical PASS accompanied by those dimensions is not itself a false claim of semantic approval.
- Reservations deliberately include failed/interrupted attempts and do not delete old output to reclaim quota. This conservative policy is documented, so an unused reservation alone is not a demonstrated bug.
- Stale SQLite ownership after OS PID reuse and lifecycle startup accepting an unrelated process's generic health response were considered but not reproduced under actual process reuse/startup timing. They remain unverified risks, not confirmed findings.
- No new artifact-integrity bypass or late-publication bug was demonstrated. Existing hash/scope checks, attempt provenance and crash tests are meaningful evidence within their tested cases; they do not prove all races, power-loss behavior or workload limits.
