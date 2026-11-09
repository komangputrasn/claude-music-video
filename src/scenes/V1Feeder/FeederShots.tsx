/**
 * V1Feeder shots G–L: "The feeder said, 'Breakfast is Plus members only,' / and Pancake looked up at me, hungry and lonely."
 *   G  low establishing: FeedMe+ box on its floor spot, Pancake sitting beside it, hopeful; the Guy's knees on the right.
 *   H  LCD insert: the message types on word-by-word with the vocal; gold chrome "PLUS+" pops above the lid on "Plus".
 *   I  snap fisheye push-in to the padlock: it CLAMPS shut on "only" (shake + red alert), red PLUS pay-wall dialog (2D).
 *   J  dog-eye medium: Pancake looks at the red LCD, ears droop.
 *   K  the Guy's POV looking down: Pancake lifts his head and looks up into the lens (puppy eyes).
 *   L  SIGNATURE: slow push-in to an extreme close-up, a tear forms and rolls; on "lonely" the room falls away to a
 *      single moonbeam.
 */
import React from 'react';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {ChromeText, SparkleField, Sparkle, LensFlare, LightRays} from '../../lib/three';
import {Guy, guyBlink} from '../../lib/characters/Guy';
import {Pancake, PancakePose, pancakeBeg, pancakeBlink, pancakeIdle, mixPose} from '../../lib/characters/Pancake';
import {Feeder} from '../../lib/props';
import {C} from '../../lib/palette';
import {ramp, popIn, lerp, noise1} from '../../lib/time';
import {NightRoom, GUY_CHAIR, GUY_YAW, FEEDER_POS, FEEDER_ROT, DOG_POS, DOG_YAW, feederToRoom, dogToRoom, guyToRoom, guyReading, shake, add, mix3, V3} from './common';
import {HeldReader} from './ReaderShots';
import {FeederLcd, LcdWord} from './FeederLcd';

type ShotProps = {f: number; t: number};

export type Words = {said: number; breakfast: number; is: number; plus: number; members: number; only: number; pancake: number; up: number; hungry: number; lonely: number};

/** the full LCD message, typed by word times (scene-local frames) */
export const lcdLines = (w: Words): LcdWord[][] => [
  [{text: 'BREAKFAST', at: w.breakfast - 1}, {text: 'IS', at: w.is - 1}, {text: 'FOR', at: w.is + 4}],
  [{text: 'PLUS', at: w.plus - 1, invert: true}, {text: 'MEMBERS', at: w.members - 1}, {text: 'ONLY', at: w.only - 1}],
];

/** the feeder with our typed LCD on top (lcd state is evaluated against the SCENE frame `sf`) */
const SmartFeeder: React.FC<{sf: number; w: Words; t: number; lockOpen: number; lockShake?: number; mode: 'idle' | 'msg'}> = ({sf, w, t, lockOpen, lockShake = 0, mode}) => {
  const alert = sf >= w.only ? 1 : 0;
  const lines: LcdWord[][] =
    mode === 'idle'
      ? sf < w.said - 1
        ? [[{text: 'HI', at: -999}, {text: 'PANCAKE!', at: -999}], [{text: 'FEEDING', at: -999}, {text: 'SOON', at: -999}]]
        : [[{text: 'NEW', at: -999}, {text: 'MESSAGE', at: -999}], [{text: '>>>', at: -999}]]
      : lcdLines(w);
  return (
    <group position={FEEDER_POS} rotation={[0, FEEDER_ROT, 0]}>
      <Feeder lcdText=" " lcdColor={alert ? '#FF4A2E' : '#9DFF5A'} lockOpen={lockOpen} lockShake={lockShake} time={t} kibbleFill={0.85} />
      <FeederLcd frame={sf} lines={lines} alert={alert} cursor={mode === 'msg' && sf < w.only + 6} flash={['ONLY']}
        status={mode === 'idle' && sf >= w.said - 1 ? '(!) 1 NEW' : '3:15 AM'} />
    </group>
  );
};

/** hopeful Pancake (sitting, ears up, wagging, looking at the box) */
const hopeful = (t: number, look: number): PancakePose => ({
  ...pancakeIdle(t, 3),
  sit: 1,
  eyes: 'open',
  earPerk: 0.35,
  headYaw: look,
  headPitch: -0.12,
  tailWag: t * 2.2,
  tailWagAmount: 0.6,
  blink: pancakeBlink(t, 2),
});

const lcdGlow = (alert: number) => ({position: feederToRoom([0, 0.25, 1.0]), intensity: 0.22, color: alert ? '#ff5a3c' : '#9dff5a', distance: 1.6});

// ------------------------------------------------------------------------------------------------ G: establishing
export const ShotG: React.FC<ShotProps & {sf: number; w: Words}> = ({f, t, sf, w}) => {
  const k = ramp(f, 0, 48);
  const cam: V3 = add([lerp(0.42, 0.48, k), lerp(0.8, 0.74, k), lerp(1.45, 1.3, k)], shake(t, 0.005, 12));
  const target: V3 = [0.45, 0.24, -0.34];
  const beep = Math.max(0, 1 - Math.abs(sf - w.said) / 4);
  const look = 0.85 + 0.08 * Math.sin(t * 2) + 0.15 * beep;
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam} target={target} fov={44} />
      <NightRoom frame={f} lights={{key: {position: [0.3, 1.3, 1.2], intensity: 1.8}, screen: lcdGlow(0)}}>
        <Guy position={GUY_CHAIR} rotation={[0, GUY_YAW, 0]} pose={guyReading({expression: 'sad', headPitch: 0.5, blink: guyBlink(t, 3)})} />
        <HeldReader dissolve={1} banner="This title is no longer available" particles={false} />
        <SmartFeeder sf={sf} w={w} t={t} lockOpen={1} mode="idle" />
        <Pancake position={DOG_POS} rotation={[0, 0.2, 0]} pose={{...hopeful(t, look), hop: 0.02 * beep, earPerk: 0.35 + 0.5 * beep}} />
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ H: LCD insert + gold PLUS
export const ShotH: React.FC<ShotProps & {sf: number; w: Words; dur: number}> = ({f, t, sf, w, dur}) => {
  const k = ramp(f, 0, dur, (x) => x);
  const plusK = popIn(sf, w.plus - 2, 12);
  const plusOn = sf >= w.plus - 2;
  const up = ramp(sf, w.plus - 6, w.plus + 4);
  const camL: V3 = add([lerp(0.1, 0.05, k), lerp(0.15, 0.17, up), lerp(0.62, 0.56, k) + 0.06 * up], shake(t, 0.002, 13));
  const targetL: V3 = [0, lerp(0.095, 0.12, up), 0.12];
  const shine = ramp(sf, w.plus + 2, w.plus + 22, (x) => x);
  return (
    <Stage background={C.night} env="night" bloom={{strength: 0.5, threshold: 0.93}}>
      <CameraRig position={feederToRoom(camL)} target={feederToRoom(targetL)} fov={48} />
      <NightRoom frame={f} lights={{key: {position: feederToRoom([0.6, 1.0, 1.3]), intensity: 0.9}, screen: lcdGlow(0)}}>
        <SmartFeeder sf={sf} w={w} t={t} lockOpen={1} mode="msg" />
        {plusOn ? (
          <group position={feederToRoom([0.0, 0.272, 0.235])} rotation={[0, FEEDER_ROT, 0]}>
            <group scale={plusK} rotation={[0, (1 - Math.min(1, plusK)) * 2.5 + 0.12 * Math.sin(t * 3), 0]}>
              <ChromeText text="PLUS+" font="ArialBlack" size={0.058} anchor="center" material="gold" shine={shine}
                outline={{thickness: 0.004, color: '#3a1d00'}}
                perLetter={(i) => {
                  const q = popIn(sf, w.plus - 2 + i * 1.5, 10);
                  return {position: [0, (1 - q) * 0.12, 0], scale: Math.max(0.001, q)};
                }} />
            </group>
            <SparkleField count={14} seed={31} area={[0.36, 0.1, 0.06]} time={t} size={0.04} />
            <LensFlare position={[0.14, 0.04, 0.05]} intensity={0.45 * ramp(sf, w.plus, w.plus + 6) * (1 - ramp(sf, w.plus + 10, w.plus + 30))} scale={0.5} rotation={t} />
          </group>
        ) : null}
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ I: padlock CLAMPS (fisheye snap push)
export const ShotI: React.FC<ShotProps & {sf: number; w: Words}> = ({f, t, sf, w}) => {
  const snap = ramp(f, 0, 7, (x) => 1 - Math.pow(1 - x, 3));
  const clampAt = w.only - 2;
  const lockOpen = 1 - ramp(sf, clampAt - 2, clampAt + 1, (x) => x * x);
  const hit = Math.max(0, 1 - Math.abs(sf - clampAt - 1) / 10);
  const shk = ramp(sf, clampAt, clampAt + 2) * (1 - ramp(sf, clampAt + 14, clampAt + 30));
  const jolt: V3 = [noise1(t * 30, 5) * 0.012 * hit, noise1(t * 30, 6) * 0.012 * hit, 0];
  const camL: V3 = add(mix3([0.16, 0.36, 0.95], [0.03, 0.2, 0.42], snap), add(jolt, shake(t, 0.002, 14)));
  const targetL: V3 = [0, mix3([0, 0.2, 0.15], [0, 0.135, 0.19], snap)[1], 0.17];
  const fov = lerp(52, 78, snap);
  return (
    <Stage background={C.night} env="night" bloom={{strength: 0.5 + 0.25 * hit, threshold: 0.92}} lens={{aberration: 0.002 + 0.006 * hit, vignette: 0.5}}>
      <CameraRig position={feederToRoom(camL)} target={feederToRoom(targetL)} fov={fov} roll={0.05 * snap + 0.04 * hit} />
      <NightRoom frame={f} lights={{key: {position: feederToRoom([0.6, 1.0, 1.3]), intensity: 0.9}, screen: lcdGlow(sf >= w.only ? 1 : 0),
        alert: {position: feederToRoom([0.3, 0.35, 0.9]), intensity: 0.5 * hit + (sf >= clampAt ? 0.12 : 0)}}}>
        <SmartFeeder sf={sf} w={w} t={t} lockOpen={lockOpen} lockShake={shk} mode="msg" />
        {hit > 0.05 ? <Sparkle position={feederToRoom([0, 0.235, 0.21])} size={0.12 * hit} color="#ffd0c0" time={t} intensity={3} /> : null}
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ J/K/L: Pancake
/** Pancake's sad, looking-up pose; `up` 0..1 lifts his head to the camera, `tear` 0..1 */
const sadPup = (t: number, up: number, tear: number, droop: number, lookFeeder: number): PancakePose => {
  const b = pancakeBeg(t, 1);
  return {
    ...b,
    eyes: 'puppy',
    earPerk: lerp(-0.2, -1, droop),
    headPitch: lerp(-0.18, 0.62, up) + 0.02 * Math.sin(t * 1.7),
    headYaw: lerp(0, 0.95, lookFeeder) + (b.headYaw ?? 0),
    headTilt: lerp(0.05, 0.22, up) + 0.04 * Math.sin(t * 1.3),
    tailWagAmount: 0.06,
    tear,
    frown: 0.4 + 0.5 * droop,
    blink: pancakeBlink(t, 4, 3.8),
    bodySquash: 0.03 * droop + (b.bodySquash ?? 0),
  };
};

export const ShotJ: React.FC<ShotProps & {sf: number; w: Words}> = ({f, t, sf, w}) => {
  const k = ramp(f, 0, 30);
  const camL: V3 = add([lerp(0.42, 0.34, k), lerp(0.6, 0.56, k), lerp(1.25, 1.1, k)], shake(t, 0.004, 15));
  const targetL: V3 = [0.2, 0.36, 0.1];
  const droop = ramp(sf, w.pancake - 2, w.pancake + 16);
  const look = 1 - ramp(sf, w.pancake + 8, w.pancake + 24);
  const pose = sadPup(t, 0, 0, droop, 0.55 + 0.45 * look);
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={dogToRoom(camL)} target={dogToRoom(targetL)} fov={44} />
      <NightRoom frame={f} lights={{key: {position: dogToRoom([0.6, 0.9, 1.0]), intensity: 1.5}, alert: {position: feederToRoom([0.1, 0.3, 0.75]), intensity: 0.22}}}>
        <SmartFeeder sf={sf} w={w} t={t} lockOpen={0} mode="msg" />
        <Pancake position={DOG_POS} rotation={[0, DOG_YAW, 0]} pose={pose} />
      </NightRoom>
    </Stage>
  );
};

/** the Guy's eye point (seated, looking down) in room space */
const GUY_EYE: V3 = guyToRoom([0, 1.16, 0.2]);

export const ShotK: React.FC<ShotProps & {sf: number; w: Words; dur: number}> = ({f, t, sf, w, dur}) => {
  const k = ramp(f, 0, dur, (x) => x);
  const head = dogToRoom([0, 0.6, 0.14]);
  const cam: V3 = add(mix3(GUY_EYE, head, lerp(-0.05, 0.12, k)), shake(t, 0.008, 16));
  const target: V3 = add(head, [0, -0.04, 0]);
  const up = ramp(sf, w.up - 8, w.up + 6);
  const pose = sadPup(t, up, 0, 1, 0);
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam} target={target} fov={40} roll={0.04} />
      <NightRoom frame={f} lights={{key: {position: add(GUY_EYE, [0, 0.3, 0]), intensity: 1.6}, alert: {position: feederToRoom([0.1, 0.3, 0.75]), intensity: 0.2}}}>
        <SmartFeeder sf={sf} w={w} t={t} lockOpen={0} mode="msg" />
        <Pancake position={DOG_POS} rotation={[0, DOG_YAW, 0]} pose={pose} />
      </NightRoom>
    </Stage>
  );
};

export const ShotL: React.FC<ShotProps & {sf: number; w: Words; dur: number}> = ({f, t, sf, w, dur}) => {
  const k = ramp(f, 0, dur, (x) => 1 - Math.pow(1 - x, 2));
  const head = dogToRoom([0, 0.63, 0.15]);
  const camStart = mix3(GUY_EYE, head, 0.4);
  const camEnd = add(head, dogToRoomDir([0.0, 0.36, 0.7]));
  const cam: V3 = add(mix3(camStart, camEnd, k), shake(t, 0.003, 17));
  const tear = ramp(sf, w.hungry, w.lonely + 6, (x) => x);
  const lonely = ramp(sf, w.lonely - 4, w.lonely + 8);
  const pose = sadPup(t, 1, tear, 1, 0);
  return (
    <Stage background={C.night} env="night" bloom={{strength: 0.55, threshold: 0.9}} lens={{vignette: 0.4 + 0.4 * lonely}}>
      <CameraRig position={cam} target={add(head, [0, 0.005, 0])} fov={lerp(32, 30, k)} />
      <NightRoom frame={f} moon={lerp(1, 0.35, lonely)} lights={{key: {position: add(cam, [0.1, 0.35, 0.05]), intensity: lerp(1.2, 0.9, lonely), distance: 2.2},
        screen: {position: add(head, [0, 1.6, 0.2]), intensity: 0.9 * lonely, color: '#bcd6ff', distance: 2.5},
        alert: {position: feederToRoom([0.1, 0.3, 0.75]), intensity: 0.2 * (1 - lonely)}}}>
        <SmartFeeder sf={sf} w={w} t={t} lockOpen={0} mode="msg" />
        <Pancake position={DOG_POS} rotation={[0, DOG_YAW, 0]} pose={pose} />
        {lonely > 0.01 ? (
          <LightRays position={add(head, [0, 1.9, 0])} length={2.2} radius={0.55} count={10} color="#cfe0ff" intensity={0.45 * lonely} time={t} haze={0.18} />
        ) : null}
      </NightRoom>
    </Stage>
  );
};

/** a direction in Pancake-local space -> room (no translation) */
const dogToRoomDir = (d: V3): V3 => {
  const p = dogToRoom(d);
  return [p[0] - DOG_POS[0], p[1] - DOG_POS[1], p[2] - DOG_POS[2]];
};
