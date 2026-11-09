// V1Bedroom timing: shot cuts (absolute frames, on beats), lyric word times, the scanner rhythm.
// Song seconds everywhere (useSongTime()); the scene spans absolute frames 371–900 (12.37–30.00 s).
import {BEATS, BEAT_LEN, beatAt, clamp01} from '../../../lib/time';
import {wordTime} from '../../../lib/lyrics';

export const FPS = 30;
export const SCENE_FROM = 371;
export const SCENE_TO = 900;

/** Shot boundaries (absolute frames). Every cut lands on a beat of src/data/audio.json. */
export const CUTS = {
  A: 371, // 12.37 s  scene start (cut from the Intro title card)
  B: 503, // 16.77 s  beat, just before "and a voice"
  C: 636, // 21.20 s  beat, right after "fee" / "There's"
  D: 768, // 25.60 s  beat 25.59, just before "'cause HP"
  END: 900,
} as const;
export const T_CUT = {
  A: CUTS.A / FPS, B: CUTS.B / FPS, C: CUTS.C / FPS, D: CUTS.D / FPS, END: CUTS.END / FPS,
} as const;

export type ShotId = 'A' | 'B' | 'C' | 'D';
export const shotAt = (absFrame: number): ShotId =>
  absFrame < CUTS.B ? 'A' : absFrame < CUTS.C ? 'B' : absFrame < CUTS.D ? 'C' : 'D';

/** Key word onsets (song seconds), from src/data/lyrics.json. */
export const W = {
  bed: wordTime(0, 'bed'), // 13.26
  sat: wordTime(0, 'sat'), // 13.60
  up: wordTime(0, 'up'), // 14.20
  quarter: wordTime(0, 'quarter'), // 15.32
  three: wordTime(0, 'three'), // 16.56
  voice: wordTime(1, 'voice'), // 17.74
  pillow: wordTime(1, 'pillow'), // 18.56
  said: wordTime(1, 'said'), // 18.98
  sleep: wordTime(1, 'sleep'), // 19.82
  fee: wordTime(1, 'fee'), // 20.82
  ink: wordTime(2, 'ink'), // 22.30
  printer: wordTime(2, 'printer'), // 22.90
  wont: wordTime(2, "won't"), // 24.06
  print: wordTime(2, 'print'), // 24.56
  line: wordTime(2, 'line'), // 25.30
  hp: wordTime(3, 'hp'), // 26.08
  shuts: wordTime(3, 'shuts'), // 26.50
  off: wordTime(3, 'off'), // 27.48
  card: wordTime(3, 'card'), // 28.48
  declined: wordTime(3, 'declined'), // 29.34
  my4: wordTime(4, 'my'), // 29.88 (line 4's first word is sung in this scene)
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
 * The TENURE scanner: one red pass through the slats every half bar (2 beats), ping-pong, eased so it dwells at the
 * window edges and crosses fast — the rhythm of the cell comes from this light, not from cuts.
 * Returns the cookie's `scan` (0..1 across the window, slightly overshooting so the band leaves the glass) or null.
 */
export const scanAt = (t: number): number | null => {
  const b = beatAt(t);
  if (b.index < 0) return null;
  const i0 = b.index - (b.inBar % 2);
  const ta = BEATS[i0];
  const tb = BEATS[i0 + 2] ?? ta + 2 * BEAT_LEN;
  const u = clamp01((t - ta) / (tb - ta));
  const e = smooth(u);
  const s = -0.14 + 1.28 * e;
  const pass = Math.round((ta - BEATS[0]) / (2 * BEAT_LEN));
  return pass % 2 === 0 ? s : 1 - s;
};
