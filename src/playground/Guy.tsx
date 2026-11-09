/**
 * Guy playground — each 30-frame block is one test case:
 *   0   idle 3/4 (with a GUY.height reference pole)    180 expressions A (close-up line-up)
 *   30  walk cycle, side view (phase = local frame/30)  210 expressions B
 *   60  shock face close-up (push-in)                   240 sleepy wake in bed (p = local/29)
 *   90  hammer swing keyframes 0 / .3 / .5 / .75 / 1    270 climb through window 0 / .3 / .6 / 1
 *   120 sitting + phone to ear, talking angrily          300 hold-up / pat dog / shiver / run
 *   150 cheering                                        330 rear 3/4 (0-14) / low-angle hero hold-up (15-29)
 *                                                        360 night rain: wet outfit, shivering, sodium + cop lights
 *                                                        390 hand close-ups: hammer grip (0-14) / phone at ear (15-29)
 * Render: node scripts/still.mjs play Guy --frames=0,40,75,95,130,165,190,220,262,280,310,335,350,375
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {InkMesh} from '../lib/characters/InkMesh';
import {
  Guy, GUY, guyIdle, guyWalk, guyRun, guyHammerSwing, guyCheer, guyPhoneToEar, guySleepyWake, guyClimb, guyHoldUp,
  guyPatDog, guyShiver, mergePose, guyPoint,
} from '../lib/characters/Guy';
import type {GuyExpression, GuyPose} from '../lib/characters/Guy';

export const duration = 420;

/** placeholder "box on a stick": handle along grip +Z, head 0.33 m out, striking face toward -Y */
const Hammer: React.FC = () => (
  <group>
    <InkMesh color="#8a5a2b" outline={0.004} position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.014, 0.016, 0.4, 8]} />
    </InkMesh>
    <InkMesh color="#3a3f48" outline={0.005} position={[0, -0.01, 0.33]}>
      <boxGeometry args={[0.045, 0.15, 0.05]} />
    </InkMesh>
  </group>
);

/** flip-phone placeholder along grip Y, earpiece toward -Y (fingertips) */
const Phone: React.FC = () => (
  <group position={[0.02, -0.02, 0.0]}>
    <InkMesh color="#c9d0dc" outline={0.004}>
      <boxGeometry args={[0.022, 0.11, 0.05]} />
    </InkMesh>
    <mesh position={[0.012, -0.045, 0]}>
      <boxGeometry args={[0.004, 0.012, 0.02]} />
      <meshBasicMaterial color="#9BFF3A" />
    </mesh>
  </group>
);

const Book: React.FC = () => (
  <InkMesh color="#c4202a" outline={0.004} position={[0, -0.02, 0.0]}>
    <boxGeometry args={[0.03, 0.2, 0.14]} />
  </InkMesh>
);

const Floor: React.FC<{color?: string}> = ({color = '#bcd4ff'}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
    <circleGeometry args={[14, 48]} />
    <meshToonMaterial color={color} />
  </mesh>
);

const Lights: React.FC = () => (
  <>
    <hemisphereLight args={['#dfefff', '#4a3a6a', 0.9]} />
    <directionalLight position={[2.5, 4, 3]} intensity={2.2} color="#fff4e6" />
    <directionalLight position={[-3, 2.5, -3]} intensity={1.4} color="#7fd8ff" />
  </>
);

const EXPR_A: GuyExpression[] = ['neutral', 'happy', 'sad', 'angry', 'shock'];
const EXPR_B: GuyExpression[] = ['sleepy', 'determined', 'yell', 'cold', 'neutral'];

type Cam = {position: [number, number, number]; target: [number, number, number]; fov: number};

export default function GuyPlayground() {
  const f = useCurrentFrame();
  const block = Math.floor(f / 30);
  const lf = f % 30;
  const t = f / 30;
  let content: React.ReactNode = null;
  let cam: Cam = {position: [2.2, 1.4, 3.2], target: [0, 0.95, 0], fov: 40};

  if (block === 0) {
    content = (
      <>
        <Guy pose={guyIdle(t)} />
        <mesh position={[-0.7, GUY.height / 2, 0]}>
          <boxGeometry args={[0.03, GUY.height, 0.03]} />
          <meshBasicMaterial color="#ff4fb8" />
        </mesh>
      </>
    );
    cam = {position: [1.9, 1.35, 3.1], target: [0, 0.92, 0], fov: 40};
  } else if (block === 1) {
    content = <Guy pose={{...guyWalk(t), walk: lf / 30}} rotation={[0, Math.PI / 2, 0]} />;
    cam = {position: [0, 1.0, 4.2], target: [0, 0.88, 0], fov: 38};
  } else if (block === 2) {
    content = <Guy pose={{...guyIdle(t), expression: 'shock', blink: 0, eyesX: 0, eyesY: 0.1, headPitch: -0.05, headYaw: 0.15, shrug: 0.7}} />;
    const k = lf / 29;
    cam = {position: [0.22, 1.56, 0.85 - 0.15 * k], target: [0, 1.5, 0], fov: 50};
  } else if (block === 3) {
    const ps = [0, 0.3, 0.5, 0.75, 1];
    content = ps.map((p, i) => (
      <Guy key={i} position={[(i - 2) * 1.3, 0, 0]} rotation={[0, -0.9, 0]} pose={guyHammerSwing(p)} rightHand={<Hammer />} />
    ));
    cam = {position: [0, 1.5, 6.8], target: [0, 0.95, 0], fov: 42};
  } else if (block === 4) {
    const talk = 0.5 + 0.5 * Math.sin(t * 14);
    content = (
      <>
        <Guy pose={mergePose(guyPhoneToEar(t), {sit: 1, expression: 'angry', mouthOpen: talk * 0.6})} rightHand={<Phone />} rotation={[0, -0.45, 0]} />
        <mesh position={[0, GUY.seatHeight / 2, -0.08]} rotation={[0, -0.45, 0]}>
          <boxGeometry args={[0.6, GUY.seatHeight, 0.5]} />
          <meshToonMaterial color="#7a5cff" />
        </mesh>
      </>
    );
    cam = {position: [-0.9, 1.25, 2.4], target: [0.0, 1.0, 0], fov: 40};
  } else if (block === 5) {
    content = <Guy pose={guyCheer(t)} rotation={[0, 0.3, 0]} />;
    cam = {position: [0.8, 1.2, 3.6], target: [0, 1.1, 0], fov: 42};
  } else if (block === 6 || block === 7) {
    const list = block === 6 ? EXPR_A : EXPR_B;
    content = list.map((e, i) => {
      const pose: GuyPose = {expression: e, t, eyesX: 0, blink: block === 7 && i === 4 ? 1 : 0};
      return <Guy key={i} position={[(i - 2) * 0.5, 0, 0]} pose={pose} />;
    });
    cam = {position: [0, 1.52, 2.25], target: [0, 1.5, 0], fov: 33};
  } else if (block === 8) {
    const p = lf / 29;
    content = (
      <>
        <group position={[0, 0.5, 0]}>
          <Guy pose={guySleepyWake(p)} />
        </group>
        <mesh position={[0, 0.25, 0.15]}>
          <boxGeometry args={[1.2, 0.5, 2.2]} />
          <meshToonMaterial color="#4b6fd8" />
        </mesh>
        <mesh position={[0, 0.56, -0.75]}>
          <boxGeometry args={[0.6, 0.12, 0.35]} />
          <meshToonMaterial color="#eef3ff" />
        </mesh>
      </>
    );
    cam = {position: [1.9, 1.6, 1.9], target: [0, 0.85, -0.1], fov: 45};
  } else if (block === 9) {
    const ps = [0, 0.3, 0.6, 1];
    content = ps.map((p, i) => (
      <group key={i} position={[(i - 1.5) * 1.6, 0, 0]}>
        <Guy pose={guyClimb(p)} />
        {/* wall with a window opening: sill top y=1.0, wall from z=0.25..0.45 */}
        <mesh position={[0, 0.5, 0.35]}>
          <boxGeometry args={[1.2, 1.0, 0.2]} />
          <meshToonMaterial color="#e8d9b0" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, 2.25, 0.35]}>
          <boxGeometry args={[1.2, 0.3, 0.2]} />
          <meshToonMaterial color="#e8d9b0" transparent opacity={0.55} />
        </mesh>
      </group>
    ));
    cam = {position: [3.6, 1.8, 5.5], target: [0, 1.0, 0], fov: 45};
  } else if (block === 11) {
    if (lf < 15) {
      content = <Guy pose={mergePose(guyWalk(t), {walkAmount: 0.6, headYaw: 0.5})} rotation={[0, 0.4, 0]} />;
      cam = {position: [-1.6, 1.7, -2.6], target: [0, 1.0, 0], fov: 40};
    } else {
      content = <Guy pose={guyHoldUp(1, t)} rightHand={<Book />} rotation={[0, 0.25, 0]} />;
      cam = {position: [0.5, 0.35, 1.9], target: [0, 1.35, 0], fov: 62};
    }
  } else if (block === 13) {
    if (lf < 15) {
      const pose = guyHammerSwing(0.5);
      content = <Guy pose={pose} rightHand={<Hammer />} />;
      const g = guyPoint(pose, 'gripR', {R: true});
      cam = {position: [g[0] - 0.75, g[1] + 0.25, g[2] + 0.35], target: [g[0], g[1] - 0.05, g[2] + 0.12], fov: 40};
    } else {
      const pose = guyPhoneToEar(t);
      content = <Guy pose={{...pose, expression: 'shock', mouthOpen: 0.3}} rightHand={<Phone />} />;
      cam = {position: [-0.75, 1.5, 0.75], target: [-0.08, 1.45, 0.02], fov: 40};
    }
  } else if (block === 12) {
    return (
      <AbsoluteFill>
        <Stage background="#050A2A" env="night" exposure={1.1}>
          <CameraRig position={[0.9, 1.45, 1.9]} target={[0, 1.2, 0]} fov={42} />
          <hemisphereLight args={['#3a4a8a', '#0a0a1a', 0.5]} />
          <pointLight position={[1.5, 3.2, 1]} intensity={9} distance={8} color="#FFB347" />
          <pointLight position={[-2, 1.5, 1]} intensity={4 + 4 * Math.sin(t * 12)} distance={6} color="#ff2a3a" />
          <pointLight position={[2, 1.5, -1]} intensity={4 - 4 * Math.sin(t * 12)} distance={6} color="#2a5bff" />
          <Floor color="#1a2040" />
          <Guy pose={guyShiver(t)} outfit={{hoodie: '#C8620E', hoodieRib: '#A84E08', jeans: '#2E558F', jeansDark: '#22426F', jeansHem: '#284B80', hair: '#4A2A12'}} rotation={[0, 0.3, 0]} />
        </Stage>
      </AbsoluteFill>
    );
  } else {
    content = (
      <>
        <Guy position={[-1.95, 0, 0]} rotation={[0, 0.3, 0]} pose={guyHoldUp(lf < 15 ? lf / 14 : 1, t)} rightHand={<Book />} />
        <Guy position={[-0.65, 0, 0]} rotation={[0, -1.0, 0]} pose={guyPatDog(t)} />
        <mesh position={[-0.65 - 0.5, 0.3, 0.3]}>
          <sphereGeometry args={[0.28, 12, 8]} />
          <meshToonMaterial color="#E9B25E" />
        </mesh>
        <Guy position={[0.65, 0, 0]} rotation={[0, -0.3, 0]} pose={guyShiver(t)} />
        <Guy position={[1.95, 0, 0]} rotation={[0, -1.2, 0]} pose={guyRun(t)} />
      </>
    );
    cam = {position: [0, 1.5, 6.0], target: [0, 0.95, 0], fov: 42};
  }

  return (
    <AbsoluteFill>
      <Stage background="#2f62e8" env="chrome">
        <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
        <Lights />
        <Floor />
        {content}
      </Stage>
    </AbsoluteFill>
  );
}
