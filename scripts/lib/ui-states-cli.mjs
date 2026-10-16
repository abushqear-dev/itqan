// `ui-scan.mjs --states`: loads .itqan/states.json and docs/02-ux/copy.md, runs the states harness per screen.
import fs from 'node:fs';
import { requirePlaywright, launchChromium } from './pw.mjs';
import { parseCopy, runScreen } from './ui-states.mjs';

// Git Bash on Windows rewrites arguments like "/shifts" into "C:/Program Files/Git/shifts"; undo that.
const repair = (r) => r.replace(/^(#?)[A-Za-z]:[\\/](?:.*[\\/])?Git[\\/]/i, '$1/');

export async function runStatesCli(args) {
  const configPath = args.config || '.itqan/states.json';
  let config = {};
  if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  else if (!args.routes) { console.error(`No ${configPath} and no --routes: nothing to check.`); process.exit(2); }
  if (args.routes) {
    args.routes.split(',').map((r) => repair(r.trim())).filter(Boolean).forEach((route) => { config[route] = config[route] || { route }; });
  }
  const copyPath = args.copy || 'docs/02-ux/copy.md';
  const copy = fs.existsSync(copyPath) ? parseCopy(fs.readFileSync(copyPath, 'utf8')) : {};
  const only = args.only ? args.only.split(',') : null;
  const ids = Object.keys(config).filter((id) => !only || only.includes(id));

  const out = args.json ? console.error : console.log;
  const found = requirePlaywright({ app: args.app });
  const browser = await launchChromium(found, { install: true });
  const summary = { url: args.url, screens: {}, pass: 0, fail: 0, skip: 0 };
  try {
    for (const id of ids) {
      const entry = { ...config[id], route: repair(config[id].route || '/') };
      const results = await runScreen(browser, { id, entry, baseUrl: args.url, copy, storage: args.storage });
      summary.screens[id] = results.map(({ check, status, detail }) => ({ check, status, detail }));
      out(`\n${id} ${entry.route}`);
      for (const r of results) {
        summary[r.status]++;
        out(`  ${r.status.toUpperCase().padEnd(4)} ${id} ${r.check}${r.detail ? '  ' + r.detail : ''}`);
      }
    }
  } finally { await browser.close(); }
  out(`\nStates: ${summary.pass} pass, ${summary.fail} fail, ${summary.skip} skipped`);
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.fail ? 1 : 0);
}
