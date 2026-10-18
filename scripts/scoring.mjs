// Scoring engine: normalises metrics, rolls them into a stage score or an index, and applies the
// iterate-or-advance rule. Pure functions; `itq.mjs score` supplies the values and calibration records.
// Design and thresholds: plans/phase-cd-scorecards.md.

export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

// 0-100 between floor (0 points) and target (100 points). Works for lower-is-better (target < floor).
export function normalise(value, target, floor) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  if (target === floor) return value === target ? 100 : 0;
  return Math.round(1000 * 100 * clamp((value - floor) / (target - floor))) / 1000;
}

// Does a judge metric count? True for script metrics, `alwaysCounted` judge gates, and judge metrics whose
// rubric has a calibration record that says counted or gate and whose hash matches the current rubric.
export function isCounted(metric, calibrations = {}, rubricHashes = {}) {
  if (metric.method !== 'J') return true;
  if (metric.alwaysCounted) return true;
  const cal = calibrations[metric.rubric];
  if (!cal || !['counted', 'gate'].includes(cal.decision)) return false;
  if (rubricHashes[metric.rubric] && cal.hash && cal.hash !== rubricHashes[metric.rubric]) return false;
  return metric.kind === 'gate' ? cal.decision === 'gate' : true;
}

// values: { 'P-G1': true, 'P-S1': 2.1, ... }. Missing means "not measured".
export function evaluateStage(card, values, calibrations = {}, rubricHashes = {}) {
  const gates = [];
  const metrics = [];
  for (const m of card.metrics) {
    const value = values[m.id];
    const counted = isCounted(m, calibrations, rubricHashes);
    if (m.kind === 'gate') {
      const measured = typeof value === 'boolean';
      gates.push({ id: m.id, label: m.label, method: m.method, pass: measured ? value : false, measured, counted });
    } else {
      const score = normalise(value, m.target, m.floor);
      metrics.push({ id: m.id, label: m.label, method: m.method, value: value ?? null, target: m.target, floor: m.floor, score, weight: m.weight, counted: counted && score !== null });
    }
  }
  const used = metrics.filter((m) => m.counted);
  const totalWeight = used.reduce((a, m) => a + m.weight, 0);
  const stageScore = totalWeight ? Math.round((10 * used.reduce((a, m) => a + (m.weight * m.score) / totalWeight, 0))) / 10 : null;
  const failedGates = gates.filter((g) => g.counted && !g.pass);
  return {
    gates,
    metrics,
    failedGates: failedGates.map((g) => g.id),
    advisoryGates: gates.filter((g) => !g.counted).map((g) => ({ id: g.id, pass: g.pass, measured: g.measured })),
    unmeasured: [...gates.filter((g) => g.counted && !g.measured).map((g) => g.id), ...metrics.filter((m) => m.counted === false && m.method !== 'J' && m.value === null).map((m) => m.id)],
    advisory: metrics.filter((m) => !m.counted).map((m) => m.id),
    stageScore,
    weightUsed: totalWeight,
  };
}

// Index roll-up: groups of parts. Optional parts with no value are dropped and their weight re-spread.
export function evaluateIndex(index, values) {
  const groups = index.groups.map((g) => {
    const parts = g.parts.map((p) => ({ ...p, score: normalise(values[p.id], p.target, p.floor) })).filter((p) => p.score !== null || !p.optional);
    const known = parts.filter((p) => p.score !== null);
    const w = known.reduce((a, p) => a + p.w, 0);
    const score = w ? known.reduce((a, p) => a + (p.w * p.score) / w, 0) : null;
    return { id: g.id, weight: g.weight, score, missing: parts.filter((p) => p.score === null).map((p) => p.id) };
  });
  const known = groups.filter((g) => g.score !== null);
  const w = known.reduce((a, g) => a + g.weight, 0);
  const total = w ? known.reduce((a, g) => a + (g.weight * g.score) / w, 0) : null;
  return { groups, total: total === null ? null : Math.round(10 * total) / 10, incomplete: known.length < groups.length };
}

// Band from a total and optional bootstrap lower bound; borderline when the lower bound is under the band.
export function band(index, total, lower = total, gatesPass = true) {
  if (total === null || !gatesPass) return 'not-ready';
  const { 'ship-ready': ship, 'strong-prototype': strong } = index.bands;
  if (total >= ship) return lower >= ship ? 'ship-ready' : 'borderline ship-ready';
  if (total >= strong) return lower >= strong ? 'strong-prototype' : 'borderline strong-prototype';
  return 'not-ready';
}

// The iterate-or-advance rule. `history` is the earlier rounds' results (oldest first), each
// { failedGates, stageScore }; `current` is this round's evaluateStage result.
export function decide(card, current, history = [], opts = {}) {
  const { maxRounds = 3, minGain = 2, budgetLeft = true } = opts;
  const round = history.length + 1;
  const prev = history[history.length - 1];
  const regressed = prev ? prev.failedGates.length === 0 && current.failedGates.length > 0 || current.failedGates.some((g) => history.some((h) => !h.failedGates.includes(g))) : false;
  if (regressed) return { decision: 'revert', round, reason: `Gate(s) ${current.failedGates.join(', ')} passed earlier and now fail: revert this round's changes.` };
  if (current.failedGates.length) {
    if (round >= maxRounds || !budgetLeft) return { decision: 'stop-ask', round, reason: `Gate(s) ${current.failedGates.join(', ')} still fail after ${round} round(s): show the user, who can accept them by name as known gaps.` };
    return { decision: 'fix-gates', round, focus: current.failedGates, reason: 'Fix the failed gates first.' };
  }
  const score = current.stageScore;
  // No counted score metric could be measured (judges uncalibrated, tool results missing): nothing to iterate on.
  // Looping would never change that, so hand the unmeasured list to the user instead.
  if (score === null) return { decision: 'show-user', round, reason: `No counted score metric was measured (unmeasured: ${(current.unmeasured || []).join(', ') || 'judge metrics are advisory'}). All gates pass; show the user and say the score is not available.` };
  if (score >= card.target) return { decision: 'show-user', round, reason: `Score ${score} meets the target ${card.target}.` };
  const gain = prev && prev.stageScore !== null && score !== null ? score - prev.stageScore : Infinity;
  if (round >= maxRounds || (round >= 2 && gain < minGain) || !budgetLeft) {
    return score !== null && score < card.floor
      ? { decision: 'stop-ask', round, reason: `Score ${score} is below the floor ${card.floor}: stop and ask the user how to proceed.` }
      : { decision: 'show-user', round, reason: `Stopping at round ${round} with score ${score}; show the remaining gaps.` };
  }
  const focus = current.metrics.filter((m) => m.counted).map((m) => ({ id: m.id, gap: (m.weight * (100 - m.score)) / 100 })).sort((a, b) => b.gap - a.gap).slice(0, 3).map((m) => m.id);
  return { decision: 'iterate', round, focus, reason: `Score ${score} is below the target ${card.target}: fix the largest weighted gaps.` };
}
