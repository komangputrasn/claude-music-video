/**
 * <Plaza> — an enormous open concrete plaza (Pre, Chorus1, Final): monumental emptiness. Polished slabs with saw-cut
 * joints, a dark inlaid central axis (one-point perspective toward the screen end), a grand stair rising to a podium
 * at the far end (where a TENURE screen or the towers stand), and a rhythm of tall floodlight masts along the axis.
 *
 *   <Plaza size?={[180, 200]} slab?={6} color?={GREYS.g5} ambient?={0.3} roughness?={0.6}
 *          axis?={true} stair?={true} masts?={true} mastLight?={1} mastColor?={S.bone}
 *          spill?={0.6} spillColor?={S.bone} {...group}/>
 *
 *   size       [x, z] metres of paving (the floor plane is centred on the origin)
 *   slab       paving module (m): joints every `slab` metres
 *   axis       two dark granite strips + a thin bone inlay line along z (the walk axis), x = ±PLAZA_SPOTS.axisHalf
 *   stair      7-step stair (0.18 m risers, 0.9 m treads) up to a podium at the far (-Z) end; PLAZA_SPOTS.podiumY
 *   masts      14 m floodlight masts every 24 m on both sides of the axis (one instanced draw call); mastLight 0..1
 *              lights their heads + a soft pool of light on the paving under each (additive decals, no real lights)
 *   spill      the screen's light on the paving in front of the stair (a big soft additive pool, 0 = off): the
 *              bright floor that a crossing figure is silhouetted against. spillColor S.authRed for the red plaza.
 * Origin: centre of the paving on y = 0; the axis runs along Z, the stair/podium at the -Z end. The plaza brings no
 * three.js lights: under <SilStage> it reads by its self-lit `ambient`, the mast pools and the fog; light it more from
 * the scene (screens, LightShaft, Backlight) as the mood needs.
 * Anchors: PLAZA_SPOTS (plazaSpots(size) for other sizes) and PLAZA_CAMERAS.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, hdr, cameraFovForVisible} from '../palette';
import {wbox, wboxMinMax, mergeBoxes, concreteMat, useConcreteMat, glowTex, WALL_TILE} from './shared';
import type {GroupProps, V3} from './shared';

export type PlazaProps = GroupProps & {
  spill?: number;
  spillColor?: string;
  size?: [number, number];
  slab?: number;
  color?: string;
  ambient?: number;
  roughness?: number;
  axis?: boolean;
  stair?: boolean;
  masts?: boolean;
  mastLight?: number;
  mastColor?: string;
};

const STEPS = 7, RISE = 0.18, TREAD = 0.9, MAST_H = 14, MAST_SPACING = 24;

/** Anchors for a plaza of `size` (default [180, 200]). */
export const plazaSpots = (size: [number, number] = [180, 200]) => {
  const [sx, sz] = size;
  const stairZ = -sz / 2 + 34; // first riser
  const podiumZ = stairZ - STEPS * TREAD; // podium front edge
  const podiumY = STEPS * RISE;
  return {
    size,
    centre: [0, 0, 0] as V3,
    axisHalf: 7,
    /** first riser of the stair (z) and the podium surface */
    stairZ,
    podiumZ,
    podiumY,
    /** a TenureScreen base (bottom centre of its back face) on the podium, facing +Z down the axis */
    screen: [0, podiumY, podiumZ - 14] as V3,
    /** Megablock bases flanking the plaza (pairs, symmetric), fronts facing the axis: rotation-y ±π/2 */
    towersLeft: [[-sx / 2 - 22, 0, -40], [-sx / 2 - 22, 0, 30]] as V3[],
    towersRight: [[sx / 2 + 22, 0, -40], [sx / 2 + 22, 0, 30]] as V3[],
    towersLeftRotY: Math.PI / 2,
    towersRightRotY: -Math.PI / 2,
    /** a lone figure crossing the plaza left → right in front of the stair (face +X: rotation-y π/2) */
    crossingStart: [-40, 0, stairZ + 30] as V3,
    crossingEnd: [40, 0, stairZ + 30] as V3,
    /** walking the axis toward the screen (face -Z: rotation-y π) */
    axisStart: [0, 0, sz / 2 - 20] as V3,
    axisEnd: [0, 0, stairZ + 4] as V3,
    /** mast foot positions (both sides of the axis) */
    masts: Array.from({length: Math.floor((sz - 60) / MAST_SPACING) + 1}, (_, i) => sz / 2 - 20 - i * MAST_SPACING)
      .filter((z) => z > stairZ + 4)
      .flatMap((z) => [[-14, 0, z], [14, 0, z]] as V3[]),
  };
};

export const PLAZA_SPOTS = plazaSpots();

/** Long-lens framings for the default plaza (fov = camera fov, letterbox-corrected). */
export const PLAZA_CAMERAS = {
  /** low, dead-centre down the axis toward the stair/screen: one-point perspective */
  axial: {position: [0, 1.2, 95] as V3, target: [0, 6, -60] as V3, fov: cameraFovForVisible(16)},
  /** a lone figure crossing the lit paving in front of the stair, seen from up the axis (slightly raised, long lens) */
  crossing: {position: [0, 6.5, 110] as V3, target: [0, 4, PLAZA_SPOTS.stairZ - 10] as V3, fov: cameraFovForVisible(17)},
  /** crane: high above the axis looking down the plaza (the figure becomes a dot) */
  crane: {position: [0, 70, 120] as V3, target: [0, 0, -10] as V3, fov: cameraFovForVisible(24)},
};

const UNIT = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const PLANE = new THREE.PlaneGeometry(1, 1);

export const Plaza: React.FC<PlazaProps> = ({
  size = [180, 200], slab = 6, color = GREYS.g5, ambient = 0.3, roughness = 0.6, axis = true, stair = true, masts = true,
  mastLight = 1, mastColor = S.bone, spill = 0.6, spillColor = S.bone, ...group
}) => {
  const [sx, sz] = size;
  const spots = useMemo(() => plazaSpots(size), [sx, sz]); // eslint-disable-line react-hooks/exhaustive-deps
  // paving plane: world-scaled UVs (joints every slab metres = floorTex joints at FLOOR_TILE/2)
  const paving = useMemo(() => {
    const g = new THREE.PlaneGeometry(sx, sz, 1, 1).rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const tile = slab * 2;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * sx) / tile, (uv.getY(i) * sz) / tile);
    return g;
  }, [sx, sz, slab]);
  const pavMat = useConcreteMat({color, ambient, roughness, kind: 'floor'});
  useLayoutEffect(() => () => paving.dispose(), [paving]);

  const stairGeo = useMemo(() => {
    if (!stair) return null;
    const boxes: THREE.BufferGeometry[] = [];
    const wS = sx * 0.62;
    for (let i = 0; i < STEPS; i++) {
      const z0 = spots.stairZ - i * TREAD;
      boxes.push(wboxMinMax([-wS / 2, 0, -sz / 2], [wS / 2, (i + 1) * RISE, z0], slab * 2));
    }
    // podium cheek walls (low parapets) at both ends of the stair
    boxes.push(wboxMinMax([-wS / 2 - 1.2, 0, -sz / 2], [-wS / 2, spots.podiumY + 0.9, spots.stairZ + 0.6], WALL_TILE));
    boxes.push(wboxMinMax([wS / 2, 0, -sz / 2], [wS / 2 + 1.2, spots.podiumY + 0.9, spots.stairZ + 0.6], WALL_TILE));
    return mergeBoxes(boxes);
  }, [stair, sx, sz, slab, spots]);
  useLayoutEffect(() => () => stairGeo?.dispose(), [stairGeo]);
  const stairMat = useConcreteMat({color, ambient, kind: 'floor', roughness, sky: 1});

  const axisGeo = useMemo(() => {
    if (!axis) return null;
    const zEnd = stair ? spots.stairZ : -sz / 2;
    const len = sz / 2 - zEnd;
    const zc = (sz / 2 + zEnd) / 2;
    return mergeBoxes([
      wbox(1.4, 0.004, len, [-spots.axisHalf, 0.002, zc], 4),
      wbox(1.4, 0.004, len, [spots.axisHalf, 0.002, zc], 4),
    ]);
  }, [axis, stair, sz, spots]);
  useLayoutEffect(() => () => axisGeo?.dispose(), [axisGeo]);
  const axisMat = useConcreteMat({color: GREYS.g2, ambient: ambient * 0.5, roughness: 0.35});

  // masts: pole + cross-arm + head (instanced, 3 instances per mast)
  const mastMesh = useMemo(() => {
    if (!masts) return null;
    const m = new THREE.InstancedMesh(UNIT, concreteMat({color: GREYS.g2, ambient: 0.04}), spots.masts.length * 2);
    const o = new THREE.Object3D();
    spots.masts.forEach((p, i) => {
      o.position.set(p[0], 0, p[2]);
      o.scale.set(0.45, MAST_H, 0.45);
      o.updateMatrix();
      m.setMatrixAt(i * 2, o.matrix);
      o.position.set(p[0] - Math.sign(p[0]) * 1.2, MAST_H - 0.6, p[2]);
      o.scale.set(3.2, 0.5, 0.7);
      o.updateMatrix();
      m.setMatrixAt(i * 2 + 1, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [masts, spots]);
  const headMesh = useMemo(() => {
    if (!masts) return null;
    const m = new THREE.InstancedMesh(PLANE, new THREE.MeshBasicMaterial({color: '#ffffff'}), spots.masts.length);
    const o = new THREE.Object3D();
    spots.masts.forEach((p, i) => {
      o.position.set(p[0] - Math.sign(p[0]) * 1.6, MAST_H - 0.62, p[2]);
      o.rotation.set(Math.PI / 2, 0, 0);
      o.scale.set(2.2, 0.5, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [masts, spots]);
  const poolMesh = useMemo(() => {
    if (!masts) return null;
    const mat = new THREE.MeshBasicMaterial({map: glowTex(), color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
    const m = new THREE.InstancedMesh(PLANE, mat, spots.masts.length);
    const o = new THREE.Object3D();
    spots.masts.forEach((p, i) => {
      o.position.set(p[0] - Math.sign(p[0]) * 3.5, 0.01, p[2]);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.scale.set(16, 16, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [masts, spots]);
  useLayoutEffect(() => () => {
    [headMesh, poolMesh].forEach((m) => m && (m.material as THREE.Material).dispose());
    [mastMesh, headMesh, poolMesh].forEach((m) => m?.dispose());
  }, [mastMesh, headMesh, poolMesh]);
  useLayoutEffect(() => {
    if (headMesh) (headMesh.material as THREE.MeshBasicMaterial).color.copy(hdr(mastColor, 0.25 + 1.6 * mastLight));
    if (poolMesh) {
      const pm = poolMesh.material as THREE.MeshBasicMaterial;
      pm.color.copy(hdr(mastColor, 0.2 * mastLight));
      poolMesh.visible = mastLight > 0.001;
    }
  });

  return (
    <group {...group}>
      <mesh geometry={paving} material={pavMat} />
      {axisGeo ? <mesh geometry={axisGeo} material={axisMat} /> : null}
      {axis ? (
        <mesh geometry={PLANE} position={[0, 0.006, (sz / 2 + (stair ? spots.stairZ : -sz / 2)) / 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.08, sz / 2 - (stair ? spots.stairZ : -sz / 2), 1]}>
          <meshBasicMaterial color={hdr(S.bone, 0.3)} />
        </mesh>
      ) : null}
      {stairGeo ? <mesh geometry={stairGeo} material={stairMat} /> : null}
      {spill > 0.001 ? (
        <mesh geometry={PLANE} position={[0, 0.015, spots.stairZ + 22]} rotation={[-Math.PI / 2, 0, 0]} scale={[sx * 0.75, 70, 1]} renderOrder={1}>
          <meshBasicMaterial map={glowTex()} color={hdr(spillColor, 0.55 * spill)} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ) : null}
      {mastMesh ? <primitive object={mastMesh} /> : null}
      {headMesh ? <primitive object={headMesh} /> : null}
      {poolMesh ? <primitive object={poolMesh} /> : null}
    </group>
  );
};
