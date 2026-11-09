// V2Car — verse 2a (song 92.56-109.97 s, frames 2777-3299). Night: cold seats (heat is a tier), locked speedometer
// (speed is a tier), a snail overtakes the car in first gear, the car drives itself away from the gas pump, and a
// blueprint U.S. PATENT for exactly that flies in. Shot list + status: NOTES.md. Timing: timing.ts.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {B} from './timing';
import {ShotIgnition} from './ShotIgnition';
import {ShotCabin} from './ShotCabin';
import {ShotDash} from './ShotDash';
import {ShotCrawl, CRAWL_SPLIT} from './ShotCrawl';
import {ShotGas, GAS} from './ShotGas';
import {ShotPatent} from './ShotPatent';
import {RaceHUD} from './RaceHUD';
import {GasDialog} from './GasDialog';

export const V2Car: React.FC = () => {
  const f = useCurrentFrame();
  let shot: React.ReactNode;
  if (f < B.cut1) shot = <ShotIgnition f={f} />;
  else if (f < B.cut3) shot = <ShotCabin f={f} />;
  else if (f < B.cut4) shot = <ShotDash f={f} />;
  else if (f < B.cut5) shot = <ShotCrawl f={f} />;
  else if (f < B.cut8) shot = <ShotGas f={f} />;
  else shot = <ShotPatent f={f} />;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {shot}
      <RaceHUD f={f} start={B.cut4} end={B.cut5} overtake={CRAWL_SPLIT} />
      <GasDialog f={f} start={GAS.alive + 1} end={GAS.away + 2} />
    </AbsoluteFill>
  );
};
