---
id: tech-design
version: 1
status: draft
approved_at:
depends_on: docs/02-ux/ux-spec.md
---

# Technical Design: <product name>

> **Approve this if:** the stack and the decisions in the ADRs are acceptable, and nothing below surprises you. You do not need to read `api.yaml` or the data model line by line; the automated check verifies they cover every screen and criterion.

## Overview
<Three to five sentences: the shape of the system and why.>

## Constitution check
<One line per MUST principle and quality-bar item in the Constitution: PASS or FAIL, and how this design meets it. A FAIL must be fixed here or raised with the user as an upstream change before approval.>
- P1 <principle>: PASS. <how>

## Values the spec did not set
<Every limit, rule or default this design had to choose that the Product Spec and UX Spec do not state (a maximum length, a range, a retention period, a time zone). One line each with the value and why. These are shown to the user on the review card; a value that changes what users can do goes back upstream as a question instead. "None" if none.>

## Unknowns researched
<Every technical question the requirements raised that needed research (a library's limits, a browser API, a date-handling rule), with the answer and its source. "None" if none.>

## Stack
<Language, runtime, framework, database, test tools, each with a pinned version, e.g. "Node 24.1", "React 18.3". Each non-obvious choice links to an ADR.>

## Components

### C-01 <Component name>
- **Responsibility:** <one line>
- **Serves:** <US/AC ids>
- **Interfaces:** <operationIds in api.yaml, events, modules it calls>

## Screen data
<One line per SCR-n in the UX Spec, starting with its id: which operation supplies each field the screen shows and which handles each action. Every field in the screen's "Shows" list appears here. Example: "- SCR-02 Tool list: listTools -> name, owner, status, free spots; requestLoan (Request button)".>

## Data
<Entities and relationships in a Mermaid erDiagram; the exact schema is in data-model.(sql|prisma|md). Or "No persistent data".>

## Error model
<Error response shape with one real example, error codes, the copy-deck key each code shows (MSG.*), and which field each validation error names. Refer to the keys; do not repeat the wording.>

## Security
<Authentication, authorisation rules per role, data protection, input validation.>

## Testing strategy
<Test levels (unit, integration, end-to-end), tools, where tests live, and the naming rule: every test that proves a criterion has its AC id in the test name.>

## Repository layout
<Folder tree of app/ with one line per folder.>

## Run locally
<Exact commands: install, build, start, test, e2e; the URL and port.>

## Decisions
<List of ADRs: ADR-0001 <title>, ...>
