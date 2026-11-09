// Final timing: scene-local frames for every lyric word / beat we sync to, plus a word-driven lip-sync curve.
// Scene-local frame 0 = song frame 4992 (166.40 s). All functions are pure.
import {LINES, wordTime} from '../../lib/lyrics';
import {BEATS, DOWNBEATS, beatAt} from '../../lib/time';

export const FROM = 4992;
export const DUR = 6126 - 4992; // 1134
/** song seconds -> scene-local frame (float) */
export const lf = (t: number) => t * 30 - FROM;
/** scene-local frame -> song seconds */
export const songT = (f: number) => (FROM + f) / 30;
/** scene-local frame of a sung word */
export const W = (line: number, word: string, occ = 0) => lf(wordTime(line, word, occ));

/** local frames of the beats / downbeats inside the scene */
export const LBEATS = BEATS.map(lf).filter((x) => x > -20 && x < DUR + 20);
export const LDOWN = DOWNBEATS.map(lf).filter((x) => x > -20 && x < DUR + 20);
/** beat info at a scene-local frame */
export const beatL = (f: number, decay = 9) => beatAt(songT(f), decay);
/** nearest beat (local frame, rounded) to a local frame */
export const snapBeat = (f: number) => Math.round(LBEATS.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a), LBEATS[0]));

/** key word frames (local, float) */
export const K = {
  // [38]
  you1: W(38, 'you'), said1: W(38, 'said'), buy1: W(38, 'buy'), now1: W(38, 'now'), but1: W(38, 'but'), good1: W(38, 'good'), for1: W(38, 'for'),
  now1b: W(38, 'now', 1),
  // [39]
  got: W(39, 'got'), paper: W(39, 'paper'), y1984: W(39, '1984'), they: W(39, 'they'), cant: W(39, "can't"), take: W(39, 'take'), down: W(39, 'down'),
  // [40]
  im1: W(40, "i'm"), done1: W(40, 'done'), upgrade1: W(40, 'upgrade'), to1: W(40, 'to'), continue1: W(40, 'continue'),
  // [41]
  click1: W(41, 'click'), cancel1: W(41, 'cancel'), i1: W(41, 'i'), cancelled1: W(41, 'cancelled'), youEnd1: W(41, 'you'),
  // [42]
  you2: W(42, 'you'), said2: W(42, 'said'), buy2: W(42, 'buy'), now2: W(42, 'now'), but2: W(42, 'but'), good2: W(42, 'good'), for2: W(42, 'for'),
  now2b: W(42, 'now', 1),
  // [43]
  and: W(43, 'and'), pancake: W(43, 'pancake'), eats: W(43, 'eats'), breakfast: W(43, 'breakfast'), from: W(43, 'from'), bowl: W(43, 'bowl'),
  ground: W(43, 'ground'),
  // [44]
  im2: W(44, "i'm"), done2: W(44, 'done'), upgrade2: W(44, 'upgrade'), to2: W(44, 'to'), continue2: W(44, 'continue'),
  // [45]
  click2: W(45, 'click'), cancel2: W(45, 'cancel'), i2: W(45, 'i'), cancelled2: W(45, 'cancelled'), youEnd2: W(45, 'you'),
};

// ------------------------------------------------------------------ lip sync
type SyncWord = {s: number; e: number; syl: number; open: number};
const syllables = (w: string) => {
  if (/\d/.test(w)) return 6; // "nineteen eighty-four"
  const m = w.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g);
  return Math.max(1, m ? m.length : 1);
};
const WORDS: SyncWord[] = LINES.slice(38, 46).flatMap((L) =>
  L.words.map((w) => {
    const clean = w.text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const open = /o|a|\d/.test(clean) ? 1 : /e|i|u/.test(clean) ? 0.8 : 0.6;
    return {s: w.start, e: Math.min(w.end, w.start + 1.4), syl: syllables(w.text), open};
  }),
);

/** 0..1 mouth opening for the Guy singing the final chorus at song time t (seconds). */
export const lipSync = (t: number): number => {
  let v = 0;
  for (const w of WORDS) {
    if (t < w.s - 0.05 || t > w.e + 0.1) continue;
    const dur = Math.max(0.12, w.e - w.s);
    const u = Math.max(0, Math.min(0.999, (t - w.s) / dur));
    const k = u * w.syl;
    const ph = k - Math.floor(k);
    const shape = Math.pow(Math.sin(Math.min(1, ph * 1.15) * Math.PI), 0.6);
    const held = dur / w.syl > 0.35 ? 0.55 : 0;
    const attack = Math.min(1, (t - w.s + 0.05) / 0.07);
    const release = t > w.e ? Math.max(0, 1 - (t - w.e) / 0.1) : 1;
    const val = (0.3 + 0.7 * Math.max(shape, held)) * w.open * attack * release;
    v = Math.max(v, val);
  }
  return Math.max(0, Math.min(1, v));
};
