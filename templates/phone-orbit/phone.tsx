// The phone: body, status bar, post header, caption pill, subtitle, view count and the picture inside. Drawn at its
// resting size (388 x 800 canvas pixels, the reference's 194 x 400 doubled); the camera scales and moves it.

import React from 'react';
import { measureText } from '@remotion/layout-utils';
import { Ellipse, Freeze, Image, Layer, Path, Rect, Text, Video, blur, dropShadow, linearGradient, radialGradient } from '@kinetographdev/core';
import { After, DeskPhone, Hand, World, deskCam } from './desk.js';
import type { AfterText } from './desk.js';
import { Logo, Verified, isVideo, srcOf } from './art.js';
import { CUT, FPS, SWAP, glide, ramp, rrect, stroke } from './lib.js';
import type { Keys } from './lib.js';
import type { PhoneOrbitProps } from './props.js';

export const PW = 388;
export const PH = 800;
const INSET = 10;
const SW = PW - 2 * INSET;
const SH = PH - 2 * INSET;

/** The camera on the phone: scale and centre in canvas pixels. Keys are the reference's phone width, centre and
 *  bottom edge (960 px frame), read off every few frames; the close-up ends in a hard cut at CUT. */
export const phoneCam = (f: number): { s: number; x: number; y: number } => {
  let wd: number;
  let cx: number;
  let bottom: number;
  if (f < CUT) {
    wd = glide(f, [[0, 564], [4, 535], [8, 502], [12, 493], [16, 481], [20, 476], [24, 475], [37, 475]]);
    cx = glide(f, [[0, 632], [4, 625], [8, 619], [12, 616], [16, 614.5], [20, 613], [37, 612.5]]);
    bottom = glide(f, [[0, 413], [4, 403], [8, 391], [12, 387], [16, 383.5], [20, 381.5], [24, 382.5], [30, 388], [34, 399], [37, 417]]);
  } else {
    wd = glide(f, [[38, 244], [74, 241], [80, 238], [83, 235], [86, 232], [89, 225], [92, 210], [95, 199.5], [98, 195], [104, 194]]);
    cx = glide(f, [[38, 490], [80, 490], [83, 490], [86, 488], [89, 487.5], [92, 483], [95, 480.8], [98, 480.3], [104, 480.5]]);
    bottom = glide(f, [[38, 438], [40, 462], [44, 477], [48, 490], [52, 497], [56, 502], [60, 506], [70, 508], [77, 507], [80, 504], [83, 502], [86, 500], [89, 492], [92, 475.5], [95, 466.5], [98, 463.5], [104, 462]]);
  }
  const s = wd / 194;
  return { s, x: cx * 2, y: (bottom - 200 * s) * 2 };
};

/** the slow push in over the last third, about the frame centre; applied to the phone and the orbit alike */
export const push = (f: number) => ramp(f, 158, 192, 1, 1.075, (t) => 1 - Math.pow(1 - t, 2));

const textWidth = (text: string, font: string, size: number, weight: number) =>
  measureText({ text, fontFamily: font, fontSize: size, fontWeight: String(weight) }).width;

const StatusBar: React.FC<{ time: string; font: string }> = ({ time, font }) => (
  <Layer>
    <Text font={font} weight={600} size={15} color="#fff" x={27} y={19} lineHeight={1}>
      {time}
    </Text>
    <Rect x={149} y={12} width={70} height={20} radius={10} fill="#000" />
    {[0, 1, 2, 3].map((i) => (
      <Rect key={i} x={308 + i * 3.6} y={27 - i * 1.6 - 3} width={2.2} height={3 + i * 1.6} radius={0.8} fill="#fff" />
    ))}
    <Rect x={326} y={21} width={13} height={6.5} radius={2} fill="#fff" />
  </Layer>
);

const Header: React.FC<{ p: PhoneOrbitProps }> = ({ p }) => {
  const nameW = textWidth(p.brand, p.uiFont, 20, 500);
  return (
    <Layer x={25} y={44}>
      <Logo size={32} color={p.accent} src={srcOf(p.logo)} />
      <Text font={p.uiFont} weight={500} size={20} color="#ececf0" x={47} y={5} lineHeight={1}>
        {p.brand}
      </Text>
      <Layer x={47 + nameW + 8} y={6}>
        <Verified size={20} color="#2f8bff" />
      </Layer>
    </Layer>
  );
};

const Pill: React.FC<{ text: string; font: string }> = ({ text, font }) => {
  const lines = text.split('\n');
  // the reference's pill is 336 px wide at most: shrink the type to fit longer text
  const widest = Math.max(...lines.map((l) => textWidth(l, font, 25, 500)));
  const size = Math.min(25, (25 * (SW - 38 - 22)) / widest);
  const w = widest * (size / 25) + 22;
  const h = lines.length * 30 + 8;
  return (
    <Layer x={19} y={118}>
      <Rect width={w} height={h} radius={10} fill="#000000f2" />
      <Text font={font} weight={500} size={size} color="#fff" x={11} y={5 + (25 - size) * 0.5} lineHeight={30 / size}>
        {text}
      </Text>
    </Layer>
  );
};

const countAt = (f: number, p: PhoneOrbitProps) => {
  // the reference's counter moves in 24 fps steps
  const step = Math.floor((f * 24) / 60);
  const last = (p.countReachedAt * 24) / 60;
  return Math.round(p.countFrom + (p.countTo - p.countFrom) * Math.min(1, step / last));
};

const k = (f: number, keys: Keys) => glide(f, keys);

/** where the phone on the desk is, in screen pixels from the screen's centre, once the hand drags it away */
const dragPose = (f: number) => ({
  x: k(f, [[158, -2], [160, -4], [165, 8], [168, 20], [170, 42], [172, 52], [173, 66], [175, 90], [177, 94]]),
  y: k(f, [[158, 12], [160, 32], [165, 40], [168, 60], [170, 86], [172, 98], [173, 108], [175, 150], [177, 172]]),
  rot: k(f, [[158, 0], [165, -12], [168, -20], [170, -25], [172, -30], [173, -35], [175, -50], [177, -55]]),
});

/** the hand: index fingertip position and turn */
const handPose = (f: number) => {
  const drag = dragPose(f);
  const grabbed = ramp(f, 158, 162, 0, 1);
  const reachX = k(f, [[126, 300], [130, 230], [135, 120], [140, 32], [145, -34], [150, -37], [160, -37]]);
  const reachY = k(f, [[126, 330], [130, 230], [135, 72], [140, -15], [145, -70], [150, -77], [160, -77]]);
  const r = (drag.rot * Math.PI) / 180;
  const offX = -33;
  const offY = -112;
  const gx = drag.x + offX * Math.cos(r) - offY * Math.sin(r);
  const gy = drag.y + offX * Math.sin(r) + offY * Math.cos(r);
  return {
    x: reachX + (gx - reachX) * grabbed,
    y: reachY + (gy - reachY) * grabbed,
    angle: k(f, [[126, -28], [135, -36], [145, -39], [160, -39]]) + drag.rot * 0.7 * grabbed,
    grip: ramp(f, 158, 168, 0, 1),
    blur: f < 145 ? ramp(f, 126, 145, 5, 1) : ramp(f, 162, 172, 0, 3.5),
  };
};

const afterText = (p: PhoneOrbitProps): AfterText => ({
  title: p.appTitle,
  labelA: p.appLabelA,
  timeA: p.appTimeA,
  dayA: p.appDayA,
  labelB: p.appLabelB,
  timeB: p.appTimeB,
  dayB: p.appDayB,
  total: p.appTotal,
  note: p.appNote,
  footer: p.appFooter,
  font: p.uiFont,
  statusTime: '11:52',
});

/** One picture slot filled with a still or a video, covering the phone screen. A video is muted, starts `start` seconds
 *  into the file when the slot first shows (`from` frames into the composition) and is held to the same frame as the
 *  rest of the component (`f`), so `holdFps` applies to the footage too. */
const Media: React.FC<{ file: string; src: string; start: number; from: number; f: number }> = ({ file, src, start, from, f }) =>
  isVideo(file) ? (
    <Freeze frame={f}>
      <Video src={src} width={SW} height={SH} fit="cover" muted trimBefore={Math.round(start * FPS)} from={from} />
    </Freeze>
  ) : (
    <Image src={src} width={SW} height={SH} fit="cover" />
  );

/** the picture inside the phone for this frame */
const Picture: React.FC<{ p: PhoneOrbitProps; f: number; scale: number }> = ({ p, f, scale }) => {
  if (f >= SWAP) {
    const after = srcOf(p.photoAfter);
    const t = f - SWAP;
    const z = 1 + 0.03 * ramp(f, SWAP, 193, 0, 1);
    return (
      <Layer x={SW / 2} y={SH / 2} scale={z} effects={[blur(ramp(t, 0, 10, 1.8, 0.6))]}>
        <Layer x={-SW / 2} y={-SH / 2}>
          {after ? <Media file={p.photoAfter} src={after} start={p.photoAfterStart} from={Math.ceil(SWAP)} f={f} /> : <After text={afterText(p)} t={t} />}
        </Layer>
      </Layer>
    );
  }
  const cam = deskCam(f);
  // soft, low-resolution footage: blurred most in the close-up, and dimmer at the start (the exposure comes up)
  const soft = f < CUT ? 3.2 * scale + 0.5 : ramp(f, CUT, 90, 3, 0.7);
  const dim = k(f, [[0, 0.25], [38, 0.2], [58, 0.1], [75, 0], [90, 0]]);
  const photo = srcOf(p.photo);
  if (photo) {
    // a picture of the user's: the same drift, as a zoom and a slight turn
    // never let the turn show the screen behind the picture: zoom at least enough to keep the rotated picture covering it
    const turn = Math.abs(cam.rot * 0.5) * (Math.PI / 180);
    const cover = Math.cos(turn) + (SH / SW) * Math.sin(turn) + 0.01;
    const zoom = Math.max(1.25 - 0.25 * ramp(f, 0, 100, 0, 1), cover);
    return (
      <Layer x={SW / 2} y={SH / 2} scale={zoom} rotation={cam.rot * 0.5} effects={[blur(soft * 0.4)]}>
        <Layer x={-SW / 2} y={-SH / 2}>
          <Media file={p.photo} src={photo} start={p.photoStart} from={0} f={f} />
        </Layer>
      </Layer>
    );
  }
  const drag = dragPose(f);
  const hand = handPose(f);
  const settled = f < 158;
  return (
    <Layer x={SW / 2} y={SH / 2}>
      <Layer effects={[blur(soft)]}>
        <Layer scale={cam.z} rotation={cam.rot}>
          <Layer x={-cam.cx} y={-cam.cy}>
            <World frame={f} noteColor={p.noteColor} />
            <Layer x={settled ? -2 : drag.x} y={settled ? 12 : drag.y} rotation={settled ? 0 : drag.rot} effects={f >= 162 ? [blur(ramp(f, 162, 172, 0, 4))] : []}>
              <DeskPhone />
            </Layer>
          </Layer>
        </Layer>
        {f >= 126 && <Hand x={hand.x} y={hand.y} angle={hand.angle} grip={hand.grip} blurPx={hand.blur} />}
      </Layer>
      <Rect x={-SW} y={-SH} width={SW * 2} height={SH * 2} fill="#000" opacity={dim} />
    </Layer>
  );
};

export const Phone: React.FC<{ p: PhoneOrbitProps; frame: number }> = ({ p, frame: f }) => {
  const cam = phoneCam(f);
  const g = push(f);
  const s = cam.s * g;
  const x = 960 + (cam.x - 960) * g;
  const y = 540 + (cam.y - 540) * g;
  const subA = ramp(f, 12, 16, 0, 1) * (1 - ramp(f, 96, 99, 0, 1));
  const subB = ramp(f, 97, 100, 0, 1) * (f >= SWAP ? 0 : 1);
  return (
    <Layer x={x} y={y} scale={s}>
      <Layer x={-PW / 2} y={-PH / 2}>
        <Rect
          width={PW}
          height={PH}
          radius={52}
          fill="#0a0a0c"
          effects={[dropShadow({ x: 0, y: 6 * s, blur: 16 * s, color: '#ffffff10' })]}
        />
        <Layer x={INSET} y={INSET} clip={{ kind: 'path', d: rrect(SW, SH, 42) }}>
          <Rect width={SW} height={SH} fill="#08080a" />
          <Picture p={p} f={f} scale={cam.s} />
          <Rect width={SW} height={SH} fill={radialGradient(['#00000000', '#00000000', '#00000090'], { cx: 0.5, cy: 0.5, r: 0.75 })} />
          <Rect width={SW} height={300} fill={linearGradient(['#000000a0', '#00000080', '#00000000'])} />
          <Rect y={SH - 190} width={SW} height={190} fill={linearGradient(['#00000000', '#000000a0'])} />
          <StatusBar time={p.statusTime} font={p.uiFont} />
          <Header p={p} />
          <Pill text={p.postText} font={p.captionFont} />
          <Layer opacity={subA}>
            <Text font={p.uiFont} weight={500} size={17} color="#e9e9ec" x={0} y={617} maxWidth={SW} align="center" lineHeight={1}>
              {p.subtitleBefore}
            </Text>
          </Layer>
          <Layer opacity={subB}>
            <Text font={p.uiFont} weight={500} size={17} color="#e9e9ec" x={0} y={617} maxWidth={SW} align="center" lineHeight={1}>
              {p.subtitleAfter}
            </Text>
          </Layer>
          <Text font={p.monoFont} weight={500} size={27} color="#fff" x={34} y={731} lineHeight={1}>
            {`${countAt(f, p)}${p.countUnit}`}
          </Text>
        </Layer>
        <Rect width={PW} height={PH} radius={52} stroke={stroke('#dcdce2', 3)} />
      </Layer>
    </Layer>
  );
};
