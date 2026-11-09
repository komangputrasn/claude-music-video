// TERMS (silhouette cut) — V1Feeder, absolute frames 900–1424 (song 30.00–47.47 s). Verse 1b: the vanished book and
// the locked feeder, in the cell. Four shots, one sung line each (NOTES.md): PAGE the e-reader insert · VENT the words
// drift off as ash into the red vent · FEEDER the Monolith's eye opens, PLUS ONLY · LONELY the long held wide.
// Lyrics live in the world (on the page, in the ash, projected red, in the haze); the letterbox is the only overlay.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SilStage} from '../../lib/SilStage';
import {S, GREYS} from '../../lib/palette';
import {useAbsoluteFrame, useSongTime} from '../../../lib/time';
import {shotAt} from './timing';
import {ShotPage} from './ShotPage';
import {ShotVent} from './ShotVent';
import {ShotFeeder} from './ShotFeeder';
import {ShotLonely} from './ShotLonely';

export const V1Feeder: React.FC = () => {
  const abs = useAbsoluteFrame();
  const t = useSongTime();
  const shot = shotAt(abs);
  const fog = shot === 'page' || shot === 'vent' ? {color: S.ash, near: 12, far: 70} : {color: GREYS.g2, near: 10, far: 60};
  return (
    <AbsoluteFill style={{background: S.void}}>
      <SilStage fog={fog}>
        {shot === 'page' ? <ShotPage t={t} abs={abs} /> : null}
        {shot === 'vent' ? <ShotVent t={t} abs={abs} /> : null}
        {shot === 'feeder' ? <ShotFeeder t={t} abs={abs} /> : null}
        {shot === 'lonely' ? <ShotLonely t={t} abs={abs} /> : null}
      </SilStage>
    </AbsoluteFill>
  );
};
