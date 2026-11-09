// The chorus world: maximal Y2K wallpaper day (impossible-green RollingHills, deep-blue SkyDome with fluffy clouds),
// the House at the origin (optionally gift-wrapped + price-tagged by <HouseDeco>), extra trees, and the sun flare.
import React from 'react';
import {SkyDome, ExteriorLights, RollingHills, House, SunFlare, Tree, Bush} from '../../lib/sets/Exterior';
import type {SkyPreset} from '../../lib/sets/Exterior';
import {HouseDeco, HouseDecoProps} from './HouseDeco';

type V3 = [number, number, number];
const n3 = (v: V3): V3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};
/** chorus sun: off to the right so most shots keep a deep-blue sky (S01 uses the preset's backlit sun) */
export const SIDE_SUN: V3 = n3([0.9, 0.42, -0.2]);

export type WorldProps = {
  t: number;
  preset?: SkyPreset;
  deco?: HouseDecoProps | null;
  house?: boolean;
  hills?: boolean;
  flare?: number;
  /** sky sun direction override (e.g. to put the sun behind a hero) */
  sunDir?: V3;
  clouds?: number;
  lightIntensity?: number;
  grass?: number;
  flowers?: number;
};

const TREES: {p: V3; kind: 'round' | 'pine'; h: number; seed: number}[] = [
  {p: [-11, 0, -3], kind: 'pine', h: 6.5, seed: 1},
  {p: [10.5, 0, -6], kind: 'round', h: 5.5, seed: 2},
  {p: [-15, 0, 6], kind: 'round', h: 5, seed: 3},
  {p: [14, 0, 4], kind: 'pine', h: 5.5, seed: 4},
  {p: [-7, 0, -12], kind: 'round', h: 6, seed: 5},
];

export const World: React.FC<WorldProps> = ({t, preset = 'day', deco, house = true, hills = true, flare = 0.8, sunDir = SIDE_SUN, clouds, lightIntensity = 1, grass, flowers}) => {
    const ht = preset === 'night' || preset === 'dusk' ? 'night' : preset === 'sunrise' ? 'sunrise' : 'day';
  return (
    <>
      <SkyDome preset={preset} time={t} sunDir={sunDir} clouds={clouds} />
      <ExteriorLights preset={preset} intensity={lightIntensity} />
      {hills ? <RollingHills palette={preset} grass={grass} flowers={flowers} avoid={house ? undefined : []} /> : null}
      {house ? (
        <>
          <House time={ht} mailboxFlag={1} lights={preset === 'night'} />
          {deco ? <HouseDeco {...deco} /> : null}
          {TREES.map((tr, i) => (
            <Tree key={i} position={tr.p} kind={tr.kind} height={tr.h} seed={tr.seed} time={t} />
          ))}
          <Bush position={[5.2, 0, 3.8]} seed={11} size={1.1} />
          <Bush position={[-5.0, 0, 2.5]} seed={12} size={1.2} />
        </>
      ) : null}
      {flare > 0 ? <SunFlare dir={sunDir} strength={flare} /> : null}
    </>
  );
};
