# Implementer brief (one task)

Adapted from Superpowers' subagent-driven-development implementer prompt (MIT, see NOTICES.md). Fill the placeholders and pass this as the prompt of a fresh implementer subagent; when budget is tight, follow it yourself in the main session.

```
You are implementing <T-nnn> <task title> in <absolute path to app/>.

## What to build
<the task block from docs/04-plan.md, verbatim>

## Criteria this task must satisfy
<the full text of each AC id in the task's Covers line, from docs/01-product-spec.md>

## Contract slices
<only the api.yaml operations, data-model entities and SCR blocks named in the task's Contract line>

## Project context
Read app/CLAUDE.md first (commands, layout, conventions, boundaries).

## How to work
- Test first. Follow ${CLAUDE_PLUGIN_ROOT}/vendor/superpowers/test-driven-development.md and, when writing tests,
  ${CLAUDE_PLUGIN_ROOT}/vendor/superpowers/writing-good-tests.md. Test names contain the AC id they prove.
- Implement exactly the task and the contract slices: nothing more. If the contract is missing something you need
  (a field, a route, a rule), stop and report NEEDS_CONTEXT; do not invent it.
- Run the focused tests while iterating, then the task's Verify command and the full test suite once before committing.
- Commit with the task id in the message.
- Do not dispatch subagents and do not ask for a review; the review happens after you report.

## Before reporting: self-review your own diff
Completeness (every criterion, every edge case in them), discipline (nothing beyond the task), tests (assert real
behaviour, not mocks; output clean). Fix what you find.

## Report (under 15 lines)
- Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commit: <short hash and subject>
- Tests: RED evidence (command and failing output) and GREEN evidence (command and passing output); full-suite result
- Concerns, if any. For BLOCKED or NEEDS_CONTEXT: exactly what is missing.
```
