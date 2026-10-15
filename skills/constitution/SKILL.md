---
name: constitution
description: Stage 0 of Itqan. Writes the Constitution (docs/00-constitution.md), the product's principles, quality bar, constraints and agent boundaries that every later stage must obey. Use when Itqan reaches stage 0 or the user wants to change the project's ground rules.
---

# Stage 0: Constitution

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/constitution.md`.

- Inputs: the recorded BRD and/or Vision and the ruling.
- This is the place to settle decisions that would otherwise be re-decided during the build: platform, stack preference (or "open"), the browser and device matrix, the accessibility level, the testing policy, performance targets, and the Always / Ask first / Never boundaries.
- Interview the user in one batch (at most eight questions) for what the inputs do not say. Offer a sensible default for each; the user can answer "you decide".
- Write each principle as a ranked MUST or SHOULD rule with a one-line reason (adapted from Spec Kit's constitution command, see NOTICES.md). MUST rules are checked in the Technical Design's "Constitution check".
- Keep it to one page. No features and no scope cuts: the out-of-scope list holds only non-goals quoted from the inputs. Everything else is decided with the user in the Product Spec.
- Every quality-bar target carries a number and a unit.
- On a reopen, bump the version and add a line under "## Amendments" saying what changed and which stages must be re-checked.
- Approval gate: `itq.mjs check 0` passes, the review is clean, and the user approves.
