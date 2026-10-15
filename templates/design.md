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

## Stack
<Language, runtime, framework, database, test tools, each with a pinned version, e.g. "Node 24.1", "React 18.3". Each non-obvious choice links to an ADR.>

## Components

### C-01 <Component name>
- **Responsibility:** <one line>
- **Serves:** <US/AC ids>
- **Interfaces:** <operationIds in api.yaml, events, modules it calls>

## Screen data
<For every SCR-n in the UX Spec: which operation(s) supply each field and handle each action. Example: "SCR-02 Tool list: listTools (name, owner, status); requestLoan (Request button)".>

## Data
<Entities and relationships in a Mermaid erDiagram; the exact schema is in data-model.(sql|prisma|md). Or "No persistent data".>

## Error model
<Error response shape with one real example, error codes, and which field each validation error names.>

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
