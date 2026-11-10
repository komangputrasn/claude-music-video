// S1 · THE HIT (166.39–169.72) — he stands with his back to us on the wet plain, facing the city. On the hit every red
// screen, iris and lease tag in the city stutters and dies; the dawn rises through the haze behind the skyline and
// floods the sky and its mirror on the wet ground. He pulls his hood back (168.0–169.55; the hood is down 168.35–168.95).
// Match cut from Hold: he opens in Hold's pose (phone at his left ear, grandpa's hammer hanging from his right fist). The
// call is over on the hit: the left arm lowers the dead phone to his side (166.45–167.4); the hammer keeps hanging from
// his right hand through the whole shot, so the hood pull is the LEFT hand's (the rig mirrors arm parameters, so the
// keys below serve either side).
// [38] stands as monumental black letters on the plain against the hazy dawn, split around him in two blocks of two
// rows ("YOU SAID / BUY NOW," left · "BUT I'M GOOD / FOR NOW," right); BUY glows red, stutters and falls.
import React from 'react';
import {S, GREYS, cameraFovForVisible} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy} from '../../../lib/SilCast';
import {HeldSilHammer, HeldSilPhone} from '../../../lib/props';
import {WorldLyric, measureLyric} from '../../../lib/WorldLyric';
import {FogLayers, WetGround} from '../../../lib/atmos';
import {guyIdle, mergePose, GuyArmPose} from '../../../../lib/characters/Guy';
import {lerp} from '../../../../lib/time';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {Skyline, DyingScreen, DyingIris, CITY_DARK} from '../City';
import {dyingRed} from '../lyricFx';
import {dawn, easeOut, redFail, smooth, T_HIT} from '../timing';
import {fitEm, halfWidthAt, pitchTarget, pxToM, V3} from '../frame';

export const HOOD_DOWN = {from: 168.35, to: 168.95};

/** arm key: [shoulderX, shoulderZ, shoulderY, elbow, twist] (rig units, rad; mirrored by the rig, so either side) */
type ArmKey = [number, number, number, number, number];
/**
 * The hood pull, solved with forward kinematics (guyPoint 'gripR' / 'elbowR' against the head): the hand comes up the
 * front to the brim with the elbow up and out, pushes the hood back over the crown and follows it down the back of the
 * head to the nape (in step with the hood fold, HOOD_DOWN), slides down the back of the neck to the shoulder, and the
 * arm drops at his side. From behind it reads as a raised elbow with the hand on the back of the head, drawing back
 * with the hood. `null` = the idle arm; the last key is the idle arm one turn round (shoulderX + 2π) so the arm comes
 * down behind him and never swings back up over his head (a raised open hand above the head read as a wave).
 */
const PULL: {t: number; a: ArmKey | null}[] = [
  {t: 168.0, a: null},
  {t: 168.35, a: [2.69, 0.21, 0.75, 1.45, 0.1]}, // hand on the brim / crown, elbow up and out: the hood starts down
  {t: 168.65, a: [3.3, 0.53, 0.92, 1.76, 0.06]}, // hand behind the head, drawing the hood back
  {t: 168.92, a: [3.9, 0.93, 1.2, 2.37, 0.01]}, // hand at the nape: the hood is down
  {t: 169.2, a: [3.84, 1.52, -0.54, 2.27, -1.42]}, // hand down the back of the neck to the shoulder
  {t: 169.55, a: null},
];

/** arm pose of the hood pull at song time t (Catmull–Rom through PULL), or null outside it */
export const hoodPullArm = (t: number, idle: ArmKey): ArmKey | null => {
  const n = PULL.length;
  if (t <= PULL[0].t || t >= PULL[n - 1].t) return null;
  const P = PULL.map((k, i): ArmKey => k.a ?? (i === 0 ? idle : [idle[0] + 2 * Math.PI, idle[1], idle[2], idle[3], idle[4]]));
  let i = 0;
  while (t > PULL[i + 1].t) i++;
  const tan = (j: number) => P[j].map((_, c) => (j === 0 || j === n - 1 ? 0 : (P[j + 1][c] - P[j - 1][c]) / (PULL[j + 1].t - PULL[j - 1].t)));
  const h = PULL[i + 1].t - PULL[i].t;
  const u = (t - PULL[i].t) / h;
  const m0 = tan(i);
  const m1 = tan(i + 1);
  const u2 = u * u;
  const u3 = u2 * u;
  return P[i].map((p0, c) => (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * m0[c] + (-2 * u3 + 3 * u2) * P[i + 1][c] + (u3 - u2) * h * m1[c]) as ArmKey;
};

/** [38] split around him: explicit rows (font-independent), word indices of the line */
const ROWS_L = [[0, 1], [2, 3]]; // YOU SAID / BUY NOW,
const ROWS_R = [[4, 5, 6], [7, 8]]; // BUT I'M GOOD / FOR NOW,

/** Hold's end pose (Hold/common.tsx holdPose): phone at the left ear, hammer hanging from the right fist */
const PHONE_L: GuyArmPose = {shoulderX: 0.89, shoulderZ: 0.26, shoulderY: 0.1, elbow: 2.6, twist: 0.12, wrist: 0.32, wristZ: -0.27, grip: 0.55, swing: 0};
const HAMMER_ARM: GuyArmPose = {shoulderX: 0.02, shoulderZ: 0.3, shoulderY: 0.0, elbow: 0.38, twist: 0.0, wrist: 0.0, wristZ: 0.0, grip: 1, swing: 0};
/** the call is over on the hit: the phone comes down from the ear */
const PHONE_DOWN = {from: 166.45, to: 167.4};
const mixArm = (a: GuyArmPose, b: GuyArmPose, k: number): GuyArmPose => {
  const out: GuyArmPose = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof GuyArmPose>;
  keys.forEach((key) => {
    out[key] = lerp(a[key] ?? 0, b[key] ?? 0, k);
  });
  return out;
};

/** the hammer hangs head-down from the fist (T silhouette), as in Swing/Cancel/Hold */
const HangingHammer: React.FC<{warmth: number}> = ({warmth}) => (
  <group rotation-x={Math.PI / 2}>
    <group rotation-z={Math.PI / 2}>
      <HeldSilHammer warmth={warmth} light={[0, 1]} />
    </group>
  </group>
);

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
  const base = guyIdle(t, 2);
  const idleL: GuyArmPose = {...(base.armL ?? {}), swing: 0};
  const ia = idleL;
  const pull = hoodPullArm(t, [ia.shoulderX ?? 0.06, ia.shoulderZ ?? 0.17, ia.shoulderY ?? 0.15, ia.elbow ?? 0.22, ia.twist ?? 0.25]);
  // the phone comes down from the ear (Hold's head tilt toward it relaxes with it)
  const down = smooth((t - PHONE_DOWN.from) / (PHONE_DOWN.to - PHONE_DOWN.from));
  // the head lifts a little toward the dawn as the hood comes off
  const lift = smooth((t - 168.4) / 0.45);
  const pose = mergePose(base, {
    headPitch: lerp(lerp(-0.05, base.headPitch ?? 0.02, down), -0.12, lift),
    headTilt: lerp(0.13, base.headTilt ?? 0, down),
    armR: HAMMER_ARM,
    armL: pull
      ? {...idleL, shoulderX: pull[0], shoulderZ: pull[1], shoulderY: pull[2], elbow: pull[3], twist: pull[4], swing: 0}
      : mixArm(PHONE_L, idleL, down),
  });
  // the lyric: black letters standing on the plain ~270 m out, against the hazy dawn, in two blocks either side of him.
  // Sized once (mid-shot camera) and fixed in the world; each block (+15 % for wider fonts) stays inside 92 % of the
  // half-frame beside the gap.
  const lz = -262;
  const dist = 11.2 - lz;
  const gapHalf = dist * Math.tan(3.3 * deg);
  const wide = Math.max(measureLyric(38, 1, undefined, {rows: ROWS_L}).width, measureLyric(38, 1, undefined, {rows: ROWS_R}).width);
  const em = fitEm(pxToM(60, dist, VIS), wide, 0.92 * halfWidthAt(dist, VIS) - gapHalf);
  const fall = dyingRed(t, {size: em, hold: 0.55, stutter: 0.35, dir: -1, seed: 1});
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
      {[{rows: ROWS_L, side: -1}, {rows: ROWS_R, side: 1}].map(({rows, side}) => (
        <WorldLyric key={side} line={38} rows={rows} time={t} mode="dark" redFill={1} size={em} anchor="bottom" align={side < 0 ? 'right' : 'left'}
          position={[side * gapHalf, 0.1, lz]} halo={1.3} perWord={fall} />
      ))}
      <SilGuy pose={pose} hood={hood} rotation-y={Math.PI} position={[0, 0, 0]} rim={goldRim(t, [0.3, 1], 0.5)}
        rightHand={<HangingHammer warmth={0.14 + 0.2 * k} />}
        leftHand={<HeldSilPhone open={1} screen={0} halo={0} keys={0} ext={0} />} />
    </SilStage>
  );
};
