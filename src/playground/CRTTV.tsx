/**
 * Playground for lib/props/CRTTV: off -> power-on (dot, line, open) -> test pattern -> snow -> power-off collapse to a dot.
 * Render: node scripts/still.mjs play CRTTV --frames=0,13,17,21,26,45,75,100,116,121,125,129
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {CRTTV, CRT_SCREEN, makeTestPatternTexture} from '../lib/props/CRTTV';
import {TBox} from '../lib/sets/bedroom/ink';
import {C} from '../lib/palette';

export const duration = 150;

export default function CRTTVPlayground() {
  const f = useCurrentFrame();
  const bars = useMemo(() => makeTestPatternTexture(), []);
  const power =
    f < 10 ? 0 : f < 30 ? interpolate(f, [10, 30], [0, 1]) : f < 110 ? 1 : f < 130 ? interpolate(f, [110, 130], [1, 0]) : 0;
  const snow = interpolate(f, [60, 68, 84, 90], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const [sx, sy, sz] = CRT_SCREEN.center;
  const top = 0.75;
  // camera per segment: 3/4 wide, straight close-up, low 3/4, side, close-up dot
  const cam: {p: [number, number, number]; t: [number, number, number]; fov: number} =
    f < 30
      ? {p: [0.15, top + sy + 0.05, 1.35], t: [0, top + sy, 0], fov: 38}
      : f < 60
        ? {p: [1.25, top + 0.75, 1.6], t: [0, top + 0.3, 0], fov: 40}
        : f < 90
          ? {p: [-0.55, top + 0.25, 0.95], t: [0, top + sy, 0.1], fov: 48}
          : f < 110
            ? {p: [1.6, top + 0.45, -0.6], t: [0, top + 0.3, 0], fov: 42}
            : {p: [0, top + sy, sz + 0.75], t: [0, top + sy, 0], fov: 36};
  return (
    <AbsoluteFill>
      <Stage background={C.night} env="chrome" camera={{fov: 40}}>
        <CameraRig position={cam.p} target={cam.t} fov={cam.fov} />
        <hemisphereLight args={['#8fa8ff', '#1a1030', 0.9]} />
        <directionalLight position={[2, 3, 2]} intensity={1.6} color="#cfe0ff" />
        <directionalLight position={[-3, 1, -2]} intensity={1.4} color={C.bubblegum} />
        {/* floor + little table */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshToonMaterial color="#1b2050" />
        </mesh>
        <TBox size={[1.0, 0.75, 0.6]} r={0.02} color="#c98a4b" position={[0, 0.375, 0]} />
        <CRTTV position={[0, top, 0]} screen={bars} power={power} static={snow} frame={f} />
        {/* a second, charcoal TV in the background, always on with snow */}
        <TBox size={[0.8, 0.6, 0.6]} r={0.02} color="#6a4bd8" position={[-1.6, 0.3, -1.2]} />
        <CRTTV position={[-1.6, 0.6, -1.2]} rotation={[0, 0.5, 0]} color="#4a4f5c" static={1} frame={f} antenna={false} glow={1.2} />
      </Stage>
    </AbsoluteFill>
  );
}
