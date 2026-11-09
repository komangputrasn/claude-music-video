// TERMS (silhouette cut) — Swing: the bridge, "One swing." Absolute frames 3850–4126 (song 128.33–137.53 s).
// THE turning point: the first gold in the film. Three shots, cuts on beats (see ./timing.ts and ./NOTES.md):
//   1 SWING    0–80     overhead: the slow blow lands on the red eye at 129.20 s; gold floods out of the broken box (28)
//   2 PANCAKE  81–129   floor level into the broken box: Pancake eats in the gold, his tail wags for the first time (29)
//   3 STAND    130–275  hammer in one hand, phone to the ear, backlit by gold; the lease-tag wall dies one by one (30, 31)
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {S} from '../../lib/palette';
import {useAbsoluteFrame, useSongTime} from '../../../lib/time';
import {CUT} from './timing';
import {ShotSwing} from './ShotSwing';
import {ShotPancake} from './ShotPancake';
import {ShotStand} from './ShotStand';

export const Swing: React.FC = () => {
  const f = useCurrentFrame();
  const t = useSongTime();
  const abs = useAbsoluteFrame();
  const shot =
    f < CUT.pancake ? (
      <ShotSwing key="swing" t={t} abs={abs} />
    ) : f < CUT.stand ? (
      <ShotPancake key="pancake" t={t} abs={abs} />
    ) : (
      <ShotStand key="stand" t={t} abs={abs} />
    );
  return <AbsoluteFill style={{background: S.void}}>{shot}</AbsoluteFill>;
};
