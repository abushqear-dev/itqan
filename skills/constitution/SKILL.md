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

## Quality-attribute scenarios (v0.6)
- Inputs now include the approved Discovery (`docs/00-discovery.md`): read what comparable products offer before setting the quality bar.
- For every ISO/IEC 25010 characteristic that matters here (Functional suitability, Performance efficiency, Compatibility, Interaction capability, Reliability, Security, Maintainability, Flexibility, Safety) write at least one `QAS-n` line: Source, Stimulus, Response and a numeric Measure. A characteristic with no scenario goes under "Characteristics out of scope" with a reason.
- State the standards: WCAG 2.2 AA (target size 24x24 px), OWASP ASVS 5.0 Level 1, the browser/device matrix.
- Gate additions: `itq.mjs check 0` fails without QAS lines that carry a number, without the WCAG and ASVS levels, or without a browsers line. `itq.mjs score 0` then measures stage 0 (rubric R2-K judges whether each MUST principle can be checked).
