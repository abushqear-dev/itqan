#!/usr/bin/env node
// Judge calibration statistics (calibration-plan.md sections 3 and 4). Node ESM, no dependencies.
//
// Usage:
//   node scripts/calibrate.mjs --truth truth.json --judge judge.json [--rubric R2] [--rubric-version 1]
//        [--human-a a.json --human-b b.json] [--out rubrics/R2.calibration.json]
//
// INPUT FORMATS (all JSON; an item is matched across files by `id`)
//   truth.json   array of items, each with ONE kind of ground truth:
//     graded      { id, level: 1-5, dimension?, group? }   dimension: kappa is also computed per dimension
//                                                          group: items with the same group are summed for rho on totals
//     defect      { id, defect: true|false, type?, location? }   (seeded sets; false = clean original)
//     fact        { id, label: "supported"|"partial"|"unsupported"|... }
//     pair        { id, choice: "A"|"B"|"Tie" }
//     An item may carry level AND defect (a graded seeded set): both families are then scored and both must pass.
//   judge.json   array of items, or { model, prompt_hash, items: [...] }:
//     { id, level } | { id, flagged: bool } | { id, label } |
//     { id, choice, choice_swapped }   verdicts for the two presentation orders, both mapped back to the
//                                      ORIGINAL labels. Equal -> that verdict; different -> Tie and counted as a flip.
//   human-a/b    graded items { id, level, dimension? }; used for the ceiling (human-to-human kappa).
// Pairs: truth ties are excluded from agreement; a judge Tie against a truth A/B counts as a miss.
// Thresholds: "passes" means the lower bound of the 95% interval clears a minimum, or the upper bound of a
// rate-to-be-low (false alarm, flip rate) stays under its maximum.
// Decision: advisory | counted | gate | anchors-need-rewrite (human ceiling kappa < 0.6 on any dimension).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SEED = 20261016;
export const RESAMPLES = 2000;
export const THRESHOLDS = {
  graded: { count: { kappa: 0.6, rho: 0.7 }, gate: { alpha: 0.8, ceilingGap: 0.1 } },
  defect: { count: { recall: 0.8, falseAlarm: 0.2 }, gate: { recall: 0.9, falseAlarm: 0.1 } },
  fact: { count: { agreement: 0.85 }, gate: { agreement: 0.95 } },
  pair: { count: { agreement: 0.7, flip: 0.2 } },
  ceiling: 0.6,
};

// ---------- statistics ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Quadratic-weighted Cohen's kappa for two ratings arrays over ordinal levels min..max. */
export function weightedKappa(a, b, min = 1, max = 5) {
  const k = max - min + 1;
  const n = a.length;
  if (n === 0 || k < 2) return NaN;
  const O = Array.from({ length: k }, () => new Array(k).fill(0));
  const ra = new Array(k).fill(0), rb = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const x = a[i] - min, y = b[i] - min;
    O[x][y] += 1; ra[x] += 1; rb[y] += 1;
  }
  let num = 0, den = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
    const w = ((i - j) ** 2) / ((k - 1) ** 2);
    num += w * O[i][j] / n;
    den += w * (ra[i] * rb[j]) / (n * n);
  }
  if (den === 0) return num === 0 ? 1 : NaN; // both raters constant and equal: trivially identical
  return 1 - num / den;
}

/** Krippendorff's alpha, ordinal metric. `units` = array of arrays of values (missing values left out). */
export function krippendorffAlphaOrdinal(units) {
  const vals = [...new Set(units.flat())].sort((x, y) => x - y);
  const idx = new Map(vals.map((v, i) => [v, i]));
  const m = vals.length;
  const o = Array.from({ length: m }, () => new Array(m).fill(0));
  for (const u of units) {
    if (u.length < 2) continue;
    for (let i = 0; i < u.length; i++) for (let j = 0; j < u.length; j++) {
      if (i !== j) o[idx.get(u[i])][idx.get(u[j])] += 1 / (u.length - 1);
    }
  }
  const nc = o.map((row) => row.reduce((s, x) => s + x, 0));
  const n = nc.reduce((s, x) => s + x, 0);
  if (n <= 1) return NaN;
  const delta = (c, k) => {
    if (c === k) return 0;
    const [lo, hi] = c < k ? [c, k] : [k, c];
    let s = 0;
    for (let g = lo; g <= hi; g++) s += nc[g];
    return (s - (nc[lo] + nc[hi]) / 2) ** 2;
  };
  let Do = 0, De = 0;
  for (let c = 0; c < m; c++) for (let k = 0; k < m; k++) {
    Do += o[c][k] * delta(c, k);
    De += nc[c] * nc[k] * delta(c, k);
  }
  Do /= n; De /= n * (n - 1);
  if (De === 0) return Do === 0 ? 1 : NaN;
  return 1 - Do / De;
}

function ranks(xs) {
  const order = xs.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    for (let t = i; t <= j; t++) r[order[t][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

/** Spearman rho = Pearson correlation of average ranks (ties handled). */
export function spearman(x, y) {
  if (x.length < 2) return NaN;
  const rx = ranks(x), ry = ranks(y);
  const mx = mean(rx), my = mean(ry);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < rx.length; i++) {
    sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}

export const rate = (flags) => (flags.length ? flags.filter(Boolean).length / flags.length : NaN);

/** Percentile bootstrap. `stat` takes an array of resampled items. Seeded, so reproducible. */
export function bootstrapCI(items, stat, { seed = SEED, resamples = RESAMPLES } = {}) {
  const value = stat(items);
  const rand = mulberry32(seed);
  const n = items.length;
  const out = [];
  for (let r = 0; r < resamples; r++) {
    const s = new Array(n);
    for (let i = 0; i < n; i++) s[i] = items[Math.floor(rand() * n)];
    const v = stat(s);
    if (Number.isFinite(v)) out.push(v);
  }
  out.sort((p, q) => p - q);
  const q = (p) => (out.length ? out[Math.min(out.length - 1, Math.max(0, Math.floor(p * out.length)))] : NaN);
  return { value, lo: q(0.025), hi: q(0.975), n };
}

// ---------- metrics from items ----------
const round = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);
const tidy = (m) => ({ value: round(m.value), lo: round(m.lo), hi: round(m.hi), n: m.n });

const kappaStat = (rows) => weightedKappa(rows.map((r) => r[0]), rows.map((r) => r[1]));
const rhoStat = (rows) => spearman(rows.map((r) => r[0]), rows.map((r) => r[1]));
const alphaStat = (rows) => krippendorffAlphaOrdinal(rows.map((r) => [r[0], r[1]]));

const byId = (list) => new Map(list.map((it) => [String(it.id), it]));

/** Joins truth with another item list on id into { x, y, dimension, group } rows for the `level` field. */
function joinLevels(truth, other) {
  const o = byId(other);
  const missing = [];
  const rows = [];
  for (const t of truth) {
    if (typeof t.level !== 'number') continue;
    const j = o.get(String(t.id));
    if (!j || typeof j.level !== 'number') { missing.push(t.id); continue; }
    rows.push({ x: t.level, y: j.level, dimension: t.dimension, group: t.group });
  }
  return { rows, missing };
}

export function gradedMetrics(truth, judge) {
  const { rows, missing } = joinLevels(truth, judge);
  const tuples = rows.map((r) => [r.x, r.y]);
  const metrics = { kappa: tidy(bootstrapCI(tuples, kappaStat)), alpha: tidy(bootstrapCI(tuples, alphaStat)) };
  const dims = [...new Set(rows.map((r) => r.dimension).filter(Boolean))];
  if (dims.length) {
    metrics.kappa_by_dimension = {};
    for (const d of dims) {
      metrics.kappa_by_dimension[d] = tidy(bootstrapCI(rows.filter((r) => r.dimension === d).map((r) => [r.x, r.y]), kappaStat));
    }
  }
  // rho on totals: sum per group when groups exist, else per item
  let totals = tuples;
  if (rows.some((r) => r.group)) {
    const g = new Map();
    rows.forEach((r, i) => {
      const k = r.group ?? `__${i}`;
      const cur = g.get(k) ?? [0, 0];
      g.set(k, [cur[0] + r.x, cur[1] + r.y]);
    });
    totals = [...g.values()];
  }
  metrics.rho = tidy(bootstrapCI(totals, rhoStat));
  return { metrics, missing };
}

export function defectMetrics(truth, judge) {
  const j = byId(judge);
  const flagged = (t) => j.get(String(t.id))?.flagged === true;
  const defects = truth.filter((t) => t.defect === true);
  const clean = truth.filter((t) => t.defect === false);
  const missing = truth.filter((t) => typeof t.defect === 'boolean' && !j.has(String(t.id))).map((t) => t.id);
  const metrics = {};
  if (defects.length) metrics.recall = tidy(bootstrapCI(defects, (s) => rate(s.map(flagged))));
  if (clean.length) metrics.false_alarm = tidy(bootstrapCI(clean, (s) => rate(s.map(flagged))));
  return { metrics, missing };
}

export function factMetrics(truth, judge) {
  const j = byId(judge);
  const rows = truth.filter((t) => t.label != null).map((t) => ({ t: t.label, j: j.get(String(t.id))?.label }));
  const missing = truth.filter((t) => t.label != null && j.get(String(t.id))?.label == null).map((t) => t.id);
  return { metrics: { agreement: tidy(bootstrapCI(rows, (s) => rate(s.map((r) => r.t === r.j)))) }, missing };
}

export const pairVerdict = (it) => (it.choice === it.choice_swapped ? it.choice : 'Tie');

export function pairMetrics(truth, judge) {
  const j = byId(judge);
  const rows = truth.filter((t) => t.choice != null && j.has(String(t.id))).map((t) => {
    const ji = j.get(String(t.id));
    return { truth: t.choice, verdict: pairVerdict(ji), flip: ji.choice !== ji.choice_swapped };
  });
  const missing = truth.filter((t) => t.choice != null && !j.has(String(t.id))).map((t) => t.id);
  const decided = rows.filter((r) => r.truth !== 'Tie');
  return {
    metrics: {
      agreement: tidy(bootstrapCI(decided, (s) => rate(s.map((r) => r.truth === r.verdict)))),
      flip_rate: tidy(bootstrapCI(rows, (s) => rate(s.map((r) => r.flip)))),
    },
    missing,
  };
}

/** Human-to-human ceiling: weighted kappa overall and per dimension. */
export function ceiling(humanA, humanB) {
  const { rows } = joinLevels(humanA, humanB);
  const out = { overall: tidy(bootstrapCI(rows.map((r) => [r.x, r.y]), kappaStat)), by_dimension: {} };
  for (const d of new Set(rows.map((r) => r.dimension).filter(Boolean))) {
    out.by_dimension[d] = tidy(bootstrapCI(rows.filter((r) => r.dimension === d).map((r) => [r.x, r.y]), kappaStat));
  }
  return out;
}

// ---------- decision ----------
export const MIN_N = 10; // fewer items than this give a degenerate interval, so no threshold is cleared
const ge = (m, min) => m != null && m.n >= MIN_N && m.lo != null && m.lo >= min;
const le = (m, max) => m != null && m.n >= MIN_N && m.hi != null && m.hi <= max;

/** Returns { decision, checks } from a metrics object (as produced by calibrate()) and an optional ceiling. */
export function decide(metrics, humanCeiling = null) {
  const checks = [];
  const add = (name, ok, tier) => checks.push({ name, ok: !!ok, tier });
  if (humanCeiling) {
    const dims = Object.keys(humanCeiling.by_dimension).length ? humanCeiling.by_dimension : { overall: humanCeiling.overall };
    for (const [d, m] of Object.entries(dims)) {
      if (m.value == null || m.value < THRESHOLDS.ceiling) {
        return { decision: 'anchors-need-rewrite', checks: [{ name: `human ceiling kappa ${d} >= ${THRESHOLDS.ceiling}`, ok: false, tier: 'ceiling', value: m.value }] };
      }
    }
  }
  const T = THRESHOLDS;
  if (metrics.kappa) {
    const perDim = metrics.kappa_by_dimension ? Object.entries(metrics.kappa_by_dimension) : [['overall', metrics.kappa]];
    for (const [d, m] of perDim) add(`kappa ${d} lower bound >= ${T.graded.count.kappa}`, ge(m, T.graded.count.kappa), 'count');
    add(`rho lower bound >= ${T.graded.count.rho}`, ge(metrics.rho, T.graded.count.rho), 'count');
    add(`alpha lower bound >= ${T.graded.gate.alpha}`, ge(metrics.alpha, T.graded.gate.alpha), 'gate');
    if (humanCeiling) {
      add(`kappa within ${T.graded.gate.ceilingGap} of human ceiling`, metrics.kappa.value != null && metrics.kappa.value >= humanCeiling.overall.value - T.graded.gate.ceilingGap, 'gate');
    }
  }
  if (metrics.recall || metrics.false_alarm) {
    add(`recall lower bound >= ${T.defect.count.recall}`, ge(metrics.recall, T.defect.count.recall), 'count');
    add(`false alarm upper bound <= ${T.defect.count.falseAlarm}`, le(metrics.false_alarm, T.defect.count.falseAlarm), 'count');
    add(`recall lower bound >= ${T.defect.gate.recall}`, ge(metrics.recall, T.defect.gate.recall), 'gate');
    add(`false alarm upper bound <= ${T.defect.gate.falseAlarm}`, le(metrics.false_alarm, T.defect.gate.falseAlarm), 'gate');
  }
  const isPair = metrics.flip_rate != null;
  if (metrics.agreement && !isPair) {
    add(`agreement lower bound >= ${T.fact.count.agreement}`, ge(metrics.agreement, T.fact.count.agreement), 'count');
    add(`agreement lower bound >= ${T.fact.gate.agreement}`, ge(metrics.agreement, T.fact.gate.agreement), 'gate');
  }
  if (isPair) {
    add(`agreement lower bound >= ${T.pair.count.agreement}`, ge(metrics.agreement, T.pair.count.agreement), 'count');
    add(`flip rate upper bound <= ${T.pair.count.flip}`, le(metrics.flip_rate, T.pair.count.flip), 'count');
  }
  const tier = (t) => checks.filter((c) => c.tier === t);
  const counted = tier('count').length > 0 && tier('count').every((c) => c.ok);
  const gateOk = !isPair && counted && tier('gate').length > 0 && tier('gate').every((c) => c.ok);
  return { decision: gateOk ? 'gate' : counted ? 'counted' : 'advisory', checks };
}

/** First 16 hex chars of sha256 of the rubric file bytes: exactly what itq.mjs rubricHashes() computes. */
export const rubricHash = (rubricText) => crypto.createHash('sha256').update(rubricText).digest('hex').slice(0, 16);
/** Also covers the judge model and prompt, for the scorer or a person checking the judge has not changed. */
export const calibrationHash = (rubricText, model, promptHash) =>
  crypto.createHash('sha256').update(`${rubricText}
--
${model}
--
${promptHash}`).digest('hex').slice(0, 16);

/** Full calibration from parsed inputs. `judgeDoc` is an array or { model, prompt_hash, items }. */
export function calibrate({ truth, judgeDoc, humanA, humanB, rubric = null, rubricText = '', version = null, now = new Date() }) {
  const wrapped = !Array.isArray(judgeDoc);
  const judgeItems = wrapped ? judgeDoc.items : judgeDoc;
  const model = wrapped ? judgeDoc.model ?? null : null;
  const promptHash = wrapped ? judgeDoc.prompt_hash ?? null : null;
  const parts = [];
  if (truth.some((t) => typeof t.level === 'number')) parts.push(gradedMetrics(truth, judgeItems));
  if (truth.some((t) => typeof t.defect === 'boolean')) parts.push(defectMetrics(truth, judgeItems));
  if (truth.some((t) => t.label != null)) parts.push(factMetrics(truth, judgeItems));
  if (truth.some((t) => t.choice != null)) parts.push(pairMetrics(truth, judgeItems));
  if (!parts.length) throw new Error('truth has no level, defect, label or choice fields');
  const metrics = Object.assign({}, ...parts.map((p) => p.metrics));
  const missing = parts.flatMap((p) => p.missing);
  const humanCeiling = humanA && humanB ? ceiling(humanA, humanB) : null;
  const { decision, checks } = decide(metrics, humanCeiling);
  return {
    rubric, version, judge: { model, prompt_hash: promptHash }, n: truth.length,
    metrics: humanCeiling ? { ...metrics, human_ceiling: humanCeiling } : metrics,
    decision, checks, missing_in_judge: missing,
    hash: rubricHash(rubricText), // must equal itq.mjs's hash of rubrics/<R>.md
    judge_hash: calibrationHash(rubricText, model, promptHash),
    at: now.toISOString(),
  };
}

// ---------- CLI ----------
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i];
  return o;
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.truth || !a.judge) {
    console.error('usage: node scripts/calibrate.mjs --truth truth.json --judge judge.json [--rubric R2] [--human-a a.json --human-b b.json] [--out file]');
    process.exit(2);
  }
  if (!!a['human-a'] !== !!a['human-b']) { console.error('give both --human-a and --human-b'); process.exit(2); }
  let rubricText = '';
  let version = a['rubric-version'] ?? null;
  if (a.rubric) {
    const f = path.join(ROOT, 'rubrics', `${a.rubric}.md`);
    if (fs.existsSync(f)) {
      rubricText = fs.readFileSync(f);
      const textForVersion = rubricText.toString('utf8');
      version ??= (textForVersion.match(/^version:\s*([\w.]*\w)/im) || [])[1] ?? null;
    }
  }
  const result = calibrate({
    truth: readJson(a.truth), judgeDoc: readJson(a.judge),
    humanA: a['human-a'] ? readJson(a['human-a']) : null, humanB: a['human-b'] ? readJson(a['human-b']) : null,
    rubric: a.rubric ?? null, rubricText, version,
  });
  const text = JSON.stringify(result, null, 2) + '\n';
  if (a.out) { fs.mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true }); fs.writeFileSync(a.out, text); }
  else process.stdout.write(text);
  console.error(`decision: ${result.decision}${result.missing_in_judge.length ? ` (${result.missing_in_judge.length} items missing in judge file)` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
