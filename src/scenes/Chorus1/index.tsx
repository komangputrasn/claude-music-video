/**
 * Chorus1 (song 57.75–92.56 s, frames 1732–2777, lines [12]–[19]).
 * The first big payoff: maximal Y2K daytime. One <Stage> drives every shot (hard cuts on beats/words);
 * the split-screen shot mounts a second Stage. See SHOTS below for the shot list.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../../lib/three';
import {SKY_PRESETS} from '../../lib/sets/Exterior';
import {useAbsoluteFrame} from '../../lib/time';
import {ShotDef} from './shots/common';
import {PoseTest} from './dev/PoseTest';
import {HouseWrap} from './shots/HouseShots';
import {Open, OpenOver, HeroFlip, HeroFlipOver} from './shots/WordShots';
import {PlanShrug, PlanShrugOver, DoneClose, PointShot, PointOver1, PointOver2, HighAngle} from './shots/PerformShots';
import {Chase1, Chase2, Chase1Over, Chase2Over} from './shots/ChaseShots';
import {Tunnel1, Tunnel1Over, Tunnel2, Tunnel2Over, TUNNEL_STAGE} from './shots/TunnelShots';
import {SplitLeft, SplitOver, splitLeftStyle, RoofSign, RoofSignOver} from './shots/SplitShots';
import {DogBeg, DogBegOver, DogPedestal, DogOverhead} from './shots/DogShots';
import {NightSnap, NightSnapOver} from './shots/EndShots';

const DEV_TEST = false;
const DAY = {background: '#4aa3ff', env: SKY_PRESETS.day.env, lens: {saturation: 1.18, vignette: 0.32}} as const;

const Point1: ShotDef['Scene'] = (p) => <PointShot {...p} variant={1} />;
const Point2: ShotDef['Scene'] = (p) => <PointShot {...p} variant={2} />;

export const SHOTS: ShotDef[] = [
  {id: 'TEST', from: -100, to: -90, Scene: PoseTest, stage: {background: '#333', env: 'chrome'}},
  {id: 'S01-open', from: 0, to: 49, Scene: Open, Over: OpenOver},
  {id: 'S02-heroFlip', from: 49, to: 115, Scene: HeroFlip, Over: HeroFlipOver},
  {id: 'S03-houseWrap', from: 115, to: 180, Scene: HouseWrap},
  {id: 'S04-planShrug', from: 180, to: 245, Scene: PlanShrug, Over: PlanShrugOver},
  {id: 'S05-doneClose', from: 245, to: 291, Scene: DoneClose},
  {id: 'S06-tunnel1', from: 291, to: 352, Scene: Tunnel1, Over: Tunnel1Over, stage: TUNNEL_STAGE},
  {id: 'S07-chase1', from: 352, to: 440, Scene: Chase1, Over: Chase1Over},
  {id: 'S08-point1', from: 440, to: 510, Scene: Point1, Over: PointOver1},
  {id: 'S09-split', from: 510, to: 572, Scene: SplitLeft, Over: SplitOver, stageStyle: splitLeftStyle},
  {id: 'S10-roofSign', from: 572, to: 636, Scene: RoofSign, Over: RoofSignOver},
  {id: 'S11-dogBeg', from: 636, to: 702, Scene: DogBeg, Over: DogBegOver},
  {id: 'S12-pedestal', from: 702, to: 735, Scene: DogPedestal},
  {id: 'S13-overhead', from: 735, to: 767, Scene: DogOverhead},
  {id: 'S14-highAngle', from: 767, to: 832, Scene: HighAngle},
  {id: 'S15-tunnel2', from: 832, to: 881, Scene: Tunnel2, Over: Tunnel2Over, stage: TUNNEL_STAGE},
  {id: 'S16-chase2', from: 881, to: 962, Scene: Chase2, Over: Chase2Over},
  {id: 'S17-point2', from: 962, to: 1028, Scene: Point2, Over: PointOver2},
  {id: 'S18-nightSnap', from: 1028, to: 1045, Scene: NightSnap, Over: NightSnapOver},
];

export const Chorus1: React.FC = () => {
  const f = useCurrentFrame();
  const af = useAbsoluteFrame();
  const T = DEV_TEST ? SHOTS[0] : null;
  const shot = T ?? SHOTS.find((s) => f >= s.from && f < s.to) ?? SHOTS[SHOTS.length - 1];
  const sf = f - shot.from;
  const p = {f: sf, af, lf: f};
  const S = shot.Scene;
  const O = shot.Over;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Stage {...DAY} {...shot.stage} style={shot.stageStyle ? shot.stageStyle(sf) : undefined}>
        <S {...p} />
      </Stage>
      {O ? <O {...p} /> : null}
    </AbsoluteFill>
  );
};
