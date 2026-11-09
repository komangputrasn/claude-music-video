// S1 (local 0-48): night street, the car at the kerb under a sodium lamp. Headlights SNAP on (with lens flares)
// on the beat; the dash glows aqua and we glimpse the Guy behind the wheel. Slow push-in.
import React from 'react';
import {Stage, CameraRig, LensFlare} from '../../lib/three';
import {ramp, lerp, noise1} from '../../lib/time';
import {Guy} from '../../lib/characters/Guy';
import {Car, CAR} from '../../lib/props/Car';
import {SkyDome, SKY_PRESETS, ExteriorLights, Street} from '../../lib/sets/Exterior';
import {C} from '../../lib/palette';
import {B} from './timing';
import {DRIVER_POS, driverPose, Spot, V3} from './common';

const CAR_POS: V3 = [-1.75, 0, 0];

export const ShotIgnition: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const on = f >= B.b1 ? 1 : 0;
  const kick = f >= B.b1 ? Math.exp(-(f - B.b1) / 5) : 0; // flash right on ignition
  const head = on * (0.85 + 0.15 * Math.min(1, (f - B.b1) / 6));
  const push = ramp(f, 0, 48, (x) => x * (2 - x));
  const shake = kick * 0.025;
  // front 3/4 from the driver's side: headlights in frame, and him visible behind the windscreen
  const cam: V3 = [lerp(1.7, 0.1, push) + noise1(f * 0.9, 3) * shake, lerp(0.95, 1.47, push) + noise1(f * 0.9, 4) * shake, lerp(4.9, 3.9, push)];
  const tgt: V3 = [lerp(-1.6, -1.42, push), lerp(0.85, 1.02, push), lerp(0.5, -0.1, push)];
  const hl = CAR.headlights.map((p) => [p[0] + CAR_POS[0], p[1], p[2] + CAR_POS[2] + 0.12] as V3);
  const dash = on * (0.6 + 0.4 * Math.min(1, (f - B.b1) / 10));
  return (
    <Stage background={C.night} env={SKY_PRESETS.night.env} fog={{color: '#0a1238', near: 30, far: 90}}
      bloom={{strength: 0.6, radius: 0.5, threshold: 0.88}}>
      <CameraRig position={cam} target={tgt} fov={lerp(40, 33, push)} />
      <SkyDome preset="night" time={t} clouds={0} />
      <ExteriorLights preset="night" intensity={0.7} />
      <Street length={80} lamps="left" spacing={16} houses houseLights={0.8} />
      <group position={CAR_POS}>
        <Car headlights={head * 0.8} lights={false} plate="4 NOW" consoleText="PLAN: BASIC" />
        <Guy position={DRIVER_POS} pose={driverPose(t, {headPitch: 0.02, expression: f < B.b1 + 4 ? 'sleepy' : 'neutral', blink: f < B.b1 + 4 ? 0.35 : undefined})} shadow={false} outlineScale={1.3} />
        {/* dash glow on his face */}
        <pointLight position={[0.3, 1.12, 0.25]} color={C.aqua} intensity={dash * 1.6} distance={1.6} decay={1.5} />
        {/* headlight throw onto the street (constant light count) */}
        <Spot position={[0, 0.75, 2.1]} target={[0, 0, 14]} color="#eaf4ff" intensity={head * 16} />
      </group>
      {hl.map((p, i) => {
        // flare strength follows how squarely the lamp faces the lens (headlights point down +Z)
        const d = [cam[0] - p[0], cam[1] - p[1], cam[2] - p[2]];
        const facing = Math.max(0, d[2] / Math.hypot(d[0], d[1], d[2]));
        return (
          <LensFlare key={i} position={p} intensity={head * (0.16 + 0.8 * kick) * facing * facing} scale={0.55 + 0.4 * kick} ghosts={i === 0}
            streak={0.8 + kick} color="#f2f8ff" streakColor="#7fd8ff" />
        );
      })}
    </Stage>
  );
};
