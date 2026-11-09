// S5 · HOME IN THE GOLD (182.83–187.18) — low, from behind, the camera travelling with them: the man (hood down) and
// the dog (three-quarter, tail going) walk side by side across the wet plain toward the house, a black cube far right
// with its door open on gold light and one warm window. Its TENURE iris lock is a dead black disc. Above the house,
// where TENURE's price used to float, [42] hangs as bone light (BUY red, dying; GOOD gold). [41]'s last word holds
// there for its last half-second.
import React from 'react';
import {S, cameraFovForVisible} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy, SilPancake} from '../../../lib/SilCast';
import {FinalLyric} from '../FinalLyric';
import {FogLayers, WetGround} from '../../../lib/atmos';
import {HouseCube} from '../../../lib/sets';
import {guyWalk, GUY} from '../../../../lib/characters/Guy';
import {pancakeWalk} from '../../../../lib/characters/Pancake';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {Skyline, CITY_DARK} from '../City';
import {dyingRed} from '../lyricFx';
import {pitchTarget, pxToM, screenPoint, V3} from '../frame';

const SPEED = GUY.strideLength * 0.94; // ≈ 1.07 m/s
export const HOUSE_AT: V3 = [17, 0, -76];
const VIS = 19;
const PITCH = 1.4;
const YAW = 3; // deg, toward the house
const deg = Math.PI / 180;

export const Walk: React.FC<{t: number; f: number; u: number}> = ({t, f}) => {
  const fov = cameraFovForVisible(VIS);
  const z = -SPEED * (f / 30); // they walk straight toward −Z
  const cam: V3 = [1.3, 1.05, 9.6 + z];
  const target = pitchTarget(cam, PITCH, YAW);
  const D = 2000;
  // lyric over the house (fixed in the world, framed for the mid-shot camera)
  const midCam: V3 = [1.3, 1.05, 9.6 - SPEED * 2.15];
  const ld = midCam[2] - HOUSE_AT[2];
  const em = pxToM(62, ld, VIS);
  const lp = screenPoint(midCam, pitchTarget(midCam, PITCH, YAW), VIS, 0.34, 0.57, ld - 10);
  const sunX = (D + cam[2]) * Math.tan(-2 * deg);
  return (
    <SilStage fog={{color: fogAt(t), near: 120, far: 3000}} camera={{far: 4000, near: 0.3}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <DawnSky t={t} distance={D + cam[2]} eye={cam[1]} position={[0, 0, -D]} sunX={sunX} bandDeg={3.0} />
      <WetGround size={[6000, 6000]} color={S.void} reflectivity={0.78} puddles={0.5} streak={0.7} time={t} seed={13} />
      <Skyline t={t} position={[0, 0, -1150]}
        grid={{rows: 5, cols: 30, spacing: 76, seed: 53, height: [20, 64], footprint: [20, 38], centreBoost: 0.1, ...CITY_DARK}} />
      <FogLayers count={4} near={10} far={500} width={1400} height={50} color={fogAt(t, 0.45)} density={0.05} time={t} scale={140} position={[0, 0, -85]} />
      <HouseCube position={HOUSE_AT} time={t} warmWindow={1} doorOpen={1} interior={0.9} interiorColor={S.dawnGold}
        doorIris={{intensity: 0, open: 1, glow: 0}} irisLight={0} />
      {[41, 42].map((line) => (
        <FinalLyric key={line} line={line} time={t} mode="light" size={em} maxWidth={em * 15} intensity={1.0} halo={0.4}
          position={lp} mirror={false} perWord={dyingRed(t, {size: em, dir: 1, seed: line + 7})} />
      ))}
      <SilGuy pose={guyWalk(t)} hood={0} rotation-y={Math.PI} position={[0, 0, z]} rim={goldRim(t, [0, 1], 0.45)} />
      <SilPancake pose={{...pancakeWalk(t, SPEED, 1), tailWagAmount: 1, earPerk: 0.4}} rotation-y={Math.PI - 0.25} position={[0.75, 0, z - 0.25]}
        rim={goldRim(t, [0, 1], 0.4)} />
    </SilStage>
  );
};
