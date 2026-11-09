// Small local building blocks for the Cancel scene (cached geometry + inked toon solids, easing helpers).
import React from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {Ink, hullOf} from '../../lib/props';
import {toonMat} from '../../lib/characters/toon';
import {rand} from '../../lib/time';

export type V3 = [number, number, number];
type GroupProps = Omit<ThreeElements['group'], 'children'>;

const geoCache = new Map<string, THREE.BufferGeometry>();
const cached = (key: string, make: () => THREE.BufferGeometry) => {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
};
export const boxGeo = (w: number, h: number, d: number) => cached(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cylGeo = (rt: number, rb: number, h: number, seg = 16, open = false) =>
  cached(`c${rt}|${rb}|${h}|${seg}|${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
export const sphGeo = (r: number, w = 16, h = 12) => cached(`s${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
export const icoGeo = (r: number, d = 0) => cached(`i${r}|${d}`, () => new THREE.IcosahedronGeometry(r, d));
export const coneGeo = (r: number, h: number, seg = 8) => cached(`k${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));
export const planeGeo = (w: number, h: number) => cached(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
export {hullOf};

/** Inked toon solid. `geometry` + colour (or material). */
export const Solid: React.FC<
  GroupProps & {geometry: THREE.BufferGeometry; color?: string; material?: THREE.Material; ink?: number | false; inkColor?: string; children?: React.ReactNode}
> = ({geometry, color = '#ffffff', material, ink = 0.03, inkColor, children, ...group}) => (
  <group {...group}>
    <Ink geometry={geometry} material={material ?? toonMat(color)} outline={ink === false ? 0 : ink} outlineColor={inkColor} />
    {children}
  </group>
);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInCubic = (x: number) => Math.pow(clamp01(x), 3);
export const easeOutBack = (x: number, s = 1.9) => {
  const t = clamp01(x) - 1;
  return 1 + (s + 1) * t * t * t + s * t * t;
};
/** 0 outside [a,b], 0..1 inside (linear) */
export const lin = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
/** decaying shake vector (deterministic) */
export const shake = (f: number, hit: number, amp: number, decay = 10, seed = 3): V3 => {
  const k = f - hit;
  if (k < 0) return [0, 0, 0];
  const e = amp * Math.exp(-k / decay);
  if (e < 1e-4) return [0, 0, 0];
  const r = (s: string) => rand(`shk-${seed}-${s}-${Math.floor(f)}`) * 2 - 1;
  return [r('x') * e, r('y') * e, r('z') * e * 0.5];
};
export const addV = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const lerpV = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
