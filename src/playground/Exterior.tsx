/**
 * Playground: exterior sets. Segments of 60 frames:
 *   0  day wallpaper wide (hills + house + clouds)      60  day 3/4 low angle
 *   120 sunrise porch                                   180 night house, lit windows
 *   240 night doorbell close-up                         300 night street + lamps (wet)
 *   360 gas station wide                                420 gas station pump close-up
 * Render: node scripts/still.mjs play Exterior --frames=0,60,120,180,240,300,360,420
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {SkyDome, SKY_PRESETS} from '../lib/sets/exterior/SkyDome';
import {RollingHills} from '../lib/sets/exterior/RollingHills';
import {House, HOUSE_SPOTS} from '../lib/sets/exterior/House';
import {ExteriorLights, SunFlare} from '../lib/sets/Exterior';
import {Street} from '../lib/sets/exterior/Street';
import {GasStation, GAS_SPOTS, toPumpLocal} from '../lib/sets/exterior/GasStation';
import {Car} from '../lib/props/Car';

export const duration = 480;


type V3 = [number, number, number];
const orbit = (r: number, a: number, y: number, c: V3 = [0, 0, 0]): V3 => [c[0] + Math.sin(a) * r, y, c[2] + Math.cos(a) * r];

export default function ExteriorPlayground() {
  const f = useCurrentFrame();
  const seg = Math.floor(f / 60);
  const lf = f % 60;
  const t = f / 30;

  if (seg <= 1) {
    const cam = seg === 0 ? orbit(46, -0.38 + lf * 0.003, -1.2) : lf < 30 ? orbit(15, 0.62 + lf * 0.003, 1.2) : orbit(17, 2.3, 3);
    const tgt: V3 = seg === 0 ? [0, 5.5, 0] : lf < 30 ? [0, 4.2, 2] : [0, 3.5, 0];
    return (
      <AbsoluteFill>
        <Stage env="sky" background="#000">
          <CameraRig position={cam} target={tgt} fov={seg === 0 ? 50 : 62} />
          <SkyDome preset="day" time={t} />
          <ExteriorLights preset="day" />
          <RollingHills palette="day" />
          <House time="day" mailboxFlag={1} />
          <SunFlare dir={SKY_PRESETS.day.sunDir} strength={seg === 0 ? 1 : 0.6} />
        </Stage>
      </AbsoluteFill>
    );
  }
  if (seg === 2) {
    const dusk = lf >= 30;
    const p = dusk ? 'dusk' : 'sunrise';
    return (
      <AbsoluteFill>
        <Stage env="sunset" background="#000">
          <CameraRig position={dusk ? [-18, 0.5, 26] : [4.5, 1.6, 12.5]} target={dusk ? [0, 4.5, 0] : [-1.6, 1.8, 4]} fov={dusk ? 40 : 55} />
          <SkyDome preset={p} time={t} />
          <ExteriorLights preset={p} />
          <RollingHills palette={p} />
          <House time={dusk ? 'night' : 'sunrise'} lightsOn={dusk ? 0.8 : undefined} />
          <SunFlare dir={SKY_PRESETS[p].sunDir} strength={0.8} />
        </Stage>
      </AbsoluteFill>
    );
  }
  if (seg === 3 || seg === 4) {
    const close = seg === 4;
    const cam: V3 = close ? [0.3, 1.5, 4.6] : orbit(19, 0.35 + lf * 0.003, 2.2);
    const tgt: V3 = close ? [HOUSE_SPOTS.doorbell[0] - 0.4, 1.5, 3.4] : [0, 4, 0];
    return (
      <AbsoluteFill>
        <Stage env="night" background="#000">
          <CameraRig position={cam} target={tgt} fov={close ? 50 : 52} />
          <SkyDome preset="night" time={t} />
          <ExteriorLights preset="night" />
          <RollingHills palette="night" grass={1500} flowers={200} />
          <House time="night" doorbellGlow={0.6 + 0.4 * Math.sin(t * 6)} />
        </Stage>
      </AbsoluteFill>
    );
  }
  if (seg === 5) {
    return (
      <AbsoluteFill>
        <Stage env="night" background="#000" fog={{color: SKY_PRESETS.night.fog, near: 25, far: 110}}>
          <CameraRig position={lf < 30 ? [4.6, 1.65, 16 - lf * 0.05] : [-1.5, 0.6, 6]} target={lf < 30 ? [2.5, 1.7, -10] : [3, 3.5, -6]} fov={lf < 30 ? 55 : 70} />
          <SkyDome preset="night" time={t} clouds={0} />
          <ExteriorLights preset="night" intensity={0.6} />
          <Street length={90} wet offset={lf * 0.05} />
        </Stage>
      </AbsoluteFill>
    );
  }
  const close = seg === 7;
  const n = GAS_SPOTS.pumpNozzle;
  return (
    <AbsoluteFill>
      <Stage env="night" background="#000">
        <CameraRig position={close ? [2.0, 1.7, 2.6] : orbit(22, 0.5 + lf * 0.004, 3.5, [0, 0, -2])} target={close ? [3.9, 1.1, 0.6] : [0, 2.5, -3]} fov={close ? 50 : 50} />
        <SkyDome preset="night" time={t} clouds={4} />
        <ExteriorLights preset="night" intensity={0.5} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#1a1f2a" roughness={0.8} />
        </mesh>
        <GasStation nozzleAt={lf >= 30 ? toPumpLocal([4.3, 1.05, 1.5]) : undefined} nozzleRot={[0.2, Math.PI / 2, 0]} screenText={lf >= 30 ? '$3.17' : undefined} />
        <Car position={GAS_SPOTS.carBay.position} rotation={[0, GAS_SPOTS.carBay.rotationY, 0]} headlights={0.6} doorOpen={lf >= 30 ? 1 : 0} />
      </Stage>
    </AbsoluteFill>
  );
}
