---
name: product-spec
description: Stage 1 of Itqan. Writes the Product Spec (docs/01-product-spec.md), with summary, glossary, roles, scope, features, user stories with EARS acceptance criteria and examples, and measurable non-functional requirements. Use when Itqan reaches stage 1 or the user asks to write or revise the product requirements or stories.
---

# Stage 1: Product Spec

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/product-spec.md`. Inputs: the recorded inputs (read them in full) and the Constitution.

Content rules:
- **What and why only.** No technology, no screens, no API.
- **Features, stories, criteria.** Group stories under features (FEAT-n). Each story (US-n) has acceptance criteria numbered by the story (AC-n.m) in EARS, one observable behaviour each, with one concrete `Example:` (input -> expected result). Cover the unwanted behaviour too (IF ... THEN ...): invalid input, missing permissions, conflicts.
- **Traceable to the inputs.** Every story names its source: an input sentence, a user answer, or an assumption. A story or criterion that rests only on an assumption gets priority `proposed` and is listed under "Proposed additions". Do not add lifecycle, admin or edge features the inputs never imply unless marked `proposed`.
- **Measurable NFRs.** Each has `Measure:` and `Verify:`. Take targets from the Constitution's quality bar.
- **Glossary.** Define each domain term once; use it verbatim.
- **Gaps.** Mark them `[NEEDS CLARIFICATION: ...]` and ask; approval is blocked until none remain.
- **Size.** As short as the product allows. A short Vision gives a short spec.

Gate: `itq.mjs check 1` passes (EARS form, examples, measures, no clarification markers, no duplicate IDs), the review is clean, and the user approves. Approval freezes `docs/input/`.
