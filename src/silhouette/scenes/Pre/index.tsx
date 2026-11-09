// TERMS (silhouette cut) — Pre, absolute frames 1424–1732 (song 47.47–57.73 s). The pre-chorus: leaving for one bag
// of food. Two shots (NOTES.md):
//   KNEEL  he kneels in a doorway of light and lays his hand on Pancake's head ("Hold on, buddy, I'll be right back,")
//   PLAZA  he walks out alone across an enormous plaza where everything is tagged; the crane rises until he is lost
//          among millions of glowing lease tags, and the light builds into a red whiteout on the chorus slam (57.75).
// Lyrics live in the world (<WorldLyric>): light in the haze over the lintel, then light projected on the paving,
// each line dissolving into the lease tags. The whiteout is screen-space pure authRed (not over-driven HDR).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S} from '../../lib/palette';
import {SilStage} from '../../lib/SilStage';
import {useAbsoluteFrame, useSongTime} from '../../../lib/time';
import {CUT_PLAZA, whiteout} from './timing';
import {ShotKneel, FOG_KNEEL} from './ShotKneel';
import {ShotPlaza, FOG_PLAZA} from './ShotPlaza';

export const Pre: React.FC = () => {
  const abs = useAbsoluteFrame();
  const t = useSongTime();
  const plaza = abs >= CUT_PLAZA;
  const red = plaza ? whiteout(t) : 0;
  return (
    <AbsoluteFill style={{background: S.void}}>
      {plaza ? (
        <SilStage key="plaza" fog={FOG_PLAZA} camera={{near: 0.5, far: 4500}}>
          <ShotPlaza t={t} abs={abs} />
        </SilStage>
      ) : (
        <SilStage key="kneel" fog={FOG_KNEEL} camera={{near: 0.1, far: 300}} bloom={{strength: 0.55}}>
          <ShotKneel t={t} abs={abs} />
        </SilStage>
      )}
      {red > 0 ? <AbsoluteFill style={{background: S.authRed, opacity: Math.min(1, red)}} /> : null}
    </AbsoluteFill>
  );
};
