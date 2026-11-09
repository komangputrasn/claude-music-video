// V2Car timing: scene-local cut frames (all on beats) and the sung-word times the shots sync to.
// Scene = absolute frames 2777–3299 (song 92.56–109.97 s). Scene-local frame = absolute − 2777.
import {BEATS} from '../../../lib/time';
import {wordTime} from '../../../lib/lyrics';

export const SCENE_FROM = 2777;
export const SCENE_LEN = 522;
export const T_START = SCENE_FROM / 30; // 92.567
export const T_END = (SCENE_FROM + SCENE_LEN) / 30; // 109.967

const nearestBeat = (s: number) => BEATS.reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a), BEATS[0]);
const cutAt = (s: number) => Math.round(nearestBeat(s) * 30) - SCENE_FROM;

/** scene-local first frame of each shot */
export const CUT = {
  /** 1 THERMAL   the capsule head-on, the seat goes frost-white (line 20) */
  thermal: 0,
  /** 2 GOVERNOR  behind him under the governor gantry; capsules stream past (line 21) — beat 97.48, before "and" */
  governor: cutAt(97.48),
  /** 3 PILLAR    the fuelling pillar under the floodlight; the capsule leaves without him (line 22) — beat 102.35 */
  pillar: cutAt(102.35),
  /** 4 PATENT    the patent drawing projected on the fog wall (line 23) — beat 106.70 */
  patent: cutAt(106.7),
  end: SCENE_LEN,
} as const;

/** song seconds of the shot cuts */
export const TCUT = {
  governor: (SCENE_FROM + CUT.governor) / 30,
  pillar: (SCENE_FROM + CUT.pillar) / 30,
  patent: (SCENE_FROM + CUT.patent) / 30,
};

/** sung words the picture syncs to (lyrics.json) */
export const W = {
  the20: wordTime(20, 'The'),
  car20: wordTime(20, 'car'),
  seats: wordTime(20, 'seats'),
  cold: wordTime(20, 'cold,'),
  heat: wordTime(20, 'heat'),
  tier20: wordTime(20, 'tier,'),
  and21: wordTime(21, 'and'),
  speed: wordTime(21, 'speed'),
  tier21: wordTime(21, 'tier,'),
  so: wordTime(21, 'so'),
  crawled: wordTime(21, 'crawled'),
  first: wordTime(21, 'first'),
  gear: wordTime(21, 'gear.'),
  i22: wordTime(22, 'I'),
  stopped: wordTime(22, 'stopped'),
  gas: wordTime(22, 'gas,'),
  car22: wordTime(22, 'car'),
  drove: wordTime(22, 'drove'),
  away: wordTime(22, 'away,'),
  ford: wordTime(23, 'Ford'),
  filed: wordTime(23, 'filed'),
  patent: wordTime(23, 'patent'),
  by: wordTime(23, 'by'),
};
