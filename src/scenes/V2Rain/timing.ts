// V2Rain timing: every key moment as a SCENE-LOCAL frame (0 = 109.97 s). Derived from lyrics.json + audio beats.
import {wordTime} from '../../lib/lyrics';
import {BEATS} from '../../lib/time';
import {sceneById} from '../../timeline';

export const SCENE = sceneById('V2Rain');
export const FROM = SCENE.from; // 3299
export const DUR = SCENE.to - SCENE.from; // 551

/** scene-local frame (float) at which a lyric word is sung */
export const wf = (line: number, word: string, occ = 0) => wordTime(line, word, occ) * 30 - FROM;

/** scene-local beat frames inside the scene */
export const BEAT_F = BEATS.map((b) => b * 30 - FROM).filter((x) => x > -20 && x < DUR + 20);

export const W = {
  walked: wf(24, 'walked'), // 28
  home: wf(24, 'home'), // 37
  rain: wf(24, 'rain'), // 62
  doorbell: wf(24, 'doorbell'), // 79
  said: wf(24, 'said'), // 92
  who: wf(24, 'who'), // 104
  climbed: wf(25, 'climbed'), // 158
  window: wf(25, 'window'), // 176
  cops: wf(25, 'cops'), // 207
  came: wf(25, 'came'), // 220
  too: wf(25, 'too'), // 244
  pancake: wf(26, 'pancake'), // 277
  waiting: wf(26, 'waiting'), // 304
  nose: wf(26, 'nose'), // 338
  box: wf(26, 'box'), // 360
  grandpas: wf(27, "grandpa's"), // 426
  old: wf(27, 'old'), // 454
  hammer: wf(27, 'hammer'), // 465
  doesnt: wf(27, "doesn't"), // 479
  care: wf(27, 'care'), // 498
  about: wf(27, 'about'), // 509
  locks: wf(27, 'locks'), // 525
};

/** shot boundaries (local frames, cuts on beats / sung words) */
export const SHOTS = {
  streetWide: [0, 49],
  streetClose: [49, 79],
  doorbell: [79, 146],
  climb: [146, 207],
  copsOut: [207, 243],
  copsIn: [243, 276],
  pancake: [276, 338],
  nose: [338, 373],
  pat: [373, 406],
  reveal: [406, 454],
  hammer: [454, 501],
  reach: [501, DUR],
} as const;
export type ShotId = keyof typeof SHOTS;

export const shotAt = (f: number): ShotId => {
  let id: ShotId = 'streetWide';
  for (const k of Object.keys(SHOTS) as ShotId[]) if (f >= SHOTS[k][0]) id = k;
  return id;
};
