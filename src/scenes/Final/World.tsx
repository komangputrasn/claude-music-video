// The liberated world: the Chorus1 wallpaper hills + house, but at SUNRISE (gold / pink / blue sky), the sun climbing
// through the scene. Optional <HouseDeco> (the Chorus1 gift-wrap + price tag + padlock) that FALLS OFF with `release`.
import React from 'react';
import {SkyDome, ExteriorLights, RollingHills, House, SunFlare, Tree, Bush} from '../../lib/sets/Exterior';
import {HouseDeco, HouseDecoProps} from './HouseDeco';
import {sunVec, V3} from './common';
import {DUR} from './timing';

/** the sun climbs a little during the scene (local frame -> direction toward the sun) */
export const sunAt = (lf: number, lift = 0): V3 => sunVec(0.07 + 0.09 * Math.min(1, Math.max(0, lf / DUR)) + lift, -0.5);

export type WorldProps = {
  /** scene-local frame */
  lf: number;
  deco?: HouseDecoProps | null;
  house?: boolean;
  hills?: boolean;
  flare?: number;
  /** extra sun elevation (rad) — cheat the sun up for low hero angles */
  sunLift?: number;
  sunDir?: V3;
  sunScale?: number;
  clouds?: number;
  lightIntensity?: number;
  grass?: number;
  flowers?: number;
  trees?: boolean;
  /** sky sun-glow multiplier */
  skyGlow?: number;
};

const TREES: {p: V3; kind: 'round' | 'pine'; h: number; seed: number}[] = [
  {p: [-11, 0, -3], kind: 'pine', h: 6.5, seed: 1},
  {p: [10.5, 0, -6], kind: 'round', h: 5.5, seed: 2},
  {p: [-15, 0, 6], kind: 'round', h: 5, seed: 3},
  {p: [14, 0, 4], kind: 'pine', h: 5.5, seed: 4},
  {p: [-7, 0, -12], kind: 'round', h: 6, seed: 5},
];

export const World: React.FC<WorldProps> = ({lf, deco, house = true, hills = true, flare = 0.5, sunLift = 0, sunDir, sunScale = 1, clouds, lightIntensity = 1,
  grass, flowers, trees = true, skyGlow = 0.9}) => {
  const t = lf / 30;
  const sd = sunDir ?? sunAt(lf, sunLift);
  return (
    <>
      <SkyDome preset="sunrise" time={t + 40} sunDir={sd} clouds={clouds} sunScale={sunScale} glow={skyGlow} stars={0} />
      <ExteriorLights preset="sunrise" intensity={lightIntensity} />
      {/* soft warm bounce from the sunrise so the cast reads gold, not brown */}
      <hemisphereLight args={['#ffd9b0', '#5a8a3a', 0.35 * lightIntensity]} />
      {hills ? <RollingHills palette="sunrise" grass={grass} flowers={flowers} avoid={house ? undefined : []} /> : null}
      {house ? (
        <>
          <House time="sunrise" mailboxFlag={1} lights={false} />
          {deco ? <HouseDeco {...deco} /> : null}
        </>
      ) : null}
      {trees ? (
        <>
          {TREES.map((tr, i) => (
            <Tree key={i} position={tr.p} kind={tr.kind} height={tr.h} seed={tr.seed} time={t} />
          ))}
          <Bush position={[5.2, 0, 3.8]} seed={11} size={1.1} />
          <Bush position={[-5.0, 0, 2.5]} seed={12} size={1.2} />
        </>
      ) : null}
      {flare > 0 ? <SunFlare dir={sd} strength={flare} /> : null}
    </>
  );
};
