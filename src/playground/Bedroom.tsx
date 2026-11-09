/**
 * Playground for lib/sets/Bedroom (30-frame segments):
 *  0 night wide · 1 dawn wide + lamp · 2 cops + rain + open window · 3 bed tilting (front) · 4 LED clock close-up ·
 *  5 printer feed/error/padlock · 6 talking pillow (sat up) · 7 day + CRT TV · 8 diorama (front/right walls hidden) ·
 *  9 hammer rack glow · 10 bed tilting (side, pistons) · 11 cosy lamp night · 12 dawn window open · 13 diorama (left) ·
 *  14-15 BEDROOM_SPOTS markers (feeder box, hammer on hook, sit/lie/stand capsules, anchors)
 * Render: node scripts/still.mjs play Bedroom --frames=10,45,64,100,118,145,175,205,235,265,290,318,328,345,375,405,435,465
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {Bedroom, BEDROOM_SPOTS as S, TimeOfDay, BedroomPiece} from '../lib/sets/Bedroom';
import {makeTestPatternTexture} from '../lib/props/CRTTV';
import {ramp} from '../lib/time';
import {C} from '../lib/palette';

export const duration = 480;

type V3 = [number, number, number];
type Cam = {position: V3; target: V3; fov: number};
type Shot = {cam: Cam; time: TimeOfDay; hideWalls?: ('front' | 'left' | 'right')[]; hide?: BedroomPiece[]};

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** Debug stand-ins at the documented BEDROOM_SPOTS. */
const Markers: React.FC = () => (
  <group>
    <mesh position={add(S.feeder, [0, 0.17, 0])}>
      <boxGeometry args={[0.42, 0.34, 0.32]} />
      <meshToonMaterial color="#eaf6ff" />
    </mesh>
    <mesh position={add(S.feeder, [0, 0.38, 0.1])}>
      <boxGeometry args={[0.08, 0.08, 0.04]} />
      <meshToonMaterial color={C.alertRed} />
    </mesh>
    {/* hammer: handle along Z resting on the pegs, head at +Z end */}
    <mesh position={add(S.hammerHook, [0, 0.018, 0])} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
      <meshToonMaterial color="#9a6a3a" />
    </mesh>
    <mesh position={add(S.hammerHook, [0, 0.018, 0.23])}>
      <boxGeometry args={[0.05, 0.16, 0.06]} />
      <meshToonMaterial color="#3a3a44" />
    </mesh>
    <mesh position={add(S.guySitOnBed, [0, 0.85, 0])}>
      <capsuleGeometry args={[0.18, 0.45, 4, 10]} />
      <meshToonMaterial color={C.tangerine} />
    </mesh>
    <mesh position={add(S.guyStand, [0, 0.9, 0])}>
      <capsuleGeometry args={[0.2, 1.4, 4, 10]} />
      <meshToonMaterial color={C.tangerine} />
    </mesh>
    <mesh position={add(S.guyLieInBed, [0, 0, -0.9])} rotation={[Math.PI / 2, 0, 0]}>
      <capsuleGeometry args={[0.15, 1.5, 4, 10]} />
      <meshToonMaterial color={C.lime} />
    </mesh>
    {[S.tvScreen, S.printerSlot, S.clockFace, S.windowSill, S.doorInside, S.dogBed, S.lampBulb].map((p, i) => (
      <mesh key={i} position={p}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshBasicMaterial color={C.bubblegum} />
      </mesh>
    ))}
  </group>
);

export default function BedroomPlayground() {
  const f = useCurrentFrame();
  const bars = useMemo(() => makeTestPatternTexture(), []);
  const seg = Math.floor(f / 30);
  const shots: Shot[] = [
    {cam: S.cameraWide, time: 'night'},
    {cam: S.cameraWideLeft, time: 'dawn'},
    {cam: S.cameraWindow, time: 'night'},
    {cam: S.cameraBed, time: 'night'},
    {cam: S.cameraClock, time: 'night'},
    {cam: S.cameraPrinter, time: 'night'},
    {cam: {position: [0.05, 1.3, -0.45], target: S.pillowSitting, fov: 40}, time: 'night'},
    {cam: S.cameraTV, time: 'day'},
    {cam: S.cameraDiorama, time: 'night', hideWalls: ['front', 'right'], hide: ['outside']},
    {cam: S.cameraHammer, time: 'night'},
    {cam: {position: [1.05, 0.72, -0.35], target: [-0.6, 0.62, -1.35], fov: 50}, time: 'night'},
    {cam: S.cameraWideLeft, time: 'night'},
    {cam: S.cameraWindow, time: 'dawn'},
    {cam: {position: [-4.4, 4.1, 5.4], target: [0, 0.6, -0.3], fov: 42}, time: 'day', hideWalls: ['front', 'left'], hide: ['outside']},
    {cam: {position: [0.4, 3.6, 4.6], target: [0, 0.5, -0.5], fov: 50}, time: 'day', hideWalls: ['front'], hide: ['outside']},
    {cam: {position: [-1.2, 1.55, 0.1], target: S.hammerHook, fov: 45}, time: 'day'},
  ];
  const shot = shots[Math.min(seg, shots.length - 1)];
  const tilt = seg === 3 ? ramp(f, 95, 125) : seg === 10 ? ramp(f, 300, 326) : seg === 6 ? 1 : 0;
  const talk = seg === 6 || seg === 3 || seg === 10 ? 0.9 : 0;
  const feed = seg === 5 ? interpolate(f, [150, 172], [0.1, 0.65], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  return (
    <AbsoluteFill>
      <Stage background={C.night} env="chrome">
        <CameraRig position={shot.cam.position} target={shot.cam.target} fov={shot.cam.fov} />
        <Bedroom
          time={shot.time}
          frame={f}
          lamp={seg === 1 || seg === 11 ? 1 : 0}
          copLights={seg === 2 ? 1 : 0}
          rainOnWindow={seg === 2}
          moon={seg === 2 ? 0.5 : 1}
          windowOpen={seg === 2 ? 0.6 : seg === 12 ? 1 : 0}
          hideWalls={shot.hideWalls ?? []}
          hide={shot.hide ?? []}
          hammerGlow={seg === 9 ? 0.8 : 0}
          bed={{tilt}}
          pillow={{talk}}
          clock={{text: '3:15'}}
          printer={{feed, error: seg === 5 && f > 165 ? 1 : 0, locked: true}}
          tv={{screen: bars, power: seg === 0 || seg === 11 ? 0 : 1, static: seg === 8 ? 0.6 : 0}}
        >
          {seg >= 14 ? <Markers /> : null}
        </Bedroom>
      </Stage>
    </AbsoluteFill>
  );
}
