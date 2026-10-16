// Pure-function tests (no browser): node tests/fidelity.test.mjs
import assert from 'node:assert/strict';
import { ciede2000, compareBlocks, dice, rgbToLab } from '../scripts/fidelity.mjs';
import { auditValues, loadTokenSet, shadowKey } from '../scripts/token-audit.mjs';
import { contrastRatio, parseColor } from '../scripts/lib/color.mjs';
import { parseCopy, copyFragments } from '../scripts/lib/ui-states.mjs';

let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); } };
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} got ${a}, expected ${b}`);

// Reference pairs from Sharma, Wu, Dalal (2005), supplementary test data.
const SHARMA = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
  [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
  [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
  [[50, 2.5, 0], [73, 25, -18], 27.1492],
  [[50, 2.5, 0], [61, -5, 29], 22.8977],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
  [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
];
for (const [i, [a, b, want]] of SHARMA.entries()) {
  t(`CIEDE2000 Sharma pair ${i + 1}`, () => { near(ciede2000(a, b), want, 0.0001); near(ciede2000(b, a), want, 0.0001, 'symmetry'); });
}
t('Lab of white and black', () => { near(rgbToLab({ r: 255, g: 255, b: 255 })[0], 100, 0.01); near(rgbToLab({ r: 0, g: 0, b: 0 })[0], 0, 0.01); });
t('WCAG contrast black on white is 21', () => near(contrastRatio(parseColor('#000'), parseColor('#fff')), 21, 0.001));

const B = (text, x, y, w, h, color = '#1a1a1a') => ({ text, x, y, w, h, color, bg: '#ffffff' });
const page = [B('Shifts', 16, 16, 80, 30), B('Sign up', 16, 70, 70, 24, '#ffffff'), B('Morning shift 4 spots free', 16, 120, 220, 24)];

t('dice', () => { assert.equal(dice('a b c', 'a b c'), 1); assert.equal(dice('a b', 'c d'), 0); near(dice('sign up now', 'sign up'), 0.8, 1e-9); });
t('compareBlocks: identical pages score 1', () => {
  const r = compareBlocks(page, page.map((b) => ({ ...b })), { width: 1440, height: 900 });
  for (const v of [r.blockMatch, r.text, r.position, r.color.score, r.fidelity]) near(v, 1, 1e-9);
  assert.equal(r.unmatchedMockup.length + r.unmatchedBuilt.length, 0);
});
t('compareBlocks: shifted, recoloured, extra and missing blocks', () => {
  const built = [B('Shifts', 16, 16, 80, 30), B('Sign up', 16, 170, 70, 24, '#ff0000'), B('Surprise banner here', 300, 300, 200, 40)];
  const r = compareBlocks(page, built, { width: 1440, height: 900 });
  assert.equal(r.counts.matched, 2);
  assert.deepEqual(r.unmatchedMockup.map((b) => b.text), ['Morning shift 4 spots free']);
  assert.deepEqual(r.unmatchedBuilt.map((b) => b.text), ['Surprise banner here']);
  assert.ok(r.blockMatch < 0.7);
  assert.ok(r.position < 1 && r.position > 0.9);
  assert.ok(r.color.deltaE > 5 && r.color.score < 1);
  near(r.fidelity, (r.blockMatch + r.text + r.position + r.color.score) / 4, 1e-12);
});
t('compareBlocks: greedy match prefers the nearest of equal labels; low text overlap does not match', () => {
  const m = [B('Edit', 0, 0, 40, 20), B('Edit', 0, 500, 40, 20)];
  const b = [B('Edit', 0, 505, 40, 20), B('Edit', 0, 3, 40, 20)];
  const r = compareBlocks(m, b, { width: 1000, height: 1000 });
  assert.equal(r.counts.matched, 2);
  near(r.position, 1 - (0.003 + 0.005) / 2, 1e-9);
  assert.equal(compareBlocks([B('alpha beta', 0, 0, 10, 10)], [B('gamma delta', 0, 0, 10, 10)]).counts.matched, 0);
});

// ---- token audit ----
const tree = {
  color: { $type: 'color', primary: { $value: '#0B5FFF' }, link: { $value: '{color.primary}' }, ink: { $value: '#1a1a1a' } },
  font: { family: { $type: 'fontFamily', body: { $value: ['Inter', 'sans-serif'] } }, size: { $type: 'dimension', body: { $value: { value: 1, unit: 'rem' } } } },
  space: { $type: 'dimension', sm: { $value: { value: 8, unit: 'px' } } },
  radius: { $type: 'dimension', md: { $value: '8px' } },
  shadow: { $type: 'shadow', card: { $value: { color: '#00000026', offsetX: '0px', offsetY: '4px', blur: '8px', spread: '0px' } } },
  motion: { $type: 'duration', fast: { $value: { value: 0.2, unit: 's' } } },
};
const set = loadTokenSet(tree);
t('loadTokenSet resolves aliases, units and categories', () => {
  assert.deepEqual([...set.color].sort(), ['#0b5fff', '#1a1a1a']);
  assert.deepEqual([...set.fontSize], [16]);
  assert.deepEqual([...set.spacing], [8]);
  assert.deepEqual([...set.radius], [8]);
  assert.deepEqual([...set.fontFamily], ['inter']);
  assert.deepEqual([...set.duration], [200]);
  assert.equal(set.shadow.size, 1);
});
t('shadowKey matches a computed box-shadow', () => assert.ok(set.shadow.has(shadowKey('rgba(0, 0, 0, 0.15) 0px 4px 8px 0px'))));
t('auditValues allows token values and the always-allowed ones', () => {
  const o = (category, prop, value) => ({ category, prop, value, selector: 'x' });
  const r = auditValues(set, [
    o('color', 'color', 'rgb(11, 95, 255)'), o('color', 'background-color', 'rgba(0, 0, 0, 0)'), o('color', 'color', 'currentColor'),
    o('fontSize', 'font-size', '16.4px'), o('spacing', 'margin-left', 'auto'), o('spacing', 'padding-top', '0px'), o('spacing', 'padding-top', '8px'),
    o('fontFamily', 'font-family', 'Inter, "Segoe UI", sans-serif'), o('duration', 'transition-duration', '0.2s'), o('radius', 'border-radius', '8px'),
  ]);
  assert.deepEqual(r.violations, []);
});
t('auditValues reports off-token values with count and selector', () => {
  const o = (category, prop, value, selector) => ({ category, prop, value, selector });
  const r = auditValues(set, [
    o('color', 'color', 'rgb(18, 52, 86)', 'p.note'), o('color', 'color', '#123456', 'p.note'), o('color', 'color', '#123456', 'h2'),
    o('spacing', 'padding-left', '13px', 'li'), o('fontSize', 'font-size', '17px', 'p'), o('duration', 'transition-duration', '300ms', 'button'),
  ]);
  assert.equal(r.violations.length, 4);
  const c = r.violations.find((v) => v.value === '#123456');
  assert.equal(c.count, 3);
  assert.deepEqual(c.selectors, ['p.note', 'h2']);
  assert.deepEqual(r.fontSizes, [17]);
});
t('auditValues reports distinct font sizes', () => {
  const obs = [12, 14, 16, 18, 20, 24, 32].map((n) => ({ category: 'fontSize', prop: 'font-size', value: `${n}px`, selector: 'p' }));
  assert.equal(auditValues(set, obs).fontSizes.length, 7);
});

// ---- copy deck ----
t('parseCopy and copyFragments', () => {
  const c = parseCopy('- `MSG.A`: <You are signed up for {shift}.>\n- `MSG.B`: Plain text\n');
  assert.equal(c['MSG.A'], 'You are signed up for {shift}.');
  assert.equal(c['MSG.B'], 'Plain text');
  assert.deepEqual(copyFragments(c['MSG.A']), ['You are signed up for']);
  assert.deepEqual(copyFragments('{count, plural, one {# spot free} other {# spots free}}'), []);
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
