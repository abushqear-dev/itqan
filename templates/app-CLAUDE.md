# <Product name>: agent context

Built from the approved specs in `../docs/`. The specs are the source of truth; this file is a short map. Do not copy spec content here.

## Commands
- Install: `<command>`
- Run: `<command>` -> <URL>
- Test: `<command>` (single test: `<command>`)
- E2E: `<command>`

## Layout
<Top-level folders of app/, one line each.>

## Conventions
- Every test that proves an acceptance criterion has its AC id in the test name, e.g. `AC-03.2 rejects an 8-day loan`.
- API: implement exactly `../docs/03-tech/api.yaml`; data: `../docs/03-tech/data-model.*`; styles: tokens from `../docs/02-ux/tokens.json`.
- <Project-specific rules that Claude would otherwise get wrong.>

## Boundaries
- Always: run the task's Verify command before marking it done.
- Ask first: <from the Constitution>
- Never: <from the Constitution>; never edit `../docs/` (approved specs change only through upstream-change).
