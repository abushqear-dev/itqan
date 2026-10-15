---
name: build
description: Stage 5 of Itqan. Builds the product in app/ task by task from the approved plan, test-first, with a spec-compliance review and a commit after every task, resumable across sessions through .itqan/build-log.md. Runs locally only. Use when Itqan reaches stage 5 or the user asks to build or continue building.
---

# Stage 5: Build

Run `itq.mjs start 5` (skip if already drafting). The specs in `docs/` are read-only; `app/` is writable. Progress lives in `.itqan/build-log.md`.

## Resume first
Read `.itqan/build-log.md`. Continue with the first task in plan order that has no `done` line. A task marked `doing` without `done` was interrupted: check `git status` and its tests, then finish or redo it.

## For each task, in plan order (non-negotiable steps)
1. Append `T-nnn doing` to `.itqan/build-log.md`.
2. **Load a narrow context:** `app/CLAUDE.md`, the task block, the full text of the AC ids it covers, and only the slices of `api.yaml`, the data model and the SCR blocks named in its Contract line.
3. **Test first:** write the failing tests (names contain the AC ids), run them and see them fail.
4. **Implement** until they pass; run the task's Verify command and the full test suite.
5. **Spec-compliance review:** dispatch the `itqan:task-reviewer` agent (foreground) with the task block, its ACs, the contract slices and `git diff`. Fix every gap and re-review until COMPLIANT. This step is never skipped, whatever the budget.
6. **Commit** with the task id in the message, append `T-nnn done <short hash>` to the build log, run `itq.mjs trace`.

## Who implements
- Preferred: a fresh implementer subagent per task with only the narrow context above (if the Superpowers plugin is installed, `superpowers:subagent-driven-development` and `superpowers:test-driven-development`). Fresh context keeps quality high on long builds.
- When budget or turns are tight, implement in the main session instead, but keep steps 1-6 for every task. Never batch several tasks into one review or one commit, and never skip the review to save budget.
- Every three tasks, or before the session ends, run the full test suite and a code review (`/code-review` or a reviewer subagent) on the work since the last one; fix real issues only.

## Running out of budget or turns
Stop after the current task's step 6, not in the middle of one. Report which tasks are done and which remain. The next session resumes from the build log. Do not rush or merge tasks to finish in one session.

## Rules
- Implement exactly the contracts. A missing field, route, decision or version is an upstream gap: stop and use `itqan:upstream-change`. Do not invent it.
- Keep `app/README.md` (for humans) and `app/CLAUDE.md` (for the agent) accurate as the app grows.
- Never skip, delete or weaken a failing test. Never deploy.
- Show evidence, not claims: the commands you ran and their output.
- When all tasks are done, start the app with the Run command, confirm it serves, and hand over to `itqan:acceptance`.
