// [42] "You said 'Buy now,' but I'm good for now," (second time) — bullet-time jump, then the two of them under the sign.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CameraRig} from '../../../lib/three';
import {SparkleField, Confetti, Sunburst} from '../../../lib/three/fx';
import {guyCheer, mergePose, Guy} from '../../../lib/characters/Guy';
import {Pancake, pancakeHappy, pancakeBlink} from '../../../lib/characters/Pancake';
import {lerp, clamp01, noise1} from '../../../lib/time';
import {Hit} from '../Hit';
import {World} from '../World';
import {Performer} from '../Performer';
import {MorphWord, morphLayout} from '../MorphWord';
import {K, beatL, songT} from '../timing';
import {ShotProps, smooth, easeOut, near, hit, sunVec, V3} from '../common';
import {G0} from './BookShots';

const PK: V3 = [G0[0] - 0.85, G0[1], G0[2] + 0.35];
/** Pancake's spot in the bullet-time jump (a bit more to the side so they never overlap) */
const PJ: V3 = [G0[0] - 1.15, G0[1], G0[2] + 0.55];

// ------------------------------------------------------------------ J
/** J (509-558): BULLET-TIME — Guy and Pancake frozen mid-leap in a cloud of confetti while the camera orbits 200 degrees. */
export const BulletTime: React.FC<ShotProps> = ({f, lf}) => {
  const slow = 509 / 30 + f * 0.0025; // nearly frozen clock
  const k = smooth(f / 49);
  const ang = lerp(-0.75, 1.25, k * 0.85 + (f / 49) * 0.15);
  const r = lerp(4.0, 3.5, Math.sin(k * Math.PI));
  const C: V3 = [G0[0] - 0.55, G0[1], G0[2] + 0.25];
  const cam: V3 = [C[0] + Math.sin(ang) * r, C[1] + lerp(0.9, 1.25, Math.sin(k * Math.PI)), C[2] + Math.cos(ang) * r];
  const air = 0.62;
  const guyPose = mergePose(guyCheer(0.42), {
    ground: 0,
    hipsY: 0,
    legL: {hipX: 1.0, hipZ: 0.12, knee: 1.7, ankle: 0.4},
    legR: {hipX: 0.35, hipZ: 0.1, knee: 1.1, ankle: 0.5},
    torsoBend: -0.15,
    headPitch: -0.3,
    expression: 'happy',
    mouthOpen: 0.75,
    blink: 0,
  });
  const dog = {...pancakeHappy(0.3, 2, false), hop: 0.45, bodySquash: -0.35, earPerk: 1, tongue: 1, mouthOpen: 0.8, tailWag: slow * 3, tailWagAmount: 1};
  return (
    <>
      <CameraRig position={cam} target={[C[0], C[1] + 1.25, C[2]]} fov={50} roll={0.06 * Math.sin(k * Math.PI)} />
      <World lf={lf} flare={0} skyGlow={0.7} deco={null} />
      <group position={[G0[0], G0[1] + air, G0[2]]}>
        <Guy pose={guyPose} shadow={false} />
      </group>
      <Pancake position={PJ} rotation={[0, 0.35, 0]} pose={dog} shadow={0.3} />
      <group position={[C[0], C[1], C[2]]}>
        <Confetti progress={0.3 + f * 0.0012} count={320} power={1.5} spread={1.4} size={1.0} duration={3} seed={77} stars={0.2} />
      </group>
      <SparkleField count={40} seed={78} area={[3.5, 2.4, 3.5]} time={slow} position={[C[0], C[1] + 1.4, C[2]]} size={0.14} intensity={2.2} />
      <pointLight position={[cam[0], G0[1] + 2.2, cam[2]]} color="#ffe2c4" intensity={2.0} distance={6} decay={1.4} />
    </>
  );
};
export const BulletTimeOver: React.FC<ShotProps> = ({f}) => {
  const bar = 92 * easeOut(f / 6) * (1 - clamp01((f - 44) / 5));
  return (
    <>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: '#000'}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: '#000'}} />
      </AbsoluteFill>
    </>
  );
};

// ------------------------------------------------------------------ K
const SIGN2: V3 = [G0[0] - 0.4, G0[1] + 4.15, G0[2] - 5];
const S2 = 1.0;
const sign2 = {size: S2, appear: K.buy2 - 3, appear2: K.now2 - 3, goodAt: K.good2 - 3, forAt: K.for2, nowAt: K.now2b, popStagger: 1.4, fromZ: 5, fitWidth: 7.4};

/** K (558-639): the two of them on the hilltop, the sign in the sky behind; he shrugs "I'm good", fist up on "now". */
export const Sign2: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const st = songT(lf);
  const k = smooth(f / 81);
  const b = beatL(lf);
  const cam: V3 = [G0[0] + lerp(0.45, 0.25, k), G0[1] + lerp(0.55, 0.65, k), G0[2] + lerp(4.4, 3.8, k)];
  const tgt: V3 = [G0[0] - 0.4, G0[1] + lerp(1.65, 1.75, k), G0[2] - 1];
  const g = Math.max(near(lf, K.good2, 6), near(lf, K.for2, 6), near(lf, K.now2b, 7));
  const shrug = clamp01((lf - (K.but2 + 2)) / 6) * (1 - clamp01((lf - (K.for2 + 2)) / 6));
  const fist = clamp01((lf - (K.now2b - 5)) / 5);
  const gesture = fist > 0 ? 'fistUp' : shrug > 0 ? 'shrug' : 'sing';
  const from = fist > 0 ? 'shrug' : 'sing';
  const mix = fist > 0 ? fist : shrug;
  const L0 = morphLayout({f: lf, size: S2, goodAt: sign2.goodAt, forAt: sign2.forAt});
  const fit = Math.min(1, sign2.fitWidth / L0.total);
  const dog = {...pancakeHappy(st, 4, true), headPitch: 0.35 + 0.2 * clamp01((lf - K.buy2) / 10), headYaw: -0.2, blink: pancakeBlink(st, 6)};
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={54 - 2 * b.pulse - 2 * g} roll={-0.04} />
      <World lf={lf} flare={0} skyGlow={0.5} deco={null} house={false} trees={false} sunDir={sunVec(0.1, -1.25)} />
      <Sunburst position={[SIGN2[0], SIGN2[1], SIGN2[2] - 12]} radius={30} rays={20} rotation2d={t * 0.3} opacity={0.1} colorA="#fff1c0" colorB="#ff9ad0"
        glow={0.04} additive />
      <MorphWord f={lf} {...sign2} position={SIGN2} rotation={[0.12, 0.05, 0]} />
      <SparkleField count={30} seed={88} area={[L0.total * fit + 1, 2, 1]} time={t} position={[SIGN2[0], SIGN2[1], SIGN2[2] + 0.8]} size={0.35}
        intensity={1.4 + 2.5 * g} colors={['#ffffff', '#fff3c0', '#ffd27a', '#ffc2ea']} />
      <group position={G0}>
        <Performer lf={lf} gesture={gesture} from={from} mix={mix} expression="happy" extra={{headPitch: -0.08 - 0.1 * fist}} />
      </group>
      <Pancake position={PK} rotation={[0, 0.25, 0]} pose={dog} />
      {[-1, 1].map((s) => (
        <Confetti key={s} progress={clamp01((lf - K.now2b + 2) / 70)} position={[G0[0] - 0.4 + s * 2.2, G0[1], G0[2] - 0.5]} count={140} power={1.6} spread={0.6}
          size={1} duration={2.4} seed={90 + s} stars={0} />
      ))}
      <pointLight position={[cam[0], G0[1] + 2.2, cam[2]]} color="#ffe2c4" intensity={2.0} distance={6} decay={1.4} />
    </>
  );
};
export const Sign2Over: React.FC<ShotProps> = ({lf}) => (
  <>
    <Hit k={Math.round(lf - K.good2)} tint="#FFF3D0" streak="#FFD24A" seed={311} strength={0.3} />
    <Hit k={Math.round(lf - K.now2b)} tint="#FFFFFF" streak="#FF9AD0" seed={312} strength={0.35} />
  </>
);

void noise1;
void hit;
