// TERMS · Outro — the world around the house, shared by both shots so the cut matches: the dawn sky (sun dead centre
// behind the house), the wet mirror plain, a low black city far off in the haze (parted where the house stands against
// the bright band), and layered ground haze that starts BEHIND the house (never in front of the heroes).
import React from 'react';
import {S} from '../../lib/palette';
import {FogLayers, WetGround} from '../../lib/atmos';
import {CityGrid} from '../../lib/sets';
import {OutroSky, dawnHaze} from './Sky';

type V3 = [number, number, number];

const SKY_D = 1500;
const CITY_AT: V3 = [0, 0, -1350];
const CITY = {
  rows: 6, cols: 40, spacing: 64, seed: 53, height: [8, 40] as [number, number], footprint: [16, 38] as [number, number],
  centreBoost: 0, jitter: 0.5, avoid: [[0, 160, 120]] as [number, number, number][], color: '#16181C', glass: '#0E1013',
  litFraction: 0, ambient: 0.22,
};

/** scene fog (warm haze) for every Outro shot */
export const OUTRO_FOG = {color: dawnHaze(0.32, 0.85), near: 90, far: 1500};

export type WorldProps = {
  t: number;
  /** the shot's camera (sky card distance + horizon height) */
  cam: V3;
  /** sun elevation (deg above the horizon) */
  sunElev: number;
  /** ground mirror settings per shot (one WetGround per shot) */
  ground?: {size?: number; reflectivity?: number; puddles?: number; streak?: number; seed?: number};
  rays?: number;
  glow?: number;
};

export const World: React.FC<WorldProps> = ({t, cam, sunElev, ground = {}, rays = 0.1, glow = 1}) => (
  <>
    <OutroSky t={t} distance={SKY_D + cam[2]} eye={cam[1]} position={[0, 0, -SKY_D]} sunElev={sunElev} bandDeg={2.6} rays={rays}
      glow={glow} />
    <WetGround size={ground.size ?? 6000} color={S.void} reflectivity={ground.reflectivity ?? 0.78} puddles={ground.puddles ?? 0.5}
      streak={ground.streak ?? 0.7} time={t} seed={ground.seed ?? 13} />
    <group position={CITY_AT}>
      <CityGrid {...CITY} />
    </group>
    <FogLayers count={6} near={1} far={900} width={1800} height={36} color={dawnHaze(0.45, 0.95)} density={0.07} time={t}
      scale={180} position={[0, 0, -6]} drift={[0.35, 0.02]} />
  </>
);
