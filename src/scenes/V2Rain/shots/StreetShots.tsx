/**
 * Shots 1a/1b — "I walked home in the rain".
 *  1a (0–49)  low wide at the kerb: the soaked Guy trudges toward us along a wet sodium-lit street; his own driverless
 *             hatchback ("4 NOW") hisses past, hugging the kerb, and throws a puddle wave over him on "walked home".
 *  1b (49–79) tracking close-up (dolly back in front of him): drenched, shivering, drips off his nose; lightning on "rain".
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig, Rain, LensFlare} from '../../../lib/three';
import {SkyDome, ExteriorLights, SKY_PRESETS} from '../../../lib/sets/Exterior';
import {Street} from '../../../lib/sets/exterior/Street';
import {Car, CAR} from '../../../lib/props/Car';
import {Guy, GUY, mergePose, mixPose} from '../../../lib/characters/Guy';
import {ramp, lerp, noise1, clamp01} from '../../../lib/time';
import {PuddleSplash, Drips} from '../Water';
import {WET, guyTrudge, guyFlinch, dripPoints, TRUDGE_CADENCE} from '../cast';
import {W} from '../timing';

type V3 = [number, number, number];

const SPEED = GUY.strideLength * TRUDGE_CADENCE; // m/s
const GX = -4.75;
const GY = 0.15; // sidewalk top
const z0 = -4;
export const guyZ = (f: number) => z0 + SPEED * (f / 30);

const SPLASH_F = Math.round(W.walked) + 2; // ~30: the wave hits right after "walked"
const CAR_X = -2.55;
const CAR_V = 12.5; // m/s toward -Z
const carZ = (f: number) => guyZ(SPLASH_F) + 0.2 + CAR.wheels.fl[2] + (CAR_V * (SPLASH_F - f)) / 30;

/** lightning: a double flicker starting at frame a */
export const lightning = (f: number, a: number) => {
  const k = f - a;
  if (k < 0 || k > 10) return 0;
  const env = [0.9, 1, 0.35, 0.15, 0.85, 0.6, 0.3, 0.16, 0.08, 0.04, 0.0];
  return env[k];
};

const NightStreet: React.FC<{f: number; flash: number; zc: number}> = ({f, flash, zc}) => {
  const t = f / 30;
  return (
    <>
      <SkyDome preset="night" time={t + 110} clouds={0} starBrightness={0.35} />
      <ExteriorLights preset="night" intensity={0.55 + flash * 2.2} />
      <directionalLight position={[6, 20, -10]} intensity={flash * 3.5} color="#cfe0ff" />
      <Street length={110} wet lamps="both" spacing={15} houseLights={0.9} position={[0, 0, zc]} offset={0} />
      <Rain time={t} count={3000} area={[16, 11, 26]} position={[-2.5, 0, guyZ(f) - 6]} color="#ffdcae" intensity={0.7 + flash * 1.5}
        speed={11} wind={[0.9, 0.4]} length={0.5} width={0.0075} splashes={260} splashSize={0.14} />
    </>
  );
};

export const StreetWide: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const zg = guyZ(f);
  const sT = (f - SPLASH_F) / 30;
  const flinch = ramp(f, SPLASH_F + 3, SPLASH_F + 8) * (1 - ramp(f, SPLASH_F + 16, SPLASH_F + 26));
  const base = guyTrudge(t);
  const pose = flinch > 0 ? guyFlinch(flinch, base) : base;
  const cz = carZ(f);
  // camera: low at the kerb ahead of him, slowly craning up and drifting back as he approaches
  const cy = lerp(0.5, 1.0, ramp(f, 0, 49));
  const camPos: V3 = [-3.95 + 0.06 * noise1(t * 0.8, 4), cy + 0.04 * noise1(t * 1.1, 5), z0 + 5.4 + 0.5 * ramp(f, 0, 49)];
  const camTgt: V3 = [GX + 0.55, 1.15 + 0.1 * ramp(f, 0, 49), zg - 1.6];
  return (
    <Stage background="#04061a" env="night" fog={{color: SKY_PRESETS.night.fog, near: 18, far: 70}} bloom={{strength: 0.75, radius: 0.5, threshold: 0.85}}>
      <CameraRig position={camPos} target={camTgt} fov={46} roll={-0.03} />
      <NightStreet f={f} flash={0} zc={zg - 20} />
      <group position={[GX, GY, zg]}>
        <Guy pose={pose} outfit={WET} outlineScale={1.3} />
        <Drips time={t} points={dripPoints(pose)} rate={1.2} floorY={0} />
      </group>
      {/* the driverless hatchback hugs the kerb and leaves him in its wake */}
      <Car position={[CAR_X, 0, cz]} rotation={[0, Math.PI, 0]} headlights={1} brakeLights={0.15} wheelSpin={-cz / CAR.wheelRadius}
        bodyBounce={0.02 * Math.sin(f * 0.9)} plate="4 NOW" />
      <PuddleSplash time={sT} origin={[CAR_X - 0.78, 0.08, zg + 0.35]} dir={[-1, 0.2]} along={[0, -1]} count={420} speed={6.8} up={5.0}
        color="#a9c8ff" intensity={0.8} floorY={GY} lenScale={0.45} widScale={1.9} opacity={0.55} />
      <PuddleSplash time={sT - 0.06} origin={[CAR_X - 0.78, 0.08, zg - 0.7]} dir={[-1, -0.1]} along={[0, -1]} count={220} speed={5.2} up={4.2}
        color="#ffd9a8" intensity={0.75} floorY={GY} seed={2} lenScale={0.5} widScale={1.7} opacity={0.5} />
    </Stage>
  );
};

export const StreetClose: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const zg = guyZ(f);
  const flash = lightning(f, Math.round(W.rain) - 1);
  const look = ramp(f, W.rain, W.rain + 5) * (1 - ramp(f, W.rain + 14, W.rain + 24));
  const base = guyTrudge(t);
  const pose = mergePose(base, {
    expression: 'cold',
    expression2: 'sad',
    expressionMix: 0.35 + 0.3 * look,
    headPitch: lerp(base.headPitch ?? 0.2, -0.35, look),
    headYaw: lerp(0, 0.18, look),
    eyesY: lerp(-0.15, 0.8, look),
    mouthOpen: 0.08 + 0.06 * Math.abs(Math.sin(t * 28)),
  });
  void mixPose;
  // camera dollies backward in front of him (a hair slower than he walks: slow push-in), handheld sway
  const k = ramp(f, 49, 79, (x) => x);
  const dist = lerp(2.05, 1.45, k);
  const camPos: V3 = [GX - 0.5 + 0.03 * noise1(t * 1.3, 7), GY + 1.4 + 0.03 * noise1(t * 1.1, 8), zg + dist];
  const camTgt: V3 = [GX + 0.12, GY + 1.38, zg];
  return (
    <>
    <Stage background="#04061a" env="night" fog={{color: SKY_PRESETS.night.fog, near: 14, far: 60}} bloom={{strength: 0.8, radius: 0.55, threshold: 0.85}}>
      <CameraRig position={camPos} target={camTgt} fov={38} roll={0.04 + 0.01 * noise1(t, 9)} />
      <NightStreet f={f} flash={flash} zc={zg - 20} />
      <pointLight position={[GX + 0.9, GY + 1.9, zg + 1.2]} color="#ffd29a" intensity={1.6} distance={3.2} decay={1.4} />
      <group position={[GX, GY, zg]}>
        <Guy pose={pose} outfit={WET} />
        <Drips time={t} points={dripPoints(pose)} rate={1.8} floorY={0} intensity={0.8} />
      </group>
      {flash > 0.05 ? <LensFlare position={[GX + 6, 14, zg - 30]} intensity={flash * 0.6} color="#dfe8ff" /> : null}
    </Stage>
    {flash > 0 ? <AbsoluteFill style={{background: 'radial-gradient(ellipse at 70% 10%, #f4f8ff 0%, #9fb8ff 55%, #5a6cc8 100%)', mixBlendMode: 'screen', opacity: flash * 0.55}} /> : null}
    </>
  );
};

export const streetCamClamp = clamp01;
