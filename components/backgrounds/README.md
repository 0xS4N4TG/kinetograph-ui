# Background components

Four textures that move subtly and sit behind anything. All 1920x1080, 30 fps, 300 frames (10 s). Every motion is a sine of
the frame with a whole number of cycles over the clip, so each loops seamlessly at `speed` 1, 2, 3 and so on. Other speeds
drift without looping. The shaders use `GlslShader`; Grain Gradient uses `MeshGradient`. Everything is a pure function of the
frame number (no random, no clock). Props have `.describe()` text and sensible defaults.

Render from the repo root:

    node ../kinetograph/packages/cli/dist/cli.js still components/backgrounds/index.tsx <frame> --comp <Id> -o components/backgrounds/out/x.png
    node ../kinetograph/packages/cli/dist/cli.js render components/backgrounds/index.tsx --comp <Id> -o components/backgrounds/out/<id>.mp4

| Component | Id | What it is | Main props |
|---|---|---|---|
| Grain Gradient | `GrainGradient` | A 4x3 mesh gradient whose points wander on small closed paths, blurred, with fine film grain. | `palette` (2 to 8 colours), `speed`, `scale` (how far points wander), `softness`, `grain`, `grainSize` |
| Paper | `Paper` | Crumpled paper: soft ridged folds, short fibres and tooth, lit by a raking light that circles enough to move the shadows of the folds, with a broad falloff. | `paper`, `shade`, `fibre`, `relief`, `scale`, `speed`, `falloff`, `grain` |
| Dot Field | `DotField` | A halftone grid whose dots breathe on a ring wave and a diagonal swell crossing each other. | `ground`, `dot`, `dotHigh`, `spacing`, `size`, `waveLength`, `speed`, `grain` |
| Aurora | `Aurora` | Four slow light ribbons with a thin sheen along each crest, screened over a deep ground. | `groundTop`, `groundBottom`, `ribbons` (3 colours), `intensity`, `width`, `speed`, `scale`, `grain` |
| Aurora Veil | `AuroraVeil` | Soft curtains of colour drifting like the northern lights, fading from the top-right corner. After the Aurora background on shadcn.io (ported from the source the user licensed there; check that licence before redistributing). | `colors` (up to 5), `mode`, `ground`, `intensity`, `fade`, `speed` |
| Liquid Gradient | `LiquidGradient` | A slow pour of plum, crimson and amber that folds into S-curves mid-loop and settles back; a seamless 10 s loop matched to a looping-gradient reference (palette, softness, scale and rhythm; the shapes are generated, not traced). | `deep`, `mid`, `bright`, `scale`, `swirl`, `speed`, `softness` |
| Grain Flow | `GrainFlow` | Two soft sheets of cobalt light flowing past a navy-black valley, burning to ice white in the lower-left corner and pale blue in the top right, under soft film grain that changes every frame; a seamless 10 s loop matched to a still grain-gradient reference (palette, layout, softness and grain; the motion is ours). | `ground`, `deep`, `bright`, `glow`, `flow`, `speed`, `grain` |
| Drift Gradient | `DriftGradient` | Big out-of-focus pools of ultramarine and cyan drifting across an electric-blue field, with a teal cast along the edges; blended like a mesh gradient so pools never pile up or clip. A seamless 10 s loop matched to a looping blue-gradient reference (palette and tone spread, pool size, softness and pace; the reference loops every two minutes, so the paths are ours). | `deep`, `mid`, `light`, `glow`, `tint`, `scale`, `contrast`, `speed` |
| Tide Gradient | `TideGradient` | Quick, soft pools of cyan, mint, teal and steel blue that swell, slide over one another and sink into black, like light under water; brightness follows how strongly the pools reach each pixel, so gaps open to black. A seamless 10 s loop matched to a 15 s gradient reference (palette and tone spread, pool size, softness and pace; the reference does not loop, so the paths are ours). | `colors` (6), `ground`, `scale`, `depth`, `speed` |
| Rise Glow | `RiseGlow` | Light rising from the bottom edge of a dark ground in two humps, brightest in the corners and dipping in the middle, with a faint ring round the left; the humps sway on a seamless 10 s loop. Measured from the opening of a SaaS launch reel (falloff per column within a few levels at f60). `palette` swaps in the colours of Liquid, Drift, Tide, Grain Flow, Aurora, Aurora Veil or Grain Gradient, read from those components' defaults. | `palette`, `colors` (5), `height`, `dip`, `ring`, `sway`, `speed` |
| Graph Paper | `GraphPaper`, `GraphPaperTall` | The faint squared grid behind explainer reels: thin grey lines, dots or plus marks at the crossings on off-white paper, strongest round a focus and fading to the edges, under a soft light, sliding a whole cell a loop. `GraphPaperTall` is the 9:16 cut. | `ground`, `ink`, `kind`, `cell`, `line`, `major`, `strength`, `focusX`, `focusY`, `fade`, `drift`, `speed`, `light`, `grain` |

## Principles used

Slow in and out (everything is a sine), overlap and follow through (each point or ribbon has its own phase and a slower
second harmonic), arcs (closed elliptical paths), secondary action (Paper's light and falloff move on different periods),
solid drawing (one light direction in Paper, one glow side in Aurora), restraint (movement under a tenth of a cell,
low default intensity so type stays readable), and texture on the whole frame (grain on the root layer, not per element).
