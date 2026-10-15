---
name: review
description: Independent review of an Itqan document draft before the user sees it. Use after drafting or revising any stage document. Runs the automated stage check and the reviewer subagent in the foreground.
---

# Review a draft

1. **Automated check:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/itq.mjs" check <n>`. Fix every error first.
2. **Reviewer:** dispatch the `itqan:reviewer` agent in the foreground (`run_in_background: false`), so the report returns in this turn. Give it paths only, not your opinion: the draft, the stage brief, the stage's inputs, the Constitution, earlier approved documents, `.itqan/ASSUMPTIONS.md`. Ask it to flag only issues that affect correctness, completeness, testability or consistency with the inputs.
3. **Act.** Fix real issues. Check a finding against the sources before dismissing it. Findings that need information go to the user as questions.
4. **Re-review** after substantial changes. Stop when the check passes and the reviewer is CLEAN or only user questions remain. Do not chase style preferences; over-fixing adds bloat.

Never show the user a draft that has not passed this skill.
