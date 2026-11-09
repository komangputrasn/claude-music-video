/**
 * exterior/common — small shared helpers for the exterior sets & vehicles (internal-ish, but exported for reuse).
 *
 *   hash2 / vnoise2 / fbm2       deterministic 2D value noise (pure math, no Math.random)
 *   canvasTex(w, h, draw, opts)   CanvasTexture (sRGB) drawn synchronously with system fonts
 *   glowTex() / ringGlowTex()     cached radial-gradient sprites for additive glows
 *   hullOf(geometry)              smooth-normal copy of a geometry for crack-free inverted-hull ink outlines
 *   <Ink geometry material|color outline/>   mesh + ink outline that works on hard-edged boxes too
 *   boxGeo(w,h,d) / boxGeoM(...)  cached BoxGeometry; *M variant has UVs in metres (for tiling textures)
 *   toonTexMat(color, map)        MeshToonMaterial sharing the lib's 3-band ramp, with a texture
 *   glowMat(color)                cached additive sprite material
 *
 * Usage:
 *   const g = boxGeo(1, 2, 1);
 *   <Ink geometry={g} color="#fff4da" outline={0.03} position={[0, 1, 0]} />
 */
import React, {forwardRef} from 'react';
import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {ThreeElements} from '@react-three/fiber';
import {toonMat, outlineMat, OUTLINE, TOON_GRADIENT} from '../../characters/toon';

// ---------------------------------------------------------------- noise
/** Integer hash -> [0,1). Pure. */
export const hash2 = (x: number, y: number, seed = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
/** Hash of one number -> [0,1). */
export const hash1 = (i: number, seed = 0) => hash2(i, 7919, seed);
const sm = (t: number) => t * t * (3 - 2 * t);
/** Smooth 2D value noise in [-1, 1]. */
export const vnoise2 = (x: number, y: number, seed = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = sm(x - xi), fy = sm(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1;
};
/** Fractal value noise, roughly in [-1, 1]. */
export const fbm2 = (x: number, y: number, seed = 0, octaves = 3) => {
  let s = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += vnoise2(x * f, y * f, seed + i * 31) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return s / norm;
};
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const mixColor = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t)));

// ---------------------------------------------------------------- canvas textures
export type CanvasTexOpts = {repeat?: [number, number]; wrap?: boolean; srgb?: boolean; anisotropy?: number; mipmaps?: boolean};
/** Synchronous canvas texture. `draw` may use the system fonts listed in DESIGN.md. Call inside useMemo. */
export const canvasTex = (
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: CanvasTexOpts = {},
) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.wrap || opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.anisotropy = opts.anisotropy ?? 4;
  if (opts.mipmaps === false) {
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
  }
  t.needsUpdate = true;
  return t;
};

let _glow: THREE.Texture | null = null;
/** Soft radial glow (white centre -> transparent). Cached. */
export const glowTex = () => {
  if (_glow) return _glow;
  _glow = canvasTex(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, {srgb: false});
  return _glow;
};
let _flare: THREE.Texture | null = null;
/** 4-point Y2K sparkle star with soft core. Cached. */
export const sparkleTex = () => {
  if (_flare) return _flare;
  _flare = canvasTex(256, 256, (c, w, h) => {
    const cx = w / 2, cy = h / 2;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, w * 0.22);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter';
    for (const [len, wid, rot] of [[0.5, 0.035, 0], [0.5, 0.035, Math.PI / 2], [0.28, 0.02, Math.PI / 4], [0.28, 0.02, -Math.PI / 4]]) {
      c.save();
      c.translate(cx, cy);
      c.rotate(rot);
      const lg = c.createLinearGradient(-w * len, 0, w * len, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = lg;
      c.beginPath();
      c.moveTo(-w * len, 0);
      c.lineTo(0, -h * wid);
      c.lineTo(w * len, 0);
      c.lineTo(0, h * wid);
      c.closePath();
      c.fill();
      c.restore();
    }
  }, {srgb: false});
  return _flare;
};

const glowMats = new Map<string, THREE.SpriteMaterial>();
/** Cached additive sprite material (glow halo). `kind` 'glow' | 'sparkle'. */
export const glowMat = (color: string, opacity = 1, kind: 'glow' | 'sparkle' = 'glow') => {
  const key = `${color}|${opacity}|${kind}`;
  let m = glowMats.get(key);
  if (!m) {
    m = new THREE.SpriteMaterial({
      map: kind === 'glow' ? glowTex() : sparkleTex(),
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    glowMats.set(key, m);
  }
  return m;
};

// ---------------------------------------------------------------- geometry
const hullCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
/** Copy of `g` with merged positions + averaged normals so an inverted-hull outline has no cracks at hard edges. */
export const hullOf = (g: THREE.BufferGeometry) => {
  let h = hullCache.get(g);
  if (!h) {
    const c = new THREE.BufferGeometry();
    c.setAttribute('position', g.getAttribute('position').clone());
    if (g.index) c.setIndex(g.index.clone());
    const m = mergeVertices(c, 1e-3);
    m.computeVertexNormals();
    h = m;
    hullCache.set(g, h);
  }
  return h;
};

const boxCache = new Map<string, THREE.BoxGeometry>();
/** Cached BoxGeometry. */
export const boxGeo = (w: number, h: number, d: number) => {
  const k = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}`;
  let g = boxCache.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    boxCache.set(k, g);
  }
  return g;
};
const boxMCache = new Map<string, THREE.BoxGeometry>();
/** Cached BoxGeometry whose UVs are in metres (u,v = face size), so a texture with repeat=1/tile tiles at world scale. */
export const boxGeoM = (w: number, h: number, d: number) => {
  const k = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}`;
  let g = boxMCache.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    // face order: +x, -x, +y, -y, +z, -z ; 4 verts each
    const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
    uv.needsUpdate = true;
    boxMCache.set(k, g);
  }
  return g;
};

/** Make a geometry flat-shaded (non-indexed, per-face normals). */
export const flatten = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.computeVertexNormals();
  return n;
};

// ---------------------------------------------------------------- materials
const ttCache = new Map<string, THREE.MeshToonMaterial>();
/** Cel-shaded material with a texture map (cached per color+texture uuid). */
export const toonTexMat = (color: string, map: THREE.Texture, opts: {emissive?: string; emissiveIntensity?: number} = {}) => {
  const k = `${color}|${map.uuid}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? 0}`;
  let m = ttCache.get(k);
  if (!m) {
    m = new THREE.MeshToonMaterial({color, map, gradientMap: TOON_GRADIENT});
    if (opts.emissive) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    ttCache.set(k, m);
  }
  return m;
};
const emCache = new Map<string, THREE.MeshBasicMaterial>();
/** Unlit glowing material (neon tubes, bulbs). intensity > 1 blooms. */
export const neonMat = (color: string, intensity = 3) => {
  const k = `${color}|${intensity}`;
  let m = emCache.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: true});
    emCache.set(k, m);
  }
  return m;
};

// ---------------------------------------------------------------- <Ink>
type MeshProps = ThreeElements['mesh'];
export type InkProps = Omit<MeshProps, 'material' | 'geometry' | 'children'> & {
  geometry: THREE.BufferGeometry;
  material?: THREE.Material;
  color?: string;
  /** outline thickness (object-space metres); 0/false = none */
  outline?: number | false;
  outlineColor?: string;
  children?: React.ReactNode;
};
/** Mesh + crack-free ink outline (uses hullOf). */
export const Ink = forwardRef<THREE.Mesh, InkProps>(function Ink(
  {geometry, material, color = '#ffffff', outline = OUTLINE.thickness, outlineColor = OUTLINE.color, children, ...rest},
  ref,
) {
  return (
    <mesh ref={ref} geometry={geometry} material={material ?? toonMat(color)} {...rest}>
      {outline ? <mesh geometry={hullOf(geometry)} material={outlineMat(outline, outlineColor)} raycast={() => null} /> : null}
      {children}
    </mesh>
  );
});

/** Additive glow sprite (always faces camera). */
export const Glow: React.FC<{position?: [number, number, number]; size?: number | [number, number]; color?: string; opacity?: number; kind?: 'glow' | 'sparkle'}> = ({
  position = [0, 0, 0], size = 1, color = '#ffffff', opacity = 1, kind = 'glow',
}) => {
  if (opacity <= 0.001) return null;
  const s: [number, number, number] = typeof size === 'number' ? [size, size, 1] : [size[0], size[1], 1];
  return <sprite position={position} scale={s} material={glowMat(color, Math.round(opacity * 100) / 100, kind)} renderOrder={10} />;
};

const instOutlineCache = new Map<string, THREE.ShaderMaterial>();
/** Inverted-hull outline material that also works on InstancedMesh (use with hullOf(geometry)). */
export const instOutlineMat = (thickness = OUTLINE.thickness, color = OUTLINE.color) => {
  const k = `${thickness}|${color}`;
  let m = instOutlineCache.get(k);
  if (!m) {
    m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {uT: {value: thickness}, uC: {value: new THREE.Color(color)}},
      vertexShader: `uniform float uT; void main(){ vec4 p = vec4(position + normalize(normal) * uT, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * p; }`,
      fragmentShader: `uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }`,
    });
    instOutlineCache.set(k, m);
  }
  return m;
};

/** Additive volumetric light-cone material for an open CylinderGeometry whose top (uv.y = 1) is at the light.
 *  Fades toward the far end and toward grazing edges. Set `uniforms.uI.value` (intensity) per frame in useLayoutEffect. */
export const lightConeMat = (color: string, intensity = 0.3) =>
  new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uI;
      varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        float d = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        float edge = d * sqrt(d + 1e-4);
        float y = clamp(vY, 0.0, 1.0);
        float a = clamp(edge * y * y * uI, 0.0, 4.0);
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
    uniforms: {uColor: {value: new THREE.Color(color)}, uI: {value: intensity}},
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
