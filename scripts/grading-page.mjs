#!/usr/bin/env node
// Builds ONE self-contained HTML grading page for a human grader (no network, works from file://).
// Usage: node scripts/grading-page.mjs build --set gold/G-R2 --out grading/G-R2.html [--rubric R2] [--title "..."]
//
// Set layout: <set>/items/<id>.md|txt  (shown as text)   <id>.png|jpg|webp|gif|svg  (embedded as data URI)
//   Pair sets: <id>.a.<ext> and <id>.b.<ext> (text or image) per pair. Items with a .a/.b part are pairs.
// Optional <set>/set.json: { "rubric": "R2", "title": "...", "dimensions": ["Hierarchy", ...] }.
//   With dimensions, the grader picks a level per dimension; the export has one row per (id, dimension).
// The rubric is rubrics/<R>.md (R from --rubric, set.json, or the set folder name G-R2 -> R2).
// truth.json is never read into the page: source, truth and judge output are not embedded.
// The exported file grades-<name>.json is [{ id, level | choice, dimension?, evidence, seconds }].
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Tiny markdown subset for the rubric: headings, tables, paragraphs, list items. Everything is escaped. */
export function renderMarkdown(md) {
  const out = [];
  const lines = md.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
      out.push('<div class="tw"><table>' + body.map((r, k) => '<tr>' + cells(r).map((c) => (k === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('') + '</tr>').join('') + '</table></div>');
    } else if (/^#{1,6}\s/.test(l)) {
      const lvl = Math.min(6, l.match(/^#+/)[0].length + 2);
      out.push(`<h${lvl}>${inline(l.replace(/^#+\s*/, ''))}</h${lvl}>`);
    } else if (/^\s*[-*]\s+/.test(l)) {
      out.push(`<p class="li">${inline(l.replace(/^\s*[-*]\s+/, ''))}</p>`);
    } else if (l.trim()) {
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  return out.join('\n');
}

function readPart(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  if (MIME[ext]) return { image: `data:${MIME[ext]};base64,${fs.readFileSync(file).toString('base64')}` };
  return { text: fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') };
}

/** Collects items from <set>/items. Returns [{ id, parts: { main } | { a, b } }] sorted by id. */
export function collectItems(setDir) {
  const dir = path.join(setDir, 'items');
  const groups = new Map();
  for (const f of fs.readdirSync(dir).sort()) {
    const m = /^(.*?)(?:\.([ab]))?\.(md|txt|png|jpe?g|webp|gif|svg)$/i.exec(f);
    if (!m) continue;
    const g = groups.get(m[1]) ?? {};
    g[(m[2] ?? 'main').toLowerCase()] = readPart(path.join(dir, f));
    groups.set(m[1], g);
  }
  return [...groups].map(([id, parts]) => ({ id, pair: !!(parts.a && parts.b), ...(parts.a && parts.b ? { a: parts.a, b: parts.b } : { main: parts.main ?? parts.a ?? parts.b }) }));
}

export function buildPage({ setDir, rubric, title }) {
  const meta = fs.existsSync(path.join(setDir, 'set.json')) ? JSON.parse(fs.readFileSync(path.join(setDir, 'set.json'), 'utf8')) : {};
  const setName = path.basename(path.resolve(setDir));
  const rubricId = rubric ?? meta.rubric ?? (/^G-(R\d+K?)/.exec(setName) || [])[1];
  const rubricFile = rubricId ? path.join(ROOT, 'rubrics', `${rubricId}.md`) : null;
  const anchors = rubricFile && fs.existsSync(rubricFile)
    ? renderMarkdown(fs.readFileSync(rubricFile, 'utf8'))
    : `<p class="note">The rubric anchors for this set are not written yet (${esc(rubricFile ?? 'no rubric named')}). Ask the person running the calibration before you grade.</p>`;
  const items = collectItems(setDir);
  if (!items.length) throw new Error(`no items found in ${path.join(setDir, 'items')}`);
  const data = { set: setName, items, dimensions: meta.dimensions ?? [] };
  const json = JSON.stringify(data).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
  return TEMPLATE
    .split('{{TITLE}}').join(esc(title ?? meta.title ?? `Grading: ${setName}`))
    .split('{{ANCHORS}}').join(anchors)
    .split('{{DATA}}').join(json);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv.shift();
  const o = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i];
  if (cmd !== 'build' || !o.set || !o.out) {
    console.error('usage: node scripts/grading-page.mjs build --set gold/G-R2 --out grading/G-R2.html [--rubric R2] [--title "..."]');
    process.exit(2);
  }
  const html = buildPage({ setDir: o.set, rubric: o.rubric, title: o.title });
  fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
  fs.writeFileSync(o.out, html);
  console.log(`wrote ${o.out} (${(html.length / 1024).toFixed(0)} KB)`);
}


const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<style>
:root { --bg:#fafaf7; --fg:#1d1d1b; --muted:#5d5d57; --card:#fff; --line:#d9d8d0; --accent:#1f5f4a; --accent-fg:#fff; --warn:#fff3cd; --warn-fg:#5c4400; }
@media (prefers-color-scheme: dark) { :root { --bg:#161715; --fg:#ecebe4; --muted:#a3a299; --card:#1f201d; --line:#3a3b36; --accent:#6cc4a4; --accent-fg:#10201a; --warn:#3b3210; --warn-fg:#f1d98a; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 820px; margin: 0 auto; padding: 16px; }
h1 { font-size: 1.35rem; margin: 8px 0 4px; }
h2 { font-size: 1.1rem; margin: 20px 0 8px; }
.muted { color: var(--muted); }
.card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:16px; margin:12px 0; }
.item { white-space: pre-wrap; word-break: break-word; font: 0.95rem/1.5 ui-monospace, Consolas, monospace; margin:0; max-height: 55vh; overflow:auto; }
.item-img { max-width:100%; height:auto; display:block; border:1px solid var(--line); border-radius:6px; }
.pair { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
@media (max-width: 640px) { .pair { grid-template-columns: 1fr; } }
.tag { font-weight:600; margin:0 0 6px; }
fieldset { border:1px solid var(--line); border-radius:8px; margin:12px 0; padding:8px 12px 12px; }
legend { font-weight:600; padding:0 6px; }
.choices { display:flex; flex-wrap:wrap; gap:8px; }
.choices label { display:inline-flex; align-items:center; justify-content:center; min-width:48px; min-height:48px; padding:0 14px; border:2px solid var(--line); border-radius:8px; cursor:pointer; font-weight:600; background:var(--card); }
.choices input { position:absolute; opacity:0; width:1px; height:1px; }
.choices input:checked + span { color:var(--accent-fg); }
.choices label:has(input:checked) { background:var(--accent); border-color:var(--accent); color:var(--accent-fg); }
.choices label:has(input:focus-visible) { outline:3px solid var(--fg); outline-offset:2px; }
textarea, input[type=text] { width:100%; font:inherit; color:inherit; background:var(--card); border:1px solid var(--line); border-radius:8px; padding:8px; }
textarea { min-height: 90px; }
label.block { display:block; font-weight:600; margin:12px 0 4px; }
button { font:inherit; min-height:44px; padding:0 16px; border-radius:8px; border:1px solid var(--accent); background:var(--accent); color:var(--accent-fg); cursor:pointer; }
button.secondary { background:transparent; color:var(--fg); border-color:var(--line); }
button:focus-visible, textarea:focus-visible, input:focus-visible { outline:3px solid var(--fg); outline-offset:2px; }
.bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; margin-top:12px; }
.progress { height:8px; background:var(--line); border-radius:4px; overflow:hidden; } .progress > div { height:100%; background:var(--accent); width:0; }
.banner { background:var(--warn); color:var(--warn-fg); border-radius:8px; padding:12px; margin:12px 0; display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
.note { background:var(--warn); color:var(--warn-fg); padding:10px; border-radius:8px; }
.tw { overflow-x:auto; } table { border-collapse:collapse; font-size:0.9rem; } th, td { border:1px solid var(--line); padding:6px 8px; text-align:left; vertical-align:top; }
details summary { cursor:pointer; font-weight:600; min-height:44px; display:flex; align-items:center; }
.li { margin:2px 0 2px 12px; } [hidden] { display:none !important; }
kbd { border:1px solid var(--line); border-bottom-width:2px; border-radius:4px; padding:0 5px; font-size:0.85em; }
</style>
</head>
<body>
<main>
<h1>{{TITLE}}</h1>
<section id="start" class="card">
  <p>You will grade each item on your own. You will not see where an item came from or what anyone else gave it. Your answers are saved in this browser as you go. At the end, press <strong>Export my grades</strong> and send the file.</p>
  <label class="block" for="who">Your name</label>
  <input type="text" id="who" autocomplete="name">
  <p class="muted">Keys: <kbd>1</kbd>-<kbd>5</kbd> pick a level, <kbd>A</kbd> <kbd>B</kbd> <kbd>T</kbd> pick on pair items (T is Tie), <kbd>N</kbd> next, <kbd>P</kbd> previous. Take a break every 30 minutes.</p>
  <button id="go" type="button">Start grading</button>
</section>
<section id="work" hidden>
  <div class="progress" aria-hidden="true"><div id="bar"></div></div>
  <p id="count" class="muted" aria-live="polite"></p>
  <div id="break" class="banner" role="status" hidden><span>You have been grading for 30 minutes. Stand up, look away from the screen for a few minutes, then come back.</span><button type="button" id="rested">I took a break</button></div>
  <details class="card"><summary>Rubric anchors</summary>{{ANCHORS}}</details>
  <div class="card" id="itemBox"></div>
  <form id="form" onsubmit="return false">
    <div id="pickers"></div>
    <label class="block" for="evidence">Evidence: quote or point to what made you choose this</label>
    <textarea id="evidence"></textarea>
  </form>
  <div class="bar">
    <button type="button" class="secondary" id="prev">Previous (P)</button>
    <button type="button" id="next">Next (N)</button>
  </div>
  <div class="bar card">
    <span id="status" class="muted" aria-live="polite"></span>
    <button type="button" id="export">Export my grades</button>
  </div>
</section>
<script type="application/json" id="data">{{DATA}}</script>
<script>
(function () {
  'use strict';
  var DATA = JSON.parse(document.getElementById('data').textContent);
  var DIMS = DATA.dimensions && DATA.dimensions.length ? DATA.dimensions : [''];
  var LEVELS = [1, 2, 3, 4, 5];
  var mem = {}; // fallback when localStorage is unavailable
  function sget(k) { try { var v = window.localStorage.getItem(k); return v === null ? (mem[k] === undefined ? null : mem[k]) : v; } catch (e) { return mem[k] === undefined ? null : mem[k]; } }
  function sset(k, v) { mem[k] = v; try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function $(id) { return document.getElementById(id); }

  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6d2b79f5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffled(items, name) {
    var r = rng(hashStr(name.trim().toLowerCase())), a = items.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  var name = '', order = [], pos = 0, grades = {}, working = 0, shownAt = 0, lastTick = 0, sinceBreak = 0, storeKey = '';
  // grades[id] = { dims: { dimName: level|choice }, evidence: '', seconds: n }

  function save() { sset(storeKey, JSON.stringify({ pos: pos, grades: grades, sinceBreak: sinceBreak })); }
  function load() {
    var raw = sget(storeKey);
    if (!raw) return;
    try { var s = JSON.parse(raw); grades = s.grades || {}; pos = Math.min(s.pos || 0, order.length - 1); sinceBreak = s.sinceBreak || 0; } catch (e) { grades = {}; }
  }
  function cur() { return order[pos]; }
  function rec(id) { if (!grades[id]) grades[id] = { dims: {}, evidence: '', seconds: 0 }; return grades[id]; }

  function tick() {
    var now = Date.now();
    if (lastTick && !document.hidden && cur()) { var d = Math.min(60, (now - lastTick) / 1000); rec(cur().id).seconds += d; sinceBreak += d; }
    lastTick = now;
    if (sinceBreak >= 1800) $('break').hidden = false;
  }

  function partNode(part, label) {
    var box = document.createElement('div');
    if (label) { var t = document.createElement('p'); t.className = 'tag'; t.textContent = label; box.appendChild(t); }
    if (part.image) { var im = document.createElement('img'); im.className = 'item-img'; im.src = part.image; im.alt = label ? 'Screen ' + label : 'Item to grade'; box.appendChild(im); }
    else { var pre = document.createElement('pre'); pre.className = 'item'; pre.tabIndex = 0; pre.textContent = part.text; box.appendChild(pre); }
    return box;
  }

  function choicesFor(it) { return it.pair ? ['A', 'B', 'Tie'] : LEVELS; }

  function render() {
    var it = cur(), r = rec(it.id), box = $('itemBox');
    box.textContent = '';
    if (it.pair) { var g = document.createElement('div'); g.className = 'pair'; g.appendChild(partNode(it.a, 'A')); g.appendChild(partNode(it.b, 'B')); box.appendChild(g); }
    else box.appendChild(partNode(it.main, ''));
    var pk = $('pickers'); pk.textContent = '';
    DIMS.forEach(function (dim, di) {
      var fs = document.createElement('fieldset'), lg = document.createElement('legend'), row = document.createElement('div');
      lg.textContent = dim ? dim : (it.pair ? 'Which would the user rather use?' : 'Level (1 worst, 5 best)');
      fs.appendChild(lg); row.className = 'choices'; row.setAttribute('role', 'radiogroup');
      choicesFor(it).forEach(function (c) {
        var lab = document.createElement('label'), inp = document.createElement('input'), sp = document.createElement('span');
        inp.type = 'radio'; inp.name = 'pick' + di; inp.value = String(c); inp.checked = String(r.dims[dim]) === String(c);
        inp.addEventListener('change', function () { r.dims[dim] = it.pair ? String(c) : Number(c); save(); updateStatus(); });
        sp.textContent = String(c); lab.appendChild(inp); lab.appendChild(sp); row.appendChild(lab);
      });
      fs.appendChild(row); pk.appendChild(fs);
    });
    $('evidence').value = r.evidence || '';
    $('prev').disabled = pos === 0;
    $('next').textContent = pos === order.length - 1 ? 'Finish' : 'Next (N)';
    updateStatus();
    shownAt = Date.now();
  }

  function answered(id) { var r = grades[id]; return !!r && DIMS.every(function (d) { return r.dims[d] !== undefined; }); }
  function updateStatus() {
    var done = order.filter(function (o) { return answered(o.id); }).length;
    $('count').textContent = 'Item ' + (pos + 1) + ' of ' + order.length + '. Graded: ' + done + '.';
    $('bar').style.width = (100 * done / order.length) + '%';
    $('status').textContent = done === order.length ? 'All items graded.' : (order.length - done) + ' not graded yet.';
  }
  function go(delta) {
    tick(); rec(cur().id).evidence = $('evidence').value;
    var n = pos + delta;
    if (n < 0) return;
    if (n >= order.length) { updateStatus(); $('export').focus(); save(); return; }
    pos = n; save(); render(); window.scrollTo(0, 0);
  }

  function pick(value) {
    var r = rec(cur().id), dim = DIMS.filter(function (d) { return r.dims[d] === undefined; })[0];
    if (dim === undefined) dim = DIMS[DIMS.length - 1];
    r.dims[dim] = cur().pair ? String(value) : Number(value); save(); render();
  }

  function exportGrades() {
    tick(); rec(cur().id).evidence = $('evidence').value; save();
    var rows = [];
    order.forEach(function (o) {
      var r = grades[o.id]; if (!r) return;
      DIMS.forEach(function (d) {
        if (r.dims[d] === undefined) return;
        var row = { id: o.id };
        if (o.pair) row.choice = r.dims[d]; else row.level = r.dims[d];
        if (d) row.dimension = d;
        row.evidence = r.evidence || ''; row.seconds = Math.round(r.seconds / DIMS.length);
        rows.push(row);
      });
    });
    var blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'), safe = name.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'grader';
    a.href = URL.createObjectURL(blob); a.download = 'grades-' + safe + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    $('status').textContent = 'Exported ' + rows.length + ' grades.';
  }

  function start() {
    name = $('who').value.trim();
    if (!name) { $('who').focus(); $('who').setAttribute('aria-invalid', 'true'); return; }
    storeKey = 'itqan-grade:' + DATA.set + ':' + name.toLowerCase();
    sset('itqan-grade:last-name', name);
    order = shuffled(DATA.items, name); load();
    $('start').hidden = true; $('work').hidden = false;
    lastTick = Date.now(); render();
    setInterval(function () { tick(); save(); }, 15000);
  }

  $('go').addEventListener('click', start);
  $('who').addEventListener('keydown', function (e) { if (e.key === 'Enter') start(); });
  $('next').addEventListener('click', function () { go(1); });
  $('prev').addEventListener('click', function () { go(-1); });
  $('export').addEventListener('click', exportGrades);
  $('rested').addEventListener('click', function () { sinceBreak = 0; lastTick = Date.now(); $('break').hidden = true; save(); });
  $('evidence').addEventListener('input', function () { rec(cur().id).evidence = $('evidence').value; save(); });
  document.addEventListener('visibilitychange', function () { lastTick = Date.now(); });
  document.addEventListener('keydown', function (e) {
    if ($('work').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' && e.target.type === 'text') return;
    var k = e.key.toLowerCase();
    if (k === 'n') go(1); else if (k === 'p') go(-1);
    else if (!cur().pair && k >= '1' && k <= '5') pick(k);
    else if (cur().pair && (k === 'a' || k === 'b')) pick(k.toUpperCase());
    else if (cur().pair && k === 't') pick('Tie');
  });
  var last = sget('itqan-grade:last-name'); if (last) $('who').value = last;
})();
</script>
</main>
</body>
</html>
`;

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
