// "and my dog's breakfast is locked in a box on the ground" — Pancake, the feeder, the exhibit pedestal, the crane-up.
import React from 'react';
import {CameraRig} from '../../../lib/three';
import {SparkleField, LightRays, Glow} from '../../../lib/three/fx';
import {Pancake, pancakeBeg, pancakeLie, pancakeSad, PANCAKE} from '../../../lib/characters/Pancake';
import {Feeder, glossMat} from '../../../lib/props';
import {lerp, clamp01} from '../../../lib/time';
import {C} from '../../../lib/palette';
import {CutEffect} from '../../../overlays/CutFlash';
import {World} from '../World';
import {PriceTag} from '../HouseDeco';
import {MarkerCircle, MarkerLabel} from '../Telestrator';
import {K, beatL} from '../timing';
import {ShotProps, decoAt, smooth, easeOut, V3} from './common';

const DONE = decoAt(9999, 0);
/** feeder + Pancake spot on the lawn (outside the picket fence, house behind) */
const FP: V3 = [-2.4, 0, 13.4];

const lockState = (lf: number) => {
  const clamp = clamp01((lf - (K.locked - 4)) / 4); // shackle snaps shut on "locked"
  const sinceLock = lf - K.locked;
  const shake = sinceLock < 0 ? 0 : Math.exp(-sinceLock / 9);
  return {open: 1 - clamp, shake};
};

/** S11 (636-702): Pancake begging beside the locked feeder on the grass; the padlock clamps shut on "locked". */
export const DogBeg: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const b = beatL(lf);
  const k = smooth(f / 66);
  const lock = lockState(lf);
  // looks at the feeder on "dog's breakfast", back up at us on "locked"
  const lookBox = clamp01((lf - (K.dogs - 4)) / 6) * (1 - clamp01((lf - (K.locked - 2)) / 5));
  const pose = {
    ...pancakeBeg(t),
    headYaw: 0.75 * lookBox,
    headPitch: lerp(0.34, 0.05, lookBox),
    tear: clamp01((lf - K.locked) / 14) * 0.8,
    earPerk: lf > K.locked ? -1 : -0.7,
    frown: lf > K.locked ? 0.8 : 0.3,
  };
  const lcd = lf < K.locked - 1 ? 'BREAKFAST:\nPLUS MEMBERS ONLY' : 'LOCKED\n$9.99/MO';
  const cam: V3 = [FP[0] + lerp(0.5, 0.3, k), lerp(0.6, 0.52, k), FP[2] + lerp(2.2, 1.6, k)];
  return (
    <>
      <CameraRig position={cam} target={[FP[0] + 0.04, 0.34, FP[2]]} fov={44 - b.pulse} roll={-0.03} />
      <World t={t} deco={{...DONE, t}} flare={0.4} />
      <group position={FP}>
        <Feeder position={[0.36, 0, -0.05]} rotation={[0, -0.32, 0]} lcdText={lcd} lcdColor={lf < K.locked - 1 ? '#9DFF5A' : '#FF5A4A'}
          lockOpen={lock.open} lockShake={lock.shake} time={t} />
        <Pancake position={[-0.3, 0, 0.12]} rotation={[0, 0.3, 0]} pose={pose} />
        {/* warm character key so his gold reads against the lawn */}
        {lf > K.locked - 2 ? <Glow position={[0.42, 0.22, 0.2]} size={0.3 * lock.shake + 0.05} color={C.alertRed} intensity={1.2 * lock.shake} /> : null}
      </group>
    </>
  );
};
export const DogBegOver: React.FC<ShotProps> = ({lf}) => (
  <CutEffect style="glitch" k={Math.round(lf - K.locked)} seed={181} strength={0.45} />
);

// ------------------------------------------------------------------ S12 pedestal
const PP: V3 = [-6.2, 0, 12.4];
const PED_H = 1.05;

const Pedestal: React.FC = () => {
  const white = glossMat('#d6dbee', {spec: 0.35, edge: 0.97, rim: 0.15});
  const gold = glossMat('#f2c14e', {spec: 0.7, edge: 0.96, rim: 0.3});
  return (
    <group>
      <mesh position={[0, 0.06, 0]} material={gold}>
        <cylinderGeometry args={[0.46, 0.5, 0.12, 24]} />
      </mesh>
      <mesh position={[0, PED_H / 2, 0]} material={white}>
        <cylinderGeometry args={[0.36, 0.38, PED_H - 0.16, 24]} />
      </mesh>
      <mesh position={[0, PED_H - 0.05, 0]} material={gold}>
        <cylinderGeometry args={[0.46, 0.42, 0.1, 24]} />
      </mesh>
    </group>
  );
};

const Stanchion: React.FC<{position: V3}> = ({position}) => {
  const gold = glossMat('#f2c14e', {spec: 0.7, edge: 0.96, rim: 0.3});
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} material={gold}>
        <cylinderGeometry args={[0.13, 0.15, 0.06, 16]} />
      </mesh>
      <mesh position={[0, 0.45, 0]} material={gold}>
        <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
      </mesh>
      <mesh position={[0, 0.92, 0]} material={gold}>
        <sphereGeometry args={[0.05, 12, 8]} />
      </mesh>
    </group>
  );
};

const Rope: React.FC<{a: V3; b: V3}> = ({a, b}) => {
  const pts = Array.from({length: 9}, (_, i) => {
    const u = i / 8;
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 0.18, lerp(a[2], b[2], u)] as V3;
  });
  const mat = glossMat('#b0102a', {spec: 0.4});
  return (
    <>
      {pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1];
        const mid: V3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
        const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
        const dir = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        const yaw = Math.atan2(dir[0], dir[2]);
        const pitch = Math.atan2(dir[1], Math.hypot(dir[0], dir[2]));
        return (
          <mesh key={i} position={mid} rotation={[Math.PI / 2 - pitch, yaw, 0, 'YXZ']} material={mat}>
            <cylinderGeometry args={[0.03, 0.03, len + 0.02, 6]} />
          </mesh>
        );
      })}
    </>
  );
};

/** S12 (702-735): "in a box" — the feeder as a museum exhibit on a pedestal under a spotlight, roped off; Pancake sits
 * behind the velvet rope gazing up at it. Low hero angle, slow arc; the spotlight flares on "box". */
export const DogPedestal: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = smooth(f / 33);
  const cam: V3 = [PP[0] + lerp(-0.05, -0.3, k), lerp(1.02, 0.95, k), PP[2] + lerp(2.95, 2.65, k)];
  const box = Math.max(0, 1 - Math.abs(lf - K.box) / 10);
  const shake = lf < K.box - 2 ? 0 : Math.exp(-(lf - K.box + 2) / 8);
  const dog = {...pancakeBeg(t), headPitch: 0.55, headYaw: 0.25, earPerk: -0.6, tailWagAmount: 0.2, eyes: 'puppy' as const, frown: 0.4};
  return (
    <>
      <CameraRig position={cam} target={[PP[0] - 0.3, 0.8, PP[2]]} fov={40 - 2 * box} roll={lerp(-0.04, 0.02, k)} />
      <World t={t} deco={{...DONE, t}} flare={0.3} lightIntensity={0.85} />
      <group position={PP}>
        <Pedestal />
        <Feeder position={[0, PED_H, 0]} scale={1.15} rotation={[0, -0.25 + Math.sin(t * 1.2) * 0.1, 0]} lcdText={'BREAKFAST\nPLUS ONLY'} lcdColor="#FF5A4A" lockOpen={0} lockShake={shake} time={t}
          kibbleFill={0.95} />
        <LightRays position={[0, 4.4, 0]} length={3.2} radius={0.7} count={12} color="#fff2c0" intensity={0.45 + 0.55 * box} time={t} haze={0.3} />
        <pointLight position={[-0.7, 0.9, 1.3]} color="#ffe8cc" intensity={0.8 + 0.6 * box} distance={3.2} decay={1.3} />
        {/* price card leaning on the plinth */}
        <PriceTag position={[0.5, 0.95, 0.3]} rotation={[0, -0.3, 0]} scale={0.18} swing={0.04 * Math.sin(t * 2)} />
        {/* velvet rope in front of the exhibit (below the box) */}
        <Stanchion position={[-0.55, 0, 0.6]} />
        <Stanchion position={[0.6, 0, 0.6]} />
        <Rope a={[-0.55, 0.88, 0.6]} b={[0.6, 0.88, 0.6]} />
        {/* Pancake outside the rope, in profile, gazing up at his breakfast */}
        <Pancake position={[-0.82, 0, -0.05]} rotation={[0, 1.1, 0]} pose={dog} />
        <SparkleField count={20} seed={66} area={[1.2, 0.8, 1.2]} time={t} position={[0, PED_H + 0.45, 0]} size={0.18} intensity={1.2 + 2.5 * box} />
      </group>
    </>
  );
};

// ------------------------------------------------------------------ S13 overhead crane
/** S13 (735-767): "on the ground" — top-down crane up: a tiny dog lying beside a tiny locked box on a huge green lawn,
 * annotated like a 2002 sports-broadcast telestrator (yellow marker circles drawn on the words, "THE GROUND" circled). */
export const DogOverhead: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const up = easeOut(f / 30);
  const h = lerp(1.2, 3.6, up);
  const cam: V3 = [FP[0] - 0.1, h, FP[2] + 0.5 + h * 0.3];
  const pose = {...pancakeLie(t), ...{earPerk: -1, eyes: 'puppy' as const, headYaw: -0.55, headPitch: 0.6, tailWagAmount: 0, frown: 0.7, tear: 0.7}};
  const g = Math.max(0, 1 - Math.abs(lf - K.ground) / 6);
  const draw = (at: number, dur = 7) => clamp01((lf - at) / dur);
  const onAt = K.ground - 18; // "on" (737.6) — first circle
  return (
    <>
      <CameraRig position={cam} target={[FP[0] + 0.0, 0.05, FP[2] - 0.15]} fov={44 + 4 * g} roll={lerp(0.28, 0.1, up)} />
      <World t={t} deco={{...DONE, t}} flare={0} />
      <group position={FP}>
        <Feeder position={[0.36, 0, -0.05]} rotation={[0, -0.32, 0]} lcdText="LOCKED" lcdColor="#FF5A4A" lockOpen={0} time={t} />
        <Pancake position={[-0.42, 0, 0.02]} rotation={[0, Math.PI * 0.5, 0]} pose={pose} />
        {/* telestrator */}
        <MarkerCircle position={[0.38, 0.03, -0.06]} radius={0.36} progress={draw(K.ground - 19)} />
        <MarkerLabel position={[1.15, 0.03, -0.7]} rotation={[0, -0.12, 0]} text="BREAKFAST" sub="(locked)" height={0.44} progress={draw(K.ground - 15, 6)} />
        <MarkerCircle position={[-0.32, 0.03, 0.05]} radius={0.44} squash={[0.9, 1.15]} progress={draw(K.ground - 9)} color="#FF6AD5" />
        <MarkerLabel position={[-1.25, 0.03, -0.62]} rotation={[0, 0.1, 0]} text="PANCAKE" sub="(hungry)" height={0.44} progress={draw(K.ground - 6, 6)} color="#FF6AD5" />
        {/* "the ground": an empty patch of lawn, circled and labelled */}
        <MarkerCircle position={[0.15, 0.03, -1.35]} radius={0.55} squash={[1.4, 0.75]} progress={draw(K.ground - 2, 6)} color="#7FF0FF" width={0.06} />
        <MarkerLabel position={[0.15, 0.03, -1.35]} rotation={[0, 0.04, 0]} text="THE GROUND" height={0.36} progress={draw(K.ground + 2, 5)} color="#7FF0FF" />
      </group>
    </>
  );
};

void pancakeSad;
void PANCAKE;
