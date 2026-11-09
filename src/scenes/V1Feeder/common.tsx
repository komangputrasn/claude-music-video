/**
 * V1Feeder / Pre shared bits: timing helpers, staging constants (room space), the night-room wrapper with a constant
 * light rig, small pose helpers and a deterministic camera shake. Owned by the V1Feeder + Pre scenes.
 */
import React from 'react';
import {Bedroom, BEDROOM_SPOTS as S, DeskChair} from '../../lib/sets/Bedroom';
import {HungHammer} from '../../lib/props';
import {wordTime} from '../../lib/lyrics';
import {noise1} from '../../lib/time';
import {guySitOn, mergePose, GuyPose, GuyArmPose} from '../../lib/characters/Guy';

export type V3 = [number, number, number];

export const FPS = 30;
/** local frame of a lyric word inside a scene that starts at song frame `from` */
export const wordFrame = (from: number, line: number, word: string, occurrence = 0) => wordTime(line, word, occurrence) * FPS - from;

// ---------------------------------------------------------------- staging (room space, metres)
/** The Guy sits on his aqua swivel chair (spun round from the desk) facing the feeder / bed. */
export const GUY_CHAIR: V3 = [1.25, 0, 0.3];
export const GUY_YAW = -2.505;
export const CHAIR_SEAT = 0.48;
/** rotate a point about Y (yaw) */
export const rotY = (p: V3, a: number): V3 => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
/** Guy-local -> room space for the seated Guy */
export const guyToRoom = (p: V3): V3 => {
  const q = rotY(p, GUY_YAW);
  return [GUY_CHAIR[0] + q[0], GUY_CHAIR[1] + q[1], GUY_CHAIR[2] + q[2]];
};

/** feeder on its canonical floor spot (same yaw as the library showcase so other scenes match) */
export const FEEDER_POS: V3 = S.feeder;
export const FEEDER_ROT = 0.35;
/** feeder-local -> room */
export const feederToRoom = (p: V3): V3 => {
  const q = rotY(p, FEEDER_ROT);
  return [FEEDER_POS[0] + q[0], FEEDER_POS[1] + q[1], FEEDER_POS[2] + q[2]];
};

/** Pancake sits snug beside the feeder, facing the Guy's chair */
export const DOG_POS: V3 = [0.27, 0, -0.17];
export const DOG_YAW = Math.atan2(GUY_CHAIR[0] - DOG_POS[0], GUY_CHAIR[2] - DOG_POS[2]);
export const dogToRoom = (p: V3): V3 => {
  const q = rotY(p, DOG_YAW);
  return [DOG_POS[0] + q[0], DOG_POS[1] + q[1], DOG_POS[2] + q[2]];
};

/** e-reader held in both hands in front of the chest (Guy-local, seated on the chair) */
export const READER_LOCAL: V3 = [0, 0.955, 0.37];
export const READER_TILT = -0.95;
/** e-reader screen centre in room space (approx.) */
export const READER_ROOM: V3 = guyToRoom([0, 0.962, 0.367]);

/** seated reading pose: both fists at the e-reader's sides (solved numerically against guyPoint) */
export const READ_ARM: GuyArmPose = {shoulderX: 0.397, shoulderZ: 0.044, shoulderY: 0.402, elbow: 1.996, twist: 0.858, wrist: 0, wristZ: 0, grip: 1, swing: 0};
export const guyReading = (extra: GuyPose = {}): GuyPose =>
  mergePose(mergePose(guySitOn(CHAIR_SEAT), {torsoBend: 0.12, headPitch: 0.42, armR: READ_ARM, armL: READ_ARM, expression: 'neutral'}), extra);

/** deterministic handheld camera drift (metres) */
export const shake = (t: number, amp: number, seed = 0): V3 => [
  noise1(t * 1.3, 71 + seed) * amp,
  noise1(t * 1.1, 72 + seed) * amp,
  noise1(t * 0.9, 73 + seed) * amp * 0.6,
];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mix3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** simple lip-sync: open while one of the given words is being sung (song seconds) */
export const lipSync = (t: number, words: {start: number; end: number}[], amount = 0.55) => {
  for (const w of words) {
    if (t >= w.start - 0.03 && t <= w.end) {
      const u = (t - w.start) / Math.max(0.08, w.end - w.start);
      return amount * Math.sin(Math.PI * Math.min(1, Math.max(0, u))) * (0.75 + 0.25 * Math.sin(t * 40));
    }
  }
  return 0;
};

// ---------------------------------------------------------------- the room with a constant light rig
export type RoomLights = {
  /** warm character key near the camera side (point light) */
  key?: {position: V3; intensity: number; color?: string; distance?: number};
  /** e-reader / LCD screen glow light */
  screen?: {position: V3; intensity: number; color?: string; distance?: number};
  /** red alert light (padlock / lock pop-up) */
  alert?: {position: V3; intensity: number};
};

const OFF: V3 = [0, -5, 0];

/**
 * Night bedroom with the hammer on its rack and exactly 3 extra point lights (always mounted, zero intensity when
 * unused) so shader programs never recompile between shots.
 */
export const NightRoom: React.FC<{
  frame: number;
  lights?: RoomLights;
  lamp?: number;
  moon?: number;
  time?: 'night' | 'dawn' | 'day';
  doorOpen?: number;
  hammerGlow?: number;
  hide?: React.ComponentProps<typeof Bedroom>['hide'];
  /** render the swivel chair at the Guy's spot (default true) */
  chair?: boolean;
  hideWalls?: React.ComponentProps<typeof Bedroom>['hideWalls'];
  children?: React.ReactNode;
}> = ({frame, lights = {}, lamp = 0, moon = 1, time = 'night', doorOpen, hammerGlow = 0, hide = [], chair = true, hideWalls, children}) => {
  const k = lights.key, s = lights.screen, a = lights.alert;
  return (
    <Bedroom time={time} frame={frame} lamp={lamp} moon={moon} clock={{text: '3:15'}} doorOpen={doorOpen} hammerGlow={hammerGlow} hide={['chair', ...hide]} hideWalls={hideWalls}>
      <pointLight position={k?.position ?? OFF} color={k?.color ?? '#ffe2c4'} intensity={k?.intensity ?? 0} distance={k?.distance ?? 3.2} decay={1.4} />
      <pointLight position={s?.position ?? OFF} color={s?.color ?? '#dff3ff'} intensity={s?.intensity ?? 0} distance={s?.distance ?? 1.4} decay={1.6} />
      <pointLight position={a?.position ?? OFF} color="#ff2a2a" intensity={a?.intensity ?? 0} distance={1.6} decay={1.5} />
      <HungHammer position={S.hammerHook} glow={hammerGlow} />
      {chair ? <DeskChair position={GUY_CHAIR} rotation={[0, GUY_YAW, 0]} /> : null}
      {children}
    </Bedroom>
  );
};
