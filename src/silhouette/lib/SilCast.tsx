/**
 * The cast as pure silhouettes (DESIGN-silhouette §3). They reuse the Y2K rigs and every pose helper unchanged:
 * import poses from '../../lib/characters/Guy' and '../../lib/characters/Pancake' as usual.
 *
 *   <SilGuy pose={guyWalk(t)} hood?={1} rim?={{color: S.bone, dir: [0, 1]}} color?={S.void}
 *           rightHand?={<SilHammer/>} leftHand?={…} {...group}/>
 *     hood   1 = hood UP (default; most of the film), 0 = hood DOWN (Final chorus: the spiky hair silhouette is revealed).
 *            Values in between fold the hood back off the head onto the shoulders (animate 1 → 0 over ~0.6 s).
 *     rim    optional thin edge light in the scene's light colour (see <Silhouette>). Never thick.
 *     Hand props are rendered as silhouettes too, unless they opt out with userData.silKeep (e.g. SilKeep, Iris).
 *
 *     The hood is ONE skinned cowl (a loft of rings, rebuilt on the CPU each render): the crown/brim/face part rides
 *     the HEAD joint, the nape blends head → neck → chest, and the hem lies on the upper back and shoulders (chest
 *     joint). So the back of the hood is always a continuous line from the crown down into the back — no separate
 *     drape that can swing off the neck as a "ponytail" when he looks down — from every yaw, at head pitch -0.3..+0.6,
 *     in any pose (walk, kneel, climb, sit, bed, phone at the ear, hammer). A soft point at the back of the crown and a
 *     brim proud of the face make the shape read as a hood rather than a helmet. It is closed and double-sided.
 *
 *   <SilPancake pose={pancakeBeg(t)} rim? color? {...group}/>
 *     Keep him in profile or three-quarter view: his floppy ears + curly tail are the most recognisable shape in the film.
 *     Tail is the barometer of hope: tailWagAmount 0 in the verses, wag only after the hammer (Swing onwards).
 *     A small knot fills the joint between the rig's two tail tubes (it showed as a notch in the curl from behind).
 *
 * Both hide the rigs' ink outlines and blob shadows. Faces never appear: everything is flat void.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {Guy, GuyPose, guyJointMatrix, GUY_COLORS, GUY_DIM} from '../../lib/characters/Guy';
import {Pancake, PancakePose, solvePancake} from '../../lib/characters/Pancake';
import {bodyMatrix as pancakeBodyMatrix, SK as PANCAKE_SK} from '../../lib/characters/pancake/rig';
import {getGuyGeometry} from '../../lib/characters/guy/geometry';
import {Silhouette, RimOpts} from './Silhouette';
import {S} from './palette';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

// ------------------------------------------------------------------------------------------------ hood geometry
// Built in the REST pose's SPINE space (origin = spine pivot, +Z = facing, metres): neck pivot at y 0.478, head centre
// at y 0.631 (head radius 0.156, skull top 0.80). Each row is one ring of the loft, top (crown) to bottom (hem):
//   [y, halfWidth, zFront, zBack, zSide, wHead, wNeck]   (wChest = 1 - wHead - wNeck)
// zSide is where the ring is widest. Rings are super-ellipses (exponent HOOD_N), front and back halves separate.
const NECK_Y = GUY_DIM.neckY;
const HEAD_Y = GUY_DIM.neckY + GUY_DIM.headY;
type HoodRow = [number, number, number, number, number, number, number];
const H = (hy: number) => HEAD_Y + hy; // head-local y → spine-rest y
const HOOD_ROWS: HoodRow[] = [
  // crown: a soft point slightly behind the top of the head (hoodie hoods peak at the back seam)
  [H(0.204), 0.0, -0.075, -0.075, -0.075, 1, 0],
  [H(0.196), 0.046, -0.02, -0.125, -0.07, 1, 0],
  [H(0.178), 0.094, 0.062, -0.162, -0.05, 1, 0],
  [H(0.145), 0.135, 0.13, -0.19, -0.036, 1, 0],
  [H(0.105), 0.162, 0.166, -0.203, -0.026, 1, 0],
  // brim: the front edge stands ~3 cm proud of the forehead; below it the face line steps back a touch
  [H(0.068), 0.177, 0.178, -0.208, -0.02, 1, 0],
  [H(0.03), 0.181, 0.163, -0.209, -0.02, 1, 0],
  [H(-0.02), 0.181, 0.153, -0.207, -0.02, 1, 0],
  [H(-0.07), 0.173, 0.15, -0.202, -0.024, 1, 0],
  [H(-0.115), 0.16, 0.136, -0.196, -0.03, 1, 0],
  // nape / under the chin: blends from the head into the neck and chest (this is what keeps the cowl continuous);
  // slightly narrower than the head, then it flares into the shoulders
  [H(-0.148), 0.154, 0.112, -0.193, -0.034, 0.85, 0.15],
  [0.455, 0.166, 0.1, -0.186, -0.04, 0.45, 0.4],
  [0.425, 0.186, 0.112, -0.174, -0.035, 0.12, 0.38],
  [0.395, 0.198, 0.118, -0.16, -0.025, 0, 0.12],
  // hem: lies on the upper back and shoulders (just outside the torso), then tucks inside it
  [0.355, 0.19, 0.11, -0.15, -0.015, 0, 0],
  [0.31, 0.17, 0.1, -0.138, 0, 0, 0],
];
const HOOD_SEGS = 32;
const HOOD_N = 2.25;
/** fold pivot (head-local) the hood swings back around as it comes down: the nape, behind and below the skull */
const HOOD_PIVOT = new THREE.Vector3(0, -0.15, -0.13);
/** hood 1 → 0: total swing back over the pivot (rad), shrink, flattening onto its back plane (head-local z) */
const HOOD_FOLD = {angle: 2.9, shrink: 0.45, flatten: 0.6, backZ: -0.2};
/** where the hood bunches up toward at hood 0 (spine-rest): the nape, on the upper back */
const HOOD_NAPE = new THREE.Vector3(0, 0.45, -0.13);

type HoodRest = {pos: Float32Array; w: Float32Array; indexOut: Uint16Array; indexBoth: Uint16Array};
const buildHoodRest = (): HoodRest => {
  const nr = HOOD_ROWS.length;
  const ns = HOOD_SEGS;
  const pos = new Float32Array(nr * ns * 3);
  const w = new Float32Array(nr * ns * 3);
  const e = 2 / HOOD_N;
  HOOD_ROWS.forEach(([y, a, zf, zb, zc, wh, wn], i) => {
    for (let j = 0; j < ns; j++) {
      // j = 0 at the front (+Z), increasing toward his left (+X)
      const t = (j / ns) * Math.PI * 2;
      const s = Math.sin(t);
      const c = Math.cos(t);
      const k = (i * ns + j) * 3;
      pos[k] = a * Math.sign(s) * Math.abs(s) ** e;
      pos[k + 1] = y;
      pos[k + 2] = zc + (c >= 0 ? zf - zc : zc - zb) * Math.sign(c) * Math.abs(c) ** e;
      w[k] = wh;
      w[k + 1] = wn;
      w[k + 2] = 1 - wh - wn;
    }
  });
  const out: number[] = [];
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < ns; j++) {
      const j1 = (j + 1) % ns;
      const a = i * ns + j;
      const b = (i + 1) * ns + j;
      const c = i * ns + j1;
      const d = (i + 1) * ns + j1;
      out.push(a, b, c, c, b, d); // outward (CCW seen from outside)
    }
  }
  const both = out.concat(out.map((_, n) => out[n - (n % 3) + 2 - (n % 3)])); // + every triangle reversed
  return {pos, w, indexOut: new Uint16Array(out), indexBoth: new Uint16Array(both)};
};
let hoodRest: HoodRest | null = null;
const getHoodRest = () => (hoodRest ??= buildHoodRest());

/** Per-instance hood buffers: `draw` is rendered (both windings: robust to fold-overs), `out` (outward triangles only,
 *  sharing the same position/normal attributes) is only used to compute the normals the rim light needs. */
const makeHoodGeometry = () => {
  const R = getHoodRest();
  const position = new THREE.BufferAttribute(R.pos.slice(), 3);
  const normal = new THREE.BufferAttribute(new Float32Array(R.pos.length), 3);
  const draw = new THREE.BufferGeometry();
  draw.setAttribute('position', position);
  draw.setAttribute('normal', normal);
  draw.setIndex(new THREE.BufferAttribute(R.indexBoth, 1));
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', position);
  out.setAttribute('normal', normal);
  out.setIndex(new THREE.BufferAttribute(R.indexOut, 1));
  return {draw, out};
};

const _mt = new THREE.Matrix4();
const _ax = new THREE.Vector3(1, 0, 0);
const translate = (m: THREE.Matrix4, x: number, y: number, z: number) => m.multiply(_mt.makeTranslation(x, y, z));
/** uniform scale by k about point c */
const scaleAbout = (m: THREE.Matrix4, c: THREE.Vector3, k: number) => {
  translate(m, c.x, c.y, c.z);
  m.multiply(_mt.makeScale(k, k, k));
  return translate(m, -c.x, -c.y, -c.z);
};

/** Bone matrices (rest spine space → Guy-local) for the hood: [head, neck, chest], hood fold/collapse included. */
const hoodBones = (pose: GuyPose, holding: {L: boolean; R: boolean}, h: number): THREE.Matrix4[] => {
  const head = guyJointMatrix(pose, 'head', holding);
  const neck = translate(guyJointMatrix(pose, 'neck', holding), 0, -NECK_Y, 0);
  const chest = translate(guyJointMatrix(pose, 'chest', holding), 0, -0.3, 0);
  if (h < 1) {
    // coming down: the head part flattens onto its back (fabric collapsing), shrinks and swings back over the nape
    // pivot (head-local) until it lies down the upper back
    const u = 1 - h;
    const p = HOOD_PIVOT;
    const s = 1 - HOOD_FOLD.shrink * u;
    translate(head, p.x, p.y, p.z);
    head.multiply(_mt.makeRotationAxis(_ax, -HOOD_FOLD.angle * u));
    head.multiply(_mt.makeScale(s, s, s));
    translate(head, -p.x, -p.y, -p.z);
    translate(head, 0, 0, HOOD_FOLD.backZ);
    head.multiply(_mt.makeScale(1, 1, 1 - HOOD_FOLD.flatten * u));
    translate(head, 0, 0, -HOOD_FOLD.backZ);
  }
  translate(head, 0, -HEAD_Y, 0);
  if (h < 0.5) {
    // below h 0.5 the whole hood bunches up toward the nape (where the Guy's own hood-down lump takes over at h 0)
    const k = 0.7 + 0.3 * (2 * h);
    for (const m of [head, neck, chest]) scaleAbout(m, HOOD_NAPE, k);
  }
  return [head, neck, chest];
};

const _p1 = new THREE.Vector3();
/** Linear-blend skin the rest rings into `geo` (Guy-local). */
const skinHood = (geo: ReturnType<typeof makeHoodGeometry>, bones: THREE.Matrix4[]) => {
  const R = getHoodRest();
  const pos = geo.draw.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const n = R.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let b = 0; b < 3; b++) {
      const wb = R.w[k + b];
      if (wb <= 0) continue;
      _p1.set(R.pos[k], R.pos[k + 1], R.pos[k + 2]).applyMatrix4(bones[b]);
      x += wb * _p1.x;
      y += wb * _p1.y;
      z += wb * _p1.z;
    }
    arr[k] = x;
    arr[k + 1] = y;
    arr[k + 2] = z;
  }
  pos.needsUpdate = true;
  geo.out.computeVertexNormals(); // writes the shared normal attribute (outward triangles only)
  geo.draw.computeBoundingSphere();
};

export type SilGuyProps = GroupProps & {
  pose?: GuyPose;
  hood?: number;
  rim?: RimOpts | false | null;
  color?: string;
  fog?: boolean;
  opacity?: number;
  rightHand?: React.ReactNode;
  leftHand?: React.ReactNode;
};

export const SilGuy: React.FC<SilGuyProps> = ({pose = {}, hood = 1, rim = null, color = S.void, fog = true, opacity = 1, rightHand, leftHand, ...group}) => {
  const G = getGuyGeometry({...GUY_COLORS});
  const holding = {L: leftHand != null, R: rightHand != null};
  const h = Math.max(0, Math.min(1, hood));
  const up = h > 0.02;
  const hoodGeo = useMemo(makeHoodGeometry, []);
  useLayoutEffect(() => () => {
    hoodGeo.draw.dispose();
    hoodGeo.out.dispose();
  }, [hoodGeo]);
  const bones = up ? hoodBones(pose, holding, h) : null;
  useLayoutEffect(() => {
    if (bones) skinHood(hoodGeo, bones);
  });
  const hideFn = (m: THREE.Mesh) => {
    const g = m.geometry;
    if (h > 0.5) return g === G.spikes || g === G.hairCap || g === G.hoodRing || g === G.hoodBack || g === G.ear || g === G.nose;
    return false;
  };
  return (
    <group {...group}>
      <Silhouette color={color} rim={rim} fog={fog} opacity={opacity} hide={hideFn}>
        <Guy pose={pose} shadow={false} rightHand={rightHand} leftHand={leftHand} />
        {up ? <mesh geometry={hoodGeo.draw} /> : null}
      </Silhouette>
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ Pancake
// The rig's curly tail is two tapered tubes (tailA base → top of the curl, tailB curl → tip) with flat end caps that
// meet at TAIL_JOINT at different angles, which leaves a V notch on the outside of the curl. A sphere of the tubes'
// radius there (the tip pivot, so it is right for every wag) fills it.
const TAIL_JOINT: [number, number, number] = [0, 0.205, 0.045];
let tailKnotGeo: THREE.SphereGeometry | null = null;
const getTailKnot = () => (tailKnotGeo ??= new THREE.SphereGeometry(0.0375, 14, 10));

export type SilPancakeProps = GroupProps & {
  pose?: PancakePose;
  rim?: RimOpts | false | null;
  color?: string;
  fog?: boolean;
  opacity?: number;
};

export const SilPancake: React.FC<SilPancakeProps> = ({pose, rim = null, color = S.void, fog = true, opacity = 1, ...group}) => {
  // eyes/tear/blush become void anyway; keep tear 0 so nothing drips off the outline
  const p: PancakePose = {...(pose ?? {}), tear: 0, blush: 0};
  const rig = solvePancake(p);
  const tailM = pancakeBodyMatrix(rig)
    .multiply(_mt.makeTranslation(PANCAKE_SK.tail[0], PANCAKE_SK.tail[1], PANCAKE_SK.tail[2]))
    .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rig.tail.rx, rig.tail.ry, rig.tail.rz, 'XZY')));
  return (
    <group {...group}>
      <Silhouette color={color} rim={rim} fog={fog} opacity={opacity}>
        <Pancake pose={p} shadow={false} />
        <group matrix={tailM} matrixAutoUpdate={false}>
          <mesh geometry={getTailKnot()} position={TAIL_JOINT} />
        </group>
      </Silhouette>
    </group>
  );
};
