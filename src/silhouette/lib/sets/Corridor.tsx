/**
 * <Corridor> — a long symmetrical concrete corridor whose gates close in sequence ("Upgrade to continue", Chorus1).
 * One-point perspective: deep portal frames (wall ribs + lintel) at every gate, a ceiling light slot running the whole
 * length, downlight pools on the floor under each lintel, and a doorway of bone light at the far end (the way out),
 * which the closing gates progressively cut off. Each gate = two heavy leaves sliding out of the wall pockets to meet
 * in the middle; their leading edges carry red light strips (LaserLines) that brighten as they close, ending as one
 * red seam. A red threshold line crosses the floor at every gate.
 *
 *   <Corridor length?={60} width?={4} height?={6} gates?={8} firstGate?={8} gateSpacing?={auto}
 *             gateClose?={(i) => 0}   0 = open … 1 = shut, per gate i (0 = nearest). Drive it from time, e.g.
 *                                     (i) => ramp(f, 30 + i * 12, 44 + i * 12)
 *             time?={0} endLight?={1} slot?={1} pools?={1} red?={1} threshold?={0.6}
 *             labels?={true} color?={GREYS.g5} ambient?={0.07} {...group}/>
 *
 *   endLight  bone doorway glow at the far end (≤ ~0.85 of bone: under bloom so it doesn't wash the silhouette)
 *   slot      ceiling light slot (bone strip)
 *   pools     downlight under every lintel: a bone strip + a soft floor decal, plus one real point light per gate
 *             (constant count) high in the middle of the bay in front of it, so a SHUT gate stays a dark slab with its
 *             red seam (a light right in front of the leaves blew them out to white: the closed gate read as light)
 *   red       multiplier of every red strip (authRed ≤ 2 after it)   threshold  red floor line under each gate
 *   labels    stencilled GATE 01 … on the leaves
 * Origin: floor centre of the ENTRANCE (z = 0); the corridor runs toward -Z to z = -length. Lights: one point light per
 * gate (bone, distance 9 m, mid-bay under the ceiling) — the only three.js lights it brings; pools={0} switches them off.
 * Anchors: corridorLayout(props) → {gateZ[], openW, openH, endZ, …}, CORRIDOR_SPOTS, CORRIDOR_CAMERAS.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, hdr, cameraFovForVisible} from '../palette';
import {wboxMinMax, mergeBoxes, useConcreteMat, glowTex, columnGlowTex, stencilTex, clamp01, WALL_TILE, FLOOR_TILE} from './shared';
import type {GroupProps, V3} from './shared';
import {LaserLines, LaserSegment} from './LaserLines';

export type CorridorProps = GroupProps & {
  length?: number;
  width?: number;
  height?: number;
  gates?: number;
  firstGate?: number;
  gateSpacing?: number;
  gateClose?: (i: number) => number;
  time?: number;
  endLight?: number;
  slot?: number;
  pools?: number;
  red?: number;
  threshold?: number;
  labels?: boolean;
  color?: string;
  ambient?: number;
};

const WALL_T = 0.6, RIB_D = 0.5, RIB_L = 0.9, LINTEL = 0.9, LEAF_T = 0.3;

export const corridorLayout = (p: Pick<CorridorProps, 'length' | 'width' | 'height' | 'gates' | 'firstGate' | 'gateSpacing'> = {}) => {
  const length = p.length ?? 60, width = p.width ?? 4, height = p.height ?? 6, gates = Math.max(1, p.gates ?? 8);
  const firstGate = p.firstGate ?? 8;
  const spacing = p.gateSpacing ?? (length - firstGate - 8) / Math.max(1, gates - 1);
  const gateZ = Array.from({length: gates}, (_, i) => -(firstGate + i * spacing));
  const openW = width - 2 * RIB_D;
  const openH = height - LINTEL;
  return {length, width, height, gates, firstGate, spacing, gateZ, openW, openH, endZ: -length, leafW: openW / 2};
};

export const CORRIDOR_SPOTS = (() => {
  const L = corridorLayout();
  return {
    ...L,
    entrance: [0, 0, 0] as V3,
    /** walking in toward the far light (face -Z: rotation-y π) — stop just before gate i at [0, 0, gateZ[i] + 1.2] */
    walkStart: [0, 0, -2] as V3,
    end: [0, 0, L.endZ] as V3,
  };
})();

/** Framings for the default corridor (fov = camera fov, letterbox-corrected). */
export const CORRIDOR_CAMERAS = {
  /** dead-centre one-point perspective from outside the entrance, eye height, long lens */
  axial: {position: [0, 1.7, 14] as V3, target: [0, 2.2, -60] as V3, fov: cameraFovForVisible(20)},
  /** low, close behind the walker: the gates stack up as red seams */
  low: {position: [0, 0.5, 6] as V3, target: [0, 2.0, -50] as V3, fov: cameraFovForVisible(24)},
  /** reverse: from beyond the far end looking back at the gates closing toward camera (needs endLight 0) */
  reverse: {position: [0, 1.7, -74] as V3, target: [0, 2.2, 0] as V3, fov: cameraFovForVisible(20)},
};

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const PLANE = new THREE.PlaneGeometry(1, 1);

const buildCorridor = (L: ReturnType<typeof corridorLayout>) => {
  const {length, width: w, height: h, gateZ, spacing} = L;
  const hw = w / 2;
  const t = WALL_TILE;
  const walls: THREE.BufferGeometry[] = [];
  const z1 = 3; // walls start a little in front of the entrance
  walls.push(wboxMinMax([-hw - WALL_T, 0, -length - 1], [-hw, h + 0.5, z1], t));
  walls.push(wboxMinMax([hw, 0, -length - 1], [hw + WALL_T, h + 0.5, z1], t));
  // ceiling with a 0.3 m light slot down the middle
  walls.push(wboxMinMax([-hw, h, -length - 1], [-0.15, h + 0.5, z1], t));
  walls.push(wboxMinMax([0.15, h, -length - 1], [hw, h + 0.5, z1], t));
  walls.push(wboxMinMax([-0.6, h + 0.5, -length - 1], [0.6, h + 0.7, z1], t));
  // entrance portal face (a thick frame around the mouth)
  walls.push(wboxMinMax([-hw - WALL_T - 3, 0, z1], [-hw, h + 3, z1 + 0.8], t));
  walls.push(wboxMinMax([hw, 0, z1], [hw + WALL_T + 3, h + 3, z1 + 0.8], t));
  walls.push(wboxMinMax([-hw, h, z1], [hw, h + 3, z1 + 0.8], t));
  // far end wall with the doorway (the way out)
  const ew = Math.min(1.6, w * 0.4), eh = Math.min(3.2, h * 0.6);
  walls.push(wboxMinMax([-hw, 0, -length - 1], [-ew / 2, h, -length], t));
  walls.push(wboxMinMax([ew / 2, 0, -length - 1], [hw, h, -length], t));
  walls.push(wboxMinMax([-ew / 2, eh, -length - 1], [ew / 2, h, -length], t));
  // portal frames at every gate: wall ribs + lintel; half-ribs halfway between gates
  for (const z of gateZ) {
    walls.push(wboxMinMax([-hw, 0, z - RIB_L / 2], [-hw + RIB_D, h, z + RIB_L / 2], t));
    walls.push(wboxMinMax([hw - RIB_D, 0, z - RIB_L / 2], [hw, h, z + RIB_L / 2], t));
    walls.push(wboxMinMax([-hw, h - LINTEL, z - RIB_L / 2], [hw, h, z + RIB_L / 2], t));
  }
  for (let i = 0; i < gateZ.length - 1; i++) {
    const z = gateZ[i] - spacing / 2;
    walls.push(wboxMinMax([-hw, 0, z - 0.2], [-hw + 0.18, h, z + 0.2], t));
    walls.push(wboxMinMax([hw - 0.18, 0, z - 0.2], [hw, h, z + 0.2], t));
  }
  const floor = wboxMinMax([-hw - WALL_T, -0.3, -length - 1], [hw + WALL_T, 0, z1 + 12], FLOOR_TILE * 2);
  return {walls: mergeBoxes(walls), floor, end: {w: ew, h: eh}};
};

export const Corridor: React.FC<CorridorProps> = ({
  length = 60, width = 4, height = 6, gates = 8, firstGate = 8, gateSpacing, gateClose = () => 0, time = 0, endLight = 1,
  slot = 1, pools = 1, red = 1, threshold = 0.6, labels = true, color = GREYS.g5, ambient = 0.07, ...group
}) => {
  const L = useMemo(() => corridorLayout({length, width, height, gates, firstGate, gateSpacing}), [length, width, height, gates, firstGate, gateSpacing]);
  const built = useMemo(() => buildCorridor(L), [L]);
  const wallMat = useConcreteMat({color, ambient, sky: 1});
  const floorMat = useConcreteMat({color, ambient: ambient * 0.8, kind: 'floor', roughness: 0.4});
  const leafMat = useConcreteMat({color: GREYS.g4, ambient: ambient * 0.9, roughness: 0.6, sky: 1});
  const hw = width / 2;
  const closes = L.gateZ.map((_, i) => clamp01(gateClose(i)));

  // red strips: leaf leading edges (front + back faces), jambs + lintel (armed, faint), floor thresholds
  const segs: LaserSegment[] = [];
  L.gateZ.forEach((z, i) => {
    const c = closes[i];
    const off = (1 - c) * (L.leafW + 0.12);
    const k = (0.55 + 1.0 * c) * red;
    const zf = z + LEAF_T / 2 + 0.005;
    for (const s of [-1, 1]) {
      const xEdge = s * off;
      if (off < L.leafW + 0.1) {
        segs.push([[xEdge - s * 0.015, 0.02, zf], [xEdge - s * 0.015, L.openH, zf], k]);
        segs.push([[xEdge - s * 0.015, 0.02, z - LEAF_T / 2 - 0.005], [xEdge - s * 0.015, L.openH, z - LEAF_T / 2 - 0.005], k * 0.8]);
      }
      // jamb line (armed)
      segs.push([[s * (L.openW / 2 - 0.01), 0.02, z + RIB_L / 2 + 0.01], [s * (L.openW / 2 - 0.01), L.openH - 0.01, z + RIB_L / 2 + 0.01], 0.35 * red]);
    }
    segs.push([[-L.openW / 2, L.openH - 0.01, z + RIB_L / 2 + 0.01], [L.openW / 2, L.openH - 0.01, z + RIB_L / 2 + 0.01], 0.35 * red]);
    if (threshold > 0) segs.push([[-L.openW / 2, 0.006, z + RIB_L / 2 + 0.05], [L.openW / 2, 0.006, z + RIB_L / 2 + 0.05], threshold * red * (0.6 + 0.6 * c)]);
  });

  const glowMat = (color: string, k: number, map = glowTex()) => (
    <meshBasicMaterial map={map} color={hdr(color, k)} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
  );

  return (
    <group {...group}>
      <mesh geometry={built.walls} material={wallMat} />
      <mesh geometry={built.floor} material={floorMat} />
      {/* ceiling slot strip */}
      {slot > 0.001 ? (
        <mesh geometry={PLANE} position={[0, height + 0.48, (3 - length - 1) / 2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.3, length + 4, 1]}>
          <meshBasicMaterial color={hdr(S.bone, 0.8 * slot)} />
        </mesh>
      ) : null}
      {/* far doorway light */}
      {endLight > 0.001 ? (
        <>
          <mesh geometry={PLANE} position={[0, built.end.h / 2, -length - 0.9]} scale={[built.end.w, built.end.h, 1]}>
            <meshBasicMaterial color={hdr(S.bone, 0.85 * endLight)} fog={false} />
          </mesh>
          <mesh geometry={PLANE} position={[0, built.end.h * 0.55, -length + 0.4]} scale={[width * 1.6, height * 1.3, 1]} renderOrder={2}>
            {glowMat(S.bone, 0.32 * endLight, columnGlowTex())}
          </mesh>
          <mesh geometry={PLANE} position={[0, 0.01, -length + 3]} rotation={[-Math.PI / 2, 0, 0]} scale={[width * 0.9, 8, 1]}>
            {glowMat(S.bone, 0.3 * endLight)}
          </mesh>
        </>
      ) : null}
      {/* gates */}
      {L.gateZ.map((z, i) => {
        const c = closes[i];
        const off = (1 - c) * (L.leafW + 0.12);
        const label = labels ? stencilTex(`GATE ${String(i + 1).padStart(2, '0')}`, {font: 'mono'}) : null;
        return (
          <group key={i}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * (off + L.leafW / 2), 0, z]}>
                <mesh geometry={UNIT} material={leafMat} position={[0, L.openH / 2, 0]} scale={[L.leafW, L.openH, LEAF_T]} />
                {label && s < 0 ? (
                  <mesh geometry={PLANE} position={[0.1, 1.55, LEAF_T / 2 + 0.004]} scale={[0.16 * label.aspect, 0.16, 1]}>
                    <meshStandardMaterial color="#8d8a84" map={label.tex} transparent depthWrite={false} roughness={0.9} emissive={new THREE.Color('#8d8a84').multiplyScalar(0.25)} emissiveMap={label.tex} />
                  </mesh>
                ) : null}
              </group>
            ))}
            {pools > 0.001 ? (
              <>
                <mesh geometry={PLANE} position={[0, height - LINTEL - 0.004, z]} rotation={[Math.PI / 2, 0, 0]} scale={[L.openW * 0.9, 0.08, 1]}>
                  <meshBasicMaterial color={hdr(S.bone, 1.0 * pools)} />
                </mesh>
                <mesh geometry={PLANE} position={[0, 0.012, z + 0.4]} rotation={[-Math.PI / 2, 0, 0]} scale={[width * 1.05, 4.2, 1]}>
                  {glowMat(S.bone, 0.12 * pools)}
                </mesh>
                {[-1, 1].map((s) => (
                  <mesh key={s} geometry={PLANE} position={[s * (hw - 0.004), height * 0.55, z + RIB_L / 2 + 0.9]} rotation={[0, -s * Math.PI / 2, 0]} scale={[1.6, height * 0.9, 1]}>
                    {glowMat(S.bone, 0.1 * pools, columnGlowTex())}
                  </mesh>
                ))}
              </>
            ) : null}
            {/* red spill of the closing leaves on the floor in front of the gate */}
            {c > 0.02 ? (
              <mesh geometry={PLANE} position={[0, 0.016, z + 1.0]} rotation={[-Math.PI / 2, 0, 0]} scale={[L.openW * 1.1, 2.4, 1]}>
                {glowMat(S.authRed, 0.35 * c * red)}
              </mesh>
            ) : null}
            <pointLight position={[0, height - 0.45, z + Math.min(L.spacing / 2, 3.2)]} color={S.bone} intensity={70 * pools} distance={9} decay={2} />
          </group>
        );
      })}
      <LaserLines segments={segs} intensity={1.25} width={0.03} minPx={1.6} time={time} />
    </group>
  );
};
