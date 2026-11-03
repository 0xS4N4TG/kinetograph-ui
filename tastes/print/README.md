# print

The risograph / halftone / screen-printed taste. Every mark on screen is ink: one colour per pass, multiplied over
paper, screened, a little off register, with a texture that jumps on twos. Pick it for a reel that should feel made by
hand on a press: histories of printed things, zines, posters, music and culture pieces, anything that wants warmth and
texture rather than gloss. Not for UI demos or glossy product work.

Built from three technique reels:

| Reel | What it gave |
|---|---|
| DVd9Ls2gHWM | ink passes: separation tinted to one ink, Multiply over paper, a halftone on Hard Mix at 50-63 %, slight offset, the screen re-rolled (a jump inside one pitch, up to 5 deg turn) every 2 frames while moving, every 6 on a hold; each pass prints in top to bottom in 15 frames; inks yellow #e7cf1b, green #1e854a, type blue #5046c9; palette-strip inks #507f0f / #e1da25 / #de7488 |
| DUJWPrqCYGX | photo halftone: dark = bigger dots, screen lives on the artwork and zooms with the camera, 6-19 px at 45 or 15 deg, CMY at 43 / 14 / 0 deg; scanned halftone as a texture with a strength |
| DZdCD2YNk4d | edge boil: trim draw-on, a roughened edge, noise re-seeded every 2 frames with a bigger change every 6 |

Plus kit/looks `Posterize` (motion on twos), the curved moire the user liked (`PrintFinish moire`), and the user's own
scans (halftone scan, Texturelabs graph paper and dust).

## Components

| | |
|---|---|
| `InkPass` | one riso drum. Children are art in page px (black shapes, text, a picture); a WGSL shader separates it (`weights`, `bias`, `lo`/`hi`/`gamma`), screens it (`pitch`, `angle`, `grain` dots vs stipple, `strength` = Hard Mix amount), jumps the screen every `roll` frames (`jitter`, `turn`), prints it in one `ink` at 0.9 opacity, Multiply. `offset` misregisters, `boil`/`rough` push the edges, `sweep` prints it in top to bottom, `window` clips it to a screen rect, `fade` |
| `PrintCamera`, `zoomAt`, `focus` | a camera over the page. Ink passes move their art and their screens with it, so dots zoom with a push. Layers stay full-frame |
| `PrintCadence` | how often the texture jumps inside: `RATES.grain` (2) while moving, `RATES.hold` (6) on a hold |
| `Paper` | paper colour, fibre grain re-rolled with the ink, optional graph-paper scan (`graph`), dust and scratches (`dust`) |
| `PrintFinish` | over everything: the scanned halftone in soft light (`scan`), the curved moire (`moire`, 0.04-0.12), a soft vignette |
| `Riso` | Paper + your passes + PrintFinish |
| `RisoPhoto` | a picture as 2-3 passes, each with a separation preset from `SEP` (`key`, `tone`, `blue`, `red`, `yellow`, `warm`), its own angle and register |
| `HalftonePhoto` | a picture as one ink on a hard dot screen (newsprint); dots never jump |
| `PhotoArt` | a picture placed in page px, cover-fit, for your own passes |
| `RisoType` | heavy display type (Bricolage Grotesque 800) or typewriter labels (Space Mono 700) in a dark key ink with a light second ink 3 px off; moves `register` (the second ink is pulled into register), `stamp`, `type`; one at a time |
| `Marker` | a light-ink box wiped in behind dark type |
| `BoilStroke` | a drawn line: trim draw-on and boil, printed in one ink; `loopPath`, `arrowPaths`, `cornerPath` (a kento L) |
| tokens | `INKS`, `PAPER`, `FONTS`, `RATES`, `SCREENS`, `REGISTER` (1-2 px), `REGISTER_HEAVY` (6-8 px) and the rules (tokens.ts) |

## Rules

- Colour is ink, never light: no glows, no gradients that are not tone in an ink.
- At most three inks in a frame. Type in blue / green / federal; yellow and pink only as boxes or second passes.
- Misregistration 1-2 px between passes; 6-8 px only when the picture is about misregistration.
- Screen jumps on twos while moving or printing in, every 6 frames on a hold. Photo dots never jump.
- Motion on twos (`Posterize step={2}` around the picture, sound outside it). No blur, no depth of field.
- One text move at a time.

## Usage

```tsx
import { Posterize } from '../../kit/looks/posterize.js';
import { Riso, PrintCamera, zoomAt, RisoPhoto, RisoType, BoilStroke, loopPath, PAPER } from '../../kit/print/index.js';

<Posterize step={2}>
  <Riso paper={{ color: PAPER.cream }} finish={{ moire: 0.05 }}>
    <PrintCamera cam={zoomAt(1 + 0.001 * f, 540, 1200)}>
      <RisoPhoto id="pic" src={staticFile('print.jpg')} box={{ x: 0, y: 800, w: 1080, h: 900 }}
        passes={[{ ink: 'sea', sep: 'blue' }, { ink: 'yellow', sep: 'yellow' }]} />
    </PrintCamera>
    <RisoType id="title" at={10} lines={[{ text: 'ONE INK', x: 0.07, y: 0.2, size: 0.13 }]} />
    <BoilStroke id="loop" d={loopPath(540, 1200, 300, 120)} at={40} />
  </Riso>
</Posterize>
```

The effect's `public/` needs `textures/` (paper-300.jpg, dust.jpg, halftone-scan.jpg, moire.png; see
tastes/print/demo/public/textures and its CREDITS.md: the Texturelabs files may be used in videos but not
redistributed) and `sfx/` (a link to tastes/print/sfx).

## Sound

`tools/sfx.py <dir>` (copied from tastes/vox and extended): press (a riso "ka-chunk"), roller (the drum turning), stamp,
plus marker, paper, type, whoosh, pop, tick and the rest. `tools/score.py <out.wav> --cues '{...}'`: a marimba and
pizzicato bed at 104 bpm in F major with a paper-feed shaker; a riser and a second of silence at `hit`. Rendered sounds
are in `sfx/`.

## Limits

- Hard Mix runs against the separation, not the full-colour art as in the tutorial (the full read says AE applied it to
  the colour art): the per-ink result is the same idea, but a pass never posterises to other hues.
- The screen and the stipple are procedural; the user's scanned halftone is used as a soft-light finish, not inside the
  Hard Mix (a shader reads only its own layer).
- The magnifier lens and the page curl of the riso reel are not here (kit/looks PageTurn exists for the curl).
- Each pass is a full-frame shader plus up to three displace passes: keep to about eight passes in a frame.
