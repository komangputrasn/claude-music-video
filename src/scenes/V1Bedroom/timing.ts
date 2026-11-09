// V1Bedroom timing: every key action is derived from the real lyric word times / beats (scene-local frames, float).
import {wordTime} from '../../lib/lyrics';
import {BEATS} from '../../lib/time';
import {sceneById} from '../../timeline';

export const SCENE = sceneById('V1Bedroom');
export const FROM = SCENE.from; // 371
export const DUR = SCENE.to - SCENE.from; // 529

/** scene-local frame (float) at which a lyric word starts */
export const wf = (line: number, word: string, occ = 0) => wordTime(line, word, occ) * 30 - FROM;
/** scene-local frame (rounded) of the beat nearest to local frame `f` */
export const beatNear = (f: number) => {
  let best = 0;
  let d = Infinity;
  for (const b of BEATS) {
    const lf = b * 30 - FROM;
    if (Math.abs(lf - f) < d) {
      d = Math.abs(lf - f);
      best = lf;
    }
  }
  return Math.round(best);
};

// ---- word cues (local frames) ----
export const W = {
  bed: wf(0, 'bed'), // 26.8
  sat: wf(0, 'sat'), // 37.0
  up: wf(0, 'up'), // 55.0
  quarter: wf(0, 'quarter'), // 88.6
  past: wf(0, 'past'), // 107.8
  three: wf(0, 'three'), // 125.8
  voice: wf(1, 'voice'), // 161.2
  pillow: wf(1, 'pillow'), // 185.8
  said: wf(1, 'said'), // 198.4
  sleep: wf(1, 'sleep'), // 223.6
  has: wf(1, 'has'), // 230.8
  fee: wf(1, 'fee'), // 253.6
  theres: wf(2, "there's"), // 263.8
  ink: wf(2, 'ink'), // 298.0
  printer: wf(2, 'printer'), // 316.0
  but: wf(2, 'but'), // 330.4
  wont: wf(2, "won't"), // 350.8
  print: wf(2, 'print'), // 365.8
  line: wf(2, 'line'), // 388.0
  cause: wf(3, "'cause"), // 399.4
  hp: wf(3, 'hp'), // 411.4
  shuts: wf(3, 'shuts'), // 424.0
  off: wf(3, 'off'), // 453.4
  card: wf(3, 'card'), // 483.4
  gets: wf(3, 'gets'), // 499.0
  declined: wf(3, 'declined'), // 509.2
};

// ---- shot list (hard cuts on beats) ----
export type ShotId = 'wide' | 'face' | 'clock' | 'pillow' | 'fee' | 'ink' | 'print' | 'shutoff' | 'card' | 'declined';
export const SHOTS: {id: ShotId; from: number; to: number}[] = [
  {id: 'wide', from: 0, to: beatNear(51)}, //       0–51   "The bed sat me…"
  {id: 'face', from: beatNear(51), to: beatNear(85)}, // 51–85   "…up at a"
  {id: 'clock', from: beatNear(85), to: beatNear(150)}, // 85–150  "quarter past three"
  {id: 'pillow', from: beatNear(150), to: beatNear(216)}, // 150–216 "and a voice in the pillow said"
  {id: 'fee', from: beatNear(216), to: beatNear(265)}, // 216–265 "Sleep has a fee"
  {id: 'ink', from: beatNear(265), to: beatNear(314)}, // 265–314 "There's ink in the"
  {id: 'print', from: beatNear(314), to: beatNear(397)}, // 314–397 "printer, but it won't print a line"
  {id: 'shutoff', from: beatNear(397), to: beatNear(464)}, // 397–464 "'cause HP shuts it off"
  {id: 'card', from: beatNear(464), to: beatNear(496)}, // 464–496 "when my card"
  {id: 'declined', from: beatNear(496), to: DUR}, // 496–529 "gets declined"
];
export const shotAt = (f: number) => {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (f >= SHOTS[i].from) return SHOTS[i];
  return SHOTS[0];
};
