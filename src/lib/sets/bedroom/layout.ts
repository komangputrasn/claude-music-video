/**
 * Bedroom layout constants (metres, Bedroom-local space). y=0 floor, room centred on x/z:
 *   x: -2.25 (left wall, door + hammer rack) .. +2.25 (right wall, desk/printer + dresser/TV)
 *   z: -2.00 (back wall, bed + window) .. +2.00 (front wall, removable)        ceiling y = 2.6
 * All spots are [x, y, z] tuples. Furniture faces into the room. See BEDROOM_SPOTS in ../Bedroom.tsx for the public list.
 */
export type V3 = [number, number, number];

export const ROOM = {w: 4.5, d: 4.0, h: 2.6, xMin: -2.25, xMax: 2.25, zMin: -2.0, zMax: 2.0, wallT: 0.12} as const;

/** Window in the back wall (z = -2): centre x, width, sill and top heights. */
export const WIN = {x: 1.15, width: 1.1, sill: 0.92, top: 2.12, depth: 0.12} as const;

/** Door in the left wall (x = -2.25): centre z, width, height. Hinge on the +z side, opens into the room. */
export const DOOR = {z: 1.25, width: 0.86, height: 2.04} as const;

/** Smart bed: centre x, head (headboard face) z, foot z, heights. Hinge = where the head section lifts. */
export const BED = {
  x: -0.6,
  width: 1.5,
  zHead: -1.9,
  zFoot: 0.14,
  baseTop: 0.3,
  mattress: 0.22,
  mattressTop: 0.52,
  hingeZ: -1.04,
  /** max head-section angle (rad) at tilt = 1 */
  maxTilt: (62 * Math.PI) / 180,
} as const;
export const BED_HEAD_LEN = BED.hingeZ - BED.zHead; // 0.86

/** Head-section transform for a given tilt (0..1): pivot at the hinge (top surface), rotation about +X. */
export const bedHeadPose = (tilt: number) => ({
  pivot: [BED.x, BED.mattressTop, BED.hingeZ] as V3,
  rotationX: Math.max(0, Math.min(1, tilt)) * BED.maxTilt,
});

/** Transform a point given in head-section local coords (origin at hinge, -z toward headboard) into room space. */
export const bedHeadPoint = (tilt: number, local: V3): V3 => {
  const {pivot, rotationX: a} = bedHeadPose(tilt);
  const [x, y, z] = local;
  return [pivot[0] + x, pivot[1] + y * Math.cos(a) - z * Math.sin(a), pivot[2] + y * Math.sin(a) + z * Math.cos(a)];
};

/** Pillow centre in head-section local coords. */
export const PILLOW_LOCAL: V3 = [0, 0.075, -0.6];

export const NIGHTSTAND = {x: -1.8, z: -1.72, w: 0.54, d: 0.42, h: 0.56} as const;
export const CLOCK_POS: V3 = [-1.64, NIGHTSTAND.h, -1.66];
export const CLOCK_ROT_Y = 0.32;
export const LAMP_POS: V3 = [-1.93, NIGHTSTAND.h, -1.8];

export const DESK = {x: 1.94, z: 0.14, len: 1.2, depth: 0.62, h: 0.74} as const; // against right wall (middle), faces -x
export const PRINTER_POS: V3 = [1.98, DESK.h, 0.06];
export const PRINTER_ROT_Y = -Math.PI / 2;
export const CHAIR_POS: V3 = [1.2, 0, 0.22];

export const DRESSER = {x: 1.99, z: -1.36, len: 1.1, depth: 0.52, h: 0.82} as const; // right wall, back corner, faces -x
export const TV_POS: V3 = [1.97, DRESSER.h, -1.47];
export const TV_ROT_Y = -Math.PI / 2 + 0.22; // faces the room / bed foot a little
export const LAVA_POS: V3 = [2.03, DRESSER.h, -0.98];

export const DOG_BED: V3 = [-1.7, 0, -0.62];
export const BLOWUP_CHAIR: V3 = [1.7, 0, 1.5];
export const FEEDER: V3 = [0.66, 0, -0.5];
export const RUG = {x: 0.35, z: 0.86, rx: 1.0, rz: 0.72} as const;

/** Hammer rack on the left wall: two pegs (along Z) on a wooden plaque. */
export const HAMMER_RACK = {z: -0.62, y: 1.52, plaqueW: 0.66, pegSpacing: 0.24, pegOut: 0.075} as const;
/** Point on top of the two pegs, midway between them, where a horizontally hung hammer's handle axis rests (axis along Z). */
export const HAMMER_HOOK: V3 = [ROOM.xMin + 0.03 + HAMMER_RACK.pegOut - 0.03, HAMMER_RACK.y + 0.018, HAMMER_RACK.z];

export const POSTER_STAR = {pos: [BED.x, 1.74, ROOM.zMin + 0.006] as V3, w: 0.56, h: 0.76};
export const POSTER_Y2K = {pos: [ROOM.xMax - 0.006, 1.62, DESK.z] as V3, w: 0.6, h: 0.8};

/** Directional light travel direction (unnormalised) per time of day — light enters through the window. */
export const SUN_DIR = {
  night: [-0.34, -0.78, 0.56] as V3,
  dawn: [-0.36, -0.5, 0.86] as V3,
  day: [-0.24, -0.86, 0.5] as V3,
};
