// Local copy of the Chorus1 performer (the Guy as a 2002 pop-punk lead singer): beat bounce, head nods, lip-sync from the
// final-chorus word timings, and gestures (point at the lens with an extended index finger, chop, shrug, fist pump),
// plus `rightHand` / `leftHand` passthrough for props.
import React from 'react';
import type {ThreeElements} from '@react-three/fiber';
import {Guy, GUY_COLORS, guyIdle, mergePose, mixPose, guyBlink} from '../../lib/characters/Guy';
import type {GuyPose, GuyExpression, GuyArmPose} from '../../lib/characters/Guy';
import {InkMesh} from '../../lib/characters/InkMesh';
import {beatAt} from '../../lib/time';
import {lipSync, songT} from './timing';

/** index finger sticking out of a fist (render in the right hand's grip slot) */
export const PointFinger: React.FC<{len?: number}> = ({len = 0.075}) => (
  // grip frame: -Y runs out of the knuckles along the forearm, +Z is the thumb side (top of the fist)
  <group position={[-0.022, -0.006, 0.024]}>
    <InkMesh color={GUY_COLORS.skin} outline={0.005} position={[0, -len / 2, 0]}>
      <capsuleGeometry args={[0.017, len, 4, 10]} />
    </InkMesh>
  </group>
);

const POINT_R: GuyArmPose = {shoulderX: 1.5, shoulderZ: 0.12, shoulderY: -0.1, elbow: 0.12, twist: 0.0, wrist: 0, wristZ: -0.1, grip: 1, swing: 0};
const POINT_HIGH_R: GuyArmPose = {shoulderX: 1.75, shoulderZ: 0.1, shoulderY: -0.1, elbow: 0.1, twist: 0.0, wrist: 0, wristZ: -0.15, grip: 1, swing: 0};
const FIST_L: GuyArmPose = {shoulderX: 0.55, shoulderZ: 0.35, shoulderY: 0.6, elbow: 1.9, twist: 0.2, wrist: 0, wristZ: 0.2, grip: 1, swing: 0};
const CHOP_R: GuyArmPose = {shoulderX: 1.0, shoulderZ: 0.35, shoulderY: 0.25, elbow: 1.0, twist: -0.6, wrist: 0, wristZ: 0, grip: 0.1, swing: 0};
const SHRUG_ARM: GuyArmPose = {shoulderX: 0.35, shoulderZ: 0.55, shoulderY: 0.2, elbow: 1.45, twist: -1.2, wrist: 0, wristZ: -0.35, grip: 0.0, swing: 0};
const MIC_UP_L: GuyArmPose = {shoulderX: 2.6, shoulderZ: 0.5, shoulderY: 0, elbow: 0.3, twist: 0, wrist: 0, wristZ: 0, grip: 1, swing: 0};

export type Gesture = 'sing' | 'point' | 'pointHigh' | 'chop' | 'shrug' | 'fistUp' | 'none';

const gesturePose = (g: Gesture, pulse: number): GuyPose => {
  switch (g) {
    case 'point':
      return {armR: POINT_R, armL: {...FIST_L, shoulderX: FIST_L.shoulderX! + 0.15 * pulse}, torsoTwist: -0.12, lean: 0.06};
    case 'pointHigh':
      return {armR: POINT_HIGH_R, armL: FIST_L, torsoTwist: -0.15, lean: 0.1};
    case 'chop':
      return {armR: {...CHOP_R, elbow: 1.0 - 0.5 * pulse, shoulderX: 1.0 + 0.25 * pulse}, armL: FIST_L};
    case 'shrug':
      return {armR: SHRUG_ARM, armL: SHRUG_ARM, shrug: 0.9, headTilt: 0.18};
    case 'fistUp':
      return {armL: MIC_UP_L, armR: {...FIST_L, shoulderZ: 0.4}};
    case 'sing':
      return {
        armL: {...FIST_L, shoulderX: FIST_L.shoulderX! + 0.25 * pulse, elbow: FIST_L.elbow! - 0.2 * pulse},
        armR: {shoulderX: 0.4 + 0.2 * pulse, shoulderZ: 0.45, shoulderY: 0.1, elbow: 0.9, twist: -0.4, grip: 0.2, swing: 0},
      };
    default:
      return {};
  }
};

export type PerformerProps = Omit<ThreeElements['group'], 'children'> & {
  /** scene-local frame */
  lf: number;
  gesture?: Gesture;
  /** cross-fade from this gesture to `gesture` (0..1) */
  from?: Gesture;
  mix?: number;
  expression?: GuyExpression;
  /** multiply the lip-sync amount */
  sing?: number;
  extra?: GuyPose;
  outlineScale?: number;
  /** Guy-local point the pointing finger aims at (e.g. the camera, slightly offset so the fist doesn't hide the face) */
  aim?: [number, number, number];
  rightHand?: React.ReactNode;
  leftHand?: React.ReactNode;
  /** base pose to use instead of the beat-bounce idle (gesture + lip-sync still apply on top) */
  base?: GuyPose;
};

/** right-arm shoulder angles that point the straight arm at a Guy-local point */
export const aimArm = (aim: [number, number, number]): {shoulderX: number; shoulderZ: number} => {
  const dx = aim[0] + 0.21, dy = aim[1] - 1.31, dz = Math.max(0.05, aim[2]);
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz));
  return {shoulderX: Math.PI / 2 + pitch, shoulderZ: -yaw};
};

export const Performer: React.FC<PerformerProps> = ({lf, gesture = 'sing', from, mix = 1, expression = 'determined', sing = 1, extra, outlineScale, aim, rightHand, leftHand,
  base: baseOverride, ...group}) => {
  const t = songT(lf);
  const b = beatAt(t, 7);
  const pulse = b.pulse;
  const base: GuyPose = baseOverride ? {...baseOverride, mouthOpen: lipSync(t) * sing} : mergePose(guyIdle(t, 3), {
    hipsY: -0.035 * pulse,
    legL: {hipX: 0.12 * pulse, hipZ: 0.12, knee: 0.25 * pulse},
    legR: {hipX: 0.12 * pulse, hipZ: 0.1, knee: 0.25 * pulse},
    headPitch: -0.06 + 0.12 * pulse,
    torsoBend: 0.03 + 0.05 * pulse,
    expression,
    mouthOpen: lipSync(t) * sing,
    blink: guyBlink(t, 3),
    eyesX: 0,
    eyesY: 0,
    headYaw: 0,
  });
  const gpTo = gesturePose(gesture, pulse);
  if (aim && (gesture === 'point' || gesture === 'pointHigh') && gpTo.armR) {
    gpTo.armR = {...gpTo.armR, ...aimArm(aim)};
    gpTo.torsoTwist = 0.05;
  }
  const gp = from && mix < 1 ? mixPose(gesturePose(from, pulse), gpTo, mix) : gpTo;
  let pose = mergePose(base, gp);
  pose = {...pose, expression, expression2: undefined, expressionMix: 0, mouthOpen: lipSync(t) * sing};
  if (extra) pose = mergePose(pose, extra);
  const pointing = gesture === 'point' || gesture === 'pointHigh';
  return (
    <Guy {...group} pose={pose} rightHand={rightHand ?? (pointing && mix > 0.5 ? <PointFinger /> : undefined)} leftHand={leftHand} outlineScale={outlineScale} />
  );
};
