// Swing timing: scene-local cut frames (on beats), the impact, the simulation clocks of the broken box, and the sung-word
// times the shots sync to. Scene = absolute frames 3850–4126 (song 128.333–137.533 s). Scene-local = absolute − 3850.
import {BEATS} from '../../../lib/time';
import {wordTime} from '../../../lib/lyrics';
import {IMPACT_T} from '../../lib/palette';

export const SCENE_FROM = 3850;
export const SCENE_LEN = 276;
export const T_START = SCENE_FROM / 30; // 128.333
export const T_END = (SCENE_FROM + SCENE_LEN) / 30; // 137.533

const nearestBeat = (s: number) => BEATS.reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a), BEATS[0]);
const cutAt = (s: number) => Math.round(nearestBeat(s) * 30) - SCENE_FROM;

/** absolute frame of the hammer blow (129.20 s): the first gold in the film */
export const IMPACT_ABS = Math.round(IMPACT_T * 30); // 3876 (local 26)

/** scene-local first frame of each shot */
export const CUT = {
  /** 1 SWING    0–80    overhead: the slow blow, the eye shatters, gold spills; Pancake walks into the light (28, 29 "Pancake") */
  swing: 0,
  /** 2 PANCAKE  81–129  floor level into the broken box: Pancake eats in the gold, tail wags (line 29) — downbeat 131.03 */
  pancake: cutAt(131.03),
  /** 3 STAND    130–275 he stands, hammer + phone, backlit by gold; the lease-tag wall dies (lines 30, 31) — beat 132.66 */
  stand: cutAt(132.66),
  end: SCENE_LEN,
} as const;

/** song seconds of the shot cuts */
export const TCUT = {
  pancake: (SCENE_FROM + CUT.pancake) / 30,
  stand: (SCENE_FROM + CUT.stand) / 30,
};

/** sung words the picture syncs to (lyrics.json) */
export const W = {
  one: wordTime(28, 'One'),
  swing: wordTime(28, 'swing,'),
  lid: wordTime(28, 'lid'),
  flew: wordTime(28, 'flew'),
  off: wordTime(28, 'off,'),
  pancake: wordTime(29, 'Pancake'),
  ate: wordTime(29, 'ate'),
  enough: wordTime(29, 'enough.'),
  i30: wordTime(30, 'I'),
  picked: wordTime(30, 'picked'),
  phone: wordTime(30, 'phone'),
  hammer: wordTime(30, 'hammer'),
  hand: wordTime(30, 'hand,'),
  im: wordTime(31, "I'm"),
  cancelling: wordTime(31, 'cancelling'),
  every: wordTime(31, 'every'),
  thing: wordTime(31, 'thing'),
  plan: wordTime(31, 'plan.'),
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * The broken box's simulation clocks (functions of the ABSOLUTE frame, so the Monolith stays continuous across the cuts).
 * Time slows around the blow: the descent is drawn out, the shatter runs at ~0.7× real time, the kibble at ~0.9×.
 */
export const boxState = (abs: number) => {
  const a = abs - IMPACT_ABS; // frames since the blow
  // swing phase: hammer high behind his head at the cut-in (≈0.2), a long slow descent, accelerating into the eye
  let p: number;
  if (a < 0) {
    const u = clamp01((abs - SCENE_FROM) / (IMPACT_ABS - SCENE_FROM));
    p = 0.2 + 0.3 * (0.35 * u + 0.65 * u * u * u);
  } else {
    // recoil (0.5 → 0.62) then the head settles on the broken brow (→ 0.9)
    p = 0.5 + 0.4 * clamp01(a / 34) * (2 - clamp01(a / 34));
  }
  return {
    p,
    a,
    broken: a >= 0,
    /** 0..1 = 1.6 simulated s. Starts ON the contact frame (a = 0 → 1/66), so the bone flash and the first red glass
     *  land exactly at 129.20 s; Monolith treats shatter 0 as intact, so a / 66 would put the flash one frame late */
    shatter: a < 0 ? 0 : clamp01((a + 1) / 66),
    /** dawnGold from inside the box */
    spill: a < 1 ? 0 : clamp01((a - 1) / 22) ** 0.7,
    /** 0..1 = 3.4 simulated s of kibble sparks */
    kibble: a < 1 ? 0 : clamp01((a - 1) / 118),
    /** hammer handle: the V2Rain foreshadow (0.3) until the blow, then a bright gold edge */
    warmth: a < 0 ? 0.3 : 0.3 + 0.7 * clamp01(a / 8),
  };
};
