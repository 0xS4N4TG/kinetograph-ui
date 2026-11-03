// AI props: how a language model reads and writes, in cut paper. Made for the papercut-reel "How a chatbot answers you" and
// reusable for any AI or automation explainer. All paper (Slab / Disc inside <Paper>), motion only from the props a scene passes.
//   TokenChip     one token: a torn chip with its text in mono; flips over to show its number
//   PaperCutter   a guillotine paper cutter (mat + blade arm) that chops a strip into tokens
//   ModelBox      the model as a machine: hopper on top, blinking LED panel, an output slot on the right
//   OddsBoard     next-token odds: rows of words with paper bars that fill, the winner lit and lifted
//   ReceiptPrinter  a printer whose paper strip grows up out of it, one word per line
//   BookStack     a pile of paper books that drop in one by one (training text)
//   ChatPhone     a paper phone with a chat: your question types in, the answer streams in word by word
//   Scissors      big paper scissors that snip (pivot at x, y; blades point down)
//   AiBot         the model as a cast member: a lilac critter with a visor and an "AI" pill
//   tokenWidth / bookStackTop   layout helpers (a chip's width; the y of a BookStack's top)
// Positions: TokenChip and OddsBoard rows are centred; everything else takes a top-left (x, y) unless its line says otherwise.
import React from 'react';
import {Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from '../tokens';
import {Disc, GRAIN, Paper, Pill, Slab, Typewriter} from '../paper/kit';
import {Critter} from '../cast/Critter';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Token tints: light papers that keep dark mono text readable.
export const TOKEN_TINTS = ['#F2C14E', '#8CC7B0', '#EE9F7C', '#A9BEE8', '#CDB0DE', '#F4B3C2'];

// One token: a torn paper chip centred on (x, y). `flip` 0-1 turns it over (about its vertical axis) to the dark back,
// which shows `back` (its token number). size = text px.
export const TokenChip: React.FC<{x: number; y: number; text: string; color?: string; size?: number; rot?: number; flip?: number; back?: string; scale?: number}> = ({
  x, y, text, color = TOKEN_TINTS[0], size = 54, rot = 0, flip = 0, back, scale = 1,
}) => {
  const turned = flip > 0.5;
  const sx = Math.abs(Math.cos(flip * Math.PI));
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, rotate: `${rot}deg`, scale: String(scale)}}>
      <div style={{
        position: 'absolute', left: 0, top: 0, translate: '-50% -50%', scale: `${Math.max(0.02, sx)} 1`, whiteSpace: 'nowrap',
        backgroundColor: turned ? C.board : color, backgroundImage: `url(${GRAIN})`, backgroundSize: '420px', backgroundBlendMode: 'multiply',
        color: turned ? C.creamHi : C.ink, fontFamily: FONT.mono, fontWeight: 700, fontSize: size, lineHeight: 1,
        padding: `${size * 0.26}px ${size * 0.34}px ${size * 0.3}px`, borderRadius: 6,
        boxShadow: 'inset 1.5px 1.5px 0 rgba(255,255,255,0.25)',
        filter: 'url(#rough) drop-shadow(3px 7px 7px rgba(0,0,0,0.4))',
      }}>{turned ? back ?? '' : text}</div>
    </div>
  );
};

// Width in px of a TokenChip with this text at this size (JetBrains Mono advances 0.6 em; padding 0.34 em a side).
export const tokenWidth = (text: string, size = 54) => text.length * 0.6 * size + 0.68 * size;

// Big paper scissors. (x, y) = the pivot screw; the blades point down (s = 1: blades 240 px, handle rings about 210 px above), `open` 0-1
// spreads them (0 = shut, a snip), `rot` turns the pair about the pivot.
export const Scissors: React.FC<{x: number; y: number; s?: number; open: number; rot?: number}> = ({x, y, s = 1, open, rot = 0}) => {
  const a = 3 + open * 18;
  const half = (side: 1 | -1) => {
    const X = (v: number) => v * side;
    const blade = [[-13, -10], [13, -10], [13, 150], [0, 240], [-13, 168]].map(([px, py]) => `${X(px)},${py}`).join(' ');
    const stem = [[-10, -4], [10, -4], [X(54) + 13, -112], [X(54) - 13, -112]].map(([px, py]) => `${px},${py}`).join(' ');
    return (
      <g transform={`rotate(${side * a})`}>
        <polygon points={blade} fill={side === 1 ? '#C9D0D3' : '#B1B9BC'} />
        <polygon points={[[X(-2), -6], [X(4), -6], [X(4), 150], [0, 236], [X(-2), 160]].map(([px, py]) => `${px},${py}`).join(' ')} fill="#E4E9EA" opacity={0.7} />
        <polygon points={stem} fill="#B8392E" />
        <ellipse cx={X(54)} cy={-160} rx={42} ry={50} fill="none" stroke="#C4433A" strokeWidth={22} />
        <ellipse cx={X(54) - 4} cy={-164} rx={42} ry={50} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={4} />
      </g>
    );
  };
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, rotate: `${rot}deg`, scale: String(s)}}>
      <svg width={320} height={520} viewBox="-160 -230 320 520" style={{position: 'absolute', left: -160, top: -230, overflow: 'visible', filter: 'url(#rough) drop-shadow(4px 9px 9px rgba(0,0,0,0.4))'}}>
        {half(-1)}
        {half(1)}
        <circle cx={0} cy={0} r={13} fill="#3A3832" stroke="#8C9598" strokeWidth={4} />
      </svg>
    </div>
  );
};

// A guillotine paper cutter, top-left (x, y), w wide (mat is 0.42 w tall). `chop` 0-1 brings the blade arm down from open (-34 deg)
// to shut. The blade pivots at the mat's top-left corner and runs along its top edge.
export const PaperCutter: React.FC<{x: number; y: number; w: number; chop: number}> = ({x, y, w, chop}) => {
  const h = w * 0.42;
  const ang = -34 * (1 - chop);
  return (
    <>
      <Paper lift={8}>
        {/* base board and the green cutting mat with its grid */}
        <Slab x={x - 14} y={y + 8} w={w + 28} h={h + 20} color="#3A3F44" shade="#24282C" shadeH={0.12} r={10} />
        <Slab x={x} y={y + 18} w={w} h={h - 8} color="#4F8A6C" shade="#3C6E55" shadeH={0.05} r={6}>
          {Array.from({length: 9}).map((_, i) => <div key={`v${i}`} style={{position: 'absolute', left: ((i + 1) * w) / 10, top: 0, width: 2, height: '100%', background: 'rgba(230,240,225,0.28)'}} />)}
          {Array.from({length: 3}).map((_, i) => <div key={`h${i}`} style={{position: 'absolute', top: ((i + 1) * (h - 8)) / 4, left: 0, height: 2, width: '100%', background: 'rgba(230,240,225,0.28)'}} />)}
        </Slab>
        {/* the brass ruler along the top edge */}
        <Slab x={x} y={y + 2} w={w} h={20} color={C.brass} shade={C.brassLo} shadeH={0.35} r={3}>
          {Array.from({length: 30}).map((_, i) => <div key={i} style={{position: 'absolute', left: 6 + i * (w / 30), top: 0, width: 2, height: i % 5 ? 7 : 12, background: 'rgba(40,30,10,0.55)'}} />)}
        </Slab>
      </Paper>
      {/* blade arm */}
      <div style={{position: 'absolute', left: x, top: y + 6, width: 0, height: 0, rotate: `${ang}deg`}}>
        <Paper lift={10}>
          <Slab x={-6} y={-16} w={w + 40} h={28} color={C.metal} hi="#D6DCDE" hiH={0.3} shade={C.metalLo} shadeH={0.3} r="4px 14px 14px 4px" />
          <Slab x={w - 30} y={-34} w={150} h={62} color="#A8332A" shade="#7E2219" shadeH={0.3} hi="#C4483C" hiH={0.2} r={30} />
        </Paper>
        <Paper lift={4}><Disc x={0} y={-2} d={44} color={C.board} shade={C.boardLo} /></Paper>
      </div>
    </>
  );
};

// The model as a machine: top-left (x, y), w x h body, a hopper (funnel) above it, an LED panel that blinks while `on` > 0
// (stepped on twos, seeded), a name plate `label`, and an output slot on the right side at mid-height (glows with `slot` 0-1).
export const ModelBox: React.FC<{x: number; y: number; w: number; h: number; on?: number; label?: string; slot?: number; seed?: string; shake?: number}> = ({
  x, y, w, h, on = 1, label = 'MODEL', slot = 0, seed = 'model', shake = 0,
}) => {
  const f = useCurrentFrame();
  const step = Math.floor(f / 2);
  const cols = 8, rows = 4, cell = (w - 120) / cols;
  const jx = shake ? (random(`${seed}sx${step}`) - 0.5) * 6 * shake : 0;
  const leds = [C.go, '#4DA3FF', C.amber, C.go, '#7BD8E6'];
  return (
    <div style={{position: 'absolute', inset: 0, translate: `${jx}px 0px`}}>
      <Paper lift={10}>
        {/* hopper: a trapezoid funnel above the body */}
        <Slab x={x + w * 0.2} y={y - 150} w={w * 0.6} h={160} color="#5F6A73" shade="#48525A" shadeH={0.3} hi="#76818A" hiH={0.08} r={6}
          style={{clipPath: 'polygon(0 0, 100% 0, 72% 100%, 28% 100%)'}} />
        <Slab x={x + w * 0.2 - 10} y={y - 162} w={w * 0.6 + 20} h={22} color="#76818A" shade="#5F6A73" shadeH={0.4} r={6} />
        {/* body */}
        <Slab x={x} y={y} w={w} h={h} color="#2F5A5A" hi="#3E7070" hiH={0.04} shade="#214343" shadeH={0.08} r={18} />
        {/* LED panel */}
        <Slab x={x + 50} y={y + 60} w={w - 100} h={rows * cell + 30} color="#13201F" r={10}>
          {Array.from({length: rows * cols}).map((_, i) => {
            const lit = on > 0 && random(`${seed}${i}-${Math.floor(step / 2)}`) < 0.25 + 0.5 * on;
            const c = leds[i % leds.length];
            return <div key={i} style={{position: 'absolute', left: 15 + (i % cols) * cell + cell * 0.25, top: 15 + Math.floor(i / cols) * cell + cell * 0.25, width: cell * 0.5, height: cell * 0.5, borderRadius: '50%', background: lit ? c : '#2A3534', boxShadow: lit ? `0 0 ${cell * 0.4}px ${c}` : 'none'}} />;
          })}
        </Slab>
        {/* vents */}
        {Array.from({length: 5}).map((_, i) => <Slab key={i} x={x + 60 + i * ((w - 140) / 4)} y={y + h - 90} w={18} h={56} color="#1C3636" r={8} />)}
        {/* output slot */}
        <Slab x={x + w - 26} y={y + h * 0.42} w={44} h={110} color="#1C2E2E" r={8} />
      </Paper>
      {slot > 0 ? <div style={{position: 'absolute', left: x + w - 40, top: y + h * 0.42 - 40, width: 120, height: 190, borderRadius: '50%', opacity: slot * 0.6, background: 'radial-gradient(circle, rgba(255,226,140,0.9) 0%, rgba(255,214,110,0) 65%)'}} /> : null}
      <Pill x={x + w / 2} y={y + h - 150} text={label} bg={C.creamHi} color={C.ink} size={44} />
    </div>
  );
};

// Next-token odds, top-left (x, y), w wide: one row per word (row height 118). Each bar fills from `at` (rows 4 frames apart) to
// its share p (0-1) and the percentage counts up. From `pickAt` the winner (row 0) turns yellow and lifts; the others dim.
export type OddsRow = {word: string; p: number};
export const OddsBoard: React.FC<{x: number; y: number; w: number; rows: OddsRow[]; at: number; pickAt?: number; size?: number}> = ({x, y, w, rows, at, pickAt, size = 50}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const RH = 118, labelW = w * 0.4;
  const picked = pickAt !== undefined && f >= pickAt;
  const lift = pickAt === undefined ? 0 : spring({frame: f - pickAt, fps, config: {damping: 11, stiffness: 200, mass: 0.6}});
  return (
    <>
      {rows.map((r, i) => {
        const fill = interpolate(f, [at + i * 4, at + i * 4 + 16], [0, r.p], {...clamp, easing: Easing.out(Easing.cubic)});
        const win = i === 0;
        const dim = picked && !win ? 0.45 : 1;
        const yy = y + i * RH - (win ? lift * 10 : 0);
        const barW = (w - labelW - 150) * Math.min(1, fill / rows[0].p);
        return (
          <div key={r.word} style={{position: 'absolute', inset: 0, opacity: f < at + i * 4 ? 0 : dim}}>
            <div style={{position: 'absolute', left: x, top: yy + 8, width: labelW - 20, textAlign: 'right', fontFamily: FONT.mono, fontWeight: 700, fontSize: size, color: win && picked ? C.sparkYellow : C.screenText, whiteSpace: 'nowrap'}}>{r.word}</div>
            <Paper lift={4}>
              <Slab x={x + labelW} y={yy + 12} w={Math.max(8, barW)} h={size + 8} color={win && picked ? C.sparkYellow : TOKEN_TINTS[(i + 1) % TOKEN_TINTS.length]} r={6} />
            </Paper>
            <div style={{position: 'absolute', left: x + labelW + barW + 18, top: yy + 14, fontFamily: FONT.label, fontWeight: 800, fontSize: size * 0.82, color: C.screenText, fontVariantNumeric: 'tabular-nums'}}>{Math.round(fill * 100)}%</div>
          </div>
        );
      })}
    </>
  );
};

// A receipt printer, top-left (x, y), w wide (body 0.55 w tall). Its paper strip grows up out of the top slot: `words` print one per
// line, the n-th at at + n * every; the newest line sits at the slot and the strip pushes the older ones up. `hot` = index of a word to mark.
export const ReceiptPrinter: React.FC<{x: number; y: number; w: number; words: string[]; at: number; every: number; size?: number; hot?: number}> = ({x, y, w, words, at, every, size = 46, hot}) => {
  const f = useCurrentFrame();
  const h = w * 0.55, LH = size * 1.55, sw = w * 0.62, sx = x + (w - sw) / 2;
  const n = Math.max(0, Math.min(words.length, Math.floor((f - at) / every) + 1));
  // the strip eases up one line each time a word prints
  const k = (f - at) / every;
  const ease = n > 0 && n < words.length + 1 ? interpolate(k - Math.floor(k), [0, 0.35], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))}) : 1;
  const stripH = 60 + Math.max(0, n - 1 + (n > 0 ? ease : 0)) * LH + (n > 0 ? 20 : 0);
  return (
    <>
      {/* the strip (behind the body) */}
      <div style={{position: 'absolute', left: sx, top: y - stripH + 30, width: sw, height: stripH, overflow: 'hidden'}}>
        <Paper lift={5}>
          <Slab x={0} y={0} w={sw} h={stripH + 10} color="#F4EFE5" shade="#DAD2C2" shadeH={0.02} r={3} style={{clipPath: 'polygon(0 14px, 6% 0, 12% 14px, 18% 0, 24% 14px, 30% 0, 36% 14px, 42% 0, 48% 14px, 54% 0, 60% 14px, 66% 0, 72% 14px, 78% 0, 84% 14px, 90% 0, 96% 14px, 100% 0, 100% 100%, 0 100%)'}} />
        </Paper>
        {words.slice(0, n).map((wd, i) => {
          const fromBottom = n - 1 - i;
          const top = stripH - 30 - LH * (fromBottom + 1) + (i === n - 1 ? (1 - ease) * LH * 0.6 : 0);
          return (
            <div key={i} style={{position: 'absolute', left: 0, width: sw, top, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: size, lineHeight: `${LH}px`, color: C.ink, opacity: i === n - 1 ? ease : 1}}>
              <span style={{background: hot === i ? C.sparkYellow : 'transparent', padding: '0 10px', borderRadius: 4}}>{wd}</span>
            </div>
          );
        })}
      </div>
      <Paper lift={9}>
        <Slab x={x} y={y} w={w} h={h} color="#D8D2C6" hi="#E8E3D9" hiH={0.1} shade="#B3AB9C" shadeH={0.16} r={22} />
        <Slab x={sx - 14} y={y + 10} w={sw + 28} h={30} color="#2B2B30" r={10} />
        <Slab x={x + 40} y={y + h * 0.45} w={w * 0.38} h={h * 0.3} color="#2E4B63" r={8}>
          <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: h * 0.13, color: '#9FE3B0'}}>{n > 0 ? `${n}/${words.length}` : '...'}</div>
        </Slab>
        <Disc x={x + w - 90} y={y + h * 0.6} d={70} color={C.go} shade={C.goDim} />
        <Disc x={x + w - 190} y={y + h * 0.6} d={54} color={C.amber} shade={C.amberDim} />
      </Paper>
    </>
  );
};

// The y of the top of a BookStack with the same floor, count and seed (to sit a critter or prop on it).
export const bookStackTop = (floor: number, count: number, seed = 'books') => {
  let y = floor;
  for (let i = 0; i < count; i++) y -= 52 + Math.round(random(`${seed}h${i}`) * 22);
  return y;
};

// A pile of paper books standing on `floor`, centred on x. Book i drops in at at + i * every and lands with a squash; colours and
// widths are seeded. `count` books; bw = base width.
export const BookStack: React.FC<{x: number; floor: number; count: number; at: number; every?: number; bw?: number; seed?: string}> = ({x, floor, count, at, every = 3, bw = 300, seed = 'books'}) => {
  const f = useCurrentFrame();
  const cols = [['#A8332A', '#7E2219'], ['#2F5A8A', '#203F63'], ['#3E7A55', '#2B5A3D'], ['#C98A2E', '#9C6A1E'], ['#6B4A86', '#4E3463'], ['#2E6B6B', '#1F4D4D'], ['#B5523A', '#8A3B28']];
  let yTop = floor;
  return (
    <>
      {Array.from({length: count}).map((_, i) => {
        const bh = 52 + Math.round(random(`${seed}h${i}`) * 22);
        const w = bw * (0.82 + random(`${seed}w${i}`) * 0.24);
        const dx = (random(`${seed}x${i}`) - 0.5) * 34;
        const rot = (random(`${seed}r${i}`) - 0.5) * 4;
        const t = at + i * every;
        yTop -= bh;
        const by = yTop;
        if (f < t) return null;
        const fall = interpolate(f, [t, t + 5], [-420, 0], {...clamp, easing: Easing.in(Easing.quad)});
        const sq = f >= t + 5 && f < t + 9 ? Math.sin(((f - t - 5) / 4) * Math.PI) * 0.12 : 0;
        const [c, lo] = cols[Math.floor(random(`${seed}c${i}`) * cols.length)];
        return (
          <div key={i} style={{position: 'absolute', inset: 0, translate: `0px ${fall}px`, transformOrigin: `${x}px ${by + bh}px`, scale: `${1 + sq * 0.5} ${1 - sq}`}}>
            <Paper lift={4}>
              <Slab x={x - w / 2 + dx} y={by} w={w} h={bh} color={c} shade={lo} shadeH={0.22} hi="rgba(255,255,255,0.12)" hiH={0.12} r={5} rot={rot}>
                <div style={{position: 'absolute', left: w * 0.12, top: 0, width: 10, height: '100%', background: 'rgba(240,215,150,0.6)'}} />
                <div style={{position: 'absolute', right: w * 0.12, top: 0, width: 10, height: '100%', background: 'rgba(240,215,150,0.6)'}} />
                <div style={{position: 'absolute', left: w * 0.3, top: bh * 0.32, width: w * 0.4, height: bh * 0.3, background: 'rgba(245,235,215,0.75)', borderRadius: 3}} />
              </Slab>
            </Paper>
          </div>
        );
      })}
    </>
  );
};

// A paper phone with a chat, top-left (x, y), w wide (h = 1.9 w). `q` types into your bubble (right, blue) from qAt;
// the answer `a` streams into the model's bubble (left, cream) one word every `wpf` frames from aAt.
export const ChatPhone: React.FC<{x: number; y: number; w: number; q: string; qAt: number; a?: string; aAt?: number; wpf?: number; rot?: number; title?: string}> = ({
  x, y, w, q, qAt, a = '', aAt = 9999, wpf = 4, rot = 0, title = 'Chat',
}) => {
  const f = useCurrentFrame();
  const h = w * 1.9, pad = w * 0.045, sw = w - pad * 2, fs = w * 0.07;
  const words = a.split(' ');
  const shown = f >= aAt ? words.slice(0, Math.min(words.length, Math.floor((f - aAt) / wpf) + 1)).join(' ') : '';
  const qDone = f >= qAt + q.length * 1.5;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, rotate: `${rot}deg`}}>
      <Paper lift={10}>
        <Slab x={0} y={0} w={w} h={h} color="#26232C" r={w * 0.12} />
        <Slab x={pad} y={pad} w={sw} h={h - pad * 2} color="#F1EDE4" r={w * 0.09} grain={0.3}>
          <div style={{position: 'absolute', left: 0, right: 0, top: fs * 0.7, textAlign: 'center', fontFamily: FONT.label, fontWeight: 800, fontSize: fs * 0.95, color: C.ink}}>{title}</div>
          <div style={{position: 'absolute', left: 0, right: 0, top: fs * 2.3, height: 3, background: '#DDD5C7'}} />
          {f >= qAt ? (
            <div style={{position: 'absolute', right: sw * 0.06, top: fs * 3.2, maxWidth: sw * 0.8, padding: `${fs * 0.45}px ${fs * 0.6}px`, borderRadius: `${fs * 0.7}px ${fs * 0.7}px ${fs * 0.15}px ${fs * 0.7}px`, background: C.cap, color: '#F4F1EA', fontFamily: FONT.label, fontWeight: 800, fontSize: fs, lineHeight: 1.2, boxShadow: '1px 3px 4px rgba(0,0,0,0.25)'}}>
              <Typewriter text={q} at={qAt} fpc={1.5} caret={!qDone} />
            </div>
          ) : null}
          {shown ? (
            <div style={{position: 'absolute', left: sw * 0.06, top: fs * 6.4, maxWidth: sw * 0.84, padding: `${fs * 0.45}px ${fs * 0.6}px`, borderRadius: `${fs * 0.7}px ${fs * 0.7}px ${fs * 0.7}px ${fs * 0.15}px`, background: '#DCD3C3', color: C.ink, fontFamily: FONT.label, fontWeight: 800, fontSize: fs, lineHeight: 1.25, boxShadow: '1px 3px 4px rgba(0,0,0,0.2)'}}>
              {shown}{shown.split(' ').length < words.length ? <span style={{opacity: Math.floor(f / 5) % 2 ? 0.2 : 1}}> ●</span> : null}
            </div>
          ) : null}
          {/* input row */}
          <div style={{position: 'absolute', left: sw * 0.05, right: sw * 0.05, bottom: fs * 0.9, height: fs * 1.9, borderRadius: fs, background: '#E3DDD2', border: '3px solid #CFC8BA'}}>
            <div style={{position: 'absolute', left: fs * 0.7, top: fs * 0.45, fontFamily: FONT.label, fontWeight: 800, fontSize: fs * 0.8, color: '#9B9184'}}>Message</div>
            <div style={{position: 'absolute', right: fs * 0.25, top: fs * 0.22, width: fs * 1.35, height: fs * 1.35, borderRadius: '50%', background: C.cap, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: FONT.label, fontWeight: 800, fontSize: fs * 0.8, scale: f >= qAt + q.length * 1.5 && f < qAt + q.length * 1.5 + 4 ? '0.85' : '1'}}>↑</div>
          </div>
        </Slab>
      </Paper>
    </div>
  );
};

// The model as a cast member: a lilac critter with a teal visor and an "AI" name pill. Takes every Critter prop.
export const AIBOT = {color: '#9A86C2', lo: '#7563A0'};
export const AiBot: React.FC<React.ComponentProps<typeof Critter>> = (p) => (
  <Critter color={AIBOT.color} shade={AIBOT.lo} acc="visor" accColor="#3FB6A8" accShade="#2A8277" tag="AI" tagColor={C.purple} {...p} />
);
