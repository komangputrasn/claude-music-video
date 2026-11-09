// DEV ONLY: pose / camera tuning shot (not in the final shot list). Enable with DEV_TEST in index.tsx;
// the variant is picked from the scene-local frame (lf % 10).
import React from 'react';
import {CameraRig} from '../../../lib/three';
import {Performer} from '../Performer';
import {World} from '../World';
import {decoAt} from '../shots/common';
import type {ShotProps, V3} from '../shots/common';

const G: V3 = [1.0, 0, 13.2];

export const PoseTest: React.FC<ShotProps> = ({lf}) => {
  const v = ((lf % 10) + 10) % 10;
  const t = 70;
  const lens: V3 = [-0.12, 1.2, 1.0];
  const aim: V3 = [lens[0] + 0.01, lens[1] + 0.01, lens[2] - 0.07];
  const cams: {cam: V3; tgt: V3; fov: number}[] = [
    {cam: [-1.3, 1.25, 0.5], tgt: [-0.1, 1.2, 0.4], fov: 40},
    {cam: lens, tgt: [0.02, 1.36, 0], fov: 80},
    {cam: [-0.5, 1.9, 1.2], tgt: [-0.1, 1.2, 0.4], fov: 45},
    {cam: [-0.2, 1.22, 0.75], tgt: [-0.15, 1.15, 0.45], fov: 40},
  ];
  const c = cams[Math.min(v, cams.length - 1)];
  const add = (a: V3): V3 => [a[0] + G[0], a[1] + G[1], a[2] + G[2]];
  return (
    <>
      <CameraRig position={add(c.cam)} target={add(c.tgt)} fov={c.fov} />
      <World t={t} deco={{...decoAt(9999, 0), t}} flare={0.4} grass={1200} />
      <Performer lf={496} position={G} gesture="point" aim={aim} pointElbow={0.95} expression="yell" />
      <mesh position={add(lens)}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  );
};
