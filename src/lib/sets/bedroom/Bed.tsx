/**
 * Smart bed + talking pillow (cel-shaded, ink outlines).
 *
 * <Bed tilt={0..1} glow={0..1} blanket={0..1} pillow={{glow, talk, frame}} {...groupProps} />
 *   Origin: floor, centred on the bed's width, z = 0 at the headboard face; the mattress runs toward +Z (2.04 m).
 *   tilt    motorised head section rises to a sitting angle (62 deg at 1) — hinged at BED_LOCAL.hinge with two chrome
 *           pistons and an aqua glow in the opening wedge so the motion reads instantly.
 *   glow    blue LED strip + floor underglow + headboard light-bar (0 = off).
 *   blanket 0 = duvet folded at the hinge (waist), 1 = duvet flap rides up the head section to the chest.
 *   pillow  props for the built-in <Pillow/> or false to omit it (place your own).
 *   headSlot extra nodes attached to the head section (local: origin at hinge on the mattress top, -Z toward headboard).
 *   Exports BED_LOCAL (dimensions & anchors in Bed-local space).
 *
 * <Pillow glow={0..1} talk={0..1} frame={f} {...groupProps} />
 *   White puffy pillow (0.64 x 0.14 x 0.4, origin at its centre) with an aqua speaker grille + waveform on top.
 *   talk > 0 pulses the waveform (driven by frame), throbs the pillow and its aqua light. PILLOW_SIZE exported.
 *
 *   <Bed tilt={ramp(f, 20, 50)} pillow={{talk: 0.8, frame: f}} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {toonMat, outlineMat} from '../../characters/toon';
import {noise1} from '../../time';
import {C, FONTS} from '../../palette';
import {TBox, geo, makeCanvas, canvasTex, rrect, INK, hullMat, useGlowMat, glowMat} from './ink';
import {glowTexture} from './textures';
import {BED, PILLOW_LOCAL} from './layout';

type GroupProps = Omit<ThreeElements['group'], 'children'>;

const W = BED.width;
const L = BED.zFoot - BED.zHead; // 2.04
const HINGE = BED.hingeZ - BED.zHead; // 0.86
const TOP = BED.mattressTop;
const BASE = BED.baseTop;

export const BED_LOCAL = {
  width: W,
  length: L,
  mattressTop: TOP,
  /** hinge on the mattress top (head section pivots here) */
  hinge: [0, TOP, HINGE] as [number, number, number],
  /** pillow centre at tilt 0 */
  pillow: [0, TOP + PILLOW_LOCAL[1], HINGE + PILLOW_LOCAL[2]] as [number, number, number],
  maxTilt: BED.maxTilt,
};

export const PILLOW_SIZE = {w: 0.64, h: 0.14, d: 0.4} as const;

// ------------------------------------------------------------------ pillow
const makePillowGeo = (w: number, h: number, d: number) => {
  let g: THREE.BufferGeometry = new THREE.BoxGeometry(w, h, d, 12, 3, 8);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = x / (w / 2), nz = z / (d / 2);
    const puff = (1 - Math.pow(Math.abs(nx), 3)) * (1 - Math.pow(Math.abs(nz), 3));
    const ny = y / (h / 2);
    p.setY(i, y * (0.28 + 0.72 * puff));
    // pinch the side seams a little and round the corners
    const pinch = 1 - 0.06 * (1 - Math.abs(ny));
    p.setX(i, x * (1 - 0.05 * nz * nz) * pinch);
    p.setZ(i, z * (1 - 0.07 * nx * nx) * pinch);
  }
  g.computeVertexNormals();
  return g;
};
let pillowGeo: THREE.BufferGeometry | null = null;

export type PillowProps = GroupProps & {glow?: number; talk?: number; frame?: number};

export const Pillow: React.FC<PillowProps> = ({glow = 0.7, talk = 0, frame = 0, ...group}) => {
  if (!pillowGeo) pillowGeo = makePillowGeo(PILLOW_SIZE.w, PILLOW_SIZE.h, PILLOW_SIZE.d);
  const {c, ctx, tex} = useMemo(() => {
    const k = makeCanvas(256, 112);
    return {...k, tex: canvasTex(k.c)};
  }, []);
  const tk = Math.max(0, Math.min(1, talk));
  const key = tk > 0.001 ? `${tk.toFixed(3)}|${frame}` : 'idle';
  useLayoutEffect(() => {
    const Wc = c.width, Hc = c.height;
    ctx.clearRect(0, 0, Wc, Hc);
    rrect(ctx, 4, 4, Wc - 8, Hc - 8, 40);
    ctx.fillStyle = 'rgba(8,60,90,0.85)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#7fe6ff';
    ctx.stroke();
    // grille dots
    ctx.fillStyle = 'rgba(25,198,255,0.55)';
    for (let y = 22; y < Hc - 16; y += 14) for (let x = 30; x < Wc - 24; x += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // waveform bars
    const n = 15;
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) / ((n - 1) / 2);
      const env = 1 - u * u * 0.75;
      const a = tk > 0.001 ? tk * env * (0.25 + 0.75 * Math.abs(noise1(frame * 0.45 + i * 1.7, 7))) : 0;
      const bh = 6 + a * (Hc - 34);
      const x = Wc / 2 + u * (Wc / 2 - 42);
      ctx.fillStyle = a > 0.35 ? '#e8fbff' : '#7fe6ff';
      rrect(ctx, x - 5, Hc / 2 - bh / 2, 10, bh, 5);
      ctx.fill();
    }
    tex.needsUpdate = true;
  }, [key, c, ctx, tex, frame, tk]);
  useLayoutEffect(() => () => tex.dispose(), [tex]);

  const pulse = tk * (0.5 + 0.5 * Math.sin(frame * 0.9));
  const gl = Math.max(0, glow) + tk * 0.8;
  const grilleMat = useMemo(() => new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false}), [tex]);
  useLayoutEffect(() => {
    grilleMat.color.setScalar(0.45 + gl * 0.6);
  });
  const haloMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTexture(), color: C.aqua, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}),
    [],
  );
  useLayoutEffect(() => {
    haloMat.opacity = Math.min(1, 0.12 * gl + 0.3 * pulse);
  });
  useLayoutEffect(() => () => { grilleMat.dispose(); haloMat.dispose(); }, [grilleMat, haloMat]);
  const s = 1 + 0.03 * pulse;
  return (
    <group {...group}>
      <group scale={[s, 1 + 0.08 * pulse, s]}>
        <mesh geometry={pillowGeo} material={toonMat('#eef1fb')} />
        <mesh geometry={pillowGeo} material={outlineMat(INK)} />
        <mesh geometry={geo.plane(0.36, 0.157)} material={grilleMat} rotation={[-Math.PI / 2 + 0.1, 0, 0]} position={[0, 0.069, 0.055]} />
        <mesh geometry={geo.plane(0.5, 0.34)} material={haloMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.074, 0.06]} scale={1 + 0.25 * pulse} />
      </group>
      <pointLight color={C.aqua} position={[0, 0.5, 0.35]} intensity={0.12 * gl + 0.6 * pulse} distance={2.2} decay={1.6} />
    </group>
  );
};

// ------------------------------------------------------------------ headboard
const headboardGeo = (w: number, h: number, r: number, d: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - r);
  s.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  s.lineTo(-w / 2 + r, h);
  s.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: d, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 8});
  g.translate(0, 0, -d / 2);
  return g;
};
let hbGeo: THREE.BufferGeometry | null = null;
let hbHull: THREE.BufferGeometry | null = null;

const brandCache: {t?: THREE.CanvasTexture} = {};
const brandTex = () => {
  if (brandCache.t) return brandCache.t;
  const {c, ctx} = makeCanvas(256, 64);
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = `italic bold 40px ${FONTS.web}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#bff3ff';
  ctx.fillText('SOMNIA+', 128, 34);
  brandCache.t = canvasTex(c);
  return brandCache.t;
};

// ------------------------------------------------------------------ bed
export type BedProps = GroupProps & {
  tilt?: number;
  glow?: number;
  blanket?: number;
  pillow?: Omit<PillowProps, keyof GroupProps> | false;
  headSlot?: React.ReactNode;
  children?: React.ReactNode;
};

const Piston: React.FC<{a: THREE.Vector3; b: THREE.Vector3}> = ({a, b}) => {
  const dir = b.clone().sub(a);
  const len = Math.max(0.001, dir.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return (
    <group position={mid} quaternion={q}>
      {/* unit-height geometries scaled in Y (no per-length geometry churn while animating) */}
      <mesh geometry={geo.cyl(0.04, 0.04, 1, 12)} material={toonMat('#3a4058')} position={[0, -len * 0.22, 0]} scale={[1, len * 0.55, 1]} />
      <mesh geometry={geo.cyl(0.046, 0.046, 1, 12)} material={hullMat()} position={[0, -len * 0.22, 0]} scale={[1, len * 0.55 + 0.02, 1]} />
      <mesh geometry={geo.cyl(0.022, 0.022, 1, 10)} material={toonMat('#d8dee9')} scale={[1, len, 1]} />
      <mesh geometry={geo.cyl(0.028, 0.028, 1, 10)} material={hullMat()} scale={[1, len + 0.01, 1]} />
      <mesh geometry={geo.box(0.012, 1, 0.046)} material={glowMat(C.aqua, 2.2)} position={[0, -len * 0.22, 0.03]} scale={[1, len * 0.3, 1]} />
    </group>
  );
};

export const Bed: React.FC<BedProps> = ({tilt = 0, glow = 1, blanket = 0, pillow = {}, headSlot, children, ...group}) => {
  if (!hbGeo) {
    hbGeo = headboardGeo(W + 0.1, 1.08, 0.3, 0.07);
    const t = 0.012;
    hbHull = headboardGeo(W + 0.1 + 2 * t, 1.08 + 2 * t, 0.3 + t, 0.07 + 2 * t);
    hbHull.translate(0, -t, 0);
  }
  const ti = Math.max(0, Math.min(1, tilt));
  const ang = ti * BED.maxTilt;
  const g = Math.max(0, glow);
  const footLen = L - HINGE;
  const bl = Math.max(0, Math.min(1, blanket)) * 0.5;
  // pistons: base point fixed on the platform, top point on the deck underside (rotates with the head section)
  const deckPt = (zl: number) => new THREE.Vector3(0, TOP + -0.25 * Math.cos(ang) - zl * Math.sin(ang), HINGE + -0.25 * Math.sin(ang) + zl * Math.cos(ang));
  const pistonTop = deckPt(-0.45);
  const pistonBase = new THREE.Vector3(0, BASE - 0.01, 0.28);
  const underglowMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTexture(), color: '#2a7bff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}),
    [],
  );
  useLayoutEffect(() => {
    underglowMat.opacity = Math.min(1, 0.9 * g);
  });
  useLayoutEffect(() => () => underglowMat.dispose(), [underglowMat]);
  const ledMat = useGlowMat('#3d8bff', 0.4 + 2.6 * g);
  const wedgeMat = useGlowMat(C.aqua, 0.3 + 2.2 * g);
  const sheet = '#e6eaf6';
  return (
    <group {...group}>
      {/* plinth + underglow */}
      <TBox size={[W - 0.3, 0.13, L - 0.3]} r={0.02} color="#262a40" position={[0, 0.065, L / 2]} ink={false} />
      <mesh geometry={geo.plane(W + 1.1, L + 1.0)} material={underglowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, L / 2]} />
      {/* platform (white plastic) with LED strip groove */}
      <TBox size={[W + 0.06, 0.17, L + 0.04]} r={0.05} color="#e6eaf4" position={[0, 0.215, L / 2 - 0.01]} />
      <mesh geometry={geo.box(W + 0.075, 0.018, L + 0.055)} material={ledMat} position={[0, 0.16, L / 2 - 0.01]} />
      <mesh geometry={geo.plane(0.34, 0.085)} position={[0, 0.235, L + 0.012]}>
        <meshBasicMaterial map={brandTex()} transparent color={new THREE.Color(1, 1, 1).multiplyScalar(0.6 + 1.2 * g)} />
      </mesh>
      {/* headboard */}
      <group position={[0, 0.12, -0.05]}>
        <mesh geometry={hbGeo} material={toonMat('#e9edf7')} />
        <mesh geometry={hbHull!} material={hullMat()} />
        <mesh geometry={geo.box(W - 0.2, 0.025, 0.02)} material={ledMat} position={[0, 0.9, 0.05]} />
        <TBox size={[W - 0.3, 0.42, 0.04]} r={0.03} color="#cdd6ec" position={[0, 0.55, 0.045]} ink={0.006} />
      </group>
      {/* foot section mattress + duvet */}
      <TBox size={[W, BED.mattress, footLen]} r={0.05} color={sheet} position={[0, TOP - BED.mattress / 2, HINGE + footLen / 2]} />
      <TBox size={[W + 0.09, 0.32, footLen - 0.02]} r={0.08} seg={3} color="#eef1fb" position={[0, TOP + 0.02, HINGE + footLen / 2 + 0.03]} />
      <TBox size={[W + 0.1, 0.06, 0.14]} r={0.025} color="#bcd4ff" position={[0, TOP + 0.17, HINGE + 0.1]} ink={0.008} />
      {/* folded throw at the foot */}
      <TBox size={[W + 0.16, 0.07, 0.42]} r={0.03} color="#3b6cff" position={[0, TOP + 0.2, L - 0.3]} ink={0.009} />
      <mesh geometry={geo.box(W + 0.165, 0.072, 0.05)} material={toonMat(C.lime)} position={[0, TOP + 0.2, L - 0.36]} />
      <mesh geometry={geo.box(W + 0.165, 0.072, 0.05)} material={toonMat(C.lime)} position={[0, TOP + 0.2, L - 0.24]} />
      {/* opening wedge glow + pistons */}
      <mesh geometry={geo.box(W - 0.2, 0.012, 0.6)} material={wedgeMat} position={[0, BASE + 0.007, HINGE - 0.4]} />
      {ti > 0.02 ? (
        <>
          <group position={[-(W / 2 - 0.1), 0, 0]}>
            <Piston a={pistonBase} b={pistonTop} />
          </group>
          <group position={[W / 2 - 0.1, 0, 0]}>
            <Piston a={pistonBase} b={pistonTop} />
          </group>
        </>
      ) : null}
      {/* head section (hinged) */}
      <group position={[0, TOP, HINGE]} rotation={[ang, 0, 0]}>
        <TBox size={[W - 0.04, 0.035, HINGE - 0.02]} r={0.01} color="#9aa3bb" position={[0, -BED.mattress - 0.018, -HINGE / 2]} ink={0.008} />
        <TBox size={[W, BED.mattress, HINGE - 0.01]} r={0.05} color={sheet} position={[0, -BED.mattress / 2, -HINGE / 2 - 0.005]} />
        {bl > 0.01 ? (
          <>
            <TBox size={[W + 0.09, 0.32, bl]} r={0.06} color="#f8f9ff" position={[0, 0.02, -bl / 2 + 0.01]} />
            <TBox size={[W + 0.1, 0.06, 0.14]} r={0.025} color="#bcd4ff" position={[0, 0.17, -bl + 0.07]} ink={0.008} />
          </>
        ) : null}
        {pillow !== false ? <Pillow position={PILLOW_LOCAL} {...pillow} /> : null}
        {headSlot}
      </group>
      <pointLight color="#3d7bff" position={[0, 0.12, L + 0.35]} intensity={0.9 * g} distance={2.4} decay={1.6} />
      {children}
    </group>
  );
};
