// Automated check for the Discovery document (docs/00-discovery.md). Pure: takes the text, returns errors.
// Used by `itq.mjs check D`; the scorecard metrics D-S2..S5 come from freshness, twoSourceShare, formShare and the parsed personas (see collectors.mjs).

import { rows, section } from './lib/md.mjs';

const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/;
const URL_RE = /https?:\/\/[^\s)>\]|]+/;
const NEG = /^\s*(Absent|None|No|-|—)\b/i;

export function parseDiscovery(text) {
  const mode = (text.match(/^Mode:\s*(full|light|workaround)\b/mi) || [])[1];
  const comps = rows(section(text, 'Competitors')).filter((r) => /^COMP-\d+$/.test(r[0]));
  const matrix = rows(section(text, 'Feature matrix')).filter((r) => /^MKT-FEAT-\d+/.test(r[0]));
  const lines = (heading, re) => section(text, heading).split(/\r?\n/).filter((l) => re.test(l));
  return {
    mode,
    comps,
    matrix,
    rulings: lines('Table stakes: rulings', /MKT-FEAT-\d+/),
    personas: lines('Personas', /PER-\d+/),
    jobs: lines('Jobs', /JOB-\d+/),
    positioning: section(text, 'Positioning'),
    urls: [...text.matchAll(new RegExp(URL_RE, 'g'))].map((m) => m[0].replace(/[.,;]+$/, '')),
  };
}

// Features present (not Absent) in enough competitors to be table stakes, with how many.
export function tableStakes(d) {
  const need = Math.ceil(0.6 * Math.max(d.comps.length, 1));
  return d.matrix.map((r) => {
    const cells = r.slice(2, 2 + d.comps.length);
    return { id: r[0].match(/^MKT-FEAT-\d+/)[0], present: cells.filter((c) => !NEG.test(c)).length, need, marked: /^\s*yes\b/i.test(r[r.length - 1] || ''), cells };
  });
}

export function checkDiscovery(text) {
  const errors = [];
  if (!text) return errors;
  const d = parseDiscovery(text);
  if (!d.mode) errors.push('Discovery has no "Mode: full | light | workaround" line.');
  const min = d.mode === 'full' || !d.mode ? 3 : 1;
  if (d.comps.length < min || d.comps.length > 5) errors.push(`Discovery lists ${d.comps.length} competitor(s) (COMP-n); list ${min} to 5.`);
  for (const r of d.comps) {
    const row = r.join(' ');
    if (!URL_RE.test(row)) errors.push(`${r[0]} has no source URL.`);
    if (!ISO_DATE.test(row)) errors.push(`${r[0]} has no ISO access date (YYYY-MM-DD).`);
  }
  if (d.matrix.length === 0) errors.push('The Feature matrix has no rows (MKT-FEAT-n).');
  const stakes = tableStakes(d);
  for (const s of stakes) {
    for (const cell of s.cells) {
      if (!URL_RE.test(cell) || !ISO_DATE.test(cell)) errors.push(`${s.id}: a matrix cell has no source URL and access date: "${cell.slice(0, 40)}".`);
    }
    if (s.present >= s.need && !s.marked) errors.push(`${s.id} is present in ${s.present} of ${d.comps.length} competitors, so it is table stakes; mark the last column "yes".`);
  }
  for (const s of stakes.filter((x) => x.marked)) {
    const line = d.rulings.find((l) => l.includes(s.id));
    if (!line) errors.push(`${s.id} is table stakes but has no line under "Table stakes: rulings".`);
    else if (!/ruling:\s*(in scope|later|dropped)/i.test(line)) errors.push(`${s.id} has no ruling from the user (in scope, later or dropped); ask them.`);
  }
  for (const [slot, re] of [['For', /\bFor\b\**\s+(?!<)\S/], ['who', /\bwho\b\**\s+(?!<)\S/], ['is a', /\bis a\b\**\s+(?!<)\S/], ['that', /\bthat\b\**\s+(?!<)\S/], ['Unlike', /\bUnlike\b\**\s+(?!<)\S/], ['our product', /\bour product\b\**\s+(?!<)\S/]]) {
    if (!re.test(d.positioning)) errors.push(`Positioning slot "${slot}" is empty.`);
  }
  if (d.personas.length === 0) errors.push('Discovery has no personas (PER-n).');
  if (d.personas.length > 4) errors.push(`Discovery has ${d.personas.length} personas; keep at most 4.`);
  if (d.jobs.length === 0) errors.push('Discovery has no jobs (JOB-n).');
  for (const p of d.personas) {
    const id = p.match(/PER-\d+/)[0];
    if (!d.jobs.some((j) => j.includes(id))) errors.push(`${id} is used by no job.`);
  }
  for (const j of d.jobs) {
    if (!/Outcome:\s*(Minimi[sz]e|Maximi[sz]e|Increase|Reduce)\b/i.test(j)) errors.push(`${j.match(/JOB-\d+/)[0]} has no "Outcome: Minimize ..." statement.`);
  }
  return errors;
}

// Share (0-100) of cells dated within `days` of `today`.
export function freshness(text, today = new Date(), days = 90) {
  const dates = [...text.matchAll(new RegExp(ISO_DATE, 'g'))].map((m) => Date.parse(m[0])).filter(Number.isFinite);
  if (dates.length === 0) return 0;
  return (100 * dates.filter((t) => (today - t) / 864e5 <= days).length) / dates.length;
}

// Share (0-100) of table-stakes and differentiation claims backed by two distinct domains in their rows.
export function twoSourceShare(text) {
  const d = parseDiscovery(text);
  const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const claims = [...tableStakes(d).filter((s) => s.marked).map((s) => s.cells.join(' ')), ...section(text, 'Differentiators').split(/\r?\n/).filter((l) => /^\s*-\s/.test(l))];
  if (claims.length === 0) return 100;
  const ok = claims.filter((c) => new Set((c.match(new RegExp(URL_RE, 'g')) || []).map(domain)).size >= 2);
  return (100 * ok.length) / claims.length;
}

// Share (0-100) of jobs with "verb object" form and an outcome in "minimise" form, and personas each used.
export function formShare(text) {
  const d = parseDiscovery(text);
  if (d.jobs.length === 0) return 0;
  const good = d.jobs.filter((j) => /Outcome:\s*(Minimi[sz]e|Maximi[sz]e|Increase|Reduce)\b/i.test(j)).length;
  return (100 * good) / d.jobs.length;
}
