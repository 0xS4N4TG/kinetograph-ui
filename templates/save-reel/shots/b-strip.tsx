// Shots 04 to 06 are one long pan to the left over a pale strip: the huge gradient "IN YOUR", then the collection,
// a grid of video thumbnails the pointer hovers over (the tile under it pops up), then "COLLECTION" typed out. The
// shots draw this strip in their own windows of the same continuous move.

import React from 'react';
import { Layer, Rect, Text, blur, dropShadow, linearGradient } from '@kinetographdev/core';
import { Hand, PAPER, UI, W, H, WIDE, easeOut, keys, ramp } from '../lib.js';
import { BigArrow, PITCH_X, TILE_H, TILE_W, Thumb, ThumbGrid, textWidth } from './b-common.js';

const lin = (t: number) => t;

// how far the strip has moved left (world px), measured off the reference
const PAN: [number, number][] = [
  [134, 0], [146, 1000], [150, 1420], [153, 1650], [172, 3450], [175, 3730], [177, 3900], [179, 4110], [181, 4260],
  [184, 4420], [188, 4500], [197, 4530],
];

const IN_SIZE = 470;
const Y_AT = 955; // world x of the "Y" of "IN YOUR"
const GRID_X = 1930;
const COLS = 9;
const GRID_Y = 100;
const COLLECTION_X = 4620;
const COLLECTION_W = 850;
const COLLECTION_TYPED: [number, number][] = [[173, 0], [175, 2], [177, 5], [179, 7], [181, 9], [183, 10]];

// the pointer's tip on screen: frame, x, y, spin about its long axis (degrees; 90 is side on)
const POINTER: [number, number, number, number][] = [
  [134, -60, 700, -200], [138, 130, 640, -40], [140, 330, 590, 40], [142, 450, 520, 90], [144, 500, 480, 135],
  [146, 550, 450, 175], [148, 620, 455, 180], [150, 680, 460, 180], [153, 650, 455, 180], [160, 710, 460, 180],
  [168, 840, 462, 180], [172, 1040, 520, 180], [174, 1120, 600, 180],
];

export const Strip: React.FC<{ g: number }> = ({ g }) => {
  const pan = keys(g, PAN, lin);
  const zoom = ramp(g, 188, 197, 1, 0.87);
  // Every motion-blurred layer has an explicit id: automatic ids are tree positions, which shift on the sub-frames
  // where a neighbouring Sequence mounts or unmounts, and an unmatched sub-frame draws nothing (the layer fades).
  // the smear grows with the pan's speed; none on the first frame, whose sub-frames would reach into shot 03
  const shutter = keys(g, [[135, 0], [136, 0.3], [150, 0.4], [158, 0.9], [172, 0.9], [176, 0.6], [186, 0.2]], lin);

  const inLead = textWidth('IN ', UI, IN_SIZE, 700);
  const cSize = (COLLECTION_W / textWidth('COLLECTION', WIDE, 100, 400)) * 100;
  const typed = Math.round(keys(g, COLLECTION_TYPED, lin));

  const p = (i: number) => keys(g, POINTER.map((k) => [k[0], k[i]] as [number, number]), lin);
  const tipX = p(1);
  const tipY = p(2);

  // the tile under the pointer pops up out of the grid's middle row
  const col = Math.max(0, Math.min(COLS - 1, Math.floor((tipX - 60 + pan - GRID_X) / PITCH_X)));
  const pop = g >= 150 && g < 174 ? ramp(g, 150, 153, 0, 1, easeOut) : 0;

  return (
    <Layer>
      <Rect width={W} height={H} fill={PAPER} />
      <Layer x={550} y={400} scale={zoom}>
        <Layer id="strip-pan" x={-550 - pan} y={-400} motionBlur={{ samples: 16, shutter }}>
          {g < 160 && (
              <Text
                font={UI}
                weight={700}
                size={IN_SIZE}
                color={linearGradient(['#ec3cc6', '#f25a8e', '#f6a046'], { angle: 180 })}
                x={Y_AT - inLead}
                y={96}
                effects={[blur(keys(g, [[134, 11], [139, 4], [146, 3]], lin))]}
              >
                IN YOUR
              </Text>
          )}
          {g >= 140 && g < 186 && (
            <Layer x={GRID_X} y={GRID_Y}>
              <ThumbGrid
                cols={COLS}
                skip={(c) => {
                  const x = GRID_X + c * PITCH_X - pan; // on screen, give or take the smear
                  return x > W + 300 || x < -TILE_W - 300;
                }}
              />
            </Layer>
          )}
          {typed > 0 && (
            <Text font={WIDE} weight={400} size={cSize} color="#0b0b0b" x={COLLECTION_X} y={400 - cSize * 0.62}>
              {'COLLECTION'.slice(0, typed)}
            </Text>
          )}
        </Layer>
      </Layer>

      {pop > 0 && (
        <Layer
          x={tipX - 60}
          y={tipY - 45}
          scale={1 + 0.5 * pop}
          id="strip-pop"
          origin="center"
          motionBlur={{ samples: 12, shutter: 1 }}
          effects={[dropShadow({ y: 10, blur: 14, color: '#00000070' })]}
        >
          <Layer x={-TILE_W / 2} y={-TILE_H / 2}>
            <Thumb seed={(2 * COLS + col) * 7 + 3} />
          </Layer>
        </Layer>
      )}

      {g < 174 ? (
        <Layer
          id="strip-pointer"
          x={tipX}
          y={tipY}
          rotation={keys(g, [[138, -25], [146, -15], [151, 0]], lin)}
          motionBlur={{ samples: 12, shutter: 1 }}
        >
          <BigArrow size={keys(g, [[138, 210], [142, 260], [148, 300], [153, 310]], lin)} spin={p(3)} />
        </Layer>
      ) : (
        g < 180 && (
          <Layer
            id="strip-hand"
            x={keys(g, [[174, 1040], [179, 1150]], lin)}
            y={keys(g, [[174, 610], [179, 760]], lin)}
            rotation={-35}
            motionBlur={{ samples: 12, shutter: 1.5 }}
          >
            <Hand size={120} />
          </Layer>
        )
      )}

      {/* "IN YOUR" is drawn under the pointer and again, at 45%, over it: in the reference the pointer passes
          behind the letters, whose blur lets its face show pale pink through them and its outline stay dark */}
      {g < 160 && (
        <Layer x={550} y={400} scale={zoom} opacity={0.45}>
          <Layer id="strip-words-over" x={-550 - pan} y={-400} motionBlur={{ samples: 16, shutter }}>
            <Text
              font={UI}
              weight={700}
              size={IN_SIZE}
              color={linearGradient(['#ec3cc6', '#f25a8e', '#f6a046'], { angle: 180 })}
              x={Y_AT - inLead}
              y={96}
              effects={[blur(keys(g, [[134, 11], [139, 4], [146, 3]], lin))]}
            >
              IN YOUR
            </Text>
          </Layer>
        </Layer>
      )}
    </Layer>
  );
};
