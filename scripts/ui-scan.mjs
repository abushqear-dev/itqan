#!/usr/bin/env node
// Itqan UI scan: loads each screen of a running app and reports problems a user would see.
// Approach adapted from Anthropic's webapp-testing skill (reconnaissance before action); written for Node.
// Uses the app's own Playwright install (and @axe-core/playwright if present). No network access beyond the app.
//
// Usage: node ui-scan.mjs --app <app dir> --url <base url> --routes "#/,#/shifts,#/report"
//        [--storage <playwright storage-state.json>] [--width 375] [--height 812]
//
// States mode: node ui-scan.mjs --states --app <app dir> --url <base url> [--config .itqan/states.json] [--copy docs/02-ux/copy.md]
//        [--only SCR-01,SCR-02] [--routes "/a,/b"] [--storage state.json] [--height 900] [--json]
// Per screen it forces loading/error/empty data states, checks hover/focus/active/disabled styles, widths 375/768/1440,
// reduced motion, focus-indicator contrast and target size. With --json the per-check lines go to stderr and the summary to stdout.
// Exit code 1 if any screen shows stray text, horizontal overflow, console errors or serious accessibility violations.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

function parseArgs(argv) {
  const args = { width: 375, height: 812 };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'states' || key === 'json') args[key] = true; else args[key] = argv[++i];
  }
  if (args.states ? !args.app || !args.url : !args.app || !args.url || !args.routes) {
    console.error('Usage: node ui-scan.mjs --app <app dir> --url <base url> --routes "#/,#/page" [--storage state.json] [--width 375]');
    process.exit(2);
  }
  return args;
}

function loadFromApp(appDir, name) {
  try { return createRequire(path.join(path.resolve(appDir), 'package.json'))(name); } catch { return null; }
}

const STRAY_TEXT = /\bnull\b|\bundefined\b|\[object [A-Za-z]+\]|\bNaN\b/g;

async function scanScreen(page, url, AxeBuilder) {
  const consoleErrors = [];
  const onConsole = (m) => { if (m.type() === 'error' && !/status of 4\d\d/.test(m.text())) consoleErrors.push(m.text()); };
  const onPageError = (e) => consoleErrors.push(`pageerror: ${e.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const facts = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const doc = document.documentElement;
    const small = [];
    for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button]')) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue;
      if (r.width < 24 || r.height < 24) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return { text, overflow: doc.scrollWidth > doc.clientWidth, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, small };
  });

  const stray = [...new Set((facts.text.match(STRAY_TEXT) || []))].map((word) => {
    const at = facts.text.indexOf(word);
    return `"${word}" near "${facts.text.slice(Math.max(0, at - 25), at + word.length + 25).replace(/\s+/g, ' ').trim()}"`;
  });

  let axe = null;
  if (AxeBuilder) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    axe = result.violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length})`);
  }
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  return { stray, overflow: facts.overflow ? `${facts.scrollWidth}px > ${facts.clientWidth}px` : null, small: facts.small, consoleErrors, axe };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.states) return (await import('./lib/ui-states-cli.mjs')).runStatesCli(args);
  const playwright = loadFromApp(args.app, 'playwright') || loadFromApp(args.app, '@playwright/test');
  if (!playwright) {
    console.error('Playwright is not installed in the app. Add it as a dev dependency (npm i -D playwright) and run npx playwright install chromium.');
    process.exit(2);
  }
  const axeModule = loadFromApp(args.app, '@axe-core/playwright');
  const AxeBuilder = axeModule ? (axeModule.default || axeModule.AxeBuilder || axeModule) : null;

  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: Number(args.width), height: Number(args.height) },
    ...(args.storage && fs.existsSync(args.storage) ? { storageState: args.storage } : {}),
  });
  const page = await context.newPage();
  let failed = false;
  console.log(`UI scan at ${args.width}x${args.height}${AxeBuilder ? ' with axe' : ' (axe not installed: add @axe-core/playwright for accessibility checks)'}`);
  // Git Bash on Windows rewrites arguments like "#/signin" into "#C:/Program Files/Git/signin"; undo that.
  const repair = (r) => r.replace(/^(#?)[A-Za-z]:[\\/](?:.*[\\/])?Git[\\/]/i, '$1/');
  for (const route of args.routes.split(',').map((r) => repair(r.trim())).filter(Boolean)) {
    const url = new URL(route, args.url.endsWith('/') ? args.url : args.url + '/').href;
    const r = await scanScreen(page, url, AxeBuilder);
    const serious = (r.axe || []).filter((v) => /^(serious|critical)/.test(v));
    const bad = r.stray.length || r.overflow || r.consoleErrors.length || serious.length;
    if (bad) failed = true;
    console.log(`\n${bad ? 'FAIL' : 'PASS'} ${route}`);
    if (r.stray.length) console.log(`  stray text: ${r.stray.join('; ')}`);
    if (r.overflow) console.log(`  horizontal overflow: ${r.overflow}`);
    if (r.consoleErrors.length) console.log(`  console errors: ${r.consoleErrors.slice(0, 5).join(' | ')}`);
    if (r.small.length) console.log(`  targets under 24px (check WCAG 2.5.8): ${r.small.slice(0, 6).join('; ')}`);
    if (r.axe && r.axe.length) console.log(`  axe: ${r.axe.join('; ')}`);
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
