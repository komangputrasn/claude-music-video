/**
 * Y2K UI kit — <Cursor3D>: chunky extruded mouse cursor (white body on a black outline shell) + <Hourglass3D>.
 * Same outlines as the 2D <Cursor> (cursors.ts). Lies in the XY plane facing +Z; the HOTSPOT is the local origin
 * (arrow tip / index fingertip / hourglass centre). 32 design units = `size` metres.
 *
 * API
 *   <Cursor3D kind='arrow'|'hand'|'hourglass' size={1} click={0..1} depth? color='#FFFFFF' outlineColor='#0B0B14'
 *             look='gloss'|'toon' ripple={true} hourglassRot? sand? {...groupProps}/>
 *       click: press animation (pushes toward -Z, squashes, aqua ripple ring at the hotspot). Drive 0->1 over ~12 frames.
 *       To click a <Popup3D> button: put the cursor at popupButton3D(spec, i, width) + [0, 0, ~0.15].
 *   <Hourglass3D size={1} rot={deg} sand={0..1} {...groupProps}/>   lathe glass, flowing sand, wooden caps + posts (centre origin)
 *   CURSOR3D_TIP = [0, 0, 0]   (hotspot)
 *
 * Usage
 *   <Cursor3D kind="arrow" size={1.2} position={[0.3, -0.2, 0.4]} rotation={[0, -0.3, 0]} click={clickAt(frame, 40)}/>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {ARROW_PTS, clickPress, clickRipple, CursorKind, HAND_LINES, HAND_PIECES} from './cursors';
import {toonMat} from '../characters/toon';
import {InkMesh} from '../characters/InkMesh';
import {C} from '../palette';

type GroupProps = Omit<ThreeElements['group'], 'children'>;

export const CURSOR3D_TIP: [number, number, number] = [0, 0, 0];

/** Outward offset of a polygon (flat x,y list) with mitred joins (clamped). */
const offsetPoly = (pts: number[], o: number): number[] => {
  const n = pts.length / 2;
  let A = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    A += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1];
  }
  const sg = A > 0 ? 1 : -1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n, q = (i + 1) % n;
    const x0 = pts[p * 2], y0 = pts[p * 2 + 1], x1 = pts[i * 2], y1 = pts[i * 2 + 1], x2 = pts[q * 2], y2 = pts[q * 2 + 1];
    let ex = x1 - x0, ey = y1 - y0;
    let l = Math.hypot(ex, ey) || 1;
    ex /= l; ey /= l;
    let fx = x2 - x1, fy = y2 - y1;
    l = Math.hypot(fx, fy) || 1;
    fx /= l; fy /= l;
    const n1x = sg * ey, n1y = -sg * ex, n2x = sg * fy, n2y = -sg * fx;
    let mx = n1x + n2x, my = n1y + n2y;
    const ml = Math.hypot(mx, my);
    if (ml < 1e-6) {
      mx = n1x; my = n1y;
    } else {
      mx /= ml; my /= ml;
    }
    const d = Math.min(o * 3, o / Math.max(0.2, mx * n1x + my * n1y));
    out.push(x1 + mx * d, y1 + my * d);
  }
  return out;
};

const toShape = (pts: number[], k: number) => {
  const v: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i += 2) v.push(new THREE.Vector2(pts[i] * k, -pts[i + 1] * k));
  return new THREE.Shape(v);
};

const extrude = (shape: THREE.Shape, depth: number, bevelT: number, bevelS: number, z: number) => {
  const geo = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: true, bevelThickness: bevelT, bevelSize: bevelS, bevelSegments: 3, curveSegments: 6});
  geo.translate(0, 0, z);
  geo.computeVertexNormals();
  return geo;
};

const buildCursor = (kind: 'arrow' | 'hand', k: number, d: number, ol: number) => {
  const polys = kind === 'arrow' ? [ARROW_PTS] : HAND_PIECES;
  const white: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  for (const p of polys) {
    white.push(extrude(toShape(p, k), d, d * 0.3, 0.35 * k, 0));
    black.push(extrude(toShape(offsetPoly(p, ol), k), d * 0.9, d * 0.25, 0.3 * k, -d * 0.35));
  }
  const lines: {pos: [number, number, number]; size: [number, number, number]}[] = [];
  if (kind === 'hand') {
    for (const [x1, y1, x2, y2] of HAND_LINES) {
      const cx = ((x1 + x2) / 2) * k, cy = (-(y1 + y2) / 2) * k;
      const w = Math.max(Math.abs(x2 - x1), 1.1) * k, h = Math.max(Math.abs(y2 - y1), 1.1) * k;
      lines.push({pos: [cx, cy, d * 1.3], size: [w, h, d * 0.12]});
    }
  }
  return {white, black, lines};
};

export type Cursor3DProps = GroupProps & {
  kind?: CursorKind;
  size?: number;
  click?: number;
  depth?: number;
  color?: string;
  outlineColor?: string;
  look?: 'gloss' | 'toon';
  ripple?: boolean;
  /** outline width in design units (32 = size) */
  outline?: number;
  hourglassRot?: number;
  sand?: number;
};

export const Cursor3D: React.FC<Cursor3DProps> = ({
  kind = 'arrow', size = 1, click = 0, depth, color = '#E9EDF5', outlineColor = '#0B0B14', look = 'gloss', ripple = true, outline = 2.2, hourglassRot = 0,
  sand = 0.45, ...group
}) => {
  const k = size / 32;
  const d = depth ?? size * 0.09;
  const geos = useMemo(() => (kind === 'hourglass' ? null : buildCursor(kind, k, d, outline)), [kind, k, d, outline]);
  const mats = useMemo(
    () => ({
      white: look === 'toon' ? toonMat(color) : new THREE.MeshPhysicalMaterial({color, roughness: 0.5, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.18}),
      black: toonMat(outlineColor),
    }),
    [look, color, outlineColor],
  );
  useLayoutEffect(
    () => () => {
      geos?.white.forEach((g) => g.dispose());
      geos?.black.forEach((g) => g.dispose());
    },
    [geos],
  );
  useLayoutEffect(
    () => () => {
      if (look !== 'toon') mats.white.dispose();
    },
    [mats, look],
  );
  const press = clickPress(click);
  const rip = ripple ? clickRipple(click) : null;
  return (
    <group {...group}>
      <group position={[0, 0, -press * size * 0.12]} scale={1 - 0.12 * press}>
        {kind === 'hourglass' ? (
          <Hourglass3D size={size * 0.95} rot={hourglassRot} sand={sand} />
        ) : (
          <>
            {geos!.white.map((g, i) => <mesh key={`w${i}`} geometry={g} material={mats.white} />)}
            {geos!.black.map((g, i) => <mesh key={`b${i}`} geometry={g} material={mats.black} />)}
            {geos!.lines.map((l, i) => (
              <mesh key={`l${i}`} position={l.pos} material={mats.black}>
                <boxGeometry args={l.size} />
              </mesh>
            ))}
          </>
        )}
      </group>
      {rip ? (
        <group position={[0, 0, -size * 0.05]}>
          <mesh>
            <ringGeometry args={[rip.r * k * 0.86, rip.r * k, 64]} />
            <meshBasicMaterial color={C.aqua} transparent opacity={rip.alpha} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[rip.r * k * 0.56, rip.r * k * 0.62, 64]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={rip.alpha * 0.9} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

// ---------------------------------------------------------------- hourglass
const bulbR = (t: number) => 1.4 + (6.4 * Math.sin(Math.min(1, Math.abs(t)) * Math.PI * 0.6)) / Math.sin(Math.PI * 0.6);

export type Hourglass3DProps = GroupProps & {size?: number; rot?: number; sand?: number};

export const Hourglass3D: React.FC<Hourglass3DProps> = ({size = 1, rot = 0, sand = 0.45, ...group}) => {
  const k = size / 32;
  const s = Math.max(0, Math.min(1, sand));
  const glass = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 32; i++) {
      const y = -11.5 + (23 * i) / 32;
      pts.push(new THREE.Vector2(bulbR(y / 11.5) * k, y * k));
    }
    return new THREE.LatheGeometry(pts, 28);
  }, [k]);
  const sandGeo = useMemo(() => {
    const q = Math.round(s * 40) / 40;
    const top = 0.4 + 10 * (1 - q);
    const topPts: THREE.Vector2[] = [new THREE.Vector2(0, 0.4 * k)];
    if (q < 0.99) {
      for (let i = 0; i <= 12; i++) {
        const y = 0.4 + ((top - 0.4) * i) / 12;
        topPts.push(new THREE.Vector2(bulbR(y / 11.5) * 0.88 * k, y * k));
      }
      topPts.push(new THREE.Vector2(0, (top - 0.6) * k));
    }
    const pileH = 0.3 + 9.4 * q;
    const R = bulbR(1) * 0.88;
    const botPts = [
      new THREE.Vector2(0, -11.2 * k),
      new THREE.Vector2(R * k, -11.2 * k),
      new THREE.Vector2(Math.min(R, bulbR((-11.2 + pileH * 0.3) / 11.5) * 0.88) * k, (-11.2 + pileH * 0.3) * k),
      new THREE.Vector2(0, (-11.2 + pileH) * k),
    ];
    return {
      top: q < 0.99 ? new THREE.LatheGeometry(topPts, 24) : null,
      bot: new THREE.LatheGeometry(botPts, 24),
      stream: q > 0.01 && q < 0.99 ? {h: (0.4 + 11.2 - pileH) * k, y: ((0.4 + (-11.2 + pileH)) / 2) * k} : null,
    };
  }, [k, s]);
  useLayoutEffect(() => () => glass.dispose(), [glass]);
  useLayoutEffect(
    () => () => {
      sandGeo.top?.dispose();
      sandGeo.bot.dispose();
    },
    [sandGeo],
  );
  const wood = '#B8742A';
  return (
    <group {...group}>
      <group rotation={[0, 0, (rot * Math.PI) / 180]}>
        <mesh geometry={glass} renderOrder={2}>
          <meshPhysicalMaterial color="#DDF4FF" roughness={0.04} metalness={0} transparent opacity={0.32} clearcoat={1} envMapIntensity={1.6} depthWrite={false}
            side={THREE.DoubleSide} />
        </mesh>
        {sandGeo.top ? <mesh geometry={sandGeo.top} material={toonMat(C.pancakeGold)} /> : null}
        <mesh geometry={sandGeo.bot} material={toonMat(C.pancakeGold)} />
        {sandGeo.stream ? (
          <mesh position={[0, sandGeo.stream.y, 0]} material={toonMat('#F2C46E')}>
            <cylinderGeometry args={[0.35 * k, 0.35 * k, sandGeo.stream.h, 8]} />
          </mesh>
        ) : null}
        {[1, -1].map((sg) => (
          <InkMesh key={sg} color={wood} position={[0, sg * 13.3 * k, 0]} outline={size * 0.012}>
            <cylinderGeometry args={[10 * k, 10 * k, 3.6 * k, 24]} />
          </InkMesh>
        ))}
        {[90, 210, 330].map((a) => (
          <InkMesh key={a} color={wood} position={[Math.cos((a * Math.PI) / 180) * 8.9 * k, 0, Math.sin((a * Math.PI) / 180) * 8.9 * k]} outline={size * 0.008}>
            <cylinderGeometry args={[0.75 * k, 0.75 * k, 23 * k, 8]} />
          </InkMesh>
        ))}
      </group>
    </group>
  );
};
