# Văn Phòng AI Studio

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated by the user: Node >=22.13, built-in SQLite, dependency-free HTML/CSS/JavaScript. Design and stack choices are the implementer's decisions under the supplied master prompt.

## Product truth

A local, Vietnamese work environment in which a CEO submits a concrete goal and input, watches bounded specialist workflows execute, inspects artifacts and independent QC, then accepts or requests revision of the current result. The office metaphor is a way to understand the actual execution state; it is not a simulation of an autonomous company.

The primary user is the owner operating their own computer, usually at a desktop. A read-only session supports inspection without mutation. Vietnamese is the interface language; exact tool identifiers, provider/model provenance, error details and file hashes remain available where they support a decision.

## First useful loop

1. Sign in with a local admin or reader key.
2. Give the office a goal and the corresponding CSV, HTML or drafting context; a system check needs no additional data.
3. Inspect the assigned steps, dependencies, execution attempts and timestamped events.
4. Read the original saved input, produced files, QC evidence and explicit limitations.
5. Approve the current version or leave a revision instruction. Retrying preserves earlier attempts and artifacts.

CSV analysis, offline HTML auditing and local system checks use bounded deterministic tools. Text drafting requires an explicitly configured local model. Media rendering, advertising publication, external crawling and legacy web bridges are not assumed to work. Capabilities, provider availability, connectors and skills come from the current authenticated server state.

## Requirements and boundaries

- Keep the original material and older artifact versions. Treat legacy documents as unverified read-only references.
- No sample tasks, simulated live activity, made-up completion percentages, fabricated provider readiness or unsupported quality scores. CSV sample content is inserted only after the user clicks the labelled sample action.
- Tasks require version-bound CEO approval. QC is shown as evidence and individual dimensions, including unverified dimensions.
- Show errors from real APIs and make recovery possible through retry, a new task, reconnecting or provider inspection.
- No external assets, runtime dependencies or paid provider calls. Do not infer permission for a cloud provider from the presence of a skill.
- Use session cookies and CSRF on mutations. Never retain the access key in browser storage. Render all server/user input as text; a preview never executes HTML or Markdown.

## Design commitment

The user delegated design decisions and requested a real-feeling, lightweight 2.5D office. Use a warm-white, navy and restrained teal studio: an architectural floor, desks, seated staff, plant geometry, department zones and legible state labels. Preserve standard controls for operational tasks. Offer an equivalent personnel list, with the list selected initially on a narrow screen. Keep CEO input separate from the spatial canvas so work remains usable without navigating the scene.

## Success conditions

A new user can see what the office can actually execute, submit work, follow real steps, inspect the saved input and immutable output, and make an informed approval decision. The same information remains usable by keyboard and on a narrow viewport. No visual status may be more optimistic than the source state.
