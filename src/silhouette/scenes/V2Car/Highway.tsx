/**
 * <Highway> — the elevated highway of V2Car: a black deck of wet concrete running down −Z, lane lines of red light
 * (continuous edge lines, dashed separators), low black parapets with a red light line on top, black portal gantries
 * every `gantryEvery` m, a city below drowned in lit fog, and the horizon band the silhouettes stand against.
 *
 *   <Highway time scroll? zNear? zFar? wet? gantries? gantryEvery? pulse? horizon? sea? city?/>
 *
 *   scroll   metres the world has moved toward −Z (for a car held still in frame: dashes and gantries stream away)
 *   pulse    0..1 bass: the red lines breathe
 *   horizon  intensity of the bone horizon band (≤ 0.85: it is the backdrop of every silhouette)
 * Lanes: 5 × 3.6 m, centres at x = 0, ±3.6, ±7.2 (HW.lanes). The capsule drives the centre lane.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS} from '../../lib/palette';
import {makeSilhouetteMaterial} from '../../lib/Silhouette';
import {Backlight, WetGround} from '../../lib/atmos';
import {LaserLines, CityGrid} from '../../lib/sets';
import type {LaserSegment} from '../../lib/sets/LaserLines';

type V3 = [number, number, number];

export const HW = {
  laneW: 3.6,
  lanes: [-7.2, -3.6, 0, 3.6, 7.2],
  separators: [-5.4, -1.8, 1.8, 5.4],
  edge: 9.0,
  parapet: 11.3,
  parapetH: 1.05,
  deckHalf: 11.7,
  gantryH: 8.2,
};

const DASH = 3.2;
const DASH_EVERY = 10;
const mod = (a: number, n: number) => ((a % n) + n) % n;

export type HighwayProps = {
  time: number;
  scroll?: number;
  zNear?: number;
  zFar?: number;
  wet?: boolean | {reflectivity?: number; puddles?: number; streak?: number};
  gantries?: boolean;
  gantryEvery?: number;
  pulse?: number;
  horizon?: number;
  horizonY?: number;
  /** height (m) of the horizon band card */
  horizonH?: number;
  sea?: number;
  city?: boolean;
  /** lit low cloud above the horizon (the wet deck reflects it, so cars read black on it) */
  sky?: number;
  lineIntensity?: number;
};

export const Highway: React.FC<HighwayProps> = ({
  time, scroll = 0, zNear = 30, zFar = -900, wet = true, gantries = true, gantryEvery = 56, pulse = 0, horizon = 0.62,
  horizonY = 8, horizonH = 70, sea = 0.32, city = true, sky = 0.14, lineIntensity = 1.15,
}) => {
  const len = zNear - zFar;
  const zMid = (zNear + zFar) / 2;
  // ---------------------------------------------------------------- red light lines (one draw call)
  const segs = useMemo(() => {
    const out: LaserSegment[] = [];
    for (const s of [-1, 1]) {
      out.push([[s * HW.edge, 0.02, zNear], [s * HW.edge, 0.02, zFar], 1]);
      out.push([[s * HW.parapet, HW.parapetH + 0.02, zNear], [s * HW.parapet, HW.parapetH + 0.02, zFar], 0.8]);
    }
    const off = mod(scroll, DASH_EVERY);
    for (const x of HW.separators) {
      for (let z = zNear + 5 - off; z > zFar; z -= DASH_EVERY) {
        out.push([[x, 0.02, z], [x, 0.02, z - DASH], 0.75]);
      }
    }
    return out;
  }, [scroll, zNear, zFar]);

  // ---------------------------------------------------------------- gantries (instanced posts + beams)
  const gant = useMemo(() => {
    const zs: number[] = [];
    if (!gantries) return zs;
    const off = mod(scroll, gantryEvery);
    for (let z = zNear - off; z > zFar; z -= gantryEvery) zs.push(z);
    return zs;
  }, [gantries, gantryEvery, scroll, zNear, zFar]);
  const gm = useMemo(() => {
    const mat = makeSilhouetteMaterial(S.void, null, true);
    const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, HW.gantryH, 0.55), mat, 64);
    const beam = new THREE.InstancedMesh(new THREE.BoxGeometry(HW.parapet * 2 + 1.4, 0.75, 0.5), mat, 32);
    post.frustumCulled = false;
    beam.frustumCulled = false;
    return {mat, post, beam};
  }, []);
  useLayoutEffect(() => () => {
    gm.mat.dispose();
    gm.post.geometry.dispose();
    gm.beam.geometry.dispose();
  }, [gm]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    let p = 0;
    gant.slice(0, 32).forEach((z, i) => {
      for (const s of [-1, 1]) {
        m.makeTranslation(s * (HW.parapet + 0.6), HW.gantryH / 2, z);
        gm.post.setMatrixAt(p++, m);
      }
      m.makeTranslation(0, HW.gantryH - 0.3, z);
      gm.beam.setMatrixAt(i, m);
    });
    gm.post.count = p;
    gm.beam.count = Math.min(32, gant.length);
    gm.post.instanceMatrix.needsUpdate = true;
    gm.beam.instanceMatrix.needsUpdate = true;
  });

  const deckMat = useMemo(() => new THREE.MeshBasicMaterial({color: S.void, fog: true}), []);
  useLayoutEffect(() => () => deckMat.dispose(), [deckMat]);
  const wetP = typeof wet === 'object' ? wet : {};

  return (
    <group>
      {wet ? (
        <WetGround size={[HW.deckHalf * 2, len]} position={[0, 0, zMid]} color={GREYS.g1} reflectivity={wetP.reflectivity ?? 0.85}
          puddles={wetP.puddles ?? 0.55} streak={wetP.streak ?? 1.1} time={time} />
      ) : (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, zMid]} material={deckMat}>
          <planeGeometry args={[HW.deckHalf * 2, len]} />
        </mesh>
      )}
      {/* deck edges and parapets */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * HW.parapet, HW.parapetH / 2 - 0.6, zMid]} material={deckMat}>
            <boxGeometry args={[0.5, HW.parapetH + 1.2, len]} />
          </mesh>
          <mesh position={[s * (HW.deckHalf - 0.2), -1.4, zMid]} material={deckMat}>
            <boxGeometry args={[1.0, 2.8, len]} />
          </mesh>
        </group>
      ))}
      <LaserLines segments={segs} color={S.authRed} intensity={lineIntensity * (1 + 0.25 * pulse)} width={0.06} minPx={1.6}
        halo={3.2} fog={0.5} />
      <primitive object={gm.post} />
      <primitive object={gm.beam} />
      {/* the city below, drowned in lit fog; towers rise past the deck on both sides */}
      {city ? (
        <>
          {[-1, 1].map((s) => (
            <CityGrid key={s} rows={12} cols={4} spacing={70} seed={s > 0 ? 21 : 13} height={[30, 120]} footprint={[18, 34]}
              position={[s * 260, -60, zMid - 260]} color={GREYS.g2} ambient={0.25} litFraction={0.008} crowns />
          ))}
        </>
      ) : null}
      {sea > 0 ? (
        <Backlight position={[0, -40, zMid - 200]} rotation-x={-Math.PI / 2} size={[1800, 1400]} shape="radial" softness={1}
          intensity={sea} noise={0.35} time={time} />
      ) : null}
      {sky > 0 ? (
        <Backlight position={[0, horizonY + 30, zFar - 10]} size={[3400, 420]} shape="radial" softness={1} intensity={sky} noise={0.12}
          time={time} />
      ) : null}
      {/* the horizon band and its vanishing-point glow */}
      <Backlight position={[0, horizonY, zFar - 30]} size={[3200, horizonH]} shape="slab" softness={1} intensity={horizon} noise={0.2} time={time} />
      <Backlight position={[0, horizonY, zFar - 20]} size={[900, horizonH * 2.4]} shape="radial" softness={1} intensity={horizon * 0.4} time={time} />
    </group>
  );
};

/** points along a lane at height y (for streaks) */
export const lanePoint = (lane: number, y: number, z: number): V3 => [HW.lanes[lane], y, z];
