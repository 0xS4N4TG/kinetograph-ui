#!/usr/bin/env node
// Rebuilds presets/index.ts from the JSON files in presets/<effect>/, the list an effect's `preset` prop reads (by
// file name; the index keys them `<effect>/<name>`).
// A preset is a partial look: write the JSON by hand or save the `look` you tuned in the studio.
//
//   node plugins/paper/tools/presets.mjs

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const presets = join(dirname(fileURLToPath(import.meta.url)), '..', 'presets');
const lines = ['// Made by tools/presets.mjs from the JSON files beside it; edit those, not this.', '', 'export const PRESETS: Record<string, Record<string, unknown>> = {'];
for (const effect of readdirSync(presets).filter((d) => statSync(join(presets, d)).isDirectory()).sort()) {
  for (const file of readdirSync(join(presets, effect)).filter((f) => f.endsWith('.json')).sort()) {
    const look = JSON.parse(readFileSync(join(presets, effect, file), 'utf8'));
    const name = `${effect}/${file.slice(0, -5)}`;
    lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(look)},`);
  }
}
lines.push('};', '');
writeFileSync(join(presets, 'index.ts'), lines.join('\n'));
console.log('wrote presets/index.ts');
