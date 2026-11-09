// TERMS (silhouette cut) — Final chorus, "Liberation through colour" (absolute frames 4992–6126, song 166.39–204.20).
// Seven shots, every cut on a downbeat (see ./timing.ts SHOTS and ./NOTES.md). On the hit at 166.39 the red city fails
// and the dawn floods in; from then on gold is the light and red only ever dies or falls.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {useSongTime} from '../../../lib/time';
import {S} from '../../lib/palette';
import {shotAt} from './timing';
import {Hit} from './shots/Hit';
import {Book} from './shots/Book';
import {Letters} from './shots/Letters';
import {CrowdUp} from './shots/CrowdUp';
import {Walk} from './shots/Walk';
import {Bowl} from './shots/Bowl';
import {Crane} from './shots/Crane';

const SHOT_COMPONENTS = {hit: Hit, book: Book, letters: Letters, crowd: CrowdUp, walk: Walk, bowl: Bowl, crane: Crane} as const;

export const Final: React.FC = () => {
  const f = useCurrentFrame();
  const t = useSongTime();
  const shot = shotAt(f);
  const C = SHOT_COMPONENTS[shot.id];
  const sf = f - shot.from;
  const u = sf / Math.max(1, shot.to - shot.from - 1);
  return (
    <AbsoluteFill style={{background: S.void}}>
      <C key={shot.id} t={t} f={sf} u={u} />
    </AbsoluteFill>
  );
};
