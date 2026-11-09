// V1Bedroom 3D shots: one subtree per shot inside the single <Stage>. Everything is a pure function of the local frame f.
import React from 'react';
import {CameraRig, SparkleField, LensFlare, ChromeText, SpeedLines} from '../../lib/three';
import {Bedroom, BEDROOM_SPOTS as S, DeskChair} from '../../lib/sets/Bedroom';
import {Printer} from '../../lib/sets/Bedroom';
import {Guy, GuyPose, guySleepyWake, guySitOn, mergePose, guyPoint, guyBlink} from '../../lib/characters/Guy';
import {Pancake, pancakeLie} from '../../lib/characters/Pancake';
import {Popup3D, popupButton3D, Cursor3D, clickAt} from '../../lib/ui';
import type {DialogSpec} from '../../lib/ui';
import {ramp, popIn, lerp, noise1, clamp01, beatAt} from '../../lib/time';
import {C} from '../../lib/palette';
import {W, ShotId, SHOTS, FROM} from './timing';
import {CreditCard, CardSlot, CARD_SLOT, BlankPage, PowerLedOff, InkMacroSet, CART, cartX, VoiceRings, Zzz, TalkPillow} from './props';
import {PILLOW_LOCAL} from '../../lib/sets/Bedroom';

/** Pancake asleep at the foot of the bed (right side, facing the room). `wake` 0..1 lifts his head / perks ears. */
const PANCAKE_BED: V3 = [-1.06, 0.7, -0.4];
const SleepyPancake: React.FC<{f: number; wake: number; hop?: number}> = ({f, wake, hop = 0}) => {
  const t = f / 30;
  const base = pancakeLie(t, wake < 0.5);
  return (
    <group position={PANCAKE_BED} rotation={[0, 0.55, 0]}>
      <Pancake pose={{...base, headPitch: 0.3 * wake, headYaw: -0.4 * wake, earPerk: lerp(-0.5, 0.7, wake), hop, eyes: wake > 0.5 ? 'puppy' : 'closed'}}
        outlineScale={1.3} shadow={false} />
    </group>
  );
};

type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => scl(a, 1 / (len(a) || 1));
const mix3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rotY = (p: V3, a: number): V3 => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** handheld camcorder wobble */
const hand = (f: number, amp: number, seed: number): V3 => [amp * noise1(f * 0.05, seed), amp * 0.7 * noise1(f * 0.06, seed + 1), amp * 0.5 * noise1(f * 0.045, seed + 2)];
/** decaying shake kick after frame k */
const kick = (f: number, k: number, amp: number, seed: number, decay = 0.18): V3 => {
  if (f < k) return [0, 0, 0];
  const e = amp * Math.exp(-(f - k) * decay);
  return [e * noise1(f * 0.9, seed), e * noise1(f * 0.9, seed + 7), e * 0.5 * noise1(f * 0.9, seed + 13)];
};
const songT = (f: number) => (f + FROM) / 30;

// ===================================================================================================== the Guy
const G_BED: V3 = S.guyLieInBed; // bed-mode origin, no rotation
/** desk: chair + Guy facing the printer (+X) */
const DESK_YAW = Math.PI / 2;
const G_DESK: V3 = [1.12, 0, 0.06];
const PRN: V3 = S.printer; // [1.98, 0.74, 0.06], faces -X
const PRN_YAW = S.printerRotY;
/** printer-local -> room */
const prnToRoom = (p: V3): V3 => add(PRN, rotY(p, PRN_YAW));

/** bed motor: damped spring that snaps him upright on "sat" (value can overshoot 1 = whiplash) */
const bedUp = (f: number) => {
  const t = (f - (W.sat - 1)) / 30;
  if (t <= 0) return 0;
  const k = 11, w = 21;
  return 1 - Math.exp(-k * t) * (Math.cos(w * t) + (k / w) * Math.sin(w * t));
};
export const bedTilt = (f: number) => clamp01(bedUp(f));

/** In-bed performance for frames 0..264 (wide, face, clock, pillow, fee). */
export const bedPose = (f: number): GuyPose => {
  const t = f / 30;
  const up = bedUp(f);
  const over = Math.max(0, up - 1); // whiplash
  // wake-helper progress only for the arms: lap pose when up, then the eye-rub (p 0.56..0.79)
  const pArms = f < W.sat ? 0 : f < W.sat + 9 ? lerp(0.15, 0.5, (f - W.sat) / 9) : f < 64 ? 0.5 : f < 86 ? lerp(0.55, 0.79, (f - 64) / 22) : 0.5;
  const base = guySleepyWake(pArms);
  // eyes / expression timeline
  const asleep = f < W.sat + 4;
  const shockIn = ramp(f, W.sat + 3, W.sat + 6, (x) => x);
  const toSleepy = ramp(f, 62, 76);
  const clockLook = ramp(f, 80, 92);
  const threeWide = ramp(f, W.three - 2, W.three + 3) * (1 - ramp(f, W.three + 14, W.three + 26));
  const backFromClock = ramp(f, 150, 158);
  const voiceJolt = ramp(f, W.voice - 1, W.voice + 3, (x) => x);
  const turnToPillow = ramp(f, W.voice + 2, W.voice + 14);
  const toPopup = ramp(f, 200, 214);
  const feeSad = ramp(f, W.fee - 2, W.fee + 8);

  let expression: GuyPose['expression'] = 'sleepy';
  let expression2: GuyPose['expression'] = 'shock';
  let expressionMix = 0;
  let blink = 1;
  let mouthOpen = 0.05 + 0.05 * Math.max(0, Math.sin(t * 5.2)); // snore
  if (!asleep) {
    // shock on the snap, then groggy
    expression = 'shock';
    expression2 = 'sleepy';
    expressionMix = toSleepy;
    blink = lerp(1 - shockIn, 0.42, toSleepy);
    mouthOpen = lerp(0.35 * shockIn, 0.08, toSleepy);
    if (f >= 80) {
      expression = 'sleepy';
      expression2 = 'shock';
      expressionMix = 0.55 * threeWide;
      blink = lerp(0.45, 0.0, threeWide) * (1 - voiceJolt) + guyBlink(t, 3) * 0.6;
      mouthOpen = 0.06 + 0.25 * threeWide;
    }
    if (f >= W.voice - 1) {
      expression = 'shock';
      expression2 = 'angry';
      expressionMix = 0.0;
      blink = guyBlink(t, 5) * 0.8;
      mouthOpen = 0.3 * voiceJolt * (1 - toPopup) + 0.08;
    }
    if (f >= W.sleep - 4) {
      expression = 'shock';
      expression2 = 'sad';
      expressionMix = feeSad;
      mouthOpen = 0.12 + 0.18 * (1 - feeSad);
    }
  }
  const lolling = 1 - clamp01(up);
  const headYaw =
    base.headYaw! * (1 - clockLook) +
    lerp(0, -1.05, clockLook) * (1 - backFromClock) +
    lerp(0, 1.25, turnToPillow) * (1 - toPopup) +
    lerp(0, 0.45, toPopup);
  const headPitch =
    lerp(-0.05 + 0.25 * lolling * 0, base.headPitch!, 1) * (1 - clockLook) +
    lerp(0, 0.3, clockLook) * (1 - backFromClock) -
    0.12 * turnToPillow * (1 - toPopup) -
    0.18 * toPopup -
    over * 0.8;
  return mergePose(base, {
    t,
    lie: 1 - Math.min(1, up),
    torsoBend: (base.torsoBend ?? 0) + over * 1.4 + 0.22 * voiceJolt * (1 - toPopup),
    torsoSide: -0.18 * voiceJolt * (1 - toPopup),
    torsoTwist: 0.45 * turnToPillow * (1 - toPopup) + 0.15 * toPopup,
    headYaw,
    headPitch,
    headTilt: 0.18 * lolling + (base.headTilt ?? 0) * (1 - clockLook) - 0.1 * clockLook * (1 - backFromClock),
    expression,
    expression2,
    expressionMix,
    blink: clamp01(blink),
    mouthOpen,
    eyesX: f >= 80 && f < 150 ? -0.6 * clockLook : f >= W.voice ? 0.5 * turnToPillow * (1 - toPopup) + 0.3 * toPopup : 0,
    eyesY: f >= W.sleep ? 0.25 : 0,
    shrug: 0.5 * voiceJolt * (1 - ramp(f, W.voice + 6, W.voice + 20)) + 0.35 * shockIn * (1 - toSleepy),
  });
};

/** At the desk, sitting, frames 314..529. */
export const deskPose = (f: number): GuyPose => {
  const t = f / 30;
  const wont = ramp(f, W.wont - 1, W.wont + 4, (x) => x);
  const hp = ramp(f, W.hp - 2, W.hp + 6);
  const off = ramp(f, W.off - 1, W.off + 3, (x) => x);
  const cardIn = ramp(f, 464, 476);
  const dec = ramp(f, W.declined, W.declined + 3, (x) => x);
  const recoil = dec * Math.exp(-Math.max(0, f - W.declined) / 9);
  let expression: GuyPose['expression'] = 'determined';
  let expression2: GuyPose['expression'] = 'shock';
  let mix = wont;
  if (f >= W.hp - 2) {
    expression = 'shock';
    expression2 = 'angry';
    mix = hp;
  }
  if (f >= W.off - 1) {
    expression = 'angry';
    expression2 = 'yell';
    mix = off * (1 - ramp(f, W.off + 10, W.off + 22));
  }
  if (f >= 464) {
    expression = 'determined';
    expression2 = 'shock';
    mix = dec;
  }
  if (f >= W.declined + 10) {
    expression = 'shock';
    expression2 = 'sad';
    mix = ramp(f, W.declined + 10, W.declined + 18);
  }
  const reach = f < 464 ? 1 : 1 - 0.3 * cardIn;
  const typing = f < W.wont ? Math.sin(f * 1.3) * 0.05 : 0;
  const armBase = (side: number) => ({
    shoulderX: 0.95 * reach + (side > 0 ? typing : -typing),
    shoulderZ: 0.12,
    shoulderY: 0.25,
    elbow: 0.85,
    twist: 0.5,
    wristZ: 0.2,
    grip: 0.2,
  });
  // right arm raises the card toward the slot during 464..496
  const armR = f >= 464 && f < W.declined ? {shoulderX: 1.25, shoulderZ: 0.05, shoulderY: 0.35, elbow: 0.55, twist: 0.2, wristZ: -0.1, grip: 0.8} : armBase(1);
  return mergePose(guySitOn(0.48), {
    t,
    lean: 0.12 + 0.12 * hp * (1 - off) - 0.25 * recoil,
    torsoBend: 0.1 + 0.08 * wont - 0.25 * recoil,
    headPitch: 0.22 - 0.1 * hp - 0.35 * recoil,
    headYaw: f >= 496 ? 0.3 : 0.05 * noise1(t * 0.4, 21),
    headTilt: 0.12 * off * (1 - ramp(f, W.off + 10, W.off + 25)) + 0.12 * ramp(f, W.declined + 10, W.declined + 20),
    armL: armBase(-1),
    armR,
    expression,
    expression2,
    expressionMix: mix,
    blink: f >= W.declined && f < W.declined + 4 ? 1 : guyBlink(t, 8),
    mouthOpen: 0.05 + 0.4 * off * (1 - ramp(f, W.off + 10, W.off + 22)) + 0.35 * recoil,
    shrug: 0.4 * wont * (1 - ramp(f, W.wont + 8, W.wont + 20)) + 0.5 * recoil,
    eyesY: -0.2,
  });
};

const eyesOf = (pose: GuyPose, origin: V3, yaw: number): V3 => add(origin, rotY(guyPoint(pose, 'eyes'), yaw));

// ===================================================================================================== lighting helpers
/** warm character key near the camera + a coloured accent: always both mounted (constant light count) */
const Lights: React.FC<{key_: V3; keyI?: number; accent: V3; accentColor: string; accentI: number}> = ({key_, keyI = 2.2, accent, accentColor, accentI}) => (
  <>
    <pointLight position={key_} color="#ffe2c4" intensity={keyI} distance={3.6} decay={1.6} />
    <pointLight position={accent} color={accentColor} intensity={accentI} distance={2.2} decay={1.8} />
  </>
);

// ===================================================================================================== bedroom shots
const SLEEP_SPEC: DialogSpec = {
  kind: 'coin',
  title: 'SOMNIA+ Sleep Service',
  heading: 'SLEEP HAS A FEE',
  message: '$4.99 / night.\nYour free trial of SLEEP has ended.',
  buttons: ['Buy Now', 'Maybe Later'],
  aquaButton: 0,
  disabledButtons: [1],
  width: 440,
};
const POP_W = 0.62;

const pillowTalk = (f: number) => {
  // glows from "voice", speaks through "fee"
  const on = ramp(f, W.voice - 3, W.voice + 2, (x) => x);
  const offK = 1 - ramp(f, W.fee + 12, W.fee + 22);
  const sleepBoost = ramp(f, W.sleep - 2, W.sleep + 2, (x) => x);
  return on * offK * (0.65 + 0.35 * sleepBoost);
};

const BedroomShot: React.FC<{f: number; shot: ShotId}> = ({f, shot}) => {
  const t = f / 30;
  const pose = bedPose(f);
  const tilt = bedTilt(f);
  const eyes = eyesOf(pose, G_BED, 0);
  const beat = beatAt(songT(f));
  const talk = pillowTalk(f);
  const pillowPos: V3 = [S.bed[0], 1.085, -1.256];
  // --- bed LEDs boot on "bed"
  const bedGlow = f < W.bed - 2 ? 0.06 : f < W.bed + 7 ? (Math.floor(f) % 3 === 0 ? 0.15 : 2.2) : 1 + 0.8 * Math.exp(-(f - W.bed - 7) / 8);
  let cam: {position: V3; target: V3; fov: number; roll?: number};
  let keyPos: V3 = [0.6, 1.7, 1.5];
  let keyI = 2.0;
  let accent: V3 = add(pillowPos, [0.2, 0.25, 0.45]);
  let accentColor: string = C.aqua;
  let accentI = 0;

  if (shot === 'wide') {
    // camcorder wide, slow creep in; startled jolt when the bed fires
    const p = ramp(f, 0, 51, (x) => x);
    const pos = add(mix3([0.85, 1.72, 1.9], [0.62, 1.58, 1.55], p), add(hand(f, 0.025, 3), kick(f, W.sat + 2, 0.07, 9)));
    const tgt = add(mix3([-0.35, 0.78, -1.05], [-0.45, 0.85, -1.05], p), add(hand(f + 40, 0.03, 4), kick(f, W.sat + 2, 0.12, 19)));
    cam = {position: pos, target: tgt, fov: 58, roll: 0.02 * noise1(f * 0.03, 5)};
    keyPos = [0.4, 1.9, 0.9];
    keyI = 1.2;
  } else if (shot === 'face') {
    const lf = f - SHOTS[1].from;
    const punch = Math.exp(-Math.max(0, f - W.up) / 5) * (f >= W.up ? 1 : 0);
    const base = add(eyes, [0.34, 0.04, 1.1]);
    const pos = add(mix3(base, add(eyes, [0.27, 0.03, 0.86]), ramp(lf, 0, 34)), kick(f, W.up, 0.02, 31));
    cam = {position: pos, target: add(eyes, [0, -0.07, 0]), fov: 40 - 7 * punch, roll: -0.04};
    keyPos = add(eyes, [1.0, 0.7, 1.4]);
    keyI = 1.3;
  } else if (shot === 'clock') {
    const cf: V3 = S.clockFace;
    const n: V3 = [Math.sin(S.clockRotY), 0, Math.cos(S.clockRotY)];
    if (f < 101) {
      // the nightstand: lamp + glowing LED clock, push in (the room is dark, the digits do the lighting)
      const z = ramp(f, 85, 101, (x) => x * x);
      const pos: V3 = add(mix3([-1.52, 0.98, -0.82], [-1.56, 0.86, -1.04], z), hand(f, 0.006, 23));
      cam = {position: pos, target: add(cf, [0.0, 0.03, 0]), fov: lerp(40, 30, z), roll: 0.04};
    } else {
      // fisheye ECU on the LED digits, creeping in; punch on "three"
      const punch = f >= W.three - 1 ? Math.exp(-(f - (W.three - 1)) / 6) : 0;
      const dist = lerp(0.36, 0.24, ramp(f, 101, 150, (x) => x)) - 0.04 * punch;
      const pos = add(add(cf, scl(n, dist)), [0.0, 0.035, 0]);
      cam = {position: pos, target: add(cf, [0, -0.005, 0]), fov: 82 - 10 * punch, roll: -0.1 + 0.03 * noise1(f * 0.05, 6)};
    }
    keyPos = f < 101 ? add(eyes, [1.0, 0.7, 1.2]) : add(cf, [1.2, 1.0, 1.4]);
    keyI = f < 101 ? 1.2 : 0.25;
    accent = add(cf, scl(n, 0.6));
    accentColor = '#ff2a1a';
    accentI = 0;
  } else if (shot === 'pillow') {
    if (f < 183) {
      // 3/4 front from the bed's right: he sits groggy; the pillow lights up behind him on "voice", he jolts & turns
      const pos = add([0.42, 1.18, -0.28], add(hand(f, 0.012, 41), kick(f, W.voice, 0.03, 43)));
      cam = {position: pos, target: [-0.55, 1.13, -1.12], fov: 44};
    } else {
      // fisheye ECU on the talking pillow from beside his head, push in
      const p = ramp(f, 183, 216, (x) => 1 - Math.pow(1 - x, 2));
      const pos = add(mix3([-0.16, 1.4, -0.9], [-0.3, 1.33, -1.0], p), hand(f, 0.01, 47));
      cam = {position: pos, target: add(pillowPos, [0.06, 0.03, 0.02]), fov: lerp(74, 62, p), roll: 0.12};
    }
    keyPos = [0.9, 1.9, 0.2];
    keyI = 1.1;
    accent = add(pillowPos, [0.15, 0.55, 0.75]);
    accentI = 0.7 * talk;
  } else {
    // 'fee': front medium, the pop-up hovering at his left (screen right)
    const lf = f - SHOTS[4].from;
    const pos = add(mix3([-0.28, 1.4, 0.32], [-0.3, 1.38, 0.12], ramp(lf, 0, 49, (x) => x)), kick(f, W.fee, 0.015, 51));
    cam = {position: pos, target: [-0.3, 1.3, -0.95], fov: 46 - 4 * beat.downPulse};
    keyPos = [0.15, 1.7, 0.55];
    keyI = 2.0;
    accent = [-0.1, 1.6, -0.4];
    accentI = 0.5 * talk;
  }

  // --- the SLEEP pop-up (rises out of the pillow on "Sleep", hovers at his left)
  const popK = popIn(f, W.sleep - 3, 12);
  const rise = ramp(f, W.sleep - 3, W.sleep + 10);
  const popPos = mix3([-0.25, 1.1, -1.15], [-0.13, 1.41, -0.7], rise);
  const btn1 = popupButton3D(SLEEP_SPEC, 1, POP_W);
  const btn0 = popupButton3D(SLEEP_SPEC, 0, POP_W);
  const curA = ramp(f, W.has, W.has + 10);
  const curB = ramp(f, W.fee + 2, W.fee + 8);
  const curPos: V3 = add(mix3(add(btn1, [0.18, -0.16, 0.06]), add(btn1, [0.01, -0.01, 0.06]), curA), scl(sub(btn0, btn1), 0 * curB));
  const showPop = (shot === 'fee' || shot === 'pillow') && f >= W.sleep - 3;
  const feePop = popIn(f, W.fee - 3, 10);

  return (
    <>
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} roll={cam.roll ?? 0} />
      <Bedroom time="night" frame={f} moon={1.05} lamp={0}
        bed={{tilt, glow: bedGlow, blanket: tilt < 0.5 ? 1 - tilt * 2 : 0,
          headSlot: <TalkPillow position={PILLOW_LOCAL} talk={talk} glow={0.35 + 0.65 * ramp(f, W.voice - 3, W.voice + 2)} frame={f} />}}
        clock={{text: '3:15', blink: true, brightness: shot === 'clock' && f >= W.three - 1 ? 1 + 0.7 * Math.exp(-(f - W.three) / 8) : 1,
          light: shot === 'clock' && f >= 101 ? 0.35 : 1}}
        hide={shot === 'clock' && f >= 101 ? ['posters', 'pillow'] : ['pillow']}>
        <Lights key_={keyPos} keyI={keyI} accent={accent} accentColor={accentColor} accentI={accentI} />
        <Guy position={G_BED} pose={pose} shadow={false} outlineScale={shot === 'wide' ? 1.5 : 1} />
        <Zzz frame={f} fade={1 - ramp(f, W.sat - 2, W.sat + 2)} position={add(eyes, [0.12, 0.12, 0.05])} size={0.15} />
        <SleepyPancake f={f} wake={f >= W.sat && f < W.sat + 24 ? ramp(f, W.sat + 1, W.sat + 5) * (1 - ramp(f, W.sat + 14, W.sat + 24)) : 0}
          hop={f >= W.sat ? 0.07 * Math.max(0, Math.sin((f - W.sat) * 0.5)) * Math.exp(-(f - W.sat) / 8) : 0} />
        <Zzz frame={f + 20} fade={0.85 * (1 - ramp(f, W.sat, W.sat + 3)) + 0.85 * ramp(f, W.sat + 26, W.sat + 34)} position={add(PANCAKE_BED, [0.1, 0.3, 0.3])} size={0.08} />
        {/* the pillow's voice */}
        <VoiceRings frame={f} amount={talk * (shot === 'pillow' || shot === 'fee' ? 1 : 0)} position={add(pillowPos, [0, 0.07, 0.05])} rotation={[-0.45, 0, 0]} maxR={0.45} />
        {showPop ? (
          <group position={popPos} rotation={[0.05, -0.36, 0.03]} scale={popK * 0.74}>
            <Popup3D spec={{...SLEEP_SPEC, hover: curA > 0.9 ? 1 : undefined}} width={POP_W} pr={3} brightness={0.82} saturation={1.35} sheen={lerp(-0.2, 1.2, ramp(f, W.sleep + 4, W.sleep + 22, (x) => x))}>
              <Cursor3D kind="hand" size={0.11} position={curPos} click={clickAt(f, W.has + 12, 10) + clickAt(f, W.fee - 6, 10)} />
            </Popup3D>
            {/* $4.99 price tag slams on "fee" */}
            {f >= W.fee - 3 ? (
              <group position={[-0.26, 0.21, 0.1]} rotation={[0, 0.2, 0.16]} scale={feePop}>
                <ChromeText text="$4.99" font="ArialBlack" size={0.085} material="gold" anchor="center" brightness={0.95} shine={ramp(f, W.fee, W.fee + 14)} />
                <SparkleField count={8} seed={11} area={[0.32, 0.14, 0.05]} size={0.07} time={t} />
              </group>
            ) : null}
          </group>
        ) : null}
        {shot === 'clock' && f >= 101 ? (
          <>
            <LensFlare position={add(S.clockFace, rotY([0.105, 0.04, 0.01], S.clockRotY))} intensity={0.55 * (f >= W.three - 1 ? Math.exp(-(f - W.three) / 7) : 0)}
              color="#ff8a7a" streakColor="#ff3a2a" scale={0.55} ghosts={false} rotation={t * 0.3} />
          </>
        ) : null}
        {shot === 'wide' && f >= W.sat - 1 && f < W.sat + 10 ? <SpeedLines intensity={0.55 * (1 - ramp(f, W.sat + 2, W.sat + 10))} time={t} color="#bff3ff" inner={0.42} /> : null}
      </Bedroom>
    </>
  );
};

// ===================================================================================================== ink macro
const InkShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const lf = f - SHOTS[5].from;
  const lid = ramp(f, 266, 290);
  const glow = ramp(f, W.ink - 3, W.ink + 2, (x) => x);
  const pulse = f >= W.ink - 1 ? Math.exp(-(f - W.ink + 1) / 8) : 0;
  const lockShake = f >= W.printer - 2 ? Math.exp(-(f - W.printer + 2) / 10) : 0;
  let cam: {position: V3; target: V3; fov: number; roll?: number};
  if (f < W.ink - 1) {
    // dolly along the cartridges, low, under the opening lid
    const p = ramp(lf, 0, W.ink - 1 - SHOTS[5].from, (x) => x);
    cam = {position: [lerp(-0.85, 0.35, p), lerp(0.7, 0.55, p), 0.95], target: [lerp(-0.45, 0.55, p), 0.3, 0], fov: 50, roll: 0.08};
  } else {
    // snap push-in on "ink": fisheye on the cyan + magenta cartridges and the padlock
    const p = ramp(f, W.ink - 1, 314, (x) => 1 - Math.pow(1 - x, 3));
    cam = {position: mix3([cartX(0) + 0.05, 0.52, 0.66], [cartX(0) + 0.12, 0.48, 0.5], p), target: [cartX(1) - 0.02, 0.28, 0], fov: 80 - 8 * pulse, roll: -0.08};
  }
  return (
    <>
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} roll={cam.roll ?? 0} />
      <hemisphereLight args={['#7f9cff', '#160c30', 0.7]} />
      <directionalLight position={[1.5, 3, 2]} intensity={1.6 * (0.3 + 0.7 * lid)} color="#cfe0ff" />
      <directionalLight position={[-2, 1, -1]} intensity={0.8} color={C.grape} />
      <pointLight position={[0.4, 1.6, 1.6]} color="#ffe2c4" intensity={1.0 * lid} distance={4} decay={1.6} />
      <pointLight position={[0, 0.9, 1.0]} color={C.aqua} intensity={0.5 * glow} distance={2.5} decay={1.8} />
      <InkMacroSet frame={f} lidOpen={lid} glow={glow} pulse={pulse} lockShake={lockShake} />
      <SparkleField count={14} seed={3} area={[1.3, 0.4, 0.3]} position={[0, CART.h + 0.05, 0.2]} size={0.09} time={t} intensity={2.5 * glow} />
    </>
  );
};

// ===================================================================================================== desk shots
const DeskShot: React.FC<{f: number; shot: ShotId}> = ({f, shot}) => {
  const t = f / 30;
  const pose = deskPose(f);
  const eyes = eyesOf(pose, G_DESK, DESK_YAW);
  const beat = beatAt(songT(f));
  // printer state
  const feed = f < W.but ? 0 : f < W.wont ? 0.5 * ramp(f, W.but, W.wont, (x) => x) : f < W.off ? 0.5 : 0.5 * (1 - ramp(f, W.off, W.off + 6));
  const jam = f >= W.wont - 1 && f < W.wont + 8 ? Math.exp(-(f - W.wont) / 3) : 0;
  const errorOn = f >= W.wont && f < W.off ? 1 : f >= W.declined ? 1 : 0;
  const powerOff = f >= W.off ? 1 : 0;
  const footer = f >= W.line - 2 ? 1 : 0;
  // card: slides into the slot by "card", spat out on "declined" (bonks him)
  const swoop = ramp(f, 464, 472, (x) => 1 - Math.pow(1 - x, 3));
  const flat = ramp(f, 475, 480);
  const inK = ramp(f, 479, W.card + 1, (x) => 1 - Math.pow(1 - x, 2));
  const outK = ramp(f, W.declined - 1, W.declined + 5, (x) => x);
  const mouth = CARD_SLOT.mouth;
  const cardLocalIn: V3 = [mouth[0], mouth[1] + 0.0018, mouth[2] - 0.028]; // mostly swallowed (long axis along -Z)
  const cardLocalOut: V3 = [mouth[0], mouth[1] + 0.0018, mouth[2] + 0.075];
  const slotLed = f >= W.card && f < W.declined ? (Math.floor(f / 4) % 2 ? '#ffb020' : '#402000') : f >= W.declined ? C.alertRed : C.lime;

  let cam: {position: V3; target: V3; fov: number; roll?: number};
  let keyPos: V3 = add(eyes, [0.6, 0.3, 0.6]);
  let accentColor: string = '#ff2a1a';
  let accentI = 0;
  const accent: V3 = prnToRoom([0.1, 0.25, 0.3]);
  if (shot === 'print') {
    if (f < 364) {
      // over his right shoulder at the printer, creeping in
      const p = ramp(f, 314, 364, (x) => x);
      cam = {position: add(mix3([0.66, 1.5, 0.72], [0.8, 1.42, 0.6], p), hand(f, 0.006, 61)), target: mix3([1.86, 0.84, 0.02], [1.84, 0.83, 0.04], p), fov: lerp(30, 26, p) - 3 * jam};
    } else {
      // top-down push on the blank page
      const p = ramp(f, 364, 397, (x) => 1 - Math.pow(1 - x, 3));
      cam = {position: mix3([1.6, 1.24, 0.17], [1.64, 1.13, 0.13], p), target: [1.73, 0.785, 0.07], fov: 40 - 5 * beat.downPulse, roll: 0.08};
    }
    keyPos = f < 364 ? [0.6, 1.9, 1.2] : [0.9, 2.0, 1.0];
    accentI = jam * 0.5;
  } else if (shot === 'shutoff') {
    // reverse: from behind/above the printer toward his face
    const p = ramp(f, 397, 464, (x) => x);
    const push = f >= 430 ? ramp(f, 430, 438) : 0;
    const pos = add(mix3([2.24, 1.22, -0.22], [2.2, 1.2, -0.17], p), add(scl(norm(sub(eyes, [2.2, 1.22, -0.2])), 0.05 * push), kick(f, W.off, 0.02, 71)));
    cam = {position: pos, target: add(eyes, [0.12, -0.1, 0.08]), fov: 60 - 3 * beat.downPulse};
    keyPos = add(eyes, [1.1, 0.05, -0.5]);
    accentI = 0;
  } else if (shot === 'card') {
    // ECU on the PAY HERE slot
    const sm = prnToRoom(mouth);
    const p = ramp(f, 464, 496, (x) => x);
    cam = {position: add(sm, mix3([-0.2, 0.09, -0.13], [-0.16, 0.07, -0.1], p)), target: add(sm, [0.012, -0.004, 0.022]), fov: 32, roll: 0.06};
    keyPos = add(sm, [-1.0, 0.8, -0.8]);
    accentColor = '#ffb020';
    accentI = f >= W.card ? 0.25 : 0;
  } else {
    // 'declined': 3/4 front on him + printer
    const shake = f >= W.declined ? kick(f, W.declined, 0.05, 81, 0.12) : [0, 0, 0] as V3;
    cam = {position: add([1.85, 1.32, -0.82], shake), target: add([1.42, 1.02, 0.12], shake), fov: 46 - 5 * (f >= W.declined ? Math.exp(-(f - W.declined) / 6) : 0)};
    keyPos = [2.0, 1.9, -1.0];
    accentI = f >= W.declined ? 0.9 * (0.5 + 0.5 * Math.cos((f - W.declined) * 0.8)) : 0;
  }
  // card world path (printer-local while in the printer, then flies at his face)
  const faceHit: V3 = add(eyes, [0.06, 0.06, 0]);
  const flyK = ramp(f, W.declined, W.declined + 4, (x) => x);
  const dropK = ramp(f, W.declined + 4, W.declined + 16, (x) => x * x);
  const outRoom = prnToRoom(cardLocalOut);
  let cardNode: React.ReactNode = null;
  if (f >= 464 && f < W.declined) {
    const hero: V3 = [mouth[0] - 0.012, mouth[1] + 0.03, mouth[2] + 0.04];
    const lp = inK > 0 ? mix3(mix3(hero, cardLocalOut, flat), cardLocalIn, inK) : mix3(mix3(add(hero, [0.14, 0.03, -0.02]), hero, swoop), cardLocalOut, flat);
    const spin = (1 - swoop) * 2.6;
    cardNode = (
      <group position={prnToRoom(lp)} rotation={[0, PRN_YAW, 0]}>
        <CreditCard rotation={[lerp(-0.4, -Math.PI / 2, flat), lerp(-0.55 + spin, 0, flat), lerp(0.06, Math.PI / 2, flat)]} glint={1 - flat} />
      </group>
    );
  } else if (f >= W.declined && f < W.declined + 20) {
    const shoot = mix3(prnToRoom(cardLocalIn), outRoom, ramp(f, W.declined - 1, W.declined + 1, (x) => x));
    const fly = mix3(shoot, faceHit, flyK);
    const fall = add(fly, [-0.15 * dropK, -0.5 * dropK, 0.1 * dropK]);
    cardNode = (
      <group position={fall} rotation={[0, PRN_YAW, 0]}>
        <CreditCard rotation={[-Math.PI / 2 + 6 * flyK + 4 * dropK, 3 * flyK, Math.PI / 2 + 2 * flyK]} glint={0.5} />
      </group>
    );
  }
  return (
    <>
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} roll={cam.roll ?? 0} />
      <Bedroom time="night" frame={f} moon={1.05} lamp={0} hide={['chair', 'printer', 'pillow']} lavaLamp={{on: 0.35}}
        bed={{tilt: 1, glow: 1, headSlot: <TalkPillow position={PILLOW_LOCAL} talk={0} glow={0.35} frame={f} />}}>
        <Lights key_={keyPos} keyI={1.2} accent={accent} accentColor={accentColor} accentI={accentI} />
        <Printer position={PRN} rotation={[0, PRN_YAW, 0]} frame={f} feed={0} error={errorOn ? (shot === 'declined' ? 1 : 0.45) : 0} locked>
          <BlankPage feed={feed} footer={footer} shake={jam} />
          <CardSlot ledOn={1} led={slotLed} />
          <PowerLedOff off={powerOff} />
        </Printer>
        <DeskChair position={add(G_DESK, [-0.1, 0, 0])} rotation={[0, DESK_YAW, 0]} />
        <Guy position={G_DESK} rotation={[0, DESK_YAW, 0]} pose={pose} />
        {cardNode}
        <SleepyPancake f={f} wake={ramp(f, W.off + 2, W.off + 8) * (1 - ramp(f, W.off + 40, W.off + 60)) + ramp(f, W.declined + 1, W.declined + 5)} />
        {shot === 'declined' && f >= W.declined ? (
          <SparkleField count={10} seed={5} area={[0.25, 0.2, 0.1]} position={faceHit} size={0.08} time={t} colors={['#ffffff', '#ffe9a0']}
            intensity={2.5 * (1 - ramp(f, W.declined + 4, W.declined + 16))} />
        ) : null}
      </Bedroom>
    </>
  );
};

export const ShotScene: React.FC<{f: number; shot: ShotId}> = ({f, shot}) => {
  if (shot === 'ink') return <InkShot f={f} />;
  if (shot === 'print' || shot === 'shutoff' || shot === 'card' || shot === 'declined') return <DeskShot f={f} shot={shot} />;
  return <BedroomShot f={f} shot={shot} />;
};
