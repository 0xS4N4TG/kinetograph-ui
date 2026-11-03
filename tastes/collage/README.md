# collage

A vox-style paper collage: archive cut-outs, torn yellow labels and a torn charcoal strip, layered over a real old
newspaper page, moving in stop motion. Measured off a reference reel and timed to it in `tastes/collage/demo`, which is
built only from this kit.

Use it for history and "how it happened" explainers, documentary hooks, anything that should feel cut from old print.

## The rules (tokens.ts says which reel each came from)

- Stop motion: 12 images a second on twos, a 3-frame hold once a second. Only fades step every frame.
- No pan or rotation. Every layer scales about the screen centre on its own curve: depth is parallax. Focus racks by
  blurring whole layers.
- The ground is any paper that suits the shot, and it changes from shot to shot: kraft cardboard, flat coloured paper
  (cream, teal, grey, tan), a map, an old page from the story's time. A newspaper is one option, not the rule (the
  bundled 1915 page belongs to the demo).
- Cut-outs are clean and hard-edged, black and white with a warm cast; one colour picture tinted peach-orange.
- Labels are torn yellow paper, Didone caps typed on (newest letter at 40 %); they leave by flying past the lens.
- The strip is torn charcoal paper with white Didone caps and a 1.5 px red/blue split.
- No shadows, vignette or glow. One static dither screen over the frame.
- Our own words and masthead. Never a real paper's name or a brand on screen, and no real person's name unless the
  reel is about that person (a history subject).

## Pieces

| Piece | What |
|---|---|
| `imageStarts`, `heldImage`, `tab`, `boxAt` (time.ts) | The stop-motion clock and measured-key curves |
| `Depth` | A depth plane: scale about the centre, blur, shift. The taste's only camera |
| `PrintedPage` | The newspaper sheet: scan, our masthead/dateline/headlines inked over a cleared band, a screened photo, sepia grade, creases, newsprint |
| `MapPunch` | The opening: an old map on white with a torn hole, zoomed past the lens with a decaying zoom blur |
| `TornLabel` | A torn yellow label (paper plugin `CutOut` on a paper scan) typing on, with the fly-off smear |
| `TornStrip` | The torn charcoal strip, white Didone with the colour split, a paler sliver, an optional script word |
| `Highlighter` | The translucent yellow bar (multiplied) |
| `GridOverlay` | Fine white hairlines fading in over the lower frame |
| `Dither` | The static dither screen |
| `Punch` | The cut between shots: a torn hole punched through the shot before (or any picture), zoomed past the lens |
| `PaperSheet` | A map, manuscript or title page as the sheet under a shot (sepia grade, creases, newsprint) |
| `Beat` (beat.tsx) | One explainer shot: the reference's measured choreography with two reading holds. Sheet, up to three labels sized to their words, a wide picture on a ledge, a portrait sliding in from either side, the strip, a script word, an optional highlighter sweep. `beatFrames`, `beatStarts` lay beats end to end |

## Shots

The taste has five shots, all measured off the reference reel (specs not committed). Cut
an explainer from several of them, each on its own ground, rather than repeating one.

| Shot | File | Ground | Spec |
|---|---|---|---|
| Dolly-through: labels, portrait, strip, script | `beat.tsx` (`Beat`) | any sheet: map, page, manuscript | spec-0000-0078 |
| Taped photo: a bordered print thrown onto kraft, settling, punch-in exit | `taped.tsx` (`TapedPhoto`) + `Captions` | kraft card | spec-0078-0180 A |
| Poster: portrait with a map screened on the body, giant numerals, stamp, drawn-on marks, typed ticks | `poster.tsx` (`Poster`) | beige stained paper, 8 px dots | spec-0078-0180 B |
| Person montage: pieces easing in, accent disc, stamped name tag | `montage.tsx` (`Montage`, `quick` for the fast variant build) | cream, teal, grey, tan (`GROUNDS`) | spec-0420-0945, spec-0940-1040 |
| Clouds over a map: banks close, part as the map pushes in about a dot | `clouds.tsx` (`CloudsOver`) | the map | spec-0940-1040 V4 |

Cuts: hard cuts between shot types (the reference's own), `Punch` to tear through the shot before, `MapPunch` to open on
a map. `kraft.jpg` is the user's own generated texture.

## Making an explainer

Write one `Beat` per idea (labels: the when and where; strip: the sentence; script: the aside), each arriving through
`MapPunch` (a map) or `Punch` (torn through the beat before). A beat is 131 frames at the default holds (5.2 s at 25
fps); `holds: [labels, strip]` in frames lengthen the reading time. `PrintedPage`'s `heads` cover the scan's own
legible headlines with ours. Example: `templates/dostoevsky` (nine shots, all five types, 40 s).

## Textures

`textures/`, linked into an effect's public folder as `collage-textures`:

- `page-scan.jpg`: a 1915 front page (Internet Archive, public domain), greyscale, 1674 px wide. Its masthead and top
  band are always covered by `PrintedPage`.
- `page-patch.png`: blank paper matched to the scan's tone.
- `label-short/mid/long.png`, `strip-paper.png`: yellow and charcoal paper.
- `dither.png`: the static screen.

The page patch, labels and strip are made from Texturelabs paper scans (free to use in videos, not to be
redistributed as files); `tools/textures.py` rebuilds them from the scans (not committed).
