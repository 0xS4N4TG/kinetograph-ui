# Components

Fifty-eight ready-to-use motion components for Kinetograph, grouped by kind. Each folder has an `index.tsx` that
registers a demo `<Composition>` per component, a `README.md` with props, the animation principles each one leans on,
and render commands. Every prop is in a zod schema with a `.describe()` and a default, so the components show up
editable in Studio.

Render any of them from the repo root:

```sh
node ../kinetograph/packages/cli/dist/cli.js render components/<folder>/index.tsx --comp <Id> -o components/<folder>/out/<name>.mp4
```

## Grids: `grids/`

Photo arrangements with camera moves, one per layout and orientation mode. They share a small 3D layout kit
(`grids/kit.tsx`).

| Id | Arrangement |
|---|---|
| `GridRect` | Rectangular wall; ripples in, pulls back, trucks and pushes to a card |
| `GridRadial` | Three concentric rings at different depths, rack focus inner to outer |
| `GridPath` | Upright cards along a curve (`wave`, `triangle`, `square`, `infinity`) |
| `GridSpherical` | Cards tangent to a sphere; full orbit, then a push to the hero card |
| `GridForwardOrient` | Ring on a turntable, each card facing its direction of travel |
| `GridCenterOrient` | Grid whose cards turn to point at the centre, a rosette twist |
| `GridPathOrient` | Cards on a rounded triangle, turned to the path tangent |
| `GridFaceScreen` | Carousel ring with every card billboarded to the screen |

## Carousels: `carousels/`

| Id | What it does |
|---|---|
| `CircleCarousel1` | Square covers on a ring growing from tiny to large as it turns |
| `CircleCarousel2` | A spiral wound inward; covers born at the rim, swallowed at the centre |
| `CircleCarousel3` | Covers filed into a "U", askew like handled prints |
| `CardRail` | Portrait cards on a tilted plane, flicked in two throws |
| `ReelWall` | A 3D ring of tall cards spun to rest on one, which steps forward |
| `OrbitGallery` | Nine photos spiral in round a title and settle on an ellipse |
| `GalleryPush` | A wall of columns unrolling from the middle; whip-pan across under blur |
| `ShowcaseDrift` | A scatter of work cards sliding in behind a headline |

## Charts: `charts/`

Two families, 60 fps. The Bklit charts port the design of [Bklit UI](https://bklit.com) (MIT): its palettes, light and
dark, gradients, grid, tooltips and enter motion, with a camera that rides the data as it draws and then reveals the
whole chart. The scene charts are timed frame by frame from measured demo videos (watched, not copied from code).

| Id | Family | What it does |
|---|---|---|
| `AreaChart` | Bklit | Rides the line tip as it draws, pulls out, tooltip glides to the highlight |
| `DonutChart` | Bklit | Camera orbits with each slice; the leader steps out |
| `RadarChart` | Bklit | Orbits axis by axis as the polygon fills; second series springs open |
| `RingChart` | Bklit | Rides each ring's head, innermost first, then the whole chart |
| `FunnelChart` | Bklit | Dollies stage to stage as each blooms with halo rings |
| `HeatmapChart` | Bklit | Sweeps the weeks behind a wave of light, leans onto the busiest day |
| `SankeyChart` | Bklit | Follows the strongest flow, then every link draws in |
| `CandlestickChart` | Bklit | Rides the newest candle through a breakout |
| `LineTicker` | scene | Headline over a climbing line, hard cut to a live ticker (after ticker-climb) |
| `BarChart` | scene | An Export button collapses into the tallest cell of a histogram (after metric-morph) |
| `HexTally` | scene | Hex unit chart fills under a counting metric card (after hex-tally) |
| `TallyRise` | scene | A currency figure counts on a bloom that drains to black (after tally-rise) |
| `ScatterBloom` | scene | ~1300 points bloom onto a tilted table under a slow roll and push (after scatter-bloom) |

## Showcase: `showcase/`

Device scenes at 60 fps. All but `ThreePhone` are timed frame by frame from measured demo videos.

| Id | What it does |
|---|---|
| `ThreePhone` | Three phones; the camera travels phone to phone with a banked sweep, then pulls back |
| `PhonePitch` | A phone drops in beside a headline; the camera lifts into a message thread |
| `ScreenTunnel` | Four phones as the walls of a tunnel round a headline, camera pull-back |
| `LaptopOpen` | Pull-back from soft glass to a laptop, push into the screen, cut to a colour field |
| `ScreenTouch` | A camera fall onto a feed and a tap on a button |
| `CheckoutPush` | A phone checkout with the amount landing and a camera push |
| `VaultCount` | A wallet balance counting up with payment cards |
| `BuildOut` | A send button that zooms out into the app |
| `RecapDial` | A vertical year-in-review dial that snaps month by month, one sticker per month |
| `LaunchFilm` | A 20.8 s product-launch film at 30 fps: dock, typed headline, prompt and poster burst, dot-matrix wipe, dashboard, footage grid, mark and wordmark, extruded letter, flat mark |
| `PromptIntro` | A 3.3 s opener at 60 fps: a prompt types and deletes under a blue flash, the answer types, two arrows, over the RiseGlow background |
| `AppLaunch` | A 21 s launch film for an AI app (default: Recap AI, meeting notes): opener, chat bar, three screens, glass button with dot rings, pill with connected apps, app icon and end mark |

## Backgrounds: `backgrounds/`

Seamless loops at whole-number `speed`.

| Id | What it is |
|---|---|
| `GrainGradient` | Drifting mesh gradient with film grain |
| `Paper` | Paper height field under a slowly circling raking light |
| `DotField` | Halftone grid breathing on a ring wave |
| `Aurora` | Ribbons of light, screened so overlaps never blow out |
| `AuroraVeil` | Skewed curtains of colour drifting from the top-right corner (after shadcn.io's Aurora) |
| `LiquidGradient` | A liquid plum, crimson and amber gradient that swirls and settles on a seamless 10 s loop |
| `GrainFlow` | Cobalt sheets of light flowing past a navy valley, white-hot in one corner, under film grain |
| `DriftGradient` | Soft pools of ultramarine and cyan drifting over electric blue, like defocused light through water |
| `TideGradient` | Fast pools of cyan, mint and steel blue swelling and sinking into black |
| `RiseGlow` | Light rising from the bottom edge in two swaying humps over a dark ground; eight palettes taken from the other backgrounds |

## Maps: `maps/`

Real MapLibre GL maps, captured frame by frame by `maps/capture/capture.mjs` (headless Chromium, cached tiles), played
as video under a live overlay drawn from per-frame projected positions. Overlay props (names, colours, type, timing)
change live; a new route, city or camera needs a recapture. Kinetograph can't host a live WebGL map, so this is the
route. The folder has its own `maplibre-gl` install.

| Id | What it does |
|---|---|
| `Flyover` | A to B great-circle arc over NASA Blue Marble imagery, with a distance counter |
| `Globe` | Globe projection spinning to rest on a city |
| `CityZoom` | Vector-tile descent on a city with tilt and bearing; a pin drops |
| `RouteWalk` | Portrait 3D street map: a walking route draws behind a moving dot while the camera rides it and pulls out; places pop as it passes, a pin drops on the end, a route card's bar fills. Any route via `--route` |

Data: NASA EOSDIS GIBS (public domain); OpenFreeMap tiles, data © OpenStreetMap contributors (credited on screen).

## Audio visualisers: `audio-viz/`

The same audio drawn several times in different styles (analog lines, dots, digital bars), colours and offsets, stacked
under two glows with grain on top. Read from the decoded audio each frame; every copy is a row in the `layers` prop. The
bundled beat is synthesised by `audio-viz/tools/make-beat.py`.

| Id | What it does |
|---|---|
| `AudioScope` | Oscilloscope graticule, two red line traces around a yellow digital trace, condensed title with a script word, slow push |
| `AudioPlasma` | White-hot trace in a blue bloom, a playhead, the running time in huge soft numerals |

## Effects: `effects/`

| Id | What it does |
|---|---|
| `LightLeak` | Warm streaked leak from an edge, optionally hiding a cut |
| `Halation` | Red-orange halo on highlights, with grain |
| `GlassLens` | A ball lens moving over the picture, refracting it |
| `FilmBurn` | Transition: a heat front scorches picture A and reveals B |

## Shared photos: `_assets/photos/`

46 NASA photographs (public domain), credited in `_assets/photos/CREDITS.md`, fetched by
`_assets/tools/fetch-photos.py`. Each folder that uses them links `public/photos` to this folder.
