---
name: build
description: Stage 5 of Itqan. Builds the product in app/ task by task from the approved plan, test-first, with a fresh subagent per task, a spec-compliance review and a code review after each, and the trace regenerated as it goes. Runs locally only. Use when Itqan reaches stage 5 or the user asks to build or continue building.
---

# Stage 5: Build

Run `itq.mjs start 5`. The specs in `docs/` are read-only now; `app/` is writable.

If the Superpowers plugin is installed, use `superpowers:subagent-driven-development` for the task loop and `superpowers:test-driven-development` inside each task, with the rules below. Otherwise follow the loop below directly.

## For each task, in plan order
1. Append `T-nnn doing` to `.itqan/build-log.md` (progress lives there; the plan is locked).
2. **Dispatch one implementer subagent** with only: `app/CLAUDE.md`, the task block, the full text of the AC ids it covers, and the slices of `api.yaml`, the data model and the SCR blocks named in its Contract line. Not whole documents.
3. The implementer writes the failing tests first (names contain the AC ids), sees them fail, implements until they pass, runs the task's Verify command and the full test suite, and commits with the task id in the message.
4. **Spec-compliance review:** dispatch the `itqan:task-reviewer` agent with the task block, its ACs, the contract slices and the diff. It reports anything missing, anything beyond scope, and any criterion without a test. Fix and re-review until clean.
5. **Code review:** run a code review on the diff (the `/code-review` skill or a reviewer subagent): correctness, security, simplicity. Fix real issues only.
6. Append `T-nnn done <commit hash>` to `.itqan/build-log.md` and run `itq.mjs trace`.

## Rules
- Implement exactly the contracts. A missing field, route, decision or version is an upstream gap: stop and use `itqan:upstream-change`. Do not invent it.
- Never skip, delete or weaken a failing test to make it pass. Never deploy.
- Show evidence, not claims: the commands you ran and their output.
- When all tasks are done, start the app with the Run command, confirm it serves, and hand over to `itqan:acceptance`.
