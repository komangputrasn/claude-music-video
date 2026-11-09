/**
 * Y2K materials — the chrome-and-candy look of an early-2000s music video. All factories are CACHED (same args ->
 * same material instance), so never mutate a returned material; call `createY2KMat()` (uncached) or `.clone()` when
 * you need per-instance animated uniforms.
 *
 * WHY a custom shader: plain `metalness: 1` chrome looks dull/dark on flat front faces. The Y2K look is a stylised
 * "reflection" that never depends on scene lights: a generated HDR matcap (sky -> hot white horizon -> dark ground,
 * softbox glints, a pink/aqua rim) for curved surfaces, plus — for extruded text — a classic WordArt vertical face
 * gradient baked per letter (see ChromeText). Values above 1 feed the <Stage> bloom, so horizons/glints glow.
 * Works identically under every <Stage env>, in instanced meshes and with fog.
 *
 * API
 *   Y2K_PRESETS: readonly Y2KPreset[]   'chrome' | 'gold' | 'blue' | 'ruby' | 'sunset' | 'candy' | 'aqua' | 'iridescent'
 *   y2kMat(preset, opts?)               cached matcap-style material for any mesh (spheres, props, instanced stars)
 *   wordArtMat(preset, opts?)           cached text variant (needs the aGradX/aGradY attributes ChromeText bakes)
 *   createY2KMat(preset, opts?)         UNCACHED version of either (opts.text) for per-instance uniform animation
 *   setY2KUniforms(mat, u)              set brightness/opacity/shine/rim/... on a material from createY2KMat
 *   chromeMat(opts?) goldMat(opts?)     shortcuts for y2kMat('chrome' | 'gold')
 *   gelButtonMat(color?, opts?)         glossy Aqua-gel (dark top, white gloss, glowing bottom) — best on pills/spheres
 *   iridescentMat(opts?)                holographic pastel-rainbow chrome
 *   candyPlastic(color?, opts?)         translucent glossy iMac-style plastic (MeshPhysical, reacts to lights + env)
 *   glowMat(color, intensity?)          unlit HDR colour for bloom (neon, LEDs, screens)
 *   lowPolyMat(color, opts?)            flat-shaded PS2-style standard material
 *   metalMat(color?, roughness?)        PBR metal that uses the Stage env (when you want real env reflections)
 *   hullMat(thickness, color?, glow?)   inverted-hull outline / aura (object-space thickness, HDR glow)
 *   matcapTexture(preset, color?) faceGradientTexture(preset, color?)   the generated HDR textures
 *   isMetalPreset(preset)               chrome/gold/blue/ruby/sunset (colour = cheap tint uniform; candy/aqua colour
 *                                       bakes a texture, so don't animate it)
 *   CANDY: iMac candy colours {bondi, tangerine, grape, lime, strawberry, blueberry, sage, graphite}
 *
 * Opts (Y2KMatOpts): {color?: tint / base colour; tint?: 0..1 tint amount for metals; brightness?: 1; rim?: css colour;
 *   rimAmount?: 0.35; opacity?: 1; side?: THREE.Side; iri?: 0..1 rainbow amount}
 *
 * Usage
 *   import {chromeMat, gelButtonMat, candyPlastic, glowMat} from '../lib/three/materials';
 *   <mesh material={chromeMat()}><sphereGeometry args={[0.5, 48, 32]} /></mesh>
 *   <mesh material={gelButtonMat(C.aqua)}><capsuleGeometry args={[0.2, 0.8, 8, 24]} /></mesh>
 *   <mesh material={candyPlastic(CANDY.bondi)}><boxGeometry /></mesh>
 *   <mesh material={glowMat('#19C6FF', 3)}><torusGeometry args={[1, 0.02, 8, 64]} /></mesh>
 */
import * as THREE from 'three';

export type Y2KPreset = 'chrome' | 'gold' | 'blue' | 'ruby' | 'sunset' | 'candy' | 'aqua' | 'iridescent';
export const Y2K_PRESETS: readonly Y2KPreset[] = ['chrome', 'gold', 'blue', 'ruby', 'sunset', 'candy', 'aqua', 'iridescent'];

/** iMac-G3-era candy plastic colours. */
export const CANDY = {
  bondi: '#0FA8C4',
  tangerine: '#FF8A1E',
  grape: '#7A3FD0',
  lime: '#8FE03A',
  strawberry: '#FF3E7A',
  blueberry: '#2E6CFF',
  sage: '#9FD8B0',
  graphite: '#5A6070',
} as const;

export type Y2KMatOpts = {
  /** metals: tint colour (mixed by `tint`); candy/aqua: base colour */
  color?: string;
  /** 0..1 how strongly `color` tints metal presets (default 0.65 when color given) */
  tint?: number;
  brightness?: number;
  /** fresnel rim colour (css) */
  rim?: string;
  rimAmount?: number;
  opacity?: number;
  side?: THREE.Side;
  /** 0..1 live rainbow hue shift amount (iridescent preset defaults to 0.75) */
  iri?: number;
};

// ---------------------------------------------------------------------------------------------------------------
// colour helpers (linear working space; THREE.Color converts css/hex sRGB -> linear)
type RGB = [number, number, number];
type Stop = [number, string, number?]; // [t, css colour, intensity multiplier]
const lin = (css: string, k = 1): RGB => {
  const c = new THREE.Color(css);
  return [c.r * k, c.g * k, c.b * k];
};
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const addRGB = (a: RGB, b: RGB, k = 1): RGB => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mulRGB = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const sat = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const stopsFn = (stops: Stop[]) => {
  const cols = stops.map((s) => lin(s[1], s[2] ?? 1));
  return (t: number): RGB => {
    if (t <= stops[0][0]) return cols[0];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t <= stops[i + 1][0]) return mixRGB(cols[i], cols[i + 1], (t - stops[i][0]) / Math.max(1e-6, stops[i + 1][0] - stops[i][0]));
    }
    return cols[cols.length - 1];
  };
};
const hsl = (h: number, s: number, l: number): string => `hsl(${((h % 1) + 1) % 1 * 360}, ${s * 100}%, ${l * 100}%)`;
const lighten = (css: string, l: number) => {
  const c = new THREE.Color(css);
  const o = {h: 0, s: 0, l: 0};
  c.getHSL(o, THREE.SRGBColorSpace);
  return hsl(o.h, Math.min(1, o.s * 1.05), Math.min(0.97, o.l + (1 - o.l) * l));
};
const darken = (css: string, d: number) => {
  const c = new THREE.Color(css);
  const o = {h: 0, s: 0, l: 0};
  c.getHSL(o, THREE.SRGBColorSpace);
  return hsl(o.h, Math.min(1, o.s * 1.1), o.l * (1 - d));
};
const norm3 = (x: number, y: number, z: number): RGB => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};
const dot3 = (a: RGB, b: RGB) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ---------------------------------------------------------------------------------------------------------------
// preset definitions. `face` = WordArt face gradient, t: 0 = bottom of capitals, 1 = top. Metals derive their
// matcap environment from the same gradient so spheres and letters match.
type MetalSpec = {kind: 'metal'; face: Stop[]; rimA: string; rimB: string; rimAmt: number; box: string; boxK: number};
type Spec = MetalSpec | {kind: 'candy' | 'aqua' | 'iridescent'};

const METALS: Record<'chrome' | 'gold' | 'blue' | 'ruby' | 'sunset', MetalSpec> = {
  chrome: {
    kind: 'metal',
    face: [
      [0.0, '#d2def2'], [0.1, '#8d9cbc'], [0.24, '#4a5574'], [0.38, '#1e2440'], [0.47, '#080b18'],
      [0.49, '#ffffff', 1.6], [0.515, '#eef8ff'], [0.58, '#b4dcff'], [0.72, '#6aa4f6'], [0.87, '#3062d6'], [1.0, '#1c3fae'],
    ],
    rimA: '#19C6FF', rimB: '#FF4FB8', rimAmt: 0.5, box: '#ffffff', boxK: 2.2,
  },
  blue: {
    kind: 'metal',
    face: [
      [0.0, '#bdeeff'], [0.12, '#4f8ff8'], [0.28, '#1a48d0'], [0.42, '#0a1f7a'], [0.475, '#040a3a'],
      [0.495, '#ffffff', 1.6], [0.52, '#d0f4ff'], [0.6, '#6cbcff'], [0.76, '#2a6cf4'], [0.9, '#1a50e6'], [1.0, '#1238b8'],
    ],
    rimA: '#BFF3FF', rimB: '#8A4DFF', rimAmt: 0.55, box: '#e8fbff', boxK: 2.0,
  },
  gold: {
    kind: 'metal',
    face: [
      [0.0, '#ffe7a0'], [0.12, '#e0a83a'], [0.27, '#9c5a10'], [0.4, '#5a2c06'], [0.475, '#2e1402'],
      [0.495, '#fffbe6', 1.6], [0.52, '#fff0a8'], [0.6, '#ffd255'], [0.76, '#e49a20'], [0.9, '#b86c12'], [1.0, '#8a4c0c'],
    ],
    rimA: '#FFE9A0', rimB: '#FF8A1E', rimAmt: 0.45, box: '#fff6dc', boxK: 2.0,
  },
  ruby: {
    kind: 'metal',
    face: [
      [0.0, '#ffd2d8'], [0.12, '#f07884'], [0.27, '#b01428'], [0.4, '#540510'], [0.475, '#260106'],
      [0.495, '#ffffff', 1.5], [0.52, '#ffdce2'], [0.6, '#ff8490'], [0.76, '#f42c3e'], [0.9, '#d61c22'], [1.0, '#a00e1c'],
    ],
    rimA: '#FFB0C0', rimB: '#FF4FB8', rimAmt: 0.45, box: '#fff0f2', boxK: 2.0,
  },
  sunset: {
    kind: 'metal',
    face: [
      [0.0, '#ffe7a0'], [0.14, '#ffa040'], [0.29, '#f04c66'], [0.42, '#8a2070'], [0.475, '#3e0c46'],
      [0.495, '#fffbe8', 1.6], [0.52, '#ffe69a'], [0.61, '#ffaa66'], [0.77, '#ff6496'], [0.9, '#c844b4'], [1.0, '#7c34c8'],
    ],
    rimA: '#FFD38A', rimB: '#8A4DFF', rimAmt: 0.5, box: '#fff6e0', boxK: 2.0,
  },
};
/** true for the metal presets (chrome, gold, blue, ruby, sunset) whose `color` is just a tint uniform */
export const isMetalPreset = (p: Y2KPreset) => p in METALS;
const specOf = (p: Y2KPreset): Spec => (p in METALS ? METALS[p as keyof typeof METALS] : {kind: p as 'candy' | 'aqua' | 'iridescent'});
const defaultColor = (p: Y2KPreset) => (p === 'candy' ? '#FF4FB8' : p === 'aqua' ? '#0A6CFF' : undefined);

// ---------------------------------------------------------------------------------------------------------------
// texture generation
const SOFTBOX_A = norm3(-0.55, 0.62, 0.56); // big key softbox, upper-left (in view space, towards camera)
const SOFTBOX_B = norm3(0.92, 0.18, 0.34); // thin strip right
const SOFTBOX_C = norm3(0.25, -0.15, 0.95); // faint fill from the camera

/** environment colour for a reflected view-space direction r */
const metalEnv = (spec: MetalSpec) => {
  const face = stopsFn(spec.face);
  const rimA = lin(spec.rimA), rimB = lin(spec.rimB), box = lin(spec.box, spec.boxK);
  return (r: RGB): RGB => {
    const e = r[1];
    // sky: brighten near horizon; ground: widen the dark band under the horizon (classic chrome ball)
    const t = e >= 0 ? 0.497 + Math.pow(e, 0.6) * 0.503 : 0.497 - Math.pow(-e, 1.5) * 0.497;
    let c = face(t);
    const a = dot3(r, SOFTBOX_A), b = dot3(r, SOFTBOX_B), f = dot3(r, SOFTBOX_C);
    c = addRGB(c, box, smooth(0.955, 0.985, a));
    c = addRGB(c, box, 0.55 * smooth(0.975, 0.992, b));
    c = addRGB(c, box, 0.12 * smooth(0.9, 1.0, f));
    const rim = mixRGB(rimA, rimB, 0.5 + 0.5 * r[0]);
    const w = smooth(-0.3, -0.95, r[2]) * spec.rimAmt * 0.7;
    c = mixRGB(c, mulRGB(rim, 0.9), w);
    return c;
  };
};

/** glossy candy plastic shaded by normal n (view space) */
const candyEnv = (base: string) => {
  const body = lin(base), deep = lin(darken(base, 0.45)), glow = lin(lighten(base, 0.3)), white = lin('#ffffff', 2.0);
  const L = norm3(-0.35, 0.75, 0.55);
  return (n: RGB, r: RGB): RGB => {
    const wrap = sat((dot3(n, L) + 0.35) / 1.35);
    let c = mixRGB(deep, body, wrap);
    c = addRGB(c, glow, 0.55 * smooth(-0.05, -0.9, n[1]) * (0.35 + 0.65 * (1 - n[2]))); // light through the bottom
    c = mulRGB(c, 1 - 0.3 * Math.pow(1 - n[2], 3));
    c = addRGB(c, white, smooth(0.95, 0.982, dot3(r, SOFTBOX_A)));
    c = addRGB(c, white, 0.4 * smooth(0.975, 0.99, dot3(r, SOFTBOX_B)));
    c = addRGB(c, lin('#cfe8ff'), 0.18 * Math.pow(1 - n[2], 2.5));
    return c;
  };
};

/** Aqua gel: dark top, white gloss cap, glowing bottom */
const aquaEnv = (base: string) => {
  const deep = lin(darken(base, 0.55)), mid = lin(base), glow = lin(lighten(base, 0.4), 1.1), white = lin('#ffffff', 1.1);
  return (n: RGB, r: RGB): RGB => {
    const ny = n[1], nx = n[0];
    let c = mixRGB(deep, mid, smooth(0.75, -0.1, ny));
    c = mixRGB(c, glow, smooth(-0.15, -0.92, ny));
    c = mulRGB(c, 0.72 + 0.28 * n[2]);
    // gloss cap, inset from the rim
    const g = smooth(0.3, 0.55, ny) * smooth(0.985, 0.88, ny) * smooth(0.72, 0.45, Math.abs(nx));
    c = mixRGB(c, white, g * (0.35 + 0.5 * smooth(0.4, 0.85, ny)));
    c = addRGB(c, lin('#ffffff', 2), smooth(0.975, 0.99, dot3(r, SOFTBOX_A)) * 0.6);
    return c;
  };
};

const iriEnv = () => {
  const chrome = metalEnv(METALS.chrome);
  return (n: RGB, r: RGB): RGB => {
    const c = chrome(r);
    const l = 0.35 + 0.65 * Math.min(1.6, c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15);
    const h = Math.atan2(n[1], n[0]) / (Math.PI * 2) + (1 - n[2]) * 0.7 + r[1] * 0.25;
    const rb = lin(hsl(h, 0.95, 0.72));
    return mulRGB(mixRGB(rb, [1, 1, 1], 0.18), l * 1.15);
  };
};

const faceStopsFor = (preset: Y2KPreset, color?: string): Stop[] => {
  const s = specOf(preset);
  if (s.kind === 'metal') return s.face;
  const c = color ?? defaultColor(preset) ?? '#ffffff';
  if (preset === 'candy') {
    return [
      [0.0, lighten(c, 0.3)], [0.14, c], [0.42, darken(c, 0.18)], [0.56, darken(c, 0.05)], [0.6, lighten(c, 0.45)],
      [0.68, '#ffffff', 1.25], [0.8, lighten(c, 0.6)], [0.92, lighten(c, 0.15)], [1.0, c],
    ];
  }
  if (preset === 'aqua') {
    return [
      [0.0, lighten(c, 0.62), 1.2], [0.12, lighten(c, 0.3)], [0.3, c], [0.47, darken(c, 0.38)], [0.5, darken(c, 0.25)],
      [0.515, lighten(c, 0.22)], [0.68, lighten(c, 0.42)], [0.86, lighten(c, 0.7)], [1.0, lighten(c, 0.9)],
    ];
  }
  // iridescent: pastel rainbow with a hot horizon
  return [
    [0.0, '#ffe6f6'], [0.14, '#f6a2da'], [0.3, '#a68cf4'], [0.46, '#5464e8'], [0.49, '#ffffff', 1.5],
    [0.52, '#d6fff4'], [0.64, '#86e6fa'], [0.8, '#ffe49a'], [0.92, '#ffa6d2'], [1.0, '#b892ff'],
  ];
};

const toHalfTexture = (data: Float32Array, w: number, h: number) => {
  const half = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(Math.min(60000, data[i]));
  const t = new THREE.DataTexture(half, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace; // values are already linear HDR
  t.needsUpdate = true;
  return t;
};

const texCache = new Map<string, THREE.DataTexture>();

/** HDR WordArt face gradient (N x 1, u = 0 bottom -> 1 top of capitals). */
export const faceGradientTexture = (preset: Y2KPreset, color?: string): THREE.DataTexture => {
  const key = `face|${preset}|${color ?? ''}`;
  let t = texCache.get(key);
  if (!t) {
    const N = 512;
    const f = stopsFn(faceStopsFor(preset, color));
    const d = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      // 3x supersample so the hot horizon edge is anti-aliased
      let r = 0, g = 0, b = 0;
      for (let s = 0; s < 3; s++) {
        const c = f((i + (s + 0.5) / 3) / N);
        r += c[0] / 3; g += c[1] / 3; b += c[2] / 3;
      }
      d.set([r, g, b, 1], i * 4);
    }
    t = toHalfTexture(d, N, 1);
    texCache.set(key, t);
  }
  return t;
};

/** HDR matcap (view-space normal -> colour), 384x384. */
export const matcapTexture = (preset: Y2KPreset, color?: string): THREE.DataTexture => {
  const key = `matcap|${preset}|${color ?? ''}`;
  let t = texCache.get(key);
  if (!t) {
    const N = 384;
    const spec = specOf(preset);
    const c0 = color ?? defaultColor(preset) ?? '#ffffff';
    const env: (n: RGB, r: RGB) => RGB =
      spec.kind === 'metal' ? ((e) => (_n: RGB, r: RGB) => e(r))(metalEnv(spec))
        : spec.kind === 'candy' ? candyEnv(c0)
          : spec.kind === 'aqua' ? aquaEnv(c0)
            : iriEnv();
    const d = new Float32Array(N * N * 4);
    const SS = 2;
    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        let R = 0, G = 0, B = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            let nx = ((px + (sx + 0.5) / SS) / N) * 2 - 1;
            let ny = ((py + (sy + 0.5) / SS) / N) * 2 - 1;
            const rr = nx * nx + ny * ny;
            if (rr > 0.9999) {
              const l = Math.sqrt(rr) / 0.9999;
              nx /= l; ny /= l;
            }
            const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
            const n: RGB = [nx, ny, nz];
            const r: RGB = [2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1];
            const c = env(n, r);
            R += c[0]; G += c[1]; B += c[2];
          }
        }
        const k = 1 / (SS * SS);
        d.set([R * k, G * k, B * k, 1], (py * N + px) * 4);
      }
    }
    t = toHalfTexture(d, N, N);
    texCache.set(key, t);
  }
  return t;
};

// ---------------------------------------------------------------------------------------------------------------
// the shader
const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vN;
varying vec3 vV;
#ifdef USE_GRAD
attribute float aGradX;
attribute float aGradY;
varying vec2 vGrad;
varying float vFront;
#endif
#ifdef USE_INSTANCING_COLOR
varying vec3 vInstColor;
#endif
void main() {
  vec3 objectNormal = normal;
  vec3 transformed = position;
  #ifdef USE_INSTANCING
    objectNormal = mat3(instanceMatrix) * objectNormal;
    transformed = (instanceMatrix * vec4(transformed, 1.0)).xyz;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vInstColor = instanceColor;
  #endif
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  vN = normalize(normalMatrix * objectNormal);
  vV = -mvPosition.xyz;
  #ifdef USE_GRAD
    vGrad = vec2(aGradX, aGradY);
    vFront = normal.z;
  #endif
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uMatcap;
uniform sampler2D uFace;
uniform vec3 uTint;
uniform float uTintAmt;
uniform float uBright;
uniform vec3 uRim;
uniform float uRimAmt;
uniform float uOpacity;
uniform float uSweep;
uniform float uSweepAmt;
uniform float uIri;
uniform float uPhase;
uniform float uFaceShift;
varying vec3 vN;
varying vec3 vV;
#ifdef USE_GRAD
varying vec2 vGrad;
varying float vFront;
#endif
#ifdef USE_INSTANCING_COLOR
varying vec3 vInstColor;
#endif
vec3 hue3(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 v = normalize(vV);
  vec3 ax = normalize(vec3(v.z, 0.0, -v.x));
  vec3 ay = cross(v, ax);
  vec2 muv = vec2(dot(ax, n), dot(ay, n)) * 0.495 + 0.5;
  vec3 col = texture2D(uMatcap, muv).rgb;
  float fres = 1.0 - clamp(dot(n, v), 0.0, 1.0);
  float gx = 0.5;
  float front = 0.0;
  #ifdef USE_GRAD
    front = smoothstep(0.45, 0.97, vFront);
    float t = vGrad.y + (muv.y - 0.5) * uFaceShift;
    vec3 fc = texture2D(uFace, vec2(clamp(t, 0.002, 0.998), 0.5)).rgb;
    col = mix(col, fc, front);
    gx = vGrad.x;
  #endif
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, lum * uTint * 1.25 + col * 0.15, uTintAmt);
  #ifdef USE_INSTANCING_COLOR
    col *= mix(vec3(1.0), vInstColor, 0.85);
  #endif
  if (uIri > 0.0) {
    vec3 rb = mix(hue3(fract(fres * 1.1 + n.y * 0.22 + gx * 0.55 + uPhase)), vec3(1.0), 0.2);
    col = mix(col, (0.18 + min(lum, 1.4) * 0.8) * rb, uIri);
  }
  col += uRim * pow(fres, 2.6) * uRimAmt;
  #ifdef USE_GRAD
    float s = gx - (vGrad.y - 0.5) * 0.12;
    float band = smoothstep(0.05, 0.0, abs(s - uSweep));
    col += vec3(band * band) * uSweepAmt * (0.3 + 0.7 * front);
  #endif
  col *= uBright;
  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export type Y2KUniforms = {
  brightness?: number;
  opacity?: number;
  /** shine sweep position across text 0..1 (WordArt glint); <-0.2 or >1.2 = off */
  shine?: number;
  shineAmount?: number;
  rim?: string;
  rimAmount?: number;
  iri?: number;
  /** iridescent hue phase (animate with time for a holographic shimmer) */
  phase?: number;
  tint?: string;
  tintAmount?: number;
};

/** Uncached Y2K material (matcap / WordArt). Use when you animate its uniforms per instance. */
export const createY2KMat = (preset: Y2KPreset, opts: Y2KMatOpts & {text?: boolean} = {}): THREE.ShaderMaterial => {
  const spec = specOf(preset);
  const isMetal = spec.kind === 'metal';
  const colorParam = isMetal ? undefined : opts.color;
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uMatcap: {value: null},
        uFace: {value: null},
        uTint: {value: new THREE.Color(isMetal && opts.color ? opts.color : '#ffffff')},
        uTintAmt: {value: isMetal && opts.color ? opts.tint ?? 0.65 : 0},
        uBright: {value: opts.brightness ?? 1},
        uRim: {value: new THREE.Color(opts.rim ?? (preset === 'gold' ? '#ffd27a' : preset === 'candy' ? '#ffffff' : '#9fe6ff'))},
        uRimAmt: {value: opts.rimAmount ?? (opts.text ? (isMetal ? 0.35 : 0.25) : 0.15)},
        uOpacity: {value: opts.opacity ?? 1},
        uSweep: {value: -1},
        uSweepAmt: {value: 1.3},
        uIri: {value: opts.iri ?? (preset === 'iridescent' ? 0.6 : 0)},
        uPhase: {value: 0},
        uFaceShift: {value: 0.45},
      },
    ]),
    vertexShader: VERT,
    fragmentShader: FRAG,
    fog: true,
    side: opts.side ?? THREE.FrontSide,
    transparent: (opts.opacity ?? 1) < 1,
    defines: opts.text ? {USE_GRAD: ''} : {},
  });
  // textures are shared (cached) — set after merge so they are not cloned
  m.uniforms.uMatcap.value = matcapTexture(preset, colorParam);
  m.uniforms.uFace.value = faceGradientTexture(preset, colorParam);
  m.name = `y2k-${preset}${opts.text ? '-text' : ''}`;
  return m;
};

/** Set animatable uniforms on a material from createY2KMat()/wordArtMat clone. Call in useLayoutEffect. */
export const setY2KUniforms = (m: THREE.ShaderMaterial, u: Y2KUniforms) => {
  const U = m.uniforms;
  if (!U || !U.uBright) return;
  if (u.brightness !== undefined) U.uBright.value = u.brightness;
  if (u.opacity !== undefined) {
    U.uOpacity.value = u.opacity;
    m.transparent = u.opacity < 1;
  }
  if (u.shine !== undefined) U.uSweep.value = -0.25 + u.shine * 1.5;
  if (u.shineAmount !== undefined) U.uSweepAmt.value = u.shineAmount;
  if (u.rim !== undefined) U.uRim.value.set(u.rim);
  if (u.rimAmount !== undefined) U.uRimAmt.value = u.rimAmount;
  if (u.iri !== undefined) U.uIri.value = u.iri;
  if (u.phase !== undefined) U.uPhase.value = u.phase;
  if (u.tint !== undefined) U.uTint.value.set(u.tint);
  if (u.tintAmount !== undefined) U.uTintAmt.value = u.tintAmount;
};

const matCache = new Map<string, THREE.Material>();
const cached = <T extends THREE.Material>(key: string, make: () => T): T => {
  let m = matCache.get(key) as T | undefined;
  if (!m) {
    m = make();
    matCache.set(key, m);
  }
  return m;
};
const optKey = (o: Y2KMatOpts) => `${o.color ?? ''}|${o.tint ?? ''}|${o.brightness ?? ''}|${o.rim ?? ''}|${o.rimAmount ?? ''}|${o.opacity ?? ''}|${o.side ?? ''}|${o.iri ?? ''}`;

/** Cached Y2K matcap material for any mesh (incl. InstancedMesh, instanceColor tints it). */
export const y2kMat = (preset: Y2KPreset = 'chrome', opts: Y2KMatOpts = {}) =>
  cached(`y2k|${preset}|${optKey(opts)}`, () => createY2KMat(preset, opts));
/** Cached WordArt text material (requires aGradX/aGradY attributes — ChromeText geometry has them). */
export const wordArtMat = (preset: Y2KPreset = 'chrome', opts: Y2KMatOpts = {}) =>
  cached(`wa|${preset}|${optKey(opts)}`, () => createY2KMat(preset, {...opts, text: true}));

/** Bright Y2K chrome (blue sky, hot horizon, dark ground, pink/aqua rim). `color` tints it. */
export const chromeMat = (opts: Y2KMatOpts = {}) => y2kMat('chrome', opts);
/** Polished gold. */
export const goldMat = (opts: Y2KMatOpts = {}) => y2kMat('gold', opts);
/** Glossy Aqua gel (dark top, white gloss cap, glowing bottom). Best on capsules, spheres, big-radius RoundedBoxes. */
export const gelButtonMat = (color: string = '#0A6CFF', opts: Y2KMatOpts = {}) => y2kMat('aqua', {...opts, color});
/** Holographic pastel-rainbow chrome. Animate the shimmer with createY2KMat('iridescent') + setY2KUniforms({phase}). */
export const iridescentMat = (opts: Y2KMatOpts = {}) => y2kMat('iridescent', opts);

/**
 * Translucent glossy candy plastic (iMac G3 / Game Boy Color era). Physically based: reacts to scene lights and the
 * Stage env, see-through via transmission. Use CANDY.* colours.
 */
export const candyPlastic = (color: string = CANDY.bondi, opts: {opacity?: number; transmission?: number; roughness?: number} = {}) =>
  cached(`candy|${color}|${opts.opacity ?? ''}|${opts.transmission ?? ''}|${opts.roughness ?? ''}`, () => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: opts.roughness ?? 0.08,
      metalness: 0,
      transmission: opts.transmission ?? 0.35,
      thickness: 0.35,
      ior: 1.45,
      attenuationColor: new THREE.Color(color),
      attenuationDistance: 0.45,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      specularIntensity: 1,
      sheen: 0.4,
      sheenColor: new THREE.Color(lighten(color, 0.5)),
      envMapIntensity: 1.8,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.18,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
    });
    return m;
  });

/** Unlit HDR colour (intensity > 1 blooms in <Stage>). toneMapped:false for direct (non-composer) renders. */
export const glowMat = (color: string, intensity = 2, opts: {opacity?: number; additive?: boolean; side?: THREE.Side} = {}) =>
  cached(`glow|${color}|${intensity}|${opts.opacity ?? 1}|${opts.additive ? 1 : 0}|${opts.side ?? ''}`, () => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      toneMapped: false,
      transparent: (opts.opacity ?? 1) < 1 || !!opts.additive,
      opacity: opts.opacity ?? 1,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: !opts.additive,
      side: opts.side ?? THREE.FrontSide,
      fog: false,
    });
    return m;
  });

/** Flat-shaded low-poly (PS2 / Dreamcast) material. */
export const lowPolyMat = (color: string, opts: {roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number; vertexColors?: boolean} = {}) =>
  cached(`lowpoly|${color}|${opts.roughness ?? ''}|${opts.metalness ?? ''}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? ''}|${opts.vertexColors ? 1 : 0}`, () =>
    new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: opts.roughness ?? 0.72,
      metalness: opts.metalness ?? 0,
      emissive: new THREE.Color(opts.emissive ?? '#000000'),
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      vertexColors: !!opts.vertexColors,
    }));

/** PBR metal reflecting the Stage env (use when you want the real env, e.g. a chrome car bumper). */
export const metalMat = (color: string = '#e8ecf4', roughness = 0.12) =>
  cached(`metal|${color}|${roughness}`, () => new THREE.MeshStandardMaterial({color, metalness: 1, roughness, envMapIntensity: 1.6}));

/**
 * Inverted-hull outline / aura: back faces pushed out along (smooth) normals by `thickness` (object-space metres).
 * glow > 1 makes it bloom (neon aura). Use with smooth-normal geometry for crack-free outlines.
 */
export const hullMat = (thickness = 0.02, color = '#0a1240', glow = 1, opacity = 1) =>
  cached(`hull|${thickness}|${color}|${glow}|${opacity}`, () =>
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {uT: {value: thickness}, uC: {value: new THREE.Color(color).multiplyScalar(glow)}, uO: {value: opacity}},
      ]),
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        uniform float uT;
        void main() {
          vec3 transformed = position + normalize(normal) * uT;
          #ifdef USE_INSTANCING
            transformed = (instanceMatrix * vec4(transformed, 1.0)).xyz;
          #endif
          vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform vec3 uC; uniform float uO;
        void main() {
          gl_FragColor = vec4(uC, uO);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    }));

/** Resolve a preset name or material (helper for components taking `material?: Y2KPreset | THREE.Material`). */
export const resolveY2KMaterial = (m: Y2KPreset | THREE.Material | undefined, opts: Y2KMatOpts = {}): THREE.Material =>
  m instanceof THREE.Material ? m : y2kMat(m ?? 'chrome', opts);
