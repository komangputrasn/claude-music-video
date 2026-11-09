/**
 * Clouds — puffy low-poly cel-shaded clouds (clusters of flat-shaded icospheres with flat bottoms and a vertex-colour
 * gradient: white tops, tinted bellies). Deterministic: drift comes only from the `time` prop.
 *
 *   <Cloud seed={3} position={[0, 30, -80]} scale={6} top="#fff" bottom="#b9d4ff" />      one cloud (~2.6 x 1 x 1.2 units * scale)
 *   <Clouds count={10} time={t} area={[200, 60]} height={[20, 40]} z={-90} speed={1.5} />  a drifting band (wraps in x)
 *   <CloudRing count={14} time={t} radius={[150, 230]} height={[22, 55]} speed={0.004} />  ring around the origin (SkyDome uses this)
 *
 * makeCloudGeometry(seed, puffs?) -> BufferGeometry (cached per seed) if you need the raw shape.
 * Materials ignore fog so distant clouds stay crisp against the sky.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {hash1} from './common';

type GroupProps = ThreeElements['group'];

const CLOUD_GRADIENT = (() => {
  const steps = [0.62, 0.84, 1.0];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = Math.round(v * 255);
    data[i * 4 + 3] = 255;
  });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const geoCache = new Map<string, THREE.BufferGeometry>();
/** Flat-shaded puffy cloud, roughly 2.6 wide (x), 1.1 tall, 1.3 deep, base at y=0. Vertex colour attribute 'color' holds 0..1 height. */
export const makeCloudGeometry = (seed: number, puffs = 7) => {
  const key = `${seed}|${puffs}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < puffs; i++) {
    const t = puffs === 1 ? 0.5 : i / (puffs - 1);
    const big = 1 - Math.abs(t - 0.5) * 1.3; // biggest in the middle
    const r = 0.32 + big * 0.36 + hash1(i, seed * 13 + 1) * 0.14;
    const g = new THREE.IcosahedronGeometry(r, 1);
    const x = (t - 0.5) * 2.1 + (hash1(i, seed * 13 + 2) - 0.5) * 0.25;
    const y = r * 0.55 + big * 0.25 + hash1(i, seed * 13 + 3) * 0.12;
    const z = (hash1(i, seed * 13 + 4) - 0.5) * 0.55;
    g.rotateY(hash1(i, seed * 13 + 5) * 6.28);
    g.rotateX(hash1(i, seed * 13 + 6) * 6.28);
    g.translate(x, y, z);
    parts.push(g);
  }
  // a couple of back puffs for depth
  for (let i = 0; i < 2; i++) {
    const g = new THREE.IcosahedronGeometry(0.42 + hash1(i, seed * 17) * 0.15, 1);
    g.translate((i - 0.5) * 0.9, 0.55, -0.35);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false)!;
  const pos = merged.getAttribute('position') as THREE.BufferAttribute;
  let maxY = 0;
  for (let i = 0; i < pos.count; i++) {
    const y = Math.max(0.08, pos.getY(i)); // flat belly
    pos.setY(i, y === 0.08 ? 0.08 : y);
    maxY = Math.max(maxY, y);
  }
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const h = (pos.getY(i) - 0.08) / (maxY - 0.08);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = h;
  }
  merged.translate(0, -0.08, 0);
  merged.computeVertexNormals();
  merged.setAttribute('h', new THREE.BufferAttribute(col, 3));
  geoCache.set(key, merged);
  return merged;
};

const matCache = new Map<string, THREE.MeshToonMaterial>();
/** Cloud material: toon ramp, top→bottom tint via per-vertex height, gentle self-light so clouds never go grey. */
export const cloudMat = (top = '#ffffff', bottom = '#b9d4ff', emissive = 0.35) => {
  const key = `${top}|${bottom}|${emissive}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({color: '#ffffff', gradientMap: CLOUD_GRADIENT, fog: false});
    const cTop = new THREE.Color(top), cBot = new THREE.Color(bottom);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTop = {value: cTop};
      sh.uniforms.uBot = {value: cBot};
      sh.uniforms.uEm = {value: emissive};
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 h; varying float vH;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = h.x;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uTop; uniform vec3 uBot; uniform float uEm; varying float vH;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec3 cTint = mix(uBot, uTop, smoothstep(0.0, 0.75, vH));\nvec4 diffuseColor = vec4( diffuse * cTint, opacity );')
        .replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + cTint * uEm;');
    };
    m.customProgramCacheKey = () => `cloud`;
    matCache.set(key, m);
  }
  return m;
};

export type CloudProps = GroupProps & {seed?: number; puffs?: number; top?: string; bottom?: string; emissive?: number};
/** One puffy cloud. Base at local y=0, ~2.6 units wide before scale. */
export const Cloud: React.FC<CloudProps> = ({seed = 1, puffs = 7, top, bottom, emissive, ...g}) => {
  const geo = makeCloudGeometry(seed, puffs);
  return (
    <group {...g}>
      <mesh geometry={geo} material={cloudMat(top, bottom, emissive)} />
    </group>
  );
};

type Placement = {x: number; y: number; z: number; s: number; seed: number; rot: number; puffs: number};

export type CloudsProps = GroupProps & {
  count?: number;
  time?: number;
  /** drift speed in units per time unit along +x */
  speed?: number;
  /** [width (x), depth (z)] of the band */
  area?: [number, number];
  height?: [number, number];
  /** centre z of the band */
  z?: number;
  scale?: [number, number];
  top?: string;
  bottom?: string;
  emissive?: number;
  seed?: number;
};
/** A band of clouds drifting along +x and wrapping inside `area` (place it so the wrap happens off-screen). */
export const Clouds: React.FC<CloudsProps> = ({
  count = 10, time = 0, speed = 1.5, area = [220, 60], height = [18, 40], z = -90, scale = [6, 12], top, bottom, emissive, seed = 3, ...g
}) => {
  const items = useMemo<Placement[]>(
    () =>
      Array.from({length: count}, (_, i) => ({
        x: (hash1(i, seed + 101) - 0.5) * area[0],
        y: height[0] + hash1(i, seed + 102) * (height[1] - height[0]),
        z: z + (hash1(i, seed + 103) - 0.5) * area[1],
        s: scale[0] + hash1(i, seed + 104) * (scale[1] - scale[0]),
        seed: Math.floor(hash1(i, seed + 105) * 12),
        rot: (hash1(i, seed + 106) - 0.5) * 0.6,
        puffs: 5 + Math.floor(hash1(i, seed + 107) * 4),
      })),
    [count, area[0], area[1], height[0], height[1], z, scale[0], scale[1], seed],
  );
  const W = area[0];
  return (
    <group {...g}>
      {items.map((c, i) => {
        let x = c.x + time * speed * (0.7 + 0.6 * hash1(i, seed + 9));
        x = ((((x + W / 2) % W) + W) % W) - W / 2;
        return (
          <Cloud key={i} seed={c.seed} puffs={c.puffs} position={[x, c.y, c.z]} scale={[c.s, c.s * 0.8, c.s * 0.9]} rotation={[0, c.rot, 0]}
            top={top} bottom={bottom} emissive={emissive} />
        );
      })}
    </group>
  );
};

export type CloudRingProps = {
  count?: number;
  time?: number;
  /** radians per time unit */
  speed?: number;
  radius?: [number, number];
  height?: [number, number];
  scale?: [number, number];
  top?: string;
  bottom?: string;
  emissive?: number;
  seed?: number;
};
/** Clouds on a ring around the origin, slowly orbiting (no wrap-around popping). Each cloud faces the centre. */
export const CloudRing: React.FC<CloudRingProps> = ({
  count = 14, time = 0, speed = 0.004, radius = [150, 230], height = [22, 55], scale = [14, 26], top, bottom, emissive, seed = 1,
}) => {
  const items = useMemo(
    () =>
      Array.from({length: count}, (_, i) => {
        const a0 = ((i + hash1(i, seed + 1) * 0.7) / count) * Math.PI * 2;
        return {
          a0,
          r: radius[0] + hash1(i, seed + 2) * (radius[1] - radius[0]),
          y: height[0] + hash1(i, seed + 3) * (height[1] - height[0]),
          s: scale[0] + hash1(i, seed + 4) * (scale[1] - scale[0]),
          seed: Math.floor(hash1(i, seed + 5) * 12),
          puffs: 5 + Math.floor(hash1(i, seed + 6) * 4),
        };
      }),
    [count, radius[0], radius[1], height[0], height[1], scale[0], scale[1], seed],
  );
  return (
    <group>
      {items.map((c, i) => {
        const a = c.a0 + time * speed;
        const x = Math.sin(a) * c.r, z = -Math.cos(a) * c.r;
        return (
          <Cloud key={i} seed={c.seed} puffs={c.puffs} position={[x, c.y, z]} rotation={[0, -a, 0]}
            scale={[c.s, c.s * 0.75, c.s * 0.8]} top={top} bottom={bottom} emissive={emissive} />
        );
      })}
    </group>
  );
};
