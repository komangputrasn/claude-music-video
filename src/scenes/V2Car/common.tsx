// Shared bits for the V2Car shots: the driver pose, visible breath, frost sparkle burst, night backdrop.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {GUY, GuyPose, GuyArmPose, guyBlink, guyShiver, guyPoint, mixPose} from '../../lib/characters/Guy';
import {CAR} from '../../lib/props/Car';
import {canvasTex} from '../../lib/sets/Exterior';

export type V3 = [number, number, number];

// ------------------------------------------------------------------ driver
/** legs stretched to the pedals (ground solver off: hips sit at 0.85 above the Guy origin) */
const DRIVER_LEG = {hipX: 0.2, knee: -0.6};
/** arm reaching the steering wheel at "10 and 2" (solved offline with guyPoint) */
export const WHEEL_ARM: GuyArmPose = {shoulderX: 0.785, shoulderZ: 0.324, shoulderY: 0.495, elbow: 1.483, twist: -0.988, wrist: 0, wristZ: 0.1, grip: 1, swing: 0};
/** Guy origin (car-local) so his hips land on the driver seat. */
export const DRIVER_POS: V3 = [CAR.driverSeat[0], CAR.driverSeat[1] - 0.85, CAR.driverSeat[2]];

export const driverPose = (t: number, extra: GuyPose = {}): GuyPose => ({
  t,
  sit: 1,
  ground: 0,
  legL: DRIVER_LEG,
  legR: DRIVER_LEG,
  armL: WHEEL_ARM,
  armR: WHEEL_ARM,
  torsoBend: 0.04,
  headPitch: 0.05,
  expression: 'neutral',
  blink: guyBlink(t, 7),
  ...extra,
});

/** k = 0 relaxed driving .. 1 hugging himself and shivering (arms leave the wheel). */
export const driverCold = (t: number, k: number, extra: GuyPose = {}): GuyPose => {
  const sh = guyShiver(t);
  const cold: GuyPose = {...sh, sit: 1, ground: 0, legL: {...DRIVER_LEG, hipZ: -0.04}, legR: {...DRIVER_LEG, hipZ: -0.04}, torsoBend: 0.12, headPitch: 0.06};
  const p = mixPose(driverPose(t), cold, k);
  return {...p, shiver: k, t, ...extra};
};

/** a driver-pose joint in CAR-local coordinates */
export const driverPoint = (pose: GuyPose, joint: Parameters<typeof guyPoint>[1]): V3 => {
  const p = guyPoint(pose, joint);
  return [p[0] + DRIVER_POS[0], p[1] + DRIVER_POS[1], p[2] + DRIVER_POS[2]];
};

void GUY;

// ------------------------------------------------------------------ breath
let _puffTex: THREE.Texture | null = null;
const puffTex = () => {
  if (_puffTex) return _puffTex;
  _puffTex = canvasTex(128, 128, (c, w, h) => {
    const blobs: [number, number, number][] = [[64, 66, 36], [44, 70, 24], [84, 62, 26], [60, 48, 22], [74, 80, 20]];
    for (const [x, y, r] of blobs) {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.22)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  });
  return _puffTex;
};

/**
 * Visible breath: soft puffs leaving `origin` along `dir` every `period` seconds. Pure function of `t`.
 * Lives in whatever space origin/dir are given in.
 */
export const Breath: React.FC<{t: number; origin: V3; dir: V3; start?: number; period?: number; amount?: number; color?: string}> = ({
  t, origin, dir, start = 0, period = 1.05, amount = 1, color = '#e6f8ff',
}) => {
  const N = 6;
  const mats = useMemo(
    () => Array.from({length: N}, () => new THREE.SpriteMaterial({map: puffTex(), color, transparent: true, depthWrite: false, opacity: 0})),
    [color],
  );
  const puffs = Array.from({length: N}, (_, i) => {
    const exhale = Math.floor(i / 3);
    const sub = i % 3;
    const local = t - start;
    if (local < 0) return null;
    const k = Math.floor(local / period) - exhale;
    if (k < 0) return null;
    const age = (local - (k * period + sub * 0.07)) / (period * 1.6);
    if (age <= 0 || age >= 1) return null;
    const d = 0.05 + 0.32 * Math.pow(age, 0.7);
    const spread = (sub - 1) * 0.035 * age;
    const pos: V3 = [origin[0] + dir[0] * d + spread, origin[1] + dir[1] * d + 0.07 * age * age + (sub - 1) * 0.01, origin[2] + dir[2] * d - spread * 0.4];
    const size = 0.05 + 0.2 * Math.pow(age, 0.6);
    const op = amount * 0.85 * Math.min(1, age * 7) * Math.pow(1 - age, 1.4);
    return {pos, size, op, rot: sub * 1.3 + age};
  });
  useLayoutEffect(() => {
    puffs.forEach((p, i) => {
      mats[i].opacity = p ? p.op : 0;
      mats[i].rotation = p ? p.rot : 0;
    });
  });
  return (
    <group>
      {puffs.map((p, i) => (p ? <sprite key={i} position={p.pos} scale={[p.size, p.size, 1]} material={mats[i]} renderOrder={12} /> : null))}
    </group>
  );
};

// ------------------------------------------------------------------ spotlight with a real target object
export const Spot: React.FC<{position: V3; target: V3; color?: string; intensity: number; angle?: number; penumbra?: number; distance?: number; decay?: number}> = ({
  position, target, color = '#ffffff', intensity, angle = 0.6, penumbra = 0.6, distance = 30, decay = 1.2,
}) => {
  const ref = React.useRef<THREE.SpotLight>(null);
  const tg = React.useRef<THREE.Object3D>(null);
  useLayoutEffect(() => {
    if (ref.current && tg.current) ref.current.target = tg.current;
  });
  return (
    <>
      <spotLight ref={ref} position={position} color={color} intensity={intensity} angle={angle} penumbra={penumbra} distance={distance} decay={decay} />
      <object3D ref={tg} position={target} />
    </>
  );
};

/** Euler that turns a +Z-facing object at `pos` toward `cam` (billboard once, no roll). */
export const faceToward = (pos: V3, cam: V3): V3 => {
  const o = new THREE.Object3D();
  o.position.set(...pos);
  o.lookAt(new THREE.Vector3(...cam));
  return [o.rotation.x, o.rotation.y, o.rotation.z];
};

/** a point `dist` in front of the camera, offset in camera right/up units */
export const inFrontOf = (cam: V3, target: V3, dist: number, right = 0, up = 0): V3 => {
  const c = new THREE.Vector3(...cam);
  const fwd = new THREE.Vector3(...target).sub(c).normalize();
  const r = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const u = new THREE.Vector3().crossVectors(r, fwd).normalize();
  const p = c.add(fwd.multiplyScalar(dist)).add(r.multiplyScalar(right)).add(u.multiplyScalar(up));
  return [p.x, p.y, p.z];
};

/**
 * Camera target such that `subject` lands at screen NDC (sx right+, sy up+) for a camera at `cam` with vertical `fov`.
 */
export const aimAt = (cam: V3, subject: V3, sx: number, sy: number, fov: number, aspect = 16 / 9): V3 => {
  const d = new THREE.Vector3(subject[0] - cam[0], subject[1] - cam[1], subject[2] - cam[2]).normalize();
  const yaw0 = Math.atan2(d.x, d.z);
  const pitch0 = Math.asin(d.y);
  const tv = Math.tan(((fov / 2) * Math.PI) / 180);
  const yaw = yaw0 + Math.atan(sx * tv * aspect);
  const pitch = pitch0 - Math.atan(sy * tv);
  return [cam[0] + Math.sin(yaw) * Math.cos(pitch), cam[1] + Math.sin(pitch), cam[2] + Math.cos(yaw) * Math.cos(pitch)];
};

/** a point `dist` in front of the camera that projects to screen NDC (sx right+, sy up+) for vertical `fov` */
export const ndcPoint = (cam: V3, target: V3, fov: number, dist: number, sx: number, sy: number, aspect = 16 / 9): V3 => {
  const tv = Math.tan(((fov / 2) * Math.PI) / 180);
  return inFrontOf(cam, target, dist, sx * dist * tv * aspect, sy * dist * tv);
};

/**
 * Raises renderOrder of every mesh in the subtree, so in-world UI (pop-ups, WordArt) draws after car glass & frost.
 * noDepth also switches depthTest off on the subtree's materials. ONLY use it on components that own per-instance
 * materials (e.g. Popup3D), never on cached/shared ones (ChromeText, toonMat...).
 */
export const OnTop: React.FC<{order?: number; noDepth?: boolean; children: React.ReactNode}> = ({order = 40, noDepth = false, children}) => {
  const ref = React.useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      o.renderOrder = order;
      if (noDepth && (o as THREE.Mesh).isMesh) {
        const m = (o as THREE.Mesh).material;
        (Array.isArray(m) ? m : [m]).forEach((x) => {
          x.depthTest = false;
        });
      }
    });
  });
  return <group ref={ref}>{children}</group>;
};
