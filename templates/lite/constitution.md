---
id: constitution
version: 1
status: draft
approved_at:
---

# Constitution (lite): <product name>

> **Approve this if:** the quality bar, constraints and boundaries below are what the spec, the design and the build must obey. Nothing here describes features.

## Product in one paragraph
<What it is, for whom, and the one outcome that matters. From the inputs only.>

## Principles
1. **P1 <name>.** The app MUST <rule>. Reason: <one line>.
2. **P2 <name>.** The design SHOULD <rule>. Reason: <one line>.
3. **P3 <name>.** The app MUST <rule>. Reason: <one line>.

## Quality bar
- **Accessibility:** WCAG 2.2 AA on all screens
- **Testing:** every acceptance criterion has an automated test named with its ID; no skipped tests
- **Performance:** <a number and unit, e.g. "p95 page load < 2 s on broadband">
- **Browsers / devices:** <the matrix the Acceptance Report covers>
- **Security and privacy:** OWASP ASVS 5.0 Level 1; hashed passwords, no secrets in the repo, minimal personal data

## Constraints
- **Platform:** <web / mobile / desktop / CLI>
- **Stack:** <preferred stack with versions, or "open: chosen in the Technical Design">
- **Hosting:** local only (never deployed by the agent)
- **Budget, deadline, legal:** <if any; else "none stated">

## Boundaries
- **Always:** <e.g. run tests before marking a task done; commit per task>
- **Ask first:** <e.g. a dependency not named in the Technical Design; changing the data model>
- **Never:** <e.g. deploy; commit secrets; delete or skip failing tests; edit approved documents>

## Out of scope for this product
<Only non-goals the inputs state in their own words, quoted. "None stated" if none.>
