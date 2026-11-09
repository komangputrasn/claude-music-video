// Explicit word placement for <WorldLyric perWord>: put each sung word of a line into a row of your own layout
// (rows can sit anywhere: either side of a dial, on a pillar face, in a patent's text block).
import {LINES} from '../../../lib/lyrics';
import {displayWord, measureLyric, WordFx, WordInfo} from '../../lib/WorldLyric';

export type WordRow = {
  /** word indices of the line, in order */
  words: number[];
  /** row anchor x (m, in the WorldLyric's local space) */
  x: number;
  /** baseline y (m) */
  y: number;
  align?: 'center' | 'left' | 'right';
};

export type FontOpts = {font?: string; weight?: number; tracking?: number};

/** widths (m) of a row's words at `size` */
const widths = (line: number, idx: number[], size: number, o: FontOpts) =>
  idx.map((i) => measureLyric(displayWord(LINES[line].words[i].text), size, undefined, o).width);

/** width (m) of a row of words at `size` (same spacing as WorldLyric: 0.42 em) */
export const rowWidth = (line: number, idx: number[], size: number, o: FontOpts = {}) => {
  const w = widths(line, idx, size, o);
  return w.reduce((a, b) => a + b, 0) + 0.42 * size * (idx.length - 1);
};

/** perWord placing the words of `line` into `rows`; words in no row are hidden */
export const placeWords = (line: number, size: number, rows: WordRow[], o: FontOpts = {}) => {
  const target: ({x: number; y: number} | undefined)[] = [];
  const sp = 0.42 * size;
  for (const r of rows) {
    const w = widths(line, r.words, size, o);
    const total = w.reduce((a, b) => a + b, 0) + sp * (r.words.length - 1);
    const al = r.align ?? 'center';
    let x = al === 'center' ? r.x - total / 2 : al === 'left' ? r.x : r.x - total;
    r.words.forEach((i, k) => {
      target[i] = {x: x + w[k] / 2, y: r.y};
      x += w[k] + sp;
    });
  }
  return (i: number, info: WordInfo): WordFx => {
    const T = target[i];
    if (!T) return {visible: false};
    return {offset: [T.x - (info.x + info.width / 2), T.y - info.y, 0]};
  };
};
