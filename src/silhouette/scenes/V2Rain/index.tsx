// TERMS (silhouette cut) — V2Rain: verse 2b, walk home in the rain. Absolute frames 3299–3850 (song 109.97–128.34 s).
// Five shots, every cut on a beat (see ./timing.ts and ./NOTES.md):
//   1 STREET  0–80     the walk under the giant screen (lines 23 tail + 24)
//   2 DOOR    81–145   the door is a red iris: "WHO?" → IDENTITY NOT ON PLAN (24, 25 "so")
//   3 CLIMB   146–275  in through the cell window; red drone cones on "cops" (25)
//   4 WAITING 276–405  Pancake, nose on the Monolith, ears low, tail still (26)
//   5 HAMMER  406–550  push-in on grandpa's hammer: the only warm edge before Swing (27, 28 "One")
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {S} from '../../lib/palette';
import {useAbsoluteFrame, useSongTime} from '../../../lib/time';
import {CUT} from './timing';
import {ShotStreet} from './ShotStreet';
import {ShotDoor} from './ShotDoor';
import {ShotClimb} from './ShotClimb';
import {ShotWaiting} from './ShotWaiting';
import {ShotHammer} from './ShotHammer';

export const V2Rain: React.FC = () => {
  const f = useCurrentFrame();
  const t = useSongTime();
  const abs = useAbsoluteFrame();
  const shot =
    f < CUT.door ? (
      <ShotStreet key="street" t={t} abs={abs} />
    ) : f < CUT.climb ? (
      <ShotDoor key="door" t={t} abs={abs} />
    ) : f < CUT.waiting ? (
      <ShotClimb key="climb" t={t} abs={abs} />
    ) : f < CUT.hammer ? (
      <ShotWaiting key="waiting" t={t} abs={abs} />
    ) : (
      <ShotHammer key="hammer" t={t} abs={abs} />
    );
  return <AbsoluteFill style={{background: S.void}}>{shot}</AbsoluteFill>;
};
