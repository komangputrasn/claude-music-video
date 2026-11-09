// TERMS (silhouette cut) — Outro (absolute frames 6126–6600, song 204.20–220.00, instrumental).
// Two shots (see ./NOTES.md, ./timing.ts): the static symmetrical wide of the house at dawn — the sun rising straight up
// behind it, man (hood down) and dog on the step, the bowl in its gold pool — then, on the downbeat at 213.44, the last
// image: the doorway, where TENURE's iris on the door-frame opens one last time, flickers and closes for good.
// Fade to black 218.3 → 219.5 (fully black after). No lyric lines are sung in this window (sceneLyricLines is empty).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {useAbsoluteFrame, useSongTime} from '../../../lib/time';
import {S} from '../../lib/palette';
import {CUT, fadeBlack, shotAt} from './timing';
import {ShotHouse} from './ShotHouse';
import {ShotDoor} from './ShotDoor';

export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const t = useSongTime();
  const abs = useAbsoluteFrame();
  const shot = shotAt(f);
  const black = fadeBlack(t);
  return (
    <AbsoluteFill style={{background: S.void}}>
      {black < 0.999 ? (shot === 'house' ? <ShotHouse key="house" t={t} f={f} /> : <ShotDoor key="door" t={t} f={f - CUT} abs={abs} />) : null}
      {black > 0.001 ? <AbsoluteFill style={{background: '#000', opacity: black}} /> : null}
    </AbsoluteFill>
  );
};
