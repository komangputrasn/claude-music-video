// TERMS — Cancel: every sync point of the scene in SONG SECONDS (from src/data/lyrics.json via wordTime, and the
// downbeats in src/data/audio.json). Scene = absolute frames 4126–4678 (137.53–155.93 s).
import {wordTime} from '../../../lib/lyrics';

export const SCENE = {f0: 4126, f1: 4678, t0: 4126 / 30, t1: 4678 / 30};

/** lyric line indices owned by this scene (sceneLyricLines(137.53, 155.95) = [32, 33, 34, 35]) */
export const L = {court: 32, pages: 33, amazon: 34, honest: 35} as const;

const w = wordTime;

export const T = {
  // [32] They passed "Click to Cancel," and a court said no,
  they: w(32, 'They'), // 137.64
  passed: w(32, 'passed'), // 138.96 — the button lights (the law passes)
  click: w(32, 'Click'), // 139.48
  cancel: w(32, 'Cancel'), // 140.26
  and: w(32, 'and'), // 141.00 — the court wakes (irises open), the gavel lowers
  court: w(32, 'court'), // 141.74
  said: w(32, 'said'), // 142.02
  /** the gavel's blow: starts 141.93 (frame 4259), lands 142.03 (frame 4261 = the impact frame, on the onset of "said") */
  blow: 141.93,
  contact: 142.03,
  /** blackout: every light in the hall dies (abs frame 4262) */
  strike: 142.06,
  no: w(32, 'no'), // 142.42
  // [33] so it's page after page with nowhere to go.
  so: w(33, 'so'), // 142.86 — CUT to the paper stair
  page1: w(33, 'page'), // 143.64
  page2: w(33, 'page', 1), // 144.58
  nowhere: w(33, 'nowhere'), // 145.62 — he reaches the landing: the same page
  go: w(33, 'go'), // 146.86
  // [34] Amazon named its cancel page "Iliad,"
  amazon: w(34, 'Amazon'), // 147.34 — CUT to the Iliad wall
  cancel34: w(34, 'cancel'), // 149.34
  iliad: w(34, 'Iliad'), // 151.22
  // [35] the most honest name that a cancel page had.
  the35: w(35, 'the'), // 151.70
  honest: w(35, 'honest'), // 152.52 (big hit, bass back)
  cancel35: w(35, 'cancel'), // 154.74
  had: w(35, 'had'), // 155.80
} as const;

/** shot boundaries (song s). Cuts land on the line onsets ("so", "Amazon"); 147.33 is also a beat. */
export const SHOTS = {
  court: {t0: SCENE.t0, t1: 142.86},
  pages: {t0: 142.86, t1: 147.33},
  iliad: {t0: 147.33, t1: SCENE.t1 + 0.1},
} as const;
