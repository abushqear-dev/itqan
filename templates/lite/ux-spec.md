---
id: ux-spec
version: 1
status: draft
approved_at:
depends_on: docs/01-product-spec.md
---

# UX Spec (lite): <product name>

> **Approve this if:** the look suits the product and the screens below cover every story. Mockups of the key screens are in `docs/02-ux/mockups/`.

## Design system
**Decision:** <chosen component approach and layout in two sentences; tokens are in `tokens.json`>

## Visual direction
- **Mode:** <Operate | Persuade | Read | Experience>
- **Subject inventory:** <6 things from this product's world that the design draws on>
- **Palette:** <4-6 named hex values with roles, e.g. "Ground #F6F7F2, Ink #1B2620, Accent #0A7A5A (actions only), Error #B3261E">
- **Type:** <faces, roles, and the scale (sizes and line heights)>
- **Signature element:** <the one place the boldness is spent>
- **Contrast:** <one line per text and background pair, exactly: `Contrast: #1E2B24 on #F5F0E6 = 13.2` (add `large` after the ratio for text 24 px or bigger)>
- **Design critique:** <one design-critic round on the mockups: scores per dimension, and the top fixes applied>

## Data ranges
<MVP only. Every value a screen shows that can vary: smallest and largest realistic value, where the limit comes from, how the screen handles both ends. A limit the spec does not set goes back to it as a question.>

| Value | Min | Max | Source | Handling at the extremes |
|-------|-----|-----|--------|--------------------------|
| <spots per shift> | 1 | 100 | AC-03.2 | <meter up to 20 squares, then "37 of 60"> |

## Copy deck
<MVP only. Messages live in `docs/02-ux/copy.md` as keys (`MSG.SIGNUP_DONE: You are signed up for {shift}.`); screens and tests refer to the keys.>

## Screens

### SCR-01 <Screen name>
- **Purpose:** <one line>
- **Serves:** <AC-01.1, AC-01.2>
- **Shows:** <every field, named with the brief's terms>
- **Actions:** <control -> result -> AC id>
- **States:** Empty: <...>. Loading: <...>. Error: <...>. Success: <...>.
- **Mockup:** <docs/02-ux/mockups/SCR-01.html for every screen that serves a P1 criterion>

## Non-UI acceptance criteria
<Criteria with no screen, one line each with the reason, or "none".>
