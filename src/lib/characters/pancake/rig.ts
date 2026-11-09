/**
 * Pancake rig — pure pose solver (no React, no three.js scene objects).
 *
 * `solvePancake(pose)` turns a high-level {@link PancakePose} into every joint transform the <Pancake> component renders.
 * `pancakeAnchor(pose, name)` runs the SAME transforms as matrices so scene builders can find e.g. the nose position for
 * any pose (to put kibble at the mouth, a bowl under the nose, a hand on the head...).
 *
 * Conventions: metres, y = 0 is the floor, the dog faces +Z, origin = floor point under the middle of the body.
 * three.js rotation.x > 0 tips a forward-pointing axis DOWN, so internally "nose down" = +rx.
 *
 *   import {solvePancake, pancakeAnchor} from './pancake/rig';
 *   const nose = pancakeAnchor({eat: 1}, 'nose'); // [x, y, z] in Pancake-local space
 */
import * as THREE from 'three';

export type V3 = [number, number, number];
export type PancakeEyes = 'open' | 'puppy' | 'happy' | 'closed';

export type PancakePose = {
  /** walk-cycle phase in cycles (1.0 = one full trot cycle). Advance at `speed / PANCAKE.strideLength` cycles per second
   *  to keep the paws planted. */
  walk?: number;
  /** 0..1 how much of the walk cycle is applied (0 = standing still). */
  walkAmount?: number;
  /** 0..1 sit on the haunches (front paws stay planted). */
  sit?: number;
  /** 0..1 lie down, belly on the floor, front legs forward, chin down on the paws. */
  lie?: number;
  /** head turn, radians, + turns the face toward +X. */
  headYaw?: number;
  /** head pitch, radians, + looks UP (nose up), − looks down. */
  headPitch?: number;
  /** head roll, radians, + rolls the top of the head toward −X (the classic curious tilt). */
  headTilt?: number;
  /** -1 droopy/sad .. 0 relaxed .. 1 perked/excited. */
  earPerk?: number;
  /** tail wag phase in cycles. */
  tailWag?: number;
  /** 0..1 wag amplitude (1 = big happy wag). */
  tailWagAmount?: number;
  /** 0..1 jaw open. */
  mouthOpen?: number;
  /** 0..1 tongue out (0 = in, 0.4 = little "blep", 1 = hanging out/panting). */
  tongue?: number;
  /** eye style. 'puppy' = huge wet sad eyes with brows up; 'happy' = closed ^ ^ arcs with blush; 'closed' = sleepy ∪ lids. */
  eyes?: PancakeEyes;
  /** 0..1 blink (1 = fully shut). Ignored for 'happy' / 'closed'. */
  blink?: number;
  /** 0..1 head down into a bowl in front of the dog (see PANCAKE.bowl). */
  eat?: number;
  /** chewing/bobbing phase in cycles while eating. */
  eatPhase?: number;
  /** cartoon squash (+) / stretch (−), about -1..1, pivots at the floor. */
  bodySquash?: number;
  /** metres the whole dog is lifted off the floor (little happy hops). Legs tuck slightly; the blob shadow stays down. */
  hop?: number;
  /** 0..1 rosy cheek blush (defaults: happy 1, puppy 0.6, otherwise 0). */
  blush?: number;
  /** 0..1 sad little frown instead of the "ω" smile (default: 1 for 'puppy' eyes, else 0). */
  frown?: number;
  /** 0..1 a single glossy tear: forms under the dog's left eye (0..0.3) then rolls down the cheek (0.3..1). 0 = none. */
  tear?: number;
};

// ------------------------------------------------------------------------------------------------------------------
// Skeleton (standing rest pose, Pancake-local metres)
// ------------------------------------------------------------------------------------------------------------------
export const SK = {
  torso: {c: [0, 0.37, -0.025] as V3, r: [0.19, 0.178, 0.265] as V3},
  /** body pivot (between the rear hips) — the body rotates around this for sitting. */
  pivot: [0, 0.31, -0.17] as V3,
  frontHip: [0.1, 0.31, 0.15] as V3, // x mirrored for the right side
  rearHip: [0.115, 0.31, -0.17] as V3,
  upper: 0.145,
  lower: 0.13,
  /** paw centre height when planted */
  pawY: 0.035,
  neck: [0, 0.47, 0.17] as V3,
  /** head centre relative to the neck pivot */
  headOff: [0, 0.108, 0.105] as V3,
  /** uniform scale of the whole head group (head-space numbers below are pre-scale) */
  headScale: 1.12,
  tail: [0, 0.5, -0.27] as V3,
  head: {r: [0.176, 0.155, 0.158] as V3},
  /** nose tip, head space */
  nose: [0, 0.0, 0.222] as V3,
  /** mouth centre (between the lips), head space */
  mouth: [0, -0.078, 0.17] as V3,
  earPivot: [0.135, 0.096, 0.012] as V3,
};

/** neck direction (angle of headOff from +Y toward +Z) */
export const NECK_DIR = Math.atan2(SK.headOff[2], SK.headOff[1]);
export const COLLAR = {at: 0.36, R: 0.122, tube: 0.024, tilt: NECK_DIR - Math.PI / 2 + 0.08, tagDrop: 0.03};
/** collar ring centre in neck space (s = neck stretch) */
export const collarCenter = (s: number): V3 => [0, SK.headOff[1] * s * COLLAR.at, SK.headOff[2] * s * COLLAR.at];
/** point on the collar where the tag ring hangs (front-bottom of the collar), neck space */
export const tagRingPoint = (s: number): V3 => {
  const c = collarCenter(s);
  const R = COLLAR.R + COLLAR.tube * 0.7;
  return [0, c[1] - R * Math.cos(COLLAR.tilt), c[2] - R * Math.sin(COLLAR.tilt)];
};

/** distance travelled per walk cycle with planted paws (m / cycle) */
const STRIDE = 0.15;
const STANCE = 0.62;
export const STRIDE_LENGTH = STRIDE / STANCE;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const clamp01 = (x: number) => clamp(x, 0, 1);
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;

export type LegSolve = {hip: number; knee: number; paw: number};
export type EarSolve = {rx: number; rz: number; ry: number; lift: number};
export type PancakeRig = {
  squash: V3;
  hop: number;
  /** body pivot world position & rotation (rx = pitch, rz = roll) */
  body: {pos: V3; rx: number; rz: number; ry: number};
  legs: {fl: LegSolve; fr: LegSolve; rl: LegSolve; rr: LegSolve};
  neck: {rx: number; ry: number; stretch: number};
  head: {rx: number; ry: number; rz: number};
  jaw: number;
  tongue: number;
  ears: {l: EarSolve; r: EarSolve};
  tail: {rx: number; ry: number; rz: number; tipRz: number; tipRx: number};
  eyes: PancakeEyes;
  blink: number;
  blush: number;
  /** 0 neutral, 1 sad puppy (inner brow up) */
  browSad: number;
  /** brow raise in metres */
  browRaise: number;
  frown: number;
  tear: number;
  shadow: {scale: number; opacity: number};
};

/** 2-bone IK in the sagittal (y,z) plane. Target is the ankle relative to the hip. Returns forward angles (rad, + = toward +Z)
 *  of upper and lower bones measured from straight-down. kneeForward: the middle joint sits in front of the hip->ankle line. */
const legIK = (tz: number, ty: number, kneeForward: boolean): [number, number] => {
  const a = SK.upper, b = SK.lower;
  const d = clamp(Math.hypot(tz, ty), Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const phi = Math.atan2(tz, -ty);
  const alpha = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const fu = kneeForward ? phi + alpha : phi - alpha;
  const kz = a * Math.sin(fu), ky = -a * Math.cos(fu);
  // the target may be out of reach (clamped d) -> aim lower bone at the target direction from the knee
  const fl = Math.atan2(tz - kz, -(ty - ky));
  return [fu, fl];
};

/** foot offset along the walk cycle (relative to the hip's rest z), plus lift height */
const footCycle = (p: number) => {
  const q = p - Math.floor(p);
  if (q < STANCE) {
    const u = q / STANCE;
    return {z: STRIDE / 2 - STRIDE * u, lift: 0};
  }
  const u = (q - STANCE) / (1 - STANCE);
  return {z: -STRIDE / 2 + STRIDE * smooth(u), lift: Math.sin(Math.PI * u) * 0.055};
};

/** rotate (y,z) about the x axis by three.js angle rx */
const rotX = (y: number, z: number, rx: number): [number, number] => [
  y * Math.cos(rx) - z * Math.sin(rx),
  y * Math.sin(rx) + z * Math.cos(rx),
];

export const solvePancake = (pose: PancakePose = {}): PancakeRig => {
  const sit = clamp01(pose.sit ?? 0);
  const lie = clamp01(pose.lie ?? 0);
  const eat = clamp01(pose.eat ?? 0) * (1 - lie);
  const still = (1 - sit) * (1 - lie);
  const wAmt = clamp01(pose.walkAmount ?? 0) * still * (1 - eat * 0.8);
  const walk = pose.walk ?? 0;
  const hop = Math.max(0, pose.hop ?? 0);
  const eyes = pose.eyes ?? 'open';
  const eatPh = pose.eatPhase ?? 0;

  // ---- body
  const bob = wAmt * (-0.012 * Math.cos(TAU * 2 * walk) - 0.004);
  const chewBob = eat * Math.sin(TAU * eatPh) * 0.012;
  const bodyDrop = sit * 0.165 + lie * 0.198;
  const pitchUp = sit * 0.6 - eat * 0.13 + lie * 0.02 + wAmt * Math.sin(TAU * 2 * walk + 0.6) * 0.02;
  const bodyRx = -pitchUp;
  const bodyRz = wAmt * Math.sin(TAU * walk) * 0.035;
  const bodyRy = wAmt * Math.sin(TAU * walk) * 0.03;
  const pivot: V3 = [0, SK.pivot[1] - bodyDrop + bob + chewBob * 0.3 + hop, SK.pivot[2] + sit * 0.01];

  // ---- legs (computed in body-parent space; hips transformed by the body pivot)
  const hipWorld = (h: V3): [number, number] => {
    const [ry, rz] = rotX(h[1] - SK.pivot[1], h[2] - SK.pivot[2], bodyRx);
    return [pivot[1] + ry, pivot[2] + rz];
  };
  const toLocal = (fu: number, fl: number, pawF: number): LegSolve => ({
    // rotation.x = -forwardAngle; children are relative to the parent bone
    hip: -fu - bodyRx,
    knee: -(fl - fu),
    paw: -(pawF - fl),
  });
  const footFloorY = SK.pawY + hop * 0.75;
  const solveLeg = (hip: V3, phase: number, front: boolean): LegSolve => {
    const [hy, hz] = hipWorld(hip);
    const fc = footCycle(phase);
    const wz = fc.z * wAmt, lift = fc.lift * wAmt;
    // planted standing target (world)
    let tz = hip[2] + wz, ty = footFloorY + lift;
    if (front) {
      // lying: front legs stretched forward along the floor
      tz += lie * 0.24;
      ty += lie * 0.0;
      // eating: plant the paws a touch further forward so the chest can drop
      tz += eat * 0.03;
    } else {
      // sitting / lying: hind paws tucked forward under the haunch
      tz += sit * 0.16 + lie * 0.17;
      ty += lie * 0.0;
    }
    // hop: tuck the paws a little under the body
    tz += hop * (front ? -0.25 : 0.25);
    const kneeForward = front ? lift > 1e-3 || lie > 0.5 : true;
    const [fu, fl] = legIK(tz - hz, ty - hy, kneeForward);
    // paw stays flat on the floor, tips with the lift
    const pawF = fl * clamp01(lift / 0.03) * 0.55 + (front ? 0 : -hop * 2);
    return toLocal(fu, fl, pawF);
  };
  const ph = walk;
  const legs = {
    fl: solveLeg(SK.frontHip, ph, true),
    fr: solveLeg([-SK.frontHip[0], SK.frontHip[1], SK.frontHip[2]], ph + 0.5, true),
    rl: solveLeg(SK.rearHip, ph + 0.53, false),
    rr: solveLeg([-SK.rearHip[0], SK.rearHip[1], SK.rearHip[2]], ph + 0.03, false),
  };

  // ---- neck & head (world-ish rx, then made relative)
  const yaw = pose.headYaw ?? 0;
  const neckWorld = eat * (1.5 + Math.sin(TAU * eatPh) * 0.06) + lie * 0.95 + wAmt * Math.sin(TAU * 2 * walk - 0.4) * 0.03;
  const neckRx = neckWorld - bodyRx;
  const headWorld = -(pose.headPitch ?? 0) + eat * 1.2 + lie * 0.08 + wAmt * Math.sin(TAU * 2 * walk - 1.2) * -0.025;
  const headRx = headWorld - neckWorld;
  const stretch = 1 + eat * 0.45 + lie * 0.15;

  // ---- mouth
  const chew = eat * (0.5 + 0.5 * Math.sin(TAU * eatPh * 2)) * 0.35;
  const jaw = clamp01(pose.mouthOpen ?? 0) * 0.62 + chew;
  const tongue = clamp01(pose.tongue ?? 0);

  // ---- ears (gravity-ish follow of the head pitch/tilt, flop with walk/chew)
  const perk = clamp(pose.earPerk ?? 0, -1, 1);
  const out = perk < 0 ? 0.38 + perk * 0.26 : 0.38 + perk * 0.5;
  const fwd = perk < 0 ? 0.05 - perk * 0.1 : 0.05 - perk * 0.3;
  const flap = wAmt * Math.sin(TAU * 2 * walk - 1.6) * 0.16 + eat * Math.sin(TAU * eatPh - 0.8) * 0.12 + hop * 2.5;
  const tilt = pose.headTilt ?? 0;
  const gravPitch = headWorld * 0.75;
  const ear = (side: 1 | -1): EarSolve => ({
    rx: fwd - gravPitch,
    rz: side * (out + flap) + tilt * 0.75,
    ry: side * perk * -0.2,
    lift: perk * 0.008,
  });

  // ---- tail
  const wagA = clamp01(pose.tailWagAmount ?? 0);
  const wagP = pose.tailWag ?? 0;
  const tail = {
    rx: sit * 0.85 + lie * 0.5 - 0.05 + (1 - wagA) * 0.05,
    ry: Math.sin(TAU * wagP) * 0.35 * wagA,
    rz: Math.sin(TAU * wagP) * 0.55 * wagA + wAmt * Math.sin(TAU * walk) * 0.08,
    tipRz: Math.sin(TAU * (wagP - 0.16)) * 0.55 * wagA,
    tipRx: lie * 0.3,
  };

  // ---- face
  const blush = pose.blush ?? (eyes === 'happy' ? 1 : eyes === 'puppy' ? 0.6 : 0);
  const browSad = eyes === 'puppy' ? 1 : 0;
  const browRaise = eyes === 'puppy' ? 0.012 : eyes === 'happy' ? 0.016 : eyes === 'closed' ? -0.004 : 0.004 * perk;

  // ---- squash & stretch (volume-ish preserving, from the floor)
  const sq = clamp(pose.bodySquash ?? 0, -1, 1);
  const sy = 1 - sq * 0.18;
  const sxz = 1 / Math.sqrt(sy);

  return {
    squash: [sxz, sy, sxz],
    hop,
    body: {pos: pivot, rx: bodyRx, rz: bodyRz, ry: bodyRy},
    legs,
    neck: {rx: neckRx, ry: yaw * 0.35, stretch},
    head: {rx: headRx, ry: yaw * 0.65, rz: tilt},
    jaw,
    tongue,
    ears: {l: ear(1), r: ear(-1)},
    tail,
    eyes,
    blink: eyes === 'happy' || eyes === 'closed' ? 0 : clamp01(pose.blink ?? 0),
    blush: clamp01(blush),
    browSad,
    browRaise,
    frown: clamp01(pose.frown ?? (eyes === 'puppy' ? 1 : 0)),
    tear: clamp01(pose.tear ?? 0),
    shadow: {scale: (1 - clamp01(hop / 0.4) * 0.5) * (1 + lie * 0.15 + sit * 0.05), opacity: 1 - clamp01(hop / 0.4) * 0.6},
  };
};

// ------------------------------------------------------------------------------------------------------------------
// Forward kinematics for anchors (mirrors the JSX hierarchy in Pancake.tsx exactly)
// ------------------------------------------------------------------------------------------------------------------
const M = () => new THREE.Matrix4();
const T = (v: V3) => M().makeTranslation(v[0], v[1], v[2]);
const R = (x: number, y: number, z: number, order: THREE.EulerOrder = 'XYZ') => M().makeRotationFromEuler(new THREE.Euler(x, y, z, order));

/** matrix of the body content space (standing-rest coordinates inside the body) */
export const bodyMatrix = (rig: PancakeRig) =>
  M()
    .makeScale(...rig.squash)
    .multiply(T(rig.body.pos))
    .multiply(R(rig.body.rx, rig.body.ry, rig.body.rz, 'YXZ'))
    .multiply(T([-SK.pivot[0], -SK.pivot[1], -SK.pivot[2]]));

/** matrix of the head space (head centre, face looking +Z) */
export const headMatrix = (rig: PancakeRig) => {
  const s = rig.neck.stretch;
  return bodyMatrix(rig)
    .multiply(T(SK.neck))
    .multiply(R(rig.neck.rx, rig.neck.ry, 0, 'YXZ'))
    .multiply(T([SK.headOff[0] * s, SK.headOff[1] * s, SK.headOff[2] * s]))
    .multiply(R(rig.head.rx, rig.head.ry, rig.head.rz, 'YXZ'))
    .multiply(M().makeScale(SK.headScale, SK.headScale, SK.headScale));
};

export type PancakeAnchorName = 'nose' | 'mouth' | 'head' | 'headTop' | 'eyeL' | 'eyeR' | 'tag' | 'back' | 'tailBase';

const HEAD_POINTS: Partial<Record<PancakeAnchorName, V3>> = {
  nose: SK.nose,
  mouth: SK.mouth,
  head: [0, 0, 0],
  headTop: [0, SK.head.r[1], 0],
  eyeL: [0.07, 0.02, 0.15],
  eyeR: [-0.07, 0.02, 0.15],
};

/** Pancake-local position of a named point for a given pose (apply your own group transform on top). */
export const pancakeAnchor = (pose: PancakePose, name: PancakeAnchorName): V3 => {
  const rig = solvePancake(pose);
  const v = new THREE.Vector3();
  const hp = HEAD_POINTS[name];
  if (hp) v.set(...hp).applyMatrix4(headMatrix(rig));
  else if (name === 'tag') {
    v.set(...tagRingPoint(rig.neck.stretch)).applyMatrix4(bodyMatrix(rig).multiply(T(SK.neck)).multiply(R(rig.neck.rx, rig.neck.ry, 0, 'YXZ')));
    v.y -= COLLAR.tagDrop;
  } else if (name === 'back') v.set(0, SK.torso.c[1] + SK.torso.r[1], SK.torso.c[2]).applyMatrix4(bodyMatrix(rig));
  else v.set(...SK.tail).applyMatrix4(bodyMatrix(rig));
  return [v.x, v.y, v.z];
};
