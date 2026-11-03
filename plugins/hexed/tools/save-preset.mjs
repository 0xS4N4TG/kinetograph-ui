#!/usr/bin/env node
// Saves a rolled look as a named preset: rolls the genome for a seed (and optional locks), writes it to
// presets/<name>.json, and rebuilds presets/index.ts, the list <Hexed preset="name"> reads.
// The whole genome is stored, not only the seed, so the look stays put when the gene pools grow.
//
//   node plugins/hexed/tools/save-preset.mjs <name> <seed> [lock-json]
//   node plugins/hexed/tools/save-preset.mjs index        (only rebuild the index)

import { build } from 'esbuild';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const presets = join(root, 'presets');
mkdirSync(presets, { recursive: true });

const [name, seedArg, lockArg] = process.argv.slice(2);
if (!name || (name !== 'index' && !seedArg)) {
  console.error('usage: save-preset.mjs <name> <seed> [lock-json] | index');
  process.exit(1);
}

if (name !== 'index') {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    console.error('a preset name is lower case letters, digits and dashes');
    process.exit(1);
  }
  const seed = Number(seedArg);
  const lock = lockArg ? JSON.parse(lockArg) : {};
  // bundle the roll for Node so the preset comes from the same code the plugin renders with
  const out = join(tmpdir(), `hexed-roll-${process.pid}.mjs`);
  await build({
    stdin: { contents: `export { roll } from ${JSON.stringify(join(root, 'src/hexed.tsx'))};`, resolveDir: root, loader: 'ts' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: out,
    logLevel: 'error',
  });
  const { roll } = await import(pathToFileURL(out).href);
  rmSync(out);
  const preset = { name, seed, lock, genome: roll(seed, lock) };
  writeFileSync(join(presets, `${name}.json`), JSON.stringify(preset, null, 2) + '\n');
  console.log(`saved presets/${name}.json`);
}

// presets/index.ts: every preset JSON, inlined, so the bundle needs no JSON loader
const files = readdirSync(presets).filter((f) => f.endsWith('.json')).sort();
const entries = files.map((f) => {
  const p = JSON.parse(readFileSync(join(presets, f), 'utf8'));
  return `  ${JSON.stringify(p.name)}: ${JSON.stringify(p.genome)},`;
});
writeFileSync(
  join(presets, 'index.ts'),
  `// Made by tools/save-preset.mjs from the JSON files beside it; edit those, not this.\n\n` +
    `import type { Genome } from '../src/hexed.js';\n\n` +
    `export const PRESETS: Record<string, Genome> = {\n${entries.join('\n')}\n};\n`,
);
console.log(`presets/index.ts: ${files.length} preset${files.length === 1 ? '' : 's'}`);
