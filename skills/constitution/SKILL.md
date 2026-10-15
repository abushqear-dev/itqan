---
name: constitution
description: Stage 0 of Itqan. Writes the Constitution (docs/00-constitution.md), the product's principles, quality bar, constraints and agent boundaries that every later stage must obey. Use when Itqan reaches stage 0 or the user wants to change the project's ground rules.
---

# Stage 0: Constitution

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/constitution.md`.

- Inputs: the recorded BRD and/or Vision and the ruling.
- This is the place to settle decisions that would otherwise be re-decided during the build: platform, stack preference (or "open"), the browser and device matrix, the accessibility level, the testing policy, performance targets, and the Always / Ask first / Never boundaries.
- Interview the user in one batch (at most eight questions) for what the inputs do not say. Offer a sensible default for each; the user can answer "you decide".
- Keep it to one page. No features: those belong in the Product Spec.
- Approval gate: `itq.mjs check 0` passes, the review is clean, and the user approves.
