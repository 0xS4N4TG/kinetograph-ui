// Hexed's showroom, on a test clip in public/video/clip.mp4 (local only, not committed: see .gitignore).
// "Reel" plays the clip and rolls a new look every 1.5 s, the seed and genes in the corner; "Sheet" rolls twenty
// seeds onto one frame of it side by side; "Look" is one roll at full size, every control a prop for the studio's
// props panel or an agent.

import React from 'react';
import { AbsoluteFill, Composition, Sequence, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/InterTight';
import { Audio, Freeze, Layer, Rect, Text, Video } from '@kinetographdev/core';
import { Hexed, SLOTS, describe, hash, rng, roll } from '../../plugins/hexed/src/index.js';
import type { Adjust, Genome, Lock, Slot } from '../../plugins/hexed/src/index.js';
import { TEXTURES } from './textures.js';
import { Blobs, PopArt, acidHeat, grainyBW, lookEffects, nightVision, screenGlow } from '../../plugins/vj/src/index.js';
import type { BlobStyle, BlobTrack, PointTrack, VjLook } from '../../plugins/vj/src/index.js';
import clipPerson from './track/clip-person.json' with { type: 'json' };
import songBlobs from './track/song-blobs.json' with { type: 'json' };

const W = 1920;
const H = 1080;
const FPS = 30;
const UI = loadFont('normal', { weights: ['400', '500', '600', '700', '800', '900'] }).fontFamily;

/** Which file Clip plays: the test clip, or the Rick compositions' video (see the Rick* ids at the bottom). */
const ClipSrc = React.createContext('video/clip.mp4');

const Clip: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Video src={staticFile(React.useContext(ClipSrc))} width={width} height={height} fit="cover" />
);

/** The same composition, over public/video/rick/rick.mp4 (local only, not committed). */
const onRick = <P extends object>(C: React.FC<P>): React.FC<P> => (props) => (
  <ClipSrc.Provider value="video/rick/rick.mp4">
    <C {...props} />
  </ClipSrc.Provider>
);

const Label: React.FC<{ text: string; x: number; y: number; size: number }> = ({ text, x, y, size }) => (
  <Layer x={x} y={y}>
    <Rect width={text.length * size * 0.56 + size} height={size * 1.7} radius={4} fill="#000000b8" />
    <Text font={UI} weight={600} size={size} color="#fff" x={size / 2} y={size * 0.33}>
      {text}
    </Text>
  </Layer>
);

// ---- Reel ----

const LOOK_LEN = 45;
const REEL_LEN = 360;

interface ReelProps {
  first: number;
  lock: Partial<Record<Slot, Lock>>;
  off: Slot[];
  adjust: Adjust;
}

export const Reel: React.FC<ReelProps> = ({ first, lock, off, adjust }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    {Array.from({ length: REEL_LEN / LOOK_LEN }, (_, i) => {
      const seed = first + i;
      return (
        <Sequence key={i} from={i * LOOK_LEN} durationInFrames={LOOK_LEN}>
          {/* the clip keeps running under each look: shift it back by where this look starts */}
          <Sequence from={-i * LOOK_LEN}>
            <Hexed seed={seed} lock={lock} off={off} adjust={adjust} textures={TEXTURES}>
              <Clip width={W} height={H} />
            </Hexed>
          </Sequence>
          <Label text={`#${seed}  ${describe(roll(seed, lock, TEXTURES), off) || 'clean'}`} x={32} y={H - 72} size={22} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

// ---- Song: the whole test song, a new look every two bars ----

const SONG_LEN = Math.floor(295.5 * FPS);
// two bars at 135 bpm; the cuts keep the tempo but are not lined up to the downbeat
const BARS = (2 * 4 * 60 * FPS) / 135;

/** Every third look plays a frame blend, the one after it a smear; the rest roll free and still can. */
const songLock = (i: number): Partial<Record<Slot, Lock>> => (i % 3 === 0 ? { time: 'blend' } : i % 3 === 1 ? { optics: 'smear' } : {});

export const Song: React.FC<{ first: number }> = ({ first }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    {/* the sound plays once, whole; the pictures under the looks are muted, so a cut never jumps the audio */}
    <Audio src={staticFile('video/song.mp4')} />
    {Array.from({ length: Math.ceil(SONG_LEN / BARS) }, (_, i) => {
      const seed = first + i;
      const start = Math.round(i * BARS);
      const lock = songLock(i);
      return (
        <Sequence key={i} from={start} durationInFrames={Math.round((i + 1) * BARS) - start}>
          <Sequence from={-start}>
            <Hexed seed={seed} lock={lock} textures={TEXTURES}>
              <Video src={staticFile('video/song.mp4')} width={W} height={H} fit="cover" muted />
            </Hexed>
          </Sequence>
          <Label text={`#${seed}  ${describe(roll(seed, lock, TEXTURES)) || 'clean'}`} x={32} y={H - 72} size={22} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

// ---- Flash: VJ's flash looks on the song, each variant for a second and a half ----

const FLASH: [string, (v: number) => ReturnType<typeof screenGlow>, number[]][] = [
  ['glow', screenGlow, [1, 3, 7, 8]],
  ['acid', acidHeat, [1, 2, 3, 4]],
  ['night', nightVision, [1, 2, 3, 4, 5, 6]],
  ['grainy', grainyBW, [1, 2, 3, 4, 5, 6]],
];
const FLASH_CELLS = FLASH.flatMap(([name, look, vs]) => vs.map((v) => ({ name: `${name} ${v}`, effects: look(v) })));
const FLASH_LEN = 45;
// where in the song the reel starts, frames
const FLASH_AT = 60 * FPS;

export const Flash: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Sequence from={-FLASH_AT}>
      <Audio src={staticFile('video/song.mp4')} />
    </Sequence>
    {FLASH_CELLS.map(({ name, effects }, i) => (
      <Sequence key={i} from={i * FLASH_LEN} durationInFrames={FLASH_LEN}>
        <Sequence from={-FLASH_AT - i * FLASH_LEN}>
          <Layer effects={effects}>
            <Video src={staticFile('video/song.mp4')} width={W} height={H} fit="cover" muted />
          </Layer>
        </Sequence>
        <Label text={name} x={32} y={H - 72} size={26} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

// ---- VjSong: the whole song through every VJ look in turn, a new one every two bars ----

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const VJ_LOOKS: [string, VjLook][] = [
  ['crt', { kind: 'crt' }],
  ['vhs', { kind: 'vhs' }],
  ['1-bit', { kind: 'oneBit' }],
  ['thermal iron', { kind: 'thermal', thermal: { palette: 'iron' } }],
  ['thermal rainbow', { kind: 'thermal', thermal: { palette: 'rainbow' } }],
  ['depth', { kind: 'depth' }],
  ['pixels', { kind: 'pixels', pixels: { zoom: 8 } }],
  ...range(8).map((v): [string, VjLook] => [`glow ${v}`, { kind: 'glow', glow: { v } }]),
  ...range(4).map((v): [string, VjLook] => [`acid ${v}`, { kind: 'acid', acid: { v } }]),
  ...range(6).map((v): [string, VjLook] => [`night ${v}`, { kind: 'night', night: { v } }]),
  ...range(6).map((v): [string, VjLook] => [`grainy ${v}`, { kind: 'grainy', grainy: { v } }]),
];

// the blob marks change with each look, so every style shows up over the song
const BLOB_STYLES: BlobStyle[] = [
  { box: 'frame', label: 'both', links: 'nearest', blend: 'difference' },
  { box: 'corners', label: 'id', links: 'chain', blend: 'difference' },
  { box: 'cross', label: 'xy', links: 'all', reach: 0.3, blend: 'difference', invert: 0.3 },
  { box: 'frame', label: 'none', links: 'all', reach: 0.25, blend: 'difference', invert: 0.5 },
];

/** One video for the whole song and one layer over it: only the layer's effects change at a cut, so the decoder
 *  plays straight through. The tracked blobs (track/song-blobs.json, from plugins/vj/tools/blobs.mjs) sit on top. */
export const VjSong: React.FC = () => {
  const frame = useCurrentFrame();
  const i = Math.floor(frame / BARS);
  const [name, chosen] = VJ_LOOKS[i % VJ_LOOKS.length];
  // the magnifier zooms in over its two bars, from the picture to its subpixels
  const t = (frame - i * BARS) / BARS;
  const look: VjLook = chosen.kind === 'pixels' ? { kind: 'pixels', pixels: { zoom: 1 + 29 * t * t, cx: 960, cy: 420 } } : chosen;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Layer effects={lookEffects(look)}>
        <Video src={staticFile('video/song.mp4')} width={W} height={H} fit="cover" />
      </Layer>
      {chosen.kind !== 'pixels' && <Blobs track={songBlobs as BlobTrack} {...BLOB_STYLES[i % BLOB_STYLES.length]} />}
      <Label text={name} x={32} y={H - 72} size={26} />
    </AbsoluteFill>
  );
};

// ---- Pop: VJ's pop-art cut-in on the test clip, its matte and track from plugins/vj/tools/matte.mjs ----

export const Pop: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    {/* clip.mp4 is the song from 62 s with its sound cut off; the sound comes from the song at the same place */}
    <Sequence from={-62 * FPS}>
      <Audio src={staticFile('video/song.mp4')} />
    </Sequence>
    <PopArt
      src={staticFile('video/clip.mp4')}
      matte={staticFile('video/clip-matte.mp4')}
      track={clipPerson as PointTrack}
      cuts={[
        { in: [30, 48], out: [120, 145], origin: [760, 620] },
        { in: [190, 205], out: [310, 340], origin: [1300, 470] },
      ]}
      flash={[188]}
    />
  </AbsoluteFill>
);

// ---- Sheet ----

const COLS = 5;
const ROWS = 4;
const GAP = 12;
const CW = (W - GAP * (COLS + 1)) / COLS;
const CH = (H - GAP * (ROWS + 1)) / ROWS;
const cellX = (i: number) => GAP + (i % COLS) * (CW + GAP);
const cellY = (i: number) => GAP + Math.floor(i / COLS) * (CH + GAP);

interface SheetProps {
  /** the sheet shows this seed and the nineteen after it */
  first: number;
  /** the frame of the clip to show */
  at: number;
  lock: Partial<Record<Slot, Lock>>;
}

export const Sheet: React.FC<SheetProps> = ({ first, at, lock }) => (
  <AbsoluteFill style={{ backgroundColor: '#111' }}>
    {Array.from({ length: COLS * ROWS }, (_, i) => {
      const seed = first + i;
      return (
        <Layer key={i} x={cellX(i)} y={cellY(i)}>
          <Freeze frame={at}>
            <Hexed seed={seed} lock={lock} textures={TEXTURES} width={CW} height={CH} at={[cellX(i), cellY(i)]}>
              <Clip width={CW} height={CH} />
            </Hexed>
          </Freeze>
          <Label text={`#${seed}  ${describe(roll(seed, lock, TEXTURES)) || 'clean'}`} x={6} y={CH - 26} size={12} />
        </Layer>
      );
    })}
  </AbsoluteFill>
);

// ---- Showcase: one gene at a time, every other slot off ----

/** [slot, gene] pairs to show, each alone on the clip. */
const SHOW: [Slot, string][] = [
  ['mirror', 'mirror-x'], ['mirror', 'mirror-y'], ['mirror', 'quad'], ['mirror', 'tile-2'], ['mirror', 'tile-3'], ['mirror', 'kaleido'], ['mirror', 'split-offset'],
  ['time', 'echo'], ['time', 'ghost'], ['time', 'strobe'], ['time', 'repeat'], ['time', 'reverse'],
  ['optics', 'zoom-blur'], ['optics', 'streaks'], ['optics', 'anamorphic'], ['optics', 'light-leak'], ['optics', 'vignette'], ['optics', 'lens-wobble'],
  ['damage', 'slice-glitch'], ['damage', 'rgb-slice'],
];
const SHOW_LEN = 60;

/** A genome with only `slot` playing `gene`, at full strength. */
function alone(slot: Slot, gene: string, seed: number): Genome {
  const lock = Object.fromEntries(SLOTS.map((s) => [s, s === slot ? { gene, amount: 1 } : 'none'])) as Partial<Record<Slot, Lock>>;
  return roll(seed, lock);
}

export const Showcase: React.FC<{ seed: number }> = ({ seed }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    {SHOW.map(([slot, gene], i) => (
      <Sequence key={i} from={i * SHOW_LEN} durationInFrames={SHOW_LEN}>
        <Sequence from={-i * SHOW_LEN}>
          <Hexed genome={alone(slot, gene, seed)}>
            <Clip width={W} height={H} />
          </Hexed>
        </Sequence>
        <Label text={`${slot} · ${gene}`} x={32} y={H - 72} size={26} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

/** The showcase's genes as stills, side by side. */
export const ShowSheet: React.FC<{ seed: number; at: number }> = ({ seed, at }) => (
  <AbsoluteFill style={{ backgroundColor: '#111' }}>
    {SHOW.map(([slot, gene], i) => (
      <Layer key={i} x={cellX(i)} y={cellY(i)}>
        <Freeze frame={at}>
          <Hexed genome={alone(slot, gene, seed)} width={CW} height={CH} at={[cellX(i), cellY(i)]}>
            <Clip width={CW} height={CH} />
          </Hexed>
        </Freeze>
        <Label text={`${slot} · ${gene}`} x={6} y={CH - 26} size={12} />
      </Layer>
    ))}
  </AbsoluteFill>
);

// ---- GrungeSheet: every grunge option alone, over the clip ----

const GRUNGE_IDS = ['creases', 'stains', 'speckle', 'scratches', 'fibre', 'toner', ...TEXTURES.map((_, i) => `tex-${i}`)];

export const GrungeSheet: React.FC<{ at: number }> = ({ at }) => (
  <AbsoluteFill style={{ backgroundColor: '#111' }}>
    {GRUNGE_IDS.slice(0, COLS * ROWS + 5).map((id, i) => {
      // 25 options in a 5 by 5 grid
      const cw = (W - GAP * 6) / 5;
      const ch = (H - GAP * 6) / 5;
      const x = GAP + (i % 5) * (cw + GAP);
      const y = GAP + Math.floor(i / 5) * (ch + GAP);
      const lock = Object.fromEntries(SLOTS.map((s) => [s, s === 'grunge' ? { gene: id, amount: 1 } : 'none'])) as Partial<Record<Slot, Lock>>;
      const name = id.startsWith('tex-') ? TEXTURES[Number(id.slice(4))].src.split('/').pop()!.replace('.jpg', '') : id;
      return (
        <Layer key={id} x={x} y={y}>
          <Freeze frame={at}>
            <Hexed genome={roll(5, lock, TEXTURES)} textures={TEXTURES} width={cw} height={ch} at={[x, y]}>
              <Clip width={cw} height={ch} />
            </Hexed>
          </Freeze>
          <Label text={name} x={4} y={ch - 22} size={10} />
        </Layer>
      );
    })}
  </AbsoluteFill>
);

// ---- Dream: the soft genes (frame blend, smear, a blur before the hard grades, soft scans), each on its own ----

/** The first strand seed whose `tag` roll lands under or over one half: which side a blur-first grade or a soft
 *  scan falls on is its own coin flip per seed. */
const seedWhere = (tag: string, on: boolean) => {
  for (let s = 1; ; s++) if (rng(hash(`${s}:${tag}`))() < 0.5 === on) return s;
};

type Cell = { name: string; set: Partial<Record<Slot, Lock>> };
const one = (slot: Slot, gene: string, seed = 7): Partial<Record<Slot, Lock>> => ({ [slot]: { gene, amount: 1, seed } });
const DREAM: Cell[] = [
  { name: 'time · blend', set: one('time', 'blend', 3) },
  { name: 'time · blend', set: one('time', 'blend', 11) },
  { name: 'optics · smear', set: one('optics', 'smear', 4) },
  { name: 'optics · smear', set: one('optics', 'smear', 9) },
  { name: 'optics · smear', set: one('optics', 'smear', 21) },
  ...(['threshold', 'thermal', 'posterize', 'negative'] as const).flatMap((gene) => [
    { name: `${gene} · sharp`, set: one('grade', gene, seedWhere('blob', false)) },
    { name: `${gene} · blur first`, set: one('grade', gene, seedWhere('blob', true)) },
  ]),
  ...[6, 8, 11, 13].map((t) => ({ name: `tex-${t} · soft`, set: one('grunge', `tex-${t}`, seedWhere('soft', true)) })),
  { name: 'blend + thermal blur', set: { ...one('time', 'blend', 3), ...one('grade', 'thermal', seedWhere('blob', true)) } },
  { name: 'smear + sepia + soft', set: { ...one('optics', 'smear', 4), ...one('grade', 'sepia-print'), ...one('grunge', 'tex-8', seedWhere('soft', true)) } },
  { name: 'blend + smear + threshold', set: { ...one('time', 'blend', 11), ...one('optics', 'smear', 9), ...one('grade', 'threshold', seedWhere('blob', true)) } },
];

export const Dream: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#111' }}>
    {DREAM.map(({ name, set }, i) => {
      const lock = Object.fromEntries(SLOTS.map((s) => [s, set[s] ?? 'none'])) as Partial<Record<Slot, Lock>>;
      return (
        <Layer key={i} x={cellX(i)} y={cellY(i)}>
          <Hexed genome={roll(1, lock, TEXTURES)} textures={TEXTURES} width={CW} height={CH} at={[cellX(i), cellY(i)]}>
            <Clip width={CW} height={CH} />
          </Hexed>
          <Label text={name} x={6} y={CH - 26} size={12} />
        </Layer>
      );
    })}
  </AbsoluteFill>
);

// ---- Look ----

interface LookProps {
  /** a saved look by name (plugins/hexed/presets); empty rolls from the seed */
  preset: string;
  seed: number;
  amount: number;
  lock: Partial<Record<Slot, Lock>>;
  off: Slot[];
  adjust: Adjust;
}

export const Look: React.FC<LookProps> = ({ preset, seed, amount, lock, off, adjust }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Hexed preset={preset || undefined} seed={seed} amount={amount} lock={lock} off={off} adjust={adjust} textures={TEXTURES}>
      <Clip width={W} height={H} />
    </Hexed>
  </AbsoluteFill>
);

const ADJUST: Adjust = { exposure: 0, shadows: 0, contrast: 0, saturation: 0, hue: 0, invert: false };

const RickReel = onRick(Reel);
const RickSheet = onRick(Sheet);
const RickShowcase = onRick(Showcase);
const RickShowSheet = onRick(ShowSheet);
const RickGrungeSheet = onRick(GrungeSheet);
const RickDream = onRick(Dream);
const RickLook = onRick(Look);
// Rick has no Pop (needs clip-matte.mp4), Song, Flash or VjSong (song-only audio, tracks and cut points)

registerRoot(() => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={REEL_LEN} fps={FPS} width={W} height={H} defaultProps={{ first: 1, lock: {}, off: [], adjust: ADJUST }} />
    <Composition id="Sheet" component={Sheet} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{ first: 1, at: 40, lock: {} }} />
    <Composition id="Showcase" component={Showcase} durationInFrames={SHOW.length * SHOW_LEN} fps={FPS} width={W} height={H} defaultProps={{ seed: 3 }} />
    <Composition id="ShowSheet" component={ShowSheet} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{ seed: 3, at: 40 }} />
    <Composition id="GrungeSheet" component={GrungeSheet} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{ at: 40 }} />
    <Composition id="Pop" component={Pop} durationInFrames={360} fps={FPS} width={W} height={H} />
    <Composition id="VjSong" component={VjSong} durationInFrames={SONG_LEN} fps={FPS} width={W} height={H} />
    <Composition id="Flash" component={Flash} durationInFrames={FLASH_CELLS.length * FLASH_LEN} fps={FPS} width={W} height={H} />
    <Composition id="Song" component={Song} durationInFrames={SONG_LEN} fps={FPS} width={W} height={H} defaultProps={{ first: 600 }} />
    <Composition id="Dream" component={Dream} durationInFrames={180} fps={FPS} width={W} height={H} />
    <Composition id="Look" component={Look} durationInFrames={REEL_LEN} fps={FPS} width={W} height={H} defaultProps={{ preset: 'moss-impact', seed: 1, amount: 1, lock: {}, off: [], adjust: ADJUST }} />
    <Composition id="RickReel" component={RickReel} durationInFrames={REEL_LEN} fps={FPS} width={W} height={H} defaultProps={{ first: 1, lock: {}, off: [], adjust: ADJUST }} />
    <Composition id="RickSheet" component={RickSheet} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{ first: 1, at: 40, lock: {} }} />
    <Composition id="RickShowcase" component={RickShowcase} durationInFrames={SHOW.length * SHOW_LEN} fps={FPS} width={W} height={H} defaultProps={{ seed: 3 }} />
    <Composition id="RickShowSheet" component={RickShowSheet} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{ seed: 3, at: 40 }} />
    <Composition id="RickGrungeSheet" component={RickGrungeSheet} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{ at: 40 }} />
    <Composition id="RickDream" component={RickDream} durationInFrames={180} fps={FPS} width={W} height={H} />
    <Composition id="RickLook" component={RickLook} durationInFrames={REEL_LEN} fps={FPS} width={W} height={H} defaultProps={{ preset: 'moss-impact', seed: 1, amount: 1, lock: {}, off: [], adjust: ADJUST }} />
  </>
));
