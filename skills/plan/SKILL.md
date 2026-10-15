---
name: plan
description: Stage 4 of Itqan. Writes the Implementation Plan (docs/04-plan.md), ordered vertical-slice tasks (T-nnn) with the criteria they cover, dependencies, files, test-first steps and exact verify commands, starting with a walking skeleton. Use when Itqan reaches stage 4 or the user asks for an implementation plan or task breakdown.
---

# Stage 4: Implementation Plan

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/plan.md`. Inputs: the Technical Design (contracts, layout, run commands), the Product Spec criteria, the UX screens.

- **T-001 is the walking skeleton:** scaffold `app/` per the repository layout, write `app/CLAUDE.md` from `${CLAUDE_PLUGIN_ROOT}/templates/app-CLAUDE.md` (commands, layout, conventions, boundaries from the Constitution), set up the test runner and the run command, one passing smoke test.
- **Then one story per task**, as vertical slices (data, API, UI and tests together), ordered so each task builds on finished ones and the app runs after every task.
- **Each task:** Goal, Covers (AC ids), Depends, Files, Contract (operationIds, entities, SCR ids), Test first (test names containing AC ids), Verify (exact command and expected result), Status: todo.
- **Write for an engineer with no context.** Exact paths and commands, no "etc.".
- Every AC must be covered by at least one task.

Gate: `itq.mjs check 4` passes (every AC covered, fields present, valid dependencies, no cycles, T-001 skeleton). Show the user the task list in one screen; the user approves. This review should take minutes.
