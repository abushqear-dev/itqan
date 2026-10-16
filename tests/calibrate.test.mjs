// Tests for scripts/calibrate.mjs, seed-defects.mjs and grading-page.mjs. Run: node tests/calibrate.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  weightedKappa, krippendorffAlphaOrdinal, spearman, bootstrapCI, mulberry32, rate,
  calibrate, decide, calibrationHash, rubricHash, pairVerdict,
} from '../scripts/calibrate.mjs';
import { seed, parseBlocks } from '../scripts/seed-defects.mjs';
import { buildPage, renderMarkdown } from '../scripts/grading-page.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok', name); };
const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} not within ${eps} of ${b}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'itqan-cal-'));

// ---------- textbook reference values ----------
test('kappa: Wikipedia "Cohen\'s kappa" 2x2 example (20/5/10/15) = 0.4', () => {
  // Two raters, 50 items: both yes 20, A yes/B no 5, A no/B yes 10, both no 15.
  const a = [], b = [];
  const add = (x, y, c) => { for (let i = 0; i < c; i++) { a.push(x); b.push(y); } };
  add(1, 1, 20); add(1, 2, 5); add(2, 1, 10); add(2, 2, 15);
  near(weightedKappa(a, b, 1, 2), 0.4, 1e-9); // with two levels the quadratic weights reduce to plain kappa
});
test('kappa: hand-computed quadratic-weighted example = 0.8', () => {
  // levels 1-3, a=[1,2,3], b=[1,3,3]: observed disagreement 1/12, expected 5/12 -> 1 - 0.2 = 0.8
  near(weightedKappa([1, 2, 3], [1, 3, 3], 1, 3), 0.8, 1e-9);
});
test('kappa: identical ratings = 1, opposite extremes < 0', () => {
  assert.equal(weightedKappa([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), 1);
  assert.ok(weightedKappa([1, 1, 5, 5], [5, 5, 1, 1]) < 0);
});
test("alpha: Krippendorff (2011) / Wikipedia 4-coder example, ordinal = 0.815", () => {
  // Data: 4 coders, 12 units, missing values omitted. The same data gives nominal 0.743, interval 0.849.
  const A = [1, 2, 3, 3, 2, 1, 4, 1, 2, null, null, null];
  const B = [1, 2, 3, 3, 2, 2, 4, 1, 2, 5, null, 3];
  const C = [null, 3, 3, 3, 2, 3, 4, 2, 2, 5, 1, null];
  const D = [1, 2, 3, 3, 2, 4, 4, 1, 2, 5, 1, null];
  const units = A.map((_, i) => [A[i], B[i], C[i], D[i]].filter((v) => v !== null));
  near(krippendorffAlphaOrdinal(units), 0.815, 5e-4);
});
test('rho: Wikipedia Spearman example (IQ vs hours of TV) = -29/165', () => {
  near(spearman([106, 100, 86, 101, 99, 103, 97, 113, 112, 110], [7, 27, 2, 50, 28, 29, 20, 12, 6, 17]), -29 / 165, 1e-12);
});
test('rho: ties use average ranks', () => {
  near(spearman([1, 2, 2, 3], [1, 2, 2, 3]), 1, 1e-12);
});

// ---------- bootstrap ----------
test('bootstrap is reproducible and brackets the estimate', () => {
  const items = Array.from({ length: 60 }, (_, i) => i % 5 !== 0);
  const r1 = bootstrapCI(items, rate), r2 = bootstrapCI(items, rate);
  assert.deepEqual(r1, r2);
  assert.ok(r1.lo <= r1.value && r1.value <= r1.hi);
  assert.equal(mulberry32(5)(), mulberry32(5)());
});

// ---------- decision logic, end to end ----------
const mkGraded = (n, noise) => {
  const rand = mulberry32(3);
  const truth = [], judge = [];
  for (let i = 0; i < n; i++) {
    const t = 1 + (i % 5);
    const j = Math.min(5, Math.max(1, t + (rand() < noise ? (rand() < 0.5 ? -1 : 1) : 0)));
    truth.push({ id: `i${i}`, level: t }); judge.push({ id: `i${i}`, level: j });
  }
  return { truth, judge };
};
test('graded: near-perfect judge on 100 items is counted/gate; coin-flip judge is advisory', () => {
  const good = mkGraded(100, 0.05);
  const r = calibrate({ truth: good.truth, judgeDoc: { model: 'm', prompt_hash: 'p', items: good.judge } });
  assert.ok(['counted', 'gate'].includes(r.decision), r.decision);
  assert.ok(r.metrics.kappa.lo > 0.6);
  const rand = mulberry32(9);
  const bad = good.truth.map((t) => ({ id: t.id, level: 1 + Math.floor(rand() * 5) }));
  assert.equal(calibrate({ truth: good.truth, judgeDoc: bad }).decision, 'advisory');
});
test('graded: perfect judge becomes gate; ceiling gap blocks the gate', () => {
  const { truth } = mkGraded(100, 0);
  const perfect = truth.map((t) => ({ id: t.id, level: t.level }));
  assert.equal(calibrate({ truth, judgeDoc: perfect }).decision, 'gate');
  // humans agree perfectly (ceiling 1.0); a judge with some error is not within 0.1 of it
  const noisy = mkGraded(100, 0.6);
  assert.equal(calibrate({ truth, judgeDoc: noisy.judge }).decision, 'gate'); // without humans the gap rule does not apply
  const r = calibrate({ truth, judgeDoc: noisy.judge, humanA: truth, humanB: truth });
  assert.equal(r.decision, 'counted');
});
test('ceiling < 0.6 reports anchors-need-rewrite, per dimension', () => {
  const truth = [], a = [], b = [];
  for (let i = 0; i < 40; i++) {
    const dim = i < 20 ? 'Hierarchy' : 'Colour';
    truth.push({ id: `i${i}`, level: 1 + (i % 5), dimension: dim });
    a.push({ id: `i${i}`, level: 1 + (i % 5), dimension: dim });
    b.push({ id: `i${i}`, level: dim === 'Colour' ? 1 + ((i * 3 + 1) % 5) : 1 + (i % 5), dimension: dim });
  }
  const r = calibrate({ truth, judgeDoc: truth, humanA: a, humanB: b });
  assert.equal(r.decision, 'anchors-need-rewrite');
  assert.match(r.checks[0].name, /Colour/);
});
test('defects: thresholds use the interval bounds, not the point estimate', () => {
  const mk = (nd, nc, caught, falseAlarms) => {
    const truth = [], judge = [];
    for (let i = 0; i < nd; i++) { truth.push({ id: `d${i}`, defect: true }); judge.push({ id: `d${i}`, flagged: i < caught }); }
    for (let i = 0; i < nc; i++) { truth.push({ id: `c${i}`, defect: false }); judge.push({ id: `c${i}`, flagged: i < falseAlarms }); }
    return calibrate({ truth, judgeDoc: judge });
  };
  assert.equal(mk(200, 200, 200, 0).decision, 'gate');
  assert.equal(mk(200, 200, 176, 10).decision, 'counted'); // recall 0.88, false alarm 0.05
  // 20 defects, 18 caught: point recall 0.9 but the lower bound is under 0.8 with so few items
  assert.equal(mk(20, 20, 18, 0).decision, 'advisory');
  assert.equal(mk(100, 100, 95, 40).decision, 'advisory'); // false alarms 0.4
});
test('too few clean items cannot clear a threshold', () => {
  const truth = [], judge = [];
  for (let i = 0; i < 30; i++) { truth.push({ id: `d${i}`, defect: true }); judge.push({ id: `d${i}`, flagged: true }); }
  truth.push({ id: 'c0', defect: false }); judge.push({ id: 'c0', flagged: false });
  assert.equal(calibrate({ truth, judgeDoc: judge }).decision, 'advisory');
});
test('fact: agreement thresholds 0.85 count, 0.95 gate', () => {
  const mk = (n, wrong) => {
    const truth = Array.from({ length: n }, (_, i) => ({ id: `c${i}`, label: 'supported' }));
    const judge = truth.map((t, i) => ({ id: t.id, label: i < wrong ? 'unsupported' : 'supported' }));
    return calibrate({ truth, judgeDoc: judge }).decision;
  };
  assert.equal(mk(400, 0), 'gate');
  assert.equal(mk(400, 20), 'counted'); // 0.95 point, lower bound ~0.93
  assert.equal(mk(400, 80), 'advisory');
});
test('pairs: flips become Tie, ties in truth are ignored, pairs never gate', () => {
  assert.equal(pairVerdict({ choice: 'A', choice_swapped: 'B' }), 'Tie');
  const truth = [], judge = [];
  for (let i = 0; i < 100; i++) {
    truth.push({ id: `p${i}`, choice: i % 10 === 0 ? 'Tie' : 'A' });
    judge.push({ id: `p${i}`, choice: 'A', choice_swapped: 'A' });
  }
  const r = calibrate({ truth, judgeDoc: judge });
  assert.equal(r.metrics.agreement.n, 90);
  assert.equal(r.metrics.flip_rate.value, 0);
  assert.equal(r.decision, 'counted');
});
test('calibration file shape and staleness hash', () => {
  const { truth, judge } = mkGraded(50, 0);
  const r = calibrate({ truth, judgeDoc: { model: 'claude-x', prompt_hash: 'abc', items: judge }, rubric: 'R2', rubricText: 'rubric v1', version: '1', now: new Date('2026-01-01T00:00:00Z') });
  for (const k of ['rubric', 'version', 'judge', 'n', 'metrics', 'decision', 'at', 'hash']) assert.ok(k in r, k);
  assert.equal(r.judge.model, 'claude-x');
  assert.equal(r.hash, rubricHash('rubric v1'));
  assert.equal(r.judge_hash, calibrationHash('rubric v1', 'claude-x', 'abc'));
  assert.notEqual(r.hash, calibrationHash('rubric v2', 'claude-x', 'abc'));
  assert.deepEqual(Object.keys(r.metrics.kappa), ['value', 'lo', 'hi', 'n']);
});
test('decide() with no checks is advisory', () => assert.equal(decide({}).decision, 'advisory'));

test('CLI writes the calibration file', () => {
  const { truth, judge } = mkGraded(40, 0);
  const t = path.join(tmp, 'truth.json'), j = path.join(tmp, 'judge.json'), out = path.join(tmp, 'out', 'R2.calibration.json');
  fs.writeFileSync(t, JSON.stringify(truth)); fs.writeFileSync(j, JSON.stringify({ model: 'm', prompt_hash: 'h', items: judge }));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/calibrate.mjs'), '--truth', t, '--judge', j, '--rubric', 'R2', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).rubric, 'R2');
});

// ---------- seed-defects ----------
const SPEC = `# Product Spec: Test

## Roles and permissions
- **Member:** joins shifts
- **Lead:** assigns members

## Features

### FEAT-01 Shifts

#### US-01 Join
As a Member, I want to join a shift so that I can help.

##### AC-01.1 Join
WHEN a Member selects Join, THE SYSTEM SHALL add the Member to the shift.
Example: Member taps Join on Monday shift -> roster shows Member (MSG.JOINED).

##### AC-01.2 Full shift
IF a shift is full, THEN THE SYSTEM SHALL refuse the join.
Example: 10th person joins a 9-spot shift -> MSG.FULL.

##### AC-01.3 Leave
WHEN a Member selects Leave, THE SYSTEM SHALL remove the Member from the shift.
Example: Member taps Leave -> roster no longer lists Member.

## Non-functional requirements

### NFR-01 Speed
THE SYSTEM SHALL respond quickly.
Measure: p95 under 300 ms.
Verify: load test.
`;
test('seed-defects: deterministic, one defect per copy, truth matches the text', () => {
  const src = [{ name: 'spec.md', text: SPEC }];
  const a = seed({ sources: src, n: 16, seed: 4 }), b = seed({ sources: src, n: 16, seed: 4 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(seed({ sources: src, n: 16, seed: 5 }), a);
  const planted = a.filter((x) => x.defect);
  assert.equal(planted.length, 16);
  assert.equal(a.filter((x) => !x.defect).length, 1);
  assert.equal(a.find((x) => !x.defect).text, SPEC);
  assert.equal(new Set(a.map((x) => x.id)).size, a.length);
  for (const p of planted) {
    assert.notEqual(p.text, SPEC, p.type);
    assert.ok(!/design-leak|contradiction/.test(p.id), 'ids are neutral');
  }
  const types = new Set(planted.map((p) => p.type));
  assert.equal(types.size, 8, [...types].join());
  const leak = planted.find((p) => p.type === 'design-leak');
  assert.match(leak.text, /PostgreSQL/);
  assert.ok(!parseBlocks(planted.find((p) => p.type === 'missing-example').text).blocks.every((b) => b.example !== undefined));
  assert.match(planted.find((p) => p.type === 'vague-nfr').text, /fast and user-friendly/);
  assert.match(planted.find((p) => p.type === 'undefined-role').text, /Regional Auditor/);
});
test('seed-defects CLI writes items and truth.json identically on a second run', () => {
  const spec = path.join(tmp, 'spec.md'); fs.writeFileSync(spec, SPEC);
  const run = (out) => spawnSync(process.execPath, [path.join(ROOT, 'scripts/seed-defects.mjs'), '--from', spec, '--out', out, '--n', '10'], { encoding: 'utf8' });
  const o1 = path.join(tmp, 'g1'), o2 = path.join(tmp, 'g2');
  assert.equal(run(o1).status, 0); assert.equal(run(o2).status, 0);
  assert.equal(fs.readFileSync(path.join(o1, 'truth.json'), 'utf8'), fs.readFileSync(path.join(o2, 'truth.json'), 'utf8'));
  const truth = JSON.parse(fs.readFileSync(path.join(o1, 'truth.json'), 'utf8'));
  assert.equal(truth.length, 11);
  assert.ok(truth.every((t) => fs.existsSync(path.join(o1, 'items', `${t.id}.md`))));
  assert.ok(truth.filter((t) => t.defect).every((t) => t.type && t.location));
});

// ---------- grading page ----------
test('grading page: self-contained, hides truth, inline script parses', () => {
  const set = path.join(tmp, 'G-R2'); fs.mkdirSync(path.join(set, 'items'), { recursive: true });
  fs.writeFileSync(path.join(set, 'items', 'g001.md'), 'AC text with </script><b>tag</b> & stuff');
  fs.writeFileSync(path.join(set, 'items', 'g002.md'), 'second');
  fs.writeFileSync(path.join(set, 'items', 'g003.png'), Buffer.from('iVBORw0KGgo=', 'base64'));
  fs.writeFileSync(path.join(set, 'truth.json'), JSON.stringify([{ id: 'g001', defect: true, type: 'SECRETTYPE' }]));
  const html = buildPage({ setDir: set, rubric: 'R99' });
  assert.ok(!html.includes('SECRETTYPE') && !/\bsrc="https?:/.test(html) && !/href="https?:/.test(html));
  assert.ok(html.includes('not written yet'), 'placeholder when the rubric file is missing');
  assert.ok(html.includes('data:image/png;base64,'));
  const scripts = [...html.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  const f = path.join(tmp, 'inline.js'); fs.writeFileSync(f, scripts[0][1]);
  const chk = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  assert.equal(chk.status, 0, chk.stderr);
  const data = JSON.parse(html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.items.length, 3);
  assert.ok(data.items.find((i) => i.id === 'g001').main.text.includes('</script>'));
});
test('rubric markdown renders tables escaped', () => {
  const h = renderMarkdown('# R\n| Level | Anchor |\n|---|---|\n| 5 | <b>x</b> |');
  assert.match(h, /<th>Level<\/th>/); assert.match(h, /&lt;b&gt;/);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} tests passed`);
