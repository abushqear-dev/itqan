#!/usr/bin/env node
// Requirement-smell linter for the Itqan Product Spec. No dependencies.
// Usage: node scripts/lint-req.mjs <product-spec.md> [--json]
// Exports lintSpec(text). Exit code is 0 for any lintable file; the caller applies thresholds
// (2 for usage or read errors).
//
// The lexicon below is our own. Rule names and ideas follow the Smella catalogue
// (Femmer et al. 2016) and the ISO/IEC/IEEE 29148 language criteria.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const words = (list) => list.map((w) => w.replace(/ /g, '\\s+')).join('|');
const re = (src) => new RegExp(src, 'gi');

// Rules are tried in order; a text span claimed by an earlier rule is not reported again.
// skip(match, ctx) returns true to suppress a match. ctx = { text, respStart, isIf }.
const RULES = [
  { rule: 'loophole', re: re('\\b(as appropriate|where possible|if necessary|to the extent possible|and\\/or|at least(?!\\s+(?:\\d|one\\b|two\\b|three\\b|four\\b|five\\b|ten\\b)))') },
  { rule: 'open-ended', re: re('\\b(etc\\b\\.?|and so on|including but not limited to|such as|e\\.g\\.)') },
  { rule: 'incomplete-reference', re: re('\\b(see (?:above|below)|as (?:before|above|mentioned|stated above)|same as|TBD|TBC|to be (?:defined|determined|confirmed))') },
  { rule: 'ambiguous-adverb-adjective', re: re(`\\b(${words(['appropriate(?:ly)?', 'adequate(?:ly)?', 'reasonabl[ey]', 'sufficient(?:ly)?', 'normally', 'usually', 'generally', 'typically', 'as needed', 'if possible', 'several', 'various'])})\\b`) },
  { rule: 'subjective-language', re: re('\\b(user-friendly|easy|easily|simple|simply|intuitive(?:ly)?|nice(?:ly)?|good|fast|quick(?:ly)?|robust|flexible|modern|seamless(?:ly)?|smooth(?:ly)?|efficient(?:ly)?|state-of-the-art)\\b') },
  { rule: 'superlative', re: re('\\b(best|(?<!at\\s)most(?!\\s+recent)|fastest|highest|lowest|largest|smallest|greatest|(?:maximum|minimum)(?!\\s+(?:of\\s+)?\\d))\\b') },
  { rule: 'comparative-without-baseline', re: re('\\b(better|faster|slower|more|less|fewer|higher|lower|greater|larger|smaller)\\b'),
    // fine when a baseline follows ("more than 5") or it is a bound ("3 or more")
    skip: (m, { text }) => /^\s+(?:\S+\s+){0,5}?than\b/i.test(text.slice(m.index + m[0].length)) || /^\s+case\b/i.test(text.slice(m.index + m[0].length)) ||
      /\d\s+or\s+$/i.test(text.slice(0, m.index)) },
  { rule: 'negative-statement', re: re('\\b(not|never|cannot)\\b'),
    // unwanted-behaviour criteria ("IF ..., THEN ...") are the right place for negatives
    // "Not provided" is a status name; "whether or not" is an idiom
    skip: (m, { text, respStart, isIf }) => isIf || m.index < respStart || m[0] === 'Not' || /whether or $/i.test(text.slice(0, m.index)) },
  { rule: 'vague-pronoun', re: re('(?<=(?:^|[,;]\\s{0,3}|\\bthen\\s+))(it|they|this|that|these|those)\\b') },
];

// Base-form verbs that, after "and" / "or" inside a response, signal two behaviours in one criterion.
const VERBS = new Set(('show display send create update delete remove save store notify redirect add reject block prevent return ' +
  'clear cancel offer allow lock assign release reset hide open close generate revoke grant refresh confirm replace ' +
  'disable enable record archive restore keep prompt ask invite print export import move copy mark').split(' '));

// Small synonym groups for role and action words. Drift is reported only when the glossary defines one of a pair.
const SYNONYMS = [
  ['user', 'member', 'customer', 'client', 'volunteer', 'helper', 'participant'],
  ['admin', 'administrator'], ['delete', 'remove', 'erase'], ['cancel', 'withdraw'],
  ['booking', 'reservation'], ['sign in', 'log in', 'login'], ['sign up', 'register', 'enrol', 'enroll'],
  ['edit', 'modify', 'amend'],
];
const NOT_TERMS = new Set('january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday'.split(' '));

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 100);

// Split the spec into blocks: one per FEAT/US/AC/NFR heading, with the lines that carry scannable text.
function parseBlocks(text) {
  const lines = stripComments(text).split(/\r?\n/);
  const blocks = [];
  const defined = [];
  let cur = null, section = '', fence = false, story = null;
  lines.forEach((orig, i) => {
    if (/^\s*(```|~~~)/.test(orig)) { fence = !fence; return; }
    if (fence) return;
    const raw = orig.replace(/[*`]/g, '');
    const h = /^(#{1,6})\s+(.*)$/.exec(raw);
    if (h) {
      cur = null;
      if (h[1].length === 2) section = h[2].trim().toLowerCase();
      const idm = /^(FEAT-\d+|US-\d+|AC-\d+\.\d+|NFR-\d+)\b/.exec(h[2]);
      if (idm) {
        const kind = idm[1].split('-')[0];
        cur = { id: idm[1], kind, heading: i + 1, parts: [], all: [], story: kind === 'AC' ? story : null };
        if (kind === 'US') story = cur;
        if (kind === 'FEAT') story = null;
        blocks.push(cur);
      }
      return;
    }
    if (section === 'glossary' && raw.trim().startsWith('|')) {
      const first = raw.trim().replace(/^\|/, '').split('|')[0].trim();
      if (first && !/^[\s:-]+$/.test(first) && first.toLowerCase() !== 'term' && !first.startsWith('<'))
        first.split(/\s*\/\s*/).forEach((t) => defined.push(t.replace(/\(.*?\)/g, '').trim().toLowerCase()));
    }
    if (section.startsWith('roles')) {
      const rm = /^\s*-\s*([^:]+):/.exec(raw);
      if (rm) defined.push(rm[1].trim().toLowerCase());
    }
    if (!cur) return;
    cur.all.push({ text: raw, line: i + 1 });
    const t = raw.trim();
    if (!t || cur.kind === 'FEAT') return;
    if (/^(Example|Source|Priority|Measure|Verify|Independent test)\s*:/i.test(t)) return;
    if (cur.kind === 'US' && !/^As an?\b/i.test(t)) return;
    cur.parts.push({ text: t, line: i + 1 });
  });
  for (const b of blocks) {
    b.text = b.parts.map((p) => p.text).join(' ');
    let pos = 0;
    b.starts = b.parts.map((p) => { const s = pos; pos += p.text.length + 1; return s; });
  }
  return { blocks, glossary: [...new Set(defined.filter(Boolean))] };
}

const lineAt = (b, idx) => {
  let k = 0;
  while (k + 1 < b.starts.length && b.starts[k + 1] <= idx) k++;
  return b.parts[k]?.line ?? b.heading;
};

function scanSmells(b) {
  const t = b.text;
  const sh = /\bshall\b/i.exec(t);
  const ctx = { text: t, respStart: sh ? sh.index + sh[0].length : 0, isIf: /^\s*IF\b/i.test(t) };
  const claimed = [];
  const out = [];
  for (const r of RULES) {
    for (const m of t.matchAll(r.re)) {
      const s = m.index, e = s + m[0].length;
      if (claimed.some(([cs, ce]) => s < ce && e > cs)) continue;
      if (r.skip && r.skip(m, ctx)) continue;
      claimed.push([s, e]);
      out.push({ id: b.id, rule: r.rule, word: m[0].toLowerCase().replace(/\s+/g, ' '), line: lineAt(b, s) });
    }
  }
  return out;
}

// Singular = one SHALL, and the response does not join two behaviours ("SHALL save X and notify Y").
function isSingular(b) {
  const shalls = [...b.text.matchAll(/\bshall\b/gi)];
  if (shalls.length > 1) return false;
  if (!shalls.length) return true;
  const resp = b.text.slice(shalls[0].index + 5);
  for (const m of resp.matchAll(/\b(and|or)\s+(?:then\s+|also\s+)?([a-z]+)\b/gi))
    if (VERBS.has(m[2].toLowerCase())) return false;
  return !/;\s*\S/.test(resp);
}

const wordRe = (term) => {
  const parts = term.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const last = parts.pop();
  const stem = last.endsWith('e') ? `${last.slice(0, -1)}(?:e|es|ed|ing)` : `${last}(?:s|es|ed|ing)?`;
  return new RegExp(`\\b${[...parts, stem].join('\\s+')}\\b`, 'i');
};
const maskAll = (s, rx) => s.replace(new RegExp(rx.source, 'gi'), (m) => '\u0001'.repeat(m.length));

// Conservative: a synonym is reported only when the glossary defines the other word of the pair;
// an undefined term only when it is a mid-sentence Title Case phrase outside quotes.
function findDrift(blocks, glossary) {
  if (!glossary.length) return [];
  const glossRx = glossary.map(wordRe);
  const seen = new Set();
  const out = [];
  const add = (o) => { const k = JSON.stringify(o); if (!seen.has(k)) { seen.add(k); out.push(o); } };
  for (const b of blocks) {
    if (!b.text || b.kind === 'FEAT') continue;
    let t = b.text;
    for (const rx of glossRx) t = maskAll(t, rx);
    for (const term of glossary) {
      for (const group of SYNONYMS) {
        for (const w of group.filter((g) => new RegExp(`\\b${g}\\b`).test(term))) {
          for (const syn of group.filter((g) => g !== w)) {
            const variant = term.replace(new RegExp(`\\b${w}\\b`), syn);
            if (!glossary.includes(variant) && wordRe(variant).test(t)) add({ term, synonym: variant, where: b.id });
          }
        }
      }
    }
    const unquoted = t.replace(/"[^"]*"/g, (m) => '\u0001'.repeat(m.length));
    for (const m of unquoted.matchAll(/(?<=[a-z,;:)]\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)) {
      if (m[1].toLowerCase().split(' ').some((w) => NOT_TERMS.has(w))) continue;
      add({ undefined: m[1], where: b.id });
    }
  }
  return out;
}

export function lintSpec(text) {
  const { blocks, glossary } = parseBlocks(text);
  const acs = blocks.filter((b) => b.kind === 'AC');
  const stories = blocks.filter((b) => b.kind === 'US');
  const smells = blocks.filter((b) => ['AC', 'US', 'NFR'].includes(b.kind)).flatMap(scanSmells);
  const nonSingular = acs.filter((b) => !isSingular(b)).map((b) => b.id);
  const storyChecks = stories.map((s) => {
    const first = s.all.find((l) => /^\s*As an?\b/i.test(l.text));
    const acCount = acs.filter((a) => a.story === s).length;
    return {
      id: s.id,
      wellFormed: !!first && /As an? .+, I want .+ so that .+/i.test(first.text),
      hasIndependentTest: s.all.some((l) => /^\s*Independent test:\s*\S/i.test(l.text)),
      acCount,
      small: acCount <= 6,
    };
  });
  const ok = storyChecks.filter((c) => c.wellFormed && c.hasIndependentTest && c.small).length;
  return {
    criteria: acs.length,
    stories: stories.length,
    smells,
    smellsPer100: acs.length ? Math.round((smells.length / acs.length) * 10000) / 100 : 0,
    nonSingular,
    singularPct: pct(acs.length - nonSingular.length, acs.length),
    glossaryDrift: findDrift(blocks, glossary),
    storyChecks,
    storiesOkPct: pct(ok, stories.length),
  };
}

function report(r) {
  const L = [`Criteria: ${r.criteria}   Stories: ${r.stories}`];
  L.push(`Smells: ${r.smells.length} (${r.smellsPer100} per 100 criteria)`);
  for (const s of r.smells) L.push(`  line ${s.line}  ${s.id}  ${s.rule}: "${s.word}"`);
  L.push(`Singular criteria: ${r.singularPct}%${r.nonSingular.length ? `  not singular: ${r.nonSingular.join(', ')}` : ''}`);
  L.push(`Glossary drift: ${r.glossaryDrift.length}`);
  for (const d of r.glossaryDrift)
    L.push(d.undefined ? `  ${d.where}  undefined term "${d.undefined}"` : `  ${d.where}  "${d.synonym}" used for glossary term "${d.term}"`);
  L.push(`Stories ok: ${r.storiesOkPct}%`);
  for (const c of r.storyChecks.filter((x) => !(x.wellFormed && x.hasIndependentTest && x.small))) {
    const why = [!c.wellFormed && 'not "As a, I want, so that"', !c.hasIndependentTest && 'no Independent test', !c.small && `${c.acCount} criteria (max 6)`];
    L.push(`  ${c.id}  ${why.filter(Boolean).join('; ')}`);
  }
  return L.join('\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) { console.error('Usage: node scripts/lint-req.mjs <product-spec.md> [--json]'); process.exit(2); }
  let text;
  try { text = readFileSync(file, 'utf8'); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(2); }
  const r = lintSpec(text);
  console.log(args.includes('--json') ? JSON.stringify(r, null, 2) : report(r));
}
