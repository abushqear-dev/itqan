---
id: product-spec
version: 1
status: draft
approved_at:
depends_on: docs/00-constitution.md
---

# Product Spec: <product name>

> **Approve this if:** the summary describes the product you want, the features and stories are complete, every proposed addition is acceptable (or delete it), and the open questions are answered.

## Summary
<One page at most: problem, users, the features in one line each, what is out of scope. Written for a human reviewer.>

**Based on:** <BRD | Vision | both> (`docs/input/...`). **Governing source:** <ruling, or n/a>.

## Glossary
| Term | Meaning |
|------|---------|
| <Term> | <Definition. Use the term verbatim everywhere else.> |

## Roles and permissions
- **<Role>:** <who, what they need>

| Action | <Role A> | <Role B> | Visitor |
|--------|----------|----------|---------|
| <verb + object, e.g. "assign a member to a plot"> | yes | no | no |

## Interpretations
<Every phrase in the inputs that could reasonably mean more than one thing (who can do what, how entities relate, what a vague word like "manage" or "a few days" includes). One line each: the phrase, the readings, the reading chosen, and whether the user confirmed it or it is assumption A-n. Ask about any reading that changes scope. "None" only if the inputs are truly unambiguous.>
- "<phrase from input>": <reading 1> / <reading 2>. Chosen: <reading> (<confirmed by user | A-n>).

## Scope
**In scope:** <list of FEAT-n titles>
**Out of scope:** <explicit non-goals>

## Features

### FEAT-01 <Feature name>
<One or two sentences.> Source: <input file and sentence, or user answer>.

#### US-01 <Story title>
As a <role>, I want <capability> so that <benefit>.
Priority: must | should | proposed. Source: <input reference, or A-n if only an assumption>.

##### AC-01.1 <Short criterion name>
WHEN <trigger>, THE SYSTEM SHALL <observable response>.
Example: <concrete input> -> <concrete expected result>.

##### AC-01.2 <Unwanted-behaviour criterion>
IF <unwanted condition>, THEN THE SYSTEM SHALL <response>.
Example: <...>

<EARS patterns: "THE SYSTEM SHALL ..." (always) · "WHEN <event>, ..." · "WHILE <state>, ..." · "IF <condition>, THEN ..." · "WHERE <feature is present>, ...". One observable behaviour per criterion. AC numbers follow their story: US-03 has AC-03.1, AC-03.2, ...>

<Add a short "Flow:" list under a story only when its steps are not obvious.>

## Edge cases
<Sweep every category below against the features. Each relevant rule becomes an IF ... THEN acceptance criterion under its story; write the AC id here. Write "n/a: <reason>" for a category that does not apply.>
- **Dates and times:** past or future dates, start after end, ranges and limits, time zone, display with the year: <AC ids or n/a>
- **Quantities and text:** zero, negative, decimals, locale separators, maximum lengths, duplicates: <...>
- **Permissions:** every action in the permissions table attempted by a role that may not do it: <...>
- **State changes:** actions in the wrong order or state (e.g. hand over before the start date, cancel after completion): <...>
- **Multiple users:** another user changed the data meanwhile; stale screens; two users taking the last spot: <...>
- **Notifications:** every party affected by a change learns about it: <...>
- **Undo and recovery:** removing, deactivating or cancelling by mistake and getting it back: <...>

## Non-functional requirements

### NFR-01 <Name>
THE SYSTEM SHALL <quality>.
Measure: <number and unit>.
Verify: <how: automated test, axe scan, load test, manual check>.

## Proposed additions
<Every story or criterion with priority "proposed" (it rests only on an assumption), one line each, so the reviewer can accept or drop it. "None" if none.>

## Assumptions
<IDs and one line each; full entries in .itqan/ASSUMPTIONS.md.>

## Open questions
<Must be empty before approval. While drafting, mark gaps inline as [NEEDS CLARIFICATION: question], which blocks approval.>
