/**
 * V1Feeder shots A–F: the e-reader. "My Kindle's got Orwell, at least for today, / Amazon took it back once, and they can
 * take it away." The Guy reads 1984 on his swivel chair at 3 AM; an OmniStore cloud vortex opens under the ceiling and
 * sucks the page's letters up in a glowing spiral; the title is no longer available.
 */
import React from 'react';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {Sparkle, SparkleField, LensFlare} from '../../lib/three/fx';
import {Guy, GuyPose, mergePose, guyBlink, guyPoint} from '../../lib/characters/Guy';
import {EReader} from '../../lib/props';
import {C} from '../../lib/palette';
import {ramp, popIn, lerp, clamp01} from '../../lib/time';
import {NightRoom, GUY_CHAIR, GUY_YAW, READER_LOCAL, READER_TILT, guyReading, guyToRoom, shake, add, mix3, V3} from './common';
import {CloudVortex, LetterStream} from './Vortex';

export const PAGE = [
  'It was a bright cold day in April, and the clocks were striking thirteen. The posters on every wall had eyes that followed you.',
  'He owned very little, and what he owned he had paid for, once. Somewhere a server decided what he was allowed to remember.',
];

/** e-reader in the Guy's hands (room space via the Guy's chair transform) */
export const HeldReader: React.FC<{dissolve?: number; banner?: string; particles?: boolean}> = ({dissolve = 0, banner, particles = true}) => (
  <group position={GUY_CHAIR} rotation={[0, GUY_YAW, 0]}>
    <group position={READER_LOCAL} rotation={[0, Math.PI, 0]}>
      <group rotation={[READER_TILT, 0, 0]}>
        <EReader title="1984" author="George Orwell" page={PAGE} dissolve={dissolve} banner={banner} particles={particles} />
      </group>
    </group>
  </group>
);

/** screen centre + normal in Guy-local space (normal points at his eyes) */
const SCREEN_L: V3 = [0, 0.967, 0.378];
const NORMAL_L: V3 = [0, Math.sin(-READER_TILT), -Math.cos(-READER_TILT)];
const alongNormal = (d: number): V3 => [SCREEN_L[0] + NORMAL_L[0] * d, SCREEN_L[1] + NORMAL_L[1] * d, SCREEN_L[2] + NORMAL_L[2] * d];
export const SCREEN_ROOM = guyToRoom(SCREEN_L);
/** the OmniStore vortex hangs under the ceiling in front of him */
export const VORTEX_ROOM = guyToRoom([0.0, 2.3, 0.62]);

const SeatedGuy: React.FC<{pose: GuyPose}> = ({pose}) => <Guy position={GUY_CHAIR} rotation={[0, GUY_YAW, 0]} pose={pose} />;

type ShotProps = {f: number; t: number};

/** key light + screen light presets (Guy-local positions converted to room space) */
const keyAt = (p: V3, intensity = 2.0) => ({position: guyToRoom(p), intensity, distance: 3.4});
/** the screen's cold glow: a soft point light placed BEHIND the device on the screen axis so hands/face get even light */
const screenLight = (on: number) => ({position: guyToRoom(alongNormal(-0.45)), intensity: 0.55 * on, color: '#cfeeff', distance: 1.6});
/** vortex underglow: below the cloud so the puffs don't blow out */
const vortexLight = (k: number) => ({position: add(VORTEX_ROOM, [0, -0.75, 0]), intensity: 0.9 * k, color: '#7fd6ff', distance: 2.4});

// ------------------------------------------------------------------------------------------------ A: "My Kindle's"
export const ShotA: React.FC<ShotProps & {kindle: number}> = ({f, t, kindle}) => {
  const on = ramp(f, kindle - 3, kindle + 2, (x) => x);
  const push = ramp(f, 0, 40);
  const cam = guyToRoom(add([lerp(0.34, 0.24, push), 1.12, lerp(1.75, 1.45, push)], shake(t, 0.006)));
  const target = guyToRoom([0.02, lerp(1.0, 1.03, push), 0.2]);
  const wake = ramp(f, kindle - 2, kindle + 6);
  const pose = guyReading({
    expression: 'sleepy', expression2: 'neutral', expressionMix: wake,
    blink: Math.max(guyBlink(t, 3), 0.55 * (1 - wake)),
    headPitch: lerp(0.5, 0.4, wake),
    eyesY: -0.4,
  });
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam} target={target} fov={40} />
      <NightRoom frame={f} lamp={0} lights={{key: keyAt([0.5, 1.5, 1.4], 1.6), screen: screenLight(on)}}>
        <SeatedGuy pose={pose} />
        <HeldReader />
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ B / F1: POV insert on the screen
export const ShotPOV: React.FC<ShotProps & {orwell?: number; banner?: string; bannerAt?: number; dissolve?: number; d0?: number; d1?: number; dur: number}> = ({
  f, t, orwell, banner, bannerAt = 0, dissolve = 0, d0 = 0.24, d1 = 0.2, dur,
}) => {
  const k = ramp(f, 0, dur, (x) => x);
  const d = lerp(d0, d1, k);
  const cam = guyToRoom(add(alongNormal(d), shake(t, 0.002, 4)));
  const target = guyToRoom(add(SCREEN_L, [0, -0.004, 0]));
  const showBanner = banner && f >= bannerAt ? banner : undefined;
  const sparkle = orwell !== undefined ? ramp(f, orwell - 2, orwell + 16, (x) => x) : 0;
  return (
    <Stage background={C.night} env="night" bloom={{strength: 0.55, threshold: 0.92}}>
      <CameraRig position={cam} target={target} fov={44} />
      <NightRoom frame={f} lamp={0} lights={{key: keyAt([0.3, 1.4, 0.9], 1.2), screen: screenLight(1)}}>
        <SeatedGuy pose={guyReading({expression: 'neutral'})} />
        <HeldReader banner={showBanner} dissolve={dissolve} particles={false} />
        {orwell !== undefined && sparkle > 0 && sparkle < 1 ? (
          <Sparkle position={guyToRoom(add(SCREEN_L, [lerp(0.04, -0.04, sparkle), 0.035 - 0.04 * sparkle, 0.0]))} size={0.05 * Math.sin(Math.PI * sparkle)} time={t} />
        ) : null}
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ C: "at least for today" 3/4 close
export const ShotC: React.FC<ShotProps> = ({f, t}) => {
  const k = ramp(f, 0, 33);
  const cam = guyToRoom(add([lerp(1.0, 0.9, k), 1.28, lerp(1.32, 1.2, k)], shake(t, 0.004, 9)));
  const target = guyToRoom([0.04, 1.13, 0.26]);
  const pose = guyReading({expression: 'happy', expression2: 'neutral', expressionMix: 0.35, headPitch: 0.4, blink: guyBlink(t, 5), eyesY: -0.5});
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam} target={target} fov={35} />
      <NightRoom frame={f} lamp={0} lights={{key: keyAt([0.7, 1.5, 1.2], 1.5), screen: screenLight(1)}}>
        <SeatedGuy pose={pose} />
        <HeldReader />
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ D: "took" — face close-up, he looks UP into the light
export const ShotD: React.FC<ShotProps & {took: number}> = ({f, t, took}) => {
  const open = ramp(f, 0, 16, (x) => 1 - Math.pow(1 - x, 3));
  const look = ramp(f, 2, 10);
  const pose = guyReading({
    expression: 'neutral', expression2: 'shock', expressionMix: look,
    headPitch: lerp(0.42, -0.42, look), eyesY: lerp(-0.4, 0.85, look), mouthOpen: 0.3 * look + 0.15 * ramp(f, took - 2, took + 6), blink: 0,
  });
  const eyes = guyPoint(pose, 'eyes');
  const k = ramp(f, 0, 33, (x) => x);
  const camL: V3 = add([lerp(0.2, 0.14, k), eyes[1] - lerp(0.16, 0.2, k), eyes[2] + lerp(0.95, 0.72, k)], shake(t, 0.004, 2));
  const targetL: V3 = [eyes[0] + 0.02, eyes[1] + 0.08, eyes[2]];
  const dis = ramp(f, took - 4, took + 60, (x) => x) * 0.55;
  const flick = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3);
  return (
    <Stage background={C.night} env="night" bloom={{strength: 0.7, threshold: 0.88}}>
      <CameraRig position={guyToRoom(camL)} target={guyToRoom(targetL)} fov={46} roll={-0.05} />
      <NightRoom frame={f} lamp={0}
        lights={{key: keyAt([0.6, 1.0, 1.3], 1.1), screen: {position: guyToRoom([0.0, 2.05, 0.6]), intensity: 0.75 * open * flick, color: '#8fe2ff', distance: 1.5}}}>
        <SeatedGuy pose={pose} />
        <HeldReader dissolve={dis} />
        <CloudVortex position={VORTEX_ROOM} open={open} time={t} radius={0.8} badge={ramp(f, 6, 14)} />
        <LetterStream progress={ramp(f, took - 2, took + 120, (x) => x)} time={t} from={SCREEN_ROOM} to={VORTEX_ROOM} />
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ E: SIGNATURE — letters spiral up (orbit)
export const ShotE: React.FC<ShotProps & {took: number; back: number; dur: number}> = ({f, t, took, back, dur}) => {
  const k = ramp(f, 0, dur, (x) => x);
  // orbit around the letter column from behind-right to his right side, low, looking UP into the cloud
  const ang = lerp(2.45, 1.55, k);
  const R = lerp(1.05, 0.95, k);
  const camL: V3 = add([Math.sin(ang) * R, lerp(0.78, 0.9, k), 0.35 + Math.cos(ang) * R], shake(t, 0.006, 3));
  const targetL: V3 = [0, lerp(1.72, 1.8, k), 0.48];
  const sf = f + 33; // continue the stream timeline from shot D
  const pose = guyReading({
    expression: 'shock', expression2: 'yell', expressionMix: ramp(f, back - 2, back + 6) * 0.8,
    headPitch: -0.5 + 0.06 * Math.sin(t * 2), eyesY: 0.85, mouthOpen: 0.35 + 0.35 * ramp(f, back - 2, back + 6), blink: 0,
    torsoBend: 0.05, lean: -0.04,
  });
  return (
    <Stage background={C.night} env="night" bloom={{strength: 0.75, threshold: 0.88}}>
      <CameraRig position={guyToRoom(camL)} target={guyToRoom(targetL)} fov={lerp(76, 70, k)} roll={lerp(0.12, -0.04, k)} />
      <NightRoom frame={f} lamp={0} lights={{key: keyAt([0.9, 1.0, 1.2], 1.4), screen: vortexLight(1.4)}}>
        <SeatedGuy pose={pose} />
        <HeldReader dissolve={0.55 + 0.45 * ramp(f, 0, 40, (x) => x)} />
        <CloudVortex position={VORTEX_ROOM} open={1} time={t + 1.1} radius={0.8} intensity={1.0 + 0.25 * Math.sin(t * 9)} />
        <LetterStream progress={ramp(sf, took - 2, took + 120, (x) => x)} time={t} from={SCREEN_ROOM} to={VORTEX_ROOM} size={0.1} count={200} />
        <SparkleField count={18} seed={21} area={[1.2, 0.3, 1.2]} time={t} position={VORTEX_ROOM} size={0.12} />
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ F2: "take it away" — vortex closes, he deflates
export const ShotF2: React.FC<ShotProps & {away: number}> = ({f, t, away}) => {
  const close = ramp(f, away - 6, away + 3, (x) => x * x);
  const open = 1 - close;
  const k = ramp(f, 0, 36);
  const tilt = ramp(f, away + 1, away + 13);
  const cam = guyToRoom(add(mix3([0.2, 1.05, 1.2], [0.14, 1.16, 0.98], tilt), shake(t, 0.004, 6)));
  const target = guyToRoom(mix3([0.0, 2.05, 0.5], [0.0, 1.17, 0.12], tilt));
  const down = ramp(f, away + 3, away + 14);
  const pose = guyReading({
    expression: 'shock', expression2: 'sad', expressionMix: down,
    headPitch: lerp(-0.45, 0.35, down), eyesY: lerp(0.8, -0.5, down), mouthOpen: 0.25 * (1 - down), blink: f > away + 22 ? guyBlink(t, 8) : 0,
    shrug: 0.3 * down,
  });
  const pop = ramp(f, away + 2, away + 14, (x) => x);
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam} target={target} fov={lerp(66, 42, tilt)} />
      <NightRoom frame={f} lamp={0} lights={{key: keyAt([0.6, 1.3, 1.1], 1.6), screen: open > 0.05 ? vortexLight(open) : screenLight(1)}}>
        <SeatedGuy pose={pose} />
        <HeldReader dissolve={1} banner="This title is no longer available" particles={false} />
        {open > 0.01 ? <CloudVortex position={VORTEX_ROOM} open={open} time={t + 2} radius={0.8} /> : null}
        {pop > 0 && pop < 1 ? (
          <>
            <Sparkle position={VORTEX_ROOM} size={0.9 * Math.sin(Math.PI * pop)} time={t} intensity={3} />
            <LensFlare position={VORTEX_ROOM} intensity={0.6 * (1 - pop)} scale={0.6} />
          </>
        ) : null}
      </NightRoom>
    </Stage>
  );
};

export {mix3, clamp01};
