# OpenCode worker pilot — 09 November 2026

CEO authorizes installed OpenCode integration and trying alternative Free models. Use official CLI automation v2.2.6, not direct Free API. Apply lean-build/TDD to one opt-in adapter and one Engine runner, no new dependency or UI rewrite.

Acceptance: explicit advertised Free model, private standalone process, one agent step, all tools/plugins/MCP/search denied; bounded time/output and cancellation; preserved NDJSON, quota/cost evidence and existing gateway dispatch cap; source workflow still ends at independent QC and CEO gate. CLI-selected identity is recorded separately from API-returned identity. Missing completion/cost or nonzero cost fails closed.

Files: src/opencode-worker.js, optional gateway-config route, execution provenance in source workflow, tests/opencode-worker.test.js with disposable real process fixtures, scripts/pilot-opencode.cjs and API/results docs. Keep Store/Engine unchanged.

Order: parser/process/quota regressions RED → minimal native spawn adapter → focused/full GREEN → explicitly labelled real pilot. Do not call a429 or protocol double successful live inference. No paid fallback, billing changes, account rotation, automatic quota retry or artifact overwrite. Try bounded Free candidates as CEO requests; if reset deadlines match, report a likely shared quota block.
