# Binary artifact infrastructure — reviewed design, implementation deferred

This is Phase2 item D, not a claim that PNG/MP4 works today. Current runtime permits only md/json/txt/csv, max2MiB/file; QC reads UTF-8 and downloads as attachment. The sourced-brief slice needs only text. No media producer/decoder dependency or legacy video script is enabled.

## Contract and ownership

Future producer returns `{files:[{name,mime,content:Buffer|Uint8Array}]}` or an approved bounded stream. A dedicated `src/artifacts.js` owns byte validation, atomic quota reservation, private wx temp files, SHA-256, fsync, publication and registry; model/task input never controls paths, extension policy or destination. Engine retains task/attempt UUID/version, current-version CEO gate and old outputs. A single writer handles bytes exactly; workers receive bytes for format checks, not UTF-8 conversion. Do not use fs.copyFile or overwrite an existing final name.

Registry addition: `media:{format,validationStatus,validatorVersion,width?,height?,durationMs?,container?,videoCodec?,audioCodec?,limitations:[]}`. MIME is selected by validated format, not producer assertion. Expected response is 415 unsupported/invalid media, 413 byte/decoded-size limit, 409 integrity or version conflict. Internal producer format failure marks the attempt FAILED; QC content failure marks NEEDS_REVISION. Schema migration is additive and refuses future versions. Existing text rows remain valid.

## PNG vertical boundary

- File<=10MiB initially; decoded width/height<=8192 and total pixels<=16M. Exact PNG signature, IHDR length/type/CRC, chunk-length bounds, legal color/bit-depth, IDAT/IEND structure. Signature alone is insufficient.
- A real decoder must confirm decompression/scanline bounds and pixel validity in a deadline/memory-limited worker. Pick a decoder only with a documented reason Node native cannot provide it; get dependency approval when applicable. A header-only file cannot be labelled decoded/visually inspected.
- Registry validation status distinguishes STRUCTURAL_ONLY from DECODED and CONTENT_REVIEW_REQUIRED; a valid PNG is not proof of image quality, ownership or suitability.

## MP4 vertical boundary

- Initial file<=100MiB, duration<=10min, resolution<=3840x2160; limits remain configuration-controlled and must fit the workspace reservation cap (currently100MiB total). A realistic video quota change needs an explicit retention/storage decision.
- ISO BMFF box length/type/overflow, ftyp brand, moov/mdat structure and bounded track metadata checks. Approved ffprobe/decoder integration must validate container/streams/duration and decode samples under process/time/memory limits; never accept a shell command or decoder flags from a model.
- Streaming temp file, incremental digest and byte ceiling before registry publication; after crash leave reserved bytes/orphan files preserved for human recovery. No automatic cleanup/re-encode, playback or publication.

## API and files to change

`GET /api/artifacts/:id` remains authenticated attachment; optionally alias /download. Stream validated MIME with Content-Length, nosniff and attachment name from registry. Preview remains text/plain for text; a separate authenticated /preview route can serve only decoder-validated safe PNG/MP4 with restrictive CSP/range bounds after explicit preview design. Do not enable arbitrary image/svg+xml, HTML or producer-controlled inline MIME.

Modify src/engine.js (delegate publication/read; pass bytes to QC), src/store.js (media metadata/reservations), src/http.js (stream/range contract), src/work.js and src/qc.js (media rubric); add src/artifacts.js, isolated decoder worker and tests/artifacts.test.js + tests/media-http.test.js + a SIGKILL fixture. UI preview is a separate Antigravity-coordinated change.

## Regression and acceptance

Test valid PNG/MP4 bytes remain byte-identical and SHA matches after restart/download; forged MIME/extension/signature, malformed CRC/chunks/boxes, truncated stream, absurd dimensions, decompression bombs, symlinks/path escape, duplicate filenames, concurrent quota reservation, cancellation, request/decoder timeout, crash between fsync and registry, range abuse and hash mismatch. Never silently discard original bytes.

Acceptance requires byte/decoder/HTTP tests, real fixture decode, documented codec support, truthful structural vs content QC, explicit CEO approval and zero artifact overwrite. PNG can ship separately before MP4. None of these media acceptance checks was run in the current text-only slice.
