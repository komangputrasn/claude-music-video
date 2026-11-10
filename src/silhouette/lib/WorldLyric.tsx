/**
 * <WorldLyric> — the lyrics live INSIDE the world in the TERMS cut (no caption overlay). Each sung line is staged
 * diegetically by the scene that owns it: light projected onto fog, a TENURE screen, a stencil on concrete, the page
 * in the printer, letters standing black against the dawn… Words appear one at a time (hard on, no wipe) exactly as
 * they are sung (src/data/lyrics.json). Control words (buy, plan, upgrade, cancel, locked, tier, plus, patent, fee,
 * declined) are authRed and flash on their onset; in the final chorus good/own/paper/bowl/ground are dawnGold.
 *
 *   <WorldLyric line={12} time={songT} size?={0.5} mode?='light'|'screen'|'paint'|'dark' maxWidth?={8}
 *               align?='center'|'left'|'right' anchor?='center'|'top'|'bottom'|'baseline' color?={S.bone} intensity?={1.1}
 *               from? until? reveal?='word'|'line' halo?={0.35} fog? opacity? flicker? perWord? font?
 *               lineHeight?={1.18} tracking?={0.15}
 *               rows? rowScale? verbatim?={false} glow? redFill?={0} goldGlow?={1} mirror?={true} {...group}/>
 *
 *   line       lyric line index (src/data/lyrics.json / DESIGN.md §6). Or pass `text` for non-sung text.
 *   time       song seconds (useSongTime()).
 *   size       font size (em) in METRES. Cap height ≈ 0.7·size. Use metresForPx() to size for legibility:
 *              keep the cap height ≥ ~26 px on the 1080 frame (em ≥ ~38 px) — 50–90 px reads comfortably.
 *   mode       'light'  additive light (projected on haze/walls; glows slightly, ignores fog; soft halo) — default
 *              'screen' emissive, opaque letters on a TENURE screen (no fog)
 *              'paint'  matte paint/print on a surface (receives fog, never blooms: stencils, the paper page)
 *              'dark'   black letters standing as silhouettes against a bright background (fog, no glow);
 *                       control/gold words stay black but get a glow of their colour behind them
 *   maxWidth   wrap width in metres (balanced rows). Omit = one row. Ignored when `rows` is given.
 *   anchor     where the origin sits on the block: 'center' | 'top' (cap line of row 0) | 'bottom' (baseline of the
 *              last row) | 'baseline' (baseline of row 0).
 *   from/until visibility window in song seconds. Default: from the first sung word until the next line's first word
 *              (or line end + 1.2 s). Words still appear one at a time inside the window (reveal 'word').
 *   reveal     'word' (default) or 'line' (the whole line at once at the line's first sung word).
 *   perWord    (i, info) => ({offset?:[x,y,z], rotation?:[x,y,z], scale?, opacity?, visible?}) per-word animation hook
 *              (e.g. words drifting off as ash, letters falling). i = the word's index in the line (or in `text`);
 *              info = {text, start, since, row, col, x, y, width, rowX, rowWidth, rowStart} (x, y = the word's left
 *              baseline point in the block; rowX/rowWidth = its row's left edge/width; rowStart = onset of the row's
 *              first word).
 *   flicker    0..1 deterministic failing-light flicker (Final: red text dying).
 *   --- opt-in extras (defaults reproduce the plain behaviour above exactly) ---
 *   rows       explicit line breaks: word indices per row, e.g. [[0, 1, 2], [3, 4]]. Words not listed are hidden (not
 *              laid out). Same spacing/align/anchor/lineHeight/baseline convention as the balanced wrap; a row that
 *              lists the same words as the wrap renders identically. Split one line across several <WorldLyric>s (each
 *              listing a subset) to flank a door, a dial… Timing is untouched (each word still appears when sung).
 *   rowScale   with `rows`: size multiplier per row (default 1), e.g. [1, 1, 2.1]. Row pitch = lineHeight·size·max(the two
 *              rows' scales); anchor 'top'/'baseline' use row 0's scaled cap height.
 *   verbatim   custom `text` is drawn exactly as given (case and every character kept: "03:15", "$4.99 / NIGHT").
 *              Default false = displayWord() (upper-cased, quotes/commas/periods/semicolons/colons stripped). Ignored
 *              for sung `line`s.
 *   glow       (i, info) => 0..1 colour of a control/free (red/gold) word; called for those words only. 1 = full colour,
 *              in between = the flash/glow multiplier scaled down, 0 = the word loses its colour (dark: a plain black
 *              letter; light/screen/paint: falls back to the base colour) but stays visible. Final: the last red dies.
 *   redFill    'light'/'dark' modes: > 0 draws control (authRed) words as SOLID authRed letters (normal blending,
 *              brightness redFill (×0.8 in dark), only a faint red halo) instead of additive red light / a red glow
 *              behind a black letter. Use on gold/bright haze, where additive red tone-maps ORANGE. 0 (default) = off.
 *   goldGlow   'dark' mode: multiplier on the gold glow behind gold words (default 1 = capped at 2× gold; > 1 burns
 *              hotter on a bright gold sky).
 *   mirror     false = the words are invisible to every camera other than the scene's default camera (WetGround's
 *              reflection, render targets): for text high in the sky whose mirror image would land somewhere unrelated.
 * Origin: the anchor point of the text block; text faces +Z, reads left→right along +X.
 *
 * Also exported: sceneLyricLines(t0, t1) (the lines a scene must stage), lyricWindow(i), lyricWordColor(),
 * metresForPx(px, distance, fovDeg), measureLyric(i|text, size, maxWidth, {rows, rowScale, verbatim, …}) →
 * {width, height, rows, rowWidths, rowWords} (rowWords = the balanced wrap's word indices per row).
 * Deterministic; glyph textures are cached per word (drawn once, synchronously, with system fonts).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {LINES} from '../../lib/lyrics';
import {S, SFONTS, RED_WORDS, GOLD_WORDS} from './palette';

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
const RED = new Set<string>(RED_WORDS);
const GOLD = new Set<string>(GOLD_WORDS);

/** Display form of a sung word: uppercase, quotes/commas/periods/semicolons removed (keeps ? ' and digits). */
export const displayWord = (w: string) => w.replace(/["“”,.;:]/g, '').toUpperCase();

/** Colour of a word: authRed for control words (brighter for 0.22 s after onset), dawnGold for the final's free words. */
export const lyricWordColor = (word: string, section: string, since: number, base: string = S.bone) => {
  const w = clean(word);
  if (section === 'final' && GOLD.has(w)) return {color: S.dawnGold, special: true, flash: 1};
  if (RED.has(w)) return {color: S.authRed, special: true, flash: since < 0.22 ? 1.45 : 1};
  return {color: base, special: false, flash: 1};
};

/** Default on-screen window of a line: first sung word → next line's first word (or end + 1.2 s). */
export const lyricWindow = (i: number): [number, number] => {
  const L = LINES[i];
  const start = L.words[0]?.start ?? L.start;
  const next = i + 1 < LINES.length ? (LINES[i + 1].words[0]?.start ?? LINES[i + 1].start) : Infinity;
  return [start, Math.min(next, L.end + 1.2)];
};

/** Lyric lines a scene spanning song seconds [t0, t1) must stage: any line with a word sung in [t0 − 0.1, t1). */
export const sceneLyricLines = (t0: number, t1: number) =>
  LINES.filter((L) => L.words.some((w) => w.start >= t0 - 0.1 && w.start < t1)).map((L) => L.i);

/** World size (m) that projects to `px` pixels (of the 1080-high frame) at `distance` m for a camera fov (deg). */
export const metresForPx = (px: number, distance: number, fovDeg: number) =>
  (px * 2 * distance * Math.tan((fovDeg * Math.PI) / 360)) / 1080;

// ------------------------------------------------------------------------------------------------ glyph cache
const PX = 112; // glyph raster em size
type Glyph = {tex: THREE.CanvasTexture; halo: THREE.CanvasTexture; w: number; h: number; base: number; adv: number};
const glyphCache = new Map<string, Glyph>();
let measureCtx: CanvasRenderingContext2D | null = null;
const fontCss = (font: string, weight: number) => `${weight} ${PX}px ${font}`;
const getCtx = () => (measureCtx ??= document.createElement('canvas').getContext('2d')!);

const textAdvance = (text: string, font: string, weight: number, tracking: number) => {
  const ctx = getCtx();
  ctx.font = fontCss(font, weight);
  (ctx as unknown as {letterSpacing: string}).letterSpacing = `${tracking * PX}px`;
  return ctx.measureText(text).width;
};

const getGlyph = (text: string, font: string, weight: number, tracking: number): Glyph => {
  const key = `${text}|${font}|${weight}|${tracking}`;
  let g = glyphCache.get(key);
  if (g) return g;
  const adv = textAdvance(text, font, weight, tracking);
  const padX = Math.round(PX * 0.35);
  const padY = Math.round(PX * 0.3);
  const ascent = Math.round(PX * 0.95);
  const descent = Math.round(PX * 0.3);
  const W = Math.max(4, Math.ceil(adv + padX * 2));
  const H = ascent + descent + padY * 2;
  const draw = (blur: number) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.font = fontCss(font, weight);
    (ctx as unknown as {letterSpacing: string}).letterSpacing = `${tracking * PX}px`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    ctx.fillText(text, padX, padY + ascent);
    if (blur > 0) {
      ctx.filter = `blur(${blur * 2.2}px)`;
      ctx.globalAlpha = 0.6;
      ctx.fillText(text, padX, padY + ascent);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  };
  g = {tex: draw(0), halo: draw(PX * 0.09), w: W / PX, h: H / PX, base: (padY + ascent) / PX, adv: adv / PX};
  glyphCache.set(key, g);
  return g;
};

// ------------------------------------------------------------------------------------------------ layout
export type LyricAlign = 'center' | 'left' | 'right';
export type LyricAnchor = 'center' | 'top' | 'bottom' | 'baseline';
type Item = {text: string; raw: string; start: number; idx: number; glyph: Glyph; adv: number};
type LaidWord = {
  text: string; raw: string; start: number; idx: number; row: number; col: number; x: number; y: number; width: number;
  /** em size of the word's row (size × rowScale) */
  size: number; rowX: number; rowWidth: number; rowStart: number; glyph: Glyph;
};
type LayoutOpts = {rows?: number[][]; rowScale?: number[]; verbatim?: boolean};

const layout = (
  words: {text: string; start: number}[], size: number, maxWidth: number | undefined, align: LyricAlign,
  anchor: LyricAnchor, lineHeight: number, font: string, weight: number, tracking: number, opts: LayoutOpts = {},
) => {
  const space = 0.42; // em
  const mkItem = (w: {text: string; start: number}, idx: number): Item => {
    const text = opts.verbatim ? w.text : displayWord(w.text);
    const glyph = getGlyph(text, font, weight, tracking);
    return {text, raw: w.text, start: w.start, idx, glyph, adv: glyph.adv};
  };
  let rows: Item[][];
  if (opts.rows) {
    // explicit rows: word indices per row; unlisted words are not laid out (hidden)
    rows = opts.rows.map((r) => r.filter((i) => Number.isInteger(i) && i >= 0 && i < words.length).map((i) => mkItem(words[i], i)));
    if (!rows.length) rows = [[]];
  } else {
    const items = words.map((w, i) => mkItem(w, i));
    const total = items.reduce((a, it, i) => a + it.adv + (i ? space : 0), 0);
    const maxEm = maxWidth ? maxWidth / size : Infinity;
    const nRows = Math.max(1, Math.ceil(total / maxEm));
    const target = total / nRows;
    // balanced greedy wrap: aim for equal rows of ~total/nRows, never wider than maxWidth
    const limit = Math.min(maxEm, target * 1.08);
    rows = [[]];
    let cur = 0;
    for (const it of items) {
      const row = rows[rows.length - 1];
      const add = (row.length ? space : 0) + it.adv;
      if (row.length && cur + add > limit) {
        rows.push([it]);
        cur = it.adv;
      } else {
        row.push(it);
        cur += add;
      }
    }
  }
  const scaled = !!(opts.rows && opts.rowScale);
  const sc = (ri: number) => (scaled ? opts.rowScale![ri] ?? 1 : 1);
  const rowW = rows.map((r) => r.reduce((a, it, i) => a + it.adv + (i ? space : 0), 0));
  const width = Math.max(...rowW.map((w, ri) => w * sc(ri))) * size;
  const capH = 0.7;
  // baseline drop (em) of each row below row 0 when rows are scaled: pitch = lineHeight × the larger of the two scales
  const drop: number[] = [];
  rows.forEach((_, ri) => drop.push(ri ? drop[ri - 1] + lineHeight * Math.max(sc(ri - 1), sc(ri)) : 0));
  const cap0 = scaled ? capH * sc(0) * size : capH * size;
  const height = scaled ? drop[rows.length - 1] * size + cap0 : ((rows.length - 1) * lineHeight + capH) * size;
  // baseline of row 0 relative to the anchor
  const top = anchor === 'top' ? 0 : anchor === 'bottom' ? height : anchor === 'baseline' ? cap0 : height / 2;
  const laid: LaidWord[] = [];
  rows.forEach((r, ri) => {
    const sz = size * sc(ri);
    let x = align === 'left' ? 0 : align === 'right' ? -rowW[ri] * sz : (-rowW[ri] * sz) / 2;
    const y = scaled ? top - cap0 - drop[ri] * size : top - capH * size - ri * lineHeight * size;
    const rowX = x;
    const rowWidth = rowW[ri] * sz;
    const rowStart = r[0]?.start ?? -Infinity;
    r.forEach((it, wi) => {
      if (wi) x += space * sz;
      laid.push({
        text: it.text, raw: it.raw, start: it.start, idx: it.idx, row: ri, col: wi, x, y, width: it.adv * sz, size: sz, rowX,
        rowWidth, rowStart, glyph: it.glyph,
      });
      x += it.adv * sz;
    });
  });
  return {
    laid, width, height, rows: rows.length, rowWidths: rowW.map((w, ri) => w * sc(ri) * size),
    rowWords: rows.map((r) => r.map((it) => it.idx)),
  };
};

const textWords = (text: string, start: number) => text.split(/\s+/).filter(Boolean).map((t) => ({text: t, start}));

/**
 * Measure a lyric line (or any text) as it would be laid out (same options as the component). Returns the block
 * {width, height} (m), the row count, each row's width (m) and `rowWords` (word indices per row: the balanced wrap's
 * breaks, ready to edit and pass back as `rows`).
 */
export const measureLyric = (
  lineOrText: number | string, size = 1, maxWidth?: number,
  opts: {font?: string; weight?: number; tracking?: number; lineHeight?: number; rows?: number[][]; rowScale?: number[]; verbatim?: boolean} = {},
) => {
  const isLine = typeof lineOrText === 'number';
  const words = isLine ? LINES[lineOrText].words.map((w) => ({text: w.text, start: w.start})) : textWords(lineOrText, 0);
  const r = layout(words, size, maxWidth, 'center', 'center', opts.lineHeight ?? 1.18, opts.font ?? SFONTS.futura, opts.weight ?? 500,
    opts.tracking ?? 0.15, {rows: opts.rows, rowScale: opts.rowScale, verbatim: !isLine && !!opts.verbatim});
  return {width: r.width, height: r.height, rows: r.rows, rowWidths: r.rowWidths, rowWords: r.rowWords};
};

// ------------------------------------------------------------------------------------------------ component
const PLANE = new THREE.PlaneGeometry(1, 1);
const fh = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export type WordInfo = {text: string; start: number; since: number; row: number; x: number; y: number; width: number};
/** What perWord / glow actually receive: WordInfo + the word's row slot (a callback typed with plain WordInfo still fits). */
export type RowWordInfo = WordInfo & {
  /** position of the word in its row (0 = first) */
  col: number;
  /** left edge (m) and width (m) of the word's row, in the block's local space */
  rowX: number; rowWidth: number;
  /** onset (song s) of the row's first word (-Infinity for custom text) */
  rowStart: number;
};
export type WordFx = {offset?: [number, number, number]; rotation?: [number, number, number]; scale?: number; opacity?: number; visible?: boolean};

export type WorldLyricProps = {
  line?: number;
  /** custom (non-sung) text instead of a lyric line; all words appear at `from` (or always) */
  text?: string;
  time: number;
  size?: number;
  mode?: 'light' | 'screen' | 'paint' | 'dark';
  maxWidth?: number;
  align?: LyricAlign;
  anchor?: LyricAnchor;
  color?: string;
  intensity?: number;
  from?: number;
  until?: number;
  reveal?: 'word' | 'line';
  halo?: number;
  fog?: boolean;
  opacity?: number;
  flicker?: number;
  perWord?: (i: number, info: RowWordInfo) => WordFx;
  font?: string;
  weight?: number;
  lineHeight?: number;
  tracking?: number;
  renderOrder?: number;
  /** explicit rows: word indices per row (words not listed are hidden); overrides maxWidth */
  rows?: number[][];
  /** with `rows`: size multiplier per row (default 1) */
  rowScale?: number[];
  /** custom `text` drawn exactly as given (no upper-casing, no punctuation stripping); default false */
  verbatim?: boolean;
  /** 0..1 colour of each control/free (red/gold) word: 0 = loses its colour (stays visible) */
  glow?: (i: number, info: RowWordInfo) => number;
  /** 'light'/'dark': > 0 = control words as solid authRed letters at this brightness (default 0 = off) */
  redFill?: number;
  /** 'dark': multiplier on the gold glow behind gold words (default 1) */
  goldGlow?: number;
  /** false = not drawn into reflections / any camera other than the default camera (default true) */
  mirror?: boolean;
} & Omit<React.ComponentProps<'group'>, 'children'>;

type BeforeRender = (r: THREE.WebGLRenderer, s: THREE.Scene, cam: THREE.Camera, g: THREE.BufferGeometry, mat: THREE.Material) => void;

export const WorldLyric: React.FC<WorldLyricProps> = ({
  line, text, time, size = 0.5, mode = 'light', maxWidth, align = 'center', anchor = 'center', color, intensity, from, until,
  reveal = 'word', halo, fog, opacity = 1, flicker = 0, perWord, font = SFONTS.futura, weight = 500, lineHeight = 1.18,
  tracking = 0.15, renderOrder, rows, rowScale, verbatim = false, glow, redFill = 0, goldGlow = 1, mirror = true, ...group
}) => {
  const mainCam = useThree((st) => st.camera);
  // mirror={false}: hide from reflection cameras; each glyph material carries its intended opacity in userData.op
  const brProps = useMemo((): {onBeforeRender?: BeforeRender} => (mirror ? {} : {
    onBeforeRender: (_r, _s, cam, _g, mat) => {
      mat.opacity = cam === mainCam ? (mat.userData.op ?? 1) : 0;
    },
  }), [mirror, mainCam]);
  const section = line !== undefined ? LINES[line].section : '';
  const words = useMemo(
    () => (line !== undefined ? LINES[line].words.map((w) => ({text: w.text, start: w.start})) : textWords(text ?? '', -Infinity)),
    [line, text],
  );
  const vb = verbatim && line === undefined;
  // rows / rowScale are usually inline array literals: key the layout on their contents, not their identity
  const rowsKey = rows ? JSON.stringify(rows) : '';
  const scaleKey = rowScale ? JSON.stringify(rowScale) : '';
  const L = useMemo(
    () => layout(words, size, maxWidth, align, anchor, lineHeight, font, weight, tracking, {rows, rowScale, verbatim: vb}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [words, size, maxWidth, align, anchor, lineHeight, font, weight, tracking, rowsKey, scaleKey, vb],
  );
  const additive = mode === 'light';
  const useFog = fog ?? (mode === 'paint' || mode === 'dark');
  const mats = useMemo(
    () =>
      L.laid.map((w) => {
        const mk = (map: THREE.Texture, add: boolean) =>
          new THREE.MeshBasicMaterial({
            map, transparent: true, depthWrite: false, fog: useFog,
            blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: true,
          });
        return {main: mk(w.glyph.tex, additive), halo: mk(w.glyph.halo, true)};
      }),
    [L, additive, useFog],
  );
  useLayoutEffect(() => () => mats.forEach((m) => {
    m.main.dispose();
    m.halo.dispose();
  }), [mats]);

  const [w0, w1] = line !== undefined ? lyricWindow(line) : [-Infinity, Infinity];
  const winFrom = from ?? w0;
  const winUntil = until ?? w1;
  const inWindow = time >= winFrom && time < winUntil;
  const base = color ?? (mode === 'dark' ? S.void : S.bone);
  const baseI = intensity ?? (mode === 'light' ? 1.1 : mode === 'screen' ? 1.0 : mode === 'paint' ? 0.85 : 1);
  const haloK = halo ?? (mode === 'light' ? 0.35 : mode === 'screen' ? 0.15 : 0);
  // failing-light flicker (stepped, deterministic)
  const fl = flicker > 0 ? 1 - flicker * (fh(Math.floor(time * 24)) < flicker * 0.8 ? 1 : 0.15) : 1;
  // reveal 'line': the whole block appears at the line's first sung word (also when `rows` hides that word)
  const firstStart = words[0]?.start ?? -Infinity;

  const state = L.laid.map((w) => {
    const i = w.idx;
    const on = inWindow && (reveal === 'line' ? time >= firstStart || line === undefined : time >= w.start || line === undefined);
    const since = time - w.start;
    const info: RowWordInfo = {
      text: w.text, start: w.start, since, row: w.row, x: w.x, y: w.y, width: w.width, col: w.col, rowX: w.rowX,
      rowWidth: w.rowWidth, rowStart: w.rowStart,
    };
    const c0 = lyricWordColor(w.raw, section, since, base);
    const gk = glow && c0.special ? Math.max(0, Math.min(1, glow(i, info))) : 1;
    const c = gk >= 1 ? c0 : gk <= 0 ? {color: base, special: false, flash: 1} : {...c0, flash: c0.flash * gk};
    const fx = perWord ? perWord(i, info) : {};
    return {on: on && fx.visible !== false, c, fx};
  });

  useLayoutEffect(() => {
    state.forEach((s, i) => {
      const m = mats[i];
      if (!m) return;
      const op = opacity * (s.fx.opacity ?? 1);
      const isRed = s.c.special && s.c.color === S.authRed;
      const solidRed = isRed && redFill > 0 && (mode === 'dark' || mode === 'light');
      if (mode === 'dark') {
        // black letters; control/free words keep their colour as a glow BEHIND the dark letters
        // (redFill: control words become solid red letters with only a faint red glow)
        const redK = redFill * 0.8 * Math.min(1.15, s.c.flash) * fl;
        if (solidRed) m.main.color.set(S.authRed).multiplyScalar(redK);
        else m.main.color.set(base);
        m.main.blending = THREE.NormalBlending;
        const isGold = s.c.special && !isRed;
        const hk = s.c.special ? Math.max(haloK, 0.75) * s.c.flash * fl * (solidRed ? 0.3 : 1) : 0;
        const gg = isGold ? goldGlow : 1;
        m.halo.color.set(s.c.color).multiplyScalar(Math.min(2 * gg, 1.6 * hk * gg));
        m.halo.visible = hk > 0.001;
      } else if (solidRed) {
        // solid red letter: never added onto bright/gold haze (that reads orange); the glow drain (flash → 0) darkens it
        const redK = redFill * 1 * Math.min(1.15, s.c.flash) * fl;
        m.main.color.set(S.authRed).multiplyScalar(redK);
        m.main.blending = THREE.NormalBlending;
        const hk = haloK * 0.45;
        m.halo.color.set(S.authRed).multiplyScalar(Math.min(1.2, redK) * hk);
        m.halo.visible = hk > 0.001;
      } else {
        const k = baseI * s.c.flash * fl;
        m.main.color.set(s.c.color).multiplyScalar(Math.min(2, k));
        m.main.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
        const hk = haloK * (s.c.special ? 1.4 : 1);
        m.halo.color.set(s.c.color).multiplyScalar(Math.min(2, k) * hk);
        m.halo.visible = hk > 0.001;
      }
      m.main.opacity = op;
      m.halo.opacity = op;
      m.main.userData.op = op;
      m.halo.userData.op = op;
    });
  });

  if (!inWindow) return null;
  return (
    <group {...group}>
      {L.laid.map((w, i) => {
        const s = state[i];
        if (!s.on) return null;
        const g = w.glyph;
        const sz = w.size;
        const pw = g.w * sz;
        const ph = g.h * sz;
        // canvas → plane: left edge at x - padX, baseline at w.y
        const cx = w.x - (g.w - g.adv) * sz * 0.5 + pw / 2;
        const cy = w.y + (g.base - g.h / 2) * sz;
        const o = s.fx.offset ?? [0, 0, 0];
        const sc = s.fx.scale ?? 1;
        return (
          <group key={i} position={[cx + o[0], cy + o[1], o[2]]} rotation={s.fx.rotation ?? [0, 0, 0]} scale={sc}>
            {haloK > 0 || mode === 'dark' ? <mesh geometry={PLANE} material={mats[i].halo} scale={[pw, ph, 1]} position={[0, 0, -0.001]} renderOrder={renderOrder} {...brProps} /> : null}
            <mesh geometry={PLANE} material={mats[i].main} scale={[pw, ph, 1]} renderOrder={renderOrder} {...brProps} />
          </group>
        );
      })}
    </group>
  );
};
