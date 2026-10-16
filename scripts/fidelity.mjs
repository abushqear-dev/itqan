#!/usr/bin/env node
// Itqan fidelity: compares a built page with its mockup through the DOM, deterministically.
// Method: the Design2Code metrics (Si et al., NoviScl/Design2Code, MIT): block match, text, position, colour.
// This is Itqan's own Node rewrite; no code was copied.
//
// Usage: node fidelity.mjs --mockup <mockup.html> --url <built page url> [--viewport 1440x900|390x844] [--app <dir>] [--json]
// Exit code 0 whenever the comparison ran (the caller applies the threshold); 2 on usage or load errors.
import { pathToFileURL } from 'node:url';
import { deltaE, over, parseColor } from './lib/color.mjs';
import { requirePlaywright, launchChromium, toUrl, flags } from './lib/pw.mjs';

export { ciede2000, rgbToLab, deltaE } from './lib/color.mjs';

const tokens = (s) => String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Dice coefficient on token multisets. */
export function dice(a, b) {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length && !tb.length) return 1;
  if (!ta.length || !tb.length) return 0;
  const counts = new Map();
  for (const t of ta) counts.set(t, (counts.get(t) || 0) + 1);
  let common = 0;
  for (const t of tb) if (counts.get(t) > 0) { common++; counts.set(t, counts.get(t) - 1); }
  return (2 * common) / (ta.length + tb.length);
}

const area = (b) => Math.max(1, b.w * b.h);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mean = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);

/**
 * Pure comparison. Block: { text, x, y, w, h, color, bg? } where colours are {r,g,b,a?}, '#hex' or 'rgb(...)'.
 * opts: { width, height, threshold = 0.5 }. width/height normalise centre distances (default: extent of all blocks).
 */
export function compareBlocks(mockBlocks, builtBlocks, opts = {}) {
  const threshold = opts.threshold ?? 0.5;
  const all = [...mockBlocks, ...builtBlocks];
  const W = opts.width || Math.max(1, ...all.map((b) => b.x + b.w));
  const H = opts.height || Math.max(1, ...all.map((b) => b.y + b.h));

  const candidates = [];
  mockBlocks.forEach((m, i) => builtBlocks.forEach((b, j) => {
    const score = dice(m.text, b.text);
    if (score < threshold) return;
    const dist = Math.hypot((m.x + m.w / 2 - b.x - b.w / 2) / W, (m.y + m.h / 2 - b.y - b.h / 2) / H);
    candidates.push({ i, j, score, dist });
  }));
  // Greedy best match: highest text similarity first; the nearest block wins ties (repeated labels such as "Edit").
  candidates.sort((p, q) => q.score - p.score || p.dist - q.dist);
  const usedM = new Set(), usedB = new Set(), pairs = [];
  for (const c of candidates) {
    if (usedM.has(c.i) || usedB.has(c.j)) continue;
    usedM.add(c.i); usedB.add(c.j); pairs.push(c);
  }

  const totalArea = all.reduce((s, b) => s + area(b), 0);
  // Matched area counts the smaller of the two boxes, so a size mismatch also costs.
  const matchedArea = pairs.reduce((s, p) => s + 2 * Math.min(area(mockBlocks[p.i]), area(builtBlocks[p.j])), 0);
  const blockMatch = totalArea ? clamp01(matchedArea / totalArea) : 1;
  const text = mean(pairs.map((p) => p.score));
  const position = pairs.length ? clamp01(1 - mean(pairs.map((p) => p.dist))) : 0;

  const flat = (c, bg) => {
    const fg = parseColor(c);
    if (!fg) return null;
    const back = over(parseColor(bg || '#ffffff') || { r: 255, g: 255, b: 255, a: 1 }, { r: 255, g: 255, b: 255 });
    return over(fg, back);
  };
  const deltas = [];
  for (const p of pairs) {
    const m = mockBlocks[p.i], b = builtBlocks[p.j];
    const cm = flat(m.color, m.bg), cb = flat(b.color, b.bg);
    if (cm && cb) deltas.push(deltaE(cm, cb));
  }
  const meanDeltaE = mean(deltas);
  const colorScore = deltas.length ? clamp01(1 - meanDeltaE / 10) : 0;
  const fidelity = (blockMatch + text + position + colorScore) / 4;
  const brief = (b) => ({ text: b.text.slice(0, 80), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });
  return {
    blockMatch, text, position, color: { deltaE: meanDeltaE, score: colorScore }, fidelity,
    counts: { mockup: mockBlocks.length, built: builtBlocks.length, matched: pairs.length },
    unmatchedMockup: mockBlocks.filter((_, i) => !usedM.has(i)).map(brief),
    unmatchedBuilt: builtBlocks.filter((_, j) => !usedB.has(j)).map(brief),
  };
}

// Runs in the page: every visible element with its own text becomes a block.
function extractInPage() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const resolve = (css) => { // any CSS colour (rgb, oklch, named) to {r,g,b,a}
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = resolve(getComputedStyle(e).backgroundColor);
      if (c.a > 0.01) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const blocks = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own.length) continue;
    const range = document.createRange();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of own) {
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
      }
    }
    if (x0 === Infinity) continue;
    blocks.push({
      text: own.map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim(),
      x: x0 + scrollX, y: y0 + scrollY, w: x1 - x0, h: y1 - y0,
      color: resolve(cs.color), bg: bgOf(el),
    });
  }
  return { blocks, height: Math.max(document.documentElement.scrollHeight, innerHeight) };
}

async function load(browser, url, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.waitForTimeout(300);
  const data = await page.evaluate(extractInPage);
  await context.close();
  return data;
}

async function main() {
  const a = flags(process.argv.slice(2), ['json']);
  const vm = /^(\d+)x(\d+)$/.exec(a.viewport || '1440x900');
  if (!a.mockup || !a.url || !vm) {
    console.error('Usage: node fidelity.mjs --mockup <mockup.html> --url <built page url> [--viewport 1440x900|390x844] [--app dir] [--json]');
    process.exit(2);
  }
  const vp = { width: +vm[1], height: +vm[2] };
  const browser = await launchChromium(requirePlaywright({ app: a.app }), { install: true });
  try {
    const mock = await load(browser, toUrl(a.mockup), vp);
    const built = await load(browser, toUrl(a.url), vp);
    const r = compareBlocks(mock.blocks, built.blocks, { width: vp.width, height: Math.max(mock.height, built.height) });
    r.viewport = `${vp.width}x${vp.height}`;
    if (a.json) { console.log(JSON.stringify(r, null, 2)); return; }
    const f = (v) => v.toFixed(3);
    console.log(`Fidelity at ${r.viewport}: ${f(r.fidelity)}`);
    console.log(`  Block-Match ${f(r.blockMatch)}   Text ${f(r.text)}   Position ${f(r.position)}   Color ${f(r.color.score)} (mean dE2000 ${r.color.deltaE.toFixed(2)})`);
    console.log(`  blocks: mockup ${r.counts.mockup}, built ${r.counts.built}, matched ${r.counts.matched}`);
    for (const [label, list] of [['in mockup, missing from built', r.unmatchedMockup], ['in built, not in mockup', r.unmatchedBuilt]]) {
      if (list.length) console.log(`  unmatched ${label}:\n` + list.slice(0, 25).map((b) => `    "${b.text}" at ${b.x},${b.y} ${b.w}x${b.h}`).join('\n'));
    }
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(2); });
