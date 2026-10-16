#!/usr/bin/env node
// Plants ONE known defect per copy into a clean Itqan Product Spec (templates/product-spec.md format).
// Usage: node scripts/seed-defects.mjs --from <clean spec.md[,other.md...]> --out gold/G-R2 [--n 20] [--seed 1]
// Writes <out>/items/gNNN.md (neutral names, shuffled, so file names do not reveal the source) and
// <out>/truth.json: [{ id, defect: true, type, location, source }, { id, defect: false, source }].
// With several --from files, copies are spread round-robin and each clean original is written once.
// Reproducible: same inputs and seed give byte-identical output.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mulberry32 } from './calibrate.mjs';

export const DEFECT_TYPES = [
  'design-leak', 'contradiction', 'infeasible', 'second-reading',
  'compound', 'missing-example', 'vague-nfr', 'undefined-role',
];

const EARS = /^((?:WHEN|IF|WHILE|WHERE)\b.*?,\s*(?:THEN\s+)?)?(THE SYSTEM SHALL\s+)(.*)$/;

/** Finds blocks: acceptance criteria (##### AC-n.m) and NFRs (### NFR-n), as line ranges. */
export function parseBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  lines.forEach((line, i) => {
    const m = /^(#{3,5})\s+((?:AC-\d+\.\d+)|(?:NFR-\d+))\b/.exec(line);
    if (!m) return;
    let end = i + 1;
    while (end < lines.length && !/^#{1,5}\s/.test(lines[end])) end++;
    const b = { id: m[2], kind: m[2].startsWith('AC') ? 'ac' : 'nfr', start: i, end };
    for (let k = i + 1; k < end; k++) {
      if (b.kind === 'ac' && b.ears === undefined && EARS.test(lines[k].trim())) b.ears = k;
      if (/^Example:/.test(lines[k])) b.example = k;
      if (/^Measure:/.test(lines[k])) b.measure = k;
    }
    blocks.push(b);
  });
  return { lines, blocks };
}

const roleNames = (text) => [...text.matchAll(/^- \*\*([^*]+):\*\*/gm)].map((m) => m[1].toLowerCase());

const trimDot = (s) => s.replace(/[.\s]+$/, '');
const pick = (rand, xs) => xs[Math.floor(rand() * xs.length)];

// Each mutator edits `lines` in place for block `b` and returns true, or returns false when not applicable.
const MUTATORS = {
  'design-leak': (lines, b, ctx) => {
    if (b.ears === undefined) return false;
    lines[b.ears] = `${trimDot(lines[b.ears])} by writing a row to a PostgreSQL table through a REST endpoint and caching it in Redis.`;
    return true;
  },
  contradiction: (lines, b, ctx) => {
    const others = ctx.blocks.filter((o) => o.kind === 'ac' && o.ears !== undefined && o.id !== b.id);
    if (b.ears === undefined || !others.length) return false;
    const o = pick(ctx.rand, others);
    const m = EARS.exec(ctx.original[o.ears].trim());
    lines[b.ears] = `${m[1] ?? ''}THE SYSTEM SHALL NOT ${trimDot(m[3])}.`.trim();
    return true;
  },
  infeasible: (lines, b) => {
    if (b.ears === undefined) return false;
    lines[b.ears] = `${trimDot(lines[b.ears])} within 1 millisecond for every request, with 100% availability and zero data loss.`;
    return true;
  },
  'second-reading': (lines, b) => {
    if (b.ears === undefined) return false;
    lines[b.ears] = `${trimDot(lines[b.ears])}, then update it for them as soon as it is reasonable.`;
    if (b.example !== undefined) lines[b.example] = 'Example: see above.';
    return true;
  },
  compound: (lines, b) => {
    if (b.ears === undefined) return false;
    lines[b.ears] = `${trimDot(lines[b.ears])} and send a confirmation and/or write an audit entry.`;
    return true;
  },
  'missing-example': (lines, b) => {
    if (b.kind !== 'ac' || b.example === undefined) return false;
    lines[b.example] = null;
    return true;
  },
  'vague-nfr': (lines, b) => {
    if (b.kind !== 'nfr' || b.measure === undefined) return false;
    lines[b.measure] = 'Measure: fast and user-friendly.';
    return true;
  },
  'undefined-role': (lines, b, ctx) => {
    if (b.ears === undefined || ctx.roles.includes('regional auditor')) return false;
    const m = EARS.exec(lines[b.ears].trim());
    lines[b.ears] = `${m[1] ?? ''}THE SYSTEM SHALL let the Regional Auditor ${m[3]}`.trim();
    return true;
  },
};

/** Returns { text, type, location } or null when no applicable block exists for the type. */
export function plant(cleanText, type, rand, avoid = new Set()) {
  const { lines: original, blocks } = parseBlocks(cleanText);
  const ctx = { rand, blocks, original, roles: roleNames(cleanText) };
  const order = blocks.map((b, i) => [rand(), b]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  order.sort((a, b) => Number(avoid.has(`${type}:${a.id}`)) - Number(avoid.has(`${type}:${b.id}`)));
  for (const b of order) {
    const lines = [...original];
    if (MUTATORS[type](lines, b, ctx)) {
      return { text: lines.filter((l) => l !== null).join('\n'), type, location: `${b.id} (line ${(b.ears ?? b.measure ?? b.example ?? b.start) + 1})` };
    }
  }
  return null;
}

export function seed({ sources, n = 20, seed: s = 1 }) {
  const rand = mulberry32(s);
  const made = []; // { text, defect, type?, location?, source }
  const used = new Set();
  sources.forEach((src) => made.push({ text: src.text, defect: false, source: src.name }));
  for (let i = 0; i < n; i++) {
    const src = sources[i % sources.length];
    // cycle through the types in a shuffled order so each appears about n/8 times
    for (let tries = 0; tries < DEFECT_TYPES.length; tries++) {
      const type = DEFECT_TYPES[(i + tries) % DEFECT_TYPES.length];
      const r = plant(src.text, type, rand, used);
      if (!r) continue;
      used.add(`${type}:${r.location.split(' ')[0]}`);
      made.push({ text: r.text, defect: true, type: r.type, location: r.location, source: src.name });
      break;
    }
  }
  // Fisher-Yates shuffle with the seeded PRNG, then neutral ids
  for (let i = made.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [made[i], made[j]] = [made[j], made[i]];
  }
  const width = Math.max(3, String(made.length).length);
  return made.map((m, i) => ({ ...m, id: `g${String(i + 1).padStart(width, '0')}` }));
}

function main() {
  const o = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i];
  if (!o.from || !o.out) {
    console.error('usage: node scripts/seed-defects.mjs --from <clean spec.md[,more.md]> --out gold/G-R2 [--n 20] [--seed 1]');
    process.exit(2);
  }
  const sources = o.from.split(',').map((f) => ({ name: path.basename(f), text: fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') }));
  const items = seed({ sources, n: Number(o.n ?? 20), seed: Number(o.seed ?? 1) });
  const dir = path.join(o.out, 'items');
  fs.mkdirSync(dir, { recursive: true });
  for (const it of items) fs.writeFileSync(path.join(dir, `${it.id}.md`), it.text);
  const truth = items.map((it) => (it.defect
    ? { id: it.id, defect: true, type: it.type, location: it.location, source: it.source }
    : { id: it.id, defect: false, source: it.source }));
  fs.writeFileSync(path.join(o.out, 'truth.json'), JSON.stringify(truth, null, 2) + '\n');
  const planted = truth.filter((t) => t.defect).length;
  console.log(`wrote ${items.length} items (${planted} with a planted defect, ${items.length - planted} clean) to ${o.out}`);
  if (planted < Number(o.n ?? 20)) console.error(`warning: only ${planted} of ${o.n ?? 20} defects could be planted; the spec lacks suitable criteria`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
