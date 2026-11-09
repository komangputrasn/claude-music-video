// Cancel scene timing: every key action as a SCENE-LOCAL frame (0 = song 137.53 s, abs frame 4126).
// Word times come from the aligned lyrics (wordTime), beats from the audio analysis — nothing hand-typed in seconds.
import {wordTime} from '../../lib/lyrics';
import {BEATS} from '../../lib/time';
import {sceneById} from '../../timeline';

export const FROM = sceneById('Cancel').from; // 4126
export const DUR = sceneById('Cancel').to - FROM; // 552

const L = (s: number) => s * 30 - FROM;
const w = (line: number, word: string, occ = 0) => L(wordTime(line, word, occ));

/** local frames of words */
export const W = {
  passed: w(32, 'passed'), // 42.8
  click: w(32, 'click'), // 58.4
  to: w(32, 'to'), // 68.6
  cancel: w(32, 'cancel'), // 81.8
  and: w(32, 'and'), // 104
  court: w(32, 'court'), // 126.2
  said: w(32, 'said'), // 134.6
  no: w(32, 'no'), // 146.6
  so: w(33, 'so'), // 159.8
  page1: w(33, 'page'), // 183.2
  after: w(33, 'after'), // 201.8
  page2: w(33, 'page', 1), // 211.4
  nowhere: w(33, 'nowhere'), // 242.6
  go: w(33, 'go'), // 279.8
  amazon: w(34, 'amazon'), // 294.2
  named: w(34, 'named'), // 324.2
  cancelPage: w(34, 'cancel'), // 354.2
  iliad: w(34, 'iliad'), // 410.6
  most: w(35, 'most'), // 432.8
  honest: w(35, 'honest'), // 449.6
  name: w(35, 'name'), // 474.2
  cancel2: w(35, 'cancel'), // 516.2
  had: w(35, 'had'), // 548
};

/** local frames of the beats inside the scene (index 0 = scene start downbeat) */
export const B = BEATS.map(L).filter((f) => f > -2 && f < DUR + 20).map((f) => Math.round(f));
// B ≈ [0,16,32,47,63,79,95,111,127,143,157,172,187,203,219,234,249,264,279,294,309,326,342,357,374,390,407,422,438,455,472,488,504,518,536,552]
export const beatNear = (f: number) => B.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a), B[0]);

/** Shot boundaries (local frames, cuts on beats) */
export const SHOT = {
  A1: 0, // Guy on the phone, ground rumbles, looks up
  A2: beatNear(32), // wide: the CLICK TO CANCEL monument has risen; PASSED! + confetti
  A3: beatNear(79), // 3/4 low: "Cancel" letters, gavel shadow looms
  B1: beatNear(127), // court: gavel slam, shatter, DENIED
  B2: beatNear(157), // front on the Guy in the wreckage, looking at his phone
  B2b: beatNear(172), // POV insert: phone screen, push in
  C1: beatNear(187), // POV flight down the corridor of pages
  C2: beatNear(249), // Guy running on the page treadmill, "nowhere to go"
  D1: beatNear(294), // OmniStore logo slam
  D2: beatNear(326), // Page Properties dialog: naming the page
  D3: beatNear(374), // extreme close on the title field: I L I A D
  E1: Math.round(W.iliad) - 1, // REVEAL: the ILIAD temple
  E2: beatNear(472), // "name": pediment hero with halo
  E3: beatNear(504), // the papyrus scroll of fine print + the Guy
  END: DUR,
};
