/**
 * Pre (song 47.46–57.75 s, frames 1424–1732): word frames (scene-local) + the cut plan.
 *   [8] "Hold on, buddy, I'll be right back,"   [9] "one bag of food, and that's that."
 *   [10] "How hard can it be to buy one thing"  [11] "in a world where you can't own anything?"
 * Beats (local): 0, 16, 32.5(D), 48.7, 64.6, 80.8, 97.3(D), 113.5, 129.4, 145.3, 162.1(D), 178.3, 194.2, 211,
 *   226.9(D), 242.2, 259, 275.8, 291.7(D), 308.5 (= chorus downbeat, scene end).
 */
import {wordTime} from '../../lib/lyrics';

export const FROM = 1424;
export const DUR = 308;
const wf = (line: number, word: string, occ = 0) => wordTime(line, word, occ) * 30 - FROM;

export const W = {
  hold: wf(8, 'hold'),
  on: wf(8, 'on'),
  buddy: wf(8, 'buddy'),
  ill: wf(8, "i'll"),
  right: wf(8, 'right'),
  back: wf(8, 'back'),
  one: wf(9, 'one'),
  bag: wf(9, 'bag'),
  food: wf(9, 'food'),
  thats: wf(9, "that's"),
  that: wf(9, 'that'),
  how: wf(10, 'how'),
  hard: wf(10, 'hard'),
  buy: wf(10, 'buy'),
  one2: wf(10, 'one'),
  thing: wf(10, 'thing'),
  world: wf(11, 'world'),
  cant: wf(11, "can't"),
  own: wf(11, 'own'),
  anything: wf(11, 'anything'),
};

/** local beat frames in this scene */
export const B = [0, 16, 32.5, 48.7, 64.6, 80.8, 97.3, 113.5, 129.4, 145.3, 162.1, 178.3, 194.2, 211, 226.9, 242.2, 259, 275.8, 291.7, 308.5];

/** shot boundaries (local frames) */
export const CUT = {
  pat: 0, // P1 "Hold on" — profile two-shot, Guy pats Pancake
  pov: 33, // P2 "buddy, I'll be right back" — Pancake's POV up at the Guy, keys up
  ad1: 81, // P3 "one bag" — TV-ad product void, bag whips round
  ad2: 113, // P4 "of food, and that's that" — low hero angle, ONE-TIME PURCHASE starburst
  room: 145, // P5 "How hard can it be to buy one thing" — room pull-back, tags pop on everything
  house: 211, // P6 "in a world where you can't own" — pull back HARD from the bedroom window: the house is RENTED
  moon: 256, // P7 "anything?" — accelerating inserts: moon, car, mailbox, tree, door, aerial, white-out
  end: 308,
};
