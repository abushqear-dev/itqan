# Itqan (إتقان)

*Itqan* is Arabic for mastery: doing work with excellence and precision.

Itqan is a Claude Code plugin for spec-driven product building. It takes a product idea (a Business Requirements Document and/or a Vision Document) through a short set of approved specs to a tested product running locally. The specs are the only source of truth Claude uses while building.

## The pipeline

| Stage | Document | What it settles |
|---|---|---|
| Intake | `docs/input/` | The BRD and/or Vision, classified, with conflicts ruled on |
| 0 Constitution | `docs/00-constitution.md` | Principles, quality bar, constraints, agent boundaries |
| 1 Product Spec | `docs/01-product-spec.md` | Features, stories, EARS acceptance criteria with examples, measurable NFRs |
| 2 UX Spec | `docs/02-ux/` | Researched design system, an art-directed visual direction, tokens, screens with data, actions and four states, high-fidelity mockups critiqued by a design-critic agent |
| 3 Technical Design | `docs/03-tech/` | Stack (pinned), components, OpenAPI contract, data model, ADRs |
| 4 Implementation Plan | `docs/04-plan.md` | Ordered vertical-slice tasks covering every criterion |
| 5 Build | `app/` | Test-first, one task per subagent, reviewed after each |
| 6 Acceptance | `docs/05-acceptance.md` | Every criterion PASS or FAIL with evidence |

You approve every stage. Approval only works when the automated check for that stage passes.

## Install (no cloning)

```bash
claude plugin marketplace add abushqear-dev/itqan
claude plugin install itqan@itqan-plugins
```

Inside a session: `/plugin marketplace add abushqear-dev/itqan`, then `/plugin install itqan@itqan-plugins`. Restart the session or run `/reload-plugins`.

Update: `claude plugin marketplace update itqan-plugins`, then `claude plugin update itqan@itqan-plugins`.

## Use it

1. Make an empty folder for the product (or put your BRD or Vision in it) and start Claude Code there.
2. Run `/itqan:start`. If no input exists, it asks for one: a file, a link or pasted text.
3. Answer its questions, read each document's "Approve this if" box, and reply `approve` or ask for changes.
4. Run `/itqan:start` again in a later session to resume. `/itqan:status` shows where you are.

Optional: install the [Superpowers](https://github.com/obra/superpowers) plugin. The build stage uses its subagent-driven development and test-driven development skills when they are available.

## How it keeps quality

- **Formats Claude can't misread:** EARS acceptance criteria with examples, an OpenAPI 3.1 contract, an exact data model, W3C design tokens and MADR decision records.
- **UX before the API**, so screens decide what data the system must provide.
- **Gaps are asked about, not guessed.** `[NEEDS CLARIFICATION]` markers block approval.
- **Ambiguity and edge cases are swept before building:**
  - a roles-and-permissions table;
  - an "Interpretations" list of phrases with more than one reading;
  - a required edge-case sweep (dates, quantities, permissions, state order, multiple users, notifications, undo), where each rule becomes a testable criterion.
- **The build survives budget limits.** Every task is test-first, reviewed and committed on its own, and an interrupted build resumes from `.itqan/build-log.md`.
- **Automated checks per stage** (`itq.mjs check <n>`):
  - every criterion is written in EARS;
  - every screen has all four states;
  - every screen is mapped to the API;
  - every criterion is covered by a task and named by a test;
  - every PASS has evidence.
- **Generated traceability** runs from each criterion to its screens, API operations, tasks and tests (`.itqan/TRACE.md`).
- **Independent reviewers:** a document reviewer, a design researcher, and a spec-compliance reviewer per build task.
- **A hook enforces the order:** no stage before the previous one is approved, no edits to approved stages, no hand edits to generated state.

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
.itqan/      state.json, STATUS.md, TRACE.md (generated), ASSUMPTIONS.md, build-log.md
app/         the product, with app/CLAUDE.md
```

## Develop

```bash
git clone https://github.com/abushqear-dev/itqan
claude --plugin-dir ./itqan
claude plugin validate ./itqan
```

Run the state-tool test with `bash tests/state-tool.sh`. Evals are in `evals/` (`claude plugin eval .`).
