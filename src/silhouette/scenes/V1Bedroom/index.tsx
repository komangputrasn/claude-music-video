// TERMS (silhouette cut) — V1Bedroom, absolute frames 371–900 (song 12.37–30.00 s). Verse 1a: 3:15 AM in the cell.
// Four shots, each cut on a beat (NOTES.md): A through the blinds, the bed lifts him · B the pillow's iris opens ·
// C the printer's page halts · D the slit dies, PAYMENT DECLINED in red light across him. Lyrics live in the world.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SilStage} from '../../lib/SilStage';
import {S} from '../../lib/palette';
import {useAbsoluteFrame, useSongTime} from '../../../lib/time';
import {shotAt} from './timing';
import {ShotA, ShotB, ShotC, ShotD} from './shots';

export const V1Bedroom: React.FC = () => {
  const abs = useAbsoluteFrame();
  const t = useSongTime();
  const shot = shotAt(abs);
  return (
    <AbsoluteFill style={{background: S.void}}>
      <SilStage fog={{color: S.ash, near: 12, far: 70}}>
        {shot === 'A' ? <ShotA t={t} /> : null}
        {shot === 'B' ? <ShotB t={t} /> : null}
        {shot === 'C' ? <ShotC t={t} /> : null}
        {shot === 'D' ? <ShotD t={t} /> : null}
      </SilStage>
    </AbsoluteFill>
  );
};
