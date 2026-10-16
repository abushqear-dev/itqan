// Small markdown helpers shared by the document checks.

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Text under a "## heading" (the heading may carry trailing words), up to the next "## ".
export function section(text, heading) {
  const m = (text || '').match(new RegExp(`^##\\s+${escapeRe(heading)}[^\\n]*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'mi'));
  return m ? m[1] : '';
}

// Data rows of the markdown table in a block of text, as arrays of trimmed cells.
export function rows(block) {
  return block.split(/\r?\n/)
    .filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
}
