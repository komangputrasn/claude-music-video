// S7 · THE CRANE (193.68–204.20) — from just above the house (the man on the step, the dog at his bowl in the gold
// pool) the camera rises slowly up and back to the end of the scene: a black city parted toward the sunrise, every tower
// dark, ONE warm window (the house), gold haze between the blocks. The last red in the city — a scatter of lease tags —
// blinks out on "click to cancel, I cancelled you". [44] and [45] stand as black letters far out on the horizon against
// the dawn: UPGRADE glows red, stutters and falls out of the line; in [45] CANCEL / CANCELLED lose their red glow but
// stay, so the last image reads the whole line in black against the sunrise. The sun sits dead centre on the axis just
// above the horizon, at the end of the parted city: hidden behind the house at the start, it clears the roof as the
// crane rises, and at 204.20 it is where the Outro's sun is (centred behind its house, y ≈ 364 vs 384): the cut matches.
import React, {useMemo} from 'react';
import {S, GREYS, cameraFovForVisible} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy, SilPancake} from '../../../lib/SilCast';
import {WorldLyric, measureLyric} from '../../../lib/WorldLyric';
import {Backlight, FogLayers, WetGround} from '../../../lib/atmos';
import {HouseCube, HOUSE_SPOTS, CityGrid, cityGridLayout} from '../../../lib/sets';
import {LeaseTags, leaseTagBox, mergeTagSets} from '../../../lib/tenure';
import {PlainBowl} from '../../../lib/props';
import {guyIdle} from '../../../../lib/characters/Guy';
import {pancakeEat, PANCAKE} from '../../../../lib/characters/Pancake';
import {lerp, ramp} from '../../../../lib/time';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {CITY_DARK} from '../City';
import {dyingRed, redGlowDies} from '../lyricFx';
import {dawn, smooth} from '../timing';
import {fitEm, halfWidthAt, pitchTarget, pxToM, V3} from '../frame';

// the city parts in a wedge toward the sunrise (−Z); the house sits at the near end; the crane path (+Z) is clear
const GRID_AT: V3 = [0, 0, -420];
const AVOID_W: [number, number, number][] = [[0, 0, 48]];
for (let z = -45; z >= -1500; z -= 50) AVOID_W.push([0, z, 26 + 0.21 * -z]);
for (let z = 50; z <= 560; z += 40) AVOID_W.push([0, z, 34]);
const AVOID = AVOID_W.map(([x, z, r]) => [x - GRID_AT[0], z - GRID_AT[2], r] as [number, number, number]);
const GRID = {rows: 30, cols: 36, spacing: 62, seed: 71, height: [12, 54] as [number, number], footprint: [20, 40] as [number, number],
  centreBoost: 0.1, avoid: AVOID, ...CITY_DARK, ambient: 0.3};
const deg = Math.PI / 180;
/** explicit rows (font-independent) */
const ROWS: Record<number, number[][]> = {44: [[0, 1, 2], [3, 4, 5]], 45: [[0, 1, 2], [3, 4, 5]]};

/** a point "at infinity" (R m out) seen from `cam` at elevation/azimuth (deg): sits on the dawn like the sun does */
const farPoint = (cam: V3, elevDeg: number, azDeg: number, R: number): V3 => [
  cam[0] + R * Math.cos(elevDeg * deg) * Math.sin(azDeg * deg),
  cam[1] + R * Math.sin(elevDeg * deg),
  cam[2] - R * Math.cos(elevDeg * deg) * Math.cos(azDeg * deg),
];

export const Crane: React.FC<{t: number; f: number; u: number}> = ({t, f, u}) => {
  const k = dawn(t);
  const s = 0.1 * u + 0.9 * smooth(u);
  const cam: V3 = [0, lerp(5.5, 84, s), lerp(42, 440, s)];
  const pitch = lerp(-1.0, -4.0, s);
  const target = pitchTarget(cam, pitch);
  const VIS = lerp(22, 23, s);
  const fov = cameraFovForVisible(VIS);
  const D = 2000;
  const tags = useMemo(() => {
    const blocks = cityGridLayout(GRID);
    return mergeTagSets(...blocks.map((b, i) => leaseTagBox({width: b.w, depth: b.d, height: b.h, density: 0.004, fill: 0.5, seed: 900 + i, x: b.x, z: b.z})));
  }, []);
  // the words: black letters on the horizon, R m out, always just above the band
  const R = 1500;
  const wide = Math.max(...[44, 45].map((l) => measureLyric(l, 1, undefined, {rows: ROWS[l]}).width));
  const em = fitEm(pxToM(58, R, VIS), wide, 2 * 0.94 * halfWidthAt(R, VIS));
  // the words sit just above the house at the start and settle low over the horizon as the camera rises, centred on
  // the axis with clear sky between them and the sun below
  const lp = farPoint(cam, lerp(4.2, 2.8, s), 0, R);
  const glow = farPoint(cam, 2.6, 0, R + 150);
  const haze = fogAt(t, 0.6, GREYS.g2, 1.0);
  // the sun: centred (azimuth 0), its disc clear of the horizon flare (nearer the horizon it reads as a flat ellipse);
  // at the end it sits at y ≈ 364 of the frame (pitch −4°, visible fov 23°), where the Outro's opening wide has its sun
  // (y ≈ 384, behind the house)
  const sunElev = lerp(0.6, 1.1, s);
  return (
    <SilStage fog={{color: haze, near: 140, far: 2300}} camera={{far: 4200, near: 1}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <DawnSky t={t} distance={D + cam[2]} eye={cam[1]} position={[0, 0, -D]} sunX={0} sunElev={sunElev} bandDeg={3.0} />
      <Backlight color={S.dawnGold} position={glow} size={[1500, 260]} shape="radial" softness={1} intensity={0.3 * k} time={t} noise={0.2} />
      <WetGround size={[7000, 7000]} color={S.void} reflectivity={0.55} puddles={1} streak={0.3} time={t} seed={19} />
      <group position={GRID_AT}>
        <CityGrid {...GRID} />
        <LeaseTags positions={tags.positions} facing={tags.facing} time={t} offFrom={196.2} offTo={200.6} offOrder="random" offJitter={0.4}
          size={2.4} intensity={1.2} minPx={1.8} fog={0.55} flicker={0.2} />
      </group>
      <FogLayers count={7} near={60} far={1300} width={2600} height={70} color={haze} density={0.07} time={t} scale={240} position={[0, 0, -40]} />
      <WorldLyric redFill={1} line={44} rows={ROWS[44]} time={t} mode="dark" size={em} anchor="bottom" halo={0.9} position={lp} fog={false} mirror={false}
        perWord={dyingRed(t, {size: em, dir: -1, hold: 0.8, seed: 61})} />
      {/* the last line of the chorus: CANCEL / CANCELLED lose their red (the last red dies) but stay, black on the dawn */}
      <WorldLyric redFill={1} line={45} rows={ROWS[45]} time={t} mode="dark" size={em} anchor="bottom" halo={0.9} position={lp} until={206} fog={false} mirror={false}
        glow={redGlowDies(t, 0.9, 0.5, 45)} />
      <HouseCube time={t} warmWindow={1} doorOpen={1} interior={0.9} interiorColor={S.dawnGold} doorIris={{intensity: 0, glow: 0}} irisLight={0} />
      <SilGuy position={HOUSE_SPOTS.guySeat} pose={{...guyIdle(t, 4), sit: 1}} hood={0} rim={goldRim(t, [0, 1], 0.4)} />
      <group position={[HOUSE_SPOTS.bowl[0] - 0.12, 0, HOUSE_SPOTS.bowl[2] + 0.35]} rotation-y={-0.7}>
        <SilPancake pose={{...pancakeEat(t), tailWagAmount: 1}} rim={goldRim(t, [0, 1], 0.4)} />
        <PlainBowl position={PANCAKE.bowl} fill={0.35 - 0.15 * ramp(f, 0, 300)} goldPool={1} poolSize={2.2} shaft={0} />
      </group>
    </SilStage>
  );
};
