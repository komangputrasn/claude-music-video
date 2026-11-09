// <WorldLyric> look test — one shot per frame:
//   0 'light' projected into fog behind the Guy ("…Sleep has a fee", red FEE)      t=20.95
//   1 'screen' on a black TENURE slab ("…whole house on a plan somehow")           t=65.3
//   2 'paint' stencilled on a concrete wall ("…won't print a line")                t=25.5
//   3 'dark' black letters against the gold dawn (gold BOWL / GROUND)              t=191.9
//   4 perWord: words drifting up as ash ("…they can take it away")                 t=38.6
//   node scripts/still.mjs silplay Lyrics --frames=0,1,2,3,4
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {SilStage, CameraRig} from '../lib/SilStage';
import {SilGuy, SilPancake} from '../lib/SilCast';
import {WorldLyric, metresForPx} from '../lib/WorldLyric';
import {S, hdr} from '../lib/palette';
import {Letterbox} from '../overlays/SilOverlays';
import {guyIdle} from '../../lib/characters/Guy';
import {pancakeEat} from '../../lib/characters/Pancake';
import {noise1} from '../../lib/time';

export const duration = 5;
const TIMES = [20.95, 65.3, 25.5, 191.9, 38.6];

const useGlow = () =>
  useMemo(() => {
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

export default function Lyrics() {
  const f = useCurrentFrame();
  const t = TIMES[f] ?? 20;
  const glow = useGlow();
  const Glow = ({p, s, c, i}: {p: [number, number, number]; s: [number, number]; c: string; i: number}) => (
    <mesh position={p} scale={[s[0], s[1], 1]}>
      <planeGeometry />
      <meshBasicMaterial map={glow} color={hdr(c, i)} transparent depthWrite={false} fog={false} />
    </mesh>
  );
  const floor = (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial color={S.void} />
    </mesh>
  );
  return (
    <AbsoluteFill>
      <SilStage fog={{color: S.ash, near: 10, far: 60}}>
        {f === 0 ? (
          <>
            <CameraRig position={[0, 1.5, 14]} target={[0, 2.2, 0]} fov={26} />
            <Glow p={[0, 3, -12]} s={[60, 22]} c={S.fog} i={0.55} />
            {floor}
            <WorldLyric line={1} time={t} size={metresForPx(64, 22, 26)} maxWidth={9} position={[0, 3.6, -8]} />
            <SilGuy pose={guyIdle(t)} position={[0, 0, 0]} rotation-y={Math.PI / 2} rim={{color: S.bone, dir: [0, 1]}} />
          </>
        ) : null}
        {f === 1 ? (
          <>
            <CameraRig position={[0, 1.6, 30]} target={[0, 6, 0]} fov={24} />
            <Glow p={[0, 6, -20]} s={[90, 30]} c={S.fog} i={0.5} />
            {floor}
            <mesh position={[0, 7, -1]}>
              <boxGeometry args={[16, 5, 0.3]} />
              <meshBasicMaterial color={S.void} />
            </mesh>
            <WorldLyric line={13} time={t} mode="screen" color={S.bone} size={0.9} maxWidth={14} position={[0, 7, -0.84]} />
            <SilGuy pose={guyIdle(t)} position={[0, 0, 4]} rim={{color: S.bone, dir: [0, 1]}} />
          </>
        ) : null}
        {f === 2 ? (
          <>
            <CameraRig position={[2.5, 1.4, 7]} target={[0, 1.5, 0]} fov={30} />
            <mesh position={[0, 2, -0.5]}>
              <planeGeometry args={[20, 6]} />
              <meshBasicMaterial color={S.fog} />
            </mesh>
            {floor}
            <WorldLyric line={2} time={t} mode="paint" color={S.void} size={0.28} maxWidth={4} align="left" anchor="top" position={[-2.6, 3.2, -0.48]} />
            <SilGuy pose={guyIdle(t)} position={[1.3, 0, 1]} rotation-y={-Math.PI / 2} />
          </>
        ) : null}
        {f === 3 ? (
          <>
            <CameraRig position={[0, 0.5, 9]} target={[0, 1.2, 0]} fov={24} />
            <Glow p={[0, 0.5, -20]} s={[80, 26]} c={S.dawnGold} i={0.85} />
            <Glow p={[0, 0.2, -18]} s={[20, 6]} c={S.dawnGold} i={1.4} />
            {floor}
            <WorldLyric line={43} time={t} mode="dark" size={0.42} maxWidth={6.5} position={[0, 2.5, -3]} />
            <SilPancake pose={pancakeEat(t)} rotation-y={Math.PI / 2} position={[0, 0, 0]} rim={{color: S.dawnGold, dir: [0, 1]}} />
          </>
        ) : null}
        {f === 4 ? (
          <>
            <CameraRig position={[0, 1.6, 12]} target={[0, 2.4, 0]} fov={26} />
            <Glow p={[0, 3, -12]} s={[50, 20]} c={S.fog} i={0.5} />
            {floor}
            <WorldLyric line={5} time={t} size={0.36} maxWidth={7} position={[0, 2.6, -2]}
              perWord={(i, w) => {
                const k = Math.max(0, t - 37.42 - i * 0.05);
                return {offset: [noise1(k * 0.8, i) * 0.4 * k, k * k * 0.9, 0], opacity: Math.max(0, 1 - k * 0.8), rotation: [0, 0, noise1(k, i + 9) * 0.6 * k]};
              }} />
            <SilGuy pose={guyIdle(t)} position={[0, 0, 0]} rim={{color: S.bone, dir: [0, 1]}} />
          </>
        ) : null}
      </SilStage>
      <Letterbox />
    </AbsoluteFill>
  );
}
