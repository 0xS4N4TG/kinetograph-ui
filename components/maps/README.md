# Map components

Map components built on real MapLibre GL (maplibre-gl 6.16, installed only in this folder): an A-to-B flyover, a spinning globe, a city zoom, a route walk and a 3D terrain dive. 1920x1080, 30 fps, 8 s each (the terrain dive 6 s).

| Component | Composition id | What it is |
|---|---|---|
| A-to-B Flyover | `Flyover` | NASA Blue Marble imagery; a great-circle arc draws between two places while the camera rides it, pulling out and back in. Pins, names and a distance counter count up with the arc. |
| Spinning Globe | `Globe` | MapLibre's globe projection with NASA imagery. It turns fast and eases to rest on a featured place; names arrive after it stops. |
| City Zoom | `CityZoom` | OpenFreeMap vector tiles. A hold on the country, then the camera descends on the city, tilting and turning; a pin drops, squashes and settles, and a label card follows. |
| Route Walk | `RouteWalk` | 1080x1920 at 24 fps, 88 frames at the default pace 2 (the reference reel's timing, twice as slow; set `pace` in the scene). OpenFreeMap vector tiles with 3D buildings, generated building shadows and trees. A walking route draws itself while the camera rides its head, zooming out, flattening and turning; places pop as the line passes, a pin drops on the end, and a route card's bar fills with the line. Timing measured frame by frame from a reference reel's map shot. Capture: `node capture/capture.mjs route-walk [--route route.json --places places.json]` (route: `[[lng, lat], ...]` or a GeoJSON LineString; places: `[{ "name", "at": [lng, lat] }]`, names in the same order as the `places` prop). The camera rides any route, and a fit pass on the last frame sets the end zoom so the whole route stands under the card. |
| Terrain Dive | `TerrainDive` | 6 s, 180 frames, one move with no cuts. High over the Alps with the Earth curving away (globe projection, atmosphere), a fast plunge that pitches over into the Mattertal, a low FPV run down the valley past Zermatt, then a bank into the Zmutt valley and up round the Matterhorn until its ridge stands against the sky. Real 3D terrain (AWS Terrain Tiles, Terrarium, exaggerated 1.7x), hillshade, Sentinel-2 cloudless imagery (EOX, CC BY 4.0), sky and fog, a 60 degree lens and a roll that follows the turn. The camera is flown as a drone is (position, look-at point, metres above sea level) through splines that are still at both ends. Overlay from the per-frame JSON: the peak's name, height and coordinates on a small-caps legend line with a leader to its projected position, and an altitude readout (with a log-scale rail) counting down the dive. Capture: `node capture/capture.mjs terrain-dive [--shard k/n ...]`, then `--assemble` (see below). |

## How the maps are hosted

Kinetograph has no browser. `<IFrame>` is reported as unsupported, and its WebGL context is a recorder of a subset of calls (no MapLibre, which needs a full WebGL stack, workers and a DOM). So the maps are not run inside the engine. Instead:

1. `capture/capture.mjs` drives maplibre-gl in headless Chromium (puppeteer-core, software WebGL), one frame at a time. The camera is a pure function of the frame number (`capture/scenes.mjs`). Each frame waits until every tile is loaded (`map.loaded()` and `areTilesLoaded()`) and draws once more, with `fadeDuration: 0` so nothing depends on how long a tile took.
2. Every request the map makes (tiles, style, glyphs, sprites) goes through a local caching proxy (`capture/.cache`, gitignored). The first capture downloads, every later one reads the same bytes, offline included. A frame is the same each time.
3. The capture writes `public/<scene>.mp4` (the map, H.264 CRF 12) and `public/<scene>.json`: for every frame, where the arc and the places sit on screen (`map.project`) and the camera.
4. The components play the clip with `<Video>` and draw everything else themselves from the JSON: the arc, pins, labels, distance, attribution. That layer is sharp, animatable and driven by props.

What a prop can change: anything on the overlay (names, colours, widths, timing of labels, fonts, attribution). What needs a recapture: the route, the city, the camera. Pass them to the capture tool.

## Render

```
node components/maps/capture/capture.mjs flyover [--from lng,lat --to lng,lat]
node components/maps/capture/capture.mjs globe   [--target lng,lat]
node components/maps/capture/capture.mjs city-zoom [--city lng,lat --country lng,lat]
node components/maps/capture/capture.mjs terrain-dive   # 3D terrain is slow in software WebGL (about a minute a frame): run shards at once
for k in 0 1 2 3 4; do node components/maps/capture/capture.mjs terrain-dive --shard $k/5 & done; wait
node components/maps/capture/capture.mjs terrain-dive --assemble   # merges the shards' tracks and encodes the clip
# add --only 0,100,239 to write stills to out/frames-<scene>/ instead of the clip

node ../kinetograph/packages/cli/dist/cli.js still components/maps/index.tsx 120 --comp Flyover -o components/maps/out/x.png
node ../kinetograph/packages/cli/dist/cli.js render components/maps/index.tsx --comp Flyover -o components/maps/out/a-to-b-flyover.mp4
```

`npm install --prefix components/maps` restores maplibre-gl. The capture finds Chromium in the Playwright cache; set `CHROME` to use another build. If you change the route in the capture, change `fromName`/`toName` (and codes) in the props to match.

## Props

Every prop has a `.describe()` in its schema and shows up in Studio. Shared: `clip`, `font` (Google Fonts, default Geist), `attribution`, `colors`.

- **Flyover**: `fromName`, `toName`, `fromCode`, `toCode`, `showDistance`, `unit` (km or mi), `arcWidth`, `vignette`, `arcDelay`.
- **Globe**: `featured`, `featuredCaption`, `title`, `showOthers`, `settleFrame`.
- **CityZoom**: `city`, `country`, `showCoordinates`, `landFrame`.
- **TerrainDive**: `name`, `elevation`, `showCoordinates`, `showAltitude`, `labelFrame`, `vignette`, `attribution` (one string per line). The peak, route and camera are fixed by the capture (`TERRAIN_DIVE` in `capture/scenes.mjs`: keyframes of camera and look-at, in metres above sea level).

## Principles used

- **Flyover**: arcs (a great circle, the camera rides it), slow in and slow out (one ease for arc and camera, the camera a few frames behind the head), staging (A, the flight, B), follow through (the pull-out is quicker than the push-in; B's halo settles), timing (0.8 s hold, 6 s flight, 1.8 s hold), restraint (one colour, one number).
- **Globe**: slow in and slow out (an ease-out spin), arcs (markers curve away and fade at the limb), follow through (names arrive one by one after the turn stops), staging (only the featured place is large), secondary action (quiet markers).
- **City Zoom**: anticipation (a hold, then the descent), slow in and slow out (the ease is applied to the logarithmic zoom), arcs (the centre curves towards the city a beat behind the scale), squash and stretch plus follow through (pin drop, squash, rebound, ripple), staging (the card waits for the pin), restraint (pale map, one accent).

## Data and attribution

- Imagery: NASA EOSDIS Global Imagery Browse Services (GIBS), Blue Marble Shaded Relief with Bathymetry, `gibs.earthdata.nasa.gov`. Public domain. Credit is drawn on screen.
- Vector tiles: OpenFreeMap (`tiles.openfreemap.org`, positron style), OpenMapTiles schema, data (c) OpenStreetMap contributors. The credit is drawn on screen and is required.
- Terrain Dive imagery: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0, `tiles.maps.eox.at`. Its native detail ends near zoom 13 (about 13 m a pixel here), so the lowest part of the run is soft; swisstopo's SWISSIMAGE (open government data, attribution required) is sharp but stops at the Swiss border, which crosses the Matterhorn. Elevation: AWS Terrain Tiles (Terrarium), credit "Terrain Tiles: Mapzen/AWS Open Data". Both credits are drawn on screen.
- Type: Geist (Google Fonts, OFL).
