// <Crowd> look test: 300 hooded figures in fog under a backlight, the Guy walking against them; then the look-up wave.
//   node scripts/still.mjs silplay CrowdTest --frames=10,100,150,190
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {SilStage, CameraRig} from '../lib/SilStage';
import {SilGuy} from '../lib/SilCast';
import {Crowd} from '../lib/Crowd';
import {Iris} from '../lib/Iris';
import {S, hdr} from '../lib/palette';
import {Letterbox} from '../overlays/SilOverlays';
import {guyWalk, GUY} from '../../lib/characters/Guy';
import {ramp} from '../../lib/time';

export const duration = 200;

const Glow: React.FC<{position: [number, number, number]; scale: [number, number]; color: string; intensity: number}> = ({position, scale, color, intensity}) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh position={position} scale={[scale[0], scale[1], 1]}>
      <planeGeometry />
      <meshBasicMaterial map={tex} color={hdr(color, intensity)} transparent depthWrite={false} fog={false} />
    </mesh>
  );
};

export default function CrowdTest() {
  const f = useCurrentFrame();
  const t = f / 30;
  const shot = f < 120 ? 0 : 1;
  const walkZ = -6 + t * GUY.strideLength * 0.94;
  return (
    <AbsoluteFill>
      <SilStage fog={{color: S.ash, near: 10, far: 70}}>
        {shot === 0 ? <CameraRig position={[0, 2.2, 26]} target={[0, 1.6, 0]} fov={22} /> : <CameraRig position={[0, 1.2, 16]} target={[0, 2.6, 0]} fov={26} />}
        <Glow position={[0, 8, -40]} scale={[120, 40]} color={S.bone} intensity={0.75} />
        <Glow position={[0, 14, -38]} scale={[30, 18]} color={S.authRed} intensity={shot === 1 ? 0.9 * (1 - ramp(f, 140, 175)) : 0.9} />
        <Iris position={[0, 14, -37]} radius={5} time={t} open={1} flicker={shot === 1 ? ramp(f, 130, 170) : 0} intensity={1.6} />
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial color={S.void} />
        </mesh>
        <Crowd count={320} seed={3} area={[26, 34]} spacing={1.25} time={t} exclude={[[0, 0, 0.9]]} position={[0, 0, -8]}
          facing={Math.PI} lookUp={shot === 1 ? ramp(f, 140, 195) : 0} rim={{color: S.bone, dir: [0, 1], strength: 0.8}} />
        {shot === 0 ? <SilGuy pose={guyWalk(t)} rotation-y={Math.PI} position={[0, 0, 10 - walkZ]} rim={{color: S.bone, dir: [0, 1]}} /> : null}
      </SilStage>
      <Letterbox />
    </AbsoluteFill>
  );
}
