// TERMS (silhouette cut) — Cancel, frames 4126–4678 (song 137.53–155.93 s). Bridge: legal architecture.
// Three shots, cut on the line onsets ("so" 142.86, "Amazon" 147.33): the court and its gavel (line 32), the endless
// stair of identical pages (line 33), the Iliad wall (lines 34–35), then cut to Hold. Every sung line lives in the world
// (<WorldLyric>): the court's frieze inscription, the printed page on every landing, letters cut into the wall.
// Shot list + sync points: ./NOTES.md.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S} from '../../lib/palette';
import {SilStage} from '../../lib/SilStage';
import {useSongTime, useAbsoluteFrame} from '../../../lib/time';
import {ShotCourt, FOG_A} from './ShotCourt';
import {ShotPages, FOG_B} from './ShotPages';
import {ShotIliad, FOG_C} from './ShotIliad';
import {SHOTS} from './timing';
import type {ShotProps} from './common';

type Shot = {id: string; t0: number; fog: {color: string; near: number; far: number}; near: number; C: React.FC<ShotProps>};

export const CANCEL_SHOTS: Shot[] = [
  {id: 'A-court', t0: SHOTS.court.t0, fog: FOG_A, near: 0.3, C: ShotCourt},
  {id: 'B-pages', t0: SHOTS.pages.t0, fog: FOG_B, near: 0.3, C: ShotPages},
  {id: 'C-iliad', t0: SHOTS.iliad.t0, fog: FOG_C, near: 0.5, C: ShotIliad},
];

export const Cancel: React.FC = () => {
  const t = useSongTime();
  const f = useAbsoluteFrame();
  let k = 0;
  for (let i = 1; i < CANCEL_SHOTS.length; i++) if (t >= CANCEL_SHOTS[i].t0) k = i;
  const shot = CANCEL_SHOTS[k];
  const C = shot.C;
  return (
    <AbsoluteFill style={{background: S.void}}>
      <SilStage key={shot.id} fog={shot.fog} camera={{near: shot.near, far: 1500}}>
        <C t={t} f={f} />
      </SilStage>
    </AbsoluteFill>
  );
};
