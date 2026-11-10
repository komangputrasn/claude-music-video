// Pre · shot 2 camera: one continuous move. It opens low and long behind him as he walks out up the plaza axis (the
// whole wet, red-lit plaza ahead of him, rows of tagged masts, bollards and benches), then booms up and back in one calm,
// continuous rise until he is a speck in a city of lease tags. Pure functions of song time, shared by the shot and by
// the lyric layout (each line is sized/placed for the camera at the time it is sung).
// The framing is anchored on HIM: he stays in the lower part of the picture (his angle below the frame centre) while
// the camera rises, so he shrinks to a dot in place and the words fill the upper part of the frame ahead of him.
// Interpolation is a monotone cubic Hermite IN TIME (Fritsch–Carlson tangents), distance in log space: the speed has no
// jumps at the keys and the zoom-out rate (d ln dist / dt) only ever grows gently (≈0.05 → 0.37 → 0.5 → 0.66 /s).
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
 *  distance interpolated in log space. Keys on the line onsets (50.33 cut / 52.42 "How" / 54.60 "in" / 56.68 end of
 *  "anything?") and the chorus slam (57.75, under the full whiteout). */
export const CRANE_KEYS: [number, number, number, number][] = [
  [T_CUT, 45, 16, 6.6],
  [52.42, 50, 21.5, 6.6],
  [54.6, 95, 33, 6.0],
  [56.68, 240, 44.5, 4.6],
  [57.75, 470, 51, 3.6],
];

// monotone cubic Hermite per channel, parameterised by time (non-uniform keys keep a continuous velocity)
const channel = (t: number, idx: number, map: (v: number) => number, unmap: (v: number) => number) => {
  const K = CRANE_KEYS;
  const n = K.length;
  if (t <= K[0][0]) return K[0][idx];
  if (t >= K[n - 1][0]) return K[n - 1][idx];
  const x = K.map((k) => k[0]);
  const y = K.map((k) => map(k[idx]));
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  const m = (i: number) => {
    if (i === 0) return d[0];
    if (i === n - 1) return d[n - 2];
    if (d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * (x[i + 1] - x[i]) + (x[i] - x[i - 1]);
    const w2 = x[i + 1] - x[i] + 2 * (x[i] - x[i - 1]);
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  };
  let i = 0;
  while (i < n - 2 && t > x[i + 1]) i++;
  const h = x[i + 1] - x[i];
  const u = (t - x[i]) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return unmap((2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * h * m(i + 1));
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
