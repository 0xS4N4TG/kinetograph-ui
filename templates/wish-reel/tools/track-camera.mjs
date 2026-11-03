// A small camera tracker, so the 3D props stay put in the handheld footage. No Blender, no OpenCV:
//
//   node tools/track-camera.mjs public/walkway.mp4 <eye height m> <pitch deg> > cams/walkway.json
//
// ffmpeg decodes the plate to 480x360 grey. Corners (Shi-Tomasi) are followed from frame to frame by pyramidal
// Lucas-Kanade, kept only if tracking back lands where they started, and topped up when they run out.
//
// The camera starts at the given eye height above a floor (y = 0), tilted by the given pitch. Each frame, the
// tracked points that lie on the floor as the last camera sees it are cast down onto it, and the new camera pose
// (three turns and three moves) is the one that projects those floor points where they were tracked to, fitted
// by RANSAC and Gauss-Newton. Points off the floor (walls, people, railings) do not fit and drop out. Knowing the
// floor's distance makes the moves metric, so a prop stood on the floor stays where it was put.
//
// It writes, for every frame of the plate:
//   { fov, frames: [{ p: [x, y, z], t: [x, y, z], r }] }
// p is the camera, t a point it looks at (Camera3D's position and target, up +y) and r the roll in degrees,
// which the shots apply by turning the tracked layers about the frame's centre, as a rolled camera turns the
// picture. Where too few floor points fit, a similarity fit (pan, tilt, roll, push) carries the camera instead.

import { spawnSync } from 'node:child_process';

const src = process.argv[2];
const EYE = Number(process.argv[3] ?? 1.6);
const PITCH = Number(process.argv[4] ?? 0);
const DEPTH = 9; // the scene's typical depth in metres, for the similarity fallback's push
const VFOV = 42; // a phone's main camera, vertical, in 16:9 video
const W = 480;
const H = 360;

const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', src, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], {
  maxBuffer: 1 << 30,
}).stdout;
const n = Math.floor(raw.length / (W * H));
const f = H / 2 / Math.tan(((VFOV / 2) * Math.PI) / 180);

// ---- images ----

function level(src, w, h) {
  const w2 = w >> 1;
  const h2 = h >> 1;
  const out = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++)
    for (let x = 0; x < w2; x++) {
      const i = 2 * y * w + 2 * x;
      out[y * w2 + x] = (src[i] + src[i + 1] + src[i + w] + src[i + w + 1]) / 4;
    }
  return { d: out, w: w2, h: h2 };
}
function pyramid(i) {
  const d = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) d[k] = raw[i * W * H + k];
  const l0 = { d, w: W, h: H };
  const l1 = level(l0.d, l0.w, l0.h);
  const l2 = level(l1.d, l1.w, l1.h);
  const l3 = level(l2.d, l2.w, l2.h);
  return [l0, l1, l2, l3];
}
function sample(im, x, y) {
  x = Math.min(im.w - 1.001, Math.max(0, x));
  y = Math.min(im.h - 1.001, Math.max(0, y));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * im.w + x0;
  const a = im.d[i];
  const b = im.d[i + 1];
  const c = im.d[i + im.w];
  const e = im.d[i + im.w + 1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy;
}

// ---- corners ----

function corners(im, existing, want) {
  const R = 3;
  const cell = 30;
  const picks = [];
  for (let gy = 0; gy < Math.floor(H / cell); gy++)
    for (let gx = 0; gx < Math.floor(W / cell); gx++) {
      let best = 0;
      let bx = 0;
      let by = 0;
      for (let y = gy * cell + 4; y < (gy + 1) * cell - 4; y += 2)
        for (let x = gx * cell + 4; x < (gx + 1) * cell - 4; x += 2) {
          if (x < 16 || y < 16 || x > W - 16 || y > H - 16) continue;
          let sxx = 0;
          let syy = 0;
          let sxy = 0;
          for (let v = -R; v <= R; v++)
            for (let u = -R; u <= R; u++) {
              const i = (y + v) * W + x + u;
              const ix = (im.d[i + 1] - im.d[i - 1]) / 2;
              const iy = (im.d[i + W] - im.d[i - W]) / 2;
              sxx += ix * ix;
              syy += iy * iy;
              sxy += ix * iy;
            }
          const tr = sxx + syy;
          const lam = tr / 2 - Math.sqrt((tr * tr) / 4 - (sxx * syy - sxy * sxy));
          if (lam > best) {
            best = lam;
            bx = x;
            by = y;
          }
        }
      if (best > 600 && !existing.some((p) => Math.abs(p[0] - bx) < 12 && Math.abs(p[1] - by) < 12)) picks.push([bx, by, best]);
    }
  picks.sort((a, b) => b[2] - a[2]);
  return picks.slice(0, want).map((p) => [p[0], p[1]]);
}

// ---- pyramidal Lucas-Kanade ----

function lk(P, Q, x, y) {
  const R = 6;
  let gx = 0;
  let gy = 0;
  for (let L = P.length - 1; L >= 0; L--) {
    const I = P[L];
    const J = Q[L];
    const s = 1 / (1 << L);
    const px = x * s;
    const py = y * s;
    gx *= 2;
    gy *= 2;
    if (L === P.length - 1) {
      gx = 0;
      gy = 0;
    }
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    const ixs = [];
    const iys = [];
    const ivs = [];
    for (let v = -R; v <= R; v++)
      for (let u = -R; u <= R; u++) {
        const ix = (sample(I, px + u + 1, py + v) - sample(I, px + u - 1, py + v)) / 2;
        const iy = (sample(I, px + u, py + v + 1) - sample(I, px + u, py + v - 1)) / 2;
        ixs.push(ix);
        iys.push(iy);
        ivs.push(sample(I, px + u, py + v));
        sxx += ix * ix;
        syy += iy * iy;
        sxy += ix * iy;
      }
    const det = sxx * syy - sxy * sxy;
    if (det < 1e-3) return null;
    let dx = 0;
    let dy = 0;
    for (let it = 0; it < 12; it++) {
      let bx = 0;
      let by = 0;
      let k = 0;
      for (let v = -R; v <= R; v++)
        for (let u = -R; u <= R; u++, k++) {
          const diff = ivs[k] - sample(J, px + u + gx + dx, py + v + gy + dy);
          bx += diff * ixs[k];
          by += diff * iys[k];
        }
      const ux = (syy * bx - sxy * by) / det;
      const uy = (sxx * by - sxy * bx) / det;
      dx += ux;
      dy += uy;
      if (ux * ux + uy * uy < 0.0004) break;
    }
    gx += dx;
    gy += dy;
  }
  const nx = x + gx;
  const ny = y + gy;
  if (nx < 8 || ny < 8 || nx > W - 8 || ny > H - 8) return null;
  return [nx, ny];
}

// ---- the similarity between two point sets, about the centre ----

function fitLS(a, b) {
  // x' = A x - B y + tx, y' = B x + A y + ty
  let n = 0, sx = 0, sy = 0, sx2 = 0, sy2 = 0, su = 0, sv = 0, sxu = 0, syv = 0, sxv = 0, syu = 0;
  for (let i = 0; i < a.length; i++) {
    const [x, y] = a[i];
    const [u, v] = b[i];
    n++; sx += x; sy += y; su += u; sv += v;
    sx2 += x * x + y * y;
    sxu += x * u + y * v;
    sxv += x * v - y * u;
  }
  const mx = sx / n, my = sy / n, mu = su / n, mv = sv / n;
  const den = sx2 - n * (mx * mx + my * my);
  const A = (sxu - n * (mx * mu + my * mv)) / den;
  const B = (sxv - n * (mx * mv - my * mu)) / den;
  return { A, B, tx: mu - (A * mx - B * my), ty: mv - (B * mx + A * my) };
}
const apply = (m, [x, y]) => [m.A * x - m.B * y + m.tx, m.B * x + m.A * y + m.ty];

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function similarity(a, b) {
  let best = null;
  let bestIn = [];
  for (let it = 0; it < 300; it++) {
    const i = Math.floor(rand() * a.length);
    const j = Math.floor(rand() * a.length);
    if (i === j) continue;
    const m = fitLS([a[i], a[j]], [b[i], b[j]]);
    if (!Number.isFinite(m.A)) continue;
    const inl = [];
    for (let k = 0; k < a.length; k++) {
      const p = apply(m, a[k]);
      if (Math.hypot(p[0] - b[k][0], p[1] - b[k][1]) < 1.2) inl.push(k);
    }
    if (inl.length > bestIn.length) {
      best = m;
      bestIn = inl;
    }
  }
  if (!best || bestIn.length < 6) return { A: 1, B: 0, tx: 0, ty: 0, inliers: 0 };
  const m = fitLS(bestIn.map((k) => a[k]), bestIn.map((k) => b[k]));
  return { ...m, inliers: bestIn.length };
}

// ---- poses ----
// A pose is R (camera to world: columns right, up, back) and C (where the camera is). Camera space looks down -z.

const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const mv = (A, v) => A.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const tr = (A) => [0, 1, 2].map((i) => [A[0][i], A[1][i], A[2][i]]);
function rodrigues([x, y, z]) {
  const th = Math.hypot(x, y, z);
  if (th < 1e-12) return [[1, -z, y], [z, 1, -x], [-y, x, 1]];
  const [a, b, c] = [x / th, y / th, z / th];
  const s = Math.sin(th), k = 1 - Math.cos(th), co = Math.cos(th);
  return [
    [co + a * a * k, a * b * k - c * s, a * c * k + b * s],
    [b * a * k + c * s, co + b * b * k, b * c * k - a * s],
    [c * a * k - b * s, c * b * k + a * s, co + c * c * k],
  ];
}
const step = (pose, q) => ({ R: mul(pose.R, rodrigues([q[0], q[1], q[2]])), C: pose.C.map((c, i) => c + mv(pose.R, [q[3], q[4], q[5]])[i]) });
function ray(pose, [u, v]) {
  return mv(pose.R, [(u - W / 2) / f, -(v - H / 2) / f, -1]);
}
/** Where pixel (u, v) of `pose` meets the floor, or null if it looks above the horizon or very far. */
function onFloor(pose, uv) {
  const d = ray(pose, uv);
  if (d[1] >= -1e-3) return null;
  const t = -pose.C[1] / d[1];
  if (t * Math.hypot(...d) > 40) return null;
  return pose.C.map((c, i) => c + d[i] * t);
}
function proj(pose, X) {
  const c = mv(tr(pose.R), X.map((x, i) => x - pose.C[i]));
  if (c[2] > -0.05) return null;
  return [W / 2 + (f * c[0]) / -c[2], H / 2 - (f * c[1]) / -c[2]];
}
function residuals(pose, q, Xs, uvs) {
  const p2 = step(pose, q);
  const r = [];
  for (let i = 0; i < Xs.length; i++) {
    const p = proj(p2, Xs[i]);
    if (!p) { r.push(50, 50); continue; }
    r.push(p[0] - uvs[i][0], p[1] - uvs[i][1]);
  }
  return r;
}
function solve6(A, b) {
  const n = 6;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) return null;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function gaussNewton(pose, Xs, uvs, iters) {
  let q = [0, 0, 0, 0, 0, 0];
  for (let it = 0; it < iters; it++) {
    const r0 = residuals(pose, q, Xs, uvs);
    const J = [];
    for (let k = 0; k < 6; k++) {
      const e = k < 3 ? 1e-5 : 1e-4;
      const q2 = q.slice();
      q2[k] += e;
      J.push(residuals(pose, q2, Xs, uvs).map((v, i) => (v - r0[i]) / e));
    }
    const A = [0, 1, 2, 3, 4, 5].map((a) => [0, 1, 2, 3, 4, 5].map((b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0) + (a === b ? 1e-2 : 0)));
    const g = [0, 1, 2, 3, 4, 5].map((a) => -J[a].reduce((s, v, i) => s + v * r0[i], 0));
    const d = solve6(A, g);
    if (!d) break;
    q = q.map((v, i) => v + d[i]);
    if (Math.hypot(...d) < 1e-7) break;
  }
  return q;
}
function errOf(pose, q, X, uv) {
  const p = proj(step(pose, q), X);
  return p ? Math.hypot(p[0] - uv[0], p[1] - uv[1]) : 1e9;
}

// ---- run ----

const p0 = (PITCH * Math.PI) / 180;
const fwd0 = [0, Math.sin(p0), -Math.cos(p0)];
const right0 = [1, 0, 0];
const up0 = [0, Math.cos(p0), Math.sin(p0)];
let pose = { R: [0, 1, 2].map((i) => [right0[i], up0[i], -fwd0[i]]), C: [0, EYE, 0] };

function out(pose) {
  const fwd = mv(pose.R, [0, 0, -1]);
  const right = mv(pose.R, [1, 0, 0]);
  const t = pose.C.map((c, i) => c + fwd[i] * 10);
  // roll: how far the camera's right has tipped out of level
  const flatR = Math.hypot(right[0], right[2]);
  const r = (Math.atan2(right[1], flatR) * 180) / Math.PI;
  const fx = (v) => +v.toFixed(4);
  return { p: pose.C.map(fx), t: t.map(fx), r: fx(r) };
}

let prev = pyramid(0);
let pts = corners(prev[0], [], 200);
const frames = [out(pose)];
for (let i = 1; i < n; i++) {
  const next = pyramid(i);
  const a = [];
  const b = [];
  const kept = [];
  for (const p of pts) {
    const q = lk(prev, next, p[0], p[1]);
    if (!q) continue;
    const back = lk(next, prev, q[0], q[1]);
    if (!back || Math.hypot(back[0] - p[0], back[1] - p[1]) > 0.6) continue;
    a.push(p);
    b.push(q);
    kept.push(q);
  }
  // floor candidates: below the horizon and not too far
  const Xs = [];
  const uvs = [];
  for (let k = 0; k < a.length; k++) {
    const X = onFloor(pose, a[k]);
    if (X && a[k][1] > H * 0.55) {
      Xs.push(X);
      uvs.push(b[k]);
    }
  }
  let best = null;
  let bestIn = [];
  if (Xs.length >= 8) {
    for (let it = 0; it < 80; it++) {
      const s = new Set();
      while (s.size < 4) s.add(Math.floor(rand() * Xs.length));
      const idx = [...s];
      const q = gaussNewton(pose, idx.map((k) => Xs[k]), idx.map((k) => uvs[k]), 6);
      const inl = [];
      for (let k = 0; k < Xs.length; k++) if (errOf(pose, q, Xs[k], uvs[k]) < 1.2) inl.push(k);
      if (inl.length > bestIn.length) {
        best = q;
        bestIn = inl;
      }
    }
  }
  let how;
  if (best && bestIn.length >= 8) {
    const q = gaussNewton(pose, bestIn.map((k) => Xs[k]), bestIn.map((k) => uvs[k]), 12);
    pose = step(pose, q);
    how = `floor ${bestIn.length}/${Xs.length}`;
  } else {
    // too few floor points: carry the camera with the similarity of all points about the centre
    const m = similarity(a.map(([x, y]) => [x - W / 2, y - H / 2]), b.map(([x, y]) => [x - W / 2, y - H / 2]));
    const s = Math.hypot(m.A, m.B);
    const q = [Math.atan(m.ty / f) * -1, Math.atan(m.tx / f), -Math.atan2(m.B, m.A), 0, 0, -DEPTH * (1 - 1 / s)];
    pose = step(pose, q);
    how = `similarity ${m.inliers}`;
  }
  frames.push(out(pose));
  if (process.env.TRACK_VERBOSE) process.stderr.write(`frame ${i}: ${a.length} tracked, ${how}\n`);
  pts = kept.length < 120 ? kept.concat(corners(next[0], kept, 200 - kept.length)) : kept;
  prev = next;
}
process.stdout.write(JSON.stringify({ fov: VFOV, frames }) + '\n');
