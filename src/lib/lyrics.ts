// Word-timed lyrics (aligned from the actual vocal). Use for captions and for syncing story beats to words.
import data from '../data/lyrics.json';

export type Word = {text: string; start: number; end: number};
export type Line = {i: number; section: string; text: string; start: number; end: number; words: Word[]};
export const LINES: Line[] = (data as {lines: Line[]}).lines;

/** The line being sung at song time t (holds the previous line through short gaps up to `hold` s). */
export const lineAt = (t: number, hold = 0.6): Line | null => {
  for (let k = LINES.length - 1; k >= 0; k--) {
    const L = LINES[k];
    if (t < L.start - 0.05) continue;
    const nextStart = k + 1 < LINES.length ? LINES[k + 1].start : Infinity;
    return t <= L.end + hold && t < nextStart - 0.05 ? L : null;
  }
  return null;
};

/** Find the time (s) a word is sung: first occurrence of `word` (case-insensitive, punctuation ignored) in line `lineIndex`. */
export const wordTime = (lineIndex: number, word: string, occurrence = 0): number => {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  const L = LINES[lineIndex];
  let n = 0;
  for (const w of L.words) if (clean(w.text) === clean(word) && n++ === occurrence) return w.start;
  throw new Error(`word "${word}" not in line ${lineIndex}: ${L.text}`);
};

/** All lines of a section: verse1 | pre | chorus1 | verse2 | swing | cancel | hold | final */
export const linesOf = (section: string) => LINES.filter((l) => l.section === section);
