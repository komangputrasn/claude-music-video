/**
 * Guy geometry builders (pure, built once per outfit and cached at module level).
 * Low-poly lofts with vertex-coloured bands (hoodie stripe, rib cuffs), deformed head sphere, tilted hair cap with
 * frosted-tip spikes (vertex colours brown -> bleached), chunky skate shoes, mitten hands.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {rand} from '../../time';
import {DIM} from './rig';
import {C} from '../../palette';

const BASE_COLORS = {
  skin: '#F7C9A3',
  hoodie: C.tangerine,
  hoodieRib: '#E2650B',
  stripe: '#E6EAF1',
  pinstripe: '#1E5BFF',
  drawstring: '#E6EAF1',
  jeans: '#4E82CC',
  jeansDark: '#35619F',
  jeansHem: '#3F70B5',
  shoe: '#E9EDF3',
  sole: '#B9C3D3',
  shoeAccent: '#1E5BFF',
  laces: '#C9D2DF',
  hair: '#6B3D1C',
  hairTip: '#F8E3A0',
  wristband: C.lime,
  nose: '#F3B994',
};
export type GuyColors = {[K in keyof typeof BASE_COLORS]: string};
/** Default outfit / skin colours. Override any subset with <Guy outfit={{hoodie: '#c06010'}}/>. */
export const GUY_COLORS: GuyColors = BASE_COLORS;

// ---------------------------------------------------------------- utils
/** Recompute normals and average them across vertices that share a position (welds seams/poles for clean ink outlines). */
export const weldNormals = (g: THREE.BufferGeometry) => {
  g.computeVertexNormals();
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const acc = new Map<string, THREE.Vector3>();
  const key = (i: number) => `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
  for (let i = 0; i < p.count; i++) {
    const k = key(i);
    const v = acc.get(k) ?? new THREE.Vector3();
    v.x += n.getX(i);
    v.y += n.getY(i);
    v.z += n.getZ(i);
    acc.set(k, v);
  }
  for (let i = 0; i < p.count; i++) {
    const v = acc.get(key(i))!.clone().normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
  return g;
};

export type LoftRow = {y: number; a: number; b?: number; c: string; z?: number; x?: number};

/** Loft rings of super-ellipse cross-sections (a = half width X, b = half depth Z) bottom -> top, with vertex colours.
 *  Repeat a row with a different colour for a crisp colour band edge. */
export const loft = (rows: LoftRow[], segs = 10, n = 2.5): THREE.BufferGeometry => {
  const posA: number[] = [];
  const colA: number[] = [];
  const idx: number[] = [];
  const col = new THREE.Color();
  rows.forEach((r) => {
    col.set(r.c);
    const b = r.b ?? r.a;
    for (let j = 0; j < segs; j++) {
      const t = (j / segs) * Math.PI * 2;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const x = r.a * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n);
      const z = b * Math.sign(st) * Math.pow(Math.abs(st), 2 / n);
      posA.push(x + (r.x ?? 0), r.y, z + (r.z ?? 0));
      colA.push(col.r, col.g, col.b);
    }
  });
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      const a0 = i * segs + j;
      const a1 = i * segs + j1;
      const b0 = (i + 1) * segs + j;
      const b1 = (i + 1) * segs + j1;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  g.setIndex(idx);
  return weldNormals(g);
};

/** Rounded limb: circle-ish loft from y=0 down to y=-len with rounded caps. `bands` adds colour bands [y0, y1, colour]. */
const limb = (
  len: number, rTop: number, rBot: number, color: string,
  opts: {mid?: number; zs?: number; bands?: [number, number, string][]; segs?: number; capTop?: number; capBot?: number; n?: number} = {},
) => {
  const zs = opts.zs ?? 0.92;
  const rows: LoftRow[] = [];
  const capT = opts.capTop ?? rTop * 0.85;
  const capB = opts.capBot ?? rBot * 0.85;
  const radiusAt = (y: number) => {
    // y in [-len, 0]
    const u = -y / len;
    if (opts.mid !== undefined) return u < 0.5 ? rTop + (opts.mid - rTop) * (u / 0.5) : opts.mid + (rBot - opts.mid) * ((u - 0.5) / 0.5);
    return rTop + (rBot - rTop) * u;
  };
  const colorAt = (y: number) => {
    for (const [y0, y1, c] of opts.bands ?? []) if (y <= y0 && y >= y1) return c;
    return color;
  };
  // bottom cap
  for (let i = 0; i <= 3; i++) {
    const a = (i / 3) * (Math.PI / 2);
    rows.push({y: -len - Math.cos(a) * capB, a: Math.sin(a) * rBot, b: Math.sin(a) * rBot * zs, c: colorAt(-len)});
  }
  // body with band edges duplicated
  const ys = new Set<number>([-len, -len * 0.5, 0]);
  for (const [y0, y1] of opts.bands ?? []) {
    ys.add(y0);
    ys.add(y1);
  }
  const sorted = [...ys].filter((y) => y >= -len && y <= 0).sort((p, q) => p - q);
  for (const y of sorted) {
    const r = radiusAt(y);
    const cBelow = colorAt(y - 1e-4);
    const cAbove = colorAt(y + 1e-4);
    if (y !== -len) rows.push({y, a: r, b: r * zs, c: cBelow});
    if (cAbove !== cBelow || y === -len) rows.push({y, a: r, b: r * zs, c: cAbove});
  }
  // top cap
  for (let i = 3; i >= 0; i--) {
    const a = (i / 3) * (Math.PI / 2);
    if (i === 3) continue;
    rows.push({y: Math.cos(a) * capT, a: Math.sin(a) * rTop, b: Math.sin(a) * rTop * zs, c: colorAt(0)});
  }
  return loft(rows, opts.segs ?? 9, opts.n ?? 2.15);
};

// ---------------------------------------------------------------- head
/** Point on Guy's (deformed) head surface for a unit direction, scaled by `k` (1 = skin). */
export const headSurface = (dir: THREE.Vector3, k = 1): THREE.Vector3 => {
  const R = DIM.headR * k;
  const nx = dir.x;
  const ny = dir.y;
  const nz = dir.z;
  let x = nx;
  let y = ny * 1.08;
  let z = nz * 0.97;
  if (ny < 0) {
    const d = -ny;
    x *= 1 - 0.2 * Math.pow(d, 1.6); // narrower jaw
    z += 0.07 * d * Math.max(0, nz); // chin forward
    y -= 0.02 * d * Math.max(0, nz);
  } else {
    x *= 1 + 0.035 * ny; // slightly wider cranium
  }
  // cheeks
  const cheek = Math.max(0, 1 - Math.abs(ny + 0.25) / 0.35) * Math.max(0, nz);
  x *= 1 + 0.05 * cheek;
  return new THREE.Vector3(x * R, y * R, z * R);
};
const dirLonLat = (lon: number, lat: number) => new THREE.Vector3(Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat));
export const headPoint = (lon: number, lat: number, k = 1) => headSurface(dirLonLat(lon, lat), k);

const buildHead = () => {
  const g = new THREE.SphereGeometry(1, 18, 14, -Math.PI / 2);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const s = headSurface(v);
    p.setXYZ(i, s.x, s.y, s.z);
  }
  return weldNormals(g);
};

/** Hairline latitude as a function of |lon| (front forehead high, dips for sideburns, clears the ears, low at the nape). */
const HAIRLINE: [number, number][] = [
  [0, 0.47], [0.35, 0.49], [0.7, 0.4], [1.0, 0.26], [1.17, 0.05], [1.26, -0.2], [1.36, -0.2], [1.44, 0.18],
  [1.62, 0.24], [1.85, 0.2], [2.15, -0.05], [2.5, -0.45], [2.85, -0.62], [Math.PI, -0.66],
];
const hairline = (lon: number) => {
  const l = Math.min(Math.PI, Math.abs(lon));
  for (let i = 0; i < HAIRLINE.length - 1; i++) {
    const [x0, y0] = HAIRLINE[i];
    const [x1, y1] = HAIRLINE[i + 1];
    if (l <= x1) {
      const u = (l - x0) / (x1 - x0);
      const s = u * u * (3 - 2 * u);
      return y0 + (y1 - y0) * s;
    }
  }
  return HAIRLINE[HAIRLINE.length - 1][1];
};

const HAIR_K = 1.065;
const buildHairCap = () => {
  const NL = 28;
  const NR = 7;
  const posA: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r <= NR; r++) {
    for (let i = 0; i < NL; i++) {
      const lon = -Math.PI + (i / NL) * Math.PI * 2;
      const h0 = hairline(lon);
      const u = r / NR;
      const lat = h0 + (Math.PI / 2 - h0) * (1 - Math.pow(1 - u, 1.3));
      // the rim tucks in slightly so the edge reads as a hairline
      const k = r === 0 ? HAIR_K - 0.035 : HAIR_K + 0.03 * Math.sin(u * Math.PI * 0.5) + 0.02 * Math.max(0, Math.cos(lon)) * u;
      const s = headPoint(lon, Math.min(lat, Math.PI / 2 - 1e-3), k);
      posA.push(s.x, s.y, s.z);
    }
  }
  for (let r = 0; r < NR; r++) {
    for (let i = 0; i < NL; i++) {
      const i1 = (i + 1) % NL;
      const a0 = r * NL + i;
      const a1 = r * NL + i1;
      const b0 = (r + 1) * NL + i;
      const b1 = (r + 1) * NL + i1;
      // rows go upward, lon increases toward +X... wind so normals face out
      idx.push(a0, a1, b0, a1, b1, b0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
  g.setIndex(idx);
  return weldNormals(g);
};

type Spike = {lon: number; lat: number; len: number; rad: number; tilt: [number, number]};
/** Hand-placed gelled spikes: a forward quiff row, a crown of tall spikes, short spikes toward the sides/back. */
const SPIKES: Spike[] = (() => {
  const out: Spike[] = [];
  // fringe right on the hairline: short, pushed up and forward over the forehead
  for (let i = 0; i < 8; i++) {
    const lon = -0.95 + (i / 7) * 1.9;
    out.push({lon, lat: hairline(lon) + 0.07, len: 0.05 + 0.01 * Math.cos(lon * 2), rad: 0.03, tilt: [0.75, lon * 0.3]});
  }
  // front quiff row (just behind the hairline), leaning forward
  for (let i = 0; i < 7; i++) {
    const lon = -0.75 + (i / 6) * 1.5;
    out.push({lon, lat: hairline(lon) + 0.24, len: 0.075 + 0.012 * Math.cos(lon * 2), rad: 0.035, tilt: [0.5, lon * 0.35]});
  }
  // second row
  for (let i = 0; i < 7; i++) {
    const lon = -0.95 + (i / 6) * 1.9 + 0.12;
    out.push({lon, lat: 0.95, len: 0.085, rad: 0.035, tilt: [0.25, lon * 0.4]});
  }
  // crown
  for (let i = 0; i < 6; i++) {
    const lon = -1.3 + (i / 5) * 2.6;
    out.push({lon, lat: 1.22, len: 0.085, rad: 0.035, tilt: [-0.1, lon * 0.25]});
  }
  out.push({lon: 0, lat: 1.5, len: 0.09, rad: 0.036, tilt: [0.1, 0]});
  // ring toward sides and back: shorter, sweeping back/out
  for (let i = 0; i < 12; i++) {
    const lon = -Math.PI + (i / 12) * Math.PI * 2 + 0.26;
    if (Math.abs(lon) < 0.9) continue;
    out.push({lon, lat: 0.72, len: 0.06, rad: 0.032, tilt: [-0.35, 0]});
  }
  for (let i = 0; i < 8; i++) {
    const lon = -Math.PI + (i / 8) * Math.PI * 2;
    if (Math.abs(lon) < 1.4) continue;
    out.push({lon, lat: 0.28, len: 0.045, rad: 0.03, tilt: [-0.55, 0]});
  }
  return out;
})();

const buildSpikes = (brown: string, blond: string) => {
  const geos: THREE.BufferGeometry[] = [];
  const cBrown = new THREE.Color(brown);
  const cBlond = new THREE.Color(blond);
  const cMid = cBrown.clone().lerp(cBlond, 0.45);
  const up = new THREE.Vector3(0, 1, 0);
  SPIKES.forEach((sp, i) => {
    const lat = Math.min(sp.lat, Math.PI / 2 - 0.02);
    const d = dirLonLat(sp.lon, lat);
    const j1 = rand(`gs${i}`) - 0.5;
    const j2 = rand(`gr${i}`) - 0.5;
    const len = sp.len * (1 + 0.18 * j1);
    const rad = sp.rad * (1 + 0.15 * j2);
    const g = new THREE.ConeGeometry(rad, len, 5, 3, true);
    g.translate(0, len / 2, 0);
    const p = g.attributes.position;
    const colors: number[] = [];
    for (let k = 0; k < p.count; k++) {
      const h = p.getY(k) / len;
      const c = h < 0.34 ? cBrown : h < 0.67 ? cMid : cBlond;
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    // direction: mostly up (gel), plus outward normal, plus per-spike forward/back + sideways tilt
    const fwd = new THREE.Vector3(Math.sin(sp.lon), 0, Math.cos(sp.lon));
    const dir = d
      .clone()
      .multiplyScalar(0.55)
      .add(up.clone().multiplyScalar(1.0))
      .add(fwd.multiplyScalar(sp.tilt[0]))
      .add(new THREE.Vector3(sp.tilt[1] + j2 * 0.25, 0, j1 * 0.2))
      .normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const twist = new THREE.Quaternion().setFromAxisAngle(up, rand(`gt${i}`) * Math.PI);
    g.applyQuaternion(twist);
    g.applyQuaternion(q);
    const base = headSurface(d, HAIR_K - 0.01);
    g.translate(base.x, base.y, base.z);
    geos.push(g);
  });
  const merged = mergeGeometries(geos)!;
  geos.forEach((g) => g.dispose());
  return weldNormals(merged);
};

// ---------------------------------------------------------------- body
const buildTorso = (c: GuyColors) => {
  const H = c.hoodie;
  const R = c.hoodieRib;
  const S = c.stripe;
  const P = c.pinstripe;
  const rows: LoftRow[] = [
    {y: -0.125, a: 0, b: 0, c: R},
    {y: -0.13, a: 0.172, b: 0.116, c: R},
    {y: -0.075, a: 0.184, b: 0.124, c: R},
    {y: -0.075, a: 0.184, b: 0.124, c: H},
    {y: -0.055, a: 0.212, b: 0.145, c: H},
    {y: 0.08, a: 0.228, b: 0.154, c: H},
    {y: 0.2, a: 0.228, b: 0.152, c: H},
    {y: 0.255, a: 0.225, b: 0.15, c: H},
    {y: 0.255, a: 0.225, b: 0.15, c: P},
    {y: 0.266, a: 0.2245, b: 0.1497, c: P},
    {y: 0.266, a: 0.2245, b: 0.1497, c: S},
    {y: 0.334, a: 0.22, b: 0.147, c: S},
    {y: 0.334, a: 0.22, b: 0.147, c: P},
    {y: 0.345, a: 0.219, b: 0.146, c: P},
    {y: 0.345, a: 0.219, b: 0.146, c: H},
    {y: 0.4, a: 0.205, b: 0.137, c: H},
    {y: 0.445, a: 0.176, b: 0.122, c: H},
    {y: 0.478, a: 0.12, b: 0.09, c: H},
    {y: 0.49, a: 0.0, b: 0.0, c: H},
  ];
  return loft(rows, 14, 2.7);
};

const torsoFrontZ = (y: number) => {
  // approximate front depth for decals (matches buildTorso rows)
  if (y < 0.08) return 0.145 + (y + 0.055) * 0.065;
  if (y > 0.4) return 0.137 - (y - 0.4) * 0.33;
  return 0.153;
};

const buildPocket = () => {
  // kangaroo pocket: curved patch following the torso front, as a thin shell
  const w0 = 0.155; // half width at bottom
  const w1 = 0.105; // half width at top
  const y0 = -0.035;
  const y1 = 0.11;
  const nx = 8;
  const ny = 4;
  const posA: number[] = [];
  const idx: number[] = [];
  const a = 0.228;
  const n = 2.7;
  for (let j = 0; j <= ny; j++) {
    const v = j / ny;
    const y = y0 + (y1 - y0) * v;
    const hw = w0 + (w1 - w0) * v;
    for (let i = 0; i <= nx; i++) {
      const x = -hw + (2 * hw * i) / nx;
      const zf = torsoFrontZ(y) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / a, n)), 1 / n);
      posA.push(x, y, zf + 0.006);
    }
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a0 = j * (nx + 1) + i;
      const a1 = a0 + 1;
      const b0 = a0 + nx + 1;
      const b1 = b0 + 1;
      idx.push(a0, a1, b0, a1, b1, b0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

const rbox = (w: number, h: number, d: number, r: number, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, r);

export const buildGuyGeometry = (c: GuyColors) => {
  const head = buildHead();
  const hairCap = buildHairCap();
  const spikes = buildSpikes(c.hair, c.hairTip);
  const torso = buildTorso(c);
  const pocket = buildPocket();
  const pelvis = loft(
    [
      {y: -0.1, a: 0, b: 0, c: c.jeans},
      {y: -0.095, a: 0.1, b: 0.08, c: c.jeans},
      {y: -0.06, a: 0.17, b: 0.12, c: c.jeans},
      {y: 0.02, a: 0.19, b: 0.13, c: c.jeans},
      {y: 0.1, a: 0.175, b: 0.12, c: c.jeans},
      {y: 0.12, a: 0, b: 0, c: c.jeans},
    ],
    12,
    2.4,
  );
  const hoodRing = new THREE.TorusGeometry(0.108, 0.042, 7, 16);
  hoodRing.rotateX(Math.PI / 2);
  hoodRing.scale(1, 1, 0.82);
  const hoodBack = new THREE.SphereGeometry(1, 12, 8);
  hoodBack.scale(0.15, 0.1, 0.075);
  const string = new THREE.CylinderGeometry(0.0065, 0.0065, 0.1, 5);
  string.translate(0, -0.05, 0);
  const aglet = new THREE.CylinderGeometry(0.009, 0.009, 0.025, 6);
  const neck = new THREE.CylinderGeometry(0.052, 0.058, 0.16, 10);
  neck.translate(0, 0.06, 0);
  const nose = new THREE.SphereGeometry(1, 10, 8);
  nose.scale(0.019, 0.016, 0.017);
  const ear = new THREE.SphereGeometry(1, 10, 8);
  ear.scale(0.016, 0.04, 0.03);
  const earInner = new THREE.SphereGeometry(1, 8, 6);
  earInner.scale(0.006, 0.024, 0.016);

  // arms (y down from joint)
  const upperArm = limb(DIM.upperArm, 0.076, 0.066, c.hoodie, {
    capTop: 0.064,
    bands: [
      [-0.055, -0.066, c.pinstripe],
      [-0.066, -0.134, c.stripe],
      [-0.134, -0.145, c.pinstripe],
    ],
  });
  const forearm = limb(0.19, 0.066, 0.062, c.hoodie, {capTop: 0.05, capBot: 0.02, mid: 0.07, bands: [[-0.15, -0.2, c.hoodieRib]]});
  const wrist = new THREE.CylinderGeometry(0.031, 0.034, 0.08, 8);
  wrist.translate(0, -0.21, 0);
  const wristband = new THREE.CylinderGeometry(0.043, 0.043, 0.035, 10);
  wristband.translate(0, -0.212, 0);
  const palm = rbox(0.042, 0.088, 0.085, 0.019);
  palm.translate(0, -0.042, 0.003);
  const fingers = rbox(0.034, 0.075, 0.082, 0.016);
  fingers.translate(0, -0.032, 0);
  const thumb = rbox(0.028, 0.055, 0.03, 0.013);
  thumb.translate(0, -0.024, 0);

  // legs (y down from joint)
  const thigh = limb(DIM.thigh, 0.104, 0.092, c.jeans, {capTop: 0.07, capBot: 0.065, mid: 0.104, zs: 0.95});
  const shin = limb(DIM.shin - 0.02, 0.09, 0.114, c.jeans, {
    capTop: 0.065,
    capBot: 0.012,
    mid: 0.097,
    zs: 0.95,
    bands: [[-(DIM.shin - 0.02) + 0.022, -1, c.jeansHem]],
  });
  const cargo = rbox(0.022, 0.12, 0.11, 0.008);
  const cargoFlap = rbox(0.026, 0.03, 0.118, 0.008);
  const kneeSeam = new THREE.TorusGeometry(0.094, 0.006, 4, 14);
  kneeSeam.rotateX(Math.PI / 2);

  // chunky skate shoe (ankle-relative; sole bottom at y = -ankleH)
  const h = DIM.ankleH;
  const sole = rbox(0.134, 0.04, DIM.toe - DIM.heel + 0.01, 0.016);
  sole.translate(0, -h + 0.02, (DIM.toe + DIM.heel) / 2);
  const shoeHeel = rbox(0.124, 0.115, 0.16, 0.045, 3);
  shoeHeel.translate(0, -h + 0.075, -0.01);
  const shoeToe = rbox(0.13, 0.078, 0.19, 0.036, 3);
  shoeToe.translate(0, -h + 0.06, 0.1);
  const tongue = rbox(0.072, 0.07, 0.045, 0.018);
  tongue.rotateX(-0.35);
  tongue.translate(0, -h + 0.125, 0.065);
  const shoeStripe = rbox(0.006, 0.026, 0.13, 0.003, 1);
  const laces = rbox(0.08, 0.008, 0.01, 0.003, 1);

  return {
    head, hairCap, spikes, torso, pocket, pelvis, hoodRing, hoodBack, string, aglet, neck, nose, ear, earInner,
    upperArm, forearm, wrist, wristband, palm, fingers, thumb,
    thigh, shin, cargo, cargoFlap, kneeSeam, sole, shoeHeel, shoeToe, tongue, shoeStripe, laces,
  };
};
export type GuyGeometry = ReturnType<typeof buildGuyGeometry>;

const geoCache = new Map<string, GuyGeometry>();
export const getGuyGeometry = (c: GuyColors) => {
  const key = JSON.stringify(c);
  let g = geoCache.get(key);
  if (!g) {
    g = buildGuyGeometry(c);
    geoCache.set(key, g);
  }
  return g;
};

export {torsoFrontZ};
