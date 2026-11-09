/**
 * Pre (song 47.46–57.75 s, frames 1424–1732) — the pre-chorus. See NOTES.md for the shot list.
 *   [8] "Hold on, buddy, I'll be right back,"   [9] "one bag of food, and that's that."
 *   [10] "How hard can it be to buy one thing"  [11] "in a world where you can't own anything?"  -> white-out into Chorus1
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CUT} from './timing';
import {ShotPat, ShotPov, ShotRoom} from './RoomShots';
import {ShotAd1, ShotAd2, AdOverlay} from './AdShot';
import {ShotWorld, WorldOverlay} from './WorldShots';

export const Pre: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  let body: React.ReactNode = null;
  if (f < CUT.pov) body = <ShotPat f={f} t={t} />;
  else if (f < CUT.ad1) body = <ShotPov f={f - CUT.pov} t={t} from={CUT.pov} />;
  else if (f < CUT.ad2) body = <ShotAd1 f={f - CUT.ad1} t={t} from={CUT.ad1} />;
  else if (f < CUT.room) body = <ShotAd2 f={f - CUT.ad2} t={t} from={CUT.ad2} />;
  else if (f < CUT.house) body = <ShotRoom f={f - CUT.room} t={t} from={CUT.room} />;
  else body = <ShotWorld f={f - CUT.house} t={t} from={CUT.house} />;
  const overlay = f >= CUT.ad1 && f < CUT.room ? <AdOverlay sf={f} /> : f >= CUT.house ? <WorldOverlay sf={f} /> : null;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {body}
      {overlay}
    </AbsoluteFill>
  );
};
