/**
 * Shared internals for the Y2K FX kit (fx/*). Procedural textures (no assets, no canvas fonts), instanced quad
 * geometry builders, and GLSL snippets. Everything is deterministic and cached.
 *
 * API
 *   fxAtlas(): THREE.DataTexture   512x512 mask atlas, 2x2 cells: ATLAS.dot (soft glow), ATLAS.star (4-point glint),
 *                                  ATLAS.hex (lens ghost), ATLAS.ring (halo ring). Use GLSL_ATLAS's atlasUv(uv, cell).
 *   quadInstances(count, attrs)    InstancedBufferGeometry: a [-1,1] quad + per-instance attributes {name: [itemSize, Float32Array]}
 *   Y2K_FX_COLORS                  default sparkle/confetti colour list
 *   GLSL_HASH, GLSL_ATLAS          GLSL helper chunks
 *   GroupProps                     <group> props type for spreading
 */
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';

export type GroupProps = Omit<ThreeElements['group'], 'children'>;

export const Y2K_FX_COLORS = ['#FFFFFF', '#BFF3FF', '#19C6FF', '#FF4FB8', '#9BFF3A', '#FF8A1E', '#8A4DFF', '#FFE14D'] as const;

export const ATLAS = {dot: 0, star: 1, hex: 2, ring: 3} as const;

let atlas: THREE.DataTexture | null = null;
/** Procedural 2x2 mask atlas (R=G=B=A=mask). */
export const fxAtlas = (): THREE.DataTexture => {
  if (atlas) return atlas;
  const C = 256, N = C * 2;
  const data = new Uint8Array(N * N * 4);
  const sat = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (a: number, b: number, x: number) => {
    const t = sat((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const ray = (u: number, v: number, len: number, w: number) => {
    const a = Math.abs(u) / len;
    if (a >= 1) return 0;
    const ww = w * (0.18 + 0.82 * (1 - a));
    return Math.exp(-(v * v) / (ww * ww)) * Math.pow(1 - a, 2.4);
  };
  const cells: ((x: number, y: number) => number)[] = [
    // dot: soft glow
    (x, y) => {
      const r2 = x * x + y * y;
      return sat((Math.exp(-r2 * 5) - Math.exp(-5)) / (1 - Math.exp(-5))) * 0.75 + Math.exp(-r2 * 40) * 0.25;
    },
    // star: 4-point glint with faint diagonals and a hot core
    (x, y) => {
      const r2 = x * x + y * y;
      const core = Math.exp(-r2 * 90) + 0.4 * Math.exp(-r2 * 14);
      const main = ray(x, y, 0.98, 0.05) + ray(y, x, 0.98, 0.05);
      const d1 = (x + y) * Math.SQRT1_2, d2 = (x - y) * Math.SQRT1_2;
      const diag = 0.35 * (ray(d1, d2, 0.42, 0.035) + ray(d2, d1, 0.42, 0.035));
      return sat(core + main + diag);
    },
    // hex ghost: soft hexagon, brighter rim
    (x, y) => {
      const ax = Math.abs(x), ay = Math.abs(y);
      const d = Math.max(ax * 0.866 + ay * 0.5, ay);
      const fill = smooth(0.86, 0.8, d);
      return fill * (0.45 + 0.55 * smooth(0.5, 0.82, d));
    },
    // ring halo
    (x, y) => {
      const r = Math.sqrt(x * x + y * y);
      return Math.exp(-Math.pow((r - 0.78) / 0.07, 2)) * 0.9 + Math.exp(-Math.pow((r - 0.78) / 0.2, 2)) * 0.25;
    },
  ];
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2) * C, oy = Math.floor(cell / 2) * C;
    const f = cells[cell];
    for (let j = 0; j < C; j++) {
      for (let i = 0; i < C; i++) {
        const x = ((i + 0.5) / C) * 2 - 1, y = ((j + 0.5) / C) * 2 - 1;
        // fade to zero at the cell border so mips don't bleed
        const edge = smooth(1.0, 0.94, Math.max(Math.abs(x), Math.abs(y)));
        const v = Math.round(sat(f(x, y) * edge) * 255);
        const k = ((oy + j) * N + ox + i) * 4;
        data[k] = data[k + 1] = data[k + 2] = data[k + 3] = v;
      }
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  atlas = t;
  return t;
};

/** Instanced quad ([-1,1]^2, uv 0..1) with per-instance float attributes. */
export const quadInstances = (count: number, attrs: Record<string, [number, Float32Array]>) => {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  for (const [name, [size, arr]] of Object.entries(attrs)) g.setAttribute(name, new THREE.InstancedBufferAttribute(arr, size));
  g.instanceCount = count;
  return g;
};

/** Streak quad: x in {-1,1} = side, y in {0,1} = head(0)->tail(1). */
export const streakInstances = (count: number, attrs: Record<string, [number, Float32Array]>) => {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  for (const [name, [size, arr]] of Object.entries(attrs)) g.setAttribute(name, new THREE.InstancedBufferAttribute(arr, size));
  g.instanceCount = count;
  return g;
};

export const GLSL_HASH = /* glsl */ `
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

export const GLSL_ATLAS = /* glsl */ `
vec2 atlasUv(vec2 uv, float cell) { vec2 o = vec2(mod(cell, 2.0), floor(cell / 2.0)); return (o + uv) * 0.5; }
`;

/**
 * Velocity-stretched camera-facing capsule billboards (rain, warp stars, sparks).
 * Call streakPosition(head, tail, widthMetres) (object space). Needs uniforms uMinPx (min width in px) and uViewH
 * (viewport height px) — see streakUniforms(). Outputs varyings vSide, vAlong, vLen, vW, vEnergy.
 */
export const GLSL_STREAK_VERT = /* glsl */ `
uniform float uMinPx;
uniform float uViewH;
varying float vSide;
varying float vAlong;
varying float vLen;
varying float vW;
varying float vEnergy;
vec4 streakPosition(vec3 head, vec3 tail, float w0) {
  vec3 hv = (modelViewMatrix * vec4(head, 1.0)).xyz;
  vec3 tv = (modelViewMatrix * vec4(tail, 1.0)).xyz;
  vec3 c = mix(hv, tv, position.y);
  // keep at least uMinPx pixels wide (no sub-pixel aliasing), dimming to conserve energy
  float px = max(-hv.z, 0.01) * 2.0 / (projectionMatrix[1][1] * uViewH);
  float w = max(w0 * length(modelMatrix[0].xyz), px * uMinPx);
  vEnergy = clamp(w0 * length(modelMatrix[0].xyz) / w, 0.12, 1.0);
  vec3 vd = normalize(c);
  vec3 along = tv - hv;
  vec3 ax = along - vd * dot(along, vd);
  float al = length(ax);
  vec3 dir = al > 1e-5 ? ax / al : vec3(0.0, 1.0, 0.0);
  vec3 side = normalize(cross(vd, dir));
  float ext = (position.y * 2.0 - 1.0) * w;
  vec3 p = c + side * position.x * w + dir * ext;
  vSide = position.x;
  vLen = al;
  vW = w;
  vAlong = position.y * al + ext;
  return projectionMatrix * vec4(p, 1.0);
}
`;
export const GLSL_STREAK_FRAG = /* glsl */ `
varying float vSide;
varying float vAlong;
varying float vLen;
varying float vW;
varying float vEnergy;
/** soft capsule mask, head bright, tail fading to tailK */
float streakMask(float tailK) {
  float dy = max(0.0, -vAlong) + max(0.0, vAlong - vLen);
  float d = length(vec2(vSide * vW, dy)) / max(vW, 1e-6);
  float m = exp(-d * d * 3.0);
  float t = clamp(vAlong / max(vLen, 1e-5), 0.0, 1.0);
  return m * mix(1.0, tailK, t) * vEnergy;
}
`;

/** uniforms required by GLSL_STREAK_VERT */
export const streakUniforms = () => ({uMinPx: {value: 1.2}, uViewH: {value: 1080}});
