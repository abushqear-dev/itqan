#!/usr/bin/env node
// Itqan token audit: reports every computed style value on a page that is not in the design token set.
// Tokens are read from a W3C Design Tokens file (aliases like {color.primary} are resolved).
//
// Usage: node token-audit.mjs --tokens docs/02-ux/tokens.json --url <page or file url> [--viewport 1440x900] [--app dir] [--json]
// Exit code 1 if any value is off the token set or more than 6 distinct font sizes are used; 2 on errors.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseColor, toHex } from './lib/color.mjs';
import { requirePlaywright, launchChromium, toUrl, flags } from './lib/pw.mjs';

export const MAX_FONT_SIZES = 6;
const FONT_TOLERANCE = 0.5;

// ---- normalisation -------------------------------------------------------------------------------
const num = (v) => Math.round(v * 100) / 100;

function toPx(v) {
  if (v && typeof v === 'object') return v.unit === 'rem' ? v.value * 16 : v.value;
  const m = /^(-?[\d.]+)(px|rem|em)?$/.exec(String(v).trim());
  if (!m) return null;
  return m[2] === 'rem' || m[2] === 'em' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
}

function toMs(v) {
  if (v && typeof v === 'object') return v.unit === 's' ? v.value * 1000 : v.value;
  const m = /^(-?[\d.]+)(ms|s)?$/.exec(String(v).trim());
  return m ? (m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1])) : null;
}

const colorKey = (c) => { const p = typeof c === 'object' && !Array.isArray(c) && c.components
  ? { r: c.components[0] * 255, g: c.components[1] * 255, b: c.components[2] * 255 } : parseColor(c); return p ? toHex(p) : null; };

const shadowHex = (c) => {
  const p = typeof c === 'object' && !Array.isArray(c) && c.components ? { r: c.components[0] * 255, g: c.components[1] * 255, b: c.components[2] * 255, a: c.alpha ?? 1 } : parseColor(c);
  return p ? toHex(p) + (p.a < 1 ? Math.round(p.a * 255).toString(16).padStart(2, '0') : '') : '';
};

const familyKey = (v) => String(Array.isArray(v) ? v[0] : v).split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();

/** Canonical box-shadow text: "x y blur spread #rrggbbaa [inset]" per layer, layers joined by "|". */
export function shadowKey(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) v = [v];
  if (Array.isArray(v)) {
    return v.map((s) => [toPx(s.offsetX), toPx(s.offsetY), toPx(s.blur), toPx(s.spread ?? 0), shadowHex(s.color), s.inset ? 'inset' : ''].map((x) => x ?? '').join(' ')).join('|');
  }
  const layers = String(v).split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);
  return layers.map((l) => {
    const color = l.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/i)?.[0];
    const rest = l.replace(color || '', '').replace(/\binset\b/, '').trim().split(/\s+/).filter(Boolean).map(toPx);
    const [x, y, blur = 0, spread = 0] = rest;
    const hex = color ? shadowHex(color) : '';
    return [x, y, blur, spread, hex, /\binset\b/.test(l) ? 'inset' : ''].map((q) => q ?? '').join(' ');
  }).join('|');
}

// ---- token set -----------------------------------------------------------------------------------
/** Parse a W3C tokens object into { color, fontSize, fontFamily, spacing, radius, shadow, duration } sets. */
export function loadTokenSet(tree) {
  const leaves = new Map(); // dotted path -> { type, value }
  const walk = (node, pathParts, inheritedType) => {
    const type = node.$type || inheritedType;
    if ('$value' in node) { leaves.set(pathParts.join('.'), { type, value: node.$value }); return; }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$') && v && typeof v === 'object') walk(v, [...pathParts, k], type);
  };
  walk(tree, [], undefined);
  const resolve = (value, seen = new Set()) => {
    if (typeof value === 'string') {
      const m = /^\{([^}]+)\}$/.exec(value.trim());
      if (m) {
        if (seen.has(m[1]) || !leaves.has(m[1])) return value;
        return resolve(leaves.get(m[1]).value, new Set([...seen, m[1]]));
      }
    }
    if (Array.isArray(value)) return value.map((v) => resolve(v, seen));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, seen)]));
    return value;
  };
  const set = { color: new Set(), fontSize: new Set(), fontFamily: new Set(), spacing: new Set(), radius: new Set(), shadow: new Set(), duration: new Set() };
  for (const [p, { type, value }] of leaves) {
    const v = resolve(value);
    const lower = p.toLowerCase();
    if (type === 'color') { const k = colorKey(v); if (k) set.color.add(k); }
    else if (type === 'fontFamily') set.fontFamily.add(familyKey(v));
    else if (type === 'shadow') set.shadow.add(shadowKey(v));
    else if (type === 'duration') { const ms = toMs(v); if (ms !== null) set.duration.add(num(ms)); }
    else if (type === 'dimension' || type === 'fontSize') {
      const px = toPx(v);
      if (px === null) continue;
      if (type === 'fontSize' || /font|text|type/.test(lower)) set.fontSize.add(num(px));
      else if (/radius|round/.test(lower)) set.radius.add(num(px));
      else set.spacing.add(num(px));
    }
  }
  return set;
}

// ---- audit ---------------------------------------------------------------------------------------
/** Normalise one observed value for its category; returns null when the value is always allowed. */
function normaliseObserved(category, value) {
  const s = String(value).trim().toLowerCase();
  if (['', 'none', 'normal', 'auto', 'inherit', 'initial', 'unset', 'currentcolor', 'transparent', '0', '0px', '0s', '0ms'].includes(s)) return null;
  switch (category) {
    case 'color': { const c = parseColor(s); return !c || c.a === 0 ? null : toHex(c); }
    case 'fontSize': case 'spacing': case 'radius': { const px = toPx(s); return px === null || px === 0 ? null : num(px); }
    case 'duration': { const ms = toMs(s); return ms === null || ms === 0 ? null : num(ms); }
    case 'fontFamily': return familyKey(value);
    case 'shadow': return shadowKey(value);
    default: return s;
  }
}

function inSet(set, category, key) {
  if (!set[category]) return true;
  if (category === 'fontSize') return [...set.fontSize].some((t) => Math.abs(t - key) <= FONT_TOLERANCE);
  if (category === 'spacing') return set.spacing.has(Math.abs(key));
  return set[category].has(key);
}

/**
 * Pure audit. tokenSet from loadTokenSet; observed = [{ category, prop, value, selector }].
 * Returns { violations: [{ category, prop, value, count, selectors }], checked, fontSizes }.
 */
export function auditValues(tokenSet, observed) {
  const found = new Map();
  const fontSizes = new Set();
  let checked = 0;
  for (const o of observed) {
    const key = normaliseObserved(o.category, o.value);
    if (key === null) continue;
    checked++;
    if (o.category === 'fontSize') fontSizes.add(key);
    if (inSet(tokenSet, o.category, key)) continue;
    const id = `${o.category}|${o.prop}|${key}`;
    const entry = found.get(id) || { category: o.category, prop: o.prop, value: String(key), count: 0, selectors: [] };
    entry.count++;
    if (o.selector && !entry.selectors.includes(o.selector) && entry.selectors.length < 5) entry.selectors.push(o.selector);
    found.set(id, entry);
  }
  return { violations: [...found.values()].sort((p, q) => q.count - p.count), checked, fontSizes: [...fontSizes].sort((p, q) => p - q) };
}

// ---- page walk -----------------------------------------------------------------------------------
function collectInPage() {
  const out = [];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = (css) => { // normalise any CSS colour (rgb, oklch, color-mix) to rgba()
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${d[0]},${d[1]},${d[2]},${d[3] / 255})`;
  };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = [...el.classList].slice(0, 2).join('.');
    return cls ? `${s}.${cls}` : s;
  };
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const selector = sel(el);
    const add = (category, prop, value) => out.push({ category, prop, value, selector });
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      add('color', 'color', rgba(cs.color));
      add('fontSize', 'font-size', cs.fontSize);
      add('fontFamily', 'font-family', cs.fontFamily);
    }
    if (cs.backgroundColor) add('color', 'background-color', rgba(cs.backgroundColor));
    for (const side of ['top', 'right', 'bottom', 'left']) {
      if (parseFloat(cs[`border${side[0].toUpperCase()}${side.slice(1)}Width`]) > 0 && cs[`border${side[0].toUpperCase()}${side.slice(1)}Style`] !== 'none') {
        add('color', `border-${side}-color`, rgba(cs[`border${side[0].toUpperCase()}${side.slice(1)}Color`]));
      }
      add('spacing', `padding-${side}`, cs[`padding${side[0].toUpperCase()}${side.slice(1)}`]);
      let m = cs[`margin${side[0].toUpperCase()}${side.slice(1)}`];
      // Computed margins report the used value, so a centring "auto" shows up as an odd pixel size: skip that case.
      const parent = el.parentElement;
      if ((side === 'left' || side === 'right') && cs.marginLeft === cs.marginRight && cs.display === 'block' && parent && r.width < parent.clientWidth - 1) m = '0px';
      add('spacing', `margin-${side}`, m);
    }
    add('spacing', 'row-gap', cs.rowGap);
    add('spacing', 'column-gap', cs.columnGap);
    for (const c of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']) add('radius', 'border-radius', cs[c]);
    add('shadow', 'box-shadow', cs.boxShadow);
    for (const d of cs.transitionDuration.split(',')) add('duration', 'transition-duration', d.trim());
  }
  return out;
}

async function main() {
  const a = flags(process.argv.slice(2), ['json']);
  const vm = /^(\d+)x(\d+)$/.exec(a.viewport || '1440x900');
  if (!a.tokens || !a.url || !vm) {
    console.error('Usage: node token-audit.mjs --tokens docs/02-ux/tokens.json --url <page or file url> [--viewport 1440x900] [--app dir] [--json]');
    process.exit(2);
  }
  const tokenSet = loadTokenSet(JSON.parse(fs.readFileSync(a.tokens, 'utf8')));
  const browser = await launchChromium(requirePlaywright({ app: a.app }), { install: true });
  try {
    const page = await (await browser.newContext({ viewport: { width: +vm[1], height: +vm[2] } })).newPage();
    await page.goto(toUrl(a.url), { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const r = auditValues(tokenSet, await page.evaluate(collectInPage));
    const tooMany = r.fontSizes.length > MAX_FONT_SIZES;
    const pass = !r.violations.length && !tooMany;
    const result = { pass, checked: r.checked, violations: r.violations, fontSizes: r.fontSizes, fontSizeFail: tooMany ? `${r.fontSizes.length} distinct font sizes, maximum ${MAX_FONT_SIZES}` : null };
    if (a.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`${pass ? 'PASS' : 'FAIL'} token audit of ${a.url}: ${r.checked} values checked, ${r.violations.length} off-token`);
      for (const v of r.violations) console.log(`  ${v.prop} = ${v.value} (${v.category}) x${v.count}  e.g. ${v.selectors.join(', ')}`);
      console.log(`  font sizes in use (${r.fontSizes.length}): ${r.fontSizes.join(', ')}${tooMany ? `  FAIL: more than ${MAX_FONT_SIZES}` : ''}`);
    }
    process.exitCode = pass ? 0 : 1;
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(2); });
