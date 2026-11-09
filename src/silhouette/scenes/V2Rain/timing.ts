// V2Rain timing: scene-local cut frames (all on beats) and the sung-word times the shots sync to.
// Scene = absolute frames 3299–3850 (song 109.97–128.34 s). Scene-local frame = absolute − 3299.
import {BEATS} from '../../../lib/time';
import {wordTime} from '../../../lib/lyrics';

export const SCENE_FROM = 3299;
export const SCENE_LEN = 551;
export const T_START = SCENE_FROM / 30; // 109.967
export const T_END = (SCENE_FROM + SCENE_LEN) / 30; // 128.333

const nearestBeat = (s: number) => BEATS.reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a), BEATS[0]);
const cutAt = (s: number) => Math.round(nearestBeat(s) * 30) - SCENE_FROM;

/** scene-local first frame of each shot */
export const CUT = {
  /** 1 STREET   0–80    walk home under the giant screen in the rain */
  street: 0,
  /** 2 DOOR     81–145  the house door is a red iris: "WHO?" / IDENTITY NOT ON PLAN (beat 112.66, on "doorbell") */
  door: cutAt(112.66),
  /** 3 CLIMB    146–275 in through the cell window; on "cops" red drone cones sweep the room (beat 114.82) */
  climb: cutAt(114.82),
  /** 4 WAITING  276–405 Pancake, nose on the Monolith (beat 119.17, on "Pancake") */
  waiting: cutAt(119.17),
  /** 5 HAMMER   406–550 push-in on grandpa's hammer, the only warm edge (beat 123.48) */
  hammer: cutAt(123.48),
  end: SCENE_LEN,
} as const;

/** song seconds of the shot cuts */
export const TCUT = {
  door: (SCENE_FROM + CUT.door) / 30,
  climb: (SCENE_FROM + CUT.climb) / 30,
  waiting: (SCENE_FROM + CUT.waiting) / 30,
  hammer: (SCENE_FROM + CUT.hammer) / 30,
};

/** sung words the picture syncs to (lyrics.json) */
export const W = {
  way: wordTime(23, 'way.'),
  walked: wordTime(24, 'walked'),
  rain: wordTime(24, 'rain,'),
  doorbell: wordTime(24, 'doorbell'),
  said: wordTime(24, 'said,'),
  who: wordTime(24, '"Who?"'),
  so: wordTime(25, 'so'),
  climbed: wordTime(25, 'climbed'),
  window: wordTime(25, 'window,'),
  cops: wordTime(25, 'cops'),
  too: wordTime(25, 'too.'),
  pancake: wordTime(26, 'Pancake'),
  waiting: wordTime(26, 'waiting'),
  nose: wordTime(26, 'nose'),
  box: wordTime(26, 'box,'),
  grandpas: wordTime(27, "grandpa's"),
  hammer: wordTime(27, 'hammer'),
  care: wordTime(27, 'care'),
  locks: wordTime(27, 'locks.'),
  one: wordTime(28, 'One'),
};
