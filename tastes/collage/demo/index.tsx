// The first 3.16 s of a vox-style paper collage, timed to a measured reference. An old map punches out with a
// zoom blur onto a newspaper page; torn yellow labels type on; a factory and a man in round glasses slide in; the
// camera racks focus, then dollies in so the labels fly off past the lens; a torn black strip types a line in white
// with a colour split; a script word fades in; a small pull-back. Every layer scales about the screen centre on its
// own curve (parallax). 12 images a second on twos, with the 24-into-25 holds at f12, f37 and f60. One static
// dither screen over everything. Our own words,
// masthead and pictures (public/CREDITS.md).
//
// The demo reel of the collage taste (tastes/collage): every piece here comes from the kit; this file holds only
// the reel's choreography (the measured curves) and its pictures.
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/collage/demo/index.tsx -o tastes/collage/demo/out/collage-intro.mp4
import React from 'react';
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Depth, Dither, GridOverlay, Highlighter, MapPunch, PrintedPage, TornLabel, TornStrip, boxAt, heldImage, imageStarts, tab, type Box4, type LabelSize } from '../index.js';

const W = 1080, H = 1920;

const STARTS = imageStarts(78);
const img = (f: number) => heldImage(STARTS, f);

/* ---------- measured curves (section 2 of the spec) ---------- */

const NEWS_S: [number, number][] = [[0, 0.5], [2, 0.555], [4, 0.595], [6, 0.62], [8, 0.635], [10, 0.645], [15, 0.655], [19, 0.655], [21, 0.675], [23, 0.675], [25, 0.695], [27, 0.685], [29, 0.72], [31, 0.745], [33, 0.785], [35, 0.835], [37, 0.88], [40, 0.915], [42, 0.94], [44, 0.96], [46, 0.975], [48, 0.985], [50, 0.99], [52, 0.995], [56, 0.995], [58, 1], [71, 1], [73, 0.995], [75, 0.99], [77, 0.975]];
const NEWS_B: [number, number][] = [[2, 10], [4, 6], [6, 8], [10, 8], [15, 10], [19, 10], [21, 12], [23, 16], [25, 20], [27, 16], [29, 12], [31, 10], [33, 8], [35, 6], [37, 4], [40, 2], [42, 2], [44, 1], [54, 1], [58, 0], [69, 0], [71, 1], [77, 1]];
const MAN_S: [number, number][] = [[8, 0.5], [15, 0.505], [17, 0.5125], [19, 0.505], [23, 0.505], [25, 0.5125], [27, 0.5425], [29, 0.5525], [31, 0.585], [33, 0.65], [35, 0.73], [37, 0.7925], [40, 0.845], [42, 0.89], [44, 0.9275], [46, 0.955], [48, 0.975], [50, 0.9875], [52, 0.9925], [54, 0.995], [56, 0.9975], [58, 1], [63, 1], [65, 1.0025], [69, 1.005], [71, 1.005], [73, 0.9975], [75, 0.99], [77, 0.955]];
const MAN_X: [number, number][] = [[8, -0.8], [10, -0.55], [13, -0.35], [15, -0.244], [17, -0.177], [19, -0.125], [21, -0.083], [23, -0.053], [25, -0.034], [27, -0.021], [29, -0.007], [31, -0.002], [33, 0]];
const MAN_B: [number, number][] = [[8, 10], [15, 10], [17, 12], [19, 10], [21, 10], [23, 14], [25, 16], [27, 14], [29, 10], [31, 6], [33, 6], [35, 4], [48, 3.5], [50, 3], [54, 2], [58, 0], [63, 0], [69, 2], [73, 4], [75, 6], [77, 6]];
/** the factory's ledge rises before the push, beyond its scale (fractions of H) */
const FAC_DY: [number, number][] = [[6, 0.13], [10, 0.1], [12, 0.07], [15, 0.048], [17, 0.034], [19, 0.024], [21, 0.011], [23, 0.004], [27, -0.02], [29, -0.022], [31, 0]];
const REFL: [number, number][] = [[6, 0], [8, 0.4], [10, 1], [12, 1], [15, 0.75], [17, 0.55], [19, 0.42], [21, 0.12], [27, 0.05], [29, 0]];
const STRIP_S: [number, number][] = [[35, 0.5], [37, 0.566], [40, 0.636], [42, 0.719], [44, 0.794], [46, 0.842], [48, 0.897], [50, 0.938], [52, 0.959], [54, 0.969], [56, 0.974], [58, 0.986], [63, 0.995], [65, 1], [69, 1], [71, 0.988], [73, 0.969], [75, 0.938], [77, 0.865]];
const STRIP_B: [number, number][] = [[35, 4], [37, 3], [40, 3], [42, 1.5], [44, 0], [73, 0], [75, 2], [77, 3]];
const LABEL_B: [number, number][] = [[29, 0], [31, 2], [33, 6], [35, 12], [37, 20], [40, 26]];

const LABELS: { text: string; seed: string; size: LabelSize; box: [number, Box4][]; typed: [number, number][] }[] = [
  { text: 'READ', seed: 'l1', size: 'short', typed: [[4, 2], [6, 3], [8, 4]],
    box: [[4, [0.222, 0.39, 0.348, 0.432]], [6, [0.193, 0.386, 0.4, 0.435]], [8, [0.163, 0.385, 0.398, 0.436]], [10, [0.141, 0.384, 0.391, 0.436]], [12, [0.133, 0.383, 0.389, 0.436]], [15, [0.13, 0.38, 0.387, 0.436]], [17, [0.126, 0.378, 0.391, 0.435]], [19, [0.12, 0.378, 0.389, 0.435]], [21, [0.111, 0.375, 0.389, 0.433]], [23, [0.1, 0.37, 0.38, 0.432]], [25, [0.083, 0.364, 0.374, 0.429]], [27, [0.059, 0.355, 0.369, 0.425]], [29, [0.026, 0.345, 0.352, 0.418]], [31, [-0.04, 0.323, 0.324, 0.404]], [33, [-0.203, 0.272, 0.285, 0.378]], [35, [-0.35, 0.224, 0.24, 0.353]], [37, [-0.683, 0.116, 0.137, 0.296]]] },
  { text: 'ALL OF', seed: 'l2', size: 'mid', typed: [[6, 3.35], [8, 5.4], [10, 7]],
    box: [[6, [0.554, 0.454, 0.75, 0.505]], [8, [0.554, 0.455, 0.848, 0.51]], [10, [0.554, 0.456, 0.865, 0.514]], [12, [0.554, 0.456, 0.874, 0.516]], [15, [0.554, 0.456, 0.88, 0.518]], [17, [0.554, 0.456, 0.889, 0.518]], [19, [0.554, 0.456, 0.891, 0.517]], [21, [0.554, 0.455, 0.902, 0.518]], [23, [0.554, 0.454, 0.913, 0.518]], [25, [0.559, 0.452, 0.93, 0.519]], [27, [0.563, 0.45, 0.954, 0.52]], [29, [0.57, 0.447, 0.991, 0.521]], [31, [0.58, 0.44, 1.07, 0.523]], [33, [0.598, 0.441, 1.222, 0.524]], [35, [0.624, 0.369, 1.374, 0.512]], [37, [0.674, 0.3, 1.71, 0.5]]] },
  { text: 'YESTERDAY', seed: 'l3', size: 'long', typed: [[10, 2], [12, 5], [15, 8.4], [17, 9]],
    box: [[10, [0.211, 0.557, 0.243, 0.607]], [12, [0.211, 0.553, 0.615, 0.611]], [15, [0.206, 0.555, 0.694, 0.613]], [17, [0.204, 0.556, 0.702, 0.614]], [19, [0.198, 0.556, 0.704, 0.615]], [21, [0.193, 0.558, 0.711, 0.616]], [23, [0.183, 0.559, 0.719, 0.621]], [25, [0.17, 0.564, 0.728, 0.627]], [27, [0.15, 0.566, 0.741, 0.635]], [29, [0.122, 0.575, 0.759, 0.649]], [31, [0.063, 0.589, 0.804, 0.67]], [33, [-0.03, 0.609, 0.894, 0.718]], [35, [-0.14, 0.658, 1.12, 0.794]], [37, [-0.44, 0.707, 1.12, 0.893]], [40, [-0.75, 0.76, 1.3, 1.02]]] },
];
const EYE: [number, Box4][] = [[10, [0, 0.381, 0.135, 0.425]], [12, [0.081, 0.376, 0.161, 0.405]], [21, [0.376, 0.375, 0.561, 0.426]], [27, [0.407, 0.366, 0.644, 0.421]], [29, [0.433, 0.358, 0.665, 0.416]], [31, [0.48, 0.356, 0.683, 0.416]], [33, [0.543, 0.352, 0.709, 0.407]], [35, [0.596, 0.347, 0.733, 0.396]], [37, [0.65, 0.331, 0.757, 0.386]], [40, [0.693, 0.318, 0.772, 0.377]], [42, [0.728, 0.308, 0.791, 0.369]], [44, [0.752, 0.304, 0.8, 0.361]], [46, [0.748, 0.3, 0.811, 0.36]], [50, [0.76, 0.3, 0.8, 0.355]]];
/** type on the strip: characters shown per image (fraction = the newest letter's opacity) */
const STRIP_TYPED: [number, number][] = [[35, 2], [37, 4], [40, 6], [42, 7.5], [44, 9.5], [46, 11], [48, 12.5], [50, 14.5], [52, 15.5], [54, 16.8], [56, 17]];
const SEE: [number, number][] = [[61, 0], [62, 0.35], [63, 0.69], [64, 1], [72, 1], [73, 0.89], [74, 0.74], [75, 0.62], [76, 0.63], [77, 0.7]];

/* ---------- this reel's pictures ---------- */

/** the factory: brick tinted peach-orange, a chimney at its left end, a mirrored grey copy below its ledge early on */
const Factory: React.FC<{ t: number }> = ({ t }) => {
  if (t < 6) return null;
  const s = t < 31 ? 0.505 : tab(MAN_S, t);
  const r = tab(REFL, t);
  const ledge = 0.806 * H;
  // the mill, mirrored so its chimney stands at the left end (x 0.20 W at scale 1), its base on the ledge
  const box = { left: -1170, top: ledge - 2095, width: 5200, height: 2095 };
  return (
    <Depth s={s} b={tab(MAN_B, t)} dy={tab(FAC_DY, t)}>
      <img src={staticFile('factory-1-amana-woolen-mill.png')} style={{ position: 'absolute', ...box, transform: 'scaleX(-1)', filter: 'sepia(1) saturate(3.2) hue-rotate(-28deg) brightness(1.05) contrast(1.15)' }} />
      <div style={{ position: 'absolute', left: box.left, top: ledge - 6, width: box.width, height: 12, background: '#6e4a2e' }} />
      {r > 0.01 && (
        <img src={staticFile('factory-1-amana-woolen-mill.png')} style={{ position: 'absolute', ...box, top: ledge + 6, transform: `scale(-1, ${(-r).toFixed(3)})`, transformOrigin: '50% 0%', filter: 'grayscale(1) brightness(0.85) contrast(0.8) hue-rotate(200deg) sepia(0.05)', opacity: 0.85 }} />
      )}
    </Depth>
  );
};

const Man: React.FC<{ t: number }> = ({ t }) => {
  if (t < 8) return null;
  return (
    <Depth s={tab(MAN_S, t)} b={tab(MAN_B, t)} dx={tab(MAN_X, t)}>
      <img src={staticFile('man-1-schamberg-herbert-1912.png')} style={{ position: 'absolute', left: -150, top: 0.156 * H, width: 1000, height: 1389, filter: 'grayscale(1) sepia(0.15) contrast(1.45) brightness(0.78)' }} />
      {t >= 33 && <GridOverlay opacity={t >= 35 ? 1 : 0.2} />}
    </Depth>
  );
};

const LINE1 = 'IT MOVES', LINE2 = 'LIKE FILM';

const Reel: React.FC = () => {
  const f = useCurrentFrame();
  const t = img(f);
  return (
    <AbsoluteFill style={{ background: '#dcc9b3' }}>
      <Depth s={tab(NEWS_S, t)} b={tab(NEWS_B, t)}>
        <PrintedPage copy={{ masthead: 'The Evening Ledger.', dateline: ['VOL. XXII. NO. 118.', 'RIVERTON, SATURDAY EVENING, MARCH 4.', 'PRICE TWO CENTS.'], headlines: ['MILLS REOPEN AS RIVER WORKS', 'RESUME, CROWDS FILL THE PIER'], subhead: 'FIRST CROSSING DRAWS THOUSANDS' }}
          photo={staticFile('factory-2-blissfield-sugar-factory.png')} />
      </Depth>
      <MapPunch t={t} src={staticFile('map-1-philips-london-1905-west.jpg')} />
      <Factory t={t} />
      <Man t={t} />
      {t >= 10 && t < 52 && <Highlighter box={boxAt(EYE, t)} opacity={tab([[10, 1], [44, 1], [50, 0.2], [52, 0]], t)} />}
      {LABELS.map((l) => (t >= l.box[0]![0] && t <= l.box[l.box.length - 1]![0] + 1
        ? <TornLabel key={l.seed} id={l.seed} text={l.text} size={l.size} box={boxAt(l.box, t)} typed={tab(l.typed, t)} blur={tab(LABEL_B, t)} />
        : null))}
      {t >= 35 && (
        <TornStrip lines={[LINE1, LINE2]} s={tab(STRIP_S, t)} typed={tab(STRIP_TYPED, t)} blur={tab(STRIP_B, t)}
          script={f >= 62 ? { text: 'see?', opacity: tab(SEE, f), blur: f >= 75 ? 2.5 : 0 } : undefined} />
      )}
      {/* the one static dither screen over everything */}
      <Dither />
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="CollageIntro" component={Reel} durationInFrames={78} fps={25} width={1080} height={1920} />);
