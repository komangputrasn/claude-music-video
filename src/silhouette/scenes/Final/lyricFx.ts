// TERMS · Final — per-word animation for <WorldLyric>: in the final chorus red is only ever dying. Control words
// (BUY, UPGRADE, CANCEL, CANCELLED) appear authRed exactly when sung, hold long enough to read, then stutter like a
// failing sign and FALL out of the line (rotate about their base, drop, fade). Free words stay.
import type {WordFx, WordInfo} from '../../lib/WorldLyric';
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
  /**
   * longest drop (em) before the falling word has faded out completely. Default: no limit (the fall fades over 0.65 s,
   * ~1.9 em). Use ~0.9 when something must stay clean below the word (S5: the house roof under the line).
   */
  maxDrop?: number;
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
  // short fall (~0.65 s, ~1.9 em): no "UPGRADE" smeared over "CONTINUE"; `maxDrop` shortens it further (the fall is
  // over once the word has dropped maxDrop em: no red smear over the house roof in S5)
  const FALL = o.maxDrop !== undefined ? Math.min(0.65, Math.sqrt((2 * o.maxDrop) / 9.0)) : 0.65;
  return {
    offset: [tw * k * o.size, -drop, dir * k * o.size * 0.6],
    rotation: [dir * Math.min(1.5, k * k * 2.6), 0, tw * k * 0.9],
    opacity: Math.max(0, 1 - k / FALL) ** 1.4,
    visible: k < FALL,
  };
};

/** <WorldLyric glow> hook: a red word's colour holds, stutters like a failing sign, then is gone (the word stays, black) */
export const redGlowDies = (t: number, hold = 0.9, stutter = 0.45, seed = 0) => (i: number, w: WordInfo) => {
  if (!isRedWord(w.text)) return 1;
  const s = t - w.start;
  if (s < hold) return 1;
  if (s < hold + stutter) return rand(`gd-${seed}-${i}-${Math.floor(t * 30)}`) > 0.5 ? 1 : 0.1;
  return 0;
};
