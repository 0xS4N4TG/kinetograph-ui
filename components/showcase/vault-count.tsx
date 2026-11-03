// Vault Count: a phone wallet balance ticking up while the payments that fed it drift past. The phone holds still (and
// at the end drops out of the bottom of the frame); all the motion is the number and the cards behind it. The counter
// does not tick on a fixed interval: its gaps run 10, 8, 6, 6, 4, 4 frames and then settle into a steady 15 a second.
// Each card loses contrast and gains blur as it rises, so the stack reads as depth rather than a list scrolling.
// Timed to a measured reference at 60 fps; names and copy are generic.

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text, blur, grain, linearGradient, radialGradient } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { keys, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 184;

const hex = z.string().describe('A CSS colour.');

export const vaultCountSchema = z.object({
  label: z.string().describe('Small line above the balance.'),
  chip: z.string().describe('Text of the pill at the top left of the screen.'),
  clock: z.string().describe('The status bar time.'),
  footer: z.string().describe('The line at the foot of the screen.'),
  opening: z.number().int().describe('The opening balance. The count adds one per tick.'),
  currency: z.string().describe('Currency symbol before the balance and the amounts.'),
  entries: z
    .array(
      z.object({
        name: z.string().describe('What was paid for.'),
        letter: z.string().max(1).describe('The one-letter mark.'),
        color: hex.describe('Colour of the mark.'),
        amount: z.number().describe('The amount paid.'),
        share: z.string().describe('The small line under the amount (empty for none).'),
        side: z.enum(['left', 'right']).describe('Which side of the phone the card drifts up.'),
        at: z.number().describe('Frame at which the card top reaches the bottom edge of the frame.'),
      }),
    )
    .describe('The payments that drift past, in order.'),
  font: z.string().describe('Google Fonts family.'),
  background: hex.describe('Ground colour (a pale wash).'),
  card: hex.describe('Card colour.'),
  deviceBody: hex.describe('Phone frame colour.'),
  screenTop: hex.describe('Screen colour at the top right.'),
  screenBottom: hex.describe('Screen colour at the bottom.'),
  speed: z.number().min(0.5).max(2).describe('Speed of the count.'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the frame.'),
});
export type VaultCountProps = z.infer<typeof vaultCountSchema>;

export const vaultCountDefaults: VaultCountProps = {
  label: 'Northline Vault',
  chip: 'Vault',
  clock: '3:14',
  footer: 'Transactions',
  opening: 500,
  currency: '$',
  entries: [
    { name: 'Pro pack', letter: 'P', color: '#e8832f', amount: 149, share: 'Creator share $14.90', side: 'left', at: -26 },
    { name: 'Add-ons', letter: 'A', color: '#2f9d5c', amount: 19, share: 'Creator share $1.90', side: 'right', at: 35 },
    { name: 'Studio', letter: 'S', color: '#4a7ad8', amount: 99, share: 'Creator share $9.90', side: 'left', at: 80 },
    { name: 'Templates', letter: 'T', color: '#8a8d96', amount: 29, share: 'Creator share $2.90', side: 'right', at: 165 },
  ],
  font: 'Geist',
  background: '#eef6fb',
  card: '#fbfaf6',
  deviceBody: '#151314',
  screenTop: '#6d8cd6',
  screenBottom: '#1c2a4b',
  speed: 1,
  grain: 0.02,
};

// frames of each tick: the first five gaps are 10, 8, 6, 6, 4 and then it is steady at every 4th frame
const tickFrames = (n: number): number[] => {
  const out = [24, 32, 38, 44, 48];
  while (out.length < n) out.push(out[out.length - 1] + 4);
  return out;
};

const PWID = 846;
const PX = 538;
const BEZ = 34;
const SWID = PWID - BEZ * 2;

export const VaultCount: React.FC<VaultCountProps> = (p) => {
  const f = useCurrentFrame();
  const ui = useFamily(p.font, ['400', '500', '600']);

  const count = tickFrames(80).filter((t) => t / p.speed <= f).length;
  const balance = p.opening + count;

  // phone top in reference px: still, then it drops away
  const top = keys(f, [[0, 189], [100, 189], [120, 196], [140, 240], [150, 285], [160, 363], [170, 502], [178, 600]], (t) => t);

  return (
    <Layer id="vc-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 9, size: 1.3 })] : undefined}>
      <Rect id="vc-bg" width={W} height={H} fill={linearGradient(['#f3fafd', p.background, '#e9f3fa'], { angle: 135 })} />

      {p.entries.map((e, i) => {
        const y = 540 - 2 * (f - e.at); // reference px of the card top
        if (y > 560 || y < -170) return null;
        const t = Math.min(1, Math.max(0, (330 - y) / 300));
        const r = 22 * t;
        const op = Math.max(0, 1 - 1.15 * t) * (1 - Math.min(1, Math.max(0, (f - 156) / 16)));
        const x = e.side === 'left' ? 108 : 1400;
        return (
          <Layer key={i} id={`vc-c${i}`} x={x} y={y * 2} opacity={op} effects={r >= 1 ? [blur(r)] : undefined}>
            <Rect id={`vc-c${i}-bg`} width={388} height={308} radius={48} fill={p.card} />
            <Ellipse id={`vc-c${i}-dot`} x={40} y={40} width={48} height={48} fill="#ffffff" />
            <Text id={`vc-c${i}-l`} font={ui} weight={600} size={30} color={e.color} x={40} y={50} maxWidth={48} align="center">
              {e.letter}
            </Text>
            <Text id={`vc-c${i}-n`} font={ui} weight={400} size={34} color="#8d8d89" x={120} y={47} maxWidth={240}>
              {e.name}
            </Text>
            <Text id={`vc-c${i}-a`} font={ui} weight={400} size={88} color="#78777b" x={36} y={128} maxWidth={300}>
              {`${p.currency}${e.amount}`}
            </Text>
            <Text id={`vc-c${i}-p`} font={ui} weight={400} size={34} color="#9c9b99" x={36 + 46.7 * (`${e.amount}`.length + 1) + 16} y={183} maxWidth={120}>
              paid
            </Text>
            {e.share ? (
              <Text id={`vc-c${i}-s`} font={ui} weight={400} size={22} color="#8d8d89" x={36} y={267} maxWidth={330}>
                {e.share}
              </Text>
            ) : null}
          </Layer>
        );
      })}

      <Layer id="vc-phone" x={PX} y={top * 2}>
        <Rect id="vc-body" width={PWID} height={1400} radius={116} fill={p.deviceBody} />
        <Layer id="vc-screen" x={BEZ} y={BEZ} clip={{ kind: 'path', d: `M84 0H${SWID - 84}A84 84 0 0 1 ${SWID} 84V1400H0V84A84 84 0 0 1 84 0Z` }}>
          <Rect id="vc-s0" width={SWID} height={1400} fill={linearGradient([[0, '#4a69b3'], [0.22, '#2c4786'], [0.5, '#223a68'], [1, p.screenBottom]], { angle: 180 })} />
          <Ellipse id="vc-s1" x={SWID - 520} y={-160} width={760} height={760} fill={radialGradient([[0, '#7f9be2c0'], [0.55, '#6f8ed666'], [1, '#6f8ed600']])} />
          <Text id="vc-time" font={ui} weight={600} size={32} color="#ffffff" x={36} y={37} maxWidth={140}>
            {p.clock}
          </Text>
          <Rect id="vc-sig1" x={582} y={42} width={8} height={22} radius={2} fill="#ffffff" />
          <Rect id="vc-sig2" x={598} y={42} width={8} height={22} radius={2} fill="#ffffff" />
          <Path id="vc-wifi1" d="M614 52Q628 40 642 52" stroke={{ color: '#ffffff', width: 4, cap: 'round' } as never} />
          <Path id="vc-wifi2" d="M620 59Q628 52 636 59" stroke={{ color: '#ffffff', width: 4, cap: 'round' } as never} />
          <Ellipse id="vc-wifi3" x={625} y={63} width={6} height={6} fill="#ffffff" />
          <Rect id="vc-bat" x={678} y={42} width={8} height={22} radius={3} fill="#ffffff" />
          <Rect id="vc-chip" x={48} y={98} width={160} height={64} radius={32} fill="#1f3a7a99" />
          <Ellipse id="vc-chip-dot" x={56} y={106} width={48} height={48} fill="#ffffff" />
          <Text id="vc-chip-v" font={ui} weight={600} size={28} color="#25468e" x={56} y={114} maxWidth={48} align="center">
            {p.chip.slice(0, 1)}
          </Text>
          <Text id="vc-chip-t" font={ui} weight={500} size={30} color="#ffffff" x={116} y={113} maxWidth={90}>
            {p.chip}
          </Text>
          <Text id="vc-label" font={ui} weight={400} size={38} color="#e8eefb" x={0} y={292} maxWidth={SWID} align="center">
            {p.label}
          </Text>
          <Text id="vc-balance" font={ui} weight={500} size={128} color="#ffffff" x={0} y={338} maxWidth={SWID} align="center">
            {`${p.currency}${balance}`}
          </Text>
          <Text id="vc-foot" font={ui} weight={400} size={30} color="#dfe6f6" x={42} y={593} maxWidth={400}>
            {p.footer}
          </Text>
        </Layer>
        <Rect id="vc-island" x={342} y={64} width={164} height={50} radius={25} fill="#000000" />
      </Layer>
    </Layer>
  );
};
