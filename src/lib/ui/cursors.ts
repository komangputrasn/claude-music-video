/**
 * Y2K UI kit — cursor shapes (arrow, pointing hand, hourglass) as display lists + raw outlines for 3D extrusion.
 *
 * Design grid: 32 units = cursor size. HOTSPOT is the local origin (0,0): arrow tip / index fingertip / hourglass centre.
 *
 * API
 *   type CursorKind = 'arrow' | 'hand' | 'hourglass'
 *   ARROW_PTS: number[]                          arrow outline (flat x,y list, y down, tip at 0,0)
 *   HAND_PIECES: number[][]                      hand silhouette pieces (polygons) — union = hand
 *   HAND_LINES: [x1,y1,x2,y2][]                  finger crease lines
 *   CURSOR_BOX: Record<CursorKind, [x,y,w,h]>    art bounds relative to the hotspot (units)
 *   cursorDL(kind, o?: {click?, hourglassRot?, sand?, color?, outline?}) -> Prim[]   (in units, hotspot at origin)
 *   clickPress(click) -> 0..1 press amount;  clickRipple(click) -> {r, alpha} | null
 *        `click` 0..1 is a press animation: drive it 0->1 over ~12 frames at the click moment (0 = idle).
 *
 * Usage
 *   <DLSvg dl={cursorDL('hand', {click: 0.2})} .../>  (see <Cursor/> for positioned 2D cursors)
 */
import type {Prim} from './dl';
import {g, polyD, vgrad} from './dl';

export type CursorKind = 'arrow' | 'hand' | 'hourglass';

export const ARROW_PTS = [0, 0, 0, 24.2, 5.7, 18.9, 9.5, 27.6, 13.6, 25.8, 9.9, 17.3, 17.4, 17.3];

/** rounded-rect polygon (used for hand pieces so 2D and 3D share exact geometry) */
const rr = (x: number, y: number, w: number, h: number, r: [number, number, number, number], seg = 5): number[] => {
  const out: number[] = [];
  const corner = (cx: number, cy: number, rad: number, a0: number) => {
    if (rad <= 0) {
      out.push(cx, cy);
      return;
    }
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      out.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
  };
  const [tl, tr, br, bl] = r;
  // clockwise in screen space (y down): top-left -> top-right -> bottom-right -> bottom-left
  corner(x + tl, y + tl, tl, Math.PI);
  corner(x + w - tr, y + tr, tr, -Math.PI / 2);
  corner(x + w - br, y + h - br, br, 0);
  corner(x + bl, y + h - bl, bl, Math.PI / 2);
  // corner(...,0 radius) pushes the actual corner point
  return out;
};
const rot = (pts: number[], cx: number, cy: number, deg: number) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i] - cx, y = pts[i + 1] - cy;
    out.push(cx + x * c - y * s, cy + x * s + y * c);
  }
  return out;
};

export const HAND_PIECES: number[][] = [
  rr(-2.5, 0, 5, 17, [2.5, 2.5, 0, 0]), // index finger
  rr(2.2, 9.2, 4.5, 9.5, [2.25, 2.25, 0, 0]), // middle
  rr(6.5, 10.4, 4.3, 9, [2.15, 2.15, 0, 0]), // ring
  rr(10.6, 11.9, 3.9, 8.5, [1.95, 1.95, 1.2, 0]), // pinky
  rr(-2.5, 14.5, 17, 12.5, [0, 0, 5, 4]), // palm
  rot(rr(-9.2, 15.4, 9.8, 4.6, [2.3, 2.3, 2.3, 2.3]), -2.4, 17.7, 38), // thumb
  rr(-1.4, 26.2, 13.8, 4.8, [0, 0, 1.2, 1.2]), // cuff
];
export const HAND_LINES: [number, number, number, number][] = [
  [2.2, 12.2, 2.2, 16.6],
  [6.6, 13.2, 6.6, 17.4],
  [10.6, 14.6, 10.6, 18.2],
  [-1.4, 26.4, 12.4, 26.4],
];

export const CURSOR_BOX: Record<CursorKind, [number, number, number, number]> = {
  arrow: [-1, -1, 19.5, 30],
  hand: [-9, -1, 25, 33],
  hourglass: [-11, -16, 22, 32],
};

const ease = (t: number) => t * t * (3 - 2 * t);
/** 0..1 press depth for a click animation value. */
export const clickPress = (click = 0) => {
  if (click <= 0 || click >= 1) return 0;
  if (click < 0.18) return ease(click / 0.18);
  if (click < 0.55) return 1 - ease((click - 0.18) / 0.37);
  return 0;
};
/** Expanding ring after the press (radius in units). */
export const clickRipple = (click = 0) => {
  if (click <= 0.12 || click >= 1) return null;
  const u = (click - 0.12) / 0.88;
  return {r: 3 + 20 * (1 - Math.pow(1 - u, 3)), alpha: Math.pow(1 - u, 1.4)};
};

export type CursorDLOpts = {click?: number; hourglassRot?: number; sand?: number; color?: string; outline?: string; ripple?: boolean};

export const cursorDL = (kind: CursorKind, o: CursorDLOpts = {}): Prim[] => {
  const fill = o.color ?? '#FFFFFF';
  const ink = o.outline ?? '#000000';
  const press = clickPress(o.click);
  const dl: Prim[] = [];
  const rip = o.ripple === false ? null : clickRipple(o.click);
  if (rip) {
    dl.push({t: 'circle', cx: 0, cy: 0, r: rip.r, stroke: 'rgba(25,198,255,1)', lw: 2.6, alpha: rip.alpha});
    dl.push({t: 'circle', cx: 0, cy: 0, r: rip.r * 0.62, stroke: '#FFFFFF', lw: 1.6, alpha: rip.alpha * 0.9});
  }
  const shadow = {dx: 1.4, dy: 1.8, blur: 2.2, color: 'rgba(0,0,0,0.38)'};
  let art: Prim[];
  if (kind === 'arrow') {
    art = [{t: 'poly', pts: ARROW_PTS, fill, stroke: ink, lw: 1.5, join: 'round', shadow}];
  } else if (kind === 'hand') {
    art = [
      g(HAND_PIECES.map((p) => ({t: 'poly' as const, pts: p, fill: ink, stroke: ink, lw: 3, join: 'round' as const})), {shadow}),
      ...HAND_PIECES.map((p) => ({t: 'poly' as const, pts: p, fill})),
      ...HAND_LINES.map(([x1, y1, x2, y2]) => ({t: 'path' as const, d: `M${x1} ${y1}L${x2} ${y2}`, stroke: ink, lw: 1.1, cap: 'round' as const})),
    ];
  } else {
    const sand = Math.max(0, Math.min(1, o.sand ?? 0.45));
    const glass = 'M-7.6 -11.5C-7.6 -3.2 -1.6 -2.2 -1.6 0C-1.6 2.2 -7.6 3.2 -7.6 11.5L7.6 11.5C7.6 3.2 1.6 2.2 1.6 0C1.6 -2.2 7.6 -3.2 7.6 -11.5Z';
    const topLevel = -9.5 + 9 * sand; // sand surface in the top bulb
    const pileTop = 11.5 - 9.5 * sand;
    const sandC = vgrad(-12, 12, [0, '#FFD98A'], [1, '#D98A1E']);
    art = [
      g(
        [
          {t: 'path', d: glass, fill: 'rgba(214,240,255,0.92)', stroke: ink, lw: 1.5, join: 'round'},
          g(
            [
              {t: 'rect', x: -8, y: topLevel, w: 16, h: -topLevel, fill: sandC},
              {t: 'path', d: `M-8 11.6L-8 ${pileTop + 3}Q0 ${pileTop - 2.5} 8 ${pileTop + 3}L8 11.6Z`, fill: sandC},
              ...(sand > 0.02 && sand < 0.98 ? [{t: 'rect' as const, x: -0.55, y: 0, w: 1.1, h: pileTop + 1, fill: '#E6A23A'}] : []),
            ],
            {clip: {d: glass}},
          ),
          {t: 'path', d: 'M-5.6 -10C-5.4 -5.5 -3.2 -3.6 -2.2 -2.6', stroke: 'rgba(255,255,255,0.95)', lw: 1.1, cap: 'round'},
          {t: 'path', d: glass, stroke: ink, lw: 1.5, join: 'round'},
          {t: 'rect', x: -10, y: -15, w: 20, h: 3.8, r: 1.3, fill: vgrad(-15, -11.2, [0, '#FFE7A0'], [1, '#B8740E']), stroke: ink, lw: 1.3},
          {t: 'rect', x: -10, y: 11.2, w: 20, h: 3.8, r: 1.3, fill: vgrad(11.2, 15, [0, '#FFE7A0'], [1, '#B8740E']), stroke: ink, lw: 1.3},
        ],
        {rot: o.hourglassRot ?? 0, shadow},
      ),
    ];
  }
  const s = 1 - 0.16 * press;
  dl.push(g(art, {sx: s, sy: s, ty: kind === 'hand' ? press * 1.2 : 0}));
  return dl;
};

export const arrowPathD = () => polyD(ARROW_PTS);
