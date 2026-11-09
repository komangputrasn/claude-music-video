/**
 * <RoomShell hideWalls doorOpen stars time /> — floor, walls (with window + door openings), trims, ceiling, door,
 * light switch, glow-in-the-dark stars. Room space (see layout.ts). Walls are thick (0.12 m) so diorama cut-aways read.
 * The ceiling is a single downward-facing plane: invisible from above, so high cameras see into the room.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {toonMat} from '../../characters/toon';
import {FONTS} from '../../palette';
import {TBox, geo, chromeMat, toonMapMat, makeCanvas, canvasTex} from './ink';
import {floorTexture, wallTexture} from './textures';
import {GlowStars} from './Furniture';
import {ROOM, WIN, DOOR, BED, V3} from './layout';

export type WallId = 'front' | 'left' | 'right' | 'back' | 'ceiling';

const wallFaceCache = new Map<string, THREE.PlaneGeometry>();
/** Plane w x h whose UVs are in metres (offset by its centre in wall space) so wallpaper tiles seamlessly. */
const wallFace = (w: number, h: number, cu: number, cv: number) => {
  const key = `${w},${h},${cu},${cv}`;
  let g = wallFaceCache.get(key);
  if (!g) {
    g = new THREE.PlaneGeometry(w, h);
    const p = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + cu) / 1.0, (p.getY(i) + cv) / 1.0);
    wallFaceCache.set(key, g);
  }
  return g;
};

type Rect = {u0: number; u1: number; v0: number; v1: number};
/** split [u0,u1]x[0,h] minus one hole into up to 4 rects */
const splitAround = (u0: number, u1: number, h: number, hole?: Rect): Rect[] => {
  if (!hole) return [{u0, u1, v0: 0, v1: h}];
  return [
    {u0, u1: hole.u0, v0: 0, v1: h},
    {u0: hole.u1, u1, v0: 0, v1: h},
    ...(hole.v0 > 0 ? [{u0: hole.u0, u1: hole.u1, v0: 0, v1: hole.v0}] : []),
    {u0: hole.u0, u1: hole.u1, v0: hole.v1, v1: h},
  ].filter((r) => r.u1 - r.u0 > 1e-3 && r.v1 - r.v0 > 1e-3);
};

/**
 * A wall in its own frame: u along local +X, v up; interior face at local z=0 facing +Z; body extends to z=-T.
 */
const Wall: React.FC<{len: number; hole?: Rect; mat: THREE.Material; trim?: boolean; position: V3; rotationY: number; extend?: number}> = ({
  len, hole, mat, trim = true, position, rotationY, extend = 0,
}) => {
  const h = ROOM.h, T = ROOM.wallT;
  const rects = splitAround(-len / 2, len / 2, h, hole);
  const body = toonMat('#6f7fc4');
  const trimMat = toonMat('#f6f6fb');
  const trimRuns = hole && hole.v0 <= 0.01 ? [{a: -len / 2, b: hole.u0}, {a: hole.u1, b: len / 2}] : [{a: -len / 2, b: len / 2}];
  const railRuns = hole && hole.v0 < 0.95 ? [{a: -len / 2, b: hole.u0}, {a: hole.u1, b: len / 2}] : [{a: -len / 2, b: len / 2}];
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {rects.map((r, i) => {
        const w = r.u1 - r.u0, hh = r.v1 - r.v0, cu = (r.u0 + r.u1) / 2, cv = (r.v0 + r.v1) / 2;
        const ext0 = r.u0 <= -len / 2 + 1e-3 ? extend : 0, ext1 = r.u1 >= len / 2 - 1e-3 ? extend : 0;
        return (
          <group key={i}>
            <mesh geometry={wallFace(w, hh, cu, cv)} material={mat} position={[cu, cv, 0]} />
            <mesh geometry={geo.box(w + ext0 + ext1, hh, T)} material={body} position={[cu + (ext1 - ext0) / 2, cv, -T / 2 - 0.002]} />
          </group>
        );
      })}
      {/* top cap (dark cut edge for diorama views) */}
      <mesh geometry={geo.box(len + 2 * extend, 0.012, T + 0.004)} material={toonMat('#2a2550')} position={[0, h + 0.006, -T / 2]} />
      {trim
        ? trimRuns.map((r, i) => (
            <mesh key={`b${i}`} geometry={geo.box(r.b - r.a, 0.09, 0.016)} material={trimMat} position={[(r.a + r.b) / 2, 0.045, 0.008]} />
          ))
        : null}
      {trim
        ? railRuns.map((r, i) => (
            <mesh key={`r${i}`} geometry={geo.box(r.b - r.a, 0.035, 0.018)} material={trimMat} position={[(r.a + r.b) / 2, 0.95, 0.009]} />
          ))
        : null}
      {/* crown strip */}
      <mesh geometry={geo.box(len, 0.05, 0.02)} material={trimMat} position={[0, h - 0.025, 0.01]} />
    </group>
  );
};

let dome: THREE.SphereGeometry | null = null;
/** lower hemisphere only (so it doesn't poke through the ceiling in top-down views) */
const domeGeo = () => (dome ??= new THREE.SphereGeometry(0.22, 16, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));

const signCache: {t?: THREE.CanvasTexture} = {};
const doorSign = () => {
  if (signCache.t) return signCache.t;
  const {c, ctx} = makeCanvas(256, 160);
  ctx.fillStyle = '#ffe94a';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#ff4fb8';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 150);
  ctx.fillStyle = '#1b1030';
  ctx.textAlign = 'center';
  ctx.font = `bold 44px ${FONTS.comic}`;
  ctx.fillText('KNOCK', 128, 68);
  ctx.fillText('FIRST!!', 128, 122);
  signCache.t = canvasTex(c);
  return signCache.t;
};

export const RoomShell: React.FC<{hideWalls?: WallId[]; doorOpen?: number; stars?: number; time?: 'night' | 'dawn' | 'day'}> = ({
  hideWalls = [], doorOpen = 0, stars = 0, time = 'night',
}) => {
  const floorMat = useMemo(() => toonMapMat(floorTexture()), []);
  const wallMat = useMemo(() => toonMapMat(wallTexture()), []);
  const show = (w: WallId) => !hideWalls.includes(w);
  const {xMin, xMax, zMin, zMax, h, wallT: T} = ROOM;
  const hw = WIN.width / 2;
  const dHole: Rect = {u0: -(DOOR.z + DOOR.width / 2), u1: -(DOOR.z - DOOR.width / 2), v0: 0, v1: DOOR.height};
  const open = Math.max(0, Math.min(1, doorOpen));
  return (
    <group>
      {/* floor + slab */}
      <mesh geometry={geo.plane(ROOM.w, ROOM.d)} material={floorMat} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={geo.box(ROOM.w + 2 * T, 0.1, ROOM.d + 2 * T)} material={toonMat('#4a2a14')} position={[0, -0.051, 0]} />
      {show('back') ? (
        <Wall len={ROOM.w} position={[0, 0, zMin]} rotationY={0} mat={wallMat} extend={T}
          hole={{u0: WIN.x - hw, u1: WIN.x + hw, v0: WIN.sill, v1: WIN.top}} />
      ) : null}
      {show('front') ? <Wall len={ROOM.w} position={[0, 0, zMax]} rotationY={Math.PI} mat={wallMat} extend={T} /> : null}
      {show('left') ? <Wall len={ROOM.d} position={[xMin, 0, 0]} rotationY={Math.PI / 2} mat={wallMat} hole={dHole} /> : null}
      {show('right') ? <Wall len={ROOM.d} position={[xMax, 0, 0]} rotationY={-Math.PI / 2} mat={wallMat} /> : null}
      {show('ceiling') ? (
        <group>
          <mesh geometry={geo.plane(ROOM.w, ROOM.d)} material={toonMat('#e9e7f4')} rotation={[Math.PI / 2, 0, 0]} position={[0, h, 0]} />
          <mesh geometry={domeGeo()} material={toonMat('#f6f6ff', {emissive: '#fff6e0', emissiveIntensity: 0.15})} scale={[1, 0.35, 1]} position={[0, h, 0]} />
        </group>
      ) : null}
      {show('left') ? (
        <group>
          {/* door casing */}
          {[-1, 1].map((s) => (
            <TBox key={s} size={[0.03, DOOR.height + 0.06, 0.08]} color="#f6f6fb" position={[xMin + 0.015, (DOOR.height + 0.06) / 2, DOOR.z + s * (DOOR.width / 2 + 0.04)]} ink={0.005} />
          ))}
          <TBox size={[0.03, 0.08, DOOR.width + 0.16]} color="#f6f6fb" position={[xMin + 0.015, DOOR.height + 0.03, DOOR.z]} ink={0.005} />
          {/* hallway beyond */}
          <mesh geometry={geo.box(0.02, DOOR.height + 0.2, DOOR.width + 0.6)} material={toonMat(time === 'day' ? '#c9b48a' : '#2b2140')} position={[xMin - 0.9, DOOR.height / 2, DOOR.z]} />
          {/* door leaf, hinge on +z jamb */}
          <group position={[xMin + 0.03, 0, DOOR.z + DOOR.width / 2 - 0.01]} rotation={[0, -open * 1.45, 0]}>
            <group position={[-0.02, 0, -(DOOR.width - 0.02) / 2]}>
              <TBox size={[0.04, DOOR.height - 0.02, DOOR.width - 0.02]} r={0.006} color="#f2f2f7" position={[0, DOOR.height / 2, 0]} ink={0.007} />
              {[[0.55, 0.62], [1.45, 0.82]].map(([y, hh], i) => [-1, 1].map((s) => (
                <TBox key={`${i}${s}`} size={[0.012, hh, 0.3]} r={0.004} color="#e2e3ee" position={[0.024, y, s * 0.2]} ink={0.003} />
              )))}
              <mesh geometry={geo.sphere(0.03, 12, 8)} material={chromeMat('#e8d27a', 0.25)} position={[0.06, 1.0, -(DOOR.width / 2) + 0.09]} />
              <mesh geometry={geo.plane(0.3, 0.19)} position={[0.032, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <meshToonMaterial map={doorSign()} />
              </mesh>
            </group>
          </group>
          {/* light switch */}
          <TBox size={[0.012, 0.12, 0.075]} r={0.004} color="#f6f6fb" position={[xMin + 0.006, 1.2, DOOR.z - DOOR.width / 2 - 0.2]} ink={0.003} />
        </group>
      ) : null}
      {/* glow-in-the-dark stars: back wall above the bed + ceiling */}
      {show('back') ? (
        <GlowStars intensity={stars} position={[BED.x, 0, zMin + 0.004]}
          points={[[-0.55, 1.5, 0.035, 0.2], [0.5, 1.42, 0.03, -0.3], [0.62, 2.2, 0.045, 0.5], [-0.62, 2.28, 0.03, 0.1], [0.38, 2.42, 0.025, 0.9], [-0.42, 2.0, 0.022, 1.2]]} />
      ) : null}
      {show('ceiling') ? (
        <GlowStars intensity={stars} position={[0, h - 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}
          points={[[-1.2, -1.2, 0.06, 0], [-0.4, -1.5, 0.045, 0.4], [0.3, -1.0, 0.05, 1.0], [-0.9, -0.4, 0.04, 0.2], [0.9, -0.2, 0.055, 0.6], [-0.1, 0.4, 0.04, 0.3], [1.3, 0.8, 0.05, 0.1], [-1.4, 0.9, 0.045, 0.8], [0.6, 1.3, 0.04, 0.5]]} />
      ) : null}
    </group>
  );
};
