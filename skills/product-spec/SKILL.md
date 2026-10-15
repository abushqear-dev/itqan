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
- **Roles and permissions table.** One row per action, one column per role (plus visitor). Every relationship the inputs imply (e.g. "members share a plot") becomes an explicit action ("assign a member to a plot") with an owner.
- **Interpretations.** Before drafting stories, list every phrase in the inputs with more than one reasonable reading. Ask the user about each reading that changes scope or behaviour, in the same batch as the other questions. Record the chosen reading. A reading the user did not confirm is an assumption and any story resting on it is `proposed`.
- **Edge-case sweep.** Go through every category in the template's "Edge cases" section for every feature. Each relevant rule becomes an IF ... THEN criterion with an example (e.g. "IF a harvest date is in the future, THEN THE SYSTEM SHALL refuse it"). These are where implementations most often go wrong.
- **Glossary.** Define each domain term once; use it verbatim.
- **Gaps.** Mark them `[NEEDS CLARIFICATION: ...]` and ask; approval is blocked until none remain.
- **Size.** As short as the product allows. A short Vision gives a short spec.

Gate: `itq.mjs check 1` passes (EARS form, examples, measures, no clarification markers, no duplicate IDs), the review is clean, and the user approves. Approval freezes `docs/input/`.
