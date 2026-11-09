/**
 * Y2K UI kit — icons as display lists (48x48 design grid), rendered identically in SVG (2D) and canvas (3D).
 *
 * API
 *   type IconKind = 'error' | 'warning' | 'info' | 'question' | 'lock' | 'coin' | 'plus' | 'at' | 'sparkle'
 *   iconDL(kind, size = 48, x = 0, y = 0, opts?: {shadow?: boolean; spin?: number /*deg, coin/at "spinning" squash*\/}) -> GroupPrim
 *   ICON_KINDS: IconKind[]
 *   <Icon kind size x? y? spin? style?/>  (2D; see Icon.tsx)
 *
 * Usage
 *   const dl = [iconDL('error', 52, 20, 20)];
 */
import type {GroupPrim, Prim} from './dl';
import {g, rad, sparkleD, vgrad} from './dl';

export type IconKind = 'error' | 'warning' | 'info' | 'question' | 'lock' | 'coin' | 'plus' | 'at' | 'sparkle';
export const ICON_KINDS: IconKind[] = ['error', 'warning', 'info', 'question', 'lock', 'coin', 'plus', 'at', 'sparkle'];

const DROP = {dx: 1.5, dy: 2.5, blur: 3, color: 'rgba(0,0,0,0.35)'};
const gloss = (cx: number, cy: number, rx: number, ry: number, a = 0.8): Prim => ({
  t: 'ellipse', cx, cy, rx, ry, fill: vgrad(cy - ry, cy + ry, [0, `rgba(255,255,255,${a})`], [1, 'rgba(255,255,255,0)']),
});

const orb = (c0: string, c1: string, c2: string, edge: string, shadow: boolean): Prim[] => [
  {t: 'circle', cx: 24, cy: 24, r: 21, fill: rad(24, 24, 22, [0, c0], [1, c0]), shadow: shadow ? DROP : undefined},
  {t: 'circle', cx: 24, cy: 24, r: 21, fill: {rad: [24, 26, 23, 17, 13], stops: [[0, c0], [0.5, c1], [1, c2]]}, stroke: edge, lw: 1.6},
  gloss(24, 14.5, 14.5, 8.5),
];

const ICONS: Record<IconKind, (shadow: boolean) => Prim[]> = {
  error: (s) => [
    ...orb('#FF9A88', '#EE2E1C', '#9C0B04', '#6E0702', s),
    {t: 'path', d: 'M16.5 16.5L31.5 31.5M31.5 16.5L16.5 31.5', stroke: 'rgba(90,0,0,0.35)', lw: 6.5, cap: 'round'},
    {t: 'path', d: 'M16.5 16L31.5 31M31.5 16L16.5 31', stroke: '#FFFFFF', lw: 5, cap: 'round'},
  ],
  warning: (s) => [
    {t: 'path', d: 'M24 5L44.5 41.5H3.5Z', stroke: '#7A4A00', lw: 7, join: 'round', fill: '#7A4A00', shadow: s ? DROP : undefined},
    {t: 'path', d: 'M24 5L44.5 41.5H3.5Z', stroke: vgrad(5, 42, [0, '#FFF27A'], [1, '#F2A800']), lw: 4, join: 'round',
      fill: vgrad(5, 42, [0, '#FFF27A'], [0.55, '#FFD21C'], [1, '#F2A800'])},
    {t: 'path', d: 'M24 8.5L36.5 30.5Q24 25 11.5 30.5Z', fill: vgrad(8, 30, [0, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0)'])},
    {t: 'rect', x: 21.3, y: 15, w: 5.4, h: 15.5, r: 2.7, fill: '#2A1A00'},
    {t: 'circle', cx: 24, cy: 35.6, r: 3.1, fill: '#2A1A00'},
  ],
  info: (s) => [
    ...orb('#A6DCFF', '#2E86F0', '#0A39A8', '#062A80', s),
    {t: 'circle', cx: 24, cy: 13.6, r: 3.4, fill: '#FFFFFF'},
    {t: 'path', d: 'M19.5 20H27V34H29.5V37.5H18.5V34H21V23.5H19.5Z', fill: '#FFFFFF', stroke: '#FFFFFF', lw: 0.6, join: 'round'},
  ],
  question: (s) => [
    ...orb('#A6DCFF', '#2E86F0', '#0A39A8', '#062A80', s),
    {t: 'path', d: 'M17.6 18.2C17.6 10.6 30.6 10.4 30.6 18C30.6 23.4 24 23.4 24 29.2', stroke: '#FFFFFF', lw: 5, cap: 'round', join: 'round'},
    {t: 'circle', cx: 24, cy: 36.2, r: 3.2, fill: '#FFFFFF'},
  ],
  lock: (s) => [
    {t: 'path', d: 'M14.5 23V16A9.5 9.5 0 0 1 33.5 16V23', stroke: '#2A2D38', lw: 8.5, cap: 'round', shadow: s ? DROP : undefined},
    {t: 'path', d: 'M14.5 23V16A9.5 9.5 0 0 1 33.5 16V23', stroke: {lin: [14, 6, 34, 20], stops: [[0, '#FFFFFF'], [0.5, '#B7BFD0'], [1, '#EEF2F8']]}, lw: 5, cap: 'round'},
    {t: 'rect', x: 8.5, y: 21, w: 31, h: 23.5, r: 4.5, fill: vgrad(21, 44, [0, '#FF6D5E'], [0.5, '#E2231A'], [1, '#9A0B05']), stroke: '#5E0602', lw: 1.6,
      shadow: s ? DROP : undefined},
    {t: 'rect', x: 11, y: 22.8, w: 26, h: 8, r: 3.5, fill: vgrad(22.8, 30.8, [0, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0.05)'])},
    {t: 'circle', cx: 24, cy: 31.5, r: 3.6, fill: '#3A0402'},
    {t: 'path', d: 'M22.2 32.5H25.8L26.6 39.5H21.4Z', fill: '#3A0402'},
  ],
  coin: (s) => [
    {t: 'circle', cx: 24, cy: 24, r: 21, fill: {rad: [24, 26, 23, 17, 13], stops: [[0, '#FFF6B0'], [0.5, '#F7C531'], [1, '#B37306']]},
      stroke: '#6E4500', lw: 1.6, shadow: s ? DROP : undefined},
    {t: 'circle', cx: 24, cy: 24, r: 16.5, stroke: 'rgba(150,95,0,0.8)', lw: 1.6},
    {t: 'text', x: 24, y: 33.6, text: '$', font: 'bold 27px Georgia, serif', align: 'center', fill: '#7A4C00', stroke: 'rgba(255,240,170,0.9)', lw: 1.4,
      strokeFirst: true},
    gloss(24, 14.5, 14, 8, 0.7),
  ],
  plus: (s) => [
    ...orb('#FFF0A6', '#F6B21C', '#B5610A', '#6E3A00', s),
    {t: 'path', d: 'M24 13.5V34.5M13.5 24H34.5', stroke: 'rgba(110,50,0,0.4)', lw: 7.5, cap: 'round'},
    {t: 'path', d: 'M24 13V34M13.5 23.5H34.5', stroke: '#FFFFFF', lw: 6, cap: 'round'},
  ],
  at: (s) => [
    ...orb('#C7F4FF', '#19C6FF', '#0A5FC4', '#043F8C', s),
    {t: 'text', x: 24, y: 33.5, text: '@', font: 'bold 30px Verdana, sans-serif', align: 'center', fill: '#FFFFFF', stroke: 'rgba(0,40,110,0.55)', lw: 2.4,
      strokeFirst: true},
  ],
  sparkle: () => [
    {t: 'path', d: sparkleD(24, 24, 22, 0.16), fill: rad(24, 24, 22, [0, '#FFFFFF'], [0.35, '#FFFFFF'], [1, 'rgba(191,243,255,0.9)'])},
    {t: 'circle', cx: 24, cy: 24, r: 5, fill: '#FFFFFF'},
  ],
};

/**
 * Icon display list, drawn in a size x size box at (x, y).
 * `spin` (degrees) horizontally squashes the icon like a spinning-coin GIF (cos(spin)).
 */
export const iconDL = (kind: IconKind, size = 48, x = 0, y = 0, opts: {shadow?: boolean; spin?: number} = {}): GroupPrim => {
  const k = size / 48;
  const sp = opts.spin ? Math.cos((opts.spin * Math.PI) / 180) : 1;
  const inner = g(ICONS[kind](opts.shadow ?? true), sp !== 1 ? {tx: 24, sx: sp, ty: 0} : {});
  if (sp !== 1) inner.c = [g(inner.c, {tx: -24})];
  return g([inner], {tx: x, ty: y, sx: k, sy: k});
};
