---
id: constitution
version: 1
status: draft
approved_at:
depends_on: docs/input/
---

# Constitution: <product name>

> **Approve this if:** the quality bar, constraints and boundaries below are what every later document and the build must obey. Nothing here describes features.

## Product in one paragraph
<What it is, for whom, and the one outcome that matters. From the inputs only.>

## Principles
<3-5 ranked principles that break ties, e.g. "1. Correctness over speed of delivery. 2. Simple over clever.">

## Quality bar
- **Accessibility:** <e.g. WCAG 2.2 AA on all screens>
- **Testing:** <e.g. every acceptance criterion has an automated test named with its ID; no skipped tests>
- **Performance:** <measurable target, e.g. "p95 page load < 2 s on broadband">
- **Browsers / devices:** <the matrix the Acceptance Report must cover>
- **Security and privacy:** <baseline, e.g. hashed passwords, no secrets in the repo, minimal personal data>

## Constraints
- **Platform:** <web / mobile / desktop / CLI>
- **Stack:** <preferred stack with versions, or "open: chosen in the Technical Design">
- **Hosting:** local only (never deployed by the agent).
- **Budget, deadline, legal:** <if any; else "none stated">

## Boundaries
- **Always:** <actions the agent takes without asking, e.g. run tests before marking a task done; commit per task>
- **Ask first:** <e.g. adding a dependency not named in the Technical Design; changing the data model; anything outside app/>
- **Never:** <e.g. deploy; commit secrets; delete or skip failing tests; edit approved documents>

## Out of scope for this product
<Hard non-goals from the inputs.>
