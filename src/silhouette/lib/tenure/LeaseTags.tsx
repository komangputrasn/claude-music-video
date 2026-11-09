/**
 * <LeaseTags> — small glowing red lease tags (a little rectangle with an iris dot, a lease number and a bar code)
 * scattered over facades and objects: "every object is tagged", "millions of lease tags glowing on the buildings"
 * (Pre), "a wall of red lease tags goes dark one by one" (Swing). Thousands in ONE instanced draw call; all animation
 * runs in the shader from uniforms (no per-frame attribute uploads).
 *
 *   <LeaseTags positions?={Float32Array|number[]|[x,y,z][]} facing?={yaw[]} grid?={{width, height, cols, rows, fill, jitter}}
 *              scatter?={{size: [w, h, d]}} count?={500} seed?={0} time?={t}
 *              offFrom?={Infinity} offTo? offOrder?="random" offJitter?={0.25} onFrom?={-Infinity} onTo?
 *              flicker?={0.15} intensity?={1.6} size?={0.6} minPx?={1.6} billboard?={false} color?={S.authRed}
 *              fog?={0.75} outDur?={0.45} {...group}/>
 *
 *   Placement (local space, origin = whatever your positions use; tags face +Z unless `facing`/`billboard`):
 *     positions  explicit centres (flat xyz array or tuples); facing = per-tag yaw (rad, about +Y) for other facades.
 *     grid       a building face on the plane z=0: x ∈ [-width/2, width/2], y ∈ [0, height] (origin base centre),
 *                cols×rows jittered cells, `fill` fraction occupied (default 0.8). Same as leaseTagGrid().
 *     scatter    `count` tags in a box of `size` centred on the origin (y from 0) — use billboard for free volumes.
 *     Helpers: leaseTagGrid(opts), leaseTagScatter(opts), leaseTagBox({width, depth, height, density}) (4 facades of a
 *     building, with yaw), mergeTagSets(...sets) → {positions, facing}. Pass the result as positions/facing.
 *   Going dark one by one: each tag i dies at a deterministic time in [offFrom, offTo] (seconds, same clock as `time`)
 *     ordered by `offOrder`: 'random' | 'left' | 'right' | 'up' (bottom first) | 'down' (top first) | 'centre' (outward)
 *     mixed with `offJitter` randomness; it stutters for `outDur` s on the way out and leaves a brief afterglow.
 *     onFrom/onTo: the same in reverse (tags light up one by one with a short stutter).
 *   flicker     0..1 fraction of tags with an idle buzz (failing ballasts).
 *   size        tag width in metres (aspect 4:1). minPx keeps far tags as ≥ minPx glowing dots (energy-scaled) so a city
 *               of tags reads as a field of red points instead of shimmering away.
 *   intensity   ≤ 2 (red above that turns orange under ACES).
 *
 * Also exported: LEASE_TAG_ASPECT (4), makeLeaseTagAtlas(), leaseTagsLit(time, offFrom, offTo, onFrom?, onTo?) → 0..1 lit
 * fraction (dim the haze that belongs to a wall as it goes dark).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {S} from '../palette';
import {fontCss, makeCanvas, canvasTexture, stream, fogUniforms, TENURE_HASH_GLSL, TENURE_FOG_GLSL} from './shared';
import {leaseNumber} from './terms';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

export const LEASE_TAG_ASPECT = 4;
const ACOLS = 4;
const AROWS = 8;

let atlasCache: THREE.CanvasTexture | null = null;
/** 4×8 atlas of tag variants (white-on-black mask, linear). Shared by every <LeaseTags>; never disposed. */
export const makeLeaseTagAtlas = () => {
  if (atlasCache) return atlasCache;
  const cw = 256;
  const chh = 64;
  const c = makeCanvas(cw * ACOLS, chh * AROWS);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  const rnd = stream('lease-atlas');
  for (let j = 0; j < AROWS; j++) {
    for (let i = 0; i < ACOLS; i++) {
      const x = i * cw;
      const y = j * chh;
      const k = j * ACOLS + i;
      // body + border
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x + 6, y + 6, cw - 12, chh - 12);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 6, y + 6, cw - 12, chh - 12);
      // iris dot
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + 32, y + chh / 2, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x + 32, y + chh / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      // lease number
      ctx.fillStyle = '#fff';
      ctx.font = fontCss('mono', 30, 700);
      ctx.textBaseline = 'middle';
      ctx.fillText(k === 0 ? leaseNumber() : leaseNumber(`tag${k}`), x + 54, y + chh / 2 + 1);
      // bar code
      let bx = x + 196;
      while (bx < x + cw - 14) {
        const bw = 2 + Math.floor(rnd() * 4);
        if (rnd() > 0.35) ctx.fillRect(bx, y + 16, bw, chh - 32);
        bx += bw + 2;
      }
    }
  }
  atlasCache = canvasTexture(c, {srgb: false});
  return atlasCache;
};

// ------------------------------------------------------------------------------------------------ layout helpers
export type TagSet = {positions: Float32Array; facing?: Float32Array};
export type TagGridOpts = {width?: number; height?: number; cols?: number; rows?: number; fill?: number; jitter?: number; z?: number; x?: number; y?: number; seed?: number | string};

/** Tags on a building face (plane z, origin base centre). */
export const leaseTagGrid = (o: TagGridOpts = {}): Float32Array => {
  const {width = 20, height = 60, cols = 20, rows = 60, fill = 0.8, jitter = 0.25, z = 0, x = 0, y = 0, seed = 0} = o;
  const r = stream(`grid-${seed}`);
  const cw = width / cols;
  const rh = height / rows;
  const out: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = r();
      const b = r();
      const c = r();
      if (a > fill) continue;
      out.push(x - width / 2 + (i + 0.5 + (b - 0.5) * jitter) * cw, y + (j + 0.5 + (c - 0.5) * jitter) * rh, z);
    }
  }
  return new Float32Array(out);
};

/** `count` tags in a box [w, h, d] centred on x/z, y ∈ [0, h]. */
export const leaseTagScatter = (o: {size?: [number, number, number]; count?: number; seed?: number | string} = {}): Float32Array => {
  const [w, h, d] = o.size ?? [40, 20, 40];
  const n = o.count ?? 500;
  const r = stream(`scatter-${o.seed ?? 0}`);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    out[i * 3] = (r() - 0.5) * w;
    out[i * 3 + 1] = r() * h;
    out[i * 3 + 2] = (r() - 0.5) * d;
  }
  return out;
};

/** Tags on the 4 facades of a box building (origin base centre). density = tags per m² of facade. */
export const leaseTagBox = (o: {width?: number; depth?: number; height?: number; density?: number; fill?: number; seed?: number | string; x?: number; z?: number}): TagSet => {
  const {width = 20, depth = 20, height = 60, density = 0.15, fill = 0.85, seed = 0, x = 0, z = 0} = o;
  const sides: {len: number; yaw: number; off: [number, number]}[] = [
    {len: width, yaw: 0, off: [0, depth / 2]},
    {len: width, yaw: Math.PI, off: [0, -depth / 2]},
    {len: depth, yaw: Math.PI / 2, off: [width / 2, 0]},
    {len: depth, yaw: -Math.PI / 2, off: [-width / 2, 0]},
  ];
  const pos: number[] = [];
  const yaw: number[] = [];
  sides.forEach((s, k) => {
    const pitch = 1 / Math.sqrt(Math.max(1e-4, density));
    const cols = Math.max(1, Math.round(s.len / pitch));
    const rows = Math.max(1, Math.round(height / pitch));
    const g = leaseTagGrid({width: s.len, height, cols, rows, fill, seed: `${seed}-${k}`});
    const cy = Math.cos(s.yaw);
    const sy = Math.sin(s.yaw);
    for (let i = 0; i < g.length; i += 3) {
      const lx = g[i];
      const lz = 0.04;
      pos.push(x + s.off[0] + lx * cy + lz * sy, g[i + 1], z + s.off[1] - lx * sy + lz * cy);
      yaw.push(s.yaw);
    }
  });
  return {positions: new Float32Array(pos), facing: new Float32Array(yaw)};
};

export const mergeTagSets = (...sets: TagSet[]): TagSet => {
  const n = sets.reduce((a, s) => a + s.positions.length, 0);
  const positions = new Float32Array(n);
  const facing = new Float32Array(n / 3);
  let o = 0;
  for (const s of sets) {
    positions.set(s.positions, o);
    if (s.facing) facing.set(s.facing, o / 3);
    o += s.positions.length;
  }
  return {positions, facing};
};

/**
 * Fraction (0..1) of tags still lit at `time` for an offFrom→offTo / onFrom→onTo schedule (uniform order assumption).
 * Use it to dim haze/spill that belongs to a tag wall as it goes dark.
 */
export const leaseTagsLit = (time: number, offFrom = Infinity, offTo = offFrom, onFrom = -Infinity, onTo = onFrom) => {
  const on = onTo > onFrom ? Math.max(0, Math.min(1, (time - onFrom) / (onTo - onFrom))) : time >= onFrom ? 1 : 0;
  const off = offTo > offFrom ? Math.max(0, Math.min(1, (time - offFrom) / (offTo - offFrom))) : time >= offFrom ? 1 : 0;
  return Math.max(0, on - off);
};

// ------------------------------------------------------------------------------------------------ shader
const VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aData;   // x atlas cell, y off-order, z on-order, w rnd
attribute vec2 aExtra;  // x scale, y yaw
uniform float uTime, uSize, uMinPx, uViewH, uBillboard, uOffFrom, uOffTo, uOnFrom, uOnTo, uFlicker, uOutDur;
varying vec2 vUv;
varying float vCell;
varying float vBright;
#include <common>
#include <fog_pars_vertex>
${TENURE_HASH_GLSL}
void main() {
  vUv = uv;
  vCell = aData.x;
  float rnd = aData.w;
  float tOn = mix(uOnFrom, uOnTo, aData.z);
  float tOff = mix(uOffFrom, uOffTo, aData.y);
  float b = 1.0;
  float sOn = (uTime - tOn) / 0.3;
  if (sOn < 0.0) b = 0.0;
  else if (sOn < 1.0) b = step(0.45, tHash(floor(uTime * 24.0) + rnd * 311.0)) * (0.5 + 0.5 * sOn);
  float sOff = (uTime - (tOff - uOutDur)) / uOutDur;
  if (sOff >= 1.0) b *= max(0.0, 1.0 - (uTime - tOff) / 0.3) * 0.22;
  else if (sOff > 0.0) b *= step(sOff * 0.8, tHash(floor(uTime * 20.0) + rnd * 173.0)) * (1.0 - 0.35 * sOff);
  if (fract(rnd * 7.31) < uFlicker * 0.4) b *= 0.3 + 0.7 * step(0.14, tHash(floor(uTime * 14.0) + rnd * 91.0));
  b *= 0.75 + 0.5 * fract(rnd * 13.7);
  float s = uSize * aExtra.x;
  vec4 mvC = modelViewMatrix * vec4(aPos, 1.0);
  float dist = max(-mvC.z, 1e-3);
  float px = s * 0.25 * projectionMatrix[1][1] * 0.5 * uViewH / dist;
  float k = max(1.0, uMinPx / max(px, 1e-4));
  b *= pow(k, -0.9);
  vBright = b;
  vec2 q = position.xy * s * k;
  vec4 mvPosition;
  if (uBillboard > 0.5) {
    mvPosition = mvC + vec4(q, 0.0, 0.0);
  } else {
    float cy = cos(aExtra.y), sy = sin(aExtra.y);
    mvPosition = modelViewMatrix * vec4(aPos + vec3(q.x * cy, q.y, -q.x * sy), 1.0);
  }
  gl_Position = projectionMatrix * mvPosition;
  if (b < 0.002) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uColor;
uniform float uFog;
varying vec2 vUv;
varying float vCell;
varying float vBright;
#include <common>
#include <fog_pars_fragment>
${TENURE_FOG_GLSL}
void main() {
  vec2 cell = vec2(mod(vCell, ${ACOLS}.0), floor(vCell / ${ACOLS}.0));
  vec2 auv = (cell + clamp(vUv, 0.01, 0.99)) / vec2(${ACOLS}.0, ${AROWS}.0);
  float m = texture2D(uAtlas, auv).r;
  vec3 col = uColor * m * vBright * (1.0 - tFogF() * uFog);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const QUAD = new THREE.PlaneGeometry(1, 1 / LEASE_TAG_ASPECT);

export type OffOrder = 'random' | 'left' | 'right' | 'up' | 'down' | 'centre';

export type LeaseTagsProps = GroupProps & {
  positions?: Float32Array | number[] | [number, number, number][];
  facing?: ArrayLike<number>;
  grid?: TagGridOpts;
  scatter?: {size?: [number, number, number]};
  count?: number;
  seed?: number | string;
  time?: number;
  offFrom?: number;
  offTo?: number;
  offOrder?: OffOrder;
  offJitter?: number;
  onFrom?: number;
  onTo?: number;
  flicker?: number;
  intensity?: number;
  size?: number;
  minPx?: number;
  billboard?: boolean;
  color?: string;
  fog?: number;
  outDur?: number;
  renderOrder?: number;
};

const toFlat = (p: LeaseTagsProps['positions']): Float32Array | null => {
  if (!p) return null;
  if (p instanceof Float32Array) return p;
  if (p.length && Array.isArray(p[0])) return new Float32Array((p as [number, number, number][]).flat());
  return new Float32Array(p as number[]);
};

export const LeaseTags: React.FC<LeaseTagsProps> = ({
  positions, facing, grid, scatter, count = 500, seed = 0, time = 0, offFrom = 1e9, offTo, offOrder = 'random', offJitter = 0.25,
  onFrom = -1e9, onTo, flicker = 0.15, intensity = 1.6, size = 0.6, minPx = 1.6, billboard = false, color = S.authRed, fog = 0.75,
  outDur = 0.45, renderOrder, ...group
}) => {
  const viewH = useThree((s) => s.size.height * s.viewport.dpr);
  // geometry: rebuilt only when the layout inputs change
  const gridKey = JSON.stringify([grid ?? null, scatter ?? null, count, seed]);
  const pos = useMemo(() => {
    const flat = toFlat(positions);
    if (flat) return flat;
    if (grid) return leaseTagGrid({seed, ...grid});
    return leaseTagScatter({size: scatter?.size, count, seed});
  }, [positions, gridKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Math.floor(pos.length / 3);
  const geo = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    // clone the base quad's buffers: disposing this geometry must not delete buffers another instance still uses
    g.index = QUAD.index!.clone();
    g.setAttribute('position', QUAD.getAttribute('position').clone());
    g.setAttribute('uv', QUAD.getAttribute('uv').clone());
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
    const data = new Float32Array(n * 4);
    const extra = new Float32Array(n * 2);
    const r = stream(`tags-${seed}`);
    for (let i = 0; i < n; i++) {
      data[i * 4] = Math.floor(r() * ACOLS * AROWS);
      data[i * 4 + 1] = r();
      data[i * 4 + 2] = r();
      data[i * 4 + 3] = r();
      extra[i * 2] = 0.85 + 0.3 * r();
      extra[i * 2 + 1] = facing ? facing[i] ?? 0 : 0;
    }
    g.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
    g.setAttribute('aExtra', new THREE.InstancedBufferAttribute(extra, 2));
    g.instanceCount = n;
    return g;
  }, [pos, facing, seed, n]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  // off order (directional sweeps) → rewrite aData.y only when the order changes
  useMemo(() => {
    const data = geo.getAttribute('aData') as THREE.InstancedBufferAttribute;
    const arr = data.array as Float32Array;
    if (offOrder === 'random') {
      const r = stream(`tags-off-${seed}`);
      for (let i = 0; i < n; i++) arr[i * 4 + 1] = r();
    } else {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, cx = 0, cy = 0;
      for (let i = 0; i < n; i++) {
        const x = pos[i * 3], y = pos[i * 3 + 1];
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        cx += x; cy += y;
      }
      cx /= Math.max(1, n); cy /= Math.max(1, n);
      const dx = Math.max(1e-6, x1 - x0), dy = Math.max(1e-6, y1 - y0);
      const rmax = Math.hypot(Math.max(x1 - cx, cx - x0), Math.max(y1 - cy, cy - y0)) || 1;
      const r = stream(`tags-off-${seed}`);
      for (let i = 0; i < n; i++) {
        const x = pos[i * 3], y = pos[i * 3 + 1];
        const d = offOrder === 'left' ? (x - x0) / dx : offOrder === 'right' ? (x1 - x) / dx : offOrder === 'up' ? (y - y0) / dy
          : offOrder === 'down' ? (y1 - y) / dy : Math.hypot(x - cx, y - cy) / rmax;
        arr[i * 4 + 1] = Math.max(0, Math.min(1, d * (1 - offJitter) + r() * offJitter));
      }
    }
    data.needsUpdate = true;
  }, [geo, offOrder, offJitter]); // eslint-disable-line react-hooks/exhaustive-deps

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...fogUniforms(),
          uAtlas: {value: makeLeaseTagAtlas()},
          uColor: {value: new THREE.Color()},
          uTime: {value: 0},
          uSize: {value: 0.6},
          uMinPx: {value: 1.6},
          uViewH: {value: 1080},
          uBillboard: {value: 0},
          uOffFrom: {value: 1e9},
          uOffTo: {value: 1e9},
          uOnFrom: {value: -1e9},
          uOnTo: {value: -1e9},
          uFlicker: {value: 0.15},
          uOutDur: {value: 0.45},
          uFog: {value: 0.75},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        fog: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uColor.value.set(color).multiplyScalar(intensity);
    u.uTime.value = time;
    u.uSize.value = size;
    u.uMinPx.value = minPx;
    u.uViewH.value = viewH;
    u.uBillboard.value = billboard ? 1 : 0;
    u.uOffFrom.value = offFrom;
    u.uOffTo.value = offTo ?? offFrom;
    u.uOnFrom.value = onFrom;
    u.uOnTo.value = onTo ?? onFrom;
    u.uFlicker.value = flicker;
    u.uOutDur.value = outDur;
    u.uFog.value = fog;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={renderOrder} userData={{silKeep: true}} />
    </group>
  );
};
