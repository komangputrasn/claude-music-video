/**
 * Guy rig: pose types, body dimensions, and the pure pose -> joint-transform solver used by <Guy>.
 *
 * Everything here is a pure function of the GuyPose (no clocks). `resolveGuy(pose)` returns the local transform of
 * every joint group; <Guy> renders those, and `guyPoint(pose, joint)` runs the same transforms as forward kinematics
 * so scene code can ask "where is his right hand / head / eye line in this pose?" without rendering.
 *
 * Conventions (character faces +Z, his LEFT is +X, y=0 is the floor, metres, radians):
 *   arm  shoulderX  + = raise forward (flexion; PI/2 = pointing ahead, PI = straight up)
 *        shoulderZ  + = raise out to the side (abduction; PI/2 = T-pose)
 *        shoulderY  + = rotate arm inward (bent forearm swings toward the belly)
 *        elbow      + = bend (forearm toward biceps), 0..2.6
 *        twist      forearm roll, + = pronation (hanging arm: palm turns from the thigh to face backward), -1.4..1.5
 *        wrist      thumb-side tilt (hammer "cock"), + = thumb side up/forward, - = pinky side; keep within ±0.6
 *        wristZ     flexion, + = hand bends toward the palm, - = back of hand; ±1
 *        grip       0 = open flat hand .. 1 = fist (auto 1 when a prop is held)
 *        swing      0..1 how much of the walk/run arm swing is added (default 1; 0 for an arm holding a phone up)
 *   leg  hipX       + = thigh forward (flexion; PI/2 = thigh horizontal)
 *        hipZ       + = leg out to the side
 *        hipY       + = toes turn out
 *        knee       + = bend (shin goes back)
 *        ankle      + = toes point down (auto-flattens feet on the floor when omitted)
 *        swing      0..1 how much of the walk/run leg cycle is added (default 1)
 * The walk cycle is ADDED on top of the limb values, so posed limbs (and mixPose blends) keep walking.
 */
import * as THREE from 'three';
import {noise1} from '../../time';

export type GuyExpression = 'neutral' | 'sleepy' | 'shock' | 'angry' | 'sad' | 'happy' | 'determined' | 'yell' | 'cold';

export type GuyArmPose = {
  shoulderX?: number; shoulderZ?: number; shoulderY?: number; elbow?: number; twist?: number; wrist?: number; wristZ?: number; grip?: number;
  swing?: number;
};
export type GuyLegPose = {hipX?: number; hipZ?: number; hipY?: number; knee?: number; ankle?: number; swing?: number};

export type GuyPose = {
  /** Walk-cycle phase in CYCLES (1 = one full stride = two steps). Drive with time, e.g. t * 0.94. */
  walk?: number;
  /** 0..1 how much of the walk cycle is applied (default 1 when `walk` is set). */
  walkAmount?: number;
  /** 0..1 blends the walk cycle into a run (bigger strides, pumping arms, forward lean, flight phase). */
  run?: number;
  /** 0..1 sitting on a seat (surface at GUY.seatHeight, hip joint stays above the origin, feet ~0.45 m ahead). */
  sit?: number;
  /** 0..1 tip the whole body onto his back (head toward -Z, face up); hips rest on a surface at the origin height. */
  lie?: number;
  /** 0..1 "in bed" mode: hips pinned on the mattress at the origin, legs kept flat along +Z. lie=1 flat, lie=0 sitting up. */
  bed?: number;
  /** Extra hip height offset in metres (after automatic foot-on-floor solving). Positive = jump / higher seat. */
  hipsY?: number;
  /** Forward (+Z) offset of the whole body from the origin in metres (climbing over things, lunges). */
  hipsZ?: number;
  /** 0..1 auto-solve hip height so the lowest foot touches y=0 (default 1). Set 0 for hanging / climbing. */
  ground?: number;
  /** Whole upper body + pelvis forward tilt (legs compensate so feet stay put). */
  lean?: number;
  /** Bend at the waist/chest, + = forward. */
  torsoBend?: number;
  /** Chest yaw, + = chest turns to his left. */
  torsoTwist?: number;
  /** Chest side bend, + = toward his left. */
  torsoSide?: number;
  /** Head yaw, + = looks to his left (screen right when he faces camera). */
  headYaw?: number;
  /** Head pitch, + = looks down (chin to chest). */
  headPitch?: number;
  /** Head roll, + = top of head tilts to his left. */
  headTilt?: number;
  /** 0..1 shoulders hunched up (cold, scared, shrug). */
  shrug?: number;
  /** Limb angles (see conventions above). Missing fields use REST_ARM / REST_LEG; the walk cycle adds on top. */
  armL?: GuyArmPose;
  armR?: GuyArmPose;
  /** Leg angles are relative to the base posture (standing / sitting / in bed). */
  legL?: GuyLegPose;
  legR?: GuyLegPose;
  expression?: GuyExpression;
  /** optional second expression to cross-fade to with expressionMix 0..1 (smooth brow/mouth transitions) */
  expression2?: GuyExpression;
  expressionMix?: number;
  /** 0..1 extra mouth opening (lip sync / yawns), added on top of the expression's mouth. */
  mouthOpen?: number;
  /** 0..1 eyelids closed. */
  blink?: number;
  /** pupils: -1..1, + = look to his left / up. */
  eyesX?: number;
  eyesY?: number;
  /** 0..1 shivering (needs `t` to animate). */
  shiver?: number;
  /** time in seconds — only used for procedural jitter (shiver). Pose helpers set it. */
  t?: number;
};

// ---------------------------------------------------------------- dimensions (metres)
export const DIM = {
  hipH: 0.85, // hip joint height when standing straight (= thigh + shin + ankleH)
  hipX: 0.108, // hip joint lateral offset
  thigh: 0.385,
  shin: 0.375,
  ankleH: 0.09, // ankle pivot above the sole
  spineY: 0.05, // spine pivot above hip joint
  neckY: 0.478, // neck pivot above spine pivot
  headY: 0.153, // head centre above neck pivot
  headR: 0.156,
  shoulderX: 0.222,
  shoulderY: 0.4, // shoulder joint above spine pivot
  upperArm: 0.27,
  forearm: 0.25,
  lieH: 0.14, // hip-joint height above the surface when lying on his back / sitting in bed
  heel: -0.085, // sole extents along the foot (z, ankle-relative)
  toe: 0.205,
} as const;

const TAU = Math.PI * 2;
const c01 = (x: number | undefined) => Math.max(0, Math.min(1, x ?? 0));
const pos = (x: number) => (x > 0 ? x : 0);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const REST_ARM: Required<GuyArmPose> = {shoulderX: 0.06, shoulderZ: 0.17, shoulderY: 0.15, elbow: 0.22, twist: 0.25, wrist: 0, wristZ: 0.1, grip: 0.35, swing: 1};
export const REST_LEG: Required<Omit<GuyLegPose, 'ankle'>> = {hipX: 0, hipZ: 0.035, hipY: 0, knee: 0.03, swing: 1};

// ---------------------------------------------------------------- transforms
export type Xf = {p: [number, number, number]; r: [number, number, number, THREE.EulerOrder]};
export type ArmXf = {shoulder: Xf; elbow: Xf; wrist: Xf; fingers: Xf; thumb: Xf; grip: Xf; gripAmount: number};
export type LegXf = {hip: Xf; knee: Xf; ankle: Xf};
export type FaceState = {
  expression: GuyExpression;
  expression2: GuyExpression;
  mix: number;
  mouthOpen: number;
  blink: number;
  eyesX: number;
  eyesY: number;
};
export type GuyRig = {
  hips: Xf;
  spine: Xf;
  neck: Xf;
  head: Xf;
  armL: ArmXf;
  armR: ArmXf;
  legL: LegXf;
  legR: LegXf;
  face: FaceState;
};

const xf = (p: [number, number, number], r: [number, number, number] = [0, 0, 0], o: THREE.EulerOrder = 'XYZ'): Xf => ({p, r: [r[0], r[1], r[2], o]});

/** Lowest sole point (y, relative to the hip joint) for a leg with world thigh pitch b1. */
const soleLow = (b1: number, knee: number, ankle: number, hipZ: number) => {
  const cz = Math.cos(hipZ);
  const b2 = b1 + knee;
  const b3 = b2 + ankle;
  let y = -DIM.thigh * Math.cos(b1) * cz - DIM.shin * Math.cos(b2) * cz;
  let low = Infinity;
  for (const pz of [DIM.heel, DIM.toe]) {
    const py = -DIM.ankleH;
    low = Math.min(low, y + (py * Math.cos(b3) - pz * Math.sin(b3)));
  }
  return low;
};

/** Solve every joint transform for a pose. Pure. */
export const resolveGuy = (pose: GuyPose = {}, holding: {L?: boolean; R?: boolean} = {}): GuyRig => {
  const t = pose.t ?? 0;
  const sit = c01(pose.sit);
  const lie = c01(pose.lie);
  const bed = c01(pose.bed);
  const flat = Math.max(lie, bed);
  const standW = 1 - flat;
  const amt = pose.walk !== undefined ? c01(pose.walkAmount ?? 1) * standW * (1 - sit) : 0;
  const run = c01(pose.run);
  const ph = (pose.walk ?? 0) * TAU;
  const shiver = c01(pose.shiver);
  const jit = (seed: number, amp: number) => (shiver ? shiver * amp * noise1(t * 22 + seed * 3.7, 40 + seed) : 0);

  const lean = (pose.lean ?? 0) + amt * lerp(0.03, 0.2, run);
  const pelvisPitch = lean * standW - lie * (Math.PI / 2);
  const pelvisYaw = -amt * lerp(0.1, 0.16, run) * Math.sin(ph);
  const pelvisRoll = amt * 0.035 * Math.sin(2 * ph + 0.4) * (1 - run);

  // ---- legs
  const leg = (s: 1 | -1, given: GuyLegPose | undefined) => {
    const g = given ?? {};
    let hipX = g.hipX ?? REST_LEG.hipX;
    let knee = g.knee ?? REST_LEG.knee;
    const hipZ = g.hipZ ?? REST_LEG.hipZ;
    const hipY = g.hipY ?? REST_LEG.hipY;
    let footT = 0;
    const w = amt * c01(g.swing ?? 1);
    if (w > 0) {
      const p = ph + (s === 1 ? 0 : Math.PI);
      hipX += w * (lerp(0.36, 0.58, run) * Math.sin(p) + run * 0.12);
      knee += w * (lerp(0.9, 1.75, run) * Math.pow(pos(Math.cos(p + 0.5)), 1.5) + 0.1 * pos(Math.sin(p - 0.3)));
      // heel lifts at toe-off, toes lift at heel strike
      footT += w * (lerp(0.55, 0.8, run) * Math.pow(pos(Math.cos(p + 1.2)), 3) - 0.28 * Math.pow(pos(Math.cos(p - 1.35)), 4));
    }
    hipX += sit * (Math.PI / 2) + bed * (1 - lie) * (Math.PI / 2) + lean * standW;
    knee += sit * (Math.PI / 2);
    const b1 = pelvisPitch - hipX;
    const b2 = b1 + knee;
    const flatAnkle = Math.max(-0.75, Math.min(1.1, -b2 + footT));
    const ankle = g.ankle !== undefined ? g.ankle + footT : lerp(flatAnkle, 0.3, flat);
    return {hipX, hipZ, hipY, knee, ankle, low: soleLow(b1, knee, ankle, hipZ)};
  };
  const L = leg(1, pose.legL);
  const R = leg(-1, pose.legR);

  const ground = c01(pose.ground ?? 1);
  const groundH = -Math.min(L.low, R.low);
  let hipsH = lerp(DIM.hipH, groundH, ground);
  hipsH = lerp(hipsH, DIM.lieH, flat);
  hipsH += (pose.hipsY ?? 0) + amt * run * 0.06 * pos(-Math.cos(2 * ph)) + jit(1, 0.004);

  const legXf = (s: 1 | -1, l: typeof L): LegXf => ({
    hip: xf([s * DIM.hipX, 0, 0], [-l.hipX, s * (0.07 + l.hipY), s * l.hipZ], 'XZY'),
    knee: xf([0, -DIM.thigh, 0], [l.knee, 0, 0]),
    ankle: xf([0, -DIM.shin, 0], [l.ankle, 0, 0]),
  });

  // ---- torso
  const chestYawWalk = amt * lerp(0.22, 0.3, run) * Math.sin(ph);
  const spineX = (pose.torsoBend ?? 0) + amt * lerp(0.02, 0.08, run) + jit(2, 0.02);
  const spineY = (pose.torsoTwist ?? 0) + chestYawWalk + jit(3, 0.035);
  const spineZ = (pose.torsoSide ?? 0) - pelvisRoll * 0.8 + jit(4, 0.02);

  // ---- arms
  const shrug = c01(pose.shrug) + shiver * 0.15;
  const arm = (s: 1 | -1, given: GuyArmPose | undefined, holds: boolean): ArmXf => {
    const g = given ?? {};
    let sx = g.shoulderX ?? REST_ARM.shoulderX;
    let sz = g.shoulderZ ?? REST_ARM.shoulderZ;
    const sy = g.shoulderY ?? REST_ARM.shoulderY;
    let el = g.elbow ?? REST_ARM.elbow;
    const wr = g.wrist ?? REST_ARM.wrist;
    const tw = g.twist ?? REST_ARM.twist;
    const wz = g.wristZ ?? REST_ARM.wristZ;
    const grip = c01(g.grip ?? (holds ? 1 : REST_ARM.grip));
    const w = amt * c01(g.swing ?? 1);
    if (w > 0) {
      const p = ph + (s === 1 ? 0 : Math.PI);
      sx += w * (-lerp(0.36, 0.8, run) * Math.sin(p) + run * 0.15);
      el += w * (lerp(0.12, 1.25, run) + lerp(0.28, 0.35, run) * pos(-Math.sin(p)));
      sz += w * lerp(0.02, 0.1, run);
    }
    sx += jit(10 + s, 0.05);
    sz += shrug * 0.08;
    return {
      shoulder: xf([s * (DIM.shoulderX - shrug * 0.01), DIM.shoulderY + shrug * 0.04, 0], [-sx, -s * sy, s * sz], 'XZY'),
      elbow: xf([0, -DIM.upperArm, 0], [-el, 0, 0]),
      wrist: xf([0, -DIM.forearm, 0], [-wr, -s * tw, -s * wz], 'YXZ'),
      fingers: xf([0, -0.082, 0.004], [0, 0, -s * grip * 1.95]),
      thumb: xf([-s * 0.012, -0.03, 0.036], [-(0.45 + grip * 0.35), 0, -s * (0.2 + grip * 0.55)]),
      grip: xf([-s * 0.03, -0.083, 0.004]),
      gripAmount: grip,
    };
  };

  // ---- head (neck takes ~35%, the rest goes to the head)
  const chestYawNet = chestYawWalk + pelvisYaw;
  const hp = (pose.headPitch ?? 0) + jit(5, 0.03);
  const hy = (pose.headYaw ?? 0) - chestYawNet * 0.9 + jit(6, 0.03);
  const ht = (pose.headTilt ?? 0) + jit(7, 0.05);

  const chatter = shiver ? shiver * 0.18 * (0.5 + 0.5 * Math.sin(t * 46)) : 0;
  return {
    hips: xf([0, hipsH, pose.hipsZ ?? 0], [pelvisPitch, pelvisYaw, pelvisRoll], 'YXZ'),
    spine: xf([0, DIM.spineY, 0], [spineX, spineY, spineZ], 'YXZ'),
    neck: xf([0, DIM.neckY, 0], [hp * 0.35, hy * 0.35, -ht * 0.35], 'YXZ'),
    head: xf([0, DIM.headY, 0], [hp * 0.65, hy * 0.65, -ht * 0.65], 'YXZ'),
    armL: arm(1, pose.armL, !!holding.L),
    armR: arm(-1, pose.armR, !!holding.R),
    legL: legXf(1, L),
    legR: legXf(-1, R),
    face: {
      expression: pose.expression ?? 'neutral',
      expression2: pose.expression2 ?? pose.expression ?? 'neutral',
      mix: c01(pose.expressionMix),
      mouthOpen: Math.min(1, c01(pose.mouthOpen) + chatter),
      blink: c01(pose.blink),
      eyesX: Math.max(-1, Math.min(1, pose.eyesX ?? 0)),
      eyesY: Math.max(-1, Math.min(1, pose.eyesY ?? 0)),
    },
  };
};

// ---------------------------------------------------------------- forward kinematics
export type GuyJoint =
  | 'hips' | 'chest' | 'neck' | 'head' | 'eyes' | 'nose' | 'mouth'
  | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR' | 'wristL' | 'wristR' | 'gripL' | 'gripR'
  | 'kneeL' | 'kneeR' | 'ankleL' | 'ankleR';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _one = new THREE.Vector3(1, 1, 1);
const _v = new THREE.Vector3();
const toMat = (x: Xf, out: THREE.Matrix4) => {
  _e.set(x.r[0], x.r[1], x.r[2], x.r[3]);
  _q.setFromEuler(_e);
  return out.compose(_v.set(x.p[0], x.p[1], x.p[2]), _q, _one);
};

/** Matrix (Guy-local space, before the group's own position/rotation/scale) of a joint for a pose. */
export const guyJointMatrix = (pose: GuyPose, joint: GuyJoint, holding: {L?: boolean; R?: boolean} = {}): THREE.Matrix4 => {
  const r = resolveGuy(pose, holding);
  const chain: Xf[] = [r.hips];
  const torso = () => chain.push(r.spine);
  const headChain = () => {
    torso();
    chain.push(r.neck, r.head);
  };
  const armChain = (a: ArmXf, depth: number) => {
    torso();
    chain.push(a.shoulder);
    if (depth > 0) chain.push(a.elbow);
    if (depth > 1) chain.push(a.wrist);
    if (depth > 2) chain.push(a.grip);
  };
  const legChain = (l: LegXf, depth: number) => {
    chain.push(l.hip, l.knee);
    if (depth > 0) chain.push(l.ankle);
  };
  switch (joint) {
    case 'hips': break;
    case 'chest': torso(); chain.push(xf([0, 0.3, 0])); break;
    case 'neck': torso(); chain.push(r.neck); break;
    case 'head': headChain(); break;
    case 'eyes': headChain(); chain.push(xf([0, 0, DIM.headR * 0.9])); break;
    case 'nose': headChain(); chain.push(xf([0, -0.027, DIM.headR * 1.07])); break;
    case 'mouth': headChain(); chain.push(xf([0, -0.068, DIM.headR * 0.93])); break;
    case 'shoulderL': armChain(r.armL, 0); break;
    case 'shoulderR': armChain(r.armR, 0); break;
    case 'elbowL': armChain(r.armL, 1); break;
    case 'elbowR': armChain(r.armR, 1); break;
    case 'wristL': armChain(r.armL, 2); break;
    case 'wristR': armChain(r.armR, 2); break;
    case 'gripL': armChain(r.armL, 3); break;
    case 'gripR': armChain(r.armR, 3); break;
    case 'kneeL': legChain(r.legL, 0); break;
    case 'kneeR': legChain(r.legR, 0); break;
    case 'ankleL': legChain(r.legL, 1); break;
    case 'ankleR': legChain(r.legR, 1); break;
  }
  const out = new THREE.Matrix4();
  for (const x of chain) out.multiply(toMat(x, _m));
  return out;
};

/** World-ish position of a joint in Guy-local space (apply your group's transform on top). */
export const guyPoint = (pose: GuyPose, joint: GuyJoint, holding: {L?: boolean; R?: boolean} = {}): [number, number, number] => {
  const p = new THREE.Vector3().setFromMatrixPosition(guyJointMatrix(pose, joint, holding));
  return [p.x, p.y, p.z];
};
