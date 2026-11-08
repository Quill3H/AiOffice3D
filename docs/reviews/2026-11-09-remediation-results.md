# AiOffice3D v4 — remediation results

09/11/2026. Base main f2d9034f801365eeadf09a5c4e463d2a825ccba7. Isolated branch **codex/v4-audit-remediation**, worktree **AiOffice3D-v4-remediation**. This is a reviewable engineering slice, not completion of the entire multi-agent/media vision.

## Delivered in order

1. [Baseline audit](2026-11-09-v4-audit.md), [independent audit notes](2026-11-09-independent-audit-notes.md) and [static legacy coverage](2026-11-09-legacy-coverage.md). Baseline authorized full suite47/47. Classified reproduced bugs separately from intentional boundaries, missing features and unverified risks; no reproduced P0.
2. [Implementation plan](../superpowers/plans/2026-11-09-v4-remediation.md): ordered A–E, API contracts, persisted data, file ownership, regressions and acceptance. Keep native Node/SQLite, existing deterministic workflows, workers, queue, immutable UUID/hash artifacts, attempts/events/idempotency and version-bound CEO gate.
3. Small sourced_brief API slice: brief → model manager plan →1–3 sequential specialists with structured handoffs → separate deterministic source QC → AWAITING_APPROVAL. Only explicit current-version CEO approval can set DONE.

## Confirmed defects fixed

| Priority / ID | Root cause / change | Regression evidence |
| --- | --- | --- |
| P1 A01 | Future SQLite schema was silently downgraded; now reject before migration and preserve version | schema99 RED missing exception → GREEN; schema2 additive provider ledger |
| P2 A02 | Login bucket raced across pending bodies; reserve attempt before await |20 parallel requests:20×401 RED →10×401+10×429 GREEN |
| P2 A03 | CSV -0 vs persisted JSON0 caused false rejection | Actual producer + independent QC RED → GREEN |
| P2 A04 | Character acceptance disagreed with executor/provider byte limits |9000-character Unicode brief +2000-character revision RED → GREEN; shared limits and early context bound |
| P2 A05 | Caller abort(Error) poisoned a healthy probe | CEO cancellation RED NOT_CONNECTED → GREEN CONNECTED; no fallback on cancel |
| P2 A06 | HTML word boundaries misclassified custom tags, shared bad assumption passed QC |a-scene/a-box/h1-card/meta-card RED → exact-tag producer + separate scanner GREEN; tamper rejected |
| Important, final review | Local transient errors lacked retryable classification, preventing local-first fallback | HTTP408/429/503/network/timeout local→cloud RED → GREEN; fatal/protocol/cancel stays no-fallback |

The final review also identified a local-only execution label (corrected for truthful provenance) and prose/JSON instruction mismatch (bounded internal responseMode). [Review and correction record](2026-11-09-final-independent-review.md) distinguishes reproduced failure, request-construction evidence and unverified real-model behavior.

## A–E implementation status

| Item | Implemented now | Remaining boundary |
| --- | --- | --- |
| A Gateway | Local/Muse/Kimi native adapters, fixed official cloud endpoint allowlist, explicit model probes, strict response provenance/finish/size, ≤3-provider fallback, cancellation, per-model operator free-quota attestation + default0 durable dispatch cap, startup UNKNOWN | No live account/access/generation/free-billing verification. Operator evidence is not application billing verification. No paid use authorized. |
| B Independent QC | Own worker/module validates source IDs/text hashes, literal quotes, plan/handoff schemas/dependencies, stage content hashes and complete report; fabricated citation/quote => NEEDS_REVISION | No source retrieval/authenticity/truth/relevance/semantic reviewer; these dimensions remain UNVERIFIED. |
| C Orchestrator | Model plan1–3 sequential specialist steps, durable pre-handoff SQLite checkpoint, preceding structured handoff, actual stage events, cancel/deadline, bounded explicit retry/idempotency, recovery and CEO gate | General DAG, parallel specialists, autonomous replanning and automatic workflow reuse are not implemented. |
| D Binary artifacts | [PNG/MP4 design](../design/BINARY_ARTIFACTS.md) with byte/MIME/decoder/registry/API/migration/limits/tests/acceptance | PNG/MP4 implementation and decoder validation deferred; runtime remains text-only,2MiB/file. No new dependency. |
| E Reliability | Provider outage/transient/fatal/protocol, real abort timer, engine deadline/cancel, concurrent dispatch cap, duplicate keys, queued startup, durable UNKNOWN and two real SIGKILL fixtures | Not a capacity/security/soak certification or exhaustive crash-point proof. |

Source text is supplied by the caller and never fetched from model URLs. Synthetic fixtures are labelled; fixture example.org URLs are not cited as real research. External adapter design sources are linked in API/audit documents.

## Actual verification

Final command: `npm test`, Node22.23.4/darwinx64, authorized only for disposable loopback fixtures. **84 tests,84 pass,0 fail,0 skip**. [Full final TAP](evidence/2026-11-09-final-tests.tap), [baseline47/47](evidence/2026-11-09-baseline-tests.tap), [six original REDs](evidence/2026-11-09-audit-red.tap), [final-review REDs](evidence/2026-11-09-review-red.tap), [outgoing JSON route RED](evidence/2026-11-09-json-route-red.tap).

| Suite | Tests |
| --- | ---: |
| runtime |21|
| tools |16|
| HTTP |9|
| audit regressions |6|
| gateway |18|
| sourced brief |11|
| real process restart |2|
| lifecycle |1|

Fresh independent reviewer inspected f2d9034 → d8b880b and ran gateway/source suites26/26; one Important issue was fixed afterwards with regressions and the full84-test run. No claim of a second independent review of the fix commit. Source/docs `git diff --check` (excluding raw TAP evidence) and `node --check public/app.js` passed. Raw RED TAP includes Node assertion blank-line indentation and is preserved byte-for-byte; full whitespace checking flags those log lines only.

Offline demonstration: `node scripts/demo-sourced-brief.cjs` produced3 immutable registered files, QC PASS, status AWAITING_APPROVAL and approval=null. [Saved evidence](evidence/2026-11-09-demo-evidence.json), [readable output](evidence/2026-11-09-demo-report.md). Label: **OFFLINE_PROTOCOL_DOUBLE_NOT_LIVE**. This demonstrates execution/state/evidence handling, not model intelligence or output quality. Script uses a fresh temp directory and preserves it for inspection.

## Decisions and limits

- Executed all authorized phases inline under Superpowers TDD/debug/planning/verification, with independent baseline and final reviews; no intermediate permission halt.
- Persist manager checkpoint in SQLite before dispatch, publish plan.json with final artifacts; avoid a second partial file-publication path. Interrupted work retains the checkpoint but may have no final files.
- Source kind is API-only; PNG/MP4 remains design-only. This respects the requested single text slice and avoids an unapproved media/decoder expansion.
- Only provider truth labels changed in frontend: cloud support made local-only labels inaccurate. No layout/CSS/source-compose redesign. No new browser visual QA claimed.
- Free-quota evidence is per-provider/model operator attestation; billingVerifiedByApplication=false. Dispatch cap stays0 unless the CEO supplies verified entitlement and authorizes activation. A listing probe or web subscription cannot satisfy that decision by itself.
- Regraded the local-only step label for provenance impact; resolved JSON prompt construction without claiming any real-model improvement. Kept source truth/live billing/full-security/max-load review exclusions explicit. No deferred confirmed Important/Critical finding remains from the final review.

## CEO blocker / not done

**Real model run is blocked by missing verified API access/free allowance evidence**, not by an engineering test failure. No relevant key/model/quota environment names were present on the final check; selected repo/config discovery likewise found no usable configuration. This is scoped evidence, not a statement that the entire machine has no credentials. No real model was probed/generated and **API spend was0 VND**. Keep keys private; configure them locally only after the exact API model and free quota are verified. Paid testing remains unauthorized.

No automatic approval/publication, main merge, push, branch deletion, dependency installation, user-data migration, legacy import/execution, reference-video reuse or artifact overwrite occurred. Test approval requests are disposable fixtures, not CEO business acceptance.

Main still points to f2d9034. The original checkout belongs to the concurrent Antigravity UI work (antigravity/ui-qa-v4 at9fba92f on final inspection); it was not switched or edited by this remediation. Both worktrees were clean before the final evidence-only commit. Review/integration against that separate UI work remains a later explicit action.

## Reviewable commits

- 82d94bf audit before implementation.
- d10f52f contracts and implementation plan.
- ed80109 six confirmed defect fixes.
- 57645fc gateway and persistent dispatch reservations.
- 6ad4307 sourced-brief slice, source QC, HTTP/crash tests and offline demo.
- d8b880b binary infrastructure design only.
- af2fd79 final review corrections and regressions.

The final evidence/report commit follows these; branch/worktree are preserved, with no PR publication or merge.
