#!/bin/bash
# Scale profiles (scales.json): choosing a scale, skipped stages, lighter checks, bundled approvals,
# raising the scale, and that the full scale keeps every rule. Usage: bash tests/scale.sh (exit 0 = all passed)
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ITQAN_NO_LINT=1
Q="node $ROOT/scripts/itq.mjs"
OUT="$(mktemp)"
fails=0
expect() { # expect <exit code> <description> <command...>
  local want=$1 desc=$2; shift 2
  "$@" >"$OUT" 2>&1; local got=$?
  if [ "$got" = "$want" ]; then echo "ok   $desc"; else echo "FAIL $desc (exit $got, wanted $want)"; sed 's/^/     /' "$OUT" | head -12; fails=$((fails+1)); fi
}
says() { if grep -q -- "$2" "$OUT"; then echo "ok   $1"; else echo "FAIL $1 (no \"$2\" in output)"; sed 's/^/     /' "$OUT" | head -12; fails=$((fails+1)); fi
}
lacks() { if grep -q -- "$2" "$OUT"; then echo "FAIL $1 (found \"$2\")"; sed 's/^/     /' "$OUT" | head -12; fails=$((fails+1)); else echo "ok   $1"; fi
}
gate() { echo "{\"cwd\":\"$T\",\"tool_input\":{\"file_path\":\"$T/$1\"}}" | $Q hook-gate; }
newproj() { # newproj <scale>: a fresh project with a recorded vision and the scale chosen
  T="$(mktemp -d)"; command -v cygpath >/dev/null && T="$(cygpath -m "$T")"
  export CLAUDE_PROJECT_DIR="$T"
  cd "$T" && git init -q . && git config user.email t@t && git config user.name t && git config core.autocrlf false
  $Q init >/dev/null; echo "Vision text" > docs/input/vision.md
  $Q record-input docs/input/vision.md vision pasted >/dev/null
  [ -n "${1:-}" ] && $Q scale set "$1" >/dev/null
}
brief() { # brief <stories> [extra sections]: a lite Product Spec with N stories, each with one criterion
  local n=$1 i
  printf -- '---\nid: product-spec\nversion: 1\nstatus: draft\n---\n# Brief\n## Roles and permissions\nEveryone.\n## Stack\nNode 24.1, SQLite 3.45\n## Seed data\nTen realistic records.\n## Features\n### FEAT-01 Lend\n' > docs/01-product-spec.md
  for i in $(seq 1 "$n"); do
    printf '#### US-0%s Story %s\nPriority: P1.\nIndependent test: do it %s.\n##### AC-0%s.1 Does it\nWHEN the user acts, THE SYSTEM SHALL do thing %s.\nExample: a -> b\n' "$i" "$i" "$i" "$i" "$i" >> docs/01-product-spec.md
  done
  printf '## Later\n- Editing a tool\n' >> docs/01-product-spec.md
}
plan() { # plan <n>: T-001 skeleton and one task per story
  local n=$1 i
  printf -- '---\nid: plan\n---\n# Plan\n### T-001 Walking skeleton\n- **Covers:** none\n- **Depends:** none\n- **Verify:** `npm test` -> 1 pass\n' > docs/04-plan.md
  for i in $(seq 1 "$n"); do
    printf '### T-%03d Story %s\n- **Covers:** AC-%02d.1\n- **Depends:** T-001\n- **Test first:** AC-%02d.1 does it\n- **Verify:** `node --test --test-name-pattern="AC-%02d" tests/x.test.js` -> 1 pass\n' "$((i+1))" "$i" "$i" "$i" "$i" >> docs/04-plan.md
  done
}
build() { # build <n stories> <review lines: none|task|batch>
  local n=$1 i
  mkdir -p app/tests; echo "# App" > app/README.md; echo "# Agent" > app/CLAUDE.md
  echo 'const footer = "Prototype and Demo: not included - passwords, editing";' > app/server.js
  : > app/tests/a.test.js; for i in $(seq 1 "$n"); do echo "test('AC-0$i.1 does it', () => {});" >> app/tests/a.test.js; done
  git add -A >/dev/null; git commit -qm "T-001 skeleton"; local h; h=$(git rev-parse --short HEAD)
  printf '{"install":"node -e 0","test":"node -e \\"console.log(1)\\"","start":"node s.js","url":"http://localhost:1"}' > .itqan/commands.json
  printf 'T-001 verify: npm test -> 1 pass\n' > .itqan/build-log.md
  [ "$2" = task ] && printf 'T-001 reviewed COMPLIANT\n' >> .itqan/build-log.md
  printf 'T-001 done %s\n' "$h" >> .itqan/build-log.md
  for i in $(seq 1 "$n"); do
    echo "// task $i" >> app/tests/a.test.js; git add -A >/dev/null; git commit -qm "T-00$((i+1)) story $i"; h=$(git rev-parse --short HEAD)
    printf 'T-00%s verify: node --test -> 1 pass\n' "$((i+1))" >> .itqan/build-log.md
    [ "$2" = task ] && printf 'T-00%s reviewed COMPLIANT\n' "$((i+1))" >> .itqan/build-log.md
    printf 'T-00%s done %s\n' "$((i+1))" "$h" >> .itqan/build-log.md
  done
  [ "$2" = batch ] && printf 'BUILD reviewed COMPLIANT\n' >> .itqan/build-log.md
  return 0
}
report() { # report <n stories>
  local i; printf -- '---\nid: acceptance\n---\n# A\n' > docs/05-acceptance.md
  for i in $(seq 1 "$1"); do printf -- '- AC-0%s.1 PASS. Evidence: `AC-0%s.1 does it` in `tests/a.test.js`\n' "$i" "$i" >> docs/05-acceptance.md; done
}

# ---------- choosing ----------
newproj ""
expect 1 "start refuses until a scale is chosen" $Q start 1
says "the refusal says how to choose" "scale set"
expect 0 "scale list" $Q scale list
says "list shows the prototype row" "Prototype"
says "list shows the full product row" "Full product"
expect 1 "unknown scale is refused" $Q scale set huge
expect 0 "scale set prototype" $Q scale set prototype
expect 0 "status shows the scale" $Q status
says "status names the scale" "Scale: Prototype"
says "status marks Discovery skipped" "| D | Discovery | skipped"
says "status marks the UX Spec skipped" "| 2 | UX Spec | skipped"
expect 0 "scale show" $Q scale show
says "show lists the bundles" "1+4 | 5+6"

# ---------- prototype ----------
expect 1 "a skipped stage cannot be started" $Q start 2
expect 2 "the gate blocks writing a skipped stage" gate docs/02-ux/ux-spec.md
expect 0 "stage 1 starts" $Q start 1
brief 6
expect 1 "check 1 rejects more stories than the prototype allows" $Q check 1
says "the cap message names the limit" "allows 5 stories"
brief 2
sed -i 's/^## Stack$/## Tools/' docs/01-product-spec.md
expect 1 "check 1 needs a Stack section" $Q check 1
says "missing Stack is reported" 'missing the "## Stack"'
brief 2
expect 0 "check 1 passes a brief with no goals, lifecycle or edge cases" $Q check 1
expect 0 "score 1 is gates only and shows the user" $Q score 1
says "the lite score says gates only" "gates only"
plan 12
expect 1 "check 4 rejects more tasks than the prototype allows" $Q check 4
says "the task cap is reported" "allows 8 tasks"
plan 2
expect 0 "check 4 passes" $Q check 4
expect 0 "card for a bundle" $Q card 1 4
says "the bundle card has a combined header" "Combined review: stages 1 and 4"
says "the card lists what the scale leaves out" "Not included at this scale"
expect 1 "approving out of order is refused" $Q approve 4 1
expect 0 "approve the bundle in order" $Q approve 1 4
expect 0 "stage 5 starts" $Q start 5
build 2 none
mv app/server.js app/server.txt
expect 1 "check 5 wants the app to show its scale" $Q check 5
says "the missing scale note is named" "never says what it is"
mv app/server.txt app/server.js
expect 0 "check 5 needs no review lines at the prototype scale" $Q check 5
$Q start 6 >/dev/null 2>&1
report 2
expect 0 "check 6 passes" $Q check 6
expect 0 "approve 5 and 6 together" $Q approve 5 6
expect 0 "the quality index is full-scale only" $Q index x.json
says "index explains itself" "only at the Full product scale"
cd /;

# ---------- usage ----------
fake_transcript() { # fake_transcript <usd> <context tokens>: a transcript like Claude Code writes, in a throwaway config dir
  CFG="$(mktemp -d)"; export CLAUDE_CONFIG_DIR="$CFG"
  local key; key="$(echo "$T" | sed 's/[^A-Za-z0-9]/-/g')"; mkdir -p "$CFG/projects/$key"
  printf '{"type":"assistant","message":{"id":"m1","usage":{"input_tokens":2,"cache_read_input_tokens":%s,"cache_creation_input_tokens":10,"output_tokens":5}}}\n{"type":"cost-state","sessionId":"s1","totalCostUSD":%s}\n' "$2" "$1" > "$CFG/projects/$key/s1.jsonl"
}
newproj prototype
CLAUDE_CONFIG_DIR="$(mktemp -d)"; export CLAUDE_CONFIG_DIR
expect 0 "usage with no transcripts is unknown, not zero" $Q usage
says "unknown spend is said so" "Recorded spend: none yet"
fake_transcript 2.5 200000
expect 0 "usage under budget exits 0" $Q usage
says "usage shows the recorded spend as a share of the allowance" 'Recorded spend: $2.50'
says "usage shows the live context" "Context now: 200k tokens"
says "a large context gets the fresh-session advice" "run /clear"
fake_transcript 3.5 50000
expect 1 "usage over budget exits 1" $Q usage
says "over budget is said" "Over budget"
newproj full
fake_transcript 40 200000
expect 0 "the full scale has no usage budget" $Q usage
says "full says so" "no usage budget"
lacks "a 200k context is fine at the full scale" "run /clear"
unset CLAUDE_CONFIG_DIR
newproj prototype
$Q start 1 >/dev/null; brief 5; plan 7
expect 0 "an over-budget forecast is a warning, not an error" $Q check 4
says "the forecast warning is shown" "Forecast: 8 tasks"
expect 0 "card 4 shows the forecast" $Q card 4
says "card 4 flags the budget" "Over budget"
cd /

# ---------- raising the scale ----------
newproj prototype
$Q start 1 >/dev/null; brief 2; plan 2; $Q approve 1 4 >/dev/null
expect 0 "raise prototype to demo" $Q scale set demo
says "raising reports stage 2 now runs" "2 now runs"
says "raising reports the approved stages that need a recheck" "needs a recheck"
$Q status | grep -q "| 1 | Product Spec | recheck" && echo "ok   an approved stage goes to recheck" || { echo "FAIL an approved stage goes to recheck"; fails=$((fails+1)); }
$Q status | grep -q "| 2 | UX Spec | pending" && echo "ok   a newly required stage is pending" || { echo "FAIL a newly required stage is pending"; fails=$((fails+1)); }
cd /

# ---------- demo ----------
newproj demo
$Q start 1 >/dev/null; brief 3; plan 3
printf '## Roles and permissions\nEveryone.\n' > /dev/null
expect 0 "demo check 1 passes without edge cases or lifecycle" $Q check 1
expect 0 "approve the demo brief alone" $Q approve 1
expect 1 "lowering the scale after work is refused" $Q scale set prototype
says "the refusal explains" "work has started"
$Q start 2 >/dev/null; mkdir -p docs/02-ux/mockups
cat > docs/02-ux/ux-spec.md <<'EOF'
---
id: ux-spec
---
# UX
## Design system
Decision: plain CSS with tokens
## Visual direction
- Palette: Ground #F6F7F2, Ink #1B2620, Accent #0A7A5A, Error #B3261E
- Type: Inter 16/24, scale 1.2
- Contrast: #1B2620 on #F6F7F2 = 14.0
- Design critique: 4.1 / 5, PASS
## Screens
### SCR-01 Tools
Serves AC-01.1, AC-02.1, AC-03.1. Empty, Loading, Error, Success.
EOF
cp "$ROOT/templates/tokens.json" docs/02-ux/tokens.json; echo "<html></html>" > docs/02-ux/mockups/SCR-01.html
RATIO=$(node -e "const l=h=>{const[r,g,b]=h.match(/../g).map(x=>{x=parseInt(x,16)/255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};console.log(((l('F6F7F2')+.05)/(l('1B2620')+.05)).toFixed(1))")
sed -i "s/= 14.0/= $RATIO/" docs/02-ux/ux-spec.md
expect 0 "demo check 2 needs no variants, data ranges or copy deck" $Q check 2
expect 0 "approve UX and plan as one bundle" $Q approve 2 4
$Q start 5 >/dev/null; build 3 batch
sed -i '/BUILD reviewed/d' .itqan/build-log.md
expect 1 "demo check 5 wants one batch review line" $Q check 5
says "the missing batch review is named" "BUILD reviewed COMPLIANT"
echo "BUILD reviewed COMPLIANT" >> .itqan/build-log.md
expect 0 "demo check 5 passes with the batch review" $Q check 5
cd /

# ---------- mvp ----------
newproj mvp
$Q start 0 >/dev/null
printf -- '---\nid: constitution\nversion: 1\nstatus: draft\n---\n# C\n## Principles\n1. **P1** MUST a. Reason: x.\n2. **P2** SHOULD b. Reason: y.\n3. **P3** MUST c. Reason: z.\n## Quality bar\n- **Performance:** p95 page load < 2 s\n- **Accessibility:** WCAG 2.2 AA\n- **Browsers / devices:** current Chrome and Safari\n## Constraints\n- OWASP ASVS 5.0 Level 1\n## Boundaries\n- Always: a\n- Ask first: b\n- Never: c\n' > docs/00-constitution.md
expect 0 "mvp check 0 needs no quality-attribute scenarios" $Q check 0
expect 1 "mvp approval needs a score round" $Q approve 0
says "the score is demanded" "no score yet"
expect 0 "score 0 gates only" $Q score 0
expect 0 "approve the constitution" $Q approve 0
cd /

# ---------- mvp cap ----------
mvpspec() { # mvpspec <stories> <with Later: yes|no>: a full-form spec for the MVP scale
  local n=$1 i
  printf -- '---\nid: product-spec\nversion: 1\nstatus: draft\n---\n# S\n## Goals and success measures\n- G-01: listing takes under 1 minute.\n## Clarifications\n- none\n## Roles and permissions\nx\n## Interpretations\n- none\n## Features\n### FEAT-01 Lend\n' > docs/01-product-spec.md
  for i in $(seq 1 "$n"); do
    printf '#### US-%02d Story %s\nPriority: P1. Source: vision.\nIndependent test: do it %s.\n##### AC-%02d.1 Does it\nWHEN the user acts, THE SYSTEM SHALL do thing %s.\nExample: a -> b\n' "$i" "$i" "$i" "$i" "$i" >> docs/01-product-spec.md
  done
  printf '## Edge cases\n- Dates and times: n/a\n- Quantities and text: n/a\n- Permissions: n/a\n- State changes: n/a\n- Multiple users: n/a\n- Notifications: n/a\n- Undo and recovery: n/a\n' >> docs/01-product-spec.md
  [ "$2" = yes ] && printf '## Later\n- Notices when promoted from a waitlist\n' >> docs/01-product-spec.md
  return 0
}
newproj mvp
$Q start 0 >/dev/null 2>&1; mvpspec 15 yes
expect 1 "mvp check 1 rejects more than 14 stories" $Q check 1
says "the MVP cap is named" "allows 14 stories"
mvpspec 14 no
expect 1 "mvp check 1 needs a Later section" $Q check 1
says "the missing Later section is named" 'missing the "## Later"'
mvpspec 14 yes
expect 0 "mvp check 1 passes with 14 stories and a Later section" $Q check 1
plan 17
expect 1 "mvp check 4 rejects more than 16 tasks" $Q check 4
says "the MVP task cap is named" "allows 16 tasks"
cd /

# ---------- full keeps every rule ----------
newproj full
$Q start D >/dev/null 2>&1
printf -- '---\nid: discovery\n---\n# D\n' > docs/00-discovery.md
expect 1 "full still checks Discovery" $Q check D
newproj full
$Q status > "$OUT"; says "status of a full project names the scale" "Scale: Full product"
lacks "no stage is skipped at the full scale" "skipped"
cd /

echo; [ $fails -eq 0 ] && echo "All scale assertions passed." || echo "$fails scale assertion(s) failed."
exit $fails
