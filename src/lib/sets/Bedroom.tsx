/**
 * BEDROOM SET — the Guy's small cosy room (4.5 x 4 m, 2.6 m ceiling), cel-shaded low-poly diorama, with its own lights.
 *
 *   <Bedroom time="night" lamp={0} moon={1} copLights={0} frame={f} windowOpen={0} rainOnWindow={false}
 *            hideWalls={['front']} bed={{tilt, glow, blanket}} pillow={{talk, glow}} clock={{text: '3:15'}}
 *            printer={{feed, error, locked}} tv={{screen, power, static}} hide={['chair']} {...groupProps}>
 *     <Guy position={BEDROOM_SPOTS.guySitOnBed} rotation={[0, BEDROOM_SPOTS.guySitOnBedRotY, 0]} />   // your cast
 *   </Bedroom>
 *
 * Space: origin = floor centre of the room. x -2.25 (left wall: door, hammer rack, dog bed) .. +2.25 (right wall: desk +
 * printer, dresser + CRT TV); z -2 (back wall: bed headboard, nightstand + LED clock + lamp, window) .. +2 (front wall).
 * Default walls: back + left + right + ceiling + front. Cameras inside the room need nothing hidden; diorama cameras
 * outside should pass hideWalls={['front', ...]} and hide={['outside']} (outside view would peek over the back wall).
 *
 * Props
 *   time        'night' (default: moody blue moonlight + device glows) | 'dawn' (warm pink/orange) | 'day' (bright)
 *   lamp        bedside lamp 0..1 (warm light)       moon  0..1+ window light (moon/sun) strength, default 1
 *   copLights   0..1 red/blue police flashes through the window (pattern from `frame`)
 *   frame       drives every flicker/blink/pulse (clock colon, pillow waveform, rain, cops, printer error, TV snow)
 *   windowOpen  0..1 casements swing outward, curtains billow     rainOnWindow  beads, sliding drops, streaks outside
 *   hideWalls   ('front'|'left'|'right'|'back'|'ceiling')[]      doorOpen 0..1     stars 0..1 glow-in-the-dark stars
 *   curtainsClosed 0..1    hammerGlow 0..1 golden halo behind the empty hammer rack ("legendary item" beat)
 *   bed / pillow / clock / printer / tv / lavaLamp  pass-through props for the built-in pieces (see their files)
 *   hide        pieces to omit: 'bed'|'pillow'|'nightstand'|'clock'|'lamp'|'desk'|'printer'|'chair'|'dresser'|'tv'|
 *               'lavaLamp'|'rug'|'posters'|'hammerRack'|'dogBed'|'blowupChair'|'curtains'|'outside'|'lights'
 *   children    rendered inside the room space (lit by the room lights)
 * Defaults: TV is OFF (tv={{power: 1, screen}} to switch it on), clock reads 3:15 with a blinking colon, printer idle,
 * bed LED glow 1 at night / 0.5 otherwise, lava lamp on at night. Lights: hemisphere + key directional through the window
 * (SUN_DIR per time) + front fill + 2 cop point lights; devices add small glows. The light COUNT never changes with props,
 * so animating time/lamp/cops never triggers shader recompiles. Pass hide={['lights']} to light it yourself.
 *
 * BEDROOM_SPOTS (room space [x,y,z] tuples; ...RotY = yaw for a character facing +Z by default) — see below.
 * bedHeadPoint(tilt, local) / bedHeadPose(tilt) give positions on the tilting head section (e.g. a sitting-up torso).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {Bed, BedProps, PillowProps, BED_LOCAL} from './bedroom/Bed';
import {LedClock, LedClockProps, CLOCK_FACE} from './bedroom/LedClock';
import {Printer, PrinterProps, PRINTER_ANCHORS} from './bedroom/Printer';
import {Nightstand, Lamp, Desk, DeskChair, Dresser, LavaLamp, DogBed, HammerRack, Poster, Rug, InflatableChair, LAMP_BULB} from './bedroom/Furniture';
import {BedroomWindow, copFlash} from './bedroom/Window';
import {RoomShell, WallId} from './bedroom/Shell';
import {posterStarTexture, posterY2KTexture, TimeOfDay} from './bedroom/textures';
import {CRTTV, CRTTVProps, CRT_SCREEN} from '../props/CRTTV';
import {
  ROOM, WIN, DOOR, BED, NIGHTSTAND, CLOCK_POS, CLOCK_ROT_Y, LAMP_POS, DESK, PRINTER_POS, PRINTER_ROT_Y, CHAIR_POS, DRESSER,
  TV_POS, TV_ROT_Y, LAVA_POS, DOG_BED, FEEDER, BLOWUP_CHAIR, RUG, HAMMER_RACK, HAMMER_HOOK, POSTER_STAR, POSTER_Y2K, SUN_DIR, PILLOW_LOCAL,
  bedHeadPoint, bedHeadPose, V3,
} from './bedroom/layout';

export {Bed, Pillow, BED_LOCAL, PILLOW_SIZE} from './bedroom/Bed';
export type {BedProps, PillowProps} from './bedroom/Bed';
export {LedClock, CLOCK_SIZE, CLOCK_FACE} from './bedroom/LedClock';
export type {LedClockProps} from './bedroom/LedClock';
export {Printer, Padlock, PRINTER_ANCHORS} from './bedroom/Printer';
export type {PrinterProps} from './bedroom/Printer';
export {Nightstand, Lamp, Desk, DeskChair, Dresser, LavaLamp, DogBed, HammerRack, Poster, Rug, GlowStars, InflatableChair} from './bedroom/Furniture';
export {copFlash} from './bedroom/Window';
export {ROOM, PILLOW_LOCAL, bedHeadPoint, bedHeadPose} from './bedroom/layout';
export type {TimeOfDay} from './bedroom/textures';

export type BedroomPiece =
  | 'bed' | 'pillow' | 'nightstand' | 'clock' | 'lamp' | 'desk' | 'printer' | 'chair' | 'dresser' | 'tv' | 'lavaLamp'
  | 'rug' | 'posters' | 'hammerRack' | 'dogBed' | 'curtains' | 'outside' | 'lights' | 'blowupChair';

type GroupProps = Omit<ThreeElements['group'], 'children'>;
type Own<T> = Omit<T, Exclude<keyof GroupProps, 'static'> | 'children'>;

export type BedroomProps = GroupProps & {
  time?: TimeOfDay;
  lamp?: number;
  moon?: number;
  copLights?: number;
  frame?: number;
  windowOpen?: number;
  rainOnWindow?: boolean;
  hideWalls?: WallId[];
  doorOpen?: number;
  stars?: number;
  curtainsClosed?: number;
  hammerGlow?: number;
  bed?: Own<BedProps>;
  pillow?: Own<PillowProps>;
  clock?: Own<LedClockProps>;
  printer?: Own<PrinterProps>;
  tv?: Own<CRTTVProps>;
  lavaLamp?: {on?: number};
  hide?: BedroomPiece[];
  children?: React.ReactNode;
};

// ------------------------------------------------------------------ spots
const rotY = (p: V3, a: number): V3 => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const r3 = (p: V3): V3 => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000, Math.round(p[2] * 1000) / 1000];

type Cam = {position: V3; target: V3; fov: number};

/** Key positions in Bedroom space. Characters face +Z by default; use the matching ...RotY yaw. */
export const BEDROOM_SPOTS = {
  room: {w: ROOM.w, d: ROOM.d, h: ROOM.h},
  /** bed footprint centre (floor) */
  bed: [BED.x, 0, (BED.zHead + BED.zFoot) / 2] as V3,
  /** mattress top centre (flat) */
  mattressTop: [BED.x, BED.mattressTop, (BED.zHead + BED.zFoot) / 2] as V3,
  /** pillow centre when tilt = 0 (use bedHeadPoint(tilt, PILLOW_LOCAL) for tilted) */
  pillow: r3(bedHeadPoint(0, PILLOW_LOCAL)),
  pillowSitting: r3(bedHeadPoint(1, PILLOW_LOCAL)),
  /** head-section hinge (on the mattress top) */
  bedHinge: [BED.x, BED.mattressTop, BED.hingeZ] as V3,
  /** <Guy> BED-MODE origin: hips on the mattress, head on the pillow (-Z), legs toward the foot. No rotation needed:
   *  <Guy position={guyLieInBed} pose={guySleepyWake(p)}/> (verified in playground/Showcase, frames 270-329). */
  guyLieInBed: [BED.x, BED.mattressTop, BED.hingeZ + 0.08] as V3,
  /** same origin while the head section tilts him up (bed mode, lie 0): the hips stay put just in front of the hinge */
  guySitUpInBed: [BED.x, BED.mattressTop, BED.hingeZ + 0.08] as V3,
  /** sitting on the right edge of the bed, feet on the floor; face +X -> rotation y = guySitOnBedRotY.
   *  The mattress is 0.52 m (higher than GUY.seatHeight 0.37): pose with mergePose(yourPose, guySitOn(0.52)). */
  guySitOnBed: [BED.x + BED.width / 2 - 0.12, 0, -0.75] as V3,
  guySitOnBedRotY: Math.PI / 2,
  /** standing spot beside the bed facing the camera / room */
  guyStand: [0.55, 0, 0.45] as V3,
  nightstand: [NIGHTSTAND.x, NIGHTSTAND.h, NIGHTSTAND.z] as V3,
  /** LED clock base + its face centre */
  clock: CLOCK_POS,
  clockFace: r3(add(CLOCK_POS, rotY(CLOCK_FACE, CLOCK_ROT_Y))),
  clockRotY: CLOCK_ROT_Y,
  lamp: LAMP_POS,
  lampBulb: r3(add(LAMP_POS, LAMP_BULB)),
  desk: [DESK.x, DESK.h, DESK.z] as V3,
  /** printer base (on the desk), faces -X; printerSlot = page exit point */
  printer: PRINTER_POS,
  printerRotY: PRINTER_ROT_Y,
  printerSlot: r3(add(PRINTER_POS, rotY(PRINTER_ANCHORS.slot, PRINTER_ROT_Y))),
  chair: CHAIR_POS,
  dresser: [DRESSER.x, DRESSER.h, DRESSER.z] as V3,
  /** CRT TV base on the dresser and its screen centre (faces roughly -X toward the bed) */
  tv: TV_POS,
  tvRotY: TV_ROT_Y,
  tvScreen: r3(add(TV_POS, rotY(CRT_SCREEN.center as V3, TV_ROT_Y))),
  /** unit vector the TV screen faces */
  tvNormal: r3(rotY([0, 0, 1], TV_ROT_Y)),
  /** window opening centre (wall plane), inner sill top, and a ground spot just outside */
  window: [WIN.x, (WIN.sill + WIN.top) / 2, ROOM.zMin] as V3,
  windowSill: [WIN.x, WIN.sill, ROOM.zMin + 0.08] as V3,
  windowOutside: [WIN.x, 0, ROOM.zMin - 0.7] as V3,
  /** door threshold centre (left wall) + a standing spot just inside, facing +X */
  door: [ROOM.xMin, 0, DOOR.z] as V3,
  doorInside: [ROOM.xMin + 0.55, 0, DOOR.z] as V3,
  /** EMPTY floor spot by the bed reserved for the smart feeder box (base centre, face +Z or yaw toward the bed) */
  feeder: FEEDER,
  /** Pancake's bed (floor, centre) */
  dogBed: DOG_BED,
  /** top of the two brass pegs, midway between them: a horizontally hung hammer's handle rests here, axis along Z */
  hammerHook: HAMMER_HOOK,
  /** peg positions (tips) along Z, and the wall normal (+X) */
  hammerPegs: [[HAMMER_HOOK[0], HAMMER_HOOK[1], HAMMER_RACK.z - HAMMER_RACK.pegSpacing / 2], [HAMMER_HOOK[0], HAMMER_HOOK[1], HAMMER_RACK.z + HAMMER_RACK.pegSpacing / 2]] as V3[],
  hammerWallNormal: [1, 0, 0] as V3,
  rug: [RUG.x, 0, RUG.z] as V3,
  posterStar: POSTER_STAR.pos,
  posterY2K: POSTER_Y2K.pos,
  // cameras (all inside the room unless noted)
  cameraWide: {position: [0.75, 1.7, 1.92], target: [-0.2, 0.72, -1.1], fov: 60} as Cam,
  cameraWideLeft: {position: [-1.95, 1.55, 1.75], target: [0.4, 0.8, -1.2], fov: 58} as Cam,
  cameraBed: {position: [0.75, 1.2, 0.85], target: [-0.6, 0.72, -1.25], fov: 46} as Cam,
  cameraClock: {position: [-1.3, 0.78, -1.12], target: r3(add(CLOCK_POS, rotY(CLOCK_FACE, CLOCK_ROT_Y))), fov: 34} as Cam,
  cameraPillow: {position: [-0.35, 1.12, -0.85], target: r3(bedHeadPoint(0, PILLOW_LOCAL)), fov: 40} as Cam,
  cameraPrinter: {position: [1.22, 1.1, 0.5], target: add(PRINTER_POS, [0, 0.1, 0]), fov: 38} as Cam,
  cameraTV: {
    position: r3(add(add(TV_POS, rotY(CRT_SCREEN.center as V3, TV_ROT_Y)), [rotY([0, 0, 1], TV_ROT_Y)[0] * 1.5, 0.15, rotY([0, 0, 1], TV_ROT_Y)[2] * 1.5])),
    target: r3(add(TV_POS, rotY(CRT_SCREEN.center as V3, TV_ROT_Y))),
    fov: 40,
  } as Cam,
  cameraWindow: {position: [0.35, 1.35, 0.7], target: [WIN.x, 1.45, ROOM.zMin], fov: 50} as Cam,
  cameraHammer: {position: [-0.9, 1.45, 0.25], target: HAMMER_HOOK, fov: 40} as Cam,
  cameraFeeder: {position: [0.95, 0.85, 0.95], target: [FEEDER[0], 0.2, FEEDER[2]], fov: 44} as Cam,
  /** OUTSIDE the room: needs hideWalls={['front','right']} and hide={['outside']} */
  cameraDiorama: {position: [4.6, 4.2, 5.6], target: [0, 0.6, -0.3], fov: 42} as Cam,
};

// ------------------------------------------------------------------ lighting presets
const TOD: Record<TimeOfDay, {sky: string; ground: string; hemi: number; key: string; keyI: number; fill: string; fillI: number}> = {
  night: {sky: '#5a6cd8', ground: '#150f38', hemi: 0.62, key: '#9cb8ff', keyI: 1.1, fill: '#6a4ad8', fillI: 0.25},
  dawn: {sky: '#ffb0c8', ground: '#4a2a62', hemi: 0.95, key: '#ff9e6a', keyI: 2.0, fill: '#8a7aff', fillI: 0.4},
  day: {sky: '#eef6ff', ground: '#a88a68', hemi: 1.25, key: '#fff3da', keyI: 2.2, fill: '#bcd4ff', fillI: 0.45},
};

const RoomLights: React.FC<{time: TimeOfDay; moon: number; copLights: number; frame: number}> = ({time, moon, copLights, frame}) => {
  const t = TOD[time];
  const d = SUN_DIR[time];
  const target = useMemo(() => new THREE.Object3D(), []);
  const keyRef = React.useRef<THREE.DirectionalLight>(null);
  const fillRef = React.useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    if (keyRef.current) keyRef.current.target = target;
    if (fillRef.current) fillRef.current.target = target;
  }, [target]);
  const cop = copFlash(frame);
  const ci = Math.max(0, Math.min(1, copLights));
  const k = 6;
  return (
    <group>
      <primitive object={target} position={[0, 0.5, -0.5]} />
      <hemisphereLight args={[t.sky, t.ground, t.hemi]} />
      <directionalLight ref={keyRef} color={t.key} intensity={t.keyI * Math.max(0, moon)} position={[-d[0] * k, 0.5 - d[1] * k, -0.5 - d[2] * k]} />
      <directionalLight ref={fillRef} color={t.fill} intensity={t.fillI} position={[3, 2.5, 6]} />
      <pointLight color="#ff1a2a" position={[WIN.x - 0.45, 1.5, ROOM.zMin + 0.35]} intensity={cop.red * ci * 5.5} distance={8} decay={1.25} />
      <pointLight color="#2a5bff" position={[WIN.x + 0.35, 1.5, ROOM.zMin + 0.35]} intensity={cop.blue * ci * 6.5} distance={8} decay={1.25} />
    </group>
  );
};

// ------------------------------------------------------------------ set
export const Bedroom: React.FC<BedroomProps> = ({
  time = 'night', lamp = 0, moon = 1, copLights = 0, frame = 0, windowOpen = 0, rainOnWindow = false, hideWalls = [],
  doorOpen = 0, stars, curtainsClosed = 0, hammerGlow = 0, bed, pillow, clock, printer, tv, lavaLamp, hide = [], children, ...group
}) => {
  const has = (p: BedroomPiece) => !hide.includes(p);
  const starTex = posterStarTexture();
  const y2kTex = posterY2KTexture();
  const starGlow = stars ?? (time === 'night' ? 1 : time === 'dawn' ? 0.3 : 0);
  const night = time === 'night';
  return (
    <group {...group}>
      {has('lights') ? <RoomLights time={time} moon={moon} copLights={copLights} frame={frame} /> : null}
      <RoomShell hideWalls={hideWalls} doorOpen={doorOpen} stars={starGlow} time={time} />
      {!hideWalls.includes('back') ? (
        <BedroomWindow time={time} moon={moon} windowOpen={windowOpen} rain={rainOnWindow} copLights={copLights} frame={frame}
          curtains={has('curtains')} outside={has('outside')} curtainsClosed={curtainsClosed} />
      ) : null}
      {has('rug') ? <Rug position={[RUG.x, 0, RUG.z]} scale={[RUG.rx, 1, RUG.rz]} /> : null}
      {has('bed') ? (
        <Bed position={[BED.x, 0, BED.zHead]} glow={night ? 1 : 0.5} {...bed}
          pillow={has('pillow') ? {frame, glow: night ? 0.8 : 0.4, ...pillow} : false} />
      ) : null}
      {has('nightstand') ? <Nightstand position={[NIGHTSTAND.x, 0, NIGHTSTAND.z]} /> : null}
      {has('clock') ? <LedClock position={CLOCK_POS} rotation={[0, CLOCK_ROT_Y, 0]} frame={frame} {...clock} /> : null}
      {has('lamp') ? <Lamp position={LAMP_POS} on={lamp} /> : null}
      {has('desk') ? <Desk position={[DESK.x, 0, DESK.z]} rotation={[0, -Math.PI / 2, 0]} /> : null}
      {has('printer') ? <Printer position={PRINTER_POS} rotation={[0, PRINTER_ROT_Y, 0]} frame={frame} {...printer} /> : null}
      {has('chair') ? <DeskChair position={CHAIR_POS} rotation={[0, Math.PI / 2 + 0.35, 0]} /> : null}
      {has('dresser') ? <Dresser position={[DRESSER.x, 0, DRESSER.z]} rotation={[0, -Math.PI / 2, 0]} /> : null}
      {has('tv') ? <CRTTV position={TV_POS} rotation={[0, TV_ROT_Y, 0]} power={0} frame={frame} {...tv} /> : null}
      {has('lavaLamp') ? <LavaLamp position={LAVA_POS} frame={frame} on={lavaLamp?.on ?? (night ? 1 : 0.4)} /> : null}
      {has('dogBed') ? <DogBed position={DOG_BED} /> : null}
      {has('blowupChair') ? <InflatableChair position={BLOWUP_CHAIR} rotation={[0, -2.4, 0]} /> : null}
      {has('hammerRack') && !hideWalls.includes('left') ? (
        <HammerRack position={[ROOM.xMin, HAMMER_RACK.y, HAMMER_RACK.z]} rotation={[0, Math.PI / 2, 0]} glow={hammerGlow} />
      ) : null}
      {has('posters') ? (
        <>
          {!hideWalls.includes('back') ? <Poster texture={starTex} w={POSTER_STAR.w} h={POSTER_STAR.h} position={POSTER_STAR.pos} tilt={0.025} /> : null}
          {!hideWalls.includes('right') ? (
            <Poster texture={y2kTex} w={POSTER_Y2K.w} h={POSTER_Y2K.h} position={POSTER_Y2K.pos} rotation={[0, -Math.PI / 2, 0]} tilt={-0.03} />
          ) : null}
        </>
      ) : null}
      {children}
    </group>
  );
};

/** Convenience: CameraRig props for a named BEDROOM_SPOTS camera. */
export const bedroomCamera = (name: keyof typeof BEDROOM_SPOTS & `camera${string}`) => BEDROOM_SPOTS[name] as Cam;
