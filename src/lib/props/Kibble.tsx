/**
 * Kibble — instanced dog-food nuggets (cel-shaded, ink-outlined, a few brown tones).
 *
 * <KibbleBurst progress origin? count? seed? spread? up? duration? direction? floorY? size? {...groupProps}/>
 *   Deterministic ballistic explosion: launch from `origin` (± a small volume), gravity, bounces on the floor (y = floorY),
 *   slides to rest and settles. `progress` 0..1 maps linearly onto `duration` seconds of simulated time, so feed it a
 *   slowed/eased value for bullet-time. Pure function of props (no clocks).
 *     spread    ≈ landing radius in metres (default 0.8)
 *     up        vertical launch speed m/s (default 2.6)
 *     direction horizontal bias [x, z] added to every launch (m/s) e.g. [0, 1.2] to throw kibble toward camera
 * <KibblePile count? radius? height? seed? footprint? size? {...groupProps}/>
 *   Static mound sitting on y=0 of its group. `footprint=[w, d]` makes a rectangular heap (feeder hopper) instead of a disc.
 *   count defaults to autoKibbleCount(radius, footprint) (dense coverage); a dark filler mound hides gaps when height > 1.2 cm.
 *
 * KIBBLE.size = nugget radius (m). Origin: group origin; floor is y = floorY in the group's space.
 *
 * Example:
 *   <KibbleBurst progress={ramp(f, 30, 120)} origin={[0, 0.32, 0]} count={220} spread={0.9} />
 *   <KibblePile count={60} radius={0.08} height={0.04} position={[0, 0.02, 0]} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {rand} from '../time';
import {OUTLINE} from '../characters/toon';
import {GroupProps, PROP_INK, glossMat} from './Padlock';

export const KIBBLE = {
  /** nugget radius (m) */
  size: 0.0105,
  colors: ['#8A4A1F', '#A35A26', '#6E3815', '#B8692C', '#7B4019'],
};

let kGeo: THREE.BufferGeometry | null = null;
/** Shared nugget geometry (squashed low-poly dodecahedron, unit radius). */
export const kibbleGeometry = () => {
  if (!kGeo) {
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(1, 0.62, 0.92);
    g.deleteAttribute('uv');
    kGeo = g;
  }
  return kGeo;
};
let kHull: THREE.BufferGeometry | null = null;
const kibbleHull = () => {
  if (!kHull) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(1, 0.62, 0.92);
    kHull = g;
  }
  return kHull;
};

const instOutlineCache = new Map<string, THREE.ShaderMaterial>();
/** Inverted-hull outline that also works on InstancedMesh. */
export const instancedOutlineMat = (thickness: number, color: string = OUTLINE.color) => {
  const key = `${thickness}|${color}`;
  let m = instOutlineCache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {uT: {value: thickness}, uC: {value: new THREE.Color(color)}},
      vertexShader: `uniform float uT;
        void main(){ vec3 p = position + normalize(normal) * uT;
          #ifdef USE_INSTANCING
            vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
          #else
            vec4 wp = modelMatrix * vec4(p, 1.0);
          #endif
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }`,
    });
    instOutlineCache.set(key, m);
  }
  return m;
};

export type KibbleItem = {p: [number, number, number]; r: [number, number, number]; s: number; c: number};

/** Low-level: render a list of kibble transforms (instanced body + instanced outline). Rebuilt when `items` changes. */
export const KibbleField: React.FC<{items: KibbleItem[]; capacity?: number; outline?: number | false} & GroupProps> = ({
  items, capacity, outline = PROP_INK.hair, ...rest
}) => {
  const cap = Math.max(1, capacity ?? items.length);
  const {body, hull} = useMemo(() => {
    const mat = glossMat('#ffffff', {spec: 0.12, edge: 0.975});
    const body = new THREE.InstancedMesh(kibbleGeometry(), mat, cap);
    body.frustumCulled = false;
    const cols = KIBBLE.colors.map((c) => new THREE.Color(c));
    for (let i = 0; i < cap; i++) body.setColorAt(i, cols[0]);
    const hull = new THREE.InstancedMesh(kibbleHull(), instancedOutlineMat(0.09), cap);
    hull.frustumCulled = false;
    hull.instanceMatrix = body.instanceMatrix; // share transforms
    return {body, hull};
  }, [cap]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const cols = KIBBLE.colors.map((c) => new THREE.Color(c));
    const n = Math.min(cap, items.length);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      e.set(it.r[0], it.r[1], it.r[2]);
      q.setFromEuler(e);
      s.setScalar(it.s);
      p.set(it.p[0], it.p[1], it.p[2]);
      m.compose(p, q, s);
      body.setMatrixAt(i, m);
      body.setColorAt(i, cols[it.c % cols.length]);
    }
    body.count = n;
    hull.count = outline ? n : 0;
    body.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
  });
  // outline thickness is relative to the unit nugget (instances are scaled by KIBBLE.size)
  useLayoutEffect(() => {
    hull.material = instancedOutlineMat(outline ? outline / KIBBLE.size : 0.09);
  }, [hull, outline]);
  useLayoutEffect(() => () => {
    body.dispose();
    hull.dispose();
  }, [body, hull]);
  return (
    <group {...rest}>
      <primitive object={body} />
      <primitive object={hull} />
    </group>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Burst
// ---------------------------------------------------------------------------------------------------------------------

export type KibbleBurstProps = GroupProps & {
  /** 0..1 → simulated time 0..duration */
  progress: number;
  origin?: [number, number, number];
  count?: number;
  seed?: number | string;
  /** approx landing radius (m) */
  spread?: number;
  /** vertical launch speed (m/s) */
  up?: number;
  /** simulated seconds covered by progress 0..1 (default 2.4) */
  duration?: number;
  /** horizontal launch bias [vx, vz] m/s */
  direction?: [number, number];
  /** floor height in group space (default 0) */
  floorY?: number;
  /** nugget radius override */
  size?: number;
  /** size of the launch volume (m) */
  sourceRadius?: number;
  outline?: number | false;
};

type Particle = {x: number; y: number; z: number; vx: number; vy: number; vz: number; sx: number; sy: number; sz: number; r0: [number, number, number]; s: number; c: number};

const G = 9.8;
/** Position + "spin time" of a ballistic particle at time t with floor bounces & sliding friction. */
const simulate = (p: Particle, t: number, floor: number, rad: number) => {
  let x = p.x, y = p.y, z = p.z, vx = p.vx, vy = p.vy, vz = p.vz, tt = t, spinT = 0;
  for (let bounce = 0; bounce < 5; bounce++) {
    const h = y - (floor + rad);
    const tHit = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * G * Math.max(0, h)))) / G;
    if (tt <= tHit) {
      return {x: x + vx * tt, y: y + vy * tt - 0.5 * G * tt * tt, z: z + vz * tt, spinT: spinT + tt};
    }
    x += vx * tHit;
    z += vz * tHit;
    y = floor + rad;
    const vImpact = vy - G * tHit;
    vy = -vImpact * 0.38;
    vx *= 0.55;
    vz *= 0.55;
    tt -= tHit;
    spinT += tHit * (bounce === 0 ? 1 : 0.5);
    if (vy < 0.35) break;
  }
  // slide to rest
  const k = 5;
  const d = (1 - Math.exp(-k * tt)) / k;
  return {x: x + vx * d, y: floor + rad, z: z + vz * d, spinT: spinT + d * 0.4};
};

export const KibbleBurst: React.FC<KibbleBurstProps> = ({
  progress, origin = [0, 0.3, 0], count = 160, seed = 1, spread = 0.8, up = 2.6, duration = 2.4, direction = [0, 0],
  floorY = 0, size = KIBBLE.size, sourceRadius = 0.07, outline = PROP_INK.hair, ...rest
}) => {
  const parts = useMemo(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const r = (k: number) => rand(`kb-${seed}-${i}-${k}`);
      const a = r(0) * Math.PI * 2;
      const u = 0.25 + 0.75 * Math.sqrt(r(1));
      const hs = spread * 1.25 * u;
      const vUp = up * (0.55 + 0.75 * r(2));
      const sa = r(3) * Math.PI * 2, sr = sourceRadius * Math.sqrt(r(4));
      arr.push({
        x: origin[0] + Math.cos(sa) * sr, y: origin[1] + (r(5) - 0.5) * sourceRadius * 0.6, z: origin[2] + Math.sin(sa) * sr,
        vx: Math.cos(a) * hs + direction[0], vy: vUp, vz: Math.sin(a) * hs + direction[1],
        sx: (r(6) - 0.5) * 30, sy: (r(7) - 0.5) * 30, sz: (r(8) - 0.5) * 30,
        r0: [r(9) * 6, r(10) * 6, r(11) * 6], s: 0.8 + 0.4 * r(12), c: Math.floor(r(13) * 5),
      });
    }
    return arr;
  }, [count, seed, spread, up, direction[0], direction[1], origin[0], origin[1], origin[2], sourceRadius]);

  const t = Math.max(0, progress) * duration;
  const items: KibbleItem[] = parts.map((p) => {
    const s = simulate(p, t, floorY, size * 0.62 * p.s);
    return {
      p: [s.x, s.y, s.z],
      r: [p.r0[0] + p.sx * s.spinT, p.r0[1] + p.sy * s.spinT, p.r0[2] + p.sz * s.spinT],
      s: size * p.s,
      c: p.c,
    };
  });
  return <KibbleField items={items} capacity={count} outline={outline} {...rest} />;
};

// ---------------------------------------------------------------------------------------------------------------------
// Pile
// ---------------------------------------------------------------------------------------------------------------------

export type KibblePileProps = GroupProps & {
  /** number of nuggets (default: auto from the footprint area) */
  count?: number;
  /** disc radius (m) — ignored when footprint is given */
  radius?: number;
  /** mound height above y=0 (m) */
  height?: number;
  /** rectangular heap [width, depth] instead of a disc */
  footprint?: [number, number];
  seed?: number | string;
  size?: number;
  outline?: number | false;
};

/** Pure: transforms for a static kibble mound. */
export const pileItems = (count: number, radius: number, height: number, seed: number | string, size: number, footprint?: [number, number]): KibbleItem[] => {
  const items: KibbleItem[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: number) => rand(`kp-${seed}-${i}-${k}`);
    let x: number, z: number, n: number;
    if (footprint) {
      x = (r(0) - 0.5) * footprint[0];
      z = (r(1) - 0.5) * footprint[1];
      const nx = (2 * x) / footprint[0], nz = (2 * z) / footprint[1];
      n = Math.max(Math.abs(nx) ** 3, Math.abs(nz) ** 3);
      n = Math.sqrt(Math.min(1, nx * nx * 0.5 + nz * nz * 0.5 + n * 0.5));
    } else {
      const a = r(0) * Math.PI * 2, rr = radius * Math.sqrt(r(1));
      x = Math.cos(a) * rr;
      z = Math.sin(a) * rr;
      n = rr / Math.max(1e-6, radius);
    }
    const mound = height * Math.max(0, 1 - n * n);
    // the outer shell of the mound is what is seen; bias pieces toward the surface
    const depth = 0.8 + 0.2 * r(2);
    const s = 0.8 + 0.4 * r(3);
    items.push({
      p: [x, size * 0.55 * s + mound * depth, z],
      r: [(r(4) - 0.5) * 1.4, r(5) * 6.3, (r(6) - 0.5) * 1.4],
      s: size * s,
      c: Math.floor(r(7) * 5),
    });
  }
  return items;
};

let moundGeo: THREE.BufferGeometry | null = null;
/** unit paraboloid y = 1 - r² (matches the piece distribution so edge pieces are never buried) */
const moundGeometry = () => {
  if (!moundGeo) {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 8; i++) {
      const r = 1 - i / 8;
      pts.push(new THREE.Vector2(r, 1 - r * r));
    }
    moundGeo = new THREE.LatheGeometry(pts, 20);
  }
  return moundGeo;
};

/** Enough nuggets to cover a mound of this footprint about 1.4× over. */
export const autoKibbleCount = (radius: number, footprint?: [number, number], size = KIBBLE.size) => {
  const area = footprint ? footprint[0] * footprint[1] : Math.PI * radius * radius;
  return Math.max(6, Math.min(700, Math.round((area / (Math.PI * size * size)) * 1.4)));
};

export const KibblePile: React.FC<KibblePileProps> = ({
  count: countProp, radius = 0.12, height = 0.05, footprint, seed = 7, size = KIBBLE.size, outline = PROP_INK.hair, ...rest
}) => {
  const count = countProp ?? autoKibbleCount(radius, footprint, size);
  const items = useMemo(
    () => pileItems(count, radius, height, seed, size, footprint),
    [count, radius, height, seed, size, footprint?.[0], footprint?.[1]],
  );
  // dark filler mound under the surface pieces so gaps never show the floor
  const fx = footprint ? footprint[0] / 2 : radius, fz = footprint ? footprint[1] / 2 : radius;
  return (
    <group {...rest}>
      {count > 0 && height > 0.012 ? (
        <mesh geometry={moundGeometry()} material={glossMat('#4A2410', {spec: 0})} scale={[fx * 0.96, height * 0.8 + size * 0.35, fz * 0.96]} />
      ) : null}
      <KibbleField items={items} capacity={Math.max(1, count)} outline={outline} />
    </group>
  );
};

export default KibbleBurst;
