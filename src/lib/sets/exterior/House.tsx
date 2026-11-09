/**
 * <House> — low-poly cel-shaded suburban two-storey (8 m wide x 7 m deep, front gable, ridge 8.4 m), facing +Z, origin at
 * the footprint centre on the ground. Cream lap siding, brick-red shingle roof, blue shutters, teal front door, covered porch
 * (front-left) with 3 steps, glowing smart RING DOORBELL (camera lens) right of the door, porch lantern, round attic window,
 * chimney, and an optional yard: white picket fence + gate, path, blue "1984" mailbox with flag, bushes, tree, driveway.
 *
 * THE BEDROOM WINDOW is the UPPER-FLOOR FRONT-LEFT window (viewer's left, above the porch roof) — HOUSE_SPOTS.bedroomWindow.
 * The porch roof sits right under its sill, so the Guy can climb onto the porch roof (HOUSE_SPOTS.porchRoof) and in.
 * At night the bedroom glows aqua-violet (smart gadgets); other rooms glow warm yellow.
 *
 * Props (all optional):
 *   time: 'day' | 'night' | 'sunrise'   picks defaults for the values below + glass tint
 *   lightsOn: 0..1      interior window glow (default night 1, sunrise 0.35, day 0)
 *   bedroomLight: 0..1  bedroom window glow (default = lightsOn)
 *   porchLight: 0..1    lantern + warm point light (default night 1 else 0)
 *   doorbellGlow: 0..1  ring doorbell aqua ring (default 1 at night, 0.6 day)
 *   doorbellColor       ring colour (default aqua; pass alertRed for "FACE NOT RECOGNIZED")
 *   doorOpen: 0..1      front door swings inward
 *   mailboxFlag: 0..1   red flag down -> up
 *   yard: boolean       fence, path, mailbox, bushes, tree, driveway (default true)
 *   lawn: boolean       flat lawn pad under the yard (for scenes without <RollingHills>; default false)
 *   lights: boolean     real point lights for porch/windows at night (default true)
 *   + any group props (position/rotation/scale)
 *
 * Usage:
 *   <House time="night" lightsOn={1} doorbellGlow={pulse} position={[0, 0, 0]} />
 *   <CameraRig position={HOUSE_SPOTS.doorbellCam} target={[0, 1.4, 12]} fov={100} />   // doorbell-cam fisheye POV
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {toonMat} from '../../characters/toon';
import {C} from '../../palette';
import {Ink, boxGeo, boxGeoM, canvasTex, toonTexMat, Glow, hash1, hullOf, instOutlineMat, neonMat} from './common';
import {Tree, Bush} from './Tree';

type GroupProps = ThreeElements['group'];
type V3 = [number, number, number];

// ------------------------------------------------------------------ dimensions
const HW = 4; // half width (x)
const HD = 3.5; // half depth (z)
const T = 0.2; // wall thickness
const FLOOR = 0.5; // porch / ground-floor level
const EAVE = 6.0;
const PITCH = 0.6; // rise per run
const RIDGE = EAVE + HW * PITCH; // 8.4
const OVER = 0.45; // roof overhang

/** Anchor points in house-local metres (house faces +Z, origin = footprint centre on the ground). */
export const HOUSE_SPOTS = {
  /** outside the front door, on the porch floor */
  frontDoor: [-1.6, FLOOR, 3.75] as V3,
  /** door hinge (left edge) — door swings inward around it */
  doorHinge: [-2.15, FLOOR, 3.38] as V3,
  /** centre of the porch deck (standing spot) */
  porch: [-1.6, FLOOR, 4.7] as V3,
  /** sit on the porch front edge, feet on the steps (facing +Z) — Outro */
  porchSeat: [-1.6, FLOOR, 5.62] as V3,
  /** a second sitting/lying spot on the porch for Pancake, right of porchSeat */
  porchSeatPancake: [-0.75, FLOOR, 5.25] as V3,
  /** bottom of the porch steps */
  stepsBottom: [-1.6, 0, 6.75] as V3,
  /** ring doorbell centre (on the wall right of the door) */
  doorbell: [-0.72, 1.55, 3.53] as V3,
  /** doorbell camera lens — put a fisheye camera here looking +Z for the doorbell POV */
  doorbellCam: [-0.72, 1.6, 3.6] as V3,
  /** porch lantern bulb */
  porchLight: [-2.62, 2.25, 3.62] as V3,
  /** BEDROOM window: centre of the glass (upper floor, front-left) */
  bedroomWindow: [-1.6, 4.6, 3.5] as V3,
  /** bedroom window sill (outside) */
  bedroomSill: [-1.6, 3.93, 3.66] as V3,
  /** standing spot on the porch roof right under the bedroom window */
  porchRoof: [-1.6, 3.17, 4.05] as V3,
  /** living-room window (ground floor, front-right) */
  livingWindow: [2.1, 2.0, 3.5] as V3,
  /** upper front-right window */
  upstairsWindow: [2.1, 4.6, 3.5] as V3,
  /** round attic window */
  atticWindow: [0, 7.0, 3.5] as V3,
  /** mailbox door (front face of the box) */
  mailbox: [-0.25, 1.12, 10.9] as V3,
  /** foot of the mailbox post */
  mailboxBase: [-0.25, 0, 10.6] as V3,
  /** gap in the picket fence */
  gate: [-1.6, 0, 10] as V3,
  /** car parking spot on the driveway (car facing -Z toward the house) */
  driveway: [6.1, 0, 7.5] as V3,
  /** top of the chimney */
  chimneyTop: [2.3, 9.35, -1.6] as V3,
  ridge: [0, RIDGE, 0] as V3,
  size: {width: 8, depth: 7, height: RIDGE, floor: FLOOR, eave: EAVE},
};

export type HouseTime = 'day' | 'night' | 'sunrise';
export type HouseProps = GroupProps & {
  time?: HouseTime;
  lightsOn?: number;
  bedroomLight?: number;
  porchLight?: number;
  doorbellGlow?: number;
  doorbellColor?: string;
  doorOpen?: number;
  mailboxFlag?: number;
  yard?: boolean;
  lawn?: boolean;
  lights?: boolean;
  /** colours */
  siding?: string;
  roof?: string;
  shutters?: string;
  door?: string;
};

// ------------------------------------------------------------------ textures (module cache, created lazily)
let TEX: null | {siding: THREE.Texture; shingles: THREE.Texture; brick: THREE.Texture; glassDay: THREE.Texture; warm: THREE.Texture; bedroom: THREE.Texture; louver: THREE.Texture; stone: THREE.Texture} = null;
const textures = () => {
  if (TEX) return TEX;
  const siding = canvasTex(256, 256, (c, w, h) => {
    const n = 8, bh = h / n;
    for (let i = 0; i < n; i++) {
      const g = c.createLinearGradient(0, i * bh, 0, (i + 1) * bh);
      g.addColorStop(0, '#d9d4cc');
      g.addColorStop(0.18, '#ffffff');
      g.addColorStop(0.9, '#f4f1ec');
      g.addColorStop(1, '#cfc8bd');
      c.fillStyle = g;
      c.fillRect(0, i * bh, w, bh);
      c.fillStyle = 'rgba(120,100,80,0.55)';
      c.fillRect(0, (i + 1) * bh - 2, w, 2);
    }
  }, {repeat: [1 / 1.6, 1 / 1.6]});
  const shingles = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    const rows = 8, rh = h / rows, cols = 6, cw = w / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * cw * 0.5;
      for (let k = -1; k <= cols; k++) {
        const x = k * cw + off;
        const v = 0.86 + hash1(r * 31 + k, 5) * 0.14;
        const g = Math.round(255 * v);
        c.fillStyle = `rgb(${g},${g},${g})`;
        c.fillRect(x + 2, r * rh + 2, cw - 4, rh - 2);
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fillRect(x + 2, (r + 1) * rh - 4, cw - 4, 4);
      }
      c.fillStyle = 'rgba(40,10,10,0.45)';
      c.fillRect(0, r * rh, w, 2);
    }
  }, {repeat: [1 / 1.4, 1 / 1.4]});
  const brick = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#d8cfc8';
    c.fillRect(0, 0, w, h);
    const rows = 10, rh = h / rows, bw = w / 4;
    for (let r = 0; r < rows; r++) for (let k = -1; k < 5; k++) {
      const x = k * bw + (r % 2) * bw * 0.5;
      const v = 0.8 + hash1(r * 17 + k, 9) * 0.2;
      c.fillStyle = `rgb(${Math.round(255 * v)},${Math.round(235 * v)},${Math.round(225 * v)})`;
      c.fillRect(x + 3, r * rh + 3, bw - 6, rh - 6);
    }
  }, {repeat: [1 / 1.0, 1 / 1.0]});
  const stone = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#9a98a4';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = hash1(i, 3) * w, y = hash1(i, 4) * h, rw = 30 + hash1(i, 5) * 40, rh = 20 + hash1(i, 6) * 26;
      const v = 0.82 + hash1(i, 7) * 0.3;
      c.fillStyle = `rgb(${Math.round(190 * v)},${Math.round(188 * v)},${Math.round(200 * v)})`;
      c.beginPath();
      c.ellipse(x, y, rw / 2, rh / 2, 0, 0, Math.PI * 2);
      c.fill();
    }
  }, {repeat: [1 / 1.2, 1 / 0.6]});
  const glassDay = canvasTex(128, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#c9e6ff');
    g.addColorStop(1, '#7fb6f0');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath();
    c.moveTo(w * 0.1, h);
    c.lineTo(w * 0.45, 0);
    c.lineTo(w * 0.62, 0);
    c.lineTo(w * 0.27, h);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.moveTo(w * 0.36, h);
    c.lineTo(w * 0.71, 0);
    c.lineTo(w * 0.77, 0);
    c.lineTo(w * 0.42, h);
    c.fill();
  });
  const interior = (base: [string, string], curtain: string, extra?: (c: CanvasRenderingContext2D, w: number, h: number) => void) =>
    canvasTex(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(w * 0.5, h * 0.35, 4, w * 0.5, h * 0.5, w * 0.75);
      g.addColorStop(0, base[0]);
      g.addColorStop(1, base[1]);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      extra?.(c, w, h);
      // curtains with folds
      for (const side of [0, 1]) {
        c.save();
        if (side) {
          c.translate(w, 0);
          c.scale(-1, 1);
        }
        const cg = c.createLinearGradient(0, 0, w * 0.26, 0);
        cg.addColorStop(0, curtain);
        cg.addColorStop(1, 'rgba(0,0,0,0.1)');
        c.fillStyle = cg;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(w * 0.3, 0);
        c.quadraticCurveTo(w * 0.12, h * 0.5, w * 0.22, h);
        c.lineTo(0, h);
        c.fill();
        c.restore();
      }
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(0, 0, w, 8);
    });
  const warm = interior(['#fff6c8', '#ffb347'], 'rgba(214,92,60,0.9)', (c, w, h) => {
    c.fillStyle = 'rgba(150,80,40,0.35)';
    c.fillRect(w * 0.3, h * 0.72, w * 0.4, h * 0.3); // sofa/furniture silhouette
  });
  const bedroom = interior(['#e0fbff', '#5a4dff'], 'rgba(40,40,140,0.85)', (c, w, h) => {
    c.fillStyle = 'rgba(25,198,255,0.55)';
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.82, w * 0.3, h * 0.12, 0, 0, Math.PI * 2);
    c.fill();
  });
  const louver = canvasTex(64, 128, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 3;
    c.strokeRect(4, 4, w - 8, h - 8);
    for (let y = 12; y < h - 8; y += 9) {
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(8, y, w - 16, 3);
    }
  });
  TEX = {siding, shingles, brick, glassDay, warm, bedroom, louver, stone};
  return TEX;
};

// ------------------------------------------------------------------ geometry builders
type Hole = {x: number; y: number; w: number; h: number} | {cx: number; cy: number; r: number};
const wallGeo = (outline: [number, number][], holes: Hole[], depth = T) => {
  const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) {
    const p = new THREE.Path();
    if ('r' in h) p.absarc(h.cx, h.cy, h.r, 0, Math.PI * 2, true);
    else {
      p.moveTo(h.x - h.w / 2, h.y - h.h / 2);
      p.lineTo(h.x - h.w / 2, h.y + h.h / 2);
      p.lineTo(h.x + h.w / 2, h.y + h.h / 2);
      p.lineTo(h.x + h.w / 2, h.y - h.h / 2);
      p.lineTo(h.x - h.w / 2, h.y - h.h / 2);
    }
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: false, curveSegments: 20});
  return g;
};

type Win = {x: number; y: number; w: number; h: number; shutters?: boolean; kind?: 'warm' | 'bedroom'; panes?: [number, number]};
const FRONT_WINS: Win[] = [
  {x: 2.1, y: 2.0, w: 1.7, h: 1.5, shutters: true, kind: 'warm', panes: [3, 2]},
  {x: -1.6, y: 4.6, w: 1.4, h: 1.3, shutters: true, kind: 'bedroom', panes: [2, 2]},
  {x: 2.1, y: 4.6, w: 1.3, h: 1.3, shutters: true, kind: 'warm', panes: [2, 2]},
];
const SIDE_WINS: Win[] = [
  {x: -1.2, y: 2.0, w: 1.2, h: 1.4, kind: 'warm'},
  {x: 1.5, y: 2.0, w: 1.2, h: 1.4, kind: 'warm'},
  {x: -1.2, y: 4.6, w: 1.2, h: 1.3, kind: 'warm'},
  {x: 1.5, y: 4.6, w: 1.2, h: 1.3, kind: 'warm'},
];
const BACK_WINS: Win[] = [
  {x: -2.2, y: 2.0, w: 1.4, h: 1.4, kind: 'warm'},
  {x: 2.4, y: 4.6, w: 1.2, h: 1.3, kind: 'warm'},
  {x: -2.2, y: 4.6, w: 1.2, h: 1.3, kind: 'warm'},
];
const DOOR = {x: -1.6, y: FLOOR + 1.13, w: 1.1, h: 2.25};
const ATTIC = {cx: 0, cy: 7.0, r: 0.42};

// ------------------------------------------------------------------ sub components
const TRIM = '#fbfbf6';
const OL = 0.03;

const WindowUnit: React.FC<{win: Win; glass: THREE.Material; shutterColor: string; louver: THREE.Texture}> = ({win, glass, shutterColor, louver}) => {
  const {x, y, w, h} = win;
  const [px, py] = win.panes ?? [2, 2];
  const glassGeo = useMemo(() => new THREE.PlaneGeometry(w, h), [w, h]);
  const shutter = toonTexMat(shutterColor, louver);
  const sw = Math.min(0.45, w * 0.34);
  return (
    <group position={[x, y, 0]}>
      <mesh geometry={glassGeo} material={glass} position={[0, 0, -0.1]} />
      {/* muntins */}
      {Array.from({length: px - 1}, (_, i) => (
        <mesh key={`v${i}`} geometry={boxGeo(0.045, h, 0.04)} material={toonMat(TRIM)} position={[-w / 2 + ((i + 1) * w) / px, 0, -0.08]} />
      ))}
      {Array.from({length: py - 1}, (_, i) => (
        <mesh key={`h${i}`} geometry={boxGeo(w, 0.045, 0.04)} material={toonMat(TRIM)} position={[0, -h / 2 + ((i + 1) * h) / py, -0.08]} />
      ))}
      {/* frame */}
      <Ink geometry={boxGeo(w + 0.34, 0.16, 0.07)} color={TRIM} outline={OL} position={[0, h / 2 + 0.08, 0.035]} />
      <Ink geometry={boxGeo(0.13, h, 0.06)} color={TRIM} outline={OL} position={[-w / 2 - 0.065, 0, 0.03]} />
      <Ink geometry={boxGeo(0.13, h, 0.06)} color={TRIM} outline={OL} position={[w / 2 + 0.065, 0, 0.03]} />
      <Ink geometry={boxGeo(w + 0.42, 0.08, 0.17)} color={TRIM} outline={OL} position={[0, -h / 2 - 0.04, 0.07]} />
      {/* reveal (inner sides) */}
      <mesh geometry={boxGeo(w, 0.02, 0.1)} material={toonMat('#e8e2d6')} position={[0, -h / 2 + 0.01, -0.05]} />
      {win.shutters ? (
        <>
          <Ink geometry={boxGeo(sw, h + 0.1, 0.05)} material={shutter} outline={OL} position={[-w / 2 - 0.15 - sw / 2, 0, 0.03]} />
          <Ink geometry={boxGeo(sw, h + 0.1, 0.05)} material={shutter} outline={OL} position={[w / 2 + 0.15 + sw / 2, 0, 0.03]} />
        </>
      ) : null}
    </group>
  );
};

/** A planar wall facade: wall extrusion + window units, in a group placed at the outer surface (local +Z = outward). */
const Facade: React.FC<{
  outline: [number, number][];
  holes: Hole[];
  wins: Win[];
  mats: {wall: THREE.Material; warm: THREE.Material; bedroom: THREE.Material};
  shutterColor: string;
  louver: THREE.Texture;
  position: V3;
  rotationY: number;
  children?: React.ReactNode;
}> = ({outline, holes, wins, mats, shutterColor, louver, position, rotationY, children}) => {
  const geo = useMemo(() => wallGeo(outline, holes), []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Ink geometry={geo} material={mats.wall} outline={0.035} position={[0, 0, -T]} />
      {wins.map((w, i) => (
        <WindowUnit key={i} win={w} glass={w.kind === 'bedroom' ? mats.bedroom : mats.warm} shutterColor={shutterColor} louver={louver} />
      ))}
      {children}
    </group>
  );
};

const rectHoles = (wins: Win[]): Hole[] => wins.map((w) => ({x: w.x, y: w.y, w: w.w, h: w.h}));

const Mailbox: React.FC<{flag: number; position: V3}> = ({flag, position}) => {
  const bodyGeo = useMemo(() => {
    const s = new THREE.Shape();
    const w = 0.22, hh = 0.16;
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, hh);
    s.absarc(0, hh, w / 2, 0, Math.PI, false);
    s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.5, bevelEnabled: false, curveSegments: 10});
    g.translate(0, 0, -0.25);
    return g;
  }, []);
  const plate = useMemo(
    () =>
      canvasTex(256, 64, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#0a2a8a';
        c.font = 'bold 46px "Arial Black", Impact, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('1984', w / 2, h / 2 + 2);
      }),
    [],
  );
  const plateMat = useMemo(() => new THREE.MeshToonMaterial({map: plate, emissive: '#ffffff', emissiveMap: plate, emissiveIntensity: 0.15}), [plate]);
  return (
    <group position={position}>
      <Ink geometry={boxGeo(0.1, 1.0, 0.1)} color="#8a5a34" outline={OL} position={[0, 0.5, 0]} />
      <Ink geometry={boxGeo(0.3, 0.05, 0.56)} color="#8a5a34" outline={OL} position={[0, 1.02, 0]} />
      <Ink geometry={bodyGeo} color={C.y2kBlue} outline={OL} position={[0, 1.045, 0]} />
      <mesh position={[0.1115, 1.13, 0.02]} rotation={[0, Math.PI / 2, 0]} material={plateMat}>
        <planeGeometry args={[0.3, 0.075]} />
      </mesh>
      <mesh position={[-0.1115, 1.13, 0.02]} rotation={[0, -Math.PI / 2, 0]} material={plateMat}>
        <planeGeometry args={[0.3, 0.075]} />
      </mesh>
      {/* flag: pivot at the back-right side */}
      <group position={[0.125, 1.12, -0.12]} rotation={[-(flag * Math.PI) / 2, 0, 0]}>
        <Ink geometry={boxGeo(0.02, 0.03, 0.3)} color={C.alertRed} outline={0.012} position={[0, 0, 0.15]} />
        <Ink geometry={boxGeo(0.02, 0.1, 0.1)} color={C.alertRed} outline={0.012} position={[0, 0.05, 0.27]} />
      </group>
    </group>
  );
};

const Fence: React.FC = () => {
  const ref = React.useRef<THREE.InstancedMesh>(null);
  const ref2 = React.useRef<THREE.InstancedMesh>(null);
  const picket = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.045, 0);
    s.lineTo(0.045, 0);
    s.lineTo(0.045, 0.82);
    s.lineTo(0, 0.92);
    s.lineTo(-0.045, 0.82);
    s.lineTo(-0.045, 0);
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.025, bevelEnabled: false});
    g.translate(0, 0, -0.0125);
    return g;
  }, []);
  const spots = useMemo(() => {
    const out: {x: number; z: number; ry: number}[] = [];
    const step = 0.17;
    for (let x = -8; x <= 8.001; x += step) if ((x < -2.25 || x > -0.95) && (x < 4.35 || x > 7.85)) out.push({x, z: 10, ry: 0});
    for (const sx of [-8, 8]) for (let z = 10 - step; z >= 1.5; z -= step) out.push({x: sx, z, ry: Math.PI / 2});
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    spots.forEach((s, i) => {
      const hgt = 1 + Math.sin(s.x * 1.7 + s.z) * 0.015;
      m.compose(new THREE.Vector3(s.x, 0, s.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.ry), one.clone().setY(hgt));
      ref.current?.setMatrixAt(i, m);
      ref2.current?.setMatrixAt(i, m);
    });
    for (const r of [ref.current, ref2.current]) if (r) {
      r.instanceMatrix.needsUpdate = true;
      r.computeBoundingSphere();
    }
  }, [spots]);
  const railFront = (x0: number, x1: number, y: number) => (
    <Ink key={`${x0}${y}`} geometry={boxGeo(x1 - x0, 0.07, 0.04)} color={TRIM} outline={0.015} position={[(x0 + x1) / 2, y, 10 - 0.035]} />
  );
  return (
    <group>
      <instancedMesh ref={ref} args={[picket, toonMat(TRIM), spots.length]} frustumCulled={false} />
      <instancedMesh ref={ref2} args={[hullOf(picket), instOutlineMat(0.012), spots.length]} frustumCulled={false} />
      {railFront(-8, -2.25, 0.3)}
      {railFront(-8, -2.25, 0.68)}
      {railFront(-0.95, 4.35, 0.3)}
      {railFront(-0.95, 4.35, 0.68)}
      {railFront(7.85, 8, 0.3)}
      {railFront(7.85, 8, 0.68)}
      {[-8, 8].map((sx) => (
        <group key={sx}>
          <Ink geometry={boxGeo(0.04, 0.07, 8.5)} color={TRIM} outline={0.015} position={[sx - Math.sign(sx) * 0.035, 0.3, 5.75]} />
          <Ink geometry={boxGeo(0.04, 0.07, 8.5)} color={TRIM} outline={0.015} position={[sx - Math.sign(sx) * 0.035, 0.68, 5.75]} />
        </group>
      ))}
      {[-8, -2.3, -0.9, 4.4, 7.8, 8].map((x) => (
        <Ink key={`p${x}`} geometry={boxGeo(0.14, 1.1, 0.14)} color={TRIM} outline={0.02} position={[x, 0.55, 10]} />
      ))}
    </group>
  );
};

// ------------------------------------------------------------------ House
export const House: React.FC<HouseProps> = ({
  time = 'day', lightsOn, bedroomLight, porchLight, doorbellGlow, doorbellColor = C.aqua, doorOpen = 0, mailboxFlag = 0,
  yard = true, lawn = false, lights = true, siding = '#fff0cc', roof = '#c8433a', shutters = '#2f6bff', door = '#14a3c7', ...g
}) => {
  const tx = textures();
  const L = lightsOn ?? (time === 'night' ? 1 : time === 'sunrise' ? 0.35 : 0);
  const BL = bedroomLight ?? L;
  const PL = porchLight ?? (time === 'night' ? 1 : 0);
  const DB = doorbellGlow ?? (time === 'night' ? 1 : 0.6);

  const mats = useMemo(() => {
    const glass = (emap: THREE.Texture) =>
      new THREE.MeshStandardMaterial({map: tx.glassDay, color: '#ffffff', roughness: 0.12, metalness: 0.25, emissive: '#ffffff', emissiveMap: emap, emissiveIntensity: 0});
    return {
      wall: toonTexMat(siding, tx.siding),
      roof: toonTexMat(roof, tx.shingles),
      brick: toonTexMat('#c45a3e', tx.brick),
      stone: toonTexMat('#ffffff', tx.stone),
      warm: glass(tx.warm),
      bedroom: glass(tx.bedroom),
      attic: glass(tx.warm),
    };
  }, [siding, roof]);
  // glass: day = sky reflection map; night = interior emissive (dims the reflection as lights come on)
  useLayoutEffect(() => {
    const tint = time === 'sunrise' ? new THREE.Color('#ffd0b8') : time === 'night' ? new THREE.Color('#3a4a8a') : new THREE.Color('#ffffff');
    const set = (m: THREE.MeshStandardMaterial, k: number, gain: number) => {
      m.color.copy(tint).multiplyScalar(1 - 0.8 * k);
      m.emissiveIntensity = k * gain;
    };
    set(mats.warm, L, 1.9);
    set(mats.bedroom, BL, 2.1);
    set(mats.attic, L * 0.6, 1.6);
  });

  const frontOutline: [number, number][] = [[-HW, 0.45], [HW, 0.45], [HW, EAVE], [0, RIDGE], [-HW, EAVE]];
  const sideOutline: [number, number][] = [[-HD, 0.45], [HD, 0.45], [HD, EAVE], [-HD, EAVE]];
  const frontHoles: Hole[] = [...rectHoles(FRONT_WINS), {x: DOOR.x, y: DOOR.y, w: DOOR.w, h: DOOR.h}, ATTIC];
  const backHoles: Hole[] = [...rectHoles(BACK_WINS), {x: 0.9, y: FLOOR + 1.1, w: 1.0, h: 2.2}];

  const ang = Math.atan(PITCH);
  const slabLen = (HW + OVER) / Math.cos(ang);
  const slabDepth = 2 * HD + 2 * 0.5;
  const roofGeo = useMemo(() => boxGeoM(slabLen, 0.18, slabDepth), [slabLen]);
  const nrm = [Math.sin(ang), Math.cos(ang)];
  const slabCx = (HW + OVER) / 2;
  const slabCy = RIDGE - slabCx * PITCH;

  // porch roof: from wall (z=3.5, y=3.25) to front (z=5.95, y=2.85)
  const prLen = Math.hypot(2.55, 0.42);
  const prAng = Math.atan2(0.42, 2.55);

  const bell = new THREE.Color(doorbellColor);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);
  useLayoutEffect(() => {
    ringMat.color.copy(bell).multiplyScalar(0.25 + DB * 3.5);
  });
  const lanternMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);
  useLayoutEffect(() => {
    lanternMat.color.set('#ffd27a').multiplyScalar(0.35 + PL * 2.2);
  });

  const doorGeo = useMemo(() => boxGeo(DOOR.w - 0.04, DOOR.h - 0.03, 0.07), []);
  const atticRing = useMemo(() => new THREE.TorusGeometry(ATTIC.r + 0.04, 0.07, 6, 20), []);
  const Lq = Math.round(L * 10) / 10;

  return (
    <group {...g}>
      {/* foundation */}
      <Ink geometry={boxGeoM(2 * HW + 0.1, 0.5, 2 * HD + 0.1)} material={mats.stone} outline={0.035} position={[0, 0.25, 0]} />
      {/* walls */}
      <Facade outline={frontOutline} holes={frontHoles} wins={FRONT_WINS} mats={mats} shutterColor={shutters} louver={tx.louver} position={[0, 0, HD]} rotationY={0}>
        {/* attic round window */}
        <group position={[ATTIC.cx, ATTIC.cy, 0]}>
          <mesh material={mats.attic} position={[0, 0, -0.1]}>
            <circleGeometry args={[ATTIC.r, 20]} />
          </mesh>
          <Ink geometry={atticRing} color={TRIM} outline={OL} position={[0, 0, 0.02]} />
          <mesh geometry={boxGeo(ATTIC.r * 2, 0.04, 0.03)} material={toonMat(TRIM)} position={[0, 0, -0.08]} />
          <mesh geometry={boxGeo(0.04, ATTIC.r * 2, 0.03)} material={toonMat(TRIM)} position={[0, 0, -0.08]} />
        </group>
        {/* front door + frame */}
        <group position={[DOOR.x, DOOR.y, 0]}>
          <group position={[-DOOR.w / 2 + 0.02, 0, -0.12]} rotation={[0, (doorOpen * Math.PI) / 2.2, 0]}>
            <group position={[DOOR.w / 2 - 0.02, 0, 0]}>
              <Ink geometry={doorGeo} color={door} outline={0.02} />
              {[0.45, -0.45].map((py) => (
                <mesh key={py} geometry={boxGeo(0.7, 0.7, 0.03)} material={toonMat(new THREE.Color(door).offsetHSL(0, 0, -0.06).getStyle())} position={[0, py - 0.15, 0.045]} />
              ))}
              <mesh geometry={boxGeo(0.62, 0.34, 0.02)} material={mats.warm} position={[0, 0.78, 0.04]} />
              <mesh position={[0.4, -0.05, 0.08]} material={toonMat('#ffd23a')}>
                <sphereGeometry args={[0.045, 10, 8]} />
              </mesh>
            </group>
          </group>
          <Ink geometry={boxGeo(DOOR.w + 0.36, 0.2, 0.08)} color={TRIM} outline={OL} position={[0, DOOR.h / 2 + 0.1, 0.04]} />
          <Ink geometry={boxGeo(0.16, DOOR.h, 0.07)} color={TRIM} outline={OL} position={[-DOOR.w / 2 - 0.08, 0, 0.035]} />
          <Ink geometry={boxGeo(0.16, DOOR.h, 0.07)} color={TRIM} outline={OL} position={[DOOR.w / 2 + 0.08, 0, 0.035]} />
          {/* dark interior behind the door */}
          <mesh geometry={boxGeo(DOOR.w, DOOR.h, 0.02)} material={toonMat('#2a1a10', {emissive: '#ffb347', emissiveIntensity: Lq * 0.6})} position={[0, 0, -0.5]} />
        </group>
        {/* ring doorbell */}
        <group position={[HOUSE_SPOTS.doorbell[0], HOUSE_SPOTS.doorbell[1], 0.0]}>
          <Ink geometry={boxGeo(0.075, 0.16, 0.035)} color="#22242c" outline={0.008} position={[0, 0, 0.018]} />
          <mesh position={[0, -0.028, 0.037]} material={ringMat}>
            <torusGeometry args={[0.022, 0.0065, 6, 20]} />
          </mesh>
          <mesh position={[0, -0.028, 0.037]} material={toonMat('#3a3c46')}>
            <circleGeometry args={[0.016, 16]} />
          </mesh>
          <mesh position={[0, 0.045, 0.037]} material={toonMat('#05060a')}>
            <circleGeometry args={[0.014, 16]} />
          </mesh>
          <mesh position={[0.004, 0.049, 0.038]} material={neonMat('#9fd8ff', 2)}>
            <circleGeometry args={[0.004, 8]} />
          </mesh>
          <Glow position={[0, -0.028, 0.06]} size={0.12 + DB * 0.1} color={doorbellColor} opacity={0.25 + DB * 0.6} />
        </group>
        {/* porch lantern */}
        <group position={[HOUSE_SPOTS.porchLight[0], HOUSE_SPOTS.porchLight[1], 0]}>
          <Ink geometry={boxGeo(0.08, 0.1, 0.12)} color="#2a2a30" outline={0.01} position={[0, -0.02, 0.06]} />
          <mesh geometry={boxGeo(0.16, 0.24, 0.16)} material={lanternMat} position={[0, 0.0, 0.2]} />
          <Ink geometry={boxGeo(0.2, 0.05, 0.2)} color="#2a2a30" outline={0.01} position={[0, 0.14, 0.2]} />
          <Ink geometry={boxGeo(0.2, 0.04, 0.2)} color="#2a2a30" outline={0.01} position={[0, -0.13, 0.2]} />
          <Glow position={[0, 0, 0.3]} size={0.5 + PL * 1.1} color="#ffc46a" opacity={PL * 0.6} />
        </group>
        {/* frieze board at eave height + floor belt */}
        <Ink geometry={boxGeo(2 * HW + 0.06, 0.16, 0.06)} color={TRIM} outline={OL} position={[0, EAVE - 0.08, 0.03]} />
        <Ink geometry={boxGeo(2 * HW + 0.06, 0.12, 0.05)} color={TRIM} outline={OL} position={[0, 3.36, 0.025]} />
      </Facade>
      <Facade outline={sideOutline} holes={rectHoles(SIDE_WINS)} wins={SIDE_WINS} mats={mats} shutterColor={shutters} louver={tx.louver} position={[HW, 0, 0]} rotationY={Math.PI / 2}>
        <Ink geometry={boxGeo(2 * HD + 0.06, 0.12, 0.05)} color={TRIM} outline={OL} position={[0, 3.36, 0.025]} />
      </Facade>
      <Facade outline={sideOutline} holes={rectHoles(SIDE_WINS)} wins={SIDE_WINS} mats={mats} shutterColor={shutters} louver={tx.louver} position={[-HW, 0, 0]} rotationY={-Math.PI / 2}>
        <Ink geometry={boxGeo(2 * HD + 0.06, 0.12, 0.05)} color={TRIM} outline={OL} position={[0, 3.36, 0.025]} />
      </Facade>
      <Facade outline={frontOutline} holes={backHoles} wins={BACK_WINS} mats={mats} shutterColor={shutters} louver={tx.louver} position={[0, 0, -HD]} rotationY={Math.PI}>
        <mesh geometry={boxGeo(1.0, 2.2, 0.06)} material={toonMat('#6a4a8a')} position={[0.9, FLOOR + 1.1, -0.08]} />
        <Ink geometry={boxGeo(2 * HW + 0.06, 0.12, 0.05)} color={TRIM} outline={OL} position={[0, 3.36, 0.025]} />
      </Facade>
      {/* corner boards */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <Ink key={`c${sx}${sz}`} geometry={boxGeo(0.26, EAVE - 0.4, 0.26)} color={TRIM} outline={OL} position={[sx * (HW - 0.1), 0.4 + (EAVE - 0.4) / 2, sz * (HD - 0.1)]} />
      ))}
      {/* attic interior blocker (keeps the gable triangle from being see-through) */}
      <mesh position={[0, EAVE, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toonMat('#3a2a22')}>
        <planeGeometry args={[2 * HW - 0.1, 2 * HD - 0.1]} />
      </mesh>
      {/* roof */}
      {[1, -1].map((sx) => (
        <group key={`r${sx}`}>
          <Ink geometry={roofGeo} material={mats.roof} outline={0.04}
            position={[sx * (slabCx + nrm[0] * 0.09), slabCy + nrm[1] * 0.09, 0]} rotation={[0, 0, -sx * ang]} />
          {/* fascia + gutter along the eave */}
          <Ink geometry={boxGeo(0.06, 0.24, slabDepth)} color={TRIM} outline={OL}
            position={[sx * (HW + OVER + 0.02), EAVE - OVER * PITCH - 0.02, 0]} />
          <Ink geometry={boxGeo(0.14, 0.12, slabDepth)} color="#e9ecf2" outline={OL}
            position={[sx * (HW + OVER + 0.1), EAVE - OVER * PITCH - 0.06, 0]} />
          {/* bargeboards on the gables (front/back) */}
          {[1, -1].map((sz) => (
            <Ink key={sz} geometry={boxGeo(slabLen + 0.04, 0.26, 0.07)} color={TRIM} outline={OL}
              position={[sx * slabCx, slabCy - 0.02, sz * (HD + 0.5 + 0.035)]} rotation={[0, 0, -sx * ang]} />
          ))}
        </group>
      ))}
      <Ink geometry={boxGeo(0.26, 0.26, slabDepth + 0.08)} color="#8a2a24" outline={0.03} position={[0, RIDGE + 0.17, 0]} rotation={[0, 0, Math.PI / 4]} />
      {/* chimney */}
      <Ink geometry={boxGeoM(0.9, 4.2, 0.8)} material={mats.brick} outline={0.04} position={[2.3, 7.15, -1.6]} />
      <Ink geometry={boxGeo(1.04, 0.16, 0.94)} color="#8a8a96" outline={0.03} position={[2.3, 9.27, -1.6]} />

      {/* porch: deck, steps, columns, roof, railing */}
      <Ink geometry={boxGeo(4.3, FLOOR, 2.25)} color="#c9b49a" outline={0.03} position={[-1.6, FLOOR / 2, HD + 1.12]} />
      <mesh geometry={boxGeo(4.3, 0.02, 2.25)} material={toonMat('#d8c4a8')} position={[-1.6, FLOOR + 0.005, HD + 1.12]} />
      {[0, 1, 2].map((i) => (
        <Ink key={`s${i}`} geometry={boxGeo(1.7, FLOOR - (i + 1) * 0.125, 0.32)} color={i % 2 ? '#cbb69c' : '#d6c2a6'} outline={0.025}
          position={[-1.6, (FLOOR - (i + 1) * 0.125) / 2, HD + 2.25 + 0.16 + i * 0.32]} />
      ))}
      {[-3.6, 0.4].map((x) => (
        <Ink key={`col${x}`} geometry={boxGeo(0.2, 2.4, 0.2)} color={TRIM} outline={OL} position={[x, FLOOR + 1.2, HD + 2.05]} />
      ))}
      <group position={[-1.6, 3.05, HD + 1.27]} rotation={[prAng, 0, 0]}>
        <Ink geometry={boxGeoM(4.7, 0.14, prLen + 0.1)} material={mats.roof} outline={0.035} />
      </group>
      <Ink geometry={boxGeo(4.5, 0.18, 0.08)} color={TRIM} outline={OL} position={[-1.6, 2.86, HD + 2.48]} />
      {/* railings left/right of the steps */}
      {[[-3.6, -2.45], [-0.75, 0.4]].map(([x0, x1]) => (
        <group key={`rail${x0}`}>
          <Ink geometry={boxGeo(x1 - x0, 0.07, 0.07)} color={TRIM} outline={0.015} position={[(x0 + x1) / 2, FLOOR + 0.85, HD + 2.05]} />
          {Array.from({length: Math.round((x1 - x0) / 0.16) - 1}, (_, i) => (
            <mesh key={i} geometry={boxGeo(0.04, 0.8, 0.04)} material={toonMat(TRIM)} position={[x0 + (i + 1) * 0.16, FLOOR + 0.42, HD + 2.05]} />
          ))}
        </group>
      ))}
      {[[-3.6, HD + 0.1, HD + 2.05]].map(([x, z0, z1]) => (
        <group key="side-rail">
          <Ink geometry={boxGeo(0.07, 0.07, z1 - z0)} color={TRIM} outline={0.015} position={[x, FLOOR + 0.85, (z0 + z1) / 2]} />
          {Array.from({length: Math.round((z1 - z0) / 0.16) - 1}, (_, i) => (
            <mesh key={i} geometry={boxGeo(0.04, 0.8, 0.04)} material={toonMat(TRIM)} position={[x, FLOOR + 0.42, z0 + (i + 1) * 0.16]} />
          ))}
        </group>
      ))}
      {/* doormat */}
      <mesh geometry={boxGeo(0.9, 0.02, 0.55)} material={toonMat('#8a3a2a')} position={[-1.6, FLOOR + 0.02, HD + 0.45]} />

      {lights && PL > 0.01 ? <pointLight position={[-2.2, 2.5, HD + 1.4]} color="#ffc070" intensity={PL * 2.6} distance={9} decay={1.4} /> : null}
      {lights && L > 0.01 ? <pointLight position={[2.1, 2.0, HD + 1.8]} color="#ffc070" intensity={L * 1.4} distance={6} decay={1.6} /> : null}
      {lights && BL > 0.01 ? <pointLight position={[-1.6, 4.4, HD + 1.3]} color="#7fd8ff" intensity={BL * 1.4} distance={5} decay={1.6} /> : null}

      {yard ? (
        <group>
          {lawn ? <mesh geometry={boxGeo(18, 0.04, 17)} material={toonMat('#3fbf2a')} position={[0, -0.02, 2.2]} /> : null}
          {/* path from the steps to the gate */}
          {Array.from({length: 6}, (_, i) => (
            <Ink key={`pv${i}`} geometry={boxGeo(1.1, 0.06, 0.5)} color={i % 2 ? '#d9d6d0' : '#cfcac2'} outline={0.015}
              position={[-1.6 + Math.sin(i * 1.3) * 0.05, 0.02, HD + 3.35 + i * 0.6]} rotation={[0, Math.sin(i * 2.1) * 0.06, 0]} />
          ))}
          {/* driveway */}
          <mesh geometry={boxGeo(3.0, 0.04, 14)} material={toonMat('#a8a6a2')} position={[6.1, 0.01, 4]} />
          <Fence />
          <Mailbox flag={mailboxFlag} position={[HOUSE_SPOTS.mailboxBase[0], 0, HOUSE_SPOTS.mailboxBase[2]]} />
          <Bush seed={1} size={1.1} position={[1.4, 0, HD + 0.45]} />
          <Bush seed={2} size={1.0} position={[2.5, 0, HD + 0.5]} color="#36ad2e" flowers="#ff8fd0" />
          <Bush seed={3} size={1.1} position={[3.5, 0, HD + 0.45]} />
          <Bush seed={4} size={0.9} position={[-3.95, 0, HD + 2.6]} flowers="#fff27a" />
          <Bush seed={5} size={0.8} position={[0.95, 0, HD + 2.7]} color="#36ad2e" flowers="#ffffff" />
          <Tree kind="round" seed={2} height={5.6} position={[-6.3, 0, 6.2]} />
          <Tree kind="pine" seed={4} height={7.5} position={[-6.6, 0, -4.2]} />
          <Tree kind="round" seed={7} height={4.8} position={[6.8, 0, -5.4]} leaf="#4cc23a" />
        </group>
      ) : null}
    </group>
  );
};
