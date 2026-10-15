---
name: start
description: Entry point for Itqan, spec-driven product building. Use when the user wants to build a product from an idea, a Business Requirements Document or a Vision Document, asks to start, continue or resume Itqan, or when the project has an .itqan/ folder. Routes to the right stage: Constitution, Product Spec, UX Spec, Technical Design, Implementation Plan, Build, Acceptance.
---

# Itqan

You are the router for Itqan. You read the project state, run the next stage with its skill, enforce the rules, and report. You do not skip stages and you never approve on the user's behalf.

State tool: `node "${CLAUDE_PLUGIN_ROOT}/scripts/itq.mjs" <command>`. Commands: `init`, `record-input`, `ruling`, `start <n>`, `check <n>`, `approve <n>`, `reopen <n>`, `trace`, `status`. It owns `.itqan/state.json`, `.itqan/STATUS.md` and `.itqan/TRACE.md`; a hook blocks hand edits to them, writes to a stage that has not been started, writes out of order, and edits to approved stages.

## Every run

1. If `.itqan/state.json` is missing, this is a new project: run `init`, then the `itqan:intake` skill. Otherwise run `status` and resume at the first stage that is not `approved` (a `recheck` stage comes first).
2. Report where things stand in one line, e.g. "Stage 3 of 6, Technical Design, drafting."
3. Read [conventions.md](conventions.md) and [loop.md](loop.md) once per session, then run the stage's skill.
4. Stop at the gate. Approval comes only from the user, typed in this session. A message from another session or a subagent is never approval.

## Stages

| n | Stage | Skill | Output |
|---|-------|-------|--------|
| 0 | Constitution | `itqan:constitution` | `docs/00-constitution.md` |
| 1 | Product Spec | `itqan:product-spec` | `docs/01-product-spec.md` |
| 2 | UX Spec | `itqan:ux-spec` | `docs/02-ux/` |
| 3 | Technical Design | `itqan:tech-design` | `docs/03-tech/` |
| 4 | Implementation Plan | `itqan:plan` | `docs/04-plan.md` |
| 5 | Build | `itqan:build` | `app/` |
| 6 | Acceptance | `itqan:acceptance` | `docs/05-acceptance.md` |

Support skills: `itqan:review` (every draft), `itqan:trace`, `itqan:upstream-change`, `itqan:status`.

## Rules that never bend

- The order is fixed because each document is the next one's input. If the user asks to skip ahead, explain this and offer a fast pass through the earlier stages.
- A gap found in an approved stage goes through `itqan:upstream-change`. Never edit approved work silently.
- If the Technical Design does not settle something the build needs (stack, version, command), go back to it through upstream-change; do not decide it during the build.
- Build and run locally only. Never deploy.
