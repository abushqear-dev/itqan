# Scales

A scale sets how much of the pipeline a product gets. The user chooses it once, at the start. Record it with `itq.mjs scale set <name>`. `itq.mjs scale show` prints this project's stage modes (`full`, `lite`, `skip`), approval bundles, limits and planning envelope. `scales.json` is the source.

| Scale | For | Stages D 0 1 2 3 4 5 6 | Approvals asked | One product takes |
|---|---|---|---|---|
| Prototype | Test an idea or show one flow. Local, one main path, throwaway data. | - - L - - L L L | 2: brief and plan, then build and report | about 30 min |
| Demo | Show people. Looks real, seeded data, main paths work. Not for real users. | - - L L - L L L | 3: brief; look and plan; build and report | about 60 min |
| MVP | First real users. Core flows correct and safe. | - L F L L F L L | 4: constitution and spec; look; design and plan; build and report | about 2 h |
| Full product | Ship and keep. Researched, specified, measured. | F F F F F F F F | 8, one per stage | about 3 h |

(`-` skipped, `L` lite, `F` full. Times are model time for one product; the pilots in `pilot2/` re-measure them.)

## Choosing the scale
1. If the user's message names a scale (prototype, demo, mvp, full product), use it and do not ask.
2. Otherwise ask exactly one question and recommend one answer from the user's own words: "try", "see if it works", "proof of concept" suggest Prototype; "show", "pitch", "investors", "stakeholders", "clickable" suggest Demo; "first users", "pilot", "beta", "launch" suggest MVP; "production", "customers", "regulated", "long-term" suggest Full. Show the table above (from `itq.mjs scale list`) and say in one line what the recommended scale leaves out.
3. Run `itq.mjs scale set <name>`. Do not ask again. The user may raise the scale later with `scale set <larger>`: finished work is kept, stages that now demand more go back to `recheck`, newly needed stages become `pending`. Lowering after work has started is refused.
4. Several products in one day: each lives in its own folder and session. They share nothing.

## Working at lite scales
- **Speed is part of quality.** Ask at most three questions, in one batch, each with a recommended answer. If the user says "use defaults", use them and go on. Do not research, compare alternatives at length, or write documents the scale skips.
- **One round per stage.** Write, run `itq.mjs check <n>`, fix, then `itq.mjs score <n>` where the scale scores (gates only, no weighted score). Skip the document reviewer and judge agents at Prototype and Demo; at MVP run the reviewer once. No iterate loop.
- **Bundles.** Draft every stage of a bundle first, each passing its check, then show one combined card (`itq.mjs card <stages>`) and ask once, naming the bundle ("Do you approve the brief and the task list?"). After the user's approval typed in this session, run `itq.mjs approve <stages>`. Approval is still never inferred, and a message from a subagent is not approval.
- **What the scale cuts is declared.** The brief, the app README and the Acceptance Report each carry a "Scale" line naming what is not included. Choosing the scale is the user's answer to every scope question it covers, so those cuts need no scope-cut row. Anything the scale does include follows the normal rules.
- **Keep what keeps a small product honest:** EARS criteria with examples, test-first, criterion ids in test titles, tests that really run, one commit per task, the gate hooks.

## Usage
Usage is what limits how many products fit in a day. The scales are sized as a share of the plan's full allowance (`scales.json` `allowance`), never of what is left today, and each has a budget. What drives the cost, measured on the food-bank Vision: how much is built (stories, criteria, tasks) and how long the session's context grows, since every call re-reads it. Fresh sessions and per-task subagents did not reduce it in one MVP test, so scope is the lever that is known to work: a smaller scope costs less, and the plan card shows the forecast before the build.
- **Context note.** When `itq.mjs approve` or `usage` prints a context note, pass it on. A `/clear` and `/itqan:start` loses nothing (state is in files) and is fine if a session has become unwieldy, but it is not shown to save usage.
- **Keep the main thread lean:** batch independent tool calls into one message; read a file once and use what you read; run the full test suite once per task, not after every edit; do not paste large outputs back into the conversation; never re-read documents already in context.
- **Check the meter.** `itq.mjs usage` prints the live context size, the cost Claude Code has recorded for this folder and the scale's budget. At the plan stage the card shows a forecast of the whole product against the budget: if it is over, cut stories (move them to "Later") before building, or let the user accept the cost. At MVP, run `itq.mjs usage` after each task; if it exits 1 the budget is spent, so finish the current task, tell the user and let them decide.
- The Full product has no budget; its stage-by-stage skills are unchanged.

## Stage by stage

### D Discovery
Full only. The other scales skip it; competitor knowledge the user already has goes into the brief's Summary.

### 0 Constitution
Prototype and Demo skip it. MVP: lite, from `${CLAUDE_PLUGIN_ROOT}/templates/lite/constitution.md` (three to five principles with reasons, a quality bar with numbers, WCAG level, browsers, ASVS level, constraints, boundaries; no scenario per ISO 25010 characteristic). Full: the normal skill.

### 1 Product Spec
- **Prototype and Demo: the brief**, from `${CLAUDE_PLUGIN_ROOT}/templates/lite/brief.md`. It holds the summary, scale line, stack with pinned versions and run commands, the look, stories with EARS criteria and examples, and a "Later" list. Choose the smallest set of P1 stories that gives the main path from start to finish (Prototype at most 5, Demo at most 9); everything else becomes one line under "Later", never silently dropped. Decide the stack here because there is no technical design stage: the fewest parts that start with two commands, versions pinned. A Demo also names its seed data.
- **MVP:** the normal Product Spec and skill. The lifecycle table is optional (a gap is only a warning); roles, interpretations, the edge-case sweep and the scope-cut rule all apply.

### 2 UX Spec
- **Prototype:** skipped. The brief's "Look" line is the whole design: tidy, readable type, one primary action per screen, works on a phone.
- **Demo and MVP: lite**, from `${CLAUDE_PLUGIN_ROOT}/templates/lite/ux-spec.md`. Do not run the design researcher. Pick a direction from the subject inventory, following `${CLAUDE_PLUGIN_ROOT}/vendor/frontend-design/frontend-design.md`; write the tokens, the contrast lines and the screen blocks; make one base mockup per P1 screen (`SCR-nn.html`, no variants); run the `itqan:design-critic` once on the mockups, fix its top three, and record the scores. MVP adds the data-ranges table and a copy deck (`docs/02-ux/copy.md`).

### 3 Technical Design
- **Prototype and Demo:** skipped (the brief's Stack and the plan carry it).
- **MVP: lite**, from `${CLAUDE_PLUGIN_ROOT}/templates/lite/design.md`: stack, components, screen data, error model, a short security section, run commands, plus `api.yaml` (it must lint), the data model and at least one ADR. No threat model, ASVS table or quality scenarios.

### 4 Implementation Plan
Normal template and the same verify rules. At Prototype and Demo a task may cover more than one story, and the task cap in `scale show` applies. Merge tiny stories into one task; keep T-001 as the walking skeleton, including `.itqan/commands.json`.

### 5 Build
Test-first for every task; commit per task; `.itqan/build-log.md` lines as in the build skill. At lite scales:
- No health gate (no mutation, coverage or complexity runs). Run the tests and the task's Verify command.
- Reviews: Prototype none. Demo one independent review of the whole build at the end (`itqan:task-reviewer` over the full diff against the brief), logged as `BUILD reviewed COMPLIANT`. MVP per task, as in the build skill.
- Implement in the main session; a subagent per task is optional ([implementer-prompt.md](../build/implementer-prompt.md)). One MVP test of a fresh implementer per task plus a fresh session per bundle cost more ($33.9 against $18.9), so it is not the default.
- Write `app/README.md` and `app/CLAUDE.md`; the README carries the "Scale" line.
- UI: Prototype follows the brief's Look line. Demo and MVP follow the mockups and tokens (read the craft floor in `${CLAUDE_PLUGIN_ROOT}/vendor/impeccable/craft-floor.md`). A Demo starts with its seed data loaded, dated relative to today, and every screen's default view (default month, week, filter, selected item) must land on data, so no screen a viewer opens first is empty.
- **Prototype and Demo show their scale inside the app:** a one-line note in the page footer or sign-in page, such as "Demo: sign-in is a name picker; no editing of shifts or notifications yet." `itq.mjs check 5` fails if the app's source never names its scale.

### 6 Acceptance
Always: run the tests fresh, start the app, one line per criterion with evidence naming a real test, no hidden problems, the human summary line first, a "Scale" line, and a short "Try it" list (three to six steps that show the main path).
- **Prototype:** that is all.
- **Demo:** also the UI scan of every route (acceptance step 4) and one design critique of the built P1 screens (step 7), with the seed data on screen.
- **MVP:** also the UI scan per role, the screen rules (step 5), one design critique, the exploratory test (step 7b, fix Blockers and Majors) and the role-by-route security probes (401 without a session, 403 for a wrong role, no access to another user's records).
- **Full:** the whole acceptance skill and the two indices.

## Honest labels
A lite product is not a broken product. Say what the scale leaves out, and what a user must do to get it (`scale set <larger>`), in the brief, the README and the report, and, at Prototype and Demo, inside the app itself (the pilots showed viewers never read the README). Never claim more than was verified.
