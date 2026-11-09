// TERMS · Outro — the two camera set-ups (house-local metres; the house front is +Z at z = 4) and the sun's track,
// expressed against the wide camera's view of the roof line so the sun crests the house exactly on cue.
import {cameraFovForVisible} from '../../lib/palette';
import {lerp} from '../../../lib/time';
import {T_CUT, T1, smooth, span, sunOverRoof} from './timing';

export type V3 = [number, number, number];
const deg = Math.PI / 180;

/** a target that makes the camera look along −Z with a pitch (deg, + = up) */
export const pitchTarget = (cam: V3, pitchDeg: number): V3 => [cam[0], cam[1] + Math.tan(pitchDeg * deg) * 100, cam[2] - 100];

// O1 · the static wide: roof line ~y 331, horizon ~y 693, cube base ~y 739 of the 1080 frame (visible band 138–942)
export const CAM_A: V3 = [0, 0.9, 60];
export const VIS_A = 16;
export const PITCH_A = 3.06;
export const FOV_A = cameraFovForVisible(VIS_A);

// O2 · the last image: low, symmetrical, a slow creep in (19.5 → 17.6 m) on the doorway + the iris; the cube fills the
// middle of the frame like a black slab with the dawn at both sides, its roof far out of frame
export const VIS_B = 19;
export const PITCH_B = 4.8;
export const FOV_B = cameraFovForVisible(VIS_B);
export const camB = (t: number): V3 => [0, 0.75, lerp(19.5, 17.6, smooth(span(t, T_CUT, T1)))];

/** elevation (deg) of the cube's roof line (front parapet edge, y 8, z 4.08) seen from the wide camera */
export const ROOF_ELEV_A = Math.atan((8 - CAM_A[1]) / (CAM_A[2] - 4.08)) / deg;
/** the sun's elevation (deg above the horizon) at song time t: dead centre behind the house, cresting its roof */
export const sunElev = (t: number) => ROOF_ELEV_A + sunOverRoof(t) + 0.06 * Math.max(0, t - T_CUT);
