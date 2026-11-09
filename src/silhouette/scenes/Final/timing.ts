// TERMS · Final — timing, shot list (cuts on downbeats) and the dawn / red-failure curves shared by every shot.
// Everything is a pure function of song time (useSongTime()) so shots stay in sync with the vocal.
import {DOWNBEATS, BEATS, clamp01, lerp, rand} from '../../../lib/time';
import {RED_WORDS, CHORUS_HITS} from '../../lib/palette';
import {LINES} from '../../../lib/lyrics';

export const FROM = 4992; // absolute frame of the scene start (src/timeline.ts)
export const TO = 6126;
export const LEN = TO - FROM; // 1134 frames
export const T_HIT: number = CHORUS_HITS.final; // 166.39 s: THE hit (second and last whole-frame brightness change)
export const T_END = TO / 30; // 204.2 s

/** nearest downbeat (s) to a nominal time */
export const downbeat = (t: number) => DOWNBEATS.reduce((b, d) => (Math.abs(d - t) < Math.abs(b - t) ? d : b), DOWNBEATS[0]);
/** scene-local frame of the downbeat nearest to `t` */
export const cutAt = (t: number) => Math.round(downbeat(t) * 30) - FROM;

export type ShotId = 'hit' | 'book' | 'letters' | 'crowd' | 'walk' | 'bowl' | 'crane';
export type Shot = {id: ShotId; from: number; to: number};
/** Shot list (scene-local frames). Every cut sits on a downbeat. */
export const SHOTS: Shot[] = [
  {id: 'hit', from: 0, to: cutAt(169.72)}, //          166.39–169.72  hit · screens die · dawn · hood down     [38]
  {id: 'book', from: cutAt(169.72), to: cutAt(174.1)}, // 169.72–174.10  the paper 1984 held up, opened           [38][39]
  {id: 'letters', from: cutAt(174.1), to: cutAt(178.47)}, // 174.10–178.47  giant red BUY NOW flicker and fall   [39][40][41]
  {id: 'crowd', from: cutAt(178.47), to: cutAt(182.83)}, //  178.47–182.83  the crowd looks up, last red dies    [41]
  {id: 'walk', from: cutAt(182.83), to: cutAt(187.18)}, //   182.83–187.18  man + dog walk home in the gold      [41][42]
  {id: 'bowl', from: cutAt(187.18), to: cutAt(193.68)}, //   187.18–193.68  HERO: Pancake eats from the bowl     [42][43][44]
  {id: 'crane', from: cutAt(193.68), to: LEN}, //            193.68–204.20  crane up: black city, one warm window [44][45]
];
export const shotAt = (local: number) => SHOTS.find((s) => local >= s.from && local < s.to) ?? SHOTS[SHOTS.length - 1];
/** song-time window of a shot */
export const shotTimes = (s: Shot): [number, number] => [(FROM + s.from) / 30, (FROM + s.to) / 30];

/** lyric line windows (first sung word → next line's first word), same rule as WorldLyric's default */
export const lineWindow = (i: number): [number, number] => {
  const L = LINES[i];
  const a = L.words[0]?.start ?? L.start;
  const next = i + 1 < LINES.length ? LINES[i + 1].words[0]?.start ?? LINES[i + 1].start : Infinity;
  return [a, Math.min(next, L.end + 1.2)];
};
/** lyric lines visible inside a song-time window */
export const linesIn = (t0: number, t1: number, lines: number[]) => lines.filter((i) => {
  const [a, b] = lineWindow(i);
  return a < t1 && b > t0;
});

// ------------------------------------------------------------------------------------------------ curves
export const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
export const easeOut = (x: number, p = 3) => 1 - Math.pow(1 - clamp01(x), p);

/**
 * The dawn: 0 before the hit, ~0.8 within 1.3 s of 166.39 (the whole-frame brightness change), then it keeps rising
 * slowly to 1 at the end of the scene.
 */
export const dawn = (t: number) => {
  if (t < T_HIT) return 0;
  const a = easeOut((t - T_HIT - 0.04) / 1.3, 3);
  const b = clamp01((t - T_HIT) / (T_END - T_HIT));
  return 0.8 * a + 0.2 * b;
};
/** sun elevation (degrees above the horizon): just under it at the hit, rising through the fog all chorus */
export const sunElevation = (t: number) => lerp(-0.6, 5.2, smooth((t - T_HIT) / (T_END - T_HIT)) * 0.6 + clamp01((t - T_HIT) / (T_END - T_HIT)) * 0.4);

/**
 * A failing red light: 1 before `start`, stepped stutter over `dur` seconds (deterministic per frame), then 0.
 * Use for every TENURE screen/iris after the hit.
 */
export const redFail = (t: number, start: number = T_HIT, dur = 0.6, seed = 0) => {
  if (t < start) return 1;
  const k = (t - start) / dur;
  if (k >= 1) return 0;
  const f = Math.floor(t * 30);
  const on = rand(`fail-${seed}-${f}`) > 0.25 + k * 0.7;
  return on ? 1 - 0.5 * k : 0.06;
};

/** beat times (s) in [t0, t1) */
export const beatsIn = (t0: number, t1: number) => BEATS.filter((b) => b >= t0 && b < t1);

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
const RED = new Set<string>(RED_WORDS);
export const isRedWord = (w: string) => RED.has(clean(w));
