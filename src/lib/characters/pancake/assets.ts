/**
 * Pancake assets — geometries, materials and canvas textures, built ONCE (lazily, on first render) and shared by every
 * <Pancake> instance. Pure construction, no animation state. Scale is baked into geometry so ink outlines stay even.
 *
 *   const A = pancakeAssets(); // inside useMemo
 */
import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {SK, COLLAR, V3} from './rig';

export const PANCAKE_COLORS = {
  gold: '#E9B25E',
  cream: '#FFF0D2',
  browned: '#C9813A',
  brow: '#8E5223',
  nose: '#2A1820',
  mouth: '#6E1A2E',
  tongue: '#FF7C9E',
  collar: '#E2231A',
  tag: '#FFC63D',
  ink: '#1B1030',
  blush: '#FF7FB0',
};

/** ellipsoid with baked radii */
export const ell = (r: V3, w = 16, h = 12) => new THREE.SphereGeometry(1, w, h).scale(r[0], r[1], r[2]);

/** tapered tube along a Catmull-Rom path; seamless (modular ring indexing) so ink outlines don't crack. */
export const taperTube = (pts: V3[], radius: (t: number) => number, tubular = 28, radial = 9) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const P = curve.getPointAt(t);
    const N = frames.normals[i], B = frames.binormals[i];
    const r = radius(t);
    for (let j = 0; j < radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const s = Math.sin(v), c = -Math.cos(v);
      pos.push(P.x + r * (c * N.x + s * B.x), P.y + r * (c * N.y + s * B.y), P.z + r * (c * N.z + s * B.z));
    }
  }
  for (let i = 0; i < tubular; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = (i + 1) * radial + j, c = (i + 1) * radial + ((j + 1) % radial), d = i * radial + ((j + 1) % radial);
      idx.push(a, b, d, b, c, d);
    }
  // end caps (fans)
  const capStart = pos.length / 3;
  const p0 = curve.getPointAt(0), p1 = curve.getPointAt(1);
  pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
  for (let j = 0; j < radial; j++) {
    idx.push(capStart, j, (j + 1) % radial);
    const base = tubular * radial;
    idx.push(capStart + 1, base + ((j + 1) % radial), base + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return {geometry: g, curve};
};

/** point on an axis-aligned ellipsoid surface at (x,y) on its front (+Z) side */
export const onEll = (c: V3, r: V3, x: number, y: number, lift = 0): V3 => {
  const u = (x - c[0]) / r[0], v = (y - c[1]) / r[1];
  const z = c[2] + r[2] * Math.sqrt(Math.max(0, 1 - u * u - v * v));
  return [x, y, z + lift];
};

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  draw(g);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** big glossy cartoon iris. puppy = larger, lighter, watery bottom. */
const irisTexture = (puppy: boolean) =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = '#0b0406';
    g.fillRect(0, 0, 256, 256);
    const cx = 128, cy = 134;
    const R = puppy ? 116 : 104;
    // iris body: warm brown, lighter toward the bottom (light passing through a wet eye)
    let grd = g.createRadialGradient(cx, cy + R * 0.45, R * 0.1, cx, cy, R);
    grd.addColorStop(0, puppy ? '#e0943f' : '#c47a34');
    grd.addColorStop(0.4, puppy ? '#8e4818' : '#7a3c14');
    grd.addColorStop(0.8, '#3a180a');
    grd.addColorStop(1, '#140608');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
    // pupil
    g.fillStyle = '#060203';
    g.beginPath();
    g.ellipse(cx, cy - 8, R * 0.46, R * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    // soft dark rim at the top (upper lid shadow)
    grd = g.createLinearGradient(0, 0, 0, 130);
    grd.addColorStop(0, 'rgba(0,0,0,0.85)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 130);
    if (puppy) {
      // watery reflection band low in the eye
      grd = g.createRadialGradient(cx, 236, 10, cx, 236, 110);
      grd.addColorStop(0, 'rgba(170,220,255,0.55)');
      grd.addColorStop(1, 'rgba(170,220,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 120, 256, 136);
    }
  });

const blobTexture = () =>
  canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.55, 'rgba(0,0,0,0.75)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

/** unit eye dome (radius 1, planar front UVs) */
const eyeGeometry = () => {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, p.getY(i) * 0.5 + 0.5);
  g.scale(1, 1.12, 0.5);
  return g;
};

/** bone-shaped dog tag (lies in the XY plane, faces +Z) */
const boneGeometry = () => {
  const parts: THREE.BufferGeometry[] = [];
  const shaft = new THREE.CapsuleGeometry(0.0085, 0.032, 4, 10).rotateZ(Math.PI / 2);
  parts.push(shaft);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) parts.push(new THREE.SphereGeometry(0.0115, 12, 8).translate(sx * 0.022, sy * 0.0085, 0));
  const g = mergeGeometries(parts)!;
  g.scale(1, 1, 0.42);
  return g;
};

/** floppy ear: teardrop (narrow at the root, wide & round at the tip), tip curls slightly outward (+x). Root at origin. */
const earGeometry = () => {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, 16, 14);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (1 - y) / 2; // 0 at root (top) .. 1 at tip (bottom)
    const w = 0.4 + 0.75 * Math.sin(Math.PI * Math.min(1, t * 0.78 + 0.12));
    p.setXYZ(i, x * 0.024 + 0.024 * t * t, -0.205 * t + 0.012, z * 0.054 * w);
  }
  g.computeVertexNormals();
  return g;
};

/** unit cartoon teardrop: round bottom, pointed top (y up), flattened in z */
const tearGeometry = () => {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, 16, 14);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = y > 0 ? Math.pow(1 - y, 0.9) : 1;
    p.setXYZ(i, x * k * 0.8, y > 0 ? y * 1.7 : y, z * k * 0.5);
  }
  g.computeVertexNormals();
  return g;
};

const tuft = (r: number, h: number) => new THREE.ConeGeometry(r, h, 7, 1).translate(0, h / 2, 0);

export type PancakeAssets = ReturnType<typeof buildAssets>;

const buildAssets = () => {
  const C = PANCAKE_COLORS;
  // --- body
  const torso = ell(SK.torso.r, 20, 14);
  const belly = ell([0.145, 0.1, 0.2], 16, 10);
  const chest = ell([0.15, 0.155, 0.13], 16, 12);
  const haunch = ell([0.1, 0.125, 0.135], 14, 10);
  const neck = ell([0.11, 0.13, 0.11], 14, 10);
  const collar = new THREE.TorusGeometry(COLLAR.R, COLLAR.tube, 8, 32);
  const tag = boneGeometry();
  const tagRing = new THREE.TorusGeometry(0.008, 0.0025, 6, 12);
  // --- legs
  const upperLeg = new THREE.CapsuleGeometry(0.052, SK.upper - 0.02, 4, 12).translate(0, -SK.upper / 2, 0);
  const lowerLeg = new THREE.CapsuleGeometry(0.045, SK.lower - 0.02, 4, 12).translate(0, -SK.lower / 2, 0);
  const paw = ell([0.058, 0.038, 0.072], 14, 10).translate(0, 0, 0.018);
  const toeLine = new THREE.CapsuleGeometry(0.0034, 0.02, 3, 6);
  // --- head
  const head = ell(SK.head.r, 24, 16);
  const muzzleC: V3 = [0, -0.05, 0.128], muzzleR: V3 = [0.094, 0.068, 0.088];
  const muzzle = ell(muzzleR, 18, 12);
  const jaw = ell([0.07, 0.036, 0.074], 14, 10);
  const mouthIn = ell([0.066, 0.04, 0.07], 12, 8);
  // tongue: root at origin, extends +Z, droops (bent) toward the tip
  const droop = (z: number) => -2.4 * z * z;
  let tongue: THREE.BufferGeometry = ell([0.031, 0.0095, 0.048], 14, 10).translate(0, 0, 0.044);
  tongue.deleteAttribute('uv');
  tongue.deleteAttribute('normal');
  tongue = mergeVertices(tongue);
  {
    const p = tongue.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + droop(Math.max(0, p.getZ(i))));
    tongue.computeVertexNormals();
  }
  const tongueLine = taperTube([0.014, 0.032, 0.05, 0.066].map((z) => [0, 0.0092 + droop(z), z] as V3), (t) => 0.0022 * (1 - t * 0.5), 10, 5).geometry;
  const nose = ell([0.036, 0.025, 0.026], 14, 10);
  const ear = earGeometry();
  const cheekTuft = tuft(0.03, 0.06);
  const headTuft = tuft(0.02, 0.066);
  const chestTuft = tuft(0.04, 0.085);
  const brow = ell([0.021, 0.0085, 0.012], 12, 8);
  // mouth "ω" + philtrum, conforming to the muzzle surface (head space)
  const mPts = (pts: [number, number][]) => pts.map(([x, y]) => onEll(muzzleC, muzzleR, x, y, 0.0015));
  const smile = taperTube(
    mPts([[-0.046, -0.058], [-0.036, -0.071], [-0.018, -0.076], [0, -0.066], [0.018, -0.076], [0.036, -0.071], [0.046, -0.058]]),
    (t) => 0.0042 * (0.55 + 0.45 * Math.sin(Math.PI * t)),
    24, 6,
  ).geometry;
  // sad puppy mouth: small downturned "︵" under the philtrum
  const frown = taperTube(
    mPts([[-0.04, -0.084], [-0.03, -0.077], [-0.015, -0.071], [0, -0.068], [0.015, -0.071], [0.03, -0.077], [0.04, -0.084]]),
    (t) => 0.004 * (0.55 + 0.45 * Math.sin(Math.PI * t)),
    24, 6,
  ).geometry;
  const philtrum = taperTube(mPts([[0, -0.012], [0, -0.04], [0, -0.066]]), () => 0.0036, 6, 6).geometry;
  // eyes (unit, scaled in their group)
  const eye = eyeGeometry();
  const hl = new THREE.CircleGeometry(1, 20);
  const arc = new THREE.TorusGeometry(0.62, 0.12, 6, 18, Math.PI);
  const wetArc = new THREE.TorusGeometry(0.8, 0.05, 4, 18, Math.PI * 0.55).rotateZ(Math.PI + Math.PI * 0.225);
  const blush = new THREE.CircleGeometry(1, 20);
  const tearDrop = tearGeometry();
  // --- tail (tail space: y up, base at origin, curls forward over the back)
  const tailPts: V3[] = [[0, 0, 0.02], [0, 0.06, -0.035], [0, 0.13, -0.045], [0, 0.19, -0.01], [0, 0.205, 0.045]];
  const tailTipPts: V3[] = [[0, 0.205, 0.045], [0, 0.185, 0.095], [0, 0.14, 0.11], [0, 0.11, 0.085]];
  const tailA = taperTube(tailPts, (t) => 0.042 + Math.sin(Math.PI * t) * 0.012 - t * 0.004, 20, 10).geometry;
  const tailB = taperTube(tailTipPts, (t) => 0.038 - t * 0.012, 14, 10).geometry;
  const tailTip = ell([0.03, 0.03, 0.03], 12, 8);
  const shadow = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);

  // --- materials (non-toon specials)
  const irisOpen = irisTexture(false);
  const irisPuppy = irisTexture(true);
  const eyeMat = new THREE.MeshLambertMaterial({map: irisOpen});
  const eyeMatPuppy = new THREE.MeshLambertMaterial({map: irisPuppy});
  const noseMat = new THREE.MeshStandardMaterial({color: C.nose, roughness: 0.35, metalness: 0.0, envMapIntensity: 0.35});
  const tagMat = new THREE.MeshStandardMaterial({color: C.tag, roughness: 0.22, metalness: 1.0, emissive: '#6a4200', emissiveIntensity: 0.35});
  const hlMat = new THREE.MeshBasicMaterial({color: new THREE.Color(0.87, 0.87, 0.87), toneMapped: false});
  const wetMat = new THREE.MeshBasicMaterial({color: new THREE.Color(0.85, 1.15, 1.35), toneMapped: false, transparent: true, opacity: 0.85});
  const inkMat = new THREE.MeshBasicMaterial({color: C.ink});
  const blushMat = new THREE.MeshBasicMaterial({color: C.blush, transparent: true, opacity: 0.55, depthWrite: false});
  const mouthMat = new THREE.MeshBasicMaterial({color: '#4a0c1c'});
  const shadowMat = new THREE.MeshBasicMaterial({map: blobTexture(), color: '#000000', transparent: true, opacity: 0.35, depthWrite: false});

  return {
    torso, belly, chest, haunch, neck, collar, tag, tagRing, upperLeg, lowerLeg, paw, toeLine,
    head, muzzle, muzzleC, muzzleR, jaw, mouthIn, tongue, tongueLine, nose, ear, cheekTuft, headTuft, chestTuft, brow,
    smile, frown, philtrum, eye, hl, arc, wetArc, blush, tearDrop, tailA, tailB, tailTip, shadow,
    eyeMat, eyeMatPuppy, noseMat, tagMat, hlMat, wetMat, inkMat, blushMat, mouthMat, shadowMat,
  };
};

let cached: PancakeAssets | null = null;
/** shared, lazily-built asset bundle (needs `document` for canvas textures — call during render, not at import). */
export const pancakeAssets = (): PancakeAssets => (cached ??= buildAssets());
