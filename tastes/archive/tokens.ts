// The archive taste: historical photographs brought to life, the old-film documentary look. Read off six technique
// reels; every number below is from those measurements.
//
// Rules, and the reel each comes from:
//   - a still photo becomes a shot: cut it into foreground, subject and background, fill the hole behind the subject,
//     and slide a camera so the layers move 3 : 1 : 0.6, the foreground out of focus, the move on twos
//     (DZsDDmvtNJP; kit/looks Parallax)
//   - it sits in a projector gate: a new position every 2nd frame, std about 1.1 px x / 1.7 px y at 1080 wide, and an
//     exposure flicker of about 0.024 stops every frame (Da3YpRipHuF; GateWeave, Flicker)
//   - light falls across it: a window-light plate multiplied at about 0.53 in its shadows, drifting slowly, and film
//     dust screened on top (DdKZ5oBpPCW; WindowLight, Dust)
//   - the documentary finish: a radial lens blur at the edges (not chromatic aberration), film dust, an offset vignette
//     twice as dark at the bottom, a slow push of about 0.2% a frame (DZFqNzwAqVa; EdgeBlur, Dust, Vignette)
//   - cut between two pictures on the fastest frame of one shared scale move, cubic-bezier(0.97, 0, 0.03, 1), on twos
//     (DaDhDFjAysT; CurveCut, Posterize 2)
//   - documents turn like paper (CC Page Turn, Fold Radius 50, back opacity 0.85) and the turn is posterized to
//     8 fps, hand-animated (Dafr0KjAkve; PageTurn, Posterize 3 at 24 fps, 4 at 30 fps)
//
// What the taste adds of its own: the photo printed as the process it was made with (a silvery daguerreotype plate, a
// warm albumen print, a salted paper print) with film grain; type that reads like a museum's archive (a book serif for
// what is said, a typewriter for dates, places and catalogue labels); and layouts made from the objects themselves (a
// plate in its brass mat, a page of an album, a catalogue tag).
//
// Legibility rules: light type only ever over the dark falloff of the vignette or a dark scrim; on paper (album page,
// tag) the type is dark ink. One text animation at a time.

export const ARCHIVE = {
  /** the dark around everything: soot, a warm black */
  soot: '#0d0b09',
  umber: '#241b14',
  /** velvet of a daguerreotype case */
  velvet: '#2b1416',
  /** brass of the mat */
  brass: '#b48c4c',
  brassDark: '#6e5226',
  /** type on dark: an off-white silver, never pure white */
  silver: '#eee6d6',
  /** a dimmer line on dark */
  ash: '#b9ae9a',
  /** album page and catalogue tag */
  paper: '#e8dfc9',
  paperDark: '#cdbf9f',
  /** ink on paper */
  ink: '#1c1611',
  /** the one accent: an accession-stamp oxblood red */
  stamp: '#9a2d20',
} as const;

/** Tones the photo is printed in: [shadow, highlight], blacks mapped to the first, whites to the second. */
export const PROCESS = {
  /** a silvered copper plate: near-neutral, a cool cast in the shadows, bright mirror highlights */
  daguerreotype: { dark: '#14130f', light: '#efe9dc', lo: 0.06, hi: 0.94, gamma: 0.95, grain: 0.05 },
  /** albumen print from a glass negative: warm brown-purple shadows, cream highlights */
  albumen: { dark: '#2a160d', light: '#f2e2c0', lo: 0.05, hi: 0.95, gamma: 1.0, grain: 0.06 },
  /** salted paper print from a paper negative: soft, matte, red-brown, low contrast */
  salted: { dark: '#3b2014', light: '#ead8b8', lo: 0.0, hi: 1.0, gamma: 1.1, grain: 0.08 },
  /** plain silver gelatin black and white */
  silver: { dark: '#0f0f0e', light: '#f1efe8', lo: 0.04, hi: 0.96, gamma: 1.0, grain: 0.06 },
} as const;
export type Process = keyof typeof PROCESS;

export const FONTS = {
  /** what is said: a book serif, roman and italic */
  serif: 'EB Garamond',
  /** dates, places, catalogue labels: a typewriter */
  type: 'Courier Prime',
} as const;

/** Frame steps: the parallax and curve-cut moves are on twos (12 fps from 24 / 15 from 30); page turns at 8 fps. */
export const STEP = { twos: 2, page: 4 } as const;
