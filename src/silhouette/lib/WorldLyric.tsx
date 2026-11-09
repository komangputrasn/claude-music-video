/**
 * <WorldLyric> — the lyrics live INSIDE the world in the TERMS cut (no caption overlay). Each sung line is staged
 * diegetically by the scene that owns it: light projected onto fog, a TENURE screen, a stencil on concrete, the page
 * in the printer, letters standing black against the dawn… Words appear one at a time (hard on, no wipe) exactly as
 * they are sung (src/data/lyrics.json). Control words (buy, plan, upgrade, cancel, locked, tier, plus, patent, fee,
 * declined) are authRed and flash on their onset; in the final chorus good/own/paper/bowl/ground are dawnGold.
 *
 *   <WorldLyric line={12} time={songT} size?={0.5} mode?='light'|'screen'|'paint'|'dark' maxWidth?={8}
 *               align?='center'|'left'|'right' anchor?='center'|'top'|'bottom' color?={S.bone} intensity?={1.1}
 *               from? until? reveal?='word'|'line' halo?={0.35} fog? opacity? flicker? perWord? font?
 *               lineHeight?={1.18} tracking?={0.15} {...group}/>
 *
 *   line       lyric line index (src/data/lyrics.json / DESIGN.md §6). Or pass `text` + `words` for non-sung text.
 *   time       song seconds (useSongTime()).
 *   size       font size (em) in METRES. Cap height ≈ 0.7·size. Use metresForPx() to size for legibility:
 *              keep the cap height ≥ ~26 px on the 1080 frame (em ≥ ~38 px) — 50–90 px reads comfortably.
 *   mode       'light'  additive light (projected on haze/walls; glows slightly, ignores fog; soft halo) — default
 *              'screen' emissive, opaque letters on a TENURE screen (no fog)
 *              'paint'  matte paint/print on a surface (receives fog, never blooms: stencils, the paper page)
 *              'dark'   black letters standing as silhouettes against a bright background (fog, no glow);
 *                       control/gold words stay black but get a glow of their colour behind them
 *   maxWidth   wrap width in metres (balanced rows). Omit = one row.
 *   from/until visibility window in song seconds. Default: from the first sung word until the next line's first word
 *              (or line end + 1.2 s). Words still appear one at a time inside the window (reveal 'word').
 *   reveal     'word' (default) or 'line' (the whole line at once at its first word).
 *   perWord    (i, info) => ({offset?:[x,y,z], rotation?:[x,y,z], scale?, opacity?, visible?}) per-word animation hook
 *              (e.g. words drifting off as ash, letters falling). info = {text, start, since, row, x, y, width}.
 *   flicker    0..1 deterministic failing-light flicker (Final: red text dying).
 * Origin: the anchor point of the text block; text faces +Z, reads left→right along +X.
 *
 * Also exported: sceneLyricLines(t0, t1) (the lines a scene must stage), lyricWindow(i), lyricWordColor(),
 * metresForPx(px, distance, fovDeg), measureLyric(i|text, size, maxWidth) → {width, height, rows}.
 * Deterministic; glyph textures are cached per word (drawn once, synchronously, with system fonts).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
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
type LaidWord = {text: string; raw: string; start: number; row: number; x: number; y: number; width: number; glyph: Glyph};

const layout = (
  words: {text: string; start: number}[], size: number, maxWidth: number | undefined, align: 'center' | 'left' | 'right',
  anchor: 'center' | 'top' | 'bottom', lineHeight: number, font: string, weight: number, tracking: number,
) => {
  const space = 0.42; // em
  const items = words.map((w) => {
    const text = displayWord(w.text);
    const glyph = getGlyph(text, font, weight, tracking);
    return {text, raw: w.text, start: w.start, glyph, adv: glyph.adv};
  });
  const total = items.reduce((a, it, i) => a + it.adv + (i ? space : 0), 0);
  const maxEm = maxWidth ? maxWidth / size : Infinity;
  const nRows = Math.max(1, Math.ceil(total / maxEm));
  const target = total / nRows;
  // balanced greedy wrap: aim for equal rows of ~total/nRows, never wider than maxWidth
  const limit = Math.min(maxEm, target * 1.08);
  const rows: (typeof items)[] = [[]];
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
  const rowW = rows.map((r) => r.reduce((a, it, i) => a + it.adv + (i ? space : 0), 0));
  const width = Math.max(...rowW) * size;
  const capH = 0.7;
  const height = ((rows.length - 1) * lineHeight + capH) * size;
  // baseline of row 0 relative to the anchor
  const top = anchor === 'top' ? 0 : anchor === 'bottom' ? height : height / 2;
  const laid: LaidWord[] = [];
  rows.forEach((r, ri) => {
    let x = align === 'left' ? 0 : align === 'right' ? -rowW[ri] * size : (-rowW[ri] * size) / 2;
    const y = top - capH * size - ri * lineHeight * size;
    r.forEach((it, wi) => {
      if (wi) x += space * size;
      laid.push({text: it.text, raw: it.raw, start: it.start, row: ri, x, y, width: it.adv * size, glyph: it.glyph});
      x += it.adv * size;
    });
  });
  return {laid, width, height, rows: rows.length};
};

/** Measure a lyric line (or any text) as it would be laid out. */
export const measureLyric = (lineOrText: number | string, size = 1, maxWidth?: number, opts: {font?: string; weight?: number; tracking?: number; lineHeight?: number} = {}) => {
  const words = typeof lineOrText === 'number'
    ? LINES[lineOrText].words.map((w) => ({text: w.text, start: w.start}))
    : lineOrText.split(/\s+/).filter(Boolean).map((text) => ({text, start: 0}));
  const r = layout(words, size, maxWidth, 'center', 'center', opts.lineHeight ?? 1.18, opts.font ?? SFONTS.futura, opts.weight ?? 500, opts.tracking ?? 0.15);
  return {width: r.width, height: r.height, rows: r.rows};
};

// ------------------------------------------------------------------------------------------------ component
const PLANE = new THREE.PlaneGeometry(1, 1);
const fh = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export type WordInfo = {text: string; start: number; since: number; row: number; x: number; y: number; width: number};
export type WordFx = {offset?: [number, number, number]; rotation?: [number, number, number]; scale?: number; opacity?: number; visible?: boolean};

export type WorldLyricProps = {
  line?: number;
  /** custom (non-sung) text instead of a lyric line; all words appear at `from` (or always) */
  text?: string;
  time: number;
  size?: number;
  mode?: 'light' | 'screen' | 'paint' | 'dark';
  maxWidth?: number;
  align?: 'center' | 'left' | 'right';
  anchor?: 'center' | 'top' | 'bottom';
  color?: string;
  intensity?: number;
  from?: number;
  until?: number;
  reveal?: 'word' | 'line';
  halo?: number;
  fog?: boolean;
  opacity?: number;
  flicker?: number;
  perWord?: (i: number, info: WordInfo) => WordFx;
  font?: string;
  weight?: number;
  lineHeight?: number;
  tracking?: number;
  renderOrder?: number;
} & Omit<React.ComponentProps<'group'>, 'children'>;

export const WorldLyric: React.FC<WorldLyricProps> = ({
  line, text, time, size = 0.5, mode = 'light', maxWidth, align = 'center', anchor = 'center', color, intensity, from, until,
  reveal = 'word', halo, fog, opacity = 1, flicker = 0, perWord, font = SFONTS.futura, weight = 500, lineHeight = 1.18,
  tracking = 0.15, renderOrder, ...group
}) => {
  const section = line !== undefined ? LINES[line].section : '';
  const words = useMemo(
    () => (line !== undefined ? LINES[line].words.map((w) => ({text: w.text, start: w.start})) : (text ?? '').split(/\s+/).filter(Boolean).map((t) => ({text: t, start: -Infinity}))),
    [line, text],
  );
  const L = useMemo(
    () => layout(words, size, maxWidth, align, anchor, lineHeight, font, weight, tracking),
    [words, size, maxWidth, align, anchor, lineHeight, font, weight, tracking],
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

  const state = L.laid.map((w, i) => {
    const firstStart = L.laid[0]?.start ?? -Infinity;
    const on = inWindow && (reveal === 'line' ? time >= firstStart || line === undefined : time >= w.start || line === undefined);
    const since = time - w.start;
    const c = lyricWordColor(w.raw, section, since, base);
    const fx = perWord ? perWord(i, {text: w.text, start: w.start, since, row: w.row, x: w.x, y: w.y, width: w.width}) : {};
    return {on: on && fx.visible !== false, c, fx};
  });

  useLayoutEffect(() => {
    state.forEach((s, i) => {
      const m = mats[i];
      if (!m) return;
      const op = opacity * (s.fx.opacity ?? 1);
      if (mode === 'dark') {
        // black letters; control/free words keep their colour as a glow BEHIND the dark letters
        m.main.color.set(base);
        m.main.blending = THREE.NormalBlending;
        const hk = s.c.special ? Math.max(haloK, 0.75) * s.c.flash * fl : 0;
        m.halo.color.set(s.c.color).multiplyScalar(Math.min(2, 1.6 * hk));
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
    });
  });

  if (!inWindow) return null;
  return (
    <group {...group}>
      {L.laid.map((w, i) => {
        const s = state[i];
        if (!s.on) return null;
        const g = w.glyph;
        const pw = g.w * size;
        const ph = g.h * size;
        // canvas → plane: left edge at x - padX, baseline at w.y
        const cx = w.x - (g.w - g.adv) * size * 0.5 + pw / 2;
        const cy = w.y + (g.base - g.h / 2) * size;
        const o = s.fx.offset ?? [0, 0, 0];
        const sc = s.fx.scale ?? 1;
        return (
          <group key={i} position={[cx + o[0], cy + o[1], o[2]]} rotation={s.fx.rotation ?? [0, 0, 0]} scale={sc}>
            {haloK > 0 || mode === 'dark' ? <mesh geometry={PLANE} material={mats[i].halo} scale={[pw, ph, 1]} position={[0, 0, -0.001]} renderOrder={renderOrder} /> : null}
            <mesh geometry={PLANE} material={mats[i].main} scale={[pw, ph, 1]} renderOrder={renderOrder} />
          </group>
        );
      })}
    </group>
  );
};
