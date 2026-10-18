// Unit tests for scripts/scoring.mjs. Run: node tests/scoring.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalise, isCounted, evaluateStage, evaluateIndex, band, decide } from '../scripts/scoring.mjs';

const cards = JSON.parse(fs.readFileSync(new URL('../scorecards.json', import.meta.url), 'utf8'));
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); n++; };

// normalise: higher is better, lower is better, clamping, missing.
eq(normalise(90, 90, 60), 100, 'at target');
eq(normalise(60, 90, 60), 0, 'at floor');
eq(normalise(75, 90, 60), 50, 'midway');
eq(normalise(120, 90, 60), 100, 'clamped above');
eq(normalise(5, 0, 10), 50, 'lower is better midway');
eq(normalise(0, 0, 10), 100, 'lower is better at target');
eq(normalise(20, 0, 10), 0, 'lower is better clamped');
eq(normalise(undefined, 0, 10), null, 'missing');
eq(normalise(3, 3, 3), 100, 'target equals floor, met');

// Counting rules for judge metrics.
const j = { id: 'X', kind: 'score', method: 'J', rubric: 'R2' };
eq(isCounted({ method: 'S' }), true, 'script counted');
eq(isCounted(j, {}), false, 'uncalibrated judge advisory');
eq(isCounted(j, { R2: { decision: 'advisory' } }), false, 'advisory calibration');
eq(isCounted(j, { R2: { decision: 'counted', hash: 'a' } }, { R2: 'a' }), true, 'counted when hash matches');
eq(isCounted(j, { R2: { decision: 'counted', hash: 'a' } }, { R2: 'b' }), false, 'stale hash drops to advisory');
eq(isCounted({ ...j, kind: 'gate' }, { R2: { decision: 'counted' } }), false, 'a counted judge is not yet a gate');
eq(isCounted({ ...j, kind: 'gate' }, { R2: { decision: 'gate' } }), true, 'gate calibration makes a gate');
eq(isCounted({ method: 'J', alwaysCounted: true }), true, 'alwaysCounted');

// Every scorecard: weights add to 100 over score metrics, ids unique.
for (const [k, c] of Object.entries(cards.stages)) {
  const scored = c.metrics.filter((m) => m.kind === 'score');
  if (scored.length) eq(scored.reduce((a, m) => a + m.weight, 0), 100, `stage ${k} weights sum to 100`);
  eq(new Set(c.metrics.map((m) => m.id)).size, c.metrics.length, `stage ${k} ids unique`);
}
for (const [k, idx] of Object.entries(cards.indices)) {
  eq(idx.groups.reduce((a, g) => a + g.weight, 0), 100, `${k} group weights sum to 100`);
  for (const g of idx.groups) eq(g.parts.reduce((a, p) => a + p.w, 0), 100, `${k}/${g.id} part weights sum to 100`);
}

// Stage evaluation on the Product Spec: all gates pass, all scripts perfect, judges uncalibrated.
const P = cards.stages['1'];
const perfect = {};
for (const m of P.metrics) perfect[m.id] = m.kind === 'gate' ? true : m.target;
let r = evaluateStage(P, perfect);
eq(r.failedGates.length, 0, 'no failed gates');
eq(r.stageScore, 100, 'perfect score');
ok(r.advisory.includes('P-S7') && r.advisory.includes('P-S8'), 'uncalibrated judges are advisory');
eq(r.weightUsed, 80, 'weights re-spread over the counted 80');
// Half-way on the smell metric moves the score by its share of the counted weight.
r = evaluateStage(P, { ...perfect, 'P-S1': 5 });
eq(r.stageScore, Math.round(10 * (100 - (25 * 50) / 80)) / 10, 'smell metric moves the score');
// A missing gate counts as failed and is listed as unmeasured.
const noGate = { ...perfect }; delete noGate['P-G1'];
r = evaluateStage(P, noGate);
ok(r.failedGates.includes('P-G1') && r.unmeasured.includes('P-G1'), 'unmeasured gate fails');
// A calibrated judge counts and the weights return to 100.
r = evaluateStage(P, perfect, { R2: { decision: 'counted' }, R3: { decision: 'counted' } });
eq(r.weightUsed, 100, 'calibrated judges counted');
// P-G7 is a judge gate that always counts.
r = evaluateStage(P, { ...perfect, 'P-G7': false });
ok(r.failedGates.includes('P-G7'), 'alwaysCounted judge gate blocks');

// Decision rule.
const d = (cur, hist = [], opts = {}) => decide(P, cur, hist, opts);
const res = (failed, score, metrics = []) => ({ failedGates: failed, stageScore: score, metrics });
eq(d(res([], 90)).decision, 'show-user', 'target met');
eq(d(res(['P-G1'], 90)).decision, 'fix-gates', 'gate failed in round 1');
eq(d(res(['P-G1'], 90), [res(['P-G1'], 70), res(['P-G1'], 72)]).decision, 'stop-ask', 'gate still failing at round 3');
eq(d(res(['P-G2'], 90), [res([], 80)]).decision, 'revert', 'a gate that passed now fails');
const weak = res([], 70, [{ id: 'A', counted: true, weight: 40, score: 50 }, { id: 'B', counted: true, weight: 30, score: 90 }, { id: 'C', counted: true, weight: 10, score: 0 }, { id: 'D', counted: false, weight: 20, score: 0 }]);
const it = d(weak);
eq(it.decision, 'iterate', 'below target iterates');
eq(it.focus[0], 'A', 'largest weighted gap first');
eq(it.focus.length, 3, 'three metrics to fix');
eq(d(res([], 78), [res([], 77)]).decision, 'show-user', 'small gain stops');
eq(d(res([], 50), [res([], 49)]).decision, 'stop-ask', 'below floor stops and asks');
eq(d(res([], 70), [res([], 60), res([], 66)]).decision, 'show-user', 'round limit shows the gaps');
eq(d(res([], 70), [], { budgetLeft: false }).decision, 'show-user', 'budget exhausted shows the gaps');
eq(d(res([], null)).decision, 'show-user', 'an unmeasurable score never loops');
eq(d(res(['P-G1'], null)).decision, 'fix-gates', 'failed gates still come first when the score is unmeasurable');

// Indices.
const ISI = cards.indices.ISI;
const full = {};
for (const g of ISI.groups) for (const p of g.parts) full[p.id] = p.target;
let ix = evaluateIndex(ISI, full);
eq(ix.total, 100, 'perfect ISI');
delete full['I-S3'];
ix = evaluateIndex(ISI, full);
eq(ix.total, 100, 'optional ZAP part dropped without penalty');
delete full['I-M1'];
ix = evaluateIndex(ISI, full);
eq(ix.total, 100, 'a missing required part is left out of the group mean');
ok(ix.groups.find((g) => g.id === 'maintainability').missing.includes('I-M1'), 'missing part reported');
eq(band(ISI, 90, 86), 'ship-ready', 'ship-ready');
eq(band(ISI, 90, 80), 'borderline ship-ready', 'borderline when the lower bound misses');
eq(band(ISI, 75), 'strong-prototype', 'strong prototype');
eq(band(ISI, 90, 90, false), 'not-ready', 'a failed gate means not ready');

console.log(`ok   ${n} assertions`);
