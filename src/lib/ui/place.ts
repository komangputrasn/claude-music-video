/**
 * Y2K UI kit — shared placement props for 2D components (HTML layers inside <AbsoluteFill>).
 *
 * API
 *   type PlaceProps = {x?, y?, scale?, rotate?, opacity?, origin?, anchor?, zIndex?, style?, className?}
 *     x, y    position in parent px (absolute). Omit both to stay in normal flow (position: relative).
 *     anchor  'topleft' (default for windows/banners/buttons) | 'center' (x,y is the element centre)
 *     scale   uniform scale around `origin` (default 'center'); rotate in degrees.
 *   placeStyle(p, w, h, defaultAnchor?) -> CSSProperties
 *
 * Usage
 *   <div style={placeStyle({x: 100, y: 80, scale: 1.5}, 440, 180)}/>
 */
import type React from 'react';

export type PlaceProps = {
  x?: number;
  y?: number;
  scale?: number;
  /** degrees */
  rotate?: number;
  opacity?: number;
  /** CSS transform-origin, default 'center' */
  origin?: string;
  anchor?: 'topleft' | 'center';
  zIndex?: number;
  style?: React.CSSProperties;
  className?: string;
};

export const placeStyle = (p: PlaceProps, w: number, h: number, defaultAnchor: 'topleft' | 'center' = 'topleft'): React.CSSProperties => {
  const abs = p.x !== undefined || p.y !== undefined;
  const anchor = p.anchor ?? defaultAnchor;
  const ox = anchor === 'center' ? w / 2 : 0;
  const oy = anchor === 'center' ? h / 2 : 0;
  const s = p.scale ?? 1;
  const tf: string[] = [];
  if (p.rotate) tf.push(`rotate(${p.rotate}deg)`);
  if (s !== 1) tf.push(`scale(${s})`);
  return {
    position: abs ? 'absolute' : 'relative',
    left: abs ? (p.x ?? 0) - ox : undefined,
    top: abs ? (p.y ?? 0) - oy : undefined,
    width: w,
    height: h,
    transform: tf.length ? tf.join(' ') : undefined,
    transformOrigin: p.origin ?? 'center',
    opacity: p.opacity,
    zIndex: p.zIndex,
    flexShrink: 0,
    ...p.style,
  };
};
