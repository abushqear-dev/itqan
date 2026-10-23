---
id: tech-design
version: 1
status: draft
approved_at:
depends_on: docs/02-ux/ux-spec.md, docs/00-constitution.md
---

# Technical Design (lite): <product name>

> **Approve this if:** the stack and the decisions in the ADRs are acceptable. The check verifies that `api.yaml` and the data model cover every screen and criterion.

## Overview
<Three sentences: the shape of the system and why.>

## Constitution check
<One line per MUST principle and quality-bar item: PASS or FAIL and how. A FAIL is fixed here or raised with the user.>
- P1 <principle>: PASS. <how>

## Values the spec did not set
<Every limit, rule or default this design had to choose that the specs do not state (a maximum length, a time zone, a retention period), one line each. "None" if none.>

## Stack
<Language, runtime, framework, database, test tools, each with a pinned version, e.g. "Node 24.1".>

## Components

### C-01 <Name>
- **Responsibility:** <one line>
- **Serves:** <US and AC ids>
- **Interfaces:** <operationIds, modules>

## Screen data
<One line per SCR-n, starting with its id: the operation that supplies each field and handles each action.>
- SCR-01 <name>: <operationId> -> <fields>

## Data
<Entities and relationships (Mermaid erDiagram); the exact schema is in `data-model.*`. Or "No persistent data".>

## Error model
<The error response shape with one example, the codes, and the copy-deck key each shows.>

## Security
<Short, concrete decisions, one bullet each: how users authenticate and how sessions end; authorisation per role enforced on the server for every route; input validation; password hashing and secrets handling; dependency pinning and audit; lockout or rate limiting on sign-in.>

## Run locally
<Exact commands: install, build, start, test, e2e; the URL and port.>

## Decisions
<ADR-0001 <title>, ... (at least one, for the stack).>
