// S6 · THE HERO SHOT (187.18–193.68) — held. Low long lens at bowl height: Pancake in profile eating from the plain
// bowl on the ground in a pool of gold light, tail wagging; the man's legs stand at the right edge. Behind, the wet
// ground mirrors the dawn. [43] stands on the ground beside the bowl as black letters against the gold haze (BOWL and
// GROUND glow gold behind); [42]'s last words and [44]'s first ones take the same place.
import React from 'react';
import {S, cameraFovForVisible} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy, SilPancake} from '../../../lib/SilCast';
import {WorldLyric, measureLyric} from '../../../lib/WorldLyric';
import {Backlight, LightPool, Motes, WetGround} from '../../../lib/atmos';
import {PlainBowl} from '../../../lib/props';
import {guyIdle} from '../../../../lib/characters/Guy';
import {pancakeEat, PANCAKE} from '../../../../lib/characters/Pancake';
import {lerp, ramp} from '../../../../lib/time';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {Skyline, CITY_DARK} from '../City';
import {dyingRed} from '../lyricFx';
import {dawn, easeOut} from '../timing';
import {fitEm, halfWidthAt, pitchTarget, pxToM, screenPoint, V3} from '../frame';

const VIS = 17;
const deg = Math.PI / 180;
/** explicit rows (font-independent) */
const ROWS: Record<number, number[][]> = {
  42: [[0, 1], [2, 3], [4, 5, 6], [7, 8]], // YOU SAID / BUY NOW, / BUT I'M GOOD / FOR NOW, (as S1; clear of the sun)
  43: [[0, 1], [2, 3], [4, 5, 6], [7, 8, 9]], // AND PANCAKE / EATS BREAKFAST / FROM A BOWL / ON THE GROUND.
  44: [[0, 1, 2], [3, 4], [5]], // I'M DONE WITH / UPGRADE TO / CONTINUE,
};
const LX = -0.5; // block centre, visible-picture x

export const Bowl: React.FC<{t: number; f: number; u: number}> = ({t, f, u}) => {
  const k = dawn(t);
  const fov = cameraFovForVisible(VIS);
  // a slow, held creep toward the bowl
  const cam: V3 = [lerp(-0.3, -0.2, u), 0.3, lerp(5.6, 5.0, easeOut(u, 1.5))];
  const target = pitchTarget(cam, 1.2);
  const D = 2000;
  // Pancake faces screen-left (−X); his bowl sits ahead of him at PANCAKE.bowl in his own frame
  const dog: V3 = [0.62, 0, 0];
  const bowlW: V3 = [dog[0] - PANCAKE.bowl[2], 0, 0];
  // lyric: black letters standing on the ground ~9 m behind the bowl, in the left part of the frame
  const midCam: V3 = [-0.25, 0.3, 5.3];
  const lz = -9;
  const ld = midCam[2] - lz;
  const wide = Math.max(...[42, 43, 44].map((l) => measureLyric(l, 1, undefined, {rows: ROWS[l]}).width));
  const em = fitEm(pxToM(54, ld, VIS), wide, 2 * (0.94 - Math.abs(LX)) * halfWidthAt(ld, VIS));
  const lx = screenPoint(midCam, pitchTarget(midCam, 1.2), VIS, LX, 0, ld)[0];
  const sunX = (D + cam[2]) * Math.tan(-3.0 * deg);
  return (
    <SilStage fog={{color: fogAt(t), near: 60, far: 2600}} camera={{far: 4000, near: 0.15}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <DawnSky t={t} distance={D + cam[2]} eye={cam[1]} position={[0, 0, -D]} sunX={sunX} bandDeg={3.4} />
      {/* low sunlit haze behind the words */}
      <Backlight color={S.dawnGold} position={[lx, 0.8, -40]} size={[60, 6]} shape="radial" softness={1} intensity={0.32 * k} time={t} noise={0.3} />
      <WetGround size={[4000, 4000]} color={S.void} reflectivity={0.8} puddles={0.5} streak={0.5} time={t} seed={17} />
      <Skyline t={t} position={[0, 0, -1150]}
        grid={{rows: 5, cols: 30, spacing: 76, seed: 61, height: [20, 60], footprint: [20, 38], centreBoost: 0.1, ...CITY_DARK}} />
      <LightPool position={bowlW} radius={0.9} color={S.dawnGold} intensity={0.55 * k} haze={0.22} hazeHeight={1.6} />
      <Motes count={220} area={[2.6, 1.4, 1.8]} position={[bowlW[0], 0, -0.4]} time={t} color={S.dawnGold} size={0.007} intensity={0.7} drift={[0.02, 0.03, 0]} />
      {[42, 43, 44].map((line) => (
        <WorldLyric redFill={1} key={line} line={line} rows={ROWS[line]} time={t} mode="dark" size={em} anchor="bottom" halo={1.3} goldGlow={1.4}
          position={[lx, 0.02, lz]} perWord={dyingRed(t, {size: em, dir: 1, seed: line + 13})} />
      ))}
      <group position={dog} rotation-y={-Math.PI / 2}>
        <SilPancake pose={{...pancakeEat(t), tailWagAmount: 1}} rim={goldRim(t, [0, 1], 0.45)} />
        {/* NOTE: PlainBowl's own haze shaft (SoftCone) blacks out the whole frame from this low camera — shaft={0} + LightPool */}
        <PlainBowl position={PANCAKE.bowl} fill={1 - 0.65 * ramp(f, 0, 190)} goldPool={1} poolSize={1.15} shaft={0} />
      </group>
      {/* his legs at the right edge, standing by */}
      <SilGuy pose={guyIdle(t, 9)} hood={0} position={[1.62, 0, -1.1]} rotation-y={-Math.PI / 2 - 0.2} rim={goldRim(t, [0, 1], 0.4)} />
    </SilStage>
  );
};
