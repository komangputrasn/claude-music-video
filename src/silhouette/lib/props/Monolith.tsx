/**
 * <Monolith> — the smart feeder of the TERMS cut (DESIGN-silhouette §3, §4 V1Feeder / V2Rain / Swing): a monolithic black
 * box with a red TENURE <Iris> on its sloped brow and the stencil "NUTRITION UNIT · PLUS ONLY". On the hammer impact the
 * iris SHATTERS, the front panel breaks off and falls, dawnGold light spills out of the broken box for the first time and
 * kibble falls like gold sparks into a pile.
 *
 *   <Monolith open?={1} pupil?={0.32} intensity?={1.5} time?={t} flicker?={0} irisGlow?={0.35} slit?={0.9}
 *             stencil?={true} stencilColor?={GREYS.g5}
 *             shatter?={0} spill?={0} kibble?={0} kibbleCount?={260} seed?={1}
 *             rim?={null} color?={S.void} fog?={true} {...group}/>
 *
 *   open / pupil / intensity / time / flicker   forwarded to the <Iris> (red, ≤ 2). irisGlow = red halo in the haze.
 *   slit       0..~1.2 red food-slot line low on the front (the lock). 0 hides it. Dies on impact.
 *   stencil    true = "NUTRITION UNIT · PLUS ONLY" + "LEASE 0315-77 · DISPENSES ON PLAN"; a string replaces line 1; false hides.
 *              Matte paint (stencilColor, default GREYS.g5 — subtle ash on void). Rides on the front panel when it falls.
 *   shatter    0..1 = 0..1.6 simulated seconds after the impact (feed ramp(f, impactFrame, impactFrame + 48, x => x),
 *              or slower for slow motion). The iris bursts into 42 red glass shards (flash, then they die to black),
 *              the brow caves in around a jagged hole (88 black fragments), the front panel cracks in two and both
 *              halves fall forward onto the floor. Deterministic (seeded by `seed`).
 *   spill      0..1 dawnGold light from INSIDE: interior glow, a halo in the haze, a light cone up through the hole and
 *              forward through the open front, a wedge of light on the floor. Only after the impact (gold rules).
 *   kibble     0..1 = <KibbleSparks> progress: kibble fountains out of the hole like gold sparks and settles in a pile
 *              in front of the box (MONOLITH.pileCenter). 3.4 simulated s; 0.45 of it is the pour.
 *   rim/color/fog  forwarded to the box's <Silhouette>.
 *
 * Frame: origin = floor centre under the box; front (iris, stencil) faces +Z; 0.60 w × 0.85 h × 0.45 d. The top-front edge
 * is a 45° BROW (0.16 m chamfer) carrying the iris, so the eye reads from Pancake's eye level, from a standing camera AND
 * from the overhead Swing camera, and the overhead hammer blow lands on it square.
 *
 * MONOLITH anchors (Monolith-local): size, frontZ, top, browY (front-face top edge), irisCenter, irisNormal, irisRadius,
 *   noseTouch (front face at standing-Pancake nose height), impactPoint (= irisCenter: where the hammer face lands),
 *   swingContact (guyHammerSwing phase at which the HELD face touches the brow ≈ 0.461),
 *   guySwingSpot {position, rotationY}: put <SilGuy> there (inside the Monolith's group/space) and the striking face
 *   of <HeldSilHammer> lands EXACTLY on impactPoint at monolithSwing(0.5) (= guyHammerSwing(swingContact)),
 *   kibbleOrigin, pileCenter [x, z], spillFloor (origin of the floor wedge).
 * Helpers: monolithSwing(p) → GuyPose (wind-up 0..0.5, CONTACT at 0.5, recoil + rest on the broken brow after);
 *   pancakeAtMonolith(pose, x?, yaw?) → {position, rotationY, nose} so Pancake's nose rests on the front face (V2Rain).
 *
 * Swing recipe (scene builders):
 *   const p = ramp(f, a, a + 24, x => x);                        // 0.5 ⇒ impact frame a + 12
 *   <group position={spot} rotation-y={yaw}>                      // the monolith's placement in the set
 *     <Monolith shatter={ramp(f, a + 12, a + 60, x => x)} spill={ramp(f, a + 13, a + 40)} kibble={ramp(f, a + 14, a + 120, x => x)}/>
 *     <SilGuy position={MONOLITH.guySwingSpot.position} rotation-y={MONOLITH.guySwingSpot.rotationY}
 *             pose={monolithSwing(p)} rightHand={<HeldSilHammer warmth={1}/>}/>
 *   </group>
 * NOTE: plain guyHammerSwing(0.5) puts the face 0.38 m above the floor — INSIDE this 0.85 m box. Use monolithSwing(p),
 * which reaches the brow at 0.5 and then recoils/rests instead of passing through.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {GREYS, S, SFONTS} from '../palette';
import {Silhouette, RimOpts} from '../Silhouette';
import {Iris} from '../Iris';
import {GuyPose, guyHammerSwing, guyJointMatrix} from '../../../lib/characters/Guy';
import {PancakePose, pancakeAnchor} from '../../../lib/characters/Pancake';
import {HELD_SIL} from './SilHammer';
import {KibbleSparks} from './KibbleSparks';
import {FloorGlow, GlowBillboard, GroupProps, SoftCone, V3, clamp01, hash, seg, smooth01, useCanvasTex} from './shared';

// ------------------------------------------------------------------------------------------------ dimensions
const W = 0.6, H = 0.85, D = 0.45, C = 0.16, T = 0.022, FOOT = 0.035, FOOT_IN = 0.016;
const FZ = D / 2;
const BROW_Y0 = H - C;
const HF = BROW_Y0 - FOOT; // front panel height
const SQ = Math.SQRT1_2;
const BROW_L = C * Math.SQRT2;
const IRIS_R = 0.082;
const IRIS_C: V3 = [0, BROW_Y0 + C / 2, FZ - C / 2];
const NRM = new THREE.Vector3(0, SQ, SQ);
const SLOPE = new THREE.Vector3(0, SQ, -SQ);
const SIM = 1.6; // simulated seconds covered by shatter 0..1

// ------------------------------------------------------------------------------------------------ swing alignment
const faceAt = (p: number) => new THREE.Vector3(...HELD_SIL.hammerFace).applyMatrix4(guyJointMatrix(guyHammerSwing(p), 'gripR', {R: true}));
const CONTACT = (() => {
  let a = 0.4, b = 0.5;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (faceAt(m).y > IRIS_C[1]) a = m;
    else b = m;
  }
  return (a + b) / 2;
})();
const FACE_C = faceAt(CONTACT);

export const MONOLITH = {
  size: [W, H, D] as V3,
  frontZ: FZ,
  top: H,
  /** y of the front face's top edge (where the 45° brow starts) */
  browY: BROW_Y0,
  irisCenter: IRIS_C,
  irisNormal: [0, SQ, SQ] as V3,
  irisRadius: IRIS_R,
  /** a point on the front face at standing-Pancake nose height (PANCAKE.noseLocal y) — see pancakeAtMonolith() */
  noseTouch: [0, 0.578, FZ] as V3,
  /** where the striking face lands (centre of the iris on the brow) */
  impactPoint: IRIS_C,
  /** guyHammerSwing phase at which the HELD_SIL face reaches the brow (monolithSwing maps it to 0.5) */
  swingContact: +CONTACT.toFixed(4),
  /** Guy root placement (Monolith-local) for the swing: facing the box (rotationY = π), right hand in line with the iris */
  guySwingSpot: {
    position: [+(IRIS_C[0] + FACE_C.x).toFixed(4), 0, +(IRIS_C[2] + FACE_C.z).toFixed(4)] as V3,
    rotationY: Math.PI,
  },
  /** launch point of the kibble fountain (inside the brow hole) */
  kibbleOrigin: [0, 0.68, 0.1] as V3,
  /** where the kibble heap settles ([x, z] on the floor) */
  pileCenter: [0.02, 0.62] as [number, number],
  /** floor point at the bottom of the front opening where the gold floor wedge starts */
  spillFloor: [0, 0, FZ] as V3,
};

/**
 * The hammer swing at the Monolith: guyHammerSwing re-timed so the HELD_SIL striking face touches MONOLITH.impactPoint at
 * p = 0.5 (Guy at MONOLITH.guySwingSpot). 0 wind-up … 0.33 overhead … 0.5 CONTACT … 0.62 recoil … 1 resting on the brow.
 */
export const monolithSwing = (p: number): GuyPose => {
  const x = clamp01(p);
  if (x <= 0.5) return {...guyHammerSwing(x * (CONTACT / 0.5)), t: x};
  const k = (x - 0.5) / 0.5;
  const bump = k < 0.24 ? Math.sin(Math.PI * (k / 0.24)) : 0;
  const q = CONTACT - 0.0038 * bump - 0.0012 * smooth01((k - 0.24) / 0.5);
  return {...guyHammerSwing(q), t: x};
};

/**
 * Pancake placement (Monolith-local) so his nose rests on the front face at x; `yaw` = his rotation-y (π = square on,
 * facing −Z; π ∓ 0.6 = approaching at an angle, which keeps him in profile for a 3/4 camera that also sees the iris).
 */
export const pancakeAtMonolith = (pose: PancakePose, x = 0, yaw = Math.PI) => {
  const n = pancakeAnchor(pose, 'nose');
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const pos: V3 = [x - (n[0] * c + n[2] * s), 0, FZ + 0.004 - (-n[0] * s + n[2] * c)];
  return {position: pos, rotationY: yaw, nose: [x, n[1], FZ] as V3};
};

// ------------------------------------------------------------------------------------------------ fragments
type Frag = {
  /** local vertex positions / normals relative to the centroid (non-indexed) */
  pos: Float32Array;
  nrm: Float32Array;
  c: THREE.Vector3;
  v: THREE.Vector3;
  axis: THREE.Vector3;
  spin: number;
  delay: number;
  floor: number;
  moves: boolean;
  tint: number;
};

/** Convex polygon (3D points on a plane with normal n) → prism of thickness t extruded along −n; returns triangles. */
const prism = (poly: THREE.Vector3[], n: THREE.Vector3, t: number) => {
  const c = new THREE.Vector3();
  poly.forEach((p) => c.add(p));
  c.multiplyScalar(1 / poly.length);
  const top = poly.map((p) => p.clone().sub(c));
  const bot = top.map((p) => p.clone().addScaledVector(n, -t));
  const P: number[] = [], N: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3) => {
    const nn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
    for (const v of [a, b, d]) {
      P.push(v.x, v.y, v.z);
      N.push(nn.x, nn.y, nn.z);
    }
  };
  // make sure the polygon winds CCW around n
  const w = new THREE.Vector3().subVectors(top[1], top[0]).cross(new THREE.Vector3().subVectors(top[2], top[0]));
  if (w.dot(n) < 0) {
    top.reverse();
    bot.reverse();
  }
  for (let i = 1; i < top.length - 1; i++) {
    tri(top[0], top[i], top[i + 1]);
    tri(bot[0], bot[i + 1], bot[i]);
  }
  for (let i = 0; i < top.length; i++) {
    const j = (i + 1) % top.length;
    tri(top[i], bot[i], bot[j]);
    tri(top[i], bot[j], top[j]);
  }
  return {c, pos: new Float32Array(P), nrm: new Float32Array(N)};
};

const browPoint = (u: number, v: number) =>
  new THREE.Vector3(u, BROW_Y0, FZ).addScaledVector(SLOPE, v);

const buildBrowFrags = (seed: number): Frag[] => {
  const nu = 11, nv = 4;
  const pts: THREE.Vector2[][] = [];
  for (let i = 0; i <= nu; i++) {
    pts[i] = [];
    for (let j = 0; j <= nv; j++) {
      let u = -W / 2 + (W * i) / nu, v = (BROW_L * j) / nv;
      if (i > 0 && i < nu) u += (hash(i, j * 3 + 1, seed) - 0.5) * 0.7 * (W / nu);
      if (j > 0 && j < nv) v += (hash(i, j * 3 + 2, seed) - 0.5) * 0.7 * (BROW_L / nv);
      pts[i][j] = new THREE.Vector2(u, v);
    }
  }
  const imp = new THREE.Vector2(0, BROW_L / 2);
  const frags: Frag[] = [];
  let k = 0;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = pts[i][j], b = pts[i + 1][j], c = pts[i + 1][j + 1], d = pts[i][j + 1];
      const tris = (i + j) % 2 === 0 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const tr of tris) {
        const poly = tr.map((p) => browPoint(p.x, p.y));
        const pr = prism(poly, NRM, T);
        const c2 = new THREE.Vector2((tr[0].x + tr[1].x + tr[2].x) / 3, (tr[0].y + tr[1].y + tr[2].y) / 3);
        const dist = c2.distanceTo(imp);
        const r = (q: number) => hash(k, q, seed + 101);
        const moves = dist < 0.155 + 0.03 * (r(0) - 0.5);
        const out = new THREE.Vector3().subVectors(pr.c, new THREE.Vector3(...IRIS_C)).normalize();
        const inward = r(1) < 0.6;
        const v = out.multiplyScalar(0.5 + 0.9 * r(2));
        if (inward) v.addScaledVector(NRM, -(0.25 + 0.45 * r(3))).add(new THREE.Vector3(0, -0.6, 0));
        else v.addScaledVector(NRM, 0.3 + 0.8 * r(3)).add(new THREE.Vector3(0, 0.25 * r(4), 0));
        frags.push({
          pos: pr.pos, nrm: pr.nrm, c: pr.c, v,
          axis: new THREE.Vector3(r(5) - 0.5, r(6) - 0.5, r(7) - 0.5).normalize(),
          spin: 5 + 14 * r(8), delay: dist * 0.12, floor: inward ? FOOT + T + 0.01 : 0.004, moves, tint: 0,
        });
        k++;
      }
    }
  }
  return frags;
};

const buildIrisShards = (seed: number): Frag[] => {
  const K = 14;
  const ang: number[] = [], r1: number[] = [], r2: number[] = [];
  for (let k = 0; k < K; k++) {
    ang.push(((k + (hash(k, 1, seed) - 0.5) * 0.6) / K) * Math.PI * 2);
    r1.push(IRIS_R * (0.3 + 0.16 * hash(k, 2, seed)));
    r2.push(IRIS_R * (0.62 + 0.16 * hash(k, 3, seed)));
  }
  const ctr = new THREE.Vector3(...IRIS_C).addScaledVector(NRM, 0.004);
  const X = new THREE.Vector3(1, 0, 0);
  const at = (a: number, r: number) => ctr.clone().addScaledVector(X, Math.cos(a) * r).addScaledVector(SLOPE, Math.sin(a) * r);
  const frags: Frag[] = [];
  let n = 0;
  for (let k = 0; k < K; k++) {
    const k2 = (k + 1) % K;
    const a0 = ang[k], a1 = ang[k2] + (k2 === 0 ? Math.PI * 2 : 0);
    const polys = [
      [ctr.clone(), at(a0, r1[k]), at(a1, r1[k2])],
      [at(a0, r1[k]), at(a0, r2[k]), at(a1, r2[k2]), at(a1, r1[k2])],
      [at(a0, r2[k]), at(a0, IRIS_R), at((a0 + a1) / 2, IRIS_R), at(a1, IRIS_R), at(a1, r2[k2])],
    ];
    polys.forEach((poly, ring) => {
      const pr = prism(poly, NRM, 0.006);
      const r = (q: number) => hash(n, q, seed + 211);
      const out = new THREE.Vector3().subVectors(pr.c, ctr);
      if (out.lengthSq() < 1e-8) out.set(r(9) - 0.5, 0, 0);
      out.normalize();
      const v = out.multiplyScalar(0.9 + 1.6 * r(0) + ring * 0.3)
        .addScaledVector(NRM, 0.8 + 1.2 * r(1))
        .add(new THREE.Vector3((r(2) - 0.5) * 0.6, 0.5 * r(3), 0.4 * r(4)));
      frags.push({
        pos: pr.pos, nrm: pr.nrm, c: pr.c, v,
        axis: new THREE.Vector3(r(5) - 0.5, r(6) - 0.5, r(7) - 0.5).normalize(),
        spin: 9 + 22 * r(8), delay: 0, floor: 0.003, moves: true, tint: 0.55 + 0.45 * r(10),
      });
      n++;
    });
  }
  return frags;
};

const G = 9.8;
const _q = new THREE.Quaternion();
/** rigid state of a fragment at simulated time tau */
const fragState = (f: Frag, tau: number, outP: THREE.Vector3, outQ: THREE.Quaternion) => {
  if (!f.moves || tau <= f.delay) {
    outP.copy(f.c);
    outQ.identity();
    return 0;
  }
  const t = tau - f.delay;
  const h = f.c.y - f.floor;
  const th = (f.v.y + Math.sqrt(Math.max(0, f.v.y * f.v.y + 2 * G * Math.max(0, h)))) / G;
  let rotT: number;
  if (t < th) {
    outP.set(f.c.x + f.v.x * t, f.c.y + f.v.y * t - 0.5 * G * t * t, f.c.z + f.v.z * t);
    rotT = t;
  } else {
    const vy1 = -(f.v.y - G * th) * 0.22, vx1 = f.v.x * 0.35, vz1 = f.v.z * 0.35;
    const tb = (2 * vy1) / G;
    const u = t - th;
    const x0 = f.c.x + f.v.x * th, z0 = f.c.z + f.v.z * th;
    if (u < tb) {
      outP.set(x0 + vx1 * u, f.floor + vy1 * u - 0.5 * G * u * u, z0 + vz1 * u);
      rotT = th + u * 0.4;
    } else {
      const s = (1 - Math.exp(-(u - tb) / 0.12)) * 0.12;
      outP.set(x0 + vx1 * (tb + s), f.floor, z0 + vz1 * (tb + s));
      rotT = th + tb * 0.4;
    }
  }
  outQ.copy(_q.setFromAxisAngle(f.axis, f.spin * rotT));
  return t;
};

/** One merged, CPU-transformed geometry for a set of rigid fragments (single draw call). */
const useFragGeometry = (frags: Frag[], withColor: boolean) =>
  useMemo(() => {
    const n = frags.reduce((s, f) => s + f.pos.length, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n), 3).setUsage(THREE.DynamicDrawUsage));
    if (withColor) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n), 3).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0.5), 3);
    return g;
  }, [frags, withColor]);

const writeFrags = (g: THREE.BufferGeometry, frags: Frag[], tau: number, colorAt?: (f: Frag, t: number, c: THREE.Color) => void) => {
  const P = g.getAttribute('position') as THREE.BufferAttribute;
  const Nn = g.getAttribute('normal') as THREE.BufferAttribute;
  const Cc = g.getAttribute('color') as THREE.BufferAttribute | undefined;
  const pa = P.array as Float32Array, na = Nn.array as Float32Array, ca = Cc?.array as Float32Array | undefined;
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), v = new THREE.Vector3(), col = new THREE.Color();
  let o = 0;
  for (const f of frags) {
    const t = fragState(f, tau, p, q);
    if (ca && colorAt) colorAt(f, t, col);
    for (let i = 0; i < f.pos.length; i += 3) {
      v.set(f.pos[i], f.pos[i + 1], f.pos[i + 2]).applyQuaternion(q).add(p);
      pa[o + i] = v.x;
      pa[o + i + 1] = v.y;
      pa[o + i + 2] = v.z;
      v.set(f.nrm[i], f.nrm[i + 1], f.nrm[i + 2]).applyQuaternion(q);
      na[o + i] = v.x;
      na[o + i + 1] = v.y;
      na[o + i + 2] = v.z;
      if (ca) {
        ca[o + i] = col.r;
        ca[o + i + 1] = col.g;
        ca[o + i + 2] = col.b;
      }
    }
    o += f.pos.length;
  }
  P.needsUpdate = true;
  Nn.needsUpdate = true;
  if (Cc) Cc.needsUpdate = true;
};

// ------------------------------------------------------------------------------------------------ static geometry
const CRACK: [number, number][] = [
  [0.035, 1.0], [0.078, 0.86], [0.022, 0.72], [0.092, 0.57], [0.055, 0.42], [0.128, 0.27], [0.098, 0.13], [0.15, 0.0],
];
let staticGeo: null | Record<string, THREE.BufferGeometry> = null;
const getStatic = () => {
  if (staticGeo) return staticGeo;
  const plinth = new THREE.BoxGeometry(W - 2 * FOOT_IN, FOOT, D - 2 * FOOT_IN);
  plinth.translate(0, FOOT / 2, 0);
  const back = new THREE.BoxGeometry(W, H - FOOT, T);
  back.translate(0, FOOT + (H - FOOT) / 2, -D / 2 + T / 2);
  // side wall: profile in (z, y), extruded along x by T
  const prof = new THREE.Shape();
  prof.moveTo(-D / 2, FOOT);
  prof.lineTo(D / 2, FOOT);
  prof.lineTo(D / 2, BROW_Y0);
  prof.lineTo(D / 2 - C, H);
  prof.lineTo(-D / 2, H);
  prof.closePath();
  const side = new THREE.ExtrudeGeometry(prof, {depth: T, bevelEnabled: false});
  side.rotateY(-Math.PI / 2); // shape x → world z, extrude (shape z) → world −x
  const sideL = side.clone().translate(-W / 2 + T, 0, 0);
  const sideR = side.clone().translate(W / 2, 0, 0);
  const top = new THREE.BoxGeometry(W, T, D - C);
  top.translate(0, H - T / 2, -C / 2);
  const floor = new THREE.BoxGeometry(W - 2 * T, T, D - 2 * T);
  floor.translate(0, FOOT + T / 2, 0);
  // interior kibble mound (black; reads against the gold interior once the box is open)
  const mound = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  {
    const p = mound.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const b = 1 + 0.16 * (hash(Math.round((x + 2) * 40), Math.round((z + 2) * 40), 7) - 0.5) * (y > 0.05 ? 1 : 0);
      p.setXYZ(i, x * b, y * b, z * b);
    }
    mound.computeVertexNormals();
  }
  mound.scale(0.25, 0.085, 0.17);
  mound.translate(0, FOOT + T, -0.04);
  // front panel halves (shape space: x, y from the pivot = bottom front edge)
  const crack = CRACK.map(([x, k]) => new THREE.Vector2(x, k * HF));
  const shL = new THREE.Shape();
  shL.moveTo(-W / 2, 0);
  for (let i = crack.length - 1; i >= 0; i--) shL.lineTo(crack[i].x, crack[i].y);
  shL.lineTo(-W / 2, HF);
  shL.closePath();
  const shR = new THREE.Shape();
  shR.moveTo(crack[crack.length - 1].x, 0);
  shR.lineTo(W / 2, 0);
  shR.lineTo(W / 2, HF);
  for (let i = 0; i < crack.length; i++) shR.lineTo(crack[i].x, crack[i].y);
  shR.closePath();
  const ext = (s: THREE.Shape) => new THREE.ExtrudeGeometry(s, {depth: T, bevelEnabled: false}).translate(0, 0, -T);
  const decal = (s: THREE.Shape) => {
    const g = new THREE.ShapeGeometry(s);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = (p.getX(i) + W / 2) / W;
      uv[i * 2 + 1] = p.getY(i) / HF;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.translate(0, 0, 0.0009);
    return g;
  };
  const slit = new THREE.BoxGeometry(0.16, 0.0045, 0.002);
  slit.translate(-0.012, 0.12, 0.0012);
  // interior back glow card
  const card = new THREE.PlaneGeometry(W - 2 * T, H - FOOT - 2 * T);
  card.translate(0, FOOT + T + (H - FOOT - 2 * T) / 2, -D / 2 + T + 0.004);
  staticGeo = {plinth, back, sideL, sideR, top, floor, mound, panelL: ext(shL), panelR: ext(shR), decalL: decal(shL),
    decalR: decal(shR), slit, card};
  return staticGeo;
};

const drawStencil = (ctx: CanvasRenderingContext2D, w: number, h: number, line1: string, line2: string) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const y1 = h * (1 - 0.865);
  // line 1: Futura caps, wide tracking, fitted to 82% of the panel
  let px = 44;
  const fit = (font: (s: number) => string, txt: string, maxW: number, track: number) => {
    for (; px > 10; px -= 1) {
      ctx.font = font(px);
      (ctx as unknown as {letterSpacing: string}).letterSpacing = `${(px * track).toFixed(1)}px`;
      if (ctx.measureText(txt).width <= maxW) break;
    }
  };
  fit((s) => `600 ${s}px ${SFONTS.futura}`, line1, w * 0.82, 0.32);
  ctx.fillText(line1, w / 2, y1);
  // thin rules
  ctx.fillRect(w * 0.09, y1 + px * 0.95, w * 0.82, 3);
  ctx.fillRect(w * 0.09, y1 - px * 0.95, w * 0.82, 2);
  // line 2: mono, small
  px = 24;
  fit((s) => `${s}px ${SFONTS.mono}`, line2, w * 0.82, 0.18);
  ctx.globalAlpha = 0.8;
  ctx.fillText(line2, w / 2, y1 + px * 2.6);
  // tiny serial block, bottom right (reads as texture, not text, at film distances)
  px = 16;
  ctx.font = `${px}px ${SFONTS.mono}`;
  (ctx as unknown as {letterSpacing: string}).letterSpacing = '2px';
  ctx.textAlign = 'right';
  ctx.globalAlpha = 0.55;
  ctx.fillText('UNIT 4471-B  ·  TENURE NUTRITION', w * 0.91, h * 0.955);
  ctx.globalAlpha = 1;
  (ctx as unknown as {letterSpacing: string}).letterSpacing = '0px';
};

const CARD_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p * vec2(1.0, 0.85));
  float a = 0.35 + 0.65 * pow(max(0.0, 1.0 - r * 0.8), 1.6);
  a *= smoothstep(1.0, 0.75, max(abs(p.x), abs(p.y))) * 0.7 + 0.3;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;
const CARD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// ------------------------------------------------------------------------------------------------ component
export type MonolithProps = GroupProps & {
  open?: number;
  pupil?: number;
  intensity?: number;
  time?: number;
  flicker?: number;
  irisGlow?: number;
  slit?: number;
  stencil?: boolean | string;
  stencilColor?: string;
  shatter?: number;
  spill?: number;
  kibble?: number;
  kibbleCount?: number;
  seed?: number;
  rim?: RimOpts | null;
  color?: string;
  fog?: boolean;
};

/** front-panel half animation (pivot = bottom front edge): returns [fall angle, yaw, slide, lift] */
const panelPose = (tau: number, delay: number, dur: number, yawTo: number, slideTo: number) => {
  const u = clamp01((tau - delay) / dur);
  const fall = u * u; // gravity-like acceleration about the pivot
  let ang = (Math.PI / 2) * fall;
  // little bounce after landing
  const after = tau - delay - dur;
  if (after > 0) ang = Math.PI / 2 - 0.09 * Math.abs(Math.sin(after * 14)) * Math.exp(-after * 7);
  const yaw = yawTo * smooth01((tau - delay) / (dur * 1.3));
  const slide = slideTo * smooth01((tau - delay - dur * 0.7) / 0.4);
  return [ang, yaw, slide, fall] as const;
};

export const Monolith: React.FC<MonolithProps> = ({
  open = 1, pupil = 0.32, intensity = 1.5, time = 0, flicker = 0, irisGlow = 0.35, slit = 0.9, stencil = true,
  stencilColor = GREYS.g5, shatter = 0, spill = 0, kibble = 0, kibbleCount = 260, seed = 1, rim = null, color = S.void,
  fog = true, ...group
}) => {
  const g = getStatic();
  const sh = clamp01(shatter);
  const tau = sh * SIM;
  const broken = sh > 0.0005;
  const sp = clamp01(spill);

  const line1 = typeof stencil === 'string' ? stencil : 'NUTRITION UNIT · PLUS ONLY';
  const line2 = 'LEASE 0315-77 · DISPENSES ON PLAN';
  const stencilTex = useCanvasTex(1024, Math.round((1024 * HF) / W), (ctx, w, h) => drawStencil(ctx, w, h, line1, line2), [line1]);
  const mats = useMemo(() => {
    const paint = new THREE.MeshBasicMaterial({map: stencilTex, transparent: true, depthWrite: false, color: '#ffffff',
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1});
    const slitM = new THREE.MeshBasicMaterial({color: '#ffffff', fog: false});
    const shard = new THREE.MeshBasicMaterial({vertexColors: true, fog: false});
    const card = new THREE.ShaderMaterial({uniforms: {uColor: {value: new THREE.Color()}}, vertexShader: CARD_VERT,
      fragmentShader: CARD_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
    return {paint, slitM, shard, card};
  }, [stencilTex]);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // fragments
  const browFrags = useMemo(() => buildBrowFrags(seed), [seed]);
  const shards = useMemo(() => buildIrisShards(seed), [seed]);
  const browGeo = useFragGeometry(browFrags, false);
  const shardGeo = useFragGeometry(shards, true);
  useLayoutEffect(() => () => {
    browGeo.dispose();
    shardGeo.dispose();
  }, [browGeo, shardGeo]);
  const last = useRef<{brow: number; shard: number}>({brow: -1, shard: -1});
  useLayoutEffect(() => {
    if (last.current.brow !== tau) {
      writeFrags(browGeo, browFrags, tau);
      last.current.brow = tau;
    }
    if (broken && last.current.shard !== tau) {
      const red = new THREE.Color(S.authRed), ash = new THREE.Color(GREYS.g2);
      writeFrags(shardGeo, shards, tau, (f, t, c) => {
        const I = 1.8 * Math.exp(-t / 0.32) * f.tint + 0.15 * Math.exp(-t / 1.2); // ≤ 1.95: red stays red under ACES
        c.copy(red).multiplyScalar(I).add(ash.clone().multiplyScalar(clamp01(t / 0.8) * 0.6));
      });
      last.current.shard = tau;
    }
  });

  useLayoutEffect(() => {
    mats.paint.color.set(stencilColor);
    mats.slitM.color.set(S.authRed).multiplyScalar(Math.min(2, slit) * (1 - seg(sh, 0, 0.04)));
    mats.card.uniforms.uColor.value.set(S.dawnGold).multiplyScalar(1.5 * sp);
  });

  // front panel halves
  const [aL, yL, sL, fL] = panelPose(tau, 0.06, 0.5, 0.22, 0.05);
  const [aR, yR, sR, fR] = panelPose(tau, 0.13, 0.62, -0.3, 0.09);
  const frontOpen = broken ? smooth01(Math.min(fL, fR) * 1.4) : 0;
  const holeOpen = broken ? seg(tau, 0.0, 0.25) : 0;
  const pivotY = (k: number) => FOOT * (1 - k);
  const flash = broken && tau < 0.35 ? Math.exp(-tau / 0.045) : 0;
  const redBurst = broken && tau < 0.5 ? Math.exp(-tau / 0.09) : 0;
  const irisC = new THREE.Vector3(...IRIS_C);
  const showStencil = stencil !== false;

  return (
    <group {...group}>
      <Silhouette color={color} rim={rim} fog={fog}>
        <mesh geometry={g.plinth} />
        <mesh geometry={g.back} />
        <mesh geometry={g.sideL} />
        <mesh geometry={g.sideR} />
        <mesh geometry={g.top} />
        <mesh geometry={g.floor} />
        <mesh geometry={g.mound} visible={broken} />
        {/* brow: 88 fragments (at rest = an intact plate) */}
        <mesh geometry={browGeo} frustumCulled={false} />
        {/* front panel halves, hinged at the bottom front edge */}
        <group position={[0, broken ? pivotY(fL) : FOOT, FZ + (broken ? sL : 0)]} rotation={broken ? [aL, yL, 0.03 * fL, 'YXZ'] : [0, 0, 0]}>
          <mesh geometry={g.panelL} />
          {showStencil ? <mesh geometry={g.decalL} material={mats.paint} userData={{silKeep: true}} renderOrder={1} /> : null}
          {slit > 0 ? <mesh geometry={g.slit} material={mats.slitM} userData={{silKeep: true}} /> : null}
        </group>
        <group position={[0, broken ? pivotY(fR) : FOOT, FZ + (broken ? sR : 0)]} rotation={broken ? [aR, yR, -0.05 * fR, 'YXZ'] : [0, 0, 0]}>
          <mesh geometry={g.panelR} />
          {showStencil ? <mesh geometry={g.decalR} material={mats.paint} userData={{silKeep: true}} renderOrder={1} /> : null}
        </group>
      </Silhouette>

      {/* TENURE's eye (until the impact) */}
      {!broken ? (
        <>
          <Iris position={irisC.clone().addScaledVector(NRM, 0.003).toArray() as V3} rotation={[-Math.PI / 4, 0, 0]} radius={IRIS_R}
            open={open} pupil={pupil} intensity={Math.min(2, intensity)} time={time} flicker={flicker} />
          <GlowBillboard position={irisC.clone().addScaledVector(NRM, 0.03).toArray() as V3} color={S.authRed}
            intensity={Math.min(2, irisGlow * clamp01(open) * (intensity / 1.5)) * (1 - 0.8 * flicker)} size={0.34} falloff={2.4} />
        </>
      ) : (
        <group userData={{silKeep: true}}>
          <mesh geometry={shardGeo} material={mats.shard} frustumCulled={false} />
          <GlowBillboard position={irisC.clone().addScaledVector(NRM, 0.04).toArray() as V3} color={S.bone} intensity={5 * flash} size={0.36}
            falloff={2.6} core={1} />
          <GlowBillboard position={irisC.clone().addScaledVector(NRM, 0.03).toArray() as V3} color={S.authRed}
            intensity={Math.min(2, 1.6 * redBurst)} size={0.5} falloff={2} />
        </group>
      )}

      {/* dawnGold from inside (only after the impact) */}
      {sp > 0.001 ? (
        <group userData={{silKeep: true}}>
          <mesh geometry={g.card} material={mats.card} renderOrder={3} />
          <FloorGlow position={[0, FOOT + T, 0]} size={[W - 2 * T, D - 2 * T]} color={S.dawnGold} intensity={0.8 * sp} softness={0.5}
            breakup={0.2} />
          {/* halo sits BEHIND the box: the box occludes it, so it reads as gold haze glowing around the broken outline.
              `floor` fades it out at floor height (else the floor cuts it with a hard horizontal line behind the box) */}
          <GlowBillboard position={[0, 0.5, -D / 2 - 0.13]} color={S.dawnGold} intensity={0.34 * sp * (0.35 + 0.65 * Math.max(frontOpen, holeOpen))}
            size={1.2} falloff={1.7} floor={0.5} floorSoft={0.4} />
          <SoftCone from={[0, BROW_Y0 + 0.02, FZ - 0.08]} to={[0, 2.4, 0.32]} radiusStart={0.12} radiusEnd={0.6} color={S.dawnGold}
            intensity={0.3 * sp * holeOpen} edge={1.8} falloff={1.3} />
          <SoftCone from={[0, 0.46, 0.02]} to={[0, -0.12, 1.75]} radiusStart={0.28} radiusEnd={0.95} color={S.dawnGold}
            intensity={0.2 * sp * frontOpen} edge={1.6} falloff={1.1} floorY={0} floorSoft={0.3} />
          <FloorGlow shape="wedge" position={MONOLITH.spillFloor} size={[2.1, 2.5]} near={0.3} far={1} color={S.dawnGold}
            intensity={(0.2 + 1.05 * frontOpen) * sp} softness={0.55} breakup={0.4} seed={seed} />
        </group>
      ) : null}

      {kibble > 0 ? (
        <KibbleSparks progress={kibble} origin={MONOLITH.kibbleOrigin} count={kibbleCount} seed={seed + 3} duration={3.4} pour={0.45}
          velocity={[0, 1.45, 1.05]} spread={0.7} floorY={T * 0.9}
          pile={{center: MONOLITH.pileCenter, radius: 0.24, height: 0.085}} />
      ) : null}
    </group>
  );
};

export default Monolith;
