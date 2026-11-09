/**
 * <LyricBlock> — LOCAL helper for V2Rain (not a lib change). Renders a chosen SUBSET of a lyric line's words with
 * explicit row breaks and alignment, so one sung line can be split into blocks that flank a window, a slit or a door
 * (symmetrical compositions) — something the shared <WorldLyric> balanced wrap cannot do.
 *
 * It is a thin wrapper over the shared <WorldLyric> (same glyphs, colours, red-word flash, timing, modes): it lays the
 * line out on one row (align left, anchor top) and uses `perWord` to hide the words outside `rows` and move the others
 * to their row/column slot. Timing is untouched: each word still appears exactly when it is sung.
 *
 *   <LyricBlock line={25} time={t} rows={[[0, 1, 2], [3, 4], [5]]} align="right" anchor="center" size={0.13}
 *               mode="light" position={…} rotation={…}/>
 */
import React, {useMemo} from 'react';
import {WorldLyric, WorldLyricProps, WordFx, WordInfo, measureLyric} from '../../lib/WorldLyric';
import {SFONTS} from '../../lib/palette';
import {LINES} from '../../../lib/lyrics';

export type LyricBlockProps = Omit<WorldLyricProps, 'perWord' | 'maxWidth' | 'align' | 'anchor' | 'line' | 'text'> & {
  line: number;
  /** word indices per row, e.g. [[0, 1, 2], [3, 4]] */
  rows: number[][];
  align?: 'left' | 'right' | 'center';
  anchor?: 'top' | 'center' | 'bottom';
  /** extra per-word animation, applied on top of the slot offset */
  fx?: (i: number, info: WordInfo) => WordFx;
};

const SPACE = 0.42; // em — must match WorldLyric's word gap
const CAP = 0.7;

export const LyricBlock: React.FC<LyricBlockProps> = ({
  line, rows, align = 'left', anchor = 'top', fx, size = 0.5, font = SFONTS.futura, weight = 500, tracking = 0.15,
  lineHeight = 1.18, ...rest
}) => {
  const slots = useMemo(() => {
    const words = LINES[line].words;
    const width = (i: number) => measureLyric(words[i].text, size, undefined, {font, weight, tracking}).width;
    const H = ((rows.length - 1) * lineHeight + CAP) * size;
    const top = anchor === 'top' ? 0 : anchor === 'bottom' ? H : H / 2;
    const map = new Map<number, [number, number]>();
    rows.forEach((row, r) => {
      const ws = row.map(width);
      const rowW = ws.reduce((a, w) => a + w, 0) + SPACE * size * Math.max(0, row.length - 1);
      let x = align === 'left' ? 0 : align === 'right' ? -rowW : -rowW / 2;
      const y = top - CAP * size - r * lineHeight * size;
      row.forEach((wi, k) => {
        map.set(wi, [x, y]);
        x += ws[k] + SPACE * size;
      });
    });
    return map;
  }, [line, rows, align, anchor, size, font, weight, tracking, lineHeight]);

  const perWord = (i: number, info: WordInfo): WordFx => {
    const s = slots.get(i);
    if (!s) return {visible: false};
    const e = fx ? fx(i, info) : {};
    const o = e.offset ?? [0, 0, 0];
    return {...e, offset: [s[0] - info.x + o[0], s[1] - info.y + o[1], o[2]]};
  };

  return (
    <WorldLyric
      line={line}
      size={size}
      font={font}
      weight={weight}
      tracking={tracking}
      lineHeight={lineHeight}
      align="left"
      anchor="top"
      perWord={perWord}
      {...rest}
    />
  );
};
