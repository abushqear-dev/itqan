import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalise, parseCoverageSummary, parseSemgrep, parseSecurityLint, parseNpmAudit, parseJscpd, parseEslintComplexity, parseStryker } from '../scripts/health.mjs';

const fx = (n) => JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'health', n), 'utf8'));

// normalise: higher-is-better and lower-is-better, clamped
assert.equal(normalise(90, 90, 60), 100);
assert.equal(normalise(75, 90, 60), 50);
assert.equal(normalise(50, 90, 60), 0);
assert.equal(normalise(100, 90, 60), 100);
assert.equal(normalise(0, 0, 10), 100);
assert.equal(normalise(5, 0, 10), 50);
assert.equal(normalise(12, 0, 10), 0);
assert.equal(normalise(null, 80, 40), null);

// coverage: overall, and per changed file (Windows keys vs relative forward-slash names)
assert.equal(parseCoverageSummary(fx('coverage-summary.json')).pct, 80);
const c = parseCoverageSummary(fx('coverage-summary.json'), ['src/a.js', 'src/gone.js']);
assert.equal(c.pct, 90);
assert.deepEqual(c.missing, ['src/gone.js']);
assert.equal(parseCoverageSummary(fx('coverage-summary.json'), ['src/a.js', 'src/b.js']).pct, 80);
assert.equal(parseCoverageSummary(fx('coverage-summary.json'), ['nope.js']).pct, null);

// semgrep: only ERROR counts
const s = parseSemgrep(fx('semgrep.json'));
assert.equal(s.errors.length, 1);
assert.equal(s.errors[0].message, 'Detected eval');
assert.equal(s.total, 2);
assert.equal(s.scanErrors, 1);
assert.equal(parseSemgrep({}).errors.length, 0);
// reduced security scan: only security/* messages count
assert.deepEqual(parseSecurityLint([{ filePath: 'a.js', messages: [{ ruleId: 'security/detect-eval-with-expression', line: 3 }, { ruleId: 'no-unused-vars', line: 4 }] }]).findings, ['a.js:3 security/detect-eval-with-expression']);
assert.equal(parseSecurityLint([]).findings.length, 0);
assert.equal(parseSecurityLint(null).findings.length, 0);

// npm audit
assert.deepEqual(parseNpmAudit(fx('npm-audit.json')), { high: 3, critical: 1, moderate: 2, total: 7 });
const na = parseNpmAudit(fx('npm-audit-nolock.json'));
assert.equal(na.unavailable, true);
assert.match(na.reason, /ENOLOCK/);
assert.equal(parseNpmAudit({}).unavailable, true);

// jscpd
const j = parseJscpd(fx('jscpd.json'));
assert.equal(j.pct, 8);
assert.equal(j.cloneCount, 1);
assert.equal(j.clones.length, 1);
assert.equal(parseJscpd({}).pct, 0);

// eslint complexity: one function trips both rules, counted once; 4 functions in total
const e = parseEslintComplexity(fx('eslint.json'));
assert.equal(e.total, 4);
assert.equal(e.over.length, 1);
assert.equal(e.over[0].issues.length, 2);
assert.equal(e.pct, 25);
assert.equal(parseEslintComplexity([]).pct, 0);

// stryker: Killed+Timeout detected, Survived+NoCoverage not, CompileError ignored
const m = parseStryker(fx('stryker.json'));
assert.equal(m.killed, 3);
assert.equal(m.survived, 2);
assert.equal(m.score, 60);

console.log('health.test.mjs: all assertions passed');
