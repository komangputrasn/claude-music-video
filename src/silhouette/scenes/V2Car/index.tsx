// TERMS (silhouette cut) — V2Car: verse 2a, the car. Absolute frames 2777–3299 (song 92.56–109.97 s).
// Four shots, every cut on a beat (see ./timing.ts and ./NOTES.md):
//   1 THERMAL   0–146    head-on: the capsule on the highway of red light lines; the seat goes frost-white (20)
//   2 GOVERNOR  147–293  behind him under the governor gantry: SPEED · TIER 1; capsules stream past as light (21)
//   3 PILLAR    294–423  the fuelling pillar under the floodlight; the empty capsule drives itself away (22)
//   4 PATENT    424–521  the patent drawing projected on the fog wall, the tiny figure before it (23)
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {S} from '../../lib/palette';
import {useAbsoluteFrame, useSongTime} from '../../../lib/time';
import {CUT} from './timing';
import {ShotThermal} from './ShotThermal';
import {ShotGovernor} from './ShotGovernor';
import {ShotPillar} from './ShotPillar';
import {ShotPatent} from './ShotPatent';

export const V2Car: React.FC = () => {
  const f = useCurrentFrame();
  const t = useSongTime();
  const abs = useAbsoluteFrame();
  const shot =
    f < CUT.governor ? (
      <ShotThermal key="thermal" t={t} abs={abs} />
    ) : f < CUT.pillar ? (
      <ShotGovernor key="governor" t={t} abs={abs} />
    ) : f < CUT.patent ? (
      <ShotPillar key="pillar" t={t} abs={abs} />
    ) : (
      <ShotPatent key="patent" t={t} abs={abs} />
    );
  return <AbsoluteFill style={{background: S.void}}>{shot}</AbsoluteFill>;
};
