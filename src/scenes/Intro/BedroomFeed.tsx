/**
 * The picture the CRT shows in the Intro's last bar: a camcorder REC feed of the moonlit bedroom at 3:15 AM.
 * It starts as a (digital!) telephoto on the red LED clock "3:15" — readable while the TV is small in frame — and
 * rocker-zooms out while the main camera dives into the glass, landing EXACTLY on V1Bedroom's opening camcorder wide
 * (same camera formula, same staging, same REC OSD), so the cut at frame 371 is a match cut "into" the TV.
 *
 * Staging mirrors src/scenes/V1Bedroom/shots.tsx ('wide' shot at its local frame g = f - 371, i.e. negative here) and
 * imports its sleeping pose / pillow / Zzz so the two can't drift apart.
 */
import React from 'react';
import {Easing} from 'remotion';
import {Bedroom, BEDROOM_SPOTS, PILLOW_LOCAL} from '../../lib/sets/Bedroom';
import {Guy, guyPoint} from '../../lib/characters/Guy';
import {Pancake, pancakeLie} from '../../lib/characters/Pancake';
import {C} from '../../lib/palette';
import {lerp, noise1, ramp} from '../../lib/time';
import {bedPose} from '../V1Bedroom/shots';
import {TalkPillow, Zzz} from '../V1Bedroom/props';
import {RTCam, V3} from './rtt';

/** Intro frame of the cut into V1Bedroom */
export const CUT = 371;
/** visible fraction of the CRT picture WIDTH when the dive ends (the 16:9 frame shows the central BW x BAND part) */
export const BW = 0.78;
export const BAND = (BW * 9) / 16 / 0.75; // = BW * 0.75 (picture is 4:3)
/** small average barrel-curve magnification of the CRT shader over the HUD's area */
const BARREL = 1.025;

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

// ------------------------------------------------------------------------------------------------ V1Bedroom 'wide' (copied formulas)
const S = BEDROOM_SPOTS;
const G_BED: V3 = S.guyLieInBed;
const PANCAKE_BED: V3 = [-1.06, 0.7, -0.4];
const V1P: V3 = [0.85, 1.72, 1.9];
const V1T: V3 = [-0.35, 0.78, -1.05];
const V1FOV = 58;
const hand = (f: number, amp: number, seed: number): V3 => [amp * noise1(f * 0.05, seed), amp * 0.7 * noise1(f * 0.06, seed + 1), amp * 0.5 * noise1(f * 0.045, seed + 2)];

/** 4:3 vertical fov whose central BAND shows what a 16:9 camera of fov f169 shows */
const fov43FromTan = (tan169: number) => deg(2 * Math.atan(tan169 / BAND));

/** Crane window (Intro frames): LED-clock close-up until Z0, then a crane up & back over the sleepers to the V1 wide by Z1. */
export const Z0 = 338;
export const Z1 = 362;
const CLOCK: V3 = add(S.clockFace, [0.0, 0.004, 0]);
/** clock close-up camera: front-right of the nightstand, slightly above (clear of the lamp and of Pancake's ears) */
const P0: V3 = [-1.45, 0.84, -1.0];
/** bezier control point of the crane: high over the bed so the path clears Pancake and the Guy */
const Q: V3 = [0.1, 2.05, -0.1];
const bez = (a: V3, q: V3, b: V3, u: number): V3 => {
  const v = 1 - u;
  return [v * v * a[0] + 2 * u * v * q[0] + u * u * b[0], v * v * a[1] + 2 * u * v * q[1] + u * u * b[1], v * v * a[2] + 2 * u * v * q[2] + u * u * b[2]];
};
// clock close-up: the 0.26 m clock fills ~60% of the FULL 4:3 picture width at ~0.66 m
const TAN_TELE = Math.tan(rad(29 / 2)) * BAND;
const TAN_WIDE = Math.tan(rad(V1FOV / 2));

export const feedCamera = (f: number): RTCam => {
  const g = f - CUT;
  const u = ramp(f, Z0, Z1, Easing.inOut(Easing.cubic));
  // slow handheld creep toward the digits before the crane
  const creep = ramp(f, 300, Z0, (x) => x);
  const p0 = add(P0, scl([0.176, 0.222, 0.603], -0.12 * creep));
  const tan = Math.exp(lerp(Math.log(TAN_TELE), Math.log(TAN_WIDE), u));
  const position = add(bez(p0, Q, V1P, u), scl(hand(g, 0.025, 3), lerp(0.25, 1, u)));
  const wideT = add(V1T, hand(g + 40, 0.03, 4));
  const teleT = add(CLOCK, scl(hand(g + 40, 0.03, 4), 0.12));
  const w = ramp(u, 0.05, 0.85, Easing.inOut(Easing.quad));
  return {position, target: mix3(teleT, wideT, w), fov: fov43FromTan(tan), roll: lerp(0.06, 0, u) + 0.02 * noise1(g * 0.03, 5)};
};

// ------------------------------------------------------------------------------------------------ the bedroom
export const BedroomFeedScene: React.FC<{f: number}> = ({f}) => {
  const g = f - CUT; // V1Bedroom-local frame (negative = just before its first frame)
  const t = g / 30;
  const pose = bedPose(g);
  const eyes = add(G_BED, guyPoint(pose, 'eyes') as V3);
  return (
    <Bedroom time="night" frame={g} moon={1.05} lamp={0}
      bed={{tilt: 0, glow: 0.06, blanket: 1, headSlot: <TalkPillow position={PILLOW_LOCAL} talk={0} glow={0.35} frame={g} />}}
      clock={{text: '3:15', blink: true, brightness: 1.15, light: 1}} hide={['pillow']}>
      <pointLight position={[0.4, 1.9, 0.9]} color="#ffe2c4" intensity={1.2} distance={3.6} decay={1.6} />
      <Guy position={G_BED} pose={pose} shadow={false} outlineScale={1.5} />
      <Zzz frame={g} position={add(eyes, [0.12, 0.12, 0.05])} size={0.15} />
      <group position={PANCAKE_BED} rotation={[0, 0.55, 0]}>
        <Pancake pose={{...pancakeLie(t, true), headPitch: 0, headYaw: 0, earPerk: -0.5, hop: 0, eyes: 'closed'}} outlineScale={1.3} shadow={false} />
      </group>
      <Zzz frame={g + 20} fade={0.85} position={add(PANCAKE_BED, [0.1, 0.3, 0.3])} size={0.08} />
    </Bedroom>
  );
};
export const FEED_BG = C.night;

// ------------------------------------------------------------------------------------------------ REC OSD (replica of overlays/CamcorderHUD)
const OSD = 'Verdana, Tahoma, sans-serif';
const tc = (frames: number) => {
  const f = Math.max(0, Math.floor(frames));
  const p2 = (n: number) => String(n).padStart(2, '0');
  const s = Math.floor(f / 30);
  return `${Math.floor(s / 3600)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}:${p2(f % 30)}`;
};
const shadowed = (ctx: CanvasRenderingContext2D, draw: () => void) => {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  draw();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.45)';
  ctx.shadowBlur = 12;
  draw();
  ctx.restore();
};
const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, align: CanvasTextAlign = 'left') => {
  ctx.font = `bold ${size}px ${OSD}`;
  (ctx as unknown as {letterSpacing: string}).letterSpacing = `${(size * 0.06).toFixed(1)}px`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  shadowed(ctx, () => ctx.fillText(s, x, y));
};

/** Draws the REC OSD into a canvas the size of the CRT picture, laid out in 1920x1080 frame px so that it lands on the
 *  overlays/CamcorderHUD positions (as used by V1Bedroom) when the dive ends. `hudFrame` = V1's HUD frame number. */
export const drawRecOSD = (ctx: CanvasRenderingContext2D, W: number, H: number, hudFrame: number) => {
  const s = (BW * W) / 1920 * BARREL;
  ctx.save();
  ctx.setTransform(s, 0, 0, s, W / 2 - 960 * s, H / 2 - 540 * s);
  const MX = 116, MY = 74, L = 78, T = 5;
  // corner brackets
  for (const [x, y, sx, sy] of [[MX, MY, 1, 1], [1920 - MX, MY, -1, 1], [MX, 1080 - MY, 1, -1], [1920 - MX, 1080 - MY, -1, -1]] as const) {
    shadowed(ctx, () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx > 0 ? x : x - L, sy > 0 ? y : y - T, L, T);
      ctx.fillRect(sx > 0 ? x : x - T, sy > 0 ? y : y - L, T, L);
    });
  }
  const inX = MX + 38, topY = MY + 30;
  // ● REC (blinks 1 Hz)
  if (Math.floor(hudFrame / 15) % 2 === 0) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,40,20,0.9)';
    ctx.shadowBlur = 14;
    const gr = ctx.createRadialGradient(inX + 15, topY + 19, 2, inX + 15, topY + 23, 16);
    gr.addColorStop(0, '#ffb3a6');
    gr.addColorStop(0.45, '#FF2216');
    gr.addColorStop(1, '#a00a04');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(inX + 15, topY + 23, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  text(ctx, 'REC', inX + 46, topY + 40, 46);
  text(ctx, 'SP', inX + 2, topY + 62 + 26, 30);
  // timecode + battery
  const bx = 1920 - inX - 74, by = topY + 6;
  text(ctx, tc(hudFrame), bx - 22, topY + 38, 40, 'right');
  shadowed(ctx, () => {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.fillRect(bx + 2, by + 10, 6, 16);
    ctx.beginPath();
    ctx.roundRect(bx + 9, by + 3, 62, 30, 4);
    ctx.stroke();
    for (let i = 0; i < 3; i++) ctx.fillRect(bx + 50 - i * 17, by + 9, 14, 18);
  });
  // time + date stamp (caption-safe position, bottom at y = 830)
  text(ctx, 'AM 3:15', inX, 830 - 54.6 - 14, 42);
  text(ctx, 'NOV 09 2002', inX, 830 - 14, 42);
  ctx.restore();
};
