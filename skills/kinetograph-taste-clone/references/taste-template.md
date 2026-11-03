# Measured taste

A taste is one reel's style, separated from its content: everything you would need to make a *new* reel that looks and
moves like it, with different words, objects and length. A clone copies one film; a taste lets you make many.

It is written from the measured spec (and, better, from a clone that passed its gates, which proves the numbers).
Every value is a number or a rule with numbers, never an adjective. Two files, next to the reference:

- `TASTE.md`: the taste in prose and tables, for people and agents.
- `taste.json`: the same values, for code (a component or kit reads it as its defaults).

## What goes in (and what stays out)

In: anything that would be the same in another reel by the same maker. Out: this reel's words, objects, beat count,
and exact frame numbers (frame numbers become durations and ratios).

| Taste | Contents | Example (pin 1119) |
|---|---|---|
| `format` | aspect, fps, typical length, beat length range | 9:16, 30 fps, 15–20 s, beats 36–125 f |
| `paper` | background per beat kind: colour, texture, vignette, grain | white #fdfdfd flat; black #000 |
| `palette` | inks by role (lead, keyword, accent, on-dark variants) | lead #111; keyword #a24440; on black: keyword core #e0606a + bloom |
| `type` | families, weights, italic, case, size per role as a fraction of W, tracking, line pitch, alignment, block position | Poppins italic; lead 0.038 W medium; keyword ExtraBold, -0.04 em, line height 0.9 |
| `writeOn` | chars per frame (range), per-letter pose, settle frames; word fade frames, blur start, stagger | 0.8–2.5 c/f; letter 0.7 scale, 0.4 em up, -10°, settles 3 f; words 8 f fade, blur 10 px@720 → 0, 3–8 f apart |
| `light` | light direction; shadow kind per object class with numbers | top right; ground band 0.55 / 0.025 H / 0.35 W left; cast 0.4, (-0.015 W, +0.012 H), blur 0.025 W |
| `objects` | how objects are rendered and sit: photo or drawn, colour treatment, size against text, overlap rule | b/w photo cut-outs, 0.45–0.9 W, always in front of the keyword, hiding at most its tail |
| `entrances` | each family: direction, curve, ratio per frame, duration, overshoot | rise from bottom, exp ease-out 0.88/f; slide from right, 0.82/f; no overshoot |
| `exits` and `transitions` | kind, direction, speed in W per frame, ease, frequency | hard cuts; L→R dissolve wave 0.046 W/f; parallax push left, quadratic, 3 speeds; circle wipe +0.115 W/f |
| `ornaments` | recurring graphic elements with their motion | concave 4-point corner stars: grow 6–7 f, breathe ±10%, needle tips |
| `camera` | push, drift, shake, or none | none |
| `rhythm` | how beats are paced: hold after text completes, beats per 10 s, cut on what | 0.5–1 s hold after the keyword lands |
| `dark` | how dark beats differ: glow, colours, what is dropped | bloom on type (tight 0.006 W + wide 0.025 W), blurred red corner stars |

## taste.json shape

```json
{
  "name": "<slug>",
  "source": { "url": "<reel url>", "spec": "<path to SPEC.md>", "clone": "<path to passing clone or null>" },
  "format": { "aspect": "9:16", "fps": 30, "lengthS": [15, 20], "beatFrames": [36, 125] },
  "paper": { "light": "#fdfdfd", "dark": "#000000", "vignette": 0, "grain": 0 },
  "palette": { "lead": "#111111", "keyword": "#a24440", "onDark": { "lead": "#ffffff", "keyword": "#e0606a" } },
  "type": { "family": "Poppins", "italic": true, "lead": { "size": 0.038, "weight": 500 }, "keyword": { "size": 0.2, "weight": 800, "tracking": -0.04, "lineHeight": 0.9 } },
  "writeOn": { "charsPerFrame": [0.8, 2.5], "letter": { "scale": 0.7, "liftEm": 0.4, "rotDeg": -10, "settleFrames": 3 }, "word": { "fadeFrames": 8, "blurW": 0.014, "staggerFrames": [3, 8] } },
  "light": { "from": "top-right", "ground": { "alpha": 0.55, "heightH": 0.025, "blurH": 0.012, "reachW": 0.35 }, "cast": { "alpha": 0.4, "offset": [-0.015, 0.012], "blurW": 0.025 } },
  "entrances": [{ "name": "rise", "from": "bottom", "curve": "exp", "ratio": 0.88, "overshoot": 0 }],
  "exits": [{ "name": "dissolve", "dir": "ltr", "speedW": 0.046 }],
  "transitions": [{ "name": "circleWipe", "growW": 0.115 }],
  "ornaments": [],
  "camera": null,
  "rhythm": { "holdAfterKeywordS": [0.5, 1] },
  "dark": { "glow": [{ "blurW": 0.006, "alpha": 0.9 }, { "blurW": 0.025, "alpha": 0.6 }] }
}
```

Units: sizes and distances are fractions of W (or H where named), times are frames at the taste's fps.

## Making a new reel from a taste

1. Write the new script in the taste's roles (lead line, keyword, object per beat), with the taste's beat lengths.
2. Build each beat from the taste's values only. Choose assets by the taste's `objects` rule.
3. Gate it with the gates that do not need a frame-for-frame reference: G3 colour, G4 type, G5 shadows, G6 edges,
   G7 legibility, G8 glow, G12 assets, against the taste's numbers. Put one of its beats next to a similar beat of the
   source reel with `gate.sh` and look.

## Landing a taste in kit/tastes

In kinetograph-ui, the explainer family's taste becomes `tastes/explainer/tastes/<name>.ts`, typed as the engine's
`ExplainerTaste`, plus a row in `tastes/explainer/TASTES.md` naming the source reel and the taste files. The type is in
`tastes/explainer/taste.ts`, the field table with units in `tastes/explainer/TASTES.md`. A taste file is
`defineTaste({ ... })`; every group is partial and unset values inherit `BASE` (pin 1119). Set only what was measured;
if anything inherits, `meta.measured = false`.

| taste.json | ExplainerTaste | Conversion |
|---|---|---|
| `name`, `source.url` | `meta.id`, `meta.source` (pin id, or `'original'`) | `meta.title`, `meta.useWhen` written from the reel's subject and tone |
| `paper.light`, `paper.dark`, `paper.vignette`, `paper.grid` | `paper`, `dark`, `vignette` (0–1), `grid` | — |
| `palette.lead`, `palette.onDark.lead` | `ink`, `inkOnDark` | — |
| `palette.keyword`, `palette.onDark.keyword` | `keyword`, `keywordOnDark` | on-dark is the measured core colour, not the on-white red |
| accent (highlighter or coloured word) | `accentMode` (`ink` / `highlight`), `highlight` | — |
| `type.family`, `type.italic`, `type.lead.weight`, `type.keyword.weight` | `font`, `italic`, `leadWeight`, `keyWeight` | — |
| `type.lead.size`, `type.lead.tracking` | `text.leadSize` (W), `text.leadTracking` (em) | — |
| `type.keyword.tracking`, `type.keyword.lineHeight`, line gap | `text.keyTracking`, `text.keyLineHeight`, `text.keyGap` (em) | — |
| `writeOn.charsPerFrame` | `text.leadRate` | use the median of the measured range |
| `writeOn.letter` (pose per frame after landing) | `text.hop[]`: `{ s, y (em), r (deg) }` per frame | one entry per settle frame, read off consecutive full frames |
| `writeOn.word.fadeFrames`, `.blurW`, pop | `text.fade` (frames), `text.blur` (W), `text.pop` | blur px at width w → px / w |
| `entrances` rise / slide ratio | `motion.riseKeep`, `motion.slideKeep` | the ratio r of remaining distance kept per frame |
| rise creep after landing | `motion.riseCreep` | — |
| `exits` push, per layer | `motion.push` [lead, key, object] (W/frame²), `motion.pushLag` [frames] | quadratic fit `x = -k·(t - t0)²` → k |
| `exits` dissolve | `motion.waveSpeed` (W/frame), `motion.waveFade` (frames) | — |
| `light.cast` | `light.castAlpha`, `light.castOffset` [W, H], `light.castBlur` (W) | — |
| `light.ground.alpha` | `light.groundAlpha` | the band's height and reach are the engine's; report a mismatch |
| ornament shadow | `light.shapeAlpha`, `light.shapeOffset` (W), `light.shapeBlur` (W) | — |
| `dark.glow` tight / wide | `light.glowTight`, `light.glowWide` (em of the keyword size), `light.glowStrength` | blurW × W / keyword px size |
| `ornaments` corner shapes | `shapes.corner`, `shapes.cornerOnDark` (`needle`/`sparkle`/`asterisk`/`dot`/`ring`/`plus`/`none`), `shapes.grow`, `shapes.breathe`; `star`, `starOnDark` colours | grow = share of the remaining size left per frame |
| small print | `shapes.smallPrint` (`barcode` / `none`) | — |
| `transitions` | `transition.wipe` (`circle`/`blinds`/`cut`), `transition.speed`, `transition.bands` | circle: W/frame; blinds: frames per band |

| `type.lead` family / italic when it differs from the keyword | `leadFont`, `leadItalic` | — |
| `paper` graph grid | `gridCell` (W), `gridInk`, `gridStrength` | cell px / W |
| lead writes by word, not letter | `text.leadMode` (`letters` / `words`) | — |
| lead line bob while writing | `text.leadBob[]` (em per frame, down positive) | measured per-frame table |
| keyword fade start and rise | `text.fadeFrom` (first-frame opacity), `text.rise` (em below the line), `text.riseKeep` | — |
| keyword bob on dark beats | `text.bob[]` (em per frame), `text.bobLag`, `text.bobGain` | measured per-frame table |
| ink-coloured words on an accent line | keyword line `plain: true` (per use, not per taste) | — |
| spring entrance | `motion.spring[]` (scale per frame, Prop `enter="spring"`) | measured per-frame table |
| `light.from` | sign of `light.castOffset[0]`: − = light top right (shadow down-left), + = light top left (shadow down-right) | corner-shape shadows and ground bands follow it |
| camera push-in | `camera.pushAmount`, `camera.pushKeep`, `camera.pushDrift` | fit scale = 1 + amount·(1 − keep^n) + drift·n |
| camera pan | `camera.panRise` (frames), `camera.panKeep` | speed ramps as ((i+1)/(rise+1))^1.5, then × keep per frame; the gap is per use |
| camera roll | `camera.rollFrom` (deg), `camera.rollKeep`, `camera.rollOut` [a, b] | out: deg = a·n + b·n² |
| arrival blur | `camera.arriveBlur` (W), `camera.arriveFrames` | — |
| zoom-out exit | `camera.zoomOut[]` (scale per frame), `camera.zoomFade` [from, to] | measured per-frame table |
| flicker | `camera.flicker[]` (brightness per frame) | measured per-frame table |
| eased iris | `transition.radii[]` (W per frame; empty = linear `speed`) | measured per-frame table |

A measured per-frame curve goes in as a table (bob, spring, zoomOut, flicker, radii); a fitted curve goes in as its
constants (push, pan, roll). Fit against every frame of the reference and report the worst error, as the engine's
owner did (933 push: within 0.033 scale; 971 pan: within 2.6%). The camera engine is `tastes/explainer/camera.tsx`.

**Gaps (not expressible yet; report them to the engine's owner with the measured numbers):** flying-prop layers (971's
banknote rain), 933's grey S-band, footage-filled letters (1101), a letter-by-letter blur write-on with a highlighter
box (422), and anything else the taste has with no row above. Keep those values in taste.json so nothing is lost when
the engine grows.

## Merging tastes into one family

With tastes from several reels by the same maker or in the same family, the values that agree are the kit's defaults
and the ones that vary become props with the observed range. That merge is the taste family owner's job; hand it the tastes.
