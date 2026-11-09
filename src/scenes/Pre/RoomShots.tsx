/**
 * Pre room shots (night bedroom, warm lamp on):
 *   P1 "Hold on"       profile two-shot at dog-eye level: the Guy bends and pats Pancake; Pancake melts (happy eyes,
 *                      ears up, tail going), a little pink heart pops.
 *   P2 "buddy, I'll be right back"   Pancake's POV over his own ears looking UP at the Guy, who smiles, then stands
 *                      tall and jingles his car keys (sparkle) on "right back".
 *   P5 "How hard can it be to buy one thing"   the Guy, cocky, keys in hand; on the downbeat the camera pulls back hard
 *                      and up out of the room (walls fall away) while price tags slam onto EVERYTHING on the beats —
 *                      bed, TV, printer, feeder, clock, dog bed — and finally a RENTED sticker on his own hoodie.
 *                      Grandpa's hammer on the wall is the only thing without a tag (it twinkles).
 */
import React from 'react';
import * as THREE from 'three';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {Sparkle, SparkleField, WireGrid, Starfield} from '../../lib/three/fx';
import {Guy, GuyPose, mergePose, mixPose as mixGuy, guyPatDog, guyHoldUp, guyIdle, guyBlink, guyPoint} from '../../lib/characters/Guy';
import {Pancake, PancakePose, pancakeBeg, pancakeBlink, mixPose as mixDog} from '../../lib/characters/Pancake';
import {Feeder} from '../../lib/props';
import {DeskChair, BEDROOM_SPOTS as S} from '../../lib/sets/Bedroom';
import {LINES} from '../../lib/lyrics';
import {C} from '../../lib/palette';
import {ramp, popIn, lerp} from '../../lib/time';
import {NightRoom, DOG_POS, DOG_YAW, FEEDER_POS, FEEDER_ROT, rotY, shake, add, mix3, lipSync, V3} from '../V1Feeder/common';
import {Keys} from './Keys';
import {PriceTag, Sticker} from './Tags';
import {W, FROM} from './timing';

type P = {f: number; t: number};

// ------------------------------------------------------------------------------------------------ staging
const DIR: V3 = [Math.sin(DOG_YAW), 0, Math.cos(DOG_YAW)];
/** Pancake's head top (approx., sitting) in room space */
const DOG_HEAD: V3 = [DOG_POS[0] + DIR[0] * 0.2, 0.72, DOG_POS[2] + DIR[2] * 0.2];
/** the Guy stands facing the dog so guyPatDog's hand (0.55 m in front) lands on the head */
const PAT_DIST = 0.8;
export const GUY_PAT: V3 = [DOG_POS[0] + DIR[0] * PAT_DIST, 0, DOG_POS[2] + DIR[2] * PAT_DIST];
export const GUY_PAT_YAW = DOG_YAW + Math.PI;
const guyToRoomPat = (p: V3): V3 => add(GUY_PAT, rotY(p, GUY_PAT_YAW));
const dogToRoomP = (p: V3): V3 => add(DOG_POS, rotY(p, DOG_YAW));

const SONG = (f: number) => (f + FROM) / 30;
const talk = (f: number, line: number) => lipSync(SONG(f), LINES[line].words, 0.6);

/** the chair pushed back to the desk (he got up) */
const Chair = () => <DeskChair position={[1.62, 0, 0.62]} rotation={[0, -2.2, 0]} />;

const LockedFeeder: React.FC<{t: number}> = ({t}) => (
  <Feeder position={FEEDER_POS} rotation={[0, FEEDER_ROT, 0]} lcdText="PLUS MEMBERS ONLY" lcdColor="#FF4A2E" lockOpen={0} time={t} kibbleFill={0.85} />
);

/** Pancake melting under the pat: sad puppy -> happy */
const pattedDog = (t: number, k: number, pat: number): PancakePose => {
  const sad: PancakePose = {...pancakeBeg(t, 1), eyes: 'puppy', earPerk: -0.9, headPitch: 0.55, frown: 0.6, tear: 0.35, blink: pancakeBlink(t, 4, 3.8)};
  const happy: PancakePose = {
    sit: 1, eyes: 'happy', earPerk: 0.4, headPitch: 0.28 - 0.1 * pat, headTilt: 0.18 + 0.05 * Math.sin(t * 5), mouthOpen: 0.45, tongue: 0.6,
    tailWag: t * 3.2, tailWagAmount: 0.9, blush: 0.8, bodySquash: -0.04 * pat,
  };
  return mixDog(sad, happy, k);
};

// ------------------------------------------------------------------------------------------------ P1 "Hold on"
export const ShotPat: React.FC<P> = ({f, t}) => {
  const contact = W.hold + 1;
  const k = ramp(f, contact - 2, contact + 8);
  // reach in: bend from upright to the pat pose over the first frames
  const reach = ramp(f, 0, contact, (x) => 1 - Math.pow(1 - x, 2));
  const pat = guyPatDog(Math.max(0, f - contact) / 30);
  const pose = mergePose(mixGuy(mergePose(guyIdle(t), {torsoBend: 0.25, headPitch: 0.3}), pat, reach), {
    expression: 'sad', expression2: 'happy', expressionMix: ramp(f, contact - 4, contact + 10), mouthOpen: talk(f, 8), blink: guyBlink(t, 6),
  });
  const patPhase = f >= contact ? 0.5 + 0.5 * Math.sin(((f - contact) / 30) * Math.PI * 2 * 1.7) : 0;
  const dog = pattedDog(t, k, patPhase);
  // two-shot from the front of the room: the dog in 3/4, the Guy in profile bending over him
  const mid = mix3(DOG_POS, GUY_PAT, 0.45);
  const push = ramp(f, 0, 33, (x) => x);
  const cam: V3 = add([mid[0] + 0.05, lerp(1.16, 1.1, push), Math.min(1.86, mid[2] + lerp(1.9, 1.75, push))], shake(t, 0.004, 31));
  const target: V3 = [mid[0] + 0.05, 0.98, mid[2]];
  const heart = popIn(f, contact + 4, 10);
  const heartPos = add(dogToRoomP([0, 0.98, 0.15]), [0, 0.12 * ramp(f, contact + 4, contact + 30, (x) => x), 0]);
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam} target={target} fov={56} />
      <NightRoom frame={f} lamp={1} chair={false}
        lights={{key: {position: add(cam, [0.3, 0.8, -0.6]), intensity: 2.0, color: '#ffd9b0', distance: 3.4}}}>
        <Chair />
        <LockedFeeder t={t} />
        <Guy position={GUY_PAT} rotation={[0, GUY_PAT_YAW, 0]} pose={pose} />
        <Pancake position={DOG_POS} rotation={[0, DOG_YAW, 0]} pose={dog} />
        {f >= contact + 4 ? <Heart position={heartPos} scale={0.09 * heart} /> : null}
        {f >= contact + 4 ? <SparkleField count={6} seed={5} area={[0.35, 0.25, 0.1]} position={heartPos} time={t} size={0.06} /> : null}
      </NightRoom>
    </Stage>
  );
};

/** puffy low-poly Y2K heart (extruded), pink glossy */
const Heart: React.FC<{position: V3; scale: number}> = ({position, scale}) => {
  const geo = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.9);
    s.bezierCurveTo(-0.2, -0.6, -1, -0.2, -1, 0.3);
    s.bezierCurveTo(-1, 0.85, -0.35, 1.05, 0, 0.55);
    s.bezierCurveTo(0.35, 1.05, 1, 0.85, 1, 0.3);
    s.bezierCurveTo(1, -0.2, 0.2, -0.6, 0, -0.9);
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.3, bevelEnabled: true, bevelSize: 0.18, bevelThickness: 0.18, bevelSegments: 2, curveSegments: 8});
    g.center();
    return g;
  }, []);
  return (
    <group position={position} scale={Math.max(0.0001, scale)}>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#ff5fbf" toneMapped={false} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ P2 "buddy, I'll be right back"
export const ShotPov: React.FC<P & {from: number}> = ({f, t, from}) => {
  const sf = f + from; // scene frame
  const stand = ramp(sf, W.right - 6, W.right + 8);
  const keysUp = ramp(sf, W.right - 2, W.back + 2);
  const pat = mergePose(guyPatDog((sf - W.hold) / 30), {headPitch: 0.62, eyesY: -0.6});
  const up = mergePose(guyHoldUp(keysUp, t), {headPitch: lerp(0.62, 0.35, keysUp), eyesY: -0.45, headTilt: 0.1});
  const pose = mergePose(mixGuy(pat, up, stand), {
    expression: 'happy', expression2: 'determined', expressionMix: 0.35 * keysUp, mouthOpen: talk(sf, 8), blink: guyBlink(t, 6),
  });
  // Pancake's own POV (the dog is not rendered): eye height, looking up at the Guy
  const dogEye = dogToRoomP([0, 0.6, 0.3]);
  const guyFace = guyToRoomPat(guyPoint(pose, 'eyes'));
  const push = ramp(f, 0, 48, (x) => x);
  const cam: V3 = add(add(dogEye, [0, lerp(0.02, 0.06, push), 0]), shake(t, 0.004, 33));
  const target: V3 = add(guyFace, [0, lerp(-0.22, -0.3, stand), 0]);
  const jingle = Math.sin(t * 16) * ramp(sf, W.right, W.back + 6) * 1.2;
  const sparkle = ramp(sf, W.back - 2, W.back + 14, (x) => x);
  const handPos = guyToRoomPat([-0.3, lerp(1.0, 2.12, keysUp), 0.18]);
  return (
    <Stage background={C.night} env="night" bloom={{strength: 0.65, threshold: 0.9}}>
      <CameraRig position={cam} target={target} fov={lerp(64, 70, stand)} roll={-0.06} />
      <NightRoom frame={f} lamp={1} chair={false}
        lights={{key: {position: guyToRoomPat([0.45, 1.75, 1.0]), intensity: 1.8, color: '#ffd9b0', distance: 3.0}}}>
        <Chair />
        <LockedFeeder t={t} />
        <Guy position={GUY_PAT} rotation={[0, GUY_PAT_YAW, 0]} pose={pose} rightHand={stand > 0.2 ? <Keys jingle={jingle} rotation={[Math.PI / 2, 0, 0]} scale={1.7} /> : null} />
        {sparkle > 0 && sparkle < 1 ? <Sparkle position={handPos} size={0.35 * Math.sin(Math.PI * sparkle)} time={t} intensity={3} /> : null}
      </NightRoom>
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ P5 "How hard can it be to buy one thing"
const GUY_C: V3 = [0.25, 0, 0.75];
const DOG_C: V3 = [1.0, 0, 0.25];

type TagDef = {at: number; pos: V3; lines: string[]; w: number; color?: string; ink?: string; hang?: number};

/** tags hang from the given room point; pop frames on beats/words */
export const ROOM_TAGS = (): TagDef[] => [
  {at: 162, pos: [-1.15, 1.45, -0.75], lines: ['RENTED', '$4.99/night'], w: 1.05},
  {at: 170, pos: [1.8, 2.1, -1.45], lines: ['LICENSED', '$9.99/mo'], w: 0.95, color: '#BFF3FF', ink: '#0A3FD8'},
  {at: 178, pos: [1.75, 1.7, 0.2], lines: ['LOCKED', 'INK+ ONLY'], w: 0.95},
  {at: Math.round(W.buy) - 1, pos: [0.62, 1.25, -0.6], lines: ['PLUS', 'MEMBERS ONLY'], w: 0.85, color: '#FFE45C'},
  {at: Math.round(W.one2) - 1, pos: [-1.7, 1.55, -1.6], lines: ['TIME+', '$0.99/hr'], w: 0.85, color: '#C9FF9A', ink: '#0b5a12'},
  {at: 200, pos: [-1.6, 1.0, -0.3], lines: ['NAP PASS', '$2/nap'], w: 0.85, color: '#FFC6EA', ink: '#b0006a'},
];

export const ShotRoom: React.FC<P & {from: number}> = ({f, t, from}) => {
  const sf = f + from;
  const pull = ramp(sf, 161, 211, (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2));
  const camA: V3 = [0.42, 1.2, 2.55];
  const camB: V3 = [2.1, 4.1, 4.9];
  // arc: rise first then back
  const cam: V3 = add([lerp(camA[0], camB[0], pull), lerp(camA[1], camB[1], Math.pow(pull, 0.8)), lerp(camA[2], camB[2], pull)], shake(t, 0.006 * (1 - pull), 41));
  const target: V3 = mix3([0.35, 1.05, 0.6], [0.15, 0.55, -0.3], pull);
  const fov = lerp(42, 50, pull);
  const shrug = Math.sin(Math.PI * ramp(sf, W.hard - 6, W.hard + 18, (x) => x));
  const look = ramp(sf, 166, 200);
  const shock = ramp(sf, W.thing - 2, W.thing + 6);
  const keysP = 0.55 - 0.15 * shrug;
  const pose: GuyPose = mergePose(guyHoldUp(keysP, t), {
    shrug: 0.5 * shrug, headTilt: 0.18 * shrug, torsoTwist: 0.08 * shrug,
    headYaw: 0.5 * Math.sin(look * Math.PI * 2.5) * look * (1 - shock), headPitch: -0.05,
    expression: 'happy', expression2: shock > 0 ? 'shock' : 'determined', expressionMix: Math.max(0.3 * look, shock),
    mouthOpen: Math.max(talk(sf, 10), 0.4 * shock), eyesX: 0.6 * Math.sin(look * Math.PI * 2.5) * (1 - shock), blink: guyBlink(t, 9),
    armL: {shoulderX: 0.1, shoulderZ: 0.95 * shrug + 0.2, elbow: 1.2 * shrug + 0.3, twist: 0.3, grip: 0.2},
  });
  const dogPose: PancakePose = {
    sit: 1, eyes: 'open', earPerk: 0.2, headPitch: 0.45, headYaw: -0.55 + 0.2 * Math.sin(t * 1.5), tailWag: t * 1.6, tailWagAmount: 0.5,
    blink: pancakeBlink(t, 7),
  };
  const yawTo = (p: V3) => Math.atan2(cam[0] - p[0], cam[2] - p[2]);
  const hideCeil = cam[1] > 2.45;
  const hammerTw = 0.5 + 0.5 * Math.sin(t * 5);
  return (
    <Stage background={C.night} env="night" fog={{color: '#0a1036', near: 9, far: 22}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <NightRoom frame={f} lamp={1} chair={false} hide={['outside']}
        lights={{key: {position: [0.9, 2.1, 2.2], intensity: 2.2, color: '#ffe2c4', distance: 4.5}}}
        hammerGlow={0.15}
        hideWalls={hideCeil ? ['front', 'right', 'ceiling'] : ['front', 'right']}>
        <Chair />
        <LockedFeeder t={t} />
        <Guy position={GUY_C} rotation={[0, 0.12, 0]} pose={pose} outlineScale={lerp(1, 1.6, pull)}
          rightHand={<Keys jingle={Math.sin(t * 9) * 0.6} rotation={[Math.PI / 2, 0, 0]} scale={1.7} />} />
        <Pancake position={DOG_C} rotation={[0, -0.45, 0]} pose={dogPose} outlineScale={lerp(1, 1.5, pull)} />
        {ROOM_TAGS().map((tg, i) => (
          <PriceTag key={i} position={tg.pos} rotation={[0, yawTo(tg.pos), 0]} lines={tg.lines} width={tg.w} color={tg.color} ink={tg.ink}
            pop={popIn(sf, tg.at, 9)} swing={Math.max(0, (sf - tg.at) / 30)} string={0.6} />
        ))}
        {/* RENTED sticker slaps onto his own hoodie on "thing" */}
        <Sticker text="RENTED" size={0.46} pop={popIn(sf, W.thing - 1, 7)} spin={-0.2}
          position={add(GUY_C, rotY([0.06, 1.13, 0.2], 0.12))} rotation={[0, 0.12, 0]} />
        {/* the diorama floats over a neon grid in space once the walls fall away */}
        {pull > 0.02 ? (
          <>
            <WireGrid position={[0, -0.06, 0]} size={60} cell={1} color="#3a7bff" glow={1.3 * pull} fill="#050A2A" fadeNear={3} fadeFar={26} />
            <Starfield shell={40} count={700} time={t} size={0.12} intensity={1.4 * pull} />
          </>
        ) : null}
        {/* grandpa's hammer: the one thing with no tag */}
        <Sparkle position={[S.hammerHook[0] + 0.08, S.hammerHook[1] + 0.05, S.hammerHook[2] + 0.12]} size={0.25 * hammerTw * pull} time={t} intensity={2} color="#ffe9a8" />
      </NightRoom>
    </Stage>
  );
};

