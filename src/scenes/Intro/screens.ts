/**
 * "Y2K OS" TV-screen pictures for the Intro, as display lists (lib/ui/dl) on a 640x480 (4:3) canvas.
 * Text is TV-sized (big) so it reads when the CRT is only part of the frame.
 *   bootDL(f)            blue boot screen: glossy orb logo, "Y2K OS", sliding blocks
 *   loadingDL(p, f)      desktop + "Loading your life..." window, progress p (0..0.99)
 *   dialogScreenDL(...)  desktop + the "subscription to EVERYTHING" dialog + cursor
 *   thanksDL(rot)        sunburst "THANK YOU!" card
 */
import {
  Prim, g, vgrad, hgrad, rad, font, sparkleD, measureText,
  winChromeDL, winBodyRect, progressDL, dialogDL, layoutDialog, DialogSpec, iconDL, cursorDL, CursorKind, aquaButtonDL,
} from '../../lib/ui';
import {FONTS} from '../../lib/palette';

export const SCR_W = 640;
export const SCR_H = 480;

const SHADOW = {dx: 2, dy: 2, blur: 2, color: 'rgba(0,10,60,0.75)'};

// ------------------------------------------------------------------------------------------------ boot
export const bootDL = (f: number, appear = 1): Prim[] => {
  const dl: Prim[] = [];
  dl.push({t: 'rect', x: 0, y: 0, w: SCR_W, h: SCR_H, fill: vgrad(0, SCR_H, [0, '#020a4a'], [0.45, '#0b2fb8'], [0.75, '#0a3fd8'], [1, '#020a4a'])});
  // faint horizontal bands
  for (let i = 0; i < 12; i++) dl.push({t: 'rect', x: 0, y: i * 40 + 18, w: SCR_W, h: 2, fill: 'rgba(120,180,255,0.06)'});
  const cx = 320, cy = 175;
  const a = appear;
  const logo: Prim[] = [];
  // swoosh ring behind the orb
  logo.push({t: 'ellipse', cx, cy: cy + 6, rx: 150, ry: 44, stroke: hgrad(cx - 150, cx + 150, [0, 'rgba(255,79,184,0)'], [0.3, '#FF4FB8'], [0.7, '#19C6FF'], [1, 'rgba(25,198,255,0)']), lw: 7});
  // glossy orb
  logo.push({t: 'circle', cx, cy, r: 74, fill: rad(cx, cy, 80, [0, '#9BEFFF'], [0.55, '#19A6FF'], [1, '#0A3FD8']), stroke: '#BFF3FF', lw: 3,
    shadow: {dx: 0, dy: 0, blur: 30, color: 'rgba(25,198,255,0.9)'}});
  logo.push({t: 'ellipse', cx, cy: cy - 38, rx: 52, ry: 28, fill: vgrad(cy - 66, cy - 10, [0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)'])});
  // 4-point sparkle in the orb
  const rot = (f * 4) % 360;
  logo.push(g([{t: 'path', d: sparkleD(0, 0, 50, 0.16), fill: '#FFFFFF', shadow: {dx: 0, dy: 0, blur: 12, color: '#FFFFFF'}}], {tx: cx, ty: cy + 4, rot: rot * 0.05}));
  // front half of the swoosh (crosses in front of the orb)
  logo.push({t: 'path', d: `M${cx - 150} ${cy + 6} A150 44 0 0 0 ${cx + 150} ${cy + 6}`, stroke: hgrad(cx - 150, cx + 150, [0, 'rgba(255,79,184,0)'], [0.25, '#FF4FB8'], [0.75, '#9BFF3A'], [1, 'rgba(155,255,58,0)']), lw: 8, cap: 'round'});
  dl.push(g(logo, {alpha: a, tx: cx * (1 - (0.6 + 0.4 * a)), ty: cy * (1 - (0.6 + 0.4 * a)), sx: 0.6 + 0.4 * a, sy: 0.6 + 0.4 * a}));
  dl.push({t: 'text', x: cx, y: 322, text: 'Y2K OS', font: font(78, FONTS.web, 'bold', 'italic'), align: 'center', fill: vgrad(262, 322, [0, '#FFFFFF'], [0.55, '#DDF4FF'], [0.56, '#8FD0FF'], [1, '#FFFFFF']),
    stroke: '#06155e', lw: 6, strokeFirst: true, alpha: a, shadow: {dx: 0, dy: 4, blur: 6, color: 'rgba(0,0,40,0.6)'}});
  dl.push({t: 'text', x: cx, y: 356, text: 'Millennium Subscription Edition', font: font(22, FONTS.ui, 'bold'), align: 'center', fill: '#BFF3FF', alpha: a});
  // sliding blocks track
  const tx = 200, ty = 392, tw = 240, th = 22;
  dl.push({t: 'rect', x: tx, y: ty, w: tw, h: th, r: 11, fill: '#020a3a', stroke: '#6fa8ff', lw: 2, alpha: a});
  const k = ((f * 7) % (tw + 60)) - 50;
  for (let i = 0; i < 3; i++) {
    const bx = tx + k + i * 18;
    if (bx < tx + 3 || bx > tx + tw - 17) continue;
    dl.push({t: 'rect', x: bx, y: ty + 4, w: 14, h: th - 8, r: 3, fill: vgrad(ty + 4, ty + th - 4, [0, '#E0FFC0'], [0.5, '#7FE24A'], [1, '#2B9A0E']), alpha: a});
  }
  dl.push({t: 'text', x: cx, y: 458, text: '© 2002 OmniCorp. All rights reserved. Yours: none.', font: font(14, FONTS.ui), align: 'center', fill: 'rgba(170,200,255,0.85)', alpha: a});
  return dl;
};

// ------------------------------------------------------------------------------------------------ desktop
const desktopIcon = (x: number, y: number, kind: Parameters<typeof iconDL>[0], label: string): Prim[] => [
  iconDL(kind, 46, x, y),
  {t: 'text', x: x + 23, y: y + 66, text: label, font: font(15, FONTS.ui, 'bold'), align: 'center', fill: '#FFFFFF', shadow: SHADOW},
];

export const desktopDL = (clock = '3:14 AM'): Prim[] => {
  const dl: Prim[] = [];
  dl.push({t: 'rect', x: 0, y: 0, w: SCR_W, h: SCR_H, fill: vgrad(0, SCR_H, [0, '#0a3fd8'], [0.5, '#2f86ff'], [0.82, '#7fd6ff'], [1, '#c9f2ff'])});
  // wallpaper: big soft swooshes + a faint sunburst glow
  dl.push({t: 'circle', cx: 470, cy: 140, r: 260, fill: rad(470, 140, 260, [0, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)'])});
  dl.push({t: 'path', d: 'M-40 360 Q 260 230 700 300', stroke: 'rgba(255,255,255,0.22)', lw: 26, cap: 'round'});
  dl.push({t: 'path', d: 'M-40 400 Q 300 290 700 350', stroke: 'rgba(155,255,58,0.25)', lw: 10, cap: 'round'});
  for (const [sx, sy, r] of [[560, 70, 16], [600, 200, 9], [520, 250, 7], [410, 60, 8]] as const)
    dl.push({t: 'path', d: sparkleD(sx, sy, r), fill: 'rgba(255,255,255,0.85)'});
  dl.push(...desktopIcon(50, 40, 'at', 'My Life'));
  dl.push(...desktopIcon(50, 128, 'coin', 'My Stuff'));
  dl.push(...desktopIcon(50, 216, 'lock', 'Rented'));
  // taskbar
  const ty = SCR_H - 38;
  dl.push({t: 'rect', x: 0, y: ty, w: SCR_W, h: 38, fill: vgrad(ty, SCR_H, [0, '#4B9BFF'], [0.12, '#245EDB'], [0.9, '#1941A5'], [1, '#0d2a7a'])});
  dl.push({t: 'rect', x: 0, y: ty, w: SCR_W, h: 2, fill: 'rgba(255,255,255,0.6)'});
  dl.push({t: 'rect', x: 0, y: ty, w: 112, h: 38, r: [0, 16, 16, 0], fill: vgrad(ty, SCR_H, [0, '#7FE24A'], [0.45, '#3BAA1C'], [1, '#22780c']), stroke: '#185c06', lw: 1.5});
  dl.push({t: 'text', x: 18, y: ty + 28, text: 'buy', font: font(26, FONTS.web, 'bold', 'italic'), fill: '#FFFFFF', shadow: {dx: 1, dy: 1.5, blur: 1, color: 'rgba(0,40,0,0.8)'}});
  dl.push({t: 'path', d: sparkleD(84, ty + 19, 9), fill: '#FFFFFF'});
  dl.push({t: 'rect', x: SCR_W - 120, y: ty + 2, w: 120, h: 36, fill: vgrad(ty, SCR_H, [0, '#19C6FF'], [1, '#0f6fd0'])});
  dl.push({t: 'text', x: SCR_W - 60, y: ty + 26, text: clock, font: font(18, FONTS.ui, 'bold'), align: 'center', fill: '#FFFFFF'});
  return dl;
};

// ------------------------------------------------------------------------------------------------ loading window
const FILES = ['bed.sub', 'pillow.sub', 'sleep_fee.dll', 'printer_ink.sub', 'ebook_1984.lic', 'dog_breakfast.sub', 'house_plan.sub', 'car_seat_heat.tier', 'speed_pack.tier', 'your_stuff.rent'];

export const loadingWindowDL = (p: number, active = true): Prim[] => {
  const W = 470, H = 250, X = 116, Y = 92;
  const c: Prim[] = winChromeDL({w: W, h: H, title: 'Y2K OS Setup', icon: 'sparkle', controls: 'close', active, shadow: false});
  const b = winBodyRect(W, H);
  const pct = Math.min(99, Math.floor(p * 100 + 1e-6));
  const file = FILES[Math.min(FILES.length - 1, Math.floor(p * FILES.length * 1.02))];
  const body: Prim[] = [
    iconDL('info', 52, 16, 16),
    {t: 'text', x: 80, y: 48, text: 'Loading your life...', font: font(31, FONTS.ui, 'bold'), fill: '#0B0B0B'},
    {t: 'text', x: 80, y: 80, text: pct >= 99 ? 'Almost yours. Please wait.' : `Installing: ${file}`, font: font(19, FONTS.ui), fill: '#202020'},
    progressDL(16, 108, W - 140, 36, pct / 100, {color: 'green'}),
    {t: 'text', x: W - 18, y: 140, text: `${pct}%`, font: font(36, FONTS.heavy, 'bold'), align: 'right', fill: pct >= 99 ? '#C01010' : '#0B0B0B'},
    {t: 'text', x: 16, y: 186, text: 'Time remaining: forever', font: font(17, FONTS.ui, 'bold'), fill: '#505050'},
  ];
  c.push(g(body, {tx: b.x, ty: b.y}));
  return [g(c, {tx: X, ty: Y})];
};

export const loadingDL = (p: number, f: number, cursor?: {kind: CursorKind; x: number; y: number; click?: number; hourglassRot?: number}): Prim[] => {
  const dl = [...desktopDL(), ...loadingWindowDL(p)];
  if (cursor) dl.push(cursorAt(cursor));
  void f;
  return dl;
};

// ------------------------------------------------------------------------------------------------ the offer dialog
export const OFFER: DialogSpec = {
  kind: 'coin',
  title: 'OmniStore',
  heading: 'Congratulations!',
  message: 'Your subscription to EVERYTHING is now active.',
  buttons: ['Buy Now', 'Cancel'],
  aquaButton: 0,
  aquaColor: 'aqua',
  disabledButtons: [1],
  width: 400,
};
export const OFFER_SCALE = 1.42;
const offerLayout = layoutDialog(OFFER);
export const OFFER_POS = {x: (SCR_W - offerLayout.w * OFFER_SCALE) / 2, y: 62};
/** Buy Now button centre in screen-canvas px. */
export const offerButtonCenter = () => {
  const b = offerLayout.buttons[0];
  return {x: OFFER_POS.x + (b.x + b.w / 2) * OFFER_SCALE, y: OFFER_POS.y + (b.y + b.h / 2) * OFFER_SCALE};
};

const cursorAt = (c: {kind: CursorKind; x: number; y: number; click?: number; hourglassRot?: number}): Prim =>
  g(cursorDL(c.kind, {click: c.click, hourglassRot: c.hourglassRot, sand: 0.5}), {tx: c.x, ty: c.y, sx: 1.9, sy: 1.9});

export const dialogScreenDL = (o: {pop: number; hover: boolean; pressed: boolean; cursor: {kind: CursorKind; x: number; y: number; click?: number}; glow?: number}): Prim[] => {
  const dl = [...desktopDL(), ...loadingWindowDL(0.99, false)];
  // dim the desktop a touch (modal)
  dl.push({t: 'rect', x: 0, y: 0, w: SCR_W, h: SCR_H, fill: 'rgba(0,10,60,0.18)'});
  const d = dialogDL({...OFFER, hover: o.hover ? 0 : undefined, pressed: o.pressed ? 0 : undefined}, {shadow: true});
  const s = OFFER_SCALE * (0.35 + 0.65 * o.pop);
  const cx = OFFER_POS.x + (d.w * OFFER_SCALE) / 2, cy = OFFER_POS.y + (d.h * OFFER_SCALE) / 2;
  dl.push(g(d.dl, {tx: cx - (d.w * s) / 2, ty: cy - (d.h * s) / 2, sx: s, sy: s, alpha: Math.min(1, o.pop * 1.5)}));
  if (o.glow && o.glow > 0) {
    const b = offerButtonCenter();
    dl.push({t: 'circle', cx: b.x, cy: b.y, r: 40 + 220 * o.glow, fill: rad(b.x, b.y, 40 + 220 * o.glow, [0, 'rgba(255,255,255,0.9)'], [0.45, 'rgba(190,240,255,0.5)'], [1, 'rgba(25,198,255,0)']), alpha: 0.85 * Math.min(1, 1.5 - o.glow)});
  }
  dl.push(cursorAt(o.cursor));
  return dl;
};

// ------------------------------------------------------------------------------------------------ thank-you card
export const thanksDL = (rotDeg: number, k = 1): Prim[] => {
  const dl: Prim[] = [];
  const cx = 320, cy = 220;
  dl.push({t: 'rect', x: 0, y: 0, w: SCR_W, h: SCR_H, fill: '#1E5BFF'});
  const rays: Prim[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a0 = ((i / n) * 360 * Math.PI) / 180, a1 = (((i + 0.5) / n) * 360 * Math.PI) / 180;
    const R = 700;
    rays.push({t: 'poly', pts: [0, 0, Math.cos(a0) * R, Math.sin(a0) * R, Math.cos(a1) * R, Math.sin(a1) * R], fill: '#4B9BFF'});
  }
  dl.push(g(rays, {tx: cx, ty: cy, rot: rotDeg}));
  dl.push({t: 'circle', cx, cy, r: 300, fill: rad(cx, cy, 300, [0, 'rgba(255,255,255,0.95)'], [0.25, 'rgba(200,240,255,0.55)'], [1, 'rgba(30,91,255,0)'])});
  const s = 0.7 + 0.3 * k;
  const title: Prim[] = [
    {t: 'text', x: 0, y: 0, text: 'THANK YOU!', font: font(76, FONTS.heavy, 'bold'), align: 'center',
      fill: vgrad(-60, 0, [0, '#FFF6C8'], [0.45, '#FFC93D'], [0.5, '#F2A900'], [1, '#FFE680']), stroke: '#3a1600', lw: 9, strokeFirst: true,
      shadow: {dx: 0, dy: 5, blur: 4, color: 'rgba(0,0,40,0.55)'}},
  ];
  dl.push(g(title, {tx: cx, ty: cy + 10, sx: s, sy: s}));
  dl.push({t: 'text', x: cx, y: cy + 58, text: 'for your purchase', font: font(30, FONTS.web, 'bold', 'italic'), align: 'center', fill: '#FFFFFF',
    stroke: '#06155e', lw: 5, strokeFirst: true});
  dl.push({t: 'rect', x: cx - 230, y: cy + 92, w: 460, h: 40, r: 20, fill: 'rgba(2,10,74,0.75)', stroke: '#BFF3FF', lw: 2});
  dl.push({t: 'text', x: cx, y: cy + 119, text: 'Your life renews automatically.', font: font(20, FONTS.ui, 'bold'), align: 'center', fill: '#BFF3FF'});
  for (const [sx, sy, r] of [[120, 90, 22], [530, 110, 18], [90, 330, 14], [560, 360, 20], [470, 60, 10]] as const)
    dl.push({t: 'path', d: sparkleD(sx, sy, r * (0.75 + 0.25 * Math.sin(rotDeg * 0.3 + sx))), fill: '#FFFFFF'});
  return dl;
};

// small helper so callers can position a lone aqua button if needed
export const aquaBtn = aquaButtonDL;
export const textW = measureText;
