// TERMS — Intro: small staging pieces shared by the three shots (local to this scene).
import React, {useLayoutEffect, useMemo} from 'react';
import {S, GREYS} from '../../lib/palette';
import type {RimOpts} from '../../lib/Silhouette';
import {SilGuy} from '../../lib/SilCast';
import {concreteMat, wboxMinMax} from '../../lib/sets';
import {guyWalk, GUY} from '../../../lib/characters/Guy';

type V3 = [number, number, number];
type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

export type ShotProps = {
  /** song seconds */
  t: number;
  /** absolute frame (bassAt) */
  f: number;
};

export const RIM_RED: RimOpts = {color: S.authRed, strength: 0.6, power: 6, dir: [0, 1]};
export const RIM_BONE: RimOpts = {color: S.bone, strength: 0.7, power: 6, dir: [0, 1]};

/** Plain black ground plane (under / beyond a WetGround). */
export const Ground: React.FC<{size?: number; y?: number; color?: string}> = ({size = 6000, y = -0.02, color = S.void}) => (
  <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial color={color} />
  </mesh>
);

/** A plain concrete block (static). Origin at the centre of its FRONT face's bottom edge (front = +Z). */
export const Block: React.FC<{size: V3; color?: string; ambient?: number} & GroupProps> = ({size, color = GREYS.g2, ambient = 0.04, ...group}) => {
  const [w, h, d] = size;
  const geo = useMemo(() => wboxMinMax([-w / 2, 0, -d], [w / 2, h, 0]), [w, h, d]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <group {...group}>
      <mesh geometry={geo} material={concreteMat({color, ambient, kind: 'wall'})} />
    </group>
  );
};

/** Anonymous hooded passers-by: each walks along +X (dir 1) or −X (dir −1) at walking pace through `x0` at time `t0`. */
export type Walker = {x0: number; z: number; dir: 1 | -1; t0: number; phase?: number};
export const Walkers: React.FC<{walkers: Walker[]; t: number; rim?: RimOpts}> = ({walkers, t, rim = RIM_RED}) => {
  const speed = GUY.strideLength * 0.94;
  return (
    <>
      {walkers.map((w, i) => (
        <SilGuy
          key={i}
          pose={guyWalk(t + (w.phase ?? i * 0.37))}
          hood={1}
          rim={rim}
          rotation-y={w.dir > 0 ? Math.PI / 2 : -Math.PI / 2}
          position={[w.x0 + w.dir * speed * (t - w.t0), 0, w.z]}
        />
      ))}
    </>
  );
};
