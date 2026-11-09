/**
 * The Outro's home video: the Guy and Pancake on the porch at sunrise, shot on a 2002 camcorder (handheld wobble,
 * rocker-zoom steps on the beat). Rendered into a 4:3 render target that the bedroom CRT plays, with the camcorder
 * "PLAY ▶ / timecode / NOV 09 2002" OSD drawn into the same picture (so it shrinks with the TV on the pull-back).
 *
 * While the main camera fills the frame with the TV picture only the central horizontal band (BAND of the height)
 * is visible, so porch cameras are specified with a 16:9-band fov and converted (fov43).
 */
import React from 'react';
import {SkyDome, SKY_PRESETS, ExteriorLights, RollingHills, House, HOUSE_SPOTS, SunFlare} from '../../lib/sets/Exterior';
import {Guy, GUY, guyHoldUp, mergePose, guyBlink, GuyPose} from '../../lib/characters/Guy';
import {Pancake, PANCAKE, pancakeHappy, pancakeIdle, pancakeBlink} from '../../lib/characters/Pancake';
import {DogBowl, HeldBook} from '../../lib/props';
import {ramp, lerp, noise1, clamp01} from '../../lib/time';
import {RTCam, V3} from '../Intro/rtt';

export const PORCH_RT = {w: 1440, h: 1080};
/** fraction of the 4:3 picture height visible while the TV fills the 16:9 frame (see index: FILL_K) */
export const BAND = 0.58;
/** matching fraction of the picture WIDTH that is visible while filling (16:9 sub-rectangle of the 4:3 picture) */
export const FILL_W = (BAND * 4) / 3;
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;
/** 4:3 vertical fov whose central BAND shows what a 16:9 camera of fov f169 would show */
export const fov43 = (f169: number) => deg(2 * Math.atan(Math.tan(rad(f169) / 2) / BAND));

// ------------------------------------------------------------------------------------------------ timing (outro-local)
export const PORCH = {
  o2: 81, // DB 206.91 Pancake close-up
  o3: 147, // DB 209.10 two-shot, book up
  bookUp: 156,
};

const SEAT = HOUSE_SPOTS.porchSeat;
export const DOG: V3 = [-0.86, HOUSE_SPOTS.porch[1], 5.02];
const DOG_YAW = -0.32;

const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** camcorder handheld wobble (position + aim), in metres */
const hand = (t: number, amt = 1): {p: V3; a: V3} => ({
  p: [noise1(t * 0.9, 1) * 0.02 * amt, noise1(t * 1.1, 2) * 0.016 * amt, 0],
  a: [noise1(t * 1.3, 3) * 0.035 * amt, noise1(t * 1.2, 4) * 0.028 * amt, 0],
});
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** rocker-zoom steps: each listed frame starts a short smooth zoom */
const zoomSteps = (lf: number, steps: [number, number][], base: number) => {
  let f = base;
  for (const [at, to] of steps) f = lerp(f, to, ramp(lf, at, at + 9));
  return f;
};

export const porchCamera = (lf: number, beats: number[]): RTCam => {
  const t = lf / 30;
  const h = hand(t);
  if (lf < PORCH.o2) {
    const k = ramp(lf, 0, PORCH.o2, (x) => x);
    const fov = zoomSteps(lf, [[beats[1], 31], [beats[3], 28]], 34);
    return {position: add(mix3([-0.35, 1.38, 9.4], [-0.5, 1.36, 9.15], k), h.p), target: add([-1.2, 0.98, 5.25], h.a), fov: fov43(fov)};
  }
  if (lf < PORCH.o3) {
    const k = ramp(lf, PORCH.o2, PORCH.o3, (x) => x);
    const head: V3 = [DOG[0] - 0.05, DOG[1] + 0.48, DOG[2] + 0.25];
    const fov = zoomSteps(lf, [[beats[5], 30]], 33);
    return {position: add(mix3([DOG[0] + 0.16, DOG[1] + 0.64, DOG[2] + 1.6], [DOG[0] + 0.1, DOG[1] + 0.6, DOG[2] + 1.42], k), h.p), target: add(head, h.a), fov: fov43(fov)};
  }
  const k = ramp(lf, PORCH.o3, PORCH.o3 + 200, (x) => x);
  // after the book goes up the camcorder operator zooms out a notch and tilts up onto it (cover + face + Pancake all in frame)
  const tilt = ramp(lf, PORCH.bookUp + 4, PORCH.bookUp + 20);
  const fov = zoomSteps(lf, [[PORCH.bookUp + 4, 39]], 34);
  return {position: add(mix3([-0.95, 1.12, 7.75], [-1.08, 1.2, 7.4], k), h.p), target: add([lerp(-1.18, -1.4, tilt), lerp(1.22, 1.5, tilt), 5.3], h.a), fov: fov43(fov)};
};

// ------------------------------------------------------------------------------------------------ cast poses
const readPose = (t: number): GuyPose => {
  const base = guyHoldUp(0, t);
  return mergePose(base, {
    sit: 1,
    headPitch: 0.42 + 0.03 * Math.sin(t * 1.3),
    headYaw: -0.05,
    expression: 'happy',
    mouthOpen: 0,
    eyesY: -0.6,
    blink: guyBlink(t, 8),
  });
};

const guyPose = (lf: number): {pose: GuyPose; bookOpen: number} => {
  const t = lf / 30;
  if (lf < PORCH.o3) {
    // reading; on the Pancake close-up he glances over at the dog (head turn)
    const look = lf >= PORCH.o2 ? ramp(lf, PORCH.o2 + 20, PORCH.o2 + 30) : 0;
    return {pose: mergePose(readPose(t), {headYaw: lerp(-0.05, -0.55, look), headPitch: lerp(0.42, 0.2, look), eyesY: lerp(-0.6, -0.2, look)}), bookOpen: 1};
  }
  const p = ramp(lf, PORCH.bookUp, PORCH.bookUp + 14);
  const up = mergePose(guyHoldUp(p, t), {
    sit: 1,
    headPitch: lerp(0.4, -0.12, ramp(lf, PORCH.o3 + 2, PORCH.bookUp + 4)),
    headYaw: 0.08,
    expression: 'happy',
    expression2: 'happy',
    mouthOpen: 0.25 + 0.15 * Math.max(0, Math.sin(t * 7)) * ramp(lf, PORCH.bookUp + 10, PORCH.bookUp + 20),
    blink: guyBlink(t, 9),
    eyesY: 0.1,
  });
  return {pose: up, bookOpen: 1 - ramp(lf, PORCH.o3, PORCH.bookUp)};
};

const dogPose = (lf: number) => {
  const t = lf / 30;
  if (lf < PORCH.o2) {
    // sitting by his (licked-clean) bowl, wagging, licking his chops
    const lick = Math.max(0, Math.sin(t * 5.5)) * (Math.sin(t * 1.3) > 0.2 ? 1 : 0);
    return {...pancakeIdle(t, 2), sit: 1, eyes: 'happy' as const, tailWag: t * 2.6, tailWagAmount: 0.85, mouthOpen: 0.25 + 0.2 * lick, tongue: 0.4 + 0.5 * lick, earPerk: 0.35, headPitch: 0.12, blink: 0};
  }
  if (lf < PORCH.o3) {
    // looks up into the camcorder: head tilt on the beat, big happy wag
    const tilt = Math.sin(t * Math.PI * 1.05) * 0.28;
    return {
      ...pancakeIdle(t, 3), sit: 1, eyes: (lf > PORCH.o2 + 34 ? 'happy' : 'open') as 'happy' | 'open', headPitch: 0.3, headTilt: tilt, headYaw: 0.25,
      tailWag: t * 3.2, tailWagAmount: 1, mouthOpen: 0.45, tongue: 0.75, earPerk: 0.6, blink: lf > PORCH.o2 + 34 ? 0 : pancakeBlink(t, 3),
    };
  }
  return {...pancakeHappy(t, 1, true), headYaw: 0.2};
};

// ------------------------------------------------------------------------------------------------ the 3D porch content
export const PorchFootage: React.FC<{lf: number}> = ({lf}) => {
  const t = lf / 30 + 3;
  const {pose, bookOpen} = guyPose(lf);
  const P = SKY_PRESETS.sunrise;
  return (
    <>
      <SkyDome preset="sunrise" time={t} />
      <ExteriorLights preset="sunrise" />
      <RollingHills palette="sunrise" />
      <House time="sunrise" />
      {/* warm bounce on the cast (the sun is behind the house) */}
      <pointLight position={[-0.6, 2.2, 8.2]} color="#ffd2a8" intensity={1.7} distance={7} decay={1.3} />
      <Guy position={[SEAT[0], SEAT[1] - GUY.seatHeight, SEAT[2]]} rotation={[0, 0.1, 0]} pose={pose}
        rightHand={<group scale={1.3}><HeldBook open={bookOpen} /></group>} />
      <group position={DOG} rotation={[0, DOG_YAW, 0]}>
        <Pancake pose={dogPose(lf)} />
        <DogBowl position={[PANCAKE.bowl[0] + 0.05, 0, PANCAKE.bowl[2] + 0.06]} fill={0} />
      </group>
      <SunFlare dir={P.sunDir} strength={0.2} occlusion={false} />
    </>
  );
};

// ------------------------------------------------------------------------------------------------ camcorder OSD overlay
const OSD = 'Verdana, Tahoma, sans-serif';
const tc = (frames: number) => {
  const f = Math.max(0, Math.floor(frames));
  const p2 = (n: number) => String(n).padStart(2, '0');
  const s = Math.floor(f / 30);
  return `${Math.floor(s / 3600)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}:${p2(f % 30)}`;
};

const drawOsdText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, align: CanvasTextAlign = 'left') => {
  ctx.font = `bold ${size}px ${OSD}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur = size * 0.25;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(text, x + size * 0.05, y + size * 0.06);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
};

export type OsdMode = 'play' | 'pause';
export const drawCamcorderOSD = (ctx: CanvasRenderingContext2D, W: number, H: number, lf: number, mode: OsdMode) => {
  const s = W / 1024;
  const left = W * (0.5 - FILL_W / 2) + 64 * s, right = W * (0.5 + FILL_W / 2) - 64 * s;
  const top = H * (0.5 - BAND / 2) + 62 * s;
  // bottom row kept above the 230 px caption zone of the final 1080p frame while the picture fills it (~0.23 of the band)
  const bottom = H * (0.5 + BAND / 2) - H * BAND * 0.245;
  const size = 34 * s;
  if (mode === 'play') {
    drawOsdText(ctx, 'PLAY', left, top, size);
    ctx.fillStyle = '#fff';
    const x0 = left + 106 * s;
    ctx.beginPath();
    ctx.moveTo(x0, top - 26 * s);
    ctx.lineTo(x0 + 23 * s, top - 13 * s);
    ctx.lineTo(x0, top);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 5 * s;
    ctx.stroke();
    ctx.fill();
  } else {
    drawOsdText(ctx, 'PAUSE', left, top, size);
    const x0 = left + 128 * s;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 5 * s;
    ctx.fillStyle = '#fff';
    for (const dx of [0, 15 * s]) {
      ctx.strokeRect(x0 + dx, top - 26 * s, 8 * s, 26 * s);
      ctx.fillRect(x0 + dx, top - 26 * s, 8 * s, 26 * s);
    }
  }
  drawOsdText(ctx, tc(lf + 30 * (14 * 60 + 22) + 11), right, top, size * 0.9, 'right');
  drawOsdText(ctx, 'AM 6:41', left, bottom - size * 1.25, size);
  drawOsdText(ctx, 'NOV 09 2002', left, bottom, size);
  drawOsdText(ctx, 'SP', right, bottom, size * 0.75, 'right');
};

export {useOverlayScene} from '../Intro/rtt';

export const clampF = clamp01;
