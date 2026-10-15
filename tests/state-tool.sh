#!/bin/bash
# End-to-end test of scripts/itq.mjs: walks a fixture project through every stage, checks that each
# automated check fails on bad input and passes on good input, and that the gate hook enforces the order.
# Usage: bash tests/state-tool.sh   (exit 0 = all assertions passed)
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; command -v cygpath >/dev/null && T="$(cygpath -m "$T")"
export CLAUDE_PROJECT_DIR="$T"
Q="node $ROOT/scripts/itq.mjs"
fails=0
expect() { # expect <exit code> <description> <command...>
  local want=$1 desc=$2; shift 2
  "$@" >/tmp/itq-test.out 2>&1; local got=$?
  if [ "$got" = "$want" ]; then echo "ok   $desc"; else echo "FAIL $desc (exit $got, wanted $want)"; sed 's/^/     /' /tmp/itq-test.out | head -8; fails=$((fails+1)); fi
}
gate() { echo "{\"cwd\":\"$T\",\"tool_input\":{\"file_path\":\"$T/$1\"}}" | $Q hook-gate; }
cd "$T"
$Q init >/dev/null

expect 1 "stage 0 refuses without input" $Q start 0
echo "Vision text" > docs/input/vision.md; $Q record-input docs/input/vision.md vision pasted >/dev/null
expect 0 "stage 0 starts with input" $Q start 0
expect 2 "gate blocks writing stage 1 early" gate docs/01-product-spec.md
expect 2 "gate blocks generated files" gate .itqan/TRACE.md
printf -- '---\nid: constitution\nversion: 1\nstatus: draft\n---\n# C\n## Principles\n1. **P1** MUST x. Reason: y.\n## Quality bar\nx\n## Constraints\nx\n## Boundaries\n- Always: a\n- Ask first: b\n- Never: c\n' > docs/00-constitution.md
expect 0 "approve constitution" $Q approve 0

$Q start 1 >/dev/null
cat > docs/01-product-spec.md <<'EOF'
---
id: product-spec
version: 1
status: draft
---
# S
## Clarifications
- none
## Roles and permissions
x
## Interpretations
- none
## Features
### FEAT-01 Lend
#### US-01 List a tool
Priority: P1. Source: vision.
##### AC-01.1 Add
WHEN an owner adds a tool, THE SYSTEM SHALL list it.
Example: drill -> listed
##### AC-01.2 Refuse empty
IF the name is empty, THEN THE SYSTEM SHALL refuse it.
Example: "" -> error
## Edge cases
- Dates and times: n/a: none
- Quantities and text: AC-01.2
- Permissions: n/a: one role
- State changes: n/a
- Multiple users: n/a
- Notifications: n/a
- Undo and recovery: n/a
### NFR-01 Speed
THE SYSTEM SHALL respond quickly.
Measure: p95 < 2 s
Verify: load test
EOF
expect 1 "check 1 fails without an independent test" $Q check 1
sed -i 's/^Priority: P1. Source: vision.$/Priority: P1. Source: vision.\nIndependent test: add a tool and see it listed./' docs/01-product-spec.md
expect 0 "check 1 passes" $Q check 1
expect 0 "approve product spec" $Q approve 1
expect 2 "inputs frozen after spec approval" gate docs/input/vision.md

$Q start 2 >/dev/null; mkdir -p docs/02-ux
printf -- '---\nid: ux-spec\n---\n# UX\n## Design system\nDecision: x\n## Visual direction\n- Palette: Ground #F6F7F2, Ink #1B2620, Accent #0A7A5A\n## Screens\n### SCR-01 Tools\nServes AC-01.1, AC-01.2. Empty, Loading, Error, Success.\n' > docs/02-ux/ux-spec.md
cp "$ROOT/templates/tokens.json" docs/02-ux/tokens.json
expect 1 "check 2 fails on a thin visual direction and no mockups" $Q check 2
sed -i 's/^- Palette: .*/- Palette: Ground #F6F7F2, Ink #1B2620, Accent #0A7A5A, Error #B3261E\n- Type: Inter 16\/24, scale 1.2\n- Design critique: 4.4 \/ 5, PASS/' docs/02-ux/ux-spec.md
mkdir -p docs/02-ux/mockups; echo "<html></html>" > docs/02-ux/mockups/SCR-01.html
expect 0 "approve ux" $Q approve 2

$Q start 3 >/dev/null; mkdir -p docs/03-tech/adr
printf -- '---\nid: tech-design\n---\n# T\n## Constitution check\n- P1: FAIL. not yet\n## Stack\nNode 24.1\n## Components\n### C-01 API\n## Screen data\nSCR-01: listTools\n## Run locally\nnpm start\n' > docs/03-tech/design.md
printf 'openapi: 3.1.0\npaths:\n  /api/tools:\n    get:\n      operationId: listTools\n      x-acceptance: [AC-01.1, AC-01.2]\n' > docs/03-tech/api.yaml
printf 'tool(id, name)\n' > docs/03-tech/data-model.md
printf -- '---\nstatus: accepted\n---\n# ADR-0001 Node\n' > docs/03-tech/adr/0001-node.md
expect 1 "check 3 fails on a Constitution check FAIL" $Q check 3
sed -i 's/- P1: FAIL. not yet/- P1: PASS. server-side validation/' docs/03-tech/design.md
expect 0 "approve tech design" $Q approve 3

$Q start 4 >/dev/null
printf -- '---\nid: plan\n---\n# P\n### T-001 Walking skeleton\n- **Covers:** none\n- **Depends:** none\n- **Verify:** `npm test`\n## P1 stories\n### T-002 [P] List\n- **Covers:** AC-01.1\n- **Depends:** T-003\n- **Verify:** `npm test`\n### T-003 Refuse\n- **Covers:** AC-01.2\n- **Depends:** T-002\n- **Verify:** `npm test`\n' > docs/04-plan.md
expect 1 "check 4 catches a dependency cycle" $Q check 4
sed -i 's/Depends:\*\* T-003/Depends:** T-001/' docs/04-plan.md
expect 0 "approve plan" $Q approve 4

expect 2 "gate blocks app/ before build starts" gate app/x.js
$Q start 5 >/dev/null
expect 0 "gate allows app/ during build" gate app/x.js
expect 2 "gate locks the approved plan" gate docs/04-plan.md
mkdir -p app/tests; echo "test('AC-01.1 lists', () => {}); test('AC-01.2 refuses', () => {})" > app/tests/a.test.js
printf 'T-001 done a1\nT-002 done b2\nT-003 done c3\n' > .itqan/build-log.md
expect 1 "check 5 needs app/README.md and app/CLAUDE.md" $Q check 5
echo "# App" > app/README.md; echo "# Agent context" > app/CLAUDE.md
expect 0 "approve build" $Q approve 5

$Q start 6 >/dev/null
printf -- '---\nid: acceptance\n---\n# A\n- AC-01.1 PASS. Evidence: AC-01.1 lists\n- AC-01.2 FAIL. refuses wrongly\n' > docs/05-acceptance.md
expect 1 "check 6 needs a known gap for FAIL" $Q check 6
sed -i 's/FAIL. refuses wrongly/FAIL. Known gap: wording/' docs/05-acceptance.md
expect 0 "approve acceptance" $Q approve 6
expect 0 "reopen stage 1" $Q reopen 1
grep -q "version: 2" docs/01-product-spec.md && echo "ok   reopen bumps the spec version" || { echo "FAIL reopen bumps the spec version"; fails=$((fails+1)); }
grep -q "| 2 | UX Spec | recheck" .itqan/STATUS.md && echo "ok   later stages marked recheck" || { echo "FAIL later stages marked recheck"; fails=$((fails+1)); }

cd /; rm -rf "$T"
echo; [ $fails -eq 0 ] && echo "All assertions passed." || echo "$fails assertion(s) failed."
exit $fails
