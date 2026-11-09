/**
 * sets/shared — internals shared by the sets module (TERMS cut). No components here.
 *
 *   prng(seed)                 deterministic mulberry32 PRNG (pure function of the seed; never Math.random)
 *   hash01(a, b?, c?)          deterministic integer hash → 0..1 (per-instance jitter, lit windows)
 *   concreteTex()              cached tileable board-formed concrete (plywood panels 1.2×0.6 m, tie holes, runoff
 *                              stains, grain). 1024² = WALL_TILE × WALL_TILE metres. Grey only. sRGB.
 *   floorTex()                 cached tileable polished floor concrete with saw-cut joints every FLOOR_TILE/2 metres
 *   blindsTex()                cached vertical-slat pattern for distant (other cells') windows
 *   glowTex()                  cached soft radial white gradient (additive glow cards)
 *   stencilTex(text, opts)     cached canvas stencil (bone/white on transparent) + aspect; SFONTS only
 *   wbox(w,h,d,pos,tile,rot?)  BoxGeometry with WORLD-SCALED UVs (texture density constant across boxes), translated
 *   mergeBoxes(list)           merge many geometries into one (one draw call per material)
 *   concreteMat({...})         cached MeshStandardMaterial (concrete map + self-lit `ambient` via emissiveMap; `sky`
 *                              shades the self-lit term per face so volumes read without lights). STATIC use only.
 *   useConcreteMat({...})      hook: per-instance version whose inputs may change every frame (no cache growth)
 *   makeConcreteMat({...})     uncached factory
 *   SetPiece helpers: V3, GroupProps.
 *
 * Units: metres, +Y up. All textures are generated once (module-level cache) and never redrawn per frame.
 */
import {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {SFONTS} from '../palette';

export type V3 = [number, number, number];
export type GroupProps = Omit<ThreeElements['group'], 'children'>;

/** metres covered by one repeat of concreteTex() */
export const WALL_TILE = 4.8;
/** metres covered by one repeat of floorTex() (joints every FLOOR_TILE / 2) */
export const FLOOR_TILE = 2.4;

// ------------------------------------------------------------------------------------------------ randomness
export const prng = (seed: number) => {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hash01 = (a: number, b = 0, c = 0) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

// ------------------------------------------------------------------------------------------------ canvas helpers
const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return {c, g: c.getContext('2d')!};
};

const toTex = (c: HTMLCanvasElement, srgb = true, repeat = true) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};

/** add per-pixel grain (±amp, grey) */
const grain = (g: CanvasRenderingContext2D, w: number, h: number, amp: number, seed: number) => {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const r = prng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 2 * amp;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  g.putImageData(img, 0, 0);
};

/** soft blob, drawn wrapped so the texture tiles */
const blobWrapped = (g: CanvasRenderingContext2D, S: number, x: number, y: number, r: number, rgba: string, rgba0: string) => {
  for (const ox of [-S, 0, S]) {
    for (const oy of [-S, 0, S]) {
      const cx = x + ox, cy = y + oy;
      if (cx + r < 0 || cx - r > S || cy + r < 0 || cy - r > S) continue;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, rgba);
      gr.addColorStop(1, rgba0);
      g.fillStyle = gr;
      g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
  }
};

// ------------------------------------------------------------------------------------------------ concrete
let _concrete: THREE.CanvasTexture | null = null;
/** Board-formed (plywood) concrete: 1024 px = WALL_TILE (4.8 m). Panels 1.2 × 0.6 m, tie holes on a 0.6 m grid. */
export const concreteTex = () => {
  if (_concrete) return _concrete;
  const N = 1024;
  const ppm = N / WALL_TILE;
  const {c, g} = makeCanvas(N, N);
  const r = prng(7);
  g.fillStyle = '#bdbdbd';
  g.fillRect(0, 0, N, N);
  // large mottling
  for (let i = 0; i < 160; i++) {
    const dark = r() < 0.55;
    const a = 0.03 + r() * 0.07;
    blobWrapped(g, N, r() * N, r() * N, 30 + r() * 160, dark ? `rgba(40,40,40,${a})` : `rgba(255,255,255,${a})`, 'rgba(128,128,128,0)');
  }
  // per-panel tone (plywood sheets absorb differently)
  const pw = 1.2 * ppm, ph = 0.6 * ppm;
  for (let py = 0; py < N / ph; py++) {
    for (let px = 0; px < N / pw; px++) {
      const k = r();
      g.fillStyle = k < 0.5 ? `rgba(0,0,0,${0.02 + 0.06 * r()})` : `rgba(255,255,255,${0.02 + 0.05 * r()})`;
      g.fillRect(px * pw, py * ph, pw, ph);
      // faint wood-grain streaks inside the panel
      g.strokeStyle = 'rgba(0,0,0,0.035)';
      g.lineWidth = 1;
      for (let s = 0; s < 6; s++) {
        const yy = py * ph + r() * ph;
        g.beginPath();
        g.moveTo(px * pw, yy);
        g.bezierCurveTo(px * pw + pw * 0.3, yy + (r() - 0.5) * 8, px * pw + pw * 0.7, yy + (r() - 0.5) * 8, px * pw + pw, yy + (r() - 0.5) * 4);
        g.stroke();
      }
    }
  }
  // runoff stains (vertical, from tie holes and the top)
  for (let i = 0; i < 90; i++) {
    const x = r() * N, y0 = r() * N, len = 40 + r() * 260, w = 2 + r() * 10;
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, `rgba(30,30,30,${0.05 + r() * 0.08})`);
    gr.addColorStop(1, 'rgba(30,30,30,0)');
    g.fillStyle = gr;
    for (const oy of [0, -N]) g.fillRect(x - w / 2, y0 + oy, w, len);
  }
  grain(g, N, N, 14, 11);
  // panel seams: dark line + light lip
  g.lineWidth = 2;
  for (let py = 0; py <= N / ph; py++) {
    const y = Math.round(py * ph);
    g.strokeStyle = 'rgba(20,20,20,0.32)';
    g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.beginPath(); g.moveTo(0, y + 2); g.lineTo(N, y + 2); g.stroke();
  }
  for (let py = 0; py < N / ph; py++) {
    const off = py % 2 === 0 ? 0 : pw / 2; // staggered vertical seams
    for (let px = -1; px <= N / pw; px++) {
      const x = Math.round(px * pw + off);
      g.strokeStyle = 'rgba(20,20,20,0.3)';
      g.beginPath(); g.moveTo(x, py * ph); g.lineTo(x, (py + 1) * ph); g.stroke();
    }
  }
  // tie holes on a 0.6 m grid (offset 0.3 m), with a lighter cone ring and a short drip
  const step = 0.6 * ppm;
  for (let ty = 0; ty < N / step; ty++) {
    for (let tx = 0; tx < N / step; tx++) {
      const x = (tx + 0.5) * step, y = (ty + 0.5) * step;
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(15,15,15,0.75)';
      g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
      if (r() < 0.6) {
        const len = 20 + r() * 90;
        const gr = g.createLinearGradient(0, y, 0, y + len);
        gr.addColorStop(0, 'rgba(20,20,20,0.16)');
        gr.addColorStop(1, 'rgba(20,20,20,0)');
        g.fillStyle = gr;
        g.fillRect(x - 3, y + 4, 6, len);
      }
    }
  }
  _concrete = toTex(c);
  return _concrete;
};

let _floor: THREE.CanvasTexture | null = null;
/** Polished floor concrete: 1024 px = FLOOR_TILE (2.4 m); saw-cut joints every FLOOR_TILE / 2. */
export const floorTex = () => {
  if (_floor) return _floor;
  const N = 1024;
  const {c, g} = makeCanvas(N, N);
  const r = prng(23);
  g.fillStyle = '#b4b4b4';
  g.fillRect(0, 0, N, N);
  for (let i = 0; i < 120; i++) {
    const dark = r() < 0.5;
    const a = 0.03 + r() * 0.08;
    blobWrapped(g, N, r() * N, r() * N, 40 + r() * 220, dark ? `rgba(30,30,30,${a})` : `rgba(255,255,255,${a})`, 'rgba(128,128,128,0)');
  }
  // per-slab tone (4 slabs per tile)
  for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${0.03 + 0.05 * r()})` : `rgba(255,255,255,${0.02 + 0.04 * r()})`;
    g.fillRect(sx * N / 2, sy * N / 2, N / 2, N / 2);
  }
  // aggregate speckle
  for (let i = 0; i < 9000; i++) {
    const v = r();
    g.fillStyle = v < 0.5 ? `rgba(20,20,20,${0.08 + r() * 0.2})` : `rgba(250,250,250,${0.06 + r() * 0.16})`;
    const s = 1 + r() * 2.5;
    g.fillRect(r() * N, r() * N, s, s);
  }
  // scuffs
  g.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(20,20,20,${0.03 + r() * 0.05})`;
    g.lineWidth = 2 + r() * 6;
    const x = r() * N, y = r() * N, a = r() * Math.PI, l = 30 + r() * 140;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  grain(g, N, N, 10, 29);
  // saw-cut joints
  for (const p of [0, N / 2, N]) {
    g.fillStyle = 'rgba(10,10,10,0.55)';
    g.fillRect(p - 2, 0, 4, N);
    g.fillRect(0, p - 2, N, 4);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(p + 2, 0, 2, N);
    g.fillRect(0, p + 2, N, 2);
  }
  _floor = toTex(c);
  return _floor;
};

let _blinds: THREE.CanvasTexture | null = null;
/** Vertical slats seen from outside on other cells' windows (bright gaps over a dark room). Not tiled. */
export const blindsTex = () => {
  if (_blinds) return _blinds;
  const W = 256, H = 128;
  const {c, g} = makeCanvas(W, H);
  g.fillStyle = '#0a0a0a';
  g.fillRect(0, 0, W, H);
  const n = 19;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W;
    const gr = g.createLinearGradient(x, 0, x + W / n, 0);
    gr.addColorStop(0, '#6a6a6a');
    gr.addColorStop(0.55, '#a8a8a8');
    gr.addColorStop(1, '#3a3a3a');
    g.fillStyle = gr;
    g.fillRect(x + 1, 6, W / n - 2.5, H - 6);
  }
  g.fillStyle = '#151515';
  g.fillRect(0, 0, W, 7);
  _blinds = toTex(c, true, false);
  return _blinds;
};

let _glow: THREE.CanvasTexture | null = null;
/** Soft radial white glow (premultiplied-friendly), for additive cards. */
export const glowTex = () => {
  if (_glow) return _glow;
  const {c, g} = makeCanvas(256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  gr.addColorStop(0.65, 'rgba(255,255,255,0.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  _glow = toTex(c, true, false);
  return _glow;
};

let _vgrad: THREE.CanvasTexture | null = null;
/** Vertical soft column (bright centre line fading to the sides and the ends) — doorway/slit/light-strip glow. */
export const columnGlowTex = () => {
  if (_vgrad) return _vgrad;
  const {c, g} = makeCanvas(128, 256);
  const img = g.createImageData(128, 256);
  for (let y = 0; y < 256; y++) {
    const v = (y + 0.5) / 256;
    const ey = Math.min(1, Math.min(v, 1 - v) / 0.18);
    for (let x = 0; x < 128; x++) {
      const u = Math.abs((x + 0.5) / 128 - 0.5) * 2;
      const a = Math.pow(Math.max(0, 1 - u), 2.2) * ey * ey;
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  _vgrad = toTex(c, true, false);
  return _vgrad;
};

const stencilCache = new Map<string, {tex: THREE.CanvasTexture; aspect: number}>();
/**
 * Stencilled serial / lease text (white on transparent; tint it with the material colour). Cached by text+font.
 * Returns the texture and its aspect (width / height) so a plane of height h is `h * aspect` wide.
 */
export const stencilTex = (text: string, opts: {font?: 'mono' | 'futura' | 'futuraCond'; weight?: number; tracking?: number} = {}) => {
  const font = opts.font ?? 'mono';
  const weight = opts.weight ?? 700;
  const tracking = opts.tracking ?? 0.18;
  const key = `${text}|${font}|${weight}|${tracking}`;
  const hit = stencilCache.get(key);
  if (hit) return hit;
  const H = 128;
  const fontCss = `${weight} ${Math.round(H * 0.72)}px ${SFONTS[font]}`;
  const probe = makeCanvas(8, 8).g;
  probe.font = fontCss;
  const chars = [...text.toUpperCase()];
  const track = H * 0.72 * tracking;
  const widths = chars.map((ch) => probe.measureText(ch).width);
  const W = Math.ceil(widths.reduce((a, b) => a + b, 0) + track * Math.max(0, chars.length - 1) + H * 0.3);
  const {c, g} = makeCanvas(W, H);
  g.font = fontCss;
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  let x = H * 0.15;
  chars.forEach((ch, i) => {
    g.fillText(ch, x, H * 0.54);
    x += widths[i] + track;
  });
  // stencil bridges + sprayed edge: knock out thin horizontal gaps and speckle the edges
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = 'rgba(0,0,0,1)';
  g.fillRect(0, Math.round(H * 0.52), W, 3);
  const r = prng(text.length * 31 + 7);
  for (let i = 0; i < W * 0.6; i++) g.fillRect(r() * W, r() * H, 1.5, 1.5);
  g.globalCompositeOperation = 'source-over';
  const out = {tex: toTex(c, true, false), aspect: W / H};
  stencilCache.set(key, out);
  return out;
};

// ------------------------------------------------------------------------------------------------ geometry
/**
 * Box with world-scaled UVs: one texture repeat per `tile` metres on every face, offset by its position so adjacent
 * boxes don't repeat the same patch. `pos` is the box CENTRE. Optional Y rotation (radians) applied before translating.
 */
export const wbox = (w: number, h: number, d: number, pos: V3 = [0, 0, 0], tile = WALL_TILE, rotY = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const spans: [number, number, number, number][] = [
    [d, h, pos[2], pos[1]], [d, h, -pos[2], pos[1]], [w, d, pos[0], -pos[2]], [w, d, pos[0], pos[2]], [w, h, pos[0], pos[1]], [w, h, -pos[0], pos[1]],
  ];
  for (let i = 0; i < uv.count; i++) {
    const f = Math.floor(i / 4);
    const [su, sv, ou, ov] = spans[f];
    uv.setXY(i, (uv.getX(i) * su + ou - su / 2) / tile, (uv.getY(i) * sv + ov - sv / 2) / tile);
  }
  if (rotY) g.rotateY(rotY);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
};

/** Box from min/max corners (world UVs). */
export const wboxMinMax = (min: V3, max: V3, tile = WALL_TILE) =>
  wbox(max[0] - min[0], max[1] - min[1], max[2] - min[2], [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], tile);

export const mergeBoxes = (list: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(list, false)!;
  list.forEach((x) => x.dispose());
  return g;
};

// ------------------------------------------------------------------------------------------------ materials
const matCache = new Map<string, THREE.MeshStandardMaterial>();
export type ConcreteOpts = {
  color?: string;
  /** self-lit term so concrete reads in the dark/fog without lights (0 = pure response to lights) */
  ambient?: number;
  roughness?: number;
  kind?: 'wall' | 'floor';
  side?: THREE.Side;
  /** 0..1 directional shading of the self-lit term (sky from above, soft key from +X, fronts darker) → volumes read */
  sky?: number;
};

/** GLSL: multiplies the self-lit (emissive) term by a fixed directional "sky" shading (world normal). */
const SKY_SHADE = /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 swn = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  float sh = 0.55 + 0.45 * max(swn.y, 0.0) - 0.25 * max(-swn.y, 0.0) + 0.25 * swn.x - 0.12 * swn.z;
  totalEmissiveRadiance *= mix(1.0, sh, uSky);
}`;

/** New (uncached) concrete material. `sky` > 0 injects the directional shading of the self-lit term. */
export const makeConcreteMat = ({color = '#5a5e64', ambient = 0.05, roughness = 0.92, kind = 'wall', side = THREE.FrontSide, sky = 0}: ConcreteOpts = {}) => {
  const map = kind === 'floor' ? floorTex() : concreteTex();
  const m = new THREE.MeshStandardMaterial({
    color,
    map,
    roughness,
    metalness: 0,
    emissive: new THREE.Color(color).multiplyScalar(ambient),
    emissiveMap: map,
    side,
  });
  if (sky > 0) {
    const uSky = {value: sky};
    m.userData.uSky = uSky;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSky = uSky;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSky;')
        .replace('#include <emissivemap_fragment>', SKY_SHADE);
    };
    m.customProgramCacheKey = () => 'terms-concrete-sky';
  }
  return m;
};

/** Cached concrete material for STATIC use. Same opts → same instance. Never animate its inputs (each new value would
 *  cache a new material): use useConcreteMat() for anything driven per frame. */
export const concreteMat = (opts: ConcreteOpts = {}) => {
  const {color = '#5a5e64', ambient = 0.05, roughness = 0.92, kind = 'wall', side = THREE.FrontSide, sky = 0} = opts;
  const key = `${color}|${ambient}|${roughness}|${kind}|${side}|${sky}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  const m = makeConcreteMat(opts);
  matCache.set(key, m);
  return m;
};

/** Per-instance concrete material whose colour / ambient / roughness / sky can change every frame for free. */
export const useConcreteMat = ({color = '#5a5e64', ambient = 0.05, roughness = 0.92, kind = 'wall', side = THREE.FrontSide, sky = 0}: ConcreteOpts = {}) => {
  const skyOn = sky > 0;
  const m = useMemo(() => makeConcreteMat({kind, side, sky: skyOn ? 1 : 0}), [kind, side, skyOn]);
  useLayoutEffect(() => () => m.dispose(), [m]);
  useLayoutEffect(() => {
    m.color.set(color);
    m.emissive.set(color).multiplyScalar(ambient);
    m.roughness = roughness;
    if (m.userData.uSky) m.userData.uSky.value = sky;
  });
  return m;
};

const basicCache = new Map<string, THREE.MeshBasicMaterial>();
/** Cached flat unlit material (void/ash shapes, emissive panels). HDR via intensity. */
export const flatMat = (color: string, intensity = 1, fog = true) => {
  const key = `${color}|${intensity}|${fog}`;
  const hit = basicCache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(intensity), fog});
  basicCache.set(key, m);
  return m;
};
