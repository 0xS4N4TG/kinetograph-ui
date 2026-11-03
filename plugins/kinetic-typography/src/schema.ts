// Props schemas for Studio's Props tab and for agents. The lists come from styles.ts, so a new font, layout or look
// shows up here without a second edit. `captionLookSchema` carries the kinetic-typography panel:
//
//   schema={z.object({ look: captionLookSchema })}   ...   <Captions words={words} look={look} />

import { z } from 'zod';
import { FINISHES, FONT_NAMES, INS, LAYOUTS, MARKS, OUTS, STYLE_NAMES, TREATMENTS } from './styles.js';

export const CAPTION_PRESETS = STYLE_NAMES;

// The colours stay strings, not Studio colour pickers: they also take 'accent' and 'footage'. The panel has pickers.
const en = <T extends string>(xs: readonly T[]) => z.enum(xs as unknown as [T, ...T[]]);

/** One kind of text, the caption or the big text. */
export const textLookSchema = z
  .object({
    font: en(FONT_NAMES).describe('A font from FONTS.'),
    weight: z.number().min(100).max(900).describe('Weight; the nearest the font has is used.'),
    italic: z.boolean(),
    case: z.enum(['as-is', 'upper', 'lower']),
    tracking: z.number().min(-0.1).max(0.3).describe('Letter spacing, em.'),
    size: z.number().min(0.01).max(8).describe("Caption: size as a fraction of the frame's shorter side. Big: the most it grows, in caption sizes."),
    color: z.string().describe("A hex colour, or 'accent'."),
  })
  .partial();

/** A caption look: `style` names a ready-made look, the rest change it. Every field is optional. */
export const captionLookSchema = z
  .object({
    style: en(STYLE_NAMES).describe('A ready-made look the rest of the fields change.'),
    caption: textLookSchema.describe('The small running words.'),
    big: textLookSchema.describe("A hook line's big word."),
    layout: en(LAYOUTS).describe('Where the lines sit.'),
    side: z.enum(['auto', 'left', 'right']).describe('beside: the open side, or auto from the subject or the footage.'),
    fit: z.number().min(0.1).max(1).describe("The big word's width, a fraction of the frame's."),
    y: z.number().min(0).max(1).describe("A hook's middle, down the frame."),
    captionY: z.number().min(0).max(1).describe("A caption line's middle, down the frame."),
    treatment: en(TREATMENTS).describe('How the big word is dressed as it arrives.'),
    finish: en(FINISHES).describe("The big word's surface."),
    blend: z.enum(['normal', 'difference']).describe('difference: the big word inverts the picture under it.'),
    mark: en(MARKS).describe("How a caption line's marked word stands out."),
    dot: z.boolean().describe('A dot in the accent beside a hook.'),
    in: en(INS).describe('How each word arrives.'),
    out: en(OUTS).describe('How a line leaves.'),
    bigIn: z.enum([...INS, 'same', 'vary'] as [string, ...string[]]).describe("The big word's own entrance; vary: a new one each line."),
    far: z.number().min(0).max(3).describe('How far words travel, 1 = 100%.'),
    bounce: z.boolean(),
    flicker: z.boolean().describe('The big word flickers on.'),
    flash: z.boolean().describe('The big word flashes as it lands.'),
    shake: z.number().min(0).max(100).describe('A jolt on the big word as it lands.'),
    soft: z.number().min(0).max(100).describe('Blur and slower easing on every move.'),
    steps: z.boolean().describe('Motion held on 12 frames a second.'),
    reveal: z.enum(['word', 'line']).describe('Words appear as said, or the whole line at once.'),
    accent: z.string().describe("The accent: a hex colour, or 'footage' to take it from the footage."),
    shadow: z.number().min(0).max(1).describe('Shadow under the text.'),
    readable: z.boolean().describe('Strengthen the shadow, and lay a scrim, where the footage under the text is bright.'),
  })
  .partial()
  .meta({ kinetographPanel: '@kinetographdev/kinetic-typography', kinetographView: 'captions' });

/** `<Captions>`'s props, for a composition whose schema is the component's. */
export const captionsSchema = z.object({
  words: z.array(z.object({ text: z.string(), from: z.number(), to: z.number() })).describe('Spoken words, in frames.'),
  split: z.array(z.number().int().min(1)).optional().describe('Words per line.'),
  big: z.array(z.string()).optional().describe('Words set big.'),
  marks: z.array(z.string()).optional().describe('Caption words marked out.'),
  look: captionLookSchema.optional(),
});
