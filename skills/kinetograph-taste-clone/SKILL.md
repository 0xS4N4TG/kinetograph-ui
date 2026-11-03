---
name: kinetograph-taste-clone
description: "Clone any reel or reference video 1:1, or extract its taste (a reusable style). Downloads the reel (Pinterest, Instagram, X, TikTok, YouTube, any yt-dlp URL), reads every frame, writes a measured spec, builds from the spec's numbers, and passes per-shot gates (timing, layout, colour, type, shadows, cut-out edges, legibility, glow, blur, transitions, assets) against the reference side by side at full size before showing anyone. Taste mode distils the reel's style (palette, type, write-on, light and shadows, entrances, transitions, rhythm) into TASTE.md + taste.json for making new reels in that style or adding a taste to kit/tastes. Use when the user gives a reel or reference and asks to clone, recreate, match, copy 1:1, port, 'make ours like this', 'make a taste/DNA/gene from this', or says a clone is 'not accurate', 'not the same', 'flat', 'no shadows'. Works with Kinetograph, Remotion, or any frame-based renderer."
---

# Kinetograph Taste Clone

A clone fails when it is built from an impression of the reference. This skill builds it from measurements and does
not call it done until every shot passes its gates side by side with the reference, frame for frame, at full size.

## Modes

| The user wants | Mode | Steps |
|---|---|---|
| "clone this", "make ours like this", "1:1" | **Clone** (default) | 1–6, then offer step 7 |
| "make a taste / DNA / gene from this reel", "a style like this for new reels" | **Taste** | 1–3, then 7; better after a passing clone (1–6), which proves the numbers |
| both | **Clone + Taste** | 1–7 |
| "make a component like this" (a UI/chart/audio demo, a snapcn or Bklit scene) | **Component** | 1–6 with `references/component.md`, then offer 7 |
| the look *is* the drawing: hand lettering, illustration, cut paper, scribbles, frame-by-frame animation | **Trace** | 1–2, `scripts/trace.py`, then 6 on the study; for a shipped piece, redraw our content in that hand (below) |

When it is unclear, clone first: a taste written from a clone that passed its gates is measured; one written from
watching is a guess. After every passing clone, offer the taste in one line.

**What "1:1" means here:** our own words, objects, names and brand, with the reference's exact timing, camera, layout,
type behaviour, blur, shadows, light, cut-out treatment and transitions. Never the reference's text, logos, people or
marks: those are swapped for ours in the same role, length and silhouette.

## The rules (each one comes from a clone the user rejected)

1. **Read every frame, never samples.** Contact sheets at 5 fps miss the write-on, the settle and the shadow. All
   frames go on sheets (30 per sheet) for reading motion; measurements are taken on full-size frames.
2. **Numbers, not adjectives.** A spec line says `head top y 0.352 H at f55, exponential ease-out 0.88/frame`, never
   "rises smoothly". If a value is eyeballed it is marked `(est)` and measured before the build relies on it.
3. **Build from the spec, not from memory of the video.** Keyframes are copied from the spec's tables. No engine
   default stands in for a measured look: not `drop-shadow()`, not `textShadow`, not a stock ease, not a default blur.
4. **Assets are chosen for the shot, not borrowed.** Each object is matched to the reference's silhouette (head width
   against the text block, upright or leaning, photographic or drawn) and is a clean still cut-out with real alpha.
   Never a video matte, never an asset from another component forced into the slot. Public domain or CC0 only.
5. **Gate every shot before showing it.** The user sees a clone only after `gates.md` passes for every beat. Report
   which gates fail; never call a clone done when one does.
6. **Flat means a missing measurement.** When the user says "flat", the clone is missing a shadow, shading, depth of
   field, bloom or a highlight that the reference has. Find it with `measure.py`, do not guess.
7. **Delegate the reading, keep the judging.** Frame-by-frame spec writing goes to Sonnet agents at medium effort
   (`model: "sonnet"`, `effort: "medium"`), one per beat range, at most 5 at once. The main model merges the specs,
   measures the doubtful values and judges every gate.
8. **Clone first, extract the taste after.** A taste is most trustworthy when written from a clone that passed. A taste
   family (a shared look across reels) is merged from several tastes, never built straight from watching references.

## Drawn references (Trace)

When the reference is drawn rather than built (hand-lettered words, an illustrated character, scribbles, cut paper),
measuring positions and redrawing in a font or primitives cannot reach 1:1: the shapes themselves are the look. Trace
them:

- `scripts/trace.py FRAMES OUT GROUND ink=#hex ...` vectorises every frame with potrace, one layer per ink (each pixel
  to its nearest ink or the ground), and writes `trace.json` plus `study.tsx`, a composition that redraws the frames in
  flat inks. Add what flat paths lose: glow, halftone, grain, tinted knockouts. Gate the study like any clone (G1–G14);
  a traced study should land under about 15 mean difference per frame.
- The traced shapes are the reference author's artwork. OUT must be in the git-ignored `_reference` folder (the script
  refuses anything else): the study is private, for learning and for gating, and is never shipped, committed or
  registered as a component.
- A shipped piece (a plugin component, a template) draws our own content in the hand the study shows: hand-drawn with
  p5.brush (`@kinetographdev/p5-brush`) or hand-made paths, its distortion, slant, boil rate and texture measured on the
  study. Its timing, layout and motion are still the reference's, copied from the spec as in Clone mode.

## Workflow

### 1. Intake
- A URL: `scripts/fetch.sh URL <gitignored dir>` downloads it with yt-dlp (best quality, `.info.json` beside it) and
  probes it. In kinetograph-ui the dir is `components/_reference/<slug>/`. A file: copy it there.
  Copyrighted media is never committed; the script warns if the file is not gitignored.
- `scripts/probe.sh REF` → width, height, fps, frame count. The clone renders at the same aspect, fps and length.

### 2. Extract
- `scripts/frames.sh REF WORK/ref` → every frame full size (`full/f0000.png`, 0-based) and on sheets of 30
  (`sheets/sNN.png` = frames 30·NN … 30·NN+29).
- `scripts/timeline.py REF --json WORK/ref-timeline.json` → hard cuts and every move's start and settle frame. These
  are the beat boundaries the spec is split on.

### 3. Spec
- Split the film at the cuts into beat ranges. Brief one Sonnet/medium agent per range with
  `references/reader-brief.md`, filled in. Each writes its section in the format of `references/spec-template.md`.
- Merge into one `SPEC.md` next to the reference. Then measure, with `scripts/measure.py` on full frames, every value
  that a gate depends on and that came back `(est)`: colours, paper, bounding boxes, shadow strength and falloff, glow
  width, blur. Replace the estimate with the measurement.
- The spec must answer every row of `references/gates.md` for every beat. A blank row is a gap to fill now, not
  during the build.

### 4. Assets
- For each object in the spec, write its slot: role, silhouette, size against the text, where it overlaps the type and
  which letters it hides, photographic or drawn, and how it sits (standing on the floor, or cropped by the frame).
- Source a public-domain or CC0 still that fits the slot (Wikimedia Commons, The Met Open Access, Smithsonian Open
  Access, NGA). Fetch it through a real browser (the `browser-driver` agent); never set a custom User-Agent. Cut it
  out with clean alpha, with no fringe (check with `measure.py line` across the edge). Credit it in the assets'
  `CREDITS.md`.
- No still fits? Pick a different object with the same silhouette and role. Never resize or crop a wrong asset into
  the slot: that is what hid the keyword in clone A.

### 5. Build
- One beat at a time, in the reference's depth order (spec section 0). Keyframe tables go in literally (per-frame
  positions as arrays, interpolated linearly between measured frames when the spec gives them).
- Shadows, glow and blur follow `references/looks.md`, which turns the spec's measurements into layers.
- Render the beat at the reference's size. Run the beat's gates (step 6) before starting the next beat.

### 6. Gate (per beat, then the whole film)
- `scripts/timeline.py REF CLONE` → G1 timing: every cut and every move start and settle within ±1 frame.
- `scripts/gate.sh REF CLONE WORK/gates F…` for, per beat: the first frame, the middle of each entrance, the settled
  frame, the middle of the exit, and the last frame. Each output is reference | clone | difference ×4 at full size.
  Look at every one.
- Go through `references/gates.md` row by row for the beat. Measure where it says measure. Fix, re-render, re-gate.
- When all beats pass: `scripts/compare.sh REF CLONE OUT-compare.mp4` and show the user the side-by-side, with a list
  of anything that is a deliberate difference (our words, our objects) and anything still failing.

### 7. Taste (the reel's style, reusable)
- Write `TASTE.md` and `taste.json` next to the reference, following `references/taste-template.md`: the style without the
  content (palette, type, write-on, light and shadow model, object treatment, entrances, exits and transitions,
  ornaments, camera, rhythm, dark beats). Frame numbers become durations and ratios; this reel's words and objects are
  left out.
- Every value comes from the spec's measurements, and from the passing clone where there is one (cite its file).
- **Where a taste lands.** In kinetograph-ui, a taste for the explainer family becomes a preset in the explainer
  engine: `tastes/explainer/tastes/<name>.ts` (taste.json's values mapped onto the engine's `ExplainerTaste` type) plus one
  row in `tastes/explainer/TASTES.md`. Keep `TASTE.md` and `taste.json` beside the reference as the measured source the
  preset cites. A reel in another taste's family (`vox`, `print`, `archive`, `papercut`; the catalogue is `kit/tastes/README.md`)
  maps onto that taste's folder the same way. A reel that fits none keeps its taste files only, until a taste for its
  family exists.
- To make a new reel from a taste, or to merge several tastes into one taste family, follow the last two sections of
  `references/taste-template.md`. The engine itself (`tastes/explainer`) has its own owner: add presets, report gaps in the
  engine rather than editing it.

## Files

| File | What |
|---|---|
| `references/gates.md` | The per-shot checklist: what to measure, how, and the pass threshold |
| `references/spec-template.md` | The spec's sections and the level of detail each needs |
| `references/reader-brief.md` | The brief for a Sonnet frame-reading agent |
| `references/looks.md` | How measured shadows, glow, blur and write-ons become layers (Kinetograph and Remotion) |
| `references/taste-template.md` | The measured taste: what goes in, taste.json shape, making a new reel from it, merging tastes |
| `references/component.md` | Component mode: props, defaults that reproduce the reference, registration, poster frame |
| `references/misses.md` | Every rejection so far, what was wrong, and which gate now catches it |
| `scripts/fetch.sh` | Download a reel by URL (yt-dlp) into a gitignored folder, with its info.json |
| `scripts/probe.sh` | Size, fps, frame count |
| `scripts/frames.sh` | Every frame full size, plus sheets of 30 |
| `scripts/timeline.py` | Cuts, moves and settles; with a clone, the G1 timing gate |
| `scripts/gate.sh` | Reference, clone and difference side by side at full size, per frame |
| `scripts/measure.py` | color, line, bbox, diff, shadow: the numbers behind the gates (no numpy needed) |
| `scripts/compare.sh` | The whole film side by side for the user |
| `scripts/trace.py` | Drawn references: every frame vectorised per ink (potrace) into a private study composition |

This skill lives in the kinetograph-ui repo at `skills/kinetograph-taste-clone/` (symlink it into `~/.claude/skills/`
to use it everywhere). Scripts need only `ffmpeg`, `ffprobe`, `python3` and (for URLs) `yt-dlp`; `trace.py` also needs `potrace` and PIL. Run them by their path in this skill's folder.
