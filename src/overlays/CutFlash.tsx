/**
 * <CutFlash/> — short scene-cut transition overlays at every scene boundary in SCENES (src/timeline.ts).
 *
 * Styles (each 6–9 frames total, peaking ON the cut frame, so content is hidden for at most ~2 frames):
 *   'flash'  white (or tinted) strobe: blown-out backdrop + white wash + anamorphic lens streak. Energetic cuts.
 *   'glitch' digital RGB-split glitch on the actual scene pixels (SVG backdrop filter): channel split, displaced
 *            horizontal slices, datamosh colour blocks, scanlines.
 *   'vhs'    VHS tracking band rolling up the frame: displaced/noisy band, chroma bleed, head-switch noise.
 *   'none'
 * Default plan (CUT_PLAN, keyed by the INCOMING scene):
 *   V1Bedroom vhs · V1Feeder glitch · Pre vhs · Chorus1 FLASH · V2Car glitch · V2Rain vhs · Swing FLASH ·
 *   Cancel glitch · Hold vhs (soft) · Final FLASH (warm sunrise) · Outro vhs
 *
 * API
 *   <CutFlash frame? cuts? />      frame = song-absolute frame (default useAbsoluteFrame()); cuts default CUTS
 *   CUTS: CutDef[]                 {frame, style, tint?, streak?, strength?, seed}
 *   CUT_PLAN                       per-scene style map used to build CUTS
 *   <CutEffect style k strength? tint? streak? seed? />   one effect at local frame k (k = frame - cutFrame);
 *                                  scenes may use it for INTERNAL cuts too, e.g. <CutEffect style="flash" k={f - 120}/>
 *   CUT_WINDOW                     [first, last] k for each style
 *
 * Usage: mounted globally in GlobalOverlays (under the captions). Scene example for an internal hit:
 *   const f = useCurrentFrame(); <CutEffect style="glitch" k={f - 96} />
 *
 * Deterministic: pure function of the frame (seeded rand from lib/time); no assets, no fonts.
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SCENES, SceneId, WIDTH, HEIGHT} from '../timeline';
import {useAbsoluteFrame, rand} from '../lib/time';

export type CutStyle = 'flash' | 'glitch' | 'vhs' | 'none';
export type CutDef = {frame: number; style: CutStyle; tint?: string; streak?: string; strength?: number; seed: number};

export const CUT_PLAN: Record<Exclude<SceneId, 'Intro'>, Omit<CutDef, 'frame' | 'seed'>> = {
  V1Bedroom: {style: 'vhs', strength: 1},
  V1Feeder: {style: 'glitch', strength: 0.8},
  Pre: {style: 'vhs', strength: 0.85},
  Chorus1: {style: 'flash', tint: '#FFFFFF', streak: '#7FE6FF', strength: 1},
  V2Car: {style: 'glitch', strength: 0.9},
  V2Rain: {style: 'vhs', strength: 0.8},
  Swing: {style: 'flash', tint: '#FFFFFF', streak: '#FFD08A', strength: 1},
  Cancel: {style: 'glitch', strength: 1},
  Hold: {style: 'vhs', strength: 0.6},
  Final: {style: 'flash', tint: '#FFF3DA', streak: '#FFB347', strength: 1},
  Outro: {style: 'vhs', strength: 0.7},
};

export const CUTS: CutDef[] = SCENES.slice(1).map((s, i) => ({frame: s.from, seed: i + 1, ...CUT_PLAN[s.id as Exclude<SceneId, 'Intro'>]}));

/** inclusive [first, last] local frame (relative to the cut) for each style */
export const CUT_WINDOW: Record<Exclude<CutStyle, 'none'>, [number, number]> = {
  flash: [-1, 6],
  glitch: [-2, 4],
  vhs: [-3, 5],
};

const FLASH_ENV: Record<number, number> = {[-1]: 0.22, 0: 1, 1: 0.74, 2: 0.48, 3: 0.3, 4: 0.17, 5: 0.08, 6: 0.03};
const GLITCH_ENV: Record<number, number> = {[-2]: 0.35, [-1]: 0.75, 0: 1, 1: 0.72, 2: 0.42, 3: 0.2, 4: 0.08};
const VHS_ENV: Record<number, number> = {[-3]: 0.4, [-2]: 0.75, [-1]: 0.95, 0: 1, 1: 0.9, 2: 0.7, 3: 0.48, 4: 0.28, 5: 0.12};

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const rgba = (hex: string, a: number) => `rgba(${hexToRgb(hex).join(',')},${a.toFixed(3)})`;

// ---------------------------------------------------------------------------------------------------------------------
/** SVG filter that splits R/B channels by ±split px and shifts everything by dx px (used as backdrop-filter: url(#id)). */
const SplitFilter: React.FC<{id: string; dx?: number; split: number; splitY?: number}> = ({id, dx = 0, split, splitY = 0}) => (
  <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feOffset in="SourceGraphic" dx={dx - split} dy={-splitY} result="o1" />
    <feColorMatrix in="o1" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
    <feOffset in="SourceGraphic" dx={dx} dy={0} result="o2" />
    <feColorMatrix in="o2" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
    <feOffset in="SourceGraphic" dx={dx + split} dy={splitY} result="o3" />
    <feColorMatrix in="o3" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
    <feBlend in="r" in2="g" mode="screen" result="rg" />
    <feBlend in="rg" in2="b" mode="screen" />
  </filter>
);

const Flash: React.FC<{k: number; strength: number; tint: string; streak: string}> = ({k, strength, tint, streak}) => {
  const e = (FLASH_ENV[k] ?? 0) * strength;
  if (e <= 0.001) return null;
  const s = Math.min(1, e * 1.25); // streak decays a bit slower
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* over-exposed scene underneath */}
      <AbsoluteFill style={{backdropFilter: `brightness(${(1 + 1.7 * e).toFixed(3)}) saturate(${(1 + 0.6 * e).toFixed(3)}) contrast(${(1 - 0.15 * e).toFixed(3)})`}} />
      {/* white wash, slightly hotter in the middle */}
      <AbsoluteFill
        style={{
          opacity: Math.min(1, e * 0.9),
          background: `radial-gradient(ellipse 75% 70% at 50% 46%, ${rgba(tint, 1)} 0%, ${rgba(tint, 0.92)} 45%, ${rgba(tint, 0.62)} 100%)`,
        }}
      />
      {/* anamorphic lens streak */}
      <div
        style={{
          position: 'absolute', left: -WIDTH * 0.2, width: WIDTH * 1.4, top: HEIGHT * 0.46 - 6, height: 12, opacity: s,
          background: `linear-gradient(90deg, ${rgba(streak, 0)} 0%, ${rgba(streak, 0.8)} 30%, #FFFFFF 50%, ${rgba(streak, 0.8)} 70%, ${rgba(streak, 0)} 100%)`,
          borderRadius: 6,
          boxShadow: `0 0 28px 10px ${rgba(streak, 0.55)}`,
          transform: `scaleY(${(1 + (1 - e) * 1.5).toFixed(3)})`,
        }}
      />
      <div
        style={{
          position: 'absolute', left: WIDTH / 2 - 420, top: HEIGHT * 0.46 - 420, width: 840, height: 840, opacity: s * 0.8,
          background: `radial-gradient(circle, ${rgba('#FFFFFF', 0.9)} 0%, ${rgba(streak, 0.35)} 30%, ${rgba(streak, 0)} 65%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Glitch: React.FC<{k: number; strength: number; seed: number}> = ({k, strength, seed}) => {
  const e = (GLITCH_ENV[k] ?? 0) * strength;
  if (e <= 0.001) return null;
  const r = (n: number | string) => rand(`cut${seed}-${k}-${n}`);
  const id = `cfg${seed}k${k + 10}`;
  const slices = Array.from({length: 7}, (_, i) => {
    const h = 10 + Math.pow(r(`h${i}`), 1.6) * 120;
    const y = r(`y${i}`) * (HEIGHT - h);
    const dx = (r(`x${i}`) - 0.5) * 2 * (40 + 110 * r(`a${i}`)) * e;
    return {h, y, dx, split: 6 + 18 * e * r(`s${i}`)};
  }).filter((_, i) => r(`on${i}`) < 0.35 + 0.65 * e);
  // torn "macroblocks": small chunks of the picture displaced far sideways, over-saturated and hue-shifted
  const blocks = e > 0.4
    ? Array.from({length: 4}, (_, i) => ({
        x: r(`bx${i}`) * (WIDTH - 420), y: r(`by${i}`) * (HEIGHT - 80), w: 90 + r(`bw${i}`) * 330, h: 14 + r(`bh${i}`) * 56,
        dx: (r(`bd${i}`) < 0.5 ? -1 : 1) * (60 + 140 * r(`bm${i}`)), hue: Math.floor(r(`bc${i}`) * 4) * 90 + 45,
      }))
    : [];
  const split = 14 * e;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <SplitFilter id={`${id}all`} split={split} splitY={e > 0.6 ? 2 : 0} />
          {slices.map((s, i) => <SplitFilter key={i} id={`${id}s${i}`} dx={s.dx} split={s.split} />)}
          {blocks.map((b, i) => <SplitFilter key={`b${i}`} id={`${id}b${i}`} dx={b.dx} split={10} />)}
        </defs>
      </svg>
      <AbsoluteFill style={{backdropFilter: `url(#${id}all) saturate(${(1 + 0.4 * e).toFixed(3)})`}} />
      {slices.map((s, i) => (
        <div key={i} style={{position: 'absolute', left: 0, width: WIDTH, top: s.y, height: s.h,
          backdropFilter: `url(#${id}s${i}) brightness(${(1 + 0.25 * e * r(`br${i}`)).toFixed(3)})`}} />
      ))}
      {blocks.map((b, i) => (
        <div key={`b${i}`} style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h,
          backdropFilter: `url(#${id}b${i}) saturate(2.4) contrast(1.35) hue-rotate(${b.hue}deg)`}} />
      ))}
      <AbsoluteFill
        style={{
          opacity: 0.22 * e,
          background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)',
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};

const Vhs: React.FC<{k: number; strength: number; seed: number}> = ({k, strength, seed}) => {
  const e = (VHS_ENV[k] ?? 0) * strength;
  if (e <= 0.001) return null;
  const r = (n: number | string) => rand(`vhs${seed}-${k}-${n}`);
  const id = `cfv${seed}k${k + 10}`;
  const [k0, k1] = CUT_WINDOW.vhs;
  const prog = (k - k0) / (k1 - k0);
  const bandH = 210;
  const bandY = HEIGHT + 40 - prog * (HEIGHT + bandH + 120); // rolls bottom -> top
  const strips = Array.from({length: 9}, (_, i) => {
    const h = bandH / 9;
    const w = Math.sin((i / 8) * Math.PI); // strongest in the middle of the band
    return {y: bandY + i * h, h: h + 1, dx: (r(`d${i}`) - 0.3) * 120 * (0.3 + 0.7 * w) * e, split: 4 + 10 * w * e};
  });
  const jitter = (r('jit') - 0.5) * 10 * e;
  const turbSeed = Math.floor(r('ts') * 1000);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <SplitFilter id={`${id}all`} dx={jitter} split={3 + 4 * e} />
          {strips.map((s, i) => <SplitFilter key={i} id={`${id}s${i}`} dx={s.dx} split={s.split} />)}
        </defs>
      </svg>
      {/* whole-frame chroma bleed + slight jitter + washed colours */}
      <AbsoluteFill style={{backdropFilter: `url(#${id}all) saturate(${(1 - 0.25 * e).toFixed(3)}) contrast(${(1 - 0.08 * e).toFixed(3)})`}} />
      {/* tracking band: displaced, brightened strips */}
      {strips.map((s, i) => (
        <div key={i} style={{position: 'absolute', left: 0, width: WIDTH, top: s.y, height: s.h,
          backdropFilter: `url(#${id}s${i}) brightness(${(1 + 0.45 * e).toFixed(3)}) saturate(0.7) blur(0.8px)`}} />
      ))}
      {/* noise in the band + thin white edge lines */}
      {/* dark trailing edge under the band */}
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: bandY + bandH - 4, height: 10, opacity: 0.5 * e,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0))'}} />
      <svg width={WIDTH} height={bandH + 40} style={{position: 'absolute', left: 0, top: bandY - 20, opacity: Math.min(1, 0.95 * e), mixBlendMode: 'screen'}}>
        <defs>
          <filter id={`${id}n`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves={2} seed={turbSeed} />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.4 -1.25" />
          </filter>
          <linearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.3" stopColor="#fff" stopOpacity={1} />
            <stop offset="0.7" stopColor="#fff" stopOpacity={1} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id={`${id}m`}>
            <rect width={WIDTH} height={bandH + 40} fill={`url(#${id}fade)`} />
          </mask>
        </defs>
        <rect width={WIDTH} height={bandH + 40} filter={`url(#${id}n)`} mask={`url(#${id}m)`} />
        <rect y={20 + bandH * 0.18} width={WIDTH} height={2} fill="#fff" opacity={0.7} />
        <rect y={20 + bandH * 0.62} width={WIDTH} height={3} fill="#fff" opacity={0.45} />
      </svg>
      {/* head-switching noise at the very bottom */}
      <svg width={WIDTH} height={18} style={{position: 'absolute', left: 0, top: HEIGHT - 18, opacity: 0.6 * e, mixBlendMode: 'screen'}}>
        <defs>
          <filter id={`${id}h`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.4 0.5" numOctaves={1} seed={turbSeed + 7} />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2 -0.9" />
          </filter>
        </defs>
        <rect width={WIDTH} height={18} filter={`url(#${id}h)`} />
      </svg>
      {/* faint scanlines */}
      <AbsoluteFill
        style={{
          opacity: 0.18 * e,
          background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 3px)',
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
export type CutEffectProps = {style: CutStyle; k: number; strength?: number; tint?: string; streak?: string; seed?: number};

/** One transition effect at local frame k relative to its cut (k=0 is the first frame of the new shot). */
export const CutEffect: React.FC<CutEffectProps> = ({style, k, strength = 1, tint = '#FFFFFF', streak = '#7FE6FF', seed = 1}) => {
  if (style === 'none') return null;
  const [a, b] = CUT_WINDOW[style];
  if (k < a || k > b) return null;
  if (style === 'flash') return <Flash k={k} strength={strength} tint={tint} streak={streak} />;
  if (style === 'glitch') return <Glitch k={k} strength={strength} seed={seed} />;
  return <Vhs k={k} strength={strength} seed={seed} />;
};

/** Song-wide scene-cut transitions. */
export const CutFlash: React.FC<{frame?: number; cuts?: CutDef[]}> = ({frame, cuts = CUTS}) => {
  const abs = useAbsoluteFrame();
  const f = frame ?? abs;
  const c = cuts.find((x) => x.style !== 'none' && f - x.frame >= CUT_WINDOW[x.style as Exclude<CutStyle, 'none'>][0] && f - x.frame <= CUT_WINDOW[x.style as Exclude<CutStyle, 'none'>][1]);
  if (!c) return null;
  return <CutEffect style={c.style} k={f - c.frame} strength={c.strength} tint={c.tint} streak={c.streak} seed={c.seed} />;
};
