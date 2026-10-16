// Metric collectors for `itq.mjs score <stage>`: turn a stage's documents into the values the scorecard needs.
// A collector returns { values, notes }; ids it cannot measure are left out so the engine reports them unmeasured.
import { parseDiscovery, tableStakes, freshness, twoSourceShare, formShare } from './discovery-check.mjs';
import { lintSpec } from './lint-req.mjs';

const none = (errors, re) => !errors.some((e) => re.test(e));
const ISO_25010 = ['Functional suitability', 'Performance efficiency', 'Compatibility', 'Interaction capability', 'Reliability', 'Security', 'Maintainability', 'Flexibility', 'Safety'];

// ctx: { text(rel) -> string|null, errors: [check errors for the stage], today: Date, urlResults?: {url: bool} }
export function collect(n, ctx) {
  const values = {};
  const notes = [];
  if (n === 'D') {
    const text = ctx.text('docs/00-discovery.md') || '';
    const d = parseDiscovery(text);
    values['D-G1'] = none(ctx.errors, /competitor\(s\)|COMP-\d+ has no/);
    values['D-G2'] = none(ctx.errors, /matrix cell|no source URL|access date/);
    values['D-G3'] = none(ctx.errors, /Positioning slot/);
    values['D-G4'] = none(ctx.errors, /table stakes|ruling from the user|Table stakes: rulings/);
    values['D-S2'] = freshness(text, ctx.today);
    values['D-S3'] = twoSourceShare(text);
    values['D-S4'] = formShare(text);
    const used = d.personas.filter((p) => d.jobs.some((j) => j.includes(p.match(/PER-\d+/)[0]))).length;
    values['D-S5'] = d.personas.length ? (100 * used) / d.personas.length : 0;
    if (ctx.urlResults) {
      const urls = [...new Set(d.urls)];
      values['D-S1'] = urls.length ? (100 * urls.filter((u) => ctx.urlResults[u]).length) / urls.length : 0;
    } else notes.push('D-S1 not measured: run with --online to check that cited URLs answer.');
  }

  if (n === '1') {
    const spec = ctx.text('docs/01-product-spec.md') || '';
    const lint = lintSpec(spec);
    values['P-G1'] = none(ctx.errors, /NEEDS CLARIFICATION/) && !/\b(TBD|TBC)\b/.test(spec);
    values['P-G2'] = none(ctx.errors, /EARS form|no "Example:"/);
    values['P-G4'] = none(ctx.errors, /no "Measure:"|no "Verify:"/);
    values['P-G6'] = none(ctx.errors, /scope-cut|Lifecycle|Edge cases/);
    values['P-G8'] = none(ctx.errors, /defined more than once/);
    if (lint.criteria > 0) {
      values['P-S1'] = lint.smellsPer100;
      values['P-S2'] = lint.singularPct;
      values['P-S3'] = lint.glossaryDrift.length;
      values['P-S6'] = lint.storiesOkPct;
    } else notes.push('Product Spec has no criteria yet; smell metrics not measured.');
    // Table stakes from Discovery: each one the user put in scope or "later" must be cited in the spec.
    const disc = ctx.text('docs/00-discovery.md');
    if (disc) {
      const d = parseDiscovery(disc);
      const stakes = tableStakes(d).filter((s) => s.marked);
      const ruling = (id) => ((d.rulings.find((l) => l.includes(id)) || '').match(/ruling:\s*(in scope|later|dropped)/i) || [])[1]?.toLowerCase();
      const handled = stakes.filter((s) => ruling(s.id) === 'dropped' || new RegExp(`\\b${s.id}\\b`).test(spec));
      values['P-G5'] = handled.length === stakes.length;
      values['P-S4'] = stakes.length ? (100 * handled.length) / stakes.length : 100;
      if (handled.length < stakes.length) notes.push(`Table stakes not cited in the spec: ${stakes.filter((s) => !handled.includes(s)).map((s) => s.id).join(', ')}. Cite each MKT-FEAT-n in the story or feature it becomes.`);
    } else notes.push('No Discovery document: table-stakes metrics (P-G5, P-S4) not measured.');
    notes.push(`Smells: ${lint.smells.slice(0, 5).map((s) => `${s.id} ${s.rule} "${s.word}"`).join('; ') || 'none'}${lint.smells.length > 5 ? ` (+${lint.smells.length - 5} more)` : ''}.`);
  }

  if (n === '0') {
    const c = ctx.text('docs/00-constitution.md') || '';
    values['K-G1'] = none(ctx.errors, /Performance target|number and unit/);
    values['K-G2'] = none(ctx.errors, /QAS-|Quality-attribute scenarios/);
    values['K-G3'] = none(ctx.errors, /WCAG level|ASVS level|Browsers/);
    const qas = c.match(/^##\s+Quality-attribute scenarios[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/mi);
    const out = c.match(/^##\s+Characteristics out of scope[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/mi);
    const handled = ISO_25010.filter((name) => new RegExp(name, 'i').test(qas ? qas[1] : '') || (out ? out[1] : '').split(/\r?\n/).some((l) => new RegExp(name, 'i').test(l) && /(because|reason|:)\s*\S{4,}/i.test(l.replace(new RegExp(name, 'i'), ''))));
    values['K-S2'] = (100 * handled.length) / ISO_25010.length;
    if (handled.length < ISO_25010.length) notes.push(`ISO 25010 characteristics neither scenario-ed nor ruled out with a reason: ${ISO_25010.filter((x) => !handled.includes(x)).join(', ')}.`);
  }

  if (n === '2') {
    values['X-G1'] = none(ctx.errors, /state\.|mockup|variant|reachable|No screens|defines no screens/i);
    values['X-G2'] = none(ctx.errors, /Contrast/);
  }

  if (n === '3') {
    values['T-G1'] = none(ctx.errors, /OpenAPI|api\.yaml|operationId/);
    values['T-G2'] = none(ctx.errors, /Screen data|x-acceptance/);
    values['T-G3'] = none(ctx.errors, /ASVS|asvs-l1/);
    values['T-G4'] = none(ctx.errors, /Threat model|TB-\d+|THR-\d+|trust boundar/);
    values['T-G5'] = none(ctx.errors, /QAS-|Quality scenarios/);
    values['T-G6'] = none(ctx.errors, /pins no versions/);
    values['T-G7'] = none(ctx.errors, /Constitution check/);
    const design = ctx.text('docs/03-tech/design.md') || '';
    values['T-S4'] = /C4Context/.test(design) && /C4Container/.test(design) ? 100 : /C4Context|C4Container/.test(design) ? 50 : 0;
    const test = (design.match(/^##\s+Testing strategy[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/mi) || [, ''])[1];
    const needed = [/coverage[^\n]*\d/i, /mutation[^\n]*\d/i, /complexity[^\n]*\d/i, /duplicat[^\n]*\d/i, /axe|accessib/i, /Lighthouse|LCP|web vitals/i, /(401|403|role)/i];
    values['T-S3'] = (100 * needed.filter((re) => re.test(test)).length) / needed.length;
  }

  if (n === '4') {
    values['L-G1'] = none(ctx.errors, /not covered by any task|no "Covers:"/);
    values['L-G2'] = none(ctx.errors, /Verify/);
    values['L-G3'] = none(ctx.errors, /T-001|walking skeleton/);
  }
  return { values, notes };
}
