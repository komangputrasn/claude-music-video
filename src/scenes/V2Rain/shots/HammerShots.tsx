/**
 * The SIGNATURE: "…and my grandpa's old hammer doesn't care about locks."
 *  reveal (406–454) the room drains to night-blue; a golden god-ray shaft falls on grandpa's hammer on its wall rack,
 *                   dust sparkles, choir-slow push-in over the Guy's shoulder; chrome-gold GRANDPA'S pops letter by
 *                   letter on "grandpa's" with a lens-flare glint.
 *  hammer (454–501) hero orbit around the hammer (rust, tape, polished face catching the gold) + RPG item card (2D).
 *  reach  (501–551) his determined face lit by the glow; on "locks" his hand rises into frame and closes on the
 *                   handle; the flare blooms to white → Swing.
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig, ChromeText, SparkleField, LensFlare, LightRays, Glow} from '../../../lib/three';
import {Guy, GuyPose, guyIdle, guyBlink, mergePose, keyPoses, guyPoint} from '../../../lib/characters/Guy';
import {HungHammer} from '../../../lib/props';
import {ramp, popIn, lerp, beatAt} from '../../../lib/time';
import {Room, HOOK} from '../Room';
import {pancakeWaiting, guyToRoom, FeederAndDog} from './BedroomShots';
import {WET} from '../cast';
import {W, SHOTS, FROM} from '../timing';
import {ItemCard} from '../ItemCard';

type V3 = [number, number, number];
const STAGE = {background: '#04051a', env: 'night' as const, bloom: {strength: 0.75, radius: 0.6, threshold: 0.88}};

/** hammer head (glowing iron) in room space: the hung hammer's head points +Z */
const HEAD: V3 = [HOOK[0] + 0.01, HOOK[1] + 0.02, HOOK[2] - 0.0875 + 0.262];

/** golden legendary-item dressing around the rack */
const Legendary: React.FC<{f: number; k: number; rays: number; text?: number; flare?: number}> = ({f, k, rays, text = 0, flare = 0}) => {
  const t = f / 30;
  const g = Math.max(0, k);
  return (
    <group>
      {/* god rays from the ceiling onto the rack, tilted toward the room */}
      <group position={[HOOK[0] + 0.55, 2.62, HOOK[2]]} rotation={[0, 0, -0.32]}>
        <LightRays length={2.0} radius={0.62} apexRadius={0.12} count={12} color="#ffe6a0" endColor="#ffb84a" intensity={0.75 * rays}
          time={t} speed={0.05} falloff={1.3} haze={0.16} />
      </group>
      <Glow position={[HOOK[0] + 0.06, HOOK[1] + 0.02, HOOK[2]]} size={1.3} color="#ffb84a" intensity={0.22 * g} />
      <Glow position={HEAD} size={0.26} color="#fff1c4" intensity={0.22 * g} />
      <SparkleField count={34} seed={11} area={[0.25, 0.75, 1.15]} position={[HOOK[0] + 0.14, HOOK[1] + 0.05, HOOK[2]]} time={t} size={0.07}
        intensity={2.2 * g} colors={['#FFFFFF', '#FFE9A0', '#FFD15A', '#FFF6D8']} speed={0.9} />
      <SparkleField count={60} seed={12} area={[1.8, 1.7, 2.2]} position={[HOOK[0] + 1.0, 1.4, HOOK[2]]} time={t * 0.6} size={0.03}
        intensity={1.3 * g} colors={['#FFE9A0', '#FFFFFF']} speed={0.4} twinkle={0.6} />
      {text > 0 ? (
        <group position={[HOOK[0] + 0.07, HOOK[1] + 0.34, HOOK[2]]} rotation={[0, Math.PI / 2, 0]}>
          <ChromeText text="GRANDPA'S" font="ArialBlack" size={0.1} anchor="center" material="gold" brightness={0.85}
            outline={{thickness: 0.006, color: '#3a1a00'}} shine={ramp(f, W.grandpas + 4, W.grandpas + 22)}
            perLetter={(i) => {
              const p = popIn(f, W.grandpas - 3 + i * 1.3, 9);
              return {scale: Math.max(0.001, p), position: [0, (1 - p) * 0.12, (1 - p) * 0.2], rotation: [0, (1 - p) * 1.4, 0]};
            }} />
        </group>
      ) : null}
      {flare > 0 ? <LensFlare position={HEAD} intensity={flare} scale={0.9} rotation={t * 0.5} color="#fff2cc" streakColor="#ffc860" /> : null}
    </group>
  );
};

// ------------------------------------------------------------------------------------------------- reveal
const RV = SHOTS.reveal[0]; // 406
const STAND_POS: V3 = [0.42, 0, 0.45];
const STAND_ROT = Math.atan2(HOOK[0] - STAND_POS[0], HOOK[2] - STAND_POS[2]);

export const RevealShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const k = ramp(f, RV, SHOTS.reveal[1], (x) => x);
  const kk = ramp(f, RV - 4, SHOTS.reveal[1]);
  const glow = ramp(f, RV, RV + 20);
  const flare = 0.06 * glow + 0.4 * Math.exp(-Math.max(0, f - (W.grandpas - 1)) / 7) * (f >= W.grandpas - 1 ? 1 : 0);
  const back: V3 = [Math.sin(STAND_ROT), 0, Math.cos(STAND_ROT)];
  // over his left shoulder, slow push toward the wall
  const d = lerp(1.25, 0.45, kk);
  const right: V3 = [-Math.cos(STAND_ROT), 0, Math.sin(STAND_ROT)];
  const camPos: V3 = [STAND_POS[0] - back[0] * d + right[0] * 0.42, lerp(1.4, 1.52, kk), STAND_POS[2] - back[2] * d + right[2] * 0.42];
  const camTgt: V3 = [HOOK[0] + 0.2, HOOK[1] + lerp(-0.12, 0.06, kk), HOOK[2] + lerp(0.12, 0.04, kk)];
  const pose: GuyPose = mergePose(guyIdle(t, 2), {expression: 'determined', headPitch: -0.12, shrug: 0.1, blink: guyBlink(t, 9)});
  return (
    <Stage {...STAGE}>
      <CameraRig position={camPos} target={camTgt} fov={lerp(36, 21, k)} roll={-0.015} />
      <Room f={f} cop={0.12} windowOpen={1} moon={0.3} hide={['lights']} hammerGlow={0.55 * glow}
        keyLight={{pos: [STAND_POS[0] - 0.5, 1.9, STAND_POS[2] + 0.4], intensity: 0.4, color: '#9fb0ff'}} gold={0.25 + 0.75 * glow}
        goldPos={[HOOK[0] + 0.95, HOOK[1] + 0.6, HOOK[2] + 0.1]}>
        <directionalLight position={[2, 3, 3]} intensity={0.35} color="#6a7ad8" />
        <group position={STAND_POS} rotation={[0, STAND_ROT, 0]}>
          <Guy pose={pose} outfit={WET} />
        </group>
        <FeederAndDog f={f} pose={{...pancakeWaiting(f, {perk: 0.8, lookUp: 0}), headYaw: 0.55, headPitch: 0.35}} />
        <HungHammer position={HOOK} glow={0.12 + 0.2 * glow} />
        <Legendary f={f} k={glow} rays={glow} text={f >= W.grandpas - 4 ? 1 : 0} flare={flare} />
      </Room>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------- hero orbit
const HM = SHOTS.hammer[0]; // 454
export const HammerShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const k = ramp(f, HM, SHOTS.hammer[1], (x) => x);
  const b = beatAt((f + FROM) / 30);
  const ang = lerp(-0.5, 0.22, k); // orbit around the wall normal (+X), in the XZ plane
  const r = lerp(0.95, 0.78, k);
  const camPos: V3 = [HOOK[0] + Math.cos(ang) * r, HOOK[1] + lerp(0.16, 0.06, k), HOOK[2] + 0.05 + Math.sin(ang) * r];
  // aim left of the hammer (+Z = screen-left from the room) so it sits right of the item card
  const camTgt: V3 = [HOOK[0] + 0.02, HOOK[1] + 0.06, HOOK[2] + 0.05 + 0.17];
  const hit = Math.exp(-Math.max(0, f - (W.hammer - 1)) / 6) * (f >= W.hammer - 1 ? 1 : 0);
  return (
    <>
      <Stage {...STAGE}>
        <CameraRig position={camPos} target={camTgt} fov={34} roll={0.03} />
        <Room f={f} cop={0.1} windowOpen={1} moon={0.3} hide={['lights']} hammerGlow={0.22} gold={0.35 + 0.35 * b.pulse}
          goldPos={[HOOK[0] + 1.1, HOOK[1] + 0.5, HOOK[2] + 0.2]} keyLight={{pos: [HOOK[0] + 0.6, HOOK[1] - 0.3, HOOK[2] - 0.4], intensity: 0.6, color: '#8fa2ff'}}>
          <directionalLight position={[2, 3, 3]} intensity={0.35} color="#6a7ad8" />
          <HungHammer position={HOOK} glow={0.1 + 0.12 * b.pulse} />
          <Legendary f={f} k={0.7} rays={0.45} text={0} flare={0.08 + 0.6 * hit} />
        </Room>
      </Stage>
      <ItemCard f={f} start={HM} x={80} y={120} scale={1.12} />
    </>
  );
};

// ------------------------------------------------------------------------------------------------- reach
/*
 * 501–551 "…about LOCKS": one camera on the nightstand side (-Z) looking back at him as he faces the wall rack.
 *   501–518  tight 3/4 close-up of his determined face, lit gold by the hammer (slow push, brows down on "about")
 *   518      crash zoom OUT on the beat: the glowing hammer slides into the right of frame, his left hand rising toward it
 *   ~525     the fist clamps on the handle on "locks" (gold flash + flare)
 *   530–542  he lifts it off the pegs; glow swells
 *   542–551  gold → white-out into Swing (which opens on a white flash)
 */
const RC = SHOTS.reach[0]; // 501
const ZOOM_F = 518; // beat
const GRAB_F = Math.round(W.locks) - 1; // 524: fist closes on "locks"
const LIFT_A = GRAB_F + 6;
const LIFT_B = GRAB_F + 16;
const REACH_YAW = -0.64; // facing the wall (-X) and turned toward the camera (+Z, the door side)
const HANDLE: V3 = [HOOK[0] + 0.015, HOOK[1] + 0.022, HOOK[2] - 0.045];

const reachArm = (r: number, grab: number, lift: number) => ({
  shoulderX: lerp(0.15, 1.95, r) + 0.12 * lift,
  shoulderZ: lerp(0.08, 0.1, r),
  shoulderY: lerp(0, 0.05, r),
  elbow: lerp(0.35, 0.25, r) + 0.6 * Math.sin(Math.PI * r) * (1 - grab),
  twist: lerp(0.2, 0.9, r),
  wrist: 0.1,
  wristZ: lerp(0.1, -0.1, r),
  grip: lerp(0.2, 1, grab),
  swing: 0,
});

const reachPose = (f: number): GuyPose => {
  const t = f / 30;
  const r = ramp(f, 511, GRAB_F, (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2));
  const grab = ramp(f, GRAB_F - 2, GRAB_F + 2);
  const lift = ramp(f, LIFT_A, LIFT_B);
  const about = ramp(f, W.about - 2, W.about + 4);
  return mergePose(guyIdle(t, 5), {
    expression: 'determined', expression2: 'angry', expressionMix: 0.25 * about,
    headPitch: -0.06 - 0.05 * r, headYaw: -0.12, headTilt: -0.04 + 0.04 * about, eyesX: -0.35, eyesY: 0.25,
    blink: f >= 511 && f < 514 ? 1 : 0, mouthOpen: 0, shrug: 0.15, lean: 0.05 * r, torsoTwist: -0.12 * r,
    armR: reachArm(r, grab, lift),
  });
};
/** root placed so that at full reach the right fist closes on the handle */
const REACH_POS: V3 = (() => {
  const g = guyToRoom(guyPoint(reachPose(GRAB_F + 2), 'gripR'), [0, 0, 0], REACH_YAW);
  return [HANDLE[0] - g[0], 0, HANDLE[2] - g[2]];
})();
const FACE: V3 = guyToRoom(guyPoint(reachPose(RC), 'eyes'), REACH_POS, REACH_YAW);
/** how far the fist (and the hammer with it) rises when he lifts it */
const LIFT_D: V3 = (() => {
  const a = guyToRoom(guyPoint(reachPose(LIFT_A), 'gripR'), REACH_POS, REACH_YAW);
  const b = guyToRoom(guyPoint(reachPose(LIFT_B + 2), 'gripR'), REACH_POS, REACH_YAW);
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
})();

export const ReachShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const pose = reachPose(f);
  const zoom = ramp(f, ZOOM_F - 1, ZOOM_F + 5, (x) => 1 - Math.pow(1 - x, 3));
  const push = ramp(f, RC, ZOOM_F, (x) => x);
  const drift = ramp(f, ZOOM_F + 5, SHOTS.reach[1], (x) => x);
  const lift = ramp(f, LIFT_A, LIFT_B);
  const camPos: V3 = [FACE[0] - 0.12 + 0.08 * zoom, FACE[1] - 0.1 - 0.06 * zoom, FACE[2] + 1.12 - 0.12 * drift];
  const mid: V3 = [FACE[0] * 0.42 + HANDLE[0] * 0.58 + 0.02, (FACE[1] + HANDLE[1]) / 2 - 0.03, FACE[2] * 0.42 + HANDLE[2] * 0.58];
  const camTgt: V3 = [lerp(FACE[0], mid[0], zoom), lerp(FACE[1] - 0.02, mid[1], zoom), lerp(FACE[2], mid[2], zoom)];
  const fov = lerp(lerp(23, 19.5, push), 33, zoom) - 2 * drift;
  const grabFlash = f >= GRAB_F + 1 ? Math.exp(-(f - GRAB_F - 1) / 5) : 0;
  const whiteout = ramp(f, SHOTS.reach[1] - 9, SHOTS.reach[1] - 1, (x) => x * x);
  const swell = ramp(f, LIFT_A, SHOTS.reach[1]);
  const hamPos: V3 = [HOOK[0] + LIFT_D[0] * lift, HOOK[1] + LIFT_D[1] * lift, HOOK[2] + LIFT_D[2] * lift];
  const shake = f >= GRAB_F + 1 && f < GRAB_F + 7 ? 0.006 * Math.sin((f - GRAB_F) * 3.1) : 0;
  return (
    <>
      <Stage {...STAGE}>
        <CameraRig position={[camPos[0], camPos[1] + shake, camPos[2]]} target={camTgt} fov={fov} roll={lerp(-0.05, 0.03, zoom)} />
        <Room f={f} cop={0.08} windowOpen={1} moon={0.3} hide={['lights', 'dogBed', 'lamp']} hammerGlow={0.45 + 0.4 * swell} gold={0.5 - 0.15 * zoom + 0.5 * grabFlash + 0.3 * swell + 2 * whiteout}
          goldPos={[HOOK[0] + 0.12, HOOK[1] - 0.1, HOOK[2] + 0.42]}
          keyLight={{pos: [camPos[0] + 0.5, camPos[1] + 0.6, camPos[2] + 0.2], intensity: 0.45, color: '#8fa2ff', distance: 2.6}}>
          <directionalLight position={[2, 3, 3]} intensity={0.3} color="#6a7ad8" />
          <group position={REACH_POS} rotation={[0, REACH_YAW, 0]}>
            <Guy pose={pose} outfit={WET} />
          </group>
          <HungHammer position={hamPos} glow={0.4 + 0.35 * grabFlash + 0.3 * swell} />
          <Legendary f={f} k={0.7 + 0.5 * swell} rays={0.45 * zoom} text={0} flare={zoom > 0.5 ? 0.1 + 0.9 * grabFlash + 0.25 * swell + 2.5 * whiteout : 0} />
        </Room>
      </Stage>
      {whiteout > 0 ? <AbsoluteFill style={{background: '#fff6dc', opacity: whiteout * 0.92}} /> : null}
    </>
  );
};
