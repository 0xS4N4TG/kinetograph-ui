// The caption styles as data: the fonts, layouts, moving styles, motions and the fourteen named looks `<Captions>`
// takes. Pure (no engine, no React), so Studio's panel and the schema import it as well as the component.
//
// A look has two kinds of text, as an editor sees them: the caption (the small running words) and the big text (one
// word of a hook line that is set huge, with the small words round it). Everything else, the layout, the moving
// style, the motion in and out and the feel, is shared, and any field can be changed for one line only.

/** A font the looks use, with the weights and italics loaded, and how wide a letter of it runs at one em, upper and
 *  lower case, to fit a big word to the frame without measuring. Most are Google fonts (OFL), loaded by `module`. One
 *  that is not has `css`: the stylesheet its maker serves it from, which the render reads for the current files (with
 *  `makeWebFont`) and the Studio panel links. One that has neither (no Google listing, no stylesheet) has `files`: the
 *  font files by weight, loaded with `loadFont`, `module` then being the family name. One with `local` ships with the
 *  plugin (only a font whose licence allows that): its stylesheet in fonts/ registers it, `module` being the family. */
export interface FontInfo {
  module: string;
  weights: number[];
  italic: boolean;
  upper: number;
  lower: number;
  css?: string;
  files?: { weight: number; url: string }[];
  local?: boolean;
}

export const FONTS = {
  // Switzer (Indian Type Foundry), free for any use under the ITF Free Font License, which forbids handing out the
  // files: they come from Fontshare, which lists the current ones in this stylesheet.
  Switzer: {
    module: 'Switzer', weights: [300, 400, 500, 600, 700, 800, 900], italic: true, upper: 0.67, lower: 0.535,
    css: 'https://api.fontshare.com/v2/css?f[]=switzer@300,301,400,401,500,501,600,601,700,701,800,801,900,901&display=swap',
  },
  // Kineta (Sanat Gupta), a geometric display sans with tall capitals and a compact, heavy lowercase; MIT, from the
  // kinetograph-fonts repo, shipped in fonts/kineta with its licence.
  Kineta: { module: 'Kineta', weights: [100, 300, 400, 500, 600, 700], italic: true, upper: 0.66, lower: 0.52, local: true },
  // Figtree (Erik Kennedy), a friendly geometric sans; Google Fonts, OFL.
  Figtree: { module: 'Figtree', weights: [300, 400, 500, 600, 700, 800, 900], italic: true, upper: 0.68, lower: 0.54 },
  // Geist Serif (Vercel), OFL, not on Google Fonts: the files of the `geist` npm package (v1.9.0) from jsDelivr. One
  // weight only (the engine does not vary the variable font's weight axis), and the Triangle cut, whose i and j have
  // triangular dots.
  'Geist Serif': { module: 'Geist Serif', weights: [400], italic: false, upper: 0.66, lower: 0.48, files: [{ weight: 400, url: 'https://cdn.jsdelivr.net/npm/geist@1.9.0/dist/fonts/geist-serif/GeistSerif-Regular.woff2' }] },
  'Geist Serif Triangle': { module: 'Geist Serif Triangle', weights: [400], italic: false, upper: 0.66, lower: 0.48, files: [{ weight: 400, url: 'https://cdn.jsdelivr.net/npm/geist@1.9.0/dist/fonts/geist-serif/GeistSerif-Triangle.woff2' }] },
  // Poppins and Barlow Condensed: the heavy geometric keyword and the condensed italic caps of explainer reels; Google, OFL.
  Poppins: { module: 'Poppins', weights: [300, 400, 500, 600, 700, 800, 900], italic: true, upper: 0.74, lower: 0.6 },
  'Barlow Condensed': { module: 'BarlowCondensed', weights: [400, 500, 600, 700, 800], italic: true, upper: 0.5, lower: 0.43 },
  Inter: { module: 'Inter', weights: [300, 400, 500, 600, 700, 800, 900], italic: true, upper: 0.7, lower: 0.56 },
  Anton: { module: 'Anton', weights: [400], italic: false, upper: 0.47, lower: 0.42 },
  'Archivo Black': { module: 'ArchivoBlack', weights: [400], italic: false, upper: 0.78, lower: 0.64 },
  'Bebas Neue': { module: 'BebasNeue', weights: [400], italic: false, upper: 0.4, lower: 0.4 },
  Montserrat: { module: 'Montserrat', weights: [400, 600, 800, 900], italic: true, upper: 0.78, lower: 0.62 },
  Oswald: { module: 'Oswald', weights: [400, 600, 700], italic: false, upper: 0.5, lower: 0.44 },
  'Playfair Display': { module: 'PlayfairDisplay', weights: [400, 700, 900], italic: true, upper: 0.7, lower: 0.54 },
  'Bodoni Moda': { module: 'BodoniModa', weights: [400, 500, 700], italic: true, upper: 0.72, lower: 0.52 },
  'Instrument Serif': { module: 'InstrumentSerif', weights: [400], italic: true, upper: 0.6, lower: 0.42 },
  'DM Serif Display': { module: 'DMSerifDisplay', weights: [400], italic: true, upper: 0.68, lower: 0.5 },
  'Space Grotesk': { module: 'SpaceGrotesk', weights: [400, 500, 700], italic: false, upper: 0.66, lower: 0.56 },
  'JetBrains Mono': { module: 'JetBrainsMono', weights: [400, 500, 700], italic: true, upper: 0.6, lower: 0.6 },
} satisfies Record<string, FontInfo>;
export type FontName = keyof typeof FONTS;
export const FONT_NAMES = Object.keys(FONTS) as FontName[];

/** Where the lines sit. `over`: the small words over and under the big word, upper middle. `centre`: the same block in
 *  the middle of the frame. `left`: flush left, upper left. `beside`: in the open side of the frame, at eye level (the
 *  side is read off the footage, or set). `one-line`: small and big words on one line. `plain`: captions only, the big
 *  word just marked. */
export const LAYOUTS = ['over', 'centre', 'left', 'beside', 'one-line', 'plain'] as const;
export type Layout = (typeof LAYOUTS)[number];

/** How the big word is dressed as it arrives. `box-first`: a box grows, then the word lands in it. `typewriter`: typed
 *  a letter at a time with a cursor. `select`: a blue text selection sweeps across it. `highlight`: a colour sweeps in
 *  behind it, like a highlighter pen. `underline`: a bar draws under it. `boil`: the whole line drawn by hand a word to a
 *  row, boiling on twelves, painted into knocked-out bands as it holds (the poster-boil style; see boil-captions.tsx). */
export const TREATMENTS = ['simple', 'box-first', 'typewriter', 'select', 'highlight', 'underline', 'boil'] as const;
export type Treatment = (typeof TREATMENTS)[number];

/** The big word's surface: flat, a shine that sweeps across it, or a glow in its own colour. */
export const FINISHES = ['flat', 'shine', 'glow'] as const;
export type Finish = (typeof FINISHES)[number];

/** How a caption word marks itself out (the line's marked word: `marks`, or its first word). */
export const MARKS = ['none', 'weight', 'colour', 'box'] as const;
export type Mark = (typeof MARKS)[number];

/** How each word arrives. `focus` comes up from a blur; `pop` grows past its size and settles; `typewriter` and
 *  `box-first` are the moving styles used as an entrance for every word. */
export const INS = ['rise', 'fall', 'left', 'right', 'focus', 'fade', 'instant', 'pop', 'box-first', 'typewriter'] as const;
export type In = (typeof INS)[number];
/** How a line leaves, all its words together. */
export const OUTS = ['cut', 'fade', 'rise', 'fall', 'left', 'right', 'blur'] as const;
export type Out = (typeof OUTS)[number];

export type Case = 'as-is' | 'upper' | 'lower';

/** One kind of text: the caption or the big text. `color` is a hex colour or `accent`. */
export interface TextLook {
  font: FontName;
  weight: number;
  italic: boolean;
  case: Case;
  /** letter spacing, em */
  tracking: number;
  /** caption: type size as a fraction of the frame's shorter side; big: the most it grows, in caption sizes */
  size: number;
  color: string;
}

export interface CaptionLook {
  caption: TextLook;
  big: TextLook;
  layout: Layout;
  /** `beside` only: the open side, or `auto` to read it off the footage (the half with less going on) */
  side: 'auto' | 'left' | 'right';
  /** the big word is fitted to this much of the frame's width, at most `big.size` captions tall */
  fit: number;
  /** the block's middle and the caption line's middle, down the frame, 0..1 */
  y: number;
  captionY: number;
  treatment: Treatment;
  finish: Finish;
  /** `difference`: the big word turns the picture under it inside out (white on dark, dark on light) */
  blend: 'normal' | 'difference';
  mark: Mark;
  /** a dot in the accent beside the block (the lime serif's) */
  dot: boolean;
  in: In;
  out: Out;
  /** the big word's own entrance: one of `INS`, `same` as the words, or `vary` (a different one each line) */
  bigIn: In | 'same' | 'vary';
  /** how far words travel in and out, 1 = 100% */
  far: number;
  bounce: boolean;
  flicker: boolean;
  flash: boolean;
  /** 0..100: a jolt on the big word as it lands; 0..100: blur and slower easing on every move */
  shake: number;
  soft: number;
  /** motion held on 12 frames a second, like stop-motion */
  steps: boolean;
  /** words appear as they are said (`word`), or the whole line at its first word (`line`) */
  reveal: 'word' | 'line';
  /** the colour `accent` means: a hex, or `footage` to take it from the `footage` prop */
  accent: string;
  /** a shadow under the text, 0..1, and whether to strengthen it (and lay a soft scrim) where the footage under
   *  the text is bright */
  shadow: number;
  readable: boolean;
}

const sans = (weight: number, extra: Partial<TextLook> = {}): TextLook => ({ font: 'Switzer', weight, italic: false, case: 'as-is', tracking: -0.01, size: 0.045, color: '#ffffff', ...extra });

/** What every look starts from. */
export const BASE: CaptionLook = {
  caption: sans(600),
  big: sans(900, { tracking: -0.035, size: 5 }),
  layout: 'over',
  side: 'auto',
  fit: 0.72,
  y: 0.3,
  captionY: 0.64,
  treatment: 'simple',
  finish: 'flat',
  blend: 'normal',
  mark: 'weight',
  dot: false,
  in: 'rise',
  out: 'fade',
  bigIn: 'same',
  far: 1,
  bounce: false,
  flicker: false,
  flash: false,
  shake: 0,
  soft: 20,
  steps: false,
  reveal: 'word',
  accent: '#e2552b',
  shadow: 0.35,
  readable: true,
};

/** A look's fields, with `caption` and `big` partial too. `style` starts the patch from a named look, so one `look`
 *  value can carry the style and the changes to it (as Studio's panel writes it). */
export type LookPatch = Partial<Omit<CaptionLook, 'caption' | 'big'>> & { caption?: Partial<TextLook>; big?: Partial<TextLook>; style?: string };

/** The named looks, after the ready-made styles of caption tools (aster.video's among them). Each is a patch on BASE. */
export const STYLES = {
  'poster-boil': {
    caption: { case: 'upper' },
    big: { case: 'upper' },
    treatment: 'boil',
    accent: '#fa00ec',
    fit: 0.86,
    y: 0.46,
    steps: true,
    shadow: 0,
    readable: false,
  },
  'clean-hook': {
    caption: { font: 'Kineta', weight: 500 },
    big: { font: 'Kineta', weight: 700, tracking: -0.03 },
    in: 'rise',
  },
  'red-headline': {
    caption: { weight: 600, size: 0.038 },
    big: { font: 'Anton', weight: 400, case: 'upper', tracking: 0, color: 'accent', size: 6 },
    accent: '#e2552b',
    bigIn: 'pop',
  },
  'lime-serif': {
    caption: { weight: 500, size: 0.042 },
    big: { font: 'Playfair Display', weight: 900, italic: true, case: 'lower', tracking: -0.02, color: 'accent', size: 5.5 },
    accent: '#b6f24a',
    finish: 'glow',
    dot: true,
    bigIn: 'focus',
  },
  prism: {
    caption: { weight: 700, size: 0.036 },
    big: { font: 'Switzer', weight: 900, case: 'upper', tracking: -0.05 },
    blend: 'difference',
    bigIn: 'vary',
    shadow: 0,
  },
  'editorial-serif': {
    caption: { weight: 600, size: 0.04 },
    big: { font: 'Geist Serif', weight: 400, case: 'lower', tracking: -0.03, size: 5 },
    layout: 'left',
    fit: 0.6,
    in: 'focus',
    soft: 45,
  },
  'shine-headline': {
    caption: { weight: 700 },
    big: { font: 'Archivo Black', weight: 400, case: 'upper', tracking: -0.03 },
    finish: 'shine',
    bigIn: 'pop',
  },
  'selected-text': {
    caption: { weight: 600 },
    big: { font: 'Figtree', weight: 800, tracking: -0.04, case: 'lower' },
    treatment: 'select',
    in: 'fade',
  },
  highlighter: {
    caption: { weight: 600, size: 0.038 },
    big: { font: 'Anton', weight: 400, case: 'upper', tracking: 0.005, size: 6 },
    treatment: 'highlight',
    mark: 'box',
    accent: 'footage',
  },
  typewriter: {
    caption: { weight: 500, case: 'lower', size: 0.04 },
    big: { weight: 700, case: 'lower', tracking: -0.04, size: 3.2 },
    layout: 'left',
    fit: 0.55,
    treatment: 'typewriter',
    in: 'typewriter',
    out: 'cut',
  },
  'box-first': {
    caption: { weight: 700, case: 'upper', tracking: 0.02, size: 0.036 },
    big: { weight: 900, case: 'upper', tracking: -0.04, color: '#111111', size: 4.5 },
    treatment: 'box-first',
    mark: 'box',
    accent: '#ffffff',
    in: 'box-first',
    shadow: 0,
  },
  'bold-captions': {
    caption: { font: 'Montserrat', weight: 900, case: 'upper', tracking: -0.01, size: 0.062 },
    big: { font: 'Montserrat', weight: 900, case: 'upper', tracking: -0.03, size: 3 },
    layout: 'one-line',
    mark: 'colour',
    accent: '#ffd60a',
    y: 0.66,
    captionY: 0.66,
    in: 'pop',
    bounce: true,
    out: 'cut',
    shadow: 0.8,
  },
  'soft-minimal': {
    caption: { font: 'Figtree', weight: 400, case: 'lower', size: 0.04, color: '#f4f1ea' },
    big: { font: 'Figtree', weight: 300, case: 'lower', tracking: -0.04, color: '#f4f1ea', size: 3.5 },
    layout: 'centre',
    y: 0.42,
    mark: 'none',
    in: 'fade',
    out: 'fade',
    soft: 80,
    shadow: 0.2,
  },
  'cinematic-caps': {
    caption: { weight: 700, case: 'upper', tracking: 0.14, size: 0.03 },
    big: { font: 'Instrument Serif', weight: 400, italic: true, case: 'lower', tracking: -0.02, size: 4.2 },
    layout: 'beside',
    fit: 0.34,
    y: 0.4,
    captionY: 0.4,
    mark: 'none',
    in: 'focus',
    out: 'blur',
    soft: 50,
  },
  'side-note': {
    caption: { weight: 500, size: 0.034, color: '#ececec' },
    big: { font: 'Geist Serif Triangle', weight: 400, case: 'lower', tracking: -0.03, size: 4.2 },
    layout: 'beside',
    fit: 0.32,
    y: 0.42,
    captionY: 0.42,
    mark: 'none',
    in: 'rise',
    far: 0.6,
  },
} satisfies Record<string, LookPatch>;
export type StyleName = keyof typeof STYLES;
export const STYLE_NAMES = Object.keys(STYLES) as StyleName[];

/** One line on what each look is for, for the panel and for an agent choosing one. */
export const ABOUT: Record<StyleName, string> = {
  'poster-boil': 'A word to a row, drawn by hand and boiling on twelves, colours rotating as words land, white scribbles; the rows paint into knocked-out bands as the line holds and crop out to the centre. After a hand-lettered poster loop.',
  'clean-hook': 'Bold white geometric sans (Kineta), small words over and under. The safe default.',
  'red-headline': 'Condensed capitals in the accent colour, quiet white words round them.',
  'lime-serif': 'A fat italic serif in a glowing lime, with a dot.',
  prism: 'Heavy capitals in difference: dark where the picture is light. The big word arrives a new way each line.',
  'editorial-serif': 'Magazine type: a high-contrast serif flush left, arriving soft to sharp.',
  'shine-headline': 'Heavy white capitals with a shine that sweeps across them.',
  'selected-text': 'A blue text selection sweeps across the big word.',
  highlighter: 'A colour from the footage sweeps in behind condensed capitals, like a highlighter pen.',
  typewriter: 'Typed letter by letter as it is said, with a cursor and key clicks. Small, lower case, flush left.',
  'box-first': 'A white box grows first, then the black word lands in it.',
  'bold-captions': 'Big heavy capitals a word at a time, the word being said in yellow.',
  'soft-minimal': 'Light lower case that fades up out of a blur.',
  'cinematic-caps': 'For wide shots: spaced small capitals, the big moment in an italic serif in the open side.',
  'side-note': 'For wide shots: quiet captions in the empty side at eye level, the key word in a serif beside you.',
};

/** BASE, then a style, then patches in order; `caption` and `big` merge field by field. */
export function resolveLook(...patches: (LookPatch | undefined)[]): CaptionLook {
  let out: CaptionLook = { ...BASE, caption: { ...BASE.caption }, big: { ...BASE.big } };
  for (const p of patches) {
    if (!p) continue;
    const { caption, big, style, ...rest } = p;
    if (style && style in STYLES) out = resolveLook(out, STYLES[style as StyleName] as LookPatch);
    out = { ...out, ...rest, caption: { ...out.caption, ...caption }, big: { ...out.big, ...big } } as CaptionLook;
  }
  return out;
}

/** A look by style name, with overrides. */
export const styleLook = (name: StyleName | undefined, ...patches: (LookPatch | undefined)[]) =>
  resolveLook(name ? (STYLES[name] as LookPatch) : undefined, ...patches);
