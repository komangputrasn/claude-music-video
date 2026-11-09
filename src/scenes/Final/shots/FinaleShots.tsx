// [44]–[45] "I'm done with 'upgrade to continue,' click to cancel, I cancelled you." — the hang-up, pop-up fireworks,
// the giant click that finally lands, the celebration, and the crane up into the sunrise on the held "you".
import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill} from 'remotion';
import {CameraRig} from '../../../lib/three';
import {SparkleField, Confetti, Sunburst, Glow, LensFlare} from '../../../lib/three/fx';
import {Guy, guyHoldUp, guyJointMatrix, guyCheer, mergePose, mixPose as mixGuy, guyBlink} from '../../../lib/characters/Guy';
import type {GuyPose} from '../../../lib/characters/Guy';
import {Pancake, pancakeHappy, pancakeIdle, pancakeBlink} from '../../../lib/characters/Pancake';
import {FlipPhone} from '../../../lib/props';
import {Cursor3D, clickAt, popupButton3D, Starburst} from '../../../lib/ui';
import type {DialogSpec} from '../../../lib/ui';
import {lerp, clamp01, noise1, popIn} from '../../../lib/time';
import {CutEffect} from '../../../overlays/CutFlash';
import {Hit} from '../Hit';
import {World, sunAt} from '../World';
import {Performer} from '../Performer';
import {ShatterPopup} from '../Shatter';
import {K, beatL, lipSync, songT, snapBeat, DUR} from '../timing';
import {ShotProps, mix3, smooth, easeOut, easeIn, hit, sunVec, V3} from '../common';
import {G0} from './BookShots';
import {hillsHeight} from '../../../lib/sets/Exterior';
import {UPGRADE, SURE, PLUS, CONT} from './DoneShots';

const fromSpot = (o: V3, yaw: number) => (p: V3): V3 => {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [o[0] + p[0] * c + p[2] * s, o[1] + p[1], o[2] - p[0] * s + p[2] * c];
};
const fromG0 = (yaw: number) => fromSpot(G0, yaw);
/** P/Q spot: on the lawn just outside the front gate, so the yard tree is off to the side of the view of the house */
const GP: V3 = [-3.0, hillsHeight(-3.0, 15.4), 15.4];
const HD = new THREE.Vector3(0.6 - GP[0], 0, -GP[2]).normalize();
/** yaw that turns the Guy (local +Z) from GP toward the house */
const YAW_HOUSE = Math.atan2(HD.x, HD.z);
const H = fromSpot(GP, YAW_HOUSE);

// ------------------------------------------------------------------ O
const SHUT = Math.round(K.done2);
const O_YAW = -0.35;
const OW = fromG0(O_YAW);
/** camera-facing tilt of the phone in Guy-local space (screen toward the lens at his right-front) */
const PHONE_ROT: [number, number, number] = [-0.22, -0.42, 0.06];

/** O (770-818): he holds the flip phone out to us (OMNISTORE: CANCEL ALL? > YES): "I'm done" — and SNAPS it shut on "done". */
export const HangUp: React.FC<ShotProps> = ({f, lf}) => {
  const st = songT(lf);
  const b = beatL(lf);
  const shut = clamp01((lf - (SHUT - 1)) / 3);
  const show = smooth((lf - (SHUT + 1)) / 8);
  const hp = lerp(0, 0.06, smooth((lf - 772) / 24)) + 0.18 * show;
  const pose = mergePose(guyHoldUp(hp, st), {
    expression: show > 0.2 ? 'happy' : 'determined',
    expression2: undefined,
    expressionMix: 0,
    mouthOpen: lipSync(st),
    headTilt: 0.06 + 0.06 * show,
    headPitch: 0.06 - 0.06 * show + 0.04 * b.pulse,
    headYaw: -0.22,
    eyesX: -0.35,
    blink: guyBlink(st, 2),
  });
  // the phone rides the right fist but is oriented by hand so its screen always reads to camera
  const grip = new THREE.Vector3().setFromMatrixPosition(guyJointMatrix(pose, 'gripR', {R: true}));
  const snap = hit(lf, SHUT + 1, 3);
  const k = smooth(f / 48);
  const cam = OW([lerp(-0.6, -0.5, k), lerp(1.48, 1.45, k), lerp(1.55, 1.25, k)]);
  const kick = hit(lf, SHUT, 4);
  return (
    <>
      <CameraRig position={cam} target={OW([-0.14, 1.3, 0])} fov={42 - 3 * kick} roll={0.04 + 0.02 * kick * noise1(lf * 4, 2)} />
      <World lf={lf} flare={0} skyGlow={0.6} deco={null} sunDir={sunVec(0.12, -1.3)} />
      <group position={G0} rotation={[0, O_YAW, 0]}>
        <Guy pose={pose} />
        <group position={[grip.x - 0.05, grip.y + 0.04, grip.z + 0.04]} rotation={[PHONE_ROT[0] + 0.15 * snap, PHONE_ROT[1], PHONE_ROT[2]]} scale={1.45}>
          <FlipPhone open={1 - shut} screenLines={['OMNISTORE', 'CANCEL ALL?', '> YES']} screenColor="#8FD3FF" extText={shut > 0.5 ? 'BYE!' : 'CANCEL'} />
        </group>
        <SparkleField count={14} seed={333} area={[0.5, 0.5, 0.2]} time={lf / 30} position={[grip.x, grip.y + 0.2, grip.z + 0.1]} size={0.08}
          intensity={3 * hit(lf, SHUT, 10)} />
      </group>
      <pointLight position={OW([0.6, 2.6, 1.6])} color="#ffe2c4" intensity={1.3} distance={5} decay={1.4} />
    </>
  );
};
export const HangUpOver: React.FC<ShotProps> = ({lf}) => {
  const a = lf < SHUT ? 0 : popIn(lf, SHUT, 6) * (1 - clamp01((lf - SHUT - 13) / 4));
  return (
    <>
      {a > 0.01 ? <Starburst text="CLICK!" x={560} y={300} size={300} scale={a} rotation={lf * 0.6} textRotation={-10} /> : null}
      <Hit k={lf - SHUT} tint="#FFF6E0" streak="#FFD24A" seed={331} strength={0.22} />
    </>
  );
};

// ------------------------------------------------------------------ P
const FW: {spec: DialogSpec; beat: number; pos: V3; tilt: number}[] = [
  {spec: UPGRADE, beat: snapBeat(818), pos: [1.0, 8.6, 12], tilt: 0.1},
  {spec: SURE, beat: snapBeat(834), pos: [-4.2, 10.0, 13], tilt: -0.12},
  {spec: PLUS, beat: snapBeat(850), pos: [5.6, 10.8, 13], tilt: 0.08},
  {spec: CONT, beat: snapBeat(866), pos: [-0.4, 11.6, 12], tilt: -0.06},
];
const P_DOG: V3 = [-0.85, 0, 0.55];

/** P (818-878): pop-up FIREWORKS — the upsell dialogs rocket up over the free house and burst on the beats; the two watch. */
export const Fireworks: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const st = songT(lf);
  const b = beatL(lf);
  const k = smooth(f / 60);
  const cam = H([lerp(-1.3, -1.15, k), lerp(0.36, 0.42, k), lerp(-2.7, -2.4, k)]);
  const tgt = H([lerp(0.3, 0.5, k), lerp(3.2, 3.6, k), 6]);
  // he throws his arms up at every burst
  const last = FW.map((x) => x.beat + 4).filter((x) => lf >= x).pop();
  const cheerK = last !== undefined ? Math.exp(-(lf - last) / 14) : 0;
  const watch: GuyPose = {
    ...guyCheer(st),
    hipsY: 0,
    armL: {shoulderX: 0.25, shoulderZ: 0.35, elbow: 0.5},
    armR: {shoulderX: 0.25, shoulderZ: 0.35, elbow: 0.5},
    legL: {hipZ: 0.12}, legR: {hipZ: 0.12},
    headPitch: -0.45, headYaw: 0.15,
    expression: 'happy',
  };
  const pose = mixGuy(watch, {...guyCheer(st), headPitch: -0.5, headYaw: 0.15} as GuyPose, Math.min(1, cheerK * 1.4));
  const dog = {...pancakeIdle(st, 3), sit: 1, headPitch: 0.6, headYaw: 0.2, earPerk: 0.6 + 0.4 * cheerK, tailWag: st * 4, tailWagAmount: 1,
    mouthOpen: 0.3 * cheerK, blink: pancakeBlink(st, 5)};
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={60 - 2 * b.pulse} roll={-0.04} />
      <World lf={lf} flare={0.2} skyGlow={0.55} deco={null} sunDir={sunVec(0.12, -1.35)} />
      <group position={GP} rotation={[0, YAW_HOUSE, 0]}>
        <Guy pose={{...pose, blink: 0}} />
        <Pancake position={P_DOG} rotation={[0, 0.2, 0]} pose={dog} />
        {FW.map((w, i) => {
          const launch = w.beat - 15;
          if (lf < launch || lf > w.beat + 40) return null;
          const rise = easeOut((lf - launch) / 11);
          const p: V3 = [w.pos[0], lerp(-2, w.pos[1], rise), w.pos[2]];
          return (
            <group key={i}>
              <ShatterPopup spec={w.spec} width={6.4} f={lf} stampAt={w.beat - 5} shatterAt={w.beat + 4} seed={`fw${i}`} position={p}
                rotation={[-0.2, Math.PI, w.tilt]} power={1.5} stampWidth={3.2}
                sheen={lerp(-0.2, 1.2, clamp01((lf - w.beat + 10) / 12))} />
              {lf < w.beat - 4 ? <Glow position={[p[0], p[1] - 2.2, p[2]]} size={2.6} color="#ffd27a" intensity={1.4 * (1 - rise * 0.5)} /> : null}
            </group>
          );
        })}
        <SparkleField count={50} seed={91} area={[16, 6, 6]} time={t} position={[0, 9, 13]} size={0.45} intensity={1.6} />
      </group>
      <pointLight position={[cam[0], GP[1] + 2, cam[2]]} color="#ffe2c4" intensity={1.6} distance={6} decay={1.4} />
    </>
  );
};
export const FireworksOver: React.FC<ShotProps> = ({lf}) => (
  <>
    {FW.map((w, i) => (
      <Hit key={i} k={lf - (w.beat + 4)} tint="#FFF6E0" streak="#FFD24A" seed={340 + i} strength={0.22} />
    ))}
  </>
);

// ------------------------------------------------------------------ Q
const FINAL_DLG: DialogSpec = {
  kind: 'question', title: 'OmniStore', heading: 'Cancel EVERYTHING?', message: 'All plans, tiers, passes & memberships.', buttons: ['Keep Paying', 'CANCEL'],
  defaultButton: 1, aquaButton: 1, aquaColor: 'red', width: 470,
};
const DLG_W = 10;
/** dialog hangs in the sky ahead of him (Guy-local, facing back at him, tipped down toward him) */
const DLG_L: V3 = [1.4, 8.4, 10];
const DLG_TILT = 0.3;
const DLG_POS = H(DLG_L);
const DLG_M = new THREE.Matrix4().compose(
  new THREE.Vector3(...DLG_POS),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(DLG_TILT, YAW_HOUSE + Math.PI, 0, 'YXZ')),
  new THREE.Vector3(1, 1, 1),
);
const D = (p: V3): V3 => {
  const v = new THREE.Vector3(...p).applyMatrix4(DLG_M);
  return [v.x, v.y, v.z];
};
const BTN = popupButton3D(FINAL_DLG, 1, DLG_W);
const CLICK = Math.round(K.cancel2);
const BOOM = CLICK + 3;
const CUT_Q2 = 912;

/** cursor tip in dialog-local space */
const cursorAt = (lf: number): V3 => {
  const hover: V3 = [BTN[0] + 1.5, BTN[1] + 1.1, BTN[2] + 1.6];
  const press: V3 = [BTN[0] + 0.1, BTN[1] - 0.05, BTN[2] + 0.12];
  let p = mix3([BTN[0] + 16, BTN[1] + 9, BTN[2] + 6], hover, easeOut((lf - (K.click2 - 2)) / 18));
  const circle = clamp01((lf - K.click2 - 14) / 8) * (1 - clamp01((lf - (CLICK - 9)) / 3));
  p = [p[0] + 0.35 * Math.sin(lf * 0.21) * circle, p[1] + 0.25 * Math.cos(lf * 0.17) * circle, p[2]];
  if (lf >= CLICK - 6) p = mix3(p, press, easeIn((lf - (CLICK - 6)) / 6));
  return p;
};

/** Q (878-947): a giant "Cancel EVERYTHING?" over the hills; a giant cursor glides in on "click" — and the click LANDS on
 *  "cancel": the dialog bursts into sparkles, confetti and a white flash. */
export const GiantClick: React.FC<ShotProps> = ({lf}) => {
  const t = lf / 30;
  const b = beatL(lf);
  const wide = lf < CUT_Q2;
  const cur = cursorAt(lf);
  let cam: V3, tgt: V3, fov: number;
  if (wide) {
    // worm's eye behind his right shoulder: his pointing arm, the dialog filling the sky
    const k = smooth((lf - 878) / 34);
    cam = H([lerp(-1.1, -0.95, k), lerp(0.8, 0.75, k), lerp(-1.5, -1.25, k)]);
    tgt = H([lerp(0.6, 0.9, k), lerp(5.6, 6.2, k), 9]);
    fov = 58 - b.pulse;
  } else {
    // up in the sky with the button: push in toward the click
    const kk = smooth((lf - CUT_Q2) / 22);
    cam = D([BTN[0] + lerp(2.6, 1.7, kk), BTN[1] + lerp(0.6, 0.25, kk), BTN[2] + lerp(6.2, 4.4, kk)]);
    tgt = D([BTN[0] - 0.7, BTN[1] + 0.35, BTN[2]]);
    fov = 46 - 5 * hit(lf, CLICK, 5) - b.pulse;
  }
  const shake = hit(lf, BOOM, 4) * 0.12;
  const pointK = clamp01((lf - (K.click2 - 2)) / 6);
  const aim = DLG_L.map((v, i) => v + (i === 1 ? -1.2 : 0)) as V3;
  const press = hit(lf, CLICK, 3);
  return (
    <>
      <CameraRig position={[cam[0] + shake * noise1(lf * 3, 1), cam[1] + shake * noise1(lf * 3, 2), cam[2]]} target={tgt} fov={fov} roll={wide ? -0.07 : 0.05} />
      <World lf={lf} flare={0.25} skyGlow={0.55} deco={null} sunDir={sunVec(0.12, -1.35)} />
      <group position={GP} rotation={[0, YAW_HOUSE, 0]}>
        <Performer lf={lf} gesture={pointK > 0 ? 'pointHigh' : 'sing'} from="sing" mix={pointK} aim={aim} expression="determined" extra={{headPitch: -0.45}} />
      </group>
      <group position={DLG_POS} rotation={[0, YAW_HOUSE + Math.PI, 0]}>
        <group rotation={[DLG_TILT, 0, 0]}>
          <group position={[0, 0, -0.25 * press]} scale={[1 + 0.02 * press, 1 - 0.02 * press, 1]}>
            <ShatterPopup spec={FINAL_DLG} width={DLG_W} f={lf} stampAt={99999} shatterAt={BOOM} seed="final" pr={3} stamp={false}
              power={1.3} dur={40} sheen={lerp(-0.2, 1.2, clamp01((lf - 884) / 16))} />
          </group>
          {lf < BOOM + 3 ? <Cursor3D kind="hand" size={2.2} position={cur} rotation={[-0.1, -0.15, 0.06]} click={clickAt(lf, CLICK, 12)} /> : null}
          <SparkleField count={90} seed={95} area={[18, 12, 5]} time={t} size={0.8} intensity={4 * hit(lf, BOOM, 18)} />
          {lf >= BOOM ? (
            <>
              <Confetti progress={clamp01((lf - BOOM) / 70)} count={360} power={3.2} spread={1.6} size={2.2} duration={2.4} seed={96} stars={0.25} />
              <Glow size={16 * (0.3 + hit(lf, BOOM, 6))} color="#fff6dd" intensity={1.4 * hit(lf, BOOM, 6)} />
            </>
          ) : null}
        </group>
      </group>
      <pointLight position={[cam[0], GP[1] + 2, cam[2]]} color="#ffe2c4" intensity={1.8} distance={6} decay={1.4} />
    </>
  );
};
export const GiantClickOver: React.FC<ShotProps> = ({lf}) => {
  const white = lf < BOOM ? 0 : Math.max(0, 1 - Math.abs(lf - (BOOM + 6)) / 11) * 0.95;
  return (
    <>
      <Hit k={lf - CUT_Q2} tint="#FFFFFF" streak="#FFD24A" seed={351} strength={0.3} />
      <CutEffect style="flash" k={lf - BOOM} tint="#FFFFFF" streak="#FFD24A" seed={352} strength={1} />
      {white > 0 ? <AbsoluteFill style={{background: 'radial-gradient(circle at 55% 45%, #ffffff 0%, #fff6dd 55%, #ffd2ea 100%)', opacity: white}} /> : null}
    </>
  );
};

// ------------------------------------------------------------------ R
const JUMP = Math.round(K.cancelled2) - 5;
const C_R: V3 = [G0[0] - 0.4, G0[1], G0[2] + 0.2];
/** a ballistic hop 0..1..0 over `dur` frames */
const arc = (lf: number, at: number, dur: number) => {
  const u = (lf - at) / dur;
  return u <= 0 || u >= 1 ? 0 : 4 * u * (1 - u);
};

/** R (947-1017): out of the white: the celebration — cheering, Pancake hopping, confetti rain; a big jump on "cancelled". */
export const Celebrate: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const st = songT(lf);
  const b = beatL(lf);
  const k = smooth(f / 70);
  const ang = lerp(0.55, -0.2, k);
  const r = lerp(3.3, 2.8, k);
  const cam: V3 = [C_R[0] + Math.sin(ang) * r, C_R[1] + lerp(0.7, 0.8, k), C_R[2] + Math.cos(ang) * r];
  const jump = arc(lf, JUMP, 16);
  const tuck = Math.min(1, jump * 1.6);
  const cheer = guyCheer(st);
  const pose = mergePose(cheer, {
    mouthOpen: Math.max(lipSync(st), 0.35),
    expression: 'happy',
    legL: {...cheer.legL, hipX: lerp(cheer.legL?.hipX ?? 0, 0.9, tuck), knee: lerp(cheer.legL?.knee ?? 0, 1.6, tuck)},
    legR: {...cheer.legR, hipX: lerp(cheer.legR?.hipX ?? 0, 0.5, tuck), knee: lerp(cheer.legR?.knee ?? 0, 1.2, tuck)},
    ground: 1 - tuck,
  });
  const dhop = arc(lf, JUMP + 2, 13);
  const dog = {...pancakeHappy(st, 7, true), ...(dhop > 0 ? {hop: dhop * 0.5, bodySquash: -0.3 * dhop} : {})};
  return (
    <>
      <CameraRig position={cam} target={[C_R[0], C_R[1] + 1.15 + 0.25 * jump, C_R[2]]} fov={50 - 2 * b.pulse} roll={0.05 * Math.sin(t * 1.5)} />
      <World lf={lf} flare={0.3} skyGlow={0.65} deco={null} sunDir={sunVec(0.13, -1.4)} />
      <Sunburst position={[C_R[0] - 4, 5, C_R[2] - 30]} radius={40} rays={22} rotation2d={t * 0.35} opacity={0.12} colorA="#fff1c0" colorB="#ff9ad0" glow={0.04} additive />
      <group position={[G0[0], G0[1] + 0.75 * jump, G0[2]]}>
        <Guy pose={pose} shadow={jump < 0.1} />
      </group>
      <Pancake position={[G0[0] - 0.85, G0[1], G0[2] + 0.4]} rotation={[0, 0.35, 0]} pose={dog} />
      <group position={C_R}>
        <Confetti mode="fall" time={t} area={[6, 5, 4]} count={360} size={0.8} position={[0, 0, -0.9]} />
        <Confetti progress={clamp01((lf - JUMP - 5) / 60)} count={200} power={2} spread={1.2} size={0.55} duration={2.2} seed={98} stars={0.3} position={[0.3, 2.4, -0.8]} />
        <SparkleField count={40} seed={97} area={[6, 4, 5]} time={t} position={[0, 2, 0]} size={0.18} intensity={2.2 * clamp01(f / 10)} />
      </group>
      <pointLight position={[cam[0], G0[1] + 2, cam[2]]} color="#ffe2c4" intensity={2.0} distance={6} decay={1.4} />
    </>
  );
};
export const CelebrateOver: React.FC<ShotProps> = ({lf}) => (
  <Hit k={Math.round(lf - K.cancelled2)} tint="#FFF6E0" streak="#FF9AD0" seed={361} strength={0.3} />
);

// ------------------------------------------------------------------ S
const S0 = 1017;
/** S (1017-1134): the held "you" — they wave, the camera cranes up and tilts into the sunrise; the flare blooms to warm white. */
export const CraneUp: React.FC<ShotProps> = ({lf}) => {
  const t = lf / 30;
  const st = songT(lf);
  const sun = sunAt(lf, 0.02);
  const C: V3 = [G0[0] - 0.4, G0[1], G0[2] + 0.2];
  // behind them (they face the sunrise), rising; the target stays on them, then tilts up into the sun
  const away = new THREE.Vector3(-sun[0], 0, -sun[2]).normalize();
  const side = new THREE.Vector3(-away.z, 0, away.x);
  const rise = smooth((lf - S0) / 80);
  const push = smooth((lf - S0 - 30) / 87);
  const dist = lerp(3.6, 7, rise) - 6 * push;
  const cam: V3 = [C[0] + away.x * dist + side.x * 1.2 * (1 - rise), C[1] + lerp(1.1, 8.5, rise), C[2] + away.z * dist + side.z * 1.2 * (1 - rise)];
  const tgtNear: V3 = [C[0], C[1] + lerp(1.1, 0.3, rise), C[2]];
  const tgtSun: V3 = [cam[0] + sun[0] * 60, cam[1] + sun[1] * 60 - 4, cam[2] + sun[2] * 60];
  const tilt = smooth((lf - 1060) / 40);
  const tgt = mix3(tgtNear, tgtSun, tilt);
  // they turn their backs to the sunrise and wave up at the rising camera
  const faceSun = Math.atan2(sun[0], sun[2]);
  const pose = mergePose(guyCheer(st), {mouthOpen: Math.max(lipSync(st), 0.3), expression: 'happy', headPitch: -0.3 - 0.3 * rise});
  const dog = {...pancakeHappy(st, 8, true), headPitch: 0.5};
  const bloom = smooth((lf - (K.youEnd2 - 14)) / 34);
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={lerp(50, 58, rise)} roll={lerp(0.04, -0.04, rise)} />
      <World lf={lf} flare={0.45 + 0.9 * bloom} skyGlow={0.7 + 0.5 * bloom} sunScale={1 + 0.6 * bloom} deco={null} sunDir={sun} />
      <group position={G0} rotation={[0, faceSun + Math.PI - 0.35, 0]}>
        <Guy pose={pose} />
      </group>
      <Pancake position={[G0[0] - 0.85, G0[1], G0[2] + 0.4]} rotation={[0, faceSun + Math.PI - 0.6, 0]} pose={dog} />
      <group position={C}>
        <Confetti mode="fall" time={t} area={[6, 6, 6]} count={260} size={1.1} />
      </group>
      <group position={[cam[0] + sun[0] * 60, cam[1] + sun[1] * 60, cam[2] + sun[2] * 60]}>
        <LensFlare intensity={0.2 + 0.7 * bloom} scale={1.1 + bloom} rotation={t * 0.3} color="#fff0c8" />
      </group>
    </>
  );
};
export const CraneUpOver: React.FC<ShotProps> = ({lf}) => {
  const w = clamp01((lf - (DUR - 24)) / 24);
  return w > 0 ? <AbsoluteFill style={{background: 'radial-gradient(circle at 45% 50%, #fffaf0 0%, #ffe6b8 60%, #ffc2dc 100%)', opacity: w * 0.72}} /> : null;
};
