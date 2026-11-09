/**
 * <RollingHills> — big "Y2K desktop wallpaper" ground: impossibly green, smooth low-poly rolling hills with a flat hilltop
 * plateau at the origin (height exactly 0 inside `plateau` metres, so a <House> at the origin sits on y=0), falling away into
 * valleys and rising again into distant crests that form the horizon. Optional grass tufts + little flowers (instanced).
 * Grid is denser near the centre (flat-shaded facets ~0.4 m near the house, ~6 m at the rim).
 *
 *   <RollingHills preset="day" size={600} grass={2600} flowers={700} scatter={[8, 48]} />
 *   const h = makeHillsHeight({seed: 2});  h(x, z) -> ground height (same opts as the component) ; hillsHeight = defaults
 *   <Guy position={[5, hillsHeight(5, 12), 12]} />
 *
 * Props: size, segments, seed, amplitude (rolling noise m), drop (how far the hilltop falls away), plateau (flat radius),
 * rimRise (distant crest height), palette ('day' | 'sunrise' | 'dusk' | 'night' or custom {low, mid, high, tip}),
 * grass / flowers (instance counts), scatter [inner, outer] radius for tufts, avoid: [x0, z0, x1, z1][] rects kept clear.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {fbm2, hash1, hash2, smoothstep} from './common';

type GroupProps = ThreeElements['group'];

export type HillsOpts = {
  seed?: number;
  /** rolling noise amplitude (m) */
  amplitude?: number;
  /** drop from the hilltop to the valleys (m) */
  drop?: number;
  /** radius of the main hill (m) */
  hillRadius?: number;
  /** flat radius at origin (m) */
  plateau?: number;
  /** extra height of the far crest ring (m) */
  rimRise?: number;
  /** distance where the rim starts rising (m) */
  rimStart?: number;
};
const DEF: Required<HillsOpts> = {seed: 1, amplitude: 5, drop: 9, hillRadius: 55, plateau: 14, rimRise: 26, rimStart: 110};

/** Height function for the hills (pure). Same options as <RollingHills>. h(0,0) = 0 and flat inside `plateau`. */
export const makeHillsHeight = (o: HillsOpts = {}) => {
  const p = {...DEF};
  for (const k of Object.keys(o) as (keyof HillsOpts)[]) if (o[k] !== undefined) p[k] = o[k] as number;
  const raw = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    const dome = -p.drop * (1 - Math.exp(-Math.pow(r / p.hillRadius, 2)));
    const n = fbm2(x / 70 + 3.1, z / 70 - 1.7, p.seed, 3) * p.amplitude + fbm2(x / 26, z / 26, p.seed + 9, 2) * p.amplitude * 0.22;
    const rim = p.rimRise * smoothstep(p.rimStart, p.rimStart * 2.3, r) * (0.75 + 0.5 * fbm2(x / 90, z / 90, p.seed + 4, 2));
    return dome + n + rim;
  };
  const n0 = raw(0, 0);
  return (x: number, z: number) => {
    const r = Math.hypot(x, z);
    const k = smoothstep(p.plateau, p.plateau * 2.2, r);
    return (raw(x, z) - n0) * k + (1 - k) * 0;
  };
};
/** Default-option height function. */
export const hillsHeight = makeHillsHeight();

export type HillPalette = {low: string; mid: string; high: string; tip: string};
export const HILL_PALETTES: Record<'day' | 'sunrise' | 'dusk' | 'night', HillPalette> = {
  day: {low: '#1f8a1c', mid: '#39b82a', high: '#6fdc3a', tip: '#b6f25a'},
  sunrise: {low: '#2a7a26', mid: '#4aa832', high: '#8ccf44', tip: '#e2e86a'},
  dusk: {low: '#1a4a2a', mid: '#2f6a32', high: '#5a8a3a', tip: '#9a9a4a'},
  night: {low: '#0f3424', mid: '#195034', high: '#27703f', tip: '#3a8a4c'},
};

export type RollingHillsProps = GroupProps & HillsOpts & {
  size?: number;
  segments?: number;
  palette?: keyof typeof HILL_PALETTES | HillPalette;
  grass?: number;
  flowers?: number;
  /** [inner, outer] scatter radius for grass & flowers */
  scatter?: [number, number];
  /** rectangles [x0, z0, x1, z1] (world) kept free of tufts, e.g. the house footprint / path */
  avoid?: [number, number, number, number][];
  /** grid density bias toward the centre (1 = uniform) */
  centreBias?: number;
};

const HILL_GRADIENT = (() => {
  const steps = [0.55, 0.78, 0.92, 1.0];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = Math.round(v * 255);
    data[i * 4 + 3] = 255;
  });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const DEFAULT_AVOID: [number, number, number, number][] = [[-5, -4.5, 5, 7.2], [-2.4, 6, -0.8, 10.6], [4.3, -3, 7.7, 11]];

export const RollingHills: React.FC<RollingHillsProps> = ({
  size = 600, segments = 150, palette = 'day', grass = 2600, flowers = 700, scatter = [7, 52], avoid = DEFAULT_AVOID, centreBias = 1.55,
  seed, amplitude, drop, hillRadius, plateau, rimRise, rimStart, ...g
}) => {
  const opts: HillsOpts = {seed, amplitude, drop, hillRadius, plateau, rimRise, rimStart};
  const optKey = JSON.stringify(opts);
  const pal = typeof palette === 'string' ? HILL_PALETTES[palette] : palette;
  const palKey = JSON.stringify(pal);
  const height = useMemo(() => makeHillsHeight(opts), [optKey]);

  const geo = useMemo(() => {
    const half = size / 2;
    const N = segments;
    const coord = (i: number) => {
      const u = (i / N) * 2 - 1;
      return Math.sign(u) * Math.pow(Math.abs(u), centreBias) * half;
    };
    const xs = Array.from({length: N + 1}, (_, i) => coord(i));
    const tris: number[] = [];
    const cols: number[] = [];
    const cLow = new THREE.Color(pal.low), cMid = new THREE.Color(pal.mid), cHigh = new THREE.Color(pal.high), cTip = new THREE.Color(pal.tip);
    const tmp = new THREE.Color();
    const sd = seed ?? 1;
    const pushTri = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number, fi: number) => {
      const ay = height(ax, az), by = height(bx, bz), cy = height(cx, cz);
      tris.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      // colour by height + facing (sun-ish from +x+z) + per-facet jitter
      const my = (ay + by + cy) / 3;
      const e1 = new THREE.Vector3(bx - ax, by - ay, bz - az), e2 = new THREE.Vector3(cx - ax, cy - ay, cz - az);
      const nrm = e2.cross(e1).normalize();
      if (nrm.y < 0) nrm.negate();
      const t = smoothstep(-12, 14, my);
      if (t < 0.5) tmp.copy(cLow).lerp(cMid, t * 2);
      else tmp.copy(cMid).lerp(cHigh, (t - 0.5) * 2);
      const crest = smoothstep(0.985, 1.0, nrm.y) * smoothstep(-3, 8, my) * 0.35;
      tmp.lerp(cTip, crest);
      const j = (hash1(fi, sd + 77) - 0.5) * 0.07;
      tmp.offsetHSL(j * 0.25, 0, j);
      for (let k = 0; k < 3; k++) cols.push(tmp.r, tmp.g, tmp.b);
    };
    let fi = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x0 = xs[i], x1 = xs[i + 1], z0 = xs[j], z1 = xs[j + 1];
      // alternate diagonal for a less gridded look
      if ((i + j) % 2 === 0) {
        pushTri(x0, z0, x0, z1, x1, z0, fi++);
        pushTri(x1, z0, x0, z1, x1, z1, fi++);
      } else {
        pushTri(x0, z0, x0, z1, x1, z1, fi++);
        pushTri(x0, z0, x1, z1, x1, z0, fi++);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geom.computeVertexNormals();
    return geom;
  }, [size, segments, optKey, palKey, centreBias]);

  const mat = useMemo(() => new THREE.MeshToonMaterial({vertexColors: true, gradientMap: HILL_GRADIENT}), []);

  // ---- grass tufts & flowers (instanced)
  const tuftGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const b = new THREE.ConeGeometry(0.045, 0.32 + i * 0.05, 3, 1);
      b.translate(0, (0.32 + i * 0.05) / 2, 0);
      b.rotateZ((i - 1.5) * 0.28);
      b.rotateY(i * 1.7);
      b.translate((i - 1.5) * 0.04, 0, ((i * 7) % 3 - 1) * 0.03);
      parts.push(b.toNonIndexed());
    }
    const m = mergeGeometries(parts)!;
    m.computeVertexNormals();
    return m;
  }, []);
  const flowerGeo = useMemo(() => {
    const sh = new THREE.Shape();
    const n = 5, R = 0.075, r = 0.022;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2;
      const p0 = [Math.cos(a0) * r, Math.sin(a0) * r];
      if (i === 0) sh.moveTo(p0[0], p0[1]);
      sh.bezierCurveTo(Math.cos(a0 + 0.15) * R * 1.3, Math.sin(a0 + 0.15) * R * 1.3, Math.cos(a2 - 0.15) * R * 1.3, Math.sin(a2 - 0.15) * R * 1.3, Math.cos(a2) * r, Math.sin(a2) * r);
      void a1;
    }
    const head = new THREE.ExtrudeGeometry(sh, {depth: 0.012, bevelEnabled: false, curveSegments: 4});
    head.rotateX(-Math.PI / 2 + 0.75); // tilt the face toward +z so it reads as a flower from low cameras
    head.translate(0, 0.2, 0.01);
    const stem = new THREE.CylinderGeometry(0.008, 0.008, 0.2, 3);
    stem.translate(0, 0.1, 0);
    const hN = head.index ? head.toNonIndexed() : head;
    const sN = stem.toNonIndexed();
    const col = (g: THREE.BufferGeometry, c: [number, number, number]) => {
      const n = g.getAttribute('position').count;
      const a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) a.set(c, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      g.deleteAttribute('uv');
      g.deleteAttribute('normal');
      return g;
    };
    const m = mergeGeometries([col(hN, [1, 1, 1]), col(sN, [0.25, 0.75, 0.25])])!;
    m.computeVertexNormals();
    return m;
  }, []);
  const centreGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.024, 0);
    g.scale(1, 1, 0.6);
    g.rotateX(0.75);
    g.translate(0, 0.21, 0.018);
    return g;
  }, []);
  const centreRef = React.useRef<THREE.InstancedMesh>(null);
  const grassMat = useMemo(() => new THREE.MeshToonMaterial({color: '#ffffff', gradientMap: HILL_GRADIENT}), []);
  const flowerMat = useMemo(() => new THREE.MeshToonMaterial({color: '#ffffff', vertexColors: true, gradientMap: HILL_GRADIENT, emissive: '#1a1a1a', side: THREE.DoubleSide}), []);
  const centreMat = useMemo(() => new THREE.MeshToonMaterial({color: palette === 'night' ? '#c8b060' : '#ffc21a', gradientMap: HILL_GRADIENT}), [palette]);

  const avoidKey = JSON.stringify(avoid);
  const scatterPts = (count: number, salt: number) => {
    const out: {x: number; z: number; r: number; s: number; k: number}[] = [];
    let i = 0, guard = 0;
    while (out.length < count && guard < count * 6) {
      guard++;
      i++;
      const a = hash1(i, salt) * Math.PI * 2;
      const rr = Math.sqrt(scatter[0] * scatter[0] + hash1(i, salt + 1) * (scatter[1] * scatter[1] - scatter[0] * scatter[0]));
      // clump: use noise to thin out some areas
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const clump = hash2(Math.floor(x / 3), Math.floor(z / 3), salt + 5);
      if (clump < 0.25) continue;
      if (avoid.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) continue;
      out.push({x, z, r: hash1(i, salt + 2) * 6.28, s: 0.7 + hash1(i, salt + 3) * 0.8, k: hash1(i, salt + 4)});
    }
    return out;
  };
  const grassRef = React.useRef<THREE.InstancedMesh>(null);
  const flowerRef = React.useRef<THREE.InstancedMesh>(null);
  const grassPts = useMemo(() => scatterPts(grass, 501), [grass, scatter[0], scatter[1], avoidKey]);
  const flowerPts = useMemo(() => scatterPts(flowers, 901), [flowers, scatter[0], scatter[1], avoidKey]);
  const grassCols = useMemo(
    () => [new THREE.Color(pal.mid), new THREE.Color(pal.high), new THREE.Color(pal.mid).lerp(new THREE.Color(pal.tip), 0.4), new THREE.Color(pal.low).lerp(new THREE.Color(pal.mid), 0.5)],
    [palKey],
  );
  const flowerCols = useMemo(
    () => (palette === 'night' ? ['#8a9ad8', '#c8b0e8', '#a8c8f0'] : ['#ffffff', '#ff8fd0', '#ffffff', '#c8a8ff', '#ff6fa8', '#ffffff']).map((c) => new THREE.Color(c)),
    [palette],
  );
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    const gm = grassRef.current;
    if (gm) {
      grassPts.forEach((pt, i) => {
        p.set(pt.x, height(pt.x, pt.z) - 0.02, pt.z);
        q.setFromEuler(e.set(0, pt.r, 0));
        s.setScalar(pt.s);
        m.compose(p, q, s);
        gm.setMatrixAt(i, m);
        gm.setColorAt(i, grassCols[Math.floor(pt.k * grassCols.length)]);
      });
      gm.count = grassPts.length;
      gm.instanceMatrix.needsUpdate = true;
      if (gm.instanceColor) gm.instanceColor.needsUpdate = true;
      gm.computeBoundingSphere();
    }
    const fm = flowerRef.current;
    if (fm) {
      flowerPts.forEach((pt, i) => {
        p.set(pt.x, height(pt.x, pt.z) - 0.02, pt.z);
        q.setFromEuler(e.set(0, pt.r, 0));
        s.setScalar(0.8 + pt.s * 0.5);
        m.compose(p, q, s);
        fm.setMatrixAt(i, m);
        fm.setColorAt(i, flowerCols[Math.floor(pt.k * flowerCols.length)]);
        centreRef.current?.setMatrixAt(i, m);
      });
      if (centreRef.current) {
        centreRef.current.count = flowerPts.length;
        centreRef.current.instanceMatrix.needsUpdate = true;
        centreRef.current.computeBoundingSphere();
      }
      fm.count = flowerPts.length;
      fm.instanceMatrix.needsUpdate = true;
      if (fm.instanceColor) fm.instanceColor.needsUpdate = true;
      fm.computeBoundingSphere();
    }
  }, [grassPts, flowerPts, height, grassCols, flowerCols]);

  return (
    <group {...g}>
      <mesh geometry={geo} material={mat} receiveShadow />
      {grass > 0 ? <instancedMesh ref={grassRef} args={[tuftGeo, grassMat, Math.max(1, grass)]} frustumCulled={false} /> : null}
      {flowers > 0 ? <instancedMesh ref={flowerRef} args={[flowerGeo, flowerMat, Math.max(1, flowers)]} frustumCulled={false} /> : null}
      {flowers > 0 ? <instancedMesh ref={centreRef} args={[centreGeo, centreMat, Math.max(1, flowers)]} frustumCulled={false} /> : null}
    </group>
  );
};
