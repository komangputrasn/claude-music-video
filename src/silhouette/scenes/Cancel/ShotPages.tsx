// Cancel · shot B — 142.86 → 147.33. Line 33: "so it's page after page with nowhere to go."
// A canyon of bureaucracy: two endless walls of filing drawers falling away into the dark. Between them a staircase of
// paper climbs out of the abyss: flights of white sheets, and every landing is the SAME page (TENURE form 14-C,
// "PAGE 1 OF 1", a red CONTINUE button) with the sung line printed on it, on every landing at once. The camera hangs
// above, dead on the axis, looking down the stair (one-point perspective); he climbs toward us, a black shape on
// the white steps, reaches the landing on "nowhere", stops on the page and looks up at the next flight: the same page
// again.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric} from '../../lib/WorldLyric';
import {HeldSilHammer} from '../../lib/props';
import {beatAt} from '../../../lib/time';
import {GuyPose, guyIdle, mixPose, mergePose} from '../../../lib/characters/Guy';
import {ShotProps, Instances, prog, smooth, mix, mixV, rowsPerWord, hash, V3} from './common';
import {pageTexture, buttonGlowTexture, drawerTexture, treadTexture, edgeTexture, PAGE_ASPECT, PAGE_LAYOUT, PAGE_BUTTON_PX, DRAWER_TILE} from './textures';
import {T, L, SHOTS} from './timing';

export const FOG_B = {color: S.void, near: 15, far: 66};

// ------------------------------------------------------------------------------------------------ the stair
const ST = {W: 8, n: 22, r: 0.19, d: 0.32, slab: 0.32, wallX: 7.0};
const LD = ST.W / PAGE_ASPECT; // landing depth = one A-landscape page (8 × 5.66 m)
const RUN = (ST.n - 1) * ST.d; // 6.9
const RISE = ST.n * ST.r; // 5.04
const DZ = LD + RUN;
/** landing k: top at y = k·RISE, from z0 (far edge) to z0 + LD (near edge); the flight from landing k rises toward +Z */
const landing = (k: number) => ({y: k * RISE, z0: k * DZ, z1: k * DZ + LD});
const K_MIN = -6, K_MAX = 1;

const PLANE = new THREE.PlaneGeometry(1, 1);

const useStairMeshes = () =>
  useMemo(() => {
    const treads: THREE.Matrix4[] = [];
    const edges: THREE.Matrix4[] = [];
    const pages: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const qEdge = new THREE.Quaternion();
    for (let k = K_MIN; k <= K_MAX; k++) {
      const Lk = landing(k);
      pages.push(new THREE.Matrix4().compose(new THREE.Vector3(0, Lk.y, (Lk.z0 + Lk.z1) / 2), q, new THREE.Vector3(ST.W, LD, 1)));
      // the near edge of the landing: a ream seen edge-on
      edges.push(new THREE.Matrix4().compose(new THREE.Vector3(0, Lk.y - ST.slab / 2, Lk.z1), qEdge, new THREE.Vector3(ST.W, ST.slab, 1)));
      if (k < K_MAX) {
        for (let i = 1; i < ST.n; i++) {
          const y = Lk.y + i * ST.r;
          const z = Lk.z1 + (i - 0.5) * ST.d;
          treads.push(new THREE.Matrix4().compose(new THREE.Vector3(0, y, z), q, new THREE.Vector3(ST.W, ST.d, 1)));
        }
      }
    }
    return {treads, edges, pages};
  }, []);

const StairOfPages: React.FC = () => {
  const {treads, edges, pages} = useStairMeshes();
  const mats = useMemo(() => {
    const page = new THREE.MeshBasicMaterial({map: pageTexture(), fog: true});
    page.color.setScalar(0.8);
    const tread = new THREE.MeshBasicMaterial({map: treadTexture(), fog: true});
    tread.color.setScalar(0.66);
    const edge = new THREE.MeshBasicMaterial({map: edgeTexture(), fog: true});
    edge.color.setScalar(0.42);
    return {page, tread, edge};
  }, []);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return (
    <>
      <Instances geometry={PLANE} material={mats.page} matrices={pages} />
      <Instances geometry={PLANE} material={mats.tread} matrices={treads} />
      <Instances geometry={PLANE} material={mats.edge} matrices={edges} />
    </>
  );
};

/** The canyon: two walls of filing drawers facing the stair (x = ±wallX), endless up and down. */
const Canyon: React.FC = () => {
  const {mat, len, h, zc, yc} = useMemo(() => {
    const len = 220, h = 160;
    const tex = drawerTexture().clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(len / DRAWER_TILE, h / DRAWER_TILE);
    tex.needsUpdate = true;
    const m = new THREE.MeshBasicMaterial({map: tex, fog: true});
    m.color.setScalar(1.3);
    return {mat: m, len, h, zc: -70, yc: -40};
  }, []);
  useLayoutEffect(() => () => {
    mat.map?.dispose();
    mat.dispose();
  }, [mat]);
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={PLANE} material={mat} position={[s * ST.wallX, yc, zc]} rotation-y={(-s * Math.PI) / 2} scale={[len, h, 1]} />
      ))}
    </>
  );
};

/**
 * Loose pages of the same document tumbling down the canyon, in the gaps between the stair and the walls (never over
 * the printed landings). Deterministic: each sheet falls, sways and tumbles from its own seeded phase.
 */
const SHEETS = 14;
const FallingPages: React.FC<{t: number}> = ({t}) => {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({map: pageTexture(), side: THREE.DoubleSide, fog: true});
    mat.color.setScalar(0.62);
    const m = new THREE.InstancedMesh(PLANE, mat, SHEETS);
    m.frustumCulled = false;
    return m;
  }, []);
  useLayoutEffect(() => () => (mesh.material as THREE.Material).dispose(), [mesh]);
  useLayoutEffect(() => {
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = new THREE.Vector3(1.7, 1.7 / PAGE_ASPECT, 1);
    const p = new THREE.Vector3();
    for (let i = 0; i < SHEETS; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (4.75 + 1.7 * hash(i, 1));
      const z = 6 - 40 * hash(i, 2); // never close to the lens (the camera hangs at z ≈ 16)
      const speed = 0.8 + 0.6 * hash(i, 3);
      const span = 34;
      const y = 10 - ((((t * speed + span * hash(i, 4)) % span) + span) % span) + 0.18 * z;
      const ph = t * (0.5 + 0.5 * hash(i, 5)) + 6.28 * hash(i, 6);
      p.set(x + 0.5 * Math.sin(ph * 0.8), y, z + 0.4 * Math.cos(ph * 0.6));
      e.set(-1.2 + 0.9 * Math.sin(ph), 0.6 * Math.sin(ph * 0.7 + i), 0.5 * Math.cos(ph * 1.1));
      q.setFromEuler(e);
      M.compose(p, q, sc);
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
};

/**
 * The CONTINUE button on every page lights up on the beat (all in sync): the stair beckons. Additive red laid exactly
 * over the printed (dim red) pills, label cut out, one draw call. k ≤ 0.6 tops the pill out at about full authRed:
 * more tone-maps orange, and any spill onto the white paper reads pink.
 */
const ContinueGlow: React.FC<{k: number}> = ({k}) => {
  const {mesh, mat} = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({map: buttonGlowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true});
    const n = K_MAX - K_MIN + 1;
    const mesh = new THREE.InstancedMesh(PLANE, mat, n);
    const B = PAGE_BUTTON_PX;
    const cx = ((B.bx + B.bw / 2) / 2048 - 0.5) * ST.W;
    const cz = ((B.by + B.bh / 2) / 1448) * LD;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const sc = new THREE.Vector3((B.bw / 2048) * ST.W, (B.bh / 1448) * LD, 1);
    for (let k = K_MIN; k <= K_MAX; k++) {
      const Lk = landing(k);
      mesh.setMatrixAt(k - K_MIN, new THREE.Matrix4().compose(new THREE.Vector3(cx, Lk.y + 0.008, Lk.z0 + cz), q, sc));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return {mesh, mat};
  }, []);
  useLayoutEffect(() => () => mat.dispose(), [mat]); // the mask texture is module-cached (textures.ts)
  useLayoutEffect(() => {
    mat.color.set(S.authRed).multiplyScalar(Math.min(0.6, k));
    mesh.visible = k > 0.01;
  });
  return <primitive object={mesh} />;
};

// ------------------------------------------------------------------------------------------------ the climb
const RATE = 2.17; // steps per second
const S0 = ST.n - RATE * (T.nowhere - SHOTS.pages.t0); // he steps onto the landing exactly on "nowhere"
/** treads of the flight below the hero landing (k = −1) */
const FL = landing(-1);
const stepPos = (s: number): V3 => [0, FL.y + s * ST.r, FL.z1 + (s - 0.5) * ST.d];

/** a step-over-step stair climb (feet roughly on the treads; the camera is high, so contact is forgiving) */
const climbPose = (s: number, t: number): GuyPose => {
  const ph = s - Math.floor(s);
  const even = Math.floor(s) % 2 === 0;
  const lift = Math.sin(Math.PI * ph);
  const swing = {hipX: 0.12 + 0.95 * lift, knee: 0.2 + 1.25 * lift, swing: 0};
  const stance = {hipX: 0.5 * (1 - ph) - 0.12 * ph, knee: 0.62 * (1 - ph) + 0.06, swing: 0};
  const armSw = 0.25 * Math.sin(Math.PI * (s % 2));
  return {
    t,
    ground: 0,
    hipsY: -0.07 - 0.04 * lift,
    lean: 0.1,
    torsoBend: 0.12,
    headPitch: 0.22,
    shrug: 0.08,
    legL: even ? swing : stance,
    legR: even ? stance : swing,
    armL: {shoulderX: 0.15 + armSw, shoulderZ: 0.16, elbow: 0.45, swing: 0},
    armR: {shoulderX: 0.1 - armSw, shoulderZ: 0.14, elbow: 0.3, swing: 0},
  };
};

// ------------------------------------------------------------------------------------------------ the shot
const EM = 0.78;
const ROWS = rowsPerWord(L.pages, EM, [[0, 1, 2], [3, 4], [5, 6], [7, 8]], {lineHeight: 1.1});
const LYRIC_Z = LD * PAGE_LAYOUT.lyricTop + 0.7 * EM; // row-0 baseline, from the page's far edge
const INK = '#1b1d21';

export const ShotPages: React.FC<ShotProps> = ({t}) => {
  // the climb, then the step onto the page, then he stands and looks up at the next flight
  const s = Math.min(ST.n, S0 + RATE * (t - SHOTS.pages.t0));
  const onLanding = t >= T.nowhere;
  const walkU = smooth(prog(t, T.nowhere, T.nowhere + 0.55));
  const look = smooth(prog(t, T.go - 0.5, T.go + 0.4));
  let pos: V3;
  let pose: GuyPose;
  if (!onLanding) {
    pos = stepPos(s);
    pose = climbPose(s, t);
  } else {
    pos = [0, 0, mix(0.15, 0.55, walkU)];
    const settle = mixPose(climbPose(ST.n + 0.5 * walkU, t), guyIdle(t, 5), smooth(prog(t, T.nowhere + 0.15, T.nowhere + 0.7)));
    pose = mergePose(settle, {headPitch: mix(0.35, -0.42, look), torsoBend: mix(0.06, -0.04, look), ground: 1});
  }

  // camera: hangs above the axis looking down the stair at ~30° — just steeper than the stair itself (22°), so its
  // vanishing point sits in the upper third: one-point perspective, landing after landing shrinking into the dark. The
  // flights fall behind each landing's brink, so he rises over the brink of the hero page as he climbs toward us.
  // Drifts slowly up and back.
  const u = smooth(prog(t, SHOTS.pages.t0, SHOTS.pages.t1));
  const cam = mixV([0, 9.0, 15.8], [0, 9.7, 16.9], u);
  const target = mixV([0, -1.6, -2.9], [0, -1.2, -2.2], u);

  const landings: number[] = [];
  for (let k = K_MIN; k <= K_MAX; k++) landings.push(k);
  return (
    <>
      <CameraRig position={cam} target={target} fov={cameraFovForVisible(26)} />
      <Canyon />
      <StairOfPages />
      <FallingPages t={t} />
      <ContinueGlow k={0.08 + 0.52 * beatAt(t, 7).pulse} />
      {/* the same page on every landing: the sung line printed on each, word by word, all in sync */}
      {landings.map((k) => {
        const Lk = landing(k);
        return (
          <WorldLyric key={k} line={L.pages} time={t} mode="paint" color={INK} intensity={1} size={EM} perWord={ROWS}
            position={[0, Lk.y + 0.004, Lk.z0 + LYRIC_Z]} rotation-x={-Math.PI / 2} until={SHOTS.pages.t1 + 0.05} />
        );
      })}
      <SilGuy pose={pose} position={pos} rightHand={<HeldSilHammer warmth={0.18} />} />
      {/* the abyss under the stair */}
      <mesh position={[0, -120, -60]} rotation-x={-Math.PI / 2} scale={[40, 260, 1]} geometry={PLANE}>
        <meshBasicMaterial color={GREYS.g0} />
      </mesh>
    </>
  );
};
