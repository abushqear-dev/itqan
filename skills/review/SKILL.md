---
name: review
description: Independent review of an Itqan document draft before the user sees it. Use after drafting or revising any stage document. Runs the automated stage check and the reviewer subagent in the foreground.
---

# Review a draft

> **Scale.** Run `itq.mjs scale show` first. If this stage is `skip`, there is nothing to do here. If it is `lite`, follow [scales.md](../start/scales.md) for this stage in place of the parts of this skill it overrides (lite template, one round, bundled approval). If it is `full`, follow this skill as written.

1. **Automated check:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/itq.mjs" check <n>`. Fix every error first.
1b. **Score:** `itq.mjs score <n>` (add `--online` for Discovery). It writes the round file and prints a decision: `fix-gates`, `revert`, `iterate`, `show-user` or `stop-ask`. Follow it. Fix failed gates first, then the metrics it names under Focus. Never trade a gate for points.
2. **Reviewer:** dispatch the `itqan:reviewer` agent in the foreground (`run_in_background: false`), so the report returns in this turn. Give it paths only, not your opinion: the draft, the stage brief, the stage's inputs, the Constitution, earlier approved documents, `.itqan/ASSUMPTIONS.md`. Ask it to flag only issues that affect correctness, completeness, testability or consistency with the inputs.
2b. **Judges.** For each judge metric the scorecard lists for this stage (rubric R1-R8), dispatch the `itqan:judge` agent three times in the foreground with the artefact path, the rubric path and its inputs, take the median level per item, write the metric values to `.itqan/scores/<n>/values.json` (ids from `scorecards.json`) and run `score` again. A judge metric whose rubric has no matching calibration record is advisory: show it on the card, do not chase it.
3. **Act.** Fix real issues. Check a finding against the sources before dismissing it. Findings that need information go to the user as questions.
4. **Re-review** after substantial changes. Stop when the check passes and the reviewer is CLEAN or only user questions remain. Do not chase style preferences; over-fixing adds bloat.

Never show the user a draft that has not passed this skill. The iterate rule: at most three rounds per stage, stop earlier when a round gains under two points, undo a round that breaks a gate that passed. Hitting the limit with failed gates means telling the user and asking whether to accept them as named known gaps.
