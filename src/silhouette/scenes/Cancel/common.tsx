// TERMS — Cancel: small staging helpers local to this scene.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../../lib/palette';
import {measureLyric, displayWord, WordInfo, WordFx} from '../../lib/WorldLyric';
import {LINES} from '../../../lib/lyrics';

export type ShotProps = {
  /** song seconds */
  t: number;
  /** absolute frame (for bassAt / onsetAt) */
  f: number;
};

export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 0..1 progress of t through [a, b] */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (u: number) => u * u * (3 - 2 * u);
export const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);
export const easeIn = (u: number) => u * u * u;
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
/** decaying pulse after time `at` (1 at onset) */
export const pulseAfter = (t: number, at: number, decay = 6) => (t >= at ? Math.exp(-(t - at) * decay) : 0);

/**
 * Explicit line breaks for a <WorldLyric>: `rows` = groups of word indices; each word is moved to its place in centred
 * rows (row 0's baseline at the group origin, rows stacking down by lineHeight·size). `scale` optionally enlarges whole
 * rows (e.g. the "ILIAD," row). Words not listed are hidden.
 */
export const rowsPerWord = (
  line: number, size: number, rows: number[][], opts: {lineHeight?: number; rowScale?: number[]; rowGap?: number[]} = {},
) => {
  const lineHeight = opts.lineHeight ?? 1.18;
  const words = LINES[line].words.map((w) => displayWord(w.text));
  const sp = 0.42 * size;
  const target: ({x: number; y: number; s: number} | undefined)[] = [];
  let y = 0;
  rows.forEach((r, ri) => {
    const s = opts.rowScale?.[ri] ?? 1;
    if (ri > 0) y -= lineHeight * size * Math.max(s, opts.rowScale?.[ri - 1] ?? 1) * (opts.rowGap?.[ri] ?? 1);
    const widths = r.map((i) => measureLyric(words[i], size).width * s);
    const total = widths.reduce((a, b) => a + b, 0) + sp * s * (r.length - 1);
    let x = -total / 2;
    r.forEach((i, k) => {
      target[i] = {x: x + widths[k] / 2, y, s};
      x += widths[k] + sp * s;
    });
  });
  return (i: number, w: WordInfo): WordFx => {
    const T = target[i];
    if (!T) return {visible: false};
    // WorldLyric scales each word about its glyph-plane centre, which sits 0.325 em above the baseline (glyph canvas
    // layout in WorldLyric.tsx): compensate so the scaled word's baseline stays on its row
    return {offset: [T.x - (w.x + w.width / 2), T.y - w.y + 0.325 * size * (T.s - 1), 0], scale: T.s};
  };
};

/** Plain flat-colour box (MeshBasic, fog on). Origin at the base centre. */
export const FlatBox: React.FC<{size: V3; color?: string; intensity?: number; fog?: boolean} & Omit<React.ComponentProps<'group'>, 'children'>> = ({
  size, color = S.void, intensity = 1, fog = true, ...group
}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({fog}), [fog]);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.color.set(color).multiplyScalar(intensity);
  });
  return (
    <group {...group}>
      <mesh material={mat} position={[0, size[1] / 2, 0]} scale={size}>
        <boxGeometry />
      </mesh>
    </group>
  );
};

/** One flat black ground plane (under/around a WetGround so nothing shows past its edge). */
export const VoidFloor: React.FC<{size?: number; y?: number}> = ({size = 4000, y = -0.01}) => (
  <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial color={S.void} />
  </mesh>
);

/** Instanced static meshes from a list of matrices (one draw call). */
export const Instances: React.FC<{geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; renderOrder?: number}> = ({
  geometry, material, matrices, renderOrder,
}) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
    matrices.forEach((M, i) => m.setMatrixAt(i, M));
    m.count = matrices.length;
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [geometry, material, matrices]);
  useLayoutEffect(() => {
    if (renderOrder !== undefined) mesh.renderOrder = renderOrder;
  });
  return <primitive object={mesh} />;
};

/** A canvas → texture helper (sRGB, mipmapped, anisotropic). */
export const canvasTexture = (c: HTMLCanvasElement, repeat = false) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
};

/** Deterministic hash 0..1 (no Math.random). */
export const hash = (a: number, b = 0, c = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
};
