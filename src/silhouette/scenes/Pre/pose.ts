// Pre — local pose helpers (pure functions; same rigs/conventions as src/lib/characters).
// guyKneelPat(k, r, s, t): he lowers onto one knee beside Pancake and lays his hand on the dog's head.
//   k 0..1  standing → kneeling (near/right knee down, far/left foot planted, knee up)
//   r 0..1  right arm: hanging → lifted → hovering over the dog's head (r 0.7) → resting ON it (r 1)
//   s       slow stroke phase (radians): sin(s) slides the resting hand back (+) / forward (−) along the skull
// pancakeWaitSit(t, touch): Pancake sitting, ears low, tail STILL (tailWagAmount 0), looking up at him; when his hand
// lands (touch 0..1) the head dips into the hand and tilts.
//
// Head pitch is kept low (0.1–0.14): the SilGuy hood's back drape rotates with the head, and a pitched-down head swings
// it off the shoulders into a "ponytail" in strict profile. He looks down through the torso lean instead.
import {guyIdle, mixPose, mergePose, GuyPose} from '../../../lib/characters/Guy';
import {pancakeBeg, PancakePose} from '../../../lib/characters/Pancake';

const KNEEL: GuyPose = {
  torsoBend: 0.3,
  headPitch: 0.12,
  headTilt: 0.12,
  // far (left) leg forward, foot planted, knee up; near (right) leg kneeling, shin flat behind
  legL: {hipX: 1.57, hipZ: 0.1, hipY: 0.05, knee: 1.57},
  legR: {hipX: 0.0, hipZ: 0.04, knee: 1.52, ankle: 0.9},
  // left forearm resting across the raised knee
  armL: {shoulderX: 0.62, shoulderZ: 0.16, shoulderY: 0.35, elbow: 1.05, twist: 0.5, grip: 0.45},
  armR: {shoulderX: 0.12, shoulderZ: 0.12, shoulderY: 0.1, elbow: 0.25, twist: 0.3, grip: 0.3},
};

/** torso lean while the hand is out (the arm solutions below are solved for this lean) */
const REACH_BEND = 0.48;
/** right arm, hand cupped: shared wrist/hand set + (shoulderX, elbow) solved with a rig probe (guyPoint 'gripR', scene
 *  placement of ShotKneel) against Pancake's head (pancakeAnchor 'head'/'headTop'): the grip centre sits ~0.3 cm above
 *  the skull line, so the palm overlaps the head outline (the two silhouettes merge = they touch). */
const HAND = {shoulderZ: -0.06, shoulderY: 0.12, twist: 1.35, wrist: -0.1, wristZ: 0.35, grip: 0.18};
const LIFT = {shoulderX: 1.2, elbow: 2.0}; // hand raised close in front of his chest, above the dog's head line
const HOVER = {shoulderX: 1.45, elbow: 1.18}; // grip ~10 cm above the crown
const ON_FRONT = {shoulderX: 1.3, elbow: 1.1}; // on the crown, toward the brow
const ON_MID = {shoulderX: 1.41, elbow: 0.92}; // where it lands, on "buddy"
const ON_BACK = {shoulderX: 1.55, elbow: 0.67}; // toward the back of the skull

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
type ArmKey = {shoulderX: number; elbow: number};
const mixKey = (a: ArmKey, b: ArmKey, k: number): ArmKey => ({shoulderX: lerp(a.shoulderX, b.shoulderX, k), elbow: lerp(a.elbow, b.elbow, k)});

export const guyKneelPat = (k: number, r: number, s: number, t: number): GuyPose => {
  const stand = mergePose(guyIdle(t, 3), {headPitch: 0.1, torsoBend: 0.1});
  let p = mixPose(stand, KNEEL, k);
  // where the resting hand is along the skull (one slow stroke)
  const st = Math.sin(s) * (r >= 1 ? 1 : 0);
  const on = st >= 0 ? mixKey(ON_MID, ON_BACK, st) : mixKey(ON_MID, ON_FRONT, -st);
  // the reach: lift the hand close in front of him (r 0..0.4: elbow folds first, so the hand rises in front of his chest),
  // carry it over the dog's head (0.4..0.7), then lower it onto the crown (0.7..1). It never sweeps through the face.
  const u = r / 0.4;
  const rest = KNEEL.armR!;
  const key = r < 0.4
    ? {shoulderX: lerp(rest.shoulderX!, LIFT.shoulderX, sm((u - 0.2) / 0.8)), elbow: lerp(rest.elbow!, LIFT.elbow, sm(u * 2.2))}
    : r < 0.7 ? mixKey(LIFT, HOVER, sm((r - 0.4) / 0.3)) : mixKey(HOVER, on, sm((r - 0.7) / 0.3));
  const w = sm(u);
  const arm = {
    shoulderX: key.shoulderX,
    elbow: key.elbow,
    shoulderZ: lerp(rest.shoulderZ!, HAND.shoulderZ, w),
    shoulderY: lerp(rest.shoulderY!, HAND.shoulderY, w),
    twist: lerp(rest.twist!, HAND.twist, w),
    wrist: lerp(0, HAND.wrist, w),
    wristZ: lerp(0, HAND.wristZ, w),
    grip: lerp(rest.grip!, HAND.grip, w),
  };
  p = mergePose(mixPose(p, mergePose(p, {headPitch: 0.14, torsoBend: REACH_BEND}), w), {armR: r > 0 ? arm : p.armR});
  return {...p, expression: 'sad', mouthOpen: 0};
};

export const pancakeWaitSit = (t: number, touch: number): PancakePose => {
  const b = pancakeBeg(t, 2);
  return {
    ...b,
    tailWag: 0,
    tailWagAmount: 0,
    earPerk: -0.75 - 0.2 * touch,
    headPitch: 0.36 * (1 - touch) + 0.12 * touch + Math.sin(t * 1.3) * 0.015,
    headTilt: 0.04 * (1 - touch) + 0.22 * touch,
    headYaw: 0,
    bodySquash: 0.02 * Math.sin(t * 2.4),
  };
};
