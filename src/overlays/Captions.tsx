/**
 * <Captions/> — song-wide karaoke lyric captions (lower third), early-2000s karaoke-DVD / music-video style.
 *
 * Reads the word-timed lyrics (src/data/lyrics.json via lib/lyrics) and the song clock (useSongTime) and draws the
 * active line centered at the bottom of the frame:
 *   - Trebuchet MS Bold Italic, white→ice glossy fill, thick round-joined navy outline (+ coloured outer rim on
 *     chorus/swing/final), hard drop shadow — readable over a bright sky or a black room.
 *   - Each word lights up as it is sung with a slanted aqua→bubblegum wipe inside the word, a small pop + glow at the
 *     word's start.
 *   - Lines slide/fade in, the previous line lifts away; long lines wrap into max 2 balanced rows (prefers breaking
 *     at commas / before prepositions). A glossy translucent navy "aqua-glass" pill sits behind and morphs between lines.
 *   - Everything stays inside the bottom CAPTION_ZONE (230 px). Nothing is drawn when no line is active.
 *   - Per-section accents (CAPTION_THEMES): chorus/swing get an aqua rim and bigger pops, hold is soft & quiet
 *     (pillow-voice aqua), final is sunrise gold→bubblegum.
 *
 * API
 *   <Captions time? fontSize? bottom? pill? themeOverride? style? />
 *     time          song seconds (default: useSongTime()). Pass explicitly in playgrounds.
 *     fontSize      px at 1080p (default 64)
 *     bottom        px from frame bottom to the bottom of the caption pill (default 70)
 *     pill          draw the glass pill (default true)
 *     themeOverride force a theme key from CAPTION_THEMES (default: by lyric section)
 *   CAPTION_ZONE                 bottom band (px) scenes must keep free of important action (230)
 *   CAPTION_TRACK                per-line display windows {line, inT, outT, inMode, outMode}
 *   captionLinesAt(t)            the track entries visible at song time t (0..2)
 *   layoutCaptionLine(line, fs)  measured word positions / rows for a lyric line
 *   CAPTION_THEMES, CaptionTheme per-section colour themes
 *
 * Usage (already mounted globally by GlobalOverlays — scenes do NOT need to render it):
 *   <AbsoluteFill><Captions /></AbsoluteFill>
 *   // playground: <Captions time={59.1} />
 *
 * Deterministic: pure function of the song time; text measured synchronously with canvas 2D (system fonts only).
 */
import React, {useId} from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {LINES, Line} from '../lib/lyrics';
import {useSongTime, clamp01, beatAt} from '../lib/time';
import {SCENES, FPS, WIDTH, HEIGHT} from '../timeline';
import {C} from '../lib/palette';

/** Bottom band (px at 1080p) reserved for captions. */
export const CAPTION_ZONE = 230;

export const CAPTION_FONT = '"Trebuchet MS", Verdana, sans-serif';

// ---------------------------------------------------------------------------------------------------------------------
// Themes
export type CaptionTheme = {
  /** main (navy) outline */
  outline: string;
  /** optional outer rim around the outline (double-outline sticker look) */
  rim?: string;
  /** unsung fill gradient top/bottom (glossy break at ~50%) */
  base: [string, string, string];
  /** sung fill gradient: top highlight, middle, bottom */
  sung: [string, string, string];
  /** glow colour around the word being sung */
  glow: string;
  /** pill glass background (CSS background) and border colour */
  pill: string;
  pillBorder: string;
  /** pop amount on each word start (scale delta) */
  pop: number;
  /** beat-synced pill glow 0..1 */
  beatGlow: number;
  /** 4-point sparkle twinkle on each word start */
  sparkle?: boolean;
};

const VERSE: CaptionTheme = {
  outline: '#0A1450',
  base: ['#FFFFFF', '#E4FAFF', '#B4ECFF'],
  sung: [C.aqua, '#7C8CFF', C.bubblegum],
  glow: C.aqua,
  pill: 'linear-gradient(180deg, rgba(14, 34, 118, 0.58) 0%, rgba(4, 10, 46, 0.7) 100%)',
  pillBorder: 'rgba(150, 230, 255, 0.5)',
  pop: 0.13,
  beatGlow: 0,
};

export const CAPTION_THEMES: Record<string, CaptionTheme> = {
  verse1: VERSE,
  verse2: VERSE,
  cancel: VERSE,
  pre: {...VERSE, pop: 0.16},
  chorus1: {
    ...VERSE,
    rim: '#FFFFFF',
    sung: ['#2ED3FF', '#9A7BFF', '#FF3FB0'],
    glow: C.bubblegum,
    pillBorder: 'rgba(160, 236, 255, 0.75)',
    pop: 0.2,
    beatGlow: 1,
    sparkle: true,
  },
  swing: {
    ...VERSE,
    rim: '#FFB347',
    sung: ['#FFD25E', C.tangerine, C.bubblegum],
    glow: C.tangerine,
    pillBorder: 'rgba(255, 196, 120, 0.6)',
    pop: 0.2,
    beatGlow: 0.7,
    sparkle: true,
  },
  hold: {
    outline: '#1A0E52',
    base: ['#FFFFFF', '#EEE8FF', '#CFC2FF'],
    sung: ['#BFF3FF', '#6FDCFF', C.aqua],
    glow: C.aqua,
    pill: 'linear-gradient(180deg, rgba(40, 20, 110, 0.4) 0%, rgba(14, 6, 46, 0.5) 100%)',
    pillBorder: 'rgba(190, 170, 255, 0.35)',
    pop: 0.05,
    beatGlow: 0,
  },
  final: {
    ...VERSE,
    rim: '#FFD36A',
    sung: ['#FFC23A', '#FF8A5E', C.bubblegum],
    glow: '#FFC861',
    pill: 'linear-gradient(180deg, rgba(30, 26, 120, 0.56) 0%, rgba(14, 8, 52, 0.68) 100%)',
    pillBorder: 'rgba(255, 214, 140, 0.7)',
    pop: 0.2,
    beatGlow: 1,
    sparkle: true,
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// Timing track: when each line enters / leaves.
export type TrackEntry = {line: Line; inT: number; outT: number; inMode: 'fresh' | 'switch'; outMode: 'fresh' | 'switch'};

const LEAD = 0.4; // fresh line appears this long before its first word
const SWITCH_TAIL = 0.2; // on back-to-back lines the next line replaces the previous this long before its first word
const TAIL = 0.45; // fresh line lingers this long after its last word
const SPLIT_GAP = 0.9; // gaps longer than this clear the captions between lines
const IN_FRESH = 0.32, IN_SWITCH = 0.24, OUT_FRESH = 0.3, OUT_SWITCH = 0.13, SWITCH_IN_DELAY = 0.1;
const CUT_TIMES = SCENES.slice(1).map((s) => s.from / FPS);

export const CAPTION_TRACK: TrackEntry[] = (() => {
  const tr: TrackEntry[] = LINES.map((line) => ({line, inT: line.start - LEAD, outT: line.end + TAIL, inMode: 'fresh', outMode: 'fresh'}));
  for (let k = 0; k < tr.length; k++) {
    const cur = tr[k];
    const prev = k > 0 ? tr[k - 1] : null;
    if (prev && cur.line.start - prev.line.end < SPLIT_GAP) {
      const sw = Math.max(prev.line.end - SWITCH_TAIL, cur.line.start - LEAD);
      prev.outT = sw;
      prev.outMode = 'switch';
      cur.inT = sw;
      cur.inMode = 'switch';
    } else {
      // a fresh line never enters before a scene cut that happens right before its first word
      const cut = CUT_TIMES.find((c) => c > cur.inT && c <= cur.line.start + 0.05);
      if (cut !== undefined) cur.inT = cut;
      if (prev) prev.outT = Math.min(prev.outT, cur.inT - OUT_FRESH);
    }
  }
  return tr;
})();

const outDur = (e: TrackEntry) => (e.outMode === 'switch' ? OUT_SWITCH : OUT_FRESH);
const inDur = (e: TrackEntry) => (e.inMode === 'switch' ? IN_SWITCH : IN_FRESH);

/** Track entries visible at song time t (0, 1, or 2 during a line change). */
export const captionLinesAt = (t: number): TrackEntry[] =>
  CAPTION_TRACK.filter((e) => t >= e.inT && t < e.outT + outDur(e));

// ---------------------------------------------------------------------------------------------------------------------
// Layout (measured with canvas 2D; same shaping as SVG text in Chrome).
export type WordBox = {text: string; x: number; w: number; row: number; start: number; end: number};
export type LineLayout = {fontSize: number; rows: number; rowWidths: number[]; width: number; words: WordBox[]};

const MAX_ONE_ROW_EM = 21.5; // a line wider than this (em) wraps into 2 rows (~1375 px at 64 px)
const MAX_ROW_EM = 25; // hard max width of a row; font shrinks if a 2-row split can't fit

let measureCtx: CanvasRenderingContext2D | null = null;
const fontStr = (size: number) => `italic 700 ${size}px ${CAPTION_FONT}`;
const measure = (text: string, size: number) => {
  if (!measureCtx && typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * size * 0.52;
  measureCtx.font = fontStr(size);
  return measureCtx.measureText(text).width;
};

const NO_BREAK_AFTER = new Set(['a', 'an', 'the', 'my', 'his', 'her', 'its', 'your', 'our', 'to', 'of', "i'm", 'i', 'you', 'can', 'be']);
const GOOD_BREAK_BEFORE = new Set(['in', 'on', 'with', 'from', 'when', 'where', 'to', 'and', 'but', 'so', 'that', 'for', 'at', 'is', 'by']);
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

const layoutCache = new Map<string, LineLayout>();

export const layoutCaptionLine = (line: Line, fontSize: number): LineLayout => {
  const key = `${line.i}@${fontSize}`;
  const hit = layoutCache.get(key);
  if (hit) return hit;
  let size = fontSize;
  let result: LineLayout | null = null;
  for (let attempt = 0; attempt < 6 && !result; attempt++) {
    const ws = line.words.map((w) => measure(w.text, size));
    const space = measure(' ', size) + size * 0.1; // outlines eat into word gaps
    const total = ws.reduce((a, b) => a + b, 0) + space * (ws.length - 1);
    let breakAt = -1;
    const MAX_ONE_ROW = MAX_ONE_ROW_EM * fontSize;
    const MAX_ROW = MAX_ROW_EM * fontSize;
    if (total > MAX_ONE_ROW) {
      let best = Infinity;
      for (let i = 1; i < ws.length; i++) {
        const w1 = ws.slice(0, i).reduce((a, b) => a + b, 0) + space * (i - 1);
        const w2 = total - w1 - space;
        if (w1 > MAX_ROW || w2 > MAX_ROW) continue;
        const prevW = line.words[i - 1].text;
        let cost = Math.abs(w1 - w2) / total;
        if (/[,;:.?!]["']?$/.test(prevW)) cost -= 0.3;
        if (GOOD_BREAK_BEFORE.has(clean(line.words[i].text))) cost -= 0.1;
        if (NO_BREAK_AFTER.has(clean(prevW))) cost += 0.25;
        if (cost < best) { best = cost; breakAt = i; }
      }
      if (breakAt < 0) { size = Math.floor(size * 0.92); continue; }
    }
    const rowsIdx = breakAt < 0 ? [line.words.map((_, i) => i)] : [line.words.slice(0, breakAt).map((_, i) => i), line.words.slice(breakAt).map((_, i) => i + breakAt)];
    const words: WordBox[] = [];
    const rowWidths: number[] = [];
    rowsIdx.forEach((idx, r) => {
      const rw = idx.reduce((a, i) => a + ws[i], 0) + space * (idx.length - 1);
      rowWidths.push(rw);
      let x = WIDTH / 2 - rw / 2;
      for (const i of idx) {
        const w = line.words[i];
        words.push({text: w.text, x, w: ws[i], row: r, start: w.start, end: w.end});
        x += ws[i] + space;
      }
    });
    result = {fontSize: size, rows: rowsIdx.length, rowWidths, width: Math.max(...rowWidths), words};
  }
  if (!result) throw new Error(`caption layout failed for line ${line.i}`);
  layoutCache.set(key, result);
  return result;
};

// ---------------------------------------------------------------------------------------------------------------------
// Geometry helpers
const PAD_X = 40;
const PAD_Y = 11;
const ASC = 0.76; // ascender (em) above baseline used for the block box
const DESC = 0.2;
const LINE_H = 1.15;
const SVG_H = 360; // svg only covers the bottom band (cheaper drop-shadow filter)

type Geo = {w: number; h: number};
const geoOf = (L: LineLayout): Geo => ({
  w: L.width + PAD_X * 2,
  h: (L.rows - 1) * L.fontSize * LINE_H + (ASC + DESC) * L.fontSize + PAD_Y * 2,
});

const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.cubic);
const easeBack = Easing.out(Easing.back(1.7));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** pop envelope after a word starts: fast attack (2 frames), smooth decay (~0.3 s) */
const popEnv = (s: number) => {
  if (s < 0) return 0;
  if (s < 0.06) return s / 0.06;
  return Math.max(0, 1 - easeOut(Math.min(1, (s - 0.06) / 0.3)));
};

// ---------------------------------------------------------------------------------------------------------------------
// One line (SVG text layers)
const CaptionLine: React.FC<{
  entry: TrackEntry;
  t: number;
  layout: LineLayout;
  theme: CaptionTheme;
  baseY: number; // baseline of the last row
  uid: string;
}> = ({entry, t, layout, theme, baseY, uid}) => {
  const fs = layout.fontSize;
  const lh = fs * LINE_H;
  const rowBase = (r: number) => baseY - (layout.rows - 1 - r) * lh;
  const outK = clamp01((t - entry.outT) / outDur(entry));
  const isSwitchOut = entry.outMode === 'switch';
  // a replaced line drops out fast (ease-out) so it never ghosts over the incoming one; a final line fades gently
  const lineAlpha = isSwitchOut ? 1 - easeOut(outK) : 1 - easeIn(outK);
  const lineDy = isSwitchOut ? -easeOut(outK) * 14 : -easeOut(outK) * 12;
  if (lineAlpha <= 0.001) return null;

  const stroke = Math.max(9, fs * 0.21);
  const rimW = stroke + fs * 0.13;
  const id = `cap${uid}l${entry.line.i}`;
  // sung gradient + word state
  const words = layout.words.map((w, j) => {
    const delay = entry.inMode === 'switch' ? SWITCH_IN_DELAY : 0;
    const inK = clamp01((t - entry.inT - delay - j * 0.015) / inDur(entry));
    const enter = easeBack(inK);
    const endT = Math.min(w.end, entry.outT - 0.02);
    const dur = Math.max(0.08, endT - w.start);
    const raw = clamp01((t - w.start) / dur);
    const p = raw <= 0 ? 0 : raw >= 1 ? 1 : 1 - Math.pow(1 - raw, 1.35);
    const pop = popEnv(t - w.start) * theme.pop;
    const singing = t >= w.start && t < endT + 0.12 ? 1 - clamp01((t - endT) / 0.12) : 0;
    const cx = w.x + w.w / 2;
    const by = rowBase(w.row);
    const cy = by - fs * 0.34;
    // long words grow less so they never swell into their neighbours; every word still hops up a little
    const s = 1 + pop * Math.min(1, Math.max(0.35, (fs * 1.6) / w.w));
    const dy = (1 - enter) * 34 - pop * fs * 0.32;
    const tf = `translate(${cx.toFixed(2)} ${(cy + dy).toFixed(2)}) scale(${s.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`;
    return {w, j, p, tf, alpha: clamp01(inK * 1.6), singing, by};
  });

  const textProps = (w: WordBox, by: number) => ({x: w.x, y: by, children: w.text});
  const slant = fs * 0.2; // italic slant (px) for the wipe edge

  return (
    <g opacity={lineAlpha} transform={`translate(0 ${lineDy.toFixed(2)})`}>
      <defs>
        {Array.from({length: layout.rows}, (_, r) => {
          const by = rowBase(r);
          const y1 = by - fs * ASC;
          const y2 = by + fs * 0.12;
          const rx0 = WIDTH / 2 - layout.rowWidths[r] / 2;
          const rx1 = WIDTH / 2 + layout.rowWidths[r] / 2;
          return (
            <React.Fragment key={r}>
              <linearGradient id={`${id}b${r}`} gradientUnits="userSpaceOnUse" x1={0} y1={y1} x2={0} y2={y2}>
                <stop offset="0" stopColor={theme.base[0]} />
                <stop offset="0.5" stopColor={theme.base[0]} />
                <stop offset="0.54" stopColor={theme.base[1]} />
                <stop offset="1" stopColor={theme.base[2]} />
              </linearGradient>
              <linearGradient id={`${id}s${r}`} gradientUnits="userSpaceOnUse" x1={rx0} y1={0} x2={rx1} y2={0}>
                <stop offset="0" stopColor={theme.sung[0]} />
                <stop offset="0.5" stopColor={theme.sung[1]} />
                <stop offset="1" stopColor={theme.sung[2]} />
              </linearGradient>
              <linearGradient id={`${id}g${r}`} gradientUnits="userSpaceOnUse" x1={0} y1={y1} x2={0} y2={y2}>
                <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
                <stop offset="0.46" stopColor="#FFFFFF" stopOpacity={0.18} />
                <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </linearGradient>
            </React.Fragment>
          );
        })}
        <filter id={`${id}glow`} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation={fs * 0.16} />
        </filter>
        {words.map(({w, p, by, j}) =>
          p > 0 && p < 1 ? (
            <clipPath key={j} id={`${id}c${j}`} clipPathUnits="userSpaceOnUse">
              {(() => {
                const pad = fs * 0.3;
                const edge = w.x - pad * 0.3 + (w.w + pad * 0.6) * p;
                const top = by - fs * 1.2;
                const bot = by + fs * 0.5;
                return <polygon points={`${w.x - pad},${top} ${edge + slant},${top} ${edge - slant * 0.4},${bot} ${w.x - pad},${bot}`} />;
              })()}
            </clipPath>
          ) : null,
        )}
      </defs>
      {/* glow behind the word being sung */}
      {words.map(({w, j, tf, singing, by}) =>
        singing > 0.01 ? (
          <text key={`g${j}`} {...textProps(w, by)} transform={tf} fill={theme.glow} stroke={theme.glow} strokeWidth={rimW + fs * 0.1}
            strokeLinejoin="round" opacity={0.75 * singing} filter={`url(#${id}glow)`} />
        ) : null,
      )}
      {theme.rim
        ? words.map(({w, j, tf, alpha, by}) => (
            <text key={`r${j}`} {...textProps(w, by)} transform={tf} opacity={alpha} fill={theme.rim} stroke={theme.rim} strokeWidth={rimW} strokeLinejoin="round" />
          ))
        : null}
      {words.map(({w, j, tf, alpha, by}) => (
        <text key={`o${j}`} {...textProps(w, by)} transform={tf} opacity={alpha} fill={theme.outline} stroke={theme.outline} strokeWidth={stroke} strokeLinejoin="round" />
      ))}
      {words.map(({w, j, tf, alpha, by}) => (
        <text key={`f${j}`} {...textProps(w, by)} transform={tf} opacity={alpha} fill={`url(#${id}b${w.row})`} />
      ))}
      {words.map(({w, j, tf, alpha, p, by}) =>
        p > 0 ? (
          <g key={`s${j}`} transform={tf} opacity={alpha} clipPath={p < 1 ? `url(#${id}c${j})` : undefined}>
            <text {...textProps(w, by)} fill={`url(#${id}s${w.row})`} />
            <text {...textProps(w, by)} fill={`url(#${id}g${w.row})`} />
          </g>
        ) : null,
      )}
      {theme.sparkle
        ? words.map(({w, j, by}) => {
            const s = t - w.start;
            if (s < 0 || s > 0.42 || w.text.replace(/[^A-Za-z0-9]/g, '').length < 3) return null;
            const k = s / 0.42;
            const sc = Math.sin(Math.min(1, k * 1.15) * Math.PI) * (0.85 + 0.3 * ((j * 7) % 3) / 2);
            if (sc <= 0.01) return null;
            const R = fs * 0.42 * sc;
            const sx = w.x + w.w * 0.96 + fs * 0.06;
            // top-right on the first row; bottom-right on a lower row so it never sits on the row above
            const sy = w.row === 0 ? by - fs * 0.86 : by + fs * 0.02;
            return (
              <g key={`k${j}`} transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${(k * 50 + j * 23).toFixed(1)})`}>
                <path d={STAR} transform={`scale(${(R * 1.5).toFixed(2)})`} fill={theme.glow} opacity={0.55} filter={`url(#${id}glow)`} />
                <path d={STAR} transform={`scale(${R.toFixed(2)})`} fill="#FFFFFF" />
              </g>
            );
          })
        : null}
    </g>
  );
};

/** unit 4-point sparkle star (concave), radius 1 */
const STAR = 'M0,-1 Q0.12,-0.12 1,0 Q0.12,0.12 0,1 Q-0.12,0.12 -1,0 Q-0.12,-0.12 0,-1 Z';

// ---------------------------------------------------------------------------------------------------------------------
export type CaptionsProps = {
  /** song seconds; defaults to useSongTime() */
  time?: number;
  fontSize?: number;
  /** px from the frame bottom to the pill bottom */
  bottom?: number;
  pill?: boolean;
  themeOverride?: keyof typeof CAPTION_THEMES;
  style?: React.CSSProperties;
};

export const Captions: React.FC<CaptionsProps> = ({time, fontSize = 64, bottom = 70, pill = true, themeOverride, style}) => {
  const songT = useSongTime();
  const t = time ?? songT;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const vis = captionLinesAt(t);
  if (!vis.length) return null;

  const pillBottomY = HEIGHT - bottom;
  const items = vis.map((e) => {
    const layout = layoutCaptionLine(e.line, fontSize);
    const theme = CAPTION_THEMES[themeOverride ?? e.line.section] ?? VERSE;
    const baseY = pillBottomY - PAD_Y - DESC * layout.fontSize;
    return {e, layout, theme, baseY, geo: geoOf(layout)};
  });

  // pill geometry: morph between outgoing and incoming line during a switch
  const cur = items[items.length - 1];
  const prev = items.length > 1 ? items[0] : null;
  let geo = cur.geo;
  let pillAlpha = 1;
  let pillScale = 1;
  if (prev && cur.e.inMode === 'switch') {
    const k = Easing.inOut(Easing.cubic)(clamp01((t - cur.e.inT - 0.03) / 0.22));
    geo = {w: lerp(prev.geo.w, cur.geo.w, k), h: lerp(prev.geo.h, cur.geo.h, k)};
  } else {
    const inK = clamp01((t - cur.e.inT) / IN_FRESH);
    const outK = clamp01((t - cur.e.outT) / OUT_FRESH);
    if (cur.e.inMode === 'fresh') {
      pillAlpha *= easeOut(inK);
      pillScale = lerp(0.82, 1, easeBack(inK));
    }
    if (cur.e.outMode === 'fresh') pillAlpha *= 1 - easeIn(outK);
  }
  const theme = cur.theme;
  const beat = theme.beatGlow ? beatAt(t).pulse * theme.beatGlow : 0;
  // gloss sweep across the pill when a line enters
  const sweepK = clamp01((t - cur.e.inT - (cur.e.inMode === 'switch' ? SWITCH_IN_DELAY : 0)) / 0.7);
  const radius = Math.min(geo.h / 2, 46);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', ...style}}>
      {pill && pillAlpha > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            left: WIDTH / 2 - geo.w / 2,
            top: pillBottomY - geo.h,
            width: geo.w,
            height: geo.h,
            borderRadius: radius,
            opacity: pillAlpha,
            transform: `scale(${pillScale})`,
            transformOrigin: '50% 100%',
            background: theme.pill,
            border: `2px solid ${theme.pillBorder}`,
            boxShadow: `0 6px 22px rgba(0,0,0,0.35), inset 0 -10px 22px rgba(25,198,255,0.12), 0 0 ${10 + beat * 26}px rgba(25,198,255,${(0.08 + beat * 0.32).toFixed(3)})`,
            backdropFilter: 'blur(8px) brightness(0.8) saturate(0.85)',
            overflow: 'hidden',
          }}
        >
          {/* top gloss */}
          <div style={{position: 'absolute', left: 10, right: 10, top: 3, height: Math.min(30, geo.h * 0.36), borderRadius: radius,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.02))'}} />
          {/* entrance sweep */}
          {sweepK > 0 && sweepK < 1 ? (
            <div style={{position: 'absolute', top: -20, bottom: -20, width: 120, left: lerp(-160, geo.w + 40, easeOut(sweepK)),
              transform: 'skewX(-24deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))'}} />
          ) : null}
        </div>
      ) : null}
      <svg
        width={WIDTH}
        height={SVG_H}
        viewBox={`0 ${HEIGHT - SVG_H} ${WIDTH} ${SVG_H}`}
        style={{position: 'absolute', left: 0, top: HEIGHT - SVG_H, overflow: 'visible',
          filter: 'drop-shadow(0px 4px 0px rgba(2,6,32,0.55)) drop-shadow(0px 7px 10px rgba(0,0,0,0.45))'}}
      >
        <g style={{fontFamily: CAPTION_FONT, fontWeight: 700, fontStyle: 'italic'}} fontSize={0}>
          {items.map(({e, layout, theme: th, baseY}) => (
            <g key={e.line.i} fontSize={layout.fontSize}>
              <CaptionLine entry={e} t={t} layout={layout} theme={th} baseY={baseY} uid={uid} />
            </g>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
