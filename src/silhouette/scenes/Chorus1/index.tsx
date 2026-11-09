// TERMS (silhouette cut) — Chorus1, frames 1732–2777 (song 57.75–92.56 s). "The machine at full power."
// Eight monumental, symmetrical shots, cut on downbeats only (61.56, 65.90, 70.24, 74.61, 78.95, 83.31, 87.63); every
// sung line lives inside the world (<WorldLyric>). Shot list + sync points: ./NOTES.md.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S} from '../../lib/palette';
import {SilStage} from '../../lib/SilStage';
import {useSongTime, useAbsoluteFrame} from '../../../lib/time';
import {ShotBuyNow, SHOT_A, FOG_A} from './ShotBuyNow';
import {ShotHouse, SHOT_B, FOG_B} from './ShotHouse';
import {ShotCorridor, SHOT_C, FOG_C} from './ShotCorridor';
import {ShotCancel, SHOT_D, FOG_D} from './ShotCancel';
import {ShotCrowd, SHOT_E, FOG_E} from './ShotCrowd';
import {ShotPancake, SHOT_F, FOG_F} from './ShotPancake';
import {ShotUpgrade, SHOT_G, FOG_G} from './ShotUpgrade';
import {ShotAxis, SHOT_H, FOG_H} from './ShotAxis';
import type {ShotProps} from './common';

type Shot = {id: string; t0: number; t1: number; fog: {color: string; near: number; far: number}; C: React.FC<ShotProps>; near?: number};

export const CHORUS1_SHOTS: Shot[] = [
  {id: 'A-buyNow', ...SHOT_A, fog: FOG_A, C: ShotBuyNow, near: 1},
  {id: 'B-house', ...SHOT_B, fog: FOG_B, C: ShotHouse},
  {id: 'C-corridor', ...SHOT_C, fog: FOG_C, C: ShotCorridor},
  {id: 'D-cancel', ...SHOT_D, fog: FOG_D, C: ShotCancel},
  {id: 'E-crowd', ...SHOT_E, fog: FOG_E, C: ShotCrowd},
  {id: 'F-pancake', ...SHOT_F, fog: FOG_F, C: ShotPancake},
  {id: 'G-upgrade', ...SHOT_G, fog: FOG_G, C: ShotUpgrade},
  {id: 'H-axis', ...SHOT_H, fog: FOG_H, C: ShotAxis, near: 2},
];

export const Chorus1: React.FC = () => {
  const t = useSongTime();
  const f = useAbsoluteFrame();
  // cut on the first frame at/after each downbeat
  let k = 0;
  for (let i = 1; i < CHORUS1_SHOTS.length; i++) if (t >= CHORUS1_SHOTS[i].t0) k = i;
  const shot = CHORUS1_SHOTS[k];
  const C = shot.C;
  return (
    <AbsoluteFill style={{background: S.void}}>
      {/* city wides (A, H: nothing nearer than ~40 m) get a larger near plane for depth precision at 1–1.5 km */}
      <SilStage key={shot.id} fog={shot.fog} camera={{near: shot.near ?? 0.25, far: 4500}}>
        <C t={t} f={f} />
      </SilStage>
    </AbsoluteFill>
  );
};
