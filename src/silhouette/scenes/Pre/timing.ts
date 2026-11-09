// Pre timing: absolute frames 1424–1732 (song 47.47–57.73 s). Two shots:
//   KNEEL  1424–1509  [8] "Hold on, buddy, I'll be right back,"   — the touch lands on "buddy" (48.98)
//   PLAZA  1510–1731  [9] "one bag of food, and that's that."      — cut on the sung onset of "one" (50.34)
//                     [10] "How hard can it be to buy one thing"    — the crane starts to rise on "How" (52.42)
//                     [11] "in a world where you can't own anything?" + the red whiteout into the chorus (57.75)
import {wordTime} from '../../../lib/lyrics';

export const FPS = 30;
export const SCENE_FROM = 1424;
export const SCENE_TO = 1732;
export const CUT_PLAZA = 1510; // 50.333 s: "one" is sung at 50.34 (the next frame)
export const T0 = SCENE_FROM / FPS;
export const T_CUT = CUT_PLAZA / FPS;
export const T_END = SCENE_TO / FPS;

export const W = {
  hold: wordTime(8, 'hold'), // 47.82
  buddy: wordTime(8, 'buddy,'), // 48.98
  ill: wordTime(8, "i'll"), // 49.44
  right: wordTime(8, 'right'), // 49.70
  back: wordTime(8, 'back,'), // 49.98
  one: wordTime(9, 'one'), // 50.34
  food: wordTime(9, 'food,'), // 51.36
  thats: wordTime(9, "that's"), // 51.98
  how: wordTime(10, 'how'), // 52.42
  buy: wordTime(10, 'buy'), // 53.68
  thing: wordTime(10, 'thing'), // 54.28
  in: wordTime(11, 'in'), // 54.60
  world: wordTime(11, 'world'), // 54.92
  cant: wordTime(11, "can't"), // 55.46
  own: wordTime(11, 'own'), // 55.80
  anything: wordTime(11, 'anything?'), // 56.02
  chorus: 57.75,
} as const;

/** the frame-filling authRed whiteout (screen space): 0 until 56.0, ~0.07 when "anything?" ends, 1 on the last frame */
export const whiteout = (t: number) => {
  const x = Math.max(0, Math.min(1, (t - 56.0) / (57.69 - 56.0)));
  return Math.pow(x, 3);
};
