# papercut

A short vertical explainer that looks like a photographed paper diorama. Every set is a generated construction-paper room,
every prop and character is cut paper in code (grain, rough edge, drop shadow, light from the top-left), the camera
orbits the set so the paper layers separate, and text arrives as torn paper tags. It comes from the user's own
papercut-explainer library and the reels made with it (the tiny-agent episodes: agency, roast, strata, pixelleak).

It runs on Kinetograph unchanged: the kit is Remotion-shaped TSX with divs, SVG filters and CSS, which the engine draws
in compat mode.

## When to use it

- AI, automation and developer-tool explainers: how something works in four or five steps, a repo or tool drop, a
  "what happens when" story. The props already cover models, tokens, GPUs, servers, terminals, repos, chat apps.
- A friendly, toy-like tone: a mascot (the boxy critter) acts out each step.
- Not for documentary, news or photo-led stories (use `vox` or `explainer`), and not when the reel must look serious or
  premium; this taste is warm and playful.

## The look, in rules

- One backdrop per set from `BACKDROPS` (24 sets). Change set on every banner; rotate warm, cool, night and day.
- Stand everything on the backdrop's `floorY`. Keep faces and key props between y 450 and 1400: the banner owns the
  top (y 270-400), the caption tags own the band at y about 1430-1530.
- Cast: one critter body for everyone. `You` (clay, blue cap) is the viewer; `AiBot` (lilac, teal visor, AI pill) is
  the model. Cast members differ by colour, accessory and name pill, never by shape.
- Text: `TapeBanner` (Archivo Black caps on a taped cream strip) says the fact of the set; `WordTagCaptions` (Fraunces
  900 on red torn tags, three words a page) carry the narration; `HookTitle` is the cover on frame 0. Text inside props
  is JetBrains Mono (screens, tokens, receipts) or Inter (UI). Dark text on light paper only.
- Motion: springs and `PopIn` for arrivals, `hop` on every beat, `Boil` on screen-space paper. Nothing eases linearly.
- Finish: `FilmWeave` around the scenes, `GrainOverlay` on top, `LensDirt` only in lit night sets.
- Sound: a small paper sound on every visual event (pop, snip, tape-peel, page-flip, printer, stamp), cuts 1 frame
  early, a marimba bed underneath, about -15 LUFS with the true peak under -1 dBTP.

## Components, in the order a reel uses them

1. **Root**: `PaperDefs` once at the root (the `rough` and `torn` SVG filters every paper piece uses). `tokens.ts`
   loads the local fonts (`fonts.ts`) and gives the palette `C`, `FONT` and `T`.
2. **Timeline**: `CutSeries` from `paper/transitions` instead of `Series`, with a cut per incoming set: `tapePull` (the
   default), `whip` (topic switch), `zoomThrough` (go inside), `pageTurn` (next step), `popUpBook` (new chapter),
   `tearAway` (something breaks), `stampCut` (verdict), `keyhole`, `burnAway`, `infiniteZoom`. `CUT_DEFAULTS` gives
   each one's length and its sound.
3. **Set**: `Backdrop name` + `BACKDROPS[name].floorY` (`paper/backdrops`). `Room`, `Window`, `Shelf`, `Plant`, `Lamp`,
   `Sticky` (`paper/sets`) for a code-drawn room instead.
4. **Camera**, wrapping each set (`paper/camera`): `OrbitCamera` with `Depth z` layers (0 backdrop, 0.45-0.6 props and
   cast, 0.85-1 near things) is the house move. Then by beat: `PullBack` (scale reveal), `SnapZoom` (a number lands),
   `DutchTilt` (it goes wrong), `CrabTrack` (lists), `Crane` (tall sets), `FreezeFrame` (meme beat), `RackFocus`,
   `FocusHunt`, `TiltShift`, `ForegroundPass` (a blurred leaf or block across the lens), `CameraPush` (`paper/kit`).
5. **Cast**: `Critter` (`cast/Critter`), `You`, `YesBot`, `Agent` (`props/council`), `AiBot` (`props/ai`). Arms take a
   reach and an angle; `holdR` puts a prop in the right hand (`armTip` finds the hand).
6. **Props**, all cut paper:
   - AI and automation (`props/ai`): `TokenChip` (flips to its number), `Scissors`, `PaperCutter`, `ModelBox`,
     `OddsBoard` (next-token odds), `ReceiptPrinter` (one word per line), `BookStack` + `bookStackTop`, `ChatPhone`.
   - Screens (`ui/ui`): `Monitor`, `Laptop`, `AppWindow`, `Terminal`, `Pointer`, `Button`, `Progress`, `CountUp`,
     `RepoCard`, `ToolCard`.
   - Hardware (`props/gpu`): `GamingPC`, `GpuCard`, `RamStick`, `ServerRack`, `PaperCloud`, `SpeedGauge`, `Whale`.
   - Code and leaks (`props/leak`), plugs and cables (`props/cable`), usage gauges (`props/usage`), stage and phone
     props (`props/stage`), a sleeping crowd (`props/crowd`), a power-up aura (`props/aura`), everyday props
     (`props/everyday`: `Desk`, `WallCalendar`, `Clipboard`, `ThumbsUp`), ideas, bubbles and verdicts
     (`props/council`).
   - Primitives for anything new (`paper/kit`): `Paper` around a group, `Slab` (one cut piece with shade and highlight
     strips), `Disc`, `Pill`, `Card`, `TapeCorners` (`paper/tape`).
7. **Moments**: `PopIn`, `SlideIn`, `SparkleBurst`, `StampMark`, `DrawOnEllipse`, `Typewriter` (`paper/kit`);
   `MarkerCircle`, `MarkerUnderline`, `MarkerArrow`, and `RealShot` for the one real screenshot (`paper/proof`);
   `keyed`, `swing`, `onN` (`paper/motion`).
8. **Overlays**, above the cut series (`paper/hook`, `paper/overlays`): `HookTitle` from frame 0 until `outAt`, then a
   `TapeBanner` per set (hold it back until the hook leaves), `WordTagCaptions` with `bandY` about 0.745.
9. **Finish** (`paper/look`, `paper/kit`): `FilmWeave` around the `CutSeries`, `GrainOverlay` last. Optional:
   `FeltFibre`, `LensDirt`, `LampFlicker`, `Halftone`, `GraphPaper`.
10. **Last set**: `CtaPhoneDM` (`scenes/CtaPhoneDM`) when the reel ends on a comment-keyword ask.
11. **Sound**: `tools/sound.py` (numpy). `sfx <dir>` writes the SFX (`pop`, `pop3`, `drop`, `tape-peel`, `page-flip`,
    `whip`, `zoom`, `whoosh`, `slide`, `rip`, `stamp`, `thud`, `hit`, `snip`, `click`, `keys`, `type`, `tick`,
    `count`, `printer`, `scribble`, `ding`, `chime`, `sparkle`, `buzz`, `end-chime`); `bed <out.wav> <seconds>
    [preset]` writes the marimba or kalimba bed with its outro arpeggio. They are the papercut-explainer Web Audio
    recipes ported to numpy, so no audio files are shipped or licensed.

`index.ts` re-exports all of it, with a line per module.

## Files

| Path | What |
|---|---|
| `CATALOG.md` | generated reference for every export of the original kit (props, signatures, backdrop table) |
| `index.ts` | the index above |
| `props/ai.tsx` | added here: the AI props and `AiBot` |
| `tools/sound.py` | added here: the procedural SFX and bed |
| `public/` | backdrops (`bg/backdrops`), textures (`bg/textures`, `bg/grain.png`), fonts, `assets/wall.png` |

An effect uses the kit's `public/` by linking `bg`, `fonts` and `assets` into its own `public/` (see
`tastes/papercut/demo/public`) and putting its rendered sounds next to them.

## Example

`tastes/papercut/demo/index.tsx`: "How a chatbot answers you", 28 seconds, eight sets. It uses every step above.
