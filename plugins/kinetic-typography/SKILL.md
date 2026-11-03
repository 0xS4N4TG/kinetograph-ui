---
name: kinetic-typography
description: Kinetic typography for Kinetograph. Captions puts a voiceover on screen in one of fifteen ready-made styles (clean-hook, red-headline, lime-serif, prism, editorial-serif, shine-headline, selected-text, highlighter, typewriter, box-first, bold-captions, soft-minimal, cinematic-caps, side-note, poster-boil), hook lines with one word set huge, every word moving in and out as it is said and an accent colour and a readable shadow taken from the footage. HandCaptions writes a voiceover on letter by letter in mixed handwritten faces, optionally hung off a tracked subject. BoilStack is a three-word poster title that boils on twelves, jumps to fill the frame, paints each line into a knocked-out band and crops out. Use for captions and hooks on talking-head video, "put the X style on my video", and tracked or hand-written type.
---

# Kinetic typography

`@kinetographdev/kinetic-typography`. Full reference: README.md beside this file.

## "Put the X style on my video"

A request like "Put the Highlighter style on my video (style highlighter). Take the accent from my footage, look at the
hook and a caption, and fix anything that doesn't read" is this recipe:

1. **Words.** Get word timestamps for the voiceover (an ASR or TTS word list in seconds) and turn them into frames
   with `wordsFrom(stamps, fps, startFrame)`. Never hand-place frames that belong to a spoken word.
2. **Lines and big words.** Choose `split` (words per line; 2 to 4 reads best) and `big`: the one word per hook line
   that carries it (a number, a promise, a name). Consecutive big words set big together ("hard part"). Lines with no
   big word are captions. Keep a hook's small words few: one or two before the big word, one or two after.
3. **Style.** `preset="highlighter"` (or `look={{ style: 'highlighter', ...changes }}`). The wide-shot looks
   (`cinematic-caps`, `side-note`) want 16:9; the rest are made for 9:16 and work at 4:5 and 1:1.
4. **Footage.** Pass `footage={{ src, rate?, loop?, start? }}` timed exactly as the `<Video>` under the captions. It
   gives `accent: 'footage'` its colour (`accentFrom`), and `readable` its reading of the picture under each line.
   For `beside` layouts pass `subject`: `subjectFrom(matte, fps, W, H)` from a matte video, or a point track
   (`pointAt` from the vj plugin's `tools/track.mjs`); without it the open side is guessed from the picture, which a
   busy background fools.
5. **Look at the hook and a caption.** `checkFrames(words, split, big)` gives a settled hook frame and a settled
   caption frame. Render a `kinetograph still` of each and look at them:
   - Every word readable at phone size: the small words too, against the picture under them.
   - Nothing over the face, the eyes, or the bottom 15% (the app's buttons) or the top 8%.
   - The big word fits inside the frame with margin; the hook's small words sit tight to it.
   - The accent reads: on a box, white text on it is legible; as a text colour, it stands off the background.
6. **Fix what doesn't read**, smallest change first: raise `shadow` (or leave `readable` on), move the line
   (`y`, `captionY`), change the big word's `color` (`'#ffffff'` or `'accent'`), lower `fit`, change `layout`, or set
   `accent` by hand when the footage's colour is muddy (skin and sand give orange). Re-render the two stills.

```tsx
import { Captions, checkFrames, subjectFrom, wordsFrom } from '@kinetographdev/kinetic-typography';

const words = wordsFrom(asr.words, 30);
const footage = { src: staticFile('me.mp4') };

<Video src={footage.src} />
<Captions words={words} split={[3, 2, 3]} big={['premium']} preset="highlighter" footage={footage} />
```

## The looks

`STYLE_NAMES`, with one line each in `ABOUT`. A look has a `caption` (the small words) and a `big` (the big word),
each `{ font, weight, italic, case, tracking, size, color }`, and shared fields:

- `layout`: `over` (small words over and under the big word, upper middle), `centre`, `left`, `beside` (the open side
  of the subject, at eye level), `one-line`, `plain` (captions only).
- `treatment` (moving style): `simple`, `box-first`, `typewriter`, `select`, `highlight`, `underline`. `finish`:
  `flat`, `shine`, `glow`. `blend: 'difference'` inverts the picture under the big word. `mark` for a caption
  line's marked word (`marks`, or its first word): `none`, `weight`, `colour`, `box`. `dot`.
- Motion: `in` (`rise`, `fall`, `left`, `right`, `focus`, `fade`, `instant`, `pop`, `box-first`, `typewriter`), `out`
  (`cut`, `fade`, `rise`, `fall`, `left`, `right`, `blur`), `bigIn` (`same`, `vary` or one of `in`), `far` (1 = 100%),
  `bounce`, `flicker`, `flash`, `shake` and `soft` (0 to 100), `steps` (12 frames a second), `reveal` (`word`, `line`).
- `accent` (hex or `footage`), `shadow` (0 to 1), `readable`, `fit`, `y`, `captionY`, `side`.

Change one line only with `lines={{ 2: { bigIn: 'left' } }}` (line index from 0, as `captionLines` numbers them).

## Studio panel

`captionLookSchema` carries the panel (view `captions`): give the composition `look: captionLookSchema` and pass
`look` to `<Captions>`. Style cards drawn in each style's type; "Changing: Caption | Big text" for the font, case,
weight, size, tracking and colour; layout cards; moving style keys and finish; motion keys with an In / Out switch, the
big word's entrance, How far, Bounce, Flicker and Flash switches, Shake and Soft knobs and Steps; the accent and
From footage, shadow and the reading fix; Hook and Caption pins to drag on the preview. Picking a card replaces the
value with `{ style }`. Set values with `studio_set_props`, check the preview, and write the final look into the code.

## `<HandCaptions>`

1. Words from timestamps with `wordsFrom`, as above; choose `split` and the key words (`hot`). Give a key word its own
   colour or face with `{ word, color, face }`, or all of them a colour with `hotColor`.
2. For tracked type, run `node plugins/vj/tools/track.mjs --in <clip> --box x,y,w,h --out <json>` on the subject and
   pass `anchor={(f) => pointAt(track, f, fps)}`; add `w` and `h` (the subject's box in canvas px) for a reticle that
   frames the subject. Without `anchor` the captions sit centred low.
3. Render stills on a few word frames and check the block fits beside the subject; set `place` if the subject jumps.
4. If a word is hard to read over a bright frame or a flash, set `halo` (`true`, or up to 1.5) rather than writing
   shadows into `glow`; leave it off on dark footage, where the warm glow alone reads.

## Fonts from outside Google Fonts

The plugin only loads OFL Google fonts (`FONTS`), so it ships nothing it cannot share. When a user wants a font that is
not in Google Fonts, they download it themselves to a folder outside the project's repository, and the project
loads it from there. Never copy these files into the repository, a plugin or `public/` that gets committed.

```tsx
import { loadFont } from '@kinetographdev/core/fonts';

loadFont({ family: 'Switzer', url: '/path/to/Switzer-Bold.otf', weight: 700 });

<HandCaptions heavy="Switzer" serif="Moonscape" ... />
<Text font="Switzer" weight={700} ... />
```

`url` is a path, a `file://` URL or an http(s) URL (downloaded once into the font cache). `.otf`, `.ttf` and `.ttc`
load. `<HandCaptions>` takes any loaded family in `heavy` and `serif`. `heavy` is set in italic, so when the family
has an italic face, load it too (`style: 'italic'`). `<Captions>` looks take only names from `FONTS`, so for a look use the closest one listed
in the table below.

Fonts that are popular in reels right now, with their licences (check the licence before a commercial job):

| Font | Feel | Where to get it | Licence | Closest in `FONTS` |
|---|---|---|---|---|
| Switzer | neo-grotesk, clean | built in: the default sans of every look, fetched from Fontshare's CDN | ITF Free Font Licence: free for commercial work, no redistribution | `Switzer` |
| Kineta | geometric display sans, tall capitals, compact heavy lowercase (Sanat Gupta's) | built in: ships with the plugin in `fonts/kineta`, from the kinetograph-fonts repo | MIT | `Kineta` |
| Poppins | heavy geometric sans: the bold keyword (often italic, often in one accent colour) of explainer reels | built in: Google Fonts | OFL: free for anything | `Poppins` |
| Barlow Condensed | condensed grotesk; its semibold italic caps are the 'REBELLION' / 'Selling Water' line | built in: Google Fonts | OFL: free for anything | `Barlow Condensed` |
| Gilroy | geometric sans many of those reels actually use | Radomir Tinkov (MyFonts, Fontspring) | paid; the free 'Light/ExtraBold' demo is personal use only | `Poppins` |
| Figtree | friendly geometric sans | built in: Google Fonts | OFL: free for anything | `Figtree` |
| Geist Serif | crisp modern serif; the Triangle cut has triangular dots on i and j | built in: the `geist` npm package's files from jsDelivr (one weight; the engine does not vary its variable weight) | OFL: free for anything | `Geist Serif`, `Geist Serif Triangle` |
| Brodine | rounded geometric display sans | no official source found | unknown, so do not use it | `Kineta` |
| Athelas | elegant book serif | installed with macOS (`/System/Library/Fonts/Supplemental/Athelas.ttc`); TypeTogether elsewhere | macOS only; buy it for other systems | `Playfair Display` |
| Moonscape | condensed high-contrast serif | Sohel Studio (MyFonts, Fontspring); demo on befonts.com | demo for personal use; buy it for client work | `Instrument Serif` |
| Nofex | expanded heavy caps, retro | Ronny Studio (MyFonts, YouWorkForThem); demo on befonts.com | demo for personal use; buy it for client work | `Archivo Black` |
| Bootzy | soft heavy grotesk, gritty | YouWorkForThem | paid only | `Archivo Black` |
| Optizither | formal script | no official source found | unknown, so do not use it | `Bodoni Moda` italic |

A demo can be missing letters or ligatures. Render a still of every word it sets before using it.

## BoilStack

`<BoilStack lines={['SHAKE', 'THE', 'FLOOR']} />` in a composition of `BOIL_FRAMES` (64) frames at 12 fps, or twice
that at 24. A title, not captions: no word timings. Keep the words short and the middle one shortest; the colours end
up top, middle, bottom in `colors` order. Full reference: README.md, `<BoilStack>`.
