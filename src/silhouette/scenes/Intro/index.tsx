// TERMS (silhouette cut) — Intro, frames 0–371 (song 0–12.37 s, instrumental). Shot list: ./NOTES.md
//   A  0–205    black → one red iris clicks open on the first beats → pull-back: one of ~3 650 irises on a city wall
//   B  206–270  the terms of service scroll up a skyscraper like credits under the iris crowning them; slow crane down to the lit door
//   C  271–370  "BUY NOW, FOR NOW" types on a full-red slab; on 11.262 s "BUY NOW," dies, "FOR NOW" stays
// No sung lyric falls inside the Intro (the first word, "The", is at 12.50 s and belongs to V1Bedroom); the title is
// the only text. Cuts sit on downbeats (6.85, 9.033). One <SilStage>; fog per shot.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S} from '../../lib/palette';
import {SilStage} from '../../lib/SilStage';
import {useAbsoluteFrame, FPS} from '../../../lib/time';
import {ShotIris} from './ShotIris';
import {ShotTerms} from './ShotTerms';
import {ShotTitle} from './ShotTitle';
import {CUT_TERMS, CUT_TITLE} from './timing';

const FOG = {
  // the irises' red in the night haze (TENURE's light): a near-black red fog for the city wide
  iris: {color: '#160A09', near: 80, far: 950},
  terms: {color: S.ash, near: 50, far: 520},
  title: {color: S.ash, near: 200, far: 3000},
} as const;

export const Intro: React.FC = () => {
  const f = useAbsoluteFrame();
  const t = f / FPS;
  const shot = f < CUT_TERMS ? 'iris' : f < CUT_TITLE ? 'terms' : 'title';
  return (
    <AbsoluteFill style={{background: S.void}}>
      <SilStage fog={FOG[shot]}>
        {shot === 'iris' ? <ShotIris t={t} f={f} /> : null}
        {shot === 'terms' ? <ShotTerms t={t} f={f} /> : null}
        {shot === 'title' ? <ShotTitle t={t} f={f} /> : null}
      </SilStage>
    </AbsoluteFill>
  );
};
