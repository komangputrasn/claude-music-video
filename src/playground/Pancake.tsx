/**
 * Playground: Pancake the dog. 6 segments of 60 frames:
 *   0 standing idle, 3/4 view · 1 side walk cycle (tracking) · 2 sitting begging, puppy-eyes close-up
 *   3 eating from a bowl · 4 happy wag + hops · 5 wide lineup (all eye styles, lie/sit/eat) for wide-shot readability
 *   6 pose blending (mixPose): idle -> sit/beg -> lie (sleepy) -> happy, 3/4 side view
 *   7 face close-up, normal 'open' eyes with a blink + head turn · 8 low hero angle: eating from the bowl (finale shot)
 * Render: node scripts/still.mjs play Pancake --frames=10,40,70,100,130,160,190,220,250,280,310,340,370,400,430,460,490,520
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Stage, CameraRig} from '../lib/three/Stage';
import {InkMesh} from '../lib/characters/InkMesh';
import {
  Pancake, PANCAKE, pancakeIdle, pancakeWalk, pancakeBeg, pancakeEat, pancakeHappy, pancakeLie, pancakeSad, pancakeAnchor, mixPose,
} from '../lib/characters/Pancake';
import {ramp} from '../lib/time';

export const duration = 540;
const SEG = 60;

const Floor: React.FC = () => {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d')!;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#5d74d8' : '#8ea2f0';
        g.fillRect(x * 32, y * 32, 32, 32);
      }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12, 12);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <planeGeometry args={[24, 24]} />
      <meshToonMaterial map={tex} />
    </mesh>
  );
};

/** stand-in bowl for the playground only (the real DogBowl lives in another module) */
const Bowl: React.FC<{position: [number, number, number]; full?: number}> = ({position, full = 1}) => {
  const geo = useMemo(() => {
    const pts = [
      [0.0, 0.0], [0.13, 0.0], [0.15, 0.015], [0.165, 0.07], [0.17, 0.085], [0.155, 0.088], [0.14, 0.03], [0.0, 0.03],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 28);
  }, []);
  const kib = useMemo(() => new THREE.SphereGeometry(0.016, 6, 5), []);
  return (
    <group position={position}>
      <InkMesh geometry={geo} color="#d9dcef" outline={0.006} />
      <mesh position={[0, 0.072, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.16, 0.008, 6, 28]} />
        <meshToonMaterial color="#1E5BFF" />
      </mesh>
      {Array.from({length: 26}, (_, i) => {
        const a = i * 2.4, r = 0.11 * Math.sqrt((i + 0.5) / 26);
        return <mesh key={i} geometry={kib} position={[Math.cos(a) * r, 0.04 + full * 0.02 + (i % 3) * 0.006, Math.sin(a) * r]}>
          <meshToonMaterial color={i % 2 ? '#8a4a1e' : '#a85e26'} />
        </mesh>;
      })}
    </group>
  );
};

export default function PancakePlayground() {
  const f = useCurrentFrame();
  const seg = Math.min(8, Math.floor(f / SEG));
  const lf = f - seg * SEG;
  const t = lf / 30 + seg * 1.7;

  let cam: {position: [number, number, number]; target: [number, number, number]; fov: number} = {position: [1.4, 0.8, 1.9], target: [0, 0.4, 0], fov: 38};
  let body: React.ReactNode = null;

  if (seg === 0) {
    const a = 0.75 + lf * 0.004;
    cam = {position: [Math.sin(a) * 2.3, 0.85, Math.cos(a) * 2.3], target: [0, 0.38, 0], fov: 34};
    body = <Pancake pose={pancakeIdle(t)} />;
  } else if (seg === 1) {
    const speed = 0.45;
    const x = -0.4 + (lf / 30) * speed;
    cam = {position: [x + 0.1, 0.42, 2.2], target: [x + 0.1, 0.36, 0], fov: 32};
    body = <Pancake position={[x, 0, 0]} rotation-y={Math.PI / 2} pose={pancakeWalk(lf / 30, speed)} />;
  } else if (seg === 2) {
    const h = PANCAKE.headSitLocal;
    cam = {position: [0.06, h[1] + 0.5 - lf * 0.002, h[2] + 0.95 - lf * 0.004], target: [0, h[1] - 0.02, h[2]], fov: 34};
    // the "hungry and lonely" beat: a single tear forms late in the shot
    body = <Pancake pose={{...pancakeBeg(t), tear: ramp(lf, 20, 58, (x) => x)}} />;
  } else if (seg === 3) {
    cam = {position: [1.05, 0.85, 1.25], target: [0, 0.25, 0.2], fov: 36};
    body = (
      <>
        <Pancake pose={pancakeEat(t)} />
        <Bowl position={PANCAKE.bowl} />
      </>
    );
  } else if (seg === 4) {
    cam = {position: [0.75, 0.38, 1.55], target: [0, 0.45, 0], fov: 36};
    body = <Pancake pose={pancakeHappy(t)} rotation-y={0.25} />;
  } else if (seg === 6) {
    // idle -> beg -> lie -> happy, each transition ~8 frames
    const k1 = ramp(lf, 4, 14), k2 = ramp(lf, 22, 32), k3 = ramp(lf, 42, 50);
    let p = mixPose(pancakeIdle(t), pancakeBeg(t), k1);
    p = mixPose(p, pancakeLie(t, true), k2);
    p = mixPose(p, pancakeHappy(t, 0, false), k3);
    cam = {position: [1.9, 0.6, 1.0], target: [0, 0.3, 0.05], fov: 34};
    body = <Pancake pose={p} />;
  } else if (seg === 7) {
    const blink = Math.max(0, 1 - Math.abs(lf - 30) / 4);
    const h = PANCAKE.headLocal;
    cam = {position: [0.32, h[1] + 0.06, h[2] + 0.85], target: [0, h[1] - 0.04, h[2]], fov: 30};
    body = <Pancake pose={{...pancakeIdle(t), headYaw: 0.35 * Math.sin(lf / 18), blink, earPerk: 0.2}} />;
  } else if (seg === 8) {
    cam = {position: [0.75 - lf * 0.004, 0.22, 1.25 - lf * 0.004], target: [0, 0.2, 0.3], fov: 36};
    body = (
      <>
        <Pancake pose={pancakeEat(t)} />
        <Bowl position={PANCAKE.bowl} />
      </>
    );
  } else {
    cam = {position: [0, 1.5, 6.2], target: [0, 0.35, 0], fov: 36};
    body = (
      <>
        <Pancake position={[-2.0, 0, 0]} rotation-y={0.5} pose={pancakeSad(t)} outlineScale={1.5} />
        <Pancake position={[-1.0, 0, 0.2]} rotation-y={0.2} pose={pancakeBeg(t)} outlineScale={1.5} />
        <Pancake position={[0, 0, 0.3]} pose={pancakeHappy(t, 0.5)} outlineScale={1.5} />
        <Pancake position={[1.0, 0, 0.2]} rotation-y={-0.3} pose={pancakeLie(t, true)} outlineScale={1.5} />
        <group position={[2.0, 0, -0.1]} rotation-y={-0.6}>
          <Pancake pose={pancakeEat(t)} outlineScale={1.5} />
          <Bowl position={PANCAKE.bowl} />
        </group>
      </>
    );
  }
  // anchor check: a tiny lime marker just off the nose tip in the begging close-up
  const nose = pancakeAnchor(pancakeBeg(t), 'nose');

  return (
    <AbsoluteFill style={{background: '#4a8dff'}}>
      <Stage background="#3f7dff" env="sky" bloom={{strength: 0.45}}>
        <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
        <hemisphereLight args={['#cfe4ff', '#4a3a6a', 0.75]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.0} color="#fff1dc" />
        <directionalLight position={[-3, 2, -3]} intensity={1.3} color="#7fe8ff" />
        <Floor />
        {body}
        {seg === 2 ? (
          <mesh position={[nose[0], nose[1] + 0.045, nose[2] + 0.01]}>
            <octahedronGeometry args={[0.008, 0]} />
            <meshBasicMaterial color="#9BFF3A" />
          </mesh>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
