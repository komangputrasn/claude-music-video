// V1Feeder shared staging: where he stands in the cell for the reading shots, his reading pose, the feeder layout.
import {guyHoldUp, mergePose, GuyPose} from '../../../lib/characters/Guy';
import {CELL_SPOTS} from '../../lib/sets';
import type {V3} from './parts';

/** PAGE / VENT: he stands just past the foot of the bed, turned toward the back-left corner (back three-quarter to the
 *  frontal camera), so the page tilted up toward his face also faces the camera; the vent is above and in front of him. */
export const GUY_SPOT: V3 = [0.55, 0, 0.05];
export const GUY_YAW = -Math.PI / 2 - 0.5;

/** reading: the verified 'read' grip (guyHoldUp(0) + head bowed over the page), breathing only */
export const readPose = (t: number): GuyPose => {
  const br = Math.sin(t * Math.PI * 2 * 0.2);
  return mergePose(guyHoldUp(0, t), {headPitch: 0.55 + 0.012 * br, torsoBend: 0.06 + 0.008 * br, shrug: 0.04 + 0.02 * br});
};

/** the feeder (props Monolith) at the cell's feeder spot, its face toward +X */
export const FEEDER: V3 = CELL_SPOTS.feeder;
export const FEEDER_YAW = CELL_SPOTS.feederRotY;

/** where Pancake lies across the FEEDER → LONELY cut: beside the box, behind its front plane, turned away from it toward the
 *  man (+Z, screen left in both shots). FEEDER ends with him turning around and lying down here; LONELY opens on it. */
export const DOG_LIE: V3 = [-1.2, 0, 1.0];
export const DOG_LIE_YAW = -0.3;
