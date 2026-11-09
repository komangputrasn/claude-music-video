// 2002 sports-broadcast "telestrator" marker drawn flat on the ground (decals lying on y≈0, readable from above):
// hand-drawn draw-on circles + marker labels + arrows. Pure: everything is driven by `progress` props.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {FONTS} from '../../lib/palette';
import {clamp01} from '../../lib/time';

const STEPS = 20;
const MARKER = '#FFE135';

/** quantized draw-on ring geometries (no per-frame geometry creation) */
const ringCache = new Map<string, THREE.RingGeometry[]>();
const ringSteps = (r: number, w: number) => {
  const key = `${r}:${w}`;
  let g = ringCache.get(key);
  if (!g) {
    // overshoot past 360 deg like a hand-drawn loop
    g = Array.from({length: STEPS}, (_, i) => new THREE.RingGeometry(r - w / 2, r + w / 2, 56, 1, 0.3, ((i + 1) / STEPS) * Math.PI * 2.15));
    ringCache.set(key, g);
  }
  return g;
};

const markerMat = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({color, toneMapped: false, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide});

export type MarkerCircleProps = Omit<ThreeElements['group'], 'children'> & {
  radius: number;
  width?: number;
  progress: number;
  color?: string;
  /** ellipse squash (x scale / z scale) */
  squash?: [number, number];
};

/** a loop drawn on the ground around a point (group origin), draw-on with `progress` 0..1 */
export const MarkerCircle: React.FC<MarkerCircleProps> = ({radius, width = 0.05, progress, color = MARKER, squash = [1.12, 0.88], ...g}) => {
  const geos = ringSteps(radius, width);
  const mat = useMemo(() => markerMat(color), [color]);
  const shadow = useMemo(() => markerMat('#1b1030', 0.45), []);
  const p = clamp01(progress);
  if (p <= 0.001) return null;
  const geo = geos[Math.min(STEPS - 1, Math.floor(p * (STEPS - 1)))];
  return (
    <group {...g}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={[squash[0], squash[1], 1]}>
        <mesh geometry={geo} material={shadow} position={[0.012, -0.012, -0.001]} renderOrder={5} />
        <mesh geometry={geo} material={mat} renderOrder={6} />
      </group>
    </group>
  );
};

const labelCache = new Map<string, {tex: THREE.CanvasTexture; aspect: number}>();
const labelTexture = (text: string, sub: string | undefined, color: string) => {
  const key = `${text}|${sub}|${color}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  const c = cv.getContext('2d')!;
  c.font = `bold 120px ${FONTS.comic}`;
  const w1 = c.measureText(text).width;
  c.font = `bold 70px ${FONTS.comic}`;
  const w2 = sub ? c.measureText(sub).width : 0;
  const W = Math.ceil(Math.max(w1, w2) + 80);
  const H = sub ? 240 : 160;
  cv.width = W;
  cv.height = H;
  const d = cv.getContext('2d')!;
  d.lineJoin = 'round';
  d.textAlign = 'center';
  d.textBaseline = 'middle';
  const line = (s: string, y: number, px: number) => {
    d.font = `bold ${px}px ${FONTS.comic}`;
    d.lineWidth = px * 0.16;
    d.strokeStyle = '#1b1030';
    d.strokeText(s, W / 2 + 4, y + 5);
    d.fillStyle = color;
    d.fillText(s, W / 2, y);
  };
  line(text, 80, 120);
  if (sub) line(sub, 190, 70);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const out = {tex, aspect: W / H};
  labelCache.set(key, out);
  return out;
};

export type MarkerLabelProps = Omit<ThreeElements['group'], 'children'> & {
  text: string;
  sub?: string;
  /** height of the label on the ground (m) */
  height?: number;
  progress: number;
  color?: string;
};

/** marker text lying flat on the ground, reading "up" toward -Z; pops on with `progress` */
export const MarkerLabel: React.FC<MarkerLabelProps> = ({text, sub, height = 0.3, progress, color = MARKER, ...g}) => {
  const {tex, aspect} = labelTexture(text, sub, color);
  const p = clamp01(progress);
  if (p <= 0.001) return null;
  const s = p < 1 ? 0.6 + 0.55 * Math.sin(p * Math.PI * 0.75) : 1;
  return (
    <group {...g}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[height * aspect * s, height * s, 1]} renderOrder={7}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} opacity={Math.min(1, p * 3)} />
      </mesh>
    </group>
  );
};

/** a marker arrow on the ground from `from` to `to` (xz, group-local), drawn on with progress */
export const MarkerArrow: React.FC<{from: [number, number]; to: [number, number]; progress: number; width?: number; color?: string} & Omit<ThreeElements['group'], 'children'>> = ({
  from, to, progress, width = 0.05, color = MARKER, ...g
}) => {
  const mat = useMemo(() => markerMat(color), [color]);
  const p = clamp01(progress);
  if (p <= 0.001) return null;
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const len = Math.hypot(dx, dz) * p;
  const ang = Math.atan2(dx, dz);
  const head = p > 0.85;
  return (
    <group {...g}>
      <group position={[from[0], 0, from[1]]} rotation={[0, ang, 0]}>
        <mesh position={[0, 0, len / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={6}>
          <planeGeometry args={[width, len]} />
        </mesh>
        {head ? (
          <group position={[0, 0, len]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.07, 0, -0.07]} rotation={[-Math.PI / 2, 0, -s * Math.PI * 0.25]} material={mat} renderOrder={6}>
                <planeGeometry args={[width, 0.22]} />
              </mesh>
            ))}
          </group>
        ) : null}
      </group>
    </group>
  );
};
