// S8 (local 424-522) "Ford filed a patent for that, by the way": a blueprint U.S. PATENT sheet whooshes in and UNROLLS on
// the downbeat; the header types on, FIG. 1 (a car driving away from a man holding a fuel nozzle) draws itself; on
// "patent" a red PATENT PENDING stamp slams down (shake + sparkle); on "by the way" the little line-art car from FIG. 1
// drives right off the paper... and the first raindrops of the next scene streak across.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {Stage, CameraRig, SparkleField, LensFlare, Rain} from '../../lib/three';
import {ramp, lerp, noise1} from '../../lib/time';
import {Stamp3D} from '../../lib/ui';
import {C} from '../../lib/palette';
import {B, W} from './timing';
import {CAR_CANVAS, FIG_CAR, SHEET, drawBlueprint, drawPatentCar} from './blueprint';
import {V3} from './common';

const PW = 1.6; // paper width (m)
const PH = (PW * SHEET.h) / SHEET.w; // 1.0
const SEGX = 64;
const ROLL_R = 0.045;

const useCanvas = (w: number, h: number) =>
  useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return {cv, tex, ctx: cv.getContext('2d') as CanvasRenderingContext2D};
  }, [w, h]);

/** paper plane that unrolls from left to right: u = 0 (rolled up at the left edge) .. 1 (flat) */
const Paper: React.FC<{unroll: number; draw: number}> = ({unroll, draw}) => {
  const {cv, tex, ctx} = useCanvas(SHEET.w, SHEET.h);
  const geo = useMemo(() => new THREE.PlaneGeometry(PW, PH, SEGX, 1), []);
  const base = useMemo(() => Float32Array.from(geo.getAttribute('position').array as Float32Array), [geo]);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({map: tex, side: THREE.DoubleSide, roughness: 0.75, metalness: 0, emissive: '#ffffff', emissiveMap: tex,
      emissiveIntensity: 0.38});
    return m;
  }, [tex]);
  const q = Math.round(draw * 60) / 60; // quantised: redraw at most 60 times
  useLayoutEffect(() => {
    drawBlueprint(ctx, q);
    tex.needsUpdate = true;
  }, [q, ctx, tex, cv]);
  useLayoutEffect(() => {
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const front = -PW / 2 + PW * unroll; // flat up to here, the rest is rolled
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      if (x <= front) pos.setXYZ(i, x, y, 0);
      else {
        const s = x - front;
        const a = s / ROLL_R;
        // spiral roll (radius shrinks slightly per turn) curling toward the camera
        const r = ROLL_R * (1 - Math.min(0.6, a / (Math.PI * 2) * 0.12));
        pos.setXYZ(i, front + Math.sin(a) * r, y, (1 - Math.cos(a)) * r);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return <mesh geometry={geo} material={mat} />;
};

const PatentCar: React.FC<{draw: number; drive: number}> = ({draw, drive}) => {
  const {tex, ctx} = useCanvas(CAR_CANVAS.w * 2, CAR_CANVAS.h * 2);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, toneMapped: true}), [tex]);
  const q = Math.round(draw * 30) / 30;
  useLayoutEffect(() => {
    drawPatentCar(ctx, q);
    tex.needsUpdate = true;
  }, [q, ctx, tex]);
  useLayoutEffect(() => {
    mat.color.setScalar(0.95);
  }, [mat]);
  const sx = PW / SHEET.w;
  const w = CAR_CANVAS.w * sx, h = CAR_CANVAS.h * sx;
  // centre of the car layer on the sheet (the canvas has `pad` px on its left for the motion lines)
  const cx = (FIG_CAR.x - FIG_CAR.w / 2 - FIG_CAR.pad + CAR_CANVAS.w / 2) * sx - PW / 2;
  const cy = PH / 2 - FIG_CAR.y * sx;
  const dx = drive * drive * 1.4;
  const bounce = drive > 0 ? Math.abs(Math.sin(drive * 30)) * 0.006 : 0;
  return (
    <mesh position={[cx + dx, cy + bounce, 0.003]} material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
};

const Backdrop: React.FC = () => {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 640;
    const c = cv.getContext('2d') as CanvasRenderingContext2D;
    const g = c.createRadialGradient(512, 300, 40, 512, 320, 620);
    g.addColorStop(0, '#22348a');
    g.addColorStop(0.45, '#0f1a52');
    g.addColorStop(1, '#03051a');
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 640);
    // faint drafting rays
    c.globalAlpha = 0.06;
    c.fillStyle = '#9fd8ff';
    for (let i = 0; i < 16; i++) {
      c.beginPath();
      c.moveTo(512, 320);
      const a0 = (i / 16) * Math.PI * 2, a1 = a0 + Math.PI / 32;
      c.lineTo(512 + Math.cos(a0) * 900, 320 + Math.sin(a0) * 900);
      c.lineTo(512 + Math.cos(a1) * 900, 320 + Math.sin(a1) * 900);
      c.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh position={[0, 0, -0.6]}>
      <planeGeometry args={[5.2, 3.25]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

export const ShotPatent: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const t0 = B.cut8;
  // the rolled scroll whooshes in from the right (tilted), slaps down at the left edge, then unrolls rightward and lands
  // flat on the downbeat
  const fly = ramp(f, t0 - 2, t0 + 8, (x) => 1 - Math.pow(1 - x, 3));
  const unroll = ramp(f, t0 + 7, B.d8, (x) => 1 - Math.pow(1 - x, 2));
  const pos: V3 = [lerp(1.85, 0, fly), lerp(0.32, 0, fly), lerp(0.22, 0, fly)];
  const rot: V3 = [lerp(0.25, 0, fly), lerp(-0.35, 0, fly), lerp(0.4, 0, fly)];
  const land = f >= B.d8 - 2 ? Math.exp(-(f - B.d8 + 2) / 4) : 0;
  const draw = ramp(f, B.d8 - 8, W.patent - 2, (x) => x);
  const carDraw = ramp(f, W.filed, W.patent - 4, (x) => x);
  const drive = ramp(f, W.by - 3, W.by + 16, (x) => x);
  // stamp on "patent"
  const stampP = ramp(f, W.patent - 6, W.patent + 10, (x) => x);
  const hit = f >= W.patent - 1 ? Math.exp(-(f - W.patent + 1) / 4) : 0;
  // camera: slow push in, shake on the stamp and the landing
  const push = ramp(f, B.d8, B.d9 + 16, (x) => x);
  const sh = hit * 0.012 + land * 0.008;
  const cam: V3 = [lerp(0.0, 0.06, push) + noise1(f * 1.5, 1) * sh, lerp(0.0, 0.03, push) + noise1(f * 1.5, 2) * sh, lerp(1.62, 1.42, push)];
  const tgt: V3 = [lerp(0.0, 0.07, push), lerp(-0.02, 0.0, push), 0];
  const rain = ramp(f, W.by + 2, W.by + 14, (x) => x);
  const flash = f >= B.d8 - 2 ? Math.exp(-(f - B.d8 + 2) / 3) : 0;
  return (
    <Stage background="#04081f" env="night" bloom={{strength: 0.55, radius: 0.5, threshold: 0.9}}>
      <CameraRig position={cam} target={tgt} fov={40} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[1.5, 2.5, 3]} intensity={1.4} color="#e8f4ff" />
      <pointLight position={[0, 0.2, 1.2]} intensity={0.6 + 2.5 * flash} color="#bfe6ff" distance={4} />
      {/* drafting-table backdrop: dark blue felt with a soft lamp pool */}
      <Backdrop />
      <group position={pos} rotation={rot}>
        <group position={[0, 0.05, 0]}>
          <Paper unroll={unroll} draw={draw} />
          {unroll > 0.97 ? <PatentCar draw={carDraw} drive={drive} /> : null}
          {stampP > 0 ? (
            <Stamp3D text="PATENT PENDING" progress={stampP} width={0.56} rotation={-9} position={[0.47, -0.3, 0.012]} seed={7} />
          ) : null}
          <SparkleField count={18} seed={9} time={t} area={[0.7, 0.3, 0.05]} position={[0.47, -0.3, 0.05]} size={0.06} intensity={hit * 4.5}
            colors={['#ffffff', '#ffd6d6', '#bff3ff']} />
        </group>
      </group>
      <SparkleField count={30} seed={4} time={t} area={[2.4, 1.4, 0.4]} position={[0, 0.05, 0.1]} size={0.035} intensity={1.2} />
      <LensFlare position={[-0.95, 0.62, 0.1]} intensity={0.1 + 0.7 * flash} scale={0.5 + 0.4 * flash} ghosts={false} />
      {rain > 0 ? <Rain time={t} count={420} area={[2.6, 1.8, 1.0]} position={[0, -0.9, 0.5]} speed={7} length={0.12} width={0.0025} splashes={0} intensity={0.7 * rain} /> : null}
    </Stage>
  );
};
