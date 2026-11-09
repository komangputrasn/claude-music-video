// Shared cast tweaks for V2Rain: the soaked outfit, trudge/flinch poses, wet drip points.
import type {GuyColors, GuyPose} from '../../lib/characters/Guy';
import {guyWalk, guyShiver, guyBlink, mergePose, mixPose, guyPoint} from '../../lib/characters/Guy';
import {noise1, clamp01} from '../../lib/time';

type V3 = [number, number, number];

/** soaked: hoodie and jeans a shade darker, hair flattened darker; the same outfit for the whole scene (no rebuilds) */
export const WET: Partial<GuyColors> = {
  hoodie: '#E27318',
  hoodieRib: '#B8520C',
  jeans: '#4170B5',
  jeansDark: '#2E568C',
  jeansHem: '#355FA0',
  hair: '#4F2D13',
  hairTip: '#E6CF8E',
};

export const TRUDGE_CADENCE = 0.78;

/** slow miserable walk, hugging himself against the cold */
export const guyTrudge = (t: number): GuyPose => {
  const w = guyWalk(t, TRUDGE_CADENCE);
  const s = guyShiver(t);
  const hug = mixPose(w, s, 0.55);
  return mergePose(hug, {
    walk: t * TRUDGE_CADENCE,
    walkAmount: 0.85,
    armL: {...(hug.armL ?? {}), swing: 0.15},
    armR: {...(hug.armR ?? {}), swing: 0.15},
    legL: {...(hug.legL ?? {}), swing: 1},
    legR: {...(hug.legR ?? {}), swing: 1},
    headPitch: 0.22 + 0.04 * noise1(t * 0.7, 3),
    torsoBend: 0.12,
    shrug: 0.75,
    shiver: 0.6,
    expression: 'sad',
    blink: guyBlink(t, 2),
    t,
  });
};

/** flinch away from a splash coming from his left (+X): arms up to shield, lean right, shock face */
export const guyFlinch = (k: number, base: GuyPose): GuyPose => {
  const a = clamp01(k);
  const shield: GuyPose = {
    torsoSide: -0.22,
    torsoTwist: -0.35,
    lean: -0.05,
    headYaw: -0.5,
    headPitch: 0.1,
    headTilt: -0.15,
    shrug: 1,
    armL: {shoulderX: 1.55, shoulderZ: 0.35, shoulderY: 0.6, elbow: 1.9, twist: 0.3, wrist: 0, wristZ: 0.1, grip: 0.3, swing: 0},
    armR: {shoulderX: 1.2, shoulderZ: 0.25, shoulderY: 0.7, elbow: 2.1, twist: 0.2, grip: 0.4, swing: 0},
    expression: 'shock',
    mouthOpen: 0.8,
    blink: 0.6,
  };
  return mixPose(base, mergePose(base, shield), a);
};

/** a few drip emitters (Guy-local): hair tips, nose, chin, sleeve cuffs */
export const dripPoints = (pose: GuyPose): V3[] => {
  const head = guyPoint(pose, 'head');
  const nose = guyPoint(pose, 'nose');
  const wl = guyPoint(pose, 'wristL');
  const wr = guyPoint(pose, 'wristR');
  return [
    [nose[0], nose[1] - 0.03, nose[2] + 0.01],
    [head[0] + 0.1, head[1] - 0.02, head[2] + 0.05],
    [head[0] - 0.11, head[1] - 0.04, head[2] + 0.02],
    [head[0] + 0.02, head[1] - 0.14, head[2] + 0.1],
    [wl[0], wl[1] - 0.05, wl[2]],
    [wr[0], wr[1] - 0.05, wr[2]],
  ];
};
