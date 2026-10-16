// Checks for quality-attribute scenarios (Constitution), and for the Technical Design's quality tactics,
// STRIDE threat model and ASVS Level 1 decisions. Pure: take texts, return error strings.
// Formats are described in templates/constitution.md and templates/design.md.
import { section } from './lib/md.mjs';

const STRIDE = [['S', 'Spoofing'], ['T', 'Tampering'], ['R', 'Repudiation'], ['I', 'Information disclosure'], ['D', 'Denial of service'], ['E', 'Elevation of privilege']];

// Constitution: K-G2 and K-G3.
export function checkConstitutionQuality(c) {
  const errors = [];
  const body = section(c, 'Quality-attribute scenarios');
  const qas = body.split(/\r?\n/).filter((l) => /\bQAS-\d+\b/.test(l));
  if (qas.length === 0) errors.push('The Constitution has no "## Quality-attribute scenarios" lines (QAS-n, one or more per ISO 25010 characteristic in scope).');
  for (const l of qas) {
    const id = l.match(/QAS-\d+/)[0];
    const measure = (l.match(/Measure:\s*([^;|]*)/i) || [])[1] || '';
    if (!/\d/.test(measure.replace(/<[^>]*>/g, ''))) errors.push(`${id} has no "Measure:" with a number and unit.`);
    for (const part of ['Source', 'Stimulus', 'Response']) if (!new RegExp(`${part}:`, 'i').test(l)) errors.push(`${id} has no "${part}:" part.`);
  }
  const quality = section(c, 'Quality bar');
  if (!/WCAG\s*2\.\d/i.test(quality)) errors.push('The quality bar does not state the WCAG level (e.g. "WCAG 2.2 AA").');
  if (!/ASVS/i.test(quality + section(c, 'Constraints'))) errors.push('The Constitution does not state the ASVS level (e.g. "OWASP ASVS 5.0 Level 1").');
  if (!/Browsers/i.test(quality)) errors.push('The quality bar has no "Browsers / devices" line.');
  return errors;
}

export const qasIds = (c) => [...new Set(section(c, 'Quality-attribute scenarios').match(/\bQAS-\d+\b/g) || [])];

// Technical Design: T-G3 (ASVS), T-G4 (STRIDE), T-G5 (QAS tactics).
export function checkDesignSecurity({ design, asvs, constitution, asvsIds }) {
  const errors = [];
  // T-G5
  const tactics = section(design, 'Quality scenarios').split(/\r?\n/);
  for (const id of qasIds(constitution)) {
    const line = tactics.find((l) => new RegExp(`\\b${id}\\b`).test(l)) || '';
    if (!line) errors.push(`${id} has no line in "## Quality scenarios" with its design tactic.`);
    else {
      if (!/Tactic:\s*\S/i.test(line)) errors.push(`${id} has no "Tactic:" in "## Quality scenarios".`);
      if (!/Verify:\s*\S/i.test(line)) errors.push(`${id} has no "Verify:" (how it is measured) in "## Quality scenarios".`);
    }
  }
  // T-G4
  const threat = section(design, 'Threat model');
  const boundaries = threat.split(/\r?\n/).filter((l) => /^\s*[-*]\s*\**TB-\d+/.test(l));
  if (boundaries.length === 0) errors.push('The Threat model lists no trust boundaries ("- TB-1 <name>: S: THR-1; T: ...; R: n/a: reason; ...").');
  const thrIds = new Set(threat.match(/\bTHR-\d+\b/g) || []);
  for (const b of boundaries) {
    const tb = b.match(/TB-\d+/)[0];
    for (const [letter, name] of STRIDE) {
      const m = b.match(new RegExp(`\\b${letter}:\\s*([^;]*)`));
      if (!m) errors.push(`${tb} does not consider ${name} (write "${letter}: THR-n" or "${letter}: n/a: reason").`);
      else if (!/THR-\d+/.test(m[1]) && !/n\/a:\s*\S.{2,}/i.test(m[1])) errors.push(`${tb} ${name}: write a THR-n or "n/a: reason".`);
    }
  }
  const rows = threat.split(/\r?\n/).filter((l) => /^\s*\|/.test(l) && /\bTHR-\d+\b/.test(l.split('|')[1] || ''));
  const defined = new Set();
  for (const r of rows) {
    const cells = r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const id = cells[0].match(/THR-\d+/)[0];
    defined.add(id);
    if (!/\b(AC-\d+\.\d+|T-\d{3}|ADR-\d{4})\b/.test(cells.slice(1).join(' '))) errors.push(`${id} has no mitigation linked to an AC, a task or an ADR.`);
  }
  for (const id of thrIds) if (!defined.has(id)) errors.push(`${id} is used in a trust boundary but has no row in the threat table.`);
  // T-G3
  if (!asvs) errors.push('docs/03-tech/asvs-l1.md does not exist. Run "itq.mjs asvs-init" to create it, then decide every row.');
  else {
    const decided = new Map();
    for (const l of asvs.split(/\r?\n/)) {
      const cells = l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (/^V\d+\.\d+\.\d+$/.test(cells[0] || '')) decided.set(cells[0], cells.slice(1).join(' | '));
    }
    const missing = asvsIds.filter((id) => !decided.has(id));
    if (missing.length) errors.push(`asvs-l1.md is missing ${missing.length} Level 1 row(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', ...' : ''}.`);
    for (const [id, decision] of decided) {
      if (/\bpending\b/i.test(decision)) errors.push(`ASVS ${id} is still pending; decide it.`);
      else if (/\bN\/A\b/i.test(decision)) { if (!/N\/A:\s*\S.{2,}/i.test(decision)) errors.push(`ASVS ${id} is N/A without a reason.`); }
      else if (/\bapplicable\b/i.test(decision)) { if (!/\b(AC-\d+\.\d+|T-\d{3}|THR-\d+|ADR-\d{4})\b/.test(decision)) errors.push(`ASVS ${id} is applicable but maps to no AC, task, threat or ADR.`); }
      else errors.push(`ASVS ${id} has no decision (applicable or N/A).`);
    }
  }
  return errors;
}

// Skeleton for docs/03-tech/asvs-l1.md.
export function asvsSkeleton(ids) {
  return ['# ASVS 5.0.0 Level 1: decisions', '', 'Source rows: `vendor/asvs/asvs-5.0.0-L1.md` (OWASP ASVS 5.0.0, CC BY-SA 4.0). Decide every row: `applicable` with the AC, task, threat or ADR that meets it, or `N/A: <reason>`.', '', '| Requirement | Decision | Maps to / reason |', '|---|---|---|', ...ids.map((id) => `| ${id} | pending | |`), ''].join('\n');
}
