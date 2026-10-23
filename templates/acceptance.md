---
id: acceptance
version: 1
status: draft
approved_at:
depends_on: docs/04-plan.md
---

# Acceptance Report: <product name>

> **Approve this if:** every criterion you care about is PASS with evidence, the known gaps are acceptable, and the app runs for you with the command below.

## Scale
<The scale this product was built at and what it does not include, e.g. "Demo. Not included: security and performance targets, per-task review, exploratory testing." Full product: "Full product.">

## How to run it
<Exact commands, URL, sample accounts or seed data; the same as app/README.md.>

## Try it
<Lite scales: three to six numbered steps that show the main path, so a reader can see it working in two minutes.>

## Results by acceptance criterion
<One line per AC, in order:>
- AC-01.1 PASS. Evidence: `<test name>` in `<test file>`; `<command>` -> <result>
- AC-01.2 FAIL. Known gap: <what fails and why; follow-up>

## Non-functional requirements
- NFR-01 PASS. Evidence: <measurement and how it was taken>

## Design quality
- UI scan: <PASS/FAIL per screen and role; attach the output>
- Worst-case data pass: <findings by severity and what was fixed; Fragile items left as known gaps>
- Design critique of built screens: <design-critic scores per dimension, final round; differences from the mockups>

## Browser and device matrix
<Each browser/device from the Constitution: tested / not tested, with the reason.>

## Test summary
<Totals per level, the exact commands and their output summary. No skipped or deleted tests; list any that were changed and why.>

## Known gaps and follow-ups
<Everything not done or not verified.>
