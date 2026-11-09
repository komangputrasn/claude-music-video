// Shared bits for the Final shots.
import type React from 'react';
import type {StageProps} from '../../lib/three';
import {clamp01} from '../../lib/time';

export type V3 = [number, number, number];
/** f = shot-local frame, lf = scene-local frame, af = song-absolute frame */
export type ShotProps = {f: number; af: number; lf: number};
export type ShotDef = {
  id: string;
  from: number;
  to: number;
  /** 3D content (inside the scene's single <Stage>) */
  Scene: React.FC<ShotProps>;
  /** optional 2D HTML layer above the Stage */
  Over?: React.FC<ShotProps>;
  /** optional 2D HTML layer under the Stage (only visible when the Stage background is transparent) */
  Under?: React.FC<ShotProps>;
  stage?: Partial<Omit<StageProps, 'children'>>;
};

export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIn = (x: number) => Math.pow(clamp01(x), 3);
export const easeOutBack = (x: number, s = 1.9) => {
  const t = clamp01(x) - 1;
  return 1 + (s + 1) * t * t * t + s * t * t;
};
export const mix3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** 1 at frame x0, decaying exponentially afterwards (0 before) */
export const hit = (f: number, x0: number, tau = 5) => (f < x0 ? 0 : Math.exp(-(f - x0) / tau));
/** triangular pulse around x0 */
export const near = (f: number, x0: number, w = 6) => Math.max(0, 1 - Math.abs(f - x0) / w);

/** unit vector from elevation/azimuth helpers: azimuth 0 = -Z (behind the house), + = toward +X */
export const sunVec = (elev: number, az: number): V3 => {
  const c = Math.cos(elev);
  return [Math.sin(az) * c, Math.sin(elev), -Math.cos(az) * c];
};
