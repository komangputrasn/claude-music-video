// Chorus1 timing: scene-local frames for every lyric word / beat we sync to, plus a word-driven lip-sync curve.
// Scene-local frame 0 = song frame 1732 (57.73 s). All functions are pure.
import {LINES, wordTime} from '../../lib/lyrics';
import {BEATS, DOWNBEATS, beatAt} from '../../lib/time';

export const FROM = 1732;
export const DUR = 2777 - 1732; // 1045
/** song seconds -> scene-local frame (float) */
export const lf = (t: number) => t * 30 - FROM;
/** scene-local frame -> song seconds */
export const songT = (f: number) => (FROM + f) / 30;
/** scene-local frame of a sung word */
export const W = (line: number, word: string, occ = 0) => lf(wordTime(line, word, occ));

/** local frames of the beats / downbeats that fall inside the scene */
export const LBEATS = BEATS.map(lf).filter((x) => x > -20 && x < DUR + 20);
export const LDOWN = DOWNBEATS.map(lf).filter((x) => x > -20 && x < DUR + 20);
/** beat info at a scene-local frame */
export const beatL = (f: number, decay = 9) => beatAt(songT(f), decay);

/** key word frames (local) */
export const K = {
  said1: W(12, 'said'), buy1: W(12, 'buy'), now1: W(12, 'now'), meant1: W(12, 'meant'), for1: W(12, 'for'), now1b: W(12, 'now', 1),
  whole: W(13, 'whole'), house: W(13, 'house'), plan: W(13, 'plan'), somehow: W(13, 'somehow'),
  done1: W(14, 'done'), upgrade1: W(14, 'upgrade'), continue1: W(14, 'continue'),
  click1: W(15, 'click'), cancel1: W(15, 'cancel'), cancelling1: W(15, 'cancelling'), you1: W(15, 'you'),
  said2: W(16, 'said'), buy2: W(16, 'buy'), now2: W(16, 'now'), meant2: W(16, 'meant'), for2: W(16, 'for'), now2b: W(16, 'now', 1),
  dogs: W(17, "dog's"), breakfast: W(17, 'breakfast'), locked: W(17, 'locked'), box: W(17, 'box'), ground: W(17, 'ground'),
  done2: W(18, 'done'), upgrade2: W(18, 'upgrade'), continue2: W(18, 'continue'),
  click2: W(19, 'click'), cancel2: W(19, 'cancel'), cancelling2: W(19, 'cancelling'), you2: W(19, 'you'),
};

// ------------------------------------------------------------------ lip sync
type SyncWord = {s: number; e: number; syl: number; open: number};
const syllables = (w: string) => {
  const m = w.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g);
  return Math.max(1, m ? m.length : 1);
};
const WORDS: SyncWord[] = LINES.slice(12, 20).flatMap((L) =>
  L.words.map((w) => {
    const clean = w.text.toLowerCase().replace(/[^a-z]/g, '');
    // open vowels sing wider
    const open = /o|a/.test(clean) ? 1 : /e|i|u/.test(clean) ? 0.8 : 0.6;
    return {s: w.start, e: Math.min(w.end, w.start + 1.2), syl: syllables(w.text), open};
  }),
);

/** 0..1 mouth opening for the Guy singing the chorus at song time t (seconds). */
export const lipSync = (t: number): number => {
  let v = 0;
  for (const w of WORDS) {
    if (t < w.s - 0.05 || t > w.e + 0.1) continue;
    const dur = Math.max(0.12, w.e - w.s);
    const u = Math.max(0, Math.min(0.999, (t - w.s) / dur));
    const k = u * w.syl;
    const ph = k - Math.floor(k);
    // each syllable: quick open, slow close; long held vowels stay open
    const shape = Math.pow(Math.sin(Math.min(1, ph * 1.15) * Math.PI), 0.6);
    const held = dur / w.syl > 0.35 ? 0.55 : 0;
    const attack = Math.min(1, (t - w.s + 0.05) / 0.07);
    const release = t > w.e ? Math.max(0, 1 - (t - w.e) / 0.1) : 1;
    const val = (0.3 + 0.7 * Math.max(shape, held)) * w.open * attack * release;
    v = Math.max(v, val);
  }
  return Math.max(0, Math.min(1, v));
};
