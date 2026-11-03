// Rolling a genome from a seed. Pure: it needs only the gene ids of each slot, so the Studio panel can reroll in the
// browser without loading the engine. `roll` in hexed.tsx feeds it the real gene tables.

import { between, hash, pick, rng } from './rng.js';
import { SLOTS } from './slots.js';
import type { Slot } from './slots.js';

/** One slot's roll: which gene, the seed its own randomness comes from, and how strong (0..1). */
export interface Strand {
  gene: string;
  seed: number;
  amount: number;
}
export type Genome = Record<Slot, Strand>;

/** What a lock holds: a seed (that slot rolls as it would with that seed), a gene id (that gene, its details from
 *  the main seed), or a whole strand. */
export type Lock = number | string | Partial<Strand>;

/** How often each slot rolls "none": the grade nearly always plays, the louder slots often sit out, so a look is
 *  three or four things, not nine. */
export const EMPTY: Record<Slot, number> = {
  crop: 0.5,
  shake: 0.5,
  fps: 0.6,
  time: 0.6,
  mirror: 0.75,
  isolate: 0.75,
  grade: 0.05,
  screen: 0.5,
  optics: 0.45,
  damage: 0.4,
  grunge: 0.2,
};

/** Rolls a genome from a seed. `ids` lists the gene ids a slot can roll, "none" first. Locked slots keep what the
 *  lock says; the rest roll fresh. */
export function rollGenome(seed: number, lock: Partial<Record<Slot, Lock>>, ids: (slot: Slot) => readonly string[]): Genome {
  const out = {} as Genome;
  for (const slot of SLOTS) {
    const held = lock[slot];
    const slotSeed = typeof held === 'number' ? held : seed;
    const r = rng(hash(`${slot}:${slotSeed}`));
    const all = ids(slot);
    const gene = typeof held === 'string' ? held : r() < EMPTY[slot] ? 'none' : pick(r, all.slice(1));
    const strand: Strand = { gene, seed: hash(`${slot}:${slotSeed}:detail`), amount: between(r, 0.6, 1) };
    if (held && typeof held === 'object') Object.assign(strand, held);
    out[slot] = strand;
  }
  return out;
}
