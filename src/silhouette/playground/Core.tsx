// Core silhouette look test: SilGuy (hood up → down), SilPancake in profile, Iris, fog backlight, letterbox.
//   node scripts/still.mjs silplay Core --frames=0,40,80,120,160,200
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {SilStage, CameraRig} from '../lib/SilStage';
import {SilGuy, SilPancake} from '../lib/SilCast';
import {Iris} from '../lib/Iris';
import {S, hdr} from '../lib/palette';
import {Letterbox, SilCaptions} from '../overlays/SilOverlays';
import {guyIdle, guyWalk, mergePose} from '../../lib/characters/Guy';
import {pancakeBeg, pancakeIdle} from '../../lib/characters/Pancake';
import {ramp} from '../../lib/time';

export const duration = 240;

const glowTex = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const Backlight: React.FC<{color?: string; intensity?: number; scale?: number; position?: [number, number, number]}> = ({
  color = S.bone, intensity = 0.8, scale = 14, position = [0, 2, -10],
}) => {
  const tex = useMemo(glowTex, []);
  return (
    <mesh position={position} scale={[scale * 1.6, scale, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={tex} color={hdr(color, intensity)} transparent depthWrite={false} fog={false} toneMapped />
    </mesh>
  );
};

export default function Core() {
  const f = useCurrentFrame();
  const t = f / 30;
  const shot = f < 80 ? 0 : f < 160 ? 1 : 2;
  const hood = shot === 1 ? 1 - ramp(f, 110, 135) : 1;
  return (
    <AbsoluteFill>
      <SilStage fog={{color: S.ash, near: 12, far: 60}}>
        {shot === 0 ? <CameraRig position={[3.5, 1.4, 9]} target={[0, 0.9, 0]} fov={26} /> : null}
        {shot === 1 ? <CameraRig position={[0, 1.3, 7]} target={[0, 1.1, 0]} fov={24} /> : null}
        {shot === 2 ? <CameraRig position={[0, 1.6, 4]} target={[0, 1.6, -2]} fov={30} /> : null}
        <Backlight />
        <Backlight color={S.authRed} intensity={0.9} scale={4} position={[5, 3, -6]} />
        {/* floor */}
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[60, 60]} />
          <meshBasicMaterial color={S.void} />
        </mesh>
        <SilGuy
          pose={shot === 1 ? guyIdle(t) : mergePose(guyWalk(t), {})}
          hood={hood}
          rotation-y={shot === 0 ? Math.PI / 2 : 0}
          position={shot === 0 ? [-1.2, 0, 0] : [-0.5, 0, 0]}
          rim={{color: S.bone, strength: 1.0, dir: [0, 1]}}
        />
        <SilPancake
          pose={shot === 0 ? pancakeIdle(t, 1) : pancakeBeg(t)}
          rotation-y={shot === 0 ? Math.PI / 2 : Math.PI / 2 + 0.35}
          position={shot === 0 ? [0.4, 0, 0] : [0.6, 0, 0]}
          rim={{color: S.bone, strength: 1.0, dir: [0, 1]}}
        />
        <Iris position={[0, 1.6, -2]} radius={0.6} open={shot === 2 ? ramp(f, 165, 210) : 1} time={t} pupil={0.3 + 0.05 * Math.sin(t * 3)} />
      </SilStage>
      <Letterbox />
      <SilCaptions time={44.6} />
    </AbsoluteFill>
  );
}
