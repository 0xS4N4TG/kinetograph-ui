# @kinetographdev/paper

Paper for Kinetograph: one material (sheets, creases, scans, grain, paper sounds) and effects made of it: a text match
cut, a photo as a paper cut-out, the cut-out unfolding, and Scrapline, a hand-drawn border on torn paper. The rest of the paper toolkit is planned below.

## `<MatchCut>`

A keyword holds still, highlighted, while the page under it changes several times a second.

```tsx
import { MatchCut, flicks } from '@kinetographdev/paper';

flicks({ frames: 150, fps: 30, cutsPerSecond: 10 }); // a paper flick on every cut (module top level)

<MatchCut keyword="Super Bowl" preset="web" />
<MatchCut keyword="Super Bowl" preset="broadsheet" look={{ zoom: 1.2, highlight: '#ffd400' }} />
<MatchCut keyword="Super Bowl" screenshots={[{ src: 'shots/a.png', hint: [212, 1180, 388, 64] }]} everyNth={2} />
```

- **Made-up pages** by default: seven layouts (serif pull quote, italic headline, kicker line, body copy, web article
  with nav and subscribe button, blog post with an author row, display headline). Mastheads, authors and copy are
  invented, so no page passes for a real outlet's.
- **App screens** (`src/social.ts`), on request in `layouts`: `tweet` (a post feed or thread: avatar, name, badge,
  handle and time, text, sometimes a link or a video card with its time pill, the reply/repost/like/views row with
  bookmark and share), `reddit` (back button, community and poster, bold title, flair pill, paragraphs, vote, comment,
  crosspost and share pills, then comments), `comments` (a nested thread: avatars, OP tags, links, vote/Reply/Award/
  Share rows, thread lines with collapse marks and curved reply connectors). Light or dark mode per page, the apps'
  proportions at 2x, Inter, plain line icons; no logos, and invented accounts and copy. A screen page keeps its own
  background whatever `tint` says, and is never crumpled.
- **Screen** (`screen` 0..1, `pixel`, `curve`): the page filmed off a monitor (`screen` in `src/look.tsx`). Each
  `pixel`-px cell shows its colour as three soft RGB stripes with a dark gap between rows; a lens barrel (`curve`)
  that is normalised to keep the frame filled; corners a little darker. The grid stays straight in the frame (a
  curved one rang with moiré) and is applied before the focus blur, so off the keyword's line it goes soft the way a
  filmed screen does.
- **Presets** (`presets/match-cut/*.json`): `web` (web and app pages filmed off a screen: `screen` 1, no crumple, a
  white tint for the article pages, keyword high in the frame, copy smeared into vertical streaks), `broadsheet`, `crumpled`, `clean`. A preset is a partial `look`; `look` overrides it.
  Add one by writing the JSON and running `node plugins/paper/tools/presets.mjs`.
- **Look** fields: `layouts`, `cutsPerSecond`, `zoom` (push-in by the end), `keySize`, `anchorY`, `blur`, `smear`,
  `falloff`, `streak`, `crumple`, `tint`, `texture` (a scan under `public/`, multiplied), `textureOpacity`, `grain`,
  `highlight`, `wander`, `screen`, `pixel`, `curve`.

### Your own screenshots

Each screenshot needs only a rough box round the keyword (`hint`, image pixels). The plugin snaps it to the ink when
it renders: it finds the text line nearest the hint, splits it into words by the gaps between glyphs, and keeps the
words the hint covers. That is pixel maths on the engine's own image decode, so it runs on every platform with nothing
to install. `exact: true` skips the snap.

For an agent: open each screenshot, read off where the keyword is, write the hint, then render a still with
`showKeyBox` (the hint in blue, the snap in red) and look at it. Punctuation touching the word (`Bowl:`) snaps with
it; tighten the hint, or give `exact`, to leave it out.

## `<CutOut>` and `<FoldOut>`: a photo as paper

```tsx
import { CutOut, FoldOut, unfolds } from '@kinetographdev/paper';

unfolds({ fps: 30, delay: 8 }); // a crinkle on each step, a soft thump as it lands (module top level)

<CutOut src={staticFile('me.png')} edge="torn" />
<CutOut src={staticFile('me.png')} edge={{ style: 'torn', thickness: 0.04, intensity: 1.5, detail: 0.6 }} width={700} />
<FoldOut src={staticFile('me.png')} delay={8} />
```

- **The subject** is a picture with alpha, its background already removed. The engine has no segmentation, so the cut
  happens before: any background remover (`rembg` on any platform, an editor, a matte from the footage), or a person
  in the loop. The plugin traces the alpha from there (`threshold`, default 128).
- **Edge** (`edge`): `torn` (ragged, a grey fibre fringe and loose fibres), `cut` (straight scissor cuts), `wavy` (a
  deckle), `sticker` (smooth). Each takes `thickness` (border width against the picture's longer side), `intensity`
  (how far the edge wanders) and `detail` (how fine). The border is the alpha grown by a distance field, so concave
  outlines do not fold over themselves.
- **Paper**: `stock` (`white`, `newsprint`, `kraft`, `binder`, `cardboard`: the border and the back are that paper, from the plugin's
  scans), `paper`, `back`, `fringe` (colours over the stock's), `texture` (a picture under `public/`, multiplied),
  `creases` (the crumpled-paper scan over the flat sheet, picture included; default 0.45), `shadow`, `boil` (edge
  redraws per second), `seed`.
- **Line** (`<CutOut>` only): `line` draws a Scrapline stroke round the cut-out, outside the torn edge (`marker`,
  `pencil`, `crayon`, `scribble`, `brush`, or a style with changes), `lineColor`, `lineGap`.
- **Fold-out** (`<FoldOut>`, all of the above but the line, plus): `delay`, `duration` (default 0.7 s), `steps` (stop-motion rate,
  default 10 a second), `folds` (default 3), `ball` (the packet's size), `crumple`, `turn`, `cells` (mesh density).

How the fold works: a triangle mesh over the sheet is folded `folds` times in turn, each across the packet's longest
extent with the side away from the middle turning over. It opens last fold first, one hinge at a time, each flap
rotating in 3D. Every triangle is drawn as an affine map of the cut-out (or of the plain back where it has turned
over), shaded by its slope against a light from the top left. The creases are two scans of crumpled paper (heavy in
the packet, giving way to light as it opens, `creases` of the light one left once flat), drawn on the sheet so they
fold with it. `wrinkles` is a procedural stand-in (a shader) for a look without the scans.

### Studio panel

`cutOutLookSchema` and `foldOutLookSchema` are the components' props minus `src` and `id`, with the Paper panel's sheet
view: edge and stock cards, colours, sliders (and folds and timing for the fold-out), and the picture's place as a
handle on the preview. Spread the value in: `<CutOut src={...} {...look} />`. `templates/plugin-ui-demo` has
`PaperCutOut` and `PaperFoldOut` wired this way.

## `<Scrapline>`: a hand-drawn border on torn paper

Moved here from `templates/scrapline` (which stays as its demo and poster-wall showcase).

```tsx
import { Scrapline } from '@kinetographdev/paper';

<Scrapline trace={{ src: staticFile('matte.mp4'), loop: 177 }} line="pencil" paper="kraft" color="#2b2b30" offset={26} threshold={40}>
  {subject}
</Scrapline>
<Scrapline trace={{ src: staticFile('cutout.png') }} line={{ style: 'crayon', width: 12 }} paper="photos/wall.jpg">{subject}</Scrapline>
<Scrapline trace={{ d: 'M 100 100 H 600 V 500 H 100 Z' }} line="marker" paper="binder">{poster}</Scrapline>
```

Behind the subject, from the back: the paper (the outline grown by `offset + paperMargin`, torn by noise at three
scales, a paler rim, a shadow), then the line (each ring gets `passes` strokes: one ribbon with width noise, thinned
ends, a lateral wobble and an overshoot; grain punches specks and streaks out of the ink). Both redraw at their own
`boil` and hold in between. The outline is traced only on a boil step's first frame and kept: the trace's picture at
that instant is read at a quarter size with `getImageData`, a distance field is cut at the offset (marching squares,
so concave shapes do not loop), simplified, smoothed and resampled. No ffmpeg, no wall clock, no `Math.random`.

| Line | width | passes | grain | boil | wobble | spread | overshoot | widthVar | alpha | lanes | dropout |
|---|---|---|---|---|---|---|---|---|---|---|---|
| marker | 8 | 1 | off | 8 | 1.6 | 0 | .04 | .14 | 1 | 1 | 0 |
| pencil | 4 | 3 | on | 12 | 2.2 | 2.4 | .07 | .5 | .82 | 1 | .10 |
| crayon | 10 | 2 | on | 6 | 2.6 | 3.5 | .05 | .35 | .92 | 2 | .20 |
| scribble | 4 | 3 | off | 12 | 5 | 6 | .14 | .55 | 1 | 1 | 0 |
| brush | 14 | 1 | on | 6 | 2.4 | 0 | .03 | .6 | .95 | 4 | .16 |

Papers: `white`, `kraft`, `binder`, `cardboard` (Scrapline's own scans) and `newsprint`, or any picture under
`public/`. `scraplineLookSchema` gives it the Paper panel's scrapline view (line and paper cards, colour, sliders);
`templates/plugin-ui-demo` has `PaperScrapline`.

### Textures

`textures/`: crease maps (`crease-light`, `crease-heavy`; grey, median lifted to white so multiplying adds only the
creases), `smooth-white` (grain for white paper), `newsprint`, `kraft`, Scrapline's papers (`scrap-white`,
`scrap-kraft`, `binder`, `cardboard`; the last two are cut-out stocks too), and `torn-edge.png` (a torn strip with alpha,
not used yet). The sources are generated scans kept in `textures/src/` (not committed); `python3 -I
plugins/paper/tools/textures.py` regenerates the JPEGs and `textures/index.ts`, which carries them as data: URLs. A plugin's
own files have no stable path once a project is bundled, so the scans travel inside the code (about 2.4 MB).
The panel no fold moves stays put, so the sheet lands where a `<CutOut>` with the same props would be.

## The plan: paper mechanics

Shared building blocks, each a prop or a component any effect can use:

| Mechanic | Here as | From |
|---|---|---|
| Torn edges, fibre-white border | `edge` on `<CutOut>`; a `<Torn>` for any layer is next | done for pictures with alpha (`src/sheet.ts`) |
| Textures: grain, halftone, cardboard, ink bleed (multiply, overlay) | the material: procedural plus scans | `Paper` (crumple, scan) |
| Static creases and wrinkles | part of the material, fixed per sheet | `Paper` crumple |
| Posterized time, 8 to 12 fps | `steps` on everything | hexed's `fps-12` gene |
| Boil: texture and position swapped every 2 to 3 frames | `boil` on any layer | scrapline's boil |
| Tight drop shadows (thin paper, millimetres up) | `lift` | the engine's `dropShadow` |
| Parallax z-spacing under one camera | `<Desk>` | the lyric reel's nulls-and-camera rig |
| Slide in with overshoot and settle | `slide` entrance | new |
| Pinned pivot swing | `pin` entrance | new |
| Jigsaw assembly, pieces dropping in one by one | `assemble` | new |
| Fold-out | `<FoldOut>`: flaps unfolding on hinges in 3D, shaded by slope | done |

Effects still to come: `<MagazineLetters>`, `<TornHeadline>`, `<CommentMatchCut>`.
