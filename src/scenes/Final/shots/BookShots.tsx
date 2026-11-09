// [39] "I got a paper 1984 they can't take down." — the paper book as a trophy at sunrise.
import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill} from 'remotion';
import {CameraRig, ChromeText} from '../../../lib/three';
import {SparkleField, LensFlare, LightRays, Glow} from '../../../lib/three/fx';
import {Guy, guyHoldUp, guyJointMatrix, mergePose, guyBlink} from '../../../lib/characters/Guy';
import type {GuyPose} from '../../../lib/characters/Guy';
import {Pancake, pancakeIdle, pancakeHappy, mixPose as mixDog, pancakeBlink} from '../../../lib/characters/Pancake';
import {HeldBook} from '../../../lib/props';
import {Cursor3D, clickAt, Dialog} from '../../../lib/ui';
import type {DialogSpec} from '../../../lib/ui';
import {lerp, clamp01, popIn, noise1} from '../../../lib/time';
import {Hit} from '../Hit';
import {World} from '../World';
import {hillsHeight} from '../../../lib/sets/Exterior';
import {K, beatL, lipSync, songT} from '../timing';
import {ShotProps, mix3, smooth, easeOut, easeIn, hit, near, sunVec, V3} from '../common';
import {WRAPPED} from './WordShots';

/** where the Guy stands: on the open hillside west of the house (sun low behind him, house off to the right) */
export const G0: V3 = [-9, hillsHeight(-9, 12), 12];
const ROT = -0.08;
/** Pancake sits camera-left of the Guy, looking up at him */
export const P0: V3 = [G0[0] - 0.95, hillsHeight(-9.95, 12.35), G0[2] + 0.35];
/** the paper book is a touch larger than life so it reads in wide shots */
export const BOOK_SCALE = 1.4;
export const Book: React.FC = () => (
  <group scale={BOOK_SCALE}>
    <HeldBook />
  </group>
);

/** the raise: book at the chest from "got", thrust overhead from "paper" to "1984" */
export const raiseAt = (lf: number) => clamp01((lf - (K.paper - 4)) / (K.y1984 - K.paper + 2));

export const holdPose = (lf: number, extra?: GuyPose): GuyPose => {
  const t = songT(lf);
  const p = raiseAt(lf);
  const b = beatL(lf, 7);
  let pose = mergePose(guyHoldUp(smooth(p), t), {
    expression: p > 0.5 ? 'happy' : 'determined',
    expression2: undefined,
    expressionMix: 0,
    mouthOpen: lipSync(t),
    blink: guyBlink(t, 7),
    hipsY: -0.02 * b.pulse,
    headPitch: lerp(0.08, -0.3, smooth(p)) + 0.05 * b.pulse,
  });
  if (extra) pose = mergePose(pose, extra);
  return pose;
};

/** world position of the held book's cover centre */
export const bookWorld = (pose: GuyPose, pos: V3 = G0, rotY = ROT): V3 => {
  const m = guyJointMatrix(pose, 'gripR', {R: true});
  const v = new THREE.Vector3(0, -0.049 * BOOK_SCALE, -0.012).applyMatrix4(m);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  return [v.x + pos[0], v.y + pos[1], v.z + pos[2]];
};

const dogLookUp = (lf: number, k = 1) => {
  const t = songT(lf);
  const happy = pancakeHappy(t, 3, false);
  return {
    ...mixDog(pancakeIdle(t, 2), happy, 0.6 * k),
    sit: 1,
    headPitch: 0.55,
    headYaw: -0.35,
    tailWag: t * 3.2,
    tailWagAmount: 0.9,
    blink: pancakeBlink(t, 4),
  };
};

// ------------------------------------------------------------------ C
/** C (116-166): medium 3/4 on the lawn — he pulls the paper book out ("got") and starts the raise on "paper". */
export const Paper: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = smooth(f / 50);
  const pose = holdPose(lf);
  const b = beatL(lf);
  const cam: V3 = [G0[0] + lerp(0.9, 0.6, k), G0[1] + lerp(0.85, 0.8, k), G0[2] + lerp(3.7, 3.1, k)];
  const target: V3 = [G0[0] - 0.3, G0[1] + lerp(1.05, 1.25, k), G0[2]];
  return (
    <>
      <CameraRig position={cam} target={target} fov={40 - b.pulse * 1.2} roll={-0.03} />
      <World lf={lf} flare={0.12} deco={WRAPPED(t)} skyGlow={0.6} sunDir={sunVec(0.12, -1.3)} />
      <group position={G0} rotation={[0, ROT, 0]}>
        <Guy pose={pose} rightHand={<Book />} />
      </group>
      <Pancake position={[P0[0] + 0.1, P0[1], P0[2] - 1.0]} rotation={[0, 0.5, 0]} pose={dogLookUp(lf, raiseAt(lf))} />
      <pointLight position={[cam[0] - 0.5, G0[1] + 2.2, cam[2]]} color="#ffe2c4" intensity={2.2} distance={6} decay={1.4} />
    </>
  );
};

// ------------------------------------------------------------------ D
/** D (166-207): worm's-eye trophy shot — the sun rises right behind the book on "1984": flare, god-rays, sparkles. */
export const Trophy: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = smooth(f / 41);
  const pose = holdPose(lf, {headPitch: -0.32, headYaw: -0.12});
  const bw = bookWorld(pose);
  // close worm's-eye arc from his left-front, pushing in
  const ang = lerp(0.62, 0.3, k);
  const r = lerp(1.55, 1.3, k);
  const cam: V3 = [G0[0] + Math.sin(ang) * r, G0[1] + lerp(0.95, 1.0, k), G0[2] + Math.cos(ang) * r];
  const face: V3 = [G0[0], G0[1] + 1.55, G0[2] + 0.05];
  const target: V3 = mix3(face, bw, lerp(0.5, 0.56, k));
  const dir = new THREE.Vector3(bw[0] - cam[0], bw[1] - cam[1], bw[2] - cam[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const burst = hit(lf, K.y1984 - 1, 9);
  const glowK = clamp01((lf - (K.y1984 - 6)) / 6);
  const b = beatL(lf);
  return (
    <>
      <CameraRig position={cam} target={target} fov={52 - 3 * burst - b.pulse} roll={lerp(0.1, 0.03, k)} />
      <World lf={lf} flare={0} deco={WRAPPED(t)} skyGlow={0.6} />
      <group position={G0} rotation={[0, ROT, 0]}>
        <Guy pose={pose} rightHand={<Book />} />
      </group>
      <group position={bw}>
        {/* holy-relic halo behind the book */}
        <group quaternion={q}>
          <LightRays length={4} radius={2.4} count={18} color="#fff0c0" intensity={glowK * (0.45 + 0.9 * burst)} time={t} haze={0.12} position={[0, -0.25, 0]} />
        </group>
        <Glow position={[dir.x * 0.35, dir.y * 0.35, dir.z * 0.35]} size={0.9 + 0.5 * burst} color="#ffd98a" intensity={glowK * (0.9 + 1.2 * burst)} />
        <group position={[0.06, 0.1, 0.02]}>
          <LensFlare intensity={glowK * (0.12 + 0.6 * burst)} scale={0.55 + 0.4 * burst} rotation={t * 0.5} color="#fff2cc" />
        </group>
        <SparkleField count={28} seed={19} area={[0.8, 0.8, 0.4]} time={t} size={0.12} intensity={glowK * (1.6 + 3 * burst)}
          colors={['#ffffff', '#fff3c0', '#ffd27a', '#ffc2ea']} />
      </group>
      <pointLight position={[cam[0], G0[1] + 1.6, cam[2]]} color="#ffe2c4" intensity={2.4} distance={6} decay={1.4} />
    </>
  );
};
export const TrophyOver: React.FC<ShotProps> = ({lf}) => (
  <Hit k={Math.round(lf - K.y1984 + 1)} tint="#FFF6D8" streak="#FFD24A" seed={231} strength={0.55} />
);

// ------------------------------------------------------------------ E
const REMOVE_FAIL: DialogSpec = {
  kind: 'error', title: 'OmniStore', heading: 'Cannot remove title', message: 'This copy of 1984 is PAPER.\nYou own it.', buttons: ['OK'], width: 430,
};

/** E (207-248): a store cursor swoops in to drag the book away — it won't budge. "CAN'T TAKE DOWN" slams in in chrome. */
export const CantTakeDown: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const pose = holdPose(lf, {headPitch: -0.12, eyesX: 0.5, eyesY: 0.6, headYaw: 0.15});
  const bw = bookWorld(pose);
  const b = beatL(lf);
  const k = smooth(f / 41);
  const cam: V3 = [G0[0] + lerp(-0.75, -0.55, k), G0[1] + lerp(1.6, 1.65, k), G0[2] + lerp(3.3, 2.95, k)];
  const target: V3 = [G0[0] - 0.45, G0[1] + 1.72, G0[2]];
  // cursor: swoop in (they) -> grab (can't) -> yank x3 (fails, book stays) -> blasted away (down)
  const grab = K.cant - 1;
  const tip: V3 = [bw[0] + 0.03, bw[1] + 0.02, bw[2] + 0.06];
  const swoop = easeOut((lf - (K.they - 6)) / 9);
  let cur = mix3([bw[0] + 1.6, bw[1] + 1.1, bw[2] + 0.5], tip, swoop);
  const yank = lf > grab + 2 && lf < K.down - 2 ? Math.max(0, Math.sin(((lf - grab - 2) / 7) * Math.PI)) : 0;
  cur = [cur[0] + yank * 0.22, cur[1] + yank * 0.12, cur[2]];
  const blast = clamp01((lf - (K.down - 2)) / 8);
  cur = mix3(cur, [bw[0] + 2.4, bw[1] + 2.0, bw[2] - 0.5], easeIn(blast));
  const strain = yank > 0.05 ? 1 : 0;
  // the book only wobbles a little (it's his)
  const wob = strain * 0.025 * Math.sin(lf * 2.2);
  const tPose = mergePose(pose, {armR: {wristZ: (pose.armR?.wristZ ?? 0) + wob}});
  const ttl = popIn(lf, K.take - 3, 12);
  const ttl2 = popIn(lf, K.down - 3, 12);
  return (
    <>
      <CameraRig position={[cam[0] + strain * 0.006 * noise1(lf * 3, 2), cam[1], cam[2]]} target={target} fov={40 - b.pulse * 1.2} roll={0.03} />
      <World lf={lf} flare={0.3} deco={WRAPPED(t)} />
      <group position={G0} rotation={[0, ROT, 0]}>
        <Guy pose={tPose} rightHand={<Book />} />
      </group>
      <Pancake position={P0} rotation={[0, 0.6, 0]} pose={{...dogLookUp(lf, 1), mouthOpen: strain * (0.5 + 0.3 * Math.sin(lf * 1.3)), earPerk: 0.9}} />
      {swoop > 0 && blast < 1 ? (
        <Cursor3D kind="hand" size={0.36} position={cur} rotation={[-0.2, -0.3, 0.25 + blast * 3]} click={clickAt(lf, grab, 10)} color="#FFE9EE" />
      ) : null}
      {/* zap where the cursor touches the book */}
      {strain ? <Glow position={tip} size={0.25 + 0.1 * Math.sin(lf * 2.5)} color="#ff5fa8" intensity={1.6} /> : null}
      <group position={[G0[0] - 1.15, G0[1] + 2.2, G0[2] + 0.55]} rotation={[0, 0.22, 0.04]}>
        {ttl > 0.01 ? (
          <ChromeText text="CAN'T" size={0.22} anchor="center" material="chrome" outline={{thickness: 0.01, color: '#2a0a3a'}}
            shine={clamp01((lf - K.take) / 14)} scale={ttl} position={[0, 0.16, 0]} />
        ) : null}
        {ttl2 > 0.01 ? (
          <ChromeText text="TAKE DOWN" size={0.15} anchor="center" material="gold" outline={{thickness: 0.008, color: '#2a0a3a'}}
            shine={clamp01((lf - K.down) / 14)} scale={ttl2} position={[0, -0.16, 0]} />
        ) : null}
        <SparkleField count={18} seed={33} area={[1.3, 0.6, 0.3]} time={t} size={0.12} intensity={2.4 * clamp01((lf - K.take + 2) / 5)} />
      </group>
      <pointLight position={[cam[0], G0[1] + 2.2, cam[2]]} color="#ffe2c4" intensity={2.2} distance={6} decay={1.4} />
    </>
  );
};
export const CantTakeDownOver: React.FC<ShotProps> = ({lf}) => {
  const a = lf < K.cant + 2 ? 0 : popIn(lf, K.cant + 2, 9);
  const out = clamp01((lf - (K.down + 4)) / 5);
  return (
    <>
      {a > 0 && out < 1 ? (
        <Dialog {...REMOVE_FAIL} x={1210} y={150} scale={a * (1 - out * 0.3)} style={{opacity: 1 - out}} />
      ) : null}
      <Hit k={Math.round(lf - K.down + 2)} tint="#FFFFFF" streak="#FFD24A" seed={241} strength={0.3} />
    </>
  );
};

void near;
