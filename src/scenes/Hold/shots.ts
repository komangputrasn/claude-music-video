/**
 * Hold — pure per-frame staging (no React): the Guy's floating pose, his world transform, the pillow bob and the
 * camera for every shot. Shared by index.tsx and by the 2D anchoring (speech bubble), so they always agree.
 */
import type {GuyPose} from '../../lib/characters/guy/rig';
import {guyPoint} from '../../lib/characters/guy/rig';
import {guyBlink} from '../../lib/characters/guy/poses';
import {lerp} from '../../lib/time';
import {GUY_POS, PILLOW_POS, SHOT, T, V3, smooth} from './common';

export const STOP = Math.round(T.stopped);
export const END = 314;

export type Cam = {position: V3; target: V3; fov: number; roll?: number};

/** Guy-local -> world (group at GUY_POS + floatY, rotated by yaw) */
export const guyWorld = (yaw: number, floatY: number, p: V3): V3 => [
  GUY_POS[0] + p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw),
  GUY_POS[1] + floatY + p[1],
  GUY_POS[2] - p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw),
];

export const floatPose = (f: number): GuyPose => {
  const t = Math.min(f, STOP) / 30;
  const shock = smooth((f - (STOP - 1)) / 4); // eyes snap open on "stopped"
  const wonder = smooth((f - (T.voice + 4)) / 12); // turns toward the voice
  const smile = smooth((f - (SHOT.face + 6)) / 22);
  const bobArm = Math.sin(t * 1.3) * 0.05;
  return {
    t,
    ground: 0,
    lie: lerp(0.42, 0.12, shock),
    hipsY: 0,
    torsoBend: 0.05,
    torsoTwist: 0.22 * wonder,
    headPitch: lerp(lerp(0.05, -0.18, shock), 0.02, wonder),
    headYaw: lerp(0.12 * Math.sin(t * 0.4), 0.68, wonder),
    headTilt: lerp(0.18, 0.05, shock) + 0.06 * smile,
    armR: {shoulderX: 0.89, shoulderZ: 0.26, shoulderY: 0.1, elbow: 2.6, twist: 0.12, wrist: 0.32, wristZ: -0.27, grip: 0.55, swing: 0},
    armL: {shoulderX: lerp(2.45, 0.6, shock), shoulderZ: lerp(0.75, 0.35, shock), shoulderY: lerp(-0.3, 0.2, shock),
      elbow: lerp(2.25, 0.9, shock) + bobArm, twist: 0.3, grip: 0.3, swing: 0},
    legL: {hipX: lerp(0.75, 0.45, shock), hipZ: 0.08, knee: lerp(1.2, 0.7, shock), swing: 0},
    legR: {hipX: 0.22, hipZ: 0.06, knee: 0.3, swing: 0},
    expression: f < STOP ? 'sleepy' : 'shock',
    expression2: f < SHOT.face ? 'sad' : 'happy',
    expressionMix: f < STOP ? 0 : f < SHOT.face ? 0.35 * wonder : smile,
    blink: f < STOP ? 0.45 + 0.4 * guyBlink(t, 8) : f >= SHOT.face && f < SHOT.face + 40 ? 0 : guyBlink(f / 30, 9) * (f > 230 && f < 270 ? 1 : 0),
    mouthOpen: f < STOP ? 0.05 : lerp(0.3, 0.1, wonder) * (1 - smile),
    eyesX: lerp(0, 0.6, wonder) * (1 - 0.5 * smile),
    eyesY: lerp(-0.1, 0.1, shock),
  };
};

export type Staging = {
  pose: GuyPose;
  yaw: number;
  floatY: number;
  /** world position of his eyes */
  face: V3;
  pillow: V3;
  cam: Cam;
};

export const staging = (f: number): Staging => {
  const frozen = f >= STOP;
  const live = Math.min(f, STOP) / 30;
  const yaw = lerp(-0.35, 0.25, smooth(live / 2.2)) - 0.05 * Math.sin(live * 0.7);
  const floatY = frozen ? 0.06 * Math.sin((STOP / 30) * 1.1) - 0.04 * smooth((f - STOP) / 60) : 0.06 * Math.sin(live * 1.1);
  const pose = floatPose(f);
  const face = guyWorld(yaw, floatY, guyPoint(pose, 'eyes'));
  const pillow: V3 = [PILLOW_POS[0], PILLOW_POS[1] + 0.05 * Math.sin((f / 30) * 1.3), PILLOW_POS[2]];

  // horizontal unit vector from his face toward a point in front of the pillow (the "voice side")
  const voiceSide = (zBias: number): V3 => {
    const d: V3 = [PILLOW_POS[0] - face[0], 0, PILLOW_POS[2] - face[2] + zBias];
    const l = Math.hypot(...d);
    return [d[0] / l, 0, d[2] / l];
  };

  let cam: Cam;
  if (f < SHOT.bored) {
    const u = f / SHOT.bored;
    cam = {position: [lerp(-3.6, -3.1, u), lerp(2.0, 1.9, u), lerp(5.3, 4.9, u)], target: [0.6, 2.0, -0.8], fov: 50};
  } else if (f < SHOT.stopped) {
    const u = (f - SHOT.bored) / (SHOT.stopped - SHOT.bored);
    cam = {position: [face[0] + lerp(0.35, 0.28, u), face[1] + lerp(0.62, 0.55, u), face[2] + lerp(1.05, 0.95, u)],
      target: [face[0] + 0.02, face[1] - 0.12, face[2]], fov: 40, roll: 0.06};
  } else if (f < SHOT.voice) {
    cam = {position: [3.3, 2.7, 4.9], target: [0.1, 1.15, -0.3], fov: 50};
  } else if (f < SHOT.reveal) {
    const u = (f - SHOT.voice) / (SHOT.reveal - SHOT.voice);
    const s = voiceSide(1.2);
    const d = lerp(1.0, 0.88, u);
    cam = {position: [face[0] + s[0] * d, face[1] + 0.1, face[2] + s[2] * d], target: [face[0], face[1] - 0.1, face[2]], fov: 36};
  } else if (f < SHOT.push) {
    const u = (f - SHOT.reveal) / (SHOT.push - SHOT.reveal);
    cam = {position: [lerp(0.75, 0.85, u), 1.85, lerp(5.2, 5.0, u)], target: [0.92, 1.72, 0.35], fov: 38};
  } else if (f < SHOT.face) {
    const u = smooth((f - SHOT.push) / (SHOT.face - SHOT.push));
    // the pillow alone in the dark (he stays just out of frame, left), creeping in through the quiet
    cam = {position: [lerp(1.5, 1.62, u), lerp(1.98, 1.92, u), lerp(3.75, 2.75, u)],
      target: [pillow[0] + lerp(0.16, 0.2, u), pillow[1] + lerp(0.02, 0.1, u), pillow[2]], fov: lerp(34, 31, u)};
  } else {
    const u = (f - SHOT.face) / (END - SHOT.face);
    const s = voiceSide(1.0);
    const d = lerp(0.82, 0.7, u);
    cam = {position: [face[0] + s[0] * d, face[1] + 0.08, face[2] + s[2] * d], target: [face[0], face[1] - 0.1, face[2]], fov: 34};
  }
  return {pose, yaw, floatY, face, pillow, cam};
};
