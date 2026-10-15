---
name: ux-spec
description: Stage 2 of Itqan. Produces the best UX and visual design the product can have, before any architecture. Researches and chooses a design system, sets an art-directed visual direction grounded in the product's subject, writes the screen inventory (SCR-n) with data, actions and all four states, design tokens in W3C format, high-fidelity mockups of the key screens and wireframes for the rest, and runs design-critic rounds and a best-practice check. Use when Itqan reaches stage 2 or the user asks for UX, UI, visual design, screens, mockups or wireframes.
---

# Stage 2: UX Spec (UX and visual design)

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Templates: `${CLAUDE_PLUGIN_ROOT}/templates/ux-spec.md` and `${CLAUDE_PLUGIN_ROOT}/templates/tokens.json`. Inputs: the Product Spec and the Constitution. UX comes before the Technical Design so that screens decide what data the system must provide. The goal is the best outcome a strong product designer would deliver: usable, accessible and visually distinctive.

## 1. Research
Dispatch the `itqan:design-researcher` agent (foreground) with the product type, platform, roles and key tasks. It returns two or three candidate design systems and layout patterns with cited sources. If web research is unavailable, say so and label the choice "not researched". Record the design-system decision in "## Design system". A conflict with the Constitution (platform, stack) is raised as a question, never switched silently.

## 2. Mode
Name the mode of each surface (adapted from Impeccable, see NOTICES.md): **Operate** (the user completes tasks: app screens, dashboards, settings), **Persuade** (the visitor decides and acts: a landing or marketing page), **Read** (docs, help) or **Experience** (portfolio, gallery). Most Itqan products are Operate; a public home page is Persuade. For Operate surfaces read `${CLAUDE_PLUGIN_ROOT}/vendor/impeccable/operate.md`: familiarity and consistency come first, and character lives in precise details.

## 3. Visual direction (art direction)
Read `${CLAUDE_PLUGIN_ROOT}/vendor/frontend-design/frontend-design.md` (vendored from Anthropic) and follow its two-pass process, grounded in this product:
1. **Subject inventory:** 6-10 things that belong to this product's world and its users (their place, materials, rituals, vocabulary, the printed things of their work). Distinctive choices come from here, not from the category.
2. **Design plan:** palette as 4-6 named hex values with roles (ground, surface, ink, accent, semantic colours), typefaces and their roles with a type scale, a layout concept (one sentence plus ASCII sketches of two alternatives, with the choice), the one signature element where the boldness is spent, and 3-5 principles.
3. **Review against generic defaults:** compare the plan with the generic-default list in frontend-design.md and the refusals in `${CLAUDE_PLUGIN_ROOT}/vendor/impeccable/craft-floor.md`. Revise anything that reads as a default rather than a choice for this product, and record what you changed and why.
4. Write the result to "## Visual direction" and the tokens (colour, type, space, radius, shadow, motion durations) to `docs/02-ux/tokens.json`. Check every text/background pair for WCAG 2.2 AA contrast (4.5:1, 3:1 for large text) and record the ratios.

## 4. Screens
One SCR-n block per screen with: purpose, the AC ids it serves, every field it shows (glossary terms), every action and the AC it satisfies, and the Empty, Loading, Error and Success states. List criteria with no screen under "Non-UI acceptance criteria". Every AC must appear somewhere.

## 5. Mockups and wireframes
- **High-fidelity mockups** of every screen that serves a P1 story, built with the real tokens, real copy and realistic data, at desktop and phone width, saved as HTML in `docs/02-ux/mockups/` (one file per screen, named by SCR id). In an interactive session also publish them as a Claude Artifact (a Design canvas, one artboard per screen labelled with its SCR id and AC ids) and give the user the link.
- **Wireframes** for the remaining screens in `docs/02-ux/wireframes/`.
- Show states that matter (empty, error) for the key screens, not only the happy path.

## 6. Design critique
Screenshot every mockup at 1440 px and 390 px wide (any browser tool: the built-in browser, or `npx playwright screenshot --viewport-size "390,844" <file-url> <png>`). Dispatch the `itqan:design-critic` agent (foreground) with the screenshots, the Visual direction and the tokens. Fix its top fixes and re-run once. Stop after two rounds; record the final scores in the UX Spec. Every dimension must reach 4 or more, or the gap is recorded and shown to the user at approval.

## 7. Best-practice check
Per screen, check against the pinned Web Interface Guidelines (`${CLAUDE_PLUGIN_ROOT}/vendor/web-interface-guidelines/guidelines.md`) and the ten questions in [heuristics.md](heuristics.md), plus WCAG 2.2 AA, responsive sizes from the Constitution and all four states. Write the screen-level requirements these imply into each SCR block (e.g. "destructive actions ask for confirmation", "all form errors shown at once next to their fields", "counts use correct plurals"), so the build implements them. Report pass or issue per screen.

Gate: `itq.mjs check 2` passes (visual direction with a palette and type, mockups present, four states per screen, every AC reachable, valid tokens, design system section), the review is clean, the design critique is recorded, and the user approves the direction and mockups.
