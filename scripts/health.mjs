#!/usr/bin/env node
// Itqan code-health gate: runs pinned CLI tools against a JS/TS app and reports gates and B-S1..B-S4 scores.
// Usage: node scripts/health.mjs --app <dir> [--changed <list|git:REF>] [--mode task|full] [--json] [--skip-mutation]
// No dependencies of its own. Tools install into <app>/../.itqan/health-tools/ and never touch the app's package.json.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HEALTH_TOOLS = {
  vitestCoverage: '@vitest/coverage-v8@5.0.5',
  stryker: '@stryker-mutator/core@10.0.0',
  strykerVitest: '@stryker-mutator/vitest-runner@10.0.0',
  eslint: 'eslint@10.12.0',
  sonarjs: 'eslint-plugin-sonarjs@4.2.2',
  tseslint: 'typescript-eslint@8.71.2',
  jscpd: 'jscpd@5.4.1',
  semgrep: 'semgrep==1.181.0', // pip; rule packs below
  semgrepRules: ['p/owasp-top-ten', 'p/javascript', 'p/typescript'],
  securityLint: 'eslint-plugin-security@4.2.0', // reduced fallback when Semgrep cannot run (Apache-2.0)
  osvScanner: 'v2.7.0', // binary on PATH, optional
};
export const THRESHOLDS = { coverage: 80, mutationBreak: 60, cyclomatic: 10, cognitive: 15, duplication: 3 };
// Scored range [target, floor] per phase-cd-scorecards.md Stage 6.
const SCORES = { 'B-S1': [90, 60], 'B-S2': [80, 40], 'B-S3': [0, 10], 'B-S4': [0, 6] };
const SRC_RE = /\.(?:[cm]?[jt]sx?)$/;
const TEST_RE = /(?:\.(?:test|spec)\.[cm]?[jt]sx?$)|(?:[\\/](?:tests?|__tests__)[\\/])/;
const IGNORE = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/.stryker-tmp/**', '**/*.test.*', '**/*.spec.*', '**/tests/**', '**/test/**', '**/__tests__/**'];

// ---------- pure helpers ----------
export function normalise(value, target, floor) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const t = Math.max(0, Math.min(1, (value - floor) / (target - floor)));
  return Math.round(100 * t * 100) / 100;
}
const slash = (p) => p.replace(/\\/g, '/').toLowerCase();
const pct = (a, b) => (b ? Math.round((a / b) * 10000) / 100 : null);

export function parseCoverageSummary(json, files) {
  if (!files?.length) return { pct: json?.total?.lines?.pct ?? null, matched: [], missing: [] };
  let covered = 0, total = 0;
  const matched = [], missing = [];
  const keys = Object.keys(json || {}).filter((k) => k !== 'total');
  for (const f of files) {
    const want = slash(f).replace(/^\.\//, '');
    const key = keys.find((k) => slash(k) === want || slash(k).endsWith(`/${want}`));
    if (!key) { missing.push(f); continue; }
    covered += json[key].lines.covered; total += json[key].lines.total; matched.push(f);
  }
  return { pct: pct(covered, total), covered, total, matched, missing };
}

// ESLint JSON from the reduced scan: every security/* message is a finding.
export function parseSecurityLint(json) {
  const findings = [];
  for (const f of json || []) {
    for (const m of f.messages || []) {
      if (typeof m.ruleId === 'string' && m.ruleId.startsWith('security/')) findings.push(`${f.filePath}:${m.line} ${m.ruleId}`);
    }
  }
  return { findings };
}

export function parseSemgrep(json) {
  const results = json?.results || [];
  const errors = results.filter((r) => ['ERROR', 'CRITICAL', 'HIGH'].includes(String(r.extra?.severity).toUpperCase()))
    .map((r) => ({ path: r.path, line: r.start?.line, rule: r.check_id, message: String(r.extra?.message || '').split('\n')[0] }));
  return { errors, total: results.length, scanErrors: (json?.errors || []).length };
}

export function parseNpmAudit(json) {
  if (json?.error) return { unavailable: true, reason: `${json.error.code || 'error'}: ${json.error.summary || json.error.detail || ''}`.trim() };
  const v = json?.metadata?.vulnerabilities;
  if (!v) return { unavailable: true, reason: 'npm audit returned no vulnerability metadata' };
  return { high: v.high || 0, critical: v.critical || 0, moderate: v.moderate || 0, total: v.total || 0 };
}

export function parseJscpd(json) {
  const t = json?.statistics?.total || {};
  const clones = (json?.duplicates || []).slice(0, 10).map((d) => `${d.firstFile?.name}:${d.firstFile?.start} <> ${d.secondFile?.name}:${d.secondFile?.start} (${d.lines} lines)`);
  return { pct: Math.round((t.percentage ?? 0) * 100) / 100, lines: t.lines ?? 0, duplicatedLines: t.duplicatedLines ?? 0, clones, cloneCount: t.clones ?? 0 };
}

// ESLint JSON run with `complexity`, `sonarjs/cognitive-complexity` and the counting rule `health/fn`.
export function parseEslintComplexity(json) {
  let total = 0;
  const over = new Map();
  for (const file of json || []) {
    for (const m of file.messages || []) {
      if (m.ruleId === 'health/fn') total++;
      else if (m.ruleId === 'complexity' || m.ruleId === 'sonarjs/cognitive-complexity') {
        const key = `${file.filePath}:${m.line}`;
        const entry = over.get(key) || { file: file.filePath, line: m.line, issues: [] };
        entry.issues.push(m.message.replace(/\s+/g, ' ')); over.set(key, entry);
      }
    }
  }
  const list = [...over.values()];
  return { total, over: list, pct: total ? Math.round((list.length / total) * 10000) / 100 : 0 };
}

export function parseStryker(json) {
  let killed = 0, survived = 0;
  for (const f of Object.values(json?.files || {})) for (const m of f.mutants || []) {
    if (m.status === 'Killed' || m.status === 'Timeout') killed++;
    else if (m.status === 'Survived' || m.status === 'NoCoverage') survived++;
  }
  return { score: pct(killed, killed + survived), killed, survived };
}

// ---------- process helpers ----------
const q = (s) => `"${s}"`;
function sh(cmd, { cwd, env, timeout = 900000 } = {}) {
  const r = spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', timeout, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, ...env } });
  const out = `${r.stdout || ''}${r.stderr || ''}${r.error ? r.error.message : ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  return { code: r.error ? -1 : r.status, stdout: r.stdout || '', out };
}
const tail = (s, n = 6) => s.trim().split(/\r?\n/).slice(-n).join(' | ').slice(0, 600);
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const log = (...a) => console.error('[health]', ...a);
const onPath = (name) => sh(process.platform === 'win32' ? `where ${name}` : `command -v ${name}`).code === 0;

function parseArgs(argv) {
  const a = { app: null, changed: null, mode: null, json: false, skipMutation: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--app') a.app = argv[++i];
    else if (argv[i] === '--changed') a.changed = argv[++i];
    else if (argv[i] === '--mode') a.mode = argv[++i];
    else if (argv[i] === '--json') a.json = true;
    else if (argv[i] === '--skip-mutation') a.skipMutation = true;
  }
  if (!a.app) throw new Error('usage: health.mjs --app <dir> [--changed <list|git:REF>] [--mode task|full] [--json] [--skip-mutation]');
  a.app = fs.existsSync(a.app) ? fs.realpathSync.native(path.resolve(a.app)) : path.resolve(a.app); // long path, so it compares with git's output
  a.mode = a.mode || (a.changed ? 'task' : 'full');
  return a;
}

// Returns app-relative forward-slash paths of changed source files (tests excluded).
function resolveChanged(spec, app) {
  let names = [];
  if (spec.startsWith('git:')) {
    const top = fs.realpathSync.native(sh('git rev-parse --show-toplevel', { cwd: app }).stdout.trim());
    const diff = sh(`git diff --name-only ${spec.slice(4)}`, { cwd: top }).stdout;
    const untracked = sh('git ls-files --others --exclude-standard', { cwd: top }).stdout;
    names = `${diff}\n${untracked}`.split(/\r?\n/).filter(Boolean).map((n) => path.resolve(top, n));
  } else names = spec.split(/[,\n;]+|\s+(?=\S)/).map((s) => s.trim()).filter(Boolean).map((n) => path.resolve(app, n));
  return [...new Set(names)].filter((f) => SRC_RE.test(f) && !TEST_RE.test(f) && fs.existsSync(f) && !path.relative(app, f).startsWith('..'))
    .map((f) => path.relative(app, f).replace(/\\/g, '/'));
}

// ---------- tool installation ----------
function ensureNodeTools(toolsDir, specs) {
  fs.mkdirSync(toolsDir, { recursive: true });
  const deps = {};
  for (const s of specs) { const i = s.lastIndexOf('@'); deps[s.slice(0, i)] = s.slice(i + 1); }
  const pkgFile = path.join(toolsDir, 'package.json');
  const have = readJson(pkgFile)?.dependencies || {};
  const stale = Object.entries(deps).some(([d, v]) => have[d] !== v || !fs.existsSync(path.join(toolsDir, 'node_modules', ...d.split('/'))));
  if (!stale) return null;
  const merged = { ...have, ...deps };
  fs.writeFileSync(pkgFile, JSON.stringify({ name: 'itqan-health-tools', private: true, dependencies: merged }));
  log('installing node tools:', Object.keys(deps).join(', '));
  const r = sh('npm install --no-audit --no-fund --loglevel=error', { cwd: toolsDir });
  return r.code === 0 ? null : tail(r.out);
}
const bin = (toolsDir, ...p) => path.join(toolsDir, 'node_modules', ...p);

function ensureSemgrep(toolsDir) {
  const venv = path.join(toolsDir, 'semgrep-venv');
  const exe = path.join(venv, process.platform === 'win32' ? 'Scripts/semgrep.exe' : 'bin/semgrep');
  if (fs.existsSync(exe)) return { exe };
  // `py -3` is the Windows launcher; python/python3 may be Microsoft Store stubs. Try newer-first fallbacks if the wheel does not exist for the newest Python.
  const launchers = process.platform === 'win32' ? ['py -3', 'py -3.14', 'py -3.13', 'py -3.12', 'py -3.11'] : ['python3'];
  const reasons = [];
  for (const py of launchers) {
    if (sh(`${py} --version`).code !== 0) continue;
    fs.rmSync(venv, { recursive: true, force: true });
    log(`installing semgrep with "${py}" (slow, one-off)`);
    const mk = sh(`${py} -m venv ${q(venv)}`, { env: { PYTHONUTF8: '1' } });
    if (mk.code !== 0) { reasons.push(`${py}: venv failed: ${tail(mk.out, 2)}`); continue; }
    const vpy = path.join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const pip = sh(`${q(vpy)} -m pip install --disable-pip-version-check -q ${q(HEALTH_TOOLS.semgrep)}`, { env: { PYTHONUTF8: '1' }, timeout: 1200000 });
    if (pip.code === 0 && fs.existsSync(exe)) return { exe };
    reasons.push(`${py}: pip install ${HEALTH_TOOLS.semgrep} failed: ${tail(pip.out, 2)}`);
  }
  return { reason: reasons.length ? reasons.join('; ') : 'no usable Python found (`py -3 --version` failed)' };
}

// ---------- checks ----------
const result = (id, status, value, threshold, detail) => ({ id, status, value, threshold, detail });
const usesVitest = (app) => { const p = readJson(path.join(app, 'package.json')) || {}; return Boolean({ ...p.dependencies, ...p.devDependencies }.vitest); };

function checkCoverage(ctx) {
  const { app, mode, changed } = ctx;
  const th = mode === 'task' ? THRESHOLDS.coverage : 85;
  if (mode === 'task' && !changed.length) return result('coverage', 'skipped', null, th, 'no changed source files');
  let summaryFile = path.join(app, 'coverage', 'coverage-summary.json');
  let note = '';
  if (usesVitest(app)) {
    const vitestVer = readJson(path.join(app, 'node_modules', 'vitest', 'package.json'))?.version;
    const covPkg = HEALTH_TOOLS.vitestCoverage;
    const covVer = covPkg.slice(covPkg.lastIndexOf('@') + 1);
    // coverage-v8 must match the app's vitest exactly and resolve from the app, so install it without saving.
    const want = vitestVer && vitestVer !== covVer ? `${covPkg.slice(0, covPkg.lastIndexOf('@'))}@${vitestVer}` : covPkg;
    if (!fs.existsSync(path.join(app, 'node_modules', '@vitest', 'coverage-v8', 'package.json')) || (vitestVer !== covVer && readJson(path.join(app, 'node_modules', '@vitest', 'coverage-v8', 'package.json'))?.version !== vitestVer)) {
      log('installing', want, 'into app/node_modules with --no-save');
      const r = sh(`npm install --no-save --no-package-lock --no-audit --no-fund --loglevel=error ${want}`, { cwd: app });
      if (r.code !== 0) return result('coverage', 'unavailable', null, th, `could not install ${want}: ${tail(r.out)}`);
    }
    if (vitestVer !== covVer) note = ` (pin ${covVer} differs from the app's vitest ${vitestVer}; matched to the app)`;
    summaryFile = path.join(ctx.toolsDir, 'coverage', 'coverage-summary.json');
    fs.rmSync(path.dirname(summaryFile), { recursive: true, force: true });
    const inc = mode === 'task' ? changed.map((f) => `--coverage.include=${q(f)}`).join(' ') : '';
    const cmd = `npx vitest run --coverage.enabled --coverage.provider=v8 --coverage.reporter=json-summary --coverage.reportsDirectory=${q(path.dirname(summaryFile))} ${inc}`;
    const r = sh(cmd, { cwd: app });
    if (!fs.existsSync(summaryFile)) return result('coverage', 'unavailable', null, th, `vitest produced no coverage summary (exit ${r.code}): ${tail(r.out)}`);
  } else if (!fs.existsSync(summaryFile)) {
    return result('coverage', 'unavailable', null, th, 'app does not use Vitest and has no coverage/coverage-summary.json; make the app test command in .itqan/commands.json write one');
  } else note = ' (existing coverage-summary.json, not re-run)';
  const parsed = parseCoverageSummary(readJson(summaryFile), mode === 'task' ? changed : null);
  if (parsed.pct === null) return result('coverage', 'unavailable', null, th, `no changed file found in the coverage summary${note}`);
  const miss = parsed.missing.length ? `; not in report: ${parsed.missing.join(', ')}` : '';
  return result('coverage', parsed.pct >= th ? 'pass' : 'fail', parsed.pct, th, `line coverage ${mode === 'task' ? 'on changed files' : 'overall'}${note}${miss}`);
}

function checkMutation(ctx) {
  const { app, mode, changed, toolsDir } = ctx;
  const th = THRESHOLDS.mutationBreak;
  if (ctx.args.skipMutation) return result('mutation', 'skipped', null, th, '--skip-mutation given');
  if (!usesVitest(app)) return result('mutation', 'skipped', null, th, 'only the Vitest runner is supported here (Stryker has jest/mocha/tap runners; add one if the app uses them)');
  if (mode === 'task' && !changed.length) return result('mutation', 'skipped', null, th, 'no changed source files');
  const reportFile = path.join(toolsDir, 'stryker', 'mutation.json');
  const cfg = {
    testRunner: 'vitest',
    mutate: mode === 'task' ? changed : ['src/**/*.{js,jsx,ts,tsx,mjs}', '!**/*.test.*', '!**/*.spec.*'],
    incremental: true, incrementalFile: path.join(toolsDir, 'stryker', 'incremental.json'), reporters: ['json'],
    jsonReporter: { fileName: reportFile }, tempDirName: path.join(toolsDir, 'stryker', 'tmp'), cleanTempDir: true,
    coverageAnalysis: 'perTest', thresholds: { high: 80, low: 60, break: null }, concurrency: 2, timeoutMS: 20000,
  };
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.rmSync(reportFile, { force: true });
  const cfgFile = path.join(toolsDir, 'stryker', 'stryker.config.json');
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2));
  const r = sh(`node ${q(bin(toolsDir, '@stryker-mutator', 'core', 'bin', 'stryker.js'))} run ${q(cfgFile)} --incremental`, { cwd: app });
  const report = readJson(reportFile);
  if (!report) return result('mutation', 'unavailable', null, th, `Stryker produced no report (exit ${r.code}): ${tail(r.out)}`);
  const m = parseStryker(report);
  if (m.score === null) return result('mutation', 'skipped', null, th, 'Stryker found no testable mutants in the changed files');
  return result('mutation', m.score >= th ? 'pass' : 'fail', m.score, th, `${m.killed} killed, ${m.survived} survived or uncovered (incremental)`);
}

function checkComplexity(ctx) {
  const { app, mode, changed, toolsDir } = ctx;
  const th = 0;
  if (mode === 'task' && !changed.length) return result('complexity', 'skipped', null, th, 'no changed source files');
  const exts = '{js,mjs,cjs,jsx}', tsx = '{ts,tsx,mts,cts}';
  const cfgFile = path.join(toolsDir, 'eslint.health.config.mjs');
  fs.writeFileSync(cfgFile, `import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';
const counter = { rules: { fn: { create(c) { const r = (node) => c.report({ node, message: 'fn' }); return { FunctionDeclaration: r, FunctionExpression: r, ArrowFunctionExpression: r }; } } } };
export default [
  { ignores: ${JSON.stringify(IGNORE)} },
  { files: ['**/*.${exts}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } },
  { files: ['**/*.${tsx}'], languageOptions: { parser: tseslint.parser } },
  { files: ['**/*.${exts}', '**/*.${tsx}'], plugins: { sonarjs, health: counter }, linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: { complexity: ['error', ${THRESHOLDS.cyclomatic}], 'sonarjs/cognitive-complexity': ['error', ${THRESHOLDS.cognitive}], 'health/fn': 'warn' } },
];
`);
  const targets = mode === 'task' ? changed.map(q).join(' ') : '.';
  const r = sh(`node ${q(bin(toolsDir, 'eslint', 'bin', 'eslint.js'))} -c ${q(cfgFile)} --no-config-lookup --no-warn-ignored -f json ${targets}`, { cwd: app });
  let json; try { json = JSON.parse(r.stdout); } catch { return result('complexity', 'unavailable', null, th, `ESLint produced no JSON (exit ${r.code}): ${tail(r.out)}`); }
  const c = parseEslintComplexity(json);
  const list = c.over.map((o) => `${path.relative(app, o.file).replace(/\\/g, '/')}:${o.line} ${o.issues.join('; ')}`);
  return { ...result('complexity', c.over.length === 0 ? 'pass' : 'fail', c.pct, th, `${c.over.length} of ${c.total} functions over cyclomatic ${THRESHOLDS.cyclomatic} or cognitive ${THRESHOLDS.cognitive}`), over: list };
}

function checkDuplication(ctx) {
  const { app, mode, changed, toolsDir } = ctx;
  const th = THRESHOLDS.duplication;
  if (mode === 'task' && !changed.length) return result('duplication', 'skipped', null, th, 'no changed source files');
  const out = path.join(toolsDir, 'jscpd');
  fs.rmSync(out, { recursive: true, force: true });
  const targets = mode === 'task' ? changed.map(q).join(' ') : (fs.existsSync(path.join(app, 'src')) ? 'src' : '.');
  const ignore = ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/*.test.*', '**/*.spec.*'].join(',');
  const r = sh(`node ${q(bin(toolsDir, 'jscpd', 'run-jscpd.js'))} ${targets} --min-lines 5 --min-tokens 50 --reporters json --output ${q(out)} --ignore ${q(ignore)} --silent`, { cwd: app });
  const json = readJson(path.join(out, 'jscpd-report.json'));
  if (!json) return result('duplication', 'unavailable', null, th, `jscpd produced no report (exit ${r.code}): ${tail(r.out)}`);
  const d = parseJscpd(json);
  return { ...result('duplication', d.pct <= th ? 'pass' : 'fail', d.pct, th, `${d.duplicatedLines} of ${d.lines} lines duplicated in ${d.cloneCount} clone(s)`), clones: d.clones };
}

// Native Semgrep on Windows is beta: its engine can fail to start (seen: "Unix_error: Invalid argument socketpair").
// So smoke-test it with a tiny local rule first, and fall back to the Docker image if the daemon is up.
function semgrepRunner(toolsDir, app) {
  const sg = ensureSemgrep(toolsDir);
  if (sg.exe) {
    const dir = path.join(toolsDir, 'semgrep-smoke');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'r.yml'), ['rules:','- id: t','  pattern: eval(...)','  message: t','  languages: [javascript]','  severity: ERROR',''].join('\n'));
    fs.writeFileSync(path.join(dir, 't.js'), 'eval(x)\n');
    const smoke = sh(`${q(sg.exe)} scan --config r.yml --metrics=off --quiet t.js`, { cwd: dir, env: { PYTHONUTF8: '1' }, timeout: 120000 });
    if (smoke.code === 0 || smoke.code === 1) return { native: sg.exe };
    sg.reason = `native Semgrep installed but its engine fails to run (exit ${smoke.code}): ${tail(smoke.out, 3) || 'no output'}; on this machine the cause was "Unix_error: Invalid argument socketpair" in semgrep-core`;
  }
  if (sh('docker info').code === 0) return { docker: true };
  return { reason: `${sg.reason}; Docker fallback not available (daemon not running or docker missing)` };
}

// Labelled fallback when Semgrep cannot run (native Windows, no Docker): the eslint-plugin-security rules at error
// level. It is a much smaller rule set than Semgrep's OWASP packs, so the result says "reduced" everywhere it appears
// and the Acceptance Report must state that the full scan did not run.
function checkSecurityReduced(ctx, semgrepReason) {
  const { app, mode, changed, toolsDir } = ctx;
  const th = 0;
  const err = ensureNodeTools(toolsDir, [HEALTH_TOOLS.securityLint, HEALTH_TOOLS.eslint]);
  const why = `Semgrep cannot run (${semgrepReason})`;
  if (err) return result('security', 'unavailable', null, th, `${why}; and the reduced scan could not be installed: ${err}`);
  const cfgFile = path.join(toolsDir, 'eslint.security.config.mjs');
  fs.writeFileSync(cfgFile, `import security from 'eslint-plugin-security';
const rules = Object.fromEntries(Object.keys(security.configs.recommended.rules).map((k) => [k, 'error']));
export default [
  { ignores: ${JSON.stringify(IGNORE)} },
  { files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module' }, plugins: { security }, rules },
];
`);
  const files = mode === 'task' ? changed.filter((f) => /\.[cm]?jsx?$/.test(f)) : ['.'];
  if (mode === 'task' && !files.length) {
    return result('security', 'unavailable', null, th, `${why}; the reduced scan reads JavaScript only and no changed file is JavaScript, so nothing was scanned`);
  }
  const r = sh(`node ${q(bin(toolsDir, 'eslint', 'bin', 'eslint.js'))} -c ${q(cfgFile)} --no-config-lookup --no-warn-ignored -f json ${files.map(q).join(' ')}`, { cwd: app });
  let json; try { json = JSON.parse(r.stdout); } catch { return result('security', 'unavailable', null, th, `${why}; reduced scan produced no JSON (exit ${r.code}): ${tail(r.out)}`); }
  const s = parseSecurityLint(json);
  return { ...result('security', s.findings.length === 0 ? 'pass' : 'fail', s.findings.length, th, `REDUCED scan (eslint-plugin-security, JavaScript only, small rule set): ${s.findings.length} finding(s). ${why}`), reduced: true, findings: s.findings };
}

function checkSecurity(ctx) {
  const { app, mode, changed, toolsDir } = ctx;
  if (mode === 'task' && !changed.length) return result('security', 'skipped', null, 0, 'no changed source files');
  const run = semgrepRunner(toolsDir, app);
  if (run.reason) return checkSecurityReduced(ctx, run.reason);
  const out = path.join(toolsDir, 'semgrep.json');
  fs.rmSync(out, { force: true });
  const rules = HEALTH_TOOLS.semgrepRules.map((c) => `--config ${c}`).join(' ');
  const targets = mode === 'task' ? changed : ['.'];
  const flags = `${rules} --json --metrics=off --quiet --exclude node_modules --exclude dist --exclude coverage`;
  let r;
  if (run.native) r = sh(`${q(run.native)} scan ${flags} --json-output=${q(out)} ${targets.map(q).join(' ')}`, { cwd: app, env: { PYTHONUTF8: '1' }, timeout: 600000 });
  else r = sh(`docker run --rm -v ${q(app + ':/src')} -v ${q(toolsDir + ':/out')} -w /src semgrep/semgrep:${HEALTH_TOOLS.semgrep.split('==')[1]} semgrep scan ${flags} --json-output=/out/semgrep.json ${targets.map(q).join(' ')}`, { env: { MSYS_NO_PATHCONV: '1' }, timeout: 900000 });
  const json = readJson(out);
  if (!json) return result('security', 'unavailable', null, 0, `Semgrep produced no output (exit ${r.code}; rule packs need network): ${tail(r.out)}`);
  const s = parseSemgrep(json);
  return { ...result('security', s.errors.length === 0 ? 'pass' : 'fail', s.errors.length, 0, `${s.errors.length} ERROR finding(s), ${s.total} total (${run.native ? 'native' : 'docker'})`), findings: s.errors.map((e) => `${e.path}:${e.line} ${e.rule}`) };
}

function checkDependencies(ctx) {
  const { app } = ctx;
  if (!fs.existsSync(path.join(app, 'package.json'))) return result('dependencies', 'unavailable', null, 0, 'no package.json');
  const r = sh('npm audit --audit-level=high --json', { cwd: app });
  let json; try { json = JSON.parse(r.stdout); } catch { return result('dependencies', 'unavailable', null, 0, `npm audit gave no JSON: ${tail(r.out)}`); }
  const a = parseNpmAudit(json);
  if (a.unavailable) return result('dependencies', 'unavailable', null, 0, `npm audit: ${a.reason}`);
  let count = a.high + a.critical, detail = `npm audit: ${a.high} high, ${a.critical} critical`;
  if (onPath('osv-scanner')) {
    const o = sh('osv-scanner scan source --format json -r .', { cwd: app });
    try {
      const groups = (JSON.parse(o.stdout).results || []).flatMap((x) => x.packages || []).flatMap((p) => p.groups || []);
      const osv = groups.filter((g) => Number(g.max_severity) >= 7).length;
      count += osv; detail += `; OSV-Scanner: ${osv} high/critical group(s)`;
    } catch { detail += `; OSV-Scanner output unreadable (exit ${o.code})`; }
  } else detail += '; OSV-Scanner not on PATH (skipped)';
  return result('dependencies', count === 0 ? 'pass' : 'fail', count, 0, detail);
}

function checkLintTypecheck(ctx) {
  const { app } = ctx;
  const p = readJson(path.join(app, 'package.json')) || {};
  const cmds = [];
  if (p.scripts?.lint) cmds.push(['lint', 'npm run lint --silent']);
  if (p.scripts?.typecheck) cmds.push(['typecheck', 'npm run typecheck --silent']);
  else if (fs.existsSync(path.join(app, 'tsconfig.json')) && fs.existsSync(path.join(app, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'))) cmds.push(['typecheck', 'npx tsc --noEmit']);
  if (!cmds.length) return result('lint', 'skipped', null, 0, 'no lint or typecheck script configured');
  const failed = [];
  for (const [name, cmd] of cmds) { const r = sh(cmd, { cwd: app }); if (r.code !== 0) failed.push(`${name} exited ${r.code}: ${tail(r.out, 3)}`); }
  return result('lint', failed.length ? 'fail' : 'pass', failed.length, 0, failed.length ? failed.join(' || ') : `${cmds.map((c) => c[0]).join(' and ')} clean`);
}

// ---------- main ----------
function timed(fn, ctx) {
  const t = Date.now();
  let r; try { r = fn(ctx); } catch (e) { r = result(fn.name.replace(/^check/, '').toLowerCase(), 'unavailable', null, null, `internal error: ${e.message}`); }
  r.ms = Date.now() - t; return r;
}

export function main(argv) {
  const args = parseArgs(argv);
  if (!fs.existsSync(args.app)) throw new Error(`app directory not found: ${args.app}`);
  const toolsDir = path.resolve(args.app, '..', '.itqan', 'health-tools');
  const changed = args.changed ? resolveChanged(args.changed, args.app) : [];
  const ctx = { app: args.app, mode: args.mode, changed, toolsDir, args };
  const installStart = Date.now();
  const needed = [HEALTH_TOOLS.eslint, HEALTH_TOOLS.sonarjs, HEALTH_TOOLS.tseslint, HEALTH_TOOLS.jscpd];
  if (!args.skipMutation && usesVitest(args.app)) needed.push(HEALTH_TOOLS.stryker, HEALTH_TOOLS.strykerVitest);
  const installError = ensureNodeTools(toolsDir, needed);
  const installMs = Date.now() - installStart;
  const checks = [];
  if (installError) {
    for (const id of ['mutation', 'complexity', 'duplication']) checks.push({ ...result(id, 'unavailable', null, null, `npm install of tools failed: ${installError}`), ms: 0 });
  } else checks.push(timed(checkMutation, ctx), timed(checkComplexity, ctx), timed(checkDuplication, ctx));
  checks.unshift(timed(checkCoverage, ctx));
  checks.push(timed(checkSecurity, ctx), timed(checkDependencies, ctx), timed(checkLintTypecheck, ctx));
  const by = Object.fromEntries(checks.map((c) => [c.id, c]));
  const gate = (c, strict) => ({ status: c.status === 'fail' || (strict && c.status === 'unavailable') ? 'fail' : c.status === 'skipped' ? 'skipped' : 'pass', reason: c.status === 'unavailable' ? `UNAVAILABLE: ${c.detail}` : c.detail });
  const gates = { security: gate(by.security, true), dependencies: gate(by.dependencies, true), lint: gate(by.lint, false) };
  const metricOf = (id, check) => ({ id, value: check.value, score: normalise(check.value, ...SCORES[id]) });
  const metrics = [metricOf('B-S1', by.coverage), metricOf('B-S2', by.mutation), metricOf('B-S3', by.complexity), metricOf('B-S4', by.duplication)];
  const unavailable = checks.filter((c) => c.status === 'unavailable').map((c) => `${c.id}: ${c.detail}`);
  const ok = Object.values(gates).every((g) => g.status !== 'fail');
  const securityMode = by.security.reduced ? 'reduced' : by.security.status === 'unavailable' ? 'none' : by.security.status === 'skipped' ? 'skipped' : 'semgrep';
  const summary = { app: args.app, mode: args.mode, changed, ok, securityMode, gates, metrics, unavailable, installMs, checks };
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    for (const c of checks) {
      console.log(`${c.status.toUpperCase().padEnd(11)} ${c.id.padEnd(12)} value=${c.value ?? '-'} threshold=${c.threshold ?? '-'} (${(c.ms / 1000).toFixed(1)}s) ${c.detail}`);
      for (const x of [...(c.over || []), ...(c.clones || []), ...(c.findings || [])].slice(0, 15)) console.log(`    ${x}`);
    }
    console.log(metrics.map((m) => `${m.id}=${m.score ?? 'n/a'}`).join('  '));
    for (const u of unavailable) console.log(`!! UNAVAILABLE ${u}`);
    if (securityMode === 'reduced') console.log('!! SECURITY SCAN WAS REDUCED: Semgrep did not run; only eslint-plugin-security on JavaScript files. The Acceptance Report must say so.');
    console.log(ok ? 'HEALTH: gates pass' : `HEALTH: FAIL (${Object.entries(gates).filter(([, g]) => g.status === 'fail').map(([k]) => k).join(', ')})`);
  }
  return ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(`health: ${e.message}`); process.exitCode = 2; }
}
