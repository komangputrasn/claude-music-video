// Shared timing + layout for the Hold scene (frames 4678–4992, 155.95–166.39 s).
import {wordTime} from '../../lib/lyrics';

export const SCENE_FROM = 4678;
export const SCENE_LEN = 4992 - 4678; // 314
export type V3 = [number, number, number];

/** song seconds -> scene-local frame (float) */
export const L = (s: number) => s * 30 - SCENE_FROM;
export const W = (line: number, word: string, occ = 0) => L(wordTime(line, word, occ));

export const T = {
  hold: W(36, 'hold'), // 28.4
  music: W(36, 'music'), // 38
  stopped: W(36, 'stopped'), // 56
  voice: W(36, 'voice'), // 92
  came: W(36, 'came'), // 104
  through: W(36, 'through'), // 116.6
  one: W(37, 'one'), // 155.6
  pillow: W(37, 'pillow'), // 189.2
  said: W(37, 'said'), // 221
  is: W(37, 'is'), // 247.4
  that: W(37, 'that'), // 249.2
  you: W(37, 'you'), // 257
};

/** shot boundaries (local frames, on beats / sung words) */
export const SHOT = {
  wide: 0, // "Then the hold music" — limbo wide
  bored: 33, // beat 157.04
  stopped: 55, // "stopped" (157.80 = 55.5) — freeze, drain to dark
  voice: 91, // "voice" (159.00 = 92)
  reveal: 129, // beat 160.24 — the glowing pillow in the dark
  push: 161, // beat 161.31 — slow push on the pillow, "Is that you?"
  face: 280, // downbeat 165.28 — his face, soft smile, into Final at 314
};

/** world layout */
export const GUY_POS: V3 = [0, 1.45, 0];
export const PILLOW_POS: V3 = [1.85, 1.78, 0.8];

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const smooth = (x: number) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
/** 0 -> 1 drain of colour/light after "stopped" */
export const drainAt = (f: number) => smooth((f - (SHOT.stopped + 3)) / 30);
