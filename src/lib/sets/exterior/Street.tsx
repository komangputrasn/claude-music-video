/**
 * <Street> — night suburban street segment running along Z (centred on the origin, road surface at y=0): two-lane asphalt
 * with dashed yellow centre line + white edge lines, kerbs, concrete sidewalks with joints, grass verges with hedges and
 * fire hydrant, sodium <StreetLamp>s on one or both sides, optional WET look (glossy asphalt, puddles, long amber light
 * streak reflections — use with <Stage env="night"> for reflections).
 *
 *   <Street length={80} wet lamps="both" spacing={16} lampOn={1} />
 *   STREET.sidewalkX = 4.7 (centre of the right sidewalk, x>0; mirror for the left), STREET.sidewalkY = 0.15
 *   streetLampPositions({length, spacing, lamps}) -> [{base: [x,y,z], lens: [x,y,z], side}]   (street-local)
 *
 * <BackdropHouse seed lights/> cheap lit house silhouette (also used along the street when houses=true).
 * Props: length (m, default 60), wet (false), lamps 'left' | 'right' | 'both' | 'none' (default 'both', staggered),
 *        houses (true) + houseLights (0..1),
 *        spacing (16), lampOn (0..1 or (i) => 0..1 for flicker), lampLights (true = real point lights), offset (shifts
 *        the dashes/joints along Z for an endless-scroll walk: pass -distanceWalked), verge (true).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {toonMat} from '../../characters/toon';
import {canvasTex, boxGeo, boxGeoM, toonTexMat, glowTex, hash1, Ink, neonMat} from './common';
import {StreetLamp, STREETLAMP} from './StreetLamp';
import {Bush} from './Tree';
import {C} from '../../palette';

type GroupProps = ThreeElements['group'];
type V3 = [number, number, number];

export const STREET = {
  laneWidth: 3.5,
  roadHalf: 3.5,
  curbHeight: 0.15,
  curbWidth: 0.2,
  /** sidewalk spans x = 3.7 .. 5.7 (and mirrored) */
  sidewalkInner: 3.7,
  sidewalkOuter: 5.7,
  sidewalkX: 4.7,
  sidewalkY: 0.15,
  /** lamps stand at the outer edge of the sidewalk */
  lampX: 5.35,
};

export type LampSide = 'left' | 'right' | 'both' | 'none';
/** Street-local lamp positions (base on the sidewalk) and lens positions. */
export const streetLampPositions = ({length = 60, spacing = 16, lamps = 'both' as LampSide} = {}) => {
  const out: {base: V3; lens: V3; side: 'left' | 'right'}[] = [];
  if (lamps === 'none') return out;
  const n = Math.max(1, Math.floor(length / spacing));
  for (let i = 0; i < n; i++) {
    const z = -length / 2 + spacing * (i + 0.5);
    const sides: ('left' | 'right')[] = lamps === 'both' ? [i % 2 ? 'left' : 'right'] : [lamps];
    for (const side of sides) {
      const sx = side === 'left' ? -1 : 1;
      out.push({
        base: [sx * STREET.lampX, STREET.sidewalkY, z],
        lens: [sx * (STREET.lampX - STREETLAMP.arm), STREET.sidewalkY + STREETLAMP.lens[1], z],
        side,
      });
    }
  }
  return out;
};

export type StreetProps = GroupProps & {
  length?: number;
  wet?: boolean;
  lamps?: LampSide;
  spacing?: number;
  lampOn?: number | ((i: number) => number);
  lampLights?: boolean;
  offset?: number;
  verge?: boolean;
  /** low-detail suburban houses set back behind the verges (lit windows at night) */
  houses?: boolean;
  /** 0..1 window glow for the backdrop houses */
  houseLights?: number;
};

const HOUSE_COLS = ['#f4d9a8', '#b8d8f0', '#e8c0d0', '#d0e8b8', '#f0f0e0', '#c8c0f0'];
const ROOF_COLS = ['#6a3a4a', '#3a4a6a', '#5a3a2a', '#2a4a5a'];
/** Cheap backdrop house (box + gable prism + glowing windows) facing +Z. ~7 x 6 m, base at y=0. */
export const BackdropHouse: React.FC<GroupProps & {seed?: number; lights?: number}> = ({seed = 1, lights = 1, ...g}) => {
  const w = 6.5 + hash1(seed, 1) * 2, h = 4.8 + (hash1(seed, 2) > 0.5 ? 2.4 : 0), d = 6;
  const roofGeo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2 - 0.35, 0);
    sh.lineTo(w / 2 + 0.35, 0);
    sh.lineTo(0, 2.3);
    sh.lineTo(-w / 2 - 0.35, 0);
    const ge = new THREE.ExtrudeGeometry(sh, {depth: d + 0.6, bevelEnabled: false});
    ge.translate(0, 0, -(d + 0.6) / 2);
    return ge;
  }, [w, d]);
  const col = HOUSE_COLS[Math.floor(hash1(seed, 3) * HOUSE_COLS.length)];
  const roof = ROOF_COLS[Math.floor(hash1(seed, 4) * ROOF_COLS.length)];
  const floors = h > 6 ? 2 : 1;
  const wins: [number, number, boolean][] = [];
  for (let f = 0; f < floors; f++) for (const x of [-w * 0.3, w * 0.3]) wins.push([x, 1.7 + f * 2.4, hash1(seed * 7 + f * 3 + (x > 0 ? 1 : 0), 9) > 0.35]);
  const lq = Math.round(lights * 10) / 10;
  return (
    <group {...g}>
      <Ink geometry={boxGeo(w, h, d)} color={col} outline={0.04} position={[0, h / 2, 0]} />
      <Ink geometry={roofGeo} color={roof} outline={0.04} position={[0, h, 0]} />
      {wins.map(([x, y, on], i) => (
        <mesh key={i} geometry={boxGeo(1.1, 1.0, 0.05)} position={[x, y, d / 2 + 0.01]}
          material={on && lq > 0 ? neonMat('#ffc870', 0.15 + lq * 1.6) : toonMat('#3a4a6a')} />
      ))}
      <mesh geometry={boxGeo(0.9, 1.9, 0.05)} position={[0, 0.95, d / 2 + 0.01]} material={toonMat('#4a3a5a')} />
    </group>
  );
};

export const Street: React.FC<StreetProps> = ({
  length = 60, wet = false, lamps = 'both', spacing = 16, lampOn = 1, lampLights = true, offset = 0, verge = true, houses = true, houseLights = 1, ...g
}) => {
  const R = STREET.roadHalf;
  const asphalt = useMemo(
    () =>
      canvasTex(256, 256, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 1800; i++) {
          const v = 0.75 + hash1(i, 3) * 0.35;
          c.fillStyle = `rgba(${Math.round(200 * v)},${Math.round(205 * v)},${Math.round(220 * v)},0.5)`;
          c.fillRect(hash1(i, 4) * w, hash1(i, 5) * h, 2, 2);
        }
        // a couple of tar-seam cracks
        c.strokeStyle = 'rgba(40,40,50,0.55)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(w * 0.1, 0);
        c.bezierCurveTo(w * 0.3, h * 0.3, w * 0.05, h * 0.6, w * 0.25, h);
        c.stroke();
      }, {repeat: [1 / 4, 1 / 4]}),
    [],
  );
  const concrete = useMemo(
    () =>
      canvasTex(128, 128, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(0, 0, w, 3);
        for (let i = 0; i < 300; i++) {
          c.fillStyle = `rgba(0,0,0,${0.03 + hash1(i, 8) * 0.05})`;
          c.fillRect(hash1(i, 9) * w, hash1(i, 10) * h, 3, 3);
        }
      }, {repeat: [1 / 2, 1 / 1.5]}),
    [],
  );
  const roadMat = useMemo(() => {
    if (wet) return new THREE.MeshStandardMaterial({color: '#2c3040', map: asphalt, roughness: 0.26, metalness: 0.45, envMapIntensity: 0.22});
    return new THREE.MeshToonMaterial({color: '#3a3e4a', map: asphalt});
  }, [wet, asphalt]);
  const walkMat = useMemo(() => {
    if (wet) return new THREE.MeshStandardMaterial({color: '#8a8e98', map: concrete, roughness: 0.35, metalness: 0.2});
    return toonTexMat('#a9adb6', concrete);
  }, [wet, concrete]);
  // shift textures for "endless" walking
  useLayoutEffect(() => {
    asphalt.offset.set(0, -offset / 4);
    concrete.offset.set(0, -offset / 1.5);
  });

  // dashes
  const dashRef = React.useRef<THREE.InstancedMesh>(null);
  const dashCount = Math.ceil(length / 6) + 2;
  useLayoutEffect(() => {
    const m = dashRef.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const ph = ((offset % 6) + 6) % 6;
    for (let i = 0; i < dashCount; i++) {
      const z = -length / 2 + i * 6 + ph - 3;
      const clipped = z < -length / 2 + 1.5 || z > length / 2 - 1.5;
      mat.makeScale(clipped ? 0 : 1, 1, clipped ? 0 : 1);
      mat.setPosition(0, 0.012, z);
      m.setMatrixAt(i, mat);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  const lampsList = useMemo(() => streetLampPositions({length, spacing, lamps}), [length, spacing, lamps]);
  const reflMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTex(), color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}),
    [],
  );
  const onAt = (i: number) => (typeof lampOn === 'function' ? lampOn(i) : lampOn);
  useLayoutEffect(() => {
    reflMat.color.set(C.sodium).multiplyScalar(1.1 * onAt(0));
  });

  const puddles = useMemo(
    () =>
      wet
        ? Array.from({length: Math.round(length / 7)}, (_, i) => ({
            x: (hash1(i, 61) - 0.5) * 2 * (R - 0.6),
            z: (hash1(i, 62) - 0.5) * (length - 4),
            sx: 0.8 + hash1(i, 63) * 1.8,
            sz: 0.6 + hash1(i, 64) * 1.2,
            r: hash1(i, 65) * 3,
          }))
        : [],
    [wet, length],
  );
  const puddleMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#3a4a70', roughness: 0.06, metalness: 0.6, envMapIntensity: 0.28, emissive: '#16224a'}), []);

  return (
    <group {...g}>
      {/* asphalt */}
      <mesh geometry={boxGeoM(2 * R, 0.2, length)} material={roadMat} position={[0, -0.1, 0]} receiveShadow />
      {/* lines */}
      <instancedMesh ref={dashRef} args={[boxGeo(0.14, 0.01, 3), toonMat('#ffcf3a', {emissive: '#ffcf3a', emissiveIntensity: 0.15}), dashCount]} frustumCulled={false} />
      {[-1, 1].map((sx) => (
        <mesh key={`edge${sx}`} geometry={boxGeo(0.14, 0.01, length)} material={toonMat('#f2f2f2', {emissive: '#ffffff', emissiveIntensity: 0.08})} position={[sx * (R - 0.3), 0.012, 0]} />
      ))}
      {/* kerbs + sidewalks + verge */}
      {[-1, 1].map((sx) => (
        <group key={`side${sx}`}>
          <Ink geometry={boxGeo(STREET.curbWidth, STREET.curbHeight + 0.1, length)} color="#b8bcc6" outline={0.015}
            position={[sx * (R + STREET.curbWidth / 2), (STREET.curbHeight - 0.1) / 2, 0]} />
          <mesh geometry={boxGeoM(STREET.sidewalkOuter - STREET.sidewalkInner, 0.2, length)} material={walkMat}
            position={[sx * STREET.sidewalkX, STREET.sidewalkY - 0.1, 0]} receiveShadow />
          {verge ? (
            <mesh geometry={boxGeo(6, 0.2, length)} material={toonMat(wet ? '#183a24' : '#1f4a2a')} position={[sx * (STREET.sidewalkOuter + 3), STREET.sidewalkY - 0.12, 0]} />
          ) : null}
        </group>
      ))}
      {verge
        ? Array.from({length: Math.floor(length / 5)}, (_, i) => {
            const sx = i % 2 ? -1 : 1;
            const z = -length / 2 + 2.5 + i * 5 + hash1(i, 71) * 1.5;
            return <Bush key={`b${i}`} seed={i + 3} size={1.1 + hash1(i, 72) * 0.5} color={wet ? '#1f6a34' : '#2a8a3a'} position={[sx * (STREET.sidewalkOuter + 1.2 + hash1(i, 73)), STREET.sidewalkY, z]} />;
          })
        : null}
      {houses
        ? Array.from({length: Math.floor(length / 14)}, (_, i) =>
            [-1, 1].map((sx) => (
              <BackdropHouse key={`h${i}${sx}`} seed={i * 2 + (sx > 0 ? 1 : 0) + 5} lights={houseLights}
                position={[sx * 15.5, STREET.sidewalkY - 0.05, -length / 2 + 7 + i * 14 + (sx > 0 ? 4 : 0)]} rotation={[0, -sx * Math.PI / 2, 0]} />
            )),
          )
        : null}
      {verge ? (
        <>
          {[-1, 1].map((sx) => (
            <mesh key={`lawn${sx}`} geometry={boxGeo(14, 0.2, length)} material={toonMat(wet ? '#163a26' : '#1d4a2c')} position={[sx * (STREET.sidewalkOuter + 6 + 7), STREET.sidewalkY - 0.17, 0]} />
          ))}
        </>
      ) : null}
      {/* fire hydrant */}
      <group position={[STREET.sidewalkInner + 0.45, STREET.sidewalkY, -length / 2 + spacing * 1.1]}>
        <Ink geometry={boxGeo(0.28, 0.08, 0.28)} color={C.alertRed} outline={0.015} position={[0, 0.04, 0]} />
        <mesh position={[0, 0.35, 0]} material={toonMat(C.alertRed)}>
          <cylinderGeometry args={[0.12, 0.13, 0.6, 10]} />
        </mesh>
        <mesh position={[0, 0.68, 0]} material={toonMat(C.alertRed)}>
          <sphereGeometry args={[0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0.14, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} material={toonMat('#e8e8e8')}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
        </mesh>
      </group>
      {/* manhole */}
      <mesh position={[1.2, 0.006, length * 0.12]} rotation={[-Math.PI / 2, 0, 0]} material={wet ? puddleMat : toonMat('#2a2c34')}>
        <circleGeometry args={[0.45, 16]} />
      </mesh>
      {/* puddles */}
      {puddles.map((p, i) => (
        <mesh key={`p${i}`} position={[p.x, 0.004, p.z]} rotation={[-Math.PI / 2, 0, p.r]} scale={[p.sx, p.sz, 1]} material={puddleMat}>
          <circleGeometry args={[1, 12]} />
        </mesh>
      ))}
      {/* lamps */}
      {lampsList.map((l, i) => (
        <group key={`l${i}`}>
          <StreetLamp position={l.base} rotation={[0, l.side === 'left' ? Math.PI / 2 : -Math.PI / 2, 0]} on={onAt(i)} light={lampLights}
            groundY={-STREET.sidewalkY} />
          {wet ? (
            <mesh position={[l.lens[0], 0.015, l.lens[2]]} rotation={[-Math.PI / 2, 0, 0]} material={reflMat} renderOrder={6}>
              <planeGeometry args={[1.4, 18]} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
};
