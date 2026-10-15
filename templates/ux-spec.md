---
id: ux-spec
version: 1
status: draft
approved_at:
depends_on: docs/01-product-spec.md
---

# UX Spec: <product name>

> **Approve this if:** the design system choice fits, every story can be done through the screens below, and the wireframes look right.

## Design system
**Research:** <2-3 candidate design systems / component libraries and layout patterns, each with cited sources, or "not researched" if web research was unavailable.>
**Decision:** <chosen system and layout, with the reason in 2-3 sentences. Tokens are in `tokens.json`.>
**Conflicts with the Constitution:** <none, or the conflict raised as a question>

## Visual direction
- **Mode:** <Operate | Persuade | Read | Experience, per surface>
- **Subject inventory:** <6-10 things from this product's world that the design draws on>
- **Palette:** <4-6 named hex values with roles, e.g. "Ground #F6F7F2, Ink #1B2620, Accent #0A7A5A (actions only), Warning #B85C00, Error #B3261E">
- **Type:** <faces and roles, the scale (sizes and line heights), why these faces>
- **Layout concept:** <one sentence; the two alternatives sketched and why this one>
- **Signature element:** <the one place the boldness is spent>
- **Principles:** <3-5 short rules for this product's look>
- **Default check:** <what in the first plan read as a generic default, and what replaced it>
- **Contrast:** <one line per text/background pair in exactly this form, so the check can recompute it: `Contrast: #1E2B24 on #F5F0E6 = 13.2` (add `large` after the ratio for text 24 px+ or 18.7 px bold)>
- **Design critique:** <final design-critic scores per dimension, and any accepted gaps>

## Data ranges
<Every value the screens render that can vary: its smallest and largest realistic value, where that limit comes from, and how the screen handles both ends. Reconcile with the Product Spec; a limit the spec does not set goes back to it as a question, never invented here.>

| Value | Min | Max | Source | Handling at the extremes |
|-------|-----|-----|--------|--------------------------|
| <spots per shift> | 1 | 100 | AC-03.2 | <meter shows squares up to 20, then "37 of 60" text> |

## Copy deck
The user-facing messages live in `docs/02-ux/copy.md` as keys (`MSG.SIGNUP_DONE: You are signed up for {shift}.`). Screens, the Technical Design's error model and the tests refer to the keys; the wording is written once.

## Navigation
<Information architecture: the screen map, as a Mermaid flowchart or a nested list.>

## Screens

### SCR-01 <Screen name>
- **Purpose:** <one line>
- **Serves:** <AC-01.1, AC-01.2, ...>
- **Shows:** <each field/data item, named with glossary terms; this list is what the API must provide>
- **Actions:** <control -> result -> AC id>
- **States:**
  - Empty: <what is shown with no data>
  - Loading: <...>
  - Error: <message and recovery for each failure>
  - Success: <confirmation after each action>
- **Mockup or wireframe:** <docs/02-ux/mockups/SCR-01.html for P1 screens, docs/02-ux/wireframes/ otherwise; artifact link if published>
- **Accessibility notes:** <focus order, labels, contrast-sensitive items>

## Non-UI acceptance criteria
<ACs with no screen (background jobs, emails, API-only rules), one line each with the reason.>

## Best-practice check
<Per screen: WCAG 2.2 AA (contrast, focus, keyboard, labels, target size), one primary action, consistent components and tokens, platform conventions, responsive sizes from the Constitution, all four states. Result: pass / issue.>
