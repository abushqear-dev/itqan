---
id: tech-design
version: 1
status: draft
approved_at:
depends_on: docs/02-ux/ux-spec.md, docs/00-constitution.md
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

## Quality scenarios
<One line for each QAS-n in the Constitution: the design tactic that meets it and how it is verified (the tool and the threshold).>
- QAS-1: Tactic: server-side pagination and an index on shifts(start); Verify: Lighthouse CI and an API p95 test at 500 rows

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
<Authentication, authorisation rules per role, data protection, input validation. The ASVS 5.0 Level 1 decisions are in `asvs-l1.md` (create it with `itq.mjs asvs-init`): every row is applicable (mapped to an AC, task, threat or ADR) or N/A with a reason.>

## Threat model
<STRIDE per trust boundary. Method adapted from STRIDE-GPT (MIT, see NOTICES.md): list each trust boundary, consider all six categories for it, then one table row per threat with a mitigation linked to an AC, a task or an ADR.>

Boundaries:
- TB-1 Browser to API: S: THR-1; T: THR-2; R: n/a: no audit requirement in the spec; I: THR-3; D: n/a: single local user load; E: THR-4

| Threat | Boundary | Category | Description | Mitigation |
|---|---|---|---|---|
| THR-1 | TB-1 | S | A visitor calls an API route without a session | 401 on every route without a session; AC-02.3; T-004 |

## Architecture diagrams
<C4 context and container diagrams in Mermaid (C4Context and C4Container blocks). The containers match the Components below.>

## Testing strategy
<Test levels (unit, integration, end-to-end), tools, where tests live, and the naming rule: every test that proves a criterion has its AC id in the test name. State every threshold the Build and Acceptance stages use: line coverage on new code at least 80%, mutation score on changed files at least 60%, functions over cyclomatic complexity 10 or cognitive 15 at most 0, duplication on new code at most 3%, axe violations serious or critical 0, Lighthouse performance at least 90 with LCP at most 2.5 s and CLS at most 0.1, and the role-by-route security matrix (401 without a session, 403 for a wrong role) generated from the roles table.>

## Repository layout
<Folder tree of app/ with one line per folder.>

## Run locally
<Exact commands: install, build, start, test, e2e; the URL and port.>

## Decisions
<List of ADRs: ADR-0001 <title>, ...>
