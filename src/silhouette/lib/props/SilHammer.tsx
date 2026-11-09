/**
 * Grandpa's hammer, TERMS cut (DESIGN-silhouette §3): a black silhouette head + claw, and the ONE never-black object in
 * the film — its wooden handle edge catches dawnGold. It is the only owned thing.
 *
 *   <SilHammer warmth?={0} light?={[0.35, 1]} rim?={null} {...group}/>
 *   <HeldSilHammer warmth? light? slide?={0.05}/>               // <SilGuy rightHand={…}/> with guyHammerSwing / monolithSwing
 *   <HungSilHammer warmth? light? head?='right' pegs?={true} {...group}/>   // resting on two wall pegs
 *
 *   warmth  0..1 the dawnGold edge on the WOODEN handle (the tape grip, head and claw stay void):
 *             0         plain black silhouette (it then flattens like any other prop inside a parent <Silhouette>)
 *             0.15–0.3  V2Rain foreshadow: a faint warm line along the handle (the ONLY gold before the impact)
 *             0.6–1     Swing onward: a bright gold edge that blooms; the handle core warms to a deep amber
 *   light   screen-space direction TOWARD the light the edge catches (like <Silhouette rim.dir>); [0, 1] = from above.
 *           The edge favours that side (dirMix 0.7, so the far edge still glints a little).
 * The gold handle sits under userData.silKeep, so a parent <Silhouette>/<SilGuy> does NOT flatten it; the head stays a
 * clean silhouette either way (it carries the parent's rim if any).
 *
 * <SilHammer> frame (same as the Y2K Hammer, so every Y2K anchor still holds): origin = GRIP point (middle of the taped
 * grip); handle along +Y; striking face toward +X; claw toward −X; thin side ±Z. Length 0.353 m.
 * SIL_HAMMER = {length, headOffset [0,0.262,0], faceOffset [0.066,0.262,0], clawTip, buttY, topY, gripHalf, woodY}.
 *
 * <HeldSilHammer>: the Y2K HeldHammer grip frame — handle along grip +Z (head ~0.31 m out), striking face toward grip −Y.
 * Matches guyHammerSwing(p) / monolithSwing(p). HELD_SIL.hammerHead [0,0,0.312] and HELD_SIL.hammerFace [0,−0.066,0.312]
 * are grip-frame points: world face = new Vector3(...HELD_SIL.hammerFace).applyMatrix4(guyJointMatrix(pose,'gripR',{R:true})).
 *
 * <HungSilHammer>: origin = the WALL SURFACE point midway between the two pegs, at the pegs' top. The wall is the local
 * XY plane (wall normal +Z, pegs stick out 6 cm along +Z), the handle lies horizontally along X on top of the pegs,
 * claw UP, striking face DOWN. head='right' → head toward +X (default), 'left' → head toward −X.
 * Other walls: rotate the group about Y. e.g. a left wall facing +X (the Y2K bedroom's hammerHook) with the head toward
 * +Z = `<HungSilHammer rotation-y={Math.PI / 2} head="left" position={hook}/>`. HUNG_SIL = {pegX, pegLength, handleZ}.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {RimOpts, Silhouette, setSilhouetteUniforms} from '../Silhouette';
import {GRIP, GroupProps, V3, basisEuler, clamp01, makeRimMat} from './shared';

const BUTT_Y = -0.07, HEAD_Y = 0.262, TOP_Y = 0.283, TAPE_TOP = 0.056;

export const SIL_HAMMER = {
  length: TOP_Y - BUTT_Y,
  headOffset: [0, HEAD_Y, 0] as V3,
  faceOffset: [0.066, HEAD_Y, 0] as V3,
  clawTip: [-0.086, HEAD_Y - 0.027, 0] as V3,
  buttY: BUTT_Y,
  topY: TOP_Y,
  gripHalf: 0.055,
  /** the bare-wood part of the handle (the part that catches the gold) spans y ∈ woodY */
  woodY: [TAPE_TOP, 0.25] as [number, number],
};

const SLIDE = 0.05;
export const HELD_SIL = {
  hammerSlide: SLIDE,
  /** hammer head centre in the grip frame (default slide) */
  hammerHead: [0, 0, HEAD_Y + SLIDE] as V3,
  /** striking-face centre in the grip frame (default slide) */
  hammerFace: [0, -SIL_HAMMER.faceOffset[0], HEAD_Y + SLIDE] as V3,
};

// ------------------------------------------------------------------------------------------------ geometry
let geo: null | Record<string, THREE.BufferGeometry> = null;
const hammerGeo = () => {
  if (geo) return geo;
  const lathe = (prof: [number, number][], seg = 14) => {
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    g.scale(1.22, 1, 0.92);
    return g;
  };
  // wooden handle (above the tape) — the part that catches the gold
  const wood = lathe([
    [0.0, TAPE_TOP - 0.004], [0.0131, TAPE_TOP - 0.004], [0.0124, 0.08], [0.0108, 0.17], [0.0105, 0.215], [0.0112, 0.244],
    [0.0114, TOP_Y - 0.004], [0.0, TOP_Y - 0.002],
  ]);
  // taped grip + butt (silhouette)
  const grip = lathe([
    [0.0, BUTT_Y], [0.0098, BUTT_Y], [0.0138, BUTT_Y + 0.004], [0.0152, BUTT_Y + 0.012], [0.0146, BUTT_Y + 0.03], [0.0146, 0.0],
    [0.014, 0.05], [0.013, TAPE_TOP], [0.0, TAPE_TOP],
  ]);
  // head: eye block, neck, face (+X); claw prongs (−X), slightly chunky so it reads in silhouette
  const eye = new THREE.BoxGeometry(0.036, 0.04, 0.03);
  const neck = new THREE.CylinderGeometry(0.0142, 0.0124, 0.034, 16);
  neck.rotateZ(-Math.PI / 2);
  neck.translate(0.033, 0, 0);
  const face = new THREE.CylinderGeometry(0.0152, 0.0164, 0.017, 20);
  face.rotateZ(-Math.PI / 2);
  face.translate(0.0575, 0, 0);
  const clawS = new THREE.Shape();
  clawS.moveTo(-0.012, 0.018);
  clawS.bezierCurveTo(-0.042, 0.018, -0.072, 0.006, -0.088, -0.028);
  clawS.bezierCurveTo(-0.08, -0.023, -0.069, -0.012, -0.056, -0.008);
  clawS.bezierCurveTo(-0.04, -0.004, -0.026, -0.009, -0.012, -0.016);
  clawS.closePath();
  const prong = new THREE.ExtrudeGeometry(clawS, {depth: 0.0105, bevelEnabled: true, bevelSize: 0.0014, bevelThickness: 0.0014,
    bevelSegments: 1, curveSegments: 10});
  const prongA = prong.clone().translate(0, 0, 0.0022);
  const prongB = prong.clone().translate(0, 0, -0.0127);
  const root = new THREE.BoxGeometry(0.03, 0.03, 0.026);
  root.translate(-0.024, 0.001, 0);
  // pegs (hung variant): a dowel along +Z with a tiny lip
  const peg = new THREE.CylinderGeometry(0.0085, 0.0085, 0.06, 12);
  peg.rotateX(Math.PI / 2);
  peg.translate(0, 0, 0.03);
  const lip = new THREE.CylinderGeometry(0.0105, 0.0105, 0.006, 12);
  lip.rotateX(Math.PI / 2);
  lip.translate(0, 0, 0.058);
  geo = {wood, grip, eye, neck, face, prongA, prongB, root, peg, lip};
  return geo;
};

/** amber core the wood warms to at warmth 1 (a very dark dawnGold, never a new hue) */
const warmCore = (w: number) => {
  const c = new THREE.Color(S.void);
  const g = new THREE.Color(S.dawnGold).multiplyScalar(0.075);
  return '#' + c.lerp(g, clamp01(w)).getHexString();
};

export type SilHammerProps = GroupProps & {
  warmth?: number;
  light?: [number, number];
  /** optional thin silhouette rim on the black parts (see <Silhouette rim>) */
  rim?: RimOpts | null;
};

export const SilHammer: React.FC<SilHammerProps> = ({warmth = 0, light = [0.35, 1], rim = null, ...group}) => {
  const g = hammerGeo();
  const w = clamp01(warmth);
  const woodRef = useRef<THREE.Mesh>(null);
  const woodMat = useMemo(() => makeRimMat(S.void, null, true), []);
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({color: S.void}), []);
  useLayoutEffect(() => () => {
    woodMat.dispose();
    headMat.dispose();
  }, [woodMat, headMat]);
  useLayoutEffect(() => {
    // re-assert our own material every render (a parent <Silhouette> may have swapped it while warmth was 0)
    if (woodRef.current && w > 0.001) woodRef.current.material = woodMat;
    setSilhouetteUniforms(woodMat, {
      color: warmCore(w * 0.9),
      // ≤ ~2.2: hotter gold tone-maps to cream and stops reading as gold
      rim: w > 0.001 ? {color: S.dawnGold, strength: 0.35 + 1.9 * w, power: 4.2, dir: light, dirMix: 0.7} : null,
    });
  });
  const keep = w > 0.001;
  return (
    <Silhouette rim={rim} {...group}>
      {/* the owned edge: keeps its own gold-rim material inside parent silhouettes */}
      <group userData={{silKeep: keep}}>
        <mesh ref={woodRef} geometry={g.wood} material={woodMat} />
      </group>
      <mesh geometry={g.grip} material={headMat} />
      <group position={[0, HEAD_Y, 0]}>
        <mesh geometry={g.eye} material={headMat} />
        <mesh geometry={g.neck} material={headMat} />
        <mesh geometry={g.face} material={headMat} />
        <mesh geometry={g.root} material={headMat} />
        <mesh geometry={g.prongA} material={headMat} />
        <mesh geometry={g.prongB} material={headMat} />
      </group>
    </Silhouette>
  );
};

export type HeldSilHammerProps = SilHammerProps & {slide?: number};
/** Grandpa's hammer in the Guy's grip frame: handle along grip +Z, striking face toward grip −Y (Y2K HeldHammer frame). */
export const HeldSilHammer: React.FC<HeldSilHammerProps> = ({slide = SLIDE, ...rest}) => (
  <group position={[0, 0, slide]} rotation={GRIP.hammer}>
    <SilHammer {...rest} />
  </group>
);

/** handle point resting on the pegs (hammer-local y), the lift of the handle axis above the peg tops, and peg layout */
const HUNG_MID = 0.0875, HUNG_LIFT = 0.0125;
export const HUNG_SIL = {
  /** x of the two pegs (wall-local), relative to the origin */
  pegX: [-0.105, 0.075] as [number, number],
  pegLength: 0.06,
  /** how far the handle axis sits out from the wall */
  handleZ: 0.034,
  /** wall-local centre of the hammer head when head='right' */
  headCenter: [HEAD_Y - HUNG_MID, HUNG_LIFT, 0.034] as V3,
};
const HUNG_ROT_R = basisEuler([0, -1, 0], [1, 0, 0], [0, 0, 1]); // face down, head +X, claw up
const HUNG_ROT_L = basisEuler([0, -1, 0], [-1, 0, 0], [0, 0, -1]); // face down, head −X, claw up

export type HungSilHammerProps = SilHammerProps & {head?: 'right' | 'left'; pegs?: boolean};
/** Grandpa's hammer resting on two wall pegs (origin = wall surface between the pegs, at peg-top height; wall normal +Z). */
export const HungSilHammer: React.FC<HungSilHammerProps> = ({warmth, light, head = 'right', pegs = true, ...group}) => {
  const g = hammerGeo();
  const sx = head === 'right' ? 1 : -1;
  const pegMat = useMemo(() => new THREE.MeshBasicMaterial({color: S.void}), []);
  useLayoutEffect(() => () => pegMat.dispose(), [pegMat]);
  return (
    <group {...group}>
      {pegs
        ? HUNG_SIL.pegX.map((x) => (
            <group key={x} position={[x * sx, -0.0085, 0]}>
              <mesh geometry={g.peg} material={pegMat} />
              <mesh geometry={g.lip} material={pegMat} />
            </group>
          ))
        : null}
      <group position={[-HUNG_MID * sx, HUNG_LIFT, HUNG_SIL.handleZ]} rotation={head === 'right' ? HUNG_ROT_R : HUNG_ROT_L}>
        <SilHammer warmth={warmth} light={light} />
      </group>
    </group>
  );
};

export default SilHammer;
