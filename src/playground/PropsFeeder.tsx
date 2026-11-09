/**
 * PropsFeeder — playground for <Feeder>. One 30-frame segment per shot:
 *   0 hero 3/4 locked (LCD message, lock swinging) · 1 LCD + padlock close-up · 2 lid open, unlocked, full hopper (blue LCD)
 *   3 smash sequence + KibbleBurst · 4 lid tears off (lidFly) · 5 blue backlight, shackle opening (lockOpen 1→0)
 *   6 top-down, lid over-rotated (lid=2.1) · 7 3 AM night lighting, orbit (front→back) · 8 lid flung + smash + tear-off
 * Render: node scripts/still.mjs play PropsFeeder --frames=0,30,60,100,135,165,200,215,232,262
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {Feeder, FEEDER} from '../lib/props/Feeder';
import {KibbleBurst} from '../lib/props/Kibble';

export const duration = 270;

export const PropLights: React.FC<{warm?: boolean}> = ({warm}) => (
  <>
    <hemisphereLight args={['#cfe2ff', '#2a2050', 0.75]} />
    <directionalLight position={[1.6, 3, 2.4]} intensity={2.1} color={warm ? '#ffe2b8' : '#fff6ea'} />
    <directionalLight position={[-2.5, 1.4, -2]} intensity={1.3} color="#6fd6ff" />
  </>
);

export const PropFloor: React.FC<{color?: string}> = ({color = '#3346a8'}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[6, 64]} />
    <meshToonMaterial color={color} />
  </mesh>
);

export default function PropsFeeder() {
  const f = useCurrentFrame();
  const seg = Math.floor(f / 30);
  const lf = f % 30;
  const tt = lf / 29;
  return (
    <AbsoluteFill>
      <Stage background={seg === 7 ? '#050A2A' : '#1d3fb8'} env={seg === 7 ? 'night' : 'chrome'}>
        {seg === 7 ? (
          <>
            <hemisphereLight args={['#2a3c8a', '#0a0a20', 0.5]} />
            <directionalLight position={[-2, 2.5, 1]} intensity={0.9} color="#8fb4ff" />
          </>
        ) : (
          <PropLights />
        )}
        <PropFloor color={seg === 7 ? '#141a40' : undefined} />
        {seg === 0 ? (
          <>
            <CameraRig position={[0.55, 0.42, 0.95]} target={[0, 0.17, 0]} fov={42} />
            <Feeder lcdText="BREAKFAST IS FOR PLUS MEMBERS ONLY" lockShake={0.4} />
          </>
        ) : seg === 1 ? (
          <>
            <CameraRig position={[0.05, 0.16, 0.42]} target={[0, 0.14, 0.17]} fov={45} />
            <Feeder lcdText="UPGRADE TO FEED" lockShake={1} />
          </>
        ) : seg === 2 ? (
          <>
            <CameraRig position={[-0.7, 0.65, 0.9]} target={[0, 0.18, 0]} fov={40} />
            <Feeder lid={1} locked={false} lcdText="BON APPETIT!" lcdColor="#19C6FF" kibbleFill={1} />
          </>
        ) : seg === 3 ? (
          // smash sequence: 90..119
          <>
            <CameraRig position={[0.3, 0.55, 1.35]} target={[0, 0.16, 0]} fov={42} />
            <Feeder smashed={Math.min(1, tt * 1.6)} lid={1.5 * Math.min(1, tt * 3)} lcdText="ERR 0xD06" kibbleFill={0.5} />
            <KibbleBurst progress={tt * 0.8} origin={FEEDER.hopperCenter} count={180} spread={0.8} />
          </>
        ) : seg === 4 ? (
          <>
            <CameraRig position={[0.9, 0.5, 1.4]} target={[0, 0.2, -0.2]} fov={42} />
            <Feeder lidFly={tt} smashed={0.6} lcdText="NO SIGNAL" kibbleFill={0.6} />
          </>
        ) : seg === 5 ? (
          <>
            <CameraRig position={[0, 0.3, 1.1]} target={[0, 0.16, 0]} fov={38} />
            <Feeder lcdText="PLEASE WAIT..." lcdColor="#1E5BFF" lockOpen={1 - tt} rotation={[0, -0.25, 0]} />
          </>
        ) : seg === 6 ? (
          <>
            <CameraRig position={[0.2, 1.3, 0.9]} target={[0, 0.1, 0]} fov={40} />
            <Feeder lid={2.1} locked={false} lcdText="LID ERROR" kibbleFill={0.9} />
          </>
        ) : seg === 7 ? (
          <>
            <CameraRig position={[0.85 * Math.sin(-0.45 + tt * 3.2), 0.45, 0.85 * Math.cos(-0.45 + tt * 3.2)]} target={[0, 0.15, 0]} fov={45} />
            <Feeder lcdText="BREAKFAST IS FOR PLUS MEMBERS ONLY" lockShake={0.3} />
          </>
        ) : (
          <>
            <CameraRig position={[0.9, 0.6, 1.5]} target={[0, 0.25, -0.2]} fov={42} />
            <Feeder lid={1.3 * Math.min(1, tt * 4)} lidFly={Math.max(0, tt * 1.4 - 0.3)} smashed={Math.min(1, tt * 2)} lcdText="ERR" kibbleFill={0.6} />
          </>
        )}
      </Stage>
    </AbsoluteFill>
  );
}
