#!/bin/bash
# End-to-end test of scripts/itq.mjs: walks a fixture project through every stage, checks that each
# automated check fails on bad input and passes on good input, and that the gate hooks enforce the order.
# Usage: bash tests/state-tool.sh   (exit 0 = all assertions passed)
# Set ITQAN_TEST_LINT=1 to also run the real OpenAPI lint (needs network for npx).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; command -v cygpath >/dev/null && T="$(cygpath -m "$T")"
export CLAUDE_PROJECT_DIR="$T"
[ -z "${ITQAN_TEST_LINT:-}" ] && export ITQAN_NO_LINT=1
Q="node $ROOT/scripts/itq.mjs"
fails=0
expect() { # expect <exit code> <description> <command...>
  local want=$1 desc=$2; shift 2
  "$@" >/tmp/itq-test.out 2>&1; local got=$?
  if [ "$got" = "$want" ]; then echo "ok   $desc"; else echo "FAIL $desc (exit $got, wanted $want)"; sed 's/^/     /' /tmp/itq-test.out | head -12; fails=$((fails+1)); fi
}
says() { # says <description> <pattern>: the last command's output matches
  if grep -q -- "$2" /tmp/itq-test.out; then echo "ok   $1"; else echo "FAIL $1 (no \"$2\" in output)"; sed 's/^/     /' /tmp/itq-test.out | head -12; fails=$((fails+1)); fi
}
gate() { echo "{\"cwd\":\"$T\",\"tool_input\":{\"file_path\":\"$T/$1\"}}" | $Q hook-gate; }
shell() { node -e 'process.stdout.write(JSON.stringify({cwd:process.argv[1],tool_input:{command:process.argv[2]}}))' "$T" "$1" | $Q hook-bash; }
cd "$T"
git init -q . && git config user.email t@t && git config user.name t && git config core.autocrlf false
$Q init >/dev/null

# ---------- stage 0 ----------
expect 1 "stage 0 refuses without input" $Q start 0
echo "Vision text" > docs/input/vision.md; $Q record-input docs/input/vision.md vision pasted >/dev/null
expect 0 "stage 0 starts with input" $Q start 0
expect 2 "gate blocks writing stage 1 early" gate docs/01-product-spec.md
expect 2 "gate blocks generated files" gate .itqan/TRACE.md
printf -- '---\nid: constitution\nversion: 1\nstatus: draft\n---\n# C\n## Principles\n1. **P1** MUST x. Reason: y.\n## Quality bar\n- **Performance:** fast\n## Constraints\nx\n## Boundaries\n- Always: a\n- Ask first: b\n- Never: c\n' > docs/00-constitution.md
expect 1 "check 0 needs 3 principles and a numeric performance target" $Q check 0
says "check 0 names the principle count" "1 numbered MUST/SHOULD"
says "check 0 names the performance target" "Performance target"
sed -i 's/^1\. \*\*P1\*\* MUST x. Reason: y.$/1. **P1** MUST x. Reason: y.\n2. **P2** SHOULD z. Reason: w.\n3. **P3** MUST v. Reason: u./; s/Performance:\*\* fast/Performance:** p95 page load < 2 s/' docs/00-constitution.md
expect 0 "approve constitution" $Q approve 0
[ -f .itqan/approved/stage-0/docs/00-constitution.md ] && echo "ok   approval saves a snapshot" || { echo "FAIL approval saves a snapshot"; fails=$((fails+1)); }

# ---------- stage 1 ----------
$Q start 1 >/dev/null
cat > docs/01-product-spec.md <<'EOF'
---
id: product-spec
version: 1
status: draft
---
# S
## Goals and success measures
- G-01: owners list tools in under 1 minute.
## Clarifications
- none
## Roles and permissions
x
## Lifecycle
| Entity | Create | View | Edit | Cancel or delete | Undo or restore |
|---|---|---|---|---|---|
| Tool | AC-01.1 | AC-01.1 | out of scope | | proposed (US-02) |
## Interpretations
- none
## Features
### FEAT-01 Lend
#### US-01 List a tool
Priority: P1. Source: vision.
##### AC-01.2 Refuse empty
IF the name is empty, THEN THE SYSTEM SHALL refuse it.
Example: "" -> error
##### AC-01.1 Add
WHEN an owner adds a tool, THE SYSTEM SHALL list it.
Example: drill -> listed
#### US-02 Fix a tool
Priority: P2. Source: proposed.
Independent test: edit a tool.
##### AC-02.1 Edit
WHEN an owner edits a tool, THE SYSTEM SHALL save it.
Example: drill -> hammer
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
cat >> .itqan/ASSUMPTIONS.md <<'EOF'
| A-1 | 1 | Tools cannot be deleted | A wrong listing stays forever | scope-cut | accepted |
| A-2 | 1 | One owner per tool | Shared tools need two listings |  | open |
EOF
expect 1 "check 1 fails" $Q check 1
says "check 1 needs an independent test" "US-01 has no \"Independent test:\""
says "check 1 rejects an empty lifecycle cell" "Lifecycle row \"Tool\" has an empty cell"
says "check 1 rejects an unconfirmed out-of-scope action" "out of scope without the user's confirmation"
says "check 1 rejects a scope-cut settled by default" "A-1 is a scope-cut"
says "check 1 warns on criteria out of order" "not numbered 1, 2, 3"
sed -i 's/^Priority: P1. Source: vision.$/Priority: P1. Source: vision.\nIndependent test: add a tool and see it listed./; s/| out of scope | |/| AC-02.1 | out of scope (confirmed by user) |/' docs/01-product-spec.md
sed -i 's/| scope-cut | accepted |/| scope-cut | confirmed |/' .itqan/ASSUMPTIONS.md
expect 0 "check 1 passes" $Q check 1
expect 0 "card 1 renders" $Q card 1
says "card shows the scope-cut" "A-1"
says "card shows the consequence for users" "For users: Shared tools need two listings"
says "card shows reading time" "Reading time"
expect 0 "approve product spec" $Q approve 1
expect 2 "inputs frozen after spec approval" gate docs/input/vision.md

# ---------- shell writes ----------
expect 2 "bash hook blocks a redirect into an approved stage" shell "echo x >> docs/01-product-spec.md"
expect 2 "bash hook blocks sed -i on an approved stage" shell "sed -i 's/a/b/' docs/00-constitution.md"
expect 2 "bash hook blocks PowerShell Set-Content on an approved stage" shell "Set-Content -Path docs\\01-product-spec.md -Value x"
expect 2 "bash hook blocks writing generated state" shell "echo {} > .itqan/state.json"
expect 2 "bash hook blocks writing app/ before the build" shell "mkdir -p app/src && touch app/src/x.js"
expect 0 "bash hook allows reading an approved stage" shell "cat docs/01-product-spec.md | grep AC > /tmp/acs.txt"
expect 0 "bash hook allows copying from an approved stage" shell "cp docs/01-product-spec.md /tmp/spec.md"
expect 0 "bash hook allows ordinary commands" shell "npm test 2>&1 | tail -5"

# ---------- stage 2 ----------
$Q start 2 >/dev/null; mkdir -p docs/02-ux
cat > docs/02-ux/ux-spec.md <<'EOF'
---
id: ux-spec
---
# UX
## Design system
Decision: x
## Visual direction
- Palette: Ground #F6F7F2, Ink #1B2620, Accent #0A7A5A
- Contrast: #999999 on #FFFFFF = 2.8
- Contrast: #1B2620 on #F6F7F2 = 9.0
## Screens
### SCR-01 Tools
Serves AC-01.1, AC-01.2. Empty, Loading, Error, Success.
### SCR-02 Edit
Serves AC-02.1. Empty, Loading, Error, Success.
EOF
cp "$ROOT/templates/tokens.json" docs/02-ux/tokens.json
mkdir -p docs/02-ux/mockups; echo "<html></html>" > docs/02-ux/mockups/SCR-01.html
expect 1 "check 2 fails" $Q check 2
says "check 2 needs a type line" "no \"Type:\" line"
says "check 2 needs a variant mockup for a P1 screen" "SCR-01 has no variant mockup"
says "check 2 recomputes contrast below the minimum" "below the 4.5:1 minimum"
says "check 2 catches a wrong stated ratio" "stated as 9.0 but computes to"
says "check 2 needs data ranges" "Data ranges"
says "check 2 needs a copy deck" "copy.md"
grep -q "SCR-02 has no variant" /tmp/itq-test.out && { echo "FAIL a P2-only screen needs no mockup"; fails=$((fails+1)); } || echo "ok   a P2-only screen needs no mockup"
RATIO=$(node -e "const l=h=>{const[r,g,b]=h.match(/../g).map(x=>{x=parseInt(x,16)/255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};console.log(((l('F6F7F2')+.05)/(l('1B2620')+.05)).toFixed(1))")
sed -i "s/^- Palette: .*/- Palette: Ground #F6F7F2, Ink #1B2620, Accent #0A7A5A, Error #B3261E\n- Type: Inter 16\/24, scale 1.2\n- Design critique: 4.4 \/ 5, PASS/; /#999999/d; s/= 9.0/= $RATIO/" docs/02-ux/ux-spec.md
printf '## Data ranges\n| Value | Min | Max | Source | Handling at the extremes |\n|---|---|---|---|---|\n| Tool name | 1 | 80 chars | AC-01.2 | truncates with ellipsis |\n' >> docs/02-ux/ux-spec.md
printf '# Copy\n## Errors\n- MSG.tool.nameRequired: Give the tool a name.\n' > docs/02-ux/copy.md
echo "<html></html>" > docs/02-ux/mockups/SCR-01-empty.html
expect 0 "approve ux" $Q approve 2

# ---------- stage 3 ----------
$Q start 3 >/dev/null; mkdir -p docs/03-tech/adr
printf -- '---\nid: tech-design\n---\n# T\n## Constitution check\n- P1: FAIL. not yet\n## Values the spec did not set\n- none\n## Stack\nNode 24.1\n## Components\n### C-01 API\n## Screen data\nSCR-01 and SCR-02: listTools\n## Run locally\nnpm start\n' > docs/03-tech/design.md
printf 'openapi: 3.1.0\npaths:\n  /api/tools:\n    get:\n      operationId: listTools\n      x-acceptance: [AC-01.1, AC-01.2, AC-02.1]\n' > docs/03-tech/api.yaml
printf 'tool(id, name)\n' > docs/03-tech/data-model.md
printf -- '---\nstatus: accepted\n---\n# ADR-0001 Node\n' > docs/03-tech/adr/0001-node.md
expect 1 "check 3 fails" $Q check 3
says "check 3 catches a Constitution check FAIL" "Constitution check has a FAIL"
says "check 3 needs one Screen data line per screen" "SCR-02 has no line of its own"
sed -i 's/- P1: FAIL. not yet/- P1: PASS. server-side validation/; s/^SCR-01 and SCR-02: listTools$/SCR-01: name, owner <- listTools\nSCR-02: name <- listTools/' docs/03-tech/design.md
expect 0 "approve tech design" $Q approve 3

# ---------- stage 4 ----------
$Q start 4 >/dev/null
cat > docs/04-plan.md <<'EOF'
---
id: plan
---
# P
### T-001 Walking skeleton
- **Covers:** none
- **Depends:** none
- **Verify:** `npm test`
## P1 stories
### T-002 [P] List
- **Covers:** AC-01.1, AC-01.2
- **Depends:** T-003
- **Test first:** AC-01.1 lists
- **Verify:** open the browser and check the list -> looks right
### T-003 Edit
- **Covers:** AC-02.1
- **Depends:** T-002
- **Verify:** `node --test tests/` -> 1 pass
EOF
expect 1 "check 4 fails" $Q check 4
says "check 4 catches a dependency cycle" "Dependency cycle"
says "check 4 needs '->' and an expected result" "T-001 Verify must be a backticked command"
says "check 4 rejects a manual verify" "T-002 Verify is manual"
says "check 4 rejects a bare directory for node --test" "bare directory"
says "check 4 needs the verify to name the covered criteria" "T-002 Verify or Test first does not name AC-01.2"
cat > docs/04-plan.md <<'EOF'
---
id: plan
---
# P
### T-001 Walking skeleton
- **Covers:** none
- **Depends:** none
- **Verify:** `npm test` -> 1 pass (smoke)
## P1 stories
### T-002 [P] List
- **Covers:** AC-01.1, AC-01.2
- **Depends:** T-001
- **Test first:** AC-01.1 lists, AC-01.2 refuses
- **Verify:** `node --test --test-name-pattern="AC-01" 'tests/**/*.test.js'` -> 2 pass
### T-003 Edit
- **Covers:** AC-02.1
- **Depends:** T-001
- **Verify:** `node --test --test-name-pattern="AC-02.1" 'tests/**/*.test.js'` -> 1 pass
EOF
expect 0 "check 4 passes" $Q check 4
expect 0 "card 4 renders" $Q card 4
says "card 4 shows the task table" "| T-002 | List | AC-01.1, AC-01.2 | T-001 |"
expect 0 "approve plan" $Q approve 4

# ---------- stage 5 ----------
expect 2 "gate blocks app/ before build starts" gate app/x.js
$Q start 5 >/dev/null
expect 0 "gate allows app/ during build" gate app/x.js
expect 0 "bash hook allows app/ during build" shell "mkdir -p app/src"
expect 2 "gate locks the approved plan" gate docs/04-plan.md
expect 2 "gate locks approval snapshots" gate .itqan/approved/stage-4/docs/04-plan.md
mkdir -p app/tests
printf "// AC-02.1 is mentioned only in a comment\ntest('AC-01.1 lists', () => {}); test('AC-01.2 refuses', () => {})\n" > app/tests/a.test.js
echo "# App" > app/README.md
git add -A >/dev/null; git commit -qm "T-001 skeleton"; H1=$(git rev-parse --short HEAD)
printf "T-001 verify: npm test -> 1 pass\nT-001 reviewed COMPLIANT\nT-001 done $H1\nT-002 verify: node --test -> 2 pass\nT-002 done $H1\nT-003 done $H1\n" > .itqan/build-log.md
expect 1 "check 5 fails" $Q check 5
says "check 5 needs app/CLAUDE.md" "app/CLAUDE.md does not exist"
says "check 5 counts criterion ids only in test titles" "AC-02.1 is not named in any test title"
says "check 5 needs a review line per task" "T-002 has no \"T-002 reviewed COMPLIANT\""
says "check 5 needs one commit per task" "name the same commit"
says "check 5 needs commands.json" "commands.json is missing"
echo "# Agent context" > app/CLAUDE.md
printf "test('AC-02.1 edits', () => {})\n" > app/tests/b.test.js
git add -A >/dev/null; git commit -qm "T-002 list"; H2=$(git rev-parse --short HEAD)
git commit -q --allow-empty -m "T-003 edit"; H3=$(git rev-parse --short HEAD)
node -e 'const fs=require("fs");const c={install:"node -e 0",test:"node -e \"console.log(\x27# pass 3\x27);console.log(\x27# skipped 1\x27)\"",start:"node server.js",url:"http://localhost:5000"};fs.writeFileSync(".itqan/commands.json",JSON.stringify(c))'
printf "T-001 verify: npm test -> 1 pass\nT-001 reviewed COMPLIANT\nT-001 done $H1\nT-002 verify: node --test -> 2 pass\nT-002 reviewed COMPLIANT\nT-002 done $H2\nT-003 verify: node --test -> 1 pass\nT-003 reviewed COMPLIANT\nT-003 done $H3\n" > .itqan/build-log.md
expect 1 "check 5 runs the tests and rejects skips" $Q check 5
says "check 5 reports the skipped tests" "skipped or pending"
node -e 'const fs=require("fs");const c={install:"node -e 0",test:"node -e \"process.exit(1)\"",start:"node server.js",url:"http://localhost:5000"};fs.writeFileSync(".itqan/commands.json",JSON.stringify(c))'
expect 1 "check 5 rejects a failing test run" $Q check 5
says "check 5 reports the exit code" "exited with 1"
node -e 'const fs=require("fs");const c={install:"node -e 0",test:"node -e \"console.log(\x27# pass 3\x27);console.log(\x27# skipped 0\x27)\"",start:"node server.js",url:"http://localhost:5000"};fs.writeFileSync(".itqan/commands.json",JSON.stringify(c))'
expect 0 "approve build" $Q approve 5

# ---------- stage 6 ----------
$Q start 6 >/dev/null
printf -- '---\nid: acceptance\n---\n# A\n- AC-01.1 PASS. Evidence: `AC-01.1 shows the list` in `tests/a.test.js`\n- AC-01.2 FAIL. refuses wrongly\n- AC-02.1 PASS. Evidence: `AC-02.1 edits` in `tests/b.test.js`\n' > docs/05-acceptance.md
expect 1 "check 6 fails" $Q check 6
says "check 6 needs a known gap for FAIL" "AC-01.2 is FAIL without"
says "check 6 rejects evidence naming a test that does not exist" "AC-01.1 PASS evidence names no existing test"
says "check 6 needs a line per NFR" "NFR-01 has no PASS or FAIL"
sed -i 's/FAIL. refuses wrongly/FAIL. Known gap: wording/; s/AC-01.1 shows the list/AC-01.1 lists/' docs/05-acceptance.md
echo '- NFR-01 PASS. Evidence: p95 0.4 s over 200 requests' >> docs/05-acceptance.md
expect 0 "card 6 renders" $Q card 6
says "card 6 counts the results" "2 of 3 criteria PASS, 1 FAIL"
expect 0 "approve acceptance" $Q approve 6
expect 0 "reopen stage 1" $Q reopen 1
grep -q "version: 2" docs/01-product-spec.md && echo "ok   reopen bumps the spec version" || { echo "FAIL reopen bumps the spec version"; fails=$((fails+1)); }
grep -q "| 2 | UX Spec | recheck" .itqan/STATUS.md && echo "ok   later stages marked recheck" || { echo "FAIL later stages marked recheck"; fails=$((fails+1)); }
printf '#### US-03 Lend out\nPriority: P2.\n' >> docs/01-product-spec.md
expect 0 "card after reopen renders" $Q card 1
says "card shows what changed since approval" "Added: US-03"

cd /; rm -rf "$T"
echo; [ $fails -eq 0 ] && echo "All assertions passed." || echo "$fails assertion(s) failed."
exit $fails
