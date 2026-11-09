/**
 * Playground: <Car>. Segments of 60 frames:
 *   0   day 3/4 front, rolling + steering           60  night side view, driver door opening, headlights
 *   120 night rear 3/4, brake lights, fuel cap      180 dashboard close-up, needle sweeps then LOCKED
 *   240 seats frosting over (seatCam)               300 night low front hero, headlight beams
 * Render: node scripts/still.mjs play Car --frames=0,60,120,180,240,300
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {Car, CAR} from '../lib/props/Car';
import {SkyDome} from '../lib/sets/exterior/SkyDome';
import {ExteriorLights} from '../lib/sets/Exterior';
import {RollingHills} from '../lib/sets/exterior/RollingHills';
import {Street} from '../lib/sets/exterior/Street';

export const duration = 360;
type V3 = [number, number, number];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export default function CarPlayground() {
  const f = useCurrentFrame();
  const seg = Math.floor(f / 60);
  const lf = f % 60;
  const t = f / 30;

  if (seg === 0) {
    const z = lf * 0.08;
    const a = 0.75 + lf * 0.006;
    const cam: V3 = [Math.sin(a) * 6.2, 1.5, z + Math.cos(a) * 6.2];
    return (
      <AbsoluteFill>
        <Stage env="sky" background="#000">
          <CameraRig position={cam} target={[0, 0.75, z]} fov={42} />
          <SkyDome preset="day" time={t} />
          <ExteriorLights preset="day" />
          <RollingHills palette="day" plateau={30} grass={1200} flowers={300} scatter={[4, 30]} avoid={[[-2, -20, 2, 20]]} />
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.6, 60]} />
            <meshToonMaterial color="#8a8e98" />
          </mesh>
          <Car position={[0, 0, z]} wheelSpin={z / CAR.wheelRadius} steer={Math.sin(lf * 0.1) * 0.5} bodyRoll={Math.sin(lf * 0.1) * 0.03} />
        </Stage>
      </AbsoluteFill>
    );
  }
  const night = seg === 1 || seg === 2 || seg === 5;
  if (night) {
    const cam: V3 = seg === 1 ? [6.8, 1.2, 0.3] : seg === 2 ? [4.2, 1.3, -5.6] : [1.4, 0.45, 5.2];
    const tgt: V3 = seg === 1 ? [0, 0.75, 0] : seg === 2 ? [0, 0.8, -0.8] : [0, 0.8, 0];
    return (
      <AbsoluteFill>
        <Stage env="night" background="#000">
          <CameraRig position={cam} target={tgt} fov={seg === 5 ? 62 : 42} />
          <SkyDome preset="night" time={t} clouds={0} />
          <ExteriorLights preset="night" intensity={0.8} />
          <group position={[-1.9, 0, 0]}>
            <Street length={60} wet={seg !== 2} lamps="left" houses={seg !== 1} />
          </group>
          <Car
            headlights={1}
            brakeLights={seg === 2 ? 0.5 + 0.5 * Math.sin(lf * 0.25) : 0}
            doorOpen={seg === 1 ? clamp01(lf / 45) : seg === 2 ? 1 : 0}
            seatFrost={seg === 1 ? 0.8 : 0}
          />
        </Stage>
      </AbsoluteFill>
    );
  }
  if (seg === 3) {
    const locked = lf >= 30;
    const needle = locked ? 0.06 : clamp01(lf / 26) * 0.75;
    const c = CAR.dashCam;
    return (
      <AbsoluteFill>
        <Stage env="night" background="#000">
          <CameraRig position={c.position} target={c.target} fov={c.fov} />
          <SkyDome preset="night" time={t} clouds={0} />
          <ExteriorLights preset="night" intensity={0.7} />
          <pointLight position={[0.1, 1.3, 0.1]} color="#9fd8ff" intensity={0.6} distance={3} />
          <Street length={60} wet lamps="left" position={[-1.9, 0, 0]} />
          <Car headlights={1} speedNeedle={needle} rpmNeedle={locked ? 0.1 : needle * 0.9}
            dashLocked={locked} dashSpeedText={locked ? 'SPEED PACK REQUIRED' : undefined}
            consoleText={locked ? 'UPGRADE TO GO FASTER' : 'FM 101.1'} consoleColor={locked ? '#ff4a4a' : undefined} />
        </Stage>
      </AbsoluteFill>
    );
  }
  // seg 4: seats frosting
  const frost = clamp01((lf - 5) / 40);
  const c = CAR.seatCam;
  return (
    <AbsoluteFill>
      <Stage env="night" background="#000">
        <CameraRig position={c.position} target={c.target} fov={c.fov} />
        <SkyDome preset="night" time={t} clouds={0} />
        <ExteriorLights preset="night" intensity={0.9} />
        <pointLight position={[0, 1.3, -0.2]} color="#bfe6ff" intensity={1.2} distance={3} />
        <Car seatFrost={frost} consoleText={frost > 0.3 ? 'SEAT HEAT: PLATINUM TIER' : 'SEAT HEAT: OFF'} consoleColor="#19c6ff" />
      </Stage>
    </AbsoluteFill>
  );
}
