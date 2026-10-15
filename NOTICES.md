# Notices and attribution

Itqan is MIT licensed. It includes or adapts material from these projects. Nothing is fetched at runtime; every source is pinned to the commit below.

## Included verbatim (in `vendor/`)

- **obra/superpowers** (MIT), commit `bb92a77741419a4ab5f06e711a283343f1ada0c3`, https://github.com/obra/superpowers
  - `vendor/superpowers/test-driven-development.md`, `writing-good-tests.md`, `verification-before-completion.md`
- **vercel-labs/web-interface-guidelines** (MIT), commit `434b7f91364665f2f733b310ec54809bf8f37937`, https://github.com/vercel-labs/web-interface-guidelines
  - `vendor/web-interface-guidelines/guidelines.md`

- **anthropics/skills** `frontend-design` (Apache-2.0), commit `dbd4588f9e1033efb41dad4bef2f7947c8993d44`, https://github.com/anthropics/skills
  - `vendor/frontend-design/frontend-design.md`
- **pbakaus/impeccable** (Apache-2.0), commit `8a0e198da34ebc5b936a9d5975fb7a3b1cf353b7`, https://github.com/pbakaus/impeccable
  - `vendor/impeccable/craft-floor.md`, `operate.md` (reference documents only; the launcher and hook are not included)
- **emilkowalski/skills** `break-ui` (MIT), commit `2d228630ba1446365f614a108cb8252f1feda202`, https://github.com/emilkowalski/skills
  - `vendor/break-ui/break-ui.md`, `CATALOG.md`

## Adapted (rewritten for Itqan's formats, IDs and gates)

- **pbakaus/impeccable** (Apache-2.0): surface modes (Operate, Persuade, Read, Experience) -> `skills/ux-spec/SKILL.md`

- **github/spec-kit** (MIT), commit `3238fa9285694dc539aeb9829b337bfd6aed7317`, https://github.com/github/spec-kit
  - `clarify` command: ambiguity taxonomy and question format -> `skills/product-spec/clarify.md`
  - `checklist` command: "unit tests for English" -> `skills/product-spec/requirements-checklist.md`
  - `analyze` command: detection passes and severity levels -> `agents/reviewer.md`
  - spec template: prioritised, independently testable stories -> `templates/product-spec.md`
  - plan template: constitution check and research of unknowns -> `templates/design.md`
  - tasks template: parallel-safe `[P]` markers and grouping by story -> `templates/plan.md`
  - constitution command: MUST/SHOULD principles with rationale and versioning -> `templates/constitution.md`
- **obra/superpowers** (MIT), commit above
  - `subagent-driven-development` implementer and task-reviewer prompts -> `skills/build/implementer-prompt.md`, `agents/task-reviewer.md`
  - `writing-plans` (no placeholders, exact paths and commands) -> `skills/plan/SKILL.md`
- **anthropics/skills** `webapp-testing` (Apache-2.0), commit `dbd4588f9e1033efb41dad4bef2f7947c8993d44`, https://github.com/anthropics/skills
  - reconnaissance-then-act browser testing approach -> `skills/acceptance/SKILL.md`, `scripts/ui-scan.mjs` (Node rewrite, no code copied)
- **adr/madr** (MIT OR CC0-1.0), https://github.com/adr/madr
  - ADR structure -> `templates/adr.md`
- **EARS** (Mavin et al., Rolls-Royce, IEEE RE 2009): requirement sentence patterns used in the Product Spec.
- **W3C Design Tokens Format Module 2025.10**: `templates/tokens.json` format.
