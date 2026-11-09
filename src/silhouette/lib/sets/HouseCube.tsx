/**
 * <HouseCube> — the house as a black concrete cube (~8 m), DESIGN-silhouette §4 (V2Rain, Chorus1, Final, Outro).
 * Front face (+Z): a deep-reveal door in the centre with the TENURE iris lock on the door frame, two flanking windows
 * (sill 1.0 m above the ground — the LEFT one is the guyClimb window), and a single concrete step the full width of
 * the door bay where the man and the dog sit in the Outro. Lease stencil on the facade.
 *
 *   <HouseCube size?={8 (≥ 7.6)} time?={0} color?={GREYS.g3} ambient?={0.06}
 *     doorOpen?={0}               0..1 door slab slides aside into the wall on the +X side (light beyond if `interior` > 0)
 *     doorIris?={{…IrisProps}|false}   props for the iris lock on the right door jamb face (radius 0.16; time = `time`)
 *     irisLight?={1}              faint red spill of the iris on the step/jamb (0 = off)
 *     warmWindow?={0}             0..1+ dawnGold glow in the LEFT window + gold spill on the ground (Final/Outro ONLY)
 *     windowGlow?={0}             0..1 bone screen-glow inside both windows (V2Rain: lit from the street screens)
 *     windowOpen?={false}         the LEFT window opens onto a dark interior room (3 × 3 × 3.6 m, floor = ground)
 *                                 behind a 0.2 m skin — exactly guyClimb's sill (outer face +0.25, inner +0.45)
 *     interior?={0}               0..1 light seen through the open door (the figures on the step read against it) and,
 *                                 with windowOpen, on the back wall of the room behind the climb window
 *     interiorColor?={S.bone}     S.dawnGold ONLY in Final/Outro
 *     facadeLight?={0}            0..1 the street screens' glow on the concrete (raises its self-light) so figures in
 *                                 front of the house read as silhouettes against it
 *     laserCage?={0}              0..1 red laser lattice caging the cube (Chorus1); lines build bottom → top as it rises
 *     cagePulse?={0.6}            packets of light running along the cage lines (needs `time`)
 *     stencil?={'UNIT 0315 · LEASED'}  text stencilled above the door ('' = none)
 *     {...group}/>
 * Origin: base centre on the ground (y = 0), front face toward +Z at z = size/2. Anchors: HOUSE_SPOTS / houseSpots(size)
 * and HOUSE_CAMERAS. Lights: one red point light (iris spill) + one dawnGold point light (warm window spill) — the
 * count is constant; intensities follow the props.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, hdr, cameraFovForVisible} from '../palette';
import {Iris, IrisProps} from '../Iris';
import {wboxMinMax, mergeBoxes, useConcreteMat, glowTex, blindsTex, stencilTex, clamp01, WALL_TILE} from './shared';
import type {GroupProps, V3} from './shared';
import {LaserLines, LaserSegment} from './LaserLines';

export type HouseCubeProps = GroupProps & {
  size?: number;
  time?: number;
  color?: string;
  ambient?: number;
  doorOpen?: number;
  doorIris?: Partial<IrisProps> | false;
  irisLight?: number;
  warmWindow?: number;
  windowGlow?: number;
  interior?: number;
  interiorColor?: string;
  facadeLight?: number;
  windowOpen?: boolean;
  laserCage?: number;
  cagePulse?: number;
  stencil?: string;
};

const DOOR_W = 1.2, DOOR_H = 2.5, REVEAL = 0.6;
const WIN_W = 1.3, WIN_H = 1.5, SILL = 1.0, WIN_X = 2.3, WIN_REVEAL = 0.12;
const STEP_H = 0.37, STEP_D = 1.0, STEP_W = 3.2;

/** The facade (door, windows at x ±2.3, the 3 m climb room behind the left one) is laid out in metres: below this edge
 *  the carved room would poke out of the cube, so `size` is clamped to it. */
export const HOUSE_MIN_SIZE = 7.6;

/** House anchors for a cube of edge `size` (house-local; clamped to ≥ HOUSE_MIN_SIZE). */
export const houseSpots = (sizeIn = 8) => {
  const size = Math.max(HOUSE_MIN_SIZE, sizeIn);
  const f = size / 2;
  return {
    size,
    frontZ: f,
    /** door: floor centre of the opening on the facade plane; doorInside = behind the reveal */
    door: [0, STEP_H, f] as V3,
    doorInside: [0, STEP_H, f - REVEAL - 0.4] as V3,
    /** iris lock: centre on the right jamb face of the facade, facing +Z (Iris default orientation) */
    doorIris: [DOOR_W / 2 + 0.38, 1.62, f + 0.004] as V3,
    /** the climb window (LEFT, x < 0): centre of the opening on the facade, sill top (outer edge) */
    window: [-WIN_X, SILL + WIN_H / 2, f] as V3,
    windowSill: [-WIN_X, SILL, f] as V3,
    /** guyClimb root on the ground in front of the left window, facing -Z (rotation-y π): sill 0.25 m ahead */
    climbRoot: [-WIN_X, 0, f + 0.25] as V3,
    climbRotY: Math.PI,
    rightWindow: [WIN_X, SILL + WIN_H / 2, f] as V3,
    /** the front step (top surface centre) — STEP_H = GUY.seatHeight (0.37) so <SilGuy pose={{…, sit: 1}}/> fits */
    step: [0, STEP_H, f + STEP_D / 2] as V3,
    /** Outro: the man sits on the step (root on the ground, y = 0, facing +Z, pose sit: 1) just left of centre, so his
     *  outline sits inside the doorway (x ±0.6) and reads against the light behind it */
    guySeat: [-0.3, 0, f + STEP_D - 0.3] as V3,
    /** Pancake sits ON the step beside him (root at the step top), facing +Z / three-quarter, inside the doorway too */
    pancakeSeat: [0.32, STEP_H, f + 0.55] as V3,
    /** the bowl on the ground in front of the step */
    bowl: [0.55, 0, f + STEP_D + 0.55] as V3,
    /** standing in front of the door, facing it (rotation-y π) */
    guyAtDoor: [0, 0, f + STEP_D + 0.55] as V3,
    /** laser cage half-extent (x/z) and height */
    cage: {half: f + 1.3, height: size + 1.4},
  };
};

export const HOUSE_SPOTS = houseSpots();

/** Framings for the default 8 m cube (fov = camera fov, letterbox-corrected). */
export const HOUSE_CAMERAS = {
  /** Outro: static symmetrical wide at dawn, the cube centred against the sky, figures on the step against the doorway */
  outro: {position: [0, 1.3, 42] as V3, target: [0, 3.9, 0] as V3, fov: cameraFovForVisible(19)},
  /** Chorus1: low, monumental, the caged cube looming */
  cage: {position: [0, 0.7, 30] as V3, target: [0, 4.6, 0] as V3, fov: cameraFovForVisible(27)},
  /** the door + iris lock (V2Rain "IDENTITY NOT ON PLAN"), him small in front */
  door: {position: [0, 1.5, 15] as V3, target: [0, 1.5, 4] as V3, fov: cameraFovForVisible(14)},
  /** the climb window from the side-front (three-quarter), sill at 1.0 m */
  window: {position: [-9, 1.4, 12] as V3, target: [-2.3, 1.3, 4] as V3, fov: cameraFovForVisible(16)},
};

const PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT = new THREE.BoxGeometry(1, 1, 1);

/** Interior room behind the LEFT (climb) window: x range, height, depth behind the 0.2 m front skin. */
const ROOM_X0 = -WIN_X - 1.5, ROOM_X1 = -WIN_X + 1.5, ROOM_H = 3.0, ROOM_D = 3.6, SKIN = 0.2;

type HouseGeo = {body: THREE.BufferGeometry; panelL: THREE.BufferGeometry; room: THREE.BufferGeometry};
const _houseGeo: Map<number, HouseGeo> = new Map();
const houseGeometry = (size: number): HouseGeo => {
  const hit = _houseGeo.get(size);
  if (hit) return hit;
  const f = size / 2, H = size;
  const t = WALL_TILE;
  const bx: THREE.BufferGeometry[] = [];
  const zf0 = f - 0.8, zf1 = f;
  const zr0 = f - SKIN - ROOM_D; // back of the interior room
  // body behind the facade zone, with the interior room carved out behind the left window
  bx.push(wboxMinMax([-f, 0, -f], [f, H, zr0], t));
  bx.push(wboxMinMax([-f, 0, zr0], [ROOM_X0, H, zf0], t));
  bx.push(wboxMinMax([ROOM_X1, 0, zr0], [f, H, zf0], t));
  bx.push(wboxMinMax([ROOM_X0, ROOM_H, zr0], [ROOM_X1, H, zf0], t));
  // facade zone (0.8 m deep) outside the room's x range: door + right window
  const deep: [number, number][] = [[-f, ROOM_X0], [ROOM_X1, -DOOR_W / 2], [DOOR_W / 2, WIN_X - WIN_W / 2], [WIN_X + WIN_W / 2, f]];
  for (const [a, b] of deep) bx.push(wboxMinMax([a, 0, zf0], [b, H, zf1], t));
  bx.push(wboxMinMax([WIN_X - WIN_W / 2, 0, zf0], [WIN_X + WIN_W / 2, SILL, zf1], t));
  bx.push(wboxMinMax([WIN_X - WIN_W / 2, SILL + WIN_H, zf0], [WIN_X + WIN_W / 2, H, zf1], t));
  bx.push(wboxMinMax([-DOOR_W / 2, STEP_H + DOOR_H, zf0], [DOOR_W / 2, H, zf1], t));
  bx.push(wboxMinMax([-DOOR_W / 2, 0, zf0], [DOOR_W / 2, STEP_H, zf1], t));
  // right window glass line (recessed WIN_REVEAL)
  bx.push(wboxMinMax([WIN_X - WIN_W / 2, SILL, zf0 - 0.02], [WIN_X + WIN_W / 2, SILL + WIN_H, zf1 - WIN_REVEAL], t));
  // facade zone over the room: a 0.2 m skin (guyClimb's sill depth) with the left window, thickened above the room
  bx.push(wboxMinMax([ROOM_X0, 0, f - SKIN], [-WIN_X - WIN_W / 2, H, zf1], t));
  bx.push(wboxMinMax([-WIN_X + WIN_W / 2, 0, f - SKIN], [ROOM_X1, H, zf1], t));
  bx.push(wboxMinMax([-WIN_X - WIN_W / 2, 0, f - SKIN], [-WIN_X + WIN_W / 2, SILL, zf1], t));
  bx.push(wboxMinMax([-WIN_X - WIN_W / 2, SILL + WIN_H, f - SKIN], [-WIN_X + WIN_W / 2, H, zf1], t));
  bx.push(wboxMinMax([ROOM_X0, ROOM_H, zf0], [ROOM_X1, H, f - SKIN], t));
  // the step
  bx.push(wboxMinMax([-STEP_W / 2, 0, f], [STEP_W / 2, STEP_H, f + STEP_D], 2.4));
  // roof parapet lip (slightly proud)
  bx.push(wboxMinMax([-f - 0.08, H - 0.5, -f - 0.08], [f + 0.08, H, f + 0.08], t));
  const body = mergeBoxes(bx);
  // left window glass line (hidden when windowOpen): same recess as the right one
  const panelL = wboxMinMax([-WIN_X - WIN_W / 2, SILL, f - SKIN - 0.02], [-WIN_X + WIN_W / 2, SILL + WIN_H, zf1 - WIN_REVEAL], t);
  // the room's inner faces (rendered BackSide): visible through the open window
  const room = wboxMinMax([ROOM_X0, 0, zr0], [ROOM_X1, ROOM_H, f - SKIN], t);
  const out = {body, panelL, room};
  _houseGeo.set(size, out);
  return out;
};

/** Laser cage segments: verticals + horizontals on 4 faces + a roof grid, built bottom → top by `amount`. */
const cageSegments = (half: number, height: number, amount: number): LaserSegment[] => {
  const segs: LaserSegment[] = [];
  const a = clamp01(amount);
  if (a <= 0) return segs;
  const nV = 8, nH = 7;
  const top = height * Math.min(1, a * 1.25);
  const corners: [number, number][] = [[-half, half], [half, half], [half, -half], [-half, -half]];
  for (let s = 0; s < 4; s++) {
    const [x0, z0] = corners[s];
    const [x1, z1] = corners[(s + 1) % 4];
    for (let i = 0; i <= nV; i++) {
      const k = i / nV;
      const x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k;
      segs.push([[x, 0, z], [x, top, z]]);
    }
    for (let j = 1; j <= nH; j++) {
      const y = (j / nH) * height;
      if (y > top + 1e-3) break;
      segs.push([[x0, y, z0], [x1, y, z1], j === nH ? 1.2 : 1]);
    }
  }
  if (a > 0.8) {
    for (let i = 1; i < nV; i++) {
      const k = -half + (2 * half * i) / nV;
      segs.push([[k, height, -half], [k, height, half], 0.8]);
      segs.push([[-half, height, k], [half, height, k], 0.8]);
    }
  }
  return segs;
};

export const HouseCube: React.FC<HouseCubeProps> = ({
  size: sizeIn = 8, time = 0, color = GREYS.g3, ambient = 0.06, doorOpen = 0, doorIris = {}, irisLight = 1, warmWindow = 0,
  windowGlow = 0, interior = 0, interiorColor = S.bone, facadeLight = 0, windowOpen = false, laserCage = 0, cagePulse = 0.6, stencil = 'UNIT 0315 · LEASED',
  ...group
}) => {
  const size = Math.max(HOUSE_MIN_SIZE, sizeIn);
  const spots = useMemo(() => houseSpots(size), [size]);
  const f = size / 2;
  const geo = houseGeometry(size);
  const mat = useConcreteMat({color, ambient: ambient + 12 * clamp01(facadeLight), sky: 1});
  const roomLit = clamp01(interior);
  const roomMat = useConcreteMat({color: roomLit > 0.001 ? interiorColor : GREYS.g2, ambient: 0.25 + 0.55 * roomLit, side: THREE.BackSide});
  const doorMat = useConcreteMat({color: GREYS.g2, ambient: (ambient + 12 * clamp01(facadeLight)) * 0.8, roughness: 0.55, sky: 1});
  const st = stencil ? stencilTex(stencil, {font: 'mono'}) : null;
  const stMat = useMemo(
    () => (st ? new THREE.MeshStandardMaterial({color: '#77746e', map: st.tex, transparent: true, depthWrite: false, roughness: 0.9, emissive: new THREE.Color('#77746e').multiplyScalar(0.12), emissiveMap: st.tex}) : null),
    [st],
  );
  useLayoutEffect(() => () => stMat?.dispose(), [stMat]);
  const segs = useMemo(() => cageSegments(spots.cage.half, spots.cage.height, laserCage), [spots, laserCage]);
  const irisOn = doorIris !== false;
  // slides toward +X into the solid wall between the door and the right window (−X is the carved climb room)
  const slide = clamp01(doorOpen) * (DOOR_W + 0.05);
  const ww = Math.max(0, warmWindow);
  const wg = clamp01(windowGlow);
  const zIn = f - WIN_REVEAL + 0.006;

  return (
    <group {...group}>
      <mesh geometry={geo.body} material={mat} />
      {windowOpen ? <mesh geometry={geo.room} material={roomMat} /> : <mesh geometry={geo.panelL} material={mat} />}
      {windowOpen && interior > 0.001 ? (
        <mesh geometry={PLANE} position={[-WIN_X, ROOM_H * 0.45, f - SKIN - ROOM_D + 0.02]} scale={[ROOM_X1 - ROOM_X0 - 0.1, ROOM_H * 0.9, 1]}>
          <meshBasicMaterial map={glowTex()} color={hdr(interiorColor, 0.95 * clamp01(interior))} transparent depthWrite={false} />
        </mesh>
      ) : null}
      {/* door slab (slides into the wall to the left) + light beyond */}
      <mesh geometry={UNIT} material={doorMat} position={[slide, STEP_H + DOOR_H / 2, f - REVEAL]} scale={[DOOR_W, DOOR_H, 0.08]} />
      {interior > 0.001 && doorOpen > 0.01 ? (
        <>
          <mesh geometry={PLANE} position={[0, STEP_H + DOOR_H / 2, f - REVEAL - 0.05]} scale={[DOOR_W, DOOR_H, 1]}>
            <meshBasicMaterial color={hdr(interiorColor, 0.85 * clamp01(interior))} />
          </mesh>
          <mesh geometry={PLANE} position={[0, STEP_H + 0.012, f + 1.4]} rotation={[-Math.PI / 2, 0, 0]} scale={[DOOR_W * 3.2, 3.6, 1]}>
            <meshBasicMaterial map={glowTex()} color={hdr(interiorColor, 0.3 * clamp01(interior))} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh geometry={PLANE} position={[0, 0.012, f + STEP_D + 1.6]} rotation={[-Math.PI / 2, 0, 0]} scale={[DOOR_W * 3.6, 4.0, 1]}>
            <meshBasicMaterial map={glowTex()} color={hdr(interiorColor, 0.28 * clamp01(interior))} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      ) : null}
      {/* windows: left = climb window (can glow warm gold: Final/Outro only), right twin */}
      {[-1, 1].map((s) => {
        if (s < 0 && windowOpen) return null;
        const warm = s < 0 ? ww : 0;
        // gold ≤ ~1.2 incl. the halo card on top of it, or ACES washes it to cream
        const col = warm > 0.001 ? hdr(S.dawnGold, 1.0 * warm) : hdr(S.bone, 0.75 * wg);
        return warm > 0.001 || wg > 0.001 ? (
          <mesh key={s} geometry={PLANE} position={[s * WIN_X, SILL + WIN_H / 2, zIn]} scale={[WIN_W, WIN_H, 1]}>
            <meshBasicMaterial color={col} map={warm > 0.001 ? null : blindsTex()} />
          </mesh>
        ) : null;
      })}
      {ww > 0.001 ? (
        <>
          <mesh geometry={PLANE} position={[-WIN_X, 0.012, f + 1.6]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.2, 4.2, 1]}>
            <meshBasicMaterial map={glowTex()} color={hdr(S.dawnGold, 0.35 * ww)} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh geometry={PLANE} position={[-WIN_X, SILL + WIN_H / 2, f + 0.05]} scale={[WIN_W * 2.6, WIN_H * 2.4, 1]}>
            <meshBasicMaterial map={glowTex()} color={hdr(S.dawnGold, 0.2 * ww)} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      ) : null}
      {/* stencil above the door */}
      {st && stMat ? (
        <mesh geometry={PLANE} material={stMat} position={[0, STEP_H + DOOR_H + 0.55, f + 0.004]} scale={[Math.min(size * 0.7, 0.22 * st.aspect), 0.22, 1]} />
      ) : null}
      {/* iris lock on the right jamb face */}
      {irisOn ? <Iris radius={0.16} time={time} {...(doorIris || {})} position={spots.doorIris} /> : null}
      <pointLight position={[spots.doorIris[0], spots.doorIris[1], f + 0.6]} color={S.authRed} intensity={irisOn ? 0.5 * irisLight : 0} distance={3} decay={2} />
      <pointLight position={[-WIN_X, SILL + WIN_H / 2, f + 1.2]} color={S.dawnGold} intensity={2.2 * ww} distance={6} decay={2} />
      {/* laser cage (Chorus1) */}
      {segs.length ? (
        <LaserLines segments={segs} intensity={1.1 + 0.2 * clamp01(laserCage)} width={0.025} minPx={1.6} time={time} pulse={cagePulse} pulseSpeed={5} pulseSpacing={7} />
      ) : null}
      {segs.length ? (
        <mesh geometry={PLANE} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[spots.cage.half * 3.6, spots.cage.half * 3.6, 1]}>
          <meshBasicMaterial map={glowTex()} color={hdr(S.authRed, 0.6 * clamp01(laserCage))} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};
