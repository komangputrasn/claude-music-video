// S2 · THE PAPER 1984 (169.72–174.10) — frontal, low, symmetrical: he faces us, hood down, the low sun beside him.
// On "paper" (171.22) he raises the book; on "1984" (171.90) it opens: the brightest white in the film. Pancake sits
// at his side in profile looking up at it, tail going. [38]'s tail and [39] hang as bone light in the dim haze above
// him (PAPER in gold) — where TENURE's sky-screens used to hang.
import React from 'react';
import {S, cameraFovForVisible} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy, SilPancake} from '../../../lib/SilCast';
import {FinalLyric} from '../FinalLyric';
import {FogLayers, WetGround} from '../../../lib/atmos';
import {HeldPaperBook} from '../../../lib/props';
import {guyHoldUp, mergePose} from '../../../../lib/characters/Guy';
import {pancakeIdle} from '../../../../lib/characters/Pancake';
import {lerp} from '../../../../lib/time';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {Skyline, CITY_DARK} from '../City';
import {dyingRed} from '../lyricFx';
import {easeOut, smooth} from '../timing';
import {pxToM, screenPoint, V3} from '../frame';

const VIS = 21;
const deg = Math.PI / 180;

export const Book: React.FC<{t: number; f: number; u: number}> = ({t, u}) => {
  const fov = cameraFovForVisible(VIS);
  const camZ = lerp(7.4, 6.6, easeOut(u, 1.6));
  const cam: V3 = [0, 0.95, camZ];
  const target: V3 = [0, 1.3, 0];
  const D = 2000;
  const lift = smooth((t - 170.92) / 0.55);
  const open = smooth((t - 171.78) / 0.42);
  const pose = mergePose(guyHoldUp(lift, t), {headPitch: lerp(0.1, -0.3, lift)});
  // lyric block: bone light ~70 m behind him, in the upper part of the picture (fixed in the world: mid-shot camera)
  const midCam: V3 = [0, 0.95, 7.0];
  const ld = 77;
  const em = pxToM(70, ld, VIS);
  const lp = screenPoint(midCam, target, VIS, 0.3, 0.54, ld);
  const sunX = (D + camZ) * Math.tan(13 * deg);
  return (
    <SilStage fog={{color: fogAt(t), near: 200, far: 3200}} camera={{far: 4000, near: 0.2}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <DawnSky t={t} distance={D + camZ} eye={cam[1]} position={[0, 0, -D]} sunX={sunX} bandDeg={2.6} />
      <WetGround size={[6000, 6000]} color={S.void} reflectivity={0.75} puddles={0.42} streak={0.7} time={t} seed={5} />
      <Skyline t={t} position={[0, 0, -1100]}
        grid={{rows: 5, cols: 30, spacing: 74, seed: 23, height: [22, 70], footprint: [20, 38], centreBoost: 0.1, ...CITY_DARK}} />
      <FogLayers count={4} near={60} far={500} width={1600} height={80} color={fogAt(t, 0.45)} density={0.05} time={t} scale={200} position={[0, 0, -10]} />
      {/* sky text: not mirrored in the wet plain (its reflection would poke up, cut, at the bottom edge) */}
      {[38, 39].map((line) => (
        <FinalLyric key={line} line={line} time={t} mode="light" size={em} maxWidth={em * (line === 38 ? 15 : 11)} intensity={0.9} halo={0.35}
          position={lp} mirror={false} perWord={dyingRed(t, {size: em, dir: 1, seed: line})} />
      ))}
      <SilGuy pose={pose} hood={0} position={[0, 0, 0]} rim={goldRim(t, [0.45, 1], 0.5)}
        rightHand={<HeldPaperBook open={open} brightness={2.6} halo={0.8} />} />
      <SilPancake pose={{...pancakeIdle(t, 3), sit: 1, headPitch: 0.3 + 0.3 * lift, headYaw: 0, tailWag: t * 2.4, tailWagAmount: 0.9, earPerk: 0.3}}
        position={[1.0, 0, 0.25]} rotation-y={-Math.PI / 2} rim={goldRim(t, [0.5, 1], 0.45)} />
    </SilStage>
  );
};
