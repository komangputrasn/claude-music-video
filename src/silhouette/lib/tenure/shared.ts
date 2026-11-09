/**
 * tenure/shared — helpers used by every TENURE component (and exported for scene builders who need the same look):
 *
 *   TFont                       'futura' (signage) | 'futuraCond' (tall letters) | 'mono' (legal, serials)
 *   fontCss(font, px, weight?)  CSS font string from SFONTS (system fonts only — never downloads anything)
 *   makeCanvas(w, h)            HTMLCanvasElement
 *   trackedWidth / drawTracked  manual letter-spacing (wide-tracked uppercase), deterministic on every Chromium
 *   canvasTexture(c, opts)      THREE.CanvasTexture with sane filtering (mipmaps + anisotropy; srgb or linear mask)
 *   stream(seed)                fast seeded PRNG () => [0,1), seeded from rand() of src/lib/time (deterministic)
 *   hashStr(s)                  stable 32-bit string hash (default seeds from text)
 *   TENURE_HASH_GLSL            tHash/tHash2/tNoise (vertex or fragment)
 *   TENURE_GLSL                 + tPixelGrid (anti-moiré LED grid), tScan (anti-moiré scanlines) — fragment only (fwidth)
 *   TENURE_FOG_GLSL             tFogF(): 0..1 fog factor of the current fragment (needs <fog_pars_fragment>)
 *   fogUniforms()               clone of THREE.UniformsLib.fog for custom ShaderMaterials (set material.fog = true)
 *
 * Emissive TENURE materials do not mix toward the fog colour like paint: they are ATTENUATED by the fog (light dies in
 * haze) by `fog` 0..1, so a red sign 80 m away is a dim red sign, not a grey one.
 */
import * as THREE from 'three';
import {SFONTS} from '../palette';
import {rand} from '../../../lib/time';

export type TFont = 'futura' | 'futuraCond' | 'mono';

export const fontCss = (font: TFont, px: number, weight?: number | string) =>
  `${weight ?? (font === 'mono' ? 400 : 500)} ${Math.max(1, Math.round(px * 100) / 100)}px ${SFONTS[font]}`;

export const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

const chars = (s: string) => Array.from(s);

/** Width of `text` drawn with an extra `track` px between characters (ctx.font must be set). */
export const trackedWidth = (ctx: CanvasRenderingContext2D, text: string, track: number) => {
  const g = chars(text);
  let w = 0;
  for (const ch of g) w += ctx.measureText(ch).width;
  return w + track * Math.max(0, g.length - 1);
};

/**
 * Draw `text` with manual tracking. `align` is relative to x. `limit` = draw only the first N characters (layout is
 * still computed for the whole string, so revealed letters appear in their final place). Returns the full width.
 */
export const drawTracked = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  track: number,
  align: 'left' | 'center' | 'right' = 'left',
  limit = Infinity,
) => {
  const w = trackedWidth(ctx, text, track);
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  let k = 0;
  for (const ch of chars(text)) {
    if (k++ >= limit) break;
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + track;
  }
  ctx.textAlign = prev;
  return w;
};

export type TexOpts = {srgb?: boolean; mipmaps?: boolean; repeatX?: boolean; repeatY?: boolean; anisotropy?: number};

export const canvasTexture = (c: HTMLCanvasElement, o: TexOpts = {}) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.generateMipmaps = o.mipmaps !== false;
  t.minFilter = o.mipmaps !== false ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = o.anisotropy ?? 8;
  if (o.repeatX) t.wrapS = THREE.RepeatWrapping;
  if (o.repeatY) t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
};

/** Seeded PRNG stream (mulberry32 seeded from rand(seed)). Deterministic; use for thousands of instances. */
export const stream = (seed: string | number) => {
  let a = Math.floor(rand(`tenure-stream-${seed}`) * 4294967296) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const fogUniforms = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);

/** hash + value noise; safe in vertex AND fragment shaders */
export const TENURE_HASH_GLSL = /* glsl */ `
float tHash(float n) { return fract(sin(n) * 43758.5453123); }
float tHash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float tNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = tHash2(i), b = tHash2(i + vec2(1.0, 0.0)), c = tHash2(i + vec2(0.0, 1.0)), d = tHash2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`;

/** TENURE_HASH_GLSL + tPixelGrid / tScan (these use fwidth: FRAGMENT shaders only) */
export const TENURE_GLSL = /* glsl */ `
${TENURE_HASH_GLSL}
// LED / pixel grid multiplier in [1-amp, 1]: dark gaps between square cells. Fades to its mean once a cell is smaller
// than ~3 px on screen, so a giant screen at long-lens distance never moirés.
float tPixelGrid(vec2 cells, float amp) {
  vec2 w = fwidth(cells);
  vec2 f = abs(fract(cells) - 0.5) * 2.0;
  vec2 g = 1.0 - smoothstep(vec2(0.62) - w, vec2(0.96) + w, f);
  float v = g.x * g.y;
  float fade = 1.0 - smoothstep(0.16, 0.42, max(w.x, w.y));
  return 1.0 - amp * (1.0 - mix(0.72, v, fade));
}
// horizontal scanlines (period 1 in y units) multiplier in [1-amp, 1], anti-moiré
float tScan(float y, float amp) {
  float w = fwidth(y);
  float v = 0.5 + 0.5 * cos(6.2831853 * y);
  float fade = 1.0 - smoothstep(0.18, 0.45, w);
  return 1.0 - amp * (1.0 - mix(0.5, v, fade));
}`;

/** Needs <fog_pars_fragment> above it. */
export const TENURE_FOG_GLSL = /* glsl */ `
float tFogF() {
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

/** Basic vertex shader with vUv, vWorld (world position) and fog depth. */
export const BASIC_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
