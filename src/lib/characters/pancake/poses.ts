/**
 * Pancake pose helpers — pure functions of time (seconds) returning a {@link PancakePose}. Spread and override freely:
 *
 *   const pose = {...pancakeBeg(t), headYaw: 0.3};
 *   const blended = mixPose(pancakeIdle(t), pancakeHappy(t), ramp(f, 40, 52));
 *
 * All deterministic (seeded noise from lib/time), no clocks.
 */
import {noise1, rand} from '../../time';
import type {PancakePose, PancakeEyes} from './rig';
import {STRIDE_LENGTH} from './rig';

const TAU = Math.PI * 2;

/** Natural blink track 0..1 (quick close, slightly slower open) every ~2.4–4 s. `seed` de-syncs multiple dogs. */
export const pancakeBlink = (t: number, seed = 0, every = 3.2) => {
  const k = Math.floor(t / every);
  let best = 0;
  for (const j of [k - 1, k]) {
    const start = j * every + rand(`pk-blink-${seed}-${j}`) * every * 0.6;
    const u = t - start;
    if (u >= 0 && u < 0.22) best = Math.max(best, u < 0.07 ? u / 0.07 : 1 - (u - 0.07) / 0.15);
  }
  return Math.max(0, Math.min(1, best));
};

/** Standing idle: breathing, small looks around, relaxed ears, lazy wag. */
export const pancakeIdle = (t: number, seed = 0): PancakePose => ({
  bodySquash: Math.sin(t * TAU * 0.45) * 0.035,
  headYaw: noise1(t * 0.35, 11 + seed) * 0.28,
  headPitch: noise1(t * 0.3, 13 + seed) * 0.08 + 0.03,
  headTilt: noise1(t * 0.28, 12 + seed) * 0.14,
  earPerk: 0.1 + noise1(t * 0.6, 14 + seed) * 0.18,
  tailWag: t * 1.1,
  tailWagAmount: 0.28,
  blink: pancakeBlink(t, seed),
});

/** Happy trot. `speed` m/s along the dog's +Z: move the dog by speed*t to keep paws planted. */
export const pancakeWalk = (t: number, speed = 0.45, seed = 0): PancakePose => ({
  walk: (t * speed) / STRIDE_LENGTH,
  walkAmount: 1,
  tailWag: t * 2.4,
  tailWagAmount: 0.55,
  earPerk: 0.3,
  mouthOpen: 0.32 + Math.sin(t * TAU * 2.2) * 0.06,
  tongue: 0.5,
  headPitch: 0.06,
  headYaw: noise1(t * 0.4, 21 + seed) * 0.12,
  blink: pancakeBlink(t, seed),
});

/** Sitting, begging, looking UP with huge wet puppy eyes, ears down, a hopeful little wag. "Hungry and lonely." */
export const pancakeBeg = (t: number, seed = 0): PancakePose => ({
  sit: 1,
  eyes: 'puppy',
  earPerk: -0.8,
  headPitch: 0.34 + Math.sin(t * TAU * 0.3) * 0.03,
  headTilt: Math.sin(t * TAU * 0.22 + seed) * 0.2,
  headYaw: noise1(t * 0.25, 31 + seed) * 0.06,
  tailWag: t * 0.9,
  tailWagAmount: 0.14,
  bodySquash: Math.sin(t * TAU * 0.4) * 0.025,
  blink: pancakeBlink(t, seed, 4.2),
});

/** Standing sad: head low, ears flat, puppy eyes looking up from under the brows, tail down. */
export const pancakeSad = (t: number, seed = 0): PancakePose => ({
  eyes: 'puppy',
  earPerk: -1,
  headPitch: -0.12 + Math.sin(t * TAU * 0.2) * 0.02,
  headTilt: Math.sin(t * TAU * 0.15 + seed) * 0.1,
  tailWagAmount: 0,
  bodySquash: 0.05 + Math.sin(t * TAU * 0.35) * 0.02,
  blink: pancakeBlink(t, seed, 4.5),
});

/** Head down in the bowl, chomping, tail going like crazy. Place the bowl at PANCAKE.bowl. */
export const pancakeEat = (t: number, seed = 0): PancakePose => ({
  eat: 1,
  eatPhase: t * 2.3,
  eyes: 'happy',
  earPerk: 0.1,
  tailWag: t * 3.4,
  tailWagAmount: 0.9,
  bodySquash: Math.sin(t * TAU * 2.3) * 0.02,
  headYaw: noise1(t * 0.8, 41 + seed) * 0.08,
});

/** Overjoyed: ^ ^ eyes, tongue out, perked ears, big wag, little hops (hop height in metres). */
export const pancakeHappy = (t: number, seed = 0, hops = true): PancakePose => {
  const hp = t * 1.7 + seed * 0.37;
  const s = Math.sin(hp * TAU);
  const air = hops ? Math.max(0, s) : 0;
  return {
    eyes: 'happy',
    mouthOpen: 0.7 + Math.sin(t * TAU * 3) * 0.08,
    tongue: 0.85,
    earPerk: 0.55 + air * 0.35,
    tailWag: t * 3.6,
    tailWagAmount: 1,
    hop: air * 0.075,
    // squash on the ground, stretch in the air
    bodySquash: hops ? (s < 0 ? -s * 0.28 : -air * 0.12) : Math.sin(t * TAU * 1.5) * 0.04,
    headTilt: Math.sin(t * TAU * 0.8) * 0.16,
    headPitch: 0.12,
  };
};

/** Lying down, chin on the paws. sleepy=true closes the eyes. */
export const pancakeLie = (t: number, sleepy = false, seed = 0): PancakePose => ({
  lie: 1,
  eyes: sleepy ? 'closed' : 'open',
  earPerk: -0.5,
  bodySquash: Math.sin(t * TAU * (sleepy ? 0.25 : 0.38)) * 0.03,
  tailWag: t * 0.6,
  tailWagAmount: sleepy ? 0 : 0.12,
  headYaw: sleepy ? 0 : noise1(t * 0.2, 51 + seed) * 0.15,
  blink: sleepy ? 0 : pancakeBlink(t, seed, 4),
});

const NUM_KEYS = [
  'walk', 'walkAmount', 'sit', 'lie', 'headYaw', 'headPitch', 'headTilt', 'earPerk', 'tailWag', 'tailWagAmount', 'mouthOpen',
  'tongue', 'blink', 'eat', 'eatPhase', 'bodySquash', 'hop', 'blush', 'frown', 'tear',
] as const;

/** Blend two poses (k = 0 → a, 1 → b). Numbers lerp; `eyes` switches at k = 0.5 (with a blink through the switch). */
export const mixPose = (a: PancakePose, b: PancakePose, k: number): PancakePose => {
  const out: PancakePose = {};
  for (const key of NUM_KEYS) {
    const va = a[key], vb = b[key];
    if (va === undefined && vb === undefined) continue;
    (out as Record<string, number>)[key] = (va ?? 0) + ((vb ?? 0) - (va ?? 0)) * k;
  }
  const ea: PancakeEyes = a.eyes ?? 'open', eb: PancakeEyes = b.eyes ?? 'open';
  out.eyes = k < 0.5 ? ea : eb;
  if (ea !== eb) out.blink = Math.max(out.blink ?? 0, 1 - Math.abs(k - 0.5) / 0.12);
  return out;
};
