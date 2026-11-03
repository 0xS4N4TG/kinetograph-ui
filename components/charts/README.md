# Charts

Thirteen animated data-chart components for Kinetograph, each with a camera move. Every one is an exported React
component driven by a `data` prop (or `points` / `value`), with colours, number format, timing and camera as props. A
zod schema with a `.describe()` on every prop drives the Studio controls. Each has a demo Composition in
`index.tsx` (1920x1080, 60 fps) with generic sample data. Light and dark themes are a `mode` prop. Type is Geist,
with Geist Mono for numbers.

Shared code is in `lib.tsx`: themes, fonts, timing eases, number formatting, a monotone curve, the camera wrapper,
the tooltip card.

| Component | Composition id | File | What it does |
|---|---|---|---|
| Area chart | `AreaChart` | `AreaChart.tsx` | Bklit's area chart. The camera starts tight and rides the tip of the line as it draws, anticipates, pulls out to the whole chart (motion blur, overshoot, soft grid snapping sharp), then the tooltip opens at the last point and glides to the highlight. |
| Line + ticker | `LineTicker` | `LineTicker.tsx` | Scene "ticker-climb": a headline settles out of a push over a climbing line (line and type at two depths, whip out), hard cut, then the line is a running ticker: symbol card counting 8 per tick, a dot riding the head, a dashed rule and a pill that grows leftwards, and a card that flashes when an install lands on the curve. Dark, accent `#0bb143`; no `mode`. |
| Bar / histogram | `BarChart` | `BarChart.tsx` | Scene "metric-morph": an Export button settles from the press, its label dissolves, the pill collapses (ease-in) into the tallest cell of a 52x11 histogram that fades up around it inside a 3.15x shot; a hard cut pulls out to the whole chart (stat, legend, axes). Props `label`, `title`, `value`, `cells`, beats in seconds. |
| Radial / donut | `DonutChart` | `DonutChart.tsx` | Bklit's pie/donut. Slices sweep one after another with rounded, padded corners; the camera orbits the ring with the head, pauses at each seam, pulls out, and the largest slice steps out while the middle swaps to it. |
| Scatter bloom | `ScatterBloom` | `ScatterBloom.tsx` | Scene "scatter-bloom": ~1300 small points bloom onto a tilted plane (engine 3D layer under one perspective camera, pose fitted to the reference) while it rolls, pushes in about a tenth with an overshoot and pans left; depth of field from blurred bands of points; one in 14 points arrive early. |
| Hex tally | `HexTally` | `HexTally.tsx` | Scene "hex-tally": a metric card settles up while 150 of 22x15 hexagons light in a measured scatter under a count that lands before the chart does; legend percentages come from the figures. No camera, as in the reference. |
| Tally rise | `TallyRise` | `TallyRise.tsx` | Scene "tally-rise": a currency figure counts up on a blue radial bloom that drains to near-black while the type pushes in (one uniform scale about one point, figure anchored by its left edge). |
| Radar | `RadarChart` | `RadarChart.tsx` | Bklit's radar. Grid rings spring out of the centre; the camera orbits the first series as a fan sweeps axis by axis (with roll, labels soft until the head reaches them), then pulls out as the second series springs open and the first is picked. |
| Ring | `RingChart` | `RingChart.tsx` | Bklit's ring chart. The camera rides each ring's head innermost to outermost, dollying out to the next start line between rings, then pulls out to the whole chart and its legend. |
| Funnel | `FunnelChart` | `FunnelChart.tsx` | Bklit's funnel with halo rings. The camera dollies stage to stage as each blooms and its number counts, pulls out, and the last stage's halos breathe while the rest dim. |
| Heatmap | `HeatmapChart` | `HeatmapChart.tsx` | Bklit's contribution heatmap. The camera sweeps the weeks just behind a wave of light that pops each cell to its level, pulls out, and leans onto the busiest day with its tooltip. |
| Sankey | `SankeyChart` | `SankeyChart.tsx` | Bklit's sankey. The camera follows the strongest flow from source to target to target, then pulls out as every other node and link draws in, coming into focus; the last hop is picked and dims the rest. |
| Candlestick | `CandlestickChart` | `CandlestickChart.tsx` | Bklit's candlestick chart. Candles print quickly through the quiet stretch and slowly through the breakout while the camera rides the newest one, then it pulls out and a tooltip slides to the biggest green candle. |

## Props (all have defaults; see each file's schema)

Common: `mode` (`light` | `dark`), `accent` (hex), `format` (`prefix`, `suffix`, `decimals`, `group`), `holdSeconds`,
`camera` (object, per component).

- **AreaChart**: `data` `[{label, value}]`, `title`, `subtitle`, `seriesName`, `highlight` (index), `mode`, `palette`, `color` (0-4), `format`, `drawSeconds`, `markers`, `camera {tightZoom, wideZoom, lead, motionBlur, rackFocus, drift}`.
- **LineTicker**: `data`, `title`, `pitch`, `riseHeight`, `startSeconds`, `climbSeconds`, `labelEvery`, `camera {zoomFrom, zoomTo, lagSeconds, headX}`.
- **BarChart**: `data`, `title`, `subtitle`, `winner` (-1 = tallest), `gap`, `pitch`, `growSeconds`, `staggerFrames`, `rackFocus`, `camera {pushZoom, settleZoom, motionBlur, drift}`.
- **DonutChart**: `data` `[{label, value, color?}]`, `title`, `subtitle`, `centerLabel`, `leader` (-1 = largest), `palette`, `innerRatio` (0 = pie), `padDegrees`, `cornerRadius`, `sliceSeconds`, `camera {tightZoom, wideZoom, orbit, motionBlur, rackFocus}`.
- **RadarChart**: `metrics`, `series` `[{name, values, color?}]`, `max`, `levels`, `palette`, `axisSeconds`, `camera {tightZoom, wideZoom, orbit, roll, motionBlur, rackFocus}`.
- **RingChart**: `data` `[{label, value, max}]`, `centerLabel`, `format`, `strokeWidth`, `ringGap`, `ringSeconds`, `camera {tightZoom, wideZoom, orbit, motionBlur, rackFocus}`.
- **FunnelChart**: `data` `[{label, value}]`, `color` (0-4), `layers`, `gap`, `stageSeconds`, `camera {tightZoom, wideZoom, motionBlur, rackFocus}`.
- **HeatmapChart**: `data` (weeks of seven counts), `startDate`, `unit`, `sweepSeconds`, `camera {tightZoom, wideZoom, lag, motionBlur, rackFocus}`.
- **SankeyChart**: `nodes`, `links` `[{source, target, value}]`, `startNode`, `unit`, `hopSeconds`, `camera {tightZoom, wideZoom, lead, motionBlur, rackFocus}`.
- **CandlestickChart**: `data` `[{open, high, low, close}]`, `startDate`, `format`, `printSeconds`, `camera {tightZoom, wideZoom, lead, motionBlur, rackFocus, drift}`.

The Bklit charts (Area, Donut, Radar, Ring, Funnel, Heatmap, Sankey, Candlestick) also take `mode` and `palette` (`primary`, `monochrome`, `ocean`, `sunset`, `grove`, `vivid`), and have `holdSeconds`.
- **ScatterBloom**: `points` `[{x, y, size, group}]` (0-100), `groups`, `xLabel`, `yLabel`, `focus`, `bloomSeconds`, `orbitSeconds`, `camera {startPitch, endPitch, startYaw, endYaw, zoom, perspective}`.
- **HexTally**: `data` `[{label, value, color?}]`, `target`, `title`, `caption`, `columns`, `rows`, `fillSeconds`, `camera {startZoom, endZoom, drift}`.
- **TallyRise**: `value`, `title`, `caption`, `change`, `showChange`, `changeLabel`, `size`, `rollSeconds`, `spins`, `camera {startZoom, endZoom, tilt, motionBlur}`.

Each component takes a frame `f` and its props (`<AreaChart f={frame} {...props} />`), so it can be placed in a
bigger composition at any offset. `*Duration(props)` gives the length in frames.

## Principles used

Disney's twelve, as applied to motion graphics (motion-canon):

- **Area chart**: staging, slow in and slow out, arcs (the camera's y follows the head at a fraction), overlap (markers pop after the head, the tooltip lands after the camera settles), timing, exaggeration on the key point only.
- **Line + ticker**: follow through and overlapping action (the camera trails the head), slow in and slow out, staging (one big number, a receding grid), secondary action (price pill, halo), exaggeration on the number's landing push.
- **Bar / histogram**: overlap and stagger, slow in and slow out, staging (rack focus and colour pick one subject), follow through (a bar's number trails its top), timing (a beat of stillness before the push), exaggeration on the winner only.
- **Radial / donut**: arcs (the sweep, the leader stepping out along its radius), slow in and slow out, overlap (legend rows after the sweep, the count riding it), staging (the push dims everything else), secondary action, exaggeration on one segment.
- **Scatter bloom**: staging (flat chart first, depth after the data lands), arcs (a spiral camera path), stagger (each cluster blooms centre outward), slow in and slow out, solid drawing (one perspective, shadows on the plane, depth sorting), secondary action (ripples, stems).
- **Hex tally**: staging, slow in and slow out (count, fill and pull-back share one ease), overlap and stagger (a wave of hexes), follow through (the front's flash decays), timing, exaggeration on the number.
- **Tally rise**: slow in and slow out (hard deceleration into each digit), overlap and stagger (wheels start together, lock in order), follow through (the push, rule and chip after the last wheel), arcs (tilt unwinds while trucking), exaggeration once on the whole number.

The eight Bklit charts add: **camera choreography** per chart as beats (ride, anticipate, pull out with overshoot, settle, hover), `moveCurve()` in `bklit.ts` (anticipation and overshoot on a 0..1 move), motion-blur shutter from camera speed (`shutterFor`), and rack focus that lands on the subject (`soft`, blur only on what is not the subject, to zero as the camera arrives).

Everything is a pure function of the frame; sample data uses a seeded generator, never `Math.random`.

## Render

From the repo root:

```
node ../kinetograph/packages/cli/dist/cli.js still components/charts/index.tsx 200 --comp AreaChart -o components/charts/out/area.png
node ../kinetograph/packages/cli/dist/cli.js render components/charts/index.tsx --comp AreaChart -o components/charts/out/area-chart.mp4
```

Ids: `AreaChart`, `LineTicker`, `BarChart`, `DonutChart`, `ScatterBloom`, `HexTally`, `TallyRise`, `RadarChart`, `RingChart`, `FunnelChart`, `HeatmapChart`, `SankeyChart`, `CandlestickChart`. Override props with
`--props '{"mode":"dark","accent":"#7aa2ff"}'`. Type-check: `cd components/charts && npx --no-install tsc -p tsconfig.json`.

## Bklit

Chart design after Bklit UI (MIT), https://bklit.com (source not committed). The
Bklit tokens live in `bklit.ts`: the six `--chart-1..5` palettes (primary is the default), `--chart-positive` and
`--chart-negative`, the neutral chart variables (`--chart-grid`, `--chart-label`, `--chart-crosshair`, tooltip and
border colours) for light and dark, converted from oklch to hex, and Bklit's motion numbers (clip reveal
`cubic-bezier(0.85, 0, 0.15, 1)`, ring stagger 0.08 s, spoke stagger 0.05 s, slice delays, funnel halo springs).
`bklitParts.tsx` has the popover tooltip, the date pill, the heading and the rack-focus wrapper. Sizes are Bklit's CSS
pixels times 2. `bklitScenes.tsx` registers the six new compositions; `index.tsx` renders it.

## Notes

- The TypeScript `Stroke` type in `@kinetographdev/scene` lists only `color` and `width`, but the scene format also reads `cap`, `join`, `dashArray` and `dashOffset` (SCENE.md, "shape"). `lib.tsx` has a `stroke()` helper that passes them through with a cast; the engine draws them.
- Motion blur on the camera layer smears changing text (counting numbers) into stepped copies, so the bar and donut cameras blur only while they move, and the odometer blurs each wheel on its own layer.
- Scatter bloom does its own projection (yaw, pitch, perspective) instead of using layer 3D transforms, so the points stay round billboards and sort by depth.


## Timing

`LineTicker`, `BarChart` (scene metric-morph), `HexTally`, `TallyRise` and `ScatterBloom` are timed to measured reference demo videos (960x540, 30 fps content in a 60 fps file; ours renders a true 60 fps). Their geometry, timings, camera and type were measured off the frames; the reference videos are never copied into the repo. Content that is a brand or a person in the reference is neutral copy here. The old `mode` and camera props of these five were dropped: the reference look is the default and the reference has the camera it has.
