// TERMS — Chorus1: small shared staging pieces for the shots in this folder (local to this scene).
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, SFONTS, hdr} from '../../lib/palette';
import type {RimOpts} from '../../lib/Silhouette';
import {concreteMat, wboxMinMax, mergeBoxes} from '../../lib/sets';

export type ShotProps = {
  /** song seconds */
  t: number;
  /** absolute frame (for bassAt) */
  f: number;
};

type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 0..1 progress of t through [a, b] */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeInOut = (u: number) => u * u * (3 - 2 * u);
export const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
/** decaying flash after time `at` (1 at onset) */
export const flashAfter = (t: number, at: number, decay = 6) => (t >= at ? Math.exp(-(t - at) * decay) : 0);

export const RIM_BONE: RimOpts = {color: S.bone, strength: 0.9, power: 5, dir: [0, 1]};
export const RIM_RED: RimOpts = {color: S.authRed, strength: 0.7, power: 5, dir: [0, 1]};

/** Plain black ground (for shots without a WetGround, or under it at the horizon). */
export const Ground: React.FC<{size?: number; y?: number; color?: string}> = ({size = 6000, y = 0, color = S.void}) => (
  <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial color={color} />
  </mesh>
);

/** A black concrete wall facade with a rectangular opening (x ∈ [-ow/2, ow/2], y ∈ [0, oh]) — front face at z = 0. */
export const FacadeWithOpening: React.FC<{
  width: number; height: number; ow: number; oh: number; thick?: number; color?: string; ambient?: number;
} & Omit<React.ComponentProps<'group'>, 'children'>> = ({width, height, ow, oh, thick = 1.5, color = GREYS.g3, ambient = 0.05, ...group}) => {
  const geo = useMemo(() => {
    const W = width / 2;
    return mergeBoxes([
      wboxMinMax([-W, 0, -thick], [-ow / 2, height, 0]),
      wboxMinMax([ow / 2, 0, -thick], [W, height, 0]),
      wboxMinMax([-ow / 2, oh, -thick], [ow / 2, height, 0]),
    ]);
  }, [width, height, ow, oh, thick]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = concreteMat({color, ambient, kind: 'wall'});
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} />
    </group>
  );
};

/** A plain box (concrete, static). Origin at the base centre. */
export const Slab: React.FC<{size: V3; color?: string; ambient?: number} & Omit<React.ComponentProps<'group'>, 'children'>> = ({
  size, color = GREYS.g2, ambient = 0.04, ...group
}) => {
  const geo = useMemo(() => wboxMinMax([-size[0] / 2, 0, -size[2] / 2], [size[0] / 2, size[1], size[2] / 2]), [size[0], size[1], size[2]]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <group {...group}>
      <mesh geometry={geo} material={concreteMat({color, ambient, kind: 'wall'})} />
    </group>
  );
};

/** Instanced rows of identical boxes (pillars, runway lights). positions = base centres. */
export const BoxRow: React.FC<{
  positions: V3[]; size: V3; color?: string; intensity?: number; fog?: boolean; concrete?: boolean; ambient?: number;
}> = ({positions, size, color = GREYS.g2, intensity = 1, fog = true, concrete = false, ambient = 0.05}) => {
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
    g.translate(0, size[1] / 2, 0);
    return g;
  }, [size[0], size[1], size[2]]);
  const basic = useMemo(() => new THREE.MeshBasicMaterial({color: hdr(color, intensity), fog, toneMapped: true}), [color, intensity, fog]);
  const mat = concrete ? concreteMat({color, ambient, kind: 'wall'}) : basic;
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mat, positions.length);
    const M = new THREE.Matrix4();
    positions.forEach((p, i) => {
      M.makeTranslation(p[0], p[1], p[2]);
      m.setMatrixAt(i, M);
    });
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [geo, mat, positions]);
  useLayoutEffect(() => () => {
    geo.dispose();
    basic.dispose();
  }, [geo, basic]);
  return <primitive object={mesh} />;
};

/**
 * The CANCEL button: an opaque red pill with "CANCEL" in void, drawn once on a canvas.
 * Origin at its centre, faces +Z. `width` in metres (aspect 3:1). A soft red halo plane sits behind it.
 * The pill is NORMAL-blended (not additive): added on top of a grey screen face, red desaturates to salmon.
 * Its HDR red is capped at 1.5 (above that ACES pushes it coral).
 */
export const CancelButton: React.FC<{width: number; intensity?: number; halo?: number; label?: boolean} & Omit<React.ComponentProps<'group'>, 'children'>> = ({
  width, intensity = 1.3, halo = 0.5, label = true, ...group
}) => {
  const {tex, haloTex} = useMemo(() => {
    const W = 768, H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    const r = H * 0.42;
    const pad = H * 0.08;
    g.fillStyle = '#fff';
    g.beginPath();
    g.roundRect(pad, H / 2 - r, W - pad * 2, r * 2, r);
    g.fill();
    if (label) {
      // the label in void (black): colour × black stays black on the red pill
      g.fillStyle = '#000';
      g.font = `600 ${Math.round(H * 0.36)}px ${SFONTS.futura}`;
      (g as unknown as {letterSpacing: string}).letterSpacing = `${Math.round(H * 0.36 * 0.3)}px`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('CANCEL', W / 2 + H * 0.05, H / 2 + H * 0.02);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    const hc = document.createElement('canvas');
    hc.width = hc.height = 128;
    const hg = hc.getContext('2d')!;
    const gr = hg.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    hg.fillStyle = gr;
    hg.fillRect(0, 0, 128, 128);
    const ht = new THREE.CanvasTexture(hc);
    ht.colorSpace = THREE.SRGBColorSpace;
    return {tex: t, haloTex: ht};
  }, [label]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: tex, transparent: true, alphaTest: 0.02, depthWrite: false, fog: false}), [tex]);
  const haloMat = useMemo(() => new THREE.MeshBasicMaterial({map: haloTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false}), [haloTex]);
  useLayoutEffect(() => {
    mat.color.set(S.authRed).multiplyScalar(Math.min(1.5, intensity));
    haloMat.color.set(S.authRed).multiplyScalar(Math.min(1.2, halo));
    haloMat.visible = halo > 0.001;
  });
  useLayoutEffect(() => () => {
    mat.dispose();
    haloMat.dispose();
    tex.dispose();
    haloTex.dispose();
  }, [mat, haloMat, tex, haloTex]);
  return (
    <group {...group}>
      <mesh material={haloMat} scale={[width * 1.9, width * 1.1, 1]} position={[0, 0, -0.02]}>
        <planeGeometry />
      </mesh>
      <mesh material={mat} scale={[width, width / 3, 1]}>
        <planeGeometry />
      </mesh>
    </group>
  );
};

/** Flat glowing card with a radial gradient (additive) — small local light sources. */
export const GlowCard: React.FC<{color?: string; intensity?: number; scale: [number, number]} & Omit<React.ComponentProps<'group'>, 'children'>> = ({
  color = S.bone, intensity = 0.6, scale, ...group
}) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.4)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false}), [tex]);
  useLayoutEffect(() => {
    mat.color.set(color).multiplyScalar(intensity);
  });
  useLayoutEffect(() => () => {
    mat.dispose();
    tex.dispose();
  }, [mat, tex]);
  return (
    <group {...group}>
      <mesh material={mat} scale={[scale[0], scale[1], 1]}>
        <planeGeometry />
      </mesh>
    </group>
  );
};
