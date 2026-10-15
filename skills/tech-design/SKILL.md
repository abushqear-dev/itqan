---
name: tech-design
description: Stage 3 of Itqan. Writes the Technical Design (docs/03-tech/), with design.md (stack with pinned versions, components, screen-to-API data mapping, error model, security, testing strategy, run commands), an OpenAPI 3.1 contract (api.yaml), the data model, and ADRs for every non-obvious decision. Use when Itqan reaches stage 3 or the user asks for architecture, API or data design.
---

# Stage 3: Technical Design

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Templates in `${CLAUDE_PLUGIN_ROOT}/templates/`: `design.md`, `api.yaml`, `adr.md`. Inputs: the UX Spec (screens, fields, actions), the Product Spec and the Constitution.

- **Contracts are the source of truth for the build.** `api.yaml` defines every path, field, type, status code and error, with an example per operation and `x-acceptance: [AC-..]` on every operation. The data model (`data-model.sql`, `.prisma` or `.md` with exact columns and types) covers every entity. The build implements exactly these; anything missing here will be invented later, so leave nothing implicit.
- **Screen data.** For every SCR-n, map each field and action to an operation. A screen field no operation can supply is a design gap: fix it here.
- **Decisions.** One ADR (`adr/NNNN-title.md`, from the template) per non-obvious choice: stack, database, auth, state handling, testing tools, anything the Constitution left open. Pin versions in "## Stack".
- **Testing strategy.** Name the test tools and levels, and the rule that tests proving a criterion carry its AC id. Include end-to-end tests for each story's main path and an automated accessibility scan if the Constitution sets an accessibility level.
- **Run locally.** Exact commands, port and URL. Check the port is free on this machine if you can.
- **Constitution check.** List every MUST principle and quality-bar item as PASS or FAIL with how the design meets it. A FAIL blocks approval: change the design, or raise it with the user as an upstream change to the Constitution. Do this before drafting the details and again at the end (adapted from Spec Kit's plan template, see NOTICES.md).
- **Unknowns researched.** When a requirement depends on something you are not sure about (a library's limits, time-zone handling, a browser API), research it and record the answer with its source. Never guess silently.
- **Nothing speculative.** No "may later swap to X" justifications and no technology the requirements do not need.
- Optional: if `npx` is available, lint the contract (`npx @redocly/cli lint docs/03-tech/api.yaml`) and fix errors.

Gate: `itq.mjs check 3` passes (sections, pinned versions, OpenAPI with x-acceptance on every operation, data model, at least one ADR, every screen mapped), the review is clean, and the user approves the design and ADRs. The user reviews design.md and the ADRs, not the raw YAML.
