// Lazy Playwright loading for Itqan scripts. Playwright is not an Itqan dependency.
// Search order: the app's node_modules (same as ui-scan.mjs), the current directory, $ITQAN_PLAYWRIGHT_DIR,
// then a throwaway install in <tmpdir>/itqan-pw. With install:true a missing one is installed there
// (npm install playwright, then npx playwright install chromium when the browser binary is missing).
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

export const THROWAWAY_DIR = path.join(os.tmpdir(), 'itqan-pw');

function tryDir(dir) {
  if (!dir) return null;
  for (const name of ['playwright', '@playwright/test']) {
    try { return createRequire(path.join(path.resolve(dir), 'package.json'))(name); } catch { /* next */ }
  }
  return null;
}

export function findPlaywright({ app } = {}) {
  for (const dir of [app, process.cwd(), process.env.ITQAN_PLAYWRIGHT_DIR, THROWAWAY_DIR]) {
    const pw = tryDir(dir);
    if (pw && pw.chromium) return { pw, dir: path.resolve(dir) };
  }
  return null;
}

const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32' });

export function loadPlaywright({ app, install = false } = {}) {
  let found = findPlaywright({ app });
  if (!found && install) {
    console.error(`Playwright not found; installing a throwaway copy into ${THROWAWAY_DIR} (one-time).`);
    fs.mkdirSync(THROWAWAY_DIR, { recursive: true });
    const pkg = path.join(THROWAWAY_DIR, 'package.json');
    if (!fs.existsSync(pkg)) fs.writeFileSync(pkg, '{"name":"itqan-pw","private":true}');
    run('npm', ['install', 'playwright'], THROWAWAY_DIR);
    found = findPlaywright({ app });
  }
  return found;
}

/** Launch chromium; if the browser binary is missing and install is allowed, fetch it once. */
export async function launchChromium(found, { install = false } = {}) {
  try { return await found.pw.chromium.launch(); } catch (e) {
    if (!install || !/Executable doesn't exist|playwright install/i.test(String(e))) throw e;
    console.error('Chromium missing; running npx playwright install chromium.');
    run('npx', ['playwright', 'install', 'chromium'], found.dir);
    return found.pw.chromium.launch();
  }
}

export function requirePlaywright(opts) {
  const found = loadPlaywright({ install: true, ...opts });
  if (!found) {
    console.error('Playwright could not be loaded. Install it in the app (npm i -D playwright), or run npm install --prefix <dir> playwright and npx playwright install chromium, then set ITQAN_PLAYWRIGHT_DIR=<dir>.');
    process.exit(2);
  }
  return found;
}

export const toUrl = (s) => (/^[a-z][a-z0-9+.-]+:\/\//i.test(s) ? s : pathToFileURL(path.resolve(s)).href);

/** Parse --key value pairs; names listed in `booleans` are flags without a value. */
export function flags(argv, booleans = []) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2);
    out[k] = booleans.includes(k) ? true : argv[++i];
  }
  return out;
}
