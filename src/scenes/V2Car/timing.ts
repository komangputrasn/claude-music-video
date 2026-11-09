// V2Car timing: every key moment in SCENE-LOCAL frames (0 = song frame 2777 = 92.56 s).
// Lyric words come from lib/lyrics (wordTime) and cuts snap to the detected beats (lib/time BEATS).
import {wordTime} from '../../lib/lyrics';
import {BEATS} from '../../lib/time';

export const FROM = 2777;
export const DURATION = 3299 - 2777; // 522
/** song seconds -> scene-local frame (fractional) */
export const lf = (s: number) => s * 30 - FROM;
/** scene-local frame of the beat nearest to song second s (rounded) */
export const beatF = (s: number) => {
  let best = BEATS[0];
  for (const b of BEATS) if (Math.abs(b - s) < Math.abs(best - s)) best = b;
  return Math.round(lf(best));
};

const w = (line: number, word: string, occ = 0) => lf(wordTime(line, word, occ));

/** lyric word times (local frames) */
export const W = {
  the: w(20, 'the'),
  car: w(20, 'car'),
  seats: w(20, 'seats'),
  cold: w(20, 'cold'),
  heat: w(20, 'heat'),
  tier1: w(20, 'tier'),
  speed: w(21, 'speed'),
  tier2: w(21, 'tier'),
  crawled: w(21, 'crawled'),
  first: w(21, 'first'),
  gear: w(21, 'gear'),
  stopped: w(22, 'stopped'),
  gas: w(22, 'gas'),
  car2: w(22, 'car'),
  drove: w(22, 'drove'),
  away: w(22, 'away'),
  ford: w(23, 'ford'),
  filed: w(23, 'filed'),
  patent: w(23, 'patent'),
  that: w(23, 'that'),
  by: w(23, 'by'),
};

/** beat frames used for cuts / hits */
export const B = {
  b1: beatF(93.11), // 16  headlights ignite
  b2: beatF(93.65), // 32
  cut1: beatF(94.16), // 48  downbeat: into the cabin ("car seats")
  b4: beatF(94.74), // 65  "cold"
  cut2: beatF(95.83), // 98  "heat is a tier"
  d2: beatF(96.36), // 114 downbeat
  b7: beatF(96.92), // 131
  b8: beatF(97.48), // 147
  cut3: beatF(98.01), // 163 "speed"
  d3: beatF(98.55), // 180 downbeat: padlock slam
  b10: beatF(99.08), // 195
  b11: beatF(99.64), // 212
  cut4: beatF(100.17), // 228 "crawled"
  d4: beatF(100.73), // 245 downbeat
  b13: beatF(101.26), // 261
  b14: beatF(101.8), // 277
  cut5: beatF(102.35), // 293 "stopped": gas station wide
  cut6: beatF(102.91), // 310 downbeat: at the pump
  b17: beatF(103.44), // 326
  b18: beatF(104.0), // 343
  b19: beatF(104.54), // 359
  cut7: beatF(105.07), // 375 downbeat: "drove away"
  b21: beatF(105.6), // 391
  b22: beatF(106.16), // 408
  cut8: beatF(106.7), // 424 the patent flies in
  d8: beatF(107.25), // 440 downbeat: paper lands
  b25: beatF(107.79), // 457
  b26: beatF(108.3), // 472
  b27: beatF(108.88), // 489
  d9: beatF(109.44), // 506 downbeat: "by the way"
};
