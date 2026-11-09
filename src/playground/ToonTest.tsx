import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {InkMesh} from '../lib/characters/InkMesh';
export const duration = 30;
export default function ToonTest() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage background="#2a5bd8" env="chrome">
        <CameraRig position={[0, 0.6, 3]} target={[0, 0.3, 0]} fov={40} />
        <hemisphereLight args={['#cfe8ff', '#30204a', 0.8]} />
        <directionalLight position={[2, 3, 2]} intensity={2.5} />
        <InkMesh color="#E9B25E" position={[-0.6, 0.3, 0]} rotation={[0, f * 0.05, 0]}>
          <icosahedronGeometry args={[0.4, 1]} />
        </InkMesh>
        <InkMesh color="#FF8A1E" position={[0.6, 0.3, 0]}>
          <capsuleGeometry args={[0.2, 0.4, 4, 12]} />
        </InkMesh>
      </Stage>
    </AbsoluteFill>
  );
}
