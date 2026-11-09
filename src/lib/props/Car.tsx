/**
 * <Car> — chunky silver early-2000s hatchback (generic "MOTORCO", no real brand). Faces +Z, origin = ground centre between
 * the axles. ~3.95 m long, 1.72 m wide, 1.5 m tall. Glossy clear-coat silver paint with ink outlines, jelly-bean headlights,
 * clear "Y2K" tail lights, roof spoiler, 5-spoke alloys. Driver sits on the LEFT of the car = +X side (US left-hand drive);
 * the driver door (+X) opens. Full interior: bucket seats (wild 2002 confetti fabric), steering wheel, dash with an
 * aqua-backlit speedometer + tach, centre console LCD, gear stick, rear-view mirror with a hanging CD.
 *
 * Props (all optional, all pure numbers -> animate from the frame):
 *   wheelSpin   radians of wheel rotation (distance / CAR.wheelRadius)
 *   steer       -1..1 front wheel steer (+ = turn left); also turns the steering wheel
 *   doorOpen    0..1 driver door swing
 *   headlights  0..1 (+ glow sprites, volumetric beams and a real spotlight when > 0)
 *   brakeLights 0..1 (tail lights + third brake light)
 *   bodyRoll    radians (lean on turns, + = lean right/-X) ; bodyPitch radians (+ = nose down) ; bodyBounce metres
 *   interior    true: seats, wheel, dash (default true)
 *   seatFrost   0..1 icy blue frost on the seats (+ icicles past 0.4)
 *   speedNeedle 0..1 speedometer needle (0 = 0 mph, 1 = 140 mph) ; rpmNeedle 0..1
 *   dashSpeedText  text on the speedometer LCD (default odometer)   e.g. "SPEED PACK REQUIRED"
 *   dashLocked  red padlock over the speedometer + red LCD ; fuel 0..1 fuel gauge (default 0.12, nearly empty)
 *   consoleText    centre-console screen text (default "FM 101.1"), consoleColor (LCD tint)
 *   paint       body colour (default silver)   plate  licence plate text (default "4 NOW")
 *   beams / lights   volumetric headlight cones / real spotlight (default true)
 *   shadow      soft contact shadow blob (default true)
 *   + group props (position/rotation/scale)
 *
 * Anchors: CAR (car-local metres): driverSeat (hip point), driverEye, steeringWheel, dashboard (speedometer centre),
 *   console, fuelCap (driver side rear quarter), driverDoorHinge, driverExit (stand spot outside the door), headlights,
 *   tailLights, wheels, length/width/height/wheelbase/wheelRadius, dashCam (suggested close-up camera).
 *
 * Usage:
 *   <Car position={[0, 0, z]} wheelSpin={z / CAR.wheelRadius} headlights={1} />
 *   <CameraRig position={CAR.dashCam.position} target={CAR.dashCam.target} fov={CAR.dashCam.fov} />   // inside the car group's frame
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {toonMat, outlineMat} from '../characters/toon';
import {C, FONTS} from '../palette';
import {Glow, boxGeo, canvasTex, hullOf, hash1, lightConeMat, neonMat} from '../sets/exterior/common';

type GroupProps = ThreeElements['group'];
type V3 = [number, number, number];

// ------------------------------------------------------------------ dimensions
const HW = 0.86;
const BELT = 0.97;
const ROOF = 1.5;
const TUMBLE = 0.13;
const PANEL = 0.05;
const AXLE = 1.22;
const WR = 0.32;
const TRACK = 0.74;
const ARCH = 0.43;
const SILL = 0.25;
const DOOR_FRONT = 0.72;
const DOOR_BACK = -0.44;

export const CAR = {
  length: 3.95,
  width: 2 * HW,
  height: ROOF,
  wheelbase: 2 * AXLE,
  wheelRadius: WR,
  track: 2 * TRACK,
  /** hip point on the driver seat cushion (Guy sits here facing +Z) */
  driverSeat: [0.38, 0.54, -0.22] as V3,
  passengerSeat: [-0.38, 0.54, -0.22] as V3,
  /** driver's eye point (POV shots) */
  driverEye: [0.38, 1.22, -0.3] as V3,
  /** steering wheel centre */
  steeringWheel: [0.38, 0.9, 0.16] as V3,
  /** speedometer centre (dashboard close-ups) */
  dashboard: [0.39, 1.055, 0.36] as V3,
  /** centre console screen */
  console: [0, 0.86, 0.44] as V3,
  /** fuel filler cap on the driver-side rear quarter panel */
  fuelCap: [HW + 0.004, 0.86, -1.3] as V3,
  /** driver door hinge (front edge) */
  driverDoorHinge: [HW, 0.6, DOOR_FRONT] as V3,
  /** where the Guy stands to get in/out (door open) */
  driverExit: [1.55, 0, -0.15] as V3,
  headlights: [[0.56, 0.69, 1.86], [-0.56, 0.69, 1.86]] as V3[],
  tailLights: [[0.72, 0.9, -1.88], [-0.72, 0.9, -1.88]] as V3[],
  wheels: {fl: [TRACK, WR, AXLE] as V3, fr: [-TRACK, WR, AXLE] as V3, rl: [TRACK, WR, -AXLE] as V3, rr: [-TRACK, WR, -AXLE] as V3},
  /** suggested dashboard close-up camera (car-local) */
  dashCam: {position: [0.39, 1.27, 0.02] as V3, target: [0.39, 1.04, 0.36] as V3, fov: 48},
  /** suggested over-the-shoulder seat camera (car-local) */
  seatCam: {position: [-0.25, 1.25, 0.35] as V3, target: [0.35, 0.6, -0.4] as V3, fov: 60},
};

// ------------------------------------------------------------------ geometry helpers
const tumbleX = (x: number, y: number) => (y <= BELT ? x : x * (1 - (TUMBLE / HW) * Math.min(1.1, (y - BELT) / (ROOF - BELT))));
const tumble = (g: THREE.BufferGeometry) => {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setX(i, tumbleX(p.getX(i), p.getY(i)));
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
};
const v2 = (z: number, y: number) => new THREE.Vector2(z, y);

/** Outer side profile (shape x = car z, shape y = car y). */
const profileShape = () => {
  const s = new THREE.Shape();
  s.moveTo(1.9, SILL);
  s.quadraticCurveTo(1.99, 0.29, 1.99, 0.45);
  s.quadraticCurveTo(1.99, 0.7, 1.86, 0.76);
  s.quadraticCurveTo(1.4, 0.89, 0.86, 0.95);
  s.lineTo(0.05, 1.47);
  s.quadraticCurveTo(-0.6, 1.53, -1.3, 1.49);
  s.quadraticCurveTo(-1.44, 1.48, -1.46, 1.42);
  s.lineTo(-1.8, 1.0);
  s.quadraticCurveTo(-1.9, 0.95, -1.92, 0.7);
  s.quadraticCurveTo(-1.95, 0.3, -1.86, SILL);
  s.lineTo(-AXLE - ARCH, SILL);
  s.absarc(-AXLE, SILL, ARCH, Math.PI, 0, true);
  s.lineTo(AXLE - ARCH, SILL);
  s.absarc(AXLE, SILL, ARCH, Math.PI, 0, true);
  s.lineTo(1.9, SILL);
  return s;
};
const poly = (pts: [number, number][], hole = false) => {
  const p = hole ? new THREE.Path() : new THREE.Shape();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.lineTo(pts[0][0], pts[0][1]);
  return p;
};
const FRONT_WIN: [number, number][] = [[0.625, 1.0], [0.016, 1.4], [-0.38, 1.4], [-0.38, 1.0]];
const REAR_WIN: [number, number][] = [[-0.52, 1.005], [-0.52, 1.41], [-1.12, 1.41], [-1.36, 1.05]];
const DOOR: [number, number][] = [[DOOR_FRONT, 0.3], [DOOR_FRONT, 0.985], [0.02, 1.445], [DOOR_BACK, 1.445], [DOOR_BACK, 0.3]];

/** Extrude a side-plane shape to a slab between x = x0 .. x0 + depth (depth may be negative), then tumble. */
const sideSlab = (shape: THREE.Shape, xOuter: number, inward: number) => {
  const g = new THREE.ExtrudeGeometry(shape, {depth: PANEL, bevelEnabled: false, curveSegments: 10});
  g.rotateY(-Math.PI / 2); // shape x -> car z, extrude -> car x in [-PANEL, 0]
  g.translate(inward < 0 ? xOuter : xOuter + PANEL, 0, 0);
  return tumble(g);
};
/** Flat glass pane in the side plane at x (tumbled). */
const sidePane = (pts: [number, number][], x: number) => {
  const g = new THREE.ShapeGeometry(poly(pts) as THREE.Shape);
  g.rotateY(-Math.PI / 2);
  g.translate(x, 0, 0);
  return tumble(g);
};
/** Ribbon across the width following a contour (car z,y) front->rear over the top. */
const ribbon = (pts: THREE.Vector2[], hw = HW) => {
  const pos: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const wa = tumbleX(hw, a.y), wb = tumbleX(hw, b.y);
    const A = [-wa, a.y, a.x], B = [wa, a.y, a.x], Cc = [wb, b.y, b.x], D = [-wb, b.y, b.x];
    pos.push(...A, ...B, ...Cc, ...A, ...Cc, ...D);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
};
const curvePts = (build: (p: THREE.Path) => void, div = 8) => {
  const p = new THREE.Path();
  build(p);
  return p.getPoints(div);
};

// ------------------------------------------------------------------ textures
let TX: null | {fabric: THREE.Texture; frost: THREE.Texture; blob: THREE.Texture; cd: THREE.Texture} = null;
const tex = () => {
  if (TX) return TX;
  const fabric = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#3a3f52';
    c.fillRect(0, 0, w, h);
    const cols = ['#19c6ff', '#ff4fb8', '#9bff3a', '#8a4dff', '#ffd23a'];
    for (let i = 0; i < 90; i++) {
      c.strokeStyle = cols[i % cols.length];
      c.globalAlpha = 0.75;
      c.lineWidth = 3;
      const x = hash1(i, 3) * w, y = hash1(i, 4) * h, r = 5 + hash1(i, 5) * 7, a = hash1(i, 6) * 6;
      c.beginPath();
      if (i % 3 === 0) c.arc(x, y, r * 0.5, a, a + 3.5);
      else if (i % 3 === 1) {
        c.moveTo(x - r, y);
        c.quadraticCurveTo(x, y - r, x + r, y);
      } else {
        c.moveTo(x - r * 0.6, y - r * 0.6);
        c.lineTo(x + r * 0.6, y + r * 0.6);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  }, {repeat: [2, 2]});
  const frost = canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0.6)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,1)';
    for (let i = 0; i < 26; i++) {
      // feathery ice crystals
      const x = hash1(i, 11) * w, y = hash1(i, 12) * h, L = 18 + hash1(i, 13) * 30, a0 = hash1(i, 14) * 6.28;
      c.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const a = a0 + (k * Math.PI) / 3;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
        c.stroke();
        for (const t of [0.4, 0.7]) {
          const bx = x + Math.cos(a) * L * t, by = y + Math.sin(a) * L * t;
          c.beginPath();
          c.moveTo(bx, by);
          c.lineTo(bx + Math.cos(a + 0.6) * L * 0.25, by + Math.sin(a + 0.6) * L * 0.25);
          c.moveTo(bx, by);
          c.lineTo(bx + Math.cos(a - 0.6) * L * 0.25, by + Math.sin(a - 0.6) * L * 0.25);
          c.stroke();
        }
      }
    }
  }, {repeat: [1.5, 1.5]});
  const blob = canvasTex(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, {srgb: false});
  const cd = canvasTex(128, 128, (c, w, h) => {
    const g = c.createConicGradient ? c.createConicGradient(0, w / 2, h / 2) : null;
    if (g) {
      ['#ff9ad8', '#9fe8ff', '#d8ffb0', '#fff1a0', '#c8a8ff', '#ff9ad8'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
      c.fillStyle = g;
    } else c.fillStyle = '#c8d8ff';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e8ecf4';
    c.beginPath();
    c.arc(w / 2, h / 2, 14, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(w / 2, h / 2, 6, 0, Math.PI * 2);
    c.fill();
  });
  TX = {fabric, frost, blob, cd};
  return TX;
};

const dialTex = (kind: 'speed' | 'tach', lcd: string, locked: boolean) =>
  canvasTex(512, 512, (c, w, h) => {
    const cx = w / 2, cy = h / 2, R = w / 2 - 6;
    const g = c.createRadialGradient(cx, cy, 10, cx, cy, R);
    g.addColorStop(0, '#0c1a2e');
    g.addColorStop(0.75, '#08101e');
    g.addColorStop(1, '#19c6ff');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.fill();
    const max = kind === 'speed' ? 140 : 8;
    const major = kind === 'speed' ? 20 : 1;
    const minor = kind === 'speed' ? 10 : 0.5;
    const ang = (v: number) => (-225 + (v / max) * 270) * (Math.PI / 180);
    // red zone
    c.strokeStyle = '#ff2a4a';
    c.lineWidth = 16;
    c.beginPath();
    c.arc(cx, cy, R - 34, ang(max * (kind === 'speed' ? 0.86 : 0.8)), ang(max));
    c.stroke();
    for (let v = 0; v <= max + 1e-6; v += minor) {
      const a = ang(v);
      const isMaj = Math.abs(v / major - Math.round(v / major)) < 1e-6;
      const r0 = R - (isMaj ? 58 : 44), r1 = R - 26;
      c.strokeStyle = '#dff8ff';
      c.lineWidth = isMaj ? 7 : 3;
      c.shadowColor = '#19c6ff';
      c.shadowBlur = 10;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      c.stroke();
      if (isMaj) {
        c.fillStyle = '#e8fbff';
        c.font = `bold ${kind === 'speed' ? 40 : 46}px ${FONTS.ui}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        const rr = R - 96;
        c.fillText(String(Math.round(v)), cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
    }
    c.shadowBlur = 0;
    c.fillStyle = '#7fdfff';
    c.font = `bold 30px ${FONTS.ui}`;
    c.textAlign = 'center';
    c.fillText(kind === 'speed' ? 'MPH' : 'x1000 rpm', cx, cy - 62);
    if (kind === 'speed') {
      c.font = `italic 900 22px ${FONTS.heavy}`;
      c.fillStyle = '#4b9bff';
      c.fillText('MOTORCO', cx, cy - 98);
      // LCD: one line if it fits big, otherwise two lines (whichever gives the larger font)
      const lw = 300, lh = 84, lx = cx - lw / 2, ly = cy + 84;
      c.fillStyle = locked ? '#3a0608' : '#0b2a1c';
      c.fillRect(lx, ly, lw, lh);
      c.strokeStyle = locked ? '#ff6a6a' : '#7fdfff';
      c.lineWidth = 3;
      c.strokeRect(lx, ly, lw, lh);
      c.fillStyle = locked ? '#ff5050' : '#9bff3a';
      c.shadowColor = c.fillStyle;
      c.shadowBlur = 8;
      const fit = (t: string, max: number) => {
        let fs = max;
        c.font = `bold ${fs}px ${FONTS.lcd}`;
        while (c.measureText(t).width > lw - 18 && fs > 10) {
          fs -= 1;
          c.font = `bold ${fs}px ${FONTS.lcd}`;
        }
        return fs;
      };
      const one = fit(lcd, 44);
      const words = lcd.split(' ');
      let best: [number, string[]] = [one, [lcd]];
      for (let k = 1; k < words.length; k++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
        const fs = Math.min(fit(a, 36), fit(b, 36));
        if (fs > best[0] + 2) best = [fs, [a, b]];
      }
      c.font = `bold ${best[0]}px ${FONTS.lcd}`;
      if (best[1].length === 1) c.fillText(best[1][0], cx, ly + lh / 2 + 2);
      else {
        c.fillText(best[1][0], cx, ly + lh * 0.3);
        c.fillText(best[1][1], cx, ly + lh * 0.72);
      }
      c.shadowBlur = 0;
    }
  }, {mipmaps: true});

const fuelTex = () =>
  canvasTex(256, 256, (c, w, h) => {
    const cx = w / 2, cy = h / 2 + 20, R = w / 2 - 6;
    const g = c.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, R);
    g.addColorStop(0, '#0c1a2e');
    g.addColorStop(0.8, '#08101e');
    g.addColorStop(1, '#19c6ff');
    c.fillStyle = g;
    c.beginPath();
    c.arc(w / 2, h / 2, R, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#dff8ff';
    c.shadowColor = '#19c6ff';
    c.shadowBlur = 8;
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI * (1.25 + i * 0.125);
      c.lineWidth = i % 2 ? 4 : 7;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70);
      c.lineTo(cx + Math.cos(a) * 95, cy + Math.sin(a) * 95);
      c.stroke();
    }
    c.shadowBlur = 0;
    c.font = `bold 34px ${FONTS.ui}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ff4a5a';
    c.fillText('E', cx + Math.cos(Math.PI * 1.25) * 50, cy + Math.sin(Math.PI * 1.25) * 50 + 8);
    c.fillStyle = '#e8fbff';
    c.fillText('F', cx + Math.cos(Math.PI * 1.75) * 50, cy + Math.sin(Math.PI * 1.75) * 50 + 8);
    // pump icon
    c.fillStyle = '#7fdfff';
    c.fillRect(cx - 14, cy + 22, 22, 30);
    c.fillRect(cx + 8, cy + 26, 8, 4);
    c.fillRect(cx + 14, cy + 26, 4, 22);
  });

const consoleTex = (text: string, color: string) =>
  canvasTex(512, 160, (c, w, h) => {
    c.fillStyle = '#04080c';
    c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = color;
    c.globalAlpha = 0.15;
    c.fillRect(8, 8, w - 16, h - 16);
    c.globalAlpha = 1;
    c.fillStyle = color;
    let fs = 64;
    c.font = `bold ${fs}px ${FONTS.lcd}`;
    while (c.measureText(text).width > w - 40 && fs > 18) {
      fs -= 2;
      c.font = `bold ${fs}px ${FONTS.lcd}`;
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = color;
    c.shadowBlur = 14;
    c.fillText(text, w / 2, h / 2 + 2);
    c.shadowBlur = 0;
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

const plateTex = (text: string) =>
  canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#f4f6fa';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#0a3fd8';
    c.lineWidth = 8;
    c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#0a3fd8';
    c.font = `bold 20px ${FONTS.web}`;
    c.textAlign = 'center';
    c.fillText('LEASED  ·  MOTORCO', w / 2, 30);
    c.fillStyle = '#c0102a';
    c.font = `bold 62px ${FONTS.heavy}`;
    c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 14);
  });

// ------------------------------------------------------------------ sub components
const Wheel: React.FC<{spin: number; steer: number; mirror: boolean; position: V3}> = ({spin, steer, mirror, position}) => {
  const tyre = useMemo(() => new THREE.CylinderGeometry(WR, WR, 0.21, 22).rotateZ(Math.PI / 2), []);
  const side = useMemo(() => new THREE.CylinderGeometry(WR * 0.93, WR * 0.93, 0.215, 22).rotateZ(Math.PI / 2), []);
  const rim = useMemo(() => new THREE.CylinderGeometry(0.205, 0.205, 0.03, 22).rotateZ(Math.PI / 2), []);
  const lip = useMemo(() => new THREE.TorusGeometry(0.205, 0.016, 6, 22).rotateY(Math.PI / 2), []);
  const hub = useMemo(() => new THREE.CylinderGeometry(0.05, 0.06, 0.05, 10).rotateZ(Math.PI / 2), []);
  return (
    <group position={position} rotation={[0, steer, 0]} scale={[mirror ? -1 : 1, 1, 1]}>
      <group rotation={[spin, 0, 0]}>
        <mesh geometry={tyre} material={toonMat('#1e2028')}>
          <mesh geometry={hullOf(tyre)} material={outlineMat(0.018)} />
        </mesh>
        <mesh geometry={side} material={toonMat('#2c2f38')} />
        <mesh geometry={rim} material={toonMat('#3a3e48')} position={[0.075, 0, 0]} />
        <mesh geometry={lip} material={toonMat('#e8ecf4')} position={[0.1, 0, 0]} />
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} geometry={boxGeo(0.03, 0.19, 0.055)} material={toonMat('#dfe4ee')} position={[0.098, Math.cos((i * 2 * Math.PI) / 5) * 0.1, Math.sin((i * 2 * Math.PI) / 5) * 0.1]}
            rotation={[(i * 2 * Math.PI) / 5, 0, 0]} />
        ))}
        <mesh geometry={hub} material={toonMat('#f4f6fa')} position={[0.11, 0, 0]} />
      </group>
    </group>
  );
};

const Seat: React.FC<{position: V3; width?: number; mat: THREE.Material; frostMat: THREE.Material; frost: number; bench?: boolean}> = ({position, width = 0.5, mat, frostMat, frost, bench}) => {
  const lean = bench ? -0.28 : -0.2;
  const backH = bench ? 0.56 : 0.64;
  const parts = (m: THREE.Material, s: number) => (
    <>
      <RoundedBox args={[width * s, 0.15 * s, 0.5 * s]} radius={0.05} smoothness={2} material={m} position={[0, 0, 0]} />
      <group position={[0, 0.06, -0.27]} rotation={[lean, 0, 0]}>
        <RoundedBox args={[width * s, backH * s, 0.14 * s]} radius={0.05} smoothness={2} material={m} position={[0, backH / 2, 0]} />
        {!bench ? (
          <>
            <RoundedBox args={[0.09 * s, backH * 0.8 * s, 0.17 * s]} radius={0.04} smoothness={2} material={m} position={[-width / 2 + 0.03, backH * 0.42, 0.03]} />
            <RoundedBox args={[0.09 * s, backH * 0.8 * s, 0.17 * s]} radius={0.04} smoothness={2} material={m} position={[width / 2 - 0.03, backH * 0.42, 0.03]} />
            <RoundedBox args={[0.28 * s, 0.17 * s, 0.11 * s]} radius={0.045} smoothness={2} material={m} position={[0, backH + 0.13, -0.01]} />
            <mesh geometry={boxGeo(0.02, 0.06, 0.02)} material={toonMat('#a0a4ae')} position={[-0.07, backH + 0.03, 0]} />
            <mesh geometry={boxGeo(0.02, 0.06, 0.02)} material={toonMat('#a0a4ae')} position={[0.07, backH + 0.03, 0]} />
          </>
        ) : null}
      </group>
    </>
  );
  return (
    <group position={position}>
      {parts(mat, 1)}
      {frost > 0.01 ? parts(frostMat, 1.025) : null}
      {frost > 0.4
        ? Array.from({length: bench ? 9 : 5}, (_, i) => {
            const L = (0.04 + hash1(i, bench ? 3 : 1) * 0.07) * Math.min(1, (frost - 0.4) / 0.4);
            return (
              <mesh key={i} position={[-width / 2 + 0.05 + (i * (width - 0.1)) / ((bench ? 9 : 5) - 1), -0.075 - L / 2, 0.25]} rotation={[Math.PI, 0, 0]} material={toonMat('#dff8ff', {emissive: '#7fdcff', emissiveIntensity: 0.6})}>
                <coneGeometry args={[0.012, L, 5]} />
              </mesh>
            );
          })
        : null}
    </group>
  );
};

const Padlock: React.FC<GroupProps> = (g) => (
  <group {...g}>
    <RoundedBox args={[0.05, 0.04, 0.016]} radius={0.006} smoothness={2} material={toonMat(C.alertRed, {emissive: C.alertRed, emissiveIntensity: 0.5})} />
    <mesh position={[0, 0.022, 0]} material={toonMat('#d8dce6')}>
      <torusGeometry args={[0.016, 0.004, 6, 14, Math.PI]} />
    </mesh>
    <mesh position={[0, -0.002, 0.009]} material={toonMat('#3a0408')}>
      <circleGeometry args={[0.006, 10]} />
    </mesh>
  </group>
);

// ------------------------------------------------------------------ Car
export type CarProps = GroupProps & {
  wheelSpin?: number;
  steer?: number;
  doorOpen?: number;
  headlights?: number;
  brakeLights?: number;
  bodyRoll?: number;
  bodyPitch?: number;
  bodyBounce?: number;
  interior?: boolean;
  seatFrost?: number;
  speedNeedle?: number;
  rpmNeedle?: number;
  dashSpeedText?: string;
  dashLocked?: boolean;
  /** fuel gauge 0 (E) .. 1 (F); default 0.12 (nearly empty) */
  fuel?: number;
  consoleText?: string;
  consoleColor?: string;
  paint?: string;
  plate?: string;
  beams?: boolean;
  lights?: boolean;
  shadow?: boolean;
  outline?: number | false;
};

export const Car: React.FC<CarProps> = ({
  wheelSpin = 0, steer = 0, doorOpen = 0, headlights = 0, brakeLights = 0, bodyRoll = 0, bodyPitch = 0, bodyBounce = 0,
  interior = true, seatFrost = 0, speedNeedle = 0, rpmNeedle = 0.1, dashSpeedText, dashLocked = false, fuel = 0.12, consoleText = 'FM 101.1',
  consoleColor = C.aqua, paint = '#b9c1ce', plate = '4 NOW', beams = true, lights = true, shadow = true, outline = 0.016, ...g
}) => {
  const T = tex();
  // ---------------- geometry (built once)
  const G = useMemo(() => {
    const prof = profileShape();
    const pass = profileShape();
    pass.holes.push(poly(FRONT_WIN, true), poly(REAR_WIN, true));
    const drv = profileShape();
    drv.holes.push(poly(DOOR, true), poly(REAR_WIN, true));
    const doorShape = poly(DOOR) as THREE.Shape;
    doorShape.holes.push(poly(FRONT_WIN, true));
    const sideR = sideSlab(drv, HW, -1);
    const sideL = sideSlab(pass, -HW, 1);
    // door: built in car space, then re-centred on the hinge
    const door = sideSlab(doorShape, HW - 0.004, -1);
    door.translate(-HW, 0, -DOOR_FRONT);
    const doorGlass = sidePane(FRONT_WIN, HW - PANEL / 2);
    doorGlass.translate(-HW, 0, -DOOR_FRONT);
    const glassL = mergeSafe([sidePane(FRONT_WIN, -HW + PANEL / 2), sidePane(REAR_WIN, -HW + PANEL / 2)]);
    const glassR = sidePane(REAR_WIN, HW - PANEL / 2);
    // ribbons
    const nose = curvePts((p) => {
      p.moveTo(1.9, SILL);
      p.quadraticCurveTo(1.99, 0.29, 1.99, 0.45);
      p.quadraticCurveTo(1.99, 0.7, 1.86, 0.76);
      p.quadraticCurveTo(1.4, 0.89, 0.86, 0.95);
    }, 6);
    const shield = [v2(0.86, 0.95), v2(0.05, 1.47)];
    const roof = curvePts((p) => {
      p.moveTo(0.05, 1.47);
      p.quadraticCurveTo(-0.6, 1.53, -1.3, 1.49);
      p.quadraticCurveTo(-1.44, 1.48, -1.46, 1.42);
    }, 6);
    const hatch = [v2(-1.46, 1.42), v2(-1.8, 1.0)];
    const tail = curvePts((p) => {
      p.moveTo(-1.8, 1.0);
      p.quadraticCurveTo(-1.9, 0.95, -1.92, 0.7);
      p.quadraticCurveTo(-1.95, 0.3, -1.86, SILL);
    }, 6);
    const body = mergeSafe([ribbon(nose, HW - 0.01), ribbon(roof, HW - 0.01), ribbon(tail, HW - 0.01)]);
    const glassTop = mergeSafe([ribbon(shield, HW - 0.03), ribbon(hatch, HW - 0.03)]);
    // dashboard profile extruded across the cabin
    const dsh = new THREE.Shape([v2(0.86, 0.93), v2(0.47, 1.04), v2(0.36, 1.0), v2(0.4, 0.72), v2(0.62, 0.5), v2(0.86, 0.45)]);
    const dash = new THREE.ExtrudeGeometry(dsh, {depth: 1.56, bevelEnabled: false});
    dash.rotateY(-Math.PI / 2);
    dash.translate(0.78, 0, 0);
    const beam = new THREE.CylinderGeometry(0.12, 2.2, 9, 20, 1, true);
    beam.rotateX(-Math.PI / 2); // narrow top (uv.y=1, bright) -> -z (at the lamp), wide end forward
    return {prof, sideR, sideL, door, doorGlass, glassL, glassR, body, glassTop, dash, beam};
  }, []);

  // ---------------- materials
  const M = useMemo(() => {
    const paintMat = new THREE.MeshPhysicalMaterial({color: paint, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1});
    const inner = new THREE.MeshToonMaterial({color: '#8c909c', side: THREE.BackSide});
    const glass = new THREE.MeshPhysicalMaterial({color: '#20304a', metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.42, envMapIntensity: 1.15, side: THREE.DoubleSide, depthWrite: false});
    const seat = new THREE.MeshToonMaterial({map: T.fabric, color: '#ffffff'});
    const frost = new THREE.MeshToonMaterial({map: T.frost, color: '#d6f6ff', transparent: true, opacity: 0, emissive: '#5fc8ff', emissiveIntensity: 0.0, depthWrite: false});
    const head = new THREE.MeshStandardMaterial({color: '#e8f4ff', roughness: 0.05, metalness: 0.2, emissive: '#d8ecff', emissiveIntensity: 0});
    const tail = new THREE.MeshStandardMaterial({color: '#ff4058', roughness: 0.1, metalness: 0.1, emissive: '#ff1030', emissiveIntensity: 0.3});
    const third = new THREE.MeshBasicMaterial({color: '#ff1030'});
    const cone = lightConeMat('#dff0ff', 0);
    const blob = new THREE.MeshBasicMaterial({map: T.blob, transparent: true, depthWrite: false, color: '#000000', opacity: 1});
    const cdMat = new THREE.MeshStandardMaterial({map: T.cd, metalness: 0.3, roughness: 0.3, transparent: true, side: THREE.DoubleSide, envMapIntensity: 0.6});
    const well = new THREE.MeshToonMaterial({color: '#121318', side: THREE.DoubleSide});
    return {paintMat, inner, glass, seat, frost, head, tail, third, cone, blob, cdMat, well};
  }, [paint]);
  useLayoutEffect(() => {
    M.head.emissiveIntensity = headlights * 3.2;
    M.tail.emissiveIntensity = 0.35 + brakeLights * 3.5 + headlights * 0.4;
    M.third.color.set('#ff1030').multiplyScalar(0.25 + brakeLights * 3.5);
    M.cone.uniforms.uI.value = 0.16 * headlights;
    M.seat.color.set('#ffffff').lerp(new THREE.Color('#9fd8f0'), seatFrost * 0.85);
    M.seat.emissive.set('#3fa8e0');
    M.seat.emissiveIntensity = seatFrost * 0.12;
    M.frost.opacity = Math.min(0.9, seatFrost);
    M.frost.emissiveIntensity = seatFrost * 0.12;
  });

  const dial = useMemo(() => dialTex('speed', dashSpeedText ?? '012384 mi', dashLocked), [dashSpeedText, dashLocked]);
  const tach = useMemo(() => dialTex('tach', '', false), []);
  const fuelMat = useMemo(() => new THREE.MeshBasicMaterial({map: fuelTex()}), []);
  const cons = useMemo(() => consoleTex(consoleText, consoleColor), [consoleText, consoleColor]);
  const plateT = useMemo(() => plateTex(plate), [plate]);
  const dialMat = useMemo(() => new THREE.MeshBasicMaterial({map: dial, toneMapped: true}), [dial]);
  const tachMat = useMemo(() => new THREE.MeshBasicMaterial({map: tach}), [tach]);
  const consMat = useMemo(() => new THREE.MeshBasicMaterial({map: cons}), [cons]);
  const plateMat = useMemo(() => new THREE.MeshToonMaterial({map: plateT}), [plateT]);
  useLayoutEffect(() => {
    dialMat.color.setScalar(1.05);
    tachMat.color.setScalar(1.0);
    consMat.color.setScalar(1.1);
  }, [dialMat, tachMat, consMat]);

  // headlight spotlight target
  const spot = useRef<THREE.SpotLight>(null);
  const spotTarget = useRef<THREE.Object3D>(null);
  useLayoutEffect(() => {
    if (spot.current && spotTarget.current) spot.current.target = spotTarget.current;
  });

  const ol = outline || 0;
  const ink2 = (geo: THREE.BufferGeometry, mat: THREE.Material, inner = false) => (
    <>
      <mesh geometry={geo} material={mat} />
      {inner ? <mesh geometry={geo} material={M.inner} /> : null}
      {ol ? <mesh geometry={hullOf(geo)} material={outlineMat(ol)} /> : null}
    </>
  );
  const doorAng = -doorOpen * 1.15;
  const steerA = steer * 0.5;
  const needleA = 2.356 - Math.max(0, Math.min(1, speedNeedle)) * 4.712;
  const rpmA = 2.356 - Math.max(0, Math.min(1, rpmNeedle)) * 4.712;

  return (
    <group {...g}>
      {shadow ? (
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.blob} renderOrder={1}>
          <planeGeometry args={[2.5, 4.9]} />
        </mesh>
      ) : null}
      {/* wheels (not affected by body roll) */}
      <Wheel position={CAR.wheels.fl} spin={wheelSpin} steer={steerA} mirror={false} />
      <Wheel position={CAR.wheels.fr} spin={wheelSpin} steer={steerA} mirror />
      <Wheel position={CAR.wheels.rl} spin={wheelSpin} steer={0} mirror={false} />
      <Wheel position={CAR.wheels.rr} spin={wheelSpin} steer={0} mirror />

      <group position={[0, 0.5 + bodyBounce, 0]} rotation={[bodyPitch, 0, -bodyRoll]}>
        <group position={[0, -0.5, 0]}>
          {/* ---- shell */}
          {ink2(G.body, M.paintMat, true)}
          {ink2(G.sideR, M.paintMat, true)}
          {ink2(G.sideL, M.paintMat, true)}
          <mesh geometry={G.glassTop} material={M.glass} renderOrder={2} />
          <mesh geometry={G.glassL} material={M.glass} renderOrder={2} />
          <mesh geometry={G.glassR} material={M.glass} renderOrder={2} />
          {/* underbody + wheel wells */}
          <mesh geometry={boxGeo(2 * HW - 0.04, 0.06, 3.7)} material={toonMat('#202228')} position={[0, SILL + 0.02, 0]} />
          {[AXLE, -AXLE].map((z) => (
            <mesh key={z} position={[0, SILL, z]} rotation={[0, 0, Math.PI / 2]} material={M.well}>
              <cylinderGeometry args={[ARCH - 0.01, ARCH - 0.01, 2 * HW - 0.06, 16, 1, true, 0, Math.PI]} />
            </mesh>
          ))}
          {/* bumpers / trim */}
          <RoundedBox args={[2 * HW - 0.06, 0.2, 0.2]} radius={0.06} smoothness={2} position={[0, 0.37, 1.9]} material={M.paintMat} />
          <RoundedBox args={[2 * HW - 0.04, 0.07, 0.08]} radius={0.03} smoothness={2} position={[0, 0.44, 1.995]} material={toonMat('#2a2d36')} />
          <RoundedBox args={[2 * HW - 0.06, 0.22, 0.2]} radius={0.06} smoothness={2} position={[0, 0.4, -1.86]} material={M.paintMat} />
          <RoundedBox args={[2 * HW - 0.04, 0.07, 0.08]} radius={0.03} smoothness={2} position={[0, 0.47, -1.94]} material={toonMat('#2a2d36')} />
          {/* grille, badge, intake, fog lights */}
          <RoundedBox args={[0.62, 0.1, 0.06]} radius={0.04} smoothness={2} position={[0, 0.62, 1.965]} rotation={[-0.3, 0, 0]} material={toonMat('#14161c')} />
          <mesh position={[0, 0.63, 1.995]} rotation={[-0.3, 0, 0]} material={toonMat('#f4f6fa', {emissive: '#ffffff', emissiveIntensity: 0.2})}>
            <torusGeometry args={[0.05, 0.012, 6, 18]} />
          </mesh>
          <mesh geometry={boxGeo(0.7, 0.07, 0.04)} material={toonMat('#14161c')} position={[0, 0.32, 1.985]} />
          {[-0.62, 0.62].map((x) => (
            <mesh key={x} position={[x, 0.33, 1.99]} material={M.head}>
              <circleGeometry args={[0.045, 12]} />
            </mesh>
          ))}
          {/* headlights (jelly-bean) */}
          {CAR.headlights.map((p, i) => (
            <group key={i} position={p} rotation={[-0.32, (i ? -1 : 1) * 0.42, 0]}>
              <mesh material={M.head} scale={[0.26, 0.085, 0.17]}>
                <sphereGeometry args={[1, 18, 10]} />
              </mesh>
              <mesh position={[(i ? 1 : -1) * 0.06, 0, 0.1]} material={toonMat('#e8eef8', {emissive: '#e0f0ff', emissiveIntensity: Math.round((0.02 + headlights * 2) * 10) / 10})}>
                <circleGeometry args={[0.045, 12]} />
              </mesh>
            </group>
          ))}
          {/* tail lights + third brake light */}
          {CAR.tailLights.map((p, i) => (
            <group key={i} position={p} rotation={[0.12, (i ? 1 : -1) * 0.35, 0]}>
              <RoundedBox args={[0.15, 0.34, 0.09]} radius={0.035} smoothness={2} material={M.tail} />
              <mesh position={[0, 0.02, -0.047]} rotation={[0, Math.PI, 0]} material={toonMat('#f4f8ff', {emissive: '#ffffff', emissiveIntensity: 0.25})}>
                <ringGeometry args={[0.035, 0.05, 14]} />
              </mesh>
            </group>
          ))}
          {/* roof spoiler + 3rd brake light */}
          <group position={[0, 1.47, -1.42]} rotation={[0.18, 0, 0]}>
            <RoundedBox args={[1.38, 0.05, 0.24]} radius={0.02} smoothness={2} material={M.paintMat} />
            <mesh geometry={boxGeo(0.4, 0.025, 0.02)} position={[0, -0.02, -0.125]} material={M.third} />
          </group>
          {/* antenna */}
          <mesh position={[0.25, 1.66, -1.15]} rotation={[-0.45, 0, 0]} material={toonMat('#14161c')}>
            <cylinderGeometry args={[0.004, 0.008, 0.38, 5]} />
          </mesh>
          {/* plates */}
          <mesh position={[0, 0.5, 2.005]} rotation={[0, 0, 0]} material={plateMat}>
            <planeGeometry args={[0.36, 0.18]} />
          </mesh>
          <mesh position={[0, 0.66, -1.945]} rotation={[0, Math.PI, 0]} material={plateMat}>
            <planeGeometry args={[0.36, 0.18]} />
          </mesh>
          {/* wipers */}
          {[0.35, -0.2].map((x) => (
            <mesh key={x} geometry={boxGeo(0.55, 0.012, 0.02)} position={[x, 0.975, 0.8]} rotation={[0, 0.12, 0.08]} material={toonMat('#14161c')} />
          ))}
          {/* passenger-side door seams, handles, mirror */}
          {[[-HW - 0.002, DOOR_FRONT], [-HW - 0.002, DOOR_BACK]].map(([x, z]) => (
            <mesh key={z} geometry={boxGeo(0.006, 0.66, 0.008)} position={[x, 0.64, z]} material={toonMat('#4a4e58')} />
          ))}
          <mesh geometry={boxGeo(0.02, 0.035, 0.13)} position={[-HW - 0.01, 0.88, -0.22]} material={toonMat('#2a2d36')} />
          <group position={[-HW - 0.06, 1.02, 0.62]}>
            <RoundedBox args={[0.12, 0.11, 0.17]} radius={0.04} smoothness={2} material={M.paintMat} />
          </group>
          {/* side mouldings (passenger side + rear quarter driver side) */}
          <mesh geometry={boxGeo(0.03, 0.06, 1.56)} position={[-HW - 0.01, 0.55, 0]} material={toonMat('#2a2d36')} />
          <mesh geometry={boxGeo(0.03, 0.06, 0.33)} position={[HW + 0.01, 0.55, -0.615]} material={toonMat('#2a2d36')} />
          {/* fuel cap */}
          <mesh position={[HW + 0.004, CAR.fuelCap[1], CAR.fuelCap[2]]} rotation={[0, Math.PI / 2, 0]} material={toonMat('#b8bfcc')}>
            <circleGeometry args={[0.075, 18]} />
          </mesh>
          <mesh position={[HW + 0.005, CAR.fuelCap[1], CAR.fuelCap[2]]} rotation={[0, Math.PI / 2, 0]} material={toonMat('#6a707c')}>
            <ringGeometry args={[0.072, 0.082, 18]} />
          </mesh>

          {/* ---- driver door (hinged at its front edge) */}
          <group position={[HW, 0, DOOR_FRONT]} rotation={[0, doorAng, 0]}>
            {ink2(G.door, M.paintMat, true)}
            <mesh geometry={G.doorGlass} material={M.glass} renderOrder={2} />
            <mesh geometry={boxGeo(0.03, 0.06, 1.12)} position={[0.01, 0.55, -0.6]} material={toonMat('#2a2d36')} />
            <mesh geometry={boxGeo(0.02, 0.035, 0.13)} position={[0.01, 0.88, -0.94]} material={toonMat('#2a2d36')} />
            <group position={[0.06, 1.02, -0.1]}>
              <RoundedBox args={[0.12, 0.11, 0.17]} radius={0.04} smoothness={2} material={M.paintMat} />
            </group>
            {/* inner door card + armrest */}
            <mesh geometry={boxGeo(0.04, 0.45, 1.0)} position={[-0.07, 0.72, -0.58]} material={toonMat('#4a4f5e')} />
            <mesh geometry={boxGeo(0.08, 0.05, 0.4)} position={[-0.11, 0.78, -0.62]} material={toonMat('#5a6070')} />
          </group>

          {/* ---- lights FX */}
          {headlights > 0.01 ? (
            <>
              {CAR.headlights.map((p, i) => (
                <React.Fragment key={i}>
                  <Glow position={[p[0], p[1], p[2] + 0.12]} size={0.3 + headlights * 0.55} color="#e8f4ff" opacity={0.6 * headlights} />
                  <Glow position={[p[0], p[1], p[2] + 0.14]} size={0.3 + headlights * 0.5} color="#ffffff" opacity={0.45 * headlights} kind="sparkle" />
                  {beams ? <mesh geometry={G.beam} material={M.cone} position={[p[0], p[1] - 0.25, p[2] + 4.6]} rotation={[0.04, 0, 0]} renderOrder={5} /> : null}
                </React.Fragment>
              ))}
              {lights ? (
                <>
                  <spotLight ref={spot} position={[0, 0.75, 2.1]} color="#eaf4ff" intensity={headlights * 18} angle={0.55} penumbra={0.6} distance={30} decay={1.2} />
                  <object3D ref={spotTarget} position={[0, 0, 12]} />
                </>
              ) : null}
            </>
          ) : null}
          {brakeLights > 0.01 || headlights > 0.01
            ? CAR.tailLights.map((p, i) => (
                <Glow key={`tg${i}`} position={[p[0], p[1], p[2] - 0.12]} size={0.3 + brakeLights * 0.6} color="#ff2040" opacity={0.2 * headlights + 0.6 * brakeLights} />
              ))
            : null}

          {/* ---- interior */}
          {interior ? (
            <group>
              <mesh geometry={boxGeo(2 * HW - 0.12, 0.05, 3.1)} material={toonMat('#2a2d38')} position={[0, 0.31, -0.3]} />
              <mesh geometry={G.dash} material={toonMat('#3d4252')} />
              <mesh geometry={boxGeo(1.5, 0.04, 0.3)} material={toonMat('#4a5062')} position={[0, 1.02, 0.62]} rotation={[-0.27, 0, 0]} />
              {/* rear parcel shelf */}
              <mesh geometry={boxGeo(2 * HW - 0.15, 0.03, 0.45)} material={toonMat('#2a2d38')} position={[0, 1.0, -1.62]} />
              {/* instrument binnacle */}
              <group position={[0.39, 1.155, 0.41]} rotation={[0.12, 0, 0]}>
                <RoundedBox args={[0.52, 0.055, 0.18]} radius={0.026} smoothness={2} material={toonMat('#2f3340')} />
              </group>
              <mesh geometry={boxGeo(0.52, 0.22, 0.1)} material={toonMat('#2f3340')} position={[0.39, 1.06, 0.415]} rotation={[0.26, 0, 0]} />
              {[-1, 1].map((sx) => (
                <mesh key={sx} geometry={boxGeo(0.03, 0.2, 0.14)} material={toonMat('#2f3340')} position={[0.39 + sx * 0.255, 1.07, 0.39]} rotation={[0.26, 0, 0]} />
              ))}
              <group position={CAR.dashboard} rotation={[0.26, Math.PI, 0]}>
                <mesh geometry={boxGeo(0.46, 0.17, 0.01)} material={toonMat('#0b0f18')} position={[0.03, 0, -0.006]} />
                {/* speedometer (right of tach from the driver's view -> local +x is driver's right) */}
                <mesh material={dialMat}>
                  <circleGeometry args={[0.08, 40]} />
                </mesh>
                <mesh position={[0, 0, 0.004]} material={toonMat('#d8dce6', {emissive: '#9fdfff', emissiveIntensity: 0.1})}>
                  <torusGeometry args={[0.082, 0.006, 6, 40]} />
                </mesh>
                <group position={[0, 0, 0.006]} rotation={[0, 0, needleA]}>
                  <mesh geometry={boxGeo(0.0045, 0.07, 0.002)} position={[0, 0.03, 0]} material={neonMat('#ff5a1a', 2.2)} />
                </group>
                <mesh position={[0, 0, 0.009]} material={toonMat('#14161c')}>
                  <circleGeometry args={[0.011, 14]} />
                </mesh>
                {/* tach */}
                <group position={[0.15, 0.005, 0]} scale={0.72}>
                  <mesh material={tachMat}>
                    <circleGeometry args={[0.08, 36]} />
                  </mesh>
                  <mesh position={[0, 0, 0.004]} material={toonMat('#d8dce6')}>
                    <torusGeometry args={[0.082, 0.006, 6, 36]} />
                  </mesh>
                  <group position={[0, 0, 0.006]} rotation={[0, 0, rpmA]}>
                    <mesh geometry={boxGeo(0.0045, 0.07, 0.002)} position={[0, 0.03, 0]} material={neonMat('#ff5a1a', 2.2)} />
                  </group>
                </group>
                {/* fuel gauge mini */}
                <mesh position={[-0.125, -0.005, 0]} material={fuelMat}>
                  <circleGeometry args={[0.045, 28]} />
                </mesh>
                <group position={[-0.125, -0.005 - 0.045 * (20 / 128), 0.003]} rotation={[0, 0, Math.PI / 4 - Math.max(0, Math.min(1, fuel)) * (Math.PI / 2)]}>
                  <mesh geometry={boxGeo(0.003, 0.03, 0.002)} position={[0, 0.015, 0]} material={neonMat('#ff5a1a', 2)} />
                </group>
                {dashLocked ? (
                  <>
                    <Padlock position={[-0.022, 0.016, 0.03]} scale={0.8} />
                    <Glow position={[-0.022, 0.016, 0.04]} size={0.12} color={C.alertRed} opacity={0.45} />
                  </>
                ) : null}
              </group>
              {/* centre stack */}
              <group position={[0, 0.82, 0.44]} rotation={[-0.25, 0, 0]}>
                <mesh geometry={boxGeo(0.32, 0.36, 0.08)} material={toonMat('#2f3340')} />
                <mesh position={[0, 0.08, 0.042]} material={consMat}>
                  <planeGeometry args={[0.24, 0.075]} />
                </mesh>
                {[-0.08, 0, 0.08].map((x) => (
                  <mesh key={x} position={[x, -0.07, 0.05]} rotation={[Math.PI / 2, 0, 0]} material={toonMat('#c8ccd6')}>
                    <cylinderGeometry args={[0.022, 0.022, 0.02, 12]} />
                  </mesh>
                ))}
                <mesh geometry={boxGeo(0.26, 0.04, 0.02)} position={[0, 0.15, 0.045]} material={toonMat('#14161c')} />
              </group>
              {/* vents */}
              {[-0.62, 0.62].map((x) => (
                <mesh key={x} geometry={boxGeo(0.12, 0.06, 0.02)} position={[x, 0.95, 0.4]} rotation={[-0.3, 0, 0]} material={toonMat('#14161c')} />
              ))}
              {/* steering wheel */}
              <group position={CAR.steeringWheel} rotation={[0.55, Math.PI, 0]}>
                <mesh position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]} material={toonMat('#2a2d36')}>
                  <cylinderGeometry args={[0.025, 0.035, 0.34, 8]} />
                </mesh>
                <group rotation={[0, 0, steer * 1.6]}>
                  <mesh material={toonMat('#2a2d36')}>
                    <torusGeometry args={[0.17, 0.022, 8, 28]} />
                  </mesh>
                  <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]} material={toonMat('#3a3e4a')}>
                    <cylinderGeometry args={[0.06, 0.065, 0.05, 14]} />
                  </mesh>
                  <mesh position={[0, 0, 0.037]} material={toonMat('#9aa0ac')}>
                    <torusGeometry args={[0.022, 0.006, 6, 16]} />
                  </mesh>
                  {[Math.PI / 2 + 0.0, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 - (2 * Math.PI) / 3].map((a, i) => (
                    <mesh key={i} geometry={boxGeo(0.11, 0.03, 0.02)} position={[Math.cos(a + Math.PI) * 0.11, Math.sin(a + Math.PI) * 0.11, 0]} rotation={[0, 0, a]} material={toonMat('#3a3e4a')} />
                  ))}
                </group>
              </group>
              {/* seats */}
              <Seat position={[0.38, 0.47, -0.22]} mat={M.seat} frostMat={M.frost} frost={seatFrost} />
              <Seat position={[-0.38, 0.47, -0.22]} mat={M.seat} frostMat={M.frost} frost={seatFrost} />
              <Seat position={[0, 0.47, -1.08]} width={1.36} mat={M.seat} frostMat={M.frost} frost={seatFrost} bench />
              {/* gear stick */}
              <group position={[0, 0.5, 0.08]}>
                <mesh geometry={boxGeo(0.2, 0.2, 0.55)} material={toonMat('#2f3340')} position={[0, -0.04, -0.1]} />
                <mesh position={[0, 0.12, 0.05]} material={toonMat('#14161c')}>
                  <coneGeometry args={[0.05, 0.09, 8]} />
                </mesh>
                <mesh position={[0, 0.2, 0.05]} material={toonMat('#14161c')}>
                  <cylinderGeometry args={[0.009, 0.009, 0.16, 6]} />
                </mesh>
                <mesh position={[0, 0.29, 0.05]} material={toonMat('#c8ccd6')}>
                  <sphereGeometry args={[0.03, 12, 8]} />
                </mesh>
              </group>
              {/* rear-view mirror + hanging CD */}
              <group position={[0, 1.35, 0.2]}>
                <mesh geometry={boxGeo(0.02, 0.06, 0.02)} position={[0, 0.04, 0.02]} material={toonMat('#2a2d36')} />
                <RoundedBox args={[0.24, 0.065, 0.03]} radius={0.015} smoothness={2} material={toonMat('#2a2d36')} />
                <mesh geometry={boxGeo(0.003, 0.14, 0.003)} position={[0.0, -0.1, 0]} material={toonMat('#e8ecf4')} />
                <mesh position={[0, -0.2, 0]} rotation={[0, 0.6, 0]} material={M.cdMat}>
                  <circleGeometry args={[0.055, 28]} />
                </mesh>
              </group>
            </group>
          ) : null}
        </group>
      </group>
    </group>
  );
};

function mergeSafe(gs: THREE.BufferGeometry[]) {
  const nonIdx = gs.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', n.getAttribute('position'));
    return out;
  });
  let total = 0;
  for (const g of nonIdx) total += g.getAttribute('position').count;
  const arr = new Float32Array(total * 3);
  let o = 0;
  for (const g of nonIdx) {
    arr.set(g.getAttribute('position').array as Float32Array, o);
    o += g.getAttribute('position').count * 3;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  m.computeVertexNormals();
  return m;
}
