/**
 * atmos/shared — internals shared by the atmosphere module (no components here).
 *
 *   atmosNoise(seed?)     cached, seeded, TILEABLE 256² RGBA noise texture (RepeatWrapping, mipmapped, NoColorSpace):
 *                           R = domain-warped billowy fbm (fog / smoke)      G = mid-frequency fbm (detail, ripples)
 *                           B = low-frequency blobs (puddles, big haze)      A = fine grain (concrete, sparkle)
 *                         Each channel is contrast-stretched to 0..1. Pure function of `seed` (no Math.random).
 *   GLSL_ATMOS_FOG        GLSL: `float atmosFogAmount()` = 0..1 scene-fog factor at this fragment (needs the material's
 *                         `fog: true`, THREE.UniformsLib.fog uniforms and #include <fog_pars_vertex>/<fog_vertex>).
 *                         Additive lights multiply by (1 - k·fog) instead of mixing toward the fog colour.
 *   GLSL_BILLBOARD        GLSL: `vec4 atmosBillboard(vec3 centre, vec2 corner, float sizeM, out float energy)` —
 *                         camera-facing quad, at least uMinPx pixels wide (needs uniforms uViewH, uMinPx); `energy`
 *                         (0..1) dims sub-pixel particles so they don't sparkle/alias.
 *   blendOf(mode)         'normal' | 'additive' → THREE blending constant.
 *   GroupProps, V3        prop helper types.
 */
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';

export type GroupProps = Omit<ThreeElements['group'], 'children'>;
export type V3 = [number, number, number];
export type AtmosBlend = 'normal' | 'additive';

export const blendOf = (b: AtmosBlend) => (b === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending);

// ------------------------------------------------------------------------------------------------ noise texture
const hash3 = (x: number, y: number, s: number) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** periodic value noise; (x, y) in lattice units, period in cells */
const vnoise = (x: number, y: number, period: number, seed: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
  const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
  const a = hash3(x0, y0, seed), b = hash3(x1, y0, seed), c = hash3(x0, y1, seed), d = hash3(x1, y1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

/** tileable fbm over the unit square: (x, y) in [0,1) (any real works, it wraps) */
const fbm = (x: number, y: number, basePeriod: number, octaves: number, seed: number) => {
  let sum = 0, amp = 0.5, norm = 0, p = basePeriod;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x * p, y * p, p, seed * 31 + o * 7 + 1);
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return sum / norm;
};

const noiseCache = new Map<number, THREE.DataTexture>();

export const atmosNoise = (seed = 1): THREE.DataTexture => {
  const hit = noiseCache.get(seed);
  if (hit) return hit;
  const N = 256;
  const ch = [new Float32Array(N * N), new Float32Array(N * N), new Float32Array(N * N), new Float32Array(N * N)];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = i / N, y = j / N, k = j * N + i;
      // domain-warped billows (smoke-like)
      const wx = fbm(x, y, 3, 3, seed + 11), wy = fbm(x + 0.37, y + 0.71, 3, 3, seed + 23);
      ch[0][k] = fbm(x + 0.45 * (wx - 0.5), y + 0.45 * (wy - 0.5), 4, 5, seed + 1);
      ch[1][k] = fbm(x, y, 8, 4, seed + 2);
      ch[2][k] = fbm(x, y, 2, 4, seed + 3);
      ch[3][k] = fbm(x, y, 32, 2, seed + 4);
    }
  }
  const data = new Uint8Array(N * N * 4);
  for (let c = 0; c < 4; c++) {
    const a = ch[c];
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < a.length; k++) {
      if (a[k] < lo) lo = a[k];
      if (a[k] > hi) hi = a[k];
    }
    const span = hi - lo || 1;
    for (let k = 0; k < a.length; k++) data[k * 4 + c] = Math.round(((a[k] - lo) / span) * 255);
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  noiseCache.set(seed, t);
  return t;
};

// ------------------------------------------------------------------------------------------------ GLSL snippets
export const GLSL_ATMOS_FOG = /* glsl */ `
float atmosFogAmount() {
#ifdef USE_FOG
  #ifdef FOG_EXP2
  return 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
  return smoothstep(fogNear, fogFar, vFogDepth);
  #endif
#else
  return 0.0;
#endif
}`;

export const GLSL_BILLBOARD = /* glsl */ `
uniform float uViewH;
uniform float uMinPx;
vec4 atmosBillboard(vec3 centre, vec2 corner, float sizeM, out float energy, out float viewDepth) {
  vec4 mv = modelViewMatrix * vec4(centre, 1.0);
  viewDepth = -mv.z;
  float mpp = max(-mv.z, 0.01) * 2.0 / (projectionMatrix[1][1] * uViewH);
  float s = max(sizeM, mpp * uMinPx);
  float k = sizeM / s;
  energy = clamp(k * k, 0.04, 1.0);
  mv.xy += corner * s;
  return mv;
}`;

/** standard fog uniforms + extras, cloned */
export const withFog = (u: Record<string, THREE.IUniform>) => THREE.UniformsUtils.merge([THREE.UniformsLib.fog, u]);

export const toV3 = (v: THREE.Vector3Tuple | THREE.Vector3): V3 => (Array.isArray(v) ? [v[0], v[1], v[2]] : [v.x, v.y, v.z]);
