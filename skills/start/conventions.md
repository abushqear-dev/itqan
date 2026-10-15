# Itqan conventions

## Layout of a product project

```
docs/input/              BRD and/or Vision (frozen once the Product Spec is approved)
docs/00-constitution.md
docs/01-product-spec.md
docs/02-ux/              ux-spec.md, tokens.json, wireframes/
docs/03-tech/            design.md, api.yaml, data-model.*, adr/NNNN-title.md
docs/04-plan.md
docs/05-acceptance.md
.itqan/                  state.json, STATUS.md, TRACE.md (generated), ASSUMPTIONS.md
app/                     the product, with app/CLAUDE.md
```

Nothing else goes in the project root.

## IDs

- FEAT-01 feature, US-01 story, AC-01.1 acceptance criterion (numbered by its story), NFR-01 non-functional requirement.
- SCR-01 screen, C-01 component, an `operationId` per API operation, ADR-0001 decision, T-001 task, A-01 assumption.
- An ID is defined by putting it at the start of a heading (`##### AC-03.2 Reject long loans`). Everywhere else it is referenced, never redefined. IDs are never renumbered or reused once their stage is approved.
- Test names that prove a criterion contain its AC id. That is how the trace reaches the code.

## Voice
Plain and short, for a busy human reviewer and for an agent that will implement it literally. Active voice, everyday words, one idea per sentence. Say what the product does, not how impressive it is. No filler, no hedging, no marketing. Instructions borrowed from other projects (see NOTICES.md) are rewritten in this voice and Itqan's formats.

## Writing

- Requirements and criteria use EARS: THE SYSTEM SHALL / WHEN / WHILE / IF ... THEN / WHERE. One observable behaviour per criterion, with one concrete `Example:`.
- Use glossary terms verbatim. Do not introduce synonyms.
- Link, do not copy: refer to IDs and files instead of repeating their content.
- A gap you cannot resolve from the inputs is marked `[NEEDS CLARIFICATION: question]`. It blocks approval until the user answers. Use an assumption (A-n, recorded in `.itqan/ASSUMPTIONS.md`) only for small, low-risk details, and mark anything that rests only on an assumption as priority `proposed`.
- Every document starts with front matter and an "Approve this if" box. Keep the human summary to one page.

## Front matter

`id`, `version`, `status` (draft, approved, recheck), `approved_at`, `depends_on`. The state tool updates `status`, `approved_at` and `version`; do not edit them by hand.

## Assumptions

Status `open` while unanswered; after the user approves the document that contains it, set it to `accepted`. Use `confirmed` only when the user explicitly agreed to that assumption.
