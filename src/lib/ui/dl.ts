/**
 * Y2K UI kit — display lists ("DL"): the single source of truth for every UI graphic.
 *
 * Every widget (window chrome, dialog, buttons, icons, cursors, banners, stamps) is described ONCE as a list of
 * primitives (`Prim[]`). The SAME list is rendered
 *   - to SVG for 2D HTML layers  -> `<DLSvg dl w h/>` (src/lib/ui/DLSvg.tsx)
 *   - to a 2D canvas for 3D       -> `drawDL(ctx, dl)` / `renderDLCanvas(dl, w, h, pr)` (CanvasTexture in textures.ts)
 * so 2D and 3D pop-ups look identical. Coordinates are CSS px at scale 1 (y down).
 *
 * API
 *   type Prim = rect | circle | ellipse | poly | path | text | g(group: transform/alpha/clip/knockout/shadow)
 *   type Paint = css color | {lin:[x1,y1,x2,y2], stops} | {rad:[cx,cy,r,(fx,fy)], stops}
 *   rrectD(x,y,w,h,r) / primD(p)   -> SVG path string (also used by canvas via Path2D)
 *   measureText(font, text, ls?)   -> px width (sync, system fonts only)
 *   wrapText(font, text, maxW)     -> lines (honours '\n');  fitText(font, text, maxW) -> truncated with '…'
 *   font(size, family, weight?)    -> CSS/canvas font shorthand
 *   drawDL(ctx, dl)                -> paints into an existing 2D context (respects its current transform)
 *   renderDLCanvas(dl, w, h, pr)   -> new HTMLCanvasElement (w*pr x h*pr)
 *
 * Usage
 *   const dl: Prim[] = [{t: 'rect', x: 0, y: 0, w: 100, h: 30, r: 4, fill: {lin: [0, 0, 0, 30], stops: [[0, '#fff'], [1, '#ccc']]}, stroke: '#003', lw: 1}];
 *   <DLSvg dl={dl} w={100} h={30}/>            // 2D
 *   const canvas = renderDLCanvas(dl, 100, 30, 2); // 3D texture source
 */

export type Stop = [number, string];
export type LinPaint = {lin: [number, number, number, number]; stops: Stop[]};
export type RadPaint = {rad: [number, number, number] | [number, number, number, number, number]; stops: Stop[]};
export type Paint = string | LinPaint | RadPaint;
export type Shadow = {dx?: number; dy?: number; blur: number; color: string};
export type Radii = number | [number, number, number, number]; // tl, tr, br, bl

export type Style = {
  fill?: Paint;
  stroke?: Paint;
  lw?: number;
  join?: CanvasLineJoin;
  cap?: CanvasLineCap;
  alpha?: number;
  shadow?: Shadow;
  dash?: number[];
  /** paint the stroke underneath the fill (outlined text / stickers) */
  strokeFirst?: boolean;
};

export type RectPrim = Style & {t: 'rect'; x: number; y: number; w: number; h: number; r?: Radii};
export type CirclePrim = Style & {t: 'circle'; cx: number; cy: number; r: number};
export type EllipsePrim = Style & {t: 'ellipse'; cx: number; cy: number; rx: number; ry: number};
export type PolyPrim = Style & {t: 'poly'; pts: number[]; open?: boolean};
export type PathPrim = Style & {t: 'path'; d: string};
export type TextPrim = Style & {t: 'text'; x: number; y: number; text: string; font: string; align?: 'left' | 'center' | 'right'; ls?: number};
export type ClipShape = {x: number; y: number; w: number; h: number; r?: Radii} | {d: string};
export type GroupPrim = {
  t: 'g';
  c: Prim[];
  tx?: number;
  ty?: number;
  /** degrees, applied after translate */
  rot?: number;
  sx?: number;
  sy?: number;
  alpha?: number;
  clip?: ClipShape;
  /** shapes punched OUT of the group's content (ink wear, cut-outs) */
  knock?: Prim[];
  /** drop shadow of the whole group (as one layer) */
  shadow?: Shadow;
};
export type ShapePrim = RectPrim | CirclePrim | EllipsePrim | PolyPrim | PathPrim;
export type Prim = ShapePrim | TextPrim | GroupPrim;

/** A drawable with its own size. */
export type Drawing = {w: number; h: number; dl: Prim[]};

const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

// ---------------------------------------------------------------- path builders
export const rrectD = (x: number, y: number, w: number, h: number, r: Radii = 0): string => {
  let [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : r;
  const m = Math.min(w, h) / 2;
  tl = Math.min(tl, m); tr = Math.min(tr, m); br = Math.min(br, m); bl = Math.min(bl, m);
  if (!tl && !tr && !br && !bl) return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
  return (
    `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}` +
    (tr ? `A${n(tr)} ${n(tr)} 0 0 1 ${n(x + w)} ${n(y + tr)}` : '') +
    `V${n(y + h - br)}` +
    (br ? `A${n(br)} ${n(br)} 0 0 1 ${n(x + w - br)} ${n(y + h)}` : '') +
    `H${n(x + bl)}` +
    (bl ? `A${n(bl)} ${n(bl)} 0 0 1 ${n(x)} ${n(y + h - bl)}` : '') +
    `V${n(y + tl)}` +
    (tl ? `A${n(tl)} ${n(tl)} 0 0 1 ${n(x + tl)} ${n(y)}` : '') +
    'Z'
  );
};
export const ellipseD = (cx: number, cy: number, rx: number, ry: number) =>
  `M${n(cx - rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)}Z`;
export const polyD = (pts: number[], open = false) => {
  let d = '';
  for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${n(pts[i])} ${n(pts[i + 1])}`;
  return open ? d : d + 'Z';
};
export const primD = (p: ShapePrim): string => {
  switch (p.t) {
    case 'rect': return rrectD(p.x, p.y, p.w, p.h, p.r ?? 0);
    case 'circle': return ellipseD(p.cx, p.cy, p.r, p.r);
    case 'ellipse': return ellipseD(p.cx, p.cy, p.rx, p.ry);
    case 'poly': return polyD(p.pts, p.open);
    case 'path': return p.d;
  }
};
export const clipD = (c: ClipShape) => ('d' in c ? c.d : rrectD(c.x, c.y, c.w, c.h, c.r ?? 0));

/** Regular star / starburst polygon points around (cx,cy). */
export const starPts = (cx: number, cy: number, points: number, rOuter: number, rInner: number, rotDeg = -90) => {
  const out: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = ((rotDeg + (i * 180) / points) * Math.PI) / 180;
    const r = i % 2 ? rInner : rOuter;
    out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return out;
};

/** 4-point twinkle sparkle (Y2K "sparkle GIF" star) as a path. */
export const sparkleD = (cx: number, cy: number, r: number, thin = 0.18) => {
  const t = r * thin;
  return (
    `M${n(cx)} ${n(cy - r)}Q${n(cx + t)} ${n(cy - t)} ${n(cx + r)} ${n(cy)}` +
    `Q${n(cx + t)} ${n(cy + t)} ${n(cx)} ${n(cy + r)}Q${n(cx - t)} ${n(cy + t)} ${n(cx - r)} ${n(cy)}` +
    `Q${n(cx - t)} ${n(cy - t)} ${n(cx)} ${n(cy - r)}Z`
  );
};

// ---------------------------------------------------------------- text
export const font = (size: number, family: string, weight: 'normal' | 'bold' = 'normal', style: '' | 'italic' = '') =>
  `${style ? style + ' ' : ''}${weight} ${n(size)}px ${family}`;

let mctx: CanvasRenderingContext2D | null = null;
const mcache = new Map<string, number>();
/** Width of `text` in px for a CSS font shorthand. Synchronous (system fonts only). */
export const measureText = (f: string, text: string, ls = 0): number => {
  const k = `${f}|${ls}|${text}`;
  const hit = mcache.get(k);
  if (hit !== undefined) return hit;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  let w = text.length * 8;
  if (mctx) {
    mctx.font = f;
    mctx.letterSpacing = `${ls}px`;
    w = mctx.measureText(text).width;
  }
  if (mcache.size > 20000) mcache.clear();
  mcache.set(k, w);
  return w;
};

/** Greedy word wrap. Honours explicit '\n'. */
export const wrapText = (f: string, text: string, maxW: number): string[] => {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const cand = line ? `${line} ${word}` : word;
      if (!line || measureText(f, cand) <= maxW) line = cand;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
};

/** Truncate with an ellipsis so the text fits in maxW. */
export const fitText = (f: string, text: string, maxW: number): string => {
  if (measureText(f, text) <= maxW) return text;
  let s = text;
  while (s.length > 1 && measureText(f, s + '…') > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
};

// ---------------------------------------------------------------- canvas renderer
type Ctx = CanvasRenderingContext2D;

const mkPaint = (ctx: Ctx, p: Paint): string | CanvasGradient => {
  if (typeof p === 'string') return p;
  let g: CanvasGradient;
  if ('lin' in p) g = ctx.createLinearGradient(...p.lin);
  else {
    const [cx, cy, r, fx = cx, fy = cy] = p.rad as number[];
    g = ctx.createRadialGradient(fx, fy, 0, cx, cy, r);
  }
  for (const [o, c] of p.stops) g.addColorStop(Math.max(0, Math.min(1, o)), c);
  return g;
};

const curScale = (ctx: Ctx) => {
  const m = ctx.getTransform();
  return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
};

const setShadow = (ctx: Ctx, s: Shadow | undefined) => {
  if (!s) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    return;
  }
  // canvas shadow params ignore the transform -> scale them manually (rotation is ignored).
  const k = curScale(ctx);
  ctx.shadowColor = s.color;
  ctx.shadowBlur = s.blur * k;
  ctx.shadowOffsetX = (s.dx ?? 0) * k;
  ctx.shadowOffsetY = (s.dy ?? 0) * k;
};

const applyStroke = (ctx: Ctx, p: Style) => {
  ctx.lineWidth = p.lw ?? 1;
  ctx.lineJoin = p.join ?? 'miter';
  ctx.lineCap = p.cap ?? 'butt';
  ctx.miterLimit = 4;
  ctx.setLineDash(p.dash ?? []);
};

const paintShape = (ctx: Ctx, p: ShapePrim) => {
  const path = new Path2D(primD(p));
  const ops: Array<'f' | 's'> = [];
  if (p.strokeFirst) {
    if (p.stroke) ops.push('s');
    if (p.fill) ops.push('f');
  } else {
    if (p.fill) ops.push('f');
    if (p.stroke) ops.push('s');
  }
  ops.forEach((op, i) => {
    setShadow(ctx, i === 0 ? p.shadow : undefined);
    if (op === 'f') {
      ctx.fillStyle = mkPaint(ctx, p.fill!);
      ctx.fill(path);
    } else {
      applyStroke(ctx, p);
      ctx.strokeStyle = mkPaint(ctx, p.stroke!);
      ctx.stroke(path);
    }
  });
};

const paintText = (ctx: Ctx, p: TextPrim) => {
  ctx.font = p.font;
  ctx.letterSpacing = `${p.ls ?? 0}px`;
  ctx.textAlign = p.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  // letterSpacing adds trailing space after the last glyph; compensate for centered/right text like SVG does.
  const lsShift = p.ls ? (p.align === 'center' ? p.ls / 2 : p.align === 'right' ? p.ls : 0) : 0;
  const x = p.x + lsShift;
  const ops: Array<'f' | 's'> = [];
  if (p.strokeFirst) {
    if (p.stroke) ops.push('s');
    if (p.fill) ops.push('f');
  } else {
    if (p.fill) ops.push('f');
    if (p.stroke) ops.push('s');
  }
  ops.forEach((op, i) => {
    setShadow(ctx, i === 0 ? p.shadow : undefined);
    if (op === 'f') {
      ctx.fillStyle = mkPaint(ctx, p.fill!);
      ctx.fillText(p.text, x, p.y);
    } else {
      applyStroke(ctx, {...p, join: p.join ?? 'round'});
      ctx.strokeStyle = mkPaint(ctx, p.stroke!);
      ctx.strokeText(p.text, x, p.y);
    }
  });
};

const needsLayer = (g: GroupPrim) => !!g.knock?.length || !!g.shadow || ((g.alpha ?? 1) < 1 && g.c.length > 1);

const drawGroup = (ctx: Ctx, g: GroupPrim) => {
  ctx.save();
  if (g.tx || g.ty) ctx.translate(g.tx ?? 0, g.ty ?? 0);
  if (g.rot) ctx.rotate((g.rot * Math.PI) / 180);
  if ((g.sx ?? 1) !== 1 || (g.sy ?? 1) !== 1) ctx.scale(g.sx ?? 1, g.sy ?? 1);
  if (g.clip) ctx.clip(new Path2D(clipD(g.clip)));
  if (!needsLayer(g)) {
    ctx.globalAlpha *= g.alpha ?? 1;
    for (const c of g.c) drawPrim(ctx, c);
    ctx.restore();
    return;
  }
  // offscreen layer (same pixel grid as the target)
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lc = layer.getContext('2d')!;
  lc.setTransform(ctx.getTransform());
  for (const c of g.c) drawPrim(lc, c);
  if (g.knock?.length) {
    lc.globalCompositeOperation = 'destination-out';
    for (const k of g.knock) drawPrim(lc, k);
    lc.globalCompositeOperation = 'source-over';
  }
  const k = curScale(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= g.alpha ?? 1;
  if (g.shadow) {
    ctx.shadowColor = g.shadow.color;
    ctx.shadowBlur = g.shadow.blur * k;
    ctx.shadowOffsetX = (g.shadow.dx ?? 0) * k;
    ctx.shadowOffsetY = (g.shadow.dy ?? 0) * k;
  }
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
};

const drawPrim = (ctx: Ctx, p: Prim) => {
  if (p.t === 'g') return drawGroup(ctx, p);
  const a = p.alpha ?? 1;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  if (p.t === 'text') paintText(ctx, p);
  else paintShape(ctx, p);
  ctx.restore();
};

/** Paint a display list into a context (uses the context's current transform). */
export const drawDL = (ctx: Ctx, dl: Prim[]) => {
  for (const p of dl) drawPrim(ctx, p);
};

/** Render a display list into a new (or given) canvas at pixel ratio `pr`. */
export const renderDLCanvas = (dl: Prim[], w: number, h: number, pr = 2, canvas?: HTMLCanvasElement, pad = 0): HTMLCanvasElement => {
  const c = canvas ?? document.createElement('canvas');
  const W = Math.max(1, Math.round((w + pad * 2) * pr));
  const H = Math.max(1, Math.round((h + pad * 2) * pr));
  if (c.width !== W) c.width = W;
  if (c.height !== H) c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.setTransform(pr, 0, 0, pr, pad * pr, pad * pr);
  drawDL(ctx, dl);
  return c;
};

// ---------------------------------------------------------------- small helpers for builders
export const lin = (x1: number, y1: number, x2: number, y2: number, ...stops: Stop[]): LinPaint => ({lin: [x1, y1, x2, y2], stops});
export const vgrad = (y1: number, y2: number, ...stops: Stop[]): LinPaint => ({lin: [0, y1, 0, y2], stops});
export const hgrad = (x1: number, x2: number, ...stops: Stop[]): LinPaint => ({lin: [x1, 0, x2, 0], stops});
export const rad = (cx: number, cy: number, r: number, ...stops: Stop[]): RadPaint => ({rad: [cx, cy, r], stops});
export const g = (c: Prim[], o: Omit<GroupPrim, 't' | 'c'> = {}): GroupPrim => ({t: 'g', c, ...o});
