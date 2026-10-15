---
name: ux-spec
description: Stage 2 of Itqan. Researches and chooses a design system, then writes the UX Spec (docs/02-ux/), with navigation, a screen inventory (SCR-n) listing data, actions and all four states per screen, design tokens in W3C format, wireframes as a Claude Artifact, and a best-practice check. Use when Itqan reaches stage 2 or the user asks for UX, screens or wireframes.
---

# Stage 2: UX Spec

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Templates: `${CLAUDE_PLUGIN_ROOT}/templates/ux-spec.md` and `${CLAUDE_PLUGIN_ROOT}/templates/tokens.json`. Inputs: the Product Spec and the Constitution. UX comes before the Technical Design so that screens decide what data the system must provide.

1. **Research first.** Dispatch the `itqan:design-researcher` agent (foreground) with the product type, platform, roles and key tasks. It returns two or three candidate design systems and layout patterns with cited sources. If web research is unavailable, say so and label the choice "not researched".
2. **Choose.** Record the decision in "## Design system" with the reason. If the best choice conflicts with the Constitution (platform, stack), raise it as a question; do not switch silently. Write the chosen tokens to `docs/02-ux/tokens.json`.
3. **Screens.** One SCR-n block per screen with: purpose, the AC ids it serves, every field it shows (glossary terms), every action and the AC it satisfies, and the Empty, Loading, Error and Success states. List criteria with no screen under "Non-UI acceptance criteria". Every AC must appear somewhere.
4. **Wireframes.** Draw them as a Claude Artifact (a Design canvas with one artboard per screen, labelled with its SCR id and AC ids), or an HTML artifact page if Design is unavailable. Save an exported copy (HTML or PNG) in `docs/02-ux/wireframes/` so the build can read it. If artifacts are unavailable, save HTML wireframes locally and say so.
5. **Best-practice check.** Per screen, check against the pinned Web Interface Guidelines (`${CLAUDE_PLUGIN_ROOT}/vendor/web-interface-guidelines/guidelines.md`, vendored from Vercel, never fetched) and the ten questions in [heuristics.md](heuristics.md), plus WCAG 2.2 AA (contrast, visible focus, keyboard, labels, target size), responsive sizes from the Constitution and all four states. Write the screen-level requirements these imply into each SCR block (e.g. "destructive actions ask for confirmation", "all form errors shown at once next to their fields"), so the build implements them. Report pass or issue per screen.

Gate: `itq.mjs check 2` passes (four states per screen, every AC reachable, valid tokens, design system section), the review is clean, and the user approves.
