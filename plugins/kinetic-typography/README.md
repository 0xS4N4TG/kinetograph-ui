# @kinetographdev/kinetic-typography

Kinetic typography for Kinetograph: type that moves with the voice and the picture. `<Captions>` sets a voiceover in
fifteen ready-made caption styles, after the looks of caption tools for talking-head video (aster.video's among
them). `<HandCaptions>` is the Kinetograph launch film's hand-written captions
(`kinetograph/examples/launch/print/captions.tsx`), freed from that film's voiceover.

## `<Captions>`

Each word arrives as it is said; a line leaves all together. A line with a big word is a hook: the big word is set
huge, fitted to the frame, with the small words over and under it. A line without one is a caption, its marked word
(the first, or `marks`) heavier, coloured or boxed.

```tsx
import { Captions, wordsFrom } from '@kinetographdev/kinetic-typography';

const words = wordsFrom(asr.words, 30);
const footage = { src: staticFile('me.mp4') };

<Video src={footage.src} />
<Captions words={words} split={[3, 3]} big={['premium']} preset="highlighter" footage={footage} />
```

| Prop | What it does |
|---|---|
| `words` | `{ text, from, to }` per word, in frames (`wordsFrom` makes them from timestamps in seconds). |
| `split` | Words per line. Default 3 a line. A line stays until the next starts, or `hold` (12) frames after its last word. |
| `big` | Words set big (without case or punctuation). Big words in a row set big together. |
| `marks` | Caption words marked out. Default each caption line's first word. |
| `preset` | A look by name (`STYLE_NAMES`). |
| `look` | Changes to it, every line. `look.style` names a look too, so one value can carry both (Studio's panel writes that). |
| `lines` | Changes for single lines, by index from 0: `{ 2: { bigIn: 'left' } }`. |
| `footage` | The video under the captions, timed as its `<Video>` (`{ src, rate, loop, start }`). Gives `accent: 'footage'` its colour, `readable` its reading of the picture, `side: 'auto'` a guess at the open side. |
| `subject` | `(frame) => { x, y } \| null`: the subject's head, for `beside` (block clear of it, at its eye level). `subjectFrom(matte, fps, W, H)` reads it from a matte; `pointAt` (vj) from a point track. |

### The looks

| Style | What it is |
|---|---|
| `clean-hook` | Heavy white sans, small words over and under. The safe default. |
| `red-headline` | Condensed capitals (Anton) in the accent, quiet white words round them. |
| `lime-serif` | A fat italic serif (Playfair Display) in a glowing lime, with a dot. |
| `prism` | Heavy capitals in difference: dark where the picture is light. The big word arrives a new way each line. |
| `editorial-serif` | A high-contrast serif (Bodoni Moda) flush left, arriving soft to sharp. |
| `shine-headline` | Heavy white capitals (Archivo Black) with a shine that sweeps across them. |
| `selected-text` | A blue text selection, with handles, sweeps across the big word. |
| `highlighter` | A colour from the footage sweeps in behind condensed capitals; the caption's marked word boxed. |
| `typewriter` | Typed letter by letter as it is said, with a cursor and key clicks. Small, lower case, flush left. |
| `box-first` | A white box grows first, then the black word lands in it. |
| `bold-captions` | Big heavy capitals (Montserrat) on one line, the marked word in yellow, popping in. |
| `soft-minimal` | Light lower case that fades up out of a blur. |
| `cinematic-caps` | 16:9: spaced small capitals, the big moment in an italic serif (Instrument Serif) in the open side. |
| `poster-boil` | A word to a row, drawn by hand (p5.brush) and boiling on twelves; colours rotate as words land, white scribbles flicker, the rows paint into knocked-out bands as the line holds and crop out to the centre. After a hand-lettered poster loop; the standalone title is `<BoilStack>`. Give it lines of 2 to 4 short words and a `hold` long enough for the paint (about 2.5 s). |
| `side-note` | 16:9: quiet captions in the empty side at eye level, the key word heavy beside the subject. |

A look's fields (`CaptionLook`; all optional in `look`):

- `caption`, `big`: `{ font, weight, italic, case, tracking, size, color }`. Fonts come from `FONTS`
  (Switzer, Kineta, Figtree, Poppins, Barlow Condensed, Geist Serif, Geist Serif Triangle, Inter, Anton, Archivo Black, Bebas Neue, Montserrat, Oswald, Playfair Display, Bodoni Moda, Instrument
  Serif, DM Serif Display, Space Grotesk, JetBrains Mono), loaded at the nearest weight. Switzer, the default sans, is
  free under the ITF Free Font License and is fetched from Fontshare's CDN when a frame first needs it (the plugin does
  not ship it). Kineta ships with the plugin (`fonts/kineta`). Geist Serif and its Triangle cut (OFL) load from the `geist` npm package's files on jsDelivr, at one
  weight; the rest are Google fonts. The caption's `size` is a fraction of
  the frame's shorter side; the big word's is the most it grows, in caption sizes, and it is fitted to `fit` of the
  frame's width. `color` is a hex or `accent`.
- `layout`: `over`, `centre`, `left`, `beside`, `one-line`, `plain`. `side` (`auto`, `left`, `right`), `y` and
  `captionY` (middles, 0 top to 1 bottom).
- `treatment`: `simple`, `box-first`, `typewriter`, `select`, `highlight`, `underline`. `finish`: `flat`, `shine`,
  `glow`. `blend`: `normal`, `difference`. `mark`: `none`, `weight`, `colour`, `box`. `dot`.
- `in`: `rise`, `fall`, `left`, `right`, `focus`, `fade`, `instant`, `pop`, `box-first`, `typewriter`. `out`: `cut`,
  `fade`, `rise`, `fall`, `left`, `right`, `blur`. `bigIn`: `same`, `vary` (a different entrance each line) or one of
  `in`. `far` (how far, 1 = 100%), `bounce`, `flicker`, `flash`, `shake` (a jolt as the big word lands, 0 to 100),
  `soft` (blur and slower easing, 0 to 100), `steps` (motion on 12 frames a second), `reveal` (`word` or `line`).
- `accent` (hex, or `footage`), `shadow` (0 to 1), and `readable` (deepen the shadow and lay a soft scrim where the
  picture under a line is bright; needs `footage`).

### Reading the footage

- `accentFrom(footage, fps, fallback)`: the strongest hue across five moments of the clip, each cell weighted by
  saturation and light, lifted to a colour that carries white text. Skin and sand pull it to orange; set `accent` by
  hand when that is wrong for the video.
- `brightness(footage, frame, fps, [x0, y0, x1, y1])`: mean brightness under a box (fractions of the frame).
- `subjectFrom(matte, fps, W, H)`: the head's middle and eye level from a matte video, per frame.
- `openSide(footage, frame, fps)`: the half with less contrast between neighbouring cells. A busy background fools
  it; prefer `subject`.

They draw the file small on an OffscreenCanvas and read it back, as the paper plugin's tracer does, so a frame stays
a pure function of its props.

### Checking

`checkFrames(words, split, big)` gives `{ hook, caption }`: a settled frame of the first hook and of the first caption
line, for the two stills to look at. `captionLines` gives every line with its frames and whether it is a hook.

### Studio panel

`captionLookSchema` (and `captionsSchema` for the whole props) carries the panel. Style cards drawn in each look's
own type; "Changing: Caption | Big text" for font, case, weight, size, tracking, colour and italic; layout cards with
the open side, big fit and the two heights; the moving style, finish, caption mark, difference, dot and whole-line
switches; the motion keys under an In / Out switch with the big word's entrance, How far, Bounce, Flicker and Flash
switches, Shake and Soft knobs (drag up or down, arrow keys, wheel) and Steps; the accent with From footage,
shadow and the reading fix; and on the preview, Hook and Caption pins to drag up and down.

## `<HandCaptions>`

Each word writes itself across its spoken time a letter at a time, every letter in a different handwritten face, so it
reads as one restless hand. Key words break out whole in a display face: a fat serif with a doodle drawn beside it, or
a heavy italic that streaks in, taken in turn. Letters glow warm and land with a pink and cyan fringe.

```tsx
import { HandCaptions, wordsFrom } from '@kinetographdev/kinetic-typography';
import { pointAt } from '@kinetographdev/vj';

const words = wordsFrom(asr.words, 30, 12); // [{ w, s, e }] in seconds -> frames, starting on frame 12

<HandCaptions words={words} split={[2, 2, 3]} hot={['1891', 'kinetograph', 'move']}
  anchor={(f) => pointAt(track, f, 30)} />
```

| Prop | What it does |
|---|---|
| `words` | `{ text, from, to }` per word, in frames. `wordsFrom(stamps, fps, at)` makes them from timestamps in seconds. |
| `split` | Words per page. Default 3 a page. A page stays until the next starts, or 12 frames after its last word. |
| `hot` | Words that break out (matched without case or punctuation), every time they are said. A plain word's face is set by its place in the list: the 1st, 3rd, ... entry in the serif, the 2nd, 4th, ... in the heavy italic, so a word keeps its face each time it is said. `{ word, color, face }` gives a word its own colour and face (`'serif'` or `'heavy'`); either may be left out. |
| `hotColor` | The colour of every hot word that has none of its own. Default `color`. |
| `anchor` | `(frame) => { x, y, side?, w?, h? } \| null`: a tracked subject. The text hangs beside it on the side it fits (or `side`), with a reticle, lines to the text and off the frame, and a bracket with the coordinates on the letter being written. Give the subject's box (`w`, `h`, canvas px, e.g. a face track's) and the reticle frames it and the text sits clear of it; without, the reticle is a 92 px square. Without `anchor` the captions sit centred low. |
| `place` | Where the text hangs when it should not follow the subject; the lines still run to the subject. |
| `size`, `color`, `glow`, `fringe` | Letter size (default 124 px at 1080 high), colour, glow (a text-shadow, `''` for none), the landing fringe. |
| `halo` | A dark halo under the glow, for footage with bright parts or white flashes: `true`, or a strength from 0 to 1.5. A tight black edge round each letter and wider dark shadows, so whatever is behind a word falls to grey near it. Off by default. `haloOf(k)` returns the same shadows as a string. |
| `hands`, `serif`, `heavy` | The handwritten faces mixed per letter (`HANDS`: Caveat, Shadows Into Light, Indie Flower, Gloria Hallelujah, Patrick Hand, Gochi Hand) and the two display faces (Abril Fatface, Archivo Black). |
| `doodle`, `reticle`, `lines` | The doodle's colour or `false`; the reticle's label or `false`; the lines on or off. |
| `top` | The highest the block may reach. |

`wordSpans(words, split, hot)` gives when each word is written, to cue sounds of your own.

A point track comes from `plugins/vj/tools/track.mjs` (`pointAt` in the vj plugin reads it).

## Demo

`templates/kinetic-type-demo/`: `styles.tsx` plays the fifteen caption looks over a talking head (`Styles`, 9:16), the
two wide looks at 16:9 (`Wide`), and one look as a prop (`Style`, `StyleWide`). `index.tsx` writes a line beside the
anvil in Blacksmith Scene (1893), and centred low. `templates/plugin-ui-demo` has `TypeCaptions` for the Studio panel.

## Licence

The plugin's code is MIT (`LICENSE`). It ships one font, Kineta; every other font is downloaded by whoever renders,
from the font's own source, under that font's licence, which MIT does not change.

- Kineta is Sanat Gupta's typeface, MIT, from the kinetograph-fonts repository. Its WOFF2 files and licence are in
  `fonts/kineta/`, registered by `fonts/kineta/kineta.css`; update them from that repository when it changes.
- The Google fonts (Figtree among them) are under the SIL Open Font License, downloaded from Google Fonts.
- Geist Serif and Geist Serif Triangle are Vercel's, under the SIL Open Font License, downloaded from the files of
  Vercel's `geist` npm package (v1.9.0) on jsDelivr, since Google Fonts does not list them yet.
- Switzer comes from Fontshare under the ITF Free Font License (FFL): free for personal and commercial work in any
  medium, video and social media included, so rendered videos are fine to publish. Its files may not be passed on:
  don't commit the downloaded files (in `~/.cache/kinetograph/fonts`) to a repository or bundle them into an app.
  The FFL also forbids offering it as a selectable font to other people through a hosted service or design tool, so
  a hosted Kinetograph needs a separate licence from ITF, or a Google font in place of Switzer.

## `<BoilStack>`

Three stacked words in a heavy condensed sans, animated on twelves like hand-made type, after a 4:5 kinetic-typography
poster loop (measured frame by frame with the kinetograph-taste-clone skill). The block starts as a speck and grows in
two steps about a point just above the centre, the letters boiling every frame (widths, slants and baselines jump) as
the three colours swap between the words twice; white hand-drawn marks (rays, squiggles, a swirl) flicker round it. The
lines jump to fill the frame one after another, each is painted over with a dry-brush wipe into a solid band that knocks
its letters out dark, white arrows show the strokes, it holds, and the bands crop in to the centre one a frame after
another. 64 frames at 12 fps (5.3 s); it runs on twelves at any fps and fits any frame (made at 1080 x 1350).

```tsx
import { BoilStack, BOIL_FRAMES } from '@kinetographdev/kinetic-typography';

<Composition id="Noise" component={BoilStack} durationInFrames={BOIL_FRAMES * 2} fps={24} width={1080} height={1350}
  defaultProps={{ lines: ['SHAKE', 'THE', 'FLOOR'] }} />
```

| Prop | What it does |
|---|---|
| `lines` | Three words, top to bottom. Short words read best (5, 3, 5 letters in the reference). |
| `colors` | The three colours in the order they end up on the lines (default magenta `#fa00ec`, orange `#fa4c08`, red `#fa0644`, picked on the reference). |
| `ground`, `knockout` | The black ground, and the colour letters turn when their band is painted (empty: a near-black of each band's hue). |
| `marks` | The white hand-drawn marks (on by default). |
| `from` | The film frame it starts on. |
