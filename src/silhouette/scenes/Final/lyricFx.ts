// TERMS · Final — per-word animation for <WorldLyric>: in the final chorus red is only ever dying. Control words
// (BUY, UPGRADE, CANCEL, CANCELLED) appear authRed exactly when sung, hold long enough to read, then stutter like a
// failing sign and FALL out of the line (rotate about their base, drop, fade). Free words stay.
import {measureLyric} from '../../lib/WorldLyric';
import type {WordFx, WordInfo} from '../../lib/WorldLyric';
import {LINES} from '../../../lib/lyrics';
import {noise1, rand} from '../../../lib/time';
import {isRedWord} from './timing';

export type DyingOpts = {
  /** seconds the red word holds after its onset before it starts to fail */
  hold?: number;
  /** seconds of stutter before the fall */
  stutter?: number;
  /** em size of the lyric (metres): scales the fall distance */
  size: number;
  /** fall direction: 1 = drops down and tips toward camera, -1 = tips away */
  dir?: 1 | -1;
  /** extra global time offset for per-shot variation */
  seed?: number;
};

/** perWord hook factory: red words die and fall; everything else untouched. */
export const dyingRed = (t: number, o: DyingOpts) => (i: number, w: WordInfo): WordFx => {
  if (!isRedWord(w.text)) return {};
  const hold = o.hold ?? 0.6;
  const stutter = o.stutter ?? 0.35;
  const s = t - w.start;
  if (s < hold) return {};
  if (s < hold + stutter) {
    const f = Math.floor(t * 30);
    const on = rand(`dy-${o.seed ?? 0}-${i}-${f}`) > 0.45;
    return {opacity: on ? 1 : 0.12};
  }
  const k = s - hold - stutter; // seconds of fall
  const g = 9.0 * o.size; // gravity in em/s² (scaled to the text)
  const dir = o.dir ?? 1;
  const drop = 0.5 * g * k * k;
  const tw = noise1(i * 3.1 + 0.5, (o.seed ?? 0) + 11) * 0.5;
  // short fall (~0.65 s): the word is gone before it reaches the row below (no "UPGRADE" smeared over "CONTINUE",
  // no red smear over the house roof)
  const FALL = 0.65;
  return {
    offset: [tw * k * o.size, -drop, dir * k * o.size * 0.6],
    rotation: [dir * Math.min(1.5, k * k * 2.6), 0, tw * k * 0.9],
    opacity: Math.max(0, 1 - k / FALL) ** 1.4,
    visible: k < FALL,
  };
};

/** <FinalLyric glow> hook: a red word's colour holds, stutters like a failing sign, then is gone (the word stays, black) */
export const redGlowDies = (t: number, hold = 0.9, stutter = 0.45, seed = 0) => (i: number, w: WordInfo) => {
  if (!isRedWord(w.text)) return 1;
  const s = t - w.start;
  if (s < hold) return 1;
  if (s < hold + stutter) return rand(`gd-${seed}-${i}-${Math.floor(t * 30)}`) > 0.5 ? 1 : 0.1;
  return 0;
};

/** compose several perWord hooks: offsets add, opacities multiply, visibility ANDs, later rotation/scale win */
export const composeFx = (...fns: ((i: number, w: WordInfo) => WordFx)[]) => (i: number, w: WordInfo): WordFx =>
  fns.reduce<WordFx>((a, fn) => {
    const b = fn(i, w);
    const ao = a.offset ?? [0, 0, 0];
    const bo = b.offset ?? [0, 0, 0];
    return {
      offset: [ao[0] + bo[0], ao[1] + bo[1], ao[2] + bo[2]],
      rotation: b.rotation ?? a.rotation,
      scale: b.scale ?? a.scale,
      opacity: (a.opacity ?? 1) * (b.opacity ?? 1),
      visible: (a.visible ?? true) && (b.visible ?? true),
    };
  }, {});

/**
 * Open a gap in a one-row lyric between word `at − 1` and word `at` (e.g. to stand the line on both sides of a figure).
 * Returns the group x that centres the gap on the origin, and the perWord offset hook.
 */
export const splitGap = (line: number, at: number, em: number, gap: number) => {
  const words = LINES[line].words.map((w) => w.text);
  const W = measureLyric(line, em).width;
  const w1 = measureLyric(words.slice(0, at).join(' '), em).width;
  const xs = -W / 2 + w1 + 0.21 * em;
  return {x: -xs, fx: (i: number): WordFx => ({offset: [i < at ? -gap / 2 : gap / 2, 0, 0]})};
};
