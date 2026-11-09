/**
 * <PlainBowl> — Pancake's plain bowl (DESIGN-silhouette §4 Final hero shot, Outro): a simple bowl SILHOUETTE with a kibble
 * mound, that can sit in a pool of dawnGold light — the only warm, un-metered light in the film (Final/Outro ONLY).
 *
 *   <PlainBowl fill?={1} goldPool?={0} poolSize?={1} shaft?={0.5} glints?={true} rim?={auto} color?={S.void} fog?={true}
 *              seed?={1} {...group}/>
 *
 *   fill      0..1 kibble mound height (0 = empty bowl). Animate 1 → ~0.3 while he eats.
 *   goldPool  0..1 dawnGold pool on the floor around the bowl (radius ≈ 0.75 m × poolSize, soft, broken-up edge), a soft
 *             shaft of gold haze from above (× shaft), gold glints on the top kibble, and a thin gold rim on the bowl lip
 *             (unless you pass `rim`). The bowl, the mound and Pancake stay pure black against it.
 *   poolSize  scales the pool radius (1 ≈ 0.75 m).
 *   shaft     0..1 strength of the vertical gold haze column above the bowl (0 = floor pool only).
 *   glints    tiny HDR gold kibble on top of the mound that catch the light (only when goldPool > 0).
 *   rim       silhouette rim for the bowl + mound; default (goldPool > 0) = thin dawnGold from above.
 *
 * Frame / alignment: origin = floor centre under the bowl. Same size as the Y2K DogBowl (Ø 0.25 m, 0.071 m tall), so it
 * lines up with Pancake's eating pose: put it at PANCAKE.bowl INSIDE Pancake's group —
 *   <group position={spot} rotation-y={yaw}>
 *     <SilPancake pose={{...pancakeEat(t), tailWagAmount: 1}}/>
 *     <PlainBowl position={PANCAKE.bowl} fill={1 - ramp(f, a, a + 300)} goldPool={1}/>
 *   </group>
 * pancakeEat's nose dips to PANCAKE.noseEatLocal (y 0.052) — into the mound. PLAINBOWL = {radius, height, innerRadius,
 * floorY, moundTop(fill)}.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {RimOpts, Silhouette} from '../Silhouette';
import {FloorGlow, GroupProps, SoftCone, clamp01, hash} from './shared';

const R = 0.125, HGT = 0.071, RIN = 0.094, FLOOR = 0.016, MOUND = 0.05;

export const PLAINBOWL = {
  radius: R,
  height: HGT,
  innerRadius: RIN,
  floorY: FLOOR,
  /** y of the top of the kibble mound for a given fill */
  moundTop: (fill: number) => FLOOR + 0.004 + MOUND * clamp01(fill),
};

let bowlGeo: null | {bowl: THREE.BufferGeometry; dome: THREE.BufferGeometry} = null;
const getGeo = () => {
  if (bowlGeo) return bowlGeo;
  // one lathe: outer wall (slight flare) → rolled lip → inner wall → inner floor
  const prof: [number, number][] = [
    [0.0, 0.0], [0.098, 0.0], [0.104, 0.004], [0.112, 0.03], [0.12, 0.058], [0.1245, 0.066], [0.125, HGT - 0.002],
    [0.121, HGT], [0.112, HGT - 0.001], [0.106, 0.064], [RIN, 0.03], [0.086, FLOOR + 0.004], [0.075, FLOOR], [0.0, FLOOR],
  ];
  const bowl = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
  // kibble mound: a unit dome with lumpy kibble-sized bumps (they show on the silhouette's top edge)
  const dome = new THREE.SphereGeometry(1, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = dome.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = hash(Math.round((x + 2) * 22), Math.round((z + 2) * 22), 3);
    const b = y > 0.02 ? 1 + 0.09 * (n - 0.5) * (0.4 + 0.6 * y) : 1;
    p.setXYZ(i, x * b, y * (y > 0.02 ? 1 + 0.18 * (n - 0.5) : 1), z * b);
  }
  dome.computeVertexNormals();
  bowlGeo = {bowl, dome};
  return bowlGeo;
};

let nug: THREE.BufferGeometry | null = null;
const nugget = () => {
  if (!nug) {
    nug = new THREE.DodecahedronGeometry(1, 0);
    nug.scale(1, 0.62, 0.92);
  }
  return nug;
};

export type PlainBowlProps = GroupProps & {
  fill?: number;
  goldPool?: number;
  poolSize?: number;
  shaft?: number;
  glints?: boolean;
  rim?: RimOpts | null;
  color?: string;
  fog?: boolean;
  seed?: number;
};

export const PlainBowl: React.FC<PlainBowlProps> = ({
  fill = 1, goldPool = 0, poolSize = 1, shaft = 0.5, glints = true, rim, color = S.void, fog = true, seed = 1, ...group
}) => {
  const g = getGeo();
  const fl = clamp01(fill);
  const gp = clamp01(goldPool);
  const h = MOUND * fl + 0.004;
  const rimOpts: RimOpts | null =
    rim !== undefined ? rim : gp > 0.001 ? {color: S.dawnGold, strength: 1.1 * gp, power: 3.2, dir: [0, 1], dirMix: 0.7} : null;

  // gold glints: a few nuggets lying on the mound surface
  const glintMesh = useMemo(() => {
    const n = 34;
    const m = new THREE.InstancedMesh(nugget(), new THREE.MeshBasicMaterial({color: '#ffffff', fog: false}), n);
    m.frustumCulled = false;
    m.userData.silKeep = true;
    for (let i = 0; i < n; i++) m.setColorAt(i, new THREE.Color(0, 0, 0));
    return m;
  }, []);
  useLayoutEffect(() => () => {
    (glintMesh.material as THREE.Material).dispose();
    glintMesh.dispose();
  }, [glintMesh]);
  useLayoutEffect(() => {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Sc = new THREE.Vector3(), P = new THREE.Vector3();
    const gold = new THREE.Color(S.dawnGold);
    const c = new THREE.Color();
    const rr = RIN * 0.9;
    for (let i = 0; i < glintMesh.count; i++) {
      const a = hash(i, 1, seed) * Math.PI * 2, r = rr * Math.sqrt(hash(i, 2, seed)) * 0.92;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const k = Math.max(0, 1 - (r / rr) ** 2);
      P.set(x, FLOOR + 0.004 + h * Math.sqrt(k) + 0.004, z);
      E.set(hash(i, 3, seed) * 6.3, hash(i, 4, seed) * 6.3, 0);
      Q.setFromEuler(E);
      Sc.setScalar(0.0095);
      M.compose(P, Q, Sc);
      glintMesh.setMatrixAt(i, M);
      // brightest on the side facing up/back toward the light; only some glint
      const lit = hash(i, 5, seed) > 0.45 ? 0.6 + 1.6 * hash(i, 6, seed) : 0.05;
      c.copy(gold).multiplyScalar(gp * lit * (fl > 0.02 ? 1 : 0));
      glintMesh.setColorAt(i, c);
    }
    glintMesh.instanceMatrix.needsUpdate = true;
    if (glintMesh.instanceColor) glintMesh.instanceColor.needsUpdate = true;
  });

  return (
    <group {...group}>
      <Silhouette color={color} rim={rimOpts} fog={fog}>
        <mesh geometry={g.bowl} />
        {fl > 0.001 ? <mesh geometry={g.dome} position={[0, FLOOR + 0.002, 0]} scale={[RIN * 0.97, h, RIN * 0.97]} /> : null}
      </Silhouette>
      {glints && gp > 0.001 ? <primitive object={glintMesh} /> : null}
      {gp > 0.001 ? (
        <group userData={{silKeep: true}}>
          <FloorGlow size={[1.5 * poolSize, 1.5 * poolSize]} color={S.dawnGold} intensity={1.25 * gp} softness={0.75} breakup={0.4}
            seed={seed} />
          {shaft > 0 ? (
            <SoftCone from={[0, 2.6, -0.15]} to={[0, 0, 0]} radiusStart={0.25 * poolSize} radiusEnd={0.62 * poolSize}
              color={S.dawnGold} intensity={0.26 * gp * shaft} edge={1.4} falloff={0.55} floorY={0} floorSoft={0.12} />
          ) : null}
        </group>
      ) : null}
    </group>
  );
};

export default PlainBowl;
