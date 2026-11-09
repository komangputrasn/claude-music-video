// [43] "and Pancake eats breakfast from a bowl on the ground." — the heart of the video: the plain bowl, on the lawn, at sunrise.
// Same lawn spot where Chorus1 had the locked feeder (liberation mirror).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {CameraRig} from '../../../lib/three';
import {SparkleField, Glow, Confetti} from '../../../lib/three/fx';
import {Guy, guyJointMatrix, keyPoses, guyBlink, guyPatDog, mergePose} from '../../../lib/characters/Guy';
import type {GuyPose} from '../../../lib/characters/Guy';
import {Pancake, PANCAKE, pancakeEat, pancakeHappy, pancakeWalk, mixPose as mixDog, pancakeBlink} from '../../../lib/characters/Pancake';
import {DogBowl, glossMat} from '../../../lib/props';
import {InkMesh} from '../../../lib/characters/InkMesh';
import {hillsHeight} from '../../../lib/sets/Exterior';
import {lerp, clamp01, popIn} from '../../../lib/time';
import {World} from '../World';
import {K, beatL, songT} from '../timing';
import {ShotProps, mix3, smooth, easeOut, easeIn, hit, sunVec, V3} from '../common';

/** the bowl spot on the lawn (Chorus1's locked-feeder spot) */
export const FP: V3 = [-2.4, hillsHeight(-2.4, 13.4), 13.4];
const DOG_YAW = 0.25;
/** world position of something in Pancake's group frame */
const dogWorld = (p: V3): V3 => {
  const c = Math.cos(DOG_YAW), s = Math.sin(DOG_YAW);
  return [FP[0] + p[0] * c + p[2] * s, FP[1] + p[1], FP[2] - p[0] * s + p[2] * c];
};
export const BOWL_W = dogWorld([PANCAKE.bowl[0], 0, PANCAKE.bowl[2]]);

// ------------------------------------------------------------------ the Guy sets the bowl down
const GUY_SET: V3 = [BOWL_W[0] + 0.95, FP[1], BOWL_W[2] + 0.25];
const GUY_SET_YAW = -Math.PI / 2 - 0.15;
const STAND: GuyPose = {
  torsoBend: 0.1, headPitch: 0.3,
  armR: {shoulderX: 0.7, shoulderZ: 0.1, shoulderY: 0.2, elbow: 0.9, twist: 0.2, wrist: 0, wristZ: 0, grip: 0.8},
  armL: {shoulderX: 0.6, shoulderZ: 0.15, shoulderY: 0.3, elbow: 1.1, twist: 0.3, grip: 0.5},
  legL: {hipX: 0.05, knee: 0.08}, legR: {hipX: 0.05, knee: 0.08},
};
const CROUCH: GuyPose = {
  torsoBend: 0.55, lean: 0.12, headPitch: 0.5,
  armR: {shoulderX: 1.05, shoulderZ: 0.05, shoulderY: 0.1, elbow: 0.35, twist: 0.2, wrist: 0, wristZ: 0.2, grip: 0.7},
  armL: {shoulderX: 0.7, shoulderZ: 0.2, shoulderY: 0.4, elbow: 1.2, twist: 0.3, grip: 0.5},
  legL: {hipX: 1.35, hipZ: 0.18, knee: 2.15}, legR: {hipX: 0.55, hipZ: 0.12, knee: 2.2},
};
const setPose = (p: number, t: number): GuyPose => ({
  ...keyPoses(p, [[0, STAND], [1, CROUCH]]),
  t,
  expression: 'happy',
  mouthOpen: 0.15,
  blink: guyBlink(t, 9),
});
const SET_AT = Math.round(K.pancake) - 2; // bowl touches the grass

const Heart: React.FC<{s: number} & React.ComponentProps<'group'>> = ({s, ...g}) => {
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.5);
    sh.bezierCurveTo(-0.15, -0.3, -0.62, -0.05, -0.55, 0.25);
    sh.bezierCurveTo(-0.48, 0.55, -0.1, 0.6, 0, 0.3);
    sh.bezierCurveTo(0.1, 0.6, 0.48, 0.55, 0.55, 0.25);
    sh.bezierCurveTo(0.62, -0.05, 0.15, -0.3, 0, -0.5);
    const e = new THREE.ExtrudeGeometry(sh, {depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3, curveSegments: 10});
    e.translate(0, 0, -0.09);
    e.computeVertexNormals();
    return e;
  }, []);
  if (s <= 0.001) return null;
  return (
    <group {...g} scale={s}>
      <InkMesh geometry={geo} material={glossMat('#FF3F8E', {spec: 0.7, edge: 0.96, rim: 0.4, rimColor: '#ffd0e8'})} outline={0.04} />
    </group>
  );
};

/** L (639-671): low on the grass — his hand sets the PANCAKE bowl down; Pancake bounds in on "Pancake". */
export const BowlDown: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const st = songT(lf);
  const p = smooth((lf - (SET_AT - 18)) / 18);
  const pose = setPose(p, st);
  // the bowl hangs from his right hand until it lands, then stays on the grass
  const m = guyJointMatrix(pose, 'gripR', {R: true});
  const hand = new THREE.Vector3(0.0, -0.05, 0.02).applyMatrix4(m).applyAxisAngle(new THREE.Vector3(0, 1, 0), GUY_SET_YAW);
  const handW: V3 = [hand.x + GUY_SET[0], hand.y + GUY_SET[1], hand.z + GUY_SET[2]];
  const land = clamp01((lf - SET_AT) / 1);
  const bowlPos: V3 = land >= 1 ? BOWL_W : [lerp(handW[0], BOWL_W[0], p), Math.max(FP[1], handW[1] - 0.09), lerp(handW[2], BOWL_W[2], p)];
  const bounce = hit(lf, SET_AT, 3);
  // Pancake runs in from the left on "Pancake"
  const run = clamp01((lf - (K.pancake - 6)) / 18);
  const from: V3 = [-1.6, 0, 0.6];
  const dogLocal: V3 = mix3(from, [0, 0, 0], easeOut(run));
  const dogPose = run < 1
    ? mixDog(pancakeHappy(st, 2, true), {...pancakeWalk(st, 1.4, 2), eyes: 'happy', tongue: 0.9, mouthOpen: 0.6, earPerk: 0.8, tailWag: st * 6, tailWagAmount: 1}, 1 - run)
    : {...pancakeHappy(st, 2, false), headPitch: -0.2};
  const b = beatL(lf);
  const cam: V3 = [BOWL_W[0] + lerp(0.35, 0.2, smooth(f / 32)), FP[1] + 0.22, BOWL_W[2] + lerp(1.55, 1.3, smooth(f / 32))];
  return (
    <>
      <CameraRig position={cam} target={[BOWL_W[0] - 0.05, FP[1] + 0.32, BOWL_W[2] - 0.4]} fov={50 - b.pulse} roll={0.02} />
      <World lf={lf} flare={0} skyGlow={0.7} sunDir={sunVec(0.1, -0.8)} deco={null} />
      <group position={GUY_SET} rotation={[0, GUY_SET_YAW, 0]}>
        <Guy pose={pose} />
      </group>
      <DogBowl position={bowlPos} rotation={[0, DOG_YAW, 0]} fill={1} scale={[1 + 0.12 * bounce, 1 - 0.12 * bounce, 1 + 0.12 * bounce]} />
      <group position={FP} rotation={[0, DOG_YAW, 0]}>
        <Pancake position={dogLocal} rotation={[0, (1 - run) * 1.0, 0]} pose={dogPose} />
      </group>
      <group position={[BOWL_W[0], FP[1] + 0.12, BOWL_W[2]]}>
        <SparkleField count={14} seed={61} area={[0.6, 0.3, 0.6]} time={t} size={0.08} intensity={3 * hit(lf, SET_AT, 10)} />
      </group>
      <pointLight position={[cam[0] + 0.3, FP[1] + 1.0, cam[2]]} color="#ffd9b0" intensity={1.6} distance={4} decay={1.4} />
    </>
  );
};

/** M (671-737): THE hero shot — low and close and golden: Pancake eating from his own bowl, tail going, hearts popping. */
export const Eat: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const st = songT(lf);
  const k = smooth(f / 66);
  const startEat = clamp01((lf - (K.eats - 5)) / 6);
  const pose = {
    ...mixDog({...pancakeHappy(st, 2, false), headPitch: -0.1}, pancakeEat(st, 3), startEat),
    tailWag: st * 4.2,
    tailWagAmount: 1,
    blush: 1,
  };
  // a pause to look up at the lens on "bowl", then back in
  const look = clamp01((lf - (K.bowl - 4)) / 4) * (1 - clamp01((lf - (K.bowl + 12)) / 5));
  const pose2 = look > 0 ? mixDog(pose, {...pancakeHappy(st, 2, false), tongue: 1, mouthOpen: 0.5, headPitch: 0.15, eyes: 'happy', tailWag: st * 5}, look) : pose;
  const ang = lerp(0.42, 0.18, k);
  const r = lerp(1.3, 1.0, k);
  const tgtL: V3 = [0, lerp(0.27, 0.42, look), 0.3];
  const tgt = dogWorld(tgtL);
  const camL: V3 = [Math.sin(ang) * r, lerp(0.26, 0.3, k) + 0.04 * look, 0.3 + Math.cos(ang) * r + 0.15 * look];
  const cam = dogWorld(camL);
  const fill = 1 - 0.55 * clamp01((lf - K.eats) / 90);
  const hearts = [K.breakfast - 2, K.from + 6, K.bowl + 6];
  const b = beatL(lf);
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={40 - b.pulse * 0.8} roll={-0.03} />
      <World lf={lf} flare={0} skyGlow={0.8} sunDir={sunVec(0.09, 0.05 - DOG_YAW)} deco={null} />
      <group position={FP} rotation={[0, DOG_YAW, 0]}>
        <Pancake pose={pose2} />
        <DogBowl position={PANCAKE.bowl} fill={fill} />
        {hearts.map((h, i) => {
          const a = lf - h;
          if (a < 0 || a > 40) return null;
          const s = popIn(lf, h, 10) * 0.06 * (1 - clamp01((a - 30) / 10));
          return <Heart key={i} s={s} position={[(i - 1) * 0.16 + 0.08, 0.5 + a * 0.008, 0.35]} rotation={[0, Math.sin(a * 0.2) * 0.4, (i - 1) * 0.2]} />;
        })}
        {/* warm back-rim from the sunrise + sparkle dust */}
        <Glow position={[0, 0.45, -0.6]} size={1.6} color="#ffcf7a" intensity={0.5} />
        <SparkleField count={22} seed={63} area={[1.4, 0.8, 1.0]} time={t} position={[0, 0.5, 0]} size={0.06} intensity={1.6} />
      </group>
      <pointLight position={[cam[0], FP[1] + 0.9, cam[2]]} color="#ffd9b0" intensity={1.6} distance={3} decay={1.4} />
    </>
  );
};

/** N (737-770): straight-down crane up — the little dog eating from a plain bowl on a huge green ground; the Guy pats him. */
export const Ground: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const st = songT(lf);
  const up = easeIn(clamp01((lf - (K.ground - 16)) / 30)) * 0.75 + smooth(f / 33) * 0.25;
  const h = lerp(2.3, 8, up);
  const c = dogWorld([0, 0, 0.15]);
  const cam: V3 = [c[0] + 0.05, FP[1] + h, c[2] + 0.35 + h * 0.18];
  const pat = mergePose(guyPatDog(st), {});
  const pose = {...pancakeEat(st, 3), tailWag: st * 4.2, tailWagAmount: 1};
  return (
    <>
      <CameraRig position={cam} target={[c[0], FP[1], c[2]]} fov={48} roll={lerp(0.35, 0.1, up)} />
      <World lf={lf} flare={0} deco={null} />
      <group position={FP} rotation={[0, DOG_YAW, 0]}>
        <Pancake pose={pose} />
        <DogBowl position={PANCAKE.bowl} fill={0.4} />
        <group position={[0.62, 0, -0.05]} rotation={[0, -Math.PI / 2, 0]}>
          <Guy pose={pat} />
        </group>
        <Confetti mode="fall" time={t} area={[5, 3, 5]} count={160} position={[0, 0, 0]} size={1.2} />
      </group>
    </>
  );
};

void easeIn;
