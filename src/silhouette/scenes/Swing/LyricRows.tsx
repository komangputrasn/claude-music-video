/**
 * <LyricRows> — LOCAL helper for Swing (not a lib change). The shared <WorldLyric> wraps a line into balanced rows by
 * itself; here a shot needs explicit rows (a line split around the hammer's arc, a two-row block on a wall). It lays the
 * line out on one row through <WorldLyric> and uses `perWord` to move each word to its row/column slot (and hide words
 * not listed). Same glyphs, timing, red-word flash and modes: each word still appears exactly when it is sung.
 *
 *   <LyricRows line={28} time={t} rows={[[0, 1], [2, 3, 4, 5, 6]]} align="center" anchor="center" size={0.2}
 *              rowGap?={1.18} fx?={(i, info, slot) => ({offset, opacity…})} {...WorldLyric props}/>
 */
import React, {useMemo} from 'react';
import {WorldLyric, WorldLyricProps, WordFx, WordInfo, measureLyric} from '../../lib/WorldLyric';
import {SFONTS} from '../../lib/palette';
import {LINES} from '../../../lib/lyrics';

export type LyricRowsProps = Omit<WorldLyricProps, 'perWord' | 'maxWidth' | 'align' | 'anchor' | 'line' | 'text'> & {
  line: number;
  /** word indices per row */
  rows: number[][];
  align?: 'left' | 'right' | 'center';
  anchor?: 'top' | 'center' | 'bottom';
  /** row pitch in em (default = lineHeight) */
  rowGap?: number;
  /** extra per-word animation on top of the slot (row index + slot position given) */
  fx?: (i: number, info: WordInfo, slot: {row: number; x: number; y: number}) => WordFx;
};

const SPACE = 0.42; // em: WorldLyric's word gap
const CAP = 0.7;

export const LyricRows: React.FC<LyricRowsProps> = ({
  line, rows, align = 'center', anchor = 'center', rowGap, fx, size = 0.5, font = SFONTS.futura, weight = 500, tracking = 0.15,
  lineHeight = 1.18, ...rest
}) => {
  const slots = useMemo(() => {
    const words = LINES[line].words;
    const pitch = rowGap ?? lineHeight;
    const width = (i: number) => measureLyric(words[i].text, size, undefined, {font, weight, tracking}).width;
    const H = ((rows.length - 1) * pitch + CAP) * size;
    const top = anchor === 'top' ? 0 : anchor === 'bottom' ? H : H / 2;
    const map = new Map<number, {row: number; x: number; y: number}>();
    rows.forEach((row, r) => {
      const ws = row.map(width);
      const rowW = ws.reduce((a, w) => a + w, 0) + SPACE * size * Math.max(0, row.length - 1);
      let x = align === 'left' ? 0 : align === 'right' ? -rowW : -rowW / 2;
      const y = top - CAP * size - r * pitch * size;
      row.forEach((wi, k) => {
        map.set(wi, {row: r, x, y});
        x += ws[k] + SPACE * size;
      });
    });
    return map;
  }, [line, rows, align, anchor, size, font, weight, tracking, lineHeight, rowGap]);

  const perWord = (i: number, info: WordInfo): WordFx => {
    const s = slots.get(i);
    if (!s) return {visible: false};
    const e = fx ? fx(i, info, s) : {};
    const o = e.offset ?? [0, 0, 0];
    return {...e, offset: [s.x - info.x + o[0], s.y - info.y + o[1], o[2]]};
  };

  return (
    <WorldLyric line={line} size={size} font={font} weight={weight} tracking={tracking} lineHeight={lineHeight} align="left"
      anchor="top" perWord={perWord} {...rest} />
  );
};
