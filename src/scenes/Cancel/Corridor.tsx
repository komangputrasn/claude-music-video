// Shots C1–C2 (signature 1): "page after page with nowhere to go" — an endless corridor of cancel-flow web pages.
// C1: POV flight; a hand cursor clicks "Next >", the page splits open like double doors, the camera lunges on every beat
//     (and skips more pages per beat as it accelerates). C2: the Guy sprinting toward camera on the page treadmill, stopping
//     dead on "go" — fisheye push into his exhausted face.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {CameraRig, SpeedLines} from '../../lib/three';
import {Guy, guyRun, guyIdle, mergePose, mixPose} from '../../lib/characters/Guy';
import {HeldHammer, HeldPhone} from '../../lib/props';
import {Popup3D, POPUP_MESSAGES, Cursor3D, clickAt} from '../../lib/ui';
import {lerp} from '../../lib/time';
import {SHOT, W} from './times';
import {pageTexture, wallTexture, floorTexture, ceilTexture} from './textures';
import {V3, lin, smooth, easeOutCubic} from './kit';

export const CW = 7; // corridor width
export const CH = 4.5; // page height = corridor height
const G = 9; // gate spacing
const LEN = 420;
export const FOG = {color: '#c9d8f7', near: 22, far: 85};
export const CORRIDOR_BLOOM = {strength: 0.22, radius: 0.35, threshold: 0.97};

// ------------------------------------------------------------------ static corridor shell (unlit, fogged)
const Shell: React.FC<{z0: number}> = ({z0}) => {
  const mats = useMemo(() => {
    const floor = floorTexture().clone();
    floor.repeat.set(CW / 1.75, LEN / 1.75);
    floor.needsUpdate = true;
    const ceil = ceilTexture().clone();
    ceil.repeat.set(CW / 3.5, LEN / 3.5);
    ceil.needsUpdate = true;
    const wl = wallTexture(0).clone();
    wl.repeat.set(LEN / (CH * 2), 1);
    wl.needsUpdate = true;
    const wr = wallTexture(1).clone();
    wr.repeat.set(LEN / (CH * 2), 1);
    wr.needsUpdate = true;
    return {
      floor: new THREE.MeshBasicMaterial({map: floor, color: '#d9e2f2'}),
      ceil: new THREE.MeshBasicMaterial({map: ceil, color: '#e6ecf8'}),
      wl: new THREE.MeshBasicMaterial({map: wl, color: '#d6dff0'}),
      wr: new THREE.MeshBasicMaterial({map: wr, color: '#d6dff0'}),
    };
  }, []);
  const zc = z0 - LEN / 2 + 20;
  return (
    <group>
      <mesh material={mats.floor} position={[0, 0, zc]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CW, LEN]} />
      </mesh>
      <mesh material={mats.ceil} position={[0, CH + 0.05, zc]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CW, LEN]} />
      </mesh>
      <mesh material={mats.wl} position={[-CW / 2, CH / 2, zc]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[LEN, CH + 0.1]} />
      </mesh>
      <mesh material={mats.wr} position={[CW / 2, CH / 2, zc]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[LEN, CH + 0.1]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ a page gate (double doors)
const doorGeo = (side: -1 | 1) => {
  const g = new THREE.PlaneGeometry(CW / 2, CH);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, side < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
  g.translate((-side * CW) / 4, CH / 2, 0);
  return g;
};
let DOORS: {L: THREE.BufferGeometry; R: THREE.BufferGeometry} | null = null;
const doors = () => (DOORS ??= {L: doorGeo(-1), R: doorGeo(1)});
const doorMatCache = new Map<number, THREE.MeshBasicMaterial>();
const doorMat = (page: number) => {
  let m = doorMatCache.get(page);
  if (!m) {
    m = new THREE.MeshBasicMaterial({map: pageTexture(page), side: THREE.DoubleSide, color: '#e9eef8'});
    doorMatCache.set(page, m);
  }
  return m;
};
const frameMat = new THREE.MeshBasicMaterial({color: '#0a3fd8'});

/** open: 0 closed .. 1 swung ~100° away from the camera */
export const PageGate: React.FC<{z: number; page: number; open: number}> = ({z, page, open}) => {
  const a = smooth(open) * 1.75;
  const d = doors();
  return (
    <group position={[0, 0, z]}>
      <group position={[-CW / 2, 0, 0]} rotation={[0, a, 0]}>
        <mesh geometry={d.L} material={doorMat(page)} />
      </group>
      <group position={[CW / 2, 0, 0]} rotation={[0, -a, 0]}>
        <mesh geometry={d.R} material={doorMat(page)} />
      </group>
      {/* door-frame jambs + lintel in title-bar blue */}
      <mesh material={frameMat} position={[-CW / 2 + 0.06, CH / 2, 0]}>
        <boxGeometry args={[0.14, CH + 0.1, 0.3]} />
      </mesh>
      <mesh material={frameMat} position={[CW / 2 - 0.06, CH / 2, 0]}>
        <boxGeometry args={[0.14, CH + 0.1, 0.3]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ floating 3D dialogs along the walls (parallax)
const WALL_POPS = Array.from({length: 26}, (_, i) => {
  const side = i % 2 ? 1 : -1;
  const specs = [POPUP_MESSAGES[1], POPUP_MESSAGES[18], POPUP_MESSAGES[19], POPUP_MESSAGES[11], POPUP_MESSAGES[2], POPUP_MESSAGES[5], POPUP_MESSAGES[3],
    POPUP_MESSAGES[14]];
  return {
    spec: specs[i % specs.length],
    pos: [side * (CW / 2 - 0.55), 2.9 + ((i * 7) % 5) * 0.18, -4 - i * 4.1] as V3,
    rot: [0, -side * 1.05, ((i * 13) % 7 - 3) * 0.03] as V3,
  };
});

// ------------------------------------------------------------------ C1: POV flight
const station = (g: number) => -G * (g + 1) + 4.6;
type Lunge = {beat: number; to: number};
const LUNGES: Lunge[] = [
  {beat: SHOT.C1, to: 1},
  {beat: 203, to: 2},
  {beat: 219, to: 4},
  {beat: 234, to: 7},
];
const lungeDur = (n: number) => 8 + 3 * (n - 1);

export const c1CamZ = (f: number) => {
  let z = station(0) + 2.5; // just before the first gate when the shot opens
  let from = 0;
  let zFrom = z;
  for (const L of LUNGES) {
    const n = L.to - from;
    const a = L.beat - 3, b = a + lungeDur(n);
    const zTo = station(L.to);
    if (f < a) {
      // creep toward the next page while waiting for the click
      return zFrom - 0.9 * easeOutCubic(lin(f, a - 14, a)) * (from === 0 ? 0 : 1);
    }
    if (f < b) {
      const k = lin(f, a, b);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      return lerp(zFrom - (from === 0 ? 0 : 0.9), zTo, e);
    }
    from = L.to;
    zFrom = zTo;
    z = zTo;
  }
  return z - 0.6 * lin(f, LUNGES[LUNGES.length - 1].beat + 10, SHOT.C2);
};
const c1Speed = (f: number) => Math.abs(c1CamZ(f + 1) - c1CamZ(f - 1)) / 2;

export const ShotC1: React.FC<{f: number; t: number}> = ({f, t}) => {
  const camZ = c1CamZ(f);
  const speed = c1Speed(f);
  const bob = Math.sin(f * 0.9) * 0.02 * Math.min(1, speed);
  const roll = Math.sin(f * 0.13) * 0.025 + (speed > 0.3 ? Math.sin(f * 0.7) * 0.01 : 0);
  // which gate are we waiting at? -> cursor clicks its Next button
  const waiting = LUNGES.find((L) => f < L.beat - 3 + 2);
  const gates: React.ReactNode[] = [];
  for (let g = 1; g <= 14; g++) {
    const z = -G * g;
    const d = camZ - z; // distance to the gate ahead
    if (d < -6 || d > 75) continue;
    const open = Math.max(lin(d, 4.0, 1.2), d < 0 ? 1 : 0);
    gates.push(<PageGate key={g} z={z} page={g - 1} open={open} />);
  }
  let cursor: React.ReactNode = null;
  if (waiting && waiting.beat !== SHOT.C1) {
    const gIdx = LUNGES[LUNGES.indexOf(waiting) - 1].to + 1;
    const z = -G * gIdx;
    const clickF = waiting.beat - 9;
    const arrive = easeOutCubic(lin(f, clickF - 12, clickF - 2));
    cursor = (
      <Cursor3D kind="hand" size={0.55} click={clickAt(f, clickF, 10)}
        position={[lerp(2.4, 1.18, arrive), lerp(-0.2, 0.56, arrive), z + 0.12]} rotation={[0, 0, 0.1]} />
    );
  }
  return (
    <>
      <CameraRig position={[0.0, 1.62 + bob, camZ]} target={[0.15, 1.45, camZ - 10]} fov={58 + speed * 6} roll={roll} />
      <Shell z0={10} />
      {gates}
      {WALL_POPS.filter((p) => p.pos[2] < camZ + 2 && p.pos[2] > camZ - 60).map((p, i) => (
        <Popup3D key={i} spec={p.spec} width={1.9} position={p.pos} rotation={p.rot} gloss={0.2} />
      ))}
      {cursor}
      <SpeedLines intensity={Math.min(1, speed * 1.4)} time={t} color="#1E5BFF" blend="normal" opacity={0.45} inner={0.5} count={90} />
      <hemisphereLight args={['#ffffff', '#9fb7ff', 1.2]} />
      <directionalLight position={[2, 4, 3]} intensity={1.2} />
    </>
  );
};

// ------------------------------------------------------------------ C2: the Guy on the page treadmill
const G2 = 6.5;
const STOP = Math.round(W.go) + 1; // he stops dead on "go"
/** world shift (m) — sprinting, then a skid to a stop on "go" */
const c2Shift = (f: number) => {
  const a = SHOT.C2;
  const v = 9.5 / 30; // m per frame
  if (f <= STOP - 4) return (f - a) * v;
  const k = lin(f, STOP - 4, STOP + 6);
  return (STOP - 4 - a) * v + v * 10 * (k - (k * k) / 2);
};

export const ShotC2: React.FC<{f: number; t: number}> = ({f, t}) => {
  const shift = c2Shift(f);
  const stopK = smooth(lin(f, STOP - 3, STOP + 5));
  const run = mergePose(guyRun(t, 1.5), {expression: 'yell', mouthOpen: 0.55, run: 1, headPitch: -0.32, eyesY: 0.2});
  const tired = mergePose(guyIdle(t), {
    expression: 'sad', torsoBend: 0.42, headPitch: -0.38, mouthOpen: 0.35 + 0.15 * Math.sin(f * 0.8), shrug: 0.25,
    legL: {hipX: 0.25, knee: 0.45, hipZ: 0.1}, legR: {hipX: 0.25, knee: 0.45, hipZ: 0.1},
    armL: {shoulderX: 0.55, elbow: 0.4, shoulderZ: 0.25}, armR: {shoulderX: 0.55, elbow: 0.4, shoulderZ: 0.25},
    eyesY: 0.4, blink: 0,
  });
  const pose = mixPose(run, tired, stopK);
  const push = easeOutCubic(lin(f, STOP - 1, STOP + 9));
  const camA: V3 = [0.45, 1.2, 3.6];
  const camB: V3 = [0.12, 1.36, 1.25];
  const cam: V3 = [lerp(camA[0], camB[0], push), lerp(camA[1], camB[1], push) + Math.sin(f * 1.6) * 0.02 * (1 - stopK), lerp(camA[2], camB[2], push)];
  const tgt: V3 = [0, lerp(1.15, 1.12, push), lerp(-2, 0, push)];
  // gates are laid out so that when he stops, "Page 37 of \u221e" stands closed 4.5 m behind him
  const SHIFT_END = c2Shift(STOP + 8);
  const gates: React.ReactNode[] = [];
  for (let j = -4; j < 11; j++) {
    const z = -4.5 - G2 * j + (SHIFT_END - shift);
    if (z < -70 || z > cam[2] - 0.2) continue;
    const open = z > -1.4 ? 1 : lin(z, -3.6, -1.4);
    gates.push(<PageGate key={j} z={z} page={j === 0 ? 7 : ((j % 7) + 7) % 7} open={open} />);
  }
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={lerp(50, 74, push)} roll={lerp(0.02, -0.06, push)} />
      <group position={[0, 0, -shift]}>
        <Shell z0={40} />
        {WALL_POPS.map((p, i) => (p.pos[2] + 30 - shift > -60 && p.pos[2] + 30 - shift < 8 ? (
          <Popup3D key={i} spec={p.spec} width={1.9} position={[p.pos[0], p.pos[1], p.pos[2] + 30]} rotation={p.rot} gloss={0.2} />
        ) : null))}
      </group>
      {gates}
      <Guy pose={pose} rotation={[0, 0, 0]} rightHand={<HeldPhone open={1} screenLines={['PAGE 37', 'OF ∞']} screenColor="#8FD3FF" />}
        leftHand={<HeldHammer glow={0.2} />} />
      <SpeedLines intensity={0.7 * (1 - stopK)} time={t} color="#1E5BFF" blend="normal" opacity={0.4} inner={0.55} count={80} />
      <hemisphereLight args={['#ffffff', '#9fb7ff', 1.2]} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} />
    </>
  );
};
