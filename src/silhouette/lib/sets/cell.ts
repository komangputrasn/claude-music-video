/**
 * CellRoom layout constants, anchors, the bed/printer maths and long-lens cameras (pure data; no React).
 * See CellRoom.tsx for the component. Space: CellRoom-local metres, origin = floor centre of the room, +Y up.
 *
 *   x: -1.8 (LEFT wall: door at z +1.15 with its iris lock, hammer slit + two pegs at z -0.9)
 *      +1.8 (RIGHT wall: printer slab at z -0.9)
 *   z: -2.25 (BACK wall: bed head; the blinds' stripes land here)   +2.25 (FRONT wall: the window with vertical blinds,
 *      outside it the access deck at floor level and the city glow far beyond)            ceiling y = 2.7
 *
 *   The bed is centred (x = 0), head at the back wall: the sleeper's head points to -Z (guySleepyWake bed mode).
 *   The window light (city screens) travels -Z into the room: the camera at the window side sees him rise against the
 *   slatted back wall. Walls are 0.2 m thick (the window wall matches guyClimb: sill 1.0 m, outer face 0.25 m ahead of
 *   the climb root, inner face 0.45 m).
 */
import * as THREE from 'three';
import {cameraFovForVisible} from '../palette';
import {clamp01, smooth01} from './shared';
import type {V3} from './shared';

export const CELL = {w: 3.6, d: 4.5, h: 2.7, wall: 0.2, xMin: -1.8, xMax: 1.8, zMin: -2.25, zMax: 2.25} as const;

/** Window in the front wall (opening x0..x1, sill..top), vertical blinds hang at slatZ just inside. */
export const CELL_WINDOW = {x0: -0.85, x1: 0.85, sill: 1.0, top: 2.45, zInner: 2.25, zOuter: 2.45, slatZ: 2.19, slats: 19, slatW: 0.096} as const;

/** Mechanical bed: centred, head at zHead, hinge where the head section lifts (pivot on the mattress top). */
export const CELL_BED = {
  width: 1.0, zHead: -2.2, zFoot: -0.15, plinthTop: 0.28, deckTop: 0.36, top: 0.52, hingeZ: -1.34,
  /** the lifting head section is a NARROW back-board (hidden behind his torso from the front, so his outline reads) */
  headWidth: 0.56,
  /** head-section angle (rad) at tilt 1 — 78°, close to the sleeper's own upright torso so he rides it up */
  maxTilt: 1.36,
} as const;
/** pillow centre in head-section local coords (origin = hinge on the mattress top, -Z toward the headboard) */
export const CELL_PILLOW_LOCAL: V3 = [0, 0.075, -0.6];
export const CELL_PILLOW_SIZE = {w: 0.52, h: 0.15, d: 0.38} as const;

/** Door in the left wall: centre z, width, height; hinge on the +Z jamb, swings INTO the room. */
export const CELL_DOOR = {z: 1.15, width: 0.95, height: 2.15, hingeZ: 1.625, irisY: 1.36, irisRadius: 0.1} as const;
/** Vertical light slit in the left wall; grandpa's hammer rests across it on two pegs. */
export const CELL_SLIT = {z: -0.9, width: 0.1, bottom: 0.35, top: 2.35} as const;
export const CELL_PEGS = {z: -0.9, spacing: 0.24, y: 1.55, out: 0.11, r: 0.014} as const;
/** Printer slab against the right wall (front face at frontX, facing -X), red slit at slitY. */
export const CELL_PRINTER = {z: -0.9, len: 0.62, h: 1.02, depth: 0.42, slitY: 0.84, slitLen: 0.34, frontX: 1.38} as const;
export const CELL_PAGE = {w: 0.21, l: 0.297, droop: 0.16} as const;
/** Ceiling vent (square opening + grille, faint red light deep inside). */
export const CELL_VENT = {x: 0, z: -0.55, size: 0.56} as const;
/** Exterior: deck-access facade (cells every 4.2 m, floors every 3 m), deck depth and parapet. */
export const CELL_FACADE = {pitchX: 4.2, pitchY: 3.0, bays: 4, floorsDown: 3, floorsUp: 4, deck: 2.2, parapet: 1.1} as const;

// ------------------------------------------------------------------------------------------------ bed maths
/** The bed tilt that keeps the mechanism in sync with guySleepyWake(p) (same curve as its "up": smoothstep 0.15..0.5). */
export const cellBedTilt = (p: number) => smooth01((p - 0.15) / 0.35);

/** Head-section transform for tilt 0..1: pivot at the hinge on the mattress top, rotation about +X. */
export const cellBedHead = (tilt: number) => ({
  pivot: [0, CELL_BED.top, CELL_BED.hingeZ] as V3,
  rotationX: clamp01(tilt) * CELL_BED.maxTilt,
});

/** Point given in head-section local coords → CellRoom space. */
export const cellHeadPoint = (tilt: number, local: V3): V3 => {
  const {pivot, rotationX: a} = cellBedHead(tilt);
  const [x, y, z] = local;
  return [pivot[0] + x, pivot[1] + y * Math.cos(a) - z * Math.sin(a), pivot[2] + y * Math.sin(a) + z * Math.cos(a)];
};

/** Pillow anchor for a tilt: centre (CellRoom space) + rotation about X (the pillow's top faces local +Y). */
export const cellPillow = (tilt: number) => ({position: cellHeadPoint(tilt, CELL_PILLOW_LOCAL), rotationX: cellBedHead(tilt).rotationX});

// ------------------------------------------------------------------------------------------------ printer page
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
/**
 * Printer page for a feed 0..1 (fraction of the page out of the slit). Page-local frame (use it for `pageSlot` or a
 * <WorldLyric mode="paint"> printed on it): origin = the PAPER centre (moves with the paper), +Z = the printed face's
 * normal (up), +Y = toward the printer (so text reads upright for someone in the room facing the printer, +X),
 * +X = toward +Z of the room. `out` = exposed length (m). Parts of the paper still inside the slab are hidden by it.
 */
export const cellPrinterPage = (feed: number) => {
  const f = clamp01(feed);
  const out = CELL_PAGE.l * f;
  const droop = CELL_PAGE.droop * f;
  const slit: V3 = [CELL_PRINTER.frontX, CELL_PRINTER.slitY, CELL_PRINTER.z];
  // paper centre sits (out - l/2) out of the slit along the drooping exit direction (-X rotated down about Z)
  const s = out - CELL_PAGE.l / 2;
  const position: V3 = [slit[0] - s * Math.cos(droop), slit[1] - s * Math.sin(droop), slit[2]];
  // basis: X → room +Z, Y → room +X (into the printer), Z → room +Y (normal); then droop about room Z
  _m.makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  _m.premultiply(new THREE.Matrix4().makeRotationZ(droop));
  _e.setFromRotationMatrix(_m);
  return {slit, position, rotation: [_e.x, _e.y, _e.z] as V3, out, droop, size: [CELL_PAGE.w, CELL_PAGE.l] as [number, number]};
};

// ------------------------------------------------------------------------------------------------ blinds
/** Slat centre x positions for the vertical blinds (n slats; traverse 0 = spread, 1 = bunched to both sides). */
export const cellSlatCentres = (traverse: number, n: number = CELL_WINDOW.slats) => {
  const x0 = CELL_WINDOW.x0, x1 = CELL_WINDOW.x1;
  const pitch = (x1 - x0) / n;
  const p2 = pitch * (1 - 0.86 * clamp01(traverse));
  const half = Math.floor(n / 2);
  const out: number[] = [];
  for (let i = 0; i < half; i++) out.push(x0 + p2 * (i + 0.5));
  for (let j = n - half - 1; j >= 0; j--) out.push(x1 - p2 * (j + 0.5));
  return {centres: out, pitch};
};

// ------------------------------------------------------------------------------------------------ anchors
export const CELL_SPOTS = {
  room: {w: CELL.w, d: CELL.d, h: CELL.h},
  /** SilGuy origin in bed mode (NO rotation) with guySleepyWake(p); pair with bedTilt={cellBedTilt(p)} */
  guyInBed: [0, CELL_BED.top, CELL_BED.hingeZ + 0.08] as V3,
  bedHinge: [0, CELL_BED.top, CELL_BED.hingeZ] as V3,
  bed: [0, 0, (CELL_BED.zHead + CELL_BED.zFoot) / 2] as V3,
  /** pillow centre at tilt 0 (use cellPillow(tilt) while the bed moves) */
  pillow: cellPillow(0).position,
  /** sitting on the bed's right edge, feet on the floor, facing +X: rotation-y = guySitOnBedRotY, pose guySitOn(0.52) */
  guySitOnBed: [CELL_BED.width / 2 - 0.12, 0, -0.8] as V3,
  guySitOnBedRotY: Math.PI / 2,
  guyStand: [0.55, 0, 0.55] as V3,
  /** window: centre of the opening on the inner face, sill top (inner edge), a point just outside on the deck */
  window: [0, (CELL_WINDOW.sill + CELL_WINDOW.top) / 2, CELL_WINDOW.zInner] as V3,
  windowSill: [0, CELL_WINDOW.sill, (CELL_WINDOW.zInner + CELL_WINDOW.zOuter) / 2] as V3,
  windowOutside: [0, 0, 3.6] as V3,
  /** guyClimb root on the outside deck, facing -Z (rotation-y π): sill outer face 0.25 m ahead, lands at climbLanding */
  climbRoot: [0, 0, CELL_WINDOW.zOuter + 0.25] as V3,
  climbRotY: Math.PI,
  climbLanding: [0, 0, CELL_WINDOW.zOuter + 0.25 - 0.9] as V3,
  /** door (floor centre of the opening on the inner wall face), standing spot inside, outside beyond it */
  door: [CELL.xMin, 0, CELL_DOOR.z] as V3,
  doorInside: [CELL.xMin + 0.6, 0, CELL_DOOR.z] as V3,
  doorOutside: [CELL.xMin - 1.2, 0, CELL_DOOR.z] as V3,
  /** iris lock centre on the CLOSED door's inner face; faces +X (Iris rotation-y = doorIrisRotY) */
  doorIris: [CELL.xMin + 0.006, CELL_DOOR.irisY, CELL_DOOR.z] as V3,
  doorIrisRotY: Math.PI / 2,
  /** grandpa's hammer: rest point on top of the two pegs (HungHammer origin). Handle along +Z, head toward the door,
   *  claw up, wall on -X — the Y2K <HungHammer position={hammerHook}/> convention (rotation-y = hammerRotY = 0). */
  hammerHook: [CELL.xMin + 0.075, CELL_PEGS.y, CELL_PEGS.z] as V3,
  hammerRotY: 0,
  hammerWallNormal: [1, 0, 0] as V3,
  /** the TERMS props-module <HungSilHammer> convention (origin = WALL SURFACE between the pegs at the pegs' top, wall
   *  normal = its local +Z): <HungSilHammer position={hungHammer} rotation-y={hungHammerRotY} head="left" pegs={false}/>
   *  rests on this room's own pegs (±0.12 m, 0.11 m out), head toward the door (+Z), claw up */
  hungHammer: [CELL.xMin, CELL_PEGS.y, CELL_PEGS.z] as V3,
  hungHammerRotY: Math.PI / 2,
  hammerPegs: [[CELL.xMin + CELL_PEGS.out / 2, CELL_PEGS.y - CELL_PEGS.r, CELL_PEGS.z - CELL_PEGS.spacing / 2],
    [CELL.xMin + CELL_PEGS.out / 2, CELL_PEGS.y - CELL_PEGS.r, CELL_PEGS.z + CELL_PEGS.spacing / 2]] as [V3, V3],
  /** standing in front of the hammer wall, facing it (-X) */
  guyAtHammer: [CELL.xMin + 0.75, 0, CELL_PEGS.z + 0.1] as V3,
  guyAtHammerRotY: -Math.PI / 2,
  slit: [CELL.xMin, (CELL_SLIT.bottom + CELL_SLIT.top) / 2, CELL_SLIT.z] as V3,
  /** printer slab (floor, centre of its footprint), its red slit (front face), facing -X */
  printer: [CELL.xMax - CELL_PRINTER.depth / 2, 0, CELL_PRINTER.z] as V3,
  printerSlit: [CELL_PRINTER.frontX, CELL_PRINTER.slitY, CELL_PRINTER.z] as V3,
  printerRotY: -Math.PI / 2,
  /** standing beside the printer, turned to the slit (profile to a camera on the left) */
  guyAtPrinter: [CELL_PRINTER.frontX - 0.42, 0, CELL_PRINTER.z + 0.72] as V3,
  guyAtPrinterRotY: 2.6,
  /** feeder monolith floor spot (base centre) — its face (+Z of the prop) turned to +X, toward the right side of the room */
  feeder: [-0.35, 0, 0.3] as V3,
  feederRotY: Math.PI / 2,
  /** Pancake BESIDE the monolith (door side), nose ~0.15 m off its front corner, near-profile to the feederWide camera and
   *  turned toward the box, so the 0.85 m box (props <Monolith>) stays bigger than him (he must not stand between it and
   *  the camera). He needs a bright backdrop: the box's red halo / a red LightPool behind him, or the door cracked open */
  pancakeAtFeeder: [0.16, 0, 1.27] as V3,
  pancakeAtFeederRotY: Math.PI + 0.35,
  /** ceiling vent: centre of the grille (just below the ceiling) — the e-reader ash is pulled up into it */
  vent: [CELL_VENT.x, CELL.h - 0.02, CELL_VENT.z] as V3,
};

// ------------------------------------------------------------------------------------------------ cameras
export type CellPiece = 'bed' | 'pillow' | 'blanket' | 'printer' | 'page' | 'door' | 'vent' | 'pegs' | 'slit' | 'blinds' | 'outside' | 'facade' | 'lights';
export type CellWall = 'front' | 'back' | 'left' | 'right' | 'ceiling';
export type CellCamera = {position: V3; target: V3; fov: number; hideWalls?: CellWall[]; hide?: CellPiece[]; note: string};

/** Long-lens framings (fov = CAMERA fov, already corrected for the 2.39:1 letterbox). Spread into <CameraRig/>. */
export const CELL_CAMERAS: Record<string, CellCamera> = {
  /** symmetrical, from outside on the deck, THROUGH the window and the vertical blinds: the bed head and the slatted back
   *  wall centred; he rises into view against the stripes (V1Bedroom) */
  throughBlinds: {position: [0, 1.72, 9.5], target: [0, 1.72, -2.25], fov: cameraFovForVisible(14), note: 'outside → in, symmetrical'},
  /** symmetrical wide of the whole cell (front wall removed): bed centred under the striped back wall */
  wide: {position: [0, 1.45, 9.5], target: [0, 1.15, -1.4], fov: cameraFovForVisible(19.5), hideWalls: ['front'], hide: ['facade', 'outside'], note: 'diorama, front wall off'},
  /** profile at the bed from the right (right wall removed): the sleeper rides the head section up; slit light behind */
  bedProfile: {position: [6.5, 1.0, -1.15], target: [0, 0.98, -1.15], fov: cameraFovForVisible(15), hideWalls: ['right'], hide: ['printer'], note: 'profile, sitting up'},
  /** the feeder wide from floor level (right wall removed): monolith face-on, Pancake beside it in profile, door behind him */
  feederWide: {position: [6.4, 0.3, 0.75], target: [-0.3, 0.62, 0.75], fov: cameraFovForVisible(17), hideWalls: ['right'], hide: ['printer'], note: 'floor level, held'},
  /** the hammer wall: pegs across the vertical light slit (right wall removed) */
  hammerWall: {position: [6.0, 1.5, -0.9], target: [CELL.xMin, 1.45, -0.9], fov: cameraFovForVisible(11), hideWalls: ['right'], hide: ['printer'], note: 'hammer across the slit'},
  /** the block from outside: a grid of identical cells on their access decks, ours in the centre (monumental) */
  windowOutside: {position: [0, 2.6, 46], target: [0, 2.1, 2.45], fov: cameraFovForVisible(17), note: 'facade grid'},
  /** the window from the deck: closer, the parapet in the foreground, the cell window centred */
  windowDeck: {position: [0, 2.1, 15.5], target: [0, 1.75, 2.45], fov: cameraFovForVisible(20), note: 'facade + deck'},
  /** from inside (back wall removed, above the bed) toward the window: blinds black against the city glow; climb-in shot */
  windowInside: {position: [0, 1.32, -8.5], target: [0, 1.45, 2.25], fov: cameraFovForVisible(17), hideWalls: ['back'], note: 'backlit window / climb'},
  /** the printer slab from the left (left wall removed): red slit, page halting out of it */
  printer: {position: [-6.6, 3.5, -0.2], target: [CELL_PRINTER.frontX - 0.3, 1.0, -0.6], fov: cameraFovForVisible(16), hideWalls: ['left', 'ceiling'], hide: ['door'], note: 'printer from above-left'},
};
