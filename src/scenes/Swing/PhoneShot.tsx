/**
 * Swing · shot 3 (local 131–208): "I picked up the phone with the hammer in my hand"
 *   131–146 medium close: he snaps the silver flip phone open one-handed ("picked up"), green screen lights his face
 *   146–208 HERO LOW ANGLE: phone at his ear, grandpa's hammer raised in the other fist like a torch, cop strobes
 *           rim-lighting him through the rainy window; the hammer glints on "hammer", snap push-in on "hand".
 */
import React from 'react';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {Sparkle, LensFlare, SparkleField, Glow, Sunburst} from '../../lib/three/fx';
import {Billboard} from '@react-three/drei';
import {EarPhone, earPhoneScreen} from './EarPhone';
import {Guy, GuyPose, guyPhoneToEar, guyIdle, mergePose, mixPose, guyJointMatrix} from '../../lib/characters/Guy';
import {Pancake, pancakeEat} from '../../lib/characters/Pancake';
import {HeldHammer, HeldPhone, HELD} from '../../lib/props';
import {ramp, lerp, noise1, popIn} from '../../lib/time';
import {C} from '../../lib/palette';
import * as THREE from 'three';
import {T, V3, clamp, smooth} from './common';
import {RoomAfter, toWorld} from './Room';
import {EAT_POS, EAT_ROT} from './PancakeShot';

export const HERO_POS: V3 = [0.6, 0, -0.55];
export const HERO_ROT = 0.2;
const P1_END = 146;

/** left fist in front of the chest, thumb up -> hammer handle vertical, head at shoulder height (verified numerically) */
export const HAMMER_UP_L = {shoulderX: 0.5, shoulderZ: 0.3, shoulderY: 0, elbow: 1.3, twist: -0.25, wrist: -0.25, wristZ: 0, grip: 1, swing: 0};
/** presented: fist forward at shoulder height, handle still vertical */
export const HAMMER_PRESENT_L = {shoulderX: 0.8, shoulderZ: 0.35, shoulderY: 0, elbow: 1.2, twist: -0.25, wrist: -0.45, wristZ: 0, grip: 1, swing: 0};
/** squeezed + lifted on "hand" */
export const HAMMER_RAISED_L = {shoulderX: 1.05, shoulderZ: 0.35, shoulderY: 0, elbow: 1.05, twist: -0.25, wrist: -0.6, wristZ: 0, grip: 1, swing: 0};

const mixArm = <A extends Record<string, number>>(a: A, b: A, k: number): A => {
  const o: Record<string, number> = {};
  for (const key of Object.keys(a)) o[key] = a[key] + (b[key] - a[key]) * k;
  return o as A;
};

/** where the hammer head is in Guy-local space for a pose (left hand) */
export const hammerHeadL = (pose: GuyPose): V3 => {
  const v = new THREE.Vector3(...HELD.hammerHead).applyMatrix4(guyJointMatrix(pose, 'gripL', {L: true}));
  return [v.x, v.y, v.z];
};

/** right arm holding the phone up in front of his chin, screen toward the camera, earpiece up (solved numerically) */
const LOOK_R = {shoulderX: 1.0, shoulderZ: 0.3, shoulderY: 0.8, elbow: 1.4, twist: 1.4, wrist: -0.5, wristZ: -0.6, grip: 1, swing: 0};

export const heroPose = (f: number, talk: number): GuyPose => {
  const t = f / 30;
  const base = mergePose(guyIdle(t, 3), {expression: 'determined'});
  // < P1_END: looking down at the phone in front of his face; afterwards: phone at the ear
  const look = mergePose(base, {armL: HAMMER_UP_L, armR: LOOK_R, headPitch: 0.12, headYaw: 0.05, torsoBend: 0.02});
  const phone = mergePose(guyPhoneToEar(t), {
    expression: 'determined', armL: HAMMER_UP_L, headTilt: -0.1, headPitch: 0.12, torsoBend: -0.04,
  });
  const p = f < P1_END ? look : phone;
  // presents the hammer on "hammer", grip tightens + lifts on "hand"
  const present = smooth((f - (T.hammer - 4)) / 7);
  const squeeze = smooth((f - (T.hand - 3)) / 5);
  return {
    ...p,
    armL: mixArm(mixArm(HAMMER_UP_L, HAMMER_PRESENT_L, present), HAMMER_RAISED_L, squeeze),
    mouthOpen: talk,
    expression: 'determined',
    expression2: 'angry',
    expressionMix: 0.35 * squeeze,
    eyesX: 0,
    eyesY: f < P1_END ? -0.3 : -0.25,
    blink: f >= P1_END && f < 186 ? p.blink : 0,
  };
};

export const PhoneShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const seg = f < P1_END ? 0 : 1;
  const talk = f > T.phone + 6 ? clamp(0.15 + 0.35 * Math.abs(Math.sin(t * 11)) * (0.5 + 0.5 * noise1(t * 4, 2)), 0, 1) * 0.6 : 0;
  const pose = heroPose(f, talk);
  const open = smooth((f - (T.picked - 1.5)) / 4.5);
  const head = toWorld(HERO_POS, HERO_ROT, hammerHeadL(pose));
  const glint = Math.exp(-Math.max(0, f - T.hammer) / 7) * (f >= T.hammer - 1 ? 1 : 0);
  const hammerGlow = 0.35 + 0.65 * glint;

  let cam: {position: V3; target: V3; fov: number; roll?: number};
  if (seg === 0) {
    // "product shot" insert: he flips the phone open right at the lens, green screen "CANCEL ALL?", his face behind
    const u = smooth((f - 131) / 15);
    cam = {
      position: toWorld(HERO_POS, HERO_ROT, [lerp(0.16, 0.1, u), 1.3, lerp(1.0, 0.88, u)]),
      target: toWorld(HERO_POS, HERO_ROT, [-0.06, 1.37, 0.3]),
      fov: 44,
    };
  } else {
    // HERO: low 3/4 from his phone side, slow push; a kick on "hammer"; snap push-in + shake on "hand"
    const u = smooth((f - P1_END) / (T.hand - P1_END));
    const kickH = smooth((f - (T.hammer - 2)) / 4) * (1 - 0.6 * smooth((f - (T.hammer + 6)) / 10));
    const snap = smooth((f - (T.hand - 3)) / 5);
    const sh = f >= T.hand + 1 ? Math.exp(-(f - (T.hand + 1)) / 4) * 0.02 : 0;
    const far: V3 = [lerp(-0.5, -0.38, u), lerp(0.98, 0.92, u), lerp(1.55, 1.32, u) - 0.08 * kickH];
    const near: V3 = [-0.12, 0.98, 0.86];
    const p = [lerp(far[0], near[0], snap), lerp(far[1], near[1], snap), lerp(far[2], near[2], snap)] as V3;
    cam = {
      position: toWorld(HERO_POS, HERO_ROT, [p[0] + sh * noise1(f, 1), p[1] + sh * noise1(f, 2), p[2]]),
      target: toWorld(HERO_POS, HERO_ROT, [lerp(0.06, 0.1, snap), lerp(1.38, 1.5, snap), 0]),
      fov: lerp(52 - 3 * kickH, 66, snap),
      roll: lerp(0.07, -0.06, snap),
    };
  }

  const screen = earPhoneScreen(pose, HERO_POS, HERO_ROT);
  const phoneLines = open > 0.5 ? ['MY PLANS (7)', '> CANCEL ALL?', '  YES  /  NO'] : ['', ''];
  const keyPos: V3 = toWorld(HERO_POS, HERO_ROT, [0.6, 1.2, 1.3]);
  return (
    <Stage background={C.night} env="night" lens={{vignette: 0.45, grain: 0.04, saturation: 1.12}}>
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} roll={cam.roll ?? 0} />
      <RoomAfter f={f} cops={1} keyPos={keyPos} keyIntensity={2.2}>
        <Guy position={HERO_POS} rotation={[0, HERO_ROT, 0]} pose={pose}
          rightHand={seg === 0 ? <HeldPhone open={open} screenLines={phoneLines} softKeys={['Back', 'OK']} /> : <EarPhone open={1} screenLines={phoneLines} softKeys={['Back', 'OK']} extText="CALL 0:07" />}
          leftHand={<HeldHammer glow={hammerGlow} />} />
        {/* green screen spill on his face once the phone is open */}
        <pointLight position={seg === 0 ? toWorld(HERO_POS, HERO_ROT, [-0.25, 1.5, 0.45]) : screen} color="#9dff5a" intensity={(seg === 0 ? 0.12 : 0.02) * open}
          distance={0.8} decay={2} />
        {seg === 1 ? <Glow position={screen} size={0.14} color="#9dff5a" intensity={0.28 + 0.08 * Math.sin(f * 0.4)} /> : null}
        <group position={EAT_POS} rotation={[0, EAT_ROT, 0]}>
          <Pancake pose={pancakeEat(t)} />
        </group>
      </RoomAfter>
      {glint > 0.02 ? (
        <group position={head}>
          <Sparkle size={0.5 * glint + 0.05} time={t} intensity={3} />
          <LensFlare intensity={0.5 * glint} scale={0.6} rotation={t * 0.3} />
        </group>
      ) : null}
      {/* "legendary item" halo behind the hammer head: flares on "hammer", lingers */}
      {seg === 1 && f >= T.hammer - 2 ? (
        <Billboard position={head}>
          <Sunburst position={[0, 0, -0.06]} radius={0.34} rays={14} colorA="#ffb347" colorB="#000000" center="#ffe9b0" additive
            rotation2d={t * 0.5} opacity={(0.16 + 0.45 * glint) * smooth((f - (T.hammer - 2)) / 3)} glow={0.6} softness={0.6} />
        </Billboard>
      ) : null}
      {seg === 1 ? <SparkleField count={10} seed={31} area={[0.5, 0.6, 0.3]} position={head} time={t} size={0.06} intensity={1.6} /> : null}
    </Stage>
  );
};
