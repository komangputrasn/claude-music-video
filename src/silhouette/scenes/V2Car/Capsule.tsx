/**
 * <Capsule> — the car of the TERMS cut: a smooth black pod (a superellipsoid, no brand cues, no visible wheels) with a
 * wrap-around glass band, a gull-wing door, a frost-white seat inside, and the TENURE iris on its tail. Local to V2Car.
 *
 *   <Capsule time seatGlow? frost? door? doorSide? iris? irisOpen? readout? rim? cabinGlow? frontGlow? seatBack?
 *            headlights? interior? {...group}>{driver}</Capsule>
 *
 *   Frame: origin on the road under the pod's centre, the nose toward +Z (like every character/prop in this repo).
 *   Geometry: ring slices of a superellipsoid (exact horizontal glass-band edges, 4 pillars), then a "sleek" deform
 *   (greenhouse narrows upward, roof drops toward the nose). Body material is double-sided so the wet-ground mirror
 *   pass never sees into the cabin.
 *   seatGlow  0..1 the seat glows frost-white (the cold light from below: THERMAL TIER not on plan).
 *   frost     0..1 frost settles where the glass is seen at a grazing angle; a clear strip down the front-centre of
 *             the canopy keeps it (and the sheen) off the driver's silhouette.
 *   headlights 0..1 two bone slits on the nose + a soft wedge of light on the road ahead (local NaN-safe decal).
 *   door      0..1 the gull-wing door on side `doorSide` (local x sign) lifts about the roof edge.
 *   iris      0..1 brightness of the red TENURE iris on the tail (+ thin red ring around the tail).
 *   readout   show the red "THERMAL TIER" readout strip on the nose (shot 1).
 *   frontGlow 0..1 the seat's cold light caught in the frosted front of the cabin: a soft frost-white glow just behind
 *             the yoke, facing the TAIL. Seen from behind, the driver's head and shoulders stand black against it.
 *   seatBack  height scale of the seat back (1 = full back + headrest). Below 1 the headrest is dropped and the back
 *             ends lower: 0.5 puts its top below his shoulders, so a camera behind the pod sees his bust over it.
 *   children  render in pod space: put the seated driver at CAPSULE.seatRoot with guySitOn(CAPSULE.seatH).
 * Pure function of props; geometry/textures cached at module level; materials per instance, uniforms set in
 * useLayoutEffect.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {S, SFONTS} from '../../lib/palette';
import {makeSilhouetteMaterial, setSilhouetteUniforms, RimOpts} from '../../lib/Silhouette';
import {Iris} from '../../lib/Iris';
import {atmosNoise} from '../../lib/atmos';
import {LaserLines} from '../../lib/sets';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

// ------------------------------------------------------------------------------------------------ dimensions
const L = 4.4;
const W = 1.86;
const H = 1.6;
const CLEAR = 0.12;
const NX = 2.2; // cross-section exponent (rounded)
const NZ = 2.3; // lengthwise exponent (blunt pill)
const A = W / 2;
const B = (H - CLEAR) / 2;
const C = L / 2;
const YC = CLEAR + B;
const BELT = 0.97;
const ROOF = 1.5;

export const CAPSULE = {
  length: L,
  width: W,
  height: H,
  belt: BELT,
  roof: ROOF,
  /** cabin floor height (pod space) */
  floor: 0.2,
  /** seat surface height above the cabin floor (pass to guySitOn) */
  seatH: 0.25,
  /** SilGuy root for the seated driver (pod space, facing +Z) */
  seatRoot: [0, 0.2, -0.12] as [number, number, number],
  /** tail centre (the iris) */
  tail: [0, YC, -C] as [number, number, number],
  /** nose readout centre */
  nose: [0, 0.77, C] as [number, number, number],
  /** door hinge (roof edge) for side +1; mirror x for side -1 */
  hinge: [0.45, ROOF, 0] as [number, number, number],
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** implicit superellipsoid: < 0 inside */
const F = (x: number, y: number, z: number) =>
  Math.pow(Math.pow(Math.abs(x / A), NX) + Math.pow(Math.abs((y - YC) / B), NX), NZ / NX) + Math.pow(Math.abs(z / C), NZ) - 1;
/** radius along a unit direction (dx, dy, dz) from (0, y0, 0) to the surface */
const solveR = (y0: number, dx: number, dy: number, dz: number, rMax: number) => {
  let lo = 0;
  let hi = rMax;
  if (F(0, y0, 0) >= 0) return 0;
  for (let k = 0; k < 30; k++) {
    const m = (lo + hi) / 2;
    if (F(m * dx, y0 + m * dy, m * dz) < 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};
/** sleek the pill: the greenhouse narrows toward the top, the upper surface drops toward the nose */
const deform = (x: number, y: number, z: number): [number, number, number] => {
  const yr = (y - YC) / B;
  const zr = z / C;
  const up = Math.max(0, yr);
  const nx = x * (1 - 0.17 * up * up);
  const ny = yr > 0 ? YC + (y - YC) * (1 - 0.3 * smoothstep(0.1, 1, zr) - 0.12 * smoothstep(0.3, 1, -zr)) : y;
  return [nx, ny, z];
};

/** side elevation of the pod at x = 0 (deformed), as [z, y] points around the outline — for the patent drawing */
export const capsuleProfile = (n = 120): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const th = (2 * Math.PI * i) / n;
    const dz = Math.cos(th), dy = Math.sin(th);
    const r = solveR(YC, 0, dy, dz, C * 1.01);
    const p = deform(0, YC + r * dy, r * dz);
    out.push([p[2], p[1]]);
  }
  return out;
};
/** half-length of the pod at height y (x = 0): the z extent of a horizontal line across the side elevation */
export const capsuleHalfLength = (y: number) => C * Math.pow(Math.max(0, 1 - Math.pow(Math.abs((y - YC) / B), NZ)), 1 / NZ);
/** pod-space point after the sleek deformation (for drawing lines that hug the pod) */
export const capsuleDeform = (x: number, y: number, z: number) => deform(x, y, z);

type Part = 'body' | 'glass' | 'doorBody' | 'doorGlass';
const NU = 128;
const DOOR_I = 9; // door spans ±DOOR_I columns around the door side (≈ z ±0.94)
const DOOR_Y = 0.32;
/** A/C pillars (columns): front corners at the nose ± 0.79 rad, rear corners likewise */
const PILLARS = [16, 48, 80, 112];

const buildPod = (doorSide: 1 | -1) => {
  // ring levels (sin-spaced for smooth poles) + the exact glass-band and door edges
  const levels: number[] = [];
  const NV = 56;
  for (let j = 0; j <= NV; j++) levels.push(YC + B * Math.sin(-Math.PI / 2 + (Math.PI * j) / NV));
  for (const y of [BELT, ROOF, DOOR_Y]) levels.push(y);
  levels.sort((a, b) => a - b);
  const ys = levels.filter((y, k) => k === 0 || y - levels[k - 1] > 0.004);
  const pos: number[] = [];
  const uvs: number[] = [];
  ys.forEach((y, j) => {
    for (let i = 0; i <= NU; i++) {
      const psi = (2 * Math.PI * i) / NU;
      let dx = A * Math.cos(psi);
      let dz = C * Math.sin(psi);
      const n = Math.hypot(dx, dz);
      dx /= n;
      dz /= n;
      const r = solveR(y, dx, 0, dz, C * 1.01);
      pos.push(...deform(r * dx, y, r * dz));
      uvs.push(i / NU, j / (ys.length - 1));
    }
  });
  const idx: Record<Part, number[]> = {body: [], glass: [], doorBody: [], doorGlass: []};
  const sideI = doorSide > 0 ? 0 : NU / 2;
  for (let j = 0; j < ys.length - 1; j++) {
    const y0 = ys[j], y1 = ys[j + 1];
    const glass = y0 >= BELT - 1e-6 && y1 <= ROOF + 1e-6;
    for (let i = 0; i < NU; i++) {
      const di = ((i - sideI + NU + NU / 2) % NU) - NU / 2; // signed column offset from the door side
      const door = di >= -DOOR_I && di < DOOR_I && y0 >= DOOR_Y - 1e-6 && y1 <= ROOF + 1e-6;
      const pillar = PILLARS.some((c) => i >= c - 1 && i < c + 1);
      const isGlass = glass && !pillar;
      const part: Part = door ? (isGlass ? 'doorGlass' : 'doorBody') : isGlass ? 'glass' : 'body';
      const a = j * (NU + 1) + i;
      const b = a + 1;
      const c = a + (NU + 1);
      const d = c + 1;
      idx[part].push(a, c, b, b, c, d); // outward normals
    }
  }
  const mk = (ix: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(ix);
    g.computeVertexNormals();
    return g;
  };
  return {body: mk(idx.body), glass: mk(idx.glass), doorBody: mk(idx.doorBody), doorGlass: mk(idx.doorGlass)};
};
const podCache = new Map<number, ReturnType<typeof buildPod>>();
const getPod = (side: 1 | -1) => {
  let g = podCache.get(side);
  if (!g) podCache.set(side, (g = buildPod(side)));
  return g;
};

/** a closed ring around the pod's cross-section at z (slightly proud of the surface) */
const ringGeo = (z: number, r = 0.012) => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 64; i++) {
    const al = (2 * Math.PI * i) / 64;
    const dx = Math.cos(al), dy = Math.sin(al);
    const rr = solveR(YC, dx, dy, 0, B * 1.5) + 0.0;
    const zz = z;
    // solve on the plane z = const: scale the direction until F = 0
    let lo = 0, hi = 2;
    for (let k = 0; k < 30; k++) {
      const m = (lo + hi) / 2;
      if (F(m * dx, YC + m * dy, zz) < 0) lo = m;
      else hi = m;
    }
    void rr;
    const p = deform(lo * dx * 1.015, YC + lo * dy * 1.015, zz);
    pts.push(new THREE.Vector3(...p));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.TubeGeometry(curve, 128, r, 6, true);
};
let tailRing: THREE.TubeGeometry | null = null;

// ------------------------------------------------------------------------------------------------ glass
// Dark glass with a fresnel sheen (the canopy reads by its grazing edges, the windshield head-on stays clear), and a
// frost that settles where the glass is seen at a grazing angle — never over the driver's silhouette.
const GLASS_VERT = /* glsl */ `
varying vec3 vP;
varying vec3 vN;
varying vec3 vV;
#include <common>
#include <fog_pars_vertex>
void main() {
  vP = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const GLASS_FRAG = /* glsl */ `
uniform sampler2D uNoise;
uniform float uFrost, uTint, uSheenA;
uniform vec3 uFrostCol, uSheen;
varying vec3 vP;
varying vec3 vN;
varying vec3 vV;
#include <common>
#include <fog_pars_fragment>
void main() {
  // max(): |dot| of two unit vectors can round past 1 face-on; pow() of a negative base is NaN under ANGLE/D3D11
  float fres = pow(max(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0), 2.2);
  vec2 q = vec2(vP.z * 0.55 + vP.x * 0.35, vP.y * 0.9);
  float n = texture2D(uNoise, q * 0.9).r * 0.6 + texture2D(uNoise, q * 3.1 + 0.37).g * 0.4;
  float grain = texture2D(uNoise, q * 9.0).a;
  float m = uFrost * smoothstep(0.3, 0.75, fres + (n - 0.5) * 0.45);
  // keep a clear strip down the front-centre of the canopy: the sloped windshield in front of the driver's head is
  // otherwise frosted enough to veil his silhouette grey (shot 1 looks at him through it)
  float frontC = smoothstep(-0.2, 0.25, vP.z) * (1.0 - smoothstep(0.3, 0.62, abs(vP.x)));
  m *= 1.0 - frontC;
  float cryst = 0.5 + 0.5 * smoothstep(0.35, 0.9, grain * 0.7 + n * 0.5);
  vec3 col = uSheen * fres * (1.0 - 0.7 * frontC);
  float a = uTint + fres * uSheenA;
  col = mix(col, uFrostCol * cryst, m);
  a = mix(a, 0.55, m);
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
}`;

const makeGlassMat = () =>
  new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uNoise: {value: null},
        uFrost: {value: 0},
        uTint: {value: 0.22},
        uSheenA: {value: 0.55},
        uSheen: {value: new THREE.Color(0.26, 0.26, 0.27)},
        uFrostCol: {value: new THREE.Color(1, 1, 1)},
      },
    ]),
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });

// headlight slits: two short lines hugging the nose at y = 0.56 (pod space)
const HEADLIGHTS = (() => {
  const segs: [[number, number, number], [number, number, number]][] = [];
  const y = 0.56;
  for (const s of [-1, 1]) {
    let prev: [number, number, number] | null = null;
    for (let k = 0; k <= 6; k++) {
      const psi = Math.PI / 2 - s * (0.1 + (0.42 * k) / 6);
      let dx = A * Math.cos(psi), dz = C * Math.sin(psi);
      const n = Math.hypot(dx, dz);
      dx /= n;
      dz /= n;
      const r = solveR(y + 0.035 * k / 6, dx, 0, dz, C * 1.01) + 0.012;
      const p = deform(r * dx, y + (0.035 * k) / 6, r * dz);
      if (prev) segs.push([prev, p]);
      prev = p;
    }
  }
  return segs;
})();

// ------------------------------------------------------------------------------------------------ seat (frost glow)
let frostTex: THREE.CanvasTexture | null = null;
const hash = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const getFrostTex = () => {
  if (frostTex) return frostTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  // cold light rising from below: brighter at the bottom of every seat part
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#9a9da1');
  gr.addColorStop(1, '#ffffff');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  // frost feathers: short branching strokes
  g.lineCap = 'round';
  for (let i = 0; i < 220; i++) {
    const x = hash(i, 1) * 256;
    const y = hash(i, 2) * 256;
    const ang = hash(i, 3) * Math.PI * 2;
    const len = 6 + hash(i, 4) * 22;
    g.strokeStyle = `rgba(255,255,255,${0.25 + 0.5 * hash(i, 5)})`;
    g.lineWidth = 0.6 + hash(i, 6) * 1.1;
    g.beginPath();
    g.moveTo(x, y);
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    g.lineTo(ex, ey);
    for (let b = 1; b <= 3; b++) {
      const t = b / 4;
      const bx = x + (ex - x) * t, by = y + (ey - y) * t;
      const bl = len * 0.35 * (1 - t * 0.5);
      for (const s of [-1, 1]) {
        g.moveTo(bx, by);
        g.lineTo(bx + Math.cos(ang + s * 0.7) * bl, by + Math.sin(ang + s * 0.7) * bl);
      }
    }
    g.stroke();
  }
  frostTex = new THREE.CanvasTexture(c);
  frostTex.colorSpace = THREE.SRGBColorSpace;
  frostTex.wrapS = frostTex.wrapT = THREE.RepeatWrapping;
  return frostTex;
};

type SeatGeo = {cushion: THREE.BufferGeometry; back: THREE.BufferGeometry; head: THREE.BufferGeometry};
let seatGeo: SeatGeo | null = null;
const getSeatGeo = (): SeatGeo =>
  (seatGeo ??= {
    cushion: new RoundedBoxGeometry(0.72, 0.14, 0.56, 3, 0.05),
    back: new RoundedBoxGeometry(0.92, 0.8, 0.13, 3, 0.07),
    head: new RoundedBoxGeometry(0.62, 0.3, 0.12, 3, 0.06),
  });

// ------------------------------------------------------------------------------------------------ nose readout
let readoutTex: THREE.CanvasTexture | null = null;
const getReadoutTex = () => {
  if (readoutTex) return readoutTex;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 1024, 192);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  (g as unknown as {letterSpacing: string}).letterSpacing = '14px';
  g.font = `600 92px ${SFONTS.futura}`;
  g.fillStyle = '#ff2a1f';
  g.fillText('THERMAL TIER', 512, 104);
  (g as unknown as {letterSpacing: string}).letterSpacing = '6px';
  g.font = `400 30px ${SFONTS.mono}`;
  g.fillStyle = '#c9c6bf';
  g.fillText('SEAT HEAT  0 %  ·  NOT ON PLAN', 512, 150);
  // thermometer bar at zero
  g.strokeStyle = '#ff2a1f';
  g.lineWidth = 3;
  g.strokeRect(212, 166, 600, 12);
  g.fillStyle = '#ff2a1f';
  g.fillRect(212, 166, 10, 12);
  readoutTex = new THREE.CanvasTexture(c);
  readoutTex.colorSpace = THREE.SRGBColorSpace;
  return readoutTex;
};

// ------------------------------------------------------------------------------------------------ component
export type CapsuleProps = GroupProps & {
  time: number;
  seatGlow?: number;
  frost?: number;
  door?: number;
  doorSide?: 1 | -1;
  iris?: number;
  irisOpen?: number;
  readout?: number;
  rim?: RimOpts | null;
  /** extra cold haze inside the cabin behind the driver (0..1) */
  cabinGlow?: number;
  /** 0..1 frost-white glow in the front of the cabin, facing the tail (a backdrop for the driver seen from behind) */
  frontGlow?: number;
  /** seat-back height scale (1 = full back + headrest; < 1 drops the headrest) */
  seatBack?: number;
  /** hide the interior (far shots) */
  interior?: boolean;
  /** 0..1 the two headlight slits on the nose (+ their light on the road ahead) */
  headlights?: number;
  children?: React.ReactNode;
};

export const Capsule: React.FC<CapsuleProps> = ({
  time, seatGlow = 0, frost = 0, door = 0, doorSide = 1, iris = 0, irisOpen = 1, readout = 0, rim = null, cabinGlow = 0,
  frontGlow = 0, seatBack = 1, interior = true, headlights = 0, children, ...group
}) => {
  const pod = getPod(doorSide);
  const seat = getSeatGeo();
  tailRing ??= ringGeo(-C * 0.9, 0.014);
  const mats = useMemo(() => {
    const body = makeSilhouetteMaterial(S.void, rim, true);
    // double-sided: the wet-ground mirror pass must not see into the cabin through culled faces
    body.side = THREE.DoubleSide;
    const glass = makeGlassMat();
    glass.uniforms.uNoise.value = atmosNoise(7);
    const seatM = new THREE.MeshBasicMaterial({map: getFrostTex(), color: new THREE.Color(0, 0, 0), fog: true, toneMapped: true});
    const dark = new THREE.MeshBasicMaterial({color: S.void, fog: true});
    const red = new THREE.MeshBasicMaterial({color: S.authRed, fog: true, toneMapped: true});
    const read = new THREE.MeshBasicMaterial({map: getReadoutTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true});
    const haze = new THREE.MeshBasicMaterial({map: hazeTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, color: 0});
    const front = new THREE.MeshBasicMaterial({map: glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, color: 0});
    // headlight spill on the road ahead (local: the lib FloorGlow wedge can produce NaN at its far edge → black frames)
    const beam = new THREE.MeshBasicMaterial({map: beamTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      fog: true, color: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
    return {body, glass, seatM, dark, red, read, haze, front, beam};
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useLayoutEffect(() => {
    setSilhouetteUniforms(mats.body, {color: S.void, rim});
    mats.glass.uniforms.uFrost.value = frost;
    mats.glass.uniforms.uFrostCol.value.setScalar(0.35 + 0.3 * seatGlow);
    // the seat: a frost-white light source, kept under bloom (big surface behind the hero): peak texel 1.0 × 0.82 stays
    // below SilStage's 0.86 threshold, so it does not spread a grey veil over the driver's silhouette
    mats.seatM.color.setScalar(0.04 + 0.78 * seatGlow);
    mats.red.color.set(S.authRed).multiplyScalar(0.2 + 1.2 * iris);
    // ≤ ~0.9 linear: brighter, ACES desaturates the thin red letters toward coral
    mats.read.color.setScalar(readout * 0.78);
    mats.haze.color.setScalar(0.3 * cabinGlow * seatGlow);
    // seen through the tinted rear glass (×0.78) it stays under the 0.86 bloom threshold: no veil over his head
    mats.front.color.setScalar(0.95 * frontGlow);
    mats.beam.color.setScalar(0.24 * headlights);
  });
  const theta = door * 1.25 * doorSide;
  const hinge: [number, number, number] = [CAPSULE.hinge[0] * doorSide, CAPSULE.hinge[1], CAPSULE.hinge[2]];
  const back = useMemo(() => new THREE.Euler(-0.16, 0, 0), []);
  return (
    <group {...group}>
      <mesh geometry={pod.body} material={mats.body} />
      <mesh geometry={pod.glass} material={mats.glass} renderOrder={3} />
      <group position={hinge} rotation-z={theta}>
        <group position={[-hinge[0], -hinge[1], -hinge[2]]}>
          <mesh geometry={pod.doorBody} material={mats.body} />
          <mesh geometry={pod.doorGlass} material={mats.glass} renderOrder={3} />
        </group>
      </group>
      {interior ? (
        <group>
          {/* cabin floor, dash and yoke (black) */}
          <mesh material={mats.dark} position={[0, 0.2, 0.1]}>
            <boxGeometry args={[1.1, 0.05, 2.4]} />
          </mesh>
          <mesh material={mats.dark} position={[0, 0.66, 1.08]} rotation-x={0.35}>
            <boxGeometry args={[1.45, 0.5, 0.5]} />
          </mesh>
          <mesh material={mats.dark} position={[0, 0.93, 0.62]} rotation-x={-1.1}>
            <torusGeometry args={[0.15, 0.02, 6, 24, Math.PI * 1.2]} />
          </mesh>
          {/* the seat (frost-white light) */}
          <mesh geometry={seat.cushion} material={mats.seatM} position={[0, 0.39, -0.14]} />
          <group position={[0, 0.44, -0.44]} rotation={back}>
            <mesh geometry={seat.back} material={mats.seatM} position={[0, 0.03 + 0.4 * seatBack, 0]} scale={[1, seatBack, 1]} />
            {seatBack >= 1 ? <mesh geometry={seat.head} material={mats.seatM} position={[0, 0.97, 0.01]} /> : null}
          </group>
          {/* the cold light caught in the front of the cabin, facing the tail (shot 2 sees him against it) */}
          {frontGlow > 0 ? (
            <mesh material={mats.front} position={[0, 1.08, 0.8]} rotation-y={Math.PI} scale={[1.25, 0.9, 1]}>
              <planeGeometry />
            </mesh>
          ) : null}
          {/* cold haze in the cabin, behind the driver */}
          {cabinGlow > 0 ? (
            <mesh material={mats.haze} position={[0, 0.95, -0.55]} scale={[1.6, 1.1, 1]}>
              <planeGeometry />
            </mesh>
          ) : null}
          {children}
        </group>
      ) : (
        children
      )}
      {headlights > 0.001 ? (
        <>
          <LaserLines segments={HEADLIGHTS} color={S.bone} intensity={0.95 * headlights} width={0.016} minPx={1.3} halo={2.2} fog={0.4} />
          <mesh material={mats.beam} position={[0, 0.004, C - 0.2 + 4.5]} rotation={[-Math.PI / 2, 0, Math.PI]} scale={[3.4, 9, 1]} renderOrder={2}>
            <planeGeometry />
          </mesh>
        </>
      ) : null}
      {/* TENURE on the tail: the red iris and a thin red ring */}
      <mesh geometry={tailRing} material={mats.red} />
      {iris > 0.001 ? (
        <Iris position={[0, YC + 0.02, -C - 0.012]} rotation-y={Math.PI} radius={0.17} time={time} open={irisOpen}
          intensity={0.5 + 1.0 * iris} glow={0.25 + 0.35 * iris} />
      ) : null}
      {readout > 0.001 ? (
        <mesh material={mats.read} position={[0, 0.77, C + 0.012]} scale={[1.3, 0.244, 1]} renderOrder={4}>
          <planeGeometry />
        </mesh>
      ) : null}
    </group>
  );
};

let beamT: THREE.CanvasTexture | null = null;
/** soft wedge of light: bright at the near (source) edge (canvas bottom), widening and fading forward */
function beamTex() {
  if (beamT) return beamT;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d')!;
  const img = g.createImageData(128, 256);
  for (let y = 0; y < 256; y++) {
    const k = 1 - y / 255; // 0 at the bottom (source) .. 1 at the far end
    const hw = 0.35 + 0.65 * k;
    for (let x = 0; x < 128; x++) {
      const e = Math.abs(x / 63.5 - 1) / hw;
      const side = e >= 1 ? 0 : 1 - e * e * (3 - 2 * e);
      const along = Math.pow(Math.max(0, 1 - k), 1.6) * Math.min(1, k / 0.04);
      const v = Math.round(255 * Math.max(0, Math.min(1, side * along)));
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  beamT = new THREE.CanvasTexture(c);
  beamT.colorSpace = THREE.SRGBColorSpace;
  return beamT;
}

let glowT: THREE.CanvasTexture | null = null;
/** a soft frost-white panel: flat across the middle, feathered to black at every edge */
function glowTex() {
  if (glowT) return glowT;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d')!;
  const img = g.createImageData(128, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 128; x++) {
      const ex = Math.abs(x / 63.5 - 1), ey = Math.abs(y / 31.5 - 1);
      const fx = 1 - smoothstep(0.6, 1, ex), fy = 1 - smoothstep(0.6, 1, ey);
      const v = Math.round(255 * fx * fy);
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  glowT = new THREE.CanvasTexture(c);
  glowT.colorSpace = THREE.SRGBColorSpace;
  return glowT;
}

let hazeT: THREE.CanvasTexture | null = null;
function hazeTex() {
  if (hazeT) return hazeT;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 90, 0, 64, 90, 70);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  hazeT = new THREE.CanvasTexture(c);
  hazeT.colorSpace = THREE.SRGBColorSpace;
  return hazeT;
}
