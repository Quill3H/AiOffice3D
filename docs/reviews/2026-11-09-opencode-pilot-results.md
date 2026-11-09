# OpenCode worker pilot results · 09/11/2026

Installed OpenCode Desktop and its bundled CLI both reported version 2.2.6. The installed catalog listed 11 Free models. AiOffice3D now has an opt-in opencode route and a pilot runner on the existing remediation branch. The worker uses [official OpenCode CLI automation](https://opencode.ai/docs/cli/#automation).

| Free model | Real result |
| --- | --- |
| GLM-5.3-Flash | HTTP 429 before and after the first reported reset |
| DeepSeek V4.1 Flash | HTTP 429 |
| MiMo V2.6 Flash | HTTP 429 |
| Flint 40B | HTTP 429 |
| Big Pickle | HTTP 429 through AiOffice3D Gateway and Engine |

All observed 429 errors were provider.free-limit. The first group returned nearly the same reset deadline, suggesting a shared limit. After that deadline, GLM was retried through the hardened adapter. OpenCode returned 2026-11-10T00:00:00.619Z, about 07:00 on 10/11/2026 in Vietnam. The retry created one failed manager reservation, zero output artifacts and no approval. The successful generation count is zero.

The first CLI launch used a flag position that left the custom agent unavailable. Moving standalone after the run subcommand and aligning PWD with the worker directory let the request reach the provider. This initial local failure is excluded from the model trial counts.

Independent review identified an inherited OpenCode config variable that could override the one-step limit. The adapter now supplies private config and verifies the actual source list before generation. Its environment retains the installed account and data profile. The hostile override and extra config source regressions went RED to GREEN. A config-only check against installed v2.2.6 returned the private config directory and the adapter document with steps=1.

The final full suite passed 95/95 with zero failures and skips. A real child-process fixture exercises manager planning, specialist handoff, QC, and AWAITING_APPROVAL with approval=null. After reopening the actual GLM quota workspace, the provider remained RATE_LIMITED. A new task showed BLOCKED with the quota reason and zero attempts. The dispatch ledger count stayed unchanged.

Real successful completion parsing and model output quality remain unverified because the installed provider returned 429. Provenance identifies the CLI-selected model. The pilot kept the calls on Free selections and used synthetic inputs. No credit or billing change was made. No successful call reported a cost.

The next trial can select another advertised Free model using STUDIO_OPENCODE_MODEL or the pilot runner's --model flag. The production route is opt-in and uses the existing default-zero dispatch cap. Configure a separate eligible provider if a fallback outside OpenCode is available. Keep CEO approval explicit.
