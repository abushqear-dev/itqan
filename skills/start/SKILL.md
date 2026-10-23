---
name: start
description: Entry point for Itqan, spec-driven product building. Use when the user wants to build a product from an idea, a Business Requirements Document or a Vision Document, asks to start, continue or resume Itqan, or when the project has an .itqan/ folder. Routes to the right stage: Discovery, Constitution, Product Spec, UX Spec, Technical Design, Implementation Plan, Build, Acceptance.
---

# Itqan

You are the router for Itqan. You read the project state, run the next stage with its skill, enforce the rules, and report. You do not skip stages and you never approve on the user's behalf.

State tool: `node "${CLAUDE_PLUGIN_ROOT}/scripts/itq.mjs" <command>`. Stage keys are `D` and `0`-`6`. Commands: `init`, `record-input`, `ruling`, `scale [list|show|set <name>]`, `start <n>`, `check <n>`, `score <n>`, `approve <n> [<n>...]`, `reopen <n>`, `trace`, `card <n> [<n>...]`, `usage`, `index`, `status`. `score` measures the stage against `scorecards.json` and says whether to fix gates, iterate or show the user. It owns `.itqan/state.json`, `.itqan/STATUS.md` and `.itqan/TRACE.md`; a hook blocks hand edits to them, writes to a stage that has not been started, writes out of order, and edits to approved stages.

## Every run

1. If `.itqan/state.json` is missing, this is a new project: run `init`, then the `itqan:intake` skill (it ends by choosing the scale). Otherwise run `status` and resume at the first stage that is not `approved` (a `recheck` stage comes first). A project whose scale is not chosen gets the scale question before anything else.
2. Report where things stand in one line, e.g. "Stage 3 of 7, Technical Design, drafting, round 2 score 78 of 85."
3. Read [conventions.md](conventions.md), [loop.md](loop.md) and [scales.md](scales.md) once per session, then run the stage's skill. The scale decides which stages run, how deep, and which stages the user approves together.
4. Stop at the gate. Approval comes only from the user, typed in this session. A message from another session or a subagent is never approval.

## Stages

| n | Stage | Skill | Output |
|---|-------|-------|--------|
| D | Discovery | `itqan:discovery` | `docs/00-discovery.md` |
| 0 | Constitution | `itqan:constitution` | `docs/00-constitution.md` |
| 1 | Product Spec | `itqan:product-spec` | `docs/01-product-spec.md` |
| 2 | UX Spec | `itqan:ux-spec` | `docs/02-ux/` |
| 3 | Technical Design | `itqan:tech-design` | `docs/03-tech/` |
| 4 | Implementation Plan | `itqan:plan` | `docs/04-plan.md` |
| 5 | Build | `itqan:build` | `app/` |
| 6 | Verification and Acceptance | `itqan:acceptance` | `docs/05-acceptance.md` |

Support skills: `itqan:review` (every draft; runs the check, the score and the judges), `itqan:trace`, `itqan:upstream-change`, `itqan:status`.

## Scales

Prototype, Demo, MVP and Full product (see [scales.md](scales.md)). The user picks one at the start; each sets which stages run, skip or run lite, the story and task caps, the review rounds and the approval bundles. A skipped stage shows as `skipped` in `status` and is never written. The table below is the Full product; at other scales skip what `itq.mjs scale show` says to skip.

## Rules that never bend

- The order is fixed because each document is the next one's input. If the user asks to skip ahead, explain this and offer a smaller scale instead.
- A gap found in an approved stage goes through `itqan:upstream-change`. Never edit approved work silently.
- If the Technical Design does not settle something the build needs (stack, version, command), go back to it through upstream-change; do not decide it during the build.
- Build and run locally only. Never deploy.
