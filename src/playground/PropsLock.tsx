/**
 * PropsLock — playground for <Padlock> (closed / open / shaking / broken / gold "PLUS tier") and kibble piles & bursts.
 * Segments: 0 lineup of states · 1 3/4 close-up + gold tier · 2 kibble piles (disc + rectangular) · 3 kibble burst.
 * Render: node scripts/still.mjs play PropsLock --frames=0,40,60,100
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {Padlock} from '../lib/props/Padlock';
import {KibbleBurst, KibblePile} from '../lib/props/Kibble';

export const duration = 120;

const Lights: React.FC = () => (
  <>
    <hemisphereLight args={['#cfe2ff', '#2a2050', 0.75]} />
    <directionalLight position={[1.6, 3, 2.4]} intensity={2.1} color="#fff6ea" />
    <directionalLight position={[-2.5, 1.4, -2]} intensity={1.3} color="#6fd6ff" />
  </>
);

export default function PropsLock() {
  const f = useCurrentFrame();
  const seg = Math.floor(f / 30);
  const lf = f % 30;
  return (
    <AbsoluteFill>
      <Stage background="#2a5bd8" env="chrome">
        <Lights />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3, 48]} />
          <meshToonMaterial color="#3346a8" />
        </mesh>
        {seg === 0 ? (
          <>
            <CameraRig position={[0, 0.12, 0.42]} target={[0, 0.07, 0]} fov={40} />
            <Padlock position={[-0.16, 0.06, 0]} />
            <Padlock position={[-0.055, 0.06, 0]} open={1} />
            <Padlock position={[0.055, 0.06, 0]} shake={1} time={lf / 30} />
            <Padlock position={[0.16, 0.06, 0]} broken={0.6} />
          </>
        ) : seg === 1 ? (
          <>
            <CameraRig position={[0.12, 0.1, 0.22]} target={[0, 0.06, 0]} fov={40} />
            <Padlock position={[0, 0.06, 0]} rotation={[0, 0.35, 0]} />
            <Padlock position={[-0.09, 0.06, -0.06]} color="#F5C542" open={0.5} />
          </>
        ) : seg === 2 ? (
          <>
            <CameraRig position={[0, 0.35, 0.6]} target={[0, 0.03, 0]} fov={40} />
            <KibblePile radius={0.1} height={0.05} position={[-0.15, 0, 0]} />
            <KibblePile footprint={[0.2, 0.14]} height={0.04} position={[0.15, 0, 0]} />
          </>
        ) : (
          <>
            <CameraRig position={[0, 0.7, 1.8]} target={[0, 0.2, 0]} fov={40} />
            <KibbleBurst progress={lf / 29} origin={[0, 0.3, 0]} count={200} spread={0.7} />
          </>
        )}
      </Stage>
    </AbsoluteFill>
  );
}
