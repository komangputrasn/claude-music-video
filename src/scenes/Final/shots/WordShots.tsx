// [38] "You said 'Buy now,' but I'm good for now" — the sunrise explosion + the BUY NOW -> GOOD FOR NOW morph.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CameraRig} from '../../../lib/three';
import {SparkleField, LensFlare, Sunburst, Confetti} from '../../../lib/three/fx';
import {lerp, clamp01, noise1} from '../../../lib/time';
import {FONTS} from '../../../lib/palette';
import {Hit} from '../Hit';
import {World} from '../World';
import {MorphWord, morphLayout} from '../MorphWord';
import {K, beatL} from '../timing';
import {ShotProps, mix3, easeOut, smooth, near, V3} from '../common';

export const SIGN: V3 = [0, 9.8, 11];
export const SIGN_SIZE = 2.0;
/** the house still wears its Chorus1 subscription wrap until "I'm done" */
export const WRAPPED = (t: number) => ({wrap: 1, bow: 1, tag: 1, lock: 1, t});

const signProps = {size: SIGN_SIZE, fitWidth: 15.5, appear: K.buy1 - 3, appear2: K.now1 - 3, goodAt: K.good1 - 3, forAt: K.for1, nowAt: K.now1b, popStagger: 1.5, fromZ: 9};

/** A (0-66): the chorus EXPLODES out of the dark — sunrise burst, crane down onto the (still wrapped) house; BUY NOW pops. */
export const Open: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = easeOut(f / 62);
  const pos = mix3([-2, 24, 46], [-1.0, 4.2, 32.5], k);
  const target = mix3([-4, 14, 0], [0, 7.6, 4], k);
  const b = beatL(lf);
  const blast = Math.exp(-f / 7);
  return (
    <>
      <CameraRig position={pos} target={target} fov={54 - b.pulse * 2 + blast * 14} roll={lerp(0.16, -0.02, k)} />
      <World lf={lf} flare={0.55 + blast * 0.6} deco={WRAPPED(t)} />
      <MorphWord f={lf} {...signProps} position={SIGN} />
      <SparkleField count={40} seed={5} area={[16, 4, 2]} time={t} position={[SIGN[0], SIGN[1], SIGN[2] + 1]} size={0.7}
        intensity={2.6 * clamp01((lf - K.buy1 + 2) / 6)} />
      <Confetti progress={clamp01(f / 70)} position={[0, 0, 22]} count={260} power={2.1} spread={0.9} size={3} duration={3.2} seed={3} />
    </>
  );
};
export const OpenOver: React.FC<ShotProps> = ({f}) => {
  const a = Math.max(0, 1 - f / 9);
  return a > 0 ? <AbsoluteFill style={{background: 'radial-gradient(circle at 30% 45%, #fff 0%, #ffe6b0 45%, #ff9ac8 100%)', opacity: a * 0.85}} /> : null;
};

/** B (66-115): low hero angle under the sign, orbit; BUY -> GOOD on "good", FOR drops in on "for", NOW turns gold on "now". */
export const Morph: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = smooth(f / 49);
  const ang = lerp(0.36, -0.1, k);
  const r = lerp(14.5, 13.2, k);
  const pos: V3 = [SIGN[0] + Math.sin(ang) * r, SIGN[1] - 6.2 + k * 0.5, SIGN[2] + Math.cos(ang) * r];
  const b = beatL(lf);
  const g = near(lf, K.good1, 6);
  const fo = near(lf, K.for1, 6);
  const nw = near(lf, K.now1b, 7);
  const flash = Math.max(g, fo, nw);
  const L0 = morphLayout({f: lf, size: SIGN_SIZE, goodAt: signProps.goodAt, forAt: signProps.forAt});
  const fit = Math.min(1, signProps.fitWidth / L0.total);
  const L = {x1: L0.x1 * fit, x3: L0.x3 * fit, total: L0.total * fit};
  const jx = 0.03 * noise1(lf * 1.3, 2) * (1 - k);
  return (
    <>
      <CameraRig position={pos} target={[SIGN[0], SIGN[1] - 0.2, SIGN[2]]} fov={48 - b.pulse * 2.5 - nw * 3} roll={lerp(-0.1, 0.06, k) + jx} />
      <World lf={lf} flare={0.25} deco={WRAPPED(t)} skyGlow={0.55} />
      <Sunburst position={[SIGN[0], SIGN[1] + 2, -30]} radius={60} rays={20} rotation2d={-t * 0.3} opacity={0.1 + 0.18 * flash} colorA="#ffe9b0" colorB="#ff9ad0"
        glow={0.05} additive />
      <MorphWord f={lf} {...signProps} position={SIGN} />
      <SparkleField count={40} seed={9} area={[L.total + 2, 4, 2]} time={t} position={[SIGN[0], SIGN[1], SIGN[2] + 1.2]} size={0.75}
        intensity={1.6 + 3 * flash} colors={['#ffffff', '#fff3c0', '#ffd27a', '#ffc2ea']} />
      <group position={[SIGN[0] + L.x1 - 1.0, SIGN[1] + 1.2, SIGN[2] + 1.4]}>
        <LensFlare intensity={0.15 + 0.6 * g} scale={0.9} rotation={t * 0.6} color="#fff0c8" />
      </group>
      <group position={[SIGN[0] + L.x3 + 1.2, SIGN[1] + 1.0, SIGN[2] + 1.4]}>
        <LensFlare intensity={0.6 * nw} scale={0.9} rotation={-t * 0.6} color="#fff0c8" />
      </group>
      {[-1, 1].map((s) => (
        <Confetti key={s} progress={clamp01((lf - K.now1b + 3) / 75)} position={[SIGN[0] + s * 6.5, SIGN[1] - 2.5, SIGN[2] + 0.5]} count={140} power={1.5}
          spread={0.7} size={2.4} duration={2.6} seed={8 + s} />
      ))}
    </>
  );
};
export const MorphOver: React.FC<ShotProps> = ({lf}) => {
  const fp = clamp01((lf - K.now1b - 2) / 6);
  return (
    <>
      <Hit k={Math.round(lf - K.good1)} tint="#FFF3D0" streak="#FFD24A" seed={221} strength={0.35} />
      <Hit k={Math.round(lf - K.now1b)} tint="#FFFFFF" streak="#FF9AD0" seed={222} strength={0.3} />
      {fp > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', opacity: fp, fontFamily: FONTS.ui, fontSize: 30,
          color: '#fff', textShadow: '0 2px 0 #7a2a5a, 0 0 8px #7a2a5a', letterSpacing: 1}}>
          *No subscription required. Offer never expires.
        </div>
      ) : null}
    </>
  );
};
