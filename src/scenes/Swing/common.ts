// Shared timing + layout for the Swing scene (frames 3850–4126, 128.34–137.53 s).
import {wordTime} from '../../lib/lyrics';
import {BEATS} from '../../lib/time';

export const SCENE_FROM = 3850;
export const SCENE_LEN = 4126 - 3850; // 276
export type V3 = [number, number, number];

/** song seconds -> scene-local frame (float) */
export const L = (s: number) => s * 30 - SCENE_FROM;
/** word time -> scene-local frame (float) */
export const W = (line: number, word: string, occ = 0) => L(wordTime(line, word, occ));

/** all beats inside the scene, as local frames */
export const LOCAL_BEATS = BEATS.map(L).filter((f) => f > -2 && f < SCENE_LEN + 2);

// ---- key local frames (exact lyric word times)
export const T = {
  swing: W(28, 'swing'), // 26.0  SMASH
  lid: W(28, 'lid'), // 45.8
  flew: W(28, 'flew'), // 51.8
  off: W(28, 'off'), // 59.6
  pancake: W(29, 'pancake'), // 74.6
  ate: W(29, 'ate'), // 93.8
  till: W(29, 'till'),
  enough: W(29, 'enough'), // 122
  picked: W(30, 'picked'), // 140.6
  phone: W(30, 'phone'), // 158.6
  hammer: W(30, 'hammer'), // 175.4
  hand: W(30, 'hand'), // 191.6
  cancelling: W(31, 'cancelling'), // 208.4
  every: W(31, 'every'), // 224.6
  last: W(31, 'last'), // 231.2
  thing: W(31, 'thing'), // 239.6
  on: W(31, 'on'), // 248
  a: W(31, 'a'), // 252.2
  plan: W(31, 'plan'), // 255.8
};

// ---- shot boundaries (local frames; cuts sit on beats / sung words)
export const SHOT = {
  smash: [0, 65] as const, // bullet time -> SMASH on "swing" -> slow-mo lid + kibble (beat 130.50 = 65)
  pancake: [65, 131] as const, // "Pancake ate till he'd had enough" (cut at beat 132.66 ≈ 130)
  phone: [131, 208] as const, // "I picked up the phone with the hammer in my hand"
  cancel: [208, 276] as const, // "I'm cancelling every last thing on a plan"
};

// ---- room layout (Bedroom space). The feeder is turned so its lid flies off toward +X (open floor by the desk).
export const FEEDER_POS: V3 = [0.85, 0, 0.75];
export const FEEDER_ROT = Math.PI / 2; // front (LCD + padlock) faces +X, the lid flies off toward -X
/** the Guy stands behind the feeder facing +Z so GUY.hammerImpact lands on the lid */
export const GUY_SWING_POS: V3 = [0.85 + 0.148, 0, 0.75 - 0.651];
export const PANCAKE_POS: V3 = [1.62, 0, 0.82];
export const PANCAKE_ROT = -1.45;
/** pieces hidden in every Swing room shot (they sit in the camera orbit) */
export const HIDE_PIECES = ['chair', 'blowupChair'] as const;

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// ---- time remap after the hit (shared by every shot so the kibble state is continuous across cuts)
export const IMPACT = Math.round(T.swing); // 26
const SLOW_END = 50; // 0.3x slow motion until here ...
const RAMP_END = 62; // ... then ramps back up to real time ("flew off")
/** world seconds elapsed since the impact (0.3x slow-mo, speed ramp, then real time) */
export const simAfter = (f: number) => {
  if (f <= IMPACT) return 0;
  const a = Math.min(f, SLOW_END) - IMPACT;
  let s = (0.3 * a) / 30;
  if (f > SLOW_END) {
    const b = Math.min(f, RAMP_END) - SLOW_END;
    s += (0.3 * b + (0.7 * b * b) / (2 * (RAMP_END - SLOW_END))) / 30;
  }
  if (f > RAMP_END) s += (f - RAMP_END) / 30;
  return s;
};
/** KibbleBurst progress (2.4 sim-seconds) */
export const kibbleProgress = (f: number) => Math.min(1, simAfter(f) / 2.4);
export const smooth = (x: number) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
/** the one kibble explosion (same params everywhere so the spilled kibble matches across cuts) */
export const KIBBLE_BURST = {count: 320, spread: 1.05, up: 3.3, seed: 11, size: 0.015};

/** the padlock pops off on the hit and tumbles toward the lens in slow motion, landing near the front-left */
const LOCK0: V3 = [FEEDER_POS[0] + 0.2, 0.16, FEEDER_POS[2]];
const LOCK_V: V3 = [-1.8, 4.0, 1.1];
export const LOCK_LAND = (LOCK_V[1] + Math.sqrt(LOCK_V[1] * LOCK_V[1] + 4 * 4.9 * (LOCK0[1] - 0.05))) / 9.8;
export const LOCK_SCALE = 1.6;
export const lockAt = (sim: number): V3 => {
  const s = Math.min(sim, LOCK_LAND);
  return [LOCK0[0] + LOCK_V[0] * s, Math.max(0.05, LOCK0[1] + LOCK_V[1] * s - 4.9 * s * s), LOCK0[2] + LOCK_V[2] * s];
};
