/**
 * <GovernorGantry> — TENURE's speed governor as highway infrastructure: a monumental black beam across the highway
 * with a giant round dial at its centre. Most of the dial's arc is a red forbidden band; a red stop holds the needle at
 * the plan's limit ("SPEED · TIER 1"). The needle trembles against it. Local to V2Car.
 *
 *   <GovernorGantry time speed? limit? redPulse? beamW? beamH? radius? {...group}>{text on the beam}</GovernorGantry>
 *   Origin: centre of the dial on the beam's front face (faces +Z). The posts stand on y = -originY (pass `groundY`).
 *   speed     needle value in km/h (0..240)
 *   limit     the plan's limit (km/h): where the red band starts
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, SFONTS} from '../../lib/palette';
import {makeSilhouetteMaterial} from '../../lib/Silhouette';
import {LaserLines} from '../../lib/sets';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

const MAXV = 240;
/** dial angle (radians, maths convention) of a speed value */
export const dialAngle = (v: number) => ((225 - (v / MAXV) * 270) * Math.PI) / 180;

const ls = (g: CanvasRenderingContext2D, px: number) => ((g as unknown as {letterSpacing: string}).letterSpacing = `${px}px`);

/** two layers: bone furniture (ticks, numbers, labels) and red (the forbidden band, the stop, TIER 1) */
const drawDial = (limit: number) => {
  const N = 1024;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = N;
    return c;
  };
  const cb = mk();
  const cr = mk();
  const b = cb.getContext('2d')!;
  const r = cr.getContext('2d')!;
  const cx = N / 2, cy = N / 2, R = N * 0.47;
  const ang = (v: number) => -dialAngle(v); // canvas y is down
  // outer rings
  b.strokeStyle = '#fff';
  b.lineWidth = 6;
  b.beginPath();
  b.arc(cx, cy, R, 0, Math.PI * 2);
  b.stroke();
  b.lineWidth = 2;
  b.beginPath();
  b.arc(cx, cy, R * 0.955, 0, Math.PI * 2);
  b.stroke();
  // ticks + numbers
  for (let v = 0; v <= MAXV; v += 5) {
    const a = ang(v);
    const major = v % 20 === 0;
    const r0 = R * (major ? 0.8 : 0.86), r1 = R * 0.92;
    const ctx = v > limit ? r : b;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = major ? 7 : 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#fff';
      ctx.font = `500 ${N * 0.045}px ${SFONTS.mono}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ls(ctx, 0);
      ctx.fillText(String(v), cx + Math.cos(a) * R * 0.68, cy + Math.sin(a) * R * 0.68);
    }
  }
  // the forbidden band: everything above the plan's limit
  r.strokeStyle = '#fff';
  r.lineWidth = R * 0.075;
  r.beginPath();
  r.arc(cx, cy, R * 0.885, ang(limit), ang(MAXV));
  r.stroke();
  // the stop: a hard red wedge at the limit
  const a0 = ang(limit);
  r.lineWidth = 12;
  r.beginPath();
  r.moveTo(cx + Math.cos(a0) * R * 0.5, cy + Math.sin(a0) * R * 0.5);
  r.lineTo(cx + Math.cos(a0) * R * 0.99, cy + Math.sin(a0) * R * 0.99);
  r.stroke();
  // labels
  b.fillStyle = '#fff';
  b.textAlign = 'center';
  b.textBaseline = 'alphabetic';
  ls(b, N * 0.012);
  b.font = `500 ${N * 0.08}px ${SFONTS.futura}`;
  b.fillText('SPEED ·', cx, cy + R * 0.36);
  r.fillStyle = '#fff';
  r.textAlign = 'center';
  ls(r, N * 0.012);
  r.font = `600 ${N * 0.11}px ${SFONTS.futura}`;
  r.fillText('TIER 1', cx, cy + R * 0.62);
  ls(b, N * 0.006);
  b.font = `400 ${N * 0.032}px ${SFONTS.mono}`;
  b.fillText('KM/H · GOVERNED ON PLAN', cx, cy - R * 0.3);
  b.fillText(`LIMIT ${limit}`, cx, cy + R * 0.8);
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return {bone: tex(cb), red: tex(cr)};
};
const dialCache = new Map<number, ReturnType<typeof drawDial>>();
const getDial = (limit: number) => {
  let d = dialCache.get(limit);
  if (!d) dialCache.set(limit, (d = drawDial(limit)));
  return d;
};

export type GovernorProps = GroupProps & {
  time: number;
  speed?: number;
  limit?: number;
  redPulse?: number;
  beamW?: number;
  beamH?: number;
  radius?: number;
  /** height of the dial centre above the road (posts reach down to the road) */
  height?: number;
  children?: React.ReactNode;
};

export const GovernorGantry: React.FC<GovernorProps> = ({
  time, speed = 20, limit = 20, redPulse = 0, beamW = 44, beamH = 4.6, radius = 4, height = 8.6, children, ...group
}) => {
  const dial = getDial(limit);
  const mats = useMemo(() => {
    const black = makeSilhouetteMaterial(S.void, null, true);
    const face = new THREE.MeshBasicMaterial({color: '#0b0c0e', fog: true});
    const bone = new THREE.MeshBasicMaterial({map: dial.bone, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false});
    const red = new THREE.MeshBasicMaterial({map: dial.red, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false});
    const needle = new THREE.MeshBasicMaterial({color: S.bone, fog: false});
    return {black, face, bone, red, needle};
  }, [dial]);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useLayoutEffect(() => {
    mats.bone.color.setScalar(0.95);
    mats.red.color.set(S.authRed).multiplyScalar(1.05 + 0.4 * redPulse);
    mats.needle.color.set(S.bone).multiplyScalar(1.25);
  });
  void time;
  const a = dialAngle(speed);
  const postX = beamW / 2 - 1.2;
  return (
    <group {...group}>
      {/* beam + dial housing (black) */}
      <mesh material={mats.black} position={[0, 0, -0.7]}>
        <boxGeometry args={[beamW, beamH, 1.4]} />
      </mesh>
      <mesh material={mats.black} position={[0, 0, -0.5]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[radius * 1.12, radius * 1.12, 1.6, 64]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.black} position={[s * postX, -(height + beamH / 2) / 2 - 0.2, -0.7]}>
          <boxGeometry args={[1.1, height - beamH / 2 + 0.6, 1.1]} />
        </mesh>
      ))}
      {/* dial face */}
      <mesh material={mats.face} position={[0, 0, 0.31]}>
        <circleGeometry args={[radius * 1.04, 96]} />
      </mesh>
      <mesh material={mats.bone} position={[0, 0, 0.33]}>
        <planeGeometry args={[radius * 2.13, radius * 2.13]} />
      </mesh>
      <mesh material={mats.red} position={[0, 0, 0.34]}>
        <planeGeometry args={[radius * 2.13, radius * 2.13]} />
      </mesh>
      {/* the needle, pinned against the red stop */}
      <group position={[0, 0, 0.37]} rotation-z={a}>
        <mesh material={mats.needle} position={[radius * 0.42, 0, 0]}>
          <planeGeometry args={[radius * 0.86, radius * 0.028]} />
        </mesh>
        <mesh material={mats.needle}>
          <circleGeometry args={[radius * 0.06, 32]} />
        </mesh>
      </group>
      {/* a thin red control line along the beam's lower edge */}
      <LaserLines segments={[[[-beamW / 2 + 0.4, -beamH / 2 + 0.25, 0.02], [beamW / 2 - 0.4, -beamH / 2 + 0.25, 0.02], 1]]}
        intensity={0.9 + 0.4 * redPulse} width={0.05} fog={0.3} />
      {children}
    </group>
  );
};
