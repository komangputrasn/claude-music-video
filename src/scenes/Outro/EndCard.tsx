/**
 * Outro end card (3D part): the Intro's Y2K void again (bookend) with the chrome "BUY NOW, / FOR NOW" lockup slamming in
 * on the final hit, lens flare, sparkles, swoosh. The 2D "click to cancel" link, cursor and the CRT-style collapse are
 * handled by the Outro index (HTML layers + a CSS transform on the whole card).
 */
import React from 'react';
import {Easing} from 'remotion';
import {CameraRig, ChromeText, measureChromeText} from '../../lib/three';
import {LensFlare, SparkleField, Sparkle, Swoosh} from '../../lib/three/fx';
import {popIn, ramp, lerp} from '../../lib/time';
import {VoidBackdrop} from '../Intro/Void';

const CAP = 0.36;
const L1 = 'BUY NOW,';
const L2 = 'FOR NOW';
const M1 = measureChromeText(L1, {size: CAP});
const M2 = measureChromeText(L2, {size: CAP});
const Y1 = 0.67;
const Y2 = 0.13;

/** `ef` = end-card-local frame (0 = the slam frame, the final hit) */
export const EndCard3D: React.FC<{ef: number; t: number}> = ({ef, t}) => {
  const push = ramp(ef, 0, 100, Easing.out(Easing.quad));
  const l1 = (i: number) => {
    const k = popIn(ef, -4 + i * 1.1, 12);
    return {position: [0, (1 - k) * 0.6, (1 - k) * 5] as [number, number, number], rotation: [(1 - k) * 1.3, (1 - k) * 0.3, 0] as [number, number, number],
      scale: Math.max(0.001, 0.35 + 0.65 * k), visible: k > 0.001};
  };
  const l2 = (i: number) => {
    const k = popIn(ef, 2 + i * 1.1, 12);
    return {position: [0, -(1 - k) * 0.6, (1 - k) * 5] as [number, number, number], rotation: [-(1 - k) * 1.3, -(1 - k) * 0.3, 0] as [number, number, number],
      scale: Math.max(0.001, 0.35 + 0.65 * k), visible: k > 0.001};
  };
  const flare = 0.35 + 1.0 * Math.exp(-Math.max(0, ef) / 8);
  return (
    <>
      <CameraRig position={[lerp(-0.18, 0.12, push), lerp(0.42, 0.36, push), lerp(4.3, 3.95, push)]} target={[0, 0.3, 0]} fov={40} roll={lerp(-0.025, 0, push)} />
      <VoidBackdrop t={t} burst={1} grid={1} glyphs={0.0} />
      <ChromeText text={L1} size={CAP} position={[0, Y1, 0]} outline={{thickness: 0.02, color: '#06103a'}} shine={ramp(ef, 14, 44)} perLetter={(i) => l1(i)} />
      <ChromeText text={L2} size={CAP} position={[0, Y2, 0]} outline={{thickness: 0.02, color: '#06103a'}} shine={ramp(ef, 20, 50)} sideMaterial="gold"
        perLetter={(i) => l2(i)} />
      <Swoosh position={[0, Y2 - 0.12, 0.3]} radius={[M1.width * 0.56, 0.16]} arc={[-2.85, -0.3]} width={0.07} progress={ramp(ef, 6, 26)} />
      <SparkleField count={34} seed={13} area={[M1.width + 1.4, 1.6, 0.8]} position={[0, Y2 + 0.4, 0.3]} time={t} size={0.22} intensity={2.6 * ramp(ef, 2, 12)} />
      <Sparkle position={[M1.width / 2 + 0.06, Y1 + CAP + 0.08, 0.35]} size={0.9 * ramp(ef, 4, 10) * (0.8 + 0.2 * Math.sin(t * 6))} time={t} intensity={3} />
      <LensFlare position={[M1.width / 2 - 0.3, Y1 + CAP * 0.9, 0.3]} intensity={flare} rotation={t * 0.4} scale={0.95} />
      <LensFlare position={[-M2.width / 2 + 0.15, Y2 + 0.1, 0.3]} intensity={0.6 * Math.exp(-Math.max(0, ef - 4) / 9)} rotation={-t * 0.3} scale={0.6} ghosts={false} />
    </>
  );
};

export const END_TITLE = {M1, M2, Y1, Y2, CAP};
