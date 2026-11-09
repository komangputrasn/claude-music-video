// Pre — small local staging helpers (cached textures, additive glow cards, instanced boxes, easing).
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, hdr} from '../../lib/palette';

export type V3 = [number, number, number];
export type ShotProps = {t: number; abs: number};

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** 0..1 between song times a..b (linear) */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ------------------------------------------------------------------------------------------------ cached textures
const texCache = new Map<string, THREE.CanvasTexture>();
const cachedTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  texCache.set(key, t);
  return t;
};

/** soft radial glow */
export const radialTex = () =>
  cachedTex('radial', 256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  });

/** light spilling through a doorway onto the floor: a soft trapezoid, bright at the door (top of the texture, v = 1),
 *  widening and fading toward the room (bottom). */
export const spillTex = () =>
  cachedTex('spill', 256, 512, (g) => {
    g.filter = 'blur(10px)';
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(256 * 0.24, 6);
    g.lineTo(256 * 0.76, 6);
    g.lineTo(256 * 0.98, 506);
    g.lineTo(256 * 0.02, 506);
    g.closePath();
    g.fill();
  });

// ------------------------------------------------------------------------------------------------ glow card
const PLANE = new THREE.PlaneGeometry(1, 1);

/** additive card with a soft radial (or custom) texture; faces +Z. Never in front of a hero. */
export const GlowCard: React.FC<{
  color?: string; intensity?: number; scale?: [number, number]; tex?: THREE.Texture; fog?: boolean; renderOrder?: number;
} & Omit<React.ComponentProps<'group'>, 'children' | 'scale'>> = ({
  color = S.bone, intensity = 0.6, scale = [10, 10], tex, fog = false, renderOrder, ...group
}) => {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog, toneMapped: true}),
    [fog],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.map = tex ?? radialTex();
    mat.color.copy(hdr(color, intensity));
    mat.needsUpdate = true;
  });
  return (
    <group {...group}>
      <mesh geometry={PLANE} material={mat} scale={[scale[0], scale[1], 1]} renderOrder={renderOrder} />
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ instanced boxes
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/** many identical boxes (bollards, benches) in one draw call; base centre at each position. Pass stable (memoised or
 *  module-level) `positions`/`size`/`yaw`: they key the instanced mesh. */
export const BoxRow: React.FC<{positions: V3[]; size: V3; color?: string; yaw?: number[]}> = ({positions, size, color = S.void, yaw}) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(UNIT_BOX, new THREE.MeshBasicMaterial({color}), positions.length);
    const o = new THREE.Object3D();
    positions.forEach((p, i) => {
      o.position.set(p[0], p[1], p[2]);
      o.rotation.set(0, yaw?.[i] ?? 0, 0);
      o.scale.set(size[0], size[1], size[2]);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [positions, size, color, yaw]);
  useLayoutEffect(() => () => {
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  return <primitive object={mesh} />;
};
