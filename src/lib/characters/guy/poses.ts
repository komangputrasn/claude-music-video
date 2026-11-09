/**
 * Guy pose helpers — pure functions returning a GuyPose. Combine them with mergePose / mixPose.
 *
 *   guyIdle(t)            breathing, glances, blinks
 *   guyWalk(t, cadence?)  walk cycle (cadence in strides/s; 0.94 ≈ on the 112 BPM beat). Move the root yourself:
 *                         speed ≈ GUY.strideLength * cadence  (m/s)
 *   guyRun(t, cadence?)   run cycle
 *   guySleepyWake(p)      0 asleep flat in bed -> 0.5 bed tilts him up -> 1 sitting up groggy, rubbing an eye (bed mode)
 *   guyShiver(t)          hugging himself, hunched, teeth chattering
 *   guyHammerSwing(p)     0 wind-up .. 0.5 IMPACT (hammer head ~GUY.hammerImpact) .. 1 follow-through; hammer in rightHand
 *   guyClimb(p)           climbing in through a window (sill ~1.0 m): 0 hands on sill .. 1 through, crouched on the inside
 *   guyCheer(t)           both fists up, hopping on the beat
 *   guyPhoneToEar(t?)     right hand at the ear. The phone lies along the hand: in the grip frame put its long axis on
 *                         Y with the earpiece toward -Y (fingertips, up by the ear) and the screen facing +X (the cheek)
 *   guyHoldUp(p)          0 holding at chest .. 1 thrust overhead triumphantly (object in rightHand)
 *   guyPatDog(t)          crouched, patting a dog's head ~0.6 m in front (Pancake)
 *   guySitOn(seatY)       sit=1 on a seat of ANY height with the feet still flat on the floor (thighs slope down for
 *                         high seats like the 0.52 m bed, up for low ones). Merge it: mergePose(guyPhoneToEar(t), guySitOn(0.52))
 *   guyBlink(t, seed?)    0..1 blink signal for any pose
 *   mergePose(a, b)       deep merge (b wins; arm/leg objects merged field by field)
 *   mixPose(a, b, t)      numeric blend of two poses (expressions cross-fade)
 */
import {noise1, clamp01} from '../../time';
import type {GuyArmPose, GuyLegPose, GuyPose} from './rig';
import {REST_ARM, REST_LEG, DIM} from './rig';

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** 0..1 sub-range of p */
const seg = (p: number, a: number, b: number) => smooth((p - a) / (b - a));

/** Periodic natural blink (0 open .. 1 closed). Deterministic. */
export const guyBlink = (t: number, seed = 0) => {
  const period = 3.4;
  const k = Math.floor((t + seed * 1.3) / period);
  const jitter = (noise1(k * 0.77, 90 + seed) + 1) * 0.9;
  const local = t + seed * 1.3 - k * period - jitter;
  const d = 0.16;
  return local > 0 && local < d ? Math.sin((local / d) * Math.PI) : 0;
};

// ------------------------------------------------------------ combinators
const mergeLimb = <T extends object>(a?: T, b?: T): T | undefined => (a || b ? ({...(a ?? {}), ...(b ?? {})} as T) : undefined);

/** Deep merge: values in `b` override `a`; arm/leg objects merge per field. */
export const mergePose = (a: GuyPose, b: GuyPose): GuyPose => ({
  ...a,
  ...b,
  armL: mergeLimb(a.armL, b.armL),
  armR: mergeLimb(a.armR, b.armR),
  legL: mergeLimb(a.legL, b.legL),
  legR: mergeLimb(a.legR, b.legR),
});

const NUM_KEYS: (keyof GuyPose)[] = [
  'run', 'sit', 'lie', 'bed', 'hipsY', 'hipsZ', 'ground', 'lean', 'torsoBend', 'torsoTwist', 'torsoSide', 'headYaw', 'headPitch',
  'headTilt', 'shrug', 'mouthOpen', 'blink', 'eyesX', 'eyesY', 'shiver',
];
const NUM_DEFAULT: Partial<Record<keyof GuyPose, number>> = {ground: 1};

const mixLimb = <T extends Record<string, number | undefined>>(a: T | undefined, b: T | undefined, rest: Required<T>, t: number): T | undefined => {
  if (!a && !b) return undefined;
  const o: Record<string, number> = {};
  for (const k of Object.keys(rest)) {
    if (rest[k] === undefined) continue;
    o[k] = lerp((a?.[k] ?? rest[k]) as number, (b?.[k] ?? rest[k]) as number, t);
  }
  return o as T;
};

/** legs: like mixLimb, but `ankle` stays automatic (undefined) unless one side sets it */
const mixLeg = (a: GuyLegPose | undefined, b: GuyLegPose | undefined, t: number): GuyLegPose | undefined => {
  const o = mixLimb<GuyLegPose>(a, b, REST_LEG as Required<GuyLegPose>, t);
  if (!o) return o;
  if (a?.ankle === undefined && b?.ankle === undefined) delete o.ankle;
  else o.ankle = lerp(a?.ankle ?? 0, b?.ankle ?? 0, t);
  return o;
};

/** Blend two poses (t=0 -> a, t=1 -> b). Expressions cross-fade; walk phase is taken from whichever pose walks. */
export const mixPose = (a: GuyPose, b: GuyPose, t: number): GuyPose => {
  t = clamp01(t);
  const o: GuyPose = {};
  for (const k of NUM_KEYS) {
    const d = NUM_DEFAULT[k] ?? 0;
    const va = (a[k] as number | undefined) ?? d;
    const vb = (b[k] as number | undefined) ?? d;
    (o as Record<string, number>)[k] = lerp(va, vb, t);
  }
  const wa = a.walk !== undefined ? a.walkAmount ?? 1 : 0;
  const wb = b.walk !== undefined ? b.walkAmount ?? 1 : 0;
  if (a.walk !== undefined || b.walk !== undefined) {
    o.walk = b.walk ?? a.walk;
    o.walkAmount = lerp(wa, wb, t);
  }
  o.armL = mixLimb<GuyArmPose>(a.armL, b.armL, REST_ARM, t);
  o.armR = mixLimb<GuyArmPose>(a.armR, b.armR, REST_ARM, t);
  o.legL = mixLeg(a.legL, b.legL, t);
  o.legR = mixLeg(a.legR, b.legR, t);
  const eff = (x: GuyPose) => ((x.expressionMix ?? 0) > 0.5 ? x.expression2 : x.expression) ?? 'neutral';
  const ea = eff(a);
  const eb = eff(b);
  o.expression = ea;
  o.expression2 = eb;
  o.expressionMix = ea === eb ? 0 : t;
  o.t = b.t ?? a.t;
  return o;
};

/** Piecewise blend through keyframes [[p, pose], ...] (sorted by p) with smoothstep easing per span. */
export const keyPoses = (p: number, keys: [number, GuyPose][]): GuyPose => {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [p0, a] = keys[i];
    const [p1, b] = keys[i + 1];
    if (p <= p1) return mixPose(a, b, smooth((p - p0) / (p1 - p0)));
  }
  return keys[keys.length - 1][1];
};

// ------------------------------------------------------------ poses
export const guyIdle = (t: number, seed = 0): GuyPose => {
  const br = Math.sin(t * TAU * 0.24 + seed);
  return {
    t,
    torsoBend: 0.02 + 0.012 * br,
    lean: 0.004 * br,
    shrug: 0.06 + 0.06 * br,
    headPitch: 0.02 + 0.03 * noise1(t * 0.35, 11 + seed),
    headYaw: 0.16 * noise1(t * 0.28, 12 + seed),
    headTilt: 0.05 * noise1(t * 0.22, 13 + seed),
    torsoTwist: 0.04 * noise1(t * 0.2, 14 + seed),
    eyesX: 0.35 * noise1(t * 0.5, 15 + seed),
    eyesY: 0.1 * noise1(t * 0.4, 16 + seed),
    legL: {hipZ: 0.05, knee: 0.04},
    legR: {hipZ: 0.03, knee: 0.08, hipX: 0.04},
    armL: {shoulderZ: 0.17 + 0.012 * br, elbow: 0.24, shoulderX: 0.05},
    armR: {shoulderZ: 0.17 + 0.012 * br, elbow: 0.2, shoulderX: 0.07},
    blink: guyBlink(t, seed),
    expression: 'neutral',
  };
};

export const guyWalk = (t: number, cadence = 0.94): GuyPose => ({
  t,
  walk: t * cadence,
  walkAmount: 1,
  headPitch: 0.03,
  blink: guyBlink(t),
  expression: 'neutral',
});

export const guyRun = (t: number, cadence = 1.35): GuyPose => ({
  t,
  walk: t * cadence,
  walkAmount: 1,
  run: 1,
  headPitch: -0.05,
  blink: guyBlink(t, 2),
  expression: 'determined',
});

export const guySleepyWake = (p: number): GuyPose => {
  const up = seg(p, 0.15, 0.5); // bed tilts him upright
  const eyes = seg(p, 0.42, 0.56);
  const rub = seg(p, 0.56, 0.64) * (1 - seg(p, 0.76, 0.82));
  const stretch = seg(p, 0.8, 0.88) * (1 - seg(p, 0.95, 1.0));
  const rubWiggle = Math.sin(p * 120) * 0.07 * rub;
  const lap: GuyArmPose = {shoulderX: lerp(0.0, 0.45, up), shoulderZ: lerp(0.2, 0.15, up), shoulderY: lerp(0.2, 0.55, up), elbow: lerp(0.15, 1.0, up), twist: 0.4, grip: 0.3};
  const rubL: GuyArmPose = {shoulderX: 1.11 + rubWiggle, shoulderZ: 0.07, shoulderY: 0.49, elbow: 2.1, twist: -1.06, wrist: 0.04, wristZ: -0.06 + rubWiggle, grip: 0.7};
  const stretchArm: GuyArmPose = {shoulderX: 2.55, shoulderZ: 0.45, shoulderY: 0, elbow: 0.55, twist: -0.4, wrist: 0, wristZ: -0.4, grip: 1};
  const armL = mixLimb<GuyArmPose>(mixLimb<GuyArmPose>(lap, rubL, REST_ARM, rub), stretchArm, REST_ARM, stretch);
  const armR = mixLimb<GuyArmPose>(lap, stretchArm, REST_ARM, stretch);
  return {
    t: p * 10,
    bed: 1,
    lie: 1 - up,
    torsoBend: lerp(0, 0.18, up) - 0.22 * stretch,
    headPitch: lerp(-0.05, 0.35, up) - 0.65 * stretch,
    headTilt: lerp(0, 0.27, up) * (1 - stretch),
    headYaw: 0.08 * up,
    shrug: 0.5 * stretch,
    armR,
    armL,
    legL: {hipZ: 0.06, knee: 0.08},
    legR: {hipZ: 0.03, knee: 0.15},
    expression: 'sleepy',
    expression2: 'shock',
    expressionMix: 0.75 * stretch,
    blink: Math.max(1 - eyes * (1 - 0.6 * rub), stretch * 0.9),
    mouthOpen: 0.06 * (1 - up) + 0.2 * rub,
    eyesY: -0.3 * (1 - stretch),
  };
};

export const guyShiver = (t: number): GuyPose => ({
  t,
  shiver: 1,
  shrug: 1,
  torsoBend: 0.16,
  headPitch: 0.14,
  armR: {shoulderX: 0.13, shoulderZ: -0.25, shoulderY: 1.4, elbow: 1.57, twist: 0.08, wrist: -0.06, wristZ: -0.11, grip: 0.75, swing: 0},
  armL: {shoulderX: 0.22, shoulderZ: -0.25, shoulderY: 1.37, elbow: 1.43, twist: -0.02, wrist: -0.05, wristZ: -0.09, grip: 0.75, swing: 0},
  legL: {hipZ: -0.01, knee: 0.18, hipX: 0.1},
  legR: {hipZ: -0.01, knee: 0.1, hipX: 0.05},
  expression: 'cold',
  blink: guyBlink(t, 3),
});

const HAMMER_KEYS: [number, GuyPose][] = [
  [0, {
    torsoBend: -0.12, torsoTwist: 0.32, lean: -0.04, headPitch: 0.3, headYaw: -0.15,
    armR: {shoulderX: 2.43, shoulderZ: 0.11, shoulderY: -0.18, elbow: 1.52, twist: 0.45, wrist: -0.6, wristZ: 0.35, grip: 1},
    armL: {shoulderX: 0.85, shoulderZ: 0.35, shoulderY: 0.3, elbow: 0.7, twist: 0.3, grip: 0.6},
    legL: {hipX: 0.3, hipZ: 0.12, knee: 0.3}, legR: {hipX: -0.12, hipZ: 0.12, knee: 0.18},
    expression: 'determined',
  }],
  [0.3, {
    torsoBend: 0.05, torsoTwist: 0.2, lean: 0, headPitch: 0.35, headYaw: -0.1,
    armR: {shoulderX: 3.05, shoulderZ: 0.09, shoulderY: -0.07, elbow: 0.25, twist: 0.39, wrist: -0.6, wristZ: -0.31, grip: 1},
    armL: {shoulderX: 0.7, shoulderZ: 0.35, shoulderY: 0.3, elbow: 0.5, twist: 0.3, grip: 0.6},
    legL: {hipX: 0.35, hipZ: 0.12, knee: 0.35}, legR: {hipX: -0.08, hipZ: 0.12, knee: 0.25},
    expression: 'yell', mouthOpen: 0.3,
  }],
  [0.5, {
    torsoBend: 0.62, torsoTwist: -0.15, lean: 0.14, headPitch: 0.3, headYaw: -0.12,
    armR: {shoulderX: 0.95, shoulderZ: -0.19, shoulderY: 0.02, elbow: 0.04, twist: 0.06, wrist: -0.6, wristZ: -0.17, grip: 1},
    armL: {shoulderX: 0.25, shoulderZ: 0.5, shoulderY: 0.2, elbow: 0.6, twist: 0.3, grip: 0.7},
    legL: {hipX: 0.78, hipZ: 0.14, knee: 1.0}, legR: {hipX: 0.15, hipZ: 0.14, knee: 0.7},
    expression: 'yell', mouthOpen: 1,
  }],
  [1, {
    torsoBend: 0.48, torsoTwist: -0.22, lean: 0.08, headPitch: 0.3, headYaw: -0.1,
    armR: {shoulderX: 0.8, shoulderZ: -0.14, shoulderY: -0.56, elbow: 0.06, twist: 0.67, wrist: -0.6, wristZ: -0.25, grip: 1},
    armL: {shoulderX: 0.3, shoulderZ: 0.4, shoulderY: 0.2, elbow: 0.55, twist: 0.3, grip: 0.5},
    legL: {hipX: 0.6, hipZ: 0.14, knee: 0.8}, legR: {hipX: 0.1, hipZ: 0.14, knee: 0.55},
    expression: 'determined',
  }],
];
/** 0 wind-up .. 0.5 impact .. 1 follow-through. Hold the hammer in rightHand (handle along grip +Z, head at +Z end). */
export const guyHammerSwing = (p: number): GuyPose => {
  // accelerate into the impact: remap 0.32..0.5 with ease-in
  let q = clamp01(p);
  if (q > 0.3 && q < 0.5) {
    const u = (q - 0.3) / 0.2;
    q = 0.3 + 0.2 * (u * u * 0.65 + u * 0.35);
  }
  return {...keyPoses(q, HAMMER_KEYS), t: p};
};

const SILL_ARM: GuyArmPose = {shoulderX: 0.17, shoulderZ: 0.46, shoulderY: 0.33, elbow: 1.7, twist: 1.13, wrist: -0.34, wristZ: -0.01, grip: 0.15};
const CLIMB_KEYS: [number, GuyPose][] = [
  [0, {ground: 1, torsoBend: 0.15, headPitch: -0.15, armL: SILL_ARM, armR: SILL_ARM, expression: 'determined'}],
  [0.3, {
    ground: 0, hipsY: 0.15, hipsZ: 0.05, torsoBend: 0.6, headPitch: -0.25,
    armL: {shoulderX: -0.11, shoulderZ: 0.45, shoulderY: 0.18, elbow: 1.79, twist: 1.17, wrist: -0.25, wristZ: -0.57, grip: 0.15},
    armR: {shoulderX: -0.11, shoulderZ: 0.45, shoulderY: 0.18, elbow: 1.79, twist: 1.17, wrist: -0.25, wristZ: -0.57, grip: 0.15},
    legR: {hipX: 1.89, hipZ: 0.12, knee: 2.2}, legL: {hipX: -0.05, hipZ: 0.05, knee: 0.35, ankle: 0.7},
    expression: 'determined',
  }],
  [0.6, {
    ground: 0, hipsY: 0.27, hipsZ: 0.38, torsoBend: 1.0, lean: 0.15, headPitch: -0.5,
    armL: {shoulderX: 1.23, shoulderZ: 0.49, shoulderY: 0.97, elbow: 0.91, twist: 0.58, wrist: -0.28, wristZ: -0.97, grip: 0.15},
    armR: {shoulderX: 1.23, shoulderZ: 0.49, shoulderY: 0.97, elbow: 0.91, twist: 0.58, wrist: -0.28, wristZ: -0.97, grip: 0.15},
    legR: {hipX: 0.5, hipZ: 0.22, knee: 0.7}, legL: {hipX: -1.0, hipZ: 0.1, knee: 1.15, ankle: 0.5},
    expression: 'shock',
  }],
  [1, {
    ground: 1, hipsZ: 0.9, torsoBend: 0.45, lean: 0.1, headPitch: -0.3,
    armL: {shoulderX: 0.75, shoulderZ: 0.35, shoulderY: 0.3, elbow: 0.7, twist: 0.6, grip: 0.4},
    armR: {shoulderX: 0.75, shoulderZ: 0.35, shoulderY: 0.3, elbow: 0.7, twist: 0.6, grip: 0.4},
    legR: {hipX: 1.0, hipZ: 0.16, knee: 1.7}, legL: {hipX: 0.35, hipZ: 0.16, knee: 1.35},
    expression: 'shock',
  }],
];
/** Climb in through a window. Keep the root FIXED on the outside floor, facing the wall: the sill top is expected at
 *  y≈1.0, its outer face at z≈0.25 and inner face z≈0.45 (Guy-local). 0 hands on the sill, 0.3 knee up on the sill,
 *  0.6 sitting on the sill ducking through, 1 crouched on the inside floor at z≈0.9 (hipsZ moves him). */
export const guyClimb = (p: number): GuyPose => ({...keyPoses(clamp01(p), CLIMB_KEYS), t: p * 4});

export const guyCheer = (t: number, bpm = 112.3): GuyPose => {
  const beat = (t * bpm) / 60;
  const ph = beat * TAU * 0.5; // hop every 2 beats
  const hop = Math.max(0, Math.sin(ph));
  const land = Math.max(0, -Math.sin(ph));
  const pump = Math.sin(beat * TAU * 0.5);
  return {
    t,
    hipsY: 0.09 * Math.pow(hop, 1.5),
    ground: 1,
    torsoBend: -0.12 + 0.08 * land,
    headPitch: -0.28 + 0.08 * land,
    headTilt: 0.1 * Math.sin(beat * Math.PI * 0.5),
    armL: {shoulderX: 0.35 + 0.15 * pump, shoulderZ: 2.45 + 0.12 * pump, shoulderY: 0.1, elbow: 0.35 + 0.25 * land, wrist: 0.2, grip: 1},
    armR: {shoulderX: 0.35 - 0.15 * pump, shoulderZ: 2.45 - 0.12 * pump, shoulderY: 0.1, elbow: 0.35 + 0.25 * land, wrist: 0.2, grip: 1},
    legL: {hipX: 0.15 * land + 0.05 * hop, hipZ: 0.12, knee: 0.45 * land + 0.25 * hop, ankle: hop * 0.5},
    legR: {hipX: 0.15 * land + 0.05 * hop, hipZ: 0.12, knee: 0.45 * land + 0.25 * hop, ankle: hop * 0.5},
    expression: 'happy',
    mouthOpen: 0.4 + 0.4 * hop,
    blink: 0,
  };
};

export const guyPhoneToEar = (t = 0): GuyPose => ({
  t,
  headTilt: -0.14,
  headPitch: 0.04,
  armR: {shoulderX: 0.89, shoulderZ: 0.26, shoulderY: 0.1, elbow: 2.6, twist: 0.12, wrist: 0.32, wristZ: -0.27, grip: 0.55, swing: 0},
  armL: {shoulderX: 0.1, shoulderZ: 0.18, shoulderY: 0.2, elbow: 0.35},
  expression: 'neutral',
  blink: guyBlink(t, 4),
});

export const guyHoldUp = (p: number, t = 0): GuyPose => {
  const u = smooth(p);
  const chestR: GuyArmPose = {shoulderX: 0.26, shoulderZ: 0.26, shoulderY: 0.45, elbow: 1.71, twist: -0.46, wrist: 0.17, wristZ: 0.55, grip: 1, swing: 0};
  const upR: GuyArmPose = {shoulderX: 2.67, shoulderZ: 0.3, shoulderY: -0.48, elbow: 0.18, twist: -0.49, wrist: 0.02, wristZ: 0.07, grip: 1, swing: 0};
  const restL: GuyArmPose = {shoulderX: 0.1, shoulderZ: 0.2, shoulderY: 0.2, elbow: 0.3, twist: 0.25, grip: 0.4, swing: 1};
  const hipL: GuyArmPose = {shoulderX: -0.22, shoulderZ: 0.98, shoulderY: 1.19, elbow: 1.86, twist: -0.72, wrist: -0.6, wristZ: -0.33, grip: 0.9, swing: 0};
  return {
    t,
    torsoBend: lerp(0.05, -0.12, u),
    headPitch: lerp(0.15, -0.35, u),
    headTilt: 0.08 * u,
    armR: mixLimb<GuyArmPose>(chestR, upR, REST_ARM, u),
    armL: mixLimb<GuyArmPose>(restL, hipL, REST_ARM, u),
    legL: {hipZ: 0.1, knee: 0.04},
    legR: {hipZ: 0.1, knee: 0.04},
    expression: 'determined',
    expression2: 'happy',
    expressionMix: seg(p, 0.4, 0.8),
    mouthOpen: 0.2 * u,
    blink: guyBlink(t, 5),
  };
};

export const guyPatDog = (t: number): GuyPose => {
  const pat = 0.5 + 0.5 * Math.sin(t * TAU * 1.7);
  const lift = pat * pat;
  return {
    t,
    torsoBend: 0.45,
    lean: 0.1,
    headPitch: 0.45,
    headTilt: 0.14,
    armR: {shoulderX: 1.01 + 0.1 * lift, shoulderZ: -0.17, shoulderY: 0.15, elbow: 0.12 + 0.12 * lift, twist: 1.46, wrist: -0.15, wristZ: -0.9 - 0.35 * lift, grip: 0.05},
    armL: {shoulderX: 0.35, shoulderZ: 0.2, shoulderY: 0.7, elbow: 1.2, twist: 0.4, grip: 0.4},
    legL: {hipX: 0.55, hipZ: 0.16, knee: 0.8},
    legR: {hipX: 0.3, hipZ: 0.16, knee: 0.7},
    expression: 'happy',
    mouthOpen: 0,
    blink: guyBlink(t, 6),
  };
};

/** seat-surface height his thighs rest on with sit=1 and default legs (= GUY.seatHeight) */
const SEAT_H = DIM.shin + DIM.ankleH - 0.095;
/**
 * Sit on a seat whose top is `seatY` metres above the Guy's origin (floor), feet still on the floor. The thighs tilt so
 * the hip solver lifts the hips onto the seat: e.g. the bedroom bed (mattress 0.52 m), a porch edge, a car seat (use
 * the seat's height above the floor the feet rest on). Keep the group's y at the FLOOR. Range ≈ 0.2..0.65 m.
 */
export const guySitOn = (seatY: number): GuyPose => {
  const a = Math.asin(Math.max(-0.9, Math.min(0.9, (seatY - SEAT_H) / DIM.thigh)));
  return {sit: 1, legL: {hipX: -a, knee: REST_LEG.knee - a}, legR: {hipX: -a, knee: REST_LEG.knee - a}};
};
