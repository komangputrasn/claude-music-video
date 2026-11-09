// House shots: the "whole house on a plan" wrap-up.
import React from 'react';
import {CameraRig} from '../../../lib/three';
import {SparkleField} from '../../../lib/three/fx';
import {lerp, clamp01} from '../../../lib/time';
import {World} from '../World';
import {K, beatL} from '../timing';
import {ShotProps, decoAt, mix3, smooth, V3} from './common';

/** S03 (115-180): "you put my whole house" — push in on the house; ribbon wraps, bow pops, tag drops on "house". */
export const HouseWrap: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = smooth(f / 65);
  const pos = mix3([-1.8, 1.2, 26], [-0.6, 2.0, 19.0], k);
  const target = mix3([0.3, 4.9, 0], [0.1, 5.3, 0], k);
  const b = beatL(lf);
  const kick = b.pulse * 0.6;
  return (
    <>
      <CameraRig position={pos} target={target} fov={46 - kick} roll={-0.03} />
      <World t={t} deco={decoAt(lf, t)} flare={0.6} />
      <SparkleField count={26} seed={31} area={[9, 6, 2]} time={t} position={[0, 6.2, 4.6]} size={0.5} intensity={2.2 * clamp01((lf - K.house) / 10)} />
    </>
  );
};

void lerp;
export type _V = V3;
