---
id: product-spec
version: 1
status: draft
approved_at:
depends_on: docs/00-constitution.md
---

# Product Spec: <product name>

> **Approve this if:** the summary is the product you want and the decisions on the review card (`itq.mjs card 1`) are acceptable. Read the card first; the rest is detail.

## Summary
<Half a page at most: problem, users, the features in one line each, what is out of scope. Written for a human reviewer.>

**Based on:** <BRD | Vision | both> (`docs/input/...`). **Governing source:** <ruling, or n/a>.

## Goals and success measures
- **G-01 <goal>:** measured by <metric with a number and how it is read, e.g. "90% of shifts fully staffed 48 h before start, from the monthly report">.

## Clarifications
<One line per answered question, written by the clarify step: `- Q: <question> -> A: <answer> (<who decided: user | default A-n>) (<date>)`. Mark questions whose cheaper answer would remove an expected capability with [scope-cut].>

## Glossary
| Term | Meaning |
|------|---------|
| <Term> | <Definition. One term per concept; the same word is used on every screen, message and test.> |

## Roles and permissions
- **<Role>:** <who, what they need>

| Action | <Role A> | <Role B> | Visitor |
|--------|----------|----------|---------|
| <verb + object, e.g. "assign a member to a plot"> | yes | no | no |

## Lifecycle
<Every entity users create or manage, and every role that can be granted. A cell is an AC id, "proposed (US-n)", or "out of scope (confirmed by user)". A professional product lets people fix mistakes: editing, cancelling and undoing are expected unless the user explicitly ruled them out.>

| Entity | Create | View | Edit | Cancel or delete | Undo or restore |
|--------|--------|------|------|------------------|-----------------|
| <Shift> | AC-03.1 | AC-04.1 | AC-03.4 | AC-03.6 | proposed (US-14) |

| Role or status | Grant | Revoke |
|----------------|-------|--------|
| <Shift lead> | AC-02.2 | AC-02.5 |

## Interpretations
<Every phrase in the inputs that could reasonably mean more than one thing (who can do what, how entities relate, what a vague word like "manage" or "a few days" includes). One line each: the phrase, the readings, the reading chosen, and whether the user confirmed it or it is assumption A-n.>
- "<phrase from input>": <reading 1> / <reading 2>. Chosen: <reading> (<confirmed by user | A-n>).

## Scope
**In scope:** <list of FEAT-n titles>
**Out of scope:** <non-goals stated in the inputs or confirmed by the user; never a capability cut by default>

## Features

### FEAT-01 <Feature name>
<One or two sentences.> Source: <input file and sentence, or user answer>.

#### US-01 <Story title>
As a <role>, I want <capability> so that <benefit>.
Priority: P1 | P2 | P3 | proposed. Source: <input reference, clarification, or A-n if only an assumption>.
Independent test: <how this story alone can be demonstrated>.

##### AC-01.1 <Short criterion name>
WHEN <trigger>, THE SYSTEM SHALL <observable response>.
Example: <concrete input> -> <concrete expected result, using the copy deck's message key where a message is shown, e.g. MSG.SIGNUP_DONE>.

##### AC-01.2 <Unwanted-behaviour criterion>
IF <unwanted condition>, THEN THE SYSTEM SHALL <response>.
Example: <...>

<EARS patterns: "THE SYSTEM SHALL ..." (always) · "WHEN <event>, ..." · "WHILE <state>, ..." · "IF <condition>, THEN ..." · "WHERE <feature is present>, ...". One observable behaviour per criterion. Number criteria in the order they appear: US-03 has AC-03.1, AC-03.2, ... top to bottom.>

## Edge cases
<Sweep every category below against the features. Each relevant rule becomes an IF ... THEN acceptance criterion under its story; write the AC id here. Write "n/a: <reason>" for a category that does not apply.>
- **Dates and times:** past or future dates, start after end, ranges and limits, time zone, display with the year: <AC ids or n/a>
- **Quantities and text:** zero, negative, decimals, locale separators, the maximum length of every text field and the maximum of every count, duplicates, plurals: <...>
- **Permissions:** every action in the permissions table attempted by a role that may not do it: <...>
- **State changes:** actions in the wrong order or state: <...>
- **Multiple users:** another user changed the data meanwhile; stale screens; two users taking the last spot: <...>
- **Notifications:** every party affected by a change learns about it (in the app at least): <...>
- **Undo and recovery:** fixing, cancelling or reversing a mistake: <...>

## Non-functional requirements

### NFR-01 <Name>
THE SYSTEM SHALL <quality>.
Measure: <number and unit>.
Verify: <how: automated test, axe scan, load test>.

## Later
<Required at the MVP scale, optional elsewhere: stories worth having that the scale's story cap leaves out, one line each, no IDs, so nothing is dropped silently. The user can promote an item by raising the scale or asking.>

## Proposed additions
<Every story or criterion with priority "proposed", one line each. "None" if none.>

## Assumptions
<IDs and one line each; full entries, with their consequence, in .itqan/ASSUMPTIONS.md.>

## Open questions
<Must be empty before approval. While drafting, mark gaps inline as [NEEDS CLARIFICATION: question], which blocks approval.>
