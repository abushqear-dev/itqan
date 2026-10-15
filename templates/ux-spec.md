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
- **Wireframe:** <artifact link and the exported file in docs/02-ux/wireframes/>
- **Accessibility notes:** <focus order, labels, contrast-sensitive items>

## Non-UI acceptance criteria
<ACs with no screen (background jobs, emails, API-only rules), one line each with the reason.>

## Best-practice check
<Per screen: WCAG 2.2 AA (contrast, focus, keyboard, labels, target size), one primary action, consistent components and tokens, platform conventions, responsive sizes from the Constitution, all four states. Result: pass / issue.>
