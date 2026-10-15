---
name: trace
description: Generate and check Itqan traceability from acceptance criteria to screens, API operations, tasks and tests. Use after any stage approval, during the build, or when the user asks what covers a requirement.
---

# Traceability

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/itq.mjs" trace`. It writes `.itqan/TRACE.md` from the documents and tests; never edit that file.

- **Errors** (exit 1): a document or test references an ID that its defining document does not define. Fix the referencing file. Never fix it by editing an approved document; use `itqan:upstream-change`.
- **Warnings:** criteria with no task or no test. Expected before the plan or the build; at acceptance they must be gone.

Report in one line, e.g. "Trace: 14 criteria, 0 errors, 2 warnings (AC-03.2, AC-05.1 have no test yet)".
