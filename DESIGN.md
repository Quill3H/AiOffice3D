# Văn Phòng AI Studio — design system

Backend extension note (09 November 2026): gateway health can list local/Muse/Kimi; labels must say configured model rather than claim every AI call is local. The sourced_brief compose form and binary previews are deferred. Existing detail/history/source views can inspect API-created source tasks; no office-layout redesign belongs to this remediation.

## Direction and surface

The authenticated application is **Operate** mode. Its cultural reference is a quiet studio office in daylight: pale walls, neutral timber desks, navy structural edges, muted foliage and a calm working rhythm. The office itself is the main visual identity. Standard forms, task lanes, tables, timelines and native dialogs make the real work predictable.

The entry surface introduces local access and one first action. The office surface (`/#office`) pairs a spacious personnel floor with a narrow CEO desk. Work (`/#tasks`) has a four-stage board; results (`/#library`) use rows rather than a card grid; capabilities (`/#settings`) use a readable inventory. Detail and preview dialogs protect focused inspection and review.

## Tokens

Tokens are implemented in `public/style.css`.

| Token | Value | Purpose |
| --- | --- | --- |
| `--ink` | `#16313d` | Primary text |
| `--ink-soft` | `#465d66` | Supporting text |
| `--muted` | `#627078` | Metadata |
| `--paper` | `#f7f8f5` | Application ground |
| `--surface` | `#ffffff` | Work surfaces |
| `--surface-alt` | `#edf1ee` | Secondary ground |
| `--line` | `#dde4df` | Dividers |
| `--navy` | `#142e3a` | Sidebar, structural brand |
| `--teal` | `#176a61` | Primary action, selection |
| `--teal-dark` | `#11574f` | Primary hover |
| `--amber` / `--amber-light` | `#825711` / `#fff2d8` | Review, missing conditions, unverified |
| `--red` / `--red-light` | `#a23e38` / `#fbece8` | Execution or validation failure |
| `--radius` | `12px` | Major work surfaces |
| `--ease` | `cubic-bezier(.16,1,.3,1)` | Short feedback transitions |

Base type: 14px native system sans. Main heading: 1.85rem, 650 weight, −.035em tracking; section heading: 1.05rem, 650; body and labels: .8–.95rem. Use a fixed rem scale. Data and timestamps use tabular figures. Monospace is reserved for identifiers, raw source and artifact contents.

Spacing follows compact groups with generous separation: 7–11px within form controls, 18–24px between field groups, 25–32px between major regions. Buttons use 7–8px radii; status badges use 5px, not full pills. A surface has either a divider/border or elevation. The notice and native dialogs carry soft offset shadows.

## Office composition

The 2.5D scene uses authored CSS geometry, with no GPU canvas, image assets or 3D libraries. The floor and back wall share a shallow −8° skew. Desk planes, front depth, legs, monitors, chairs and abstract seated figures establish scale. Staff nameplates remain horizontal and readable. The three spatial rows represent creative/growth and operational/control zones; positions do not imply capability or workflow dependencies.

Each staff station is a real button with an accessible name and pressed state. Running activity is derived from the task's assigned running step; availability comes from the server catalog. A selected worker reveals their granted tools, mode, limitations and current tasks beside the composer. Decorative objects never represent work or progress.

The equivalent list shows the same personnel and opens the same detail. At 760px and below, the list is the initial view. The spatial scene remains available as a horizontally scrollable region; the whole page must not overflow.

## Operational components

- **CEO desk:** explicit task kind, goal and conditional CSV/HTML/context fields. Data remains empty until entered or until the clearly labelled sample button is clicked. A source selector appears for AI/auto work; unavailable providers remain labelled honestly.
- **Task board:** actual state lanes, completed-step counts, versions, timestamps and bounded error text. Clicking opens details. Search and state filtering are local views of the same state.
- **Task detail:** original input preview, dependency timeline, exact execution provenance, independent QC dimensions, artifacts from all attempts, timestamped history and current-version review actions. Review comments survive ordinary state refreshes. A changed version calls for another inspection.
- **Approval:** approve or request revision only for `AWAITING_APPROVAL`, bound to the displayed task version. A revision requires a written instruction. Retry, cancel and review obey server state and show real API errors.
- **Artifact rows:** name, originating task, artifact version, size, time, safe plaintext preview and authenticated download. SHA256 is visible in preview metadata. Never interpret HTML or Markdown from an artifact.
- **Inventory:** provider/model status, exact tools, agent limitations, connector status and skill metadata. Skill registration is not represented as execution authority.

## States and accessibility

Use visible focus rings in muted teal, native form elements and native modal dialogs. All controls have labels; icons are authored consistent SVG for navigation and search. Selection and errors also have text, rather than relying on color. The global live-region notice reports outcomes; form errors use alerts. Keyboard users can reach the main content through a skip link. Dialogs support Escape, close controls and focus restoration.

Loading is explicit and transient. Empty states explain the next useful action without seeding fake activity. Read-only sessions disable mutation controls and state why. SSE reconnects refresh state; a 15-second refresh also detects a silent stream while the app is visible. Snapshots use the server's numeric event revision to prevent an older HTTP response replacing a newer live update; equal revisions remain valid for provider-state changes. Access tokens are cleared after sign-in and never written to browser storage.

Only the small result notice enters with an authored motion. Other transitions are short state feedback. Respect `prefers-reduced-motion`. Selection, caret, scrollbars and tabular figures use the same palette.

## Responsive structure

- Above 1250px: full 210px sidebar, wide office and 296px CEO desk.
- 1050–1250px: compact 182px sidebar, slightly denser controls.
- Below 1050px: office above a two-column CEO/personnel desk.
- Below 760px: 68px icon navigation, single-column work, list-first office, full-width form and stacked task lanes.
- Below 440px: stacked metadata and inventory status, compact headings, preserved touch targets.

## Implementation boundary and verification

The interface uses only `public/index.html`, `public/style.css` and `public/app.js`; no remote fonts, script CDNs or dynamic HTML injection. All untrusted text uses DOM `textContent`. The active server owns authorization, workflow truth and artifact verification. Browser verification covers real login, execution, source and artifact inspection, review, reconnection and desktop/mobile layout; syntax checks alone do not establish visual acceptance.
