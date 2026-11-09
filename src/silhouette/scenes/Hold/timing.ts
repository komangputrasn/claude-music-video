// TERMS — Hold: every sync point of the scene in SONG SECONDS (lyrics via wordTime, beats from src/data/audio.json).
// Scene = absolute frames 4678–4992 (155.93–166.40 s). sceneLyricLines(155.95, 166.39) = [36, 37].
import {wordTime} from '../../../lib/lyrics';
import {clamp01} from '../../../lib/time';

export const SCENE = {f0: 4678, f1: 4992, t0: 4678 / 30, t1: 4992 / 30};

/** lyric lines owned by this scene */
export const L = {hold: 36, voice: 37} as const;

const w = wordTime;

export const T = {
  // [36] Then the hold music stopped, and the voice came through,
  then: w(36, 'Then'), // 156.20
  hold: w(36, 'hold'), // 156.88
  music: w(36, 'music'), // 157.20 (the music already decays: rms falls from 157.3)
  stopped: w(36, 'stopped'), // 157.80 — EVERY light cuts out (abs frame 4734), only the pillow's red seam is left
  and36: w(36, 'and'), // 158.32
  voice: w(36, 'voice'), // 159.00 — the seam answers: it pulses like speech
  came: w(36, 'came'), // 159.40
  through: w(36, 'through'), // 159.82 (ends 160.24)
  // [37] the one from my pillow, and it said, "Is that you?"
  the37: w(37, 'the'), // 160.24 — CUT (also a beat) to the eye shot
  one: w(37, 'one'), // 161.12 — the lids start to part
  pillow: w(37, 'pillow'), // 162.24 — near-silence begins (~162.0): the iris opens fully, then nothing moves
  said: w(37, 'said'), // 163.30
  is: w(37, 'Is'), // 164.18 — "IS THAT YOU?" appears; the pupil speaks
  that: w(37, 'that'), // 164.24
  you: w(37, 'you'), // 164.50 (ends 164.94)
  youEnd: 164.94,
  /** the narration words leave the dark just before the question (one line of text at a time) */
  narrationOff: 163.92,
  /** Final's hit: the city's red dies and the gold comes (scene end) */
  end: 166.39,
} as const;

/** the blackout: all light except the pillow's seam is gone from this instant */
export const BLACKOUT = T.stopped;

/**
 * ONE take for the whole scene: a slow push + zoom down the axis (man → eye) from the first frame, mostly travelled in
 * the dark, settling before the near-silence; locked from 162.0 (nothing moves but his breath and the eye).
 */
export const CAMERA = {t0: SCENE.t0, settle: 162.0} as const;

export const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
export const s01 = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** hold-music level 0..1: full until the music decays into "stopped", 0 after the blackout */
export const musicLevel = (t: number) => (t >= BLACKOUT ? 0 : 1 - smooth(s01(t, 157.42, BLACKOUT - 0.02)));

/** is the world lit (before the blackout)? */
export const lit = (t: number) => t < BLACKOUT;

/**
 * The pillow's eye through the scene.
 *   open: 0 = the red seam (until "one"), lids part through "one from my pillow", fully open by ~163.4
 *   talk: the seam crackles with the voice on "voice came through"; the pupil speaks "Is that you?"
 *   breath: the eye breathing in the near-silence (very slow pupil swell; the only motion besides his breath)
 */
export const eyeState = (t: number) => {
  const open = 0.5 * smooth(s01(t, T.one, T.pillow + 0.1)) + 0.5 * smooth(s01(t, T.pillow + 0.1, 163.45));
  const voice = s01(t, T.voice - 0.05, T.voice + 0.15) * (1 - s01(t, T.through + 0.3, T.the37));
  const breath = 0.5 + 0.5 * Math.sin((t - 162) * Math.PI * 2 * 0.2 - Math.PI / 2);
  /** the eye's red light in the haze: grows as it opens */
  const corona = smooth(s01(open, 0.08, 1));
  return {open, talk: 0.55 * voice, breath, speak: speech(t), voice, corona};
};

const bump = (t: number, c: number, w: number) => {
  const x = (t - c) / w;
  return Math.abs(x) >= 1 ? 0 : Math.pow(Math.cos((x * Math.PI) / 2), 2);
};
/** "Is that you?" as three pupil pulses, one per sung syllable (is 164.18, that 164.24, you 164.50–164.94) */
export const speech = (t: number) =>
  Math.min(1, 0.75 * bump(t, T.is + 0.04, 0.09) + 0.9 * bump(t, T.that + 0.12, 0.16) + 1.0 * bump(t, T.you + 0.2, 0.32));

/**
 * World time for everything that drifts (sea swell, haze noise, the iris scan): it runs normally, then slows to a near
 * standstill in the near-silence, so from 162.0 nothing moves but his breath and the eye.
 */
export const stillTime = (t: number) => (t < 162 ? t : 162 + (t - 162) * 0.1);
/** the sea calms as the silence falls */
export const swellAt = (t: number) => 1 - 0.55 * smooth(s01(t, 160.5, 162.0));

/** his breath: 0..1 (slow, ~5 s), a tiny shoulder/chest rise on the still silhouette */
export const breathAt = (t: number) => 0.5 + 0.5 * Math.sin((t - 155) * Math.PI * 2 * 0.21);
