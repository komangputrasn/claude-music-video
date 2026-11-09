// [41] "click to cancel, I cancelled you." — the Chorus1 runaway CANCEL button finally gets caught (Pancake blocks it)
// and clicked; then the Guy points straight down the lens: "I cancelled YOU".
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CameraRig} from '../../../lib/three';
import {SparkleField, Confetti, Glow} from '../../../lib/three/fx';
import {Cursor3D, clickAt, Dialog, Stamp} from '../../../lib/ui';
import type {DialogSpec} from '../../../lib/ui';
import {Pancake, pancakeHappy, pancakeIdle, mixPose as mixDog, pancakeBlink} from '../../../lib/characters/Pancake';
import {hillsHeight} from '../../../lib/sets/Exterior';
import {lerp, clamp01, noise1, popIn} from '../../../lib/time';
import {Hit} from '../Hit';
import {World} from '../World';
import {RunawayButton} from '../RunawayButton';
import {Performer} from '../Performer';
import {K, beatL, songT, snapBeat} from '../timing';
import {ShotProps, mix3, smooth, easeOut, easeIn, hit, sunVec, V3} from '../common';
import {G0} from './BookShots';

// ------------------------------------------------------------------ H
const C1: V3 = [-6.2, hillsHeight(-6.2, 12.6), 12.6];
const BTN_TOP = 0.34 + 0.56;
const CLICK1 = snapBeat(362); // first try: it dodges
const BUMP = snapBeat(379); // runs into Pancake
const CLICK2 = Math.round(K.cancel1); // the click that lands
const POP = CLICK2 + 3;
const SPOT0: V3 = [0.75, 0, 0];
const SPOT1: V3 = [-0.25, 0, 0.25];
const STUCK: V3 = [-0.55, 0, 0.3];
const DOG: V3 = [-1.35, 0, 0.42];

const buttonAt = (lf: number) => {
  let pos = SPOT0, hop = 0, squash = 0, run = 0, runAmount = 0, look = 0, rotY = 0;
  // dodge #1 (hop left)
  if (lf >= CLICK1 - 4) {
    const k = clamp01((lf - (CLICK1 - 4)) / 9);
    pos = mix3(SPOT0, SPOT1, smooth(k));
    hop = Math.sin(k * Math.PI) * 0.6;
    squash = k < 0.15 ? -0.6 * (k / 0.15) : k < 0.85 ? 0.5 : -0.7 * (1 - (k - 0.85) / 0.15);
    look = -1;
    runAmount = k < 1 ? 1 : 0;
    run = (lf - CLICK1) / 6;
    if (k >= 1) {
      const a = lf - (CLICK1 + 5);
      squash = a < 5 ? -0.35 * Math.exp(-a / 2) * Math.cos(a * 1.2) : 0;
    }
  }
  // tries to run off to the left... straight into Pancake
  if (lf >= BUMP - 8) {
    const k = clamp01((lf - (BUMP - 8)) / 8);
    pos = mix3(SPOT1, STUCK, easeIn(k));
    run = (lf - BUMP) / 3.5;
    runAmount = k < 1 ? 1 : 0;
    rotY = -0.5 * k;
    look = -1;
    hop = Math.abs(Math.sin(run * Math.PI)) * 0.06 * (1 - k);
  }
  if (lf >= BUMP) {
    const a = lf - BUMP;
    // bounce back off the dog, dizzy wobble
    pos = mix3(STUCK, [STUCK[0] + 0.28, 0, STUCK[2] + 0.05], easeOut(a / 6));
    squash = -0.6 * Math.exp(-a / 3) * Math.cos(a * 1.4);
    rotY = lerp(-0.5, 0.25, easeOut(a / 8)) + 0.12 * Math.sin(a * 0.9) * Math.exp(-a / 14);
    look = Math.sin(a * 0.7) * Math.exp(-a / 20);
    runAmount = 0;
    hop = 0;
  }
  const pressed = clamp01((lf - (CLICK2 - 1)) / 3);
  return {pos, hop, squash, run, runAmount, look, rotY, pressed};
};

/** H (355-427): the CANCEL button dodges the first click, runs smack into Pancake, and the second click LANDS on "cancel". */
export const Catch: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const st = songT(lf);
  const s = buttonAt(lf);
  const b = beatL(lf);
  const popK = clamp01((lf - POP) / 6);
  const alive = lf < POP + 2;
  // cursor
  const hover = (p: V3): V3 => [p[0] + 0.5, BTN_TOP + 0.75, p[2] + 0.7];
  const clickPos = (p: V3): V3 => [p[0] + 0.08, BTN_TOP * 0.92, p[2] + 0.28];
  let cur: V3 = mix3([2.6, 3.2, 1.5], hover(SPOT0), easeOut((lf - 352) / 7));
  if (lf >= CLICK1 - 4) cur = mix3(hover(SPOT0), clickPos(SPOT0), easeOut((lf - (CLICK1 - 4)) / 4));
  if (lf >= CLICK1 + 4) cur = mix3(clickPos(SPOT0), hover([STUCK[0] + 0.28, 0, STUCK[2]]), smooth((lf - (CLICK1 + 4)) / (CLICK2 - CLICK1 - 12)));
  if (lf >= CLICK2 - 4) cur = mix3(hover([STUCK[0] + 0.28, 0, STUCK[2]]), clickPos([STUCK[0] + 0.28, 0, STUCK[2]]), easeIn((lf - (CLICK2 - 4)) / 4));
  if (lf >= CLICK2 + 6) cur = mix3(clickPos([STUCK[0] + 0.28, 0, STUCK[2]]), [0.9, 1.9, 0.9], easeOut((lf - CLICK2 - 6) / 14));
  const click = Math.max(clickAt(lf, CLICK1, 10), clickAt(lf, CLICK2, 12));
  // Pancake: bouncy, then braces as the button hits him, then celebrates the click
  const happy = pancakeHappy(st, 5, true);
  const brace = clamp01((lf - (BUMP - 6)) / 4) * (1 - clamp01((lf - (CLICK2 + 2)) / 6));
  const dogPose = {
    ...mixDog(happy, {...pancakeIdle(st, 5), eyes: 'open' as const, earPerk: 1, mouthOpen: 0.35, tongue: 0.4, tailWag: st * 5, tailWagAmount: 1}, brace),
    headYaw: lerp(0.15, -0.45, brace),
    headPitch: lerp(0.15, -0.15, brace),
    blink: pancakeBlink(st, 3),
    bodySquash: (happy.bodySquash ?? 0) * (1 - brace) - 0.25 * hit(lf, BUMP, 3),
  };
  const cam: V3 = [C1[0] - 0.05 + smooth(f / 72) * -0.3, C1[1] + 0.7, C1[2] + lerp(2.9, 2.45, smooth(f / 72))];
  const shake = hit(lf, CLICK2, 3) * 0.03;
  return (
    <>
      <CameraRig position={[cam[0] + shake * noise1(lf * 5, 1), cam[1] + shake * noise1(lf * 5, 2), cam[2]]} target={[cam[0] + 0.05, C1[1] + 0.62, C1[2]]}
        fov={52 - 1.5 * b.pulse - 4 * hit(lf, CLICK2, 6)} roll={0.03} />
      <World lf={lf} flare={0.12} skyGlow={0.5} deco={null} />
      <group position={C1}>
        {alive ? (
          <RunawayButton position={s.pos} run={s.run} runAmount={s.runAmount} squash={s.squash} hop={s.hop} look={s.look} rotation={[0, s.rotY, 0]}
            pressed={s.pressed} scale={1 - easeIn(popK) * 0.6} />
        ) : null}
        <Pancake position={DOG} rotation={[0, 1.25, 0]} pose={dogPose} />
        <Cursor3D kind="hand" size={0.85} position={cur} rotation={[-0.25, -0.15, 0.1]} click={click} />
        {/* the pop: confetti + sparkles + a hot core where the button was */}
        <group position={[STUCK[0] + 0.28, 0.55, STUCK[2]]}>
          <Confetti progress={clamp01((lf - POP) / 60)} count={200} power={1.3} spread={1.2} size={0.8} duration={2.2} seed={41} stars={0.2} />
          <Glow size={1.6 * (0.4 + hit(lf, POP, 4))} color="#fff2cc" intensity={1.2 * hit(lf, POP, 4)} />
          <SparkleField count={24} seed={42} area={[1.6, 1.2, 0.8]} time={t} size={0.22} intensity={3 * hit(lf, POP, 12)} />
        </group>
      </group>
      <pointLight position={[cam[0], C1[1] + 1.8, cam[2]]} color="#ffe2c4" intensity={2.0} distance={5} decay={1.4} />
    </>
  );
};
const DONE_DLG: DialogSpec = {kind: 'info', title: 'OmniStore', heading: 'Cancelled.', message: 'You have been unsubscribed\nfrom EVERYTHING.', buttons: ['OK'],
  aquaButton: 0, aquaColor: 'lime', width: 440};
export const CatchOver: React.FC<ShotProps> = ({lf}) => {
  const a = lf < POP + 2 ? 0 : popIn(lf, POP + 2, 10);
  return (
    <>
      <Hit k={lf - CLICK2} tint="#FFFFFF" streak="#9BFF3A" seed={281} strength={0.4} />
      {a > 0 ? <Dialog {...DONE_DLG} x={1240} y={130} scale={a * 1.15} /> : null}
    </>
  );
};

// ------------------------------------------------------------------ I
const POINT_AT = Math.round(K.youEnd1) - 4;

/** I (427-509): fisheye close-up; a giant CANCELLED stamp slams onto the screen on "cancelled"; he points down the lens on "you". */
export const PointYou: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const b = beatL(lf);
  const pointK = clamp01((lf - (POINT_AT - 4)) / 5);
  const push = easeOut((lf - POINT_AT) / 10);
  const rot = 0.25;
  const camLocal: V3 = [lerp(0.22, 0.1, push), lerp(1.3, 1.42, push), lerp(1.25, 0.82, push)];
  const c = Math.cos(rot), s = Math.sin(rot);
  const cam: V3 = [G0[0] + camLocal[0] * c + camLocal[2] * s, G0[1] + camLocal[1], G0[2] - camLocal[0] * s + camLocal[2] * c];
  const tgt: V3 = [G0[0] + 0.02, G0[1] + 1.36, G0[2]];
  const aim: V3 = [camLocal[0] - 0.14, camLocal[1] - 0.12, camLocal[2]];
  const grin = lf > K.cancelled1 + 6;
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={74 - 8 * push - 1.5 * b.pulse} roll={-0.06 + 0.04 * Math.sin(t * 2)} />
      <World lf={lf} flare={0} skyGlow={0.6} deco={null} sunDir={sunVec(0.12, -1.0)} />
      <group position={G0} rotation={[0, rot, 0]}>
        <Performer lf={lf} gesture={pointK > 0 ? 'point' : 'sing'} from="sing" mix={pointK} aim={aim} expression={grin ? 'happy' : 'determined'}
          extra={{headPitch: -0.12, eyesY: 0.1}} />
      </group>
      <SparkleField count={30} seed={57} area={[3.2, 1.6, 0.8]} time={t} position={[G0[0], G0[1] + 1.8, G0[2] - 0.9]} size={0.14}
        intensity={1.0 + 3 * hit(lf, POINT_AT + 4, 10)} />
      <pointLight position={[cam[0], G0[1] + 1.8, cam[2] + 0.3]} color="#ffe2c4" intensity={2.2} distance={5} decay={1.4} />
    </>
  );
};
export const PointYouOver: React.FC<ShotProps> = ({lf}) => {
  const sp = clamp01((lf - (K.cancelled1 - 5)) / 14);
  const fade = clamp01((lf - (K.cancelled1 + 26)) / 8);
  return (
    <>
      {sp > 0 && fade < 1 ? (
        <AbsoluteFill style={{opacity: 1 - fade}}>
          <Stamp text="CANCELLED" progress={sp} x={560} y={250} size={115} rotation={-12} />
        </AbsoluteFill>
      ) : null}
      <Hit k={Math.round(lf - K.cancelled1 + 1)} tint="#FFE0E0" streak="#E2231A" seed={291} strength={0.3} />
      <Hit k={lf - (POINT_AT + 4)} tint="#FFFFFF" streak="#FFD24A" seed={292} strength={0.6} />
    </>
  );
};
