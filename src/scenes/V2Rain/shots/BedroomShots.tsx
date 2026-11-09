/**
 * Bedroom shots:
 *  climb   (146–207) inside, facing the rainy window. Lightning reveals his silhouette pressed to the glass; on "climbed"
 *                    the casements burst open (curtains billow, rain gusts in) and he scrambles over the sill, landing
 *                    crouched on "window"…
 *  copsIn  (243–276) "…too": red/blue police light floods the room; he freezes, crouched under the window (dutch push-in).
 *  pancake (276–338) Pancake waiting, chin resting on the locked feeder, puppy eyes up at him; grandpa's hammer hangs dim
 *                    on the far wall behind him (planted for later).
 *  nose    (338–373) insert: nose on the box; the LCD flips to LOCKED and the padlock rattles on "box".
 *  pat     (373–406) the Guy kneels, strokes Pancake's head … a gold glint pulls his eyes up to the wall.
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig, Rain, SparkleField} from '../../../lib/three';
import {BEDROOM_SPOTS as S} from '../../../lib/sets/Bedroom';
import {Guy, GuyPose, guyClimb, guyIdle, guyBlink, guyPatDog, mergePose, keyPoses, guyPoint} from '../../../lib/characters/Guy';
import {Pancake, PancakePose, pancakeBlink, pancakeAnchor} from '../../../lib/characters/Pancake';
import {Feeder, FEEDER} from '../../../lib/props';
import {HungHammer} from '../../../lib/props';
import {ramp, popIn, lerp, noise1, clamp01} from '../../../lib/time';
import {C} from '../../../lib/palette';
import {Room, FEEDER_POS, FEEDER_ROT, PANCAKE_POS, PANCAKE_ROT, CLIMB_ROOT, HOOK} from '../Room';
import {Drips} from '../Water';
import {WET, dripPoints} from '../cast';
import {W, SHOTS} from '../timing';
import {lightning} from './StreetShots';

type V3 = [number, number, number];

const STAGE = {background: '#05071c', env: 'night' as const, bloom: {strength: 0.7, radius: 0.5, threshold: 0.86}};
const STAGE_SOFT = {background: '#05071c', env: 'night' as const, bloom: {strength: 0.4, radius: 0.45, threshold: 0.95}};

// ------------------------------------------------------------------------------------------------- Pancake + feeder
/** Pancake "waiting": crouched behind the box, chin on the lid, puppy eyes */
export const pancakeWaiting = (f: number, opts: {perk?: number; wag?: number; sniff?: number; lookUp?: number} = {}): PancakePose => {
  const t = f / 30;
  const {perk = 0, wag = 0, sniff = 0, lookUp = 0} = opts;
  return {
    lie: 0.34,
    eyes: 'puppy',
    earPerk: lerp(-0.85, 0.1, perk),
    headPitch: 0.06 + 0.1 * lookUp + 0.02 * Math.sin(t * 2.2) + sniff * 0.035 * Math.sin(t * 40),
    headTilt: 0.12 * Math.sin(t * 1.3) * (1 - lookUp * 0.5) + 0.1 * perk,
    headYaw: 0.04 * noise1(t * 0.4, 5),
    tailWag: t * (0.8 + 2.6 * wag),
    tailWagAmount: 0.08 + 0.5 * wag,
    bodySquash: 0.03 * Math.sin(t * 2.4),
    blink: pancakeBlink(t, 4, 4.2),
    blush: 0.5,
    frown: 1 - perk * 0.4,
  };
};

export const FeederAndDog: React.FC<{f: number; pose: PancakePose; lcd?: string; lcdColor?: string; lockShake?: number}> = ({f, pose, lcd, lcdColor, lockShake = 0}) => (
  <>
    <Feeder position={FEEDER_POS} rotation={[0, FEEDER_ROT, 0]} lcdText={lcd ?? 'BREAKFAST IS FOR PLUS MEMBERS ONLY'} lcdColor={lcdColor}
      lockShake={lockShake} time={f / 30} />
    <Pancake position={PANCAKE_POS} rotation={[0, PANCAKE_ROT, 0]} pose={pose} />
  </>
);

/** Pancake-local point -> room space */
export const dogToRoom = (p: V3): V3 => {
  const a = PANCAKE_ROT;
  return [PANCAKE_POS[0] + p[0] * Math.cos(a) + p[2] * Math.sin(a), PANCAKE_POS[1] + p[1], PANCAKE_POS[2] - p[0] * Math.sin(a) + p[2] * Math.cos(a)];
};
/** Guy-local point -> room space for a Guy at pos with yaw a */
export const guyToRoom = (p: V3, pos: V3, a: number): V3 => [pos[0] + p[0] * Math.cos(a) + p[2] * Math.sin(a), pos[1] + p[1], pos[2] - p[0] * Math.sin(a) + p[2] * Math.cos(a)];

// ------------------------------------------------------------------------------------------------- climb
const CL = SHOTS.climb[0]; // 146
const OPEN_F = Math.round(W.climbed) - 1; // 157
const FLASH_F = CL + 3; // lightning reveals him at the glass

const climbState = (f: number) => {
  const t = f / 30;
  const p = clamp01((f - (OPEN_F + 3)) / (SHOTS.climb[1] - 4 - (OPEN_F + 3)));
  const pe = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const atGlass: GuyPose = {
    torsoBend: 0.12, headPitch: -0.1, expression: 'cold', expression2: 'determined', expressionMix: 0.4, shrug: 0.6,
    armL: {shoulderX: 1.75, shoulderZ: 0.35, shoulderY: 0.2, elbow: 1.2, twist: 1.0, wristZ: -0.6, grip: 0.1},
    armR: {shoulderX: 1.75, shoulderZ: 0.35, shoulderY: 0.2, elbow: 1.2, twist: 1.0, wristZ: -0.6, grip: 0.1},
    blink: guyBlink(t, 1),
  };
  const toClimb = ramp(f, OPEN_F - 2, OPEN_F + 4);
  const pose = keyPoses(toClimb, [[0, atGlass], [1, mergePose(guyClimb(pe), {blink: guyBlink(t, 1), mouthOpen: 0.25 * Math.abs(Math.sin(t * 9))})]]);
  const z = lerp(CLIMB_ROOT[2] - 0.32, CLIMB_ROOT[2], toClimb);
  return {pose, root: [CLIMB_ROOT[0], CLIMB_ROOT[1], z] as V3, p};
};

export const ClimbShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const flash = Math.max(lightning(f, FLASH_F), lightning(f, OPEN_F - 1) * 0.8);
  const open = clamp01(popIn(f, OPEN_F, 7));
  const {pose, root, p} = climbState(f);
  // camera: inside, by the feeder, looking up at the window; follows him down as he lands
  const land = ramp(f, OPEN_F + 18, SHOTS.climb[1]);
  const shake = f >= OPEN_F && f < OPEN_F + 8 ? 0.02 * Math.sin((f - OPEN_F) * 2.7) : 0;
  const camPos: V3 = [lerp(1.05, 1.2, land), lerp(1.15, 1.05, land) + shake, lerp(0.35, 0.05, land)];
  const camTgt: V3 = [lerp(1.12, 1.15, land), lerp(1.42, 0.9, land), -2.0];
  const dogPose = pancakeWaiting(f, {perk: ramp(f, OPEN_F + 2, OPEN_F + 10), lookUp: 0});
  return (
    <Stage {...STAGE}>
      <CameraRig position={camPos} target={camTgt} fov={50} roll={0.02} />
      <Room f={f} windowOpen={open} hideOutside moon={0.45} flash={flash} keyLight={{pos: [1.6, 1.6, -0.6], intensity: 1.6, color: '#cfdcff'}}>
        <group position={root}>
          <Guy pose={pose} outfit={WET} />
          <Drips time={t} points={dripPoints(pose)} rate={1.4} intensity={0.7} floorY={-root[1]} />
        </group>
        {open > 0.05 ? (
          <Rain time={t} count={160} area={[1.0, 2.2, 1.4]} position={[S.window[0], 0.0, -1.55]} color="#cfdcff" intensity={0.65 * open}
            speed={8} wind={[0.2, 2.2]} length={0.35} width={0.006} splashes={20} />
        ) : null}
        <FeederAndDog f={f} pose={dogPose} />
        <HungHammer position={HOOK} glow={0} />
      </Room>
      {void p}
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------- cops inside
const CI = SHOTS.copsIn[0]; // 243
export const LAND_POS: V3 = [CLIMB_ROOT[0], 0, CLIMB_ROOT[2] + 0.9];

export const CopsInShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const k = f - CI;
  const crouch = guyClimb(1);
  const hands = popIn(f, CI + 3, 9);
  const up: GuyPose = {
    armL: {shoulderX: 0.35, shoulderZ: 1.45, shoulderY: -1.25, elbow: 1.55, twist: 0.2, wrist: 0, wristZ: -0.2, grip: 0.0},
    armR: {shoulderX: 0.35, shoulderZ: 1.45, shoulderY: -1.25, elbow: 1.55, twist: 0.2, wrist: 0, wristZ: -0.2, grip: 0.0},
  };
  const pose = keyPoses(hands, [
    [0, mergePose(crouch, {expression: 'shock', mouthOpen: 0.5, blink: 0, shrug: 1, torsoBend: 0.35, headPitch: -0.25})],
    [1, mergePose(crouch, {...up, expression: 'shock', mouthOpen: 0.7, blink: 0, shrug: 1, torsoBend: 0.12, headPitch: -0.12 + 0.03 * Math.sin(t * 9),
      headYaw: 0.08 * Math.sin(t * 5), eyesX: 0.3 * Math.sin(t * 6), eyesY: 0.2})],
  ]);
  const face = guyToRoom(guyPoint(pose, 'eyes'), LAND_POS, 0);
  // snap push-in on the downbeat + slow drift, dutch roll swinging with the strobe
  const push = popIn(f, CI, 8);
  const dist = lerp(1.35, 0.95, push) + 0.15 * ramp(f, CI + 8, SHOTS.copsIn[1], (x) => x);
  const camPos: V3 = [face[0] - 0.12, face[1] - 0.12, face[2] + dist];
  const roll = 0.12 * Math.sin(k * 0.16) - 0.05;
  // strobe: hard red / blue alternation, 4 frames each, double-pulsed
  const ph = ((f % 8) + 8) % 8;
  const red = ph < 4 ? (ph === 1 ? 0.35 : 1) : 0;
  const blue = ph >= 4 ? (ph === 5 ? 0.35 : 1) : 0;
  return (
    <Stage {...STAGE}>
      <CameraRig position={camPos} target={[face[0] + 0.03, face[1] - 0.02, face[2]]} fov={lerp(78, 60, push)} roll={roll} />
      <Room f={f + 3} cop={1} windowOpen={1} moon={0.25} hide={['chair', 'lights']} keyLight={{pos: [face[0] + 0.3, face[1] + 0.4, face[2] + 0.9], intensity: 0.35, color: '#e8dcff'}}>
        <pointLight position={[S.window[0] - 0.75, 2.1, -1.75]} color="#ff1a2a" intensity={red * 8} distance={6} decay={1.3} />
        <pointLight position={[S.window[0] + 0.75, 2.1, -1.75]} color="#2a5bff" intensity={blue * 10} distance={6} decay={1.3} />
        <pointLight position={[face[0] + 0.7, face[1] + 0.3, face[2] + 0.6]} color={red > 0 ? '#ff3a4a' : '#4a6aff'} intensity={1.5 * Math.max(red, blue)} distance={2.5} decay={1.5} />
        <pointLight position={[face[0] - 0.8, face[1] + 0.6, face[2] - 0.2]} color={red > 0 ? '#4a6aff' : '#ff3a4a'} intensity={1.2 * Math.max(red, blue)} distance={2.5} decay={1.5} />
        <group position={LAND_POS}>
          <Guy pose={pose} outfit={WET} />
          <Drips time={t} points={dripPoints(pose)} rate={1.2} intensity={0.7} />
        </group>
        <Rain time={t} count={140} area={[1.0, 2.2, 1.2]} position={[S.window[0], 0.0, -1.5]} color={red > 0 ? '#ffb0c0' : '#b0c8ff'} intensity={0.8} speed={8} wind={[0.2, 2.2]}
          length={0.35} width={0.006} splashes={15} />
        <FeederAndDog f={f} pose={pancakeWaiting(f, {perk: 0.6})} />
        <HungHammer position={HOOK} />
      </Room>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------- Pancake waiting
const PK = SHOTS.pancake[0]; // 276
export const PancakeShot: React.FC<{f: number}> = ({f}) => {
  const perk = ramp(f, W.pancake - 2, W.pancake + 6) * (1 - 0.5 * ramp(f, W.pancake + 22, W.pancake + 40));
  const wag = ramp(f, W.waiting - 2, W.waiting + 4) * (1 - ramp(f, W.waiting + 22, W.waiting + 34));
  const pose = pancakeWaiting(f, {perk, wag, lookUp: 0.6});
  const eye = dogToRoom(pancakeAnchor(pose, 'eyeL'));
  const k = ramp(f, PK, SHOTS.pancake[1], (x) => x);
  // low, from the desk side, looking back across the box at his face; slow push-in
  const camPos: V3 = [lerp(1.95, 1.72, k), lerp(0.86, 0.8, k), lerp(-0.66, -0.6, k)];
  const camTgt: V3 = [eye[0] - 0.1, eye[1] - 0.15, eye[2] - 0.02];
  const cop = lerp(0.85, 0.3, ramp(f, PK, SHOTS.pancake[1]));
  return (
    <Stage {...STAGE_SOFT}>
      <CameraRig position={camPos} target={camTgt} fov={lerp(46, 39, k)} roll={-0.02} />
      <Room f={f} cop={cop} windowOpen={1} moon={0.5} hide={['chair', 'desk', 'printer', 'dresser', 'tv', 'lavaLamp']} keyLight={{pos: [1.9, 1.3, 0.2], intensity: 0.8, color: '#ffe2c4', distance: 3}}>
        <FeederAndDog f={f} pose={pose} />
        <HungHammer position={HOOK} glow={0.08} />
      </Room>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------- nose insert
const NS = SHOTS.nose[0]; // 338
export const NoseShot: React.FC<{f: number}> = ({f}) => {
  const sniff = ramp(f, NS, NS + 4) * (1 - ramp(f, NS + 16, NS + 22)) + ramp(f, W.box - 4, W.box) * (1 - ramp(f, W.box + 6, W.box + 12));
  const nudge = ramp(f, W.box - 3, W.box + 1) * (1 - ramp(f, W.box + 4, W.box + 12));
  const pose = pancakeWaiting(f, {sniff, lookUp: 1, perk: 0.15});
  pose.headPitch = (pose.headPitch ?? 0) - 0.07 * nudge;
  const nose = dogToRoom(pancakeAnchor(pose, 'nose'));
  const k = ramp(f, NS, SHOTS.nose[1], (x) => x);
  const locked = f >= W.box - 1;
  const lcd = locked ? (Math.floor((f - W.box) / 5) % 2 === 0 ? 'LOCKED' : 'PLUS ONLY') : 'BREAKFAST IS FOR PLUS MEMBERS ONLY';
  // from above the LCD side (the Guy's eye line, looking down at him)
  const down = ramp(f, W.box - 9, W.box + 1);
  const hi: V3 = [nose[0] + lerp(0.62, 0.52, k), nose[1] + lerp(0.36, 0.3, k), nose[2] + 0.12];
  const lo: V3 = [2.05, 0.3, -0.3];
  const camPos: V3 = [lerp(hi[0], lo[0], down), lerp(hi[1], lo[1], down), lerp(hi[2], lo[2], down)];
  const camTgt: V3 = [lerp(nose[0] - 0.02, 1.25, down), lerp(nose[1] - 0.08, 0.22, down), lerp(nose[2] - 0.01, -0.42, down)];
  return (
    <Stage {...STAGE_SOFT}>
      <CameraRig position={camPos} target={camTgt} fov={lerp(lerp(40, 36, k), 53, down)} roll={lerp(0.04, -0.03, down)} />
      <Room f={f} cop={0.25} windowOpen={1} moon={0.5} hide={['chair', 'desk', 'printer']} keyLight={{pos: [nose[0] + 0.7, nose[1] + 0.7, nose[2] + 0.5], intensity: 0.9, distance: 2.4}}>
        <FeederAndDog f={f} pose={pose} lcd={lcd} lcdColor={locked ? C.alertRed : undefined} lockShake={nudge * 1.0 + (locked ? 0.3 : 0)} />
        <HungHammer position={HOOK} />
      </Room>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------- pat + look up
const PT = SHOTS.pat[0]; // 373
export const KNEEL_ROT = -Math.PI / 2 - 0.3; // facing -X (the hammer wall) across the dog, a little toward the window
const KNEEL_LEGS = {legL: {hipX: 1.2, hipZ: 0.18, knee: 1.9}, legR: {hipX: 0.4, hipZ: 0.12, knee: 1.6}};
/** root solved so the patting hand lands on top of Pancake's head */
export const KNEEL_POS: V3 = (() => {
  const g = guyToRoom(guyPoint(mergePose(guyPatDog(0.15), KNEEL_LEGS), 'gripR'), [0, 0, 0], KNEEL_ROT);
  const head = dogToRoom(pancakeAnchor(pancakeWaiting(0, {}), 'headTop'));
  return [head[0] - g[0], 0, head[2] - g[2]];
})();
export const PatShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const look = ramp(f, PT + 16, PT + 26);
  const glow = ramp(f, PT + 10, SHOTS.pat[1]);
  const pat = guyPatDog(t);
  const base = mergePose(pat, {
    ...KNEEL_LEGS,
    expression: 'sad', expression2: 'determined', expressionMix: look, headPitch: 0.35, headTilt: 0.1, blink: guyBlink(t, 6),
  });
  const pose = keyPoses(look, [
    [0, base],
    [1, mergePose(base, {headPitch: -0.22, headYaw: 0.2, headTilt: -0.04, eyesY: 0.5, eyesX: 0.15, torsoBend: 0.12, blink: 0, mouthOpen: 0.1})],
  ]);
  const dog = pancakeWaiting(f, {perk: 0.35 + 0.4 * look, wag: 0.3 * (1 - look), lookUp: 1});
  const face = guyToRoom(guyPoint(pose, 'eyes'), KNEEL_POS, KNEEL_ROT);
  const k = ramp(f, PT, SHOTS.pat[1], (x) => x);
  const kl = ramp(f, PT + 12, SHOTS.pat[1], (x) => x);
  const camPos: V3 = [lerp(0.28, 0.42, kl), lerp(1.08, 1.12, kl), lerp(1.2, 0.62, kl)];
  const camTgt: V3 = [lerp(0.86, face[0], kl), lerp(0.66, face[1] - 0.1, kl), lerp(-0.36, face[2], kl)];
  return (
    <>
    <Stage {...STAGE}>
      <CameraRig position={camPos} target={camTgt} fov={lerp(52, 36, kl)} roll={0.02 * k} />
      <Room f={f} cop={0.2} windowOpen={1} moon={0.5 - 0.25 * glow} hide={['chair']} keyLight={{pos: [0.6, 1.5, 0.9], intensity: 1.2 - 0.4 * glow}} gold={glow * 2.0}
        goldPos={[face[0] - 0.6, face[1] + 0.2, face[2] - 0.05]} hammerGlow={glow * 0.35}>
        <group position={KNEEL_POS} rotation={[0, KNEEL_ROT, 0]}>
          <Guy pose={pose} outfit={WET} />
        </group>
        <FeederAndDog f={f} pose={dog} />
        <HungHammer position={HOOK} glow={glow * 0.3} />
        {look > 0 ? (
          <SparkleField count={26} seed={31} area={[0.7, 0.8, 1.0]} position={[face[0] - 0.5, face[1] + 0.05, face[2] + 0.25]} time={t * 0.8} size={0.03}
            intensity={2.2 * look} colors={['#FFE9A0', '#FFFFFF', '#FFD15A']} speed={0.6} />
        ) : null}
      </Room>
    </Stage>
    {glow > 0 ? (
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 85% at 0% 30%, rgba(255,196,90,0.95) 0%, rgba(255,150,40,0.45) 40%, rgba(255,140,40,0) 75%)',
        mixBlendMode: 'screen', opacity: 0.85 * glow * (0.9 + 0.1 * Math.sin(f * 0.7))}} />
    ) : null}
    </>
  );
};

void FEEDER;
