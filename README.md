# Itqan (إتقان)

*Itqan* is Arabic for mastery: doing work with excellence and precision.

Itqan is a Claude Code plugin for spec-driven product building. It takes a product idea (a Business Requirements Document and/or a Vision Document) through a short set of approved specs to a tested product running locally. The specs are the only source of truth Claude uses while building.

## The pipeline

| Stage | Document | What it settles |
|---|---|---|
| Intake | `docs/input/` | The BRD and/or Vision, classified, with conflicts ruled on |
| D Discovery | `docs/00-discovery.md` | 3-5 cited competitors, table-stakes features you rule on, personas and jobs, positioning |
| 0 Constitution | `docs/00-constitution.md` | Principles, quality bar, ISO 25010 quality-attribute scenarios with numbers, standards (WCAG 2.2 AA, ASVS Level 1), constraints, agent boundaries |
| 1 Product Spec | `docs/01-product-spec.md` | Features, stories, EARS acceptance criteria with examples, measurable NFRs |
| 2 UX Spec | `docs/02-ux/` | Researched design system, an art-directed visual direction, tokens, screens with data, actions and four states, high-fidelity mockups critiqued by a design-critic agent |
| 3 Technical Design | `docs/03-tech/` | Stack (pinned), components, OpenAPI contract, data model, ADRs, quality tactics, STRIDE threat model, ASVS Level 1 decisions |
| 4 Implementation Plan | `docs/04-plan.md` | Ordered vertical-slice tasks covering every criterion |
| 5 Build | `app/` | Test-first, one task per subagent, reviewed after each |
| 6 Verification and Acceptance | `docs/05-acceptance.md` | Every criterion PASS or FAIL with evidence, security and performance measurements, and the two quality indices |

You approve every stage. Approval only works when the automated check for that stage passes.

## Choose a scale

You pick how much of the pipeline a product gets, once, at the start (`itq.mjs scale list`). A bigger scale runs more stages and checks; a smaller one skips what the product does not need yet, says so in its documents, and can be raised later without losing finished work (`itq.mjs scale set <name>`).

| Scale | For | Stages | Approvals | Measured (food-bank scheduler) |
|---|---|---|---|---|
| **Prototype** | Test an idea or show one flow; local, one main path, throwaway data | brief and task list, build, report | 2 | 10 min, $2 |
| **Demo** | Show stakeholders or investors; looks real, seeded data, not for real users | brief, look (mockups), task list, build, report | 3 | 24 min, $5 |
| **MVP** | First real users; core flows correct and safe | constitution, spec, look, technical design, plan, build, report | 4 | 1 h 56 min, $19 |
| **Full product** | Ship and keep: researched, specified, measured | all stages, Discovery to Acceptance | 8 | $52-60 (v0.5-v0.6 pilots); time not re-measured |

What stays at every scale: EARS criteria with examples, test-first building, criterion ids in test titles, tests that really run, one commit per task, and the gate hooks. What a scale drops is named in its brief, README and report, so a small product is never passed off as a bigger one. Stages that belong to one decision are approved together on one combined card, which is how a day can hold three or four products: start each in its own folder and session. The measured column is one pilot per scale on the same Vision, in elapsed time; planning targets with margin are in `scales.json`.

**Usage is what limits a day, so the scales are sized against your full allowance.** Measured cost of one product on the food-bank Vision, as a share of a full Max-plan 5-hour window and week (estimates; edit `allowance` in `scales.json` for another plan): Prototype $2 is about 3% and 1%; Demo $5 about 7% and 2%; MVP $19 about 29% and 8%; the Full product $52-60 about 80-90% and 23-26%. A day of one MVP, one Demo and two Prototypes is about $28, roughly 40% of a window and 12% of a week; the same budget buys about half of one Full product. Each lite scale has a usage budget and the plan card shows a forecast against it before the build. Almost all of a long session's cost is re-reading its own growing context (the MVP's reached 660k tokens), so after each approval Itqan advises a fresh session (`/clear`, then `/itqan:start`; nothing is lost because state is in files), the MVP build uses a fresh implementer per task, and `itq.mjs usage` shows the live context and the recorded cost.

## Install (no cloning)

```bash
claude plugin marketplace add abushqear-dev/itqan
claude plugin install itqan@itqan-plugins
```

Inside a session: `/plugin marketplace add abushqear-dev/itqan`, then `/plugin install itqan@itqan-plugins`. Restart the session or run `/reload-plugins`.

Update: `claude plugin marketplace update itqan-plugins`, then `claude plugin update itqan@itqan-plugins`.

## Use it

1. Make an empty folder for the product (or put your BRD or Vision in it) and start Claude Code there.
2. Run `/itqan:start` (add a scale word to skip the question: `/itqan:start demo`). If no input exists, it asks for one: a file, a link or pasted text. It also asks which scale you want.
3. Answer its questions, read each stage's review card (reading time, the decisions only you can make, assumptions and what they mean for users, what changed), and reply `approve` or ask for changes.
4. Run `/itqan:start` again in a later session to resume. `/itqan:status` shows where you are.

Optional: install the [Superpowers](https://github.com/obra/superpowers) plugin. The build stage uses its subagent-driven development and test-driven development skills when they are available.

## How it keeps quality

- **Every stage is scored** (`itq.mjs score <n>`, thresholds in `scorecards.json`): pass/fail gates plus weighted scores from script checks, with judge metrics that stay advisory until each rubric has a calibration record (`rubrics/`, `scripts/calibrate.mjs`). A draft reaches you when its gates pass and its score meets the stage target, or after at most three rounds with the remaining gaps shown. Approval stays yours.
- **Two indices at the end** (`itq.mjs index`): an Industry Standard Index built on ISO/IEC 25010 and a Sell Standard Index measured against the competitors found in Discovery, each with a band (ship-ready, strong prototype, not ready).
- **Measured, not asserted:** requirement-smell lint, table-stakes coverage, token and mockup-fidelity audits, forced UI states and widths, a per-task health gate (coverage, mutation score, complexity, duplication, Semgrep, dependency audit), role-by-route security probes and Lighthouse budgets.

- **Formats Claude can't misread:** EARS acceptance criteria with examples, an OpenAPI 3.1 contract, an exact data model, W3C design tokens and MADR decision records.
- **UX before the API**, so screens decide what data the system must provide.
- **Gaps are asked about, not guessed.** `[NEEDS CLARIFICATION]` markers block approval.
- **Product decisions stay yours.** Any assumption that drops a capability users would expect is tagged `scope-cut` and needs your own answer; "use defaults" never settles one. A lifecycle table makes every entity's create, view, edit, cancel and undo explicit, and the reviewer runs a product-completeness pass against comparable products.
- **One source for every value and word:** a data-ranges table (min and max of everything a screen shows) and a copy deck (every message, by key) feed the design, the code and the tests.
- **Ambiguity and edge cases are swept before building:**
  - a roles-and-permissions table;
  - an "Interpretations" list of phrases with more than one reading;
  - a required edge-case sweep (dates, quantities, permissions, state order, multiple users, notifications, undo), where each rule becomes a testable criterion.
- **The build survives budget limits.** Every task is test-first, reviewed and committed on its own, and an interrupted build resumes from `.itqan/build-log.md`.
- **Automated checks per stage** (`itq.mjs check <n>`) test truth, not just presence:
  - every criterion is written in EARS, and every lifecycle cell is filled;
  - every screen has all four states, every P1 screen has a mockup plus a state or role variant, and every stated contrast ratio is recomputed;
  - every screen has its own data line, and the OpenAPI contract passes a pinned lint;
  - every task's verify step is a real command that selects its criterion tests;
  - the build check runs the install and test commands itself, fails on any skipped test, counts criterion ids only in test titles, and requires one reviewed commit per task;
  - every PASS names a test that exists.
- **Review cards** (`itq.mjs card <n>`) put the decisions, assumptions and changes on one screen before each approval.
- **Black-box exploratory testing:** an explorer agent uses the running app like a demanding user of each role, without reading the code.
- **Generated traceability** runs from each criterion to its screens, API operations, tasks and tests (`.itqan/TRACE.md`).
- **Independent reviewers:** a document reviewer, a design researcher, a design critic, a spec-compliance reviewer per build task and the explorer.
- **Hooks enforce the order** for file edits and for Bash or PowerShell writes alike: no stage before the previous one is approved, no edits to approved stages, no hand edits to generated state.

## Built on proven sources

Itqan's stage instructions combine its own formats with vetted material, pinned and never fetched at runtime (details in [NOTICES.md](NOTICES.md)):
- **Spec Kit** (GitHub, MIT): the clarify taxonomy and question format, the "unit tests for English" requirements self-check, analyze-style review passes, prioritised independent stories, the constitution check.
- **Superpowers** (MIT): test-driven development, writing good tests and verification-before-completion, vendored verbatim; the implementer and task-reviewer patterns, adapted.
- **Vercel Web Interface Guidelines** (MIT): vendored as the screen checklist.
- **Anthropic frontend-design** (Apache-2.0): the art-direction process behind the UX Spec's visual direction (subject inventory, design plan, review against generic defaults, screenshot critique), vendored.
- **Impeccable** (Apache-2.0): the craft floor and the Operate-mode rules for app screens, vendored (reference documents only).
- **Emil Kowalski's break-ui** (MIT): the worst-case data pass in Acceptance (long names, counts of 0 and 1, empty and huge lists), vendored.
- **Anthropic webapp-testing** (Apache-2.0): the reconnaissance-then-act approach behind `scripts/ui-scan.mjs`, which flags stray "null" or "undefined" text, phone-width overflow, console errors and accessibility violations on every screen.
- **MADR** for decision records, **EARS** for requirements, the **W3C Design Tokens** format for tokens.

## Project layout

```
docs/input/  docs/00-constitution.md  docs/01-product-spec.md
docs/02-ux/  docs/03-tech/  docs/04-plan.md  docs/05-acceptance.md
.itqan/      state.json, STATUS.md, TRACE.md, cards/, approved/ (generated),
             ASSUMPTIONS.md, build-log.md, commands.json
app/         the product, with app/CLAUDE.md
```

## Develop

```bash
git clone https://github.com/abushqear-dev/itqan
claude --plugin-dir ./itqan
claude plugin validate ./itqan
```

Run the state-tool test with `bash tests/state-tool.sh`. Evals are in `evals/` (`claude plugin eval .`).
