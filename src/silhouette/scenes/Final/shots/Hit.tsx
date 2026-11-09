// S1 · THE HIT (166.39–169.72) — he stands with his back to us on the wet plain, facing the city. On the hit every red
// screen, iris and lease tag in the city stutters and dies; the dawn rises through the haze behind the skyline and
// floods the sky and its mirror on the wet ground. The hood comes down (168.35–168.95). [38] stands as monumental
// black letters on the plain against the hazy dawn, split around him; BUY glows red, stutters and falls.
import React from 'react';
import {S, GREYS, cameraFovForVisible} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy} from '../../../lib/SilCast';
import {FinalLyric} from '../FinalLyric';
import {FogLayers, WetGround} from '../../../lib/atmos';
import {guyIdle, mergePose, mixPose} from '../../../../lib/characters/Guy';
import {lerp} from '../../../../lib/time';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {Skyline, DyingScreen, DyingIris, CITY_DARK} from '../City';
import {composeFx, dyingRed, splitGap} from '../lyricFx';
import {dawn, easeOut, redFail, smooth, T_HIT} from '../timing';
import {pitchTarget, pxToM, V3} from '../frame';

export const HOOD_DOWN = {from: 168.35, to: 168.95};

/**
 * the hood pull: right hand reaches up and back over the head, pulls the hood down, then the arm comes down with the
 * elbow still folded (bend releases later than the shoulder) so the hand never swings back up above the head (a wave).
 */
export const hoodPull = (t: number) => {
  const up = smooth((t - 168.0) / 0.4) * (1 - smooth((t - 169.0) / 0.55));
  const bend = smooth((t - 168.0) / 0.3) * (1 - smooth((t - 169.35) / 0.4));
  const back = smooth((t - 168.4) / 0.45);
  return {up, bend, back};
};

const VIS = 17;
const deg = Math.PI / 180;

export const Hit: React.FC<{t: number; f: number; u: number}> = ({t, u}) => {
  const k = dawn(t);
  const fov = cameraFovForVisible(VIS);
  const camZ = lerp(12.5, 9.9, easeOut(u, 2));
  const cam: V3 = [0, 1.0, camZ];
  const pitch = 1.6;
  const target = pitchTarget(cam, pitch);
  const D = 2000;
  const hood = 1 - smooth((t - HOOD_DOWN.from) / (HOOD_DOWN.to - HOOD_DOWN.from));
  const hp = hoodPull(t);
  const base = guyIdle(t, 2);
  const reach = mergePose(base, {armR: {shoulderX: 2.7, shoulderZ: 0.55, twist: -0.4, swing: 0}, headPitch: lerp(0.02, -0.12, hp.back)});
  const mixed = mixPose(base, reach, hp.up);
  const pose = mergePose(mixed, {armR: {...mixed.armR, elbow: lerp(base.armR?.elbow ?? 0.2, lerp(1.2, 1.9, hp.back), hp.bend)}});
  // the lyric: black letters standing on the plain ~270 m out, against the hazy dawn, split around him:
  // "YOU SAID BUY NOW," to his left, "BUT I'M GOOD FOR NOW," to his right
  const lz = -262;
  const dist = camZ - lz;
  const em = pxToM(60, dist, VIS);
  const split = splitGap(38, 4, em, 2 * dist * Math.tan(3.3 * deg));
  const red = redFail(t, T_HIT, 0.55, 1);
  const haze = fogAt(t, 0.8, GREYS.g2, 1.0);
  return (
    <SilStage fog={{color: haze, near: 90, far: 1600}} camera={{far: 4000, near: 0.5}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <DawnSky t={t} distance={D + camZ} eye={cam[1]} position={[0, 0, -D]} sunX={0} sunElev={-1.3} bandDeg={3.0} red={red} />
      <WetGround size={[6000, 6000]} color={S.void} reflectivity={0.75} puddles={0.42} streak={0.7} time={t} seed={3} />
      <Skyline t={t} position={[0, 0, -1150]}
        grid={{rows: 6, cols: 34, spacing: 72, seed: 11, height: [26, 92], footprint: [22, 40], centreBoost: 0.2,
          avoid: [[0, -180, 70], [0, -110, 70], [0, -40, 70], [0, 30, 70], [0, 100, 70], [0, 170, 70]], ...CITY_DARK}}
        tags={{density: 0.018, offFrom: T_HIT + 0.05, offTo: T_HIT + 1.2, order: 'centre', size: 3}} />
      {/* the red screens and the city's eyes: they stutter and die on the hit (dead irises = black discs) */}
      <DyingScreen t={t} seed={1} position={[-205, 34, -900]} width={60} height={34} content="wordmark" dur={0.5} />
      <DyingScreen t={t} seed={2} position={[215, 30, -900]} width={60} height={34} content="upgrade" dur={0.7} />
      <DyingScreen t={t} seed={4} position={[-330, 40, -1080]} width={52} height={30} content="price" dur={0.9} />
      <DyingScreen t={t} seed={5} position={[345, 44, -1080]} width={52} height={30} content="plusOnly" dur={0.6} />
      <DyingIris t={t} seed={7} position={[-95, 66, -1060]} radius={16} dur={0.8} />
      <DyingIris t={t} seed={8} position={[110, 58, -1060]} radius={13} dur={1.0} />
      <FogLayers count={5} near={20} far={700} width={2600} height={110} color={haze} density={0.07 * (0.3 + 0.7 * k)} time={t} scale={260} position={[0, 0, -290]} />
      <FinalLyric line={38} time={t} mode="dark" size={em} anchor="bottom" position={[split.x, 0.1, lz]} halo={1.3}
        perWord={composeFx(split.fx, dyingRed(t, {size: em, hold: 0.55, stutter: 0.35, dir: -1, seed: 1}))} />
      <SilGuy pose={pose} hood={hood} rotation-y={Math.PI} position={[0, 0, 0]} rim={goldRim(t, [0.3, 1], 0.5)} />
    </SilStage>
  );
};
