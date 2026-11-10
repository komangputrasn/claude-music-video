// V1Bedroom local pieces: the TENURE bed clock ("03:15"), WindowSpill (the window's stripes carried down the printer
// wall to the floor in C/D), PrinterDot (calm status dot), Unoccluded (draws its subtree over nearer opaque geometry:
// the lyric on the back wall seen through the blinds).
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {S, SFONTS, GREYS, hdr} from '../../lib/palette';
import {
  CELL, CELL_PRINTER, CELL_WINDOW, FLOOR_TILE, WALL_TILE, cellMaterial, clamp01, concreteTex, floorTex, makeCellUniforms,
  setCellUniforms, wboxMinMax, type CellLightState,
} from '../../lib/sets';

type V3 = [number, number, number];

const clockTexCache = new Map<string, THREE.CanvasTexture>();
/** Red mono readout texture (white glyphs + baked halo; tinted by the material). <WorldLyric> drops ':' so we draw it. */
const readoutTex = (text: string) => {
  const hit = clockTexCache.get(text);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d')!;
  g.font = `400 132px ${SFONTS.mono}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.filter = 'blur(10px)';
  g.globalAlpha = 0.45;
  g.fillText(text, 256, 100);
  g.filter = 'none';
  g.globalAlpha = 1;
  g.fillText(text, 256, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  clockTexCache.set(text, t);
  return t;
};

/** The bed's TENURE clock: a black wall unit with a red mono "03:15" readout. `glow` scales the red (≤ ~1.6). */
export const BedClock: React.FC<{position: V3; glow?: number; scale?: number; rotationY?: number}> = ({position, glow = 1, scale = 1, rotationY = 0}) => {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({map: readoutTex('03:15'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.color.copy(hdr(S.authRed, Math.min(1.6, 1.1 * glow)));
  });
  return (
    <group position={position} scale={scale} rotation-y={rotationY}>
      <mesh position={[0, 0, 0.008]}>
        <boxGeometry args={[0.42, 0.16, 0.016]} />
        <meshBasicMaterial color={GREYS.g1} />
      </mesh>
      <mesh position={[0, 0, 0.0175]} scale={[0.4, 0.15, 1]} material={mat}>
        <planeGeometry />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ WindowSpill
/**
 * The window light carried on BELOW the sill line, down a wall to the floor (and, optionally, across the floor).
 * Through the real 1.45 m window the stripes stop 0.45–0.8 m above the floor, so his legs (and the printer) stood black
 * on black. This draws a skin 1.5 mm in front of the lower part of one wall (`wall`: 'right' = the printer wall in C/D,
 * 'back' = behind the bed in B; from the floor up to `top`) and, with `floor`, 1.5 mm over the floor. The skins use
 * the room's own materials (same colour, texture, world UVs, ambient) and the room's own cookie maths (cellMaterial +
 * setCellUniforms), only with the window's lower edge moved down to `sill` (y on the window plane). So the stripes run
 * on to the floor exactly aligned, with the same scan band, colour and breathing; where the real window already lit
 * the wall (the skin's top edge sits inside the real band) both render alike, so there is no seam.
 * Pass the SAME `blinds`, `windowLight` and `ambient` as the CellRoom. Render it as a child of the CellRoom (room space).
 * Keep wall text (lyrics) at least ~3 mm off the wall where it overlaps the skin.
 */
type WindowLightOpts = {
  intensity?: number; color?: string; dir?: V3; scan?: number | null; scanColor?: string; scanIntensity?: number; scanWidth?: number;
  softness?: number;
};
const SKIN = 0.0015;
const spillGeoCache = new Map<string, THREE.BufferGeometry>();
/** Skin boxes whose visible face has the same world UVs as the room's wall/floor face (wbox: the U offset of a side
 *  face depends on the box's centre, so the wall skins keep the room walls' centre line: z = 0 / x = 0). */
const getSpillGeo = (part: 'right' | 'back' | 'floor', top: number) => {
  const key = `${part}|${top}`;
  const hit = spillGeoCache.get(key);
  if (hit) return hit;
  const T = CELL.wall;
  const g =
    part === 'right'
      ? wboxMinMax([CELL.xMax - SKIN, -0.2, CELL.zMin], [CELL.xMax + T / 2, top, CELL.zMax], WALL_TILE) // its -X face
      : part === 'back'
        ? wboxMinMax([CELL.xMin - T, -0.2, CELL.zMin - T / 2], [CELL.xMax + T, top, CELL.zMin + SKIN], WALL_TILE) // its +Z face
        : wboxMinMax([CELL.xMin, -0.02, CELL.zMin], [CELL.xMax, SKIN, CELL.zMax], FLOOR_TILE); // its top face
  spillGeoCache.set(key, g);
  return g;
};

export const WindowSpill: React.FC<{
  blinds?: {angle?: number; traverse?: number};
  windowLight?: WindowLightOpts;
  ambient?: number;
  wall?: 'right' | 'back';
  top?: number;
  sill?: number;
  floor?: boolean;
}> = ({blinds, windowLight, ambient = 0.06, wall = 'right', top = 1.3, sill = -0.4, floor = true}) => {
  const ref = useRef<THREE.Group>(null);
  // one uniform set per skin: each evaluates the cookie on the real surface plane, SKIN behind the skin (with oblique
  // light a 1.5 mm offset would shift the stripes ~3 mm along the wall and step them at the skin's top edge)
  const U = useMemo(() => ({wall: makeCellUniforms(), floor: makeCellUniforms()}), []);
  const M = useMemo(() => {
    const mk = (color: string, map: THREE.Texture, rough: number, u: ReturnType<typeof makeCellUniforms>) =>
      cellMaterial({color, map, roughness: rough, metalness: 0, emissive: new THREE.Color(color), emissiveMap: map}, u, 'room');
    return {
      wall: mk('#9a9ea4', concreteTex(), 0.93, U.wall), // = CellRoom's wall material
      floor: mk('#8a8e94', floorTex(), 0.78, U.floor), // = its floor
    };
  }, [U]);
  useLayoutEffect(() => () => Object.values(M).forEach((m) => m.dispose()), [M]);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.updateWorldMatrix(true, false);
    // the CellRoom's own derivation (defaults included); only the window rect's lower edge differs
    const bl = {angle: 0.62, traverse: 0, ...(blinds ?? {})};
    const wl = {
      intensity: 1, color: S.bone, dir: [0, -0.06, -1] as V3, scan: null as number | null, scanColor: S.authRed, scanIntensity: 1.6,
      scanWidth: 0.16, softness: 0.006, ...(windowLight ?? {}),
    };
    const W = CELL_WINDOW;
    const theta = clamp01(bl.angle) * (Math.PI / 2) * 0.97;
    const dn = new THREE.Vector3(...wl.dir).normalize();
    const halfProj = 0.5 * W.slatW * Math.abs(Math.cos(theta) - Math.sin(theta) * (dn.x / Math.min(-0.05, dn.z))) + 0.0015;
    const state: Omit<CellLightState, 'matrixWorld'> = {
      dir: wl.dir, color: wl.color, intensity: wl.intensity * 12, scan: wl.scan,
      scanColor: wl.scanColor, scanIntensity: wl.scanIntensity * 12, scanWidth: wl.scanWidth,
      rect: [W.x0, W.x1, sill, W.top], slatPitch: (W.x1 - W.x0) / W.slats, slatHalfProjected: halfProj, slats: W.slats,
      traverse: clamp01(bl.traverse), winZ: W.zInner, slatZ: W.slatZ, softness: wl.softness, outside: 0, outsideColor: S.bone,
    };
    // cell space = room space moved by -v, i.e. the skin's points are evaluated SKIN further out, on the real surface
    const shifted = (v: V3) => g.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(v[0], v[1], v[2]));
    setCellUniforms(U.wall, {...state, matrixWorld: shifted(wall === 'right' ? [-SKIN, 0, 0] : [0, 0, SKIN])});
    setCellUniforms(U.floor, {...state, matrixWorld: shifted([0, SKIN, 0])});
    M.wall.emissive.set(M.wall.color).multiplyScalar(ambient);
    M.floor.emissive.set(M.floor.color).multiplyScalar(ambient);
  });
  return (
    <group ref={ref}>
      <mesh geometry={getSpillGeo(wall, top)} material={M.wall} />
      {floor ? <mesh geometry={getSpillGeo('floor', top)} material={M.floor} /> : null}
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ PrinterDot
/**
 * The printer's red status dot, drawn 2 mm in front of CellRoom's own (which knows only idle 0.5 and a hard 3.2 Hz error
 * blink). `level` = HDR multiplier of authRed (CellRoom: idle 0.5, error 1.7); 0 = dead (black, invisible on the dark
 * slab). Use it with printerError={0} on the CellRoom and drive the slit with printerGlow.
 */
export const PrinterDot: React.FC<{level: number}> = ({level}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#000000'}), []);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.color.set(S.authRed).multiplyScalar(Math.max(0, level));
  });
  return (
    <mesh material={mat} position={[CELL_PRINTER.frontX - 0.004, CELL_PRINTER.h - 0.08, CELL_PRINTER.z + CELL_PRINTER.len / 2 - 0.07]}
      rotation={[0, -Math.PI / 2, 0]} scale={[0.021, 0.021, 1]}>
      <planeGeometry />
    </mesh>
  );
};

// ------------------------------------------------------------------------------------------------ Unoccluded
/**
 * Draws its subtree without depth testing (and late), so nearer opaque geometry does not cut it. Used for the shot-A
 * lyric: the words stay ON the back wall (its depth, scale and parallax during the dolly) but the blind slats in front
 * no longer blank whole letter stems. Only use it where the subtree is seen inside an opening (here: the window), never
 * where it would draw over a wall that should hide it.
 */
export const Unoccluded: React.FC<{children: React.ReactNode; order?: number}> = ({children, order = 20}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.renderOrder = order;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mm) => {
        if (mm && mm.depthTest) {
          mm.depthTest = false;
          mm.needsUpdate = true;
        }
      });
    });
  });
  return <group ref={ref}>{children}</group>;
};
