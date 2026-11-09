// Pre · shot 2 camera: one continuous move. It starts close and steep over him as he walks up the plaza axis, then
// cranes up and back (accelerating) until he is a speck in a city of lease tags. Pure functions of song time, shared
// by the shot and by the lyric layout (each line is sized/placed for the camera at the time it is sung).
// The framing is anchored on HIM: he stays in the lower part of the picture (HE_ANGLE below the frame centre) while
// the camera rises, so he shrinks to a dot in place and the words fill the upper part of the frame ahead of him.
import {cameraFovForVisible} from '../../lib/palette';
import {GUY} from '../../../lib/characters/Guy';
import {T_CUT} from './timing';

export const VIS_FOV = 22;
export const CAM_FOV = cameraFovForVisible(VIS_FOV);
export const WALK = GUY.strideLength * 0.94; // ≈ 1.07 m/s
export const HE_Z0 = 52;
/** his position on the axis (walking up the axis toward the screen, -Z) */
export const heZ = (t: number) => HE_Z0 - Math.max(0, t - T_CUT) * WALK;

/** [song s, camera distance to the frame-centre ground point (m), depression (deg), his angle below centre (deg)]
 *  distance interpolated in log space */
export const CRANE_KEYS: [number, number, number, number][] = [
  [T_CUT, 27, 33, 6.8],
  [52.42, 32, 35, 6.8],
  [54.6, 78, 40, 6.0],
  [56.68, 235, 49, 4.6],
  [57.2, 430, 53, 3.8],
  [57.75, 760, 57, 3.2],
];

// Catmull-Rom through keys (clamped ends), evaluated per channel; uniform parameter per segment
const cr = (p0: number, p1: number, p2: number, p3: number, u: number) => {
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
};
const channel = (t: number, idx: number, map: (v: number) => number, unmap: (v: number) => number) => {
  const K = CRANE_KEYS;
  if (t <= K[0][0]) return K[0][idx];
  if (t >= K[K.length - 1][0]) return K[K.length - 1][idx];
  let i = 0;
  while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const u = (t - K[i][0]) / (K[i + 1][0] - K[i][0]);
  const v = (j: number) => map(K[Math.max(0, Math.min(K.length - 1, j))][idx]);
  return unmap(cr(v(i - 1), v(i), v(i + 1), v(i + 2), u));
};
const id = (v: number) => v;
const D2R = Math.PI / 180;

export type CraneState = {pos: [number, number, number]; target: [number, number, number]; dist: number; pitch: number};
export const crane = (t: number): CraneState => {
  const dist = channel(t, 1, Math.log, Math.exp);
  const pitch = channel(t, 2, id, id);
  const off = channel(t, 3, id, id);
  const y = dist * Math.sin(pitch * D2R);
  const he = heZ(t);
  // he sits `off` degrees below the frame centre: camera z from his depression angle, target from the pitch
  const camZ = he + y / Math.tan((pitch + off) * D2R);
  const tz = camZ - y / Math.tan(pitch * D2R);
  return {pos: [0, y, camZ], target: [0, 0, tz], dist, pitch};
};
