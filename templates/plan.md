---
id: plan
version: 1
status: draft
approved_at:
depends_on: docs/03-tech/design.md
---

# Implementation Plan: <product name>

> **Approve this if:** the order makes sense and nothing is missing. Every acceptance criterion is covered by a task; the automated check verifies that.

## Milestones
<2-4 milestones, each ending with something runnable.>

## Tasks

### T-001 Walking skeleton
- **Goal:** scaffold app/ per the repository layout, write app/README.md (for humans, from templates/app-README.md), app/CLAUDE.md (for the agent) and `.itqan/commands.json` (install, test, e2e, start, url), set up the test runner and the run command, one passing smoke test.
- **Covers:** none
- **Depends:** none
- **Files:** <paths>
- **Test first:** <smoke test name>
- **Verify:** `<exact command>` -> <expected output>

## P1 stories

### T-002 [P] <One story, one vertical slice>
- **Goal:** <what exists when this is done>
- **Covers:** AC-01.1, AC-01.2
- **Depends:** T-001
- **Files:** <paths to create or change>
- **Contract:** <operationIds, entities, SCR ids this task touches>
- **Test first:** <test names, each containing its AC id>
- **Verify:** `<exact command>` -> <expected result>

<Group tasks under "## P1 stories", "## P2 stories", "## P3 stories" so the first group alone gives a usable app. Mark a task "[P]" in its heading only when it touches no file another unfinished task touches, so it can be built in parallel.>

<Rules: one story per task; tasks small enough for one focused session; dependencies form no cycle. Progress is not tracked here: the build records it in .itqan/build-log.md, because this plan is locked once approved.>
