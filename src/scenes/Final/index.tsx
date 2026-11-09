/**
 * Final (song 166.39–204.20 s, frames 4992–6126, lines [38]–[45]) — the triumphant last chorus.
 * Liberation mirror of Chorus1: same hills / house / chrome words / pop-ups, but at SUNRISE and now HE wins.
 * One <Stage> drives every shot (hard cuts on beats/words). See SHOTS below and NOTES.md for the shot list.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../../lib/three';
import {useAbsoluteFrame} from '../../lib/time';
import {ShotDef} from './common';
import {Open, OpenOver, Morph, MorphOver} from './shots/WordShots';
import {Paper, Trophy, TrophyOver, CantTakeDown, CantTakeDownOver} from './shots/BookShots';
import {HouseFree, HouseFreeOver, StampStorm, StampStormOver} from './shots/DoneShots';
import {Catch, CatchOver, PointYou, PointYouOver} from './shots/CancelShots';
import {BulletTime, BulletTimeOver, Sign2, Sign2Over} from './shots/RepriseShots';
import {BowlDown, Eat, Ground} from './shots/BreakfastShots';
import {HangUp, HangUpOver, Fireworks, FireworksOver, GiantClick, GiantClickOver, Celebrate, CelebrateOver, CraneUp, CraneUpOver} from './shots/FinaleShots';

const SUNRISE = {background: '#ffb48a', env: 'sunset' as const, lens: {saturation: 1.15, vignette: 0.3}};

export const SHOTS: ShotDef[] = [
  {id: 'A-open', from: 0, to: 67, Scene: Open, Over: OpenOver},
  {id: 'B-morph', from: 67, to: 116, Scene: Morph, Over: MorphOver},
  {id: 'C-paper', from: 116, to: 166, Scene: Paper},
  {id: 'D-trophy', from: 166, to: 207, Scene: Trophy, Over: TrophyOver},
  {id: 'E-cantTakeDown', from: 207, to: 248, Scene: CantTakeDown, Over: CantTakeDownOver},
  {id: 'F-houseFree', from: 248, to: 297, Scene: HouseFree, Over: HouseFreeOver},
  {id: 'G-stampStorm', from: 297, to: 355, Scene: StampStorm, Over: StampStormOver},
  {id: 'H-catch', from: 355, to: 427, Scene: Catch, Over: CatchOver},
  {id: 'I-pointYou', from: 427, to: 509, Scene: PointYou, Over: PointYouOver},
  {id: 'J-bulletTime', from: 509, to: 558, Scene: BulletTime, Over: BulletTimeOver},
  {id: 'K-sign2', from: 558, to: 639, Scene: Sign2, Over: Sign2Over},
  {id: 'L-bowlDown', from: 639, to: 671, Scene: BowlDown},
  {id: 'M-eat', from: 671, to: 737, Scene: Eat},
  {id: 'N-ground', from: 737, to: 770, Scene: Ground},
  {id: 'O-hangUp', from: 770, to: 818, Scene: HangUp, Over: HangUpOver},
  {id: 'P-fireworks', from: 818, to: 878, Scene: Fireworks, Over: FireworksOver},
  {id: 'Q-giantClick', from: 878, to: 947, Scene: GiantClick, Over: GiantClickOver},
  {id: 'R-celebrate', from: 947, to: 1017, Scene: Celebrate, Over: CelebrateOver},
  {id: 'S-craneUp', from: 1017, to: 1134, Scene: CraneUp, Over: CraneUpOver},
];

export const Final: React.FC = () => {
  const f = useCurrentFrame();
  const af = useAbsoluteFrame();
  const shot = SHOTS.find((s) => f >= s.from && f < s.to) ?? SHOTS[SHOTS.length - 1];
  const sf = f - shot.from;
  const p = {f: sf, af, lf: f};
  const S = shot.Scene;
  const O = shot.Over;
  const U = shot.Under;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {U ? <U {...p} /> : null}
      <Stage {...SUNRISE} {...shot.stage}>
        <S {...p} />
      </Stage>
      {O ? <O {...p} /> : null}
    </AbsoluteFill>
  );
};
