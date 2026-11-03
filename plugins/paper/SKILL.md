---
name: paper
description: Paper effects for Kinetograph: a text match cut on made-up pages (newspaper, article, blog, and app screens like a post feed, a forum post or a comment thread, optionally filmed off an LCD) or real screenshots, a photo as a paper cut-out that can fold open, and Scrapline, a hand-drawn boiling border on torn paper round a cut-out subject (still or moving, from a matte). Use for fast keyword-over-pages edits and paper-craft or collage looks.
---

# Paper

`@kinetographdev/paper` is a paper material (creases, scans, grain) and the effects made of it. Run
`npx kinetograph plugins` to see that it is installed.

## `<MatchCut>`

A keyword holds still, highlighted, while the page under it changes several times a second. It fills its composition.

| Prop | What it does |
|---|---|
| `keyword` | The word or phrase that holds still. Required. |
| `preset` | A look by name: `web`, `broadsheet`, `crumpled` or `clean`. |
| `look` | A partial look that overrides the preset (fields below). |
| `screenshots` | Your own pages: `{ src, hint: [x, y, w, h], exact? }`. `src` is under `public/`. |
| `everyNth` | A screenshot every nth cut. 1 means screenshots only. Default 3. |
| `seed` | Another pile of made-up pages. |
| `showKeyBox` | Draws the hint (blue) and the snapped box (red) on screenshots. |
| `durationInFrames` | Frames the push-in runs over. Default the composition's. |

`look` fields: `layouts`, `cutsPerSecond`, `zoom`, `keySize`, `anchorY`, `blur`, `smear`, `falloff`, `streak`,
`crumple`, `tint`, `texture`, `textureOpacity`, `grain`, `highlight`, `wander`, `screen`, `pixel`, `curve`.

- **Layouts.** Print and article pages: `pull`, `italic`, `kicker`, `body`, `web`, `post`, `display` (the default
  set). App screens, picked on purpose: `tweet` (a feed of short posts, sometimes a thread, with link and video cards
  and an action row), `reddit` (a forum post: community row, bold title, flair, body, action pills, comments under
  it), `comments` (a nested comment thread). Screens come in light or dark mode and keep their own background
  whatever `tint` says. Accounts, communities and copy are invented, and there are no logos.
- **Screen.** `screen` (0 to 1) films the page off a monitor: LCD cells with RGB subpixel stripes, a slight lens
  barrel that still fills the frame, and darker corners. The focus blur softens the grid off the keyword's line, as a
  camera does. `pixel` is the cell size (default 6 px); `curve` is the barrel (default 0.05). The `web` preset has it
  on, with `crumple` 0 and all five web and app layouts.

`matchCutSchema` is the zod schema for these props and `matchCutLookSchema` the one for `look`. Use either in a
composition's schema and Studio draws a form for it.

## Studio panel

`matchCutLookSchema` carries `kinetographPanel: '@kinetographdev/paper'`, so Studio mounts the Paper panel for the
`look` field instead of a generated form. It has:

- Preset cards (`web`, `broadsheet`, `crumpled`, `clean`) with a drawn swatch. Picking one replaces `look` with that
  preset's fields; what it leaves out falls back to MatchCut's defaults.
- A layout picker with a schematic thumbnail per layout. Click to switch a layout on or off (at least one stays).
- Sliders for keyword size and height, cuts per second, push-in, blur, streak, crumple, grain, wander, screen, screen
  pixel and lens curve, and colour
  pickers for the highlight and the paper tint.
- A keyword box on the preview. Drag it up or down to set `anchorY`; drag its right or top handle to set `keySize`.
  The keyword is always centred across, so the box moves only vertically. The box width is an estimate (the panel does
  not know the keyword), and it ignores the push-in, so it shows the size at frame 0.

Give the composition `look: matchCutLookSchema` and leave `preset` out of its schema (use
`matchCutSchema.omit({ preset: true })`), since the preset cards write into `look` and `look` overrides `preset`.
Inside Studio, set values with `studio_set_props` and read the result in the preview. Write the chosen look into the code
or a preset at the end.

### Sheet view, for `<CutOut>` and `<FoldOut>`

`cutOutLookSchema` and `foldOutLookSchema` carry the panel too (view `cut-out` and `fold-out`). Each holds a
component's props other than `src` and `id`, so spread it in: `<FoldOut src={staticFile('me.png')} {...look} />`.

- Edge cards with the edge drawn; stock cards (white, newsprint, kraft, binder, cardboard). Picking a stock clears the face, back and
  fringe colours, so the stock's own show; the colour pickers override them again.
- Sliders for creases, shadow, boil and seed; the fold-out adds folds, packet size, turn, crumple and facets, and the
  timing (delay, open frames, steps a second).
- The cut-out view adds a Line section: none or a line style card, the line colour, and the gap.
- On the preview, the picture's place: drag the circle to set `x` and `y`, drag either end of the dashed bar to set
  `width`.

### Scrapline view

`scraplineLookSchema` (view `scrapline`) holds `<Scrapline>`'s props other than `trace`, `id` and the subject:
`<Scrapline trace={...} {...look}>{subject}</Scrapline>`. Line cards with the stroke drawn, paper cards (none and the
five papers), the line colour, and sliders for the line offset, paper margin, paper boil, seed and threshold.

`flicks({ frames, fps, cutsPerSecond })` at the top level of the entry adds a paper flick on every cut.

## `<CutOut>` and `<FoldOut>`

A photo with its background already removed (a PNG with alpha) becomes a paper cut-out. `<FoldOut>` unfolds it. The
plugin does no segmentation: remove the background first (`rembg`, an editor, or a person in the loop).

- `<CutOut src>` takes:
  - `edge`: `torn`, `cut`, `wavy` or `sticker`, or `{ style, thickness, intensity, detail }` (border width against the
    picture's longer side, how far the edge wanders, how fine).
  - `stock`: `white` (default), `newsprint`, `kraft`, `binder` or `cardboard`, from the plugin's scans; `paper`,
    `back`, `fringe` colours over the stock's; `texture`, a picture under `public/` multiplied over the paper.
  - `width`, `x`, `y`: size and place. `creases` (0 to 1, default 0.45), `shadow`, `boil` (edge redraws a second),
    `seed`, `threshold` (alpha that counts as inside, default 128).
  - `line`: a hand-drawn line round the cut-out, as Scrapline draws it (`marker`, `pencil`, `crayon`, `scribble`,
    `brush`, or `{ style, width, boil, ... }`); `lineColor`, `lineGap` (px past the paper's edge, default 14).
- `<FoldOut>` takes the same (but not `line`) and adds `delay`, `duration` (default 0.7 s), `steps` (default 10 a
  second), `folds` (default 3), `ball`, `crumple`, `turn` and `cells` (mesh density). It opens last fold first, one
  hinge at a time. `unfolds({ fps, delay })` adds its sounds (a crinkle per step, a thump as it lands).

## `<Scrapline>`

A hand-drawn border round a cut-out subject, on torn paper behind it. The line and the paper redraw a few times a
second and hold in between, like hand animation. Works on moving footage: trace a black and white matte video.

```tsx
import { Scrapline } from '@kinetographdev/paper';

<Scrapline trace={{ src: staticFile('matte.mp4'), loop: 177 }} line="pencil" paper="kraft" color="#2b2b30" offset={26} threshold={40}>
  <Video src={staticFile('subject.mp4')} matte={{ layer: 'subject-matte', mode: 'luminance' }} />
</Scrapline>
```

- `trace`: `{ src }` a picture with alpha; `{ src, rate, loop, start }` a matte video (match the Video's
  `playbackRate`, `loop` and start, and use the global frame: no shifting `<Sequence>` round it); or `{ d, x, y,
  scale }` an SVG path (a rectangle round a poster, a shape).
- `line`: `marker` (default), `pencil`, `crayon`, `scribble`, `brush`, or one with changes:
  `{ style: 'pencil', width: 6, boil: 8 }`. Fields: `width`, `passes`, `grain`, `boil`, `wobble`, `spread`,
  `overshoot`, `widthVar`, `alpha`, `lanes`, `dropout`.
- `paper`: `white`, `kraft`, `binder`, `cardboard`, `newsprint`, a picture under `public/`, or `false` (default).
- `color`, `offset` (line's distance from the subject, default 14), `paperMargin` (default 34), `paperBoil` (default
  6), `seed`, `threshold` (about 40 for a soft matte), `traceScale` (default 4), `id` (unique when several are on
  screen).
- The children are the subject, drawn on top. The trace reads the picture or matte stretched to the full canvas, so
  draw the subject full-canvas too.
- On moving footage the outline is traced once per boil step, so it lags the subject by up to `fps / boil - 1`
  frames; raise `boil` or `offset` if it shows.

## `<Paper>` and the other exports

- `<Paper w h tint seed crumple texture? textureOpacity?>`: the sheet MatchCut's printed pages sit on. A `tint`
  colour, crumpled creases lit from the top left (`crumple`, 0 flat to about 3; `seed` picks the crumple), an
  optional scan under `public/` multiplied over it, a soft fall-off to the corners. Use it as a background of its own.
- Effects for any layer: `focus(blur, smear, ay, band, falloff, ax, side, streak)` keeps a horizontal band sharp and
  blurs away from it; `screen(amount, pixel, curve, width, height)` films a layer off an LCD; `wrinkles(strength,
  cell, seed)` crumples a layer with a shader.
- Sounds, called at the entry's top level: `flicks({ frames, fps, cutsPerSecond })` (a paper flick per cut),
  `unfolds({ fps, delay })` (a fold-out's crinkles and landing). `flick`, `crinkle` and `land` are the single sounds.
- Building blocks: `page(keyword, n, reach, layouts)` lays out one made-up page; `LAYOUTS`, `PAGE_LAYOUTS` (the
  default seven) and `SCREEN_LAYOUTS` (`tweet`, `reddit`, `comments`); `snapBox` snaps a rough box onto a
  screenshot's ink; `readMask`, `outlines`, `resample` trace a picture's alpha, a matte or a path; `drawLine` and
  `drawPaper` draw Scrapline's stroke and torn paper on a canvas.

## Examples

```tsx
import { MatchCut, flicks } from '@kinetographdev/paper';

flicks({ frames: 150, fps: 30, cutsPerSecond: 10 });

<MatchCut keyword="Super Bowl" preset="web" />
<MatchCut keyword="Super Bowl" preset="web" look={{ layouts: ['tweet', 'comments'], screen: 0.8, pixel: 8 }} />
<MatchCut keyword="Super Bowl" preset="clean" look={{ layouts: ['reddit'] }} />
<MatchCut keyword="Super Bowl" preset="broadsheet" look={{ zoom: 1.2, highlight: '#ffd400' }} />
<MatchCut keyword="Super Bowl" screenshots={[{ src: 'shots/a.png', hint: [212, 1180, 388, 64] }]} everyNth={1} showKeyBox />
```

## Check

- Render a `kinetograph still` of a middle frame. The keyword should sit still and sharp, with the page soft around it.
- With screenshots, turn on `showKeyBox` for the still. If the red box misses the word, tighten the hint or set
  `exact: true`. Punctuation touching the word snaps with it.
- With `screen` on, check a still at full size: the subpixel stripes should show on the keyword's line only. Raise
  `pixel` for a closer, coarser screen; lower `screen` if the page looks dim.
- App screens are light or dark at random per cut. The keyword stays dark on the highlight in both.
- Made-up pages invent their mastheads, accounts, communities and copy, and carry no logos. Do not present them as a
  real outlet's or person's post, and do not add real names or logos.
