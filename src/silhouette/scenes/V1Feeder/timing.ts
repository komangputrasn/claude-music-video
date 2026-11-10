// V1Feeder timing: shot cuts (absolute frames), lyric word onsets (song seconds), small easing helpers.
// The scene spans absolute frames 900–1424 (song 30.00–47.47 s). Every cut lands on a sung onset (the first word of the
// next line), so each shot owns exactly one lyric line: [4] PAGE · [5] VENT · [6] FEEDER · [7] LONELY.
import {BEAT_LEN, DOWNBEATS, clamp01} from '../../../lib/time';
import {wordTime} from '../../../lib/lyrics';

export const FPS = 30;
export const SCENE_FROM = 900;
export const SCENE_TO = 1424;

/** Shot boundaries (absolute frames). */
export const CUTS = {
  page: 900, //   30.00 s  scene start ("My…" is already sung at 29.88: it is on the page from the first frame)
  vent: 1026, //  34.20 s  "Amazon" — the words leave the page
  feeder: 1163, // 38.77 s  beat 38.75, just before "The feeder said"
  lonely: 1302, // 43.40 s  "and Pancake looked up at me" — the long held wide
  end: SCENE_TO,
} as const;
export const T_CUT = {
  page: CUTS.page / FPS, vent: CUTS.vent / FPS, feeder: CUTS.feeder / FPS, lonely: CUTS.lonely / FPS, end: CUTS.end / FPS,
} as const;

export type ShotId = 'page' | 'vent' | 'feeder' | 'lonely';
export const shotAt = (abs: number): ShotId =>
  abs < CUTS.vent ? 'page' : abs < CUTS.feeder ? 'vent' : abs < CUTS.lonely ? 'feeder' : 'lonely';

/** Key word onsets (song seconds) from src/data/lyrics.json. */
export const W = {
  my: wordTime(4, 'my'), // 29.88
  kindles: wordTime(4, "kindle's"), // 30.90
  orwell: wordTime(4, 'orwell'), // 31.74
  today: wordTime(4, 'today'), // 33.66
  amazon: wordTime(5, 'amazon'), // 34.20
  took: wordTime(5, 'took'), // 34.98
  back: wordTime(5, 'back'), // 35.92
  once: wordTime(5, 'once'), // 36.14
  and5: wordTime(5, 'and'), // 36.72
  take: wordTime(5, 'take'), // 37.42
  away: wordTime(5, 'away'), // 38.14
  the6: wordTime(6, 'the'), // 38.84
  feeder: wordTime(6, 'feeder'), // 39.54
  said: wordTime(6, 'said'), // 40.14
  breakfast: wordTime(6, 'breakfast'), // 40.46
  plus: wordTime(6, 'plus'), // 41.38
  members: wordTime(6, 'members'), // 41.84
  only: wordTime(6, 'only'), // 42.62
  and7: wordTime(7, 'and'), // 43.40
  pancake: wordTime(7, 'pancake'), // 44.00
  looked: wordTime(7, 'looked'), // 44.58
  up: wordTime(7, 'up'), // 44.88
  me: wordTime(7, 'me'), // 45.38
  hungry: wordTime(7, 'hungry'), // 45.86
  lonely: wordTime(7, 'lonely'), // 47.12
} as const;

export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** 0..1 linear ramp between song times a..b */
export const lin = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
/** smoothstep ramp between song times a..b */
export const sm = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

/**
 * The cell's TENURE scanner (continues V1Bedroom's red band through the slats, at half its rate): one pass per bar,
 * ping-pong, eased so it dwells at the window edges and crosses on the downbeat. Returns the CellRoom cookie's `scan`.
 */
export const scanAt = (t: number): number | null => {
  const i = DOWNBEATS.length ? lastDown(t) : -1;
  if (i < 0) return null;
  const ta = DOWNBEATS[i];
  const tb = DOWNBEATS[i + 1] ?? ta + 4 * BEAT_LEN;
  const u = clamp01((t - ta) / (tb - ta));
  const s = -0.16 + 1.32 * smooth(u);
  return i % 2 === 0 ? s : 1 - s;
};
const lastDown = (t: number) => {
  let ans = -1;
  for (let k = 0; k < DOWNBEATS.length && DOWNBEATS[k] <= t; k++) ans = k;
  return ans;
};

/** the book's loss: most of the page goes on "took it back once", the last words leave on "and they can take", so the page
 *  he holds up is blank from "take it" through "away" to the cut (VENT `lift`) */
export const bookLoss = (t: number) =>
  0.7 * lin(t, W.took - 0.12, W.once + 0.35) + 0.3 * lin(t, W.once + 0.35, W.take + 0.3);
