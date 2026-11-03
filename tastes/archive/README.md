# archive: historical photographs brought to life

The old-film documentary look: 19th- and early 20th-century photographs shown the way a history documentary shows
them. Each still becomes a shot (cut into layers and slid past a camera), sits in a projector gate (weave, flicker,
dust, scratches), is printed as the process it was made with (daguerreotype plate, albumen print, salted paper), and
is labelled like an archive keeps it (dates, places, catalogue tags in typewriter; what is said in a book serif).

Use it for history, biography, "how things used to be", anything told through period photographs and documents.
Do not use it for modern footage or bright product work: the palette is soot, velvet, brass and paper.

Example: `tastes/archive/demo` ("Hold still", the first photographs, 30 s).

## Where it comes from

| Technique | Reel | In the kit |
|---|---|---|
| Photo cut into fore/mid/back, holes filled, camera slide, 3 : 1 : 0.6, fore defocused, on twos | DZsDDmvtNJP | `ParallaxPlate` (kit/looks `Parallax` + `Posterize`), tools/cutfull.py, harden.py, fillhole.py |
| Gate weave and exposure flicker | Da3YpRipHuF, and the reference's presets GateWeave.ffx, HeavyFlicker.ffx, Secret Sauce.ffx | `Weave`, `Flicker` (film.tsx), kit/looks `GateWeave` |
| Window-light shadow multiplied (0.53) drifting; dust | DdKZ5oBpPCW | `ArchiveFinish light=`, kit/looks `WindowLight`, `Dust` |
| Edge lens blur, dust, offset vignette, slow push | DZFqNzwAqVa | `ArchiveFinish` (kit/looks `EdgeBlur`, `Dust`, `Vignette`) |
| Cut on the fastest frame of a speed-spike scale, on twos | DaDhDFjAysT | kit/looks `CurveCut` inside `Posterize step={2}` |
| CC Page Turn on documents, posterized | Dafr0KjAkve | kit/looks `PageTurn` inside `Posterize step={4}` (7.5 fps at 30) |

Preset numbers used (read from the .ffx files): GateWeave.ffx
Transform Position `fps = 24; seedRandom(Math.floor(time * fps), true); jitter = 1.5; value + [random(-jitter, jitter), random(-jitter, jitter)]`;
Secret Sauce.ffx Exposure `flickerStrength = 0.04; freq = 2; holdTime = 1 / freq;` (a value held half a second) plus
Add Grain and Posterize Time; HeavyFlicker.ffx Exposure `wiggle(24, .2)`.

## Components (`import ... from 'tastes/archive/index.js'`)

Tokens (tokens.ts)
- `ARCHIVE` palette: soot, umber, velvet, brass, silver (type on dark), ash, paper, ink, stamp (the one accent, oxblood).
- `PROCESS`: daguerreotype, albumen, salted, silver: shadow and highlight colours, levels, gamma, grain.
- `FONTS`: EB Garamond (what is said), Courier Prime (what the archive records).

Picture (photo.tsx)
- `ArchivePhoto {id, src, process, position, zoom}`: a photo filling the frame, toned and grained.
- `Toned {id, process}`: tones anything inside (a parallax stack, an album page). Full frame.
- `toneEffect(props, W, frame)`: the WGSL effect itself, for your own `<Layer effects>`.

Film (film.tsx)
- `ArchiveFinish {picture: (copy) => node, push, blur, focus, light, weave, flicker, heavy, dust, scan, vignette}`: a
  finished shot. `picture` is called once per copy ('a', 'b') so the edge blur's copy gets its own layer ids.
- `Weave` (the preset), `Flicker` (held + per-frame), `FilmScan` (scanned film texture, screened, jumping on twos).

Type (type.tsx), one move at a time
- `Dateline`: typewriter caps typed a character a frame behind a caret, a lead rule. Dates and places.
- `Develop`: a headline coming up like a print in the developer, line by line (soft and bright to sharp).
- `Line`: a plain fade-up line (serif or typewriter). `shadow={false}` on paper.
- `Tag`: a catalogue tag, paper and ink, red accession number, dropped in.
- `Scrim`: a dark gradient from the bottom or top so light type always reads.

Layouts (layouts.tsx)
- `PlateMat`: the brass mat of a cased daguerreotype over velvet, as a parallax near layer; type goes on the velvet below.
- `ParallaxPlate`: layers (back with its hole filled, cut-out subject) + optional near layer, a push, on twos, toned.
- `AlbumPage`: card stock, ruled border, prints in photo corners, typed labels; turn it with `PageTurn`.

Sound (tools/)
- `sfx.py <dir>`: projector (31 s bed loop), shutter (hard cuts, 1 frame early), advance (under a curve cut), key0-2
  (one per typed character), bell, rustle (tags, pages), thud, flick (page turn), runout (the end).
- `score.py <out.wav> --cues '{"lift": s, "turn": s, "end": s}'`: slow piano over soft strings, A minor.
  Mix: score about 0.8, projector about 0.4, keys about 0.3; the example measures -15.6 LUFS, -2.0 dBTP.

Textures: `textures/film-scan.jpg` (a Texturelabs scan, downscaled; usable in videos, not to be redistributed). Link it
into the effect's public folder as `archive-textures`, and `sfx/` as `sfx`.

## Rules

- Light type (silver) only over a Scrim, the velvet or the vignette's dark; on paper, ink. Never light type on paper.
- One text move at a time: Dateline, then Develop, then (if any) a Tag.
- Camera moves on twos; page turns on fours (7.5 fps); type and film texture run at full rate.
- Every `<Layer>` id unique: a picture drawn twice (sharp and edge-blurred) gets two ids, which `ArchiveFinish`'s
  `picture(copy)` makes easy.
- Pictures public domain or CC0 (The Met Open Access works with plain curl); dates and claims checkable.
