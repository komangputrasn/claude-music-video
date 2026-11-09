/**
 * Y2K UI kit — banner ads, starbursts, marquee tickers and hit counters as display lists.
 *
 * Banner animation is GIF-like: it advances in "ticks" of 3 frames (10 fps) and every animation loops every
 * 24 ticks, so 3D banner textures cache at most 24 states.
 *
 * API
 *   type BannerVariant = 'click' | 'buy' | 'free' | 'visitor' | 'upgrade'
 *   BANNER_VARIANTS, BANNER_TICK (=3 frames), BANNER_LOOP (=24 ticks)
 *   bannerDL(variant, {label?, sub?, frame, w=468, h=60}) -> Drawing
 *   starburstDL({text, color, textColor?, points=16, size=140, rotation=0, wobble?}) -> Drawing (size x size)
 *   marqueeDL({text, frame, speed=4, w=600, h=36, variant='ticker'|'led'|'plain', color?, background?, fontFamily?}) -> Drawing
 *   hitCounterDL({value, digits=7, label='You are visitor #', digitH=34}) -> Drawing   (fractional value = rolling odometer)
 *
 * Usage
 *   const b = bannerDL('click', {frame}); <DLSvg dl={b.dl} w={b.w} h={b.h}/>
 */
import type {Drawing, Prim} from './dl';
import {font, g, hgrad, measureText, rad, sparkleD, starPts, vgrad} from './dl';
import {aquaButtonDL, aquaButtonWidth} from './widgets';
import {rand} from '../time';
import {UIF} from './theme';
import {C} from '../palette';

export type BannerVariant = 'click' | 'buy' | 'free' | 'visitor' | 'upgrade';
export const BANNER_VARIANTS: BannerVariant[] = ['click', 'buy', 'free', 'visitor', 'upgrade'];
export const BANNER_TICK = 3;
export const BANNER_LOOP = 24;
export const bannerTick = (frame: number) => (((Math.floor(frame / BANNER_TICK) % BANNER_LOOP) + BANNER_LOOP) % BANNER_LOOP);

export type BannerOpts = {label?: string; sub?: string; frame: number; w?: number; h?: number};

const sparkle = (cx: number, cy: number, r: number, a = 1): Prim => ({
  t: 'path', d: sparkleD(cx, cy, r, 0.16), fill: rad(cx, cy, r, [0, '#FFFFFF'], [0.4, '#FFFFFF'], [1, 'rgba(191,243,255,0.85)']), alpha: a,
});
const twinkle = (tick: number, i: number) => {
  const ph = (tick + i * 2) % 6;
  return ph < 3 ? [0.35, 0.75, 1][ph] : [0.75, 0.35, 0][ph - 3];
};

const frameBorder = (w: number, h: number, outer = '#000', inner = 'rgba(255,255,255,0.9)'): Prim[] => [
  {t: 'rect', x: 1, y: 1, w: w - 2, h: h - 2, stroke: outer, lw: 2},
  {t: 'rect', x: 3.5, y: 3.5, w: w - 7, h: h - 7, stroke: inner, lw: 1.2},
];

const fitSize = (f: (s: number) => string, text: string, maxW: number, size: number, ls = 0) => {
  const w = measureText(f(size), text, ls);
  return w > maxW ? (size * maxW) / w : size;
};

export const bannerDL = (variant: BannerVariant, o: BannerOpts): Drawing => {
  const w = o.w ?? 468, h = o.h ?? 60;
  const t = bannerTick(o.frame);
  const dl: Prim[] = [];
  const clip = {x: 0, y: 0, w, h};
  if (variant === 'click') {
    const on = t % 2 === 0;
    const bg = on ? vgrad(0, h, [0, '#FF4A2E'], [1, '#B80C05']) : vgrad(0, h, [0, '#FFF65C'], [1, '#FFBE00']);
    const inner: Prim[] = [{t: 'rect', x: 0, y: 0, w, h, fill: bg}];
    // chasing chevrons
    const lit = t % 4;
    for (let i = 0; i < 3; i++) {
      const a = i <= lit ? 1 : 0.25;
      const cx = h * 0.35 + i * h * 0.3, cy = h / 2, s = h * 0.2;
      const col = on ? '#FFF200' : '#E2231A';
      inner.push({t: 'poly', pts: [cx - s * 0.6, cy - s, cx + s * 0.6, cy, cx - s * 0.6, cy + s], fill: col, stroke: '#000', lw: 1.5, join: 'round', alpha: a});
      const rx = w - cx;
      inner.push({t: 'poly', pts: [rx + s * 0.6, cy - s, rx - s * 0.6, cy, rx + s * 0.6, cy + s], fill: col, stroke: '#000', lw: 1.5, join: 'round', alpha: a});
    }
    const label = o.label ?? 'CLICK HERE!!!';
    const fz = fitSize((s) => font(s, UIF.impact), label, w - h * 2.4, h * 0.66, 1);
    const sub = o.sub;
    const ty = sub ? h * 0.56 : h / 2 + fz * 0.36;
    inner.push({t: 'text', x: w / 2, y: ty, text: label, font: font(fz, UIF.impact), ls: 1, align: 'center', fill: on ? '#FFF200' : '#E2231A',
      stroke: '#000', lw: Math.max(2, fz * 0.1), strokeFirst: true, shadow: {dx: 2, dy: 2, blur: 0, color: 'rgba(0,0,0,0.6)'}});
    if (sub) inner.push({t: 'text', x: w / 2, y: h * 0.86, text: sub, font: font(h * 0.2, UIF.verdana, 'bold'), align: 'center', fill: on ? '#FFFFFF' : '#000'});
    inner.push(sparkle(w * 0.22, h * 0.24, h * 0.16, twinkle(t, 0)), sparkle(w * 0.8, h * 0.76, h * 0.14, twinkle(t, 1)));
    dl.push(g(inner, {clip}), ...frameBorder(w, h));
  } else if (variant === 'buy') {
    const inner: Prim[] = [
      {t: 'rect', x: 0, y: 0, w, h, fill: hgrad(0, w, [0, C.titleA], [0.6, C.y2kBlue], [1, C.aqua])},
      {t: 'rect', x: 0, y: 0, w, h: h * 0.5, fill: vgrad(0, h * 0.5, [0, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0.08)'])},
    ];
    // diagonal sheen sweep
    const sx = -w * 0.3 + (t / BANNER_LOOP) * w * 1.6;
    inner.push({t: 'poly', pts: [sx, 0, sx + h * 0.5, 0, sx + h * 0.1, h, sx - h * 0.4, h], fill: 'rgba(255,255,255,0.22)'});
    const btnH = h * 0.62;
    const label = o.label ?? 'BUY NOW';
    const bw = aquaButtonWidth(label, btnH);
    const pulse = 0.5 + 0.5 * Math.sin((t / 12) * Math.PI * 2);
    const burst = starburstDL({text: 'NEW!', size: h * 0.95, rotation: t * 15, color: '#FFE600', points: 14});
    inner.push(g(burst.dl, {tx: h * 0.06, ty: h * 0.025}));
    const sub = o.sub ?? 'Pillow Premium™ only $4.99/night!';
    const tx = h * 1.12;
    const fz = fitSize((s) => font(s, UIF.web, 'bold', 'italic'), sub, w - tx - bw - h * 0.5, h * 0.3);
    inner.push({t: 'text', x: tx, y: h / 2 + fz * 0.36, text: sub, font: font(fz, UIF.web, 'bold', 'italic'), fill: '#FFFFFF',
      shadow: {dx: 1.5, dy: 1.5, blur: 0, color: 'rgba(0,10,70,0.8)'}});
    inner.push(aquaButtonDL(w - bw - h * 0.22, (h - btnH) / 2, bw, btnH, label, {color: 'lime', glow: 0.35 + 0.65 * pulse}));
    dl.push(g(inner, {clip}), ...frameBorder(w, h, '#021A66'));
  } else if (variant === 'free') {
    const inner: Prim[] = [{t: 'rect', x: 0, y: 0, w, h, fill: hgrad(0, w, [0, '#6A16D0'], [0.55, C.grape], [1, C.bubblegum])}];
    // rotating light rays
    const cx = w * 0.36, cy = h * 0.5, R = w;
    for (let i = 0; i < 12; i++) {
      const a0 = ((i * 30 + t * 3.75) * Math.PI) / 180, a1 = a0 + (12 * Math.PI) / 180;
      inner.push({t: 'poly', pts: [cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R], fill: 'rgba(255,255,255,0.13)'});
    }
    const label = o.label ?? 'FREE*';
    const pulse = 1 + 0.06 * Math.sin((t / 6) * Math.PI * 2);
    const fz = fitSize((s) => font(s, UIF.heavy, 'bold'), label, w * 0.5, h * 0.72) * pulse;
    inner.push({t: 'text', x: cx, y: cy + fz * 0.36, text: label, font: font(fz, UIF.heavy, 'bold'), align: 'center',
      fill: vgrad(cy - fz * 0.4, cy + fz * 0.4, [0, '#F4FFB8'], [0.45, C.lime], [1, '#36A80A']), stroke: '#0B3A00', lw: Math.max(2.5, fz * 0.09),
      strokeFirst: true, shadow: {dx: 2.5, dy: 2.5, blur: 0, color: 'rgba(40,0,60,0.6)'}});
    const sub = o.sub ?? '*$9.99/mo after 0-day free trial. Cancel anytime.** **You cannot cancel.';
    const sf = font(Math.max(7, h * 0.13), UIF.verdana);
    const lines = sub.split('. ').map((s, i, a) => (i < a.length - 1 ? s + '.' : s));
    const half = Math.ceil(lines.length / 2);
    const l1 = lines.slice(0, half).join(' '), l2 = lines.slice(half).join(' ');
    const fx = w * 0.69;
    inner.push({t: 'text', x: fx, y: h * 0.43, text: l1, font: sf, align: 'center', fill: 'rgba(255,255,255,0.92)'});
    inner.push({t: 'text', x: fx, y: h * 0.66, text: l2, font: sf, align: 'center', fill: 'rgba(255,255,255,0.92)'});
    inner.push(sparkle(w * 0.1, h * 0.3, h * 0.17, twinkle(t, 0)), sparkle(w * 0.58, h * 0.22, h * 0.13, twinkle(t, 2)),
      sparkle(w * 0.52, h * 0.8, h * 0.1, twinkle(t, 4)));
    dl.push(g(inner, {clip}), ...frameBorder(w, h, '#2A0050'));
  } else if (variant === 'visitor') {
    const inner: Prim[] = [{t: 'rect', x: 0, y: 0, w, h, fill: vgrad(0, h, [0, '#000018'], [1, '#0A0A3A'])}];
    for (let i = 0; i < 40; i++) {
      const tw = (t + Math.floor(rand(`vs${i}`) * 6)) % 6;
      inner.push({t: 'circle', cx: rand(`vx${i}`) * w, cy: rand(`vy${i}`) * h, r: 0.5 + rand(`vr${i}`) * 0.9, fill: '#FFFFFF', alpha: tw < 3 ? 0.9 : 0.3});
    }
    // rainbow per-letter headline
    const head = '★ CONGRATULATIONS!! ★';
    const hf = font(h * 0.27, UIF.comic, 'bold');
    let hx = w / 2 - measureText(hf, head) / 2;
    const chars = Array.from(head);
    chars.forEach((ch, i) => {
      const hue = (i * 24 + t * 15) % 360;
      inner.push({t: 'text', x: hx, y: h * 0.34, text: ch, font: hf, fill: `hsl(${hue}, 100%, 62%)`});
      hx += measureText(hf, ch);
    });
    const label = o.label ?? 'You are visitor #';
    const value = o.sub ?? '0000001';
    const lf = font(h * 0.27, UIF.verdana, 'bold');
    const dH = h * 0.4;
    const counter = hitCounterDL({value: Number(value) || 0, digits: value.length, label: null, digitH: dH});
    const lw = measureText(lf, label);
    const total = lw + 6 + counter.w;
    const x0 = (w - total) / 2;
    const yb = h * 0.79;
    inner.push({t: 'text', x: x0, y: yb, text: label, font: lf, fill: t % 2 ? '#FFFFFF' : '#FFF200'});
    inner.push(g(counter.dl, {tx: x0 + lw + 6, ty: yb - dH * 0.82 - (counter.h - dH) / 2}));
    dl.push(g(inner, {clip}), ...frameBorder(w, h, '#FFF200', 'rgba(255,79,184,0.9)'));
  } else {
    // upgrade
    const inner: Prim[] = [
      {t: 'rect', x: 0, y: 0, w, h, fill: vgrad(0, h, [0, '#FFF1A0'], [0.5, '#FFC93D'], [0.52, '#F5A800'], [1, '#FFCF4A'])},
    ];
    const sx = -w * 0.25 + (t / BANNER_LOOP) * w * 1.5;
    inner.push({t: 'poly', pts: [sx, 0, sx + h * 0.35, 0, sx - h * 0.15, h, sx - h * 0.5, h], fill: 'rgba(255,255,255,0.55)'});
    const badge = h * 0.78;
    inner.push(g([...(starburstDL({text: '+', size: badge, rotation: -t * 7.5, color: C.bubblegum, textColor: '#FFFFFF', points: 12}).dl)],
      {tx: h * 0.14, ty: (h - badge) / 2}));
    const label = o.label ?? 'UPGRADE TO PLUS';
    const sub = o.sub ?? 'Unlock breakfast, sleep & doors!';
    const tx = h * 1.05;
    const fz = fitSize((s) => font(s, UIF.heavy, 'bold'), label, w - tx - h * 0.3, h * 0.38);
    inner.push({t: 'text', x: tx, y: h * 0.5, text: label, font: font(fz, UIF.heavy, 'bold'), fill: '#FFFFFF', stroke: '#9A4A00', lw: Math.max(2, fz * 0.14),
      strokeFirst: true});
    inner.push({t: 'text', x: tx + 2, y: h * 0.82, text: sub, font: font(h * 0.22, UIF.web, 'bold', 'italic'), fill: '#6A3300'});
    inner.push(sparkle(w * 0.93, h * 0.28, h * 0.17, twinkle(t, 1)), sparkle(w * 0.86, h * 0.75, h * 0.11, twinkle(t, 3)));
    dl.push(g(inner, {clip}), ...frameBorder(w, h, '#7A3E00', 'rgba(255,255,255,0.85)'));
  }
  return {w, h, dl};
};

// ---------------------------------------------------------------- starburst
export type StarburstOpts = {text: string; color?: string; textColor?: string; points?: number; size?: number; rotation?: number; textRotation?: number};
export const starburstDL = (o: StarburstOpts): Drawing => {
  const size = o.size ?? 140;
  const r = size / 2;
  const n = o.points ?? 16;
  const color = o.color ?? '#FFE600';
  const pts = starPts(r, r, n, r * 0.98, r * 0.8, -90 + (o.rotation ?? 0));
  const inner = starPts(r, r, n, r * 0.86, r * 0.7, -90 + (o.rotation ?? 0));
  const dl: Prim[] = [
    {t: 'poly', pts, fill: '#8A1A00', shadow: {dx: size * 0.015, dy: size * 0.025, blur: size * 0.03, color: 'rgba(0,0,0,0.35)'}},
    {t: 'poly', pts, fill: {rad: [r, r, r, r * 0.8, r * 0.7], stops: [[0, '#FFFFFF'], [0.25, color], [1, color]]}, stroke: '#A02800', lw: Math.max(1, size * 0.012), join: 'round'},
    {t: 'poly', pts: inner, stroke: 'rgba(255,255,255,0.75)', lw: Math.max(0.8, size * 0.01), join: 'round'},
  ];
  const tc = o.textColor ?? C.alertRed;
  const f = (s: number) => font(s, UIF.impact);
  const fz = fitSize(f, o.text, r * 1.25, r * 0.6);
  dl.push(g([{t: 'text', x: 0, y: fz * 0.36, text: o.text, font: f(fz), align: 'center', fill: tc, stroke: '#FFFFFF', lw: Math.max(2, fz * 0.14), strokeFirst: true}],
    {tx: r, ty: r, rot: o.textRotation ?? -14}));
  return {w: size, h: size, dl};
};

// ---------------------------------------------------------------- marquee
export type MarqueeVariant = 'ticker' | 'led' | 'plain';
export type MarqueeOpts = {text: string; frame: number; speed?: number; w?: number; h?: number; variant?: MarqueeVariant; color?: string; background?: string;
  fontFamily?: string; separator?: string};
export const marqueeDL = (o: MarqueeOpts): Drawing => {
  const w = o.w ?? 600, h = o.h ?? 36;
  const v = o.variant ?? 'ticker';
  const fam = o.fontFamily ?? (v === 'led' ? UIF.mono : UIF.verdana);
  const fz = h * (v === 'led' ? 0.62 : 0.55);
  const f = font(fz, fam, 'bold');
  const item = o.text + (o.separator ?? '   ★   ');
  const iw = Math.max(20, measureText(f, item));
  const off = (((o.frame * (o.speed ?? 4)) % iw) + iw) % iw;
  const color = o.color ?? (v === 'led' ? '#FF3A1A' : v === 'ticker' ? '#FFF200' : '#0033CC');
  const bg: Prim[] =
    v === 'plain'
      ? o.background ? [{t: 'rect', x: 0, y: 0, w, h, fill: o.background}] : []
      : v === 'led'
        ? [{t: 'rect', x: 0, y: 0, w, h, r: 3, fill: o.background ?? '#0A0604', stroke: '#3A3A3A', lw: 2}]
        : [{t: 'rect', x: 0, y: 0, w, h, fill: o.background ?? vgrad(0, h, [0, '#0B2E9E'], [0.5, '#071C6E'], [1, '#04124A'])},
            {t: 'rect', x: 0, y: 0, w, h: h * 0.45, fill: 'rgba(255,255,255,0.12)'}];
  const texts: Prim[] = [];
  for (let x = -off; x < w; x += iw)
    texts.push({t: 'text', x, y: h / 2 + fz * 0.36, text: item, font: f, fill: color, shadow: v === 'led' ? {blur: fz * 0.4, color} : undefined});
  const dl: Prim[] = [...bg, g(texts, {clip: {x: 2, y: 0, w: w - 4, h}})];
  if (v === 'led')
    dl.push(g(Array.from({length: Math.ceil(h / 3)}, (_, i) => ({t: 'rect' as const, x: 0, y: i * 3 + 2, w, h: 1, fill: 'rgba(0,0,0,0.35)'})), {clip: {x: 0, y: 0, w, h}}));
  if (v === 'ticker') dl.push({t: 'rect', x: 0.5, y: 0.5, w: w - 1, h: h - 1, stroke: '#9FC4FF', lw: 1});
  return {w, h, dl};
};

// ---------------------------------------------------------------- hit counter
export type HitCounterOpts = {value: number; digits?: number; label?: string | null; digitH?: number};
export const hitCounterDL = (o: HitCounterOpts): Drawing => {
  const digits = o.digits ?? 7;
  const dh = o.digitH ?? 34;
  const dw = Math.round(dh * 0.68);
  const gap = Math.max(1, Math.round(dh * 0.07));
  const label = o.label === undefined ? 'You are visitor #' : o.label;
  const lf = font(dh * 0.5, UIF.verdana, 'bold');
  const lw = label ? measureText(lf, label) + dh * 0.3 : 0;
  const v = Math.max(0, o.value);
  const base = Math.floor(v);
  const frac = v - base;
  const dl: Prim[] = [];
  if (label) dl.push({t: 'text', x: 0, y: dh * 0.5 + dh * 0.18, text: label, font: lf, fill: '#101010'});
  const x0 = lw;
  const W = digits * dw + (digits - 1) * gap + gap * 4;
  dl.push({t: 'rect', x: x0, y: -gap * 2, w: W, h: dh + gap * 4, r: 2, fill: vgrad(-gap * 2, dh + gap * 2, [0, '#5A5A5A'], [1, '#1A1A1A']), stroke: '#000', lw: 1});
  const df = font(dh * 0.78, UIF.mono, 'bold');
  // odometer: digit k rolls when every lower digit shows 9 (and the units digit is rolling)
  let carry = frac;
  for (let k = 0; k < digits; k++) {
    const i = digits - 1 - k;
    const d = Math.floor(base / Math.pow(10, k)) % 10;
    const roll = carry;
    if (d !== 9) carry = 0;
    const x = x0 + gap * 2 + i * (dw + gap);
    const cell: Prim[] = [
      {t: 'rect', x: 0, y: 0, w: dw, h: dh, fill: vgrad(0, dh, [0, '#2A2A2A'], [0.48, '#0A0A0A'], [0.52, '#000000'], [1, '#262626'])},
    ];
    const ys = dh / 2 + dh * 0.28 - roll * dh;
    cell.push({t: 'text', x: dw / 2, y: ys, text: String(d), font: df, align: 'center', fill: '#F4F4F4'});
    cell.push({t: 'text', x: dw / 2, y: ys + dh, text: String((d + 1) % 10), font: df, align: 'center', fill: '#F4F4F4'});
    cell.push({t: 'rect', x: 0, y: dh / 2 - 0.5, w: dw, h: 1, fill: 'rgba(0,0,0,0.9)'});
    cell.push({t: 'rect', x: 0, y: 0, w: dw, h: dh * 0.45, fill: 'rgba(255,255,255,0.10)'});
    dl.push(g(cell, {tx: x, ty: 0, clip: {x: 0, y: 0, w: dw, h: dh}}));
  }
  return {w: lw + W, h: dh + gap * 4, dl: [g(dl, {ty: gap * 2})]};
};
