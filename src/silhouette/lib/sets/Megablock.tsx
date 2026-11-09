/**
 * <Megablock> — a brutalist concrete tower (DESIGN-silhouette §2, §4): deep recessed window grid (0.7 m fins and
 * spandrel bands), a recessed pilotis podium, a parapet crown with plant boxes. Panes are ONE instanced mesh
 * (dark slatted glass, a few lit bone windows, optionally a single dawnGold warm window).
 *
 *   <Megablock w?={32} h?={96} d?={24} floors?={auto ≈ h/3.4} bays?={auto ≈ w/3.6} litFraction?={0.03} seed?={1}
 *              warmWindow?={false | true | {face?: 'front', bay?, floor?, intensity?: 1.6}}
 *              faces?={['front','back','left','right']} podium?={2} crown?={true} color?={GREYS.g5}
 *              ambient?={1.1} litIntensity?={0.9} litColor?={S.bone} glass?={GREYS.g1} fin?={0.7} {...group}/>
 *
 *   warmWindow   the ONE warm window of the Final crane ("a black city with one warm window") — dawnGold, ONLY in
 *                Final/Outro. `true` picks a default pane on the front face ~60 % up. It never counts as "lit".
 *   litFraction  share of bone-lit windows (keep it low: 0.01–0.05). Lit panes show the slat pattern of the blinds.
 *   ambient      self-lit concrete (× colour, with fixed "sky" shading per face so the volume reads without any
 *                light; 0 = pure black mass for the Final "black city"). Scene lights add on top (MeshStandard).
 *   podium       floors of OPEN undercroft (pilotis + a slim core): backlight passes under the tower (0 = none).
 * Origin: base centre on y = 0; the front face (+Z) is the main facade. Anchors: megablockLayout(props) and
 * megablockPane(props, face, bay, floor) → local centre of a pane (front face +Z, back -Z, left -X, right +X);
 * MEGABLOCK_WARM_DEFAULT. Pure function of props; geometry rebuilt only when dimensions change.
 *
 * <CityGrid> — a deterministic field of brutalist blocks receding into fog for wide / crane shots. ONE instanced draw
 * call for the towers (+ one for their roof plant), windows drawn procedurally in the shader (fwidth-faded to their
 * average colour when sub-pixel, so far blocks never shimmer); fog does the depth.
 *
 *   <CityGrid rows?={8} cols?={8} spacing?={56} seed?={1} height?={[30, 150]} footprint?={[16, 34]} jitter?={0.3}
 *             centreBoost?={0.5} litFraction?={0.02} avoid?={[[x, z, r], …]} floorH?={3.4} bayW?={3.6}
 *             color?={GREYS.g4} glass?={GREYS.g1} litColor?={S.bone} litIntensity?={1} ambient?={1}
 *             shade?={[front, back, left, right] = [0.75, 1, 0.6, 0.9]} crowns?={true} {...group}/>
 *   Grid centred on the origin (x = columns, z = rows). `avoid` removes blocks whose centre is within r of (x, z)
 *   (clear a plaza, a hero Megablock's lot, the camera). cityGridLayout(props) returns the blocks [{x, z, w, d, h, seed}].
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS} from '../palette';
import {wbox, wboxMinMax, mergeBoxes, useConcreteMat, blindsTex, hash01, prng, WALL_TILE} from './shared';
import type {GroupProps, V3} from './shared';

export type MegaFace = 'front' | 'back' | 'left' | 'right';
export type WarmWindow = boolean | {face?: MegaFace; bay?: number; floor?: number; intensity?: number};

export type MegablockProps = GroupProps & {
  w?: number;
  h?: number;
  d?: number;
  floors?: number;
  bays?: number;
  litFraction?: number;
  seed?: number;
  warmWindow?: WarmWindow;
  faces?: MegaFace[];
  podium?: number;
  crown?: boolean;
  color?: string;
  ambient?: number;
  litIntensity?: number;
  litColor?: string;
  glass?: string;
  fin?: number;
};

const FACES: MegaFace[] = ['front', 'back', 'left', 'right'];

/** Derived layout: floor height, bay widths per face, podium height. */
export const megablockLayout = (p: Pick<MegablockProps, 'w' | 'h' | 'd' | 'floors' | 'bays' | 'podium' | 'fin'> = {}) => {
  const w = p.w ?? 32, h = p.h ?? 96, d = p.d ?? 24, fin = p.fin ?? 0.7;
  const podium = p.podium ?? 2;
  const floors = Math.max(2, p.floors ?? Math.round(h / 3.4));
  const fh = h / (floors + 0.6); // crown parapet takes the rest
  const baysX = Math.max(1, p.bays ?? Math.round(w / 3.6));
  const bwX = w / baysX;
  const baysZ = Math.max(1, Math.round(d / bwX));
  const bwZ = d / baysZ;
  return {w, h, d, fin, podium, floors, fh, baysX, bwX, baysZ, bwZ, roof: fh * floors};
};

/** Local centre of a pane + its outward normal (face: front +Z, back -Z, left -X, right +X). */
export const megablockPane = (p: MegablockProps, face: MegaFace, bay: number, floor: number) => {
  const L = megablockLayout(p);
  const along = face === 'front' || face === 'back' ? L.bwX : L.bwZ;
  const nb = face === 'front' || face === 'back' ? L.baysX : L.baysZ;
  const half = (face === 'front' || face === 'back' ? L.w : L.d) / 2;
  const u = -half + (bay + 0.5) * along;
  const y = floor * L.fh + 0.85 + (L.fh - 1.1) / 2;
  const inset = L.fin;
  void nb;
  const n: V3 = face === 'front' ? [0, 0, 1] : face === 'back' ? [0, 0, -1] : face === 'left' ? [-1, 0, 0] : [1, 0, 0];
  const pos: V3 =
    face === 'front' ? [u, y, L.d / 2 - inset] : face === 'back' ? [-u, y, -L.d / 2 + inset] : face === 'left' ? [-L.w / 2 + inset, y, u] : [L.w / 2 - inset, y, -u];
  return {position: pos, normal: n, size: [along - 0.5, L.fh - 1.1] as [number, number]};
};

export const MEGABLOCK_WARM_DEFAULT = (p: MegablockProps) => {
  const L = megablockLayout(p);
  return {face: 'front' as MegaFace, bay: Math.floor(L.baysX / 2) - 1, floor: Math.round(L.floors * 0.58)};
};

const PANE = new THREE.PlaneGeometry(1, 1);

const buildMegablock = (p: MegablockProps) => {
  const L = megablockLayout(p);
  const {w, d, fin, fh, floors, baysX, bwX, baysZ, bwZ, roof} = L;
  const podiumH = Math.min(L.podium, floors - 1) * fh;
  const boxes: THREE.BufferGeometry[] = [];
  const tile = WALL_TILE * 1.5;
  // core (glass line), recessed at the podium
  boxes.push(wboxMinMax([-w / 2 + fin, podiumH, -d / 2 + fin], [w / 2 - fin, roof, d / 2 - fin], tile));
  if (podiumH > 0) {
    // open undercroft: only a slim lift/stair core (light passes under the tower, between the pilotis)
    boxes.push(wboxMinMax([-w * 0.12, 0, -d * 0.18], [w * 0.12, podiumH, d * 0.18], tile));
    // transfer slab
    boxes.push(wboxMinMax([-w / 2, podiumH - 1.1, -d / 2], [w / 2, podiumH + 0.2, d / 2], tile));
    // pilotis: every other bay boundary on front/back, ends on the sides
    for (let i = 0; i <= baysX; i += 2) {
      const x = -w / 2 + i * bwX;
      const cx = Math.max(-w / 2 + 0.6, Math.min(w / 2 - 0.6, x));
      boxes.push(wbox(1.1, podiumH - 1.1, 1.1, [cx, (podiumH - 1.1) / 2, d / 2 - 0.6], tile));
      boxes.push(wbox(1.1, podiumH - 1.1, 1.1, [cx, (podiumH - 1.1) / 2, -d / 2 + 0.6], tile));
    }
  }
  // facade frames: spandrel bands per floor + piers per bay, on all four faces
  for (let f = Math.max(1, Math.round(podiumH / fh)); f <= floors; f++) {
    const y = f * fh;
    boxes.push(wboxMinMax([-w / 2, y - 0.25, d / 2 - fin], [w / 2, y + 0.85, d / 2], tile));
    boxes.push(wboxMinMax([-w / 2, y - 0.25, -d / 2], [w / 2, y + 0.85, -d / 2 + fin], tile));
    boxes.push(wboxMinMax([-w / 2, y - 0.25, -d / 2 + fin], [-w / 2 + fin, y + 0.85, d / 2 - fin], tile));
    boxes.push(wboxMinMax([w / 2 - fin, y - 0.25, -d / 2 + fin], [w / 2, y + 0.85, d / 2 - fin], tile));
  }
  for (let i = 0; i <= baysX; i++) {
    const x = Math.max(-w / 2 + 0.25, Math.min(w / 2 - 0.25, -w / 2 + i * bwX));
    boxes.push(wboxMinMax([x - 0.25, podiumH, d / 2 - fin], [x + 0.25, roof + 1.2, d / 2], tile));
    boxes.push(wboxMinMax([x - 0.25, podiumH, -d / 2], [x + 0.25, roof + 1.2, -d / 2 + fin], tile));
  }
  for (let i = 0; i <= baysZ; i++) {
    const z = Math.max(-d / 2 + 0.25, Math.min(d / 2 - 0.25, -d / 2 + i * bwZ));
    boxes.push(wboxMinMax([-w / 2, podiumH, z - 0.25], [-w / 2 + fin, roof + 1.2, z + 0.25], tile));
    boxes.push(wboxMinMax([w / 2 - fin, podiumH, z - 0.25], [w / 2, roof + 1.2, z + 0.25], tile));
  }
  // roof slab + parapet upstand
  boxes.push(wboxMinMax([-w / 2, roof - 0.3, -d / 2], [w / 2, roof + 1.2, d / 2], tile));
  return {geo: mergeBoxes(boxes), L, podiumH};
};

const buildCrown = (p: MegablockProps, roof: number, seed: number) => {
  const w = p.w ?? 32, d = p.d ?? 24;
  const r = prng(seed * 13 + 5);
  const boxes: THREE.BufferGeometry[] = [];
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const bw = w * (0.12 + r() * 0.22), bd = d * (0.15 + r() * 0.3), bh = 2.5 + r() * 6;
    boxes.push(wbox(bw, bh, bd, [(r() - 0.5) * (w - bw - 2), roof + 1.2 + bh / 2, (r() - 0.5) * (d - bd - 2)], WALL_TILE));
  }
  if (r() < 0.6) {
    const mh = 12 + r() * 20;
    boxes.push(wbox(0.5, mh, 0.5, [(r() - 0.5) * w * 0.5, roof + 1.2 + mh / 2, (r() - 0.5) * d * 0.4], WALL_TILE));
  }
  return mergeBoxes(boxes);
};

export const Megablock: React.FC<MegablockProps> = (props) => {
  const {
    w = 32, h = 96, d = 24, floors, bays, litFraction = 0.03, seed = 1, warmWindow = false, faces = FACES, podium = 2,
    crown = true, color = GREYS.g5, ambient = 1.1, litIntensity = 0.9, litColor = S.bone, glass = GREYS.g1, fin = 0.7,
    ...group
  } = props;
  const dimsKey = `${w}|${h}|${d}|${floors}|${bays}|${podium}|${fin}`;
  const built = useMemo(() => buildMegablock({w, h, d, floors, bays, podium, fin}), [dimsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => built.geo.dispose(), [built]);
  const crownGeo = useMemo(() => (crown ? buildCrown({w, d}, built.L.roof, seed) : null), [crown, built, seed, w, d]);
  useLayoutEffect(() => () => crownGeo?.dispose(), [crownGeo]);
  const mat = useConcreteMat({color, ambient, sky: 1});

  const warm = warmWindow === false ? null : {...MEGABLOCK_WARM_DEFAULT({w, h, d, floors, bays, podium, fin}), intensity: 1.6, ...(warmWindow === true ? {} : warmWindow)};
  const facesKey = faces.join(',');
  const panes = useMemo(() => {
    const L = built.L;
    const list: {m: THREE.Matrix4; face: MegaFace; bay: number; floor: number}[] = [];
    const o = new THREE.Object3D();
    const p0 = Math.max(1, Math.round(built.podiumH / L.fh));
    for (const face of faces) {
      const nb = face === 'front' || face === 'back' ? L.baysX : L.baysZ;
      for (let f = p0; f < L.floors; f++) {
        for (let b = 0; b < nb; b++) {
          const pn = megablockPane({w, h, d, floors, bays, podium, fin}, face, b, f);
          o.position.set(pn.position[0] + pn.normal[0] * 0.01, pn.position[1], pn.position[2] + pn.normal[2] * 0.01);
          o.rotation.set(0, face === 'front' ? 0 : face === 'back' ? Math.PI : face === 'left' ? -Math.PI / 2 : Math.PI / 2, 0);
          o.scale.set(pn.size[0], pn.size[1], 1);
          o.updateMatrix();
          list.push({m: o.matrix.clone(), face, bay: b, floor: f});
        }
      }
    }
    const pm = new THREE.MeshBasicMaterial({map: blindsTex(), color: '#ffffff'});
    const mesh = new THREE.InstancedMesh(PANE, pm, Math.max(1, list.length));
    list.forEach((it, i) => mesh.setMatrixAt(i, it.m));
    mesh.count = list.length;
    mesh.instanceMatrix.needsUpdate = true;
    return {mesh, list};
  }, [built, facesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => {
    (panes.mesh.material as THREE.Material).dispose();
    panes.mesh.dispose();
  }, [panes]);
  const colKey = `${seed}|${litFraction}|${litIntensity}|${litColor}|${glass}|${JSON.stringify(warm)}`;
  useLayoutEffect(() => {
    const c = new THREE.Color();
    const fi = (f: MegaFace) => FACES.indexOf(f);
    panes.list.forEach((it, i) => {
      const isWarm = warm && it.face === warm.face && it.bay === warm.bay && it.floor === warm.floor;
      const hsh = hash01(seed * 7919 + fi(it.face) * 131 + it.bay, it.floor, 77);
      if (isWarm) c.set(S.dawnGold).multiplyScalar(warm!.intensity);
      else if (hsh < litFraction) c.set(litColor).multiplyScalar(litIntensity * (0.55 + 0.6 * hash01(it.bay, it.floor, seed + 3)));
      else c.set(glass).multiplyScalar(0.5 + 0.9 * hash01(it.bay, it.floor, seed + 11));
      panes.mesh.setColorAt(i, c);
    });
    if (panes.mesh.instanceColor) panes.mesh.instanceColor.needsUpdate = true;
  }, [panes, colKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group {...group}>
      <mesh geometry={built.geo} material={mat} />
      {crownGeo ? <mesh geometry={crownGeo} material={mat} /> : null}
      <primitive object={panes.mesh} />
    </group>
  );
};

// ================================================================================================ CityGrid
export type CityGridProps = GroupProps & {
  rows?: number;
  cols?: number;
  spacing?: number;
  seed?: number;
  height?: [number, number];
  footprint?: [number, number];
  jitter?: number;
  centreBoost?: number;
  litFraction?: number;
  avoid?: [number, number, number][];
  floorH?: number;
  bayW?: number;
  color?: string;
  glass?: string;
  litColor?: string;
  litIntensity?: number;
  ambient?: number;
  shade?: [number, number, number, number];
  crowns?: boolean;
};

export type CityBlock = {x: number; z: number; w: number; d: number; h: number; seed: number};

export const cityGridLayout = (p: CityGridProps = {}): CityBlock[] => {
  const rows = p.rows ?? 8, cols = p.cols ?? 8, sp = p.spacing ?? 56, seed = p.seed ?? 1;
  const [h0, h1] = p.height ?? [30, 150];
  const [f0, f1] = p.footprint ?? [16, 34];
  const jit = p.jitter ?? 0.3, boost = p.centreBoost ?? 0.5;
  const avoid = p.avoid ?? [];
  const r = prng(seed * 101 + 7);
  const out: CityBlock[] = [];
  const R = Math.hypot((cols - 1) / 2, (rows - 1) / 2) * sp || 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = (i - (cols - 1) / 2) * sp + (r() - 0.5) * sp * jit;
      const z = (j - (rows - 1) / 2) * sp + (r() - 0.5) * sp * jit;
      const w = f0 + r() * (f1 - f0), d = f0 + r() * (f1 - f0);
      const centre = 1 - Math.min(1, Math.hypot(x, z) / R);
      const hk = Math.pow(r(), 1.6);
      const hh = h0 + (h1 - h0) * Math.min(1, hk * (1 - boost) + hk * boost * (0.4 + 1.2 * centre));
      const s = Math.floor(r() * 100000);
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      out.push({x, z, w, d, h: hh, seed: s});
    }
  }
  return out;
};

const CITY_VERT = /* glsl */ `
attribute float aSeed;
varying vec3 vLocal;
varying vec3 vSize;
varying vec3 vNrm;
varying float vSeed;
#include <common>
#include <fog_pars_vertex>
void main() {
  vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vLocal = position * sc;
  vSize = sc;
  vNrm = normal;
  vSeed = aSeed;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const CITY_FRAG = /* glsl */ `
uniform vec3 uConcrete, uGlass, uLit;
uniform float uLitFrac, uFloorH, uBayW, uAmbient, uPlain;
uniform vec4 uShade;
varying vec3 vLocal;
varying vec3 vSize;
varying vec3 vNrm;
varying float vSeed;
#include <common>
#include <fog_pars_fragment>
// sin-free hash (a sin-based one quantises to 1/256 at these magnitudes and lights stray windows)
float h4(vec4 p4) {
  p4 = fract(p4 * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p4 += dot(p4, p4.wzxy + 33.33);
  return fract((p4.x + p4.y) * (p4.z + p4.w));
}
void main() {
  vec3 n = normalize(vNrm);
  vec3 col;
  if (n.y > 0.5) {
    col = uConcrete * 0.55;
  } else if (n.y < -0.5) {
    col = uConcrete * 0.3;
  } else {
    bool zf = abs(n.z) > 0.5;
    float faceId = zf ? (n.z > 0.0 ? 0.0 : 1.0) : (n.x < 0.0 ? 2.0 : 3.0);
    float shade = faceId < 0.5 ? uShade.x : faceId < 1.5 ? uShade.y : faceId < 2.5 ? uShade.z : uShade.w;
    float faceW = zf ? vSize.x : vSize.z;
    float u = (zf ? vLocal.x * sign(n.z) : -vLocal.z * sign(n.x)) + faceW * 0.5;
    float v = vLocal.y;
    vec3 conc = uConcrete * (0.8 + 0.2 * smoothstep(0.0, 0.25 * uFloorH, mod(v, uFloorH)));
    if (uPlain > 0.5) {
      col = conc * shade;
    } else {
      float nb = max(1.0, floor(faceW / uBayW + 0.5));
      float bw = faceW / nb;
      float bu = u / bw;
      float bay = floor(bu);
      float fx = fract(bu);
      float fv = v / uFloorH;
      float fl = floor(fv);
      float fy = fract(fv);
      vec2 fw = fwidth(vec2(bu, fv));
      float wx = smoothstep(0.14 - fw.x, 0.14 + fw.x, fx) * (1.0 - smoothstep(0.86 - fw.x, 0.86 + fw.x, fx));
      float wy = smoothstep(0.3 - fw.y, 0.3 + fw.y, fy) * (1.0 - smoothstep(0.84 - fw.y, 0.84 + fw.y, fy));
      float top = vSize.y / uFloorH;
      float inside = step(1.0, fl) * step(fl, top - 1.5);
      float win = wx * wy * inside;
      float rr = h4(vec4(vSeed, faceId, fl, bay));
      float lit = rr < uLitFrac ? 1.0 : 0.0;
      float litK = 0.55 + 0.45 * h4(vec4(bay, fl, vSeed, 3.0));
      // slatted glass: faint vertical stripes on dark panes, stronger on lit ones
      float slat = 0.75 + 0.25 * step(0.5, fract(fx * 9.0));
      vec3 glass = mix(uGlass * (0.6 + 0.8 * h4(vec4(fl, bay, vSeed, 9.0))), uLit * litK * slat, lit);
      // sub-pixel: fade the grid to its average so far blocks never shimmer
      float detail = 1.0 - smoothstep(0.18, 0.45, max(fw.x, fw.y));
      vec3 avg = mix(conc * 0.85, mix(uGlass, uLit * 0.7, uLitFrac), 0.38 * inside);
      col = mix(avg, mix(conc, glass, win), detail);
      col = mix(col, col * shade, 1.0 - win * lit);
    }
  }
  col *= uAmbient;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

const cityMaterial = (plain: boolean) =>
  new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uConcrete: {value: new THREE.Color()}, uGlass: {value: new THREE.Color()}, uLit: {value: new THREE.Color()},
        uLitFrac: {value: 0.02}, uFloorH: {value: 3.4}, uBayW: {value: 3.6}, uAmbient: {value: 1}, uPlain: {value: plain ? 1 : 0},
        uShade: {value: new THREE.Vector4(0.75, 1, 0.6, 0.9)},
      },
    ]),
    vertexShader: CITY_VERT,
    fragmentShader: CITY_FRAG,
    fog: true,
  });

export const CityGrid: React.FC<CityGridProps> = (props) => {
  const {
    rows = 8, cols = 8, spacing = 56, seed = 1, height = [30, 150], footprint = [16, 34], jitter = 0.3, centreBoost = 0.5,
    litFraction = 0.02, avoid = [], floorH = 3.4, bayW = 3.6, color = GREYS.g4, glass = GREYS.g1, litColor = S.bone,
    litIntensity = 1, ambient = 1, shade = [0.75, 1, 0.6, 0.9], crowns = true, ...group
  } = props;
  const key = JSON.stringify([rows, cols, spacing, seed, height, footprint, jitter, centreBoost, avoid]);
  const blocks = useMemo(() => cityGridLayout({rows, cols, spacing, seed, height, footprint, jitter, centreBoost, avoid}), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const {towers, plant, mats} = useMemo(() => {
    const m = cityMaterial(false), mp = cityMaterial(true);
    const t = new THREE.InstancedMesh(UNIT_BOX, m, Math.max(1, blocks.length));
    const seeds = new Float32Array(Math.max(1, blocks.length));
    const o = new THREE.Object3D();
    blocks.forEach((b, i) => {
      o.position.set(b.x, 0, b.z);
      o.rotation.set(0, 0, 0);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      t.setMatrixAt(i, o.matrix);
      seeds[i] = b.seed % 997;
    });
    t.count = blocks.length;
    t.geometry = UNIT_BOX.clone();
    t.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    t.instanceMatrix.needsUpdate = true;
    // roof plant: 2 boxes per block
    const pl = new THREE.InstancedMesh(UNIT_BOX, mp, Math.max(1, blocks.length * 2));
    const ps = new Float32Array(Math.max(1, blocks.length * 2));
    blocks.forEach((b, i) => {
      for (let k = 0; k < 2; k++) {
        const r1 = hash01(b.seed, k, 1), r2 = hash01(b.seed, k, 2), r3 = hash01(b.seed, k, 3);
        const pw = b.w * (0.2 + 0.3 * r1), pd = b.d * (0.2 + 0.3 * r2), ph = 2 + 7 * r3 * (k === 1 ? 1.8 : 1);
        o.position.set(b.x + (r2 - 0.5) * (b.w - pw), b.h, b.z + (r1 - 0.5) * (b.d - pd));
        o.scale.set(pw, ph, pd);
        o.updateMatrix();
        pl.setMatrixAt(i * 2 + k, o.matrix);
        ps[i * 2 + k] = 0;
      }
    });
    pl.count = blocks.length * 2;
    pl.geometry = UNIT_BOX.clone();
    pl.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(ps, 1));
    pl.instanceMatrix.needsUpdate = true;
    t.frustumCulled = false;
    pl.frustumCulled = false;
    return {towers: t, plant: pl, mats: [m, mp]};
  }, [blocks]);
  useLayoutEffect(() => () => {
    mats.forEach((m) => m.dispose());
    towers.geometry.dispose();
    plant.geometry.dispose();
    towers.dispose();
    plant.dispose();
  }, [towers, plant, mats]);
  useLayoutEffect(() => {
    for (const m of mats) {
      const u = m.uniforms;
      u.uConcrete.value.set(color);
      u.uGlass.value.set(glass);
      u.uLit.value.set(litColor).multiplyScalar(litIntensity);
      u.uLitFrac.value = litFraction;
      u.uFloorH.value = floorH;
      u.uBayW.value = bayW;
      u.uAmbient.value = ambient;
      u.uShade.value.set(...shade);
    }
  });
  return (
    <group {...group}>
      <primitive object={towers} />
      {crowns ? <primitive object={plant} /> : null}
    </group>
  );
};
