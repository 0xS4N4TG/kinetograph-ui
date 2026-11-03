// Props schemas for Studio's Props tab and for agents. The layout and preset lists come from the tables, so a new
// layout or preset shows up here without a second edit. Use `matchCutSchema` whole, or its fields in a
// composition's own schema:
//
//   schema={z.object({ keyword: z.string(), look: matchCutLookSchema })}

import { z } from 'zod';
import { LAYOUTS } from './pages.js';
import type { Layout } from './pages.js';
import { PRESETS } from '../presets/index.js';

/** Preset names under `match-cut/`, as `<MatchCut preset>` takes them. */
export const MATCH_CUT_PRESETS = Object.keys(PRESETS)
  .filter((k) => k.startsWith('match-cut/'))
  .map((k) => k.slice('match-cut/'.length));

// Remotion's marker for a colour field; Studio draws a colour picker for it
const COLOR = '__remotion-color';

/** A match cut's look: everything but the keyword and the screenshots. Every field is optional; a preset fills the rest. */
export const matchCutLookSchema = z
  .object({
    layouts: z.array(z.enum(LAYOUTS as readonly Layout[] as [Layout, ...Layout[]])).min(1).describe('The page layouts the made-up pages draw from.'),
    cutsPerSecond: z.number().min(1).max(30).describe('How many page cuts a second.'),
    zoom: z.number().min(1).max(4).describe('Push-in by the last frame; 1 holds still.'),
    keySize: z.number().min(0.02).max(0.3).describe("The keyword's type size, a fraction of the frame's shorter side."),
    anchorY: z.number().min(0).max(1).describe("The keyword line's height down the frame, 0 top to 1 bottom."),
    blur: z.number().min(0).max(40).describe('Focus blur off the keyword line, in pixels.'),
    smear: z.number().min(0).max(8).describe('How much taller than wide the blur smears.'),
    falloff: z.number().min(0.5).max(20).describe('How many keyword-line heights out the blur reaches full strength.'),
    streak: z.number().min(0).max(60).describe('Sideways streak of the blur, in pixels.'),
    crumple: z.number().min(0).max(3).describe('How creased the paper is.'),
    tint: z.string().describe(COLOR),
    texture: z.string().describe('A paper scan under public/, multiplied over the page.'),
    textureOpacity: z.number().min(0).max(1).describe('How strongly the texture scan shows.'),
    grain: z.number().min(0).max(0.5).describe('Film grain over the whole frame.'),
    highlight: z.string().describe(COLOR),
    wander: z.number().min(0).max(1).describe("How far the keyword's size and place wander from cut to cut."),
    screen: z.number().min(0).max(1).describe('The page as a filmed screen: LCD pixels, a lens barrel, dark corners. 0 off, 1 full.'),
    pixel: z.number().min(2).max(24).describe("The screen's pixel size, px."),
    curve: z.number().min(0).max(0.3).describe("The lens's barrel on the screen; 0 flat."),
  })
  .partial()
  .describe('A match cut look; a preset fills what is left out.')
  // Studio draws the Paper panel for this field: preset cards, a layout picker, sliders and a keyword box on the preview
  .meta({ kinetographPanel: '@kinetographdev/paper' });

const boxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

/** One of your screenshots, with a rough box round the keyword. */
export const screenshotSchema = z.object({
  src: z.string().describe('The screenshot, under public/.'),
  hint: boxSchema.describe('Roughly where the keyword is in the image, in image pixels: [x, y, width, height]. The plugin snaps it to the ink.'),
  exact: z.boolean().optional().describe('Use the hint as it is, without snapping to the ink.'),
});

/** The props of `<MatchCut>`. */
export const matchCutSchema = z.object({
  keyword: z.string().describe('The word or phrase that holds still, highlighted.'),
  preset: (MATCH_CUT_PRESETS.length ? z.enum(MATCH_CUT_PRESETS as [string, ...string[]]) : z.string()).optional().describe('A look by name; `look` overrides it.'),
  look: matchCutLookSchema.optional(),
  screenshots: z.array(screenshotSchema).optional().describe('Your own screenshots to cut to, instead of made-up pages.'),
  everyNth: z.number().int().min(1).max(20).optional().describe('A screenshot every nth cut (1: screenshots only); made-up pages between.'),
  seed: z.number().int().min(0).optional().describe('Another pile of made-up pages.'),
  showKeyBox: z.boolean().optional().describe('Draw the hint (blue) and the snapped box (red) on screenshots, to check them in a still.'),
  durationInFrames: z.number().int().min(1).optional().describe('Frames the push-in runs over; default the composition length.'),
});

/** The edge styles and paper stocks `<CutOut>` takes (EDGES and STOCKS in sheet.ts). */
export const EDGE_STYLES = ['torn', 'cut', 'wavy', 'sticker'] as const;
export const STOCK_NAMES = ['white', 'newsprint', 'kraft', 'binder', 'cardboard'] as const;
/** The hand-drawn line styles and the papers `<Scrapline>` takes (LINES and PAPERS in scrap.ts). */
export const LINE_NAMES = ['marker', 'pencil', 'crayon', 'scribble', 'brush'] as const;
export const PAPER_NAMES = ['white', 'kraft', 'binder', 'cardboard', 'newsprint'] as const;

const sheetFields = {
  x: z.number().describe("Centre of the picture across the canvas, px."),
  y: z.number().describe('Centre of the picture down the canvas, px.'),
  width: z.number().min(10).describe('Drawn width of the picture, px.'),
  edge: z.enum(EDGE_STYLES).describe('The edge: torn paper, scissor cut, wavy scissors or a sticker border.'),
  stock: z.enum(STOCK_NAMES).describe('The paper, from the plugin\'s scans.'),
  paper: z.string().describe(COLOR),
  back: z.string().describe(COLOR),
  fringe: z.string().describe(COLOR),
  creases: z.number().min(0).max(1).describe('Creases left across the flat sheet.'),
  shadow: z.number().min(0).max(2).describe('Shadow strength.'),
  boil: z.number().min(0).max(24).describe('Edge redraws per second, as stop motion; 0 holds it.'),
  seed: z.number().int().min(0).describe('Another tear, another crumple.'),
};

/** `<CutOut>`'s look and placement: every prop but `src` and `id`. Spread it in: `<CutOut src={...} {...look} />`. */
export const cutOutLookSchema = z
  .object({
    ...sheetFields,
    line: z.enum(LINE_NAMES).describe('A hand-drawn line round the cut-out, as Scrapline draws it.'),
    lineColor: z.string().describe(COLOR),
    lineGap: z.number().min(0).max(80).describe('Gap between the paper and the line, px.'),
  })
  .partial()
  .describe('A paper cut-out: where it sits, its edge and its paper.')
  // Studio draws the Paper panel's sheet view: edge and stock cards, colours, sliders, the picture's place on the preview
  .meta({ kinetographPanel: '@kinetographdev/paper', kinetographView: 'cut-out' });

/** `<FoldOut>`'s look, placement and unfolding. Spread it in: `<FoldOut src={...} {...look} />`. */
export const foldOutLookSchema = z
  .object({
    ...sheetFields,
    delay: z.number().int().min(0).describe('Frames before it starts to open.'),
    duration: z.number().int().min(1).describe('Frames from folded to flat.'),
    steps: z.number().min(2).max(30).describe('Stop-motion rate while it opens, new positions a second.'),
    folds: z.number().int().min(1).max(5).describe('Folds in the sheet; each roughly halves it.'),
    ball: z.number().min(0.3).max(1.5).describe("The packet's size against the flat sheet."),
    crumple: z.number().min(0).max(0.03).describe("How far the packet's facets are knocked about."),
    turn: z.number().min(-90).max(90).describe('Turn of the packet, degrees, unwound as it opens.'),
    cells: z.number().int().min(4).max(24).describe('Facets across the longer side; finer is smoother and slower.'),
  })
  .partial()
  .describe('A paper cut-out folded up small, opening out.')
  .meta({ kinetographPanel: '@kinetographdev/paper', kinetographView: 'fold-out' });

/** `<Scrapline>`'s look: every prop but `trace`, `id` and the subject. Spread it in: `<Scrapline trace={...} {...look}>`. */
export const scraplineLookSchema = z
  .object({
    line: z.enum(LINE_NAMES).describe('The line: marker, pencil, crayon, scribble or brush.'),
    paper: z.enum(PAPER_NAMES).describe('Torn paper behind the line, from the plugin\'s scans; leave out for none.'),
    color: z.string().describe(COLOR),
    offset: z.number().min(0).max(120).describe('How far the line sits outside the cut-out, px.'),
    paperMargin: z.number().min(0).max(160).describe('How far the paper reaches past the line, px.'),
    paperBoil: z.number().min(0).max(24).describe('Paper redraws per second.'),
    seed: z.number().int().min(0).describe('Another take of the same drawing.'),
    threshold: z.number().int().min(0).max(255).describe('Matte value that counts as inside; about 40 for a soft matte.'),
  })
  .partial()
  .describe('A hand-drawn border round a cut-out subject, on torn paper.')
  // Studio draws the Paper panel's scrapline view: line and paper cards, a colour, sliders
  .meta({ kinetographPanel: '@kinetographdev/paper', kinetographView: 'scrapline' });
