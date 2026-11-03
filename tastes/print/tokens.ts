// The print taste: risograph, halftone and screen-printed. Read off three technique reels and the user's textures:
//
//   DVd9Ls2gHWM  risograph: the art is split into ink passes, each a greyscale separation tinted to one ink and set to
//                Multiply over paper; inside each pass a halftone texture on Hard Mix at about 50 %; the passes a few
//                px off register; the texture re-rolled every 2 frames (12 drawings a second at 24 fps). Inks measured
//                off its palette strip: green #507f0f, yellow #e1da25, pink #de7488; overprints are about 90 % multiply
//                (a little paper shows through each ink). Paper #eeeee9 (strip), #e4e4e0 (the real riso macro).
//                The full read of every sheet corrected the tutorial's own inks: yellow #e7cf1b and green #1e854a
//                (Tint, Map Black To), a third blue #5046c9 for type; each pass prints in top to bottom in 15 frames;
//                the screen is a 7 px square lattice at 15 deg that re-rolls by jumping (a random offset inside one
//                pitch, up to 5 deg turn), on twos while things move, every 6 frames on a hold; misregistration in
//                that look is only 1-2 px.
//   DUJWPrqCYGX  halftones: dark is bigger, denser dots; the dots live on the artwork, so a camera push scales them
//                (11 px to 35 px on the sphere push); working screens 6-19 px at 45 deg (newsprint) or 15 deg (the
//                sphere and the final masthead); the colour newsprint zoom measured cyan 43, magenta 14, yellow 0 deg.
//                The dots themselves never animate.
//   DZdCD2YNk4d  edge boil: drawn lines are put on with Trim Paths, roughened, and displaced by noise whose seed
//                re-rolls. The Vox original boils on twos (a small change every 2 frames, a bigger one every 6), about
//                1 px mean and 3-4 px p90 at 1080 wide, nothing blurred.
//   kit/looks    Posterize: motion held on twos, each pose crisp.
//   textures     the user's own scans: the scanned halftone (soft-light finish), a graph-paper scan and a dust scan
//                (Texturelabs, used in videos, not redistributed: downscaled copies in the effect's public folder),
//                and the curved moire the user liked (tastes/explainer/textures/moire.png), offered as a strength.
//
// Rules every component follows:
//   - colour is ink, never light: every mark is one ink, multiplied over paper; two inks overlap to a darker third
//   - at most three inks in a frame; type in the blue (or green) ink, which carries text on any paper
//   - each ink pass sits 1-2 px off the others; 6-8 px only when the reel is about misregistration itself
//   - the screen re-rolls (jumps) every 2 frames while things move, every 6 on a hold; a photo's halftone dots stay put
//     on the picture and zoom with it
//   - drawn lines boil on twos, with a bigger jump every 6 frames
//   - motion on twos (Posterize), no motion blur, no depth of field: print is flat and sharp
//   - text is dark ink on paper; a light ink (yellow, pink) is only ever a box or a second pass behind dark type
//   - one text move at a time

export const INKS = {
  /** the tutorial's inks, read off its colour picker (DVd9Ls2gHWM full read: Tint, Map Black To) */
  green: '#1e854a',
  yellow: '#e7cf1b',
  /** the third pass, the type ink of the finished poster */
  blue: '#5046c9',
  /** the real riso print's palette strip (DVd9Ls2gHWM, f300) */
  olive: '#507f0f',
  lemon: '#e1da25',
  pink: '#de7488',
  /** a riso medium blue, for stories that need a true blue (Prussian blue, sea) */
  sea: '#2f56a6',
  /** a near-black blue-grey for small print */
  federal: '#2f3b5e',
  /** a warm red-orange, for one hot accent */
  orange: '#e8662e',
} as const;

export type InkName = keyof typeof INKS;

export const PAPER = {
  /** the finished poster's paper (k-means, f1166) and the flat pear demo's */
  pale: '#dbe1da',
  /** the palette strip's paper */
  white: '#eeeee9',
  /** the real riso print's cream */
  cream: '#e9e5da',
  /** the tutorial's mint paper */
  mint: '#d5e4d6',
  /** newsprint grey (DUJWPrqCYGX closing shot) */
  news: '#c9c7c0',
} as const;

export const FONTS = {
  /** heavy display grotesque for riso type */
  display: 'Bricolage Grotesque',
  displayWeight: 800,
  /** typewriter labels, as the tutorial's "FRESH & Natural" */
  mono: 'Space Mono',
  monoWeight: 700,
} as const;

/** Rates in frames. */
export const RATES = {
  /** the grain re-rolls every 2 frames (DVd9Ls2gHWM) */
  grain: 2,
  /** the texture on a hold: every 6 frames (4 a second at 24 fps) */
  hold: 6,
  /** each ink prints in top to bottom over 15 frames, on twos */
  sweep: 15,
  /** small boil every 2 frames, the bigger jump every 6 (DZdCD2YNk4d, the Vox original) */
  boilFine: 2,
  boilCoarse: 6,
  /** the hard-mix screen can ramp in coarse to fine: 2.6x the pitch down to 1x over 36 frames */
  pitchRamp: 36,
  /** Posterize step for motion */
  posterize: 2,
} as const;

/** Screens: pitch in px at 1080 wide, angles in degrees. */
export const SCREENS = {
  /** the finished riso poster's screen (DVd9Ls2gHWM: 6.9 px at 15 deg) */
  riso: { pitch: 7, angle: 15 },
  /** newsprint (DUJWPrqCYGX: 10 px at 45 deg) */
  news: { pitch: 10, angle: 45 },
  /** chunky (the sphere, 11-14 px at 15 deg) */
  chunky: { pitch: 13, angle: 15 },
  /** angles for a second and third ink, away from moire (DUJWPrqCYGX colour zoom: 43 / 14 / 0) */
  angles: [15, 75, 45, 0, 43, 14] as number[],
} as const;

/** Misregistration of a second / third pass in px at 1080 wide. The tutorial look is slight, 1-2 px (DVd9Ls2gHWM full
 *  read: 0-2 px between inks, 1-1.3 px fringe on the type) */
export const REGISTER: [number, number][] = [[0, 0], [2, -1], [-1, 2]];
/** A heavier real-print drift, for showing misregistration itself (the real riso macro: 6-8 px) */
export const REGISTER_HEAVY: [number, number][] = [[0, 0], [7, -5], [-5, 6]];
