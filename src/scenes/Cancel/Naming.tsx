// Shots D1–D3 (3D backdrop): "Amazon named its cancel page..." — a chrome OmniStore logo slams in on "Amazon" over a
// warm sunburst (the sunset to come); then it drifts up behind the 2D Page Properties dialog (Overlays2D) where the page
// gets its name typed letter by letter on the beats.
import React from 'react';
import {CameraRig, ChromeText, Sunburst, Swoosh, SparkleField, LensFlare, SkyDome as FxSky} from '../../lib/three';
import {popIn} from '../../lib/time';
import {SHOT, W} from './times';
import {V3, lin, smooth, lerpV, shake, addV} from './kit';

const SLAM = Math.round(W.amazon) - 3;
const STOPS: [number, string][] = [[-1, '#12063a'], [-0.2, '#2a0f6a'], [0, '#5a2ab0'], [0.25, '#2a3ad0'], [1, '#0a1a6a']];

export const ShotD: React.FC<{f: number; t: number}> = ({f, t}) => {
  const up = smooth(lin(f, W.named - 4, W.named + 10));
  const sh = shake(f, SLAM + 6, 0.12, 5, 21);
  const cam: V3 = addV(lerpV(lerpV([0, 0.25, 8.4], [0, 0.15, 7.2], smooth(lin(f, SHOT.D1, W.named))), [0, -2.92, 10.5], up), sh);
  const tgt: V3 = lerpV([0, 0.05, 0], [0, -3.1, 0], up);
  const after = Math.max(0, f - (SLAM + 6));
  const zoomD3 = smooth(lin(f, SHOT.D3 - 2, SHOT.D3 + 5));
  return (
    <>
      <CameraRig position={addV(cam, [0, 0, -1.2 * zoomD3])} target={tgt} fov={46} roll={0.04 * Math.sin(t * 0.7)} />
      <FxSky stops={STOPS} />
      <Sunburst position={[0, -0.6, -14]} radius={40} rays={20} colorA="#ff7a1a" colorB="#a01e78" center="#ff9a5a" rotation2d={t * 0.18} opacity={0.9} glow={0.12} softness={0.2} />
      <group position={[0, 0.25, 0]}>
        <ChromeText text="OmniStore" font="TrebuchetBoldItalic" size={1.15} anchor="center" outline={{thickness: 0.035, color: '#0a1040'}}
          shine={lin(f, SLAM + 6, SLAM + 30)}
          perLetter={(i) => {
            const k = popIn(f, SLAM + i * 1.1, 10);
            return {scale: Math.max(0.001, 0.3 + 0.7 * k), position: [0, 0, (1 - k) * 7], rotation: [0, (1 - k) * 1.6, 0]};
          }} />
        <ChromeText text="CANCEL CENTER" font="ArialBlack" size={0.36} anchor="center" material="gold" position={[0, -1.15, 0.2]} letterSpacing={0.18}
          perLetter={(i) => {
            const k = popIn(f, SLAM + 9 + i * 0.7, 9);
            return {scale: Math.max(0.001, k)};
          }} />
        <Swoosh position={[0, -0.2, 0.4]} radius={[4.7, 1.25]} arc={[-2.95, 0.5]} width={0.15} progress={lin(f, SLAM + 4, SLAM + 24)} tilt={0.25}
          colorA="#19C6FF" colorB="#FF4FB8" />
        <SparkleField count={22} seed={17} area={[9, 2.6, 0.8]} time={t} size={0.4} position={[0, 0, 0.6]} intensity={after > 0 ? 2.6 : 0} />
        <LensFlare position={[-3.0, 0.75, 0.6]} intensity={after > 0 ? 0.2 + 0.9 * Math.exp(-after / 10) : 0} rotation={t * 0.4} scale={0.8} />
      </group>
      <hemisphereLight args={['#ffffff', '#6a4ab0', 1]} />
    </>
  );
};

