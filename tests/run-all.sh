#!/bin/bash
# Runs every Itqan test. Usage: bash tests/run-all.sh   (exit 0 = everything passed)
cd "$(dirname "$0")/.." || exit 1
fails=0
for t in scoring lint-req calibrate fidelity health ui-states; do
  f="tests/$t.test.mjs"
  [ -f "$f" ] || { echo "skip $t (no $f)"; continue; }
  if node "$f" >/tmp/itq-$t.out 2>&1; then echo "ok   $t"; else echo "FAIL $t"; tail -8 /tmp/itq-$t.out | sed 's/^/     /'; fails=$((fails+1)); fi
done
bash tests/state-tool.sh >/tmp/itq-state.out 2>&1 && echo "ok   state-tool" || { echo "FAIL state-tool"; tail -12 /tmp/itq-state.out | sed 's/^/     /'; fails=$((fails+1)); }
exit $((fails>0))
