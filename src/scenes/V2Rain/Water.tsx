/**
 * Water FX for V2Rain (local, deterministic):
 *   <PuddleSplash time origin dir/>  a car-wheel splash: a fan of streaking droplets thrown sideways + up, gravity, fade.
 *   <Drips time points/>             little drops falling off a soaked character (hair, chin, sleeves), looping.
 * Both are one InstancedMesh of stretched quads (additive, HDR-ish so they catch the sodium light and bloom a bit).
 * Instance matrices are written in useLayoutEffect from props only.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {rand} from '../../lib/time';

type V3 = [number, number, number];

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

const useStreakMesh = (count: number, color: string, intensity: number, opacity = 1, additive = true) => {
  const mesh = useMemo(() => {
    // unit "droplet": a thin diamond quad along +Y (head at y=0, tail at y=-1), double-sided
    const g = new THREE.BufferGeometry();
    const w = 0.5;
    // two crossed diamonds (XY + ZY planes) so a streak never goes edge-on
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0.15, 0, -w, -0.15, 0, w, -0.15, 0, 0, -1, 0,
      0, 0.15, 0, 0, -0.15, -w, 0, -0.15, w, 0, -1, 0,
    ], 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6]);
    const m = new THREE.MeshBasicMaterial({color, transparent: true, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide, fog: false});
    m.color.multiplyScalar(intensity);
    const im = new THREE.InstancedMesh(g, m, count);
    im.frustumCulled = false;
    return im;
  }, [count, color, intensity, opacity, additive]);
  useLayoutEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }, [mesh]);
  return mesh;
};

/** place instance i as a streak from `head` along -vel direction with length len and width wid; scale 0 hides it */
const setStreak = (im: THREE.InstancedMesh, i: number, head: V3, vel: V3, len: number, wid: number, camFacing = true) => {
  _v.set(vel[0], vel[1], vel[2]);
  const sp = _v.length();
  if (len <= 0 || wid <= 0 || sp < 1e-6) {
    _m.makeScale(0, 0, 0);
    im.setMatrixAt(i, _m);
    return;
  }
  _v.multiplyScalar(1 / sp);
  _q.setFromUnitVectors(_up, _v);
  _s.set(wid, len, wid);
  _m.compose(new THREE.Vector3(...head), _q, _s);
  im.setMatrixAt(i, _m);
  void camFacing;
};

export type PuddleSplashProps = {
  /** seconds since the splash started (<0 = nothing) */
  time: number;
  origin: V3;
  /** horizontal throw direction [x, z] (normalised inside) */
  dir: [number, number];
  /** extra spread along the car's travel axis [x, z] */
  along?: [number, number];
  count?: number;
  speed?: number;
  up?: number;
  color?: string;
  intensity?: number;
  seed?: number;
  floorY?: number;
  /** streak length / width multipliers (shorter + fatter = droplets) */
  lenScale?: number;
  widScale?: number;
  opacity?: number;
};

export const PuddleSplash: React.FC<PuddleSplashProps> = ({
  time, origin, dir, along = [0, 1], count = 160, speed = 4.2, up = 3.6, color = '#d4e6ff', intensity = 0.85, seed = 1, floorY = 0,
  lenScale = 1, widScale = 1, opacity = 0.62,
}) => {
  const im = useStreakMesh(count, color, intensity, opacity, false);
  const dl = Math.hypot(dir[0], dir[1]) || 1;
  const dx = dir[0] / dl, dz = dir[1] / dl;
  useLayoutEffect(() => {
    const g = 9.8;
    for (let i = 0; i < count; i++) {
      const r = (k: string) => rand(`spl${seed}|${i}|${k}`);
      const delay = r('d') * 0.18;
      const t = time - delay;
      const life = 0.55 + r('l') * 0.45;
      if (t <= 0 || t > life) {
        setStreak(im, i, [0, -99, 0], [0, 1, 0], 0, 0);
        continue;
      }
      const sp = speed * (0.45 + 0.75 * r('s'));
      const vy0 = up * (0.35 + 0.8 * r('u'));
      const a = (r('a') - 0.5) * 1.2; // fan along travel axis
      const vx = dx * sp + along[0] * a * 2.2;
      const vz = dz * sp + along[1] * a * 2.2;
      const vy = vy0 - g * t;
      let y = origin[1] + vy0 * t - 0.5 * g * t * t;
      if (y < floorY) y = floorY;
      const head: V3 = [origin[0] + vx * t + (r('ox') - 0.5) * 0.3 * along[0], y, origin[2] + vz * t + (r('ox') - 0.5) * 0.6 * along[1]];
      const fade = 1 - t / life;
      const len = (0.1 + 0.18 * r('len')) * (0.5 + Math.hypot(vx, vy, vz) * 0.14) * (0.5 + 0.5 * fade);
      setStreak(im, i, head, [vx, vy, vz], len * lenScale, (0.016 + 0.03 * r('w')) * (0.4 + 0.6 * fade) * widScale, true);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={im} />;
};

export type DripsProps = {
  time: number;
  /** emitter points (in the parent's space) */
  points: V3[];
  /** drops per point per second */
  rate?: number;
  floorY?: number;
  color?: string;
  intensity?: number;
  seed?: number;
};

const PER = 3;
export const Drips: React.FC<DripsProps> = ({time, points, rate = 1.6, floorY = 0, color = '#cfe4ff', intensity = 0.75, seed = 3}) => {
  const n = points.length * PER;
  const im = useStreakMesh(Math.max(1, n), color, intensity, 0.85);
  useLayoutEffect(() => {
    const g = 9.8;
    points.forEach((p, pi) => {
      for (let k = 0; k < PER; k++) {
        const i = pi * PER + k;
        const r = (s: string) => rand(`drip${seed}|${pi}|${k}|${s}`);
        const period = (PER / rate) * (0.8 + 0.4 * r('p'));
        const ph = time / period + r('o') + k / PER;
        const t = (ph - Math.floor(ph)) * period;
        const fallT = Math.sqrt((2 * Math.max(0.05, p[1] - floorY)) / g);
        const hang = 0.12;
        if (t < hang) {
          // drop swelling at the emitter
          setStreak(im, i, [p[0], p[1] - 0.004, p[2]], [0, -1, 0], 0.02 * (t / hang), 0.012);
        } else if (t - hang < fallT) {
          const tt = t - hang;
          const y = p[1] - 0.5 * g * tt * tt;
          setStreak(im, i, [p[0], y, p[2]], [0, -1, 0], Math.min(0.09, 0.02 + g * tt * 0.012), 0.01);
        } else setStreak(im, i, [0, -99, 0], [0, 1, 0], 0, 0);
      }
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={im} />;
};
