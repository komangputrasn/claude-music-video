/**
 * <Crowd> — crowds of identical hooded silhouettes standing still under the screens (Chorus1), looking up as the red
 * fails (Final). Instanced: hundreds of figures cost a handful of draw calls (legs, upper body, arms, head; + faces
 * while looking up). Pure silhouettes (same shader as <Silhouette>), so they fade into the Stage fog with distance —
 * that is the depth cue.
 *
 *   <Crowd count?={200} seed?={1} area?={[30, 40]} spacing?={1.3} facing?={0} facingJitter?={0.15}
 *          time?={t} sway?={1} lookUp?={0} lookUpSpread?={0.6} hood?={1} exclude?={[[x, z, r], …]}
 *          rim?={{color, dir}} color?={S.void} {...group}/>
 *
 *   count        figures, placed on a jittered grid filling `area` [width x, depth z] centred on the origin
 *   spacing      grid pitch (m); jitter is 35% of it
 *   facing       yaw (rad) everyone faces (0 = +Z, toward a camera on +Z); facingJitter adds per-figure variation
 *   time         seconds; drives a barely-there idle sway (breathing), scaled by `sway` (0 = statues)
 *   lookUp       0..1 the figures look UP (Final: "the crowds of silhouettes look up"): the upper body arches back
 *                (CROWD_LOOKUP.lean), the head tilts back at the neck (CROWD_LOOKUP.head) and the hood slides back off
 *                the brow (CROWD_LOOKUP.hoodFall), so a chin-and-nose profile points at the sky. Each figure starts at
 *                a seeded offset inside lookUpSpread (0..1 of the transition) so the wave ripples through the crowd.
 *                lookUp 0 renders exactly as before the feature existed (the face mesh is hidden).
 *   hood         1 = hooded heads (identical, anonymous); 0 = bare round heads
 *   exclude      clear circles [x, z, radius] (e.g. a lane for the Guy walking against them)
 *   heights      figures vary ±4% in height for life
 * Origin: ground centre of the area. Figures are 1.78 m tall, ~0.5 m wide.
 * Also exported: CROWD_FIGURE_HEIGHT, CROWD_LOOKUP (the look-up angles), crowdLayout(props) → [{x, z, yaw, s, phase}]
 * (to place things between figures).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {makeSilhouetteMaterial, setSilhouetteUniforms, RimOpts} from './Silhouette';
import {S} from './palette';
import {rand} from '../../lib/time';

export const CROWD_FIGURE_HEIGHT = 1.78;

const NECK_Y = 1.45;
/** the upper body (torso, shoulders, neck, arms, head) arches back about this height when looking up */
const WAIST_Y = 0.95;
/** look-up at lookUp 1 (rad): upper-body arch about the waist, total head tilt (neckShare of it at the base of the
 *  neck, the rest about the skull base so the face turns up while the head stays over the shoulders), hood slide */
export const CROWD_LOOKUP = {lean: 0.08, head: 0.8, neckShare: 0.25, hoodFall: 0.35};
/** the head's own tilt pivot (head frame: relative to the neck pivot): the top of the neck / skull base */
const SKULL_PIVOT = new THREE.Vector3(0, 0.13, -0.01);
/** pivot of the hood's slide (head frame: relative to the neck pivot): the back of the skull */
const HOOD_FALL_PIVOT = new THREE.Vector3(0, 0.12, -0.12);

const prep = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute('uv');
  return n;
};

/** lower body: legs and shoes. Origin between the feet. */
const buildBody = () => {
  const parts: THREE.BufferGeometry[] = [];
  // legs (slightly apart, baggy)
  for (const s of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.085, 0.07, 0.86, 8);
    leg.translate(s * 0.1, 0.43 + 0.04, 0);
    parts.push(prep(leg));
    const shoe = new THREE.BoxGeometry(0.11, 0.08, 0.27);
    shoe.translate(s * 0.1, 0.04, 0.04);
    parts.push(prep(shoe));
  }
  return mergeGeometries(parts)!;
};

/** upper body: torso with hoodie drape, shoulders, neck (arches back with lookUp). Origin between the feet. */
const buildUpper = () => {
  const parts: THREE.BufferGeometry[] = [];
  // torso: oversized hoodie, wider at the hem, rounded shoulders
  const torso = new THREE.CylinderGeometry(0.22, 0.24, 0.62, 12);
  torso.scale(1, 1, 0.62);
  torso.translate(0, 1.1, 0);
  parts.push(prep(torso));
  const shoulders = new THREE.SphereGeometry(0.235, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  shoulders.scale(1.08, 0.5, 0.66);
  shoulders.translate(0, 1.39, 0);
  parts.push(prep(shoulders));
  const neck = new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8);
  neck.translate(0, NECK_Y, 0);
  parts.push(prep(neck));
  return mergeGeometries(parts)!;
};

/** arms hanging, hands in hoodie-pocket-ish position. */
const buildArms = () => {
  const parts: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const upper = new THREE.CylinderGeometry(0.058, 0.052, 0.34, 8);
    upper.rotateZ(s * 0.12);
    upper.translate(s * 0.275, 1.2, 0);
    parts.push(prep(upper));
    const fore = new THREE.CylinderGeometry(0.05, 0.045, 0.3, 8);
    fore.rotateZ(s * 0.04);
    fore.rotateX(-0.35);
    fore.translate(s * 0.288, 0.9, 0.05);
    parts.push(prep(fore));
    const hand = new THREE.SphereGeometry(0.05, 8, 6);
    hand.translate(s * 0.29, 0.74, 0.1);
    parts.push(prep(hand));
  }
  return mergeGeometries(parts)!;
};

/** head (pivot at the neck, so lookUp tilts it): hooded (shell + crown point) or bare. */
const buildHead = (hood: boolean) => {
  const parts: THREE.BufferGeometry[] = [];
  if (hood) {
    const shell = new THREE.SphereGeometry(0.155, 14, 10);
    shell.scale(1, 1.06, 1.1);
    shell.translate(0, 0.17, -0.01);
    parts.push(prep(shell));
    const peak = new THREE.ConeGeometry(0.1, 0.15, 10);
    peak.rotateX(-0.95);
    peak.translate(0, 0.28, -0.08);
    parts.push(prep(peak));
  } else {
    const skull = new THREE.SphereGeometry(0.13, 14, 10);
    skull.scale(1, 1.12, 1.05);
    skull.translate(0, 0.16, 0.0);
    parts.push(prep(skull));
  }
  return mergeGeometries(parts)!;
};

/** the hood's drape around the neck (pivot at the neck: it stays with the neck when the head tilts back) */
const buildCollar = () => {
  const drape = new THREE.CylinderGeometry(0.14, 0.2, 0.18, 12, 1, true);
  drape.scale(1, 1, 0.8);
  drape.translate(0, 0.02, -0.04);
  return prep(drape);
};

/** the face under the hood, seen only while looking up (head frame): skull, jaw and nose, so a figure tilted back shows
 *  a chin-and-nose profile pointing up. Unlooked, it sits inside the hood shell (its front flush with the shell). */
const buildFace = () => {
  const parts: THREE.BufferGeometry[] = [];
  const skull = new THREE.SphereGeometry(0.118, 14, 10);
  skull.scale(1, 1.1, 1.05);
  skull.translate(0, 0.165, 0);
  parts.push(prep(skull));
  const jaw = new THREE.SphereGeometry(1, 12, 8);
  jaw.scale(0.07, 0.055, 0.072);
  jaw.translate(0, 0.08, 0.075);
  parts.push(prep(jaw));
  const nose = new THREE.SphereGeometry(1, 8, 6);
  nose.scale(0.022, 0.035, 0.04);
  nose.translate(0, 0.15, 0.128);
  parts.push(prep(nose));
  return mergeGeometries(parts)!;
};

type CrowdGeo = {body: THREE.BufferGeometry; upper: THREE.BufferGeometry; arms: THREE.BufferGeometry; hood: THREE.BufferGeometry;
  collar: THREE.BufferGeometry; bare: THREE.BufferGeometry; face: THREE.BufferGeometry};
let GEO: CrowdGeo | null = null;
const geo = () => (GEO ??= {body: buildBody(), upper: buildUpper(), arms: buildArms(), hood: buildHead(true), collar: buildCollar(),
  bare: buildHead(false), face: buildFace()});

export type CrowdProps = {
  count?: number;
  seed?: number;
  area?: [number, number];
  spacing?: number;
  facing?: number;
  facingJitter?: number;
  time?: number;
  sway?: number;
  lookUp?: number;
  lookUpSpread?: number;
  hood?: number;
  exclude?: [number, number, number][];
  rim?: RimOpts | false | null;
  color?: string;
  fog?: boolean;
} & Omit<React.ComponentProps<'group'>, 'children'>;

export type CrowdSlot = {x: number; z: number; yaw: number; s: number; phase: number};

/** Deterministic placement (same as <Crowd> renders). */
export const crowdLayout = ({count = 200, seed = 1, area = [30, 40], spacing = 1.3, facing = 0, facingJitter = 0.15, exclude = []}: CrowdProps): CrowdSlot[] => {
  const cols = Math.max(1, Math.floor(area[0] / spacing));
  const rows = Math.max(1, Math.floor(area[1] / spacing));
  const out: CrowdSlot[] = [];
  for (let k = 0; k < cols * rows && out.length < count; k++) {
    // visit grid cells in a seeded shuffled order so `count` < cells still fills the whole area evenly
    const cell = Math.floor(rand(`${seed}-cell-${k}`) * cols * rows);
    const i = cell % cols;
    const j = Math.floor(cell / cols);
    const x = -area[0] / 2 + (i + 0.5) * spacing + (rand(`${seed}-jx-${cell}`) - 0.5) * spacing * 0.7;
    const z = -area[1] / 2 + (j + 0.5) * spacing + (rand(`${seed}-jz-${cell}`) - 0.5) * spacing * 0.7;
    if (exclude.some(([ex, ez, r]) => Math.hypot(x - ex, z - ez) < r)) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < spacing * 0.55)) continue;
    out.push({
      x, z,
      yaw: facing + (rand(`${seed}-yaw-${cell}`) - 0.5) * 2 * facingJitter,
      s: 0.96 + rand(`${seed}-s-${cell}`) * 0.08,
      phase: rand(`${seed}-ph-${cell}`),
    });
  }
  return out;
};

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _u = new THREE.Matrix4();
const _h = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _n = new THREE.Matrix4();
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export const Crowd: React.FC<CrowdProps> = (props) => {
  const {count = 200, seed = 1, area = [30, 40], spacing = 1.3, facing = 0, facingJitter = 0.15, time = 0, sway = 1, lookUp = 0,
    lookUpSpread = 0.6, hood = 1, exclude, rim = null, color = S.void, fog = true, ...group} = props;
  const slots = useMemo(
    () => crowdLayout({count, seed, area, spacing, facing, facingJitter, exclude}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, seed, area[0], area[1], spacing, facing, facingJitter, JSON.stringify(exclude ?? [])],
  );
  const G = geo();
  const mat = useMemo(() => makeSilhouetteMaterial(color, rim, fog), [fog]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  const meshes = useMemo(() => {
    const n = Math.max(1, slots.length);
    const mk = (g: THREE.BufferGeometry) => {
      const m = new THREE.InstancedMesh(g, mat, n);
      m.frustumCulled = false;
      return m;
    };
    return {body: mk(G.body), upper: mk(G.upper), arms: mk(G.arms), head: mk(G.hood), collar: mk(G.collar), bare: mk(G.bare),
      face: mk(G.face)};
  }, [slots, mat, G]);
  useLayoutEffect(() => {
    setSilhouetteUniforms(mat, {color, rim: rim || null});
    const useHood = hood >= 0.5;
    meshes.head.visible = useHood;
    meshes.collar.visible = useHood;
    meshes.bare.visible = !useHood;
    const headMesh = useHood ? meshes.head : meshes.bare;
    // faces only exist while looking up (lookUp 0 draws exactly the plain crowd)
    meshes.face.visible = lookUp > 0;
    const L = CROWD_LOOKUP;
    slots.forEach((o, i) => {
      // breathing sway: tiny rotation about the feet, seeded phase
      const br = Math.sin((time / 3.6 + o.phase) * Math.PI * 2) * 0.006 * sway;
      _e.set(br, o.yaw, Math.sin((time / 4.3 + o.phase * 1.7) * Math.PI * 2) * 0.004 * sway, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(_p.set(o.x, 0, o.z), _q, _s.set(o.s, o.s, o.s));
      meshes.body.setMatrixAt(i, _m);
      // look-up progress of this figure (staggered)
      const k = Math.max(0, Math.min(1, (lookUp - o.phase * lookUpSpread) / Math.max(0.0001, 1 - lookUpSpread)));
      const kk = k * k * (3 - 2 * k);
      // upper body: arches back about the waist
      _u.copy(_m);
      if (kk > 0) _u.multiply(_t.makeTranslation(0, WAIST_Y, 0)).multiply(_t.makeRotationX(-L.lean * kk)).multiply(_t.makeTranslation(0, -WAIST_Y, 0));
      meshes.upper.setMatrixAt(i, _u);
      meshes.arms.setMatrixAt(i, _u);
      // head: the neck tilts back at its base, then the head about the skull base
      _e.set(-L.head * L.neckShare * kk + Math.sin((time / 2.9 + o.phase) * Math.PI * 2) * 0.01 * sway, 0, 0, 'YXZ');
      _q.setFromEuler(_e);
      _m2.compose(_p.set(0, NECK_Y, 0), _q, _s.set(1, 1, 1));
      _n.copy(_u).multiply(_m2);
      meshes.collar.setMatrixAt(i, _n);
      _h.copy(_n);
      if (kk > 0) {
        const c = SKULL_PIVOT;
        _h.multiply(_t.makeTranslation(c.x, c.y, c.z)).multiply(_t.makeRotationX(-L.head * (1 - L.neckShare) * kk)).multiply(_t.makeTranslation(-c.x, -c.y, -c.z));
      }
      // the face grows in from inside the hood over the first quarter of the look-up
      meshes.face.setMatrixAt(i, kk > 0 ? _n.copy(_h).multiply(_t.makeScale(Math.min(1, kk * 4), Math.min(1, kk * 4), Math.min(1, kk * 4))) : _zero);
      // the hood slides back off the brow (about the back of the skull), uncovering the face
      if (kk > 0 && useHood) {
        const f = HOOD_FALL_PIVOT;
        _h.multiply(_t.makeTranslation(f.x, f.y, f.z)).multiply(_t.makeRotationX(-L.hoodFall * kk)).multiply(_t.makeTranslation(-f.x, -f.y, -f.z));
      }
      headMesh.setMatrixAt(i, _h);
    });
    for (const m of [meshes.body, meshes.upper, meshes.arms, meshes.head, meshes.collar, meshes.bare, meshes.face]) {
      m.count = slots.length;
      m.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group {...group}>
      <primitive object={meshes.body} />
      <primitive object={meshes.upper} />
      <primitive object={meshes.arms} />
      <primitive object={meshes.head} />
      <primitive object={meshes.collar} />
      <primitive object={meshes.bare} />
      <primitive object={meshes.face} />
    </group>
  );
};
