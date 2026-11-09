/**
 * <DLSvg>: renders a UI display list (see dl.ts) as inline SVG for 2D HTML layers. Pixel-for-pixel the same
 * design that drawDL() paints into canvas textures for 3D.
 *
 * API
 *   <DLSvg dl={Prim[]} w={number} h={number} style? className?/>
 *     - viewBox is 0 0 w h, rendered at w x h CSS px (scale it with CSS transform / width+height style)
 *     - overflow is visible (drop shadows / glows may extend outside the box)
 *   <DrawingSvg drawing={{w,h,dl}} style?/>   convenience wrapper
 *
 * Usage
 *   <DLSvg dl={pushButtonDL(0, 0, 100, 32, 'OK', {isDefault: true})} w={100} h={32} style={{position: 'absolute', left: 40, top: 40}}/>
 */
import React, {useId} from 'react';
import type {Drawing, Paint, Prim, Shadow, ShapePrim} from './dl';
import {clipD, primD} from './dl';

type Builder = {
  uid: string;
  n: number;
  defs: React.ReactNode[];
  ids: Map<string, string>;
};

const paintRef = (b: Builder, p: Paint | undefined): string | undefined => {
  if (p === undefined) return undefined;
  if (typeof p === 'string') return p;
  const key = JSON.stringify(p);
  let id = b.ids.get(key);
  if (!id) {
    id = `${b.uid}p${b.n++}`;
    b.ids.set(key, id);
    const stops = p.stops.map(([o, c], i) => <stop key={i} offset={Math.max(0, Math.min(1, o))} stopColor={c} />);
    if ('lin' in p) {
      const [x1, y1, x2, y2] = p.lin;
      b.defs.push(
        <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          {stops}
        </linearGradient>,
      );
    } else {
      const [cx, cy, r, fx = cx, fy = cy] = p.rad as number[];
      b.defs.push(
        <radialGradient key={id} id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r} fx={fx} fy={fy}>
          {stops}
        </radialGradient>,
      );
    }
  }
  return `url(#${id})`;
};

const shadowRef = (b: Builder, s: Shadow | undefined): string | undefined => {
  if (!s) return undefined;
  const key = `sh|${s.dx ?? 0}|${s.dy ?? 0}|${s.blur}|${s.color}`;
  let id = b.ids.get(key);
  if (!id) {
    id = `${b.uid}f${b.n++}`;
    b.ids.set(key, id);
    b.defs.push(
      <filter key={id} id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feDropShadow dx={s.dx ?? 0} dy={s.dy ?? 0} stdDeviation={s.blur / 2} floodColor={s.color} />
      </filter>,
    );
  }
  return `url(#${id})`;
};

const strokeProps = (b: Builder, p: ShapePrim | Extract<Prim, {t: 'text'}>, defJoin: 'miter' | 'round') =>
  p.stroke
    ? {
        stroke: paintRef(b, p.stroke),
        strokeWidth: p.lw ?? 1,
        strokeLinejoin: (p.join ?? defJoin) as 'miter' | 'round' | 'bevel',
        strokeLinecap: (p.cap ?? 'butt') as 'butt' | 'round' | 'square',
        strokeDasharray: p.dash?.join(' '),
        strokeMiterlimit: 4,
      }
    : {};

const renderPrim = (b: Builder, p: Prim, key: number): React.ReactNode => {
  if (p.t === 'g') {
    const tf: string[] = [];
    if (p.tx || p.ty) tf.push(`translate(${p.tx ?? 0} ${p.ty ?? 0})`);
    if (p.rot) tf.push(`rotate(${p.rot})`);
    if ((p.sx ?? 1) !== 1 || (p.sy ?? 1) !== 1) tf.push(`scale(${p.sx ?? 1} ${p.sy ?? 1})`);
    let clipPath: string | undefined;
    if (p.clip) {
      const id = `${b.uid}c${b.n++}`;
      b.defs.push(
        <clipPath key={id} id={id}>
          <path d={clipD(p.clip)} />
        </clipPath>,
      );
      clipPath = `url(#${id})`;
    }
    let mask: string | undefined;
    if (p.knock?.length) {
      const id = `${b.uid}m${b.n++}`;
      b.defs.push(
        <mask key={id} id={id} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={8000} height={8000}>
          <rect x={-4000} y={-4000} width={8000} height={8000} fill="#fff" />
          {p.knock.map((k, i) => renderMaskPrim(k, i))}
        </mask>,
      );
      mask = `url(#${id})`;
    }
    const filter = shadowRef(b, p.shadow);
    const kids = p.c.map((c, i) => renderPrim(b, c, i));
    // clip in the transformed space, outside the masked/filtered layer so the shadow is clipped like canvas
    return (
      <g key={key} transform={tf.length ? tf.join(' ') : undefined} opacity={p.alpha} clipPath={clipPath}>
        {mask || filter ? (
          <g mask={mask} filter={filter}>
            {kids}
          </g>
        ) : (
          kids
        )}
      </g>
    );
  }
  const filter = shadowRef(b, p.shadow);
  if (p.t === 'text') {
    return (
      <text
        key={key}
        x={p.x}
        y={p.y}
        textAnchor={p.align === 'center' ? 'middle' : p.align === 'right' ? 'end' : 'start'}
        style={{font: p.font, letterSpacing: p.ls ? `${p.ls}px` : undefined, whiteSpace: 'pre'}}
        fill={paintRef(b, p.fill) ?? 'none'}
        opacity={p.alpha}
        filter={filter}
        paintOrder={p.strokeFirst ? 'stroke' : undefined}
        {...strokeProps(b, p, 'round')}
      >
        {p.text}
      </text>
    );
  }
  return (
    <path
      key={key}
      d={primD(p)}
      fill={paintRef(b, p.fill) ?? 'none'}
      opacity={p.alpha}
      filter={filter}
      paintOrder={p.strokeFirst ? 'stroke' : undefined}
      {...strokeProps(b, p, 'miter')}
    />
  );
};

// knockout shapes drawn black into a mask (fully removes content where they are)
const renderMaskPrim = (p: Prim, key: number): React.ReactNode => {
  if (p.t === 'g') {
    const tf: string[] = [];
    if (p.tx || p.ty) tf.push(`translate(${p.tx ?? 0} ${p.ty ?? 0})`);
    if (p.rot) tf.push(`rotate(${p.rot})`);
    if ((p.sx ?? 1) !== 1 || (p.sy ?? 1) !== 1) tf.push(`scale(${p.sx ?? 1} ${p.sy ?? 1})`);
    return (
      <g key={key} transform={tf.join(' ') || undefined} opacity={p.alpha}>
        {p.c.map((c, i) => renderMaskPrim(c, i))}
      </g>
    );
  }
  if (p.t === 'text') {
    return (
      <text key={key} x={p.x} y={p.y} style={{font: p.font, whiteSpace: 'pre'}} fill="#000" opacity={p.alpha}
        textAnchor={p.align === 'center' ? 'middle' : p.align === 'right' ? 'end' : 'start'}>
        {p.text}
      </text>
    );
  }
  return (
    <path key={key} d={primD(p)} fill={p.fill ? '#000' : 'none'} stroke={p.stroke ? '#000' : undefined} strokeWidth={p.lw}
      strokeLinecap={p.cap} opacity={p.alpha} />
  );
};

export type DLSvgProps = {dl: Prim[]; w: number; h: number; style?: React.CSSProperties; className?: string};

export const DLSvg: React.FC<DLSvgProps> = ({dl, w, h, style, className}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const b: Builder = {uid: `u${uid}`, n: 0, defs: [], ids: new Map()};
  const body = dl.map((p, i) => renderPrim(b, p, i));
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{overflow: 'visible', display: 'block', ...style}}
      xmlns="http://www.w3.org/2000/svg"
    >
      {b.defs.length ? <defs>{b.defs}</defs> : null}
      {body}
    </svg>
  );
};

export const DrawingSvg: React.FC<{drawing: Drawing; style?: React.CSSProperties; className?: string}> = ({drawing, style, className}) => (
  <DLSvg dl={drawing.dl} w={drawing.w} h={drawing.h} style={style} className={className} />
);
