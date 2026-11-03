// Props schemas for Studio's Props tab and for agents. The gene lists come from the gene tables, so a new gene shows
// up here without a second edit. `genomeSchema` carries the `kinetographPanel` meta that asks Studio for this
// plugin's panel; use it as a field of a composition's own schema:
//
//   schema={z.object({ look: genomeSchema, title: z.string() })}

import { z } from 'zod';
import { genesOf } from './hexed.js';
import { PROCEDURAL } from './grunge.js';
import { SLOTS, SLOT_NOTES } from './slots.js';
import type { Slot } from './slots.js';
import { PRESETS } from '../presets/index.js';

/** The grunge slot also takes `tex-<n>`, the nth scan passed as `textures`; the other slots take only the table's ids. */
const geneId = (slot: Slot) => {
  const ids = genesOf(slot) as [string, ...string[]];
  const named = z.enum(ids);
  return slot === 'grunge' ? z.union([named, z.string().regex(/^tex-\d+$/)]) : named;
};

const strand = (slot: Slot) =>
  z
    .object({
      gene: geneId(slot).describe(`The ${slot} gene: ${SLOT_NOTES[slot]}. "none" leaves the slot off.`),
      seed: z.number().int().min(0).max(4294967295).describe(`The ${slot} slot's own random seed; the same gene lands differently from seed to seed.`),
      amount: z.number().min(0).max(1).describe(`How strong the ${slot} gene plays, 0 to 1.`),
    })
    .describe(`The ${slot} slot: ${SLOT_NOTES[slot]}.`);

const slotEnum = z.enum(SLOTS as readonly Slot[] as [Slot, ...Slot[]]);

/** A rolled look: one strand per slot. Plain JSON; `<Hexed genome={...}>` plays it back exactly. */
export const genomeSchema = z
  .object(Object.fromEntries(SLOTS.map((slot) => [slot, strand(slot)])) as Record<Slot, ReturnType<typeof strand>>)
  .describe('A rolled look: a gene, a seed and an amount for each of the eleven slots.')
  .meta({ kinetographPanel: '@kinetographdev/hexed' });

/** The global controls over the whole look. */
export const adjustSchema = z
  .object({
    exposure: z.number().min(-100).max(100).describe('Exposure, -100 to 100.'),
    shadows: z.number().min(-100).max(100).describe('Shadows, -100 to 100.'),
    highlights: z.number().min(-100).max(100).describe('Highlights, -100 to 100.'),
    contrast: z.number().min(-100).max(100).describe('Contrast, -100 to 100.'),
    saturation: z.number().min(-100).max(100).describe('Saturation, -100 to 100.'),
    temperature: z.number().min(-100).max(100).describe('Temperature, -100 (cool) to 100 (warm).'),
    hue: z.number().min(-180).max(180).describe('Hue rotation in degrees.'),
    sharpen: z.number().min(0).max(100).describe('Sharpening, 0 to 100.'),
    invert: z.boolean().describe('Invert the colours.'),
  })
  .partial()
  .describe('Global colour controls laid over the whole look.');

const lockSchema = z
  .union([z.number(), z.string(), z.object({ gene: z.string(), seed: z.number(), amount: z.number() }).partial()])
  .describe('A seed, a gene id, or a whole strand to hold for that slot.');

const presetNames = Object.keys(PRESETS);

/** The props of `<Hexed>` apart from its children. */
export const hexedSchema = z
  .object({
    seed: z.number().int().min(0).max(4294967295).describe('The roll: a seed picks a gene for each slot. Ignored when a genome or preset is set.'),
    lock: z.partialRecord(slotEnum, lockSchema).describe('Slots to hold while the seed changes.'),
    genome: genomeSchema.describe('A saved look; wins over seed and lock.'),
    preset: (presetNames.length ? z.enum(presetNames as [string, ...string[]]) : z.string()).describe('A saved look by name; wins over seed and lock.'),
    off: z.array(slotEnum).describe('Slots switched off.'),
    amount: z.number().min(0).max(1).describe('Strength of the whole look, 0 to 1.'),
    amounts: z.partialRecord(slotEnum, z.number().min(0).max(1)).describe('Strength per slot, 0 to 1, on top of the genome.'),
    adjust: adjustSchema,
  })
  .partial()
  .describe('Props of <Hexed>.');
