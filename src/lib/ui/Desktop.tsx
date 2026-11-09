/**
 * Y2K UI kit — <Desktop>: an ORIGINAL early-2000s desktop wallpaper backdrop (blue gradient sky, glowing aqua swooshes,
 * soft light orbs) for pop-up scenes, plus an optional taskbar. Pure SVG; animate via `frame`.
 *
 * API
 *   <Desktop frame? variant?='blue'|'night'|'pink' taskbar?={false} clock?='3:15 AM' style?/>   fills its parent (AbsoluteFill-like)
 *
 * Usage
 *   <AbsoluteFill><Desktop frame={frame}/><Dialog .../></AbsoluteFill>
 */
import React from 'react';
import {DLSvg} from './DLSvg';
import type {Prim} from './dl';
import {font, g, hgrad, rad, vgrad} from './dl';
import {iconDL} from './icons';
import {UIF} from './theme';

const PAL = {
  blue: {sky: ['#0A2A9E', '#1E5BFF', '#5FB4FF'], swoosh: ['rgba(191,243,255,0.0)', 'rgba(191,243,255,0.55)'], orb: 'rgba(160,230,255,0.35)'},
  night: {sky: ['#03061E', '#0B1660', '#2A3CB0'], swoosh: ['rgba(138,77,255,0.0)', 'rgba(170,140,255,0.5)'], orb: 'rgba(120,100,255,0.3)'},
  pink: {sky: ['#5A0F8A', '#C42A9E', '#FF8AD0'], swoosh: ['rgba(255,220,250,0.0)', 'rgba(255,230,250,0.55)'], orb: 'rgba(255,200,240,0.35)'},
} as const;

export const Desktop: React.FC<{frame?: number; variant?: keyof typeof PAL; taskbar?: boolean; clock?: string; style?: React.CSSProperties}> = ({
  frame = 0, variant = 'blue', taskbar = false, clock = '3:15 AM', style,
}) => {
  const W = 1920, H = 1080;
  const p = PAL[variant];
  const t = frame / 30;
  const dl: Prim[] = [
    {t: 'rect', x: 0, y: 0, w: W, h: H, fill: vgrad(0, H, [0, p.sky[0]], [0.55, p.sky[1]], [1, p.sky[2]])},
    {t: 'circle', cx: 1500, cy: 180, r: 520, fill: rad(1500, 180, 520, [0, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)'])},
  ];
  // glowing swooshes (arcs) drifting slowly
  for (let i = 0; i < 4; i++) {
    const y0 = 640 + i * 70 + Math.sin(t * 0.6 + i) * 18;
    const amp = 220 + i * 40;
    dl.push({
      t: 'path', d: `M-100 ${y0 + amp * 0.4}C500 ${y0 - amp} 1300 ${y0 + amp * 0.6} 2020 ${y0 - amp * 0.5}`,
      stroke: hgrad(0, W, [0, p.swoosh[0]], [0.5, p.swoosh[1]], [1, p.swoosh[0]]), lw: 26 - i * 5, cap: 'round', alpha: 0.9 - i * 0.15,
    });
  }
  for (let i = 0; i < 7; i++) {
    const cx = ((i * 331 + t * 14 * (1 + (i % 3))) % 2100) - 90, cy = 120 + ((i * 197) % 700), r = 30 + ((i * 53) % 70);
    dl.push({t: 'circle', cx, cy, r, fill: rad(cx, cy, r, [0, p.orb], [1, 'rgba(255,255,255,0)'])});
  }
  if (taskbar) {
    const y = H - 44;
    dl.push(
      {t: 'rect', x: 0, y, w: W, h: 44, fill: vgrad(y, H, [0, '#3F8CF3'], [0.08, '#2763D8'], [0.5, '#1F55C9'], [1, '#1846B0'])},
      {t: 'rect', x: 0, y, w: W, h: 1.5, fill: 'rgba(255,255,255,0.55)'},
      g([
        {t: 'rect', x: 0, y: 0, w: 150, h: 44, r: [0, 18, 18, 0], fill: vgrad(0, 44, [0, '#6BD25B'], [0.5, '#2E9A24'], [1, '#3BAA2F'])},
        {t: 'rect', x: 0, y: 2, w: 140, h: 16, r: [0, 14, 0, 0], fill: 'rgba(255,255,255,0.3)'},
        iconDL('plus', 26, 14, 9, {shadow: false}),
        {t: 'text', x: 48, y: 30, text: 'begin', font: font(22, UIF.web, 'bold', 'italic'), fill: '#FFFFFF', shadow: {dx: 1, dy: 1, blur: 1, color: 'rgba(0,40,0,0.8)'}},
      ], {tx: 0, ty: y}),
      {t: 'rect', x: W - 150, y, w: 150, h: 44, fill: vgrad(y, H, [0, '#1AA0F0'], [1, '#0B77D0'])},
      {t: 'text', x: W - 75, y: y + 29, text: clock, font: font(16, UIF.ui), align: 'center', fill: '#FFFFFF'},
    );
  }
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...style}}>
      <DLSvg dl={dl} w={W} h={H} style={{width: '100%', height: '100%'}} />
    </div>
  );
};
