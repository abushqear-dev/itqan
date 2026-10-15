---
name: product-spec
description: Stage 1 of Itqan. Writes the Product Spec (docs/01-product-spec.md), with summary, clarifications, glossary, roles and permissions, interpretations, prioritised user stories with EARS acceptance criteria and examples, an edge-case sweep and measurable non-functional requirements. Use when Itqan reaches stage 1 or the user asks to write or revise the product requirements or stories.
---

# Stage 1: Product Spec

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/product-spec.md`. Inputs: the recorded inputs (read them in full) and the Constitution.

## Order of work
1. **Clarify first.** Follow [clarify.md](clarify.md): scan the ten categories, then ask one numbered batch of at most eight questions with a recommended answer each. Write the answers into `## Clarifications` and apply them.
2. **Roles and permissions.** One row per action, one column per role (plus visitor). Every relationship the inputs imply ("members share a plot") becomes an explicit action ("assign a member to a plot") with an owner.
3. **Interpretations.** Record the chosen reading of every input phrase with more than one reasonable reading, and whether the user confirmed it or it is assumption A-n.
4. **Features and stories.** Group stories under features (FEAT-n). Give each story a priority (P1 = on its own a usable first version, then P2, P3; `proposed` if it rests only on an assumption) and an "Independent test:" line saying how it can be checked on its own.
5. **Acceptance criteria.** EARS, numbered by story (AC-n.m), one observable behaviour each, with one concrete `Example:` (input -> expected result). Cover unwanted behaviour too (IF ... THEN): invalid input, missing permissions, conflicts.
6. **Edge-case sweep.** Every category in the template's "Edge cases" section, for every feature. Each relevant rule becomes an IF ... THEN criterion (e.g. "IF a harvest date is in the future, THEN THE SYSTEM SHALL refuse it").
7. **Measurable NFRs.** Each has `Measure:` and `Verify:`, with targets from the Constitution's quality bar.
8. **Self-check.** Answer every item in [requirements-checklist.md](requirements-checklist.md) for your draft and fix each "no". Then run `itqan:review`.

## Rules
- What and why only. No technology, no screens, no API.
- Every story names its source: an input sentence, a clarification, or an assumption. Do not add lifecycle, admin or edge features the inputs never imply unless marked `proposed`.
- Glossary terms are used verbatim everywhere.
- As short as the product allows. A short Vision gives a short spec.

Gate: `itq.mjs check 1` passes (EARS form, examples, priorities and independent tests, measures, required sections, no clarification markers, no duplicate IDs), the review is clean, and the user approves. Approval freezes `docs/input/`.
