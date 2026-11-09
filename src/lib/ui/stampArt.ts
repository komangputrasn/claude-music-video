/**
 * Y2K UI kit — red rubber stamp ("CANCELLED") display list + slam animation curve.
 *
 * API
 *   stampDL({text='CANCELLED', color='#D91F1A', seed=1, size=44, fontFamily?}) -> Drawing {w,h,dl}  (unrotated, origin top-left)
 *   stampSlam(progress) -> {scale, alpha, lift, impact}   pure slam curve shared by <Stamp> and <Stamp3D>
 *        progress 0..1 — 0 hidden, ~0.38 contact, 1 settled. `impact` is a 0..1 pulse at contact (use it for camera shake / flashes).
 *
 * Usage
 *   const s = stampDL({text: 'DENIED'}); <DLSvg dl={s.dl} w={s.w} h={s.h}/>
 *   const {impact} = stampSlam(ramp(frame, 40, 52, t => t)); // shake the camera by impact * 0.05
 */
import type {Drawing, Prim} from './dl';
import {font, g, measureText} from './dl';
import {rand} from '../time';
import {UIF} from './theme';

export type StampOpts = {text?: string; color?: string; seed?: number; size?: number; fontFamily?: string};

export const STAMP_RED = '#D91F1A';

export const stampDL = (o: StampOpts = {}): Drawing => {
  const text = o.text ?? 'CANCELLED';
  const size = o.size ?? 44;
  const color = o.color ?? STAMP_RED;
  const seed = o.seed ?? 1;
  const ls = size * 0.06;
  const f = font(size, o.fontFamily ?? UIF.heavy, 'bold');
  const tw = measureText(f, text, ls) - ls;
  const capH = size * 0.72;
  const outerLW = size * 0.13;
  const innerInset = size * 0.24;
  const padX = size * 0.5 + innerInset;
  const w = Math.round(tw + padX * 2);
  const h = Math.round(capH + size * 0.62 + innerInset * 2);
  const c: Prim[] = [
    {t: 'rect', x: outerLW / 2, y: outerLW / 2, w: w - outerLW, h: h - outerLW, r: size * 0.2, stroke: color, lw: outerLW},
    {t: 'rect', x: innerInset, y: innerInset, w: w - innerInset * 2, h: h - innerInset * 2, r: size * 0.08, stroke: color, lw: size * 0.05},
    {t: 'text', x: w / 2, y: h / 2 + capH / 2, text, font: f, ls, align: 'center', fill: color},
  ];
  // ink wear: specks, scratches and a few dry patches (seeded, deterministic)
  const knock: Prim[] = [];
  const r = (i: number, k: string) => rand(`stamp${seed}-${i}-${k}`);
  const specks = Math.round((w * h) / 70);
  for (let i = 0; i < specks; i++) {
    const big = r(i, 'b') < 0.12;
    knock.push({t: 'circle', cx: r(i, 'x') * w, cy: r(i, 'y') * h, r: (big ? 1.2 : 0.35) + r(i, 'r') * (big ? 1.6 : 0.9), fill: '#000', alpha: 0.55 + r(i, 'a') * 0.45});
  }
  for (let i = 0; i < 9; i++) {
    const x = r(i, 'sx') * w, y = r(i, 'sy') * h, a = (r(i, 'sa') - 0.5) * 0.9, L = size * (0.6 + r(i, 'sl') * 1.8);
    knock.push({t: 'path', d: `M${x} ${y}L${x + Math.cos(a) * L} ${y + Math.sin(a) * L}`, stroke: '#000', lw: 0.5 + r(i, 'sw') * 0.9, cap: 'round', alpha: 0.7});
  }
  for (let i = 0; i < 6; i++) {
    knock.push({t: 'ellipse', cx: r(i, 'px') * w, cy: r(i, 'py') * h, rx: size * (0.25 + r(i, 'pr') * 0.5), ry: size * (0.12 + r(i, 'pq') * 0.25),
      fill: '#000', alpha: 0.18 + r(i, 'pa') * 0.25});
  }
  return {w, h, dl: [g(c, {knock, alpha: 0.94})]};
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** Slam curve: falls from big & transparent, hits at p≈0.38, squashes, settles. */
export const stampSlam = (progress: number) => {
  const p = clamp01(progress);
  if (p <= 0) return {scale: 3, alpha: 0, lift: 1, impact: 0};
  const HIT = 0.38;
  if (p < HIT) {
    const f = p / HIT;
    const e = f * f; // accelerate into the paper
    return {scale: 3 - 2.06 * e, alpha: Math.min(1, f * 2.2) * 0.85, lift: 1 - e, impact: 0};
  }
  const u = (p - HIT) / (1 - HIT);
  const squash = Math.sin(Math.min(1, u / 0.35) * Math.PI) * (1 - u) * 0.08;
  return {scale: 0.94 + 0.06 * Math.min(1, u / 0.25) - squash * 0.3, alpha: 1, lift: 0, impact: Math.exp(-u * 7)};
};
