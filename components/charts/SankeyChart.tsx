// Sankey chart, after Bklit UI's Sankey Chart (MIT): nodes as 16 px rounded bars in the --chart colours, links as
// ribbons shaded from the source colour to the target colour at 50%, names and values beside the nodes, links that
// draw in along their length, and the hover state (the picked link rises, everything else drops to 10%).
//
// Shot: follow one flow. The camera starts tight on the source node and rides the head of the strongest flow from node
// to target to target, each hop easing in and out so the camera rests at every node while its name and value land.
// When the flow arrives it holds, pushes in a touch (anticipation) and pulls out to the whole diagram with motion
// blur and overshoot while every other node and link draws in, coming into focus as it arrives. The last hop is
// then picked: the rest drops back, a tooltip names the flow.
//
// Principles: staging (one flow, then the rest), slow in and slow out per hop, anticipation and overshoot on the
// pull out, overlap (the other links draw in staggered), follow-through (tooltip), focus that lands on arrivals.

import React from 'react';
import { z } from 'zod';
import { Layer, Path, Rect, Text } from '@kinetographdev/core';
import { Cam, H, W, clamp01, easeOut, lerp, seg, useFonts } from './lib.js';
import { PX, backOut, bkModeSchema, bkPaletteSchema, easeRide, group, hCubic, moveCurve, shutterFor, soft, tokens } from './bklit.js';
import { Backdrop, BkTooltip, Heading, Soft, tipWidth } from './bklitParts.js';

export const SANKEY_FPS = 60;

export const sankeySchema = z.object({
  nodes: z.array(z.object({ name: z.string().describe('Node name.') })).min(3).max(16).describe('The nodes.'),
  links: z.array(z.object({
    source: z.number().int().min(0).describe('Index of the source node.'),
    target: z.number().int().min(0).describe('Index of the target node.'),
    value: z.number().min(0).describe('Flow value.'),
  })).min(2).max(40).describe('The flows. They must run from earlier columns to later ones (no cycles).'),
  startNode: z.number().int().min(0).describe('Node the camera starts on; it follows that node\'s strongest flow on to the end.'),
  title: z.string().describe('Heading.'),
  subtitle: z.string().describe('Muted line under the heading.'),
  unit: z.string().describe('What a value counts, for the tooltip.'),
  mode: bkModeSchema,
  palette: bkPaletteSchema,
  hopSeconds: z.number().min(0.4).max(3).describe('Time the head takes along each hop of the followed flow.'),
  holdSeconds: z.number().min(0).max(8).describe('How long the last frame holds.'),
  camera: z.object({
    tightZoom: z.number().min(1.2).max(3.5).describe('Zoom while following the flow.'),
    wideZoom: z.number().min(0.7).max(1.3).describe('Zoom of the whole diagram.'),
    lead: z.number().min(0).max(500).describe('Screen pixels the camera leads the head by.'),
    motionBlur: z.number().min(0).max(1.5).describe('Strength of the motion blur on the fast moves; 0 turns it off.'),
    rackFocus: z.number().min(0).max(12).describe('Blur in pixels on the rest of the diagram as it arrives; it comes into focus.'),
  }).describe('Camera.'),
});
export type SankeyProps = z.infer<typeof sankeySchema>;

export const sankeyDefaults: SankeyProps = {
  nodes: [
    { name: 'Ads' }, { name: 'Organic' }, { name: 'Referral' },
    { name: 'Landing' }, { name: 'Product' },
    { name: 'Signup' }, { name: 'Docs' },
    { name: 'Checkout' }, { name: 'Exit' },
  ],
  links: [
    { source: 0, target: 3, value: 40 }, { source: 0, target: 4, value: 12 },
    { source: 1, target: 3, value: 30 }, { source: 1, target: 4, value: 22 },
    { source: 2, target: 3, value: 8 }, { source: 2, target: 4, value: 14 },
    { source: 3, target: 5, value: 50 }, { source: 3, target: 6, value: 28 },
    { source: 4, target: 5, value: 30 }, { source: 4, target: 6, value: 18 },
    { source: 5, target: 7, value: 52 }, { source: 5, target: 8, value: 28 },
    { source: 6, target: 7, value: 10 }, { source: 6, target: 8, value: 36 },
  ],
  startNode: 0,
  title: 'Where visitors go',
  subtitle: 'Sessions from first touch to checkout',
  unit: 'sessions',
  mode: 'light',
  palette: 'ocean',
  hopSeconds: 1.05,
  holdSeconds: 1.6,
  camera: { tightZoom: 1.55, wideZoom: 1, lead: 200, motionBlur: 1, rackFocus: 5 },
};

const S = (s: number) => Math.round(s * SANKEY_FPS);

// ---- layout (a plain layered sankey)
interface LNode { i: number; col: number; value: number; x0: number; x1: number; y0: number; y1: number; inOff: number; outOff: number }
interface LLink { i: number; s: number; t: number; v: number; sx: number; sy: number; tx: number; ty: number; th: number }
const PL = 170;
const PR = 1750;
const PT = 330;
const PB = 930;
const NODE_W = 16 * PX;
const NODE_PAD = 12 * PX;

function layout(p: SankeyProps): { nodes: LNode[]; links: LLink[]; cols: number } {
  const n = p.nodes.length;
  const links = p.links.filter((l) => l.source < n && l.target < n && l.source !== l.target);
  const depth = new Array(n).fill(0);
  for (let it = 0; it < n; it++) for (const l of links) depth[l.target] = Math.max(depth[l.target], depth[l.source] + 1);
  const cols = Math.max(...depth) + 1;
  const inSum = new Array(n).fill(0);
  const outSum = new Array(n).fill(0);
  links.forEach((l) => { outSum[l.source] += l.value; inSum[l.target] += l.value; });
  const nodes: LNode[] = p.nodes.map((_, i) => ({ i, col: depth[i], value: Math.max(inSum[i], outSum[i], 0.0001), x0: 0, x1: 0, y0: 0, y1: 0, inOff: 0, outOff: 0 }));
  // one scale for every column
  let k = Infinity;
  for (let c = 0; c < cols; c++) {
    const col = nodes.filter((nd) => nd.col === c);
    const sum = col.reduce((a, nd) => a + nd.value, 0);
    k = Math.min(k, (PB - PT - NODE_PAD * (col.length - 1)) / sum);
  }
  for (let c = 0; c < cols; c++) {
    const col = nodes.filter((nd) => nd.col === c);
    const total = col.reduce((a, nd) => a + nd.value * k, 0) + NODE_PAD * (col.length - 1);
    let y = PT + (PB - PT - total) / 2;
    const x0 = PL + (c * (PR - PL - NODE_W)) / Math.max(1, cols - 1);
    for (const nd of col) {
      nd.x0 = x0;
      nd.x1 = x0 + NODE_W;
      nd.y0 = y;
      nd.y1 = y + nd.value * k;
      y = nd.y1 + NODE_PAD;
    }
  }
  const out: LLink[] = links.map((l, i) => ({ i, s: l.source, t: l.target, v: l.value, sx: 0, sy: 0, tx: 0, ty: 0, th: l.value * k }));
  // stack ribbons on each node, ordered by where they go / come from
  for (const nd of nodes) {
    const outs = out.filter((l) => l.s === nd.i).sort((a, b) => nodes[a.t].y0 - nodes[b.t].y0);
    let o = nd.y0;
    for (const l of outs) { l.sx = nd.x1; l.sy = o; o += l.th; }
    const ins = out.filter((l) => l.t === nd.i).sort((a, b) => nodes[a.s].y0 - nodes[b.s].y0);
    let q = nd.y0;
    for (const l of ins) { l.tx = nd.x0; l.ty = q; q += l.th; }
  }
  return { nodes, links: out, cols };
}

/** The ribbon of a link drawn from its start to fraction t (0..1), as a closed polygon. */
function ribbon(l: LLink, t: number): string {
  if (t < 0.003) return '';
  const N = Math.max(4, Math.ceil(36 * t));
  const top: string[] = [];
  const bot: string[] = [];
  for (let k = 0; k <= N; k++) {
    const tau = (t * k) / N;
    const [x, y] = hCubic(l.sx, l.sy, l.tx, l.ty, tau);
    const [x2, y2] = hCubic(l.sx, l.sy + l.th, l.tx, l.ty + l.th, tau);
    top.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    bot.push(`${x2.toFixed(1)} ${y2.toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
}

const times = (p: SankeyProps, hops: number) => {
  const hop = S(p.hopSeconds);
  const t0 = 0;
  const h0 = S(0.3); // first link starts drawing
  const hopStart = (k: number) => h0 + k * (hop + S(0.18));
  const a0 = hopStart(hops - 1) + hop + S(0.45);
  const m0 = a0 + S(0.3);
  const m1 = m0 + S(1.7);
  const v0 = m1 + S(0.2);
  const v1 = v0 + S(0.7);
  return { hop, t0, hopStart, a0, m0, m1, v0, v1, end: v1 + S(p.holdSeconds) };
};

/** The followed path: from startNode, repeatedly the strongest outgoing link. */
function heroPath(p: SankeyProps, L: ReturnType<typeof layout>): number[] {
  const path: number[] = [];
  let at = Math.min(p.startNode, p.nodes.length - 1);
  for (let guard = 0; guard < 12; guard++) {
    const outs = L.links.filter((l) => l.s === at);
    if (!outs.length) break;
    const best = outs.reduce((a, b) => (b.v > a.v ? b : a));
    path.push(best.i);
    at = best.t;
  }
  return path;
}

export const sankeyDuration = (p: SankeyProps) => {
  const L = layout(p);
  return times(p, Math.max(1, heroPath(p, L).length)).end;
};

export const SankeyChart: React.FC<{ f: number } & SankeyProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const tk = tokens(p.mode, p.palette);
  const L = layout(p);
  const hero = heroPath(p, L);
  const hops = Math.max(1, hero.length);
  const T = times(p, hops);
  const nodeColor = (i: number) => tk.series[i % tk.series.length];
  const heroSet = new Set(hero);
  const heroNodes = new Set<number>();
  hero.forEach((li) => { heroNodes.add(L.links[li].s); heroNodes.add(L.links[li].t); });

  // progress of hero link k
  const hopProg = (ff: number, k: number) => seg(ff, T.hopStart(k), T.hopStart(k) + T.hop, easeRide);
  // the head: centre of the ribbon at its drawn fraction
  const headOf = (ff: number): [number, number] => {
    let k = 0;
    while (k < hops - 1 && ff >= T.hopStart(k + 1)) k++;
    const l = L.links[hero[k]];
    const t = hopProg(ff, k);
    const [x, y] = hCubic(l.sx, l.sy + l.th / 2, l.tx, l.ty + l.th / 2, t);
    return [x, y];
  };
  const startNodeObj = L.nodes[L.links[hero[0]].s];

  // ---- camera
  const wide: [number, number, number] = [W / 2, H / 2, p.camera.wideZoom];
  const camAt = (ff: number): [number, number, number] => {
    const [hx, hy] = headOf(ff);
    const z = p.camera.tightZoom;
    const lead = p.camera.lead * (1 - 0.7 * seg(ff, T.hopStart(hops - 1) + T.hop * 0.6, T.hopStart(hops - 1) + T.hop, (t) => t));
    const startK = seg(ff, 0, T.hopStart(0), (t) => t * t * (3 - 2 * t));
    const cx = lerp(startNodeObj.x1 + 150, hx + lead / z, startK);
    const cy = lerp((startNodeObj.y0 + startNodeObj.y1) / 2, hy, startK);
    const a = seg(ff, T.a0, T.m0, (t) => t * t * (3 - 2 * t));
    const zz = z * (1 + 0.05 * a);
    const w = moveCurve(seg(ff, T.m0, T.m1, (t) => t), 0, 0.055);
    return [lerp(cx - 16 * a, wide[0], w), lerp(cy, wide[1], w), Math.exp(lerp(Math.log(zz), Math.log(wide[2]), w))];
  };
  const cam = camAt(f);
  const shutter = shutterFor(camAt(Math.max(0, f - 1)), cam) * p.camera.motionBlur;

  // ---- per-node and per-link reveal
  const nodeIn = (nd: LNode) => {
    if (heroNodes.has(nd.i)) {
      // the source pops at the start; each target pops as the head nears it
      const k = hero.findIndex((li) => L.links[li].t === nd.i);
      const start = k < 0 ? T.t0 : T.hopStart(k) + T.hop * 0.62;
      return seg(f, start, start + S(0.4), (t) => t);
    }
    const order = nd.col * 3 + nd.i;
    const st = T.m0 + S(0.25) + order * 3;
    return seg(f, st, st + S(0.6), (t) => t);
  };
  const linkProg = (l: LLink) => {
    const hk = hero.indexOf(l.i);
    if (hk >= 0) return hopProg(f, hk);
    const st = T.m0 + S(0.35) + l.i * 4;
    return seg(f, st, st + S(1.0), easeRide);
  };
  const pickI = hero[hero.length - 1];
  const pick = seg(f, T.v0, T.v1, easeOut);
  const reveal = seg(f, 0, S(0.2), easeOut);
  const headK = seg(f, T.m0 + S(0.3), T.m1 - S(0.2), easeOut);

  // the tip of the head while a hero link draws
  const [hdx, hdy] = headOf(f);
  const drawing = f >= T.hopStart(0) && f < T.hopStart(hops - 1) + T.hop;

  // tooltip on the picked link
  const pl = L.links[pickI];
  const tipRows = [{ color: nodeColor(pl.s), label: p.unit, value: group(pl.v) }];
  const tipTitle = `${p.nodes[pl.s].name} → ${p.nodes[pl.t].name}`;
  const tw = tipWidth(tipTitle, tipRows);
  const tipH = (40 + 24 + 20) * PX;
  const [mx, my] = hCubic(pl.sx, pl.sy + pl.th / 2, pl.tx, pl.ty + pl.th / 2, 0.5);
  const tipK = backOut(seg(f, T.v0 + S(0.15), T.v0 + S(0.6), easeOut));

  return (
    <Layer id="sankey-root">
      <Backdrop tk={tk} W={W} H={H} />
      <Cam id="sankey-cam" x={cam[0]} y={cam[1]} zoom={cam[2]} blur={shutter}>
        <Heading id="sankey-head" x={PL} y={96} title={p.title} sub={p.subtitle} tk={tk} fonts={fonts} opacity={headK} />

        {/* links */}
        {L.links.map((l) => {
          const pr = linkProg(l);
          if (pr <= 0.003) return null;
          const isHero = heroSet.has(l.i);
          const isPick = l.i === pickI;
          const base = isPick && pick > 0 ? lerp(0.5, 0.78, pick) : 0.5;
          const dim = pick > 0 && !isPick ? 1 - 0.8 * pick : 1;
          const depth = isHero ? 0 : 1 - seg(f, T.m0 + S(0.35) + l.i * 4, T.m0 + S(0.35) + l.i * 4 + S(1.0), easeOut);
          return (
            <Soft key={l.i} id={`sankey-ls-${l.i}`} r={soft(depth, p.camera.rackFocus)} opacity={base * dim}>
              <Path id={`sankey-link-${l.i}`} d={ribbon(l, pr)}
                fill={{ type: 'linear', x0: l.sx, y0: 0, x1: l.tx, y1: 0, stops: [{ offset: 0, color: nodeColor(l.s) }, { offset: 1, color: nodeColor(l.t) }] }} />
            </Soft>
          );
        })}

        {/* nodes and their names */}
        {L.nodes.map((nd) => {
          const k = nodeIn(nd);
          if (k <= 0.003) return null;
          const pop = backOut(k, 1.2);
          const h = (nd.y1 - nd.y0) * pop;
          const yc = (nd.y0 + nd.y1) / 2;
          const onPick = nd.i === pl.s || nd.i === pl.t;
          const dim = pick > 0 && !onPick ? 1 - 0.6 * pick : 1;
          const right = nd.col < L.cols - 1;
          const isHeroNode = heroNodes.has(nd.i);
          const depth = isHeroNode ? 0 : 1 - seg(f, T.m0 + S(0.25) + (nd.col * 3 + nd.i) * 3, T.m0 + S(0.25) + (nd.col * 3 + nd.i) * 3 + S(0.8), easeOut);
          const tx = right ? nd.x1 + 14 : nd.x0 - 14 - 260;
          return (
            <Soft key={nd.i} id={`sankey-ns-${nd.i}`} r={soft(depth, p.camera.rackFocus)} opacity={dim}>
              <Rect id={`sankey-node-${nd.i}`} x={nd.x0} y={yc - h / 2} width={NODE_W} height={Math.max(1, h)} radius={NODE_W / 2} fill={nodeColor(nd.i)} />
              <Layer id={`sankey-name-${nd.i}`} opacity={clamp01((k - 0.3) / 0.7)}>
                <Text id={`sankey-nt-${nd.i}`} x={tx} y={yc - 26} maxWidth={260} align={right ? 'left' : 'right'} font={fonts.sans} weight={500} size={13 * PX} color={tk.fg}>{p.nodes[nd.i].name}</Text>
                <Text id={`sankey-nv-${nd.i}`} x={tx} y={yc + 6} maxWidth={260} align={right ? 'left' : 'right'} font={fonts.sans} size={11 * PX} color={tk.mutedFg}>{group(nd.value)}</Text>
              </Layer>
            </Soft>
          );
        })}

        {/* head of the followed flow */}
        {drawing ? (
          <Layer id="sankey-head-dot" opacity={reveal}>
            <Rect id="sankey-head-halo" x={hdx - 22} y={hdy - 22} width={44} height={44} radius={22} fill={tk.fg} opacity={0.12} />
            <Rect id="sankey-head-core" x={hdx - 8} y={hdy - 8} width={16} height={16} radius={8} fill={tk.bg} stroke={{ color: tk.fg, width: 4 }} />
          </Layer>
        ) : null}

        {tipK > 0 ? (
          <BkTooltip id="sankey-tt" x={mx - tw / 2} y={my - pl.th / 2 - tipH - 26} title={tipTitle} rows={tipRows} tk={tk} fonts={fonts} width={tw}
            opacity={clamp01(tipK * 1.6)} scale={0.9 + 0.1 * tipK} pivot={[tw / 2, tipH]} />
        ) : null}
      </Cam>
    </Layer>
  );
};
