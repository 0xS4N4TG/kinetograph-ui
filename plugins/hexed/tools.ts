// Hexed's tools for agents (`hexed_roll`, `hexed_genes`, `hexed_presets` in `kinetograph mcp`). Pure: they import only
// the pure modules (roll, slots, gene ids, the preset table), never the engine or React, and they never write files.

import { z } from 'zod';
import { PRESETS } from './presets/index.js';
import { GENE_IDS } from './src/gene-ids.js';
import { rollGenome } from './src/roll.js';
import { SLOTS, SLOT_NOTES } from './src/slots.js';
import type { Slot } from './src/slots.js';

const slot = z.enum(SLOTS as readonly Slot[] as [Slot, ...Slot[]]);

const strand = z.object({
  gene: z.string().describe('A gene id from hexed_genes.'),
  seed: z.number().int().min(0).max(4294967295).describe("The slot's own random seed."),
  amount: z.number().min(0).max(1).describe('How strong the gene plays, 0 to 1.'),
});
const genome = z.object(Object.fromEntries(SLOTS.map((s) => [s, strand])) as Record<Slot, typeof strand>).describe('A look: one strand per slot.');
type Genome = z.infer<typeof genome>;

const ids = (s: Slot) => GENE_IDS[s];

export const tools = [
  {
    name: 'roll',
    description:
      'Rolls a Hexed look (a genome). Locked slots keep their strands from the look given as "from", the rest reroll; with no locks every slot rolls. Returns { seed, genome }: the seed used, so the same call with that seed gives the same look.',
    input: z.object({
      seed: z.number().int().min(0).max(4294967295).optional().describe('The roll seed. Omit for a fresh random one; it is returned.'),
      locks: z.array(slot).optional().describe('Slots to keep. Needs "from".'),
      from: genome.optional().describe('The look to reroll part of. Without it nothing is held.'),
    }),
    run(input: { seed?: number; locks?: Slot[]; from?: Genome }) {
      const seed = input.seed ?? Math.floor(Math.random() * 4294967296);
      const hold: Partial<Record<Slot, Genome[Slot]>> = {};
      if (input.from) for (const s of input.locks ?? []) hold[s] = input.from[s];
      return { seed, genome: rollGenome(seed, hold, ids) };
    },
  },
  {
    name: 'genes',
    description: 'Lists the gene ids each Hexed slot accepts ("none" leaves the slot off), with a one-line note on what the slot does. Give "slot" for one.',
    input: z.object({ slot: slot.optional().describe('Only this slot.') }),
    run(input: { slot?: Slot }) {
      return Object.fromEntries((input.slot ? [input.slot] : SLOTS).map((s) => [s, { about: SLOT_NOTES[s], genes: [...ids(s)] }]));
    },
  },
  {
    name: 'presets',
    description: 'Lists the saved Hexed looks as { name: genome }. Use one as the "from" of hexed_roll, or as the "genome" prop.',
    input: z.object({}),
    run() {
      return { ...PRESETS };
    },
  },
];
