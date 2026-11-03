// Camera paths for the map scenes. Each camera is a pure function of the frame number: nothing here reads a clock
// or a random number, so a capture run twice reads the same pictures (the tiles come from the on-disk cache).

export const FPS = 30;

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** Slow in, slow out (cubic-bezier .45,0,.15,1 shape, here a smootherstep blend that is exact and cheap). */
export const ease = (t) => {
  t = clamp01(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a, b, t) => a + (b - a) * t;

/** Unit vector of a longitude and latitude in degrees. */
const vec = ([lng, lat]) => [Math.cos(rad(lat)) * Math.cos(rad(lng)), Math.cos(rad(lat)) * Math.sin(rad(lng)), Math.sin(rad(lat))];
const lnglat = ([x, y, z]) => [deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.hypot(x, y)))];

/** Point at fraction t along the great circle from a to b (spherical interpolation). */
export function greatCircle(a, b, t) {
  const va = vec(a);
  const vb = vec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const w = Math.acos(dot);
  if (w < 1e-9) return a;
  const s = Math.sin(w);
  const ka = Math.sin((1 - t) * w) / s;
  const kb = Math.sin(t * w) / s;
  return lnglat([ka * va[0] + kb * vb[0], ka * va[1] + kb * vb[1], ka * va[2] + kb * vb[2]]);
}

export const distanceKm = (a, b) => {
  const va = vec(a);
  const vb = vec(b);
  return 6371 * Math.acos(Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])));
};

const mercator = ([lng, lat]) => [(lng + 180) / 360, 0.5 - Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) / (2 * Math.PI)];
const unmercator = ([x, y]) => [x * 360 - 180, deg(2 * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 2)];

// ---------------------------------------------------------------------------------------------------------------
// A to B flyover. 7 s: hold on A, fly along the great circle while the camera pulls out and back in, hold on B.

export function flyover(opts = {}) {
  const from = opts.from ?? [55.296, 25.276]; // Dubai
  const to = opts.to ?? [139.692, 35.69]; // Tokyo
  const frames = opts.frames ?? 240;
  const hold0 = 24;
  const hold1 = 54;
  const samples = 200;
  const arc = Array.from({ length: samples + 1 }, (_, i) => greatCircle(from, to, i / samples));
  // The zoom that fits the whole arc in 70% of the frame.
  const m = arc.map(mercator);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of m) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const fit = opts.fit ?? 0.72;
  const zFit = Math.log2(Math.min((1920 * fit) / (512 * (x1 - x0)), (1080 * fit) / (512 * (y1 - y0))));
  const zEnd = opts.zEnd ?? 5.2;
  const zMin = Math.min(zFit, zEnd - 1);
  const mid = greatCircle(from, to, 0.5);
  const fly = frames - hold0 - hold1;
  const lag = 5;
  return {
    id: 'flyover',
    frames,
    fps: FPS,
    style: 'gibs',
    from,
    to,
    arc,
    points: { from, to },
    // 0..1 along the arc of the arc's head at frame f (the camera follows it, a few frames behind).
    progress: (f) => ease((f - hold0) / fly),
    camera: (f) => {
      const head = ease((f - hold0 - lag) / (fly - lag));
      const center = greatCircle(from, to, head);
      // The zoom is a smooth dip: out to the fit at the midpoint, back in at B. Slightly different in and out so it
      // does not read as a mechanical breath: the pull-out is quicker than the push-in.
      const p = clamp01((f - hold0) / fly);
      const dip = Math.sin(Math.PI * Math.pow(p, 0.85));
      const z = lerp(zEnd, zMin, Math.pow(dip, 1.4));
      // Mid flight the camera sits on the arc's centre so the whole line is framed.
      const w = Math.pow(dip, 2);
      const c = [lerp(center[0], mid[0], w * 0.9), lerp(center[1], mid[1], w * 0.9)];
      // A slow drift on the holds (straight ahead action), under 1% of the frame.
      const drift = f < hold0 ? (f - hold0) * 0.0012 : f > frames - hold1 ? (f - (frames - hold1)) * 0.0010 : 0;
      return { center: [c[0] + drift, c[1]], zoom: z + (f < hold0 ? (f - hold0) * -0.0016 : 0), bearing: 0, pitch: 0 };
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Spinning globe. 8 s: the globe turns, slowing to rest on the featured place; markers sit on the cities.

export function globe(opts = {}) {
  const frames = opts.frames ?? 240;
  const target = opts.target ?? [-9.139, 38.722];
  const startLng = opts.startLng ?? target[0] - 270;
  const places = opts.places ?? [
    { name: 'Lisbon', at: [-9.139, 38.722] },
    { name: 'New York', at: [-74.006, 40.713] },
    { name: 'Tokyo', at: [139.692, 35.69] },
    { name: 'Nairobi', at: [36.822, -1.292] },
    { name: 'Sydney', at: [151.209, -33.869] },
    { name: 'Lima', at: [-77.043, -12.046] },
  ];
  return {
    id: 'globe',
    frames,
    fps: FPS,
    style: 'globe',
    places,
    camera: (f) => {
      // Fast at the start, easing out to rest: an ease-out curve on the whole turn (slow out), with a slight tilt.
      const t = clamp01(f / (frames - 1));
      const e = 1 - Math.pow(1 - t, 2.6);
      return { center: [lerp(startLng, target[0], e), lerp(10, target[1] * 0.9, e)], zoom: 2.5 + 0.2 * e, bearing: 0, pitch: 0 };
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// City zoom. 8 s: hold on the country, push in to the city (zoom is logarithmic, so a straight line in zoom is an even
// perceived speed; the ease shapes it), a little pitch and bearing arriving at the end, hold on the pin.

export function cityZoom(opts = {}) {
  const frames = opts.frames ?? 240;
  const city = opts.city ?? [-9.1394, 38.7139]; // Lisbon, Rossio
  const country = opts.country ?? [-8.2, 39.6];
  const z0 = opts.z0 ?? 5.3;
  const z1 = opts.z1 ?? 13.2;
  const hold0 = 24;
  const hold1 = 50;
  const dur = frames - hold0 - hold1;
  return {
    id: 'city-zoom',
    frames,
    fps: FPS,
    style: 'city',
    city,
    camera: (f) => {
      const p = ease((f - hold0) / dur);
      // The zoom runs ahead of the centre: first the scale, then the aim, which reads as a camera descending on a place.
      const pc = ease(Math.pow(clamp01((f - hold0) / dur), 0.8));
      const center = [lerp(country[0], city[0], pc), lerp(country[1], city[1], pc)];
      const drift = f < hold0 ? (f - hold0) * 0.001 : 0;
      return { center: [center[0] + drift, center[1]], zoom: lerp(z0, z1, p), bearing: lerp(0, -18, ease(clamp01((p - 0.35) / 0.65))), pitch: lerp(0, 48, ease(clamp01((p - 0.5) / 0.5))) };
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Route walk. Portrait 1080x1920 at 24 fps, 60 frames. A walking route draws itself through a 3D city while the camera
// rides its head: low and close at the start, zooming out the whole way, flattening its tilt and turning about 11 degrees,
// until the whole route stands in frame. Timing measured frame by frame from a reference reel (t = 0 is its first clean
// map frame): the line draws over frames 0..20, the zoom, tilt and turn run 0..28, then a slow drift holds the end.
//
// The route follows real street centrelines read from the OpenFreeMap tiles (University Place, East 14th Street).

const M_LAT = 110540;
const mLng = (lat) => 111320 * Math.cos(rad(lat));

/** A polyline resampled every `step` metres, with the cumulative length of each point. */
function densify(line, step = 4) {
  const out = [line[0]];
  const len = [0];
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const dx = (b[0] - a[0]) * mLng(a[1]);
    const dy = (b[1] - a[1]) * M_LAT;
    const d = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) {
      out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
      len.push(len[len.length - 1] + d / n);
    }
  }
  return { pts: out, len, total: len[len.length - 1] };
}

/** The point a fraction q of the way along a densified line. */
function along(d, q) {
  const target = clamp01(q) * d.total;
  let i = 1;
  while (i < d.len.length - 1 && d.len[i] < target) i++;
  const span = d.len[i] - d.len[i - 1] || 1;
  const t = (target - d.len[i - 1]) / span;
  return [lerp(d.pts[i - 1][0], d.pts[i][0], t), lerp(d.pts[i - 1][1], d.pts[i][1], t)];
}

/** Compass bearing from a to b, degrees clockwise from north. */
const heading = (a, b) => deg(Math.atan2((b[0] - a[0]) * mLng(a[1]), (b[1] - a[1]) * M_LAT));

/** cubic-bezier(x1, y1, x2, y2) as an easing, solved by bisection (exact enough for camera paths). */
const bezier = (x1, y1, x2, y2) => (t) => {
  t = clamp01(t);
  const bx = (u) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
  const by = (u) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < t) lo = mid; else hi = mid;
  }
  return by((lo + hi) / 2);
};

export const ROUTE_WALK = {
  // Washington Square North up University Place, east on 14th Street, into Union Square.
  route: [
    [-73.99556, 40.73072], [-73.99551, 40.73077], [-73.9948, 40.7316], [-73.99437, 40.73213], [-73.99426, 40.73223],
    [-73.99377, 40.73279], [-73.99279, 40.73392], [-73.99225, 40.73453], [-73.99218, 40.73457], [-73.99198, 40.73482],
    [-73.99198, 40.73494], [-73.99186, 40.73508], [-73.99172, 40.73521], [-73.99122, 40.735], [-73.99098, 40.73548],
  ],
  // The places labelled on the way, in the order the line passes them (intersections on University Place).
  places: [
    { name: 'E 8th St', at: [-73.9948, 40.7316] },
    { name: 'E 11th St', at: [-73.99326, 40.73337] },
    { name: 'E 13th St', at: [-73.99225, 40.73453] },
  ],
};

export function routeWalk(opts = {}) {
  // pace stretches every timing: 1 is the reference reel's speed (the line draws in 20 frames), 2 twice as slow.
  const pace = opts.pace ?? 2;
  const frames = opts.frames ?? Math.round(28 * pace + 32);
  const route = opts.route ?? ROUTE_WALK.route;
  const d = densify(route, 4);
  const mid = along(d, 0.5);
  const b0 = heading(route[0], along(d, 0.5)); // the first half of the route runs straight up the screen
  const draw = bezier(0.33, 0, 0.55, 1); // the line: a quick start, an even middle, a soft arrival
  const pull = bezier(0.25, 0, 0.3, 1); // zoom, tilt and turn: one long ease out
  const progress = (f) => (f < 0 ? 0 : 0.012 + 0.988 * draw(f / (20 * pace)));
  // The end framing fits the route: a first guess from its length (tuned on the 0.73 km default), which the capture then
  // refines by projecting the route's ends on the last frame (fit, below) until the end sits just under the card and the
  // start near the bottom, where the reference puts them.
  const tune = { zEnd: 17.2 - Math.log2(d.total / 730), yEnd: 0.54 };
  const zStart = Math.max(tune.zEnd + 1.2, 18.7 - 0.5 * Math.log2(d.total / 730));
  const route3d = {
    version: 8,
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      route: { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: d.pts.slice(0, 2) } } },
      shadows: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      trees: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    sky: { 'sky-color': '#ecebed', 'horizon-color': '#ecebed', 'fog-color': '#ecebed', 'sky-horizon-blend': 0.7, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.75, 'atmosphere-blend': 0 },
    light: { anchor: 'map', position: [1.2, 205, 38], color: '#ffffff', intensity: 0.32 },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': '#efece6' } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#d3dfe8' } },
      { id: 'green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood']]], paint: { 'fill-color': '#d2e4bf' } },
      { id: 'roads', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'minor', 'service', 'trunk', 'path', 'pedestrian']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#f7f5f1', 'line-width': ['interpolate', ['exponential', 2], ['zoom'], 14, 2, 18, ['match', ['get', 'class'], ['path', 'service'], 10, 34]] } },
      { id: 'shadows', type: 'fill', source: 'shadows', paint: { 'fill-color': '#dad7d0', 'fill-antialias': false } },
      { id: 'buildings', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building',
        paint: { 'fill-extrusion-color': '#f4f3f0', 'fill-extrusion-height': ['get', 'render_height'], 'fill-extrusion-base': ['get', 'render_min_height'], 'fill-extrusion-vertical-gradient': true } },
      { id: 'trees', type: 'fill-extrusion', source: 'trees', paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-vertical-gradient': false } },
      { id: 'route-case', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 16, 40, 19, 60], 'line-color': '#2950ae' } },
      { id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 16, 34, 19, 53], 'line-color': '#2c66f6' } },
    ],
  };
  return {
    id: 'route-walk',
    frames,
    fps: 24,
    width: 1080,
    height: 1920,
    style: route3d,
    arc: d.pts,
    places: [...(opts.places ?? ROUTE_WALK.places), { name: 'start', at: route[0] }, { name: 'end', at: route[route.length - 1] }],
    progress,
    // Run once in the page after the style loads: building shadows (each footprint swept along the sun) and trees in
    // the green spaces, both generated from the tiles round the route and fixed for the whole capture.
    setup: { center: mid, sun: [-0.92, -0.38], shadowK: 0.55 },
    fit: { tune, frame: frames - 1, start: route[0], end: route[route.length - 1], top: 0.33, bottom: 0.82 },
    pace,
    // The drawn line, cut each frame at exactly the point the overlay's head dot sits on (the same densified points and
    // the same progress), so the line grows behind the dot and never runs ahead of it.
    paint: (f) => {
      const q = progress(f) * (d.pts.length - 1);
      const i = Math.floor(q);
      const cut = d.pts.slice(0, i + 1);
      if (i < d.pts.length - 1) {
        const [a, b] = [d.pts[i], d.pts[i + 1]];
        cut.push([lerp(a[0], b[0], q - i), lerp(a[1], b[1], q - i)]);
      }
      if (cut.length < 2) cut.push(cut[0]);
      return [['@source', 'route', { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: cut } }]];
    },
    camera: (fr) => {
      const f = fr / pace; // the camera's timing is the reference's, stretched by pace
      const e = pull(f / 28);
      const drift = clamp01((fr - 28 * pace) / (frames - 28 * pace));
      const zoom = lerp(zStart, tune.zEnd, e) - 0.08 * drift;
      const pitch = lerp(63, 50, e);
      const bearing = b0 - 11 * bezier(0.45, 0, 0.3, 1)((f - 3) / 25) - 1.5 * drift;
      // Aim: the head of the line while it draws, then back to the middle of the route so all of it stands in frame.
      const settle = ease((f - 19) / 11);
      const q = lerp(progress(Math.min(fr, 20 * pace)), 0.5, settle);
      const center = along(d, q);
      // Where the aim sits on the screen (0 top, 1 bottom): low while the camera is close, rising as it pulls out.
      const y = lerp(lerp(0.66, 0.38, ease((f - 9) / 11)), tune.yEnd, settle);
      const H = 1920;
      const padding = y >= 0.5 ? { top: (2 * y - 1) * H, bottom: 0, left: 0, right: 0 } : { top: 0, bottom: (1 - 2 * y) * H, left: 0, right: 0 };
      return { center, zoom, pitch, bearing, padding };
    },
  };
}


// ---------------------------------------------------------------------------------------------------------------
// Terrain dive. 1920x1080, 30 fps, 6 s, one move with no cuts. High over the Alps with the Earth curving away (globe
// projection, atmosphere), a fast plunge that pitches over into the Mattertal, a low run down the valley past Zermatt,
// then a bank into the Zmutt valley and up round the Matterhorn, rising until its ridge stands against the sky and
// settling there. Real terrain (AWS Terrain Tiles, Terrarium) exaggerated, hillshade, Sentinel-2 cloudless imagery,
// sky and fog. The camera is flown as a drone is: where it is (lng, lat, metres above sea level), what it looks at,
// and a roll that follows how hard it is turning. Every channel is a smooth spline through keyframes, still at both
// ends, so nothing moves linearly and the speed builds through the dive and bleeds off into the settle.

const TERRAIN_DIVE = {
  peak: { name: 'MATTERHORN', elevation: 4478, at: [7.6586, 45.9764] },
  // Frame, camera [lng, lat, metres above sea level], look-at [lng, lat, metres].
  keys: [
    [0, [7.72, 38.6, 640000], [7.66, 46.0, 2500]],
    [30, [7.72, 42.0, 190000], [7.68, 46.05, 2600]],
    [58, [7.8, 45.1, 36000], [7.76, 46.05, 2400]],
    [80, [7.855, 46.205, 6200], [7.78, 46.06, 2000]],
    [104, [7.795, 46.095, 2900], [7.745, 46.0, 1900]],
    [124, [7.762, 46.045, 2250], [7.725, 46.0, 2300]],
    [146, [7.715, 46.012, 2600], [7.66, 45.985, 3300]],
    [166, [7.675, 46.032, 3600], [7.6586, 45.976, 3700]],
    [179, [7.645, 46.036, 4250], [7.6586, 45.9764, 3600]],
  ],
};

/** A Catmull-Rom spline through (t, v) keys (non-uniform times), with zero velocity at both ends. */
function spline(keys) {
  const n = keys.length;
  const m = keys.map(([t, v], i) => {
    if (i === 0 || i === n - 1) return 0;
    const [t0, v0] = keys[i - 1];
    const [t1, v1] = keys[i + 1];
    return (v1 - v0) / (t1 - t0);
  });
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (keys[i + 1][0] < t) i++;
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    const h = t1 - t0;
    const u = (t - t0) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m[i + 1];
  };
}

export function terrainDive(opts = {}) {
  const frames = opts.frames ?? 180;
  const peak = opts.peak ?? TERRAIN_DIVE.peak;
  const keys = opts.keys ?? TERRAIN_DIVE.keys;
  const ch = (pick) => spline(keys.map((k) => [k[0], pick(k)]));
  const px = ch((k) => k[1][0]), py = ch((k) => k[1][1]), pz = ch((k) => Math.log(k[1][2]));
  const tx = ch((k) => k[2][0]), ty = ch((k) => k[2][1]), tz = ch((k) => k[2][2]);
  const cam = (f) => ({ from: [px(f), py(f)], alt: Math.exp(pz(f)), to: [tx(f), ty(f)], toAlt: tz(f) });
  // Heading of the camera over the ground (planar, good enough at this scale), for the roll.
  const yaw = (f) => {
    const c = cam(f);
    return deg(Math.atan2((c.to[0] - c.from[0]) * Math.cos(rad(c.from[1])), c.to[1] - c.from[1]));
  };
  const unwrap = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
  const rollAt = (f) => {
    const rate = (unwrap(yaw(f - 1), yaw(f + 1)) / 2) * 30; // degrees of heading per second
    const maxRoll = opts.maxRoll ?? 16;
    return -Math.max(-maxRoll, Math.min(maxRoll, rate * 0.55));
  };
  const style = {
    version: 8,
    projection: { type: 'globe' },
    sources: {
      // Elevation for the 3D terrain and, from a separate source, for the hillshade (MapLibre advises not to share one).
      dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 15, attribution: 'Terrain Tiles: Mapzen/AWS Open Data' },
      shade: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 13 },
      // Sentinel-2 cloudless 2016, EOX (CC BY 4.0). WMTS order is {z}/{y}/{x}. Its native detail ends near zoom 13.
      sat: { type: 'raster', tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'], tileSize: 256, maxzoom: 13, attribution: 'Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)' },
    },
    terrain: { source: 'dem', exaggeration: opts.exaggeration ?? 1.7 },
    sky: {
      'sky-color': '#3f78c4',
      'horizon-color': '#cfe0ee',
      'fog-color': '#cddae8',
      'sky-horizon-blend': 0.55,
      'horizon-fog-blend': 0.9,
      'fog-ground-blend': 0.3,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 1, 7, 0],
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#0a0e17' } },
      { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': 0.45, 'raster-contrast': 0.2, 'raster-brightness-min': 0.04, 'raster-brightness-max': 1, 'raster-fade-duration': 0 } },
      { id: 'hill', type: 'hillshade', source: 'shade', paint: { 'hillshade-exaggeration': 0.8, 'hillshade-shadow-color': '#0a1228', 'hillshade-highlight-color': 'rgba(255,226,180,0.55)', 'hillshade-accent-color': '#1b2437', 'hillshade-illumination-direction': 150, 'hillshade-illumination-altitude': 22 } },
    ],
  };
  return {
    id: 'terrain-dive',
    frames,
    fps: FPS,
    style,
    fov: opts.fov ?? 60,
    mapOptions: { maxPitch: 180, maxZoom: 22, centerClampedToGround: false },
    fpv: true,
    places: [{ name: peak.name, at: peak.at, elevation: peak.elevation }],
    peak,
    altitude: (f) => cam(f).alt,
    camera: (f) => {
      const c = cam(f);
      // The terrain is drawn exaggerated, so the camera is placed in the exaggerated world (a metre of rock is `exag`
      // metres tall on screen). From 20 km up the exaggeration fades out, so the globe view keeps its true scale.
      const exag = opts.exaggeration ?? 1.7;
      const k = 1 + (exag - 1) * (1 - clamp01((Math.log(c.alt) - Math.log(20000)) / (Math.log(80000) - Math.log(20000))));
      return { fpv: { from: [c.from[0], c.from[1], c.alt * k], to: [c.to[0], c.to[1], c.toAlt * k] }, roll: rollAt(f) };
    },
  };
}

export const scenes = { flyover, globe, 'city-zoom': cityZoom, 'route-walk': routeWalk, 'terrain-dive': terrainDive };
