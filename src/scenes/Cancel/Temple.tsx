// Shots E1–E3 (signature 2): the cancel page named "ILIAD", revealed as an epic marble Greek temple built out of web UI
// at sunset — title-bar frieze, gold ILIAD pediment, hand-cursor + hourglass acroteria, god-rays, and an endless papyrus
// scroll of fine print unrolling down the steps toward the camera. The tiny Guy stands at the foot, on hold.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {CameraRig, ChromeText, measureChromeText, LightRays, Sunburst, LensFlare, SparkleField, Glow, glowMat, goldMat, gelButtonMat, SkyDome as FxSky} from '../../lib/three';
import {Cloud} from '../../lib/sets/Exterior';
import {rand} from '../../lib/time';
import {Guy, guyPhoneToEar, mergePose} from '../../lib/characters/Guy';
import {HeldHammer, HeldPhone} from '../../lib/props';
import {Cursor3D, Hourglass3D} from '../../lib/ui';
import {toonMat} from '../../lib/characters/toon';
import {popIn, lerp} from '../../lib/time';
import {SHOT, W} from './times';
import {Solid, boxGeo, cylGeo, V3, lin, smooth, easeOutCubic, lerpV, addV, shake} from './kit';
import {scrollTexture, SCROLL_TILE_M, friezeTexture, plaqueTexture, plazaTexture, scrollbarTexture} from './textures';

const MARBLE = '#f1e4d2';
const MARBLE_2 = '#dfcbb2';
const MARBLE_3 = '#c9ae92';
const INK = 0.05;

// ------------------------------------------------------------------ dimensions
const STEPS = 6, RISE = 0.36, TREAD = 0.72;
export const PLAT_Y = STEPS * RISE; // 2.16
const DEPTH = 17;
const COL_N = 8, COL_DX = 3.0, COL_Z = -1.4;
const COL_H = 7.6;
const CAP_TOP = PLAT_Y + 0.55 + COL_H + 0.65; // ≈ 10.96
const ENT_Z = -1.9;
const ARCH_Y = CAP_TOP + 0.5;
const FRIEZE_Y = CAP_TOP + 1.0 + 0.6;
const CORNICE_Y = CAP_TOP + 2.2 + 0.22;
const PED_BASE = CAP_TOP + 2.45;
const PED_W = 25.0, PED_H = 3.9;
const FRONT_Z = -0.2; // pediment / frieze front plane
export const ILIAD_POS: V3 = [0, PED_BASE + 1.3, FRONT_Z + 0.12];
export const APEX: V3 = [0, PED_BASE + PED_H, FRONT_Z];
const DOOR_Z = -7.4, DOOR_W = 4.4, DOOR_H = 6.4;

// ------------------------------------------------------------------ scroll path (doorway -> platform -> steps -> ground -> camera)
const scrollPath = (): THREE.Vector3[] => {
  const pts: THREE.Vector3[] = [];
  const e = 0.03;
  pts.push(new THREE.Vector3(0, PLAT_Y + e, DOOR_Z + 0.6));
  pts.push(new THREE.Vector3(0, PLAT_Y + e, -0.08));
  for (let k = STEPS - 1; k >= 0; k--) {
    // step k top at (k+1)*RISE, front edge z = (STEPS-1-k)*TREAD
    const zf = (STEPS - 1 - k) * TREAD;
    const yTop = (k + 1) * RISE;
    pts.push(new THREE.Vector3(0, yTop + e, zf - 0.06));
    pts.push(new THREE.Vector3(0, yTop - 0.04, zf + 0.06 + e));
    const yNext = k * RISE;
    pts.push(new THREE.Vector3(0, yNext + 0.08 + e, zf + 0.12 + e));
    pts.push(new THREE.Vector3(0, yNext + e, zf + 0.28));
  }
  pts.push(new THREE.Vector3(0, e, 70));
  return pts;
};

type ScrollGeo = {geo: THREE.BufferGeometry; len: number; at: (s: number) => {p: THREE.Vector3; tan: THREE.Vector3}; segs: number};
const SCROLL_W = 2.7;
let SCROLL: ScrollGeo | null = null;
const scrollGeo = (): ScrollGeo => {
  if (SCROLL) return SCROLL;
  const pts = scrollPath();
  // cumulative lengths
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const len = cum[cum.length - 1];
  const at = (s: number) => {
    const ss = Math.max(0, Math.min(len - 1e-4, s));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < ss) i++;
    const k = (ss - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    const p = pts[i - 1].clone().lerp(pts[i], k);
    const tan = pts[i].clone().sub(pts[i - 1]).normalize();
    return {p, tan};
  };
  const ds = 0.12;
  const segs = Math.ceil(len / ds);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= segs; j++) {
    const s = (j / segs) * len;
    const {p} = at(s);
    // tiny curl so the paper is not perfectly flat
    const curl = 0.012 * Math.sin(s * 1.3);
    pos.push(-SCROLL_W / 2, p.y + curl, p.z, SCROLL_W / 2, p.y + curl, p.z);
    const v = -s / SCROLL_TILE_M;
    uv.push(0, v, 1, v);
    if (j > 0) {
      const a = (j - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  SCROLL = {geo, len, at, segs};
  return SCROLL;
};

/** unrolled length (m) of the scroll at local frame f */
export const scrollLen = (f: number) => 1.5 + 12.5 * easeOutCubic(lin(f, SHOT.E1, SHOT.E1 + 34)) + 0.12 * Math.max(0, f - SHOT.E1 - 34);

const Scroll: React.FC<{len: number}> = ({len}) => {
  const S = scrollGeo();
  const mat = useMemo(() => new THREE.MeshToonMaterial({map: scrollTexture(), side: THREE.DoubleSide, color: '#ffffff'}), []);
  const geo = useMemo(() => S.geo.clone(), [S]);
  useLayoutEffect(() => {
    const segs = Math.max(1, Math.min(S.segs, Math.floor((len / S.len) * S.segs)));
    geo.setDrawRange(0, segs * 6);
  });
  const {p, tan} = S.at(len);
  const rollR = 0.3;
  const spin = -len / rollR;
  const pitch = Math.atan2(-tan.y, tan.z);
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      {/* the roll, riding on the paper */}
      <group position={[0, p.y + rollR * Math.cos(pitch) - 0.01, p.z + rollR * Math.sin(-pitch) * 0]} rotation={[pitch, 0, 0]}>
        <group rotation={[spin, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={toonMat('#efd9a4')}>
            <cylinderGeometry args={[rollR, rollR, SCROLL_W, 20, 1]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={toonMat('#c9a86a')}>
            <cylinderGeometry args={[rollR * 0.98, rollR * 0.98, SCROLL_W * 0.6, 20, 1]} />
          </mesh>
        </group>
        <Solid geometry={cylGeo(0.08, 0.08, SCROLL_W + 0.5, 10)} color="#6a3a14" rotation={[0, 0, Math.PI / 2]} ink={0.02} />
        <Solid geometry={cylGeo(0.16, 0.16, 0.16, 12)} color="#e2b04a" position={[SCROLL_W / 2 + 0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={0.02} />
        <Solid geometry={cylGeo(0.16, 0.16, 0.16, 12)} color="#e2b04a" position={[-SCROLL_W / 2 - 0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={0.02} />
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ the giant Y2K scrollbar running down the steps beside the scroll
const BAR_X = SCROLL_W / 2 + 0.85;
const BAR_W = 0.72;
let BAR: THREE.BufferGeometry | null = null;
const scrollbarGeo = () => {
  if (BAR) return BAR;
  const S = scrollGeo();
  const segs = Math.ceil(S.len / 0.12);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= segs; j++) {
    const sl = (j / segs) * S.len;
    const {p} = S.at(sl);
    pos.push(BAR_X - BAR_W / 2, p.y + 0.012, p.z, BAR_X + BAR_W / 2, p.y + 0.012, p.z);
    const v = -sl / 1.2;
    uv.push(0, v, 1, v);
    if (j > 0) {
      const a = (j - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  BAR = g;
  return g;
};
let BAR_MAT: THREE.MeshToonMaterial | null = null;
const Scrollbar: React.FC<{t: number; len: number}> = ({t, len}) => {
  const mat = (BAR_MAT ??= new THREE.MeshToonMaterial({map: scrollbarTexture(), color: '#ffffff', side: THREE.DoubleSide}));
  const S = scrollGeo();
  const geo = useMemo(() => scrollbarGeo().clone(), []);
  useLayoutEffect(() => {
    // the track only exists alongside the unrolled paper (it grows with the scroll)
    const total = (geo.index!.count / 6) | 0;
    const segs = Math.max(1, Math.min(total, Math.floor((Math.max(0, len - 0.4) / S.len) * total)));
    geo.setDrawRange(0, segs * 6);
  });
  const thumbS = 2.2 + 0.25 * Math.sin(t * 0.9); // the tiny thumb: you are on page 1 of 15,693 lines
  const th = S.at(thumbS);
  const up = S.at(0.35);
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      {/* up-arrow button at the top (by the door) */}
      <group position={[BAR_X, up.p.y + 0.16, up.p.z]}>
        <Solid geometry={boxGeo(BAR_W, 0.3, 0.7)} color="#c9d6f2" ink={0.02} />
        <mesh position={[0, 0.155, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toonMat('#1b2f8f')}>
          <circleGeometry args={[0.2, 3, Math.PI / 2]} />
        </mesh>
      </group>
      {/* the thumb: a glossy aqua gel lozenge, absurdly small for a 24-book page */}
      <group position={[BAR_X, th.p.y + 0.09, th.p.z]}>
        <mesh material={gelButtonMat('#1e6bff')} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.3, 0.32, 6, 16]} />
        </mesh>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ temple pieces
const Column: React.FC<{position: V3}> = ({position}) => (
  <group position={position}>
    <Solid geometry={boxGeo(1.75, 0.3, 1.75)} color={MARBLE_2} position={[0, 0.15, 0]} ink={INK} />
    <Solid geometry={cylGeo(0.78, 0.82, 0.25, 16)} color={MARBLE} position={[0, 0.42, 0]} ink={INK} />
    <Solid geometry={cylGeo(0.56, 0.64, COL_H, 16)} color={MARBLE} position={[0, 0.55 + COL_H / 2, 0]} ink={INK} />
    <Solid geometry={cylGeo(0.86, 0.6, 0.35, 16)} material={goldMat()} position={[0, 0.55 + COL_H + 0.17, 0]} ink={INK} />
    <Solid geometry={cylGeo(0.7, 0.7, 0.12, 16)} material={goldMat()} position={[0, 0.62, 0]} ink={0.03} />
    <Solid geometry={boxGeo(1.9, 0.3, 1.9)} color={MARBLE_2} position={[0, 0.55 + COL_H + 0.5, 0]} ink={INK} />
  </group>
);

const pedimentGeo = (() => {
  let g: THREE.ExtrudeGeometry | null = null;
  return () => {
    if (!g) {
      const s = new THREE.Shape();
      s.moveTo(-PED_W / 2, 0);
      s.lineTo(PED_W / 2, 0);
      s.lineTo(0, PED_H);
      s.closePath();
      g = new THREE.ExtrudeGeometry(s, {depth: DEPTH - 0.6, bevelEnabled: false});
      g.translate(0, 0, -(DEPTH - 0.6));
    }
    return g;
  };
})();
const tympanumGeo = (() => {
  let g: THREE.ShapeGeometry | null = null;
  return () => {
    if (!g) {
      const s = new THREE.Shape();
      const m = 0.55;
      s.moveTo(-PED_W / 2 + m * 2.6, m * 0.6);
      s.lineTo(PED_W / 2 - m * 2.6, m * 0.6);
      s.lineTo(0, PED_H - m * 1.15);
      s.closePath();
      g = new THREE.ShapeGeometry(s);
    }
    return g;
  };
})();

export const Temple: React.FC<{f: number; t: number; halo: number; shine?: number; ilIn: number}> = ({f, t, halo, shine, ilIn}) => {
  const steps: React.ReactNode[] = [];
  for (let k = 0; k < STEPS; k++) {
    const zf = (STEPS - 1 - k) * TREAD;
    const d = DEPTH + zf;
    const h = (k + 1) * RISE;
    steps.push(<Solid key={k} geometry={boxGeo(26 + (STEPS - 1 - k) * 0.7, h, d)} color={k === STEPS - 1 ? MARBLE : MARBLE_2} position={[0, h / 2, zf - d / 2]} ink={0.035} />);
  }
  const cols: React.ReactNode[] = [];
  for (let i = 0; i < COL_N; i++) cols.push(<Column key={i} position={[-((COL_N - 1) * COL_DX) / 2 + i * COL_DX, PLAT_Y, COL_Z]} />);
  for (let j = 1; j < 5; j++) {
    cols.push(<Column key={`l${j}`} position={[-((COL_N - 1) * COL_DX) / 2, PLAT_Y, COL_Z - j * 3.3]} />);
    cols.push(<Column key={`r${j}`} position={[((COL_N - 1) * COL_DX) / 2, PLAT_Y, COL_Z - j * 3.3]} />);
  }
  const m = useMemo(() => measureChromeText('ILIAD', {font: 'GeorgiaBold', size: 1.55, letterSpacing: 0.12, anchor: 'center'}), []);
  const frieze = useMemo(() => new THREE.MeshBasicMaterial({map: friezeTexture(), color: '#dfe6f5'}), []);
  const plaque = useMemo(() => new THREE.MeshToonMaterial({map: plaqueTexture()}), []);
  return (
    <group>
      {steps}
      {cols}
      {/* cella wall with a glowing doorway */}
      <Solid geometry={boxGeo((22 - DOOR_W) / 2, 9.4, 0.8)} color={MARBLE_3} position={[-(DOOR_W / 2 + (22 - DOOR_W) / 4), PLAT_Y + 4.7, DOOR_Z]} ink={INK} />
      <Solid geometry={boxGeo((22 - DOOR_W) / 2, 9.4, 0.8)} color={MARBLE_3} position={[DOOR_W / 2 + (22 - DOOR_W) / 4, PLAT_Y + 4.7, DOOR_Z]} ink={INK} />
      <Solid geometry={boxGeo(DOOR_W, 9.4 - DOOR_H, 0.8)} color={MARBLE_3} position={[0, PLAT_Y + DOOR_H + (9.4 - DOOR_H) / 2, DOOR_Z]} ink={INK} />
      <mesh position={[0, PLAT_Y + DOOR_H / 2, DOOR_Z - 0.3]} material={glowMat('#ffd27a', 1.05)}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
      </mesh>
      <LightRays position={[0, PLAT_Y + DOOR_H - 0.3, DOOR_Z + 0.6]} rotation={[-1.32, 0, 0]} length={15} radius={4.2} apexRadius={1.6} count={9} seed={4}
        color="#ffe2a0" intensity={0.3} time={t} haze={0.06} falloff={1.4} />
      <mesh position={[0, PLAT_Y + DOOR_H + 0.95, DOOR_Z + 0.42]} material={plaque}>
        <planeGeometry args={[4.6, 1.15]} />
      </mesh>
      {/* entablature: architrave, title-bar frieze, cornice */}
      <Solid geometry={boxGeo(PED_W - 0.8, 1.0, 3.2)} color={MARBLE_2} position={[0, ARCH_Y, ENT_Z]} ink={INK} />
      <mesh position={[0, ARCH_Y + 0.38, ENT_Z + 1.62]} material={goldMat()}>
        <boxGeometry args={[PED_W - 0.9, 0.16, 0.08]} />
      </mesh>
      <Solid geometry={boxGeo(PED_W - 1.0, 1.2, 3.0)} color={MARBLE} position={[0, FRIEZE_Y, ENT_Z - 0.1]} ink={INK} />
      <mesh position={[0, FRIEZE_Y, ENT_Z - 0.1 + 1.51]} material={frieze}>
        <planeGeometry args={[PED_W - 1.6, 1.0]} />
      </mesh>
      <Solid geometry={boxGeo(PED_W + 0.4, 0.45, 3.7)} color={MARBLE_2} position={[0, CORNICE_Y, ENT_Z + 0.05]} ink={INK} />
      {/* pediment + roof (one extruded gable), recessed tympanum, raking cornices */}
      <group position={[0, PED_BASE, FRONT_Z]}>
        <Solid geometry={pedimentGeo()} color={MARBLE} ink={INK} />
        <mesh geometry={tympanumGeo()} position={[0, 0, 0.01]} material={toonMat('#2a4fb8')} />
        <group rotation={[0, 0, Math.atan2(PED_H, PED_W / 2)]} position={[-PED_W / 4, PED_H / 2 + 0.12, 0.15]}>
          <Solid geometry={boxGeo(Math.hypot(PED_W / 2, PED_H) + 0.5, 0.4, 0.5)} color={MARBLE_2} ink={0.03} />
        </group>
        <group rotation={[0, 0, -Math.atan2(PED_H, PED_W / 2)]} position={[PED_W / 4, PED_H / 2 + 0.12, 0.15]}>
          <Solid geometry={boxGeo(Math.hypot(PED_W / 2, PED_H) + 0.5, 0.4, 0.5)} color={MARBLE_2} ink={0.03} />
        </group>
      </group>
      {/* ILIAD in gold */}
      <group position={ILIAD_POS}>
        <ChromeText text="ILIAD" font="GeorgiaBold" size={1.55} anchor="center" material="gold" letterSpacing={0.12} depth={0.3}
          outline={{thickness: 0.04, color: '#4a2400'}} shine={shine} shineAmount={1.6}
          perLetter={(i) => {
            const k = popIn(f, SHOT.E1 + i * 2, 10);
            return {scale: Math.max(0.001, ilIn >= 1 ? 1 : k), position: [0, (1 - Math.min(1, k)) * 1.5 * (ilIn >= 1 ? 0 : 1), 0]};
          }} />
        <SparkleField positions={m.letters.map((L) => [L.center[0] + 0.45, L.center[1] + 0.62, 0.4] as [number, number, number])} size={0.9} time={t}
          intensity={2.2 + 2 * halo} />
        {/* the halo */}
        {halo > 0 ? (
          // a saint's halo hovering over the word, fully in front of the tympanum so it reads as a whole ellipse
          <group position={[0.1, 1.0 + 0.2 * halo, 1.0]} rotation={[1.3 + 0.04 * Math.sin(t * 2.1), 0, 0.06 * Math.sin(t * 1.3)]} scale={Math.max(0.001, halo)}>
            <mesh material={glowMat('#ffd36a', 2.2)}>
              <torusGeometry args={[1.0, 0.07, 8, 56]} />
            </mesh>
            <mesh material={glowMat('#fff3c4', 1.2, {opacity: 0.35, additive: true})}>
              <torusGeometry args={[1.0, 0.18, 8, 56]} />
            </mesh>
          </group>
        ) : null}
        <Glow position={[0, 0, -0.2]} size={8} color="#ffcf6a" intensity={0.12 + 0.22 * halo} squash={2.6} />
      </group>
      {/* acroteria: a golden hand cursor on the apex, hourglasses on the corners */}
      <group position={[APEX[0], APEX[1] + 0.25, APEX[2]]}>
        <Cursor3D kind="hand" size={1.7} position={[0.1, 1.35, 0]} rotation={[0, 0, 0]} look="gloss" color="#ffd36a" />
      </group>
      <Hourglass3D size={1.3} rot={((t * 40) % 360) * 0 + 0} sand={(t * 0.15) % 1} position={[-PED_W / 2 + 0.6, PED_BASE + 0.9, FRONT_Z]} />
      <Hourglass3D size={1.3} rot={0} sand={(t * 0.15 + 0.5) % 1} position={[PED_W / 2 - 0.6, PED_BASE + 0.9, FRONT_Z]} />
    </group>
  );
};

// ------------------------------------------------------------------ world: sunset sky, warm plain, cypress trees
const Cypress: React.FC<{position: V3; h: number}> = ({position, h}) => (
  <group position={position}>
    <Solid geometry={cylGeo(0.12, 0.16, 1.2, 6)} color="#5a3a20" position={[0, 0.6, 0]} ink={0.03} />
    <Solid geometry={cylGeo(0.05, 1.0, h, 7)} color="#2f5a3a" position={[0, 1.0 + h / 2, 0]} ink={0.04} />
  </group>
);

const SKY_STOPS: [number, string][] = [[-1, '#b0507e'], [-0.05, '#ff98a6'], [0.0, '#ffb86a'], [0.08, '#ff8a6a'], [0.22, '#ff5f8a'], [0.45, '#8a3ab0'], [1, '#2a1260']];

/** low, flattened sunset cloud banks all around the floating plaza (Olympus) */
const SEA = Array.from({length: 34}, (_, i) => {
  const r = (k: string) => rand(`sea-${i}-${k}`);
  const far = i >= 22;
  const a = (i / (far ? 12 : 22)) * Math.PI * 2 + r('a') * 0.25;
  const d = far ? 110 + r('d') * 60 : 40 + r('d') * 34;
  const sc = far ? 26 + r('s') * 18 : 11 + r('s') * 9;
  return {x: Math.sin(a) * d, z: -Math.cos(a) * d, y: far ? -9 - r('y') * 4 : -5.5 - r('y') * 3, s: sc, seed: 1 + Math.floor(r('g') * 10), rot: r('r') * 6};
});
const CloudSea: React.FC<{t: number}> = ({t}) => (
  <group rotation={[0, t * 0.012, 0]}>
    {SEA.map((c, i) => (
      <Cloud key={i} seed={c.seed} puffs={6} position={[c.x, c.y, c.z]} rotation={[0, c.rot, 0]} scale={[c.s, c.s * 0.42, c.s * 0.8]} top="#ffd8c8"
        bottom="#d8608a" emissive={0.18} />
    ))}
  </group>
);

export const TempleWorld: React.FC<{t: number; f: number}> = ({t, f}) => {
  const cyp: React.ReactNode[] = [];
  for (let i = 0; i < 3; i++) {
    cyp.push(<Cypress key={`a${i}`} position={[-16 - i * 3.0, 0, 1 - i * 5.5]} h={6 + (i % 3) * 1.4} />);
    cyp.push(<Cypress key={`b${i}`} position={[16 + i * 3.0, 0, 1 - i * 5.5]} h={6.5 + ((i + 1) % 3) * 1.3} />);
  }
  return (
    <>
      <FxSky stops={SKY_STOPS} glow={{dir: [0, 0.12, -1], color: '#ffd59a', size: 0.3, intensity: 0.7}} />
      <Sunburst position={[0, 13, -70]} radius={80} rays={22} colorA="#ffd98a" colorB="#ff7a9a" center="#fff4d6" rotation2d={t * 0.08} opacity={0.42} glow={0.75}
        additive softness={0.5} />
      {/* Olympus: a marble plaza floating on a sea of sunset clouds */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={plazaMat()}>
        <circleGeometry args={[34, 64]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={toonMat('#c79a86')}>
        <ringGeometry args={[34, 35.2, 64]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7, 0]} material={glowMat('#ff9fa8', 0.85)}>
        <circleGeometry args={[400, 32]} />
      </mesh>
      <CloudSea t={t} />
      {/* stone path toward the steps */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 20]} material={toonMat('#ecd9bd')}>
        <planeGeometry args={[7, 28]} />
      </mesh>
      {cyp}
      <hemisphereLight args={['#ffc8c0', '#4a1a5a', 0.5]} />
      <directionalLight position={[-34, 14, 30]} intensity={2.1} color="#ffbe7a" />
      <directionalLight position={[22, 12, -40]} intensity={1.9} color="#ff5fae" />
    </>
  );
};

let PLAZA: THREE.MeshToonMaterial | null = null;
const plazaMat = () => (PLAZA ??= new THREE.MeshToonMaterial({map: plazaTexture(), color: '#e9c4ae'}));

// ------------------------------------------------------------------ the Guy (on hold) at the foot of the steps
const GUY_E: V3 = [-2.5, 0, 6.8];
const GuyOnHold: React.FC<{t: number; look: number}> = ({t, look}) => (
  <Guy position={GUY_E} rotation={[0, Math.PI + 0.12, 0]} outlineScale={1.6}
    pose={mergePose(guyPhoneToEar(t), {expression: 'neutral', headPitch: lerp(-0.1, -0.55, look), eyesY: 0.6})}
    rightHand={<HeldPhone open={1} screenLines={['ON HOLD', '♫ ♪ ♫']} screenColor="#8FD3FF" />} leftHand={<HeldHammer glow={0.15} />} />
);

// ------------------------------------------------------------------ shots
const ILIAD_F = Math.round(W.iliad) - 1;
const HALO_F = Math.round(W.honest) - 2;

/** E1 — REVEAL on "Iliad": low wide behind the Guy, then a slow crane/tilt up the facade to the pediment. */
export const ShotE1: React.FC<{f: number; t: number}> = ({f, t}) => {
  const tilt = smooth(lin(f, Math.round(W.most) - 4, SHOT.E2));
  const sh = shake(f, ILIAD_F, 0.25, 6, 13);
  const cam: V3 = addV(lerpV([5.0, 1.2, 25.0], [2.4, 7.0, 21.5], tilt), sh);
  const tgt: V3 = lerpV([0, 6.6, -2], [0, ILIAD_POS[1] - 0.3, -1], tilt);
  const flare = Math.exp(-Math.max(0, f - ILIAD_F) / 10);
  const halo = easeOutCubic(lin(f, HALO_F, HALO_F + 14));
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={lerp(52, 40, tilt)} />
      <TempleWorld t={t} f={f} />
      <Temple f={f} t={t} halo={halo} shine={lin(f, ILIAD_F + 4, ILIAD_F + 30)} ilIn={0} />
      <Scroll len={scrollLen(f)} />
      <Scrollbar t={t} len={scrollLen(f)} />
      <GuyOnHold t={t} look={1} />
      <LightRays position={[0, 36, -16]} rotation={[-0.32, 0, 0]} length={42} radius={13} count={14} color="#ffe6a8" intensity={0.38} time={t} haze={0.03} />
      <LensFlare position={[3.4, ILIAD_POS[1] + 0.8, 0.6]} intensity={0.12 + 0.7 * flare} rotation={t * 0.3} scale={0.8} />
    </>
  );
};

/** E2 — "name": the pediment close, halo spinning, sparkles, gold shine sweep. */
export const ShotE2: React.FC<{f: number; t: number}> = ({f, t}) => {
  const k = lin(f, SHOT.E2, SHOT.E3);
  const cam: V3 = lerpV([1.2, ILIAD_POS[1] - 1.4, 11.5], [0.6, ILIAD_POS[1] - 1.15, 9.6], smooth(k));
  return (
    <>
      <CameraRig position={cam} target={[0, ILIAD_POS[1] - 0.58, -0.5]} fov={40} roll={-0.02} />
      <TempleWorld t={t} f={f} />
      <Temple f={f} t={t} halo={1} shine={lin(f, Math.round(W.name) - 2, Math.round(W.name) + 22)} ilIn={1} />
      <SparkleField count={30} seed={31} area={[10, 3, 1]} position={[ILIAD_POS[0], ILIAD_POS[1] + 0.5, ILIAD_POS[2] + 0.8]} time={t} size={0.7}
        intensity={3 * Math.exp(-Math.max(0, f - W.name) / 16)} />
      <LightRays position={[0, 36, -16]} rotation={[-0.32, 0, 0]} length={42} radius={13} count={14} color="#ffe6a8" intensity={0.38} time={t} haze={0.03} />
      <LensFlare position={[4.6, ILIAD_POS[1] + 0.7, 0.6]} intensity={0.6 * Math.exp(-Math.max(0, f - W.name) / 10) + 0.08} rotation={t * 0.4} scale={0.7} />
    </>
  );
};

/** E3 — "that a cancel page had": low over the scroll of fine print rolling toward camera, the Guy and temple beyond. */
export const ShotE3: React.FC<{f: number; t: number}> = ({f, t}) => {
  const k = smooth(lin(f, SHOT.E3 + 18, SHOT.END + 2));
  const len = scrollLen(f);
  const zr = scrollGeo().at(len).p.z; // the roll
  const camA: V3 = [0.15, 2.25, zr + 1.05];
  const tgtA: V3 = [0, 0.05, zr - 1.95];
  const cam: V3 = lerpV(camA, [1.4, 5.2, 29.0], k);
  const tgt: V3 = lerpV(tgtA, [-0.3, 6.9, 0], k);
  const had = Math.round(W.had) - 2;
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={lerp(44, 52, k)} roll={lerp(-0.04, 0, k)} />
      <TempleWorld t={t} f={f} />
      <Temple f={f} t={t} halo={1} shine={lin(f, had, had + 16)} ilIn={1} />
      <Scroll len={len} />
      <Scrollbar t={t} len={len} />
      <GuyOnHold t={t} look={0.7} />
      <LightRays position={[0, 36, -16]} rotation={[-0.32, 0, 0]} length={42} radius={13} count={14} color="#ffe6a8" intensity={0.38} time={t} haze={0.03} />
      <SparkleField count={10} seed={44} area={[7, 1.2, 0.5]} position={[ILIAD_POS[0], ILIAD_POS[1], ILIAD_POS[2] + 0.6]} time={t} size={1.1}
        intensity={f >= had ? 3.5 * Math.exp(-(f - had) / 10) : 0} />
      <LensFlare position={[2.6, ILIAD_POS[1] + 0.7, 0.6]} intensity={f >= had ? 0.9 * Math.exp(-(f - had) / 7) : 0} rotation={t * 0.4} scale={0.6} />
    </>
  );
};
