// Usage meter for one product, read from the Claude Code session transcripts of its folder (each product has its own).
// Two facts matter, and the transcripts give both:
//   - the context size of the live session: every API call re-reads it, and in the pilots those cache reads were
//     about 85% of the cost, so a long single session grows steadily more expensive per call;
//   - the cost Claude Code recorded (`cost-state`, subagents included). Headless runs record it after every round;
//     an interactive session records it only when it ends or resumes, so during a live session it lags.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const configDir = () => process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

// Claude Code names a project's transcript folder after its path, every non-alphanumeric character becoming "-".
export const projectKey = (root) => path.resolve(root).replace(/[^A-Za-z0-9]/g, '-');

function transcripts(root) {
  const dir = path.join(configDir(), 'projects', projectKey(root));
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(dir, f))
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((t) => t.file);
}

function parseLines(file, marker) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes(marker)) continue;
    try { out.push(JSON.parse(line)); } catch { /* a torn line at the end of a live transcript */ }
  }
  return out;
}

// { usd, sessions } of the recorded cost; usd is null when no transcript has a cost record (unknown, never zero).
export function recordedSpend(root) {
  let usd = 0;
  let sessions = 0;
  for (const file of transcripts(root)) {
    const states = parseLines(file, '"cost-state"').filter((r) => r.type === 'cost-state');
    if (!states.length) continue;
    usd += states[states.length - 1].totalCostUSD || 0;
    sessions++;
  }
  return sessions ? { usd, sessions } : { usd: null, sessions: 0 };
}

// Tokens the next call of the newest session will re-read, from the last assistant message's usage; null if unknown.
export function currentContext(root) {
  const newest = transcripts(root)[0];
  if (!newest) return null;
  const calls = parseLines(newest, '"usage"').filter((r) => r.type === 'assistant' && r.message?.usage);
  if (!calls.length) return null;
  const u = calls[calls.length - 1].message.usage;
  return (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
}
