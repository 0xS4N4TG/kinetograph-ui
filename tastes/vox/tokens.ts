// The vox taste: the documentary-explainer look read off four technique reels and the film finish of
// DZFqNzwAqVa. Not a copy of any outlet's brand: no logo, no wordmark, our own palette in the same spirit.
//
// Rules from the reels, kept here so every component follows them:
//   - one text animation at a time, so the viewer knows where to look (DLTLw1DpgwE)
//   - a colour system picked from a few strong references, and every photo tinted into it: whites to one colour,
//     blacks to another (DQpMiV_Cdpr)
//   - hide low-quality pictures under high-quality texture: a halftone or fine grain, a scanned magazine in overlay
//     (DQpMiV_Cdpr, DbJSUGZpvzL)
//   - maps: a clean map, desaturated, regions as flat colour in overlay, revealed by a burn, then texture and clouds
//     (DcTljpCgNNJ)
//   - slight colour misregistration on text and graphics (DbJSUGZpvzL)

export const VOX = {
  paper: '#f3efe4',
  grid: '#dcd6c6',
  ink: '#1f1e1b',
  charcoal: '#2b2a27',
  /** the accent that pops in, then settles to charcoal */
  yellow: '#ffe11a',
  coral: '#ec6a5e',
  teal: '#2f8a8a',
  cream: '#f6f0d8',
  /** map regions */
  plum: '#6d4f8c',
  moss: '#3f8a66',
  rust: '#cf6136',
  sea: '#4c7fae',
  night: '#141414',
} as const;

export const FONTS = {
  /** the italic serif of the reels' lead words ("typography", "Random Appearing Letters", "Animations") */
  serif: 'Playfair Display',
  /** the heavy wide grotesque of "FILL ANIMATION", "ODOMETER", "NUMBERS TOO" */
  caps: 'Archivo',
  /** labels and small print */
  sans: 'Inter',
} as const;
