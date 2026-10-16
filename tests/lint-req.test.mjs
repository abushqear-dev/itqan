// Run: node tests/lint-req.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lintSpec } from '../scripts/lint-req.mjs';

const fx = (n) => readFileSync(fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url)), 'utf8');
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

// Wrap one criterion sentence in a minimal spec and return the lint result.
const lint = (sentence, glossary = '') => lintSpec(
  `## Glossary\n| Term | Meaning |\n|---|---|\n${glossary}\n## Features\n### FEAT-01 F\n#### US-01 S\n` +
  `As a volunteer, I want x so that y.\nIndependent test: z.\n##### AC-01.1 A\n${sentence}\nExample: a -> b\n`);
const rulesOf = (s) => lint(s).smells.map((x) => x.rule);
const flagged = (rule, s) => ok(rulesOf(s).includes(rule), `${rule} should flag: ${s}`);
const clean = (rule, s) => ok(!rulesOf(s).includes(rule), `${rule} should not flag: ${s}`);

// smell rules: one flagged and one clean sentence each
flagged('subjective-language', 'THE SYSTEM SHALL respond quickly.');
clean('subjective-language', 'THE SYSTEM SHALL respond within 2 seconds.');
flagged('ambiguous-adverb-adjective', 'THE SYSTEM SHALL keep a reasonable history.');
clean('ambiguous-adverb-adjective', 'THE SYSTEM SHALL keep the last 30 days of history.');
flagged('loophole', 'WHEN a user saves, THE SYSTEM SHALL notify the lead as appropriate.');
flagged('loophole', 'THE SYSTEM SHALL accept at least the common formats.');
clean('loophole', 'THE SYSTEM SHALL accept at least 3 formats.');
flagged('open-ended', 'THE SYSTEM SHALL show name, time, etc.');
flagged('open-ended', 'THE SYSTEM SHALL accept formats such as PDF.');
clean('open-ended', 'THE SYSTEM SHALL accept PDF and PNG.');
flagged('superlative', 'THE SYSTEM SHALL show the best result first.');
flagged('superlative', 'THE SYSTEM SHALL allow the maximum length.');
clean('superlative', 'THE SYSTEM SHALL allow a maximum of 40 characters.');
clean('superlative', 'THE SYSTEM SHALL show the most recent shift first.');
flagged('comparative-without-baseline', 'THE SYSTEM SHALL load faster.');
clean('comparative-without-baseline', 'THE SYSTEM SHALL load faster than 2 seconds.');
clean('comparative-without-baseline', 'IF a user picks 3 or more shifts, THEN THE SYSTEM SHALL warn.');
flagged('negative-statement', 'THE SYSTEM SHALL not show the email.');
clean('negative-statement', 'IF the email is not valid, THEN THE SYSTEM SHALL reject it.');
clean('negative-statement', 'WHEN a user is not signed in, THE SYSTEM SHALL show the login page.');
flagged('vague-pronoun', 'WHEN a user saves, it SHALL close the form.');
clean('vague-pronoun', 'WHEN a user saves, THE SYSTEM SHALL close the form.');
flagged('incomplete-reference', 'THE SYSTEM SHALL behave the same as AC-01.2.');
flagged('incomplete-reference', 'THE SYSTEM SHALL cap names at TBD characters.');
clean('incomplete-reference', 'THE SYSTEM SHALL cap names at 40 characters.');

// Examples and code blocks are not scanned
ok(lint('THE SYSTEM SHALL close the form.\nExample: respond quickly, etc. -> fine').smells.length === 0, 'Example line is ignored');
ok(lintSpec('#### US-01 S\nAs a v, I want x so that y.\n##### AC-01.1 A\n```\nquickly etc.\n```\nTHE SYSTEM SHALL close it.\n').smells.length === 0, 'code block ignored');
ok(lint('THE SYSTEM SHALL respond quickly.').smells[0].word === 'quickly', 'word reported');
ok(lint('THE SYSTEM SHALL respond quickly.').smells[0].id === 'AC-01.1', 'id reported');
ok(lint('THE SYSTEM SHALL respond quickly.').smells[0].line > 0, 'line reported');

// stories and NFRs are scanned
const nfr = lintSpec('### NFR-01 N\nTHE SYSTEM SHALL be robust.\nMeasure: 99%.\n');
ok(nfr.smells.some((s) => s.id === 'NFR-01' && s.rule === 'subjective-language'), 'NFR scanned');
const story = lintSpec('#### US-01 S\nAs a v, I want an easy form so that y.\n');
ok(story.smells.some((s) => s.id === 'US-01'), 'story scanned');

// singularity
ok(lint('THE SYSTEM SHALL close the form.').nonSingular.length === 0, 'single behaviour is singular');
ok(lint('THE SYSTEM SHALL save the name and email.').nonSingular.length === 0, 'noun pair is singular');
ok(lint('THE SYSTEM SHALL save the form and notify the lead.').nonSingular[0] === 'AC-01.1', 'and + verb is non-singular');
ok(lint('THE SYSTEM SHALL show the form. THE SYSTEM SHALL log it.').nonSingular.length === 1, 'two SHALL is non-singular');
ok(lint('THE SYSTEM SHALL save the form and notify the lead.').singularPct === 0, 'singularPct 0');
ok(lint('THE SYSTEM SHALL close the form.').singularPct === 100, 'singularPct 100');

// glossary drift
const gl = '| Volunteer | A person. |\n| Shift lead | A volunteer who leads. |\n';
ok(lint('WHEN a member saves, THE SYSTEM SHALL close the form.', gl).glossaryDrift.some((d) => d.term === 'volunteer' && d.synonym === 'member'), 'synonym drift');
ok(lint('WHEN a volunteer saves, THE SYSTEM SHALL close the form.', gl).glossaryDrift.length === 0, 'glossary term is not drift');
ok(lint('WHEN a member saves, THE SYSTEM SHALL close the form.').glossaryDrift.length === 0, 'no glossary, no drift');
ok(lint('WHEN a volunteer saves, THE SYSTEM SHALL ask the Team Captain.', gl).glossaryDrift.some((d) => d.undefined === 'Team Captain'), 'undefined term');
ok(lint('WHEN a volunteer saves, THE SYSTEM SHALL ask the shift lead.', gl).glossaryDrift.length === 0, 'multiword glossary term ok');

// story checks
const sc = lintSpec(fx('spec-seeded.md')).storyChecks;
ok(sc[0].wellFormed && sc[0].hasIndependentTest && sc[0].acCount === 6 && sc[0].small, 'US-01 checks');
ok(sc[1].wellFormed && !sc[1].hasIndependentTest && sc[1].acCount === 6, 'US-02 lacks Independent test');
ok(lintSpec('#### US-01 S\nI want a thing.\n').storyChecks[0].wellFormed === false, 'malformed story');
const big = '#### US-01 S\nAs a v, I want x so that y.\nIndependent test: z.\n' +
  [1, 2, 3, 4, 5, 6, 7].map((i) => `##### AC-01.${i} A\nTHE SYSTEM SHALL close it.\n`).join('');
ok(lintSpec(big).storyChecks[0].small === false && lintSpec(big).storiesOkPct === 0, 'seven criteria is not small');

// clean sample
const c = lintSpec(fx('spec-clean.md'));
ok(c.criteria === 6 && c.stories === 2, 'clean counts');
ok(c.smells.length === 0, `clean spec has no smells: ${JSON.stringify(c.smells)}`);
ok(c.nonSingular.length === 0 && c.glossaryDrift.length === 0 && c.storiesOkPct === 100, 'clean spec passes all checks');

// seeded defects: expected [id, rule]
const s = lintSpec(fx('spec-seeded.md'));
const expected = [
  ['AC-01.1', 'subjective-language'], ['AC-01.2', 'ambiguous-adverb-adjective'], ['AC-01.3', 'loophole'],
  ['AC-01.4', 'open-ended'], ['AC-01.5', 'superlative'], ['AC-01.6', 'comparative-without-baseline'],
  ['AC-02.1', 'negative-statement'], ['AC-02.2', 'vague-pronoun'], ['AC-02.3', 'incomplete-reference'],
];
let found = 0;
for (const [id, rule] of expected) if (s.smells.some((x) => x.id === id && x.rule === rule)) found++; else console.log('MISSED', id, rule);
if (s.nonSingular.includes('AC-02.4')) found++; else console.log('MISSED compound AC-02.4');
if (s.nonSingular.includes('AC-02.5')) found++; else console.log('MISSED double SHALL AC-02.5');
if (s.glossaryDrift.some((d) => d.where === 'AC-02.6' && d.synonym === 'member')) found++; else console.log('MISSED drift');
if (!s.storyChecks[1].hasIndependentTest) found++; else console.log('MISSED story check');
const planted = expected.length + 4;
const extra = s.smells.filter((x) => !expected.some(([id]) => id === x.id));
console.log(`Seeded recall: ${found}/${planted}; unexpected smells: ${extra.length} ${JSON.stringify(extra)}`);
ok(found === planted, 'seeded recall is 100%');
ok(extra.length === 0, 'no smells on unplanted criteria');
ok(s.smellsPer100 > 0 && s.singularPct < 100 && s.storiesOkPct === 50, 'seeded summary numbers');

console.log(`${n} assertions passed`);
