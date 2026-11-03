// Props schemas for Studio's Props tab and for agents. Each carries `kinetographPanel`, so Studio draws the VJ panel
// for it, and `kinetographView`, which of the panel's views:
//
//   schema={z.object({ look: vjLookSchema, marks: blobStyleSchema })}
//   <Layer effects={lookEffects(look)}>...</Layer>
//   <Blobs track={track} {...marks} />

import { z } from 'zod';

// Remotion's marker for a colour field; Studio draws a colour picker for it
const COLOR = '__remotion-color';
const PANEL = '@kinetographdev/vj';

/** The looks `lookEffects` knows, `none` included. */
export const LOOK_KINDS = ['none', 'crt', 'vhs', 'oneBit', 'thermal', 'depth', 'pixels', 'glow', 'acid', 'night', 'grainy', 'halftone'] as const;
export type LookKind = (typeof LOOK_KINDS)[number];

const n = (lo: number, hi: number, what: string) => z.number().min(lo).max(hi).describe(what);

/** One look and the settings of each, so switching looks keeps what was set on the others. */
export const vjLookSchema = z
  .object({
    kind: z.enum(LOOK_KINDS).describe('Which look is on.'),
    crt: z
      .object({
        curve: n(0, 0.3, 'How far the glass bends.'),
        pitch: n(1, 12, 'Source pixels per scanline.'),
        scan: n(0, 1, 'How dark between the scanlines.'),
        grille: n(1, 6, 'Screen pixels per grille stripe.'),
        mask: n(0, 1, 'How strong the grille is.'),
        conv: n(0, 8, 'Pixels the red and blue guns land off green.'),
        noise: n(0, 0.2, 'Static.'),
        glass: n(0, 2, 'Reflection on the glass.'),
        cx: z.number().describe("The tube face's centre, px."),
        cy: z.number().describe("The tube face's centre, px."),
        hw: z.number().min(1).describe("The tube face's half-width, px."),
        hh: z.number().min(1).describe("The tube face's half-height, px."),
        off: n(0, 1, 'Switching off: 0 on, 1 off (a line, then a dot).'),
      })
      .partial(),
    vhs: z
      .object({
        jitter: n(0, 6, 'Line jitter, px.'),
        wobble: n(0, 6, 'Slow line wobble, px.'),
        trackAt: n(0, 1, 'Where the tracking band is, top to bottom.'),
        trackW: n(5, 200, 'Half-height of the tracking band, px.'),
        track: n(0, 1, 'How bad the tracking is.'),
        bleed: n(0, 40, 'How wide the colour smears, px.'),
        delay: n(0, 20, 'How late the colour lands, px.'),
        sat: n(0, 2, 'Colour saturation.'),
        snow: n(0, 0.4, 'Snow.'),
        drops: n(0, 0.05, 'Chance per line of a dropout.'),
      })
      .partial(),
    oneBit: z
      .object({
        size: n(1, 8, 'Dither cell, px.'),
        punch: n(0.5, 3, 'Contrast before the dither.'),
        ink: z.string().describe(COLOR),
        paper: z.string().describe(COLOR),
      })
      .partial(),
    thermal: z.object({ palette: z.enum(['iron', 'rainbow']).describe('The camera palette.'), soft: n(0, 20, 'Sensor softness, px.') }).partial(),
    depth: z.object({ soft: n(0, 30, 'Softness, px.'), punch: n(0.5, 3, 'Contrast.') }).partial(),
    pixels: z
      .object({ zoom: n(1, 40, 'Magnification.'), cx: z.number().describe('Zoom centre, px.'), cy: z.number().describe('Zoom centre, px.') })
      .partial(),
    glow: z.object({ v: z.number().int().min(1).max(8).describe('Variant: 1-3 bright, 7 deep blue, 8 nearly clean; 2 and 4-6 take an overlay.') }).partial(),
    acid: z.object({ v: z.number().int().min(1).max(4).describe('Variant: 1 and 4 soft blobs, folded; 2 warm; 3 teal.') }).partial(),
    night: z.object({ v: z.number().int().min(1).max(6).describe('Variant: 1-5 smeared by a move, 6 still.') }).partial(),
    grainy: z.object({ v: z.number().int().min(1).max(6).describe('Variant: 1 soft, 5 high-key grain, 2-4 a hard cut (3, 4 folded), 6 a cut smeared down.') }).partial(),
    halftone: z
      .object({
        size: n(3, 40, 'Dot cell, px.'),
        angle: n(0, 90, 'Screen angle, degrees.'),
        punch: n(0.5, 4, 'Contrast before the screen.'),
        bias: n(-0.5, 0.5, 'More ink (positive) or less.'),
        shape: z.enum(['circle', 'line', 'square']).describe('Dots, lines or squares.'),
        ink: z.string().describe(COLOR),
        paper: z.string().describe(COLOR),
      })
      .partial(),
  })
  .partial()
  .describe('A screen or sensor look and its settings.')
  .meta({ kinetographPanel: PANEL, kinetographView: 'look' });

export type VjLook = z.infer<typeof vjLookSchema>;

/** How `<Blobs>` marks the blobs: its props other than the track. Spread it into `<Blobs>`. */
export const blobStyleSchema = z
  .object({
    box: z.enum(['frame', 'corners', 'cross', 'none']).describe('How each blob is marked.'),
    label: z.enum(['both', 'id', 'xy', 'none']).describe('The text beside each box.'),
    links: z.enum(['nearest', 'chain', 'all', 'none']).describe('Which blobs are joined by lines.'),
    reach: n(0.05, 1, 'For links "all": how far apart two blobs may be, a fraction of the diagonal.'),
    invert: n(0, 1, 'Share of blobs filled solid in difference blending.'),
    blend: z.enum(['normal', 'difference']).describe('Difference keeps the marks readable on white and black alike.'),
    min: n(0, 0.05, 'Smallest blob kept, a fraction of the frame.'),
    max: z.number().int().min(1).max(60).describe('Most blobs kept, biggest first.'),
    color: z.string().describe(COLOR),
    stroke: n(0.5, 6, 'Line width, px.'),
    fontSize: n(8, 40, 'Label size, px.'),
  })
  .partial()
  .describe('How blobs are marked.')
  .meta({ kinetographPanel: PANEL, kinetographView: 'blobs' });

export type BlobStyle = z.infer<typeof blobStyleSchema>;
