// S18: the outro tail — "Daylight (free trial) has expired": the wallpaper day snaps to night (bridge into V2Car).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CameraRig} from '../../../lib/three';
import {Dialog} from '../../../lib/ui';
import type {DialogSpec} from '../../../lib/ui';
import {popIn, clamp01} from '../../../lib/time';
import {World} from '../World';
import {ShotProps, decoAt, mix3, smooth, V3} from './common';

const DONE = decoAt(9999, 0);
/** frame (shot-local) at which the sun is switched off */
export const NIGHT_AT = 8;

const DAYLIGHT: DialogSpec = {
  kind: 'error', title: 'SunService', heading: 'Daylight trial has ended', message: 'Upgrade to DAYLIGHT+ for $4.99/day\nto continue seeing things.',
  buttons: ['Upgrade', 'Live in the dark'], aquaButton: 0, aquaColor: 'gold', disabledButtons: [1], width: 480,
};

export const NightSnap: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const night = f >= NIGHT_AT;
  const k = smooth(f / 17);
  const pos = mix3([-4.5, 2.0, 30], [-4.0, 2.1, 28.5], k);
  return (
    <>
      <CameraRig position={pos} target={[0.5, 4.6, 0]} fov={46} roll={-0.02} />
      <World t={t} preset={night ? 'night' : 'day'} deco={{...DONE, t}} flare={night ? 0 : 0.6} />
    </>
  );
};

export const NightSnapOver: React.FC<ShotProps> = ({f}) => {
  const p = f < 1 ? 0 : popIn(f, 1, 7);
  const flick = f >= NIGHT_AT - 1 && f <= NIGHT_AT + 1 ? 0.55 : 0;
  return (
    <>
      {flick > 0 ? <AbsoluteFill style={{background: '#000', opacity: flick}} /> : null}
      {p > 0 ? <Dialog {...DAYLIGHT} x={960} y={330} anchor="center" scale={1.25 * p} rotate={2} opacity={clamp01(p * 2)} /> : null}
    </>
  );
};
export type _V = V3;
