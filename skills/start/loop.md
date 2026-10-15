# The document stage loop (stages 0-4)

1. **Start.** Run `itq.mjs start <n>`. The hook blocks writes to a stage that is not started.
2. **Load only what the stage needs.** Its direct input, the Constitution, and the IDs it must carry forward. Read earlier documents in full only when a question needs them.
3. **Write the stage brief** from `${CLAUDE_PLUGIN_ROOT}/templates/stage-brief.md` (half a page) and show it.
4. **Draft** from the stage's template. Fill every section; delete nothing. Mark real gaps `[NEEDS CLARIFICATION: ...]`.
5. **Ask once.** One numbered batch of questions: the question, why it matters, your suggested default. Fold the answers in and remove the markers.
6. **Check and review.** Run `itq.mjs check <n>` and fix every error. Then run the `itqan:review` skill (independent reviewer, foreground) and fix every real finding. Repeat until the check passes and the review is clean or only has user questions left.
7. **Ask for approval.** Run `itq.mjs card <n>` and show its output: reading time, scope-cuts awaiting the user's own answer, assumptions with their consequences for users, proposed additions and changes since the last approval (the plan adds its task table, acceptance its PASS/FAIL counts). Then show the "Approve this if" box and a short summary. Ask about each scope-cut on its own; "approve" or "use defaults" never settles one. On re-approval after a change, show only what changed. Ask: "Do you approve <document>? Reply approve, or tell me what to change."
8. **Hand off.** Only after the user's explicit approval in this session: run `itq.mjs approve <n>` (it re-runs the check and refuses on errors), set this stage's non-scope-cut assumptions to `accepted`, and say "Handing off to stage <n+1>: <name>".

If the user says "you decide" on a question, use your default and record it as an assumption. That never applies to approval, and never to a scope-cut: without the user's own answer, keep the capability as a P2 story.
