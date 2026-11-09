/**
 * Overlays playground — every frame is one test case:
 *   frames 0-11  karaoke captions at given song times over worst-case backgrounds (sky, white, black, sunrise...)
 *   frames 12-15 CamcorderHUD variants over a lit 3D <Stage> (rec / play / pause+low battery / classic corner date)
 *   frames 16-25 cut transitions (flash, glitch, vhs) at several local frames k over a 3D <Stage>
 * Render:  node scripts/still.mjs play Overlays --frames=0,1,2,...,25
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {InkMesh} from '../lib/characters/InkMesh';
import {Captions} from '../overlays/Captions';
import {CamcorderHUD} from '../overlays/CamcorderHUD';
import {CutEffect, CutStyle} from '../overlays/CutFlash';

type Bg = 'night' | 'black' | 'sky' | 'white' | 'sunrise' | 'purple' | 'orange' | 'stage' | 'stageNight';
type Case = {
  bg: Bg;
  t?: number; // caption song time
  hud?: {mode: 'rec' | 'play' | 'pause'; battery?: number; label?: string; captionSafe?: boolean; time?: string; frame: number};
  cut?: {style: CutStyle; k: number; tint?: string; streak?: string};
  cam?: 'wide' | 'threeq' | 'close';
};

const CASES: Case[] = [
  {bg: 'night', t: 13.9},
  {bg: 'black', t: 19.95},
  {bg: 'sky', t: 59.0},
  {bg: 'sky', t: 59.4},
  {bg: 'sky', t: 81.0},
  {bg: 'orange', t: 129.9},
  {bg: 'purple', t: 162.6},
  {bg: 'sunrise', t: 172.0},
  {bg: 'sunrise', t: 190.45},
  {bg: 'night', t: 16.84},
  {bg: 'white', t: 67.6},
  {bg: 'sky', t: 57.85},
  // HUD
  {bg: 'stage', cam: 'wide', t: 190.0, hud: {mode: 'rec', frame: 372}},
  {bg: 'stage', cam: 'threeq', hud: {mode: 'play', frame: 2410, captionSafe: false, time: 'AM 6:42'}},
  {bg: 'stageNight', cam: 'close', t: 14.4, hud: {mode: 'pause', battery: 1, label: 'SP', frame: 95}},
  {bg: 'stage', cam: 'close', hud: {mode: 'rec', frame: 20, captionSafe: false}},
  // cuts
  {bg: 'stage', cam: 'wide', cut: {style: 'flash', k: 0}},
  {bg: 'stage', cam: 'wide', cut: {style: 'flash', k: 2}},
  {bg: 'stage', cam: 'threeq', cut: {style: 'flash', k: 1, tint: '#FFF3DA', streak: '#FFB347'}},
  {bg: 'stage', cam: 'threeq', cut: {style: 'glitch', k: -1}},
  {bg: 'stage', cam: 'threeq', cut: {style: 'glitch', k: 0}},
  {bg: 'stageNight', cam: 'close', cut: {style: 'glitch', k: 1}},
  {bg: 'stage', cam: 'wide', cut: {style: 'vhs', k: -2}},
  {bg: 'stage', cam: 'wide', cut: {style: 'vhs', k: 0}},
  {bg: 'stageNight', cam: 'close', cut: {style: 'vhs', k: 2}},
  {bg: 'stage', cam: 'threeq', cut: {style: 'vhs', k: 4}},
];
export const duration = CASES.length;

const CAMS: Record<NonNullable<Case['cam']>, {position: [number, number, number]; target: [number, number, number]; fov: number}> = {
  wide: {position: [0, 1.6, 7.5], target: [0, 0.6, 0], fov: 45},
  threeq: {position: [3.4, 1.4, 3.6], target: [0, 0.6, 0], fov: 40},
  close: {position: [-0.5, 0.8, 1.6], target: [-0.6, 0.5, 0], fov: 60},
};

const TestStage: React.FC<{night?: boolean; cam: NonNullable<Case['cam']>}> = ({night, cam}) => {
  const c = CAMS[cam];
  return (
    <Stage background={night ? '#050A2A' : '#3d7bff'} env="chrome">
      <CameraRig {...c} />
      <hemisphereLight args={[night ? '#5566cc' : '#cfe8ff', '#30204a', night ? 0.5 : 0.9]} />
      <directionalLight position={[3, 5, 3]} intensity={night ? 1.2 : 2.6} color={night ? '#9fb4ff' : '#ffffff'} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[12, 24]} />
        <meshStandardMaterial color={night ? '#1b2a5a' : '#5ed12f'} flatShading />
      </mesh>
      <InkMesh color="#E9B25E" position={[-0.6, 0.45, 0]}>
        <icosahedronGeometry args={[0.45, 1]} />
      </InkMesh>
      <InkMesh color="#FF8A1E" position={[0.7, 0.55, -0.3]}>
        <capsuleGeometry args={[0.25, 0.6, 4, 12]} />
      </InkMesh>
      <InkMesh color="#19C6FF" position={[1.8, 0.35, -1.5]}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
      </InkMesh>
      <InkMesh color="#FF4FB8" position={[-2.0, 0.3, -1.2]}>
        <coneGeometry args={[0.4, 0.8, 8]} />
      </InkMesh>
    </Stage>
  );
};

const Background: React.FC<{c: Case}> = ({c}) => {
  const bg = c.bg;
  if (bg === 'stage' || bg === 'stageNight') return <TestStage night={bg === 'stageNight'} cam={c.cam ?? 'wide'} />;
  if (bg === 'black') return <AbsoluteFill style={{background: '#000'}} />;
  if (bg === 'white') return <AbsoluteFill style={{background: 'linear-gradient(#ffffff, #eef6ff)'}} />;
  if (bg === 'night')
    return (
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 70% 30%, #1b2a6b 0%, #050A2A 60%)'}}>
        <div style={{position: 'absolute', left: 1250, top: 160, width: 380, height: 300, background: '#3a5bb8', border: '14px solid #1a2550'}} />
        <div style={{position: 'absolute', left: 200, top: 620, width: 1500, height: 460, background: '#2b3f8a', borderRadius: 30}} />
      </AbsoluteFill>
    );
  if (bg === 'sky')
    return (
      <AbsoluteFill style={{background: 'linear-gradient(#1E5BFF 0%, #4B9BFF 45%, #BFF3FF 80%)'}}>
        <div style={{position: 'absolute', left: 300, top: 180, width: 420, height: 120, background: 'white', borderRadius: 80, opacity: 0.95}} />
        <div style={{position: 'absolute', left: -200, top: 760, width: 1300, height: 700, background: '#4fd12a', borderRadius: '50%'}} />
        <div style={{position: 'absolute', left: 800, top: 820, width: 1500, height: 700, background: '#7be83c', borderRadius: '50%'}} />
        <div style={{position: 'absolute', left: 900, top: 960, width: 500, height: 140, background: '#ffffff', borderRadius: 60}} />
      </AbsoluteFill>
    );
  if (bg === 'sunrise')
    return (
      <AbsoluteFill style={{background: 'linear-gradient(#5a7cff 0%, #ff8ac8 45%, #ffd36a 75%, #fff2c0 100%)'}}>
        <div style={{position: 'absolute', left: 760, top: 640, width: 400, height: 400, background: '#fff6d0', borderRadius: '50%', boxShadow: '0 0 120px #fff'}} />
      </AbsoluteFill>
    );
  if (bg === 'purple') return <AbsoluteFill style={{background: 'radial-gradient(#8A4DFF, #1a0640)'}} />;
  return <AbsoluteFill style={{background: 'linear-gradient(#ff8a1e, #4a1a08)'}} />;
};

export default function Overlays() {
  const f = useCurrentFrame();
  const c = CASES[Math.min(CASES.length - 1, f)];
  return (
    <AbsoluteFill>
      <Background c={c} />
      {c.hud ? (
        <CamcorderHUD frame={c.hud.frame} mode={c.hud.mode} battery={c.hud.battery} label={c.hud.label} captionSafe={c.hud.captionSafe}
          time={c.hud.time} />
      ) : null}
      {c.cut ? <CutEffect style={c.cut.style} k={c.cut.k} tint={c.cut.tint} streak={c.cut.streak} seed={f} /> : null}
      {c.t !== undefined ? <Captions time={c.t} /> : null}
      <div style={{position: 'absolute', left: 20, top: 16, font: '22px Tahoma', color: '#fff', textShadow: '0 1px 2px #000'}}>
        case {f}
        {c.t !== undefined ? ` · t=${c.t}s` : ''}
        {c.cut ? ` · ${c.cut.style} k=${c.cut.k}` : ''}
      </div>
    </AbsoluteFill>
  );
}
