---
id: constitution
version: 1
status: draft
approved_at:
depends_on: docs/00-discovery.md
---

# Constitution: <product name>

> **Approve this if:** the quality bar, constraints and boundaries below are what every later document and the build must obey. Nothing here describes features.

## Product in one paragraph
<What it is, for whom, and the one outcome that matters. From the inputs only.>

## Principles
<3-5 ranked principles that break ties. Each is a MUST or SHOULD rule with a one-line reason, so later stages can be checked against it. Example:>
1. **P1 Correctness first.** The app MUST refuse any action that breaks a stated rule, server-side. Reason: users rely on limits being enforced.
2. **P2 Simple over clever.** The design SHOULD use the fewest moving parts that meet the requirements. Reason: a small team maintains it.

## Quality bar
- **Accessibility:** <e.g. WCAG 2.2 AA on all screens; target size at least 24x24 px>
- **Testing:** <e.g. every acceptance criterion has an automated test named with its ID; no skipped tests>
- **Performance:** <measurable target, e.g. "p95 page load < 2 s on broadband">
- **Browsers / devices:** <the matrix the Acceptance Report must cover>
- **Security and privacy:** <baseline, e.g. OWASP ASVS 5.0 Level 1; hashed passwords, no secrets in the repo, minimal personal data>

## Quality-attribute scenarios
<One or more per ISO/IEC 25010 characteristic that matters for this product (Functional suitability, Performance efficiency, Compatibility, Interaction capability, Reliability, Security, Maintainability, Flexibility, Safety). One line each. The Technical Design gives each a tactic and a way to verify it, and Acceptance measures it.>
- QAS-1 (Performance efficiency): Source: a volunteer on a phone; Stimulus: opens the shift list with 500 shifts; Response: the list is usable; Measure: LCP under 2.5 s and API p95 under 300 ms.

## Characteristics out of scope
<Every ISO 25010 characteristic that has no scenario above, with a reason. A characteristic neither here nor above fails the score.>
- Flexibility: out of scope because the product has one deployment and no plug-ins.

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
<Only non-goals the inputs state in their own words, quoted. Do not rule out features here (notifications, editing, reports...); scope is decided with the user in the Product Spec. "None stated" if the inputs state none.>

## Amendments
<Empty at first approval. When the Constitution is reopened, add one line per change: version, date, what changed, why, and which later stages must be re-checked.>
