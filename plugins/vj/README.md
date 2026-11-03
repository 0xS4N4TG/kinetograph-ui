# @kinetographdev/vj

TouchDesigner-style VJ effects for Kinetograph. So far, screens, tapes and sensors: the looks a picture takes on a CRT, a VHS tape, a 1-bit display, a thermal
camera or a depth pass; tracking overlays (boxes on every moving blob, or a reticle on one point); and `<PopArt>`, a
person cut to an anime poster. The looks and
the reticle come from the Kinetograph launch film (`kinetograph/examples/launch/looks.ts`, `print/captions.tsx`).

```tsx
import { Blobs, crt, oneBit, switchOff, thermal, vhs, type BlobTrack } from '@kinetographdev/vj';
import track from './track/clip-blobs.json' with { type: 'json' };

<Layer id="clip" effects={thermal()}><Video src={staticFile('clip.mp4')} width={1920} height={1080} fit="cover" muted /></Layer>
<Blobs track={track as BlobTrack} box="corners" links="chain" />
```

## Looks

Each returns layer effects (one effect or a list): put them in a `<Layer effects>`.

| Look | What it is | Main options |
|---|---|---|
| `crt(o)` | A colour tube: curved glass, rounded face, scanlines, aperture grille, misconvergence, breathing exposure, a rolling bar, static, dark corners | `cx`, `cy`, `hw`, `hh` (the face; default the whole layer), `curve`, `pitch`, `scan`, `grille`, `mask`, `conv`, `noise`, `glass`, `offx`, `offy` |
| `switchOff(t)` | The tube switching off over `t` 0..1: the picture folds to a line, the line to a dot | `crt({ ...switchOff(t) })` |
| `vhs(o)` | A worn tape: line wobble, late smeared colour, a head-switch tear along the bottom, a drifting tracking band, snow, dropouts | `jitter`, `wobble`, `trackAt` (0..1, animate it), `trackW`, `track`, `bleed`, `delay`, `sat`, `snow`, `drops` |
| `oneBit(o)` | One bit a pixel: an ordered dither in two inks | `size`, `punch`, `ink`, `paper` |
| `thermal(o)` | A thermal camera's palette on the picture's brightness, a little soft | `palette` (`IRON`, `RAINBOW` or your own stops), `soft` |
| `depthLook(o)` | A depth pass: smooth grey, near is white | `soft`, `punch` |
| `pixels(o)` | A magnifier: blocks, then red, green and blue subpixel stripes as `zoom` grows | `zoom`, `cx`, `cy` |

Brightness stands in for heat and for depth: these are looks, not measurements.

## Blob tracking

Two steps: track once, offline, then draw from the JSON on every frame.

```sh
node plugins/vj/tools/blobs.mjs --in public/clip.mp4 --out track/clip-blobs.json --debug out/blobs
```

- `--mode motion` (default) finds what moved since the last frame: people, hands, cars. `bright` and `dark` find
  regions above or below `--threshold` (lights, a subject on black).
- Tune with `--threshold`, `--min` (smallest blob, a fraction of the frame), `--max-area` (biggest blob, default
  0.25: drops the frame-wide regions of a cut or a flash), `--max`, `--grow` (joins the pieces of one thing), `--link`
  (how far a blob may move and keep its id), `--smooth`, `--keep`.
- `--debug` writes every 10th frame with its boxes. Look at them and adjust before you render.
- Needs only ffmpeg and ffprobe; runs anywhere Node does. A render never runs it, so frames stay pure.

`<Blobs track>` draws them, over the clip, the same size:

| Prop | What it does |
|---|---|
| `track` | The JSON from `blobs.mjs`. |
| `from` | The composition frame the clip starts on. The track is read by time, so a 24 fps clip in a 30 fps film lines up. |
| `box` | `frame`, `corners`, `cross` or `none`. |
| `label` | `id`, `xy` (centre, 0..1), `both` or `none`. |
| `links` | `nearest`, `chain` (id order), `all` (pairs within `reach` of the diagonal) or `none`. |
| `invert` | 0..1: the share of blobs filled solid in difference blending, inverting the picture under them. |
| `blend` | `difference` keeps the marks readable on white and black alike (a 1-bit picture). Default `normal`. |
| `min`, `max` | Leave out small blobs; keep the biggest few. |
| `color`, `stroke`, `fontSize`, `width`, `height`, `id` | Styling, size, layer id prefix. |

`blobsAt(track, frame, fps, width, height, from)` gives the blobs on a frame, to pin anything else to them.

## Point tracking

```sh
node plugins/vj/tools/track.mjs --in public/clip.mp4 --box 900,300,120,120 --out track/clip-point.json
```

Follows the patch in `--box` (x, y, w, h on the first frame, in `--size` pixels) by template matching. `<Reticle
track label="TRK 01" />` puts a ticked box on it; `pointAt(track, frame, fps)` gives the point.

## Halftone poster

A picture printed as a coarse screen of ink dots on a flat paper colour, the dots growing with how dark it is: the
screen-printed poster and two-colour flyer look.

`halftonePoster(o)` is the look on its own, layer effects like `oneBit`: one shader that reads the picture at the centre
of each cell of a turned grid and draws a dot covering as much of the cell as the picture is dark there.

```tsx
<Layer effects={halftonePoster({ ink: '#16124a', paper: '#ffb3c7', size: 8, punch: 1.6, bias: -0.2 })}>
  <Video src={staticFile('clip.mp4')} width={1920} height={1080} fit="cover" muted />
</Layer>
```

| Option | Default | What it does |
|---|---|---|
| `ink`, `paper` | `#1d3fd1`, `#f4d63a` | The dots' colour and the colour between them. `paper: 'transparent'` prints only the dots, to lay a second ink over another layer. |
| `size` | 10 | Cell width, px. |
| `angle` | 45 | Screen angle, degrees. |
| `punch` | 1.6 | Contrast before the screen. |
| `bias` | 0 | -0.5..0.5: more ink (positive) or less. |
| `shape` | `circle` | `circle`, `line` or `square`. |

The look is also a `vjLookSchema` kind (`halftone`), with its sliders, shape and inks in the panel.

`<HalftonePoster>` builds the whole poster from a clip and, optionally, the person's matte:

```tsx
<HalftonePoster src={staticFile('fred.mp4')} matte={staticFile('fred-matte.mp4')} offset={[-26, 14]}
  panels={[
    { x: [0, 0.42], ink: '#10284a', paper: '#efe6d2', ground: '#141414', shadow: '#2bb3a8' },
    { x: [0.42, 1], ink: '#4a0f1e', paper: '#f2a7b6', ground: '#d8322f', shadow: '#2b4bd6' },
  ]}
  title={{ text: 'halftone', size: 250, y: 0.8, over: true }} />
```

| Prop | What it does |
|---|---|
| `src`, `matte` | The clip and the person's matte (white = person, `tools/matte.mjs`). Without a matte the whole picture is printed. |
| `panels` | Side by side: `{ x: [from, to] (fractions of the width), ink, paper, ground, shadow }`. With a matte the person is printed `ink` on `paper` and the rest of the panel is flat `ground`. Default one panel, blue on yellow. |
| `changes` | `{ at, panels }`: another panel set from composition frame `at`, as posters flicking over. |
| `offset` | `[x, y]` px. With a matte, the person's silhouette in each panel's `shadow` colour that far off, behind them; without one, a second print in `shadow` ink multiplied over. |
| `backdrop` | With a matte: `flat` ground, or `dots` (the clip behind the person faintly in the panel's ink). |
| `title` | `{ text, color, font (default Anton), size, y, over, letterSpacing }`: big type behind the person, or over them with `over`. |
| `size`, `angle`, `punch`, `bias`, `shape` | The screen, as for `halftonePoster`. |
| `steps` | Drawings a second, the picture holding between them, so the dots read as printed. Default 12; 0 for every frame. |
| `width`, `height`, `rate`, `trimBefore`, `id` | Size (default the composition's), the clip's timing, a layer id prefix. |

## Fragments

`<Fragments>` is the "fragmented memories" collage: clips seen only through windows (the boxes a detector draws round
people and birds, with their names and a confidence figure; a few tiles of sky; a scatter of round holes), each clip
on its own plane at its own depth in a black space, and a camera flying through them so near pieces slide past faster
than far ones. The depth is projected by hand (scale and shift by 1 / depth), not by a 3D scene, so the camera can pass
through a piece and every frame stays a pure function of the props.

The boxes and names come from the agent editing the video, not from a model: `tools/blobs.mjs` finds what moves and
keeps an id on it, the agent looks at the ids and names them; still things the agent boxes itself and
`tools/track.mjs` follows. No model, no ONNX runtime, nothing to download.

```tsx
import { Fragments, type BlobTrack, type CameraKey, type Piece, type PointTrack } from '@kinetographdev/vj';
import smith from './track/blacksmith-blobs.json' with { type: 'json' };
import kid from './track/shops-kid.json' with { type: 'json' };

const pieces: Piece[] = [
  { src: staticFile('blacksmith.mp4'), at: [550, 200, 2.2], size: 0.8, rate: 0.6, loop: true,
    show: [{ boxes: smith as BlobTrack, labels: { 6: 'person', 12: 'person' }, only: true }] },
  { src: staticFile('shops.mp4'), width: 1440, height: 1080, at: [-350, 250, 1.4], size: 0.7,
    show: [{ spots: [{ label: 'person', box: [500, 740, 150, 340], track: kid as PointTrack }] }] },
  { src: staticFile('rocks.mp4'), width: 1440, height: 1080, at: [0, 0, 3.4], size: 1.1, from: 150,
    show: [{ tiles: [[280, 60, 560, 250], [840, 0, 380, 330]], stagger: 5 }] },
];
const camera: CameraKey[] = [{ frame: 0, z: 0 }, { frame: 120, x: 150, z: 1.3 }, { frame: 239, z: 2.6 }];

<AbsoluteFill style={{ background: '#000' }}><Fragments pieces={pieces} camera={camera} /></AbsoluteFill>
```

A piece:

| Field | What it does |
|---|---|
| `src`, `width`, `height` | The clip and its own size: the space its boxes, spots and tiles are in (default the boxes' track's, else 1920x1080). |
| `at` | `[x, y, z]`: the clip's centre in px from the frame's centre seen from depth 0, and its depth. At z 1 with the camera at 0 it shows at `size`. |
| `size` | The clip's scale on its plane. |
| `from`, `until` | Composition frames it is on screen; the clip starts at `from`. |
| `trimBefore`, `rate`, `loop` | The clip's timing. Most source clips are short: slow them and loop them. |
| `show` | What of the clip shows, joined: `'whole'`; `{ boxes, labels, only, min, max }` (a `blobs.mjs` track, named by id); `{ spots }` (boxes you place: `{ label, box: [x, y, w, h], track?, from?, to? }`, frames of the clip); `{ tiles, stagger }` (fixed rectangles opening one by one); `{ dots, radius, area, drift, seed }` (round holes, wandering by `drift` px). |
| `tags` | Outline the boxes and spots and give them name tags. Default true. |
| `pop` | Frames a box, tile or hole takes to open. Default 6. |

`<Fragments>` props: `pieces`; `camera` (`{ frame, x, y, z }` keys, eased, or a function of the frame; default a slow
push to z 0.5); `colors` (tag colour by name; the usual detector classes have their own, others get one from a set);
`fontSize` (tag text, clip px; tags scale with their piece); `fog` (how much a piece dims per unit of depth past 1);
`inspect` (see below); `id`. `cameraAt(keys, frame)` gives the camera on a frame.

**Naming and placing boxes.** `inspect={i}` shows piece `i` flat, whole and filling the frame at its clip's own frame,
every blob with `ID n`, every spot with its name and a grid in clip pixels (lines every 100, numbers every 200). Render
stills of it, name the ids in `labels`, read spot boxes off the grid. On a handheld shot motion blobs land on the
background, so use spots there, each followed by `tools/track.mjs` run on a patch inside it with `--size` set to the
clip's size. A spot that slides off the clip is cut at its edge and dropped when less than a third is left.

## Pop art

`<PopArt>` cuts footage of a person to an anime poster of them and back: the person flattened into anime tones,
painted in blue gradients with ink lines and yellow, orange and coral rim lines; behind them the clip as a halftone,
jagged rays from behind the chest, low-poly shapes flying out, flames round the body and a three-row title. Cuts in
spread as shards from a burst, cuts out break into slices. It is drawn at 12 drawings a second, like cel animation.

It needs the person's matte, made once per clip:

```sh
node plugins/vj/tools/matte.mjs --in public/clip.mp4 --out public/clip-matte.mp4 --track track/clip-person.json
```

`matte.mjs` runs `vj-matte` (Robust Video Matting, `matte/README.md`) when it is built, otherwise macOS Vision. A
4 s clip takes about 3 s.

```tsx
import { PopArt, type PointTrack } from '@kinetographdev/vj';
import person from './track/clip-person.json' with { type: 'json' };

<PopArt
  src={staticFile('clip.mp4')}
  matte={staticFile('clip-matte.mp4')}
  track={person as PointTrack}
  cuts={[{ in: [14, 28], out: [92, 112], origin: [700, 640] }]}
  title={{ kicker: 'KINETOSCOPE 1894', line1: 'FRED OTT', line2: 'SNEEZE' }}
/>
```

| Prop | What it does |
|---|---|
| `src`, `matte` | The clip and its matte (white = person). |
| `track` | The person's place on every frame, from `matte.mjs --track`. Without it the rays start mid-frame. |
| `cuts` | `{ in, out, origin }` in composition frames: the poster spreads in over `in`, holds, breaks up over `out`; the shards burst from `origin` (1920x1080 space). Without cuts the poster stays on. |
| `flash` | Frames that flash to a single yellow card. |
| `title` | `{ kicker, line1, line2 }`, or `null` for none. |
| `chest` | How far below the person's centre the rays and shapes start, px. Default 120. |
| `rate` | The clip's playback rate. |
| `seed`, `id` | The random seed for the shapes and flames; a layer id prefix, unique per `<PopArt>` on screen. |

Put it in a `<Sequence>` to start the clip later. The poster is drawn in a 1920x1080 space and scaled to cover.

## Studio panel

Two schemas carry the plugin's panel. Put them in a composition's schema and Studio's Props tab draws it:

```tsx
const schema = z.object({ look: vjLookSchema, marks: blobStyleSchema });
const Film = ({ look, marks }) => (
  <>
    <Layer id="film" effects={lookEffects(look)}><Video src={staticFile('clip.mp4')} width={1920} height={1080} fit="cover" muted /></Layer>
    <Blobs track={track} {...marks} />
  </>
);
```

- `look` (`vjLookSchema`): a card per look (none, CRT, VHS, 1-bit, thermal, depth, pixels) and the chosen look's
  sliders and colours. Each look keeps its own settings when you switch. On the preview, the CRT's tube face is a box
  to drag and resize, and the magnifier's centre a cross to drag. `lookEffects(look)` turns the value into effects.
- `marks` (`blobStyleSchema`): box, label, links and blend as segmented choices; most blobs, smallest, link reach,
  inverted share, line width, label size, colour. Spread it into `<Blobs>`.

The panel only sets props. Tracking stays a command (`tools/blobs.mjs`); a browser panel cannot run ffmpeg.
`templates/plugin-ui-demo` has a `VjLook` composition wired this way.

## Demo

`templates/vj-demo/`: blob tracking over a 1-bit picture and over a thermal camera, a CRT switching off, a VHS tape
and Fred Ott cut to a pop-art poster, on public-domain archive film; `fragments.tsx`, seven clips as detector-box
fragments with a camera flying through them; `halftone.tsx`, Fred Ott as three halftone posters and the look on the
parade.
