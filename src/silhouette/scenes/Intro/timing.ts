// TERMS — Intro: timing (song seconds; the Intro starts at song 0, so scene-local frame = absolute frame).
// Instrumental, 0–12.37 s. Beats from 1.30 s; downbeats 2.415, 4.644, 6.85, 9.033, 11.262 (src/data/audio.json).
import {BEATS, DOWNBEATS, FPS} from '../../../lib/time';

/** first beat of the song: the iris opens on it */
export const FIRST_BEAT = BEATS[0]; // 1.30
/** the three beats the iris clicks open on (1.30, 1.858, 2.415 = first downbeat) */
export const IRIS_CLICKS = [BEATS[0], BEATS[1], BEATS[2]] as const;
/** the pull-back runs between the first and the third downbeat */
export const PULL_FROM = DOWNBEATS[0]; // 2.415
export const PULL_TO = DOWNBEATS[2]; // 6.85

/** shot cuts (absolute frames), each on a downbeat */
export const CUT_TERMS = Math.round(DOWNBEATS[2] * FPS); // 206 (6.85 s)
export const CUT_TITLE = Math.round(DOWNBEATS[3] * FPS); // 271 (9.033 s)
export const SCENE_END = 371; // 12.37 s (V1Bedroom)

/** the title: "BUY NOW," types on from the cut, "FOR NOW" from the beat at 10.147 s; "BUY NOW," dims on 11.262 */
export const TITLE_A = DOWNBEATS[3] + 0.1; // 9.133
export const TITLE_B = BEATS[16]; // 10.147
export const TITLE_DIM = DOWNBEATS[4]; // 11.262
/** seconds between two typed letters */
export const TYPE_STEP = 0.1;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 0..1 progress of t through [a, b] */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (u: number) => u * u * (3 - 2 * u);
export const smoother = (u: number) => u * u * u * (u * (u * 6 - 15) + 10);
export const easeOut = (u: number) => 1 - (1 - u) * (1 - u) * (1 - u);
