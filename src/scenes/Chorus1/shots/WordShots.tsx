// Chorus half 1: "You said 'Buy now,' but you meant 'for now'" — chrome sign over the wallpaper world.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CameraRig, ChromeText} from '../../../lib/three';
import {SparkleField, LensFlare, Sunburst} from '../../../lib/three/fx';
import {lerp, clamp01, noise1, popIn} from '../../../lib/time';
import {FONTS} from '../../../lib/palette';
import {CutEffect} from '../../../overlays/CutFlash';
import {World} from '../World';
import {SKY_PRESETS} from '../../../lib/sets/Exterior';
import {HeroWord} from '../HeroWord';
import {K, beatL} from '../timing';
import {ShotProps, mix3, easeOut, smooth, V3} from './common';

const SIGN: V3 = [0, 9.6, 11];
const SIGN_SIZE = 2.1;

/** S01 (0-49): white-out -> crane down out of the sky onto the pristine house; BUY NOW slams in on the sung words. */
export const Open: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = easeOut(f / 44);
  const pos = mix3([-3, 26, 44], [-1.2, 3.2, 31], k);
  const target = mix3([0, 13, 0], [0, 7.4, 4], k);
  const b = beatL(lf);
  return (
    <>
      <CameraRig position={pos} target={target} fov={52 - b.pulse * 2} roll={lerp(0.12, -0.02, k)} />
      <World t={t} flare={1} sunDir={SKY_PRESETS.day.sunDir} />
      <HeroWord f={lf} size={SIGN_SIZE} position={SIGN} appear={K.buy1 - 3} appear2={K.now1 - 3} popStagger={1.5} flipAt={9999} fromZ={9} />
      <SparkleField count={40} seed={5} area={[16, 4, 2]} time={t} position={[SIGN[0], SIGN[1], SIGN[2] + 1]} size={0.7}
        intensity={2.6 * clamp01((lf - K.buy1 + 2) / 6)} />
    </>
  );
};
/** Over S01: the white-out from the Pre build-up fades off */
export const OpenOver: React.FC<ShotProps> = ({f}) => {
  const a = Math.max(0, 1 - f / 10);
  return a > 0 ? <AbsoluteFill style={{background: '#fff', opacity: a * 0.9}} /> : null;
};

/** S02 (49-115): low hero angle under the sign, slow orbit; shiver on "meant", whole-sign flip to gold FOR NOW on "for". */
export const HeroFlip: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = smooth(f / 66);
  const ang = lerp(-0.5, 0.18, k);
  const r = lerp(17.5, 15.2, k);
  const pos: V3 = [SIGN[0] + Math.sin(ang) * r, SIGN[1] - 4.2 + k * 0.8, SIGN[2] + Math.cos(ang) * r];
  const b = beatL(lf);
  const shiver = clamp01((lf - K.meant1 + 4) / 6) * (lf < K.for1 - 3 ? 1 : 0);
  const jx = shiver * 0.06 * noise1(lf * 1.7, 3);
  const jz = shiver * 0.05 * noise1(lf * 1.9, 4);
  const flash = Math.max(0, 1 - Math.abs(lf - K.for1) / 6);
  const ast = lf < K.now1b + 2 ? 0 : popIn(lf, K.now1b + 2, 10);
  return (
    <>
      <CameraRig position={pos} target={[SIGN[0], SIGN[1] - 0.6, SIGN[2]]} fov={42 - b.pulse * 2.5} roll={lerp(0.1, -0.06, k)} />
      <World t={t} flare={0.9} />
      <Sunburst position={[SIGN[0], 62, -220]} radius={330} rays={18} rotation2d={t * 0.25} opacity={0.35 + 0.25 * flash}
        colorA="#bfe8ff" colorB="#1E5BFF" glow={0.12} />
      <group position={SIGN} rotation={[jx, 0, jz]}>
        <HeroWord f={lf} size={SIGN_SIZE} appear={-200} flipAt={K.for1 - 4} flipDur={9} bounceAt={K.now1b - 1} />
        {ast > 0.01 ? (
          <ChromeText text="*" size={SIGN_SIZE * 0.75} material="ruby" anchor="center" position={[8.4, 1.3, 0.3]} scale={ast}
            rotation={[0, 0, t * 2]} outline={{thickness: 0.05, color: '#06103a'}} />
        ) : null}
      </group>
      <SparkleField count={34} seed={9} area={[16, 4, 2]} time={t} position={[SIGN[0], SIGN[1], SIGN[2] + 1.2]} size={0.7}
        intensity={1.5 + 2.5 * flash} />
      <group position={[SIGN[0] - 5.5, SIGN[1] + 1.4, SIGN[2] + 1.2]}>
        <LensFlare intensity={0.25 + 0.9 * flash} scale={1.3} rotation={t * 0.6} />
      </group>
    </>
  );
};
/** Over S02: strobe on "for", fine print after "now" */
export const HeroFlipOver: React.FC<ShotProps> = ({lf}) => {
  const fp = clamp01((lf - K.now1b - 4) / 6);
  return (
    <>
      <CutEffect style="flash" k={Math.round(lf - K.for1)} tint="#FFF6D0" streak="#FFD24A" seed={121} strength={0.35} />
      {fp > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center', opacity: fp, fontFamily: FONTS.ui, fontSize: 30,
          color: '#fff', textShadow: '0 2px 0 #0a2a8a, 0 0 8px #0a2a8a', letterSpacing: 1}}>
          *Offer valid for now. "Now" may end at any time. Ownership not included.
        </div>
      ) : null}
    </>
  );
};
