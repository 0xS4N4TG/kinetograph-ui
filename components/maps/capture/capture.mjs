// Captures a MapLibre GL scene frame by frame in headless Chromium and writes what the Kinetograph components play:
//   public/<scene>.mp4   the map, one picture per frame (H.264, 1920x1080)
//   public/<scene>.json  per frame, where the places and the arc sit on the screen (map.project), so the components draw
//                        the line, the pins and the labels themselves, sharp and with props
//
//   node capture/capture.mjs flyover|globe|city-zoom|route-walk|terrain-dive [--from lng,lat --to lng,lat] [--city lng,lat --country lng,lat]
//                            [--route route.json --places places.json]   (route-walk)
//                            [--frames N] [--only 0,60,120]   (only: stills to out/ instead of the video)
//
// Deterministic: the camera is a pure function of the frame (scenes.mjs); every map request goes through a local
// caching proxy, so tiles, styles, glyphs and sprites are downloaded once (capture/.cache) and every later capture,
// offline included, reads the same bytes. fadeDuration is 0 so nothing depends on how long a tile took to arrive.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { scenes, FPS } from './scenes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'node_modules/maplibre-gl/dist');
const cacheDir = path.join(here, '.cache');
fs.mkdirSync(cacheDir, { recursive: true });

const args = process.argv.slice(2);
const sceneName = args[0];
if (!scenes[sceneName]) {
  console.error(`scene: one of ${Object.keys(scenes).join(', ')}`);
  process.exit(1);
}
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? undefined : args[i + 1];
};
const pair = (s) => (s ? s.split(',').map(Number) : undefined);
const lineOf = (j) => (Array.isArray(j) ? j : j.type === 'Feature' ? j.geometry.coordinates : j.coordinates);
const opts = {
  from: pair(flag('from')),
  to: pair(flag('to')),
  city: pair(flag('city')),
  country: pair(flag('country')),
  frames: flag('frames') ? Number(flag('frames')) : undefined,
  target: pair(flag('target')),
  // route-walk: a JSON file holding the route ([[lng, lat], ...] or a GeoJSON LineString / Feature) and one holding the
  // places labelled on the way ([{ name, at: [lng, lat] }, ...]).
  route: flag('route') ? lineOf(JSON.parse(fs.readFileSync(flag('route'), 'utf8'))) : undefined,
  places: flag('places') ? JSON.parse(fs.readFileSync(flag('places'), 'utf8')) : undefined,
};
for (const k of Object.keys(opts)) if (opts[k] === undefined) delete opts[k];
const scene = scenes[sceneName](opts);
const only = flag('only') ? flag('only').split(',').map(Number) : null;
// --shard k/n renders every n-th frame starting at k (run several at once: software WebGL is the slow part), then
// --assemble reads the shards' tracks and encodes the clip. Without either flag one process does everything.
const shard = flag('shard') ? flag('shard').split('/').map(Number) : null;
const assemble = args.includes('--assemble');

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
const STYLES = {
  gibs: {
    version: 8,
    projection: { type: 'mercator' },
    sources: { gibs: { type: 'raster', tileSize: 256, maxzoom: 8, tiles: [GIBS], attribution: 'Imagery: NASA EOSDIS GIBS' } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#05080f' } },
      { id: 'gibs', type: 'raster', source: 'gibs', paint: { 'raster-saturation': -0.12, 'raster-contrast': 0.06, 'raster-fade-duration': 0 } },
    ],
  },
  globe: {
    version: 8,
    projection: { type: 'globe' },
    sources: { gibs: { type: 'raster', tileSize: 256, maxzoom: 8, tiles: [GIBS], attribution: 'Imagery: NASA EOSDIS GIBS' } },
    sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#0a0e17' } },
      { id: 'gibs', type: 'raster', source: 'gibs', paint: { 'raster-saturation': -0.1, 'raster-fade-duration': 0 } },
    ],
  },
  city: 'https://tiles.openfreemap.org/styles/positron',
};
const style = typeof scene.style === 'object' ? scene.style : STYLES[scene.style];
const VW = scene.width ?? 1920;
const VH = scene.height ?? 1080;
const sceneFps = scene.fps ?? FPS;

let PAGE = '';
// ---- the caching proxy -----------------------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const cors = { 'Access-Control-Allow-Origin': '*' };
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html', ...cors });
    res.end(PAGE);
    return;
  }
  if (url.pathname.startsWith('/dist/')) {
    const file = path.join(dist, path.basename(url.pathname));
    if (!fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': file.endsWith('.css') ? 'text/css' : 'text/javascript', ...cors });
    fs.createReadStream(file).pipe(res);
    return;
  }
  if (url.pathname === '/p') {
    const target = url.searchParams.get('u');
    const key = crypto.createHash('sha1').update(target).digest('hex');
    const body = path.join(cacheDir, key);
    try {
      if (!fs.existsSync(body)) {
        let r;
        for (let i = 0; i < 4; i++) {
          try {
            r = await fetch(target);
            if (r.ok || r.status === 404 || r.status === 204) break;
          } catch (e) {
            if (i === 3) throw e;
          }
          await new Promise((ok) => setTimeout(ok, 400 * (i + 1)));
        }
        const buf = Buffer.from(await r.arrayBuffer());
        // Missing tiles (the sea at high zoom) are cached as they were answered, so the same hole is drawn every time.
        // (written to a temp name and renamed, so a second capture running at once never reads half a file)
        fs.writeFileSync(body + '.type', `${r.status}\n${r.headers.get('content-type') ?? 'application/octet-stream'}`);
        fs.writeFileSync(`${body}.${process.pid}.tmp`, buf);
        fs.renameSync(`${body}.${process.pid}.tmp`, body);
      }
      const [status, type] = fs.readFileSync(body + '.type', 'utf8').split('\n');
      res.writeHead(Number(status), { 'content-type': type, ...cors });
      res.end(fs.readFileSync(body));
    } catch (e) {
      res.writeHead(502, cors).end(String(e));
    }
    return;
  }
  res.writeHead(404).end();
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

PAGE = `<!doctype html><html><head><meta charset=utf-8>
<link rel=stylesheet href="/dist/maplibre-gl.css">
<style>html,body{margin:0;background:#000}#map{position:absolute;inset:0;width:${VW}px;height:${VH}px}.maplibregl-control-container{display:none}</style></head>
<body><div id=map></div>
<script type=module>
import * as ml from '/dist/maplibre-gl.mjs';
const maplibregl = ml.default ?? ml;
window.__ready = (async () => {
  maplibregl.setWorkerUrl?.('${origin}/dist/maplibre-gl-worker.mjs');
  window.map = new maplibregl.Map({
    container: 'map', style: window.__style, center: [0, 0], zoom: 1, fadeDuration: 0, attributionControl: false,
    canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
    interactive: false, pixelRatio: 1, ...window.__mapOptions,
    transformRequest: (u) => (u.startsWith('${origin}') ? undefined : { url: '${origin}/p?u=' + encodeURIComponent(u) }),
  });
  await new Promise((ok) => map.once('load', ok));
  if (window.__fov) map.setVerticalFieldOfView(window.__fov);
  // MapLibre lifts a camera that would sit under the (exaggerated) terrain, trading its pitch and zoom for height. A drone
  // that skims a valley wall is exactly that camera, and the scene places it with the clearance it wants, so the lift is off.
  if (window.__freeCamera && map._camera) {
    map._camera._keepCameraAboveTerrain = (t) => t;
    map._camera._raiseCameraByPitchAndZoom = (t) => t;
  }
})();
// Scenes that draw their own geometry (route-walk) build it once here, from the tiles round the route: a shadow for each
// building (its footprint swept along the sun: the convex hull of the footprint and the footprint moved by height times
// the sun vector) and trees in the green spaces (seeded, so every capture plants the same ones).
window.__setup = async (cfg) => {
  map.jumpTo({ center: cfg.center, zoom: 15.2, pitch: 0, bearing: 0 });
  await new Promise((ok) => map.once('idle', ok));
  const kLng = 111320 * Math.cos(cfg.center[1] * Math.PI / 180), kLat = 110540;
  const hull = (pts) => {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of pts.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    const h = lo.slice(0, -1).concat(up.slice(0, -1));
    return h.concat([h[0]]);
  };
  const shadows = [];
  for (const f of map.querySourceFeatures('omt', { sourceLayer: 'building' })) {
    const h = f.properties.render_height || 0;
    if (h < 2) continue;
    const dx = cfg.sun[0] * h * cfg.shadowK / kLng, dy = cfg.sun[1] * h * cfg.shadowK / kLat;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    for (const poly of polys) {
      const ring = poly[0];
      if (!ring || ring.length < 3) continue;
      shadows.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [hull(ring.concat(ring.map((q) => [q[0] + dx, q[1] + dy])))] } });
    }
  }
  map.getSource('shadows').setData({ type: 'FeatureCollection', features: shadows });
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const inside = (pt, ring) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const trees = [];
  const seen = new Set();
  for (const f of map.querySourceFeatures('omt', { sourceLayer: 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood']]] })) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    for (const poly of polys) {
      const ring = poly[0];
      let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
      for (const [x, y] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const step = 10;
      for (let y = y0; y <= y1; y += step / kLat) for (let x = x0; x <= x1; x += step / kLng) {
        const key = Math.round(x * kLng / step) + ':' + Math.round(y * kLat / step);
        if (seen.has(key)) continue;
        seen.add(key);
        const pt = [x + (rnd() - 0.5) * 6 / kLng, y + (rnd() - 0.5) * 6 / kLat];
        if (!inside(pt, ring) || rnd() < 0.35) continue;
        // A round crown: four 16-sided tiers cut from a sphere (radius R, centre c metres up), lighter towards the top as
        // the sun falls on it, on a thin trunk. Stacked tiers read as one soft blob at any distance the camera reaches.
        const R = 2.4 + rnd() * 1.6, c = 2.2 + 0.85 * R + rnd() * 1.2;
        const disc = (r) => {
          const ring = [];
          for (let k = 0; k <= 16; k++) { const a = (k % 16) / 16 * Math.PI * 2; ring.push([pt[0] + Math.cos(a) * r / kLng, pt[1] + Math.sin(a) * r / kLat]); }
          return { type: 'Polygon', coordinates: [ring] };
        };
        const g = rnd(), base = g < 0.33 ? [150, 196, 122] : g < 0.66 ? [164, 205, 136] : [176, 214, 150];
        const tone = (k) => 'rgb(' + base.map((v) => Math.min(255, Math.round(v * k))).join(',') + ')';
        trees.push({ type: 'Feature', properties: { b: 0, h: c - 0.8 * R, c: '#a39684' }, geometry: disc(0.32) });
        const edges = [-0.85, -0.45, 0.25, 0.7, 0.96];
        for (let k = 0; k < 4; k++) {
          const mid = (edges[k] + edges[k + 1]) / 2;
          trees.push({ type: 'Feature', properties: { b: c + edges[k] * R, h: c + edges[k + 1] * R, c: tone([0.86, 0.97, 1.06, 1.13][k]) }, geometry: disc(R * Math.sqrt(1 - mid * mid)) });
        }
      }
    }
  }
  map.getSource('trees').setData({ type: 'FeatureCollection', features: trees });
  await new Promise((ok) => map.once('idle', ok));
  return { shadows: shadows.length, trees: trees.length };
};
window.__frame = async (cam, pts, paint) => {
  for (const [layer, prop, value] of paint ?? []) {
    if (layer !== '@source') { map.setPaintProperty(layer, prop, value); continue; }
    // a source's data, replaced: wait until the worker has re-tiled it, so this frame shows the new geometry
    const loaded = new Promise((ok) => {
      const done = () => { map.off('sourcedata', on); clearTimeout(t); ok(); };
      const on = (e) => { if (e.sourceId === prop && e.isSourceLoaded) done(); };
      const t = setTimeout(done, 3000);
      map.on('sourcedata', on);
    });
    map.getSource(prop).setData(value);
    await loaded;
  }
  // fpv: the camera placed as a drone is, by where it is (lng, lat, metres above sea level) and what it looks at, plus roll.
  if (cam.fpv) {
    // The camera's centre, zoom, pitch and bearing from where it is and what it looks at, on the sphere (the library's own
    // solver answers differently depending on which projection the map happens to be in at that moment).
    const R = 6371008.8, rad = Math.PI / 180;
    const vec = (lng, lat, alt) => [(R + alt) * Math.cos(lat * rad) * Math.cos(lng * rad), (R + alt) * Math.cos(lat * rad) * Math.sin(lng * rad), (R + alt) * Math.sin(lat * rad)];
    const [fl, fa, fh] = cam.fpv.from, [tl, ta, th] = cam.fpv.to;
    const c = vec(fl, fa, fh), t = vec(tl, ta, th);
    const v = [c[0] - t[0], c[1] - t[1], c[2] - t[2]];
    const len = Math.hypot(...v);
    const up = [Math.cos(ta * rad) * Math.cos(tl * rad), Math.cos(ta * rad) * Math.sin(tl * rad), Math.sin(ta * rad)];
    const east = [-Math.sin(tl * rad), Math.cos(tl * rad), 0];
    const north = [-Math.sin(ta * rad) * Math.cos(tl * rad), -Math.sin(ta * rad) * Math.sin(tl * rad), Math.cos(ta * rad)];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const pitch = Math.acos(Math.max(-1, Math.min(1, dot(v, up) / len))) / rad;
    const bearing = Math.atan2(-dot(v, east), -dot(v, north)) / rad;
    const toCenterPx = (window.__vh / 2) / Math.tan((map.getVerticalFieldOfView() * rad) / 2);
    const zoom = Math.log2((toCenterPx * 40075016.686 * Math.cos(ta * rad)) / (512 * len));
    map.jumpTo({ center: [tl, ta], elevation: th, zoom, pitch, bearing, roll: cam.roll ?? 0 });
  } else map.jumpTo(cam);
  const raf = () => new Promise((ok) => requestAnimationFrame(ok));
  // Wait for every tile, then draw once more so the picture holds all of them.
  const tw = performance.now();
  let n = 0;
  for (let i = 0; i < 4000; i++) {
    await raf();
    n++;
    if (map.loaded() && map.areTilesLoaded()) break;
  }
  window.__wait = [n, Math.round(performance.now() - tw)];
  map.triggerRepaint();
  await new Promise((ok) => map.once('render', ok));
  await raf(); await raf();
  return pts.map((p) => { const s = map.project(p); return [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10]; });
};
</script></body></html>`;

const outDir = path.join(root, 'out');
const framesDir = path.join(outDir, `frames-${scene.id}`);
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(path.join(root, 'public'), { recursive: true });

async function finish(track) {
  const meta = { id: scene.id, fps: sceneFps, frames: scene.frames, pace: scene.pace, width: VW, height: VH, from: scene.from, to: scene.to, city: scene.city, places: scene.places?.map((p) => ({ name: p.name, at: p.at, ...(p.elevation ? { elevation: p.elevation } : {}) })) };
  fs.writeFileSync(path.join(root, 'public', `${scene.id}.json`), JSON.stringify({ meta, track }));
  await new Promise((ok, no) => {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(sceneFps), '-i', path.join(framesDir, '%04d.png'), '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(root, 'public', `${scene.id}.mp4`)], { stdio: 'inherit' });
    ff.on('exit', (c) => (c === 0 ? ok() : no(new Error('ffmpeg ' + c))));
  });
  console.log('wrote public/' + scene.id + '.mp4 and .json');
}

if (assemble) {
  // the shards' tracks, merged
  const track = [];
  for (const f of fs.readdirSync(framesDir).filter((n) => /^track-\d+\.json$/.test(n))) Object.assign(track, JSON.parse(fs.readFileSync(path.join(framesDir, f), 'utf8')));
  if (track.length < scene.frames || Array.from(track).some((x) => !x)) throw new Error(`track has ${Array.from(track).filter(Boolean).length} of ${scene.frames} frames: run every shard first`);
  await finish(track);
  process.exit(0);
}

// ---- drive the browser -----------------------------------------------------------------------------------------
const chrome =
  process.env.CHROME ??
  path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  protocolTimeout: 0,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars', '--force-device-scale-factor=1', '--disable-background-timer-throttling'],
  defaultViewport: { width: VW, height: VH, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[page]', m.text());
});
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.evaluateOnNewDocument((s, o, v, free, h) => {
  window.__freeCamera = free;
  window.__vh = h;
  window.__style = s;
  window.__mapOptions = o;
  window.__fov = v;
}, style, scene.mapOptions ?? {}, scene.fov ?? null, !!scene.fpv, VH);
await page.goto(origin + '/');
await page.evaluate(() => window.__ready);
if (scene.setup) console.log('setup', await page.evaluate((c) => window.__setup(c), scene.setup));
// Framing fit (route-walk): project the route's ends on the last frame and move the end zoom and the aim until the end
// sits at fit.top and the start at fit.bottom (fractions of the height). Perspective makes this non-linear, so iterate.
if (scene.fit) {
  const { tune, frame, start, end, top, bottom } = scene.fit;
  for (let i = 0; i < 8; i++) {
    const [ps, pe] = await page.evaluate((c, p) => window.__frame(c, p), scene.camera(frame), [start, end]);
    const ys = ps[1] / VH, ye = pe[1] / VH;
    if (Math.abs(ys - bottom) < 0.01 && Math.abs(ye - top) < 0.01) break;
    tune.zEnd += 0.85 * Math.log2(Math.max(0.05, ys - ye) / (bottom - top)) * -1;
    tune.yEnd += 0.8 * ((top + bottom) / 2 - (ys + ye) / 2);
  }
  console.log('fit', JSON.stringify(tune));
}

// What to project each frame: the arc, then the named places.
const named = [];
if (scene.id === 'terrain-dive') for (const p of scene.places) named.push(p.at);
if (scene.id === 'flyover') named.push(scene.from, scene.to);
if (scene.id === 'city-zoom') named.push(scene.city);
if (scene.id === 'globe' || scene.id === 'route-walk') for (const p of scene.places) named.push(p.at);
const pts = [...(scene.arc ?? []), ...named];
const na = (scene.arc ?? []).length;
const track = [];
const list = only ?? Array.from({ length: scene.frames }, (_, i) => i).filter((i) => !shard || i % shard[1] === shard[0]);
for (const f of list) {
  const t0 = Date.now();
  const cam = scene.camera(f);
  const proj = await page.evaluate((c, p, k) => window.__frame(c, p, k), cam, pts, scene.paint ? scene.paint(f) : null);
  // terrain-dive: the camera as the map ended up with it, and its height above sea level (the readout counts it down).
  const used = scene.fpv ? await page.evaluate(() => ({ center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() })) : cam;
  track[f] = {
    cam: { center: used.center.map((v) => +v.toFixed(5)), zoom: +used.zoom.toFixed(4), bearing: +used.bearing.toFixed(3), pitch: +used.pitch.toFixed(3) },
    ...(scene.altitude ? { alt: Math.round(scene.altitude(f)) } : {}),
    ...(scene.arc ? { arc: proj.slice(0, na) } : {}),
    places: proj.slice(na),
    ...(scene.progress ? { progress: +scene.progress(f).toFixed(5) } : {}),
  };
  await page.screenshot({ path: path.join(framesDir, `${String(f).padStart(4, '0')}.png`), type: 'png' });
  if (f % 20 === 0 || process.env.TIMING) process.stdout.write(`frame ${f}/${scene.frames}${process.env.TIMING ? ` ${((Date.now() - t0) / 1000).toFixed(1)}s rafs/ms ${await page.evaluate(() => window.__wait)} cam ${JSON.stringify(track[f].cam)} places ${JSON.stringify(track[f].places)}` : ''}\n`);
}
await browser.close();
server.close();

if (shard && !only) {
  fs.writeFileSync(path.join(framesDir, `track-${shard[0]}.json`), JSON.stringify(Object.assign({}, track)));
  console.log(`shard ${shard[0]}/${shard[1]} done`);
  process.exit(0);
}
if (only) {
  console.log(`stills in ${framesDir}`);
  process.exit(0);
}
await finish(track);
