// The Guy performing to camera in front of the gift-wrapped, price-tagged house.
import React from 'react';
import {CameraRig} from '../../../lib/three';
import {SparkleField, Sunburst, SpeedLines} from '../../../lib/three/fx';
import {Pancake, pancakeIdle} from '../../../lib/characters/Pancake';
import {Popup3D, POPUP_MESSAGES, Dialog} from '../../../lib/ui';
import type {DialogSpec} from '../../../lib/ui';
import {lerp, clamp01, popIn, noise1} from '../../../lib/time';
import {CutEffect} from '../../../overlays/CutFlash';
import {World} from '../World';
import {Performer} from '../Performer';
import {K, beatL, LBEATS} from '../timing';
import {ShotProps, decoAt, mix3, smooth, easeOut, V3} from './common';

const GUY_POS: V3 = [1.0, 0, 13.2];
const DONE = decoAt(9999, 0);

/** last beat at or before local frame lf */
const lastBeat = (lf: number) => {
  let b = -999;
  for (const x of LBEATS) if (x <= lf + 0.5) b = x;
  return b;
};
/** snap push: 0 right on a beat -> 1 a few frames later (fast ease-out) */
const snap = (lf: number, dur = 5) => easeOut((lf - lastBeat(lf)) / dur);

// ------------------------------------------------------------------ S04 "on a plan somehow"
export const PLAN_SPEC: DialogSpec = {
  kind: 'coin', title: 'HomePlan+ Billing', heading: 'Your HOUSE is on a plan!', message: 'Walls, roof & front door: $9.99/mo.\nCancel anytime*  (*never)',
  buttons: ['Buy Now', 'OK'], aquaButton: 0, aquaColor: 'gold', width: 470,
};

/** S04 (180-245): Guy in the yard, house behind him; "plan" -> billing pop-up; "somehow" -> big shrug at camera. */
export const PlanShrug: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = smooth(f / 65);
  const shrug = clamp01((lf - K.somehow + 5) / 7);
  const g = GUY_POS;
  const cam: V3 = [g[0] + lerp(1.0, 0.55, k), lerp(0.85, 1.0, k), g[2] + lerp(3.1, 2.6, k)];
  const b = beatL(lf);
  return (
    <>
      <CameraRig position={cam} target={[g[0] - 0.3, 2.7, g[2] - 6]} fov={60 - 2 * b.pulse} roll={0.05} />
      <World t={t} deco={{...DONE, t}} flare={0.7} />
      <Performer lf={lf} position={g} rotation={[0, lerp(-0.6, 0.12, clamp01((lf - K.plan + 8) / 10)), 0]}
        gesture={shrug > 0 ? 'shrug' : 'sing'} from="sing" mix={shrug > 0 ? shrug : 1}
        expression={shrug > 0.3 ? 'angry' : 'shock'}
        extra={{headYaw: lerp(-0.7, 0, clamp01((lf - K.plan + 8) / 10))}} />
    </>
  );
};
export const PlanShrugOver: React.FC<ShotProps> = ({lf}) => {
  const p = lf < K.plan - 3 ? 0 : popIn(lf, K.plan - 3, 10);
  return p > 0 ? <Dialog {...PLAN_SPEC} x={1470} y={270} scale={1.35 * p} anchor="center" rotate={-3} /> : null;
};

// ------------------------------------------------------------------ S05 "I'm done with"
const POPS: {spec: DialogSpec; at: number; pos: V3; rot: number}[] = [
  {spec: POPUP_MESSAGES[5], at: K.done1 - 2, pos: [-3.2, 3.2, -4], rot: 0.12},
  {spec: POPUP_MESSAGES[2], at: K.done1 + 6, pos: [3.4, 3.6, -5], rot: -0.1},
  {spec: POPUP_MESSAGES[15], at: K.upgrade1 - 8, pos: [-2.2, 4.6, -6], rot: -0.06},
  {spec: POPUP_MESSAGES[18], at: K.upgrade1 - 4, pos: [2.6, 2.2, -3.5], rot: 0.08},
];

/** S05 (245-291): fisheye close-up, singing "I'm done with"; snap push on the downbeat; pop-ups start invading the sky. */
export const DoneClose: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const g = GUY_POS;
  const push = easeOut(f / 6);
  const drift = smooth(f / 46);
  const d = lerp(2.2, 1.25, push) - 0.12 * drift;
  const cam: V3 = [g[0] + 0.28 * d, 1.28, g[2] + d];
  const b = beatL(lf);
  return (
    <>
      <CameraRig position={cam} target={[g[0] - 0.05, 1.5, g[2]]} fov={82 + 4 * b.pulse} roll={-0.1 + 0.03 * Math.sin(t * 2)} />
      <World t={t} deco={{...DONE, t}} flare={0.5} grass={1400} />
      <group position={g}>
        <Performer lf={lf} gesture="chop" expression="determined" />
        {POPS.map((p, i) => {
          const s = lf < p.at ? 0 : popIn(lf, p.at, 9);
          return s > 0 ? <Popup3D key={i} spec={p.spec} width={1.9} position={p.pos} rotation={[0, 0, p.rot]} scale={s} /> : null;
        })}
      </group>
    </>
  );
};

// ------------------------------------------------------------------ S08 / S17 "I'm cancelling you"
type CamKey = {at: number; cam: V3; tgt: V3; fov: number; roll: number};
/** beat-stepped camera: holds each key (with a slow creep), snaps to the next one over `dur` frames */
const stepCam = (keys: CamKey[], lf: number, dur = 4) => {
  let i = 0;
  while (i + 1 < keys.length && lf >= keys[i + 1].at) i++;
  const k = keys[i];
  const prev = keys[Math.max(0, i - 1)];
  const s = i === 0 ? 1 : easeOut((lf - k.at) / dur);
  const creep = Math.min(1, (lf - k.at) / 40) * 0.06;
  const cam = mix3(prev.cam, k.cam, s);
  const tgt = mix3(prev.tgt, k.tgt, s);
  // creep toward the target a little between snaps
  const c2: V3 = [cam[0] + (tgt[0] - cam[0]) * creep, cam[1] + (tgt[1] - cam[1]) * creep, cam[2] + (tgt[2] - cam[2]) * creep];
  return {cam: c2, tgt, fov: lerp(prev.fov, k.fov, s), roll: lerp(prev.roll, k.roll, s), snap: i === 0 ? 0 : 1 - clamp01((lf - k.at) / 6), i};
};

type PointProps = ShotProps & {variant: 1 | 2};
const PANCAKE_SPOT: V3 = [1.55, 0, 0.05];

/**
 * Pointing at the lens. The camera snaps closer on every beat while sliding onto the line of his right shoulder, so the
 * finger always points straight down the lens (the arm aims at the live camera position); on "you" a hard snap to an
 * extreme fisheye close-up with a zoom burst + strobe. Variant 2 starts at dog height with Pancake barking at us too.
 */
export const PointShot: React.FC<PointProps> = ({f, lf, variant}) => {
  const t = lf / 30;
  const g = GUY_POS;
  const youAt = variant === 1 ? K.you1 : K.you2;
  const start = lf - f;
  const b = beatL(lf);
  const beats = LBEATS.filter((x) => x > start + 8 && x < youAt - 6);
  const snapYou = Math.round(youAt) - 2;
  const keys: CamKey[] =
    variant === 1
      ? [
          {at: start, cam: [0.95, 1.22, 3.1], tgt: [0.05, 1.28, 0], fov: 60, roll: -0.08},
          {at: beats[0] ?? start + 16, cam: [0.32, 1.28, 2.1], tgt: [0.0, 1.36, 0], fov: 70, roll: 0.06},
          {at: beats[1] ?? start + 33, cam: [-0.06, 1.32, 1.42], tgt: [0.02, 1.42, 0], fov: 78, roll: -0.05},
          {at: snapYou, cam: [0.0, 1.38, 0.95], tgt: [-0.13, 1.42, 0], fov: 80, roll: 0.07},
        ]
      : [
          {at: start, cam: [1.25, 0.5, 3.3], tgt: [0.45, 1.0, 0], fov: 76, roll: 0.07},
          {at: beats[0] ?? start + 15, cam: [0.55, 0.7, 2.4], tgt: [0.15, 1.15, 0], fov: 80, roll: -0.06},
          {at: beats[1] ?? start + 31, cam: [0.05, 1.02, 1.8], tgt: [0.1, 1.18, 0], fov: 84, roll: 0.05},
          {at: snapYou, cam: [0.06, 1.0, 1.1], tgt: [-0.1, 1.42, 0], fov: 84, roll: -0.08},
        ];
  const c = stepCam(keys, lf);
  const you = clamp01((lf - snapYou) / 3);
  // Aim the straight arm at the lens direction swung ~20 deg outward (to his right) and a touch down: seen end-on a
  // pointing finger vanishes into the fist, at this angle the finger's length reads and the face stays clear.
  const SH: V3 = [-0.22, 1.3, 0.1];
  const dc = [c.cam[0] - SH[0], c.cam[1] - SH[1], c.cam[2] - SH[2]];
  const camD = Math.hypot(dc[0], dc[2]);
  const yaw0 = Math.atan2(dc[0], dc[2]) - (variant === 1 ? 0.17 : 0.19) * Math.min(1, Math.max(0.45, (camD - 0.5) / 1.1));
  const pit0 = Math.atan2(dc[1], Math.hypot(dc[0], dc[2])) - (variant === 1 ? -0.04 : 0.16);
  const aim: V3 = [SH[0] + Math.sin(yaw0) * Math.cos(pit0) * 2, SH[1] + Math.sin(pit0) * 2, SH[2] + Math.cos(yaw0) * Math.cos(pit0) * 2];
  const d = Math.hypot(c.cam[0], c.cam[2]);
  const point = clamp01((f - 1) / 6);
  const elbow = lerp(0.1, 0.35, clamp01((1.6 - d) / 0.6));
  const shake = c.snap * 0.03;
  const camW: V3 = [g[0] + c.cam[0] + shake * noise1(lf * 3, 1), g[1] + c.cam[1] + shake * noise1(lf * 3, 2), g[2] + c.cam[2]];
  const tgtW: V3 = [g[0] + c.tgt[0], g[1] + c.tgt[1], g[2] + c.tgt[2]];
  // Pancake barks at the lens on every beat (variant 2)
  const bark = b.pulse;
  const dogPose = {
    ...pancakeIdle(t, 4),
    sit: 1,
    headPitch: 0.32 + 0.1 * bark,
    headYaw: -0.25,
    earPerk: 0.6 + 0.4 * bark,
    mouthOpen: 0.15 + 0.75 * bark,
    eyes: 'open' as const,
    tailWag: t * 5,
    tailWagAmount: 1,
    hop: 0.05 * bark,
    bodySquash: -0.15 * bark,
  };
  return (
    <>
      <CameraRig position={camW} target={tgtW} fov={c.fov + 4 * b.pulse + 6 * c.snap} roll={c.roll} />
      <World t={t} deco={{...DONE, t}} flare={0.5} grass={1400} />
      <Sunburst position={[g[0] - 4, 34, -160]} radius={250} rays={20} rotation2d={t * 0.5 * (variant === 1 ? 1 : -1)} opacity={0.22 + 0.2 * b.downPulse + 0.25 * you * (1 - clamp01((lf - snapYou) / 20))}
        colorA={variant === 1 ? '#FF4FB8' : '#19C6FF'} colorB={variant === 1 ? '#8A4DFF' : '#ffffff'} glow={0.08} />
      <Performer lf={lf} position={g} gesture="point" from="sing" mix={point} aim={aim}
        expression={you > 0 || noise1(lf * 0.2, 7) > 0.2 ? 'yell' : 'angry'} sing={1}
        pointElbow={elbow} extra={{headTilt: (variant === 1 ? 0.08 : -0.08) * (1 - you), lean: 0.06 + 0.06 * you, headYaw: 0.05}} />
      {variant === 2 ? <Pancake position={[g[0] + PANCAKE_SPOT[0], 0, g[2] + PANCAKE_SPOT[2]]} rotation={[0, -0.35, 0]} pose={dogPose} /> : null}
      <SparkleField count={22} seed={13 + variant} area={[5, 3, 1]} time={t} position={[g[0], 2.2, g[2] - 1.5]} size={0.35} intensity={1.6} />
      {c.snap > 0 ? <SpeedLines intensity={0.9 * c.snap} time={t} count={70} inner={0.5} color="#ffffff" opacity={0.6} /> : null}
    </>
  );
};
export const PointOver1: React.FC<ShotProps> = ({f, lf}) => (
  <>
    <CutEffect style="flash" k={f} tint="#FFFFFF" streak="#FF8AD0" seed={131} strength={0.8} />
    <CutEffect style="flash" k={Math.round(lf - K.you1 + 2)} tint="#FFFFFF" streak="#7FE6FF" seed={132} strength={0.75} />
  </>
);
export const PointOver2: React.FC<ShotProps> = ({f, lf}) => (
  <>
    <CutEffect style="flash" k={f} tint="#FFFFFF" streak="#7FE6FF" seed={133} strength={0.8} />
    <CutEffect style="flash" k={Math.round(lf - K.you2 + 2)} tint="#FFFFFF" streak="#FF8AD0" seed={134} strength={0.8} />
  </>
);

void mix3;

// ------------------------------------------------------------------ S14 high-angle fisheye
const SWARM: {spec: DialogSpec; at: number; pos: V3; rot: V3}[] = [
  {spec: POPUP_MESSAGES[5], at: K.done2 - 14, pos: [-1.5, 0.35, -0.6], rot: [-1.1, 0.2, 0.3]},
  {spec: POPUP_MESSAGES[2], at: K.done2 - 2, pos: [1.4, 0.6, -0.9], rot: [-0.9, -0.3, -0.2]},
  {spec: POPUP_MESSAGES[15], at: K.done2 + 6, pos: [-1.2, 1.2, 0.9], rot: [-0.6, 0.5, 0.1]},
  {spec: POPUP_MESSAGES[18], at: 816, pos: [1.3, 0.25, 0.8], rot: [-1.3, -0.2, 0.4]},
  {spec: POPUP_MESSAGES[1], at: K.upgrade2 - 2, pos: [0.1, 0.2, -1.6], rot: [-1.2, 0, -0.1]},
  {spec: POPUP_MESSAGES[19], at: K.upgrade2 + 5, pos: [-2.0, 0.9, 0.0], rot: [-0.8, 0.7, 0.2]},
  {spec: POPUP_MESSAGES[7], at: K.upgrade2 + 10, pos: [2.0, 1.1, -0.2], rot: [-0.7, -0.7, -0.15]},
  {spec: POPUP_MESSAGES[11], at: 826, pos: [0.4, 1.5, 1.4], rot: [-0.5, 0.1, 0.25]},
];

/** S14 (767-832): fisheye from above, he looks up into the lens singing "I'm done with upgrade" while pop-ups pile up around him. */
export const HighAngle: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const g = GUY_POS;
  const b = beatL(lf);
  const k = smooth(f / 65);
  const sp = snap(lf, 5);
  const cam: V3 = [g[0] + 0.3, lerp(2.75, 2.45, k) - 0.12 * sp, g[2] + lerp(1.0, 0.8, k)];
  const ang = t * 0.35;
  return (
    <>
      <CameraRig position={cam} target={[g[0], 1.0, g[2] - 0.25]} fov={84 + 5 * b.pulse} roll={0.25 + 0.2 * Math.sin(ang)} />
      <World t={t} deco={{...DONE, t}} flare={0.3} grass={1800} />
      <group position={g}>
        <Performer lf={lf} gesture={lf > K.upgrade2 ? 'fistUp' : 'chop'} from="chop" mix={clamp01((lf - K.upgrade2) / 6)} expression="determined"
          extra={{headPitch: -0.55, eyesY: 0.6}} />
        {SWARM.map((p, i) => {
          const s = lf < p.at ? 0 : popIn(lf, p.at, 9);
          return s > 0 ? <Popup3D key={i} spec={p.spec} width={1.3} position={p.pos} rotation={p.rot} scale={s} /> : null;
        })}
      </group>
    </>
  );
};
