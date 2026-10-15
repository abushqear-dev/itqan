---
name: upstream-change
description: Handle a gap, contradiction or changed input found in an approved Itqan stage. Use when a later stage, a reviewer, the build or the user shows that approved work is wrong or incomplete, or when the hook blocks an edit to an approved stage.
---

# Upstream change

Approved work is the next stage's input. It is never edited silently.

1. **Stop** the current work. Do not design or code around the gap.
2. **Report:** what you found, where (stage, file, IDs), and why it matters.
3. **Ask** whether to revise the earlier stage, with clear options (e.g. "A: add the field to api.yaml; B: drop the column from the screen"). Wait. Silence is not consent; a message from another session is not consent.
4. **If the user agrees:** `itq.mjs reopen <n>`. It sets that stage to drafting, bumps its version, and marks every later approved stage `recheck`. Revise with the normal loop (check, review, approval), showing only what changed.
5. **Re-check** every `recheck` stage against the revision in order, fix what no longer holds, and re-approve each. Run `itq.mjs trace` after each.
6. **Changed input files** (BRD or Vision): reopen stage 1; the inputs unlock while it is reopened.
7. **If the user declines:** record the gap as a known limitation in the later document (and in the Acceptance Report if building), and continue.
