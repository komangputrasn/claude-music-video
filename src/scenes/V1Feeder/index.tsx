/**
 * V1Feeder (song 30.0–47.46 s, frames 900–1424) — verse 1b.
 *   [4] "My Kindle's got Orwell, at least for today,"   [5] "Amazon took it back once, and they can take it away."
 *   [6] "The feeder said, 'Breakfast is Plus members only,'"   [7] "and Pancake looked up at me, hungry and lonely."
 * Shot list: see SHOTS below (local frames; cuts on beats).
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {wordFrame} from './common';
import {ShotA, ShotPOV, ShotC, ShotD, ShotE, ShotF2} from './ReaderShots';
import {TodayBalloon, LockDialog, Vignette, Letterbox} from './ui2d';
import {ShotG, ShotH, ShotI, ShotJ, ShotK, ShotL} from './FeederShots';
import {ramp} from '../../lib/time';

const FROM = 900;
export const W = {
  kindle: wordFrame(FROM, 4, "kindle's"),
  orwell: wordFrame(FROM, 4, 'orwell'),
  today: wordFrame(FROM, 4, 'today'),
  amazon: wordFrame(FROM, 5, 'amazon'),
  took: wordFrame(FROM, 5, 'took'),
  back: wordFrame(FROM, 5, 'back'),
  take: wordFrame(FROM, 5, 'take'),
  away: wordFrame(FROM, 5, 'away'),
  feeder: wordFrame(FROM, 6, 'feeder'),
  said: wordFrame(FROM, 6, 'said'),
  breakfast: wordFrame(FROM, 6, 'breakfast'),
  is: wordFrame(FROM, 6, 'is'),
  plus: wordFrame(FROM, 6, 'plus'),
  members: wordFrame(FROM, 6, 'members'),
  only: wordFrame(FROM, 6, 'only'),
  pancake: wordFrame(FROM, 7, 'pancake'),
  looked: wordFrame(FROM, 7, 'looked'),
  up: wordFrame(FROM, 7, 'up'),
  hungry: wordFrame(FROM, 7, 'hungry'),
  lonely: wordFrame(FROM, 7, 'lonely'),
};

/** shot boundaries (local frames, on beats) */
export const CUT = {A: 0, B: 33, C: 98, D: 131, E: 164, F1: 212, F2: 229, G: 263, H: 311, I: 361, J: 410, K: 440, L: 475, END: 524};

export const V1Feeder: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  let body: React.ReactNode = null;
  let overlay: React.ReactNode = null;
  if (f < CUT.B) body = <ShotA f={f} t={t} kindle={W.kindle} />;
  else if (f < CUT.C) body = <ShotPOV f={f - CUT.B} t={t} orwell={W.orwell - CUT.B} dur={CUT.C - CUT.B} d0={0.25} d1={0.2} />;
  else if (f < CUT.D) {
    body = <ShotC f={f - CUT.C} t={t} />;
    overlay = <TodayBalloon f={f} at={W.today - 4} />;
  } else if (f < CUT.E) body = <ShotD f={f - CUT.D} t={t} took={W.took - CUT.D} />;
  else if (f < CUT.F1) body = <ShotE f={f - CUT.E} t={t} took={W.took - CUT.D} back={W.back - CUT.E} dur={CUT.F1 - CUT.E} />;
  else if (f < CUT.F2)
    body = <ShotPOV f={f - CUT.F1} t={t} dissolve={1} banner="This title is no longer available" bannerAt={W.take - 2 - CUT.F1} dur={CUT.F2 - CUT.F1} d0={0.22} d1={0.2} />;
  else if (f < CUT.G) body = <ShotF2 f={f - CUT.F2} t={t} away={W.away - CUT.F2} />;
  else if (f < CUT.H) body = <ShotG f={f - CUT.G} t={t} sf={f} w={W} />;
  else if (f < CUT.I) body = <ShotH f={f - CUT.H} t={t} sf={f} w={W} dur={CUT.I - CUT.H} />;
  else if (f < CUT.J) {
    body = <ShotI f={f - CUT.I} t={t} sf={f} w={W} />;
    overlay = <LockDialog f={f} at={W.only + 3} x={1160} y={70} scale={1.4} />;
  } else if (f < CUT.K) body = <ShotJ f={f - CUT.J} t={t} sf={f} w={W} />;
  else if (f < CUT.L) body = <ShotK f={f - CUT.K} t={t} sf={f} w={W} dur={CUT.L - CUT.K} />;
  else {
    body = <ShotL f={f - CUT.L} t={t} sf={f} w={W} dur={CUT.END - CUT.L} />;
    overlay = (
      <>
        <Vignette amount={0.35 + 0.65 * ramp(f, W.lonely - 4, W.lonely + 8)} cy={40} />
        <Letterbox amount={ramp(f, CUT.L, CUT.L + 12)} h={70} />
      </>
    );
  }
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {body}
      {overlay}
    </AbsoluteFill>
  );
};
