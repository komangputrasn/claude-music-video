/**
 * Bedroom-set primitives: cel-shaded (toonMat) meshes with EXACT ink outlines for boxes / rounded boxes / cylinders /
 * spheres. (InkMesh's normal-push hull splits at hard box edges; here the hull is the same primitive grown by `ink`
 * metres and drawn back-faced, which is a perfect outline for convex primitives.)
 *
 * Geometries are cached module-wide by their parameters (immutable, shared) so components need no useMemo for them.
 *
 *   <TBox size={[0.5, 0.4, 0.3]} r={0.03} color="#d9b07a" position={[0, 0.2, 0]} />
 *   <TCyl args={[0.05, 0.08, 0.3, 12]} color="#ccc" ink={0.006} />
 *   <TSphere radius={0.1} color="#fff" emissive="#19C6FF" emissiveIntensity={2} ink={false} />
 *
 * Shared defaults: INK (thickness for furniture-sized props) and INK_COLOR (= OUTLINE.color from lib/characters/toon).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {toonMat, OUTLINE, TOON_GRADIENT} from '../../characters/toon';

/** Default outline thickness for furniture-scale props (m). Characters use 0.02. */
export const INK = 0.011;
export const INK_COLOR = OUTLINE.color;

const geoCache = new Map<string, THREE.BufferGeometry>();
const cached = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
};
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

export const geo = {
  box: (w: number, h: number, d: number) => cached(`b${r4(w)},${r4(h)},${r4(d)}`, () => new THREE.BoxGeometry(w, h, d)),
  rbox: (w: number, h: number, d: number, r: number, seg = 2) =>
    cached(`rb${r4(w)},${r4(h)},${r4(d)},${r4(r)},${seg}`, () =>
      new RoundedBoxGeometry(w, h, d, seg, Math.max(0.0005, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)))),
  cyl: (rt: number, rb: number, h: number, seg = 12, open = false) =>
    cached(`c${r4(rt)},${r4(rb)},${r4(h)},${seg},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)),
  sphere: (r: number, ws = 12, hs = 8) => cached(`s${r4(r)},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs)),
  plane: (w: number, h: number) => cached(`p${r4(w)},${r4(h)}`, () => new THREE.PlaneGeometry(w, h)),
  circle: (r: number, seg = 24) => cached(`ci${r4(r)},${seg}`, () => new THREE.CircleGeometry(r, seg)),
  torus: (r: number, tube: number, rs = 8, ts = 16, arc = Math.PI * 2) =>
    cached(`t${r4(r)},${r4(tube)},${rs},${ts},${r4(arc)}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc)),
  /** box whose back face (z-) is scaled to (wb,hb): CRT backs, wedges. Front face (z+) is (wf,hf). Centered. */
  frustum: (wf: number, hf: number, wb: number, hb: number, d: number, yShiftBack = 0) =>
    cached(`f${r4(wf)},${r4(hf)},${r4(wb)},${r4(hb)},${r4(d)},${r4(yShiftBack)}`, () => {
      const g = new THREE.BoxGeometry(1, 1, d);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const front = p.getZ(i) > 0;
        p.setX(i, p.getX(i) * (front ? wf : wb));
        p.setY(i, p.getY(i) * (front ? hf : hb) + (front ? 0 : yShiftBack));
      }
      g.computeVertexNormals();
      return g;
    }),
};

const hullCache = new Map<string, THREE.MeshBasicMaterial>();
/** Back-faced flat ink material for hull outlines. */
export const hullMat = (color: string = INK_COLOR) => {
  let m = hullCache.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({color, side: THREE.BackSide});
    hullCache.set(color, m);
  }
  return m;
};

type Common = Omit<ThreeElements['group'], 'children' | 'args'> & {
  color?: string;
  /** custom material instead of toonMat(color) */
  mat?: THREE.Material;
  emissive?: string;
  emissiveIntensity?: number;
  /** outline thickness (m), false = none */
  ink?: number | false;
  inkColor?: string;
  children?: React.ReactNode;
};

const Body: React.FC<Common & {g: THREE.BufferGeometry; hull: THREE.BufferGeometry | null}> = ({
  g, hull, color = '#ffffff', mat, emissive, emissiveIntensity, inkColor, children, ink: _ink, ...rest
}) => (
  <group {...rest}>
    <mesh geometry={g} material={mat ?? toonMat(color, {emissive, emissiveIntensity})} />
    {hull ? <mesh geometry={hull} material={hullMat(inkColor)} raycast={() => null} /> : null}
    {children}
  </group>
);

/** Toon box (optionally rounded with r) centred on its position, with exact hull outline. */
export const TBox: React.FC<Common & {size: [number, number, number]; r?: number; seg?: number}> = ({size, r = 0, seg = 2, ink = INK, ...rest}) => {
  const [w, h, d] = size;
  const t = ink || 0;
  const g = r > 0 ? geo.rbox(w, h, d, r, seg) : geo.box(w, h, d);
  const hull = t ? (r > 0 ? geo.rbox(w + 2 * t, h + 2 * t, d + 2 * t, r + t, seg) : geo.box(w + 2 * t, h + 2 * t, d + 2 * t)) : null;
  return <Body g={g} hull={hull} {...rest} />;
};

/** Toon cylinder (args like cylinderGeometry: radiusTop, radiusBottom, height, radialSegments). */
export const TCyl: React.FC<Common & {args: [number, number, number, number?]}> = ({args, ink = INK, ...rest}) => {
  const [rt, rb, h, seg = 12] = args;
  const t = ink || 0;
  return <Body g={geo.cyl(rt, rb, h, seg)} hull={t ? geo.cyl(rt + t, rb + t, h + 2 * t, seg) : null} {...rest} />;
};

/** Toon sphere. */
export const TSphere: React.FC<Common & {radius: number; segs?: [number, number]}> = ({radius, segs = [14, 10], ink = INK, ...rest}) => {
  const t = ink || 0;
  return <Body g={geo.sphere(radius, segs[0], segs[1])} hull={t ? geo.sphere(radius + t, segs[0], segs[1]) : null} {...rest} />;
};

/** Toon frustum box (front face wf x hf at +z, back face wb x hb at -z). */
export const TFrustum: React.FC<Common & {front: [number, number]; back: [number, number]; depth: number; yShiftBack?: number}> = ({
  front, back, depth, yShiftBack = 0, ink = INK, ...rest
}) => {
  const t = ink || 0;
  return (
    <Body
      g={geo.frustum(front[0], front[1], back[0], back[1], depth, yShiftBack)}
      hull={t ? geo.frustum(front[0] + 2 * t, front[1] + 2 * t, back[0] + 2 * t, back[1] + 2 * t, depth + 2 * t, yShiftBack) : null}
      {...rest}
    />
  );
};

/** Any custom geometry + toon + optional hull geometry (pass a grown copy) */
export const TGeo: React.FC<Common & {geometry: THREE.BufferGeometry; hull?: THREE.BufferGeometry | null}> = ({geometry, hull = null, ...rest}) => (
  <Body g={geometry} hull={hull} {...rest} />
);

// ---------- small material helpers ----------
const basicCache = new Map<string, THREE.MeshBasicMaterial>();
/** Unlit (glowing) colour. intensity > 1 pushes it over the bloom threshold. Cached. */
export const glowMat = (color: string, intensity = 1, opts: {transparent?: boolean; opacity?: number; additive?: boolean} = {}) => {
  const key = `${color}|${intensity}|${opts.opacity ?? 1}|${opts.additive ? 1 : 0}`;
  let m = basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: true});
    if (opts.transparent || opts.additive || (opts.opacity ?? 1) < 1) {
      m.transparent = true;
      m.opacity = opts.opacity ?? 1;
      m.depthWrite = false;
    }
    if (opts.additive) m.blending = THREE.AdditiveBlending;
    basicCache.set(key, m);
  }
  return m;
};

/** Per-instance unlit glow material whose colour*intensity may animate every frame (no cache growth). */
export const useGlowMat = (color: string, intensity: number, opts: {additive?: boolean; opacity?: number; map?: THREE.Texture} = {}) => {
  const m = useMemo(() => {
    const mm = new THREE.MeshBasicMaterial({map: opts.map ?? null});
    if (opts.additive || opts.opacity !== undefined || opts.map) {
      mm.transparent = true;
      mm.depthWrite = false;
    }
    if (opts.additive) mm.blending = THREE.AdditiveBlending;
    return mm;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.additive, opts.map]);
  useLayoutEffect(() => {
    m.color.set(color).multiplyScalar(intensity);
    if (opts.opacity !== undefined) m.opacity = opts.opacity;
  });
  useLayoutEffect(() => () => m.dispose(), [m]);
  return m;
};

const chromeCache = new Map<string, THREE.MeshStandardMaterial>();
/** Shiny Y2K chrome (needs the Stage env map to look good). */
export const chromeMat = (tint = '#E8ECF4', roughness = 0.22) => {
  const key = `${tint}|${roughness}`;
  let m = chromeCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({color: tint, metalness: 1, roughness});
    chromeCache.set(key, m);
  }
  return m;
};

/** Toon material with a texture map (not cached — build in useMemo). */
export const toonMapMat = (map: THREE.Texture, color = '#ffffff') => new THREE.MeshToonMaterial({color, map, gradientMap: TOON_GRADIENT});

/** Make a canvas + 2D context (browser only). */
export const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return {c, ctx};
};
export const canvasTex = (c: HTMLCanvasElement, opts: {repeat?: [number, number]; srgb?: boolean; aniso?: number} = {}) => {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  t.anisotropy = opts.aniso ?? 8;
  t.needsUpdate = true;
  return t;
};

/** Rounded-rect path helper for canvas drawing. */
export const rrect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};
