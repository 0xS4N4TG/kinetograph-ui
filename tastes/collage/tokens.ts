// The collage taste: a vox-style paper collage of archive cut-outs on an old newspaper page, measured off a reference reel
// and built in tastes/collage/demo.
//
// Rules from the reference, kept here so every piece follows them:
//   - stop motion: 12 images a second on twos, with a 3-frame hold once a second (24 fps into 25); only fades step
//     every frame (STARTS, heldImage in time.ts)
//   - no pan, no rotation: every layer scales about the screen centre on its own curve, so depth comes from parallax
//     (Depth); the camera racks focus by blurring whole layers, sharp ones come forward
//   - everything is printed matter: a real old newspaper scan under our own masthead and headlines, inked (roughened,
//     spread), one sepia grade over the sheet, creases and newsprint grain on top
//   - cut-outs are clean, hard-edged, black and white with a warm cast; one colour picture tinted peach-orange
//   - labels are torn yellow paper with an ultra-bold Didone typed on letter by letter (the newest at 40 %), the paper
//     running ahead of the letters; they leave by flying past the lens (scale up, zoom smear)
//   - a torn charcoal strip carries white Didone caps with a red-left / blue-right colour split of 1.5 px
//   - no shadows, no vignette, no glow; one static dither screen (about 3 px, 8 levels) over the whole frame
//   - our own words and masthead; never a real newspaper's name, a real brand or a real person's name on screen

export const COLLAGE = {
  /** the page's paper and ink after the sepia grade */
  paper: '#dcc9b3',
  paperLight: '#efe1cd',
  ink: '#2a2422',
  /** label paper and label ink */
  yellow: '#f6c11c',
  labelInk: '#373326',
  /** the torn strip and the paler sliver under it, and the strip's type */
  charcoal: '#2f2c31',
  sliver: '#6b6870',
  white: '#f8faef',
  /** the translucent highlighter bar */
  highlighter: '#f2e43c',
  /** the one colour picture (brick) */
  brick: '#f0bd89',
  /** the map page's white */
  page: '#faf7fa',
} as const;

export const FONTS = {
  /** labels and strip: ultra-bold Didone */
  didone: 'Abril Fatface',
  /** the masthead */
  blackletter: 'UnifrakturMaguntia',
  /** headlines: condensed gothic, as old front pages set them */
  gothic: 'League Gothic',
  /** small print on the page */
  body: 'Old Standard TT',
  /** the one handwritten word */
  script: 'Pinyon Script',
} as const;

/** The page's sepia grade (gradientMap stops). */
export const SEPIA = [{ offset: 0.02, color: COLLAGE.ink }, { offset: 0.55, color: '#9a8672' }, { offset: 0.9, color: COLLAGE.paper }, { offset: 1, color: COLLAGE.paperLight }];

/** Abril Fatface advance widths (em), from the font's hmtx table, for sizing labels and strips to their words. */
const DIDONE_ADVANCE: Record<string, number> = { ' ': 0.18, A: 0.694, B: 0.659, C: 0.69, D: 0.755, E: 0.624, F: 0.592, G: 0.723, H: 0.749, I: 0.355, J: 0.517, K: 0.734, L: 0.596, M: 0.84, N: 0.67, O: 0.748, P: 0.634, Q: 0.748, R: 0.716, S: 0.6, T: 0.683, U: 0.683, V: 0.685, W: 1.015, X: 0.711, Y: 0.641, Z: 0.612, 0: 0.664, 1: 0.425, 2: 0.552, 3: 0.573, 4: 0.603, 5: 0.54, 6: 0.616, 7: 0.51, 8: 0.611, 9: 0.616, '.': 0.265, ',': 0.262, "'": 0.186, '’': 0.26, '-': 0.352, '–': 0.5, ':': 0.265, '?': 0.58, '!': 0.377, '&': 0.822 };

/** Width in px of `text` set in the Didone at `size` px, with `tracking` em of letter-spacing. */
export const didoneWidth = (text: string, size: number, tracking = 0) => [...text].reduce((w, c) => w + ((DIDONE_ADVANCE[c] ?? 0.66) + tracking) * size, 0);
