// Itqan states harness, used by `ui-scan.mjs --states`.
// Checks per screen: forced data states (loading, error, empty), interaction states, widths, reduced motion,
// focus-indicator contrast and target size. Each check yields { check, status: 'pass'|'fail'|'skip', detail }.
import fs from 'node:fs';
import { parseColor, over, contrastRatio } from './color.mjs';

export const WIDTHS = [375, 768, 1440];

// ---- copy deck -------------------------------------------------------------------------------------
/** Parse `- \`MSG.KEY\`: text` lines of copy.md into { key: text }. */
export function parseCopy(markdown) {
  const out = {};
  for (const line of markdown.split(/\r?\n/)) {
    const m = /^\s*[-*]\s*`([A-Z0-9_.]+)`\s*:\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    let text = m[2];
    if (/^<.*>$/.test(text)) text = text.slice(1, -1);
    out[m[1]] = text;
  }
  return out;
}

/** Text fragments that must appear on screen for a copy entry: the literal parts around {placeholders}. */
export function copyFragments(text) {
  return text.split(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length >= 3);
}

const norm = (s) => s.replace(/\s+/g, ' ').toLowerCase();
const check = (name, ok, detail = '') => ({ check: name, status: ok ? 'pass' : 'fail', detail });
const skip = (name, detail) => ({ check: name, status: 'skip', detail });

// ---- in-page probes --------------------------------------------------------------------------------
const bodyText = (page) => page.evaluate(() => document.body.innerText);

async function hasLoadingIndicator(page, pattern) {
  return page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const hay = `${el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className} ${el.id} ${el.getAttribute('role') || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('data-state') || ''} ${el.getAttribute('aria-busy') === 'true' ? 'busy' : ''}`;
      if (re.test(hay) || (el.children.length === 0 && re.test(el.textContent || ''))) return true;
    }
    return false;
  }, pattern);
}

const STYLE_PROPS = ['color', 'backgroundColor', 'borderTopColor', 'boxShadow', 'outlineStyle', 'outlineColor', 'outlineWidth', 'textDecorationLine', 'opacity', 'transform', 'cursor'];
const changed = (a, b) => STYLE_PROPS.filter((p) => a[p] !== b[p]);

// ---- checks ----------------------------------------------------------------------------------------
async function dataStates(page, base, entry, copy, results) {
  const states = entry.expect || {};
  const run = async (state, handler, wait, verify) => {
    const name = `data:${state}`;
    if (!(state in states)) return;
    if (!entry.apiPattern) return results.push(skip(name, 'no apiPattern in states.json'));
    await page.unroute(entry.apiPattern).catch(() => {});
    await page.route(entry.apiPattern, handler);
    try {
      await page.goto(base, { waitUntil: wait });
      await page.waitForTimeout(state === 'loading' ? 400 : 300);
      results.push(await verify());
    } finally { await page.unroute(entry.apiPattern).catch(() => {}); }
  };
  const textCheck = (state) => async () => {
    const key = states[state];
    const text = copy[key];
    if (text === undefined) return check(`data:${state}`, false, `${key} not found in copy.md`);
    const body = norm(await bodyText(page));
    const missing = copyFragments(text).filter((f) => !body.includes(norm(f)));
    return check(`data:${state}`, !missing.length, missing.length ? `${key} text not shown: "${missing[0]}"` : `${key} shown`);
  };
  await run('loading', async (route) => { await new Promise((r) => setTimeout(r, 3000)); await route.continue().catch(() => {}); }, 'domcontentloaded',
    async () => check('data:loading', await hasLoadingIndicator(page, states.loading), `looked for /${states.loading}/ while the API was delayed 3s`));
  await run('error', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"forced by itqan states"}' }), 'networkidle', textCheck('error'));
  await run('empty', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }), 'networkidle', textCheck('empty'));
}

async function interactionStates(page, base, results) {
  await page.goto(base, { waitUntil: 'networkidle' });
  const kinds = { button: 'button, [role=button]', link: 'a[href]', input: 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select' };
  for (const [kind, selector] of Object.entries(kinds)) {
    const loc = page.locator(selector).filter({ visible: true }).first();
    const handleOf = async () => (await loc.count()) ? loc.elementHandle() : null;
    const el = await handleOf();
    if (!el) { for (const s of ['hover', 'focus', 'active']) results.push(skip(`state:${kind}:${s}`, `no ${kind} on the screen`)); continue; }
    const read = () => el.evaluate((e, props) => { const cs = getComputedStyle(e); return Object.fromEntries(props.map((p) => [p, cs[p]])); }, STYLE_PROPS);
    await page.mouse.move(0, 0); await el.evaluate((e) => e.blur());
    await page.waitForTimeout(250);
    const base0 = await read();
    for (const state of ['hover', 'focus', 'active']) {
      await page.mouse.move(0, 0); await el.evaluate((e) => e.blur()); await page.waitForTimeout(50);
      const box = await el.boundingBox();
      if (state === 'hover') await el.hover({ force: true, timeout: 3000 });
      else if (state === 'focus') await el.evaluate((e) => e.focus({ focusVisible: true }));
      else if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); }
      await page.waitForTimeout(350); // let transitions finish
      const diff = changed(base0, await read());
      if (state === 'active') { await page.mouse.move(0, 0); await page.mouse.up(); }
      results.push(check(`state:${kind}:${state}`, diff.length > 0, diff.length ? `changes ${diff.join(', ')}` : 'computed style identical to the resting state'));
    }
  }
  // disabled: a disabled control must look different from an enabled one
  const disabled = page.locator('button:disabled, input:disabled, [aria-disabled=true]').first();
  const enabled = page.locator('button:enabled').filter({ visible: true }).first();
  if (!(await disabled.count())) results.push(skip('state:disabled', 'no disabled control on the screen'));
  else if (!(await enabled.count())) results.push(skip('state:disabled', 'no enabled button to compare with'));
  else {
    const grab = (l) => l.evaluate((e, props) => { const cs = getComputedStyle(e); return Object.fromEntries(props.map((p) => [p, cs[p]])); }, STYLE_PROPS);
    const diff = changed(await grab(enabled), await grab(disabled));
    results.push(check('state:disabled', diff.length > 0, diff.length ? `differs in ${diff.join(', ')}` : 'looks identical to an enabled button'));
  }
}

function layoutProbe() {
  const doc = document.documentElement;
  const rectOf = (el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return b; };
  const clipped = [], boxes = [];
  const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + el.classList[0] : ''} "${(el.innerText || '').trim().slice(0, 24)}"`;
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const clips = /hidden|clip/.test(cs.overflowX + cs.overflowY);
    if (clips && cs.textOverflow !== 'ellipsis' && !cs.webkitLineClamp && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) clipped.push(label(el));
    const b = rectOf(el);
    if (b.width > 1 && b.height > 1) boxes.push({ el, b });
  }
  const overlaps = [];
  for (let i = 0; i < Math.min(boxes.length, 600); i++) for (let j = i + 1; j < Math.min(boxes.length, 600); j++) {
    const p = boxes[i], q = boxes[j];
    if (p.el.contains(q.el) || q.el.contains(p.el)) continue;
    const w = Math.min(p.b.right, q.b.right) - Math.max(p.b.left, q.b.left), h = Math.min(p.b.bottom, q.b.bottom) - Math.max(p.b.top, q.b.top);
    if (w > 2 && h > 2 && (w * h) / Math.min(p.b.width * p.b.height, q.b.width * q.b.height) > 0.2) overlaps.push(`${label(p.el)} / ${label(q.el)}`);
  }
  return { overflow: doc.scrollWidth > doc.clientWidth ? `${doc.scrollWidth}px > ${doc.clientWidth}px` : null, clipped, overlaps };
}

async function widths(page, base, height, results) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const r = await page.evaluate(layoutProbe);
    results.push(check(`width:${w}:overflow`, !r.overflow, r.overflow ? `horizontal overflow ${r.overflow}` : ''));
    results.push(check(`width:${w}:clipped-text`, !r.clipped.length, r.clipped.slice(0, 3).join('; ')));
    results.push(check(`width:${w}:overlap`, !r.overlaps.length, r.overlaps.slice(0, 3).join('; ')));
  }
}

async function reducedMotion(page, base, results) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base, { waitUntil: 'networkidle' });
  const bad = await page.evaluate(() => {
    const ms = (v) => v.split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000) || 0);
    const out = [];
    for (const el of document.querySelectorAll('*')) for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      const anim = cs.animationName !== 'none' && ms(cs.animationDuration).some((d) => d > 0);
      const trans = cs.transitionProperty !== 'none' && ms(cs.transitionDuration).some((d) => d > 0);
      if (anim || trans) out.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}${pseudo || ''} ${anim ? 'animation ' + cs.animationDuration : 'transition ' + cs.transitionDuration}`);
    }
    return out;
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  results.push(check('reduced-motion', !bad.length, bad.length ? `${bad.length} still animate: ${bad.slice(0, 3).join('; ')}` : 'no animation or transition above 0ms'));
}

async function focusAndTargets(page, base, results) {
  await page.goto(base, { waitUntil: 'networkidle' });
  const facts = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0.01) return c; } return [255, 255, 255, 1]; };
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex="-1"])';
    const vis = [...document.querySelectorAll(sel)].filter((e) => { if (e.disabled || e.getAttribute('aria-disabled') === 'true') return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; });
    const focus = [];
    for (const el of vis.slice(0, 8)) {
      const rest = getComputedStyle(el).boxShadow;
      el.focus({ focusVisible: true });
      const cs = getComputedStyle(el);
      let colour = null, how = '';
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) { colour = rgba(cs.outlineColor); how = 'outline'; }
      else if (cs.boxShadow !== 'none' && cs.boxShadow !== rest) { colour = rgba(cs.boxShadow.match(/rgba?\([^)]*\)/)?.[0] || '#000'); how = 'box-shadow'; }
      focus.push({ name: `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 20)}"`, colour, how, bg: bgOf(el.parentElement || el) });
      el.blur();
    }
    const small = [];
    for (const el of vis) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      // WCAG 2.5.8 exempts links inside a sentence
      if (el.tagName === 'A' && cs.display === 'inline' && el.parentElement && el.parentElement.textContent.trim() !== el.textContent.trim()) continue;
      if (el.type === 'hidden' || ((el.type === 'checkbox' || el.type === 'radio') && el.labels && el.labels.length)) continue;
      if (r.width < 24 || r.height < 24) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return { focus, small, total: vis.length };
  });
  if (!facts.focus.length) results.push(skip('focus-indicator', 'no focusable element'));
  else {
    const bad = [];
    for (const f of facts.focus) {
      if (!f.colour) { bad.push(`${f.name}: no visible focus indicator`); continue; }
      const bg = over({ r: f.bg[0], g: f.bg[1], b: f.bg[2], a: 1 }, { r: 255, g: 255, b: 255 });
      const fg = over({ r: f.colour[0], g: f.colour[1], b: f.colour[2], a: f.colour[3] }, bg);
      const ratio = contrastRatio(fg, bg);
      if (ratio < 3) bad.push(`${f.name}: ${f.how} contrast ${ratio.toFixed(2)}:1`);
    }
    results.push(check('focus-indicator', !bad.length, bad.length ? bad.slice(0, 3).join('; ') : `${facts.focus.length} elements, all >= 3:1`));
  }
  results.push(facts.total ? check('target-size', !facts.small.length, facts.small.slice(0, 4).join('; ')) : skip('target-size', 'no interactive element'));
}

// ---- entry point -----------------------------------------------------------------------------------
/** Run every check for one screen. entry: { route, apiPattern?, expect? }. Returns an array of results. */
export async function runScreen(browser, { id, entry, baseUrl, copy, storage }) {
  const base = new URL(entry.route, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/').href;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(storage && fs.existsSync(storage) ? { storageState: storage } : {}) });
  const page = await context.newPage();
  const results = [];
  const guard = async (name, fn) => { try { await fn(); } catch (e) { results.push(check(name, false, `harness error: ${String(e.message).split('\n')[0]}`)); } };
  await guard('data', () => dataStates(page, base, entry, copy, results));
  await guard('state', () => interactionStates(page, base, results));
  await guard('width', () => widths(page, base, 900, results));
  await guard('reduced-motion', () => reducedMotion(page, base, results));
  await page.setViewportSize({ width: 375, height: 812 });
  await guard('focus-indicator', () => focusAndTargets(page, base, results));
  await context.close();
  return results.map((r) => ({ screen: id, ...r }));
}
