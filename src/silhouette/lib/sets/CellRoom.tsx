/**
 * <CellRoom> — the 3:15 AM bedroom as a cell (V1Bedroom, V1Feeder, V2Rain, Swing, Hold). DESIGN-silhouette §4.
 * A narrow bare board-formed concrete room (3.6 w × 4.5 d × 2.7 h, walls 0.2 m), lit by ONE window with vertical
 * blinds: the city's screen glow outside is the key light, thrown into the room as crisp slatted stripes (a per-pixel
 * projective cookie, see cellLight.ts) — optionally with a red scan band sliding through the slats.
 *
 *   <CellRoom time={t}
 *     bedTilt?={0}            0..1 mechanical head section lifts the sleeper upright (78° at 1). Sync with guySleepyWake(p):
 *                             bedTilt={cellBedTilt(p)} and <SilGuy position={CELL_SPOTS.guyInBed} pose={guySleepyWake(p)}/>
 *     bedActive?={0}          0..1 red mechanism strips on the plinth + rams (TENURE runs the bed) — light it while lifting
 *     pillow?={true}          built-in dark pillow; false to place your own (PillowIris) at the pillow anchor
 *     pillowSlot?={node}      rendered AT the pillow centre in head-section space (rides the tilt). Local +Y = pillow top.
 *     blanket?={true}
 *     blinds?={{angle: 0.62, traverse: 0}}   angle 0 = closed flat … 1 = edge-on open; traverse 1 = bunched to the sides
 *     windowLight?={{intensity: 1, color: S.bone, dir: [0,-0.06,-1], scan: null|0..1, scanColor: S.authRed,
 *                    scanIntensity: 1.6, scanWidth: 0.16, softness: 0.006}}
 *                             the cookie key light. scan 0..1 slides a red band across the window (left → right).
 *     outside?={true | {intensity: 0.8, iris: false}}   the city screen glow far beyond the window (card at z +60)
 *     facade?={true}          exterior: deck-access block facade around the window (other cells' blinds), access decks
 *     printerFeed?={0}        0..1 pale page out of the red slit (halt it at ~0.5)
 *     printerError?={0}       0..1 slit blinks hard (PAYMENT DECLINED)
 *     printerGlow?={1}        red slit intensity multiplier
 *     pageSlot?={node}        rendered in the page's paper frame (see cellPrinterPage: +Z = printed face, +Y = into printer)
 *     doorOpen?={0}           0..1 door swings into the room (hinge on the +Z jamb), corridor glow beyond
 *     doorIris?={{…IrisProps}|false}  props passed to the <Iris> lock on the door (radius 0.1 default; time = `time`)
 *     doorLeak?={0.6}         thin line of corridor light under the door
 *     slit?={1}               vertical light slit behind grandpa's hammer pegs (0 = dark)
 *     vent?={0.6}             faint red light deep in the ceiling vent
 *     practicals?={1}         master multiplier for every built-in light (0 = all off; scenes light it themselves)
 *     ambient?={0.06}         self-lit concrete (so black corners still read as surfaces)
 *     hideWalls?={[]}         'front'|'back'|'left'|'right'|'ceiling' for cameras outside the room
 *     hide?={[]}              CellPiece names: bed pillow blanket printer page door vent pegs slit blinds outside facade lights
 *     {...group}>{cast}</CellRoom>
 *
 * Origin: floor centre of the room. Bed head at the back wall (-Z), window in the front wall (+Z), door + hammer on the
 * left wall (-X), printer on the right (+X). Anchors: CELL_SPOTS; cameras: CELL_CAMERAS (both in ./cell.ts).
 * Practical lights (constant count = 5 point lights, so toggling never recompiles shaders): window fill, vent (red),
 * printer slit (red), door iris (red), hammer slit (bone). Characters stay pure silhouettes (the cookie never touches
 * them). Pure function of props: pass `time` (seconds) for the blink/iris; nothing animates on its own.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {S, hdr} from '../palette';
import {Iris, IrisProps} from '../Iris';
import {
  concreteTex, floorTex, blindsTex, glowTex, columnGlowTex, stencilTex, wboxMinMax, mergeBoxes, flatMat, hash01,
  clamp01, prng, WALL_TILE, FLOOR_TILE,
} from './shared';
import type {GroupProps, V3} from './shared';
import {cellMaterial, makeCellUniforms, setCellUniforms} from './cellLight';
import {
  CELL, CELL_WINDOW, CELL_BED, CELL_PILLOW_LOCAL, CELL_PILLOW_SIZE, CELL_DOOR, CELL_SLIT, CELL_PEGS, CELL_PRINTER,
  CELL_PAGE, CELL_VENT, CELL_FACADE, cellBedHead, cellPrinterPage, cellSlatCentres,
} from './cell';
import type {CellPiece, CellWall} from './cell';

export type CellRoomProps = GroupProps & {
  time?: number;
  bedTilt?: number;
  bedActive?: number;
  pillow?: boolean;
  pillowSlot?: React.ReactNode;
  blanket?: boolean;
  blinds?: {angle?: number; traverse?: number};
  windowLight?: {
    intensity?: number; color?: string; dir?: V3; scan?: number | null; scanColor?: string; scanIntensity?: number;
    scanWidth?: number; softness?: number;
  };
  outside?: boolean | {intensity?: number; iris?: boolean};
  facade?: boolean;
  printerFeed?: number;
  printerError?: number;
  printerGlow?: number;
  pageSlot?: React.ReactNode;
  doorOpen?: number;
  doorIris?: Partial<IrisProps> | false;
  doorLeak?: number;
  slit?: number;
  vent?: number;
  practicals?: number;
  ambient?: number;
  hideWalls?: CellWall[];
  hide?: CellPiece[];
  children?: React.ReactNode;
};

const W = CELL_WINDOW;
const DOOR_TEXT = 'CELL 0315 · LEASE 0315-77';
const WALL_TEXT = 'UNIT 0315';
const WALL_FONT = {font: 'futura' as const, weight: 500, tracking: 0.35};
const T = CELL.wall;

// ------------------------------------------------------------------------------------------------ static geometry
/** Reorder an indexed geometry's triangles into two material groups: 0 = the rest, 1 = triangles matching `pred`. */
const splitFaces = (g: THREE.BufferGeometry, pred: (n: THREE.Vector3, c: THREE.Vector3) => boolean) => {
  const idx = g.index!;
  const pos = g.attributes.position as THREE.BufferAttribute, nrm = g.attributes.normal as THREE.BufferAttribute;
  const a: number[] = [], b: number[] = [];
  const n = new THREE.Vector3(), c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    const i0 = idx.getX(i), i1 = idx.getX(i + 1), i2 = idx.getX(i + 2);
    n.fromBufferAttribute(nrm, i0);
    c.fromBufferAttribute(pos, i0).add(v.fromBufferAttribute(pos, i1)).add(v.fromBufferAttribute(pos, i2)).multiplyScalar(1 / 3);
    (pred(n, c) ? b : a).push(i0, i1, i2);
  }
  g.setIndex([...a, ...b]);
  g.clearGroups();
  g.addGroup(0, a.length, 0);
  g.addGroup(a.length, b.length, 1);
  return g;
};

type CellGeo = Record<CellWall | 'floor' | 'facade' | 'deck' | 'printer' | 'bedBase' | 'bedHead' | 'blanket' | 'ventDuct', THREE.BufferGeometry>;
let _geo: CellGeo | null = null;
const cellGeometry = (): CellGeo => {
  if (_geo) return _geo;
  const x0 = CELL.xMin, x1 = CELL.xMax, z0 = CELL.zMin, z1 = CELL.zMax, H = CELL.h;
  const tile = WALL_TILE;
  // the front wall's OUTER face (group 1) is drawn with the facade material, so it matches the block facade around it
  const front = splitFaces(mergeBoxes([
    wboxMinMax([x0 - T, -0.2, z1], [W.x0, H + T, z1 + T], tile),
    wboxMinMax([W.x1, -0.2, z1], [x1 + T, H + T, z1 + T], tile),
    wboxMinMax([W.x0, -0.2, z1], [W.x1, W.sill, z1 + T], tile),
    wboxMinMax([W.x0, W.top, z1], [W.x1, H + T, z1 + T], tile),
  ]), (n, c) => n.z > 0.5 && c.z > z1 + T - 0.01);
  const back = wboxMinMax([x0 - T, -0.2, z0 - T], [x1 + T, H + T, z0], tile);
  const dz0 = CELL_DOOR.z - CELL_DOOR.width / 2, dz1 = CELL_DOOR.z + CELL_DOOR.width / 2;
  const sz0 = CELL_SLIT.z - CELL_SLIT.width / 2, sz1 = CELL_SLIT.z + CELL_SLIT.width / 2;
  const left = mergeBoxes([
    wboxMinMax([x0 - T, -0.2, z0], [x0, H + T, sz0], tile),
    wboxMinMax([x0 - T, -0.2, sz0], [x0, CELL_SLIT.bottom, sz1], tile),
    wboxMinMax([x0 - T, CELL_SLIT.top, sz0], [x0, H + T, sz1], tile),
    wboxMinMax([x0 - T, -0.2, sz1], [x0, H + T, dz0], tile),
    wboxMinMax([x0 - T, CELL_DOOR.height, dz0], [x0, H + T, dz1], tile),
    wboxMinMax([x0 - T, -0.2, dz1], [x0, H + T, z1], tile),
  ]);
  const right = wboxMinMax([x1, -0.2, z0], [x1 + T, H + T, z1], tile);
  const vs = CELL_VENT.size / 2;
  const ceiling = mergeBoxes([
    wboxMinMax([x0, H, z0], [x1, H + T, CELL_VENT.z - vs], tile),
    wboxMinMax([x0, H, CELL_VENT.z + vs], [x1, H + T, z1], tile),
    wboxMinMax([x0, H, CELL_VENT.z - vs], [CELL_VENT.x - vs, H + T, CELL_VENT.z + vs], tile),
    wboxMinMax([CELL_VENT.x + vs, H, CELL_VENT.z - vs], [x1, H + T, CELL_VENT.z + vs], tile),
  ]);
  const ventDuct = mergeBoxes([
    wboxMinMax([CELL_VENT.x - vs - 0.03, H + T, CELL_VENT.z - vs - 0.03], [CELL_VENT.x + vs + 0.03, H + T + 0.5, CELL_VENT.z - vs], 1),
    wboxMinMax([CELL_VENT.x - vs - 0.03, H + T, CELL_VENT.z + vs], [CELL_VENT.x + vs + 0.03, H + T + 0.5, CELL_VENT.z + vs + 0.03], 1),
    wboxMinMax([CELL_VENT.x - vs - 0.03, H + T, CELL_VENT.z - vs], [CELL_VENT.x - vs, H + T + 0.5, CELL_VENT.z + vs], 1),
    wboxMinMax([CELL_VENT.x + vs, H + T, CELL_VENT.z - vs], [CELL_VENT.x + vs + 0.03, H + T + 0.5, CELL_VENT.z + vs], 1),
    wboxMinMax([CELL_VENT.x - vs - 0.03, H + T + 0.5, CELL_VENT.z - vs - 0.03], [CELL_VENT.x + vs + 0.03, H + T + 0.53, CELL_VENT.z + vs + 0.03], 1),
    // grille bars
    ...Array.from({length: 9}, (_, i) => {
      const x = CELL_VENT.x - vs + ((i + 0.5) / 9) * CELL_VENT.size;
      return wboxMinMax([x - 0.009, H - 0.035, CELL_VENT.z - vs], [x + 0.009, H, CELL_VENT.z + vs], 1);
    }),
    // grille frame
    wboxMinMax([CELL_VENT.x - vs - 0.04, H - 0.04, CELL_VENT.z - vs - 0.04], [CELL_VENT.x + vs + 0.04, H, CELL_VENT.z - vs], 1),
    wboxMinMax([CELL_VENT.x - vs - 0.04, H - 0.04, CELL_VENT.z + vs], [CELL_VENT.x + vs + 0.04, H, CELL_VENT.z + vs + 0.04], 1),
  ]);
  const floor = wboxMinMax([x0 - T, -0.2, z0 - T], [x1 + T, 0, z1], FLOOR_TILE);

  // exterior deck-access facade around the window (front face flush with the cell's outer face z1 + T)
  const F = CELL_FACADE;
  const fx0 = -F.pitchX * (F.bays + 0.5), fx1 = F.pitchX * (F.bays + 0.5);
  const zf0 = z1, zf1 = z1 + T;
  const facade: THREE.BufferGeometry[] = [];
  const deck: THREE.BufferGeometry[] = [];
  for (let k = -F.floorsDown; k <= F.floorsUp; k++) {
    const y = k * F.pitchY;
    const xs: [number, number][] = k === 0 ? [[fx0, x0 - T], [x1 + T, fx1]] : [[fx0, fx1]];
    for (const [a, b] of xs) {
      facade.push(wboxMinMax([a, y - 0.3, zf0], [b, y + W.sill, zf1], tile));
      facade.push(wboxMinMax([a, y + W.top, zf0], [b, y + F.pitchY - 0.3, zf1], tile));
    }
    for (let i = -F.bays - 1; i <= F.bays; i++) {
      const pa = i * F.pitchX + W.x1, pb = (i + 1) * F.pitchX + W.x0;
      const ca = Math.max(pa, fx0), cb = Math.min(pb, fx1);
      if (cb <= ca) continue;
      if (k === 0 && cb > x0 - T && ca < x1 + T) {
        // the cell's own front wall covers [x0 - T, x1 + T] at this floor
        if (ca < x0 - T) facade.push(wboxMinMax([ca, y + W.sill, zf0], [x0 - T, y + W.top, zf1], tile));
        if (cb > x1 + T) facade.push(wboxMinMax([x1 + T, y + W.sill, zf0], [cb, y + W.top, zf1], tile));
        continue;
      }
      facade.push(wboxMinMax([ca, y + W.sill, zf0], [cb, y + W.top, zf1], tile));
    }
    // access deck slab + parapet upstand (deck top at the floor level y)
    deck.push(wboxMinMax([fx0, y - 0.3, zf1], [fx1, y, zf1 + F.deck], FLOOR_TILE * 2));
    deck.push(wboxMinMax([fx0, y, zf1 + F.deck - 0.2], [fx1, y + F.parapet, zf1 + F.deck], tile));
  }
  // cross walls between the decks every two bays (brutalist fins)
  for (let i = -F.bays; i <= F.bays; i += 2) {
    const x = i * F.pitchX + F.pitchX / 2;
    if (Math.abs(x) < 3) continue;
    deck.push(wboxMinMax([x - 0.15, -F.floorsDown * F.pitchY - 0.3, zf1], [x + 0.15, (F.floorsUp + 1) * F.pitchY, zf1 + F.deck], tile));
  }

  // printer slab (against the right wall; front face at frontX)
  const P = CELL_PRINTER;
  const printer = mergeBoxes([
    wboxMinMax([P.frontX, 0, P.z - P.len / 2], [x1, P.slitY - 0.012, P.z + P.len / 2], 1.2),
    wboxMinMax([P.frontX, P.slitY + 0.012, P.z - P.len / 2], [x1, P.h, P.z + P.len / 2], 1.2),
    wboxMinMax([P.frontX, P.slitY - 0.012, P.z - P.len / 2], [x1, P.slitY + 0.012, P.z - P.slitLen / 2], 1.2),
    wboxMinMax([P.frontX, P.slitY - 0.012, P.z + P.slitLen / 2], [x1, P.slitY + 0.012, P.z + P.len / 2], 1.2),
    wboxMinMax([P.frontX + 0.06, P.slitY - 0.012, P.z - P.slitLen / 2], [x1, P.slitY + 0.012, P.z + P.slitLen / 2], 1.2),
  ]);

  // bed: concrete plinth + steel deck + foot mattress (static), head section (local to the hinge)
  const B = CELL_BED;
  const hw = B.width / 2;
  const bedBase = mergeBoxes([
    wboxMinMax([-hw + 0.08, 0, B.zHead + 0.1], [hw - 0.08, B.plinthTop, B.zFoot - 0.1], 1.2),
    wboxMinMax([-hw, B.plinthTop, B.hingeZ + 0.01], [hw, B.deckTop, B.zFoot], 1.2),
    wboxMinMax([-hw + 0.02, B.deckTop, B.hingeZ + 0.015], [hw - 0.02, B.top, B.zFoot - 0.01], 1.2),
    // headboard plate against the back wall
    wboxMinMax([-hw - 0.08, 0, CELL.zMin], [hw + 0.08, 0.72, B.zHead + 0.01], 1.2),
  ]);
  const L = B.hingeZ - B.zHead;
  const hh = B.headWidth / 2;
  const bedHead = mergeBoxes([
    wboxMinMax([-hh, -(B.top - B.plinthTop), -L + 0.01], [hh, -(B.top - B.deckTop), 0], 1.2),
    wboxMinMax([-hh + 0.02, -(B.top - B.deckTop), -L + 0.02], [hh - 0.02, 0, -0.005], 1.2),
    // side rails of the fixed frame where the narrow back-board lies (keeps the bed outline full-width when flat)
    wboxMinMax([-hw, -(B.top - B.plinthTop), -0.06], [-hh - 0.01, -(B.top - B.deckTop), 0], 1.2),
    wboxMinMax([hh + 0.01, -(B.top - B.plinthTop), -0.06], [hw, -(B.top - B.deckTop), 0], 1.2),
  ]);
  // fixed side mattress strips either side of the back-board (head end), so the flat bed reads as one mattress
  const sideStrips = [
    wboxMinMax([-hw, B.plinthTop, B.zHead], [-hh - 0.015, B.deckTop, B.hingeZ], 1.2),
    wboxMinMax([hh + 0.015, B.plinthTop, B.zHead], [hw, B.deckTop, B.hingeZ], 1.2),
    wboxMinMax([-hw + 0.02, B.deckTop, B.zHead + 0.01], [-hh - 0.02, B.top - 0.02, B.hingeZ], 1.2),
    wboxMinMax([hh + 0.02, B.deckTop, B.zHead + 0.01], [hw - 0.02, B.top - 0.02, B.hingeZ], 1.2),
  ];
  const blanket = mergeBoxes([
    wboxMinMax([-hw - 0.03, B.top, B.hingeZ + 0.03], [hw + 0.03, B.top + 0.07, B.zFoot + 0.03], 1.2),
    wboxMinMax([-hw - 0.05, B.deckTop - 0.06, B.hingeZ + 0.03], [-hw - 0.01, B.top + 0.07, B.zFoot + 0.03], 1.2),
    wboxMinMax([hw + 0.01, B.deckTop - 0.06, B.hingeZ + 0.03], [hw + 0.05, B.top + 0.07, B.zFoot + 0.03], 1.2),
    wboxMinMax([-hw - 0.05, B.deckTop - 0.06, B.zFoot + 0.01], [hw + 0.05, B.top + 0.07, B.zFoot + 0.05], 1.2),
  ]);
  const bedBaseAll = mergeBoxes([bedBase, ...sideStrips]);
  _geo = {front, back, left, right, ceiling, floor, facade: mergeBoxes(facade), deck: mergeBoxes(deck), printer, bedBase: bedBaseAll, bedHead, blanket, ventDuct};
  return _geo;
};

let _pillowGeo: THREE.BufferGeometry | null = null;
const pillowGeo = () => {
  if (_pillowGeo) return _pillowGeo;
  const {w, h, d} = CELL_PILLOW_SIZE;
  let g: THREE.BufferGeometry = new THREE.BoxGeometry(w, h, d, 12, 3, 8);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = x / (w / 2), nz = z / (d / 2);
    const puff = (1 - Math.pow(Math.abs(nx), 3)) * (1 - Math.pow(Math.abs(nz), 3));
    p.setY(i, y * (0.3 + 0.7 * puff));
  }
  g.computeVertexNormals();
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) / 1.2;
    uv[i * 2 + 1] = p.getZ(i) / 1.2;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  _pillowGeo = g;
  return g;
};

// ------------------------------------------------------------------------------------------------ the city glow card
const cityCache = new Map<string, THREE.CanvasTexture>();
const cityTex = (iris: boolean) => {
  const key = iris ? 'iris' : 'plain';
  const hit = cityCache.get(key);
  if (hit) return hit;
  const Wc = 2048, Hc = 800;
  const c = document.createElement('canvas');
  c.width = Wc;
  c.height = Hc;
  const g = c.getContext('2d')!;
  const r = prng(41);
  // night sky lit from below by the screens: dark top → luminous haze band → dim street haze
  const gr = g.createLinearGradient(0, 0, 0, Hc);
  gr.addColorStop(0, '#16181c');
  gr.addColorStop(0.35, '#55595f');
  gr.addColorStop(0.6, '#b4b6b8');
  gr.addColorStop(0.78, '#8e9297');
  gr.addColorStop(1, '#3d4046');
  g.fillStyle = gr;
  g.fillRect(0, 0, Wc, Hc);
  const block = (x: number, w: number, top: number, col: string, lit: number) => {
    g.fillStyle = col;
    g.fillRect(x, top, w, Hc - top);
    // recessed window grid (barely lighter) + sparse lit panes
    for (let wy = top + 10; wy < Hc - 8; wy += 12) {
      for (let wx = x + 6; wx < x + w - 6; wx += 10) {
        const v = r();
        if (v < lit) {
          g.fillStyle = `rgba(233,230,223,${0.35 + r() * 0.5})`;
          g.fillRect(wx, wy, 4, 5);
        }
      }
    }
  };
  // far layer (fogged into the haze)
  for (let x = -40; x < Wc; ) {
    const w = 50 + r() * 120;
    block(x, w, Hc * (0.25 + r() * 0.3), '#7b7f85', 0.03);
    x += w + 6 + r() * 20;
  }
  // mid layer
  for (let x = -60; x < Wc; ) {
    const w = 90 + r() * 170;
    block(x, w, Hc * (0.18 + r() * 0.34), '#4a4e54', 0.025);
    x += w + 20 + r() * 60;
  }
  // near layer: black monoliths
  for (let x = -80; x < Wc; ) {
    const w = 140 + r() * 240;
    block(x, w, Hc * (0.1 + r() * 0.35), '#1d2024', 0.012);
    x += w + 80 + r() * 160;
  }
  // monumental screens (bone) — the actual light source of the cell
  const screens: [number, number, number, number][] = [[0.14, 0.22, 0.11, 0.28], [0.44, 0.12, 0.17, 0.36], [0.76, 0.27, 0.1, 0.24]];
  for (const [sx, sy, sw, sh] of screens) {
    const x = sx * Wc, y = sy * Hc, w = sw * Wc, h = sh * Hc;
    const halo = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 1.3);
    halo.addColorStop(0, 'rgba(236,234,228,0.6)');
    halo.addColorStop(1, 'rgba(236,234,228,0)');
    g.fillStyle = halo;
    g.fillRect(x - w * 1.5, y - h * 1.5, w * 4, h * 4);
    g.fillStyle = '#0c0d10';
    g.fillRect(x - 6, y - 6, w + 12, h + 12);
    g.fillStyle = '#f4f2ec';
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(20,20,22,0.45)';
    g.fillRect(x + w * 0.1, y + h * 0.18, w * 0.8, h * 0.07);
    for (let k = 0; k < 6; k++) g.fillRect(x + w * 0.1, y + h * (0.42 + k * 0.08), w * (0.45 + r() * 0.35), h * 0.025);
  }
  if (iris) {
    const [sx, sy, sw, sh] = screens[1];
    const cx = (sx + sw / 2) * Wc, cy = (sy + sh * 0.3) * Hc, R = sh * Hc * 0.16;
    g.fillStyle = '#07080a';
    g.beginPath(); g.arc(cx, cy, R * 1.15, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ff2a1f';
    g.lineWidth = R * 0.12;
    g.beginPath(); g.arc(cx, cy, R * 0.9, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ff2a1f';
    g.beginPath(); g.arc(cx, cy, R * 0.3, 0, Math.PI * 2); g.fill();
  }
  // street-level haze
  const hz = g.createLinearGradient(0, Hc * 0.72, 0, Hc);
  hz.addColorStop(0, 'rgba(150,153,158,0)');
  hz.addColorStop(1, 'rgba(150,153,158,0.5)');
  g.fillStyle = hz;
  g.fillRect(0, Hc * 0.72, Wc, Hc * 0.28);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cityCache.set(key, t);
  return t;
};

// ------------------------------------------------------------------------------------------------ component
const SLAT_GEO = new THREE.BoxGeometry(1, 1, 1);
const PEG_GEO = new THREE.CylinderGeometry(CELL_PEGS.r, CELL_PEGS.r, CELL_PEGS.out, 12).rotateZ(Math.PI / 2);
const RAM_OUT = new THREE.CylinderGeometry(0.035, 0.035, 1, 12);
const RAM_ROD = new THREE.CylinderGeometry(0.018, 0.018, 1, 10);
const AXLE = new THREE.CylinderGeometry(0.03, 0.03, CELL_BED.width + 0.04, 12).rotateZ(Math.PI / 2);
const PLANE = new THREE.PlaneGeometry(1, 1);

const Ram: React.FC<{a: THREE.Vector3; b: THREE.Vector3; mat: THREE.Material; rod: THREE.Material}> = ({a, b, mat, rod}) => {
  const dir = b.clone().sub(a);
  const len = Math.max(0.001, dir.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return (
    <group position={a} quaternion={q}>
      <mesh geometry={RAM_OUT} material={mat} position={[0, 0.2, 0]} scale={[1, 0.4, 1]} />
      <mesh geometry={RAM_ROD} material={rod} position={[0, len / 2, 0]} scale={[1, len, 1]} />
    </group>
  );
};

export const CellRoom: React.FC<CellRoomProps> = ({
  time = 0, bedTilt = 0, bedActive = 0, pillow = true, pillowSlot, blanket = true, blinds, windowLight, outside = true,
  facade = true, printerFeed = 0, printerError = 0, printerGlow = 1, pageSlot, doorOpen = 0, doorIris = {}, doorLeak = 0.6,
  slit = 1, vent = 0.6, practicals = 1, ambient = 0.06, hideWalls = [], hide = [], children, ...group
}) => {
  const ref = useRef<THREE.Group>(null);
  const G = cellGeometry();
  const has = (p: CellPiece) => !hide.includes(p);
  const wallOn = (w: CellWall) => !hideWalls.includes(w);

  // ---- materials (one set per room; all share the cookie uniforms)
  const U = useMemo(() => makeCellUniforms(), []);
  const M = useMemo(() => {
    const ct = concreteTex(), ft = floorTex();
    const em = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);
    const mk = (color: string, map: THREE.Texture | null, rough: number, mode: 'room' | 'slat' | 'outside' = 'room') =>
      cellMaterial({color, map, roughness: rough, metalness: 0, emissive: em(color, 1), emissiveMap: map}, U, mode);
    return {
      wall: mk('#9a9ea4', ct, 0.93),
      floor: mk('#8a8e94', ft, 0.78),
      ceiling: mk('#7c8086', ct, 0.95),
      bed: mk('#3d4045', ct, 0.7),
      mattress: mk('#4a4d52', null, 0.95),
      blanket: mk('#3a3d42', null, 0.97),
      pillow: mk('#55585e', null, 0.97),
      printer: mk('#33363b', ct, 0.6),
      door: mk('#45484d', ct, 0.55),
      stencilDoor: cellMaterial({color: '#c9c6bf', map: stencilTex(DOOR_TEXT, {font: 'mono'}).tex, roughness: 0.9, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}, U, 'room'),
      stencilWall: cellMaterial({color: '#c9c6bf', map: stencilTex(WALL_TEXT, WALL_FONT).tex, roughness: 0.9, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}, U, 'room'),
      stencilOut: cellMaterial({color: '#5e5b56', map: stencilTex(WALL_TEXT, WALL_FONT).tex, roughness: 0.9, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}, U, 'outside'),
      slat: mk('#3a3d42', null, 0.8, 'slat'),
      facade: mk('#6a6e74', ct, 0.93, 'outside'),
      deck: mk('#5c6066', ct, 0.93, 'outside'),
    };
  }, [U]);
  useLayoutEffect(() => () => Object.values(M).forEach((m) => m.dispose()), [M]);

  // ---- instanced slats
  const slatMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(SLAT_GEO, M.slat, W.slats);
    m.frustumCulled = false;
    return m;
  }, [M.slat]);
  // ---- other cells' windows (instanced quads with the blinds texture)
  const panes = useMemo(() => {
    const F = CELL_FACADE;
    const list: {x: number; y: number; c: number}[] = [];
    for (let k = -F.floorsDown; k <= F.floorsUp; k++) {
      for (let i = -F.bays; i <= F.bays; i++) {
        if (k === 0 && i === 0) continue;
        const h = hash01(i + 50, k + 50, 3);
        list.push({x: i * F.pitchX, y: k * F.pitchY + (W.sill + W.top) / 2, c: h < 0.12 ? 0.32 + 0.2 * hash01(i, k, 9) : 0.035 + 0.06 * hash01(i, k, 5)});
      }
    }
    const mat = new THREE.MeshBasicMaterial({map: blindsTex(), color: '#ffffff', side: THREE.DoubleSide});
    const m = new THREE.InstancedMesh(PLANE, mat, list.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    list.forEach((p, i) => {
      o.position.set(p.x, p.y, W.zInner + 0.004);
      o.scale.set(W.x1 - W.x0, W.top - W.sill, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(S.bone).multiplyScalar(p.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return m;
  }, []);
  useLayoutEffect(() => () => {
    (panes.material as THREE.Material).dispose();
    panes.dispose();
    slatMesh.dispose();
  }, [panes, slatMesh]);

  // ---- derived state
  const bl = {angle: 0.62, traverse: 0, ...(blinds ?? {})};
  const wl = {
    intensity: 1, color: S.bone, dir: [0, -0.06, -1] as V3, scan: null as number | null, scanColor: S.authRed, scanIntensity: 1.6,
    scanWidth: 0.16, softness: 0.006, ...(windowLight ?? {}),
  };
  const out = outside === false ? null : {intensity: 0.8, iris: false, ...(outside === true ? {} : outside)};
  const theta = clamp01(bl.angle) * (Math.PI / 2) * 0.97;
  const dn = new THREE.Vector3(...wl.dir).normalize();
  const {centres} = cellSlatCentres(bl.traverse);
  const halfProj = 0.5 * W.slatW * Math.abs(Math.cos(theta) - Math.sin(theta) * (dn.x / Math.min(-0.05, dn.z))) + 0.0015;
  const P = practicals;
  const head = cellBedHead(bedTilt);
  const page = cellPrinterPage(printerFeed);
  const errBlink = printerError > 0 ? (Math.floor(time * 3.2) % 2 === 0 ? 1 : 0.12) : 1;
  const slitRed = printerGlow * (1 - printerError * (1 - errBlink)) * (1 + printerError * 0.25);
  const doorAng = -clamp01(doorOpen) * 1.75;
  const irisOn = doorIris !== false && has('door');

  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.updateWorldMatrix(true, false);
    setCellUniforms(U, {
      matrixWorld: g.matrixWorld, dir: wl.dir, color: wl.color, intensity: wl.intensity * 12, scan: wl.scan,
      scanColor: wl.scanColor, scanIntensity: wl.scanIntensity * 12, scanWidth: wl.scanWidth,
      rect: [W.x0, W.x1, W.sill, W.top], slatPitch: (W.x1 - W.x0) / W.slats, slatHalfProjected: has('blinds') ? halfProj : -1,
      slats: W.slats, traverse: clamp01(bl.traverse), winZ: W.zInner, slatZ: W.slatZ, softness: wl.softness,
      outside: out ? out.intensity * 2.0 : 0, outsideColor: S.bone,
    });
    // ambient self-light (emissive multiplier on every room material)
    for (const [k, m] of Object.entries(M)) {
      const mm = m as THREE.MeshStandardMaterial;
      if (k.startsWith('stencil')) continue;
      mm.emissive.set(mm.color).multiplyScalar(ambient * (k === 'facade' || k === 'deck' ? 0.6 : 1));
    }
    // slats
    const o = new THREE.Object3D();
    const hgt = W.top - W.sill + 0.06;
    centres.forEach((x, i) => {
      o.position.set(x, (W.sill + W.top) / 2 - 0.01, W.slatZ);
      o.rotation.set(0, theta + (i % 2 ? 0.01 : -0.01), 0);
      o.scale.set(W.slatW, hgt, 0.0035);
      o.updateMatrix();
      slatMesh.setMatrixAt(i, o.matrix);
    });
    slatMesh.instanceMatrix.needsUpdate = true;
  });

  const deckPt = (zl: number) =>
    new THREE.Vector3(0, CELL_BED.top + -0.2 * Math.cos(head.rotationX) - zl * Math.sin(head.rotationX), CELL_BED.hingeZ + -0.2 * Math.sin(head.rotationX) + zl * Math.cos(head.rotationX));
  const ramTop = deckPt(-0.5);
  const ramBase = new THREE.Vector3(0, CELL_BED.plinthTop, CELL_BED.hingeZ - 0.06);
  const stencilDoor = stencilTex(DOOR_TEXT, {font: 'mono'});
  const stencilWall = stencilTex(WALL_TEXT, WALL_FONT);

  const redStrip = bedActive > 0.005 ? flatMat(S.authRed, 0.4 + 1.3 * clamp01(bedActive)) : null;
  const ventK = clamp01(vent) * P;

  return (
    <group ref={ref} {...group}>
      {/* ------------------------------------------------ shell */}
      <mesh geometry={G.floor} material={M.floor} />
      {wallOn('front') ? <mesh geometry={G.front} material={[M.wall, M.facade]} /> : null}
      {wallOn('back') ? <mesh geometry={G.back} material={M.wall} /> : null}
      {wallOn('left') ? <mesh geometry={G.left} material={M.wall} /> : null}
      {wallOn('right') ? <mesh geometry={G.right} material={M.wall} /> : null}
      {wallOn('ceiling') ? (
        <>
          <mesh geometry={G.ceiling} material={M.ceiling} />
          {has('vent') ? <mesh geometry={G.ventDuct} material={flatMat(S.void)} /> : null}
        </>
      ) : null}
      {/* stencil on the back wall, high (paint, receives the cookie) */}
      {wallOn('back') ? (
        <mesh geometry={PLANE} material={M.stencilWall} position={[1.05, 2.32, CELL.zMin + 0.004]} scale={[0.13 * stencilWall.aspect, 0.13, 1]} />
      ) : null}

      {/* ------------------------------------------------ window: blinds + headrail + outside */}
      {has('blinds') && wallOn('front') ? (
        <>
          <primitive object={slatMesh} />
          <mesh geometry={SLAT_GEO} material={M.bed} position={[0, W.top + 0.03, W.slatZ]} scale={[W.x1 - W.x0 + 0.1, 0.05, 0.07]} />
        </>
      ) : null}
      {out && has('outside') ? (
        <mesh geometry={PLANE} position={[0, 12, 60]} rotation={[0, Math.PI, 0]} scale={[112, 44, 1]} renderOrder={-20}>
          <meshBasicMaterial map={cityTex(out.iris)} color={hdr('#ffffff', out.intensity)} fog={false} toneMapped depthWrite={false} />
        </mesh>
      ) : null}
      {facade && has('facade') ? (
        <>
          <mesh geometry={G.facade} material={M.facade} />
          <mesh geometry={G.deck} material={M.deck} />
          <primitive object={panes} />
          <mesh geometry={PLANE} material={M.stencilOut} position={[W.x1 + 0.2 + 0.06 * stencilWall.aspect, 2.2, CELL.zMax + T + 0.004]} scale={[0.12 * stencilWall.aspect, 0.12, 1]} />
        </>
      ) : null}

      {/* ------------------------------------------------ bed */}
      {has('bed') ? (
        <group>
          <mesh geometry={G.bedBase} material={M.bed} />
          <mesh geometry={AXLE} material={M.printer} position={[0, CELL_BED.top - 0.2, CELL_BED.hingeZ]} />
          <group position={head.pivot} rotation={[head.rotationX, 0, 0]}>
            <mesh geometry={G.bedHead} material={M.bed} />
            {pillow && has('pillow') ? (
              <mesh geometry={pillowGeo()} material={M.pillow} position={CELL_PILLOW_LOCAL} />
            ) : null}
            {pillowSlot ? <group position={CELL_PILLOW_LOCAL}>{pillowSlot}</group> : null}
          </group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * (CELL_BED.headWidth / 2 - 0.09), 0, 0]}>
              <Ram a={ramBase} b={ramTop} mat={M.printer} rod={M.bed} />
            </group>
          ))}
          {blanket && has('blanket') ? <mesh geometry={G.blanket} material={M.blanket} /> : null}
          {redStrip ? (
            <>
              <mesh geometry={SLAT_GEO} material={redStrip} position={[-CELL_BED.width / 2 + 0.079, 0.24, (CELL_BED.zHead + CELL_BED.zFoot) / 2]} scale={[0.004, 0.012, CELL_BED.zFoot - CELL_BED.zHead - 0.3]} />
              <mesh geometry={SLAT_GEO} material={redStrip} position={[CELL_BED.width / 2 - 0.079, 0.24, (CELL_BED.zHead + CELL_BED.zFoot) / 2]} scale={[0.004, 0.012, CELL_BED.zFoot - CELL_BED.zHead - 0.3]} />
              <mesh geometry={SLAT_GEO} material={redStrip} position={[0, 0.24, CELL_BED.zFoot - 0.099]} scale={[CELL_BED.width - 0.18, 0.012, 0.004]} />
            </>
          ) : null}
        </group>
      ) : null}

      {/* ------------------------------------------------ printer slab + page */}
      {has('printer') ? (
        <group>
          <mesh geometry={G.printer} material={M.printer} />
          <mesh geometry={PLANE} material={flatMat(S.authRed, 1.5 * slitRed)} position={[CELL_PRINTER.frontX + 0.05, CELL_PRINTER.slitY, CELL_PRINTER.z]} rotation={[0, -Math.PI / 2, 0]} scale={[CELL_PRINTER.slitLen, 0.024, 1]} />
          <mesh geometry={PLANE} position={[CELL_PRINTER.frontX - 0.004, CELL_PRINTER.slitY, CELL_PRINTER.z]} rotation={[0, -Math.PI / 2, 0]} scale={[CELL_PRINTER.slitLen * 1.6, 0.16, 1]}>
            <meshBasicMaterial map={glowTex()} color={hdr(S.authRed, 0.55 * slitRed)} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped />
          </mesh>
          {/* status dot */}
          <mesh geometry={PLANE} material={flatMat(S.authRed, printerError > 0 ? 1.7 * errBlink : 0.5)} position={[CELL_PRINTER.frontX - 0.002, CELL_PRINTER.h - 0.08, CELL_PRINTER.z + CELL_PRINTER.len / 2 - 0.07]} rotation={[0, -Math.PI / 2, 0]} scale={[0.018, 0.018, 1]} />
          {has('page') && page.out > 0.002 ? (
            <group position={page.slit} rotation={[0, 0, page.droop]}>
              <mesh geometry={PLANE} position={[-page.out / 2, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[page.out, CELL_PAGE.w, 1]}>
                <meshBasicMaterial color={hdr(S.bone, 0.62)} side={THREE.DoubleSide} />
              </mesh>
            </group>
          ) : null}
          {pageSlot ? (
            <group position={page.position} rotation={page.rotation}>
              {pageSlot}
            </group>
          ) : null}
        </group>
      ) : null}

      {/* ------------------------------------------------ door + iris lock + leak + corridor glow */}
      {has('door') ? (
        <group>
          <group position={[CELL.xMin, 0, CELL_DOOR.hingeZ]} rotation={[0, doorAng, 0]}>
            <mesh geometry={SLAT_GEO} material={M.door} position={[-0.03, CELL_DOOR.height / 2, -CELL_DOOR.width / 2]} scale={[0.06, CELL_DOOR.height - 0.01, CELL_DOOR.width - 0.01]} />
            <mesh geometry={PLANE} material={M.stencilDoor} position={[0.003, 0.62, -CELL_DOOR.width / 2]} rotation={[0, Math.PI / 2, 0]} scale={[Math.min(0.8, 0.05 * stencilDoor.aspect), 0.05, 1]} />
            {irisOn ? (
              <Iris radius={CELL_DOOR.irisRadius} time={time} {...(doorIris || {})} position={[0.006, CELL_DOOR.irisY, CELL_DOOR.z - CELL_DOOR.hingeZ]} rotation={[0, Math.PI / 2, 0]} />
            ) : null}
          </group>
          {/* corridor beyond: a lit haze card + the leak line under the door */}
          {doorOpen > 0.005 ? (
            <mesh geometry={PLANE} position={[CELL.xMin - T - 0.5, 1.1, CELL_DOOR.z - 0.1]} rotation={[0, Math.PI / 2, 0]} scale={[1.5, 2.6, 1]} renderOrder={-5}>
              <meshBasicMaterial map={columnGlowTex()} color={hdr(S.bone, 0.9)} transparent depthWrite={false} fog={false} />
            </mesh>
          ) : null}
          <mesh geometry={PLANE} position={[CELL.xMin + 0.002, 0.007, CELL_DOOR.z]} rotation={[0, Math.PI / 2, 0]} scale={[CELL_DOOR.width - 0.04, 0.012, 1]}>
            <meshBasicMaterial color={hdr(S.bone, 1.4 * doorLeak)} />
          </mesh>
          <mesh geometry={PLANE} position={[CELL.xMin + 0.25, 0.003, CELL_DOOR.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.5, CELL_DOOR.width * 1.15, 1]}>
            <meshBasicMaterial map={glowTex()} color={hdr(S.bone, 0.22 * doorLeak)} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ) : null}

      {/* ------------------------------------------------ hammer slit + pegs */}
      {has('slit') ? (
        <mesh geometry={PLANE} position={[CELL.xMin - T - 0.12, (CELL_SLIT.bottom + CELL_SLIT.top) / 2, CELL_SLIT.z]} rotation={[0, Math.PI / 2, 0]} scale={[0.3, 2.3, 1]} renderOrder={-5}>
          <meshBasicMaterial map={columnGlowTex()} color={hdr(S.bone, 0.95 * slit)} transparent depthWrite={false} fog={false} />
        </mesh>
      ) : null}
      {has('pegs') ? (
        <>
          <mesh geometry={PEG_GEO} material={M.printer} position={[CELL.xMin + CELL_PEGS.out / 2, CELL_PEGS.y - CELL_PEGS.r, CELL_PEGS.z - CELL_PEGS.spacing / 2]} />
          <mesh geometry={PEG_GEO} material={M.printer} position={[CELL.xMin + CELL_PEGS.out / 2, CELL_PEGS.y - CELL_PEGS.r, CELL_PEGS.z + CELL_PEGS.spacing / 2]} />
        </>
      ) : null}

      {/* ------------------------------------------------ vent glow (deep red, faint) */}
      {has('vent') && wallOn('ceiling') ? (
        <mesh geometry={PLANE} position={[CELL_VENT.x, CELL.h + T + 0.45, CELL_VENT.z]} rotation={[Math.PI / 2, 0, 0]} scale={[CELL_VENT.size * 1.3, CELL_VENT.size * 1.3, 1]}>
          <meshBasicMaterial map={glowTex()} color={hdr(S.authRed, 1.3 * clamp01(vent))} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ) : null}

      {/* ------------------------------------------------ practicals (constant count) */}
      {has('lights') ? (
        <group>
          <pointLight position={[0, 1.9, 1.7]} color={S.bone} intensity={0.9 * P * wl.intensity} distance={6} decay={2} />
          <pointLight position={[CELL_VENT.x, CELL.h - 0.25, CELL_VENT.z]} color={S.authRed} intensity={0.55 * ventK} distance={2.6} decay={2} />
          <pointLight position={[CELL_PRINTER.frontX - 0.15, CELL_PRINTER.slitY + 0.02, CELL_PRINTER.z]} color={S.authRed} intensity={0.3 * P * slitRed} distance={1.6} decay={2} />
          <pointLight position={[CELL.xMin + 0.25, CELL_DOOR.irisY, CELL_DOOR.z]} color={S.authRed} intensity={irisOn ? 0.12 * P : 0} distance={1.4} decay={2} />
          <pointLight position={[CELL.xMin + 0.12, (CELL_SLIT.bottom + CELL_SLIT.top) / 2, CELL_SLIT.z]} color={S.bone} intensity={0.35 * P * slit} distance={2.4} decay={2} />
        </group>
      ) : null}
      {children}
    </group>
  );
};
