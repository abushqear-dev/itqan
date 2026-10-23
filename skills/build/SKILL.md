---
name: build
description: Stage 5 of Itqan. Builds the product in app/ task by task from the approved plan, test-first, with a spec-compliance review and a commit after every task, resumable across sessions through .itqan/build-log.md. Runs locally only. Use when Itqan reaches stage 5 or the user asks to build or continue building.
---

# Stage 5: Build

> **Scale.** Run `itq.mjs scale show` first. If this stage is `skip`, there is nothing to do here. If it is `lite`, follow [scales.md](../start/scales.md) for this stage in place of the parts of this skill it overrides (lite template, one round, bundled approval). If it is `full`, follow this skill as written.

Run `itq.mjs start 5` (skip if already drafting). The specs in `docs/` are read-only; `app/` is writable. Progress lives in `.itqan/build-log.md`.

## Resume first
Read `.itqan/build-log.md`. Continue with the first task in plan order that has no `done` line. A task marked `doing` without `done` was interrupted: check `git status` and its tests, then finish or redo it.

## For each task, in plan order (non-negotiable steps)
1. Append `T-nnn doing` to `.itqan/build-log.md`.
2. **Load a narrow context:** `app/CLAUDE.md`, the task block, the full text of the AC ids it covers, and only the slices of `api.yaml`, the data model and the SCR blocks named in its Contract line.
3. **Test first:** write the failing tests (names contain the AC ids), run them and see them fail.
4. **Implement** until they pass; run the task's Verify command and the full test suite.
5. **Spec-compliance review:** dispatch the `itqan:task-reviewer` agent (foreground) with the task block, its ACs, the contract slices and `git diff`. Fix every gap and re-review until COMPLIANT. This step is never skipped, whatever the budget.
6. **Commit** this task alone, with the task id in the message. Append to the build log, in this order: `T-nnn verify: <the Verify command as run> -> <its result>`, `T-nnn reviewed COMPLIANT`, `T-nnn done <short hash>`. Then run `itq.mjs trace`. `itq.mjs check 5` verifies that every task has these lines and its own commit whose message names it.

## Who implements
- Preferred: a fresh implementer subagent per task, briefed with [implementer-prompt.md](implementer-prompt.md) and only the narrow context above. Fresh context keeps quality high on long builds. Treat its report as claims: check the commit and the test output before step 5.
- Test-first rules: `${CLAUDE_PLUGIN_ROOT}/vendor/superpowers/test-driven-development.md` and `writing-good-tests.md` (vendored from Superpowers, pinned).
- Before any claim that a task, the suite or the build passes: `${CLAUDE_PLUGIN_ROOT}/vendor/superpowers/verification-before-completion.md`. Evidence before claims, always.
- When budget or turns are tight, implement in the main session instead, but keep steps 1-6 for every task. Never batch several tasks into one review or one commit, and never skip the review to save budget.
- Every three tasks, or before the session ends, run the full test suite and a code review (`/code-review` or a reviewer subagent) on the work since the last one; fix real issues only.

## UI tasks
- Build each screen to match its mockup in `docs/02-ux/mockups/` (or wireframe), using only the tokens in `docs/02-ux/tokens.json` and the components of the chosen design system.
- Before any UI edit, read `${CLAUDE_PLUGIN_ROOT}/vendor/impeccable/craft-floor.md` (the quality floor and patterns to refuse), and for app screens `${CLAUDE_PLUGIN_ROOT}/vendor/impeccable/operate.md`. Follow the build, CSS and copy guidance in `${CLAUDE_PLUGIN_ROOT}/vendor/frontend-design/frontend-design.md`.
- Implement every state the SCR block names (empty, loading, error, success, hover, focus, disabled), all form errors at once, correct plurals and locale formatting for numbers and dates, and the theming of browser surfaces (focus ring, selection, numerals).
- When the task finishes a screen, screenshot it at 1440 and 390 px and compare with the mockup; fix visible differences that are not improvements before the review.

## Running out of budget or turns
Stop after the current task's step 6, not in the middle of one. Report which tasks are done and which remain. The next session resumes from the build log. Do not rush or merge tasks to finish in one session.

## Commands file
T-001 writes `.itqan/commands.json`: `{"install": "...", "test": "...", "e2e": "...", "start": "...", "url": "http://localhost:<port>"}` with the exact commands run from `app/`. `itq.mjs check 5` runs `install` and `test` and requires exit 0 with no skipped tests; the acceptance stage uses the rest. If a plan Verify command turns out to be malformed, run the corrected form, record both in the build log, and list it as a plan deviation in the Acceptance Report.

## Rules
- Implement exactly the contracts. A missing field, route, decision or version is an upstream gap: stop and use `itqan:upstream-change`. Do not invent it.
- Keep `app/README.md` (for humans) and `app/CLAUDE.md` (for the agent) accurate as the app grows.
- Never skip, delete or weaken a failing test. Never deploy.
- Show evidence, not claims: the commands you ran and their output.
- When all tasks are done, start the app with the Run command, confirm it serves, and hand over to `itqan:acceptance`.

## Health gate per task (v0.6)
After the tests pass and before the task commit, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/health.mjs" --app app --changed git:HEAD~1 --mode task --json` (coverage on changed files, mutation score on changed files, complexity, duplication, Semgrep, dependency audit). For tasks that touch screens also run `scripts/token-audit.mjs` and `scripts/fidelity.mjs` against the matching mockup, and `scripts/ui-scan.mjs --states`. Write the numbers to `.itqan/scores/5/values.json` (ids from `scorecards.json`: B-S1 coverage, B-S2 mutation, B-S3 complexity, B-S4 duplication, B-S5 token audit, B-S6 fidelity, B-S7 states) and run `itq.mjs score 5`. A failed gate means fixing the code; after three rounds the task is logged as blocked with its scorecard and the build moves to independent tasks. The task-reviewer reads this output instead of judging quality by eye.

**If Semgrep cannot run** (native Windows without Docker, or no network for the rule packs), `health.mjs` falls back to a reduced scan: `eslint-plugin-security` at error level on JavaScript files only. The output says `REDUCED` and `securityMode: "reduced"`. It still gates the task, but the Acceptance Report must say that the full OWASP scan did not run and which tool did; a reduced scan never counts as Semgrep. TypeScript-only changes get no reduced scan and the gate fails as unavailable.
