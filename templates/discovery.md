---
id: discovery
version: 1
status: draft
approved_at:
depends_on: docs/input/
---

# Discovery: <product name>

> **Approve this if:** the competitors, the features users already expect (table stakes) and the positioning below describe the market this product enters. Every claim carries a source and an access date; read the "Table stakes: rulings" first, they need your answer.

Mode: full
<!-- full: 3-5 competitors. light: only when the inputs already contain a market analysis; then 1-5 competitors. workaround: internal tools with no competitor; the current way of working (a spreadsheet, email) is the competitor, list it plus any real product. -->

## Summary
<Half a page: who uses this, what they use today, what is common across competitors, what would make this product worth choosing. Each sentence that states a market fact cites a COMP-n or a source.>

## Competitors
<Real, currently available products. Level: direct, indirect, adjacent or substitute. Rate from reviews and the products' own pages, not marketing claims.>

| ID | Name | Level | URL | Accessed |
|----|------|-------|-----|----------|
| COMP-1 | <name> | direct | https://example.com | 2026-01-01 |

## Feature matrix
<One row per feature seen in any competitor. Each cell: rating (Strong, Adequate, Weak or Absent), then the source URL and ISO access date in parentheses. A feature is table stakes when it is present (not Absent) in at least 60% of the competitors; mark the last column "yes". Kano: must-be, performance or attractive.>

| Feature | Kano | COMP-1 | COMP-2 | COMP-3 | Table stakes |
|---------|------|--------|--------|--------|--------------|
| MKT-FEAT-1 <name> | must-be | Strong (https://example.com/features, 2026-01-01) | Adequate (https://example.org/help, 2026-01-01) | Absent (https://example.net/pricing, 2026-01-01) | yes |

## Table stakes: rulings
<One line per table-stakes feature. The ruling is the user's: in scope, later (P2 or P3) or dropped. `pending` blocks approval.>
- MKT-FEAT-1 <name>: ruling: pending

## Personas
<At most four. Each is used by at least one job below.>
- **PER-1 <name>:** <role and context; top three pains; top three gains>. Source: <input sentence or cited page>.

## Jobs
<Job: verb + object + context. Outcome: "Minimize the time, likelihood or effort ...".>
- **JOB-1 (PER-1):** <verb object in context>. Outcome: Minimize the time it takes to <...>. Source: <...>.

## Positioning
- **For** <target customer>
- **who** <statement of the need or opportunity>
- **the** <product name> **is a** <product category>
- **that** <key benefit or reason to buy>
- **Unlike** <primary competitor>,
- **our product** <primary differentiation>

## Differentiators
<What this product does better or differently, each backed by two independent sources, or marked as a hypothesis.>
- <differentiator> (sources: <url>, <url>)

## Sources and freshness
<Every URL cited, with access date. Features and pricing within 90 days, sentiment within 12 months. Research rules: no market fact from model memory alone; a claim is a sentence with a source; the project's own files are never evidence about competitors.>

## Assumptions
<IDs; full entries in .itqan/ASSUMPTIONS.md.>

## Open questions
<Empty before approval. Mark gaps inline as [NEEDS CLARIFICATION: question].>
