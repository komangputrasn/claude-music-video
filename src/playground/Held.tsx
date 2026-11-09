/**
 * Held playground — verifies the hand/hook adapters in src/lib/props/Held.tsx against the Guy rig.
 *   0–29   HeldHammer through guyHammerSwing (side view), lime marker = GUY.hammerImpact, pink = real face (HELD.hammerFace)
 *   30–59  HeldPhone at the ear (guyPhoneToEar), close-up 3/4
 *   60–89  HeldBook with guyHoldUp (front)
 *   90–119 HungHammer on the bedroom's wall rack (BEDROOM_SPOTS.hammerHook)
 *   node scripts/still.mjs play Held --frames=5,10,15,40,50,70,85,95,110
 */
import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {Guy, GUY, guyHammerSwing, guyPhoneToEar, guyHoldUp, guyPoint, guyJointMatrix, mergePose} from '../lib/characters/Guy';
import {HeldHammer, HeldPhone, HeldBook, HungHammer, HELD} from '../lib/props';
import {Bedroom, BEDROOM_SPOTS as S} from '../lib/sets/Bedroom';

export const duration = 120;
type V3 = [number, number, number];

const Lights: React.FC = () => (
  <>
    <hemisphereLight args={['#dfefff', '#4a3a6a', 0.8]} />
    <directionalLight position={[2.5, 4, 3]} intensity={2.1} color="#fff4e6" />
    <directionalLight position={[-3, 2.5, -3]} intensity={1.2} color="#7fd8ff" />
  </>
);
const Marker: React.FC<{p: V3; color: string}> = ({p, color}) => (
  <mesh position={p}><octahedronGeometry args={[0.025]} /><meshBasicMaterial color={color} /></mesh>
);

export default function HeldPlayground() {
  const f = useCurrentFrame();
  const t = f / 30;
  let body: React.ReactNode;
  if (f < 30) {
    const p = Math.min(1, (f % 30) / 20);
    const pose = guyHammerSwing(p);
    const face = new THREE.Vector3(...HELD.hammerFace).applyMatrix4(guyJointMatrix(pose, 'gripR', {R: true}));
    body = (
      <>
        <CameraRig position={[3.2, 1.2, 0.6]} target={[0, 0.95, 0.3]} fov={40} />
        <Guy pose={pose} rightHand={<HeldHammer glow={0.3} />} />
        <Marker p={GUY.hammerImpact} color="#9BFF3A" />
        <Marker p={[face.x, face.y, face.z]} color="#FF4FB8" />
      </>
    );
  } else if (f < 60) {
    const pose = mergePose(guyPhoneToEar(t), {expression: 'angry', mouthOpen: 0.4});
    const e = guyPoint(pose, 'eyes');
    body = (
      <>
        <CameraRig position={f < 45 ? [e[0] - 0.9, e[1] + 0.05, e[2] + 0.35] : [e[0] - 0.35, e[1] + 0.1, e[2] + 1.1]} target={[e[0] - 0.12, e[1] - 0.05, e[2]]} fov={f < 45 ? 30 : 34} />
        <Guy pose={pose} rightHand={<HeldPhone open={1} screenLines={['MOTORCO', 'ON HOLD', '00:37:12']} />} />
      </>
    );
  } else if (f < 90) {
    const pose = guyHoldUp(f < 75 ? 0 : 1, t);
    const g = guyPoint(pose, 'gripR');
    const close = f % 15 >= 8;
    body = (
      <>
        <CameraRig position={close ? [g[0] + 0.25, g[1] + 0.05, g[2] + 1.0] : [0.3, 1.5, 3.4]} target={close ? g : [0, 1.45, 0]} fov={close ? 35 : 42} />
        <Guy pose={pose} rightHand={<HeldBook />} />
      </>
    );
  } else {
    body = (
      <>
        <CameraRig position={[f < 105 ? -1.2 : -1.55, 1.6, -0.3]} target={S.hammerHook} fov={f < 105 ? 34 : 18} />
        <Bedroom time="dawn" frame={f} hammerGlow={0.5} hide={['outside']}>
          <HungHammer position={S.hammerHook} glow={0.4} />
        </Bedroom>
      </>
    );
  }
  return (
    <AbsoluteFill>
      <Stage background="#2a4bb8" env="chrome">
        {f < 90 ? <Lights /> : null}
        {body}
      </Stage>
    </AbsoluteFill>
  );
}
