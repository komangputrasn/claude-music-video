// TERMS · Final — framing helpers: place things at a given position inside the VISIBLE (letterboxed 2.39:1) picture.
import * as THREE from 'three';
import {cameraFovForVisible} from '../../lib/palette';

export type V3 = [number, number, number];

/**
 * World point on the camera ray through visible-picture coords (vx, vy ∈ [−1, 1]: −1 = left/bottom edge of the
 * letterboxed picture, +1 = right/top edge), at view-axis depth `depth` (m). Use it to anchor text inside the frame.
 */
export const screenPoint = (cam: V3, target: V3, visFovDeg: number, vx: number, vy: number, depth: number): V3 => {
  const c = new THREE.Vector3(...cam);
  const f = new THREE.Vector3(...target).sub(c).normalize();
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
  const u = new THREE.Vector3().crossVectors(r, f).normalize();
  const th = Math.tan((visFovDeg * Math.PI) / 360);
  const tw = Math.tan((cameraFovForVisible(visFovDeg) * Math.PI) / 360) * (16 / 9);
  const p = c.clone().addScaledVector(f, depth).addScaledVector(r, vx * tw * depth).addScaledVector(u, vy * th * depth);
  return [p.x, p.y, p.z];
};

/** a target point that makes the camera look along azimuth −Z with a given pitch (deg, negative = down) */
export const pitchTarget = (cam: V3, pitchDeg: number, yawDeg = 0, dist = 100): V3 => {
  const p = (pitchDeg * Math.PI) / 180;
  const y = (yawDeg * Math.PI) / 180;
  return [cam[0] + Math.sin(y) * Math.cos(p) * dist, cam[1] + Math.sin(p) * dist, cam[2] - Math.cos(y) * Math.cos(p) * dist];
};

/** world size (m) of `px` pixels (of the 1080 frame) at depth d for a VISIBLE fov */
export const pxToM = (px: number, d: number, visFovDeg: number) =>
  (px * 2 * d * Math.tan((cameraFovForVisible(visFovDeg) * Math.PI) / 360)) / 1080;
