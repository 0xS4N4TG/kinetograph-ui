// What a taste is. The explainer engine (stage.tsx, type.tsx, props.tsx) draws every reel of the family; a taste is the
// data that makes one reel look like its reference: colours and fonts, how the type writes on and fades, how objects
// enter and leave, how strong the shadows and glow are, what sits in the corners, how one beat hands over to the next.
//
// One taste per reference, in tastes/<name>.ts, with a row in TASTES.md. Its numbers come from the kinetograph-taste-clone
// skill's measured spec or gene of that reference (`meta.source` names it). A number nobody has measured yet is
// inherited from `BASE` (measured from pin 1119) and the taste says so with `meta.measured: false`.
//
// Lengths are fractions of the frame width W (or height H where named), times are frames at 30 fps.

export interface TasteMeta {
  /** the file name and the key in TASTES */
  id: string;
  title: string;
  /** one line an agent reads to choose: the subject and tone this taste suits */
  useWhen: string;
  /** where its numbers come from: a reference pin id, or 'original' for one made for this kit */
  source: string;
  /** every number below read off the reference frame by frame (false: some are inherited from BASE) */
  measured: boolean;
  /** a rendered still or reel of the taste, relative to the repo root */
  preview?: string;
  /** its reference's beat layouts (layouts.tsx), in the order the reference uses them */
  layouts?: string[];
}

/** A letter of the lead on its first frames after landing: scale, lift in em, turn in degrees. */
export interface Hop { s: number; y: number; r: number }

export interface TasteText {
  /** how the lead arrives: letter by letter with the hop (1119), or word by word, fading up out of a blur over `fade`
   *  frames and moving along `leadBob` (em, down positive, a frame each; 971: up from below, past, back) */
  leadMode: 'letters' | 'words';
  leadBob: number[];
  /** the lead's size, letter spacing (em) and letters a frame by default */
  leadSize: number;
  leadTracking: number;
  leadRate: number;
  /** the pose of each letter on its first frames; after the last it is upright */
  hop: Hop[];
  /** the keyword: letter spacing (em), the gap between words (em), line height */
  keyTracking: number;
  keyGap: number;
  keyLineHeight: number;
  /** each keyword word fades up over `fade` frames out of a blur of `blur` W */
  fade: number;
  blur: number;
  /** words pop in whole by default instead of fading */
  pop: boolean;
  /** a word's opacity on its first frame (933: 0.3), and how far below its line it starts (em) and the share of that
   *  kept a frame as it rises (933: 0.3 em, 0.75); 0 for no rise */
  fadeFrom: number;
  rise: number;
  riseKeep: number;
  /** a spring bob as a word lands: its offset in em (down positive) on each frame from its start; empty for none.
   *  `bobLag` frames later for each accent-coloured word, `bobGain` times bigger */
  bob: number[];
  bobLag: number;
  bobGain: number;
}

export interface TasteMotion {
  /** entrances: the share of the distance left kept each frame (a rise from the bottom, a slide from a side) */
  riseKeep: number;
  slideKeep: number;
  /** a risen object creeps this much bigger over the 20 frames after it lands */
  riseCreep: number;
  /** a push exit: k (W per frame squared) for the lead, the keyword and the object, and the frames each starts after the push */
  push: [number, number, number];
  pushLag: [number, number, number];
  /** a dissolve wave: the front's speed (W a frame) and the frames a letter takes to fade once reached */
  waveSpeed: number;
  waveFade: number;
  /** a sprung entrance (`enter="spring"`): the object's scale on each frame from its start, then 1 */
  spring: number[];
}

/** The camera: moves of the whole beat about the frame centre. Numbers measured off pins 933 and 971 (BASE). */
export interface TasteCamera {
  /** a push-in: scale 1 + amount (1 - keep^n) + drift n */
  pushAmount: number;
  pushKeep: number;
  pushDrift: number;
  /** a pan between scenes: pure translation by the gap; speed ramps up over `panRise` frames (((n + 1) / (rise + 1))^1.5), then
   *  keeps `panKeep` of itself each frame */
  panRise: number;
  panKeep: number;
  /** a roll in: from `rollFrom` degrees, keeping `rollKeep` each frame; a roll out: a n + b n^2 degrees */
  rollFrom: number;
  rollKeep: number;
  rollOut: [number, number];
  /** arrival focus: blur (W) on the first frame of a move, sharp after `arriveFrames` (linear) */
  arriveBlur: number;
  arriveFrames: number;
  /** a zoom-out exit: the scale on each frame; the scene fades to paper from `zoomFade[0]` to `zoomFade[1]` frames */
  zoomOut: number[];
  zoomFade: [number, number];
  /** a flicker exit: brightness on each frame */
  flicker: number[];
}

export interface TasteLight {
  /** the cast shadow: strength, offset (W, H) and blur. The offset's sign is the light's side: down-left for a top-right
   *  light (1119), down-right for a top-left one (933, 971); corner shapes and ground bands follow it */
  castAlpha: number;
  castOffset: [number, number];
  castBlur: number;
  /** the ground band under an object on the floor: strength at the contact */
  groundAlpha: number;
  /** a corner shape's own shadow: strength, offset and blur, in W */
  shapeAlpha: number;
  shapeOffset: number;
  shapeBlur: number;
  /** the bloom of type on dark beats: tight and wide halo radii (em) and a strength multiplier */
  glowTight: number;
  glowWide: number;
  glowStrength: number;
}

/** The corner shapes. `needle` is measured (pin 1119); the others are drawn for tastes of their own. */
export type CornerKind = 'needle' | 'sparkle' | 'asterisk' | 'dot' | 'ring' | 'plus' | 'none';

export interface TasteShapes {
  /** the shape on paper beats and on dark beats */
  corner: CornerKind;
  cornerOnDark: CornerKind;
  /** a shape grows in keeping this share of the length still to grow each frame, then breathes this much */
  grow: number;
  breathe: number;
  /** the small print under an object */
  smallPrint: 'barcode' | 'none';
}

/** How one beat hands over to the next when it does not just cut. */
export type WipeKind = 'circle' | 'blinds' | 'cut';

export interface TasteTransition {
  wipe: WipeKind;
  /** circle: radius growth in W a frame; blinds: frames for each band to close */
  speed: number;
  /** blinds: how many bands */
  bands: number;
  /** circle: the radius (W) on each frame instead of a constant speed, an eased iris; empty for linear */
  radii: number[];
}

/** Textures laid over the finished frame, type included, each an opacity (0 for none): paper fibre (multiply, on the
 *  paper), ink wear (pale flecks breaking up dark type and objects), film grain (dark and light specks, moving), a
 *  scanned halftone screen over everything (hard-light), a procedural halftone dot screen (multiply). Original procedural files in textures/ (tools/textures.py). Not measured: the references are near clean
 *  (971 grain about 1 luma), so these are a choice of the taste, for a printed, filmed feel. */
export interface TasteTexture {
  paper: number;
  ink: number;
  grain: number;
  /** a real scanned halftone screen over everything (hard-light): textures/scans/scan-halftone.jpg */
  scan: number;
  /** curved moire bands over everything, drifting (textures/moire.png) */
  moire: number;
  halftone: number;
}

export interface ExplainerTaste {
  name: string;
  meta: TasteMeta;
  /** the paper, and the dark interlude beats */
  paper: string;
  dark: string;
  /** a vignette on the paper, 0..1 */
  vignette: number;
  /** graph paper behind everything */
  grid: boolean;
  /** the grid's cell (W), line colour and strength */
  gridCell?: number;
  gridInk?: string;
  gridStrength?: number;
  /** the small lead line, on paper and on dark */
  ink: string;
  inkOnDark: string;
  /** the keyword; `keywordOnDark` is its lifted core on dark beats, where it blooms */
  keyword: string;
  keywordOnDark: string;
  /** how the accent shows: the keyword's own colour, or a highlighter behind black type */
  accentMode: 'ink' | 'highlight';
  /** the colour of a keyword line marked `plain` (default the lead's ink; 1061 sets its grey second lines) */
  muted?: string;
  /** the weight of plain words (default the keyword's; 933 sets its small words' 600 beside the 900 accent) */
  mutedWeight?: number;
  highlight: string;
  font: string;
  /** the lead's own family and slant when it differs from the keyword's (971: a condensed face, upright) */
  leadFont?: string;
  leadItalic?: boolean;
  leadWeight: number;
  keyWeight: number;
  italic: boolean;
  /** corner shapes' colour on paper and on dark beats (null for none) */
  star: string | null;
  starOnDark: string | null;
  text: TasteText;
  motion: TasteMotion;
  light: TasteLight;
  shapes: TasteShapes;
  transition: TasteTransition;
  camera: TasteCamera;
  texture: TasteTexture;
}

/** The measured numbers of pin 1119: what a taste inherits for anything its own reference has not measured. */
export const BASE: Pick<ExplainerTaste, 'text' | 'motion' | 'light' | 'shapes' | 'transition' | 'camera' | 'texture'> = {
  texture: { paper: 0, ink: 0, grain: 0, scan: 0, moire: 0, halftone: 0 },
  text: {
    leadMode: 'letters', leadBob: [],
    leadSize: 0.038, leadTracking: -0.01, leadRate: 1,
    hop: [{ s: 0.7, y: 0.4, r: -10 }, { s: 0.8, y: 0.25, r: -6 }, { s: 0.9, y: 0.1, r: -3 }],
    keyTracking: -0.04, keyGap: 0.24, keyLineHeight: 1,
    fade: 8, blur: 10 / 720, pop: false, fadeFrom: 0, rise: 0, riseKeep: 0.75,
    // no bob in pin 1119; pin 933's measured bob (B12 "DM", cap 57 px at 720) when a taste turns it on
    bob: [], bobLag: 2, bobGain: 1.4,
  },
  motion: { riseKeep: 0.88, slideKeep: 0.86, riseCreep: 0.03, push: [0.005, 0.0027, 0.01], pushLag: [0, 1, 4], waveSpeed: 0.046, waveFade: 3,
    // pin 933 B7: the wordmark's spring, overshoot +11.6% at +4, undershoot -4.3% at +10, rest by +22
    spring: [0.31, 0.665, 0.993, 1.076, 1.116, 1.116, 1.09, 1.04, 1.0, 0.98, 0.957, 0.96, 0.965, 0.97, 0.975, 0.98, 0.985, 0.99, 0.993, 0.996, 0.998, 1] },
  light: {
    castAlpha: 0.4, castOffset: [-0.015, 0.012], castBlur: 0.025, groundAlpha: 0.55,
    shapeAlpha: 0.38, shapeOffset: 9 / 720, shapeBlur: 10 / 720,
    glowTight: 0.06, glowWide: 0.3, glowStrength: 1,
  },
  shapes: { corner: 'needle', cornerOnDark: 'needle', grow: 0.75, breathe: 0.1, smallPrint: 'none' },
  transition: { wipe: 'circle', speed: 0.115, bands: 6, radii: [] },
  camera: {
    // pin 933 B1: 1.00 to 1.70 in 35 frames, fitted within 0.033 of scale on every measured frame
    pushAmount: 0.4, pushKeep: 0.78, pushDrift: 0.008,
    // pin 971: peak 132-140 px a frame at 720 after 4 frames, then 0.88 a frame
    panRise: 4, panKeep: 0.88,
    // pin 933 B5 (-65 deg, 0.895) and B4's exit (2.5, 7, 10.9, 16.3, 22.6, 28 deg)
    rollFrom: -65, rollKeep: 0.895, rollOut: [2.94, 0.344],
    // pin 971 S2: sigma 14 px at 720 to sharp over 14 frames
    arriveBlur: 14 / 720, arriveFrames: 14,
    // pin 971 S2 exit
    zoomOut: [1, 0.985, 0.97, 0.92, 0.867, 0.82, 0.76, 0.7, 0.67, 0.655, 0.64, 0.62, 0.6, 0.58, 0.565, 0.55], zoomFade: [6, 18],
    // pin 933 B1 exit
    flicker: [1, 0.51, 0.01, 0.5, 1, 0.49],
  },
};

type Section = 'text' | 'motion' | 'light' | 'shapes' | 'transition' | 'camera' | 'texture';
export type TasteInput = Omit<ExplainerTaste, Section | 'name'> & { [K in Section]?: Partial<ExplainerTaste[K]> };

/** A taste from its own numbers, each section filled in from BASE where the reference has not set it. */
export const defineTaste = (t: TasteInput): ExplainerTaste => ({
  ...t,
  name: t.meta.id,
  text: { ...BASE.text, ...t.text },
  motion: { ...BASE.motion, ...t.motion },
  light: { ...BASE.light, ...t.light },
  shapes: { ...BASE.shapes, ...t.shapes },
  transition: { ...BASE.transition, ...t.transition },
  camera: { ...BASE.camera, ...t.camera },
  texture: { ...BASE.texture, ...t.texture },
});
