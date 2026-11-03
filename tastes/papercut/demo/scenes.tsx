// The eight sets of "How a chatbot answers you". Each is a paper diorama: a backdrop at z 0, cast and props at z ~0.5,
// near things at z ~0.9, under an OrbitCamera (or a PullBack / DutchTilt when the beat calls for it). Frames are scene-local.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from '../tokens';
import {Backdrop, BACKDROPS} from '../paper/backdrops';
import {Depth, DutchTilt, ForegroundPass, OrbitCamera, PullBack} from '../paper/camera';
import {Paper, PopIn, Slab, SparkleBurst, StampMark, hop} from '../paper/kit';
import {LensDirt} from '../paper/look';
import {MarkerArrow, MarkerCircle} from '../paper/proof';
import {TapeCorners} from '../paper/tape';
import {Bubble, You} from '../props/council';
import {Desk} from '../props/everyday';
import {Monitor} from '../ui/ui';
import {
  AiBot, BookStack, ChatPhone, ModelBox, OddsBoard, ReceiptPrinter, Scissors, TOKEN_TINTS, TokenChip, bookStackTop, tokenWidth,
} from '../props/ai';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const QUESTION = 'Why is the sky blue?';
const TOKENS = ['Why', 'is', 'the', 'sky', 'blue', '?'];
const IDS = ['10445', '382', '279', '13180', '6437', '30'];   // illustrative token numbers
const ANSWER = ['Sunlight', 'scatters', 'off', 'the', 'air'];

// Scene lengths (frames). index.tsx sums them for the timeline.
export const DUR = {S1: 96, S2: 108, S3: 108, S4: 126, S5: 120, S6: 108, S7: 108, S8: 78};

// Where the six chips sit once cut (S2 end) and at the start of S3: a loose row across the middle.
const CHIP = 54, GAP = 26;
const ROW_W = TOKENS.reduce((a, t) => a + tokenWidth(t, CHIP), 0) + GAP * (TOKENS.length - 1);
const rowX = (i: number, gap = GAP) => {
  const total = TOKENS.reduce((a, t) => a + tokenWidth(t, CHIP), 0) + gap * (TOKENS.length - 1);
  let x = 540 - total / 2;
  for (let k = 0; k < i; k++) x += tokenWidth(TOKENS[k], CHIP) + gap;
  return x + tokenWidth(TOKENS[i], CHIP) / 2;
};
const ROW_ROT = [-5, 3, -2, 4, -3, 6];
const ROW_DY = [0, 26, -10, 18, -4, 30];

// ---------- S1: you type a question ----------
export const S1Ask: React.FC = () => {
  const f = useCurrentFrame();
  const floor = BACKDROPS['gamer-bedroom'].floorY;
  const PH = {x: 560, w: 420};
  const phY = floor - PH.w * 1.9;
  const sent = 46;
  // the question leaves the phone as a strip of paper, up and out to the right
  const fly = interpolate(f, [sent + 4, sent + 30], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const lift = spring({frame: f - sent, fps: 30, config: {damping: 12, stiffness: 160, mass: 0.7}});
  return (
    <AbsoluteFill>
      <OrbitCamera dur={DUR.S1} yaw={12} push={1.1} origin={[620, floor]} drift={[-20, 0]}>
        <Depth z={0}><Backdrop name="gamer-bedroom" /></Depth>
        <Depth z={0.5}>
          <ChatPhone x={PH.x} y={phY} w={PH.w} q={QUESTION} qAt={12} rot={2} />
          <You x={290} y={floor} size={250} face={1} phase={3} expr={f >= sent ? 'happy' : 'idle'}
            armR={f < sent ? 0.75 : 0.5} armRAngle={f < sent ? -18 + Math.sin(f / 1.6) * (f > 12 ? 4 : 0) : -60} armL={0.2} armLAngle={20}
            lift={hop(f, sent, 10, 16)} />
        </Depth>
        <Depth z={0.85}>
          {f >= sent ? (
            <div style={{position: 'absolute', inset: 0, translate: `${fly * 760}px ${-lift * 120 - fly * 520}px`, rotate: `${-4 + fly * 22}deg`, transformOrigin: '770px 900px'}}>
              <TokenChip x={770} y={900} text={QUESTION} color="#F4EFE5" size={46} scale={0.7 + 0.3 * lift} />
            </div>
          ) : null}
        </Depth>
      </OrbitCamera>
    </AbsoluteFill>
  );
};

// ---------- S2: scissors cut the question into tokens ----------
// The strip is the six chips laid edge to edge on the pegboard; each snip frees the chip to its left, which drops, tilts and takes its colour.
const SNIP0 = 22, SNIP_EVERY = 9;
export const S2Cut: React.FC = () => {
  const f = useCurrentFrame();
  const floor = BACKDROPS['garage-workshop'].floorY;
  const Y = 860;
  const slideIn = interpolate(f, [0, 12], [700, 0], {...clamp, easing: Easing.out(Easing.back(1.2))});
  // scissors: glide to gap k, snip at SNIP0 + k * SNIP_EVERY
  const gapX = (k: number) => rowX(k, 0) + tokenWidth(TOKENS[k], CHIP) / 2;
  const k = Math.max(0, Math.min(4, Math.floor((f - SNIP0 + 6) / SNIP_EVERY)));
  const tSnip = SNIP0 + k * SNIP_EVERY;
  const move = interpolate(f, [tSnip - 6, tSnip - 2], [k === 0 ? gapX(0) + 160 : gapX(k - 1), gapX(k)], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const open = f < tSnip ? interpolate(f, [tSnip - 6, tSnip - 1], [0.3, 1], clamp) : interpolate(f, [tSnip, tSnip + 2, tSnip + 6], [1, 0, 0.3], clamp);
  const sciIn = interpolate(f, [8, 16], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.6))});
  const sciOut = interpolate(f, [SNIP0 + 4 * SNIP_EVERY + 6, SNIP0 + 4 * SNIP_EVERY + 16], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const done = SNIP0 + 4 * SNIP_EVERY + 4;
  return (
    <AbsoluteFill>
      <OrbitCamera dur={DUR.S2} yaw={-12} push={1.08} origin={[540, 1100]}>
        <Depth z={0}><Backdrop name="garage-workshop" /></Depth>
        <Depth z={0.45}>
          {/* tape holding the strip to the pegboard until it is cut up */}
          {f < done + 6 ? <div style={{position: 'absolute', inset: 0, translate: `${slideIn}px 0px`, opacity: interpolate(f, [done, done + 6], [1, 0], clamp)}}>
            <TapeCorners x={540 - ROW_W / 2 + 10} y={Y - 44} w={ROW_W - 20 - 130} len={90} />
          </div> : null}
          {TOKENS.map((t, i) => {
            const cutAt = i < 5 ? SNIP0 + i * SNIP_EVERY : SNIP0 + 4 * SNIP_EVERY;
            const free = spring({frame: f - cutAt, fps: 30, config: {damping: 10, stiffness: 170, mass: 0.6}});
            const settle = spring({frame: f - done, fps: 30, config: {damping: 13, stiffness: 140, mass: 0.7}});
            const x0 = rowX(i, 0), x1 = rowX(i, GAP);
            const x = x0 + (x1 - x0) * settle + slideIn;
            const y = Y + free * 40 + settle * (ROW_DY[i] - 40) - hop(f, cutAt, 8, 22);
            const col = f >= cutAt ? TOKEN_TINTS[i] : '#F4EFE5';
            return <TokenChip key={t} x={x} y={y} text={t} color={col} size={CHIP} rot={free * ROW_ROT[i] * (1 + (1 - settle) * 0.8)} />;
          })}
        </Depth>
        <Depth z={0.6}>
          <AiBot x={190} y={floor} size={200} face={1} phase={8} expr={f > done ? 'happy' : 'idle'}
            lift={hop(f, done + 2, 10, 18)} armR={f > done ? 0.6 : 0.3} armRAngle={f > done ? -55 : 10} armL={0.2} armLAngle={16} />
        </Depth>
        <Depth z={0.75}>
          {sciIn > 0 && sciOut < 1 ? (
            <Scissors x={move} y={Y - 210 - sciOut * 700} s={1.12 * sciIn} open={f < 16 ? 0.6 : open} rot={sciOut * 20} />
          ) : null}
        </Depth>
      </OrbitCamera>
    </AbsoluteFill>
  );
};

// ---------- S3: each token turns into a number and drops into the model ----------
export const S3Numbers: React.FC = () => {
  const f = useCurrentFrame();
  const floor = BACKDROPS['server-room'].floorY;
  const BOX = {x: 180, y: 1000, w: 580, h: 380};
  const Y = 700;
  const flipAt = (i: number) => 10 + i * 6;
  const dropAt = (i: number) => 52 + i * 5;
  const fed = TOKENS.filter((_, i) => f >= dropAt(i) + 14).length;
  return (
    <AbsoluteFill>
      <OrbitCamera dur={DUR.S3} yaw={14} push={1.1} origin={[540, 1150]} drift={[0, -20]}>
        <Depth z={0}><Backdrop name="server-room" /></Depth>
        <Depth z={0.5}>
          <Paper lift={6}>
            <Slab x={BOX.x + 40} y={BOX.y + BOX.h - 10} w={60} h={floor - BOX.y - BOX.h + 10} color="#1C2E2E" r={4} />
            <Slab x={BOX.x + BOX.w - 100} y={BOX.y + BOX.h - 10} w={60} h={floor - BOX.y - BOX.h + 10} color="#1C2E2E" r={4} />
          </Paper>
          <AiBot x={900} y={floor} size={170} face={-1} phase={6} expr={fed >= 6 ? 'happy' : 'idle'} armR={0.6} armRAngle={-35} armL={0.2} armLAngle={20} lift={hop(f, 92, 10, 16)} />
          <ModelBox x={BOX.x} y={BOX.y} w={BOX.w} h={BOX.h} on={0.2 + 0.8 * (fed / 6)} slot={interpolate(f, [92, 100], [0, 1], clamp)} shake={f >= 52 && f < 92 ? 0.6 : 0} />
          {TOKENS.map((t, i) => {
            const flip = interpolate(f, [flipAt(i), flipAt(i) + 6], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
            const d = interpolate(f, [dropAt(i), dropAt(i) + 14], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
            if (d >= 1) return null;
            const x0 = rowX(i), y0 = Y + ROW_DY[i];
            const tx = BOX.x + BOX.w / 2, ty = BOX.y - 120;
            const x = x0 + (tx - x0) * d;
            const y = y0 + (ty - y0) * d - Math.sin(d * Math.PI) * 140;
            return <TokenChip key={t} x={x} y={y} text={t} color={TOKEN_TINTS[i]} size={CHIP} rot={ROW_ROT[i] * (1 - d) + d * 40} flip={flip} back={IDS[i]} scale={1 - 0.45 * d} />;
          })}
        </Depth>
      </OrbitCamera>
    </AbsoluteFill>
  );
};

// ---------- S4: it scores every next token and picks one ----------
export const S4Odds: React.FC = () => {
  const f = useCurrentFrame();
  const floor = BACKDROPS['mission-control'].floorY;
  const MON = {x: 100, y: 470, w: 880, h: 690};
  const pick = 84;
  const out = interpolate(f, [100, 124], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  return (
    <AbsoluteFill>
      <OrbitCamera dur={DUR.S4} yaw={-14} push={1.12} origin={[540, 1000]}>
        <Depth z={0}><Backdrop name="mission-control" /></Depth>
        <Depth z={0.45}>
          <Monitor x={MON.x} y={MON.y} w={MON.w} h={MON.h} screen="#14121C">
            <div style={{position: 'absolute', left: 44, top: 34, fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, color: C.screenDim}}>{QUESTION}</div>
            <div style={{position: 'absolute', left: 44, top: 96, fontFamily: FONT.label, fontWeight: 800, fontSize: 44, color: C.screenText}}>
              Next token? <span style={{opacity: f < pick && Math.floor(f / 8) % 2 ? 0 : 1, color: C.sparkYellow}}>{f >= pick ? 'Sunlight' : '▌'}</span>
            </div>
            <div style={{position: 'absolute', left: 44, right: 44, top: 168, height: 3, background: '#3A3348'}} />
            <OddsBoard x={20} y={210} w={800} at={14} pickAt={pick} rows={[{word: 'Sunlight', p: 0.41}, {word: 'Blue', p: 0.23}, {word: 'Light', p: 0.18}, {word: 'The', p: 0.09}]} />
          </Monitor>
          <MarkerCircle x={MON.x + 22 + 190} y={MON.y + 22 + 210 + 36} w={330} h={120} at={pick + 2} dur={9} />
        </Depth>
        <Depth z={0.6}>
          <AiBot x={170} y={floor} size={190} face={1} phase={2} expr={f >= pick ? 'happy' : 'squint'}
            armR={0.75} armRAngle={-40 + (f >= pick ? Math.sin(f / 2) * 8 : 0)} armL={0.2} armLAngle={20} lift={hop(f, pick, 10, 16)} />
        </Depth>
        <Depth z={0.9}>
          {f >= pick + 12 ? (
            <TokenChip x={420 + out * 120} y={MON.y + 270 - out * 300} text="Sunlight" color={C.sparkYellow} size={58} rot={-6 + out * 10} scale={1 + out * 1.6} />
          ) : null}
        </Depth>
        <LensDirt opacity={0.22} x={540} y={800} r={700} />
      </OrbitCamera>
    </AbsoluteFill>
  );
};

// ---------- S5: the word goes back in, and it guesses again ----------
const PRINT_AT = 10, PRINT_EVERY = 18;
export const S5Loop: React.FC = () => {
  const f = useCurrentFrame();
  const floor = BACKDROPS['warehouse'].floorY;
  const P = {x: 300, y: 1090, w: 480};
  const ph = P.w * 0.55;
  return (
    <AbsoluteFill>
      <OrbitCamera dur={DUR.S5} yaw={12} push={1.1} origin={[540, 1100]} drift={[10, -30]}>
        <Depth z={0}><Backdrop name="warehouse" /></Depth>
        <Depth z={0.45}>
          {/* a kraft crate under the printer */}
          <Paper lift={7}>
            <Slab x={P.x - 30} y={P.y + ph - 6} w={P.w + 60} h={floor - P.y - ph + 6} color="#B98B5A" shade="#94683F" shadeH={0.25} hi="#CDA272" hiH={0.08} r={6}>
              <div style={{position: 'absolute', left: '46%', top: 0, width: 26, height: '100%', background: 'rgba(200,170,120,0.8)'}} />
            </Slab>
          </Paper>
          <ReceiptPrinter x={P.x} y={P.y} w={P.w} words={ANSWER} at={PRINT_AT} every={PRINT_EVERY} size={50} />
          {/* each new word rides a loop back into the printer's intake */}
          {ANSWER.slice(0, 4).map((w, i) => {
            const t0 = PRINT_AT + i * PRINT_EVERY + 4;
            const u = interpolate(f, [t0, t0 + 12], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
            if (u <= 0 || u >= 1) return null;
            const sx = 540 + 150, sy = P.y - 120 - 0 * i, ex = P.x + P.w + 10, ey = P.y + ph * 0.5;
            const cx = 980, cy = P.y - 260;
            const x = (1 - u) ** 2 * sx + 2 * (1 - u) * u * cx + u * u * ex;
            const y = (1 - u) ** 2 * sy + 2 * (1 - u) * u * cy + u * u * ey;
            return <TokenChip key={w} x={x} y={y} text={w} color={TOKEN_TINTS[(i + 2) % 6]} size={34} rot={u * 30} scale={1 - u * 0.4} />;
          })}
          <MarkerArrow x={720} y={P.y - 160} tx={P.x + P.w + 30} ty={P.y + 70} at={20} dur={12} bend={-0.55} color="#C9302C" />
          {f >= 30 ? <PopIn at={30} seed="again"><div style={{position: 'absolute', left: 820, top: P.y - 330, rotate: '6deg'}}>
            <div style={{background: C.creamHi, padding: '10px 22px 12px', fontFamily: FONT.banner, fontSize: 44, color: C.ink, filter: 'url(#torn) drop-shadow(2px 5px 6px rgba(0,0,0,0.35))'}}>AGAIN</div>
          </div></PopIn> : null}
        </Depth>
        <Depth z={0.62}>
          <AiBot x={170} y={floor} size={190} face={1} phase={5} expr="happy"
            lift={[0, 1, 2, 3, 4].reduce((a, i) => a + hop(f, PRINT_AT + i * PRINT_EVERY, 8, 10), 0)} armR={0.5} armRAngle={-30} armL={0.2} armLAngle={20} />
        </Depth>
      </OrbitCamera>
    </AbsoluteFill>
  );
};

// ---------- S6: the odds come from huge piles of text ----------
export const S6Books: React.FC = () => {
  const f = useCurrentFrame();
  const floor = BACKDROPS['library'].floorY;
  const top = bookStackTop(floor, 13, 'mid');
  return (
    <AbsoluteFill>
      <PullBack dur={56} x={540} y={top - 120} from={2.3} at={6}>
        <Backdrop name="library" />
        <BookStack x={250} floor={floor} count={9} at={-60} bw={250} seed="left" />
        <BookStack x={840} floor={floor} count={10} at={-60} bw={260} seed="right" />
        <BookStack x={540} floor={floor} count={13} at={-60} bw={330} seed="mid" />
        {/* late books landing on the side piles as the camera pulls out */}
        <BookStack x={250} floor={bookStackTop(floor, 9, 'left')} count={3} at={34} every={4} bw={240} seed="leftT" />
        <BookStack x={840} floor={bookStackTop(floor, 10, 'right')} count={3} at={40} every={4} bw={250} seed="rightT" />
        <AiBot x={540} y={top + 2} size={170} face={1} phase={1} expr={f > 64 ? 'happy' : 'squint'} armR={0.4} armRAngle={-30} armL={0.4} armLAngle={-30} />
        {/* an open book in its hands, words lifting off the page */}
        <Paper lift={5}>
          <Slab x={470} y={top - 150} w={70} h={92} color="#F4EFE5" shade="#DAD2C2" shadeH={0.08} r={4} rot={-8} />
          <Slab x={540} y={top - 150} w={70} h={92} color="#F4EFE5" shade="#DAD2C2" shadeH={0.08} r={4} rot={8} />
        </Paper>
        {['the', 'sky', 'is', 'blue', 'light', 'air'].map((w, i) => {
          const t0 = 10 + i * 12;
          const u = interpolate(f, [t0, t0 + 30], [0, 1], clamp);
          if (u <= 0 || u >= 1) return null;
          return <TokenChip key={w} x={540 + Math.sin(i * 2.1 + u * 3) * (60 + u * 160)} y={top - 170 - u * 170} text={w} color={TOKEN_TINTS[i % 6]} size={30} rot={(i % 2 ? 1 : -1) * 10} scale={1 - u * 0.3} />;
        })}
      </PullBack>
    </AbsoluteFill>
  );
};

// ---------- S7: it can sound sure and still be wrong ----------
const WRONG = 76;
export const S7Sure: React.FC = () => {
  const f = useCurrentFrame();
  const floor = BACKDROPS['courtroom'].floorY;
  const sure = f < WRONG;
  return (
    <AbsoluteFill>
      <DutchTilt deg={sure ? 0 : 8} at={WRONG} judder={sure ? 0 : 0.8}>
        <OrbitCamera dur={DUR.S7} yaw={10} push={1.12} origin={[560, 1200]}>
          <Depth z={0}><Backdrop name="courtroom" /></Depth>
          <Depth z={0.5}>
            <PopIn at={8} seed="bub" origin="600px 760px" style={{opacity: f >= WRONG ? 0.45 : 1}}>
              <Bubble x={400} y={590} w={520} h={190} text="Trust me. 100% sure!" size={50} tail="bl" />
            </PopIn>
            <AiBot x={430} y={floor} size={250} face={1} phase={4} expr={sure ? 'happy' : 'shock'} lean={sure ? -4 : 6}
              armR={sure ? 0.7 : 0.3} armRAngle={sure ? -70 + Math.sin(f / 3) * 6 : 30} armL={sure ? 0.7 : 0.4} armLAngle={sure ? -70 : 40} lift={hop(f, 8, 10, 14) + hop(f, WRONG, 8, 24)} />
            <StampMark at={WRONG} x={650} y={690} text="CHECK IT" color={C.nogo} size={78} rot={-10} />
          </Depth>
        </OrbitCamera>
      </DutchTilt>
    </AbsoluteFill>
  );
};

// ---------- S8: ask it, then check it ----------
export const S8Check: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const floor = BACKDROPS['home-office-day'].floorY;
  const PH = {x: 470, w: 430};
  const phY = floor - 180 - PH.w * 1.9;
  const tick = 44;
  const s = spring({frame: f - tick, fps, config: {damping: 10, stiffness: 190, mass: 0.6}});
  return (
    <AbsoluteFill>
      <OrbitCamera dur={DUR.S8} yaw={-10} push={1.08} origin={[540, 1150]}>
        <Depth z={0}><Backdrop name="home-office-day" /></Depth>
        <Depth z={0.45}>
          <Desk x={360} y={floor - 180} w={650} floor={floor} />
          <ChatPhone x={PH.x} y={phY} w={PH.w} q={QUESTION} qAt={-80} a="Sunlight scatters off the air, and blue light scatters the most." aAt={4} wpf={3} rot={-3} />
          {f >= tick ? (
            <div style={{position: 'absolute', left: 120, top: 560, scale: String(s), rotate: `${-8 + (1 - s) * 10}deg`, transformOrigin: '170px 90px'}}>
              <Paper lift={7}>
                <Slab x={0} y={0} w={340} h={190} color={C.sparkYellow} shade="#D9A92E" shadeH={0.08} r={4}>
                  <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: FONT.banner, fontSize: 50, color: C.ink, lineHeight: 1.05, textAlign: 'center'}}>CHECK A<br />SOURCE</div>
                </Slab>
              </Paper>
              <TapeCorners x={0} y={0} w={340} h={190} />
            </div>
          ) : null}
          <SparkleBurst at={tick + 2} x={290} y={650} seed="chk" spread={2.2} />
        </Depth>
        <Depth z={0.6}>
          <You x={250} y={floor} size={250} face={1} phase={6} expr={f >= tick ? 'happy' : 'idle'} lift={hop(f, tick, 10, 18)}
            armR={0.6} armRAngle={f >= tick ? -65 : -20} armL={0.25} armLAngle={20} />
        </Depth>
        <ForegroundPass at={0} dur={26} kind="leaf" from="right" />
      </OrbitCamera>
    </AbsoluteFill>
  );
};
