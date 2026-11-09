/**
 * Y2K UI kit — widget display-list builders (shared by 2D SVG components and 3D canvas textures).
 *
 * API
 *   winChromeDL(o: WinChromeOpts): Prim[]                     window frame, glossy title bar, controls, beige body
 *   winBodyRect(w, h) -> {x,y,w,h}                            where the window body (client area) sits
 *   pushButtonDL(x, y, w, h, label, s?: PushState): GroupPrim grey bevelled button (default ring / hot / pressed / disabled)
 *   aquaButtonDL(x, y, w, h, label, s?: AquaState): GroupPrim glossy gel pill button
 *   aquaButtonWidth(label, h) -> px                            auto width for a label
 *   progressDL(x, y, w, h, value, o?: ProgressOpts): GroupPrim green segmented progress bar
 *   layoutDialog(spec) -> DialogLayout                         icon/text/button/progress rects
 *   dialogDL(spec, {shadow?}) -> Drawing {w, h, dl}           complete dialog
 *   dialogSpecKey(spec) -> string                              cache key (progress quantised to visible segments)
 *   windowDL(spec: WindowSpec, {shadow?}) -> Drawing           generic window with custom body prims (body coords)
 *   sheenDL(w, h, pos, strength?) -> Prim[]                    diagonal glint across a window (pos -0.2..1.2)
 *   DLG                                                        dialog layout metrics
 *
 * Usage
 *   const d = dialogDL({kind: 'error', title: 'INKSURE+', heading: 'CARD DECLINED', message: 'Printing disabled.', buttons: ['OK']});
 *   <DLSvg dl={d.dl} w={d.w} h={d.h}/>
 */
import type {Drawing, GroupPrim, Paint, Prim, Radii} from './dl';
import {font, fitText, g, hgrad, measureText, rrectD, vgrad, wrapText} from './dl';
import {iconDL, IconKind} from './icons';
import {AQUA_COLORS, AquaColor, TITLE_THEMES, TitleThemeName, UIC, UIF, WIN} from './theme';
import {stampDL} from './stampArt';

// ================================================================ window chrome
export type WinControls = 'all' | 'close' | 'none';
export type CtrlState = 'normal' | 'hot' | 'pressed';
export type WinChromeOpts = {
  w: number;
  h: number;
  title?: string;
  icon?: IconKind | null;
  theme?: TitleThemeName;
  /** false = inactive (washed-out) title bar */
  active?: boolean;
  controls?: WinControls;
  closeState?: CtrlState;
  /** soft drop shadow (2D). Off for 3D textures. */
  shadow?: boolean;
  /** body fill (default beige); null = no body (custom content draws its own) */
  body?: Paint | null;
};

export const winBodyRect = (w: number, h: number) => ({x: WIN.frame, y: WIN.titleH, w: w - WIN.frame * 2, h: h - WIN.titleH - WIN.frame});

const ctrlDL = (x: number, y: number, kind: 'min' | 'max' | 'close', btn: [string, string, string], state: CtrlState): GroupPrim => {
  const s = WIN.ctrl;
  const c: Prim[] = [];
  let fill: Paint;
  if (kind === 'close') {
    fill =
      state === 'pressed'
        ? vgrad(0, s, [0, '#B8321A'], [0.5, '#C93E22'], [1, '#E2694A'])
        : state === 'hot'
          ? vgrad(0, s, [0, '#FFC2B0'], [0.45, '#FF6E4C'], [0.5, '#F2532E'], [1, '#FF8C62'])
          : vgrad(0, s, [0, '#F8A890'], [0.45, '#E65A3B'], [0.5, '#D3401E'], [1, '#EC7A52']);
  } else {
    fill = state === 'pressed' ? vgrad(0, s, [0, btn[2]], [1, btn[0]]) : vgrad(0, s, [0, btn[0]], [0.48, btn[1]], [0.52, btn[2]], [1, btn[0]]);
  }
  c.push({t: 'rect', x: 0, y: 0, w: s, h: s, r: 4, fill, stroke: 'rgba(255,255,255,0.95)', lw: 1.3});
  c.push({t: 'rect', x: 2.2, y: 1.8, w: s - 4.4, h: s * 0.42, r: 3, fill: vgrad(1.8, s * 0.45, [0, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0.05)'])});
  const glyphShadow = {dx: 0.6, dy: 0.8, blur: 0.8, color: 'rgba(0,0,40,0.55)'};
  if (kind === 'min') c.push({t: 'rect', x: 6.5, y: 14.5, w: 9, h: 3.2, fill: '#FFFFFF', shadow: glyphShadow});
  if (kind === 'max') {
    c.push({t: 'rect', x: 6.5, y: 6.5, w: 11, h: 11, stroke: '#FFFFFF', lw: 1.6, shadow: glyphShadow});
    c.push({t: 'rect', x: 6.5, y: 6.5, w: 11, h: 3, fill: '#FFFFFF'});
  }
  if (kind === 'close')
    c.push({t: 'path', d: 'M7.5 7.5L16.5 16.5M16.5 7.5L7.5 16.5', stroke: '#FFFFFF', lw: 2.8, cap: 'round', shadow: glyphShadow});
  return g(c, {tx: x, ty: y});
};

export const winChromeDL = (o: WinChromeOpts): Prim[] => {
  const th = TITLE_THEMES[o.active === false ? 'inactive' : (o.theme ?? 'blue')];
  const {w, h} = o;
  const F = WIN.frame, T = WIN.titleH;
  const R: Radii = [WIN.rTop, WIN.rTop, WIN.rBottom, WIN.rBottom];
  const outer = rrectD(0, 0, w, h, R);
  const dl: Prim[] = [];
  dl.push({t: 'path', d: outer, fill: hgrad(0, w, [0, th.frame[0]], [1, th.frame[1]]),
    shadow: o.shadow ? {dx: 0, dy: 10, blur: 26, color: 'rgba(0,8,40,0.42)'} : undefined});
  dl.push(
    g(
      [
        {t: 'rect', x: 0, y: 0, w, h: T, fill: hgrad(0, w, [0, th.title[0]], [1, th.title[1]])},
        {t: 'rect', x: 0, y: 0, w, h: T,
          fill: vgrad(0, T, [0, 'rgba(255,255,255,0.66)'], [0.09, 'rgba(255,255,255,0.40)'], [0.46, 'rgba(255,255,255,0.15)'],
            [0.5, 'rgba(255,255,255,0)'], [0.8, 'rgba(255,255,255,0)'], [1, 'rgba(0,10,60,0.22)'])},
        // frame sheen down the sides
        {t: 'rect', x: 1, y: T, w: 1.2, h: h - T, fill: 'rgba(255,255,255,0.28)'},
        {t: 'rect', x: w - 2.2, y: T, w: 1.2, h: h - T, fill: 'rgba(255,255,255,0.22)'},
      ],
      {clip: {d: outer}},
    ),
  );
  const b = winBodyRect(w, h);
  if (o.body !== null) {
    dl.push({t: 'rect', x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2, fill: 'rgba(0,16,80,0.45)'});
    dl.push({t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, fill: o.body ?? UIC.body});
    dl.push({t: 'rect', x: b.x, y: b.y, w: b.w, h: 1.5, fill: 'rgba(255,255,255,0.95)'});
    dl.push({t: 'rect', x: b.x, y: b.y, w: 1.5, h: b.h, fill: 'rgba(255,255,255,0.85)'});
    dl.push({t: 'rect', x: b.x, y: b.y + b.h - 1.5, w: b.w, h: 1.5, fill: UIC.bevelShadow});
    dl.push({t: 'rect', x: b.x + b.w - 1.5, y: b.y, w: 1.5, h: b.h, fill: UIC.bevelShadow});
  }
  // crisp outer edge + top highlight
  dl.push({t: 'path', d: rrectD(0.5, 0.5, w - 1, h - 1, [WIN.rTop - 0.5, WIN.rTop - 0.5, WIN.rBottom - 0.5, WIN.rBottom - 0.5]), stroke: th.edge, lw: 1});
  dl.push({t: 'rect', x: WIN.rTop - 2, y: 1.6, w: w - (WIN.rTop - 2) * 2, h: 1.2, r: 0.6, fill: 'rgba(255,255,255,0.7)'});

  // controls
  const controls = o.controls ?? 'all';
  const kinds: Array<'min' | 'max' | 'close'> = controls === 'all' ? ['min', 'max', 'close'] : controls === 'close' ? ['close'] : [];
  const cy = Math.round((T - WIN.ctrl) / 2) + 0.5;
  let cx = w - WIN.ctrlMargin - WIN.ctrl;
  const ctrls: Prim[] = [];
  for (let i = kinds.length - 1; i >= 0; i--) {
    ctrls.unshift(ctrlDL(cx, cy, kinds[i], th.btn, kinds[i] === 'close' ? (o.closeState ?? 'normal') : 'normal'));
    cx -= WIN.ctrl + WIN.ctrlGap;
  }
  const ctrlLeft = cx + WIN.ctrl + WIN.ctrlGap;

  // icon + title
  let tx = 9;
  if (o.icon) {
    dl.push(iconDL(o.icon, WIN.titleIcon, 8, (T - WIN.titleIcon) / 2, {shadow: false}));
    tx = 8 + WIN.titleIcon + 6;
  }
  if (o.title) {
    const f = font(WIN.titleFontSize, UIF.ui, 'bold');
    dl.push({
      t: 'text', x: tx, y: T / 2 + WIN.titleFontSize * 0.36, text: fitText(f, o.title, ctrlLeft - tx - 8), font: f, fill: th.text,
      shadow: {dx: 1, dy: 1, blur: 1.2, color: th.textShadow},
    });
  }
  dl.push(...ctrls);
  return dl;
};

/** A generic window drawing with custom body content (display-list prims in BODY coordinates: 0,0 = body top-left). */
export type WindowSpec = {
  title: string;
  width: number;
  height: number;
  icon?: IconKind | null;
  theme?: TitleThemeName;
  active?: boolean;
  controls?: WinControls;
  closeState?: CtrlState;
  body?: Prim[];
  /** body background (default beige); null = transparent */
  bodyFill?: Paint | null;
};

export const windowDL = (spec: WindowSpec, opts: {shadow?: boolean} = {}): Drawing => {
  const dl = winChromeDL({w: spec.width, h: spec.height, title: spec.title, icon: spec.icon, theme: spec.theme, active: spec.active, controls: spec.controls,
    closeState: spec.closeState, shadow: opts.shadow, body: spec.bodyFill});
  const b = winBodyRect(spec.width, spec.height);
  if (spec.body?.length) dl.push(g(spec.body, {tx: b.x, ty: b.y, clip: {x: 0, y: 0, w: b.w, h: b.h}}));
  return {w: spec.width, h: spec.height, dl};
};

/** Diagonal glint sweeping across a w x h window (same curve as the 3D sheen). pos -0.2..1.2. Clipped to the window shape. */
export const sheenDL = (w: number, h: number, pos: number, strength = 0.5): Prim[] => {
  const nx = 0.8 / w, ny = 0.45 / h, n2 = nx * nx + ny * ny;
  const c = pos * 1.25;
  const band = (d0: number, d1: number, a: number): Prim => ({
    t: 'rect', x: 0, y: 0, w, h,
    fill: {lin: [(d0 * nx) / n2, (d0 * ny) / n2, (d1 * nx) / n2, (d1 * ny) / n2],
      stops: [[0, 'rgba(255,255,255,0)'], [0.5, `rgba(255,255,255,${a})`], [1, 'rgba(255,255,255,0)']]},
  });
  return [g([band(c - 0.075, c + 0.075, 0.8 * strength), band(c + 0.104, c + 0.136, strength)],
    {clip: {d: rrectD(0, 0, w, h, [WIN.rTop, WIN.rTop, WIN.rBottom, WIN.rBottom])}})];
};

// ================================================================ push button
export type PushState = {
  /** default button: blue focus ring + dotted focus rectangle */
  isDefault?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  /** mouse-over: orange hot ring */
  hot?: boolean;
  fontSize?: number;
};

export const pushButtonDL = (x: number, y: number, w: number, h: number, label: string, s: PushState = {}): GroupPrim => {
  const r = 4;
  const c: Prim[] = [];
  const fs = s.fontSize ?? 15;
  let fill: Paint;
  if (s.disabled) fill = vgrad(0, h, [0, '#FBFBF8'], [1, '#EEEDE7']);
  else if (s.pressed) fill = vgrad(0, h, [0, '#C9C5B7'], [0.2, '#D9D5C9'], [1, '#F1F0EB']);
  else fill = vgrad(0, h, [0, '#FFFFFF'], [0.45, '#F4F3EF'], [0.85, '#E3E0D6'], [1, '#D0CCBF']);
  c.push({t: 'rect', x: 0, y: 0, w, h, r, fill, stroke: s.disabled ? UIC.btnBorderDisabled : UIC.btnBorder, lw: 1.2,
    shadow: s.disabled || s.pressed ? undefined : {dx: 0, dy: 1, blur: 1.5, color: 'rgba(0,0,0,0.18)'}});
  if (!s.disabled && !s.pressed) {
    c.push({t: 'rect', x: 2, y: 1.4, w: w - 4, h: 1.4, r: 0.7, fill: 'rgba(255,255,255,0.95)'});
    c.push({t: 'rect', x: 2, y: h - 3.2, w: w - 4, h: 1.8, r: 0.9, fill: 'rgba(150,140,115,0.38)'});
  }
  if (!s.disabled && (s.hot || s.isDefault)) {
    const ring = s.hot ? vgrad(2, h - 2, [0, '#FFE6A8'], [1, '#E8961A']) : vgrad(2, h - 2, [0, '#D2E8FF'], [1, '#4F82EE']);
    c.push({t: 'rect', x: 2.1, y: 2.1, w: w - 4.2, h: h - 4.2, r: 2.6, stroke: ring, lw: 2.2});
  }
  const o = s.pressed ? 1 : 0;
  const f = font(fs, UIF.ui);
  const ty = h / 2 + fs * 0.36 + o;
  if (s.disabled) {
    c.push({t: 'text', x: w / 2 + 1, y: ty + 1, text: label, font: f, align: 'center', fill: '#FFFFFF'});
    c.push({t: 'text', x: w / 2, y: ty, text: label, font: f, align: 'center', fill: UIC.textDisabled});
  } else {
    c.push({t: 'text', x: w / 2 + o, y: ty, text: label, font: f, align: 'center', fill: UIC.text});
  }
  if (s.isDefault && !s.disabled) {
    const tw = measureText(f, label);
    const fw = Math.min(w - 10, tw + 12);
    c.push({t: 'rect', x: (w - fw) / 2 + o, y: 5.5 + o, w: fw, h: h - 11, stroke: 'rgba(20,20,20,0.75)', lw: 1, dash: [1, 2]});
  }
  return g(c, {tx: x, ty: y});
};

// ================================================================ aqua gel button
export type AquaState = {pressed?: boolean; /** 0..1 outer glow */ glow?: number; color?: AquaColor; fontFamily?: string; disabled?: boolean};

export const aquaButtonWidth = (label: string, h: number, fontFamily: string = UIF.web) =>
  Math.round(measureText(font(h * 0.42, fontFamily, 'bold'), label) + h * 1.3);

export const aquaButtonDL = (x: number, y: number, w: number, h: number, label: string, s: AquaState = {}): GroupPrim => {
  const [dark, mid, light, border, glowC] = AQUA_COLORS[s.disabled ? 'graphite' : (s.color ?? 'aqua')];
  const r = h / 2;
  const p = !!s.pressed;
  const c: Prim[] = [];
  const glow = Math.max(0, s.glow ?? 0);
  if (glow > 0) c.push({t: 'rect', x: 0, y: 0, w, h, r, fill: glowC, alpha: Math.min(1, glow), shadow: {blur: 10 + 26 * glow, color: glowC}});
  c.push({t: 'rect', x: 0, y: 0, w, h, r, fill: border, shadow: p ? undefined : {dx: 0, dy: h * 0.07, blur: h * 0.16, color: 'rgba(0,25,80,0.45)'}});
  c.push({t: 'rect', x: 1.3, y: 1.3, w: w - 2.6, h: h - 2.6, r: r - 1.3,
    fill: p ? vgrad(0, h, [0, border], [0.5, dark], [1, mid]) : vgrad(0, h, [0, dark], [0.55, mid], [1, light])});
  // bottom caustic glow
  c.push({t: 'ellipse', cx: w / 2, cy: h * 0.86, rx: w * 0.4, ry: h * 0.34,
    fill: {rad: [w / 2, h * 0.86, w * 0.4], stops: [[0, p ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]}, alpha: 1});
  // top gloss
  c.push({t: 'rect', x: h * 0.2, y: 2, w: w - h * 0.4, h: h * 0.47, r: h * 0.235,
    fill: vgrad(2, 2 + h * 0.47, [0, `rgba(255,255,255,${p ? 0.55 : 0.95})`], [1, 'rgba(255,255,255,0.12)'])});
  const fs = h * 0.42;
  const f = font(fs, s.fontFamily ?? UIF.web, 'bold');
  c.push({t: 'text', x: w / 2, y: h / 2 + fs * 0.36 + (p ? 1 : 0), text: label, font: f, align: 'center', fill: s.disabled ? '#E8ECF2' : '#FFFFFF',
    shadow: {dx: 0, dy: 1, blur: 2.5, color: 'rgba(0,25,80,0.75)'}});
  return g(c, {tx: x, ty: y});
};

// ================================================================ progress bar
export type ProgressColor = 'green' | 'aqua' | 'pink' | 'gold';
export type ProgressOpts = {segments?: number; color?: ProgressColor};
const PROG: Record<ProgressColor, [string, string, string, string, string]> = {
  green: ['#2B9A0E', '#7FE24A', '#E6FFD0', '#74D83E', '#24830B'],
  aqua: ['#0A6FD0', '#4FC8FF', '#E0F8FF', '#3AB6F5', '#075CB0'],
  pink: ['#B80C74', '#FF6CC4', '#FFE0F3', '#FF55B8', '#960A5E'],
  gold: ['#B06A00', '#FFC93D', '#FFF6C8', '#F7B52A', '#955800'],
};

/** Number of segments that fit / are filled — used for cache keys too. */
export const progressSegments = (w: number, h: number, value: number, segments?: number) => {
  const ih = h - 6, iw = w - 6;
  const gap = Math.max(2, Math.round(ih * 0.18));
  const total = segments ?? Math.max(1, Math.floor((iw + gap) / (Math.round(ih * 0.6) + gap)));
  const filled = Math.max(0, Math.min(total, Math.floor(value * total + 1e-6)));
  return {total, filled, gap, iw, ih};
};

export const progressDL = (x: number, y: number, w: number, h: number, value: number, o: ProgressOpts = {}): GroupPrim => {
  const {total, filled, gap, iw, ih} = progressSegments(w, h, value, o.segments);
  const sw = (iw - gap * (total - 1)) / total;
  const [c0, c1, c2, c3, c4] = PROG[o.color ?? 'green'];
  const c: Prim[] = [
    {t: 'rect', x: 0, y: 0, w, h, r: 4, fill: vgrad(0, h, [0, '#E4E3DC'], [0.25, '#FFFFFF'], [1, '#F6F6F2']), stroke: '#6E7D93', lw: 1.2},
    {t: 'rect', x: 1.5, y: 1.5, w: w - 3, h: 1.5, r: 0.7, fill: 'rgba(110,110,100,0.25)'},
  ];
  const fill = vgrad(3, 3 + ih, [0, c0], [0.2, c1], [0.42, c2], [0.6, c3], [1, c4]);
  for (let i = 0; i < filled; i++) c.push({t: 'rect', x: 3 + i * (sw + gap), y: 3, w: sw, h: ih, r: 1.6, fill});
  return g(c, {tx: x, ty: y});
};

// ================================================================ dialog
export type DialogKind = 'error' | 'warning' | 'info' | 'question' | 'lock' | 'coin' | 'plus' | 'none';
export type DialogStamp = {text?: string; rotation?: number; color?: string; seed?: number; /** px font size */ size?: number};
export type DialogSpec = {
  kind?: DialogKind;
  title: string;
  /** bold headline above the message, e.g. 'CARD DECLINED' */
  heading?: string;
  /** body text; wraps automatically, '\n' for hard breaks */
  message?: string;
  buttons?: string[];
  /** index of the default (blue ring) button; default 0. -1 = none */
  defaultButton?: number;
  /** index of the button currently held down */
  pressed?: number;
  /** index of the button under the mouse (orange hot ring) */
  hover?: number;
  disabledButtons?: number[];
  /** index of a button drawn as a glossy aqua gel button (upsell!) */
  aquaButton?: number;
  aquaColor?: AquaColor;
  /** 0..1 shows a green segmented progress bar under the text */
  progress?: number;
  progressLabel?: string;
  progressColor?: ProgressColor;
  /** window width in px (default 440); height is automatic */
  width?: number;
  theme?: TitleThemeName;
  active?: boolean;
  /** title bar icon; defaults to the dialog kind's icon */
  titleIcon?: IconKind | 'none';
  controls?: WinControls;
  closeState?: CtrlState;
  /** a landed rubber stamp baked into the drawing (for animated slams use <Stamp>/<Stamp3D>) */
  stamp?: DialogStamp;
};

export const DLG = {
  width: 440,
  pad: 20,
  icon: 52,
  gap: 16,
  headSize: 18,
  headLH: 24,
  msgSize: 15,
  msgLH: 21,
  paraGap: 6,
  progH: 22,
  progGap: 14,
  progLabelLH: 21,
  btnH: 32,
  btnMinW: 100,
  btnPadX: 20,
  btnGap: 12,
  btnTop: 22,
  bottomPad: 16,
} as const;

export type DialogLine = {text: string; font: string; x: number; y: number; bold: boolean};
export type DialogLayout = {
  w: number;
  h: number;
  icon: {kind: IconKind; x: number; y: number; size: number} | null;
  lines: DialogLine[];
  progress: {x: number; y: number; w: number; h: number; labelY: number} | null;
  buttons: {x: number; y: number; w: number; h: number; label: string; index: number; aqua: boolean}[];
};

export const layoutDialog = (spec: DialogSpec): DialogLayout => {
  const F = WIN.frame, T = WIN.titleH, P = DLG.pad;
  const kind = spec.kind ?? 'info';
  const hasIcon = kind !== 'none';
  const btnLabels = spec.buttons ?? ['OK'];
  const bf = font(15, UIF.ui);
  const btnW = btnLabels.map((l, i) =>
    i === spec.aquaButton ? Math.max(DLG.btnMinW + 20, aquaButtonWidth(l, DLG.btnH + 4)) : Math.max(DLG.btnMinW, Math.round(measureText(bf, l) + DLG.btnPadX * 2)),
  );
  const rowW = btnW.reduce((a, b) => a + b, 0) + DLG.btnGap * Math.max(0, btnLabels.length - 1);
  const w = Math.max(spec.width ?? DLG.width, rowW + 2 * (F + P), 260);
  const textX = F + P + (hasIcon ? DLG.icon + DLG.gap : 0);
  const textW = w - F - P - textX;
  const hf = font(DLG.headSize, UIF.ui, 'bold');
  const mf = font(DLG.msgSize, UIF.ui);
  const headLines = spec.heading ? wrapText(hf, spec.heading, textW) : [];
  const msgLines = spec.message ? wrapText(mf, spec.message, textW) : [];
  let th = headLines.length * DLG.headLH + (headLines.length && msgLines.length ? DLG.paraGap : 0) + msgLines.length * DLG.msgLH;
  const hasProg = spec.progress !== undefined;
  const progBlock = hasProg ? (th ? DLG.progGap : 0) + (spec.progressLabel ? DLG.progLabelLH : 0) + DLG.progH : 0;
  const blockH = th + progBlock;
  const iconH = hasIcon ? DLG.icon : 0;
  const contentH = Math.max(iconH, blockH);
  const y0 = T + P + (blockH < iconH ? (iconH - blockH) / 2 : 0);
  const lines: DialogLine[] = [];
  let y = y0;
  for (const l of headLines) {
    lines.push({text: l, font: hf, x: textX, y: y + DLG.headLH / 2 + DLG.headSize * 0.36, bold: true});
    y += DLG.headLH;
  }
  if (headLines.length && msgLines.length) y += DLG.paraGap;
  for (const l of msgLines) {
    lines.push({text: l, font: mf, x: textX, y: y + DLG.msgLH / 2 + DLG.msgSize * 0.36, bold: false});
    y += DLG.msgLH;
  }
  let progress: DialogLayout['progress'] = null;
  if (hasProg) {
    if (th) y += DLG.progGap;
    const labelY = y + DLG.progLabelLH / 2 + DLG.msgSize * 0.36;
    if (spec.progressLabel) y += DLG.progLabelLH;
    progress = {x: textX, y, w: textW, h: DLG.progH, labelY};
  }
  const buttons: DialogLayout['buttons'] = [];
  let h: number;
  if (btnLabels.length) {
    const by = T + P + contentH + DLG.btnTop;
    let bx = (w - rowW) / 2;
    btnLabels.forEach((label, index) => {
      const aqua = index === spec.aquaButton;
      buttons.push({x: Math.round(bx), y: aqua ? by - 2 : by, w: btnW[index], h: aqua ? DLG.btnH + 4 : DLG.btnH, label, index, aqua});
      bx += btnW[index] + DLG.btnGap;
    });
    h = by + DLG.btnH + DLG.bottomPad + F;
  } else h = T + P + contentH + P + F;
  return {
    w: Math.round(w),
    h: Math.round(h),
    icon: hasIcon ? {kind: kind as IconKind, x: F + P, y: T + P + (blockH > iconH ? Math.min(4, (blockH - iconH) / 2) : 0), size: DLG.icon} : null,
    lines,
    progress,
    buttons,
  };
};

export const dialogDL = (spec: DialogSpec, opts: {shadow?: boolean} = {}): Drawing => {
  const L = layoutDialog(spec);
  const kind = spec.kind ?? 'info';
  const ti = spec.titleIcon === 'none' ? null : (spec.titleIcon ?? (kind === 'none' ? null : (kind as IconKind)));
  const dl: Prim[] = winChromeDL({
    w: L.w, h: L.h, title: spec.title, icon: ti, theme: spec.theme, active: spec.active, controls: spec.controls ?? 'close',
    closeState: spec.closeState, shadow: opts.shadow,
  });
  if (L.icon) dl.push(iconDL(L.icon.kind, L.icon.size, L.icon.x, L.icon.y));
  for (const l of L.lines) dl.push({t: 'text', x: l.x, y: l.y, text: l.text, font: l.font, fill: l.bold ? '#0B0B0B' : UIC.text});
  if (L.progress && spec.progress !== undefined) {
    const p = L.progress;
    if (spec.progressLabel) dl.push({t: 'text', x: p.x, y: p.labelY, text: spec.progressLabel, font: font(DLG.msgSize, UIF.ui), fill: UIC.text});
    dl.push(progressDL(p.x, p.y, p.w, p.h, spec.progress, {color: spec.progressColor}));
  }
  const def = spec.defaultButton ?? 0;
  for (const b of L.buttons) {
    const disabled = spec.disabledButtons?.includes(b.index) ?? false;
    if (b.aqua)
      dl.push(aquaButtonDL(b.x, b.y, b.w, b.h, b.label, {color: spec.aquaColor, pressed: spec.pressed === b.index, disabled,
        glow: spec.hover === b.index ? 0.8 : 0.25}));
    else
      dl.push(pushButtonDL(b.x, b.y, b.w, b.h, b.label, {isDefault: def === b.index, pressed: spec.pressed === b.index && !disabled, disabled,
        hot: spec.hover === b.index && spec.pressed !== b.index}));
  }
  if (spec.stamp) {
    const st = stampDL({text: spec.stamp.text, color: spec.stamp.color, seed: spec.stamp.seed, size: spec.stamp.size ?? Math.round(L.w * 0.11)});
    dl.push(g([g(st.dl, {tx: -st.w / 2, ty: -st.h / 2})], {tx: L.w / 2, ty: L.h / 2 + 6, rot: spec.stamp.rotation ?? -14}));
  }
  return {w: L.w, h: L.h, dl};
};

/** Stable cache key for a dialog spec (progress is quantised to its visible segments). */
export const dialogSpecKey = (spec: DialogSpec): string => {
  let p: number | undefined = spec.progress;
  if (p !== undefined) {
    const L = layoutDialog({...spec, progress: 0});
    p = L.progress ? progressSegments(L.progress.w, L.progress.h, p).filled : 0;
  }
  return JSON.stringify({...spec, progress: p});
};
