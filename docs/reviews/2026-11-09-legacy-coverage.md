# Static coverage and quarantined legacy code

Active first-party v4 modules, frontend, lifecycle scripts and all active tests were read; legacy first-party source below was additionally read as text only. No module import, legacy script/test execution, video download/render or extension installation occurred. A code manifest records paths, sizes and SHA-256; this is inventory evidence, not a proof of correctness.

| Files | Static findings / reuse boundary |
| --- | --- |
| tools/real_executor.js | Parent-directory writes at module load; shell interpolation of URL; fixed SEO/SRE/trading/content report claims; physical-file existence is treated as verified. Not imported by v4. Do not reuse executable code as a trusted producer; only manually reviewed schemas/content examples may inform future work. |
| tools/qc_auditor.js | Parent-directory writes at import, shell-based ffprobe/ffmpeg, file-ID-specific defects and unsupported visual quality scores. Not v4 independent QC. Codec/stream fields are useful requirements for the media design; old scoring/commands are not reused. |
| tools/video_scraper.py | Parent-directory creation at import, network/yt-dlp downloads, latest-file fallback can select old output. Static risk only, not reproduced by running it. Conflicts with the current original-video production boundary if used as an editing source. |
| tools/render_viral_video.py | Hardcoded old video as base/audio, ffmpeg -y and fixed output paths. Deliberately not enabled under original-video/no-overwrite rules. Existing-file modification was not attempted. |
| tools/chatgpt_bridge.user.js, tools/chatgpt_bridge_extension/{background,content,popup}.js | Old web automation, fixed localhost3333, DOM injection, polling and assistant-text heuristics; no authorized safe v4 pairing adapter. V4 legacy bridge stays DISABLED and authenticated legacy routes return410. No web subscription/API entitlement is inferred. |
| test_bridge_e2e.js, test_verification_suite.js | Old endpoints/port3333, direct imports with write side effects, report overwrite, synthetic boss approval and assumptions from v3. Excluded from npm test intentionally. Running these against real shared data would violate task boundaries. |
| start.sh, stop.sh, tools/lifecycle.js | Current wrappers delegate to exact process ownership checks; active lifecycle tests were run. |
| public/js/marked.min.js | Vendored marked15.0.12, MIT header,39903 bytes. Inventory/header checked; no manual third-party parser/security audit claimed. It is not imported by the frontend or served by the v4 static allowlist. |

Search for real_executor/qc_auditor/render_viral/video_scraper/marked in src, server.js and active public entry files returned no references. First-party legacy issues above are quarantined static observations; they are not promoted to reproduced P0/P1 v4 runtime defects. Reactivation would require a separate security, provenance, rights and migration review.
