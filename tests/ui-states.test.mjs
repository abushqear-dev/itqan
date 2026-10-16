// Browser test: node tests/ui-states.test.mjs
// Runs fidelity, token-audit and ui-scan --states against tests/fixtures/ui-app. Skipped when Playwright cannot be loaded.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPlaywright } from '../scripts/lib/pw.mjs';
import { start } from './fixtures/ui-app/server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = path.join(root, 'tests/fixtures/ui-app');
const script = (n) => path.join(root, 'scripts', n);

const found = findPlaywright({ app: fixture });
if (!found) {
  console.log('SKIP ui-states.test.mjs: Playwright could not be loaded. Install it (npm install --prefix <dir> playwright && npx playwright install chromium) and set ITQAN_PLAYWRIGHT_DIR=<dir>.');
  process.exit(0);
}
const env = { ...process.env, ITQAN_PLAYWRIGHT_DIR: found.dir };
// Async spawn: the fixture server lives in this process, so the event loop must stay free.
const run = (file, args, cwd = root) => new Promise((resolve) => {
  const p = spawn(process.execPath, [script(file), ...args], { cwd, env });
  let stdout = '', stderr = '';
  p.stdout.on('data', (d) => { stdout += d; });
  p.stderr.on('data', (d) => { stderr += d; });
  p.on('close', (status) => resolve({ status, stdout, stderr }));
});

let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); } };

const { server, url } = await start(0);
try {
  const tokens = path.join(fixture, 'tokens.json');
  const good = await run('token-audit.mjs', ['--tokens', tokens, '--url', url + '/', '--json']);
  t('token-audit passes the on-token page', () => { assert.equal(good.status, 0, good.stderr); assert.equal(JSON.parse(good.stdout).violations.length, 0); });
  const bad = await run('token-audit.mjs', ['--tokens', tokens, '--url', url + '/bad', '--json']);
  t('token-audit fails the off-token page', () => { assert.equal(bad.status, 1); assert.ok(JSON.parse(bad.stdout).violations.some((v) => v.prop === 'font-size' && v.value === '13')); });

  const fid = await run('fidelity.mjs', ['--mockup', path.join(fixture, 'mockup.html'), '--url', url + '/', '--json']);
  t('fidelity: built page resembles the mockup and lists extras', () => {
    assert.equal(fid.status, 0, fid.stderr);
    const r = JSON.parse(fid.stdout);
    assert.equal(r.text, 1); assert.ok(r.color.deltaE < 0.5); assert.ok(r.fidelity > 0.8 && r.fidelity < 1);
    assert.ok(r.unmatchedBuilt.some((b) => b.text === 'Home'));
  });
  const same = JSON.parse((await run('fidelity.mjs', ['--mockup', path.join(fixture, 'mockup.html'), '--url', url + '/mockup', '--json'])).stdout);
  t('fidelity: the same page scores 1', () => assert.ok(same.fidelity > 0.999));

  const states = await run('ui-scan.mjs', ['--states', '--app', fixture, '--url', url, '--json'], fixture);
  const sum = JSON.parse(states.stdout);
  const status = (screen, check) => sum.screens[screen].find((c) => c.check === check)?.status;
  t('states: good screen passes every check', () => {
    const fails = sum.screens['SCR-01'].filter((c) => c.status === 'fail');
    assert.deepEqual(fails, []);
    for (const c of ['data:loading', 'data:error', 'data:empty', 'state:button:hover', 'width:375:overflow', 'reduced-motion', 'focus-indicator', 'target-size']) assert.equal(status('SCR-01', c), 'pass', c);
  });
  t('states: bad screen fails overflow, motion, focus and target size', () => {
    for (const c of ['width:375:overflow', 'reduced-motion', 'focus-indicator', 'target-size']) assert.equal(status('SCR-02', c), 'fail', c);
    assert.equal(states.status, 1);
  });
} finally { server.close(); }

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
