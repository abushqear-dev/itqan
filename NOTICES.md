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
- **WCAG 2.x** (W3C): the relative-luminance contrast formula `itq.mjs` uses to recompute every stated contrast ratio.
- **Redocly CLI** (MIT), version 1.25.0, https://github.com/Redocly/redocly-cli: run through `npx` by the Technical Design check to lint `api.yaml`. Not bundled.

## Itqan's own work

The scale profiles (`scales.json`: Prototype, Demo, MVP and Full product, the lite templates, bundled approvals), the product-completeness review pass, the lifecycle table, scope-cut tagging, review cards, the copy deck, the data-ranges table, the `explorer` agent and the build checks (tests run from `.itqan/commands.json`, criterion ids counted only in test titles, one commit per task) are written for Itqan and copy no external text.
- **W3C Design Tokens Format Module 2025.10**: `templates/tokens.json` format.

## Added in v0.6

- **OWASP ASVS 5.0.0** (CC BY-SA 4.0), tag `v5.0.0_release`, commit `5cf9b032440be53ce345ab3c130fda46ba1ce7a2`, https://github.com/OWASP/ASVS: the 70 Level 1 requirements, filtered and otherwise unmodified, in `vendor/asvs/`. Derived decision tables you create in a project (`docs/03-tech/asvs-l1.md`) are a derivative work under the same licence.
- **BMAD Method** (MIT), `bmad-code-org/BMAD-METHOD` v6.12.4, commit `8f0d50e1817fdd8fcf05a20c524218222d13cd8d`: the deep-recon research rules (evidence firewall, sourced claims, freshness windows, two sources for differentiation claims), adapted in `skills/discovery/SKILL.md`; the PRD validation dimensions ("theater", done-ness, scope honesty), adapted in `agents/reviewer.md`. The "BMad" name is not used.
- **STRIDE-GPT** (MIT), `mrwadams/stride-gpt` v0.20.0, commit `4ae5312`: the per-boundary STRIDE method, adapted in `skills/tech-design/SKILL.md`.
- **Anthropic knowledge-work-plugins** `competitive-brief` (Apache-2.0), commit `e6b505348c39c6e751a70d52ff407e7b0a6bf676`: the rating scale and competitor levels in `templates/discovery.md`.
- **Impeccable** 4.6.0 (Apache-2.0), commit `8a0e198da34ebc5b936a9d5975fb7a3b1cf353b7`: the `critique` scoring guide and `detect` rules are referenced by the UX Spec stage.
- **Design2Code** (Si et al., 2024; code MIT, `NoviScl/Design2Code`): the idea of comparing text blocks by match, position and colour; `scripts/fidelity.mjs` is Itqan's own Node implementation and copies no code.
- **Requirement smells** (Femmer et al., JSS 2016), **Paska** (Veizaga et al., 2023), **QUS / AQUSA** (Lucassen et al., 2016, MIT): the ideas behind `scripts/lint-req.mjs`; the lexicon is Itqan's own.
- **Sonar quality gate defaults, ESLint complexity, StrykerJS, jscpd, Semgrep, OSV-Scanner, Lighthouse CI, axe-core**: used as pinned external tools by `scripts/health.mjs` and the acceptance checks; none is bundled.
- **W3C WCAG 2.2**, **ISO/IEC 25010:2023**, **ISO/IEC/IEEE 29148**: the standards behind the scorecards (`scorecards.json`); referenced, not reproduced.
- **UICrit** (CC BY 4.0), **Design2Code and UIClip human-preference data**: used only as calibration ground truth for the design judges (`gold/`), with attribution.
- **eslint-plugin-security** 4.2.0 (Apache-2.0), https://github.com/eslint-community/eslint-plugin-security: the reduced fallback security scan in `scripts/health.mjs`, installed at run time, not bundled.
